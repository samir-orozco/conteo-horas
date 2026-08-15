
Object.defineProperty(exports, "__esModule", { value: true });

const {
  PrismaClientKnownRequestError,
  PrismaClientUnknownRequestError,
  PrismaClientRustPanicError,
  PrismaClientInitializationError,
  PrismaClientValidationError,
  NotFoundError,
  getPrismaClient,
  sqltag,
  empty,
  join,
  raw,
  skip,
  Decimal,
  Debug,
  objectEnumValues,
  makeStrictEnum,
  Extensions,
  warnOnce,
  defineDmmfProperty,
  Public,
  getRuntime
} = require('@prisma/client/runtime/edge.js')


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

Prisma.PrismaClientKnownRequestError = PrismaClientKnownRequestError;
Prisma.PrismaClientUnknownRequestError = PrismaClientUnknownRequestError
Prisma.PrismaClientRustPanicError = PrismaClientRustPanicError
Prisma.PrismaClientInitializationError = PrismaClientInitializationError
Prisma.PrismaClientValidationError = PrismaClientValidationError
Prisma.NotFoundError = NotFoundError
Prisma.Decimal = Decimal

/**
 * Re-export of sql-template-tag
 */
Prisma.sql = sqltag
Prisma.empty = empty
Prisma.join = join
Prisma.raw = raw
Prisma.validator = Public.validator

/**
* Extensions
*/
Prisma.getExtensionContext = Extensions.getExtensionContext
Prisma.defineExtension = Extensions.defineExtension

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
  almuerzoFin: 'almuerzoFin'
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
  horarioId: 'horarioId',
  origen: 'origen',
  creadoEn: 'creadoEn',
  actualizadoEn: 'actualizadoEn'
};

exports.Prisma.RegistroScalarFieldEnum = {
  id: 'id',
  colaboradorId: 'colaboradorId',
  sedeId: 'sedeId',
  fecha: 'fecha',
  entrada: 'entrada',
  salida: 'salida',
  tipo: 'tipo',
  observacion: 'observacion',
  salidaEstimada: 'salidaEstimada',
  salidaAlmuerzo: 'salidaAlmuerzo',
  entradaEstimada: 'entradaEstimada',
  fotoEntrada: 'fotoEntrada',
  fotoSalida: 'fotoSalida',
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
  SolicitudRetiro: 'SolicitudRetiro'
};
/**
 * Create the Client
 */
