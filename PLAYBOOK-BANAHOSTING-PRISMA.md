# Playbook — Proyecto web en Banahosting (cPanel) con Prisma + LiteSpeed

> **Cómo usar este archivo:** pégalo al **inicio** de cada proyecto nuevo que use
> Prisma (en vez de SQL directo) y corra sobre LiteSpeed (`lsnode` en los logs, no
> Apache/Passenger). Es la variante de `PLAYBOOK-BANAHOSTING.md`, verificada con el
> despliegue real de HoraPro. Fija la arquitectura y el flujo desde el día 1.
>
> Reemplaza `midominio.com`, `app-api`, `app-repo` por los nombres reales del proyecto.
>
> **Antes de decidir Prisma:** lee la sección 1 completa. No es la opción por
> defecto — es la opción con una condición de riesgo conocida que hay que aceptar
> a propósito.

---

## 0. Instrucciones para el asistente (léelas y respétalas siempre)

1. **Primero local, después producción.** Nada se sube hasta que funciona y se aprueba en local.
2. **Pide permiso antes de tocar producción** (push a ramas de build, comandos en el servidor, SQL/migraciones en la BD real).
3. **Cada comando de terminal va en su propio bloque, uno a la vez.** El usuario los corre uno por uno y revisa el resultado de cada uno antes de seguir.
4. **NO uses:** GitHub Actions, workflows/CI, llaves SSH de despliegue, Docker, subdominio para la API. El build se hace **en la máquina local**, nunca en el servidor.
5. **Sube al repositorio desde el inicio** (`git init` + primer commit + push a `develop`).
6. Confirma antes de cualquier acción **irreversible** (borrar datos, migraciones destructivas, `git checkout -f` sobre una rama con cambios sin respaldar).
7. **Valida lo más arriesgado ANTES de construir nada.** ¿La app arranca bajo LiteSpeed? ¿El cliente de Prisma generado localmente corre en el servidor sin recompilar? Compruébalo con lo mínimo posible antes de automatizar el flujo completo.
8. **Mide los límites del hosting el primer día** (sección 12 de `PLAYBOOK-BANAHOSTING.md` — aplica igual aquí, no se repite).
9. **Dos fallos seguidos en el servidor = PARAR.** Se reproduce en local, no se insiste contra producción.
10. **La cuenta es compartida con otros proyectos.** Nunca sobrescribas archivos compartidos sin leer antes lo que hay.
11. **Nada de marcadores de posición.** Si falta un dato, pídelo y espera.
12. **Antes de copiar un artefacto a una ruta del servidor, verifica esa ruta en la rama de build** (`git show --stat` o `git ls-tree`). Cada rama de build de este proyecto tiene su propio subcarpeta destino (sección 2) y no coinciden con la carpeta de compilación local — confundirlas produce cientos de archivos "añadidos" en vez de un diff limpio (pasó una vez; ver sección 10).

---

## 1. Arquitectura tecnológica — y la decisión de usar Prisma

| Capa | Tecnología |
|---|---|
| **Frontend** | React + Vite + TypeScript + Tailwind → compila a estáticos (`dist/`) |
| **Backend** | Node.js + Fastify + TypeScript, compilado a **CommonJS** (`tsc` simple) |
| **ORM** | **Prisma Client** contra MySQL/MariaDB |
| **Runtime en prod** | cPanel **"Setup Node.js App"** sobre **LiteSpeed** (`lsnode` en los logs) |
| **Hosting** | Banahosting / cPanel (CloudLinux). Sin Docker, sin CI/CD |

