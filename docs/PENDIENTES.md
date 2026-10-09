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

## 9. ~~Exportar los registros a Excel~~ · peticiones 7, 19 y 32

**HECHO el 5 de octubre de 2026.** Botón «Exportar» al final de la barra de
filtros, pegado a ellos a propósito: lo que baja es lo que ellos dejan. El
archivo se llama `Registros_<desde>_a_<hasta>.xlsx`, y con la tabla vacía el
botón no se puede oprimir.

Catorce columnas: Colaborador, Cédula, Fecha, Sede, Entrada, Salida, Salida
estimada, Almuerzo (min), Descansos (min), Duración (min), Llegada tarde (min),
Tipo, Jornada del día y Observación.

Cuatro decisiones que vale dejar escritas:

- **Los minutos van como número**, no como «8h 0m»: una columna de texto no se
  puede sumar, y el archivo existe para sumarlo en otra parte.
- **Llegada tarde vacía no es cero.** `0` es «llegó a tiempo» y vacío es «no
  aplica» (sin horario, o día que no cuenta). Escribir 0 en los dos casos diría
  que todo el mundo fue puntual.
- **La salida que puso el auto-cierre lleva su propia columna.** En una hoja de
  cálculo se ve idéntica a una hora marcada si nada lo dice.
- **«Jornada del día»** es el mismo número de la etiqueta del nº 21, calculado
  con la misma función: filtrando por mayor que 1 salen los ingresos dobles.

La cédula sale de la lista de colaboradores, porque `GET /registros` no la
manda; queda vacía para alguien retirado, que no viene en esa lista. Y la columna
de sede usa el mismo `sedeDeLaJornada` que la tabla, así que el archivo y la
pantalla no pueden contradecirse.

**Lo único que podía salir mal de verdad era el cableado**, y las dos formas de
equivocarse dan un archivo plausible: conectado a la página en curso baja 50
filas de 300 sin avisar, y conectado a la lista cruda ignora los filtros. Hay una
prueba para cada una, y **las dos se vieron rojas cableando el botón a propósito
a `visibles` y a `registros`.**

## 10. ~~Cambiar el estado de una novedad desde el reporte~~ · petición 23

**HECHO el 5 de octubre de 2026.** En el detalle de una persona del reporte de
nómina, arriba del resumen, un bloque ámbar con **las novedades pendientes de
aprobar que tocan el período**, cada una con su tipo, sus fechas, su descripción
y un botón «Aprobar».

**Lo que se encontró al hacerlo, y era lo de fondo:** una novedad pendiente **no
se veía en ninguna parte del reporte**. El día a día del modal solo pinta las
aprobadas (`diasDelPeriodo` las filtra), así que al revisar la nómina del período
no había forma de enterarse de que faltaba decidir algo. Ahora el bloque lo dice
y añade la consecuencia: mientras esté pendiente, esos días siguen contando como
ausencia.

Tres decisiones:

- **Se mira el cruce con el período, no que la novedad quepa dentro.** Una
  incapacidad del 28 de agosto al 3 de septiembre hay que decidirla igual cuando
  se está mirando septiembre.
- **Aprobar pide confirmación**, y el diálogo dice la consecuencia con esas
  palabras: esos días dejan de contar como ausencia y **el total del período
  cambia**. En una tabla de doscientas filas eso no puede pasar con un clic
  suelto.
- **Al aprobar, el reporte de atrás se vuelve a calcular.** Si no, la pantalla se
  queda diciendo el total viejo, que es peor que no haber dejado aprobar.

**Solo aprobar, no desaprobar.** El estado es un booleano (`permisos.aprobado`) y
en la ficha tampoco hay «rechazar»: lo que hay es borrar. Quitarle la aprobación
a algo ya aprobado desde un reporte de nómina es más peligroso que útil, así que
eso sigue siendo cosa de la ficha.

**Dos defectos míos en las pruebas, cazados al verlas fallar:** el fixture usaba
un tipo de novedad que no existe (`CITA_MEDICA`; el real es `MEDICO`) y el
producto lo tapaba con su respaldo, que escribe el nombre sin tilde — un fixture
que no es un ejemplo real no prueba lo que dice (§9.2). Y pedir
`role="dialog"` a secas encontraba dos, porque el modal entero también es un
diálogo: hay que nombrarlo.

## 11. Marcar fuera del área, con alerta, y dejar su ubicación en un mapa · petición 13

