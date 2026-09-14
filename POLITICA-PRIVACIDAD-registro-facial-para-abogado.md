# Registro facial por enlace: cambios a la Política de Tratamiento de Datos Personales

Para revisión del abogado. Borrador del 14 de septiembre de 2026.

Nada de esto está publicado ni desplegado. La política vigente es la versión 1.0 del 9 de septiembre de 2026 (`POLITICA-PRIVACIDAD-para-abogado.md` y `frontend/blog/legal/privacidad.mjs`). La función nueva no se sube a producción hasta que este documento esté aprobado y la política nueva publicada.

## 1. Qué cambia en el producto

Hasta hoy, el rostro de un trabajador solo lo registra el administrador de la empresa desde la ficha, marcando una casilla que dice que el colaborador autoriza. HoraPro no guarda constancia de esa autorización.

Con este cambio:

1. **El enlace.** Desde la ficha del trabajador, el administrador crea un enlace y se lo envía al trabajador por fuera de HoraPro: lo copia y lo manda por WhatsApp o por correo. HoraPro no le escribe a nadie. El enlace dura una hora, sirve una sola vez, y si se crea otro el anterior deja de servir.
2. **La cédula primero.** Al abrirlo, el trabajador escribe su cédula. Nada del registro se muestra antes de que coincida. Al quinto intento equivocado el enlace se bloquea.
3. **La decisión.** Lee el texto de la autorización y elige entre dos botones igual de visibles:
   - **Autoriza.** Marca la casilla de la autorización y la de «Soy mayor de edad», y escanea su rostro. Sin la casilla de mayor de edad no puede continuar.
   - **No autoriza.** Queda constancia de que no autorizó. Si ya tenía el rostro registrado, el registro se borra.
4. **Si ya estaba registrado,** ve desde cuándo, cuántas tomas tiene y su foto de perfil, y puede actualizar el registro o retirar su autorización.
5. **La constancia.** Toda decisión queda guardada con la fecha y la hora, el texto exacto que se mostró, si la tomó el trabajador desde su enlace o el administrador desde la ficha, la casilla de mayor de edad y qué usuario la registró. Desde ahora también queda constancia cada vez que el administrador registra un rostro desde la ficha.
6. **La etiqueta.** En la ficha y en la lista de trabajadores aparece «Rostro registrado» o «No autorizó».

Lo que NO cambia:

- Del rostro se sigue guardando solo el descriptor matemático. Las tomas del escaneo no se guardan, salvo la primera como foto de perfil cuando la ficha no tenía una, igual que hoy.
- El kiosco sigue permitiendo marcar con cédula, salvo que la empresa lo haya desactivado.
- Los registros faciales que ya existen no reciben constancia hacia atrás: no hay con qué escribirla con verdad.

## 2. Textos que hay que aprobar

Los tres primeros quedan guardados palabra por palabra en cada constancia. Si se cambian después, las constancias viejas conservan el texto que se mostró ese día.

**Autorización en el enlace, si la empresa permite marcar con cédula:**

> Autorizo a [nombre de la empresa] a tratar mi rostro como dato biométrico para identificarme cuando marco mi asistencia. Sé que es voluntario, que puedo marcar con mi cédula y que puedo retirar esta autorización cuando quiera.

**La misma, si la empresa no permite marcar con cédula.** No promete una salida que no existe:

> Autorizo a [nombre de la empresa] a tratar mi rostro como dato biométrico para identificarme cuando marco mi asistencia. Sé que es voluntario y que puedo retirar esta autorización cuando quiera.

**Casilla del administrador en la ficha.** No cambia: es la que ya se muestra hoy, y desde ahora queda en la constancia.

> El colaborador autoriza el tratamiento de su rostro como dato biométrico, conforme a la Ley 1581 de 2012 (Habeas Data).

**Casilla de edad en el enlace:**

> Soy mayor de edad.

**Botón para no autorizar:**

> No autorizo el uso de mis datos biométricos

**Avisos de la página del enlace.** Se muestran, pero no quedan en la constancia:

