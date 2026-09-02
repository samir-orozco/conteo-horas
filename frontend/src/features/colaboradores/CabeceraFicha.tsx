import { useRef, useState } from 'react';
import { ArrowLeft, Edit2, Briefcase, IdCard, CalendarDays, Banknote, Camera, Upload, Trash2, MapPinned } from 'lucide-react';
import { mesYAnio } from '../../lib/fechas';
import { ETIQUETA_MODALIDAD, normalizarModalidad } from './modalidad';

export type PersonaCabecera = {
  nombre: string;
  apellido: string;
  cargo?: string | null;
  cedula: string;
  salarioMensual: number;
  creadoEn?: string | null;
  activo: boolean;
  foto?: string | null;
  // Opcional para no obligar a quien ya construye este objeto sin ella.
  modalidad?: string | null;
};

const cop = (n: number) => '$' + n.toLocaleString('es-CO');

// Los mismos tres formatos que acepta el servidor (utils/fotoPerfil.ts). Se
// comprueba aquí también para no hacerle subir un archivo que va a rebotar.
const FORMATOS = ['image/jpeg', 'image/png', 'image/webp'];

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
export default function CabeceraFicha({
  persona, onVolver, onEditar, onArchivoFoto, onQuitarFoto, guardandoFoto = false,
}: {
  persona: PersonaCabecera;
  onVolver: () => void;
  onEditar: () => void;
  onArchivoFoto: (archivo: File) => void;
  onQuitarFoto: () => void;
  guardandoFoto?: boolean;
}) {
  const [menu, setMenu] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const nombreCompleto = `${persona.nombre} ${persona.apellido}`;
  const estado = persona.activo ? 'Activo' : 'Retirado';

  const elegir = (e: React.ChangeEvent<HTMLInputElement>) => {
    const archivo = e.target.files?.[0];
    e.target.value = ''; // para poder volver a elegir el mismo archivo
    if (!archivo) return;
    if (!FORMATOS.includes(archivo.type)) {
      setError('La foto debe ser JPG, PNG o WEBP.');
      return;
    }
    setError('');
    setMenu(false);
    onArchivoFoto(archivo);
  };

  const datos = [
    { icono: Briefcase, texto: persona.cargo || 'Sin cargo' },
    { icono: IdCard, texto: `CC ${persona.cedula}` },
    ...(persona.creadoEn
      ? [{ icono: CalendarDays, texto: `Desde ${mesYAnio(persona.creadoEn)}` }]
      : []),
    { icono: Banknote, texto: cop(persona.salarioMensual) },
    // Se pinta SIEMPRE, incluida Presencial. Un hueco se lee como "no tiene
    // dato", que es otra cosa: aquí siempre hay una respuesta.
    { icono: MapPinned, texto: ETIQUETA_MODALIDAD[normalizarModalidad(persona.modalidad)] },
  ];

  return (
    <div className="bg-white rounded-card border border-gray-200">
      {/* La tarjeta NO recorta: el menú de la foto cuelga por debajo de su
          borde y quedaba cortado a media altura. El redondeo se lo lleva la
          portada, que era lo único que lo necesitaba. */}
      <div className="relative h-24 sm:h-28 rounded-t-card overflow-hidden" style={PORTADA}>
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

      <div className="px-5 pb-6 flex flex-col items-center text-center sm:flex-row sm:items-end sm:text-left sm:gap-5">
        {/* El avatar monta sobre la portada. El margen negativo es la mitad de
            su alto, para que quede partido justo por el borde.
            Va anclado arriba (self-start) y no al fondo de la fila: si se
            alinea al fondo, cuánto monta sobre la portada pasa a depender de
            lo alto que sea el bloque de texto, y darle aire al nombre lo
            despegaba de la portada. */}
        <div className="relative -mt-12 sm:-mt-10 sm:self-start shrink-0">
          {/* El círculo es el control de la foto: es donde uno va a buscarla,
              y no hay que cazar un lápiz escondido en otra parte. */}
          <button
            type="button"
            onClick={() => { setMenu(v => !v); setError(''); }}
            aria-label={`Cambiar la foto de ${nombreCompleto}`}
            aria-expanded={menu}
            className="group relative block w-24 h-24 rounded-full ring-4 ring-white focus:outline-none focus-visible:ring-primary"
          >
            {persona.foto ? (
              <img src={persona.foto} alt={`Foto de ${nombreCompleto}`}
                className="w-24 h-24 rounded-full object-cover bg-gray-100" />
            ) : (
              <span className="w-24 h-24 rounded-full bg-primary flex items-center justify-center text-3xl font-bold text-ink">
                {persona.nombre[0]}{persona.apellido[0]}
              </span>
            )}
            <span className="absolute inset-0 rounded-full bg-black/45 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity flex items-center justify-center">
              <Camera size={22} className="text-white" />
            </span>
          </button>

          {/* El punto de estado. Lleva su propia etiqueta porque el color solo
              no le sirve a quien no lo distingue. */}
          <span
            role="img"
            aria-label={estado}
            title={estado}
            className={`absolute bottom-1 right-1 w-5 h-5 rounded-full ring-4 ring-white pointer-events-none ${
              persona.activo ? 'bg-green-500' : 'bg-gray-400'}`}
          />

          {menu && (
            <>
              {/* Cierra al tocar afuera. Va detrás del menú. */}
              <button type="button" aria-hidden="true" tabIndex={-1}
                onClick={() => setMenu(false)} className="fixed inset-0 z-20 cursor-default" />
              <div className="absolute z-30 top-full mt-2 left-1/2 -translate-x-1/2 w-52 bg-white rounded-xl border border-gray-200 shadow-lg p-1.5 text-left">
                <label className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm text-ink hover:bg-gray-50 cursor-pointer">
                  <Upload size={15} className="text-muted shrink-0" />
                  <span>Subir una foto</span>
                  <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp"
                    onChange={elegir} className="sr-only" />
                </label>
                {persona.foto && (
                  <button type="button"
                    onClick={() => { setMenu(false); onQuitarFoto(); }}
                    className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm text-red-600 hover:bg-red-50">
                    <Trash2 size={15} className="shrink-0" />
                    <span>Quitar la foto</span>
                  </button>
                )}
                <p className="text-[11px] text-muted px-2.5 py-1.5 leading-snug">
                  JPG, PNG o WEBP. Se guarda solo en esta ficha.
                </p>
              </div>
            </>
          )}
        </div>

        {/* El nombre lleva arriba el mismo aire que la fila de datos deja
            abajo. Sin el padding, el bloque se pega al borde de la portada
            porque items-end lo estira hasta llenar la línea. */}
        <div className="min-w-0 mt-3 sm:mt-0 sm:pt-6 flex-1">
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

          {guardandoFoto && <p className="text-xs text-muted mt-2">Guardando la foto...</p>}
          {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
        </div>
      </div>
    </div>
  );
}
