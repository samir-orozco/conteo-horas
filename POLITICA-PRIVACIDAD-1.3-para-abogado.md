# Política de Tratamiento de Datos Personales, versión 1.3: cambios para revisión del abogado

Borrador del 14 de octubre de 2026. **Nada de esto está publicado.** La política vigente es la versión 1.2, publicada el 4 de
octubre de 2026 (`POLITICA-PRIVACIDAD-para-abogado.md` y `frontend/blog/legal/privacidad.mjs`). La fuente de la política no se
toca hasta que este documento esté aprobado, igual que se hizo con la 1.1.

La política tiene una regla escrita en su propia fuente: **cada afirmación corresponde a algo que el código hace hoy.** Al
preparar la 1.3 para el clima laboral apareció que la 1.2 ya no cumple esa regla en seis puntos, porque desde el 4 de octubre
salieron a producción funciones que tratan datos personales y la política no se actualizó. Este documento trae las dos cosas:
lo nuevo del clima y la corrección de lo que la 1.2 dice y ya no es cierto.

---

## 0. Lo primero, y que no puede esperar

**El punto 4 de la política publicada dice:**

> HoraPro, como proveedor, no dispone de ninguna pantalla ni función que le permita ver los nombres, las cédulas, los salarios,
> las fotos, los datos biométricos ni las novedades de los trabajadores de sus clientes. Nuestro panel interno solo muestra
> conteos, facturación y comprobantes de pago.

**No es cierto desde que salió el registro del sistema** (en producción a más tardar el 4 de octubre de 2026). Ese registro
guarda, por cada cambio que alguien hace en el panel de una empresa, el contenido de lo que envió: hasta 4.000 caracteres, sin
contraseñas ni archivos, pero con todo lo demás. El super admin lo ve en su pantalla «Registro». Comprobado en la base local:
una entrada «Editó un colaborador» guarda nombre, apellido, cédula, cargo, correo, teléfono, fecha de nacimiento y salario.
Lo mismo pasa con la descripción de una novedad que cargue el administrador (puede ser un dato de salud) y con los comentarios
del seguimiento del clima. Ese registro **no se borra nunca**, ni cuando el dato se corrige o se elimina en el producto.

Había dos salidas: cambiar el producto o declararlo en la política. **El dueño eligió cambiar el producto el 14 de octubre de
2026, y está en producción desde el 15 de octubre:** la auditoría dice quién hizo qué, cuándo, desde qué IP y sobre cuál
registro; del contenido guarda los nombres de los campos y los ids, nunca los valores. Solo las rutas cuyo contenido es de la
empresa (sus sedes, horarios, festivos, configuración, plan y usuarios del panel) guardan los valores. Una ruta nueva nace
protegida: la lista es de las que sí guardan, no de las que no. Las filas que ya estaban se limpiaron el 15 de octubre con un
comando en el servidor, con la misma regla: 1.565 de 2.367, y después de aplicarlo no quedó ninguna por limpiar. Así la
promesa del punto 4 vuelve a ser cierta. (Lo que pueda quedar en la copia semanal de la base se va con ella, a los siete
días como máximo, que es lo que ya dice el punto 7.)

**Lo que queda, y es otra cosa:** el registro de accesos guarda, de un intento rechazado en el kiosco, la cédula que se
escribió, para detectar a quien prueba cédulas. Si la cédula es de un trabajador (por ejemplo, con un dígito errado), el super
admin la ve. Lo decide el dueño: declararlo, como hace el texto del punto 3.1, o guardar solo una parte de la cédula.

## 1. Las otras cinco cosas que la 1.2 dice distinto de lo que el producto hace

