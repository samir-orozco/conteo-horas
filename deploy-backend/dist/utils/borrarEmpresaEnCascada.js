"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LOTE_BORRADO = void 0;
exports.borrarEmpresaEnCascada = borrarEmpresaEnCascada;
const lotes_1 = require("./lotes");
// La plomería del borrado de una empresa: veinte tablas, de las hojas a la raíz.
//
// Va en su propio archivo, aparte de `eliminarEmpresa.ts`, por la regla de la
// sección 8.2 de CLAUDE.md: aquel tiene la DECISIÓN y está al 100%; esto habla
// con MySQL y no va a llegar al 80% ni tiene por qué. Se verifica con
// `prisma/verificar-eliminar-empresa.ts`, que crea una empresa de mentira y una
// testigo, llama a ESTA función y comprueba por id lo que quedó.
//
// Recibe el cliente de transacción en vez de importar `prisma`: así el que llama
// decide la transacción, y el script de verificación puede correr la función
// real sin levantar Fastify (sección 8.5).
//
// CÓMO BORRA, Y POR QUÉ ASÍ. Primero junta los ids con lecturas normales, que no
// bloquean nada, y después borra POR ID y EN LOTES. Medido el 10 de septiembre de
// 2026 en la revisión adversarial, sobre MySQL 9.7 y MariaDB 12.3:
//   - Un DELETE ... WHERE colaboradorId IN (...) o WHERE sedeId IN (...) hacía que
//     el motor recorriera la tabla de TODAS las empresas y la dejara bloqueada
//     hasta el commit: el kiosco de las demás esperaba entre 112 y 650 ms. Borrar
//     por clave primaria bloquea solo las filas de esta empresa.
//   - Un IN con más de 65.535 ids revienta el límite de marcadores: una empresa
//     con más marcaciones que eso no se podía eliminar.
//
// El orden no es estético. Casi todas las llaves hacia `empresas` y
// `colaboradores` están en RESTRICT: borrar el padre sin limpiar antes falla. Y
// dos, `usuarios` y `dias_festivos`, están en SET NULL: si se olvidaran, borrar la
// empresa NO fallaría y dejaría un admin huérfano y un festivo de todas las
// empresas.
exports.LOTE_BORRADO = 1000;
async function borrarEmpresaEnCascada(tx, empresaId, { lote = exports.LOTE_BORRADO } = {}) {
    // Lo primero es el candado sobre la fila de la empresa, ANTES de juntar ids.
    // Las lecturas de abajo ven la foto del principio de la transacción: sin el
    // candado, un festivo o un usuario que la empresa creara a mitad del borrado
    // no se veía, y la llave SET NULL lo dejaba sin empresa, o sea un festivo
    // para TODAS las empresas. Con el candado, toda inserción en una tabla hija
    // espera y después falla por la llave. `registros` no tiene llave hacia
    // `empresas`, así que el candado no se cruza con el kiosco de nadie.
    //
    // Si la empresa ya no está (otra pestaña la borró primero), devuelve null.
    const existe = await tx.$queryRaw `SELECT id FROM empresas WHERE id = ${empresaId} FOR UPDATE`;
    if (existe.length === 0)
        return null;
    const borrado = {};
    const ids = (filas) => filas.map(f => f.id);
    const enLotes = async (tabla, lista, borrar) => {
        let n = 0;
        for (const parte of (0, lotes_1.partirEnLotes)(lista, lote))
            n += (await borrar(parte)).count;
        borrado[tabla] = (borrado[tabla] ?? 0) + n;
    };
    const deSuGente = { colaborador: { empresaId } };
    const deSusSedes = { sede: { empresaId } };
    const unicos = (...listas) => [...new Set(listas.flat().map(f => f.id))];
    const colaboradores = ids(await tx.colaborador.findMany({ where: { empresaId }, select: { id: true } }));
    const sedes = ids(await tx.sede.findMany({ where: { empresaId }, select: { id: true } }));
    const horarios = ids(await tx.horario.findMany({ where: { empresaId }, select: { id: true } }));
    await enLotes('prorrogas_contrato', ids(await tx.prorrogaContrato.findMany({ where: { contrato: deSuGente }, select: { id: true } })), parte => tx.prorrogaContrato.deleteMany({ where: { id: { in: parte } } }));
    await enLotes('contratos', ids(await tx.contrato.findMany({ where: deSuGente, select: { id: true } })), parte => tx.contrato.deleteMany({ where: { id: { in: parte } } }));
    await enLotes('vinculacion_eventos', ids(await tx.vinculacionEvento.findMany({ where: deSuGente, select: { id: true } })), parte => tx.vinculacionEvento.deleteMany({ where: { id: { in: parte } } }));
    await enLotes('dias_esperados', ids(await tx.diaEsperado.findMany({ where: deSuGente, select: { id: true } })), parte => tx.diaEsperado.deleteMany({ where: { id: { in: parte } } }));
    // Las marcaciones de su gente y las que se hicieron en sus sedes, en lecturas
    // separadas. Con un OR, Prisma arma dos LEFT JOIN que el motor no puede usar
    // desde ningún índice y recorre la tabla de todas las empresas: medido en la
    // revisión, 3,2 s con un millón de marcaciones contra medio milisegundo
    // partida.
    await enLotes('registro_cambios', unicos(await tx.registroCambio.findMany({ where: { registro: deSuGente }, select: { id: true } }), await tx.registroCambio.findMany({ where: { registro: deSusSedes }, select: { id: true } })), parte => tx.registroCambio.deleteMany({ where: { id: { in: parte } } }));
    await enLotes('permisos', ids(await tx.permiso.findMany({ where: deSuGente, select: { id: true } })), parte => tx.permiso.deleteMany({ where: { id: { in: parte } } }));
    await enLotes('registros', unicos(await tx.registro.findMany({ where: deSuGente, select: { id: true } }), await tx.registro.findMany({ where: deSusSedes, select: { id: true } })), parte => tx.registro.deleteMany({ where: { id: { in: parte } } }));
    // Llave compuesta, sin id: se borra por colaborador y por sede, que son el
    // comienzo de su clave y de su índice.
    await enLotes('colaboradores_sedes', colaboradores, parte => tx.colaboradorSede.deleteMany({ where: { colaboradorId: { in: parte } } }));
    await enLotes('colaboradores_sedes', sedes, parte => tx.colaboradorSede.deleteMany({ where: { sedeId: { in: parte } } }));
    await enLotes('colaboradores', colaboradores, parte => tx.colaborador.deleteMany({ where: { id: { in: parte } } }));
    await enLotes('sedes', sedes, parte => tx.sede.deleteMany({ where: { id: { in: parte } } }));
    // Después de colaboradores: `colaboradores.horarioId` los apunta.
    await enLotes('franjas_horario', ids(await tx.franjaHorario.findMany({ where: { horario: { empresaId } }, select: { id: true } })), parte => tx.franjaHorario.deleteMany({ where: { id: { in: parte } } }));
    await enLotes('horarios', horarios, parte => tx.horario.deleteMany({ where: { id: { in: parte } } }));
    await enLotes('dispositivos_kiosco', ids(await tx.dispositivoKiosco.findMany({ where: { empresaId }, select: { id: true } })), parte => tx.dispositivoKiosco.deleteMany({ where: { id: { in: parte } } }));
    await enLotes('dias_festivos', ids(await tx.diaFestivo.findMany({ where: { empresaId }, select: { id: true } })), parte => tx.diaFestivo.deleteMany({ where: { id: { in: parte } } }));
    await enLotes('configuracion', ids(await tx.configuracion.findMany({ where: { empresaId }, select: { id: true } })), parte => tx.configuracion.deleteMany({ where: { id: { in: parte } } }));
    await enLotes('notificaciones', ids(await tx.notificacion.findMany({ where: { empresaId }, select: { id: true } })), parte => tx.notificacion.deleteMany({ where: { id: { in: parte } } }));
    await enLotes('usuarios', ids(await tx.usuario.findMany({ where: { empresaId }, select: { id: true } })), parte => tx.usuario.deleteMany({ where: { id: { in: parte } } }));
    // Antes que los pagos: cada comisión apunta a su pago.
    await enLotes('comisiones', ids(await tx.comision.findMany({ where: { empresaId }, select: { id: true } })), parte => tx.comision.deleteMany({ where: { id: { in: parte } } }));
    const suscripcion = await tx.suscripcion.findUnique({ where: { empresaId }, select: { id: true } });
    if (suscripcion) {
        await enLotes('pagos', ids(await tx.pago.findMany({ where: { suscripcionId: suscripcion.id }, select: { id: true } })), parte => tx.pago.deleteMany({ where: { id: { in: parte } } }));
        borrado.suscripciones = (await tx.suscripcion.deleteMany({ where: { id: suscripcion.id } })).count;
    }
    borrado.empresas = (await tx.empresa.deleteMany({ where: { id: empresaId } })).count;
    return borrado;
}
