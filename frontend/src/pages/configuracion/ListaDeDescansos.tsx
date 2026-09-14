import { Plus } from 'lucide-react';
import { minutosEntre, type Ventana } from '../../lib/descansos';

type Props = {
  descansos: Ventana[];
  onCambiar: (descansos: Ventana[]) => void;
  max: number;
};

// Los descansos no remunerados de UNA franja del horario (12 de septiembre de 2026):
// hasta `max`, cada uno con su «desde» y su «hasta», debajo del almuerzo. Ninguno se
// paga. El orden en que se escriben no importa: el servidor los ordena desde la entrada
// al guardar, y si alguno está mal lo dice por su número de fila.
//
// Controlada: la lista vive en la franja del formulario, y aquí solo se pinta y se
// cambia. Una fila recién agregada va vacía, y así viaja: el servidor ignora la que no
// tiene ninguna hora.
export default function ListaDeDescansos({ descansos, onCambiar, max }: Props) {
  const cambiar = (i: number, cambio: Partial<Ventana>) =>
    onCambiar(descansos.map((d, j) => (j === i ? { ...d, ...cambio } : d)));
  const quitar = (i: number) => onCambiar(descansos.filter((_, j) => j !== i));
  const lleno = descansos.length >= max;

  return (
    <div className="space-y-2">
      {descansos.map((d, i) => {
        const n = i + 1;
        return (
          <div key={i}>
            <div className="grid grid-cols-[1fr_1fr_auto] gap-3 items-end">
              <div>
                <label className="block text-xs font-medium text-muted mb-1">Desde</label>
                <input type="time" aria-label={`Descanso ${n} desde`} value={d.inicio}
                  onChange={e => cambiar(i, { inicio: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted mb-1">Hasta</label>
                <input type="time" aria-label={`Descanso ${n} hasta`} value={d.fin}
                  onChange={e => cambiar(i, { fin: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <button type="button" onClick={() => quitar(i)} aria-label={`Quitar el descanso ${n}`}
                className="mb-2.5 text-[11px] font-semibold text-red-500 hover:text-red-600 underline underline-offset-2">
                Quitar
              </button>
            </div>
            {d.inicio && d.fin ? (
              <p className="text-[11px] text-muted mt-1">Descanso {n} de <b>{minutosEntre(d.inicio, d.fin)} min</b>.</p>
            ) : (d.inicio || d.fin) ? (
              <p className="text-[11px] text-amber-700 mt-1">Faltan las dos horas: con una sola no se puede guardar.</p>
            ) : null}
          </div>
        );
      })}
      <button type="button" onClick={() => onCambiar([...descansos, { inicio: '', fin: '' }])} disabled={lleno}
        className="flex items-center gap-1 text-xs font-semibold text-ink hover:text-primary-dark disabled:text-gray-400 disabled:cursor-not-allowed">
        <Plus size={13} /> {lleno ? `Máximo ${max} descansos por franja` : 'Agregar descanso'}
      </button>
      <p className="text-[11px] text-muted leading-relaxed">
        Los descansos no se pagan: cuestan siempre su tiempo, aunque los tomen a otra hora, igual que el almuerzo.
        Quien lo marca no lo paga dos veces.
      </p>
    </div>
  );
}
