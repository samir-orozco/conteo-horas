import { coincideBusqueda } from '../../lib/busqueda';
import { fechaCorta } from '../../lib/fechas';
import { PLANES_COMERCIALES } from '../../lib/planesComerciales';
import { diaEnBogota } from '../reportes/detalleDelPeriodo';
import { NOMBRE_ANONIMO, type EstadoResena, type OrigenResena, type ResenaAdmin, type ResenaManual, type TarjetaPublica } from './api';

// Las decisiones de la pantalla «Reseñas» del super admin (docs/RESENAS.md, sección 4), fuera del
// componente para poder probarlas una por una. La pantalla solo pinta lo que salga de aquí.

// ────────── PESTAÑAS ──────────

export type Pestana = 'TODAS' | 'POR_REVISAR' | 'PUBLICADA' | 'OCULTA' | 'ARCHIVADA';

export const PESTANAS: ReadonlyArray<{ id: Pestana; label: string }> = [
  { id: 'TODAS', label: 'Todas' },
  { id: 'POR_REVISAR', label: 'Por revisar' },
  { id: 'PUBLICADA', label: 'Publicadas' },
  { id: 'OCULTA', label: 'Ocultas' },
  { id: 'ARCHIVADA', label: 'Archivadas' },
];

// Una omitida no sale en ninguna: la empresa no opinó, y el resumen la cuenta aparte. «Todas» es la
// lista normal, y una archivada sale de ella (R21): queda en su pestaña.
export function estaEnPestana(estado: EstadoResena, pestana: Pestana): boolean {
  if (estado === 'OMITIDA') return false;
  if (pestana === 'TODAS') return estado !== 'ARCHIVADA';
  return estado === pestana;
}

export function contarPorPestana(resenas: ReadonlyArray<Pick<ResenaAdmin, 'estado'>>): Record<Pestana, number> {
  const conteo = Object.fromEntries(PESTANAS.map(p => [p.id, 0])) as Record<Pestana, number>;
  for (const r of resenas) {
    for (const p of PESTANAS) if (estaEnPestana(r.estado, p.id)) conteo[p.id]++;
  }
  return conteo;
}

// ────────── FILTROS (R16) ──────────

// '' es «todas»; 'SIN' encuentra las manuales cuya fuente no traía calificación (R28).
export type FiltroEstrellas = '' | '1' | '2' | '3' | '4' | '5' | 'SIN';
export type Filtros = { pestana: Pestana; estrellas: FiltroEstrellas; origen: '' | OrigenResena; buscar: string };

function cumpleEstrellas(estrellas: number | null, filtro: FiltroEstrellas): boolean {
  if (filtro === '') return true;
  if (filtro === 'SIN') return estrellas == null;
  return estrellas === Number(filtro);
}

// La lista ya llega entera del servidor (una por empresa más las manuales), así que se filtra aquí. El
// buscador mira también al autor real: el dueño sabe quién escribió una anónima aunque la web no.
export function filtrarResenas(resenas: readonly ResenaAdmin[], f: Filtros): ResenaAdmin[] {
  return resenas.filter(r =>
    estaEnPestana(r.estado, f.pestana)
    && cumpleEstrellas(r.estrellas, f.estrellas)
    && (f.origen === '' || r.origen === f.origen)
    && coincideBusqueda(f.buscar, [
      r.texto, r.nombrePublico, r.cargoPublico, r.empresaNombre, r.autorNombre, r.autorEmail, r.canal, r.registradaPor,
    ]));
}

// ────────── ESTADOS Y ACCIONES (4.2) ──────────

export type AccionDelAdmin = Exclude<EstadoResena, 'OMITIDA'>;

// COPIA de `TRANSICIONES.ADMIN` en `backend/src/utils/resenas.ts`, que es la que manda: el navegador
// no puede importar el backend. La prueba compara las dos casilla por casilla y se pone roja si se
// separan. Una omitida no la mueve el admin: es la respuesta de la empresa.
const MOVIMIENTOS: Record<EstadoResena, readonly AccionDelAdmin[]> = {
  OMITIDA: [],
  POR_REVISAR: ['PUBLICADA', 'ARCHIVADA'],
  PUBLICADA: ['OCULTA', 'ARCHIVADA'],
  OCULTA: ['PUBLICADA', 'ARCHIVADA'],
  ARCHIVADA: ['POR_REVISAR'],
};

