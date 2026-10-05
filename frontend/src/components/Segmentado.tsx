// UN GRUPO DE OPCIONES CON UNA PÍLDORA BLANCA QUE SE DESLIZA hasta la encendida. Nació en el calendario
// de turnos (Día · Semana · Mes) y lo usa también el seguimiento del clima laboral (4 de octubre de 2026,
// pedido del dueño: «la misma animación que en turnos»). Una sola pieza, para que se muevan igual y para
// que un arreglo llegue a las dos (CLAUDE.md §9.3).
//
// LAS OPCIONES MIDEN LO MISMO, y de eso depende todo lo demás: la píldora mide una opción y se mueve un
// ancho entero por posición. Con anchos distintos habría que medir cada botón con una referencia y
// recalcular al cambiar el tamaño de la ventana, que es mucha maquinaria para un control de pocas
// opciones.
//
// Y SE IGUALAN CON UNA REJILLA DE COLUMNAS IGUALES, NO CON `flex-1`. Con flex se probó primero en turnos
// y salieron 52 / 83 / 59 px: `flex: 1 1 0%` reparte el sobrante, pero ningún hijo baja de su ancho mínimo
// de contenido. Con columnas iguales, todas miden lo que la más ancha y la píldora cae clavada.
//
// EL FONDO ES `gray-100`: con un gris más oscuro, la píldora blanca y el carril tenían casi el mismo
// peso y el conjunto se leía como una caja gris con un agujero, en vez de como opciones con una encendida.
type Opcion<T extends string> = { readonly valor: T; readonly etiqueta: string };

// `compacto`: menos relleno y letra un punto más chica, para un lugar angosto como el panel lateral del
// seguimiento, donde «En seguimiento» se partía en dos líneas dentro de la píldora.
export default function Segmentado<T extends string>({ etiqueta, opciones, valor, onCambio, deshabilitado = false, compacto = false }: {
  etiqueta: string;
  opciones: readonly Opcion<T>[];
  valor: T;
  onCambio: (valor: T) => void;
  deshabilitado?: boolean;
  compacto?: boolean;
}) {
  const indice = Math.max(0, opciones.findIndex(o => o.valor === valor));
  return (
    <div role="group" aria-label={etiqueta}
      className="relative grid items-center rounded-xl bg-gray-100 p-[3px]"
      style={{ gridTemplateColumns: `repeat(${opciones.length}, minmax(0, 1fr))` }}>
      {/* `aria-hidden`: es puro dibujo. Quién está encendido lo dice `aria-pressed` en su botón, y
          anunciarlo además sería decirlo dos veces a quien usa lector de pantalla.

          `motion-reduce:transition-none` porque quien pidió menos movimiento al sistema operativo no lo
          pidió para las demás páginas y no para esta. */}
      <span aria-hidden="true"
        className="pointer-events-none absolute inset-y-[3px] left-[3px] rounded-[9px] bg-white shadow-sm transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none"
        style={{
          width: `calc((100% - 6px) / ${opciones.length})`,
          transform: `translateX(${indice * 100}%)`,
        }} />
      {opciones.map(o => (
        <button key={o.valor} type="button" aria-pressed={o.valor === valor} disabled={deshabilitado}
          // Avisa también al tocar la encendida: en turnos eso limpia las celdas marcadas.
          onClick={() => onCambio(o.valor)}
          // `relative` para quedar POR ENCIMA de la píldora, que es absoluta: sin esto el blanco se
          // dibuja sobre el texto y la opción encendida se lee en blanco sobre blanco.
          className={`relative whitespace-nowrap rounded-[9px] py-1.5 text-center transition-colors disabled:cursor-not-allowed ${
            compacto ? 'px-2 text-[12px]' : 'px-4 text-[13px]'} ${
            o.valor === valor
              ? 'text-ink font-extrabold'
              : 'text-muted font-semibold hover:bg-gray-200/60 hover:text-ink'}`}>
          {o.etiqueta}
        </button>
      ))}
    </div>
  );
}
