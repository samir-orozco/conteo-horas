import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp } from 'lucide-react';
import api from '../../../lib/api';
import { fechasDelPeriodo, hoyEnBogota, quincenaDeHoy } from '../../../lib/periodoDePago';
import { MESES } from '../helpers';
import Kpi from './Kpi';

// LAS EXTRAS Y LOS RECARGOS DE LA QUINCENA EN EL INICIO (15 de octubre de 2026). Decisión del dueño: en pesos, con
// las horas pequeñas debajo. Reemplaza a «Horas extra del mes». El número es el «Total» del reporte de extras para la
// quincena en curso (backend: utils/extrasDelInicio.ts), y la tarjeta abre ese reporte con esas fechas.
//
// Se pide aparte del resto del Inicio porque liquida a toda la empresa: lo demás no espera por esto. Si el servidor no
// tiene la ruta (la ventana del despliegue) o falla, queda el KPI de horas extra del mes, que sí llega con el Inicio.

type Quincena = { total: number; minutosExtra: number; minutosConRecargo: number };
type Estado = { fase: 'CARGANDO' } | { fase: 'LISTO'; q: Quincena } | { fase: 'ERROR' };

const pesos = (n: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);
const horas = (minutos: number) => new Intl.NumberFormat('es-CO', { maximumFractionDigits: 1 }).format(minutos / 60);
// «1 al 15 de oct», de las cadenas y no de un Date: la zona de la máquina no cuenta.
const rango = (desde: string, hasta: string) => `${Number(desde.slice(8))} al ${Number(hasta.slice(8))} de ${MESES[Number(desde.slice(5, 7)) - 1]}`;

const TITULO = 'Extras y recargos';

export default function KpiQuincena({ hoy = hoyEnBogota(), horasExtraMes }: { hoy?: string; horasExtraMes: number }) {
  const navigate = useNavigate();
  const { desde, hasta } = fechasDelPeriodo(quincenaDeHoy(hoy));
  const [estado, setEstado] = useState<Estado>({ fase: 'CARGANDO' });

  useEffect(() => {
    let vivo = true;
    api.get('/dashboard/quincena', { params: { desde, hasta } })
      .then(r => { if (vivo) setEstado({ fase: 'LISTO', q: r.data }); })
      .catch(() => { if (vivo) setEstado({ fase: 'ERROR' }); });
    return () => { vivo = false; };
  }, [desde, hasta]);

  if (estado.fase === 'ERROR') {
    return <Kpi icon={TrendingUp} titulo="Horas extra del mes" valor={`${horasExtraMes}h`} acento="text-orange-500" detalle="acumuladas en el equipo" />;
  }

  const encabezado = (
    <div className="flex items-center gap-2 text-muted text-sm mb-2">
      <TrendingUp size={16} className="text-orange-500" aria-hidden="true" />{TITULO}
    </div>
  );
  if (estado.fase === 'CARGANDO') {
    return (
      <div className="bg-white rounded-card border border-gray-200 p-5">
        {encabezado}
        <p className="text-2xl font-bold text-muted">…</p>
        <p className="text-xs text-muted mt-1">{rango(desde, hasta)}</p>
      </div>
    );
  }
  const { q } = estado;
  const total = pesos(q.total);
  return (
    <button type="button" onClick={() => navigate(`/app/reportes/extras?desde=${desde}&hasta=${hasta}`)}
      className="bg-white rounded-card border border-gray-200 p-5 text-left hover:border-ink transition-colors">
      {encabezado}
      {/* En un teléfono de 375 px la cifra tiene 114 px. A 24 px, como las demás tarjetas, caben ocho caracteres
          («$ 99.999»); una cifra más larga va a 16 px, donde cabe hasta «$ 99.999.999» (medido el 15 de octubre de
          2026). Desde los cien millones se pasa unos 5 px. */}
      <p className={`${total.length <= 8 ? 'text-2xl' : 'text-base sm:text-2xl'} font-bold text-ink tabular-nums whitespace-nowrap`}>{total}</p>
      <p className="text-xs text-muted mt-1">{horas(q.minutosExtra)} h extra · {horas(q.minutosConRecargo)} h con recargo</p>
      <p className="text-[11px] text-muted">{rango(desde, hasta)}</p>
    </button>
  );
}