| Qué dice la 1.2 | Qué hace el producto | Desde |
|---|---|---|
| Punto 8: «Nunca enviamos por correo datos de trabajadores». | El **resumen semanal** que llega los lunes a los administradores trae nombres de trabajadores: a quién se le cerró solo un turno y qué día, quiénes llegaron más tarde (cuántas veces y cuántos minutos) y qué contratos tienen un aviso pendiente. No trae el tipo de las novedades ni soportes. La empresa lo apaga en Configuración › Cuenta. | 12 oct |
| Punto 8: Telegram envía «un aviso de llegada tarde» con nombre, hora y minutos. | Envía **cinco** clases de aviso, cada una con su interruptor: llegó tarde; dejó una novedad por aprobar (sin decir de qué tipo); no ha llegado, y luego que ya llegó; está en una pausa y no ha vuelto, y luego que ya volvió; turnos que se cerraron solos. Todos con el nombre de la persona. | 12 y 13 oct |
| Punto 4: de la geocerca «solo queda registrada la sede». | Cuando la sede admite un margen, queda además **si la marca cayó fuera de la geocerca** dentro de ese margen. Sin la distancia ni la coordenada. | 13 oct |
| Puntos 3.4 y 7: los registros técnicos «los genera y los conserva nuestro proveedor de hosting». | HoraPro guarda **en su propia base** un registro de errores, de intentos de acceso rechazados (con el correo o la cédula que se escribió) y de acciones del panel, con fecha, IP, navegador, usuario y empresa, **sin borrado automático** (y con el contenido del punto 0). | 4 oct |
| Punto 3: las finalidades para quien tiene cuenta son crear la cuenta, cobrar y dar soporte. | El administrador puede dejar una **reseña** de HoraPro y autorizar que se publique **con su nombre y el de su empresa** en horapro.co. Se guarda la constancia de lo que eligió, con la versión de la política. `docs/RESENAS.md` §7 ya decía que esta finalidad necesitaba la 1.3. | 9 oct |

## 2. El clima laboral: qué hace el producto

Las cifras salen del código; donde algo se decidió, se dice quién lo decidió.

**Lo que ya está en producción (desde el 4 de octubre de 2026, solo empresas del plan Empresarial):**

1. **La pregunta.** Al marcar en el kiosco la salida que cierra la jornada, la pantalla dice «¿Cómo te fue hoy, [nombre]?» con
   cinco caritas, de «Muy mal» a «Muy bien». No sale en las pausas, ni cuando el sistema cierra un turno solo, ni en las
   marcas que carga el administrador. Una sola vez por día, aunque el turno sea partido.
2. **Es opcional en la práctica:** hay un botón «Cerrar sin enviar» y la ventana se cierra sola. **Pero la carita se guarda en
   el momento en que se toca**, aunque la persona no termine.
3. **Los motivos.** Con las dos caritas más bajas, la persona puede marcar uno o varios motivos de una lista que define la
   empresa (de fábrica: Mucho trabajo, Jefe o supervisor, Compañeros, Me tocó quedarme más tiempo, Algo personal, Otro).
4. **La observación.** Puede escribir un texto libre. Directa, va con su nombre. O **confidencial**: el interruptor dice
   solo «Tu empresa no verá tu nombre.» (texto decidido por el dueño).
5. **Todo va con nombre**, salvo la observación confidencial: la carita, los motivos y la observación directa quedan
   asociados a la persona y a la fecha de la jornada.
6. **Quién lo ve:** solo los usuarios de la empresa con rol de administrador. Los supervisores no.
7. **«Necesitan atención».** Quien acumula tres respuestas seguidas en las dos caritas más bajas aparece en una lista, y se le
   abre un **caso de seguimiento**: el administrador le asigna un responsable (cualquier usuario activo de la empresa), le
   cambia el estado y **escribe comentarios sobre la persona**. Los comentarios se editan y se borran, y guardan quién los
   escribió.
8. **La observación confidencial.** La empresa ve solo «Confidencial» y el texto, sin nombre, hora, carita, motivos ni sede;
   aparece al día siguiente, agrupada por semana y en un orden que no es el de llegada. **HoraPro guarda quién la escribió,
   cifrado y separado del texto.** El administrador no tiene ninguna forma de verlo. Solo el personal de HoraPro lo puede
   descifrar, con un comando en el servidor que deja constancia antes de mostrar el nombre, y **por decisión del dueño solo
   lo entrega por orden de una autoridad** (juez, Fiscalía, inspector de trabajo), nunca porque la empresa lo pida. El texto
   mismo puede delatar a su autor por lo que dice: HoraPro no lo edita ni lo filtra.
9. **Lo que no hace:** no hay un ranking de personas; nada del clima va a Telegram; el kiosco no copia las respuestas en el
   registro del sistema (para que el texto confidencial no quede al lado de quién lo envió).
