import { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { Search, Download, ChevronDown, FileSpreadsheet, AlertTriangle, Eye } from 'lucide-react';
import SelectorRangoFechas from '../components/SelectorRangoFechas';
import SedesDeFila from '../components/SedesDeFila';
import api from '../lib/api';
import { descargarExcelHojas } from '../lib/exportar';
import { hojasDeNomina, type PersonaDeNomina } from '../features/reportes/nominaDelPeriodo';
import { archivoParaSiigo } from '../features/reportes/siigoDirecto';
import ModalDetalleDePersona from '../features/reportes/ModalDetalleDePersona';

// Nómina del período de todos los colaboradores activos (15 de septiembre de 2026).
//
// Un solo botón, «Descargar informe», que despliega los formatos (decisión del dueño): el Excel de
// HoraPro y el de Siigo. El de Siigo baja DIRECTO, con el mismo formato que da Siigo y ya lleno: el
// sistema lleva su plantilla adentro y no hay que subir nada.
//
// El salario va como BASE del cálculo, no como total a pagar: en una quincena el salario del mes
// completo no es lo que se paga, y ese módulo todavía no existe.

const fmt = (n: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);
const horas = (min: number) => `${Math.floor(min / 60)}h ${String(Math.round(min % 60)).padStart(2, '0')}m`;

const bajarArchivo = (bytes: Uint8Array, nombre: string) => {
  const url = URL.createObjectURL(new Blob([bytes as unknown as BlobPart], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  }));
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  a.click();
  URL.revokeObjectURL(url);
};

