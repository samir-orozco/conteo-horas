"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ajustarAJornada = ajustarAJornada;
const tardanzas_1 = require("./tardanzas");
// Tolerancia de jornada: recorta los minutos sueltos que alguien trabaja fuera
// de su horario SIN orden previa.
//
// El caso que resuelve: el trabajador sale 10 minutos después de su hora. En
// modo HORARIO esos 10 minutos se clasifican como EXTRA y se pagan con recargo,
// aunque nadie los autorizó. Con una tolerancia de 15, la salida se toma como
// la programada. Si se queda 40 minutos, ahí sí trabajó de verdad y cuenta
// completo: la tolerancia perdona lo accidental, no lo real.
//
// Dos decisiones que evitan que esto juegue solo para un lado:
//  - Salir ANTES de la hora nunca se ajusta. Ese es tiempo que no trabajó, y
//    taparlo sería regalar horas.
//  - Llegar TARDE nunca se ajusta. Se cuenta desde que llegó.
// El único caso simétrico —llegar temprano— es opcional y viene apagado: si se
// enciende, la misma tolerancia aplica a los dos extremos.
//
// La hora programada sale de la fila del día (`DiaEsperado`) y no del horario
// vigente, por lo mismo de siempre: cambiar el horario hoy no puede mover lo
// que ya se liquidó.
const MS_MIN = 60000;
const UN_DIA_MS = 24 * 60 * 60 * 1000;
// Instante real de una hora "HH:MM" dentro del día de la fila.
function instanteDe(fecha, hhmm) {
    return new Date(fecha.getTime() + (0, tardanzas_1.minutosDe)(hhmm) * MS_MIN);
}
function ajustarAJornada(entrada, salida, dia) {
    const sinCambio = { entrada, salida, ajustada: false };
    if (!dia.programado || dia.toleranciaSalidaMin <= 0)
        return sinCambio;
    if (!dia.horaEntrada || !dia.horaSalida)
        return sinCambio;
    const tolMs = dia.toleranciaSalidaMin * MS_MIN;
    const entradaProg = instanteDe(dia.fecha, dia.horaEntrada);
    let salidaProg = instanteDe(dia.fecha, dia.horaSalida);
    // Turno que cruza medianoche: la salida programada es del día siguiente.
    if (salidaProg <= entradaProg)
        salidaProg = new Date(salidaProg.getTime() + UN_DIA_MS);
    let nuevaEntrada = entrada;
    let nuevaSalida = salida;
    // Se quedó de más, pero dentro de la tolerancia → se toma la hora programada.
    const deMas = salida.getTime() - salidaProg.getTime();
    if (deMas > 0 && deMas <= tolMs)
        nuevaSalida = salidaProg;
    // Llegó antes, dentro de la tolerancia y solo si la empresa lo activó.
    if (dia.ajustaEntrada) {
        const deAntes = entradaProg.getTime() - entrada.getTime();
        if (deAntes > 0 && deAntes <= tolMs)
            nuevaEntrada = entradaProg;
    }
    // Red de seguridad: el ajuste no puede invertir la jornada. Pasa con quien
    // entra ya sobre su hora de salida (un relevo que llega tardísimo); ahí se
    // deja el registro tal como vino.
    if (nuevaSalida.getTime() < nuevaEntrada.getTime())
        return sinCambio;
    const ajustada = nuevaEntrada.getTime() !== entrada.getTime() || nuevaSalida.getTime() !== salida.getTime();
    return { entrada: nuevaEntrada, salida: nuevaSalida, ajustada };
}
