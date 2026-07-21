
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
  creadoEn: 'creadoEn',
  actualizadoEn: 'actualizadoEn'
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
  activo: 'activo',
  creadoEn: 'creadoEn'
};

exports.Prisma.FranjaHorarioScalarFieldEnum = {
  id: 'id',
  horarioId: 'horarioId',
  dias: 'dias',
  horaEntrada: 'horaEntrada',
  horaSalida: 'horaSalida',
  tieneAlmuerzo: 'tieneAlmuerzo'
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
  cargo: 'cargo',
  email: 'email',
  telefono: 'telefono',
  fechaNacimiento: 'fechaNacimiento',
  salarioMensual: 'salarioMensual',
  rostroDescriptor: 'rostroDescriptor',
  rostroEnroladoEn: 'rostroEnroladoEn',
  horarioId: 'horarioId',
  activo: 'activo',
  retiroProgramado: 'retiroProgramado',
  creadoEn: 'creadoEn',
  actualizadoEn: 'actualizadoEn'
};

exports.Prisma.RegistroScalarFieldEnum = {
  id: 'id',
  colaboradorId: 'colaboradorId',
  fecha: 'fecha',
  entrada: 'entrada',
  salida: 'salida',
  tipo: 'tipo',
  observacion: 'observacion',
  fotoEntrada: 'fotoEntrada',
  fotoSalida: 'fotoSalida',
  editadoPor: 'editadoPor',
  editadoEn: 'editadoEn',
  creadoEn: 'creadoEn'
};

exports.Prisma.PermisoScalarFieldEnum = {
  id: 'id',
  colaboradorId: 'colaboradorId',
  fechaInicio: 'fechaInicio',
  fechaFin: 'fechaFin',
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

exports.Prisma.UsuarioScalarFieldEnum = {
  id: 'id',
  empresaId: 'empresaId',
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

exports.TipoRegistro = exports.$Enums.TipoRegistro = {
  NORMAL: 'NORMAL',
  PERMISO: 'PERMISO',
  FESTIVO: 'FESTIVO'
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
  SUPERVISOR: 'SUPERVISOR'
};

exports.Prisma.ModelName = {
  Empresa: 'Empresa',
  Suscripcion: 'Suscripcion',
  Pago: 'Pago',
  ConfiguracionPlataforma: 'ConfiguracionPlataforma',
  JornadaVigencia: 'JornadaVigencia',
  TipoHora: 'TipoHora',
  Horario: 'Horario',
  FranjaHorario: 'FranjaHorario',
  DispositivoKiosco: 'DispositivoKiosco',
  Colaborador: 'Colaborador',
  Registro: 'Registro',
  Permiso: 'Permiso',
  DiaFestivo: 'DiaFestivo',
  Configuracion: 'Configuracion',
  Usuario: 'Usuario'
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
