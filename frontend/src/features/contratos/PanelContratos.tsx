import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { FileSignature, Plus, AlertTriangle } from 'lucide-react';
import api from '../../lib/api';
import ConfirmDialog from '../../components/ConfirmDialog';
import VisorDocumento, { type DocumentoVisto } from '../../components/VisorDocumento';
import CampoEvidencia, { type CambioEvidencia } from '../../components/CampoEvidencia';
import { TIPO_LABEL, type Contrato, type TipoContrato } from './tipos';
import TarjetaContrato from './TarjetaContrato';
import { duracionesDe, finDeDuracion, diaSiguiente, caeEnRegla4taProrroga, diasEntre, DIAS_UN_ANIO } from './duraciones';

const corta = (s: string | null) => s ? format(new Date(s), 'dd/MM/yyyy') : '—';
const soloFecha = (s: string | null) => s ? s.slice(0, 10) : '';

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
  const [adjuntoProrroga, setAdjuntoProrroga] = useState<CambioEvidencia>({ tipo: 'sin-cambio' });
  const [documento, setDocumento] = useState<DocumentoVisto | null>(null);
  const [abriendoDoc, setAbriendoDoc] = useState(false);

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
      const cuerpo: { desde: string; hasta: string; documento?: string; documentoNombre?: string } = { ...prorroga };
      if (adjuntoProrroga.tipo === 'nuevo') {
        cuerpo.documento = adjuntoProrroga.evidencia.data;
        cuerpo.documentoNombre = adjuntoProrroga.evidencia.nombre;
      }
      await api.post(`/contratos/${prorrogando.id}/prorrogas`, cuerpo);
      setProrrogando(null); setProrroga({ desde: '', hasta: '' }); setAdjuntoProrroga({ tipo: 'sin-cambio' });
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

  const verDocumento = async (url: string, nombre: string | null) => {
    setAbriendoDoc(true);
    try {
      const r = await api.get(url);
      setDocumento({ data: r.data.documento, tipo: r.data.documentoTipo, nombre: r.data.documentoNombre ?? nombre });
    } catch {
      setError('No pudimos abrir el documento.');
    } finally { setAbriendoDoc(false); }
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

  // Duración mínima que la ley admite para la próxima prórroga de este contrato.
  const minimoProrroga = (c: Contrato) => (c.calculo.proximaProrrogaMinimaUnAno ? 12 : 0);

  // El modal se abre con la cuenta ya hecha: la prórroga arranca el día siguiente
  // al fin del período vigente y la fecha de terminación sale de la duración
  // preseleccionada. Antes se preseleccionaba "1 año" pero se dejaba "Hasta" en
  // blanco, así que el selector decía una cosa y el campo calculado no decía
  // nada, hasta que uno tocaba algo. Un formulario no puede afirmar algo que no
  // ha calculado, menos cuando de ahí sale una fecha de vencimiento.
  const abrirProrroga = (c: Contrato) => {
    const meses = Math.max(12, minimoProrroga(c));
    const desde = diaSiguiente(soloFecha(c.calculo.finVigente));
    setError('');
    setMesesProrroga(meses);
    setProrroga({ desde, hasta: finDeDuracion(desde, meses) });
    setAdjuntoProrroga({ tipo: 'sin-cambio' });
    setProrrogando(c);
  };

  return (
    // `min-w-0`: un hijo de rejilla no baja de su ancho mínimo de contenido a
    // menos que se le diga. Sin esto, la fila de prórrogas más larga estiraba el
    // panel entero por fuera de su columna y en el celular la tarjeta salía
    // cortada por la derecha.
    <div className="bg-white rounded-card border border-gray-200 p-5 min-w-0">
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
        {lista?.map(c => (
          <TarjetaContrato
            key={c.id}
            c={c}
            onBorrar={() => setPorBorrar(c)}
            onProrrogar={() => abrirProrroga(c)}
            onConvertir={() => confirmarIndefinido(c)}
            onVerDocumento={verDocumento}
          />
        ))}
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
                  {/* Con la regla de la cuarta prórroga encima, las duraciones
                      cortas no se listan. Personalizado sigue ahí: si alguien
                      firmó algo más corto a sabiendas, tiene que poder
                      registrarlo, y el aviso rojo de abajo se lo dirá. */}
                  {duracionesDe(prorrogando.tipo, minimoProrroga(prorrogando)).map(d => (
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
            <div>
              <label className="block text-xs font-medium text-muted mb-1">Otrosí firmado (opcional)</label>
              <CampoEvidencia onCambio={setAdjuntoProrroga} />
            </div>

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

      {abriendoDoc && <p className="text-xs text-muted mt-2">Abriendo documento...</p>}
      {documento && <VisorDocumento doc={documento} onCerrar={() => setDocumento(null)} />}
    </div>
  );
}
