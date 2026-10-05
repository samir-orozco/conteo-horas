# Pendientes de HoraPro — ordenados por dificultad

Las 33 peticiones del 4 de octubre de 2026, sin las repetidas: **28 trabajos**,
de mayor a menor dificultad.

La escala es un juicio, no una medición. Lo que la sube no es escribir el código:
es que toque dinero, que dependa de un tercero (contador, abogado, Meta) o que
haya que decidir algo antes. Cada trabajo dice qué lo hace grande.

Donde se cita un archivo y una línea, se leyó el código. Lo que viene del
`handoff.md` o de una sesión anterior va dicho así.

Lo hecho el 4 de octubre comparte dos piezas, a propósito: el criterio de
búsqueda vive una sola vez en `lib/busqueda.ts` y la caja en
`components/CajaDeBusqueda.tsx`. Dos buscadores que con lo mismo escrito
encuentran cosas distintas son dos productos.

---

# Nivel 5 — Semanas

## 1. Módulo de usuarios con roles y permisos · petición 4

Usuarios de la empresa con roles, y cada rol con sus permisos.

**Hay hoy:** el backend lista, crea y edita usuarios (`routes/auth.ts:386`,
`:394`, `:407`), con `activo` para apagar uno sin borrarlo, y el esquema tiene
`enum Rol` (`schema.prisma:913`). No hay pantalla en la empresa: «SUPERVISOR» no
aparece en ninguna página del frontend.

**Lo que lo hace grande no es la pantalla, es la puerta.** Los 16 archivos de
rutas de empresa suman **124 endpoints** y hoy **4** miran el rol: configuración
de la empresa (`configuracion.ts:85`, `:119`), clima (`clima.ts:28`) y crear o
editar usuarios (`auth.ts:396`, `:409`). En todo lo demás —registros, reportes,
nómina— un SUPERVISOR hace exactamente lo mismo que un ADMIN: corrige
marcaciones y ve la liquidación.

**Dónde va la guarda, y no es discutible:** en el `preHandler`, pegada a
`requireEmpresa`, como ya se hizo con el módulo de turnos (`utils/capacidades.ts`).
Escrita dentro de cada manejador son 124 oportunidades de olvidarla, que es
exactamente lo que dice la §9.3 del `CLAUDE.md`.

**Tres decisiones antes de empezar:**
1. ¿Roles fijos que definimos nosotros, o que cada empresa arme los suyos? Lo
   segundo es el doble de trabajo y hace falta una pantalla más.
2. ¿Qué es un permiso? ¿«Ver reportes» o «ver el salario en el reporte»? El
   grano fino es lo que decide si esto son dos semanas o cinco.
3. El permiso del usuario se cruza con lo que da el plan. Que una empresa no
   tenga GPS en su plan y que un usuario no tenga permiso de verlo son dos cosas
   distintas, y la pantalla tiene que decir cuál de las dos es.

## 2. APK con marcación sin internet · petición 31

No es empaquetar la web. Lo difícil es qué pasa con una marca que se guardó en
el teléfono y llega tres horas después: contra el auto-cierre, contra la
geocerca, contra el reconocimiento facial —que hoy corre con los rostros de la
empresa cargados en la página— y contra un reloj de teléfono movido a mano.

**Se decide aparte.** Mientras no estén resueltas esas cuatro, no hay nada que
estimar.

---

# Nivel 4 — Días, y toca dinero o depende de un tercero

## 3. Incapacidad de EPS medida distinto · petición 24

Dos reglas: la empresa responde solo por un **porcentaje** de los días, y esos
días **no pagan auxilio de transporte**.

**Bloqueado por el contador:** hacen falta los números exactos y desde cuándo
rigen (los primeros días a cargo del empleador, el porcentaje y su base). Es
cálculo de dinero: ciclo completo de la §2 y comprobación diferencial contra un
período real antes de dar nada por bueno.

