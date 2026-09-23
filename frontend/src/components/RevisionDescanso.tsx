import { useEffect, useState } from 'react';
import { CalendarCheck } from 'lucide-react';
import api from '../lib/api';
import { DIAS_EN_ORDEN_LABORAL, nombreDelDia } from '../lib/diasDeLaSemana';

// EL BLOQUEO QUE PREGUNTA QUÉ DÍA DESCANSA LA GENTE (21 de septiembre de 2026).
//
// La ley colombiana presume que el descanso obligatorio es el DOMINGO salvo acuerdo escrito. Hasta
// ahora nadie podía declarar otro día, así que la presunción se cumplía sola y el motor acertaba
// por una razón frágil. Desde que el motor lee la declaración, hay que preguntarla.
//
// Vive en el servidor y por EMPRESA, no en localStorage: limpiar el navegador o entrar desde otro
// equipo no puede hacer que reaparezca, ni que una persona lo descarte y el resto de la empresa
// nunca se entere.
//
// Se pregunta por HORARIO y no por persona: quienes comparten horario comparten el patrón de días,
// y preguntarle a cada uno sería pedir la misma respuesta treinta y cinco veces.
//
// Y NO se le pregunta a todo el mundo, al revés que la revisión del auxilio. Un horario que no
// cubre el domingo ya está resuelto por la ley. Eso lo decide el backend con `preguntasDeDescanso`,
// que es puro y tiene sus pruebas; aquí solo llega lo que hay que preguntar. Medido el 21 de
// septiembre de 2026 en la base local: de 10 horarios activos, 9 no se preguntan.

type HorarioPorResolver = {
  id: string;
  nombre: string;
  // PROPUESTA = trabaja domingo y le queda un solo día libre, que se sugiere.
  // AMBIGUO = le quedan varios. SIN_DIA_LIBRE = tiene los siete días configurados.
  origen: 'PROPUESTA' | 'AMBIGUO' | 'SIN_DIA_LIBRE';
  personas: number;
  sugerido: string | null;
};

type Datos = { pendiente: boolean; horarios: HorarioPorResolver[] };

// El valor del selector: una clave de día, o ROTATIVO. Es UN campo con varios estados y no dos
// controles separados, por la misma razón que la columna: el acuerdo escrito hace falta tanto para
// fijar otro día como para rotar, y partirlo en dos lo duplicaría o lo perdería.
const ROTATIVO = 'ROTATIVO';

const EXPLICACION: Record<HorarioPorResolver['origen'], string> = {
  SIN_DIA_LIBRE: 'Tiene los siete días configurados, así que no podemos deducir cuál es el descanso.',
  AMBIGUO: 'Trabaja domingo y le quedan varios días libres: solo uno es el descanso obligatorio.',
  PROPUESTA: 'Trabaja domingo y le queda un solo día libre. Confírmalo antes de guardar.',
};

