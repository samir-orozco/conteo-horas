# Playbook — Proyecto web en Banahosting (cPanel). Arquitectura y despliegue

> **Cómo usar este archivo:** pégalo al **inicio** de cada proyecto nuevo (como
> instrucciones para tu asistente de código y/o como `DEPLOY.md` del repo). Fija la
> arquitectura y el flujo de despliegue desde el día 1, para que subir a producción
> sea **simple y repetible**, sin CI/CD ni configuraciones raras.
>
> Reemplaza `midominio.com`, `app-api`, `app-repo` por los nombres reales de tu proyecto.

---

## 0. Instrucciones para el asistente (léelas y respétalas siempre)

1. **Primero local, después producción.** Nada se sube hasta que funciona y se aprueba en local. Nunca al revés.
2. **Pide permiso antes de tocar producción** (push a ramas de build, comandos en el servidor, SQL en la BD real). Producción atiende usuarios reales.
3. **Cada comando de terminal va en su propio bloque, uno a la vez.** Nunca pegues varios comandos juntos: el usuario los corre uno por uno y revisa el resultado de cada uno antes de seguir.
4. **NO uses:** GitHub Actions, workflows/CI, llaves SSH de despliegue, Docker, subdominio para la API. Si crees que algo de eso hace falta, **pregunta antes** en vez de agregarlo. El build se hace **en la máquina local**, no en el servidor.
5. **Sube al repositorio desde el inicio** (`git init` + primer commit + push a `develop`) — no lo dejes para el final.
6. Confirma antes de cualquier acción **irreversible** (borrar datos, migraciones destructivas).
7. **Valida lo más arriesgado ANTES de construir nada.** Antes de escribir scripts de despliegue, runbooks o infraestructura, corre la prueba más pequeña posible de la pieza que podría no funcionar en el destino (¿la base responde? ¿arranca la app bajo Passenger?). Diez minutos ahí ahorran un día entero de construir sobre una suposición falsa.
8. **Mide los límites del hosting el primer día** (sección 12). En hosting compartido definen lo que es posible; descubrirlos tarde es descubrirlos cuando ya te tumbaron la cuenta.
9. **Dos fallos seguidos en el servidor = PARAR.** No se hace un tercer intento sobre producción: se reproduce el problema en local. Depurar en bucle contra un hosting compartido es lo que convierte un fallo en una caída de todos los sitios de la cuenta.
10. **La cuenta es compartida con otros proyectos en producción.** Antes de ejecutar cualquier cosa, pregúntate qué se lleva por delante si sale mal. Nunca sobrescribas archivos compartidos (`~/.ssh/config`, el `.htaccess` del docroot) sin leer antes lo que hay.
11. **Nada de marcadores de posición.** Si falta un dato (contraseña, dominio, ruta), pídelo y espera; luego entrega el comando completo, listo para pegar. Un hueco editado a mano en la terminal de producción es un error esperando a pasar.
12. **Pregunta antes de lanzar subagentes o workflows.** Explica qué quieres investigar y para qué, y **espera respuesta**. Esto incluye los que se lanzan "en paralelo mientras tanto": son justo los que se cuelan sin permiso. El tiempo y el consumo los paga el usuario.
13. **No dejes nada en el portapapeles.** Todo lo que haya que ejecutar o pegar va escrito en el chat, en un bloque de código. El portapapeles es invisible —no se puede revisar antes de pegarlo en una base de datos de producción— y además borra lo que hubiera.

14. **Confirma en qué cuenta y en qué servidor estás antes de cada bloque de
    trabajo.** La agencia tiene varias cuentas de cPanel y el prompt se parece.
    En el despliegue de TablaPro (2026-08-01) se ejecutaron comandos contra la
    cuenta equivocada y se perdió media hora persiguiendo carpetas que no
    faltaban: estaban en otra máquina.
    ```
    whoami && hostname && ls -d ~/app-repo
    ```

15. **Un bloque multilínea con un comando interactivo dentro se rompe de una
    forma que no parece un error de pegado.** No es solo que se trunque (eso ya
    está en la sección 10): si el bloque incluye un `read`, un `tinker` o
    cualquier prompt, **ese prompt se come la línea siguiente del pegado como si
    fuera tu respuesta**. En TablaPro un `cd` acabó siendo la respuesta a
    "¿nombre de la carpeta?" y el despliegue se canceló solo; después los
    comandos siguientes corrieron desde el directorio equivocado. Refuerza la
    regla 3: **un comando por bloque, siempre**.

16. **Si escribes un script de despliegue, que se verifique a sí mismo y termine
    con código de error si algo no cuadra.** Un script que dice "listo" sin
    comprobar nada es peor que no tenerlo: los archivos estáticos se sirven
    aunque el backend esté muerto, así que el sitio "se ve" y el fallo solo
    aparece cuando entra un cliente. La comprobación mínima es pedir un endpoint
    de la API y exigir el código correcto.

17. **Toda regla de negocio que el usuario deba leer tiene que sobrevivir al
    manejador de errores de producción.** Un `500` con el modo depuración apagado
    **no lleva el mensaje**. Si lanzas una excepción genérica para decir
    "llegaste al límite de tu plan", el cliente lee *"Server Error"* y toda esa
    funcionalidad es invisible justo donde importa. Excepción propia + respuesta
    4xx explícita.

