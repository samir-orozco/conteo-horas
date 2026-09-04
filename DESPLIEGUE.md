# Despliegue de HoraPro en Banahosting

Guía paso a paso. Sigue el orden.

> **Dominio: `horapro.co`** (migrado desde el despliegue inicial en el subdominio
> `horapro.krumlab.com`, que se dejó como redirección 301 durante la transición).

## 1. Subdominio y SSL (obligatorio)

1. cPanel de krumlab.com → **Domains** (o **Subdomains**) → Create a New Domain:
   - Dominio: `horapro.co`
   - Document Root: **`~/horapro.co/`** (ahí vivirá el frontend — OJO: es esta carpeta, NO `public_html/horapro`; cPanel crea el docroot del subdominio en `~/horapro.co/`)
2. cPanel → **SSL/TLS Status** → activa **AutoSSL** para `horapro.co` (suele activarse solo a los pocos minutos de crear el subdominio).
3. Verifica que `https://horapro.co` responda con candado. **Sin HTTPS el reconocimiento facial no funciona** (los navegadores bloquean la cámara en sitios sin candado).

## 2. Base de datos MySQL

1. cPanel → **MySQL Databases**:
   - Crea la base de datos (ej. `usuario_horapro`).
   - Crea un usuario con contraseña fuerte y asígnalo a la BD con **ALL PRIVILEGES**.
2. Anota: nombre de BD, usuario, contraseña. El host es `localhost`.

## 3. Backend (API Node)

1. cPanel → **Setup Node.js App** → Create Application:
   - Node.js version: 18 o superior.
   - Application root: **`horapro-co-api`** (sube ahí el contenido de la carpeta `backend/`, sin `node_modules`).
     > ⚠️ Existe además un `~/horapro-api` de cuando la app vivía en
     > `horapro.krumlab.com`. **Está muerto y no sirve nada.** Copiar el `dist`
     > ahí no da error y deja producción con el código viejo. La ruta real
     > siempre se lee del servidor:
     > `grep PassengerAppRoot ~/horapro.co/api/.htaccess`
   - Application startup file: `dist/index.js`.
2. En la terminal de la app (o SSH), dentro de `horapro-co-api`:
   ```bash
   npm install
   cp .env.example .env        # y completa TODOS los valores (ver sección 6)
   npx prisma db push          # crea las tablas en la BD vacía
   npm run prisma:seed:prod    # datos legales + super admin (SIN datos demo)
   npm run build               # compila TypeScript a dist/
   ```
   > Guarda la contraseña del super admin que imprime el seed: no se vuelve a mostrar.
3. Reinicia la app en Setup Node.js App.
4. Prueba: `https://horapro.co/api/health` debe responder `{"status":"ok"}`.
   (Si el panel de Node no publica en `/api`, crea la app con URL `horapro.co/api`.)

## 4. Frontend (React estático)

En tu máquina:
```bash
cd frontend
cp .env.example .env          # VITE_API_URL=https://horapro.co/api
npm install
npm run build
```
Sube el contenido de `frontend/dist/` a **`~/horapro.co/`** (el docroot real del subdominio, incluida la carpeta `models/` con los pesos del reconocimiento facial). En deploys posteriores: `cp -R ~/horapro-repo/frontend/dist/. ~/horapro.co/` (no borres `.htaccess`, `models/` ni `api/`).

> **No borres `assets/` antes de copiar.** La instrucción anterior empezaba con
> `rm -rf ~/horapro.co/assets`, y eso elimina bundles que las pestañas ya
> abiertas siguen pidiendo. La app carga tres módulos bajo demanda —`xlsx` al
> exportar, `faceapi`, `clipboard`—, cada uno en su archivo con hash propio: quien
> tuviera HoraPro abierto desde antes del despliegue y exportara un reporte
> recibía un 404 y un error en pantalla.
>
> Los bundles nuevos llevan hash distinto, así que conviven con los viejos sin
> pisarse. Ocupa unos megas por despliegue; se limpia a mano cada varios meses
> mirando qué hash referencia el `index.html` actual.

Crea `~/horapro.co/.htaccess` para que React Router maneje las rutas:
```apache
RewriteEngine On
RewriteBase /
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteCond %{REQUEST_URI} !^/api/
RewriteRule . /index.html [L]
```

## 5. Correo (recuperación de contraseña)

1. cPanel → **Email Accounts** → crea `no-responder@krumlab.com` con contraseña fuerte
   (cuando horapro.co esté en el hosting podrás cambiarlo a `no-responder@horapro.co`).
2. Pon esas credenciales en el `.env` del backend (`SMTP_*`). Host: `mail.krumlab.com`, puerto 465.
3. Prueba: en el login → "¿Olvidaste tu contraseña?" → debe llegar el correo.

## 6. Variables de entorno del backend (resumen)

