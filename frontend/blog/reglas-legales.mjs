// Las reglas laborales que se publican en el sitio: jornada legal por fecha
// (Ley 2101 de 2021) y factores de recargo por fecha (CST + Ley 2466 de 2025).
//
// Esto duplica a propósito lo que `backend/prisma/seed.ts` siembra en la base.
// No hay forma limpia de evitarlo: el generador del blog es Node puro, corre en
// la compilación y no puede leer TypeScript ni conectarse a la base de datos.
//
// Para que las dos copias no se separen en silencio, que es lo que pasaría el
// día que cambie la ley, hay una prueba en el backend
// (`src/utils/reglasLegales.test.ts`) que compara este archivo contra el seed y
// falla si difieren en un solo factor. Si tocas uno, toca el otro, o la suite
// te lo dice antes de que salga publicado un número equivocado.

// ===== Jornada máxima semanal, Ley 2101 de 2021 (48 a 42 horas, gradual) =====
export const JORNADAS = [
  { desde: '2023-07-15', horas: 47 },
  { desde: '2024-07-15', horas: 46 },
  { desde: '2025-07-15', horas: 44 },
  { desde: '2026-07-15', horas: 42 },
];

// ===== Períodos de recargos =====
// Lo único que cambia entre períodos son dos números: a qué hora empieza la
// jornada nocturna y cuánto se recarga el dominical. Todo lo demás se deriva.
export const PERIODOS = [
  { desde: '2025-07-01', hasta: '2025-12-25', inicioNocturna: 21, recargoDom: 0.80 },
  { desde: '2025-12-25', hasta: '2026-07-01', inicioNocturna: 19, recargoDom: 0.80 },
  { desde: '2026-07-01', hasta: '2027-07-01', inicioNocturna: 19, recargoDom: 0.90 },
  { desde: '2027-07-01', hasta: null, inicioNocturna: 19, recargoDom: 1.00 },
];

export const FIN_NOCTURNA = 6;

// Los ocho tipos de hora del período, con el mismo código y el mismo factor que
// el seed le pone a la base. El orden también se conserva: la prueba compara
// posición por posición.
export function tiposDelPeriodo({ inicioNocturna, recargoDom }) {
  const d = FIN_NOCTURNA;
  return [
    { codigo: 'HOD', nombre: 'Hora Ordinaria Diurna', horaInicio: d, horaFin: inicioNocturna, recargo: 1.0, dominical: false },
    { codigo: 'HON', nombre: 'Hora Ordinaria Nocturna', horaInicio: inicioNocturna, horaFin: d, recargo: 1.35, dominical: false },
    { codigo: 'HED', nombre: 'Hora Extra Diurna', horaInicio: d, horaFin: inicioNocturna, recargo: 1.25, dominical: false },
    { codigo: 'HEN', nombre: 'Hora Extra Nocturna', horaInicio: inicioNocturna, horaFin: d, recargo: 1.75, dominical: false },
    { codigo: 'HDD', nombre: 'Hora Diurna Dominical/Festivo', horaInicio: d, horaFin: inicioNocturna, recargo: 1 + recargoDom, dominical: true },
    { codigo: 'HND', nombre: 'Hora Nocturna Dominical/Festivo', horaInicio: inicioNocturna, horaFin: d, recargo: 1 + recargoDom + 0.35, dominical: true },
    { codigo: 'HEDD', nombre: 'Hora Extra Diurna Dominical/Festivo', horaInicio: d, horaFin: inicioNocturna, recargo: 1 + recargoDom + 0.25, dominical: true },
    { codigo: 'HEND', nombre: 'Hora Extra Nocturna Dominical/Festivo', horaInicio: inicioNocturna, horaFin: d, recargo: 1 + recargoDom + 0.75, dominical: true },
  ];
}

// ===== Consultas por fecha =====
// Las fechas se comparan como texto "YYYY-MM-DD". Suena burdo, pero es lo
// correcto aquí: son fechas de calendario colombiano, no instantes, y compararlas
// como texto evita por completo el lío de husos horarios que en este proyecto ya
// ha desplazado fechas un día.

export function jornadaVigente(iso) {
  const aplicables = JORNADAS.filter(j => j.desde <= iso);
  return aplicables.length ? aplicables[aplicables.length - 1].horas : 42;
}

export function periodoVigente(iso) {
  return PERIODOS.find(p => p.desde <= iso && (!p.hasta || iso < p.hasta)) ?? PERIODOS[PERIODOS.length - 1];
}

// Divisor mensual: jornada semanal por 30 y dividido entre 6, que es la
// convención de Mintrabajo y se reduce a multiplicar por cinco.
// 44 horas dan 220; 42 horas dan 210.
export const horasMes = jornada => jornada * 5;

export const valorHora = (salarioMensual, jornada) => salarioMensual / horasMes(jornada);

// Etiqueta legible del horario nocturno, para no repetir el formateo en cada sitio.
export const franjaNocturna = inicioNocturna =>
  `${inicioNocturna > 12 ? inicioNocturna - 12 : inicioNocturna}:00 p.m. a ${FIN_NOCTURNA}:00 a.m.`;

// La foto completa de una fecha: lo que hay que saber para calcular una nómina
// ese día.
export function reglasEn(iso) {
  const jornada = jornadaVigente(iso);
  const periodo = periodoVigente(iso);
  return {
    fecha: iso,
    jornada,
    horasMes: horasMes(jornada),
    inicioNocturna: periodo.inicioNocturna,
    recargoDom: periodo.recargoDom,
    tipos: tiposDelPeriodo(periodo),
  };
}

// Semanas de un mes, en la convención de nómina colombiana. No son 4,33: la
// convención de Mintrabajo toma el mes de 30 días y la semana de 6 días
// laborales, así que 30/6 da 5. Es la misma cuenta de la que sale el divisor de
// horas mensuales (jornada × 30/6 = jornada × 5), y usarla aquí mantiene ambos
// cálculos coherentes entre sí.
export const SEMANAS_MES = 5;

// Horas extra semanales de alguien que trabaja `horasSemana` bajo una jornada
// legal dada. Nunca es negativo: quien trabaja menos de la jornada no genera un
// crédito, simplemente no genera extras.
export const extrasSemanales = (horasSemana, jornada) => Math.max(0, horasSemana - jornada);

// Lo que cuestan al mes esas extras, para una persona.
export function costoExtrasMes({ salario, jornada, horasSemana, factor }) {
  return extrasSemanales(horasSemana, jornada) * SEMANAS_MES * valorHora(salario, jornada) * factor;
}

// Tope legal de horas extra: 2 al día y 12 a la semana (art. 167 CST). No lo
// cambió la reforma, y es lo que convierte "pago extras" en una salida con
// techo: pasado ese punto no es un asunto de plata, es una infracción.
export const TOPE_EXTRAS_SEMANA = 12;
export const TOPE_EXTRAS_DIA = 2;
