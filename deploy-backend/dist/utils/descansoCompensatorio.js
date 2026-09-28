"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.decisionValida = decisionValida;
exports.claseValida = claseValida;
exports.decisionDelDia = decisionDelDia;
exports.opcionesDeCompensacion = opcionesDeCompensacion;
exports.revisionDeDecision = revisionDeDecision;
// Un caso por valor y un `default` explícito, aunque hoy solo haya tres: CLAUDE.md §9.4. La
// pregunta «de qué tipo es esto» no se responde con un `? :` que suponga lo que no es lo uno.
// La decisión tal como viene de la base, estrechada.
//
// `descansos_trabajados.decision` es VARCHAR a propósito: un cuarto valor no puede obligar a un
// ALTER de una tabla con datos (misma razón que `colaboradores.descansoTipo`). El precio es que la
// columna PUEDE tener cualquier cosa, así que se valida al leer en vez de afirmarle a TypeScript que
// confíe.
//
// Salió de un error de compilación real y no de una precaución teórica: la ruta le pasaba el
// `string` crudo a `revisionDeDecision` y `tsc` lo rechazó. Taparlo con un `as` habría afirmado una
// garantía que la columna no da.
//
// LO QUE NO SE RECONOCE CAE A `PENDIENTE`, que es el lado seguro: significa «nadie ha resuelto
// esto», así que el día sale a revisión en vez de darse por cerrado en silencio. Misma doctrina que
// `diaValido` y `estadoDescansoDe`: un valor raro nunca deja a nadie sin lo que le corresponde.
function decisionValida(valor) {
    if (typeof valor !== 'string')
        return 'PENDIENTE';
    const limpio = valor.trim().toUpperCase();
    return limpio === 'DINERO' || limpio === 'COMPENSATORIO' ? limpio : 'PENDIENTE';
}
// La clase CONGELADA tal como viene de la base, estrechada.
//
// Misma historia que `decisionValida`: la columna es VARCHAR y puede tener cualquier cosa. La ruta
// tenía aquí un `as Parameters<typeof revisionDeDecision>[0]['claseAlDecidir']`, que afirmaba una
// garantía que la columna no da.
//
// PERO CAE A UN LADO DISTINTO, y la diferencia no es de estilo:
//
//   `decisionValida` cae a PENDIENTE  -> lo desconocido SALE A REVISIÓN.
//   `claseValida`    cae a null       -> lo desconocido NO INVENTA UNA COMPARACIÓN.
//
// Si esta cayera a una clase, `revisionDeDecision` compararía la clase actual contra algo que nadie
// guardó y marcaría «revisar compensatorio» en meses que nadie tocó. Un aviso falso sobre plata que
// quizá se debe es peor que no avisar: manda a buscar lo que no falta, y enseña a ignorar los avisos.
function claseValida(valor) {
    if (typeof valor !== 'string')
        return null;
    const limpio = valor.trim().toUpperCase();
    return limpio === 'NINGUNO' || limpio === 'OCASIONAL' || limpio === 'HABITUAL' ? limpio : null;
}
// QUÉ MARCA LLEVA LA CELDA DEL CALENDARIO (22 de septiembre de 2026).
//
// Pedido del dueño: que se vea si la decisión está pendiente. Hasta hoy un descanso trabajado se
// pintaba ámbar y nada decía si ya se había resuelto qué hacer con él, así que había que abrir el
// modal uno por uno para saberlo.
//
// LA REGLA QUE NO ES OBVIA: un descanso trabajado SIN fila guardada está PENDIENTE, no «sin
// decisión». La fila nace cuando alguien decide, así que su ausencia significa que nadie lo hizo
// todavía, y eso es justo lo que hay que mostrar. Confundir «no hay fila» con «no aplica»
// escondería exactamente los días que falta atender.
//
// Y un día que NO es descanso trabajado devuelve `null`: marcarlo pendiente sería pedir una
// decisión sobre un día que no la necesita.
//
// Se apoya en `decisionValida` en vez de repetir el estrechamiento: es la misma columna VARCHAR y
// la misma guarda, y una segunda copia es como se separan (CLAUDE.md §9.3).
function decisionDelDia(esDescansoTrabajado, guardada) {
    if (esDescansoTrabajado !== true)
        return null;
    return decisionValida(guardada);
}
function opcionesDeCompensacion(clase) {
    switch (clase) {
        case 'OCASIONAL':
            return { opciones: ['DINERO', 'COMPENSATORIO'], eligeElTrabajador: true };
        case 'HABITUAL':
            // Sin opciones: el compensatorio va ADEMÁS del dinero. Lo único que queda por registrar es en
            // qué día cae.
            return { opciones: ['COMPENSATORIO'], eligeElTrabajador: false };
        case 'NINGUNO':
            return { opciones: [], eligeElTrabajador: false };
        default:
            return { opciones: [], eligeElTrabajador: false };
    }
}
function revisionDeDecision(estado) {
    if (estado.decision === 'PENDIENTE')
        return 'SIN_DECIDIR';
    // Eligió dinero cuando podía elegir, y ahora ya no podría. Es el aviso que el dueño pidió.
    if (estado.decision === 'DINERO'
        && estado.claseAlDecidir === 'OCASIONAL'
        && estado.claseActual === 'HABITUAL') {
        return 'REVISAR_COMPENSATORIO';
    }
    // El camino inverso, y existe porque el modal se puede editar libremente: si alguien corrige el
    // tercer descanso, el mes deja de ser habitual y el día libre que se dio por obligatorio ya no lo
    // era. NO se le quita a nadie un día concedido: se marca para que una persona lo mire.
    if (estado.decision === 'COMPENSATORIO'
        && estado.claseAlDecidir === 'HABITUAL'
        && estado.claseActual !== 'HABITUAL') {
        return 'REVISAR_SOBRANTE';
    }
    return 'AL_DIA';
}