**ANALIZADO el 5 de octubre de 2026. NO SE VA A DESARROLLAR POR AHORA**, por
decisión del dueño. Esta entrada es el análisis, para retomarlo sin repetirlo.

El dueño lo amplió: además de dejar marcar fuera del área con una alerta, que **la
ubicación de esa marca quede en el registro y se vea en un mapa**.

### Lo que decide todo: la política publicada promete lo contrario

La política de privacidad vigente (v1.2, en `horapro.co/legal/privacidad/`, texto en
`frontend/blog/legal/privacidad.mjs:147`) dice: **«Esa coordenada no se guarda… De
esa decisión solo queda registrada la sede. HoraPro no almacena el recorrido ni la
ubicación de ningún trabajador.»** Y el código la cumple: `Registro` guarda solo
`sedeId`, ninguna coordenada.

Por eso guardar la ubicación **no es una mejora de pantalla: es guardar un dato que
hoy prometimos no guardar.** Pide abogado, política 1.3 y aviso a las empresas
antes de escribir código. Es la misma puerta del clima anónimo (nº 6).

### Tres capas, con costos distintos

| Capa | Qué es | ¿Toca la promesa? |
|---|---|---|
| **A** | Dejar marcar fuera del área, con alerta | Poco: guarda «fuera, a 340 m», no una coordenada. Igual lo ve el abogado, porque «solo queda la sede» cambia un poco. |
| **B** | Guardar la coordenada de esa marca | **Sí, de frente.** |
| **C** | Verla en un mapa | Depende de B, más un tercero: el proveedor del mapa. |

**La capa A se puede entregar sola**, sin mapa y sin coordenada.

### Lo que se encontró en el código y afecta el diseño

- **Hay tres estados, no dos:** dentro, fuera (con coordenada) y **sin ubicación**
  (permiso negado, GPS apagado, tiempo agotado). Hoy los dos últimos bloquean
  (`RECHAZAR` y `EXIGIR_COORDENADAS`, en `utils/modalidad.ts`). El tercero
  seguramente es el más frecuente en la práctica y es distinto de «fuera»: no hay
  nada que poner en un mapa.
- **El kiosco no manda la precisión del GPS.** Solo `lat` y `lng`
  (`worker.ts:658`), y acepta una posición de hasta un minuto de antigüedad
  (`maximumAge: 60000`, en `pages/marcador/geo.ts`). En un teléfono sin buen GPS el
  error puede ser de cientos de metros. **Un punto sin su círculo de precisión
  afirma una exactitud que no tiene**, y las alertas serían ruido que nadie vuelve a
  mirar. La precisión hay que guardarla y mostrarla.
- **REMOTO y HÍBRIDO quedan fuera.** El código dice de REMOTO «no se le mira la
  ubicación, ni siquiera para anotarla», y para un híbrido estar fuera es normal.
  Esto es solo para PRESENCIAL.
- **La coordenada la manda el navegador:** una alerta es un indicio, no una prueba.
  Ya es así hoy.
- La campana (`notificaciones`), Telegram y el Excel de registros (nº 9) ya
  existen: la alerta puede viajar por ahí, y el Excel puede llevar una columna.

### El mapa

**OpenStreetMap no es una API a la que se le pida un mapa:** el enlace que se pegó
es su sitio web. Lo normal es una librería de código abierto (Leaflet) más un
servidor de teselas. No hay ninguna librería de mapas en el frontend hoy.

La política de uso de las teselas públicas de OSM (verificada en la fuente el 5 de
octubre): exige atribución visible, **prohíbe el uso intensivo**, no da garantía de
disponibilidad, **pueden bloquear sin aviso**, y para uso comercial recomiendan
proveedores alternativos o servidor propio.

Para un administrador que abre un punto unas pocas veces al día cabe en uso
ligero, pero un SaaS colgado de algo que se puede apagar sin aviso es frágil.
Cuatro caminos:

1. **Leaflet + teselas públicas de OSM:** gratis y rápido, sin garantías.
2. **Un proveedor comercial sobre datos de OSM** (MapTiler, Stadia y similares):
   con llave y plan gratuito. **Los precios se miran al decidir**, no se anotan
   aquí: cambian.
3. **Sin mapa incrustado:** solo un enlace «Abrir en OpenStreetMap» con la
   coordenada. Cero dependencia, y el tercero solo la ve si alguien hace clic.
4. **Servidor propio de teselas:** exagerado para esto.

