import { useState } from 'react';
import { Users, Search, Check } from 'lucide-react';

// Selector de colaborador con buscador. Un <select> nativo obliga a recorrer una
// lista larga a ciegas: con cuarenta personas, escribir tres letras es la única
// forma razonable de llegar a la que se busca.

type Colaborador = { id: string; nombre: string; apellido: string };

type Props = {
  colaboradores: Colaborador[];
  valor: string; // '' = todos
  onCambiar: (id: string) => void;
};

export default function SelectorColaborador({ colaboradores, valor, onCambiar }: Props) {
  const [abierto, setAbierto] = useState(false);
  const [busca, setBusca] = useState('');

  const elegido = colaboradores.find(c => c.id === valor);
  const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const lista = busca.trim()
    ? colaboradores.filter(c => norm(`${c.nombre} ${c.apellido}`).includes(norm(busca.trim())))
    : colaboradores;

  const elegir = (id: string) => { onCambiar(id); setAbierto(false); setBusca(''); };

  return (
    <div className="relative">
      <button onClick={() => setAbierto(v => !v)}
        className={`flex items-center gap-2 border rounded-lg px-3 py-2 text-sm font-medium transition-colors max-w-[220px] ${
          valor ? 'border-primary bg-primary/10 text-ink' : 'border-gray-300 text-ink hover:bg-gray-50'}`}>
        <Users size={15} className="text-muted shrink-0" />
        <span className="truncate">{elegido ? `${elegido.nombre} ${elegido.apellido}` : 'Todos los colaboradores'}</span>
      </button>

      {abierto && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => { setAbierto(false); setBusca(''); }} />
          <div className="absolute top-full mt-1 left-0 z-40 w-64 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden">
            <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100">
              <Search size={14} className="text-muted shrink-0" />
              <input autoFocus value={busca} onChange={e => setBusca(e.target.value)}
                placeholder="Buscar colaborador"
                className="w-full text-sm outline-none placeholder:text-gray-400" />
            </div>

            <div className="max-h-64 overflow-y-auto py-1">
              <button onClick={() => elegir('')}
                className={`w-full flex items-center gap-2 px-3.5 py-2 text-sm text-left ${
                  !valor ? 'bg-green-50 text-green-700 font-semibold' : 'text-ink hover:bg-gray-50'}`}>
                {!valor ? <Check size={15} className="shrink-0" /> : <span className="w-[15px] shrink-0" />}
                Todos los colaboradores
              </button>

              {lista.map(c => {
                const activo = c.id === valor;
                return (
                  <button key={c.id} onClick={() => elegir(c.id)}
                    className={`w-full flex items-center gap-2 px-3.5 py-2 text-sm text-left ${
                      activo ? 'bg-green-50 text-green-700 font-semibold' : 'text-ink hover:bg-gray-50'}`}>
                    {activo ? <Check size={15} className="shrink-0" /> : <span className="w-[15px] shrink-0" />}
                    <span className="truncate">{c.nombre} {c.apellido}</span>
                  </button>
                );
              })}

              {lista.length === 0 && (
                <p className="px-3.5 py-3 text-sm text-muted text-center">Nadie coincide con «{busca}»</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
