// Partes del calendario de Bogotá. Restar las 5 horas y leer en UTC evita que
// una fecha guardada a medianoche de Bogotá se lea como el día anterior.
function enBogota(d: Date) {
  const t = new Date(d.getTime() - 5 * 60 * 60 * 1000);
  return Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate());
}

// Hasta dónde un rótulo relativo sigue diciendo algo. Más allá, "hace 43 días"
// obliga a hacer la cuenta mental que uno estaba tratando de evitar.
const VENTANA = 7;

// Rótulo de tiempo de la línea de tiempo, o null si no aporta.
//
// Devuelve null a propósito: al lado ya está la fecha completa, y repetirla en
// mayúsculas debajo no es información, es ruido.
//
// Cuenta días de calendario, no horas: dos marcas separadas por 20 minutos que
// caen a lado y lado de medianoche son "hoy" y "ayer", no "hace 0 días".
export function tiempoRelativo(fecha: Date, hoy: Date): string | null {
  const dias = Math.round((enBogota(fecha) - enBogota(hoy)) / 86400000);

  if (dias === 0) return 'HOY';
  if (dias === -1) return 'AYER';
  if (dias === 1) return 'MAÑANA';
  if (dias < 0 && dias >= -VENTANA) return `HACE ${-dias} DÍAS`;
  if (dias > 0 && dias <= VENTANA) return `EN ${dias} DÍAS`;
  return null;
}
