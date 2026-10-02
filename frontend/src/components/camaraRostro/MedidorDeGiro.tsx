import { MARCAS_DEL_MEDIDOR, type LecturaDelGiro } from './reto';

type Props = {
  lectura: LecturaDelGiro;
  // De qué lado de la PANTALLA va la regla: el mismo de la flecha (`flechaDelReto`).
  lado: 'izq' | 'der';
};

// El óvalo de CamaraRostro, en el mismo sistema de coordenadas (viewBox 100x75).
const CX = 50;
const CY = 37.5;
const RX = 23;
const RY = 30;
// De qué parte del contorno salen las marcas: 60 grados por encima y por debajo del
// costado, apenas por fuera del óvalo.
const ABRE = (60 * Math.PI) / 180;
const DESDE = 1.1;
const HASTA = 1.22;

// LA REGLA QUE SE LLENA CON EL GIRO (2 de octubre de 2026, pedido del dueño a partir de
// una app de verificación que vio ese día). Una fila de marcas pegadas al óvalo, del
// lado hacia el que hay que girar, que se encienden de abajo arriba a medida que la
// cabeza gira. En ámbar si se pasó. Se dibuja con las coordenadas del óvalo
// (viewBox 100x75) para quedar pegada a él en cualquier tamaño de pantalla.
//
// Es un medidor para un lector de pantalla también: dice cuánto va, de 0 a 100.
export default function MedidorDeGiro({ lectura, lado }: Props) {
  const base = lado === 'der' ? 0 : Math.PI;
  const encendida = lectura.estado === 'DE_MAS' ? '#fbbf24' : '#4ade80';
  return (
    <g role="meter" aria-label="Cuánto va del giro" aria-valuemin={0} aria-valuemax={100}
      aria-valuenow={Math.round(lectura.avance * 100)}>
      {Array.from({ length: MARCAS_DEL_MEDIDOR }, (_, i) => {
        // De abajo (i = 0) hacia arriba. En SVG la y crece hacia abajo, y del lado
        // izquierdo el ángulo va al revés para que también empiece por abajo.
        const t = i / (MARCAS_DEL_MEDIDOR - 1);
        const desvio = ABRE - t * 2 * ABRE;
        const angulo = lado === 'der' ? base + desvio : base - desvio;
        const cos = Math.cos(angulo);
        const sen = Math.sin(angulo);
        return (
          <line key={i}
            x1={CX + RX * DESDE * cos} y1={CY + RY * DESDE * sen}
            x2={CX + RX * HASTA * cos} y2={CY + RY * HASTA * sen}
            stroke={i < lectura.encendidas ? encendida : 'rgba(255,255,255,0.45)'}
            strokeWidth="1.1" strokeLinecap="round" />
        );
      })}
    </g>
  );
}
