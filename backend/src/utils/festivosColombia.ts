// Festivos de Colombia — Ley 51 de 1983 (Ley Emiliani)
// Todos los festivos son calculables: fijos, trasladables al lunes siguiente
// y los que dependen del Domingo de Pascua.

export type Festivo = { fecha: Date; nombre: string };

// Medianoche de Bogotá (UTC-5) para un día calendario dado
function fechaBogota(anio: number, mes: number, dia: number): Date {
  return new Date(Date.UTC(anio, mes - 1, dia, 5, 0, 0));
}

// Traslado Emiliani: si no cae lunes, pasa al lunes siguiente
function siguienteLunes(fecha: Date): Date {
  const diaSemana = fecha.getUTCDay(); // con hora 05:00 UTC el día calendario coincide
  if (diaSemana === 1) return fecha;
  const diasHastaLunes = (8 - diaSemana) % 7 || 7;
  return new Date(fecha.getTime() + diasHastaLunes * 24 * 60 * 60 * 1000);
}

// Domingo de Pascua — algoritmo de computus (Meeus/Jones/Butcher)
function domingoPascua(anio: number): Date {
  const a = anio % 19;
  const b = Math.floor(anio / 100);
  const c = anio % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31);
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return fechaBogota(anio, mes, dia);
}

function sumarDias(fecha: Date, dias: number): Date {
  return new Date(fecha.getTime() + dias * 24 * 60 * 60 * 1000);
}

export function festivosDelAnio(anio: number): Festivo[] {
  const pascua = domingoPascua(anio);

  const fijos: Festivo[] = [
    { fecha: fechaBogota(anio, 1, 1), nombre: 'Año Nuevo' },
    { fecha: fechaBogota(anio, 5, 1), nombre: 'Día del Trabajo' },
    { fecha: fechaBogota(anio, 7, 20), nombre: 'Día de la Independencia' },
    { fecha: fechaBogota(anio, 8, 7), nombre: 'Batalla de Boyacá' },
    { fecha: fechaBogota(anio, 12, 8), nombre: 'Inmaculada Concepción' },
    { fecha: fechaBogota(anio, 12, 25), nombre: 'Navidad' },
  ];

  const trasladables: Festivo[] = [
    { fecha: siguienteLunes(fechaBogota(anio, 1, 6)), nombre: 'Reyes Magos' },
    { fecha: siguienteLunes(fechaBogota(anio, 3, 19)), nombre: 'San José' },
    { fecha: siguienteLunes(fechaBogota(anio, 6, 29)), nombre: 'San Pedro y San Pablo' },
    { fecha: siguienteLunes(fechaBogota(anio, 8, 15)), nombre: 'Asunción de la Virgen' },
    { fecha: siguienteLunes(fechaBogota(anio, 10, 12)), nombre: 'Día de la Raza' },
    { fecha: siguienteLunes(fechaBogota(anio, 11, 1)), nombre: 'Todos los Santos' },
    { fecha: siguienteLunes(fechaBogota(anio, 11, 11)), nombre: 'Independencia de Cartagena' },
  ];

  const basadosEnPascua: Festivo[] = [
    { fecha: sumarDias(pascua, -3), nombre: 'Jueves Santo' },
    { fecha: sumarDias(pascua, -2), nombre: 'Viernes Santo' },
    { fecha: siguienteLunes(sumarDias(pascua, 39)), nombre: 'Ascensión del Señor' },
    { fecha: siguienteLunes(sumarDias(pascua, 60)), nombre: 'Corpus Christi' },
    { fecha: siguienteLunes(sumarDias(pascua, 68)), nombre: 'Sagrado Corazón' },
  ];

  return [...fijos, ...trasladables, ...basadosEnPascua].sort(
    (a, b) => a.fecha.getTime() - b.fecha.getTime()
  );
}