> ### ⚠️ Prisma en runtime tiene un riesgo conocido en este tipo de hosting
>
> El motor de consultas de Prisma es un binario nativo (Rust) que se carga en el
> proceso y dimensiona sus hilos/conexiones según las CPU que **ve el sistema
> físico**, no las que tiene asignadas la cuenta. En CloudLinux (Banahosting) eso
> puede agotar el límite `NPROC` de la cuenta — y ya pasó: el 24/07/2026, en un
> proyecto distinto de **esta misma cuenta**, Prisma tumbó los procesos de **todos**
> los sitios del cliente (`bash: fork: Resource temporarily unavailable`, sin poder
> ni abrir una terminal para arreglarlo). Ver `PLAYBOOK-BANAHOSTING.md` sección 1 y 14
> para el procedimiento de emergencia si vuelve a pasar.
>
> HoraPro usa Prisma y **no ha tenido ese incidente**, pero corre el mismo binario
> nativo (`libquery_engine-rhel-openssl-1.1.x.so.node`) en la misma cuenta que ya lo
> sufrió. El riesgo no es hipotético, es una condición latente.
>
> **Decisión consciente, no por defecto:**
> - Si el proyecto es nuevo, evalúa `mysql2` con SQL directo primero (`PLAYBOOK-BANAHOSTING.md` sección 6) — elimina el riesgo por completo, no lo mitiga.
> - Si necesitas Prisma (velocidad de desarrollo, `migrate`, tipos), acéptalo sabiendo esto, y **aplica las mitigaciones de la sección 5 desde el montaje inicial** (`connection_limit` en la `DATABASE_URL` + `TOKIO_WORKER_THREADS`/`UV_THREADPOOL_SIZE` en el panel de cPanel) — no son opcionales, reducen el riesgo pero no lo eliminan.
> - No mezcles: o todo el acceso a datos va por Prisma, o todo va por SQL directo. Tener los dos duplica la carga cognitiva sin reducir el riesgo del primero.

- La API va en el **mismo dominio**, bajo `/api` (ej. `midominio.com/api`) — nunca un subdominio aparte.
- Backend compilado a **CommonJS explícito** (`"type": "commonjs"` en `package.json`, `tsc` por defecto). Esto evita por completo el problema de `require()` vs ESM que fuerza el puente `app.cjs` en la variante Passenger — LiteSpeed carga `dist/index.js` directo. Si en algún punto migras el backend a ESM, sí vas a necesitar ese puente (`PLAYBOOK-BANAHOSTING.md` sección 13).

---

## 2. Estructura del repositorio (un solo repo en GitHub)

| Rama | Qué lleva | Ruta exacta dentro de la rama |
|---|---|---|
| `develop` | Código fuente. Rama de trabajo. | — |
| `frontend-build` | Frontend compilado (artefacto) | `frontend/dist/` |
| `backend-build` | Backend compilado (artefacto) | `deploy-backend/dist/` (⚠️ **no** `backend/dist/` — es una carpeta distinta al nivel raíz de la rama) |
| `prisma-build` | Cliente de Prisma ya generado, con los binarios nativos (Mac local **y** `rhel-openssl-1.1.x` del servidor) | `deploy-prisma-client/` |

- `dist/` y `node_modules/.prisma` están en `.gitignore` en `develop`; por eso en las ramas de build se agregan con **`git add -f`**.
- Las ramas de build son artefactos puros: el servidor **nunca compila ni corre `npm install`**, solo copia archivos ya generados.
- `prisma-build` solo se actualiza cuando cambia `schema.prisma` — no en cada deploy. Evita correr `prisma generate` en el servidor (el generador también es un binario nativo con el mismo problema de la sección 1, y además no hay hook de `postinstall` configurado para lanzarlo).

---

## 3. Layout en el servidor (cPanel)

| Ruta | Qué es |
|---|---|
| `~/app-repo` | Clon git del repo. Solo se usa para **traer** artefactos vía `git checkout -f <rama-build>` + `pull`. **No** es donde corre la app. |
| `~/app-api` | La app Node desplegada de verdad: `dist/`, `node_modules/.prisma/client/` (copiado desde `prisma-build`), `.env` si aplica. **Su nombre NO se adivina ni se lee de la documentación: se lee del servidor** (paso B.0). |
| `~/midominio.com/` | Docroot del frontend, servido por LiteSpeed. |

---

