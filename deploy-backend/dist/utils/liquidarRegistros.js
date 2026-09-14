"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.almuerzoDelRegistro = almuerzoDelRegistro;
exports.cobroDePausas = cobroDePausas;
exports.liquidarRegistros = liquidarRegistros;
const date_fns_tz_1 = require("date-fns-tz");
const date_fns_1 = require("date-fns");
const horasColombiana_1 = require("./horasColombiana");
const vigencias_1 = require("./vigencias");
const tardanzas_1 = require("./tardanzas");
const ajusteJornada_1 = require("./ajusteJornada");
const almuerzo_1 = require("./almuerzo");
const descansos_1 = require("./descansos");
const jornada_1 = require("./jornada");
// El núcleo de la liquidación, que vivía dentro de routes/reportes.ts. Salió de ahí
// el 12 de septiembre de 2026 para poder probarlo sin base de datos: es lo que
// calcula la plata de /liquidacion y de /extras-resumen (CLAUDE.md 8.2).
const TZ = 'America/Bogota';
function semanaKey(fecha) {
    const z = (0, date_fns_tz_1.toZonedTime)(fecha, TZ);
    return `${(0, date_fns_1.getISOWeekYear)(z)}-W${String((0, date_fns_1.getISOWeek)(z)).padStart(2, '0')}`;
}
function claveDiaBogota(d) {
    const z = (0, date_fns_tz_1.toZonedTime)(d, TZ);
    return `${z.getFullYear()}-${z.getMonth()}-${z.getDate()}`;
}
// Minutos de almuerzo a descontar de un registro: solo si el horario tiene
// almuerzo y la franja de ESE día lo aplica (ej. el sábado corto no).
function almuerzoDelRegistro(horario, fecha) {
    if (!horario || !horario.almuerzoMin)
        return 0;
    const z = (0, date_fns_tz_1.toZonedTime)(fecha, TZ);
    const franja = (0, tardanzas_1.franjaDelDia)(horario, tardanzas_1.DIAS_SEMANA[z.getDay()]);
    return franja && franja.tieneAlmuerzo ? horario.almuerzoMin : 0;
}
// Lo que ya se cobró de UNA pausa en cada día. Cada fila pide lo que el día debe hasta
// ella menos lo ya cobrado, y lo que una fila no alcanza a pagar, porque se le acabaron
// las horas ordinarias, lo pagan las siguientes del mismo día. Lo usan la liquidación y
// el panel de inicio (routes/dashboard.ts), que tenía la misma cuenta copiada con el
// mismo defecto (12 de septiembre de 2026).
function cobroDePausas() {
    const cobrado = new Map();
    return (dia, debido, descontar) => {
        const ya = cobrado.get(dia) ?? 0;
        if (debido <= ya)
            return 0;
        const { descontado } = descontar(debido - ya);
        cobrado.set(dia, ya + descontado);
        return descontado;
    };
}
// Lo que cada fila debe de una pausa hasta ella, en minutos enteros y en orden de entrada.
// Lo acumulado se redondea hacia ARRIBA: una fila de segundos no puede quedar debiendo cero
// y regalar lo suyo, y lo que pida de más ya no lo debe la siguiente. La última debe el
// total del día, así que nada se pierde en el redondeo ni en lo que una fila no alcance a
// pagar.
function debidoHastaCadaFila(reparto, total) {
    let suma = 0;
    return reparto.map((v, i) => (i === reparto.length - 1 ? total : Math.ceil((suma += v) - 1e-9)));
}
// Núcleo del cálculo de liquidación de UN colaborador en un período: recorre sus
// registros agrupados por semana ISO (el tope de 42h/sem se resetea cada semana),
// aplica el motor de horas colombianas registro por registro, y opcionalmente
// arma el desglose día a día (para el drill-down de "Extras y recargos").
function liquidarRegistros(registros, horario, extraConfig, festivosDates, tiposHoraTodos, jornadas, salarioMensual, horasMes, incluirDetalle, 
// Días materializados del rango: de ahí sale la hora de salida programada para
// la tolerancia. Si no llegan, la tolerancia sencillamente no se aplica.
diasEsperados = []) {
    const diaPorClave = new Map(diasEsperados.map(d => [claveDiaBogota(d.fecha), d]));
    // Las pausas se miden por DÍA, el de la FECHA de la jornada: el regreso de la madrugada
    // de un nocturno es del mismo día que su salida, y contado por el día de su entrada su
    // pausa quedaba sin regreso (12 de septiembre de 2026). Cuánto cuesta cada pausa lo
    // dice la regla de utils/almuerzo.ts y utils/descansos.ts. A qué fila se le cobra, la
    // misma de la tabla de Registros (utils/jornada.ts): en proporción a lo que cada fila
    // pasó dentro de la ventana y, sin solape, a la fila de la pausa.
    //
    // Cada fila debe lo que el día acumula hasta ella, en orden de entrada, y lo que no
    // alcance a pagar lo pagan las siguientes (`cobroDePausas`). Hasta el 12 de septiembre
    // de 2026 el día entero se le cobraba a la primera fila que pudiera pagar algo: Darío,
    // con una marca de 06:50 a 07:00 creada antes que la de 07:00 a 16:00, quedaba con 50
    // minutos pagados de más.
    const debidoPorFila = new Map();
    const filasPorDia = new Map();
    for (const r of registros) {
        if (!r.entrada)
            continue;
        const k = claveDiaBogota(r.fecha);
        if (!filasPorDia.has(k))
            filasPorDia.set(k, []);
        filasPorDia.get(k).push(r);
    }
    for (const [k, filas] of filasPorDia) {
        const d = diaPorClave.get(k);
        // Las abiertas no se liquidan, pero la entrada de una puede ser el regreso de una
        // pausa: sin ella, quien volvió de su descanso y sigue en su turno quedaba como si no
        // hubiera vuelto, y se le cobraba el descanso entero. La tabla sí las mira.
        const abiertas = filas.filter(r => !r.salida);
        const delDia = filas.filter(r => r.salida).sort((a, b) => a.entrada.getTime() - b.entrada.getTime());
        if (delDia.length === 0)
            continue;
        // Los tramos van YA AJUSTADOS por la tolerancia de salida, igual que los que entran
        // al motor de horas más abajo. Con los crudos, quien sale 12:10 teniendo salida
        // programada a las 12:00 y tolerancia de 15 pagaría pausa sobre minutos que la
        // liquidación ya recortó.
        const tramos = delDia.map(r => (d ? (0, ajusteJornada_1.ajustarAJornada)(r.entrada, r.salida, d) : { entrada: r.entrada, salida: r.salida }));
        const marcas = [...delDia.map((r, i) => ({ ...r, entrada: tramos[i].entrada, salida: tramos[i].salida })), ...abiertas];
        const duraciones = tramos.map(t => Math.max(0, (t.salida.getTime() - t.entrada.getTime()) / 60000));
        const filaDe = (pausa) => Math.max(0, delDia.findIndex(r => r[pausa]));
        // Sin fila del día no hay ventana ni descansos: el almuerzo es el del horario vigente,
        // igual que antes de existir `DiaEsperado`.
        const almuerzo = (0, almuerzo_1.minutosAlmuerzoADescontar)(marcas, d ?? { almuerzoMin: almuerzoDelRegistro(horario, delDia[0].fecha) });
        const quitaAlmuerzo = (0, jornada_1.cobrarHastaDondeAlcance)((0, jornada_1.cobroPorJornada)(almuerzo, tramos.map(t => (d ? (0, almuerzo_1.minutosEnLaVentana)([t], (0, almuerzo_1.ventanaDeAlmuerzo)(d)) : null)), filaDe('salidaAlmuerzo')), duraciones, filaDe('salidaAlmuerzo'));
        const descanso = d ? (0, descansos_1.minutosDescansoADescontar)(marcas, d) : 0;
        const ventanas = d ? (0, descansos_1.leerDescansos)(d.descansos) : [];
        const quitaDescanso = (0, jornada_1.cobrarHastaDondeAlcance)((0, jornada_1.cobroPorJornada)(descanso, tramos.map(t => (d ? (0, descansos_1.minutosEnLasVentanas)([t], d.fecha, ventanas) : 0)), filaDe('salidaDescanso')), duraciones.map((m, i) => m - quitaAlmuerzo[i]), filaDe('salidaDescanso'));
        const almuerzoHasta = debidoHastaCadaFila(quitaAlmuerzo, almuerzo);
        const descansoHasta = debidoHastaCadaFila(quitaDescanso, descanso);
        delDia.forEach((r, i) => debidoPorFila.set(r.id, { almuerzo: almuerzoHasta[i], descanso: descansoHasta[i] }));
    }
    // En orden de entrada dentro de cada fecha. La base no garantiza ningún orden entre las
    // filas de un mismo día, y de ese orden dependen la fila a la que se le cobra cada pausa
    // y el acumulado de la semana con el que se clasifican las horas. Entre fechas distintas
    // queda el orden por fecha de la consulta: la jornada de la semana sale de la primera.
    const enOrden = [...registros].sort((a, b) => claveDiaBogota(a.fecha) !== claveDiaBogota(b.fecha)
        ? a.fecha.getTime() - b.fecha.getTime()
        : (a.entrada?.getTime() ?? Number.MAX_SAFE_INTEGER) - (b.entrada?.getTime() ?? Number.MAX_SAFE_INTEGER));
    const porSemana = new Map();
    for (const reg of enOrden) {
        const key = semanaKey(reg.fecha);
        if (!porSemana.has(key))
            porSemana.set(key, []);
        porSemana.get(key).push(reg);
    }
    const acumulado = {};
    const cobrarAlmuerzo = cobroDePausas();
    const cobrarDescanso = cobroDePausas();
    const detalleRegistros = [];
    for (const [, regsDeUnaSemana] of porSemana) {
        const jornadaSemanal = (0, vigencias_1.jornadaVigente)(regsDeUnaSemana[0].fecha, jornadas);
        let minutosOrdSemana = 0;
        for (const registro of regsDeUnaSemana) {
            if (!registro.entrada || !registro.salida)
                continue;
            const claveDia = claveDiaBogota(registro.fecha);
            // Tolerancia de jornada: los minutos sueltos que alguien trabaja fuera de
            // su horario sin orden previa no se pagan como extra. Se aplica ANTES del
            // motor de horas para que la clasificación (ordinaria/extra/nocturna) se
            // haga sobre la jornada ya ajustada.
            const diaDelRegistro = diaPorClave.get(claveDia);
            const { entrada, salida } = diaDelRegistro
                ? (0, ajusteJornada_1.ajustarAJornada)(registro.entrada, registro.salida, diaDelRegistro)
                : { entrada: registro.entrada, salida: registro.salida };
            const tiposDelDia = (0, vigencias_1.tiposVigentes)(registro.fecha, tiposHoraTodos);
            const { resultado, minutosOrdinariosTrabajados } = (0, horasColombiana_1.calcularHorasTrabajadas)(entrada, salida, festivosDates, tiposDelDia, jornadaSemanal, minutosOrdSemana, extraConfig);
            // Lo que esta fila debe de cada pausa, hasta ella (arriba). El almuerzo de un día sin
            // ventana sale solo de las diurnas ordinarias, como siempre; el de uno con ventana y
            // los descansos, de todas las ordinarias.
            const conVentana = !!diaDelRegistro?.almuerzoInicio && !!diaDelRegistro?.almuerzoFin;
            const debido = debidoPorFila.get(registro.id);
            const almuerzoCobrado = cobrarAlmuerzo(claveDia, debido?.almuerzo ?? 0, m => (conVentana
                ? (0, horasColombiana_1.descontarAlmuerzoOrdinarias)(resultado, m)
                : (0, horasColombiana_1.descontarAlmuerzo)(resultado, m)));
            const descansoCobrado = cobrarDescanso(claveDia, debido?.descanso ?? 0, m => (0, horasColombiana_1.descontarAlmuerzoOrdinarias)(resultado, m));
            const ordDelRegistro = Math.max(0, minutosOrdinariosTrabajados - almuerzoCobrado - descansoCobrado);
            minutosOrdSemana += ordDelRegistro;
            if (incluirDetalle) {
                // Solo lo que genera pago adicional (excluye HOD, que ya está en el salario)
                const filas = (0, horasColombiana_1.calcularLiquidacion)(salarioMensual, horasMes, resultado)
                    .filter(l => l.codigo !== 'HOD' && l.horas > 0)
                    .map(l => ({ codigo: l.codigo, nombre: l.nombre, horas: l.horas, subtotal: l.subtotal }));
                if (filas.length > 0) {
                    detalleRegistros.push({ id: registro.id, fecha: registro.fecha, entrada: registro.entrada, salida: registro.salida, filas });
                }
            }
            for (const p of resultado) {
                if (!acumulado[p.codigo])
                    acumulado[p.codigo] = { ...p };
                else
                    acumulado[p.codigo].minutos += p.minutos;
            }
        }
    }
    const horasPorTipo = Object.values(acumulado);
    const liquidacion = (0, horasColombiana_1.calcularLiquidacion)(salarioMensual, horasMes, horasPorTipo);
    const totalAdicional = liquidacion.reduce((s, l) => s + l.subtotal, 0);
    const totalRecargos = liquidacion.filter(l => !l.esExtra).reduce((s, l) => s + l.subtotal, 0);
    const totalExtra = liquidacion.filter(l => l.esExtra).reduce((s, l) => s + l.subtotal, 0);
    // Minutos ORDINARIOS del período (ya netos de almuerzo), para comparar contra
    // las horas que el horario exigía. Se suman los códigos no extra del acumulado
    // —no el contador semanal interno— porque ese excluye domingos y festivos, y
    // aquí sí queremos contarlos: si alguien trabajó un domingo, ese tiempo lo
    // trabajó. Las extra quedan fuera a propósito: se pagan aparte con su recargo.
    //
    // Se toman los MINUTOS crudos, no las horas de `liquidacion`: esas vienen
    // redondeadas a 2 decimales y al multiplicarlas por 60 reaparecen colas de
    // coma flotante (167.33h → 10039.8 min en vez de 10040).
    const minutosOrdinarios = horasPorTipo
        .filter(t => !horasColombiana_1.CODIGOS_EXTRA.has(t.codigo))
        .reduce((s, t) => s + t.minutos, 0);
    // Las abiertas viajan solo para medir las pausas: el conteo sigue siendo el de las cerradas.
    const registrosCont = registros.filter(r => r.salida).length;
    return { liquidacion, totalRecargos, totalExtra, totalAdicional, registrosCont, detalleRegistros, minutosOrdinarios };
}
