import { PrismaClient } from '@prisma/client';
import { calcularHorasEsperadas, armarSaldo, parsearPoliticaPermisos, CLAVE_PERMISOS_REMUNERADOS } from '../src/utils/saldoTiempo';
import { calcularHorasTrabajadas, calcularLiquidacion, descontarAlmuerzo, calcularValorHora } from '../src/utils/horasColombiana';
import { jornadaVigente, tiposVigentes, horasMesDeJornada } from '../src/utils/vigencias';
import { construirExtraConfig, franjaDelDia, DIAS_SEMANA } from '../src/utils/tardanzas';
import { combinarDiasEsperados } from '../src/utils/diasEsperados';
import { rangoReporte } from '../src/utils/fechas';
import { toZonedTime } from 'date-fns-tz';
import { getISOWeek, getISOWeekYear } from 'date-fns';

// Comprobación de escritorio del saldo, replicando lo que hace GET /liquidacion.
// No es un test automatizado: imprime los números para cotejarlos a mano contra
// el escenario sembrado por seed-julio-saldo.ts.

const prisma = new PrismaClient();
const TZ = 'America/Bogota';
const fmtMin = (m: number) => `${Math.trunc(Math.abs(m) / 60)}h${String(Math.round(Math.abs(m) % 60)).padStart(2, '0')}`;
const cop = (n: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);

