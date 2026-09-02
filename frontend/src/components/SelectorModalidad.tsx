import { AYUDA_MODALIDAD, OPCIONES_MODALIDAD, type Modalidad } from '../features/colaboradores/modalidad';

// Cómo trabaja esta persona, que decide si se le valida la ubicación al marcar.
//
// Vive aquí y no dentro de una pantalla por la misma razón que SelectorSedes: lo
// usan el modal de la tabla de colaboradores y el de la ficha interna, y la
// gente espera que se comporten igual.
//
// Píldoras y no un `<select>`: la consecuencia de cada opción no se deduce del
// nombre —"híbrido" no dice que no bloquea— y un desplegable la esconde detrás
// de un clic. Aquí la ayuda de abajo cambia con lo elegido y se lee antes de
// guardar.
export default function SelectorModalidad({
  valor, onChange,
}: {
  valor: Modalidad;
  onChange: (m: Modalidad) => void;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-muted mb-1" id="rotulo-modalidad">
        Modalidad de trabajo
      </label>
      <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-labelledby="rotulo-modalidad">
        {OPCIONES_MODALIDAD.map(o => {
          const activa = o.valor === valor;
          return (
            <button key={o.valor} type="button" role="radio" aria-checked={activa}
              onClick={() => onChange(o.valor)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${
                activa ? 'bg-primary/25 border-primary text-ink' : 'bg-white border-gray-300 text-muted hover:border-gray-400'
              }`}>
              {o.texto}
            </button>
          );
        })}
      </div>
      <p className="text-[11px] text-muted mt-1.5">{AYUDA_MODALIDAD[valor]}</p>
    </div>
  );
}
