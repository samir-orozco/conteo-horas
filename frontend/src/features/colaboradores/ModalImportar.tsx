import { useEffect, useState } from 'react';
import { Upload, Download, X, AlertTriangle, FileSpreadsheet, Plus, Trash2 } from 'lucide-react';
import api from '../../lib/api';
import { descargarFormato, leerHoja, mapearHoja, type Columna } from './formatoImportacion';
import {
  filaVacia, hayDatos, mapaDeErrores, conHorarioGlobal,
  CLAVE_HORARIO, type FilaEditable, type ErrorFila,
} from './tablaImportacion';

type Horario = { id: string; nombre: string };

type Resultado = {
  errores: ErrorFila[];
  excedeCupo: boolean;
  vacio: boolean;
  conDatos?: number;
  cupoDisponible?: number | null;
  nombrePlan?: string;
  creados: number;
};

const HOJAS = ['.xlsx', '.xls', '.csv'];
const esHoja = (f: File) => HOJAS.some(e => f.name.toLowerCase().endsWith(e));

// Carga masiva de colaboradores.
//
// El archivo es solo la forma rápida de traer los datos; la verdad es la tabla
// de esta pantalla. Se puede corregir aquí mismo lo que venía mal, agregar a
// quien faltaba y quitar a quien no va, sin volver al Excel.
//
// El horario no viaja en el archivo a propósito: escribirlo obligaba a copiar
// el nombre exacto de un horario, y un dedazo dejaba la fila entera en error
// por algo que se resuelve con un clic. Se elige de una lista, para todos de
// una vez o uno por uno.
//
// "Crear" valida y crea en la MISMA llamada: el servidor no crea nada si algo
// está mal. Así no hay dos verdades sobre el mismo archivo.
export default function ModalImportar({ onCerrar, onListo }: {
  onCerrar: () => void;
  onListo: (creados: number) => void;
}) {
  const [columnas, setColumnas] = useState<Columna[]>([]);
  const [horarios, setHorarios] = useState<Horario[]>([]);
  const [filas, setFilas] = useState<FilaEditable[] | null>(null);
  const [errores, setErrores] = useState<Map<string, string>>(new Map());
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/colaboradores/formato')
      .then(r => { setColumnas(r.data.columnas); setHorarios(r.data.horarios); })
      .catch(() => setError('No pudimos cargar el formato. Vuelve a abrir esta ventana.'));
  }, []);

  const conDatos = (filas ?? []).filter(hayDatos);

  const revisar = async (candidatas: FilaEditable[], soloValidar: boolean) => {
    setOcupado(true); setError('');
    try {
      const r = await api.post('/colaboradores/masivo',
        { filas: candidatas.filter(hayDatos), soloValidar });
      const datos = r.data as Resultado;
      setResultado(datos);
      setErrores(mapaDeErrores(datos.errores ?? []));
      if (!soloValidar && datos.creados > 0) onListo(datos.creados);
    } catch (err) {
      const e = err as { response?: { data?: { error?: string } } };
      setError(e.response?.data?.error ?? 'No pudimos hablar con el servidor.');
    } finally { setOcupado(false); }
  };

  const elegir = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const archivo = e.target.files?.[0];
    e.target.value = '';
    if (!archivo) return;
    setError(''); setResultado(null); setErrores(new Map());
    if (!esHoja(archivo)) {
      setError('Ese archivo no es una hoja de Excel. Sube el formato .xlsx que descargaste.');
      return;
    }
    setOcupado(true);
    try {
      const leidas = mapearHoja(await leerHoja(archivo), columnas)
        .map(f => ({ ...filaVacia(columnas), ...f }));
      setFilas(leidas);
      if (leidas.some(hayDatos)) await revisar(leidas, true);
      else setResultado({ errores: [], excedeCupo: false, vacio: true, creados: 0 });
    } catch {
      setError('No pudimos leer ese archivo.');
    } finally { setOcupado(false); }
  };

  const cambiar = (i: number, clave: string, valor: string) => {
    setFilas(f => (f ?? []).map((fila, j) => (j === i ? { ...fila, [clave]: valor } : fila)));
    // La marca de error se quita al escribir: dejarla en rojo mientras se
    // corrige se lee como que lo nuevo también está mal.
    setErrores(m => {
      if (!m.has(`${i}:${clave}`)) return m;
      const copia = new Map(m);
      copia.delete(`${i}:${clave}`);
      return copia;
    });
  };

  const puedeCrear = !!filas && conDatos.length > 0 && !resultado?.excedeCupo && !ocupado;
  const n = conDatos.length;

  return (
    <div className="fixed inset-0 !mt-0 bg-black/40 flex items-center justify-center z-[60] p-4" onClick={onCerrar}>
      <div className="hp-pop bg-white rounded-2xl w-full max-w-5xl shadow-xl flex flex-col max-h-[92dvh]" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4 p-6 pb-4">
          <div>
            <h3 className="font-bold text-lg text-ink flex items-center gap-2">
              <FileSpreadsheet size={18} /> Subir varios colaboradores
            </h3>
            <p className="text-sm text-muted mt-1">
              Descarga el formato y súbelo lleno. Lo que traiga queda aquí en una tabla
              que puedes corregir antes de crear a nadie.
            </p>
          </div>
          <button onClick={onCerrar} aria-label="Cerrar"><X size={20} className="text-gray-400" /></button>
        </div>

        <div className="px-6 pb-6 overflow-y-auto space-y-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <button type="button" onClick={() => descargarFormato(columnas)} disabled={!columnas.length}
              className="flex items-center justify-center gap-2 border-2 border-gray-200 hover:border-primary text-ink font-semibold py-3 rounded-xl text-sm disabled:opacity-50">
              <Download size={16} /> Descargar el formato
            </button>
            <label className={`flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark text-ink font-semibold py-3 rounded-xl text-sm cursor-pointer ${ocupado ? 'opacity-60 pointer-events-none' : ''}`}>
              <Upload size={16} /> Subir el formato
              <input type="file" accept=".xlsx,.xls,.csv" onChange={elegir} className="sr-only" disabled={ocupado} />
            </label>
          </div>

          {error && (
            <p className="text-sm text-red-600 flex items-start gap-2">
              <AlertTriangle size={15} className="mt-0.5 shrink-0" />{error}
            </p>
          )}

          {resultado?.vacio && (
            <p className="text-sm text-muted bg-gray-50 rounded-lg px-3 py-2.5">
              El archivo no tiene ninguna fila con datos. ¿Borraste la fila de ejemplo
              sin escribir nada debajo?
            </p>
          )}

          {resultado?.excedeCupo && (
            <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg px-3 py-2.5 text-sm">
              <p className="font-bold flex items-center gap-1.5"><AlertTriangle size={14} /> No caben en tu plan</p>
              <p className="mt-0.5">
                Tienes {resultado.conDatos ?? n} en la tabla y en tu plan <b>{resultado.nombrePlan}</b>{' '}
                queda cupo para <b>{resultado.cupoDisponible}</b>. Quita filas o sube de plan.
              </p>
            </div>
          )}

          {filas && filas.length > 0 && (
            <>
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <label className="flex items-center gap-2 text-sm">
                  <span className="text-muted">Horario para todos</span>
                  <select
                    aria-label="Horario para todos"
                    defaultValue=""
                    onChange={e => setFilas(f => conHorarioGlobal(f ?? [], e.target.value))}
                    className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm font-medium text-ink focus:outline-none focus:ring-2 focus:ring-primary">
                    <option value="">Sin horario</option>
                    {horarios.map(h => <option key={h.id} value={h.id}>{h.nombre}</option>)}
                  </select>
                </label>
                {errores.size > 0 && (
                  <p className="text-sm text-red-700 font-semibold flex items-center gap-1.5">
                    <AlertTriangle size={14} /> {errores.size} dato{errores.size === 1 ? '' : 's'} por corregir
                  </p>
                )}
              </div>

              {/* La tabla se desplaza sola: con nueve columnas no cabe en un
                  teléfono, y encogerla haría ilegible cada celda. */}
              <div className="border border-gray-200 rounded-xl overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-muted uppercase text-[11px]">
                    <tr>
                      <th className="px-2 py-2 text-left font-semibold w-8">#</th>
                      {columnas.map(c => (
                        <th key={c.clave} className="px-2 py-2 text-left font-semibold whitespace-nowrap">
                          {c.titulo}{c.obligatoria && <span className="text-red-500"> *</span>}
                        </th>
                      ))}
                      <th className="px-2 py-2 text-left font-semibold">Horario</th>
                      <th className="px-2 py-2 w-8"><span className="sr-only">Quitar</span></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filas.map((fila, i) => (
                      <tr key={i} className="align-top">
                        <td className="px-2 py-1.5 text-[11px] text-gray-400">{i + 1}</td>
                        {columnas.map(c => {
                          const malo = errores.get(`${i}:${c.clave}`);
                          return (
                            <td key={c.clave} className="px-2 py-1.5">
                              <input
                                aria-label={`${c.titulo} de la fila ${i + 1}`}
                                aria-invalid={malo ? true : undefined}
                                value={fila[c.clave] ?? ''}
                                onChange={e => cambiar(i, c.clave, e.target.value)}
                                className={`w-full min-w-[7rem] border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 ${
                                  malo ? 'border-red-400 bg-red-50 focus:ring-red-300' : 'border-gray-300 focus:ring-primary'}`}
                              />
                              {malo && <span className="block text-[11px] text-red-700 mt-0.5 max-w-[14rem]">{malo}</span>}
                            </td>
                          );
                        })}
                        <td className="px-2 py-1.5">
                          <select
                            aria-label={`Horario de la fila ${i + 1}`}
                            value={fila[CLAVE_HORARIO] ?? ''}
                            onChange={e => cambiar(i, CLAVE_HORARIO, e.target.value)}
                            className="w-full min-w-[9rem] border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary">
                            <option value="">Sin horario</option>
                            {horarios.map(h => <option key={h.id} value={h.id}>{h.nombre}</option>)}
                          </select>
                        </td>
                        <td className="px-2 py-1.5">
                          <button type="button"
                            aria-label={`Quitar la fila ${i + 1}`}
                            onClick={() => setFilas(f => (f ?? []).filter((_, j) => j !== i))}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50">
                            <Trash2 size={15} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <button type="button"
                onClick={() => setFilas(f => [...(f ?? []), filaVacia(columnas)])}
                className="flex items-center gap-1.5 text-sm font-semibold text-ink border border-gray-300 hover:bg-gray-50 px-3 py-1.5 rounded-lg">
                <Plus size={14} /> Agregar una fila
              </button>
            </>
          )}
        </div>

        <div className="flex gap-3 justify-end items-center px-6 py-4 border-t border-gray-100">
          {ocupado && <span className="text-sm text-muted mr-auto">Revisando...</span>}
          <button type="button" onClick={onCerrar}
            className="px-4 py-2 text-sm text-muted border border-gray-300 rounded-lg hover:bg-gray-50">Cancelar</button>
          {puedeCrear && (
            <button type="button" onClick={() => revisar(filas ?? [], false)}
              className="px-4 py-2 text-sm bg-primary hover:bg-primary-dark text-ink font-bold rounded-lg disabled:opacity-60">
              Crear {n} colaborador{n === 1 ? '' : 'es'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