**Para el abogado:** al abrir el mapa, el navegador del administrador le pide
teselas de esa zona al proveedor, que se entera del área consultada y de su IP, no
de quién es el trabajador. Aun así es un tercero que hay que nombrar en la sección
de transmisión de la política.

**Lo que haría útil el mapa:** el punto, la sede con su círculo de geocerca, la
precisión y la distancia («a 340 m, ±1.200 m»). El mismo componente serviría para
la pestaña de sedes —dibujar la geocerca y fijar la ubicación— y para el nº 12
(enlace para que alguien en la sede la capture).

### Decisiones del dueño, con la recomendación

1. **¿Bloquear, permitir con alerta, o un punto medio?** Es la barrera contra
   «marcar desde la casa»: se recomienda una **opción por empresa**. Un punto
   medio: permitir con alerta hasta N metros fuera del radio y bloquear más allá.
2. **Guardar la coordenada solo en las marcas fuera de área**, nunca en todas: es
   el mínimo necesario y reduce mucho la exposición legal.
3. **Cuánto tiempo.** Lo coherente es igualar la regla de las fotos (60 días, la
   única que borra sola) o menos.
4. **Que la persona lo sepa al marcar:** el kiosco debería decirle «quedó
   registrada con alerta de ubicación».
5. **Quién la ve:** administrador y supervisor, como dice la política. Con el módulo
   de roles (nº 1) podría ser un permiso aparte.
6. **Qué proveedor de mapa**, y si la capa C entra en esta etapa o después.

### Si algún día se desarrolla

Orden que tendría sentido: **abogado y política** → la función pura
`decidirUbicacionDeMarca` (con su ciclo de pruebas completo, es la parte más
limpia, y el caso más limpio de la §2) → esquema y guardado → alerta, etiqueta,
filtro y columna en el Excel → mapa.

El esquema ya tiene el patrón (`metodoEntrada/Salida`, `distanciaEntrada/Salida`),
pero es un cambio sobre `registros`: según el CLAUDE.md **se habla antes**, va con
**`prisma-build` obligatoria** (§11) y el `ALTER` con `ALGORITHM` y `LOCK`
explícitos.

**Lo que no se revisó:** cabeceras de seguridad (CSP) en el servidor. Solo se
buscó en los archivos del frontend, donde no hay. Antes de incrustar un mapa hay
que mirarlo.

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

## 20. ~~La sede en la tabla de registros~~ · petición 21

**HECHO el 4 de octubre de 2026.** Los dos datos quedaron separados:

- **Bajo el nombre, la sede asignada** de la persona, que es su configuración. No
  sale para quien no tiene ninguna —un remoto o un híbrido— ni para alguien
  retirado, que no viene en `GET /colaboradores`.
- **En la columna de sede, dónde marcó**: la probada, el cruce con su flecha
  cuando abrió en una y cerró en otra, o «Cerró en X» cuando solo se sabe el
  cierre.

**Lo que cambió de verdad, y conviene mirarlo en pantalla:** la columna mostraba
la sede ATRIBUIDA —la que el servidor le pone al leer a un presencial que no
marcó en ninguna— con el mismo aspecto que una probada, así que en la tabla no
había forma de distinguir «marcó en Norte» de «no marcó en ninguna y cuenta en
Norte». Ahora esa fila dice **«— · cuenta en Norte»** en gris, y al pasar el
puntero explica que no quedó registrada la sede de esa jornada y que para los
reportes cuenta ahí.

**No se quita, se dice distinto:** sigue visible porque es la que suman los
reportes por sede (un presencial no se ve sin sede, decisión del 12 de
septiembre). Lo que se quita es que parezca una marcación.

La clase de la celda la decide ahora `sedeDeLaJornada`, con un caso por valor y
un `default` explícito (§9.4), en vez de la cadena de cuatro `if` que vivía
dentro de la pantalla.

**Dos cosas de método que salieron de aquí:**

- Las aserciones van **por celda, buscando la columna por su encabezado**.
  Preguntar por texto no servía: Testing Library mira el texto DIRECTO de cada
  elemento, así que un rótulo en `sr-only` queda en un hijo aparte y no aparece
  en la consulta, y «Norte» salía en dos celdas a la vez. El ayudante de la
  prueba lleva su propia guarda, y fue la que avisó de que la columna se llama
  «Colaborador» y no «Nombre».
- La etiqueta del nº 21 se había insertado entre el comentario de `CeldaSede` y
  su función, dejando el comentario explicando el componente equivocado.
  Corregido en este cambio.

