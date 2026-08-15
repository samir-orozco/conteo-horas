"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DIAS_SEMANA = void 0;
exports.minutosDe = minutosDe;
exports.franjaDelDia = franjaDelDia;
exports.construirExtraConfig = construirExtraConfig;
exports.calcularTardanzas = calcularTardanzas;
exports.salidaAntesDeHora = salidaAntesDeHora;
const date_fns_tz_1 = require("date-fns-tz");
const TZ = 'America/Bogota';
exports.DIAS_SEMANA = ['DOMINGO', 'LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO'];
function minutosDe(hhmm) {
    const [h, m] = hhmm.split(':').map(Number);
    return h * 60 + m;
}
// Franja del horario que aplica a un día de la semana (ej. "SABADO"), o null
// si ese día no se trabaja. Con esto un horario cubre variaciones como
// L-V 08:00-17:00 + Sáb 08:00-12:00.
// Genérico en la franja: acepta el Horario completo o un `select` acotado (solo
// necesita `franjas` con su `dias`), y devuelve la misma forma de franja recibida.
function franjaDelDia(horario, diaSemana) {
    return horario.franjas.find(f => ((f.dias ?? []).includes(diaSemana))) ?? null;
}
function claveDia(d) {
    const z = (0, date_fns_tz_1.toZonedTime)(d, TZ);
    return `${z.getFullYear()}-${String(z.getMonth() + 1).padStart(2, '0')}-${String(z.getDate()).padStart(2, '0')}`;
}
function construirExtraConfig(modo, horario, dias) {
    if (modo !== 'HORARIO' || !horario || !horario.activo)
        return { modo: 'SEMANAL' };
    const franjaPorFecha = {};
    for (const d of dias) {
        franjaPorFecha[claveDia(d.fecha)] = d.programado && d.horaEntrada && d.horaSalida
            ? { ini: minutosDe(d.horaEntrada), fin: minutosDe(d.horaSalida), toleranciaMin: d.toleranciaMin ?? 0 }
            : null;
    }
    // Respaldo para las fechas sin fila congelada, con el horario vigente. Es lo
    // que ya hace `combinarDiasEsperados` con los huecos, y lo que permite que un
    // llamador sin días —el dashboard— siga comportándose como siempre.
    const franjaPorDia = {};
    const tol = horario.toleranciaMin ?? 0;
    for (const fr of horario.franjas) {
        for (const d of (fr.dias ?? [])) {
            const idx = exports.DIAS_SEMANA.indexOf(d);
            if (idx >= 0)
                franjaPorDia[idx] = { ini: minutosDe(fr.horaEntrada), fin: minutosDe(fr.horaSalida), toleranciaMin: tol };
        }
    }
    return { modo: 'HORARIO', franjaPorFecha, franjaPorDia };
}
// Llegadas tarde: primera entrada de cada día contra lo que el horario exigía
// ESE día (`DiaEsperado`) más su tolerancia. No cuenta festivos, días fuera del
// horario ni días cubiertos por novedades.
//
// Lee los días materializados y no el horario vigente por la misma razón que el
// saldo: adelantar la entrada de 08:00 a 07:00 llenaba de tardanzas los meses ya
// cerrados. La hora exigida y la tolerancia salen de la fila del día, así que
// también quedan congeladas.
//
// Un día sin fila no se evalúa. Quien llama completa el rango con
// `combinarDiasEsperados` para que eso no esconda tardanzas reales.
function calcularTardanzas(registros, dias, festivos, permisos) {
    const festSet = new Set(festivos.map(f => claveDia(f.fecha)));
    const porDia = new Map(dias.map(d => [claveDia(d.fecha), d]));
    // Primera entrada por día calendario
    const primeraEntrada = new Map();
    for (const r of registros) {
        if (!r.entrada)
            continue;
        const clave = claveDia(r.entrada);
        const actual = primeraEntrada.get(clave);
        if (!actual || r.entrada < actual)
            primeraEntrada.set(clave, r.entrada);
    }
    const detalle = [];
    for (const [clave, entrada] of [...primeraEntrada.entries()].sort()) {
        const dia = porDia.get(clave);
        if (!dia || !dia.programado || !dia.horaEntrada)
            continue;
        if (festSet.has(clave))
            continue;
        const cubiertoPorNovedad = permisos.some(p => claveDia(p.fechaInicio) <= clave && clave <= claveDia(p.fechaFin));
        if (cubiertoPorNovedad)
            continue;
        const z = (0, date_fns_tz_1.toZonedTime)(entrada, TZ);
        const llegadaMin = z.getHours() * 60 + z.getMinutes();
        const tarde = llegadaMin - (minutosDe(dia.horaEntrada) + dia.toleranciaMin);
        if (tarde > 0) {
            detalle.push({
                fecha: clave,
                horaEsperada: dia.horaEntrada,
                horaLlegada: `${String(z.getHours()).padStart(2, '0')}:${String(z.getMinutes()).padStart(2, '0')}`,
                minutosTarde: tarde,
                toleranciaMin: dia.toleranciaMin,
            });
        }
    }
    // Tolerancia del período, para mostrarla junto al reporte. Se toma la del
    // último día del rango: es la que regía al cierre, el mismo criterio con el
    // que ya se elige la jornada vigente para el valor hora. La tolerancia vive en
    // el Horario y no en la franja, así que dentro de un mismo período casi
    // siempre es una sola; solo cambia si la editaron.
    //
    // No se exige que el día sea programado: los días de descanso también guardan
    // la tolerancia vigente, y pedirlo dejaría en 0 un rango que cae entero en
    // fin de semana, que es peor que informar la que regía.
    const toleranciaMin = dias.length
        ? dias.reduce((ult, d) => (d.fecha > ult.fecha ? d : ult)).toleranciaMin
        : 0;
    return {
        detalle,
        totalMinutos: detalle.reduce((s, t) => s + t.minutosTarde, 0),
        diasTarde: detalle.length,
        toleranciaMin,
    };
}
// ¿Marcar la salida a esta hora sería ANTES de que termine su franja?
//
// Se pregunta antes de escribir nada: salir temprano sin decir por qué era
// gratis —se guardaba la salida y después se ofrecía "Omitir"—, y con la salida
// ya registrada no había forma de volver atrás si alguien se equivocaba de botón.
//
// Normaliza la franja que cruza medianoche sumándole 24 h, y hace lo mismo con la
// hora de la marca cuando cae ya pasada la medianoche. Sin eso, quien sale a las
// 04:00 de un turno 21:00-05:00 parecía irse diecisiete horas antes de tiempo.
function salidaAntesDeHora(ahoraBog, franja, toleranciaMin) {
    const iniMin = minutosDe(franja.horaEntrada);
    let finMin = minutosDe(franja.horaSalida);
    const cruzaMedianoche = finMin <= iniMin;
    if (cruzaMedianoche)
        finMin += 1440;
    let salidaMin = ahoraBog.getHours() * 60 + ahoraBog.getMinutes();
    if (cruzaMedianoche && salidaMin < iniMin)
        salidaMin += 1440;
    return salidaMin < finMin - (toleranciaMin ?? 0);
}
