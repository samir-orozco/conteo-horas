"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MAX_COMENTARIO = exports.ESTADOS_DE_SEGUIMIENTO = exports.MOTIVOS_PREDETERMINADOS = exports.CATALOGO_DE_MOTIVOS = exports.CARITA_MAX_DE_ATENCION = exports.RACHA_DE_ATENCION = exports.CARITA_MAX_CON_MOTIVOS = exports.MAX_OBSERVACION = exports.MAX_LARGO_MOTIVO = exports.MAX_MOTIVOS = exports.MOTIVO_OTRO = void 0;
exports.debePreguntarClima = debePreguntarClima;
exports.yaSePreguntoHoy = yaSePreguntoHoy;
exports.leerMotivosDeEmpresa = leerMotivosDeEmpresa;
exports.validarMotivosDeEmpresa = validarMotivosDeEmpresa;
exports.leerCalificacion = leerCalificacion;
exports.leerObservacion = leerObservacion;
exports.necesitanAtencion = necesitanAtencion;
exports.filasParaLaRacha = filasParaLaRacha;
exports.semanaDe = semanaDe;
exports.visibleDesde = visibleDesde;
exports.ordenRevuelto = ordenRevuelto;
exports.resumenDelClima = resumenDelClima;
exports.variacionDelPromedio = variacionDelPromedio;
exports.promedioPorSede = promedioPorSede;
exports.casosPorAbrir = casosPorAbrir;
exports.leerCambioDeSeguimiento = leerCambioDeSeguimiento;
exports.leerComentario = leerComentario;
const crypto_1 = require("crypto");
const fechas_1 = require("./fechas");
// CLIMA LABORAL (4 de octubre de 2026). Las decisiones del módulo, sin base de datos.
// El requerimiento, con cada decisión y su fecha, está en docs/CLIMA_LABORAL.md.
// «Otro» no es un motivo de la empresa: va fijo al final y abre la observación.
exports.MOTIVO_OTRO = 'Otro';
exports.MAX_MOTIVOS = 5;
exports.MAX_LARGO_MOTIVO = 40;
exports.MAX_OBSERVACION = 1000;
// Las caritas que muestran los motivos: Muy mal, Mal y Normal.
exports.CARITA_MAX_CON_MOTIVOS = 3;
// «Necesitan atención»: tantas respuestas seguidas en Muy mal o Mal.
exports.RACHA_DE_ATENCION = 3;
exports.CARITA_MAX_DE_ATENCION = 2;
exports.CATALOGO_DE_MOTIVOS = [
    { tema: 'El trabajo', motivos: ['Mucho trabajo', 'Faltó personal', 'Desorden o instrucciones poco claras'] },
    { tema: 'El tiempo', motivos: ['Turno largo', 'Me tocó quedarme más tiempo', 'Cambio de horario a última hora'] },
    { tema: 'Las personas', motivos: ['Jefe o supervisor', 'Compañeros', 'Clientes difíciles'] },
    { tema: 'El lugar', motivos: ['Herramientas o equipos que fallan', 'Calor, ruido o espacio'] },
    { tema: 'Yo', motivos: ['Cansancio o salud', 'No me sentí valorado', 'Algo personal'] },
    { tema: 'La plata', motivos: ['Problemas con mi pago'] },
];
exports.MOTIVOS_PREDETERMINADOS = [
    'Mucho trabajo', 'Jefe o supervisor', 'Compañeros', 'Me tocó quedarme más tiempo', 'Algo personal',
];
// ¿La salida que se acaba de marcar abre la ventana de las caritas? Solo la que
// cierra la jornada, y una vez por día: en un turno partido, la primera.
function debePreguntarClima(p) {
    return p.accion === 'SALIDA' && !p.pausa && p.tieneModulo && !p.yaSePreguntoHoy;
}
// En un turno partido se pregunta solo en la PRIMERA salida, la responda o no. Mirar solo si calificó
// no alcanza: quien toca «Omitir» no deja fila, y la segunda salida volvía a preguntar (revisión
// adversarial del 4 de octubre de 2026). Las salidas que cuentan son las que abrieron la ventana: las
// del kiosco, no las que puso el cierre automático ni las cargadas a mano.
function yaSePreguntoHoy(p) {
    return p.calificoHoy || p.otrasSalidasDelKioscoHoy > 0;
}
// Los motivos de una empresa, guardados como lista JSON en `configuracion`. Lo
// que no se pueda leer cae a los predeterminados: una configuración dañada no
// puede dejar la ventana sin motivos.
function leerMotivosDeEmpresa(guardado) {
    if (guardado === null)
        return exports.MOTIVOS_PREDETERMINADOS;
    try {
        const lista = JSON.parse(guardado);
        const v = validarMotivosDeEmpresa(lista);
        return v.ok ? v.motivos : exports.MOTIVOS_PREDETERMINADOS;
    }
    catch {
        return exports.MOTIVOS_PREDETERMINADOS;
    }
}
function validarMotivosDeEmpresa(lista) {
    if (!Array.isArray(lista) || !lista.every(m => typeof m === 'string')) {
        return { ok: false, error: 'Los motivos tienen que ser una lista de textos.' };
    }
    const motivos = lista.map(m => m.trim());
    if (motivos.length === 0)
        return { ok: false, error: 'Deja al menos un motivo.' };
    if (motivos.length > exports.MAX_MOTIVOS)
        return { ok: false, error: `Máximo ${exports.MAX_MOTIVOS} motivos, además de «Otro».` };
    if (motivos.some(m => m === ''))
        return { ok: false, error: 'Hay un motivo vacío.' };
    if (motivos.some(m => m.length > exports.MAX_LARGO_MOTIVO))
        return { ok: false, error: `Cada motivo puede tener hasta ${exports.MAX_LARGO_MOTIVO} letras.` };
    const claves = motivos.map(m => m.toLocaleLowerCase('es'));
    if (claves.includes(exports.MOTIVO_OTRO.toLocaleLowerCase('es')))
        return { ok: false, error: '«Otro» ya va siempre al final.' };
    if (new Set(claves).size !== claves.length)
        return { ok: false, error: 'Hay motivos repetidos.' };
    return { ok: true, motivos };
}
// La carita y los motivos que manda la ventana. Los motivos se guardan por su
// nombre, no por un id: si la empresa cambia sus motivos, lo que ya se respondió
// conserva lo que la persona escogió.
//
// «OTRO» SE ACEPTA PERO NO SE GUARDA (revisión adversarial del 4 de octubre de 2026). No es un motivo:
// es el botón que abre la observación. Guardado con nombre y sin observación directa al lado, era casi
// siempre la huella de una observación confidencial, y señalaba a su autor en el panel.
function leerCalificacion(cuerpo, motivosDeLaEmpresa) {
    if (typeof cuerpo !== 'object' || cuerpo === null)
        return { ok: false, error: 'Falta la calificación.' };
    const { carita, motivos } = cuerpo;
    if (typeof carita !== 'number' || !Number.isInteger(carita) || carita < 1 || carita > 5) {
        return { ok: false, error: 'La carita va del 1 al 5.' };
    }
    if (carita > exports.CARITA_MAX_CON_MOTIVOS)
        return { ok: true, carita, motivos: [] };
    if (motivos === undefined)
        return { ok: true, carita, motivos: [] };
    if (!Array.isArray(motivos))
        return { ok: false, error: 'Los motivos tienen que ser una lista.' };
    const validos = new Set([...motivosDeLaEmpresa, exports.MOTIVO_OTRO]);
    if (!motivos.every(m => typeof m === 'string' && validos.has(m)))
        return { ok: false, error: 'Ese motivo no existe.' };
    return { ok: true, carita, motivos: [...new Set(motivos)].filter(m => m !== exports.MOTIVO_OTRO) };
}
function leerObservacion(cuerpo) {
    const { texto, confidencial } = (typeof cuerpo === 'object' && cuerpo !== null ? cuerpo : {});
    const limpio = typeof texto === 'string' ? texto.trim() : '';
    if (limpio === '')
        return { ok: false, error: 'La observación está vacía.' };
    if (limpio.length > exports.MAX_OBSERVACION)
        return { ok: false, error: `La observación puede tener hasta ${exports.MAX_OBSERVACION} letras.` };
    return { ok: true, texto: limpio, confidencial: confidencial === true };
}
// Quién lleva varias respuestas seguidas en Muy mal o Mal. Cuenta RESPUESTAS y no
// días de calendario: quien descansa el domingo nunca sumaría tres seguidos.
function necesitanAtencion(calificaciones) {
    const porPersona = new Map();
    for (const c of calificaciones) {
        const lista = porPersona.get(c.colaboradorId) ?? [];
        lista.push(c);
        porPersona.set(c.colaboradorId, lista);
    }
    const resultado = [];
    for (const [colaboradorId, lista] of porPersona) {
        const racha = rachaFinal([...lista].sort((a, b) => a.fecha.getTime() - b.fecha.getTime()));
        if (racha.length < exports.RACHA_DE_ATENCION)
            continue;
        resultado.push({ colaboradorId, dias: racha.length, desde: racha[0].fecha, motivo: motivoMasRepetido(racha) });
    }
    return resultado.sort((a, b) => b.dias - a.dias);
}
// Lo malo que vino después del último buen día de cada persona, sin importar cuán viejo sea: la racha
// se corta con una carita mayor que 2, nunca con el calendario. Con una ventana fija de fechas, quien
// responde de vez en cuando nunca llegaba a tres (revisión adversarial del 4 de octubre de 2026).
function filasParaLaRacha(malas, ultimoBueno) {
    return malas.filter(c => {
        const corte = ultimoBueno.get(c.colaboradorId);
        return corte === undefined || c.fecha > corte;
    });
}
function rachaFinal(ordenadas) {
    let i = ordenadas.length;
    while (i > 0 && ordenadas[i - 1].carita <= exports.CARITA_MAX_DE_ATENCION)
        i--;
    return ordenadas.slice(i);
}
function motivoMasRepetido(racha) {
    const cuenta = new Map();
    for (const c of racha)
        for (const m of c.motivos)
            cuenta.set(m, (cuenta.get(m) ?? 0) + 1);
    let mejor = null;
    for (const [m, n] of cuenta)
        if (mejor === null || n > (cuenta.get(mejor) ?? 0))
            mejor = m;
    return mejor;
}
// BUZÓN CONFIDENCIAL. Una nota no guarda su hora: guarda la semana y desde
// cuándo se puede ver. Así ni siquiera la base dice a qué hora llegó, y nadie la
// puede emparejar con la salida de quien marcó a esa hora.
const DIA_MS = 24 * 60 * 60 * 1000;
// El lunes de la semana del instante, a medianoche de Bogotá.
function semanaDe(instante) {
    const { ahoraBog, inicioDia } = (0, fechas_1.rangoDiaBogota)(instante);
    const desdeLunes = (ahoraBog.getDay() + 6) % 7;
    return new Date(inicioDia.getTime() - desdeLunes * DIA_MS);
}
// La medianoche siguiente de Bogotá.
function visibleDesde(instante) {
    return (0, fechas_1.rangoDiaBogota)(instante).finDia;
}
// Un orden que no tiene que ver con el de llegada, pero que es siempre el mismo:
// si cambiara al recargar, comparar dos cargas delataría cuál nota es nueva.
function ordenRevuelto(notas) {
    const clave = (id) => (0, crypto_1.createHash)('sha256').update(id).digest('hex');
    return [...notas].sort((a, b) => (clave(a.id) < clave(b.id) ? -1 : clave(a.id) > clave(b.id) ? 1 : 0));
}
// ────────── EL RESUMEN DEL PANEL ──────────
const unDecimal = (n) => Math.round(n * 10) / 10;
const promedioDe = (lista) => lista.length === 0 ? null : unDecimal(lista.reduce((s, c) => s + c.carita, 0) / lista.length);
function resumenDelClima(calificaciones) {
    const distribucion = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const c of calificaciones)
        distribucion[c.carita]++;
    const noBuenos = calificaciones.filter(c => c.carita <= exports.CARITA_MAX_CON_MOTIVOS);
    const veces = new Map();
    for (const c of noBuenos)
        for (const m of c.motivos)
            veces.set(m, (veces.get(m) ?? 0) + 1);
    const motivos = [...veces]
        .map(([motivo, n]) => ({ motivo, veces: n, porcentaje: Math.round((n / noBuenos.length) * 100) }))
        .sort((a, b) => b.veces - a.veces || a.motivo.localeCompare(b.motivo, 'es'));
    const porSemana = new Map();
    for (const c of calificaciones) {
        const clave = semanaDe(c.fecha).getTime();
        porSemana.set(clave, [...(porSemana.get(clave) ?? []), c]);
    }
    const semanas = [...porSemana]
        .sort(([a], [b]) => a - b)
        .map(([clave, lista]) => ({ semana: new Date(clave), promedio: promedioDe(lista), total: lista.length }));
    // Por el día de Bogotá y no por el instante exacto: una fecha que llegue de la base con milisegundos
    // de más no puede abrir un día aparte.
    const porDia = new Map();
    for (const c of calificaciones) {
        const clave = (0, fechas_1.rangoDiaBogota)(c.fecha).inicioDia.getTime();
        porDia.set(clave, [...(porDia.get(clave) ?? []), c]);
    }
    const dias = [...porDia]
        .sort(([a], [b]) => a - b)
        .map(([clave, lista]) => ({ fecha: new Date(clave), promedio: promedioDe(lista), total: lista.length }));
    return {
        total: calificaciones.length,
        personas: new Set(calificaciones.map(c => c.colaboradorId)).size,
        promedio: promedioDe(calificaciones),
        distribucion,
        negativas: calificaciones.filter(c => c.carita <= exports.CARITA_MAX_DE_ATENCION).length,
        motivos,
        semanas,
        dias,
    };
}
function variacionDelPromedio(actual, anterior) {
    return actual === null || anterior === null ? null : unDecimal(actual - anterior);
}
function promedioPorSede(calificaciones, jornadas, sedesDe, sedes) {
    const lugaresDe = (colaboradorId) => new Set(sedesDe.get(colaboradorId) ?? [null]);
    const porSede = new Map();
    for (const c of calificaciones)
        for (const s of lugaresDe(c.colaboradorId))
            porSede.set(s, [...(porSede.get(s) ?? []), c]);
    const jornadasDe = new Map();
    for (const j of jornadas)
        for (const s of lugaresDe(j.colaboradorId))
            jornadasDe.set(s, (jornadasDe.get(s) ?? 0) + 1);
    const linea = (sedeId, nombre) => {
        const lista = porSede.get(sedeId);
        const nJornadas = jornadasDe.get(sedeId) ?? 0;
        return {
            sedeId, nombre, promedio: promedioDe(lista), total: lista.length, jornadas: nJornadas,
            participacion: nJornadas === 0 ? null : Math.min(100, Math.round((lista.length / nJornadas) * 100)),
        };
    };
    const lineas = sedes.filter(s => porSede.has(s.id)).map(s => linea(s.id, s.nombre));
    if (porSede.has(null))
        lineas.push(linea(null, 'Sin sede'));
    return lineas;
}
// ────────── EL SEGUIMIENTO DE «NECESITAN ATENCIÓN» (4 de octubre de 2026) ──────────
// Cada persona que entra a la lista recibe un caso, que el administrador mueve entre tres estados,
// con un responsable y comentarios. Decisiones del dueño: el caso sigue visible aunque la persona salga
// de la lista, hasta que alguien lo cierre; y si un caso cerrado vuelve a tener una racha de respuestas
// negativas, se abre uno nuevo.
exports.ESTADOS_DE_SEGUIMIENTO = ['SIN_REVISAR', 'EN_SEGUIMIENTO', 'CERRADO'];
exports.MAX_COMENTARIO = 2000;
// Los casos que hay que abrir. Una racha se reconoce por su comienzo (`desde`): mientras dura, el
// comienzo no cambia. Por eso cerrar el caso de una racha que sigue no lo reabre (ya se atendió), y una
// racha NUEVA, que empieza después de un buen día, sí abre otro.
function casosPorAbrir(atencion, casos) {
    return atencion
        .filter(a => {
        const suyos = casos.filter(c => c.colaboradorId === a.colaboradorId);
        const abierto = suyos.some(c => c.estado !== 'CERRADO');
        const deEstaRacha = suyos.some(c => c.desde.getTime() === a.desde.getTime());
        return !abierto && !deEstaRacha;
    })
        .map(a => ({ colaboradorId: a.colaboradorId, desde: a.desde }));
}
function leerCambioDeSeguimiento(cuerpo, responsablesValidos) {
    const { estado, responsableId } = (typeof cuerpo === 'object' && cuerpo !== null ? cuerpo : {});
    const cambio = {};
    if (estado !== undefined) {
        if (!exports.ESTADOS_DE_SEGUIMIENTO.includes(estado))
            return { ok: false, error: 'Ese estado no existe.' };
        cambio.estado = estado;
    }
    if (responsableId !== undefined) {
        if (responsableId !== null && (typeof responsableId !== 'string' || !responsablesValidos.includes(responsableId))) {
            return { ok: false, error: 'Ese responsable no es de tu empresa.' };
        }
        cambio.responsableId = responsableId;
    }
    if (Object.keys(cambio).length === 0)
        return { ok: false, error: 'No hay nada que cambiar.' };
    return { ok: true, cambio };
}
function leerComentario(cuerpo) {
    const { texto } = (typeof cuerpo === 'object' && cuerpo !== null ? cuerpo : {});
    const limpio = typeof texto === 'string' ? texto.trim() : '';
    if (limpio === '')
        return { ok: false, error: 'El comentario está vacío.' };
    if (limpio.length > exports.MAX_COMENTARIO)
        return { ok: false, error: `El comentario puede tener hasta ${exports.MAX_COMENTARIO} letras.` };
    return { ok: true, texto: limpio };
}