export default function RevisionDescanso() {
  const [datos, setDatos] = useState<Datos | null>(null);
  // Respondido en esta sesión: el servidor ya quedó marcado, no hace falta volver a preguntarle.
  const [listo, setListo] = useState(false);
  const [elegido, setElegido] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    api.get('/configuracion/descanso-pendiente').then(r => {
      setDatos(r.data);
      // La sugerencia llega preseleccionada solo cuando el backend pudo deducir un día. Donde no
      // pudo, el selector queda vacío A PROPÓSITO: preseleccionar uno haría que alguien lo
      // confirmara sin mirarlo, y eso es precisamente lo que no puede pasar con una declaración
      // que autoriza a dejar de pagar un recargo.
      const inicial: Record<string, string> = {};
      for (const h of (r.data?.horarios ?? []) as HorarioPorResolver[]) {
        if (h.sugerido) inicial[h.id] = h.sugerido;
      }
      setElegido(inicial);
    }).catch(() => {});
  }, []);

  if (!datos || !datos.pendiente || listo || datos.horarios.length === 0) return null;

  const faltan = datos.horarios.some(h => !elegido[h.id]);

  const guardar = async () => {
    setError('');
    setGuardando(true);
    try {
      await api.post('/configuracion/descanso-revisado', {
        respuestas: datos.horarios.map(h => (elegido[h.id] === ROTATIVO
          // En un turno rotativo el día lo define el turno de cada semana, así que no viaja
          // ninguno: mandarlo dejaría una declaración que dice dos cosas a la vez.
          ? { horarioId: h.id, tipo: 'ROTATIVO', dia: null }
          : { horarioId: h.id, tipo: 'FIJO', dia: elegido[h.id] })),
      });
      setListo(true);
    } catch (err) {
      const delServidor = (err as { response?: { data?: { error?: string } } }).response?.data?.error;
      setError(delServidor ?? 'No pudimos guardar la respuesta. Inténtalo de nuevo.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 !mt-0 bg-black/50 flex items-center justify-center z-[70] p-4">
      <div role="dialog" aria-modal="true" aria-label="Día de descanso de tu equipo"
        className="hp-pop bg-white rounded-2xl w-full max-w-2xl shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="px-6 pt-5 pb-4 border-b border-gray-100 sticky top-0 bg-white z-10">
          <h3 className="font-bold text-xl text-ink flex items-center gap-2">
            <CalendarCheck size={20} className="text-amber-600 shrink-0" /> ¿Qué día descansa tu equipo?
          </h3>
          <p className="text-sm text-muted mt-1">
            La ley presume que el descanso obligatorio es el <b>domingo</b>, y ese día lleva recargo.
            Estos horarios cubren el domingo, así que no podemos saberlo solos.
          </p>
          <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-3">
            Mover el descanso fuera del domingo exige un <b>acuerdo escrito</b> con cada trabajador.
            Si no lo tienes, deja el domingo: se le sigue pagando el recargo, que es lo correcto.
          </p>
        </div>

        <div className="p-4 sm:p-6 space-y-3">
          {datos.horarios.map(h => (
            <div key={h.id} role="group" aria-label={h.nombre} className="rounded-xl border border-gray-200 p-3 sm:p-4">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 mb-1">
                <span className="font-medium text-gray-800">{h.nombre}</span>
                <span className="text-xs text-muted">
                  {h.personas === 1 ? '1 persona' : `${h.personas} personas`}
                </span>
              </div>
              <p className="text-[11px] text-muted mb-3 leading-relaxed">{EXPLICACION[h.origen]}</p>

              {/* Etiquetas y no un desplegable: las ocho opciones se ven a la vez, así que la
                  persona compara antes de elegir en vez de ir abriendo una lista. En un desplegable
                  «Rota cada semana» queda escondida al final, y es justo la respuesta correcta para
                  un horario de siete días, que es el caso más común de los que llegan aquí.

                  Son `input type="radio"` de verdad, no `div` con `onClick`: así solo se puede
                  elegir una sin escribir código para impedirlo, funcionan las flechas del teclado,
                  y un lector de pantalla las anuncia como lo que son. El input va oculto con
                  `sr-only` y el recuadro se pinta en la etiqueta. */}
              <fieldset>
                {/* SIN el nombre del horario, a propósito. Un `fieldset` expone `role="group"`
                    igual que la ficha que lo envuelve, así que con «Día de descanso de Jornada
                    demo» había DOS grupos que casaban con el mismo nombre y cualquier consulta por
                    la ficha se volvía ambigua. La ficha ya lo nombra: un lector de pantalla
                    anuncia «Jornada demo → Día de descanso → Martes». */}
                <legend className="block text-[11px] font-medium uppercase tracking-wide text-gray-500 mb-2">
                  Día de descanso
                </legend>
                <div className="flex flex-wrap gap-1.5">
                  {[...DIAS_EN_ORDEN_LABORAL, ROTATIVO].map(valor => {
                    const elegida = elegido[h.id] === valor;
                    return (
                      <label key={valor}
                        className={`cursor-pointer select-none rounded-full border px-3 py-1.5 text-sm transition-colors focus-within:ring-2 focus-within:ring-primary ${
                          elegida
                            ? 'border-ink bg-primary font-semibold text-ink'
                            : 'border-gray-300 text-muted hover:border-gray-400 hover:text-ink'}`}>
                        <input type="radio" name={`descanso-${h.id}`} value={valor} checked={elegida}
                          onChange={() => setElegido(v => ({ ...v, [h.id]: valor }))}
                          className="sr-only" />
                        {valor === ROTATIVO ? 'Rota cada semana' : nombreDelDia(valor)}
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            </div>
          ))}
          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3 sticky bottom-0 bg-white">
          <p className="text-xs text-muted max-w-sm">
            Esto no cambia lo ya liquidado: aplica de hoy en adelante.
          </p>
          <button type="button" onClick={guardar} disabled={faltan || guardando}
            className="bg-primary hover:bg-primary-dark text-ink font-semibold px-5 py-2.5 rounded-xl text-sm disabled:opacity-60">
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}
