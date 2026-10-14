import { rutaNormalizada, recortar } from './huellaDeEvento';

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
// - La reseña que envía una empresa (7 de octubre de 2026): el cuerpo lleva su comentario, y la ruta
//   le pone la firma. Copiarlo aquí lo dejaría en un registro que no se borra, adonde «Quitar el
//   nombre» no llega (docs/RESENAS.md, §10.3). Lo del super admin sobre las reseñas sí se audita: va
//   por `/api/admin/resenas`, que no empieza por esta ruta.
const RUTAS_EXCLUIDAS = [
  '/api/worker/',
  '/api/registro-facial/',
  '/api/auth/login',
  '/api/eventos',
  '/api/admin/eventos',
  '/api/telegram/',
  '/api/resenas',
];

export function seAudita(metodo: string | undefined, url: string | undefined, estado: number): boolean {
  if (!METODOS_QUE_CAMBIAN.has((metodo ?? '').toUpperCase())) return false;
  if (estado < 200 || estado >= 300) return false;
  const ruta = (url ?? '').split('?')[0];
  return !RUTAS_EXCLUIDAS.some(excluida => ruta.startsWith(excluida));
}

// El nombre del recurso que toca cada ruta. Es un mapa y no una cadena de condiciones porque la
// pregunta "de qué es esta ruta" es sobre un conjunto abierto: el `default` explícito es el que
// sostiene la ruta que se escriba mañana (CLAUDE.md §9.4).
const RECURSOS: Record<string, string> = {
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
  // Las reseñas que administra el dueño. Las que envía una empresa no se auditan (ver arriba).
  'admin/resenas': 'una reseña',
  'afiliado': 'el panel del afiliado',
};

// Las rutas en las que el método no dice lo que pasó. Quitar el nombre es un POST, y con la regla
// general saldría «Creó una reseña», que dice lo contrario. Y el cambio de estado es un PUT que solo
// el cuerpo distingue: «Editó una reseña» no dice si la publicó o la ocultó (R24). Lo que se audita
// ya salió bien (`seAudita`), así que el estado del cuerpo es el que quedó.
// Un Map y no un objeto: con un objeto, un cuerpo con `estado: 'toString'` devolvería una función.
const QUE_HIZO_CON_LA_RESENA = new Map<unknown, string>([
  ['PUBLICADA', 'Publicó una reseña'],
  ['OCULTA', 'Ocultó una reseña'],
  ['ARCHIVADA', 'Archivó una reseña'],
  ['POR_REVISAR', 'Devolvió a revisión una reseña'],
]);

function accionPropia(metodo: string, ruta: string, cuerpo: unknown): string | null {
  switch (`${metodo} ${ruta}`) {
    case 'POST /api/admin/resenas/:id/quitar-nombre':
      return 'Quitó el nombre de una reseña';
    case 'PUT /api/admin/resenas/:id/estado': {
      const estado = typeof cuerpo === 'object' && cuerpo !== null ? (cuerpo as { estado?: unknown }).estado : undefined;
      return QUE_HIZO_CON_LA_RESENA.get(estado) ?? 'Cambió el estado de una reseña';
    }
    default:
      return null;
  }
}

// De qué recurso es una ruta ya normalizada. Bajo `/api/admin` el recurso es el segundo segmento:
// `admin/empresas` no es lo mismo que `empresas` (una la toca HoraPro, la otra la empresa sobre sí misma).
// Bajo `/api/clima` también: los motivos, los casos y sus comentarios son cosas distintas, y el comentario
// va anidado en su caso.
function claveDeRecurso(ruta: string): string {
  const partes = ruta.split('/').filter(Boolean); // ['api', 'admin', 'empresas', ':id']
  return partes[1] === 'admin' ? `admin/${partes[2] ?? ''}`
    : partes[1] === 'clima' ? (partes.includes('comentarios') ? 'clima/comentarios' : `clima/${partes[2] ?? ''}`)
      : (partes[1] ?? '');
}

