export type Hito = {
  tipo: 'INGRESO' | 'RETIRO' | 'REINGRESO';
  fecha: string;
};

const DIA = 86400000;
const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;

// Días que la persona estuvo realmente vinculada, sumando cada etapa.
//
// Existe porque restar la última fecha menos la primera cuenta también el
// tiempo que la persona estuvo AFUERA. Quien entró en 2022, se fue, y volvió en
// 2026 aparecía con más de cuatro años de antigüedad habiendo trabajado dos
// meses, justo al lado de una historia que mostraba lo contrario.
//
// Los dos extremos cuentan: entrar y salir el mismo día es un día trabajado, no
// cero. Es la misma convención del resto del producto.
export function diasDeVinculacion(eventos: Hito[], hoy: Date): number {
  // En la misma fecha, la apertura va antes que el cierre. Entrar y salir el
  // mismo día es un caso real (contratos de un día, quien no se presentó), y
  // el servidor manda los eventos de un mismo día en orden inverso: sin este
  // desempate el retiro llegaría primero, se ignoraría por no haber etapa
  // abierta, y el ingreso quedaría abierto hasta hoy.
  const peso = (t: Hito['tipo']) => (t === 'RETIRO' ? 1 : 0);
  const enOrden = [...eventos].sort((a, b) =>
    new Date(a.fecha).getTime() - new Date(b.fecha).getTime()
    || peso(a.tipo) - peso(b.tipo));

  let dias = 0;
  let apertura: number | null = null;

  for (const e of enOrden) {
    const t = new Date(e.fecha).getTime();
    if (e.tipo === 'RETIRO') {
      // Un retiro sin etapa abierta es un dato incoherente, no una etapa de
      // duración negativa: se ignora en vez de restar.
      if (apertura !== null) {
        dias += Math.round((t - apertura) / DIA) + 1;
        apertura = null;
      }
    } else if (apertura === null) {
      // Dos aperturas seguidas no abren dos etapas: la segunda se ignora, o la
      // antigüedad se contaría dos veces.
      apertura = t;
    }
  }

  // La etapa que sigue abierta llega hasta hoy.
  if (apertura !== null) dias += Math.round((hoy.getTime() - apertura) / DIA) + 1;

  return Math.max(0, dias);
}

// Cómo se dice esa cantidad de días.
//
// Es una aproximación para leer de pasada, no una cifra de liquidación: para
// eso está la liquidación, que cuenta en año comercial de 360 días.
export function enPalabras(dias: number): string {
  if (dias <= 0) return '—';
  if (dias < 31) return plural(dias, 'día', 'días');

  const meses = Math.round(dias / 30.44);
  if (meses < 12) return plural(meses, 'mes', 'meses');

  const anios = Math.floor(meses / 12);
  const resto = meses % 12;
  const enAnios = plural(anios, 'año', 'años');
  return resto === 0 ? enAnios : `${enAnios} y ${plural(resto, 'mes', 'meses')}`;
}