---

## 1. Arquitectura tecnológica (decidida desde el inicio; no improvisar sobre la marcha)

| Capa | Tecnología |
|---|---|
| **Frontend** | React + Vite + TypeScript + Tailwind → compila a **estáticos** (`dist/`), servidos por Apache desde el docroot de cPanel |
| **Backend** | Node.js + **Fastify** + TypeScript + **`mysql2` con SQL directo** (ver sección 6) |
| **Base de datos** | **MySQL/MariaDB** de cPanel (Banahosting sirve MariaDB, aunque la llamen MySQL) |
| **Runtime en prod** | app de cPanel **“Setup Node.js App” (Passenger)**, archivo de arranque **`app.cjs`** (ver sección 13) |
| **Hosting** | Banahosting / cPanel (CloudLinux). **Sin** Docker, **sin** CI/CD, **sin** Kubernetes |

> ### ⛔ Prisma NO se usa en tiempo de ejecución
>
> El motor de Prisma es un binario en Rust que abre hilos según las CPU que ve — y
> en un servidor compartido ve las de la máquina **física**, no las de tu cuenta.
> Contra el límite `NPROC` de CloudLinux revienta con `PANIC: timer has gone away`.
>
> **Comprobado en producción el 24/07/2026:** agotó los procesos de la cuenta
> entera, dejó SSH y la Terminal de cPanel devolviendo
> `bash: fork: Resource temporarily unavailable`, tumbó los demás sitios del
> cliente y hubo que abrir ticket con el hosting para recuperarla.
>
> No es un ajuste que se resista: es incompatible por diseño. **Usa `mysql2` con
> SQL directo** (sección 6). Prisma puede seguir siendo útil **solo como
> herramienta local** para modelar el esquema y generar el SQL de migración.

- **La API va en el MISMO dominio, bajo `/api`** (ej. `midominio.com/api`), montada como la app Node de cPanel. **No** un subdominio aparte.
- Un solo subdominio sirve landing + panel; la app (SPA) maneja sus rutas con React Router.

---

## 2. Estructura del repositorio (un solo repo en GitHub)

Ramas:

| Rama | Qué lleva |
|---|---|
| `develop` | **Código fuente.** Rama de trabajo. |
| `frontend-build` | `frontend/dist/` **ya compilado** (artefacto). |
| `backend-build` | `deploy-backend/` = `dist/` **ya compilado** (salida de `tsc`) **+ `app.cjs`** (el arrancador de Passenger, sección 13). |

- El `dist/` está en `.gitignore` en `develop`; por eso en las ramas de build se agrega con **`git add -f`**.
- Las ramas de build son artefactos: el servidor **no compila**, solo copia lo ya compilado. (Compilar en el CloudLinux del hosting da problemas.)
- **No hay rama `prisma-build`.** Sin ORM con binarios no hay cliente que generar ni motores nativos que copiar — que era, además, la parte más frágil del despliegue.

---

## 3. Layout en el servidor (cPanel)

| Ruta | Qué es |
|---|---|
| `~/app-repo` | Clon git del repo (en `develop`). Solo se usa para **traer** los artefactos. |
| `~/app-api` | La **app Node desplegada**: `dist/`, `.env`, `package.json`, `node_modules` (symlink al nodevenv). **NO es un repo git.** |
| `~/midominio.com/` | **Docroot** del frontend (lo sirve Apache). |

---

## 4. Montaje inicial en cPanel (una sola vez por proyecto)

1. **Subdominio + AutoSSL** (SSL/TLS Status). **HTTPS es obligatorio** (la cámara/GPS del navegador no funcionan sin candado).
2. **MySQL Databases:** crea la BD y un usuario con **ALL PRIVILEGES**. Host = `localhost`. Anota nombre de BD, usuario y clave.
3. **Setup Node.js App:** Node 18+, *Application root* = `app-api`, *Startup file* = **`app.cjs`** (¡no `dist/index.js`! ver sección 13), y monta la URL en `midominio.com/api`.
   > ⚠️ **cPanel CREA ese archivo con su propia plantilla** ("It works! NodeJS…")
   > al guardar. Si ya habías subido el tuyo con ese nombre, lo sobrescribe. Sube
   > el tuyo **después** de crear la aplicación, y reinicia.
4. Define las **variables de entorno** de la app (sección 5).
5. Crea el **`.htaccess`** del docroot para que React Router maneje las rutas (ver sección 8).
6. Clona el repo en `~/app-repo` (en `develop`).

---

## 5. Variables de entorno de la App Node (cPanel → Setup Node.js App → Environment variables)

> Se ponen **en el panel de la app Node**, NO en un `.env` subido a git.