- Antes de las casillas: «Antes de escanear tu rostro, lee esto. Aceptar no es obligatorio.» y «De tu rostro se guarda un cálculo, que no se puede volver a convertir en una imagen. Si no tienes foto de perfil, la primera toma queda como tu foto.» Debajo, un enlace a la política de privacidad.
- Al confirmar el retiro: «Se borra tu registro facial y [empresa] ya no podrá reconocerte por tu rostro en el kiosco. Podrás marcar con tu cédula.» La última frase solo sale si la empresa lo permite.
- Al terminar sin autorizar: «Quedó registrado que no autorizas el uso de tu rostro.» Y, según la empresa, «Puedes marcar tu asistencia con tu cédula.» o «Pregúntale a tu empresa cómo vas a marcar tu asistencia.»
- El mensaje que copia el administrador para enviar el enlace: «Hola, [nombre]: con este enlace registras tu rostro para marcar asistencia en [empresa]. El enlace dura 1 hora y vence a las [hora].» seguido del enlace.

## 3. Preguntas para el abogado

1. **¿Basta con la declaración «Soy mayor de edad»?** HoraPro no comprueba la edad de nadie (punto 6.1). La casilla impide que un menor se registre solo si responde con verdad. El registro desde la ficha sigue sin preguntar la edad.
2. **¿La foto de perfil tiene que ir dentro del texto de la autorización?** Hoy se informa en la página, pero no queda en la constancia.
3. **La constancia la guarda HoraPro por cuenta de la empresa.** ¿Cambia algo del papel de encargado del punto 2? ¿Sirve a la empresa como prueba de la autorización, o la empresa debe seguir obteniéndola y conservándola por su cuenta?
4. **Conservación de las constancias.** Se conservan mientras exista la ficha del trabajador, también después de que retire su autorización, porque son la prueba de lo que decidió. Ninguna pantalla borra a un trabajador: el retiro solo lo marca como inactivo. Las constancias solo desaparecen si se elimina la cuenta de la empresa entera. ¿Debe conservarse la prueba del consentimiento aunque se elimine la empresa?
5. **Revocación.** El trabajador solo puede retirar su autorización con un enlace que le mande la empresa: no puede pedirlo a HoraPro por su cuenta desde el producto. ¿Basta con eso, junto con la puerta del empleador del punto 5.1?
6. **Tiempo hasta que el kiosco deja de reconocerlo.** Al retirar la autorización el descriptor se borra en el acto, pero el kiosco guarda en memoria los rostros de la empresa hasta 30 segundos. En ese lapso todavía podría reconocerlo. Pasa igual hoy cuando la empresa borra el registro desde la ficha.
7. **¿Es un cambio sustancial?** No cambia el responsable ni la finalidad, que sigue siendo identificar a la persona al marcar. Sí cambia qué datos se guardan (la constancia y los enlaces) y agrega una forma en que HoraPro le pide datos directamente al trabajador. Si es sustancial, el punto 13 obliga a avisar con 15 días de antelación a quienes tienen cuenta.

## 4. Cambios propuestos, punto por punto

Cada cambio trae lo que dice hoy la versión 1.0 publicada y la redacción propuesta.

### 4.1 Punto 4, datos que tratamos como encargado

**Dice hoy:**

> **Foto de perfil** y **datos biométricos**, que se explican en el punto 5.

**Propuesta:**

> **Foto de perfil**, **datos biométricos** y **la constancia de lo que se autorizó sobre el rostro**, que se explican en el punto 5.

### 4.2 Punto 5.1, primer párrafo

**Dice hoy:**

> Cuando la empresa registra el rostro de un trabajador, el navegador calcula un descriptor matemático, una lista de 128 números por cada toma, y ese descriptor se guarda asociado a la persona. También se guarda la fecha del registro. La primera toma se conserva como foto de perfil solo si la ficha no tenía una.

**Propuesta:**

