// Prueba sql/demo-septiembre-901123456.sql contra una réplica LOCAL de la «Demo» de NIT 901123456, con los
// mismos ids y los mismos días esperados que tiene en producción (leídos el 14 de octubre de 2026). Todo
// corre dentro de una transacción que se deshace al final: la base local queda como estaba.
//   npx tsx prisma/probar-demo-septiembre.ts
import { readFileSync } from 'node:fs';
import { prisma } from '../src/prisma';

const EMPRESA = 'cmsvhm2jn00l41146esg4o6y0';
const HORARIO = 'cmt3sqrrr01cs1146y9wtik9m';
const ARIEL = 'cmtadsuzu008bhzxcwl6ylipa';
const SAMIR = 'cmt3sq303019e1146irw2bmlo';
const DESHACER = 'deshacer-la-prueba';

const sql = readFileSync(new URL('../../sql/demo-septiembre-901123456.sql', import.meta.url), 'utf8');
const bloque = (titulo: string) => {
  const desde = sql.indexOf(titulo);
  const resto = sql.slice(desde);
  const hasta = resto.indexOf('-- ====', resto.indexOf('\n', resto.indexOf('-- ====') + 1) + 1);
  return resto.slice(0, hasta > 0 ? hasta : undefined).split('\n').filter(l => /^(INSERT|UPDATE|DELETE|SELECT)/.test(l));
};

const fallas: string[] = [];
const debe = (ok: boolean, que: string) => { console.log(`${ok ? 'OK   ' : 'FALLA'} ${que}`); if (!ok) fallas.push(que); };
const n = (v: unknown) => Number(v);

