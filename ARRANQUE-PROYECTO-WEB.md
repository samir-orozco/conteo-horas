# Arranque de un proyecto web — Krumlab

Documento de contexto para empezar un sitio nuevo. Se copia a la raíz del repo,
se responde el cuestionario **antes de escribir código**, y a partir de ahí sirve
de referencia para todo el proyecto.

Nace de lo aprendido construyendo Casa Cabieles (hostal + planes turísticos,
cinco idiomas, panel de administración, cPanel compartido). Las decisiones de
arquitectura que hay aquí están probadas en producción; las trampas también.

> **Este documento no cubre el despliegue.** Para hosting, cPanel, `.htaccess`,
> variables de entorno, ramas de build y procedimientos de emergencia, ver
> [`PLAYBOOK-BANAHOSTING.md`](PLAYBOOK-BANAHOSTING.md). Los dos se usan juntos:
> este define **qué** se construye, el playbook **cómo** se pone en el aire.

---

# Parte 1 — Cuestionario de arranque

Responde en el propio archivo, debajo de cada pregunta. Lo que quede sin
responder es una decisión que alguien tomará más tarde, con prisa, y
probablemente mal.

Las marcadas **⚠︎** son las que, si se resuelven tarde, obligan a rehacer
trabajo. Resuélvelas antes de la primera línea de código.

## 1. El cliente y el negocio

- ¿Quién es el cliente? Razón social, y **quién decide**. Si hay varias personas
  opinando, ¿quién tiene la última palabra?
- ¿A qué se dedica exactamente? Descríbelo como se lo contarías a alguien que no
  conoce el sector.
- ¿Qué vende? ¿Un producto, un servicio, una reserva, una cita?
- ¿Cuánto cuesta lo que vende y cómo se cobra? ¿Hay pago en línea, o el cierre es
  por WhatsApp, teléfono o presencial?
- ¿Quién es su competencia y qué hace distinto?
- ¿Tiene ya un sitio? ¿Qué le funciona y qué no? ¿Se migra contenido de ahí?

## 2. Qué tiene que conseguir el sitio

- **¿Cuál es la acción que queremos que haga el visitante?** Una sola. Reservar,
  escribir por WhatsApp, dejar sus datos, comprar, llamar.
- ¿Cómo sabremos en tres meses si funcionó? Un número concreto, no "más
  visibilidad".
- ¿Quién visita el sitio? Edad, idioma, si llega desde el móvil o el escritorio,
  si ya conoce la marca o llega desde una búsqueda.
- ¿De dónde llegará el tráfico? Búsqueda, Instagram, WhatsApp, publicidad, un
  código QR impreso.

## 3. Contenido ⚠︎

**El contenido es lo que más retrasa un proyecto web.** No la programación. Un
sitio terminado sin textos ni fotos no se puede entregar.

- ¿Quién escribe los textos: el cliente o nosotros? Si es el cliente, **¿para
  cuándo?**
- ¿Hay fotos profesionales? ¿Cuántas, de qué, y en qué resolución?
- **¿Tenemos derechos sobre esas fotos?** Si salen personas identificables, ¿hay
  autorización de uso de imagen?
- ¿Hay logo en vectorial (SVG/AI)? ¿Manual de marca, o hay que definir paleta y
  tipografías?
- ¿Hay vídeo? ¿Dónde se aloja? (nunca en el hosting compartido)
- ¿Quién va a mantener el contenido después de entregar, y con qué frecuencia?

## 4. Alcance funcional

Marca lo que aplica y describe lo que no encaje en la lista.

- [ ] Sitio informativo (páginas fijas)
- [ ] Catálogo de productos/servicios administrable desde un panel
- [ ] Formulario de contacto o solicitud
- [ ] Reservas con calendario y disponibilidad real ⚠︎ *(cambia la arquitectura
      entera; decidir el primer día)*
- [ ] Pagos en línea ⚠︎ *(pasarela, quién recibe el dinero, facturación)*
- [ ] Cuentas de usuario para el visitante ⚠︎
- [ ] Blog o noticias
- [ ] Reseñas o testimonios (¿los escribe el cliente o los envían los visitantes?
      si es lo segundo, hace falta moderación)
- [ ] Galería de imágenes
- [ ] Buscador o filtros
- [ ] Chat en vivo / WhatsApp
- [ ] Boletín de correo