const config = {
  "generator": {
    "name": "client",
    "provider": {
      "fromEnvVar": null,
      "value": "prisma-client-js"
    },
    "output": {
      "value": "/Users/mac/Documents/Krumlab/Conteo_Horas/backend/node_modules/@prisma/client",
      "fromEnvVar": null
    },
    "config": {
      "engineType": "library"
    },
    "binaryTargets": [
      {
        "fromEnvVar": null,
        "value": "darwin-arm64",
        "native": true
      },
      {
        "fromEnvVar": null,
        "value": "rhel-openssl-1.1.x"
      },
      {
        "fromEnvVar": null,
        "value": "debian-openssl-1.1.x"
      }
    ],
    "previewFeatures": [],
    "sourceFilePath": "/Users/mac/Documents/Krumlab/Conteo_Horas/backend/prisma/schema.prisma"
  },
  "relativeEnvPaths": {
    "rootEnvPath": null,
    "schemaEnvPath": "../../../.env"
  },
  "relativePath": "../../../prisma",
  "clientVersion": "5.22.0",
  "engineVersion": "605197351a3c8bdd595af2d2a9bc3025bca48ea2",
  "datasourceNames": [
    "db"
  ],
  "activeProvider": "mysql",
  "postinstall": false,
  "inlineDatasources": {
    "db": {
      "url": {
        "fromEnvVar": "DATABASE_URL",
        "value": null
      }
    }
  },
  "inlineSchema": "generator client {\n  provider      = \"prisma-client-js\"\n  binaryTargets = [\"native\", \"rhel-openssl-1.1.x\", \"debian-openssl-1.1.x\"]\n}\n\ndatasource db {\n  provider = \"mysql\"\n  url      = env(\"DATABASE_URL\")\n}\n\n// ============ SaaS / Multi-tenant ============\n\nmodel Empresa {\n  id                   String              @id @default(cuid())\n  nombre               String\n  nit                  String              @unique\n  email                String\n  telefono             String?\n  // Token del link único del kiosco de marcación: /marcador/<token>\n  marcadorToken        String              @unique @default(cuid())\n  // Acceso ilimitado (cortesía): nunca se le cobra ni se bloquea\n  exentaPago           Boolean             @default(false)\n  activa               Boolean             @default(true)\n  creadoEn             DateTime            @default(now())\n  actualizadoEn        DateTime            @updatedAt\n  usuarios             Usuario[]\n  colaboradores        Colaborador[]\n  festivos             DiaFestivo[]\n  configuracion        Configuracion[]\n  suscripcion          Suscripcion?\n  horarios             Horario[]\n  sedes                Sede[]\n  dispositivos         DispositivoKiosco[]\n  notificaciones       Notificacion[]\n  // Afiliado que trajo a esta empresa (programa de referidos)\n  afiliadoId           String?\n  afiliado             Afiliado?           @relation(fields: [afiliadoId], references: [id])\n  atribuidoEn          DateTime? // cuándo se asoció al afiliado (en el registro)\n  primerPagoComisionEn DateTime? // primer pago que comisionó (ancla la duración)\n  comisiones           Comision[]\n\n  @@map(\"empresas\")\n}\n\nmodel Suscripcion {\n  id                String            @id @default(cuid())\n  empresaId         String            @unique\n  empresa           Empresa           @relation(fields: [empresaId], references: [id])\n  estado            EstadoSuscripcion @default(PRUEBA)\n  finPrueba         DateTime // 7 días desde la creación\n  pagadoHasta       DateTime? // fin del último período pagado\n  suspendidaEn      DateTime?\n  // Plan contratado y ciclo de facturación\n  plan              String            @default(\"PROFESIONAL\") // ESENCIAL | PROFESIONAL | EMPRESARIAL\n  cicloPago         String            @default(\"MENSUAL\") // MENSUAL | ANUAL\n  // Personalización por cliente (super admin). null = usa lo del plan.\n  limiteOverride    Int? // sobrescribe el límite de colaboradores del plan\n  funcionesOverride Json? // { gps: true, telegram: false, ... } sobre las del plan\n  // Precio personalizado por cliente. null = usa el precio del plan.\n  // FIJO = precioFijo mensual\n  precioModo        String? // null | \"FIJO\"\n  precioFijo        Int?\n  precioTramo1      Int?\n  limiteTramo1      Int?\n  precioTramo2      Int?\n  // Wompi: fuente de pago tokenizada para cobro recurrente (null = paga por link)\n  wompiFuentePagoId String?\n  creadoEn          DateTime          @default(now())\n  actualizadoEn     DateTime          @updatedAt\n  pagos             Pago[]\n\n  @@map(\"suscripciones\")\n}\n\nmodel Pago {\n  id                      String      @id @default(cuid())\n  suscripcionId           String\n  suscripcion             Suscripcion @relation(fields: [suscripcionId], references: [id])\n  monto                   Float\n  colaboradoresFacturados Int\n  periodoInicio           DateTime\n  periodoFin              DateTime\n  metodo                  MetodoPago\n  estado                  EstadoPago  @default(APROBADO)\n  wompiTransaccionId      String?     @unique\n  nota                    String? // referencia, banco, observaciones\n  comprobanteBase64       String?     @db.LongText // foto del soporte (data URL)\n  registradoPor           String? // email del super admin que lo registró\n  creadoEn                DateTime    @default(now())\n  comision                Comision? // comisión de afiliado generada por este pago (si aplica)\n\n  @@map(\"pagos\")\n}\n\n// Precios del SaaS — editables por el super admin (fila única id=1)\nmodel ConfiguracionPlataforma {\n  id           Int   @id @default(1)\n  precioTramo1 Float @default(10000) // (legado) COP por colaborador, tramo inicial\n  limiteTramo1 Int   @default(15) // (legado) tamaño del tramo inicial\n  precioTramo2 Float @default(2000) // (legado) COP por colaborador adicional\n  // Overrides de los planes editables desde el super admin (precio, límite, funciones).\n  // null = usa los valores por defecto del código.\n  planes       Json?\n\n  @@map(\"configuracion_plataforma\")\n}\n\n// ============ Reglas legales (globales, con vigencias) ============\n\n// Jornada máxima legal semanal — Ley 2101 de 2021 (48→42h gradual)\nmodel JornadaVigencia {\n  id             String   @id @default(cuid())\n  vigenteDesde   DateTime @unique\n  horasSemanales Float\n\n  @@map(\"jornadas_vigencia\")\n}\n\n// Tipos de hora y recargos — CST + Ley 2466 de 2025, con vigencias por fecha\nmodel TipoHora {\n  id           String    @id @default(cuid())\n  nombre       String\n  codigo       String // HOD, HON, HED, HEN, HDD, HND, HEDD, HEND\n  horaInicio   Int // 0-23\n  horaFin      Int // 0-23\n  recargo      Float // factor sobre hora ordinaria (ej: 1.35)\n  aplica       Json // [\"LUNES\",...,\"DOMINGO\",\"FESTIVO\"] — MySQL no soporta arrays escalares\n  vigenteDesde DateTime\n  vigenteHasta DateTime? // null = vigente indefinidamente\n  activo       Boolean   @default(true)\n\n  @@unique([codigo, vigenteDesde])\n  @@map(\"tipos_hora\")\n}\n\n// ============ Negocio por empresa ============\n\n// Horarios de trabajo de la empresa (ej: \"Oficina\" L-V 08:00-17:00).\n// Se asignan por colaborador; sin horario no se controlan llegadas tarde.\nmodel Horario {\n  id                  String          @id @default(cuid())\n  empresaId           String\n  empresa             Empresa         @relation(fields: [empresaId], references: [id])\n  nombre              String\n  toleranciaMin       Int             @default(10) // minutos de gracia antes de contar tardanza\n  almuerzoMin         Int             @default(0) // minutos de almuerzo que NO se pagan (se descuentan de la jornada)\n  // Minutos que alguien puede quedarse de más SIN que se paguen como extra: por\n  // debajo del umbral se toma la hora de salida programada. 0 = desactivado, que\n  // es el valor por defecto para no cambiarle el cálculo a nadie.\n  toleranciaSalidaMin Int             @default(0)\n  // Si también se aplica a las entradas tempranas. Apagado por defecto: dejarlo\n  // solo en la salida sería asimétrico a favor de la empresa, así que la\n  // simetría existe pero se elige a propósito.\n  ajustaEntrada       Boolean         @default(false)\n  activo              Boolean         @default(true)\n  creadoEn            DateTime        @default(now())\n  // Un horario tiene varias franjas: ej. L-V 08:00-17:00 y Sáb 08:00-12:00\n  franjas             FranjaHorario[]\n  colaboradores       Colaborador[]\n\n  @@map(\"horarios\")\n}\n\nmodel FranjaHorario {\n  id             String  @id @default(cuid())\n  horarioId      String\n  horario        Horario @relation(fields: [horarioId], references: [id], onDelete: Cascade)\n  dias           Json // [\"LUNES\",...,\"SABADO\"]\n  horaEntrada    String // \"08:00\" hora local Bogotá\n  horaSalida     String // \"17:00\" (puede cruzar medianoche, ej. \"21:00\"→\"05:00\")\n  tieneAlmuerzo  Boolean @default(true) // si esta franja descuenta el almuerzo del horario (ej. sábado corto = false)\n  // Ventana de almuerzo de ESTE día: \"12:00\" → \"13:00\". Va en la franja y no en\n  // el horario porque el sábado corto puede no tener, y un turno nocturno\n  // almuerza en la madrugada. Vacía = comportamiento histórico (minutos fijos).\n  almuerzoInicio String?\n  almuerzoFin    String?\n\n  @@map(\"franjas_horario\")\n}\n\n// Dispositivos autorizados para abrir el kiosco de marcación.\n// Evita que un colaborador copie el link y marque desde su casa.\nmodel DispositivoKiosco {\n  id        String    @id @default(cuid())\n  empresaId String\n  empresa   Empresa   @relation(fields: [empresaId], references: [id])\n  nombre    String\n  token     String    @unique\n  creadoEn  DateTime  @default(now())\n  ultimoUso DateTime?\n\n  @@map(\"dispositivos_kiosco\")\n}\n\nmodel Colaborador {\n  id               String            @id @default(cuid())\n  empresaId        String\n  empresa          Empresa           @relation(fields: [empresaId], references: [id])\n  nombre           String\n  apellido         String\n  cedula           String // marcación en kiosco por cédula\n  cargo            String?\n  email            String?\n  telefono         String?\n  fechaNacimiento  DateTime?\n  salarioMensual   Float\n  // Reconocimiento facial: descriptor matemático (128 floats), nunca la imagen\n  rostroDescriptor Json?\n  rostroEnroladoEn DateTime? // evidencia del consentimiento (dato biométrico, Ley 1581)\n  horarioId        String?\n  horario          Horario?          @relation(fields: [horarioId], references: [id])\n  activo           Boolean           @default(true)\n  // Si el mes ya está pagado, el \"borrado\" se programa para fin de mes\n  retiroProgramado DateTime?\n  creadoEn         DateTime          @default(now())\n  actualizadoEn    DateTime          @updatedAt\n  registros        Registro[]\n  permisos         Permiso[]\n  diasEsperados    DiaEsperado[]\n  sedes            ColaboradorSede[]\n\n  @@unique([empresaId, cedula])\n  @@map(\"colaboradores\")\n}\n\n// Sede física de la empresa (plan Empresarial). Cada una tiene su propia\n// geocerca, así que una empresa con varios locales deja de compartir un único\n// punto para todos.\n//\n// Un colaborador puede estar en VARIAS sedes: quien rota entre locales abre y\n// cierra turno en cualquiera de las suyas. Marcar fuera de ellas no se registra.\nmodel Sede {\n  id            String   @id @default(cuid())\n  empresaId     String\n  empresa       Empresa  @relation(fields: [empresaId], references: [id])\n  nombre        String\n  direccion     String?\n  // Geocerca propia. Sin lat/lng la sede no exige ubicación (útil para oficinas\n  // sin GPS o mientras se configura).\n  lat           Float?\n  lng           Float?\n  radio         Int      @default(150)\n  activa        Boolean  @default(true)\n  creadoEn      DateTime @default(now())\n  actualizadoEn DateTime @updatedAt\n\n  colaboradores ColaboradorSede[]\n  registros     Registro[]\n\n  @@index([empresaId])\n  @@map(\"sedes\")\n}\n\n// Qué colaborador puede marcar en qué sede. Es una tabla explícita y no una\n// relación implícita de Prisma porque el DDL de producción se escribe a mano:\n// una tabla con nombre y columnas propias es la que se puede crear sin adivinar\n// convenciones internas del ORM.\nmodel ColaboradorSede {\n  colaboradorId String\n  sedeId        String\n  colaborador   Colaborador @relation(fields: [colaboradorId], references: [id], onDelete: Cascade)\n  sede          Sede        @relation(fields: [sedeId], references: [id], onDelete: Cascade)\n  creadoEn      DateTime    @default(now())\n\n  @@id([colaboradorId, sedeId])\n  @@index([sedeId])\n  @@map(\"colaboradores_sedes\")\n}\n\n// Lo que el horario de un colaborador exigía UN día concreto, congelado.\n//\n// Sin esto, editar un horario reescribe el pasado: los reportes de meses\n// anteriores se recalculan con la configuración actual, y desde que existe el\n// descuento por tiempo no remunerado eso mueve dinero ya liquidado.\n//\n// Se genera solo desde el horario asignado. Los días PASADOS no se vuelven a\n// tocar; al cambiar un horario solo se regeneran los días futuros.\nmodel DiaEsperado {\n  id                  String      @id @default(cuid())\n  colaboradorId       String\n  colaborador         Colaborador @relation(fields: [colaboradorId], references: [id], onDelete: Cascade)\n  fecha               DateTime // medianoche de Bogotá, igual convención que Registro.fecha\n  programado          Boolean     @default(false) // false = ese día no se trabajaba\n  horaEntrada         String? // \"08:00\"\n  horaSalida          String? // \"17:00\"\n  toleranciaMin       Int         @default(0)\n  almuerzoMin         Int         @default(0) // el que aplica ESE día\n  minutosEsperados    Int         @default(0) // ya neto de almuerzo\n  // La tolerancia de salida también se congela: es política de la empresa, y si\n  // la cambian mañana no puede mover lo que ya se liquidó.\n  toleranciaSalidaMin Int         @default(0)\n  ajustaEntrada       Boolean     @default(false)\n  // La ventana de almuerzo también se congela: cambiarla mañana no puede mover\n  // lo ya liquidado. Vacía en todo lo anterior a la función.\n  almuerzoInicio      String?\n  almuerzoFin         String?\n  // De qué horario salió, solo informativo: el horario puede cambiar después.\n  horarioId           String?\n  // AUTO = generado desde el horario · MANUAL = lo cambió el admin (turno rotativo)\n  origen              String      @default(\"AUTO\")\n  creadoEn            DateTime    @default(now())\n  actualizadoEn       DateTime    @updatedAt\n\n  @@unique([colaboradorId, fecha])\n  @@index([colaboradorId, fecha])\n  @@map(\"dias_esperados\")\n}\n\nmodel Registro {\n  id              String       @id @default(cuid())\n  colaboradorId   String\n  colaborador     Colaborador  @relation(fields: [colaboradorId], references: [id])\n  // Sede donde OCURRIÓ la marcación. Es distinto de las sedes asignadas al\n  // colaborador: el filtro por sede de los reportes tiene que decir dónde marcó\n  // de verdad, no dónde debería. Null en todo lo anterior a la función.\n  sedeId          String?\n  sede            Sede?        @relation(fields: [sedeId], references: [id])\n  fecha           DateTime\n  entrada         DateTime?\n  salida          DateTime?\n  tipo            TipoRegistro @default(NORMAL)\n  observacion     String?\n  // Salida generada por el auto-cierre (la persona no marcó): se muestra como chip\n  // \"No marcó salida\" en la columna Salida para que el admin la revise. No toca `tipo`,\n  // así la liquidación del día sigue siendo correcta (NORMAL/FESTIVO).\n  salidaEstimada  Boolean      @default(false)\n  // La salida fue a almorzar, no el fin de la jornada. Lo dice el propio\n  // colaborador en el kiosco: el sistema no puede adivinarlo.\n  salidaAlmuerzo  Boolean      @default(false)\n  // El regreso del almuerzo lo puso el sistema porque nadie lo marcó. Va en el\n  // dato y no solo en el color: el día que alguien reclame, el registro tiene\n  // que poder decir que esa hora no la marcó una persona.\n  entradaEstimada Boolean      @default(false)\n  // Foto de verificación facial al marcar (se elimina automáticamente a los 2 meses)\n  fotoEntrada     String?      @db.LongText\n  fotoSalida      String?      @db.LongText\n  // Auditoría de correcciones manuales\n  editadoPor      String?\n  editadoEn       DateTime?\n  creadoEn        DateTime     @default(now())\n  // Novedades que nacieron de ESTA marcación (salida temprana en el kiosco).\n  // Se borran con ella: son parte de la marcación, no registros independientes.\n  novedades       Permiso[]\n\n  @@map(\"registros\")\n}\n\nmodel Permiso {\n  id              String      @id @default(cuid())\n  colaboradorId   String\n  colaborador     Colaborador @relation(fields: [colaboradorId], references: [id])\n  // La marcación que creó esta novedad, cuando nació de una salida temprana en\n  // el kiosco. Null cuando la cargó un admin a mano: esa vive por su cuenta.\n  //\n  // Existe porque un día puede tener varias novedades legítimas —cita médica en\n  // la mañana, una urgencia en la tarde— así que no se pueden identificar por\n  // colaborador y fecha. Sin este vínculo, borrar la marcación dejaba la novedad\n  // huérfana y pendiente de aprobar, y quien la aprobaba después excusaba una\n  // jornada cuya marcación ya no existía.\n  registroId      String?\n  registro        Registro?   @relation(fields: [registroId], references: [id], onDelete: Cascade)\n  fechaInicio     DateTime\n  fechaFin        DateTime\n  // Novedad de parte del día (\"cita médica de 14:00 a 17:00\"). Vacías = día\n  // completo, como siempre. Solo aplican a novedades de UN día: para vacaciones\n  // de una semana no significan nada.\n  horaInicio      String?\n  horaFin         String?\n  tipo            TipoPermiso\n  descripcion     String?\n  aprobado        Boolean     @default(false)\n  // Evidencia opcional (imagen o PDF) en base64 data URI. LongText por tamaño.\n  evidencia       String?     @db.LongText\n  evidenciaTipo   String? // mime, ej. image/jpeg o application/pdf\n  evidenciaNombre String?\n  creadoEn        DateTime    @default(now())\n\n  @@map(\"permisos\")\n}\n\nmodel DiaFestivo {\n  id        String   @id @default(cuid())\n  empresaId String? // null = festivo legal nacional (generado por algoritmo)\n  empresa   Empresa? @relation(fields: [empresaId], references: [id])\n  fecha     DateTime\n  nombre    String\n  creadoEn  DateTime @default(now())\n\n  @@unique([empresaId, fecha])\n  @@map(\"dias_festivos\")\n}\n\nmodel Configuracion {\n  id        String  @id @default(cuid())\n  empresaId String\n  empresa   Empresa @relation(fields: [empresaId], references: [id])\n  clave     String\n  valor     String\n\n  @@unique([empresaId, clave])\n  @@map(\"configuracion\")\n}\n\n// Aviso interno para el admin (campana del menú). Se genera por eventos del sistema.\nmodel Notificacion {\n  id        String    @id @default(cuid())\n  empresaId String\n  empresa   Empresa   @relation(fields: [empresaId], references: [id])\n  // NO_MARCO_SALIDA | LLEGADA_TARDE | NOVEDAD_PENDIENTE (string por flexibilidad)\n  tipo      String\n  titulo    String\n  cuerpo    String?   @db.Text\n  // Enlace opcional para abrir el detalle desde la campana\n  entidad   String? // 'registro' | 'permiso' | 'colaborador'\n  entidadId String?\n  leida     Boolean   @default(false)\n  leidaEn   DateTime?\n  creadoEn  DateTime  @default(now())\n\n  @@index([empresaId, leida])\n  @@index([empresaId, creadoEn])\n  @@map(\"notificaciones\")\n}\n\nmodel Usuario {\n  id                 String    @id @default(cuid())\n  empresaId          String? // null = SUPER_ADMIN (usuario de la plataforma)\n  empresa            Empresa?  @relation(fields: [empresaId], references: [id])\n  // Si el usuario es AFILIADO, apunta a su ficha (como empresaId para empresas)\n  afiliadoId         String?\n  afiliado           Afiliado? @relation(fields: [afiliadoId], references: [id])\n  email              String    @unique\n  password           String\n  nombre             String\n  rol                Rol       @default(ADMIN)\n  activo             Boolean   @default(true)\n  // Recuperación de contraseña: token de un solo uso con vencimiento\n  resetToken         String?   @unique\n  resetExpira        DateTime?\n  // Verificación del correo al registrarse (evita cuentas con correos falsos)\n  emailVerificado    Boolean   @default(false)\n  verificacionCodigo String? // 6 dígitos, se valida junto con el email (no único: puede repetirse entre cuentas)\n  verificacionExpira DateTime?\n  creadoEn           DateTime  @default(now())\n\n  @@map(\"usuarios\")\n}\n\n// ============ Programa de afiliados (referidos) ============\n\n// Afiliado = persona que trae clientes. Sus credenciales viven en Usuario\n// (rol AFILIADO + afiliadoId), igual que los usuarios de empresa usan empresaId.\nmodel Afiliado {\n  id             String              @id @default(cuid())\n  nombre         String\n  // Código para el link de referido: /?ref=<codigo>\n  codigo         String              @unique\n  // Trato comercial: % sobre cada pago del referido durante N meses desde su\n  // primer pago (duracionMeses null = indefinido). El % se congela en cada comisión.\n  porcentaje     Float               @default(20)\n  duracionMeses  Int?\n  activo         Boolean             @default(true)\n  telefono       String?\n  // Datos para el pago externo de comisiones (billetera)\n  pagoMetodo     MetodoPagoAfiliado?\n  pagoBanco      String? // nombre del banco cuando el método es OTRO\n  pagoTipoCuenta TipoCuentaBancaria? // solo bancos (Nequi/Daviplata no aplica)\n  pagoNumero     String? // número de cuenta, o celular si es Nequi/Daviplata\n  pagoTitular    String?\n  pagoDocumento  String? // cédula/NIT del titular (pago externo + retención)\n  creadoEn       DateTime            @default(now())\n  actualizadoEn  DateTime            @updatedAt\n  usuarios       Usuario[]\n  empresas       Empresa[] // referidos\n  comisiones     Comision[]\n  retiros        SolicitudRetiro[]\n\n  @@map(\"afiliados\")\n}\n\n// Una comisión causada por un pago concreto de un referido (1 pago → 1 comisión).\nmodel Comision {\n  id         String         @id @default(cuid())\n  afiliadoId String\n  afiliado   Afiliado       @relation(fields: [afiliadoId], references: [id])\n  empresaId  String\n  empresa    Empresa        @relation(fields: [empresaId], references: [id])\n  pagoId     String         @unique\n  pago       Pago           @relation(fields: [pagoId], references: [id])\n  montoBase  Float // monto del pago sobre el que se calculó\n  porcentaje Float // % congelado al momento de causarla\n  monto      Float // comisión = montoBase * porcentaje / 100\n  estado     EstadoComision @default(CAUSADA)\n  creadoEn   DateTime       @default(now())\n\n  @@map(\"comisiones\")\n}\n\n// Solicitud de retiro (egreso externo). El admin la aprueba, paga por fuera y\n// adjunta el comprobante; el afiliado lo ve en su billetera.\nmodel SolicitudRetiro {\n  id                String       @id @default(cuid())\n  afiliadoId        String\n  afiliado          Afiliado     @relation(fields: [afiliadoId], references: [id])\n  monto             Float\n  estado            EstadoRetiro @default(SOLICITADO)\n  comprobanteBase64 String?      @db.LongText // soporte del pago (data URL)\n  nota              String? // observación del admin (o motivo de rechazo)\n  solicitadoEn      DateTime     @default(now())\n  procesadoEn       DateTime?\n  procesadoPor      String? // email del super admin que la procesó\n\n  @@map(\"solicitudes_retiro\")\n}\n\n// ============ Enums ============\n\nenum EstadoSuscripcion {\n  PRUEBA\n  ACTIVA\n  EN_MORA\n  SUSPENDIDA\n  CANCELADA\n}\n\nenum MetodoPago {\n  TARJETA_RECURRENTE\n  LINK_WOMPI\n  MANUAL\n}\n\nenum EstadoPago {\n  PENDIENTE\n  APROBADO\n  RECHAZADO\n}\n\nenum TipoRegistro {\n  NORMAL\n  PERMISO\n  FESTIVO\n}\n\nenum TipoPermiso {\n  VACACIONES\n  INCAPACIDAD_EPS\n  INCAPACIDAD_ARL\n  LICENCIA_MATERNIDAD\n  LICENCIA_PATERNIDAD\n  LICENCIA_LUTO\n  CALAMIDAD\n  MEDICO\n  PERSONAL\n  NO_REMUNERADO\n  OTRO\n}\n\nenum Rol {\n  SUPER_ADMIN\n  ADMIN\n  SUPERVISOR\n  AFILIADO\n}\n\nenum MetodoPagoAfiliado {\n  NEQUI\n  BANCOLOMBIA\n  DAVIPLATA\n  OTRO\n}\n\nenum TipoCuentaBancaria {\n  AHORROS\n  CORRIENTE\n}\n\nenum EstadoComision {\n  CAUSADA\n  ANULADA\n}\n\nenum EstadoRetiro {\n  SOLICITADO\n  APROBADO\n  PAGADO\n  RECHAZADO\n}\n",
  "inlineSchemaHash": "ff354bdd3e74713dcc85497e00913020fc4de667615851c5209fb986e6d3c40b",
  "copyEngine": true
}
config.dirname = '/'