10. **Conservación:** nada del clima se borra solo. Retirar a un trabajador no borra nada (el producto no tiene cómo borrar a
    una persona: «eliminar» la retira). Las notas confidenciales no quedan atadas a la ficha de nadie; solo el autor cifrado
    las relaciona con su autor. Si se borra la cuenta de la empresa, se borra todo.

**Lo que sale en el próximo despliegue (construido entre el 13 y el 14 de octubre, sin desplegar):**

11. **La pregunta sale en TODAS las empresas que usan el kiosco, no solo las del plan Empresarial, y viene encendida.** La
    empresa la apaga en Configuración › Marcación. El dueño eligió encendida por defecto; la alternativa era que arrancara
    apagada y la empresa la encendiera.
12. **Sin el plan Empresarial**, el administrador ve solo cifras sin nombres: el ánimo promedio, cuántos respondieron, cuántas
    personas necesitan atención y cuántas notas confidenciales hay por semana (no su texto). El servidor no envía ni un nombre
    ni un texto: está comprobado con pruebas automáticas.
13. **Las respuestas se guardan con nombre aunque la empresa no tenga el plan.** Si después lo contrata, o empieza la prueba
    gratis, **el administrador ve con nombre también las respuestas anteriores**, incluidas las de cuando no tenía el plan.
14. **La prueba gratis:** una empresa sin el plan puede pedir, una sola vez, 30 días del panel completo. Al empezarla, la
    pregunta del kiosco se enciende si estaba apagada.
15. **Avisos a la empresa sin el plan**, en la campana del panel y en el correo de los lunes: «2 personas reportaron días malos
    seguidos», sin nombres, con la invitación a contratar el plan o a probarlo. Solo cuando alguien entra a esa lista después
    del último aviso, con al menos 7 días entre avisos, y nunca si la empresa apagó la pregunta.

## 3. Textos propuestos para la política

Van en el orden de la política. Donde se cambia un texto que existe, está lo que dice hoy y lo que diría.

### 3.1 Punto 3.4, registros técnicos (si el dueño elige la salida A del punto 0)

**Se agrega, después del párrafo actual:**

> Además, HoraPro guarda en su propia base de datos un registro de lo que pasa en el panel: los errores, los intentos de
> entrar que fueron rechazados, con el correo o la cédula que se escribió, y las acciones de los usuarios, como crear, cambiar
> o borrar algo. Cada entrada lleva la fecha, la dirección IP, el navegador, el usuario y la empresa, y dice qué se hizo y
> sobre cuál registro. De lo que se envió quedan los nombres de los campos, no sus valores: el registro no copia los datos de
> los trabajadores ni de ninguna otra persona. Solo lo que es de la empresa, como sus sedes, sus horarios o su configuración,
> queda con sus valores. Lo consulta solo el personal de HoraPro, para diagnosticar fallas, atender reclamos y detectar
> abusos. Las marcaciones del kiosco y las respuestas del clima laboral no se copian en ese registro.

### 3.2 Punto 3.5 nuevo: de quien deja una opinión sobre HoraPro

> Al administrador de una empresa cliente le pedimos, una sola vez, que califique a HoraPro con estrellas y, si quiere, con un
> comentario. Si escribe un comentario, elige cómo se publicaría: con su nombre y el de su empresa, o como «Cliente de
> HoraPro», sin ninguno de los dos. Ninguna opción viene marcada. Guardamos la opinión con el usuario y la empresa que la
> enviaron, aun si eligió no aparecer, junto con la constancia de lo que eligió: el texto exacto de la opción, la versión de
> esta política y la fecha.
>
> Publicamos en horapro.co las opiniones que decidimos publicar, tal como se escribieron y con la firma que su autor eligió.
> Una opinión que nos llega por otro canal, como una conversación o un correo, solo se publica con nombre si consta cómo lo
> autorizó su autor.
>
> Quien quiera que retiremos su nombre o su opinión puede pedirlo a privacidad@horapro.co. El nombre se borra y la opinión
> queda como «Cliente de HoraPro», o deja de publicarse.

### 3.3 Punto 4, datos que tratamos como encargado

