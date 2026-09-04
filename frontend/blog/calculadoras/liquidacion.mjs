import {
  SMLMV, AUXILIO_TRANSPORTE, TOPE_AUXILIO, TOPE_SALARIO_ALTO, PISO_INDEMNIZACION_FIJO,
  prestaciones, indemnizacion, diasEntreFechas,
} from '../reglas-legales.mjs';

// Calculadora de liquidación al terminar un contrato.
//
// Es la búsqueda más frecuente de las tres, y también la que más se responde
// mal en internet: casi todos los resultados usan la misma base para las cuatro
// prestaciones, cuando las vacaciones NO llevan auxilio de transporte y las
// cesantías sí; y casi ninguno distingue las tres reglas de indemnización del
// artículo 64.
//
// Igual que las otras, los números se hornean en el HTML: los rastreadores de
// los buscadores y de los asistentes de IA no ejecutan JavaScript.

const cop = n => '$' + Math.round(n).toLocaleString('es-CO');

// Resta meses a una fecha ISO, para armar el ejemplo con el que se hornea la
// página sin escribir fechas fijas que envejezcan.
function menosMeses(iso, meses) {
  const [a, m, d] = iso.slice(0, 10).split('-').map(Number);
  const t = new Date(Date.UTC(a, m - 1 - meses, d));
  return t.toISOString().slice(0, 10);
}

