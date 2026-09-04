import { useRef, useState } from 'react';
import { Camera, Trash2, UserRound } from 'lucide-react';
import { aFotoDePerfil, type DosFotos } from './foto';
import { ACEPTA_FOTO } from '../../lib/archivos';

// Foto de perfil al crear o editar un colaborador.
//
// Hasta ahora solo se podía poner DESPUÉS de crear a la persona, entrando a su
// ficha, o dejando que el primer escaneo facial la tomara. Quien está dando de
// alta a su equipo tiene las fotos a mano en ese momento, no después.
//
// Se recorta en el navegador antes de subirla, con el mismo helper de la ficha:
// la foto vive dentro de la fila del colaborador, y una de celular sin tocar son
// varios megabytes por persona.
export default function SelectorFoto({
  foto, iniciales, onCambio, onError,
}: {
  foto: string | null;
  // Para el círculo vacío. Se ven mejor que un icono genérico cuando ya se
  // escribió el nombre.
  iniciales?: string;
  onCambio: (fotos: DosFotos | null) => void;
  onError: (mensaje: string) => void;
}) {
  const archivo = useRef<HTMLInputElement>(null);
  const [procesando, setProcesando] = useState(false);

  const elegir = async (f: File | undefined) => {
    if (!f) return;
    setProcesando(true);
    try {
      onCambio(await aFotoDePerfil(f));
    } catch (e) {
      onError((e as Error).message || 'No pudimos leer esa imagen.');
    } finally {
      setProcesando(false);
      // Se limpia para que elegir el MISMO archivo otra vez vuelva a disparar
      // el evento: sin esto, corregir un error reintentando no hace nada.
      if (archivo.current) archivo.current.value = '';
    }
  };

  return (
    <div className="flex items-center gap-4">
      <div className="relative shrink-0">
        {foto ? (
          <img src={foto} alt="Foto del colaborador"
            className="w-20 h-20 rounded-full object-cover border border-gray-200" />
        ) : (
          <div className="w-20 h-20 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-400">
            {iniciales
              ? <span className="text-xl font-semibold text-gray-500" aria-hidden>{iniciales}</span>
              : <UserRound size={28} aria-hidden />}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-1.5 min-w-0">
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => archivo.current?.click()} disabled={procesando}
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-300 text-ink hover:bg-gray-50 disabled:opacity-60">
            <Camera size={14} />
            {procesando ? 'Procesando...' : foto ? 'Cambiar' : 'Subir foto'}
          </button>
          {foto && (
            <button type="button" onClick={() => onCambio(null)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-300 text-muted hover:bg-gray-50">
              <Trash2 size={14} /> Quitar
            </button>
          )}
        </div>
        <p className="text-[11px] text-muted">Cualquier foto. Se recorta y se optimiza sola.</p>
      </div>

      {/* `sr-only` y no `hidden`: un input oculto del todo no se puede enfocar
          ni disparar por teclado desde el botón. */}
      <input ref={archivo} type="file" accept={ACEPTA_FOTO}
        className="sr-only" aria-label="Foto del colaborador"
        onChange={e => elegir(e.target.files?.[0])} />
    </div>
  );
}
