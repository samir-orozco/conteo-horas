import { useState, useEffect } from 'react';
import SelectorRangoFechas from '../components/SelectorRangoFechas';
import SelectorColaborador from '../components/SelectorColaborador';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toZonedTime } from 'date-fns-tz';
import { Search, AlarmClock, Info, Download, Lock, CalendarOff, Paperclip, X, FileText, Image as ImageIcon } from 'lucide-react';
import api from '../lib/api';
import { useMiPlan } from '../lib/plan';
import { descargarExcelHojas } from '../lib/exportar';
import { TIPO_PERMISO_LABEL } from './ColaboradorDetalle';

const TZ = 'America/Bogota';

type Colaborador = { id: string; nombre: string; apellido: string; salarioMensual: number };
type LineaLiquidacion = { codigo: string; nombre: string; horas: number; valorHora: number; recargo: number; esExtra: boolean; factorPagado: number; subtotal: number };
type SaldoTiempo = {
  sinHorario: boolean; minutosEsperados: number; minutosPermisoRemunerado: number;
  minutosPermisoNoRemunerado: number; minutosTrabajados: number; minutosSaldo: number;
  valorHora: number; montoSaldo: number;
};
type Reporte = {
  colaborador: Colaborador; desde: string; hasta: string; liquidacion: LineaLiquidacion[];
  salarioBase: number; totalRecargos: number; totalExtra: number; totalAdicional: number;
  totalPagar: number; registrosCont: number; saldo?: SaldoTiempo;
};
type Novedad = { id: string; tipo: string; descripcion?: string | null; aprobado: boolean; fechaInicio: string; fechaFin: string; evidenciaTipo?: string | null; evidenciaNombre?: string | null; remunerado?: boolean };
type RegistroDia = { id: string; fecha: string; entrada: string | null; salida: string | null; tipo: string; minutosTarde: number | null; observacion?: string | null };
type Tardanzas = {
  sinHorario: boolean;
  horario?: { nombre: string; toleranciaMin: number };
  detalle: { fecha: string; horaEsperada: string; horaLlegada: string; minutosTarde: number }[];
  totalMinutos: number;
  diasTarde: number;
};

// Redondea a minuto entero: los minutos pueden llegar con decimales del cálculo
// y "8h 40.19999999999891min" no es algo que se le muestre a nadie.
const fmtMin = (m: number) => {
  const t = Math.round(Math.abs(m));
  return t >= 60 ? `${Math.floor(t / 60)}h ${t % 60}min` : `${t} min`;
};

// Una fecha "2026-07-01" la interpreta `new Date()` como medianoche UTC, que en
// Bogotá es el 30 de junio a las 19:00. Al formatearla se mostraba un período
// corrido un día ("30/06 — 30/07" para julio completo). Añadir la hora la fuerza
// a leerse como fecha local, que es lo que el usuario escribió.
const fechaLocal = (s: string) => new Date(`${s.slice(0, 10)}T00:00:00`);

const BADGE: Record<string, string> = {
  HOD:  'bg-blue-50 text-blue-700',
  HON:  'bg-indigo-50 text-indigo-700',
  HED:  'bg-orange-50 text-orange-700',
  HEN:  'bg-red-50 text-red-700',
  HDD:  'bg-purple-50 text-purple-700',
  HND:  'bg-pink-50 text-pink-700',
  HEDD: 'bg-yellow-50 text-yellow-800',
  HEND: 'bg-rose-50 text-rose-700',
};

