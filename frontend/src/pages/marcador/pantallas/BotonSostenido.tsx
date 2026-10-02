import { useEffect, useRef, useState, type ReactNode } from 'react';

type Props = {
  // Cuánto hay que sostenerlo. Lo decide `confirmacionDeLaMarca`: 1,5 s lo normal,
  // 3 s cuando algo no cuadra.
  ms: number;
  onConfirmar: () => void;
  disabled?: boolean;
  // Colores y tamaño: los pone quien lo usa, igual que con el botón de antes.
  className?: string;
  // Lo que dice el botón. Lleva el nombre de la persona y la acción.
  children: ReactNode;
};

// EL BOTÓN DE MARCAR QUE HAY QUE SOSTENER (2 de octubre de 2026).
//
// El 1 de octubre dos personas oprimieron el botón grande de otra sin mirar el
// nombre, que iba arriba, lejos del dedo. Ahora el nombre va DENTRO del botón y un
// toque no basta: hay que sostenerlo mientras se llena. No obliga a leer, pero
// pone el nombre debajo del dedo durante un segundo y medio.
//
// Por qué así y no de otra forma:
//   - Puntero y no `touchstart`: el mismo código sirve con el dedo en la tableta,
//     con el mouse en desarrollo y con un lápiz.
//   - `touch-none` y sin menú contextual: en Android sostener un botón abre el menú
//     de copiar o arranca un desplazamiento, y el navegador cancela el toque.
//   - Se captura el puntero: si el dedo se corre unos milímetros fuera del borde,
//     sigue contando. Lo que cancela es soltar, no rozar el borde.
//   - El relleno es una transición de CSS: avanza sola sin un render por cuadro.
//   - Con el teclado también hay que sostener: Enter o espacio mantenidos.
export default function BotonSostenido({ ms, onConfirmar, disabled = false, className = '', children }: Props) {
  const [sosteniendo, setSosteniendo] = useState(false);
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);
  const confirmarRef = useRef(onConfirmar);
  useEffect(() => { confirmarRef.current = onConfirmar; }, [onConfirmar]);
  // Se lee al cumplirse el tiempo: si a mitad del gesto el botón quedó
  // deshabilitado, ese gesto ya no marca.
  const deshabilitadoRef = useRef(disabled);
  useEffect(() => { deshabilitadoRef.current = disabled; }, [disabled]);

  const cancelar = () => {
    if (temporizador.current !== null) clearTimeout(temporizador.current);
    temporizador.current = null;
    setSosteniendo(false);
  };

  const empezar = () => {
    if (disabled || temporizador.current !== null) return;
    setSosteniendo(true);
    temporizador.current = setTimeout(() => {
      temporizador.current = null;
      setSosteniendo(false);
      if (!deshabilitadoRef.current) confirmarRef.current();
    }, ms);
  };

  // Si la pantalla cambia a mitad del gesto (la sesión se cerró), el temporizador
  // no puede quedar vivo y marcar por su cuenta.
  useEffect(() => () => { if (temporizador.current !== null) clearTimeout(temporizador.current); }, []);

  return (
    <button
      type="button"
      disabled={disabled}
      onPointerDown={e => {
        if (e.button !== 0) return;
        try { e.currentTarget.setPointerCapture?.(e.pointerId); } catch { /* sin captura, igual sirve */ }
        empezar();
      }}
      onPointerUp={cancelar}
      onPointerCancel={cancelar}
      onLostPointerCapture={cancelar}
      onKeyDown={e => {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        e.preventDefault();
        if (!e.repeat) empezar();
      }}
      onKeyUp={e => { if (e.key === 'Enter' || e.key === ' ') cancelar(); }}
      // Un clic suelto no hace nada: es justo el gesto que se quiere evitar.
      onClick={e => e.preventDefault()}
      onContextMenu={e => e.preventDefault()}
      className={`relative overflow-hidden select-none touch-none [-webkit-touch-callout:none] ${className}`}
    >
      <span
        aria-hidden="true"
        className="absolute inset-y-0 left-0 bg-white/30"
        style={{ width: sosteniendo ? '100%' : '0%', transition: sosteniendo ? `width ${ms}ms linear` : 'none' }}
      />
      <span className="relative flex flex-col items-center gap-0.5">
        <span className="text-[11px] font-semibold uppercase tracking-wide opacity-80">
          {sosteniendo ? 'Sigue presionando…' : 'Mantén presionado'}
        </span>
        <span className="flex items-center justify-center gap-3">{children}</span>
      </span>
    </button>
  );
}
