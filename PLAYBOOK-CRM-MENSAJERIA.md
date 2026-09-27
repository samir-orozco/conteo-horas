# Playbook — CRM de mensajería y automatizaciones

Módulo portátil de mensajería: bandeja tipo Intercom, pipelines, etiquetas,
handoff humano y automatizaciones tipo ManyChat sobre WhatsApp, Instagram y
Facebook.

**Estado: diseño aprobado, sin código escrito.** Este documento se revisa antes
de tocar el esquema (regla del CLAUDE.md §4: los cambios de esquema se hablan
antes).

---

## 1. Qué es y qué no es

**Es** una carpeta autocontenida —`modules/mensajeria/`— que se copia tal cual a
cualquier proyecto de Krumlab. Trae su backend, su interfaz, su esquema de base
de datos y su README. Se instala cambiando **un solo archivo**: `config.ts`.

**No es** multi-tenant. Una instalación = una cuenta. Si el proyecto B necesita
mensajería, copia la carpeta y pone sus credenciales; no comparte datos con el
proyecto A. Esa fue la decisión y simplifica todo: no hay `cuentaId` que arrastrar
por cada consulta, no hay aislamiento que auditar.

**Sí soporta varios canales dentro de una instalación:** un número de WhatsApp +
una cuenta de Instagram + una página de Facebook conviven en la misma bandeja.
Eso es `msgCanal`, y es distinto de multi-tenant.

En HoraPro vive bajo el Super Admin (`requireSuperAdmin`), al lado de
`AdminEmpresas` y `AdminAfiliados`.

---

## 2. Decisiones tomadas

| Decisión | Elegido | Consecuencia |
|---|---|---|
| Alcance | Una cuenta por instalación | Sin `cuentaId`, sin multi-tenant, esquema plano |
| Canales fase 1 | Instagram/Facebook **y** WhatsApp en paralelo | Valida el adaptador contra dos APIs muy distintas desde el principio |
| Reuso | Carpeta que se copia | Cero dependencias hacia el proyecto anfitrión |
| Interfaz | Backend + UI viajan juntos | Componentes React con colores por variables CSS |
| Proveedor WhatsApp | Twilio (cuenta ya creada) | Meta directo entra después como otro adaptador |
| Proveedor IG/FB | Meta directo, obligatorio | Twilio no tiene comentarios de Instagram. No existe alternativa |

---

## 3. El hallazgo que define la arquitectura

**Twilio no puede hacer lo tipo ManyChat.** Comentario → DM de Instagram no
existe en ningún producto de Twilio. Se hace contra la API de Meta: webhook del
campo `comments` + el mecanismo de *Private Replies* del Instagram Messaging API.

O sea: desde el día 1 conviven **dos integraciones con formas completamente
distintas**. Twilio habla en `From`/`To`/`ContentSid` con webhooks
`application/x-www-form-urlencoded`; Meta habla en `entry[].changes[]` con JSON y
firma `X-Hub-Signature-256`.

Por eso el adaptador de canal no es un lujo de diseño: es la única forma de que
el CRM no se convierta en un `if (esTwilio)` gigante. Y es lo que hace que migrar
WhatsApp a Meta directo —o meter Telegram, o RCS— sea escribir un archivo.

### La buena noticia

Instagram **no necesita número de teléfono ni verificación de WhatsApp**. Solo
una Meta App, una cuenta de Instagram Business y un webhook HTTPS. Es trabajo
real que arranca ya, mientras la verificación de Meta para WhatsApp avanza en
paralelo.

### Las reglas duras de cada canal

Esto no es trivia: cada una obliga a algo en el código.

**WhatsApp — ventana de 24 h.**
El cliente escribe → se abre la ventana → respondes texto libre, gratis. Se
cierra → solo plantillas pre-aprobadas y pagadas. El compositor **se bloquea**
cuando la ventana está cerrada y ofrece plantillas en su lugar. Si no se bloquea,
alguien escribe un mensaje largo, revienta con error `63016`, y cree que el
sistema está roto.