export const accionesDelAdmin = (estado: EstadoResena): AccionDelAdmin[] => [...MOVIMIENTOS[estado]];

const NOMBRE_DE_ACCION: Record<AccionDelAdmin, string> = {
  PUBLICADA: 'Publicar',
  OCULTA: 'Ocultar',
  ARCHIVADA: 'Archivar',
  POR_REVISAR: 'Devolver a revisión',
};
export const etiquetaDeAccion = (hacia: AccionDelAdmin) => NOMBRE_DE_ACCION[hacia];

const NOMBRE_DE_ESTADO: Record<EstadoResena, string> = {
  OMITIDA: 'Omitida',
  POR_REVISAR: 'Por revisar',
  PUBLICADA: 'Publicada',
  OCULTA: 'Oculta',
  ARCHIVADA: 'Archivada',
};
export const etiquetaDeEstado = (estado: EstadoResena) => NOMBRE_DE_ESTADO[estado];

// ────────── LA FIRMA ──────────

type ParaTarjeta = Pick<ResenaAdmin, 'id' | 'estrellas' | 'texto' | 'comoAparece' | 'nombrePublico' | 'cargoPublico'>;

// Lo que saldría en la landing, para la vista previa (R25) y para la firma de cada fila. COPIA de
// `aTarjetaPublica` del servidor, comparada con ella en la prueba: la vista previa tiene que decir lo
// mismo que la landing. Con nombre solo si autorizó con nombre Y el nombre sigue ahí; si no, anónima,
// sin el nombre ni la empresa aunque estén guardados (R42).
export function tarjetaDeVistaPrevia(r: ParaTarjeta): TarjetaPublica {
  const nombre = r.comoAparece === 'CON_NOMBRE' ? r.nombrePublico : null;
  return nombre
    ? { id: r.id, estrellas: r.estrellas, texto: r.texto, nombre, detalle: r.cargoPublico || null }
    : { id: r.id, estrellas: r.estrellas, texto: r.texto, nombre: NOMBRE_ANONIMO, detalle: null };
}

// Quién la escribió de verdad, cuando la web no lo dice (R14). Solo lo ve el super admin, que es lo
// que la ventana promete: «HoraPro sabrá quién la escribió; en la web, no». Si la cuenta ya no
// existe, queda la firma que se congeló al enviar.
export function autorReal(r: ResenaAdmin): string | null {
  if (tarjetaDeVistaPrevia(r).nombre !== NOMBRE_ANONIMO) return null;
  const partes = [r.autorNombre ?? r.nombrePublico, r.autorEmail, r.empresaNombre ?? r.cargoPublico].filter(Boolean);
  return partes.length ? partes.join(' · ') : null;
}

// Mientras quede un nombre guardado, también en una anónima: el congelado es un dato de la persona.
// Una vez quitado no hay nada que quitar (R23): el servidor deja los dos en null y no deja volver a
// ponerlos, así que no hace falta mirar además `nombreRetiradoEn`.
export const puedeQuitarNombre = (r: Pick<ResenaAdmin, 'nombrePublico' | 'cargoPublico'>) =>
  Boolean(r.nombrePublico || r.cargoPublico);

// ────────── MARCAS DE LA FILA ──────────

// R17: para hacerles seguimiento. No avisan por correo ni por Telegram (D5).
export const requiereSeguimiento = (estrellas: number | null) => estrellas != null && estrellas <= 2;

// R18. Un caso por marca y un `default` explícito (§9.4): si el servidor agrega una, se ve igual.
export function etiquetaDeMarca(marca: string): string {
  switch (marca) {
    case 'ENLACE': return 'Trae un enlace';
    case 'TELEFONO': return 'Trae un teléfono';
    case 'CORREO': return 'Trae un correo';
    case 'ARROBA': return 'Trae un @usuario';
    default: return `Revisar: ${marca}`;
  }
}

// Sección 6: si la empresa ya no está al día, el dueño decide si la reseña sigue publicada.
export function avisoDeEmpresa(r: Pick<ResenaAdmin, 'empresaActiva' | 'estadoSuscripcion'>): string | null {
  if (r.empresaActiva === false) return 'Empresa inactiva';
  switch (r.estadoSuscripcion) {
    case 'SUSPENDIDA': return 'Empresa suspendida';
    case 'EN_MORA': return 'Empresa en mora';
    case 'CANCELADA': return 'Suscripción cancelada';
    default: return null;
  }
}

