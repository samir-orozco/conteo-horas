"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VENTANA_TURNO_MS = void 0;
exports.decidirCierre = decidirCierre;
exports.cerrarTurnosOlvidados = cerrarTurnosOlvidados;
const date_fns_1 = require("date-fns");
const locale_1 = require("date-fns/locale");
const date_fns_tz_1 = require("date-fns-tz");
// El cliente, no el arranque. Traerlo de '../index' hacía que importar este
// archivo levantara el servidor entero: las pruebas abrían el puerto 3001 y
// disparaban las tareas diarias contra la base de desarrollo.
const prisma_1 = require("../prisma");
const tardanzas_1 = require("./tardanzas");
const notificaciones_1 = require("./notificaciones");
const TZ = 'America/Bogota';
const DIAS_SEMANA = ['DOMINGO', 'LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO'];
const minutosDe = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };
// Cuánto tiempo el kiosco sigue aceptando la salida de un turno abierto. Es la
// misma ventana con la que /marcar busca el turno en curso, y por eso vive aquí
// y allá la importa: mientras la persona TODAVÍA pueda marcar su hora real, el
// barrido no tiene nada que hacer. Cerrarle antes le cambia sus horas reales por
// las teóricas de su franja y encima le quita la forma de arreglarlo.
//
// Sustituye a la vieja gracia de 2 horas tras la salida programada, que era más
// corta y por lo tanto le ganaba a la persona. Con el barrido corriendo cada
// hora eso dejó de ser teórico: un nocturno de 21:00 a 05:00 quedaba cerrado a
// las 07:00 del martes cuando el kiosco aún lo habría aceptado hasta las 15:00.
exports.VENTANA_TURNO_MS = 18 * 60 * 60 * 1000;
// Lo máximo que puede durar una jornada para que su hora de salida sea creíble.
// No es un límite de la persona: es una prueba de cordura sobre lo que el propio
// barrido va a escribir.
const MAX_JORNADA_MS = 16 * 60 * 60 * 1000;
const NO_CERRAR = { cerrar: false, salida: null, horaFranja: null };
// Medianoche de Bogotá del día de `momento`.
function inicioDelDia(momento) {
    const z = (0, date_fns_tz_1.toZonedTime)(momento, TZ);
    return (0, date_fns_tz_1.fromZonedTime)(new Date(z.getFullYear(), z.getMonth(), z.getDate(), 0, 0, 0), TZ);
}
// La decisión, sin base de datos: dado un turno abierto y el instante actual,
// si se cierra y con qué hora.
//
// Vive aparte del barrido a propósito. Es la pieza que decide cuántas horas se
// le pagan a alguien que no marcó, y una decisión así tiene que poder probarse
// sin levantar MySQL.
function decidirCierre(turno, ahora) {
    const { entrada, horario } = turno;
    // Solo días ya pasados. Un turno que empezó hoy puede seguir en curso, por
    // más horas que lleve abierto: el día todavía no termina.
    if (entrada.getTime() >= inicioDelDia(ahora).getTime())
        return NO_CERRAR;
    // Y mientras el kiosco todavía le acepte la salida a la persona, es de ella.
    if (ahora.getTime() - entrada.getTime() < exports.VENTANA_TURNO_MS)
        return NO_CERRAR;
    const zEnt = (0, date_fns_tz_1.toZonedTime)(entrada, TZ);
    // La franja del día en que ENTRÓ, no la de hoy: un viernes sale a otra hora.
    const franja = horario?.activo ? (0, tardanzas_1.franjaDelDia)(horario, DIAS_SEMANA[zEnt.getDay()]) : null;
    // Sin franja no hay hora que aplicar: se marca para que la ponga el admin.
    if (!franja)
        return { cerrar: true, salida: null, horaFranja: null };
    const cruzaMedianoche = minutosDe(franja.horaSalida) <= minutosDe(franja.horaEntrada);
    const [hFin, mFin] = franja.horaSalida.split(':').map(Number);
    // Hora de salida programada, como instante real (día de la entrada, +1 si cruza
    // medianoche). El +1 rueda solo al mes siguiente: `new Date(2026, 7, 32)` es
    // el 1 de septiembre.
    const finLocal = new Date(zEnt.getFullYear(), zEnt.getMonth(), zEnt.getDate() + (cruzaMedianoche ? 1 : 0), hFin, mFin, 0);
    const finProg = (0, date_fns_tz_1.fromZonedTime)(finLocal, TZ);
    // Prueba de cordura sobre la hora que estamos a punto de escribir.
    //
    // El ancla es el día de la ENTRADA, y hasta aquí nadie ha comprobado que esa
    // entrada tenga algo que ver con su franja. Quien entra a las 18:00 teniendo
    // franja 07:00-16:00 (volvió de noche a hacer extras) recibiría una salida DOS
    // HORAS ANTES de haber llegado. Y quien entra a la 01:00 con una franja que
    // cruza medianoche recibiría una de 28 horas, que la liquidación toma por
    // buena y paga como ordinarias más extras más recargo nocturno.
    //
    // En los dos casos el sistema no sabe a qué hora salió esa persona, que es
    // exactamente lo que significa cerrar sin hora.
    const duracion = finProg.getTime() - entrada.getTime();
    if (duracion <= 0 || duracion > MAX_JORNADA_MS) {
        return { cerrar: true, salida: null, horaFranja: null };
    }
    return { cerrar: true, salida: finProg, horaFranja: franja.horaSalida };
}
// Cierra turnos que quedaron abiertos en días ya pasados: pone como salida la hora
// de fin de la franja de ese colaborador y los marca `salidaEstimada` para que el
// admin los revise. No toca `tipo` (la liquidación del día sigue correcta).
// Idempotente: solo actúa sobre turnos aún abiertos, así que correr de más no daña.
async function cerrarTurnosOlvidados(log) {
    try {
        const ahora = new Date();
        const abiertos = await prisma_1.prisma.registro.findMany({
            where: { entrada: { not: null, lt: inicioDelDia(ahora) }, salida: null, salidaEstimada: false },
            select: {
                id: true, entrada: true,
                colaborador: {
                    select: {
                        nombre: true, apellido: true, empresaId: true,
                        horario: { select: { activo: true, franjas: { select: { dias: true, horaEntrada: true, horaSalida: true } } } },
                    },
                },
            },
        });
        let cerrados = 0;
        for (const r of abiertos) {
            const entrada = r.entrada;
            const d = decidirCierre({ entrada, horario: r.colaborador.horario }, ahora);
            if (!d.cerrar)
                continue;
            await prisma_1.prisma.registro.update({
                where: { id: r.id },
                data: {
                    ...(d.salida ? { salida: d.salida } : {}),
                    salidaEstimada: true,
                    editadoPor: 'SISTEMA',
                    editadoEn: ahora,
                },
            });
            cerrados++;
            const nombre = `${r.colaborador.nombre} ${r.colaborador.apellido}`;
            const fechaTxt = (0, date_fns_1.format)((0, date_fns_tz_1.toZonedTime)(entrada, TZ), "d 'de' MMM", { locale: locale_1.es });
            await (0, notificaciones_1.notificar)(r.colaborador.empresaId, {
                tipo: 'NO_MARCO_SALIDA',
                titulo: `${nombre} no marcó salida`,
                cuerpo: d.horaFranja
                    ? `Se estimó su salida a las ${d.horaFranja} del ${fechaTxt}. Revísala y confírmala.`
                    : `Quedó un turno abierto del ${fechaTxt} sin hora de salida. Corrígelo cuando puedas.`,
                entidad: 'registro',
                entidadId: r.id,
            });
        }
        // Se registra SIEMPRE, incluso con cero. Antes solo hablaba cuando cerraba
        // algo, así que "no cerró nada" y "no corrió nunca" se veían igual en el log:
        // por eso este fallo pasó semanas sin que nadie lo notara.
        log?.info(`Auto-cierre: ${abiertos.length} turno(s) abierto(s) de días pasados, ${cerrados} cerrado(s)`);
        return cerrados;
    }
    catch (err) {
        log?.error(err, 'Error en el auto-cierre de turnos');
        return 0;
    }
}
