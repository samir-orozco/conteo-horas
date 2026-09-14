"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.lugaresDeTrabajo = lugaresDeTrabajo;
exports.lugaresConAtribucion = lugaresConAtribucion;
exports.apareceConFiltro = apareceConFiltro;
exports.resumirPorSede = resumirPorSede;
exports.nombrarLugares = nombrarLugares;
const sedePrincipal_1 = require("./sedePrincipal");
// Los lugares donde trabajó alguien, sin repetir: primero las sedes, ordenadas por
// id para que el resultado no dependa del orden de los turnos, y al final null.
//
// Una fila sin hora de entrada no es un lugar de trabajo (revisión del 11 de
// septiembre de 2026): un permiso cargado sin horas no guarda sede, y sumaba «Sin
// sede» a quien marcó todo el período en una sola, que salía mixto. Si la persona
// no tiene NINGUNA fila con entrada en el período se usan todas, como antes, para
// que nadie desaparezca del resumen. Eso queda para un híbrido o un remoto: a un
// presencial en ese caso lo resuelve `lugaresConAtribucion` (12 de septiembre de 2026).
function lugaresDeTrabajo(turnos) {
    const conEntrada = turnos.filter(t => t.entrada !== null);
    const sedes = new Set();
    let sinSede = false;
    for (const t of conEntrada.length > 0 ? conEntrada : turnos) {
        if (t.sedeId === null)
            sinSede = true;
        else
            sedes.add(t.sedeId);
        // La sede de salida suma un lugar solo cuando se CONOCE: una salida sin sede
        // es «no se sabe», no «cerró en otra parte». Es la misma regla con la que la
        // tabla de Registros decide si una jornada cruzó de sede (`cruzoDeSede`).
        if (t.sedeSalidaId !== null)
            sedes.add(t.sedeSalidaId);
    }
    const orden = [...sedes].sort();
    return sinSede ? [...orden, null] : orden;
}
// Los lugares de una persona con la sede que se le atribuye al leer, y cuáles de
// ellos no probó ninguna marca (decisión del dueño, 12 de septiembre de 2026).
//
// Un lugar atribuido cuenta en la línea de su sede, no en una aparte, y hace mixto a
// quien tenga más de una sede entre lo probado y lo atribuido. Va `porDefecto` solo
// el lugar que no probó ninguna marca, ni de entrada ni de salida: quien marcó una
// vez en Sur y el resto sin ubicación trabajó en Sur, y eso no es una suposición.
//
// Un presencial sin NINGUNA fila con hora de entrada en el período (por ejemplo, solo
// un permiso cargado sin horas) no tiene marcación a la cual atribuirle la sede, y
// salía «Sin sede» con su propia línea en el resumen. Cuenta en su sede por defecto,
// aunque alguna de esas filas conserve una sede: sin hora de entrada no es una
// marcación (revisión del 12 de septiembre de 2026). Sin sedes activas en la empresa
// queda «Sin sede». Quien no tiene ninguna fila no marcó, y sigue sin lugares.
function lugaresConAtribucion(filas, persona) {
    if (persona.modalidad === 'PRESENCIAL' && filas.length > 0 && filas.every(f => f.entrada === null)) {
        const id = persona.sedePorDefecto;
        return id === null ? { lugares: [null], porDefecto: [] } : { lugares: [id], porDefecto: [id] };
    }
    const deEntrada = (0, sedePrincipal_1.lugaresDeEntrada)(filas, persona);
    const lugares = lugaresDeTrabajo(filas.map((f, i) => ({ ...f, sedeId: deEntrada[i].id })));
    const probados = new Set(lugaresDeTrabajo(filas));
    return { lugares, porDefecto: lugares.filter((l) => l !== null && !probados.has(l)) };
}
// Sin filtro aparece todo el mundo, igual que siempre. Con filtro, quien trabajó
// en esa sede al menos una vez, aunque también haya trabajado en otra.
function apareceConFiltro(lugares, sedeId) {
    if (!sedeId)
        return true;
    return lugares.includes(sedeId);
}
const aCentavos = (n) => Math.round(n * 100) / 100;
function ceros(claves) {
    return Object.fromEntries(claves.map(k => [k, 0]));
}
function sumarEn(acumulado, fila, claves) {
    for (const k of claves)
        acumulado[k] = aCentavos(acumulado[k] + fila[k]);
}
// Una línea por sede con lo de quien trabajó ÚNICAMENTE en ella, una de mixtos y
// «Todas». Se arma sobre todas las filas, sin filtro: el resumen de la empresa no
// cambia según la sede que se esté mirando.
//
// Genérica en los montos porque sirve igual para extras (recargos, extra,
// adicional) que para llegadas tarde (días, minutos, monto).
function resumirPorSede(filas, claves, sedes) {
    const porLugar = new Map();
    const mixtos = ceros(claves);
    const todas = ceros(claves);
    for (const fila of filas) {
        sumarEn(todas, fila, claves);
        // Tres casos y no hay un cuarto: no marcó, marcó en un solo lugar, o en varios.
        if (fila.lugares.length === 0)
            continue; // sus montos son cero: solo cuenta en «Todas»
        if (fila.lugares.length > 1) {
            sumarEn(mixtos, fila, claves);
            continue;
        }
        const lugar = fila.lugares[0];
        if (!porLugar.has(lugar))
            porLugar.set(lugar, ceros(claves));
        sumarEn(porLugar.get(lugar), fila, claves);
    }
    const nombreDe = buscadorDeNombres(sedes);
    const lineas = [];
    // Una sede activa sale aunque esté en cero: «¿cuánto costó Centro?» se responde
    // con $0, no con una sede que desaparece. Una desactivada sin nadie no sale.
    for (const s of sedes) {
        if (s.activa && !porLugar.has(s.id))
            lineas.push({ id: s.id, nombre: s.nombre, ...ceros(claves) });
    }
    // Donde alguien trabajó sale siempre: una sede desactivada conserva lo que se
    // trabajó ahí, y una que no está en la lista va sin nombre. Si se perdiera, las
    // líneas dejarían de dar el total y nadie lo notaría.
    for (const [lugar, sumas] of porLugar) {
        lineas.push({ id: lugar, nombre: nombreDe(lugar), ...sumas });
    }
    return { porSede: enOrdenDeLectura(lineas), mixtos, todas };
}
// Los lugares de una fila, con nombre y en orden de lectura. «Sin sede» lo
// escribe la pantalla: aquí es `id: null`. `porDefecto` le dice que escriba «por
// defecto» junto a una sede que solo existe por atribución.
function nombrarLugares(lugares, sedes, porDefecto) {
    const nombreDe = buscadorDeNombres(sedes);
    return enOrdenDeLectura(lugares.map(id => ({ id, nombre: nombreDe(id), porDefecto: id !== null && porDefecto.includes(id) })));
}
function buscadorDeNombres(sedes) {
    const nombres = new Map(sedes.map(s => [s.id, s.nombre]));
    return lugar => (lugar === null ? null : nombres.get(lugar) ?? null);
}
// El mismo orden en las filas y en el resumen: las sedes por nombre, después las
// que no están en la lista de la empresa, y al final lo que no tiene sede.
function enOrdenDeLectura(items) {
    const conNombre = items.filter(i => i.nombre !== null).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
    const desconocidas = items.filter(i => i.id !== null && i.nombre === null);
    const sinSede = items.filter(i => i.id === null);
    return [...conNombre, ...desconocidas, ...sinSede];
}
