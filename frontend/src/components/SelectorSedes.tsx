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
  sedes, valor, onChange,
}: {
  sedes: SedeOpcion[];
  valor: string[];
  onChange: (ids: string[]) => void;
}) {
  // Sin sedes creadas no hay nada que elegir: se oculta en vez de mostrar un
  // campo vacío que solo genera dudas.
  if (sedes.length === 0) return null;

  const alternar = (id: string) =>
    onChange(valor.includes(id) ? valor.filter(x => x !== id) : [...valor, id]);

  return (
    <div>
      <label className="block text-xs font-medium text-muted mb-1">Sedes donde puede marcar</label>
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
        {valor.length === 0
          ? 'Sin sedes: se le aplica la ubicación general de la empresa.'
          : 'Podrá marcar en cualquiera de las seleccionadas, y debe cerrar el turno en la misma donde lo abrió.'}
      </p>
    </div>
  );
}
