/**
 * ¿Clasificar las horas extra con el horario VIVO da algo distinto que con el
 * día CONGELADO?
 *
 * El reporte usa el día congelado para casi todo, pero `construirExtraConfig`
 * arma el mapa de franjas leyendo `colaborador.horario` —el de HOY—. Si el
 * horario cambió durante el período, un reporte de un mes viejo clasifica sus
 * extras con una franja que entonces no existía, y el mismo mes liquidado
 * devuelve otro número.
 *
 * Esto NO arregla nada. Solo mide si el fallo muerde con datos reales, antes de
 * tocar el motor. Es de SOLO LECTURA: ninguna consulta escribe.
 *
 * [EN EL SERVIDOR]
 *   source ~/nodevenv/horapro-co-api/22/bin/activate
 *   cp ~/horapro-repo/deploy-backend/medir-extras.cjs ~/horapro-co-api/
 *   cd ~/horapro-co-api && set -a && . ./.env && set +a && node medir-extras.cjs "Luciana" 2026-07-01 2026-08-14
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const DIAS = ['DOMINGO', 'LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO'];
const MS_DIA = 24 * 60 * 60 * 1000;
const medianoche = (s) => new Date(`${s}T05:00:00.000Z`); // medianoche de Bogotá
const diaSemana = (d) => DIAS[new Date(d.getTime() + 12 * 3600e3 - 5 * 3600e3).getUTCDay()];
const fmt = (d) => d.toISOString().slice(0, 10);

async function main() {
  const [nombre, desde, hasta] = process.argv.slice(2);
  if (!nombre || !desde || !hasta) {
    console.log('\n  node medir-extras.cjs "Luciana" 2026-07-01 2026-08-14\n');
    return;
  }

  const col = await prisma.colaborador.findFirst({
    where: { nombre: { contains: nombre } },
    include: { empresa: { select: { id: true, nombre: true } }, horario: { include: { franjas: true } } },
  });
  if (!col) { console.log(`\n  No hay ningún colaborador cuyo nombre contenga "${nombre}".\n`); return; }

  console.log(`\n${col.empresa.nombre} · ${col.nombre} ${col.apellido}`);
  console.log(`Período ${desde} a ${hasta}\n`);

  // 1. ¿Este fallo puede siquiera morder aquí?
  const cfg = await prisma.configuracion.findUnique({
    where: { empresaId_clave: { empresaId: col.empresaId, clave: 'HORAS_EXTRA_MODO' } },
    select: { valor: true },
  });
  const modo = cfg?.valor === 'HORARIO' ? 'HORARIO' : 'SEMANAL';
  console.log(`Modo de horas extra: ${modo}`);
  if (modo !== 'HORARIO') {
    console.log('\n  En SEMANAL el horario NI SE MIRA para clasificar extras.');
    console.log('  Este fallo no le afecta a esta empresa.\n');
    return;
  }

  if (!col.horario) { console.log('\n  Sin horario activo: el helper cae a SEMANAL. No le afecta.\n'); return; }
  console.log(`Horario vigente HOY: "${col.horario.nombre}"`);
  for (const f of col.horario.franjas) {
    console.log(`   ${(f.dias || []).join(',')}  ${f.horaEntrada}-${f.horaSalida}  tolerancia ${col.horario.toleranciaMin ?? 0} min`);
  }

  // 2. El día congelado contra el horario vivo, día por día.
  const ini = medianoche(desde);
  const fin = new Date(medianoche(hasta).getTime() + MS_DIA);
  const dias = await prisma.diaEsperado.findMany({
    where: { colaboradorId: col.id, fecha: { gte: ini, lt: fin } },
    orderBy: { fecha: 'asc' },
    select: { fecha: true, programado: true, horaEntrada: true, horaSalida: true, toleranciaMin: true, creadoEn: true },
  });

  const franjaViva = (fecha) => {
    const d = diaSemana(fecha);
    const f = col.horario.franjas.find(x => (x.dias || []).includes(d));
    return f ? { entrada: f.horaEntrada, salida: f.horaSalida } : null;
  };

  console.log(`\n${dias.length} días congelados en el período.\n`);
  const distintos = [];
  let sinFila = 0;
  for (let t = ini.getTime(); t < fin.getTime(); t += MS_DIA) {
    const fecha = new Date(t);
    const cong = dias.find(d => Math.abs(d.fecha.getTime() - t) < MS_DIA / 2);
    if (!cong) { sinFila++; continue; }
    const viva = franjaViva(fecha);
    const a = cong.programado ? `${cong.horaEntrada}-${cong.horaSalida}` : 'no programado';
    const b = viva ? `${viva.entrada}-${viva.salida}` : 'no programado';
    if (a !== b) distintos.push({ fecha: fmt(fecha), congelado: a, vivo: b, creadoEn: fmt(cong.creadoEn) });
  }

  if (sinFila > 0) console.log(`  (${sinFila} días del rango no tienen fila congelada: esos caen al horario vigente por diseño)`);

  if (distintos.length === 0) {
    console.log('\n  ✓ NINGÚN día difiere: el congelado y el vivo dicen lo mismo.');
    console.log('    El horario no cambió durante el período, así que arreglar esto');
    console.log('    NO movería ni un peso de este reporte. El fallo está latente,');
    console.log('    esperando al primer cambio de horario.\n');
  } else {
    console.log(`\n  ✗ ${distintos.length} DÍAS DIFIEREN. En esos, el reporte clasifica sus extras`);
    console.log('    contra una franja que ese día no existía:\n');
    console.log('    fecha        congelado        horario de hoy   (fila creada)');
    for (const d of distintos.slice(0, 40)) {
      console.log(`    ${d.fecha}   ${d.congelado.padEnd(16)} ${d.vivo.padEnd(16)} ${d.creadoEn}`);
    }
    if (distintos.length > 40) console.log(`    ... y ${distintos.length - 40} más`);
    console.log('');
  }

  // 3. Cuánto de lo trabajado cae en la zona de desacuerdo.
  const regs = await prisma.registro.findMany({
    where: { colaboradorId: col.id, fecha: { gte: ini, lt: fin }, entrada: { not: null }, salida: { not: null } },
    select: { fecha: true, entrada: true, salida: true },
  });
  const enDiasDistintos = regs.filter(r => distintos.some(d => d.fecha === fmt(r.fecha)));
  const minutos = enDiasDistintos.reduce((s, r) => s + (r.salida - r.entrada) / 60000, 0);
  console.log(`Marcaciones del período: ${regs.length}`);
  console.log(`De ellas, en días que difieren: ${enDiasDistintos.length}  (${(minutos / 60).toFixed(1)} h trabajadas)`);
  console.log(distintos.length === 0
    ? '\n→ Sin impacto medible en este colaborador.\n'
    : '\n→ Ese es el tiempo cuya clasificación en ordinaria/extra puede cambiar.\n');
}

main().catch(e => console.error('\nFalló:', e.message, '\n')).finally(() => prisma.$disconnect());
