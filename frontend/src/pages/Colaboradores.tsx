import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, DollarSign, X } from 'lucide-react';
import api from '../lib/api';

type Colaborador = { id: string; nombre: string; apellido: string; cedula: string; cargo?: string; email?: string; telefono?: string; salarioMensual: number; activo: boolean };
type FormData = Omit<Colaborador, 'id' | 'activo'>;

const EMPTY: FormData = { nombre: '', apellido: '', cedula: '', cargo: '', email: '', telefono: '', salarioMensual: 0 };

export default function Colaboradores() {
  const [lista, setLista] = useState<Colaborador[]>([]);
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState<Colaborador | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY);
  const [valorHora, setValorHora] = useState<{ salarioMensual: number; horasMes: number; valorHora: number } | null>(null);
  const [verValorId, setVerValorId] = useState<string | null>(null);

  const cargar = () => api.get('/colaboradores').then(r => setLista(r.data));
  useEffect(() => { cargar(); }, []);

  const abrir = (col?: Colaborador) => {
    setEditando(col || null);
    setForm(col ? { nombre: col.nombre, apellido: col.apellido, cedula: col.cedula, cargo: col.cargo || '', email: col.email || '', telefono: col.telefono || '', salarioMensual: col.salarioMensual } : EMPTY);
    setModal(true);
  };

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editando) await api.put(`/colaboradores/${editando.id}`, form);
    else await api.post('/colaboradores', form);
    setModal(false);
    cargar();
  };

  const eliminar = async (id: string) => {
    if (!confirm('¿Desactivar este colaborador?')) return;
    await api.delete(`/colaboradores/${id}`);
    cargar();
  };

  const verValor = async (id: string) => {
    const r = await api.get(`/colaboradores/${id}/valor-hora`);
    setValorHora(r.data);
    setVerValorId(id);
  };

  const fmt = (n: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Colaboradores</h2>
        <button onClick={() => abrir()} className="flex items-center gap-2 bg-blue-800 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
          <Plus size={16} />Agregar
        </button>
      </div>

      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
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
              <tr key={col.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-800">{col.nombre} {col.apellido}</td>
                <td className="px-4 py-3 text-gray-600 hidden md:table-cell">{col.cedula}</td>
                <td className="px-4 py-3 text-gray-600 hidden md:table-cell">{col.cargo || '-'}</td>
                <td className="px-4 py-3 text-right text-gray-700">{fmt(col.salarioMensual)}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-center gap-2">
                    <button onClick={() => verValor(col.id)} title="Ver valor hora" className="p-1.5 text-green-600 hover:bg-green-50 rounded"><DollarSign size={15} /></button>
                    <button onClick={() => abrir(col)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"><Edit2 size={15} /></button>
                    <button onClick={() => eliminar(col.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded"><Trash2 size={15} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal valor hora */}
      {verValorId && valorHora && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="font-bold text-lg mb-4">Valor de la hora</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-600">Salario mensual:</span><span className="font-medium">{fmt(valorHora.salarioMensual)}</span></div>
              <div className="flex justify-between"><span className="text-gray-600">Horas/mes:</span><span className="font-medium">{valorHora.horasMes}h</span></div>
              <div className="flex justify-between border-t pt-2 mt-2"><span className="font-semibold">Valor hora base:</span><span className="font-bold text-blue-700 text-base">{fmt(valorHora.valorHora)}</span></div>
            </div>
            <button onClick={() => { setVerValorId(null); setValorHora(null); }} className="mt-4 w-full bg-gray-100 hover:bg-gray-200 py-2 rounded-lg text-sm font-medium">Cerrar</button>
          </div>
        </div>
      )}

      {/* Modal formulario */}
      {modal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg">{editando ? 'Editar colaborador' : 'Nuevo colaborador'}</h3>
              <button onClick={() => setModal(false)}><X size={20} className="text-gray-400" /></button>
            </div>
            <form onSubmit={guardar} className="grid grid-cols-2 gap-4">
              {(['nombre', 'apellido', 'cedula', 'cargo', 'email', 'telefono'] as const).map(field => (
                <div key={field} className={field === 'email' ? 'col-span-2' : ''}>
                  <label className="block text-xs font-medium text-gray-600 mb-1 capitalize">{field}</label>
                  <input value={form[field] as string} onChange={e => setForm(p => ({ ...p, [field]: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required={['nombre', 'apellido', 'cedula'].includes(field)} />
                </div>
              ))}
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Salario mensual (COP)</label>
                <input type="number" value={form.salarioMensual} onChange={e => setForm(p => ({ ...p, salarioMensual: Number(e.target.value) }))} required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="col-span-2 flex gap-3 justify-end mt-2">
                <button type="button" onClick={() => setModal(false)} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">Cancelar</button>
                <button type="submit" className="px-4 py-2 text-sm bg-blue-800 text-white rounded-lg hover:bg-blue-700">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
