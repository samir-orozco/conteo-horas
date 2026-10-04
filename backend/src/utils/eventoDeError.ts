import { huellaDeEvento, recortar } from './huellaDeEvento';

// De un error a la fila que se guarda (23 de septiembre de 2026).
//
// El detalle se guarda COMPLETO, incluida la consulta de Prisma con sus valores. Es una decisión
// tomada con el dueño sabiendo lo que implica: ahí pueden ir cédulas y correos de la gente. Sin el
// rastro entero, la mitad de los errores no se diagnostican y el módulo no sirve para lo que se
// pidió. Solo lo ve el super admin, y hay botón de borrado.
//
// Lo que NO se guarda es la respuesta al usuario: eso sigue siendo el texto fijo de
// `respuestaDeError.ts`, que es lo que impide que la consulta salga al navegador.

const MAXIMO_MENSAJE = 500;
const MAXIMO_DETALLE = 20000;

export type DatosDePeticion = {
  metodo?: string;
  url?: string;
  ip?: string;
  navegador?: string;
  usuario?: { id?: string; email?: string; nombre?: string } | null;
  empresa?: { id?: string; nombre?: string } | null;
};

export type FilaDeEvento = {
  tipo: 'ERROR' | 'ACCESO' | 'AUDITORIA';
  origen: 'SERVIDOR' | 'NAVEGADOR';
  huella: string;
  mensaje: string;
  detalle: string;
  metodo: string | null;
  ruta: string | null;
  estado: number | null;
  ip: string | null;
  navegador: string | null;
  usuarioId: string | null;
  usuarioEmail: string | null;
  usuarioNombre: string | null;
  empresaId: string | null;
  empresaNombre: string | null;
};

function textoDelError(error: unknown): { mensaje: string; rastro: string } {
  if (error instanceof Error) {
    return { mensaje: error.message || error.name, rastro: error.stack || error.message || '' };
  }
  return { mensaje: String(error), rastro: String(error) };
}

export function eventoDeError(error: unknown, peticion: DatosDePeticion, estado = 500): FilaDeEvento {
  const { mensaje, rastro } = textoDelError(error);
  // La ruta se guarda TAL CUAL (sin la consulta), porque el id concreto es lo que permite
  // reproducir el caso. Lo que se normaliza es la huella, que es lo que agrupa.
  const ruta = (peticion.url ?? '').split('?')[0] || null;

  return {
    tipo: 'ERROR',
    origen: 'SERVIDOR',
    huella: huellaDeEvento(peticion.metodo, peticion.url, mensaje),
    mensaje: recortar(mensaje, MAXIMO_MENSAJE),
    detalle: recortar(rastro, MAXIMO_DETALLE),
    metodo: peticion.metodo?.toUpperCase() ?? null,
    ruta,
    estado,
    ip: peticion.ip ?? null,
    navegador: recortar(peticion.navegador, 255) || null,
    usuarioId: peticion.usuario?.id ?? null,
    usuarioEmail: peticion.usuario?.email ?? null,
    usuarioNombre: peticion.usuario?.nombre ?? null,
    empresaId: peticion.empresa?.id ?? null,
    empresaNombre: peticion.empresa?.nombre ?? null,
  };
}

// Lo que se rompió en la pantalla de alguien. Hasta hoy esto solo se pintaba en el celular y había
// que pedirle una foto al usuario (ver `CapturadorErrores.tsx`): el crash del kiosco en Android se
// diagnosticó así. Ahora llega solo.
export type ReporteDelNavegador = { mensaje?: string; rastro?: string; pantalla?: string };

export function eventoDeNavegador(
  reporte: ReporteDelNavegador,
  peticion: DatosDePeticion,
): FilaDeEvento | null {
  // Nada de filas en blanco: un reporte sin mensaje no dice nada y solo ensucia la pantalla.
  const mensaje = reporte?.mensaje?.trim();
  if (!mensaje) return null;

  const pantalla = reporte.pantalla ?? '';
  return {
    tipo: 'ERROR',
    origen: 'NAVEGADOR',
    // `huellaDeEvento` normaliza la ruta por su cuenta, y por eso el mismo fallo en el kiosco de
    // dos empresas distintas —cuyos enlaces llevan un token distinto— es un solo problema. Aquí
    // había una segunda llamada a `rutaNormalizada` que no hacía nada: se cazó rompiéndola a
    // propósito y viendo que la prueba seguía verde (CLAUDE.md §9.1).
    huella: huellaDeEvento('NAVEGADOR', pantalla, mensaje),
    mensaje: recortar(mensaje, MAXIMO_MENSAJE),
    detalle: recortar([mensaje, reporte.rastro].filter(Boolean).join('\n\n'), MAXIMO_DETALLE),
    metodo: null,
    ruta: recortar(pantalla.split('?')[0], 255) || null,
    estado: null,
    ip: peticion.ip ?? null,
    navegador: recortar(peticion.navegador, 255) || null,
    usuarioId: peticion.usuario?.id ?? null,
    usuarioEmail: peticion.usuario?.email ?? null,
    usuarioNombre: peticion.usuario?.nombre ?? null,
    empresaId: peticion.empresa?.id ?? null,
    empresaNombre: peticion.empresa?.nombre ?? null,
  };
}

// LO QUE CAMBIA EN LA FILA CUANDO EL MISMO PROBLEMA VUELVE A PASAR (4 de octubre de 2026).
//
// Suma una vez y se queda con los datos de ESTA vez: la pantalla, la IP, el navegador, quién y de qué
// empresa. Antes solo cambiaban la fecha y el rastro, y la fila mostraba la fecha de la última vez
// con el lugar de la primera: un error de la cámara de 7 veces decía «3 de octubre, 5:02 p. m.» con
// el kiosco y la IP del 1 de octubre a las 7:00. `primeraVez` no se toca: dice desde cuándo pasa.
export function cambiosAlRepetirse(fila: FilaDeEvento, ahora: Date) {
  return {
    veces: { increment: 1 }, ultimaVez: ahora,
    mensaje: fila.mensaje, detalle: fila.detalle, estado: fila.estado,
    metodo: fila.metodo, ruta: fila.ruta, ip: fila.ip, navegador: fila.navegador,
    usuarioId: fila.usuarioId, usuarioEmail: fila.usuarioEmail, usuarioNombre: fila.usuarioNombre,
    empresaId: fila.empresaId, empresaNombre: fila.empresaNombre,
  };
}

// El token del kiosco, si el error pasó en uno. Un error del kiosco llega sin sesión y la fila no
// sabía de qué empresa era, pero la dirección del kiosco lleva el token de la empresa.
export function tokenDeKiosco(ruta: string | null | undefined): string | null {
  const m = /^\/marcador\/([A-Za-z0-9_-]+)/.exec(ruta ?? '');
  return m ? m[1] : null;
}
