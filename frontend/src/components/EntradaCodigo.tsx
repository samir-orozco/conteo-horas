import { useRef, useEffect } from 'react';

type Props = {
  valor: string; // hasta `longitud` dígitos, ej. "8619"
  onChange: (valor: string) => void;
  longitud?: number;
  error?: boolean;
  autoFocus?: boolean;
};

// Casillas de un dígito cada una. Escribir avanza a la siguiente, Backspace en
// vacío retrocede, y pegar el código completo en cualquier casilla lo reparte
// en todas (empezando desde esa casilla).
export default function EntradaCodigo({ valor, onChange, longitud = 6, error, autoFocus }: Props) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const digitos = Array.from({ length: longitud }, (_, i) => valor[i] ?? '');

  useEffect(() => {
    if (autoFocus) refs.current[0]?.focus();
  }, [autoFocus]);

  const setEn = (idx: number, nuevoValor: string) => {
    const limpio = nuevoValor.replace(/\D/g, '');
    if (!limpio) {
      const arr = valor.split('');
      arr[idx] = '';
      onChange(arr.join('').slice(0, longitud));
      return;
    }
    // Pegar/escribir varios dígitos de una: repartir desde idx hacia adelante
    const arr = valor.padEnd(longitud, ' ').split('');
    for (let i = 0; i < limpio.length && idx + i < longitud; i++) arr[idx + i] = limpio[i];
    const resultado = arr.join('').replace(/ /g, '').slice(0, longitud);
    onChange(resultado);
    const siguiente = Math.min(idx + limpio.length, longitud - 1);
    refs.current[siguiente]?.focus();
    if (idx + limpio.length >= longitud) refs.current[longitud - 1]?.blur();
  };

  const onKeyDown = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digitos[idx] && idx > 0) {
      refs.current[idx - 1]?.focus();
    } else if (e.key === 'ArrowLeft' && idx > 0) {
      refs.current[idx - 1]?.focus();
    } else if (e.key === 'ArrowRight' && idx < longitud - 1) {
      refs.current[idx + 1]?.focus();
    }
  };

  return (
    <div className="flex justify-center gap-2">
      {digitos.map((d, i) => (
        <input
          key={i}
          ref={el => { refs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={longitud} // permite pegar el código completo en cualquier casilla
          value={d}
          onChange={e => setEn(i, e.target.value)}
          onKeyDown={e => onKeyDown(i, e)}
          onFocus={e => e.target.select()}
          className={`w-11 h-14 text-center text-2xl font-bold rounded-2xl border-2 focus:outline-none transition-colors ${
            error ? 'border-red-400 bg-red-50 text-red-600' : 'border-gray-200 focus:border-primary text-ink'
          }`}
          aria-label={`Dígito ${i + 1} de ${longitud}`}
        />
      ))}
    </div>
  );
}
