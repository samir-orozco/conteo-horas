# Playbook — Laravel + SPA en Banahosting (cPanel/Apache)

> **Cuándo usar este archivo:** cuando el backend es **PHP/Laravel** y el hosting
> sirve con **Apache**, no con una app de Node. Es el tercer miembro de la familia
> (`PLAYBOOK-INICIO.md` te trae aquí desde la pregunta 1.1 si respondes "PHP").
>
> **Validado en producción:** TablaPro (SaaS multiempresa, Laravel 11 + Quasar 2),
> desplegado en `single-2020` el 2026-08-01. Un dominio adicional dentro de una
> cuenta con otros 6 sitios en producción. Todo lo que hay aquí pasó de verdad.
>
> Reemplaza `midominio.com`, `app-repo` por los nombres reales de tu proyecto.

---

## 0. Instrucciones para el asistente

Las 13 reglas de `PLAYBOOK-BANAHOSTING.md` sección 0 **aplican igual**. Estas
cuatro se añaden porque salieron de este despliegue:

14. **Confirma en qué cuenta y en qué servidor estás antes de cada bloque de
    trabajo.** La agencia tiene varias cuentas de cPanel y el prompt se parece.
    En este despliegue se ejecutaron comandos de TablaPro contra `ewyfwxbg` en
    vez de `jacdowbf` y se perdió media hora persiguiendo carpetas que no
    faltaban: estaban en otra máquina.
    ```
    whoami && hostname && ls -d ~/app-repo
    ```

15. **Nada de heredocs ni bloques multilínea en la terminal web.** No es solo que
    se trunquen (regla ya conocida): si el bloque incluye un comando interactivo
    (`read`, `artisan tinker`, cualquier prompt), **el prompt se come la línea
    siguiente del pegado como si fuera tu respuesta**. Aquí un `cd` acabó siendo
    la respuesta a "¿nombre de la carpeta?" y el despliegue se canceló solo.
    **Todo archivo largo va versionado en el repo y se copia con `cp`.**

16. **Si vas a escribir un script de despliegue, que se verifique a sí mismo.**
    Un script que termina en verde sin comprobar nada es peor que no tenerlo:
    los archivos estáticos se siguen sirviendo aunque el backend esté muerto, así
    que el sitio "se ve" y solo falla cuando entra un cliente. Ver sección 7.

17. **Toda regla de negocio que el usuario deba leer tiene que sobrevivir a
    `APP_DEBUG=false`.** Un `500` en producción **no lleva el mensaje**. Si lanzas
    una excepción genérica para decir "llegaste al límite de tu plan", el cliente
    lee *"Server Error"*. Ver sección 10.

---

## 1. Arquitectura

| Capa | Tecnología |
|---|---|
| **Frontend** | Quasar/Vue (o React) → estáticos en el docroot, servidos por Apache |
| **Backend** | **PHP + Laravel**, ejecutado por el PHP de cPanel (mod_lsapi / CGI) |
| **Base de datos** | MySQL/MariaDB de cPanel |
| **Runtime** | **Apache**. No hay app de Node, no hay Passenger, no hay `app.cjs`, no hay `restart.txt` |
| **Hosting** | Banahosting / cPanel (CloudLinux) |

**La ventaja grande frente al stack de Node:** PHP no es un proceso residente. No
hay app que reiniciar, no hay puerto que asignar, no hay pool de procesos que
compita contra `NPROC`. **El incidente del 24/07/2026 no puede ocurrir aquí**, y
por eso este stack es más tranquilo en hosting compartido.

**Lo que se pierde:** no hay panel de variables de entorno. La configuración vive
en un archivo `.env` en el servidor, con todo lo que eso implica (sección 5).

- **La API va en el MISMO dominio, bajo `/api`.** Igual que en el otro playbook.
  Aquí se logra con una regla de `.htaccess` que desvía `/api` a un arrancador.

---

## 2. Estructura del repositorio — **una sola rama**

