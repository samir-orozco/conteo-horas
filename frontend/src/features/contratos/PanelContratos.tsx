import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { FileSignature, Plus, Trash2, Paperclip, AlertTriangle, Info, Check } from 'lucide-react';
import api from '../../lib/api';
import ConfirmDialog from '../../components/ConfirmDialog';
import CampoEvidencia, { type CambioEvidencia } from '../../components/CampoEvidencia';
import { TIPO_LABEL, ALERTA, type Contrato, type TipoContrato } from './tipos';
import { duracionesDe, finDeDuracion, caeEnRegla4taProrroga, diasEntre, DIAS_UN_ANIO } from './duraciones';

const fecha = (s: string | null) => s ? format(new Date(s), "d 'de' MMMM yyyy", { locale: es }) : '—';
const corta = (s: string | null) => s ? format(new Date(s), 'dd/MM/yyyy') : '—';
const soloFecha = (s: string | null) => s ? s.slice(0, 10) : '';

const TONOS = {
  rojo:  'bg-red-50 border-red-200 text-red-800',
  ambar: 'bg-amber-50 border-amber-200 text-amber-800',
  azul:  'bg-blue-50 border-blue-200 text-blue-800',
};

// Lo que el servidor devuelve cuando rechaza algo. Evita el `any` en los catch
// y de paso obliga a acordarse de que el error puede no traer mensaje.
type ErrorApi = { response?: { data?: { error?: string } } };
const mensaje = (e: unknown, respaldo: string) =>
  (e as ErrorApi)?.response?.data?.error ?? respaldo;

type NuevoContrato = {
  colaboradorId: string; tipo: TipoContrato;
  fechaInicio: string; fechaFin: string | null; fechaInicioPractica: string | null;
  observacion: string | null;
  documento?: string; documentoNombre?: string;
};

const VACIO = {
  tipo: 'INDEFINIDO' as TipoContrato,
  fechaInicio: '', fechaFin: '', fechaInicioPractica: '', observacion: '',
};

