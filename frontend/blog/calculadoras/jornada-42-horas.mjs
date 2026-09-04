import {
  JORNADAS, jornadaVigente, horasMes, valorHora,
  extrasSemanales, costoExtrasMes, SEMANAS_MES, TOPE_EXTRAS_SEMANA, TOPE_EXTRAS_DIA,
} from '../reglas-legales.mjs';

// Calculadora del costo de la jornada de 42 horas.
//
// La pregunta que se hace un empresario colombiano no es "cuántas horas son
// ahora", es "cuánto me cuesta". La reducción de la Ley 2101 no baja el salario
// de nadie: sube el valor de la hora y adelanta el punto donde empieza la hora
// extra. Quien mantiene la misma operación paga la diferencia.
//
// Igual que la otra calculadora, los números se hornean en el HTML para que la
// página sirva a quien no ejecuta JavaScript, que son justamente los buscadores
// y los asistentes de IA.

const cop = n => '$' + Math.round(n).toLocaleString('es-CO');
const FACTOR_EXTRA_DIURNA = 1.25;

const EJEMPLO = { personas: 10, salario: 2_000_000, horasSemana: 48 };

// La jornada del escalón anterior, para poder comparar contra lo que se pagaba
// antes. Sale de la misma tabla de la Ley 2101, no de un número escrito a mano.
function jornadaAnterior(actual) {
  const previas = JORNADAS.map(j => j.horas).filter(h => h > actual);
  return previas.length ? Math.min(...previas) : actual;
}

