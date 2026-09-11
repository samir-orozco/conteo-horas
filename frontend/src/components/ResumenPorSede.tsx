import { nombreDeLugar, type SedeDeFila } from '../lib/sedesDeReporte';

export type Resumen<K extends string> = {
  porSede: (SedeDeFila & Record<K, number>)[];
  mixtos: Record<K, number>;
  todas: Record<K, number>;
};

export type ColumnaResumen<K extends string> = {
  titulo: string;
  valor: (montos: Record<K, number>) => string;
  alinear?: 'right' | 'center';
};

// Literales completos: Tailwind no ve clases armadas con plantillas.
const ALINEAR = { right: 'text-right', center: 'text-center' } as const;

// El resumen por sede de un reporte: lo de quien trabajó ÚNICAMENTE en cada sede,
// los mixtos en su propia línea y «Todas las sedes», que es el total de la empresa.
// El servidor lo arma sin filtro, así que no cambia con la sede que se esté
// mirando: está para comparar esa sede contra el resto.
export default function ResumenPorSede<K extends string>({ resumen, columnas }: { resumen: Resumen<K>; columnas: ColumnaResumen<K>[] }) {
  const celdas = (montos: Record<K, number>, clase: string) =>
    columnas.map(c => <td key={c.titulo} className={`px-3 ${ALINEAR[c.alinear ?? 'right']} ${clase}`}>{c.valor(montos)}</td>);

  return (
    <section aria-label="Resumen por sede" className="mt-6">
      <h3 className="text-sm font-semibold text-ink mb-1">Por sede</h3>
      <p className="text-xs text-muted mb-3">
        Cada sede suma solo a quien trabajó únicamente en ella. Quien trabajó en varias va una sola vez, en Mixtos.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[480px]">
          <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
            <tr>
              <th className="px-3 py-2 text-left">Sede</th>
              {columnas.map(c => <th key={c.titulo} className={`px-3 py-2 ${ALINEAR[c.alinear ?? 'right']}`}>{c.titulo}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {resumen.porSede.map(l => (
              <tr key={l.id ?? 'sin-sede'}>
                <td className="px-3 py-2 text-gray-800">{nombreDeLugar(l)}</td>
                {celdas(l, 'py-2 text-gray-600')}
              </tr>
            ))}
            <tr>
              <td className="px-3 py-2 text-gray-800">Mixtos</td>
              {celdas(resumen.mixtos, 'py-2 text-gray-600')}
            </tr>
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-gray-200">
              <td className="px-3 py-3 font-bold text-ink">Todas las sedes</td>
              {celdas(resumen.todas, 'py-3 font-bold text-ink')}
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  );
}
