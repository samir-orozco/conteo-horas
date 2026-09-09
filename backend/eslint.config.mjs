// Linter del backend. Era el hueco más grande de la deuda que anotaba la sección
// 6 del CLAUDE.md: el frontend tenía ESLint desde el principio y el backend, que
// es el que calcula el dinero, no tenía ninguno.
//
// La configuración es DELIBERADAMENTE la misma que la del frontend
// (`frontend/eslint.config.js`), con dos diferencias que vienen del entorno y no
// del gusto: aquí los globales son los de Node y no los del navegador, y no hay
// plugins de React.
//
// El archivo es .mjs y no .js a propósito: el backend NO tiene `"type": "module"`
// en su package.json, así que un .js se carga como CommonJS y la config revienta
// con "Cannot use import statement outside a module". Poner el `type` para
// arreglarlo rompería el backend entero, que es CommonJS.
//
// Se ignora `dist` (compilado) y `prisma/` (scripts de diagnóstico de un solo
// uso, que se corren a mano contra la base y no forman parte de la aplicación).
import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import { defineConfig, globalIgnores } from 'eslint/config';

export default defineConfig([
  globalIgnores(['dist', 'prisma', 'node_modules']),
  {
    files: ['**/*.ts'],
    extends: [js.configs.recommended, tseslint.configs.recommended],
    languageOptions: {
      globals: globals.node,
    },
    rules: {
      // `const { empresaId: _ignorar, horario: _rel, ...rest } = body` es el
      // patrón con el que las rutas descartan campos que no se deben escribir.
      // Es deliberado y hay que reconocerlo, no rodearlo.
      '@typescript-eslint/no-unused-vars': ['error', {
        varsIgnorePattern: '^_',
        argsIgnorePattern: '^_',
        ignoreRestSiblings: true,
        // Los manejadores de Fastify llevan la firma `(request, reply)` la use
        // o no. Marcar un `reply` sin usar no encuentra defectos, solo obliga a
        // renombrar parámetros. El valor de esta regla en este proyecto está en
        // las VARIABLES y los IMPORTS muertos, que sí se quedan en error: uno
        // de ellos apareció al montar esto (un import de `fastify.d.ts` que
        // otra declaración tapaba, comprobado quitándolo y viendo `tsc` limpio).
        args: 'none',
      }],

      // 185 apariciones el día que se montó el linter, casi todas
      // `request.body as any` en las rutas. Queda en AVISO y no en error, con
      // una razón concreta: un linter que sale rojo desde el primer día es un
      // linter que todo el mundo aprende a ignorar, y entonces no sirve de
      // puerta para el código nuevo, que es para lo que se monta.
      //
      // Lo que impide que la deuda crezca es el `--max-warnings` del script
      // `lint` en el package.json: el número está congelado, así que un `any`
      // nuevo pone el linter en rojo aunque la regla sea un aviso. Para bajarlo,
      // se quitan `any`, se cuenta otra vez y se baja el número. Nunca al revés.
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
]);