**WhatsApp — plantillas por `ContentSid`.**
Twilio está deprecando el envío de plantillas por el parámetro `body`. Si se
construye con la forma vieja, nace roto. Se usa Content Template Builder desde el
primer día.

**Instagram — la private reply es de un solo tiro.**
Meta permite **una private reply por comentario, para siempre**, y solo hasta 7
días después del comentario. A cambio, salta la ventana de 24 h. Si el bot falla
en ese intento, no hay segundo intento. Esto exige idempotencia real: la tabla
`msgEjecucion` con `claveIdempotencia = "private_reply:<idComentario>"` y índice
único. No es opcional ni "lo agregamos después".

**Instagram/Facebook — ventana de 24 h + etiqueta de agente humano.**
Igual que WhatsApp, con la diferencia de que la etiqueta `human_agent` extiende
la ventana a 7 días cuando responde una persona. Hay que usarla en el handoff.

**Media de Meta expira.**
Las URLs de imágenes y audios entrantes son firmadas y caducan. Si se guarda solo
la URL, en dos días los adjuntos del historial se ven rotos. Se descarga y se
guarda al recibir.

---

## 4. El contrato de reuso

Estas tres reglas son lo que hace que copiar y pegar funcione de verdad. Si se
rompe una, el módulo deja de ser portátil y no nos damos cuenta hasta que
intentamos copiarlo al segundo proyecto.

**Regla 1 — Ningún archivo dentro de `modules/mensajeria/` importa nada de
fuera.** Ni `../../utils/telegram`, ni `../../prisma`, ni tipos del anfitrión.
Verificable con un grep en CI:

```bash
grep -rn "from '\.\./\.\./" modules/mensajeria/ && echo "ROTO: import fuera del módulo"
```

**Regla 2 — Todo lo específico del proyecto entra por `config.ts`.** Credenciales,
URL base, y —esto es lo importante— **ganchos**. El módulo no sabe mandar un
Telegram; sabe llamar a `config.notificar()`. HoraPro le pasa su
`enviarTelegram`; otro proyecto le pasa un Slack, un correo o nada.

**Regla 3 — Las tablas del módulo no tienen llaves foráneas hacia el anfitrión.**
Un contacto se enlaza con lo que sea del proyecto por referencia suelta:

```
msgContacto.referenciaExternaTipo = "empresa"
msgContacto.referenciaExternaId   = "clx3k9..."
```

El módulo nunca hace join contra `empresas`. Cuando la ficha lateral necesita
mostrar el estado de suscripción, llama a `config.resolverReferencia(tipo, id)`,
que en HoraPro consulta `Empresa` + `Suscripcion` y devuelve un objeto genérico
`{ titulo, subtitulo, campos[], enlace }`. En otro proyecto devolverá un pedido,
un paciente o un curso.

Esa función de tres líneas es la diferencia entre un módulo portátil y uno
casado con HoraPro para siempre.

---

## 5. Estructura

