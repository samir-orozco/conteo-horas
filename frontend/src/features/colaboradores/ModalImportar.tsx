import { useEffect, useState } from 'react';
import { Upload, Download, X, AlertTriangle, FileSpreadsheet, Check } from 'lucide-react';
import api from '../../lib/api';
import { descargarFormato, leerHoja, mapearHoja, type Columna, type FilaCruda } from './formatoImportacion';

type ErrorFila = { fila: number; campo: string; mensaje: string };
type Resultado = {
  validas: unknown[];
  errores: ErrorFila[];
  excedeCupo: boolean;
  conDatos?: number;
  vacio: boolean;
  cupoDisponible?: number | null;
  nombrePlan?: string;
  creados: number;
};

// Las hojas de cálculo que aceptamos. Se comprueba antes de leer nada: pedirle
// a SheetJS que abra un PNG solo cambia un error claro por uno críptico.
const HOJAS = ['.xlsx', '.xls', '.csv'];
const esHoja = (f: File) => HOJAS.some(e => f.name.toLowerCase().endsWith(e));

// Carga masiva de colaboradores.
//
// Dos pasos y en este orden: primero se descarga el formato, después se sube
// lleno. Y entre subirlo y crear a nadie hay una vista previa, porque crear 40
// personas mal es mucho más caro de deshacer que de prevenir.
//
// La validación de esa vista previa la hace el SERVIDOR (soloValidar), no esta
// pantalla: así lo que se ve es exactamente lo que va a pasar, y no una segunda
// opinión del navegador que podría no coincidir.
export default function ModalImportar({ onCerrar, onListo }: {
  onCerrar: () => void;
  onListo: (creados: number) => void;
}) {
  const [columnas, setColumnas] = useState<Columna[]>([]);
  const [horarios, setHorarios] = useState<string[]>([]);
  const [filas, setFilas] = useState<FilaCruda[]>([]);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [nombreArchivo, setNombreArchivo] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/colaboradores/formato')
      .then(r => { setColumnas(r.data.columnas); setHorarios(r.data.horarios); })
      .catch(() => setError('No pudimos cargar el formato. Vuelve a abrir esta ventana.'));
  }, []);

  const elegir = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const archivo = e.target.files?.[0];
    e.target.value = '';
    if (!archivo) return;
    setError(''); setResultado(null);
    if (!esHoja(archivo)) {
      setError('Ese archivo no es una hoja de Excel. Sube el formato .xlsx que descargaste.');
      return;
    }
    setNombreArchivo(archivo.name);
    setOcupado(true);
    try {
      const leidas = mapearHoja(await leerHoja(archivo), columnas);
      setFilas(leidas);
      const r = await api.post('/colaboradores/masivo', { filas: leidas, soloValidar: true });
      setResultado(r.data);
    } catch (err) {
      const e2 = err as { response?: { data?: { error?: string } } };
      setError(e2.response?.data?.error ?? 'No pudimos leer ese archivo.');
    } finally { setOcupado(false); }
  };

  const crear = async () => {
    setOcupado(true); setError('');
    try {
      const r = await api.post('/colaboradores/masivo', { filas, soloValidar: false });
      onListo(r.data.creados);
    } catch (err) {
      const e2 = err as { response?: { data?: { error?: string } } };
      setError(e2.response?.data?.error ?? 'No pudimos crear los colaboradores.');
    } finally { setOcupado(false); }
  };

  const n = resultado?.validas.length ?? 0;
  const puedeCrear = !!resultado && !resultado.vacio && !resultado.excedeCupo
    && resultado.errores.length === 0 && n > 0;

  return (
    <div className="fixed inset-0 !mt-0 bg-black/40 flex items-center justify-center z-[60] p-4" onClick={onCerrar}>
      <div className="hp-pop bg-white rounded-2xl w-full max-w-2xl shadow-xl flex flex-col max-h-[90dvh]" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4 p-6 pb-4">
          <div>
            <h3 className="font-bold text-lg text-ink flex items-center gap-2">
              <FileSpreadsheet size={18} /> Subir varios colaboradores
            </h3>
            <p className="text-sm text-muted mt-1">
              Descarga el formato, llénalo con tu gente y súbelo. Antes de crear a nadie
              te mostramos cómo quedó.
            </p>
          </div>
          <button onClick={onCerrar} aria-label="Cerrar"><X size={20} className="text-gray-400" /></button>
        </div>

        <div className="px-6 pb-6 overflow-y-auto space-y-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => descargarFormato(columnas, horarios)}
              disabled={!columnas.length}
              className="flex items-center justify-center gap-2 border-2 border-gray-200 hover:border-primary text-ink font-semibold py-3 rounded-xl text-sm disabled:opacity-50">
              <Download size={16} /> Descargar el formato
            </button>

            <label className={`flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark text-ink font-semibold py-3 rounded-xl text-sm cursor-pointer ${ocupado ? 'opacity-60 pointer-events-none' : ''}`}>
              <Upload size={16} /> Subir el formato
              <input type="file" accept=".xlsx,.xls,.csv" onChange={elegir} className="sr-only" disabled={ocupado} />
            </label>
          </div>

          {nombreArchivo && !error && (
            <p className="text-xs text-muted">Archivo: <span className="text-ink font-medium">{nombreArchivo}</span></p>
          )}
          {ocupado && <p className="text-sm text-muted">Revisando el archivo...</p>}

          {error && (
            <p className="text-sm text-red-600 flex items-start gap-2">
              <AlertTriangle size={15} className="mt-0.5 shrink-0" />{error}
            </p>
          )}

          {resultado?.vacio && (
            <p className="text-sm text-muted bg-gray-50 rounded-lg px-3 py-2.5">
              El archivo no tiene ninguna fila con datos. ¿Borraste la fila de ejemplo sin escribir nada debajo?
            </p>
          )}

          {resultado?.excedeCupo && (
            <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg px-3 py-2.5 text-sm">
              <p className="font-bold flex items-center gap-1.5"><AlertTriangle size={14} /> No caben en tu plan</p>
              <p className="mt-0.5">
                El archivo trae {resultado.conDatos ?? n} colaborador{(resultado.conDatos ?? n) === 1 ? '' : 'es'} y en tu plan{' '}
                <b>{resultado.nombrePlan}</b> te queda cupo para <b>{resultado.cupoDisponible}</b>.
                Sube de plan o quita filas del archivo.
              </p>
            </div>
          )}

          {!!resultado?.errores.length && (
            <div>
              <p className="text-sm font-semibold text-ink mb-2">
                Hay {resultado.errores.length} cosa{resultado.errores.length === 1 ? '' : 's'} por corregir
                en el archivo. Arréglalas y vuelve a subirlo.
              </p>
              <ul className="space-y-1.5 max-h-56 overflow-y-auto">
                {resultado.errores.map((e, i) => (
                  <li key={i} className="text-sm flex gap-2.5 bg-red-50 rounded-lg px-3 py-2">
                    <span className="font-bold text-red-800 shrink-0">Fila {e.fila}</span>
                    <span className="text-red-900">{e.mensaje}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {puedeCrear && (
            <p className="text-sm text-green-800 bg-green-50 rounded-lg px-3 py-2.5 flex items-start gap-2">
              <Check size={15} className="mt-0.5 shrink-0" />
              El archivo está bien. Se van a crear {n} colaborador{n === 1 ? '' : 'es'},
              cada uno con su fecha de ingreso de hoy.
            </p>
          )}
        </div>

        <div className="flex gap-3 justify-end px-6 py-4 border-t border-gray-100">
          <button type="button" onClick={onCerrar}
            className="px-4 py-2 text-sm text-muted border border-gray-300 rounded-lg hover:bg-gray-50">Cancelar</button>
          {puedeCrear && (
            <button type="button" onClick={crear} disabled={ocupado}
              className="px-4 py-2 text-sm bg-primary hover:bg-primary-dark text-ink font-bold rounded-lg disabled:opacity-60">
              {ocupado ? 'Creando...' : `Crear ${n} colaborador${n === 1 ? '' : 'es'}`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
