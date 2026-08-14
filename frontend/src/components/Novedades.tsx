import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X, ChevronRight, UtensilsCrossed, MousePointerClick, MapPin, Timer, History,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

// Novedades de la versión: se muestran UNA vez por usuario al entrar.
//
// Al publicar un lote nuevo se sube la VERSION y vuelven a aparecer, salvo a
// quien haya pedido no verlas más. Son dos llaves distintas a propósito: "ya vi
// las de agosto" y "no me muestres novedades nunca" son decisiones distintas, y
// mezclarlas obligaría a elegir entre repetirle a alguien lo que ya leyó o no
// contarle nunca lo que viene después.
const VERSION = '2026-08';
const vistaKey = (id: string) => `horapro_novedades_${VERSION}_${id}`;
const apagadoKey = (id: string) => `horapro_novedades_off_${id}`;

type Novedad = {
  icono: typeof UtensilsCrossed;
  titulo: string;
  texto: string;
  // A dónde lleva, para que la novedad no se quede en el anuncio.
  enlace?: { texto: string; a: string };
  // Vista previa: se arma con los mismos ladrillos del producto en vez de una
  // imagen, así no se desactualiza cuando la pantalla cambie.
  vista: React.ReactNode;
};

const Chip = ({ tono, children }: { tono: string; children: React.ReactNode }) => (
  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap ${tono}`}>{children}</span>
);

const NOVEDADES: Novedad[] = [
  {
    icono: UtensilsCrossed,
    titulo: 'El almuerzo, como tú lo manejes',
    texto: 'Puedes seguir descontando un tiempo fijo, o pedirle a tu gente que marque su almuerzo en el kiosco. Si lo marcan, quien se va temprano deja de pagar un almuerzo que nunca tomó.',
    enlace: { texto: 'Configurarlo en Horario', a: '/app/configuracion?tab=horario' },
    vista: (
      <div className="flex flex-col gap-2 w-full max-w-[240px]">
        <div className="rounded-xl bg-primary px-3 py-2 text-ink text-xs font-bold text-center shadow-sm">
          Salgo a almorzar
        </div>
        <div className="rounded-xl bg-white/90 border border-gray-200 px-3 py-2 text-ink text-xs font-semibold text-center shadow-sm">
          Termino mi jornada
        </div>
        <p className="text-[10px] text-ink/50 text-center mt-0.5">Lo que ve el colaborador al salir</p>
      </div>
    ),
  },
  {
    icono: MousePointerClick,
    titulo: 'Toca una marcación y ve todo el día',
    texto: 'En Registros, al hacer clic en cualquier fila se abre el detalle: a qué hora entró y salió, el almuerzo, el tiempo contado del día frente a lo que pedía su horario, y las fotos de verificación.',
    enlace: { texto: 'Ir a Registros', a: '/app/registros' },
    vista: (
      <div className="w-full max-w-[260px] rounded-xl bg-white/95 shadow-sm border border-gray-200 overflow-hidden text-[10px]">
        <div className="grid grid-cols-4 gap-1 px-2.5 py-1.5 bg-gray-50 text-[9px] font-semibold uppercase text-muted">
          <span>Entrada</span><span>Salida</span><span>Almuerzo</span><span>Llegada</span>
        </div>
        <div className="grid grid-cols-4 gap-1 px-2.5 py-2 items-center">
          <span className="font-mono text-green-700">08:00</span>
          <span className="font-mono text-red-600">17:10</span>
          <span className="font-mono text-gray-700">12:05→13:02</span>
          <Chip tono="bg-green-50 text-green-700">A tiempo</Chip>
        </div>
      </div>
    ),
  },
  {
    icono: MapPin,
    titulo: 'Varias sedes, cada una con su ubicación',
    texto: 'Si tienes más de un local, cada sede lleva su propia ubicación y su radio. Un colaborador puede tener varias asignadas, y los reportes se pueden filtrar por sede.',
    enlace: { texto: 'Configurar sedes', a: '/app/configuracion?tab=sedes' },
    vista: (
      <div className="flex flex-col gap-1.5 w-full max-w-[220px]">
        {['Sede principal', 'Bodega Norte', 'Punto Laureles'].map((s, i) => (
          <div key={s} className="flex items-center gap-2 rounded-lg bg-white/90 border border-gray-200 px-2.5 py-1.5 shadow-sm">
            <MapPin size={12} className="text-ink/40 shrink-0" />
            <span className="text-[11px] text-ink font-medium truncate">{s}</span>
            <span className="ml-auto text-[9px] text-muted shrink-0">{[150, 80, 200][i]} m</span>
          </div>
        ))}
      </div>
    ),
  },
  {
    icono: Timer,
    titulo: 'Tolerancia de salida',
    texto: 'Los minutos sueltos que alguien se queda de más sin que nadie los autorizara dejan de pagarse como hora extra. Si se queda de verdad, cuenta completo.',
    enlace: { texto: 'Ajustarla en Horario', a: '/app/configuracion?tab=horario' },
    vista: (
      <div className="w-full max-w-[240px] rounded-xl bg-white/95 border border-gray-200 shadow-sm px-3 py-2.5 text-[11px]">
        <p className="text-ink">Salida programada <b>17:00</b></p>
        <p className="text-muted mt-1">Marcó a las 17:08 · tolerancia 15 min</p>
        <p className="text-green-700 font-semibold mt-1.5">Se liquida hasta las 17:00</p>
      </div>
    ),
  },
  {
    icono: History,
    titulo: 'Cambiar un horario ya no mueve el pasado',
    texto: 'Cada día guarda lo que su horario exigía ESE día. Ajustar la hora de entrada hoy deja de llenar de tardanzas los meses anteriores ni de cambiar liquidaciones que ya entregaste.',
    vista: (
      <div className="flex flex-col gap-1.5 w-full max-w-[230px]">
        {[
          { mes: 'Julio', chip: 'Guardado ese día', tono: 'bg-green-50 text-green-700' },
          { mes: 'Agosto', chip: 'Guardado ese día', tono: 'bg-green-50 text-green-700' },
        ].map(x => (
          <div key={x.mes} className="flex items-center gap-2 rounded-lg bg-white/90 border border-gray-200 px-2.5 py-1.5 shadow-sm">
            <span className="text-[11px] text-ink font-medium">{x.mes}</span>
            <span className="ml-auto"><Chip tono={x.tono}>{x.chip}</Chip></span>
          </div>
        ))}
        <p className="text-[10px] text-ink/50 text-center mt-0.5">Sus reportes ya no cambian solos</p>
      </div>
    ),
  },
];

// `forzado` la abre desde el botón de ayuda del menú. Cerrarla sin querer no
// puede significar perderse lo que cambió.
export default function Novedades({ forzado = false, onCerrar }: { forzado?: boolean; onCerrar?: () => void }) {
  const { usuario } = useAuth();
  const navigate = useNavigate();
  const [cerrado, setCerrado] = useState(false);
  const [i, setI] = useState(0);
  const [noMostrar, setNoMostrar] = useState(false);

  // El efecto solo ESCRIBE en localStorage, que es un sistema externo. Al
  // usuario nuevo le toca el video de bienvenida, y estas novedades no le dicen
  // nada porque para él todo es nuevo: se marcan como vistas para que tampoco
  // le salten cuando cierre el video.
  useEffect(() => {
    if (!usuario || usuario.rol === 'SUPER_ADMIN') return;
    if (localStorage.getItem(`horapro_guia_vista_${usuario.id}`)) return;
    localStorage.setItem(vistaKey(usuario.id), '1');
  }, [usuario]);

  // Si se muestran o no se DERIVA, no se guarda en estado: son lecturas que no
  // cambian mientras la pantalla está viva.
  const solas = !!usuario
    && usuario.rol !== 'SUPER_ADMIN'
    && !localStorage.getItem(apagadoKey(usuario.id))
    && !localStorage.getItem(vistaKey(usuario.id))
    && !!localStorage.getItem(`horapro_guia_vista_${usuario.id}`);
  const abierto = !cerrado && (forzado || solas);

  const cerrar = () => {
    if (usuario) {
      localStorage.setItem(vistaKey(usuario.id), '1');
      if (noMostrar) localStorage.setItem(apagadoKey(usuario.id), '1');
    }
    setCerrado(true);
    onCerrar?.();
  };

  const irA = (a: string) => { cerrar(); navigate(a); };

  if (!abierto) return null;
  const n = NOVEDADES[i];
  const Icono = n.icono;
  const ultima = i === NOVEDADES.length - 1;

  return (
    <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4" onClick={cerrar}>
      <div
        onClick={e => e.stopPropagation()}
        className="hp-pop bg-white rounded-2xl w-full max-w-xl shadow-xl overflow-hidden"
      >
        <div className="flex items-center justify-between px-6 pt-5">
          <p className="text-[11px] font-bold uppercase tracking-wide text-muted">Novedades de HoraPro</p>
          <button onClick={cerrar} aria-label="Cerrar"><X size={18} className="text-gray-400" /></button>
        </div>

        {/* Vista previa sobre el amarillo de la marca */}
        <div className="mx-6 mt-3 rounded-xl bg-gradient-to-br from-primary/70 via-primary/40 to-amber-100 h-56 flex items-center justify-center p-5">
          {n.vista}
        </div>

        <div className="px-6 pt-5 pb-3">
          <h3 className="font-bold text-xl text-ink flex items-start gap-2.5">
            <Icono size={20} className="mt-1 shrink-0 text-ink/70" />
            {n.titulo}
          </h3>
          <p className="text-sm text-muted mt-1.5 leading-relaxed">{n.texto}</p>

          {n.enlace && (
            <button onClick={() => irA(n.enlace!.a)}
              className="mt-3 w-full flex items-center gap-2 bg-gray-50 hover:bg-gray-100 rounded-xl px-4 py-2.5 text-sm font-semibold text-ink transition-colors">
              {n.enlace.texto}
              <ChevronRight size={16} className="ml-auto text-gray-400" />
            </button>
          )}
        </div>

        <label className="flex items-center gap-2 px-6 pb-3 cursor-pointer">
          <input type="checkbox" checked={noMostrar} onChange={e => setNoMostrar(e.target.checked)}
            className="rounded accent-primary" />
          <span className="text-xs text-muted">No volver a mostrarme las novedades</span>
        </label>

        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-gray-100">
          <button onClick={() => setI(x => x - 1)} disabled={i === 0}
            className="px-4 py-2 rounded-xl border border-gray-300 text-sm font-semibold text-ink hover:bg-gray-50 disabled:opacity-0 disabled:pointer-events-none">
            Anterior
          </button>

          <div className="flex items-center gap-1.5">
            {NOVEDADES.map((_, k) => (
              <span key={k} className={`rounded-full transition-all ${k === i ? 'w-2 h-2 bg-ink' : 'w-1.5 h-1.5 bg-gray-300'}`} />
            ))}
          </div>

          <button onClick={() => (ultima ? cerrar() : setI(x => x + 1))}
            className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-dark text-ink text-sm font-bold">
            {ultima ? 'Listo' : 'Continuar'}
          </button>
        </div>
      </div>
    </div>
  );
}
