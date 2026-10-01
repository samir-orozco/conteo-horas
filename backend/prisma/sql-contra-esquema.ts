// ────────── ¿LA BASE TIENE TODO LO QUE EL ESQUEMA DECLARA? (1 de octubre de 2026) ──────────
//
// Imprime UNA consulta SQL para pegar en phpMyAdmin que lista, de TODO el esquema, qué tabla o qué
// columna le falta a la base. No se conecta a nada: solo lee `schema.prisma` y escribe SQL.
//
// POR QUE EXISTE. En el despliegue de esta madrugada se comprobaron las ocho tablas y columnas
// pendientes una por una, todas dieron bien, y la pantalla de turnos devolvió 500 igual: a
// `plantillas_turno` le faltaban TRES columnas. El `CREATE TABLE` de `sql/plantillas-turno.sql` se
// escribió el 21 de septiembre y las columnas entraron el 23; nadie actualizó el archivo.
//
// La comprobación que se hizo preguntaba «¿existe la tabla?». La que hacía falta es «¿tiene todas
// sus columnas?», y esa no se puede hacer a ojo: son 30 modelos.
//
// Y NO SIRVE COMPARAR EL SQL CON EL ESQUEMA, que fue lo primero que se intentó: los archivos de
// `sql/` son el historial de lo que se fue aplicando, no el estado. Lo único que vale es preguntarle
// a la BASE.
//
//   npx ts-node prisma/sql-contra-esquema.ts > /tmp/comprobar.sql
import { readFileSync } from 'fs';
import { join } from 'path';

const TIPOS = new Set(['String', 'Int', 'Float', 'Boolean', 'DateTime', 'Json', 'Decimal', 'BigInt', 'Bytes']);
const BASE = process.argv[2] ?? 'ewyfwxbg_horapro';

const texto = readFileSync(join(__dirname, 'schema.prisma'), 'utf8');
const pares: [string, string][] = [];

// LOS NOMBRES DE TODOS LOS MODELOS, para descartarlos. Una relacion UNO A UNO del lado pasivo
// —`suscripcion Suscripcion?`— no lleva `@relation` ni `[]`, asi que por la forma de la linea es
// indistinguible de una columna. Lo que la delata es que su tipo ES otro modelo.
const MODELOS = new Set([...texto.matchAll(/\nmodel (\w+)/g)].map(m => m[1]));

for (const bloque of texto.split(/\nmodel /).slice(1)) {
  const nombre = bloque.split(/[\s{]/)[0];
  const cuerpo = bloque.slice(0, bloque.indexOf('\n}'));
  const map = /@@map\("([^"]+)"\)/.exec(cuerpo);
  const tabla = map ? map[1] : nombre;
  for (const linea of cuerpo.split('\n')) {
    if (linea.trim().startsWith('//')) continue;
    const m = /^\s+(\w+)\s+(\w+)/.exec(linea);
    if (!m) continue;
    // Solo escalares: un tipo que empieza en mayuscula y no esta en la lista es una relacion o un
    // enum, y ninguno de los dos es una columna que haya que buscar... salvo los enum, que SI lo son.
    // Se distinguen porque la relacion lleva `@relation` o es un arreglo.
    const tipo = m[2];
    const esRelacion = linea.includes('@relation') || linea.includes('[]');
    if (esRelacion || MODELOS.has(tipo)) continue;
    // Lo que queda es un escalar o un enum. Un enum SI es una columna.
    if (!TIPOS.has(tipo) && !/^[A-Z]/.test(tipo)) continue;
    pares.push([tabla, m[1]]);
  }
}

const filas = pares.map(([t, c]) => `  SELECT '${t}' AS t, '${c}' AS c`).join('\n  UNION ALL\n');
console.log(`-- Generado por prisma/sql-contra-esquema.ts desde schema.prisma.
-- Lista lo que el esquema declara y la base NO tiene. Si no devuelve filas, la base esta al dia.
SELECT x.t AS tabla, x.c AS columna,
       CASE WHEN i.TABLE_NAME IS NULL THEN '*** NO EXISTE LA TABLA ***'
            ELSE '*** FALTA LA COLUMNA ***' END AS problema
FROM (
${filas}
) x
LEFT JOIN information_schema.COLUMNS k
       ON k.TABLE_SCHEMA = '${BASE}' AND k.TABLE_NAME = x.t AND k.COLUMN_NAME = x.c
LEFT JOIN information_schema.TABLES i
       ON i.TABLE_SCHEMA = '${BASE}' AND i.TABLE_NAME = x.t
WHERE k.COLUMN_NAME IS NULL
ORDER BY 3, 1, 2;`);
console.error(`[${pares.length} columnas de ${new Set(pares.map(p => p[0])).size} tablas]`);
