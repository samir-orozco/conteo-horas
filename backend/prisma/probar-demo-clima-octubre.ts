// Prueba sql/demo-clima-octubre-901123456.sql contra una réplica LOCAL de la «Demo» de NIT 901123456, con
// los mismos ids. Todo corre en una transacción que se deshace al final: la base local queda como estaba.
//   npx tsx prisma/probar-demo-clima-octubre.ts
//
// Además de contar, pasa las caritas insertadas por `necesitanAtencion` y `filasParaLaRacha`, las MISMAS
// funciones que usa el panel: si el comienzo de la racha no coincide con el de los casos insertados, al
// abrir el panel se abriría un segundo caso para la misma persona.
import { readFileSync } from 'node:fs';
import { prisma } from '../src/prisma';
import { necesitanAtencion, filasParaLaRacha, CARITA_MAX_DE_ATENCION } from '../src/utils/clima';

const EMPRESA = 'cmsvhm2jn00l41146esg4o6y0';
const HORARIO = 'cmt3sqrrr01cs1146y9wtik9m';
const ARIEL = 'cmtadsuzu008bhzxcwl6ylipa';
const SAMIR = 'cmt3sq303019e1146irw2bmlo';
const DESHACER = 'deshacer-la-prueba';

const sql = readFileSync(new URL('../../sql/demo-clima-octubre-901123456.sql', import.meta.url), 'utf8');
const bloque = (titulo: string) => {
  const resto = sql.slice(sql.indexOf(titulo));
  const fin = resto.indexOf('-- ====', resto.indexOf('\n', resto.indexOf('-- ====') + 1) + 1);
  return resto.slice(0, fin > 0 ? fin : undefined).split('\n').filter(l => /^(INSERT|UPDATE|DELETE|SELECT)/.test(l));
};
const fallas: string[] = [];
const debe = (ok: boolean, que: string) => { console.log(`${ok ? 'OK   ' : 'FALLA'} ${que}`); if (!ok) fallas.push(que); };
const n = (v: unknown) => Number(v);