**Ubicación al marcar. Hoy dice:** «De esa decisión solo queda registrada la sede.»
**Diría:** «De esa decisión queda registrada la sede y, si la sede permite marcar dentro de un margen alrededor de su área, si
la marca cayó fuera del área dentro de ese margen. No se guarda la distancia ni la coordenada.»

**Párrafo nuevo, después de «Novedades y ausencias»:**

> **Clima laboral:** cómo le fue a la persona en su jornada, los motivos que marque, sus observaciones y los casos de
> seguimiento que abra la empresa, que se explican en el punto 4.1.

**Quién ve estos datos. Se agrega al final del párrafo:** «Las respuestas del clima laboral las ven solo los administradores,
como se explica en el punto 4.1.»

**Punto 4.1 nuevo, al final del punto 4:**

> **4.1 El clima laboral**
>
> **La pregunta.** Al marcar en el kiosco la salida que cierra su jornada, la pantalla le pregunta a la persona cómo le fue,
> con cinco caritas que van de «Muy mal» a «Muy bien». Si escoge una de las dos más bajas, puede marcar los motivos de una
> lista que define su empresa. Y puede escribir una observación. Sale una vez por día, solo en la salida que la persona marca
> en el kiosco.
>
> **Responder es voluntario.** Puede cerrar la ventana sin responder. Si toca una carita, esa respuesta queda guardada aunque
> no termine.
>
> **Quién decide que se pregunte.** La empresa empleadora. La pregunta viene encendida en todas las empresas que usan el
> kiosco, y la empresa la puede apagar en su configuración. Como responsable de estos datos, a ella le corresponde informarle
> a su equipo que la pregunta existe, para qué la usa y quién ve las respuestas, y obtener la autorización cuando haga falta.
>
> **Para qué.** Para que la empresa conozca cómo está el ánimo de su equipo, por qué, y quién lleva varios días malos y
> necesita atención.
>
> **Con nombre.** La carita, los motivos y la observación directa quedan con el nombre de la persona y la fecha de la jornada.
>
> **Quién lo ve.** Solo los usuarios de la empresa con rol de administrador. Según el plan que la empresa tenga contratado,
> ven las respuestas con nombre o solo cifras de toda la empresa sin nombres: el ánimo promedio, cuántos respondieron y
> cuántas personas necesitan atención. **Las respuestas se guardan con nombre aunque el plan solo muestre cifras**, y si la
> empresa cambia de plan, ve con nombre también las anteriores.
>
> **Seguimiento.** Cuando una persona responde tres veces seguidas con una de las dos caritas más bajas, el panel la marca
> como «necesita atención» y abre un caso. Los usuarios de la empresa pueden asignarle un responsable, cambiar su estado y
> escribir comentarios sobre él. Esos comentarios también son datos de la persona.
>
> **Avisos a la empresa.** El panel y el resumen semanal por correo le pueden decir a la empresa cuántas personas necesitan
> atención. Cuando el plan de la empresa no muestra nombres, esos avisos tampoco los llevan.
>
> **La observación confidencial.** La persona puede enviar su observación como confidencial. Su empresa ve solo el texto, sin
> nombre, hora, carita, motivos ni sede, a partir del día siguiente, agrupada por semana y en un orden distinto al de llegada.
> HoraPro guarda quién la escribió, cifrado y separado del texto, y su empresa no tiene ninguna forma de verlo. **Solo lo
> entregamos por orden de una autoridad competente**, como un juez, la Fiscalía o un inspector de trabajo, y nunca a solicitud
> de la empresa. El personal de HoraPro que lo descifra deja constancia de cada consulta antes de ver el nombre. Tenga en
> cuenta que lo que escriba puede delatarlo por sí mismo: HoraPro no edita ni revisa el texto.

### 3.4 Punto 6.1, lo que HoraPro le pide directamente a un trabajador

**Hoy dice:** «HoraPro le pide directamente a un trabajador solo dos cosas. En el kiosco, al marcar: su cédula o su rostro
para identificarse, y la fotografía que queda como evidencia de la marcación. Y en el enlace de registro facial…»
**Diría:** «…solo tres cosas. En el kiosco, al marcar: su cédula o su rostro para identificarse, y la fotografía que queda
como evidencia de la marcación. Al marcar la salida, si su empresa no la apagó, la pregunta del clima laboral, que es
voluntaria (punto 4.1). Y en el enlace de registro facial…»