## 4. Aprobar horas extras · petición 9

**Hay hoy:** nada. No existe ningún estado de aprobación en las extras.

**La decisión manda sobre el diseño:** mientras una extra está sin aprobar, ¿el
reporte la cuenta o no? Si no la cuenta, el total del período cambia según quién
aprobó qué, y eso hay que verlo en pantalla antes de programarlo.

## 5. Una marca de un día anterior cierra el turno abierto de otro día · petición 11

**Defecto.** Al registrar a mano una jornada de un día pasado, el sistema usa la
marca para cerrar el turno que quedó abierto ese día en vez de crear la jornada
pedida.

Toca horas, o sea dinero. Hace falta reproducirlo con persona, día y hora antes
de tocar nada. La decisión sale a una función pura con sus pruebas y la costura
se comprueba con un script, como manda la §8.6.

## 6. Clima: que el administrador responda al comentario anónimo · peticiones 3 y 29

**Hay hoy:** el módulo de clima, etapa 1, en `develop` (`b0d91f1`) y sin
desplegar: pregunta en el kiosco, buzón al día siguiente, seguimiento de casos.

**Tres partes, y se pueden hacer por separado:**
1. El administrador responde sin saber quién escribió, y la persona ve la
   respuesta en el kiosco. Es lo que la petición 29 señala como lo que más valor
   da: convierte el buzón en una conversación.
2. Resumen de la jornada al terminar, con aviso al administrador cuando algo se
   sale de lo normal.
3. Que el super admin pueda llegar, desde el id de una nota, a quién la escribió.

**El punto 3 está bloqueado por el abogado.** El producto le promete anonimato a
la persona. Que exista una llave para romperlo se defiende solo si el aviso lo
dice claro, el uso queda en auditoría y el texto está aprobado. Callado, es lo
contrario de lo que promete la política de privacidad.

## 7. Que el precio y los beneficios personalizados caduquen solos · petición 28

**Hay hoy:** los tres campos de personalización (`precioModo`, `limiteOverride`,
`funcionesOverride`) **no tienen fecha de vigencia**. Una vez puestos, quedan
para siempre.

**Falta:** fecha de fin por personalización y un trabajo diario que al pasarla
devuelva la empresa a su plan y avise.

**Ojo con el trabajo periódico** — la §8.3 es exactamente de esto: anclado al
reloj y no al arranque del proceso, y que escriba en el log también la pasada en
la que no caducó nada. Un barrido que solo habla cuando hace algo es idéntico a
uno que nunca corrió.

## 8. Recordatorios de entrada y salida por WhatsApp · petición 2

**Hay hoy:** dos canales de salida, Telegram (`utils/telegram.ts`) y correo
(`utils/correo.ts`). De WhatsApp solo el botón de contacto de la landing, que es
un enlace a `wa.me`: no hay forma de mandar un mensaje desde el sistema.

**Depende de Meta y cuesta dinero:** API, número verificado, plantillas
aprobadas una por una, y cada mensaje se paga. Con 180 colaboradores, dos
recordatorios diarios son unos 360 mensajes al día.

**Decisión suya antes de cualquier código:** si compensa frente a Telegram, que
ya está montado y no cuesta.

---

# Nivel 3 — Un día o dos

## 9. Exportar los registros a Excel · peticiones 7, 19 y 32

Entradas, salidas, tiempo de almuerzo y lo demás de la jornada, con botón en la
pantalla de registros.

**Hay hoy:** el motor de Excel (`lib/exportar.ts`) ya existe y lo usan Reportes y
nómina. `Registros.tsx` no lo importa: ahí no hay exportación de ninguna clase.

**Que exporte lo que se está viendo**, respetando el rango, los filtros y la
persona seleccionada, que ya están en esa pantalla. Un botón que exporte todo
ignorando los filtros es un defecto esperando.

## 10. Cambiar el estado de una novedad desde el reporte · petición 23

