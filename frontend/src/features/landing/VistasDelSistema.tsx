import { Calculator, Check, ScanFace, MapPin, Clock, CalendarOff, Bed, AlertTriangle, CheckCheck } from 'lucide-react';
import { CELDA_COLOR, PUNTO_COLOR, type ColorDeTurno } from '../../lib/coloresDeTurno';
import { progresoDelTope } from '../../pages/turnos/progresoDelTope';
import carita1 from '../../assets/caritas/carita-1.svg';
import carita2 from '../../assets/caritas/carita-2.svg';
import carita3 from '../../assets/caritas/carita-3.svg';
import carita4 from '../../assets/caritas/carita-4.svg';
import carita5 from '../../assets/caritas/carita-5.svg';

// Pedazos del producto para las tarjetas de la landing (14 de septiembre de 2026). Se arman
// con los mismos estilos de la app en vez de capturas: se ven nítidos en cualquier pantalla
// y no se quedan viejos cuando una pantalla cambia. Los datos son de ejemplo.

const Chip = ({ tono, children }: { tono: string; children: React.ReactNode }) => (
  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap ${tono}`}>{children}</span>
);

export function VistaLiquidacion() {
  return (
    <div className="w-full max-w-[240px] rounded-xl bg-white shadow-lg p-4 text-ink">
      <p className="text-[11px] text-muted flex items-center gap-1.5"><Calculator size={12} /> Total a pagar · agosto</p>
      <p className="text-2xl font-extrabold mt-0.5 tabular-nums">$ 2.101.591</p>
      <div className="mt-2.5 space-y-1 text-[11px]">
        {[['Salario base', '$ 1.750.000'], ['Recargo nocturno', '$ 58.340'], ['Dominicales y festivos', '$ 43.478'], ['Horas extra', '$ 249.773']].map(([concepto, valor]) => (
          <div key={concepto} className="flex justify-between gap-2">
            <span className="text-muted">{concepto}</span>
            <span className="font-medium tabular-nums">{valor}</span>
          </div>
        ))}
      </div>
      <p className="mt-2.5 flex items-center gap-1 text-[10px] font-medium text-green-700"><Check size={12} /> Calculado según la ley</p>
    </div>
  );
}

export function VistaKiosco() {
  return (
    <div className="w-full max-w-[210px] rounded-2xl bg-ink text-white shadow-lg p-3">
      <div className="relative aspect-[4/3] rounded-xl bg-white/10 flex items-center justify-center overflow-hidden">
        <svg viewBox="0 0 100 75" className="absolute inset-0 w-full h-full" aria-hidden="true">
          <ellipse cx="50" cy="37.5" rx="20" ry="27" fill="none" stroke="#4ade80" strokeWidth="1.6" />
        </svg>
        <ScanFace size={32} className="text-white/60" />
      </div>
      <div className="mt-2.5 rounded-lg bg-green-600 px-3 py-2 text-center">
        <p className="text-xs font-bold">¡Listo, Ana!</p>
        <p className="text-[10px] text-white/85">Entrada 7:58 a. m. · con foto</p>
      </div>
    </div>
  );
}

export function VistaContratos() {
  return (
    <div className="flex flex-col gap-1.5 w-full max-w-[250px]">
      {[
        { n: 'Ana Giraldo', chip: 'Preaviso en 12 días', tono: 'bg-amber-100 text-amber-800' },
        { n: 'Julián Torres', chip: 'Se prorrogó solo', tono: 'bg-red-100 text-red-700' },
        { n: 'Sofía Ramos', chip: 'Vigente', tono: 'bg-green-50 text-green-700' },
      ].map(x => (
        <div key={x.n} className="flex items-center gap-2 rounded-lg bg-white border border-gray-200 px-2.5 py-2 shadow-sm">
          <span className="text-[11px] text-ink font-medium truncate">{x.n}</span>
          <span className="ml-auto shrink-0"><Chip tono={x.tono}>{x.chip}</Chip></span>
        </div>
      ))}
    </div>
  );
}

export function VistaSedes() {
  return (
    <div className="w-full max-w-[240px] rounded-xl bg-white shadow-lg p-3.5 text-ink">
      <p className="text-[10px] font-semibold uppercase text-muted mb-1.5">Horas extra por sede</p>
      {[['Sede principal', '38 h', 'w-[80%]'], ['Norte', '21 h', 'w-[45%]'], ['Sur', '12 h', 'w-[26%]']].map(([sede, horas, ancho]) => (
        <div key={sede} className="py-1">
          <div className="flex justify-between text-[11px]">
            <span className="flex items-center gap-1"><MapPin size={11} className="text-muted" />{sede}</span>
            <span className="font-semibold tabular-nums">{horas}</span>
          </div>
          <div className="h-1.5 rounded-full bg-gray-100 mt-1"><div className={`h-full rounded-full bg-primary ${ancho}`} /></div>
        </div>
      ))}
    </div>
  );
}

export function VistaGeocerca() {
  return (
    <div className="relative w-full max-w-[240px] aspect-[4/3] rounded-xl bg-[#e6ece2] shadow-lg overflow-hidden">
      <svg viewBox="0 0 120 90" className="absolute inset-0 w-full h-full" aria-hidden="true">
        <path d="M0 28 H120 M0 64 H120 M36 0 V90 M86 0 V90" stroke="#ffffff" strokeWidth="6" />
        <circle cx="60" cy="46" r="27" fill="rgba(255,216,94,0.35)" stroke="#F0C63F" strokeWidth="1.5" strokeDasharray="4 3" />
      </svg>
      <MapPin size={22} className="absolute left-1/2 top-[52%] -translate-x-1/2 -translate-y-full text-red-500" />
      <span className="absolute left-2 bottom-2 rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-ink shadow">Radio 150 m</span>
      <span className="absolute right-2 top-2"><Chip tono="bg-green-100 text-green-800">Dentro de la sede</Chip></span>
    </div>
  );
}

export function VistaAntifraude() {
  return (
    <div className="w-full max-w-[240px] rounded-xl bg-white shadow-lg p-3.5 text-ink">
      <p className="text-[10px] font-semibold uppercase text-muted mb-2">Revisión de marcaciones</p>
      <div className="grid grid-cols-3 gap-1.5">
        {['7:58', '8:02', '8:05'].map(hora => (
          <div key={hora} className="rounded-md bg-ink aspect-square flex flex-col items-center justify-center text-white/70">
            <ScanFace size={16} />
            <span className="text-[9px] mt-0.5 tabular-nums">{hora}</span>
          </div>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-1">
        <Chip tono="bg-green-50 text-green-700">Dispositivo autorizado</Chip>
        <Chip tono="bg-gray-100 text-gray-700">Con foto</Chip>
      </div>
    </div>
  );
}

// La ventana de las caritas del kiosco en pequeño (4 de octubre de 2026): copia de
// pages/marcador/pantallas/PantallaClima.tsx con un «Mal» escogido, que es el que abre los motivos.
// Si la ventana real cambia, esta tiene que cambiar con ella.
export function VistaClima() {
  const escogida = 2;
  return (
    <div className="w-full max-w-[240px] rounded-2xl bg-ink shadow-lg p-2.5">
      <div className="rounded-[18px] border border-white/10 bg-white/[0.06] p-3 text-center">
        <p className="text-[10px] font-semibold text-green-400 flex items-center justify-center gap-1">
          <Check size={11} /> Salida registrada · 5:42 p. m.
        </p>
        <p className="text-[13px] font-bold text-white mt-1">¿Cómo te fue hoy, Ana?</p>
        <div className="flex justify-between mt-2.5 px-0.5">
          {[carita1, carita2, carita3, carita4, carita5].map((src, i) => (
            <span
              key={src}
              className={`rounded-full p-0.5 ${i + 1 === escogida ? 'scale-110 ring-[1.5px] ring-white' : 'opacity-40'}`}
            >
              <img src={src} alt="" className="w-7 h-7" draggable={false} />
            </span>
          ))}
        </div>
        <p className="mt-1 text-[11px] font-bold text-white">Mal</p>
        <p className="mt-1 text-[9px] text-white/60">¿Qué pasó? Puedes marcar varios</p>
        <div className="mt-1 flex flex-wrap justify-center gap-1">
          {['Mucho trabajo', 'Compañeros', 'Otro'].map(m => (
            <span
              key={m}
              className={`rounded-full border px-1.5 py-0.5 text-[9px] font-medium whitespace-nowrap ${
                m === 'Mucho trabajo' ? 'bg-primary border-primary text-ink' : 'border-white/20 text-white/80'}`}
            >
              {m}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// La campana del panel en pequeño (4 de octubre de 2026): copia de
// features/notificaciones/PanelNotificaciones.tsx —su caja, su encabezado con «Todas / No leídas», sus
// filas y su pie— con los dos avisos que deja una llegada tarde con su motivo. Los textos son los que
// escribe el servidor (routes/worker.ts), letra por letra, incluido el tipo de la novedad en mayúsculas
// entre paréntesis: así lo pinta hoy la aplicación, y la vista no puede mostrar uno más pulido.
// Una revisión adversarial comparó esta vista contra la pantalla real el mismo día.
export function VistaTardanzas() {
  const avisos = [
    { Icono: Clock, titulo: 'Ana Giraldo llegó tarde', cuerpo: 'Marcó entrada con 17 min de retraso.' },
    { Icono: CalendarOff, titulo: 'Novedad por aprobar: Ana Giraldo', cuerpo: 'Reportó una novedad (PERSONAL) pendiente de tu aprobación.' },
  ];
  return (
    <div className="w-full max-w-[250px] rounded-2xl bg-white shadow-lg border border-gray-200/70 overflow-hidden text-ink">
      <div className="flex items-center justify-between px-3 pt-2 pb-1.5 border-b border-gray-100">
        <p className="font-bold text-[12px]">Notificaciones</p>
        <div className="flex items-center gap-0.5 bg-gray-100 rounded-full p-0.5 text-[8px] font-medium">
          <span className="px-1.5 py-0.5 rounded-full bg-white shadow-sm">Todas</span>
          <span className="px-1.5 py-0.5 text-muted">No leídas</span>
        </div>
      </div>
      {avisos.map(({ Icono, titulo, cuerpo }) => (
        <div key={titulo} className="flex gap-2 px-3 py-1.5 border-b border-gray-50">
          <span className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center bg-amber-100 text-amber-600">
            <Icono size={12} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold leading-snug">{titulo}</p>
            <p className="text-[9px] text-muted mt-0.5 leading-snug">{cuerpo}</p>
            <p className="text-[8px] text-gray-400 mt-0.5">hace 2 minutos</p>
          </div>
          <span className="shrink-0 self-center w-2 h-2 rounded-full bg-green-500" />
        </div>
      ))}
      <p className="px-3 py-1 text-[9px] font-medium text-primary-dark flex items-center justify-center gap-1">
        <CheckCheck size={10} /> Marcar todas como leídas
      </p>
    </div>
  );
}

// Una semana del calendario de turnos en pequeño (4 de octubre de 2026), copiada de
// pages/turnos/CalendarioDeTurnos.tsx y revisada contra ella el mismo día:
// - el rótulo de la semana sin el año, como `rangoBreve`, y los días con `abreviaturaDeDia`;
// - la celda de un turno con su fondo claro y su punto (CELDA_COLOR y PUNTO_COLOR, no clases a mano);
// - el descanso con su cama y la palabra debajo;
// - el total «40 h de 42 h» con la barra de `progresoDelTope`, la misma función del calendario;
// - y aparte, la ventana «Antes de aplicar» con su aviso grave, que es donde la app avisa del tope. La
//   rejilla dice lo que hay hoy (Julián en 38 h) y el aviso lo que quedaría al aplicar (46 h): mezclar
//   las dos cosas en la misma fila diría algo que la pantalla no dice.
// Se ven tres días y no siete: con más, «Mañana» no cabe ni recortado. Los datos son de ejemplo.
export function VistaTurnos() {
  const TURNO: Record<string, [string, ColorDeTurno]> = { M: ['Mañana', 'esmeralda'], T: ['Tarde', 'ambar'], N: ['Noche', 'cobalto'] };
  const filas = [
    { n: 'Ana Giraldo', celdas: ['M', null, 'M'], horas: 40 },
    { n: 'Julián Torres', celdas: ['N', 'N', 'N'], horas: 38 },
    { n: 'Sofía Ramos', celdas: ['T', 'T', null], horas: 36 },
  ];
  const columnas = 'grid grid-cols-[44px_repeat(3,1fr)_52px] items-center gap-1';
  return (
    <div className="w-full max-w-[262px] rounded-xl bg-white shadow-lg p-2.5 text-ink">
      <p className="text-[10px] font-bold">5 oct – 11 oct</p>
      <div className={`${columnas} mt-1 text-[8px] font-semibold text-muted`}>
        <span />
        {['Lun 5', 'Mar 6', 'Mié 7'].map(d => <span key={d} className="text-center">{d}</span>)}
        <span className="text-center">Semana</span>
      </div>
      <div className="mt-0.5 space-y-1">
        {filas.map(f => {
          const p = progresoDelTope(f.horas * 60, 42 * 60);
          return (
            <div key={f.n} className={columnas}>
              <span className="text-[9px] font-medium truncate">{f.n}</span>
              {f.celdas.map((c, i) => c ? (
                <span key={i} className={`flex h-[22px] min-w-0 items-center gap-0.5 rounded-md px-1 text-[8px] font-bold ${CELDA_COLOR[TURNO[c][1]]}`}>
                  <span aria-hidden="true" className={`h-[5px] w-[5px] shrink-0 rounded-full ${PUNTO_COLOR[TURNO[c][1]]}`} />
                  <span className="truncate">{TURNO[c][0]}</span>
                </span>
              ) : (
                <span key={i} className="flex h-[22px] flex-col items-center justify-center rounded-md bg-gray-100 text-[7px] font-medium text-muted leading-none">
                  <Bed size={8} aria-hidden="true" /> Descanso
                </span>
              ))}
              <div>
                <span className="block whitespace-nowrap text-[9px] leading-none tabular-nums">
                  <b className={p.pasa ? 'text-red-600' : ''}>{f.horas} h</b> <span className="text-muted">de 42 h</span>
                </span>
                <span className="mt-0.5 block h-1 rounded-full bg-gray-200 overflow-hidden">
                  <span className={`block h-full rounded-full ${p.pasa ? 'bg-red-500' : 'bg-primary-dark'}`} style={{ width: `${p.ancho}%` }} />
                </span>
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-2 rounded-lg border border-rose-200 bg-rose-50 p-1.5 text-rose-900">
        <p className="text-[8px] font-semibold uppercase text-rose-700/80 mb-0.5">Antes de aplicar</p>
        <div className="flex items-start gap-1.5">
          <span className="grid h-4 w-4 shrink-0 place-items-center rounded-full bg-rose-100 text-rose-600">
            <AlertTriangle size={9} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-[9px] font-bold leading-snug">Semanas que se pasarían del tope de 42 horas</p>
            <ul className="list-disc pl-3 text-[8.5px] leading-snug">
              <li>Julián Torres, semana del 5 de octubre: <b>46 h</b></li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
