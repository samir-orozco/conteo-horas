/**
 * ¿Con qué se está marcando de verdad: con la cara o con la cédula?
 *
 * Es la pregunta que no se podía responder y que bloqueaba todo el trabajo de
 * biometría. Antes de gastar esfuerzo en pruebas de vida hay que saber si la
 * gente usa la cámara, porque si la mayoría entra con la cédula, cualquier
 * mejora del rostro solo muda el fraude al camino más cómodo.
 *
 * SOLO LEE. No escribe ni borra nada.
 *
 * Cómo leer el resultado:
 *  - `(sin dato)` NO significa cédula. Son marcaciones anteriores a que se
 *    midiera el método, o de sesiones abiertas antes del despliegue, que duran
 *    12 horas. Se cuentan aparte a propósito.
 *  - `MANUAL` es una marcación que escribió un administrador desde el panel, no
 *    una persona en el kiosco.
 *  - La distancia solo existe para ROSTRO. Un rostro presente suele dar valores
 *    repartidos; DISTANCIAS QUE SE REPITEN AL MILÍMETRO entre marcaciones son la
 *    huella de un descriptor copiado del inspector y reenviado, porque dos
 *    capturas vivas nunca dan el mismo número.
 *
 * [EN LOCAL]   npx ts-node prisma/diagnostico-metodo-marcacion.ts [dias]
 * [SERVIDOR]   ver la versión .cjs, que usa el dist ya desplegado
 */
import { prisma } from '../src/prisma';

const DIAS = Number(process.argv[2]) || 30;

function barra(n: number, total: number): string {
  if (total === 0) return '';
  const anchura = Math.round((n / total) * 40);
  return '█'.repeat(anchura).padEnd(40, '·');
}

function porcentaje(n: number, total: number): string {
  return total === 0 ? '  0.0%' : `${((n / total) * 100).toFixed(1).padStart(5)}%`;
}

async function main() {
  const desde = new Date(Date.now() - DIAS * 24 * 60 * 60 * 1000);

  const registros = await prisma.registro.findMany({
    where: { fecha: { gte: desde } },
    select: {
      metodoEntrada: true, metodoSalida: true,
      distanciaEntrada: true, distanciaSalida: true,
      entrada: true, salida: true, colaboradorId: true, fecha: true,
    },
  });

  console.log(`\nMARCACIONES DE LOS ÚLTIMOS ${DIAS} DÍAS. Solo lectura.\n`);
  console.log(`  ${registros.length} filas de registro desde ${desde.toISOString().slice(0, 10)}\n`);

  for (const momento of ['entrada', 'salida'] as const) {
    const campo = momento === 'entrada' ? 'metodoEntrada' : 'metodoSalida';
    const hora = momento === 'entrada' ? 'entrada' : 'salida';
    // Solo cuenta donde hubo de verdad una marca de ese momento: una fila sin
    // salida no es una salida sin método, es una salida que no ocurrió.
    const conMarca = registros.filter(r => r[hora] !== null);
    const conteo = new Map<string, number>();
    for (const r of conMarca) {
      const k = (r[campo] as string | null) ?? '(sin dato)';
      conteo.set(k, (conteo.get(k) ?? 0) + 1);
    }

    console.log(`── ${momento.toUpperCase()}: ${conMarca.length} marcas ──`);
    if (conMarca.length === 0) console.log('   (ninguna)');
    for (const [k, n] of [...conteo].sort((a, b) => b[1] - a[1])) {
      console.log(`   ${k.padEnd(11)} ${String(n).padStart(6)}  ${porcentaje(n, conMarca.length)}  ${barra(n, conMarca.length)}`);
    }
    console.log('');
  }

  // Distancias: la parte que sirve para detectar y no solo para contar.
  const distancias = [
    ...registros.filter(r => r.metodoEntrada === 'ROSTRO' && r.distanciaEntrada !== null)
      .map(r => ({ d: r.distanciaEntrada!, col: r.colaboradorId })),
    ...registros.filter(r => r.metodoSalida === 'ROSTRO' && r.distanciaSalida !== null)
      .map(r => ({ d: r.distanciaSalida!, col: r.colaboradorId })),
  ];

  console.log(`── DISTANCIA DEL RECONOCIMIENTO: ${distancias.length} valores ──`);
  if (distancias.length === 0) {
    console.log('   (todavía no hay ninguna; aparecen cuando alguien marque con la cara)\n');
  } else {
    const orden = distancias.map(x => x.d).sort((a, b) => a - b);
    const mediana = orden[Math.floor(orden.length / 2)];
    console.log(`   mínima ${orden[0].toFixed(4)}   mediana ${mediana.toFixed(4)}   máxima ${orden[orden.length - 1].toFixed(4)}`);

    // Un valor repetido EXACTO para la misma persona no puede salir de dos
    // capturas vivas: es el mismo descriptor enviado dos veces.
    const porPersona = new Map<string, Map<number, number>>();
    for (const { d, col } of distancias) {
      if (!porPersona.has(col)) porPersona.set(col, new Map());
      const m = porPersona.get(col)!;
      m.set(d, (m.get(d) ?? 0) + 1);
    }
    const repetidas: string[] = [];
    for (const [col, m] of porPersona) {
      for (const [d, n] of m) if (n > 1) repetidas.push(`     colaborador ${col}: la distancia ${d.toFixed(6)} aparece ${n} veces`);
    }
    if (repetidas.length === 0) {
      console.log('   OK: ninguna distancia se repite exactamente para la misma persona.');
    } else {
      console.log(`   AVISO: ${repetidas.length} distancias repetidas al milímetro. Dos capturas`);
      console.log('   vivas no dan el mismo número: esto es compatible con un descriptor reenviado.');
      repetidas.slice(0, 10).forEach(l => console.log(l));
      if (repetidas.length > 10) console.log(`     ... y ${repetidas.length - 10} más`);
    }
    console.log('');
  }

  console.log('Un `(sin dato)` no es una cédula: es una marcación anterior a que se');
  console.log('midiera el método, o de una sesión abierta antes del despliegue.\n');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
