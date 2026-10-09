import type { Pago, Suscripcion } from '@prisma/client';
import { estadoEfectivo } from './suscripcion';
import { claveDiaBogota, medianocheBogota, sumarMesesBogota } from './fechas';

// Las decisiones del módulo de reseñas, como funciones puras (7 de octubre de 2026). El
// requerimiento entero está en docs/RESENAS.md, y cada función dice qué regla de ese documento
// decide. Las rutas solo leen la base, llaman a estas funciones y escriben.
//
// Los estados se declaran aquí como texto y no se importan de `@prisma/client`: son los mismos
// valores de los enums de `schema.prisma`, así que una fila de Prisma se pasa tal cual, y estas
// funciones no dependen de que el cliente esté generado con la tabla nueva.
export type OrigenResena = 'CLIENTE' | 'MANUAL';
export type EstadoResena = 'OMITIDA' | 'POR_REVISAR' | 'PUBLICADA' | 'OCULTA' | 'ARCHIVADA';
export type ComoAparece = 'CON_NOMBRE' | 'ANONIMA';

// La empresa Demo de PRODUCCIÓN. Con ella se le muestra el panel a los prospectos, y no le puede
// salir la ventana en plena demostración (docs/RESENAS.md, sección 6). Va por id y no por nombre: el
// nombre lo puede cambiar cualquiera desde el panel.
export const EMPRESA_DEMO_ID = 'cmrfu0b5m0008avi678kzeldr';

// La versión de la política de datos que rige cuando alguien autoriza publicar su opinión. Se
// guarda con la reseña como constancia (R13).
//
// Es una COPIA. La fuente es `version` en `frontend/blog/legal/privacidad.mjs`; no
// `frontend/src/lib/legal.ts`, que solo lleva la ruta y el interruptor de publicación. La prueba
// lee ese archivo y se pone roja si los dos se separan. La 1.3, que es la que cubre esta finalidad
// (sección 7), todavía no existe: por decisión del dueño no se bloquea nada por eso.
export const VERSION_POLITICA = '1.2';

// Cómo firma la tarjeta de una reseña anónima (R42), y cómo lo anuncia la ventana.
export const NOMBRE_ANONIMO = 'Cliente de HoraPro';

// Cuántas elige el servidor en cada visita a la landing (D6, R35).
export const RESENAS_EN_LA_LANDING = 15;

const TEXTO_MAXIMO = 500; // R11
const TEXTO_MINIMO_PARA_PUBLICAR = 20; // R20

// ===== Lo que una ruta responde con 400 =====

export const RESENA_INVALIDA = 'RESENA_INVALIDA' as const;
export type ResenaInvalida = { readonly invalida: typeof RESENA_INVALIDA; readonly motivo: string };

const invalida = (motivo: string): ResenaInvalida => ({ invalida: RESENA_INVALIDA, motivo });

export function esResenaInvalida(valor: unknown): valor is ResenaInvalida {
  return typeof valor === 'object' && valor !== null && (valor as Partial<ResenaInvalida>).invalida === RESENA_INVALIDA;
}

// ===== R1: a quién le sale la ventana =====

type PagoParaContar = Pick<Pago, 'estado' | 'monto' | 'periodoInicio'>;

// Un pago real: aprobado y por más de cero.
const pagosReales = (pagos: readonly PagoParaContar[]) => pagos.filter(p => p.estado === 'APROBADO' && p.monto > 0);

export type EntradaDeElegibilidad = {
  empresa: { id: string; activa: boolean; exentaPago: boolean };
  suscripcion: Suscripcion | null;
  pagos: readonly PagoParaContar[];
  // Si la empresa ya tiene fila en `resenas`, de cualquier origen y en cualquier estado: enviada,
  // omitida o cargada a mano por el dueño (D1, D2, R30).
  yaTieneResena: boolean;
};