```
modules/mensajeria/
├── README.md                    ← instalar en un proyecto nuevo, paso a paso
├── prisma/
│   └── mensajeria.prisma        ← modelos, sin FK al anfitrión
├── backend/
│   ├── config.ts                ← ÚNICO archivo que se toca por proyecto
│   ├── index.ts                 ← registrarMensajeria(app, config)
│   ├── tipos.ts                 ← contratos compartidos
│   ├── canales/
│   │   ├── canal.ts             ← la interfaz
│   │   ├── simulado.ts          ← canal falso: desarrollo y pruebas sin credenciales
│   │   ├── twilio-whatsapp.ts
│   │   ├── meta-instagram.ts
│   │   ├── meta-facebook.ts
│   │   └── meta-whatsapp.ts     ← futuro; nada más se toca
│   ├── nucleo/
│   │   ├── ventanas.ts          ← puro · TDD
│   │   ├── conversaciones.ts
│   │   ├── idempotencia.ts      ← puro · TDD
│   │   ├── tareas.ts            ← temporizadores sin cron
│   │   └── automatizaciones/
│   │       ├── motor.ts         ← puro · TDD
│   │       ├── disparadores.ts
│   │       ├── condiciones.ts   ← puro · TDD
│   │       └── acciones.ts
│   └── rutas/
│       ├── webhooks.ts          ← público, con verificación de firma
│       └── api.ts               ← protegido por config.autorizar()
└── frontend/
    ├── tokens.css               ← paleta por variables CSS
    ├── api.ts                   ← cliente axios, baseURL por config
    ├── componentes/
    │   ├── Bandeja.tsx  Hilo.tsx  Compositor.tsx  FichaContacto.tsx
    │   ├── RelojVentana.tsx  Kanban.tsx  EditorAutomatizacion.tsx
    └── paginas/
        └── Inbox.tsx  Pipelines.tsx  Automatizaciones.tsx  Plantillas.tsx  Canales.tsx
```

### El canal simulado es la pieza clave

`canales/simulado.ts` implementa la misma interfaz que Twilio y Meta, pero
guarda los mensajes salientes en memoria y permite inyectar entrantes desde un
test o desde un botón de la UI en modo desarrollo.

Con él, **todo el motor —bandeja, pipelines, automatizaciones, SLA— se construye
y se prueba sin una sola credencial.** Es lo que desbloquea la fase 0 mientras no
haya número. Y después queda como el arnés de pruebas permanente: las pruebas del
motor de automatizaciones no tocan la red nunca.

### Esquema Prisma multi-archivo

El proyecto está en Prisma 5.22, donde el esquema multi-archivo es preview:

```prisma
generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["prismaSchemaFolder"]
}
```

Requiere mover `schema.prisma` a `prisma/schema/`. Si eso incomoda —y en este
proyecto incomoda, porque las migraciones ya están desfasadas del schema real—
la alternativa es más tonta y más segura: `mensajeria.prisma` se mantiene como
**fragmento** dentro del módulo y el README indica pegarlo al final del
`schema.prisma` del proyecto, entre marcas:

```
// ===== INICIO MÓDULO MENSAJERÍA — no editar a mano =====
// ===== FIN MÓDULO MENSAJERÍA =====
```

Menos elegante, cero riesgo, y copiar/pegar sigue siendo copiar/pegar.
**Recomendación: el fragmento.**

---

## 6. Modelo de datos

Todo con prefijo `msg` para que se vea de una que no es del proyecto y no choque
con tablas existentes.

