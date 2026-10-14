import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Lock } from 'lucide-react';
import api from '../lib/api';
import { useMiPlan } from '../lib/plan';
import SelectorRangoFechas from '../components/SelectorRangoFechas';
import TarjetasDelClima from '../features/clima/TarjetasDelClima';
import GraficaEvolucion from '../features/clima/GraficaEvolucion';
import DistribucionCaritas from '../features/clima/DistribucionCaritas';
import BarrasMotivos from '../features/clima/BarrasMotivos';
import PorSede from '../features/clima/PorSede';
import NecesitanAtencion from '../features/clima/NecesitanAtencion';
import CalificacionesRecientes from '../features/clima/CalificacionesRecientes';
import Buzon from '../features/clima/Buzon';
import EditorMotivos from '../features/clima/EditorMotivos';
import PanelPersona from '../features/clima/PanelPersona';
import TablaSeguimiento from '../features/clima/TablaSeguimiento';
import PruebaGratis from '../features/clima/PruebaGratis';
import VistazoSinPlan from '../features/clima/VistazoSinPlan';
import BuzonBorroso from '../features/clima/BuzonBorroso';
import { granularidad, notasRecientes, rangoDelMes } from '../features/clima/panelClima';
import type { BuzonClima, ConteoBuzon, MotivosClima, ResumenClima, SeguimientosClima, VistazoClima } from '../features/clima/tipos';

// CLIMA LABORAL (4 de octubre de 2026): lo que respondió la gente al marcar la salida. Solo plan
// Empresarial y solo el administrador. docs/CLIMA_LABORAL.md §3.6.

const TABS = [
  { id: 'resumen', label: 'Resumen' },
  { id: 'seguimiento', label: 'Seguimiento' },
  { id: 'buzon', label: 'Buzón confidencial' },
  { id: 'motivos', label: 'Motivos' },
] as const;
type TabId = typeof TABS[number]['id'];

type Sede = { id: string; nombre: string };

const esSoloAdmin = (err: unknown) => (err as { response?: { data?: { codigo?: string } } })?.response?.data?.codigo === 'SOLO_ADMIN';

