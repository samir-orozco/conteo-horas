// Genera sql/demo-clima-octubre-901123456.sql: marcaciones y clima laboral de PRUEBA del 1 al 13 de octubre
// de 2026 para la empresa «Demo» de producción con NIT 901123456 (cmsvhm2jn00l41146esg4o6y0). Pedido del
// dueño el 14 de octubre de 2026, encima de los datos de septiembre (sql/demo-septiembre-901123456.sql).
//
// Determinista: la semilla es fija, así que correrlo dos veces da el mismo SQL, letra por letra.
//   node prisma/generar-demo-clima-octubre.mjs
//
// Todo lo que agrega lleva «demooct-» en el id, y el bloque BORRAR del archivo lo quita entero.
import { writeFileSync } from 'node:fs';

const EMPRESA = 'cmsvhm2jn00l41146esg4o6y0';
const ARIEL = 'cmtadsuzu008bhzxcwl6ylipa';
const SAMIR = 'cmt3sq303019e1146irw2bmlo';
const col = n => `demosept-col-${n}`;

// Los días de octubre que se cargan: hábiles del 1 al 13. El 12 es festivo (Día de la Raza): solo trabaja
// Julián, y esa marcación va como FESTIVO.
const DIAS = [1, 2, 5, 6, 7, 8, 9, 13];

// Una carita por día de DIAS, en ese orden: '1' a '5', o '-' si ese día no respondió. Una falta va con 'F'
// (ni marca ni carita). Cada persona cuenta una historia distinta, para que el panel tenga de todo.
const PERSONAS = [
  { ref: 'ar', id: ARIEL, caritas: '34-23434', motivos: ['Mucho trabajo', 'Algo personal'] }, // vaivén
  { ref: 'sa', id: SAMIR, caritas: '455-454F', motivos: ['Mucho trabajo'] }, // contento, falta el 13
  { ref: '01', id: col('01'), caritas: '55454554', motivos: ['Compañeros'] }, // muy contenta
  { ref: '02', id: col('02'), caritas: '43322121', motivos: ['Jefe o supervisor', 'Me tocó quedarme más tiempo'] }, // empeora: caso en seguimiento
  { ref: '03', id: col('03'), caritas: '21234455', motivos: ['Compañeros', 'Algo personal'] }, // mejora: caso cerrado
  { ref: '04', id: col('04'), caritas: '3-34F33-', motivos: ['Me tocó quedarme más tiempo'] }, // responde poco, falta el 7
  { ref: '05', id: col('05'), caritas: '44212-11', motivos: ['Compañeros', 'Jefe o supervisor'] }, // racha mala: caso sin revisar
  { ref: '06', id: col('06'), caritas: '54434454', motivos: ['Mucho trabajo'] }, // estable
];

// Observaciones con nombre (las ve la empresa), en días con carita.
const OBSERVACIONES = {
  'ar-6': 'El computador de la oficina está muy lento, se me fue la mañana esperando.',
  'sa-5': 'Reunión muy productiva con todo el equipo.',
  '01-2': 'Hoy la caja cuadró perfecto, gracias al equipo.',
  '02-8': 'Me dejaron solo descargando el camión toda la tarde.',
  '02-13': 'Llevo varios días saliendo tarde y nadie lo reconoce.',
  '03-1': 'Tuve un problema con un compañero en la mañana.',
  '03-13': 'Ya se arregló lo del equipo, me siento mucho mejor.',
  '05-6': 'Me cambiaron de puesto sin avisarme.',
  '05-13': 'No me siento escuchada cuando propongo algo.',
  '06-9': 'Cerramos la venta más grande del mes.',
};

// Notas del buzón confidencial: la semana (lunes) y desde cuándo se ven (la medianoche siguiente al día en
// que se escribieron). El autor es FALSO: el comando de revelar no las puede descifrar, y está bien.
const NOTAS = [
  ['09-28', '10-02', 'Siento que hay preferencias a la hora de dar los permisos.'],
  ['09-28', '10-03', 'Gracias por el detalle de cumpleaños, se sintió bonito.'],
  ['10-05', '10-06', 'El ambiente en la bodega está muy pesado últimamente.'],
  ['10-05', '10-08', 'Me gustaría recibir capacitación en el sistema nuevo.'],
  ['10-05', '10-09', 'Hay un compañero que siempre llega tarde y nadie le dice nada.'],
  ['10-05', '10-10', 'Las sillas de la oficina están dañadas y duele la espalda.'],
  ['10-12', '10-14', 'Me preocupa que no nos estén pagando completas las horas extra.'],
  ['10-12', '10-14', 'El jefe de bodega grita mucho, da miedo decirle algo.'],
];

