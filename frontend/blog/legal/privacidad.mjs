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
//   2. La sección 12: la exención del RNBD deja de aplicar. Una sociedad se
//      inscribe si supera el umbral de activos, así que hay que volver a mirarlo.
//   3. Subir `version` y la fecha de vigencia, porque cambia el responsable y
//      eso es un cambio sustancial que hay que informar (sección 12).

export const PRIVACIDAD = {
  ruta: '/legal/privacidad/',
  titulo: 'Política de Tratamiento de Datos Personales | HoraPro',
  h1: 'Política de Tratamiento de Datos Personales',
  descripcion: 'Qué datos personales trata HoraPro, para qué, con quién los comparte, cuánto los conserva y cómo ejercer sus derechos. Ley 1581 de 2012.',
  version: '1.0',

  // Estas dos se cambian JUNTAS, el día que se publique. Separarlas es la forma
  // de que una se quede atrás: la fecha de vigencia solo es honesta si es el día
  // en que el documento de verdad quedó publicado.
  //
  // `borrador: true` mantiene la página con noindex, fuera del sitemap y sin
  // enlazar desde el pie.
  borrador: true,
  fechaVigencia: '7 de septiembre de 2026',

  // Lo que falta y quién lo tiene que aportar. Se pinta en la propia página
  // mientras `borrador` sea true, para que sea imposible publicarla a medias.
  pendientes: [
    'Crear de verdad la casilla privacidad@horapro.co y que alguien la lea: los plazos de 10 y 15 días hábiles corren desde que llega el mensaje.',
    'DEJAR CONFIGURADA DE VERDAD la copia semanal que sobreescribe la anterior, ANTES de publicar. Hoy la política ya lo afirma.',
    'Revisión de un abogado antes de publicar.',
  ],

  secciones: [
    {
      id: 'quienes',
      titulo: '1. Quiénes somos',
      html: `<p>HoraPro es un software de control de horas y liquidación de nómina para empresas colombianas, operado por:</p>
<ul>
  <li>Responsable del tratamiento: <b>Samir Orozco</b>, persona natural. El crédito "Desarrollado por Krumlab" que aparece en el sitio es una atribución de autoría, no la identificación del responsable.</li>
  <li>Dirección: Cra 1 # 9 - 10, La Unión, Antioquia, Colombia</li>
  <li>Correo para asuntos de datos personales: <a href="mailto:privacidad@horapro.co">privacidad@horapro.co</a></li>
  <li>WhatsApp: <a href="https://wa.me/573166435723">+57 316 643 5723</a></li>
  <li>Sitio web: <a href="https://horapro.co">https://horapro.co</a></li>
</ul>
<p>Este documento explica qué datos personales tratamos, para qué, con quién los compartimos, cuánto tiempo los guardamos y cómo puede usted ejercer sus derechos. Está escrito para que lo entienda cualquier persona.</p>`,
    },
    {
      id: 'dos-papeles',
      titulo: '2. Dos situaciones distintas, no las confunda',
      html: `<p>HoraPro trata datos personales en dos papeles diferentes, y sus derechos se ejercen ante personas distintas según el caso.</p>
<p><b>HoraPro como responsable.</b> De los datos de quien contrata el servicio, lo paga, participa en el programa de afiliados o visita nuestro sitio. Aquí decidimos nosotros qué se hace con la información, y usted ejerce sus derechos directamente ante HoraPro.</p>
<p><b>HoraPro como encargado.</b> De los datos de los trabajadores de las empresas que usan HoraPro. Ahí el responsable es la empresa empleadora: ella decide qué datos carga, para qué los usa, quién los ve dentro de su organización y cuánto tiempo los conserva. Nosotros solo prestamos la herramienta y guardamos la información por cuenta de ella.</p>
<p>Si usted es trabajador de una empresa que usa HoraPro, la primera puerta para pedir acceso, corrección o eliminación de sus datos es <b>su empleador</b>, no HoraPro. Aun así puede escribirnos y lo canalizamos con la empresa responsable.</p>`,
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
<p>No usamos herramientas de analítica, ni píxeles publicitarios, ni cookies propias de seguimiento. En el sitio no hay Google Analytics, Tag Manager, píxel de Meta, Hotjar ni Clarity. Lo que sí ocurre está en los puntos 7 y 8.</p>

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
<p><b>Quién ve estos datos.</b> Los usuarios de la propia empresa con rol de administrador o de supervisor. HoraPro, como proveedor, no dispone de ninguna pantalla ni función que le permita ver los nombres, las cédulas, los salarios, las fotos, los datos biométricos ni las novedades de los trabajadores de sus clientes: nuestro panel interno solo muestra conteos, facturación y comprobantes de pago. Lo que sí existe, y lo decimos porque es la verdad, es el acceso técnico de administración a la base de datos por parte del personal que opera la infraestructura.</p>`,
    },
    {
      id: 'sensibles',
      titulo: '5. Datos sensibles: rostro y salud',
      html: `<p>La ley colombiana considera sensibles, entre otros, los datos biométricos y los relativos a la salud. HoraPro trata dos de esa clase.</p>

<h3>5.1 Reconocimiento facial</h3>
<p>Cuando la empresa registra el rostro de un trabajador, el navegador calcula un descriptor matemático, una lista de 128 números por cada toma, y ese descriptor se guarda asociado a la persona. También se guarda la fecha del registro. La primera toma se conserva como foto de perfil solo si la ficha no tenía una.</p>
<p>El cálculo se hace en el propio navegador y con modelos servidos desde nuestro dominio. Ese dato no se envía a ningún proveedor externo de reconocimiento facial.</p>
<p>Cada vez que alguien marca entrada o salida en el kiosco se guarda además <b>una fotografía del rostro</b> como evidencia de la marcación.</p>
<p><b>Sobre la autorización.</b> Autorizar el tratamiento de un dato sensible es facultativo: ninguna persona está obligada a hacerlo, y ninguna actividad puede condicionarse a entregarlo. En HoraPro <b>la autorización del trabajador la debe obtener y conservar la empresa empleadora</b>, que es el responsable de ese dato. El panel muestra al administrador un texto de autorización antes del primer registro facial, pero <b>HoraPro no conserva hoy prueba de esa autorización</b>: la prueba la tiene que guardar la empresa.</p>
<p><b>Sobre la alternativa.</b> El kiosco permite marcar con cédula sin usar el rostro. La configuración le permite a la empresa desactivar esa opción y dejar el rostro como única vía. Recomendamos expresamente <b>no</b> hacerlo, porque condicionar la marcación de asistencia a entregar un dato biométrico es contrario a la ley.</p>
<p><b>Revocación.</b> La empresa puede eliminar en cualquier momento el registro facial de una persona desde su ficha. Al hacerlo se borra el descriptor y la fecha de registro. La foto de perfil se elimina por separado.</p>

<h3>5.2 Datos de salud</h3>
<p>Cuando un trabajador reporta una incapacidad o una cita médica, HoraPro almacena el tipo de novedad, su descripción y el documento que se adjunte, que en la práctica suele ser una incapacidad médica. Es un dato de salud y por lo tanto sensible.</p>
<p>Ese soporte lo pueden ver los usuarios de la empresa con rol de administrador o de supervisor. HoraPro no lo envía por correo, ni por mensajería, ni a ningún tercero.</p>
<p>Adjuntar el soporte es facultativo, y esa autorización, igual que la del rostro, la debe obtener la empresa empleadora.</p>`,
    },
    {
      id: 'conservacion',
      titulo: '6. Cuánto tiempo conservamos la información',
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
      titulo: '7. Con quién compartimos información',
      html: `<p>No vendemos ni alquilamos datos personales. Compartimos únicamente lo indispensable, y solo en estos casos.</p>
<p><b>Wompi, pasarela de pagos.</b> El pago de la suscripción se hace en el sitio de Wompi. HoraPro <b>no recibe, no ve y no almacena datos de tarjetas</b>. Al abrir el pago solo se le envían la llave pública, la moneda, el monto, una referencia interna y una firma de seguridad. No se envía nombre, correo ni NIT del pagador. De vuelta guardamos el identificador y el estado de la transacción.</p>
<p><b>Servidor de correo.</b> Enviamos correos transaccionales, como el código de verificación, el restablecimiento de contraseña y la invitación a afiliados, a través del servidor de correo de nuestro proveedor de hosting. Nunca enviamos por correo datos de trabajadores, ni novedades, ni soportes médicos.</p>
<p><b>Telegram, opcional y desactivado por defecto.</b> Si la empresa lo configura, HoraPro envía a un chat o grupo de Telegram un aviso de llegada tarde que contiene <b>el nombre y apellido del trabajador, la hora de llegada y los minutos de retraso</b>. Esa información sale de nuestros servidores hacia Telegram, que la conserva bajo sus propias condiciones y fuera de nuestro control. Si la empresa configura un grupo, todos sus miembros ven el aviso. Activarlo es decisión de la empresa empleadora, y es ella quien debe contar con la autorización de sus trabajadores.</p>
<p><b>YouTube.</b> El video de presentación de nuestra página de inicio se reproduce desde YouTube. Su navegador se conecta a servidores de Google, que reciben su dirección IP y los datos de su navegador y pueden instalar cookies propias.</p>
<p><b>Proveedor de infraestructura, con transferencia internacional.</b> Toda la información se almacena en los servidores de <b>Banahosting</b>, cuya infraestructura está ubicada en <b>Estados Unidos</b>. Eso significa que sus datos personales salen de Colombia.</p>
<p>Esa transferencia está permitida: mediante la Circular Externa 5 del 10 de agosto de 2017, la Superintendencia de Industria y Comercio declaró a Estados Unidos como país con un nivel adecuado de protección de datos personales, de modo que la transferencia no requiere autorización especial. Aun así se lo informamos, porque usted tiene derecho a saber dónde están sus datos.</p>`,
    },
    {
      id: 'cookies',
      titulo: '8. Cookies y almacenamiento en el navegador',
      html: `<p>HoraPro no instala cookies propias. Para funcionar guarda en su navegador, en almacenamiento local y no en cookies:</p>
<ul>
  <li>El token de su sesión, que dura 7 días y se borra al cerrar sesión.</li>
  <li>Preferencias de interfaz, como si ya vio la guía de bienvenida o los avisos de novedades.</li>
  <li>En la tablet del kiosco, un identificador del dispositivo autorizado. La sesión del trabajador no se guarda: vive solo mientras la pantalla está abierta.</li>
  <li>Si usted llegó desde el enlace de un afiliado, el código de ese afiliado, <b>sin fecha de vencimiento</b>, para atribuirle el registro si algún día crea una cuenta. Se borra al completar el registro, y usted puede eliminarlo borrando los datos del sitio en su navegador.</li>
</ul>
<p>Como se explica en el punto 7, el reproductor de YouTube sí puede instalar cookies de Google en su navegador.</p>`,
    },
    {
      id: 'seguridad',
      titulo: '9. Seguridad',
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
      titulo: '10. Sus derechos',
      html: `<p>Como titular de datos personales usted puede:</p>
<ol>
  <li>Conocer, actualizar y rectificar sus datos.</li>
  <li>Solicitar prueba de la autorización que otorgó, salvo cuando la ley no la exija.</li>
  <li>Ser informado sobre el uso que se le ha dado a sus datos.</li>
  <li>Presentar quejas ante la Superintendencia de Industria y Comercio por incumplimientos, después de agotar el trámite ante nosotros.</li>
  <li>Revocar la autorización y solicitar la supresión del dato cuando proceda. La revocación y la supresión no aplican cuando existe un deber legal o contractual de conservar la información, como ocurre con los soportes de la jornada laboral.</li>
  <li>Acceder de forma gratuita a sus datos.</li>
</ol>`,
    },
    {
      id: 'ejercer',
      titulo: '11. Cómo ejercer sus derechos y en cuánto le respondemos',
      html: `<p><b>Si usted es trabajador de una empresa que usa HoraPro:</b> diríjase primero a su empleador, que es el responsable de esos datos. Si no obtiene respuesta, escríbanos y lo canalizamos.</p>
<p><b>Si usted es cliente, afiliado o visitante:</b> escriba a <a href="mailto:privacidad@horapro.co">privacidad@horapro.co</a> con su nombre, un dato de contacto, la descripción de lo que solicita y los documentos que quiera aportar.</p>
<p>También puede escribirnos por <a href="https://wa.me/573166435723?text=Hola%2C%20necesito%20ayuda%20con%20el%20manejo%20de%20mis%20datos%20personales%20en%20HoraPro.">WhatsApp al +57 316 643 5723</a>. Le pedimos usar el correo para las solicitudes formales, porque de esa forma queda constancia de la fecha en que llegó su petición y de la respuesta, que es lo que fija los plazos de abajo.</p>
<p>Atiende las peticiones, consultas y reclamos el propio responsable, Samir Orozco.</p>
<p><b>Consultas:</b> máximo 10 días hábiles. Si no alcanzamos, se lo informamos con los motivos y la nueva fecha, que no superará los 5 días hábiles siguientes al vencimiento del primer plazo.</p>
<p><b>Reclamos:</b> máximo 15 días hábiles contados desde el día siguiente a su recepción. Si no alcanzamos, se lo informamos con los motivos y la nueva fecha, que no superará los 8 días hábiles siguientes. Si el reclamo llega incompleto, se lo pediremos completar dentro de los 5 días siguientes; si pasan dos meses sin que lo complete, se entenderá desistido. Mientras el reclamo está en trámite, la base de datos lleva esa anotación.</p>`,
    },
    {
      id: 'cambios',
      titulo: '12. Cambios y vigencia',
      html: doc => `<p>Si cambiamos algo sustancial, en especial las finalidades del tratamiento, se lo informaremos antes de aplicarlo, por correo o dentro del producto, y publicaremos la nueva versión con su fecha en esta misma dirección.</p>
<p>Esta política rige desde el ${doc.fechaVigencia}. Las bases de datos se conservarán mientras HoraPro preste el servicio y mientras sea necesario atender las obligaciones legales, contables y contractuales derivadas de él.</p>
<p><b>Registro Nacional de Bases de Datos.</b> La obligación de inscribir las bases de datos ante la Superintendencia de Industria y Comercio recae sobre sociedades y entidades sin ánimo de lucro que superan el umbral de activos fijado por la norma, y sobre entidades públicas. Las personas naturales están exceptuadas, y por eso HoraPro no está inscrito en ese registro. Esto no lo exime de ninguna de las demás obligaciones de la Ley 1581, que se cumplen en los términos de esta política.</p>`,
    },
  ],
};

export default PRIVACIDAD;
