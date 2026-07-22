import type { ReactNode } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  UserCheck, LogOut, AlarmClock, UserX, CalendarOff, CalendarDays, Cake, Camera, Paperclip,
} from 'lucide-react';
import { TIPO_PERMISO_LABEL } from '../../../constants/permisos';
import { fmtMin, fmtHora, haceCuanto, diasHasta, MESES } from '../helpers';
import type { Dash, Salida, Novedad } from '../types';

// Contenedor común de todas las tarjetas del dashboard.
function Tarjeta({ icon, titulo, children }: { icon: ReactNode; titulo: string; children: ReactNode }) {
  return (
    <div className="bg-white rounded-card border border-gray-200 p-5">
      <p className="font-semibold text-ink mb-3 flex items-center gap-2">{icon} {titulo}</p>
      {children}
    </div>
  );
}
const Lista = ({ children }: { children: ReactNode }) => <div className="space-y-2 max-h-64 overflow-y-auto pr-1">{children}</div>;
const Vacio = ({ children, verde }: { children: ReactNode; verde?: boolean }) => <p className={`text-sm ${verde ? 'text-green-700' : 'text-muted'}`}>{children}</p>;

export function EnPlantaCard({ items }: { items: Dash['enPlanta'] }) {
  return (
    <Tarjeta icon={<UserCheck size={16} className="text-green-600" />} titulo="En planta ahora">
      {items.length === 0 ? <Vacio>Nadie tiene un turno abierto en este momento.</Vacio> : (
        <Lista>
          {items.map(e => (
            <div key={e.id} className="flex items-center gap-3 bg-green-50 rounded-xl px-3.5 py-2.5">
              <span className="w-2 h-2 rounded-full bg-green-500 shrink-0 hp-ripple" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-ink truncate">{e.nombre}</p>
                <p className="text-xs text-muted">{e.cargo || 'Sin cargo'}</p>
              </div>
              <span className="text-xs text-green-700 font-medium">{haceCuanto(e.desde)}</span>
            </div>
          ))}
        </Lista>
      )}
    </Tarjeta>
  );
}

export function SalidasCard({ items, onVerFotos }: { items: Dash['salidasRecientes']; onVerFotos: (s: Salida) => void }) {
  return (
    <Tarjeta icon={<LogOut size={16} className="text-red-500" />} titulo="Salidas de hoy">
      {items.length === 0 ? <Vacio>Nadie ha marcado salida hoy todavía.</Vacio> : (
        <Lista>
          {items.map(s => (
            <button key={s.registroId} onClick={() => onVerFotos(s)}
              className="w-full flex items-center gap-3 bg-red-50 hover:bg-red-100 rounded-xl px-3.5 py-2.5 text-left transition-colors">
              <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-ink truncate">{s.nombre}</p>
                <p className="text-xs text-muted">{s.cargo || 'Sin cargo'}</p>
              </div>
              {s.tieneFotoSalida && <Camera size={14} className="text-red-400 shrink-0" />}
              <span className="text-xs text-red-700 font-medium font-mono">{fmtHora(s.salida)}</span>
            </button>
          ))}
        </Lista>
      )}
    </Tarjeta>
  );
}

export function LlegadasTardeCard({ items }: { items: Dash['llegadasTardeHoy'] }) {
  return (
    <Tarjeta icon={<AlarmClock size={16} className="text-orange-500" />} titulo="Llegadas tarde hoy">
      {items.length === 0 ? <Vacio verde>Nadie ha llegado tarde hoy ✓</Vacio> : (
        <Lista>
          {items.map(t => (
            <div key={t.id} className="flex items-center gap-3 bg-orange-50 rounded-xl px-3.5 py-2.5">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-ink truncate">{t.nombre}</p>
                <p className="text-xs text-muted">Llegó a las {t.horaLlegada}</p>
              </div>
              <span className="text-xs font-bold text-orange-700">{fmtMin(t.minutosTarde)} tarde</span>
            </div>
          ))}
        </Lista>
      )}
    </Tarjeta>
  );
}

