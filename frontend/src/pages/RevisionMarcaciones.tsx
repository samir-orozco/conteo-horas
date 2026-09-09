import { useCallback, useEffect, useState } from 'react';
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { ScanFace, ImageOff, AlertTriangle, ChevronLeft, ChevronRight, Info } from 'lucide-react';
import api from '../lib/api';
import { fotosExpiradas } from '../lib/retencionFotos';
import {
  motivoSinFoto, TEXTO_SIN_FOTO, ROTULO_METODO, ROTULO_MOMENTO,
  type EventoDeRevision, type RespuestaRevision,
} from '../lib/revision';

// REVISIÓN DE MARCACIONES: una foto a la vez, grande, y se avanza con el teclado.
//
// Existe porque se reportó que alguien marca mostrando la foto de un compañero
// en la pantalla de un celular. Eso no lo detecta ningún dato que guardemos: lo
// detecta un ojo humano viendo el brillo de la pantalla, el filo del bisel o la
// mano que la sostiene.
//
// POR QUÉ UNA FOTO GRANDE Y NO UNA CUADRÍCULA DE MINIATURAS. No es una concesión
// a la política de privacidad, aunque también la respete: es lo que MEJOR
// detecta. La evidencia del fraude vive en el detalle fino, que es lo primero
// que borra un reescalado. Y de paso, la imagen se pide de a una, que es
// exactamente lo que la política publicada afirma que hace el producto.
//
// POR QUÉ NO HAY ORDEN POR SOSPECHA. Se diseñó y se descartó: el fraude que se
// busca produce una marcación que se ve perfecta (la cámara SÍ reconoció, por eso
// funciona el truco), así que cualquier puntaje lo pondría de último. Y "marcó
// con cédula" no significa que esquivara la cámara, sino que la cámara no lo
// reconoció en 8 segundos, cosa que le pasa a la misma gente inocente todos los
// días. Un orden falso es peor que ninguno: el supervisor confía y deja de mirar
// lo de abajo. El orden es cronológico, que es como ocurrió el día.

const TZ = 'America/Bogota';
const hhmm = (iso: string) => format(toZonedTime(new Date(iso), TZ), 'HH:mm');
const diaCorto = (iso: string) => format(toZonedTime(new Date(iso), TZ), "d 'de' MMM");

const VENTANAS = [
  { dias: 1, etiqueta: 'Hoy' },
  { dias: 3, etiqueta: '3 días' },
  { dias: 7, etiqueta: '7 días' },
];

