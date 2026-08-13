// Diferencial del almuerzo: ¿a quién se le movió el descuento con esta rama?
//
// El cambio de fondo no es la ventana horaria (esa es opt-in). Es que el
// almuerzo pasó a leerse del día CONGELADO en vez del horario vigente:
//
//   antes:  almuerzoDelRegistro(horarioActual, fecha)   → el horario de HOY
//   ahora:  minutosAlmuerzoADescontar(tramos, diaEsperado) → lo de ESE día
//
// Sin ventana los dos deberían dar lo mismo, salvo que alguien haya cambiado el
// horario después de que el día se congelara. Este script recorre TODOS los días
// materializados con marcaciones y compara los dos caminos día por día.
//
// Cero diferencias = ningún reporte ya emitido se mueve.
import { prisma } from '../src/prisma';
import { minutosAlmuerzoADescontar } from '../src/utils/almuerzo';
import { franjaDelDia, DIAS_SEMANA, HorarioConFranjas } from '../src/utils/tardanzas';
import { toZonedTime } from 'date-fns-tz';

const TZ = 'America/Bogota';

// El camino VIEJO, copiado tal cual de master (reportes.ts:30-35).
function almuerzoViejo(horario: HorarioConFranjas | null | undefined, fecha: Date): number {
  if (!horario || !(horario as any).almuerzoMin) return 0;
  const z = toZonedTime(fecha, TZ);
  const franja = franjaDelDia(horario, DIAS_SEMANA[z.getDay()]);
  return franja && (franja as any).tieneAlmuerzo ? (horario as any).almuerzoMin : 0;
}

const claveDia = (d: Date) => {
  const z = toZonedTime(d, TZ);
  return `${z.getFullYear()}-${z.getMonth() + 1}-${z.getDate()}`;
};

async function main() {
  const colaboradores = await prisma.colaborador.findMany({
    include: { horario: { include: { franjas: true } }, empresa: { select: { nombre: true } } },
  });

  let diasMirados = 0, diferencias = 0, conVentana = 0;
  const detalle: string[] = [];
  // Minutos que se le devuelven (o se le quitan) a cada persona por mes.
  const impacto = new Map<string, number>();

  for (const col of colaboradores) {
    const [registros, dias] = await Promise.all([
      prisma.registro.findMany({
        where: { colaboradorId: col.id, entrada: { not: null }, salida: { not: null } },
        select: { entrada: true, salida: true },
      }),
      prisma.diaEsperado.findMany({ where: { colaboradorId: col.id } }),
    ]);
    if (registros.length === 0) continue;

    const tramosPorDia = new Map<string, { entrada: Date; salida: Date }[]>();
    for (const r of registros) {
      const k = claveDia(r.entrada!);
      if (!tramosPorDia.has(k)) tramosPorDia.set(k, []);
      tramosPorDia.get(k)!.push({ entrada: r.entrada!, salida: r.salida! });
    }
    const diaPorClave = new Map(dias.map(d => [claveDia(d.fecha), d]));

    for (const [k, tramos] of tramosPorDia) {
      const d = diaPorClave.get(k);
      if (!d) continue; // sin fila, los dos caminos usan el horario vigente
      diasMirados++;
      if (d.almuerzoInicio && d.almuerzoFin) { conVentana++; continue; }

      const ahora = minutosAlmuerzoADescontar(tramos, d);
      const antes = almuerzoViejo(col.horario as any, tramos[0].entrada);
      if (ahora !== antes) {
        diferencias++;
        // Menos descuento = más tiempo contado a favor del trabajador.
        const z = toZonedTime(tramos[0].entrada, TZ);
        const mes = `${col.empresa.nombre} · ${col.nombre} ${col.apellido} · ${z.getFullYear()}-${String(z.getMonth() + 1).padStart(2, '0')}`;
        impacto.set(mes, (impacto.get(mes) ?? 0) + (antes - ahora));
        if (detalle.length < 6) {
          detalle.push(`  ${col.empresa.nombre} · ${col.nombre} ${col.apellido} · ${k}: antes ${antes} min → ahora ${ahora} min`);
        }
      }
    }
  }

  console.log(`Días con marcaciones y fila congelada, SIN ventana: ${diasMirados - conVentana}`);
  console.log(`Días con ventana (comportamiento nuevo a propósito): ${conVentana}`);
  console.log(`\nDIFERENCIAS en el descuento de almuerzo: ${diferencias}`);
  if (detalle.length) {
    console.log('\nEjemplos:');
    detalle.forEach(l => console.log(l));
    console.log('\nImpacto por persona y mes (+ = se le cuenta MÁS tiempo que antes):');
    for (const [quien, min] of [...impacto].sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))) {
      const signo = min > 0 ? '+' : '';
      console.log(`  ${quien}: ${signo}${(min / 60).toFixed(1)} h  (${signo}${min} min)`);
    }
  } else {
    console.log('Ningún día sin ventana cambia de descuento.');
  }
}

main().finally(() => prisma.$disconnect());
