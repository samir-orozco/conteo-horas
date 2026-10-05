import { useState } from 'react';
import { IMAGEN_DE_CARITA } from './caritas';
import { decimal, etiquetaDeSemana, fechaCortaSinAnio, puntosDeLaLinea } from './panelClima';

// La evolución del ánimo: el promedio de cada día o de cada semana, según el largo del rango (ver
// `granularidad` en panelClima.ts). Una sola serie: la nombra el título y no lleva leyenda. La escala
// es la de las caritas completa (1 a 5), con la carita dibujada en cada línea de la grilla en vez de un
// número suelto. Al pasar el mouse o el dedo por una semana sale su detalle.
const ANCHO = 600;
const ALTO = 200;
const MARGEN = 24;
const PIE = 22; // espacio para las fechas debajo
// Cuántas fechas se rotulan debajo: la primera, la última y unas pocas entre medio. Con trece semanas,
// una fecha por punto se amontona y no se lee.
const ROTULOS = 4;
const IZQUIERDA = 34; // espacio para las caritas del eje

type Punto = { fecha: string; promedio: number; total: number };

// `promedio`: el del período entero, el mismo de la tarjeta «Ánimo promedio». Va como una línea de
// referencia con su rótulo: sin ella, el valor del último punto (un solo día) se leía como si fuera el
// promedio, y no coincidía con la tarjeta (reporte del dueño, 4 de octubre de 2026).
export default function GraficaEvolucion({ puntos: serie, unidad, promedio }: { puntos: Punto[]; unidad: 'DIA' | 'SEMANA'; promedio: number | null }) {
  const rotulo = (fecha: string) => (unidad === 'SEMANA' ? etiquetaDeSemana(fecha) : fechaCortaSinAnio(fecha));
  const [activa, setActiva] = useState<number | null>(null);
  const puntos = puntosDeLaLinea(serie, { ancho: ANCHO - IZQUIERDA, alto: ALTO, margen: MARGEN }).map(p => ({ ...p, x: p.x + IZQUIERDA }));
  const yDe = (n: number) => MARGEN + ((5 - n) * (ALTO - 2 * MARGEN)) / 4;
  const camino = puntos.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
  const ultimo = puntos[puntos.length - 1];
  const franja = serie.length > 1 ? (ANCHO - IZQUIERDA - 2 * MARGEN) / (serie.length - 1) : ANCHO - IZQUIERDA;

  return (
    <div role="group" aria-label="Evolución del ánimo" className="bg-white rounded-card border border-gray-200 p-5">
      <p className="font-semibold text-ink">Evolución del ánimo</p>
      <p className="text-xs text-muted mb-3">{`Promedio de las caritas de cada ${unidad === 'SEMANA' ? 'semana' : 'día'}`}</p>
      <div className="relative">
        <svg viewBox={`0 0 ${ANCHO} ${ALTO + PIE}`} className="w-full h-auto" role="img"
          aria-label={serie.map(s => `${rotulo(s.fecha)}: ${decimal(s.promedio)}`).join('; ')}>
          {[1, 2, 3, 4, 5].map(n => (
            <g key={n}>
              <line x1={IZQUIERDA} x2={ANCHO - 4} y1={yDe(n)} y2={yDe(n)} stroke="#ececea" strokeWidth={1} />
              <image href={IMAGEN_DE_CARITA[n]} x={4} y={yDe(n) - 10} width={20} height={20} />
            </g>
          ))}
          {promedio !== null && (
            <g>
              <line x1={IZQUIERDA} x2={ANCHO - 4} y1={yDe(promedio)} y2={yDe(promedio)} stroke="#d4a72c" strokeWidth={1.5} />
              {/* Con un halo blanco, para que se lea aunque la línea de la serie pase por encima. */}
              <text x={IZQUIERDA + 4} y={yDe(promedio) - 6} fontSize={11} fontWeight={600} fill="#6b6b6b"
                stroke="#ffffff" strokeWidth={3} paintOrder="stroke">
                {`Promedio del período: ${decimal(promedio)}`}
              </text>
            </g>
          )}
          {puntos.length > 1 && <path d={camino} fill="none" stroke="#303030" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />}
          {puntos.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r={activa === i ? 6 : 4} fill="#303030" stroke="#ffffff" strokeWidth={2} />
          ))}
          {/* El valor del último punto dice DE QUÉ día o semana es: solo, se confundía con el promedio. */}
          {ultimo && (
            <text x={serie.length > 1 ? ANCHO - 4 : ultimo.x} y={ultimo.y - 12} textAnchor={serie.length > 1 ? 'end' : 'middle'}
              fontSize={12} fontWeight={700} fill="#303030" stroke="#ffffff" strokeWidth={3} paintOrder="stroke">
              {`${unidad === 'SEMANA' ? `Semana del ${fechaCortaSinAnio(serie[serie.length - 1].fecha)}` : fechaCortaSinAnio(serie[serie.length - 1].fecha)}: ${decimal(serie[serie.length - 1].promedio)}`}
            </text>
          )}
          {puntos.map((p, i) => {
            const paso = Math.max(1, Math.ceil((puntos.length - 1) / (ROTULOS - 1)));
            const rotula = i === 0 || i === puntos.length - 1 || (i % paso === 0 && puntos.length - 1 - i >= paso / 2);
            return rotula && (
              <text key={`f${i}`} x={p.x} y={ALTO + 14} textAnchor="middle" fontSize={11} fill="#898989">
                {fechaCortaSinAnio(serie[i].fecha)}
              </text>
            );
          })}
          {/* Zonas para el mouse: más anchas que el punto, una por semana. */}
          {puntos.map((p, i) => (
            <rect key={`z${i}`} x={p.x - franja / 2} y={0} width={franja} height={ALTO} fill="transparent"
              onMouseEnter={() => setActiva(i)} onMouseLeave={() => setActiva(null)} onClick={() => setActiva(i)} />
          ))}
        </svg>
        {activa !== null && puntos[activa] && (
          <div
            className="pointer-events-none absolute -translate-x-1/2 -translate-y-full rounded-lg bg-ink px-3 py-2 text-xs text-white shadow-lg whitespace-nowrap"
            style={{ left: `${(puntos[activa].x / ANCHO) * 100}%`, top: `${(puntos[activa].y / (ALTO + PIE)) * 100}%`, marginTop: -10 }}
          >
            <p className="font-semibold">{rotulo(serie[activa].fecha)}</p>
            <p>{decimal(serie[activa].promedio)} de 5 · {serie[activa].total} {serie[activa].total === 1 ? 'respuesta' : 'respuestas'}</p>
          </div>
        )}
      </div>
    </div>
  );
}