## 4. Montaje inicial en cPanel (una sola vez por proyecto)

1. **Subdominio/dominio + AutoSSL.** HTTPS obligatorio.
2. **MySQL Databases:** crea la BD y un usuario con ALL PRIVILEGES. Host `localhost`.
3. **Setup Node.js App:** Node 18+, *Application root* = `app-api`, *Startup file* = **`dist/index.js`** directo (no necesitas `app.cjs` si el backend compila a CommonJS — sección 1). Monta la URL en `midominio.com/api`.
   > cPanel escribe un `index.js` de plantilla al crear la app. Sobrescríbelo con el
   > tuyo **después** de crearla, y reinicia.
4. Define las variables de entorno de la app (sección 5).
5. **Deja el docroot vacío.** En LiteSpeed llega sin `.htaccess` — no hay bloque de Passenger que preservar. Sube el `.htaccess` completo tal cual (sección 7). El enrutado de `/api` lo maneja LiteSpeed con un `api/.htaccess` que **cPanel genera solo** dentro de la carpeta de la app Node; no lo toques ni intentes recrearlo a mano.
6. Clona el repo en `~/app-repo` (rama por defecto: `develop`, solo para tener el remoto listo).
7. Genera el cliente de Prisma **en tu máquina local** (`npx prisma generate`, con el `binaryTargets` del `schema.prisma` incluyendo `"rhel-openssl-1.1.x"` además de tu plataforma local) y arma la primera versión de `prisma-build` con el mismo patrón de worktree (sección 6, paso A.4-5).

---

## 5. Variables de entorno (cPanel → Setup Node.js App → Environment variables)

| Variable | Valor en producción |
|---|---|
| `DATABASE_URL` | `mysql://usuario:clave@localhost:3306/nombre_bd?connection_limit=5&pool_timeout=10` (⚠️ no lo pongas sin los parámetros — ver 5.1) |
| `JWT_SECRET` | secreto largo aleatorio. El server no debe arrancar sin él. |
| `NODE_ENV` | `production` |
| `FRONTEND_ORIGIN` | `https://midominio.com` (CORS + links de correo) |
| `PORT` | lo asigna cPanel; léelo con `Number(process.env.PORT) \|\| fallback` |
| `TOKIO_WORKER_THREADS` | `1` (ver 5.1) |
| `UV_THREADPOOL_SIZE` | `2` (ver 5.1) |
| *(SMTP, pasarela de pago, etc.)* | nunca en el repo |

En desarrollo, cada quien usa su `.env` local (gitignored) — usa los mismos parámetros de `connection_limit`/`pool_timeout` ahí también, para que el comportamiento no cambie entre local y producción.

### 5.1 Por qué estas cuatro son obligatorias, no opcionales

Sin ellas, Prisma dimensiona su pool de conexiones y el runtime de Tokio (su
motor nativo) según las CPU **físicas** del servidor — 64 a 88 en Banahosting,
medido en dos servidores distintos (`PLAYBOOK-BANAHOSTING.md` sección 12) — muy
por encima de lo que soporta un usuario de MySQL compartido (10-25 conexiones) y
del límite `NPROC` de la cuenta. Es la misma familia de riesgo de la sección 1,
con una mitigación concreta y comprobada:

- **`connection_limit=5&pool_timeout=10`** en la `DATABASE_URL`: tope de 5
  conexiones simultáneas (de sobra para un proyecto chico), y si se agotan, la
  consulta falla a los 10s en vez de colgarse esperando indefinidamente.
- **`TOKIO_WORKER_THREADS=1` y `UV_THREADPOOL_SIZE=2`**: van en el panel de
  cPanel (Setup Node.js App → Environment variables), **no** en el `.env` del
  repo. Limitan los hilos del runtime async de Rust (Tokio, usado por el motor
  de Prisma) y el threadpool de libuv de Node — ambos se autodimensionan según
  las CPU físicas igual que el pool de conexiones si no se fijan.

