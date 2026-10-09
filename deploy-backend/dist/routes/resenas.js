"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.olvidarResenasPublicas = olvidarResenasPublicas;
exports.default = resenaRoutes;
exports.resenasAdminRoutes = resenasAdminRoutes;
const prisma_1 = require("../prisma");
const resenas_1 = require("../utils/resenas");
const revisionPendiente_1 = require("../utils/revisionPendiente");
const suscripcion_1 = require("../utils/suscripcion");
// Las reseñas de clientes (7 de octubre de 2026). El requerimiento, regla por regla, está en
// docs/RESENAS.md; las decisiones, en utils/resenas.ts con sus pruebas. Aquí solo se lee la base, se
// llama a esas funciones y se escribe. Lo que responde cada ruta está en resenas.test.ts.
//
// Este archivo tiene DOS plugins con permisos distintos, como eventos.ts:
//
// - `resenaRoutes`, bajo /api/resenas: la ventana del panel (de la EMPRESA, y de esa empresa sola) y
//   el carrusel de la landing (PÚBLICO, de solo lectura).
// - `resenasAdminRoutes`, bajo /api/admin/resenas: el super admin, que es el único que publica.
//
// POST /api/resenas queda fuera de la auditoría automática (utils/auditoriaDePeticion.ts): copiaría
// el nombre y el texto a un registro que no se borra, adonde «Quitar el nombre» no llega.
// Los pagos, con lo único que miran `elegibleParaResena` y `mesesPagados`.
const PAGOS = { select: { estado: true, monto: true, periodoInicio: true } };
const esError = (codigo) => (e) => typeof e === 'object' && e !== null && e.code === codigo;
// La llave única de `empresaId`: esa empresa ya tiene su reseña (D1).
const esDuplicado = esError('P2002');
// La llave hacia `empresas`: la empresa se borró entre la comprobación y la escritura.
const esEmpresaInexistente = esError('P2003');
// La firma, recortada al tope de su columna. Un nombre de usuario o de empresa puede tener hasta 191
// caracteres, y la opción completa no cabría en `textoAutorizacion` (300). Se recorta ANTES de armar
// los textos, para que lo que muestra la ventana sea lo mismo que se guarda y se publica. En
// caracteres y no en unidades de UTF-16, igual que MySQL.
const recortar = (texto, tope) => Array.from(texto.trim()).slice(0, tope).join('');
const firmaDe = (usuario, empresa) => ({
    nombre: recortar(usuario.nombre, 120),
    empresa: recortar(empresa.nombre, 160),
});
// ===== La caché de la landing =====
//
// Cada visita a la landing pide reseñas, y lo publicado cambia pocas veces al mes. Se guarda la lista
// entera de las publicadas durante un minuto y en cada petición se eligen 15 al azar sobre ella.
//
// En la memoria de ESTE proceso: el hosting corre uno solo. Lo que cambia el super admin la vacía en
// el acto (R21: ocultar la saca de la landing en el acto). Lo que no pasa por aquí —borrar una empresa
// con su reseña publicada— tarda a lo sumo un minuto en salir.
//
// El contador de vaciados existe por una carrera: una consulta que salió ANTES de que se ocultara una
// reseña puede volver DESPUÉS, y sin él dejaría la lista vieja guardada otro minuto.
//
// EXPLAIN de la consulta que genera Prisma, en el MySQL 9.7 local el 8 de octubre de 2026 (§8.4):
// «Index lookup on resenas using resenas_estado_idx (estado = 'PUBLICADA')». Sin ese índice sería un
// recorrido de la tabla entera en cada vencimiento.
const VIGENCIA_DE_LA_CACHE_MS = 60000;
let cache = null;
let vaciados = 0;
function olvidarResenasPublicas() {
    cache = null;
    vaciados++;
}
async function tarjetasPublicadas() {
    const ahora = Date.now();
    if (cache && cache.vence > ahora)
        return cache.tarjetas;
    const alEmpezar = vaciados;
    const filas = await prisma_1.prisma.resena.findMany({
        where: { estado: 'PUBLICADA' },
        select: { id: true, estrellas: true, texto: true, comoAparece: true, nombrePublico: true, cargoPublico: true },
    });
    const tarjetas = filas.map(resenas_1.aTarjetaPublica);
    if (vaciados === alEmpezar)
        cache = { tarjetas, vence: ahora + VIGENCIA_DE_LA_CACHE_MS };
    return tarjetas;
}
// ===== La empresa y la landing =====
async function resenaRoutes(app) {
    const deEmpresa = { preHandler: [app.requireEmpresa] };
    // Todo lo que deciden la ventana y el envío, leído de la base y nunca de la sesión: el rol (R2), la
    // firma (R12) y la situación de pago de la empresa (R1).
    async function situacion(empresaId, usuarioId) {
        const [usuario, empresa, suscripcion] = await Promise.all([
            prisma_1.prisma.usuario.findUnique({
                where: { id: usuarioId },
                select: { rol: true, activo: true, nombre: true, emailVerificado: true, empresaId: true },
            }),
            prisma_1.prisma.empresa.findUnique({
                where: { id: empresaId },
                select: { id: true, nombre: true, activa: true, exentaPago: true, auxilioRevisadoEn: true },
            }),
            prisma_1.prisma.suscripcion.findUnique({ where: { empresaId }, include: { pagos: PAGOS } }),
        ]);
        // Su administrador: activo y de ESTA empresa, no uno de otra con una sesión vieja.
        const administrador = usuario && usuario.activo && usuario.rol === 'ADMIN' && usuario.empresaId === empresaId ? usuario : null;
        return { administrador, empresa, suscripcion, pagos: suscripcion?.pagos ?? [] };
    }
    // Si a quien entra le sale la ventana, y con qué textos en las dos opciones. Los textos los arma el
    // servidor porque son los mismos que se guardan como constancia de la autorización (R13).
    app.get('/pendiente', deEmpresa, async (request) => {
        const empresaId = request.empresaId;
        const no = { pendiente: false, opciones: null };
        const { administrador, empresa, suscripcion, pagos } = await situacion(empresaId, request.usuarioId);
        if (!administrador || !empresa)
            return no;
        const yaTieneResena = (await prisma_1.prisma.resena.count({ where: { empresaId } })) > 0;
        if (!(0, resenas_1.elegibleParaResena)({ empresa, suscripcion, pagos, yaTieneResena }))
            return no;
        // R4: si en esta carga va a salir otro aviso que el servidor conoce, la reseña espera a la
        // siguiente. Los del navegador (la guía, las novedades) los mira `debeMostrarResena`.
        if (!administrador.emailVerificado)
            return no;
        const auxilioPorRevisar = !empresa.auxilioRevisadoEn
            && (0, revisionPendiente_1.revisionPendiente)(null, await prisma_1.prisma.colaborador.count({ where: { empresaId, activo: true } }));
        if (auxilioPorRevisar)
            return no;
        const firma = firmaDe(administrador, empresa);
        return { pendiente: true, opciones: (0, resenas_1.textosDeAutorizacion)(firma.nombre, firma.empresa) };
    });
    // Enviar u omitir. La empresa sale de la sesión y todo lo demás de la base: del cuerpo solo se toman
    // las estrellas, el texto y la opción elegida.
    app.post('/', deEmpresa, async (request, reply) => {
        const empresaId = request.empresaId;
        const usuarioId = request.usuarioId;
        const { administrador, empresa, suscripcion, pagos } = await situacion(empresaId, usuarioId);
        if (!administrador || !empresa) {
            return reply.status(403).send({ error: 'La reseña la deja el administrador de la empresa.' });
        }
        const envio = (0, resenas_1.limpiarResena)(request.body);
        if ((0, resenas_1.esResenaInvalida)(envio))
            return reply.status(400).send({ error: envio.motivo });
        // Elegible sin contar la reseña que ya tenga: esa la resuelve la llave única, y una OMITIDA todavía
        // se puede enviar desde otra pestaña. Lo que sí se exige es lo demás de R1, para que llamar a la
        // ruta a mano no sirva para opinar en plena prueba o desde la Demo.
        if (!(0, resenas_1.elegibleParaResena)({ empresa, suscripcion, pagos, yaTieneResena: false })) {
            return reply.status(403).send({ error: 'Tu empresa todavía no puede dejar una reseña.' });
        }
        const yaRespondio = () => reply.status(409).send({ error: 'Tu empresa ya nos dejó su opinión, gracias.', codigo: 'YA_RESPONDIO' });
        const comoEstaba = { planAlEnviar: suscripcion?.plan ?? null, mesesPagadosAlEnviar: (0, resenas_1.mesesPagados)(pagos) };
        if (envio.accion === 'OMITIR') {
            try {
                await prisma_1.prisma.resena.create({ data: { origen: 'CLIENTE', estado: 'OMITIDA', empresaId, usuarioId, ...comoEstaba } });
            }
            catch (e) {
                if (esDuplicado(e))
                    return yaRespondio();
                throw e;
            }
            return reply.status(201).send({ ok: true });
        }
        // La firma se copia AHORA (R12): si después cambia el nombre en el panel, lo enviado no cambia.
        // Se guarda también en la anónima, para que el super admin sepa quién la escribió aunque el usuario
        // se borre; a la landing no viaja nunca (`aTarjetaPublica`). La constancia, solo si eligió opción.
        const firma = firmaDe(administrador, empresa);
        const opciones = (0, resenas_1.textosDeAutorizacion)(firma.nombre, firma.empresa);
        const datos = {
            estado: 'POR_REVISAR',
            usuarioId,
            estrellas: envio.estrellas,
            texto: envio.texto,
            comoAparece: envio.comoAparece,
            nombrePublico: firma.nombre,
            cargoPublico: firma.empresa,
            textoAutorizacion: envio.comoAparece ? opciones[envio.comoAparece] : null,
            versionPolitica: envio.comoAparece ? resenas_1.VERSION_POLITICA : null,
            ...comoEstaba,
        };
        try {
            await prisma_1.prisma.resena.create({ data: { origen: 'CLIENTE', empresaId, ...datos } });
        }
        catch (e) {
            if (!esDuplicado(e))
                throw e;
            // La empresa ya tiene fila. Si es una que omitió (otra pestaña, o la misma persona antes), este
            // envío vale: es la única transición del cliente, OMITIDA → POR_REVISAR. Con el estado en el
            // `where` para que sea atómica: si dos envíos llegan juntos, solo uno la mueve.
            //
            // Con la fecha de AHORA: la de la fila era la de la omisión, y la constancia de R13 lleva la
            // fecha en que se dio la autorización. Ninguna otra columna la guarda (`actualizadoEn` la pisa
            // el primer cambio del super admin), y una reseña de cliente no se edita, así que no se mueve más.
            const { count } = await prisma_1.prisma.resena.updateMany({
                where: { empresaId, origen: 'CLIENTE', estado: 'OMITIDA' },
                data: { ...datos, creadoEn: new Date() },
            });
            if (count !== 1)
                return yaRespondio();
        }
        return reply.status(201).send({ ok: true });
    });
    // Las que salen en la landing: hasta 15, elegidas al azar en cada petición (R35), con la forma
    // exacta de la tarjeta y nada más (R42). Pública, con límite propio: es una ruta abierta y una
    // visita la pide una vez.
    app.get('/publicas', { config: { rateLimit: { max: 60, timeWindow: '1 minute' } } }, async () => ({
        resenas: (0, resenas_1.elegirAlAzar)(await tarjetasPublicadas(), resenas_1.RESENAS_EN_LA_LANDING),
    }));
}
const esEstrellas = (n) => n !== null && Number.isInteger(n) && n >= 1 && n <= 5;
function resumenDeResenas(filas) {
    const deClientes = filas.filter(f => f.origen === 'CLIENTE');
    const calificaciones = deClientes.filter(f => f.estado !== 'OMITIDA').map(f => f.estrellas).filter(esEstrellas);
    const distribucion = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const e of calificaciones)
        distribucion[e]++;
    const total = calificaciones.length;
    const suma = calificaciones.reduce((a, b) => a + b, 0);
    return {
        // Con un decimal, que es como se lee («4,3 ★»).
        promedio: total ? Math.round((suma / total) * 10) / 10 : null,
        total,
        distribucion,
        omitidas: deClientes.filter(f => f.estado === 'OMITIDA').length,
    };
}
const NO_ES_SUPER_ADMIN = 'Tu cuenta ya no puede administrar reseñas. Vuelve a iniciar sesión.';
const NO_EXISTE = 'Esa reseña ya no existe.';
const YA_TIENE_RESENA = 'Esa empresa ya tiene su reseña: es una por empresa.';
const EMPRESA_INEXISTENTE = 'Esa empresa no existe.';
async function resenasAdminRoutes(app) {
    const auth = { preHandler: [app.requireSuperAdmin] };
    // El token de super admin dura 7 días y `requireSuperAdmin` solo mira su firma. Para escribir se
    // comprueba que la cuenta siga existiendo, activa y con ese rol, y de ella sale el correo de
    // «cargada por» (R29), no del token.
    async function cuentaDeSuperAdmin(request) {
        const id = request.user?.id;
        const cuenta = id ? await prisma_1.prisma.usuario.findUnique({ where: { id }, select: { email: true, rol: true, activo: true } }) : null;
        return cuenta && cuenta.rol === 'SUPER_ADMIN' && cuenta.activo ? cuenta : null;
    }
    // La lista entera, con las omitidas incluidas (la pantalla decide qué pestaña las muestra), y lo que
    // cada fila necesita para leerse sin abrir nada más (R14, R17, R18).
    //
    // Su EXPLAIN es un recorrido de la tabla con orden, y es lo que se pide: son TODAS las filas, una por
    // empresa como máximo más las manuales, y solo la abre el dueño. Si un día son miles, aquí va la
    // paginación, no un índice. Las de la ventana y el envío van por la llave única de `empresaId`.
    app.get('/', auth, async () => {
        const filas = await prisma_1.prisma.resena.findMany({ orderBy: { creadoEn: 'desc' } });
        const unicos = (lista) => [...new Set(lista.filter((x) => !!x))];
        const idsEmpresas = unicos(filas.map(f => f.empresaId));
        const idsUsuarios = unicos(filas.map(f => f.usuarioId));
        const [empresas, usuarios] = await Promise.all([
            idsEmpresas.length
                ? prisma_1.prisma.empresa.findMany({
                    where: { id: { in: idsEmpresas } },
                    select: { id: true, nombre: true, activa: true, exentaPago: true, afiliadoId: true, suscripcion: { include: { pagos: PAGOS } } },
                })
                : [],
            idsUsuarios.length
                ? prisma_1.prisma.usuario.findMany({ where: { id: { in: idsUsuarios } }, select: { id: true, nombre: true, email: true } })
                : [],
        ]);
        const empresaPorId = new Map(empresas.map(e => [e.id, e]));
        const usuarioPorId = new Map(usuarios.map(u => [u.id, u]));
        const ahora = new Date();
        const resenas = filas.map(f => {
            const empresa = f.empresaId ? empresaPorId.get(f.empresaId) : undefined;
            const suscripcion = empresa?.suscripcion ?? null;
            const autor = f.usuarioId ? usuarioPorId.get(f.usuarioId) : undefined;
            const { publicable, motivo } = (0, resenas_1.esPublicable)(f);
            return {
                ...f,
                empresaNombre: empresa?.nombre ?? null,
                empresaActiva: empresa ? empresa.activa : null,
                // Igual que la lista de empresas: la de cortesía no está «suspendida» aunque no tenga pagos.
                estadoSuscripcion: !empresa ? null : empresa.exentaPago ? 'ILIMITADA' : suscripcion ? (0, suscripcion_1.estadoEfectivo)(suscripcion, ahora) : null,
                esReferida: Boolean(empresa?.afiliadoId),
                // Quién la escribió de verdad, también en las anónimas: el super admin sí lo ve (sección 3.3).
                autorNombre: autor?.nombre ?? null,
                autorEmail: autor?.email ?? null,
                mesesPagados: suscripcion ? (0, resenas_1.mesesPagados)(suscripcion.pagos) : null,
                marcas: (0, resenas_1.marcasDeRevision)(f.texto),
                publicable,
                motivoNoPublicable: motivo,
            };
        });
        return { resenas, resumen: resumenDeResenas(filas) };
    });
    // Una reseña que llegó por otro canal (R26 a R31). Nace por revisar, como todas (R19).
    app.post('/', auth, async (request, reply) => {
        const cuenta = await cuentaDeSuperAdmin(request);
        if (!cuenta)
            return reply.status(403).send({ error: NO_ES_SUPER_ADMIN });
        const manual = (0, resenas_1.limpiarResenaManual)(request.body);
        if ((0, resenas_1.esResenaInvalida)(manual))
            return reply.status(400).send({ error: manual.motivo });
        // Que la empresa exista y no tenga ya su reseña lo dicen las llaves de la tabla, no una lectura
        // previa que otra petición podría dejar vieja.
        try {
            const creada = await prisma_1.prisma.resena.create({
                data: { origen: 'MANUAL', estado: 'POR_REVISAR', ...manual, registradaPor: cuenta.email },
                select: { id: true },
            });
            return reply.status(201).send({ ok: true, id: creada.id });
        }
        catch (e) {
            if (esDuplicado(e))
                return reply.status(409).send({ error: YA_TIENE_RESENA });
            if (esEmpresaInexistente(e))
                return reply.status(400).send({ error: EMPRESA_INEXISTENTE });
            throw e;
        }
    });
    // Corregir una manual mal copiada (R29). Quién y cuándo quedan en la auditoría; «cargada por» no
    // cambia. El texto de un cliente no se toca nunca (R22).
    app.put('/:id', auth, async (request, reply) => {
        if (!(await cuentaDeSuperAdmin(request)))
            return reply.status(403).send({ error: NO_ES_SUPER_ADMIN });
        const { id } = request.params;
        const fila = await prisma_1.prisma.resena.findUnique({ where: { id } });
        if (!fila)
            return reply.status(404).send({ error: NO_EXISTE });
        if (fila.origen !== 'MANUAL') {
            return reply.status(400).send({ error: 'El texto de un cliente no se edita: se publica tal cual o no se publica.' });
        }
        const manual = (0, resenas_1.limpiarResenaManual)(request.body);
        if ((0, resenas_1.esResenaInvalida)(manual))
            return reply.status(400).send({ error: manual.motivo });
        // «Quitar el nombre» no se deshace (R23): editar no puede ser la puerta de atrás para volver a ponerlo.
        if (fila.nombreRetiradoEn && (manual.nombrePublico || manual.cargoPublico)) {
            return reply.status(400).send({ error: 'A esta reseña se le quitó el nombre, y eso no se puede deshacer.' });
        }
        // Una publicada no puede quedar en la landing sin cumplir lo que se exige para publicarla.
        if (fila.estado === 'PUBLICADA') {
            const { publicable, motivo } = (0, resenas_1.esPublicable)({ ...fila, ...manual });
            if (!publicable)
                return reply.status(400).send({ error: `Está publicada y así ya no se podría publicar. ${motivo} Ocúltala primero.` });
        }
        try {
            await prisma_1.prisma.resena.update({ where: { id }, data: manual });
        }
        catch (e) {
            if (esDuplicado(e))
                return reply.status(409).send({ error: YA_TIENE_RESENA });
            if (esEmpresaInexistente(e))
                return reply.status(400).send({ error: EMPRESA_INEXISTENTE });
            throw e;
        }
        olvidarResenasPublicas();
        return { ok: true };
    });
    // Publicar, ocultar, archivar o devolver a revisión (4.2). Publicar exige además que se pueda (R20, R27).
    app.put('/:id/estado', auth, async (request, reply) => {
        if (!(await cuentaDeSuperAdmin(request)))
            return reply.status(403).send({ error: NO_ES_SUPER_ADMIN });
        const { id } = request.params;
        const hacia = request.body?.estado;
        const fila = await prisma_1.prisma.resena.findUnique({ where: { id } });
        if (!fila)
            return reply.status(404).send({ error: NO_EXISTE });
        if (!(0, resenas_1.transicionValida)('ADMIN', fila.estado, hacia)) {
            return reply.status(400).send({ error: 'Esa reseña no puede pasar a ese estado desde el que tiene.' });
        }
        if (hacia === 'PUBLICADA') {
            const { publicable, motivo } = (0, resenas_1.esPublicable)(fila);
            if (!publicable)
                return reply.status(400).send({ error: motivo });
        }
        // Con el estado leído en el `where`: si otra pestaña la movió entre la lectura y esta escritura, no
        // se pisa lo que hizo.
        const { count } = await prisma_1.prisma.resena.updateMany({
            where: { id, estado: fila.estado },
            data: { estado: hacia, ...(hacia === 'PUBLICADA' ? { publicadaEn: new Date() } : {}) },
        });
        if (count === 0)
            return reply.status(409).send({ error: 'Alguien la cambió mientras tanto. Recarga la lista.' });
        olvidarResenasPublicas();
        return { ok: true };
    });
    // R23: alguien pidió que se quitara su nombre. Irreversible: la firma se borra y la reseña sale como
    // «Cliente de HoraPro». Pedirlo dos veces no cambia la fecha de la primera.
    //
    // `comoAparece` pasa a ANONIMA solo si había una opción: a una enviada sin texto no se le inventa una
    // autorización que nadie dio.
    app.post('/:id/quitar-nombre', auth, async (request, reply) => {
        if (!(await cuentaDeSuperAdmin(request)))
            return reply.status(403).send({ error: NO_ES_SUPER_ADMIN });
        const { id } = request.params;
        const fila = await prisma_1.prisma.resena.findUnique({ where: { id } });
        if (!fila)
            return reply.status(404).send({ error: NO_EXISTE });
        if (fila.nombreRetiradoEn)
            return { ok: true };
        await prisma_1.prisma.resena.update({
            where: { id },
            data: { comoAparece: fila.comoAparece ? 'ANONIMA' : null, nombrePublico: null, cargoPublico: null, nombreRetiradoEn: new Date() },
        });
        olvidarResenasPublicas();
        return { ok: true };
    });
}
