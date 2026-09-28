"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.diaDesdePlantilla = diaDesdePlantilla;
const descansos_1 = require("./descansos");
const tardanzas_1 = require("./tardanzas");
// `null` significa «esta plantilla no describe un día que se pueda pintar», y quien llama tiene que
// rechazarlo. La alternativa era devolverlo como día no programado, y eso convertiría EN SILENCIO
// un turno de trabajo roto en un día libre.
function diaDesdePlantilla(plantilla, horario) {
    // La política se copia siempre, también en un día de descanso: es lo que hace
    // `calcularDiasEsperados` en su rama sin franja, y que los dos caminos difieran aquí sería una
    // diferencia invisible entre pintar un día y generarlo.
    //
    // `??` Y NUNCA `||`, y es lo único delicado de estas tres líneas: un CERO y un `false` son
    // sobrescrituras legítimas, no vacíos. Con `||`, un turno que dice «sin tolerancia» heredaría
    // los diez minutos del horario, y un turno con `ajustaEntrada: false` no podría apagar nunca el
    // `true` de la empresa. Nadie lo vería hasta que a alguien no le contaran una tardanza.
    const politica = {
        toleranciaMin: plantilla.toleranciaMin ?? horario?.toleranciaMin ?? 0,
        toleranciaSalidaMin: plantilla.toleranciaSalidaMin ?? horario?.toleranciaSalidaMin ?? 0,
        ajustaEntrada: plantilla.ajustaEntrada ?? horario?.ajustaEntrada ?? false,
    };
    // Un día libre no tiene horas, y las que traiga NO se miran: la pantalla las oculta al marcar
    // «descanso», así que son residuo de lo que el administrador escribió antes de cambiar de idea.
    // Guardarlas dejaría un día que el calendario pinta como libre mientras el kiosco exige entrada.
    if (plantilla.esDescanso) {
        return {
            ...politica,
            programado: false,
            horaEntrada: null,
            horaSalida: null,
            almuerzoMin: 0,
            minutosEsperados: 0,
            almuerzoInicio: null,
            almuerzoFin: null,
            descansos: null,
        };
    }
    const entrada = (0, descansos_1.horaValida)(plantilla.horaEntrada);
    const salida = (0, descansos_1.horaValida)(plantilla.horaSalida);
    if (entrada === null || salida === null)
        return null;
    // Mismo criterio que `leerVentana` y que `limpiarPlantilla`: inicio igual a fin no es un tramo de
    // cero, es uno de veinticuatro horas, y nadie quiso decir eso.
    if (entrada === salida)
        return null;
    // La ventana manda sobre los minutos sueltos del horario. Se VALIDAN las dos horas, al revés que
    // el cálculo desde una franja: si una ventana rota llegara aquí, `duracionFranjaMin` devolvería
    // un número cualquiera y ese número se restaría de lo exigido. Una ventana inválida degrada al
    // respaldo, que es el comportamiento de un turno sin ventana.
    const ini = (0, descansos_1.horaValida)(plantilla.almuerzoInicio);
    const fin = (0, descansos_1.horaValida)(plantilla.almuerzoFin);
    const conVentana = ini !== null && fin !== null && ini !== fin;
    const almuerzo = plantilla.tieneAlmuerzo
        ? (conVentana ? (0, tardanzas_1.duracionFranjaMin)(ini, fin) : (horario?.almuerzoMin ?? 0))
        : 0;
    // Los descansos no remunerados NO dependen de `tieneAlmuerzo`: el sábado corto sin almuerzo puede
    // tener descansos igual. Se ordenan desde la hora de entrada para que en un turno nocturno el de
    // las 23:55 vaya antes que el de las 03:00, y se descuenta la UNIÓN, no la suma: dos descansos
    // que se solapan no cuestan dos veces.
    const ventanas = (0, descansos_1.ventanasEnOrden)(entrada, (0, descansos_1.leerDescansos)(plantilla.descansos));
    const descanso = (0, descansos_1.minutosDeLaUnion)(entrada, ventanas);
    const bruto = (0, tardanzas_1.duracionFranjaMin)(entrada, salida);
    return {
        ...politica,
        programado: true,
        horaEntrada: entrada,
        horaSalida: salida,
        almuerzoMin: almuerzo,
        // Nunca negativo: un turno corto con pausas absurdas no debería poder guardarse, pero si llega,
        // que no produzca un número que después se sume a un saldo de tiempo.
        minutosEsperados: Math.max(0, bruto - almuerzo - descanso),
        // La ventana solo se guarda si este turno descuenta almuerzo.
        almuerzoInicio: plantilla.tieneAlmuerzo && conVentana ? ini : null,
        almuerzoFin: plantilla.tieneAlmuerzo && conVentana ? fin : null,
        descansos: (0, descansos_1.escribirDescansos)(ventanas),
    };
}
