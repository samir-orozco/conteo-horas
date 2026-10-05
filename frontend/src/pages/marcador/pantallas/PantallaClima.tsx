import { useEffect, useReducer, useRef, useState } from 'react';
import { Check } from 'lucide-react';
import { IMAGEN_DE_CARITA } from '../../../features/clima/caritas';
import {
  MOTIVO_OTRO, NOMBRE_DE_CARITA, VENTANA_INICIAL, ventanaClima, muestraMotivos,
  calificacionAGuardar, observacionAEnviar,
} from '../../../features/clima/ventanaClima';

// «¿CÓMO TE FUE HOY?» (4 de octubre de 2026). Sale después de que la salida quedó registrada, nunca
// antes: la marca no depende de esto. docs/CLIMA_LABORAL.md §3. Lo que pasa al tocar cada cosa vive en
// features/clima/ventanaClima.ts, con sus pruebas; aquí solo se dibuja y se manda.

// Sin tocar nada, la ventana se cierra sola: en una tableta compartida hay alguien esperando detrás.
// En cuanto la persona toca algo deja de contar, y la cierra el cierre por inactividad del kiosco.
export const SEGUNDOS_SIN_TOCAR = 8;

type Props = {
  nombre: string;
  hora: string;
  motivos: string[];
  guardar: (c: { carita: number; motivos: string[] }) => Promise<unknown>;
  enviarObservacion: (o: { texto: string; confidencial: boolean }) => Promise<unknown>;
  onTerminar: () => void;
};

