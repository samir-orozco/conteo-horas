export default {
  slug: 'calcular-horas-extra-recargos-colombia',
  titulo: 'Cómo calcular las horas extra y los recargos en Colombia',
  tituloSeo: 'Cómo calcular horas extra y recargos en Colombia 2026 | HoraPro',
  descripcion:
    'La cuenta paso a paso con los porcentajes vigentes en 2026: valor de la hora con la jornada de 42 horas, diferencia entre recargo y hora extra, tabla completa y tres casos resueltos en pesos.',
  categoria: 'Normativa',
  fecha: '2026-08-20',
  actualizado: '2026-08-20',
  lectura: 10,
  imagen: '/blog/img/calcular-horas-extra-recargos-colombia.jpg',
  imagenAlt: 'Hombre con la mano en la frente frente a un computador portátil, haciendo cuentas',
  secciones: [
    { id: 'valor-hora', titulo: 'Cuánto vale una hora' },
    { id: 'recargo-vs-extra', titulo: 'Recargo y extra no son lo mismo' },
    { id: 'tabla', titulo: 'La tabla completa' },
    { id: 'casos', titulo: 'Tres casos resueltos' },
    { id: 'limites', titulo: 'Cuántas extras se permiten' },
    { id: 'errores', titulo: 'Dónde se equivoca la gente' },
  ],
  cuerpo: `
<p class="entradilla">Buena parte de lo que hay publicado sobre este tema quedó viejo en 2026. Siguen dividiendo el salario entre 240, siguen pagando el domingo al 80% y siguen empezando la nocturna a las nueve. Las tres cosas cambiaron. Esta es la cuenta con los números que están vigentes hoy.</p>

<p class="atajo"><strong>¿Solo quieres el resultado?</strong> Usa la <a href="/calculadoras/horas-extra-recargos/">calculadora de horas extra y recargos</a>: pones el salario y las horas, y te da el total con los factores vigentes. Si quieres entender de dónde sale cada número, sigue leyendo.</p>

<h2 id="valor-hora">Cuánto vale una hora</h2>

<p>Todo sale de aquí, y aquí es donde más gente arranca torcido.</p>

<p>El valor de la hora ordinaria es el salario mensual dividido entre las horas del mes. Y las horas del mes son la jornada semanal multiplicada por cinco. Con la <a href="/blog/jornada-laboral-colombia-2026/">jornada de 42 horas</a> que rige desde el 15 de julio de 2026, el divisor es <strong>210</strong>.</p>

<p>Durante años ese número fue 240, cuando la jornada era de 48 horas. Mucha nómina sigue con el 240 metido en la fórmula.</p>

<table>
  <thead><tr><th>Salario mensual</th><th>Divisor viejo (240)</th><th>Divisor correcto (210)</th></tr></thead>
  <tbody>
    <tr><td>$2.000.000</td><td>$8.333</td><td><strong>$9.524</strong></td></tr>
  </tbody>
</table>

<p>Son $1.190 de diferencia en cada hora, y esa diferencia se multiplica en cada recargo. Con diez horas extra diurnas al mes, quien todavía divide entre 240 le está pagando a esa persona <strong>$14.881 de menos</strong>. Por una sola persona, y por un mes.</p>

<p>El resto de este artículo usa un salario de $2.000.000 y esa hora de $9.524, para que las cuentas se puedan seguir.</p>

<h2 id="recargo-vs-extra">Recargo y hora extra no son lo mismo</h2>

<p>Esta confusión es la que más discusiones genera con los trabajadores, y vale la pena tenerla clara antes de tocar la calculadora.</p>

<p><strong>El recargo</strong> se paga por trabajar en un momento incómodo, dentro de la jornada normal. Alguien que entra a la una de la tarde y sale a las nueve de la noche no está haciendo horas extra: está cumpliendo sus ocho horas. Pero las dos últimas caen después de las 7 p.m., y esas llevan recargo nocturno.</p>

<p><strong>La hora extra</strong> se paga por trabajar <em>de más</em>, por encima de la jornada. Es tiempo adicional, no tiempo incómodo.</p>

<p>Se pueden juntar, y ahí es donde salen los porcentajes altos: una hora trabajada de más, de noche y en domingo, acumula las tres cosas.</p>

<h2 id="tabla">La tabla completa</h2>

<p>Estos son los factores vigentes en agosto de 2026. La jornada nocturna va de las <strong>7:00 p.m. a las 6:00 a.m.</strong> desde el 25 de diciembre de 2025, y el recargo dominical está en <strong>90%</strong> desde el 1 de julio de 2026.</p>

<table>
  <thead><tr><th>Tipo de hora</th><th>Se multiplica por</th><th>Con hora de $9.524</th></tr></thead>
  <tbody>
    <tr><td>Ordinaria diurna (6:00 a.m. a 7:00 p.m.)</td><td>1,00</td><td>$9.524</td></tr>
    <tr><td>Ordinaria nocturna (7:00 p.m. a 6:00 a.m.)</td><td>1,35</td><td>$12.857</td></tr>
    <tr><td>Extra diurna</td><td>1,25</td><td>$11.905</td></tr>
    <tr><td>Extra nocturna</td><td>1,75</td><td>$16.667</td></tr>
    <tr><td>Dominical o festivo, diurna</td><td>1,90</td><td>$18.095</td></tr>
    <tr><td>Dominical o festivo, nocturna</td><td>2,25</td><td>$21.429</td></tr>
    <tr><td>Extra diurna en dominical o festivo</td><td>2,15</td><td>$20.476</td></tr>
    <tr><td>Extra nocturna en dominical o festivo</td><td>2,65</td><td>$25.238</td></tr>
  </tbody>
</table>

<div class="nota">
  <p>Ojo con cómo se lee esta tabla: el factor <strong>ya incluye la hora</strong>. Multiplicar por 1,25 es pagar la hora completa más el 25% de recargo, no pagar solo el 25%. Es un error común y deja la liquidación en una cuarta parte de lo que debía ser.</p>
</div>

<h2 id="casos">Tres casos resueltos</h2>

<h3>Caso 1: dos horas de más en un turno normal</h3>
<p>Alguien entra a las 8:00 a.m. y sale a las 6:00 p.m. Descontando una hora de almuerzo, trabajó nueve horas. Si su jornada diaria pactada era de siete, hizo dos horas extra diurnas.</p>
<p>2 × $11.905 = <strong>$23.810</strong> por ese día, además del salario ordinario.</p>

<h3>Caso 2: el turno de comercio que termina a las nueve</h3>
<p>Este es el que más plata mueve y el que más se pasa por alto. Alguien entra a la 1:00 p.m. y sale a las 9:00 p.m. Son ocho horas, sin una sola hora extra. Pero las dos últimas, de 7 a 9, ya son nocturnas.</p>
<table>
  <tbody>
    <tr><td>6 horas diurnas</td><td>$57.143</td></tr>
    <tr><td>2 horas nocturnas (con 35%)</td><td>$25.714</td></tr>
    <tr><td><strong>Total del día</strong></td><td><strong>$82.857</strong></td></tr>
  </tbody>
</table>
<p>Si se pagaran las ocho como diurnas, serían $76.190. La diferencia es de <strong>$6.667 por día y por persona</strong>. En un mes de veinticuatro días, unos $160.000. Con diez personas en ese horario, cerca de $19 millones al año.</p>

<h3>Caso 3: un domingo completo</h3>
<p>Ocho horas diurnas un domingo: 8 × $18.095 = <strong>$144.762</strong>.</p>
<p>Con el 80% que estuvo vigente hasta junio de 2026 habrían sido $137.143. Y desde el 1 de julio de 2027, cuando el recargo llegue al 100%, ese mismo domingo costará $152.381.</p>

<h2 id="limites">Cuántas horas extra se permiten</h2>

<p>No es ilimitado, aunque la persona quiera. El trabajo suplementario tiene un tope de <strong>dos horas diarias y doce a la semana</strong>.</p>

<p>Lo que sí cambió con la Ley 2466 de 2025 es el trámite: su artículo 12 eliminó la autorización previa del Ministerio del Trabajo que antes había que pedir. A cambio dejó firme la obligación de <strong>llevar un registro del trabajo suplementario</strong> de cada persona, con nombre, actividad, número de horas y si fueron diurnas o nocturnas.</p>

<p>Eso no es papeleo: si alguien reclama horas extra mal pagadas, es la empresa la que tiene que demostrar con soportes qué se trabajó y qué se pagó. Sin registro de entradas y salidas, el trabajador declara el horario que dice haber cumplido y no hay con qué contradecirlo.</p>

<h2 id="errores">Dónde se equivoca la gente</h2>

<ul>
  <li><strong>Dividir entre 240.</strong> El divisor es 210 desde julio de 2026. Es el error que más plata deja por debajo.</li>
  <li><strong>Pagar el domingo al 80%.</strong> Subió al 90% el 1 de julio de 2026.</li>
  <li><strong>Empezar la nocturna a las 9:00 p.m.</strong> Empieza a las 7:00 p.m. desde diciembre de 2025.</li>
  <li><strong>Pagar solo el porcentaje.</strong> El factor incluye la hora: 1,25 es hora completa más 25%.</li>
  <li><strong>Contar las extras por día.</strong> La jornada se mide por semana. Nueve horas un martes no generan extra por sí solas si la semana cierra en 42.</li>
  <li><strong>Redondear las marcaciones "para simplificar".</strong> Doce minutos diarios recortados a cuarenta personas son ocho horas de trabajo al día que nadie pagó.</li>
</ul>

<hr />

<p class="cierre">Este artículo es informativo y no reemplaza la asesoría de tu contador o tu abogado laboral, en especial si tienes turnos rotativos, jornadas especiales o convención colectiva. Los porcentajes citados corresponden al Código Sustantivo del Trabajo con las modificaciones de la Ley 2466 de 2025, y la jornada a la Ley 2101 de 2021. Vigentes al 20 de agosto de 2026.</p>
`,
  faq: [
    {
      p: '¿Cómo se calcula el valor de una hora de trabajo en Colombia?',
      r: 'Se divide el salario mensual entre las horas del mes, que son la jornada semanal por cinco. Con la jornada de 42 horas vigente desde el 15 de julio de 2026, el divisor es 210. Un salario de $2.000.000 da una hora ordinaria de $9.524. El divisor de 240 corresponde a la jornada de 48 horas y ya no aplica.',
    },
    {
      p: '¿Cuánto se paga la hora extra diurna en Colombia?',
      r: 'La hora extra diurna se paga con un recargo del 25%, es decir, la hora ordinaria multiplicada por 1,25. Sobre una hora de $9.524, la extra diurna vale $11.905. Ese factor ya incluye el valor de la hora: no se paga solo el 25%.',
    },
    {
      p: '¿Cuál es la diferencia entre recargo nocturno y hora extra?',
      r: 'El recargo nocturno se paga por trabajar entre las 7:00 p.m. y las 6:00 a.m. dentro de la jornada normal, y es del 35%. La hora extra se paga por trabajar por encima de la jornada. Quien entra a la 1:00 p.m. y sale a las 9:00 p.m. no hace horas extra, pero sus dos últimas horas sí llevan recargo nocturno.',
    },
    {
      p: '¿Cuántas horas extra puede hacer un trabajador al día?',
      r: 'El trabajo suplementario no puede exceder dos horas diarias ni doce semanales. Desde la Ley 2466 de 2025 ya no se requiere autorización previa del Ministerio del Trabajo, pero el empleador está obligado a llevar un registro de esas horas por trabajador.',
    },
    {
      p: '¿Cuánto se paga el domingo trabajado en 2026?',
      r: 'El recargo por trabajo dominical o festivo es del 90% desde el 1 de julio de 2026. Antes era del 80% y subirá al 100% el 1 de julio de 2027. Una hora diurna dominical sobre una hora ordinaria de $9.524 vale $18.095.',
    },
  ],
};
