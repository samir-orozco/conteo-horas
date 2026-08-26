import { toZonedTime } from 'date-fns-tz';

// Qué cambió al editar una marcación.
//
// `Registro` ya guardaba `editadoPor` y `editadoEn`, así que se sabía QUE
// alguien la tocó, pero no qué hizo. Eso es justo lo que hace falta el día que
// un trabajador reclama: "me marcaron llegada tarde" se responde con "la
// entrada se cambió de 8:15 a 8:00", no con "alguien editó esto".
//
// Las horas se escriben en la hora de Bogotá. Guardarlas en UTC haría que el
// historial dijera que alguien salió a las 10 de la noche cuando salió a las 5.

const TZ = 'America/Bogota';
const dos = (n: number) => String(n).padStart(2, '0');

export type EstadoRegistro = {
  fecha: Date;
  entrada: Date | null;
  salida: Date | null;
  tipo: string;
  observacion: string | null;
  salidaAlmuerzo: boolean;
};

export type Diferencia = { campo: string; antes: string; despues: string };

const hora = (d: Date | null | undefined): string => {
  if (!d) return 'sin marcar';
  const b = toZonedTime(d, TZ);
  return `${dos(b.getHours())}:${dos(b.getMinutes())}`;
};

const dia = (d: Date | null | undefined): string => {
  if (!d) return 'sin fecha';
  const b = toZonedTime(d, TZ);
  return `${b.getFullYear()}-${dos(b.getMonth() + 1)}-${dos(b.getDate())}`;
};

// El orden es fijo y no el del objeto que llegue: así dos ediciones iguales
// producen el mismo historial, y se lee en el orden en que ocurre una jornada.
const CAMPOS: { clave: keyof EstadoRegistro; formato: (v: any) => string }[] = [
  { clave: 'fecha', formato: dia },
  { clave: 'entrada', formato: hora },
  { clave: 'salida', formato: hora },
  { clave: 'tipo', formato: (v: string) => v ?? 'sin tipo' },
  { clave: 'observacion', formato: (v: string | null) => v || 'sin observación' },
  { clave: 'salidaAlmuerzo', formato: (v: boolean) => (v ? 'sí' : 'no') },
];

// Compara el estado guardado contra los campos que trae la edición.
// Solo mira lo que viene: el PUT admite cambios parciales, y lo que no llega no
// cambió. Un campo que llega con el mismo valor tampoco cuenta: guardar sin
// tocar nada no puede ensuciar el historial.
export function diferenciasDeRegistro(
  antes: EstadoRegistro,
  cambios: Partial<EstadoRegistro>,
): Diferencia[] {
  const out: Diferencia[] = [];
  for (const { clave, formato } of CAMPOS) {
    if (!(clave in cambios)) continue;
    const a = formato(antes[clave]);
    const b = formato(cambios[clave]);
    if (a !== b) out.push({ campo: clave, antes: a, despues: b });
  }
  return out;
}