// Contratos de un colaborador. Vive dentro de su ficha porque es donde
// Recursos Humanos va a mirarlo: al lado de las novedades y del kardex.
export default function PanelContratos({ colaboradorId }: { colaboradorId: string }) {
  const [lista, setLista] = useState<Contrato[] | null>(null);
  const [error, setError] = useState('');
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(VACIO);
  // Meses de duración elegidos. 0 = personalizado, que es cuando se escribe la
  // fecha de terminación a mano.
  const [meses, setMeses] = useState(3);
  const [adjunto, setAdjunto] = useState<CambioEvidencia>({ tipo: 'sin-cambio' });
  const [guardando, setGuardando] = useState(false);
  const [porBorrar, setPorBorrar] = useState<Contrato | null>(null);
  const [prorrogando, setProrrogando] = useState<Contrato | null>(null);
  const [prorroga, setProrroga] = useState({ desde: '', hasta: '' });
  const [mesesProrroga, setMesesProrroga] = useState(3);

  const cargar = useCallback(() => {
    api.get(`/contratos/colaborador/${colaboradorId}`)
      .then(r => setLista(r.data))
      .catch(() => setError('No pudimos cargar los contratos.'));
  }, [colaboradorId]);
  useEffect(cargar, [cargar]);

  const crear = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardando(true); setError('');
    try {
      const cuerpo: NuevoContrato = {
        colaboradorId, tipo: form.tipo,
        fechaInicio: form.fechaInicio,
        fechaFin: form.fechaFin || null,
        fechaInicioPractica: form.fechaInicioPractica || null,
        observacion: form.observacion || null,
      };
      if (adjunto.tipo === 'nuevo') {
        cuerpo.documento = adjunto.evidencia.data;
        cuerpo.documentoNombre = adjunto.evidencia.nombre;
      }
      await api.post('/contratos', cuerpo);
      setModal(false); setForm(VACIO); setAdjunto({ tipo: 'sin-cambio' });
      cargar();
    } catch (err) {
      setError(mensaje(err, 'No pudimos guardar el contrato.'));
    } finally { setGuardando(false); }
  };

  const agregarProrroga = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prorrogando) return;
    setGuardando(true); setError('');
    try {
      await api.post(`/contratos/${prorrogando.id}/prorrogas`, prorroga);
      setProrrogando(null); setProrroga({ desde: '', hasta: '' });
      cargar();
    } catch (err) {
      setError(mensaje(err, 'No pudimos guardar la prórroga.'));
    } finally { setGuardando(false); }
  };

  const eliminar = async () => {
    if (!porBorrar) return;
    await api.delete(`/contratos/${porBorrar.id}`).catch(() => setError('No pudimos eliminar el contrato.'));
    setPorBorrar(null); cargar();
  };

  const confirmarIndefinido = async (c: Contrato) => {
    await api.post(`/contratos/${c.id}/convertir-indefinido`)
      .catch(err => setError(mensaje(err, 'No pudimos marcarlo como indefinido.')));
    cargar();
  };

  const necesitaFin = form.tipo === 'FIJO' || form.tipo === 'APRENDIZAJE';

  // La fecha de terminación se calcula sola salvo que se elija Personalizado.
  const fijarDuracion = (m: number, inicio = form.fechaInicio) => {
    setMeses(m);
    setForm(f => ({ ...f, fechaInicio: inicio, fechaFin: m === 0 ? f.fechaFin : finDeDuracion(inicio, m) }));
  };
  const fijarInicio = (inicio: string) => fijarDuracion(meses, inicio);
  // Qué le pasa a la prórroga que se está escribiendo AHORA. El aviso genérico
  // ("la siguiente debe ser de un año") no sirve de mucho si no mira lo que
  // acabas de elegir: aquí se mide y se dice el número.
  const revisarProrroga = () => {
    if (!prorrogando) return null;
    const dias = diasEntre(prorroga.desde, prorroga.hasta);
    if (dias === null) return null;
    if (dias <= 0) return { tono: 'rojo' as const, texto: 'La fecha de terminación tiene que ser posterior a la de inicio.' };
    const problemas: string[] = [];
    if (prorrogando.calculo.proximaProrrogaMinimaUnAno && dias < DIAS_UN_ANIO) {
      problemas.push(`Esta prórroga mide ${dias} días y debería ser de un año como mínimo, porque el contrato ya lleva cuatro prórrogas y se pactó por menos de un año.`);
    }
    const tope = prorrogando.calculo.topeMaximo;
    if (tope && new Date(prorroga.hasta) > new Date(tope.slice(0, 10))) {
      problemas.push(`Termina después del ${new Date(tope).toLocaleDateString('es-CO')}, que es el tope legal de este contrato. A partir de esa fecha pasa a indefinido por ley.`);
    }
    return problemas.length ? { tono: 'rojo' as const, texto: problemas.join(' ') } : null;
  };

  const fijarDuracionProrroga = (m: number, desde = prorroga.desde) => {
    setMesesProrroga(m);
    setProrroga(pr => ({ desde, hasta: m === 0 ? pr.hasta : finDeDuracion(desde, m) }));
  };

  return (
    <div className="bg-white rounded-card border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="font-semibold text-ink flex items-center gap-2"><FileSignature size={16} /> Contratos</p>
        <button onClick={() => { setError(''); setForm(VACIO); setAdjunto({ tipo: 'sin-cambio' }); setModal(true); }}
          className="flex items-center gap-1.5 text-xs font-semibold text-ink bg-primary hover:bg-primary-dark px-2.5 py-1.5 rounded-lg">
          <Plus size={13} /> Agregar
        </button>
      </div>
      <p className="text-xs text-muted mb-3">
        Tipo de contrato, vigencia, prórrogas y documento firmado. Avisamos 30 días antes del vencimiento,
        que es el plazo legal para no renovar.
      </p>

      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

      <div className="space-y-3 max-h-[26rem] overflow-y-auto">
        {lista?.length === 0 && (
          <p className="text-sm text-muted">Sin contratos registrados. Es opcional: nada deja de funcionar si no lo cargas.</p>
        )}
        {lista?.map(c => {
          const k = c.calculo;
          const indefinidoDeFacto = c.tipo === 'INDEFINIDO' || !!c.convertidoAIndefinidoEn;
          return (
            <div key={c.id} className={`rounded-xl border p-3.5 ${c.estado === 'VIGENTE' ? 'border-gray-200' : 'border-gray-100 bg-gray-50/60'}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-ink flex items-center gap-2 flex-wrap">
                    {TIPO_LABEL[c.tipo]}
                    {c.estado === 'VIGENTE'
                      ? <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-800">VIGENTE</span>
                      : <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-200 text-gray-600">TERMINADO</span>}
                    {c.convertidoAIndefinidoEn && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">PASÓ A INDEFINIDO</span>
                    )}
                    {k.etapa && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/30 text-ink">
                        ETAPA {k.etapa}
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-muted mt-0.5">
                    Desde el {fecha(c.fechaInicio)}
                    {!indefinidoDeFacto && k.finVigente && ` · hasta el ${fecha(k.finVigente)}`}
                    {k.numeroProrrogas > 0 && ` · ${k.numeroProrrogas} ${k.numeroProrrogas === 1 ? 'prórroga' : 'prórrogas'}`}
                  </p>
                </div>
                <button onClick={() => setPorBorrar(c)} title="Eliminar contrato"
                  className="p-1.5 text-red-500 hover:bg-red-50 rounded shrink-0"><Trash2 size={15} /></button>
              </div>

              {/* Las alertas van primero y con color: es lo que hay que actuar. */}
              {k.alertas.map(a => {
                const t = ALERTA[a.tipo];
                return (
                  <div key={a.tipo} className={`mt-2.5 rounded-lg border px-3 py-2 text-xs ${TONOS[t.tono]}`}>
                    <p className="font-bold flex items-center gap-1.5">
                      {t.tono === 'azul' ? <Info size={13} /> : <AlertTriangle size={13} />}{t.titulo}
                    </p>
                    <p className="mt-0.5 leading-relaxed">{t.detalle(a.dias)}</p>
                    {(a.tipo === 'SUPERA_TOPE' || a.tipo === 'SE_VUELVE_INDEFINIDO') && !c.convertidoAIndefinidoEn && (
                      <button onClick={() => confirmarIndefinido(c)}
                        className="mt-2 flex items-center gap-1.5 text-xs font-bold bg-white border border-current px-2.5 py-1 rounded-lg">
                        <Check size={13} /> Confirmar paso a indefinido
                      </button>
                    )}
                  </div>
                );
              })}

              {!indefinidoDeFacto && k.fechaLimitePreaviso && c.estado === 'VIGENTE' && (
                <p className="text-[11px] text-muted mt-2">
                  Plazo para avisar por escrito: hasta el <b>{corta(k.fechaLimitePreaviso)}</b>
                  {k.seVuelveIndefinidoEl && ` · pasa a indefinido el ${corta(k.seVuelveIndefinidoEl)}`}
                </p>
              )}

              {c.prorrogas.length > 0 && (
                <div className="mt-2.5 border-t border-gray-100 pt-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted mb-1">Prórrogas</p>
                  {c.prorrogas.map((p, i) => (
                    <p key={p.id} className="text-xs text-ink">
                      {i + 1}. {corta(p.desde)} → {corta(p.hasta)}
                      {p.documentoNombre && <Paperclip size={11} className="inline ml-1.5 text-primary-dark" />}
                    </p>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-3 mt-2.5">
                {(c.tipo === 'FIJO' || c.tipo === 'APRENDIZAJE') && c.estado === 'VIGENTE' && !c.convertidoAIndefinidoEn && (
                  <button onClick={() => { setProrroga({ desde: soloFecha(k.finVigente), hasta: '' }); setProrrogando(c); }}
                    className="text-xs font-semibold text-primary-dark hover:underline">Agregar prórroga</button>
                )}
                {c.documentoNombre && (
                  <span className="text-xs text-muted flex items-center gap-1"><Paperclip size={12} />{c.documentoNombre}</span>
                )}
              </div>
              {c.observacion && <p className="text-xs text-muted mt-2 whitespace-pre-wrap">{c.observacion}</p>}
            </div>
          );
        })}
      </div>

      {/* Alta de contrato */}
      {modal && (
        <div className="fixed inset-0 !mt-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setModal(false)}>
          <form onSubmit={crear} onClick={e => e.stopPropagation()}
            className="hp-pop bg-white rounded-2xl p-6 w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto space-y-4">
            <h3 className="font-bold text-lg text-ink">Nuevo contrato</h3>

            <div>
              <label className="block text-xs font-medium text-muted mb-1">Tipo</label>
              <select value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value as TipoContrato })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                {Object.entries(TIPO_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-muted mb-1">Inicio</label>
                <input type="date" required value={form.fechaInicio}
                  onChange={e => fijarInicio(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              {necesitaFin && (
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">Duración</label>
                  <select value={meses} onChange={e => fijarDuracion(Number(e.target.value))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                    {duracionesDe(form.tipo).map(d => (
                      <option key={d.meses} value={d.meses}>{d.etiqueta}</option>
                    ))}
                    <option value={0}>Personalizado</option>
                  </select>
                </div>
              )}
            </div>

            {necesitaFin && (
              <>
                {/* Mismo ancho que Inicio y Duración: los tres campos van en la
                    misma rejilla, aunque Terminación caiga en la fila de abajo. */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-muted mb-1">
                      Terminación {meses > 0 && <span className="text-gray-400">(calculada)</span>}
                    </label>
                    <input type="date" required value={form.fechaFin}
                      readOnly={meses > 0}
                      onChange={e => setForm({ ...form, fechaFin: e.target.value })}
                      className={`w-full border border-gray-300 rounded-lg px-3 py-2 text-sm ${meses > 0 ? 'bg-gray-50 text-muted' : ''}`} />
                  </div>
                </div>
                {/* El umbral del año es lo único que la ley sí distingue, así que
                    se dice al elegir y no cuando ya haya cuatro prórrogas encima. */}
                {meses > 0 && caeEnRegla4taProrroga(meses) && (
                  <p className="text-[11px] text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
                    Al ser de menos de un año, después de la cuarta prórroga la siguiente
                    tendrá que ser de un año como mínimo.
                  </p>
                )}
                {meses === 0 && (
                  <p className="text-[11px] text-muted">
                    Escribe la fecha a mano. Recuerda el tope legal: {form.tipo === 'APRENDIZAJE' ? 'tres' : 'cuatro'} años.
                  </p>
                )}
              </>
            )}

            {form.tipo === 'APRENDIZAJE' && (
              <div>
                <label className="block text-xs font-medium text-muted mb-1">Inicio de la etapa práctica</label>
                <input type="date" value={form.fechaInicioPractica}
                  onChange={e => setForm({ ...form, fechaInicioPractica: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                <p className="text-[11px] text-muted mt-1">
                  Al pasar a práctica la remuneración sube del 75% al 100% del salario mínimo. Te avisamos antes.
                </p>
              </div>
            )}

            {!necesitaFin && (
              <p className="text-[11px] text-muted bg-gray-50 rounded-lg px-3 py-2">
                {form.tipo === 'INDEFINIDO'
                  ? 'El contrato a término indefinido no tiene fecha de terminación.'
                  : 'El de obra o labor termina con la obra, no en una fecha, así que no genera avisos de vencimiento.'}
              </p>
            )}

            <div>
              <label className="block text-xs font-medium text-muted mb-1">Contrato firmado (opcional)</label>
              <CampoEvidencia onCambio={setAdjunto} />
            </div>

            <div>
              <label className="block text-xs font-medium text-muted mb-1">Observaciones</label>
              <textarea rows={2} value={form.observacion}
                onChange={e => setForm({ ...form, observacion: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none" />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex gap-3 justify-end">
              <button type="button" onClick={() => setModal(false)}
                className="px-4 py-2 text-sm text-muted border border-gray-300 rounded-lg hover:bg-gray-50">Cancelar</button>
              <button type="submit" disabled={guardando}
                className="px-4 py-2 text-sm bg-primary hover:bg-primary-dark text-ink font-bold rounded-lg disabled:opacity-60">
                {guardando ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Alta de prórroga */}
      {prorrogando && (
        <div className="fixed inset-0 !mt-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setProrrogando(null)}>
          <form onSubmit={agregarProrroga} onClick={e => e.stopPropagation()}
            className="hp-pop bg-white rounded-2xl p-6 w-full max-w-md shadow-xl space-y-4">
            <h3 className="font-bold text-lg text-ink">Nueva prórroga</h3>
            {prorrogando.calculo.proximaProrrogaMinimaUnAno && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                <p className="font-bold flex items-center gap-1.5"><AlertTriangle size={13} />Esta prórroga debe ser de un año como mínimo</p>
                <p className="mt-0.5">Ya lleva cuatro prórrogas y el contrato se pactó por menos de un año.</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-muted mb-1">Desde</label>
                <input type="date" required value={prorroga.desde}
                  onChange={e => fijarDuracionProrroga(mesesProrroga, e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted mb-1">Duración</label>
                <select value={mesesProrroga} onChange={e => fijarDuracionProrroga(Number(e.target.value))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                  {duracionesDe(prorrogando.tipo).map(d => (
                    <option key={d.meses} value={d.meses}>{d.etiqueta}</option>
                  ))}
                  <option value={0}>Personalizado</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted mb-1">
                Hasta {mesesProrroga > 0 && <span className="text-gray-400">(calculada)</span>}
              </label>
              <input type="date" required value={prorroga.hasta}
                readOnly={mesesProrroga > 0}
                onChange={e => setProrroga({ ...prorroga, hasta: e.target.value })}
                className={`w-full border border-gray-300 rounded-lg px-3 py-2 text-sm ${mesesProrroga > 0 ? 'bg-gray-50 text-muted' : ''}`} />
            </div>
            {prorrogando.calculo.topeMaximo && (
              <p className="text-[11px] text-muted">
                Tope legal de este contrato: {corta(prorrogando.calculo.topeMaximo)}. Más allá de esa fecha pasa a indefinido.
              </p>
            )}
            {/* Lo que le pasa a ESTA prórroga, con sus días contados. Avisa, no
                bloquea: el botón de guardar sigue activo a propósito. */}
            {(() => {
              const r = revisarProrroga();
              if (!r) return null;
              return (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
                  <p className="font-bold flex items-center gap-1.5"><AlertTriangle size={13} />Revisa esta prórroga</p>
                  <p className="mt-0.5 leading-relaxed">{r.texto}</p>
                  <p className="mt-1 text-red-700/80">Puedes guardarla igual si sabes lo que estás firmando.</p>
                </div>
              );
            })()}
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex gap-3 justify-end">
              <button type="button" onClick={() => setProrrogando(null)}
                className="px-4 py-2 text-sm text-muted border border-gray-300 rounded-lg hover:bg-gray-50">Cancelar</button>
              <button type="submit" disabled={guardando}
                className="px-4 py-2 text-sm bg-primary hover:bg-primary-dark text-ink font-bold rounded-lg disabled:opacity-60">
                {guardando ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </form>
        </div>
      )}

      <ConfirmDialog
        abierto={porBorrar !== null}
        peligro
        titulo="¿Eliminar este contrato?"
        subtitulo="Se borran también sus prórrogas y el documento adjunto. Esta acción no se puede deshacer."
        textoContinuar="Sí, eliminar"
        onContinuar={eliminar}
        onCancelar={() => setPorBorrar(null)}
      />
    </div>
  );
}
