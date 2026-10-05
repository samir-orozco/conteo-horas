// LA VENTANA DE LAS CARITAS DEL KIOSCO (4 de octubre de 2026). Lo que pasa al tocar cada cosa, sin
// dibujo. El requerimiento está en docs/CLIMA_LABORAL.md §3; las mismas reglas las vuelve a validar el
// servidor en backend/src/utils/clima.ts, porque la tableta no es de fiar.

export const MOTIVO_OTRO = 'Otro';

export const NOMBRE_DE_CARITA: Record<number, string> = { 1: 'Muy mal', 2: 'Mal', 3: 'Normal', 4: 'Bien', 5: 'Muy bien' };

// Muy mal, Mal y Normal muestran los motivos; Bien y Muy bien, solo la observación.
const CARITA_MAX_CON_MOTIVOS = 3;

export type EstadoVentana = {
  carita: number | null;
  motivos: string[];
  observacionAbierta: boolean;
  texto: string;
  confidencial: boolean;
};

export type AccionVentana =
  | { tipo: 'carita'; valor: number }
  | { tipo: 'motivo'; valor: string }
  | { tipo: 'abrirObservacion' }
  | { tipo: 'texto'; valor: string }
  | { tipo: 'confidencial' };

export const VENTANA_INICIAL: EstadoVentana = { carita: null, motivos: [], observacionAbierta: false, texto: '', confidencial: false };

export function muestraMotivos(carita: number | null): boolean {
  return carita !== null && carita <= CARITA_MAX_CON_MOTIVOS;
}

export function ventanaClima(e: EstadoVentana, a: AccionVentana): EstadoVentana {
  switch (a.tipo) {
    case 'carita':
      // Los motivos que dejan de verse se borran: no pueden quedar pegados a un buen día.
      return { ...e, carita: a.valor, motivos: muestraMotivos(a.valor) ? e.motivos : [] };
    case 'motivo': {
      if (!muestraMotivos(e.carita)) return e;
      const marcado = e.motivos.includes(a.valor);
      const motivos = marcado ? e.motivos.filter(m => m !== a.valor) : [...e.motivos, a.valor];
      // «Otro» abre la observación. Desmarcarlo no la cierra: lo escrito no se pierde por un toque.
      const abre = !marcado && a.valor === MOTIVO_OTRO;
      return { ...e, motivos, observacionAbierta: e.observacionAbierta || abre };
    }
    case 'abrirObservacion':
      return { ...e, observacionAbierta: true };
    case 'texto':
      return { ...e, texto: a.valor };
    case 'confidencial':
      return { ...e, confidencial: !e.confidencial };
    default:
      return e;
  }
}

export function calificacionAGuardar(e: EstadoVentana): { carita: number; motivos: string[] } | null {
  return e.carita === null ? null : { carita: e.carita, motivos: e.motivos };
}

export function observacionAEnviar(e: EstadoVentana): { texto: string; confidencial: boolean } | null {
  const texto = e.texto.trim();
  return texto === '' ? null : { texto, confidencial: e.confidencial };
}
