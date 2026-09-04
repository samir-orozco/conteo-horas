import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { X, ArrowUpRight } from 'lucide-react';
import ModalShell from './ModalShell';
import VisorEvidencia from './VisorEvidencia';
import { getEvidencia } from '../api';
import { TIPO_PERMISO_LABEL } from '../../../constants/permisos';
import type { Novedad, Evidencia } from '../types';
import IconoDeAdjunto from '../../../components/IconoDeAdjunto';

// Detalle de una novedad del día, con visor de evidencia si la tiene.
export default function ModalNovedad({ novedad, onClose }: { novedad: Novedad; onClose: () => void }) {
  const navigate = useNavigate();
  const [evidencia, setEvidencia] = useState<Evidencia | null>(null);
  const [cargando, setCargando] = useState(false);

  const verEvidencia = async () => {
    setCargando(true);
    try {
      const r = await getEvidencia(novedad.id);
      setEvidencia({ data: r.evidencia, tipo: r.evidenciaTipo, nombre: r.evidenciaNombre });
    } catch { /* sin evidencia */ } finally { setCargando(false); }
  };

  return (
    <>
      <ModalShell onClose={onClose} inner="rounded-2xl p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-bold text-lg text-ink">{TIPO_PERMISO_LABEL[novedad.tipo] ?? novedad.tipo}</h3>
          <button onClick={onClose}><X size={20} className="text-gray-400" /></button>
        </div>
        <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mb-4 ${novedad.aprobado ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}`}>
          {novedad.aprobado ? 'APROBADA' : 'PENDIENTE'}
        </span>
        <div className="space-y-3 text-sm">
          <div>
            <p className="text-xs text-muted">Colaborador</p>
            <p className="text-ink font-medium">{novedad.colaborador}</p>
          </div>
          <div>
            <p className="text-xs text-muted">Fechas</p>
            <p className="text-ink font-medium">
              {format(new Date(novedad.fechaInicio), "d 'de' MMMM yyyy", { locale: es })}
              {' → '}{format(new Date(novedad.fechaFin), "d 'de' MMMM yyyy", { locale: es })}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted">Descripción / motivo</p>
            <p className="text-ink whitespace-pre-wrap">{novedad.descripcion || <span className="text-muted">Sin descripción.</span>}</p>
          </div>
          {novedad.evidenciaTipo && (
            <div>
              <p className="text-xs text-muted mb-1">Evidencia</p>
              <button onClick={verEvidencia} disabled={cargando}
                className="flex items-center gap-2 text-sm font-medium text-primary-dark border border-gray-200 rounded-lg px-3 py-2 hover:bg-gray-50 disabled:opacity-60">
                <IconoDeAdjunto tipo={novedad.evidenciaTipo} />
                {cargando ? 'Abriendo...' : (novedad.evidenciaNombre || 'Ver evidencia')}
              </button>
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onClose} className="px-4 py-2 text-sm text-muted border border-gray-300 rounded-lg hover:bg-gray-50">Cerrar</button>
          <button onClick={() => navigate(`/app/colaboradores/${novedad.colaboradorId}`)}
            className="flex items-center gap-1.5 px-4 py-2 text-sm text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-50 font-medium">
            Ver ficha <ArrowUpRight size={15} />
          </button>
        </div>
      </ModalShell>

      {evidencia && <VisorEvidencia evidencia={evidencia} onClose={() => setEvidencia(null)} />}
    </>
  );
}
