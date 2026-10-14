// Genera sql/demo-septiembre-901123456.sql: datos de PRUEBA de septiembre de 2026 para la empresa «Demo»
// de producción con NIT 901123456 (cmsvhm2jn00l41146esg4o6y0, la de demo@horapro.co). Pedido del dueño el
// 14 de octubre de 2026. NO es la otra «Demo» (NIT 2872837), que tiene los datos del clima.
//
// Determinista: la semilla es fija, así que correrlo dos veces da el mismo SQL, letra por letra.
//   node prisma/generar-demo-septiembre.mjs
//
// Todo lo que agrega lleva «demosept-» en el id, y el bloque BORRAR del archivo lo quita entero.
import { writeFileSync } from 'node:fs';

const EMPRESA = 'cmsvhm2jn00l41146esg4o6y0';
const HORARIO = 'cmt3sqrrr01cs1146y9wtik9m'; // «Oficina»: lunes a viernes 8:00–17:00, 60 min de almuerzo
const ARIEL = 'cmtadsuzu008bhzxcwl6ylipa';
const SAMIR = 'cmt3sq303019e1146irw2bmlo';

// Las 6 de prueba. auxilioTransporte va NULL: es «el del decreto», como cualquier persona nueva.
const NUEVAS = [
  { n: '01', nombre: 'Laura', apellido: 'Gómez', cargo: 'Cajera', salario: 1423500 },
  { n: '02', nombre: 'Andrés', apellido: 'Ramírez', cargo: 'Auxiliar de bodega', salario: 1600000 },
  { n: '03', nombre: 'Valentina', apellido: 'Ríos', cargo: 'Contadora', salario: 2500000 },
  { n: '04', nombre: 'Camilo', apellido: 'Herrera', cargo: 'Mensajero', salario: 1423500 },
  { n: '05', nombre: 'Daniela', apellido: 'Castro', cargo: 'Asistente administrativa', salario: 1800000 },
  { n: '06', nombre: 'Julián', apellido: 'Torres', cargo: 'Vendedor', salario: 2000000 },
];
const idNueva = n => `demosept-col-${n}`;

// Quién marca y con qué excepciones. Los días son del mes de septiembre de 2026.
const PERSONAS = [
  // Ariel ya tiene una marcación real el 16: ese día no se toca. Incapacidad el 22 y el 23.
  { ref: 'ar', id: ARIEL, saltar: [16, 22, 23] },
  // Samir: cita médica el 10 de 9:00 a 11:00 (llega 11:05), y falta el 29.
  { ref: 'sa', id: SAMIR, saltar: [29], llegaTarde: { 10: [11, 5] } },
  ...NUEVAS.map(p => ({ ref: p.n, id: idNueva(p.n), saltar: null })),
];