async function main() {
  const agregar = bloque('-- AGREGAR'), contar = bloque('-- CONTAR'), borrar = bloque('-- BORRAR');
  console.log(`sentencias: agregar ${agregar.length}, contar ${contar.length}, borrar ${borrar.length}`);
  debe(agregar.length === 6 && contar.length === 1 && borrar.length === 6, 'el archivo tiene los tres bloques completos');

  await prisma.$transaction(async tx => {
    const x = (q: string) => tx.$executeRawUnsafe(q);
    // --- La réplica: como está en producción ---
    await x(`INSERT INTO empresas (id, nombre, nit, email, marcadorToken, actualizadoEn) VALUES ('${EMPRESA}', 'Demo', 'PRUEBA-901123456', 'demo-prueba@horapro.co', 'token-prueba-demosept', NOW(3))`);
    await x(`INSERT INTO horarios (id, empresaId, nombre, toleranciaMin, almuerzoMin) VALUES ('${HORARIO}', '${EMPRESA}', 'Oficina', 10, 60)`);
    await x(`INSERT INTO sedes (id, empresaId, nombre, actualizadoEn) VALUES ('sede-prueba-demosept', '${EMPRESA}', 'Sede principal', NOW(3))`);
    for (const [id, nombre] of [[ARIEL, 'Ariel'], [SAMIR, 'Samir']]) {
      await x(`INSERT INTO colaboradores (id, empresaId, nombre, apellido, cedula, salarioMensual, horarioId, actualizadoEn) VALUES ('${id}', '${EMPRESA}', '${nombre}', 'Prueba', 'CED-${nombre}', 1750000, '${HORARIO}', NOW(3))`);
    }
    for (let d = 1; d <= 30; d++) {
      const fecha = `2026-09-${String(d).padStart(2, '0')} 05:00:00.000`;
      const habil = [1, 2, 3, 4, 5].includes(new Date(Date.UTC(2026, 8, d)).getUTCDay());
      const conHorario = habil
        ? `1, '08:00', '17:00', 10, 60, 480, '${HORARIO}'`
        : `0, NULL, NULL, 10, 0, 0, '${HORARIO}'`;
      await x(`INSERT INTO dias_esperados (id, colaboradorId, fecha, programado, horaEntrada, horaSalida, toleranciaMin, almuerzoMin, minutosEsperados, horarioId, actualizadoEn) VALUES ('de-sa-${d}', '${SAMIR}', '${fecha}', ${conHorario}, NOW(3))`);
      // Ariel: del 1 al 15, «no tenía que trabajar, sin horario», como en producción.
      const ariel = d <= 15 ? `0, NULL, NULL, 0, 0, 0, NULL` : conHorario;
      await x(`INSERT INTO dias_esperados (id, colaboradorId, fecha, programado, horaEntrada, horaSalida, toleranciaMin, almuerzoMin, minutosEsperados, horarioId, actualizadoEn) VALUES ('de-ar-${d}', '${ARIEL}', '${fecha}', ${ariel}, NOW(3))`);
    }
    // La marcación real de Ariel del 16, que no se puede tocar.
    await x(`INSERT INTO registros (id, colaboradorId, fecha, entrada, salida) VALUES ('real-ariel-16', '${ARIEL}', '2026-09-16 05:00:00.000', '2026-09-16 16:03:34.914', '2026-09-16 22:00:00.000')`);

    // --- AGREGAR, tal cual el archivo ---
    for (const q of agregar) await x(q);

    const [c] = await tx.$queryRawUnsafe<Record<string, unknown>[]>(contar[0]);
    console.log('conteo:', JSON.stringify(c, (_k, v) => (typeof v === 'bigint' ? Number(v) : v)));
    debe(n(c.personas) === 6, '6 personas');
    debe(n(c.sedes) === 6, '6 en Sede principal');
    debe(n(c.dias) === 180, '180 días esperados (6 × 30)');
    debe(n(c.marcaciones) === 323, '323 marcaciones');
    debe(n(c.novedades) === 2, '2 novedades');
    debe(n(c.ariel_corregidos) === 15, 'los 15 días de Ariel con horario');

    // Ariel del 1 al 15 quedó igual a Samir; del 16 en adelante no se tocó.
    const [a] = await tx.$queryRawUnsafe<Record<string, unknown>[]>(`SELECT SUM(a.programado <> s.programado OR a.minutosEsperados <> s.minutosEsperados OR NOT (a.horarioId <=> s.horarioId)) AS distintos, SUM(a.programado) AS habiles FROM dias_esperados a JOIN dias_esperados s ON s.colaboradorId = '${SAMIR}' AND s.fecha = a.fecha WHERE a.colaboradorId = '${ARIEL}' AND a.fecha < '2026-09-16 05:00:00.000'`);
    debe(n(a.distintos) === 0 && n(a.habiles) === 11, `Ariel del 1 al 15 igual a Samir (${n(a.habiles)} hábiles)`);
    const [na] = await tx.$queryRawUnsafe<Record<string, unknown>[]>(`SELECT COUNT(*) AS c FROM dias_esperados WHERE colaboradorId = '${ARIEL}' AND fecha >= '2026-09-16 05:00:00.000' AND actualizadoEn = '2026-10-14 12:00:00.000'`);
    debe(n(na.c) === 0, 'Ariel del 16 en adelante sin tocar');

    // Las marcaciones tienen sentido: entrada antes de salida, el almuerzo antes del regreso, y nada
    // el 16 de Ariel ni en los días de su incapacidad.
    const [m] = await tx.$queryRawUnsafe<Record<string, unknown>[]>(`SELECT SUM(salida <= entrada) AS al_reves, SUM(TIMESTAMPDIFF(MINUTE, entrada, salida) > 600) AS largas, SUM(DATE(entrada - INTERVAL 5 HOUR) <> DATE(fecha)) AS otro_dia FROM registros WHERE id LIKE 'demosept-r-%'`);
    debe(n(m.al_reves) === 0 && n(m.largas) === 0 && n(m.otro_dia) === 0, 'cada marcación cae en su día y sale después de entrar');
    const [p] = await tx.$queryRawUnsafe<Record<string, unknown>[]>(`SELECT COUNT(*) AS c FROM registros a JOIN registros b ON b.colaboradorId = a.colaboradorId AND b.fecha = a.fecha AND b.id <> a.id AND b.entrada < a.salida AND a.entrada < b.salida WHERE a.id LIKE 'demosept-r-%'`);
    debe(n(p.c) === 0, 'ninguna marcación se cruza con otra de la misma persona');
    const [ar] = await tx.$queryRawUnsafe<Record<string, unknown>[]>(`SELECT COUNT(*) AS c FROM registros WHERE colaboradorId = '${ARIEL}' AND id LIKE 'demosept-r-%' AND fecha IN ('2026-09-16 05:00:00.000', '2026-09-22 05:00:00.000', '2026-09-23 05:00:00.000')`);
    debe(n(ar.c) === 0, 'nada nuevo para Ariel el 16, el 22 ni el 23');

    // --- BORRAR, tal cual el archivo ---
    for (const q of borrar) await x(q);
    const [c2] = await tx.$queryRawUnsafe<Record<string, unknown>[]>(contar[0]);
    debe(n(c2.personas) + n(c2.sedes) + n(c2.dias) + n(c2.marcaciones) + n(c2.novedades) + n(c2.ariel_corregidos) === 0, 'BORRAR deja todo en 0');
    const [vuelta] = await tx.$queryRawUnsafe<Record<string, unknown>[]>(`SELECT COUNT(*) AS c FROM dias_esperados WHERE colaboradorId = '${ARIEL}' AND fecha < '2026-09-16 05:00:00.000' AND programado = 0 AND horaEntrada IS NULL AND toleranciaMin = 0 AND minutosEsperados = 0 AND horarioId IS NULL`);
    debe(n(vuelta.c) === 15, 'Ariel del 1 al 15 vuelve exactamente a como estaba');
    const [real] = await tx.$queryRawUnsafe<Record<string, unknown>[]>(`SELECT COUNT(*) AS c FROM registros WHERE id = 'real-ariel-16'`);
    debe(n(real.c) === 1, 'la marcación real de Ariel sigue ahí');

    throw new Error(DESHACER); // la réplica no se queda en la base local
  }, { timeout: 120_000 }).catch(e => { if ((e as Error).message !== DESHACER) throw e; });

  const [quedo] = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(`SELECT COUNT(*) AS c FROM empresas WHERE id = '${EMPRESA}'`);
  debe(n(quedo.c) === 0, 'la base local quedó como estaba (la transacción se deshizo)');
  console.log(fallas.length ? `${fallas.length} FALLAS` : 'TODO OK');
  process.exitCode = fallas.length ? 1 : 0;
}

main().finally(() => prisma.$disconnect());
