import { useEffect, useState } from 'react';
import { AlertTriangle, Check } from 'lucide-react';
import api from '../lib/api';
import { formatearMiles, parsearMiles } from '../lib/dinero';

// El bloqueo que le pide a una empresa revisar sus salarios (17 de septiembre de 2026).
//
// Hasta hoy el salario era UN solo campo, así que las empresas que ya existían pueden tener el
// auxilio de transporte sumado dentro del básico. Cuando es así, cada hora extra y cada recargo de
// esa persona se pagan un 14,2% de más y nada en pantalla lo delata.
//
// Bloquea, y vive en el servidor y no en localStorage: limpiar el navegador o entrar desde otro
// equipo no puede hacer que el aviso reaparezca, ni que una persona lo descarte y el resto de la
// empresa nunca se entere de que los datos están mal.
//
// Dos cosas que NO hace, a propósito:
//   - No corrige nada solo. La marca es una sospecha aritmética (básico menos auxilio igual al
//     mínimo), no una certeza, y cambiar sueldos por corazonada es peor que el problema.
//   - No obliga a revisar de uno en uno: se puede confirmar que están bien y seguir. Dejar a una
//     empresa de 250 personas sin sistema hasta revisar 250 fichas es quitarle el producto.
//
// POR QUÉ FICHAS Y NO UNA TABLA: era una tabla con `min-w-[640px]` dentro de un contenedor con
// scroll. Verlo en un teléfono mostró el problema: la columna del auxilio y el botón de guardar
// quedaban fuera de pantalla, detrás de ese scroll. En un modal que bloquea el panel entero, la
// acción principal de cada fila no puede estar escondida.
//
// Y NO se resolvió con «tabla en escritorio, tarjetas en móvil»: dos estructuras con clases que
// ocultan una u otra conviven las dos en el DOM, así que cada persona aparecería dos veces y
// cualquier consulta por nombre se volvería ambigua. Es una sola estructura que se reacomoda.

type Persona = {
  id: string; nombre: string; apellido: string; cedula: string; cargo: string | null;
  salarioMensual: number; auxilioTransporte: number | null; pareceIncluirAuxilio: boolean;
};
type Datos = {
  pendiente: boolean;
  auxilio: { valor: number; tope: number } | null;
  colaboradores: Persona[];
};

// Lo que se ve mientras alguien escribe en un campo de dinero de esta pantalla.
//
// No se usa `alEscribirMiles` de `lib/dinero` porque para el cero devuelve cadena vacía, y aquí
// vacío y cero NO son lo mismo: vacío es «que lo ponga el decreto», cero es «esta empresa no lo
// paga». Con el atajo, escribir un 0 borraría el campo y lo volvería automático, justo lo
// contrario de lo que la persona acaba de pedir.
const alEscribir = (texto: string) => {
  if (texto.trim() === '') return '';
  const n = parsearMiles(texto);
  return n === 0 ? '0' : formatearMiles(n);
};