export function SinMarcarCard({ items }: { items: Dash['sinMarcarHoy'] }) {
  return (
    <Tarjeta icon={<UserX size={16} className="text-red-500" />} titulo="Aún no han marcado entrada">
      {items.length === 0 ? <Vacio>Todos los que debían entrar ya marcaron.</Vacio> : (
        <Lista>
          {items.map(s => (
            <div key={s.id} className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 ${s.novedad ? 'bg-amber-50' : 'bg-red-50'}`}>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-ink truncate">{s.nombre}</p>
                <p className="text-xs text-muted">{s.horario} · entrada {s.horaEntrada}</p>
              </div>
              {s.novedad ? (
                <span className="text-xs font-semibold text-amber-700 bg-amber-100 px-2.5 py-1 rounded-full shrink-0">
                  {TIPO_PERMISO_LABEL[s.novedad] ?? 'En novedad'}
                </span>
              ) : (
                <span className="text-xs font-medium text-red-600 shrink-0">sin entrada</span>
              )}
            </div>
          ))}
        </Lista>
      )}
    </Tarjeta>
  );
}

export function NovedadesCard({ items, onVer }: { items: Dash['novedadesHoy']; onVer: (n: Novedad) => void }) {
  return (
    <Tarjeta icon={<CalendarOff size={16} />} titulo="Novedades de hoy">
      {items.length === 0 ? <Vacio>Sin vacaciones, incapacidades ni licencias hoy.</Vacio> : (
        <div className="space-y-2">
          {items.map(n => (
            <button key={n.id} onClick={() => onVer(n)}
              className="w-full flex items-center gap-3 bg-gray-50 hover:bg-gray-100 rounded-xl px-3.5 py-2.5 text-left transition-colors">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-ink truncate">{n.colaborador}</p>
                <p className="text-xs text-muted flex items-center gap-1.5">
                  {TIPO_PERMISO_LABEL[n.tipo] ?? n.tipo}
                  {n.evidenciaTipo && <Paperclip size={11} className="text-primary-dark" />}
                  {!n.aprobado && <span className="text-orange-600 font-semibold">· pendiente</span>}
                </p>
              </div>
              <span className="text-xs text-muted shrink-0">hasta {format(new Date(n.fechaFin), 'd MMM', { locale: es })}</span>
            </button>
          ))}
        </div>
      )}
    </Tarjeta>
  );
}

export function FestivosCard({ items }: { items: Dash['proximosFestivos'] }) {
  return (
    <Tarjeta icon={<CalendarDays size={16} />} titulo="Próximos festivos">
      {items.length === 0 ? <Vacio>No hay festivos en los próximos 45 días.</Vacio> : (
        <div className="grid sm:grid-cols-2 gap-3">
          {items.map((f, i) => (
            <div key={i} className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3">
              <div className="bg-primary/40 rounded-lg w-11 h-11 flex flex-col items-center justify-center shrink-0">
                <span className="text-sm font-bold text-ink leading-none">{format(new Date(f.fecha), 'd')}</span>
                <span className="text-[10px] text-ink/70 uppercase">{format(new Date(f.fecha), 'MMM', { locale: es })}</span>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-ink truncate">{f.nombre}</p>
                <p className="text-xs text-muted">{diasHasta(f.fecha)}{f.propio ? ' · propio' : ''}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </Tarjeta>
  );
}

export function CumpleanosCard({ items }: { items: Dash['cumpleanos'] }) {
  return (
    <Tarjeta icon={<Cake size={16} className="text-pink-500" />} titulo="Cumpleaños del mes">
      {items.length === 0 ? <Vacio>Nadie cumple años este mes (o falta registrar la fecha de nacimiento).</Vacio> : (
        <div className="space-y-2">
          {items.map(c => (
            <div key={c.id} className={`flex items-center gap-3 rounded-xl px-4 py-2.5 ${c.esHoy ? 'bg-pink-50 border border-pink-200' : 'bg-gray-50'}`}>
              <div className="bg-pink-100 rounded-lg w-11 h-11 flex flex-col items-center justify-center shrink-0">
                <span className="text-sm font-bold text-pink-700 leading-none">{c.dia}</span>
                <span className="text-[10px] text-pink-600 uppercase">{MESES[c.mes]}</span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-ink truncate">{c.nombre}</p>
                <p className="text-xs text-muted">{c.cargo || 'Sin cargo'}</p>
              </div>
              {c.esHoy && <span className="flex items-center gap-1 text-xs font-bold text-pink-700"><Cake size={13} /> ¡Hoy!</span>}
            </div>
          ))}
        </div>
      )}
    </Tarjeta>
  );
}