Aprobar o rechazar sin ir a la ficha de la persona.

Mueve dinero: una novedad aprobada deja de exigir esos días y la liquidación
cambia (lo dice el propio aviso en `ColaboradorDetalle.tsx:734`). En una tabla de
200 filas, el cambio de estado va con confirmación explícita, no con un clic
suelto.

## 11. Marcar fuera del área, con alerta en vez de bloqueo · petición 13

**Hay hoy:** se bloquea. La decisión es una función pura,
`decidirUbicacionDeMarca` (`utils/modalidad.ts:51`), que responde «Estás fuera de
la ubicación de la empresa (a N m). Debes marcar desde el sitio de trabajo.»
(línea 96).

Es el caso más limpio del ciclo de la §2: función pura con pruebas ya escritas
(`modalidad.test.ts`), prueba primero y verla fallar.

**Dos decisiones:** ¿aplica a todos o es opción por empresa? ¿La alerta le llega
al administrador en el momento, o solo se ve en el reporte?

## 12. Enlace para que alguien en la sede capture la ubicación · petición 5

Un enlace de un solo uso y corta vida: la persona que está en la sede lo abre, da
permiso de ubicación y la coordenada queda guardada, sin ser administrador.

**Hay dos patrones iguales de los que copiar:** el código de 6 dígitos que
vincula un aparato al kiosco y el enlace de 1 hora del registro facial.

## 13. Modificar el horario a mano dentro del rotativo · petición 26

Cambiar la hora de un día concreto sin tocar la plantilla del turno.

**Decisión:** ese cambio, ¿sobrevive si después se reaplica la plantilla sobre
esa semana? Si se pierde, hay que avisarlo en pantalla al reaplicar.

## 14. El soporte de pago de Wompi · petición 12

**Hay hoy:** el recibo propio de HoraPro en PDF, con botón en la vista interna de
la empresa (`AdminEmpresaDetalle.tsx:333`) y en `Suscripcion.tsx`; y el
comprobante que el super admin sube a mano para un pago por fuera de la pasarela
(`utils/comprobantes.ts`).

**Falta:** lo que emite Wompi por cada pago de tarjeta o PSE, que hoy no se
guarda ni se muestra.

**Decisión:** si lo que hace falta es una **factura** con requisitos de la DIAN,
eso no es este trabajo — es facturación electrónica con proveedor autorizado y se
habla aparte.

## 15. «No fui yo» en el kiosco · peticiones 15 y 17

**La confirmación de identidad ya está implementada y sin desplegar**
(`79ce047`, con el tope de 0,6 medido en `2ed8a7f`): botón que se sostiene con el
nombre dentro, foto de la ficha al lado de la de ahora, «No soy X», «Salir sin
marcar», cierre de sesión a los 30 s. Eso es lo que resuelve la confusión entre
personas de la petición 17.

**Falta lo único que usted dejó para después:** cuando la persona ve una marca
suya de hace pocos minutos que no hizo, la toca, **no se registra nada**, su
turno sigue abierto y al administrador le llega el aviso con enlace a ese día. Un
toque en el kiosco no mueve horas de nómina; el administrador corrige a mano.

## 16. Página de ayuda · petición 33

**Hay hoy:** la guía de bienvenida (`components/GuiaBienvenida.tsx`) y el menú de
ayuda de la barra (`Layout.tsx:87`), que la reabre a demanda.

**Decisión de alcance primero:** «qué significa cada columna del reporte» y «cómo
se liquida una hora extra» son dos productos distintos.

## 17. Elegir el plan al crear la cuenta · petición 30

**Hay hoy:** `Registro.tsx` no menciona la palabra «plan». Toda cuenta nace en
`PROFESIONAL` (`schema.prisma:77`) con 7 días de prueba.

**Decisión:** ¿la prueba es del plan que eligió, o siempre la completa y el plan
solo aplica al pagar?

---

# Nivel 2 — Medio día

