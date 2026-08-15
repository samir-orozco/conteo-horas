import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { Camera, ImageOff, Info } from 'lucide-react';
import api from '../lib/api';
import { fotosExpiradas, MESES_RETENCION_FOTOS } from '../lib/retencionFotos';
import { MOMENTO_LABEL, MOMENTO_TONO, type FotoDeJornada } from '../constants/momentos';

const TZ = 'America/Bogota';
const hhmm = (s: string | null) => s ? format(toZonedTime(new Date(s), TZ), 'HH:mm') : null;

type Respuesta = { fecha: string; fotos: FotoDeJornada[] };

// Las fotos de verificación facial de un DÍA, cada una con lo que de verdad es.
//
// Existe porque esto estaba escrito cuatro veces —el detalle de la jornada, el
// dashboard, la tabla de registros y el reporte de extras— y tres de las cuatro
// copias mentían: pedían el par de fotos de UNA marcación y las rotulaban
// "Entrada" y "Salida" a ciegas. En una jornada partida por el almuerzo eso
// significaba mostrar la salida a almorzar como el fin del día, y esconder las
// dos marcas de la tarde.
//
// Se pide el día entero de una vez. Los rótulos los decide el backend.
export default function FotosJornada({ registroId }: { registroId: string }) {
  // La respuesta se guarda junto al día al que pertenece. Así, cuando cambia el
  // `registroId`, lo que hay en pantalla se descarta solo —no hay que limpiarlo
  // dentro del efecto, que es lo que dispara renders en cascada— y nunca se
  // pintan las fotos de un día sobre el encabezado de otro.
  const [estado, setEstado] = useState<{ id: string; datos: Respuesta | null } | null>(null);

  useEffect(() => {
    let vigente = true;
    api.get(`/registros/${registroId}/jornada/fotos`)
      .then(r => { if (vigente) setEstado({ id: registroId, datos: r.data }); })
      // La foto es evidencia opcional: que falle no puede tumbar la pantalla
      // que la contiene.
      .catch(() => { if (vigente) setEstado({ id: registroId, datos: null }); });
    return () => { vigente = false; };
  }, [registroId]);

  const actual = estado?.id === registroId ? estado : null;
  const datos = actual?.datos ?? null;
  const error = !!actual && !actual.datos;
  const fotos = datos?.fotos ?? null;
  // Una ausencia de foto tiene dos causas distintas y el dato es el mismo `null`
  // en las dos: o marcaron con cédula, o la foto existió y el sistema ya la
  // borró. Solo la edad del día las separa, y a quien audita le importa cuál es.
  const expiradas = datos ? fotosExpiradas(datos.fecha) : false;

  // Un día sin ninguna foto y sin nada que explicar: no hay sección que pintar.
  if (fotos && !fotos.some(f => f.foto) && !expiradas) return null;

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted mb-2 flex items-center gap-1.5">
        <Camera size={13} /> Verificación facial
      </p>

      {error ? (
        <p className="text-sm text-muted py-6 text-center">No pudimos cargar las fotos de este día.</p>
      ) : !fotos ? (
        <p className="text-sm text-gray-400 py-6 text-center">Cargando fotos...</p>
      ) : (
        /* `items-start`: sin esto las celdas se estiran a la altura de la fila y
           el hueco de "sin foto" se desbordaba sobre el rótulo de abajo. */
        <div className="grid grid-cols-2 gap-3 items-start">
          {fotos.map((f, i) => (
            <div key={`${f.registroId}-${f.momento}-${i}`}>
              <p className={`text-[10px] font-semibold uppercase mb-1.5 ${MOMENTO_TONO[f.momento]}`}>
                {MOMENTO_LABEL[f.momento]}{hhmm(f.hora) && ` · ${hhmm(f.hora)}`}
              </p>
              {f.foto ? (
                /* Espejada: así se vio la persona a sí misma al marcar. */
                <img src={f.foto} alt={`Foto de ${MOMENTO_LABEL[f.momento].toLowerCase()}`}
                  className="w-full rounded-xl border border-gray-200 [transform:scaleX(-1)]" />
              ) : (
                /* Misma proporción que la foto (el capturador del kiosco graba en
                   4:3), para que el hueco ocupe exactamente lo mismo. Antes era
                   `h-full`, que es el 100% de la celda ENTERA —rótulo incluido—,
                   así que el recuadro sobresalía y tapaba el texto de la fila
                   siguiente. */
                <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-3 aspect-[4/3] text-center flex flex-col items-center justify-center">
                  <ImageOff size={20} className="text-gray-400 mb-1.5" />
                  <p className="text-[11px] text-muted leading-relaxed">
                    {f.estimada
                      ? <>Sin foto: esta hora la puso <b>el sistema</b>, no la persona.</>
                      : expiradas
                        ? <>Las fotos se eliminan automáticamente a los <b>{MESES_RETENCION_FOTOS} meses</b>.</>
                        : <>Sin foto: marcó <b>con cédula</b> o se cargó a mano.</>}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <p className="text-[11px] text-muted mt-2 flex items-center gap-1.5">
        <Info size={12} /> Las fotos se eliminan automáticamente a los 2 meses.
      </p>
    </div>
  );
}
