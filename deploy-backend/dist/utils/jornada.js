"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GRACIA_MIN = void 0;
exports.marcasParaDescontar = marcasParaDescontar;
exports.resumirAlmuerzoDelDia = resumirAlmuerzoDelDia;
exports.resumirDescansosDelDia = resumirDescansosDelDia;
exports.tramoQueChoca = tramoQueChoca;
exports.leerPausaDelCuerpo = leerPausaDelCuerpo;
exports.leerDescansosDelCuerpo = leerDescansosDelCuerpo;
exports.instantesDeJornada = instantesDeJornada;
exports.tramosDeLaJornada = tramosDeLaJornada;
exports.marcacionQueCierra = marcacionQueCierra;
exports.laCerroElSistema = laCerroElSistema;
exports.agruparEnJornadas = agruparEnJornadas;
exports.momentosDelDia = momentosDelDia;
exports.jornadaDeCadaMarcacion = jornadaDeCadaMarcacion;
exports.sedesDeLaJornada = sedesDeLaJornada;
exports.salidasTrasEditar = salidasTrasEditar;
exports.cobroPorJornada = cobroPorJornada;
exports.cobrarHastaDondeAlcance = cobrarHastaDondeAlcance;
exports.partirDiaEnJornadas = partirDiaEnJornadas;
exports.minutosContadosDelDia = minutosContadosDelDia;
const almuerzo_1 = require("./almuerzo");
const ajusteJornada_1 = require("./ajusteJornada");
const tardanzas_1 = require("./tardanzas");
const descansos_1 = require("./descansos");
// Qué pasó con una pausa de UN día: el almuerzo o el descanso no remunerado.
//
// La pausa no vive en un registro: vive en el HUECO entre dos. Un día con
// almuerzo son dos tramos —08:00-12:00 y 13:00-17:00— y lo que hay en medio es
// el almuerzo. Con descanso y almuerzo son tres tramos y dos huecos. Esta
// función lee cada hueco.
//
// Existe para que la columna de Registros, el modal de detalle y el reporte
// cuenten la MISMA historia. Si cada pantalla dedujera las pausas por su cuenta,
// tarde o temprano dirían cosas distintas del mismo día, y el administrador no
// tendría forma de saber cuál creer.
//
// Distingue a propósito dos números que es fácil confundir:
//  - `minutos`: lo que la persona se tomó de verdad (lo que se ve).
//  - `minutosDescontados`: lo que esa pausa le cuesta al día (lo que se paga).
// No son lo mismo. Quien almuerza en 20 minutos se tomó 20, y su almuerzo le cuesta
// igual los 60 fijados: los otros 40 se descuentan de lo trabajado (12 de septiembre
// de 2026).
const MS_MIN = 60000;
const UN_DIA_MS = 24 * 60 * 60 * 1000;
// A qué pausa salió esta marcación, o null si su salida no fue a ninguna. Es LA
// pregunta de la que salen la agrupación en filas, la columna de Salida y los
// rótulos, así que vive en un solo sitio: si cada una la contestara por su
// cuenta, un descanso partiría el día en una pantalla y no en la otra.
function pausaDeLaSalida(r) {
    if (!r.salida)
        return null;
    if (r.salidaAlmuerzo)
        return 'ALMUERZO';
    if (r.salidaDescanso)
        return 'DESCANSO';
    return null;
}
// Los tramos que de verdad se pueden contar: abiertos, cerrados, y en ese orden.
//
// Una salida ANTERIOR a su entrada no es un tramo raro, es un imposible, y
// contarla resta horas que nadie dejó de trabajar. Aparece de verdad: el
// formulario de edición arma la entrada y la salida sobre la misma fecha, así
// que corregir a mano un turno nocturno deja guardada una salida del día
// anterior. Se ignora en vez de restarla.
function tramosUtiles(registros) {
    return registros.filter(r => r.entrada && r.salida && r.salida.getTime() > r.entrada.getTime());
}
// Cuánto se espera después del fin de la pausa antes de tratarla como olvido.
// Generoso a propósito: quien vuelve veinte minutos tarde y marca bien no
// debería tener que responder nada. Vive aquí, junto al resumen de la pausa,
// porque las dos preguntas son la misma y `cierreAlmuerzo` la reutiliza.
exports.GRACIA_MIN = 60;
function resumirPausa(registros, pausa, ventana, minutosDescontados, ahora) {
    const conVentana = !!ventana.inicio && !!ventana.fin;
    const base = {
        estado: conVentana ? 'NO_MARCADO' : 'SIN_VENTANA',
        ventana: conVentana ? { inicio: ventana.inicio, fin: ventana.fin } : null,
        salida: null, regreso: null, minutos: null,
        minutosVentana: conVentana ? (0, tardanzas_1.duracionFranjaMin)(ventana.inicio, ventana.fin) : null,
        minutosDescontados, regresoEstimado: false, seExcedio: false, minutosDeMas: 0,
    };
    if (!conVentana)
        return base;
    // Ordenar por entrada: los registros pueden llegar en cualquier orden y el
    // "regreso" es el primer tramo POSTERIOR a la salida, no cualquiera.
    const enOrden = [...registros]
        .filter(r => r.entrada)
        .sort((a, b) => a.entrada.getTime() - b.entrada.getTime());
    const salidaALaPausa = enOrden.find(r => pausaDeLaSalida(r) === pausa);
    if (!salidaALaPausa)
        return base;
    const salida = salidaALaPausa.salida;
    return resumirSalida(base, enOrden, salida, (0, almuerzo_1.finDeLaVentanaDe)(salida, ventana), ahora);
}
// Lo que pasó con UNA salida a una pausa: si volvió, cuándo y cuánto se pasó; si no,
// si todavía está en su pausa o ya se le olvidó. `regresoEsperado` es la hora a la
// que le tocaba volver: el fin de la ventana del almuerzo, o la del descanso anotado
// (`regresoEsperadoDelDescanso`). Null cuando la salida no tiene ventana: ahí no se
// sabe cuánto se pasó, y no se inventa.
function resumirSalida(base, enOrden, salida, regresoEsperado, ahora) {
    const regresoReg = enOrden.find(r => r.entrada.getTime() > salida.getTime());
    if (!regresoReg) {
        // Salió y todavía no vuelve. Mientras su ventana siga abierta —más una hora
        // de gracia— está EN SU PAUSA, que es lo normal y lo que se espera. Llamar
        // "sin regreso" a eso acusa a alguien de algo que no ha pasado, y lo pinta
        // en rojo mientras está comiendo.
        const seLePaso = ahora.getTime() > (regresoEsperado ?? salida.getTime()) + exports.GRACIA_MIN * MS_MIN;
        return { ...base, estado: seLePaso ? 'ABIERTO' : 'EN_CURSO', salida };
    }
    const regreso = regresoReg.entrada;
    const minutos = Math.round((regreso.getTime() - salida.getTime()) / MS_MIN);
    const minutosDeMas = regresoEsperado === null ? 0 : Math.max(0, Math.round((regreso.getTime() - regresoEsperado) / MS_MIN));
    return {
        ...base,
        estado: 'MARCADO',
        salida, regreso, minutos,
        regresoEstimado: regresoReg.entradaEstimada,
        seExcedio: minutosDeMas > 0,
        minutosDeMas,
    };
}
// Las marcaciones del día como las mide el descuento de las pausas: los tramos
// terminados con la tolerancia de salida ya aplicada, igual que el motor de horas, y
// los abiertos tal cual, porque la entrada de uno abierto puede ser el regreso de una
// pausa. La usa también la liquidación (utils/liquidarRegistros.ts).
function marcasParaDescontar(registros, dia) {
    return registros.map(r => (r.entrada && r.salida && r.salida.getTime() > r.entrada.getTime()
        ? { ...r, ...(0, ajusteJornada_1.ajustarAJornada)(r.entrada, r.salida, dia) }
        : r));
}
function resumirAlmuerzoDelDia(registros, dia, ahora = new Date()) {
    // Un día sin ningún tramo cerrado no ha pagado nada, así que tampoco ha descontado
    // nada: `minutosAlmuerzoADescontar` lo mira por su cuenta.
    return resumirPausa(registros, 'ALMUERZO', (0, almuerzo_1.ventanaDeAlmuerzo)(dia), (0, almuerzo_1.minutosAlmuerzoADescontar)(registros, dia), ahora);
}
function resumenesDeDescanso(registros, dia, ahora) {
    const ventanas = (0, descansos_1.ventanasEnOrden)(dia.horaEntrada, (0, descansos_1.leerDescansos)(dia.descansos));
    const enOrden = [...registros]
        .filter(r => r.entrada)
        .sort((a, b) => a.entrada.getTime() - b.entrada.getTime());
    const salidas = enOrden.filter(r => pausaDeLaSalida(r) === 'DESCANSO');
    const asignadas = (0, descansos_1.ventanasDeLasSalidas)(dia, salidas.map(r => ({ salida: r.salida, descansoVentana: r.descansoVentana ?? null })));
    const descontados = (0, descansos_1.descuentoDeCadaDescanso)(registros, dia);
    const vacio = {
        estado: 'NO_MARCADO', ventana: null, salida: null, regreso: null, minutos: null,
        minutosVentana: null, minutosDescontados: 0, regresoEstimado: false, seExcedio: false, minutosDeMas: 0,
    };
    const resumenes = ventanas.map((v, k) => {
        const base = {
            ...vacio,
            ventana: { inicio: v.inicio, fin: v.fin },
            minutosVentana: (0, tardanzas_1.duracionFranjaMin)(v.inicio, v.fin),
            minutosDescontados: descontados[k],
        };
        const i = asignadas.findIndex(a => a !== null && (0, descansos_1.claveDeVentana)(a) === (0, descansos_1.claveDeVentana)(v));
        if (i < 0)
            return { resumen: base, marcacion: null };
        const salida = salidas[i].salida;
        const esperado = (0, descansos_1.regresoEsperadoDelDescanso)(salida, dia.fecha, v).getTime();
        return { resumen: resumirSalida(base, enOrden, salida, esperado, ahora), marcacion: salidas[i] };
    });
    salidas.forEach((m, i) => {
        if (asignadas[i])
            return;
        resumenes.push({ resumen: resumirSalida(vacio, enOrden, m.salida, null, ahora), marcacion: m });
    });
    return resumenes;
}
function resumirDescansosDelDia(registros, dia, ahora = new Date()) {
    return resumenesDeDescanso(registros, dia, ahora).map(r => r.resumen);
}
// ¿Este tramo pisa a alguno de los otros del mismo día?
//
// Nadie está en dos turnos a la vez, así que dos tramos solapados son siempre un
// error. Aparecía al editar: quien corregía la salida de la mañana para ponerle
// la hora real de la tarde se tragaba entero el tramo del regreso del descanso, y
// el día volvía a partirse en dos filas —una de ellas imposible— sin que nada
// avisara.
//
// Tocarse en un extremo NO es pisarse: volver de una pausa exactamente a la hora
// en que se salió es lo normal, así que la comparación es estricta.
function tramoQueChoca(nuevo, otros) {
    // Un tramo abierto todavía no dice dónde termina: no hay nada que juzgar.
    if (!nuevo.entrada || !nuevo.salida)
        return null;
    const ini = nuevo.entrada.getTime();
    const fin = nuevo.salida.getTime();
    return otros.find(o => o.entrada && o.salida && ini < o.salida.getTime() && fin > o.entrada.getTime()) ?? null;
}
// Una pausa como llega del editor: a qué hora salió y, si ya volvió, a qué hora
// regresó. Lo que no es texto no es una hora. Vivía suelta en la ruta.
function leerPausaDelCuerpo(p) {
    const o = (p && typeof p === 'object' ? p : {});
    return {
        salida: typeof o.salida === 'string' && o.salida ? o.salida : undefined,
        regreso: typeof o.regreso === 'string' && o.regreso ? o.regreso : undefined,
    };
}
// Los descansos que manda el editor en `descansos` (12 de septiembre de 2026). Lo que
// no es una lista es «sin descansos», y una fila vacía se ignora: el formulario deja
// filas sin llenar. Un regreso sin su salida, o más descansos de los que caben en una
// franja, se rechazan diciendo qué pasa, antes de tocar la base.
//
// «Descanso N» es la POSICIÓN en que llegó la fila, contando las vacías: el editor manda
// todas sus filas y la pantalla las numera así. Contado después de quitar las vacías, el
// mensaje nombraba otra fila (12 de septiembre de 2026).
function leerDescansosDelCuerpo(valor) {
    const filas = (Array.isArray(valor) ? valor : [])
        .map((p, i) => ({ ...leerPausaDelCuerpo(p), n: i + 1 }))
        .filter(p => p.salida || p.regreso);
    const sinSalida = filas.find(p => !p.salida);
    if (sinSalida) {
        return { error: `Para registrar el regreso del descanso ${sinSalida.n} hace falta la hora en que salió.` };
    }
    if (filas.length > descansos_1.MAX_DESCANSOS_POR_FRANJA) {
        return { error: `Una jornada puede tener hasta ${descansos_1.MAX_DESCANSOS_POR_FRANJA} descansos.`, codigo: 'DEMASIADOS_DESCANSOS' };
    }
    return { descansos: filas.map(p => ({ salida: p.salida, regreso: p.regreso })) };
}
function instantesDeJornada(fecha, // medianoche de Bogotá
horas) {
    const enElDia = (hhmm) => new Date(fecha.getTime() + (0, tardanzas_1.minutosDe)(hhmm) * MS_MIN);
    const entrada = enElDia(horas.entrada);
    let tope = entrada.getTime();
    // `permiteIgual` para la pausa instantánea; para el resto, seguir en la misma
    // hora significaría no haber avanzado, y eso es el día siguiente.
    const siguiente = (hhmm, permiteIgual = false) => {
        if (!hhmm)
            return null;
        let t = enElDia(hhmm).getTime();
        while (permiteIgual ? t < tope : t <= tope)
            t += UN_DIA_MS;
        tope = t;
        return new Date(t);
    };
    const desdeLaEntrada = (hhmm) => (0, descansos_1.minutosDesdeLaEntrada)(horas.entrada, hhmm);
    const pedidas = [];
    if (horas.almuerzo?.salida)
        pedidas.push({ tipo: 'ALMUERZO', horas: horas.almuerzo });
    for (const d of horas.descansos ?? [])
        if (d.salida)
            pedidas.push({ tipo: 'DESCANSO', horas: d });
    pedidas.sort((a, b) => desdeLaEntrada(a.horas.salida) - desdeLaEntrada(b.horas.salida));
    const pausas = pedidas.map(p => {
        const salida = siguiente(p.horas.salida);
        const regreso = siguiente(p.horas.regreso, true);
        return { tipo: p.tipo, salida, regreso };
    });
    const salida = siguiente(horas.salida);
    return { entrada, pausas, salida };
}
const DE_LA_PAUSA = { ALMUERZO: 'del almuerzo', DESCANSO: 'del descanso' };
const NO_CABE_EN_UN_DIA = 'La jornada no cabe en un día: revisa que las pausas no se crucen y que la salida sea posterior a la entrada';
function tramosDeLaJornada(t) {
    // Una hora que no avanza pasa al día siguiente (`instantesDeJornada`). Así cabe un
    // nocturno, pero así también rodaba a mañana una pausa que se cruzaba con otra, y la
    // jornada quedaba de 33 horas sin que nada avisara. Nada que dure un día entero es
    // una jornada: se rechaza (12 de septiembre de 2026). Va antes que lo demás, porque
    // una pausa rodada pasaría como «la última pausa, todavía sin regreso».
    //
    // Cambio de comportamiento, a propósito: una jornada sin pausas con la salida a la
    // misma hora de la entrada pasaba como 24 horas, y tampoco es creíble.
    const instantes = [t.entrada, ...t.pausas.flatMap(p => [p.salida, p.regreso]), t.salida]
        .filter((d) => d !== null)
        .map(d => d.getTime());
    if (Math.max(...instantes) - t.entrada.getTime() >= UN_DIA_MS)
        return { error: NO_CABE_EN_UN_DIA };
    const tramos = [];
    let inicio = t.entrada;
    for (let i = 0; i < t.pausas.length; i++) {
        const p = t.pausas[i];
        tramos.push({ entrada: inicio, salida: p.salida, fin: p.tipo });
        if (p.regreso) {
            inicio = p.regreso;
            continue;
        }
        // Salió a una pausa y no volvió: la jornada termina ahí. Cualquier cosa
        // escrita después describe algo que no pudo pasar.
        if (i < t.pausas.length - 1) {
            return { error: `Si no volvió ${DE_LA_PAUSA[p.tipo]}, no puede haber otra pausa después. Pon primero la hora del regreso` };
        }
        if (t.salida) {
            return { error: `Si no volvió ${DE_LA_PAUSA[p.tipo]}, la jornada no puede tener hora de salida. Pon primero la hora del regreso` };
        }
        return { tramos };
    }
    tramos.push({ entrada: inicio, salida: t.salida, fin: t.salida ? 'SALIDA' : null });
    return { tramos };
}
// La marcación que CIERRA la jornada, o null si todavía está abierta.
//
// Una salida a una pausa —almuerzo o descanso— NO la cierra. La persona no se
// fue: sigue en su turno, solo que ahora está en su pausa. Tomarla como fin de
// jornada ponía la hora de la pausa en la columna de Salida —diciendo que se
// había ido a casa— y dejaba la duración del día en cero.
function marcacionQueCierra(marcaciones) {
    const ultima = [...marcaciones].reverse().find(m => m.salida);
    if (!ultima || pausaDeLaSalida(ultima))
        return null;
    // Si después de esa salida alguien volvió a entrar y sigue dentro, tampoco.
    const vueltaDespues = marcaciones.some(m => m.entrada && !m.salida
        && m.entrada.getTime() >= ultima.salida.getTime());
    return vueltaDespues ? null : ultima;
}
// Si el auto-cierre tocó esta jornada.
//
// No basta con mirar la marcación que la cierra: cuando el barrido no encuentra
// la franja del colaborador (sin horario, horario inactivo, o un día que ninguna
// franja cubre) marca `salidaEstimada` y deja la hora en null a propósito, para
// que la ponga el admin. En esa jornada NINGUNA marcación tiene salida, así que
// `marcacionQueCierra` devuelve null y la marca se perdía: la tabla de Registros
// pintaba la fila igual que un turno que nadie tocó, mientras el detalle del
// mismo registro decía "El sistema cerró este turno".
function laCerroElSistema(marcaciones) {
    const cierra = marcacionQueCierra(marcaciones);
    return cierra ? cierra.salidaEstimada : marcaciones.some(m => m.salidaEstimada);
}
// Las marcaciones ordenadas por hora de entrada. La base no garantiza ningún
// orden y toda la agrupación depende de quién sigue a quién. Las que no tienen
// entrada —cargadas a mano, incompletas— van al final: no hay forma de
// encadenarlas.
function enOrdenDeEntrada(registros) {
    return [...registros].sort((a, b) => {
        if (!a.entrada)
            return 1;
        if (!b.entrada)
            return -1;
        return a.entrada.getTime() - b.entrada.getTime();
    });
}
// Agrupa las marcaciones de un día en jornadas. Un tramo se funde con el
// siguiente SOLO si cerró saliendo a una pausa.
//
// Se exige además que el siguiente empiece después de que el anterior cerró: dos
// tramos solapados son datos rotos de una edición a mano, y encadenarlos daría
// una jornada cuya salida es anterior a su propia entrada.
//
// Espera las marcaciones YA ordenadas por entrada.
function agruparEnJornadas(enOrden) {
    const bloques = [];
    for (const r of enOrden) {
        const actual = bloques[bloques.length - 1];
        const ultimo = actual?.[actual.length - 1];
        const sigue = !!ultimo && !!pausaDeLaSalida(ultimo) && !!r.entrada
            && r.entrada.getTime() >= ultimo.salida.getTime();
        if (sigue)
            actual.push(r);
        else
            bloques.push([r]);
    }
    return bloques;
}
// Un rótulo por pausa, con el tipo exhaustivo: una tercera pausa no compila
// hasta que alguien decida cómo se llaman su salida y su regreso.
const SALIDA_A = { ALMUERZO: 'SALIDA_ALMUERZO', DESCANSO: 'SALIDA_DESCANSO' };
const REGRESO_DE = { ALMUERZO: 'REGRESO_ALMUERZO', DESCANSO: 'REGRESO_DESCANSO' };
function momentosDelDia(registros) {
    const momentos = new Map();
    for (const jornada of agruparEnJornadas(enOrdenDeEntrada(registros))) {
        jornada.forEach((m, i) => {
            // Dentro de una jornada, la marcación anterior siempre cerró saliendo a
            // una pausa: es lo que las fundió. Su pausa dice de dónde vuelve esta.
            const vuelveDe = i > 0 ? pausaDeLaSalida(jornada[i - 1]) : null;
            const saleA = pausaDeLaSalida(m);
            momentos.set(m.id, {
                entrada: !m.entrada ? null : vuelveDe ? REGRESO_DE[vuelveDe] : 'ENTRADA',
                // Una salida a una pausa no cierra la jornada ni siquiera cuando es la
                // última marca del día: la persona no se fue a su casa, simplemente no
                // volvió a marcar. Es la misma regla de `marcacionQueCierra`, y las dos
                // no pueden decir cosas distintas del mismo registro.
                salida: !m.salida ? null : saleA ? SALIDA_A[saleA] : 'SALIDA',
            });
        });
    }
    return momentos;
}
// A qué turno del día pertenece cada marcación, contando desde 0.
//
// Lo usa la pantalla de fotos del día para poner un título encima de cada
// turno. Se arma con la MISMA agrupación que `momentosDelDia` y no con una regla
// propia: si las dos agruparan distinto, la foto del regreso del descanso podría
// caer bajo el título de un turno nuevo. Hay una prueba que las amarra.
function jornadaDeCadaMarcacion(registros) {
    const turnos = new Map();
    agruparEnJornadas(enOrdenDeEntrada(registros)).forEach((jornada, i) => {
        for (const m of jornada)
            turnos.set(m.id, i);
    });
    return turnos;
}
// Dónde se abrió y dónde se cerró la JORNADA que contiene a una marcación.
//
// El detalle se abre desde la fila con el id de UNA marcación y pintaba la sede
// de salida de esa marcación suelta. En una jornada con almuerzo esa salida es la
// del descanso: decía «Cerró en Laureles» de quien salió a almorzar allí y cerró
// en El Poblado, contradiciendo a la tabla. Esta es la regla de la tabla (la sede
// de la primera marcación y la de salida de `marcacionQueCierra`), sobre la misma
// agrupación que `momentosDelDia`.
function sedesDeLaJornada(registros, id) {
    const jornada = agruparEnJornadas(enOrdenDeEntrada(registros)).find(j => j.some(m => m.id === id));
    if (!jornada)
        return { abrio: null, cerro: null };
    return { abrio: jornada[0].sede, cerro: marcacionQueCierra(jornada)?.sedeSalida ?? null };
}
const SIN_SALIDA = { sedeSalidaId: null, fotoSalida: null, metodoSalida: null, distanciaSalida: null, descansoVentana: null };
const mismoMinuto = (a, b) => Math.floor(a.getTime() / MS_MIN) === Math.floor(b.getTime() / MS_MIN);
// Una fila termina en una pausa si no termina en la salida del día ni sigue
// abierta. Así una pausa nueva cuenta como pausa sin tocar esto, y los `Record`
// de rótulos no compilan hasta que alguien le ponga nombre.
const esPausa = (fin) => fin !== null && fin !== 'SALIDA';
function salidasDeAntes(antes) {
    const ultima = antes[antes.length - 1];
    return {
        ALMUERZO: antes.find(m => pausaDeLaSalida(m) === 'ALMUERZO') ?? null,
        DESCANSOS: antes.filter(m => pausaDeLaSalida(m) === 'DESCANSO'),
        CIERRE: marcacionQueCierra(antes) ?? (ultima && !ultima.salida ? ultima : null),
    };
}
// El papel de la salida con que termina cada fila que queda.
function papelDeLaFila(fin) {
    switch (fin) {
        case 'DESCANSO': return 'DESCANSO';
        case 'ALMUERZO': return 'ALMUERZO';
        case 'SALIDA':
        case null: return 'CIERRE';
    }
}
// De qué salida de antes hereda cada fila (12 de septiembre de 2026):
//
//   1. La que quedó en el MISMO MINUTO de una salida marcada de antes se queda con esa
//      salida, tenga el papel que tenga ahora: cambiarle el papel a una marca no la vuelve
//      otra. Primero las del mismo papel. Una salida que puso el sistema
//      (`salidaEstimada`) no es la marca de nadie, y esa sigue a su papel.
//   2. Los descansos que quedan se emparejan por la hora con las salidas al descanso que
//      nadie se llevó (`emparejarSalidasDeDescanso`).
//   3. El almuerzo hereda la salida a almorzar y la salida del día la del día (una fila
//      abierta también es su sitio, solo que aún no la tiene), si nadie se las llevó.
//
// Con el papel por delante del minuto, corregir solo cuál pausa fue cuál sin mover sus
// horas (quien oprimió «almorzar» a las 09:00 por error y «descanso» a las 12:00) le
// dejaba a cada una la foto y la sede de la otra, y la foto de una salida de las 17:00
// que pasaba a ser almuerzo aparecía en una salida de las 20:00 que nadie marcó.
function huecosQueQuedan(filas, antes) {
    const de = salidasDeAntes(antes);
    const fuente = filas.map(() => null);
    const tomadas = new Set();
    const tomar = (k, m) => {
        fuente[k] = m;
        tomadas.add(m);
    };
    const marcadas = antes.filter(m => m.salida && !m.salidaEstimada);
    for (const delMismoPapel of [true, false]) {
        filas.forEach((f, k) => {
            if (fuente[k] || !f.salida)
                return;
            const misma = marcadas.find(m => !tomadas.has(m) && mismoMinuto(m.salida, f.salida)
                && (!delMismoPapel || (pausaDeLaSalida(m) ?? 'CIERRE') === papelDeLaFila(f.fin)));
            if (misma)
                tomar(k, misma);
        });
    }
    const deDescanso = filas.flatMap((f, k) => (f.fin === 'DESCANSO' && f.salida && !fuente[k] ? [k] : []));
    const libres = de.DESCANSOS.filter(m => !tomadas.has(m));
    (0, descansos_1.emparejarSalidasDeDescanso)(deDescanso.map(k => filas[k].salida), libres.map(m => m.salida))
        .forEach((j, i) => { if (j !== null)
        tomar(deDescanso[i], libres[j]); });
    const porSuPapel = { DESCANSO: null, ALMUERZO: de.ALMUERZO, CIERRE: de.CIERRE };
    return filas.map((f, k) => {
        const papel = papelDeLaFila(f.fin);
        const suya = porSuPapel[papel];
        return { papel, hora: f.salida, fuente: fuente[k] ?? (suya && !tomadas.has(suya) ? suya : null) };
    });
}
// Qué fue la entrada de cada marcación de antes: la del día, o el regreso de la
// pausa en que terminó la anterior.
function entradaDe(antes, i) {
    const vuelveDe = i > 0 ? pausaDeLaSalida(antes[i - 1]) : null;
    return vuelveDe ? REGRESO_DE[vuelveDe] : 'ENTRADA';
}
// Qué marcación de antes se reescribe con cada fila. Se elige por su ENTRADA y no
// por su posición: la foto de la entrada, su sede y cómo se marcó son de la fila,
// y al quitar el descanso de una jornada de tres, reescribir por posición le
// pegaba la foto del regreso de las 09:15 a la entrada de las 13:00.
//
// La primera fila es siempre la primera marcación, que nunca se borra. Para las
// demás vale primero la que entró en ese mismo minuto —cambiarle el papel a una
// marca no la vuelve otra— y si no, la que regresaba de esa pausa. Si ninguna, la
// fila es nueva. Tras un descanso, «la que regresaba» es solo el regreso de ESE
// descanso, nunca el de otro (12 de septiembre de 2026).
//
// En DOS pasadas desde el 12 de septiembre de 2026: primero TODAS las filas que
// entran en el minuto de una marcación, y después las demás. Fila por fila, la del
// regreso de las 09:15, sin marcación de ese minuto, se llevaba la de las 15:10
// antes de que la fila de las 15:10 la pidiera, y esa foto aparecía a las 09:15.
function filasQueSeReusan(antes, filas, huecos) {
    const reusa = filas.map(() => null);
    const tomadas = new Set();
    const libre = (m) => !tomadas.has(m);
    const tomar = (k, m) => {
        if (!m)
            return;
        tomadas.add(m);
        reusa[k] = m;
    };
    const porElMinuto = (k) => {
        tomar(k, antes.find(m => libre(m) && !!m.entrada && mismoMinuto(m.entrada, filas[k].entrada)));
    };
    const porLaPausa = (k) => {
        if (reusa[k])
            return;
        const anterior = filas[k - 1].fin;
        if (!esPausa(anterior))
            return;
        // Tras un descanso, SOLO la marcación que venía justo después de la salida que ese
        // descanso heredó: es SU regreso. Con varios descansos, «la que regresaba de un
        // descanso» puede ser el regreso de otro: quitar el de las 09:00 reescribía con la
        // tarde la fila del regreso de las 09:15, y poner uno nuevo le daba a su regreso la
        // foto, la sede y el método de entrada del regreso de otro descanso, sin avisar. Si
        // ese descanso no heredó ninguna salida, o su regreso ya tiene fila, esta nace nueva y
        // la foto que sobre se avisa en `fotosQueSePierden` (12 de septiembre de 2026). El
        // almuerzo es uno solo, así que su respaldo por tipo sigue.
        if (anterior === 'DESCANSO') {
            const fuente = huecos[k - 1].fuente;
            const suRegreso = fuente ? antes[antes.indexOf(fuente) + 1] : undefined;
            if (suRegreso && libre(suRegreso))
                tomar(k, suRegreso);
            return;
        }
        tomar(k, antes.find(m => libre(m) && entradaDe(antes, antes.indexOf(m)) === REGRESO_DE[anterior]));
    };
    tomar(0, antes[0]);
    for (let k = 1; k < filas.length; k++)
        porElMinuto(k);
    for (let k = 1; k < filas.length; k++)
        porLaPausa(k);
    return reusa;
}
function datosDelHueco({ papel, hora, fuente }) {
    // La marca de estimada va con el sitio de la salida y no con la hora: reabrir
    // un turno que cerró el sistema no puede dejarlo listo para que el barrido lo
    // vuelva a cerrar, y ponerle hora a mano no borra que nadie la marcó.
    const salidaEstimada = fuente?.salidaEstimada ?? false;
    if (!hora)
        return { ...SIN_SALIDA, salidaEstimada };
    if (!fuente?.salida)
        return { ...SIN_SALIDA, metodoSalida: 'MANUAL', salidaEstimada };
    const { sedeSalidaId, fotoSalida, metodoSalida, distanciaSalida } = fuente;
    // A cuál descanso salió solo viaja con la salida al descanso que no se movió de
    // minuto: movida, se vuelve a decidir por la hora (12 de septiembre de 2026).
    const descansoVentana = papel === 'DESCANSO' && mismoMinuto(fuente.salida, hora) ? fuente.descansoVentana ?? null : null;
    return { sedeSalidaId, fotoSalida, metodoSalida, distanciaSalida, salidaEstimada, descansoVentana };
}
// Las fotos que no quedan en ninguna fila: las de las salidas que nadie heredó
// con hora, y la de la entrada de una marcación que se borra.
function fotosQueSePierden(antes, huecos, reusadas) {
    const conservadas = new Set(huecos.filter(h => h.hora && h.fuente?.salida).map(h => h.fuente));
    const siguen = new Set(reusadas);
    const fotos = [];
    antes.forEach((m, i) => {
        if (!siguen.has(m) && m.fotoEntrada)
            fotos.push({ momento: entradaDe(antes, i), hora: m.entrada });
        if (m.fotoSalida && !conservadas.has(m)) {
            const saleA = pausaDeLaSalida(m);
            fotos.push({ momento: saleA ? SALIDA_A[saleA] : 'SALIDA', hora: m.salida });
        }
    });
    const orden = (f) => f.hora?.getTime() ?? Number.MAX_SAFE_INTEGER;
    return fotos.sort((a, b) => orden(a) - orden(b));
}
// Lo que cuelga de una marcación (la novedad de una salida temprana) va a donde
// fue su salida. Si su salida no quedó en ninguna parte se queda en su fila, y si
// su fila se borra, a la primera, que nunca se borra.
function novedadesQueSeMueven(antes, huecos, reusadas) {
    return antes.flatMap(m => {
        const suSalida = huecos.findIndex(h => h.fuente === m);
        const suFila = reusadas.indexOf(m);
        const destino = suSalida >= 0 ? suSalida : suFila >= 0 ? suFila : 0;
        return reusadas[destino] === m ? [] : [{ desde: m.id, hacia: destino }];
    });
}
// Qué le toca a cada fila cuando el administrador reescribe una jornada entera, y
// qué se pierde en el camino.
//
// Quitar o poner una pausa cambia CUÁL salida guarda cada fila. La sede, la foto,
// el método, la distancia y la marca de estimada son de la salida, así que viajan
// juntos. Antes solo viajaba la sede: al quitar el almuerzo, la fila que quedaba
// decía «Salida 17:00» con la foto de la salida a almorzar, y la foto real de las
// 17:00 se borraba con la marcación de la tarde.
//
// La regla: la fila que queda con la salida a una pausa hereda la salida a ESA
// pausa de antes, y la que queda con la salida del día hereda la del día. Lo que
// antes no existía no se inventa: la escribió el administrador (MANUAL, sin foto
// ni sede).
//
// `filas` dice, para cada fila que queda, qué marcación de antes se reescribe
// (`reusa`, o null si es nueva) y todo lo de su salida. `sobran` son las que se
// borran. `fotosQueSePierden` son las que no quedan en ninguna fila: la ruta no
// guarda sin que el administrador lo confirme. `novedades` dice a qué fila se
// mueve lo que cuelga de cada marcación, que si no se borraría en cascada.
//
// Espera las marcaciones de UNA jornada en orden de entrada, y las filas que deja
// `tramosDeLaJornada`.
function salidasTrasEditar(antes, filas) {
    const huecos = huecosQueQuedan(filas, antes);
    const reusadas = filasQueSeReusan(antes, filas, huecos);
    return {
        filas: huecos.map((h, k) => ({ reusa: reusadas[k]?.id ?? null, salida: datosDelHueco(h) })),
        sobran: antes.filter(m => !reusadas.includes(m)).map(m => m.id),
        fotosQueSePierden: fotosQueSePierden(antes, huecos, reusadas),
        novedades: novedadesQueSeMueven(antes, huecos, reusadas),
    };
}
// A QUIÉN se le cobra el descuento de una pausa. Con ventana, a cada jornada los
// minutos que SUS tramos pasaron dentro de ella: quien se fue a las diez de la
// mañana no almorzó, y cargarle el almuerzo a esa fila para no tocar la del
// mediodía deja las dos mintiendo aunque el total del día cuadre. Sin solape
// —el almuerzo fijo sin ventana, que no es proporcional a nada— va entero a la
// jornada de la pausa.
function cobroPorJornada(descuento, solapes, iDeLaPausa) {
    const enLaVentana = solapes.reduce((s, p) => s + (p ?? 0), 0);
    const cobro = new Array(solapes.length).fill(0);
    if (enLaVentana <= 0) {
        cobro[iDeLaPausa] = descuento;
        return cobro;
    }
    // El último con solape se lleva el resto: así los cobros suman exactamente el
    // descuento del día, que viene ya redondeado.
    const ultimo = solapes.reduce((u, p, k) => ((p ?? 0) > 0 ? k : u), 0);
    let dado = 0;
    for (let k = 0; k < solapes.length; k++) {
        if ((solapes[k] ?? 0) <= 0)
            continue;
        cobro[k] = k === ultimo ? descuento - dado : descuento * solapes[k] / enLaVentana;
        dado += cobro[k];
    }
    return cobro;
}
// Lo que una jornada no alcanza a pagar lo pagan las demás, empezando por la de
// la pausa. Media jornada con una hora de almuerzo fijo dejaría el recorte a
// medias y el día contaría de más.
function cobrarHastaDondeAlcance(cobro, disponible, iDeLaPausa) {
    const quita = cobro.map((c, k) => Math.min(c, disponible[k]));
    let pendiente = cobro.reduce((s, c, k) => s + c - quita[k], 0);
    for (const i of [iDeLaPausa, ...cobro.map((_, k) => k).filter(k => k !== iDeLaPausa)]) {
        const cabe = Math.min(pendiente, disponible[i] - quita[i]);
        quita[i] += cabe;
        pendiente -= cabe;
    }
    return quita;
}
function partirDiaEnJornadas(registros, dia) {
    const enOrden = enOrdenDeEntrada(registros);
    if (enOrden.length === 0)
        return [];
    const bloques = agruparEnJornadas(enOrden);
    const almuerzo = resumirAlmuerzoDelDia(enOrden, dia);
    const descansos = resumenesDeDescanso(enOrden, dia, new Date());
    const jornadaDe = (m) => (m ? Math.max(0, bloques.findIndex(b => b.includes(m))) : 0);
    // De qué jornada es cada pausa: la que contiene su salida. Cuando nadie la
    // marcó —el caso de "descontar 60 min" sin ventana horaria, que es el de la
    // mayoría— es la primera del día, que es donde se mira primero.
    const iDe = (pausa) => Math.max(0, bloques.findIndex(b => b.some(r => pausaDeLaSalida(r) === pausa)));
    const iDelAlmuerzo = iDe('ALMUERZO');
    const iDelDescanso = iDe('DESCANSO');
    const tramosDe = (b) => tramosUtiles(b).map(r => (0, ajusteJornada_1.ajustarAJornada)(r.entrada, r.salida, dia));
    const porBloque = bloques.map(tramosDe);
    const trabajados = porBloque.map(ts => ts.reduce((s, t) => s + (t.salida.getTime() - t.entrada.getTime()) / MS_MIN, 0));
    // Cada descuento se calcula UNA vez para todo el día y después se reparte. Cuesta lo
    // fijado del día, no un número proporcional a los tramos, así que pedirlo una vez por
    // jornada lo cobraría dos veces y le robaría una hora al día sin que nadie lo notara.
    const marcas = marcasParaDescontar(enOrden, dia);
    const descuentoAlmuerzo = (0, almuerzo_1.minutosAlmuerzoADescontar)(marcas, dia);
    const quitaAlmuerzo = cobrarHastaDondeAlcance(cobroPorJornada(descuentoAlmuerzo, porBloque.map(ts => (0, almuerzo_1.minutosEnLaVentana)(ts, (0, almuerzo_1.ventanaDeAlmuerzo)(dia))), iDelAlmuerzo), trabajados, iDelAlmuerzo);
    // El descanso cobra sobre lo que el almuerzo dejó: los dos juntos no pueden
    // quitarle a una jornada más de lo que trabajó.
    const libres = trabajados.map((t, k) => t - quitaAlmuerzo[k]);
    // Con varios descansos, cada jornada paga en proporción a lo que sus tramos pasaron
    // dentro de la UNIÓN de las ventanas.
    const ventanas = (0, descansos_1.leerDescansos)(dia.descansos);
    const descuentoDescanso = (0, descansos_1.minutosDescansoADescontar)(marcas, dia);
    const quitaDescanso = cobrarHastaDondeAlcance(cobroPorJornada(descuentoDescanso, porBloque.map(ts => (0, descansos_1.minutosEnLasVentanas)(ts, dia.fecha, ventanas)), iDelDescanso), libres, iDelDescanso);
    // Se redondea sobre el acumulado, no jornada por jornada: redondear cada una
    // por su cuenta descuadraría la suma en un minuto, y dos filas que no dan el
    // total que muestra el modal no se pueden defender ante nadie.
    const redondeoAcumulado = () => {
        let acumulado = 0;
        let entregado = 0;
        return (valor) => {
            acumulado += valor;
            const aqui = Math.round(acumulado) - entregado;
            entregado += aqui;
            return aqui;
        };
    };
    const contados = redondeoAcumulado();
    const almuerzoAqui = redondeoAcumulado();
    const descansoAqui = redondeoAcumulado();
    return bloques.map((marcaciones, i) => ({
        marcaciones,
        minutosContados: contados(trabajados[i] - quitaAlmuerzo[i] - quitaDescanso[i]),
        minutosAlmuerzoAqui: almuerzoAqui(quitaAlmuerzo[i]),
        minutosDescansoAqui: descansoAqui(quitaDescanso[i]),
        almuerzo: i === iDelAlmuerzo ? almuerzo : null,
        descansos: descansos.filter(d => jornadaDe(d.marcacion) === i).map(d => d.resumen),
    }));
}
// Cuánto tiempo se le contó a alguien en un día: la suma de sus tramos, ya
// ajustada por la tolerancia de salida y ya descontadas las pausas.
//
// Es la pregunta por la que se abre la pantalla —"¿trabajó sus ocho horas o
// no?"— y hoy no se responde en ningún lado: la tabla muestra cada tramo por
// separado y deja al administrador sumando de cabeza.
//
// Se puede mostrar sin miedo a contradecir la nómina porque este total NO
// depende de lo que la persona llevara acumulado esa semana. El acumulado
// decide cómo se CLASIFICAN los minutos (ordinaria, extra, nocturna), no
// cuántos son. Por eso el número no baila según el filtro de fechas de la
// pantalla, que es justo lo que lo haría indefendible.
//
// Lo que este número NO es: plata. Para eso está el reporte, donde esos mismos
// minutos ya vienen repartidos por tipo de hora y con sus recargos.
function minutosContadosDelDia(registros, dia) {
    const tramos = tramosUtiles(registros).map(r => (0, ajusteJornada_1.ajustarAJornada)(r.entrada, r.salida, dia));
    if (tramos.length === 0)
        return 0;
    const trabajados = tramos.reduce((s, t) => s + (t.salida.getTime() - t.entrada.getTime()) / MS_MIN, 0);
    const marcas = marcasParaDescontar(registros, dia);
    const almuerzo = (0, almuerzo_1.minutosAlmuerzoADescontar)(marcas, dia);
    const descanso = (0, descansos_1.minutosDescansoADescontar)(marcas, dia);
    // Media jornada con una hora de almuerzo fijo daría negativo. Cero es la
    // respuesta honesta; un número en rojo sería una invención.
    return Math.max(0, Math.round(trabajados - almuerzo - descanso));
}