```prisma
// Un canal = un número de WhatsApp, una cuenta de IG, una página de FB
model msgCanal {
  id                   String   @id @default(cuid())
  tipo                 String   // WHATSAPP_TWILIO | INSTAGRAM | FACEBOOK | WHATSAPP_META | SIMULADO
  nombre               String
  identificadorExterno String   // +573001234567 | ig user id | page id
  credenciales         String   @db.Text  // JSON cifrado con config.claveCifrado
  activo               Boolean  @default(true)
  creadoEn             DateTime @default(now())
  @@unique([tipo, identificadorExterno])
}

model msgContacto {
  id                    String   @id @default(cuid())
  nombre                String?
  avatarUrl             String?
  // Enlace suelto con el proyecto anfitrión. Sin FK. Sin join.
  referenciaExternaTipo String?  // "empresa" en HoraPro
  referenciaExternaId   String?
  consentimiento        Boolean  @default(false)
  consentimientoEn      DateTime?
  consentimientoOrigen  String?  // "landing" | "comentario_ig" | "manual"
  atributos             Json?    // libre: ciudad, plan de interés, lo que sea
  bloqueado             Boolean  @default(false)
  creadoEn              DateTime @default(now())
  @@index([referenciaExternaTipo, referenciaExternaId])
}

// Un contacto puede tener varias identidades: WhatsApp +57..., Instagram 178...
model msgIdentidad {
  id         String @id @default(cuid())
  contactoId String
  canalId    String
  valor      String
  @@unique([canalId, valor])
}

model msgConversacion {
  id                 String    @id @default(cuid())
  canalId            String
  contactoId         String
  estado             String    @default("ABIERTA") // ABIERTA | PENDIENTE | SNOOZE | CERRADA
  asignadoA          String?   // msgAgente.id
  etapaId            String?
  ventanaExpiraEn    DateTime? // ← el corazón de la UI
  ultimoEntranteEn   DateTime?
  ultimoMensajeEn    DateTime?
  primeraRespuestaEn DateTime? // para el SLA
  snoozeHasta        DateTime?
  prioridad          Int       @default(0)
  atributos          Json?
  creadoEn           DateTime  @default(now())
  @@index([estado, ultimoMensajeEn])
}

model msgMensaje {
  id             String   @id @default(cuid())
  conversacionId String
  direccion      String   // ENTRANTE | SALIENTE | NOTA
  autorTipo      String   // CONTACTO | AGENTE | BOT | SISTEMA
  autorId        String?
  tipo           String   // TEXTO | IMAGEN | AUDIO | VIDEO | DOCUMENTO | PLANTILLA
  texto          String?  @db.Text
  adjuntos       Json?
  plantillaId    String?
  variables      Json?
  idExterno      String?  @unique  // ← idempotencia de webhooks
  estado         String   @default("PENDIENTE") // PENDIENTE|ENVIADO|ENTREGADO|LEIDO|FALLIDO
  errorCodigo    String?
  errorTexto     String?  @db.Text
  creadoEn       DateTime @default(now())
  @@index([conversacionId, creadoEn])
}

model msgEtiqueta              { id String @id @default(cuid())  nombre String @unique  color String }
model msgConversacionEtiqueta  { conversacionId String  etiquetaId String  @@id([conversacionId, etiquetaId]) }
model msgPipeline             { id String @id @default(cuid())  nombre String  esPredeterminado Boolean @default(false) }
model msgEtapa                { id String @id @default(cuid())  pipelineId String  nombre String  orden Int  color String }

model msgPlantilla {
  id        String  @id @default(cuid())
  canalId   String
  nombre    String
  categoria String  // MARKETING | UTILIDAD | AUTENTICACION
  idioma    String  @default("es")
  idExterno String? // ContentSid de Twilio
  cuerpo    String  @db.Text
  variables Json?
  estado    String  @default("BORRADOR") // BORRADOR | PENDIENTE | APROBADA | RECHAZADA
}

model msgAutomatizacion {
  id          String  @id @default(cuid())
  nombre      String
  activa      Boolean @default(false)
  prioridad   Int     @default(0)
  disparador  Json    // { tipo, ... }
  condiciones Json    // [{ campo, operador, valor }]
  acciones    Json    // [{ tipo, ... }]
}

// Bitácora + candado de idempotencia. Salva la private reply de un solo tiro.
model msgEjecucion {
  id                 String   @id @default(cuid())
  automatizacionId   String?
  conversacionId     String?
  claveIdempotencia  String   @unique  // "private_reply:<idComentario>"
  estado             String   // EJECUTADA | FALLIDA | OMITIDA
  resultado          Json?
  creadoEn           DateTime @default(now())
}

// Todo webhook crudo se guarda antes de procesarse. Sin esto, un bug se lleva
// mensajes de clientes que no se pueden recuperar.
model msgEventoWebhook {
  id          String    @id @default(cuid())
  canalId     String?
  idExterno   String?   @unique
  payload     Json
  procesadoEn DateTime?
  intentos    Int       @default(0)
  error       String?   @db.Text
  creadoEn    DateTime  @default(now())
}

// Temporizadores sin cron
model msgTarea {
  id          String   @id @default(cuid())
  tipo        String   // ENVIAR | CERRAR | ESCALAR | REINTENTAR
  ejecutarEn  DateTime
  carga       Json
  estado      String   @default("PENDIENTE")
  intentos    Int      @default(0)
  @@index([estado, ejecutarEn])
}

// Espejo del usuario del anfitrión. Sin FK: se sincroniza por config.
model msgAgente {
  id                  String  @id @default(cuid())
  referenciaExternaId String  @unique  // Usuario.id en HoraPro
  nombre              String
  avatarUrl           String?
  activo              Boolean @default(true)
}
```