> ### Este es el cambio grande respecto al playbook de Node
>
> **No hay ramas de build.** Ni `frontend-build`, ni `backend-build`, ni
> worktrees temporales. Una rama (`main`) con el código, y un script que despliega.
>
> Funciona porque en este stack **el servidor sí puede compilar** (sección 6) y
> porque `composer install` es obligatorio en el servidor de todas formas: las
> dependencias de PHP no se pueden precompilar en tu Mac y copiar, dependen de la
> versión de PHP del destino.
>
> Menos piezas, menos pasos, menos formas de equivocarse. En este despliegue fue
> la diferencia entre "un comando" y "cinco pasos con worktrees".

```
app-repo/
  backend/            Laravel
  frontend/           código fuente de la SPA
  deploy/
    desplegar.sh              el script (sección 7)
    env.produccion.example    plantilla del .env (sección 5)
    public_html/
      .htaccess               reglas de Apache
      api.php                 arrancador de Laravel
  DESPLIEGUE.md       el runbook del proyecto
```

`frontend/dist/` y `backend/vendor/` van en `.gitignore`. **`frontend/src/env.ts`
(o su equivalente) también**, porque lleva la URL de la API y es distinta en cada
máquina — así sobrevive a los `git pull` y no hay que apartarla antes de compilar
(el problema del `.env.local` de la sección 9 del otro playbook aquí no existe).

---

## 3. Layout en el servidor

| Ruta | Qué es |
|---|---|
| `~/app-repo` | Clon del repo. **Aquí vive la aplicación**, no solo los artefactos. |
| `~/app-repo/backend` | Laravel, con su `.env`, su `vendor/` y sus claves |
| `~/midominio.com/` | Docroot: la SPA compilada + `.htaccess` + `api.php` |

> **El repositorio va FUERA del docroot, y no es opcional.** Dentro quedarían
> expuestos el código, el historial de git y —en cuanto exista el `.env`— las
> credenciales de base de datos y las claves de pasarela de pago. El `api.php`
> de este playbook se **niega a arrancar** si detecta que la aplicación está
> dentro del docroot, pero mejor no llegar.

---

## 4. Montaje inicial en cPanel

1. **Dominio/subdominio + AutoSSL.**
2. **MySQL Databases:** crea la BD **y el usuario**, y después —esto es el paso
   que todo el mundo se salta— **"Add User To Database" con ALL PRIVILEGES**.
   Crear el usuario no le da acceso a nada; el síntoma es
   `Access denied for user ... (using password: YES)` con las credenciales
   correctas.
3. **⚠️ MultiPHP Manager: asigna 8.2 u 8.3 al dominio.** Ver sección 9 — esto es
   lo que más veces tumbó este despliegue.
4. **Clave de despliegue de solo lectura** (Deploy key en GitHub, no token
   personal) y `~/.ssh/config` con `cat >>`, nunca `>`.
5. Clona el repo en `~/app-repo`.
6. Crea el `.env` desde la plantilla (sección 5).
7. Sube `.htaccess` y `api.php` al docroot (sección 8). **Solo la primera vez**
   si tu script no los gestiona; si los gestiona, ver el aviso de la sección 8.

---

## 5. El `.env` de Laravel — **plantilla versionada, nunca pegado a mano**

No hay panel de variables. El `.env` es un archivo, y pegarlo en la terminal web
lo corrompe. **La solución que funcionó:**

```
cp ~/app-repo/deploy/env.produccion.example ~/app-repo/backend/.env
```

```
chmod 600 ~/app-repo/backend/.env
```

```
nano ~/app-repo/backend/.env
```

En `nano` solo se cambian los valores marcados `CAMBIAR`. La plantilla lleva todo
lo demás resuelto y **comentado**, así que no hay que recordar qué variables
existen.

> ### Tres trampas del `.env` que costaron tiempo
>
> **1. Los valores con espacios necesitan comillas.** Sin ellas dotenv falla con
> `unexpected whitespace` y **la aplicación entera deja de arrancar**, no solo esa
> variable.
> ```ini
> MAIL_FROM_NAME="Soporte TablaPro"    # bien
> MAIL_FROM_NAME=Soporte TablaPro      # rompe TODO
> ```
>
> **2. Una contraseña con `#` se trunca en silencio.** dotenv trata el `#` como
> comentario. La conexión falla con "Access denied" y la contraseña *parece*
> correcta cuando la miras. Genera contraseñas alfanuméricas, o ponla entre
> comillas.
>
> **3. Editar el `.env` no surte efecto hasta regenerar la caché.** Laravel
> guarda la configuración compilada y `env()` deja de leerse:
> ```
> php artisan config:cache
> ```
> Este es el sospechoso número uno cuando "puse las claves y sigue sin
> funcionar". Le pasó a las credenciales de Wompi en este proyecto.

