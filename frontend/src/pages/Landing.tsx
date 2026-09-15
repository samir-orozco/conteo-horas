import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Calculator, ScanFace, CalendarCheck, AlarmClock,
  ArrowRight, Check, ChevronDown, ShieldCheck, MonitorSmartphone, Sparkles,
  Quote, Star, PlayCircle, Users, MessageCircle, Menu,
} from 'lucide-react';
import logoNegro from '../assets/logo-completo-negro.svg';
import logoPRecortada from '../assets/logo-p.svg';
import MenuMovil from '../features/landing/MenuMovil';
import imagenPortada from '../assets/landing/home-horapro.webp';
import VideoVSL from '../components/VideoVSL';
import BotonWhatsApp from '../components/BotonWhatsApp';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Resaltado, Tachado } from '../features/landing/Marcas';
import TarjetasDelSistema from '../features/landing/TarjetasDelSistema';
import BlogReciente from '../features/landing/BlogReciente';
import PieDePagina from '../features/landing/PieDePagina';
import { useScrollSuave } from '../features/landing/useScrollSuave';
import { useProgresoAlBajar } from '../features/landing/useProgresoAlBajar';

const cop = (n: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);

type PlanApi = { id: string; nombre: string; precioMensual: number; precioAnual: number; limite: number };
type Precios = { precioTramo1: number; limiteTramo1: number; precioTramo2: number; diasPrueba: number; planes?: PlanApi[] };

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

// Testimonios de clientes (van con nombre y empresa reales)
const TESTIMONIOS = [
  {
    nombre: 'Mateo Vera', cargo: 'CEO Grupo MSM · Founder Fem Probiotics', iniciales: 'MV',
    texto: 'Liquidar la nómina nos tomaba dos días y siempre había reclamos por los recargos. Con HoraPro es cuestión de minutos y los números cuadran. Dejamos de improvisar con hojas de cálculo.',
  },
  {
    nombre: 'Carolina Calle', cargo: 'CEO Tuercas & Pernos', iniciales: 'CC',
    texto: 'Lo que más me gustó es que la gente marca con la cara y se acabaron las excusas de "se me olvidó firmar". Los reportes de quién llegó tarde me los reviso desde el celular en la mañana.',
  },
  {
    nombre: 'Santiago Botero', cargo: 'Gerente Lavadora Las Brisas', iniciales: 'SB',
    texto: 'la verdad no soy de tecnologia y pense q iba ser complicado pero no. mis muchachos marcan con la cara y yo veo todo desde el telefono. me ahorro un monton de tiempo y ya no peleo con el excel jaja. muy recomendado',
  },
];

const FAQ = [
  { q: '¿Qué software ofrece liquidación automática de nómina en Colombia?', a: 'HoraPro calcula automáticamente los recargos nocturnos, dominicales, festivos y las horas extra según la Ley 2466, y entrega el total listo para tu nómina, sin fórmulas de Excel ni errores de cálculo.' },
  { q: '¿Cuál es el mejor sistema para el control de horarios de trabajadores?', a: 'El mejor sistema registra la jornada de forma confiable y liquida solo. HoraPro permite marcar con reconocimiento facial o cédula desde cualquier tablet o celular, controla tardanzas en tiempo real y cumple la ley laboral colombiana.' },
  { q: '¿Es legal el control de horario con reconocimiento facial o huella?', a: 'Sí. El control biométrico es legal en Colombia siempre que el trabajador dé su consentimiento y los datos se traten conforme a la Ley 1581 de protección de datos. En HoraPro esa autorización la obtiene y la conserva la empresa empleadora, que es la responsable del dato; el panel le muestra el texto de autorización antes del primer registro. Del rostro registrado se guarda un cálculo matemático que no se puede volver a convertir en una cara. La primera toma del registro queda como foto de perfil del colaborador y se puede quitar cuando se quiera. La foto de cada marcación se conserva como evidencia durante dos meses, después de los cuales se borra sola.' },
  { q: '¿Cuántas horas máximo se pueden trabajar por semana en Colombia?', a: 'La jornada máxima legal es de 42 horas semanales (Ley 2101 de 2021, en aplicación gradual). HoraPro aplica ese tope automáticamente y calcula las horas extra que lo superan.' },
  { q: '¿Necesito comprar algún equipo para fichar?', a: 'No. HoraPro funciona en cualquier tablet, computador o celular con navegador. El colaborador marca con su rostro o su cédula en el link del kiosco.' },
  { q: '¿La prueba gratis tiene límites?', a: 'Tienes acceso completo, sin tarjeta y sin restricciones. Al terminar decides si continúas.' },
  { q: '¿Cómo se paga?', a: 'Con Wompi: tarjeta, PSE o Nequi. Eliges plan mensual o anual (con 2 meses gratis) y puedes cancelar cuando quieras.' },
];

