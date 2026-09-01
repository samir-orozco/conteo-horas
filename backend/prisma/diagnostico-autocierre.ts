// SOLO LECTURA. Corre la MISMA decisión que el auto-cierre (`decidirCierre`)
// sobre los turnos abiertos de verdad y dice, uno por uno, si los cerraría y
// con qué hora. No escribe nada.
//
//   npx tsx prisma/diagnostico-autocierre.ts
//
// Sirve para comprobar el barrido sin esperar a que corra, y para entender por
// qué un turno concreto sigue abierto.
import { PrismaClient } from '@prisma/client';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';
import { decidirCierre } from '../src/utils/cierreTurnos';

const prisma = new PrismaClient();
const TZ = 'America/Bogota';
const DIAS = ['DOMINGO', 'LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO'];
const hb = (d: Date | null) => (d ? d.toLocaleString('es-CO', { timeZone: TZ }) : '—');

async function main() {
  const ahora = new Date();
  const z = toZonedTime(ahora, TZ);
  const inicioHoy = fromZonedTime(new Date(z.getFullYear(), z.getMonth(), z.getDate(), 0, 0, 0), TZ);
  console.log('ahora (Bogotá):    ', hb(ahora));
  console.log('medianoche de hoy: ', hb(inicioHoy));

  const todos = await prisma.registro.findMany({
    where: { entrada: { not: null }, salida: null },
    select: { id: true, salidaEstimada: true, entrada: true },
  });
  console.log(`\nturnos con entrada y sin salida: ${todos.length}`);
  console.log(`  de días pasados:            ${todos.filter(r => r.entrada! < inicioHoy).length}`);
  console.log(`  ya marcados salidaEstimada: ${todos.filter(r => r.salidaEstimada).length}`);

  const abiertos = await prisma.registro.findMany({
    where: { entrada: { not: null, lt: inicioHoy }, salida: null, salidaEstimada: false },
    select: {
      id: true, entrada: true,
      colaborador: {
        select: {
          nombre: true, apellido: true,
          horario: { select: { activo: true, franjas: { select: { dias: true, horaEntrada: true, horaSalida: true } } } },
        },
      },
    },
    orderBy: { entrada: 'desc' },
  });
  console.log(`\nentran al barrido: ${abiertos.length}`);

  let cerraria = 0;
  for (const r of abiertos) {
    const entrada = r.entrada!;
    const h = r.colaborador.horario;
    const d = decidirCierre({ entrada, horario: h }, ahora);
    const dia = DIAS[toZonedTime(entrada, TZ).getDay()];
    console.log(`\n- ${r.colaborador.nombre} ${r.colaborador.apellido} | entrada ${hb(entrada)} (${dia})`);
    console.log(`  horario: ${h ? `activo=${h.activo} · ${h.franjas.map(f => `${(f.dias as string[]).join('/')} ${f.horaEntrada}-${f.horaSalida}`).join(' | ')}` : 'SIN HORARIO'}`);
    if (d.cerrar) {
      cerraria++;
      console.log(`  => CERRARÍA ${d.salida ? `con salida ${hb(d.salida)} (franja ${d.horaFranja})` : 'SIN hora (la pone el admin)'}`);
    } else {
      const horas = (ahora.getTime() - entrada.getTime()) / 3600000;
      console.log(`  => todavía no. Lleva ${horas.toFixed(1)}h abierto${h?.activo ? ' (sigue en su gracia de 2h)' : ' (sin franja: espera 16h)'}`);
    }
  }
  console.log(`\n=> cerraría ${cerraria} de ${abiertos.length}`);
}

main()
  .catch(e => { console.error('EXPLOTÓ:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
