import { formatearMiles, parsearMiles } from '../../lib/dinero';
import type { FormPrecio } from './precioDelCliente';

// Los campos de «Precio del cliente», sin el botón de guardar ni el contenedor:
// el modal de la lista de empresas y la tarjeta de la ficha los envuelven
// distinto, pero los controles son los mismos y viven una sola vez.
//
// El rótulo visible va además en `aria-label` porque el `<label>` de esta
// pantalla no está atado al control por `id`: sin eso, el campo no tiene nombre
// y una prueba solo lo puede encontrar por su clase de CSS, que es exactamente
// lo que la §7 dice que no se hace.

const CAMPO = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary';
const ROTULO = 'block text-xs font-medium text-muted mb-1';

export default function CamposDePrecio({
  valor, onCambiar,
}: { valor: FormPrecio; onCambiar: (f: FormPrecio) => void }) {
  const cambiar = (parche: Partial<FormPrecio>) => onCambiar({ ...valor, ...parche });

  return (
    <div className="space-y-4">
      <div>
        <label className={ROTULO}>Modo de precio</label>
        <select aria-label="Modo de precio" value={valor.modo}
          onChange={ev => cambiar({ modo: ev.target.value })} className={CAMPO}>
          <option value="GLOBAL">Precio global de la plataforma</option>
          <option value="FIJO">Precio fijo mensual</option>
          <option value="TRAMOS">Tarifa por colaborador propia</option>
        </select>
      </div>

      {valor.modo === 'FIJO' && (
        <div>
          <label className={ROTULO}>Valor fijo mensual (COP)</label>
          <input inputMode="numeric" aria-label="Valor fijo mensual" value={formatearMiles(valor.precioFijo)}
            onChange={ev => cambiar({ precioFijo: parsearMiles(ev.target.value) })} className={CAMPO} />
          <p className="text-xs text-muted mt-1">Se cobra igual sin importar cuántos colaboradores tenga.</p>
        </div>
      )}

      {valor.modo === 'TRAMOS' && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={ROTULO}>Precio por colaborador (tramo 1)</label>
              <input inputMode="numeric" aria-label="Precio por colaborador (tramo 1)" value={formatearMiles(valor.precioTramo1)}
                onChange={ev => cambiar({ precioTramo1: parsearMiles(ev.target.value) })} className={CAMPO} />
            </div>
            <div>
              <label className={ROTULO}>Hasta cuántos colaboradores</label>
              <input type="number" min={1} step={1} aria-label="Hasta cuántos colaboradores" value={valor.limiteTramo1}
                onChange={ev => cambiar({ limiteTramo1: Number(ev.target.value) })} className={CAMPO} />
            </div>
          </div>
          <div>
            <label className={ROTULO}>Precio por colaborador extra (tramo 2)</label>
            <input inputMode="numeric" aria-label="Precio por colaborador extra (tramo 2)" value={formatearMiles(valor.precioTramo2)}
              onChange={ev => cambiar({ precioTramo2: parsearMiles(ev.target.value) })} className={CAMPO} />
          </div>
        </div>
      )}
    </div>
  );
}
