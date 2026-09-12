// Los descansos no remunerados, del lado de las pantallas (12 de septiembre de 2026).
//
// Quien valida y calcula es el servidor (backend/src/utils/descansos.ts). Estos topes
// son los mismos de allá, repetidos a propósito porque el navegador no puede importar
// el backend: si allá cambian, cambian aquí. Si algún día no coinciden, manda el
// servidor, que rechaza con su propio mensaje.
export const MAX_DESCANSOS_POR_FRANJA = 3;
// Una fila por tramo trabajado: la de la entrada, y una más por cada pausa que se marca
// (el almuerzo y los tres descansos).
export const MAX_MARCACIONES_POR_JORNADA = 2 + MAX_DESCANSOS_POR_FRANJA;

export type Ventana = { inicio: string; fin: string };

// Minutos de "HH:MM".
export const aMin = (s: string) => { const [h, m] = s.split(':').map(Number); return h * 60 + m; };

// Duración de una ventana, si tiene sus dos horas; si el fin no avanza, cruza la
// medianoche. Vivía dentro de TabHorario.tsx: la lista de descansos también la necesita,
// y una copia en cada pantalla es la forma de que un día digan cosas distintas.
export const minutosEntre = (ini?: string | null, fin?: string | null): number => {
  if (!ini || !fin) return 0;
  let f = aMin(fin); const i = aMin(ini);
  if (f <= i) f += 1440;
  return f - i;
};

// Lo que suman los descansos de una franja, para el resumen del horario que se está
// editando. Los que están a medias no cuentan: sin sus dos horas no se pueden guardar.
export const minutosDeLosDescansos = (descansos: readonly Ventana[] | null | undefined): number =>
  (descansos ?? []).reduce((s, d) => s + minutosEntre(d.inicio, d.fin), 0);