async function main() {
  const desdeStr = '2026-07-01', hastaStr = '2026-07-31';
  const { desdeF, finExclusivo } = rangoReporte(desdeStr, hastaStr);

  const colaborador = await prisma.colaborador.findFirst({
    where: { nombre: 'Santiago', apellido: 'Soto García' },
    include: { horario: { include: { franjas: true } } },
  });
  if (!colaborador) throw new Error('colaborador no encontrado');
  const empresaId = colaborador.empresaId;

  const [registros, festivos, tiposHoraTodos, jornadas, cfgModo, cfgPermisos, permisos, diasMaterializados] = await Promise.all([
    prisma.registro.findMany({ where: { colaboradorId: colaborador.id, fecha: { gte: desdeF, lt: finExclusivo }, salida: { not: null } }, orderBy: { fecha: 'asc' } }),
    prisma.diaFestivo.findMany({ where: { OR: [{ empresaId: null }, { empresaId }] } }),
    prisma.tipoHora.findMany(),
    prisma.jornadaVigencia.findMany(),
    prisma.configuracion.findUnique({ where: { empresaId_clave: { empresaId, clave: 'HORAS_EXTRA_MODO' } } }),
    prisma.configuracion.findUnique({ where: { empresaId_clave: { empresaId, clave: CLAVE_PERMISOS_REMUNERADOS } } }),
    prisma.permiso.findMany({ where: { colaboradorId: colaborador.id, aprobado: true, fechaInicio: { lt: finExclusivo }, fechaFin: { gte: desdeF } }, select: { fechaInicio: true, fechaFin: true, tipo: true } }),
    prisma.diaEsperado.findMany({
      where: { colaboradorId: colaborador.id, fecha: { gte: desdeF, lt: finExclusivo } },
      select: { fecha: true, programado: true, horaEntrada: true, horaSalida: true, toleranciaMin: true, almuerzoMin: true, minutosEsperados: true },
      orderBy: { fecha: 'asc' },
    }),
  ]);

  const horario = colaborador.horario as any;
  const festivosDates = festivos.map(f => new Date(f.fecha));
  const extraConfig = construirExtraConfig(cfgModo?.valor === 'HORARIO' ? 'HORARIO' : 'SEMANAL', horario);
  const horasMes = horasMesDeJornada(jornadaVigente(new Date(hastaStr), jornadas));
  const valorHora = calcularValorHora(colaborador.salarioMensual, horasMes);

  console.log(`\n=== ${colaborador.nombre} ${colaborador.apellido} — julio 2026 ===`);
  console.log(`Salario ${cop(colaborador.salarioMensual)} · horasMes ${horasMes} · valor hora ${cop(valorHora)}`);
  console.log(`Permisos que tocan el rango: ${permisos.map(p => `${p.tipo} ${p.fechaInicio.toISOString().slice(0, 10)}→${p.fechaFin.toISOString().slice(0, 10)}`).join(' | ')}`);

  // --- lado TRABAJADO (réplica de liquidarRegistros) ---
  const porSemana = new Map<string, typeof registros>();
  for (const r of registros) {
    const z = toZonedTime(r.fecha, TZ);
    const k = `${getISOWeekYear(z)}-W${getISOWeek(z)}`;
    if (!porSemana.has(k)) porSemana.set(k, []);
    porSemana.get(k)!.push(r);
  }
  const acumulado: Record<string, any> = {};
  const dias = new Set<string>();
  for (const [, regs] of porSemana) {
    const jornadaSemanal = jornadaVigente(regs[0].fecha, jornadas);
    let ordSemana = 0;
    for (const reg of regs) {
      if (!reg.entrada || !reg.salida) continue;
      const { resultado, minutosOrdinariosTrabajados } = calcularHorasTrabajadas(
        reg.entrada, reg.salida, festivosDates, tiposVigentes(reg.fecha, tiposHoraTodos) as any, jornadaSemanal, ordSemana, extraConfig,
      );
      let ord = minutosOrdinariosTrabajados;
      const z = toZonedTime(reg.entrada, TZ);
      const clave = `${z.getFullYear()}-${z.getMonth()}-${z.getDate()}`;
      const fr = franjaDelDia(horario, DIAS_SEMANA[z.getDay()]);
      const alm = fr && (fr as any).tieneAlmuerzo ? (horario.almuerzoMin ?? 0) : 0;
      if (alm > 0 && !dias.has(clave)) {
        const { descontado } = descontarAlmuerzo(resultado, alm);
        if (descontado > 0) { dias.add(clave); ord = Math.max(0, ord - descontado); }
      }
      ordSemana += ord;
      for (const p of resultado) {
        if (!acumulado[p.codigo]) acumulado[p.codigo] = { ...p };
        else acumulado[p.codigo].minutos += p.minutos;
      }
    }
  }
  const liquidacion = calcularLiquidacion(colaborador.salarioMensual, horasMes, Object.values(acumulado));
  const minutosOrdinarios = liquidacion.filter(l => !l.esExtra).reduce((s, l) => s + l.horas * 60, 0);

  console.log('\nHoras liquidadas por tipo:');
  liquidacion.forEach(l => console.log(`   ${l.codigo}  ${l.horas}h  ${l.esExtra ? '(EXTRA)' : '(ordinaria)'}  ${cop(l.subtotal)}`));

  // --- lado ESPERADO, con y sin la política por defecto ---
  // Los días llegan MATERIALIZADOS de la tabla; los que aún no lo estén caen al
  // horario vigente, igual que en GET /liquidacion. La cuenta de abajo dice de
  // dónde salió cada día: si la materialización no corrió, hay que saberlo.
  const diasEsperados = combinarDiasEsperados(desdeF, finExclusivo, diasMaterializados, horario);
  console.log(`\nDías del rango: ${diasEsperados.length} · materializados en tabla: ${diasMaterializados.length} · resueltos con el horario vigente: ${diasEsperados.length - diasMaterializados.length}`);

  for (const [etiqueta, valorCfg] of [['PERSONAL remunerado (default)', null], ['PERSONAL NO remunerado', 'CALAMIDAD,MEDICO,OTRO']] as const) {
    const politica = parsearPoliticaPermisos(valorCfg ?? cfgPermisos?.valor);
    const esperadas = calcularHorasEsperadas(desdeF, finExclusivo, diasEsperados, festivosDates, permisos as any, politica, (f) => jornadaVigente(f, jornadas));
    const saldo = armarSaldo(esperadas, minutosOrdinarios, valorHora, false);
    console.log(`\n--- ${etiqueta} ---`);
    console.log(`   esperadas (ya sin permisos pagados): ${fmtMin(saldo.minutosEsperados)}`);
    console.log(`   excusadas por permiso remunerado:    ${fmtMin(saldo.minutosPermisoRemunerado)}`);
    console.log(`   permiso NO remunerado:               ${fmtMin(saldo.minutosPermisoNoRemunerado)}`);
    console.log(`   trabajadas (ordinarias):             ${fmtMin(saldo.minutosTrabajados)}`);
    console.log(`   SALDO: ${saldo.minutosSaldo > 0 ? 'debe ' : 'a favor '}${fmtMin(saldo.minutosSaldo)}  →  descuento ${cop(saldo.montoSaldo)}`);
  }
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