**Y en la salvedad sobre los campos de texto libre** se agrega la observación del clima, que la escribe el propio trabajador.

### 3.5 Punto 7, cuánto tiempo conservamos (filas nuevas)

| Dato | Plazo real |
|---|---|
| Respuestas del clima laboral y casos de seguimiento con sus comentarios | No se borran solos. Se conservan mientras exista la cuenta de la empresa. El retiro de un trabajador no los elimina. |
| Observaciones confidenciales y quién las escribió | No se borran solas. Se conservan mientras exista la cuenta de la empresa. No quedan atadas a la ficha del trabajador. |
| Registro del sistema | Hoy no se borra. **Pendiente: el dueño fija un plazo** (se propone 12 meses). |
| Opiniones sobre HoraPro y su constancia | No se borran solas. Las que envió una empresa se eliminan con su cuenta. Si se pide quitar el nombre, se borra la firma y no se puede deshacer. |

### 3.6 Punto 8, con quién compartimos información

**Servidor de correo. Hoy dice:** «Nunca enviamos por correo datos de trabajadores, ni novedades, ni soportes médicos.»
**Diría:**

> Los lunes enviamos a los administradores de cada empresa un resumen de la semana, que la empresa puede apagar. Trae los
> nombres de los trabajadores a quienes se les cerró un turno sin marcar la salida, de quienes llegaron más tarde y de quienes
> tienen un aviso de contrato, y cuántas personas necesitan atención en el clima laboral cuando el plan no muestra nombres.
> Nunca enviamos por correo el tipo ni el soporte de una novedad, ni las respuestas del clima laboral.

**Telegram. Hoy describe un solo aviso.** Diría:

> **Telegram, opcional y desactivado por defecto.** Si la empresa lo configura, HoraPro envía a un chat o grupo de Telegram los
> avisos que la empresa encienda, cada uno con su interruptor: que alguien llegó tarde, con la hora y los minutos; que dejó
> una novedad por aprobar, sin decir de qué tipo; que no ha llegado a su turno, y cuando llega; que está en una pausa y no ha
> vuelto, y cuando vuelve; y los turnos que se cerraron sin marcar la salida. Todos llevan el nombre y el apellido de la
> persona. [Sigue igual: Telegram la conserva bajo sus condiciones; si es un grupo, la ven todos; es decisión de la empresa.]

### 3.7 Punto 10, seguridad (viñetas nuevas)

> - Quién escribió una observación confidencial del clima laboral se guarda cifrado y separado del texto, con una clave que la
>   empresa no tiene.
> - La ventana del clima laboral escribe con un permiso propio, que vale 15 minutos y solo sirve para la jornada que acaba de
>   cerrar.

### 3.8 La versión

`version: '1.3'` y la fecha de vigencia el día del despliegue. **Ojo técnico:** `backend/src/utils/resenas.ts` guarda la
versión de la política en la constancia de cada reseña y tiene una copia (`VERSION_POLITICA = '1.2'`); hay una prueba que se
pone roja si las dos se separan, así que se suben juntas.

## 4. Textos del producto para aprobar

**En el kiosco, debajo de «¿Cómo te fue hoy, [nombre]?»** (hoy no hay nada). Propuesta:

> Es voluntario. Tu empresa verá tu respuesta con tu nombre.

Más corta, si al dueño le pesa: «Es voluntario y va con tu nombre.» El interruptor de lo confidencial sigue diciendo «Tu
empresa no verá tu nombre.», que es exactamente lo que cambia.

**En Configuración › Marcación, junto al interruptor «Calificación del día».** Hoy dice: «Al marcar la salida, el kiosco le
pregunta a cada colaborador cómo le fue hoy. Los resultados se ven en Clima laboral.» Se agrega:

> Las respuestas van con el nombre de cada persona. Avísale a tu equipo que la pregunta existe, para qué la usas y quién ve las
> respuestas.

## 5. Preguntas para el abogado

1. **¿Es un dato sensible?** Cómo se siente una persona en su trabajo, y motivos como «Algo personal», pueden rozar la salud
   (mental). Si lo es, la autorización tiene que ser expresa y facultativa, y hay que decirle a la persona que no está
   obligada. ¿Basta con «Es voluntario» en el kiosco? ¿Hace falta una constancia de la autorización, como la del rostro?
