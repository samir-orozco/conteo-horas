import {
  fechasDelPeriodo, periodoDeLasFechas, hoyEnBogota, textoDelPeriodo, type TipoDePeriodo,
} from '../lib/periodoDePago';

// EL PERÍODO DE PAGO DE LOS REPORTES (13 de octubre de 2026, decisión del dueño): primera quincena, segunda
// quincena o mes completo, y el mes. Elegirlo pone las fechas; lo que muestra SALE de las fechas, así que no
// hay un estado aparte que se desalinee. Si alguien cambia las fechas a mano en el calendario, dice «Fechas
// personalizadas» y el reporte no muestra total (lib/periodoDePago.ts).

const TIPOS: { valor: TipoDePeriodo; texto: string }[] = [
  { valor: 'PRIMERA_QUINCENA', texto: 'Primera quincena' },
  { valor: 'SEGUNDA_QUINCENA', texto: 'Segunda quincena' },
  { valor: 'MES', texto: 'Mes completo' },
];
const PERSONALIZADO = 'PERSONALIZADO';
const MESES_HACIA_ATRAS = 12;

const clave = (anio: number, mes: number) => `${anio}-${mes}`;

// El mes de hoy y los doce anteriores, del más reciente al más viejo; más el mes de las fechas si es otro.
function mesesOfrecidos(hoy: string, actual: { anio: number; mes: number }) {
  const [anioHoy, mesHoy] = hoy.split('-').map(Number);
  const meses: { anio: number; mes: number }[] = [];
  for (let i = 0; i <= MESES_HACIA_ATRAS; i++) {
    const total = anioHoy * 12 + (mesHoy - 1) - i;
    meses.push({ anio: Math.floor(total / 12), mes: (total % 12) + 1 });
  }
  if (!meses.some(m => m.anio === actual.anio && m.mes === actual.mes)) meses.push(actual);
  return meses;
}

type Props = {
  desde: string;
  hasta: string;
  onCambiar: (desde: string, hasta: string) => void;
  // Para las pruebas. Por defecto, hoy en Bogotá.
  hoy?: string;
};

const SELECT = 'border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white';

export default function SelectorPeriodoDePago({ desde, hasta, onCambiar, hoy = hoyEnBogota() }: Props) {
  const periodo = periodoDeLasFechas(desde, hasta);
  const [anioDesde, mesDesde] = desde.split('-').map(Number);
  const actual = periodo ?? { anio: anioDesde, mes: mesDesde };

  const elegirTipo = (tipo: TipoDePeriodo) => {
    const f = fechasDelPeriodo({ tipo, anio: actual.anio, mes: actual.mes });
    onCambiar(f.desde, f.hasta);
  };

  // Cambiar de mes conserva el tipo; con fechas personalizadas no hay tipo que conservar y va el mes completo.
  const elegirMes = (valor: string) => {
    const [anio, mes] = valor.split('-').map(Number);
    const f = fechasDelPeriodo({ tipo: periodo?.tipo ?? 'MES', anio, mes });
    onCambiar(f.desde, f.hasta);
  };

  return (
    <div className="flex flex-wrap gap-2">
      <select aria-label="Período de pago" className={SELECT}
        value={periodo?.tipo ?? PERSONALIZADO}
        onChange={e => elegirTipo(e.target.value as TipoDePeriodo)}>
        {!periodo && <option value={PERSONALIZADO} disabled>Fechas personalizadas</option>}
        {TIPOS.map(t => <option key={t.valor} value={t.valor}>{t.texto}</option>)}
      </select>
      <select aria-label="Mes" className={SELECT}
        value={clave(actual.anio, actual.mes)}
        onChange={e => elegirMes(e.target.value)}>
        {mesesOfrecidos(hoy, actual).map(m => (
          <option key={clave(m.anio, m.mes)} value={clave(m.anio, m.mes)}>{textoDelPeriodo({ tipo: 'MES', ...m })}</option>
        ))}
      </select>
    </div>
  );
}
