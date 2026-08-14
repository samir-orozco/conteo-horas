import { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

// Un solo calendario para elegir un rango o un día suelto, en vez de dos campos
// de fecha sueltos que no se hablan entre sí.
//
// Todo se maneja con cadenas "yyyy-MM-dd" y aritmética de año/mes/día, nunca con
// `new Date("2026-07-01")`: eso es medianoche UTC, que en Bogotá es el 30 de
// junio a las 7 p.m., y el rango se correría un día. Es un error que ya se pagó
// una vez en los reportes de este mismo producto.

const DIAS = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const MES_CORTO = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

const iso = (a: number, m: number, d: number) =>
  `${a}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
const partes = (s: string) => { const [a, m, d] = s.split('-').map(Number); return { a, m: m - 1, d }; };
const diasDelMes = (a: number, m: number) => new Date(a, m + 1, 0).getDate();
const primerDiaSemana = (a: number, m: number) => new Date(a, m, 1).getDay();

// Días entre dos fechas, ambas incluidas. Se cuenta a mediodía para que ningún
// cambio de hora pueda restar o sumar un día por redondeo.
const cuantosDias = (desde: string, hasta: string) => {
  const a = partes(desde), b = partes(hasta);
  const ms = new Date(b.a, b.m, b.d, 12).getTime() - new Date(a.a, a.m, a.d, 12).getTime();
  return Math.round(ms / 86400000) + 1;
};

const rotuloRango = (desde: string, hasta: string) => {
  const a = partes(desde), b = partes(hasta);
  if (desde === hasta) return `${a.d} ${MES_CORTO[a.m]} ${a.a}`;
  if (a.a === b.a && a.m === b.m) return `${a.d} – ${b.d} ${MES_CORTO[a.m]} ${a.a}`;
  if (a.a === b.a) return `${a.d} ${MES_CORTO[a.m]} – ${b.d} ${MES_CORTO[b.m]} ${a.a}`;
  return `${a.d} ${MES_CORTO[a.m]} ${a.a} – ${b.d} ${MES_CORTO[b.m]} ${b.a}`;
};

type Props = {
  desde: string;
  hasta: string;
  onCambiar: (desde: string, hasta: string) => void;
};

export default function SelectorRangoFechas({ desde, hasta, onCambiar }: Props) {
  const [abierto, setAbierto] = useState(false);
  const inicial = partes(desde);
  const [vista, setVista] = useState({ a: inicial.a, m: inicial.m });
  // Primer clic del rango. Mientras esté puesto, el calendario está "a medias".
  const [ancla, setAncla] = useState<string | null>(null);

  const hoy = new Date();
  const hoyIso = iso(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());

  const tocarDia = (d: string) => {
    if (!ancla) { setAncla(d); return; }
    // El orden no importa: se puede pintar de atrás hacia adelante.
    const [a, b] = ancla <= d ? [ancla, d] : [d, ancla];
    setAncla(null);
    onCambiar(a, b);
    setAbierto(false);
  };

  const atajo = (dias: number) => {
    const fin = new Date();
    const ini = new Date(); ini.setDate(ini.getDate() - (dias - 1));
    onCambiar(
      iso(ini.getFullYear(), ini.getMonth(), ini.getDate()),
      iso(fin.getFullYear(), fin.getMonth(), fin.getDate()),
    );
    setAncla(null);
    setAbierto(false);
  };

  const esteMes = () => {
    const h = new Date();
    onCambiar(iso(h.getFullYear(), h.getMonth(), 1), iso(h.getFullYear(), h.getMonth(), h.getDate()));
    setAncla(null);
    setAbierto(false);
  };

  const mover = (campo: 'm' | 'a', paso: number) => setVista(v => {
    if (campo === 'a') return { ...v, a: v.a + paso };
    const m = v.m + paso;
    if (m < 0) return { a: v.a - 1, m: 11 };
    if (m > 11) return { a: v.a + 1, m: 0 };
    return { ...v, m };
  });

  // Lo que se resalta mientras se elige: si hay ancla manda ella, si no el rango guardado.
  const ini = ancla ?? desde;
  const fin = ancla ?? hasta;
  const total = ancla ? 1 : cuantosDias(desde, hasta);

  const celdas: (number | null)[] = [
    ...Array(primerDiaSemana(vista.a, vista.m)).fill(null),
    ...Array.from({ length: diasDelMes(vista.a, vista.m) }, (_, i) => i + 1),
  ];

  return (
    <div className="relative">
      <button onClick={() => setAbierto(v => !v)}
        className={`flex items-center gap-2 border rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
          abierto ? 'border-primary bg-primary/10 text-ink' : 'border-gray-300 text-ink hover:bg-gray-50'}`}>
        <Calendar size={15} className="text-muted" />
        {rotuloRango(desde, hasta)}
      </button>

      {abierto && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => { setAbierto(false); setAncla(null); }} />
          <div className="absolute top-full mt-1 left-0 z-40 w-[310px] bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
            <div className="bg-primary px-4 py-3">
              <p className="text-xs font-semibold text-ink/60 capitalize">
                {MESES[vista.m]} {vista.a}
              </p>
              <p className="text-2xl font-bold text-ink leading-tight">
                {ancla ? 'Elige el día final' : `${total} ${total === 1 ? 'día' : 'días'}`}
              </p>
            </div>

            <div className="flex items-center justify-between px-3 py-2.5 text-sm">
              {([{ campo: 'm' as const, texto: 'Mes' }, { campo: 'a' as const, texto: 'Año' }]).map(n => (
                <div key={n.campo} className="flex items-center gap-1">
                  <button onClick={() => mover(n.campo, -1)} aria-label={`${n.texto} anterior`}
                    className="p-1 rounded-lg text-muted hover:bg-gray-100 hover:text-ink">
                    <ChevronLeft size={16} />
                  </button>
                  <span className="w-10 text-center font-semibold text-ink">{n.texto}</span>
                  <button onClick={() => mover(n.campo, 1)} aria-label={`${n.texto} siguiente`}
                    className="p-1 rounded-lg text-muted hover:bg-gray-100 hover:text-ink">
                    <ChevronRight size={16} />
                  </button>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 px-2 pb-1 text-[11px] font-semibold text-muted text-center">
              {DIAS.map((d, i) => <span key={i}>{d}</span>)}
            </div>

            <div className="grid grid-cols-7 px-2 pb-2 gap-y-0.5">
              {celdas.map((d, i) => {
                if (d === null) return <span key={`v${i}`} />;
                const f = iso(vista.a, vista.m, d);
                const esIni = f === ini, esFin = f === fin;
                const dentro = f > ini && f < fin;
                const esHoy = f === hoyIso;
                return (
                  <button key={f} onClick={() => tocarDia(f)}
                    className={`h-9 text-sm relative flex items-center justify-center transition-colors ${
                      dentro ? 'bg-primary/25 text-ink' : ''
                    } ${esIni && esFin ? 'rounded-full' : esIni ? 'rounded-l-full' : esFin ? 'rounded-r-full' : ''}`}>
                    <span className={`w-9 h-9 flex items-center justify-center rounded-full ${
                      esIni || esFin ? 'bg-primary text-ink font-bold'
                        : esHoy ? 'border border-primary text-ink font-semibold'
                        : 'text-ink hover:bg-gray-100'}`}>
                      {d}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-1.5 px-3 py-2.5 border-t border-gray-100 text-xs">
              <button onClick={esteMes} className="px-2.5 py-1.5 rounded-lg font-semibold text-ink hover:bg-gray-100">Este mes</button>
              <button onClick={() => atajo(7)} className="px-2.5 py-1.5 rounded-lg font-semibold text-ink hover:bg-gray-100">7 días</button>
              <button onClick={() => atajo(30)} className="px-2.5 py-1.5 rounded-lg font-semibold text-ink hover:bg-gray-100">30 días</button>
              {ancla && (
                <button onClick={() => setAncla(null)} className="ml-auto px-2.5 py-1.5 rounded-lg font-semibold text-red-500 hover:bg-red-50">
                  Cancelar
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
