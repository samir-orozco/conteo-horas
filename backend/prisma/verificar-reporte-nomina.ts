import { prisma } from '../src/prisma';
import { jornadaVigente, horasMesDeJornada } from '../src/utils/vigencias';
import { construirExtraConfig, type HorarioConFranjas } from '../src/utils/tardanzas';
import { rangoReporte } from '../src/utils/fechas';
import { calcularValorHora } from '../src/utils/horasColombiana';
import { CLAVE_PERMISOS_REMUNERADOS, parsearPoliticaPermisos } from '../src/utils/saldoTiempo';
import { combinarDiasEsperados } from '../src/utils/diasEsperados';
import { liquidarRegistros } from '../src/utils/liquidarRegistros';
import { novedadesDelPeriodo } from '../src/utils/novedadesDelPeriodo';

// Verificación de la costura del reporte de nómina del período (15 de septiembre de 2026).
//
// Las reglas puras ya tienen pruebas (novedadesDelPeriodo, liquidarRegistros). Lo que aquí se
// comprueba, contra la base real y SIN escribir nada, es lo que las pruebas no cubren: que el
// recorrido masivo de la ruta /reportes/nomina dé exactamente lo mismo que el cálculo de UNA
// persona, que es el de /reportes/liquidacion. Si el resumen y el detalle de la misma persona no
// coinciden, el reporte no sirve, por bonito que se vea.
//
//   npx tsx prisma/verificar-reporte-nomina.ts [desde] [hasta] [empresaId]
//
// Sin argumentos toma el mes en curso y la primera empresa con colaboradores activos.

const [, , desdeArg, hastaArg, empresaArg] = process.argv;
const hoy = new Date();
const mes = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;
const desde = desdeArg ?? `${mes}-01`;
const hasta = hastaArg ?? `${mes}-28`;

const pesos = (n: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);
const horas = (min: number) => `${Math.floor(min / 60)}h ${String(min % 60).padStart(2, '0')}m`;

