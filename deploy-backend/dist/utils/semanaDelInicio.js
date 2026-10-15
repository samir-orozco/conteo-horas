"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ventanaDelInicio = ventanaDelInicio;
exports.armarSemanaDelInicio = armarSemanaDelInicio;
const tardanzas_1 = require("./tardanzas");
const diasEsperados_1 = require("./diasEsperados");
const asistencia_1 = require("./asistencia");
const llegadasTardePorDia_1 = require("./llegadasTardePorDia");
const fechas_1 = require("./fechas");
// La semana del Inicio (15 de octubre de 2026): la asistencia de lunes a domingo, las llegadas tarde
// de los últimos 7 días y «Aún no han marcado entrada», con UNA regla —quién debía venir lo dice
// utils/asistencia.ts y quién llegó tarde, `calcularTardanzas`, la misma del reporte—. Esta función
// no consulta nada: recibe lo que la ruta leyó, para poder probarse entera (CLAUDE.md §8.2).
const DIA_MS = 24 * 60 * 60 * 1000;
// Qué días hacen falta: de hoy − 6 (las llegadas tarde) o del lunes (la asistencia), lo que sea más
// viejo, hasta el domingo de esta semana. Las fechas son medianoches de Bogotá (§4).
function ventanaDelInicio(ahora) {
    const { inicioDia, finDia } = (0, fechas_1.rangoDiaBogota)(ahora);
    const { lunes, finExclusivo } = (0, fechas_1.rangoSemanaBogota)(inicioDia);
    const hace6 = new Date(inicioDia.getTime() - 6 * DIA_MS);
    const claves = (desde) => Array.from({ length: 7 }, (_, i) => (0, fechas_1.claveDiaBogota)(new Date(desde.getTime() + i * DIA_MS)));
    return {
        inicio: hace6 < lunes ? hace6 : lunes,
        fin: finExclusivo,
        inicioDia, finDia,
        claves7: claves(hace6),
        clavesSemana: claves(lunes),
    };
}
function armarSemanaDelInicio(e) {
    const v = ventanaDelInicio(e.ahora);
    const hoy = (0, fechas_1.claveDiaBogota)(e.ahora);
    const festivos = new Set(e.festivos.map(f => (0, fechas_1.claveDiaBogota)(f.fecha)));
    const de = (filas) => {
        const m = new Map();
        for (const f of filas)
            m.set(f.colaboradorId, [...(m.get(f.colaboradorId) ?? []), f]);
        return (id) => m.get(id) ?? [];
    };
    const materializadosDe = de(e.materializados);
    const marcasDe = de(e.marcas.filter(m => m.entrada));
    const novedadesDe = de(e.novedades);
    const en7 = new Set(v.claves7);
    const personas = [];
    const tardanzas = [];
    const sinMarcarHoy = [];
    for (const c of e.colaboradores) {
        const dias = (0, diasEsperados_1.diasParaMedir)(v.inicio, v.fin, materializadosDe(c.id), c.horario);
        const porClave = new Map((dias ?? []).map(d => [(0, fechas_1.claveDiaBogota)(d.fecha), d]));
        const marcas = marcasDe(c.id);
        const novedades = novedadesDe(c.id);
        const llegoEn = new Set(marcas.map(m => (0, fechas_1.claveDiaBogota)(m.fecha)));
        const huecos = (0, asistencia_1.huecosDelVinculo)(c.vinculo ?? []);
        personas.push({ id: c.id, creadoEn: c.creadoEn, huecos, dias: porClave, llegoEn, novedades });
        if (dias) {
            const delDia = (fecha) => en7.has((0, fechas_1.claveDiaBogota)(fecha));
            tardanzas.push({ colaboradorId: c.id, detalle: (0, tardanzas_1.calcularTardanzas)(marcas.filter(m => delDia(m.fecha)), dias.filter(d => delDia(d.fecha)), e.festivos, novedades).detalle });
        }
        const diaHoy = porClave.get(hoy) ?? null;
        const estado = (0, asistencia_1.estadoDeAsistencia)({
            dia: diaHoy, inicioDia: v.inicioDia, llego: llegoEn.has(hoy), creadoEn: c.creadoEn, festivo: festivos.has(hoy), novedades, ahora: e.ahora, huecos,
        });
        if ((estado === 'FALTA' || estado === 'NOVEDAD') && diaHoy?.horaEntrada) {
            const horaEntrada = diaHoy.horaEntrada;
            sinMarcarHoy.push({
                id: c.id, nombre: `${c.nombre} ${c.apellido}`, cargo: c.cargo,
                horario: c.horario?.activo ? c.horario.nombre : 'Turno programado',
                horaEntrada,
                novedad: estado === 'NOVEDAD' ? (novedades.find(n => (0, tardanzas_1.excusaLaTardanza)(n, v.inicioDia, horaEntrada))?.tipo ?? null) : null,
            });
        }
    }
    const asistencia7 = (0, asistencia_1.asistenciaPorDia)(v.claves7, e.ahora, personas, festivos);
    const llegadas = (0, llegadasTardePorDia_1.llegadasTardePorDia)(v.claves7, tardanzas).map((d, i) => {
        const a = asistencia7[i];
        return { ...d, fecha: a.fecha, esHoy: a.esHoy, festivo: a.festivo, debian: a.debian, llegaron: a.llegaron, enTiempo: a.enTiempo, conNovedad: a.conNovedad };
    });
    const nombreDe = new Map(e.colaboradores.map(c => [c.id, `${c.nombre} ${c.apellido}`]));
    const deHoy = llegadas.find(d => d.clave === hoy);
    return {
        asistenciaSemana: { dias: (0, asistencia_1.asistenciaPorDia)(v.clavesSemana, e.ahora, personas, festivos) },
        llegadasTarde7d: { dias: llegadas },
        sinMarcarHoy,
        // El Inicio anterior lee este campo (y prisma/verificar-novedad-parcial.ts): se sigue mandando,
        // derivado del mismo cálculo, mientras dure la ventana de despliegue.
        llegadasTardeHoy: (deHoy?.personas ?? []).map(p => ({ id: p.id, nombre: nombreDe.get(p.id) ?? '', horaLlegada: p.horaLlegada, minutosTarde: p.minutosTarde })),
    };
}
