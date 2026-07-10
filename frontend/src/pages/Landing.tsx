import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Calculator, ScanFace, CalendarCheck, AlarmClock,
  ArrowRight, Check, ChevronDown, ShieldCheck, MapPin, MonitorSmartphone, Sparkles,
} from 'lucide-react';
import logoCompleto from '../assets/logo-completo.svg';
import GeoArt from '../components/GeoArt';
import CreditoKrumlab from '../components/CreditoKrumlab';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';

const cop = (n: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);

type Precios = { precioTramo1: number; limiteTramo1: number; precioTramo2: number; diasPrueba: number };

// Aparición al hacer scroll: agrega .hp-in a los .hp-reveal cuando entran en viewport
function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll('.hp-reveal');
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('hp-in'); io.unobserve(e.target); } });
    }, { threshold: 0.15 });
    els.forEach(el => io.observe(el));
    return () => io.disconnect();
  }, []);
}

const BENEFICIOS = [
  { icon: Calculator, titulo: 'Liquidación automática', texto: 'Recargos nocturnos, dominicales, festivos y horas extra calculados solos, según la ley vigente.' },
  { icon: ScanFace, titulo: 'Registro facial', texto: 'Tus colaboradores marcan entrada y salida con su rostro, en cualquier tablet o celular. Sin comprar equipos.' },
  { icon: AlarmClock, titulo: 'Llegadas tarde y planta', texto: 'Ve en tiempo real quién está adentro, quién llegó tarde y quién no marcó.' },
  { icon: CalendarCheck, titulo: 'Ley y festivos al día', texto: 'Jornada de 42h, recargos de la Ley 2466 y festivos colombianos, siempre actualizados.' },
];

const FAQ = [
  { q: '¿Necesito comprar algún equipo?', a: 'No. HoraPro funciona en cualquier tablet, computador o celular con navegador. El colaborador marca con su rostro o su cédula en el link del kiosco.' },
  { q: '¿Cómo marcan los colaboradores?', a: 'Con su número de cédula o con reconocimiento facial en la pantalla del kiosco, desde cualquier tablet o celular con cámara.' },
  { q: '¿La prueba gratis tiene límites?', a: `Tienes acceso completo por ${''}7 días, sin tarjeta y sin restricciones. Al terminar decides si continúas.` },
  { q: '¿Se ajusta a la ley laboral colombiana?', a: 'Sí. Aplica la jornada máxima vigente, los recargos de la reforma laboral (Ley 2466) y genera los festivos automáticamente.' },
  { q: '¿Cómo se paga?', a: 'Con Wompi: tarjeta, PSE o Nequi. El cobro es mensual por colaborador activo y puedes cancelar cuando quieras.' },
];

function Cuenta({ children }: { children: React.ReactNode }) {
  return <span className="tabular-nums">{children}</span>;
}