**Para cada cosa administrable, pregunta siempre:** ¿quién la va a editar y qué
tan a menudo? Si la respuesta es "casi nunca", quizá no necesita panel: sale más
barato que lo cambiemos nosotros una vez al año.

## 5. Idiomas ⚠︎

- ¿Uno o varios? ¿Cuáles?
- ¿Se traduce **todo** o solo parte?
- ¿Quién traduce? ¿Traductor profesional, el cliente, o automático revisado?
- ¿Los precios cambian según el idioma o la moneda?

> Añadir un segundo idioma a un sitio construido para uno solo obliga a tocar el
> esquema de la base de datos, el enrutado, el panel y todos los textos. **Si hay
> la menor posibilidad de que se pida más adelante, se construye multiidioma
> desde el principio** aunque arranque con uno.

## 6. Identidad y diseño

- ¿Hay referencias visuales que le gusten al cliente? Pídele 3 sitios y **qué**
  le gusta de cada uno.
- ¿Hay algo que rechace explícitamente?
- ¿Tono: cercano, institucional, lujoso, técnico?
- ¿Cuánta animación? *(mucha animación se ve bien en la presentación y molesta a
  quien usa el sitio a diario; acordarlo por escrito evita discusiones después)*
- ¿Quién aprueba el diseño y en cuántas rondas?

## 7. Legal y datos personales ⚠︎

En Colombia, si el sitio recoge cualquier dato personal —un formulario de
contacto ya lo es— aplica la **Ley 1581 de 2012** y el **Decreto 1377 de 2013**.

- ¿Qué datos se recogen y para qué se van a usar?
- ¿Hay política de privacidad? ¿La redacta el cliente, su abogado, o nosotros?
- ¿Casilla de autorización explícita en cada formulario? *(obligatoria; y hay que
  guardar cuándo se dio y a qué versión de la política)*
- ¿Cuánto tiempo se conservan los datos y quién los borra?
- ¿Hay identificadores obligatorios del sector que deban exhibirse? *(turismo:
  **RNT**; salud: registro sanitario; alimentos: INVIMA; educación: licencia)*
- ¿Términos y condiciones? ¿Política de cancelación?
- ¿Público objetivo en Europa? Entonces también GDPR, y cambia el consentimiento
  de cookies.

## 8. Infraestructura y accesos ⚠︎

- ¿Quién es el dueño del dominio? **A nombre de quién está registrado.**
- ¿Quién paga el hosting y a nombre de quién está la cuenta?
- ¿Hosting existente o nuevo? ¿Compartido o VPS?
- **Si es compartido, mide los límites el primer día** (ver playbook, sección 12).
- ¿Hay otros sitios en la misma cuenta? *(si los hay, un error nuestro los tumba
  a todos — ya nos pasó)*
- ¿El correo del dominio está en el mismo servidor o en Google/Microsoft? *(si
  está fuera, los registros MX no se tocan)*
- ¿Repositorio? **Siempre privado.** ¿A nombre de quién?
- ¿Quién tiene los accesos cuando el proyecto termine?

> **Deja constancia por escrito de quién es dueño de qué.** El día que el cliente
> se vaya con otro proveedor —o vuelva dos años después— esto es lo único que
> importa.

## 9. Correo saliente

- ¿Desde qué dirección salen los correos automáticos?
- ¿A quién le llegan los avisos de cada solicitud? ¿Una persona o varias?
- ¿Esa persona revisa ese buzón de verdad, todos los días?
- ¿Hay SPF/DKIM configurados? *(sin ellos, los correos caen en spam)*

## 10. Medición

- ¿Google Analytics, Meta Pixel, Search Console?
- ¿Quién tiene esas cuentas?
- ¿Qué se considera una conversión?
- ¿Hace falta un panel interno con métricas, o basta con Analytics?

## 11. Plazos, alcance y dinero

- ¿Fecha de lanzamiento? ¿Está atada a algo (temporada, feria, campaña)?
- ¿Qué pasa si el contenido llega tarde? *(acordarlo ahora, no cuando pase)*
- ¿Qué incluye el precio y qué no?
- ¿Cuántas rondas de cambios?
- ¿Hay mantenimiento después? ¿Mensual, por horas, o nada?
- ¿Quién responde si el sitio se cae un domingo?

## 12. Después de entregar

- ¿Se capacita al cliente en el panel? ¿Con manual, con vídeo, en persona?
- ¿Quién hace las copias de seguridad y cada cuánto?
- ¿Cómo se piden cambios: WhatsApp, correo, un sistema?