export default function calculadoraJornada42(hoyISO) {
  const jornada = jornadaVigente(hoyISO);
  const antes = jornadaAnterior(jornada);

  const escenario = (j, e) => {
    const extras = extrasSemanales(e.horasSemana, j);
    const costoUno = costoExtrasMes({ salario: e.salario, jornada: j, horasSemana: e.horasSemana, factor: FACTOR_EXTRA_DIURNA });
    return {
      jornada: j,
      hora: valorHora(e.salario, j),
      extrasSemana: extras,
      horasMesExtra: extras * SEMANAS_MES,
      costoUno,
      costoTodos: costoUno * e.personas,
    };
  };

  const hoy = escenario(jornada, EJEMPLO);
  const ayer = escenario(antes, EJEMPLO);
  const dif = hoy.costoTodos - ayer.costoTodos;

  const cuerpo = `
<p class="entradilla">La jornada bajó a <strong>${jornada} horas</strong> semanales y ningún salario bajó con ella. Eso significa que la hora vale más y que las horas extra empiezan antes. Esta calculadora dice cuánto cuesta esa diferencia en tu operación, al mes y al año.</p>

<div class="calc" id="calc">
  <div class="calc-cab campos">
    <div>
      <label for="personas">Personas</label>
      <input type="number" id="personas" min="1" max="5000" step="1" value="${EJEMPLO.personas}" inputmode="numeric" />
    </div>
    <div>
      <label for="salario">Salario promedio</label>
      <div class="pesos"><span>$</span><input type="text" id="salario" value="${EJEMPLO.salario.toLocaleString('es-CO')}" inputmode="numeric" autocomplete="off" /></div>
    </div>
    <div>
      <label for="horas">Horas por semana</label>
      <input type="number" id="horas" min="1" max="80" step="0.5" value="${EJEMPLO.horasSemana}" inputmode="decimal" />
      <p class="pista tenue">Las que trabaja cada persona de verdad</p>
    </div>
  </div>

  <div class="calc-cuerpo">
    <div class="par-dato">
      <span>Horas extra por persona, a la semana</span>
      <strong id="extras">${hoy.extrasSemana.toLocaleString('es-CO')}</strong>
    </div>
    <div class="par-dato">
      <span>Valor de la hora ordinaria <span class="tenue">(salario entre ${hoy.jornada * SEMANAS_MES})</span></span>
      <strong id="hora">${cop(hoy.hora)}</strong>
    </div>
    <div class="par-dato">
      <span>Con la jornada anterior de ${antes} horas costaba</span>
      <strong id="antes">${cop(ayer.costoTodos)}</strong>
    </div>
  </div>

  <div id="aviso-tope" class="aviso" hidden>
    <strong>Ojo: eso pasa el tope legal.</strong> La ley permite ${TOPE_EXTRAS_DIA} horas extra al día y
    ${TOPE_EXTRAS_SEMANA} a la semana (artículo 167 del Código Sustantivo del Trabajo). Por encima de ahí
    ya no es un asunto de plata: es una infracción, y la salida es contratar o reorganizar turnos.
  </div>

  <div class="calc-total">
    <div class="izq">
      <span class="rot">Extras al mes, toda tu gente</span>
      <p id="desglose">${cop(hoy.costoUno)} por persona · ${cop(hoy.costoTodos * 12)} al año</p>
    </div>
    <strong id="total">${cop(hoy.costoTodos)}</strong>
  </div>
  <div class="calc-delta" id="delta-caja">
    <span>Lo que sumó la reducción de ${antes} a ${jornada} horas</span>
    <strong id="delta">${cop(dif)}</strong>
    <span class="tenue">al mes</span>
  </div>
  <p class="calc-pie">Cuenta solo el valor de las horas extra diurnas, con factor ${FACTOR_EXTRA_DIURNA.toFixed(2).replace('.', ',')}. No incluye prestaciones ni aportes, que suben la cifra real, ni recargos nocturnos o dominicales. Para esos está la <a href="/calculadoras/horas-extra-recargos/">calculadora de recargos</a>.</p>
</div>

<h2 id="que-cambio">Qué cambió exactamente</h2>

<p>La Ley 2101 de 2021 bajó la jornada máxima de 48 a ${jornada} horas semanales, y lo hizo por escalones para dar tiempo a acomodarse:</p>

<table>
  <thead><tr><th>Desde</th><th>Jornada semanal</th><th>Horas del mes</th></tr></thead>
  <tbody>
    <tr><td>Antes de julio de 2023</td><td>48 horas</td><td>240</td></tr>
    ${JORNADAS.map(j => `<tr><td>${j.desde.split('-').reverse().join('/')}</td><td>${j.horas} horas</td><td>${horasMes(j.horas)}</td></tr>`).join('')}
  </tbody>
</table>

<p>Lo importante no es el número de horas, es el <strong>divisor</strong>. El valor de la hora sale del salario dividido entre las horas del mes, así que pasar de 240 a ${horasMes(jornada)} sube el valor de cada hora un ${Math.round((240 / horasMes(jornada) - 1) * 100)}% sin que nadie haya recibido un aumento.</p>

<h2 id="tres-salidas">Las tres salidas, y ninguna es gratis</h2>

<p>Si tu operación necesitaba ${EJEMPLO.horasSemana} horas por persona a la semana, sigue necesitándolas. Lo único que cambió es cómo se pagan:</p>

<ul>
  <li><strong>Pagar las extras.</strong> Es lo que calcula esta página. Tiene techo: ${TOPE_EXTRAS_SEMANA} horas por semana y ${TOPE_EXTRAS_DIA} por día. Pasado eso no es legal, por mucho que se quiera pagar.</li>
  <li><strong>Contratar más gente.</strong> Reparte las horas sin extras, pero suma prestaciones, aportes y dotación por cada contrato nuevo.</li>
  <li><strong>Reducir la operación.</strong> Cerrar antes o abrir menos días. No cuesta nómina, cuesta ventas.</li>
</ul>

<p>Lo que no es una salida es no darse cuenta. La jornada bajó el 15 de julio de 2026 y las horas por encima de ${jornada} son extra desde ese día, se hayan liquidado como tal o no. Cuando alguien reclame, el retroactivo se cuenta desde ahí.</p>

<h2 id="ojo">Dónde se equivoca la gente</h2>

<ul>
  <li>Seguir dividiendo el salario entre 240. Ese divisor corresponde a la jornada de 48 horas y lleva tres escalones desactualizado.</li>
  <li>Creer que la reducción baja el salario. No: el salario mensual es el mismo, se trabaja menos por la misma plata.</li>
  <li>Pensar que la jornada se puede pactar más larga en el contrato. El máximo legal es máximo, y lo que se firme por encima no vale.</li>
  <li>Contar las horas del almuerzo dentro de la jornada. El descanso no es tiempo de trabajo, salvo que se haya pactado.</li>
</ul>

<div class="cierre-cta">
  <p><strong>El problema real no es la cuenta, es saber cuántas horas trabajó cada quien.</strong> HoraPro registra la jornada y marca las extras solas, con la jornada legal vigente en la fecha de cada turno. Precio por empresa, no por empleado.</p>
  <p><a class="cta" href="/registro">Probar gratis 7 días</a></p>
</div>

<p class="cierre">Si lo que buscas es el detalle de cada recargo, está en la <a href="/calculadoras/horas-extra-recargos/">calculadora de horas extra y recargos</a> y en <a href="/blog/jornada-laboral-colombia-2026/">la jornada laboral en 2026</a>.</p>
`;

  /* Solo lo propio de esta pagina; el armazon comun lo pone la plantilla.
     Sin acentos graves ni signo de dolar seguido de llave aqui dentro. */
  const estilos = `
.calc .campos{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;align-items:start}
.calc .campos>div{min-width:0}
.calc .campos input[type=number]{width:100%;font-size:22px;font-weight:800;padding:10px 14px;
  border:1px solid #dcdcdc;border-radius:12px;color:#303030;font-variant-numeric:tabular-nums;
  background:#fff}
/* Solo los campos sueltos: el del salario va envuelto en .pesos y su anillo lo
   pone la pildora, para no dibujar un recuadro dentro de otro. */
.calc .campos input[type=number]:focus{outline:2px solid #FFD85E;outline-offset:1px;border-color:#FFD85E}
.calc .campos .pesos{max-width:none}
.calc .campos .pesos input{font-size:22px}
.calc .campos .pista{font-size:12.5px;margin:7px 0 0;line-height:1.4}
.calc-cuerpo{padding:6px 24px}
.par-dato{display:flex;align-items:baseline;justify-content:space-between;gap:16px;
  padding:13px 0;border-bottom:1px solid #f0f0f0;font-size:15.5px}
.par-dato:last-child{border-bottom:0}
.par-dato strong{font-size:19px;font-weight:800;font-variant-numeric:tabular-nums;white-space:nowrap}
.aviso{margin:0 24px 18px;background:#FDECEC;border:1px solid #F3C9C9;color:#8a2b2b;
  border-radius:12px;padding:14px 16px;font-size:14.5px;line-height:1.55}
.calc-delta{background:#FFF6D9;border-top:1px solid #F5E3A8;padding:16px 24px;display:flex;
  align-items:baseline;gap:10px;flex-wrap:wrap;font-size:15px}
.calc-delta strong{font-size:23px;font-weight:800;font-variant-numeric:tabular-nums;color:#7a5c00}
/* El aviso de tope aparece y desaparece; sin esto el atributo hidden pierde
   contra el display:block que trae la clase. */
.aviso[hidden],.calc-delta[hidden]{display:none}
@media(max-width:640px){
  .calc .campos{grid-template-columns:1fr}
  .par-dato{flex-direction:column;gap:2px}
  .par-dato strong{font-size:21px}
}
`;

  /* Sin plantillas de texto, por la misma razon. */
  const script = `
(function () {
  var elPersonas = document.getElementById('personas');
  var elSalario = document.getElementById('salario');
  var elHoras = document.getElementById('horas');
  if (!elPersonas || !elSalario || !elHoras) return;

  var JORNADA = ${jornada};
  var ANTES = ${antes};
  var SEMANAS = ${SEMANAS_MES};
  var FACTOR = ${FACTOR_EXTRA_DIURNA};
  var TOPE = ${TOPE_EXTRAS_SEMANA};

  function pesos(n) { return '$' + Math.round(n).toLocaleString('es-CO'); }
  function soloDigitos(s) { return (s || '').replace(/[^0-9]/g, ''); }
  function poner(id, txt) { var e = document.getElementById(id); if (e) e.textContent = txt; }

  function costo(jornada, salario, horasSemana, personas) {
    var extras = Math.max(0, horasSemana - jornada);
    var hora = salario / (jornada * SEMANAS);
    return extras * SEMANAS * hora * FACTOR * personas;
  }

  function calcular() {
    var personas = Math.max(1, parseInt(elPersonas.value, 10) || 0);
    var salario = parseInt(soloDigitos(elSalario.value), 10) || 0;
    var horas = parseFloat(elHoras.value) || 0;

    var extras = Math.max(0, horas - JORNADA);
    var hoy = costo(JORNADA, salario, horas, personas);
    var ayer = costo(ANTES, salario, horas, personas);

    poner('extras', extras.toLocaleString('es-CO'));
    poner('hora', pesos(salario / (JORNADA * SEMANAS)));
    poner('antes', pesos(ayer));
    poner('total', pesos(hoy));
    poner('desglose', pesos(personas > 0 ? hoy / personas : 0) + ' por persona · ' + pesos(hoy * 12) + ' al año');
    poner('delta', pesos(hoy - ayer));

    var caja = document.getElementById('delta-caja');
    if (caja) caja.hidden = !(hoy - ayer > 0);
    var aviso = document.getElementById('aviso-tope');
    if (aviso) aviso.hidden = extras <= TOPE;
  }

  elSalario.addEventListener('input', function () {
    var d = soloDigitos(elSalario.value);
    var alFinal = elSalario.selectionStart >= elSalario.value.length;
    elSalario.value = d ? parseInt(d, 10).toLocaleString('es-CO') : '';
    if (alFinal) elSalario.setSelectionRange(elSalario.value.length, elSalario.value.length);
    calcular();
  });
  elPersonas.addEventListener('input', calcular);
  elHoras.addEventListener('input', calcular);
  calcular();
})();
`;

  return {
    slug: 'calculadora-jornada-42-horas',
    ruta: '/calculadoras/jornada-42-horas/',
    titulo: `Cuánto cuesta la jornada de ${jornada} horas`,
    tituloSeo: `Calculadora: cuánto cuesta la jornada de ${jornada} horas | HoraPro`,
    descripcion: `Calcula en pesos lo que la reducción de jornada de la Ley 2101 le suma a tu nómina: horas extra por persona, costo mensual y anual, y la diferencia contra la jornada anterior de ${antes} horas.`,
    categoria: 'Calculadora',
    subtitulo: `con la jornada de ${jornada} horas vigente desde el 15 de julio de 2026`,
    destacado: {
      valor: cop(dif),
      rotulo: `le sumó al mes la reducción a una empresa de ${EJEMPLO.personas} personas`,
      pie: `De ${antes} a ${jornada} horas · ${EJEMPLO.horasSemana} horas por semana`,
    },
    secciones: [
      { id: 'calc', titulo: 'La calculadora' },
      { id: 'que-cambio', titulo: 'Qué cambió exactamente' },
      { id: 'tres-salidas', titulo: 'Las tres salidas' },
      { id: 'ojo', titulo: 'Dónde se equivoca la gente' },
    ],
    actualizado: hoyISO,
    cuerpo,
    estilos,
    script,
    reglas: { jornada, recargoDom: null, antes },
  };
}
