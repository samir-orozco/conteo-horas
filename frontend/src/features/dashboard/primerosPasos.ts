// «Primeros pasos» en el Inicio de una empresa nueva (14 de octubre de 2026). Qué paso está hecho lo
// decide el servidor (`backend/src/utils/primerosPasos.ts`); aquí solo cómo se dice y a dónde lleva.

export type PasoParaMostrar = { clave: string; hecho: boolean; texto: string; ruta: string };

const PASOS: Record<string, { texto: string; ruta: string }> = {
  // Toda empresa nace con su sede principal: el paso sale hecho y lleva a revisarla.
  SEDE: { texto: 'Tu sede principal ya está creada', ruta: '/app/configuracion?tab=sedes' },
  HORARIO: { texto: 'Crea tu horario', ruta: '/app/configuracion?tab=horario' },
  TRABAJADOR: { texto: 'Agrega un trabajador', ruta: '/app/colaboradores' },
  // El rostro se registra desde la ficha de cada persona, a la que se llega desde la lista.
  ROSTRO: { texto: 'Haz el registro biométrico de un trabajador', ruta: '/app/colaboradores' },
  MARCACION: { texto: 'Haz la primera marcación en el kiosco', ruta: '/app/kiosco' },
};

// Un paso que este código no conoce (de un servidor más nuevo) no tiene texto ni destino: se omite.
export function pasosParaMostrar(pasos: { clave: string; hecho: boolean }[]): PasoParaMostrar[] {
  return pasos.flatMap(p => {
    const conocido = Object.prototype.hasOwnProperty.call(PASOS, p.clave) ? PASOS[p.clave] : null;
    return conocido ? [{ ...p, ...conocido }] : [];
  });
}