| Variable | Valor en producción |
|---|---|
| `DATABASE_URL` | `mysql://usuario:clave@localhost:3306/nombre_bd` |
| `JWT_SECRET` | secreto largo aleatorio (`openssl rand -hex 32`). El server **no arranca** sin él. |
| `NODE_ENV` | `production` |
| `FRONTEND_ORIGIN` | `https://midominio.com` (restringe CORS y arma links de correo) |
| `PORT` | lo asigna cPanel; el código lo lee de `process.env.PORT`. Léelo con `parseInt(...) \|\| 5000`: si llega vacía, `Number()` da `NaN` y `listen()` falla sin explicar por qué |
| `DB_POOL_LIMIT` | `3` — el pool de conexiones. **Nunca lo dejes al valor por defecto de la librería** (sección 6) |
| *(las que tu app necesite)* | SMTP, pasarela de pago, etc. — nunca en el repo, solo en el panel |

**Variables obligatorias: falla el arranque, no arranques a medias.** Si falta
`DATABASE_URL` o `JWT_SECRET`, el servidor debe imprimir el motivo y salir con
`process.exit(1)`. Arrancar con un `JWT_SECRET` por defecto escrito en el código
significa que cualquiera que lo conozca puede firmarse un token de administrador.

En **desarrollo** cada quien usa su `.env` local (con la BD local); ese `.env` va en `.gitignore`.

---

## 6. Base de datos: `mysql2` con SQL directo

`mysql2` es un cliente **de JavaScript puro**: no trae binarios, no abre hilos, no
detecta plataformas. Toda la familia de problemas que hace inviable a Prisma aquí
simplemente no existe. Una "conexión" es un socket, no un proceso — por eso no
choca con el límite `NPROC`.

Instalación: `npm install mysql2` — y nada más.

### 6.1 La capa de acceso (`src/lib/db.ts`)

```ts
import mysql from 'mysql2/promise'
import type { ResultSetHeader, RowDataPacket } from 'mysql2'

if (!process.env.DATABASE_URL) {
  console.error('Falta DATABASE_URL. Se configura en cPanel → Setup Node.js App.')
  process.exit(1)
}

export const pool = mysql.createPool({
  uri: process.env.DATABASE_URL,
  // En hosting compartido el usuario de MySQL suele tener un tope bajo de
  // conexiones simultáneas (10–25). Con 3 vamos sobrados para el tráfico de
  // un sitio pequeño y no nos acercamos al límite ni en un pico.
  connectionLimit: Number.parseInt(process.env.DB_POOL_LIMIT ?? '', 10) || 3,
  waitForConnections: true,   // encolar en vez de fallar cuando las 3 están ocupadas
  // La cola SÍ lleva tope. Con queueLimit: 0 (ilimitada), una consulta atascada
  // esperando un lock —el timeout por defecto de MariaDB son 50 s— acumula
  // peticiones que nunca vencen: Fastify deja de responder y el runtime de
  // cPanel acaba matando la app. Mejor devolver error rápido que colgarse.
  queueLimit: 20,
  // MariaDB cierra las conexiones ociosas (wait_timeout). Sin keepalive, la
  // primera petición tras un rato de calma recibe un socket muerto y falla con
  // PROTOCOL_CONNECTION_LOST. En un sitio con poco tráfico eso es TODOS los días.
  enableKeepAlive: true,
  keepAliveInitialDelay: 10_000,
  maxIdle: 2,
  idleTimeout: 60_000,
  charset: 'utf8mb4',         // sin esto los acentos y las ñ se corrompen
  timezone: 'Z',              // el driver convierte a UTC al leer y escribir
  connectTimeout: 10_000,
})

/** Varias filas. */
export async function rows<T>(sql: string, params: unknown[] = []): Promise<T[]> {
  const [r] = await pool.execute<RowDataPacket[]>(sql, params)
  return r as T[]
}

/** Una fila o null. */
export async function row<T>(sql: string, params: unknown[] = []): Promise<T | null> {
  return (await rows<T>(sql, params))[0] ?? null
}

/** INSERT / UPDATE / DELETE. Devuelve insertId y affectedRows. */
export async function run(sql: string, params: unknown[] = []): Promise<ResultSetHeader> {
  const [r] = await pool.execute<ResultSetHeader>(sql, params)
  return r
}

/** Transacción: si el callback lanza, se revierte todo. */
export async function tx<T>(fn: (c: mysql.PoolConnection) => Promise<T>): Promise<T> {
  const conn = await pool.getConnection()
  let destruida = false
  try {
    await conn.beginTransaction()
    const salida = await fn(conn)
    await conn.commit()
    return salida
  } catch (e) {
    // Si el rollback TAMBIÉN falla (conexión caída a media transacción), la
    // conexión volvería al pool todavía dentro de la transacción: mysql2 no
    // limpia el estado al liberarla. La siguiente petición que la reciba
    // heredaría ese lío. Por eso ahí se destruye en vez de devolverla — y hay
    // que marcarlo, porque destruir y liberar la misma conexión rompe el pool.
    try {
      await conn.rollback()
    } catch {
      conn.destroy()
      destruida = true
    }
    throw e
  } finally {
    if (!destruida) conn.release()   // sin esto se agota el pool y la API se cuelga
  }
}
```

Con esas cuatro funciones se cubre el 100% de un CRUD normal.

### 6.2 Reglas de uso

**Siempre parámetros, nunca concatenación.** `execute()` usa sentencias
preparadas: el valor viaja aparte del SQL y la inyección deja de ser posible.

