"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sedePrincipal = sedePrincipal;
exports.sedePorDefecto = sedePorDefecto;
exports.lugaresDeEntrada = lugaresDeEntrada;
const fechas_1 = require("./fechas");
// El id desempata dos sedes creadas en el mismo instante, para que la principal
// no dependa del orden en que las devuelva la base.
function masAntiguaPrimero(a, b) {
    const porFecha = a.creadoEn.getTime() - b.creadoEn.getTime();
    if (porFecha !== 0)
        return porFecha;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}
function sedePrincipal(sedes) {
    return sedes.filter(s => s.activa).sort(masAntiguaPrimero)[0]?.id ?? null;
}
// La sede por defecto de una persona: su única sede activa; con varias, la más
// antigua de las suyas, y no la principal de la empresa, donde quizá no trabaja; sin
// ninguna, la Sede principal, que se le muestra sin asignársela («mostrar la
// principal», 12 de septiembre de 2026). Null solo si la empresa no tiene ninguna
// sede activa.
function sedePorDefecto(suyas, deLaEmpresa) {
    return sedePrincipal(suyas) ?? sedePrincipal(deLaEmpresa);
}
const comoEsta = (f) => ({ id: f.sedeId, porDefecto: false });
// Dónde se abrió cada fila de UNA persona, en el orden en que llegan.
//
// Una sede guardada, de entrada o de salida, la probó la ubicación y se usa tal
// cual. Solo a un PRESENCIAL, y solo en una fila con hora de entrada y sin sede de
// entrada, se le atribuye una, marcada `porDefecto`, con la primera pista que haya:
//   a) la sede de salida de la misma fila;
//   b) la de la fila de ese mismo día de Bogotá que entró más temprano con alguna
//      sede probada, la de entrada antes que la de salida;
//   c) su sede por defecto (`sedePorDefecto`).
// Sin ninguna, queda sin sede. Una fila sin hora de entrada no es una marcación: no
// recibe sede ni le da la pista a otra.
function lugaresDeEntrada(filas, persona) {
    if (persona.modalidad !== 'PRESENCIAL')
        return filas.map(comoEsta);
    const pistaDelDia = primeraSedeProbadaDeCadaDia(filas);
    return filas.map(f => {
        if (f.sedeId !== null || f.entrada === null)
            return comoEsta(f);
        const id = f.sedeSalidaId ?? pistaDelDia.get(diaDeBogota(f.fecha)) ?? persona.sedePorDefecto;
        return id === null ? comoEsta(f) : { id, porDefecto: true };
    });
}
// El día de una fila es el de su `fecha` en Bogotá, que es el de la jornada: el
// regreso del almuerzo de un turno nocturno queda anclado al día en que se entró.
const diaDeBogota = (fecha) => (0, fechas_1.rangoDiaBogota)(fecha).inicioDia.getTime();
// Por día, la sede probada de la fila que entró más temprano. Si dos entraron en el
// mismo instante decide el id de la sede, para que no dependa del orden de la base.
function primeraSedeProbadaDeCadaDia(filas) {
    const primera = new Map();
    for (const f of filas) {
        const sede = f.sedeId ?? f.sedeSalidaId;
        if (f.entrada === null || sede === null)
            continue;
        const dia = diaDeBogota(f.fecha);
        const entrada = f.entrada.getTime();
        const actual = primera.get(dia);
        if (!actual || entrada < actual.entrada || (entrada === actual.entrada && sede < actual.sede)) {
            primera.set(dia, { entrada, sede });
        }
    }
    return new Map([...primera].map(([dia, p]) => [dia, p.sede]));
}