const PLANES_LANDING = [
  {
    id: 'ESENCIAL', nombre: 'Esencial', mensual: 99900, anual: 999000, limite: 10, destacado: false,
    para: 'Para negocios pequeños',
    incluye: ['Hasta 10 colaboradores', 'Marcación con rostro o cédula', 'Liquidación de recargos y extras', 'Reportes básicos', '1 horario · 1 dispositivo'],
  },
  {
    id: 'PROFESIONAL', nombre: 'Profesional', mensual: 169900, anual: 1699000, limite: 30, destacado: true,
    para: 'El más elegido',
    incluye: ['Hasta 30 colaboradores', 'Todo lo de Esencial', 'Marcación por GPS / geocerca', 'Alertas por Telegram', 'Evidencia en novedades', 'Varios horarios y dispositivos'],
  },
  {
    id: 'EMPRESARIAL', nombre: 'Empresarial', mensual: 299900, anual: 2999000, limite: 150, destacado: false,
    para: 'Para operaciones grandes',
    incluye: ['Hasta 150 colaboradores', 'Todo lo de Profesional', 'Integración Siigo (próximamente)', 'Soporte prioritario'],
  },
];
const WPP_LANDING = 'https://wa.me/573166435723?text=' + encodeURIComponent('Hola, necesito HoraPro para más de 150 colaboradores. ¿Me ayudan con un plan a la medida?');

// Las ondas de la portada (14 de septiembre de 2026), como la franja del ejemplo de Weav: cierran el
// amarillo contra la franja de confianza, y la franja contra el blanco, sin un corte recto. Las dos usan
// el mismo trazo a todo el ancho, así que van paralelas y la franja queda del mismo grueso.
const ONDAS = `M0 56 V28 ${Array.from({ length: 12 }, (_, i) => `Q ${i * 100 + 50} ${i % 2 ? 56 : 0} ${(i + 1) * 100} 28`).join(' ')} V56 Z`;