```ts
// BIEN
await rows('SELECT * FROM Plan WHERE slug = ?', [slug])
// MAL — inyección SQL
await rows(`SELECT * FROM Plan WHERE slug = '${slug}'`)
```

**`IN (...)` con lista variable:** genera los `?` y pasa el array. **Corta antes si
la lista viene vacía**: `IN ()` no es SQL válido, y con la base recién creada y sin
datos el endpoint responde 500 en vez de `[]`.

```ts
if (!ids.length) return []          // ← sin esto, error de sintaxis SQL
const marcas = ids.map(() => '?').join(',')
await rows(`SELECT * FROM PlanTranslation WHERE planId IN (${marcas})`, ids)
```

**Valida los ids numéricos antes de consultar.** `Number('abc')` da `NaN`, y `NaN`
llega a la consulta como el identificador `NaN` → error 1054 «Unknown column» y un
500, cuando lo correcto sería un 404:

```ts
const id = Number(req.params.id)
if (!Number.isInteger(id) || id < 1) return reply.code(404).send({ error: 'not_found' })
```

**`LIMIT` y `OFFSET` no admiten `?` de forma fiable.** Valida como entero e
interpola:

```ts
const limite = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100)
await rows(`SELECT * FROM Registration ORDER BY createdAt DESC LIMIT ${limite}`)
```

### 6.3 Las relaciones (lo que hacía el `include` de Prisma)

Dos consultas y un agrupado en JavaScript. Es más rápido que un `JOIN` cuando la
entidad padre tiene muchas columnas, porque no repite sus datos en cada fila hija:

```ts
// Antes:  prisma.plan.findMany({ include: { translations: true } })
const planes = await rows<PlanRow>('SELECT * FROM Plan WHERE active = 1 ORDER BY sortOrder')
if (!planes.length) return []

const ids = planes.map((p) => p.id)
const marcas = ids.map(() => '?').join(',')
const trads = await rows<TranslationRow>(
  `SELECT * FROM PlanTranslation WHERE planId IN (${marcas})`, ids,
)

const porPlan = new Map<number, TranslationRow[]>()
for (const t of trads) {
  const lista = porPlan.get(t.planId) ?? []
  lista.push(t)
  porPlan.set(t.planId, lista)
}

return planes.map((p) => ({ ...p, translations: porPlan.get(p.id) ?? [] }))
```

### 6.4 El `upsert`, que aquí sale más corto que con Prisma

MariaDB lo resuelve en **una sola sentencia**, sin leer antes para decidir:

```ts
await run(
  `INSERT INTO PlanTranslation (planId, locale, title, summary)
   VALUES (?, ?, ?, ?)
   ON DUPLICATE KEY UPDATE title = VALUES(title), summary = VALUES(summary)`,
  [planId, locale, title, summary],
)
```

Requiere un índice único sobre las columnas que identifican la fila
(`UNIQUE KEY (planId, locale)`), que es lo mismo que ya exige Prisma.

### 6.5 Conversiones que hay que hacer a mano

Sin ORM, MySQL devuelve algunos tipos en crudo. Son tres casos y se resuelven una
vez:

| Columna | Lo que llega | Conversión |
|---|---|---|
| `BOOLEAN` / `TINYINT(1)` | `0` o `1` | `Boolean(fila.active)` |
| `JSON` o `TEXT` con JSON | `string` | `JSON.parse(fila.prices)` |
| `DATETIME` | `Date` | nada, si el pool va con `timezone: 'Z'` |
| `DECIMAL` | `string` | `Number(fila.precio)` |

Conviene una función `mapPlan(fila)` por tabla que haga estas conversiones y
devuelva el objeto con la forma exacta que espera el frontend. **Ese es el punto
donde se garantiza que el JSON de la API no cambia** al migrar desde Prisma.

> ### ⚠️ Las dos trampas que pasan TODAS las pruebas locales y revientan en producción
>
> **1. Las columnas JSON.** En MariaDB, `JSON` es un alias de `LONGTEXT` y el
> driver devuelve **texto crudo**; el MySQL de tu Mac te lo entrega ya convertido
> en objeto. Es decir: en local funciona, en Banahosting la API responde
> `"prices": "[{...}]"` entre comillas y el frontend revienta al hacer `.map()`.
> **Parsea siempre de forma explícita**, y tolera que ya venga parseado:
> ```ts
> const json = (v: unknown) => (typeof v === 'string' ? JSON.parse(v) : v)
> ```
>
> **2. Las fechas por defecto del esquema.** `DEFAULT CURRENT_TIMESTAMP` **no
> escribe UTC**: escribe la hora de la sesión de MariaDB, que en un servidor sin
> configurar es la del sistema. Un ORM manda la fecha ya en UTC desde el cliente,
> así que al migrar a SQL directo los registros nuevos se desplazan varias horas
> respecto a los viejos, sin ningún error. **Manda tú la fecha desde Node**
> (`new Date()` con `timezone: 'Z'` en el pool) en vez de dejársela al `DEFAULT`,
> o fija `SET time_zone = '+00:00'` al abrir cada conexión.