const VERBOS: Record<string, string> = { POST: 'Creó', PUT: 'Editó', PATCH: 'Editó', DELETE: 'Borró' };

export function accionDePeticion(metodo: string | undefined, url: string | undefined, cuerpo?: unknown): string {
  const ruta = rutaNormalizada(url);
  const propia = accionPropia((metodo ?? '').toUpperCase(), ruta, cuerpo);
  if (propia) return propia;
  const recurso = RECURSOS[claveDeRecurso(ruta)];
  const verboBase = VERBOS[(metodo ?? '').toUpperCase()];
  if (!recurso || !verboBase) return `${(metodo ?? '').toUpperCase()} ${ruta}`;
  // "Creó los precios" no se dice. Lo que no se cuenta de a uno se guarda, no se crea.
  const verbo = verboBase === 'Creó' && /^(la|los|el) /.test(recurso) ? 'Guardó' : verboBase;
  return `${verbo} ${recurso}`;
}

// Lo que se guarda del cuerpo de la petición. Es la parte que más cuidado pide: por aquí pasan las
// contraseñas de todo el mundo y las fotos del kiosco.
const CLAVE_SENSIBLE = /(password|contrase|token|secret|firma|signature|codigo|clave)/i;
// Los datos de la persona en una reseña que carga el dueño (7 de octubre de 2026). Este registro no se
// borra, y «Quitar el nombre» limpia la fila de `resenas` pero no llega hasta aquí (docs/RESENAS.md,
// R23): el nombre y el cargo, y dónde quedó y cómo autorizó, que suelen traer un teléfono o un chat.
// Por nombre exacto, porque son claves que solo usan las reseñas; `referencia` incluida, que el
// resto del producto solo usa por dentro y nunca en un cuerpo. El texto sí queda: es lo que se
// publica, y sin él no se lee qué se cambió. Las reseñas que envía una empresa ni pasan por aquí.
const DATO_DE_LA_PERSONA = new Set(['nombrePublico', 'cargoPublico', 'referencia', 'autorizacion']);
const SOLO_BASE64 = /^[A-Za-z0-9+/=\s]+$/;
const LARGO_SOSPECHOSO = 500;
const MAXIMO_CUERPO = 4000;

function kilobytes(texto: string): string {
  return `(archivo de ${Math.round(texto.length / 1024)} KB)`;
}

function limpiar(valor: unknown): unknown {
  if (typeof valor === 'string') {
    // Una foto del kiosco o un comprobante de pago: no se guarda, se deja constancia de su tamaño.
    if (valor.startsWith('data:')) return kilobytes(valor);
    if (valor.length >= LARGO_SOSPECHOSO && SOLO_BASE64.test(valor)) return kilobytes(valor);
    return recortar(valor, LARGO_SOSPECHOSO);
  }
  if (Array.isArray(valor)) return valor.map(limpiar);
  if (valor && typeof valor === 'object') {
    const salida: Record<string, unknown> = {};
    for (const [clave, v] of Object.entries(valor as Record<string, unknown>)) {
      salida[clave] = CLAVE_SENSIBLE.test(clave) || DATO_DE_LA_PERSONA.has(clave) ? '(oculto)' : limpiar(v);
    }
    return salida;
  }
  return valor;
}