Verificado en HoraPro: con `connection_limit=5&pool_timeout=10` las consultas
contra MySQL (local y en producción) funcionan sin cambios de comportamiento.

---

## 6. Flujo de actualización — el paso a paso completo

### A. En tu máquina (por cada cambio)

1. Trabajas en `develop`, pruebas en **local** hasta que quede aprobado.
2. Commit + push del fuente:
   ```
   git add <archivos> && git commit -m "..."
   ```
   ```
   git push origin develop
   ```
3. Compila lo que cambió:
   - **Backend:**
     ```
     cd backend && rm -rf dist && npm run build
     ```
   - **Frontend** (¡la trampa del `.env.local`, sección 8!):
     ```
     cd frontend && mv .env.local .env.local.bak && rm -rf dist && npm run build
     ```
     ```
     mv .env.local.bak .env.local
     ```
     Verifica que el bundle horneó la URL de prod y no `localhost`:
     ```
     grep -rl "localhost" frontend/dist/assets/*.js
     ```
     (debe no devolver nada)
4. **Arma las ramas de build en un worktree temporal** (nunca con `git checkout` en tu carpeta de trabajo — los artefactos gitignored quedan sin seguimiento y git se niega a cambiar de rama de vuelta a `develop`):
   ```
   git worktree add /ruta/temporal/wt-frontend-build frontend-build
   ```
   ```
   rsync -a --delete frontend/dist/ /ruta/temporal/wt-frontend-build/frontend/dist/
   ```
   ```
   cd /ruta/temporal/wt-frontend-build && git add -f frontend/dist && git status --short
   ```
   **Revisa el `git status` antes de seguir:** si cambió un solo archivo fuente, el diff debe verse como 2-4 archivos (los hasheados como *renombrados*, no como *añadidos*). Si ves decenas de archivos marcados como `A` (añadidos) sin ningún `R` (renombrado), copiaste a la ruta equivocada — revisa la tabla de la sección 2.
   ```
   git commit -m "build(frontend): ..." && git push origin frontend-build
   ```
   Repite lo mismo para `backend-build` apuntando a `deploy-backend/dist/` en vez de `frontend/dist/`.

   Al terminar, limpia el worktree:
   ```
   rm -rf /ruta/temporal/wt-frontend-build && git worktree prune
   ```
   > Si el git del proyecto es viejo (< 2.17), `git worktree remove` no existe — hay que
   > borrar la carpeta a mano y luego `git worktree prune`.
5. **Solo si cambió `schema.prisma`:** regenera el cliente local y actualiza `prisma-build` con el mismo patrón de worktree, copiando `node_modules/.prisma/client/` a `deploy-prisma-client/`. Aplica la migración SQL en producción (phpMyAdmin) **antes** de desplegar el backend nuevo.

### B. En el servidor (Terminal de cPanel) — un comando por bloque

**0. Confirma cuál es la app que de verdad corre.** No es opcional y no se salta:
Passenger guarda la ruta real en el `.htaccess` del docroot, y es la única fuente
confiable. La documentación puede estar desactualizada —lo estuvo: después de
migrar de `horapro.krumlab.com` a `horapro.co` quedó registrada `~/horapro-api`,
que ya no sirve nada, mientras la app viva es `~/horapro-co-api`. Copiar al
directorio muerto no da ningún error: el `cp` funciona, el `restart.txt`
funciona, y producción sigue con el código viejo.
```
grep PassengerAppRoot ~/midominio.com/api/.htaccess
```
Lo que imprima esa línea es `~/app-api` en todo lo que sigue. Para verlo desde
otro ángulo, esto lista los procesos Node vivos con su ruta:
```
ps -eo pid,etime,cmd | grep -i node | grep -v grep
```

