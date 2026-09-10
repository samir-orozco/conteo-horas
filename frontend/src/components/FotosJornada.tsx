import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { Camera, ImageOff, Info, MapPin } from 'lucide-react';
import api from '../lib/api';
import { fotosExpiradas, MESES_RETENCION_FOTOS } from '../lib/retencionFotos';
import { MOMENTO_LABEL, MOMENTO_TONO, type FotoDeJornada } from '../constants/momentos';
import { agruparPorJornada, sedesDelTurno } from '../lib/fotosDeJornada';

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
//
// AGRUPADAS POR TURNO. Con varios ingresos en el día la grilla plana se leía
// como una sola secuencia de seis fotos y no se sabía cuál salida cerraba cuál
// entrada. Cada turno lleva ahora su título con las horas, y cada foto la sede
// donde se tomó. Con UN solo turno no se pone título: sería ruido.
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

  const grupos = fotos ? agruparPorJornada(fotos) : [];
  const conTitulos = grupos.length > 1;

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
        <div className="space-y-5">
          {grupos.map((grupo, gi) => {
            // El inicio es la hora de la ENTRADA, no la de la primera foto: una
            // marcación cargada a mano puede traer solo la salida, y tomar esa hora
            // como inicio pintaba «12:00 a 12:00», un turno de cero minutos.
            const apertura = grupo.find(f => f.momento === 'ENTRADA');
            const inicio = apertura ? hhmm(apertura.hora) : null;
            const cierre = [...grupo].reverse().find(f => f.momento === 'SALIDA');
            const fin = cierre ? hhmm(cierre.hora) : null;
            const horas = inicio ? ` · ${inicio}${fin ? ` a ${fin}` : ''}` : fin ? ` · sin entrada, salida ${fin}` : '';
            const titulo = `Turno ${gi + 1}${horas}`;
            const { distintas } = sedesDelTurno(grupo);
            const cabecera = (conTitulos || distintas) && (
              <div className="flex items-center gap-2 mb-2">
                {conTitulos && <p className="text-xs font-bold text-ink whitespace-nowrap">{titulo}</p>}
                {/* Es justo lo que se quiere encontrar de un vistazo, así que
                    se dice aunque las dos fotos ya lleven su sede encima. */}
                {distintas && (
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 whitespace-nowrap">
                    Abrió y cerró en sedes distintas
                  </span>
                )}
                <span aria-hidden="true" className="flex-1 h-px bg-gray-100" />
              </div>
            );
            const grilla = (
              /* `items-start`: sin esto las celdas se estiran a la altura de la
                 fila y el hueco de "sin foto" se desbordaba sobre el rótulo de
                 abajo. */
              <div className="grid grid-cols-2 gap-3 items-start">
                {grupo.map((f, i) => (
                  <TarjetaFoto key={`${f.registroId}-${f.momento}-${i}`} f={f} expiradas={expiradas} />
                ))}
              </div>
            );
            return conTitulos ? (
              <section key={gi} aria-label={titulo}>{cabecera}{grilla}</section>
            ) : (
              <div key={gi}>{cabecera}{grilla}</div>
            );
          })}
        </div>
      )}

      <p className="text-[11px] text-muted mt-2 flex items-center gap-1.5">
        <Info size={12} /> Las fotos se eliminan automáticamente a los 2 meses.
      </p>
    </div>
  );
}

// Fuera del componente a propósito: definido adentro, React lo trataría como un
// tipo nuevo en cada render y desmontaría todas las fotos cada vez.
function TarjetaFoto({ f, expiradas }: { f: FotoDeJornada; expiradas: boolean }) {
  const lugar = f.sede?.nombre ?? null;
  return (
    <div>
      <p className={`text-[10px] font-semibold uppercase mb-1.5 ${MOMENTO_TONO[f.momento]}`}>
        {MOMENTO_LABEL[f.momento]}{hhmm(f.hora) && ` · ${hhmm(f.hora)}`}
      </p>
      <div className="relative">
        {f.foto ? (
          /* Espejada: así se vio la persona a sí misma al marcar. La etiqueta de
             la sede va FUERA de la imagen, como hermana, para no salir al revés. */
          <img src={f.foto}
            alt={`Foto de ${MOMENTO_LABEL[f.momento].toLowerCase()}${lugar ? ` en ${lugar}` : ''}`}
            className="w-full rounded-xl border border-gray-200 [transform:scaleX(-1)]" />
        ) : (
          /* Misma proporción que la foto (el capturador del kiosco graba en 4:3),
             para que el hueco ocupe exactamente lo mismo. Antes era `h-full`,
             que es el 100% de la celda ENTERA —rótulo incluido—, así que el
             recuadro sobresalía y tapaba el texto de la fila siguiente. */
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
        {/* Dónde se tomó. Solo si se sabe: una salida de antes de que se
            guardara su sede no lleva etiqueta, en vez de heredar la de la
            entrada y afirmar un lugar que nadie registró. */}
        {lugar && (
          <span className="absolute left-2 top-2 max-w-[calc(100%-1rem)] inline-flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm">
            <MapPin size={10} className="shrink-0" aria-hidden="true" />
            <span className="truncate">{lugar}</span>
          </span>
        )}
      </div>
    </div>
  );
}