> El rostro de un trabajador lo puede registrar el administrador de la empresa desde la ficha, o el propio trabajador con un enlace que le envía la empresa. En los dos casos el navegador calcula un descriptor matemático, una lista de 128 números por cada toma, y ese descriptor se guarda asociado a la persona. También se guarda la fecha del registro. Las tomas del escaneo no se guardan, salvo la primera, que se conserva como foto de perfil solo si la ficha no tenía una.

### 4.3 Punto 5.1, párrafo nuevo sobre el enlace

Va después del primer párrafo.

**Propuesta:**

> **El enlace de registro.** La empresa lo crea desde la ficha del trabajador y se lo envía por sus propios medios: HoraPro no le escribe al trabajador. El enlace dura una hora y sirve una sola vez. Antes de mostrar nada pide la cédula de la persona, y se bloquea si se escribe mal cinco veces. Después muestra el texto de la autorización con dos opciones igual de visibles: autorizar y registrar el rostro, para lo cual hay que declarar ser mayor de edad, o no autorizar. Si la persona ya tenía el rostro registrado, ve desde cuándo, cuántas tomas tiene y su foto de perfil, y puede actualizarlo o retirar su autorización.

### 4.4 Punto 5.1, quién obtiene y quién guarda la autorización

Es el párrafo que hoy dice que HoraPro «no almacena esa constancia», que deja de ser cierto.

**Dice hoy:**

> **La autorización del trabajador la obtiene y la conserva la empresa empleadora**, que es el responsable de ese dato y quien mantiene la relación laboral. HoraPro actúa como encargado y no almacena esa constancia. Antes de permitir el primer registro facial, el panel le recuerda al administrador de la empresa que debe contar con la autorización del titular.

**Propuesta:**

> **La autorización del trabajador la obtiene la empresa empleadora**, que es el responsable de ese dato y quien mantiene la relación laboral. HoraPro actúa como encargado y, por cuenta de la empresa, guarda una constancia de cada decisión que se toma en el sistema: la fecha y la hora, el texto exacto que se mostró, si la tomó el trabajador desde su enlace o el administrador desde la ficha, la declaración de mayoría de edad cuando la hay y qué usuario la registró. Antes de permitir el registro facial desde la ficha, el panel le recuerda al administrador que debe contar con la autorización del titular.

Depende de la pregunta 3: si la empresa debe seguir conservando la autorización por su cuenta, hay que decirlo aquí.

### 4.5 Punto 5.1, a quién acudir

**Dice hoy:**

> Si usted quiere saber qué autorizó, o revocarla, la puerta es su empleador. En el punto 12 le explicamos cómo proceder si no obtiene respuesta.

**Propuesta:**

> Si usted quiere saber qué autorizó, o revocarla, la puerta es su empleador. Si su empleador le envía un enlace de registro, desde ese enlace también puede retirar su autorización. En el punto 12 le explicamos cómo proceder si no obtiene respuesta.

### 4.6 Punto 5.1, revocación

**Dice hoy:**

> **Revocación.** La empresa puede eliminar en cualquier momento el registro facial de una persona desde su ficha. Al hacerlo se borra el descriptor y la fecha de registro. La foto de perfil se elimina por separado.

**Propuesta:**

> **Revocación.** La empresa puede eliminar en cualquier momento el registro facial de una persona desde su ficha, y el trabajador puede retirar su autorización desde un enlace de registro. En los dos casos se borran el descriptor y la fecha de registro. Cuando la retira el trabajador, queda además la constancia de que no autorizó, con su fecha. La foto de perfil se elimina por separado. El kiosco puede tardar hasta 30 segundos en dejar de reconocer a la persona.

### 4.7 Punto 6.1, lo que HoraPro le pide directamente al trabajador

**Dice hoy (última frase del primer párrafo):**

> Lo único que HoraPro le pide directamente a un trabajador es lo del kiosco al marcar: su cédula o su rostro para identificarse, y la fotografía que queda como evidencia de la marcación.

**Propuesta:**

> HoraPro le pide directamente a un trabajador solo dos cosas. En el kiosco, al marcar: su cédula o su rostro para identificarse, y la fotografía que queda como evidencia de la marcación. Y en el enlace de registro facial, si su empresa se lo envía: su cédula para confirmar que es él, su decisión sobre la autorización, la declaración de que es mayor de edad, que es obligatoria para autorizar, y el escaneo de su rostro.