export default function ClimaLaboral() {
  const [params, setParams] = useSearchParams();
  const tab: TabId = (TABS.some(t => t.id === params.get('tab')) ? params.get('tab') : 'resumen') as TabId;
  // Con el plan todavía en null no se bloquea: `useMiPlan` resuelve después (igual que en Turnos).
  const { plan, recargar } = useMiPlan();
  const sinPlan = !!plan && !plan.features.clima;

  const [{ desde, hasta }, setRango] = useState(rangoDelMes);
  const [sedeId, setSedeId] = useState('');
  const [sedes, setSedes] = useState<Sede[]>([]);
  const [resumen, setResumen] = useState<ResumenClima | null>(null);
  const [buzon, setBuzon] = useState<BuzonClima | null>(null);
  const [motivos, setMotivos] = useState<MotivosClima | null>(null);
  const [soloAdmin, setSoloAdmin] = useState(false);
  const [error, setError] = useState(false);
  // A quién se está revisando en el panel lateral, desde «Necesitan atención» o desde «Seguimiento».
  const [revisando, setRevisando] = useState<{ colaboradorId: string; nombre: string } | null>(null);
  const [seguimientos, setSeguimientos] = useState<SeguimientosClima | null>(null);
  // Sube cada vez que cambia un caso, para volver a leer las listas que lo muestran.
  const [cambios, setCambios] = useState(0);
  // SIN EL PLAN (PENDIENTES nº 39, fase 4): cifras sin nombres y cuántas notas hay, en vez del panel. Las piden sus
  // propias rutas, que no exigen el plan y no mandan ni un nombre ni un texto.
  const [vistazo, setVistazo] = useState<VistazoClima | null>(null);
  const [conteoBuzon, setConteoBuzon] = useState<ConteoBuzon | null>(null);

  useEffect(() => {
    if (!sinPlan) return;
    api.get('/clima/buzon/conteo').then(r => setConteoBuzon(r.data)).catch(() => setConteoBuzon(null));
  }, [sinPlan]);

  useEffect(() => {
    if (!sinPlan) return;
    api.get('/clima/vistazo', { params: { desde, hasta } }).then(r => setVistazo(r.data)).catch(() => setVistazo(null));
  }, [sinPlan, desde, hasta]);

  useEffect(() => {
    if (sinPlan) return;
    api.get('/sedes').then(r => setSedes(r.data)).catch(() => setSedes([]));
    api.get('/clima/buzon').then(r => setBuzon(r.data)).catch(err => { if (esSoloAdmin(err)) setSoloAdmin(true); });
    api.get('/clima/motivos').then(r => setMotivos(r.data)).catch(err => { if (esSoloAdmin(err)) setSoloAdmin(true); });
  }, [sinPlan]);

  useEffect(() => {
    if (sinPlan) return;
    api.get('/clima/resumen', { params: { desde, hasta, ...(sedeId ? { sedeId } : {}) } })
      .then(r => { setResumen(r.data); setError(false); })
      .catch(err => { if (esSoloAdmin(err)) setSoloAdmin(true); else setError(true); });
  }, [sinPlan, desde, hasta, sedeId, cambios]);

  useEffect(() => {
    if (sinPlan || tab !== 'seguimiento') return;
    api.get('/clima/seguimientos')
      .then(r => setSeguimientos(r.data))
      .catch(err => { if (esSoloAdmin(err)) setSoloAdmin(true); else setError(true); });
  }, [sinPlan, tab, cambios]);

  const notasDelBuzon = notasRecientes(buzon);

  return (
    <div className="w-full">
      <div className="px-6 md:px-8 pt-6 md:pt-8">
        <h2 className="text-2xl font-bold text-ink">Clima laboral</h2>
        <p className="mt-0.5 mb-5 text-[13px] text-muted">Cómo le fue a tu equipo, contado por ellos mismos al marcar la salida.</p>
        <div className="border-b border-gray-200">
          <nav className="flex gap-6 -mb-px overflow-x-auto">
            {TABS.map(t => (
              <button
                key={t.id} type="button" onClick={() => setParams(t.id === 'resumen' ? {} : { tab: t.id })}
                className={`pb-3 whitespace-nowrap text-sm border-b-2 transition-colors ${tab === t.id ? 'border-ink text-ink font-semibold' : 'border-transparent text-muted font-medium hover:text-ink'}`}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      <div className="px-6 md:px-8 py-6">
        {/* Sin el plan, la tarjeta para probarlo o subir de plan; con el clima por la prueba, hasta cuándo. Al
            empezarla se vuelve a leer el plan, y con eso `sinPlan` cae y el panel se abre. */}
        <PruebaGratis sinPlan={sinPlan} onEmpezada={recargar} />
        {sinPlan ? (
          tab === 'resumen' ? (
            vistazo && (
              <div className="mt-6 space-y-6">
                <SelectorRangoFechas desde={desde} hasta={hasta} onCambiar={(d, h) => setRango({ desde: d, hasta: h })} />
                <VistazoSinPlan v={vistazo} notasDelBuzon={notasRecientes(conteoBuzon)} onVerBuzon={() => setParams({ tab: 'buzon' })} />
              </div>
            )
          ) : tab === 'buzon' ? (
            conteoBuzon && <div className="mt-6"><BuzonBorroso conteo={conteoBuzon} /></div>
          ) : null
        ) : soloAdmin ? (
          <div className="bg-white rounded-card border border-gray-200 p-6 flex items-center gap-3">
            <Lock size={18} className="text-muted" aria-hidden="true" />
            <p className="text-sm text-ink">Solo el administrador ve el clima laboral.</p>
          </div>
        ) : tab === 'seguimiento' ? (
          seguimientos && <TablaSeguimiento casos={seguimientos.casos} onAbrir={c => setRevisando({ colaboradorId: c.colaboradorId, nombre: c.nombre })} />
        ) : tab === 'buzon' ? (
          buzon && <Buzon buzon={buzon} />
        ) : tab === 'motivos' ? (
          motivos && <EditorMotivos inicial={motivos} onGuardado={m => setMotivos({ ...motivos, motivos: m })} />
        ) : (
          <div className="space-y-6">
            <div className="flex flex-wrap gap-3 items-end">
              {sedes.length > 1 && (
                <select
                  aria-label="Sede" value={sedeId} onChange={e => setSedeId(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
                >
                  <option value="">Todas las sedes</option>
                  {sedes.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                </select>
              )}
              <SelectorRangoFechas desde={desde} hasta={hasta} onCambiar={(d, h) => setRango({ desde: d, hasta: h })} />
            </div>

            {error && <p role="alert" className="text-sm text-red-700">No se pudo cargar el clima laboral. Intenta de nuevo.</p>}

            {resumen && resumen.total === 0 && (
              <div className="bg-white rounded-card border border-gray-200 p-6">
                <p className="text-sm text-ink font-semibold">Todavía nadie calificó su día en este período.</p>
                <p className="text-sm text-muted mt-1">La pregunta sale en el kiosco al marcar la salida que cierra la jornada.</p>
              </div>
            )}

            {resumen && resumen.total > 0 && (
              <>
                <TarjetasDelClima r={resumen} notasDelBuzon={notasDelBuzon} onVerBuzon={() => setParams({ tab: 'buzon' })} />
                {/* Primero el panorama, después las personas (4 de octubre de 2026). */}
                <div className="grid gap-6 lg:grid-cols-2">
                  {granularidad(desde, hasta) === 'DIA'
                    ? <GraficaEvolucion unidad="DIA" puntos={resumen.dias} promedio={resumen.promedio} />
                    : <GraficaEvolucion unidad="SEMANA" puntos={resumen.semanas.map(s => ({ fecha: s.semana, promedio: s.promedio, total: s.total }))} promedio={resumen.promedio} />}
                  <DistribucionCaritas distribucion={resumen.distribucion} total={resumen.total} />
                </div>
                <NecesitanAtencion atencion={resumen.atencion} onRevisar={a => setRevisando({ colaboradorId: a.colaboradorId, nombre: a.nombre })} />
                <div className="grid gap-6 lg:grid-cols-2 items-start">
                  <BarrasMotivos motivos={resumen.motivos} />
                  {!sedeId && resumen.porSede.length > 1 && <PorSede porSede={resumen.porSede} />}
                </div>
                <CalificacionesRecientes recientes={resumen.recientes} />
              </>
            )}
          </div>
        )}
      </div>
      {revisando && (
        <PanelPersona
          colaboradorId={revisando.colaboradorId} nombre={revisando.nombre}
          onCerrar={() => setRevisando(null)} onCambio={() => setCambios(n => n + 1)}
        />
      )}
    </div>
  );
}
