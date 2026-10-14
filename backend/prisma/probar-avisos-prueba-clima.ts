// La pasada diaria de los avisos de la prueba gratis del clima (14 de octubre de 2026, PENDIENTES nº 39, fase 3),
// contra la base LOCAL. Qué aviso toca lo prueba utils/pruebaClima.test.ts; esto comprueba la plomería: que manda
// cada aviso una sola vez, con las respuestas reales en el de avance, y que deja rastro en el log aunque no mande
// nada (CLAUDE.md §8.3). Crea una empresa temporal y BORRA todo lo que creó.
//   npx tsx prisma/probar-avisos-prueba-clima.ts
import { prisma } from '../src/prisma';
import { avisarPruebasDelClima } from '../src/utils/avisosDePruebaClima';

const DIA = 24 * 60 * 60 * 1000;

async function main() {
  const marca = Date.now();
  const empresa = await prisma.empresa.create({ data: { nombre: 'Prueba avisos clima', nit: `TMP-AVCL-${marca}`, email: `tmp-avcl-${marca}@horapro.co` } });
  const fallas: string[] = [];
  const debe = (ok: boolean, que: string) => { console.log(`${ok ? 'OK   ' : 'FALLA'} ${que}`); if (!ok) fallas.push(que); };
  const lineas: string[] = [];
  const log = { info: (m: string) => lineas.push(m), error: (_o: unknown, m?: string) => lineas.push(`ERROR ${m}`) };
  const avisos = () => prisma.notificacion.findMany({ where: { empresaId: empresa.id }, orderBy: { creadoEn: 'asc' }, select: { tipo: true, cuerpo: true } });

  try {
    const desde = new Date(Date.UTC(2026, 9, 14, 14));                 // 14 de octubre, 9 a. m. de Bogotá
    const hasta = new Date(Date.UTC(2026, 10, 13, 5));                 // fin exclusivo: medianoche del 13 de noviembre
    const prueba = await prisma.concesionFuncion.create({ data: { empresaId: empresa.id, funcion: 'clima', desde, hasta, origen: 'PRUEBA' } });
    const ana = await prisma.colaborador.create({ data: { empresaId: empresa.id, nombre: 'Ana', apellido: 'Prueba', cedula: `TMP-AVCL-${marca}`, salarioMensual: 1_423_500 } });
    for (const [d, carita] of [[15, 4], [16, 3], [17, 5]] as const) {
      await prisma.calificacionClima.create({ data: { empresaId: empresa.id, colaboradorId: ana.id, fecha: new Date(Date.UTC(2026, 9, d, 5)), carita, motivos: [] } });
    }

    debe(await avisarPruebasDelClima(log, new Date(desde.getTime() + 10 * DIA)) === 0, 'a los 10 días no manda nada');
    debe(lineas.at(-1)?.includes('0 avisos de') === true, `y lo dice en el log: «${lineas.at(-1)}»`);

    debe(await avisarPruebasDelClima(log, new Date(desde.getTime() + 21 * DIA)) === 1, 'a los 21 días manda uno');
    const a1 = await avisos();
    debe(a1.length === 1 && a1[0].tipo === 'PRUEBA_CLIMA_AVANCE', 'el de avance');
    debe(a1[0]?.cuerpo?.includes('3 respuestas') === true && a1[0]?.cuerpo?.includes('4,0 de 5') === true, `con las respuestas reales: «${a1[0]?.cuerpo}»`);

    debe(await avisarPruebasDelClima(log, new Date(desde.getTime() + 22 * DIA)) === 0, 'al día siguiente no lo repite');

    debe(await avisarPruebasDelClima(log, new Date(hasta.getTime() - 2 * DIA)) === 1, 'dos días antes del fin manda uno');
    debe((await avisos()).at(-1)?.tipo === 'PRUEBA_CLIMA_POR_TERMINAR', 'el de por terminar');

    debe(await avisarPruebasDelClima(log, new Date(hasta.getTime() + 3600_000)) === 1, 'al terminar manda uno');
    debe((await avisos()).at(-1)?.tipo === 'PRUEBA_CLIMA_TERMINO', 'el de terminó');
    debe(await avisarPruebasDelClima(log, new Date(hasta.getTime() + 2 * 3600_000)) === 0, 'y no lo repite');
    debe((await avisos()).length === 3, 'en total, tres avisos');
    debe(!lineas.some(l => l.startsWith('ERROR')), 'sin errores en el log');
    void prueba;
  } finally {
    await prisma.notificacion.deleteMany({ where: { empresaId: empresa.id } });
    await prisma.calificacionClima.deleteMany({ where: { empresaId: empresa.id } });
    await prisma.concesionFuncion.deleteMany({ where: { empresaId: empresa.id } });
    await prisma.colaborador.deleteMany({ where: { empresaId: empresa.id } });
    await prisma.empresa.delete({ where: { id: empresa.id } });
    console.log((await prisma.empresa.count({ where: { id: empresa.id } })) === 0 ? 'limpio: la empresa temporal y todo lo suyo se borraron' : 'NO SE BORRÓ');
  }
  console.log(fallas.length === 0 ? 'TODO OK' : `${fallas.length} FALLAS`);
  process.exitCode = fallas.length === 0 ? 0 : 1;
}

main().finally(() => prisma.$disconnect());
