import type { Modalidad } from '../features/colaboradores/modalidad';

export type SedeOpcion = { id: string; nombre: string };

// Selector múltiple de sedes donde un colaborador puede marcar.
//
// Vive aquí y no dentro de una pantalla porque se usa en dos sitios que la
// gente espera que se comporten igual: el modal de la tabla de colaboradores y
// el de la ficha interna. Cuando estaba duplicado, editar desde la tabla no
// mostraba las sedes y parecía que la función no existía.
//
// La selección es múltiple a propósito: quien rota entre locales abre y cierra
// turno en cualquiera de los suyos.
export default function SelectorSedes({
  sedes, valor, onChange, modalidad = 'PRESENCIAL', sinRotulo = false,
}: {
  sedes: SedeOpcion[];
  valor: string[];
  onChange: (ids: string[]) => void;
  // El formulario nuevo pone el rótulo en su columna izquierda.
  sinRotulo?: boolean;
  // Cambia lo que las sedes SIGNIFICAN, así que cambia lo que este control dice.
  // Sin esto, la única frase de la pantalla que explica qué hace la geocerca
  // afirmaría lo contrario de lo que va a hacer el servidor.
  modalidad?: Modalidad;
}) {
  // Sin sedes creadas no hay nada que elegir: se oculta en vez de mostrar un
  // campo vacío que solo genera dudas.
  if (sedes.length === 0) return null;

  // A un remoto no se le mira la ubicación, así que asignarle sedes no cambia
  // nada. Se ocultan en vez de ofrecer una elección sin consecuencia. Las que ya
  // tuviera NO se borran: el día que vuelva a presencial tienen que seguir ahí.
  if (modalidad === 'REMOTO') return null;

  const alternar = (id: string) =>
    onChange(valor.includes(id) ? valor.filter(x => x !== id) : [...valor, id]);

  return (
    <div>
      {!sinRotulo && (
        <label className="block text-xs font-medium text-muted mb-1">
          {modalidad === 'HIBRIDO' ? 'Sedes que se le reconocen' : 'Sedes donde puede marcar'}
        </label>
      )}
      <div className="flex flex-wrap gap-1.5">
        {sedes.map(s => {
          const activa = valor.includes(s.id);
          return (
            <button key={s.id} type="button" onClick={() => alternar(s.id)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${
                activa ? 'bg-primary/25 border-primary text-ink' : 'bg-white border-gray-300 text-muted hover:border-gray-400'
              }`}>
              {s.nombre}
            </button>
          );
        })}
      </div>
      <p className="text-[11px] text-muted mt-1.5">
        {modalidad === 'HIBRIDO'
          ? (valor.length === 0
              ? 'Sin sedes: podrá marcar igual, pero no quedará registrado desde dónde.'
              : 'Podrá marcar desde donde sea. Si está en una de estas, queda registrado en cuál.')
          : (valor.length === 0
              ? 'Sin sedes: se le aplica la ubicación general de la empresa.'
              : 'Podrá marcar en cualquiera de las seleccionadas, y debe cerrar el turno en la misma donde lo abrió.')}
      </p>
    </div>
  );
}