**Nunca escribas la contraseña real en `DESPLIEGUE.md`:** queda en cada clon y en
el historial de git para siempre.

---

## 6. Compilar el frontend **en el servidor** (y por qué aquí sí)

El playbook de Node dice "nunca compiles en el servidor". Aquí se hizo y funcionó:
**webpack tardó 47 segundos** en `single-2020` y no se acercó a ningún límite.

La diferencia es que ese playbook protege contra agotar `NPROC` con una app Node
residente compitiendo por procesos. En este stack no hay app residente, así que un
build puntual tiene toda la cuenta para él.

**Regla honesta:** mide primero (`PLAYBOOK-BANAHOSTING.md` sección 12). Si la
cuenta está cargada o el build es enorme, compila en local y sube `dist/`. Si no,
compilar en el servidor **elimina las ramas de build, los worktrees y la
posibilidad de publicar un artefacto desfasado**.

```
source ~/nodevenv/nodebuild/22/bin/activate
```

```
cd ~/app-repo/frontend && npm ci --include=dev
```

```
cd ~/app-repo/frontend && npx quasar build
```

> ### ⚠️ `--include=dev` es obligatorio, y `NODE_ENV=development` NO basta
>
> La app de Node de cPanel deja `omit=dev` en la **configuración de npm**, y la
> configuración de npm **gana sobre la variable de entorno**. Con
> `NODE_ENV=development npm ci` se instalan 72 paquetes en vez de ~1.400, falta
> el CLI de compilación y el error es
> `npm error could not determine executable to run` — que no menciona
> devDependencies por ningún lado.
>
> Comprobado dos veces en este despliegue. **Usa el flag explícito.**

---

## 7. El script de despliegue — **la pieza que hizo que esto saliera bien**

Un solo comando en el servidor, y el script se encarga del orden y de las
comprobaciones. Lo que debe tener, por orden de importancia:

**Guardas ANTES de tocar nada** (así fallar no deja el sitio a medias):

- **Versión de PHP correcta.** Comprueba `PHP_MAJOR.PHP_MINOR` contra lo que
  exige `composer.json`, y explica cómo cambiarlo.
- **`APP_DEBUG=false`.** Con `true`, cada error 500 devuelve al navegador la
  consulta SQL completa, incluidos hashes de contraseña. Motivo suficiente para
  abortar.
- **La carpeta de destino, confirmada por nombre.** En una cuenta compartida,
  `public_html` es el dominio **principal**, no el tuyo. El script pide escribir
  el nombre de la carpeta si no reconoce que ahí ya vive tu proyecto.
- **El bundle apunta al dominio de producción.** No busques `localhost` (deja
  pasar `127.0.0.1` y al revés): **exige que el dominio de producción esté
  dentro del bundle**, leyéndolo del propio `.env`. Así también detectas un
  dominio antiguo o el de un staging.

**Durante:**

- `artisan down` con un `trap` que ejecuta `artisan up` pase lo que pase. Sin el
  trap, un fallo a mitad deja el sitio en mantenimiento indefinidamente.
- `composer install --no-dev --optimize-autoloader`, invocado como
  `"$PHP" "$COMPOSER"` y **no** como `composer` suelto: los alias del `.bashrc`
  no se heredan dentro de un script, así que `composer` usaría el PHP del PATH
  (la versión equivocada) aunque hayas fijado la buena.
- `migrate --force`.
- `config:clear` + `route:clear` **antes** de `config:cache` + `route:cache`. Sin
  el clear se cachea la configuración anterior y se pierde un buen rato buscando
  por qué "no toma el cambio".