export default function Landing() {
  const { usuario } = useAuth();
  const [precios, setPrecios] = useState<Precios | null>(null);
  const [faqAbierto, setFaqAbierto] = useState<number | null>(0);
  const [anual, setAnual] = useState(false);
  const [menuAbierto, setMenuAbierto] = useState(false);
  // Estable: el menú la usa en un efecto, y una función nueva en cada render lo volvería a correr.
  const cerrarMenu = useCallback(() => setMenuAbierto(false), []);
  useReveal();
  useScrollSuave();
  const encabezado = useProgresoAlBajar<HTMLElement>();

  useEffect(() => { api.get('/auth/precios').then(r => setPrecios(r.data)).catch(() => {}); }, []);

  const dias = precios?.diasPrueba ?? 7;
  const panelUrl = usuario?.rol === 'SUPER_ADMIN' ? '/admin' : '/app';

  // overflow-x-clip y no overflow-x-hidden: los dos evitan que la página se desborde de lado en el
  // celular, pero hidden convierte este div en una caja con scroll propio y el encabezado sticky se
  // pegaba a ella y no a la ventana, así que se iba con la página desde el 10 de julio de 2026. Visto el
  // 15 de septiembre al probar el scroll suave; el dueño decidió que se quede fijo.
  return (
    <div className="min-h-screen bg-white text-ink overflow-x-clip">
      {/* Header, sobre el amarillo de la portada. En el celular no cabe entero: quedan la P de
          HoraPro, el botón de ingresar y un menú que tapa toda la pantalla (decisión del dueño del
          14 de septiembre de 2026). */}
      <header ref={encabezado} className="sticky top-0 z-40 backdrop-blur">
        {/* Pasa de amarillo a un degradado blanco a la par del scroll: amarillo del todo solo arriba,
            sobre la portada (decisiones del dueño del 15 de septiembre de 2026). El avance lo escribe
            useProgresoAlBajar en --progreso, sin que React vuelva a pintar en cada cuadro. El blanco va
            siempre debajo y lo que se desvanece es el amarillo de encima: cruzando las dos opacidades,
            a mitad de camino el encabezado se transparentaba. Sin borde abajo: la línea gris no combinaba. */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-white via-white/95 to-white/80" />
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-primary"
          style={{ opacity: 'calc(1 - var(--progreso, 0))' }} />
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
          {/* En el celular, la misma P recortada sobre el amarillo y sobre el blanco (decisión del dueño
              del 15 de septiembre de 2026). La del círculo blanco no servía para los dos: sobre el blanco
              el círculo no se ve y la P queda chica, como ya pasaba en el menú. */}
          <img src={logoPRecortada} alt="HoraPro" className="h-8 w-auto md:hidden" />
          <img src={logoNegro} alt="HoraPro" className="hidden md:block h-8" />
          <nav className="flex items-center gap-2 sm:gap-3">
            <a href="#funciones" className="hidden lg:block text-sm font-medium text-ink/70 hover:text-ink px-3 py-2">Funciones</a>
            <a href="#precios" className="hidden md:block text-sm font-medium text-ink/70 hover:text-ink px-3 py-2">Precios</a>
            {/* <a> y no <Link>: el blog y las calculadoras son páginas estáticas
                fuera de la SPA, así que necesitan una navegación real del
                navegador. */}
            <a href="/calculadoras/" className="hidden md:block text-sm font-medium text-ink/70 hover:text-ink px-3 py-2">Calculadoras</a>
            <a href="/blog/" className="hidden md:block text-sm font-medium text-ink/70 hover:text-ink px-3 py-2">Blog</a>
            {usuario ? (
              <Link to={panelUrl} className="text-sm font-bold bg-ink hover:bg-ink/90 text-white px-4 py-2 rounded-xl">Ir a mi panel</Link>
            ) : (
              <>
                {/* El hover oscurece un poco en vez de aclarar: sobre el encabezado blanco, un blanco
                    translúcido no se veía. */}
                <Link to="/login" className="text-sm font-bold md:font-semibold bg-ink md:bg-transparent text-white md:text-ink hover:bg-ink/90 md:hover:bg-ink/5 px-4 py-2 rounded-xl">
                  <span className="md:hidden">Ingresar</span><span className="hidden md:inline">Iniciar sesión</span>
                </Link>
                <Link to="/registro" className="hidden md:block text-sm font-bold bg-ink hover:bg-ink/90 text-white px-4 py-2 rounded-xl">Prueba gratis</Link>
              </>
            )}
            <button type="button" onClick={() => setMenuAbierto(true)} aria-label="Abrir menú"
              aria-expanded={menuAbierto} aria-controls="menu-movil"
              className="md:hidden -mr-2 p-2 rounded-xl text-ink hover:bg-ink/5">
              <Menu size={26} />
            </button>
          </nav>
        </div>
      </header>
      <MenuMovil abierto={menuAbierto} onCerrar={cerrarMenu} conSesion={!!usuario} panelUrl={panelUrl} dias={dias} />

      {/* Hero, en amarillo y con el celular (decisión del dueño del 14 de septiembre de 2026) */}
      <section className="relative bg-primary overflow-hidden">
        <div className="relative z-10 max-w-6xl mx-auto px-5 pt-10 md:pt-16 grid md:grid-cols-[1.3fr_1fr] gap-4 md:gap-8 items-end">
          <div className="pb-2 md:pb-32">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide bg-white/60 text-ink px-3 py-1.5 rounded-full mb-5">
              <Sparkles size={13} /> Hecho para Colombia
            </span>
            <h1 className="isolate text-4xl md:text-5xl xl:text-6xl font-extrabold leading-[1.05] tracking-tight text-ink">
              Control de horarios y <Resaltado tono="blanco">liquidación de nómina</Resaltado> sin hacer cuentas.
            </h1>
            {/* Menos texto (decisión del dueño del 14 de septiembre de 2026): el párrafo va sin la ley, y
                debajo de los botones queda solo para quién es. La línea de «sin tarjeta · precio por
                empresa · soporte por WhatsApp» se quitó porque la franja de abajo dice lo mismo. */}
            <p className="text-lg text-ink/80 mt-6 max-w-lg">
              HoraPro hace la <b className="text-ink">liquidación de nómina automática</b>: recargos, horas extra, dominicales y festivos, sin errores y sin Excel.
            </p>
            <div className="flex flex-wrap items-center gap-3 mt-8">
              {usuario ? (
                <Link to={panelUrl} className="flex items-center gap-2 bg-ink hover:bg-ink/90 text-white font-bold px-6 py-3.5 rounded-xl text-base">
                  Ir a mi panel <ArrowRight size={18} />
                </Link>
              ) : (
                <Link to="/registro" className="flex items-center gap-2 bg-ink hover:bg-ink/90 text-white font-bold px-6 py-3.5 rounded-xl text-base">
                  Prueba gratis {dias} días <ArrowRight size={18} />
                </Link>
              )}
              <a href="#como" className="font-semibold text-ink px-5 py-3.5 rounded-xl bg-white/50 hover:bg-white/70">Ver cómo funciona</a>
            </div>
            {/* Para quién es (ICP) */}
            <p className="text-sm text-ink/75 mt-5">
              Ideal para <b className="text-ink">restaurantes, tiendas, clínicas, obras, vigilancia y call centers</b>.
            </p>
          </div>
          {/* La foto nueva (14 de septiembre de 2026) tiene el brazo cortado solo por abajo: se apoya en
              el borde inferior de la portada y el corte queda escondido bajo la onda. La anterior salía
              cortada por la derecha y había que pegarla al borde de la pantalla; esta ya no. */}
          <div className="flex justify-end">
            {/* Recortada a lo que se ve: con el aire transparente alrededor, el celular salía chico para
                el espacio que ocupaba (el dueño lo pidió más grande el 14 de septiembre de 2026). */}
            <img src={imagenPortada} alt="Celular con HoraPro en la mano" width={906} height={1373} fetchPriority="high"
              className="w-[270px] sm:w-[330px] md:w-[420px] lg:w-[500px] h-auto" />
          </div>
        </div>
        {/* Delante de la foto (z-20 contra el z-10 del contenido): el brazo sale cortado en recto por
            el borde de la imagen, y así se hunde en la onda en vez de mostrar el corte. */}
        <svg aria-hidden="true" viewBox="0 0 1200 56" preserveAspectRatio="none" className="absolute bottom-0 left-0 z-20 w-full h-8 md:h-12">
          <path d={ONDAS} fill="#f6f6f4" />
        </svg>
      </section>

      {/* Franja de confianza, cerrada abajo con la misma onda de la portada (decisión del dueño del 14 de
          septiembre de 2026). La cresta de la onda queda a 3/4 de su alto, así que con el relleno igual a
          esos 3/4 los textos casi la tocaban (el dueño pidió más aire abajo ese mismo día). Ahora sobra un
          cuarto de onda más, y el aire bajo los textos es el mismo que queda sobre ellos hasta el valle de
          la onda amarilla. «Datos en Colombia» se quitó ese mismo día: la política de privacidad publicada
          dice que los datos están en servidores de Estados Unidos. */}
      <section className="relative bg-[#f6f6f4] pb-8 md:pb-12">
        <div className="max-w-6xl mx-auto px-5 py-3 flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-sm text-muted">
          <span className="flex items-center gap-1.5"><ShieldCheck size={15} className="text-ink" /> Ley 2466 al día</span>
          <span className="flex items-center gap-1.5"><ScanFace size={15} className="text-ink" /> Marcación con rostro</span>
          <span className="flex items-center gap-1.5"><MessageCircle size={15} className="text-ink" /> Soporte por WhatsApp</span>
          <span className="flex items-center gap-1.5"><MonitorSmartphone size={15} className="text-ink" /> Sin instalar nada</span>
          <span className="flex items-center gap-1.5"><Users size={15} className="text-ink" /> No cobramos por empleado</span>
          <span className="flex items-center gap-1.5"><CalendarCheck size={15} className="text-ink" /> {dias} días gratis</span>
        </div>
        <svg aria-hidden="true" viewBox="0 0 1200 56" preserveAspectRatio="none" className="absolute bottom-0 left-0 w-full h-8 md:h-12">
          <path d={ONDAS} fill="#ffffff" />
        </svg>
      </section>

      {/* El problema y la solución, con tachado y resaltado */}
      <section className="max-w-4xl mx-auto px-5 py-16 md:py-24 text-center">
        <h2 className="hp-reveal isolate text-3xl md:text-5xl font-bold tracking-tight leading-tight text-ink">
          Tu nómina no necesita otra <Tachado>hoja de Excel</Tachado>. Necesita un <Resaltado>sistema.</Resaltado>
        </h2>
        {/* Un párrafo y no dos (el dueño pidió menos texto el 14 de septiembre de 2026). */}
        <p className="hp-reveal text-lg text-muted mt-8 max-w-2xl mx-auto">
          Sumar horas a mano y calcular recargos en Excel deja errores que salen cuando un trabajador reclama.
          Con HoraPro la marcación es la prueba, el horario es la regla y la liquidación sale sola.
        </p>
      </section>

      <TarjetasDelSistema />

      {/* Video VSL */}
      <section className="max-w-3xl mx-auto px-5 py-16 md:py-20">
        <p className="text-center text-sm font-semibold text-muted mb-4 flex items-center justify-center gap-2 hp-reveal">
          <PlayCircle size={17} className="text-ink" /> Míralo en 90 segundos
        </p>
        <div className="hp-reveal">
          <VideoVSL videoId="09HUubwVicU" />
        </div>
      </section>

      {/* Cómo funciona */}
      <section id="como" className="bg-ink text-white scroll-mt-16">
        <div className="max-w-6xl mx-auto px-5 py-16 md:py-24">
          <div className="text-center max-w-xl mx-auto mb-12 hp-reveal">
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight">Tres pasos, cero enredos</h2>
            <p className="text-white/70 mt-3">Desde que el colaborador marca hasta que liquidas la nómina.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { n: '1', icon: ScanFace, t: 'Marca', d: 'El colaborador marca entrada y salida con su rostro o su cédula.' },
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

      {/* Testimonios */}
      <section className="max-w-6xl mx-auto px-5 py-16 md:py-24">
        <div className="text-center max-w-xl mx-auto mb-12 hp-reveal">
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight">Negocios que ya dejaron el Excel</h2>
          <p className="text-muted mt-3">Lo que dicen quienes liquidan sus horas con HoraPro.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-5">
          {TESTIMONIOS.map((t, i) => (
            <figure key={t.nombre} className="hp-reveal bg-white border border-gray-200 rounded-2xl p-6 flex flex-col" style={{ animationDelay: `${i * 90}ms` }}>
              <Quote size={26} className="text-primary shrink-0" />
              <div className="flex gap-0.5 mt-3 mb-2">
                {Array.from({ length: 5 }).map((_, s) => <Star key={s} size={14} className="fill-primary text-primary" />)}
              </div>
              <blockquote className="text-sm text-ink/90 leading-relaxed flex-1">"{t.texto}"</blockquote>
              <figcaption className="flex items-center gap-3 mt-5 pt-4 border-t border-gray-100">
                <span className="w-10 h-10 rounded-full bg-ink text-white font-bold text-sm flex items-center justify-center shrink-0">{t.iniciales}</span>
                <span>
                  <span className="block text-sm font-bold text-ink">{t.nombre}</span>
                  <span className="block text-xs text-muted">{t.cargo}</span>
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* Precios */}
      <section id="precios" className="max-w-6xl mx-auto px-5 py-16 md:py-24 scroll-mt-16">
        <div className="text-center mb-8 hp-reveal">
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight">Un plan para cada tamaño</h2>
          <p className="text-muted mt-3">Pagas por empresa, no por empleado. {dias} días gratis, sin tarjeta.</p>
          {/* Toggle mensual / anual */}
          <div className="inline-flex items-center gap-1 bg-gray-100 rounded-full p-1 mt-6 text-sm font-semibold">
            <button onClick={() => setAnual(false)} className={`px-4 py-1.5 rounded-full transition-colors ${!anual ? 'bg-white shadow text-ink' : 'text-muted'}`}>Mensual</button>
            <button onClick={() => setAnual(true)} className={`px-4 py-1.5 rounded-full transition-colors flex items-center gap-1.5 ${anual ? 'bg-white shadow text-ink' : 'text-muted'}`}>
              Anual <span className="text-[10px] font-bold bg-primary text-ink px-1.5 py-0.5 rounded-full">2 meses gratis</span>
            </button>
          </div>
        </div>

        {/* En el celular y la tablet, una columna de ancho fijo y centrada: a todo el ancho cada plan
            quedaba exageradamente grande (decisión del dueño del 14 de septiembre de 2026). Las tres
            columnas esperan a los 1024 px: a 820 el precio y el botón ya se partían en dos líneas. */}
        <div className="grid gap-5 items-start max-w-sm mx-auto lg:max-w-none lg:grid-cols-3">
          {PLANES_LANDING.map((p, i) => {
            const pd = precios?.planes?.find(x => x.id === p.id);
            const mensual = pd?.precioMensual ?? p.mensual;
            const anualTotal = pd?.precioAnual ?? p.anual;
            const mesEfectivo = anual ? Math.round(anualTotal / 12) : mensual;
            return (
              <div key={p.id} className={`hp-reveal rounded-3xl p-7 flex flex-col ${p.destacado ? 'bg-ink text-white shadow-xl lg:-mt-3 lg:mb-3' : 'bg-white border border-gray-200'}`} style={{ animationDelay: `${i * 80}ms` }}>
                {p.destacado && <span className="self-start text-[11px] font-bold bg-primary text-ink px-2.5 py-1 rounded-full mb-3">{p.para}</span>}
                {!p.destacado && <span className="text-xs font-semibold text-muted mb-1">{p.para}</span>}
                <h3 className={`text-xl font-extrabold ${p.destacado ? 'text-white' : 'text-ink'}`}>{p.nombre}</h3>
                <div className="mt-3">
                  <span className="text-4xl font-extrabold">{cop(mesEfectivo)}</span>
                  <span className={`text-sm font-medium ${p.destacado ? 'text-white/60' : 'text-muted'}`}> /mes</span>
                </div>
                <p className={`text-xs mt-1 ${p.destacado ? 'text-white/60' : 'text-muted'}`}>
                  {anual ? `Facturado anual · ${cop(anualTotal)}/año` : 'Facturación mensual'}
                </p>
                <ul className="mt-5 space-y-2.5 text-sm flex-1">
                  {p.incluye.map(f => (
                    <li key={f} className="flex items-start gap-2">
                      <Check size={16} className={`mt-0.5 shrink-0 ${p.destacado ? 'text-primary' : 'text-green-600'}`} /> {f}
                    </li>
                  ))}
                </ul>
                <Link to="/registro" className={`mt-6 inline-flex items-center justify-center gap-2 font-bold px-6 py-3 rounded-xl text-base transition-colors ${p.destacado ? 'bg-primary hover:bg-primary-dark text-ink' : 'bg-ink hover:bg-ink/90 text-white'}`}>
                  Empezar gratis <ArrowRight size={17} />
                </Link>
              </div>
            );
          })}
        </div>

        <p className="text-center text-sm text-muted mt-8 hp-reveal">
          ¿Más de 150 colaboradores?{' '}
          <a href={WPP_LANDING} target="_blank" rel="noopener noreferrer" className="font-semibold text-ink underline decoration-primary decoration-2 underline-offset-2">
            Escríbenos por WhatsApp
          </a>{' '}y te armamos un plan a la medida.
        </p>
      </section>

      <BlogReciente />

      {/* FAQ */}
      <section className="max-w-2xl mx-auto px-5 py-16 md:py-24">
        <h2 className="text-3xl font-extrabold tracking-tight text-center mb-10 hp-reveal">Preguntas frecuentes</h2>
        <div className="space-y-3">
          {FAQ.map((f, i) => (
            <div key={i} className="hp-reveal border border-gray-200 rounded-2xl overflow-hidden">
              <button onClick={() => setFaqAbierto(faqAbierto === i ? null : i)}
                className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left font-semibold hover:bg-gray-50">
                {f.q}
                <ChevronDown size={18} className={`text-muted transition-transform shrink-0 ${faqAbierto === i ? 'rotate-180' : ''}`} />
              </button>
              {faqAbierto === i && <p className="px-5 pb-4 text-sm text-muted">{i === 5 ? `Tienes acceso completo por ${dias} días, sin tarjeta y sin restricciones. Al terminar decides si continúas.` : f.a}</p>}
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

      <PieDePagina conSesion={!!usuario} panelUrl={panelUrl} />

      <BotonWhatsApp />
    </div>
  );
}