## 21. ~~Etiqueta de «segundo ingreso»~~ · petición 10

**HECHO el 4 de octubre de 2026.** En la tabla de registros, debajo de la fecha,
la segunda jornada de una persona el mismo día dice «2.º ingreso» (3.º, 4.º…).
No cambia ninguna hora ni ningún valor.

Tres decisiones que vale dejar escritas:

- **No dice «duplicado».** Un turno partido son dos jornadas legítimas, y
  afirmar un error que la mitad de las veces no existe haría que la etiqueta se
  dejara de leer. Dice cuál es y cuántas hay; al pasar el puntero explica que
  puede ser un turno partido o un duplicado. Decidir es de quien mira.
- **La primera del día no se marca.** Marcada, el 95% de las filas llevaría
  etiqueta y dejaría de señalar nada.
- **Se calcula sobre la lista completa, no sobre lo filtrado ni sobre la
  página.** Que alguien tenga dos jornadas ese día es un hecho del día, no del
  filtro que esté puesto: calculándolo sobre lo visible, esconder una con un
  filtro dejaría a la otra diciendo «2.º ingreso» sin que se vea de qué.

El criterio es una función pura, `features/registros/ingresosDelDia.ts`, y
agrupa por el día de **Bogotá** —el mismo que pinta la fila—, no recortando los
diez primeros caracteres del ISO. Hay una prueba para eso: una fecha a las 04:00
UTC es el día anterior a las 11 p. m. en Bogotá, y juntarlas haría que la
etiqueta contradijera la fecha de la fila.

## 22. Avisar desde cuándo aplica un cambio de horario · petición 8

**La petición dice «mañana» y la regla acordada no es esa:** aplica **hoy** si esa
persona todavía no marcó, y **mañana** si ya marcó. Un aviso que diga «desde
mañana» va a estar equivocado la mitad de las veces.

Ejemplo de la pantalla: *«Ana ya marcó hoy, así que este horario le aplica desde
mañana. Carlos todavía no marca: le aplica desde hoy.»*

## 23. ~~Seleccionar la semana completa en la vista mes del rotativo~~ · petición 25

**HECHO el 5 de octubre de 2026.** En la vista de mes, el rótulo de cada semana
(«Semana 2 · 5 oct – 11 oct») pasó de ser texto a ser un botón que **marca sus
siete días de todas las personas a la vista**, igual que el encabezado de un día
marca esa columna y el nombre de una persona marca su fila.

Se trabajó sobre la vista que ya existe (§13): el gesto reusa `alternarConjunto`,
`conjuntoCompleto` y el mismo aviso del día pasado, así que se comporta como sus
dos hermanos:

- **Es un interruptor:** tocarlo otra vez lo desmarca. Con un día de esa semana ya
  marcado, completa la semana en vez de apagar lo poco que llevaba.
- **Solo marca lo que todavía se puede escribir.** La semana en curso, con días
  idos y días por venir, marca los que sí; una semana entera en el pasado no marca
  nada y dice por qué.
- **Incluye los días de relleno de otro mes** que caen en esa fila, como ya lo
  hacen el encabezado de esa columna y la fila de una persona.
- **Se ve marcado cuando está entera:** el rótulo toma el mismo tinte de la
  selección entera y se anuncia con `aria-pressed`.
- **Su nombre accesible empieza distinto** («Marcar todos los días de la Semana
  2 · …») de «Marcar la semana de Ana» y de «Marcar el día 7 de todos»: tres
  botones que marcan cosas distintas no pueden llamarse casi igual.

**Solo en el mes.** En la vista de semana no hay renglón de semanas, y ahí ya
existen los encabezados de día y el nombre de cada persona.

La única decisión pura es el cruce personas × fechas, y va **por filas** porque la
selección se escribe en el orden en que se insertó (`celdasDeLasFechas`, en
`seleccionEnBloque.ts`).

**Respaldo:** 6 pruebas de la función pura y 8 de la pantalla, en el mes con el
reloj fijo en el miércoles de pruebas. **Siete mutaciones, las siete mueren**
(orden por columnas, marcar el pasado, «entera» con un solo día, sin interruptor,
sin `aria-disabled`, sin la salida de «sin personas», y apagar con que haya
alguna marcada). **No se vio en el navegador.**