async function main() {
  const agregar = bloque('-- AGREGAR'), contar = bloque('-- CONTAR'), borrar = bloque('-- BORRAR');
  debe(agregar.length === 6 && contar.length === 1 && borrar.length === 6, `el archivo tiene los tres bloques (${agregar.length}/${contar.length}/${borrar.length})`);

  await prisma.$transaction(async tx => {
    const x = (q: string) => tx.$executeRawUnsafe(q);
    // --- La réplica ---
    await x(`INSERT INTO empresas (id, nombre, nit, email, marcadorToken, actualizadoEn) VALUES ('${EMPRESA}', 'Demo', 'PRUEBA-901123456', 'demo-prueba@horapro.co', 'token-prueba-demooct', NOW(3))`);
    await x(`INSERT INTO usuarios (id, email, password, nombre, rol, empresaId) VALUES ('usuario-prueba-demooct', 'admin-prueba-demooct@horapro.co', 'x', 'Admin Demo', 'ADMIN', '${EMPRESA}')`);
    await x(`INSERT INTO horarios (id, empresaId, nombre, toleranciaMin, almuerzoMin) VALUES ('${HORARIO}', '${EMPRESA}', 'Oficina', 10, 60)`);
    const personas = [ARIEL, SAMIR, ...['01', '02', '03', '04', '05', '06'].map(k => `demosept-col-${k}`)];
    for (const [i, id] of personas.entries()) {
      await x(`INSERT INTO colaboradores (id, empresaId, nombre, apellido, cedula, salarioMensual, horarioId, actualizadoEn) VALUES ('${id}', '${EMPRESA}', 'P${i}', 'Prueba', 'CED-OCT-${i}', 1750000, '${HORARIO}', NOW(3))`);
    }
    for (let d = 1; d <= 13; d++) {
      const habil = [1, 2, 3, 4, 5].includes(new Date(Date.UTC(2026, 9, d)).getUTCDay());
      const v = habil ? `1, '08:00', '17:00', 10, 60, 480` : `0, NULL, NULL, 10, 0, 0`;
      await x(`INSERT INTO dias_esperados (id, colaboradorId, fecha, programado, horaEntrada, horaSalida, toleranciaMin, almuerzoMin, minutosEsperados, horarioId, actualizadoEn) VALUES ('de-oct-sa-${d}', '${SAMIR}', '2026-10-${String(d).padStart(2, '0')} 05:00:00.000', ${v}, '${HORARIO}', NOW(3))`);
    }
    // Una de las nuevas ya tiene su día 1: ese no se puede duplicar.
    await x(`INSERT INTO dias_esperados (id, colaboradorId, fecha, programado, horarioId, actualizadoEn) VALUES ('de-oct-ya-existe', 'demosept-col-01', '2026-10-01 05:00:00.000', 1, '${HORARIO}', NOW(3))`);

    for (const q of agregar) await x(q);

    const [c] = await tx.$queryRawUnsafe<Record<string, unknown>[]>(contar[0]);
    console.log('conteo:', JSON.stringify(c, (_k, v) => (typeof v === 'bigint' ? Number(v) : v)));
    debe(n(c.dias) === 6 * 13 - 1, `días esperados: los que faltaban (${n(c.dias)}, uno ya existía)`);
    debe(n(c.marcaciones) === 125, '125 marcaciones');
    debe(n(c.caritas) === 57, '57 caritas');
    debe(n(c.observaciones) === 10, '10 observaciones, todas en días con carita');
    debe(n(c.notas) === 8, '8 notas');
    debe(n(c.casos) === 3 && n(c.comentarios) === 4, '3 casos y 4 comentarios');

    // Cada carita cae en un día en que la persona marcó una salida del kiosco: si no, el panel la contaría
    // contra una jornada que no existe.
    const [huerfanas] = await tx.$queryRawUnsafe<Record<string, unknown>[]>(`SELECT COUNT(*) AS c FROM calificaciones_clima k WHERE k.id LIKE 'demooct-c-%' AND NOT EXISTS (SELECT 1 FROM registros r WHERE r.colaboradorId = k.colaboradorId AND r.fecha = k.fecha AND r.salida IS NOT NULL AND r.salidaAlmuerzo = 0)`);
    debe(n(huerfanas.c) === 0, 'toda carita tiene su salida ese día');
    const [mot] = await tx.$queryRawUnsafe<Record<string, unknown>[]>(`SELECT SUM(carita > 3 AND JSON_LENGTH(motivos) > 0) AS buenas_con_motivo, SUM(carita <= 3 AND JSON_LENGTH(motivos) = 0) AS malas_sin_motivo FROM calificaciones_clima WHERE id LIKE 'demooct-c-%'`);
    debe(n(mot.buenas_con_motivo) === 0 && n(mot.malas_sin_motivo) === 0, 'motivos solo en caritas de 3 o menos, y siempre en ellas');
    const [festivo] = await tx.$queryRawUnsafe<Record<string, unknown>[]>(`SELECT COUNT(*) AS c, SUM(tipo = 'FESTIVO') AS f FROM registros WHERE id LIKE 'demooct-r-%' AND fecha = '2026-10-12 05:00:00.000'`);
    debe(n(festivo.c) === 1 && n(festivo.f) === 1, 'el 12 solo Julián, como FESTIVO');

    // La racha, con las funciones del panel.
    const todas = await tx.$queryRawUnsafe<{ colaboradorId: string; fecha: Date; carita: number; motivos: unknown }[]>(`SELECT colaboradorId, fecha, carita, motivos FROM calificaciones_clima WHERE empresaId = '${EMPRESA}'`);
    const lista = (m: unknown) => (Array.isArray(m) ? m : typeof m === 'string' ? JSON.parse(m) : []) as string[];
    const ultimoBueno = new Map<string, Date>();
    for (const k of todas) if (k.carita > CARITA_MAX_DE_ATENCION && (!ultimoBueno.has(k.colaboradorId) || k.fecha > ultimoBueno.get(k.colaboradorId)!)) ultimoBueno.set(k.colaboradorId, k.fecha);
    const malas = todas.filter(k => k.carita <= CARITA_MAX_DE_ATENCION).map(k => ({ ...k, motivos: lista(k.motivos) }));
    const atencion = necesitanAtencion(filasParaLaRacha(malas, ultimoBueno));
    console.log('en atención:', atencion.map(a => `${a.colaboradorId} desde ${a.desde.toISOString().slice(0, 10)} (${a.dias})`).join(' · '));
    const casos = await tx.$queryRawUnsafe<{ colaboradorId: string; desde: Date; estado: string }[]>(`SELECT colaboradorId, desde, estado FROM seguimientos_clima WHERE empresaId = '${EMPRESA}'`);
    const abiertos = casos.filter(k => k.estado !== 'CERRADO');
    debe(atencion.length === 2, 'dos personas en «Necesitan atención» (Andrés y Daniela)');
    debe(atencion.every(a => abiertos.some(k => k.colaboradorId === a.colaboradorId && k.desde.getTime() === a.desde.getTime())),
      'cada una tiene su caso con el MISMO comienzo que calcula el panel: no se abrirá un segundo');
    debe(!atencion.some(a => a.colaboradorId === 'demosept-col-03'), 'Valentina ya no está en atención: su caso está cerrado');

    for (const q of borrar) await x(q);
    const [c2] = await tx.$queryRawUnsafe<Record<string, unknown>[]>(contar[0]);
    debe(Object.values(c2).reduce<number>((s, v) => s + n(v), 0) === 0, 'BORRAR deja todo en 0');
    const [ya] = await tx.$queryRawUnsafe<Record<string, unknown>[]>(`SELECT COUNT(*) AS c FROM dias_esperados WHERE id = 'de-oct-ya-existe'`);
    debe(n(ya.c) === 1, 'el día esperado que ya existía sigue ahí');

    throw new Error(DESHACER);
  }, { timeout: 120_000 }).catch(e => { if ((e as Error).message !== DESHACER) throw e; });

  const [quedo] = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(`SELECT COUNT(*) AS c FROM empresas WHERE id = '${EMPRESA}'`);
  debe(n(quedo.c) === 0, 'la base local quedó como estaba');
  console.log(fallas.length ? `${fallas.length} FALLAS` : 'TODO OK');
  process.exitCode = fallas.length ? 1 : 0;
}

main().finally(() => prisma.$disconnect());
