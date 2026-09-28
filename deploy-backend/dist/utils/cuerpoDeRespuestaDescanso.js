"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MAXIMO_DE_RESPUESTAS = void 0;
exports.limpiarRespuestasDeDescanso = limpiarRespuestasDeDescanso;
const diasDeLaSemana_1 = require("./diasDeLaSemana");
// Guarda de ABUSO, no regla de negocio: ninguna empresa tiene cien horarios, y el cuerpo llega de
// la red. Es la misma clase de tope que `FILAS_MAXIMAS_DE_DESCANSOS` en `ventanasDeHorario.ts`,
// puesto después de que 500 descansos tumbaran una ruta con un desbordamiento de pila.
exports.MAXIMO_DE_RESPUESTAS = 100;
const texto = (v) => (typeof v === 'string' ? v.trim() : '');
// `diaValido` estaba escrita aquí, y también en `descansoObligatorio.ts`. Las dos hacían lo mismo
// (se comprobó antes de fundirlas: todavía no habían derivado) y las dos se migran a
// `diasDeLaSemana` en este mismo commit. Una regla extraída a medias es peor que no haberla
// extraído, porque parece una sola y son dos (CLAUDE.md §9.3).
//
// El helper `texto` NO se va con ella: lo siguen usando el horarioId y el tipo, más abajo.
function limpiarRespuestasDeDescanso(data, horariosValidos) {
    if (!Array.isArray(data) || data.length === 0) {
        return { ok: false, motivo: 'Faltan las respuestas del día de descanso.' };
    }
    // El tope va ANTES de recorrer: con una lista enorme, el trabajo de validarla entera ya es el
    // abuso que el tope viene a impedir.
    if (data.length > exports.MAXIMO_DE_RESPUESTAS) {
        return { ok: false, motivo: `Demasiadas respuestas: el máximo es ${exports.MAXIMO_DE_RESPUESTAS}.` };
    }
    const permitidos = new Set(horariosValidos);
    const vistos = new Set();
    const datos = [];
    for (const cruda of data) {
        const fila = (cruda ?? {});
        const horarioId = texto(fila.horarioId);
        // La guarda de ALCANCE, y va primero. Sin ella un cuerpo armado a mano declararía el descanso
        // de la gente de otra empresa, y con él dejaría de pagarle el recargo dominical.
        if (!horarioId || !permitidos.has(horarioId)) {
            return { ok: false, motivo: 'Uno de los horarios no existe o no es de esta empresa.' };
        }
        // Dos respuestas para el mismo horario significan que la última gana en silencio. Con una
        // declaración legal, «la última gana» no es una política: es un descuido.
        if (vistos.has(horarioId)) {
            return { ok: false, motivo: 'Un horario llegó dos veces con respuestas distintas.' };
        }
        vistos.add(horarioId);
        // Un caso por valor, con rechazo explícito de todo lo demás (§9.4). PRESUMIDO se rechaza a
        // propósito: responder «lo presumido» no es declarar nada, es el valor por defecto de todo el
        // mundo, y aceptarlo escribiría una fecha de acuerdo afirmando que hay un papel firmado que no
        // existe.
        const tipo = texto(fila.tipo).toUpperCase();
        if (tipo !== 'FIJO' && tipo !== 'ROTATIVO') {
            return { ok: false, motivo: 'La respuesta tiene que ser FIJO con un día, o ROTATIVO.' };
        }
        if (tipo === 'ROTATIVO') {
            // El día que llegue NO se mira: la pantalla oculta el selector al marcar «rotativo», así que
            // es residuo de lo que el administrador había elegido antes de cambiar de idea. Guardarlo
            // dejaría una declaración que dice dos cosas a la vez.
            datos.push({ horarioId, tipo: 'ROTATIVO', dia: null });
            continue;
        }
        const dia = (0, diasDeLaSemana_1.diaValido)(fila.dia);
        if (dia === null) {
            return { ok: false, motivo: 'Un descanso fijo necesita un día de la semana válido.' };
        }
        datos.push({ horarioId, tipo: 'FIJO', dia });
    }
    // Cobertura completa, y va al final. La empresa queda marcada como revisada en el mismo
    // movimiento que estas respuestas, así que una respuesta parcial daría por resuelto lo que nadie
    // contestó y esos horarios no volverían a preguntarse nunca.
    if (vistos.size !== permitidos.size) {
        return { ok: false, motivo: 'Faltan horarios por responder.' };
    }
    return { ok: true, datos };
}
