// El clima de una empresa SIN el plan (14 de octubre de 2026, PENDIENTES nº 39, fase 4), contra la base LOCAL. Qué se
// decide lo prueban utils/climaSinPlan.test.ts y resumenSemanal.test.ts; esto comprueba la plomería (CLAUDE.md §8.6):
//   1. la pasada diaria avisa en la campana cuando alguien entra a «necesita atención», sin decir quién;
//   2. no repite si nadie entró después, ni antes de 7 días;
//   3. no avisa con la calificación del día apagada ni mientras la empresa tiene el clima (una prueba vigente);
//   4. el correo de los lunes trae la línea con cuántas personas, sin nombres;
//   5. y deja rastro en el log también cuando no manda nada (§8.3).
// Crea una empresa temporal de plan Profesional y BORRA todo lo que creó, también los resúmenes de la semana simulada.
//   npx ts-node prisma/probar-aviso-clima-sin-plan.ts   (ts-node y no tsx: con tsx no se puede interceptar el correo)
import { prisma } from '../src/prisma';
import * as correo from '../src/utils/correo';
import { capacidadesEmpresa } from '../src/utils/capacidades';
import { hoyEnBogota } from '../src/utils/fechas';
import { avisarClimaSinPlan, TIPO_AVISO_SIN_PLAN } from '../src/utils/avisoClimaSinPlan';
import { enviarResumenesSemanales, TIPO_RESUMEN_SEMANAL } from '../src/utils/envioResumenSemanal';

const DIA = 24 * 60 * 60 * 1000;
// La medianoche de Bogotá de k días desde hoy, que es como se guarda el día de una calificación.
const dia = (k: number) => { const [a, m, d] = hoyEnBogota().split('-').map(Number); return new Date(Date.UTC(a, m - 1, d + k, 5)); };
const clave = (k: number) => dia(k).toISOString().slice(0, 10);