**1. Backend:**
```
cd ~/app-repo && git checkout -f backend-build
```
```
git pull origin backend-build
```
```
cp -R deploy-backend/dist/. ~/app-api/dist/
```
**Solo si cambió `prisma-build`:**
```
git checkout -f prisma-build && git pull origin prisma-build
```
```
cp -R deploy-prisma-client/. ~/app-api/node_modules/.prisma/client/
```
**Comprueba que el archivo llegó a la app viva**, no a un directorio muerto.
Busca algo que solo exista en el código nuevo (una ruta, un nombre de función):
```
grep -c "<algo-del-cambio>" ~/app-api/dist/routes/<archivo>.js
```
Si da `0`, copiaste al lugar equivocado: vuelve al paso B.0. Este chequeo existe
porque su ausencia costó un despliegue entero dado por bueno.

**Reinicia la app Node** (LiteSpeed honra la misma convención que Passenger):
```
touch ~/app-api/tmp/restart.txt
```

**2. Frontend:**
```
cd ~/app-repo && git checkout -f frontend-build
```
```
git pull origin frontend-build
```
```
cp -R frontend/dist/. ~/midominio.com/
```

**3. Verificar:**
```
curl -s https://midominio.com/api/health; echo
```
`/api/health` devuelve un objeto fijo: **no toca la base de datos ni ejecuta nada
del código nuevo.** Un 200 ahí solo dice que el proceso Node está vivo. Sirve
para descartar que el despliegue reventara al arrancar, y para nada más.

Para saber si Prisma quedó bien —el riesgo real cuando se copia un cliente
regenerado— hace falta una ruta pública que SÍ consulte la base. En este proyecto:
```
curl -s -o /dev/null -w "%{http_code}\n" https://midominio.com/api/worker/kiosco/xxx
```
**404** = Prisma arrancó, consultó la base y no encontró ese token: todo bien.
**500** = el cliente de Prisma no cuadra con el esquema o no se copió donde debía.

Y si el cambio agregó una ruta nueva, pídela sin token: tiene que responder
**401**, no **404**. Es lo único que distingue "desplegado" de "copiado a otra
parte".

Al final, recarga dura en el navegador (Cmd/Ctrl+Shift+R) sobre algo que solo
haga el código nuevo. Cuando el cambio no agrega rutas, ningún `curl` sustituye
esto.

> **`git checkout -f`, no `git checkout` a secas.** El clon del servidor acumula con
> el tiempo cambios sueltos en el índice (de compilaciones manuales viejas, de
> pruebas) que bloquean el cambio de rama con "your local changes would be
> overwritten". Es contenido compilado desechable, nunca código fuente — forzar es
> seguro aquí, pero no lo hagas sin antes mirar `git status --short` una vez para
> confirmar que no hay nada real (sección 9 tiene el caso completo).

---

## 7. `.htaccess` del docroot (LiteSpeed + React Router)

En LiteSpeed el docroot llega **vacío**. Sube el archivo completo, sin nada que preservar:

```apache
Options -Indexes

<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /

  # archivos y carpetas que existen de verdad, tal cual
  RewriteCond %{REQUEST_FILENAME} -f [OR]
  RewriteCond %{REQUEST_FILENAME} -d
  RewriteRule ^ - [L]

  # /api NO se reescribe — LiteSpeed lo enruta con su propio api/.htaccess,
  # generado por cPanel dentro de la carpeta de la app Node. No lo dupliques aquí.
  RewriteCond %{REQUEST_URI} !^/api

  # todo lo demás lo resuelve React Router
  RewriteRule ^ index.html [L]
</IfModule>
```

No lo guardes en `frontend/public/` (Vite lo copiaría a `dist/` y lo pisaría en cada
deploy). Súbelo a mano, una vez, directo al docroot.

Si migras de subdominio a dominio propio (o viceversa) y quieres mantener el
anterior vivo como redirección: el `RewriteCond ... !^/api` debe ir **antes** de
la regla de redirección 301, para que sesiones viejas contra `/api` en el dominio
antiguo sigan funcionando mientras se apagan solas.

---

## 8. Trampa del `.env.local` (frontend)