export default function RevisionAuxilio() {
  const [datos, setDatos] = useState<Datos | null>(null);
  // Confirmado en esta sesión: el servidor ya quedó marcado, no hace falta volver a preguntarle.
  const [listo, setListo] = useState(false);
  const [edicion, setEdicion] = useState<Record<string, { basico: string; auxilio: string }>>({});
  const [guardando, setGuardando] = useState<string | null>(null);
  const [guardados, setGuardados] = useState<Record<string, boolean>>({});
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/configuracion/auxilio-pendiente').then(r => setDatos(r.data)).catch(() => {});
  }, []);

  if (!datos || !datos.pendiente || listo) return null;

  const campo = (p: Persona) => edicion[p.id] ?? {
    basico: formatearMiles(p.salarioMensual),
    // Un cero guardado se escribe a mano: `formatearMiles(0)` devuelve vacío, y vacío significa
    // «que lo ponga el decreto», lo contrario de «esta empresa no lo paga».
    auxilio: p.auxilioTransporte == null ? '' : p.auxilioTransporte === 0 ? '0' : formatearMiles(p.auxilioTransporte),
  };
  const cambiar = (id: string, parcial: Partial<{ basico: string; auxilio: string }>) =>
    setEdicion(e => ({ ...e, [id]: { ...(e[id] ?? campo(datos.colaboradores.find(c => c.id === id)!)), ...parcial } }));

  // Se guarda por la ruta de siempre, que ya valida el auxilio y tiene sus guardas. Abrir aquí un
  // segundo camino de escritura masiva sobre salarios duplicaría el riesgo sin ganar nada.
  const guardar = async (p: Persona) => {
    const v = campo(p);
    setGuardando(p.id);
    setError('');
    try {
      await api.put(`/colaboradores/${p.id}`, {
        // `parsearMiles` y no `Number`: lo que se ve lleva puntos, y `Number('1.750.905')` es NaN.
        salarioMensual: parsearMiles(v.basico),
        auxilioTransporte: v.auxilio.trim() === '' ? null : parsearMiles(v.auxilio),
      });
      setGuardados(g => ({ ...g, [p.id]: true }));
    } catch (err) {
      const delServidor = (err as { response?: { data?: { error?: string } } }).response?.data?.error;
      setError(delServidor ?? 'No pudimos guardar ese cambio.');
    } finally {
      setGuardando(null);
    }
  };

  const confirmar = async () => {
    setError('');
    try {
      await api.post('/configuracion/auxilio-revisado');
      setListo(true);
    } catch {
      setError('No pudimos guardar la confirmación. Inténtalo de nuevo.');
    }
  };

  const marcados = datos.colaboradores.filter(c => c.pareceIncluirAuxilio).length;
  const entrada = 'w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-primary';
  const rotulo = 'block text-[11px] font-medium uppercase tracking-wide text-gray-500 mb-1';

  return (
    <div className="fixed inset-0 !mt-0 bg-black/50 flex items-center justify-center z-[70] p-4">
      <div role="dialog" aria-modal="true" aria-label="Revisa los salarios"
        className="hp-pop bg-white rounded-2xl w-full max-w-3xl shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="px-6 pt-5 pb-4 border-b border-gray-100 sticky top-0 bg-white z-10">
          <h3 className="font-bold text-xl text-ink flex items-center gap-2">
            <AlertTriangle size={20} className="text-amber-600 shrink-0" /> Revisa los salarios de tu equipo
          </h3>
          <p className="text-sm text-muted mt-1">
            El auxilio de transporte ahora va en su propio campo, porque <b>no</b> entra en el cálculo de
            las horas extra ni de los recargos. Si alguien tiene el auxilio sumado dentro del salario,
            sus horas extra se están pagando de más.
          </p>
          {marcados > 0 && (
            <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-3">
              {marcados === 1
                ? 'Hay 1 persona cuyo salario parece incluir el auxilio.'
                : `Hay ${marcados} personas cuyo salario parece incluir el auxilio.`}
              {' '}Es una sospecha, no una certeza: revísala antes de cambiar nada.
            </p>
          )}
        </div>

        <div className="p-4 sm:p-6 space-y-3">
          {datos.colaboradores.map(p => {
            const v = campo(p);
            const quien = `${p.nombre} ${p.apellido}`;
            return (
              <div key={p.id} role="group" aria-label={quien}
                className={`rounded-xl border p-3 sm:p-4 ${p.pareceIncluirAuxilio ? 'border-amber-200 bg-amber-50/40' : 'border-gray-200'}`}>
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 mb-3">
                  <span className="font-medium text-gray-800">{quien}</span>
                  <span className="text-xs text-muted">{p.cedula}</span>
                  {p.pareceIncluirAuxilio && (
                    <span className="text-[11px] font-medium text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                      Parece incluir el auxilio ({formatearMiles(p.salarioMensual)})
                    </span>
                  )}
                </div>

                {/* En un teléfono los tres bajan uno debajo de otro y nada queda fuera de pantalla;
                    desde `sm` se alinean en una fila con el botón al final. */}
                <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                  <div>
                    <span className={rotulo}>Salario básico</span>
                    <input aria-label={`Salario básico de ${quien}`} className={entrada}
                      inputMode="numeric" value={v.basico}
                      onChange={e => cambiar(p.id, { basico: alEscribir(e.target.value) })} />
                  </div>
                  <div>
                    <span className={rotulo}>Auxilio</span>
                    <input aria-label={`Auxilio de transporte de ${quien}`} className={entrada}
                      inputMode="numeric" placeholder="Automático" value={v.auxilio}
                      onChange={e => cambiar(p.id, { auxilio: alEscribir(e.target.value) })} />
                  </div>
                  <button type="button" onClick={() => guardar(p)} disabled={guardando === p.id}
                    className="w-full sm:w-auto justify-center text-sm font-semibold text-ink border border-gray-300 rounded-lg px-4 py-1.5 hover:bg-gray-50 disabled:opacity-60 flex items-center gap-1">
                    {guardados[p.id] ? <><Check size={14} /> Guardado</> : 'Guardar'}
                  </button>
                </div>
              </div>
            );
          })}
          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3 sticky bottom-0 bg-white">
          <p className="text-xs text-muted max-w-md">
            Si los salarios ya estaban sin el auxilio, no tienes que cambiar nada: confirma y sigue.
          </p>
          <button type="button" onClick={confirmar}
            className="bg-primary hover:bg-primary-dark text-ink font-semibold px-5 py-2.5 rounded-xl text-sm">
            Están bien, confirmar
          </button>
        </div>
      </div>
    </div>
  );
}