2. **Encendida por defecto en todas las empresas.** HoraPro es encargado de los datos de los trabajadores. Que la pregunta
   venga encendida la decide HoraPro y no la empresa: ¿eso lo convierte en responsable, o corresponsable, de esa recolección?
   ¿Basta con que la empresa la pueda apagar y con el texto del punto 4? La alternativa es que arranque apagada y que la
   empresa la encienda aceptando un texto que quede como constancia.
3. **Lo que se ve después.** Una empresa sin el plan solo ve cifras, pero las respuestas se guardan con nombre, y si contrata
   el plan las ve todas con nombre, también las de antes. ¿Es suficiente decirlo en la política, o hay que limitar lo que se
   ve con nombre a lo recogido desde que la empresa tiene el plan?
4. **Avisos que invitan a contratar.** HoraPro usa un conteo sacado de datos de los trabajadores («2 personas reportaron días
   malos seguidos») para ofrecerle a la empresa su plan. El aviso va solo a la empresa responsable y sin nombres. ¿Cabe dentro
   del encargo, o es una finalidad propia de HoraPro sobre datos que trata por cuenta de otro?
5. **La observación confidencial.** ¿«Tu empresa no verá tu nombre.» informa lo suficiente, si HoraPro guarda el autor y lo
   entregaría por orden de una autoridad? ¿Qué autoridades, y con qué requisitos, pueden pedirlo? El caso que motivó guardarlo
   es la Ley 1010 de 2006 (acoso laboral). Sigue abierto desde el 4 de octubre: `docs/CLIMA_LABORAL.md` §6.
6. **Los comentarios del seguimiento.** Son lo que la empresa escribe sobre un trabajador. ¿El trabajador tiene derecho a
   conocerlos? HoraPro no tiene cómo mostrárselos: tendría que pedírselos a su empresa.
7. **¿Es un cambio sustancial?** El punto 13 dice que un cambio en la finalidad lleva aviso de 15 días a los administradores y,
   para los trabajadores, una autorización nueva que pide su empleador. El clima es una finalidad nueva sobre los datos de los
   trabajadores, y las reseñas con nombre una finalidad nueva sobre los datos de los clientes. **La respuesta decide cuándo se
   puede desplegar** que la pregunta salga en todas las empresas (punto 2, número 11).
8. **El correo semanal, Telegram, la geocerca y el registro del sistema** ya están en producción y contradicen la 1.2. ¿Basta
   con corregir el texto (son la misma finalidad: controlar la jornada y operar el servicio) o alguno pide aviso?
9. **Las reseñas con nombre** se publican hoy bajo la 1.2, que no cubre esa finalidad, por decisión del dueño. Cada una tiene la
   constancia de lo que eligió su autor. ¿Algo que hacer con las ya publicadas?
10. **Términos para la empresa.** No existen. `docs/CLIMA_LABORAL.md` los pedía para que la empresa acepte, entre otras cosas,
    que es la responsable de informar a su equipo y que HoraPro no le entrega el autor de una nota confidencial. ¿Hacen falta,
    o basta con el punto 4.1 de la política?
11. **El registro de accesos (final del punto 0).** ¿Guardar la cédula escrita en un intento rechazado del kiosco, para
    detectar a quien prueba cédulas, cabe en la finalidad de seguridad si se declara, o conviene guardar solo una parte?

## 6. Lo que decide el dueño, no el abogado

- ~~**Punto 0:** salida A o B.~~ Decidido el 14 de octubre de 2026: A. En producción y con las filas viejas limpias desde el 15.
- **La cédula de los intentos rechazados del kiosco** (final del punto 0).
- **El plazo del registro del sistema.**
- **El texto del kiosco** del punto 4, y si va.
- **Si se despliega antes de la respuesta del abogado.** Recomendación: lo que ya está en producción y la política dice mal
  (punto 1) se corrige en la 1.3 cuanto antes, porque hoy la política afirma cosas falsas. Lo nuevo del clima para todas las
  empresas (punto 2, números 11 a 15) espera la respuesta a las preguntas 1, 2 y 7.