| Variable | Valor en producción |
|---|---|
| `DATABASE_URL` | `mysql://usuario:clave@localhost:3306/bd?connection_limit=5&pool_timeout=10` (⚠️ ver 6.1, no lo pongas sin los parámetros) |
| `JWT_SECRET` | `openssl rand -hex 32` (el servidor **no arranca** sin él) |
| `NODE_ENV` | `production` |
| `FRONTEND_ORIGIN` | `https://horapro.co` (restringe CORS y arma los links de correo) |
| `TOKIO_WORKER_THREADS` | `1` (ver 6.1) |
| `UV_THREADPOOL_SIZE` | `2` (ver 6.1) |
| `WOMPI_*` | llaves de **producción** (ver sección 7) |
| `SMTP_*` | buzón creado en el paso 5 |

### 6.1 ⚠️ Prisma en Banahosting: por qué estas variables son obligatorias, no opcionales

El motor de Prisma es un binario nativo (Rust) que dimensiona sus hilos y su pool
de conexiones según las CPU que **ve el sistema físico** del servidor — no las que
tiene asignada tu cuenta. En Banahosting eso son 64-88 CPUs (medido en dos
servidores distintos), así que sin estas variables Prisma intenta abrir más de
100 conexiones a MySQL contra un usuario que normalmente tiene un tope de 10-25,
y usa el mismo criterio para abrir hilos del sistema operativo — contra el límite
`NPROC` de CloudLinux. **El 24/07/2026 esto tumbó los procesos de toda una cuenta
de Banahosting** (otro proyecto, misma cuenta que hospeda HoraPro):
`bash: fork: Resource temporarily unavailable` en SSH y en la Terminal de cPanel,
sin poder ni entrar a arreglarlo.

- **`DATABASE_URL` con `?connection_limit=5&pool_timeout=10`:** limita el pool de
  conexiones de Prisma a 5 (de sobra para el tráfico de HoraPro) y hace que una
  consulta sin conexión libre falle a los 10s en vez de colgarse indefinidamente.
- **`TOKIO_WORKER_THREADS=1` y `UV_THREADPOOL_SIZE=2`** (cPanel → Setup Node.js
  App → Environment variables, **no** en el `.env`): limitan los hilos del
  runtime async de Rust (Tokio, usado por el motor de Prisma) y del threadpool de
  libuv de Node. Sin esto, ambos se dimensionan solos según las CPU físicas del
  host, igual que el pool de conexiones.

**Aplica las cuatro en cualquier app Node de esta cuenta que use Prisma** — no
solo en `horapro-co-api`. Si hay una app vieja corriendo en paralelo (ver nota del
dominio, arriba) y usa Prisma, confirma que también las tenga.

## 7. Wompi en producción

> ✅ El comercio ya está aprobado: las llaves `pub_prod_*` ya existen en el panel.

1. En [comercios.wompi.co](https://comercios.wompi.co) → **Configuraciones avanzadas para programadores**,
   copia las 4 llaves al `.env` del servidor (la privada y los secretos con el botón "Mostrar";
   nunca los guardes en el repositorio ni los compartas por chat):
   - `WOMPI_PUBLIC_KEY` = `pub_prod_abvIgVu5CRAoUkw5gpz6JclCB4rgMCW6` (esta es pública, ya conocida)
   - `WOMPI_PRIVATE_KEY` = `prv_prod_...` (botón Mostrar de "Llave privada")
   - `WOMPI_EVENTS_SECRET` = botón Mostrar de "Eventos"
   - `WOMPI_INTEGRITY_SECRET` = botón Mostrar de "Integridad"
   - `WOMPI_API_URL` = `https://production.wompi.co/v1`
2. En la misma sección, en **Seguimiento de transacciones → URL de Eventos**, escribe
   `https://horapro.co/api/wompi/eventos` y presiona Guardar — así los pagos se confirman
   solos aunque el cliente cierre la pestaña. (Se puede guardar desde ya, aunque el dominio
   aún no esté publicado; Wompi empezará a entregar eventos cuando el sitio responda.)
3. Reinicia la app Node y haz un pago real de prueba (puedes pagar tú mismo el plan de una empresa de prueba y luego reembolsarlo desde el panel de Wompi).

## 8. Backups

cPanel → **Backup** → programa el respaldo automático de la BD (o descarga uno manual semanal).
Las fotos de verificación facial viven en la BD y se auto-eliminan a los 2 meses.

## 9. Checklist final antes de anunciar

- [ ] `https://horapro.co` con candado (SSL)
- [ ] `https://horapro.co/api/health` responde ok
- [ ] Registro de una empresa nueva funciona de punta a punta
- [ ] Kiosco: marcación con cédula y con rostro **desde la tablet real**
- [ ] "¿Olvidaste tu contraseña?" llega al correo
- [ ] Pago real con Wompi se refleja en la suscripción
- [ ] Login del super admin funciona y NO existe ninguna cuenta demo
