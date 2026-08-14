import { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Plus, Trash2, X, Scale } from 'lucide-react';
import api from '../lib/api';
import ConfirmDialog from '../components/ConfirmDialog';

// empresaId null = festivo legal nacional (Ley Emiliani, no editable)
type Festivo = { id: string; fecha: string; nombre: string; empresaId: string | null };

export default function Festivos() {
  const [hoy] = useState(new Date());
  const [mes, setMes] = useState(new Date());
  const [festivos, setFestivos] = useState<Festivo[]>([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ fecha: '', nombre: '' });
  const [aEliminar, setAEliminar] = useState<Festivo | null>(null);

  const cargar = () => api.get('/festivos', { params: { anio: mes.getFullYear() } }).then(r => setFestivos(r.data));
  useEffect(() => { cargar(); }, [mes.getFullYear()]);

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    // Medianoche de Bogotá (Colombia siempre UTC-5): evita que la fecha se corra un día.
    await api.post('/festivos', { ...form, fecha: new Date(`${form.fecha}T00:00:00-05:00`) });
    setModal(false);
    setForm({ fecha: '', nombre: '' });
    cargar();
  };

  const confirmarEliminar = async () => {
    if (!aEliminar) return;
    await api.delete(`/festivos/${aEliminar.id}`);
    setAEliminar(null);
    cargar();
  };

  const diasMes = eachDayOfInterval({ start: startOfMonth(mes), end: endOfMonth(mes) });
  const primerDia = getDay(startOfMonth(mes));
  const diasVacios = Array(primerDia === 0 ? 6 : primerDia - 1).fill(null);

  const festivoDelDia = (dia: Date) => festivos.find(f => isSameDay(new Date(f.fecha), dia));

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-ink">Días Festivos</h2>
          <p className="text-sm text-muted">Los festivos legales se calculan automáticamente (Ley Emiliani)</p>
        </div>
        <button onClick={() => setModal(true)} className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-ink px-4 py-2 rounded-xl text-sm font-semibold">
          <Plus size={16} />Día no laboral
        </button>
      </div>

      <div className="grid md:grid-cols-3 gap-6 items-start">
        {/* Calendario */}
        <div className="md:col-span-2 bg-white rounded-card border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => setMes(m => new Date(m.getFullYear(), m.getMonth() - 1))} className="p-2 hover:bg-gray-100 rounded-lg"><ChevronLeft size={18} /></button>
            <h3 className="font-semibold text-ink capitalize">{format(mes, 'MMMM yyyy', { locale: es })}</h3>
            <button onClick={() => setMes(m => new Date(m.getFullYear(), m.getMonth() + 1))} className="p-2 hover:bg-gray-100 rounded-lg"><ChevronRight size={18} /></button>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'].map(d => (
              <div key={d} className="text-center text-xs font-medium text-muted py-1">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {diasVacios.map((_, i) => <div key={`e${i}`} />)}
            {diasMes.map(dia => {
              const festivo = festivoDelDia(dia);
              const esHoy = isSameDay(dia, hoy);
              const esDom = getDay(dia) === 0;
              return (
                <div key={dia.toISOString()} title={festivo?.nombre}
                  className={`h-24 flex flex-col items-center justify-center rounded-lg text-sm relative
                    ${festivo ? 'bg-red-100 text-red-800 font-semibold' : ''}
                    ${esHoy && !festivo ? 'bg-primary/40 text-ink font-semibold' : ''}
                    ${esDom && !festivo ? 'text-red-400' : ''}
                    ${!festivo && !esHoy ? 'text-gray-700 hover:bg-gray-50' : ''}
                  `}>
                  {dia.getDate()}
                  {festivo && <div className="w-1 h-1 bg-red-500 rounded-full absolute bottom-1" />}
                </div>
              );
            })}
          </div>
        </div>

        {/* Lista festivos */}
        <div className="bg-white rounded-card border border-gray-200 p-4">
          <h3 className="font-semibold text-ink mb-3">Festivos {mes.getFullYear()}</h3>
          <div className="space-y-2 max-h-[32rem] overflow-y-auto">
            {festivos.length === 0 && <p className="text-gray-400 text-sm">No hay festivos registrados</p>}
            {festivos.map(f => (
              <div key={f.id} className="flex items-start justify-between gap-2 p-2 bg-red-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-red-800">{f.nombre}</p>
                  <p className="text-xs text-red-600">{format(new Date(f.fecha), "d 'de' MMMM", { locale: es })}</p>
                </div>
                {f.empresaId ? (
                  <button onClick={() => setAEliminar(f)} className="p-1 text-red-400 hover:text-red-600 flex-shrink-0" title="Eliminar día propio">
                    <Trash2 size={14} />
                  </button>
                ) : (
                  <span className="p-1 text-red-300 flex-shrink-0" title="Festivo legal nacional">
                    <Scale size={14} />
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {modal && (
        <div className="fixed inset-0 !mt-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg text-ink">Día no laboral de la empresa</h3>
              <button onClick={() => setModal(false)}><X size={20} className="text-gray-400" /></button>
            </div>
            <form onSubmit={guardar} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-muted mb-1">Nombre (ej: Día de la familia)</label>
                <input value={form.nombre} onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))} required className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted mb-1">Fecha</label>
                <input type="date" value={form.fecha} onChange={e => setForm(p => ({ ...p, fecha: e.target.value }))} required className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div className="flex gap-3 justify-end">
                <button type="button" onClick={() => setModal(false)} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Cancelar</button>
                <button type="submit" className="px-4 py-2 text-sm bg-primary text-ink font-semibold rounded-lg hover:bg-primary-dark">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        abierto={!!aEliminar}
        peligro
        titulo="¿Eliminar este día no laboral?"
        subtitulo={aEliminar ? `${aEliminar.nombre} · ${format(new Date(aEliminar.fecha), "d 'de' MMMM", { locale: es })}` : ''}
        textoContinuar="Eliminar"
        onContinuar={confirmarEliminar}
        onCancelar={() => setAEliminar(null)}
      />
    </div>
  );
}
