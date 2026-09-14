import { Fragment, useEffect, useState } from 'react';
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { Camera, Coffee, ImageOff, Info, LogIn, MapPin, UtensilsCrossed, type LucideIcon } from 'lucide-react';
import api from '../lib/api';
import { fotosExpiradas, MESES_RETENCION_FOTOS } from '../lib/retencionFotos';
import { MOMENTO_LABEL, MOMENTO_TONO, type FotoDeJornada } from '../constants/momentos';
import { agruparPorJornada, sedesDelTurno, partesDeLaJornada, type ParteDeLaJornada } from '../lib/fotosDeJornada';

const TZ = 'America/Bogota';
const hhmm = (s: string | null) => s ? format(toZonedTime(new Date(s), TZ), 'HH:mm') : null;

type Respuesta = { fecha: string; fotos: FotoDeJornada[] };

// Cómo se llama cada parte del día y qué dice el lugar de una marca que no existe.
const PARTE: Record<ParteDeLaJornada, { titulo: string; Icono: LucideIcon; sinAbrir: string; sinCerrar: string }> = {
  ENTRADA_Y_SALIDA: { titulo: 'Entrada y salida', Icono: LogIn, sinAbrir: 'Sin entrada', sinCerrar: 'Sin salida' },
  ALMUERZO: { titulo: 'Almuerzo', Icono: UtensilsCrossed, sinAbrir: 'Sin salida a almorzar', sinCerrar: 'Sin regreso' },
  DESCANSO: { titulo: 'Descanso', Icono: Coffee, sinAbrir: 'Sin salida al descanso', sinCerrar: 'Sin regreso' },
};

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
//
// Y DENTRO DE CADA TURNO, POR PARTES (13 de septiembre de 2026, pedido del dueño): la entrada y
// la salida, el almuerzo y el descanso, cada uno en su bloque y siempre en ese orden. En el orden
// en que se marcaron, las pausas quedaban revueltas con la jornada. En cada fila lo que abre va a
// la izquierda y lo que cierra a la derecha.
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
      <p className="text-sm font-medium text-ink mb-2 flex items-center gap-1.5">
        <Camera size={14} /> Verificación facial
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
            const partes = (
              <div className="space-y-3">
                {partesDeLaJornada(grupo).map(({ parte, filas }) => {
                  const { titulo: tituloDeLaParte, Icono, sinAbrir, sinCerrar } = PARTE[parte];
                  const nombre = parte === 'DESCANSO' && filas.length > 1 ? 'Descansos' : tituloDeLaParte;
                  return (
                    <div key={parte} role="group" aria-label={nombre} className="bg-blue-50 rounded-xl p-3">
                      <p className="text-xs font-semibold text-ink mb-2 flex items-center gap-1.5">
                        <Icono size={13} aria-hidden="true" />{nombre}
                      </p>
                      {/* `items-start`: sin esto las celdas se estiran a la altura de la
                          fila y el hueco de "sin foto" se desbordaba sobre el rótulo de
                          abajo. */}
                      <div className="grid grid-cols-2 gap-3 items-start">
                        {filas.map((fila, i) => (
                          <Fragment key={i}>
                            {fila.abre ? <TarjetaFoto f={fila.abre} expiradas={expiradas} /> : <SinMarca texto={sinAbrir} />}
                            {fila.cierra ? <TarjetaFoto f={fila.cierra} expiradas={expiradas} /> : <SinMarca texto={sinCerrar} />}
                          </Fragment>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
            return conTitulos ? (
              <section key={gi} aria-label={titulo}>{cabecera}{partes}</section>
            ) : (
              <div key={gi}>{cabecera}{partes}</div>
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
  // Sin sede probada, la etiqueta dice la que se le atribuye (12 de septiembre de 2026), y
  // desde el 13 solo con su nombre: el dueño pidió quitar «por defecto». El texto de la foto
  // no la dice: nadie probó que se tomara ahí.
  const etiqueta = lugar ?? f.sedeAtribuida?.nombre ?? null;
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
            entrada y afirmar un lugar que nadie registró. La sede atribuida a
            una entrada también va. */}
        {etiqueta && (
          <span className="absolute left-2 top-2 max-w-[calc(100%-1rem)] inline-flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm">
            <MapPin size={10} className="shrink-0" aria-hidden="true" />
            <span className="truncate">{etiqueta}</span>
          </span>
        )}
      </div>
    </div>
  );
}

// El lugar de una marca que no existe: la salida de quien sigue adentro, el regreso de quien no
// volvió. Ocupa lo mismo que una foto, con un rótulo vacío encima, para que cada fila siga
// emparejada: la salida de un descanso nunca queda al lado del regreso de otro.
function SinMarca({ texto }: { texto: string }) {
  return (
    <div>
      <p aria-hidden="true" className="text-[10px] font-semibold mb-1.5">&nbsp;</p>
      <div className="rounded-xl border border-dashed border-gray-300 bg-white/70 aspect-[4/3] flex items-center justify-center px-3 text-center">
        <p className="text-[11px] text-muted">{texto}</p>
      </div>
    </div>
  );
}
