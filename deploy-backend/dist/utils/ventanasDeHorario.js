"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mensajeVentanasImposibles = exports.horaValida = void 0;
exports.horasDeTramoValidas = horasDeTramoValidas;
exports.franjaBasicaValida = franjaBasicaValida;
exports.revisarDescansos = revisarDescansos;
exports.franjasConVentanaImposible = franjasConVentanaImposible;
exports.ventanasParaGuardar = ventanasParaGuardar;
exports.franjaParaGuardar = franjaParaGuardar;
exports.franjaParaResponder = franjaParaResponder;
exports.pantallaViejaBorraDescansos = pantallaViejaBorraDescansos;
const tardanzas_1 = require("./tardanzas");
const descansos_1 = require("./descansos");
Object.defineProperty(exports, "horaValida", { enumerable: true, get: function () { return descansos_1.horaValida; } });
// Las horas de un tramo son horas de verdad. La regla de la hora es UNA sola y vive
// en `horaValida`: aquí y en la ruta hubo regex propias que dejaban pasar «99:99»
// (12 de septiembre de 2026, CLAUDE.md §9.3).
function horasDeTramoValidas(t) {
    const tramo = (t && typeof t === 'object' ? t : {});
    return (0, descansos_1.horaValida)(tramo.horaEntrada) !== null && (0, descansos_1.horaValida)(tramo.horaSalida) !== null;
}
// Lo básico de una franja, antes de mirar sus pausas: al menos un día, y horas de
// entrada y salida que de verdad son horas.
function franjaBasicaValida(f) {
    const franja = (f && typeof f === 'object' ? f : {});
    return Array.isArray(franja.dias) && franja.dias.length > 0 && horasDeTramoValidas(f);
}
// El mensaje con el que se le devuelve al administrador una ventana que no se puede
// cumplir. Vivía en routes/horarios.ts; se mudó aquí el 19 de septiembre de 2026 para
// que el catálogo de plantillas dé EL MISMO motivo ante la misma falla, en vez de una
// segunda redacción del mismo error.
const mensajeVentanasImposibles = (imposibles) => `El almuerzo o los descansos no caben dentro de la jornada: ${imposibles.join(', ')}. ` +
    'Revisa que cada hora de inicio sea anterior a la de fin, que ninguna pausa se cruce con otra y que no haya más de 3 descansos.';