**Defecto que ya existía y apareció al probar, SIN ARREGLAR:** con cero personas a
la vista (un filtro que no deja a nadie), tocar el encabezado de un día **por
venir** dice «Ese día ya pasó y no se puede programar». Es `marcarColumna`: con una
lista vacía cae en el aviso del pasado. Comprobado con una prueba temporal, ya
borrada. El rótulo de la semana sí tiene la salida correcta.

## 24. ~~El menú de reportes se esconde en pantallas pequeñas~~ · petición 22

**Arreglado, dicho por el dueño el 4 de octubre de 2026.** Lo que se ve en el
código: el ítem de Reportes del menú no despliega una lista en el costado, abre
un modal con las rutas para elegir (`ReportesNav`, usado desde `Layout.tsx`), que
es lo que lo hace alcanzable en una pantalla angosta. **No lo verifiqué yo en el
navegador.**

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

# Huecos que encontró la revisión del 4 de octubre (no son peticiones)

Salieron de revisar contra el código lo que la landing y Suscripción prometen de cada plan, y las
tarjetas nuevas de la landing. **Se leyeron en el código y no se ejecutaron**: antes de arreglar cada
uno hay que reproducirlo. Las líneas son las de ese día. Van del que más importa al que menos.

## 29. Un Esencial que borra su único horario se queda sin poder crear otro

**Defecto que le pasa a un cliente.** Borrar un horario solo lo desactiva
(`routes/horarios.ts:163`, `activo: false`), pero el tope de un horario cuenta
también los desactivados (`horarios.ts:58`, `horario.count` sin filtro de
`activo`). La pantalla lista solo los activos (`horarios.ts:29`), así que ve
cero y ofrece «Nuevo horario» (`TabHorario.tsx:229`), y el servidor responde 403.

Arreglo probable: contar solo los activos. Pequeño, pero toca la regla del plan:
prueba primero.

## 30. El historial de correcciones de una jornada solo anota la primera fila

**Hueco de auditoría.** El editor de jornada (`PUT /jornada/:id`) anota los
cambios solo de la PRIMERA fila (`routes/registros.ts:1106-1108`, con
`cambiosPrimera` armado de `nuevos[0]` en `:1021-1027`). Las demás se
reescriben sin rastro (`:1081`). Ejemplo: entrada 8:00, almuerzo 12:00–13:00,
salida 17:00; si alguien cambia la salida a 16:00, no queda nada en el historial.

Importa el día que un trabajador reclame horas: el historial es la prueba de quién
cambió qué. Toca dinero de forma indirecta.

## 31. Un colaborador retirado se puede reactivar por API sin pasar por el tope del plan

**Fuga de cobro.** `PUT /colaboradores/:id` copia el cuerpo tal cual
(`routes/colaboradores.ts:439-463`): mandar `{ activo: true }` sobre alguien
retirado lo reactiva sin la guarda del tope que sí tienen crear (`:384-392`),
reingresar (`:655-663`) y la carga masiva (`:282-291`). La pantalla usa
`/reingresar`, así que solo se llega a mano.

Arreglo probable: que el PUT ignore `activo`, `fechaRetiro`, `motivoRetiro` y
`retiroProgramado`.

## 32. La evidencia de una novedad se puede adjuntar al editarla, en cualquier plan

**Fuga de una función del Profesional.** El POST la rechaza sin
`features.evidencia` (`routes/permisos.ts:61-64`), pero el `PUT /permisos/:id`
(`:72-82`) pasa por `limpiarPermiso`, que la guarda sin mirar el plan
(`utils/cuerpoDePermiso.ts:63-71`).

Arreglo probable: la misma guarda del POST cuando el cuerpo trae documento.

## 33. El código de vinculación del kiosco se puede escribir por la configuración

**Fuga de una función del Profesional.** `PUT /configuracion` guarda cualquier
clave (`routes/configuracion.ts:96-104`) y solo filtra algunas (`:66-95`). Por
ahí se puede escribir `CODIGO_KIOSCO` sin pasar por la guarda de
`multiDispositivo`.

Arreglo probable: lista de claves permitidas, y volver a mirar el plan en
`/worker/vincular`.

## 34. La alerta de Telegram sigue llegando después de bajar de plan

**Fuga de una función del Profesional.** `alertarTardanzaTelegram`
(`routes/worker.ts:239-249`) mira `TELEGRAM_ALERTAS_TARDE` y no el plan, así
que una empresa que baja a Esencial con Telegram ya configurado sigue
recibiéndola. Es la única alerta que se manda por Telegram (el comentario de
`contratos.ts:91`, que habla de un aviso por Telegram, está desactualizado).

