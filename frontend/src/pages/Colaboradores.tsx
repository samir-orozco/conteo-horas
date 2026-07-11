import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit2, Trash2, X, Eye } from 'lucide-react';
import api from '../lib/api';
import ConfirmDialog from '../components/ConfirmDialog';

type Colaborador = { id: string; nombre: string; apellido: string; cedula: string; cargo?: string; email?: string; telefono?: string; fechaNacimiento?: string | null; salarioMensual: number; activo: boolean; retiroProgramado?: string | null; horarioId?: string | null };
export type Franja = { dias: string[]; horaEntrada: string; horaSalida: string };
type Horario = { id: string; nombre: string; franjas: Franja[] };
type FormData = Omit<Colaborador, 'id' | 'activo'>;

const EMPTY: FormData = { nombre: '', apellido: '', cedula: '', cargo: '', email: '', telefono: '', fechaNacimiento: '', salarioMensual: 0, horarioId: '' };

// La fecha viene del backend como ISO; el input date necesita "YYYY-MM-DD"
export const soloFecha = (s?: string | null) => (s ? new Date(s).toISOString().slice(0, 10) : '');

// Formato de pesos colombianos mientras se digita: 1750000 → 1.750.000
export const formatearMiles = (n: number) => (n ? new Intl.NumberFormat('es-CO').format(n) : '');
export const parsearMiles = (s: string) => Number(s.replace(/\D/g, '')) || 0;

// Resumen compacto de las franjas de un horario: "Lun–Vie 08:00—17:00 · Sáb 08:00—12:00"
const ORDEN_DIAS = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO', 'DOMINGO'];
const CORTO: Record<string, string> = { LUNES: 'Lun', MARTES: 'Mar', MIERCOLES: 'Mié', JUEVES: 'Jue', VIERNES: 'Vie', SABADO: 'Sáb', DOMINGO: 'Dom' };
export function resumenFranjas(franjas?: Franja[]): string {
  if (!franjas?.length) return '';
  return franjas.map(f => {
    const idx = ORDEN_DIAS.filter(d => f.dias.includes(d));
    // Días consecutivos se colapsan a rango (Lun–Vie); si no, se listan
    const consecutivos = idx.length > 2 && idx.every((d, i) => i === 0 || ORDEN_DIAS.indexOf(d) === ORDEN_DIAS.indexOf(idx[i - 1]) + 1);
    const dias = consecutivos ? `${CORTO[idx[0]]}–${CORTO[idx[idx.length - 1]]}` : idx.map(d => CORTO[d]).join('·');
    return `${dias} ${f.horaEntrada}—${f.horaSalida}`;
  }).join(' · ');
}