Dos cosas que quiero que mires con atención antes de aprobar:

- **`msgEventoWebhook` guarda el payload crudo antes de procesar.** Cuesta espacio
  y parece paranoia. No lo es: si un bug tumba el procesamiento, sin esta tabla
  se pierden mensajes de clientes reales y no hay forma de recuperarlos. Meta y
  Twilio reintentan poco y por poco tiempo.
- **`msgTarea` reemplaza al cron.** El proyecto no usa cron (igual que el
  auto-cierre de turnos). Las tareas se procesan al vuelo en cada webhook y en
  cada carga del inbox. Límite honesto: si no entra tráfico, una acción diferida
  se retrasa. Para el volumen de HoraPro no importa; si algún día importa, se
  cuelga un cron de cPanel a `/api/mensajeria/tareas/procesar` y ya.

---

## 7. El motor de automatizaciones

Guardado como JSON para que la interfaz lo pueda construir, y evaluado por una
función pura:

```ts
evaluar(automatizaciones, evento, contexto) → Accion[]
```

Pura significa: sin base de datos, sin red, sin `new Date()` interno (el reloj
entra por parámetro). Es lo que la hace probable, y es la parte que calcula
respuestas automáticas a clientes — el equivalente al motor de horas.

**Disparadores:** `mensaje_entrante` · `comentario_nuevo` · `palabra_clave` ·
`historia_mencionada` · `conversacion_creada` · `etapa_cambiada` ·
`sin_respuesta_en` · `ventana_por_expirar`

**Condiciones:** canal · texto contiene / regex · tiene etiqueta · es primer
mensaje · dentro de horario laboral · atributo del contacto · etapa actual

**Acciones:** `responder_texto` · `responder_plantilla` · `private_reply` ·
`enviar_archivo` (las guías) · `poner_etiqueta` · `quitar_etiqueta` ·
`mover_etapa` · `asignar_a` · `esperar` · `avisar_humano` · `guardar_atributo` ·
`llamar_webhook`

El caso ManyChat clásico queda así:

```
disparador:  comentario_nuevo, canal Instagram, palabra clave "GUIA"
condiciones: no tiene etiqueta "ya_recibio_guia"
acciones:    private_reply → "¡Hola! Te mando la guía por acá 👇"
             enviar_archivo → guia-control-horas.pdf
             poner_etiqueta → "lead_guia"
             mover_etapa → "Interesado"
             guardar_atributo → origen = "comentario_ig"
```

Y el handoff:

```
disparador:  sin_respuesta_en 15 min, conversación sin asignar
acciones:    avisar_humano → config.notificar() → Telegram del vendedor
             poner_etiqueta → "esperando_humano"
```

`avisar_humano` no sabe qué es Telegram. Llama a `config.notificar()`. En HoraPro
eso es el `enviarTelegram` que ya funciona; en el próximo proyecto será otra cosa.

---

## 8. Interfaz

Copiamos la anatomía de Intercom porque está resuelta, no por gusto:

**Inbox — cuatro columnas.** Navegación estrecha · lista de conversaciones ·
hilo · ficha lateral. La ficha muestra asignado, etiquetas, atributos y —vía
`config.resolverReferencia()`— los datos del proyecto: en HoraPro, plan,
estado de suscripción y colaboradores activos de esa empresa.