// ────────── LA LÍNEA DE ABAJO (R14) ──────────

const nombreDePlan = (plan: string) => PLANES_COMERCIALES.find(p => p.id === plan)?.nombre ?? plan;
const mesesLegibles = (n: number) => (n === 1 ? '1 mes pagado' : `${n} meses pagados`);

// De cliente: el plan con el que opinó y los meses que lleva pagados (meses de verdad, no filas de
// pago: el servidor ya los cuenta así). Si la empresa ya no tiene suscripción, los de cuando opinó.
// De una manual: el canal, quién la cargó (R29) y la fecha de la opinión, que va en Bogotá (R31).
export function detallesDeOrigen(r: ResenaAdmin): string[] {
  if (r.origen === 'MANUAL') {
    return [
      'Manual',
      r.canal,
      r.registradaPor && `cargada por ${r.registradaPor}`,
      fechaCorta(r.fechaOpinion ?? r.creadoEn),
    ].filter((x): x is string => Boolean(x));
  }
  const meses = r.mesesPagados ?? r.mesesPagadosAlEnviar;
  return [
    'Cliente',
    r.planAlEnviar && nombreDePlan(r.planAlEnviar),
    meses != null ? mesesLegibles(meses) : null,
    fechaCorta(r.creadoEn),
  ].filter((x): x is string => Boolean(x));
}

// «4,3», como se lee en Colombia. El servidor ya lo manda redondeado a un decimal.
export const promedioLegible = (promedio: number | null) =>
  promedio == null ? '—' : promedio.toLocaleString('es-CO', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

// ────────── EL FORMULARIO DE UNA MANUAL (4.3) ──────────

// Lo que tiene el formulario mientras se llena: todo texto, para los inputs. `sinCalificacion` es la
// casilla «La fuente no traía calificación».
export type FormularioManual = {
  estrellas: number | null;
  sinCalificacion: boolean;
  texto: string;
  nombrePublico: string;
  cargoPublico: string;
  empresaId: string;
  canal: string;
  fechaOpinion: string;
  referencia: string;
  autorizacion: string;
};

export const formularioNuevo = (hoy: string): FormularioManual => ({
  estrellas: null, sinCalificacion: false, texto: '', nombrePublico: '', cargoPublico: '', empresaId: '',
  canal: '', fechaOpinion: hoy, referencia: '', autorizacion: '',
});

// La fecha de la opinión viaja como medianoche de Bogotá (05:00 UTC): se pasa al día de Bogotá, o en
// cualquier zona al occidente el campo mostraría el día anterior.
export const formularioDe = (r: ResenaAdmin): FormularioManual => ({
  estrellas: r.estrellas,
  sinCalificacion: r.estrellas == null,
  texto: r.texto,
  nombrePublico: r.nombrePublico ?? '',
  cargoPublico: r.cargoPublico ?? '',
  empresaId: r.empresaId ?? '',
  canal: r.canal ?? '',
  fechaOpinion: diaEnBogota(r.fechaOpinion ?? r.creadoEn),
  referencia: r.referencia ?? '',
  autorizacion: r.autorizacion ?? '',
});

// El cuerpo de la petición, o lo que falta. La limpieza de verdad la hace el servidor
// (`limpiarResenaManual`); aquí solo se ataja lo que no se puede mandar. Las estrellas no se deciden
// por omisión: o se eligen, o se marca que la fuente no las traía, porque poner un 5 que nadie dio es
// fabricar un dato y dejarla sin estrellas por descuido es perder uno (R28).
export function cuerpoDelFormulario(f: FormularioManual): ResenaManual | { error: string } {
  if (!f.sinCalificacion && f.estrellas == null) return { error: 'Elige las estrellas, o marca que la fuente no traía calificación.' };
  if (!f.texto.trim()) return { error: 'Falta el texto de la reseña.' };
  if (!f.fechaOpinion) return { error: 'Falta la fecha de la opinión.' };
  return {
    estrellas: f.sinCalificacion ? null : f.estrellas,
    texto: f.texto,
    nombrePublico: f.nombrePublico,
    cargoPublico: f.cargoPublico,
    empresaId: f.empresaId || null,
    canal: f.canal,
    fechaOpinion: f.fechaOpinion,
    referencia: f.referencia,
    autorizacion: f.autorizacion,
  };
}
