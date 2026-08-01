"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cerrarTurnosOlvidados = cerrarTurnosOlvidados;
const date_fns_1 = require("date-fns");
const locale_1 = require("date-fns/locale");
const date_fns_tz_1 = require("date-fns-tz");
const index_1 = require("../index");
const tardanzas_1 = require("./tardanzas");
const notificaciones_1 = require("./notificaciones");
const TZ = 'America/Bogota';
const DIAS_SEMANA = ['DOMINGO', 'LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO'];
const minutosDe = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };
// Margen después de la hora de salida programada antes de dar el turno por olvidado
// (evita cerrar a alguien que todavía está en su jornada, p. ej. un turno nocturno).
const GRACIA_MS = 2 * 60 * 60 * 1000;
// Sin horario definido no sabemos su hora de salida: solo lo cerramos si ya lleva
// demasiado abierto para ser una jornada real.
const MAX_TURNO_MS = 16 * 60 * 60 * 1000;
// Cierra turnos que quedaron abiertos en días ya pasados: pone como salida la hora
// de fin de la franja de ese colaborador y los marca `salidaEstimada` para que el
// admin los revise. No toca `tipo` (la liquidación del día sigue correcta).
// Idempotente: solo actúa sobre turnos aún abiertos, así que correr de más no daña.
async function cerrarTurnosOlvidados(log) {
    try {
        const ahora = new Date();
        const ahoraBog = (0, date_fns_tz_1.toZonedTime)(ahora, TZ);
        // 00:00 de hoy en Bogotá → solo miramos turnos que empezaron antes de hoy
        const inicioHoy = (0, date_fns_tz_1.fromZonedTime)(new Date(ahoraBog.getFullYear(), ahoraBog.getMonth(), ahoraBog.getDate(), 0, 0, 0), TZ);
        const abiertos = await index_1.prisma.registro.findMany({
            where: { entrada: { not: null, lt: inicioHoy }, salida: null, salidaEstimada: false },
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
            const zEnt = (0, date_fns_tz_1.toZonedTime)(entrada, TZ);
            const horario = r.colaborador.horario;
            const franja = horario?.activo ? (0, tardanzas_1.franjaDelDia)(horario, DIAS_SEMANA[zEnt.getDay()]) : null;
            let salida = null;
            if (franja) {
                const cruzaMedianoche = minutosDe(franja.horaSalida) <= minutosDe(franja.horaEntrada);
                const [hFin, mFin] = franja.horaSalida.split(':').map(Number);
                // Hora de salida programada, como instante real (día de la entrada, +1 si cruza medianoche)
                const finLocal = new Date(zEnt.getFullYear(), zEnt.getMonth(), zEnt.getDate() + (cruzaMedianoche ? 1 : 0), hFin, mFin, 0);
                const finProg = (0, date_fns_tz_1.fromZonedTime)(finLocal, TZ);
                // Si aún no ha pasado su salida + margen, sigue en jornada → no lo cerramos
                if (ahora.getTime() < finProg.getTime() + GRACIA_MS)
                    continue;
                salida = finProg;
            }
            else {
                // Sin franja: solo si lleva más de 16h abierto (no es una jornada en curso)
                if (ahora.getTime() - entrada.getTime() < MAX_TURNO_MS)
                    continue;
                salida = null; // sin hora que aplicar; el admin la pondrá
            }
            await index_1.prisma.registro.update({
                where: { id: r.id },
                data: {
                    ...(salida ? { salida } : {}),
                    salidaEstimada: true,
                    editadoPor: 'SISTEMA',
                    editadoEn: ahora,
                },
            });
            cerrados++;
            const nombre = `${r.colaborador.nombre} ${r.colaborador.apellido}`;
            const fechaTxt = (0, date_fns_1.format)(zEnt, "d 'de' MMM", { locale: locale_1.es });
            await (0, notificaciones_1.notificar)(r.colaborador.empresaId, {
                tipo: 'NO_MARCO_SALIDA',
                titulo: `${nombre} no marcó salida`,
                cuerpo: salida
                    ? `Se estimó su salida a las ${franja.horaSalida} del ${fechaTxt}. Revísala y confírmala.`
                    : `Quedó un turno abierto del ${fechaTxt} sin hora de salida. Corrígelo cuando puedas.`,
                entidad: 'registro',
                entidadId: r.id,
            });
        }
        if (cerrados > 0)
            log?.info(`Auto-cierre: ${cerrados} turno(s) sin salida marcados como estimados`);
        return cerrados;
    }
    catch (err) {
        log?.error(err, 'Error en el auto-cierre de turnos');
        return 0;
    }
}
