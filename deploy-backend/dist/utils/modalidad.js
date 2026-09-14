"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MODALIDAD_POR_DEFECTO = exports.MODALIDADES = void 0;
exports.normalizarModalidad = normalizarModalidad;
exports.decidirUbicacionDeMarca = decidirUbicacionDeMarca;
exports.puedeCerrarAqui = puedeCerrarAqui;
exports.normalizarPermisoOtraSede = normalizarPermisoOtraSede;
const geo_1 = require("./geo");
const sedes_1 = require("./sedes");
// Cómo trabaja una persona, y qué implica eso para su ubicación al marcar.
//
// Antes la geocerca era una regla de la EMPRESA: si estaba configurada, aplicaba
// a todos por igual, y quien trabajaba desde la casa no podía marcar nunca.
// Ahora la regla es de la PERSONA.
exports.MODALIDADES = ['PRESENCIAL', 'HIBRIDO', 'REMOTO'];
exports.MODALIDAD_POR_DEFECTO = 'PRESENCIAL';
// Lo que llega del cuerpo de una petición, que no está validado.
//
// Vacío o ausente cae en PRESENCIAL, que es como trabajaba todo el mundo antes
// de que este campo existiera. Pero un valor que NO se reconoce devuelve null y
// no se adivina: si un 'HIBRIDA' cayera en PRESENCIAL por defecto, alguien
// quedaría marcando con geocerca sin que nadie se enterara, y al revés es peor.
function normalizarModalidad(v) {
    if (v === undefined || v === null || v === '')
        return exports.MODALIDAD_POR_DEFECTO;
    return exports.MODALIDADES.includes(v) ? v : null;
}
const PASA_SIN_SEDE = { accion: 'PASA', sedeId: null };
function decidirUbicacionDeMarca(ctx) {
    const { modalidad, sedes, geocercaEmpresa, coords } = ctx;
    // No se le mira la ubicación, ni siquiera para anotarla.
    if (modalidad === 'REMOTO')
        return PASA_SIN_SEDE;
    if (modalidad === 'HIBRIDO') {
        // Nunca bloquea. Lo único que hace con las coordenadas es dejar constancia
        // de en qué sede estaba, cuando estaba en alguna. Sin coordenadas o fuera de
        // todas, marca igual y el registro no lleva sede: ese null ES el dato de que
        // ese día trabajó desde fuera.
        if (!coords || sedes.length === 0)
            return PASA_SIN_SEDE;
        const r = (0, sedes_1.resolverSedeDeMarcacion)(sedes, coords.lat, coords.lng);
        return { accion: 'PASA', sedeId: r.dentro ? (r.sede?.id ?? null) : null };
    }
    // PRESENCIAL: igual que siempre.
    //
    // Si tiene sedes asignadas manda la geocerca de SUS sedes: basta estar dentro
    // de cualquiera, porque quien rota entre locales marca en la que le toca ese
    // día. Si no tiene sedes, rige la geocerca única de la empresa.
    if (sedes.length > 0) {
        if (!coords)
            return { accion: 'EXIGIR_COORDENADAS' };
        const r = (0, sedes_1.resolverSedeDeMarcacion)(sedes, coords.lat, coords.lng);
        if (!r.dentro) {
            // Se nombra la sede más cercana y la distancia: "fuera de ubicación" a
            // secas no le dice a la persona qué hacer.
            return {
                accion: 'RECHAZAR',
                mensaje: `Estás a ${r.distancia} m de ${r.sede?.nombre}. Debes marcar desde una de tus sedes.`,
                distancia: r.distancia,
                radio: r.sede?.radio ?? 0,
            };
        }
        return { accion: 'PASA', sedeId: r.sede?.id ?? null };
    }
    if (geocercaEmpresa) {
        if (!coords)
            return { accion: 'EXIGIR_COORDENADAS' };
        const distancia = Math.round((0, geo_1.distanciaMetros)(coords.lat, coords.lng, geocercaEmpresa.lat, geocercaEmpresa.lng));
        if (distancia > geocercaEmpresa.radio) {
            return {
                accion: 'RECHAZAR',
                mensaje: `Estás fuera de la ubicación de la empresa (a ${distancia} m). Debes marcar desde el sitio de trabajo.`,
                distancia,
                radio: geocercaEmpresa.radio,
            };
        }
    }
    return PASA_SIN_SEDE;
}
function puedeCerrarAqui(ctx) {
    if (ctx.modalidad !== 'PRESENCIAL')
        return true;
    if (ctx.puedeCerrarEnOtraSede)
        return true;
    if (!ctx.sedeDelTurno || !ctx.sedeDeLaMarca)
        return true;
    return ctx.sedeDelTurno === ctx.sedeDeLaMarca;
}
// Lo que llega del cuerpo al crear o editar un colaborador.
//
// AUSENTE devuelve undefined, que Prisma lee como «no tocar». Si ausente fuera
// false, un formulario que no manda el campo le quitaría el permiso a un
// supervisor en silencio al corregirle cualquier otro dato.
//
// Y lo que no es un booleano devuelve null, para responder 400: POST y PUT pasan
// el cuerpo a Prisma sin lista blanca, así que un "true" en texto llegaría crudo
// y saldría como un 500 sin explicación.
function normalizarPermisoOtraSede(v) {
    if (v === undefined)
        return undefined;
    return typeof v === 'boolean' ? v : null;
}