---

# Parte 2 — Especificación técnica base

Arquitectura por defecto. Sirve para un sitio de catálogo administrable en
hosting compartido, que es el caso más común. Si el proyecto necesita otra cosa,
que sea una decisión consciente y anotada, no una improvisación.

## Stack

| Capa | Tecnología | Versión de referencia |
|---|---|---|
| Sitio público | React + Vite + TypeScript | React 19, Vite 8, TS 6 |
| Estilos | Tailwind CSS | v4 |
| Animación | GSAP + ScrollTrigger, Lenis | GSAP 3.15, Lenis 1.3 |
| Idiomas | react-i18next, prefijo en la URL | 17.x |
| Enrutado | React Router | v7 |
| Panel | React + Vite, **app independiente** | mismo stack |
| API | Fastify + TypeScript (ESM) | Fastify 5 |
| Base de datos | MariaDB/MySQL vía **mysql2**, SQL directo | mysql2 3.x |
| Validación | Zod | v4 |
| Sesiones | JWT + bcryptjs | — |
| Correo | Nodemailer | v9 |
| Imágenes | sharp *(carga diferida)* | 0.35 |

## Estructura del repositorio

Un solo repo privado, tres aplicaciones:

```
web/     sitio público        → se compila a estático
admin/   panel interno        → estático, se sirve bajo /admin
api/     backend Fastify      → aplicación Node en el servidor
deploy/  .htaccess y plantillas de configuración
scripts/ publicar.sh, generar-sql.sh
DEPLOY.md   runbook del proyecto
```

## Decisiones que no se discuten

**SQL directo, nunca un ORM pesado en producción.** Prisma tumbó una cuenta de
hosting compartido entera: su motor en Rust dimensiona hilos según los núcleos
del anfitrión (64+), no según el límite del contenedor, y agota los procesos
disponibles. Se llevó por delante los otros sitios del cliente. Prisma se queda
como herramienta **local** para modelar el esquema y generar el SQL de
migración; en el servidor solo corre `mysql2`, que es JavaScript puro.

**Se compila en local, el servidor solo copia.** El servidor compartido no
aguanta un `npm run build`. Los artefactos viajan por ramas de git dedicadas.

**Sin Docker, sin CI/CD, sin GitHub Actions.** No aportan nada en este tipo de
hosting y añaden superficie de fallo.

**Panel separado del sitio público.** Dos aplicaciones distintas: el peso del
panel no lo carga el visitante, y un fallo en uno no tumba al otro.

**El contenido traducible vive en tablas de traducción**, una fila por idioma,
no en columnas `titulo_es`, `titulo_en`.

**Cada formulario guarda el consentimiento**: fecha y versión de la política.

## Convenciones

- Código y comentarios **en español**, como el resto de nuestros proyectos.
- Los comentarios explican **por qué**, no qué. Si algo parece raro, el comentario
  dice qué pasó cuando se hizo de la forma obvia.
- Nombres de variables en español; nombres de tablas y columnas en inglés
  (convención de base de datos).
- `tsc --noEmit` limpio antes de cada commit.
- Un commit por asunto, con el porqué en el cuerpo del mensaje.

---

# Parte 3 — Lo que sale caro si se decide tarde

Ordenado por lo que cuesta arreglarlo después.

| Decisión | Si se decide tarde |
|---|---|
| **Multiidioma** | Rehacer esquema, enrutado, panel y todos los textos |
| **Reservas con disponibilidad real** | Cambia el modelo de datos entero |
| **Pagos en línea** | Pasarela, seguridad, facturación, conciliación |
| **Cuentas de usuario** | Autenticación, recuperación de clave, datos personales |
| **Quién es dueño del dominio** | Discusiones legales cuando la relación termina |
| **Límites del hosting** | Descubrirlos en producción, con el sitio caído |
| **Quién escribe los textos** | El sitio terminado esperando meses sin lanzarse |

---

# Parte 4 — Antes de dar el proyecto por cerrado

Lista sacada de fallos reales que encontramos **después** de publicar. Todos
parecían funcionar hasta que alguien miró de cerca.

## Enrutado y servidor

- [ ] **Toda ruta profunda responde 200 al recargar**, no solo la portada.
      `/planes`, `/en/planes`, `/algo/x`. Sin la reescritura del `.htaccess` el
      sitio *parece* funcionar —React Router navega sin tocar el servidor— y solo
      falla al recargar, al abrir un enlace compartido o al cambiar de idioma.
