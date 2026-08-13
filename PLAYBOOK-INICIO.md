# Playbook — Inicio de proyecto nuevo en Banahosting (cPanel)

> **Cómo usar este archivo:** pégalo **antes que cualquier otro playbook**, en la
> primera conversación de cualquier proyecto nuevo, sin importar qué stack sea.
> Su único trabajo es **hacer las preguntas correctas antes de escribir una línea
> de código**, y decirte qué otro archivo pegar después con el plan completo.
>
> No repite el contenido de los playbooks específicos — solo decide cuál de
> ellos aplica (o qué combinación armar si no existe todavía uno para tu
> combinación exacta).

---

## 0. Instrucciones para el asistente

1. **No escribas código ni toques el repo todavía.** Haz las preguntas de la
   sección 1 primero, una por una o todas juntas si el usuario prefiere
   responderlas de un tiro, y **espera las respuestas antes de proponer nada**.
2. Si el usuario no sabe responder alguna (p. ej. no sabe si el hosting es
   Passenger o LiteSpeed porque todavía no lo ha montado), no lo adivines: dale
   el procedimiento de verificación exacto (sección 2) y sigue cuando la tenga.
3. Con las respuestas, ve a la sección 3 y dile al usuario **qué playbook pegar
   a continuación** (o qué combinar, si su caso no calza 100% con ninguno de los
   existentes).
4. Si terminas resolviendo una combinación nueva (p. ej. Prisma + Passenger, o
   mysql2 + LiteSpeed) que no tiene playbook propio todavía, avísale al usuario
   al final: es candidato a convertirse en un tercer archivo de esta familia.

---

## 1. Preguntas de arquitectura (respóndelas antes de montar nada)

### 1.1 ¿Cómo va a acceder el backend a la base de datos?

| Opción | Cuándo tiene sentido | Qué te lleva |
|---|---|---|
| **Prisma** (ORM) | Priorizas velocidad de desarrollo, migraciones (`migrate`), tipos generados | Tiene un riesgo **comprobado** en Banahosting: su motor nativo (Rust) dimensiona hilos y conexiones según las CPU físicas del servidor (64-88 en Banahosting), no las de tu cuenta — el 24/07/2026 esto tumbó una cuenta entera. Se mitiga (no se elimina) con 4 variables obligatorias. |
| **mysql2 con SQL directo** | Priorizas que el riesgo anterior **no exista**, y no te importa escribir el acceso a datos a mano (son ~60 líneas de tipos + 4 funciones genéricas para un CRUD normal) | Cero binarios nativos, cero riesgo de `NPROC`. Es la opción recomendada por defecto si el proyecto es nuevo y no tienes una razón concreta para Prisma. |

**No mezcles las dos en el mismo proyecto.**

### 1.2 ¿Cuál es el runtime del hosting: Apache+Passenger o LiteSpeed?

Esto **no se elige, se verifica** — depende de qué tenga la cuenta de Banahosting
ya montada (o de qué plan compraste). Procedimiento en la sección 2. Cambia:
- Si el `.htaccess` del docroot ya tiene un bloque de Passenger que hay que
  respetar (Apache) o si llega completamente vacío (LiteSpeed).
- Si necesitas el puente `app.cjs` para cargar un backend ESM (Passenger) — con
  LiteSpeed también hace falta si compilas a ESM, así que esto en realidad
  depende más de la pregunta 1.3 que de esta.

### 1.3 ¿El backend compilado es CommonJS o ESM?

| Opción | Consecuencia |
|---|---|
| **CommonJS** (`"type": "commonjs"` en `package.json`, o no declarar `"type"` — es el default con `tsc` normal) | El servidor carga `dist/index.js` directo con `require()`. Sin complicaciones, en Passenger o LiteSpeed. **Recomendado si no tienes una razón para lo otro.** |
| **ESM** (`"type": "module"`) | `require()` lo rechaza (`ERR_REQUIRE_ESM`). Necesitas el puente `app.cjs` que carga el `dist/index.js` con `import()` dinámico — y tu código no puede tener `await` de nivel superior (o falla con `ERR_REQUIRE_ASYNC_MODULE`). Elígelo solo si ya tienes una dependencia que fuerza ESM. |

### 1.4 ¿Qué framework de frontend?

No cambia el **patrón** de despliegue (siempre: compilar local → subir el
artefacto ya compilado a una rama de build → el servidor solo copia), pero sí
el comando exacto y la carpeta de salida:

