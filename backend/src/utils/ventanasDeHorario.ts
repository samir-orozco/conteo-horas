import { minutosDe } from './tardanzas';
import { duracionFranjaMin } from './saldoTiempo';

// Las ventanas de pausa que el administrador escribe en cada franja del horario
// —almuerzo y descanso no remunerado— y si se pueden cumplir.
//
// Vive fuera de la ruta para poder probarlo. Una ventana imposible se congela en
// los días al materializarse y sale en la nómina como un número plausible, y
// hasta ahora esta validación no tenía una sola prueba.

export type FranjaConVentanas = {
  dias: string[];
  horaEntrada: string;
  horaSalida: string;
  tieneAlmuerzo?: boolean;
  almuerzoInicio?: string | null;
  almuerzoFin?: string | null;
  descansoInicio?: string | null;
  descansoFin?: string | null;
};

// "HH:MM" o nada. Media ventana no define una pausa, así que o vienen las dos
// horas o no viene ninguna: guardar una sola dejaría una configuración que no se
// puede cumplir y que nadie sabría interpretar.
export function horaValida(v: unknown): string | null {
  if (typeof v !== 'string' || !/^\d{2}:\d{2}$/.test(v)) return null;
  const [h, m] = v.split(':').map(Number);
  // "99:99" pasa la regex. Sin este rango, minutosDe daría 6039 y la ventana
  // duraría días.
  return h >= 0 && h <= 23 && m >= 0 && m <= 59 ? v : null;
}

// La ventana como tramo de la jornada, en minutos contados desde la entrada. Así
// se comparan igual una franja de día y una nocturna que cruza la medianoche.
function tramoDesdeLaEntrada(f: FranjaConVentanas, ini: string, fin: string): [number, number] {
  const desde = (minutosDe(ini) - minutosDe(f.horaEntrada) + 1440) % 1440;
  return [desde, desde + duracionFranjaMin(ini, fin)];
}

// La ventana tiene que caber DENTRO de la franja de ese día. Sin esta
// comprobación, una ventana invertida por un dedazo ("de 13:00 a 12:00", o
// "de 12 a 1" tecleado como 12:00-01:00) se guarda como una pausa de 23 horas:
// la jornada esperada del día queda en 0, se descuentan horas que nadie tomó, y
// como el día se congela al materializarse, corregir el horario después ya no
// arregla lo que se guardó mal.
function cabeEnLaFranja(f: FranjaConVentanas, ini: string, fin: string): boolean {
  const jornada = duracionFranjaMin(f.horaEntrada, f.horaSalida);
  const [desde, hasta] = tramoDesdeLaEntrada(f, ini, fin);
  return hasta - desde < jornada && hasta <= jornada;
}

const escrito = (v: unknown) => typeof v === 'string' && v.trim() !== '';

// Una ventana de la franja: completa y cumplible, o el rótulo de por qué no.
// `null` cuando la franja no la tiene, que es una configuración legítima.
function revisar(
  f: FranjaConVentanas, nombre: 'almuerzo' | 'descanso', ini: unknown, fin: unknown,
): { ok: [string, string] } | { mal: string } | null {
  if (!escrito(ini) && !escrito(fin)) return null;
  const i = horaValida(ini);
  const fi = horaValida(fin);
  // Escribió algo que no es una hora válida, o solo media ventana. Antes esto se
  // descartaba en silencio: el admin creía haber configurado la pausa y el
  // kiosco no le preguntaba nada a nadie.
  if (!i || !fi || i === fi || !cabeEnLaFranja(f, i, fi)) {
    return { mal: `${f.horaEntrada}-${f.horaSalida} (${nombre} ${ini ?? '—'}-${fin ?? '—'})` };
  }
  return { ok: [i, fi] };
}

// Franjas con alguna ventana que no se puede cumplir. Se devuelven para que la
// ruta responda 400 con un mensaje concreto en vez de guardar algo imposible.
export function franjasConVentanaImposible(franjas: FranjaConVentanas[]): string[] {
  const malas: string[] = [];
  for (const f of franjas) {
    const almuerzo = revisar(f, 'almuerzo', f.almuerzoInicio, f.almuerzoFin);
    const descanso = revisar(f, 'descanso', f.descansoInicio, f.descansoFin);
    if (almuerzo && 'mal' in almuerzo) malas.push(almuerzo.mal);
    if (descanso && 'mal' in descanso) malas.push(descanso.mal);
    // Las dos pausas no pueden pisarse: la misma hora se descontaría dos veces.
    if (almuerzo && 'ok' in almuerzo && descanso && 'ok' in descanso) {
      const a = tramoDesdeLaEntrada(f, ...almuerzo.ok);
      const d = tramoDesdeLaEntrada(f, ...descanso.ok);
      if (Math.max(a[0], d[0]) < Math.min(a[1], d[1])) {
        malas.push(`${f.horaEntrada}-${f.horaSalida} (descanso ${descanso.ok[0]}-${descanso.ok[1]} se cruza con el almuerzo)`);
      }
    }
  }
  return malas;
}

// Lo que se guarda de una franja: cada ventana completa o vacía, nunca a medias.
export function franjaParaGuardar(f: FranjaConVentanas) {
  const completa = (ini: unknown, fin: unknown): [string | null, string | null] => {
    const i = horaValida(ini);
    const fi = horaValida(fin);
    return i !== null && fi !== null && i !== fi ? [i, fi] : [null, null];
  };
  const [almuerzoInicio, almuerzoFin] = completa(f.almuerzoInicio, f.almuerzoFin);
  const [descansoInicio, descansoFin] = completa(f.descansoInicio, f.descansoFin);
  return {
    dias: f.dias,
    horaEntrada: f.horaEntrada,
    horaSalida: f.horaSalida,
    tieneAlmuerzo: f.tieneAlmuerzo !== false, // por defecto sí descuenta almuerzo
    almuerzoInicio, almuerzoFin, descansoInicio, descansoFin,
  };
}