config.runtimeDataModel = JSON.parse("{\"models\":{\"Empresa\":{\"dbName\":\"empresas\",\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":true,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"String\",\"default\":{\"name\":\"cuid\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"nombre\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"nit\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":true,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"email\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"telefono\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"marcadorToken\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":true,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"String\",\"default\":{\"name\":\"cuid\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"exentaPago\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"Boolean\",\"default\":false,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"activa\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"Boolean\",\"default\":true,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"creadoEn\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"DateTime\",\"default\":{\"name\":\"now\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"actualizadoEn\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"DateTime\",\"isGenerated\":false,\"isUpdatedAt\":true},{\"name\":\"usuarios\",\"kind\":\"object\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Usuario\",\"relationName\":\"EmpresaToUsuario\",\"relationFromFields\":[],\"relationToFields\":[],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"colaboradores\",\"kind\":\"object\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Colaborador\",\"relationName\":\"ColaboradorToEmpresa\",\"relationFromFields\":[],\"relationToFields\":[],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"festivos\",\"kind\":\"object\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"DiaFestivo\",\"relationName\":\"DiaFestivoToEmpresa\",\"relationFromFields\":[],\"relationToFields\":[],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"configuracion\",\"kind\":\"object\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Configuracion\",\"relationName\":\"ConfiguracionToEmpresa\",\"relationFromFields\":[],\"relationToFields\":[],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"suscripcion\",\"kind\":\"object\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Suscripcion\",\"relationName\":\"EmpresaToSuscripcion\",\"relationFromFields\":[],\"relationToFields\":[],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"horarios\",\"kind\":\"object\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Horario\",\"relationName\":\"EmpresaToHorario\",\"relationFromFields\":[],\"relationToFields\":[],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"sedes\",\"kind\":\"object\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Sede\",\"relationName\":\"EmpresaToSede\",\"relationFromFields\":[],\"relationToFields\":[],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"dispositivos\",\"kind\":\"object\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"DispositivoKiosco\",\"relationName\":\"DispositivoKioscoToEmpresa\",\"relationFromFields\":[],\"relationToFields\":[],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"notificaciones\",\"kind\":\"object\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Notificacion\",\"relationName\":\"EmpresaToNotificacion\",\"relationFromFields\":[],\"relationToFields\":[],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"afiliadoId\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":true,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"afiliado\",\"kind\":\"object\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Afiliado\",\"relationName\":\"AfiliadoToEmpresa\",\"relationFromFields\":[\"afiliadoId\"],\"relationToFields\":[\"id\"],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"atribuidoEn\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"DateTime\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"primerPagoComisionEn\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"DateTime\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"comisiones\",\"kind\":\"object\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Comision\",\"relationName\":\"ComisionToEmpresa\",\"relationFromFields\":[],\"relationToFields\":[],\"isGenerated\":false,\"isUpdatedAt\":false}],\"primaryKey\":null,\"uniqueFields\":[],\"uniqueIndexes\":[],\"isGenerated\":false},\"Suscripcion\":{\"dbName\":\"suscripciones\",\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":true,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"String\",\"default\":{\"name\":\"cuid\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"empresaId\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":true,\"isId\":false,\"isReadOnly\":true,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"empresa\",\"kind\":\"object\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Empresa\",\"relationName\":\"EmpresaToSuscripcion\",\"relationFromFields\":[\"empresaId\"],\"relationToFields\":[\"id\"],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"estado\",\"kind\":\"enum\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"EstadoSuscripcion\",\"default\":\"PRUEBA\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"finPrueba\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"DateTime\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"pagadoHasta\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"DateTime\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"suspendidaEn\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"DateTime\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"plan\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"String\",\"default\":\"PROFESIONAL\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"cicloPago\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"String\",\"default\":\"MENSUAL\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"limiteOverride\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Int\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"funcionesOverride\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Json\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"precioModo\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"precioFijo\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Int\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"precioTramo1\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Int\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"limiteTramo1\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Int\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"precioTramo2\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Int\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"wompiFuentePagoId\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"creadoEn\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"DateTime\",\"default\":{\"name\":\"now\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"actualizadoEn\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"DateTime\",\"isGenerated\":false,\"isUpdatedAt\":true},{\"name\":\"pagos\",\"kind\":\"object\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Pago\",\"relationName\":\"PagoToSuscripcion\",\"relationFromFields\":[],\"relationToFields\":[],\"isGenerated\":false,\"isUpdatedAt\":false}],\"primaryKey\":null,\"uniqueFields\":[],\"uniqueIndexes\":[],\"isGenerated\":false},\"Pago\":{\"dbName\":\"pagos\",\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":true,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"String\",\"default\":{\"name\":\"cuid\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"suscripcionId\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":true,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"suscripcion\",\"kind\":\"object\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Suscripcion\",\"relationName\":\"PagoToSuscripcion\",\"relationFromFields\":[\"suscripcionId\"],\"relationToFields\":[\"id\"],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"monto\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Float\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"colaboradoresFacturados\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Int\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"periodoInicio\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"DateTime\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"periodoFin\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"DateTime\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"metodo\",\"kind\":\"enum\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"MetodoPago\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"estado\",\"kind\":\"enum\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"EstadoPago\",\"default\":\"APROBADO\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"wompiTransaccionId\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":true,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"nota\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"comprobanteBase64\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"registradoPor\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"creadoEn\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"DateTime\",\"default\":{\"name\":\"now\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"comision\",\"kind\":\"object\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Comision\",\"relationName\":\"ComisionToPago\",\"relationFromFields\":[],\"relationToFields\":[],\"isGenerated\":false,\"isUpdatedAt\":false}],\"primaryKey\":null,\"uniqueFields\":[],\"uniqueIndexes\":[],\"isGenerated\":false},\"ConfiguracionPlataforma\":{\"dbName\":\"configuracion_plataforma\",\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":true,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"Int\",\"default\":1,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"precioTramo1\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"Float\",\"default\":10000,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"limiteTramo1\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"Int\",\"default\":15,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"precioTramo2\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"Float\",\"default\":2000,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"planes\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Json\",\"isGenerated\":false,\"isUpdatedAt\":false}],\"primaryKey\":null,\"uniqueFields\":[],\"uniqueIndexes\":[],\"isGenerated\":false},\"JornadaVigencia\":{\"dbName\":\"jornadas_vigencia\",\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":true,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"String\",\"default\":{\"name\":\"cuid\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"vigenteDesde\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":true,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"DateTime\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"horasSemanales\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Float\",\"isGenerated\":false,\"isUpdatedAt\":false}],\"primaryKey\":null,\"uniqueFields\":[],\"uniqueIndexes\":[],\"isGenerated\":false},\"TipoHora\":{\"dbName\":\"tipos_hora\",\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":true,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"String\",\"default\":{\"name\":\"cuid\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"nombre\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"codigo\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"horaInicio\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Int\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"horaFin\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Int\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"recargo\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Float\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"aplica\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Json\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"vigenteDesde\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"DateTime\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"vigenteHasta\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"DateTime\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"activo\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"Boolean\",\"default\":true,\"isGenerated\":false,\"isUpdatedAt\":false}],\"primaryKey\":null,\"uniqueFields\":[[\"codigo\",\"vigenteDesde\"]],\"uniqueIndexes\":[{\"name\":null,\"fields\":[\"codigo\",\"vigenteDesde\"]}],\"isGenerated\":false},\"Horario\":{\"dbName\":\"horarios\",\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":true,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"String\",\"default\":{\"name\":\"cuid\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"empresaId\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":true,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"empresa\",\"kind\":\"object\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Empresa\",\"relationName\":\"EmpresaToHorario\",\"relationFromFields\":[\"empresaId\"],\"relationToFields\":[\"id\"],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"nombre\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"toleranciaMin\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"Int\",\"default\":10,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"almuerzoMin\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"Int\",\"default\":0,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"toleranciaSalidaMin\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"Int\",\"default\":0,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"ajustaEntrada\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"Boolean\",\"default\":false,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"activo\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"Boolean\",\"default\":true,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"creadoEn\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"DateTime\",\"default\":{\"name\":\"now\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"franjas\",\"kind\":\"object\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"FranjaHorario\",\"relationName\":\"FranjaHorarioToHorario\",\"relationFromFields\":[],\"relationToFields\":[],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"colaboradores\",\"kind\":\"object\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Colaborador\",\"relationName\":\"ColaboradorToHorario\",\"relationFromFields\":[],\"relationToFields\":[],\"isGenerated\":false,\"isUpdatedAt\":false}],\"primaryKey\":null,\"uniqueFields\":[],\"uniqueIndexes\":[],\"isGenerated\":false},\"FranjaHorario\":{\"dbName\":\"franjas_horario\",\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":true,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"String\",\"default\":{\"name\":\"cuid\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"horarioId\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":true,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"horario\",\"kind\":\"object\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Horario\",\"relationName\":\"FranjaHorarioToHorario\",\"relationFromFields\":[\"horarioId\"],\"relationToFields\":[\"id\"],\"relationOnDelete\":\"Cascade\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"dias\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Json\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"horaEntrada\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"horaSalida\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"tieneAlmuerzo\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"Boolean\",\"default\":true,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"almuerzoInicio\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"almuerzoFin\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false}],\"primaryKey\":null,\"uniqueFields\":[],\"uniqueIndexes\":[],\"isGenerated\":false},\"DispositivoKiosco\":{\"dbName\":\"dispositivos_kiosco\",\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":true,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"String\",\"default\":{\"name\":\"cuid\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"empresaId\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":true,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"empresa\",\"kind\":\"object\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Empresa\",\"relationName\":\"DispositivoKioscoToEmpresa\",\"relationFromFields\":[\"empresaId\"],\"relationToFields\":[\"id\"],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"nombre\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"token\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":true,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"creadoEn\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"DateTime\",\"default\":{\"name\":\"now\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"ultimoUso\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"DateTime\",\"isGenerated\":false,\"isUpdatedAt\":false}],\"primaryKey\":null,\"uniqueFields\":[],\"uniqueIndexes\":[],\"isGenerated\":false},\"Colaborador\":{\"dbName\":\"colaboradores\",\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":true,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"String\",\"default\":{\"name\":\"cuid\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"empresaId\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":true,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"empresa\",\"kind\":\"object\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Empresa\",\"relationName\":\"ColaboradorToEmpresa\",\"relationFromFields\":[\"empresaId\"],\"relationToFields\":[\"id\"],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"nombre\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"apellido\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"cedula\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"cargo\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"email\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"telefono\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"fechaNacimiento\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"DateTime\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"salarioMensual\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Float\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"rostroDescriptor\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Json\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"rostroEnroladoEn\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"DateTime\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"horarioId\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":true,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"horario\",\"kind\":\"object\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Horario\",\"relationName\":\"ColaboradorToHorario\",\"relationFromFields\":[\"horarioId\"],\"relationToFields\":[\"id\"],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"activo\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"Boolean\",\"default\":true,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"retiroProgramado\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"DateTime\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"creadoEn\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"DateTime\",\"default\":{\"name\":\"now\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"actualizadoEn\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"DateTime\",\"isGenerated\":false,\"isUpdatedAt\":true},{\"name\":\"registros\",\"kind\":\"object\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Registro\",\"relationName\":\"ColaboradorToRegistro\",\"relationFromFields\":[],\"relationToFields\":[],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"permisos\",\"kind\":\"object\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Permiso\",\"relationName\":\"ColaboradorToPermiso\",\"relationFromFields\":[],\"relationToFields\":[],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"diasEsperados\",\"kind\":\"object\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"DiaEsperado\",\"relationName\":\"ColaboradorToDiaEsperado\",\"relationFromFields\":[],\"relationToFields\":[],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"sedes\",\"kind\":\"object\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"ColaboradorSede\",\"relationName\":\"ColaboradorToColaboradorSede\",\"relationFromFields\":[],\"relationToFields\":[],\"isGenerated\":false,\"isUpdatedAt\":false}],\"primaryKey\":null,\"uniqueFields\":[[\"empresaId\",\"cedula\"]],\"uniqueIndexes\":[{\"name\":null,\"fields\":[\"empresaId\",\"cedula\"]}],\"isGenerated\":false},\"Sede\":{\"dbName\":\"sedes\",\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":true,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"String\",\"default\":{\"name\":\"cuid\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"empresaId\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":true,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"empresa\",\"kind\":\"object\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Empresa\",\"relationName\":\"EmpresaToSede\",\"relationFromFields\":[\"empresaId\"],\"relationToFields\":[\"id\"],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"nombre\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"direccion\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"lat\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Float\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"lng\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Float\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"radio\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"Int\",\"default\":150,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"activa\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"Boolean\",\"default\":true,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"creadoEn\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"DateTime\",\"default\":{\"name\":\"now\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"actualizadoEn\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"DateTime\",\"isGenerated\":false,\"isUpdatedAt\":true},{\"name\":\"colaboradores\",\"kind\":\"object\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"ColaboradorSede\",\"relationName\":\"ColaboradorSedeToSede\",\"relationFromFields\":[],\"relationToFields\":[],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"registros\",\"kind\":\"object\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Registro\",\"relationName\":\"RegistroToSede\",\"relationFromFields\":[],\"relationToFields\":[],\"isGenerated\":false,\"isUpdatedAt\":false}],\"primaryKey\":null,\"uniqueFields\":[],\"uniqueIndexes\":[],\"isGenerated\":false},\"ColaboradorSede\":{\"dbName\":\"colaboradores_sedes\",\"fields\":[{\"name\":\"colaboradorId\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":true,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"sedeId\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":true,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"colaborador\",\"kind\":\"object\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Colaborador\",\"relationName\":\"ColaboradorToColaboradorSede\",\"relationFromFields\":[\"colaboradorId\"],\"relationToFields\":[\"id\"],\"relationOnDelete\":\"Cascade\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"sede\",\"kind\":\"object\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Sede\",\"relationName\":\"ColaboradorSedeToSede\",\"relationFromFields\":[\"sedeId\"],\"relationToFields\":[\"id\"],\"relationOnDelete\":\"Cascade\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"creadoEn\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"DateTime\",\"default\":{\"name\":\"now\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false}],\"primaryKey\":{\"name\":null,\"fields\":[\"colaboradorId\",\"sedeId\"]},\"uniqueFields\":[],\"uniqueIndexes\":[],\"isGenerated\":false},\"DiaEsperado\":{\"dbName\":\"dias_esperados\",\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":true,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"String\",\"default\":{\"name\":\"cuid\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"colaboradorId\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":true,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"colaborador\",\"kind\":\"object\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Colaborador\",\"relationName\":\"ColaboradorToDiaEsperado\",\"relationFromFields\":[\"colaboradorId\"],\"relationToFields\":[\"id\"],\"relationOnDelete\":\"Cascade\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"fecha\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"DateTime\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"programado\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"Boolean\",\"default\":false,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"horaEntrada\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"horaSalida\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"toleranciaMin\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"Int\",\"default\":0,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"almuerzoMin\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"Int\",\"default\":0,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"minutosEsperados\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"Int\",\"default\":0,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"toleranciaSalidaMin\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"Int\",\"default\":0,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"ajustaEntrada\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"Boolean\",\"default\":false,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"almuerzoInicio\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"almuerzoFin\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"horarioId\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"origen\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"String\",\"default\":\"AUTO\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"creadoEn\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"DateTime\",\"default\":{\"name\":\"now\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"actualizadoEn\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"DateTime\",\"isGenerated\":false,\"isUpdatedAt\":true}],\"primaryKey\":null,\"uniqueFields\":[[\"colaboradorId\",\"fecha\"]],\"uniqueIndexes\":[{\"name\":null,\"fields\":[\"colaboradorId\",\"fecha\"]}],\"isGenerated\":false},\"Registro\":{\"dbName\":\"registros\",\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":true,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"String\",\"default\":{\"name\":\"cuid\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"colaboradorId\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":true,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"colaborador\",\"kind\":\"object\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Colaborador\",\"relationName\":\"ColaboradorToRegistro\",\"relationFromFields\":[\"colaboradorId\"],\"relationToFields\":[\"id\"],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"sedeId\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":true,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"sede\",\"kind\":\"object\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Sede\",\"relationName\":\"RegistroToSede\",\"relationFromFields\":[\"sedeId\"],\"relationToFields\":[\"id\"],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"fecha\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"DateTime\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"entrada\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"DateTime\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"salida\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"DateTime\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"tipo\",\"kind\":\"enum\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"TipoRegistro\",\"default\":\"NORMAL\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"observacion\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"salidaEstimada\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"Boolean\",\"default\":false,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"salidaAlmuerzo\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"Boolean\",\"default\":false,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"entradaEstimada\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"Boolean\",\"default\":false,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"fotoEntrada\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"fotoSalida\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"editadoPor\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"editadoEn\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"DateTime\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"creadoEn\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"DateTime\",\"default\":{\"name\":\"now\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"novedades\",\"kind\":\"object\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Permiso\",\"relationName\":\"PermisoToRegistro\",\"relationFromFields\":[],\"relationToFields\":[],\"isGenerated\":false,\"isUpdatedAt\":false}],\"primaryKey\":null,\"uniqueFields\":[],\"uniqueIndexes\":[],\"isGenerated\":false},\"Permiso\":{\"dbName\":\"permisos\",\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":true,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"String\",\"default\":{\"name\":\"cuid\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"colaboradorId\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":true,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"colaborador\",\"kind\":\"object\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Colaborador\",\"relationName\":\"ColaboradorToPermiso\",\"relationFromFields\":[\"colaboradorId\"],\"relationToFields\":[\"id\"],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"registroId\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":true,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"registro\",\"kind\":\"object\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Registro\",\"relationName\":\"PermisoToRegistro\",\"relationFromFields\":[\"registroId\"],\"relationToFields\":[\"id\"],\"relationOnDelete\":\"Cascade\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"fechaInicio\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"DateTime\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"fechaFin\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"DateTime\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"horaInicio\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"horaFin\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"tipo\",\"kind\":\"enum\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"TipoPermiso\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"descripcion\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"aprobado\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"Boolean\",\"default\":false,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"evidencia\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"evidenciaTipo\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"evidenciaNombre\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"creadoEn\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"DateTime\",\"default\":{\"name\":\"now\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false}],\"primaryKey\":null,\"uniqueFields\":[],\"uniqueIndexes\":[],\"isGenerated\":false},\"DiaFestivo\":{\"dbName\":\"dias_festivos\",\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":true,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"String\",\"default\":{\"name\":\"cuid\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"empresaId\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":true,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"empresa\",\"kind\":\"object\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Empresa\",\"relationName\":\"DiaFestivoToEmpresa\",\"relationFromFields\":[\"empresaId\"],\"relationToFields\":[\"id\"],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"fecha\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"DateTime\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"nombre\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"creadoEn\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"DateTime\",\"default\":{\"name\":\"now\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false}],\"primaryKey\":null,\"uniqueFields\":[[\"empresaId\",\"fecha\"]],\"uniqueIndexes\":[{\"name\":null,\"fields\":[\"empresaId\",\"fecha\"]}],\"isGenerated\":false},\"Configuracion\":{\"dbName\":\"configuracion\",\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":true,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"String\",\"default\":{\"name\":\"cuid\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"empresaId\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":true,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"empresa\",\"kind\":\"object\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Empresa\",\"relationName\":\"ConfiguracionToEmpresa\",\"relationFromFields\":[\"empresaId\"],\"relationToFields\":[\"id\"],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"clave\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"valor\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false}],\"primaryKey\":null,\"uniqueFields\":[[\"empresaId\",\"clave\"]],\"uniqueIndexes\":[{\"name\":null,\"fields\":[\"empresaId\",\"clave\"]}],\"isGenerated\":false},\"Notificacion\":{\"dbName\":\"notificaciones\",\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":true,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"String\",\"default\":{\"name\":\"cuid\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"empresaId\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":true,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"empresa\",\"kind\":\"object\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Empresa\",\"relationName\":\"EmpresaToNotificacion\",\"relationFromFields\":[\"empresaId\"],\"relationToFields\":[\"id\"],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"tipo\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"titulo\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"cuerpo\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"entidad\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"entidadId\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"leida\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"Boolean\",\"default\":false,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"leidaEn\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"DateTime\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"creadoEn\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"DateTime\",\"default\":{\"name\":\"now\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false}],\"primaryKey\":null,\"uniqueFields\":[],\"uniqueIndexes\":[],\"isGenerated\":false},\"Usuario\":{\"dbName\":\"usuarios\",\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":true,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"String\",\"default\":{\"name\":\"cuid\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"empresaId\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":true,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"empresa\",\"kind\":\"object\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Empresa\",\"relationName\":\"EmpresaToUsuario\",\"relationFromFields\":[\"empresaId\"],\"relationToFields\":[\"id\"],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"afiliadoId\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":true,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"afiliado\",\"kind\":\"object\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Afiliado\",\"relationName\":\"AfiliadoToUsuario\",\"relationFromFields\":[\"afiliadoId\"],\"relationToFields\":[\"id\"],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"email\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":true,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"password\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"nombre\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"rol\",\"kind\":\"enum\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"Rol\",\"default\":\"ADMIN\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"activo\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"Boolean\",\"default\":true,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"resetToken\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":true,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"resetExpira\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"DateTime\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"emailVerificado\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"Boolean\",\"default\":false,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"verificacionCodigo\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"verificacionExpira\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"DateTime\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"creadoEn\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"DateTime\",\"default\":{\"name\":\"now\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false}],\"primaryKey\":null,\"uniqueFields\":[],\"uniqueIndexes\":[],\"isGenerated\":false},\"Afiliado\":{\"dbName\":\"afiliados\",\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":true,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"String\",\"default\":{\"name\":\"cuid\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"nombre\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"codigo\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":true,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"porcentaje\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"Float\",\"default\":20,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"duracionMeses\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Int\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"activo\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"Boolean\",\"default\":true,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"telefono\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"pagoMetodo\",\"kind\":\"enum\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"MetodoPagoAfiliado\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"pagoBanco\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"pagoTipoCuenta\",\"kind\":\"enum\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"TipoCuentaBancaria\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"pagoNumero\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"pagoTitular\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"pagoDocumento\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"creadoEn\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"DateTime\",\"default\":{\"name\":\"now\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"actualizadoEn\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"DateTime\",\"isGenerated\":false,\"isUpdatedAt\":true},{\"name\":\"usuarios\",\"kind\":\"object\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Usuario\",\"relationName\":\"AfiliadoToUsuario\",\"relationFromFields\":[],\"relationToFields\":[],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"empresas\",\"kind\":\"object\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Empresa\",\"relationName\":\"AfiliadoToEmpresa\",\"relationFromFields\":[],\"relationToFields\":[],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"comisiones\",\"kind\":\"object\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Comision\",\"relationName\":\"AfiliadoToComision\",\"relationFromFields\":[],\"relationToFields\":[],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"retiros\",\"kind\":\"object\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"SolicitudRetiro\",\"relationName\":\"AfiliadoToSolicitudRetiro\",\"relationFromFields\":[],\"relationToFields\":[],\"isGenerated\":false,\"isUpdatedAt\":false}],\"primaryKey\":null,\"uniqueFields\":[],\"uniqueIndexes\":[],\"isGenerated\":false},\"Comision\":{\"dbName\":\"comisiones\",\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":true,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"String\",\"default\":{\"name\":\"cuid\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"afiliadoId\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":true,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"afiliado\",\"kind\":\"object\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Afiliado\",\"relationName\":\"AfiliadoToComision\",\"relationFromFields\":[\"afiliadoId\"],\"relationToFields\":[\"id\"],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"empresaId\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":true,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"empresa\",\"kind\":\"object\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Empresa\",\"relationName\":\"ComisionToEmpresa\",\"relationFromFields\":[\"empresaId\"],\"relationToFields\":[\"id\"],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"pagoId\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":true,\"isId\":false,\"isReadOnly\":true,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"pago\",\"kind\":\"object\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Pago\",\"relationName\":\"ComisionToPago\",\"relationFromFields\":[\"pagoId\"],\"relationToFields\":[\"id\"],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"montoBase\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Float\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"porcentaje\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Float\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"monto\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Float\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"estado\",\"kind\":\"enum\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"EstadoComision\",\"default\":\"CAUSADA\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"creadoEn\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"DateTime\",\"default\":{\"name\":\"now\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false}],\"primaryKey\":null,\"uniqueFields\":[],\"uniqueIndexes\":[],\"isGenerated\":false},\"SolicitudRetiro\":{\"dbName\":\"solicitudes_retiro\",\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":true,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"String\",\"default\":{\"name\":\"cuid\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"afiliadoId\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":true,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"afiliado\",\"kind\":\"object\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Afiliado\",\"relationName\":\"AfiliadoToSolicitudRetiro\",\"relationFromFields\":[\"afiliadoId\"],\"relationToFields\":[\"id\"],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"monto\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Float\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"estado\",\"kind\":\"enum\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"EstadoRetiro\",\"default\":\"SOLICITADO\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"comprobanteBase64\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"nota\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"solicitadoEn\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"DateTime\",\"default\":{\"name\":\"now\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"procesadoEn\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"DateTime\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"procesadoPor\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false}],\"primaryKey\":null,\"uniqueFields\":[],\"uniqueIndexes\":[],\"isGenerated\":false}},\"enums\":{\"EstadoSuscripcion\":{\"values\":[{\"name\":\"PRUEBA\",\"dbName\":null},{\"name\":\"ACTIVA\",\"dbName\":null},{\"name\":\"EN_MORA\",\"dbName\":null},{\"name\":\"SUSPENDIDA\",\"dbName\":null},{\"name\":\"CANCELADA\",\"dbName\":null}],\"dbName\":null},\"MetodoPago\":{\"values\":[{\"name\":\"TARJETA_RECURRENTE\",\"dbName\":null},{\"name\":\"LINK_WOMPI\",\"dbName\":null},{\"name\":\"MANUAL\",\"dbName\":null}],\"dbName\":null},\"EstadoPago\":{\"values\":[{\"name\":\"PENDIENTE\",\"dbName\":null},{\"name\":\"APROBADO\",\"dbName\":null},{\"name\":\"RECHAZADO\",\"dbName\":null}],\"dbName\":null},\"TipoRegistro\":{\"values\":[{\"name\":\"NORMAL\",\"dbName\":null},{\"name\":\"PERMISO\",\"dbName\":null},{\"name\":\"FESTIVO\",\"dbName\":null}],\"dbName\":null},\"TipoPermiso\":{\"values\":[{\"name\":\"VACACIONES\",\"dbName\":null},{\"name\":\"INCAPACIDAD_EPS\",\"dbName\":null},{\"name\":\"INCAPACIDAD_ARL\",\"dbName\":null},{\"name\":\"LICENCIA_MATERNIDAD\",\"dbName\":null},{\"name\":\"LICENCIA_PATERNIDAD\",\"dbName\":null},{\"name\":\"LICENCIA_LUTO\",\"dbName\":null},{\"name\":\"CALAMIDAD\",\"dbName\":null},{\"name\":\"MEDICO\",\"dbName\":null},{\"name\":\"PERSONAL\",\"dbName\":null},{\"name\":\"NO_REMUNERADO\",\"dbName\":null},{\"name\":\"OTRO\",\"dbName\":null}],\"dbName\":null},\"Rol\":{\"values\":[{\"name\":\"SUPER_ADMIN\",\"dbName\":null},{\"name\":\"ADMIN\",\"dbName\":null},{\"name\":\"SUPERVISOR\",\"dbName\":null},{\"name\":\"AFILIADO\",\"dbName\":null}],\"dbName\":null},\"MetodoPagoAfiliado\":{\"values\":[{\"name\":\"NEQUI\",\"dbName\":null},{\"name\":\"BANCOLOMBIA\",\"dbName\":null},{\"name\":\"DAVIPLATA\",\"dbName\":null},{\"name\":\"OTRO\",\"dbName\":null}],\"dbName\":null},\"TipoCuentaBancaria\":{\"values\":[{\"name\":\"AHORROS\",\"dbName\":null},{\"name\":\"CORRIENTE\",\"dbName\":null}],\"dbName\":null},\"EstadoComision\":{\"values\":[{\"name\":\"CAUSADA\",\"dbName\":null},{\"name\":\"ANULADA\",\"dbName\":null}],\"dbName\":null},\"EstadoRetiro\":{\"values\":[{\"name\":\"SOLICITADO\",\"dbName\":null},{\"name\":\"APROBADO\",\"dbName\":null},{\"name\":\"PAGADO\",\"dbName\":null},{\"name\":\"RECHAZADO\",\"dbName\":null}],\"dbName\":null}},\"types\":{}}")
defineDmmfProperty(exports.Prisma, config.runtimeDataModel)
config.engineWasm = undefined

config.injectableEdgeEnv = () => ({
  parsed: {
    DATABASE_URL: typeof globalThis !== 'undefined' && globalThis['DATABASE_URL'] || typeof process !== 'undefined' && process.env && process.env.DATABASE_URL || undefined
  }
})

if (typeof globalThis !== 'undefined' && globalThis['DEBUG'] || typeof process !== 'undefined' && process.env && process.env.DEBUG || undefined) {
  Debug.enable(typeof globalThis !== 'undefined' && globalThis['DEBUG'] || typeof process !== 'undefined' && process.env && process.env.DEBUG || undefined)
}

const PrismaClient = getPrismaClient(config)
exports.PrismaClient = PrismaClient
Object.assign(exports, Prisma)

