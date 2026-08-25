import { reglasEn, franjaNocturna } from '../reglas-legales.mjs';

// Calculadora pública de horas extra y recargos.
//
// La razón de que exista: los factores y la jornada se leen de
// `reglas-legales.mjs`, que es el mismo cuadro que el producto le cobra a la
// gente y que una prueba del backend vigila. Casi todo lo publicado sobre este
// tema en internet está desactualizado (siguen dividiendo entre 240, siguen
// pagando el domingo al 80%); esta página se recalcula sola en cada compilación.
//
// Se genera con los números YA CALCULADOS en el HTML, no solo con un formulario.
// Los rastreadores de los buscadores y de los asistentes de IA no ejecutan
// JavaScript: si la tabla la pintara el navegador, para ellos esta página
// estaría en blanco. El formulario es un añadido encima de algo que ya se lee.

const cop = n => '$' + Math.round(n).toLocaleString('es-CO');
const fac = n => n.toFixed(2).replace('.', ',');

// Salario de ejemplo con el que se hornea la tabla. Es el que ve quien llega
// desde un buscador y el que arranca en el formulario.
const SALARIO_EJEMPLO = 2_000_000;

export default function calculadoraHorasExtra(hoyISO) {
  const r = reglasEn(hoyISO);
  const hora = SALARIO_EJEMPLO / r.horasMes;
  const nocturna = franjaNocturna(r.inicioNocturna);
  const domPct = Math.round(r.recargoDom * 100);

  const filas = r.tipos.map(t => `
    <tr>
      <td>${t.nombre.replace('Dominical/Festivo', 'dominical o festivo')}</td>
      <td class="num">${fac(t.recargo)}</td>
      <td class="num">${cop(hora * t.recargo)}</td>
    </tr>`).join('');

  const controles = r.tipos.map(t => `
    <div class="fila-h">
      <label for="h-${t.codigo}">${t.nombre.replace('Dominical/Festivo', 'dominical o festivo')}
        <span class="fac">x${fac(t.recargo)}</span></label>
      <input type="number" id="h-${t.codigo}" data-factor="${t.recargo}" min="0" max="400" step="0.5" value="0" inputmode="decimal" />
    </div>`).join('');

  const cuerpo = `
<p class="entradilla">Pon tu salario y las horas de cada tipo. La calculadora usa los factores vigentes hoy en Colombia: jornada de <strong>${r.jornada} horas</strong> semanales, nocturna desde las <strong>${nocturna.split(' a ')[0]}</strong> y dominical al <strong>${domPct}%</strong>.</p>

<div class="calc" id="calc">
  <div class="calc-cab">
    <label for="salario">Salario mensual</label>
    <div class="pesos"><span>$</span><input type="text" id="salario" value="${SALARIO_EJEMPLO.toLocaleString('es-CO')}" inputmode="numeric" autocomplete="off" /></div>
    <p class="pista">Tu hora ordinaria vale <strong id="valor-hora">${cop(hora)}</strong>
      <span class="tenue">(salario entre ${r.horasMes} horas del mes)</span></p>
  </div>
  <div class="calc-horas">${controles}</div>
  <div class="calc-total">
    <div><span class="rot">Total del período</span><strong id="total">${cop(0)}</strong></div>
    <p class="tenue" id="desglose">Escribe las horas de arriba para ver el total.</p>
  </div>
  <p class="calc-pie">Cuenta el valor de las horas trabajadas. No incluye prestaciones, auxilio de transporte ni deducciones de seguridad social.</p>
</div>

<h2 id="tabla">Cuánto vale cada hora hoy</h2>

<p>Esta tabla está calculada con un salario de ${cop(SALARIO_EJEMPLO)}, que da una hora ordinaria de <strong>${cop(hora)}</strong>. Los factores son los que rigen en Colombia a la fecha de esta página.</p>

<table>
  <thead><tr><th>Tipo de hora</th><th>Factor</th><th>Con hora de ${cop(hora)}</th></tr></thead>
  <tbody>${filas}</tbody>
</table>

<h2 id="como">De dónde sale cada número</h2>

<p><strong>El valor de la hora</strong> es el salario mensual dividido entre las horas del mes, y las horas del mes son la jornada semanal por cinco. Con la jornada de ${r.jornada} horas el divisor es <strong>${r.horasMes}</strong>. Mucha nómina en Colombia sigue dividiendo entre 240, que correspondía a la jornada de 48 horas, y por esa sola cuenta paga de menos en cada recargo.</p>

<p><strong>El recargo</strong> se paga por trabajar en un momento incómodo dentro de la jornada normal. Quien entra a la una de la tarde y sale a las nueve de la noche no está haciendo horas extra: cumple sus ocho horas, pero las últimas caen en franja nocturna y llevan el 35%.</p>

<p><strong>La hora extra</strong> se paga por trabajar de más, por encima de la jornada. Es tiempo adicional, no tiempo incómodo. Y las dos cosas se suman: una hora trabajada de más, de noche y en domingo, acumula los tres factores.</p>

<h2 id="cambios">Qué cambió, y por qué las cuentas viejas ya no sirven</h2>

<p>Tres reglas se movieron en poco más de un año, y las tres afectan esta cuenta:</p>

<ul>
  <li><strong>La jornada</strong> bajó de 48 a ${r.jornada} horas por la Ley 2101 de 2021, de forma escalonada. La última bajada fue el 15 de julio de 2026. Bajar la jornada sube el valor de la hora y adelanta el punto donde empieza la hora extra.</li>
  <li><strong>La jornada nocturna</strong> arranca a las 7:00 p.m. desde el 25 de diciembre de 2025. Antes empezaba a las 9:00 p.m. Son dos horas más de recargo por cada turno de tarde.</li>
  <li><strong>El recargo dominical</strong> va en ${domPct}% y sigue subiendo: pasó al 90% el 1 de julio de 2026 y llega al 100% el 1 de julio de 2027, por la Ley 2466 de 2025.</li>
</ul>

<p>Julio de 2026 tuvo dos de esos cortes en el mismo mes: el día 1 subió el dominical y el 15 bajó la jornada. Una nómina de ese mes lleva números distintos en la primera quincena y en la segunda.</p>

<h2 id="ojo">Dónde se equivoca la gente</h2>

<ul>
  <li>Dividir entre 240. Ese divisor murió con la jornada de 48 horas.</li>
  <li>Pagar la hora extra nocturna con 1,35 en vez de 1,75. El recargo nocturno y la hora extra nocturna no son lo mismo.</li>
  <li>Usar el factor del dominical vigente cuando se firmó el contrato, en vez del vigente el día trabajado. El factor lo fija la fecha del turno.</li>
  <li>Contar el festivo como día ordinario. El festivo se paga igual que el domingo.</li>
</ul>

<div class="cierre-cta">
  <p><strong>Esta cuenta, hecha sola y para toda tu gente.</strong> HoraPro aplica estos mismos factores según la fecha de cada turno, sin que nadie tenga que acordarse de cuándo cambió la ley. Precio por empresa, no por empleado.</p>
  <p><a class="cta" href="/registro">Probar gratis 7 días</a></p>
</div>

<p class="cierre">Esta página se recalcula en cada publicación con las reglas vigentes. Si necesitas el detalle de la jornada, está en <a href="/blog/jornada-laboral-colombia-2026/">la jornada laboral en 2026</a>; si quieres la explicación larga con casos resueltos, está en <a href="/blog/calcular-horas-extra-recargos-colombia/">cómo calcular las horas extra y los recargos</a>.</p>
`;

  /* Sin acentos graves ni signo de dolar seguido de llave dentro de este bloque:
     va dentro de una plantilla de JavaScript y la cerraria antes de tiempo. */
  const estilos = `
.calc{border:1px solid #e6e6e6;border-radius:18px;overflow:hidden;margin:0 0 40px;background:#fff}
.calc-cab{background:#f6f6f4;padding:22px 24px;border-bottom:1px solid #e6e6e6}
.calc-cab label{display:block;font-size:13px;font-weight:700;text-transform:uppercase;
  letter-spacing:.04em;color:#898989;margin-bottom:8px}
.pesos{display:flex;align-items:center;gap:6px;background:#fff;border:1px solid #dcdcdc;
  border-radius:12px;padding:10px 14px;max-width:280px}
.pesos span{color:#898989;font-size:20px;font-weight:700}
.pesos input{border:0;outline:0;font-size:24px;font-weight:800;width:100%;color:#303030;
  font-variant-numeric:tabular-nums;background:transparent}
.calc-cab .pista{margin:12px 0 0;font-size:15px;color:#4a4a4a}
.tenue{color:#898989}
.calc-horas{padding:8px 24px}
.fila-h{display:flex;align-items:center;justify-content:space-between;gap:16px;
  padding:11px 0;border-bottom:1px solid #f0f0f0}
.fila-h:last-child{border-bottom:0}
.fila-h label{font-size:15.5px;line-height:1.4;font-weight:500;text-transform:none;
  letter-spacing:0;color:#303030;margin:0}
.fila-h .fac{color:#898989;font-size:13.5px;font-weight:600;margin-left:8px;white-space:nowrap}
.fila-h input{width:88px;flex:none;text-align:right;font-size:16px;font-weight:700;
  padding:8px 11px;border:1px solid #dcdcdc;border-radius:10px;color:#303030;
  font-variant-numeric:tabular-nums}
.fila-h input:focus{outline:2px solid #FFD85E;outline-offset:1px;border-color:#FFD85E}
.calc-total{background:#303030;color:#fff;padding:20px 24px}
.calc-total>div{display:flex;align-items:baseline;justify-content:space-between;gap:16px;flex-wrap:wrap}
.calc-total .rot{font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:#c9c9c9}
.calc-total strong{font-size:31px;font-weight:800;font-variant-numeric:tabular-nums}
.calc-total p{margin:6px 0 0;font-size:14px;color:#c9c9c9}
.calc-pie{margin:0;padding:14px 24px;font-size:13.5px;color:#898989;background:#f6f6f4;
  border-top:1px solid #e6e6e6}
.cierre-cta{background:#FFF6D9;border:1px solid #F5E3A8;border-radius:16px;padding:24px;margin:44px 0 28px}
.cierre-cta p{margin:0 0 16px;font-size:16.5px}
.cierre-cta p:last-child{margin:0}
td.num,th.num{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}
@media(max-width:560px){
  .fila-h{align-items:flex-start}
  .fila-h input{width:76px}
  .calc-total strong{font-size:26px}
}
`;

  /* Se escribe sin plantillas de texto a proposito, por la misma razon. */
  const script = `
(function () {
  var salario = document.getElementById('salario');
  var total = document.getElementById('total');
  var desglose = document.getElementById('desglose');
  var valorHora = document.getElementById('valor-hora');
  var horas = Array.prototype.slice.call(document.querySelectorAll('.fila-h input'));
  var DIVISOR = ${r.horasMes};
  if (!salario || !total) return;

  function pesos(n) { return '$' + Math.round(n).toLocaleString('es-CO'); }
  function soloDigitos(s) { return (s || '').replace(/[^0-9]/g, ''); }

  function calcular() {
    var base = parseInt(soloDigitos(salario.value), 10) || 0;
    var hora = base / DIVISOR;
    valorHora.textContent = pesos(hora);

    var suma = 0, cuantas = 0;
    horas.forEach(function (input) {
      var h = parseFloat(input.value) || 0;
      if (h <= 0) return;
      cuantas += h;
      suma += h * hora * parseFloat(input.getAttribute('data-factor'));
    });
    total.textContent = pesos(suma);
    desglose.textContent = cuantas > 0
      ? cuantas.toLocaleString('es-CO') + (cuantas === 1 ? ' hora' : ' horas') + ' sobre una hora ordinaria de ' + pesos(hora)
      : 'Escribe las horas de arriba para ver el total.';
  }

  /* El salario se reformatea con puntos de miles mientras se escribe, sin que
     el cursor se vaya al principio en cada tecla. */
  salario.addEventListener('input', function () {
    var digitos = soloDigitos(salario.value);
    var alFinal = salario.selectionStart >= salario.value.length;
    salario.value = digitos ? parseInt(digitos, 10).toLocaleString('es-CO') : '';
    if (alFinal) salario.setSelectionRange(salario.value.length, salario.value.length);
    calcular();
  });
  horas.forEach(function (i) { i.addEventListener('input', calcular); });
  calcular();
})();
`;

  return {
    slug: 'calculadora-horas-extra-recargos',
    ruta: '/calculadoras/horas-extra-recargos/',
    titulo: 'Calculadora de horas extra y recargos en Colombia',
    tituloSeo: `Calculadora de horas extra y recargos ${hoyISO.slice(0, 4)} | HoraPro`,
    descripcion: `Calcula horas extra, recargo nocturno y dominical con los factores vigentes en Colombia: jornada de ${r.jornada} horas, nocturna desde las ${nocturna.split(' a ')[0]} y dominical al ${domPct}%. Gratis y sin registro.`,
    categoria: 'Calculadora',
    subtitulo: `con la jornada de ${r.jornada} horas y el dominical al ${domPct}%`,
    secciones: [
      { id: 'calc', titulo: 'La calculadora' },
      { id: 'tabla', titulo: 'Cuánto vale cada hora' },
      { id: 'como', titulo: 'De dónde sale cada número' },
      { id: 'cambios', titulo: 'Qué cambió en 2026' },
      { id: 'ojo', titulo: 'Dónde se equivoca la gente' },
    ],
    actualizado: hoyISO,
    cuerpo,
    estilos,
    script,
    reglas: r,
  };
}
