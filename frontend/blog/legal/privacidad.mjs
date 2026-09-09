// Política de Tratamiento de Datos Personales (Ley 1581 de 2012).
//
// CADA AFIRMACIÓN DE ESTE DOCUMENTO CORRESPONDE A ALGO QUE EL CÓDIGO HACE HOY.
// Se escribió después de inventariar el producto entero, y donde el producto no
// hace algo, el texto no lo promete. Ese es el punto: una política que promete
// lo que el software no cumple es prueba en contra, no protección.
//
// Los tramos marcados con PENDIENTE son datos que no están en el repositorio y
// que solo puede aportar el dueño del negocio. Mientras existan, la página sale
// con `noindex` y no se enlaza desde el pie, para que no se publique a medias.
//
// DOS COSAS QUE EL TEXTO YA AFIRMA Y QUE HAY QUE DEJAR CIERTAS ANTES DE PUBLICAR:
//   1. La copia de seguridad semanal que sobreescribe la anterior. El dueño se
//      comprometió a configurarla; mientras no exista, esa fila de la tabla de
//      conservación es una promesa y no una descripción.
//   2. La casilla privacidad@horapro.co, que es el canal formal declarado.
//
// ANTES DE PUBLICARLA TIENE QUE REVISARLA UN ABOGADO. Este archivo describe con
// precisión lo que el software hace; no sustituye el concepto jurídico sobre si
// eso basta.
//
// EL RESPONSABLE ES HOY UNA PERSONA NATURAL, y es provisional: cuando se
// constituya la sociedad hay que cambiar tres cosas y todas viven aquí.
//   1. La sección 1 (quiénes somos): razón social y NIT en vez del nombre.
//   2. La sección 13: la exención del RNBD deja de aplicar. Una sociedad se
//      inscribe si supera el umbral de activos, así que hay que volver a mirarlo.
//   3. Subir `version` y la fecha de vigencia, porque cambia el responsable y
//      eso es un cambio sustancial que hay que informar (sección 13).
//
// REVISIÓN JURÍDICA. El 8 de septiembre de 2026 el abogado aprobó la versión del
// commit 08beabb, con el encargo de incorporar además los siete ajustes que
// salieron de comparar este documento con la política de CHACAM TRADING S.A.S.
// Al redactarlos aparecieron DOS CORRECCIONES QUE EL ABOGADO NO VIO, porque no
// estaban entre esos siete y son sobre el texto que él aprobó:
//   a. La sección 8 llamaba «transferencia internacional» al alojamiento en
//      Banahosting. Jurídicamente es una TRANSMISIÓN: Banahosting no decide nada
//      sobre los datos, los aloja por cuenta nuestra. La distinción está en el
//      artículo 3 del Decreto 1377 y cambia el régimen aplicable.
//   b. La sección 12 afirmaba que «la base de datos lleva esa anotación» de
//      reclamo en trámite. El producto no lo hace: `grep -rn reclamo backend/src
//      backend/prisma/schema.prisma` no devuelve nada. Era una promesa incumplida
//      dentro del documento que prohíbe hacer promesas incumplidas.
// El 9 de septiembre de 2026 el dueño dio el documento por aprobado y final con
// esas dos correcciones incluidas, y se publicó ese mismo día como versión 1.0.
// Quedan anotadas aquí porque el abogado no las revisó una por una: si alguna
// vez hay que defender este texto, conviene saber cuál fue el alcance real de la
// revisión jurídica.

