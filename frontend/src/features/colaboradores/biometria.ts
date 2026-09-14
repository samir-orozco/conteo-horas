import { TZ } from '../../lib/fechas';

// Lo que se ve del registro facial en la ficha y en la tabla de colaboradores, y el mensaje que copia
// el administrador para mandarle a la persona su enlace de registro (14 de septiembre de 2026).

export type EstadoBiometrico = 'REGISTRADO' | 'NO_AUTORIZO' | 'SIN_REGISTRO';

// Registrado gana: quien no había autorizado y después se registró, autorizó. El servidor además
// borra el rechazo al registrar, así que los dos juntos solo aparecen en datos a medio guardar.
export function estadoBiometrico(col: { rostroEnroladoEn?: string | null; rostroRechazadoEn?: string | null }): EstadoBiometrico {
  if (col.rostroEnroladoEn) return 'REGISTRADO';
  if (col.rostroRechazadoEn) return 'NO_AUTORIZO';
  return 'SIN_REGISTRO';
}

export const ETIQUETA_BIOMETRICA: Record<EstadoBiometrico, { texto: string; tono: 'verde' | 'gris' } | null> = {
  REGISTRADO: { texto: 'Rostro registrado', tono: 'verde' },
  NO_AUTORIZO: { texto: 'No autorizó', tono: 'gris' },
  SIN_REGISTRO: null,
};

const HORA = new Intl.DateTimeFormat('es-CO', { hour: 'numeric', minute: '2-digit', timeZone: TZ });

// La hora en Bogotá, que es donde la lee la persona, terminada en punto una sola vez: «p. m.» ya trae
// el suyo, y sin la guarda la frase quedaba con dos. Los espacios raros que pone el formato de hora se
// cambian por espacios normales: pegados en WhatsApp o en un correo se ven como cuadritos.
export function horaConPunto(v: string | Date): string {
  const hora = HORA.format(new Date(v)).replace(/[\u00a0\u202f]/g, ' ');
  return hora.endsWith('.') ? hora : `${hora}.`;
}

export function mensajeDelEnlace({ nombre, empresa, url, venceEn }: {
  nombre: string; empresa: string; url: string; venceEn: string | Date;
}): string {
  return `Hola, ${nombre}: con este enlace registras tu rostro para marcar asistencia en ${empresa}. `
    + `El enlace dura 1 hora y vence a las ${horaConPunto(venceEn)}\n${url}`;
}
