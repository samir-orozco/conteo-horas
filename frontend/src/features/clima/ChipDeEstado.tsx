import type { EstadoDeSeguimiento } from './tipos';
import { NOMBRE_DE_ESTADO, TONO_DE_ESTADO } from './estadoDeSeguimiento';

export default function ChipDeEstado({ estado }: { estado: EstadoDeSeguimiento }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap ${TONO_DE_ESTADO[estado]}`}>
      {NOMBRE_DE_ESTADO[estado]}
    </span>
  );
}