export default function Landing() {
  const { usuario } = useAuth();
  const [precios, setPrecios] = useState<Precios | null>(null);
  const [faqAbierto, setFaqAbierto] = useState<number | null>(0);
  useReveal();

  useEffect(() => { api.get('/auth/precios').then(r => setPrecios(r.data)).catch(() => {}); }, []);

  const dias = precios?.diasPrueba ?? 7;
  const panelUrl = usuario?.rol === 'SUPER_ADMIN' ? '/admin' : '/app';

  return (
    <div className="min-h-screen bg-white text-ink overflow-x-hidden">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
          <img src={logoCompleto} alt="HoraPro" className="h-8" />
          <nav className="flex items-center gap-2 sm:gap-3">
            <a href="#precios" className="hidden sm:block text-sm font-medium text-muted hover:text-ink px-3 py-2">Precios</a>
            {usuario ? (
              <Link to={panelUrl} className="text-sm font-bold bg-primary hover:bg-primary-dark text-ink px-4 py-2 rounded-xl">Ir a mi panel</Link>
            ) : (
              <>
                <Link to="/login" className="text-sm font-semibold text-ink px-4 py-2 rounded-xl hover:bg-gray-100">Iniciar sesión</Link>
                <Link to="/registro" className="text-sm font-bold bg-primary hover:bg-primary-dark text-ink px-4 py-2 rounded-xl">Prueba gratis</Link>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative max-w-6xl mx-auto px-5 pt-12 pb-16 md:pt-20 md:pb-24 grid md:grid-cols-2 gap-10 items-center">
        <div className="relative z-10">
          <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide bg-primary/30 text-ink px-3 py-1.5 rounded-full mb-5">
            <Sparkles size={13} /> Hecho para Colombia
          </span>
          <h1 className="text-4xl md:text-5xl font-extrabold leading-[1.08] tracking-tight">
            Liquida las horas de tu equipo <span className="relative sm:whitespace-nowrap">
              <span className="relative z-10">sin hacer cuentas</span>
              <span className="absolute left-0 bottom-1 h-3 w-full bg-primary/60 -z-0" />
            </span>.
          </h1>
          <p className="text-lg text-muted mt-5 max-w-md">
            Recargos nocturnos, dominicales, festivos y horas extra calculados automáticamente. Tú solo marcas entrada y salida.
          </p>
          <div className="flex flex-wrap items-center gap-3 mt-8">
            {usuario ? (
              <Link to={panelUrl} className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-ink font-bold px-6 py-3.5 rounded-xl text-base">
                Ir a mi panel <ArrowRight size={18} />
              </Link>
            ) : (
              <Link to="/registro" className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-ink font-bold px-6 py-3.5 rounded-xl text-base">
                Prueba gratis {dias} días <ArrowRight size={18} />
              </Link>
            )}
            <a href="#como" className="font-semibold text-ink px-5 py-3.5 rounded-xl hover:bg-gray-100">Ver cómo funciona</a>
          </div>
          {!usuario && <p className="text-xs text-muted mt-3">Sin tarjeta · sin instalar nada · listo en minutos</p>}
        </div>
        <div className="relative h-80 md:h-96">
          <GeoArt className="absolute inset-0" />
          {/* Tarjeta flotante de muestra */}
          <div className="hp-float absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-xl border border-gray-100 p-5 w-64">
            <p className="text-xs text-muted flex items-center gap-1.5"><Calculator size={13} /> Total a pagar · junio</p>
            <p className="text-3xl font-extrabold mt-1"><Cuenta>{cop(2101591)}</Cuenta></p>
            <div className="mt-3 space-y-1.5 text-xs">
              <div className="flex justify-between"><span className="text-muted">Recargos</span><span className="font-medium">{cop(101818)}</span></div>
              <div className="flex justify-between"><span className="text-muted">Horas extra</span><span className="font-medium">{cop(249773)}</span></div>
              <div className="flex justify-between border-t border-gray-100 pt-1.5"><span className="text-muted">Salario base</span><span className="font-medium">{cop(1750000)}</span></div>
            </div>
            <div className="mt-3 flex items-center gap-1.5 text-[11px] text-green-700 font-medium"><Check size={13} /> Calculado automáticamente</div>
          </div>
        </div>
      </section>

      {/* Franja de confianza */}
      <section className="border-y border-gray-100 bg-[#f6f6f4]">
        <div className="max-w-6xl mx-auto px-5 py-4 flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-sm text-muted">
          <span className="flex items-center gap-1.5"><ShieldCheck size={15} className="text-ink" /> Ley 2466 al día</span>
          <span className="flex items-center gap-1.5"><MapPin size={15} className="text-ink" /> Datos en Colombia</span>
          <span className="flex items-center gap-1.5"><MonitorSmartphone size={15} className="text-ink" /> Sin instalar nada</span>
          <span className="flex items-center gap-1.5"><CalendarCheck size={15} className="text-ink" /> {dias} días gratis</span>
        </div>
      </section>

      {/* Beneficios */}
      <section className="max-w-6xl mx-auto px-5 py-16 md:py-24">
        <div className="text-center max-w-xl mx-auto mb-12 hp-reveal">
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight">Todo el control horario, resuelto</h2>
          <p className="text-muted mt-3">Deja las hojas de cálculo. HoraPro se encarga del cálculo y tú de tu negocio.</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {BENEFICIOS.map((b, i) => (
            <div key={b.titulo} className="hp-reveal bg-white border border-gray-200 rounded-2xl p-6" style={{ animationDelay: `${i * 80}ms` }}>
              <div className="bg-primary/30 w-12 h-12 rounded-xl flex items-center justify-center mb-4">
                <b.icon size={22} className="text-ink" />
              </div>
              <h3 className="font-bold text-lg">{b.titulo}</h3>
              <p className="text-sm text-muted mt-1.5">{b.texto}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Cómo funciona */}
      <section id="como" className="bg-ink text-white">
        <div className="max-w-6xl mx-auto px-5 py-16 md:py-24">
          <div className="text-center max-w-xl mx-auto mb-12 hp-reveal">
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight">Tres pasos, cero enredos</h2>
            <p className="text-white/70 mt-3">Desde que el colaborador marca hasta que liquidas la nómina.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { n: '1', icon: ScanFace, t: 'Marca', d: 'El colaborador registra entrada y salida con su rostro o su cédula en el kiosco.' },
              { n: '2', icon: AlarmClock, t: 'Controla', d: 'Ves en tiempo real quién está en planta, tardanzas y novedades del día.' },
              { n: '3', icon: Calculator, t: 'Liquida', d: 'HoraPro calcula recargos y horas extra listos para tu nómina.' },
            ].map((p, i) => (
              <div key={p.n} className="hp-reveal relative bg-white/5 border border-white/10 rounded-2xl p-6" style={{ animationDelay: `${i * 100}ms` }}>
                <div className="flex items-center gap-3 mb-3">
                  <span className="bg-primary text-ink font-extrabold w-9 h-9 rounded-full flex items-center justify-center">{p.n}</span>
                  <p.icon size={22} className="text-primary" />
                </div>
                <h3 className="font-bold text-xl">{p.t}</h3>
                <p className="text-white/70 mt-1.5 text-sm">{p.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Precios */}
      <section id="precios" className="max-w-3xl mx-auto px-5 py-16 md:py-24">
        <div className="text-center mb-10 hp-reveal">
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight">Precio simple, por colaborador</h2>
          <p className="text-muted mt-3">Pagas solo por quienes marcan. Sin costos de instalación.</p>
        </div>
        <div className="hp-reveal bg-white border-2 border-primary rounded-3xl p-8 text-center shadow-sm">
          {precios ? (
            <>
              <p className="text-5xl font-extrabold">{cop(precios.precioTramo1)}<span className="text-lg font-medium text-muted"> /colaborador al mes</span></p>
              <p className="text-muted mt-3">
                Primeros {precios.limiteTramo1} colaboradores. Del {precios.limiteTramo1 + 1} en adelante,
                solo <b className="text-ink">{cop(precios.precioTramo2)}</b> cada uno.
              </p>
              <div className="mt-6 space-y-2 text-sm text-left max-w-xs mx-auto">
                {['Marcación ilimitada por cédula', 'Liquidación de recargos y extras', 'Reportes y control de tardanzas', 'Festivos y jornada de ley al día'].map(f => (
                  <div key={f} className="flex items-center gap-2"><Check size={16} className="text-green-600 shrink-0" /> {f}</div>
                ))}
              </div>
              <Link to="/registro" className="inline-flex items-center gap-2 bg-primary hover:bg-primary-dark text-ink font-bold px-7 py-3.5 rounded-xl text-base mt-8">
                Empezar {dias} días gratis <ArrowRight size={18} />
              </Link>
              <p className="text-xs text-muted mt-3">No se cobra durante la prueba.</p>
            </>
          ) : (
            <p className="text-muted py-10">Cargando precios...</p>
          )}
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-2xl mx-auto px-5 pb-16 md:pb-24">
        <h2 className="text-3xl font-extrabold tracking-tight text-center mb-10 hp-reveal">Preguntas frecuentes</h2>
        <div className="space-y-3">
          {FAQ.map((f, i) => (
            <div key={i} className="hp-reveal border border-gray-200 rounded-2xl overflow-hidden">
              <button onClick={() => setFaqAbierto(faqAbierto === i ? null : i)}
                className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left font-semibold hover:bg-gray-50">
                {f.q}
                <ChevronDown size={18} className={`text-muted transition-transform shrink-0 ${faqAbierto === i ? 'rotate-180' : ''}`} />
              </button>
              {faqAbierto === i && <p className="px-5 pb-4 text-sm text-muted">{i === 2 ? `Tienes acceso completo por ${dias} días, sin tarjeta y sin restricciones. Al terminar decides si continúas.` : f.a}</p>}
            </div>
          ))}
        </div>
      </section>

      {/* CTA final */}
      {!usuario && (
        <section className="bg-primary">
          <div className="max-w-4xl mx-auto px-5 py-16 md:py-20 text-center">
            <h2 className="text-3xl md:text-4xl font-extrabold text-ink tracking-tight">Empieza a liquidar sin dolores de cabeza</h2>
            <p className="text-ink/80 mt-3 text-lg">Crea tu cuenta y prueba HoraPro gratis por {dias} días.</p>
            <Link to="/registro" className="inline-flex items-center gap-2 bg-ink hover:bg-ink/90 text-white font-bold px-8 py-4 rounded-xl text-base mt-8">
              Crear cuenta gratis <ArrowRight size={18} />
            </Link>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="border-t border-gray-100">
        <div className="max-w-6xl mx-auto px-5 py-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <img src={logoCompleto} alt="HoraPro" className="h-7" />
          <div className="text-center">
            <p className="text-xs text-muted">© {new Date().getFullYear()} HoraPro · Control de horas para Colombia</p>
            <CreditoKrumlab className="mt-0.5" />
          </div>
          <div className="flex gap-4 text-sm">
            {usuario ? (
              <Link to={panelUrl} className="font-semibold text-ink">Ir a mi panel</Link>
            ) : (
              <>
                <Link to="/login" className="text-muted hover:text-ink">Iniciar sesión</Link>
                <Link to="/registro" className="font-semibold text-ink">Prueba gratis</Link>
              </>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}
