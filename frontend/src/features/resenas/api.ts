// Las llamadas al servidor de las reseñas, y la forma de lo que va y viene (docs/RESENAS.md, §10.3).
//
// Un solo lugar para los tipos del contrato con el backend: la ventana del panel, el carrusel de la
// landing y la pantalla del super admin los leen de aquí. Si cada uno escribiera su propia forma, el
// día que el servidor cambie un campo se desalinearían por separado y sin que el compilador avise.
import api from '../../lib/api';

export type OrigenResena = 'CLIENTE' | 'MANUAL';
export type EstadoResena = 'OMITIDA' | 'POR_REVISAR' | 'PUBLICADA' | 'OCULTA' | 'ARCHIVADA';
export type ComoAparece = 'CON_NOMBRE' | 'ANONIMA';

// La firma con la que sale una reseña anónima. La arma el servidor (R42); aquí está para que la
// tarjeta la reconozca y no le invente iniciales.
export const NOMBRE_ANONIMO = 'Cliente de HoraPro';

// ────────── LA EMPRESA ──────────

// `opciones` son los textos EXACTOS de las dos opciones de la ventana, armados por el servidor con el
// nombre y la empresa leídos de la base. Se muestran tal cual: son los mismos que quedan guardados
// como constancia de la autorización (R13), y si la ventana los armara por su cuenta podría decir una
// cosa y guardarse otra.
export type RespuestaPendiente = {
  pendiente: boolean;
  opciones: Record<ComoAparece, string> | null;
};

// Con texto, `comoAparece` es obligatorio; sin texto no hay nada que publicar y no se manda.
export type EnvioDeResena =
  | { accion: 'ENVIAR'; estrellas: number; texto?: string; comoAparece?: ComoAparece }
  | { accion: 'OMITIR' };

export const pedirPendiente = () =>
  api.get<RespuestaPendiente>('/resenas/pendiente').then(r => r.data);

export const enviarResena = (cuerpo: EnvioDeResena) =>
  api.post<{ ok: true }>('/resenas', cuerpo).then(r => r.data);

// R9: otro administrador, o la misma persona en otra pestaña, envió primero. No es un error: la
// ventana dice «Tu empresa ya nos dejó su opinión, gracias». Se reconoce por el código del contrato y
// no por el texto, que puede cambiar.
export function yaRespondio(e: unknown): boolean {
  if (typeof e !== 'object' || e === null) return false;
  const respuesta = (e as { response?: { status?: unknown; data?: { codigo?: unknown } } }).response;
  return respuesta?.status === 409 && respuesta.data?.codigo === 'YA_RESPONDIO';
}

// ────────── LA LANDING ──────────

// R42: lo único que viaja a la landing es lo que se ve en la tarjeta. De una anónima, `nombre` es
// `NOMBRE_ANONIMO` y `detalle` es null: nunca el nombre real ni la empresa.
export type TarjetaPublica = {
  id: string;
  estrellas: number | null;
  texto: string;
  nombre: string;
  detalle: string | null;
};

// Hasta 15, elegidas al azar por el servidor en cada petición (R35).
export const pedirResenasPublicas = () =>
  api.get<{ resenas: TarjetaPublica[] }>('/resenas/publicas').then(r => r.data.resenas);

// ────────── EL SUPER ADMIN ──────────

// La fila tal como la guarda la base, con las fechas como llegan en el JSON.
export type ResenaAdmin = {
  id: string;
  origen: OrigenResena;
  estado: EstadoResena;
  empresaId: string | null;
  usuarioId: string | null;
  estrellas: number | null;
  texto: string;
  comoAparece: ComoAparece | null;
  nombrePublico: string | null;
  // En las de clientes, el nombre de la empresa congelado al enviar.
  cargoPublico: string | null;
  textoAutorizacion: string | null;
  versionPolitica: string | null;
  canal: string | null;
  referencia: string | null;
  autorizacion: string | null;
  fechaOpinion: string | null;
  registradaPor: string | null;
  planAlEnviar: string | null;
  mesesPagadosAlEnviar: number | null;
  nombreRetiradoEn: string | null;
  publicadaEn: string | null;
  creadoEn: string;
  actualizadoEn: string;
  // Lo que agrega el servidor para la lista.
  empresaNombre: string | null;
  empresaActiva: boolean | null;
  estadoSuscripcion: string | null;
  esReferida: boolean;
  // Quién la escribió de verdad, también en las anónimas (R14).
  autorNombre: string | null;
  autorEmail: string | null;
  mesesPagados: number | null;
  // R18: lo que el dueño debería leer antes de publicar, p. ej. 'ENLACE', 'TELEFONO', 'CORREO', 'ARROBA'.
  marcas: string[];
  publicable: boolean;
  motivoNoPublicable: string | null;
};

// R15: solo con las de clientes y sin las omitidas; incluye las archivadas.
export type ResumenResenas = {
  promedio: number | null;
  total: number;
  distribucion: Record<1 | 2 | 3 | 4 | 5, number>;
  omitidas: number;
};

// R26: los cuatro primeros campos se publican; los otros son solo para el super admin.
export type ResenaManual = {
  estrellas: number | null;
  texto: string;
  nombrePublico: string;
  cargoPublico: string;
  empresaId?: string | null;
  canal: string;
  // 'YYYY-MM-DD'. El servidor la ancla a medianoche de Bogotá (R31).
  fechaOpinion: string;
  referencia: string;
  autorizacion: string;
};

// El id va escapado: un id raro no puede cambiar a qué ruta se llama.
const ruta = (id: string) => `/admin/resenas/${encodeURIComponent(id)}`;

export const listarResenasAdmin = () =>
  api.get<{ resenas: ResenaAdmin[]; resumen: ResumenResenas }>('/admin/resenas').then(r => r.data);

export const crearResenaManual = async (cuerpo: ResenaManual): Promise<void> => {
  await api.post('/admin/resenas', cuerpo);
};

// Solo las manuales: el texto de un cliente no se edita (R22) y el servidor responde 400.
export const editarResenaManual = async (id: string, cuerpo: ResenaManual): Promise<void> => {
  await api.put(ruta(id), cuerpo);
};

export const cambiarEstadoResena = async (id: string, estado: EstadoResena): Promise<void> => {
  await api.put(`${ruta(id)}/estado`, { estado });
};

// R23: irreversible. La reseña pasa a «Cliente de HoraPro» y la firma se borra.
export const quitarNombreResena = async (id: string): Promise<void> => {
  await api.post(`${ruta(id)}/quitar-nombre`);
};