// Le sale a una empresa que va en su segundo mes pagado y está al día.
//
// No se cuentan filas de pago, a propósito: agregar colaboradores o subir de plan crea otra fila en
// el MISMO mes, y el primer pago puede cubrir tres días. Con «dos pagos», una empresa quedaría
// elegible a los tres días de pagar. Se mide un mes calendario de Bogotá desde el inicio del primer
// pago real, y el estado se toma de `estadoEfectivo` y no del guardado, que se actualiza perezoso.
export function elegibleParaResena(
  { empresa, suscripcion, pagos, yaTieneResena }: EntradaDeElegibilidad,
  ahora = new Date(),
): boolean {
  if (empresa.id === EMPRESA_DEMO_ID || !empresa.activa || empresa.exentaPago || yaTieneResena) return false;
  if (!suscripcion || estadoEfectivo(suscripcion, ahora) !== 'ACTIVA') return false;

  const inicios = pagosReales(pagos).map(p => p.periodoInicio.getTime());
  if (inicios.length === 0) return false;
  return ahora >= sumarMesesBogota(new Date(Math.min(...inicios)), 1);
}

// Los meses que ha pagado una empresa, para el super admin (R14): meses distintos de Bogotá en que
// empieza un pago real. Dos filas de octubre son un mes.
export function mesesPagados(pagos: readonly PagoParaContar[]): number {
  return new Set(pagosReales(pagos).map(p => claveDiaBogota(p.periodoInicio).slice(0, 7))).size;
}

// ===== R13: los textos exactos de las dos opciones =====

// Los arma el servidor desde la base, y son los mismos que la ventana pinta en los radios y que se
// guardan como constancia de la autorización. La opción con nombre dice nombre Y empresa porque la
// tarjeta muestra las dos cosas (decisión 9.2).
export function textosDeAutorizacion(nombre: string, empresa: string): Record<ComoAparece, string> {
  return {
    CON_NOMBRE: `Sí, como ${nombre}, de ${empresa}`,
    ANONIMA: `Prefiero anónimo (saldría como «${NOMBRE_ANONIMO}»)`,
  };
}

// ===== R10 a R12: limpiar lo que llega =====

// Lo que no se ve y no se guarda: los caracteres de control (salvo el salto de línea y el
// tabulador, que se tratan aparte), los de ancho cero, los que invierten la dirección del texto, el
// guion suave y la marca de orden. Entre los de ancho cero está el que une emojis compuestos: una
// familia queda como sus personas sueltas, que es un precio menor.
// eslint-disable-next-line no-control-regex
const INVISIBLES = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F\u00AD\u200B-\u200F\u202A-\u202E\u2060-\u2064\u2066-\u2069\uFEFF]/g;

// Caracteres y no unidades de UTF-16, igual que la columna de MySQL: con `length`, un emoji vale dos.
const largo = (texto: string) => Array.from(texto).length;