Igual que en la variante mysql2: Vite prioriza `.env.local` sobre `.env` **incluso
en build de producción**. Antes de compilar para desplegar:

```
mv .env.local .env.local.bak && npm run build && mv .env.local.bak .env.local
```

Verifica siempre que el bundle no contenga `localhost` antes de subirlo.

---

## 9. Gotchas conocidos (específicos de esta variante)

- **La ruta de destino no es igual a la ruta de compilación local.** `backend/dist/` local se copia a `deploy-backend/dist/` en la rama — son nombres distintos a propósito (evita que alguien confunda la rama de build con el código fuente al verla en GitHub). Verifica siempre con `git show --stat` antes de copiar a una rama que no tocas seguido.
- **El clon del servidor no es un repo "limpio" para siempre.** Con el tiempo acumula basura en el índice de compilaciones manuales pasadas. `git checkout -f <rama>` la descarta sin riesgo porque son artefactos, nunca código fuente — pero mira `git status --short` una vez para confirmarlo antes de forzar, no por rutina.
- **`touch tmp/restart.txt` funciona en LiteSpeed igual que en Passenger.** Es una convención de cPanel "Setup Node.js App", no de Apache. El botón "Restart" del panel web puede tardar o no reflejar el cambio; `touch` es inmediato y verificable con un `curl` después.
- **CommonJS explícito evita el puente `app.cjs`.** Si el `package.json` del backend dice `"type": "commonjs"` (o no dice nada — es el default), y `tsc` no lo cambia, LiteSpeed carga `dist/index.js` con `require()` sin problema. Solo migra a ESM si tienes una razón concreta, sabiendo que eso reintroduce el problema que resuelve la sección 13 de `PLAYBOOK-BANAHOSTING.md`.
- **Git viejo (< 2.17) no tiene `git worktree remove`.** Bórralo a mano (`rm -rf` la carpeta) y luego `git worktree prune` para que git deje de listarlo.
- **`@fastify/cors` solo permite GET/HEAD/POST por defecto.** Declara `methods` explícito o PUT/PATCH/DELETE fallan con un error que parece de validación, no de CORS.
- **`.env` nunca al repo, ni en las ramas de build.** Solo en el panel de cPanel y en `.env` local gitignored.

---

## 10. Checklist rápido de cada despliegue

- [ ] Probado y aprobado en local.
- [ ] `develop` commiteado y pusheado.
- [ ] Backend compilado (`tsc`), frontend compilado con `.env.local` apartado y verificado sin `localhost`.
- [ ] Diff de la rama de build revisado (renombrados, no cientos de "añadidos").
- [ ] (Si cambió el esquema) migración aplicada en phpMyAdmin **y** `prisma-build` actualizado, **antes** de copiar el backend nuevo.
- [ ] En el servidor: `git checkout -f` + `pull` + `cp -R` de cada artefacto, un comando por bloque.
- [ ] **App root leído del `.htaccess` del docroot** (paso B.0), no de esta guía.
- [ ] `grep` de algo del cambio dentro de `~/app-api/dist/` → distinto de `0`.
- [ ] `touch tmp/restart.txt` si cambió el backend.
- [ ] `curl /api/health` → 200. **Ojo: no prueba nada del código nuevo** (devuelve
      un objeto fijo, sin tocar la BD). Solo descarta que el proceso reventara.
- [ ] Una ruta pública que consulte la BD (`/api/worker/kiosco/xxx` → **404**, no
      500). Es lo que confirma que el cliente de Prisma quedó bien copiado.
- [ ] Prueba en el navegador con recarga dura, sobre algo que solo haga el código
      nuevo. Ningún `curl` sustituye esto cuando el cambio no agrega rutas.
- [ ] **Si el cambio agregó una ruta**, probarla sin token: tiene que responder
      `401`, no `404`. Un `404` ahí significa que el backend viejo sigue vivo, y
      es lo único que distingue "desplegado" de "copiado a otra parte".
- [ ] Worktrees temporales limpiados (`rm -rf` + `git worktree prune`).
