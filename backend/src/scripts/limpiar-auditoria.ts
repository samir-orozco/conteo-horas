import { prisma } from '../prisma';
import { rutaNormalizada } from '../utils/huellaDeEvento';
import { detalleSinDatosDePersonas } from '../utils/auditoriaDePeticion';

// LOS DATOS DE LAS PERSONAS QUE YA ESTABAN EN LA AUDITORÍA (14 de octubre de 2026).
//
// Desde este día la auditoría no copia los datos de las personas (utils/auditoriaDePeticion.ts, opción A de
// POLITICA-PRIVACIDAD-1.3-para-abogado.md §0). Las filas de antes sí los tienen, y el registro no se borra solo. Este
// comando les aplica la MISMA regla, con la misma función: de cada cuerpo quedan los nombres de los campos y los ids.
// La fila sigue diciendo quién hizo qué, cuándo, desde qué IP y sobre cuál registro.
//
// Por defecto NO escribe: cuenta cuántas filas cambiarían y de qué recurso, sin mostrar ningún dato. Escribe solo con
// `--aplicar`. Correrlo dos veces no hace nada la segunda.
//
// Vive en `src/` para que `tsc` lo compile a `dist/` y viaje al servidor. En el servidor, desde ~/horapro-co-api y con los
// límites de hilos de DESPLIEGUE.md §6.1:
//
//   TOKIO_WORKER_THREADS=1 UV_THREADPOOL_SIZE=2 node dist/scripts/limpiar-auditoria.js
//   TOKIO_WORKER_THREADS=1 UV_THREADPOOL_SIZE=2 node dist/scripts/limpiar-auditoria.js --aplicar

const LOTE = 500;

async function main() {
  const aplicar = process.argv.includes('--aplicar');
  let cursor: string | undefined;
  let revisadas = 0, cambiadas = 0;
  const porRuta = new Map<string, number>();

  for (;;) {
    const filas = await prisma.eventoSistema.findMany({
      where: { tipo: 'AUDITORIA' },
      orderBy: { id: 'asc' },
      take: LOTE,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: { id: true, ruta: true, detalle: true },
    });
    if (filas.length === 0) break;
    cursor = filas[filas.length - 1].id;
    revisadas += filas.length;

    const cambios = filas.flatMap(f => {
      const nuevo = detalleSinDatosDePersonas(f.detalle, f.ruta);
      return nuevo === null ? [] : [{ id: f.id, ruta: f.ruta, detalle: nuevo }];
    });
    for (const c of cambios) {
      const clave = rutaNormalizada(c.ruta ?? '(sin ruta)');
      porRuta.set(clave, (porRuta.get(clave) ?? 0) + 1);
    }
    cambiadas += cambios.length;
    if (aplicar && cambios.length > 0) {
      await prisma.$transaction(cambios.map(c => prisma.eventoSistema.update({ where: { id: c.id }, data: { detalle: c.detalle } })));
    }
  }

  console.log(`${aplicar ? 'LIMPIADAS' : 'Cambiarían (no se escribió nada; para escribir: --aplicar)'}: ${cambiadas} de ${revisadas} filas de auditoría`);
  for (const [ruta, n] of [...porRuta].sort((a, b) => b[1] - a[1])) console.log(`  ${String(n).padStart(6)}  ${ruta}`);
}

main()
  .catch(err => { console.error(err); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