export default function PantallaClima({ nombre, hora, motivos, guardar, enviarObservacion, onTerminar }: Props) {
  const [e, despachar] = useReducer(ventanaClima, VENTANA_INICIAL);
  const [tocado, setTocado] = useState(false);
  const [restantes, setRestantes] = useState(SEGUNDOS_SIN_TOCAR);
  const [errorGuardar, setErrorGuardar] = useState(false);
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  // NADA DE LO QUE VUELVA TARDE PUEDE TOCAR AL KIOSCO DESPUÉS DE CERRARSE LA VENTANA (revisión
  // adversarial del 4 de octubre de 2026). Con la red pegada, el cierre por inactividad se la lleva y
  // entra otra persona; si el envío pendiente llamara `onTerminar` al volver, le cerraría la sesión a
  // ella. Todo lo que termina después de un `await` pregunta primero si la ventana sigue montada.
  const montada = useRef(true);
  useEffect(() => { montada.current = true; return () => { montada.current = false; }; }, []);

  // LOS GUARDADOS VAN EN FILA. Cada toque manda la carita y los motivos completos, y el siguiente no
  // sale hasta que vuelva el anterior: si salieran a la vez, uno viejo podría llegar después y pisar
  // el último toque.
  const cola = useRef<Promise<void>>(Promise.resolve());
  // Si el último guardado falló. En un ref y no solo en el estado: `terminar` lo lee después de un
  // `await`, cuando el estado de su render ya es viejo.
  const falloGuardar = useRef(false);
  const encolar = (c: { carita: number; motivos: string[] }) => {
    cola.current = cola.current
      .then(() => guardar(c))
      .then(
        () => { falloGuardar.current = false; if (montada.current) setErrorGuardar(false); },
        () => { falloGuardar.current = true; if (montada.current) setErrorGuardar(true); },
      );
  };
  const primeraVez = useRef(true);
  const calificacion = calificacionAGuardar(e);
  const clave = calificacion ? JSON.stringify(calificacion) : null;
  useEffect(() => {
    if (primeraVez.current) { primeraVez.current = false; return; }
    if (calificacion) encolar(calificacion);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clave]);

  const onTerminarRef = useRef(onTerminar);
  useEffect(() => { onTerminarRef.current = onTerminar; }, [onTerminar]);
  useEffect(() => {
    if (tocado) return;
    const t = setInterval(() => setRestantes(r => r - 1), 1000);
    return () => clearInterval(t);
  }, [tocado]);
  // Al tocar algo la cuenta se detiene, así que nunca llega a cero.
  useEffect(() => {
    if (restantes <= 0) onTerminarRef.current();
  }, [restantes]);

  const terminar = async () => {
    setEnviando(true);
    setErrorEnvio(null);
    // Si la carita no se pudo guardar, se vuelve a mandar: cerrar así la dejaría perdida, y la
    // observación directa no tendría a qué pegarse (el servidor respondería 409 para siempre).
    if (falloGuardar.current && calificacion) encolar(calificacion);
    await cola.current;
    // Si la ventana ya se cerró, lo que la persona pidió enviar igual sale (va con SU token), pero nada
    // toca la pantalla ni la sesión, que ya pueden ser de otra persona.
    if (falloGuardar.current) { if (montada.current) setEnviando(false); return; }
    const obs = observacionAEnviar(e);
    if (obs) {
      try {
        await enviarObservacion(obs);
      } catch (err) {
        if (!montada.current) return;
        const r = (err as { response?: { data?: { codigo?: string; error?: string } } }).response;
        // La nota SÍ llegó: el servidor la guardó y se perdió la respuesta. Reintentar daría 409 para
        // siempre, y la persona creería que su nota no llegó.
        if (obs.confidencial && r?.data?.codigo === 'YA_ENVIADA') { onTerminar(); return; }
        setErrorEnvio(r?.data?.error ?? 'No pudimos enviar tu observación. Inténtalo otra vez.');
        setEnviando(false);
        return;
      }
    }
    if (montada.current) onTerminar();
  };

  const conTexto = e.texto.trim() !== '';

  return (
    <div
      className="min-h-screen bg-ink flex items-center justify-center p-4"
      onPointerDownCapture={() => setTocado(true)}
      onKeyDownCapture={() => setTocado(true)}
    >
      <div className="hp-pop w-full max-w-sm rounded-[28px] border border-white/10 bg-white/[0.06] backdrop-blur-2xl shadow-2xl p-6 text-center">
        <p className="text-sm font-semibold text-green-400 flex items-center justify-center gap-1.5">
          <Check size={16} /> {`Salida registrada · ${hora}`}
        </p>
        <h2 className="text-xl font-bold text-white mt-2">¿Cómo te fue hoy, {nombre}?</h2>

        <div role="radiogroup" aria-label="Cómo te fue hoy" className="flex justify-between mt-6 px-1">
          {[1, 2, 3, 4, 5].map(valor => {
            const escogida = e.carita === valor;
            return (
              <button
                key={valor} type="button" role="radio" aria-checked={escogida} aria-label={NOMBRE_DE_CARITA[valor]}
                onClick={() => despachar({ tipo: 'carita', valor })}
                className={`rounded-full p-1 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                  escogida ? 'scale-110 ring-2 ring-white' : e.carita !== null ? 'opacity-40' : 'hover:scale-105'}`}
              >
                <img src={IMAGEN_DE_CARITA[valor]} alt="" className="w-12 h-12" draggable={false} />
              </button>
            );
          })}
        </div>
        <p aria-live="polite" className="h-6 mt-2 text-base font-bold text-white">
          {e.carita !== null ? NOMBRE_DE_CARITA[e.carita] : ''}
        </p>

        {muestraMotivos(e.carita) && (
          <div className="mt-3">
            <p className="text-sm text-white/60 mb-2">¿Qué pasó? Puedes marcar varios</p>
            <div className="flex flex-wrap justify-center gap-2">
              {[...motivos, MOTIVO_OTRO].map(m => {
                const marcado = e.motivos.includes(m);
                return (
                  <button
                    key={m} type="button" aria-pressed={marcado}
                    onClick={() => despachar({ tipo: 'motivo', valor: m })}
                    className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                      marcado ? 'bg-primary border-primary text-ink' : 'border-white/20 text-white/80 hover:bg-white/5'}`}
                  >
                    {m}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {e.carita !== null && !e.observacionAbierta && (
          <button
            type="button" onClick={() => despachar({ tipo: 'abrirObservacion' })}
            className="mt-4 text-sm font-semibold text-white/70 hover:text-white"
          >
            + Agregar observación
          </button>
        )}

        {e.observacionAbierta && (
          <div className="mt-4 text-left">
            <label htmlFor="clima-observacion" className="block text-xs font-medium text-white/60 mb-1">Observación</label>
            <textarea
              id="clima-observacion" value={e.texto} rows={3} maxLength={1000} autoFocus
              onChange={ev => despachar({ tipo: 'texto', valor: ev.target.value })}
              className="w-full border border-white/10 rounded-xl px-3 py-2.5 text-sm resize-none"
            />
            <div className="mt-3 flex items-start gap-3">
              <button
                type="button" role="switch" aria-checked={e.confidencial} aria-label="Enviar como confidencial"
                onClick={() => despachar({ tipo: 'confidencial' })}
                className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                  e.confidencial ? 'bg-primary' : 'bg-white/20'}`}
              >
                <span className={`absolute top-1 left-1 h-4 w-4 rounded-full bg-white shadow transition-transform ${e.confidencial ? 'translate-x-5' : ''}`} />
              </button>
              <div className="leading-snug">
                <p className="text-sm font-semibold text-white" aria-hidden="true">Enviar como confidencial</p>
                <p className="text-xs text-white/50 mt-0.5">Tu empresa no verá tu nombre.</p>
              </div>
            </div>
          </div>
        )}

        {errorGuardar && <p role="alert" className="mt-4 text-sm text-red-300">No pudimos guardar tu respuesta.</p>}
        {errorEnvio && <p role="alert" className="mt-4 text-sm text-red-300">{errorEnvio}</p>}

        {e.carita === null ? (
          <div className="mt-6 flex items-center justify-between">
            <button type="button" onClick={onTerminar} className="text-sm font-medium text-white/50 hover:text-white/80 py-2 px-1">
              Omitir
            </button>
            {!tocado && <span className="text-xs text-white/40 tabular-nums">{`se cierra en ${Math.max(restantes, 0)} s`}</span>}
          </div>
        ) : (
          <button
            type="button" onClick={terminar} disabled={enviando}
            className="w-full mt-6 bg-primary hover:bg-primary-dark text-ink font-bold py-3.5 rounded-2xl text-base disabled:opacity-60 transition-colors"
          >
            {conTexto ? 'Enviar' : 'Listo'}
          </button>
        )}
        {/* Con un error que no se arregla reintentando, la persona no puede quedar atrapada. */}
        {e.carita !== null && (errorGuardar || errorEnvio) && (
          <button type="button" onClick={onTerminar} className="mt-3 text-sm font-medium text-white/50 hover:text-white/80">
            {errorGuardar ? 'Cerrar sin guardar' : 'Cerrar sin enviar'}
          </button>
        )}
      </div>
    </div>
  );
}
