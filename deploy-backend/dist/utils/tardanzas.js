"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DIAS_SEMANA = void 0;
exports.minutosDe = minutosDe;
exports.duracionFranjaMin = duracionFranjaMin;
exports.franjaDelDia = franjaDelDia;
exports.construirExtraConfig = construirExtraConfig;
exports.esDeParteDelDia = esDeParteDelDia;
exports.excusaLaTardanza = excusaLaTardanza;
exports.calcularTardanzas = calcularTardanzas;
exports.salidaAntesDeHora = salidaAntesDeHora;
exports.ventanaDeSalidaTemprana = ventanaDeSalidaTemprana;
exports.ventanaDeLlegadaTarde = ventanaDeLlegadaTarde;
exports.llegadaTarde = llegadaTarde;
const date_fns_tz_1 = require("date-fns-tz");
const TZ = 'America/Bogota';
exports.DIAS_SEMANA = ['DOMINGO', 'LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO'];
function minutosDe(hhmm) {
    const [h, m] = hhmm.split(':').map(Number);
    return h * 60 + m;
}
// Duración de una franja o de una ventana en minutos, contemplando que cruce
// medianoche. Vive aquí, junto a `minutosDe`, desde el 12 de septiembre de 2026:
// estaba en saldoTiempo.ts y copiada en jornada.ts, y los descansos la necesitan
// sin importar saldoTiempo, que ya importa de este módulo (CLAUDE.md §9.3).
// saldoTiempo.ts la reexporta.
function duracionFranjaMin(horaEntrada, horaSalida) {
    const ini = minutosDe(horaEntrada);
    const fin = minutosDe(horaSalida);
    return fin > ini ? fin - ini : 24 * 60 - ini + fin;
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
// ¿La novedad cubre solo un TRAMO de un día? Es la que deja el kiosco cuando
// alguien se va antes de hora: guarda desde qué hora se fue y hasta cuándo iba
// su franja. Sin horas —todas las que carga un administrador— o de varios días,
// cubre días enteros como siempre: las horas de unas vacaciones no significan nada.
function esDeParteDelDia(p) {
    return !!p.horaInicio && !!p.horaFin && claveDia(p.fechaInicio) === claveDia(p.fechaFin);
}
// ¿La novedad justifica llegar tarde ese día? Una de día completo que lo cubra,
// sí. Una de parte del día, solo si cubre la hora de entrada: la de una llegada
// tarde va desde esa hora hasta que la persona llegó. La de una salida temprana
// empieza cuando se fue y no toca la mañana; mientras se leyó como de día
// completo, aprobarla borraba la tardanza de ese día.
//
// La usan el reporte de tardanzas y el tablero del día: es la misma pregunta, y
// si cada uno la contestara a su manera volverían a no coincidir.
function excusaLaTardanza(p, dia, horaEntrada) {
    const clave = claveDia(dia);
    if (claveDia(p.fechaInicio) > clave || clave > claveDia(p.fechaFin))
        return false;
    if (!esDeParteDelDia(p))
        return true;
    const entrada = minutosDe(horaEntrada);
    return minutosDe(p.horaInicio) <= entrada && entrada < minutosDe(p.horaFin);
}
// Llegadas tarde: primera entrada de cada día contra lo que el horario exigía
// ESE día (`DiaEsperado`) más su tolerancia. No cuenta festivos, días fuera del
// horario ni días justificados por una novedad (`excusaLaTardanza`).
//
// Lee los días materializados y no el horario vigente por la misma razón que el
// saldo: adelantar la entrada de 08:00 a 07:00 llenaba de tardanzas los meses ya
// cerrados. La hora exigida y la tolerancia salen de la fila del día, así que
// también quedan congeladas.
//
// Un día sin fila no se evalúa. Quien llama completa el rango con
// `combinarDiasEsperados` para que eso no esconda tardanzas reales.
function calcularTardanzas(
// Solo la entrada de cada registro: es lo único que se lee. Exigir el `Registro`
// entero obligaba a las rutas a traer también las fotos de cada marcación.
registros, dias, festivos, permisos) {
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
        const horaEntrada = dia.horaEntrada;
        if (permisos.some(p => excusaLaTardanza(p, entrada, horaEntrada)))
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
// "HH:MM" de la hora de pared de Bogotá. Recibe `ahoraBog` igual que
// `salidaAntesDeHora`, y por eso lee los getters locales: con `toISOString` la
// hora saldría en UTC, cinco horas corrida.
function horaDePared(ahoraBog) {
    const hh = String(ahoraBog.getHours()).padStart(2, '0');
    const mm = String(ahoraBog.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
}
// Qué tramo de la jornada excusa la novedad de una salida temprana: desde la hora
// en que la persona se fue hasta el fin de su franja. Queda escrito en la novedad
// para que el saldo descuente solo eso y la tardanza de la mañana siga en pie.
function ventanaDeSalidaTemprana(ahoraBog, franja) {
    return { horaInicio: horaDePared(ahoraBog), horaFin: franja.horaSalida };
}
// Y el de una llegada tarde: desde la hora a la que tenía que entrar hasta la hora
// en que llegó. Si la aprueban justifica la tardanza (`excusaLaTardanza`), y el
// saldo excusa esos minutos si el tipo se paga.
function ventanaDeLlegadaTarde(ahoraBog, franja) {
    return { horaInicio: franja.horaEntrada, horaFin: horaDePared(ahoraBog) };
}
// ¿Llega tarde quien marca ESTA entrada? Devuelve su franja y los minutos, ya
// descontada la tolerancia, o null si no aplica. Se decide ANTES de escribir la
// entrada: el kiosco pide el motivo y no marca nada hasta tenerlo.
//
// Solo cuenta la primera entrada del día, en un día laboral de su horario. Volver
// de una pausa —almuerzo o descanso— no es llegar tarde, aunque en un turno
// nocturno el regreso caiga pasada la medianoche y sea la primera marca del día
// calendario.
function llegadaTarde(ahoraBog, ctx) {
    const { horario } = ctx;
    if (!ctx.esPrimeraEntrada || ctx.vuelveDeUnaPausa || ctx.esFestivo || !horario?.activo)
        return null;
    const franja = franjaDelDia(horario, exports.DIAS_SEMANA[ahoraBog.getDay()]);
    if (!franja)
        return null;
    const minutos = ahoraBog.getHours() * 60 + ahoraBog.getMinutes() - (minutosDe(franja.horaEntrada) + horario.toleranciaMin);
    return minutos > 0 ? { franja, minutos } : null;
}
