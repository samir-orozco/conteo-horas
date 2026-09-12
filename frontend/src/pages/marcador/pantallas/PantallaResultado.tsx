import { LogIn, LogOut, Check, X, UtensilsCrossed, Coffee, type LucideIcon } from 'lucide-react';
import type { Flash, Pausa } from '../tipos';

// Cada pausa tiene su propio color y su propio texto: la persona tiene que salir
// de aquí sabiendo que el sistema entendió que va a volver, y a cuál pausa se fue.
const ASPECTO_DE_PAUSA: Record<Pausa, { fondo: string; tinta: string; Icono: LucideIcon; titulo: string }> = {
  ALMUERZO: { fondo: 'bg-amber-500', tinta: 'text-amber-600', Icono: UtensilsCrossed, titulo: '¡Buen provecho!' },
  DESCANSO: { fondo: 'bg-sky-600', tinta: 'text-sky-600', Icono: Coffee, titulo: '¡Buen descanso!' },
};

// Pantalla de confirmación a pantalla completa (entrada / salida / error).
export default function PantallaResultado({ flash, cerrandoFlash }: { flash: NonNullable<Flash>; cerrandoFlash: boolean }) {
  if (flash.tipo === 'ok') {
    const esEntrada = flash.accion === 'ENTRADA';
    const pausa = flash.pausa ? ASPECTO_DE_PAUSA[flash.pausa] : null;
    const fondo = pausa?.fondo ?? (esEntrada ? 'bg-green-600' : 'bg-red-600');
    const tinta = pausa?.tinta ?? (esEntrada ? 'text-green-600' : 'text-red-600');
    const Icono = pausa?.Icono ?? (esEntrada ? LogIn : LogOut);
    return (
      <div className={`min-h-screen flex items-center justify-center p-4 ${fondo} ${cerrandoFlash ? 'hp-fade-out' : 'hp-fade-bg'}`}>
        <div className={`text-center text-white ${cerrandoFlash ? 'hp-pop-out' : ''}`}>
          <div className="relative mx-auto mb-8 w-36 h-36">
            <div className="hp-ripple absolute inset-0 rounded-full bg-white/40" />
            <div className={`relative w-36 h-36 rounded-full bg-white flex items-center justify-center ${cerrandoFlash ? '' : 'hp-pop'}`}>
              <Icono size={64} className={tinta} strokeWidth={2.5} />
            </div>
          </div>
          <p className={`text-4xl font-extrabold mb-2 ${cerrandoFlash ? '' : 'hp-pop'}`}>
            {pausa ? pausa.titulo : esEntrada ? '¡Entrada registrada!' : '¡Salida registrada!'}
          </p>
          <p className="text-xl text-white/90">{flash.nombre}</p>
          <p className="text-6xl font-mono font-bold mt-4 tabular-nums">{flash.hora}</p>
          <p className="mt-6 text-white/80 flex items-center justify-center gap-2">
            <Check size={18} /> {pausa ? 'Marca tu regreso al volver' : esEntrada ? 'Buen turno' : 'Hasta pronto'}
          </p>
        </div>
      </div>
    );
  }
  return (
    <div className={`min-h-screen bg-red-600 flex items-center justify-center p-4 ${cerrandoFlash ? 'hp-fade-out' : 'hp-fade-bg'}`}>
      <div className={`text-center text-white ${cerrandoFlash ? 'hp-pop-out' : 'hp-shake'}`}>
        <div className={`mx-auto mb-8 w-36 h-36 rounded-full bg-white flex items-center justify-center ${cerrandoFlash ? '' : 'hp-pop'}`}>
          <X size={64} className="text-red-600" strokeWidth={2.5} />
        </div>
        <p className="text-4xl font-extrabold mb-2">Algo salió mal</p>
        <p className="text-xl text-white/90">{flash.msg}</p>
      </div>
    </div>
  );
}
