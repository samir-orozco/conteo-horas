import { textoDeSedes, type SedeDeFila } from '../lib/sedesDeReporte';

// La sede de una fila de reporte. Quien trabajó en más de un lugar lleva la marca
// «Mixto» delante: sin ella, al filtrar por una sede se leería como si todo lo de
// esa persona hubiera pasado ahí.
export default function SedesDeFila({ sedes }: { sedes: SedeDeFila[] }) {
  const { texto, mixto } = textoDeSedes(sedes);
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      {mixto && <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">Mixto</span>}
      <span className="text-gray-700">{texto}</span>
    </span>
  );
}