- [ ] El panel responde en sus rutas virtuales (`/admin/loquesea`)
- [ ] La API responde y llega a la base de datos
- [ ] HTTPS con certificado válido, incluido `www`

## Imágenes y compartir

- [ ] **Cada imagen responde con su tipo real**, no `text/html`. Un `200` no basta:
      si el archivo no existe, el fallback del `.htaccess` devuelve el `index.html`
      y parece que está. Comprobar con `curl -sI` y mirar el `content-type`.
- [ ] La imagen de Open Graph existe y mide 1200×630
- [ ] Pegar un enlace en WhatsApp y ver que sale con foto
- [ ] Qué se ve cuando un registro **no tiene imagen** *(un `<img src="">` dibuja
      el icono de roto del navegador)*

## Responsive

- [ ] Probado a **375 px reales**. Las herramientas de desarrollo del navegador a
      veces no bajan de cierto ancho: usar un iframe de 375 px, que sí crea un
      viewport propio para las consultas de medios.
- [ ] **Sin desbordamiento horizontal**: `document.documentElement.scrollWidth`
      igual a `innerWidth`. *(Ojo con rejillas de una columna: su ancho `auto` se
      resuelve al del contenido, y un carrusel con scroll interno estira la
      columna y arrastra la página entera)*
- [ ] Portátiles **bajos** (900×533), no solo estrechos. Ahí es donde los
      elementos anclados arriba y abajo se tocan.
- [ ] Nada con altura fija que pueda recortar texto de largo variable

## Formularios y correo

- [ ] Enviar uno de verdad y **comprobar que el correo llega**, no solo que la
      API devuelve 201 *(los envíos suelen ir fuera del camino de la respuesta)*
- [ ] Revisar que no caiga en spam
- [ ] El correo se ve bien en Gmail, Outlook y el webmail del cPanel
- [ ] Aviso interno con enlace para responder de un clic
- [ ] Casilla de consentimiento obligatoria, y se guarda

## Correo maquetado (si lo hay)

- [ ] Tablas y estilos en línea *(Outlook en Windows renderiza con el motor de
      Word: ni flexbox ni grid)*
- [ ] **Ni WebP ni SVG** *(Outlook no lee el primero, Gmail descarta el segundo)*
- [ ] URL absolutas en todas las imágenes
- [ ] Versión de texto plano, generada del mismo contenido que el HTML
- [ ] Por debajo de 102 KB *(Gmail recorta a partir de ahí)*

## Seguridad

- [ ] Repositorio privado
- [ ] Ninguna contraseña ni clave en el repositorio
- [ ] Claves de firma de sesión generadas en el servidor, no pegadas en un chat
- [ ] Contraseña del panel cambiada, y que no siga un patrón adivinable
- [ ] Llaves de despliegue de servidores viejos revocadas
- [ ] Lo que escribe el usuario se escapa antes de pintarlo
- [ ] Límite de peticiones en los formularios públicos

## Contenido y legal

- [ ] Ningún texto de relleno ni contenido de prueba publicado
- [ ] Ningún registro de prueba en la base de datos de producción
- [ ] Política de privacidad enlazada desde cada formulario
- [ ] Identificadores obligatorios del sector visibles
- [ ] Todos los idiomas revisados por alguien que los hable

## Rendimiento y SEO

- [ ] Imágenes en WebP y con el tamaño que se muestran
- [ ] `sitemap.xml` con todas las URL de todos los idiomas
- [ ] `robots.txt` correcto
- [ ] `hreflang` entre idiomas *(sin él, Google los toma por contenido duplicado)*
- [ ] Título y descripción propios en cada página
- [ ] Datos estructurados del tipo que corresponda

## Entrega

- [ ] Cliente capacitado en el panel
- [ ] Accesos entregados y anotados
- [ ] Copias de seguridad configuradas
- [ ] Acordado quién responde si algo falla

---

# Parte 5 — Sobre este documento

Lo que aquí falta —hosting, `.htaccess`, variables de entorno, ramas de build,
límites del servidor compartido, el puente `app.cjs` para Passenger, qué hacer
cuando la cuenta se queda sin procesos— está en
[`PLAYBOOK-BANAHOSTING.md`](PLAYBOOK-BANAHOSTING.md).

Cada proyecto que termine debería dejar aquí lo que aprendió. Si algo falló y no
estaba en la lista de la Parte 4, añádelo.
