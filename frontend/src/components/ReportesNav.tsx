import { useCallback, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import { FileBarChart2, Clock3, AlarmClock, ChevronRight, FileSpreadsheet } from 'lucide-react';
import { posicionAlLado } from '../lib/posicionDePanel';

const ANCHO = 320;

const OPCIONES = [
  { to: '/app/reportes', label: 'Reporte diario', desc: 'Liquidación día a día de un colaborador.', icon: FileBarChart2 },
  { to: '/app/reportes/extras', label: 'Extras y recargos', desc: 'Valor a pagar por colaborador, con desglose.', icon: Clock3 },
  { to: '/app/reportes/llegadas-tarde', label: 'Llegadas tarde', desc: 'Tardanzas por colaborador, con desglose.', icon: AlarmClock },
  { to: '/app/reportes/nomina', label: 'Nómina del período', desc: 'Todos los colaboradores, para pasar a tu programa de nómina.', icon: FileSpreadsheet },
];

// Ítem "Reportes" del menú: no navega directo, abre un panel anclado a este mismo
// botón (mismo patrón que la campana de notificaciones) para elegir el reporte.
export default function ReportesNav({ onNav }: { onNav?: () => void }) {
  const [abierto, setAbierto] = useState(false);
  const [ancla, setAncla] = useState<DOMRect | null>(null);
  // Lo que mide el panel ya pintado. Hay que medirlo y no estimarlo: depende de
  // cuántos reportes haya en la lista y de cuánto ocupe la descripción de cada
  // uno, que se parte en dos renglones en cuanto el texto crece.
  const [altoPanel, setAltoPanel] = useState(0);
  const btnRef = useRef<HTMLButtonElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const activo = location.pathname.startsWith('/app/reportes');

  const abrir = () => {
    if (btnRef.current) setAncla(btnRef.current.getBoundingClientRect());
    setAbierto(true);
  };

  // Se mide en el callback del ref y no en un efecto: el ref corre durante el
  // commit, antes de pintar, así que el panel nunca se ve un fotograma en el
  // sitio equivocado, y de paso no hace falta un efecto que llame a setState
  // (que es lo que React desaconseja y el linter marca).
  //
  // `offsetHeight` y NO `getBoundingClientRect().height`: el panel entra con una
  // animación que va de `scale(0.9)` a `scale(1)`, y como está declarada con
  // `both`, el fotograma del 0% ya está aplicado cuando corre esto. El rect mide
  // la caja TRANSFORMADA, así que devolvía el 90% del alto real y el panel
  // quedaba colocado como si fuera más bajo de lo que es. `offsetHeight` es el
  // alto de maquetación y las transformaciones no lo tocan.
  const medirPanel = useCallback((el: HTMLDivElement | null) => {
    if (el) setAltoPanel(el.offsetHeight);
  }, []);

  const ir = (to: string) => {
    setAbierto(false);
    onNav?.();
    navigate(to);
  };

  const esMovil = typeof window !== 'undefined' && window.innerWidth < 768;
  // El botón de Reportes es de los últimos del menú, así que en una pantalla
  // baja cae cerca del borde: colgarlo a la altura del botón dejaba el panel
  // fuera de la ventana y, por ser fixed, sin ningún scroll que lo alcanzara.
  const { x, y, altoMaximo } = posicionAlLado(
    { x: ancla ? ancla.left : 16, y: ancla ? ancla.top : 80, ancho: ancla ? ancla.width : 224, alto: ancla ? ancla.height : 40 },
    { ancho: ANCHO, alto: altoPanel },
    { ancho: typeof window !== 'undefined' ? window.innerWidth : 0,
      alto: typeof window !== 'undefined' ? window.innerHeight : 0 },
  );
  const estilo: CSSProperties = esMovil
    ? { top: 12, left: 12, right: 12, maxHeight: '85dvh' }
    : { top: y, left: x, width: ANCHO, maxHeight: altoMaximo };

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

      {/* Portal a document.body: este botón vive dentro del <aside> del sidebar,
          que es `position: sticky` y por eso crea su propio contexto de
          apilamiento en CSS — ningún z-index interno puede escapar de ahí para
          quedar por encima del contenido de <main> (tarjetas del inicio,
          calendario de festivos, etc). Montarlo en el body evita el problema de raíz. */}
      {abierto && createPortal(
        <>
          <div className="fixed inset-0 !mt-0 z-[200]" onClick={() => setAbierto(false)} />
          {/* `flex flex-col` + el scroll en la lista y no en la caja: si el
              panel no cupiera entero ni subiéndolo, lo que se desplaza es la
              lista y el título se queda a la vista. */}
          <div
            ref={medirPanel}
            style={estilo}
            className="fixed z-[201] bg-white rounded-2xl shadow-2xl border border-gray-200/70 flex flex-col overflow-hidden hp-notif-pop"
          >
            <div className="px-5 pt-3.5 pb-2.5 border-b border-gray-100 shrink-0">
              <h3 className="font-bold text-[15px] text-ink">Reportes</h3>
            </div>
            <div className="p-2 overflow-y-auto">
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
        </>,
        document.body
      )}
    </>
  );
}