// mulberry32: un generador con semilla, para que el archivo salga igual cada vez.
let semilla = 20260914;
const azar = () => {
  semilla |= 0; semilla = (semilla + 0x6d2b79f5) | 0;
  let t = Math.imul(semilla ^ (semilla >>> 15), 1 | semilla);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const entre = (a, b) => a + Math.floor(azar() * (b - a + 1));
const elegir = (lista, k) => { const l = [...lista]; const r = []; while (r.length < k) r.push(l.splice(entre(0, l.length - 1), 1)[0]); return r.sort((a, b) => a - b); };

const dosC = n => String(n).padStart(2, '0');
// Hora de Bogotá (UTC-5 todo el año) a texto UTC de MySQL. `min` puede pasar de 59: se normaliza.
const utc = (dia, h, min, seg = 0) => {
  const d = new Date(Date.UTC(2026, 8, dia, h + 5, min, seg));
  return `${d.getUTCFullYear()}-${dosC(d.getUTCMonth() + 1)}-${dosC(d.getUTCDate())} ${dosC(d.getUTCHours())}:${dosC(d.getUTCMinutes())}:${dosC(d.getUTCSeconds())}.000`;
};
const medianoche = dia => utc(dia, 0, 0); // medianoche de Bogotá = 05:00 UTC, la convención de `fecha`

// Septiembre de 2026 empieza en martes. Días hábiles del horario: lunes a viernes. No hay festivos.
const diaSemana = dia => new Date(Date.UTC(2026, 8, dia)).getUTCDay(); // 0 = domingo
const HABILES = [];
for (let d = 1; d <= 30; d++) if (diaSemana(d) >= 1 && diaSemana(d) <= 5) HABILES.push(d);

const filas = [];
const fila = (ref, id, dia, sufijo, entrada, salida, almuerzo) =>
  filas.push(`('demosept-r-${ref}-${dosC(dia)}${sufijo}', '${id}', '${medianoche(dia)}', '${entrada}', '${salida}', 'NORMAL', ${almuerzo ? 1 : 0})`);

const resumen = [];
for (const p of PERSONAS) {
  // Las nuevas faltan 2 días hábiles, elegidos al azar. Las reales, lo que dice su lista.
  const falta = p.saltar ?? elegir(HABILES, 2);
  const libres = HABILES.filter(d => !falta.includes(d));
  const tarde = new Set(elegir(libres, 3));
  let dias = 0;
  for (const dia of libres) {
    let [h, m] = [7, entre(45, 68)]; // 7:45 a 8:08: a tiempo, dentro de la tolerancia de 10
    if (tarde.has(dia)) [h, m] = [8, entre(15, 40)];
    if (p.llegaTarde?.[dia]) [h, m] = p.llegaTarde[dia];
    const salAlm = entre(0, 30), volver = salAlm + entre(60, 68);
    // 6 de cada 10 días sale a la hora; el resto se queda de 30 a 90 minutos más (horas extra).
    const extra = azar() < 0.6 ? entre(0, 12) : entre(30, 90);
    fila(p.ref, p.id, dia, 'a', utc(dia, h, m, entre(0, 59)), utc(dia, 12, salAlm, entre(0, 59)), true);
    fila(p.ref, p.id, dia, 'b', utc(dia, 12, volver, entre(0, 59)), utc(dia, 17, extra, entre(0, 59)), false);
    dias++;
  }
  resumen.push(`${p.ref}: ${dias} días, faltó ${falta.join(',')}, tarde ${[...tarde].join(',')}`);
}
// Fin de semana: Laura y Andrés trabajan el sábado 12 de 8:00 a 13:00 (fuera del horario: extra), y
// Camilo el domingo 20 de 9:00 a 15:00 (su día de descanso obligatorio: recargo).
for (const n of ['01', '02']) fila(n, idNueva(n), 12, 'a', utc(12, 8, entre(0, 5), entre(0, 59)), utc(12, 13, entre(0, 10), entre(0, 59)), false);
fila('04', idNueva('04'), 20, 'a', utc(20, 9, entre(0, 5), entre(0, 59)), utc(20, 15, entre(0, 10), entre(0, 59)), false);

const q = s => `'${s.replace(/'/g, "''")}'`;
const CREADO = "'2026-08-25 13:00:00.000'";
const sql = [];
sql.push(`-- Datos de PRUEBA de septiembre de 2026 para la empresa «Demo» de producción con NIT 901123456
-- (${EMPRESA}, la de demo@horapro.co). Pedido del dueño el 14 de octubre de 2026.
-- NO es la otra «Demo» (NIT 2872837, cmrfu0b5m0008avi678kzeldr), que tiene los datos del clima.
--
-- Lo generó backend/prisma/generar-demo-septiembre.mjs, con semilla fija: no editarlo a mano.
-- Todo lo que agrega lleva «demosept-» en el id; el bloque BORRAR lo quita entero.
--
-- Qué agrega:
--   - 6 personas de prueba (demosept-col-01 a 06, cédula DEMOSEPT-01 a 06), horario «Oficina», en
--     «Sede principal». Salen en todo Demo mientras existan.
--   - Sus días esperados de septiembre, COPIADOS de los de Samir Orozco (mismo horario, y los suyos
--     están completos): lo que debían trabajar cada día, contra lo que se miden la deuda y la tardanza.
--   - CORRIGE los días esperados de Ariel del 1 al 15 de septiembre: hoy dicen «no tenía que trabajar,
--     sin horario» (se materializaron antes de asignarle «Oficina»), y con ellos toda su primera
--     quincena saldría como horas extra. Se copian de los de Samir en esas fechas. Los 15 tienen hoy el
--     mismo valor, así que el bloque BORRAR los devuelve exactamente a como estaban.
--   - ${filas.length} marcaciones de septiembre para las 8 personas (Ariel y Samir incluidos), de lunes a
--     viernes, con salida al almuerzo, 3 llegadas tarde por persona, días con horas extra y 2 faltas
--     por persona nueva. Más un sábado (Laura y Andrés) y un domingo (Camilo).
--   - 2 novedades aprobadas: incapacidad de Ariel el 22 y 23, cita médica de Samir el 10 de 9 a 11.
--   La marcación real de Ariel del 16 de septiembre no se toca: ese día no se le agrega nada.
--
-- Resumen por persona: ${resumen.join(' · ')}
`);
sql.push('-- ============================================================================');
sql.push('-- AGREGAR (un solo envío)');
sql.push('-- ============================================================================');
sql.push(`INSERT INTO colaboradores (id, empresaId, nombre, apellido, cedula, cargo, salarioMensual, modalidad, activo, horarioId, creadoEn, actualizadoEn) VALUES ${NUEVAS.map(p => `(${q(idNueva(p.n))}, ${q(EMPRESA)}, ${q(p.nombre)}, ${q(p.apellido)}, 'DEMOSEPT-${p.n}', ${q(p.cargo)}, ${p.salario}, 'PRESENCIAL', 1, ${q(HORARIO)}, ${CREADO}, ${CREADO})`).join(', ')};`);
sql.push(`INSERT INTO colaboradores_sedes (colaboradorId, sedeId, creadoEn) SELECT c.id, s.id, ${CREADO} FROM colaboradores c JOIN sedes s ON s.empresaId = ${q(EMPRESA)} AND s.nombre = 'Sede principal' AND s.activa = 1 WHERE c.empresaId = ${q(EMPRESA)} AND c.id LIKE 'demosept-col-%';`);
sql.push(`INSERT INTO dias_esperados (id, colaboradorId, fecha, programado, horaEntrada, horaSalida, toleranciaMin, almuerzoMin, minutosEsperados, horarioId, origen, creadoEn, actualizadoEn, toleranciaSalidaMin, ajustaEntrada, almuerzoInicio, almuerzoFin, descansos, plantillaId, esDescanso, descansoPintado) SELECT CONCAT('demosept-d-', SUBSTRING(c.id, 14, 2), '-', DATE_FORMAT(d.fecha, '%m%d')), c.id, d.fecha, d.programado, d.horaEntrada, d.horaSalida, d.toleranciaMin, d.almuerzoMin, d.minutosEsperados, d.horarioId, d.origen, ${CREADO}, ${CREADO}, d.toleranciaSalidaMin, d.ajustaEntrada, d.almuerzoInicio, d.almuerzoFin, d.descansos, d.plantillaId, d.esDescanso, d.descansoPintado FROM dias_esperados d CROSS JOIN colaboradores c WHERE d.colaboradorId = ${q(SAMIR)} AND d.fecha >= '2026-09-01 05:00:00.000' AND d.fecha < '2026-10-01 05:00:00.000' AND c.empresaId = ${q(EMPRESA)} AND c.id LIKE 'demosept-col-%';`);
// Ariel, del 1 al 15: lo que exigía el horario, tomado de Samir en la misma fecha.
sql.push(`UPDATE dias_esperados a JOIN dias_esperados s ON s.colaboradorId = ${q(SAMIR)} AND s.fecha = a.fecha SET a.programado = s.programado, a.horaEntrada = s.horaEntrada, a.horaSalida = s.horaSalida, a.toleranciaMin = s.toleranciaMin, a.almuerzoMin = s.almuerzoMin, a.minutosEsperados = s.minutosEsperados, a.horarioId = s.horarioId, a.actualizadoEn = '2026-10-14 12:00:00.000' WHERE a.colaboradorId = ${q(ARIEL)} AND a.fecha >= '2026-09-01 05:00:00.000' AND a.fecha < '2026-09-16 05:00:00.000' AND a.programado = 0 AND a.horarioId IS NULL;`);
sql.push(`INSERT INTO registros (id, colaboradorId, fecha, entrada, salida, tipo, salidaAlmuerzo) VALUES ${filas.join(', ')};`);
sql.push(`INSERT INTO permisos (id, colaboradorId, fechaInicio, fechaFin, horaInicio, horaFin, tipo, descripcion, aprobado) VALUES ('demosept-p-01', ${q(ARIEL)}, '${medianoche(22)}', '${medianoche(23)}', NULL, NULL, 'INCAPACIDAD_EPS', 'Incapacidad por gripa (datos de prueba)', 1), ('demosept-p-02', ${q(SAMIR)}, '${medianoche(10)}', '${medianoche(10)}', '09:00', '11:00', 'MEDICO', 'Cita médica (datos de prueba)', 1);`);
sql.push('');
sql.push('-- ============================================================================');
sql.push('-- CONTAR (solo lectura)');
sql.push('-- ============================================================================');
sql.push(`SELECT (SELECT COUNT(*) FROM colaboradores WHERE empresaId = ${q(EMPRESA)} AND id LIKE 'demosept-%') AS personas, (SELECT COUNT(*) FROM colaboradores_sedes WHERE colaboradorId LIKE 'demosept-col-%') AS sedes, (SELECT COUNT(*) FROM dias_esperados WHERE id LIKE 'demosept-d-%') AS dias, (SELECT COUNT(*) FROM registros WHERE id LIKE 'demosept-r-%') AS marcaciones, (SELECT COUNT(*) FROM permisos WHERE id LIKE 'demosept-p-%') AS novedades, (SELECT COUNT(*) FROM dias_esperados WHERE colaboradorId = ${q(ARIEL)} AND fecha >= '2026-09-01 05:00:00.000' AND fecha < '2026-09-16 05:00:00.000' AND horarioId IS NOT NULL) AS ariel_corregidos;`);
sql.push('');
sql.push('-- ============================================================================');
sql.push('-- BORRAR TODO LO DE PRUEBA (las marcaciones primero: las novedades y los días cuelgan de las personas)');
sql.push('-- ============================================================================');
sql.push(`DELETE FROM permisos WHERE id LIKE 'demosept-p-%';`);
sql.push(`DELETE FROM registros WHERE id LIKE 'demosept-r-%';`);
sql.push(`DELETE FROM dias_esperados WHERE id LIKE 'demosept-d-%';`);
sql.push(`DELETE FROM colaboradores_sedes WHERE colaboradorId LIKE 'demosept-col-%';`);
// Ariel vuelve a como estaba: los 15 días tenían todos este mismo valor.
sql.push(`UPDATE dias_esperados SET programado = 0, horaEntrada = NULL, horaSalida = NULL, toleranciaMin = 0, almuerzoMin = 0, minutosEsperados = 0, horarioId = NULL WHERE colaboradorId = ${q(ARIEL)} AND fecha >= '2026-09-01 05:00:00.000' AND fecha < '2026-09-16 05:00:00.000' AND actualizadoEn = '2026-10-14 12:00:00.000';`);
sql.push(`DELETE FROM colaboradores WHERE empresaId = ${q(EMPRESA)} AND id LIKE 'demosept-col-%';`);

const ruta = new URL('../../sql/demo-septiembre-901123456.sql', import.meta.url);
writeFileSync(ruta, sql.join('\n') + '\n');
console.log(`marcaciones: ${filas.length}`);
for (const r of resumen) console.log(r);