async function main() {
  const inicio = new Date();
  const marca = Date.now();
  // Apellidos que no existen en ningún otro lado: si aparecen en un aviso o un correo, es que se filtró un nombre.
  const apellido = `Clsp${marca}`;
  const fallas: string[] = [];
  const debe = (ok: boolean, que: string) => { console.log(`${ok ? 'OK   ' : 'FALLA'} ${que}`); if (!ok) fallas.push(que); };
  const lineas: string[] = [];
  const log = { info: (m: string) => lineas.push(m), error: (_o: unknown, m?: string) => lineas.push(`ERROR ${m}`) };
  const correos: { para: string; html: string }[] = [];
  (correo as unknown as { enviarCorreo: unknown }).enviarCorreo = async (o: { para: string; html: string }) => { correos.push(o); };

  // El lunes que viene a las 8 a. m., y la semana que resume.
  const [a, m, d] = hoyEnBogota().split('-').map(Number);
  const dow = new Date(Date.UTC(a, m - 1, d)).getUTCDay();
  const hastaLunes = ((8 - dow) % 7) || 7;
  const lunes = new Date(dia(hastaLunes).getTime() + 8 * 3600_000);
  const semana = clave(hastaLunes - 7);
  const resumenesPrevios = await prisma.notificacion.count({ where: { tipo: TIPO_RESUMEN_SEMANAL, entidadId: semana } });
  debe(resumenesPrevios === 0, `la base arranca sin resúmenes de la semana del ${semana} (${resumenesPrevios})`);
  if (resumenesPrevios) { process.exitCode = 1; return; }

  const empresa = await prisma.empresa.create({
    data: {
      nombre: 'Prueba clima sin plan', nit: `TMP-CLSP-${marca}`, email: `tmp-clsp-${marca}@horapro.co`,
      suscripcion: { create: { plan: 'PROFESIONAL', estado: 'PRUEBA', finPrueba: new Date(Date.now() + 7 * DIA) } },
    },
  });
  const avisos = () => prisma.notificacion.findMany({ where: { empresaId: empresa.id, tipo: TIPO_AVISO_SIN_PLAN }, orderBy: { creadoEn: 'asc' } });
  const persona = (nombre: string) => prisma.colaborador.create({
    data: { empresaId: empresa.id, nombre, apellido, cedula: `TMP-CLSP-${nombre}-${marca}`, salarioMensual: 1_423_500 },
  });
  const calificar = (colaboradorId: string, dias: number[], carita: number) => prisma.calificacionClima.createMany({
    data: dias.map(k => ({ empresaId: empresa.id, colaboradorId, fecha: dia(k), carita, motivos: ['Mucho trabajo'] })),
  });
  const pasada = (enDias: number) => avisarClimaSinPlan(log, new Date(inicio.getTime() + enDias * DIA));
  const sinNombres = (txt: string) => !txt.includes(apellido) && !/\b(Ana|Beto|Caro)\b/.test(txt);

  try {
    debe((await capacidadesEmpresa(empresa.id)).features.clima === false, 'la empresa temporal NO tiene el clima');
    const [ana, beto, caro] = [await persona('Ana'), await persona('Beto'), await persona('Caro')];
    await calificar(ana.id, [-10, -9, -8], 1);
    await calificar(beto.id, [-10], 5);

    console.log('\n1. Ana entra a «necesita atención»');
    await pasada(0);
    let lista = await avisos();
    debe(lista.length === 1, `un aviso (${lista.length})`);
    debe(lista[0]?.titulo === '1 persona reportó días malos seguidos', `«${lista[0]?.titulo}»`);
    debe(lista[0]?.cuerpo?.includes('Puedes probarlo gratis 30 días.') === true, 'ofrece la prueba, que no ha usado');
    debe(lista[0]?.entidad === 'clima' && lista[0]?.entidadId === clave(-8), `lleva al clima y anota el día en que entró (${lista[0]?.entidadId})`);
    debe(sinNombres(`${lista[0]?.titulo} ${lista[0]?.cuerpo}`), 'sin nombres');

    console.log('\n2. Al día siguiente, nada nuevo');
    await pasada(1);
    debe((await avisos()).length === 1, 'no repite');
    debe(lineas[lineas.length - 1]?.startsWith('Clima sin el plan: ') === true, `y lo dice en el log: «${lineas[lineas.length - 1]}»`);

    console.log('\n3. Beto entra, pero no han pasado 7 días');
    await calificar(beto.id, [-3, -2, -1], 2);
    await pasada(6);
    debe((await avisos()).length === 1, 'espera');
    await pasada(7 + 1 / 1440);
    lista = await avisos();
    debe(lista.length === 2 && lista[1].titulo === '2 personas reportaron días malos seguidos', `a los 7 días avisa: «${lista[1]?.titulo}»`);
    debe(lista[1]?.entidadId === clave(-1), `con el día en que entró Beto (${lista[1]?.entidadId})`);

    console.log('\n4. Caro entra con la calificación del día apagada');
    await calificar(caro.id, [-7, -4, 0], 1);
    await prisma.configuracion.create({ data: { empresaId: empresa.id, clave: 'CLIMA_CALIFICACION_DIA', valor: '0' } });
    await pasada(15);
    debe((await avisos()).length === 2, 'apagada, no avisa');
    await prisma.configuracion.deleteMany({ where: { empresaId: empresa.id, clave: 'CLIMA_CALIFICACION_DIA' } });

    console.log('\n5. Con una prueba del clima vigente la empresa TIENE el clima');
    const prueba = await prisma.concesionFuncion.create({
      data: { empresaId: empresa.id, funcion: 'clima', desde: new Date(Date.now() - DIA), hasta: new Date(Date.now() + 30 * DIA), origen: 'PRUEBA' },
    });
    debe((await capacidadesEmpresa(empresa.id)).features.clima === true, 'con la prueba, tiene el clima');
    await pasada(15);
    debe((await avisos()).length === 2, 'no avisa: ve los nombres en el panel');

    console.log('\n6. Se le quita la prueba: vuelve a no tener el plan, y ya la usó');
    await prisma.concesionFuncion.update({ where: { id: prueba.id }, data: { revocadaEn: new Date() } });
    await pasada(15);
    lista = await avisos();
    debe(lista.length === 3 && lista[2].titulo === '3 personas reportaron días malos seguidos', `avisa con las tres: «${lista[2]?.titulo}»`);
    debe(lista[2]?.cuerpo?.includes('gratis') === false, 'y ya no ofrece la prueba');
    debe(lista.every(x => sinNombres(`${x.titulo} ${x.cuerpo}`)), 'ningún aviso trae un nombre');
    debe(!lineas.some(l => l.startsWith('ERROR')), 'sin errores en el log');
    debe(lineas.length === 7 && lineas.every(l => l.startsWith('Clima sin el plan: ')), `una línea de log por pasada (${lineas.length})`);

    console.log(`\n7. El correo del lunes ${lunes.toISOString().slice(0, 10)}`);
    // Una novedad por aprobar: sin algo que hacer o marcaciones en la semana, el correo no sale (la invitación sola no basta).
    await prisma.permiso.create({ data: { colaboradorId: ana.id, fechaInicio: dia(1), fechaFin: dia(1), tipo: 'VACACIONES' } });
    await enviarResumenesSemanales(log, lunes);
    const suyo = correos.find(c => c.para === empresa.email);
    debe(!!suyo, 'le llegó el resumen');
    debe(suyo?.html.includes('3 personas reportaron días malos seguidos en el clima laboral. Con el plan Empresarial ves quiénes y por qué') === true, 'con la línea del clima');
    debe(!!suyo && sinNombres(suyo.html), 'sin nombres en el correo');
  } finally {
    await prisma.notificacion.deleteMany({ where: { empresaId: empresa.id } });
    // Los resúmenes que esta corrida dejó en la campana de las demás empresas locales.
    const r = await prisma.notificacion.deleteMany({ where: { tipo: TIPO_RESUMEN_SEMANAL, entidadId: semana, creadoEn: { gte: inicio } } });
    await prisma.permiso.deleteMany({ where: { colaborador: { empresaId: empresa.id } } });
    await prisma.calificacionClima.deleteMany({ where: { empresaId: empresa.id } });
    await prisma.concesionFuncion.deleteMany({ where: { empresaId: empresa.id } });
    await prisma.configuracion.deleteMany({ where: { empresaId: empresa.id } });
    await prisma.colaborador.deleteMany({ where: { empresaId: empresa.id } });
    await prisma.suscripcion.deleteMany({ where: { empresaId: empresa.id } });
    await prisma.empresa.delete({ where: { id: empresa.id } });
    const quedan = await prisma.notificacion.count({ where: { tipo: TIPO_RESUMEN_SEMANAL, entidadId: semana } });
    console.log(`\nlimpio: empresa temporal ${(await prisma.empresa.count({ where: { id: empresa.id } })) === 0 ? 'borrada' : 'NO BORRADA'}; ${r.count} resúmenes de prueba borrados, quedan ${quedan}`);
  }
  console.log(fallas.length === 0 ? 'TODO OK' : `${fallas.length} FALLAS`);
  process.exitCode = fallas.length === 0 ? 0 : 1;
}

main().finally(() => prisma.$disconnect());