export default function Reportes() {
  const navigate = useNavigate();
  const { plan } = useMiPlan();
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [colaboradorId, setColaboradorId] = useState('');
  const [desde, setDesde] = useState(format(new Date(), 'yyyy-MM-01'));
  const [hasta, setHasta] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [reporte, setReporte] = useState<Reporte | null>(null);
  const [tardanzas, setTardanzas] = useState<Tardanzas | null>(null);
  const [novedades, setNovedades] = useState<Novedad[]>([]);
  const [registrosDia, setRegistrosDia] = useState<RegistroDia[]>([]);
  const [vista, setVista] = useState<'liquidacion' | 'dias'>('liquidacion');
  const [verNovedad, setVerNovedad] = useState<Novedad | null>(null);
  const [evidenciaVer, setEvidenciaVer] = useState<{ data: string; tipo: string; nombre?: string | null } | null>(null);
  const [cargandoEvidencia, setCargandoEvidencia] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const verEvidencia = async (permisoId: string) => {
    setCargandoEvidencia(true);
    try {
      const r = await api.get(`/permisos/${permisoId}/evidencia`);
      setEvidenciaVer({ data: r.data.evidencia, tipo: r.data.evidenciaTipo, nombre: r.data.evidenciaNombre });
    } catch { /* sin evidencia */ } finally { setCargandoEvidencia(false); }
  };

  useEffect(() => { api.get('/colaboradores').then(r => setColaboradores(r.data)); }, []);

  const calcular = async () => {
    if (!colaboradorId) return;
    setLoading(true);
    setError('');
    try {
      const [liq, tar, perm, regs] = await Promise.all([
        api.get('/reportes/liquidacion', { params: { colaboradorId, desde, hasta } }),
        api.get('/reportes/tardanzas', { params: { colaboradorId, desde, hasta } }),
        api.get('/permisos', { params: { colaboradorId } }),
        api.get('/registros', { params: { colaboradorId, desde, hasta } }),
      ]);
      setReporte(liq.data);
      setTardanzas(tar.data);
      setVista('liquidacion');
      setRegistrosDia((regs.data as RegistroDia[]).slice().sort((a, b) => (a.fecha < b.fecha ? 1 : -1)));
      // Novedades que se cruzan con el rango filtrado (por día calendario Bogotá)
      const dia = (iso: string) => format(toZonedTime(new Date(iso), TZ), 'yyyy-MM-dd');
      setNovedades(
        (perm.data as Novedad[])
          .filter(n => dia(n.fechaInicio) <= hasta && dia(n.fechaFin) >= desde)
          .sort((a, b) => (a.fechaInicio < b.fechaInicio ? 1 : -1))
      );
    } catch {
      setError('Error al calcular la liquidación');
    } finally {
      setLoading(false);
    }
  };

  const fmt = (n: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);
  const fmtHora = (s: string | null) => s ? format(toZonedTime(new Date(s), TZ), 'HH:mm') : '—';
  const duracion = (entrada: string | null, salida: string | null) => {
    if (!entrada || !salida) return '—';
    const min = (new Date(salida).getTime() - new Date(entrada).getTime()) / 60000;
    return `${Math.floor(min / 60)}h ${Math.round(min % 60)}min`;
  };

  // Lo que se descuenta por tiempo no repuesto. Vive fuera de `liquidacion` a
  // propósito: si fuera una línea más de ese array, se colaría en los totales
  // de recargos y de horas, que se calculan recorriéndolo.
  const descuentoSaldo = reporte?.saldo && !reporte.saldo.sinHorario ? reporte.saldo.montoSaldo : 0;

  const exportarExcel = () => {
    if (!reporte) return;
    const dFmt = (iso: string) => format(toZonedTime(new Date(iso), TZ), 'dd/MM/yyyy');

    // Hoja 1: Liquidación
    const liqFilas: (string | number)[][] = reporte.liquidacion.map(l => [
      l.codigo, l.nombre, Number(l.horas.toFixed(2)), Math.round(l.recargo * 100), Math.round(l.valorHora), Math.round(l.subtotal),
    ]);
    liqFilas.push(['', 'Total recargos del período', '', '', '', Math.round(reporte.totalRecargos)]);
    liqFilas.push(['', 'Total horas extra del período', '', '', '', Math.round(reporte.totalExtra)]);
    liqFilas.push(['', 'Subtotal (adicional al salario)', '', '', '', Math.round(reporte.totalAdicional)]);
    liqFilas.push(['', 'Salario base mensual', '', '', '', Math.round(reporte.salarioBase)]);
    if (descuentoSaldo > 0) {
      liqFilas.push(['', `Saldo pendiente (${fmtMin(reporte.saldo!.minutosSaldo)} sin reponer)`, '', '', '', -Math.round(descuentoSaldo)]);
    }
    liqFilas.push(['', 'TOTAL A PAGAR', '', '', '', Math.round(reporte.salarioBase + reporte.totalAdicional - descuentoSaldo)]);

    // Hoja 2: Novedades del período
    const novFilas = novedades.map(n => [
      TIPO_PERMISO_LABEL[n.tipo] ?? n.tipo,
      n.remunerado ? 'Se paga' : 'No se paga',
      n.aprobado ? 'Aprobada' : 'Pendiente',
      dFmt(n.fechaInicio),
      dFmt(n.fechaFin),
      n.descripcion || '',
      n.evidenciaTipo ? 'Sí' : 'No',
    ]);

    // Hoja 3: Registros del período (día a día)
    const regFilas = registrosDia.map(r => [
      format(toZonedTime(new Date(r.fecha), TZ), 'dd/MM/yyyy'),
      fmtHora(r.entrada),
      fmtHora(r.salida),
      r.tipo,
      r.minutosTarde && r.minutosTarde > 0 ? r.minutosTarde : 0,
      duracion(r.entrada, r.salida),
    ]);

    const nombre = `${reporte.colaborador.nombre}_${reporte.colaborador.apellido}`.replace(/\s+/g, '');
    const periodo = `${format(fechaLocal(reporte.desde), 'dd-MM-yyyy')}_a_${format(fechaLocal(reporte.hasta), 'dd-MM-yyyy')}`;
    descargarExcelHojas(`Reporte_${nombre}_${periodo}`, [
      { nombre: 'Liquidación', columnas: ['Código', 'Concepto', 'Horas', 'Recargo %', 'Valor hora', 'Subtotal'], filas: liqFilas },
      { nombre: 'Novedades', columnas: ['Tipo', 'Remuneración', 'Estado', 'Desde', 'Hasta', 'Descripción', 'Evidencia'], filas: novFilas },
      { nombre: 'Registros', columnas: ['Fecha', 'Entrada', 'Salida', 'Tipo', 'Min. tarde', 'Duración'], filas: regFilas },
    ]);
  };

  return (
    <div className="p-4 md:p-6 w-full">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Reportes y Liquidación</h2>

      {/* Filtros */}
      <div className="bg-white rounded-xl shadow p-4 md:p-6 mb-6">
        <h3 className="font-semibold text-gray-800 mb-4">Liquidación de horas</h3>
        <div className="flex flex-wrap gap-3 items-end">
          <SelectorColaborador
            colaboradores={colaboradores}
            valor={colaboradorId}
            onCambiar={setColaboradorId}
            textoTodos="Seleccionar colaborador"
            permiteTodos={false}
          />
          <SelectorRangoFechas desde={desde} hasta={hasta} onCambiar={(d, h) => { setDesde(d); setHasta(h); }} />
          <div>
            <button onClick={calcular} disabled={loading || !colaboradorId}
              className="w-full flex items-center justify-center gap-2 bg-blue-800 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-60">
              <Search size={16} />{loading ? 'Calculando...' : 'Calcular'}
            </button>
          </div>
        </div>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </div>

      {reporte && (
        <div className="bg-white rounded-xl shadow p-4 md:p-6">
          {/* Cabecera */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-5">
            <div>
              <h3 className="font-bold text-xl text-gray-800">{reporte.colaborador.nombre} {reporte.colaborador.apellido}</h3>
              <p className="text-sm text-gray-500 mt-0.5">
                {format(fechaLocal(reporte.desde), 'dd/MM/yyyy')} — {format(fechaLocal(reporte.hasta), 'dd/MM/yyyy')} · {reporte.registrosCont} días con marcación
              </p>
            </div>
            {plan && !plan.features.exportar ? (
              <button onClick={() => navigate('/app/configuracion?tab=suscripcion')} title="Exportar a Excel está disponible en el plan Profesional"
                className="flex items-center gap-1.5 text-xs font-semibold text-muted bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-lg self-start">
                <Lock size={14} /> Exportar (Profesional)
              </button>
            ) : (
              <button onClick={exportarExcel}
                className="flex items-center gap-1.5 text-xs font-semibold text-white bg-green-700 hover:bg-green-600 px-3 py-2 rounded-lg self-start">
                <Download size={14} /> Descargar Excel
              </button>
            )}
          </div>

          {/* Cifras de tiempo del período. Reemplazan a la tarjeta "Tiempo del
              período": lo esperado y lo trabajado se leen de un vistazo, y el
              detalle de las novedades vive en su propio panel. */}
          {reporte.saldo && !reporte.saldo.sinHorario && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
              <div className="bg-gray-50 border border-gray-200/70 rounded-xl px-4 py-3">
                <p className="text-xs text-muted">Debía trabajar</p>
                <p className="text-xl font-bold text-ink mt-1">{fmtMin(reporte.saldo.minutosEsperados)}</p>
              </div>
              <div className="bg-gray-50 border border-gray-200/70 rounded-xl px-4 py-3">
                <p className="text-xs text-muted">Trabajó</p>
                <p className="text-xl font-bold text-ink mt-1">{fmtMin(reporte.saldo.minutosTrabajados)}</p>
              </div>
              {reporte.saldo.minutosSaldo > 0 ? (
                <div className="bg-red-50 border border-red-200/70 rounded-xl px-4 py-3">
                  <p className="text-xs text-red-700/80">Queda debiendo</p>
                  <p className="text-xl font-bold text-red-600 mt-1">{fmtMin(reporte.saldo.minutosSaldo)}</p>
                </div>
              ) : (
                <div className="bg-green-50 border border-green-200/70 rounded-xl px-4 py-3">
                  <p className="text-xs text-green-800/80">Queda debiendo</p>
                  <p className="text-xl font-bold text-green-700 mt-1">Nada ✓</p>
                </div>
              )}
            </div>
          )}

          {/* Pestañas: Liquidación / Registros del período */}
          <div className="flex gap-1 border-b border-gray-200 mb-5">
            {([['liquidacion', 'Liquidación'], ['dias', 'Registros del período']] as const).map(([id, label]) => (
              <button key={id} onClick={() => setVista(id)}
                className={`px-4 py-2 text-sm border-b-2 -mb-px transition-colors ${vista === id ? 'border-blue-800 text-blue-800 font-semibold' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                {label}
              </button>
            ))}
          </div>

          {vista === 'dias' ? (
            <div className="overflow-x-auto">
              {registrosDia.length === 0 ? (
                <p className="text-center text-gray-400 py-8">Sin registros en este período.</p>
              ) : (
                <table className="w-full text-sm min-w-[600px]">
                  <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                    <tr>
                      <th className="px-3 py-2 text-left">Fecha</th>
                      <th className="px-3 py-2 text-center">Entrada</th>
                      <th className="px-3 py-2 text-center">Salida</th>
                      <th className="px-3 py-2 text-center">Tipo</th>
                      <th className="px-3 py-2 text-center">Tarde</th>
                      <th className="px-3 py-2 text-right">Duración</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {registrosDia.map(r => (
                      <tr key={r.id} className="hover:bg-gray-50">
                        <td className="px-3 py-2.5 text-gray-700 capitalize">{format(toZonedTime(new Date(r.fecha), TZ), "EEE dd/MM/yyyy", { locale: es })}</td>
                        <td className="px-3 py-2.5 text-center font-mono text-green-700">{fmtHora(r.entrada)}</td>
                        <td className="px-3 py-2.5 text-center font-mono text-red-600">{fmtHora(r.salida)}</td>
                        <td className="px-3 py-2.5 text-center">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${r.tipo === 'FESTIVO' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>{r.tipo}</span>
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          {r.minutosTarde && r.minutosTarde > 0 ? <span className="text-orange-600 font-semibold">{fmtMin(r.minutosTarde)}</span> : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-3 py-2.5 text-right text-gray-600">{duracion(r.entrada, r.salida)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          ) : (
          <>
          {/* Aviso del modelo de pago */}
          <div className="bg-primary/20 border border-primary/40 rounded-xl px-4 py-3 mb-5 flex items-start gap-2 text-sm text-ink">
            <Info size={16} className="mt-0.5 shrink-0" />
            <span>El <b>salario base</b> ya cubre las horas ordinarias del mes. Aquí se calcula lo que se paga <b>además</b> del salario: recargos (nocturno, dominical/festivo) y horas extra.</span>
          </div>

          {/* Tabla detalle */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[560px]">
              <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                <tr>
                  <th className="px-3 py-2 text-left">Tipo de hora</th>
                  <th className="px-3 py-2 text-right">Horas</th>
                  <th className="px-3 py-2 text-right">Valor/hora</th>
                  <th className="px-3 py-2 text-right">Se paga</th>
                  <th className="px-3 py-2 text-right">Adicional</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {reporte.liquidacion.map(l => (
                  <tr key={l.codigo} className="hover:bg-gray-50">
                    <td className="px-3 py-2.5">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold mr-2 ${BADGE[l.codigo] ?? 'bg-gray-100 text-gray-600'}`}>{l.codigo}</span>
                      <span className="text-gray-700">{l.nombre}</span>
                      {l.esExtra && <span className="ml-1.5 text-[10px] font-bold text-orange-600">EXTRA</span>}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-gray-700">{fmtMin(l.horas * 60)}</td>
                    <td className="px-3 py-2.5 text-right text-gray-500">{fmt(l.valorHora)}</td>
                    <td className="px-3 py-2.5 text-right text-gray-500">
                      {l.factorPagado === 0 ? '—' : `×${l.factorPagado}`}
                    </td>
                    <td className="px-3 py-2.5 text-right font-semibold text-ink">
                      {l.factorPagado === 0 ? <span className="text-xs font-normal text-muted">en salario</span> : fmt(l.subtotal)}
                    </td>
                  </tr>
                ))}

                {/* Tiempo no repuesto: se renderiza aparte y NO se mete en
                    `liquidacion`, porque ese array alimenta totalRecargos y
                    totalAdicional, y una fila sintética ahí desviaría los
                    totales de todos los reportes. */}
                {descuentoSaldo > 0 && (
                  <tr className="hover:bg-gray-50 bg-red-50/30">
                    <td className="px-3 py-2.5">
                      <span className="inline-block px-2 py-0.5 rounded text-xs font-semibold mr-2 bg-red-100 text-red-700">TNR</span>
                      <span className="text-gray-700">Tiempo no remunerado</span>
                      <span className="ml-1.5 text-[10px] font-bold text-red-600">DESCUENTO</span>
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-red-700">
                      {fmtMin(reporte.saldo!.minutosSaldo)}
                    </td>
                    <td className="px-3 py-2.5 text-right text-gray-500">{fmt(reporte.saldo!.valorHora)}</td>
                    <td className="px-3 py-2.5 text-right text-gray-500">—</td>
                    <td className="px-3 py-2.5 text-right font-semibold text-red-700">−{fmt(descuentoSaldo)}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Resumen de pago */}
          <div className="mt-5 border-t border-gray-200 pt-4 space-y-2 max-w-sm ml-auto text-sm">
            <div className="flex justify-between text-muted">
              <span>Recargos del período</span><span className="text-ink font-medium">{fmt(reporte.totalRecargos)}</span>
            </div>
            <div className="flex justify-between text-muted">
              <span>Horas extra del período</span><span className="text-ink font-medium">{fmt(reporte.totalExtra)}</span>
            </div>
            <div className="flex justify-between border-t border-gray-100 pt-2">
              <span className="text-ink font-medium">Subtotal (adicional al salario)</span>
              <span className="text-ink font-semibold">{fmt(reporte.totalAdicional)}</span>
            </div>
            <div className="flex justify-between text-muted">
              <span>Salario base mensual</span><span className="text-ink font-medium">{fmt(reporte.salarioBase)}</span>
            </div>
            {descuentoSaldo > 0 && (
              <div className="flex justify-between">
                <span className="text-red-700">Saldo pendiente ({fmtMin(reporte.saldo!.minutosSaldo)} sin reponer)</span>
                <span className="text-red-700 font-semibold">−{fmt(descuentoSaldo)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-gray-200 pt-2">
              <span className="font-bold text-ink">Total a pagar</span>
              <span className="font-bold text-ink text-lg">{fmt(reporte.salarioBase + reporte.totalAdicional - descuentoSaldo)}</span>
            </div>
          </div>

          {reporte.liquidacion.length === 0 && (
            <p className="text-center text-gray-400 py-8">No hay registros completos (con entrada y salida) en este período</p>
          )}
          </>
          )}
        </div>
      )}

      {/* Llegadas tarde + Novedades, en dos columnas (solo en la pestaña Liquidación) */}
      {reporte && vista === 'liquidacion' && (
      <div className="grid lg:grid-cols-2 gap-6 mt-6 items-start">
      {/* Llegadas tarde del período */}
      {tardanzas && (
        <div className="bg-white rounded-xl shadow p-4 md:p-6">
          <h3 className="font-semibold text-ink mb-1 flex items-center gap-2">
            <AlarmClock size={17} className={tardanzas.diasTarde > 0 ? 'text-orange-500' : 'text-green-600'} />
            Llegadas tarde
          </h3>
          {tardanzas.sinHorario ? (
            <p className="text-sm text-muted mt-2">
              Este colaborador no tiene horario asignado, así que no se controlan llegadas tarde.
              Asígnale uno desde su perfil o en Configuración → Horarios.
            </p>
          ) : tardanzas.diasTarde === 0 ? (
            <p className="text-sm text-green-700 mt-2">
              Sin llegadas tarde en el período ✓ (horario {tardanzas.horario?.nombre}, {tardanzas.horario?.toleranciaMin} min de tolerancia)
            </p>
          ) : (
            <>
              <p className="text-sm text-muted mb-3">
                Horario {tardanzas.horario?.nombre} ({tardanzas.horario?.toleranciaMin} min de tolerancia sobre la hora de cada día):{' '}
                <b className="text-orange-600">{tardanzas.diasTarde} día{tardanzas.diasTarde === 1 ? '' : 's'} tarde · {fmtMin(tardanzas.totalMinutos)} en total</b>
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[400px]">
                  <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                    <tr>
                      <th className="px-3 py-2 text-left">Fecha</th>
                      <th className="px-3 py-2 text-center">Hora esperada</th>
                      <th className="px-3 py-2 text-center">Hora de llegada</th>
                      <th className="px-3 py-2 text-right">Tiempo tarde</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {tardanzas.detalle.map(t => (
                      <tr key={t.fecha}>
                        <td className="px-3 py-2 text-gray-700">{format(new Date(t.fecha + 'T12:00:00'), 'dd/MM/yyyy')}</td>
                        <td className="px-3 py-2 text-center text-gray-500">{t.horaEsperada}</td>
                        <td className="px-3 py-2 text-center font-medium text-orange-600">{t.horaLlegada}</td>
                        <td className="px-3 py-2 text-right font-semibold text-orange-700">{fmtMin(t.minutosTarde)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* Novedades del período */}
      {reporte && (
        <div className="bg-white rounded-xl shadow p-4 md:p-6">
          <h3 className="font-semibold text-ink mb-1 flex items-center gap-2">
            <CalendarOff size={17} className="text-primary-dark" /> Novedades del período
          </h3>
          {novedades.length === 0 ? (
            <p className="text-sm text-green-700 mt-2">Sin novedades (permisos, incapacidades, licencias) en el rango filtrado ✓</p>
          ) : (
            <>
              <p className="text-sm text-muted mb-3">
                {novedades.length} novedad{novedades.length === 1 ? '' : 'es'} entre el {format(fechaLocal(reporte.desde), 'dd/MM/yyyy')} y el {format(fechaLocal(reporte.hasta), 'dd/MM/yyyy')}.
              </p>

              {/* Horas que aportan al período, separadas. Vienen del cálculo del
                  saldo —no de contar días × jornada— porque solo cuentan los días
                  que el horario tenía programados: un festivo o un domingo dentro
                  de unas vacaciones no suma horas. */}
              {reporte.saldo && !reporte.saldo.sinHorario &&
                (reporte.saldo.minutosPermisoRemunerado > 0 || reporte.saldo.minutosPermisoNoRemunerado > 0) && (
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-gray-50 border border-gray-200/70 rounded-xl px-4 py-3">
                    <p className="text-xs text-muted flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500" /> Se pagan
                    </p>
                    <p className="text-lg font-bold text-ink mt-1">{fmtMin(reporte.saldo.minutosPermisoRemunerado)}</p>
                  </div>
                  <div className="bg-red-50 border border-red-200/70 rounded-xl px-4 py-3">
                    <p className="text-xs text-red-700/80 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500" /> No se pagan
                    </p>
                    <p className="text-lg font-bold text-red-700 mt-1">{fmtMin(reporte.saldo.minutosPermisoNoRemunerado)}</p>
                  </div>
                </div>
              )}
              <div className="space-y-2">
                {/* Tarjeta con borde propio: el estado de aprobación va arriba a
                    la derecha (dato secundario) y el de pago viaja con la fecha,
                    marcado con un punto de color para que se distinga de un
                    vistazo sin competir con el título. */}
                {novedades.map(n => (
                  <button key={n.id} onClick={() => setVerNovedad(n)}
                    className="w-full relative text-left bg-white border border-gray-200 rounded-xl px-4 py-3 hover:border-gray-300 hover:shadow-sm transition-all">
                    <span className={`absolute top-3 right-3 text-[10px] font-semibold tracking-wide px-1.5 py-0.5 rounded ${n.aprobado ? 'text-green-700 bg-green-50' : 'text-orange-700 bg-orange-50'}`}>
                      {n.aprobado ? 'Aprobada' : 'Pendiente'}
                    </span>
                    <p className="text-sm font-semibold text-ink flex items-center gap-1.5 pr-20">
                      {TIPO_PERMISO_LABEL[n.tipo] ?? n.tipo}
                      {n.evidenciaTipo && <Paperclip size={12} className="text-primary-dark shrink-0" />}
                    </p>
                    <p className="text-xs mt-1 flex items-center gap-1.5 flex-wrap">
                      <span className="text-muted">
                        {format(toZonedTime(new Date(n.fechaInicio), TZ), 'dd/MM/yyyy')}
                        {format(toZonedTime(new Date(n.fechaInicio), TZ), 'dd/MM/yyyy') !== format(toZonedTime(new Date(n.fechaFin), TZ), 'dd/MM/yyyy') &&
                          ` — ${format(toZonedTime(new Date(n.fechaFin), TZ), 'dd/MM/yyyy')}`}
                      </span>
                      <span className="text-gray-300">·</span>
                      <span className={`inline-flex items-center gap-1 font-medium ${n.remunerado ? 'text-gray-600' : 'text-red-600'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${n.remunerado ? 'bg-green-500' : 'bg-red-500'}`} />
                        {n.remunerado ? 'Se paga' : 'No se paga'}
                      </span>
                    </p>
                    {n.descripcion && <p className="text-xs text-gray-500 mt-1.5 truncate">{n.descripcion}</p>}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}
      </div>
      )}

      {/* Detalle de una novedad */}
      {verNovedad && (
        <div className="fixed inset-0 !mt-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setVerNovedad(null)}>
          <div className="hp-pop bg-white rounded-2xl p-6 w-full max-w-md shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-bold text-lg text-ink">{TIPO_PERMISO_LABEL[verNovedad.tipo] ?? verNovedad.tipo}</h3>
              <button onClick={() => setVerNovedad(null)}><X size={20} className="text-gray-400" /></button>
            </div>
            <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mb-4 ${verNovedad.aprobado ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}`}>
              {verNovedad.aprobado ? 'APROBADA' : 'PENDIENTE'}
            </span>
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-xs text-muted">Fechas</p>
                <p className="text-ink font-medium">
                  {format(toZonedTime(new Date(verNovedad.fechaInicio), TZ), 'dd/MM/yyyy')}
                  {format(toZonedTime(new Date(verNovedad.fechaInicio), TZ), 'dd/MM/yyyy') !== format(toZonedTime(new Date(verNovedad.fechaFin), TZ), 'dd/MM/yyyy') &&
                    ` — ${format(toZonedTime(new Date(verNovedad.fechaFin), TZ), 'dd/MM/yyyy')}`}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted">Descripción / motivo</p>
                <p className="text-ink whitespace-pre-wrap">{verNovedad.descripcion || <span className="text-muted">Sin descripción.</span>}</p>
              </div>
              {verNovedad.evidenciaTipo && (
                <div>
                  <p className="text-xs text-muted mb-1">Evidencia</p>
                  <button onClick={() => verEvidencia(verNovedad.id)} disabled={cargandoEvidencia}
                    className="flex items-center gap-2 text-sm font-medium text-primary-dark border border-gray-200 rounded-lg px-3 py-2 hover:bg-gray-50 disabled:opacity-60">
                    {verNovedad.evidenciaTipo === 'application/pdf' ? <FileText size={16} className="text-red-500" /> : <ImageIcon size={16} />}
                    {cargandoEvidencia ? 'Abriendo...' : (verNovedad.evidenciaNombre || 'Ver evidencia')}
                  </button>
                </div>
              )}
            </div>
            <div className="flex justify-end mt-6">
              <button onClick={() => setVerNovedad(null)} className="px-4 py-2 text-sm text-muted border border-gray-300 rounded-lg hover:bg-gray-50">Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* Visor de evidencia */}
      {evidenciaVer && (
        <div className="fixed inset-0 !mt-0 bg-black/70 flex items-center justify-center z-[60] p-4" onClick={() => setEvidenciaVer(null)}>
          <div className="hp-pop bg-white rounded-2xl p-4 w-full max-w-2xl shadow-xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3 px-1">
              <p className="text-sm font-semibold text-ink truncate">{evidenciaVer.nombre || 'Evidencia'}</p>
              <div className="flex items-center gap-1">
                <a href={evidenciaVer.data} download={evidenciaVer.nombre || 'evidencia'} title="Descargar" className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg"><Download size={18} /></a>
                <button onClick={() => setEvidenciaVer(null)} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
              </div>
            </div>
            {evidenciaVer.tipo === 'application/pdf' ? (
              <iframe src={evidenciaVer.data} title="Evidencia PDF" className="w-full flex-1 min-h-[60vh] rounded-lg border border-gray-200" />
            ) : (
              <img src={evidenciaVer.data} alt="Evidencia" className="w-full object-contain rounded-lg max-h-[75vh]" />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
