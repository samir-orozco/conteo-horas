// Genera el `package.json` que se le manda al servidor: el mismo de siempre pero
// SIN `devDependencies`.
//
// POR QUÉ EXISTE ESTE ARCHIVO. El 4 de septiembre de 2026 el `npm install` del
// servidor reventó con un error que no dice nada:
//
//     npm error Cannot read properties of null (reading 'edgesOut')
//
// El log sí lo decía: era el npm 10.9.8 del servidor atragantándose resolviendo
// las dependencias PEER de **vitest**, que es una herramienta de pruebas que el
// servidor no debería tener instalada. `--omit=dev` NO lo arregla, y esto es lo
// que costó entenderlo: npm construye el árbol ideal COMPLETO a partir del
// `package.json` y solo después omite las de desarrollo, así que la resolución
// que revienta ocurre igual.
//
// La salida no es pelearse con npm: es no darle nada que resolver. Sin el bloque
// `devDependencies`, el árbol ideal no incluye vitest y no hay qué romper. Medido:
// 223 paquetes en el árbol completo contra 88 en el de producción.
//
// De paso el servidor deja de instalar typescript, nodemon, ts-node y vitest, que
// hoy tiene y no usa nunca: el despliegue sube el `dist` ya compilado.
//
// SE CONSERVA SOLO EL SCRIPT `start`. Los demás (dev, build, test, prisma:*)
// necesitan devDependencies que ya no van a estar, así que dejarlos escritos sería
// ofrecer comandos que fallan.
//
// Uso, desde `backend/`:
//   node scripts/generar-paquete-produccion.mjs <carpeta-destino>
//
// Después hay que generar el lockfile CON EL NPM DEL SERVIDOR, no con el de esta
// máquina (regla 9.7 del CLAUDE.md: npm 11 escribe un campo `libc` que npm 10 no
// entiende). El comando está impreso al final de la ejecución.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

// La decisión, aparte del sistema de archivos para que se pueda probar. Es la
// regla 8.6 del CLAUDE.md: lo que decide se saca a una función pura, y la
// plomería (leer y escribir archivos) se verifica corriendo el script.
export function paqueteDeProduccion(origen) {
  if (!origen.scripts?.start) {
    // Sin `start` el servidor no sabe arrancar la app. Si alguien lo renombra,
    // que reviente aquí y no en producción.
    throw new Error('El package.json no tiene el script `start`. Es el único que el servidor usa.');
  }
  if (!origen.dependencies || Object.keys(origen.dependencies).length === 0) {
    // Un paquete sin dependencias significa que alguien movió el bloque de sitio.
    // Publicarlo dejaría al servidor sin fastify ni prisma.
    throw new Error('El package.json no tiene `dependencies`. Eso dejaría al servidor sin nada que instalar.');
  }
  return {
    name: origen.name,
    version: origen.version,
    private: true,
    main: origen.main,
    scripts: { start: origen.scripts.start },
    dependencies: origen.dependencies,
  };
}

// El cuerpo corre SOLO al ejecutar el archivo, no al importarlo. Sin esta guarda,
// la prueba que importa `paqueteDeProduccion` ejecutaba el script entero y moría
// en el `process.exit(1)` de la validación de argumentos. Es la regla 8.5 del
// CLAUDE.md en pequeño: importar un módulo no debe correr un programa.
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const destino = process.argv[2];
  if (!destino) {
    console.error('Falta la carpeta destino.\n  node scripts/generar-paquete-produccion.mjs <carpeta>');
    process.exit(1);
  }
  if (!existsSync(destino)) {
    console.error(`La carpeta destino no existe: ${destino}`);
    process.exit(1);
  }

  const origen = JSON.parse(readFileSync('package.json', 'utf8'));

  let produccion;
  try {
    produccion = paqueteDeProduccion(origen);
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }

  writeFileSync(join(destino, 'package.json'), JSON.stringify(produccion, null, 2) + '\n', 'utf8');

  const nDev = Object.keys(origen.devDependencies ?? {}).length;
  console.log(`Escrito ${join(destino, 'package.json')}`);
  console.log(`  ${Object.keys(produccion.dependencies).length} dependencias, ${nDev} devDependencies excluidas`);
  console.log('');
  console.log('Ahora el lockfile, CON EL NPM DEL SERVIDOR (npm 10.9.8):');
  console.log(`  cp package-lock.json ${destino}/`);
  console.log(`  cd ${destino} && npx --yes npm@10.9.8 install --package-lock-only`);
}