let semilla = 20261013;
const azar = () => {
  semilla |= 0; semilla = (semilla + 0x6d2b79f5) | 0;
  let t = Math.imul(semilla ^ (semilla >>> 15), 1 | semilla);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const entre = (a, b) => a + Math.floor(azar() * (b - a + 1));
const dosC = n => String(n).padStart(2, '0');
// Hora de Bogotá (UTC-5 todo el año) a texto UTC de MySQL, en octubre de 2026.
const utc = (dia, h, min, seg = 0) => {
  const d = new Date(Date.UTC(2026, 9, dia, h + 5, min, seg));
  return `${d.getUTCFullYear()}-${dosC(d.getUTCMonth() + 1)}-${dosC(d.getUTCDate())} ${dosC(d.getUTCHours())}:${dosC(d.getUTCMinutes())}:${dosC(d.getUTCSeconds())}.000`;
};
const medianoche = dia => utc(dia, 0, 0);
const deMesDia = md => { const [m, d] = md.split('-').map(Number); return `2026-${dosC(m)}-${dosC(d)} 05:00:00.000`; };
const q = s => `'${s.replace(/'/g, "''")}'`;

const marcas = [];
const caritas = [];
const marca = (ref, id, dia, sufijo, entrada, salida, almuerzo, tipo = 'NORMAL') =>
  marcas.push(`('demooct-r-${ref}-${dosC(dia)}${sufijo}', '${id}', '${medianoche(dia)}', '${entrada}', '${salida}', '${tipo}', ${almuerzo ? 1 : 0})`);

const historia = [];
for (const p of PERSONAS) {
  if (p.caritas.length !== DIAS.length) throw new Error(`${p.ref}: ${p.caritas.length} caritas para ${DIAS.length} días`);
  const tarde = new Set([DIAS[entre(0, 7)], DIAS[entre(0, 7)]]);
  DIAS.forEach((dia, i) => {
    const c = p.caritas[i];
    if (c === 'F') return; // falta: ni marca ni carita
    let [h, m] = [7, entre(45, 68)];
    if (tarde.has(dia)) [h, m] = [8, entre(15, 35)];
    const salAlm = entre(0, 30), volver = salAlm + entre(60, 68);
    // Quien está mal se queda más tarde: es parte de la historia que cuentan sus caritas.
    const extra = c !== '-' && Number(c) <= 2 ? entre(40, 95) : (azar() < 0.65 ? entre(0, 12) : entre(25, 70));
    const salida = utc(dia, 17, extra, entre(0, 59));
    marca(p.ref, p.id, dia, 'a', utc(dia, h, m, entre(0, 59)), utc(dia, 12, salAlm, entre(0, 59)), true);
    marca(p.ref, p.id, dia, 'b', utc(dia, 12, volver, entre(0, 59)), salida, false);
    if (c === '-') return; // marcó la salida pero no respondió
    const carita = Number(c);
    // Motivos: solo con carita de 3 o menos, como en el kiosco. Con 1 o 2, a veces dos.
    const motivos = carita > 3 ? [] : carita <= 2 && p.motivos.length > 1 && azar() < 0.5 ? p.motivos : [p.motivos[entre(0, p.motivos.length - 1)]];
    const obs = OBSERVACIONES[`${p.ref}-${dia}`] ?? null;
    // La carita se responde al salir: un minuto después de la salida.
    const respondio = utc(dia, 17, extra + 1, entre(0, 59));
    caritas.push(`('demooct-c-${p.ref}-${dosC(dia)}', ${q(EMPRESA)}, '${p.id}', '${medianoche(dia)}', ${carita}, '${JSON.stringify(motivos)}', ${obs ? q(obs) : 'NULL'}, '${respondio}', '${respondio}')`);
  });
  historia.push(`${p.ref} ${p.caritas}`);
}
// El festivo del lunes 12: Julián trabaja de 9:00 a 14:00 (recargo dominical y festivo), sin carita.
marca('06', col('06'), 12, 'a', utc(12, 9, entre(0, 5), entre(0, 59)), utc(12, 14, entre(0, 10), entre(0, 59)), false, 'FESTIVO');

// El comienzo de la racha mala de cada persona: las respuestas de 1 o 2 después de la última mejor, igual
// que `necesitanAtencion` en utils/clima.ts. La llave del caso es (persona, comienzo), y si no coincide
// con la que calcula la aplicación, al abrir el panel se abriría un segundo caso.
const comienzoDeRacha = (p, hastaIndice = DIAS.length) => {
  let desde = null;
  for (let i = 0; i < hastaIndice; i++) {
    const c = p.caritas[i];
    if (c === '-' || c === 'F') continue;
    if (Number(c) <= 2) { if (desde === null) desde = DIAS[i]; } else desde = null;
  }
  return desde;
};
const persona = ref => PERSONAS.find(p => p.ref === ref);
const desdeAndres = comienzoDeRacha(persona('02'));
const desdeDaniela = comienzoDeRacha(persona('05'));
const desdeValentina = comienzoDeRacha(persona('03'), 3); // su racha del 1 al 5, que ya pasó
if (!desdeAndres || !desdeDaniela || !desdeValentina) throw new Error('una racha no se encontró');

// El responsable de los casos y el autor de los comentarios: el primer usuario de la empresa.
const USUARIO = `(SELECT u.id FROM usuarios u WHERE u.empresaId = ${q(EMPRESA)} ORDER BY u.creadoEn LIMIT 1)`;
const NOMBRE = `(SELECT u.nombre FROM usuarios u WHERE u.empresaId = ${q(EMPRESA)} ORDER BY u.creadoEn LIMIT 1)`;

const sql = [];
sql.push(`-- Marcaciones y clima laboral de PRUEBA del 1 al 13 de octubre de 2026 para la empresa «Demo» de
-- producción con NIT 901123456 (${EMPRESA}, la de demo@horapro.co). Pedido del dueño el 14 de
-- octubre de 2026. NO es la otra «Demo» (NIT 2872837), que tiene el clima de septiembre.
--
-- Lo generó backend/prisma/generar-demo-clima-octubre.mjs, con semilla fija: no editarlo a mano.
-- Todo lo que agrega lleva «demooct-» en el id; el bloque BORRAR lo quita entero.
--
-- Qué agrega:
--   - Días esperados del 1 al 13 de octubre para las 6 personas de prueba (copiados de Samir), SOLO los
--     que les falten: si la aplicación ya los creó, no se tocan.
--   - ${marcas.length} marcaciones de los días hábiles del 1 al 13 (el 12 es festivo: solo Julián, como
--     FESTIVO), con salida al almuerzo. Son las salidas contra las que el panel mide «Respondieron».
--   - ${caritas.length} caritas con motivos y ${Object.keys(OBSERVACIONES).length} observaciones con nombre. Cada persona cuenta algo distinto
--     (carita por día, «-» sin responder, «F» falta): ${historia.join(' · ')}
--   - ${NOTAS.length} notas del buzón confidencial, con autor FALSO ('demo:sin-autor').
--   - 3 casos de seguimiento: Andrés EN SEGUIMIENTO (desde el ${desdeAndres}), Daniela SIN REVISAR (desde el
--     ${desdeDaniela}) y Valentina CERRADO (desde el ${desdeValentina}), con comentarios del primer usuario de la empresa.
`);
sql.push('-- ============================================================================');
sql.push('-- AGREGAR (un solo envío)');
sql.push('-- ============================================================================');
sql.push(`INSERT INTO dias_esperados (id, colaboradorId, fecha, programado, horaEntrada, horaSalida, toleranciaMin, almuerzoMin, minutosEsperados, horarioId, origen, creadoEn, actualizadoEn, toleranciaSalidaMin, ajustaEntrada, almuerzoInicio, almuerzoFin, descansos, plantillaId, esDescanso, descansoPintado) SELECT CONCAT('demooct-d-', SUBSTRING(c.id, 14, 2), '-', DATE_FORMAT(d.fecha, '%m%d')), c.id, d.fecha, d.programado, d.horaEntrada, d.horaSalida, d.toleranciaMin, d.almuerzoMin, d.minutosEsperados, d.horarioId, d.origen, '2026-10-14 12:00:00.000', '2026-10-14 12:00:00.000', d.toleranciaSalidaMin, d.ajustaEntrada, d.almuerzoInicio, d.almuerzoFin, d.descansos, d.plantillaId, d.esDescanso, d.descansoPintado FROM dias_esperados d CROSS JOIN colaboradores c WHERE d.colaboradorId = ${q(SAMIR)} AND d.fecha >= '2026-10-01 05:00:00.000' AND d.fecha < '2026-10-14 05:00:00.000' AND c.empresaId = ${q(EMPRESA)} AND c.id LIKE 'demosept-col-%' AND NOT EXISTS (SELECT 1 FROM dias_esperados x WHERE x.colaboradorId = c.id AND x.fecha = d.fecha);`);
sql.push(`INSERT INTO registros (id, colaboradorId, fecha, entrada, salida, tipo, salidaAlmuerzo) VALUES ${marcas.join(', ')};`);
sql.push(`INSERT INTO calificaciones_clima (id, empresaId, colaboradorId, fecha, carita, motivos, observacion, creadoEn, actualizadoEn) VALUES ${caritas.join(', ')};`);
sql.push(`INSERT INTO observaciones_confidenciales (id, empresaId, semana, visibleDesde, texto, autorCifrado) VALUES ${NOTAS.map(([s, v, t], i) => `('demooct-nota-${dosC(i + 1)}', ${q(EMPRESA)}, '${deMesDia(s)}', '${deMesDia(v)}', ${q(t)}, 'demo:sin-autor')`).join(', ')};`);
sql.push(`INSERT INTO seguimientos_clima (id, empresaId, colaboradorId, desde, estado, responsableId, abiertoEn, cerradoEn, actualizadoEn) SELECT 'demooct-s-02', ${q(EMPRESA)}, ${q(col('02'))}, '${medianoche(desdeAndres)}', 'EN_SEGUIMIENTO', ${USUARIO}, '${utc(9, 9, 12)}', NULL, '${utc(10, 16, 40)}' UNION ALL SELECT 'demooct-s-05', ${q(EMPRESA)}, ${q(col('05'))}, '${medianoche(desdeDaniela)}', 'SIN_REVISAR', NULL, '${utc(13, 18, 5)}', NULL, '${utc(13, 18, 5)}' UNION ALL SELECT 'demooct-s-03', ${q(EMPRESA)}, ${q(col('03'))}, '${medianoche(desdeValentina)}', 'CERRADO', ${USUARIO}, '${utc(5, 18, 30)}', '${utc(9, 11, 0)}', '${utc(9, 11, 0)}';`);
sql.push(`INSERT INTO comentarios_seguimiento_clima (id, seguimientoId, autorId, autorNombre, texto, creadoEn) SELECT 'demooct-k-01', 'demooct-s-02', ${USUARIO}, ${NOMBRE}, 'Hablé con Andrés: dice que lo están dejando solo en la bodega en las tardes.', '${utc(9, 9, 15)}' UNION ALL SELECT 'demooct-k-02', 'demooct-s-02', ${USUARIO}, ${NOMBRE}, 'Se le asignó un apoyo para descargar los martes y jueves. Revisar la próxima semana.', '${utc(10, 16, 40)}' UNION ALL SELECT 'demooct-k-03', 'demooct-s-03', ${USUARIO}, ${NOMBRE}, 'Valentina tuvo un roce con un compañero; se habló con los dos.', '${utc(6, 10, 0)}' UNION ALL SELECT 'demooct-k-04', 'demooct-s-03', ${USUARIO}, ${NOMBRE}, 'Ya está bien, sus últimas respuestas son buenas. Se cierra el caso.', '${utc(9, 11, 0)}';`);
sql.push('');
sql.push('-- ============================================================================');
sql.push('-- CONTAR (solo lectura)');
sql.push('-- ============================================================================');
sql.push(`SELECT (SELECT COUNT(*) FROM dias_esperados WHERE id LIKE 'demooct-d-%') AS dias, (SELECT COUNT(*) FROM registros WHERE id LIKE 'demooct-r-%') AS marcaciones, (SELECT COUNT(*) FROM calificaciones_clima WHERE id LIKE 'demooct-c-%') AS caritas, (SELECT COUNT(*) FROM calificaciones_clima WHERE id LIKE 'demooct-c-%' AND observacion IS NOT NULL) AS observaciones, (SELECT COUNT(*) FROM observaciones_confidenciales WHERE id LIKE 'demooct-nota-%') AS notas, (SELECT COUNT(*) FROM seguimientos_clima WHERE id LIKE 'demooct-s-%') AS casos, (SELECT COUNT(*) FROM comentarios_seguimiento_clima WHERE id LIKE 'demooct-k-%') AS comentarios;`);
sql.push('');
sql.push('-- ============================================================================');
sql.push('-- BORRAR TODO LO DE PRUEBA DE OCTUBRE (también los casos que la aplicación abra al ver el panel)');
sql.push('-- ============================================================================');
sql.push(`DELETE FROM comentarios_seguimiento_clima WHERE seguimientoId IN (SELECT id FROM seguimientos_clima WHERE empresaId = ${q(EMPRESA)} AND desde >= '2026-10-01 05:00:00.000');`);
sql.push(`DELETE FROM seguimientos_clima WHERE empresaId = ${q(EMPRESA)} AND desde >= '2026-10-01 05:00:00.000';`);
sql.push(`DELETE FROM observaciones_confidenciales WHERE id LIKE 'demooct-nota-%';`);
sql.push(`DELETE FROM calificaciones_clima WHERE id LIKE 'demooct-c-%';`);
sql.push(`DELETE FROM registros WHERE id LIKE 'demooct-r-%';`);
sql.push(`DELETE FROM dias_esperados WHERE id LIKE 'demooct-d-%';`);

writeFileSync(new URL('../../sql/demo-clima-octubre-901123456.sql', import.meta.url), sql.join('\n') + '\n');
console.log(`marcaciones ${marcas.length}, caritas ${caritas.length}, observaciones ${Object.keys(OBSERVACIONES).length}, notas ${NOTAS.length}`);
console.log(`rachas: Andrés desde ${desdeAndres}, Daniela desde ${desdeDaniela}, Valentina desde ${desdeValentina}`);
