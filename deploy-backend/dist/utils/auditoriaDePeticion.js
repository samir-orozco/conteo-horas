"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.seAudita = seAudita;
exports.accionDePeticion = accionDePeticion;
exports.cuerpoParaGuardar = cuerpoParaGuardar;
const huellaDeEvento_1 = require("./huellaDeEvento");
// Qué queda en la pestaña de Auditoría: quién hizo qué (23 de septiembre de 2026).
//
// Se resuelve mirando la petición, no instrumentando cada ruta. Instrumentar veinte rutas a mano
// deja fuera la que se escriba mañana; mirar la petición captura todo el producto desde el primer
// día. Lo que NO da así es el "antes → después" (el salario pasó de X a Y): eso sí exige tocar la
// ruta, y va aparte, sobre las acciones delicadas.
const METODOS_QUE_CAMBIAN = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
// Lo que se queda fuera, y por qué cada uno:
//
// - El kiosco (`worker` y `registro-facial`): son cientos de marcaciones al día por empresa, y cada
//   una ya queda guardada en `registros` con su hora, su foto y con qué se autenticó. Auditarlas
//   sería guardar dos veces lo mismo y ahogar la pantalla. Decisión del dueño, 23/09/2026.
// - El login de la plataforma: tiene su propia pestaña. Auditarlo además llenaría esto de "entró
//   fulano" y taparía lo que de verdad se quiere ver.
// - El propio registro: sin esta línea, borrar el registro escribiría en el registro, y cada error
//   que reporta un navegador dejaría además una fila de auditoría.
// - El webhook de Telegram: una fila por cada mensaje que alguien le manda al bot. El de Wompi NO
//   se excluye: ese mueve dinero y es exactamente lo que hay que poder auditar.
const RUTAS_EXCLUIDAS = [
    '/api/worker/',
    '/api/registro-facial/',
    '/api/auth/login',
    '/api/eventos',
    '/api/admin/eventos',
    '/api/telegram/',
];
function seAudita(metodo, url, estado) {
    if (!METODOS_QUE_CAMBIAN.has((metodo ?? '').toUpperCase()))
        return false;
    if (estado < 200 || estado >= 300)
        return false;
    const ruta = (url ?? '').split('?')[0];
    return !RUTAS_EXCLUIDAS.some(excluida => ruta.startsWith(excluida));
}
// El nombre del recurso que toca cada ruta. Es un mapa y no una cadena de condiciones porque la
// pregunta "de qué es esta ruta" es sobre un conjunto abierto: el `default` explícito es el que
// sostiene la ruta que se escriba mañana (CLAUDE.md §9.4).
const RECURSOS = {
    'colaboradores': 'un colaborador',
    'registros': 'una marcación',
    'permisos': 'un permiso',
    'contratos': 'un contrato',
    'festivos': 'un festivo',
    'sedes': 'una sede',
    'horarios': 'un horario',
    'plantillas-turno': 'una plantilla de turno',
    'turnos': 'un turno',
    // El panel del clima laboral (4 de octubre de 2026): los motivos y el seguimiento de los casos. Las
    // caritas del kiosco van por /api/worker/, que no se audita.
    'clima/motivos': 'los motivos del clima laboral',
    'clima/seguimientos': 'un caso de seguimiento',
    'clima/comentarios': 'un comentario de seguimiento',
    'notificaciones': 'una notificación',
    'configuracion': 'la configuración',
    'suscripcion': 'la suscripción',
    'wompi': 'un pago',
    'auth': 'una cuenta',
    'admin/empresas': 'una empresa',
    'admin/configuracion': 'los precios',
    'admin/auxilios': 'el auxilio de transporte',
    'admin/afiliados': 'un afiliado',
    'admin/planes': 'un plan',
    'afiliado': 'el panel del afiliado',
};
const VERBOS = { POST: 'Creó', PUT: 'Editó', PATCH: 'Editó', DELETE: 'Borró' };
function accionDePeticion(metodo, url) {
    const ruta = (0, huellaDeEvento_1.rutaNormalizada)(url);
    const partes = ruta.split('/').filter(Boolean); // ['api', 'admin', 'empresas', ':id']
    // Bajo `/api/admin` el recurso es el segundo segmento: `admin/empresas` no es lo mismo que
    // `empresas` (una la toca HoraPro, la otra la empresa sobre sí misma).
    // Bajo `/api/clima` también: los motivos, los casos y sus comentarios son cosas distintas, y el
    // comentario va anidado en su caso.
    const clave = partes[1] === 'admin' ? `admin/${partes[2] ?? ''}`
        : partes[1] === 'clima' ? (partes.includes('comentarios') ? 'clima/comentarios' : `clima/${partes[2] ?? ''}`)
            : (partes[1] ?? '');
    const recurso = RECURSOS[clave];
    const verboBase = VERBOS[(metodo ?? '').toUpperCase()];
    if (!recurso || !verboBase)
        return `${(metodo ?? '').toUpperCase()} ${ruta}`;
    // "Creó los precios" no se dice. Lo que no se cuenta de a uno se guarda, no se crea.
    const verbo = verboBase === 'Creó' && /^(la|los|el) /.test(recurso) ? 'Guardó' : verboBase;
    return `${verbo} ${recurso}`;
}
// Lo que se guarda del cuerpo de la petición. Es la parte que más cuidado pide: por aquí pasan las
// contraseñas de todo el mundo y las fotos del kiosco.
const CLAVE_SENSIBLE = /(password|contrase|token|secret|firma|signature|codigo|clave)/i;
const SOLO_BASE64 = /^[A-Za-z0-9+/=\s]+$/;
const LARGO_SOSPECHOSO = 500;
const MAXIMO_CUERPO = 4000;
function kilobytes(texto) {
    return `(archivo de ${Math.round(texto.length / 1024)} KB)`;
}
function limpiar(valor) {
    if (typeof valor === 'string') {
        // Una foto del kiosco o un comprobante de pago: no se guarda, se deja constancia de su tamaño.
        if (valor.startsWith('data:'))
            return kilobytes(valor);
        if (valor.length >= LARGO_SOSPECHOSO && SOLO_BASE64.test(valor))
            return kilobytes(valor);
        return (0, huellaDeEvento_1.recortar)(valor, LARGO_SOSPECHOSO);
    }
    if (Array.isArray(valor))
        return valor.map(limpiar);
    if (valor && typeof valor === 'object') {
        const salida = {};
        for (const [clave, v] of Object.entries(valor)) {
            salida[clave] = CLAVE_SENSIBLE.test(clave) ? '(oculto)' : limpiar(v);
        }
        return salida;
    }
    return valor;
}
function cuerpoParaGuardar(cuerpo) {
    if (cuerpo === null || cuerpo === undefined)
        return '';
    if (typeof cuerpo === 'string')
        return (0, huellaDeEvento_1.recortar)(cuerpo, MAXIMO_CUERPO);
    return (0, huellaDeEvento_1.recortar)(JSON.stringify(limpiar(cuerpo)), MAXIMO_CUERPO);
}