### 6.6 Los tipos

Se declaran a mano a partir del esquema, una vez:

```ts
export type PlanRow = {
  id: number
  slug: string
  priceFrom: number
  prices: string        // JSON sin parsear
  active: 0 | 1         // TINYINT
  createdAt: Date
}
```

Son unas 60 líneas para 7 tablas, y no se regeneran en cada despliegue.

### 6.7 Cambios de esquema (regla de oro, no cambia)

Igual que antes: **el SQL se escribe y se prueba en local, y se aplica en
phpMyAdmin**. Nunca se corren migraciones en el servidor.

Puedes seguir usando Prisma **como herramienta de escritorio** para modelar y
generar el `ALTER`, aunque no esté en la aplicación:

```
npx prisma migrate diff --from-schema-datamodel viejo.prisma --to-schema-datamodel schema.prisma --script
```

O escribir el `ALTER TABLE` a mano, que para un proyecto pequeño suele ser más
rápido. En ambos casos el archivo `.sql` se versiona en el repo, en `sql/`.

---

## 7. Flujo de actualización (compilar en local → subir → desplegar)

### A. En tu máquina

1. Trabajas en `develop`, pruebas en **local** hasta que quede aprobado.
2. Commit + push del **fuente**:
   ```
   git add -A && git commit -m "..."
   ```
   ```
   git push origin develop
   ```
3. **Compila el backend:**
   ```
   cd backend && npm run build
   ```
4. **Compila el frontend** (¡ojo con la trampa del `.env.local`, sección 9!):
   ```
   cd frontend && mv .env.local .env.local.bak && npm run build ; mv .env.local.bak .env.local
   ```
   Verifica que el bundle horneó la URL de prod y **no** `localhost`:
   ```
   grep -rho "https\?://[a-zA-Z0-9.-]*/api" frontend/dist/assets/*.js | sort -u
   ```
5. **Arma las ramas de build** (con `git worktree` para no ensuciar `develop`): copia `frontend/dist` → rama `frontend-build`, y `backend/dist` + `backend/app.cjs` → `deploy-backend/` en rama `backend-build`. En cada una: `git add -f -A <ruta>`, commit, push.
   > Hazlo en un **worktree temporal**, no con `git checkout` en tu carpeta de trabajo: al volver a `develop` los artefactos quedan sin seguimiento y git se niega a cambiar de rama.
6. Si cambió el esquema: genera el SQL (sección 6) para pegarlo en phpMyAdmin.

### B. En el servidor (SSH o Terminal de cPanel) — **un comando por bloque**

> Orden seguro: **SQL primero** (si hay) → backend → frontend → reiniciar.

**(Solo si cambió el esquema) 0.** Pega el SQL en **phpMyAdmin → pestaña SQL**.

**1. Backend** (trae `dist/` y `app.cjs` de una vez):
```
cd ~/app-repo && git fetch origin backend-build && git checkout origin/backend-build -- deploy-backend
```
```
cp -r ~/app-repo/deploy-backend/. ~/app-api/
```

**2. Frontend:**
```
cd ~/app-repo && git fetch origin frontend-build && git checkout origin/frontend-build -- frontend/dist
```
```
cp -r ~/app-repo/frontend/dist/. ~/midominio.com/
```
> No borres `.htaccess`, `models/` ni `api/` del docroot. Y ojo: el `.htaccess`
> **no debe viajar dentro de `frontend/dist`** — ver sección 8.

**3. Reiniciar la app Node** (Passenger):
```
touch ~/app-api/tmp/restart.txt
```

**4. Verificar:**
```
curl -s https://midominio.com/api/health; echo
```
Debe responder `{"ok":true,"db":true}` — el chequeo tiene que tocar la base de
datos, no solo confirmar que Node está vivo (sección 10). Luego revisa la app en
el navegador con recarga dura (Cmd/Ctrl+Shift+R).

---

## 8. `.htaccess` del docroot (React Router)

> ### ⚠️ Este archivo NO se despliega. Nunca.
>
> **Mira primero si ya existe** (File Manager → *Show Hidden Files*), porque hay
> dos escenarios y el procedimiento cambia:
>
> - **Con Apache/Passenger:** cPanel escribió ahí el bloque
>   `# BEGIN CLOUDLINUX PASSENGER CONFIGURATION` al crear la app de Node, y **es
>   lo único que enruta `/api`**. Hay que **pegar las reglas debajo, sin tocarlo**.
> - **Con LiteSpeed (`lsnode`):** el document root llega **vacío**, sin
>   `.htaccess`. El enrutado de `/api` lo hace la configuración del dominio, no
>   este archivo. Se sube el archivo entero tal cual, sin nada que preservar.
>
> En ambos casos el `.htaccess` **no debe estar en `frontend/public/`** (Vite lo
> copiaría a `dist/` y viajaría con cada despliegue, borrando lo que hubiera).
> Guárdalo en `deploy/docroot/.htaccess` del repo y súbelo **a mano una vez**.

Contenido a añadir en `~/midominio.com/.htaccess`, **después** del bloque de cPanel:

```apache
Options -Indexes

<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /

  # archivos y carpetas que existen de verdad, tal cual
  RewriteCond %{REQUEST_FILENAME} -f [OR]
  RewriteCond %{REQUEST_FILENAME} -d
  RewriteRule ^ - [L]

  # /api lo atiende Passenger. La frontera (/|$) evita capturar rutas del
  # sitio que empiecen igual, como /apicultura.
  RewriteCond %{REQUEST_URI} ^/api(/|$)
  RewriteRule ^ - [L]

  # todo lo demás lo resuelve React Router
  RewriteRule ^ index.html [L]
</IfModule>
```

**Si hay un panel en una subcarpeta** (por ejemplo `/admin` como segunda SPA), su
fallback hay que resolverlo **aquí**, no en el `.htaccess` de la subcarpeta:

```apache
  RewriteCond %{REQUEST_URI} ^/admin(/|$)
  RewriteRule ^ /admin/index.html [L]
```

Con `AllowOverride All`, un `[L]` en el `.htaccess` de arriba **corta toda la
reescritura** antes de que se lleguen a evaluar las reglas de la subcarpeta.
Comprobado con un Apache real: sin esta regla, `/admin/loquesea` da 404.

---

## 9. Trampa del `.env.local` (frontend) — MUY importante

- Vite hornea `VITE_API_URL` **en tiempo de build**. Existe un `frontend/.env.local` (gitignored) con la URL local (`http://localhost:3001/api`), y **Vite lo prioriza sobre `.env` incluso al compilar**.
- Por eso, **antes de `npm run build` hay que apartarlo** para que gane `.env` con la URL de producción:
  ```
  mv .env.local .env.local.bak ; npm run build ; mv .env.local.bak .env.local
  ```
- **Siempre verifica** que el bundle NO contenga `localhost` (paso 4.4). Si lo tiene, producción apunta a tu máquina y se rompe.

---

## 10. Gotchas conocidos

- **API bajo `/api` en Passenger:** no está garantizado si Passenger entrega la URL con el prefijo o sin él. No lo adivines: pon un `rewriteUrl` en Fastify que **normalice los dos casos** y funcionará en cualquiera.
  ```ts
  const app = Fastify({
    rewriteUrl(req) {
      const url = req.url ?? '/'
      if (url === '/api') return '/'
      return url.startsWith('/api/') ? url.slice(4) : url
    },
  })
  ```
  Ojo: esto vale también para los estáticos servidos por la API (`/api/uploads/x.webp`).
- **`@fastify/cors` solo permite GET, HEAD y POST por defecto.** Sin declarar `methods` explícitamente, el navegador bloquea PUT, PATCH y DELETE — y el síntoma engaña, porque parece un error de validación del formulario y no de CORS.
- **El chequeo de salud tiene que tocar la base de datos.** Un `/health` que devuelve `{ok:true}` porque Node está vivo miente justo cuando más falta hace: la app arranca perfecta y falla en cada consulta.
- **`git checkout origin/<rama> -- ruta`** trae solo esa carpeta a tu working tree sin cambiar de rama: ideal para copiar el artefacto y luego `cp`.
- **`cp -r origen/. destino/` falla si `destino` no existe.** Pon un `mkdir -p` antes.
- **Nunca `git push` de ramas de build sin haber probado en local.**
- **`.env` nunca al repo.** Secrets solo en el panel de cPanel (app Node) y en `.env` local (gitignored). Tampoco escribas la contraseña real en el `DEPLOY.md`: queda en cada clon y en el historial de git para siempre.
- **Contraseñas de MySQL con caracteres especiales** (`@ : / # ?`) rompen la `DATABASE_URL` con un error que **no menciona la contraseña**. Genera contraseñas alfanuméricas y te ahorras la tarde.
- **`~/app-api/node_modules` es un enlace** al `nodevenv` de cPanel. Lo que copies ahí en realidad aterriza en `~/nodevenv/app-api/<version>/lib/node_modules`.
- **No sobrescribas `~/.ssh/config`.** Ese archivo es compartido por todos los proyectos de la cuenta. Usa `cat >>` para añadir, nunca `>` para reemplazar, y léelo antes.
- **Dependencias en `dependencies`, no en `devDependencies`.** En el servidor se instala con `npm install --omit=dev`: cualquier cosa que la app necesite en runtime y esté en `devDependencies` provoca un fallo de arranque críptico.
- **`lsnode` en los logs = LiteSpeed, no Apache.** Cambia dos cosas: el document
  root llega sin `.htaccess` (sección 8) y los procesos de las apps Node aparecen
  como `lsnode:/home/usuario/app/`. El puente `app.cjs` hace falta igual.
- **Un 301 en `/api` no es un error:** es la redirección a `/api/` con barra
  final. `curl` sin `-L` no la sigue y te enseña la página del salto. Usa
  `curl -sL` antes de diagnosticar nada.
- **Los pegados largos en la terminal web se truncan.** Un archivo que debería
  pesar 780 bytes apareció con 323. Para cualquier contenido de más de unas
  líneas, usa el editor de **File Manager** o `Upload`, no el pegado.
