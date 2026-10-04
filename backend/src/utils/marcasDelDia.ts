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

// DESDE QUÉ DÍA SE LISTAN (3 de octubre de 2026, el turno nocturno). Cada marca se guarda en el día
// en que la persona ENTRÓ: quien entra el viernes a las 7:00 p. m. y sale el sábado a las 6:00 a. m.
// tiene toda su jornada en el viernes, regresos de pausa incluidos. Si la lista mirara solo el
// sábado, a las 6:00 a. m. saldría vacía y la persona no vería su entrada, ni una que alguien
// hubiera marcado por ella. Si la jornada que empezó antes de hoy sigue en curso —un turno
// abierto, o una pausa que espera regreso— o se CERRÓ hoy, la lista arranca en el día de esa
// jornada. Lo de que se cerró hoy salió de una revisión: la salida que otro marcara a las 3:00 a. m.
// a nombre de Luis cerraba la jornada, y la lista volvía a salir vacía justo cuando había algo que ver.
export function desdeCuandoSeListan({ inicioDia, abierto, pausaEnCurso, ultimoCerrado }: {
  inicioDia: Date;
  abierto: { fecha: Date } | null;
  pausaEnCurso: { fecha: Date } | null;
  ultimoCerrado: { fecha: Date; salida: Date | null } | null;
}): Date {
  const cerradaHoy = ultimoCerrado?.salida && ultimoCerrado.salida.getTime() >= inicioDia.getTime() ? ultimoCerrado : null;
  const jornada = abierto ?? pausaEnCurso ?? cerradaHoy;
  return jornada && jornada.fecha.getTime() < inicioDia.getTime() ? jornada.fecha : inicioDia;
}
