"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = registroFacialRoutes;
const client_1 = require("@prisma/client");
const prisma_1 = require("../prisma");
const rostro_1 = require("../utils/rostro");
const fotoPerfil_1 = require("../utils/fotoPerfil");
const kioscoConfig_1 = require("../utils/kioscoConfig");
const registroFacial_1 = require("../utils/registroFacial");
// EL REGISTRO FACIAL QUE HACE LA PROPIA PERSONA, DESDE SU ENLACE (14 de septiembre de 2026).
//
// Rutas públicas: quien llama no tiene sesión, solo el enlace. Por eso cada petición vuelve a
// comprobar el enlace y la cédula, y nada del registro sale antes de que la cédula coincida. Lo único
// que se muestra antes es el nombre de la persona y el de la empresa, que el enlace ya le dice a quien
// lo recibe.
//
// No tocan el ingreso facial del kiosco: el descriptor se guarda con el mismo formato que usa la
// ficha (utils/rostro.ts), y el kiosco lo lee como siempre.
const limite = { config: { rateLimit: { max: 12, timeWindow: '1 minute' } } };
const params = { type: 'object', required: ['token'], properties: { token: { type: 'string', minLength: 20, maxLength: 100 } } };
const cedula = { type: 'string', minLength: 1, maxLength: 40 };
// El texto que la página mostró. Se compara con el de ahora: si la empresa cambió algo entre que se
// abrió la página y que se decidió, la constancia guardaría un texto que la persona no leyó.
const texto = { type: 'string', minLength: 1, maxLength: 2000 };
async function buscarEnlace(token) {
    return prisma_1.prisma.enlaceRegistroFacial.findUnique({
        where: { tokenHash: (0, registroFacial_1.hashDeToken)(token) },
        select: {
            id: true, venceEn: true, usadoEn: true, anuladoEn: true, intentosCedula: true,
            colaborador: {
                select: {
                    id: true, nombre: true, cedula: true, activo: true, empresaId: true, foto: true,
                    rostroDescriptor: true, rostroEnroladoEn: true, rostroRechazadoEn: true,
                    empresa: { select: { nombre: true, activa: true } },
                },
            },
        },
    });
}
function responderEstado(reply, estado) {
    const r = (0, registroFacial_1.respuestaDelEstado)(estado);
    return r ? reply.status(r.status).send({ error: r.error, codigo: r.codigo }) : null;
}
// El enlace, si todavía sirve. Si no, ya respondió y devuelve null. A una persona retirada o de una
// empresa desactivada el enlace le deja de existir.
async function enlaceQueSirve(token, reply) {
    const encontrado = await buscarEnlace(token);
    const enlace = encontrado && encontrado.colaborador.activo && encontrado.colaborador.empresa.activa ? encontrado : null;
    const estado = (0, registroFacial_1.estadoDelEnlace)(enlace, new Date());
    if (estado !== 'VIGENTE') {
        responderEstado(reply, estado);
        return null;
    }
    return enlace;
}
// La cédula se comprueba en CADA petición: sin sesión, el enlace solo no dice quién está del otro
// lado. El intento equivocado se suma en la base, de una vez, para que dos pestañas no se lo salten.
async function cedulaCorrecta(enlace, escrita, reply) {
    if ((0, registroFacial_1.cedulaCoincide)(escrita, enlace.colaborador.cedula))
        return true;
    const { intentosCedula } = await prisma_1.prisma.enlaceRegistroFacial.update({
        where: { id: enlace.id }, data: { intentosCedula: { increment: 1 } }, select: { intentosCedula: true },
    });
    if (intentosCedula >= registroFacial_1.MAX_INTENTOS_CEDULA)
        responderEstado(reply, 'BLOQUEADO');
    else
        reply.status(400).send({ error: (0, registroFacial_1.mensajeCedulaEquivocada)(intentosCedula), codigo: 'CEDULA_NO_COINCIDE' });
    return false;
}
async function textoDeAhora(enlace) {
    return (0, registroFacial_1.textoAutorizacionEnlace)(enlace.colaborador.empresa.nombre, await (0, kioscoConfig_1.permiteCedula)(enlace.colaborador.empresaId));
}
// Gasta el enlace dentro de la transacción. Si otra petición lo gastó un instante antes, no hace nada
// y devuelve false: así una decisión no queda guardada dos veces.
async function gastarEnlace(tx, enlaceId, ahora) {
    const { count } = await tx.enlaceRegistroFacial.updateMany({
        where: { id: enlaceId, usadoEn: null, anuladoEn: null }, data: { usadoEn: ahora },
    });
    return count === 1;
}
async function registroFacialRoutes(app) {
    // Lo que la página necesita para empezar: de quién es el enlace y el texto que se va a leer.
    app.get('/:token', { ...limite, schema: { params } }, async (request, reply) => {
        const { token } = request.params;
        const enlace = await enlaceQueSirve(token, reply);
        if (!enlace)
            return reply;
        const conCedula = await (0, kioscoConfig_1.permiteCedula)(enlace.colaborador.empresaId);
        return {
            nombre: enlace.colaborador.nombre,
            empresa: enlace.colaborador.empresa.nombre,
            venceEn: enlace.venceEn,
            textoAutorizacion: (0, registroFacial_1.textoAutorizacionEnlace)(enlace.colaborador.empresa.nombre, conCedula),
            textoMayorDeEdad: registroFacial_1.TEXTO_MAYOR_DE_EDAD,
            // Para decirle a quien no autoriza cómo va a marcar.
            permiteCedula: conCedula,
        };
    });
    // Con la cédula correcta: si ya tiene registro, cuándo y con cuántas tomas, y su foto de perfil.
    // Las tomas no se guardan, así que no hay fotos del escaneo que mostrar.
    app.post('/:token/verificar', {
        ...limite,
        schema: { params, body: { type: 'object', additionalProperties: false, required: ['cedula'], properties: { cedula } } },
    }, async (request, reply) => {
        const { token } = request.params;
        const enlace = await enlaceQueSirve(token, reply);
        if (!enlace)
            return reply;
        if (!(await cedulaCorrecta(enlace, request.body.cedula, reply)))
            return reply;
        const c = enlace.colaborador;
        return {
            registradoEn: c.rostroEnroladoEn,
            tomas: (0, rostro_1.cuantasMuestras)(c.rostroDescriptor),
            foto: c.foto,
            noAutorizoEn: c.rostroRechazadoEn,
        };
    });
    // NO AUTORIZA. Si tenía rostro registrado, se borra: decisión del dueño, es retirar la autorización.
    // Queda la constancia con el texto que no aceptó.
    app.post('/:token/no-autorizo', {
        ...limite,
        schema: {
            params,
            body: {
                type: 'object', additionalProperties: false, required: ['cedula', 'texto'],
                properties: { cedula, texto, mayorDeEdad: { type: 'boolean' } },
            },
        },
    }, async (request, reply) => {
        const { token } = request.params;
        const body = request.body;
        const enlace = await enlaceQueSirve(token, reply);
        if (!enlace)
            return reply;
        if (!(await cedulaCorrecta(enlace, body.cedula, reply)))
            return reply;
        const vigente = await textoDeAhora(enlace);
        if (body.texto !== vigente) {
            return reply.status(409).send({ error: 'El texto de la autorización cambió. Recarga la página y léelo otra vez.', codigo: 'TEXTO_CAMBIO' });
        }
        const ahora = new Date();
        const gastado = await prisma_1.prisma.$transaction(async (tx) => {
            if (!(await gastarEnlace(tx, enlace.id, ahora)))
                return false;
            await tx.colaborador.update({
                where: { id: enlace.colaborador.id },
                data: { rostroDescriptor: client_1.Prisma.DbNull, rostroEnroladoEn: null, rostroRechazadoEn: ahora },
            });
            await tx.constanciaBiometrica.create({
                data: {
                    colaboradorId: enlace.colaborador.id, decision: 'NO_AUTORIZA', origen: 'ENLACE', texto: vigente,
                    mayorDeEdad: body.mayorDeEdad ?? null, enlaceId: enlace.id,
                },
            });
            return true;
        });
        if (!gastado)
            return responderEstado(reply, 'USADO');
        return { ok: true };
    });
    // AUTORIZA Y REGISTRA. Mismo guardado que la ficha: el descriptor, la fecha, y la primera toma como
    // foto de perfil solo si no tenía una.
    app.post('/:token/registrar', {
        ...limite,
        schema: {
            params,
            body: {
                type: 'object', additionalProperties: false, required: ['cedula', 'texto', 'mayorDeEdad', 'descriptores'],
                properties: {
                    cedula, texto, mayorDeEdad: { type: 'boolean' },
                    descriptores: { type: 'array', maxItems: 6, items: { type: 'array', maxItems: 128, items: { type: 'number' } } },
                    foto: { type: 'string', maxLength: 700000 },
                    fotoMini: { type: 'string', maxLength: 60000 },
                },
            },
        },
    }, async (request, reply) => {
        const { token } = request.params;
        const body = request.body;
        const enlace = await enlaceQueSirve(token, reply);
        if (!enlace)
            return reply;
        if (!(await cedulaCorrecta(enlace, body.cedula, reply)))
            return reply;
        const vigente = await textoDeAhora(enlace);
        if (body.texto !== vigente) {
            return reply.status(409).send({ error: 'El texto de la autorización cambió. Recarga la página y léelo otra vez.', codigo: 'TEXTO_CAMBIO' });
        }
        if (body.mayorDeEdad !== true) {
            return reply.status(400).send({ error: 'Para autorizar tú mismo tienes que ser mayor de edad.', codigo: 'MENOR_DE_EDAD' });
        }
        if (!(0, rostro_1.esListaDescriptoresValida)(body.descriptores)) {
            return reply.status(400).send({ error: 'No pudimos leer bien tu rostro. Intenta el escaneo otra vez.', codigo: 'ROSTRO_INVALIDO' });
        }
        const descriptores = body.descriptores;
        const primeraFoto = (0, fotoPerfil_1.fotoParaEnrolar)(enlace.colaborador.foto, body.foto);
        const primeraMini = primeraFoto && (0, fotoPerfil_1.miniValida)(body.fotoMini) ? body.fotoMini : null;
        const ahora = new Date();
        const gastado = await prisma_1.prisma.$transaction(async (tx) => {
            if (!(await gastarEnlace(tx, enlace.id, ahora)))
                return false;
            await tx.colaborador.update({
                where: { id: enlace.colaborador.id },
                data: {
                    rostroDescriptor: descriptores, rostroEnroladoEn: ahora, rostroRechazadoEn: null,
                    ...(primeraFoto ? { foto: primeraFoto, fotoMini: primeraMini } : {}),
                },
            });
            await tx.constanciaBiometrica.create({
                data: {
                    colaboradorId: enlace.colaborador.id, decision: 'AUTORIZA', origen: 'ENLACE', texto: vigente,
                    mayorDeEdad: true, enlaceId: enlace.id,
                },
            });
            return true;
        });
        if (!gastado)
            return responderEstado(reply, 'USADO');
        return { ok: true, registradoEn: ahora, tomas: descriptores.length };
    });
}
