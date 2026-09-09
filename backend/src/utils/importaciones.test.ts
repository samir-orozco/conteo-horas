import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

// LA REGLA 8.5 DEL CLAUDE.md, COMO PRUEBA Y NO COMO BUENA INTENCIÓN.
//
// `index.ts` arranca Fastify al importarse: la última línea del archivo es
// `start()`, que hace `app.listen()` y programa cinco tareas periódicas. Por eso
// cualquier archivo que importe un VALOR desde '../index' arrastra el servidor
// entero: el día que existan las pruebas de integración de rutas, importar una
// ruta abriría el puerto 3001 y dispararía los barridos diarios CONTRA LA BASE
// DE DESARROLLO. Ya pasó una vez, con `cierreTurnos.ts`.
//
// El cliente de Prisma vive en `./prisma`, que no arranca nada. De ahí se
// importa.
//
// POR QUÉ ESTA PRUEBA ES ESTÁTICA Y NO EJECUTA NADA. Se intentó primero con una
// sonda que importaba un módulo y miraba si el puerto 3001 quedaba ocupado. No
// servía: `start()` es asíncrona, así que la sonda ganaba la carrera al `listen`
// y decía que todo estaba bien incluso con el import malo. Y hacerla esperar
// habría significado levantar el servidor de verdad y dejar que las tareas
// diarias escribieran en la base, que es exactamente el daño que se quiere
// evitar. Mirar el texto de los imports no tiene ese problema.
//
// Un `import type` no cuenta: TypeScript lo borra al compilar, así que no
// arrastra nada en tiempo de ejecución. Por eso el patrón exige que la línea NO
// empiece por `import type`.

const RAIZ = join(__dirname, '..');

// Trabajo del usuario sin commitear al 9 de septiembre de 2026: `admin.ts` se
// dejó fuera para no mezclarlo con un cambio ajeno. Cuando ese trabajo entre,
// se le aplica el mismo cambio y se borra esta línea. La excepción está aquí, a
// la vista, y no escondida en un comentario.
const EXCEPCIONES_PENDIENTES = ['routes/admin.ts'];

function archivosTs(dir: string, base = ''): string[] {
  return readdirSync(dir).flatMap(nombre => {
    const ruta = join(dir, nombre);
    const rel = base ? `${base}/${nombre}` : nombre;
    if (statSync(ruta).isDirectory()) return archivosTs(ruta, rel);
    return nombre.endsWith('.ts') && !nombre.endsWith('.test.ts') ? [rel] : [];
  });
}

// Importa un valor (no un tipo) desde el módulo que arranca el servidor.
const IMPORTA_EL_ARRANQUE = /^import\s+(?!type\s)[^;]*?from\s+['"]\.\.\/index['"]/m;

describe('nadie importa valores desde el módulo que arranca el servidor', () => {
  const archivos = archivosTs(RAIZ).filter(f => f !== 'index.ts');

  it('encuentra los archivos que tiene que revisar', () => {
    // Sin esto, un error en el recorrido dejaría la prueba en verde revisando
    // cero archivos, que es la forma más silenciosa de no probar nada.
    expect(archivos.length).toBeGreaterThan(30);
    expect(archivos).toContain('utils/kioscoConfig.ts');
    expect(archivos).toContain('routes/worker.ts');
  });

  it('ninguno lo hace, salvo las excepciones declaradas', () => {
    const culpables = archivos.filter(
      f => !EXCEPCIONES_PENDIENTES.includes(f) &&
        IMPORTA_EL_ARRANQUE.test(readFileSync(join(RAIZ, f), 'utf8')),
    );
    expect(culpables).toEqual([]);
  });

  it('las excepciones declaradas siguen siendo de verdad excepciones', () => {
    // Si alguien arregla `admin.ts` y olvida borrar la línea de arriba, la lista
    // se queda protegiendo a un archivo que ya no lo necesita, y la próxima vez
    // que ese archivo recaiga nadie se entera.
    for (const f of EXCEPCIONES_PENDIENTES) {
      expect(IMPORTA_EL_ARRANQUE.test(readFileSync(join(RAIZ, f), 'utf8'))).toBe(true);
    }
  });
});