**Lo que sí copiamos y hace la diferencia:**
- Burbuja saliente en color, entrante en gris, notas internas en amarillo.
- Los pasos del bot **visibles dentro del hilo**, en gris pequeño
  ("Automatización *Guía IG* ejecutada · private reply enviada"). Ver qué hizo
  el bot y por qué, sin salir de la conversación, es lo mejor del diseño de
  Intercom.
- El reloj de la ventana de 24 h en el encabezado, y el compositor bloqueado
  cuando expira.
- Tipografía densa: 13–14 px, mucha información sin apretar.

**Lo que no copiamos:** todo lo de IA. Fase 5, si acaso.

**Paleta por variables CSS** en `tokens.css`, para que HoraPro use amarillo y
grafito y el próximo proyecto use lo suyo cambiando seis líneas:

```css
:root {
  --msg-fondo: #f7f7f8;      --msg-superficie: #ffffff;
  --msg-borde: #e5e5e7;      --msg-texto: #1a1a1a;
  --msg-saliente-fondo: #f5c116;  --msg-saliente-texto: #1a1a1a;
  --msg-entrante-fondo: #eeeef0;  --msg-nota-fondo: #fff4d6;
  --msg-acento: #f5c116;     --msg-radio: 12px;
}
```

---

## 9. Fases

**F0 — Cimientos, sin credenciales** (arranca ya)
Esquema · `config.ts` · interfaz de canal · canal simulado · motor de
automatizaciones con pruebas · cálculo de ventanas con pruebas · idempotencia.
*Entregable: `npm test` en verde y una conversación simulada de punta a punta.*

**F1 — Adaptadores reales** (los dos en paralelo, como pediste)
Meta App + webhook de Instagram/Facebook con verificación de firma · Twilio
WhatsApp contra el sandbox · almacenamiento de media · reintentos.
*Entregable: un DM real de Instagram aparece en la base de datos.*

**F2 — Bandeja**
Las cuatro columnas · hilo con adjuntos · compositor con bloqueo de ventana ·
asignación · notas internas · cerrar/snooze.
*Entregable: se puede atender un cliente sin abrir el celular.*

**F3 — Pipelines, etiquetas y ficha**
Kanban · arrastrar entre etapas · etiquetas de color · `resolverReferencia` con
los datos de HoraPro.
*Entregable: ver la conversación de ventas junto al estado de suscripción.*

**F4 — Automatizaciones**
Editor visual (formulario disparador → condiciones → acciones; nodos
arrastrables no, eso es caro y no aporta todavía) · comment-to-DM · envío de
guías · pasos del bot visibles en el hilo.
*Entregable: comentas "GUIA" en un post y llega el PDF por DM.*

**F5 — Handoff y SLA**
Escalamiento por tiempo · aviso por Telegram · etiqueta `human_agent` para
extender la ventana · panel de tiempos de primera respuesta.

**F6 — WhatsApp producción**
Cuando llegue el número y la verificación: cargar credenciales, registrar
plantillas en Content Template Builder, cambiar el canal de sandbox a
producción. **Solo configuración, cero código** — si el adaptador quedó bien
hecho.

**F7 — Extracción**
Copiar `modules/mensajeria/` al segundo proyecto y medir cuánto duele. Ese es el
examen real del diseño. Lo que duela, se arregla acá y se vuelve a copiar.

---

## 10. Lo que hay que conseguir

Marcado por quién lo hace y cuándo bloquea.

**Ya está:** cuenta de Twilio.

**Para F1 — Instagram/Facebook** (tú, esta semana):
1. **Meta App** de tipo Business en developers.facebook.com.
2. **Cuenta de Instagram Business o Creator** (una personal no sirve) vinculada a
   una **Página de Facebook**.
3. Permisos solicitados: `instagram_business_basic`,
   `instagram_business_manage_messages`, `instagram_business_manage_comments`.
4. **Túnel HTTPS para desarrollo** — ngrok o cloudflared. Meta exige HTTPS
   público para el webhook y no acepta `localhost`. Esto no es opcional ni
   evitable; conviene tenerlo antes de F1.