export default function Colaboradores() {
  const navigate = useNavigate();
  const [lista, setLista] = useState<Colaborador[]>([]);
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState<Colaborador | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY);
  const [eliminando, setEliminando] = useState<Colaborador | null>(null);
  const [horarios, setHorarios] = useState<Horario[]>([]);
  const [errorForm, setErrorForm] = useState('');
  const [guardando, setGuardando] = useState(false);

  const cargar = () => api.get('/colaboradores').then(r => setLista(r.data));
  useEffect(() => { cargar(); api.get('/horarios').then(r => setHorarios(r.data)); }, []);

  const abrir = (col?: Colaborador) => {
    setEditando(col || null);
    setErrorForm('');
    setForm(col ? { nombre: col.nombre, apellido: col.apellido, cedula: col.cedula, cargo: col.cargo || '', email: col.email || '', telefono: col.telefono || '', fechaNacimiento: soloFecha(col.fechaNacimiento), salarioMensual: col.salarioMensual, horarioId: col.horarioId || '' } : EMPTY);
    setModal(true);
  };

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardando(true);
    setErrorForm('');
    try {
      const payload = {
        ...form,
        horarioId: form.horarioId || null,
        // Fecha vacía debe ir como null (Prisma rechaza el string vacío en un campo de fecha)
        fechaNacimiento: form.fechaNacimiento ? form.fechaNacimiento : null,
      };
      if (editando) await api.put(`/colaboradores/${editando.id}`, payload);
      else await api.post('/colaboradores', payload);
      setModal(false);
      cargar();
    } catch (err: any) {
      setErrorForm(err.response?.data?.error ?? 'No pudimos guardar el colaborador. Revisa los datos e intenta de nuevo.');
    } finally {
      setGuardando(false);
    }
  };

  const confirmarEliminar = async () => {
    if (!eliminando) return;
    await api.delete(`/colaboradores/${eliminando.id}`);
    setEliminando(null);
    cargar();
  };

  const fmt = (n: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-ink">Colaboradores</h2>
        <button onClick={() => abrir()} className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-ink px-4 py-2 rounded-xl text-sm font-semibold">
          <Plus size={16} />Agregar
        </button>
      </div>

      <div className="bg-white rounded-card border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-muted uppercase text-xs">
            <tr>
              <th className="px-4 py-3 text-left">Nombre</th>
              <th className="px-4 py-3 text-left hidden md:table-cell">Cédula</th>
              <th className="px-4 py-3 text-left hidden md:table-cell">Cargo</th>
              <th className="px-4 py-3 text-right">Salario</th>
              <th className="px-4 py-3 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {lista.map(col => (
              <tr key={col.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => navigate(`/app/colaboradores/${col.id}`)}>
                <td className="px-4 py-3 font-medium text-ink">
                  {col.nombre} {col.apellido}
                  {col.retiroProgramado && (
                    <span className="ml-2 text-[10px] font-bold bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
                      RETIRO {new Date(col.retiroProgramado).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-muted hidden md:table-cell">{col.cedula}</td>
                <td className="px-4 py-3 text-muted hidden md:table-cell">{col.cargo || '-'}</td>
                <td className="px-4 py-3 text-right text-ink">{fmt(col.salarioMensual)}</td>
                <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                  <div className="flex items-center justify-center gap-2">
                    <button onClick={() => navigate(`/app/colaboradores/${col.id}`)} title="Ver detalle" className="p-1.5 text-muted hover:bg-primary/30 hover:text-ink rounded-lg"><Eye size={15} /></button>
                    <button onClick={() => abrir(col)} title="Editar" className="p-1.5 text-muted hover:bg-primary/30 hover:text-ink rounded-lg"><Edit2 size={15} /></button>
                    <button onClick={() => setEliminando(col)} title="Desactivar" className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={15} /></button>
                  </div>
                </td>
              </tr>
            ))}
            {lista.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-muted">Aún no hay colaboradores</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Confirmación de desactivación (modal propio) */}
      <ConfirmDialog
        abierto={!!eliminando}
        peligro
        titulo="¿Retirar colaborador?"
        subtitulo={eliminando ? `Si el mes ya está pagado, ${eliminando.nombre} sigue activo hasta fin de mes (ya está cubierto) y se retira el día 1. Si no, se desactiva de inmediato. Su historial siempre se conserva.` : ''}
        textoContinuar="Sí, retirar"
        onContinuar={confirmarEliminar}
        onCancelar={() => setEliminando(null)}
      />

      {/* Modal formulario */}
      {modal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg text-ink">{editando ? 'Editar colaborador' : 'Nuevo colaborador'}</h3>
              <button onClick={() => setModal(false)}><X size={20} className="text-gray-400" /></button>
            </div>
            <form onSubmit={guardar} className="grid grid-cols-2 gap-4">
              {(['nombre', 'apellido', 'cedula', 'cargo', 'email', 'telefono'] as const).map(field => (
                <div key={field} className={field === 'email' ? 'col-span-2' : ''}>
                  <label className="block text-xs font-medium text-muted mb-1 capitalize">{field}</label>
                  <input value={form[field] as string} onChange={e => setForm(p => ({ ...p, [field]: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    required={['nombre', 'apellido', 'cedula'].includes(field)} />
                </div>
              ))}
              <div className="col-span-2">
                <label className="block text-xs font-medium text-muted mb-1">Fecha de nacimiento</label>
                <input type="date" value={(form.fechaNacimiento as string) || ''}
                  onChange={e => setForm(p => ({ ...p, fechaNacimiento: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-muted mb-1">Horario de trabajo</label>
                <select value={form.horarioId || ''} onChange={e => setForm(p => ({ ...p, horarioId: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary">
                  <option value="">Sin horario (no controla llegadas tarde)</option>
                  {horarios.map(h => <option key={h.id} value={h.id}>{h.nombre} · {resumenFranjas(h.franjas)}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-muted mb-1">Salario mensual (COP)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-sm">$</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={formatearMiles(form.salarioMensual)}
                    onChange={e => setForm(p => ({ ...p, salarioMensual: parsearMiles(e.target.value) }))}
                    placeholder="1.750.000"
                    required
                    className="w-full border border-gray-300 rounded-lg pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
              {errorForm && <p className="col-span-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{errorForm}</p>}
              <div className="col-span-2 flex gap-3 justify-end mt-2">
                <button type="button" onClick={() => setModal(false)} className="px-4 py-2 text-sm text-muted border border-gray-300 rounded-lg hover:bg-gray-50">Cancelar</button>
                <button type="submit" disabled={guardando} className="px-4 py-2 text-sm bg-primary text-ink font-semibold rounded-lg hover:bg-primary-dark disabled:opacity-60">{guardando ? 'Guardando...' : 'Guardar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
