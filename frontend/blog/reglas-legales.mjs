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

// ===== Liquidación al terminar un contrato =====
//
// Cifras de 2026, fijadas por decreto. Cuando cambien en enero hay que tocarlas
// aquí y en la prueba del backend, que las vigila igual que a los recargos.
export const SMLMV = 1_750_905;            // Decreto 1469 de 2025
export const AUXILIO_TRANSPORTE = 249_095; // Decreto 1470 de 2025
// El auxilio solo lo recibe quien devenga hasta dos salarios mínimos.
export const TOPE_AUXILIO = 2 * SMLMV;

export const tieneAuxilio = salario => salario > 0 && salario <= TOPE_AUXILIO;

// Días entre dos fechas de calendario, ambas incluidas. La liquidación se
// prorratea sobre año comercial de 360 días, que es la convención del CST.
export const DIAS_ANIO_COMERCIAL = 360;

// Días de calendario, ambos extremos incluidos. Sirve para mostrar cuánto duró
// de verdad la relación, no para liquidar.
export function diasCalendario(desdeISO, hastaISO) {
  if (!desdeISO || !hastaISO) return 0;
  const d = new Date(desdeISO.slice(0, 10) + 'T00:00:00');
  const h = new Date(hastaISO.slice(0, 10) + 'T00:00:00');
  if (isNaN(d) || isNaN(h)) return 0;
  return Math.max(0, Math.round((h - d) / 86400000) + 1);
}

// Días para liquidar, en año comercial: meses de 30 días y años de 360.
//
// Es la convención del CST y la que usa la nómina colombiana, y no es un
// detalle cosmético: con días de calendario, un año exacto de servicio da
// 365/360 de mes de cesantías en vez de un mes redondo, que es justo lo que
// dice el artículo 249. El día 31 cuenta como 30, por eso el `min`.
export function diasEntreFechas(desdeISO, hastaISO) {
  if (!desdeISO || !hastaISO) return 0;
  const [a1, m1, d1] = desdeISO.slice(0, 10).split('-').map(Number);
  const [a2, m2, d2] = hastaISO.slice(0, 10).split('-').map(Number);
  if (!a1 || !a2) return 0;
  const dias = (a2 - a1) * 360 + (m2 - m1) * 30 + (Math.min(d2, 30) - Math.min(d1, 30)) + 1;
  return Math.max(0, dias);
}

// Inicio del semestre de prima que contiene esa fecha: 1 de enero o 1 de julio.
export function inicioSemestre(iso) {
  const [a, m] = iso.slice(0, 10).split('-').map(Number);
  return m <= 6 ? `${a}-01-01` : `${a}-07-01`;
}

// Las cuatro prestaciones que se liquidan al salir.
//
// La base NO es la misma en todas, y ahí es donde más se equivoca la gente:
// cesantías y prima se calculan sobre salario MÁS auxilio de transporte, porque
// el auxilio se considera salario para esos efectos (art. 7 Ley 1ª de 1963).
// Las vacaciones se calculan sobre el salario solo, sin auxilio.
// `desdeCesantias` existe porque las cesantías se consignan al fondo cada 14 de
// febrero. Quien ya las tiene consignadas no las vuelve a cobrar al salir: solo
// le deben las del año en curso. Sin este parámetro, la calculadora daría una
// cifra inflada a casi todo el mundo. Las vacaciones sí van sobre toda la
// antigüedad, porque se acumulan hasta que se toman o se pagan.
export function prestaciones({ salario, fechaInicio, fechaFin, desdeCesantias }) {
  const dias = diasEntreFechas(fechaInicio, fechaFin);
  const arranqueCes = desdeCesantias && desdeCesantias > fechaInicio ? desdeCesantias : fechaInicio;
  const diasCesantias = diasEntreFechas(arranqueCes, fechaFin);
  const auxilio = tieneAuxilio(salario) ? AUXILIO_TRANSPORTE : 0;
  const baseConAuxilio = salario + auxilio;

  const cesantias = baseConAuxilio * diasCesantias / DIAS_ANIO_COMERCIAL;
  const intereses = cesantias * diasCesantias * 0.12 / DIAS_ANIO_COMERCIAL;

  // La prima se debe por el semestre en curso: desde el 1 de enero o el 1 de
  // julio, o desde que entró, lo que sea más tarde.
  const arranqueSemestre = inicioSemestre(fechaFin);
  const desdePrima = arranqueSemestre > fechaInicio ? arranqueSemestre : fechaInicio;
  const diasPrima = diasEntreFechas(desdePrima, fechaFin);
  const prima = baseConAuxilio * diasPrima / DIAS_ANIO_COMERCIAL;

  // 15 días hábiles de vacaciones por año equivalen a medio salario, de ahí el 720.
  const vacaciones = salario * dias / (DIAS_ANIO_COMERCIAL * 2);

  return { dias, diasCesantias, diasPrima, auxilio, cesantias, intereses, prima, vacaciones,
    total: cesantias + intereses + prima + vacaciones };
}

// Indemnización por despido sin justa causa (art. 64 CST).
//
// Tres reglas distintas, y la que aplica depende del tipo de contrato y del
// salario:
//  - Término fijo: los salarios que faltaban para cumplir el plazo, con un piso
//    de 15 días.
//  - Indefinido con menos de 10 salarios mínimos: 30 días por el primer año más
//    20 por cada año adicional, proporcional por fracción.
//  - Indefinido con 10 salarios mínimos o más: 20 días por el primer año más 15
//    por cada año adicional.
export const TOPE_SALARIO_ALTO = 10 * SMLMV;
export const PISO_INDEMNIZACION_FIJO = 15;

export function indemnizacion({ tipo, salario, fechaInicio, fechaFin, fechaFinPactada }) {
  const diaDeSalario = salario / 30;

  if (tipo === 'FIJO') {
    // Lo que faltaba del plazo, contado desde el día siguiente a la salida.
    const faltantes = fechaFinPactada && fechaFinPactada > fechaFin
      ? diasEntreFechas(fechaFin, fechaFinPactada) - 1
      : 0;
    const dias = Math.max(faltantes, PISO_INDEMNIZACION_FIJO);
    return { dias, valor: dias * diaDeSalario, regla: 'FIJO' };
  }

  const diasTrabajados = diasEntreFechas(fechaInicio, fechaFin);
  const anios = diasTrabajados / DIAS_ANIO_COMERCIAL;
  const alto = salario >= TOPE_SALARIO_ALTO;
  const primerAnio = alto ? 20 : 30;
  const porAnioAdicional = alto ? 15 : 20;

  // Hasta el primer año no se prorratea: son los 30 (o 20) días completos.
  const dias = anios <= 1
    ? primerAnio
    : primerAnio + porAnioAdicional * (anios - 1);

  return { dias, valor: dias * diaDeSalario, regla: alto ? 'INDEFINIDO_ALTO' : 'INDEFINIDO' };
}