// LOS DATOS DE LAS PERSONAS NO SE COPIAN AQUÍ (14 de octubre de 2026). Decisión del dueño, opción A de
// POLITICA-PRIVACIDAD-1.3-para-abogado.md §0. Este registro lo ve el super admin y no se borra, y guardaba el cuerpo
// entero: la cédula y el salario de un trabajador, la descripción de una novedad, un comentario del seguimiento. La
// política promete que HoraPro no tiene ninguna pantalla para ver los datos de los trabajadores de sus clientes.
//
// La regla: la auditoría dice quién hizo qué y sobre cuál registro. Del cuerpo quedan los NOMBRES de los campos y los
// ids, que dicen sobre cuál registro y no son datos de nadie; cada valor se cambia por NO_SE_GUARDA. Solo las rutas
// cuyo cuerpo es de la EMPRESA (sus sedes, horarios, configuración, su plan) guardan los valores, con la limpieza de
// siempre. Es una lista de las que SÍ, y no de las que no: una ruta que se escriba mañana nace protegida.
//
// `auth` está entre las que sí porque el rol que se le pone a un usuario es lo que delata una escalada (ver
// utils/rolDeEmpresa.ts); sus cuerpos son de los usuarios del panel, no de los trabajadores. Wompi NO: su aviso de pago
// trae el correo de quien pagó, y la política dice que de un pago guardamos el identificador y el estado.
const CUERPO_DE_LA_EMPRESA = new Set([
  'festivos', 'sedes', 'horarios', 'plantillas-turno', 'clima/motivos', 'notificaciones', 'configuracion', 'suscripcion',
  'auth', 'admin/empresas', 'admin/configuracion', 'admin/auxilios', 'admin/planes', 'admin/resenas',
]);
const esDeLaEmpresa = (url: string | null | undefined) => CUERPO_DE_LA_EMPRESA.has(claveDeRecurso(rutaNormalizada(url ?? '')));

export const NO_SE_GUARDA = '(no se guarda)';
const DETALLE_RECORTADO = '(no se guarda: el detalle venía recortado)';
const textoNoGuardado = (texto: string) => `(texto de ${texto.length} caracteres; no se guarda)`;
// Lo que ya es un reemplazo, para que limpiar dos veces no cambie nada.
const YA_REEMPLAZADO = /^\((texto de \d+ caracteres; )?no se guarda[^)]*\)$/;

// `id`, `colaboradorId`, `sedeIds`: dicen sobre cuál registro. Un id es corto; uno largo no es un id.
const CLAVE_DE_ID = /^id$|Ids?$/;
const esId = (v: unknown) => typeof v === 'string' && v.length <= 64;

// La forma del cuerpo sin sus valores: los nombres de los campos, los ids, y lo de adentro con la misma regla.
function soloLaForma(valor: unknown, clave = ''): unknown {
  if (CLAVE_DE_ID.test(clave) && (esId(valor) || (Array.isArray(valor) && valor.every(esId)))) return valor;
  if (Array.isArray(valor)) return valor.map(v => soloLaForma(v, clave));
  if (valor && typeof valor === 'object') {
    return Object.fromEntries(Object.entries(valor as Record<string, unknown>).map(([k, v]) => [k, soloLaForma(v, k)]));
  }
  return NO_SE_GUARDA;
}

export function cuerpoParaGuardar(cuerpo: unknown, url: string | undefined): string {
  if (cuerpo === null || cuerpo === undefined) return '';
  if (esDeLaEmpresa(url)) {
    if (typeof cuerpo === 'string') return recortar(cuerpo, MAXIMO_CUERPO);
    return recortar(JSON.stringify(limpiar(cuerpo)), MAXIMO_CUERPO);
  }
  if (typeof cuerpo === 'string') return textoNoGuardado(cuerpo);
  return recortar(JSON.stringify(soloLaForma(cuerpo)), MAXIMO_CUERPO);
}

/**
 * Lo que queda de una fila que YA estaba guardada, con la misma regla, o null si no cambia. Lo usa el comando
 * `src/scripts/limpiar-auditoria.ts` para las filas de antes del 14 de octubre de 2026. Una fila recortada a
 * MAXIMO_CUERPO no se puede leer como JSON, y se reemplaza entera.
 */
export function detalleSinDatosDePersonas(detalle: string | null, ruta: string | null): string | null {
  if (!detalle || esDeLaEmpresa(ruta) || YA_REEMPLAZADO.test(detalle)) return null;
  let valor: unknown;
  try {
    valor = JSON.parse(detalle);
  } catch {
    const inicio = detalle.trimStart()[0];
    return inicio === '{' || inicio === '[' ? DETALLE_RECORTADO : textoNoGuardado(detalle);
  }
  const limpio = recortar(JSON.stringify(soloLaForma(valor)), MAXIMO_CUERPO);
  return limpio === detalle ? null : limpio;
}