exports.mensajeVentanasImposibles = mensajeVentanasImposibles;
// La ventana como tramo de la jornada, en minutos contados desde la entrada. Así
// se comparan igual una franja de día y una nocturna que cruza la medianoche.
function tramoDesdeLaEntrada(f, ini, fin) {
    const desde = (0, descansos_1.minutosDesdeLaEntrada)(f.horaEntrada, ini);
    return [desde, desde + (0, tardanzas_1.duracionFranjaMin)(ini, fin)];
}
// Tocarse en un extremo NO es cruzarse: un descanso de 10:00 a 10:15 y otro de 10:15
// a 10:30 no comparten ningún minuto.
const seCruzan = (a, b) => Math.max(a[0], b[0]) < Math.min(a[1], b[1]);
// La ventana tiene que caber DENTRO de la franja de ese día. Sin esta
// comprobación, una ventana invertida por un dedazo ("de 13:00 a 12:00", o
// "de 12 a 1" tecleado como 12:00-01:00) se guarda como una pausa de 23 horas:
// la jornada esperada del día queda en 0, se descuentan horas que nadie tomó, y
// como el día se congela al materializarse, corregir el horario después ya no
// arregla lo que se guardó mal.
function cabeEnLaFranja(f, ini, fin) {
    const jornada = (0, tardanzas_1.duracionFranjaMin)(f.horaEntrada, f.horaSalida);
    const [desde, hasta] = tramoDesdeLaEntrada(f, ini, fin);
    return hasta - desde < jornada && hasta <= jornada;
}
const escrito = (v) => typeof v === 'string' && v.trim() !== '';
// Una ventana de la franja: completa y cumplible, `mal` si no, o `null` cuando la
// fila no trae ninguna de las dos horas, que es una configuración legítima.
// Escribir algo que no es una hora, o solo media ventana, antes se descartaba en
// silencio: el admin creía haber configurado la pausa y el kiosco no le preguntaba
// nada a nadie.
function revisar(f, ini, fin) {
    if (!escrito(ini) && !escrito(fin))
        return null;
    const i = (0, descansos_1.horaValida)(ini);
    const fi = (0, descansos_1.horaValida)(fin);
    if (!i || !fi || i === fi || !cabeEnLaFranja(f, i, fi))
        return { mal: true };
    return { ok: [i, fi] };
}
const franjaEnTexto = (f) => `${f.horaEntrada}-${f.horaSalida}`;
const horaEnTexto = (v) => (escrito(v) ? String(v) : '?');
// Cuántas FILAS se aceptan siquiera mirar, que NO es la regla de negocio: el máximo de descansos
// sigue siendo `MAX_DESCANSOS_POR_FRANJA` y se cuenta sobre las filas que traen horas, porque la
// pantalla manda filas vacías a propósito y no deben gastar el cupo.
//
// Esto es solo un freno al abuso, puesto el 19 de septiembre de 2026: con 500 filas la revisión
// compara todas las parejas (124.751 avisos) y esparcirlas como argumentos de `push` revienta la
// pila, así que la ruta devolvía un 500 en vez de un 400 con su motivo. La pantalla nunca manda más
// de tres filas; 50 está muy por encima de cualquier cuerpo legítimo y muy por debajo del punto
// donde esto duele.
const FILAS_MAXIMAS_DE_DESCANSOS = 50;
// Los descansos de UNA franja: la lista completa y cumplible, o los rótulos de por
// qué no. `n` es la posición en que el administrador ve la fila, contando las que
// dejó vacías.
//
// Se rechaza, con un mensaje cada uno:
//  - que `descansos` venga pero no sea una lista;
//  - un elemento que no es un descanso, o uno a medias, invertido o fuera de la
//    franja (la misma regla que el almuerzo);
//  - más de tres descansos con horas;
//  - dos descansos que se cruzan, o uno que se cruza con el almuerzo: la misma hora
//    se descontaría dos veces.
function revisarDescansos(f) {
    if (f.descansos === undefined)
        return { ok: [] };
    const franja = franjaEnTexto(f);
    if (!Array.isArray(f.descansos))
        return { mal: [`${franja} (los descansos no tienen el formato esperado)`] };
    // El freno al abuso va ANTES de recorrer nada: una lista descomunal no se revisa fila por fila,
    // se rechaza de una. No confundir con el máximo de descansos, que se cuenta más abajo sobre las
    // filas que traen horas. Un primer intento puso esta guarda en el máximo de negocio y rompió la
    // regla de que una fila vacía no gasta cupo: lo cazó una prueba que ya existía.
    if (f.descansos.length > FILAS_MAXIMAS_DE_DESCANSOS) {
        return { mal: [`${franja} (tiene ${f.descansos.length} descansos; el máximo es ${descansos_1.MAX_DESCANSOS_POR_FRANJA})`] };
    }
    const mal = [];
    const validos = [];
    let conHoras = 0;
    f.descansos.forEach((d, i) => {
        const n = i + 1;
        if (!d || typeof d !== 'object' || Array.isArray(d)) {
            mal.push(`${franja} (descanso ${n}: no tiene el formato esperado)`);
            return;
        }
        const { inicio, fin } = d;
        const r = revisar(f, inicio, fin);
        if (r === null)
            return;
        conHoras++;
        if ('mal' in r) {
            mal.push(`${franja} (descanso ${n}: ${horaEnTexto(inicio)}-${horaEnTexto(fin)})`);
            return;
        }
        validos.push({ n, ventana: { inicio: r.ok[0], fin: r.ok[1] }, tramo: tramoDesdeLaEntrada(f, ...r.ok) });
    });
    if (conHoras > descansos_1.MAX_DESCANSOS_POR_FRANJA) {
        mal.push(`${franja} (tiene ${conHoras} descansos; el máximo es ${descansos_1.MAX_DESCANSOS_POR_FRANJA})`);
    }
    for (let a = 0; a < validos.length; a++) {
        for (let b = a + 1; b < validos.length; b++) {
            if (seCruzan(validos[a].tramo, validos[b].tramo))
                mal.push(`${franja} (descansos ${validos[a].n} y ${validos[b].n} se cruzan)`);
        }
    }
    const almuerzo = revisar(f, f.almuerzoInicio, f.almuerzoFin);
    if (almuerzo && 'ok' in almuerzo) {
        const tramoAlmuerzo = tramoDesdeLaEntrada(f, ...almuerzo.ok);
        for (const d of validos) {
            if (seCruzan(tramoAlmuerzo, d.tramo)) {
                mal.push(`${franja} (descanso ${d.n}: ${d.ventana.inicio}-${d.ventana.fin} se cruza con el almuerzo)`);
            }
        }
    }
    return mal.length > 0 ? { mal } : { ok: validos.map(d => d.ventana) };
}
// Tramos con alguna ventana que no se puede cumplir. Se devuelven para que la
// ruta responda 400 con un mensaje concreto en vez de guardar algo imposible.
function franjasConVentanaImposible(franjas) {
    const malas = [];
    for (const f of franjas) {
        const almuerzo = revisar(f, f.almuerzoInicio, f.almuerzoFin);
        if (almuerzo && 'mal' in almuerzo) {
            malas.push(`${franjaEnTexto(f)} (almuerzo ${f.almuerzoInicio ?? '—'}-${f.almuerzoFin ?? '—'})`);
        }
        const descansos = revisarDescansos(f);
        if ('mal' in descansos)
            malas.push(...descansos.mal);
    }
    return malas;
}
// Lo que se guarda de las PAUSAS de un tramo: el almuerzo completo o vacío, nunca a
// medias, y la lista de descansos en su forma canónica, ordenada desde la entrada
// (NULL si no hay ninguno). Quien llama ya rechazó lo imposible antes de llegar aquí.
//
// Está separado de `franjaParaGuardar` para que la plantilla de turno, que no tiene
// días, guarde sus pausas con este mismo código y no con una copia.
function ventanasParaGuardar(f) {
    const i = (0, descansos_1.horaValida)(f.almuerzoInicio);
    const fi = (0, descansos_1.horaValida)(f.almuerzoFin);
    const conAlmuerzo = i !== null && fi !== null && i !== fi;
    const descansos = revisarDescansos(f);
    return {
        tieneAlmuerzo: f.tieneAlmuerzo !== false, // por defecto sí descuenta almuerzo
        almuerzoInicio: conAlmuerzo ? i : null,
        almuerzoFin: conAlmuerzo ? fi : null,
        descansos: (0, descansos_1.escribirDescansos)((0, descansos_1.ventanasEnOrden)(f.horaEntrada, 'ok' in descansos ? descansos.ok : [])),
    };
}
// Lo que se guarda de una franja: sus días, sus horas y sus pausas.
function franjaParaGuardar(f) {
    return {
        dias: f.dias,
        horaEntrada: f.horaEntrada,
        horaSalida: f.horaSalida,
        ...ventanasParaGuardar(f),
    };
}
// La franja como viaja al navegador: los descansos como arreglo, nunca el texto que
// se guarda. Un texto roto llega como lista vacía en vez de tumbar la pantalla.
function franjaParaResponder(f) {
    return { ...f, descansos: (0, descansos_1.leerDescansos)(f.descansos) };
}
// ¿Este guardado viene de una pantalla de horarios de ANTES de los descansos y
// borraría los que otro ya configuró? La ruta reemplaza las franjas enteras, así que
// un cuerpo sin la clave `descansos` los dejaría en NULL sin que nadie lo decida, y
// subiría lo exigido desde hoy. Sin descansos guardados, la pantalla de antes guarda
// como siempre. La pantalla nueva manda siempre la clave, también vacía.
function pantallaViejaBorraDescansos(guardadas, delCuerpo) {
    const mandaDescansos = delCuerpo.some(f => f !== null && typeof f === 'object' && Object.prototype.hasOwnProperty.call(f, 'descansos'));
    if (mandaDescansos)
        return false;
    return guardadas.some(g => (0, descansos_1.leerDescansos)(g.descansos).length > 0);
}