## 35. El kiosco mide la llegada tarde contra el horario, no contra el turno programado

**Hay que confirmarlo antes que nada.** El kiosco pide el motivo de llegada
tarde y de salida temprana comparando con la franja del HORARIO vigente
(`worker.ts:671-674`, `:813-817`, `:917-922`; `utils/tardanzas.ts:283-287`).
Los reportes de tardanzas miden contra el día programado, `DiaEsperado`
(`tardanzas.ts:137-147`). A quien tiene un turno pintado distinto de su
horario, el kiosco le pediría motivo cuando no llegó tarde, o no se lo pediría
cuando sí.

Afecta justo a quien usa el módulo de turnos. Toca horas, así que se reproduce
con persona y día antes de tocar nada.

## 36. El kiosco trae «Cita médica» escogido de entrada como motivo

**Calidad del dato.** El motivo de llegada tarde arranca en `MEDICO`
(`pages/Marcador.tsx:63`, y se repone en `:123` y `:289`), y la descripción es
opcional. Con un solo toque en «Registrar mi entrada», la novedad queda como
«Cita médica» sin que la persona haya escogido nada. Por eso la landing dice
«le pide el motivo» y no «sin motivo no marca».

Arreglo probable: que el selector arranque vacío y obligue a escoger. Es una
decisión del dueño: un paso más para quien llega tarde.

## 37. El aviso de novedad por aprobar dice el tipo con su código crudo

**Cosmético.** El cuerpo del aviso es «Reportó una novedad (MEDICO) pendiente de
tu aprobación.» (`routes/worker.ts:232`). Debería decir el nombre («Cita
médica»), que vive en `frontend/src/constants/permisos.ts` y el servidor no
tiene. Al llevar los nombres al servidor, una sola tabla para los dos
(CLAUDE.md §9.3).

# Peticiones del 8 y 9 de octubre

## 38. La columna «Sede» de Registros muestra la sede de la persona cuando no hay sede de marcación · petición 34

**Pedido del dueño (9 de octubre):** que la columna Sede de los Registros diga la sede donde
MARCÓ la persona y no la suya, y que si marcó en dos sedes distintas se vean las dos.

**Lo que hay hoy** (`CeldaSede` en `pages/Registros.tsx`, la decide `sedeDeLaJornada`): con sede de
marcación, la dice; con dos distintas, «A → B» (nº 20, ya hecho); y SIN sede de marcación, un gris
«— · cuenta en [sede asignada]». Esa última es lo que el dueño ve como «la sede de la persona».

**Por qué falta el dato, medido en producción** (jornadas desde el 1 de octubre, solo conteos): el servidor
guarda la sede de una marcación únicamente cuando la ubicación del celular cae dentro de la geocerca de una
sede CON coordenadas (`decidirUbicacionDeMarca`, `utils/modalidad.ts`). El kiosco no sabe en qué sede está:
`dispositivos_kiosco` no tiene sede. Resultado: las dos empresas con más jornadas (571 y 269) tienen 0 con
sede de marcación y sus sedes no tienen coordenadas; una tercera (158) tampoco guarda ninguna aunque su sede
sí tiene coordenadas (por mirar). Las que sí las tienen guardan sede en casi todas las jornadas y registran
cruces (7 en una, 1 en otra).

**Opciones, sin decidir:**
1. Quitar la sede asignada de esa celda: «No quedó registrada». Pequeño, sin esquema. Esas empresas verían la
   columna sin ninguna sede de marcación. Los reportes siguen contando por la sede asignada (decisión del 12 de
   septiembre).
2. **Darle una sede a cada kiosco** (columna nueva en `dispositivos_kiosco`, SQL y `prisma-build`): toda marcación
   hecha ahí guarda esa sede sin depender del GPS. Es lo que de verdad da el dato; hay que decidir qué pasa si el
   GPS y el kiosco no coinciden. Cambio de esquema: se habla antes (CLAUDE.md §4).
3. Que las empresas carguen las coordenadas de sus sedes. Sin código, y solo vale hacia adelante.

Recomendación: 1 y 2 juntas. **Esperando la decisión del dueño.**

---

### Peticiones que eran la misma

7 = 19 = 32 → nº 9 · 16 = 27 → nº 25 · 3 = 29 → nº 6 · 15 = 17 → nº 15
