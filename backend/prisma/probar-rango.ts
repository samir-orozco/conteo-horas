import { calcularHorasEsperadas } from '../src/utils/saldoTiempo';
import { rangoReporte } from '../src/utils/fechas';

// ¿Los días que se exigen son los correctos, o están corridos?
// Con un horario de UN solo día de la semana, el total revela qué día se contó.
// 1 jul 2026 = miércoles.

const soloDia = (dia: string): any => ({
  activo: true,
  almuerzoMin: 0,
  franjas: [{ dias: [dia], horaEntrada: '08:00', horaSalida: '09:00', tieneAlmuerzo: false }],
});

const { desdeF, finExclusivo } = rangoReporte('2026-07-01', '2026-07-01');
console.log('Rango de UN día: 1 jul 2026, que es MIÉRCOLES\n');
for (const dia of ['MARTES', 'MIERCOLES', 'JUEVES']) {
  const r = calcularHorasEsperadas(desdeF, finExclusivo, soloDia(dia), [], [], new Set(), () => 200);
  console.log(`  horario solo ${dia.padEnd(10)} → exige ${r.minutosEsperados} min ${r.minutosEsperados > 0 ? '  ← contó este día' : ''}`);
}

// Y el borde final: un rango que termina el jueves 2 no debe exigir el viernes 3.
const r2 = rangoReporte('2026-07-01', '2026-07-02');
console.log('\nRango 1 → 2 jul (mié y jue). No debe contar el viernes 3:');
for (const dia of ['MIERCOLES', 'JUEVES', 'VIERNES']) {
  const r = calcularHorasEsperadas(r2.desdeF, r2.finExclusivo, soloDia(dia), [], [], new Set(), () => 200);
  console.log(`  horario solo ${dia.padEnd(10)} → exige ${r.minutosEsperados} min ${r.minutosEsperados > 0 ? '  ← contó' : ''}`);
}
