import { useRef, useState, type CSSProperties } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FileBarChart2, Clock3, AlarmClock, ChevronRight } from 'lucide-react';

const OPCIONES = [
  { to: '/app/reportes', label: 'Reporte diario', desc: 'Liquidación día a día de un colaborador.', icon: FileBarChart2 },
  { to: '/app/reportes/extras', label: 'Extras y recargos', desc: 'Valor a pagar por colaborador, con desglose.', icon: Clock3 },
  { to: '/app/reportes/llegadas-tarde', label: 'Llegadas tarde', desc: 'Tardanzas por colaborador, con desglose.', icon: AlarmClock },
];

// Ítem "Reportes" del menú: no navega directo, abre un panel anclado a este mismo
// botón (mismo patrón que la campana de notificaciones) para elegir el reporte.
export default function ReportesNav({ onNav }: { onNav?: () => void }) {
  const [abierto, setAbierto] = useState(false);
  const [ancla, setAncla] = useState<DOMRect | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const activo = location.pathname.startsWith('/app/reportes');

  const abrir = () => {
    if (btnRef.current) setAncla(btnRef.current.getBoundingClientRect());
    setAbierto(true);
  };

  const ir = (to: string) => {
    setAbierto(false);
    onNav?.();
    navigate(to);
  };

  const esMovil = typeof window !== 'undefined' && window.innerWidth < 768;
  const top = ancla ? ancla.top : 80;
  const estilo: CSSProperties = esMovil
    ? { top: 12, left: 12, right: 12 }
    : { top, left: (ancla ? ancla.right : 256) + 10, width: 320 };

  return (
    <>
      <button
        ref={btnRef}
        onClick={abrir}
        className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
          activo ? 'bg-primary text-ink' : 'text-muted hover:bg-gray-100 hover:text-ink'
        }`}
      >
        <FileBarChart2 size={18} /> Reportes
      </button>

      {abierto && (
        <>
          {/* Captura de clics fuera para cerrar (sin oscurecer: es un menú) */}
          <div className="fixed inset-0 z-[59]" onClick={() => setAbierto(false)} />
          <div
            style={estilo}
            className="fixed z-[60] bg-white rounded-2xl shadow-2xl border border-gray-200/70 overflow-hidden hp-notif-pop"
          >
            <div className="px-5 pt-3.5 pb-2.5 border-b border-gray-100">
              <h3 className="font-bold text-[15px] text-ink">Reportes</h3>
            </div>
            <div className="p-2">
              {OPCIONES.map(o => (
                <button key={o.to} onClick={() => ir(o.to)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 text-left transition-colors">
                  <span className="bg-primary/25 w-9 h-9 rounded-lg flex items-center justify-center shrink-0">
                    <o.icon size={17} className="text-ink" />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-semibold text-ink">{o.label}</span>
                    <span className="block text-xs text-muted">{o.desc}</span>
                  </span>
                  <ChevronRight size={16} className="text-gray-300 shrink-0" />
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </>
  );
}
