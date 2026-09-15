import { Calculator, Check, ScanFace, MapPin } from 'lucide-react';

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
