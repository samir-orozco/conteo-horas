import { ArrowLeft, Edit2, Briefcase, IdCard, CalendarDays, Banknote } from 'lucide-react';
import { mesYAnio } from '../../lib/fechas';

export type PersonaCabecera = {
  nombre: string;
  apellido: string;
  cargo?: string | null;
  cedula: string;
  salarioMensual: number;
  creadoEn?: string | null;
  activo: boolean;
  foto?: string | null;
};

const cop = (n: number) => '$' + n.toLocaleString('es-CO');

// La portada. Rayas diagonales en la paleta de la marca, hechas con gradientes
// para no cargar una imagen que nadie va a mirar dos veces.
const PORTADA = {
  backgroundImage: [
    'linear-gradient(115deg, transparent 30%, rgba(48,48,48,0.09) 30%, rgba(48,48,48,0.09) 44%, transparent 44%)',
    'linear-gradient(115deg, transparent 62%, rgba(255,255,255,0.5) 62%)',
    'linear-gradient(100deg, #FFE995 0%, #FFD85E 55%, #F0C63F 100%)',
  ].join(','),
};

// Cabecera de la ficha del colaborador.
//
// En móvil va centrada y en escritorio alineada a la izquierda. No es capricho:
// centrada, la fila de datos se parte en renglones cortos que se leen bien en
// una pantalla angosta; a lo ancho, esa misma fila centrada deja el nombre
// flotando en la mitad de la nada.
export default function CabeceraFicha({ persona, onVolver, onEditar }: {
  persona: PersonaCabecera;
  onVolver: () => void;
  onEditar: () => void;
}) {
  const nombreCompleto = `${persona.nombre} ${persona.apellido}`;
  const estado = persona.activo ? 'Activo' : 'Retirado';

  const datos = [
    { icono: Briefcase, texto: persona.cargo || 'Sin cargo' },
    { icono: IdCard, texto: `CC ${persona.cedula}` },
    ...(persona.creadoEn
      ? [{ icono: CalendarDays, texto: `Desde ${mesYAnio(persona.creadoEn)}` }]
      : []),
    { icono: Banknote, texto: cop(persona.salarioMensual) },
  ];

  return (
    <div className="bg-white rounded-card border border-gray-200 overflow-hidden">
      <div className="relative h-24 sm:h-28" style={PORTADA}>
        {/* Los dos controles flotan sobre la portada: ocupan las esquinas que
            de otro modo quedan vacías, y no le roban alto a la ficha. */}
        <button onClick={onVolver} title="Volver a colaboradores" aria-label="Volver a colaboradores"
          className="absolute top-3 left-3 p-2 rounded-lg bg-white/80 hover:bg-white text-ink backdrop-blur-sm transition-colors">
          <ArrowLeft size={17} />
        </button>
        <button onClick={onEditar}
          className="absolute top-3 right-3 flex items-center gap-1.5 text-xs font-semibold text-ink bg-white/80 hover:bg-white px-3 py-2 rounded-lg backdrop-blur-sm transition-colors">
          <Edit2 size={13} /> Editar
        </button>
      </div>

      <div className="px-5 pb-5 flex flex-col items-center text-center sm:flex-row sm:items-end sm:text-left sm:gap-5">
        {/* El avatar monta sobre la portada. El margen negativo es la mitad de
            su alto, para que quede partido justo por el borde. */}
        <div className="relative -mt-12 sm:-mt-10 shrink-0">
          {persona.foto ? (
            <img src={persona.foto} alt={`Foto de ${nombreCompleto}`}
              className="w-24 h-24 rounded-full object-cover ring-4 ring-white bg-gray-100" />
          ) : (
            <div className="w-24 h-24 rounded-full bg-primary ring-4 ring-white flex items-center justify-center text-3xl font-bold text-ink">
              {persona.nombre[0]}{persona.apellido[0]}
            </div>
          )}
          {/* El punto de estado. Lleva su propia etiqueta porque el color solo
              no le sirve a quien no lo distingue. */}
          <span
            role="img"
            aria-label={estado}
            title={estado}
            className={`absolute bottom-1 right-1 w-5 h-5 rounded-full ring-4 ring-white ${
              persona.activo ? 'bg-green-500' : 'bg-gray-400'}`}
          />
        </div>

        <div className="min-w-0 mt-3 sm:mt-0 sm:pb-1 flex-1">
          <div className="flex items-center justify-center sm:justify-start gap-2.5 flex-wrap">
            <h1 className="text-2xl font-bold text-ink truncate">{nombreCompleto}</h1>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
              persona.activo ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-600'}`}>
              {estado.toUpperCase()}
            </span>
          </div>

          <div className="flex items-center justify-center sm:justify-start gap-x-4 gap-y-1.5 flex-wrap text-sm text-muted mt-2">
            {datos.map(({ icono: Icono, texto }) => (
              <span key={texto} className="flex items-center gap-1.5 min-w-0">
                <Icono size={14} className="shrink-0 text-gray-400" />
                <span className="truncate">{texto}</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
