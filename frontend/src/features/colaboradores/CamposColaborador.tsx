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
  // Opcional y SIN valor por defecto a propósito: si el formulario lo inicializara
  // en false cuando no llega, guardar cualquier otro dato le quitaría el permiso
  // a un supervisor sin que nadie lo pidiera.
  puedeCerrarEnOtraSede?: boolean;
};

const ENTRADA = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary';

// El ancho de un campo es una promesa sobre lo que cabe adentro. Una cédula de
// diez dígitos en una caja de setecientos píxeles se lee como un error, y al
// lado de un salario que mide la mitad, como un descuido.
const CORTO = 'sm:max-w-[13rem]';   // cédula, fecha, salario
const MEDIO = 'sm:max-w-[26rem]';   // cargo

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

      <CampoFormulario rotulo="Cédula" descripcion="Es la que digita para marcar en el kiosco." obligatorio>
        {id => (
          <input id={id} value={valores.cedula ?? ''} inputMode="numeric" required className={`${ENTRADA} ${CORTO}`}
            onChange={e => onCambio({ cedula: e.target.value })} />
        )}
      </CampoFormulario>

      <CampoFormulario rotulo="Cargo">
        {id => (
          <input id={id} value={valores.cargo ?? ''} placeholder="Auxiliar, vigilante, cajera..." className={`${ENTRADA} ${MEDIO}`}
            onChange={e => onCambio({ cargo: e.target.value })} />
        )}
      </CampoFormulario>

      <CampoFormulario rotulo="Salario mensual"
        descripcion="Con esto se calcula su hora extra y sus recargos." obligatorio>
        {id => (
          <div className={`relative ${CORTO}`}>
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-sm">$</span>
            <input id={id} type="text" inputMode="numeric" required placeholder="1.750.000"
              value={formatearMiles(valores.salarioMensual ?? 0)} className={`${ENTRADA} pl-7`}
              onChange={e => onCambio({ salarioMensual: parsearMiles(e.target.value) })} />
          </div>
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
          <input id={id} type="date" value={valores.fechaNacimiento ?? ''} className={`${ENTRADA} ${CORTO}`}
            onChange={e => onCambio({ fechaNacimiento: e.target.value })} />
        )}
      </CampoFormulario>

      <CampoFormulario rotulo="Horario de trabajo"
        descripcion="Define qué se le exige cada día: llegadas tarde, extras y pausas.">
        {id => (
          <select id={id} value={valores.horarioId ?? ''} className={`${ENTRADA} ${MEDIO}`}
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
          <div className="space-y-3">
            <SelectorSedes sinRotulo sedes={sedes} valor={valores.sedeIds ?? []} modalidad={modalidad}
              puedeCerrarEnOtraSede={valores.puedeCerrarEnOtraSede === true}
              onChange={ids => onCambio({ sedeIds: ids })} />
            {/* EL PERMISO DE CERRAR EN OTRA SEDE.
                Solo para PRESENCIAL con dos o más sedes: a un híbrido la regla
                de misma sede ya no le aplica, y con una sola sede no hay a dónde
                cruzar. Si deja de cumplirse se esconde, pero el valor NO se
                borra, igual que las sedes de un remoto: el día que vuelva a
                cumplirse tiene que seguir ahí. */}
            {modalidad === 'PRESENCIAL' && (valores.sedeIds?.length ?? 0) >= 2 && (
              <PermisoOtraSede activo={valores.puedeCerrarEnOtraSede === true}
                onCambio={v => onCambio({ puedeCerrarEnOtraSede: v })} />
            )}
          </div>
        </CampoFormulario>
      )}
    </div>
  );
}

// Fuera del componente a propósito: definido adentro, React lo trataría como un
// tipo nuevo en cada render.
function PermisoOtraSede({ activo, onCambio }: { activo: boolean; onCambio: (v: boolean) => void }) {
  return (
    <div className="flex items-start gap-3">
      <button type="button" role="switch" aria-checked={activo}
        aria-label="Puede cerrar el turno en una sede distinta de la que lo abrió"
        onClick={() => onCambio(!activo)}
        className={`relative mt-0.5 h-5 w-9 shrink-0 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
          activo ? 'bg-primary' : 'bg-gray-300'}`}>
        <span className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
          activo ? 'translate-x-4' : ''}`} />
      </button>
      <div className="text-xs leading-snug">
        <p className="font-semibold text-ink">Puede cerrar el turno en otra sede</p>
        <p className="text-muted mt-0.5">
          Para quien recorre varias sedes en el mismo turno, como un supervisor. La salida igual tiene que marcarse dentro de una de sus sedes.
        </p>
      </div>
    </div>
  );
}