export default function RevisionMarcaciones() {
  const [dias, setDias] = useState(1);
  const [idx, setIdx] = useState(0);
  // La respuesta se guarda JUNTO A LA VENTANA que la pidió. Así «cargando» se
  // deriva de comparar las dos, en vez de ser otro `setState` dentro del efecto,
  // que dispara renders en cascada. Es el mismo patrón de `FotosJornada.tsx`, y
  // de paso hace imposible pintar los datos de una ventana bajo el rótulo de otra.
  const [estado, setEstado] = useState<{ dias: number; datos: RespuestaRevision | null } | null>(null);
  // La foto vive junto a la clave del evento al que pertenece. Así, al cambiar de
  // marcación, la anterior se descarta sola y nunca se pinta la cara de una
  // persona bajo el nombre de otra.
  const [foto, setFoto] = useState<{ clave: string; url: string | null } | null>(null);

  useEffect(() => {
    let vigente = true;
    api.get('/registros/revision', { params: { dias } })
      .then(r => { if (vigente) setEstado({ dias, datos: r.data }); })
      // La pantalla no puede tumbarse porque falle una petición.
      .catch(() => { if (vigente) setEstado({ dias, datos: null }); });
    return () => { vigente = false; };
  }, [dias]);

  const vigente = estado?.dias === dias ? estado : null;
  const cargando = !vigente;
  const error = !!vigente && !vigente.datos;
  const datos = vigente?.datos ?? null;
  const eventos = datos?.eventos ?? [];
  const actual: EventoDeRevision | undefined = eventos[idx];

  // La imagen se pide SOLO del evento que se está mirando, nunca en bloque.
  useEffect(() => {
    // Sin `setFoto(null)` aquí: limpiarlo sería un `setState` síncrono dentro del
    // efecto. No hace falta, porque la foto viaja con su clave y el render solo
    // la pinta si coincide con la marcación que se está mirando.
    if (!actual?.tieneFoto) return;
    let sigueVigente = true;
    api.get(`/registros/${actual.registroId}/fotos`)
      .then(r => {
        if (!sigueVigente) return;
        const d = r.data as { fotoEntrada: string | null; fotoSalida: string | null };
        setFoto({ clave: actual.clave, url: actual.momento === 'entrada' ? d.fotoEntrada : d.fotoSalida });
      })
      .catch(() => { if (sigueVigente) setFoto({ clave: actual.clave, url: null }); });
    return () => { sigueVigente = false; };
  }, [actual]);

  const mover = useCallback((paso: number) => {
    setIdx(i => Math.min(Math.max(i + paso, 0), Math.max(eventos.length - 1, 0)));
  }, [eventos.length]);

  // El teclado es lo que hace que esto se pueda recorrer rápido. Sin él, revisar
  // cuarenta caras a golpe de ratón es un trabajo que nadie termina.
  useEffect(() => {
    const alPulsar = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); mover(1); }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); mover(-1); }
    };
    window.addEventListener('keydown', alPulsar);
    return () => window.removeEventListener('keydown', alPulsar);
  }, [mover]);

  const nombreDe = (colaboradorId: string) => {
    const p = datos?.personas.find(x => x.id === colaboradorId);
    return p ? `${p.nombre} ${p.apellido}` : 'Colaborador';
  };

  return (
    <div>
      <div className="mb-5">
        <h2 className="text-2xl font-bold text-ink flex items-center gap-2">
          <ScanFace size={24} /> Revisión de marcaciones
        </h2>
        <p className="text-sm text-muted mt-1 max-w-2xl">
          Recorra las fotos con las flechas del teclado. Busque el <b>filo de un marco</b>,
          un <b>brillo de pantalla</b> o una <b>mano sosteniendo algo</b>: así se ve alguien
          marcando con la foto de un compañero en un celular.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        {VENTANAS.map(v => (
          <button
            key={v.dias}
            onClick={() => { setDias(v.dias); setIdx(0); }}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition ${
              dias === v.dias
                ? 'bg-ink text-white border-ink'
                : 'bg-white text-muted border-gray-200 hover:border-gray-300'
            }`}
          >
            {v.etiqueta}
          </button>
        ))}
        {datos && (
          <span className="text-sm text-muted ml-1">
            {eventos.length} {eventos.length === 1 ? 'marcación' : 'marcaciones'}
          </span>
        )}
      </div>

      {datos?.truncado && (
        <p className="mb-4 text-sm bg-amber-50 text-amber-800 border border-amber-200 rounded-xl px-4 py-3">
          Hay más marcaciones de las que caben en esta vista. Se muestran las más recientes;
          reduzca la ventana para verlas todas.
        </p>
      )}

      {error ? (
        <p className="text-sm text-muted py-12 text-center">No pudimos cargar las marcaciones.</p>
      ) : cargando ? (
        <p className="text-sm text-gray-400 py-12 text-center">Cargando marcaciones...</p>
      ) : eventos.length === 0 ? (
        <p className="text-sm text-muted py-12 text-center">
          No hay marcaciones en este período.
        </p>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
          <ol className="order-2 lg:order-1 max-h-[70vh] overflow-y-auto rounded-xl border border-gray-200 divide-y divide-gray-100">
            {eventos.map((ev, i) => (
              <li key={ev.clave}>
                <button
                  onClick={() => setIdx(i)}
                  aria-current={i === idx ? 'true' : undefined}
                  className={`w-full text-left px-3 py-2.5 transition ${
                    i === idx ? 'bg-amber-50' : 'hover:bg-gray-50'
                  }`}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="font-medium text-ink text-sm truncate">{nombreDe(ev.colaboradorId)}</span>
                    <span className="text-xs text-muted shrink-0">{hhmm(ev.hora)}</span>
                  </span>
                  <span className="flex items-center gap-1.5 mt-1 flex-wrap">
                    <span className="text-[11px] text-muted">{ROTULO_MOMENTO[ev.momento]}</span>
                    <span className="text-[11px] text-muted">·</span>
                    <span className="text-[11px] text-muted">{ROTULO_METODO[ev.metodo]}</span>
                    {!ev.tieneFoto && <ImageOff size={12} className="text-gray-400" />}
                    {ev.distanciaRepetida && (
                      <span className="text-[10px] font-semibold uppercase bg-red-50 text-red-700 px-1.5 py-0.5 rounded">
                        Repetida
                      </span>
                    )}
                  </span>
                </button>
              </li>
            ))}
          </ol>

          {actual && (
            <div className="order-1 lg:order-2">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div>
                  <p className="font-semibold text-ink">{nombreDe(actual.colaboradorId)}</p>
                  <p className="text-sm text-muted">
                    {ROTULO_MOMENTO[actual.momento]} · {diaCorto(actual.hora)} a las {hhmm(actual.hora)} · {ROTULO_METODO[actual.metodo]}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => mover(-1)} disabled={idx === 0}
                    aria-label="Marcación anterior"
                    className="p-2 rounded-lg border border-gray-200 disabled:opacity-40 hover:border-gray-300">
                    <ChevronLeft size={18} />
                  </button>
                  <span className="text-xs text-muted tabular-nums px-1">{idx + 1} / {eventos.length}</span>
                  <button onClick={() => mover(1)} disabled={idx >= eventos.length - 1}
                    aria-label="Marcación siguiente"
                    className="p-2 rounded-lg border border-gray-200 disabled:opacity-40 hover:border-gray-300">
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>

              {actual.distanciaRepetida && (
                <p className="mb-3 text-sm bg-red-50 text-red-800 border border-red-200 rounded-xl px-4 py-3 flex gap-2">
                  <AlertTriangle size={18} className="shrink-0 mt-0.5" />
                  <span>
                    El reconocimiento de esta persona dio <b>exactamente el mismo resultado</b> en
                    más de una marcación. Dos capturas de una cara real nunca coinciden al
                    milímetro, así que esto es compatible con una copia reenviada. Vale la pena
                    revisarlo.
                  </span>
                </p>
              )}

              {actual.tieneFoto && foto?.clave === actual.clave && foto.url ? (
                /* Espejada, como se vio la persona a sí misma al marcar. Y a
                   tamaño grande: el detalle fino es donde se ve el bisel. */
                <img
                  src={foto.url}
                  alt={`Foto de ${ROTULO_MOMENTO[actual.momento].toLowerCase()} de ${nombreDe(actual.colaboradorId)}`}
                  className="w-full max-w-xl rounded-2xl border border-gray-200 [transform:scaleX(-1)]"
                />
              ) : actual.tieneFoto ? (
                <div className="w-full max-w-xl aspect-[4/3] rounded-2xl border border-gray-200 bg-gray-50 flex items-center justify-center">
                  <p className="text-sm text-gray-400">Cargando foto...</p>
                </div>
              ) : (
                <div className="w-full max-w-xl aspect-[4/3] rounded-2xl border border-dashed border-gray-300 bg-gray-50 flex flex-col items-center justify-center px-6 text-center">
                  <ImageOff size={28} className="text-gray-400 mb-2" />
                  <p className="text-sm text-muted">
                    {TEXTO_SIN_FOTO[motivoSinFoto(actual, fotosExpiradas(actual.hora))]}
                  </p>
                </div>
              )}

              <p className="text-[11px] text-muted mt-3 flex items-center gap-1.5">
                <Info size={12} /> Las fotos se eliminan automáticamente a los 2 meses.
                Se piden de una en una: nunca se cargan todas juntas.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