**Después, y esto es lo que evita el desastre silencioso:**

- **Cuenta las rutas antes y después de `route:cache`.** En este proyecto la
  caché dejaba **9 de 41 rutas** porque los archivos se incluían con
  `include_once`: al construir la caché Laravel evalúa el archivo más de una vez
  y en las siguientes el `include_once` ya no ejecuta nada. La aplicación
  arrancaba sin un error y devolvía **404 en todo menos el login**. Si los
  números no cuadran, el script deja las rutas sin cachear y avisa.
- **Pide `/api/` y exige el código correcto.** Un `401` sin token es la respuesta
  sana. Un `500` es PHP mal configurado; un `200` con HTML significa que `/api`
  no está llegando a Laravel. En los dos casos el script **termina con error**,
  no con un "listo".

```
cd ~/app-repo && PUBLIC_HTML=~/midominio.com PHP_BIN=/opt/cpanel/ea-php83/root/usr/bin/php bash deploy/desplegar.sh
```

---

## 8. `.htaccess` del docroot

Aquí el `.htaccess` **sí se despliega** (lleva la regla que enruta `/api`), y por
eso hay un peligro que el playbook de Node no tiene:

> ### ⚠️ MultiPHP Manager guarda la versión de PHP DENTRO de este archivo
>
> ```apache
> # php -- BEGIN cPanel-generated handler, do not edit
> AddHandler application/x-httpd-ea-php83 .php .php8 .phtml
> # php -- END cPanel-generated handler, do not edit
> ```
>
> Copiar tu `.htaccess` encima **borra ese bloque** y el dominio cae al PHP por
> defecto de la cuenta. Resultado: toda la API responde
> `500 - Composer detected issues in your platform: Your Composer dependencies
> require a PHP version ">= 8.2.0"`.
>
> Y lo difícil de ver: **el sitio sigue pareciendo sano**. Los estáticos no pasan
> por PHP, así que la landing carga, las rutas de la SPA responden y el script
> termina en verde. Solo está muerto por dentro.
>
> **El script debe extraer los bloques `cPanel-generated` del `.htaccess` que ya
> hay y volver a añadirlos después de copiar.** No escribas tú el `AddHandler`:
> si el nombre del handler no coincide con lo instalado en la cuenta, Apache
> podría servir `api.php` como texto plano.

Orden de las reglas, y no es intercambiable:

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /

  # 0. Rutas que no se sirven NUNCA. Lo primero, incluso antes del salto a
  #    HTTPS, para que una petición en claro no reciba un 301 que repite la
  #    ruta en la cabecera Location.
  #
  #    OJO: <FilesMatch> NO sirve para esto. Compara el NOMBRE del archivo, no
  #    la ruta: para /.git/config el nombre es "config" y no casa con nada.
  #    Con git-dumper se reconstruye el repositorio entero.
  RewriteRule (^|/)\.(git|env|svn|hg)(/|$)     - [F,L]
  RewriteRule (^|/)(storage|vendor|bootstrap)/ - [F,L]

  # 1. HTTPS
  RewriteCond %{HTTPS} !=on
  RewriteCond %{HTTP:X-Forwarded-Proto} !https
  RewriteRule ^ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]

  # 2. La API va a Laravel. ANTES del catch-all o la SPA se la traga.
  RewriteRule ^api(/.*)?$ api.php [L,QSA]

  # 3. Archivos que existen de verdad
  RewriteCond %{REQUEST_FILENAME} -f [OR]
  RewriteCond %{REQUEST_FILENAME} -d
  RewriteRule ^ - [L]

  # 4. Todo lo demás lo resuelve el router de la SPA
  RewriteRule ^ index.html [L]
