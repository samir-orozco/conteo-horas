import { LogIn, LogOut, Check, X } from 'lucide-react';
import type { Flash } from '../tipos';

// Pantalla de confirmación a pantalla completa (entrada / salida / error).
export default function PantallaResultado({ flash, cerrandoFlash }: { flash: NonNullable<Flash>; cerrandoFlash: boolean }) {
  if (flash.tipo === 'ok') {
    const esEntrada = flash.accion === 'ENTRADA';
    return (
      <div className={`min-h-screen flex items-center justify-center p-4 ${esEntrada ? 'bg-green-600' : 'bg-red-600'} ${cerrandoFlash ? 'hp-fade-out' : 'hp-fade-bg'}`}>
        <div className={`text-center text-white ${cerrandoFlash ? 'hp-pop-out' : ''}`}>
          <div className="relative mx-auto mb-8 w-36 h-36">
            <div className="hp-ripple absolute inset-0 rounded-full bg-white/40" />
            <div className={`relative w-36 h-36 rounded-full bg-white flex items-center justify-center ${cerrandoFlash ? '' : 'hp-pop'}`}>
              {esEntrada
                ? <LogIn size={64} className="text-green-600" strokeWidth={2.5} />
                : <LogOut size={64} className="text-red-600" strokeWidth={2.5} />}
            </div>
          </div>
          <p className={`text-4xl font-extrabold mb-2 ${cerrandoFlash ? '' : 'hp-pop'}`}>{esEntrada ? '¡Entrada registrada!' : '¡Salida registrada!'}</p>
          <p className="text-xl text-white/90">{flash.nombre}</p>
          <p className="text-6xl font-mono font-bold mt-4 tabular-nums">{flash.hora}</p>
          <p className="mt-6 text-white/80 flex items-center justify-center gap-2"><Check size={18} /> {esEntrada ? 'Buen turno' : 'Hasta pronto'}</p>
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
