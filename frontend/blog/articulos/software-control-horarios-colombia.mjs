export default {
  slug: 'software-control-horarios-colombia',
  titulo: 'Cómo elegir un software de control de horarios para tu empresa en Colombia',
  tituloSeo: 'Software de control de horarios en Colombia: cómo elegir | HoraPro',
  descripcion:
    'Guía para dueños de negocio: qué mirar antes de contratar un software de control de horarios en Colombia, qué preguntar al proveedor y por qué marcar la entrada no es lo mismo que liquidar la nómina.',
  categoria: 'Guías',
  fecha: '2026-08-19',
  actualizado: '2026-08-19',
  lectura: 9,
  destacado: true,
  imagen: null,
  imagenAlt: 'Administradora revisando el control de horarios de su equipo en una tablet',
  secciones: [
    { id: 'marcar-no-es-liquidar', titulo: 'Marcar no es liquidar' },
    { id: 'formas-de-marcar', titulo: 'Las cuatro formas de marcar' },
    { id: 'recargos', titulo: 'La pregunta que casi nadie hace' },
    { id: 'preguntas', titulo: 'Ocho preguntas antes de firmar' },
    { id: 'cuanto-cuesta', titulo: 'Cuánto cuesta en Colombia' },
    { id: 'alarmas', titulo: 'Señales de alarma' },
    { id: 'horapro', titulo: 'Dónde encaja HoraPro' },
  ],
  cuerpo: `
<p class="entradilla">La mayoría de las empresas que conozco llegaron al control de horarios por el mismo camino: alguien reclamó unas horas extra que no le pagaron, sacaron la cuenta a mano, y no cuadró. A partir de ahí empieza la búsqueda. Y ahí es donde se compra mal, porque casi todo el mercado te vende la parte fácil del problema.</p>

<h2 id="marcar-no-es-liquidar">Marcar no es liquidar</h2>

<p>Registrar a qué hora entró alguien es sencillo. Lo hace un reloj de huella de 300 mil pesos, lo hace una planilla en Excel y lo hace el celular del supervisor por WhatsApp. Si eso fuera todo, no habría negocio.</p>

<p>Lo difícil viene después: convertir esas marcaciones en plata. Un turno de 6 de la tarde a 2 de la mañana un domingo no son ocho horas iguales. Son horas ordinarias, nocturnas, dominicales, y probablemente extras, cada una con su recargo. Multiplícalo por doce personas y por quince días, y el error deja de ser un detalle.</p>

<p>Cuando estés mirando opciones, separa mentalmente las dos cosas. Muchos sistemas hacen la primera de maravilla y la segunda te la devuelven como un archivo de Excel con la hora de entrada y la de salida, para que tú hagas el resto. Eso no es un software de nómina; es un reloj con exportación.</p>

<h2 id="formas-de-marcar">Las cuatro formas de marcar, y cuándo conviene cada una</h2>

<p>No hay una mejor en abstracto. Depende de dónde trabaja tu gente.</p>

<h3>Huella dactilar</h3>
<p>Es lo más común y lo más barato de instalar. Funciona bien en un punto fijo: una fábrica, una bodega, un local. Tiene dos problemas prácticos. El primero es físico: en oficios con las manos maltratadas —construcción, cocina, aseo— el lector falla seguido, y cada falla es una discusión. El segundo es jurídico: la huella es un dato biométrico y en Colombia eso es <strong>dato sensible</strong> bajo la Ley 1581 de 2012. Necesitas autorización previa y expresa del trabajador, y tienes que poder demostrarla. No es que esté prohibido; es que hay que hacerlo bien.</p>

<h3>Reconocimiento facial</h3>
<p>Resuelve el problema de las manos y el de que un compañero marque por otro. Funciona en cualquier tablet o celular con cámara, sin comprar equipo. Aplica exactamente la misma exigencia de autorización que la huella: el rostro también es dato biométrico.</p>

<h3>GPS o geocerca</h3>
<p>Es lo único que sirve cuando la gente no marca en un punto fijo: vigilancia, domicilios, obra, servicios técnicos. El sistema verifica que la marcación ocurra dentro de un radio del sitio de trabajo. Si tienes varias sedes, mira que permita configurar una geocerca por sede y no una sola para toda la empresa.</p>

<h3>Cédula o PIN</h3>
<p>La más barata y la menos confiable, porque cualquiera puede marcar por otro. Sirve como respaldo cuando la cámara falla o el equipo se queda sin internet, no como método principal. Si un proveedor te la ofrece como única opción, es que no quiso resolver el problema.</p>

<h2 id="recargos">La pregunta que casi nadie hace: ¿liquida recargos colombianos?</h2>

<p>Aquí es donde se separan los sistemas de verdad de los que solo cuentan horas. Y en 2026 la pregunta pesa más que nunca, porque en Colombia cambiaron las dos cosas al tiempo: la jornada y los recargos.</p>

<table>
  <thead><tr><th>Desde</th><th>Jornada máxima</th><th>La nocturna arranca</th><th>Dominical y festivo</th></tr></thead>
  <tbody>
    <tr><td>15 jul 2024</td><td>46 horas</td><td>9:00 p.m.</td><td>+80%</td></tr>
    <tr><td>15 jul 2025</td><td>44 horas</td><td>9:00 p.m.</td><td>+80%</td></tr>
    <tr><td>25 dic 2025</td><td>44 horas</td><td><strong>7:00 p.m.</strong></td><td>+80%</td></tr>
    <tr><td><strong>15 jul 2026</strong></td><td><strong>42 horas</strong></td><td>7:00 p.m.</td><td><strong>+90%</strong></td></tr>
    <tr><td>1 jul 2027</td><td>42 horas</td><td>7:00 p.m.</td><td>+100%</td></tr>
  </tbody>
</table>

<p>Tres fechas distintas en dos años. Un sistema que tenga los porcentajes escritos a mano en el código —y hay muchos— te liquidó mal en algún tramo de ese recorrido sin que nadie se diera cuenta.</p>

<p>La pregunta concreta para el proveedor es esta: <em>si yo consulto hoy un turno de marzo de 2025, ¿me lo liquida con las reglas de marzo de 2025 o con las de hoy?</em> La respuesta correcta es la primera. Si te lo recalcula con las reglas actuales, cada vez que cambie la ley se te mueve el histórico y pierdes la trazabilidad de lo que ya pagaste.</p>

<div class="nota">
  <p><strong>Un detalle que casi todos tienen mal:</strong> con la jornada de 42 horas, el divisor para sacar el valor de la hora es 210 al mes, no 240. Sobre un salario de $2.000.000, la hora ordinaria pasó de $8.333 a $9.524. Si tu sistema —o tu contador— sigue dividiendo entre 240, estás pagando cada hora extra $1.190 por debajo.</p>
</div>

<h2 id="preguntas">Ocho preguntas antes de firmar</h2>

<p>Llévalas a la demostración. Las respuestas ambiguas son respuestas.</p>

<ol>
  <li><strong>¿Liquida recargos con vigencias por fecha, o con porcentajes fijos?</strong> Pide ver un turno del año pasado.</li>
  <li><strong>¿Descuenta el almuerzo automáticamente, y cómo?</strong> Si lo descuenta siempre, le está quitando una hora a quien no la tomó.</li>
  <li><strong>¿Qué pasa si alguien olvida marcar la salida?</strong> Debería quedar señalado para revisión, no cerrarse solo y en silencio.</li>
  <li><strong>¿Puedo corregir una marcación, y queda registro de quién la corrigió?</strong> Sin auditoría, el registro no le sirve a nadie en un pleito.</li>
  <li><strong>¿Funciona si se cae el internet?</strong> Pregunta qué pasa con las marcaciones de esa hora.</li>
  <li><strong>¿Los datos dónde quedan y cómo los saco si me voy?</strong> Que te muestren la exportación completa, no un PDF.</li>
  <li><strong>¿Cuánto cuesta agregar una persona a mitad de mes?</strong> Y qué pasa cuando alguien se retira.</li>
  <li><strong>¿Qué pasa cuando cambie otra vez la ley?</strong> Si la respuesta es "sacamos una actualización", pregunta si tiene costo.</li>
</ol>

<h2 id="cuanto-cuesta">Cuánto cuesta esto en Colombia</h2>

<p>Hay dos modelos y conviene compararlos completos, no por la cuota.</p>

<p><strong>Equipo más licencia.</strong> Un reloj biométrico decente arranca sobre el millón de pesos, más instalación, más una licencia anual del software. Es una inversión de entrada alta que se amortiza si tienes un solo punto y mucha gente. El problema aparece cuando abres la segunda sede: necesitas otro equipo.</p>

<p><strong>Suscripción por empresa o por trabajador.</strong> Cuota mensual, sin equipo. Sale mejor con equipos pequeños o repartidos. Mira si el precio es por trabajador —que crece contigo, para bien y para mal— o por rangos.</p>

<p>Lo que casi nunca está en la cotización: la puesta en marcha, la capacitación, el soporte cuando algo falla un sábado y el costo de sacar tus datos si te quieres ir. Pregunta los cuatro.</p>

<h2 id="alarmas">Señales de alarma</h2>

<ul>
  <li><strong>Contratos a dos o tres años con permanencia mínima.</strong> Si el producto es bueno no necesita amarrarte.</li>
  <li><strong>Equipo "en comodato".</strong> Suena a regalo; es un préstamo que te obliga a quedarte y que te toca devolver.</li>
  <li><strong>"Nos adaptamos a cualquier normativa".</strong> Pídeles que te muestren en pantalla el recargo dominical del 90% y desde qué fecha lo aplican. Si no lo encuentran, no lo tienen.</li>
  <li><strong>Demostración con datos de ejemplo perfectos.</strong> Pide que carguen un turno nocturno que cruce la medianoche de un sábado a un domingo. Ahí se cae la mitad de los sistemas.</li>
  <li><strong>Software hecho para otro país.</strong> Si en la interfaz dice "fichar" en vez de "marcar", probablemente venga de España, y la ley que trae adentro no es la tuya.</li>
</ul>

<h2 id="horapro">Dónde encaja HoraPro, y dónde no</h2>

<p>Con las cartas sobre la mesa: HoraPro es nuestro. Lo hicimos en Colombia y para Colombia, con la escalera de la Ley 2101 y los recargos de la Ley 2466 metidos con vigencias por fecha, que es justo lo que recomiendo arriba que exijas. Marca con rostro o cédula desde cualquier tablet o celular, sin comprar equipo, y liquida recargos, extras, dominicales y festivos sin que nadie saque una cuenta a mano.</p>

<p>Dónde no encaja: si necesitas integración con tu software contable hoy mismo, todavía no la tenemos —la de Siigo está en camino—. Si tu operación exige control de acceso físico, con torniquetes y puertas, esto no es eso: HoraPro registra tiempo, no abre puertas. Y si ya tienes un reloj biométrico funcionando bien y tu única molestia es la liquidación, dínoslo antes de cambiar nada; puede que te salga más barato resolver solo esa parte.</p>

<p>La recomendación honesta es la misma para nosotros que para cualquiera: pide una prueba con <em>tus</em> turnos reales, no con los de la demostración. Un mes de datos propios te dice más que cualquier lista de funciones.</p>
`,
  faq: [
    {
      p: '¿Cuál es el mejor software de control de horarios en Colombia?',
      r: 'No hay uno mejor para todos. Depende de si tu gente marca en un punto fijo o en la calle, de cuántas sedes tienes y, sobre todo, de si necesitas que el sistema liquide recargos colombianos o solo cuente horas. El filtro más útil es pedir que te liquiden en pantalla un turno nocturno de sábado a domingo con las reglas vigentes: ahí se separan rápido las opciones.',
    },
    {
      p: '¿Sirve llevar el control de horarios en Excel?',
      r: 'Para tres o cuatro personas con horario fijo, sí. Deja de servir cuando aparecen turnos nocturnos, dominicales o extras, porque cada hora tiene un recargo distinto y la fórmula cambió tres veces entre 2024 y 2026. Además, un Excel que puede editar cualquiera no sirve como prueba si un trabajador reclama.',
    },
    {
      p: '¿Necesito comprar un reloj biométrico?',
      r: 'No necesariamente. Un reloj de huella tiene sentido en un punto fijo con mucha gente entrando a la misma hora. Si tu equipo está repartido o tienes varias sedes, sale más práctico marcar desde una tablet o un celular con reconocimiento facial y geocerca, sin equipo dedicado.',
    },
    {
      p: '¿Es obligatorio llevar un registro de la jornada en Colombia?',
      r: 'La Ley 2466 de 2025 eliminó el permiso previo del Ministerio del Trabajo para las horas extra, pero mantuvo la obligación del empleador de llevar un registro del trabajo suplementario con el nombre del trabajador, la actividad, el número de horas y si son diurnas o nocturnas. Sin ese registro, en un reclamo por horas extra la empresa queda sin con qué responder.',
    },
  ],
};
