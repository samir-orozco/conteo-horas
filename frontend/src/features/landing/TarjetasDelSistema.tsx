import { Calculator, ScanFace, FileSignature, MapPin, Crosshair, ShieldCheck } from 'lucide-react';
import { Resaltado } from './Marcas';
import { VistaLiquidacion, VistaKiosco, VistaContratos, VistaSedes, VistaGeocerca, VistaAntifraude } from './VistasDelSistema';

// Las partes del sistema en la landing (14 de septiembre de 2026), con el formato de tarjeta que
// eligió el dueño: arriba un pedazo del producto, después el título, el texto y su etiqueta.
//
// Cada texto dice solo lo que el producto hace hoy. En antifraude no se promete lo que no hay:
// el reto de giro de cabeza no lo puede activar la empresa, y ni el rostro ni el GPS son
// infalibles (lo dice la propia pestaña de Marcación).
//
// Una idea por tarjeta (el dueño pidió menos texto el 14 de septiembre de 2026): al acortar no
// se agregó ninguna promesa, solo se quitó.
const PARTES = [
  {
    etiqueta: 'Nómina', Icono: Calculator, Vista: VistaLiquidacion,
    titulo: 'Liquida sin hacer cuentas',
    texto: 'Recargos, dominicales, festivos y horas extra calculados con la ley colombiana, listos para tu nómina.',
  },
  {
    etiqueta: 'Kiosco', Icono: ScanFace, Vista: VistaKiosco,
    titulo: 'Marcan con la cara, no con excusas',
    texto: 'Con reconocimiento facial o cédula, desde cualquier tablet o celular.',
  },
  {
    etiqueta: 'Contratos', Icono: FileSignature, Vista: VistaContratos,
    titulo: 'Tus contratos avisan antes de vencerse',
    texto: 'HoraPro te avisa antes de que un contrato a término fijo se prorrogue solo, y guarda sus documentos.',
  },
  {
    etiqueta: 'Sedes', Icono: MapPin, Vista: VistaSedes,
    titulo: 'Cada sede con su gente y sus reportes',
    texto: 'Asigna a cada persona sus sedes y filtra por sede los reportes de horas extra y llegadas tarde.',
  },
  {
    etiqueta: 'Geocerca', Icono: Crosshair, Vista: VistaGeocerca,
    titulo: 'Marcan solo dentro de su sede',
    texto: 'Desde su celular, pero solo dentro del radio de su sede. A quien trabaja remoto no se le pide ubicación.',
  },
  {
    etiqueta: 'Antifraude', Icono: ShieldCheck, Vista: VistaAntifraude,
    titulo: 'Marcar por otro deja rastro',
    texto: 'Cada marcación guarda la foto de quien marcó, y puedes permitir marcar solo desde tus dispositivos autorizados.',
  },
];

export default function TarjetasDelSistema() {
  return (
    <section id="funciones" aria-labelledby="titulo-funciones" className="bg-ink text-white">
      <div className="max-w-6xl mx-auto px-5 py-16 md:py-24">
        <div className="mb-12 hp-reveal">
          <h2 id="titulo-funciones" className="isolate text-3xl md:text-5xl font-extrabold tracking-tight leading-tight">
            Mira lo que hace HoraPro <Resaltado>por tu empresa</Resaltado>
          </h2>
          <p className="text-white/70 mt-4 text-lg">Seis partes del sistema que te ahorran cuentas, reclamos y discusiones.</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-12">
          {PARTES.map((p, i) => (
            <article key={p.titulo} className="hp-reveal flex flex-col" style={{ animationDelay: `${(i % 3) * 90}ms` }}>
              <div className="aspect-[16/11] rounded-2xl bg-gradient-to-br from-primary via-primary/80 to-amber-100 flex items-center justify-center p-6 overflow-hidden">
                <p.Vista />
              </div>
              <h3 className="text-2xl font-bold mt-6 leading-snug">{p.titulo}</h3>
              <p className="text-white/70 mt-2 leading-relaxed flex-1">{p.texto}</p>
              <span className="mt-5 self-start inline-flex items-center gap-2 rounded-lg border border-white/15 px-3 py-1.5 text-sm text-white/85">
                <p.Icono size={15} className="text-primary" /> {p.etiqueta}
              </span>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
