import { TZ } from '../../lib/fechas';

// Cómo se lee el registro del sistema en la pantalla del super administrador.
//
// La zona horaria se importa de `lib/fechas` y no se vuelve a escribir aquí: es la misma regla que
// gobierna todo lo que se le muestra a una persona, y tenerla en dos sitios es lo que hace que una
// copia se quede atrás (CLAUDE.md §9.3). Las pruebas corren fijadas fuera de Bogotá a propósito.

export type TipoEvento = 'ERROR' | 'ACCESO' | 'AUDITORIA' | string;

const ETIQUETAS: Record<string, string> = {
  ERROR: 'Error',
  ACCESO: 'Acceso',
  // "Auditoría" es palabra de auditor. Lo que la pantalla muestra es quién hizo qué.
  AUDITORIA: 'Acción',
};

// Un caso por valor y un `default` explícito: la pregunta "de qué tipo es esto" es sobre un
// conjunto abierto, y el día que se agregue un cuarto tipo la celda no puede quedarse en blanco
// (CLAUDE.md §9.4).
const ESTILOS: Record<string, string> = {
  ERROR: 'bg-red-50 text-red-700 border-red-200',
  ACCESO: 'bg-amber-50 text-amber-700 border-amber-200',
  AUDITORIA: 'bg-blue-50 text-blue-700 border-blue-200',
};

const ESTILO_DESCONOCIDO = 'bg-gray-50 text-gray-600 border-gray-200';

export const etiquetaDeTipo = (tipo: TipoEvento): string => ETIQUETAS[tipo] ?? tipo;
export const estiloDeTipo = (tipo: TipoEvento): string => ESTILOS[tipo] ?? ESTILO_DESCONOCIDO;

// La fecha y la hora en que pasó, en hora de Bogotá y con año: este registro no se borra solo, así
// que puede tener eventos de hace años y un "23 sept" a secas no diría de cuál.
export function cuandoPaso(iso: string | Date | null | undefined): string {
  if (!iso) return '—';
  const f = new Date(iso);
  if (Number.isNaN(f.getTime())) return '—';
  return f.toLocaleString('es-CO', {
    timeZone: TZ, day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit',
  });
}

export function resumenDeVeces(veces: number): string {
  return `${veces.toLocaleString('es-CO')} ${veces === 1 ? 'vez' : 'veces'}`;
}

// Qué se lee en la primera línea de cada fila. Cambia con la pestaña, porque lo que identifica un
// evento no es lo mismo en las tres: un error se busca por dónde pasó, un acceso y una acción se
// reconocen por lo que son.
export function tituloDeEvento(e: { tipo: TipoEvento; metodo?: string | null; ruta?: string | null; mensaje?: string | null }): string {
  if (e.tipo === 'ERROR') {
    const ubicacion = [e.metodo, e.ruta].filter(Boolean).join(' ');
    return ubicacion || e.mensaje || 'Sin detalle';
  }
  return e.mensaje || [e.metodo, e.ruta].filter(Boolean).join(' ') || 'Sin detalle';
}
