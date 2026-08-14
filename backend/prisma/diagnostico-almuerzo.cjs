/**
 * ¿Por qué el kiosco no ofrece marcar el almuerzo?
 *
 * Responde con datos en vez de suposiciones. Mira tres cosas, en el orden en que
 * pueden fallar:
 *
 *   1. ¿El HORARIO tiene la ventana configurada? (Configuración → Horario)
 *   2. ¿El DÍA de cada colaborador la tiene CONGELADA? El día en curso se
 *      congela antes de que el admin lo cambie, así que configurar hoy aplica
 *      desde mañana — a propósito: mover el día de hoy cambiaría lo que ya se
 *      liquidó.
 *   3. ¿Ya marcó su almuerzo hoy? Después de marcarlo, el kiosco no vuelve a
 *      preguntar.
 *
 * Solo lee, no escribe nada.
 *
 * [EN EL SERVIDOR]
 *   source ~/nodevenv/horapro-co-api/22/bin/activate
 *   cp ~/horapro-repo/deploy-backend/diagnostico-almuerzo.cjs ~/horapro-co-api/
 *   cd ~/horapro-co-api && set -a && . ./.env && set +a && node diagnostico-almuerzo.cjs
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const MS_DIA = 24 * 60 * 60 * 1000;
// Bogotá es UTC-5 fijo: la medianoche local son las 05:00 UTC.
const medianocheBogota = (d = new Date()) => {
  const z = new Date(d.getTime() - 5 * 3600e3);
  return new Date(Date.UTC(z.getUTCFullYear(), z.getUTCMonth(), z.getUTCDate(), 5, 0, 0));
};
const fmt = (d) => d.toISOString().slice(0, 10);

async function ventanaDelDia(colaboradorId, fecha) {
  const d = await prisma.diaEsperado.findFirst({
    where: { colaboradorId, fecha: { gte: fecha, lt: new Date(fecha.getTime() + MS_DIA) } },
    select: { almuerzoInicio: true, almuerzoFin: true, programado: true },
  });
  if (!d) return '(sin fila para ese día)';
  if (!d.programado) return 'no trabaja ese día';
  return d.almuerzoInicio && d.almuerzoFin ? `${d.almuerzoInicio}–${d.almuerzoFin}` : 'SIN VENTANA';
}

async function main() {
  const hoy = medianocheBogota();
  const manana = new Date(hoy.getTime() + MS_DIA);

  const horarios = await prisma.horario.findMany({
    where: { activo: true },
    include: { franjas: true, empresa: { select: { nombre: true } } },
  });

  console.log('\n═══ 1. LOS HORARIOS ═══');
  for (const h of horarios) {
    const conVentana = h.franjas.filter(f => f.almuerzoInicio && f.almuerzoFin);
    const marca = conVentana.length > 0 ? '✓ que marquen' : '· solo descontar';
    console.log(`  ${marca}  ${h.empresa.nombre} · "${h.nombre}"  (almuerzoMin ${h.almuerzoMin})`);
    for (const f of h.franjas) {
      const v = f.almuerzoInicio && f.almuerzoFin ? `${f.almuerzoInicio}–${f.almuerzoFin}` : (f.tieneAlmuerzo ? 'sin horas' : 'no descuenta');
      console.log(`        ${f.horaEntrada}-${f.horaSalida}  ${v}`);
    }
  }

  console.log('\n═══ 2. LO QUE VE EL KIOSCO HOY Y MAÑANA ═══');
  const cols = await prisma.colaborador.findMany({
    where: { activo: true, horarioId: { not: null } },
    include: { empresa: { select: { nombre: true } } },
    orderBy: { nombre: 'asc' },
  });
  for (const c of cols) {
    const vHoy = await ventanaDelDia(c.id, hoy);
    const vMan = await ventanaDelDia(c.id, manana);
    const yaAlmorzo = await prisma.registro.count({
      where: { colaboradorId: c.id, salidaAlmuerzo: true, salida: { gte: new Date(Date.now() - 18 * 3600e3) } },
    });
    const puedeHoy = /–/.test(vHoy) && yaAlmorzo === 0;
    console.log(`  ${puedeHoy ? '✓' : '·'} ${c.empresa.nombre} · ${c.nombre} ${c.apellido}`);
    console.log(`      hoy ${fmt(hoy)}: ${vHoy}${yaAlmorzo ? '  (ya marcó su almuerzo)' : ''}`);
    console.log(`      mañana ${fmt(manana)}: ${vMan}`);
  }

  console.log('\n═══ QUÉ SIGNIFICA ═══');
  console.log('  El kiosco solo pregunta a quien tenga una VENTANA en el día de HOY.');
  console.log('  Si hoy dice SIN VENTANA y mañana sí la tiene, está bien: configurar');
  console.log('  el horario aplica desde el día siguiente, para no mover lo que ya');
  console.log('  se liquidó del día en curso.');
  console.log('  Si mañana TAMBIÉN dice SIN VENTANA, entonces el horario no quedó');
  console.log('  guardado con "Que marquen su almuerzo" (mira el bloque 1).\n');
}

main()
  .catch(e => console.error('Falló el diagnóstico:', e.message))
  .finally(() => prisma.$disconnect());
