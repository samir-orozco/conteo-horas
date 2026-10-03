import { momentosDelDia, type Momento, type RegistroDeDia } from './jornada';

// LO QUE LA PERSONA YA MARCÓ EN EL DÍA, en orden, para que el kiosco se lo muestre antes de marcar
// (3 de octubre de 2026, diseño del dueño). Es lo que delata que alguien marcó a su nombre: el 1
// de octubre Lina habría visto una entrada a las 8:49 que no hizo.
//
// Cada marca se nombra con `momentosDelDia`, la misma regla de la pantalla de fotos del panel: el
// kiosco y el panel no pueden llamar distinto a la misma marca. Lo que puso el sistema (el regreso
// estimado de una pausa, la salida del auto-cierre) no se lista: no lo marcó nadie.
export type MarcaDelDia = { momento: Momento; hora: Date };

export function marcasDelDia<T extends RegistroDeDia & { id: string; salidaEstimada: boolean }>(registros: T[]): MarcaDelDia[] {
  const momentos = momentosDelDia(registros);
  const marcas: MarcaDelDia[] = [];
  for (const r of registros) {
    const m = momentos.get(r.id);
    if (m?.entrada && r.entrada && !r.entradaEstimada) marcas.push({ momento: m.entrada, hora: r.entrada });
    if (m?.salida && r.salida && !r.salidaEstimada) marcas.push({ momento: m.salida, hora: r.salida });
  }
  return marcas.sort((a, b) => a.hora.getTime() - b.hora.getTime());
}
