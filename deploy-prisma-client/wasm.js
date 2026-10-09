
Object.defineProperty(exports, "__esModule", { value: true });

const {
  Decimal,
  objectEnumValues,
  makeStrictEnum,
  Public,
  getRuntime,
  skip
} = require('@prisma/client/runtime/index-browser.js')


const Prisma = {}

exports.Prisma = Prisma
exports.$Enums = {}

/**
 * Prisma Client JS version: 5.22.0
 * Query Engine version: 605197351a3c8bdd595af2d2a9bc3025bca48ea2
 */
Prisma.prismaVersion = {
  client: "5.22.0",
  engine: "605197351a3c8bdd595af2d2a9bc3025bca48ea2"
}

Prisma.PrismaClientKnownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientKnownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)};
Prisma.PrismaClientUnknownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientUnknownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientRustPanicError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientRustPanicError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientInitializationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientInitializationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientValidationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientValidationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.NotFoundError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`NotFoundError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.Decimal = Decimal

/**
 * Re-export of sql-template-tag
 */
Prisma.sql = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`sqltag is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.empty = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`empty is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.join = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`join is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.raw = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`raw is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.validator = Public.validator

/**
* Extensions
*/
Prisma.getExtensionContext = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.getExtensionContext is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.defineExtension = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.defineExtension is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}

/**
 * Shorthand utilities for JSON filtering
 */
Prisma.DbNull = objectEnumValues.instances.DbNull
Prisma.JsonNull = objectEnumValues.instances.JsonNull
Prisma.AnyNull = objectEnumValues.instances.AnyNull

Prisma.NullTypes = {
  DbNull: objectEnumValues.classes.DbNull,
  JsonNull: objectEnumValues.classes.JsonNull,
  AnyNull: objectEnumValues.classes.AnyNull
}



/**
 * Enums
 */

exports.Prisma.TransactionIsolationLevel = makeStrictEnum({
  ReadUncommitted: 'ReadUncommitted',
  ReadCommitted: 'ReadCommitted',
  RepeatableRead: 'RepeatableRead',
  Serializable: 'Serializable'
});

exports.Prisma.EmpresaScalarFieldEnum = {
  id: 'id',
  nombre: 'nombre',
  nit: 'nit',
  email: 'email',
  telefono: 'telefono',
  marcadorToken: 'marcadorToken',
  exentaPago: 'exentaPago',
  activa: 'activa',
  auxilioRevisadoEn: 'auxilioRevisadoEn',
  creadoEn: 'creadoEn',
  actualizadoEn: 'actualizadoEn',
  afiliadoId: 'afiliadoId',
  atribuidoEn: 'atribuidoEn',
  primerPagoComisionEn: 'primerPagoComisionEn'
};

exports.Prisma.SuscripcionScalarFieldEnum = {
  id: 'id',
  empresaId: 'empresaId',
  estado: 'estado',
  finPrueba: 'finPrueba',
  pagadoHasta: 'pagadoHasta',
  suspendidaEn: 'suspendidaEn',
  plan: 'plan',
  cicloPago: 'cicloPago',
  limiteOverride: 'limiteOverride',
  funcionesOverride: 'funcionesOverride',
  precioModo: 'precioModo',
  precioFijo: 'precioFijo',
  precioTramo1: 'precioTramo1',
  limiteTramo1: 'limiteTramo1',
  precioTramo2: 'precioTramo2',
  wompiFuentePagoId: 'wompiFuentePagoId',
  creadoEn: 'creadoEn',
  actualizadoEn: 'actualizadoEn'
};

exports.Prisma.PagoScalarFieldEnum = {
  id: 'id',
  suscripcionId: 'suscripcionId',
  monto: 'monto',
  colaboradoresFacturados: 'colaboradoresFacturados',
  periodoInicio: 'periodoInicio',
  periodoFin: 'periodoFin',
  metodo: 'metodo',
  estado: 'estado',
  wompiTransaccionId: 'wompiTransaccionId',
  nota: 'nota',
  comprobanteBase64: 'comprobanteBase64',
  registradoPor: 'registradoPor',
  creadoEn: 'creadoEn'
};

exports.Prisma.ConfiguracionPlataformaScalarFieldEnum = {
  id: 'id',
  precioTramo1: 'precioTramo1',
  limiteTramo1: 'limiteTramo1',
  precioTramo2: 'precioTramo2',
  planes: 'planes'
};

exports.Prisma.JornadaVigenciaScalarFieldEnum = {
  id: 'id',
  vigenteDesde: 'vigenteDesde',
  horasSemanales: 'horasSemanales'
};

exports.Prisma.AuxilioVigenciaScalarFieldEnum = {
  id: 'id',
  vigenteDesde: 'vigenteDesde',
  valor: 'valor',
  tope: 'tope'
};

exports.Prisma.TipoHoraScalarFieldEnum = {
  id: 'id',
  nombre: 'nombre',
  codigo: 'codigo',
  horaInicio: 'horaInicio',
  horaFin: 'horaFin',
  recargo: 'recargo',
  aplica: 'aplica',
  vigenteDesde: 'vigenteDesde',
  vigenteHasta: 'vigenteHasta',
  activo: 'activo'
};

exports.Prisma.HorarioScalarFieldEnum = {
  id: 'id',
  empresaId: 'empresaId',
  nombre: 'nombre',
  toleranciaMin: 'toleranciaMin',
  almuerzoMin: 'almuerzoMin',
  toleranciaSalidaMin: 'toleranciaSalidaMin',
  ajustaEntrada: 'ajustaEntrada',
  fotoEnDescanso: 'fotoEnDescanso',
  activo: 'activo',
  creadoEn: 'creadoEn'
};

exports.Prisma.FranjaHorarioScalarFieldEnum = {
  id: 'id',
  horarioId: 'horarioId',
  dias: 'dias',
  horaEntrada: 'horaEntrada',
  horaSalida: 'horaSalida',
  tieneAlmuerzo: 'tieneAlmuerzo',
  almuerzoInicio: 'almuerzoInicio',
  almuerzoFin: 'almuerzoFin',
  descansos: 'descansos'
};

exports.Prisma.PlantillaTurnoScalarFieldEnum = {
  id: 'id',
  empresaId: 'empresaId',
  nombre: 'nombre',
  color: 'color',
  esDescanso: 'esDescanso',
  horaEntrada: 'horaEntrada',
  horaSalida: 'horaSalida',
  tieneAlmuerzo: 'tieneAlmuerzo',
  almuerzoInicio: 'almuerzoInicio',
  almuerzoFin: 'almuerzoFin',
  descansos: 'descansos',
  toleranciaMin: 'toleranciaMin',
  toleranciaSalidaMin: 'toleranciaSalidaMin',
  ajustaEntrada: 'ajustaEntrada',
  sedeId: 'sedeId',
  activa: 'activa',
  creadoEn: 'creadoEn',
  actualizadoEn: 'actualizadoEn'
};

exports.Prisma.DispositivoKioscoScalarFieldEnum = {
  id: 'id',
  empresaId: 'empresaId',
  nombre: 'nombre',
  token: 'token',
  creadoEn: 'creadoEn',
  ultimoUso: 'ultimoUso'
};

exports.Prisma.ColaboradorScalarFieldEnum = {
  id: 'id',
  empresaId: 'empresaId',
  nombre: 'nombre',
  apellido: 'apellido',
  cedula: 'cedula',
  numeroContrato: 'numeroContrato',
  cargo: 'cargo',
  email: 'email',
  telefono: 'telefono',
  fechaNacimiento: 'fechaNacimiento',
  salarioMensual: 'salarioMensual',
  auxilioTransporte: 'auxilioTransporte',
  rostroDescriptor: 'rostroDescriptor',
  rostroEnroladoEn: 'rostroEnroladoEn',
  rostroRechazadoEn: 'rostroRechazadoEn',
  foto: 'foto',
  fotoMini: 'fotoMini',
  horarioId: 'horarioId',
  modalidad: 'modalidad',
  puedeCerrarEnOtraSede: 'puedeCerrarEnOtraSede',
  activo: 'activo',
  fechaRetiro: 'fechaRetiro',
  motivoRetiro: 'motivoRetiro',
  retiroProgramado: 'retiroProgramado',
  creadoEn: 'creadoEn',
  actualizadoEn: 'actualizadoEn'
};

exports.Prisma.SedeScalarFieldEnum = {
  id: 'id',
  empresaId: 'empresaId',
  nombre: 'nombre',
  direccion: 'direccion',
  lat: 'lat',
  lng: 'lng',
  radio: 'radio',
  activa: 'activa',
  creadoEn: 'creadoEn',
  actualizadoEn: 'actualizadoEn'
};

exports.Prisma.ColaboradorSedeScalarFieldEnum = {
  colaboradorId: 'colaboradorId',
  sedeId: 'sedeId',
  creadoEn: 'creadoEn'
};

exports.Prisma.DiaEsperadoScalarFieldEnum = {
  id: 'id',
  colaboradorId: 'colaboradorId',
  fecha: 'fecha',
  programado: 'programado',
  horaEntrada: 'horaEntrada',
  horaSalida: 'horaSalida',
  toleranciaMin: 'toleranciaMin',
  almuerzoMin: 'almuerzoMin',
  minutosEsperados: 'minutosEsperados',
  toleranciaSalidaMin: 'toleranciaSalidaMin',
  ajustaEntrada: 'ajustaEntrada',
  almuerzoInicio: 'almuerzoInicio',
  almuerzoFin: 'almuerzoFin',
  descansos: 'descansos',
  esDescanso: 'esDescanso',
  descansoPintado: 'descansoPintado',
  horarioId: 'horarioId',
  plantillaId: 'plantillaId',
  origen: 'origen',
  creadoEn: 'creadoEn',
  actualizadoEn: 'actualizadoEn'
};

exports.Prisma.RegistroScalarFieldEnum = {
  id: 'id',
  colaboradorId: 'colaboradorId',
  sedeId: 'sedeId',
  sedeSalidaId: 'sedeSalidaId',
  fecha: 'fecha',
  entrada: 'entrada',
  salida: 'salida',
  tipo: 'tipo',
  observacion: 'observacion',
  salidaEstimada: 'salidaEstimada',
  salidaAlmuerzo: 'salidaAlmuerzo',
  salidaDescanso: 'salidaDescanso',
  descansoVentana: 'descansoVentana',
  entradaEstimada: 'entradaEstimada',
  fotoEntrada: 'fotoEntrada',
  fotoSalida: 'fotoSalida',
  metodoEntrada: 'metodoEntrada',
  metodoSalida: 'metodoSalida',
  distanciaEntrada: 'distanciaEntrada',
  distanciaSalida: 'distanciaSalida',
  editadoPor: 'editadoPor',
  editadoEn: 'editadoEn',
  creadoEn: 'creadoEn'
};

exports.Prisma.PermisoScalarFieldEnum = {
  id: 'id',
  colaboradorId: 'colaboradorId',
  registroId: 'registroId',
  fechaInicio: 'fechaInicio',
  fechaFin: 'fechaFin',
  horaInicio: 'horaInicio',
  horaFin: 'horaFin',
  tipo: 'tipo',
  descripcion: 'descripcion',
  aprobado: 'aprobado',
  evidencia: 'evidencia',
  evidenciaTipo: 'evidenciaTipo',
  evidenciaNombre: 'evidenciaNombre',
  creadoEn: 'creadoEn'
};

exports.Prisma.DiaFestivoScalarFieldEnum = {
  id: 'id',
  empresaId: 'empresaId',
  fecha: 'fecha',
  nombre: 'nombre',
  creadoEn: 'creadoEn'
};

exports.Prisma.ConfiguracionScalarFieldEnum = {
  id: 'id',
  empresaId: 'empresaId',
  clave: 'clave',
  valor: 'valor'
};

exports.Prisma.NotificacionScalarFieldEnum = {
  id: 'id',
  empresaId: 'empresaId',
  tipo: 'tipo',
  titulo: 'titulo',
  cuerpo: 'cuerpo',
  entidad: 'entidad',
  entidadId: 'entidadId',
  leida: 'leida',
  leidaEn: 'leidaEn',
  creadoEn: 'creadoEn'
};

exports.Prisma.UsuarioScalarFieldEnum = {
  id: 'id',
  empresaId: 'empresaId',
  afiliadoId: 'afiliadoId',
  email: 'email',
  password: 'password',
  nombre: 'nombre',
  rol: 'rol',
  activo: 'activo',
  resetToken: 'resetToken',
  resetExpira: 'resetExpira',
  emailVerificado: 'emailVerificado',
  verificacionCodigo: 'verificacionCodigo',
  verificacionExpira: 'verificacionExpira',
  creadoEn: 'creadoEn'
};

exports.Prisma.AfiliadoScalarFieldEnum = {
  id: 'id',
  nombre: 'nombre',
  codigo: 'codigo',
  porcentaje: 'porcentaje',
  duracionMeses: 'duracionMeses',
  activo: 'activo',
  telefono: 'telefono',
  pagoMetodo: 'pagoMetodo',
  pagoBanco: 'pagoBanco',
  pagoTipoCuenta: 'pagoTipoCuenta',
  pagoNumero: 'pagoNumero',
  pagoTitular: 'pagoTitular',
  pagoDocumento: 'pagoDocumento',
  creadoEn: 'creadoEn',
  actualizadoEn: 'actualizadoEn'
};

exports.Prisma.ComisionScalarFieldEnum = {
  id: 'id',
  afiliadoId: 'afiliadoId',
  empresaId: 'empresaId',
  pagoId: 'pagoId',
  montoBase: 'montoBase',
  porcentaje: 'porcentaje',
  monto: 'monto',
  estado: 'estado',
  creadoEn: 'creadoEn'
};

exports.Prisma.SolicitudRetiroScalarFieldEnum = {
  id: 'id',
  afiliadoId: 'afiliadoId',
  monto: 'monto',
  estado: 'estado',
  comprobanteBase64: 'comprobanteBase64',
  nota: 'nota',
  solicitadoEn: 'solicitadoEn',
  procesadoEn: 'procesadoEn',
  procesadoPor: 'procesadoPor'
};

exports.Prisma.RegistroCambioScalarFieldEnum = {
  id: 'id',
  registroId: 'registroId',
  campo: 'campo',
  antes: 'antes',
  despues: 'despues',
  usuarioId: 'usuarioId',
  usuarioNombre: 'usuarioNombre',
  creadoEn: 'creadoEn'
};

exports.Prisma.DescansoTrabajadoScalarFieldEnum = {
  id: 'id',
  colaboradorId: 'colaboradorId',
  fecha: 'fecha',
  decision: 'decision',
  fechaCompensatorio: 'fechaCompensatorio',
  claseAlDecidir: 'claseAlDecidir',
  nota: 'nota',
  decididoPor: 'decididoPor',
  decididoNombre: 'decididoNombre',
  decididoEn: 'decididoEn',
  creadoEn: 'creadoEn',
  actualizadoEn: 'actualizadoEn'
};

exports.Prisma.DescansoTrabajadoCambioScalarFieldEnum = {
  id: 'id',
  descansoTrabajadoId: 'descansoTrabajadoId',
  campo: 'campo',
  antes: 'antes',
  despues: 'despues',
  usuarioId: 'usuarioId',
  usuarioNombre: 'usuarioNombre',
  creadoEn: 'creadoEn'
};

exports.Prisma.VinculacionEventoScalarFieldEnum = {
  id: 'id',
  colaboradorId: 'colaboradorId',
  tipo: 'tipo',
  fecha: 'fecha',
  motivo: 'motivo',
  nota: 'nota',
  documento: 'documento',
  documentoTipo: 'documentoTipo',
  documentoNombre: 'documentoNombre',
  usuarioId: 'usuarioId',
  creadoEn: 'creadoEn'
};

exports.Prisma.EnlaceRegistroFacialScalarFieldEnum = {
  id: 'id',
  colaboradorId: 'colaboradorId',
  tokenHash: 'tokenHash',
  venceEn: 'venceEn',
  usadoEn: 'usadoEn',
  anuladoEn: 'anuladoEn',
  intentosCedula: 'intentosCedula',
  usuarioId: 'usuarioId',
  creadoEn: 'creadoEn'
};

exports.Prisma.ConstanciaBiometricaScalarFieldEnum = {
  id: 'id',
  colaboradorId: 'colaboradorId',
  decision: 'decision',
  origen: 'origen',
  texto: 'texto',
  mayorDeEdad: 'mayorDeEdad',
  usuarioId: 'usuarioId',
  enlaceId: 'enlaceId',
  creadoEn: 'creadoEn'
};

exports.Prisma.ContratoScalarFieldEnum = {
  id: 'id',
  colaboradorId: 'colaboradorId',
  tipo: 'tipo',
  fechaInicio: 'fechaInicio',
  fechaFin: 'fechaFin',
  fechaInicioPractica: 'fechaInicioPractica',
  estado: 'estado',
  convertidoAIndefinidoEn: 'convertidoAIndefinidoEn',
  documento: 'documento',
  documentoTipo: 'documentoTipo',
  documentoNombre: 'documentoNombre',
  observacion: 'observacion',
  creadoEn: 'creadoEn',
  actualizadoEn: 'actualizadoEn'
};

exports.Prisma.ProrrogaContratoScalarFieldEnum = {
  id: 'id',
  contratoId: 'contratoId',
  desde: 'desde',
  hasta: 'hasta',
  documento: 'documento',
  documentoTipo: 'documentoTipo',
  documentoNombre: 'documentoNombre',
  creadoEn: 'creadoEn'
};

exports.Prisma.EventoSistemaScalarFieldEnum = {
  id: 'id',
  tipo: 'tipo',
  origen: 'origen',
  huella: 'huella',
  veces: 'veces',
  primeraVez: 'primeraVez',
  ultimaVez: 'ultimaVez',
  metodo: 'metodo',
  ruta: 'ruta',
  estado: 'estado',
  mensaje: 'mensaje',
  detalle: 'detalle',
  ip: 'ip',
  navegador: 'navegador',
  usuarioId: 'usuarioId',
  usuarioEmail: 'usuarioEmail',
  usuarioNombre: 'usuarioNombre',
  empresaId: 'empresaId',
  empresaNombre: 'empresaNombre'
};

exports.Prisma.CalificacionClimaScalarFieldEnum = {
  id: 'id',
  empresaId: 'empresaId',
  colaboradorId: 'colaboradorId',
  fecha: 'fecha',
  carita: 'carita',
  motivos: 'motivos',
  observacion: 'observacion',
  creadoEn: 'creadoEn',
  actualizadoEn: 'actualizadoEn'
};

exports.Prisma.ObservacionConfidencialScalarFieldEnum = {
  id: 'id',
  empresaId: 'empresaId',
  semana: 'semana',
  visibleDesde: 'visibleDesde',
  texto: 'texto',
  autorCifrado: 'autorCifrado'
};

exports.Prisma.SeguimientoClimaScalarFieldEnum = {
  id: 'id',
  empresaId: 'empresaId',
  colaboradorId: 'colaboradorId',
  desde: 'desde',
  estado: 'estado',
  responsableId: 'responsableId',
  abiertoEn: 'abiertoEn',
  cerradoEn: 'cerradoEn',
  actualizadoEn: 'actualizadoEn'
};

exports.Prisma.ComentarioSeguimientoClimaScalarFieldEnum = {
  id: 'id',
  seguimientoId: 'seguimientoId',
  autorId: 'autorId',
  autorNombre: 'autorNombre',
  texto: 'texto',
  creadoEn: 'creadoEn',
  editadoEn: 'editadoEn'
};

exports.Prisma.ResenaScalarFieldEnum = {
  id: 'id',
  origen: 'origen',
  estado: 'estado',
  empresaId: 'empresaId',
  usuarioId: 'usuarioId',
  estrellas: 'estrellas',
  texto: 'texto',
  comoAparece: 'comoAparece',
  nombrePublico: 'nombrePublico',
  cargoPublico: 'cargoPublico',
  textoAutorizacion: 'textoAutorizacion',
  versionPolitica: 'versionPolitica',
  canal: 'canal',
  referencia: 'referencia',
  autorizacion: 'autorizacion',
  fechaOpinion: 'fechaOpinion',
  registradaPor: 'registradaPor',
  planAlEnviar: 'planAlEnviar',
  mesesPagadosAlEnviar: 'mesesPagadosAlEnviar',
  nombreRetiradoEn: 'nombreRetiradoEn',
  publicadaEn: 'publicadaEn',
  creadoEn: 'creadoEn',
  actualizadoEn: 'actualizadoEn'
};

exports.Prisma.SortOrder = {
  asc: 'asc',
  desc: 'desc'
};

exports.Prisma.NullableJsonNullValueInput = {
  DbNull: Prisma.DbNull,
  JsonNull: Prisma.JsonNull
};

exports.Prisma.JsonNullValueInput = {
  JsonNull: Prisma.JsonNull
};

exports.Prisma.NullsOrder = {
  first: 'first',
  last: 'last'
};

exports.Prisma.JsonNullValueFilter = {
  DbNull: Prisma.DbNull,
  JsonNull: Prisma.JsonNull,
  AnyNull: Prisma.AnyNull
};
exports.EstadoSuscripcion = exports.$Enums.EstadoSuscripcion = {
  PRUEBA: 'PRUEBA',
  ACTIVA: 'ACTIVA',
  EN_MORA: 'EN_MORA',
  SUSPENDIDA: 'SUSPENDIDA',
  CANCELADA: 'CANCELADA'
};

exports.MetodoPago = exports.$Enums.MetodoPago = {
  TARJETA_RECURRENTE: 'TARJETA_RECURRENTE',
  LINK_WOMPI: 'LINK_WOMPI',
  MANUAL: 'MANUAL'
};

exports.EstadoPago = exports.$Enums.EstadoPago = {
  PENDIENTE: 'PENDIENTE',
  APROBADO: 'APROBADO',
  RECHAZADO: 'RECHAZADO'
};

exports.ModalidadTrabajo = exports.$Enums.ModalidadTrabajo = {
  PRESENCIAL: 'PRESENCIAL',
  HIBRIDO: 'HIBRIDO',
  REMOTO: 'REMOTO'
};

exports.MotivoRetiro = exports.$Enums.MotivoRetiro = {
  RENUNCIA: 'RENUNCIA',
  FIN_CONTRATO: 'FIN_CONTRATO',
  SIN_JUSTA_CAUSA: 'SIN_JUSTA_CAUSA',
  JUSTA_CAUSA: 'JUSTA_CAUSA',
  FIN_OBRA: 'FIN_OBRA',
  OTRO: 'OTRO'
};

exports.TipoRegistro = exports.$Enums.TipoRegistro = {
  NORMAL: 'NORMAL',
  PERMISO: 'PERMISO',
  FESTIVO: 'FESTIVO'
};

exports.MetodoMarcacion = exports.$Enums.MetodoMarcacion = {
  ROSTRO: 'ROSTRO',
  CEDULA: 'CEDULA',
  MANUAL: 'MANUAL'
};

exports.TipoPermiso = exports.$Enums.TipoPermiso = {
  VACACIONES: 'VACACIONES',
  INCAPACIDAD_EPS: 'INCAPACIDAD_EPS',
  INCAPACIDAD_ARL: 'INCAPACIDAD_ARL',
  LICENCIA_MATERNIDAD: 'LICENCIA_MATERNIDAD',
  LICENCIA_PATERNIDAD: 'LICENCIA_PATERNIDAD',
  LICENCIA_LUTO: 'LICENCIA_LUTO',
  CALAMIDAD: 'CALAMIDAD',
  MEDICO: 'MEDICO',
  PERSONAL: 'PERSONAL',
  NO_REMUNERADO: 'NO_REMUNERADO',
  OTRO: 'OTRO'
};

exports.Rol = exports.$Enums.Rol = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
  SUPERVISOR: 'SUPERVISOR',
  AFILIADO: 'AFILIADO'
};

exports.MetodoPagoAfiliado = exports.$Enums.MetodoPagoAfiliado = {
  NEQUI: 'NEQUI',
  BANCOLOMBIA: 'BANCOLOMBIA',
  DAVIPLATA: 'DAVIPLATA',
  OTRO: 'OTRO'
};

exports.TipoCuentaBancaria = exports.$Enums.TipoCuentaBancaria = {
  AHORROS: 'AHORROS',
  CORRIENTE: 'CORRIENTE'
};

exports.EstadoComision = exports.$Enums.EstadoComision = {
  CAUSADA: 'CAUSADA',
  ANULADA: 'ANULADA'
};

exports.EstadoRetiro = exports.$Enums.EstadoRetiro = {
  SOLICITADO: 'SOLICITADO',
  APROBADO: 'APROBADO',
  PAGADO: 'PAGADO',
  RECHAZADO: 'RECHAZADO'
};

exports.TipoVinculacion = exports.$Enums.TipoVinculacion = {
  INGRESO: 'INGRESO',
  RETIRO: 'RETIRO',
  REINGRESO: 'REINGRESO'
};

exports.DecisionBiometrica = exports.$Enums.DecisionBiometrica = {
  AUTORIZA: 'AUTORIZA',
  NO_AUTORIZA: 'NO_AUTORIZA'
};

exports.OrigenConstancia = exports.$Enums.OrigenConstancia = {
  ENLACE: 'ENLACE',
  ADMINISTRADOR: 'ADMINISTRADOR'
};

exports.TipoContrato = exports.$Enums.TipoContrato = {
  INDEFINIDO: 'INDEFINIDO',
  FIJO: 'FIJO',
  OBRA_LABOR: 'OBRA_LABOR',
  APRENDIZAJE: 'APRENDIZAJE'
};

exports.EstadoContrato = exports.$Enums.EstadoContrato = {
  VIGENTE: 'VIGENTE',
  TERMINADO: 'TERMINADO'
};

exports.TipoEvento = exports.$Enums.TipoEvento = {
  ERROR: 'ERROR',
  ACCESO: 'ACCESO',
  AUDITORIA: 'AUDITORIA'
};

exports.OrigenEvento = exports.$Enums.OrigenEvento = {
  SERVIDOR: 'SERVIDOR',
  NAVEGADOR: 'NAVEGADOR'
};

exports.EstadoSeguimientoClima = exports.$Enums.EstadoSeguimientoClima = {
  SIN_REVISAR: 'SIN_REVISAR',
  EN_SEGUIMIENTO: 'EN_SEGUIMIENTO',
  CERRADO: 'CERRADO'
};

exports.OrigenResena = exports.$Enums.OrigenResena = {
  CLIENTE: 'CLIENTE',
  MANUAL: 'MANUAL'
};

exports.EstadoResena = exports.$Enums.EstadoResena = {
  OMITIDA: 'OMITIDA',
  POR_REVISAR: 'POR_REVISAR',
  PUBLICADA: 'PUBLICADA',
  OCULTA: 'OCULTA',
  ARCHIVADA: 'ARCHIVADA'
};

exports.ComoAparece = exports.$Enums.ComoAparece = {
  CON_NOMBRE: 'CON_NOMBRE',
  ANONIMA: 'ANONIMA'
};

exports.Prisma.ModelName = {
  Empresa: 'Empresa',
  Suscripcion: 'Suscripcion',
  Pago: 'Pago',
  ConfiguracionPlataforma: 'ConfiguracionPlataforma',
  JornadaVigencia: 'JornadaVigencia',
  AuxilioVigencia: 'AuxilioVigencia',
  TipoHora: 'TipoHora',
  Horario: 'Horario',
  FranjaHorario: 'FranjaHorario',
  PlantillaTurno: 'PlantillaTurno',
  DispositivoKiosco: 'DispositivoKiosco',
  Colaborador: 'Colaborador',
  Sede: 'Sede',
  ColaboradorSede: 'ColaboradorSede',
  DiaEsperado: 'DiaEsperado',
  Registro: 'Registro',
  Permiso: 'Permiso',
  DiaFestivo: 'DiaFestivo',
  Configuracion: 'Configuracion',
  Notificacion: 'Notificacion',
  Usuario: 'Usuario',
  Afiliado: 'Afiliado',
  Comision: 'Comision',
  SolicitudRetiro: 'SolicitudRetiro',
  RegistroCambio: 'RegistroCambio',
  DescansoTrabajado: 'DescansoTrabajado',
  DescansoTrabajadoCambio: 'DescansoTrabajadoCambio',
  VinculacionEvento: 'VinculacionEvento',
  EnlaceRegistroFacial: 'EnlaceRegistroFacial',
  ConstanciaBiometrica: 'ConstanciaBiometrica',
  Contrato: 'Contrato',
  ProrrogaContrato: 'ProrrogaContrato',
  EventoSistema: 'EventoSistema',
  CalificacionClima: 'CalificacionClima',
  ObservacionConfidencial: 'ObservacionConfidencial',
  SeguimientoClima: 'SeguimientoClima',
  ComentarioSeguimientoClima: 'ComentarioSeguimientoClima',
  Resena: 'Resena'
};

/**
 * This is a stub Prisma Client that will error at runtime if called.
 */
class PrismaClient {
  constructor() {
    return new Proxy(this, {
      get(target, prop) {
        let message
        const runtime = getRuntime()
        if (runtime.isEdge) {
          message = `PrismaClient is not configured to run in ${runtime.prettyName}. In order to run Prisma Client on edge runtime, either:
- Use Prisma Accelerate: https://pris.ly/d/accelerate
- Use Driver Adapters: https://pris.ly/d/driver-adapters
`;
        } else {
          message = 'PrismaClient is unable to run in this browser environment, or has been bundled for the browser (running in `' + runtime.prettyName + '`).'
        }
        
        message += `
If this is unexpected, please open an issue: https://pris.ly/prisma-prisma-bug-report`

        throw new Error(message)
      }
    })
  }
}

exports.PrismaClient = PrismaClient

Object.assign(exports, Prisma)