</IfModule>
```

Y añade `.key` y `.pem` al `FilesMatch` de extensiones prohibidas:
`storage/oauth-private.key` firma los tokens de Passport, y quien la tenga puede
fabricarse uno de cualquier usuario.

> ### Compresión: la trampa del MIME del JavaScript
>
> Apache 2.4.55+ (el de EA4) sirve los `.js` como **`text/javascript`**, no
> `application/javascript`. Y tanto `AddOutputFilterByType` como `ExpiresByType`
> casan por tipo. Con solo el tipo viejo en la lista, **ningún `.js` se comprime
> ni se cachea**: medido en producción, 1,6 MB en vez de 478 KB.
>
> Lo peor es que no se nota, porque `text/css` sí está en la lista: el CSS sale
> comprimido y todo parece funcionar. **Lista los dos tipos.**

---

## 9. La versión de PHP — dos ajustes distintos, y confundirlos cuesta caro

| Dónde | Qué controla |
|---|---|
| **MultiPHP Manager** | El PHP con el que **Apache ejecuta tu sitio**. Es el que importa. |
| El `php` del PATH en Terminal | El de la shell. Suele ser **otro**, normalmente más viejo. |

`composer install` y `artisan` se ejecutan con el segundo; la API con el primero.
**Se pueden tener bien uno y mal el otro**, y entonces el despliegue termina
perfecto y el sitio devuelve 500 en todo.

En este proyecto pasó dos veces. La ruta explícita:

```
/opt/cpanel/ea-php83/root/usr/bin/php
```

**Y ojo con el techo del lockfile.** `composer.json` puede pedir `^8.2`, pero el
`composer.lock` tiene sus propios topes por dependencia: aquí ninguna pasaba de
**8.3**. Con 8.1 fallaba con 22 conflictos; con 8.4 también habría fallado.
`composer update` **no es la salida** si el framework está en EOL. El rango real
es más estrecho que el que declara `composer.json`: compruébalo antes de escribir
"8.1–8.3" en la documentación, como se escribió aquí por error.

---

## 10. Gotchas de Laravel en cPanel

- **`include_once` en los archivos de rutas rompe `route:cache` en silencio.**
  Usa `require`. Ver sección 7.

- **El mensaje de una regla de negocio no sobrevive a un 500.** Con
  `APP_DEBUG=false` un 500 **no lleva el cuerpo**. Si lanzas `\RuntimeException`
  para decir "llegaste al límite de tu plan", el cliente lee *"Server Error"* y
  todo tu sistema de límites es invisible **justo en producción**. Crea una
  excepción propia y renderízala como 4xx en `bootstrap/app.php`.
  Y revisa que el `catch (\Exception)` del controlador no la envuelva antes:
  hay que relanzarla explícitamente, como ya se hace con `ModelNotFoundException`.

- **Una migración que solo añade la columna deja el sistema roto en la práctica.**
  `email_verified_at` en NULL bloquea a todos los usuarios existentes el día que
  actives la verificación; una columna `plan_id` en NULL deja a todas las empresas
  sin precio. **La migración debe traer su migración de datos**: crear el valor
  por defecto y asignarlo a lo que ya existe.

- **El orden de las rutas con comodines.** `Route::get('pagos/{referencia}')`
  declarada antes que `Route::get('pagos/resumen')` se traga la segunda: gana la
  primera que casa. Declara las rutas literales **antes** que las de comodín.

- **`ApiResponser::errorResponse()` devuelve la clave `error`, no `message`.** Si
  el frontend solo lee `message`, el motivo real se pierde y siempre sale el texto
  genérico. Lee las dos, o unifica el contrato.

- **CORS: que la mala configuración falle de forma visible.** Si
  `CORS_ALLOWED_ORIGINS` viene vacío, cae a `localhost`, **no a `*`**. Así un
  despliegue mal configurado se nota en desarrollo en vez de quedar abierto a
  todo el mundo en producción.

- **El `.env` local del frontend y las credenciales del navegador.** La SPA llama
  a `https://midominio.com/api/`. Si `env.ts` quedó apuntando a `127.0.0.1`, el
  sitio compila, se ve bien y **falla en el navegador del visitante**, que intenta
  llamar a su propia máquina. Es un fallo silencioso: la guarda del script es la
  única defensa.

- **Un `403` de CloudFront tras pulsar "pagar" no es un fallo de la tarjeta.** Es
  la pasarela rechazando una petición con la clave pública vacía. **Comprueba la
  configuración antes de redirigir al cliente fuera de tu sitio**, o verá una
  página de error de Amazon en inglés y creerá que le falló el pago.

