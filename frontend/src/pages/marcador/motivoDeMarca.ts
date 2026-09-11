// Qué hace el kiosco cuando el servidor NO marcó.
//
// Dos respuestas no son fallos sino preguntas: el servidor pide el motivo antes
// de escribir nada, al salir antes de hora (REQUIERE_MOTIVO) y al llegar tarde
// (REQUIERE_MOTIVO_TARDANZA), y cada una abre su pantalla. Todo lo demás es un
// error que se le muestra a la persona tal como lo dijo el servidor.
export type CasoMotivo = 'SALIDA_TEMPRANA' | 'LLEGADA_TARDE';

export type TrasErrorDeMarca =
  | { accion: 'PEDIR_MOTIVO'; caso: CasoMotivo }
  | { accion: 'FALLAR'; mensaje: string };

type ErrorDeMarca = { response?: { status?: number; data?: { codigo?: string; error?: string } } };

const MENSAJE_GENERICO = 'No pudimos registrar tu marcación. Intenta de nuevo.';

function casoDelCodigo(codigo: string | undefined): CasoMotivo | null {
  switch (codigo) {
    case 'REQUIERE_MOTIVO': return 'SALIDA_TEMPRANA';
    case 'REQUIERE_MOTIVO_TARDANZA': return 'LLEGADA_TARDE';
    default: return null;
  }
}

export function decidirTrasErrorDeMarca(err: ErrorDeMarca, yaTraiaMotivo: boolean): TrasErrorDeMarca {
  const caso = err.response?.status === 409 ? casoDelCodigo(err.response?.data?.codigo) : null;
  if (!caso) return { accion: 'FALLAR', mensaje: err.response?.data?.error ?? MENSAJE_GENERICO };
  // Si YA venía con motivo y el servidor lo vuelve a pedir, el problema no es que
  // falte: es que no le sirvió. Reabrir la pantalla en silencio deja a la persona
  // dando vueltas delante del kiosco, con la fila esperando.
  if (yaTraiaMotivo) return { accion: 'FALLAR', mensaje: textosDelMotivo(caso).fallo };
  return { accion: 'PEDIR_MOTIVO', caso };
}

export type TextosDelMotivo = { titulo: string; texto: string; placeholder: string; boton: string; fallo: string };

// Un caso por valor y un `default` explícito (CLAUDE.md §9.4): el día que llegue
// un tercer motivo no hereda en silencio los textos de otro.
export function textosDelMotivo(caso: CasoMotivo): TextosDelMotivo {
  switch (caso) {
    case 'SALIDA_TEMPRANA':
      return {
        titulo: 'Salida antes del horario',
        texto: 'Cuéntanos por qué te vas antes. Tu salida se registra al confirmar.',
        placeholder: 'Describe el motivo de tu salida temprana...',
        boton: 'Registrar mi salida',
        fallo: 'No pudimos registrar el motivo de tu salida. Avisa a tu supervisor.',
      };
    case 'LLEGADA_TARDE':
      return {
        titulo: 'Llegada tarde',
        texto: 'Cuéntanos por qué llegaste tarde. Tu entrada se registra al confirmar.',
        placeholder: 'Describe el motivo de tu llegada tarde...',
        boton: 'Registrar mi entrada',
        fallo: 'No pudimos registrar el motivo de tu llegada tarde. Avisa a tu supervisor.',
      };
    default: {
      const sinTextos: never = caso;
      throw new Error(`Motivo sin textos: ${String(sinTextos)}`);
    }
  }
}