5. Token de verificación del webhook (lo inventamos nosotros).

**Para F1 — WhatsApp sandbox** (tú, 10 minutos):
6. Account SID + Auth Token de Twilio, y unirte al sandbox desde tu celular.

**Para F6 — WhatsApp producción** (tú, con mi ayuda, tarda semanas):
7. Verificación de negocio de Krumlab en Meta Business Manager.
8. Número dedicado. **Ojo: al migrarlo al API deja de funcionar en la app del
   celular.** No uses tu número de ventas actual sin decidirlo a conciencia.
9. Plantillas redactadas y aprobadas una por una.

**Legal, antes del primer mensaje de marketing** (tú):
10. Autorización de tratamiento de datos (Ley 1581 de 2012) en la landing y en el
    registro. Vas a mandar mensajes comerciales a datos personales de
    colombianos. El campo `consentimiento` del esquema existe para esto; hay que
    poder demostrar cuándo y dónde lo dieron.

---

## 11. Pruebas

Vitest ya está instalado y hay pruebas corriendo en `backend/src/utils/`. La
advertencia del CLAUDE.md sobre "cero infraestructura de pruebas" quedó
desactualizada — hay que corregirla.

**Con TDD estricto** (funciones puras, y son las que le hablan al cliente):
`ventanas.ts` · `automatizaciones/motor.ts` · `automatizaciones/condiciones.ts` ·
`idempotencia.ts` · normalización de webhooks de cada canal (payload crudo
guardado → `MensajeEntrante`; el payload de ejemplo se guarda como *fixture*).

**Con pruebas de integración sobre el canal simulado:** el ciclo completo
webhook → conversación → automatización → mensaje saliente. Sin red.

**Verificación manual:** interfaz, y la primera conexión real con Meta y Twilio.

---

## 12. Riesgos

**App Review de Meta.** Los permisos de Instagram necesitan aprobación para
funcionar con usuarios reales; en desarrollo solo andan con cuentas de prueba y
con quien tenga un rol en la app. **No sé con certeza si tu propio comentario en
tu propio post cuenta como caso aprobado sin revisión, y no me voy a inventar la
respuesta.** Se resuelve empíricamente en F1: probamos una private reply real
desde una cuenta ajena. Si funciona, seguimos; si no, arrancamos el App Review de
inmediato, porque tarda y no queremos descubrirlo en F4. **Es la primera prueba
que hay que hacer, no la última.**

**La private reply es irreversible.** Un bug en producción quema comentarios de
forma permanente. Mitigación: `msgEjecucion` con clave única, y un modo de
simulacro que registra la acción sin enviarla, para probar automatizaciones
nuevas sin gastar tiros.

**Credenciales en base de datos.** `msgCanal.credenciales` cifrado con
`config.claveCifrado`. Nunca en texto plano, nunca en logs, nunca en la respuesta
del API al frontend.

**Fuga de portabilidad.** El día que alguien escriba
`import { prisma } from '../../index'` dentro del módulo, se acabó el
copiar y pegar. El grep de la sección 4 va en CI desde el primer commit.

**La trampa del `.env.local`.** Aplica igual que siempre: Vite lo prioriza sobre
`.env` incluso al compilar producción. Antes de `npm run build`, apartarlo y
verificar que el bundle no contenga `localhost` ni el dominio del túnel.

---

## 13. Lo primero que se hace

En cuanto apruebes este documento:

1. `modules/mensajeria/` con `config.ts`, `canales/canal.ts` y
   `canales/simulado.ts`.
2. `nucleo/ventanas.ts` **con las pruebas primero** — es la función más pequeña,
   la más fácil de equivocar (zona horaria de Bogotá, la trampa de siempre) y la
   que decide si un mensaje se puede enviar.
3. El fragmento de esquema, para revisarlo antes de tocar `schema.prisma`.

Nada de esto necesita una credencial. Nada de esto toca producción.
