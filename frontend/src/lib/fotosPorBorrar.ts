import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { MOMENTO_LABEL, type Momento } from '../constants/momentos';
import { TZ } from './fechas';

// Una foto del kiosco que se borraría al guardar una jornada, porque su marca ya
// no existe en lo que quedó: las del descanso cuando se quita el descanso, la de
// la salida cuando se reabre el turno. La lista la decide el servidor, que es
// donde vive la regla (`salidasTrasEditar`).
export type FotoPorBorrar = { momento: Momento; hora: string | null };

// Con el mismo rótulo de la pantalla de fotos del día («Salida a descanso ·
// 12:00»), para que quien confirma reconozca cuál es sin tener que traducir.
const rotulo = (f: FotoPorBorrar) =>
  `${MOMENTO_LABEL[f.momento]} · ${f.hora ? format(toZonedTime(new Date(f.hora), TZ), 'HH:mm') : 'sin hora'}`;

const enLista = (partes: string[]) =>
  partes.length <= 1 ? partes.join('') : `${partes.slice(0, -1).join(', ')} y ${partes[partes.length - 1]}`;

export function avisoDeFotosPorBorrar(fotos: FotoPorBorrar[]): string {
  const lista = enLista(fotos.map(rotulo));
  return fotos.length === 1
    ? `Esta foto del kiosco ya no pertenece a ninguna marca de la jornada y se borra al guardar: ${lista}. No se puede recuperar.`
    : `Estas ${fotos.length} fotos del kiosco ya no pertenecen a ninguna marca de la jornada y se borran al guardar: ${lista}. No se pueden recuperar.`;
}