### 4.8 Punto 6.1, la edad

**Dice hoy (comienzo del párrafo):**

> **HoraPro no comprueba la edad de nadie.** La fecha de nacimiento de la ficha es opcional, no se valida contra ninguna edad mínima ni máxima, y su único uso en el producto es la lista de cumpleaños del mes.

**Propuesta (se agrega al final de ese párrafo):**

> El enlace de registro facial le pide a la persona declarar que es mayor de edad antes de autorizar, y no la deja registrarse sin esa declaración. Es una declaración de la persona, no una comprobación.

### 4.9 Punto 6.2, la constancia del representante legal

La frase «no guarda esa constancia» se puede leer como que HoraPro no guarda ninguna constancia.

**Dice hoy:**

> ... no tiene relación con el trabajador ni con su familia, y no guarda esa constancia.

**Propuesta:**

> ... no tiene relación con el trabajador ni con su familia, y no guarda la constancia de la autorización de su representante legal.

### 4.10 Punto 6.3, primer punto de la lista

**Dice hoy:**

> La casilla que el panel muestra antes del primer registro facial dice que autoriza **el colaborador**. No contempla a un representante legal, y no hay dónde dejar constancia de su autorización.

**Propuesta:**

> La casilla que el panel muestra antes del registro facial desde la ficha dice que autoriza **el colaborador**. No contempla a un representante legal, y no hay dónde dejar constancia de su autorización. El enlace de registro, por su parte, exige declarar que se es mayor de edad para autorizar: no está pensado para que lo use un menor ni su representante.

### 4.11 Punto 7, tabla de conservación

**Dice hoy (fila):**

> Descriptor facial y foto de perfil | Hasta que la empresa los elimine desde la ficha del trabajador. No hay borrado automático.

**Propuesta:**

> Descriptor facial y foto de perfil | Hasta que la empresa los elimine desde la ficha del trabajador, o hasta que el trabajador retire su autorización desde un enlace de registro, que borra el descriptor. No hay borrado automático.

**Filas nuevas:**

> Constancias de la autorización del registro facial | Mientras exista la ficha del trabajador, también después de que retire su autorización o de que se borre su registro facial, porque son la prueba de lo que se decidió. El retiro de un trabajador no las elimina. Solo se eliminan si se elimina la cuenta de la empresa.

> Enlaces de registro facial | De cada enlace se guarda su huella, nunca el enlace mismo, con su vencimiento, si se usó y los intentos de cédula equivocada. Se conservan como las constancias. Un enlace vencido o usado no sirve para nada.

Depende de la pregunta 4.

### 4.12 Punto 10, seguridad

**Dice hoy (un punto de la lista):**

> Límite de intentos por minuto en las pantallas públicas del kiosco.

**Propuesta:**

> Límite de intentos por minuto en las pantallas públicas del kiosco y del enlace de registro facial.

**Punto nuevo:**

> El enlace de registro facial dura una hora, sirve una sola vez y se bloquea al quinto intento de cédula equivocada. En la base de datos se guarda solo su huella: con lo guardado no se puede armar un enlace que funcione.

### 4.13 Versión y vigencia

Subir la versión a 1.1 y poner como fecha de vigencia el día en que se publique. Si el cambio es sustancial (pregunta 7), el aviso de 15 días va antes de desplegar la función.

## 5. Después de la aprobación

1. Aplicar los cambios aprobados en `frontend/blog/legal/privacidad.mjs` y en `POLITICA-PRIVACIDAD-para-abogado.md`, con la versión y la fecha nuevas.
2. Si el abogado cambia algún texto de la sección 2, cambiarlo en el código (`backend/src/utils/registroFacial.ts` y la página del enlace) antes de desplegar, para que las constancias guarden el texto aprobado.
3. Publicar la política nueva y, recién después o el mismo día, desplegar el registro por enlace.