export default function calculadoraLiquidacion(hoyISO) {
  const ejemplo = {
    salario: SMLMV,
    fechaInicio: menosMeses(hoyISO, 18),
    fechaFin: hoyISO,
    tipo: 'INDEFINIDO',
  };
  const p = prestaciones(ejemplo);
  const ind = indemnizacion(ejemplo);
  const totalConIndem = p.total + ind.valor;
  const largo = f => new Date(f + 'T12:00:00').toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' });

  const cuerpo = `
<p class="entradilla">Cesantías, intereses, prima y vacaciones, y la indemnización si el despido fue sin justa causa. Con el salario mínimo de ${cop(SMLMV)} y el auxilio de ${cop(AUXILIO_TRANSPORTE)} que rigen en 2026.</p>

<div class="calc" id="calc">
  <div class="calc-cab campos-liq">
    <div>
      <label for="salario">Salario mensual</label>
      <div class="pesos"><span>$</span><input type="text" id="salario" value="${ejemplo.salario.toLocaleString('es-CO')}" inputmode="numeric" autocomplete="off" /></div>
    </div>
    <div>
      <label for="tipo">Tipo de contrato</label>
      <select id="tipo">
        <option value="INDEFINIDO" selected>Término indefinido</option>
        <option value="FIJO">Término fijo</option>
      </select>
    </div>
    <div>
      <label for="ingreso">Entró el</label>
      <input type="date" id="ingreso" value="${ejemplo.fechaInicio}" />
    </div>
    <div>
      <label for="retiro">Sale el</label>
      <input type="date" id="retiro" value="${ejemplo.fechaFin}" />
    </div>
    <div id="caja-pactada" hidden>
      <label for="pactada">El contrato iba hasta</label>
      <input type="date" id="pactada" value="" />
      <p class="pista tenue">Para saber cuántos salarios faltaban</p>
    </div>
    <div>
      <label for="cesantias-desde">Cesantías pendientes desde</label>
      <input type="date" id="cesantias-desde" value="${ejemplo.fechaInicio}" />
      <p class="pista tenue">Si ya te las consignaron, pon el 1 de enero</p>
    </div>
  </div>

  <label class="fila-check">
    <input type="checkbox" id="sin-justa-causa" />
    <span>El despido fue <strong>sin justa causa</strong> (suma la indemnización del artículo 64)</span>
  </label>

  <div class="calc-cuerpo">
    <div class="par-dato">
      <span>Tiempo liquidado <span class="tenue" id="antiguedad-txt">(año comercial de 360 días)</span></span>
      <strong id="dias">${p.dias.toLocaleString('es-CO')} días</strong>
    </div>
    <div class="par-dato">
      <span>Cesantías <span class="tenue">salario + auxilio, por los días pendientes</span></span>
      <strong id="cesantias">${cop(p.cesantias)}</strong>
    </div>
    <div class="par-dato">
      <span>Intereses a las cesantías <span class="tenue">12% anual</span></span>
      <strong id="intereses">${cop(p.intereses)}</strong>
    </div>
    <div class="par-dato">
      <span>Prima de servicios <span class="tenue" id="prima-dias">${p.diasPrima} días del semestre</span></span>
      <strong id="prima">${cop(p.prima)}</strong>
    </div>
    <div class="par-dato">
      <span>Vacaciones <span class="tenue">salario sin auxilio</span></span>
      <strong id="vacaciones">${cop(p.vacaciones)}</strong>
    </div>
    <div class="par-dato" id="fila-indem" hidden>
      <span>Indemnización <span class="tenue" id="indem-detalle"></span></span>
      <strong id="indemnizacion">${cop(0)}</strong>
    </div>
  </div>

  <div class="calc-total">
    <div class="izq">
      <span class="rot">Total a pagar</span>
      <p id="desglose">Contrato ${ejemplo.tipo === 'INDEFINIDO' ? 'a término indefinido' : 'a término fijo'} · ${largo(ejemplo.fechaInicio)} a ${largo(ejemplo.fechaFin)}</p>
    </div>
    <strong id="total">${cop(p.total)}</strong>
  </div>
  <p class="calc-pie">Sobre estos valores no se descuenta salud ni pensión, salvo la indemnización, que sí es base de aportes. Tampoco incluye el pago de la seguridad social del último mes ni descuentos por préstamos o embargos.</p>
</div>

<h2 id="que-se-paga">Qué se paga, y sobre qué base</h2>

<p>Las cuatro prestaciones no se calculan igual, y esa es la primera fuente de error. El auxilio de transporte cuenta como salario para las cesantías y la prima, pero no para las vacaciones.</p>

<table>
  <thead><tr><th>Concepto</th><th>Base</th><th class="formula">Cómo se calcula</th></tr></thead>
  <tbody>
    <tr><td>Cesantías</td><td>Salario + auxilio</td><td class="formula">base × días ÷ 360</td></tr>
    <tr><td>Intereses a las cesantías</td><td>Las cesantías</td><td class="formula">cesantías × días × 12% ÷ 360</td></tr>
    <tr><td>Prima de servicios</td><td>Salario + auxilio</td><td class="formula">base × días del semestre ÷ 360</td></tr>
    <tr><td>Vacaciones</td><td>Salario, <strong>sin</strong> auxilio</td><td class="formula">salario × días ÷ 720</td></tr>
  </tbody>
</table>

<p>El auxilio de transporte de 2026 es de <strong>${cop(AUXILIO_TRANSPORTE)}</strong> y lo recibe quien devenga hasta dos salarios mínimos, es decir hasta ${cop(TOPE_AUXILIO)}. Por encima de eso no entra en la cuenta.</p>

<p>Las vacaciones se dividen entre 720 y no entre 360 porque son quince días hábiles por año, o sea medio mes de salario.</p>

<h2 id="indemnizacion">La indemnización, que no siempre va</h2>

<p>La indemnización del artículo 64 del Código Sustantivo del Trabajo <strong>solo se paga si el despido fue sin justa causa</strong>. Si la persona renunció, o si el contrato a término fijo llegó a su fecha con preaviso, no hay indemnización: solo las prestaciones de arriba.</p>

<p>Cuando sí va, hay tres reglas distintas:</p>

<table>
  <thead><tr><th>Caso</th><th>Indemnización</th></tr></thead>
  <tbody>
    <tr><td>Término fijo</td><td>Los salarios que faltaban para cumplir el plazo, con un piso de ${PISO_INDEMNIZACION_FIJO} días</td></tr>
    <tr><td>Indefinido, menos de 10 mínimos (${cop(TOPE_SALARIO_ALTO)})</td><td>30 días por el primer año, más 20 por cada año adicional</td></tr>
    <tr><td>Indefinido, 10 mínimos o más</td><td>20 días por el primer año, más 15 por cada año adicional</td></tr>
  </tbody>
</table>

<p>Las fracciones de año se pagan proporcionalmente, pero el primer año no: quien lleva cuatro meses en un contrato indefinido recibe los 30 días completos, no una parte.</p>

<h2 id="ojo">Dónde se equivoca la gente</h2>

<ul>
  <li><strong>Meter el auxilio de transporte en las vacaciones.</strong> Va en cesantías y prima, no en vacaciones.</li>
  <li><strong>Volver a cobrar cesantías ya consignadas.</strong> Si el empleador las consignó al fondo en febrero, al salir solo se deben las del año en curso. Por eso la calculadora tiene esa fecha aparte.</li>
  <li><strong>Contar los meses de 31 días como 31.</strong> La liquidación va en año comercial: todos los meses son de 30 y el año es de 360.</li>
  <li><strong>Dar por hecha la indemnización.</strong> En una renuncia no existe, y es el reclamo más común que no prospera.</li>
  <li><strong>Olvidar que el contrato a término fijo que pasó de cuatro años ya es indefinido</strong> por la Ley 2466 de 2025, y entonces la indemnización se calcula con la regla del indefinido, no con la de los salarios faltantes.</li>
</ul>

<div class="cierre-cta">
  <p><strong>Para que esta cuenta salga sola hace falta saber qué firmó cada quien.</strong> HoraPro lleva el contrato de cada colaborador con su tipo, sus prórrogas y su documento, y avisa 30 días antes de cada vencimiento. Precio por empresa, no por empleado.</p>
  <p><a class="cta" href="/registro">Probar gratis 7 días</a></p>
</div>

<p class="cierre">Esta calculadora resuelve el final del contrato. Para lo de cada mes están la <a href="/calculadoras/horas-extra-recargos/">calculadora de horas extra y recargos</a> y la de <a href="/calculadoras/jornada-42-horas/">cuánto cuesta la jornada de 42 horas</a>.</p>
`;

  /* Sin acentos graves ni signo de dolar seguido de llave aqui dentro. */
  const estilos = `
.calc .campos-liq{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px;align-items:start}
.calc .campos-liq>div{min-width:0}
.calc .campos-liq input[type=date],.calc .campos-liq select{width:100%;font-size:16px;font-weight:600;
  padding:11px 13px;border:1px solid #dcdcdc;border-radius:12px;color:#303030;background:#fff;
  font-family:inherit}
.calc .campos-liq input:focus,.calc .campos-liq select:focus{outline:2px solid #FFD85E;
  outline-offset:1px;border-color:#FFD85E}
.calc .campos-liq .pesos{max-width:none}
.calc .campos-liq .pesos input{font-size:20px}
.calc .campos-liq .pista{font-size:12.5px;margin:7px 0 0;line-height:1.4}
.fila-check{display:flex;align-items:flex-start;gap:11px;padding:15px 24px;background:#FFF6D9;
  border-bottom:1px solid #F5E3A8;font-size:15.5px;line-height:1.5;cursor:pointer}
.fila-check input{width:19px;height:19px;margin:2px 0 0;accent-color:#303030;flex:none;cursor:pointer}
.calc-cuerpo{padding:6px 24px}
.par-dato{display:flex;align-items:baseline;justify-content:space-between;gap:16px;
  padding:13px 0;border-bottom:1px solid #f0f0f0;font-size:15.5px}
.par-dato:last-child{border-bottom:0}
.par-dato .tenue{display:block;font-size:13px;line-height:1.4}
.par-dato strong{font-size:18px;font-weight:800;font-variant-numeric:tabular-nums;white-space:nowrap}
.par-dato[hidden]{display:none}
/* Las formulas se parten en varios renglones antes que empujar la tabla fuera
   de la pantalla. Van en los espacios, o sea entre termino y termino. */
td.formula,th.formula{white-space:normal;color:#4a4a4a}
#fila-indem strong{color:#8a2b2b}
@media(max-width:760px){.calc .campos-liq{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:520px){
  .calc .campos-liq{grid-template-columns:1fr}
  .par-dato{flex-direction:column;gap:3px}
  .par-dato strong{font-size:20px}
}
`;

  /* Sin plantillas de texto, por la misma razon. */
  const script = `
(function () {
  var el = function (id) { return document.getElementById(id); };
  var salario = el('salario'), tipo = el('tipo'), ingreso = el('ingreso'), retiro = el('retiro');
  var pactada = el('pactada'), cajaPactada = el('caja-pactada'), cesDesde = el('cesantias-desde');
  var sinJusta = el('sin-justa-causa');
  if (!salario || !ingreso || !retiro) return;

  var SMLMV = ${SMLMV}, AUXILIO = ${AUXILIO_TRANSPORTE}, TOPE_AUX = ${TOPE_AUXILIO};
  var TOPE_ALTO = ${TOPE_SALARIO_ALTO}, PISO_FIJO = ${PISO_INDEMNIZACION_FIJO};

  function pesos(n) { return '$' + Math.round(n).toLocaleString('es-CO'); }
  function soloDigitos(s) { return (s || '').replace(/[^0-9]/g, ''); }

  /* Año comercial: meses de 30 y años de 360, con el día 31 contado como 30. */
  function dias360(desde, hasta) {
    if (!desde || !hasta) return 0;
    var a = desde.split('-').map(Number), b = hasta.split('-').map(Number);
    var d = (b[0] - a[0]) * 360 + (b[1] - a[1]) * 30 + (Math.min(b[2], 30) - Math.min(a[2], 30)) + 1;
    return Math.max(0, d);
  }

  function inicioSemestre(iso) {
    var p = iso.split('-');
    return Number(p[1]) <= 6 ? p[0] + '-01-01' : p[0] + '-07-01';
  }

  function largo(iso) {
    if (!iso) return '';
    return new Date(iso + 'T12:00:00').toLocaleDateString('es-CO',
      { day: 'numeric', month: 'long', year: 'numeric' });
  }

  function calcular() {
    var base = parseInt(soloDigitos(salario.value), 10) || 0;
    var esFijo = tipo.value === 'FIJO';
    cajaPactada.hidden = !esFijo;

    var d = dias360(ingreso.value, retiro.value);
    var arranqueCes = (cesDesde.value && cesDesde.value > ingreso.value) ? cesDesde.value : ingreso.value;
    var dCes = dias360(arranqueCes, retiro.value);
    var aux = (base > 0 && base <= TOPE_AUX) ? AUXILIO : 0;
    var conAux = base + aux;

    var cesantias = conAux * dCes / 360;
    var intereses = cesantias * dCes * 0.12 / 360;
    var semestre = inicioSemestre(retiro.value || '');
    var desdePrima = semestre > ingreso.value ? semestre : ingreso.value;
    var dPrima = dias360(desdePrima, retiro.value);
    var prima = conAux * dPrima / 360;
    var vacaciones = base * d / 720;

    var indem = 0, detalle = '';
    if (sinJusta.checked) {
      var diaSal = base / 30;
      if (esFijo) {
        var faltan = (pactada.value && pactada.value > retiro.value)
          ? dias360(retiro.value, pactada.value) - 1 : 0;
        var diasI = Math.max(faltan, PISO_FIJO);
        indem = diasI * diaSal;
        detalle = diasI + ' días que faltaban del plazo';
        if (faltan < PISO_FIJO) detalle = 'piso legal de ' + PISO_FIJO + ' días';
      } else {
        var anios = d / 360;
        var alto = base >= TOPE_ALTO;
        var pri = alto ? 20 : 30, adic = alto ? 15 : 20;
        var diasN = anios <= 1 ? pri : pri + adic * (anios - 1);
        indem = diasN * diaSal;
        detalle = diasN.toFixed(1).replace('.', ',') + ' días · ' + pri + ' del primer año'
          + (anios > 1 ? ' más ' + adic + ' por año adicional' : '');
      }
    }

    el('dias').textContent = d.toLocaleString('es-CO') + ' días';
    el('cesantias').textContent = pesos(cesantias);
    el('intereses').textContent = pesos(intereses);
    el('prima').textContent = pesos(prima);
    el('prima-dias').textContent = dPrima + ' días del semestre';
    el('vacaciones').textContent = pesos(vacaciones);
    el('fila-indem').hidden = !sinJusta.checked;
    el('indemnizacion').textContent = pesos(indem);
    el('indem-detalle').textContent = detalle;
    el('total').textContent = pesos(cesantias + intereses + prima + vacaciones + indem);
    el('desglose').textContent = (esFijo ? 'Contrato a término fijo' : 'Contrato a término indefinido')
      + (ingreso.value && retiro.value ? ' · ' + largo(ingreso.value) + ' a ' + largo(retiro.value) : '');
    el('antiguedad-txt').textContent = aux > 0
      ? '(año comercial de 360 días · con auxilio de transporte)'
      : '(año comercial de 360 días · sin auxilio, supera dos mínimos)';
  }

  salario.addEventListener('input', function () {
    var dg = soloDigitos(salario.value);
    var alFinal = salario.selectionStart >= salario.value.length;
    salario.value = dg ? parseInt(dg, 10).toLocaleString('es-CO') : '';
    if (alFinal) salario.setSelectionRange(salario.value.length, salario.value.length);
    calcular();
  });
  [tipo, ingreso, retiro, pactada, cesDesde, sinJusta].forEach(function (c) {
    if (c) c.addEventListener('change', calcular);
    if (c) c.addEventListener('input', calcular);
  });
  calcular();
})();
`;

  return {
    slug: 'calculadora-liquidacion',
    ruta: '/calculadoras/liquidacion-contrato/',
    titulo: 'Calculadora de liquidación de contrato',
    tituloSeo: `Calculadora de liquidación laboral ${hoyISO.slice(0, 4)} | HoraPro`,
    descripcion: `Calcula cesantías, intereses, prima, vacaciones e indemnización por despido sin justa causa con la normativa colombiana vigente: salario mínimo de ${cop(SMLMV)} y auxilio de ${cop(AUXILIO_TRANSPORTE)}. Gratis y sin registro.`,
    categoria: 'Calculadora',
    subtitulo: `con el salario mínimo de ${cop(SMLMV)} y el auxilio de ${cop(AUXILIO_TRANSPORTE)} de 2026`,
    secciones: [
      { id: 'calc', titulo: 'La calculadora' },
      { id: 'que-se-paga', titulo: 'Qué se paga y sobre qué base' },
      { id: 'indemnizacion', titulo: 'La indemnización' },
      { id: 'ojo', titulo: 'Dónde se equivoca la gente' },
    ],
    destacado: {
      valor: cop(totalConIndem),
      rotulo: `recibe quien sale hoy tras ${Math.floor(diasEntreFechas(ejemplo.fechaInicio, ejemplo.fechaFin) / 30)} meses con el salario mínimo`,
      pie: 'Prestaciones más indemnización por despido sin justa causa',
    },
    actualizado: hoyISO,
    cuerpo,
    estilos,
    script,
  };
}