## 18. ~~Buscador en colaboradores~~ · petición 14

**HECHO el 4 de octubre de 2026.** Caja de búsqueda junto a los filtros, por
nombre, apellido o cédula. Se cruza con los filtros y con la pestaña, no los
reemplaza.

Dos cosas que salieron de hacerlo y no estaban pedidas:

- **Buscar a alguien retirado desde «Activos» ya no responde «no hay nada»**,
  que es lo que hace concluir que la persona no está en el sistema. Dice cuántos
  coinciden en la otra pestaña y ofrece «Ver en todos».
- **La tabla ya no se queda en blanco** cuando los filtros no dejan a nadie.
  Antes el mensaje solo salía si la empresa no tenía ningún colaborador, así que
  filtrar hasta cero no decía nada.

## 19. ~~Buscador en revisión de marcaciones~~ · petición 18

**HECHO el 4 de octubre de 2026.** La misma caja, al lado de la ventana de días,
buscando por nombre o cargo (ahí no viaja la cédula).

El filtro alcanza a toda la pantalla, no solo a la lista: el contador, las
flechas y el barrido de fotos se derivan de la misma lista, así que con una
persona buscada el barrido mide solo sus marcaciones. Y al filtrar se vuelve a la
primera, porque el visor pinta la marcación número `idx`: estando en la tercera y
filtrando a una, la pantalla quedaba en blanco sin que nada se quejara.

El vacío quedó partido en dos, que antes era uno: «no hay marcaciones en este
período» manda a ampliar la ventana, y quien tiene un nombre mal escrito necesita
oír otra cosa.

## 20. La sede en la tabla de registros · petición 21

Dos cosas, las dos de presentación: debajo del nombre, la sede **asignada**; en
la jornada, la sede **donde marcó** entrada y salida.

**Hay hoy:** `lib/sedeDeJornada.ts` ya calcula el cruce de sedes y decide si la
columna se muestra; la sede probada se guarda en `registros.sedeId`.

**No mezclar la sede asignada con la sede donde marcó** en la misma celda. Son
dos datos distintos y confundirlos hace que el reporte diga algo que nadie midió.

## 21. Etiqueta de «segundo ingreso» · petición 10

Cuando una persona tiene dos o más jornadas el mismo día, una etiqueta visible
en la tabla, para distinguir de un golpe el turno partido legítimo del duplicado
por error. No cambia ninguna hora ni ningún valor.

## 22. Avisar desde cuándo aplica un cambio de horario · petición 8

**La petición dice «mañana» y la regla acordada no es esa:** aplica **hoy** si esa
persona todavía no marcó, y **mañana** si ya marcó. Un aviso que diga «desde
mañana» va a estar equivocado la mitad de las veces.

Ejemplo de la pantalla: *«Ana ya marcó hoy, así que este horario le aplica desde
mañana. Carlos todavía no marca: le aplica desde hoy.»*

## 23. Seleccionar la semana completa en la vista mes del rotativo · petición 25

Al tocar el rótulo de una semana, que queden seleccionados sus días. Es selección,
no cálculo: el motor de turnos está completo y verificado hasta el dinero.

**Se trabaja sobre la vista que ya existe. Ninguna maqueta HTML aparte** (§13).

## 24. El menú de reportes se esconde en pantallas pequeñas · petición 22

Defecto de maquetación: que el menú sea alcanzable en móvil. Hay precedente de
cómo se arregla — la tabla de seguimiento de clima pasa a tarjetas en pantalla
angosta (`692af9c`).

## 25. ~~Auxilio de transporte en el Excel de colaboradores~~ · peticiones 16 y 27

**YA ESTABA HECHO. Este punto estaba mal inventariado.** La columna existe
completa desde el 3 de octubre de 2026, en el commit `51392bd` («feat(masivo):
el auxilio de transporte en la carga»):

- la columna del formato, con su ayuda y su marcador «Automático»
  (`backend/src/utils/importarColaboradores.ts:41`);
