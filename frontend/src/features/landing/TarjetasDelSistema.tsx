import { Calculator, ScanFace, FileSignature, MapPin, Crosshair, ShieldCheck, Smile, Clock, CalendarRange } from 'lucide-react';
import { Resaltado } from './Marcas';
import { VistaLiquidacion, VistaKiosco, VistaContratos, VistaSedes, VistaGeocerca, VistaAntifraude, VistaClima, VistaTardanzas, VistaTurnos } from './VistasDelSistema';

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
  // LA ÚLTIMA FILA (4 de octubre de 2026): la del clima quedaba sola y el dueño eligió acompañarla con
  // las tardanzas y los turnos. Las dos nuevas pasaron por una revisión que intentó demostrar que
  // prometían de más; sus textos son los que quedaron después de esa revisión.
  //
  // Tardanzas, en todos los planes. Dice «si la persona tiene horario» porque sin horario el kiosco no
  // sabe que llegó tarde, y «le pide el motivo» y no «sin motivo no marca»: el kiosco trae un motivo
  // escogido de entrada, así que pedir no es lo mismo que obligar a decir uno.
  // Y «te llega un aviso a la campana» y no «la novedad te queda en la campana»: la campana avisa, pero
  // la novedad se aprueba en la ficha de la persona.
  {
    etiqueta: 'Tardanzas', Icono: Clock, Vista: VistaTardanzas,
    titulo: 'La llegada tarde pide un motivo',
    texto: 'Si la persona tiene horario, el kiosco le pide el motivo antes de registrar una llegada tarde o una salida antes de hora, y te llega un aviso a la campana para que apruebes la novedad.',
  },
  // Clima laboral (4 de octubre de 2026), solo del plan Empresarial. Dice «confidencial» y no
  // «anónima»: la empresa no ve el nombre, pero el nombre se guarda cifrado. Tampoco promete
  // encuestas: son una segunda etapa que todavía no existe (docs/CLIMA_LABORAL.md).
  //
  // Corregida el mismo día: decía «quién lleva días seguidos mal» (la cuenta es de RESPUESTAS, por
  // decisión del dueño), «el ánimo por semana» (en los rangos cortos va por día) y «una observación
  // confidencial», que se leía como si toda observación lo fuera.
  {
    etiqueta: 'Clima laboral', Icono: Smile, Vista: VistaClima,
    titulo: 'Cómo le fue a tu equipo, en una carita',
    texto: 'Al marcar la salida, cada persona puede calificar su día con una carita y dejar una observación, con su nombre o confidencial. Tú ves el ánimo de tu equipo y quién lleva tres caritas seguidas en Muy mal o Mal.',
  },
  // Turnos, solo del plan Empresarial. Las rotaciones 6x1 y 4x2 son dos de los patrones del calendario
  // (pages/turnos/rotacion.ts), y el aviso es el grave de la previa: «Semanas que se pasarían del tope
  // de 42 horas».
  {
    etiqueta: 'Turnos', Icono: CalendarRange, Vista: VistaTurnos,
    titulo: 'Turnos con aviso de horas de más',
    texto: 'Programa el mes de cada persona con rotaciones como 6x1 o 4x2. Antes de aplicar, te avisa qué semanas pasarían del tope legal de 42 horas.',
  },
];

export default function TarjetasDelSistema() {
  return (
    <section id="funciones" aria-labelledby="titulo-funciones" className="bg-ink text-white scroll-mt-16">
      <div className="max-w-6xl mx-auto px-5 py-16 md:py-24">
        <div className="mb-12 hp-reveal">
          <h2 id="titulo-funciones" className="isolate text-3xl md:text-5xl font-extrabold tracking-tight leading-tight">
            Mira lo que hace HoraPro <Resaltado>por tu empresa</Resaltado>
          </h2>
          <p className="text-white/70 mt-4 text-lg">Nueve partes del sistema que te ahorran cuentas, reclamos y discusiones.</p>
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
