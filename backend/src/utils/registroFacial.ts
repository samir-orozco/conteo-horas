import crypto from 'crypto';

// EL REGISTRO FACIAL QUE HACE LA PROPIA PERSONA, DESDE UN ENLACE (14 de septiembre de 2026).
//
// El administrador crea el enlace desde la ficha y se lo manda a la persona. Con él, la persona
// confirma su cédula, lee la autorización y decide: registra su rostro o dice que no autoriza. Lo que
// decida queda como constancia, con la fecha, el texto exacto que leyó y que lo hizo ella. Las tomas
// del escaneo NO se guardan: del rostro sigue quedando solo el cálculo, como en el registro de la ficha.

// Decisión del dueño: una hora. Sirve una sola vez, y crear uno nuevo anula el anterior.
export const DURACION_ENLACE_MS = 60 * 60 * 1000;

// La cédula es un dato que otros pueden conocer, así que no protege mucho; pero sin tope se podría
// probar una tras otra hasta dar con ella. Al quinto error el enlace queda bloqueado.
export const MAX_INTENTOS_CEDULA = 5;

// El token viaja solo en el enlace. En la base queda su huella: quien lea la base no puede armar un
// enlace que funcione.
export function hashDeToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function crearTokenDeEnlace(): { token: string; hash: string } {
  const token = crypto.randomBytes(32).toString('base64url');
  return { token, hash: hashDeToken(token) };
}

export type EstadoDelEnlace = 'NO_EXISTE' | 'USADO' | 'ANULADO' | 'BLOQUEADO' | 'VENCIDO' | 'VIGENTE';

type EnlaceParaEstado = { venceEn: Date; usadoEn: Date | null; anuladoEn: Date | null; intentosCedula: number };

// El orden decide qué se le dice a la persona cuando pasa más de una cosa: a quien ya lo usó se le
// dice eso, y no que venció, porque lo que tiene que hacer es distinto.
export function estadoDelEnlace(enlace: EnlaceParaEstado | null, ahora: Date): EstadoDelEnlace {
  if (!enlace) return 'NO_EXISTE';
  if (enlace.usadoEn) return 'USADO';
  if (enlace.anuladoEn) return 'ANULADO';
  if (enlace.intentosCedula >= MAX_INTENTOS_CEDULA) return 'BLOQUEADO';
  if (ahora.getTime() >= enlace.venceEn.getTime()) return 'VENCIDO';
  return 'VIGENTE';
}

// Como la escribe la gente: con puntos, espacios o guiones, y las de extranjería con letras.
const normalizarCedula = (v: string) => v.replace(/[\s.-]/g, '').toUpperCase();

export function cedulaCoincide(ingresada: unknown, guardada: string): boolean {
  if (typeof ingresada !== 'string') return false;
  const escrita = normalizarCedula(ingresada);
  return escrita !== '' && escrita === normalizarCedula(guardada);
}

// El texto que se guarda en la constancia es exactamente el que se mostró. Si cambia, cambia lo que
// se autorizó: por eso vive aquí, en el servidor, y la pantalla lo pinta tal cual lo recibe.
export const TEXTO_AUTORIZACION_ADMINISTRADOR = 'El colaborador autoriza el tratamiento de su rostro como dato biométrico, conforme a la Ley 1581 de 2012 (Habeas Data).';
export const TEXTO_MAYOR_DE_EDAD = 'Soy mayor de edad.';

// Si la empresa apagó la cédula en el kiosco, el texto no promete esa salida: sería una constancia
// de algo que no es cierto.
export function textoAutorizacionEnlace(empresa: string, permiteCedula: boolean): string {
  const inicio = `Autorizo a ${empresa} a tratar mi rostro como dato biométrico para identificarme cuando marco mi asistencia.`;
  return permiteCedula
    ? `${inicio} Sé que es voluntario, que puedo marcar con mi cédula y que puedo retirar esta autorización cuando quiera.`
    : `${inicio} Sé que es voluntario y que puedo retirar esta autorización cuando quiera.`;
}

export type RespuestaDeEstado = { status: number; codigo: string; error: string };

// Lo que ve quien abre un enlace que ya no sirve. Cada caso dice qué hacer: la persona está sola con
// su teléfono y no tiene a quién preguntarle en ese momento.
export function respuestaDelEstado(estado: EstadoDelEnlace): RespuestaDeEstado | null {
  switch (estado) {
    case 'VIGENTE':
      return null;
    case 'NO_EXISTE':
      return { status: 404, codigo: 'ENLACE_NO_EXISTE', error: 'Este enlace no existe. Revisa que esté completo o pide uno nuevo a tu empresa.' };
    case 'VENCIDO':
      return { status: 410, codigo: 'ENLACE_VENCIDO', error: 'Este enlace venció: duraba una hora. Pide uno nuevo a tu empresa.' };
    case 'USADO':
      return { status: 410, codigo: 'ENLACE_USADO', error: 'Este enlace ya se usó. Si necesitas cambiar algo, pide uno nuevo a tu empresa.' };
    case 'ANULADO':
      return { status: 410, codigo: 'ENLACE_ANULADO', error: 'Este enlace ya no sirve porque tu empresa creó uno más nuevo. Usa el último que te enviaron.' };
    case 'BLOQUEADO':
      return { status: 410, codigo: 'ENLACE_BLOQUEADO', error: 'Este enlace se bloqueó porque la cédula se escribió mal varias veces. Pide uno nuevo a tu empresa.' };
    default: {
      const sinRespuesta: never = estado;
      throw new Error(`Estado de enlace sin respuesta: ${String(sinRespuesta)}`);
    }
  }
}

// `intentosGastados` cuenta el que se acaba de equivocar.
export function mensajeCedulaEquivocada(intentosGastados: number): string {
  const quedan = MAX_INTENTOS_CEDULA - intentosGastados;
  return quedan === 1
    ? 'La cédula no coincide. Te queda 1 intento.'
    : `La cédula no coincide. Te quedan ${quedan} intentos.`;
}
