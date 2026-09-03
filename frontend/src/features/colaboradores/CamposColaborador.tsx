import CampoFormulario from '../../components/CampoFormulario';
import SelectorModalidad from '../../components/SelectorModalidad';
import SelectorSedes, { type SedeOpcion } from '../../components/SelectorSedes';
import SelectorFoto from './SelectorFoto';
import { normalizarModalidad } from './modalidad';
import { formatearMiles, parsearMiles } from '../../lib/dinero';
import type { DosFotos } from './foto';

// Los campos de un colaborador, compartidos por los DOS formularios que lo
// editan: el de la lista y el de su ficha.
//
// Estaban duplicados campo por campo. Es el mismo problema que ya documenta
// SelectorSedes: cuando dos pantallas editan lo mismo con código distinto,
// tarde o temprano una gana un campo y la otra no, y desde la que se quedó
// atrás la función parece que no existe.
//
// El rótulo y su explicación van a la izquierda, el control a la derecha. Las
// explicaciones no son decoración: qué hace el horario, qué calcula el salario
// y qué decide la modalidad no se deducen del nombre del campo.

export type Franja = { dias: string[]; horaEntrada: string; horaSalida: string };
export type HorarioOpcion = { id: string; nombre: string; franjas: Franja[] };

export type ValoresColaborador = {
  nombre?: string; apellido?: string; cedula?: string; cargo?: string;
  email?: string; telefono?: string; fechaNacimiento?: string;
  salarioMensual?: number; horarioId?: string | null;
  sedeIds?: string[]; modalidad?: string; foto?: string | null;
};

const ENTRADA = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary';

export default function CamposColaborador({
  valores, onCambio, horarios, sedes, resumenFranjas, foto,
}: {
  valores: ValoresColaborador;
  onCambio: (parcial: Record<string, unknown>) => void;
  horarios: HorarioOpcion[];
  sedes: SedeOpcion[];
  resumenFranjas: (f: Franja[]) => string;
  // Solo en el formulario de la lista. En la ficha la foto se cambia desde el
  // círculo de la cabecera, que es donde se está viendo.
  foto?: { onCambio: (fotos: DosFotos | null) => void; onError: (m: string) => void };
}) {
  const modalidad = normalizarModalidad(valores.modalidad);
  const iniciales = `${valores.nombre?.[0] ?? ''}${valores.apellido?.[0] ?? ''}`.toUpperCase();

  return (
    <div className="divide-y divide-gray-100">
      {foto && (
        <CampoFormulario rotulo="Foto" descripcion="Opcional. Se ve en la lista y en su ficha." grupo>
          <SelectorFoto
            foto={valores.foto ?? null}
            iniciales={iniciales || undefined}
            onCambio={foto.onCambio}
            onError={foto.onError}
          />
        </CampoFormulario>
      )}

      <CampoFormulario rotulo="Nombre completo" obligatorio grupo>
        <div className="grid grid-cols-2 gap-2">
          <input value={valores.nombre ?? ''} onChange={e => onCambio({ nombre: e.target.value })}
            placeholder="Nombre" required aria-label="Nombre" className={ENTRADA} />
          <input value={valores.apellido ?? ''} onChange={e => onCambio({ apellido: e.target.value })}
            placeholder="Apellido" required aria-label="Apellido" className={ENTRADA} />
        </div>
      </CampoFormulario>

      <CampoFormulario rotulo="Cédula" descripcion="Con esta marca en el kiosco." obligatorio>
        {id => (
          <input id={id} value={valores.cedula ?? ''} inputMode="numeric" required className={ENTRADA}
            onChange={e => onCambio({ cedula: e.target.value })} />
        )}
      </CampoFormulario>

      <CampoFormulario rotulo="Cargo">
        {id => (
          <input id={id} value={valores.cargo ?? ''} placeholder="Auxiliar, vigilante, cajera..." className={ENTRADA}
            onChange={e => onCambio({ cargo: e.target.value })} />
        )}
      </CampoFormulario>

      <CampoFormulario rotulo="Contacto" descripcion="Opcional. Para ubicarlo si algo pasa con sus marcaciones." grupo>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <input type="email" value={valores.email ?? ''} placeholder="Correo" aria-label="Correo" className={ENTRADA}
            onChange={e => onCambio({ email: e.target.value })} />
          <input value={valores.telefono ?? ''} placeholder="Teléfono" aria-label="Teléfono" inputMode="tel" className={ENTRADA}
            onChange={e => onCambio({ telefono: e.target.value })} />
        </div>
      </CampoFormulario>

      <CampoFormulario rotulo="Fecha de nacimiento" descripcion="Opcional.">
        {id => (
          <input id={id} type="date" value={valores.fechaNacimiento ?? ''} className={`${ENTRADA} sm:max-w-[13rem]`}
            onChange={e => onCambio({ fechaNacimiento: e.target.value })} />
        )}
      </CampoFormulario>

      <CampoFormulario rotulo="Horario de trabajo"
        descripcion="Define qué se le exige cada día: llegadas tarde, horas extra y descanso.">
        {id => (
          <select id={id} value={valores.horarioId ?? ''} className={ENTRADA}
            onChange={e => onCambio({ horarioId: e.target.value })}>
            <option value="">Sin horario (no controla llegadas tarde)</option>
            {horarios.map(h => <option key={h.id} value={h.id}>{h.nombre} · {resumenFranjas(h.franjas)}</option>)}
          </select>
        )}
      </CampoFormulario>

      <CampoFormulario rotulo="Modalidad de trabajo" grupo>
        <SelectorModalidad sinRotulo valor={modalidad} onChange={m => onCambio({ modalidad: m })} />
      </CampoFormulario>

      {/* A un remoto no se le mira la ubicación, así que asignarle sedes no
          cambia nada. Las que ya tuviera NO se borran: el día que vuelva a
          presencial tienen que seguir ahí. */}
      {sedes.length > 0 && modalidad !== 'REMOTO' && (
        <CampoFormulario rotulo="Sedes" grupo>
          <SelectorSedes sinRotulo sedes={sedes} valor={valores.sedeIds ?? []} modalidad={modalidad}
            onChange={ids => onCambio({ sedeIds: ids })} />
        </CampoFormulario>
      )}

      <CampoFormulario rotulo="Salario mensual"
        descripcion="Con esto se calcula su hora extra y sus recargos." obligatorio>
        {id => (
          <div className="relative sm:max-w-[13rem]">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-sm">$</span>
            <input id={id} type="text" inputMode="numeric" required placeholder="1.750.000"
              value={formatearMiles(valores.salarioMensual ?? 0)} className={`${ENTRADA} pl-7`}
              onChange={e => onCambio({ salarioMensual: parsearMiles(e.target.value) })} />
          </div>
        )}
      </CampoFormulario>
    </div>
  );
}
