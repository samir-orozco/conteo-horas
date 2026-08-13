/**
 * Diferencial del almuerzo, versión para el servidor.
 *
 * Mismo cálculo que `diferencial-almuerzo.ts`, pero en JavaScript plano y sin
 * más dependencia que `@prisma/client`, que ya está instalado en la app. En el
 * hosting no hay `ts-node` ni `node_modules` en el repo, y compilar en el
 * CloudLinux del servidor da problemas.
 *
 * Responde una sola pregunta, la que hay que responder ANTES de desplegar:
 * ¿a quién se le mueve el descuento de almuerzo con la versión nueva?
 *
 * El cambio no es la ventana horaria (esa es opt-in y nadie la tiene todavía).
 * Es que el almuerzo pasa a leerse del día CONGELADO en vez del horario vigente:
 *
 *   antes:  el almuerzo del horario que la persona tiene HOY
 *   ahora:  el que su horario pedía ESE día
 *
 * Los dos coinciden salvo que alguien haya cambiado un horario después de que
 * esos días se congelaran. Donde no coinciden, el reporte de ese mes cambia.
 *
 * Uso (dentro del entorno de Node de cPanel):
 *   source ~/nodevenv/horapro-co-api/22/bin/activate
 *   cd ~/horapro-co-api && node diferencial-almuerzo.cjs
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const MS_MIN = 60000;
const UN_DIA_MS = 24 * 60 * 60 * 1000;
const DIAS_SEMANA = ['DOMINGO', 'LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO'];

// Colombia es UTC-5 fijo, sin horario de verano: restar 5 h da la hora de Bogotá.
const aBogota = (d) => new Date(d.getTime() - 5 * 60 * 60 * 1000);
const claveDia = (d) => {
  const z = aBogota(d);
  return `${z.getUTCFullYear()}-${z.getUTCMonth() + 1}-${z.getUTCDate()}`;
};
const mesDe = (d) => {
  const z = aBogota(d);
  return `${z.getUTCFullYear()}-${String(z.getUTCMonth() + 1).padStart(2, '0')}`;
};
const minutosDe = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

// ── El camino VIEJO: el almuerzo sale del horario que la persona tiene HOY ────
function almuerzoViejo(horario, fecha) {
  if (!horario || !horario.almuerzoMin) return 0;
  const z = aBogota(fecha);
  const franja = (horario.franjas || []).find(f => (f.dias || []).includes(DIAS_SEMANA[z.getUTCDay()]));
  return franja && franja.tieneAlmuerzo ? horario.almuerzoMin : 0;
}

// ── El camino NUEVO: los minutos de la ventana en que estuvo marcado ──────────
function solape(aIni, aFin, bIni, bFin) {
  return Math.max(0, Math.min(aFin, bFin) - Math.max(aIni, bIni)) / MS_MIN;
}
function almuerzoNuevo(tramos, dia) {
  if (!dia.almuerzoInicio || !dia.almuerzoFin) return dia.almuerzoMin;
  if (tramos.length === 0) return 0;
  const inicio = dia.fecha.getTime() + minutosDe(dia.almuerzoInicio) * MS_MIN;
  let fin = dia.fecha.getTime() + minutosDe(dia.almuerzoFin) * MS_MIN;
  if (fin <= inicio) fin += UN_DIA_MS;
  const cruza = (i, f) => tramos.reduce((s, t) => s + solape(t.entrada.getTime(), t.salida.getTime(), i, f), 0);
  return Math.round(cruza(inicio, fin) + cruza(inicio + UN_DIA_MS, fin + UN_DIA_MS));
}

async function main() {
  const colaboradores = await prisma.colaborador.findMany({
    include: { horario: { include: { franjas: true } }, empresa: { select: { nombre: true } } },
  });

  let sinVentana = 0, conVentana = 0, diferencias = 0;
  const impacto = new Map();
  const ejemplos = [];

  for (const col of colaboradores) {
    const [registros, dias] = await Promise.all([
      prisma.registro.findMany({
        where: { colaboradorId: col.id, entrada: { not: null }, salida: { not: null } },
        select: { entrada: true, salida: true },
      }),
      prisma.diaEsperado.findMany({ where: { colaboradorId: col.id } }),
    ]);
    if (registros.length === 0) continue;

    const tramosPorDia = new Map();
    for (const r of registros) {
      const k = claveDia(r.entrada);
      if (!tramosPorDia.has(k)) tramosPorDia.set(k, []);
      tramosPorDia.get(k).push({ entrada: r.entrada, salida: r.salida });
    }
    const diaPorClave = new Map(dias.map(d => [claveDia(d.fecha), d]));

    for (const [k, tramos] of tramosPorDia) {
      const d = diaPorClave.get(k);
      if (!d) continue; // sin fila congelada, los dos caminos usan el horario vigente
      if (d.almuerzoInicio && d.almuerzoFin) { conVentana++; continue; }
      sinVentana++;

      const ahora = almuerzoNuevo(tramos, d);
      const antes = almuerzoViejo(col.horario, tramos[0].entrada);
      if (ahora === antes) continue;

      diferencias++;
      const quien = `${col.empresa.nombre} · ${col.nombre} ${col.apellido} · ${mesDe(tramos[0].entrada)}`;
      impacto.set(quien, (impacto.get(quien) || 0) + (antes - ahora));
      if (ejemplos.length < 6) ejemplos.push(`  ${col.nombre} ${col.apellido} · ${k}: antes ${antes} min → ahora ${ahora} min`);
    }
  }

  console.log('');
  console.log(`Días con marcaciones y fila congelada, SIN ventana: ${sinVentana}`);
  console.log(`Días con ventana configurada: ${conVentana}`);
  console.log('');
  console.log(`DIFERENCIAS en el descuento de almuerzo: ${diferencias}`);

  if (diferencias === 0) {
    console.log('');
    console.log('Ningún reporte ya emitido se mueve. Puedes seguir con el despliegue.');
    return;
  }

  console.log('');
  ejemplos.forEach(l => console.log(l));
  console.log('');
  console.log('Impacto por persona y mes (+ = se le cuenta MÁS tiempo que antes):');
  for (const [quien, min] of [...impacto].sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))) {
    const signo = min > 0 ? '+' : '';
    console.log(`  ${quien}: ${signo}${(min / 60).toFixed(1)} h  (${signo}${min} min)`);
  }
  console.log('');
  console.log('Estos meses cambian de resultado. Revísalos ANTES de desplegar.');
}

main()
  .catch(e => { console.error('Falló la diferencial:', e.message); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