- **Las librerías con binarios nativos van cargadas en diferido.** Si `sharp` (o similar) se importa en el arranque y su binario no carga, cae **toda** la API. Con un `await import('sharp')` dentro del manejador, solo se rompe esa función.
- **Si alguna vez instalas dependencias en el servidor, `NODE_ENV=development` NO
  basta para traer las `devDependencies`.** La app de Node de cPanel deja
  `omit=dev` en la **configuración de npm**, y la configuración gana sobre la
  variable de entorno: se instalan ~72 paquetes en vez de los que hacen falta y
  el error es `could not determine executable to run`, que no menciona
  devDependencies por ningún lado. Usa el flag explícito: `npm ci --include=dev`.
  (Comprobado dos veces en TablaPro, 2026-08-01.)
- **Una migración que solo añade la columna deja el sistema roto en la
  práctica.** Una columna nueva en NULL para todas las filas existentes es
  correcta técnicamente y rompe el sistema el día que algo la lea: una marca de
  verificación en NULL bloquea a todos los usuarios actuales; un `plan_id` en
  NULL deja a todos los clientes sin precio. **El SQL debe traer su migración de
  datos**: crear el valor por defecto y asignarlo a lo que ya existe.
- **El orden de las rutas con comodines.** Una ruta literal declarada DESPUÉS de
  una con comodín en la misma posición nunca se alcanza: gana la primera que
  casa. `GET /pagos/{referencia}` se traga `GET /pagos/resumen`. Declara las
  literales primero, y ponle una prueba: es un fallo que solo aparece en el
  endpoint que menos se usa.
- **Un caché de build puede perder cosas en silencio.** Cuenta antes y después.
  En TablaPro, la caché de rutas de Laravel dejaba **9 de 41** por un
  `include_once` en los archivos de rutas: la app arrancaba sin un solo error y
  devolvía 404 en todo menos el login. El equivalente en cualquier stack: si un
  paso de compilación o cacheado puede reducir el número de cosas registradas,
  compruébalo, no lo supongas.

---

## 11. Checklist rápido de cada despliegue

- [ ] Probado y aprobado en **local**.
- [ ] `develop` commiteado y pusheado.
- [ ] Backend compilado (`tsc`).
- [ ] Frontend compilado **con `.env.local` apartado**; verificado sin `localhost`.
- [ ] Ramas `frontend-build` / `backend-build` actualizadas y pusheadas.
- [ ] (Si esquema) SQL aplicado en phpMyAdmin **antes** de reiniciar.
- [ ] En el servidor: fetch + checkout + cp de cada artefacto (un comando por bloque).
- [ ] `touch tmp/restart.txt`.
- [ ] `curl /api/health` → `{"ok":true,"db":true}`, y prueba en el navegador.

---

## 11.b Marcha atrás (y la única que existe de verdad)

Con ramas de artefactos, volver atrás es volver al commit anterior de la rama de
build y repetir el `checkout` + `cp` + `restart`:

```
cd ~/app-repo && git fetch origin backend-build && git checkout <commit-anterior> -- deploy-backend
```

**Pero las migraciones no se deshacen con eso.** Si el despliegue malo traía un
`ALTER TABLE` destructivo, ningún `git checkout` lo revierte. Por eso:

> **Antes de cualquier SQL que borre o transforme datos, exporta la base desde
> cPanel → Backup → Download a MySQL Database Backup.** Es un clic y es la única
> marcha atrás real que existe. Aplicar el SQL en phpMyAdmin sin haberlo hecho es
> apostar a que salga bien.

Y configura las **copias automáticas de cPanel antes del primer cliente real**:
desde ese momento la base contiene datos que el cliente no puede reconstruir.

---

## 12. Límites del hosting compartido — **mídelos el primer día**

CloudLinux limita cada cuenta con LVE. Estos límites, no la RAM ni el disco, son
lo que decide qué arquitecturas son viables. Mídelos **antes** de elegir el stack:

```
nproc
```
```
ps -u USUARIO --no-headers | wc -l
```

- **`nproc` es el número peligroso.** Son las CPU de la máquina **física**, no las
  tuyas, y es lo que leen las librerías para dimensionar sus pools de hilos y de
  conexiones. En Banahosting devuelve **64 u 88** según la máquina. Cualquier cosa
  que abra recursos "según las CPU disponibles" va a pedir decenas de hilos y más
  de cien conexiones, cuando tu cuenta entera vive con unos pocos procesos.
- **`ps ... | wc -l` es tu consumo real.** En una cuenta con tres backends Node
  encendidos y sin tráfico: **9 procesos**. Ese es el orden de magnitud normal, y
  contra él se compara cualquier cosa que quieras añadir.

> **⚠️ `ulimit -u` NO sirve aquí: devuelve `unlimited`.** LVE no aplica el límite
> por la vía de `ulimit`, sino desde el kernel, así que el techo real es invisible
> desde la shell. Lo descubres sólo cuando ya lo cruzaste, y entonces se manifiesta
> como `bash: fork: Resource temporarily unavailable` — sin ningún aviso previo y
> sin poder entrar a arreglarlo. **No confíes en `ulimit` para creer que tienes
> margen.**

