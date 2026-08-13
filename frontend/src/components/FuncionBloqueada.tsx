import { Lock, ArrowUpRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// Tarjeta que reemplaza una función no incluida en el plan actual.
export default function FuncionBloqueada({ titulo, descripcion, plan = 'Profesional' }: {
  titulo: string; descripcion: string; plan?: string;
}) {
  const navigate = useNavigate();
  return (
    <div className="bg-white rounded-card border border-dashed border-gray-300 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-semibold text-ink mb-1 flex items-center gap-2"><Lock size={16} className="text-muted" /> {titulo}</p>
          <p className="text-sm text-muted">{descripcion}</p>
        </div>
        <span className="text-xs font-bold bg-gray-100 text-gray-500 px-3 py-1.5 rounded-full shrink-0">Plan {plan}</span>
      </div>
      <button onClick={() => navigate('/app/configuracion?tab=suscripcion')}
        className="mt-4 flex items-center gap-1.5 px-4 py-2 text-sm bg-primary hover:bg-primary-dark text-ink font-semibold rounded-lg">
        Subir de plan <ArrowUpRight size={15} />
      </button>
    </div>
  );
}