async function main() {
  const empresaId = empresaArg ?? (await prisma.colaborador.findFirst({
    where: { activo: true }, select: { empresaId: true },
  }))?.empresaId;
  if (!empresaId) throw new Error('No hay colaboradores activos en esta base');

  const empresa = await prisma.empresa.findUnique({ where: { id: empresaId }, select: { nombre: true } });
  const { desdeF, finExclusivo } = rangoReporte(desde, hasta);
  console.log(`Empresa: ${empresa?.nombre} (${empresaId})`);
  console.log(`Período: ${desde} a ${hasta}\n`);

  // ===== El mismo recorrido de la ruta /reportes/nomina =====
  const [colaboradores, registrosTodos, festivos, tiposHoraTodos, jornadas, cfgModo, cfgPermisos, permisosTodos, diasTodosEsp] = await Promise.all([
    prisma.colaborador.findMany({
      where: { empresaId, activo: true },
      select: {
        id: true, nombre: true, apellido: true, cedula: true, cargo: true,
        salarioMensual: true, horario: { include: { franjas: true } },
      },
      orderBy: { nombre: 'asc' },
    }),
    prisma.registro.findMany({
      where: { colaborador: { empresaId }, fecha: { gte: desdeF, lt: finExclusivo } },
      select: {
        id: true, colaboradorId: true, fecha: true, entrada: true, salida: true,
        salidaAlmuerzo: true, salidaDescanso: true, descansoVentana: true,
      },
      orderBy: { fecha: 'asc' },
    }),
    prisma.diaFestivo.findMany({ where: { OR: [{ empresaId: null }, { empresaId }] } }),
    prisma.tipoHora.findMany(),
    prisma.jornadaVigencia.findMany(),
    prisma.configuracion.findUnique({ where: { empresaId_clave: { empresaId, clave: 'HORAS_EXTRA_MODO' } } }),
    prisma.configuracion.findUnique({ where: { empresaId_clave: { empresaId, clave: CLAVE_PERMISOS_REMUNERADOS } } }),
    prisma.permiso.findMany({
      where: { colaborador: { empresaId }, aprobado: true, fechaInicio: { lt: finExclusivo }, fechaFin: { gte: desdeF } },
      select: { colaboradorId: true, fechaInicio: true, fechaFin: true, horaInicio: true, horaFin: true, tipo: true },
    }),
    prisma.diaEsperado.findMany({
      where: { colaborador: { empresaId }, fecha: { gte: desdeF, lt: finExclusivo } },
      select: {
        colaboradorId: true, fecha: true, programado: true, horaEntrada: true,
        horaSalida: true, toleranciaMin: true, almuerzoMin: true, minutosEsperados: true,
        toleranciaSalidaMin: true, ajustaEntrada: true, almuerzoInicio: true, almuerzoFin: true,
        descansos: true,
      },
      orderBy: { fecha: 'asc' },
    }),
  ]);

  const modoExtra = cfgModo?.valor === 'HORARIO' ? 'HORARIO' : 'SEMANAL';
  const festivosDates = festivos.map(f => new Date(f.fecha));
  const horasMes = horasMesDeJornada(jornadaVigente(new Date(hasta), jornadas));
  const politica = parsearPoliticaPermisos(cfgPermisos?.valor);
  const porCol = <T extends { colaboradorId: string }>(filas: T[], id: string) => filas.filter(f => f.colaboradorId === id);

  const filas = colaboradores.map(col => {
    const horario = col.horario as HorarioConFranjas | null;
    const dias = combinarDiasEsperados(desdeF, finExclusivo, porCol(diasTodosEsp, col.id), horario);
    const r = liquidarRegistros(
      porCol(registrosTodos, col.id) as any, horario, construirExtraConfig(modoExtra, horario, dias),
      festivosDates, tiposHoraTodos, jornadas, col.salarioMensual, horasMes, false, dias,
    );
    return {
      col, r,
      valorHora: calcularValorHora(col.salarioMensual, horasMes),
      novedades: novedadesDelPeriodo(porCol(permisosTodos, col.id), desdeF, finExclusivo, politica),
    };
  });

  console.log('=== Lo que mostraría el reporte ===');
  for (const f of filas) {
    const conceptos = f.r.liquidacion.filter((l: any) => l.horas > 0)
      .map((l: any) => `${l.codigo} ${l.horas.toFixed(2)}h`).join(' · ') || 'sin recargos ni extras';
    const nov = f.novedades.map(n => `${n.tipo} ${n.dias}d${n.parciales ? ` +${n.parciales} parcial(es)` : ''}`).join(' · ') || 'sin novedades';
    console.log(`${f.col.cedula ?? 'sin cédula'} · ${f.col.nombre} ${f.col.apellido} · base ${pesos(f.col.salarioMensual)} · hora ${pesos(f.valorHora)}`);
    console.log(`   ordinarias ${horas(f.r.minutosOrdinarios)} · ${conceptos}`);
    console.log(`   recargos ${pesos(f.r.totalRecargos)} · extras ${pesos(f.r.totalExtra)} · adicional ${pesos(f.r.totalAdicional)}`);
    console.log(`   novedades: ${nov}`);
  }

  // ===== La comprobación: el resumen contra el detalle de UNA persona =====
  // Se rehace el cálculo como lo hace /reportes/liquidacion, con las consultas de esa sola persona.
  const conMovimiento = filas.find(f => f.r.totalAdicional > 0) ?? filas[0];
  if (!conMovimiento) { console.log('\nNo hay colaboradores activos: no hay nada que comprobar.'); return; }

  const id = conMovimiento.col.id;
  const [registrosUno, diasUno] = await Promise.all([
    prisma.registro.findMany({
      where: { colaboradorId: id, fecha: { gte: desdeF, lt: finExclusivo } },
      select: { id: true, fecha: true, entrada: true, salida: true, salidaAlmuerzo: true, salidaDescanso: true, descansoVentana: true },
      orderBy: { fecha: 'asc' },
    }),
    prisma.diaEsperado.findMany({
      where: { colaboradorId: id, fecha: { gte: desdeF, lt: finExclusivo } },
      select: {
        fecha: true, programado: true, horaEntrada: true, horaSalida: true,
        toleranciaMin: true, almuerzoMin: true, minutosEsperados: true,
        toleranciaSalidaMin: true, ajustaEntrada: true, almuerzoInicio: true, almuerzoFin: true, descansos: true,
      },
      orderBy: { fecha: 'asc' },
    }),
  ]);
  const horarioUno = conMovimiento.col.horario as HorarioConFranjas | null;
  const diasComb = combinarDiasEsperados(desdeF, finExclusivo, diasUno, horarioUno);
  const uno = liquidarRegistros(
    registrosUno as any, horarioUno, construirExtraConfig(modoExtra, horarioUno, diasComb),
    festivosDates, tiposHoraTodos, jornadas, conMovimiento.col.salarioMensual, horasMes, true, diasComb,
  );

  console.log(`\n=== Comprobación con ${conMovimiento.col.nombre} ${conMovimiento.col.apellido} ===`);
  const comparaciones: [string, number, number][] = [
    ['total recargos', conMovimiento.r.totalRecargos, uno.totalRecargos],
    ['total extras', conMovimiento.r.totalExtra, uno.totalExtra],
    ['total adicional', conMovimiento.r.totalAdicional, uno.totalAdicional],
    ['minutos ordinarios', conMovimiento.r.minutosOrdinarios, uno.minutosOrdinarios],
    ['registros contados', conMovimiento.r.registrosCont, uno.registrosCont],
    ['líneas de liquidación', conMovimiento.r.liquidacion.length, uno.liquidacion.length],
  ];
  let todoIgual = true;
  for (const [que, masivo, detalle] of comparaciones) {
    const igual = Math.abs(masivo - detalle) < 0.01;
    if (!igual) todoIgual = false;
    console.log(`${igual ? 'IGUAL' : 'DISTINTO'} · ${que}: masivo ${masivo} · detalle ${detalle}`);
  }
  console.log(todoIgual
    ? '\nEl reporte masivo y el detalle de esa persona dan lo mismo.'
    : '\nOJO: el reporte masivo NO coincide con el detalle. No se despliega así.');
}

main()
  .catch(e => { console.error(e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
