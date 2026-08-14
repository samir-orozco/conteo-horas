/**
 * Qué le responde el SERVIDOR EN MARCHA al kiosco sobre una persona.
 *
 * Los otros scripts miran la base de datos. Este llama al endpoint real
 * (`GET /api/worker/estado`), que es exactamente lo que el kiosco pregunta antes
 * de decidir si muestra "Salgo a almorzar". Si la base dice una cosa y el
 * servidor otra, aquí se ve.
 *
 * Firma un token de colaborador con el mismo JWT_SECRET de la aplicación, así
 * que no hace falta la cédula en el kiosco ni reconocimiento facial. Solo lee:
 * ninguna llamada de este script crea ni modifica marcaciones.
 *
 * [EN EL SERVIDOR]
 *   source ~/nodevenv/horapro-co-api/22/bin/activate
 *   cp ~/horapro-repo/deploy-backend/ver-estado-kiosco.cjs ~/horapro-co-api/
 *   cd ~/horapro-co-api && set -a && . ./.env && set +a && node ver-estado-kiosco.cjs 123123123123
 */
const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const API = process.env.FRONTEND_ORIGIN
  ? `${process.env.FRONTEND_ORIGIN.replace(/\/$/, '')}/api`
  : 'https://horapro.co/api';

// HS256 a mano para no depender de qué librería de JWT esté instalada.
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
function firmar(payload, secreto, segundos = 3600) {
  const ahora = Math.floor(Date.now() / 1000);
  const cabeza = b64({ alg: 'HS256', typ: 'JWT' });
  const cuerpo = b64({ ...payload, iat: ahora, exp: ahora + segundos });
  const firma = crypto.createHmac('sha256', secreto).update(`${cabeza}.${cuerpo}`).digest('base64url');
  return `${cabeza}.${cuerpo}.${firma}`;
}

async function main() {
  const cedula = (process.argv[2] || '').trim();
  if (!cedula) { console.log('\nFalta la cédula.\n  node ver-estado-kiosco.cjs 123123123123\n'); return; }
  if (!process.env.JWT_SECRET) { console.log('\nNo hay JWT_SECRET en el entorno. ¿Cargaste el .env?\n'); return; }

  const col = await prisma.colaborador.findFirst({
    where: { cedula, activo: true },
    include: { empresa: { select: { nombre: true } } },
  });
  if (!col) { console.log(`\nNo hay colaborador activo con cédula "${cedula}".\n`); return; }

  const token = firmar({
    id: col.id, cedula: col.cedula, nombre: col.nombre, apellido: col.apellido,
    rol: 'WORKER', empresaId: col.empresaId,
  }, process.env.JWT_SECRET);

  console.log(`\n${col.empresa.nombre} · ${col.nombre} ${col.apellido}`);
  console.log(`Preguntando a ${API}/worker/estado ...\n`);

  let r, cuerpo;
  try {
    r = await fetch(`${API}/worker/estado`, { headers: { Authorization: `Bearer ${token}` } });
    cuerpo = await r.text();
  } catch (e) {
    console.log('  No se pudo llamar a la API:', e.message);
    console.log('  ¿La aplicación está arriba? Prueba: curl -s ' + API + '/health\n');
    return;
  }

  if (!r.ok) {
    console.log(`  El servidor respondió ${r.status}: ${cuerpo.slice(0, 200)}`);
    if (r.status === 401) console.log('  Un 401 aquí suele significar que el JWT_SECRET cargado no es el de la app.');
    console.log('');
    return;
  }

  let e;
  try { e = JSON.parse(cuerpo); } catch { console.log('  Respuesta no entendible:', cuerpo.slice(0, 200)); return; }

  console.log('  RESPUESTA DEL SERVIDOR:');
  console.log('    dentroAhora      ', e.dentroAhora);
  console.log('    almuerzo         ', e.almuerzo ? `${e.almuerzo.inicio}–${e.almuerzo.fin}` : 'null');
  console.log('    enAlmuerzo       ', e.enAlmuerzo);
  console.log('    regresoSugerido  ', e.regresoSugerido ?? 'null');
  console.log('    turnoCerradoHoy  ', e.turnoCerradoHoy ? 'sí' : 'no');

  const tieneElCampo = Object.prototype.hasOwnProperty.call(e, 'almuerzo');
  console.log('\n  QUÉ VA A HACER EL KIOSCO:');
  if (!tieneElCampo) {
    console.log('    ✗ La respuesta NI SIQUIERA TRAE el campo `almuerzo`: el proceso que está');
    console.log('      corriendo es el backend VIEJO. Reinicia la app desde cPanel →');
    console.log('      Setup Node.js App → Restart, aunque el dist/ ya esté actualizado.');
  } else if (e.dentroAhora && e.almuerzo) {
    console.log('    ✓ Al presionar "Registrar Salida" va a preguntar si sale a almorzar.');
  } else if (e.enAlmuerzo) {
    console.log('    · Está EN su almuerzo. El botón dice "Volví del almuerzo".');
  } else if (!e.dentroAhora) {
    console.log('    · No tiene turno abierto, así que el botón dice "Registrar Entrada" y no');
    console.log('      pregunta nada. La pregunta sale SIEMPRE en la segunda marcación:');
    console.log('      primero entrada, y al marcar la salida es cuando pregunta.');
  } else if (!e.almuerzo) {
    console.log('    · Tiene turno abierto pero el servidor no ofrece almuerzo. O ya lo marcó');
    console.log('      en las últimas 18 horas, o el día del turno abierto no tiene ventana');
    console.log('      (ojo: si abrió el turno AYER, manda el día de ayer, no el de hoy).');
  }
  console.log('');
}

main()
  .catch(e => console.error('\nFalló:', e.message, '\n'))
  .finally(() => prisma.$disconnect());
