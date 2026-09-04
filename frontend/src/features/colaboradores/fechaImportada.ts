// La fecha de nacimiento tal como sale de un Excel de verdad.
//
// Excel guarda las fechas como números y las MUESTRA según el formato de la
// celda y el idioma de quien la creó. La misma celda se ve "11/12/85" en un
// Excel gringo y "11/12/1985" en uno colombiano, y significan cosas distintas.
// Por eso el archivo se lee con `cellDates`: las celdas de fecha llegan como
// Date y ahí no hay nada que adivinar.
//
// Esta función es para lo demás: lo que alguien escribió a mano como texto.

const dosDigitos = (n: number) => String(n).padStart(2, '0');

const aISO = (a: number, m: number, d: number) => `${a}-${dosDigitos(m)}-${dosDigitos(d)}`;

// ¿Existe ese día? "31/02" tiene forma de fecha y no es una.
function existe(a: number, m: number, d: number): boolean {
  if (m < 1 || m > 12 || d < 1 || d > 31) return false;
  const f = new Date(Date.UTC(a, m - 1, d));
  return f.getUTCFullYear() === a && f.getUTCMonth() === m - 1 && f.getUTCDate() === d;
}

// Un año de dos cifras se completa mirando el presente: 85 no puede ser 2085,
// pero 05 sí puede ser 2005.
function anioCompleto(n: number): number {
  if (n >= 100) return n;
  const cortePresente = new Date().getFullYear() % 100;
  return n <= cortePresente ? 2000 + n : 1900 + n;
}

export function normalizarFecha(v: unknown): string {
  // Una celda de fecha de verdad. Se leen las partes locales porque SheetJS
  // construye el Date en la zona de quien abre el archivo.
  if (v instanceof Date && !Number.isNaN(v.getTime())) {
    return aISO(v.getFullYear(), v.getMonth() + 1, v.getDate());
  }

  const texto = String(v ?? '').trim();
  if (!texto) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(texto)) return texto;

  const partes = texto.split(/[/\-.]/).map(p => p.trim());
  if (partes.length !== 3 || partes.some(p => !/^\d{1,4}$/.test(p))) return texto;

  const [p1, p2, p3] = partes.map(Number);
  const anio = anioCompleto(p3);

  // Si uno de los dos primeros no puede ser un mes, no hay duda de cuál es el
  // día. Solo cuando ambos podrían serlo hay que elegir, y ahí manda la forma
  // colombiana: día primero.
  const comoDiaMes = existe(anio, p2, p1);
  const comoMesDia = existe(anio, p1, p2);

  if (comoDiaMes) return aISO(anio, p2, p1);
  if (comoMesDia) return aISO(anio, p1, p2);

  // Tiene forma de fecha pero no existe. Se devuelve como vino para que se vea
  // y se corrija: borrarlo escondería que alguien escribió algo ahí.
  return texto;
}