// Un texto de varias líneas: conserva los saltos, que la tarjeta pinta (R43), pero no deja espacios
// dobles, espacios al borde de cada línea, ni más de una línea en blanco seguida.
function limpiarTexto(texto: string): string {
  return texto
    .replace(/\r\n?|[\u2028\u2029]/g, '\n')
    .replace(INVISIBLES, '')
    .split('\n')
    .map(linea => linea.replace(/\s+/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// Un campo de una sola línea: cualquier espacio, salto incluido, queda como un espacio.
const limpiarLinea = (texto: string) => texto.replace(INVISIBLES, '').replace(/\s+/g, ' ').trim();

const esEstrellas = (valor: unknown): valor is number =>
  typeof valor === 'number' && Number.isInteger(valor) && valor >= 1 && valor <= 5;

const esComoAparece = (valor: unknown): valor is ComoAparece => valor === 'CON_NOMBRE' || valor === 'ANONIMA';

// El comentario de una reseña: ausente es vacío, y lo que no es texto no pasa.
function comentario(valor: unknown, obligatorio: boolean): string | ResenaInvalida {
  if (valor !== undefined && valor !== null && typeof valor !== 'string') return invalida('El comentario tiene que ser texto.');
  const texto = typeof valor === 'string' ? limpiarTexto(valor) : '';
  if (obligatorio && !texto) return invalida('Falta el texto de la reseña.');
  if (largo(texto) > TEXTO_MAXIMO) return invalida(`El comentario puede tener hasta ${TEXTO_MAXIMO} caracteres.`);
  return texto;
}

export type EnvioDeResena =
  | { accion: 'OMITIR' }
  | { accion: 'ENVIAR'; estrellas: number; texto: string; comoAparece: ComoAparece | null };

// Lo que manda la ventana (R10 a R12). La firma no viene aquí: el servidor la copia de la base.
//
// Sin texto, `comoAparece` se guarda vacío aunque llegue: sin comentario no hay nada que publicar,
// y la ventana oculta la pregunta. Con texto es obligatorio, porque ninguna opción viene marcada:
// una autorización que se da sin tocar nada no es expresa (sección 3.3).
export function limpiarResena(cuerpo: Record<string, unknown> | null | undefined): EnvioDeResena | ResenaInvalida {
  const datos = cuerpo ?? {};
  if (datos.accion === 'OMITIR') return { accion: 'OMITIR' };
  if (datos.accion !== 'ENVIAR') return invalida('La acción tiene que ser ENVIAR u OMITIR.');
  if (!esEstrellas(datos.estrellas)) return invalida('Las estrellas son obligatorias, de 1 a 5.');

  const texto = comentario(datos.texto, false);
  if (esResenaInvalida(texto)) return texto;
  if (!texto) return { accion: 'ENVIAR', estrellas: datos.estrellas, texto, comoAparece: null };
  if (!esComoAparece(datos.comoAparece)) return invalida('Elige cómo quieres aparecer en la web.');
  return { accion: 'ENVIAR', estrellas: datos.estrellas, texto, comoAparece: datos.comoAparece };
}

// ===== R26 a R31: las reseñas que carga el dueño =====

// Los campos de una línea de una manual, con el tope de su columna en `schema.prisma`.
const CAMPOS_DE_LINEA = {
  nombrePublico: { tope: 120, etiqueta: 'El nombre' },
  cargoPublico: { tope: 160, etiqueta: 'El cargo y la empresa' },
  canal: { tope: 60, etiqueta: 'El canal' },
  referencia: { tope: 500, etiqueta: '«Dónde quedó»' },
  autorizacion: { tope: 500, etiqueta: '«Cómo autorizó»' },
} as const;
type CampoDeLinea = keyof typeof CAMPOS_DE_LINEA;

// Ausente o en blanco es null, y no una cadena vacía que parezca un dato.
function lineaOpcional(valor: unknown, campo: CampoDeLinea): string | null | ResenaInvalida {
  const { tope, etiqueta } = CAMPOS_DE_LINEA[campo];
  if (valor === undefined || valor === null) return null;
  if (typeof valor !== 'string') return invalida(`${etiqueta} tiene que ser texto.`);
  const limpio = limpiarLinea(valor);
  if (largo(limpio) > tope) return invalida(`${etiqueta} puede tener hasta ${tope} caracteres.`);
  return limpio || null;
}

// Una fecha de calendario «YYYY-MM-DD», anclada a medianoche de Bogotá (R31). Un 30 de febrero
// tiene la forma pero se desborda al mes siguiente, así que se comprueba que vuelva igual.
const SOLO_FECHA = /^\d{4}-\d{2}-\d{2}$/;
function fechaDeCalendario(valor: unknown): Date | null {
  if (typeof valor !== 'string' || !SOLO_FECHA.test(valor.trim())) return null;
  const fecha = medianocheBogota(valor.trim());
  return claveDiaBogota(fecha) === valor.trim() ? fecha : null;
}

export type ResenaManualLimpia = {
  estrellas: number | null;
  texto: string;
  comoAparece: ComoAparece;
  nombrePublico: string | null;
  cargoPublico: string | null;
  empresaId: string | null;
  canal: string | null;
  fechaOpinion: Date;
  referencia: string | null;
  autorizacion: string | null;
};

// Lo que manda el formulario de «Nueva reseña» y el de editar una manual.
//
// Sin estrellas se guarda sin estrellas: poner un 5 que nadie dio es fabricar un dato (R28). Sin
// nombre es anónima. Que una manual con nombre lleve «dónde quedó» y «cómo autorizó» no se exige
// aquí sino al publicar (R27): se puede cargar mientras se consigue la autorización.
export function limpiarResenaManual(cuerpo: Record<string, unknown> | null | undefined): ResenaManualLimpia | ResenaInvalida {
  const datos = cuerpo ?? {};
  const estrellas = datos.estrellas ?? null;
  if (estrellas !== null && !esEstrellas(estrellas)) return invalida('Las estrellas van de 1 a 5, o ninguna si la fuente no las traía.');

  const texto = comentario(datos.texto, true);
  if (esResenaInvalida(texto)) return texto;

  const lineas = { nombrePublico: null, cargoPublico: null, canal: null, referencia: null, autorizacion: null } as Record<CampoDeLinea, string | null>;
  for (const campo of Object.keys(CAMPOS_DE_LINEA) as CampoDeLinea[]) {
    const valor = lineaOpcional(datos[campo], campo);
    if (esResenaInvalida(valor)) return valor;
    lineas[campo] = valor;
  }

  const empresaId = datos.empresaId ?? null;
  if (empresaId !== null && typeof empresaId !== 'string') return invalida('La empresa no es válida.');

  const fechaOpinion = fechaDeCalendario(datos.fechaOpinion);
  if (!fechaOpinion) return invalida('La fecha de la opinión tiene que ser una fecha AAAA-MM-DD que exista.');

  return {
    estrellas,
    texto,
    comoAparece: lineas.nombrePublico ? 'CON_NOMBRE' : 'ANONIMA',
    ...lineas,
    empresaId: empresaId?.trim() || null,
    fechaOpinion,
  };
}

// ===== R20, R21 y R27: cuándo se puede publicar =====

export type ResenaParaPublicar = {
  origen: OrigenResena;
  estado: EstadoResena;
  texto: string;
  comoAparece: ComoAparece | null;
  referencia: string | null;
  autorizacion: string | null;
};

// No hay mínimo de estrellas: eso lo decide el dueño (R20). Lo que se exige es que haya algo que
// leer y que quien la escribió haya autorizado publicarla.
export function esPublicable(r: ResenaParaPublicar): { publicable: boolean; motivo: string | null } {
  const no = (motivo: string) => ({ publicable: false, motivo });
  if (r.estado === 'ARCHIVADA') return no('Una reseña archivada no se puede publicar.');
  if (r.estado === 'OMITIDA') return no('La empresa omitió la reseña: no hay nada que publicar.');
  if (largo(r.texto.trim()) < TEXTO_MINIMO_PARA_PUBLICAR) return no(`Necesita al menos ${TEXTO_MINIMO_PARA_PUBLICAR} caracteres de texto.`);
  if (!r.comoAparece) return no('Quien la escribió no eligió cómo aparecer, así que no autorizó publicarla.');
  // Que una opinión esté en Google o en WhatsApp no la vuelve publicable con nombre sin permiso.
  if (r.origen === 'MANUAL' && r.comoAparece === 'CON_NOMBRE') {
    if (!r.referencia?.trim()) return no('Falta «Dónde quedó»: una reseña manual con nombre no se publica sin eso.');
    if (!r.autorizacion?.trim()) return no('Falta «Cómo autorizó»: una reseña manual con nombre no se publica sin eso.');
  }
  return { publicable: true, motivo: null };
}

// ===== 4.2: estados y acciones =====

// Quién mueve la reseña, no de dónde salió: el super admin desde su pantalla, o el cliente al
// enviar sobre una que había omitido en otra pestaña.
export type QuienCambia = 'ADMIN' | 'CLIENTE';

const TRANSICIONES: Record<QuienCambia, Partial<Record<EstadoResena, readonly EstadoResena[]>>> = {
  // Una omitida no la mueve el admin: es la respuesta de la empresa, no una reseña por revisar.
  ADMIN: {
    POR_REVISAR: ['PUBLICADA', 'ARCHIVADA'],
    PUBLICADA: ['OCULTA', 'ARCHIVADA'],
    OCULTA: ['PUBLICADA', 'ARCHIVADA'],
    ARCHIVADA: ['POR_REVISAR'],
  },
  CLIENTE: { OMITIDA: ['POR_REVISAR'] },
};

// Si un movimiento está permitido. Publicar exige además `esPublicable`, que se mira aparte.
//
// `hacia` se recibe sin tipo porque llega del cuerpo de la petición: un valor que no es un estado
// tampoco es un movimiento válido, y si pasa, la ruta ya lo tiene como `EstadoResena`.
export function transicionValida(quien: QuienCambia, desde: EstadoResena, hacia: unknown): hacia is EstadoResena {
  return (TRANSICIONES[quien][desde] as readonly unknown[] | undefined)?.includes(hacia) ?? false;
}

// ===== R18: lo que el dueño tiene que leer antes de publicar =====

export type MarcaDeRevision = 'ENLACE' | 'TELEFONO' | 'CORREO' | 'ARROBA';

const CORREOS = /[^\s@]+@[^\s@]+\.[^\s@]+/g;
const CON_PROTOCOLO = /\b(?:https?:\/\/|www\.)\S/i;
// Un dominio suelto. El final va en minúscula o en mayúscula ENTERO, a propósito: «a fin de mes.Me
// encanta» no es un enlace, y «FERRETERIALOPEZ.COM», como se escribe en un aviso, sí.
const FINALES_DE_DOMINIO = ['com', 'co', 'net', 'org', 'io', 'app', 'me', 'ly', 'gl', 'info', 'biz', 'xyz', 'site', 'online', 'store', 'shop', 'link'];
const DOMINIO = new RegExp(`\\b[\\w-]+(?:\\.[\\w-]+)*\\.(?:${[...FINALES_DE_DOMINIO, ...FINALES_DE_DOMINIO.map(f => f.toUpperCase())].join('|')})\\b`);
const ARROBA = /@\w{2,}/;
// Una tira de al menos siete caracteres de cifras y separadores. Si es teléfono lo decide
// `pareceTelefono`: una cifra de plata con puntos de miles tiene la misma forma.
const POSIBLE_TELEFONO = /\+?\(?\d[\d\s().-]{5,}\d/g;
const MILES = /^\d{1,3}(?:\.\d{3})+$/;

function pareceTelefono(candidato: string): boolean {
  const digitos = candidato.replace(/\D/g, '').length;
  return digitos >= 7 && digitos <= 15 && !MILES.test(candidato);
}

// Prefiere avisar de más: una marca de sobra cuesta una lectura, y una que falta deja pasar un
// teléfono a la landing. Los correos se quitan primero para que no cuenten también como enlace o
// como @usuario.
export function marcasDeRevision(texto: string): MarcaDeRevision[] {
  const sinCorreos = texto.replace(CORREOS, ' ');
  const marcas: Array<[MarcaDeRevision, boolean]> = [
    ['ENLACE', CON_PROTOCOLO.test(sinCorreos) || DOMINIO.test(sinCorreos)],
    ['TELEFONO', (sinCorreos.match(POSIBLE_TELEFONO) ?? []).some(pareceTelefono)],
    ['CORREO', sinCorreos !== texto],
    ['ARROBA', ARROBA.test(sinCorreos)],
  ];
  return marcas.filter(([, hay]) => hay).map(([marca]) => marca);
}

// ===== R42: lo único que viaja a la landing =====

export type TarjetaPublica = { id: string; estrellas: number | null; texto: string; nombre: string; detalle: string | null };

type ResenaParaTarjeta = {
  id: string;
  estrellas: number | null;
  texto: string;
  comoAparece: ComoAparece | null;
  nombrePublico: string | null;
  cargoPublico: string | null;
};

// La forma exacta de lo que sale en el JSON público. Se arma campo por campo, sin copiar la fila,
// para que una columna nueva no viaje sin que nadie lo decida. De una anónima no sale el nombre, ni
// las iniciales, ni la empresa, que en una empresa pequeña es nombrar a la persona.
export function aTarjetaPublica(r: ResenaParaTarjeta): TarjetaPublica {
  const nombre = r.comoAparece === 'CON_NOMBRE' ? r.nombrePublico : null;
  return nombre
    ? { id: r.id, estrellas: r.estrellas, texto: r.texto, nombre, detalle: r.cargoPublico || null }
    : { id: r.id, estrellas: r.estrellas, texto: r.texto, nombre: NOMBRE_ANONIMO, detalle: null };
}

// ===== R35: las que salen en cada visita =====

// Fisher-Yates parcial sobre una copia: baraja solo las primeras `n` posiciones. El generador se
// inyecta para poder probarlo, y la elección se hace aquí y no con `ORDER BY RAND()` (sección 10.3).
export function elegirAlAzar<T>(lista: readonly T[], n: number, aleatorio: () => number = Math.random): T[] {
  const copia = [...lista];
  const cuantas = Math.max(0, Math.min(n, copia.length));
  for (let i = 0; i < cuantas; i++) {
    const j = i + Math.floor(aleatorio() * (copia.length - i));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia.slice(0, cuantas);
}
