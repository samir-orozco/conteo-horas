"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DIAS_DEL_AVISO_COMERCIAL = exports.DIAS_DE_LA_AGENDA = void 0;
exports.armarAgenda = armarAgenda;
const fechas_1 = require("./fechas");
// «PRÓXIMOS DÍAS» EN EL INICIO (15 de octubre de 2026). Reemplaza a las tarjetas de festivos y cumpleaños: una sola
// lista, por fecha, de lo que viene en los próximos 30 días. Decisiones del dueño: festivos, cumpleaños, contratos y
// el pago; el pago solo en su última semana, solo para el administrador y sin montos.
//
// Cada evento lleva su día como medianoche de Bogotá (05:00Z), como todas las fechas del Inicio, y `enDias` contado
// desde hoy en Bogotá: así la pantalla no depende del reloj de quien la mira para decir «hoy» o «mañana».
exports.DIAS_DE_LA_AGENDA = 30;
// Lo comercial (el vencimiento de la suscripción, el fin de la prueba del clima) se anuncia en su última semana: hoy
// y los seis días siguientes.
exports.DIAS_DEL_AVISO_COMERCIAL = 7;
const DIA_MS = 24 * 60 * 60 * 1000;
// El mismo día, lo que pide hacer algo antes que lo que se celebra.
const ORDEN = {
    SUSCRIPCION_VENCE: 0, PRUEBA_CLIMA_TERMINA: 1, CONTRATO_PREAVISO: 2, CONTRATO_SE_PRORROGA: 3, FESTIVO: 4, CUMPLEANOS: 5,
};
function armarAgenda(e) {
    const hoy = (0, fechas_1.medianocheBogota)((0, fechas_1.claveDiaBogota)(e.ahora));
    const enDiasDe = (dia) => Math.round((dia.getTime() - hoy.getTime()) / DIA_MS);
    // El día de Bogotá de un instante, a cualquier hora: el motor de contratos guarda algunas fechas al mediodía.
    const diaDe = (d) => (0, fechas_1.medianocheBogota)((0, fechas_1.claveDiaBogota)(d));
    const eventos = [];
    const agregar = (dia, ev, hasta = exports.DIAS_DE_LA_AGENDA - 1) => {
        const enDias = enDiasDe(dia);
        if (enDias >= 0 && enDias <= hasta)
            eventos.push({ dia, enDias, ...ev });
    };
    // Un festivo propio con el mismo nombre y día que uno nacional sale una sola vez, como de la empresa: la base no lo
    // impide, porque el nacional no tiene empresa (revisión adversarial del 15 de octubre de 2026).
    const festivos = new Map();
    for (const f of e.festivos) {
        const dia = diaDe(f.fecha);
        const clave = `${dia.getTime()}|${f.nombre}`;
        festivos.set(clave, { dia, nombre: f.nombre, propio: (festivos.get(clave)?.propio ?? false) || f.empresaId !== null });
    }
    for (const f of festivos.values())
        agregar(f.dia, { tipo: 'FESTIVO', nombre: f.nombre, propio: f.propio });
    const anioHoy = hoy.getUTCFullYear();
    for (const p of e.personas) {
        if (!p.fechaNacimiento)
            continue;
        const mes = p.fechaNacimiento.getUTCMonth();
        const dia = p.fechaNacimiento.getUTCDate();
        // El cumpleaños en un año dado. Quien nació un 29 de febrero lo celebra el 28 en un año que no es bisiesto:
        // Date.UTC(2027, 1, 29) sería el 1 de marzo.
        const en = (anio) => {
            const bisiesto = new Date(Date.UTC(anio, 1, 29)).getUTCMonth() === 1;
            return new Date(Date.UTC(anio, mes, mes === 1 && dia === 29 && !bisiesto ? 28 : dia, 5));
        };
        const esteAnio = en(anioHoy);
        agregar(esteAnio < hoy ? en(anioHoy + 1) : esteAnio, { tipo: 'CUMPLEANOS', colaboradorId: p.id, nombre: p.nombre });
    }
    for (const c of e.contratos) {
        // Un caso por estado y un default explícito (§9.4): el motor de contratos puede sumar estados.
        switch (c.estado) {
            case 'POR_VENCER':
                // Su vencimiento cae 30 días después de este último día para avisar: siempre fuera de la ventana.
                agregar(diaDe(c.limitePreaviso), { tipo: 'CONTRATO_PREAVISO', colaboradorId: c.colaboradorId, nombre: c.colaborador });
                break;
            case 'PREAVISO_VENCIDO':
                agregar(diaDe(c.vence), { tipo: 'CONTRATO_SE_PRORROGA', colaboradorId: c.colaboradorId, nombre: c.colaborador });
                break;
            case 'VENCIDO': // ya pasó: está en los pendientes
            default:
                break;
        }
    }
    if (e.esAdministrador) {
        // Las fechas de la suscripción y de la prueba son el FIN exclusivo: el día que se anuncia es el último cubierto.
        // Ya vencida no se anuncia: en mora el panel muestra su propio aviso, que bloquea.
        const s = e.suscripcion;
        if (s && !e.exentaPago && s.estado !== 'CANCELADA') {
            const vence = s.pagadoHasta ?? s.finPrueba;
            if (e.ahora < vence) {
                agregar(diaDe(new Date(vence.getTime() - 1)), { tipo: 'SUSCRIPCION_VENCE', eraPrueba: !s.pagadoHasta }, exports.DIAS_DEL_AVISO_COMERCIAL - 1);
            }
        }
        if (e.pruebaDelClima && e.ahora < e.pruebaDelClima.hasta) {
            agregar(diaDe(new Date(e.pruebaDelClima.hasta.getTime() - 1)), { tipo: 'PRUEBA_CLIMA_TERMINA' }, exports.DIAS_DEL_AVISO_COMERCIAL - 1);
        }
    }
    const nombreDe = (ev) => ('nombre' in ev ? ev.nombre : '');
    return eventos.sort((a, b) => a.dia.getTime() - b.dia.getTime() || ORDEN[a.tipo] - ORDEN[b.tipo] || nombreDe(a).localeCompare(nombreDe(b), 'es'));
}