Para el histórico y para ver en qué límite estás fallando: **cPanel → Resource
Usage** (busca `NPROC` y `EP`). Y no cuentes con que el soporte te dé el número
exacto ni con que suba el límite: en servidor compartido no lo hacen.

Hay un script que hace toda esta comprobación de golpe y **sólo lee**, así que se
puede pegar sin miedo en una cuenta con sitios en producción:
`scripts/revisar-hosting.sh` del repositorio de Casa Cabieles.

Valores reales medidos en dos servidores distintos de Banahosting:

| | `single-5928` | `single-2020` |
|---|---|---|
| `nproc` | 64 | **88** |
| `ulimit -u` | unlimited (miente) | unlimited (miente) |
| procesos en reposo | 9 (con 3 apps Node) | 1 (cuenta nueva) |

**La regla que sale de aquí:** en hosting compartido, tecnología aburrida. Nada de
binarios nativos, nada de runtimes que se dimensionen solos a partir de `nproc`,
nada de pools con valores por defecto. Todo explícito y pequeño.

---

## 13. Passenger y los módulos ES — el puente `app.cjs`

Passenger carga el archivo de arranque con **`require()`**. Si tu `package.json`
tiene `"type": "module"` (o compilas a ESM), `require()` lo rechaza con
`ERR_REQUIRE_ESM` y **la app no arranca nunca**. El navegador solo muestra un 503
sin explicación.

Tampoco se arregla subiendo la versión de Node: aunque Node ≥22.12 admite
`require(esm)`, si tu `dist/index.js` tiene `await` en el nivel superior falla
igual, ahora con `ERR_REQUIRE_ASYNC_MODULE`.

**Solución, dos partes:**

**1.** Arranca la app dentro de una función `async`, sin `await` de nivel superior:

```ts
async function start() {
  await app.register(cors, { /* ... */ })
  await app.listen({ port, host: '127.0.0.1' })
}

start().catch((err) => {
  console.error('La API no pudo arrancar:', err)
  process.exit(1)
})
```

**2.** Crea `app.cjs` en la raíz de la app (la extensión `.cjs` es **obligatoria**:
con `"type": "module"`, un `app.js` se leería como ESM y volveríamos al problema):

```js
'use strict'
const fs = require('node:fs')
const path = require('node:path')

// Passenger solo muestra un 503 genérico si algo falla al arrancar.
// Copiamos stderr a un archivo para poder diagnosticarlo.
try {
  fs.mkdirSync(path.join(__dirname, 'logs'), { recursive: true })
  const fd = fs.openSync(path.join(__dirname, 'logs', 'arranque.log'), 'a')
  const original = process.stderr.write.bind(process.stderr)
  process.stderr.write = (txt, ...resto) => {
    try { fs.writeSync(fd, String(txt)) } catch {}
    return original(txt, ...resto)
  }
} catch {}

// import() dinámico: la única forma de cargar ESM desde CommonJS
import('./dist/index.js').catch((err) => {
  process.stderr.write(`La API no pudo cargarse:\n${err.stack ?? err}\n`)
  process.exit(1)
})
```

En cPanel, *Application startup file* = **`app.cjs`**.

Ese `logs/arranque.log` es lo primero que hay que mirar cuando la API no responde.

---

## 14. Procedimiento de emergencia: la cuenta se quedó sin procesos

Síntoma: cualquier comando por SSH **o por la Terminal de cPanel** devuelve
`bash: fork: retry: Resource temporarily unavailable`. La cuenta está en su tope
de procesos y **no puedes entrar a arreglarlo**, porque abrir una shell también
requiere un proceso.

**Deja de intentarlo por terminal: cada intento consume los pocos que se liberan.**

En orden:

1. **cPanel → File Manager → docroot → renombra `.htaccess` a `.htaccess-apagado`.**
   Es pura escritura en disco, no lanza procesos tuyos, y al quitar el bloque de
   Passenger, Apache deja de intentar arrancar la app en cada petición. **Esto
   corta el bucle en la raíz.**
2. **cPanel → Setup Node.js App → `STOP APP`.** Puede fallar (algunas de sus
   operaciones sí lanzan procesos como tu usuario); si el paso 1 ya está hecho, no
   insistas.
3. **cPanel → Resource Usage** para ver si la cuenta se está recuperando.
4. **Abre ticket con el hosting en paralelo**, sin esperar. Pídeles que maten los
   procesos huérfanos y reinicien los límites LVE, y aprovecha para preguntar los
   valores de `NPROC` y `EP` de tu plan.
5. Cuando vuelva la terminal, **mira antes de matar**:
   ```
   ps -u USUARIO -o pid,ppid,etime,rss,cmd --sort=-etime | head -40
   ```
   y mata solo lo tuyo, por patrón:
   ```
   pkill -u USUARIO -f nombre-de-tu-app
   ```
   **Nunca `pkill node` a secas:** te llevas por delante los otros proyectos de la
   cuenta.

**Cómo no llegar aquí:** regla 9 de la sección 0 — dos fallos seguidos en el
servidor y se para. El incidente del 24/07/2026 fue exactamente esto: una prueba
que fallaba, repetida cinco veces contra producción, con Passenger reintentando
por su cuenta en medio.