---

## 11. Checklist de cada despliegue

- [ ] Probado y aprobado en **local** (pruebas + build + navegador).
- [ ] `whoami && hostname` → es la cuenta correcta.
- [ ] `git pull` en el servidor.
- [ ] Frontend recompilado **si cambió su código fuente**. Si no, el bundle viejo
      se publica sin avisar.
- [ ] Script de despliegue lanzado con `PUBLIC_HTML` y `PHP_BIN` explícitos.
- [ ] El script dijo el número de rutas esperado y **`401` en la API**.
- [ ] MultiPHP Manager sigue en 8.2/8.3 (compruébalo si tocaste el `.htaccess`).
- [ ] Prueba en el navegador con recarga dura.

---

## 12. Lo que hace fácil el **desarrollo** de una app nueva

Esto no es despliegue, pero es lo que más tiempo ahorró en este proyecto.

### 12.1 `.claude/launch.json` desde el primer día

Levanta backend y frontend con un comando y deja el navegador integrado
funcionando. Dos avisos que costaron tiempo aquí:

- El PHP del `launch.json` va **por ruta completa** si el PHP global de tu Mac no
  es el del proyecto (Homebrew instala el más nuevo).
- **El puerto del dev server tiene que estar en los orígenes permitidos por
  CORS.** Si el backend permite `localhost:8080` y el dev server arranca en 9000,
  el navegador bloquea **todas** las llamadas: la preflight pasa y el GET muere
  con `ERR_FAILED`, que no menciona CORS por ningún lado.

### 12.2 Multiempresa: dos capas, no una

Si la app es un SaaS con varios clientes, el aislamiento necesita **dos**
mecanismos, porque uno solo siempre deja un hueco:

- Un **scope global** en los modelos, que cubre todo lo que pase por Eloquent.
- Un **helper explícito** (`Tenant::currentCompanyId()`) para los sitios que usan
  consultas crudas o repositorios, donde el scope no llega.

Y que el helper sea **cerrado por defecto**: si no puede resolver la empresa,
devuelve "ningún resultado", nunca "todos". El modelo `User` normalmente **no**
puede llevar el scope (rompería el login), así que su aislamiento se pide a mano
en cada consulta — y por eso hace falta una prueba que lo fije.

### 12.3 Las pruebas que valen la pena

Las que salvaron este proyecto no comprueban que las cosas funcionen: comprueban
**lo que falla en silencio**.

- Que un admin **no** vea los datos de otra empresa.
- Que el mensaje de un error de negocio llegue como 4xx **con texto**, no como 500.
- Que una ruta literal no la capture un comodín.
- Que el límite se aplique también en el camino secundario (duplicar, no solo
  crear).
- Que el secreto no aparezca en la respuesta (`assertStringNotContainsString`).

Y en el frontend, si no hay nada montado: **Vitest sobre la capa de cálculo** es
la deuda más rentable. En este proyecto un fallo de unidades en una etiqueta de
alimento se encontró leyendo, no ejecutando.

### 12.4 Verificar en el navegador, no preguntar

Con el navegador integrado se puede iniciar sesión, navegar y capturar pantalla
sin pedirle al usuario que compruebe nada. Para autenticarse **sin escribir
contraseñas en formularios**: genera un token de desarrollo por consola y ponlo
en `localStorage` con las mismas claves que usa la app. Revócalo al terminar.

---

## 13. Marcha atrás

No hay ramas de artefactos que revertir, así que el camino es el repo:

```
cd ~/app-repo && git log --oneline -5
```

```
cd ~/app-repo && git checkout <commit-bueno>
```

Y relanzar el script. **Las migraciones no se deshacen solas:** si el commit malo
traía una migración destructiva, `git checkout` no la revierte. Por eso, y esto
es lo importante:

> **Antes de cualquier migración que borre o transforme datos, exporta la base
> desde cPanel → Backup → Download a MySQL Database Backup.** Es un clic y es la
> única marcha atrás real que existe.

Y configura las **copias automáticas de cPanel antes del primer cliente**: desde
ese momento la base tiene datos que el cliente no puede reconstruir.