export const PRIVACIDAD = {
  ruta: '/legal/privacidad/',
  titulo: 'Política de Tratamiento de Datos Personales | HoraPro',
  h1: 'Política de Tratamiento de Datos Personales',
  descripcion: 'Qué datos personales trata HoraPro, para qué, con quién los comparte, cuánto los conserva y cómo ejercer sus derechos. Ley 1581 de 2012.',
  version: '1.0',

  // Estas dos se cambian JUNTAS. Separarlas es la forma de que una se quede
  // atrás: la fecha de vigencia solo es honesta si es el día en que el documento
  // de verdad quedó publicado.
  //
  // `borrador: false` la saca del noindex, la mete al sitemap y hace aparecer el
  // enlace en los dos pies de página. `src/lib/legal.ts` lleva una copia de este
  // interruptor y `legal.test.ts` se pone rojo si las dos se separan.
  //
  // PUBLICADA el 9 de septiembre de 2026, versión 1.0.
  borrador: false,
  fechaVigencia: '9 de septiembre de 2026',

  // Lo que faltaba antes de publicar. Vacío porque ya no queda nada: la casilla
  // privacidad@horapro.co existe, la copia semanal quedó configurada y el
  // abogado dio el documento por aprobado y final.
  //
  // Este array se pinta en la propia página mientras `borrador` sea true. Si
  // algún día vuelve a haber algo pendiente, se llena y se vuelve a poner en
  // borrador: publicar a medias es lo que esto existe para impedir.
  //
  // LO QUE SIGUE SIENDO UNA OBLIGACIÓN VIVA, aunque no bloquee la publicación,
  // porque el documento ya lo promete y no lo hace ningún software:
  //   1. Alguien tiene que leer privacidad@horapro.co a diario. Desde que llega
  //      el mensaje corren los plazos de 2, 10 y 15 días hábiles del punto 12.
  //      El de 2 días es el del traslado, y un mensaje que llega el viernes
  //      vence el martes.
  //   2. El registro interno de solicitudes, por fuera del producto, que es
  //      donde el punto 12.3 dice que queda la constancia del reclamo en
  //      trámite. Una carpeta o una hoja de cálculo basta: el sistema no tiene
  //      dónde escribir esa anotación y el documento no dice que lo tenga.
  pendientes: [],

  secciones: [
    {
      id: 'quienes',
      titulo: '1. Quiénes somos',
      html: `<p>HoraPro es un software de control de horas y liquidación de nómina para empresas colombianas, disponible en <a href="https://horapro.co">horapro.co</a>.</p>
<p>Este documento explica qué datos personales tratamos, para qué, con quién los compartimos, cuánto tiempo los guardamos y cómo puede usted ejercer sus derechos. Está escrito para que lo entienda cualquier persona.</p>
<p>Para cualquier asunto relacionado con sus datos personales puede escribirnos a <a href="mailto:privacidad@horapro.co">privacidad@horapro.co</a>. La identificación completa del responsable del tratamiento está al final de este documento.</p>`,
    },
    {
      id: 'dos-papeles',
      titulo: '2. Dos situaciones distintas, no las confunda',
      html: `<p>HoraPro trata datos personales en dos papeles diferentes, y sus derechos se ejercen ante personas distintas según el caso.</p>
<p><b>HoraPro como responsable.</b> De los datos de quien contrata el servicio, lo paga, participa en el programa de afiliados o visita nuestro sitio. Aquí decidimos nosotros qué se hace con la información, y usted ejerce sus derechos directamente ante HoraPro.</p>
<p><b>HoraPro como encargado.</b> De los datos de los trabajadores de las empresas que usan HoraPro. Ahí el responsable es la empresa empleadora: ella decide qué datos carga, para qué los usa, quién los ve dentro de su organización y cuánto tiempo los conserva. Nosotros solo prestamos la herramienta y guardamos la información por cuenta de ella.</p>
<p>Si usted es trabajador de una empresa que usa HoraPro, la primera puerta para pedir acceso, corrección o eliminación de sus datos es <b>su empleador</b>, no HoraPro. Aun así puede escribirnos: trasladamos su solicitud a la empresa responsable dentro de los 2 días hábiles siguientes y le avisamos a quién, como se explica en el punto 12.</p>`,
    },
    {
      id: 'responsable',
      titulo: '3. Datos que tratamos como responsable',
      html: `<h3>3.1 De quien crea una cuenta y contrata</h3>
<p>Recogemos el nombre de la empresa, el NIT, el teléfono, y el nombre, correo y contraseña de la persona que administra la cuenta. La contraseña no se guarda: se almacena un valor cifrado en un solo sentido, del que no se puede recuperar la original.</p>
<p>Se usan para crear y mantener la cuenta, verificar el correo, permitir el restablecimiento de la contraseña, cobrar la suscripción y prestar soporte.</p>

<h3>3.2 De quien participa en el programa de afiliados</h3>
<p>Nombre, correo, teléfono y los datos necesarios para pagarle la comisión: método de pago, banco, tipo y número de cuenta o número de celular, nombre del titular y su cédula o NIT. Se usan para liquidar y pagar las comisiones y practicar las retenciones que correspondan.</p>

<h3>3.3 De quien visita el sitio público</h3>
<p>No usamos herramientas de analítica, ni píxeles publicitarios, ni cookies propias de seguimiento. En el sitio no hay Google Analytics, Tag Manager, píxel de Meta, Hotjar ni Clarity. Lo que sí ocurre está en los puntos 8 y 9.</p>

<h3>3.4 Registros técnicos del servidor</h3>
<p>Nuestro servidor deja constancia técnica de cada petición que recibe, incluida la dirección IP desde la que se hace. Es el comportamiento estándar de un servidor y su finalidad es el diagnóstico de fallas y la seguridad.</p>`,
    },
    {
      id: 'encargado',
      titulo: '4. Datos que tratamos como encargado',
      html: `<p>Son los datos de los trabajadores de nuestros clientes. La empresa empleadora los carga y los administra; HoraPro los almacena y los procesa para prestarle el servicio a ella.</p>
<p><b>Identificación y vínculo laboral:</b> nombre, apellido, cédula, cargo, correo, teléfono, fecha de nacimiento, salario mensual, sede o sedes asignadas, modalidad de trabajo, horario, contrato laboral y sus prórrogas, fecha y motivo de ingreso y de retiro, y los documentos que la empresa adjunte como soporte.</p>
<p><b>Jornada:</b> fecha, hora de entrada, hora de salida, salida y regreso de almuerzo, tardanzas, la sede en la que se marcó, las observaciones que escriba el administrador y el historial de correcciones manuales, con qué se cambió, de qué valor a cuál, quién lo cambió y cuándo.</p>
<p><b>Novedades y ausencias:</b> tipo de novedad (incapacidad de EPS o de ARL, licencias, calamidad, cita médica), su descripción y el documento que se adjunte como soporte.</p>
<p><b>Foto de perfil</b> y <b>datos biométricos</b>, que se explican en el punto 5.</p>
<p><b>Ubicación al marcar.</b> Cuando la empresa activa la geocerca, el dispositivo envía la ubicación en el momento de marcar. <b>Esa coordenada no se guarda.</b> Se usa en el instante para decidir si la marca cae dentro del sitio de trabajo y se descarta. De esa decisión solo queda registrada la sede. HoraPro no almacena el recorrido ni la ubicación de ningún trabajador.</p>
<p><b>Quién ve estos datos.</b> Los usuarios de la propia empresa con rol de administrador o de supervisor.</p>
<p>HoraPro, como proveedor, no dispone de ninguna pantalla ni función que le permita ver los nombres, las cédulas, los salarios, las fotos, los datos biométricos ni las novedades de los trabajadores de sus clientes. Nuestro panel interno solo muestra conteos, facturación y comprobantes de pago.</p>
<p>Como en cualquier servicio de software, el personal técnico que opera y mantiene la infraestructura cuenta con acceso administrativo a la base de datos. Ese acceso se usa exclusivamente para operar el servicio, hacer copias de seguridad y resolver fallas, y está sujeto a los deberes de confidencialidad de esta política.</p>`,
    },
    {
      id: 'sensibles',
      titulo: '5. Datos sensibles: rostro y salud',
      html: `<p>La ley colombiana considera sensibles, entre otros, los datos biométricos y los relativos a la salud. HoraPro trata dos de esa clase.</p>

<h3>5.1 Reconocimiento facial</h3>
<p>Cuando la empresa registra el rostro de un trabajador, el navegador calcula un descriptor matemático, una lista de 128 números por cada toma, y ese descriptor se guarda asociado a la persona. También se guarda la fecha del registro. La primera toma se conserva como foto de perfil solo si la ficha no tenía una.</p>
<p>El cálculo se hace en el propio navegador y con modelos servidos desde nuestro dominio. Ese dato no se envía a ningún proveedor externo de reconocimiento facial.</p>
<p>Cada vez que alguien marca entrada o salida en el kiosco se guarda además <b>una fotografía del rostro</b> como evidencia de la marcación.</p>
<p><b>Sobre la autorización.</b> Autorizar el tratamiento de un dato sensible es facultativo: ninguna persona está obligada a hacerlo, y ninguna actividad puede condicionarse a entregarlo.</p>
<p><b>La autorización del trabajador la obtiene y la conserva la empresa empleadora</b>, que es el responsable de ese dato y quien mantiene la relación laboral. HoraPro actúa como encargado y no almacena esa constancia. Antes de permitir el primer registro facial, el panel le recuerda al administrador de la empresa que debe contar con la autorización del titular.</p>
<p>Si usted quiere saber qué autorizó, o revocarla, la puerta es su empleador. En el punto 12 le explicamos cómo proceder si no obtiene respuesta.</p>
<p><b>Sobre la alternativa.</b> El kiosco permite marcar con cédula sin usar el rostro. La configuración le permite a la empresa desactivar esa opción y dejar el rostro como única vía. Recomendamos expresamente <b>no</b> hacerlo, porque condicionar la marcación de asistencia a entregar un dato biométrico es contrario a la ley.</p>
<p><b>Revocación.</b> La empresa puede eliminar en cualquier momento el registro facial de una persona desde su ficha. Al hacerlo se borra el descriptor y la fecha de registro. La foto de perfil se elimina por separado.</p>

<h3>5.2 Datos de salud</h3>
<p>Cuando un trabajador reporta una incapacidad o una cita médica, HoraPro almacena el tipo de novedad, su descripción y el documento que se adjunte, que en la práctica suele ser una incapacidad médica. Es un dato de salud y por lo tanto sensible.</p>
<p>Ese soporte lo pueden ver los usuarios de la empresa con rol de administrador o de supervisor. HoraPro no lo envía por correo, ni por mensajería, ni a ningún tercero.</p>
<p>Adjuntar el soporte es facultativo, y esa autorización, igual que la del rostro, la debe obtener la empresa empleadora.</p>`,
    },
    {
      id: 'menores',
      titulo: '6. Datos de niños, niñas y adolescentes',
      html: `<h3>6.1 El servicio no está dirigido a menores de edad</h3>
<p>HoraPro es una herramienta de trabajo para empresas. No está pensado para menores de edad y no tiene contenido dirigido a ellos. La ficha del trabajador, con todos sus datos, la crea y la administra la empresa empleadora, como se explica en el punto 4. Lo único que HoraPro le pide directamente a un trabajador es lo del kiosco al marcar: su cédula o su rostro para identificarse, y la fotografía que queda como evidencia de la marcación.</p>
<p>Tampoco existe en el producto ningún campo para datos de familiares. No hay hijos, ni cónyuge, ni beneficiarios, ni acudiente, ni representante legal, ni contacto de emergencia. Nada de eso lo pedimos y nada de eso lo guardamos. El correo y el teléfono que sí tiene la ficha son opcionales y son los del propio trabajador.</p>
<p>Lo decimos con una salvedad, porque los campos de texto libre de la ficha, de las marcaciones y de las novedades admiten lo que escriba la empresa, y los soportes que adjunte pueden contener cualquier cosa. Le pedimos a la empresa empleadora no usar esos campos para datos de terceros, y menos de menores de edad.</p>
<p><b>HoraPro no comprueba la edad de nadie.</b> La fecha de nacimiento de la ficha es opcional, no se valida contra ninguna edad mínima ni máxima, y su único uso en el producto es la lista de cumpleaños del mes. El sistema no distingue a un trabajador menor de edad de uno mayor y no puede advertirle a la empresa que lo es.</p>

<h3>6.2 Si la empresa vincula a un adolescente autorizado para trabajar</h3>
<p>En Colombia la edad mínima para trabajar es de quince años, y un adolescente entre 15 y 17 años puede estar vinculado laboralmente cuando lo autoriza el inspector de trabajo o, en su defecto, el ente territorial local, con jornada y condiciones especiales. Así lo fija el artículo 35 del Código de la Infancia y la Adolescencia. HoraPro admite además el contrato de aprendizaje.</p>
<p>Si una empresa cliente vincula a una persona en esa situación y la carga en el sistema, su ficha vive en HoraPro igual que la de cualquier otro trabajador: identificación, cargo, horario, jornada marcada, novedades con sus soportes y, si le cargan una foto o le registran el rostro, foto de perfil, registro facial y la fotografía de cada marcación.</p>
<p>El tratamiento de datos de niños, niñas y adolescentes no es un tratamiento común con requisitos añadidos: la regla de partida es la prohibición. El artículo 7 de la Ley 1581 de 2012 ordena asegurar el respeto de sus derechos prevalentes y declara proscrito el tratamiento de sus datos personales, salvo los de naturaleza pública. La Corte Constitucional, en la sentencia C-748 de 2011, precisó que esa prohibición no es absoluta: esos datos sí pueden tratarse, siempre que no se ponga en riesgo la prevalencia de sus derechos fundamentales y que el tratamiento responda a su interés superior, lo que se aprecia caso por caso. Cumplido eso, el artículo 12 del Decreto 1377 de 2013 agrega que la autorización la otorga el representante legal, y solo después de que el menor haya ejercido su derecho a ser escuchado. Su opinión se valora según su madurez, su autonomía y su capacidad para entender el asunto.</p>
<p><b>Esa autorización la obtiene y la conserva la empresa empleadora</b>, que es el responsable del dato, igual que ocurre con la autorización del rostro y con los soportes médicos del punto 5. HoraPro actúa como encargado: almacena y procesa la información por cuenta de la empresa, no tiene relación con el trabajador ni con su familia, y no guarda esa constancia. El panel no tiene ningún campo para registrar la autorización de un padre, una madre o un representante legal, ni en la ficha ni en el flujo del registro facial. Eso no nos deja al margen: el mismo artículo 12 le exige tanto al responsable como al encargado velar por el uso adecuado de esos datos, y de ahí sale lo que decimos enseguida.</p>

<h3>6.3 Recomendamos no activar el registro facial de un trabajador menor de edad</h3>
<p>Es una recomendación expresa, del mismo tipo que la del punto 5 sobre no dejar el rostro como única forma de marcar.</p>
<p>Un dato biométrico de un menor de edad reúne dos agravantes a la vez. Es un dato sensible, que la ley solo permite tratar con autorización explícita y facultativa, y es de una persona cuyos derechos son prevalentes y cuya autorización no la da él mismo, sino su representante legal después de escucharlo. A eso se suma que un rostro no se puede cambiar: identifica a esa persona el resto de su vida, y quien empieza a entregarlo a los dieciséis años lo entrega para siempre.</p>
<p>Y así funciona hoy el producto, que es la razón práctica de la recomendación:</p>
<ul>
  <li>La casilla que el panel muestra antes del primer registro facial dice que autoriza <b>el colaborador</b>. No contempla a un representante legal, y no hay dónde dejar constancia de su autorización.</li>
  <li>El descriptor facial no se borra solo. Se conserva hasta que la empresa lo elimine desde la ficha del trabajador.</li>
  <li>Salvo que la empresa lo haya desactivado en su configuración, el kiosco permite marcar con la cédula, sin usar el rostro. Mientras esa opción siga activa, no registrar el rostro no le quita nada a la empresa ni al control de la jornada. Dejar el rostro como única vía es justamente lo que desaconsejamos en el punto 5.</li>
</ul>

<h3>6.4 Qué hacemos si nos enteramos de un caso así</h3>
<p>Empezamos por lo que no podemos hacer, para no prometerlo. HoraPro no detecta menores de edad, porque el sistema no calcula edades. Y como encargado no nos corresponde decidir sobre los datos que la empresa responsable guarda en su cuenta: esa información no es nuestra y disponer de ella por cuenta propia sería excedernos.</p>
<p>Si llega a nuestro conocimiento que se están tratando en HoraPro datos de un menor de edad sin la autorización de su representante legal, sea por aviso de la empresa, del propio menor, de quien lo represente o de cualquier persona, esto es lo que hacemos:</p>
<ol>
  <li>Le escribimos a la empresa responsable, le explicamos las condiciones del artículo 12 del Decreto 1377 de 2013 y le pedimos la constancia de la autorización del representante legal.</li>
  <li>Si nos llega como reclamo y el responsable es la empresa y no HoraPro, damos traslado a la empresa dentro de los dos días hábiles siguientes y le informamos a quien reclamó que lo hicimos, como se explica en el punto 12.</li>
  <li>Atendemos las instrucciones de la empresa responsable sobre esos datos, incluida la de eliminar el registro facial o la foto de perfil, que también puede hacer ella misma desde la ficha del trabajador.</li>
  <li>Si la empresa no responde o insiste en tratar esos datos sin la autorización, podemos suspender o terminar la prestación del servicio. Es lo que está en nuestras manos, y lo decimos así de claro para no aparentar una facultad que no tenemos.</li>
</ol>
<p>Una precisión sobre quién puede reclamar. Los derechos de un niño, una niña o un adolescente los ejercen quienes estén facultados para representarlo, y también pueden ejercerlos sus causahabientes o un apoderado, acreditando esa calidad. Si usted nos escribe en nombre de un menor, díganos en qué calidad lo hace.</p>
<p>Para cualquiera de estos casos escríbanos a <a href="mailto:privacidad@horapro.co">privacidad@horapro.co</a>.</p>`,
    },
    {
      id: 'conservacion',
      titulo: '7. Cuánto tiempo conservamos la información',
      html: `<p>Somos precisos aquí, porque prometer un plazo que no se cumple sería peor que no prometer nada.</p>
<table class="tabla-legal">
<thead><tr><th>Dato</th><th>Plazo real hoy</th></tr></thead>
<tbody>
<tr><td>Fotografía de cada marcación</td><td><b>Se elimina automáticamente a los 60 días.</b> Un proceso del servidor vacía esas imágenes de todo registro con más de 60 días. La marcación en sí, con su fecha, hora y sede, no se borra.</td></tr>
<tr><td>Registro de jornada</td><td>Se conserva de forma indefinida. Es el soporte de la liquidación de nómina y de una eventual inspección laboral, y su conservación la determina la empresa empleadora conforme a sus obligaciones legales.</td></tr>
<tr><td>Ficha del trabajador, contratos, novedades y sus soportes</td><td>Mientras dure la relación de la empresa con HoraPro y mientras la empresa deba conservarlos por sus obligaciones laborales, contables y legales. El retiro de un trabajador lo marca como inactivo y <b>no elimina su información</b>.</td></tr>
<tr><td>Descriptor facial y foto de perfil</td><td>Hasta que la empresa los elimine desde la ficha del trabajador. No hay borrado automático.</td></tr>
<tr><td>Datos de la cuenta, suscripción, pagos y comprobantes</td><td>Mientras dure la relación comercial y después, mientras sean necesarios para obligaciones contables, tributarias y legales.</td></tr>
<tr><td>Registros técnicos del servidor</td><td>Los genera y los conserva nuestro proveedor de hosting conforme a su propia configuración, sobre la que no tenemos control. No los usamos para perfilar a nadie: su única finalidad es diagnosticar fallas y detectar abusos.</td></tr>
<tr><td>Copias de seguridad</td><td>Se hace una copia semanal de la base de datos, y cada copia nueva reemplaza a la anterior. Eso significa que un dato eliminado puede seguir existiendo en la copia vigente <b>hasta siete días</b> después de haberlo borrado, y desaparece cuando esa copia se sobrescribe.</td></tr>
</tbody>
</table>`,
    },
    {
      id: 'terceros',
      titulo: '8. Con quién compartimos información',
      html: `<p>No vendemos ni alquilamos datos personales. Compartimos únicamente lo indispensable, y solo en estos casos.</p>
<p><b>Wompi, pasarela de pagos.</b> El pago de la suscripción se hace en el sitio de Wompi. HoraPro <b>no recibe, no ve y no almacena datos de tarjetas</b>. Al abrir el pago solo se le envían la llave pública, la moneda, el monto, una referencia interna y una firma de seguridad. No se envía nombre, correo ni NIT del pagador. De vuelta guardamos el identificador y el estado de la transacción.</p>
<p><b>Servidor de correo.</b> Enviamos correos transaccionales, como el código de verificación, el restablecimiento de contraseña y la invitación a afiliados, a través del servidor de correo de nuestro proveedor de hosting. Nunca enviamos por correo datos de trabajadores, ni novedades, ni soportes médicos.</p>
<p><b>Telegram, opcional y desactivado por defecto.</b> Si la empresa lo configura, HoraPro envía a un chat o grupo de Telegram un aviso de llegada tarde que contiene <b>el nombre y apellido del trabajador, la hora de llegada y los minutos de retraso</b>. Esa información sale de nuestros servidores hacia Telegram, que la conserva bajo sus propias condiciones y fuera de nuestro control. Si la empresa configura un grupo, todos sus miembros ven el aviso. Activarlo es decisión de la empresa empleadora, y es ella quien debe contar con la autorización de sus trabajadores.</p>
<p><b>YouTube.</b> El video de presentación de nuestra página de inicio se reproduce desde YouTube. Su navegador se conecta a servidores de Google, que reciben su dirección IP y los datos de su navegador y pueden instalar cookies propias.</p>
<p><b>Proveedor de infraestructura, con almacenamiento fuera de Colombia.</b> Toda la información se almacena en los servidores de <b>Banahosting</b>, cuya infraestructura está ubicada en <b>Estados Unidos</b>. Eso significa que sus datos personales salen de Colombia. Banahosting no decide nada sobre esos datos: los aloja por cuenta nuestra y siguiendo nuestras instrucciones.</p>
<p>Por eso, en los términos del Decreto 1377 de 2013, esta operación es una <b>transmisión</b> y no una transferencia. La diferencia está en quién recibe: en una transferencia quien recibe pasa a decidir sobre los datos, y en una transmisión los trata por cuenta de quien se los entrega. Las dos definiciones están en el anexo del final.</p>
<p>Además, mediante la Circular Externa 5 del 10 de agosto de 2017, la Superintendencia de Industria y Comercio declaró a Estados Unidos como país con un nivel adecuado de protección de datos personales. Se lo informamos porque usted tiene derecho a saber dónde están sus datos.</p>`,
    },
    {
      id: 'cookies',
      titulo: '9. Cookies y almacenamiento en el navegador',
      html: `<p>HoraPro no instala cookies propias. Para funcionar guarda en su navegador, en almacenamiento local y no en cookies:</p>
<ul>
  <li>El token de su sesión, que dura 7 días y se borra al cerrar sesión.</li>
  <li>Preferencias de interfaz, como si ya vio la guía de bienvenida o los avisos de novedades.</li>
  <li>En la tablet del kiosco, un identificador del dispositivo autorizado. La sesión del trabajador no se guarda: vive solo mientras la pantalla está abierta.</li>
  <li>Si usted llegó desde el enlace de un afiliado, el código de ese afiliado, <b>sin fecha de vencimiento</b>, para atribuirle el registro si algún día crea una cuenta. Se borra al completar el registro, y usted puede eliminarlo borrando los datos del sitio en su navegador.</li>
</ul>
<p>Como se explica en el punto 8, el reproductor de YouTube sí puede instalar cookies de Google en su navegador.</p>`,
    },
    {
      id: 'seguridad',
      titulo: '10. Seguridad',
      html: `<p>Aplicamos estas medidas, que son las que el producto tiene hoy:</p>
<ul>
  <li>Acceso al panel con usuario y contraseña. Las contraseñas se guardan con un algoritmo de un solo sentido y no son recuperables.</li>
  <li>Verificación del correo al crear la cuenta, y enlaces de recuperación con vencimiento.</li>
  <li>Separación estricta por empresa: cada consulta del sistema está limitada a la empresa del usuario que la hace.</li>
  <li>El enlace del kiosco es único por empresa, y la empresa puede exigir que solo marquen dispositivos previamente autorizados.</li>
  <li>Límite de intentos por minuto en las pantallas públicas del kiosco.</li>
  <li>Los datos biométricos y los soportes médicos no se exponen en los listados del sistema y solo se entregan a solicitud expresa de un usuario autorizado de la empresa.</li>
  <li>Los pagos con tarjeta se hacen en el sitio de la pasarela. HoraPro no manipula datos de tarjeta.</li>
</ul>
<p>Ninguna medida elimina por completo el riesgo. Si detectamos un incidente que afecte datos personales, lo informaremos a los responsables afectados y a la autoridad cuando corresponda.</p>`,
    },
    {
      id: 'derechos',
      titulo: '11. Sus derechos',
      html: `<h3>11.1 Lo que la ley le reconoce</h3>
<p>Como titular de datos personales usted puede:</p>
<ol>
  <li>Conocer, actualizar y rectificar sus datos.</li>
  <li>Solicitar prueba de la autorización que otorgó, salvo cuando la ley no la exija.</li>
  <li>Ser informado sobre el uso que se le ha dado a sus datos.</li>
  <li>Presentar quejas ante la Superintendencia de Industria y Comercio por incumplimientos. En el punto 12 le explicamos cuándo procede esa queja.</li>
  <li>Revocar la autorización y solicitar la supresión del dato, en los términos que se explican enseguida.</li>
  <li>Acceder de forma gratuita a sus datos. La ley le garantiza al menos una consulta gratuita al mes, y otra cada vez que cambiemos esta política de forma sustancial. HoraPro no cobra por ninguna.</li>
</ol>

<h3>11.2 Cuándo no podemos suprimir el dato ni aceptar la revocatoria</h3>
<p>Usted puede pedir la supresión de sus datos o revocar la autorización en cualquier momento. Lo que no siempre procede es que se la concedamos. La ley reconoce esos dos derechos cuando usted no tiene un deber legal o contractual de permanecer en la base de datos, o cuando la Superintendencia de Industria y Comercio ha establecido que el tratamiento fue contrario a la ley. Estas son las situaciones concretas en las que no podemos atender su solicitud.</p>
<p><b>Cuando el dato es el soporte de una relación laboral.</b> Quien está trabajando figura en la base de datos de su empresa porque su contrato y la ley laboral lo suponen, y por eso no puede pedir que se le borre de ella. Terminado el vínculo, el deber ya no es suyo sino de la empresa, que debe conservar los registros de jornada y los contratos como prueba de lo que se trabajó y de lo que se pagó. Mientras la empresa deba conservarlos, no los vamos a suprimir a solicitud del trabajador, aunque revoque la autorización.</p>
<p><b>Cuando el dato es un soporte contable o tributario.</b> La regla general es la contraria: cumplida la finalidad para la que se recogió, el dato se suprime. La excepción tiene su propio límite, y el dato se conserva mientras haga falta para cumplir esa obligación y no más. Es lo que pasa con los pagos y los comprobantes de la suscripción, que hay que guardar aunque la cuenta ya esté cerrada. Qué conservamos por esa razón, y hasta cuándo, está en el punto 7.</p>
<p><b>Cuando quien pide no acredita que puede pedirlo.</b> Estos derechos los ejerce el titular, sus causahabientes o su representante o apoderado. Por eso le podremos pedir que acredite quién es y, si escribe en nombre de otra persona, que acredite que puede hacerlo. Borrar sin comprobarlo sería darle a un desconocido el poder de eliminar los datos de otro.</p>
<p><b>Cuando el dato no es nuestro para decidirlo.</b> Si usted es trabajador de una empresa que usa HoraPro, el responsable de esos datos es su empleador y no nosotros, como se explica en el punto 2. No nos corresponde decidir si se borran y no lo hacemos por cuenta propia. Lo que sí hacemos es trasladarle su solicitud a la empresa responsable dentro de los dos días hábiles siguientes y avisarle a usted que lo hicimos. Cómo escribirnos está en el punto 12.</p>
<p><b>Qué pasa después de borrar.</b> Cuando el dato sí se borra, sale del sistema. Lo que puede quedar en la copia de seguridad, y por cuánto tiempo, está en el punto 7.</p>
<p><b>Negarnos no lo deja sin salida.</b> Si no podemos atender su solicitud, se lo decimos con el motivo. Si no está de acuerdo, puede acudir a la Superintendencia de Industria y Comercio, en las condiciones que explica el punto 12.</p>`,
    },
    {
      id: 'ejercer',
      titulo: '12. Cómo ejercer sus derechos y en cuánto le respondemos',
      html: `<p><b>Si usted es trabajador de una empresa que usa HoraPro:</b> diríjase primero a su empleador, que es el responsable de esos datos y el único que puede decidir qué se corrige, qué se agrega y qué se elimina.</p>
<p>Si prefiere escribirnos a nosotros, también puede. Como no somos los competentes para resolverlo, esto es lo que hacemos, y tiene plazo:</p>
<ul>
  <li>Trasladamos su solicitud a la empresa responsable dentro de los <b>2 días hábiles</b> siguientes a la llegada de su mensaje.</li>
  <li>Le informamos a usted que la trasladamos y a quién.</li>
</ul>
<p>Díganos en qué empresa trabaja. Nuestro panel no muestra los datos de los trabajadores de nuestros clientes, como se explica en el punto 4, así que ese dato es lo que nos permite trasladar su solicitud dentro del plazo. La misma regla vale para cualquier otra solicitud que nos llegue sobre datos de los que no somos responsables.</p>
<p><b>Si usted es cliente, afiliado o visitante:</b> escriba a <a href="mailto:privacidad@horapro.co">privacidad@horapro.co</a>. De esos datos el responsable somos nosotros, así que le respondemos directamente.</p>
<p>También puede escribirnos por <a href="https://wa.me/573166435723?text=Hola%2C%20necesito%20ayuda%20con%20el%20manejo%20de%20mis%20datos%20personales%20en%20HoraPro.">WhatsApp al +57 316 643 5723</a>. Le pedimos usar el correo para las solicitudes formales, porque de esa forma queda constancia de la fecha en que llegó su petición y de la respuesta, que es lo que fija los plazos de abajo.</p>
<p>Atiende las peticiones, consultas y reclamos el área de atención al cliente de HoraPro.</p>

<h3>12.1 Qué debe contener su solicitud</h3>
<p>Si solo quiere consultar sus datos, basta con que nos diga quién es y qué quiere saber: para una consulta la ley no exige nada más. Si lo que presenta es un reclamo, es decir si pide corregir, actualizar o eliminar algo, o si considera que incumplimos alguno de nuestros deberes, entonces sí hay un contenido mínimo. Si falta algo se lo pediremos, en los plazos de abajo, y eso alarga el trámite.</p>
<ul>
  <li><b>Quién es usted.</b> Su nombre completo y el correo con el que figura registrado, que es el dato con el que podemos comprobar que la cuenta es suya. Si escribe desde otro correo, o si todavía no tiene cuenta con nosotros, díganos con qué dato podemos ubicarlo y le indicamos qué más necesitamos.</li>
  <li><b>Qué pasó.</b> Los hechos que dan lugar a su reclamo, con fechas si las tiene.</li>
  <li><b>Una dirección de notificación</b>, física o electrónica, a la que podamos responderle. Si nos deja un correo, la respuesta le llega antes.</li>
  <li><b>Los documentos que quiera aportar</b>, si tiene alguno que respalde lo que pide.</li>
  <li><b>Qué quiere que hagamos.</b> Esto no lo exige la ley, se lo pedimos nosotros: sin eso no sabemos qué le estamos respondiendo.</li>
</ul>

<h3>12.2 Quién puede presentar la solicitud</h3>
<p>Lo corriente es que escriba el propio titular de los datos. No es la única forma. También pueden hacerlo:</p>
<ul>
  <li><b>Sus causahabientes</b>, normalmente sus herederos, cuando el titular ha fallecido. Ante nosotros el caso típico es el de los herederos de un afiliado que murió y necesitan sus datos o las comisiones que le quedaron causadas. Si el titular era un trabajador, la solicitud se dirige a la empresa empleadora, por lo que le explicamos arriba.</li>
  <li><b>Quien lo represente legalmente.</b> Los derechos de los niños, niñas y adolescentes los ejercen quienes estén facultados para representarlos, y la opinión del menor se tiene en cuenta según su edad y su madurez. Tener una discapacidad no le quita a nadie la capacidad de presentar su propia solicitud: si usted decide con apoyos, puede escribirnos usted mismo.</li>
  <li><b>Su apoderado</b>, cuando el titular le dio poder para el asunto.</li>
  <li><b>Alguien a favor de quien el titular haya estipulado</b> que pueda ejercer estos derechos, cuando así conste.</li>
</ul>
<p>En esos casos le vamos a pedir el documento que acredite esa calidad: el registro civil de defunción y la prueba del parentesco, la prueba de la representación o el poder, según corresponda. No es para ponerle trabas. Entregarle los datos personales de una persona a alguien que dice ser su familiar, sin comprobar nada, sería justo lo que esta política existe para evitar.</p>

<h3>12.3 En cuánto le respondemos</h3>
<p><b>Consultas:</b> máximo 10 días hábiles. Si no alcanzamos, se lo informamos con los motivos y la nueva fecha, que no superará los 5 días hábiles siguientes al vencimiento del primer plazo.</p>
<p><b>Reclamos:</b> máximo 15 días hábiles contados desde el día siguiente a su recepción. Si no alcanzamos, se lo informamos con los motivos y la nueva fecha, que no superará los 8 días hábiles siguientes. Si el reclamo llega incompleto, se lo pediremos completar dentro de los 5 días siguientes; si pasan dos meses desde esa petición sin que lo complete, se entenderá desistido.</p>
<p>Mientras el reclamo está en trámite dejamos constancia de esa situación, con su motivo, en el registro interno de su solicitud, y la mantenemos hasta que el reclamo quede decidido.</p>

<h3>12.4 La queja ante la Superintendencia va después, no antes</h3>
<p>Para quejarse ante la Superintendencia de Industria y Comercio primero tiene que haber agotado la consulta o el reclamo ante quien trata sus datos. La ley admite las dos puertas, la del responsable y la del encargado. Si usted es trabajador puede agotarlo ante su empresa empleadora, que es la responsable, o ante nosotros, que somos el encargado; le recomendamos empezar por la empresa, porque es la que puede corregir el dato. Si es cliente, afiliado o visitante, ante nosotros. Lo mismo vale para sus causahabientes.</p>
<p>La razón de esa regla es que quien tiene los datos debe tener la oportunidad de arreglar el error antes de que intervenga la autoridad. Si ya escribió y no le respondimos dentro de los plazos de arriba, o la respuesta no resolvió lo que pedía, la queja queda abierta. Y este requisito es solo para esa queja: no le impide acudir a un juez por vía de tutela si considera que le están vulnerando un derecho fundamental.</p>`,
    },
    {
      id: 'cambios',
      titulo: '13. Cambios y vigencia',
      html: doc => `<p><b>Cuándo le avisamos con anticipación.</b> Un cambio de esta política es sustancial cuando toca quién responde por sus datos o para qué los usamos, de un modo que pueda afectar la autorización que usted dio. Cuando hagamos uno de esos, se lo avisaremos <b>con al menos 15 días calendario de antelación</b>, por correo o dentro del producto, a quienes tienen una cuenta de acceso: los administradores y supervisores de las empresas clientes, y los afiliados.</p>
<p><b>Esos 15 días son un compromiso nuestro, no una exigencia de la ley.</b> La norma no fija ningún plazo: pide comunicar el cambio de forma oportuna y eficiente, antes de aplicar la política nueva, sin decir cuántos días antes. Un aviso de un solo día también sería un aviso previo, y no le serviría de nada a quien quiera decidir antes de que el cambio lo alcance. Por eso lo fijamos aquí, que es donde queda exigible frente a nosotros.</p>
<p><b>Si lo que cambia es la finalidad, avisar no basta.</b> Para los datos de los que somos responsables, le pediremos una autorización nueva y no los usaremos para esa finalidad mientras no la tengamos. Si usted es trabajador de una empresa cliente, esa autorización se la pide su empleador, que es el responsable de sus datos.</p>
<p><b>Toda versión nueva se publica en esta misma dirección</b>, con su número y su fecha de vigencia, el día en que empieza a regir. Esa publicación es para todo el mundo, incluidos los visitantes del sitio, con quienes no tenemos ningún canal para escribirles.</p>
<p><b>Si usted es trabajador de una empresa cliente y no tiene cuenta de acceso</b>, no tenemos con usted un canal de aviso: HoraPro nunca le escribe, ni siquiera al correo que su empresa haya cargado en su ficha. No le vamos a prometer un aviso que no podemos entregarle. El cambio queda publicado aquí desde el día en que empieza a regir, y quien decide sobre sus datos sigue siendo su empleador, como se explica en el punto 2.</p>
<p><b>El número de versión.</b> Cada versión que publiquemos de este documento, sustancial o no el cambio, sube el número que aparece al comienzo de la página, debajo del título. Corregir una redacción, reordenar el texto o cambiar un canal de atención no son cambios sustanciales: suben la versión y se publican aquí, pero no llevan aviso previo. Cambiar quién es el responsable, o los datos con los que se le identifica en el punto 14, sí lo es, y lleva el aviso de los 15 días.</p>
<p>Esta política rige desde el ${doc.fechaVigencia}. Las bases de datos se conservarán mientras HoraPro preste el servicio y mientras sea necesario atender las obligaciones legales, contables y contractuales derivadas de él.</p>
<p><b>Registro Nacional de Bases de Datos.</b> La obligación de inscribir las bases de datos ante la Superintendencia de Industria y Comercio recae sobre sociedades y entidades sin ánimo de lucro que superan el umbral de activos fijado por la norma, y sobre entidades públicas. Las personas naturales están exceptuadas, y por eso HoraPro no está inscrito en ese registro. Esto no lo exime de ninguna de las demás obligaciones de la Ley 1581, que se cumplen en los términos de esta política.</p>`,
    },
    {
      id: 'identificacion',
      titulo: '14. Identificación del responsable',
      html: `<p>La ley exige que esta política identifique a quien responde por el tratamiento de sus datos. Esa información está aquí y puede consultarla cuando quiera.</p>
<details class="ficha-responsable">
  <summary>Ver los datos del responsable del tratamiento</summary>
  <ul>
    <li><b>Responsable:</b> Samir Orozco, persona natural.</li>
    <li><b>Dirección:</b> Cra 1 # 9 - 10, La Unión, Antioquia, Colombia.</li>
    <li><b>Correo:</b> <a href="mailto:privacidad@horapro.co">privacidad@horapro.co</a></li>
    <li><b>WhatsApp:</b> <a href="https://wa.me/573166435723">+57 316 643 5723</a></li>
    <li><b>Sitio web:</b> <a href="https://horapro.co">https://horapro.co</a></li>
  </ul>
  <p>El crédito "Desarrollado por Krumlab" que aparece en el sitio es una atribución de autoría, no la identificación del responsable del tratamiento.</p>
</details>
<p>Para ejercer sus derechos no necesita estos datos: basta con escribir a <a href="mailto:privacidad@horapro.co">privacidad@horapro.co</a>, como se explica en el punto 12.</p>`,
    },
    {
      id: 'anexo',
      titulo: '15. Anexo: definiciones, principios y deberes legales',
      html: `<p>Hasta aquí este documento dijo, en lenguaje llano, qué datos tratamos, para qué, con quién los compartimos y cómo ejercer sus derechos. Lo que sigue es la parte formal: las definiciones de la ley, los principios que rigen cualquier tratamiento de datos y la lista de deberes de quien los trata. Va al final a propósito. A quien solo quiere saber qué hacemos con su información no le hace falta; a un abogado, a un auditor o a la Superintendencia de Industria y Comercio sí.</p>
<p>Está escrito con nuestras palabras, más cortas que las de la ley. Donde la palabra exacta importe, mandan la Ley 1581 de 2012 (artículos 3, 4, 5, 17 y 18) y el Decreto 1377 de 2013 (artículo 3), hoy compilado en el Decreto 1074 de 2015.</p>
<details class="ficha-responsable">
  <summary>Ver las definiciones</summary>
  <ul>
    <li><b>Habeas data.</b> El derecho de toda persona a conocer, actualizar y rectificar la información que se haya recogido sobre ella en bases de datos y archivos. Está en el artículo 15 de la Constitución, y la Ley 1581 de 2012 es la que lo desarrolla.</li>
    <li><b>Dato personal.</b> Cualquier información vinculada o que pueda asociarse a una o varias personas naturales determinadas o determinables. Un nombre lo es. Una hora de entrada asociada a una cédula, también.</li>
    <li><b>Dato sensible.</b> El que afecta la intimidad del titular o cuyo uso indebido puede generar discriminación. La ley nombra, entre otros, el origen racial o étnico, la orientación política, las convicciones religiosas o filosóficas, la pertenencia a sindicatos o a organizaciones sociales o de derechos humanos, los datos de salud, los de la vida sexual y los biométricos. Los dos que trata HoraPro están en el punto 5.</li>
    <li><b>Base de datos.</b> Un conjunto organizado de datos personales sobre el que se hace tratamiento.</li>
    <li><b>Tratamiento.</b> Cualquier operación sobre datos personales: recogerlos, almacenarlos, usarlos, ponerlos a circular o suprimirlos.</li>
    <li><b>Autorización.</b> El consentimiento previo, expreso e informado del titular para que se traten sus datos. Previo, antes de tratarlos. Expreso, manifestado y no supuesto. Informado, sabiendo para qué.</li>
    <li><b>Aviso de privacidad.</b> La comunicación, verbal o escrita, con la que el responsable le informa al titular que existe una política de tratamiento, cómo consultarla y para qué va a usar sus datos. Es una pieza corta, distinta de la política completa, y remite a ella. La política completa de HoraPro es este documento.</li>
    <li><b>Titular.</b> La persona natural cuyos datos son objeto de tratamiento. Si sus datos están en HoraPro, usted.</li>
    <li><b>Causahabiente.</b> Quien sucede al titular en sus derechos, normalmente sus herederos. Puede ejercer los derechos del titular acreditando esa calidad.</li>
    <li><b>Responsable del tratamiento.</b> Quien decide sobre la base de datos y sobre el tratamiento: qué datos se recogen, para qué se usan y hasta cuándo se guardan. Puede ser una persona natural o jurídica, pública o privada, sola o en asocio con otras.</li>
    <li><b>Encargado del tratamiento.</b> Quien trata los datos por cuenta del responsable. No decide las finalidades: las ejecuta. Cuándo es HoraPro lo uno y cuándo lo otro está en el punto 2.</li>
    <li><b>Transferencia.</b> Ocurre cuando un responsable o un encargado ubicado en Colombia envía datos personales a un receptor que a su vez es responsable del tratamiento, esté dentro o fuera del país.</li>
    <li><b>Transmisión.</b> El tratamiento que implica comunicar datos personales, dentro o fuera de Colombia, para que un encargado los trate por cuenta del responsable.</li>
  </ul>
  <p>Las dos últimas se parecen y no son lo mismo. La diferencia está en quién recibe: en la transferencia, quien recibe decide sobre los datos; en la transmisión, los trata siguiendo instrucciones ajenas. Sus definiciones no están en la Ley 1581 sino en el Decreto 1377 de 2013. Adónde sale la información de HoraPro, y bajo cuál de las dos figuras, está en el punto 8.</p>
</details>
<details class="ficha-responsable">
  <summary>Ver los ocho principios que rigen el tratamiento</summary>
  <p>Son los del artículo 4 de la Ley 1581. Rigen todo tratamiento de datos personales en Colombia, el de HoraPro y el de cualquiera.</p>
  <ol>
    <li><b>Legalidad.</b> Tratar datos personales es una actividad reglada: solo puede hacerse como lo permiten la Ley 1581 y las normas que la desarrollan.</li>
    <li><b>Finalidad.</b> El tratamiento debe obedecer a una finalidad legítima conforme a la Constitución y a la ley, y esa finalidad hay que informársela al titular.</li>
    <li><b>Libertad.</b> Los datos solo pueden tratarse con el consentimiento previo, expreso e informado del titular. Sin autorización previa no se pueden obtener ni divulgar, salvo que una ley o una orden judicial releven ese consentimiento.</li>
    <li><b>Veracidad o calidad.</b> La información debe ser veraz, completa, exacta, actualizada, comprobable y comprensible. Está prohibido tratar datos parciales, incompletos, fraccionados o que induzcan a error.</li>
    <li><b>Transparencia.</b> El titular puede obtener del responsable o del encargado, en cualquier momento y sin restricciones, información sobre la existencia de datos que le conciernan.</li>
    <li><b>Acceso y circulación restringida.</b> Solo pueden tratar los datos las personas autorizadas por el titular o previstas en la ley. Y los datos personales, salvo los públicos, no pueden quedar disponibles en internet ni en otros medios de divulgación masiva, a menos que el acceso sea técnicamente controlable para que solo lleguen a los titulares o a terceros autorizados.</li>
    <li><b>Seguridad.</b> La información debe manejarse con las medidas técnicas, humanas y administrativas necesarias para evitar que se adultere, se pierda o se consulte, se use o se acceda sin autorización o de forma fraudulenta.</li>
    <li><b>Confidencialidad.</b> Toda persona que intervenga en el tratamiento de datos que no sean públicos está obligada a guardar reserva, incluso después de que termine su relación con esa labor. Solo puede suministrarlos o comunicarlos en los casos que la ley permite.</li>
  </ol>
  <p>A esos ocho se suma una regla del artículo 7 de la misma ley, que manda sobre todos ellos: en todo tratamiento hay que asegurar el respeto a los derechos prevalentes de los niños, niñas y adolescentes. Qué significa eso para HoraPro está en el punto 6.</p>
</details>
<details class="ficha-responsable">
  <summary>Ver los deberes del responsable y del encargado</summary>
  <p>La ley reparte los deberes según el papel, y por eso van las dos listas: HoraPro es responsable en unos casos y encargado en otros. Cuál de los dos es frente a sus datos depende de quién sea usted, y eso está en el punto 2. El parágrafo del artículo 18 lo dice expreso: cuando las dos calidades concurren en la misma persona, se le exigen los deberes de cada una.</p>
  <p>Esta es la lista de la ley, no un resumen de lo que hace el producto, y no todos estos deberes tienen reflejo en las secciones anteriores. Los deberes obligan por sí mismos, diga lo que diga este documento.</p>
  <h3>Deberes del responsable del tratamiento (artículo 17)</h3>
  <ul>
    <li>Garantizarle al titular, en todo momento, el ejercicio pleno y efectivo de su derecho de habeas data.</li>
    <li>Solicitar y conservar copia de la autorización que otorgó el titular.</li>
    <li>Informarle debidamente al titular para qué se recogen sus datos y qué derechos le asisten.</li>
    <li>Conservar la información en las condiciones de seguridad necesarias para impedir que se adultere, se pierda o se consulte, se use o se acceda sin autorización o de forma fraudulenta.</li>
    <li>Garantizar que la información que se le entregue al encargado sea veraz, completa, exacta, actualizada, comprobable y comprensible.</li>
    <li>Mantenerla actualizada, comunicándole al encargado, de forma oportuna, toda novedad sobre los datos que ya le había entregado.</li>
    <li>Rectificar la información cuando sea incorrecta y comunicárselo al encargado.</li>
    <li>Entregarle al encargado únicamente datos cuyo tratamiento esté previamente autorizado.</li>
    <li>Exigirle al encargado, en todo momento, que respete las condiciones de seguridad y privacidad de la información del titular.</li>
    <li>Tramitar las consultas y los reclamos en los términos que señala la ley.</li>
    <li>Adoptar un manual interno de políticas y procedimientos para cumplir la ley, en especial para atender consultas y reclamos.</li>
    <li>Informarle al encargado cuando determinada información esté en discusión, desde que el titular presenta el reclamo y hasta que termina el trámite.</li>
    <li>Informarle al titular, cuando lo solicite, qué uso se le ha dado a sus datos.</li>
    <li>Informarle a la autoridad de protección de datos cuando se presenten violaciones a los códigos de seguridad y existan riesgos en la administración de la información.</li>
    <li>Cumplir las instrucciones y los requerimientos que imparta la Superintendencia de Industria y Comercio.</li>
  </ul>
  <h3>Deberes del encargado del tratamiento (artículo 18)</h3>
  <ul>
    <li>Garantizarle al titular, en todo momento, el ejercicio pleno y efectivo de su derecho de habeas data.</li>
    <li>Conservar la información en las condiciones de seguridad necesarias para impedir que se adultere, se pierda o se consulte, se use o se acceda sin autorización o de forma fraudulenta.</li>
    <li>Actualizar, rectificar o suprimir los datos oportunamente, en los términos de la ley.</li>
    <li>Actualizar la información que reporte el responsable dentro de los cinco días hábiles contados desde que la recibe.</li>
    <li>Tramitar las consultas y los reclamos de los titulares en los términos que señala la ley.</li>
    <li>Adoptar un manual interno de políticas y procedimientos para cumplir la ley, en especial para atender consultas y reclamos.</li>
    <li>Registrar en la base de datos la leyenda "reclamo en trámite" en la forma en que la ley lo regula.</li>
    <li>Insertar en la base de datos la leyenda "información en discusión judicial" cuando la autoridad competente le notifique un proceso judicial relacionado con la calidad del dato personal.</li>
    <li>Abstenerse de poner a circular información que el titular esté controvirtiendo y cuyo bloqueo haya ordenado la Superintendencia de Industria y Comercio.</li>
    <li>Permitir el acceso a la información únicamente a quienes pueden tenerlo.</li>
    <li>Informarle a la Superintendencia de Industria y Comercio cuando se presenten violaciones a los códigos de seguridad y existan riesgos en la administración de la información.</li>
    <li>Cumplir las instrucciones y los requerimientos que imparta la Superintendencia de Industria y Comercio.</li>
  </ul>
</details>`,
    },
  ],
};

export default PRIVACIDAD;
