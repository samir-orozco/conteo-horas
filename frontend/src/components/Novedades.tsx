import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X, ChevronRight, FileSignature, Laptop, FileSpreadsheet, History, ListFilter,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { debeMostrarNovedades, vistaKey, apagadoKey, guiaKey } from './novedadesVisibles';

// Novedades de la versión: se muestran UNA vez por usuario al entrar.
//
// El lote se REEMPLAZA, no se acumula: quien está adentro ya vio el anterior, y
// repetírselo entierra lo que de verdad es nuevo. La decisión de mostrarlas y
// las llaves de localStorage viven en novedadesVisibles.ts, que sí tiene pruebas.

type Novedad = {
  icono: typeof FileSignature;
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
    icono: FileSignature,
    titulo: 'Tus contratos avisan antes de vencerse',
    texto: 'Un contrato a término fijo que no se preavisa con 30 días de anticipación se prorroga solo, por ley, por el mismo tiempo. HoraPro ahora lleva tus contratos, te avisa cuándo vence el preaviso y te deja adjuntar el documento y los otrosíes.',
    enlace: { texto: 'Ver mis contratos', a: '/app/colaboradores' },
    vista: (
      <div className="flex flex-col gap-1.5 w-full max-w-[250px]">
        {[
          { n: 'Ana Giraldo', chip: 'Preaviso en 12 días', tono: 'bg-amber-100 text-amber-800' },
          { n: 'Julián Torres', chip: 'Se prorrogó solo', tono: 'bg-red-100 text-red-700' },
          { n: 'Sofía Ramos', chip: 'Vigente', tono: 'bg-green-50 text-green-700' },
        ].map(x => (
          <div key={x.n} className="flex items-center gap-2 rounded-lg bg-white/90 border border-gray-200 px-2.5 py-1.5 shadow-sm">
            <span className="text-[11px] text-ink font-medium truncate">{x.n}</span>
            <span className="ml-auto shrink-0"><Chip tono={x.tono}>{x.chip}</Chip></span>
          </div>
        ))}
      </div>
    ),
  },
  {
    icono: Laptop,
    titulo: 'Quien trabaja desde la casa ya puede marcar',
    texto: 'Cada persona tiene su modalidad: presencial, híbrida o remota. Al remoto no se le pide ni se le mira la ubicación. Al híbrido no se le bloquea nunca, pero si está en una de tus sedes queda registrado en cuál. El presencial sigue igual que siempre.',
    enlace: { texto: 'Asignarla en Colaboradores', a: '/app/colaboradores' },
    vista: (
      <div className="flex flex-col gap-2 w-full max-w-[250px]">
        <div className="rounded-xl bg-white/95 border border-gray-200 px-3 py-2.5 shadow-sm">
          <p className="text-[9px] font-semibold uppercase text-muted mb-1.5">Modalidad de trabajo</p>
          <div className="flex gap-1.5">
            <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-white border border-gray-300 text-muted">Presencial</span>
            <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-primary/25 border border-primary text-ink">Híbrido</span>
            <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-white border border-gray-300 text-muted">Remoto</span>
          </div>
          <p className="text-[9px] text-muted mt-1.5 leading-snug">Puede marcar desde donde sea. Su ubicación solo registra la sede.</p>
        </div>
      </div>
    ),
  },
  {
    icono: FileSpreadsheet,
    titulo: 'Sube todo tu equipo con un Excel',
    texto: 'Descargas el formato, lo llenas y lo cargas. Los datos aparecen en una tabla que puedes corregir antes de guardar, y el horario y la sede se eligen aquí, no en el archivo: a una persona o a todas de una vez.',
    enlace: { texto: 'Probar la carga masiva', a: '/app/colaboradores' },
    vista: (
      <div className="w-full max-w-[265px] rounded-xl bg-white/95 shadow-sm border border-gray-200 overflow-hidden text-[10px]">
        <div className="grid grid-cols-3 gap-1 px-2.5 py-1.5 bg-gray-50 text-[9px] font-semibold uppercase text-muted">
          <span>Nombre</span><span>Cédula</span><span>Horario</span>
        </div>
        {[['Ana Giraldo', '1020304050'], ['Pedro Salazar', '1098765432']].map(([n, c]) => (
          <div key={c} className="grid grid-cols-3 gap-1 px-2.5 py-1.5 items-center border-t border-gray-100">
            <span className="text-ink truncate">{n}</span>
            <span className="font-mono text-gray-600">{c}</span>
            <span className="text-ink/60 truncate">Oficina</span>
          </div>
        ))}
        <div className="px-2.5 py-1.5 border-t border-gray-100 bg-red-50/60 text-[9px] text-red-700">
          Fila 4: la cédula ya existe
        </div>
      </div>
    ),
  },
  {
    icono: History,
    titulo: 'Cada persona tiene su historia completa',
    texto: 'La ficha del colaborador guarda su foto, cuándo entró, si se retiró y por qué, y si volvió. Con su soporte adjunto y su línea de tiempo, que es lo que necesitas el día que pidan un certificado laboral o llegue una inspección.',
    enlace: { texto: 'Abrir un colaborador', a: '/app/colaboradores' },
    vista: (
      <div className="flex flex-col gap-1.5 w-full max-w-[240px]">
        {[
          { t: 'Reingreso', f: '1 sep 2026', tono: 'bg-green-50 text-green-700' },
          { t: 'Retiro · Renuncia', f: '14 mar 2026', tono: 'bg-gray-100 text-gray-600' },
          { t: 'Ingreso', f: '2 ene 2024', tono: 'bg-green-50 text-green-700' },
        ].map(x => (
          <div key={x.f} className="flex items-center gap-2 rounded-lg bg-white/90 border border-gray-200 px-2.5 py-1.5 shadow-sm">
            <Chip tono={x.tono}>{x.t}</Chip>
            <span className="ml-auto text-[10px] text-muted shrink-0">{x.f}</span>
          </div>
        ))}
      </div>
    ),
  },
  {
    icono: ListFilter,
    titulo: 'Encuentra a quien buscas, no a todos',
    texto: 'La lista de colaboradores muestra su foto, su sede y cómo va su contrato. Y se filtra por sede o por estado del contrato, para responder de una "a quién le vence algo este mes" sin ir persona por persona.',
    enlace: { texto: 'Ir a Colaboradores', a: '/app/colaboradores' },
    vista: (
      <div className="w-full max-w-[235px] rounded-xl bg-white/95 border border-gray-200 shadow-sm p-2.5 text-[10px]">
        <p className="text-[9px] font-semibold uppercase text-muted mb-1.5">Contrato</p>
        {[['Requieren atención', true], ['Por vencer', true], ['Vigentes', false]].map(([txt, on]) => (
          <div key={String(txt)} className="flex items-center gap-2 py-1">
            <span className={`w-3 h-3 rounded border ${on ? 'bg-primary border-primary' : 'border-gray-300'}`} />
            <span className="text-ink">{txt}</span>
          </div>
        ))}
        <p className="text-[9px] text-muted text-center border-t border-gray-100 mt-1.5 pt-1.5">Limpiar filtros</p>
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
    if (localStorage.getItem(guiaKey(usuario.id))) return;
    localStorage.setItem(vistaKey(usuario.id), '1');
  }, [usuario]);

  // Si se muestran o no se DERIVA, no se guarda en estado: son lecturas que no
  // cambian mientras la pantalla está viva.
  const abierto = !cerrado && debeMostrarNovedades({
    rol: usuario?.rol ?? null,
    vioLaGuia: !!usuario && !!localStorage.getItem(guiaKey(usuario.id)),
    vioEstaVersion: !!usuario && !!localStorage.getItem(vistaKey(usuario.id)),
    apagadas: !!usuario && !!localStorage.getItem(apagadoKey(usuario.id)),
    forzado,
  });

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
    <div className="fixed inset-0 !mt-0 z-[60] bg-black/50 flex items-center justify-center p-4" onClick={cerrar}>
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