| Framework | Comando de build | Carpeta de salida típica |
|---|---|---|
| React/Vue + Vite | `npm run build` (`vite build`) | `dist/` |
| Quasar | `npm run build` (`quasar build`) | `dist/spa/` |
| Angular | `ng build` | `dist/<nombre-app>/` |
| *(otro)* | pregúntale al usuario | — |

Sin importar cuál sea: **nunca lo compiles en el servidor.** Un build de
webpack/terser es de lo más pesado que existe en Node, y en cuentas compartidas
puede agotar los mismos límites que Prisma (`PLAYBOOK-BANAHOSTING.md` sección 12
tiene los números reales de esos límites — contra eso compite un build pesado).

### 1.5 ¿Dominio propio o subdominio? ¿Ya existe la cuenta de cPanel o se monta desde cero?

- Si es dominio nuevo: sección 4 del playbook que aplique (montaje inicial) tal
  cual.
- Si es un subdominio de una cuenta que ya tiene otros proyectos corriendo: lee
  primero `PLAYBOOK-BANAHOSTING.md` sección 12 (límites del hosting compartido
  — ambos playbooks remiten a esa misma sección, no está duplicada en el de
  Prisma) — la cuenta es compartida, y lo que midas ahí ya está descontando lo
  que usan los otros sitios.
- **La API siempre en el mismo dominio, bajo `/api`.** No es una pregunta: es
  la regla en ambos playbooks, no la reabras por proyecto.

---

## 2. Cómo verificar el runtime real del hosting (para la pregunta 1.2)

1. Si ya existe una app Node en la cuenta (de otro proyecto o de un intento
   anterior), pide ver sus logs. Si aparece `lsnode:/home/usuario/...` es
   **LiteSpeed**. Si no hay ese patrón, probablemente es Passenger.
2. Mira el `.htaccess` del docroot (con **Terminal**, no con el editor de File
   Manager — no es confiable para archivos con contenido largo): si tiene un
   bloque `# BEGIN CLOUDLINUX PASSENGER CONFIGURATION`, es Passenger. Si el
   docroot llega vacío sin `.htaccess` alguno, es LiteSpeed.
3. Si no hay nada montado todavía (cuenta nueva), créalo con **Setup Node.js
   App** y mira qué generó cPanel — el resultado te dice cuál es, no hace falta
   adivinar antes.

---

## 3. Qué playbook pegar después, según las respuestas

| 1.1 (BD) | 1.2/1.3 (runtime) | Pega a continuación |
|---|---|---|
| mysql2 | Passenger (con o sin ESM) | `PLAYBOOK-BANAHOSTING.md` tal cual |
| Prisma | LiteSpeed + CommonJS | `PLAYBOOK-BANAHOSTING-PRISMA.md` tal cual |
| mysql2 | LiteSpeed | `PLAYBOOK-BANAHOSTING.md`, pero reemplaza su sección 8 (`.htaccess`) por la sección 7 de `PLAYBOOK-BANAHOSTING-PRISMA.md` (la variante LiteSpeed) — el resto (mysql2, capa de acceso a datos) no cambia. |
| Prisma | Passenger (o ESM) | `PLAYBOOK-BANAHOSTING-PRISMA.md`, pero agrega el puente `app.cjs` de la sección 13 de `PLAYBOOK-BANAHOSTING.md` — el resto (Prisma, mitigaciones de NPROC) no cambia. |

Las dos combinaciones de la mitad de la tabla no tienen playbook propio todavía
porque no se han dado en un proyecto real — si te toca una, avísale al
asistente para que, al cerrar el proyecto, valga la pena escribir el tercer
archivo completo en vez de ir combinando a mano cada vez.

---

## 4. Lo que NO cambia sin importar las respuestas (ya validado en más de un proyecto real)

- El build se hace **en tu máquina**, nunca en el servidor.
- El repo tiene una rama de código fuente (`develop`) y una o más ramas de
  **artefactos ya compilados** (`frontend-build`, `backend-build`, y
  `prisma-build` solo si usas Prisma) — el servidor nunca compila, solo copia.
- Un worktree temporal de git para armar cada rama de build, nunca un
  `git checkout` directo en tu carpeta de trabajo.
- `touch tmp/restart.txt` reinicia la app Node en cPanel, sea Passenger o
  LiteSpeed.
- Un comando de terminal por bloque en el servidor, nunca varios pegados —
  para que el usuario revise cada resultado antes del siguiente paso.
- Mide los límites de la cuenta (`nproc`, procesos en reposo) **el primer
  día**, no cuando algo ya falló.