- la validación —vacío es «el del decreto», `0` es «esta empresa no lo paga», y
  un negativo es error (líneas 174-185)— con sus pruebas
  (`importarColaboradores.test.ts:253`);
- el «aplicar a todos» en la tabla de la vista previa
  (`ModalImportar.tsx:92` y `:324`);
- y el valor se guarda al crear (`routes/colaboradores.ts`, en el `/masivo`).

Está en `develop` y **viaja en el artefacto del 04/10 que todavía no se
desplegó**: comprobado en `origin/backend-build`, en
`deploy-backend/dist/utils/importarColaboradores.js`. O sea que llega a
producción con ese despliegue, sin tocar nada.

**Por qué el inventario decía lo contrario, que es lo que importa:** se buscó
«auxilio» en `frontend/.../formatoImportacion.ts` y no salió. Ese archivo es el
único donde las columnas **no** están, y su propio comentario lo dice: «Las
manda el servidor (GET /colaboradores/formato). No se declaran aquí a
propósito». Un vacío se leyó como «no existe» en el único archivo donde el vacío
era lo correcto — la §12.2 con otro disfraz.

## 26. Opción «todas las sedes» al editar un colaborador · petición 20

Hoy se asigna sede por sede; falta que alguien pueda marcar en cualquiera.

**Choca con una decisión ya tomada:** un presencial *siempre* tiene sede, y «Sin
sede» solo existe para híbrido y remoto. «Todas» no es «ninguna», así que hay que
decidir qué dice el reporte por sede de esa persona.

---

# Nivel 1 — Un rato

## 27. ~~Precio personalizado en la vista interna de la empresa~~ · petición 1

**HECHO el 4 de octubre de 2026.**

En la ficha de la empresa hay una tarjeta nueva, **«Precio del cliente»**, debajo
de «Plan y funciones»: los tres modos (global de la plataforma, valor fijo
mensual, tarifa propia por colaborador) y su botón de guardar. A quien tiene
acceso ilimitado de cortesía no se le ofrece, porque no se le cobra.

**Los campos no se copiaron: se extrajeron.** Viven una sola vez en
`features/admin/CamposDePrecio.tsx`, y la lectura del precio guardado en
`features/admin/precioDelCliente.ts`. El modal del menú de la lista de empresas
quedó usando los mismos, en el mismo cambio, como manda la §9.3: ahí
desaparecieron 53 líneas de formulario repetido.

**Qué respalda esto:** pruebas de componente sobre la pantalla de verdad
(`AdminEmpresaDetalle.precio.test.tsx`, 5 casos) y unitarias de la lectura
(`precioDelCliente.test.ts`, 5 casos). Las dos se vieron rojas antes de escribir
el código, y la de «acceso ilimitado» se vio roja aparte, con la tarjeta puesta
sin su guarda, porque una prueba que afirma una ausencia pasa sola.
Suite entera verde en los dos lados (2089 y 1751), `tsc -b` y `tsc --noEmit` en
cero, ESLint sin nada nuevo. **No se ha visto en el navegador.**

## 28. No deja eliminar una novedad · petición 6

**Defecto, y hace falta reproducirlo.** El borrado existe de punta a punta y con
el filtro de empresa puesto: ruta `DELETE /permisos/:id`
(`routes/permisos.ts:84`) y botón con confirmación en la ficha
(`ColaboradorDetalle.tsx:348`).

Entonces no está sin hacer: falla en algún caso. Antes de tocar nada hace falta
saber **desde qué pantalla** se intentó y qué dijo. Si salió «No pudimos eliminar
la novedad», la causa está en el servidor y el registro del sistema
(`/admin/registro`) tiene el error.

---

### Peticiones que eran la misma

7 = 19 = 32 → nº 9 · 16 = 27 → nº 25 · 3 = 29 → nº 6 · 15 = 17 → nº 15
