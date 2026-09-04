import { useRef, useState } from 'react';
import { UploadCloud, X, Loader2 } from 'lucide-react';
import { procesarEvidencia, type Evidencia } from '../lib/evidencia';
import IconoDeAdjunto from './IconoDeAdjunto';
import { claseDeArchivo, rotuloDeArchivo, ACEPTA_DOCUMENTO } from '../lib/archivos';

// Resultado que el componente reporta al padre:
//  - { tipo: 'nuevo', evidencia }  → el usuario adjuntó un archivo
//  - { tipo: 'quitar' }            → quitó la evidencia existente
//  - { tipo: 'sin-cambio' }        → dejar todo como está
export type CambioEvidencia =
  | { tipo: 'nuevo'; evidencia: Evidencia }
  | { tipo: 'quitar' }
  | { tipo: 'sin-cambio' };

type Props = {
  // Evidencia ya guardada (modo edición); null si es nueva o no tiene
  existente?: { tipo?: string | null; nombre?: string | null } | null;
  onCambio: (c: CambioEvidencia) => void;
};

// Caja estética para adjuntar evidencia (imagen o PDF) a una novedad.
export default function CampoEvidencia({ existente, onCambio }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [nuevo, setNuevo] = useState<Evidencia | null>(null);
  const [quitado, setQuitado] = useState(false);
  const [arrastrando, setArrastrando] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  const tieneExistente = !!existente?.tipo && !quitado;

  const tomarArchivo = async (file: File | undefined) => {
    if (!file) return;
    setError(''); setCargando(true);
    try {
      const ev = await procesarEvidencia(file);
      setNuevo(ev);
      setQuitado(false);
      onCambio({ tipo: 'nuevo', evidencia: ev });
    } catch (e: any) {
      setError(e?.message ?? 'No pudimos usar ese archivo.');
    } finally {
      setCargando(false);
    }
  };

  const limpiar = () => {
    setNuevo(null);
    if (existente?.tipo) { setQuitado(true); onCambio({ tipo: 'quitar' }); }
    else onCambio({ tipo: 'sin-cambio' });
    if (inputRef.current) inputRef.current.value = '';
  };

  // Vista previa de un archivo recién adjuntado
  if (nuevo) {
    // Solo una foto se puede previsualizar. Un PDF y un Word no, y antes el
    // `else` metía cualquier cosa que no fuera PDF en un <img>.
    const esFoto = claseDeArchivo(nuevo.tipo) === 'imagen';
    return (
      <div className="flex items-center gap-3 border border-gray-200 rounded-xl p-3 bg-gray-50">
        {esFoto ? (
          <img src={nuevo.data} alt="Evidencia" className="w-14 h-14 rounded-lg object-cover shrink-0" />
        ) : (
          <div className="w-14 h-14 rounded-lg bg-white border border-gray-200 flex items-center justify-center shrink-0"><IconoDeAdjunto tipo={nuevo.tipo} size={22} /></div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-ink truncate">{nuevo.nombre}</p>
          <p className="text-xs text-muted">{rotuloDeArchivo(nuevo.tipo)} · listo para guardar</p>
        </div>
        <button type="button" onClick={limpiar} className="p-1.5 text-gray-400 hover:bg-gray-200 rounded-lg"><X size={16} /></button>
      </div>
    );
  }

  // Chip de la evidencia ya guardada (modo edición)
  if (tieneExistente) {
    return (
      <div>
        <div className="flex items-center gap-3 border border-gray-200 rounded-xl p-3 bg-gray-50">
          <div className="w-11 h-11 rounded-lg bg-white border border-gray-200 flex items-center justify-center shrink-0">
            <IconoDeAdjunto tipo={existente!.tipo} size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-ink truncate">{existente!.nombre || rotuloDeArchivo(existente!.tipo)}</p>
            <p className="text-xs text-muted">Evidencia adjunta</p>
          </div>
          <button type="button" onClick={() => inputRef.current?.click()} className="text-xs font-semibold text-primary-dark hover:underline px-1">Cambiar</button>
          <button type="button" onClick={limpiar} className="p-1.5 text-gray-400 hover:bg-gray-200 rounded-lg"><X size={16} /></button>
          <input ref={inputRef} type="file" accept={ACEPTA_DOCUMENTO} className="hidden"
            onChange={e => tomarArchivo(e.target.files?.[0])} />
        </div>
        {/* Esta rama no pintaba ni el error ni el "Procesando...". Pulsar
            "Cambiar" sobre una evidencia ya guardada y elegir algo que no se
            acepta no mostraba absolutamente nada: el archivo se rechazaba en
            silencio y el chip viejo se quedaba ahí. */}
        {cargando && <p className="text-xs text-muted mt-1.5">Procesando...</p>}
        {error && <p className="text-xs text-red-600 mt-1.5">{error}</p>}
      </div>
    );
  }

  // Caja vacía: arrastrar o hacer clic
  return (
    <div>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setArrastrando(true); }}
        onDragLeave={() => setArrastrando(false)}
        onDrop={e => { e.preventDefault(); setArrastrando(false); tomarArchivo(e.dataTransfer.files?.[0]); }}
        className={`w-full flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-6 text-center transition-colors ${arrastrando ? 'border-primary bg-primary/5' : 'border-gray-300 hover:border-primary/60 hover:bg-gray-50'}`}
      >
        {cargando ? (
          <><Loader2 size={22} className="text-primary-dark animate-spin" /><span className="text-sm text-muted">Procesando...</span></>
        ) : (
          <>
            <div className="w-11 h-11 rounded-full bg-primary/15 flex items-center justify-center"><UploadCloud size={20} className="text-primary-dark" /></div>
            <span className="text-sm font-medium text-ink">Arrastra o haz clic para adjuntar</span>
            <span className="text-xs text-muted">Foto, PDF o Word (incapacidad, permiso, etc.)</span>
          </>
        )}
      </button>
      <input ref={inputRef} type="file" accept={ACEPTA_DOCUMENTO} className="hidden"
        onChange={e => tomarArchivo(e.target.files?.[0])} />
      {error && <p className="text-xs text-red-600 mt-1.5">{error}</p>}
    </div>
  );
}
