"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GRACIA_MIN = void 0;
exports.almuerzoSinRegreso = almuerzoSinRegreso;
exports.descansoSinRegreso = descansoSinRegreso;
exports.limiteDeEsperaDelDescanso = limiteDeEsperaDelDescanso;
exports.descansoSigueEsperandoRegreso = descansoSigueEsperandoRegreso;
exports.avisarPausasSinRegreso = avisarPausasSinRegreso;
const jornada_1 = require("./jornada");
const almuerzo_1 = require("./almuerzo");
const descansos_1 = require("./descansos");
const tardanzas_1 = require("./tardanzas");
const cierreTurnos_1 = require("./cierreTurnos");
// La pausa que nadie cerró: el almuerzo o un descanso no remunerado.
//
// Quien sale a almorzar y no marca su regreso pierde la tarde entera: no se
// cuenta ni se paga, y hoy nadie se entera hasta que el trabajador reclama a fin
// de mes. Es el olvido más común de todos.
//
// Lo que este módulo NO hace, a propósito: inventar el regreso. La evidencia de
// quien volvió y no marcó es IDÉNTICA a la de quien se fue para la casa —en los
// dos casos la última marca del día es la salida a almorzar—, así que darle la
// tarde por buena sería fabricar horas pagadas de la nada. En un producto que
// calcula nómina eso es peor que el problema que resuelve.
//
// Lo que sí hace: detectarlo y proponer una hora, para que la confirme quien de
// verdad la sabe. Primero la propia persona, en el kiosco, cuando vuelva a
// marcar; y si nunca vuelve, el administrador, avisado por la campana.
const MS_MIN = 60000;
// La gracia vive en `jornada.ts` (`GRACIA_MIN`): la tabla y este
// aviso tienen que estar de acuerdo en cuándo un descanso pasa de estar en curso
// a ser un olvido. Se reexporta porque ya había quien la importaba de aquí.
var jornada_2 = require("./jornada");
Object.defineProperty(exports, "GRACIA_MIN", { enumerable: true, get: function () { return jornada_2.GRACIA_MIN; } });
// La misma pregunta para todas las pausas: lo único que cambia es a qué hora le
// tocaba volver.
function pendienteDesde(regresoEsperado, ahora) {
    return {
        vencido: ahora.getTime() > regresoEsperado + jornada_1.GRACIA_MIN * MS_MIN,
        finVentana: new Date(regresoEsperado),
    };
}
function almuerzoSinRegreso(salida, dia, ahora) {
    const ventana = (0, almuerzo_1.ventanaDeAlmuerzo)(dia);
    // Sin ventana congelada no se sabe cuándo debía volver. No se propone nada:
    // una hora inventada en una pantalla de nómina se acaba tomando por cierta.
    if (!ventana.inicio || !ventana.fin)
        return { vencido: false, finVentana: null };
    return pendienteDesde((0, almuerzo_1.finDeLaVentanaDe)(salida, ventana), ahora);
}
// El descanso que nadie cerró, medido contra la ventana A LA QUE SALIÓ, que quedó
// guardada en la marcación (12 de septiembre de 2026). El día tiene varios
// descansos, así que la del día no dice cuál era. La hora que se propone es la de
// `regresoEsperadoDelDescanso`: el fin de la ventana si salió dentro de ella, y si
// no, la salida más lo que dura ese descanso. Sin ventana guardada no se inventa.
function descansoSinRegreso(salida, fecha, ventana, ahora) {
    if (!ventana)
        return { vencido: false, finVentana: null };
    return pendienteDesde((0, descansos_1.regresoEsperadoDelDescanso)(salida, fecha, ventana).getTime(), ahora);
}
function limiteDeEsperaDelDescanso(salida, dia, ventana) {
    const tope = salida.getTime() + cierreTurnos_1.VENTANA_TURNO_MS;
    const entrada = (0, descansos_1.horaValida)(dia?.horaEntrada);
    const fin = (0, descansos_1.horaValida)(dia?.horaSalida);
    if (!dia || entrada === null || fin === null)
        return new Date(tope);
    const finDelTurno = dia.fecha.getTime() + ((0, tardanzas_1.minutosDe)(entrada) + (0, tardanzas_1.duracionFranjaMin)(entrada, fin)) * MS_MIN;
    const regreso = ventana ? (0, descansos_1.regresoEsperadoDelDescanso)(salida, dia.fecha, ventana).getTime() : salida.getTime();
    return new Date(Math.min(tope, Math.max(finDelTurno, regreso) + jornada_1.GRACIA_MIN * MS_MIN));
}
function descansoSigueEsperandoRegreso(salida, dia, ahora, ventana) {
    return ahora.getTime() <= limiteDeEsperaDelDescanso(salida, dia, ventana).getTime();
}
// ── La red de seguridad ──────────────────────────────────────────────────────
//
// Para quien nunca vuelve al kiosco ese día. Aquí no hay a quién preguntarle, y
// tampoco se le inventa la tarde: se avisa al administrador, que es el único que
// puede averiguar qué pasó. Un aviso con la consecuencia en claro vale más que
// un número inventado que nadie va a revisar.
const date_fns_1 = require("date-fns");
const locale_1 = require("date-fns/locale");
const date_fns_tz_1 = require("date-fns-tz");
const prisma_1 = require("../prisma");
const fechas_1 = require("./fechas");
const notificaciones_1 = require("./notificaciones");
const lotes_1 = require("./lotes");
const TZ = 'America/Bogota';
// Cuántos colaboradores van en cada `IN (...)`. Un IN enorme hace que el motor
// abandone el índice (ver utils/lotes.ts).
const LOTE_DE_COLABORADORES = 500;
// Avisa de las pausas —almuerzo o descanso no remunerado— que quedaron sin
// regreso en días YA PASADOS. Hoy no se toca: la persona todavía puede llegar al
// kiosco y arreglarlo ella misma.
//
// Corre a diario y mira una semana atrás, así que hay que comprobar a mano que
// el aviso no exista ya: `notificar` siempre crea, y sin esto la misma pausa
// olvidada llenaría la campana siete veces. Una campana con ruido se deja de
// mirar, y entonces el aviso que sí importaba tampoco se ve.
//
// SIN RECORRER TODA LA TABLA (CLAUDE.md §8.4, 12 de septiembre de 2026). La
// consulta filtraba solo por las marcas de pausa y un rango de fecha, sin
// colaborador: ningún índice de `registros` le servía y el plan era leer la tabla
// entera, la que más crece del producto. Ahora va por lotes de colaboradores, con
// `colaboradorId IN (...)` y el rango de fecha, que es lo que usa el índice
// (colaboradorId, fecha), el mismo patrón de la revisión de marcaciones. El
// regreso se busca en el día de la pausa, por el mismo índice, y el aviso ya dado,
// dentro de la empresa, por el índice de notificaciones. El resultado es el mismo.
async function avisarPausasSinRegreso(log) {
    try {
        const { inicioDia } = (0, fechas_1.rangoDiaBogota)();
        const desde = new Date(inicioDia.getTime() - 7 * 24 * 60 * 60 * 1000);
        const colaboradores = await prisma_1.prisma.colaborador.findMany({ select: { id: true } });
        const salidasAPausa = [];
        for (const lote of (0, lotes_1.partirEnLotes)(colaboradores.map(c => c.id), LOTE_DE_COLABORADORES)) {
            salidasAPausa.push(...await prisma_1.prisma.registro.findMany({
                where: {
                    colaboradorId: { in: lote },
                    fecha: { gte: desde, lt: inicioDia },
                    salida: { not: null },
                    OR: [{ salidaAlmuerzo: true }, { salidaDescanso: true }],
                },
                select: {
                    id: true, colaboradorId: true, fecha: true, salida: true, salidaDescanso: true, descansoVentana: true,
                    colaborador: { select: { nombre: true, apellido: true, empresaId: true } },
                },
            }));
        }
        const ahora = new Date();
        let avisados = 0;
        for (const s of salidasAPausa) {
            // ¿Volvió de esa pausa? El regreso hereda la fecha de su salida (routes/worker.ts),
            // así que se busca en la MISMA fecha de la fila, con una entrada posterior a la
            // salida, por el índice (colaboradorId, fecha). Hasta dónde cuenta esa entrada
            // depende de la pausa (12 de septiembre de 2026):
            //
            //  - El ALMUERZO, como en producción: una entrada de ese mismo día. La que el kiosco
            //    tomó como su regreso a la mañana siguiente, dentro de las 18 horas, no le
            //    devolvió la tarde, y eso es justo lo que el aviso tiene que decir.
            //  - El DESCANSO, hasta donde el kiosco lo sigue esperando (`limiteDeEsperaDelDescanso`):
            //    el nocturno que vuelve a las 02:15 entra después de la medianoche y recibía un
            //    aviso falso, y quien entra a otro turno esa misma noche no volvió de su descanso.
            //    Mientras ese límite no llegue no se avisa: todavía puede volver y marcarlo.
            const { inicioDia: inicioDeSuDia, finDia } = (0, fechas_1.rangoDiaBogota)(s.fecha);
            let hasta = { lt: finDia };
            if (s.salidaDescanso) {
                const dia = await prisma_1.prisma.diaEsperado.findFirst({
                    where: { colaboradorId: s.colaboradorId, fecha: { gte: inicioDeSuDia, lt: finDia } },
                    select: { fecha: true, horaEntrada: true, horaSalida: true },
                });
                const limite = limiteDeEsperaDelDescanso(s.salida, dia, (0, descansos_1.leerVentana)(s.descansoVentana));
                if (ahora.getTime() <= limite.getTime())
                    continue;
                hasta = { lte: limite };
            }
            const regreso = await prisma_1.prisma.registro.findFirst({
                where: {
                    colaboradorId: s.colaboradorId,
                    fecha: { gte: inicioDeSuDia, lt: finDia },
                    entrada: { gt: s.salida, ...hasta },
                },
                select: { id: true },
            });
            if (regreso)
                continue;
            const yaAvisado = await prisma_1.prisma.notificacion.findFirst({
                where: { empresaId: s.colaborador.empresaId, tipo: 'NO_MARCO_SALIDA', entidad: 'registro', entidadId: s.id },
                select: { id: true },
            });
            if (yaAvisado)
                continue;
            const nombre = `${s.colaborador.nombre} ${s.colaborador.apellido}`;
            const z = (0, date_fns_tz_1.toZonedTime)(s.salida, TZ);
            // De qué pausa no volvió, dicho con sus palabras. Con varios descansos, cuál.
            const ventana = s.salidaDescanso ? (0, descansos_1.leerVentana)(s.descansoVentana) : null;
            const pausa = s.salidaDescanso
                ? { regreso: 'su regreso del descanso', salio: ventana ? `Salió a su descanso de ${ventana.inicio} a ${ventana.fin}` : 'Salió a su descanso' }
                : { regreso: 'su regreso del almuerzo', salio: 'Salió a almorzar' };
            await (0, notificaciones_1.notificar)(s.colaborador.empresaId, {
                tipo: 'NO_MARCO_SALIDA',
                titulo: `${nombre} no marcó ${pausa.regreso}`,
                // La consecuencia en plata, no solo el hecho: "no marcó" suena a
                // trámite, y lo que de verdad pasa es que no se le está pagando.
                cuerpo: `${pausa.salio} a las ${(0, date_fns_1.format)(z, 'HH:mm')} del ${(0, date_fns_1.format)(z, "d 'de' MMM", { locale: locale_1.es })} y no volvió a marcar. El resto de ese día no se le está contando ni pagando: revísalo y corrige la hora si siguió trabajando.`,
                entidad: 'registro',
                entidadId: s.id,
            });
            avisados++;
        }
        // Se registra SIEMPRE, también la pasada que no encontró nada: un trabajo que
        // solo habla cuando hace algo no se distingue de uno que nunca corrió
        // (CLAUDE.md §8.3).
        log?.info(`Pausas sin regreso: ${salidasAPausa.length} salidas revisadas, ${avisados} avisadas`);
        return avisados;
    }
    catch (err) {
        log?.error(err, 'Error avisando pausas sin regreso');
        return 0;
    }
}
