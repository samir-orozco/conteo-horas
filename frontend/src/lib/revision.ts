// LOS DATOS DE LA PANTALLA DE REVISIÓN DE MARCACIONES, Y CÓMO SE LEEN.
//
// La pantalla existe para detectar a alguien marcando con la foto de un
// compañero en la pantalla de un celular. El detector es el ojo del supervisor:
// el brillo de la pantalla, el filo del bisel, la mano que la sostiene. Aquí no
// se detecta nada, solo se decide qué se dice de cada marcación.

export type EstadoMetodo = 'ROSTRO' | 'CEDULA' | 'MANUAL' | 'SIN_DATO';
export type MomentoMarcado = 'entrada' | 'salida';

// Lo que manda el backend. FÍJATE EN LO QUE NO ESTÁ: ni la foto ni la distancia
// del reconocimiento. La foto se pide de a una y la distancia no sale del
// servidor, porque las dos son datos biométricos y la política publicada dice
// que no se exponen en los listados.
export type EventoDeRevision = {
  clave: string; registroId: string; momento: MomentoMarcado;
  colaboradorId: string; sedeId: string | null; hora: string;
  metodo: EstadoMetodo; tieneFoto: boolean;
  laPusoElSistema: boolean; distanciaRepetida: boolean;
};

export type RespuestaRevision = {
  desde: string; hasta: string; dias: number; truncado: boolean;
  eventos: EventoDeRevision[];
  personas: { id: string; nombre: string; apellido: string; cargo: string | null }[];
};

export type MotivoSinFoto =
  | 'LA_PUSO_EL_SISTEMA' | 'MARCO_CON_CEDULA' | 'LA_CARGO_UN_ADMIN'
  | 'YA_SE_BORRO' | 'NO_SE_SABE';

// Por qué falta la foto. Hasta ahora el producto lo ADIVINABA: `FotosJornada`
// dice «marcó con cédula o se cargó a mano» porque el dato era el mismo `null`
// en los dos casos. Con el método guardado ya no hay que adivinar, y la
// diferencia importa: «marcó con cédula» es una decisión del trabajador, «la
// cargó un administrador» es un acto de otra persona, y «ya se borró» es una
// política del sistema.
export function motivoSinFoto(ev: EventoDeRevision, expirada: boolean): MotivoSinFoto {
  // Manda sobre todo lo demás: si el auto-cierre puso esa hora, no hubo persona
  // ni cámara, y da igual qué método traiga la fila.
  if (ev.laPusoElSistema) return 'LA_PUSO_EL_SISTEMA';

  switch (ev.metodo) {
    case 'CEDULA': return 'MARCO_CON_CEDULA';
    case 'MANUAL': return 'LA_CARGO_UN_ADMIN';
    // Un ROSTRO sin foto es una inconsistencia de verdad, y taparla con «marcó
    // con cédula» escondería el único caso que sí habría que mirar. Si el día ya
    // expiró, en cambio, la explicación es que la foto existió y se borró.
    case 'ROSTRO': return expirada ? 'YA_SE_BORRO' : 'NO_SE_SABE';
    // SIN_DATO significa «no se sabe», nunca «cédula».
    default: return expirada ? 'YA_SE_BORRO' : 'NO_SE_SABE';
  }
}

export const TEXTO_SIN_FOTO: Record<MotivoSinFoto, string> = {
  LA_PUSO_EL_SISTEMA: 'Esta hora la puso el sistema, no la persona.',
  MARCO_CON_CEDULA: 'La persona marcó con su cédula.',
  LA_CARGO_UN_ADMIN: 'La cargó un administrador desde el panel.',
  YA_SE_BORRO: 'La foto ya se eliminó: se borran a los 2 meses.',
  NO_SE_SABE: 'No quedó registrado con qué se marcó.',
};

export const ROTULO_METODO: Record<EstadoMetodo, string> = {
  ROSTRO: 'Con la cara',
  CEDULA: 'Con cédula',
  MANUAL: 'Cargada a mano',
  SIN_DATO: 'Sin dato',
};

export const ROTULO_MOMENTO: Record<MomentoMarcado, string> = {
  entrada: 'Entrada',
  salida: 'Salida',
};