export default function ReporteNomina() {
  const [sedes, setSedes] = useState<{ id: string; nombre: string }[]>([]);
  const [sedeId, setSedeId] = useState('');
  const [desde, setDesde] = useState(format(new Date(), 'yyyy-MM-01'));
  const [hasta, setHasta] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [personas, setPersonas] = useState<PersonaDeNomina[] | null>(null);
  const [periodo, setPeriodo] = useState({ desde, hasta });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [descargando, setDescargando] = useState(false);
  // La persona cuyo detalle está abierto. Se guarda la fila entera y no el id: el modal muestra lo
  // que el reporte ya calculó para ella, y volver a buscarla en la lista es una forma de perderla.
  const [detalle, setDetalle] = useState<PersonaDeNomina | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => { api.get('/sedes').then(r => setSedes(r.data)).catch(() => setSedes([])); }, []);

  // El menú se cierra al tocar por fuera, como el resto de los desplegables del panel.
  useEffect(() => {
    if (!menuAbierto) return;
    const alTocarFuera = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuAbierto(false);
    };
    document.addEventListener('mousedown', alTocarFuera);
    return () => document.removeEventListener('mousedown', alTocarFuera);
  }, [menuAbierto]);

  const buscar = async () => {
    setLoading(true);
    setError('');
    setAviso('');
    try {
      const r = await api.get('/reportes/nomina', { params: { desde, hasta, ...(sedeId ? { sedeId } : {}) } });
      setPersonas(r.data.colaboradores);
      setPeriodo({ desde, hasta });
    } catch {
      setError('No pudimos calcular el reporte');
    } finally {
      setLoading(false);
    }
  };

  // La primera búsqueda arranca fuera del cuerpo del efecto: `buscar` pone estado, y hacerlo de forma
  // síncrona ahí dispara un render en cascada (react-hooks/set-state-in-effect).
  useEffect(() => {
    let vivo = true;
    queueMicrotask(() => { if (vivo) buscar(); });
    return () => { vivo = false; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const descargarHoraPro = () => {
    if (!personas) return;
    setMenuAbierto(false);
    setAviso('');
    setError('');
    descargarExcelHojas(`Nomina_${periodo.desde}_a_${periodo.hasta}`, hojasDeNomina(personas, periodo));
  };

  const descargarSiigo = async () => {
    if (!personas) return;
    setMenuAbierto(false);
    setAviso('');
    setError('');
    setDescargando(true);
    try {
      const r = await archivoParaSiigo(personas, periodo);
      bajarArchivo(r.archivo, `Siigo_novedades_${periodo.desde}_a_${periodo.hasta}.xlsx`);
      const sinCedula = r.sinCedula.length
        ? ` Quedaron por fuera, porque no tienen cédula en HoraPro y Siigo identifica por documento: ${r.sinCedula.join(', ')}.`
        : '';
      setAviso(`Listo: ${r.filasEscritas.length} novedad(es) en el formato de Siigo.${sinCedula}`);
    } catch (err) {
      setError((err as Error).message ?? 'No pudimos armar el archivo de Siigo');
    } finally {
      setDescargando(false);
    }
  };

  const variasSedes = sedes.length > 1;
  const filas = personas ?? [];
  const total = (f: (p: PersonaDeNomina) => number) => filas.reduce((s, p) => s + f(p), 0);
  const sinDatos = !personas || filas.length === 0;

  return (
    <div className="p-4 md:p-6 w-full">
      <h2 className="text-2xl font-bold text-gray-800 mb-1">Nómina del período</h2>
      <p className="text-sm text-muted mb-6">Todos los colaboradores activos, con sus recargos, extras y novedades. Para pasar a tu programa de nómina.</p>

      <div className="bg-white rounded-xl shadow p-4 md:p-6 mb-6">
        <div className="flex flex-wrap gap-3 items-end">
          {variasSedes && (
            <select value={sedeId} onChange={e => setSedeId(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
              <option value="">Todas las sedes</option>
              {sedes.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
            </select>
          )}
          <SelectorRangoFechas desde={desde} hasta={hasta} onCambiar={(d, h) => { setDesde(d); setHasta(h); }} />
          <button onClick={buscar} disabled={loading}
            className="flex items-center justify-center gap-2 bg-blue-800 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-60">
            <Search size={16} />{loading ? 'Calculando...' : 'Buscar'}
          </button>

          {/* Un solo botón que despliega los formatos. */}
          <div className="relative ml-auto" ref={menuRef}>
            <button onClick={() => setMenuAbierto(v => !v)} disabled={sinDatos || descargando}
              aria-haspopup="menu" aria-expanded={menuAbierto}
              className="flex items-center gap-2 bg-primary hover:brightness-95 text-ink px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-60">
              <Download size={16} /> {descargando ? 'Armando...' : 'Descargar informe'} <ChevronDown size={15} />
            </button>
            {menuAbierto && (
              <div role="menu"
                className="absolute right-0 mt-2 w-72 bg-white border border-gray-200 rounded-xl shadow-xl z-20 overflow-hidden">
                <button role="menuitem" onClick={descargarHoraPro}
                  className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-start gap-3">
                  <Download size={16} className="mt-0.5 text-muted shrink-0" />
                  <span>
                    <span className="block text-sm font-semibold text-ink">Excel de HoraPro</span>
                    <span className="block text-xs text-muted">Resumen, detalle por concepto y novedades.</span>
                  </span>
                </button>
                <button role="menuitem" onClick={descargarSiigo}
                  className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-start gap-3 border-t border-gray-100">
                  <FileSpreadsheet size={16} className="mt-0.5 text-muted shrink-0" />
                  <span>
                    <span className="block text-sm font-semibold text-ink">Excel para Siigo</span>
                    <span className="block text-xs text-muted">El formato de Siigo, ya lleno y listo para subir.</span>
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        {aviso && (
          <p className="mt-3 text-sm text-ink bg-primary/20 rounded-lg px-3 py-2 flex items-start gap-2">
            <AlertTriangle size={15} className="mt-0.5 shrink-0" /> {aviso}
          </p>
        )}
      </div>

      <div className="bg-white rounded-xl shadow p-4 md:p-6 overflow-x-auto">
        {filas.length === 0 ? (
          <p className="text-center text-gray-400 py-8">{loading ? 'Calculando...' : 'Sin datos para este período.'}</p>
        ) : (
          <table className="w-full text-sm min-w-[720px]">
            <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
              <tr>
                <th className="px-3 py-2 text-left">Colaborador</th>
                {variasSedes && <th className="px-3 py-2 text-left">Sede</th>}
                <th className="px-3 py-2 text-right">Salario base</th>
                <th className="px-3 py-2 text-right">Ordinarias</th>
                <th className="px-3 py-2 text-right">Recargos</th>
                <th className="px-3 py-2 text-right">Extras</th>
                <th className="px-3 py-2 text-right">Total adicional</th>
                <th className="px-3 py-2 text-center">Detalles</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filas.map(p => (
                <tr key={p.colaboradorId} className="hover:bg-gray-50">
                  <td className="px-3 py-2.5">
                    <span className="font-medium text-gray-800">{p.nombre} {p.apellido}</span>
                    {p.cedula && <span className="text-xs text-muted block">{p.cedula}</span>}
                  </td>
                  {variasSedes && <td className="px-3 py-2.5"><SedesDeFila sedes={p.sedes ?? []} /></td>}
                  <td className="px-3 py-2.5 text-right text-gray-600">{fmt(p.salarioMensual)}</td>
                  <td className="px-3 py-2.5 text-right text-gray-600">{horas(p.minutosOrdinarios)}</td>
                  <td className="px-3 py-2.5 text-right text-gray-600">{fmt(p.totalRecargos)}</td>
                  <td className="px-3 py-2.5 text-right text-gray-600">{fmt(p.totalExtra)}</td>
                  <td className="px-3 py-2.5 text-right font-semibold text-ink">{fmt(p.totalAdicional)}</td>
                  {/* El ojo dice de quién es: con «Ver» a secas, todas las filas se llaman igual y
                      quien navega con lector de pantalla no sabe cuál está tocando. */}
                  <td className="px-3 py-2.5 text-center">
                    <button type="button" onClick={() => setDetalle(p)}
                      aria-label={`Ver el detalle de ${p.nombre} ${p.apellido}`}
                      className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-ink">
                      <Eye size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-200">
                <td className="px-3 py-3 font-bold text-ink">Total ({filas.length} colaboradores)</td>
                {variasSedes && <td></td>}
                <td></td>
                <td></td>
                <td className="px-3 py-3 text-right font-semibold text-gray-700">{fmt(total(p => p.totalRecargos))}</td>
                <td className="px-3 py-3 text-right font-semibold text-gray-700">{fmt(total(p => p.totalExtra))}</td>
                <td className="px-3 py-3 text-right font-bold text-ink text-base">{fmt(total(p => p.totalAdicional))}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>

      {detalle && (
        <ModalDetalleDePersona persona={detalle} periodo={periodo} onCerrar={() => setDetalle(null)} />
      )}
    </div>
  );
}
