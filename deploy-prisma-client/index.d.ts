
/**
 * Client
**/

import * as runtime from '@prisma/client/runtime/library.js';
import $Types = runtime.Types // general types
import $Public = runtime.Types.Public
import $Utils = runtime.Types.Utils
import $Extensions = runtime.Types.Extensions
import $Result = runtime.Types.Result

export type PrismaPromise<T> = $Public.PrismaPromise<T>


/**
 * Model Empresa
 * 
 */
export type Empresa = $Result.DefaultSelection<Prisma.$EmpresaPayload>
/**
 * Model Suscripcion
 * 
 */
export type Suscripcion = $Result.DefaultSelection<Prisma.$SuscripcionPayload>
/**
 * Model Pago
 * 
 */
export type Pago = $Result.DefaultSelection<Prisma.$PagoPayload>
/**
 * Model ConfiguracionPlataforma
 * 
 */
export type ConfiguracionPlataforma = $Result.DefaultSelection<Prisma.$ConfiguracionPlataformaPayload>
/**
 * Model JornadaVigencia
 * 
 */
export type JornadaVigencia = $Result.DefaultSelection<Prisma.$JornadaVigenciaPayload>
/**
 * Model TipoHora
 * 
 */
export type TipoHora = $Result.DefaultSelection<Prisma.$TipoHoraPayload>
/**
 * Model Horario
 * 
 */
export type Horario = $Result.DefaultSelection<Prisma.$HorarioPayload>
/**
 * Model FranjaHorario
 * 
 */
export type FranjaHorario = $Result.DefaultSelection<Prisma.$FranjaHorarioPayload>
/**
 * Model DispositivoKiosco
 * 
 */
export type DispositivoKiosco = $Result.DefaultSelection<Prisma.$DispositivoKioscoPayload>
/**
 * Model Colaborador
 * 
 */
export type Colaborador = $Result.DefaultSelection<Prisma.$ColaboradorPayload>
/**
 * Model Registro
 * 
 */
export type Registro = $Result.DefaultSelection<Prisma.$RegistroPayload>
/**
 * Model Permiso
 * 
 */
export type Permiso = $Result.DefaultSelection<Prisma.$PermisoPayload>
/**
 * Model DiaFestivo
 * 
 */
export type DiaFestivo = $Result.DefaultSelection<Prisma.$DiaFestivoPayload>
/**
 * Model Configuracion
 * 
 */
export type Configuracion = $Result.DefaultSelection<Prisma.$ConfiguracionPayload>
/**
 * Model Usuario
 * 
 */
export type Usuario = $Result.DefaultSelection<Prisma.$UsuarioPayload>

/**
 * Enums
 */
export namespace $Enums {
  export const EstadoSuscripcion: {
  PRUEBA: 'PRUEBA',
  ACTIVA: 'ACTIVA',
  EN_MORA: 'EN_MORA',
  SUSPENDIDA: 'SUSPENDIDA',
  CANCELADA: 'CANCELADA'
};

export type EstadoSuscripcion = (typeof EstadoSuscripcion)[keyof typeof EstadoSuscripcion]


export const MetodoPago: {
  TARJETA_RECURRENTE: 'TARJETA_RECURRENTE',
  LINK_WOMPI: 'LINK_WOMPI',
  MANUAL: 'MANUAL'
};

export type MetodoPago = (typeof MetodoPago)[keyof typeof MetodoPago]


export const EstadoPago: {
  PENDIENTE: 'PENDIENTE',
  APROBADO: 'APROBADO',
  RECHAZADO: 'RECHAZADO'
};

export type EstadoPago = (typeof EstadoPago)[keyof typeof EstadoPago]


export const TipoRegistro: {
  NORMAL: 'NORMAL',
  PERMISO: 'PERMISO',
  FESTIVO: 'FESTIVO'
};

export type TipoRegistro = (typeof TipoRegistro)[keyof typeof TipoRegistro]


export const TipoPermiso: {
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

export type TipoPermiso = (typeof TipoPermiso)[keyof typeof TipoPermiso]


export const Rol: {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
  SUPERVISOR: 'SUPERVISOR'
};

export type Rol = (typeof Rol)[keyof typeof Rol]

}

export type EstadoSuscripcion = $Enums.EstadoSuscripcion

export const EstadoSuscripcion: typeof $Enums.EstadoSuscripcion

export type MetodoPago = $Enums.MetodoPago

export const MetodoPago: typeof $Enums.MetodoPago

export type EstadoPago = $Enums.EstadoPago

export const EstadoPago: typeof $Enums.EstadoPago

export type TipoRegistro = $Enums.TipoRegistro

export const TipoRegistro: typeof $Enums.TipoRegistro

export type TipoPermiso = $Enums.TipoPermiso

export const TipoPermiso: typeof $Enums.TipoPermiso

export type Rol = $Enums.Rol

export const Rol: typeof $Enums.Rol

/**
 * ##  Prisma Client ʲˢ
 * 
 * Type-safe database client for TypeScript & Node.js
 * @example
 * ```
 * const prisma = new PrismaClient()
 * // Fetch zero or more Empresas
 * const empresas = await prisma.empresa.findMany()
 * ```
 *
 * 
 * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client).
 */
export class PrismaClient<
  ClientOptions extends Prisma.PrismaClientOptions = Prisma.PrismaClientOptions,
  U = 'log' extends keyof ClientOptions ? ClientOptions['log'] extends Array<Prisma.LogLevel | Prisma.LogDefinition> ? Prisma.GetEvents<ClientOptions['log']> : never : never,
  ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs
> {
  [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['other'] }

    /**
   * ##  Prisma Client ʲˢ
   * 
   * Type-safe database client for TypeScript & Node.js
   * @example
   * ```
   * const prisma = new PrismaClient()
   * // Fetch zero or more Empresas
   * const empresas = await prisma.empresa.findMany()
   * ```
   *
   * 
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client).
   */

  constructor(optionsArg ?: Prisma.Subset<ClientOptions, Prisma.PrismaClientOptions>);
  $on<V extends U>(eventType: V, callback: (event: V extends 'query' ? Prisma.QueryEvent : Prisma.LogEvent) => void): void;

  /**
   * Connect with the database
   */
  $connect(): $Utils.JsPromise<void>;

  /**
   * Disconnect from the database
   */
  $disconnect(): $Utils.JsPromise<void>;

  /**
   * Add a middleware
   * @deprecated since 4.16.0. For new code, prefer client extensions instead.
   * @see https://pris.ly/d/extensions
   */
  $use(cb: Prisma.Middleware): void

/**
   * Executes a prepared raw query and returns the number of affected rows.
   * @example
   * ```
   * const result = await prisma.$executeRaw`UPDATE User SET cool = ${true} WHERE email = ${'user@email.com'};`
   * ```
   * 
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $executeRaw<T = unknown>(query: TemplateStringsArray | Prisma.Sql, ...values: any[]): Prisma.PrismaPromise<number>;

  /**
   * Executes a raw query and returns the number of affected rows.
   * Susceptible to SQL injections, see documentation.
   * @example
   * ```
   * const result = await prisma.$executeRawUnsafe('UPDATE User SET cool = $1 WHERE email = $2 ;', true, 'user@email.com')
   * ```
   * 
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $executeRawUnsafe<T = unknown>(query: string, ...values: any[]): Prisma.PrismaPromise<number>;

  /**
   * Performs a prepared raw query and returns the `SELECT` data.
   * @example
   * ```
   * const result = await prisma.$queryRaw`SELECT * FROM User WHERE id = ${1} OR email = ${'user@email.com'};`
   * ```
   * 
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $queryRaw<T = unknown>(query: TemplateStringsArray | Prisma.Sql, ...values: any[]): Prisma.PrismaPromise<T>;

  /**
   * Performs a raw query and returns the `SELECT` data.
   * Susceptible to SQL injections, see documentation.
   * @example
   * ```
   * const result = await prisma.$queryRawUnsafe('SELECT * FROM User WHERE id = $1 OR email = $2;', 1, 'user@email.com')
   * ```
   * 
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $queryRawUnsafe<T = unknown>(query: string, ...values: any[]): Prisma.PrismaPromise<T>;


  /**
   * Allows the running of a sequence of read/write operations that are guaranteed to either succeed or fail as a whole.
   * @example
   * ```
   * const [george, bob, alice] = await prisma.$transaction([
   *   prisma.user.create({ data: { name: 'George' } }),
   *   prisma.user.create({ data: { name: 'Bob' } }),
   *   prisma.user.create({ data: { name: 'Alice' } }),
   * ])
   * ```
   * 
   * Read more in our [docs](https://www.prisma.io/docs/concepts/components/prisma-client/transactions).
   */
  $transaction<P extends Prisma.PrismaPromise<any>[]>(arg: [...P], options?: { isolationLevel?: Prisma.TransactionIsolationLevel }): $Utils.JsPromise<runtime.Types.Utils.UnwrapTuple<P>>

  $transaction<R>(fn: (prisma: Omit<PrismaClient, runtime.ITXClientDenyList>) => $Utils.JsPromise<R>, options?: { maxWait?: number, timeout?: number, isolationLevel?: Prisma.TransactionIsolationLevel }): $Utils.JsPromise<R>


  $extends: $Extensions.ExtendsHook<"extends", Prisma.TypeMapCb, ExtArgs>

      /**
   * `prisma.empresa`: Exposes CRUD operations for the **Empresa** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Empresas
    * const empresas = await prisma.empresa.findMany()
    * ```
    */
  get empresa(): Prisma.EmpresaDelegate<ExtArgs>;

  /**
   * `prisma.suscripcion`: Exposes CRUD operations for the **Suscripcion** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Suscripcions
    * const suscripcions = await prisma.suscripcion.findMany()
    * ```
    */
  get suscripcion(): Prisma.SuscripcionDelegate<ExtArgs>;

  /**
   * `prisma.pago`: Exposes CRUD operations for the **Pago** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Pagos
    * const pagos = await prisma.pago.findMany()
    * ```
    */
  get pago(): Prisma.PagoDelegate<ExtArgs>;

  /**
   * `prisma.configuracionPlataforma`: Exposes CRUD operations for the **ConfiguracionPlataforma** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more ConfiguracionPlataformas
    * const configuracionPlataformas = await prisma.configuracionPlataforma.findMany()
    * ```
    */
  get configuracionPlataforma(): Prisma.ConfiguracionPlataformaDelegate<ExtArgs>;

  /**
   * `prisma.jornadaVigencia`: Exposes CRUD operations for the **JornadaVigencia** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more JornadaVigencias
    * const jornadaVigencias = await prisma.jornadaVigencia.findMany()
    * ```
    */
  get jornadaVigencia(): Prisma.JornadaVigenciaDelegate<ExtArgs>;

  /**
   * `prisma.tipoHora`: Exposes CRUD operations for the **TipoHora** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more TipoHoras
    * const tipoHoras = await prisma.tipoHora.findMany()
    * ```
    */
  get tipoHora(): Prisma.TipoHoraDelegate<ExtArgs>;

  /**
   * `prisma.horario`: Exposes CRUD operations for the **Horario** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Horarios
    * const horarios = await prisma.horario.findMany()
    * ```
    */
  get horario(): Prisma.HorarioDelegate<ExtArgs>;

  /**
   * `prisma.franjaHorario`: Exposes CRUD operations for the **FranjaHorario** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more FranjaHorarios
    * const franjaHorarios = await prisma.franjaHorario.findMany()
    * ```
    */
  get franjaHorario(): Prisma.FranjaHorarioDelegate<ExtArgs>;

  /**
   * `prisma.dispositivoKiosco`: Exposes CRUD operations for the **DispositivoKiosco** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more DispositivoKioscos
    * const dispositivoKioscos = await prisma.dispositivoKiosco.findMany()
    * ```
    */
  get dispositivoKiosco(): Prisma.DispositivoKioscoDelegate<ExtArgs>;

  /**
   * `prisma.colaborador`: Exposes CRUD operations for the **Colaborador** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Colaboradors
    * const colaboradors = await prisma.colaborador.findMany()
    * ```
    */
  get colaborador(): Prisma.ColaboradorDelegate<ExtArgs>;

  /**
   * `prisma.registro`: Exposes CRUD operations for the **Registro** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Registros
    * const registros = await prisma.registro.findMany()
    * ```
    */
  get registro(): Prisma.RegistroDelegate<ExtArgs>;

  /**
   * `prisma.permiso`: Exposes CRUD operations for the **Permiso** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Permisos
    * const permisos = await prisma.permiso.findMany()
    * ```
    */
  get permiso(): Prisma.PermisoDelegate<ExtArgs>;

  /**
   * `prisma.diaFestivo`: Exposes CRUD operations for the **DiaFestivo** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more DiaFestivos
    * const diaFestivos = await prisma.diaFestivo.findMany()
    * ```
    */
  get diaFestivo(): Prisma.DiaFestivoDelegate<ExtArgs>;

  /**
   * `prisma.configuracion`: Exposes CRUD operations for the **Configuracion** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Configuracions
    * const configuracions = await prisma.configuracion.findMany()
    * ```
    */
  get configuracion(): Prisma.ConfiguracionDelegate<ExtArgs>;

  /**
   * `prisma.usuario`: Exposes CRUD operations for the **Usuario** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Usuarios
    * const usuarios = await prisma.usuario.findMany()
    * ```
    */
  get usuario(): Prisma.UsuarioDelegate<ExtArgs>;
}

export namespace Prisma {
  export import DMMF = runtime.DMMF

  export type PrismaPromise<T> = $Public.PrismaPromise<T>

  /**
   * Validator
   */
  export import validator = runtime.Public.validator

  /**
   * Prisma Errors
   */
  export import PrismaClientKnownRequestError = runtime.PrismaClientKnownRequestError
  export import PrismaClientUnknownRequestError = runtime.PrismaClientUnknownRequestError
  export import PrismaClientRustPanicError = runtime.PrismaClientRustPanicError
  export import PrismaClientInitializationError = runtime.PrismaClientInitializationError
  export import PrismaClientValidationError = runtime.PrismaClientValidationError
  export import NotFoundError = runtime.NotFoundError

  /**
   * Re-export of sql-template-tag
   */
  export import sql = runtime.sqltag
  export import empty = runtime.empty
  export import join = runtime.join
  export import raw = runtime.raw
  export import Sql = runtime.Sql



  /**
   * Decimal.js
   */
  export import Decimal = runtime.Decimal

  export type DecimalJsLike = runtime.DecimalJsLike

  /**
   * Metrics 
   */
  export type Metrics = runtime.Metrics
  export type Metric<T> = runtime.Metric<T>
  export type MetricHistogram = runtime.MetricHistogram
  export type MetricHistogramBucket = runtime.MetricHistogramBucket

  /**
  * Extensions
  */
  export import Extension = $Extensions.UserArgs
  export import getExtensionContext = runtime.Extensions.getExtensionContext
  export import Args = $Public.Args
  export import Payload = $Public.Payload
  export import Result = $Public.Result
  export import Exact = $Public.Exact

  /**
   * Prisma Client JS version: 5.22.0
   * Query Engine version: 605197351a3c8bdd595af2d2a9bc3025bca48ea2
   */
  export type PrismaVersion = {
    client: string
  }

  export const prismaVersion: PrismaVersion 

  /**
   * Utility Types
   */


  export import JsonObject = runtime.JsonObject
  export import JsonArray = runtime.JsonArray
  export import JsonValue = runtime.JsonValue
  export import InputJsonObject = runtime.InputJsonObject
  export import InputJsonArray = runtime.InputJsonArray
  export import InputJsonValue = runtime.InputJsonValue

  /**
   * Types of the values used to represent different kinds of `null` values when working with JSON fields.
   * 
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  namespace NullTypes {
    /**
    * Type of `Prisma.DbNull`.
    * 
    * You cannot use other instances of this class. Please use the `Prisma.DbNull` value.
    * 
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class DbNull {
      private DbNull: never
      private constructor()
    }

    /**
    * Type of `Prisma.JsonNull`.
    * 
    * You cannot use other instances of this class. Please use the `Prisma.JsonNull` value.
    * 
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class JsonNull {
      private JsonNull: never
      private constructor()
    }

    /**
    * Type of `Prisma.AnyNull`.
    * 
    * You cannot use other instances of this class. Please use the `Prisma.AnyNull` value.
    * 
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class AnyNull {
      private AnyNull: never
      private constructor()
    }
  }

  /**
   * Helper for filtering JSON entries that have `null` on the database (empty on the db)
   * 
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const DbNull: NullTypes.DbNull

  /**
   * Helper for filtering JSON entries that have JSON `null` values (not empty on the db)
   * 
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const JsonNull: NullTypes.JsonNull

  /**
   * Helper for filtering JSON entries that are `Prisma.DbNull` or `Prisma.JsonNull`
   * 
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const AnyNull: NullTypes.AnyNull

  type SelectAndInclude = {
    select: any
    include: any
  }

  type SelectAndOmit = {
    select: any
    omit: any
  }

  /**
   * Get the type of the value, that the Promise holds.
   */
  export type PromiseType<T extends PromiseLike<any>> = T extends PromiseLike<infer U> ? U : T;

  /**
   * Get the return type of a function which returns a Promise.
   */
  export type PromiseReturnType<T extends (...args: any) => $Utils.JsPromise<any>> = PromiseType<ReturnType<T>>

  /**
   * From T, pick a set of properties whose keys are in the union K
   */
  type Prisma__Pick<T, K extends keyof T> = {
      [P in K]: T[P];
  };


  export type Enumerable<T> = T | Array<T>;

  export type RequiredKeys<T> = {
    [K in keyof T]-?: {} extends Prisma__Pick<T, K> ? never : K
  }[keyof T]

  export type TruthyKeys<T> = keyof {
    [K in keyof T as T[K] extends false | undefined | null ? never : K]: K
  }

  export type TrueKeys<T> = TruthyKeys<Prisma__Pick<T, RequiredKeys<T>>>

  /**
   * Subset
   * @desc From `T` pick properties that exist in `U`. Simple version of Intersection
   */
  export type Subset<T, U> = {
    [key in keyof T]: key extends keyof U ? T[key] : never;
  };

  /**
   * SelectSubset
   * @desc From `T` pick properties that exist in `U`. Simple version of Intersection.
   * Additionally, it validates, if both select and include are present. If the case, it errors.
   */
  export type SelectSubset<T, U> = {
    [key in keyof T]: key extends keyof U ? T[key] : never
  } &
    (T extends SelectAndInclude
      ? 'Please either choose `select` or `include`.'
      : T extends SelectAndOmit
        ? 'Please either choose `select` or `omit`.'
        : {})

  /**
   * Subset + Intersection
   * @desc From `T` pick properties that exist in `U` and intersect `K`
   */
  export type SubsetIntersection<T, U, K> = {
    [key in keyof T]: key extends keyof U ? T[key] : never
  } &
    K

  type Without<T, U> = { [P in Exclude<keyof T, keyof U>]?: never };

  /**
   * XOR is needed to have a real mutually exclusive union type
   * https://stackoverflow.com/questions/42123407/does-typescript-support-mutually-exclusive-types
   */
  type XOR<T, U> =
    T extends object ?
    U extends object ?
      (Without<T, U> & U) | (Without<U, T> & T)
    : U : T


  /**
   * Is T a Record?
   */
  type IsObject<T extends any> = T extends Array<any>
  ? False
  : T extends Date
  ? False
  : T extends Uint8Array
  ? False
  : T extends BigInt
  ? False
  : T extends object
  ? True
  : False


  /**
   * If it's T[], return T
   */
  export type UnEnumerate<T extends unknown> = T extends Array<infer U> ? U : T

  /**
   * From ts-toolbelt
   */

  type __Either<O extends object, K extends Key> = Omit<O, K> &
    {
      // Merge all but K
      [P in K]: Prisma__Pick<O, P & keyof O> // With K possibilities
    }[K]

  type EitherStrict<O extends object, K extends Key> = Strict<__Either<O, K>>

  type EitherLoose<O extends object, K extends Key> = ComputeRaw<__Either<O, K>>

  type _Either<
    O extends object,
    K extends Key,
    strict extends Boolean
  > = {
    1: EitherStrict<O, K>
    0: EitherLoose<O, K>
  }[strict]

  type Either<
    O extends object,
    K extends Key,
    strict extends Boolean = 1
  > = O extends unknown ? _Either<O, K, strict> : never

  export type Union = any

  type PatchUndefined<O extends object, O1 extends object> = {
    [K in keyof O]: O[K] extends undefined ? At<O1, K> : O[K]
  } & {}

  /** Helper Types for "Merge" **/
  export type IntersectOf<U extends Union> = (
    U extends unknown ? (k: U) => void : never
  ) extends (k: infer I) => void
    ? I
    : never

  export type Overwrite<O extends object, O1 extends object> = {
      [K in keyof O]: K extends keyof O1 ? O1[K] : O[K];
  } & {};

  type _Merge<U extends object> = IntersectOf<Overwrite<U, {
      [K in keyof U]-?: At<U, K>;
  }>>;

  type Key = string | number | symbol;
  type AtBasic<O extends object, K extends Key> = K extends keyof O ? O[K] : never;
  type AtStrict<O extends object, K extends Key> = O[K & keyof O];
  type AtLoose<O extends object, K extends Key> = O extends unknown ? AtStrict<O, K> : never;
  export type At<O extends object, K extends Key, strict extends Boolean = 1> = {
      1: AtStrict<O, K>;
      0: AtLoose<O, K>;
  }[strict];

  export type ComputeRaw<A extends any> = A extends Function ? A : {
    [K in keyof A]: A[K];
  } & {};

  export type OptionalFlat<O> = {
    [K in keyof O]?: O[K];
  } & {};

  type _Record<K extends keyof any, T> = {
    [P in K]: T;
  };

  // cause typescript not to expand types and preserve names
  type NoExpand<T> = T extends unknown ? T : never;

  // this type assumes the passed object is entirely optional
  type AtLeast<O extends object, K extends string> = NoExpand<
    O extends unknown
    ? | (K extends keyof O ? { [P in K]: O[P] } & O : O)
      | {[P in keyof O as P extends K ? K : never]-?: O[P]} & O
    : never>;

  type _Strict<U, _U = U> = U extends unknown ? U & OptionalFlat<_Record<Exclude<Keys<_U>, keyof U>, never>> : never;

  export type Strict<U extends object> = ComputeRaw<_Strict<U>>;
  /** End Helper Types for "Merge" **/

  export type Merge<U extends object> = ComputeRaw<_Merge<Strict<U>>>;

  /**
  A [[Boolean]]
  */
  export type Boolean = True | False

  // /**
  // 1
  // */
  export type True = 1

  /**
  0
  */
  export type False = 0

  export type Not<B extends Boolean> = {
    0: 1
    1: 0
  }[B]

  export type Extends<A1 extends any, A2 extends any> = [A1] extends [never]
    ? 0 // anything `never` is false
    : A1 extends A2
    ? 1
    : 0

  export type Has<U extends Union, U1 extends Union> = Not<
    Extends<Exclude<U1, U>, U1>
  >

  export type Or<B1 extends Boolean, B2 extends Boolean> = {
    0: {
      0: 0
      1: 1
    }
    1: {
      0: 1
      1: 1
    }
  }[B1][B2]

  export type Keys<U extends Union> = U extends unknown ? keyof U : never

  type Cast<A, B> = A extends B ? A : B;

  export const type: unique symbol;



  /**
   * Used by group by
   */

  export type GetScalarType<T, O> = O extends object ? {
    [P in keyof T]: P extends keyof O
      ? O[P]
      : never
  } : never

  type FieldPaths<
    T,
    U = Omit<T, '_avg' | '_sum' | '_count' | '_min' | '_max'>
  > = IsObject<T> extends True ? U : T

  type GetHavingFields<T> = {
    [K in keyof T]: Or<
      Or<Extends<'OR', K>, Extends<'AND', K>>,
      Extends<'NOT', K>
    > extends True
      ? // infer is only needed to not hit TS limit
        // based on the brilliant idea of Pierre-Antoine Mills
        // https://github.com/microsoft/TypeScript/issues/30188#issuecomment-478938437
        T[K] extends infer TK
        ? GetHavingFields<UnEnumerate<TK> extends object ? Merge<UnEnumerate<TK>> : never>
        : never
      : {} extends FieldPaths<T[K]>
      ? never
      : K
  }[keyof T]

  /**
   * Convert tuple to union
   */
  type _TupleToUnion<T> = T extends (infer E)[] ? E : never
  type TupleToUnion<K extends readonly any[]> = _TupleToUnion<K>
  type MaybeTupleToUnion<T> = T extends any[] ? TupleToUnion<T> : T

  /**
   * Like `Pick`, but additionally can also accept an array of keys
   */
  type PickEnumerable<T, K extends Enumerable<keyof T> | keyof T> = Prisma__Pick<T, MaybeTupleToUnion<K>>

  /**
   * Exclude all keys with underscores
   */
  type ExcludeUnderscoreKeys<T extends string> = T extends `_${string}` ? never : T


  export type FieldRef<Model, FieldType> = runtime.FieldRef<Model, FieldType>

  type FieldRefInputType<Model, FieldType> = Model extends never ? never : FieldRef<Model, FieldType>


  export const ModelName: {
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

  export type ModelName = (typeof ModelName)[keyof typeof ModelName]


  export type Datasources = {
    db?: Datasource
  }

  interface TypeMapCb extends $Utils.Fn<{extArgs: $Extensions.InternalArgs, clientOptions: PrismaClientOptions }, $Utils.Record<string, any>> {
    returns: Prisma.TypeMap<this['params']['extArgs'], this['params']['clientOptions']>
  }

  export type TypeMap<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, ClientOptions = {}> = {
    meta: {
      modelProps: "empresa" | "suscripcion" | "pago" | "configuracionPlataforma" | "jornadaVigencia" | "tipoHora" | "horario" | "franjaHorario" | "dispositivoKiosco" | "colaborador" | "registro" | "permiso" | "diaFestivo" | "configuracion" | "usuario"
      txIsolationLevel: Prisma.TransactionIsolationLevel
    }
    model: {
      Empresa: {
        payload: Prisma.$EmpresaPayload<ExtArgs>
        fields: Prisma.EmpresaFieldRefs
        operations: {
          findUnique: {
            args: Prisma.EmpresaFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$EmpresaPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.EmpresaFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$EmpresaPayload>
          }
          findFirst: {
            args: Prisma.EmpresaFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$EmpresaPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.EmpresaFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$EmpresaPayload>
          }
          findMany: {
            args: Prisma.EmpresaFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$EmpresaPayload>[]
          }
          create: {
            args: Prisma.EmpresaCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$EmpresaPayload>
          }
          createMany: {
            args: Prisma.EmpresaCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          delete: {
            args: Prisma.EmpresaDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$EmpresaPayload>
          }
          update: {
            args: Prisma.EmpresaUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$EmpresaPayload>
          }
          deleteMany: {
            args: Prisma.EmpresaDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.EmpresaUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.EmpresaUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$EmpresaPayload>
          }
          aggregate: {
            args: Prisma.EmpresaAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateEmpresa>
          }
          groupBy: {
            args: Prisma.EmpresaGroupByArgs<ExtArgs>
            result: $Utils.Optional<EmpresaGroupByOutputType>[]
          }
          count: {
            args: Prisma.EmpresaCountArgs<ExtArgs>
            result: $Utils.Optional<EmpresaCountAggregateOutputType> | number
          }
        }
      }
      Suscripcion: {
        payload: Prisma.$SuscripcionPayload<ExtArgs>
        fields: Prisma.SuscripcionFieldRefs
        operations: {
          findUnique: {
            args: Prisma.SuscripcionFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SuscripcionPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.SuscripcionFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SuscripcionPayload>
          }
          findFirst: {
            args: Prisma.SuscripcionFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SuscripcionPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.SuscripcionFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SuscripcionPayload>
          }
          findMany: {
            args: Prisma.SuscripcionFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SuscripcionPayload>[]
          }
          create: {
            args: Prisma.SuscripcionCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SuscripcionPayload>
          }
          createMany: {
            args: Prisma.SuscripcionCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          delete: {
            args: Prisma.SuscripcionDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SuscripcionPayload>
          }
          update: {
            args: Prisma.SuscripcionUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SuscripcionPayload>
          }
          deleteMany: {
            args: Prisma.SuscripcionDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.SuscripcionUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.SuscripcionUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SuscripcionPayload>
          }
          aggregate: {
            args: Prisma.SuscripcionAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateSuscripcion>
          }
          groupBy: {
            args: Prisma.SuscripcionGroupByArgs<ExtArgs>
            result: $Utils.Optional<SuscripcionGroupByOutputType>[]
          }
          count: {
            args: Prisma.SuscripcionCountArgs<ExtArgs>
            result: $Utils.Optional<SuscripcionCountAggregateOutputType> | number
          }
        }
      }
      Pago: {
        payload: Prisma.$PagoPayload<ExtArgs>
        fields: Prisma.PagoFieldRefs
        operations: {
          findUnique: {
            args: Prisma.PagoFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PagoPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.PagoFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PagoPayload>
          }
          findFirst: {
            args: Prisma.PagoFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PagoPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.PagoFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PagoPayload>
          }
          findMany: {
            args: Prisma.PagoFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PagoPayload>[]
          }
          create: {
            args: Prisma.PagoCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PagoPayload>
          }
          createMany: {
            args: Prisma.PagoCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          delete: {
            args: Prisma.PagoDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PagoPayload>
          }
          update: {
            args: Prisma.PagoUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PagoPayload>
          }
          deleteMany: {
            args: Prisma.PagoDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.PagoUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.PagoUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PagoPayload>
          }
          aggregate: {
            args: Prisma.PagoAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregatePago>
          }
          groupBy: {
            args: Prisma.PagoGroupByArgs<ExtArgs>
            result: $Utils.Optional<PagoGroupByOutputType>[]
          }
          count: {
            args: Prisma.PagoCountArgs<ExtArgs>
            result: $Utils.Optional<PagoCountAggregateOutputType> | number
          }
        }
      }
      ConfiguracionPlataforma: {
        payload: Prisma.$ConfiguracionPlataformaPayload<ExtArgs>
        fields: Prisma.ConfiguracionPlataformaFieldRefs
        operations: {
          findUnique: {
            args: Prisma.ConfiguracionPlataformaFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ConfiguracionPlataformaPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.ConfiguracionPlataformaFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ConfiguracionPlataformaPayload>
          }
          findFirst: {
            args: Prisma.ConfiguracionPlataformaFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ConfiguracionPlataformaPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.ConfiguracionPlataformaFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ConfiguracionPlataformaPayload>
          }
          findMany: {
            args: Prisma.ConfiguracionPlataformaFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ConfiguracionPlataformaPayload>[]
          }
          create: {
            args: Prisma.ConfiguracionPlataformaCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ConfiguracionPlataformaPayload>
          }
          createMany: {
            args: Prisma.ConfiguracionPlataformaCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          delete: {
            args: Prisma.ConfiguracionPlataformaDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ConfiguracionPlataformaPayload>
          }
          update: {
            args: Prisma.ConfiguracionPlataformaUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ConfiguracionPlataformaPayload>
          }
          deleteMany: {
            args: Prisma.ConfiguracionPlataformaDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.ConfiguracionPlataformaUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.ConfiguracionPlataformaUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ConfiguracionPlataformaPayload>
          }
          aggregate: {
            args: Prisma.ConfiguracionPlataformaAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateConfiguracionPlataforma>
          }
          groupBy: {
            args: Prisma.ConfiguracionPlataformaGroupByArgs<ExtArgs>
            result: $Utils.Optional<ConfiguracionPlataformaGroupByOutputType>[]
          }
          count: {
            args: Prisma.ConfiguracionPlataformaCountArgs<ExtArgs>
            result: $Utils.Optional<ConfiguracionPlataformaCountAggregateOutputType> | number
          }
        }
      }
      JornadaVigencia: {
        payload: Prisma.$JornadaVigenciaPayload<ExtArgs>
        fields: Prisma.JornadaVigenciaFieldRefs
        operations: {
          findUnique: {
            args: Prisma.JornadaVigenciaFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$JornadaVigenciaPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.JornadaVigenciaFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$JornadaVigenciaPayload>
          }
          findFirst: {
            args: Prisma.JornadaVigenciaFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$JornadaVigenciaPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.JornadaVigenciaFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$JornadaVigenciaPayload>
          }
          findMany: {
            args: Prisma.JornadaVigenciaFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$JornadaVigenciaPayload>[]
          }
          create: {
            args: Prisma.JornadaVigenciaCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$JornadaVigenciaPayload>
          }
          createMany: {
            args: Prisma.JornadaVigenciaCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          delete: {
            args: Prisma.JornadaVigenciaDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$JornadaVigenciaPayload>
          }
          update: {
            args: Prisma.JornadaVigenciaUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$JornadaVigenciaPayload>
          }
          deleteMany: {
            args: Prisma.JornadaVigenciaDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.JornadaVigenciaUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.JornadaVigenciaUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$JornadaVigenciaPayload>
          }
          aggregate: {
            args: Prisma.JornadaVigenciaAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateJornadaVigencia>
          }
          groupBy: {
            args: Prisma.JornadaVigenciaGroupByArgs<ExtArgs>
            result: $Utils.Optional<JornadaVigenciaGroupByOutputType>[]
          }
          count: {
            args: Prisma.JornadaVigenciaCountArgs<ExtArgs>
            result: $Utils.Optional<JornadaVigenciaCountAggregateOutputType> | number
          }
        }
      }
      TipoHora: {
        payload: Prisma.$TipoHoraPayload<ExtArgs>
        fields: Prisma.TipoHoraFieldRefs
        operations: {
          findUnique: {
            args: Prisma.TipoHoraFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TipoHoraPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.TipoHoraFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TipoHoraPayload>
          }
          findFirst: {
            args: Prisma.TipoHoraFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TipoHoraPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.TipoHoraFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TipoHoraPayload>
          }
          findMany: {
            args: Prisma.TipoHoraFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TipoHoraPayload>[]
          }
          create: {
            args: Prisma.TipoHoraCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TipoHoraPayload>
          }
          createMany: {
            args: Prisma.TipoHoraCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          delete: {
            args: Prisma.TipoHoraDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TipoHoraPayload>
          }
          update: {
            args: Prisma.TipoHoraUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TipoHoraPayload>
          }
          deleteMany: {
            args: Prisma.TipoHoraDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.TipoHoraUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.TipoHoraUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TipoHoraPayload>
          }
          aggregate: {
            args: Prisma.TipoHoraAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateTipoHora>
          }
          groupBy: {
            args: Prisma.TipoHoraGroupByArgs<ExtArgs>
            result: $Utils.Optional<TipoHoraGroupByOutputType>[]
          }
          count: {
            args: Prisma.TipoHoraCountArgs<ExtArgs>
            result: $Utils.Optional<TipoHoraCountAggregateOutputType> | number
          }
        }
      }
      Horario: {
        payload: Prisma.$HorarioPayload<ExtArgs>
        fields: Prisma.HorarioFieldRefs
        operations: {
          findUnique: {
            args: Prisma.HorarioFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$HorarioPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.HorarioFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$HorarioPayload>
          }
          findFirst: {
            args: Prisma.HorarioFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$HorarioPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.HorarioFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$HorarioPayload>
          }
          findMany: {
            args: Prisma.HorarioFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$HorarioPayload>[]
          }
          create: {
            args: Prisma.HorarioCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$HorarioPayload>
          }
          createMany: {
            args: Prisma.HorarioCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          delete: {
            args: Prisma.HorarioDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$HorarioPayload>
          }
          update: {
            args: Prisma.HorarioUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$HorarioPayload>
          }
          deleteMany: {
            args: Prisma.HorarioDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.HorarioUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.HorarioUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$HorarioPayload>
          }
          aggregate: {
            args: Prisma.HorarioAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateHorario>
          }
          groupBy: {
            args: Prisma.HorarioGroupByArgs<ExtArgs>
            result: $Utils.Optional<HorarioGroupByOutputType>[]
          }
          count: {
            args: Prisma.HorarioCountArgs<ExtArgs>
            result: $Utils.Optional<HorarioCountAggregateOutputType> | number
          }
        }
      }
      FranjaHorario: {
        payload: Prisma.$FranjaHorarioPayload<ExtArgs>
        fields: Prisma.FranjaHorarioFieldRefs
        operations: {
          findUnique: {
            args: Prisma.FranjaHorarioFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FranjaHorarioPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.FranjaHorarioFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FranjaHorarioPayload>
          }
          findFirst: {
            args: Prisma.FranjaHorarioFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FranjaHorarioPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.FranjaHorarioFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FranjaHorarioPayload>
          }
          findMany: {
            args: Prisma.FranjaHorarioFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FranjaHorarioPayload>[]
          }
          create: {
            args: Prisma.FranjaHorarioCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FranjaHorarioPayload>
          }
          createMany: {
            args: Prisma.FranjaHorarioCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          delete: {
            args: Prisma.FranjaHorarioDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FranjaHorarioPayload>
          }
          update: {
            args: Prisma.FranjaHorarioUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FranjaHorarioPayload>
          }
          deleteMany: {
            args: Prisma.FranjaHorarioDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.FranjaHorarioUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.FranjaHorarioUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FranjaHorarioPayload>
          }
          aggregate: {
            args: Prisma.FranjaHorarioAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateFranjaHorario>
          }
          groupBy: {
            args: Prisma.FranjaHorarioGroupByArgs<ExtArgs>
            result: $Utils.Optional<FranjaHorarioGroupByOutputType>[]
          }
          count: {
            args: Prisma.FranjaHorarioCountArgs<ExtArgs>
            result: $Utils.Optional<FranjaHorarioCountAggregateOutputType> | number
          }
        }
      }
      DispositivoKiosco: {
        payload: Prisma.$DispositivoKioscoPayload<ExtArgs>
        fields: Prisma.DispositivoKioscoFieldRefs
        operations: {
          findUnique: {
            args: Prisma.DispositivoKioscoFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$DispositivoKioscoPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.DispositivoKioscoFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$DispositivoKioscoPayload>
          }
          findFirst: {
            args: Prisma.DispositivoKioscoFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$DispositivoKioscoPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.DispositivoKioscoFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$DispositivoKioscoPayload>
          }
          findMany: {
            args: Prisma.DispositivoKioscoFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$DispositivoKioscoPayload>[]
          }
          create: {
            args: Prisma.DispositivoKioscoCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$DispositivoKioscoPayload>
          }
          createMany: {
            args: Prisma.DispositivoKioscoCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          delete: {
            args: Prisma.DispositivoKioscoDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$DispositivoKioscoPayload>
          }
          update: {
            args: Prisma.DispositivoKioscoUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$DispositivoKioscoPayload>
          }
          deleteMany: {
            args: Prisma.DispositivoKioscoDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.DispositivoKioscoUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.DispositivoKioscoUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$DispositivoKioscoPayload>
          }
          aggregate: {
            args: Prisma.DispositivoKioscoAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateDispositivoKiosco>
          }
          groupBy: {
            args: Prisma.DispositivoKioscoGroupByArgs<ExtArgs>
            result: $Utils.Optional<DispositivoKioscoGroupByOutputType>[]
          }
          count: {
            args: Prisma.DispositivoKioscoCountArgs<ExtArgs>
            result: $Utils.Optional<DispositivoKioscoCountAggregateOutputType> | number
          }
        }
      }
      Colaborador: {
        payload: Prisma.$ColaboradorPayload<ExtArgs>
        fields: Prisma.ColaboradorFieldRefs
        operations: {
          findUnique: {
            args: Prisma.ColaboradorFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ColaboradorPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.ColaboradorFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ColaboradorPayload>
          }
          findFirst: {
            args: Prisma.ColaboradorFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ColaboradorPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.ColaboradorFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ColaboradorPayload>
          }
          findMany: {
            args: Prisma.ColaboradorFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ColaboradorPayload>[]
          }
          create: {
            args: Prisma.ColaboradorCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ColaboradorPayload>
          }
          createMany: {
            args: Prisma.ColaboradorCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          delete: {
            args: Prisma.ColaboradorDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ColaboradorPayload>
          }
          update: {
            args: Prisma.ColaboradorUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ColaboradorPayload>
          }
          deleteMany: {
            args: Prisma.ColaboradorDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.ColaboradorUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.ColaboradorUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ColaboradorPayload>
          }
          aggregate: {
            args: Prisma.ColaboradorAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateColaborador>
          }
          groupBy: {
            args: Prisma.ColaboradorGroupByArgs<ExtArgs>
            result: $Utils.Optional<ColaboradorGroupByOutputType>[]
          }
          count: {
            args: Prisma.ColaboradorCountArgs<ExtArgs>
            result: $Utils.Optional<ColaboradorCountAggregateOutputType> | number
          }
        }
      }
      Registro: {
        payload: Prisma.$RegistroPayload<ExtArgs>
        fields: Prisma.RegistroFieldRefs
        operations: {
          findUnique: {
            args: Prisma.RegistroFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RegistroPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.RegistroFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RegistroPayload>
          }
          findFirst: {
            args: Prisma.RegistroFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RegistroPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.RegistroFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RegistroPayload>
          }
          findMany: {
            args: Prisma.RegistroFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RegistroPayload>[]
          }
          create: {
            args: Prisma.RegistroCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RegistroPayload>
          }
          createMany: {
            args: Prisma.RegistroCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          delete: {
            args: Prisma.RegistroDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RegistroPayload>
          }
          update: {
            args: Prisma.RegistroUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RegistroPayload>
          }
          deleteMany: {
            args: Prisma.RegistroDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.RegistroUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.RegistroUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RegistroPayload>
          }
          aggregate: {
            args: Prisma.RegistroAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateRegistro>
          }
          groupBy: {
            args: Prisma.RegistroGroupByArgs<ExtArgs>
            result: $Utils.Optional<RegistroGroupByOutputType>[]
          }
          count: {
            args: Prisma.RegistroCountArgs<ExtArgs>
            result: $Utils.Optional<RegistroCountAggregateOutputType> | number
          }
        }
      }
      Permiso: {
        payload: Prisma.$PermisoPayload<ExtArgs>
        fields: Prisma.PermisoFieldRefs
        operations: {
          findUnique: {
            args: Prisma.PermisoFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PermisoPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.PermisoFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PermisoPayload>
          }
          findFirst: {
            args: Prisma.PermisoFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PermisoPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.PermisoFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PermisoPayload>
          }
          findMany: {
            args: Prisma.PermisoFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PermisoPayload>[]
          }
          create: {
            args: Prisma.PermisoCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PermisoPayload>
          }
          createMany: {
            args: Prisma.PermisoCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          delete: {
            args: Prisma.PermisoDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PermisoPayload>
          }
          update: {
            args: Prisma.PermisoUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PermisoPayload>
          }
          deleteMany: {
            args: Prisma.PermisoDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.PermisoUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.PermisoUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PermisoPayload>
          }
          aggregate: {
            args: Prisma.PermisoAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregatePermiso>
          }
          groupBy: {
            args: Prisma.PermisoGroupByArgs<ExtArgs>
            result: $Utils.Optional<PermisoGroupByOutputType>[]
          }
          count: {
            args: Prisma.PermisoCountArgs<ExtArgs>
            result: $Utils.Optional<PermisoCountAggregateOutputType> | number
          }
        }
      }
      DiaFestivo: {
        payload: Prisma.$DiaFestivoPayload<ExtArgs>
        fields: Prisma.DiaFestivoFieldRefs
        operations: {
          findUnique: {
            args: Prisma.DiaFestivoFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$DiaFestivoPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.DiaFestivoFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$DiaFestivoPayload>
          }
          findFirst: {
            args: Prisma.DiaFestivoFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$DiaFestivoPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.DiaFestivoFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$DiaFestivoPayload>
          }
          findMany: {
            args: Prisma.DiaFestivoFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$DiaFestivoPayload>[]
          }
          create: {
            args: Prisma.DiaFestivoCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$DiaFestivoPayload>
          }
          createMany: {
            args: Prisma.DiaFestivoCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          delete: {
            args: Prisma.DiaFestivoDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$DiaFestivoPayload>
          }
          update: {
            args: Prisma.DiaFestivoUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$DiaFestivoPayload>
          }
          deleteMany: {
            args: Prisma.DiaFestivoDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.DiaFestivoUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.DiaFestivoUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$DiaFestivoPayload>
          }
          aggregate: {
            args: Prisma.DiaFestivoAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateDiaFestivo>
          }
          groupBy: {
            args: Prisma.DiaFestivoGroupByArgs<ExtArgs>
            result: $Utils.Optional<DiaFestivoGroupByOutputType>[]
          }
          count: {
            args: Prisma.DiaFestivoCountArgs<ExtArgs>
            result: $Utils.Optional<DiaFestivoCountAggregateOutputType> | number
          }
        }
      }
      Configuracion: {
        payload: Prisma.$ConfiguracionPayload<ExtArgs>
        fields: Prisma.ConfiguracionFieldRefs
        operations: {
          findUnique: {
            args: Prisma.ConfiguracionFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ConfiguracionPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.ConfiguracionFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ConfiguracionPayload>
          }
          findFirst: {
            args: Prisma.ConfiguracionFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ConfiguracionPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.ConfiguracionFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ConfiguracionPayload>
          }
          findMany: {
            args: Prisma.ConfiguracionFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ConfiguracionPayload>[]
          }
          create: {
            args: Prisma.ConfiguracionCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ConfiguracionPayload>
          }
          createMany: {
            args: Prisma.ConfiguracionCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          delete: {
            args: Prisma.ConfiguracionDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ConfiguracionPayload>
          }
          update: {
            args: Prisma.ConfiguracionUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ConfiguracionPayload>
          }
          deleteMany: {
            args: Prisma.ConfiguracionDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.ConfiguracionUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.ConfiguracionUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ConfiguracionPayload>
          }
          aggregate: {
            args: Prisma.ConfiguracionAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateConfiguracion>
          }
          groupBy: {
            args: Prisma.ConfiguracionGroupByArgs<ExtArgs>
            result: $Utils.Optional<ConfiguracionGroupByOutputType>[]
          }
          count: {
            args: Prisma.ConfiguracionCountArgs<ExtArgs>
            result: $Utils.Optional<ConfiguracionCountAggregateOutputType> | number
          }
        }
      }
      Usuario: {
        payload: Prisma.$UsuarioPayload<ExtArgs>
        fields: Prisma.UsuarioFieldRefs
        operations: {
          findUnique: {
            args: Prisma.UsuarioFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UsuarioPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.UsuarioFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UsuarioPayload>
          }
          findFirst: {
            args: Prisma.UsuarioFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UsuarioPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.UsuarioFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UsuarioPayload>
          }
          findMany: {
            args: Prisma.UsuarioFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UsuarioPayload>[]
          }
          create: {
            args: Prisma.UsuarioCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UsuarioPayload>
          }
          createMany: {
            args: Prisma.UsuarioCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          delete: {
            args: Prisma.UsuarioDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UsuarioPayload>
          }
          update: {
            args: Prisma.UsuarioUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UsuarioPayload>
          }
          deleteMany: {
            args: Prisma.UsuarioDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.UsuarioUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.UsuarioUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UsuarioPayload>
          }
          aggregate: {
            args: Prisma.UsuarioAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateUsuario>
          }
          groupBy: {
            args: Prisma.UsuarioGroupByArgs<ExtArgs>
            result: $Utils.Optional<UsuarioGroupByOutputType>[]
          }
          count: {
            args: Prisma.UsuarioCountArgs<ExtArgs>
            result: $Utils.Optional<UsuarioCountAggregateOutputType> | number
          }
        }
      }
    }
  } & {
    other: {
      payload: any
      operations: {
        $executeRaw: {
          args: [query: TemplateStringsArray | Prisma.Sql, ...values: any[]],
          result: any
        }
        $executeRawUnsafe: {
          args: [query: string, ...values: any[]],
          result: any
        }
        $queryRaw: {
          args: [query: TemplateStringsArray | Prisma.Sql, ...values: any[]],
          result: any
        }
        $queryRawUnsafe: {
          args: [query: string, ...values: any[]],
          result: any
        }
      }
    }
  }
  export const defineExtension: $Extensions.ExtendsHook<"define", Prisma.TypeMapCb, $Extensions.DefaultArgs>
  export type DefaultPrismaClient = PrismaClient
  export type ErrorFormat = 'pretty' | 'colorless' | 'minimal'
  export interface PrismaClientOptions {
    /**
     * Overwrites the datasource url from your schema.prisma file
     */
    datasources?: Datasources
    /**
     * Overwrites the datasource url from your schema.prisma file
     */
    datasourceUrl?: string
    /**
     * @default "colorless"
     */
    errorFormat?: ErrorFormat
    /**
     * @example
     * ```
     * // Defaults to stdout
     * log: ['query', 'info', 'warn', 'error']
     * 
     * // Emit as events
     * log: [
     *   { emit: 'stdout', level: 'query' },
     *   { emit: 'stdout', level: 'info' },
     *   { emit: 'stdout', level: 'warn' }
     *   { emit: 'stdout', level: 'error' }
     * ]
     * ```
     * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/logging#the-log-option).
     */
    log?: (LogLevel | LogDefinition)[]
    /**
     * The default values for transactionOptions
     * maxWait ?= 2000
     * timeout ?= 5000
     */
    transactionOptions?: {
      maxWait?: number
      timeout?: number
      isolationLevel?: Prisma.TransactionIsolationLevel
    }
  }


  /* Types for Logging */
  export type LogLevel = 'info' | 'query' | 'warn' | 'error'
  export type LogDefinition = {
    level: LogLevel
    emit: 'stdout' | 'event'
  }

  export type GetLogType<T extends LogLevel | LogDefinition> = T extends LogDefinition ? T['emit'] extends 'event' ? T['level'] : never : never
  export type GetEvents<T extends any> = T extends Array<LogLevel | LogDefinition> ?
    GetLogType<T[0]> | GetLogType<T[1]> | GetLogType<T[2]> | GetLogType<T[3]>
    : never

  export type QueryEvent = {
    timestamp: Date
    query: string
    params: string
    duration: number
    target: string
  }

  export type LogEvent = {
    timestamp: Date
    message: string
    target: string
  }
  /* End Types for Logging */


  export type PrismaAction =
    | 'findUnique'
    | 'findUniqueOrThrow'
    | 'findMany'
    | 'findFirst'
    | 'findFirstOrThrow'
    | 'create'
    | 'createMany'
    | 'createManyAndReturn'
    | 'update'
    | 'updateMany'
    | 'upsert'
    | 'delete'
    | 'deleteMany'
    | 'executeRaw'
    | 'queryRaw'
    | 'aggregate'
    | 'count'
    | 'runCommandRaw'
    | 'findRaw'
    | 'groupBy'

  /**
   * These options are being passed into the middleware as "params"
   */
  export type MiddlewareParams = {
    model?: ModelName
    action: PrismaAction
    args: any
    dataPath: string[]
    runInTransaction: boolean
  }

  /**
   * The `T` type makes sure, that the `return proceed` is not forgotten in the middleware implementation
   */
  export type Middleware<T = any> = (
    params: MiddlewareParams,
    next: (params: MiddlewareParams) => $Utils.JsPromise<T>,
  ) => $Utils.JsPromise<T>

  // tested in getLogLevel.test.ts
  export function getLogLevel(log: Array<LogLevel | LogDefinition>): LogLevel | undefined;

  /**
   * `PrismaClient` proxy available in interactive transactions.
   */
  export type TransactionClient = Omit<Prisma.DefaultPrismaClient, runtime.ITXClientDenyList>

  export type Datasource = {
    url?: string
  }

  /**
   * Count Types
   */


  /**
   * Count Type EmpresaCountOutputType
   */

  export type EmpresaCountOutputType = {
    usuarios: number
    colaboradores: number
    festivos: number
    configuracion: number
    horarios: number
    dispositivos: number
  }

  export type EmpresaCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    usuarios?: boolean | EmpresaCountOutputTypeCountUsuariosArgs
    colaboradores?: boolean | EmpresaCountOutputTypeCountColaboradoresArgs
    festivos?: boolean | EmpresaCountOutputTypeCountFestivosArgs
    configuracion?: boolean | EmpresaCountOutputTypeCountConfiguracionArgs
    horarios?: boolean | EmpresaCountOutputTypeCountHorariosArgs
    dispositivos?: boolean | EmpresaCountOutputTypeCountDispositivosArgs
  }

  // Custom InputTypes
  /**
   * EmpresaCountOutputType without action
   */
  export type EmpresaCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the EmpresaCountOutputType
     */
    select?: EmpresaCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * EmpresaCountOutputType without action
   */
  export type EmpresaCountOutputTypeCountUsuariosArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: UsuarioWhereInput
  }

  /**
   * EmpresaCountOutputType without action
   */
  export type EmpresaCountOutputTypeCountColaboradoresArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: ColaboradorWhereInput
  }

  /**
   * EmpresaCountOutputType without action
   */
  export type EmpresaCountOutputTypeCountFestivosArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: DiaFestivoWhereInput
  }

  /**
   * EmpresaCountOutputType without action
   */
  export type EmpresaCountOutputTypeCountConfiguracionArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: ConfiguracionWhereInput
  }

  /**
   * EmpresaCountOutputType without action
   */
  export type EmpresaCountOutputTypeCountHorariosArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: HorarioWhereInput
  }

  /**
   * EmpresaCountOutputType without action
   */
  export type EmpresaCountOutputTypeCountDispositivosArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: DispositivoKioscoWhereInput
  }


  /**
   * Count Type SuscripcionCountOutputType
   */

  export type SuscripcionCountOutputType = {
    pagos: number
  }

  export type SuscripcionCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    pagos?: boolean | SuscripcionCountOutputTypeCountPagosArgs
  }

  // Custom InputTypes
  /**
   * SuscripcionCountOutputType without action
   */
  export type SuscripcionCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SuscripcionCountOutputType
     */
    select?: SuscripcionCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * SuscripcionCountOutputType without action
   */
  export type SuscripcionCountOutputTypeCountPagosArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: PagoWhereInput
  }


  /**
   * Count Type HorarioCountOutputType
   */

  export type HorarioCountOutputType = {
    franjas: number
    colaboradores: number
  }

  export type HorarioCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    franjas?: boolean | HorarioCountOutputTypeCountFranjasArgs
    colaboradores?: boolean | HorarioCountOutputTypeCountColaboradoresArgs
  }

  // Custom InputTypes
  /**
   * HorarioCountOutputType without action
   */
  export type HorarioCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the HorarioCountOutputType
     */
    select?: HorarioCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * HorarioCountOutputType without action
   */
  export type HorarioCountOutputTypeCountFranjasArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: FranjaHorarioWhereInput
  }

  /**
   * HorarioCountOutputType without action
   */
  export type HorarioCountOutputTypeCountColaboradoresArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: ColaboradorWhereInput
  }


  /**
   * Count Type ColaboradorCountOutputType
   */

  export type ColaboradorCountOutputType = {
    registros: number
    permisos: number
  }

  export type ColaboradorCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    registros?: boolean | ColaboradorCountOutputTypeCountRegistrosArgs
    permisos?: boolean | ColaboradorCountOutputTypeCountPermisosArgs
  }

  // Custom InputTypes
  /**
   * ColaboradorCountOutputType without action
   */
  export type ColaboradorCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ColaboradorCountOutputType
     */
    select?: ColaboradorCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * ColaboradorCountOutputType without action
   */
  export type ColaboradorCountOutputTypeCountRegistrosArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: RegistroWhereInput
  }

  /**
   * ColaboradorCountOutputType without action
   */
  export type ColaboradorCountOutputTypeCountPermisosArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: PermisoWhereInput
  }


  /**
   * Models
   */

  /**
   * Model Empresa
   */

  export type AggregateEmpresa = {
    _count: EmpresaCountAggregateOutputType | null
    _min: EmpresaMinAggregateOutputType | null
    _max: EmpresaMaxAggregateOutputType | null
  }

  export type EmpresaMinAggregateOutputType = {
    id: string | null
    nombre: string | null
    nit: string | null
    email: string | null
    telefono: string | null
    marcadorToken: string | null
    exentaPago: boolean | null
    activa: boolean | null
    creadoEn: Date | null
    actualizadoEn: Date | null
  }

  export type EmpresaMaxAggregateOutputType = {
    id: string | null
    nombre: string | null
    nit: string | null
    email: string | null
    telefono: string | null
    marcadorToken: string | null
    exentaPago: boolean | null
    activa: boolean | null
    creadoEn: Date | null
    actualizadoEn: Date | null
  }

  export type EmpresaCountAggregateOutputType = {
    id: number
    nombre: number
    nit: number
    email: number
    telefono: number
    marcadorToken: number
    exentaPago: number
    activa: number
    creadoEn: number
    actualizadoEn: number
    _all: number
  }


  export type EmpresaMinAggregateInputType = {
    id?: true
    nombre?: true
    nit?: true
    email?: true
    telefono?: true
    marcadorToken?: true
    exentaPago?: true
    activa?: true
    creadoEn?: true
    actualizadoEn?: true
  }

  export type EmpresaMaxAggregateInputType = {
    id?: true
    nombre?: true
    nit?: true
    email?: true
    telefono?: true
    marcadorToken?: true
    exentaPago?: true
    activa?: true
    creadoEn?: true
    actualizadoEn?: true
  }

  export type EmpresaCountAggregateInputType = {
    id?: true
    nombre?: true
    nit?: true
    email?: true
    telefono?: true
    marcadorToken?: true
    exentaPago?: true
    activa?: true
    creadoEn?: true
    actualizadoEn?: true
    _all?: true
  }

  export type EmpresaAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Empresa to aggregate.
     */
    where?: EmpresaWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Empresas to fetch.
     */
    orderBy?: EmpresaOrderByWithRelationInput | EmpresaOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: EmpresaWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Empresas from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Empresas.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Empresas
    **/
    _count?: true | EmpresaCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: EmpresaMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: EmpresaMaxAggregateInputType
  }

  export type GetEmpresaAggregateType<T extends EmpresaAggregateArgs> = {
        [P in keyof T & keyof AggregateEmpresa]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateEmpresa[P]>
      : GetScalarType<T[P], AggregateEmpresa[P]>
  }




  export type EmpresaGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: EmpresaWhereInput
    orderBy?: EmpresaOrderByWithAggregationInput | EmpresaOrderByWithAggregationInput[]
    by: EmpresaScalarFieldEnum[] | EmpresaScalarFieldEnum
    having?: EmpresaScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: EmpresaCountAggregateInputType | true
    _min?: EmpresaMinAggregateInputType
    _max?: EmpresaMaxAggregateInputType
  }

  export type EmpresaGroupByOutputType = {
    id: string
    nombre: string
    nit: string
    email: string
    telefono: string | null
    marcadorToken: string
    exentaPago: boolean
    activa: boolean
    creadoEn: Date
    actualizadoEn: Date
    _count: EmpresaCountAggregateOutputType | null
    _min: EmpresaMinAggregateOutputType | null
    _max: EmpresaMaxAggregateOutputType | null
  }

  type GetEmpresaGroupByPayload<T extends EmpresaGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<EmpresaGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof EmpresaGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], EmpresaGroupByOutputType[P]>
            : GetScalarType<T[P], EmpresaGroupByOutputType[P]>
        }
      >
    >


  export type EmpresaSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    nombre?: boolean
    nit?: boolean
    email?: boolean
    telefono?: boolean
    marcadorToken?: boolean
    exentaPago?: boolean
    activa?: boolean
    creadoEn?: boolean
    actualizadoEn?: boolean
    usuarios?: boolean | Empresa$usuariosArgs<ExtArgs>
    colaboradores?: boolean | Empresa$colaboradoresArgs<ExtArgs>
    festivos?: boolean | Empresa$festivosArgs<ExtArgs>
    configuracion?: boolean | Empresa$configuracionArgs<ExtArgs>
    suscripcion?: boolean | Empresa$suscripcionArgs<ExtArgs>
    horarios?: boolean | Empresa$horariosArgs<ExtArgs>
    dispositivos?: boolean | Empresa$dispositivosArgs<ExtArgs>
    _count?: boolean | EmpresaCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["empresa"]>


  export type EmpresaSelectScalar = {
    id?: boolean
    nombre?: boolean
    nit?: boolean
    email?: boolean
    telefono?: boolean
    marcadorToken?: boolean
    exentaPago?: boolean
    activa?: boolean
    creadoEn?: boolean
    actualizadoEn?: boolean
  }

  export type EmpresaInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    usuarios?: boolean | Empresa$usuariosArgs<ExtArgs>
    colaboradores?: boolean | Empresa$colaboradoresArgs<ExtArgs>
    festivos?: boolean | Empresa$festivosArgs<ExtArgs>
    configuracion?: boolean | Empresa$configuracionArgs<ExtArgs>
    suscripcion?: boolean | Empresa$suscripcionArgs<ExtArgs>
    horarios?: boolean | Empresa$horariosArgs<ExtArgs>
    dispositivos?: boolean | Empresa$dispositivosArgs<ExtArgs>
    _count?: boolean | EmpresaCountOutputTypeDefaultArgs<ExtArgs>
  }

  export type $EmpresaPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Empresa"
    objects: {
      usuarios: Prisma.$UsuarioPayload<ExtArgs>[]
      colaboradores: Prisma.$ColaboradorPayload<ExtArgs>[]
      festivos: Prisma.$DiaFestivoPayload<ExtArgs>[]
      configuracion: Prisma.$ConfiguracionPayload<ExtArgs>[]
      suscripcion: Prisma.$SuscripcionPayload<ExtArgs> | null
      horarios: Prisma.$HorarioPayload<ExtArgs>[]
      dispositivos: Prisma.$DispositivoKioscoPayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      nombre: string
      nit: string
      email: string
      telefono: string | null
      marcadorToken: string
      exentaPago: boolean
      activa: boolean
      creadoEn: Date
      actualizadoEn: Date
    }, ExtArgs["result"]["empresa"]>
    composites: {}
  }

  type EmpresaGetPayload<S extends boolean | null | undefined | EmpresaDefaultArgs> = $Result.GetResult<Prisma.$EmpresaPayload, S>

  type EmpresaCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = 
    Omit<EmpresaFindManyArgs, 'select' | 'include' | 'distinct'> & {
      select?: EmpresaCountAggregateInputType | true
    }

  export interface EmpresaDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Empresa'], meta: { name: 'Empresa' } }
    /**
     * Find zero or one Empresa that matches the filter.
     * @param {EmpresaFindUniqueArgs} args - Arguments to find a Empresa
     * @example
     * // Get one Empresa
     * const empresa = await prisma.empresa.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends EmpresaFindUniqueArgs>(args: SelectSubset<T, EmpresaFindUniqueArgs<ExtArgs>>): Prisma__EmpresaClient<$Result.GetResult<Prisma.$EmpresaPayload<ExtArgs>, T, "findUnique"> | null, null, ExtArgs>

    /**
     * Find one Empresa that matches the filter or throw an error with `error.code='P2025'` 
     * if no matches were found.
     * @param {EmpresaFindUniqueOrThrowArgs} args - Arguments to find a Empresa
     * @example
     * // Get one Empresa
     * const empresa = await prisma.empresa.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends EmpresaFindUniqueOrThrowArgs>(args: SelectSubset<T, EmpresaFindUniqueOrThrowArgs<ExtArgs>>): Prisma__EmpresaClient<$Result.GetResult<Prisma.$EmpresaPayload<ExtArgs>, T, "findUniqueOrThrow">, never, ExtArgs>

    /**
     * Find the first Empresa that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {EmpresaFindFirstArgs} args - Arguments to find a Empresa
     * @example
     * // Get one Empresa
     * const empresa = await prisma.empresa.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends EmpresaFindFirstArgs>(args?: SelectSubset<T, EmpresaFindFirstArgs<ExtArgs>>): Prisma__EmpresaClient<$Result.GetResult<Prisma.$EmpresaPayload<ExtArgs>, T, "findFirst"> | null, null, ExtArgs>

    /**
     * Find the first Empresa that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {EmpresaFindFirstOrThrowArgs} args - Arguments to find a Empresa
     * @example
     * // Get one Empresa
     * const empresa = await prisma.empresa.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends EmpresaFindFirstOrThrowArgs>(args?: SelectSubset<T, EmpresaFindFirstOrThrowArgs<ExtArgs>>): Prisma__EmpresaClient<$Result.GetResult<Prisma.$EmpresaPayload<ExtArgs>, T, "findFirstOrThrow">, never, ExtArgs>

    /**
     * Find zero or more Empresas that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {EmpresaFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Empresas
     * const empresas = await prisma.empresa.findMany()
     * 
     * // Get first 10 Empresas
     * const empresas = await prisma.empresa.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const empresaWithIdOnly = await prisma.empresa.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends EmpresaFindManyArgs>(args?: SelectSubset<T, EmpresaFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$EmpresaPayload<ExtArgs>, T, "findMany">>

    /**
     * Create a Empresa.
     * @param {EmpresaCreateArgs} args - Arguments to create a Empresa.
     * @example
     * // Create one Empresa
     * const Empresa = await prisma.empresa.create({
     *   data: {
     *     // ... data to create a Empresa
     *   }
     * })
     * 
     */
    create<T extends EmpresaCreateArgs>(args: SelectSubset<T, EmpresaCreateArgs<ExtArgs>>): Prisma__EmpresaClient<$Result.GetResult<Prisma.$EmpresaPayload<ExtArgs>, T, "create">, never, ExtArgs>

    /**
     * Create many Empresas.
     * @param {EmpresaCreateManyArgs} args - Arguments to create many Empresas.
     * @example
     * // Create many Empresas
     * const empresa = await prisma.empresa.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends EmpresaCreateManyArgs>(args?: SelectSubset<T, EmpresaCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Delete a Empresa.
     * @param {EmpresaDeleteArgs} args - Arguments to delete one Empresa.
     * @example
     * // Delete one Empresa
     * const Empresa = await prisma.empresa.delete({
     *   where: {
     *     // ... filter to delete one Empresa
     *   }
     * })
     * 
     */
    delete<T extends EmpresaDeleteArgs>(args: SelectSubset<T, EmpresaDeleteArgs<ExtArgs>>): Prisma__EmpresaClient<$Result.GetResult<Prisma.$EmpresaPayload<ExtArgs>, T, "delete">, never, ExtArgs>

    /**
     * Update one Empresa.
     * @param {EmpresaUpdateArgs} args - Arguments to update one Empresa.
     * @example
     * // Update one Empresa
     * const empresa = await prisma.empresa.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends EmpresaUpdateArgs>(args: SelectSubset<T, EmpresaUpdateArgs<ExtArgs>>): Prisma__EmpresaClient<$Result.GetResult<Prisma.$EmpresaPayload<ExtArgs>, T, "update">, never, ExtArgs>

    /**
     * Delete zero or more Empresas.
     * @param {EmpresaDeleteManyArgs} args - Arguments to filter Empresas to delete.
     * @example
     * // Delete a few Empresas
     * const { count } = await prisma.empresa.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends EmpresaDeleteManyArgs>(args?: SelectSubset<T, EmpresaDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Empresas.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {EmpresaUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Empresas
     * const empresa = await prisma.empresa.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends EmpresaUpdateManyArgs>(args: SelectSubset<T, EmpresaUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one Empresa.
     * @param {EmpresaUpsertArgs} args - Arguments to update or create a Empresa.
     * @example
     * // Update or create a Empresa
     * const empresa = await prisma.empresa.upsert({
     *   create: {
     *     // ... data to create a Empresa
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Empresa we want to update
     *   }
     * })
     */
    upsert<T extends EmpresaUpsertArgs>(args: SelectSubset<T, EmpresaUpsertArgs<ExtArgs>>): Prisma__EmpresaClient<$Result.GetResult<Prisma.$EmpresaPayload<ExtArgs>, T, "upsert">, never, ExtArgs>


    /**
     * Count the number of Empresas.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {EmpresaCountArgs} args - Arguments to filter Empresas to count.
     * @example
     * // Count the number of Empresas
     * const count = await prisma.empresa.count({
     *   where: {
     *     // ... the filter for the Empresas we want to count
     *   }
     * })
    **/
    count<T extends EmpresaCountArgs>(
      args?: Subset<T, EmpresaCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], EmpresaCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Empresa.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {EmpresaAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends EmpresaAggregateArgs>(args: Subset<T, EmpresaAggregateArgs>): Prisma.PrismaPromise<GetEmpresaAggregateType<T>>

    /**
     * Group by Empresa.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {EmpresaGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends EmpresaGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: EmpresaGroupByArgs['orderBy'] }
        : { orderBy?: EmpresaGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, EmpresaGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetEmpresaGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Empresa model
   */
  readonly fields: EmpresaFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Empresa.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__EmpresaClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    usuarios<T extends Empresa$usuariosArgs<ExtArgs> = {}>(args?: Subset<T, Empresa$usuariosArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$UsuarioPayload<ExtArgs>, T, "findMany"> | Null>
    colaboradores<T extends Empresa$colaboradoresArgs<ExtArgs> = {}>(args?: Subset<T, Empresa$colaboradoresArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ColaboradorPayload<ExtArgs>, T, "findMany"> | Null>
    festivos<T extends Empresa$festivosArgs<ExtArgs> = {}>(args?: Subset<T, Empresa$festivosArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$DiaFestivoPayload<ExtArgs>, T, "findMany"> | Null>
    configuracion<T extends Empresa$configuracionArgs<ExtArgs> = {}>(args?: Subset<T, Empresa$configuracionArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ConfiguracionPayload<ExtArgs>, T, "findMany"> | Null>
    suscripcion<T extends Empresa$suscripcionArgs<ExtArgs> = {}>(args?: Subset<T, Empresa$suscripcionArgs<ExtArgs>>): Prisma__SuscripcionClient<$Result.GetResult<Prisma.$SuscripcionPayload<ExtArgs>, T, "findUniqueOrThrow"> | null, null, ExtArgs>
    horarios<T extends Empresa$horariosArgs<ExtArgs> = {}>(args?: Subset<T, Empresa$horariosArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$HorarioPayload<ExtArgs>, T, "findMany"> | Null>
    dispositivos<T extends Empresa$dispositivosArgs<ExtArgs> = {}>(args?: Subset<T, Empresa$dispositivosArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$DispositivoKioscoPayload<ExtArgs>, T, "findMany"> | Null>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the Empresa model
   */ 
  interface EmpresaFieldRefs {
    readonly id: FieldRef<"Empresa", 'String'>
    readonly nombre: FieldRef<"Empresa", 'String'>
    readonly nit: FieldRef<"Empresa", 'String'>
    readonly email: FieldRef<"Empresa", 'String'>
    readonly telefono: FieldRef<"Empresa", 'String'>
    readonly marcadorToken: FieldRef<"Empresa", 'String'>
    readonly exentaPago: FieldRef<"Empresa", 'Boolean'>
    readonly activa: FieldRef<"Empresa", 'Boolean'>
    readonly creadoEn: FieldRef<"Empresa", 'DateTime'>
    readonly actualizadoEn: FieldRef<"Empresa", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * Empresa findUnique
   */
  export type EmpresaFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Empresa
     */
    select?: EmpresaSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: EmpresaInclude<ExtArgs> | null
    /**
     * Filter, which Empresa to fetch.
     */
    where: EmpresaWhereUniqueInput
  }

  /**
   * Empresa findUniqueOrThrow
   */
  export type EmpresaFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Empresa
     */
    select?: EmpresaSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: EmpresaInclude<ExtArgs> | null
    /**
     * Filter, which Empresa to fetch.
     */
    where: EmpresaWhereUniqueInput
  }

  /**
   * Empresa findFirst
   */
  export type EmpresaFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Empresa
     */
    select?: EmpresaSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: EmpresaInclude<ExtArgs> | null
    /**
     * Filter, which Empresa to fetch.
     */
    where?: EmpresaWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Empresas to fetch.
     */
    orderBy?: EmpresaOrderByWithRelationInput | EmpresaOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Empresas.
     */
    cursor?: EmpresaWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Empresas from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Empresas.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Empresas.
     */
    distinct?: EmpresaScalarFieldEnum | EmpresaScalarFieldEnum[]
  }

  /**
   * Empresa findFirstOrThrow
   */
  export type EmpresaFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Empresa
     */
    select?: EmpresaSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: EmpresaInclude<ExtArgs> | null
    /**
     * Filter, which Empresa to fetch.
     */
    where?: EmpresaWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Empresas to fetch.
     */
    orderBy?: EmpresaOrderByWithRelationInput | EmpresaOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Empresas.
     */
    cursor?: EmpresaWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Empresas from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Empresas.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Empresas.
     */
    distinct?: EmpresaScalarFieldEnum | EmpresaScalarFieldEnum[]
  }

  /**
   * Empresa findMany
   */
  export type EmpresaFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Empresa
     */
    select?: EmpresaSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: EmpresaInclude<ExtArgs> | null
    /**
     * Filter, which Empresas to fetch.
     */
    where?: EmpresaWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Empresas to fetch.
     */
    orderBy?: EmpresaOrderByWithRelationInput | EmpresaOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Empresas.
     */
    cursor?: EmpresaWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Empresas from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Empresas.
     */
    skip?: number
    distinct?: EmpresaScalarFieldEnum | EmpresaScalarFieldEnum[]
  }

  /**
   * Empresa create
   */
  export type EmpresaCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Empresa
     */
    select?: EmpresaSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: EmpresaInclude<ExtArgs> | null
    /**
     * The data needed to create a Empresa.
     */
    data: XOR<EmpresaCreateInput, EmpresaUncheckedCreateInput>
  }

  /**
   * Empresa createMany
   */
  export type EmpresaCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Empresas.
     */
    data: EmpresaCreateManyInput | EmpresaCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Empresa update
   */
  export type EmpresaUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Empresa
     */
    select?: EmpresaSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: EmpresaInclude<ExtArgs> | null
    /**
     * The data needed to update a Empresa.
     */
    data: XOR<EmpresaUpdateInput, EmpresaUncheckedUpdateInput>
    /**
     * Choose, which Empresa to update.
     */
    where: EmpresaWhereUniqueInput
  }

  /**
   * Empresa updateMany
   */
  export type EmpresaUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Empresas.
     */
    data: XOR<EmpresaUpdateManyMutationInput, EmpresaUncheckedUpdateManyInput>
    /**
     * Filter which Empresas to update
     */
    where?: EmpresaWhereInput
  }

  /**
   * Empresa upsert
   */
  export type EmpresaUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Empresa
     */
    select?: EmpresaSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: EmpresaInclude<ExtArgs> | null
    /**
     * The filter to search for the Empresa to update in case it exists.
     */
    where: EmpresaWhereUniqueInput
    /**
     * In case the Empresa found by the `where` argument doesn't exist, create a new Empresa with this data.
     */
    create: XOR<EmpresaCreateInput, EmpresaUncheckedCreateInput>
    /**
     * In case the Empresa was found with the provided `where` argument, update it with this data.
     */
    update: XOR<EmpresaUpdateInput, EmpresaUncheckedUpdateInput>
  }

  /**
   * Empresa delete
   */
  export type EmpresaDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Empresa
     */
    select?: EmpresaSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: EmpresaInclude<ExtArgs> | null
    /**
     * Filter which Empresa to delete.
     */
    where: EmpresaWhereUniqueInput
  }

  /**
   * Empresa deleteMany
   */
  export type EmpresaDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Empresas to delete
     */
    where?: EmpresaWhereInput
  }

  /**
   * Empresa.usuarios
   */
  export type Empresa$usuariosArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Usuario
     */
    select?: UsuarioSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UsuarioInclude<ExtArgs> | null
    where?: UsuarioWhereInput
    orderBy?: UsuarioOrderByWithRelationInput | UsuarioOrderByWithRelationInput[]
    cursor?: UsuarioWhereUniqueInput
    take?: number
    skip?: number
    distinct?: UsuarioScalarFieldEnum | UsuarioScalarFieldEnum[]
  }

  /**
   * Empresa.colaboradores
   */
  export type Empresa$colaboradoresArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Colaborador
     */
    select?: ColaboradorSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ColaboradorInclude<ExtArgs> | null
    where?: ColaboradorWhereInput
    orderBy?: ColaboradorOrderByWithRelationInput | ColaboradorOrderByWithRelationInput[]
    cursor?: ColaboradorWhereUniqueInput
    take?: number
    skip?: number
    distinct?: ColaboradorScalarFieldEnum | ColaboradorScalarFieldEnum[]
  }

  /**
   * Empresa.festivos
   */
  export type Empresa$festivosArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the DiaFestivo
     */
    select?: DiaFestivoSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: DiaFestivoInclude<ExtArgs> | null
    where?: DiaFestivoWhereInput
    orderBy?: DiaFestivoOrderByWithRelationInput | DiaFestivoOrderByWithRelationInput[]
    cursor?: DiaFestivoWhereUniqueInput
    take?: number
    skip?: number
    distinct?: DiaFestivoScalarFieldEnum | DiaFestivoScalarFieldEnum[]
  }

  /**
   * Empresa.configuracion
   */
  export type Empresa$configuracionArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Configuracion
     */
    select?: ConfiguracionSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ConfiguracionInclude<ExtArgs> | null
    where?: ConfiguracionWhereInput
    orderBy?: ConfiguracionOrderByWithRelationInput | ConfiguracionOrderByWithRelationInput[]
    cursor?: ConfiguracionWhereUniqueInput
    take?: number
    skip?: number
    distinct?: ConfiguracionScalarFieldEnum | ConfiguracionScalarFieldEnum[]
  }

  /**
   * Empresa.suscripcion
   */
  export type Empresa$suscripcionArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Suscripcion
     */
    select?: SuscripcionSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SuscripcionInclude<ExtArgs> | null
    where?: SuscripcionWhereInput
  }

  /**
   * Empresa.horarios
   */
  export type Empresa$horariosArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Horario
     */
    select?: HorarioSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: HorarioInclude<ExtArgs> | null
    where?: HorarioWhereInput
    orderBy?: HorarioOrderByWithRelationInput | HorarioOrderByWithRelationInput[]
    cursor?: HorarioWhereUniqueInput
    take?: number
    skip?: number
    distinct?: HorarioScalarFieldEnum | HorarioScalarFieldEnum[]
  }

  /**
   * Empresa.dispositivos
   */
  export type Empresa$dispositivosArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the DispositivoKiosco
     */
    select?: DispositivoKioscoSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: DispositivoKioscoInclude<ExtArgs> | null
    where?: DispositivoKioscoWhereInput
    orderBy?: DispositivoKioscoOrderByWithRelationInput | DispositivoKioscoOrderByWithRelationInput[]
    cursor?: DispositivoKioscoWhereUniqueInput
    take?: number
    skip?: number
    distinct?: DispositivoKioscoScalarFieldEnum | DispositivoKioscoScalarFieldEnum[]
  }

  /**
   * Empresa without action
   */
  export type EmpresaDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Empresa
     */
    select?: EmpresaSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: EmpresaInclude<ExtArgs> | null
  }


  /**
   * Model Suscripcion
   */

  export type AggregateSuscripcion = {
    _count: SuscripcionCountAggregateOutputType | null
    _min: SuscripcionMinAggregateOutputType | null
    _max: SuscripcionMaxAggregateOutputType | null
  }

  export type SuscripcionMinAggregateOutputType = {
    id: string | null
    empresaId: string | null
    estado: $Enums.EstadoSuscripcion | null
    finPrueba: Date | null
    pagadoHasta: Date | null
    suspendidaEn: Date | null
    wompiFuentePagoId: string | null
    creadoEn: Date | null
    actualizadoEn: Date | null
  }

  export type SuscripcionMaxAggregateOutputType = {
    id: string | null
    empresaId: string | null
    estado: $Enums.EstadoSuscripcion | null
    finPrueba: Date | null
    pagadoHasta: Date | null
    suspendidaEn: Date | null
    wompiFuentePagoId: string | null
    creadoEn: Date | null
    actualizadoEn: Date | null
  }

  export type SuscripcionCountAggregateOutputType = {
    id: number
    empresaId: number
    estado: number
    finPrueba: number
    pagadoHasta: number
    suspendidaEn: number
    wompiFuentePagoId: number
    creadoEn: number
    actualizadoEn: number
    _all: number
  }


  export type SuscripcionMinAggregateInputType = {
    id?: true
    empresaId?: true
    estado?: true
    finPrueba?: true
    pagadoHasta?: true
    suspendidaEn?: true
    wompiFuentePagoId?: true
    creadoEn?: true
    actualizadoEn?: true
  }

  export type SuscripcionMaxAggregateInputType = {
    id?: true
    empresaId?: true
    estado?: true
    finPrueba?: true
    pagadoHasta?: true
    suspendidaEn?: true
    wompiFuentePagoId?: true
    creadoEn?: true
    actualizadoEn?: true
  }

  export type SuscripcionCountAggregateInputType = {
    id?: true
    empresaId?: true
    estado?: true
    finPrueba?: true
    pagadoHasta?: true
    suspendidaEn?: true
    wompiFuentePagoId?: true
    creadoEn?: true
    actualizadoEn?: true
    _all?: true
  }

  export type SuscripcionAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Suscripcion to aggregate.
     */
    where?: SuscripcionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Suscripcions to fetch.
     */
    orderBy?: SuscripcionOrderByWithRelationInput | SuscripcionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: SuscripcionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Suscripcions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Suscripcions.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Suscripcions
    **/
    _count?: true | SuscripcionCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: SuscripcionMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: SuscripcionMaxAggregateInputType
  }

  export type GetSuscripcionAggregateType<T extends SuscripcionAggregateArgs> = {
        [P in keyof T & keyof AggregateSuscripcion]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateSuscripcion[P]>
      : GetScalarType<T[P], AggregateSuscripcion[P]>
  }




  export type SuscripcionGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: SuscripcionWhereInput
    orderBy?: SuscripcionOrderByWithAggregationInput | SuscripcionOrderByWithAggregationInput[]
    by: SuscripcionScalarFieldEnum[] | SuscripcionScalarFieldEnum
    having?: SuscripcionScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: SuscripcionCountAggregateInputType | true
    _min?: SuscripcionMinAggregateInputType
    _max?: SuscripcionMaxAggregateInputType
  }

  export type SuscripcionGroupByOutputType = {
    id: string
    empresaId: string
    estado: $Enums.EstadoSuscripcion
    finPrueba: Date
    pagadoHasta: Date | null
    suspendidaEn: Date | null
    wompiFuentePagoId: string | null
    creadoEn: Date
    actualizadoEn: Date
    _count: SuscripcionCountAggregateOutputType | null
    _min: SuscripcionMinAggregateOutputType | null
    _max: SuscripcionMaxAggregateOutputType | null
  }

  type GetSuscripcionGroupByPayload<T extends SuscripcionGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<SuscripcionGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof SuscripcionGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], SuscripcionGroupByOutputType[P]>
            : GetScalarType<T[P], SuscripcionGroupByOutputType[P]>
        }
      >
    >


  export type SuscripcionSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    empresaId?: boolean
    estado?: boolean
    finPrueba?: boolean
    pagadoHasta?: boolean
    suspendidaEn?: boolean
    wompiFuentePagoId?: boolean
    creadoEn?: boolean
    actualizadoEn?: boolean
    empresa?: boolean | EmpresaDefaultArgs<ExtArgs>
    pagos?: boolean | Suscripcion$pagosArgs<ExtArgs>
    _count?: boolean | SuscripcionCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["suscripcion"]>


  export type SuscripcionSelectScalar = {
    id?: boolean
    empresaId?: boolean
    estado?: boolean
    finPrueba?: boolean
    pagadoHasta?: boolean
    suspendidaEn?: boolean
    wompiFuentePagoId?: boolean
    creadoEn?: boolean
    actualizadoEn?: boolean
  }

  export type SuscripcionInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    empresa?: boolean | EmpresaDefaultArgs<ExtArgs>
    pagos?: boolean | Suscripcion$pagosArgs<ExtArgs>
    _count?: boolean | SuscripcionCountOutputTypeDefaultArgs<ExtArgs>
  }

  export type $SuscripcionPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Suscripcion"
    objects: {
      empresa: Prisma.$EmpresaPayload<ExtArgs>
      pagos: Prisma.$PagoPayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      empresaId: string
      estado: $Enums.EstadoSuscripcion
      finPrueba: Date
      pagadoHasta: Date | null
      suspendidaEn: Date | null
      wompiFuentePagoId: string | null
      creadoEn: Date
      actualizadoEn: Date
    }, ExtArgs["result"]["suscripcion"]>
    composites: {}
  }

  type SuscripcionGetPayload<S extends boolean | null | undefined | SuscripcionDefaultArgs> = $Result.GetResult<Prisma.$SuscripcionPayload, S>

  type SuscripcionCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = 
    Omit<SuscripcionFindManyArgs, 'select' | 'include' | 'distinct'> & {
      select?: SuscripcionCountAggregateInputType | true
    }

  export interface SuscripcionDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Suscripcion'], meta: { name: 'Suscripcion' } }
    /**
     * Find zero or one Suscripcion that matches the filter.
     * @param {SuscripcionFindUniqueArgs} args - Arguments to find a Suscripcion
     * @example
     * // Get one Suscripcion
     * const suscripcion = await prisma.suscripcion.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends SuscripcionFindUniqueArgs>(args: SelectSubset<T, SuscripcionFindUniqueArgs<ExtArgs>>): Prisma__SuscripcionClient<$Result.GetResult<Prisma.$SuscripcionPayload<ExtArgs>, T, "findUnique"> | null, null, ExtArgs>

    /**
     * Find one Suscripcion that matches the filter or throw an error with `error.code='P2025'` 
     * if no matches were found.
     * @param {SuscripcionFindUniqueOrThrowArgs} args - Arguments to find a Suscripcion
     * @example
     * // Get one Suscripcion
     * const suscripcion = await prisma.suscripcion.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends SuscripcionFindUniqueOrThrowArgs>(args: SelectSubset<T, SuscripcionFindUniqueOrThrowArgs<ExtArgs>>): Prisma__SuscripcionClient<$Result.GetResult<Prisma.$SuscripcionPayload<ExtArgs>, T, "findUniqueOrThrow">, never, ExtArgs>

    /**
     * Find the first Suscripcion that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SuscripcionFindFirstArgs} args - Arguments to find a Suscripcion
     * @example
     * // Get one Suscripcion
     * const suscripcion = await prisma.suscripcion.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends SuscripcionFindFirstArgs>(args?: SelectSubset<T, SuscripcionFindFirstArgs<ExtArgs>>): Prisma__SuscripcionClient<$Result.GetResult<Prisma.$SuscripcionPayload<ExtArgs>, T, "findFirst"> | null, null, ExtArgs>

    /**
     * Find the first Suscripcion that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SuscripcionFindFirstOrThrowArgs} args - Arguments to find a Suscripcion
     * @example
     * // Get one Suscripcion
     * const suscripcion = await prisma.suscripcion.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends SuscripcionFindFirstOrThrowArgs>(args?: SelectSubset<T, SuscripcionFindFirstOrThrowArgs<ExtArgs>>): Prisma__SuscripcionClient<$Result.GetResult<Prisma.$SuscripcionPayload<ExtArgs>, T, "findFirstOrThrow">, never, ExtArgs>

    /**
     * Find zero or more Suscripcions that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SuscripcionFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Suscripcions
     * const suscripcions = await prisma.suscripcion.findMany()
     * 
     * // Get first 10 Suscripcions
     * const suscripcions = await prisma.suscripcion.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const suscripcionWithIdOnly = await prisma.suscripcion.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends SuscripcionFindManyArgs>(args?: SelectSubset<T, SuscripcionFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$SuscripcionPayload<ExtArgs>, T, "findMany">>

    /**
     * Create a Suscripcion.
     * @param {SuscripcionCreateArgs} args - Arguments to create a Suscripcion.
     * @example
     * // Create one Suscripcion
     * const Suscripcion = await prisma.suscripcion.create({
     *   data: {
     *     // ... data to create a Suscripcion
     *   }
     * })
     * 
     */
    create<T extends SuscripcionCreateArgs>(args: SelectSubset<T, SuscripcionCreateArgs<ExtArgs>>): Prisma__SuscripcionClient<$Result.GetResult<Prisma.$SuscripcionPayload<ExtArgs>, T, "create">, never, ExtArgs>

    /**
     * Create many Suscripcions.
     * @param {SuscripcionCreateManyArgs} args - Arguments to create many Suscripcions.
     * @example
     * // Create many Suscripcions
     * const suscripcion = await prisma.suscripcion.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends SuscripcionCreateManyArgs>(args?: SelectSubset<T, SuscripcionCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Delete a Suscripcion.
     * @param {SuscripcionDeleteArgs} args - Arguments to delete one Suscripcion.
     * @example
     * // Delete one Suscripcion
     * const Suscripcion = await prisma.suscripcion.delete({
     *   where: {
     *     // ... filter to delete one Suscripcion
     *   }
     * })
     * 
     */
    delete<T extends SuscripcionDeleteArgs>(args: SelectSubset<T, SuscripcionDeleteArgs<ExtArgs>>): Prisma__SuscripcionClient<$Result.GetResult<Prisma.$SuscripcionPayload<ExtArgs>, T, "delete">, never, ExtArgs>

    /**
     * Update one Suscripcion.
     * @param {SuscripcionUpdateArgs} args - Arguments to update one Suscripcion.
     * @example
     * // Update one Suscripcion
     * const suscripcion = await prisma.suscripcion.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends SuscripcionUpdateArgs>(args: SelectSubset<T, SuscripcionUpdateArgs<ExtArgs>>): Prisma__SuscripcionClient<$Result.GetResult<Prisma.$SuscripcionPayload<ExtArgs>, T, "update">, never, ExtArgs>

    /**
     * Delete zero or more Suscripcions.
     * @param {SuscripcionDeleteManyArgs} args - Arguments to filter Suscripcions to delete.
     * @example
     * // Delete a few Suscripcions
     * const { count } = await prisma.suscripcion.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends SuscripcionDeleteManyArgs>(args?: SelectSubset<T, SuscripcionDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Suscripcions.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SuscripcionUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Suscripcions
     * const suscripcion = await prisma.suscripcion.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends SuscripcionUpdateManyArgs>(args: SelectSubset<T, SuscripcionUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one Suscripcion.
     * @param {SuscripcionUpsertArgs} args - Arguments to update or create a Suscripcion.
     * @example
     * // Update or create a Suscripcion
     * const suscripcion = await prisma.suscripcion.upsert({
     *   create: {
     *     // ... data to create a Suscripcion
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Suscripcion we want to update
     *   }
     * })
     */
    upsert<T extends SuscripcionUpsertArgs>(args: SelectSubset<T, SuscripcionUpsertArgs<ExtArgs>>): Prisma__SuscripcionClient<$Result.GetResult<Prisma.$SuscripcionPayload<ExtArgs>, T, "upsert">, never, ExtArgs>


    /**
     * Count the number of Suscripcions.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SuscripcionCountArgs} args - Arguments to filter Suscripcions to count.
     * @example
     * // Count the number of Suscripcions
     * const count = await prisma.suscripcion.count({
     *   where: {
     *     // ... the filter for the Suscripcions we want to count
     *   }
     * })
    **/
    count<T extends SuscripcionCountArgs>(
      args?: Subset<T, SuscripcionCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], SuscripcionCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Suscripcion.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SuscripcionAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends SuscripcionAggregateArgs>(args: Subset<T, SuscripcionAggregateArgs>): Prisma.PrismaPromise<GetSuscripcionAggregateType<T>>

    /**
     * Group by Suscripcion.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SuscripcionGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends SuscripcionGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: SuscripcionGroupByArgs['orderBy'] }
        : { orderBy?: SuscripcionGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, SuscripcionGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetSuscripcionGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Suscripcion model
   */
  readonly fields: SuscripcionFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Suscripcion.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__SuscripcionClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    empresa<T extends EmpresaDefaultArgs<ExtArgs> = {}>(args?: Subset<T, EmpresaDefaultArgs<ExtArgs>>): Prisma__EmpresaClient<$Result.GetResult<Prisma.$EmpresaPayload<ExtArgs>, T, "findUniqueOrThrow"> | Null, Null, ExtArgs>
    pagos<T extends Suscripcion$pagosArgs<ExtArgs> = {}>(args?: Subset<T, Suscripcion$pagosArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$PagoPayload<ExtArgs>, T, "findMany"> | Null>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the Suscripcion model
   */ 
  interface SuscripcionFieldRefs {
    readonly id: FieldRef<"Suscripcion", 'String'>
    readonly empresaId: FieldRef<"Suscripcion", 'String'>
    readonly estado: FieldRef<"Suscripcion", 'EstadoSuscripcion'>
    readonly finPrueba: FieldRef<"Suscripcion", 'DateTime'>
    readonly pagadoHasta: FieldRef<"Suscripcion", 'DateTime'>
    readonly suspendidaEn: FieldRef<"Suscripcion", 'DateTime'>
    readonly wompiFuentePagoId: FieldRef<"Suscripcion", 'String'>
    readonly creadoEn: FieldRef<"Suscripcion", 'DateTime'>
    readonly actualizadoEn: FieldRef<"Suscripcion", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * Suscripcion findUnique
   */
  export type SuscripcionFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Suscripcion
     */
    select?: SuscripcionSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SuscripcionInclude<ExtArgs> | null
    /**
     * Filter, which Suscripcion to fetch.
     */
    where: SuscripcionWhereUniqueInput
  }

  /**
   * Suscripcion findUniqueOrThrow
   */
  export type SuscripcionFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Suscripcion
     */
    select?: SuscripcionSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SuscripcionInclude<ExtArgs> | null
    /**
     * Filter, which Suscripcion to fetch.
     */
    where: SuscripcionWhereUniqueInput
  }

  /**
   * Suscripcion findFirst
   */
  export type SuscripcionFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Suscripcion
     */
    select?: SuscripcionSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SuscripcionInclude<ExtArgs> | null
    /**
     * Filter, which Suscripcion to fetch.
     */
    where?: SuscripcionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Suscripcions to fetch.
     */
    orderBy?: SuscripcionOrderByWithRelationInput | SuscripcionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Suscripcions.
     */
    cursor?: SuscripcionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Suscripcions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Suscripcions.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Suscripcions.
     */
    distinct?: SuscripcionScalarFieldEnum | SuscripcionScalarFieldEnum[]
  }

  /**
   * Suscripcion findFirstOrThrow
   */
  export type SuscripcionFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Suscripcion
     */
    select?: SuscripcionSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SuscripcionInclude<ExtArgs> | null
    /**
     * Filter, which Suscripcion to fetch.
     */
    where?: SuscripcionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Suscripcions to fetch.
     */
    orderBy?: SuscripcionOrderByWithRelationInput | SuscripcionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Suscripcions.
     */
    cursor?: SuscripcionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Suscripcions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Suscripcions.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Suscripcions.
     */
    distinct?: SuscripcionScalarFieldEnum | SuscripcionScalarFieldEnum[]
  }

  /**
   * Suscripcion findMany
   */
  export type SuscripcionFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Suscripcion
     */
    select?: SuscripcionSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SuscripcionInclude<ExtArgs> | null
    /**
     * Filter, which Suscripcions to fetch.
     */
    where?: SuscripcionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Suscripcions to fetch.
     */
    orderBy?: SuscripcionOrderByWithRelationInput | SuscripcionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Suscripcions.
     */
    cursor?: SuscripcionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Suscripcions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Suscripcions.
     */
    skip?: number
    distinct?: SuscripcionScalarFieldEnum | SuscripcionScalarFieldEnum[]
  }

  /**
   * Suscripcion create
   */
  export type SuscripcionCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Suscripcion
     */
    select?: SuscripcionSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SuscripcionInclude<ExtArgs> | null
    /**
     * The data needed to create a Suscripcion.
     */
    data: XOR<SuscripcionCreateInput, SuscripcionUncheckedCreateInput>
  }

  /**
   * Suscripcion createMany
   */
  export type SuscripcionCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Suscripcions.
     */
    data: SuscripcionCreateManyInput | SuscripcionCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Suscripcion update
   */
  export type SuscripcionUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Suscripcion
     */
    select?: SuscripcionSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SuscripcionInclude<ExtArgs> | null
    /**
     * The data needed to update a Suscripcion.
     */
    data: XOR<SuscripcionUpdateInput, SuscripcionUncheckedUpdateInput>
    /**
     * Choose, which Suscripcion to update.
     */
    where: SuscripcionWhereUniqueInput
  }

  /**
   * Suscripcion updateMany
   */
  export type SuscripcionUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Suscripcions.
     */
    data: XOR<SuscripcionUpdateManyMutationInput, SuscripcionUncheckedUpdateManyInput>
    /**
     * Filter which Suscripcions to update
     */
    where?: SuscripcionWhereInput
  }

  /**
   * Suscripcion upsert
   */
  export type SuscripcionUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Suscripcion
     */
    select?: SuscripcionSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SuscripcionInclude<ExtArgs> | null
    /**
     * The filter to search for the Suscripcion to update in case it exists.
     */
    where: SuscripcionWhereUniqueInput
    /**
     * In case the Suscripcion found by the `where` argument doesn't exist, create a new Suscripcion with this data.
     */
    create: XOR<SuscripcionCreateInput, SuscripcionUncheckedCreateInput>
    /**
     * In case the Suscripcion was found with the provided `where` argument, update it with this data.
     */
    update: XOR<SuscripcionUpdateInput, SuscripcionUncheckedUpdateInput>
  }

  /**
   * Suscripcion delete
   */
  export type SuscripcionDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Suscripcion
     */
    select?: SuscripcionSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SuscripcionInclude<ExtArgs> | null
    /**
     * Filter which Suscripcion to delete.
     */
    where: SuscripcionWhereUniqueInput
  }

  /**
   * Suscripcion deleteMany
   */
  export type SuscripcionDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Suscripcions to delete
     */
    where?: SuscripcionWhereInput
  }

  /**
   * Suscripcion.pagos
   */
  export type Suscripcion$pagosArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Pago
     */
    select?: PagoSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PagoInclude<ExtArgs> | null
    where?: PagoWhereInput
    orderBy?: PagoOrderByWithRelationInput | PagoOrderByWithRelationInput[]
    cursor?: PagoWhereUniqueInput
    take?: number
    skip?: number
    distinct?: PagoScalarFieldEnum | PagoScalarFieldEnum[]
  }

  /**
   * Suscripcion without action
   */
  export type SuscripcionDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Suscripcion
     */
    select?: SuscripcionSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SuscripcionInclude<ExtArgs> | null
  }


  /**
   * Model Pago
   */

  export type AggregatePago = {
    _count: PagoCountAggregateOutputType | null
    _avg: PagoAvgAggregateOutputType | null
    _sum: PagoSumAggregateOutputType | null
    _min: PagoMinAggregateOutputType | null
    _max: PagoMaxAggregateOutputType | null
  }

  export type PagoAvgAggregateOutputType = {
    monto: number | null
    colaboradoresFacturados: number | null
  }

  export type PagoSumAggregateOutputType = {
    monto: number | null
    colaboradoresFacturados: number | null
  }

  export type PagoMinAggregateOutputType = {
    id: string | null
    suscripcionId: string | null
    monto: number | null
    colaboradoresFacturados: number | null
    periodoInicio: Date | null
    periodoFin: Date | null
    metodo: $Enums.MetodoPago | null
    estado: $Enums.EstadoPago | null
    wompiTransaccionId: string | null
    nota: string | null
    comprobanteBase64: string | null
    registradoPor: string | null
    creadoEn: Date | null
  }

  export type PagoMaxAggregateOutputType = {
    id: string | null
    suscripcionId: string | null
    monto: number | null
    colaboradoresFacturados: number | null
    periodoInicio: Date | null
    periodoFin: Date | null
    metodo: $Enums.MetodoPago | null
    estado: $Enums.EstadoPago | null
    wompiTransaccionId: string | null
    nota: string | null
    comprobanteBase64: string | null
    registradoPor: string | null
    creadoEn: Date | null
  }

  export type PagoCountAggregateOutputType = {
    id: number
    suscripcionId: number
    monto: number
    colaboradoresFacturados: number
    periodoInicio: number
    periodoFin: number
    metodo: number
    estado: number
    wompiTransaccionId: number
    nota: number
    comprobanteBase64: number
    registradoPor: number
    creadoEn: number
    _all: number
  }


  export type PagoAvgAggregateInputType = {
    monto?: true
    colaboradoresFacturados?: true
  }

  export type PagoSumAggregateInputType = {
    monto?: true
    colaboradoresFacturados?: true
  }

  export type PagoMinAggregateInputType = {
    id?: true
    suscripcionId?: true
    monto?: true
    colaboradoresFacturados?: true
    periodoInicio?: true
    periodoFin?: true
    metodo?: true
    estado?: true
    wompiTransaccionId?: true
    nota?: true
    comprobanteBase64?: true
    registradoPor?: true
    creadoEn?: true
  }

  export type PagoMaxAggregateInputType = {
    id?: true
    suscripcionId?: true
    monto?: true
    colaboradoresFacturados?: true
    periodoInicio?: true
    periodoFin?: true
    metodo?: true
    estado?: true
    wompiTransaccionId?: true
    nota?: true
    comprobanteBase64?: true
    registradoPor?: true
    creadoEn?: true
  }

  export type PagoCountAggregateInputType = {
    id?: true
    suscripcionId?: true
    monto?: true
    colaboradoresFacturados?: true
    periodoInicio?: true
    periodoFin?: true
    metodo?: true
    estado?: true
    wompiTransaccionId?: true
    nota?: true
    comprobanteBase64?: true
    registradoPor?: true
    creadoEn?: true
    _all?: true
  }

  export type PagoAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Pago to aggregate.
     */
    where?: PagoWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Pagos to fetch.
     */
    orderBy?: PagoOrderByWithRelationInput | PagoOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: PagoWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Pagos from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Pagos.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Pagos
    **/
    _count?: true | PagoCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: PagoAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: PagoSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: PagoMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: PagoMaxAggregateInputType
  }

  export type GetPagoAggregateType<T extends PagoAggregateArgs> = {
        [P in keyof T & keyof AggregatePago]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregatePago[P]>
      : GetScalarType<T[P], AggregatePago[P]>
  }




  export type PagoGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: PagoWhereInput
    orderBy?: PagoOrderByWithAggregationInput | PagoOrderByWithAggregationInput[]
    by: PagoScalarFieldEnum[] | PagoScalarFieldEnum
    having?: PagoScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: PagoCountAggregateInputType | true
    _avg?: PagoAvgAggregateInputType
    _sum?: PagoSumAggregateInputType
    _min?: PagoMinAggregateInputType
    _max?: PagoMaxAggregateInputType
  }

  export type PagoGroupByOutputType = {
    id: string
    suscripcionId: string
    monto: number
    colaboradoresFacturados: number
    periodoInicio: Date
    periodoFin: Date
    metodo: $Enums.MetodoPago
    estado: $Enums.EstadoPago
    wompiTransaccionId: string | null
    nota: string | null
    comprobanteBase64: string | null
    registradoPor: string | null
    creadoEn: Date
    _count: PagoCountAggregateOutputType | null
    _avg: PagoAvgAggregateOutputType | null
    _sum: PagoSumAggregateOutputType | null
    _min: PagoMinAggregateOutputType | null
    _max: PagoMaxAggregateOutputType | null
  }

  type GetPagoGroupByPayload<T extends PagoGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<PagoGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof PagoGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], PagoGroupByOutputType[P]>
            : GetScalarType<T[P], PagoGroupByOutputType[P]>
        }
      >
    >


  export type PagoSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    suscripcionId?: boolean
    monto?: boolean
    colaboradoresFacturados?: boolean
    periodoInicio?: boolean
    periodoFin?: boolean
    metodo?: boolean
    estado?: boolean
    wompiTransaccionId?: boolean
    nota?: boolean
    comprobanteBase64?: boolean
    registradoPor?: boolean
    creadoEn?: boolean
    suscripcion?: boolean | SuscripcionDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["pago"]>


  export type PagoSelectScalar = {
    id?: boolean
    suscripcionId?: boolean
    monto?: boolean
    colaboradoresFacturados?: boolean
    periodoInicio?: boolean
    periodoFin?: boolean
    metodo?: boolean
    estado?: boolean
    wompiTransaccionId?: boolean
    nota?: boolean
    comprobanteBase64?: boolean
    registradoPor?: boolean
    creadoEn?: boolean
  }

  export type PagoInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    suscripcion?: boolean | SuscripcionDefaultArgs<ExtArgs>
  }

  export type $PagoPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Pago"
    objects: {
      suscripcion: Prisma.$SuscripcionPayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      suscripcionId: string
      monto: number
      colaboradoresFacturados: number
      periodoInicio: Date
      periodoFin: Date
      metodo: $Enums.MetodoPago
      estado: $Enums.EstadoPago
      wompiTransaccionId: string | null
      nota: string | null
      comprobanteBase64: string | null
      registradoPor: string | null
      creadoEn: Date
    }, ExtArgs["result"]["pago"]>
    composites: {}
  }

  type PagoGetPayload<S extends boolean | null | undefined | PagoDefaultArgs> = $Result.GetResult<Prisma.$PagoPayload, S>

  type PagoCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = 
    Omit<PagoFindManyArgs, 'select' | 'include' | 'distinct'> & {
      select?: PagoCountAggregateInputType | true
    }

  export interface PagoDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Pago'], meta: { name: 'Pago' } }
    /**
     * Find zero or one Pago that matches the filter.
     * @param {PagoFindUniqueArgs} args - Arguments to find a Pago
     * @example
     * // Get one Pago
     * const pago = await prisma.pago.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends PagoFindUniqueArgs>(args: SelectSubset<T, PagoFindUniqueArgs<ExtArgs>>): Prisma__PagoClient<$Result.GetResult<Prisma.$PagoPayload<ExtArgs>, T, "findUnique"> | null, null, ExtArgs>

    /**
     * Find one Pago that matches the filter or throw an error with `error.code='P2025'` 
     * if no matches were found.
     * @param {PagoFindUniqueOrThrowArgs} args - Arguments to find a Pago
     * @example
     * // Get one Pago
     * const pago = await prisma.pago.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends PagoFindUniqueOrThrowArgs>(args: SelectSubset<T, PagoFindUniqueOrThrowArgs<ExtArgs>>): Prisma__PagoClient<$Result.GetResult<Prisma.$PagoPayload<ExtArgs>, T, "findUniqueOrThrow">, never, ExtArgs>

    /**
     * Find the first Pago that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PagoFindFirstArgs} args - Arguments to find a Pago
     * @example
     * // Get one Pago
     * const pago = await prisma.pago.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends PagoFindFirstArgs>(args?: SelectSubset<T, PagoFindFirstArgs<ExtArgs>>): Prisma__PagoClient<$Result.GetResult<Prisma.$PagoPayload<ExtArgs>, T, "findFirst"> | null, null, ExtArgs>

    /**
     * Find the first Pago that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PagoFindFirstOrThrowArgs} args - Arguments to find a Pago
     * @example
     * // Get one Pago
     * const pago = await prisma.pago.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends PagoFindFirstOrThrowArgs>(args?: SelectSubset<T, PagoFindFirstOrThrowArgs<ExtArgs>>): Prisma__PagoClient<$Result.GetResult<Prisma.$PagoPayload<ExtArgs>, T, "findFirstOrThrow">, never, ExtArgs>

    /**
     * Find zero or more Pagos that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PagoFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Pagos
     * const pagos = await prisma.pago.findMany()
     * 
     * // Get first 10 Pagos
     * const pagos = await prisma.pago.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const pagoWithIdOnly = await prisma.pago.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends PagoFindManyArgs>(args?: SelectSubset<T, PagoFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$PagoPayload<ExtArgs>, T, "findMany">>

    /**
     * Create a Pago.
     * @param {PagoCreateArgs} args - Arguments to create a Pago.
     * @example
     * // Create one Pago
     * const Pago = await prisma.pago.create({
     *   data: {
     *     // ... data to create a Pago
     *   }
     * })
     * 
     */
    create<T extends PagoCreateArgs>(args: SelectSubset<T, PagoCreateArgs<ExtArgs>>): Prisma__PagoClient<$Result.GetResult<Prisma.$PagoPayload<ExtArgs>, T, "create">, never, ExtArgs>

    /**
     * Create many Pagos.
     * @param {PagoCreateManyArgs} args - Arguments to create many Pagos.
     * @example
     * // Create many Pagos
     * const pago = await prisma.pago.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends PagoCreateManyArgs>(args?: SelectSubset<T, PagoCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Delete a Pago.
     * @param {PagoDeleteArgs} args - Arguments to delete one Pago.
     * @example
     * // Delete one Pago
     * const Pago = await prisma.pago.delete({
     *   where: {
     *     // ... filter to delete one Pago
     *   }
     * })
     * 
     */
    delete<T extends PagoDeleteArgs>(args: SelectSubset<T, PagoDeleteArgs<ExtArgs>>): Prisma__PagoClient<$Result.GetResult<Prisma.$PagoPayload<ExtArgs>, T, "delete">, never, ExtArgs>

    /**
     * Update one Pago.
     * @param {PagoUpdateArgs} args - Arguments to update one Pago.
     * @example
     * // Update one Pago
     * const pago = await prisma.pago.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends PagoUpdateArgs>(args: SelectSubset<T, PagoUpdateArgs<ExtArgs>>): Prisma__PagoClient<$Result.GetResult<Prisma.$PagoPayload<ExtArgs>, T, "update">, never, ExtArgs>

    /**
     * Delete zero or more Pagos.
     * @param {PagoDeleteManyArgs} args - Arguments to filter Pagos to delete.
     * @example
     * // Delete a few Pagos
     * const { count } = await prisma.pago.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends PagoDeleteManyArgs>(args?: SelectSubset<T, PagoDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Pagos.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PagoUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Pagos
     * const pago = await prisma.pago.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends PagoUpdateManyArgs>(args: SelectSubset<T, PagoUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one Pago.
     * @param {PagoUpsertArgs} args - Arguments to update or create a Pago.
     * @example
     * // Update or create a Pago
     * const pago = await prisma.pago.upsert({
     *   create: {
     *     // ... data to create a Pago
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Pago we want to update
     *   }
     * })
     */
    upsert<T extends PagoUpsertArgs>(args: SelectSubset<T, PagoUpsertArgs<ExtArgs>>): Prisma__PagoClient<$Result.GetResult<Prisma.$PagoPayload<ExtArgs>, T, "upsert">, never, ExtArgs>


    /**
     * Count the number of Pagos.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PagoCountArgs} args - Arguments to filter Pagos to count.
     * @example
     * // Count the number of Pagos
     * const count = await prisma.pago.count({
     *   where: {
     *     // ... the filter for the Pagos we want to count
     *   }
     * })
    **/
    count<T extends PagoCountArgs>(
      args?: Subset<T, PagoCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], PagoCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Pago.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PagoAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends PagoAggregateArgs>(args: Subset<T, PagoAggregateArgs>): Prisma.PrismaPromise<GetPagoAggregateType<T>>

    /**
     * Group by Pago.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PagoGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends PagoGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: PagoGroupByArgs['orderBy'] }
        : { orderBy?: PagoGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, PagoGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetPagoGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Pago model
   */
  readonly fields: PagoFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Pago.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__PagoClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    suscripcion<T extends SuscripcionDefaultArgs<ExtArgs> = {}>(args?: Subset<T, SuscripcionDefaultArgs<ExtArgs>>): Prisma__SuscripcionClient<$Result.GetResult<Prisma.$SuscripcionPayload<ExtArgs>, T, "findUniqueOrThrow"> | Null, Null, ExtArgs>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the Pago model
   */ 
  interface PagoFieldRefs {
    readonly id: FieldRef<"Pago", 'String'>
    readonly suscripcionId: FieldRef<"Pago", 'String'>
    readonly monto: FieldRef<"Pago", 'Float'>
    readonly colaboradoresFacturados: FieldRef<"Pago", 'Int'>
    readonly periodoInicio: FieldRef<"Pago", 'DateTime'>
    readonly periodoFin: FieldRef<"Pago", 'DateTime'>
    readonly metodo: FieldRef<"Pago", 'MetodoPago'>
    readonly estado: FieldRef<"Pago", 'EstadoPago'>
    readonly wompiTransaccionId: FieldRef<"Pago", 'String'>
    readonly nota: FieldRef<"Pago", 'String'>
    readonly comprobanteBase64: FieldRef<"Pago", 'String'>
    readonly registradoPor: FieldRef<"Pago", 'String'>
    readonly creadoEn: FieldRef<"Pago", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * Pago findUnique
   */
  export type PagoFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Pago
     */
    select?: PagoSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PagoInclude<ExtArgs> | null
    /**
     * Filter, which Pago to fetch.
     */
    where: PagoWhereUniqueInput
  }

  /**
   * Pago findUniqueOrThrow
   */
  export type PagoFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Pago
     */
    select?: PagoSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PagoInclude<ExtArgs> | null
    /**
     * Filter, which Pago to fetch.
     */
    where: PagoWhereUniqueInput
  }

  /**
   * Pago findFirst
   */
  export type PagoFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Pago
     */
    select?: PagoSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PagoInclude<ExtArgs> | null
    /**
     * Filter, which Pago to fetch.
     */
    where?: PagoWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Pagos to fetch.
     */
    orderBy?: PagoOrderByWithRelationInput | PagoOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Pagos.
     */
    cursor?: PagoWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Pagos from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Pagos.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Pagos.
     */
    distinct?: PagoScalarFieldEnum | PagoScalarFieldEnum[]
  }

  /**
   * Pago findFirstOrThrow
   */
  export type PagoFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Pago
     */
    select?: PagoSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PagoInclude<ExtArgs> | null
    /**
     * Filter, which Pago to fetch.
     */
    where?: PagoWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Pagos to fetch.
     */
    orderBy?: PagoOrderByWithRelationInput | PagoOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Pagos.
     */
    cursor?: PagoWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Pagos from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Pagos.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Pagos.
     */
    distinct?: PagoScalarFieldEnum | PagoScalarFieldEnum[]
  }

  /**
   * Pago findMany
   */
  export type PagoFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Pago
     */
    select?: PagoSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PagoInclude<ExtArgs> | null
    /**
     * Filter, which Pagos to fetch.
     */
    where?: PagoWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Pagos to fetch.
     */
    orderBy?: PagoOrderByWithRelationInput | PagoOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Pagos.
     */
    cursor?: PagoWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Pagos from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Pagos.
     */
    skip?: number
    distinct?: PagoScalarFieldEnum | PagoScalarFieldEnum[]
  }

  /**
   * Pago create
   */
  export type PagoCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Pago
     */
    select?: PagoSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PagoInclude<ExtArgs> | null
    /**
     * The data needed to create a Pago.
     */
    data: XOR<PagoCreateInput, PagoUncheckedCreateInput>
  }

  /**
   * Pago createMany
   */
  export type PagoCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Pagos.
     */
    data: PagoCreateManyInput | PagoCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Pago update
   */
  export type PagoUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Pago
     */
    select?: PagoSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PagoInclude<ExtArgs> | null
    /**
     * The data needed to update a Pago.
     */
    data: XOR<PagoUpdateInput, PagoUncheckedUpdateInput>
    /**
     * Choose, which Pago to update.
     */
    where: PagoWhereUniqueInput
  }

  /**
   * Pago updateMany
   */
  export type PagoUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Pagos.
     */
    data: XOR<PagoUpdateManyMutationInput, PagoUncheckedUpdateManyInput>
    /**
     * Filter which Pagos to update
     */
    where?: PagoWhereInput
  }

  /**
   * Pago upsert
   */
  export type PagoUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Pago
     */
    select?: PagoSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PagoInclude<ExtArgs> | null
    /**
     * The filter to search for the Pago to update in case it exists.
     */
    where: PagoWhereUniqueInput
    /**
     * In case the Pago found by the `where` argument doesn't exist, create a new Pago with this data.
     */
    create: XOR<PagoCreateInput, PagoUncheckedCreateInput>
    /**
     * In case the Pago was found with the provided `where` argument, update it with this data.
     */
    update: XOR<PagoUpdateInput, PagoUncheckedUpdateInput>
  }

  /**
   * Pago delete
   */
  export type PagoDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Pago
     */
    select?: PagoSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PagoInclude<ExtArgs> | null
    /**
     * Filter which Pago to delete.
     */
    where: PagoWhereUniqueInput
  }

  /**
   * Pago deleteMany
   */
  export type PagoDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Pagos to delete
     */
    where?: PagoWhereInput
  }

  /**
   * Pago without action
   */
  export type PagoDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Pago
     */
    select?: PagoSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PagoInclude<ExtArgs> | null
  }


  /**
   * Model ConfiguracionPlataforma
   */

  export type AggregateConfiguracionPlataforma = {
    _count: ConfiguracionPlataformaCountAggregateOutputType | null
    _avg: ConfiguracionPlataformaAvgAggregateOutputType | null
    _sum: ConfiguracionPlataformaSumAggregateOutputType | null
    _min: ConfiguracionPlataformaMinAggregateOutputType | null
    _max: ConfiguracionPlataformaMaxAggregateOutputType | null
  }

  export type ConfiguracionPlataformaAvgAggregateOutputType = {
    id: number | null
    precioTramo1: number | null
    limiteTramo1: number | null
    precioTramo2: number | null
  }

  export type ConfiguracionPlataformaSumAggregateOutputType = {
    id: number | null
    precioTramo1: number | null
    limiteTramo1: number | null
    precioTramo2: number | null
  }

  export type ConfiguracionPlataformaMinAggregateOutputType = {
    id: number | null
    precioTramo1: number | null
    limiteTramo1: number | null
    precioTramo2: number | null
  }

  export type ConfiguracionPlataformaMaxAggregateOutputType = {
    id: number | null
    precioTramo1: number | null
    limiteTramo1: number | null
    precioTramo2: number | null
  }

  export type ConfiguracionPlataformaCountAggregateOutputType = {
    id: number
    precioTramo1: number
    limiteTramo1: number
    precioTramo2: number
    _all: number
  }


  export type ConfiguracionPlataformaAvgAggregateInputType = {
    id?: true
    precioTramo1?: true
    limiteTramo1?: true
    precioTramo2?: true
  }

  export type ConfiguracionPlataformaSumAggregateInputType = {
    id?: true
    precioTramo1?: true
    limiteTramo1?: true
    precioTramo2?: true
  }

  export type ConfiguracionPlataformaMinAggregateInputType = {
    id?: true
    precioTramo1?: true
    limiteTramo1?: true
    precioTramo2?: true
  }

  export type ConfiguracionPlataformaMaxAggregateInputType = {
    id?: true
    precioTramo1?: true
    limiteTramo1?: true
    precioTramo2?: true
  }

  export type ConfiguracionPlataformaCountAggregateInputType = {
    id?: true
    precioTramo1?: true
    limiteTramo1?: true
    precioTramo2?: true
    _all?: true
  }

  export type ConfiguracionPlataformaAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which ConfiguracionPlataforma to aggregate.
     */
    where?: ConfiguracionPlataformaWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ConfiguracionPlataformas to fetch.
     */
    orderBy?: ConfiguracionPlataformaOrderByWithRelationInput | ConfiguracionPlataformaOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: ConfiguracionPlataformaWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ConfiguracionPlataformas from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ConfiguracionPlataformas.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned ConfiguracionPlataformas
    **/
    _count?: true | ConfiguracionPlataformaCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: ConfiguracionPlataformaAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: ConfiguracionPlataformaSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: ConfiguracionPlataformaMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: ConfiguracionPlataformaMaxAggregateInputType
  }

  export type GetConfiguracionPlataformaAggregateType<T extends ConfiguracionPlataformaAggregateArgs> = {
        [P in keyof T & keyof AggregateConfiguracionPlataforma]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateConfiguracionPlataforma[P]>
      : GetScalarType<T[P], AggregateConfiguracionPlataforma[P]>
  }




  export type ConfiguracionPlataformaGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: ConfiguracionPlataformaWhereInput
    orderBy?: ConfiguracionPlataformaOrderByWithAggregationInput | ConfiguracionPlataformaOrderByWithAggregationInput[]
    by: ConfiguracionPlataformaScalarFieldEnum[] | ConfiguracionPlataformaScalarFieldEnum
    having?: ConfiguracionPlataformaScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: ConfiguracionPlataformaCountAggregateInputType | true
    _avg?: ConfiguracionPlataformaAvgAggregateInputType
    _sum?: ConfiguracionPlataformaSumAggregateInputType
    _min?: ConfiguracionPlataformaMinAggregateInputType
    _max?: ConfiguracionPlataformaMaxAggregateInputType
  }

  export type ConfiguracionPlataformaGroupByOutputType = {
    id: number
    precioTramo1: number
    limiteTramo1: number
    precioTramo2: number
    _count: ConfiguracionPlataformaCountAggregateOutputType | null
    _avg: ConfiguracionPlataformaAvgAggregateOutputType | null
    _sum: ConfiguracionPlataformaSumAggregateOutputType | null
    _min: ConfiguracionPlataformaMinAggregateOutputType | null
    _max: ConfiguracionPlataformaMaxAggregateOutputType | null
  }

  type GetConfiguracionPlataformaGroupByPayload<T extends ConfiguracionPlataformaGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<ConfiguracionPlataformaGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof ConfiguracionPlataformaGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], ConfiguracionPlataformaGroupByOutputType[P]>
            : GetScalarType<T[P], ConfiguracionPlataformaGroupByOutputType[P]>
        }
      >
    >


  export type ConfiguracionPlataformaSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    precioTramo1?: boolean
    limiteTramo1?: boolean
    precioTramo2?: boolean
  }, ExtArgs["result"]["configuracionPlataforma"]>


  export type ConfiguracionPlataformaSelectScalar = {
    id?: boolean
    precioTramo1?: boolean
    limiteTramo1?: boolean
    precioTramo2?: boolean
  }


  export type $ConfiguracionPlataformaPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "ConfiguracionPlataforma"
    objects: {}
    scalars: $Extensions.GetPayloadResult<{
      id: number
      precioTramo1: number
      limiteTramo1: number
      precioTramo2: number
    }, ExtArgs["result"]["configuracionPlataforma"]>
    composites: {}
  }

  type ConfiguracionPlataformaGetPayload<S extends boolean | null | undefined | ConfiguracionPlataformaDefaultArgs> = $Result.GetResult<Prisma.$ConfiguracionPlataformaPayload, S>

  type ConfiguracionPlataformaCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = 
    Omit<ConfiguracionPlataformaFindManyArgs, 'select' | 'include' | 'distinct'> & {
      select?: ConfiguracionPlataformaCountAggregateInputType | true
    }

  export interface ConfiguracionPlataformaDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['ConfiguracionPlataforma'], meta: { name: 'ConfiguracionPlataforma' } }
    /**
     * Find zero or one ConfiguracionPlataforma that matches the filter.
     * @param {ConfiguracionPlataformaFindUniqueArgs} args - Arguments to find a ConfiguracionPlataforma
     * @example
     * // Get one ConfiguracionPlataforma
     * const configuracionPlataforma = await prisma.configuracionPlataforma.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends ConfiguracionPlataformaFindUniqueArgs>(args: SelectSubset<T, ConfiguracionPlataformaFindUniqueArgs<ExtArgs>>): Prisma__ConfiguracionPlataformaClient<$Result.GetResult<Prisma.$ConfiguracionPlataformaPayload<ExtArgs>, T, "findUnique"> | null, null, ExtArgs>

    /**
     * Find one ConfiguracionPlataforma that matches the filter or throw an error with `error.code='P2025'` 
     * if no matches were found.
     * @param {ConfiguracionPlataformaFindUniqueOrThrowArgs} args - Arguments to find a ConfiguracionPlataforma
     * @example
     * // Get one ConfiguracionPlataforma
     * const configuracionPlataforma = await prisma.configuracionPlataforma.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends ConfiguracionPlataformaFindUniqueOrThrowArgs>(args: SelectSubset<T, ConfiguracionPlataformaFindUniqueOrThrowArgs<ExtArgs>>): Prisma__ConfiguracionPlataformaClient<$Result.GetResult<Prisma.$ConfiguracionPlataformaPayload<ExtArgs>, T, "findUniqueOrThrow">, never, ExtArgs>

    /**
     * Find the first ConfiguracionPlataforma that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ConfiguracionPlataformaFindFirstArgs} args - Arguments to find a ConfiguracionPlataforma
     * @example
     * // Get one ConfiguracionPlataforma
     * const configuracionPlataforma = await prisma.configuracionPlataforma.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends ConfiguracionPlataformaFindFirstArgs>(args?: SelectSubset<T, ConfiguracionPlataformaFindFirstArgs<ExtArgs>>): Prisma__ConfiguracionPlataformaClient<$Result.GetResult<Prisma.$ConfiguracionPlataformaPayload<ExtArgs>, T, "findFirst"> | null, null, ExtArgs>

    /**
     * Find the first ConfiguracionPlataforma that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ConfiguracionPlataformaFindFirstOrThrowArgs} args - Arguments to find a ConfiguracionPlataforma
     * @example
     * // Get one ConfiguracionPlataforma
     * const configuracionPlataforma = await prisma.configuracionPlataforma.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends ConfiguracionPlataformaFindFirstOrThrowArgs>(args?: SelectSubset<T, ConfiguracionPlataformaFindFirstOrThrowArgs<ExtArgs>>): Prisma__ConfiguracionPlataformaClient<$Result.GetResult<Prisma.$ConfiguracionPlataformaPayload<ExtArgs>, T, "findFirstOrThrow">, never, ExtArgs>

    /**
     * Find zero or more ConfiguracionPlataformas that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ConfiguracionPlataformaFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all ConfiguracionPlataformas
     * const configuracionPlataformas = await prisma.configuracionPlataforma.findMany()
     * 
     * // Get first 10 ConfiguracionPlataformas
     * const configuracionPlataformas = await prisma.configuracionPlataforma.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const configuracionPlataformaWithIdOnly = await prisma.configuracionPlataforma.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends ConfiguracionPlataformaFindManyArgs>(args?: SelectSubset<T, ConfiguracionPlataformaFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ConfiguracionPlataformaPayload<ExtArgs>, T, "findMany">>

    /**
     * Create a ConfiguracionPlataforma.
     * @param {ConfiguracionPlataformaCreateArgs} args - Arguments to create a ConfiguracionPlataforma.
     * @example
     * // Create one ConfiguracionPlataforma
     * const ConfiguracionPlataforma = await prisma.configuracionPlataforma.create({
     *   data: {
     *     // ... data to create a ConfiguracionPlataforma
     *   }
     * })
     * 
     */
    create<T extends ConfiguracionPlataformaCreateArgs>(args: SelectSubset<T, ConfiguracionPlataformaCreateArgs<ExtArgs>>): Prisma__ConfiguracionPlataformaClient<$Result.GetResult<Prisma.$ConfiguracionPlataformaPayload<ExtArgs>, T, "create">, never, ExtArgs>

    /**
     * Create many ConfiguracionPlataformas.
     * @param {ConfiguracionPlataformaCreateManyArgs} args - Arguments to create many ConfiguracionPlataformas.
     * @example
     * // Create many ConfiguracionPlataformas
     * const configuracionPlataforma = await prisma.configuracionPlataforma.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends ConfiguracionPlataformaCreateManyArgs>(args?: SelectSubset<T, ConfiguracionPlataformaCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Delete a ConfiguracionPlataforma.
     * @param {ConfiguracionPlataformaDeleteArgs} args - Arguments to delete one ConfiguracionPlataforma.
     * @example
     * // Delete one ConfiguracionPlataforma
     * const ConfiguracionPlataforma = await prisma.configuracionPlataforma.delete({
     *   where: {
     *     // ... filter to delete one ConfiguracionPlataforma
     *   }
     * })
     * 
     */
    delete<T extends ConfiguracionPlataformaDeleteArgs>(args: SelectSubset<T, ConfiguracionPlataformaDeleteArgs<ExtArgs>>): Prisma__ConfiguracionPlataformaClient<$Result.GetResult<Prisma.$ConfiguracionPlataformaPayload<ExtArgs>, T, "delete">, never, ExtArgs>

    /**
     * Update one ConfiguracionPlataforma.
     * @param {ConfiguracionPlataformaUpdateArgs} args - Arguments to update one ConfiguracionPlataforma.
     * @example
     * // Update one ConfiguracionPlataforma
     * const configuracionPlataforma = await prisma.configuracionPlataforma.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends ConfiguracionPlataformaUpdateArgs>(args: SelectSubset<T, ConfiguracionPlataformaUpdateArgs<ExtArgs>>): Prisma__ConfiguracionPlataformaClient<$Result.GetResult<Prisma.$ConfiguracionPlataformaPayload<ExtArgs>, T, "update">, never, ExtArgs>

    /**
     * Delete zero or more ConfiguracionPlataformas.
     * @param {ConfiguracionPlataformaDeleteManyArgs} args - Arguments to filter ConfiguracionPlataformas to delete.
     * @example
     * // Delete a few ConfiguracionPlataformas
     * const { count } = await prisma.configuracionPlataforma.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends ConfiguracionPlataformaDeleteManyArgs>(args?: SelectSubset<T, ConfiguracionPlataformaDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more ConfiguracionPlataformas.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ConfiguracionPlataformaUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many ConfiguracionPlataformas
     * const configuracionPlataforma = await prisma.configuracionPlataforma.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends ConfiguracionPlataformaUpdateManyArgs>(args: SelectSubset<T, ConfiguracionPlataformaUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one ConfiguracionPlataforma.
     * @param {ConfiguracionPlataformaUpsertArgs} args - Arguments to update or create a ConfiguracionPlataforma.
     * @example
     * // Update or create a ConfiguracionPlataforma
     * const configuracionPlataforma = await prisma.configuracionPlataforma.upsert({
     *   create: {
     *     // ... data to create a ConfiguracionPlataforma
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the ConfiguracionPlataforma we want to update
     *   }
     * })
     */
    upsert<T extends ConfiguracionPlataformaUpsertArgs>(args: SelectSubset<T, ConfiguracionPlataformaUpsertArgs<ExtArgs>>): Prisma__ConfiguracionPlataformaClient<$Result.GetResult<Prisma.$ConfiguracionPlataformaPayload<ExtArgs>, T, "upsert">, never, ExtArgs>


    /**
     * Count the number of ConfiguracionPlataformas.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ConfiguracionPlataformaCountArgs} args - Arguments to filter ConfiguracionPlataformas to count.
     * @example
     * // Count the number of ConfiguracionPlataformas
     * const count = await prisma.configuracionPlataforma.count({
     *   where: {
     *     // ... the filter for the ConfiguracionPlataformas we want to count
     *   }
     * })
    **/
    count<T extends ConfiguracionPlataformaCountArgs>(
      args?: Subset<T, ConfiguracionPlataformaCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], ConfiguracionPlataformaCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a ConfiguracionPlataforma.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ConfiguracionPlataformaAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends ConfiguracionPlataformaAggregateArgs>(args: Subset<T, ConfiguracionPlataformaAggregateArgs>): Prisma.PrismaPromise<GetConfiguracionPlataformaAggregateType<T>>

    /**
     * Group by ConfiguracionPlataforma.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ConfiguracionPlataformaGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends ConfiguracionPlataformaGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: ConfiguracionPlataformaGroupByArgs['orderBy'] }
        : { orderBy?: ConfiguracionPlataformaGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, ConfiguracionPlataformaGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetConfiguracionPlataformaGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the ConfiguracionPlataforma model
   */
  readonly fields: ConfiguracionPlataformaFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for ConfiguracionPlataforma.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__ConfiguracionPlataformaClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the ConfiguracionPlataforma model
   */ 
  interface ConfiguracionPlataformaFieldRefs {
    readonly id: FieldRef<"ConfiguracionPlataforma", 'Int'>
    readonly precioTramo1: FieldRef<"ConfiguracionPlataforma", 'Float'>
    readonly limiteTramo1: FieldRef<"ConfiguracionPlataforma", 'Int'>
    readonly precioTramo2: FieldRef<"ConfiguracionPlataforma", 'Float'>
  }
    

  // Custom InputTypes
  /**
   * ConfiguracionPlataforma findUnique
   */
  export type ConfiguracionPlataformaFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ConfiguracionPlataforma
     */
    select?: ConfiguracionPlataformaSelect<ExtArgs> | null
    /**
     * Filter, which ConfiguracionPlataforma to fetch.
     */
    where: ConfiguracionPlataformaWhereUniqueInput
  }

  /**
   * ConfiguracionPlataforma findUniqueOrThrow
   */
  export type ConfiguracionPlataformaFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ConfiguracionPlataforma
     */
    select?: ConfiguracionPlataformaSelect<ExtArgs> | null
    /**
     * Filter, which ConfiguracionPlataforma to fetch.
     */
    where: ConfiguracionPlataformaWhereUniqueInput
  }

  /**
   * ConfiguracionPlataforma findFirst
   */
  export type ConfiguracionPlataformaFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ConfiguracionPlataforma
     */
    select?: ConfiguracionPlataformaSelect<ExtArgs> | null
    /**
     * Filter, which ConfiguracionPlataforma to fetch.
     */
    where?: ConfiguracionPlataformaWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ConfiguracionPlataformas to fetch.
     */
    orderBy?: ConfiguracionPlataformaOrderByWithRelationInput | ConfiguracionPlataformaOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for ConfiguracionPlataformas.
     */
    cursor?: ConfiguracionPlataformaWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ConfiguracionPlataformas from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ConfiguracionPlataformas.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of ConfiguracionPlataformas.
     */
    distinct?: ConfiguracionPlataformaScalarFieldEnum | ConfiguracionPlataformaScalarFieldEnum[]
  }

  /**
   * ConfiguracionPlataforma findFirstOrThrow
   */
  export type ConfiguracionPlataformaFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ConfiguracionPlataforma
     */
    select?: ConfiguracionPlataformaSelect<ExtArgs> | null
    /**
     * Filter, which ConfiguracionPlataforma to fetch.
     */
    where?: ConfiguracionPlataformaWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ConfiguracionPlataformas to fetch.
     */
    orderBy?: ConfiguracionPlataformaOrderByWithRelationInput | ConfiguracionPlataformaOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for ConfiguracionPlataformas.
     */
    cursor?: ConfiguracionPlataformaWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ConfiguracionPlataformas from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ConfiguracionPlataformas.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of ConfiguracionPlataformas.
     */
    distinct?: ConfiguracionPlataformaScalarFieldEnum | ConfiguracionPlataformaScalarFieldEnum[]
  }

  /**
   * ConfiguracionPlataforma findMany
   */
  export type ConfiguracionPlataformaFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ConfiguracionPlataforma
     */
    select?: ConfiguracionPlataformaSelect<ExtArgs> | null
    /**
     * Filter, which ConfiguracionPlataformas to fetch.
     */
    where?: ConfiguracionPlataformaWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ConfiguracionPlataformas to fetch.
     */
    orderBy?: ConfiguracionPlataformaOrderByWithRelationInput | ConfiguracionPlataformaOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing ConfiguracionPlataformas.
     */
    cursor?: ConfiguracionPlataformaWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ConfiguracionPlataformas from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ConfiguracionPlataformas.
     */
    skip?: number
    distinct?: ConfiguracionPlataformaScalarFieldEnum | ConfiguracionPlataformaScalarFieldEnum[]
  }

  /**
   * ConfiguracionPlataforma create
   */
  export type ConfiguracionPlataformaCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ConfiguracionPlataforma
     */
    select?: ConfiguracionPlataformaSelect<ExtArgs> | null
    /**
     * The data needed to create a ConfiguracionPlataforma.
     */
    data?: XOR<ConfiguracionPlataformaCreateInput, ConfiguracionPlataformaUncheckedCreateInput>
  }

  /**
   * ConfiguracionPlataforma createMany
   */
  export type ConfiguracionPlataformaCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many ConfiguracionPlataformas.
     */
    data: ConfiguracionPlataformaCreateManyInput | ConfiguracionPlataformaCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * ConfiguracionPlataforma update
   */
  export type ConfiguracionPlataformaUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ConfiguracionPlataforma
     */
    select?: ConfiguracionPlataformaSelect<ExtArgs> | null
    /**
     * The data needed to update a ConfiguracionPlataforma.
     */
    data: XOR<ConfiguracionPlataformaUpdateInput, ConfiguracionPlataformaUncheckedUpdateInput>
    /**
     * Choose, which ConfiguracionPlataforma to update.
     */
    where: ConfiguracionPlataformaWhereUniqueInput
  }

  /**
   * ConfiguracionPlataforma updateMany
   */
  export type ConfiguracionPlataformaUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update ConfiguracionPlataformas.
     */
    data: XOR<ConfiguracionPlataformaUpdateManyMutationInput, ConfiguracionPlataformaUncheckedUpdateManyInput>
    /**
     * Filter which ConfiguracionPlataformas to update
     */
    where?: ConfiguracionPlataformaWhereInput
  }

  /**
   * ConfiguracionPlataforma upsert
   */
  export type ConfiguracionPlataformaUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ConfiguracionPlataforma
     */
    select?: ConfiguracionPlataformaSelect<ExtArgs> | null
    /**
     * The filter to search for the ConfiguracionPlataforma to update in case it exists.
     */
    where: ConfiguracionPlataformaWhereUniqueInput
    /**
     * In case the ConfiguracionPlataforma found by the `where` argument doesn't exist, create a new ConfiguracionPlataforma with this data.
     */
    create: XOR<ConfiguracionPlataformaCreateInput, ConfiguracionPlataformaUncheckedCreateInput>
    /**
     * In case the ConfiguracionPlataforma was found with the provided `where` argument, update it with this data.
     */
    update: XOR<ConfiguracionPlataformaUpdateInput, ConfiguracionPlataformaUncheckedUpdateInput>
  }

  /**
   * ConfiguracionPlataforma delete
   */
  export type ConfiguracionPlataformaDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ConfiguracionPlataforma
     */
    select?: ConfiguracionPlataformaSelect<ExtArgs> | null
    /**
     * Filter which ConfiguracionPlataforma to delete.
     */
    where: ConfiguracionPlataformaWhereUniqueInput
  }

  /**
   * ConfiguracionPlataforma deleteMany
   */
  export type ConfiguracionPlataformaDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which ConfiguracionPlataformas to delete
     */
    where?: ConfiguracionPlataformaWhereInput
  }

  /**
   * ConfiguracionPlataforma without action
   */
  export type ConfiguracionPlataformaDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ConfiguracionPlataforma
     */
    select?: ConfiguracionPlataformaSelect<ExtArgs> | null
  }


  /**
   * Model JornadaVigencia
   */

  export type AggregateJornadaVigencia = {
    _count: JornadaVigenciaCountAggregateOutputType | null
    _avg: JornadaVigenciaAvgAggregateOutputType | null
    _sum: JornadaVigenciaSumAggregateOutputType | null
    _min: JornadaVigenciaMinAggregateOutputType | null
    _max: JornadaVigenciaMaxAggregateOutputType | null
  }

  export type JornadaVigenciaAvgAggregateOutputType = {
    horasSemanales: number | null
  }

  export type JornadaVigenciaSumAggregateOutputType = {
    horasSemanales: number | null
  }

  export type JornadaVigenciaMinAggregateOutputType = {
    id: string | null
    vigenteDesde: Date | null
    horasSemanales: number | null
  }

  export type JornadaVigenciaMaxAggregateOutputType = {
    id: string | null
    vigenteDesde: Date | null
    horasSemanales: number | null
  }

  export type JornadaVigenciaCountAggregateOutputType = {
    id: number
    vigenteDesde: number
    horasSemanales: number
    _all: number
  }


  export type JornadaVigenciaAvgAggregateInputType = {
    horasSemanales?: true
  }

  export type JornadaVigenciaSumAggregateInputType = {
    horasSemanales?: true
  }

  export type JornadaVigenciaMinAggregateInputType = {
    id?: true
    vigenteDesde?: true
    horasSemanales?: true
  }

  export type JornadaVigenciaMaxAggregateInputType = {
    id?: true
    vigenteDesde?: true
    horasSemanales?: true
  }

  export type JornadaVigenciaCountAggregateInputType = {
    id?: true
    vigenteDesde?: true
    horasSemanales?: true
    _all?: true
  }

  export type JornadaVigenciaAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which JornadaVigencia to aggregate.
     */
    where?: JornadaVigenciaWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of JornadaVigencias to fetch.
     */
    orderBy?: JornadaVigenciaOrderByWithRelationInput | JornadaVigenciaOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: JornadaVigenciaWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` JornadaVigencias from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` JornadaVigencias.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned JornadaVigencias
    **/
    _count?: true | JornadaVigenciaCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: JornadaVigenciaAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: JornadaVigenciaSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: JornadaVigenciaMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: JornadaVigenciaMaxAggregateInputType
  }

  export type GetJornadaVigenciaAggregateType<T extends JornadaVigenciaAggregateArgs> = {
        [P in keyof T & keyof AggregateJornadaVigencia]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateJornadaVigencia[P]>
      : GetScalarType<T[P], AggregateJornadaVigencia[P]>
  }




  export type JornadaVigenciaGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: JornadaVigenciaWhereInput
    orderBy?: JornadaVigenciaOrderByWithAggregationInput | JornadaVigenciaOrderByWithAggregationInput[]
    by: JornadaVigenciaScalarFieldEnum[] | JornadaVigenciaScalarFieldEnum
    having?: JornadaVigenciaScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: JornadaVigenciaCountAggregateInputType | true
    _avg?: JornadaVigenciaAvgAggregateInputType
    _sum?: JornadaVigenciaSumAggregateInputType
    _min?: JornadaVigenciaMinAggregateInputType
    _max?: JornadaVigenciaMaxAggregateInputType
  }

  export type JornadaVigenciaGroupByOutputType = {
    id: string
    vigenteDesde: Date
    horasSemanales: number
    _count: JornadaVigenciaCountAggregateOutputType | null
    _avg: JornadaVigenciaAvgAggregateOutputType | null
    _sum: JornadaVigenciaSumAggregateOutputType | null
    _min: JornadaVigenciaMinAggregateOutputType | null
    _max: JornadaVigenciaMaxAggregateOutputType | null
  }

  type GetJornadaVigenciaGroupByPayload<T extends JornadaVigenciaGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<JornadaVigenciaGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof JornadaVigenciaGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], JornadaVigenciaGroupByOutputType[P]>
            : GetScalarType<T[P], JornadaVigenciaGroupByOutputType[P]>
        }
      >
    >


  export type JornadaVigenciaSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    vigenteDesde?: boolean
    horasSemanales?: boolean
  }, ExtArgs["result"]["jornadaVigencia"]>


  export type JornadaVigenciaSelectScalar = {
    id?: boolean
    vigenteDesde?: boolean
    horasSemanales?: boolean
  }


  export type $JornadaVigenciaPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "JornadaVigencia"
    objects: {}
    scalars: $Extensions.GetPayloadResult<{
      id: string
      vigenteDesde: Date
      horasSemanales: number
    }, ExtArgs["result"]["jornadaVigencia"]>
    composites: {}
  }

  type JornadaVigenciaGetPayload<S extends boolean | null | undefined | JornadaVigenciaDefaultArgs> = $Result.GetResult<Prisma.$JornadaVigenciaPayload, S>

  type JornadaVigenciaCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = 
    Omit<JornadaVigenciaFindManyArgs, 'select' | 'include' | 'distinct'> & {
      select?: JornadaVigenciaCountAggregateInputType | true
    }

  export interface JornadaVigenciaDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['JornadaVigencia'], meta: { name: 'JornadaVigencia' } }
    /**
     * Find zero or one JornadaVigencia that matches the filter.
     * @param {JornadaVigenciaFindUniqueArgs} args - Arguments to find a JornadaVigencia
     * @example
     * // Get one JornadaVigencia
     * const jornadaVigencia = await prisma.jornadaVigencia.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends JornadaVigenciaFindUniqueArgs>(args: SelectSubset<T, JornadaVigenciaFindUniqueArgs<ExtArgs>>): Prisma__JornadaVigenciaClient<$Result.GetResult<Prisma.$JornadaVigenciaPayload<ExtArgs>, T, "findUnique"> | null, null, ExtArgs>

    /**
     * Find one JornadaVigencia that matches the filter or throw an error with `error.code='P2025'` 
     * if no matches were found.
     * @param {JornadaVigenciaFindUniqueOrThrowArgs} args - Arguments to find a JornadaVigencia
     * @example
     * // Get one JornadaVigencia
     * const jornadaVigencia = await prisma.jornadaVigencia.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends JornadaVigenciaFindUniqueOrThrowArgs>(args: SelectSubset<T, JornadaVigenciaFindUniqueOrThrowArgs<ExtArgs>>): Prisma__JornadaVigenciaClient<$Result.GetResult<Prisma.$JornadaVigenciaPayload<ExtArgs>, T, "findUniqueOrThrow">, never, ExtArgs>

    /**
     * Find the first JornadaVigencia that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {JornadaVigenciaFindFirstArgs} args - Arguments to find a JornadaVigencia
     * @example
     * // Get one JornadaVigencia
     * const jornadaVigencia = await prisma.jornadaVigencia.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends JornadaVigenciaFindFirstArgs>(args?: SelectSubset<T, JornadaVigenciaFindFirstArgs<ExtArgs>>): Prisma__JornadaVigenciaClient<$Result.GetResult<Prisma.$JornadaVigenciaPayload<ExtArgs>, T, "findFirst"> | null, null, ExtArgs>

    /**
     * Find the first JornadaVigencia that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {JornadaVigenciaFindFirstOrThrowArgs} args - Arguments to find a JornadaVigencia
     * @example
     * // Get one JornadaVigencia
     * const jornadaVigencia = await prisma.jornadaVigencia.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends JornadaVigenciaFindFirstOrThrowArgs>(args?: SelectSubset<T, JornadaVigenciaFindFirstOrThrowArgs<ExtArgs>>): Prisma__JornadaVigenciaClient<$Result.GetResult<Prisma.$JornadaVigenciaPayload<ExtArgs>, T, "findFirstOrThrow">, never, ExtArgs>

    /**
     * Find zero or more JornadaVigencias that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {JornadaVigenciaFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all JornadaVigencias
     * const jornadaVigencias = await prisma.jornadaVigencia.findMany()
     * 
     * // Get first 10 JornadaVigencias
     * const jornadaVigencias = await prisma.jornadaVigencia.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const jornadaVigenciaWithIdOnly = await prisma.jornadaVigencia.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends JornadaVigenciaFindManyArgs>(args?: SelectSubset<T, JornadaVigenciaFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$JornadaVigenciaPayload<ExtArgs>, T, "findMany">>

    /**
     * Create a JornadaVigencia.
     * @param {JornadaVigenciaCreateArgs} args - Arguments to create a JornadaVigencia.
     * @example
     * // Create one JornadaVigencia
     * const JornadaVigencia = await prisma.jornadaVigencia.create({
     *   data: {
     *     // ... data to create a JornadaVigencia
     *   }
     * })
     * 
     */
    create<T extends JornadaVigenciaCreateArgs>(args: SelectSubset<T, JornadaVigenciaCreateArgs<ExtArgs>>): Prisma__JornadaVigenciaClient<$Result.GetResult<Prisma.$JornadaVigenciaPayload<ExtArgs>, T, "create">, never, ExtArgs>

    /**
     * Create many JornadaVigencias.
     * @param {JornadaVigenciaCreateManyArgs} args - Arguments to create many JornadaVigencias.
     * @example
     * // Create many JornadaVigencias
     * const jornadaVigencia = await prisma.jornadaVigencia.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends JornadaVigenciaCreateManyArgs>(args?: SelectSubset<T, JornadaVigenciaCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Delete a JornadaVigencia.
     * @param {JornadaVigenciaDeleteArgs} args - Arguments to delete one JornadaVigencia.
     * @example
     * // Delete one JornadaVigencia
     * const JornadaVigencia = await prisma.jornadaVigencia.delete({
     *   where: {
     *     // ... filter to delete one JornadaVigencia
     *   }
     * })
     * 
     */
    delete<T extends JornadaVigenciaDeleteArgs>(args: SelectSubset<T, JornadaVigenciaDeleteArgs<ExtArgs>>): Prisma__JornadaVigenciaClient<$Result.GetResult<Prisma.$JornadaVigenciaPayload<ExtArgs>, T, "delete">, never, ExtArgs>

    /**
     * Update one JornadaVigencia.
     * @param {JornadaVigenciaUpdateArgs} args - Arguments to update one JornadaVigencia.
     * @example
     * // Update one JornadaVigencia
     * const jornadaVigencia = await prisma.jornadaVigencia.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends JornadaVigenciaUpdateArgs>(args: SelectSubset<T, JornadaVigenciaUpdateArgs<ExtArgs>>): Prisma__JornadaVigenciaClient<$Result.GetResult<Prisma.$JornadaVigenciaPayload<ExtArgs>, T, "update">, never, ExtArgs>

    /**
     * Delete zero or more JornadaVigencias.
     * @param {JornadaVigenciaDeleteManyArgs} args - Arguments to filter JornadaVigencias to delete.
     * @example
     * // Delete a few JornadaVigencias
     * const { count } = await prisma.jornadaVigencia.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends JornadaVigenciaDeleteManyArgs>(args?: SelectSubset<T, JornadaVigenciaDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more JornadaVigencias.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {JornadaVigenciaUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many JornadaVigencias
     * const jornadaVigencia = await prisma.jornadaVigencia.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends JornadaVigenciaUpdateManyArgs>(args: SelectSubset<T, JornadaVigenciaUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one JornadaVigencia.
     * @param {JornadaVigenciaUpsertArgs} args - Arguments to update or create a JornadaVigencia.
     * @example
     * // Update or create a JornadaVigencia
     * const jornadaVigencia = await prisma.jornadaVigencia.upsert({
     *   create: {
     *     // ... data to create a JornadaVigencia
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the JornadaVigencia we want to update
     *   }
     * })
     */
    upsert<T extends JornadaVigenciaUpsertArgs>(args: SelectSubset<T, JornadaVigenciaUpsertArgs<ExtArgs>>): Prisma__JornadaVigenciaClient<$Result.GetResult<Prisma.$JornadaVigenciaPayload<ExtArgs>, T, "upsert">, never, ExtArgs>


    /**
     * Count the number of JornadaVigencias.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {JornadaVigenciaCountArgs} args - Arguments to filter JornadaVigencias to count.
     * @example
     * // Count the number of JornadaVigencias
     * const count = await prisma.jornadaVigencia.count({
     *   where: {
     *     // ... the filter for the JornadaVigencias we want to count
     *   }
     * })
    **/
    count<T extends JornadaVigenciaCountArgs>(
      args?: Subset<T, JornadaVigenciaCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], JornadaVigenciaCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a JornadaVigencia.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {JornadaVigenciaAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends JornadaVigenciaAggregateArgs>(args: Subset<T, JornadaVigenciaAggregateArgs>): Prisma.PrismaPromise<GetJornadaVigenciaAggregateType<T>>

    /**
     * Group by JornadaVigencia.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {JornadaVigenciaGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends JornadaVigenciaGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: JornadaVigenciaGroupByArgs['orderBy'] }
        : { orderBy?: JornadaVigenciaGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, JornadaVigenciaGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetJornadaVigenciaGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the JornadaVigencia model
   */
  readonly fields: JornadaVigenciaFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for JornadaVigencia.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__JornadaVigenciaClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the JornadaVigencia model
   */ 
  interface JornadaVigenciaFieldRefs {
    readonly id: FieldRef<"JornadaVigencia", 'String'>
    readonly vigenteDesde: FieldRef<"JornadaVigencia", 'DateTime'>
    readonly horasSemanales: FieldRef<"JornadaVigencia", 'Float'>
  }
    

  // Custom InputTypes
  /**
   * JornadaVigencia findUnique
   */
  export type JornadaVigenciaFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the JornadaVigencia
     */
    select?: JornadaVigenciaSelect<ExtArgs> | null
    /**
     * Filter, which JornadaVigencia to fetch.
     */
    where: JornadaVigenciaWhereUniqueInput
  }

  /**
   * JornadaVigencia findUniqueOrThrow
   */
  export type JornadaVigenciaFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the JornadaVigencia
     */
    select?: JornadaVigenciaSelect<ExtArgs> | null
    /**
     * Filter, which JornadaVigencia to fetch.
     */
    where: JornadaVigenciaWhereUniqueInput
  }

  /**
   * JornadaVigencia findFirst
   */
  export type JornadaVigenciaFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the JornadaVigencia
     */
    select?: JornadaVigenciaSelect<ExtArgs> | null
    /**
     * Filter, which JornadaVigencia to fetch.
     */
    where?: JornadaVigenciaWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of JornadaVigencias to fetch.
     */
    orderBy?: JornadaVigenciaOrderByWithRelationInput | JornadaVigenciaOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for JornadaVigencias.
     */
    cursor?: JornadaVigenciaWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` JornadaVigencias from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` JornadaVigencias.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of JornadaVigencias.
     */
    distinct?: JornadaVigenciaScalarFieldEnum | JornadaVigenciaScalarFieldEnum[]
  }

  /**
   * JornadaVigencia findFirstOrThrow
   */
  export type JornadaVigenciaFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the JornadaVigencia
     */
    select?: JornadaVigenciaSelect<ExtArgs> | null
    /**
     * Filter, which JornadaVigencia to fetch.
     */
    where?: JornadaVigenciaWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of JornadaVigencias to fetch.
     */
    orderBy?: JornadaVigenciaOrderByWithRelationInput | JornadaVigenciaOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for JornadaVigencias.
     */
    cursor?: JornadaVigenciaWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` JornadaVigencias from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` JornadaVigencias.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of JornadaVigencias.
     */
    distinct?: JornadaVigenciaScalarFieldEnum | JornadaVigenciaScalarFieldEnum[]
  }

  /**
   * JornadaVigencia findMany
   */
  export type JornadaVigenciaFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the JornadaVigencia
     */
    select?: JornadaVigenciaSelect<ExtArgs> | null
    /**
     * Filter, which JornadaVigencias to fetch.
     */
    where?: JornadaVigenciaWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of JornadaVigencias to fetch.
     */
    orderBy?: JornadaVigenciaOrderByWithRelationInput | JornadaVigenciaOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing JornadaVigencias.
     */
    cursor?: JornadaVigenciaWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` JornadaVigencias from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` JornadaVigencias.
     */
    skip?: number
    distinct?: JornadaVigenciaScalarFieldEnum | JornadaVigenciaScalarFieldEnum[]
  }

  /**
   * JornadaVigencia create
   */
  export type JornadaVigenciaCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the JornadaVigencia
     */
    select?: JornadaVigenciaSelect<ExtArgs> | null
    /**
     * The data needed to create a JornadaVigencia.
     */
    data: XOR<JornadaVigenciaCreateInput, JornadaVigenciaUncheckedCreateInput>
  }

  /**
   * JornadaVigencia createMany
   */
  export type JornadaVigenciaCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many JornadaVigencias.
     */
    data: JornadaVigenciaCreateManyInput | JornadaVigenciaCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * JornadaVigencia update
   */
  export type JornadaVigenciaUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the JornadaVigencia
     */
    select?: JornadaVigenciaSelect<ExtArgs> | null
    /**
     * The data needed to update a JornadaVigencia.
     */
    data: XOR<JornadaVigenciaUpdateInput, JornadaVigenciaUncheckedUpdateInput>
    /**
     * Choose, which JornadaVigencia to update.
     */
    where: JornadaVigenciaWhereUniqueInput
  }

  /**
   * JornadaVigencia updateMany
   */
  export type JornadaVigenciaUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update JornadaVigencias.
     */
    data: XOR<JornadaVigenciaUpdateManyMutationInput, JornadaVigenciaUncheckedUpdateManyInput>
    /**
     * Filter which JornadaVigencias to update
     */
    where?: JornadaVigenciaWhereInput
  }

  /**
   * JornadaVigencia upsert
   */
  export type JornadaVigenciaUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the JornadaVigencia
     */
    select?: JornadaVigenciaSelect<ExtArgs> | null
    /**
     * The filter to search for the JornadaVigencia to update in case it exists.
     */
    where: JornadaVigenciaWhereUniqueInput
    /**
     * In case the JornadaVigencia found by the `where` argument doesn't exist, create a new JornadaVigencia with this data.
     */
    create: XOR<JornadaVigenciaCreateInput, JornadaVigenciaUncheckedCreateInput>
    /**
     * In case the JornadaVigencia was found with the provided `where` argument, update it with this data.
     */
    update: XOR<JornadaVigenciaUpdateInput, JornadaVigenciaUncheckedUpdateInput>
  }

  /**
   * JornadaVigencia delete
   */
  export type JornadaVigenciaDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the JornadaVigencia
     */
    select?: JornadaVigenciaSelect<ExtArgs> | null
    /**
     * Filter which JornadaVigencia to delete.
     */
    where: JornadaVigenciaWhereUniqueInput
  }

  /**
   * JornadaVigencia deleteMany
   */
  export type JornadaVigenciaDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which JornadaVigencias to delete
     */
    where?: JornadaVigenciaWhereInput
  }

  /**
   * JornadaVigencia without action
   */
  export type JornadaVigenciaDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the JornadaVigencia
     */
    select?: JornadaVigenciaSelect<ExtArgs> | null
  }


  /**
   * Model TipoHora
   */

  export type AggregateTipoHora = {
    _count: TipoHoraCountAggregateOutputType | null
    _avg: TipoHoraAvgAggregateOutputType | null
    _sum: TipoHoraSumAggregateOutputType | null
    _min: TipoHoraMinAggregateOutputType | null
    _max: TipoHoraMaxAggregateOutputType | null
  }

  export type TipoHoraAvgAggregateOutputType = {
    horaInicio: number | null
    horaFin: number | null
    recargo: number | null
  }

  export type TipoHoraSumAggregateOutputType = {
    horaInicio: number | null
    horaFin: number | null
    recargo: number | null
  }

  export type TipoHoraMinAggregateOutputType = {
    id: string | null
    nombre: string | null
    codigo: string | null
    horaInicio: number | null
    horaFin: number | null
    recargo: number | null
    vigenteDesde: Date | null
    vigenteHasta: Date | null
    activo: boolean | null
  }

  export type TipoHoraMaxAggregateOutputType = {
    id: string | null
    nombre: string | null
    codigo: string | null
    horaInicio: number | null
    horaFin: number | null
    recargo: number | null
    vigenteDesde: Date | null
    vigenteHasta: Date | null
    activo: boolean | null
  }

  export type TipoHoraCountAggregateOutputType = {
    id: number
    nombre: number
    codigo: number
    horaInicio: number
    horaFin: number
    recargo: number
    aplica: number
    vigenteDesde: number
    vigenteHasta: number
    activo: number
    _all: number
  }


  export type TipoHoraAvgAggregateInputType = {
    horaInicio?: true
    horaFin?: true
    recargo?: true
  }

  export type TipoHoraSumAggregateInputType = {
    horaInicio?: true
    horaFin?: true
    recargo?: true
  }

  export type TipoHoraMinAggregateInputType = {
    id?: true
    nombre?: true
    codigo?: true
    horaInicio?: true
    horaFin?: true
    recargo?: true
    vigenteDesde?: true
    vigenteHasta?: true
    activo?: true
  }

  export type TipoHoraMaxAggregateInputType = {
    id?: true
    nombre?: true
    codigo?: true
    horaInicio?: true
    horaFin?: true
    recargo?: true
    vigenteDesde?: true
    vigenteHasta?: true
    activo?: true
  }

  export type TipoHoraCountAggregateInputType = {
    id?: true
    nombre?: true
    codigo?: true
    horaInicio?: true
    horaFin?: true
    recargo?: true
    aplica?: true
    vigenteDesde?: true
    vigenteHasta?: true
    activo?: true
    _all?: true
  }

  export type TipoHoraAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which TipoHora to aggregate.
     */
    where?: TipoHoraWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of TipoHoras to fetch.
     */
    orderBy?: TipoHoraOrderByWithRelationInput | TipoHoraOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: TipoHoraWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` TipoHoras from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` TipoHoras.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned TipoHoras
    **/
    _count?: true | TipoHoraCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: TipoHoraAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: TipoHoraSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: TipoHoraMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: TipoHoraMaxAggregateInputType
  }

  export type GetTipoHoraAggregateType<T extends TipoHoraAggregateArgs> = {
        [P in keyof T & keyof AggregateTipoHora]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateTipoHora[P]>
      : GetScalarType<T[P], AggregateTipoHora[P]>
  }




  export type TipoHoraGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: TipoHoraWhereInput
    orderBy?: TipoHoraOrderByWithAggregationInput | TipoHoraOrderByWithAggregationInput[]
    by: TipoHoraScalarFieldEnum[] | TipoHoraScalarFieldEnum
    having?: TipoHoraScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: TipoHoraCountAggregateInputType | true
    _avg?: TipoHoraAvgAggregateInputType
    _sum?: TipoHoraSumAggregateInputType
    _min?: TipoHoraMinAggregateInputType
    _max?: TipoHoraMaxAggregateInputType
  }

  export type TipoHoraGroupByOutputType = {
    id: string
    nombre: string
    codigo: string
    horaInicio: number
    horaFin: number
    recargo: number
    aplica: JsonValue
    vigenteDesde: Date
    vigenteHasta: Date | null
    activo: boolean
    _count: TipoHoraCountAggregateOutputType | null
    _avg: TipoHoraAvgAggregateOutputType | null
    _sum: TipoHoraSumAggregateOutputType | null
    _min: TipoHoraMinAggregateOutputType | null
    _max: TipoHoraMaxAggregateOutputType | null
  }

  type GetTipoHoraGroupByPayload<T extends TipoHoraGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<TipoHoraGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof TipoHoraGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], TipoHoraGroupByOutputType[P]>
            : GetScalarType<T[P], TipoHoraGroupByOutputType[P]>
        }
      >
    >


  export type TipoHoraSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    nombre?: boolean
    codigo?: boolean
    horaInicio?: boolean
    horaFin?: boolean
    recargo?: boolean
    aplica?: boolean
    vigenteDesde?: boolean
    vigenteHasta?: boolean
    activo?: boolean
  }, ExtArgs["result"]["tipoHora"]>


  export type TipoHoraSelectScalar = {
    id?: boolean
    nombre?: boolean
    codigo?: boolean
    horaInicio?: boolean
    horaFin?: boolean
    recargo?: boolean
    aplica?: boolean
    vigenteDesde?: boolean
    vigenteHasta?: boolean
    activo?: boolean
  }


  export type $TipoHoraPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "TipoHora"
    objects: {}
    scalars: $Extensions.GetPayloadResult<{
      id: string
      nombre: string
      codigo: string
      horaInicio: number
      horaFin: number
      recargo: number
      aplica: Prisma.JsonValue
      vigenteDesde: Date
      vigenteHasta: Date | null
      activo: boolean
    }, ExtArgs["result"]["tipoHora"]>
    composites: {}
  }

  type TipoHoraGetPayload<S extends boolean | null | undefined | TipoHoraDefaultArgs> = $Result.GetResult<Prisma.$TipoHoraPayload, S>

  type TipoHoraCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = 
    Omit<TipoHoraFindManyArgs, 'select' | 'include' | 'distinct'> & {
      select?: TipoHoraCountAggregateInputType | true
    }

  export interface TipoHoraDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['TipoHora'], meta: { name: 'TipoHora' } }
    /**
     * Find zero or one TipoHora that matches the filter.
     * @param {TipoHoraFindUniqueArgs} args - Arguments to find a TipoHora
     * @example
     * // Get one TipoHora
     * const tipoHora = await prisma.tipoHora.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends TipoHoraFindUniqueArgs>(args: SelectSubset<T, TipoHoraFindUniqueArgs<ExtArgs>>): Prisma__TipoHoraClient<$Result.GetResult<Prisma.$TipoHoraPayload<ExtArgs>, T, "findUnique"> | null, null, ExtArgs>

    /**
     * Find one TipoHora that matches the filter or throw an error with `error.code='P2025'` 
     * if no matches were found.
     * @param {TipoHoraFindUniqueOrThrowArgs} args - Arguments to find a TipoHora
     * @example
     * // Get one TipoHora
     * const tipoHora = await prisma.tipoHora.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends TipoHoraFindUniqueOrThrowArgs>(args: SelectSubset<T, TipoHoraFindUniqueOrThrowArgs<ExtArgs>>): Prisma__TipoHoraClient<$Result.GetResult<Prisma.$TipoHoraPayload<ExtArgs>, T, "findUniqueOrThrow">, never, ExtArgs>

    /**
     * Find the first TipoHora that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TipoHoraFindFirstArgs} args - Arguments to find a TipoHora
     * @example
     * // Get one TipoHora
     * const tipoHora = await prisma.tipoHora.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends TipoHoraFindFirstArgs>(args?: SelectSubset<T, TipoHoraFindFirstArgs<ExtArgs>>): Prisma__TipoHoraClient<$Result.GetResult<Prisma.$TipoHoraPayload<ExtArgs>, T, "findFirst"> | null, null, ExtArgs>

    /**
     * Find the first TipoHora that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TipoHoraFindFirstOrThrowArgs} args - Arguments to find a TipoHora
     * @example
     * // Get one TipoHora
     * const tipoHora = await prisma.tipoHora.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends TipoHoraFindFirstOrThrowArgs>(args?: SelectSubset<T, TipoHoraFindFirstOrThrowArgs<ExtArgs>>): Prisma__TipoHoraClient<$Result.GetResult<Prisma.$TipoHoraPayload<ExtArgs>, T, "findFirstOrThrow">, never, ExtArgs>

    /**
     * Find zero or more TipoHoras that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TipoHoraFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all TipoHoras
     * const tipoHoras = await prisma.tipoHora.findMany()
     * 
     * // Get first 10 TipoHoras
     * const tipoHoras = await prisma.tipoHora.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const tipoHoraWithIdOnly = await prisma.tipoHora.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends TipoHoraFindManyArgs>(args?: SelectSubset<T, TipoHoraFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$TipoHoraPayload<ExtArgs>, T, "findMany">>

    /**
     * Create a TipoHora.
     * @param {TipoHoraCreateArgs} args - Arguments to create a TipoHora.
     * @example
     * // Create one TipoHora
     * const TipoHora = await prisma.tipoHora.create({
     *   data: {
     *     // ... data to create a TipoHora
     *   }
     * })
     * 
     */
    create<T extends TipoHoraCreateArgs>(args: SelectSubset<T, TipoHoraCreateArgs<ExtArgs>>): Prisma__TipoHoraClient<$Result.GetResult<Prisma.$TipoHoraPayload<ExtArgs>, T, "create">, never, ExtArgs>

    /**
     * Create many TipoHoras.
     * @param {TipoHoraCreateManyArgs} args - Arguments to create many TipoHoras.
     * @example
     * // Create many TipoHoras
     * const tipoHora = await prisma.tipoHora.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends TipoHoraCreateManyArgs>(args?: SelectSubset<T, TipoHoraCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Delete a TipoHora.
     * @param {TipoHoraDeleteArgs} args - Arguments to delete one TipoHora.
     * @example
     * // Delete one TipoHora
     * const TipoHora = await prisma.tipoHora.delete({
     *   where: {
     *     // ... filter to delete one TipoHora
     *   }
     * })
     * 
     */
    delete<T extends TipoHoraDeleteArgs>(args: SelectSubset<T, TipoHoraDeleteArgs<ExtArgs>>): Prisma__TipoHoraClient<$Result.GetResult<Prisma.$TipoHoraPayload<ExtArgs>, T, "delete">, never, ExtArgs>

    /**
     * Update one TipoHora.
     * @param {TipoHoraUpdateArgs} args - Arguments to update one TipoHora.
     * @example
     * // Update one TipoHora
     * const tipoHora = await prisma.tipoHora.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends TipoHoraUpdateArgs>(args: SelectSubset<T, TipoHoraUpdateArgs<ExtArgs>>): Prisma__TipoHoraClient<$Result.GetResult<Prisma.$TipoHoraPayload<ExtArgs>, T, "update">, never, ExtArgs>

    /**
     * Delete zero or more TipoHoras.
     * @param {TipoHoraDeleteManyArgs} args - Arguments to filter TipoHoras to delete.
     * @example
     * // Delete a few TipoHoras
     * const { count } = await prisma.tipoHora.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends TipoHoraDeleteManyArgs>(args?: SelectSubset<T, TipoHoraDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more TipoHoras.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TipoHoraUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many TipoHoras
     * const tipoHora = await prisma.tipoHora.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends TipoHoraUpdateManyArgs>(args: SelectSubset<T, TipoHoraUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one TipoHora.
     * @param {TipoHoraUpsertArgs} args - Arguments to update or create a TipoHora.
     * @example
     * // Update or create a TipoHora
     * const tipoHora = await prisma.tipoHora.upsert({
     *   create: {
     *     // ... data to create a TipoHora
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the TipoHora we want to update
     *   }
     * })
     */
    upsert<T extends TipoHoraUpsertArgs>(args: SelectSubset<T, TipoHoraUpsertArgs<ExtArgs>>): Prisma__TipoHoraClient<$Result.GetResult<Prisma.$TipoHoraPayload<ExtArgs>, T, "upsert">, never, ExtArgs>


    /**
     * Count the number of TipoHoras.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TipoHoraCountArgs} args - Arguments to filter TipoHoras to count.
     * @example
     * // Count the number of TipoHoras
     * const count = await prisma.tipoHora.count({
     *   where: {
     *     // ... the filter for the TipoHoras we want to count
     *   }
     * })
    **/
    count<T extends TipoHoraCountArgs>(
      args?: Subset<T, TipoHoraCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], TipoHoraCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a TipoHora.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TipoHoraAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends TipoHoraAggregateArgs>(args: Subset<T, TipoHoraAggregateArgs>): Prisma.PrismaPromise<GetTipoHoraAggregateType<T>>

    /**
     * Group by TipoHora.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TipoHoraGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends TipoHoraGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: TipoHoraGroupByArgs['orderBy'] }
        : { orderBy?: TipoHoraGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, TipoHoraGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetTipoHoraGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the TipoHora model
   */
  readonly fields: TipoHoraFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for TipoHora.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__TipoHoraClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the TipoHora model
   */ 
  interface TipoHoraFieldRefs {
    readonly id: FieldRef<"TipoHora", 'String'>
    readonly nombre: FieldRef<"TipoHora", 'String'>
    readonly codigo: FieldRef<"TipoHora", 'String'>
    readonly horaInicio: FieldRef<"TipoHora", 'Int'>
    readonly horaFin: FieldRef<"TipoHora", 'Int'>
    readonly recargo: FieldRef<"TipoHora", 'Float'>
    readonly aplica: FieldRef<"TipoHora", 'Json'>
    readonly vigenteDesde: FieldRef<"TipoHora", 'DateTime'>
    readonly vigenteHasta: FieldRef<"TipoHora", 'DateTime'>
    readonly activo: FieldRef<"TipoHora", 'Boolean'>
  }
    

  // Custom InputTypes
  /**
   * TipoHora findUnique
   */
  export type TipoHoraFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TipoHora
     */
    select?: TipoHoraSelect<ExtArgs> | null
    /**
     * Filter, which TipoHora to fetch.
     */
    where: TipoHoraWhereUniqueInput
  }

  /**
   * TipoHora findUniqueOrThrow
   */
  export type TipoHoraFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TipoHora
     */
    select?: TipoHoraSelect<ExtArgs> | null
    /**
     * Filter, which TipoHora to fetch.
     */
    where: TipoHoraWhereUniqueInput
  }

  /**
   * TipoHora findFirst
   */
  export type TipoHoraFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TipoHora
     */
    select?: TipoHoraSelect<ExtArgs> | null
    /**
     * Filter, which TipoHora to fetch.
     */
    where?: TipoHoraWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of TipoHoras to fetch.
     */
    orderBy?: TipoHoraOrderByWithRelationInput | TipoHoraOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for TipoHoras.
     */
    cursor?: TipoHoraWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` TipoHoras from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` TipoHoras.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of TipoHoras.
     */
    distinct?: TipoHoraScalarFieldEnum | TipoHoraScalarFieldEnum[]
  }

  /**
   * TipoHora findFirstOrThrow
   */
  export type TipoHoraFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TipoHora
     */
    select?: TipoHoraSelect<ExtArgs> | null
    /**
     * Filter, which TipoHora to fetch.
     */
    where?: TipoHoraWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of TipoHoras to fetch.
     */
    orderBy?: TipoHoraOrderByWithRelationInput | TipoHoraOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for TipoHoras.
     */
    cursor?: TipoHoraWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` TipoHoras from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` TipoHoras.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of TipoHoras.
     */
    distinct?: TipoHoraScalarFieldEnum | TipoHoraScalarFieldEnum[]
  }

  /**
   * TipoHora findMany
   */
  export type TipoHoraFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TipoHora
     */
    select?: TipoHoraSelect<ExtArgs> | null
    /**
     * Filter, which TipoHoras to fetch.
     */
    where?: TipoHoraWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of TipoHoras to fetch.
     */
    orderBy?: TipoHoraOrderByWithRelationInput | TipoHoraOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing TipoHoras.
     */
    cursor?: TipoHoraWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` TipoHoras from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` TipoHoras.
     */
    skip?: number
    distinct?: TipoHoraScalarFieldEnum | TipoHoraScalarFieldEnum[]
  }

  /**
   * TipoHora create
   */
  export type TipoHoraCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TipoHora
     */
    select?: TipoHoraSelect<ExtArgs> | null
    /**
     * The data needed to create a TipoHora.
     */
    data: XOR<TipoHoraCreateInput, TipoHoraUncheckedCreateInput>
  }

  /**
   * TipoHora createMany
   */
  export type TipoHoraCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many TipoHoras.
     */
    data: TipoHoraCreateManyInput | TipoHoraCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * TipoHora update
   */
  export type TipoHoraUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TipoHora
     */
    select?: TipoHoraSelect<ExtArgs> | null
    /**
     * The data needed to update a TipoHora.
     */
    data: XOR<TipoHoraUpdateInput, TipoHoraUncheckedUpdateInput>
    /**
     * Choose, which TipoHora to update.
     */
    where: TipoHoraWhereUniqueInput
  }

  /**
   * TipoHora updateMany
   */
  export type TipoHoraUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update TipoHoras.
     */
    data: XOR<TipoHoraUpdateManyMutationInput, TipoHoraUncheckedUpdateManyInput>
    /**
     * Filter which TipoHoras to update
     */
    where?: TipoHoraWhereInput
  }

  /**
   * TipoHora upsert
   */
  export type TipoHoraUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TipoHora
     */
    select?: TipoHoraSelect<ExtArgs> | null
    /**
     * The filter to search for the TipoHora to update in case it exists.
     */
    where: TipoHoraWhereUniqueInput
    /**
     * In case the TipoHora found by the `where` argument doesn't exist, create a new TipoHora with this data.
     */
    create: XOR<TipoHoraCreateInput, TipoHoraUncheckedCreateInput>
    /**
     * In case the TipoHora was found with the provided `where` argument, update it with this data.
     */
    update: XOR<TipoHoraUpdateInput, TipoHoraUncheckedUpdateInput>
  }

  /**
   * TipoHora delete
   */
  export type TipoHoraDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TipoHora
     */
    select?: TipoHoraSelect<ExtArgs> | null
    /**
     * Filter which TipoHora to delete.
     */
    where: TipoHoraWhereUniqueInput
  }

  /**
   * TipoHora deleteMany
   */
  export type TipoHoraDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which TipoHoras to delete
     */
    where?: TipoHoraWhereInput
  }

  /**
   * TipoHora without action
   */
  export type TipoHoraDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TipoHora
     */
    select?: TipoHoraSelect<ExtArgs> | null
  }


  /**
   * Model Horario
   */

  export type AggregateHorario = {
    _count: HorarioCountAggregateOutputType | null
    _avg: HorarioAvgAggregateOutputType | null
    _sum: HorarioSumAggregateOutputType | null
    _min: HorarioMinAggregateOutputType | null
    _max: HorarioMaxAggregateOutputType | null
  }

  export type HorarioAvgAggregateOutputType = {
    toleranciaMin: number | null
  }

  export type HorarioSumAggregateOutputType = {
    toleranciaMin: number | null
  }

  export type HorarioMinAggregateOutputType = {
    id: string | null
    empresaId: string | null
    nombre: string | null
    toleranciaMin: number | null
    activo: boolean | null
    creadoEn: Date | null
  }

  export type HorarioMaxAggregateOutputType = {
    id: string | null
    empresaId: string | null
    nombre: string | null
    toleranciaMin: number | null
    activo: boolean | null
    creadoEn: Date | null
  }

  export type HorarioCountAggregateOutputType = {
    id: number
    empresaId: number
    nombre: number
    toleranciaMin: number
    activo: number
    creadoEn: number
    _all: number
  }


  export type HorarioAvgAggregateInputType = {
    toleranciaMin?: true
  }

  export type HorarioSumAggregateInputType = {
    toleranciaMin?: true
  }

  export type HorarioMinAggregateInputType = {
    id?: true
    empresaId?: true
    nombre?: true
    toleranciaMin?: true
    activo?: true
    creadoEn?: true
  }

  export type HorarioMaxAggregateInputType = {
    id?: true
    empresaId?: true
    nombre?: true
    toleranciaMin?: true
    activo?: true
    creadoEn?: true
  }

  export type HorarioCountAggregateInputType = {
    id?: true
    empresaId?: true
    nombre?: true
    toleranciaMin?: true
    activo?: true
    creadoEn?: true
    _all?: true
  }

  export type HorarioAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Horario to aggregate.
     */
    where?: HorarioWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Horarios to fetch.
     */
    orderBy?: HorarioOrderByWithRelationInput | HorarioOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: HorarioWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Horarios from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Horarios.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Horarios
    **/
    _count?: true | HorarioCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: HorarioAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: HorarioSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: HorarioMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: HorarioMaxAggregateInputType
  }

  export type GetHorarioAggregateType<T extends HorarioAggregateArgs> = {
        [P in keyof T & keyof AggregateHorario]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateHorario[P]>
      : GetScalarType<T[P], AggregateHorario[P]>
  }




  export type HorarioGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: HorarioWhereInput
    orderBy?: HorarioOrderByWithAggregationInput | HorarioOrderByWithAggregationInput[]
    by: HorarioScalarFieldEnum[] | HorarioScalarFieldEnum
    having?: HorarioScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: HorarioCountAggregateInputType | true
    _avg?: HorarioAvgAggregateInputType
    _sum?: HorarioSumAggregateInputType
    _min?: HorarioMinAggregateInputType
    _max?: HorarioMaxAggregateInputType
  }

  export type HorarioGroupByOutputType = {
    id: string
    empresaId: string
    nombre: string
    toleranciaMin: number
    activo: boolean
    creadoEn: Date
    _count: HorarioCountAggregateOutputType | null
    _avg: HorarioAvgAggregateOutputType | null
    _sum: HorarioSumAggregateOutputType | null
    _min: HorarioMinAggregateOutputType | null
    _max: HorarioMaxAggregateOutputType | null
  }

  type GetHorarioGroupByPayload<T extends HorarioGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<HorarioGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof HorarioGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], HorarioGroupByOutputType[P]>
            : GetScalarType<T[P], HorarioGroupByOutputType[P]>
        }
      >
    >


  export type HorarioSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    empresaId?: boolean
    nombre?: boolean
    toleranciaMin?: boolean
    activo?: boolean
    creadoEn?: boolean
    empresa?: boolean | EmpresaDefaultArgs<ExtArgs>
    franjas?: boolean | Horario$franjasArgs<ExtArgs>
    colaboradores?: boolean | Horario$colaboradoresArgs<ExtArgs>
    _count?: boolean | HorarioCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["horario"]>


  export type HorarioSelectScalar = {
    id?: boolean
    empresaId?: boolean
    nombre?: boolean
    toleranciaMin?: boolean
    activo?: boolean
    creadoEn?: boolean
  }

  export type HorarioInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    empresa?: boolean | EmpresaDefaultArgs<ExtArgs>
    franjas?: boolean | Horario$franjasArgs<ExtArgs>
    colaboradores?: boolean | Horario$colaboradoresArgs<ExtArgs>
    _count?: boolean | HorarioCountOutputTypeDefaultArgs<ExtArgs>
  }

  export type $HorarioPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Horario"
    objects: {
      empresa: Prisma.$EmpresaPayload<ExtArgs>
      franjas: Prisma.$FranjaHorarioPayload<ExtArgs>[]
      colaboradores: Prisma.$ColaboradorPayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      empresaId: string
      nombre: string
      toleranciaMin: number
      activo: boolean
      creadoEn: Date
    }, ExtArgs["result"]["horario"]>
    composites: {}
  }

  type HorarioGetPayload<S extends boolean | null | undefined | HorarioDefaultArgs> = $Result.GetResult<Prisma.$HorarioPayload, S>

  type HorarioCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = 
    Omit<HorarioFindManyArgs, 'select' | 'include' | 'distinct'> & {
      select?: HorarioCountAggregateInputType | true
    }

  export interface HorarioDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Horario'], meta: { name: 'Horario' } }
    /**
     * Find zero or one Horario that matches the filter.
     * @param {HorarioFindUniqueArgs} args - Arguments to find a Horario
     * @example
     * // Get one Horario
     * const horario = await prisma.horario.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends HorarioFindUniqueArgs>(args: SelectSubset<T, HorarioFindUniqueArgs<ExtArgs>>): Prisma__HorarioClient<$Result.GetResult<Prisma.$HorarioPayload<ExtArgs>, T, "findUnique"> | null, null, ExtArgs>

    /**
     * Find one Horario that matches the filter or throw an error with `error.code='P2025'` 
     * if no matches were found.
     * @param {HorarioFindUniqueOrThrowArgs} args - Arguments to find a Horario
     * @example
     * // Get one Horario
     * const horario = await prisma.horario.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends HorarioFindUniqueOrThrowArgs>(args: SelectSubset<T, HorarioFindUniqueOrThrowArgs<ExtArgs>>): Prisma__HorarioClient<$Result.GetResult<Prisma.$HorarioPayload<ExtArgs>, T, "findUniqueOrThrow">, never, ExtArgs>

    /**
     * Find the first Horario that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {HorarioFindFirstArgs} args - Arguments to find a Horario
     * @example
     * // Get one Horario
     * const horario = await prisma.horario.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends HorarioFindFirstArgs>(args?: SelectSubset<T, HorarioFindFirstArgs<ExtArgs>>): Prisma__HorarioClient<$Result.GetResult<Prisma.$HorarioPayload<ExtArgs>, T, "findFirst"> | null, null, ExtArgs>

    /**
     * Find the first Horario that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {HorarioFindFirstOrThrowArgs} args - Arguments to find a Horario
     * @example
     * // Get one Horario
     * const horario = await prisma.horario.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends HorarioFindFirstOrThrowArgs>(args?: SelectSubset<T, HorarioFindFirstOrThrowArgs<ExtArgs>>): Prisma__HorarioClient<$Result.GetResult<Prisma.$HorarioPayload<ExtArgs>, T, "findFirstOrThrow">, never, ExtArgs>

    /**
     * Find zero or more Horarios that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {HorarioFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Horarios
     * const horarios = await prisma.horario.findMany()
     * 
     * // Get first 10 Horarios
     * const horarios = await prisma.horario.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const horarioWithIdOnly = await prisma.horario.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends HorarioFindManyArgs>(args?: SelectSubset<T, HorarioFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$HorarioPayload<ExtArgs>, T, "findMany">>

    /**
     * Create a Horario.
     * @param {HorarioCreateArgs} args - Arguments to create a Horario.
     * @example
     * // Create one Horario
     * const Horario = await prisma.horario.create({
     *   data: {
     *     // ... data to create a Horario
     *   }
     * })
     * 
     */
    create<T extends HorarioCreateArgs>(args: SelectSubset<T, HorarioCreateArgs<ExtArgs>>): Prisma__HorarioClient<$Result.GetResult<Prisma.$HorarioPayload<ExtArgs>, T, "create">, never, ExtArgs>

    /**
     * Create many Horarios.
     * @param {HorarioCreateManyArgs} args - Arguments to create many Horarios.
     * @example
     * // Create many Horarios
     * const horario = await prisma.horario.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends HorarioCreateManyArgs>(args?: SelectSubset<T, HorarioCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Delete a Horario.
     * @param {HorarioDeleteArgs} args - Arguments to delete one Horario.
     * @example
     * // Delete one Horario
     * const Horario = await prisma.horario.delete({
     *   where: {
     *     // ... filter to delete one Horario
     *   }
     * })
     * 
     */
    delete<T extends HorarioDeleteArgs>(args: SelectSubset<T, HorarioDeleteArgs<ExtArgs>>): Prisma__HorarioClient<$Result.GetResult<Prisma.$HorarioPayload<ExtArgs>, T, "delete">, never, ExtArgs>

    /**
     * Update one Horario.
     * @param {HorarioUpdateArgs} args - Arguments to update one Horario.
     * @example
     * // Update one Horario
     * const horario = await prisma.horario.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends HorarioUpdateArgs>(args: SelectSubset<T, HorarioUpdateArgs<ExtArgs>>): Prisma__HorarioClient<$Result.GetResult<Prisma.$HorarioPayload<ExtArgs>, T, "update">, never, ExtArgs>

    /**
     * Delete zero or more Horarios.
     * @param {HorarioDeleteManyArgs} args - Arguments to filter Horarios to delete.
     * @example
     * // Delete a few Horarios
     * const { count } = await prisma.horario.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends HorarioDeleteManyArgs>(args?: SelectSubset<T, HorarioDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Horarios.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {HorarioUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Horarios
     * const horario = await prisma.horario.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends HorarioUpdateManyArgs>(args: SelectSubset<T, HorarioUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one Horario.
     * @param {HorarioUpsertArgs} args - Arguments to update or create a Horario.
     * @example
     * // Update or create a Horario
     * const horario = await prisma.horario.upsert({
     *   create: {
     *     // ... data to create a Horario
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Horario we want to update
     *   }
     * })
     */
    upsert<T extends HorarioUpsertArgs>(args: SelectSubset<T, HorarioUpsertArgs<ExtArgs>>): Prisma__HorarioClient<$Result.GetResult<Prisma.$HorarioPayload<ExtArgs>, T, "upsert">, never, ExtArgs>


    /**
     * Count the number of Horarios.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {HorarioCountArgs} args - Arguments to filter Horarios to count.
     * @example
     * // Count the number of Horarios
     * const count = await prisma.horario.count({
     *   where: {
     *     // ... the filter for the Horarios we want to count
     *   }
     * })
    **/
    count<T extends HorarioCountArgs>(
      args?: Subset<T, HorarioCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], HorarioCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Horario.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {HorarioAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends HorarioAggregateArgs>(args: Subset<T, HorarioAggregateArgs>): Prisma.PrismaPromise<GetHorarioAggregateType<T>>

    /**
     * Group by Horario.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {HorarioGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends HorarioGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: HorarioGroupByArgs['orderBy'] }
        : { orderBy?: HorarioGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, HorarioGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetHorarioGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Horario model
   */
  readonly fields: HorarioFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Horario.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__HorarioClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    empresa<T extends EmpresaDefaultArgs<ExtArgs> = {}>(args?: Subset<T, EmpresaDefaultArgs<ExtArgs>>): Prisma__EmpresaClient<$Result.GetResult<Prisma.$EmpresaPayload<ExtArgs>, T, "findUniqueOrThrow"> | Null, Null, ExtArgs>
    franjas<T extends Horario$franjasArgs<ExtArgs> = {}>(args?: Subset<T, Horario$franjasArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$FranjaHorarioPayload<ExtArgs>, T, "findMany"> | Null>
    colaboradores<T extends Horario$colaboradoresArgs<ExtArgs> = {}>(args?: Subset<T, Horario$colaboradoresArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ColaboradorPayload<ExtArgs>, T, "findMany"> | Null>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the Horario model
   */ 
  interface HorarioFieldRefs {
    readonly id: FieldRef<"Horario", 'String'>
    readonly empresaId: FieldRef<"Horario", 'String'>
    readonly nombre: FieldRef<"Horario", 'String'>
    readonly toleranciaMin: FieldRef<"Horario", 'Int'>
    readonly activo: FieldRef<"Horario", 'Boolean'>
    readonly creadoEn: FieldRef<"Horario", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * Horario findUnique
   */
  export type HorarioFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Horario
     */
    select?: HorarioSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: HorarioInclude<ExtArgs> | null
    /**
     * Filter, which Horario to fetch.
     */
    where: HorarioWhereUniqueInput
  }

  /**
   * Horario findUniqueOrThrow
   */
  export type HorarioFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Horario
     */
    select?: HorarioSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: HorarioInclude<ExtArgs> | null
    /**
     * Filter, which Horario to fetch.
     */
    where: HorarioWhereUniqueInput
  }

  /**
   * Horario findFirst
   */
  export type HorarioFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Horario
     */
    select?: HorarioSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: HorarioInclude<ExtArgs> | null
    /**
     * Filter, which Horario to fetch.
     */
    where?: HorarioWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Horarios to fetch.
     */
    orderBy?: HorarioOrderByWithRelationInput | HorarioOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Horarios.
     */
    cursor?: HorarioWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Horarios from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Horarios.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Horarios.
     */
    distinct?: HorarioScalarFieldEnum | HorarioScalarFieldEnum[]
  }

  /**
   * Horario findFirstOrThrow
   */
  export type HorarioFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Horario
     */
    select?: HorarioSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: HorarioInclude<ExtArgs> | null
    /**
     * Filter, which Horario to fetch.
     */
    where?: HorarioWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Horarios to fetch.
     */
    orderBy?: HorarioOrderByWithRelationInput | HorarioOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Horarios.
     */
    cursor?: HorarioWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Horarios from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Horarios.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Horarios.
     */
    distinct?: HorarioScalarFieldEnum | HorarioScalarFieldEnum[]
  }

  /**
   * Horario findMany
   */
  export type HorarioFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Horario
     */
    select?: HorarioSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: HorarioInclude<ExtArgs> | null
    /**
     * Filter, which Horarios to fetch.
     */
    where?: HorarioWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Horarios to fetch.
     */
    orderBy?: HorarioOrderByWithRelationInput | HorarioOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Horarios.
     */
    cursor?: HorarioWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Horarios from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Horarios.
     */
    skip?: number
    distinct?: HorarioScalarFieldEnum | HorarioScalarFieldEnum[]
  }

  /**
   * Horario create
   */
  export type HorarioCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Horario
     */
    select?: HorarioSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: HorarioInclude<ExtArgs> | null
    /**
     * The data needed to create a Horario.
     */
    data: XOR<HorarioCreateInput, HorarioUncheckedCreateInput>
  }

  /**
   * Horario createMany
   */
  export type HorarioCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Horarios.
     */
    data: HorarioCreateManyInput | HorarioCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Horario update
   */
  export type HorarioUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Horario
     */
    select?: HorarioSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: HorarioInclude<ExtArgs> | null
    /**
     * The data needed to update a Horario.
     */
    data: XOR<HorarioUpdateInput, HorarioUncheckedUpdateInput>
    /**
     * Choose, which Horario to update.
     */
    where: HorarioWhereUniqueInput
  }

  /**
   * Horario updateMany
   */
  export type HorarioUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Horarios.
     */
    data: XOR<HorarioUpdateManyMutationInput, HorarioUncheckedUpdateManyInput>
    /**
     * Filter which Horarios to update
     */
    where?: HorarioWhereInput
  }

  /**
   * Horario upsert
   */
  export type HorarioUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Horario
     */
    select?: HorarioSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: HorarioInclude<ExtArgs> | null
    /**
     * The filter to search for the Horario to update in case it exists.
     */
    where: HorarioWhereUniqueInput
    /**
     * In case the Horario found by the `where` argument doesn't exist, create a new Horario with this data.
     */
    create: XOR<HorarioCreateInput, HorarioUncheckedCreateInput>
    /**
     * In case the Horario was found with the provided `where` argument, update it with this data.
     */
    update: XOR<HorarioUpdateInput, HorarioUncheckedUpdateInput>
  }

  /**
   * Horario delete
   */
  export type HorarioDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Horario
     */
    select?: HorarioSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: HorarioInclude<ExtArgs> | null
    /**
     * Filter which Horario to delete.
     */
    where: HorarioWhereUniqueInput
  }

  /**
   * Horario deleteMany
   */
  export type HorarioDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Horarios to delete
     */
    where?: HorarioWhereInput
  }

  /**
   * Horario.franjas
   */
  export type Horario$franjasArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the FranjaHorario
     */
    select?: FranjaHorarioSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FranjaHorarioInclude<ExtArgs> | null
    where?: FranjaHorarioWhereInput
    orderBy?: FranjaHorarioOrderByWithRelationInput | FranjaHorarioOrderByWithRelationInput[]
    cursor?: FranjaHorarioWhereUniqueInput
    take?: number
    skip?: number
    distinct?: FranjaHorarioScalarFieldEnum | FranjaHorarioScalarFieldEnum[]
  }

  /**
   * Horario.colaboradores
   */
  export type Horario$colaboradoresArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Colaborador
     */
    select?: ColaboradorSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ColaboradorInclude<ExtArgs> | null
    where?: ColaboradorWhereInput
    orderBy?: ColaboradorOrderByWithRelationInput | ColaboradorOrderByWithRelationInput[]
    cursor?: ColaboradorWhereUniqueInput
    take?: number
    skip?: number
    distinct?: ColaboradorScalarFieldEnum | ColaboradorScalarFieldEnum[]
  }

  /**
   * Horario without action
   */
  export type HorarioDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Horario
     */
    select?: HorarioSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: HorarioInclude<ExtArgs> | null
  }


  /**
   * Model FranjaHorario
   */

  export type AggregateFranjaHorario = {
    _count: FranjaHorarioCountAggregateOutputType | null
    _min: FranjaHorarioMinAggregateOutputType | null
    _max: FranjaHorarioMaxAggregateOutputType | null
  }

  export type FranjaHorarioMinAggregateOutputType = {
    id: string | null
    horarioId: string | null
    horaEntrada: string | null
    horaSalida: string | null
  }

  export type FranjaHorarioMaxAggregateOutputType = {
    id: string | null
    horarioId: string | null
    horaEntrada: string | null
    horaSalida: string | null
  }

  export type FranjaHorarioCountAggregateOutputType = {
    id: number
    horarioId: number
    dias: number
    horaEntrada: number
    horaSalida: number
    _all: number
  }


  export type FranjaHorarioMinAggregateInputType = {
    id?: true
    horarioId?: true
    horaEntrada?: true
    horaSalida?: true
  }

  export type FranjaHorarioMaxAggregateInputType = {
    id?: true
    horarioId?: true
    horaEntrada?: true
    horaSalida?: true
  }

  export type FranjaHorarioCountAggregateInputType = {
    id?: true
    horarioId?: true
    dias?: true
    horaEntrada?: true
    horaSalida?: true
    _all?: true
  }

  export type FranjaHorarioAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which FranjaHorario to aggregate.
     */
    where?: FranjaHorarioWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of FranjaHorarios to fetch.
     */
    orderBy?: FranjaHorarioOrderByWithRelationInput | FranjaHorarioOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: FranjaHorarioWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` FranjaHorarios from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` FranjaHorarios.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned FranjaHorarios
    **/
    _count?: true | FranjaHorarioCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: FranjaHorarioMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: FranjaHorarioMaxAggregateInputType
  }

  export type GetFranjaHorarioAggregateType<T extends FranjaHorarioAggregateArgs> = {
        [P in keyof T & keyof AggregateFranjaHorario]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateFranjaHorario[P]>
      : GetScalarType<T[P], AggregateFranjaHorario[P]>
  }




  export type FranjaHorarioGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: FranjaHorarioWhereInput
    orderBy?: FranjaHorarioOrderByWithAggregationInput | FranjaHorarioOrderByWithAggregationInput[]
    by: FranjaHorarioScalarFieldEnum[] | FranjaHorarioScalarFieldEnum
    having?: FranjaHorarioScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: FranjaHorarioCountAggregateInputType | true
    _min?: FranjaHorarioMinAggregateInputType
    _max?: FranjaHorarioMaxAggregateInputType
  }

  export type FranjaHorarioGroupByOutputType = {
    id: string
    horarioId: string
    dias: JsonValue
    horaEntrada: string
    horaSalida: string
    _count: FranjaHorarioCountAggregateOutputType | null
    _min: FranjaHorarioMinAggregateOutputType | null
    _max: FranjaHorarioMaxAggregateOutputType | null
  }

  type GetFranjaHorarioGroupByPayload<T extends FranjaHorarioGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<FranjaHorarioGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof FranjaHorarioGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], FranjaHorarioGroupByOutputType[P]>
            : GetScalarType<T[P], FranjaHorarioGroupByOutputType[P]>
        }
      >
    >


  export type FranjaHorarioSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    horarioId?: boolean
    dias?: boolean
    horaEntrada?: boolean
    horaSalida?: boolean
    horario?: boolean | HorarioDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["franjaHorario"]>


  export type FranjaHorarioSelectScalar = {
    id?: boolean
    horarioId?: boolean
    dias?: boolean
    horaEntrada?: boolean
    horaSalida?: boolean
  }

  export type FranjaHorarioInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    horario?: boolean | HorarioDefaultArgs<ExtArgs>
  }

  export type $FranjaHorarioPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "FranjaHorario"
    objects: {
      horario: Prisma.$HorarioPayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      horarioId: string
      dias: Prisma.JsonValue
      horaEntrada: string
      horaSalida: string
    }, ExtArgs["result"]["franjaHorario"]>
    composites: {}
  }

  type FranjaHorarioGetPayload<S extends boolean | null | undefined | FranjaHorarioDefaultArgs> = $Result.GetResult<Prisma.$FranjaHorarioPayload, S>

  type FranjaHorarioCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = 
    Omit<FranjaHorarioFindManyArgs, 'select' | 'include' | 'distinct'> & {
      select?: FranjaHorarioCountAggregateInputType | true
    }

  export interface FranjaHorarioDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['FranjaHorario'], meta: { name: 'FranjaHorario' } }
    /**
     * Find zero or one FranjaHorario that matches the filter.
     * @param {FranjaHorarioFindUniqueArgs} args - Arguments to find a FranjaHorario
     * @example
     * // Get one FranjaHorario
     * const franjaHorario = await prisma.franjaHorario.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends FranjaHorarioFindUniqueArgs>(args: SelectSubset<T, FranjaHorarioFindUniqueArgs<ExtArgs>>): Prisma__FranjaHorarioClient<$Result.GetResult<Prisma.$FranjaHorarioPayload<ExtArgs>, T, "findUnique"> | null, null, ExtArgs>

    /**
     * Find one FranjaHorario that matches the filter or throw an error with `error.code='P2025'` 
     * if no matches were found.
     * @param {FranjaHorarioFindUniqueOrThrowArgs} args - Arguments to find a FranjaHorario
     * @example
     * // Get one FranjaHorario
     * const franjaHorario = await prisma.franjaHorario.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends FranjaHorarioFindUniqueOrThrowArgs>(args: SelectSubset<T, FranjaHorarioFindUniqueOrThrowArgs<ExtArgs>>): Prisma__FranjaHorarioClient<$Result.GetResult<Prisma.$FranjaHorarioPayload<ExtArgs>, T, "findUniqueOrThrow">, never, ExtArgs>

    /**
     * Find the first FranjaHorario that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {FranjaHorarioFindFirstArgs} args - Arguments to find a FranjaHorario
     * @example
     * // Get one FranjaHorario
     * const franjaHorario = await prisma.franjaHorario.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends FranjaHorarioFindFirstArgs>(args?: SelectSubset<T, FranjaHorarioFindFirstArgs<ExtArgs>>): Prisma__FranjaHorarioClient<$Result.GetResult<Prisma.$FranjaHorarioPayload<ExtArgs>, T, "findFirst"> | null, null, ExtArgs>

    /**
     * Find the first FranjaHorario that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {FranjaHorarioFindFirstOrThrowArgs} args - Arguments to find a FranjaHorario
     * @example
     * // Get one FranjaHorario
     * const franjaHorario = await prisma.franjaHorario.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends FranjaHorarioFindFirstOrThrowArgs>(args?: SelectSubset<T, FranjaHorarioFindFirstOrThrowArgs<ExtArgs>>): Prisma__FranjaHorarioClient<$Result.GetResult<Prisma.$FranjaHorarioPayload<ExtArgs>, T, "findFirstOrThrow">, never, ExtArgs>

    /**
     * Find zero or more FranjaHorarios that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {FranjaHorarioFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all FranjaHorarios
     * const franjaHorarios = await prisma.franjaHorario.findMany()
     * 
     * // Get first 10 FranjaHorarios
     * const franjaHorarios = await prisma.franjaHorario.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const franjaHorarioWithIdOnly = await prisma.franjaHorario.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends FranjaHorarioFindManyArgs>(args?: SelectSubset<T, FranjaHorarioFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$FranjaHorarioPayload<ExtArgs>, T, "findMany">>

    /**
     * Create a FranjaHorario.
     * @param {FranjaHorarioCreateArgs} args - Arguments to create a FranjaHorario.
     * @example
     * // Create one FranjaHorario
     * const FranjaHorario = await prisma.franjaHorario.create({
     *   data: {
     *     // ... data to create a FranjaHorario
     *   }
     * })
     * 
     */
    create<T extends FranjaHorarioCreateArgs>(args: SelectSubset<T, FranjaHorarioCreateArgs<ExtArgs>>): Prisma__FranjaHorarioClient<$Result.GetResult<Prisma.$FranjaHorarioPayload<ExtArgs>, T, "create">, never, ExtArgs>

    /**
     * Create many FranjaHorarios.
     * @param {FranjaHorarioCreateManyArgs} args - Arguments to create many FranjaHorarios.
     * @example
     * // Create many FranjaHorarios
     * const franjaHorario = await prisma.franjaHorario.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends FranjaHorarioCreateManyArgs>(args?: SelectSubset<T, FranjaHorarioCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Delete a FranjaHorario.
     * @param {FranjaHorarioDeleteArgs} args - Arguments to delete one FranjaHorario.
     * @example
     * // Delete one FranjaHorario
     * const FranjaHorario = await prisma.franjaHorario.delete({
     *   where: {
     *     // ... filter to delete one FranjaHorario
     *   }
     * })
     * 
     */
    delete<T extends FranjaHorarioDeleteArgs>(args: SelectSubset<T, FranjaHorarioDeleteArgs<ExtArgs>>): Prisma__FranjaHorarioClient<$Result.GetResult<Prisma.$FranjaHorarioPayload<ExtArgs>, T, "delete">, never, ExtArgs>

    /**
     * Update one FranjaHorario.
     * @param {FranjaHorarioUpdateArgs} args - Arguments to update one FranjaHorario.
     * @example
     * // Update one FranjaHorario
     * const franjaHorario = await prisma.franjaHorario.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends FranjaHorarioUpdateArgs>(args: SelectSubset<T, FranjaHorarioUpdateArgs<ExtArgs>>): Prisma__FranjaHorarioClient<$Result.GetResult<Prisma.$FranjaHorarioPayload<ExtArgs>, T, "update">, never, ExtArgs>

    /**
     * Delete zero or more FranjaHorarios.
     * @param {FranjaHorarioDeleteManyArgs} args - Arguments to filter FranjaHorarios to delete.
     * @example
     * // Delete a few FranjaHorarios
     * const { count } = await prisma.franjaHorario.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends FranjaHorarioDeleteManyArgs>(args?: SelectSubset<T, FranjaHorarioDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more FranjaHorarios.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {FranjaHorarioUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many FranjaHorarios
     * const franjaHorario = await prisma.franjaHorario.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends FranjaHorarioUpdateManyArgs>(args: SelectSubset<T, FranjaHorarioUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one FranjaHorario.
     * @param {FranjaHorarioUpsertArgs} args - Arguments to update or create a FranjaHorario.
     * @example
     * // Update or create a FranjaHorario
     * const franjaHorario = await prisma.franjaHorario.upsert({
     *   create: {
     *     // ... data to create a FranjaHorario
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the FranjaHorario we want to update
     *   }
     * })
     */
    upsert<T extends FranjaHorarioUpsertArgs>(args: SelectSubset<T, FranjaHorarioUpsertArgs<ExtArgs>>): Prisma__FranjaHorarioClient<$Result.GetResult<Prisma.$FranjaHorarioPayload<ExtArgs>, T, "upsert">, never, ExtArgs>


    /**
     * Count the number of FranjaHorarios.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {FranjaHorarioCountArgs} args - Arguments to filter FranjaHorarios to count.
     * @example
     * // Count the number of FranjaHorarios
     * const count = await prisma.franjaHorario.count({
     *   where: {
     *     // ... the filter for the FranjaHorarios we want to count
     *   }
     * })
    **/
    count<T extends FranjaHorarioCountArgs>(
      args?: Subset<T, FranjaHorarioCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], FranjaHorarioCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a FranjaHorario.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {FranjaHorarioAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends FranjaHorarioAggregateArgs>(args: Subset<T, FranjaHorarioAggregateArgs>): Prisma.PrismaPromise<GetFranjaHorarioAggregateType<T>>

    /**
     * Group by FranjaHorario.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {FranjaHorarioGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends FranjaHorarioGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: FranjaHorarioGroupByArgs['orderBy'] }
        : { orderBy?: FranjaHorarioGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, FranjaHorarioGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetFranjaHorarioGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the FranjaHorario model
   */
  readonly fields: FranjaHorarioFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for FranjaHorario.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__FranjaHorarioClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    horario<T extends HorarioDefaultArgs<ExtArgs> = {}>(args?: Subset<T, HorarioDefaultArgs<ExtArgs>>): Prisma__HorarioClient<$Result.GetResult<Prisma.$HorarioPayload<ExtArgs>, T, "findUniqueOrThrow"> | Null, Null, ExtArgs>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the FranjaHorario model
   */ 
  interface FranjaHorarioFieldRefs {
    readonly id: FieldRef<"FranjaHorario", 'String'>
    readonly horarioId: FieldRef<"FranjaHorario", 'String'>
    readonly dias: FieldRef<"FranjaHorario", 'Json'>
    readonly horaEntrada: FieldRef<"FranjaHorario", 'String'>
    readonly horaSalida: FieldRef<"FranjaHorario", 'String'>
  }
    

  // Custom InputTypes
  /**
   * FranjaHorario findUnique
   */
  export type FranjaHorarioFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the FranjaHorario
     */
    select?: FranjaHorarioSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FranjaHorarioInclude<ExtArgs> | null
    /**
     * Filter, which FranjaHorario to fetch.
     */
    where: FranjaHorarioWhereUniqueInput
  }

  /**
   * FranjaHorario findUniqueOrThrow
   */
  export type FranjaHorarioFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the FranjaHorario
     */
    select?: FranjaHorarioSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FranjaHorarioInclude<ExtArgs> | null
    /**
     * Filter, which FranjaHorario to fetch.
     */
    where: FranjaHorarioWhereUniqueInput
  }

  /**
   * FranjaHorario findFirst
   */
  export type FranjaHorarioFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the FranjaHorario
     */
    select?: FranjaHorarioSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FranjaHorarioInclude<ExtArgs> | null
    /**
     * Filter, which FranjaHorario to fetch.
     */
    where?: FranjaHorarioWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of FranjaHorarios to fetch.
     */
    orderBy?: FranjaHorarioOrderByWithRelationInput | FranjaHorarioOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for FranjaHorarios.
     */
    cursor?: FranjaHorarioWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` FranjaHorarios from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` FranjaHorarios.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of FranjaHorarios.
     */
    distinct?: FranjaHorarioScalarFieldEnum | FranjaHorarioScalarFieldEnum[]
  }

  /**
   * FranjaHorario findFirstOrThrow
   */
  export type FranjaHorarioFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the FranjaHorario
     */
    select?: FranjaHorarioSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FranjaHorarioInclude<ExtArgs> | null
    /**
     * Filter, which FranjaHorario to fetch.
     */
    where?: FranjaHorarioWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of FranjaHorarios to fetch.
     */
    orderBy?: FranjaHorarioOrderByWithRelationInput | FranjaHorarioOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for FranjaHorarios.
     */
    cursor?: FranjaHorarioWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` FranjaHorarios from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` FranjaHorarios.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of FranjaHorarios.
     */
    distinct?: FranjaHorarioScalarFieldEnum | FranjaHorarioScalarFieldEnum[]
  }

  /**
   * FranjaHorario findMany
   */
  export type FranjaHorarioFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the FranjaHorario
     */
    select?: FranjaHorarioSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FranjaHorarioInclude<ExtArgs> | null
    /**
     * Filter, which FranjaHorarios to fetch.
     */
    where?: FranjaHorarioWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of FranjaHorarios to fetch.
     */
    orderBy?: FranjaHorarioOrderByWithRelationInput | FranjaHorarioOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing FranjaHorarios.
     */
    cursor?: FranjaHorarioWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` FranjaHorarios from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` FranjaHorarios.
     */
    skip?: number
    distinct?: FranjaHorarioScalarFieldEnum | FranjaHorarioScalarFieldEnum[]
  }

  /**
   * FranjaHorario create
   */
  export type FranjaHorarioCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the FranjaHorario
     */
    select?: FranjaHorarioSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FranjaHorarioInclude<ExtArgs> | null
    /**
     * The data needed to create a FranjaHorario.
     */
    data: XOR<FranjaHorarioCreateInput, FranjaHorarioUncheckedCreateInput>
  }

  /**
   * FranjaHorario createMany
   */
  export type FranjaHorarioCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many FranjaHorarios.
     */
    data: FranjaHorarioCreateManyInput | FranjaHorarioCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * FranjaHorario update
   */
  export type FranjaHorarioUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the FranjaHorario
     */
    select?: FranjaHorarioSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FranjaHorarioInclude<ExtArgs> | null
    /**
     * The data needed to update a FranjaHorario.
     */
    data: XOR<FranjaHorarioUpdateInput, FranjaHorarioUncheckedUpdateInput>
    /**
     * Choose, which FranjaHorario to update.
     */
    where: FranjaHorarioWhereUniqueInput
  }

  /**
   * FranjaHorario updateMany
   */
  export type FranjaHorarioUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update FranjaHorarios.
     */
    data: XOR<FranjaHorarioUpdateManyMutationInput, FranjaHorarioUncheckedUpdateManyInput>
    /**
     * Filter which FranjaHorarios to update
     */
    where?: FranjaHorarioWhereInput
  }

  /**
   * FranjaHorario upsert
   */
  export type FranjaHorarioUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the FranjaHorario
     */
    select?: FranjaHorarioSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FranjaHorarioInclude<ExtArgs> | null
    /**
     * The filter to search for the FranjaHorario to update in case it exists.
     */
    where: FranjaHorarioWhereUniqueInput
    /**
     * In case the FranjaHorario found by the `where` argument doesn't exist, create a new FranjaHorario with this data.
     */
    create: XOR<FranjaHorarioCreateInput, FranjaHorarioUncheckedCreateInput>
    /**
     * In case the FranjaHorario was found with the provided `where` argument, update it with this data.
     */
    update: XOR<FranjaHorarioUpdateInput, FranjaHorarioUncheckedUpdateInput>
  }

  /**
   * FranjaHorario delete
   */
  export type FranjaHorarioDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the FranjaHorario
     */
    select?: FranjaHorarioSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FranjaHorarioInclude<ExtArgs> | null
    /**
     * Filter which FranjaHorario to delete.
     */
    where: FranjaHorarioWhereUniqueInput
  }

  /**
   * FranjaHorario deleteMany
   */
  export type FranjaHorarioDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which FranjaHorarios to delete
     */
    where?: FranjaHorarioWhereInput
  }

  /**
   * FranjaHorario without action
   */
  export type FranjaHorarioDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the FranjaHorario
     */
    select?: FranjaHorarioSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FranjaHorarioInclude<ExtArgs> | null
  }


  /**
   * Model DispositivoKiosco
   */

  export type AggregateDispositivoKiosco = {
    _count: DispositivoKioscoCountAggregateOutputType | null
    _min: DispositivoKioscoMinAggregateOutputType | null
    _max: DispositivoKioscoMaxAggregateOutputType | null
  }

  export type DispositivoKioscoMinAggregateOutputType = {
    id: string | null
    empresaId: string | null
    nombre: string | null
    token: string | null
    creadoEn: Date | null
    ultimoUso: Date | null
  }

  export type DispositivoKioscoMaxAggregateOutputType = {
    id: string | null
    empresaId: string | null
    nombre: string | null
    token: string | null
    creadoEn: Date | null
    ultimoUso: Date | null
  }

  export type DispositivoKioscoCountAggregateOutputType = {
    id: number
    empresaId: number
    nombre: number
    token: number
    creadoEn: number
    ultimoUso: number
    _all: number
  }


  export type DispositivoKioscoMinAggregateInputType = {
    id?: true
    empresaId?: true
    nombre?: true
    token?: true
    creadoEn?: true
    ultimoUso?: true
  }

  export type DispositivoKioscoMaxAggregateInputType = {
    id?: true
    empresaId?: true
    nombre?: true
    token?: true
    creadoEn?: true
    ultimoUso?: true
  }

  export type DispositivoKioscoCountAggregateInputType = {
    id?: true
    empresaId?: true
    nombre?: true
    token?: true
    creadoEn?: true
    ultimoUso?: true
    _all?: true
  }

  export type DispositivoKioscoAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which DispositivoKiosco to aggregate.
     */
    where?: DispositivoKioscoWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of DispositivoKioscos to fetch.
     */
    orderBy?: DispositivoKioscoOrderByWithRelationInput | DispositivoKioscoOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: DispositivoKioscoWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` DispositivoKioscos from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` DispositivoKioscos.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned DispositivoKioscos
    **/
    _count?: true | DispositivoKioscoCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: DispositivoKioscoMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: DispositivoKioscoMaxAggregateInputType
  }

  export type GetDispositivoKioscoAggregateType<T extends DispositivoKioscoAggregateArgs> = {
        [P in keyof T & keyof AggregateDispositivoKiosco]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateDispositivoKiosco[P]>
      : GetScalarType<T[P], AggregateDispositivoKiosco[P]>
  }




  export type DispositivoKioscoGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: DispositivoKioscoWhereInput
    orderBy?: DispositivoKioscoOrderByWithAggregationInput | DispositivoKioscoOrderByWithAggregationInput[]
    by: DispositivoKioscoScalarFieldEnum[] | DispositivoKioscoScalarFieldEnum
    having?: DispositivoKioscoScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: DispositivoKioscoCountAggregateInputType | true
    _min?: DispositivoKioscoMinAggregateInputType
    _max?: DispositivoKioscoMaxAggregateInputType
  }

  export type DispositivoKioscoGroupByOutputType = {
    id: string
    empresaId: string
    nombre: string
    token: string
    creadoEn: Date
    ultimoUso: Date | null
    _count: DispositivoKioscoCountAggregateOutputType | null
    _min: DispositivoKioscoMinAggregateOutputType | null
    _max: DispositivoKioscoMaxAggregateOutputType | null
  }

  type GetDispositivoKioscoGroupByPayload<T extends DispositivoKioscoGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<DispositivoKioscoGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof DispositivoKioscoGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], DispositivoKioscoGroupByOutputType[P]>
            : GetScalarType<T[P], DispositivoKioscoGroupByOutputType[P]>
        }
      >
    >


  export type DispositivoKioscoSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    empresaId?: boolean
    nombre?: boolean
    token?: boolean
    creadoEn?: boolean
    ultimoUso?: boolean
    empresa?: boolean | EmpresaDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["dispositivoKiosco"]>


  export type DispositivoKioscoSelectScalar = {
    id?: boolean
    empresaId?: boolean
    nombre?: boolean
    token?: boolean
    creadoEn?: boolean
    ultimoUso?: boolean
  }

  export type DispositivoKioscoInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    empresa?: boolean | EmpresaDefaultArgs<ExtArgs>
  }

  export type $DispositivoKioscoPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "DispositivoKiosco"
    objects: {
      empresa: Prisma.$EmpresaPayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      empresaId: string
      nombre: string
      token: string
      creadoEn: Date
      ultimoUso: Date | null
    }, ExtArgs["result"]["dispositivoKiosco"]>
    composites: {}
  }

  type DispositivoKioscoGetPayload<S extends boolean | null | undefined | DispositivoKioscoDefaultArgs> = $Result.GetResult<Prisma.$DispositivoKioscoPayload, S>

  type DispositivoKioscoCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = 
    Omit<DispositivoKioscoFindManyArgs, 'select' | 'include' | 'distinct'> & {
      select?: DispositivoKioscoCountAggregateInputType | true
    }

  export interface DispositivoKioscoDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['DispositivoKiosco'], meta: { name: 'DispositivoKiosco' } }
    /**
     * Find zero or one DispositivoKiosco that matches the filter.
     * @param {DispositivoKioscoFindUniqueArgs} args - Arguments to find a DispositivoKiosco
     * @example
     * // Get one DispositivoKiosco
     * const dispositivoKiosco = await prisma.dispositivoKiosco.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends DispositivoKioscoFindUniqueArgs>(args: SelectSubset<T, DispositivoKioscoFindUniqueArgs<ExtArgs>>): Prisma__DispositivoKioscoClient<$Result.GetResult<Prisma.$DispositivoKioscoPayload<ExtArgs>, T, "findUnique"> | null, null, ExtArgs>

    /**
     * Find one DispositivoKiosco that matches the filter or throw an error with `error.code='P2025'` 
     * if no matches were found.
     * @param {DispositivoKioscoFindUniqueOrThrowArgs} args - Arguments to find a DispositivoKiosco
     * @example
     * // Get one DispositivoKiosco
     * const dispositivoKiosco = await prisma.dispositivoKiosco.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends DispositivoKioscoFindUniqueOrThrowArgs>(args: SelectSubset<T, DispositivoKioscoFindUniqueOrThrowArgs<ExtArgs>>): Prisma__DispositivoKioscoClient<$Result.GetResult<Prisma.$DispositivoKioscoPayload<ExtArgs>, T, "findUniqueOrThrow">, never, ExtArgs>

    /**
     * Find the first DispositivoKiosco that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {DispositivoKioscoFindFirstArgs} args - Arguments to find a DispositivoKiosco
     * @example
     * // Get one DispositivoKiosco
     * const dispositivoKiosco = await prisma.dispositivoKiosco.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends DispositivoKioscoFindFirstArgs>(args?: SelectSubset<T, DispositivoKioscoFindFirstArgs<ExtArgs>>): Prisma__DispositivoKioscoClient<$Result.GetResult<Prisma.$DispositivoKioscoPayload<ExtArgs>, T, "findFirst"> | null, null, ExtArgs>

    /**
     * Find the first DispositivoKiosco that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {DispositivoKioscoFindFirstOrThrowArgs} args - Arguments to find a DispositivoKiosco
     * @example
     * // Get one DispositivoKiosco
     * const dispositivoKiosco = await prisma.dispositivoKiosco.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends DispositivoKioscoFindFirstOrThrowArgs>(args?: SelectSubset<T, DispositivoKioscoFindFirstOrThrowArgs<ExtArgs>>): Prisma__DispositivoKioscoClient<$Result.GetResult<Prisma.$DispositivoKioscoPayload<ExtArgs>, T, "findFirstOrThrow">, never, ExtArgs>

    /**
     * Find zero or more DispositivoKioscos that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {DispositivoKioscoFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all DispositivoKioscos
     * const dispositivoKioscos = await prisma.dispositivoKiosco.findMany()
     * 
     * // Get first 10 DispositivoKioscos
     * const dispositivoKioscos = await prisma.dispositivoKiosco.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const dispositivoKioscoWithIdOnly = await prisma.dispositivoKiosco.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends DispositivoKioscoFindManyArgs>(args?: SelectSubset<T, DispositivoKioscoFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$DispositivoKioscoPayload<ExtArgs>, T, "findMany">>

    /**
     * Create a DispositivoKiosco.
     * @param {DispositivoKioscoCreateArgs} args - Arguments to create a DispositivoKiosco.
     * @example
     * // Create one DispositivoKiosco
     * const DispositivoKiosco = await prisma.dispositivoKiosco.create({
     *   data: {
     *     // ... data to create a DispositivoKiosco
     *   }
     * })
     * 
     */
    create<T extends DispositivoKioscoCreateArgs>(args: SelectSubset<T, DispositivoKioscoCreateArgs<ExtArgs>>): Prisma__DispositivoKioscoClient<$Result.GetResult<Prisma.$DispositivoKioscoPayload<ExtArgs>, T, "create">, never, ExtArgs>

    /**
     * Create many DispositivoKioscos.
     * @param {DispositivoKioscoCreateManyArgs} args - Arguments to create many DispositivoKioscos.
     * @example
     * // Create many DispositivoKioscos
     * const dispositivoKiosco = await prisma.dispositivoKiosco.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends DispositivoKioscoCreateManyArgs>(args?: SelectSubset<T, DispositivoKioscoCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Delete a DispositivoKiosco.
     * @param {DispositivoKioscoDeleteArgs} args - Arguments to delete one DispositivoKiosco.
     * @example
     * // Delete one DispositivoKiosco
     * const DispositivoKiosco = await prisma.dispositivoKiosco.delete({
     *   where: {
     *     // ... filter to delete one DispositivoKiosco
     *   }
     * })
     * 
     */
    delete<T extends DispositivoKioscoDeleteArgs>(args: SelectSubset<T, DispositivoKioscoDeleteArgs<ExtArgs>>): Prisma__DispositivoKioscoClient<$Result.GetResult<Prisma.$DispositivoKioscoPayload<ExtArgs>, T, "delete">, never, ExtArgs>

    /**
     * Update one DispositivoKiosco.
     * @param {DispositivoKioscoUpdateArgs} args - Arguments to update one DispositivoKiosco.
     * @example
     * // Update one DispositivoKiosco
     * const dispositivoKiosco = await prisma.dispositivoKiosco.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends DispositivoKioscoUpdateArgs>(args: SelectSubset<T, DispositivoKioscoUpdateArgs<ExtArgs>>): Prisma__DispositivoKioscoClient<$Result.GetResult<Prisma.$DispositivoKioscoPayload<ExtArgs>, T, "update">, never, ExtArgs>

    /**
     * Delete zero or more DispositivoKioscos.
     * @param {DispositivoKioscoDeleteManyArgs} args - Arguments to filter DispositivoKioscos to delete.
     * @example
     * // Delete a few DispositivoKioscos
     * const { count } = await prisma.dispositivoKiosco.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends DispositivoKioscoDeleteManyArgs>(args?: SelectSubset<T, DispositivoKioscoDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more DispositivoKioscos.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {DispositivoKioscoUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many DispositivoKioscos
     * const dispositivoKiosco = await prisma.dispositivoKiosco.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends DispositivoKioscoUpdateManyArgs>(args: SelectSubset<T, DispositivoKioscoUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one DispositivoKiosco.
     * @param {DispositivoKioscoUpsertArgs} args - Arguments to update or create a DispositivoKiosco.
     * @example
     * // Update or create a DispositivoKiosco
     * const dispositivoKiosco = await prisma.dispositivoKiosco.upsert({
     *   create: {
     *     // ... data to create a DispositivoKiosco
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the DispositivoKiosco we want to update
     *   }
     * })
     */
    upsert<T extends DispositivoKioscoUpsertArgs>(args: SelectSubset<T, DispositivoKioscoUpsertArgs<ExtArgs>>): Prisma__DispositivoKioscoClient<$Result.GetResult<Prisma.$DispositivoKioscoPayload<ExtArgs>, T, "upsert">, never, ExtArgs>


    /**
     * Count the number of DispositivoKioscos.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {DispositivoKioscoCountArgs} args - Arguments to filter DispositivoKioscos to count.
     * @example
     * // Count the number of DispositivoKioscos
     * const count = await prisma.dispositivoKiosco.count({
     *   where: {
     *     // ... the filter for the DispositivoKioscos we want to count
     *   }
     * })
    **/
    count<T extends DispositivoKioscoCountArgs>(
      args?: Subset<T, DispositivoKioscoCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], DispositivoKioscoCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a DispositivoKiosco.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {DispositivoKioscoAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends DispositivoKioscoAggregateArgs>(args: Subset<T, DispositivoKioscoAggregateArgs>): Prisma.PrismaPromise<GetDispositivoKioscoAggregateType<T>>

    /**
     * Group by DispositivoKiosco.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {DispositivoKioscoGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends DispositivoKioscoGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: DispositivoKioscoGroupByArgs['orderBy'] }
        : { orderBy?: DispositivoKioscoGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, DispositivoKioscoGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetDispositivoKioscoGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the DispositivoKiosco model
   */
  readonly fields: DispositivoKioscoFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for DispositivoKiosco.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__DispositivoKioscoClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    empresa<T extends EmpresaDefaultArgs<ExtArgs> = {}>(args?: Subset<T, EmpresaDefaultArgs<ExtArgs>>): Prisma__EmpresaClient<$Result.GetResult<Prisma.$EmpresaPayload<ExtArgs>, T, "findUniqueOrThrow"> | Null, Null, ExtArgs>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the DispositivoKiosco model
   */ 
  interface DispositivoKioscoFieldRefs {
    readonly id: FieldRef<"DispositivoKiosco", 'String'>
    readonly empresaId: FieldRef<"DispositivoKiosco", 'String'>
    readonly nombre: FieldRef<"DispositivoKiosco", 'String'>
    readonly token: FieldRef<"DispositivoKiosco", 'String'>
    readonly creadoEn: FieldRef<"DispositivoKiosco", 'DateTime'>
    readonly ultimoUso: FieldRef<"DispositivoKiosco", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * DispositivoKiosco findUnique
   */
  export type DispositivoKioscoFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the DispositivoKiosco
     */
    select?: DispositivoKioscoSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: DispositivoKioscoInclude<ExtArgs> | null
    /**
     * Filter, which DispositivoKiosco to fetch.
     */
    where: DispositivoKioscoWhereUniqueInput
  }

  /**
   * DispositivoKiosco findUniqueOrThrow
   */
  export type DispositivoKioscoFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the DispositivoKiosco
     */
    select?: DispositivoKioscoSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: DispositivoKioscoInclude<ExtArgs> | null
    /**
     * Filter, which DispositivoKiosco to fetch.
     */
    where: DispositivoKioscoWhereUniqueInput
  }

  /**
   * DispositivoKiosco findFirst
   */
  export type DispositivoKioscoFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the DispositivoKiosco
     */
    select?: DispositivoKioscoSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: DispositivoKioscoInclude<ExtArgs> | null
    /**
     * Filter, which DispositivoKiosco to fetch.
     */
    where?: DispositivoKioscoWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of DispositivoKioscos to fetch.
     */
    orderBy?: DispositivoKioscoOrderByWithRelationInput | DispositivoKioscoOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for DispositivoKioscos.
     */
    cursor?: DispositivoKioscoWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` DispositivoKioscos from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` DispositivoKioscos.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of DispositivoKioscos.
     */
    distinct?: DispositivoKioscoScalarFieldEnum | DispositivoKioscoScalarFieldEnum[]
  }

  /**
   * DispositivoKiosco findFirstOrThrow
   */
  export type DispositivoKioscoFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the DispositivoKiosco
     */
    select?: DispositivoKioscoSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: DispositivoKioscoInclude<ExtArgs> | null
    /**
     * Filter, which DispositivoKiosco to fetch.
     */
    where?: DispositivoKioscoWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of DispositivoKioscos to fetch.
     */
    orderBy?: DispositivoKioscoOrderByWithRelationInput | DispositivoKioscoOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for DispositivoKioscos.
     */
    cursor?: DispositivoKioscoWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` DispositivoKioscos from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` DispositivoKioscos.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of DispositivoKioscos.
     */
    distinct?: DispositivoKioscoScalarFieldEnum | DispositivoKioscoScalarFieldEnum[]
  }

  /**
   * DispositivoKiosco findMany
   */
  export type DispositivoKioscoFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the DispositivoKiosco
     */
    select?: DispositivoKioscoSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: DispositivoKioscoInclude<ExtArgs> | null
    /**
     * Filter, which DispositivoKioscos to fetch.
     */
    where?: DispositivoKioscoWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of DispositivoKioscos to fetch.
     */
    orderBy?: DispositivoKioscoOrderByWithRelationInput | DispositivoKioscoOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing DispositivoKioscos.
     */
    cursor?: DispositivoKioscoWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` DispositivoKioscos from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` DispositivoKioscos.
     */
    skip?: number
    distinct?: DispositivoKioscoScalarFieldEnum | DispositivoKioscoScalarFieldEnum[]
  }

  /**
   * DispositivoKiosco create
   */
  export type DispositivoKioscoCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the DispositivoKiosco
     */
    select?: DispositivoKioscoSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: DispositivoKioscoInclude<ExtArgs> | null
    /**
     * The data needed to create a DispositivoKiosco.
     */
    data: XOR<DispositivoKioscoCreateInput, DispositivoKioscoUncheckedCreateInput>
  }

  /**
   * DispositivoKiosco createMany
   */
  export type DispositivoKioscoCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many DispositivoKioscos.
     */
    data: DispositivoKioscoCreateManyInput | DispositivoKioscoCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * DispositivoKiosco update
   */
  export type DispositivoKioscoUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the DispositivoKiosco
     */
    select?: DispositivoKioscoSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: DispositivoKioscoInclude<ExtArgs> | null
    /**
     * The data needed to update a DispositivoKiosco.
     */
    data: XOR<DispositivoKioscoUpdateInput, DispositivoKioscoUncheckedUpdateInput>
    /**
     * Choose, which DispositivoKiosco to update.
     */
    where: DispositivoKioscoWhereUniqueInput
  }

  /**
   * DispositivoKiosco updateMany
   */
  export type DispositivoKioscoUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update DispositivoKioscos.
     */
    data: XOR<DispositivoKioscoUpdateManyMutationInput, DispositivoKioscoUncheckedUpdateManyInput>
    /**
     * Filter which DispositivoKioscos to update
     */
    where?: DispositivoKioscoWhereInput
  }

  /**
   * DispositivoKiosco upsert
   */
  export type DispositivoKioscoUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the DispositivoKiosco
     */
    select?: DispositivoKioscoSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: DispositivoKioscoInclude<ExtArgs> | null
    /**
     * The filter to search for the DispositivoKiosco to update in case it exists.
     */
    where: DispositivoKioscoWhereUniqueInput
    /**
     * In case the DispositivoKiosco found by the `where` argument doesn't exist, create a new DispositivoKiosco with this data.
     */
    create: XOR<DispositivoKioscoCreateInput, DispositivoKioscoUncheckedCreateInput>
    /**
     * In case the DispositivoKiosco was found with the provided `where` argument, update it with this data.
     */
    update: XOR<DispositivoKioscoUpdateInput, DispositivoKioscoUncheckedUpdateInput>
  }

  /**
   * DispositivoKiosco delete
   */
  export type DispositivoKioscoDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the DispositivoKiosco
     */
    select?: DispositivoKioscoSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: DispositivoKioscoInclude<ExtArgs> | null
    /**
     * Filter which DispositivoKiosco to delete.
     */
    where: DispositivoKioscoWhereUniqueInput
  }

  /**
   * DispositivoKiosco deleteMany
   */
  export type DispositivoKioscoDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which DispositivoKioscos to delete
     */
    where?: DispositivoKioscoWhereInput
  }

  /**
   * DispositivoKiosco without action
   */
  export type DispositivoKioscoDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the DispositivoKiosco
     */
    select?: DispositivoKioscoSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: DispositivoKioscoInclude<ExtArgs> | null
  }


  /**
   * Model Colaborador
   */

  export type AggregateColaborador = {
    _count: ColaboradorCountAggregateOutputType | null
    _avg: ColaboradorAvgAggregateOutputType | null
    _sum: ColaboradorSumAggregateOutputType | null
    _min: ColaboradorMinAggregateOutputType | null
    _max: ColaboradorMaxAggregateOutputType | null
  }

  export type ColaboradorAvgAggregateOutputType = {
    salarioMensual: number | null
  }

  export type ColaboradorSumAggregateOutputType = {
    salarioMensual: number | null
  }

  export type ColaboradorMinAggregateOutputType = {
    id: string | null
    empresaId: string | null
    nombre: string | null
    apellido: string | null
    cedula: string | null
    cargo: string | null
    email: string | null
    telefono: string | null
    fechaNacimiento: Date | null
    salarioMensual: number | null
    rostroEnroladoEn: Date | null
    horarioId: string | null
    activo: boolean | null
    retiroProgramado: Date | null
    creadoEn: Date | null
    actualizadoEn: Date | null
  }

  export type ColaboradorMaxAggregateOutputType = {
    id: string | null
    empresaId: string | null
    nombre: string | null
    apellido: string | null
    cedula: string | null
    cargo: string | null
    email: string | null
    telefono: string | null
    fechaNacimiento: Date | null
    salarioMensual: number | null
    rostroEnroladoEn: Date | null
    horarioId: string | null
    activo: boolean | null
    retiroProgramado: Date | null
    creadoEn: Date | null
    actualizadoEn: Date | null
  }

  export type ColaboradorCountAggregateOutputType = {
    id: number
    empresaId: number
    nombre: number
    apellido: number
    cedula: number
    cargo: number
    email: number
    telefono: number
    fechaNacimiento: number
    salarioMensual: number
    rostroDescriptor: number
    rostroEnroladoEn: number
    horarioId: number
    activo: number
    retiroProgramado: number
    creadoEn: number
    actualizadoEn: number
    _all: number
  }


  export type ColaboradorAvgAggregateInputType = {
    salarioMensual?: true
  }

  export type ColaboradorSumAggregateInputType = {
    salarioMensual?: true
  }

  export type ColaboradorMinAggregateInputType = {
    id?: true
    empresaId?: true
    nombre?: true
    apellido?: true
    cedula?: true
    cargo?: true
    email?: true
    telefono?: true
    fechaNacimiento?: true
    salarioMensual?: true
    rostroEnroladoEn?: true
    horarioId?: true
    activo?: true
    retiroProgramado?: true
    creadoEn?: true
    actualizadoEn?: true
  }

  export type ColaboradorMaxAggregateInputType = {
    id?: true
    empresaId?: true
    nombre?: true
    apellido?: true
    cedula?: true
    cargo?: true
    email?: true
    telefono?: true
    fechaNacimiento?: true
    salarioMensual?: true
    rostroEnroladoEn?: true
    horarioId?: true
    activo?: true
    retiroProgramado?: true
    creadoEn?: true
    actualizadoEn?: true
  }

  export type ColaboradorCountAggregateInputType = {
    id?: true
    empresaId?: true
    nombre?: true
    apellido?: true
    cedula?: true
    cargo?: true
    email?: true
    telefono?: true
    fechaNacimiento?: true
    salarioMensual?: true
    rostroDescriptor?: true
    rostroEnroladoEn?: true
    horarioId?: true
    activo?: true
    retiroProgramado?: true
    creadoEn?: true
    actualizadoEn?: true
    _all?: true
  }

  export type ColaboradorAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Colaborador to aggregate.
     */
    where?: ColaboradorWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Colaboradors to fetch.
     */
    orderBy?: ColaboradorOrderByWithRelationInput | ColaboradorOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: ColaboradorWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Colaboradors from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Colaboradors.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Colaboradors
    **/
    _count?: true | ColaboradorCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: ColaboradorAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: ColaboradorSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: ColaboradorMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: ColaboradorMaxAggregateInputType
  }

  export type GetColaboradorAggregateType<T extends ColaboradorAggregateArgs> = {
        [P in keyof T & keyof AggregateColaborador]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateColaborador[P]>
      : GetScalarType<T[P], AggregateColaborador[P]>
  }




  export type ColaboradorGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: ColaboradorWhereInput
    orderBy?: ColaboradorOrderByWithAggregationInput | ColaboradorOrderByWithAggregationInput[]
    by: ColaboradorScalarFieldEnum[] | ColaboradorScalarFieldEnum
    having?: ColaboradorScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: ColaboradorCountAggregateInputType | true
    _avg?: ColaboradorAvgAggregateInputType
    _sum?: ColaboradorSumAggregateInputType
    _min?: ColaboradorMinAggregateInputType
    _max?: ColaboradorMaxAggregateInputType
  }

  export type ColaboradorGroupByOutputType = {
    id: string
    empresaId: string
    nombre: string
    apellido: string
    cedula: string
    cargo: string | null
    email: string | null
    telefono: string | null
    fechaNacimiento: Date | null
    salarioMensual: number
    rostroDescriptor: JsonValue | null
    rostroEnroladoEn: Date | null
    horarioId: string | null
    activo: boolean
    retiroProgramado: Date | null
    creadoEn: Date
    actualizadoEn: Date
    _count: ColaboradorCountAggregateOutputType | null
    _avg: ColaboradorAvgAggregateOutputType | null
    _sum: ColaboradorSumAggregateOutputType | null
    _min: ColaboradorMinAggregateOutputType | null
    _max: ColaboradorMaxAggregateOutputType | null
  }

  type GetColaboradorGroupByPayload<T extends ColaboradorGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<ColaboradorGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof ColaboradorGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], ColaboradorGroupByOutputType[P]>
            : GetScalarType<T[P], ColaboradorGroupByOutputType[P]>
        }
      >
    >


  export type ColaboradorSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    empresaId?: boolean
    nombre?: boolean
    apellido?: boolean
    cedula?: boolean
    cargo?: boolean
    email?: boolean
    telefono?: boolean
    fechaNacimiento?: boolean
    salarioMensual?: boolean
    rostroDescriptor?: boolean
    rostroEnroladoEn?: boolean
    horarioId?: boolean
    activo?: boolean
    retiroProgramado?: boolean
    creadoEn?: boolean
    actualizadoEn?: boolean
    empresa?: boolean | EmpresaDefaultArgs<ExtArgs>
    horario?: boolean | Colaborador$horarioArgs<ExtArgs>
    registros?: boolean | Colaborador$registrosArgs<ExtArgs>
    permisos?: boolean | Colaborador$permisosArgs<ExtArgs>
    _count?: boolean | ColaboradorCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["colaborador"]>


  export type ColaboradorSelectScalar = {
    id?: boolean
    empresaId?: boolean
    nombre?: boolean
    apellido?: boolean
    cedula?: boolean
    cargo?: boolean
    email?: boolean
    telefono?: boolean
    fechaNacimiento?: boolean
    salarioMensual?: boolean
    rostroDescriptor?: boolean
    rostroEnroladoEn?: boolean
    horarioId?: boolean
    activo?: boolean
    retiroProgramado?: boolean
    creadoEn?: boolean
    actualizadoEn?: boolean
  }

  export type ColaboradorInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    empresa?: boolean | EmpresaDefaultArgs<ExtArgs>
    horario?: boolean | Colaborador$horarioArgs<ExtArgs>
    registros?: boolean | Colaborador$registrosArgs<ExtArgs>
    permisos?: boolean | Colaborador$permisosArgs<ExtArgs>
    _count?: boolean | ColaboradorCountOutputTypeDefaultArgs<ExtArgs>
  }

  export type $ColaboradorPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Colaborador"
    objects: {
      empresa: Prisma.$EmpresaPayload<ExtArgs>
      horario: Prisma.$HorarioPayload<ExtArgs> | null
      registros: Prisma.$RegistroPayload<ExtArgs>[]
      permisos: Prisma.$PermisoPayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      empresaId: string
      nombre: string
      apellido: string
      cedula: string
      cargo: string | null
      email: string | null
      telefono: string | null
      fechaNacimiento: Date | null
      salarioMensual: number
      rostroDescriptor: Prisma.JsonValue | null
      rostroEnroladoEn: Date | null
      horarioId: string | null
      activo: boolean
      retiroProgramado: Date | null
      creadoEn: Date
      actualizadoEn: Date
    }, ExtArgs["result"]["colaborador"]>
    composites: {}
  }

  type ColaboradorGetPayload<S extends boolean | null | undefined | ColaboradorDefaultArgs> = $Result.GetResult<Prisma.$ColaboradorPayload, S>

  type ColaboradorCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = 
    Omit<ColaboradorFindManyArgs, 'select' | 'include' | 'distinct'> & {
      select?: ColaboradorCountAggregateInputType | true
    }

  export interface ColaboradorDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Colaborador'], meta: { name: 'Colaborador' } }
    /**
     * Find zero or one Colaborador that matches the filter.
     * @param {ColaboradorFindUniqueArgs} args - Arguments to find a Colaborador
     * @example
     * // Get one Colaborador
     * const colaborador = await prisma.colaborador.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends ColaboradorFindUniqueArgs>(args: SelectSubset<T, ColaboradorFindUniqueArgs<ExtArgs>>): Prisma__ColaboradorClient<$Result.GetResult<Prisma.$ColaboradorPayload<ExtArgs>, T, "findUnique"> | null, null, ExtArgs>

    /**
     * Find one Colaborador that matches the filter or throw an error with `error.code='P2025'` 
     * if no matches were found.
     * @param {ColaboradorFindUniqueOrThrowArgs} args - Arguments to find a Colaborador
     * @example
     * // Get one Colaborador
     * const colaborador = await prisma.colaborador.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends ColaboradorFindUniqueOrThrowArgs>(args: SelectSubset<T, ColaboradorFindUniqueOrThrowArgs<ExtArgs>>): Prisma__ColaboradorClient<$Result.GetResult<Prisma.$ColaboradorPayload<ExtArgs>, T, "findUniqueOrThrow">, never, ExtArgs>

    /**
     * Find the first Colaborador that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ColaboradorFindFirstArgs} args - Arguments to find a Colaborador
     * @example
     * // Get one Colaborador
     * const colaborador = await prisma.colaborador.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends ColaboradorFindFirstArgs>(args?: SelectSubset<T, ColaboradorFindFirstArgs<ExtArgs>>): Prisma__ColaboradorClient<$Result.GetResult<Prisma.$ColaboradorPayload<ExtArgs>, T, "findFirst"> | null, null, ExtArgs>

    /**
     * Find the first Colaborador that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ColaboradorFindFirstOrThrowArgs} args - Arguments to find a Colaborador
     * @example
     * // Get one Colaborador
     * const colaborador = await prisma.colaborador.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends ColaboradorFindFirstOrThrowArgs>(args?: SelectSubset<T, ColaboradorFindFirstOrThrowArgs<ExtArgs>>): Prisma__ColaboradorClient<$Result.GetResult<Prisma.$ColaboradorPayload<ExtArgs>, T, "findFirstOrThrow">, never, ExtArgs>

    /**
     * Find zero or more Colaboradors that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ColaboradorFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Colaboradors
     * const colaboradors = await prisma.colaborador.findMany()
     * 
     * // Get first 10 Colaboradors
     * const colaboradors = await prisma.colaborador.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const colaboradorWithIdOnly = await prisma.colaborador.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends ColaboradorFindManyArgs>(args?: SelectSubset<T, ColaboradorFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ColaboradorPayload<ExtArgs>, T, "findMany">>

    /**
     * Create a Colaborador.
     * @param {ColaboradorCreateArgs} args - Arguments to create a Colaborador.
     * @example
     * // Create one Colaborador
     * const Colaborador = await prisma.colaborador.create({
     *   data: {
     *     // ... data to create a Colaborador
     *   }
     * })
     * 
     */
    create<T extends ColaboradorCreateArgs>(args: SelectSubset<T, ColaboradorCreateArgs<ExtArgs>>): Prisma__ColaboradorClient<$Result.GetResult<Prisma.$ColaboradorPayload<ExtArgs>, T, "create">, never, ExtArgs>

    /**
     * Create many Colaboradors.
     * @param {ColaboradorCreateManyArgs} args - Arguments to create many Colaboradors.
     * @example
     * // Create many Colaboradors
     * const colaborador = await prisma.colaborador.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends ColaboradorCreateManyArgs>(args?: SelectSubset<T, ColaboradorCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Delete a Colaborador.
     * @param {ColaboradorDeleteArgs} args - Arguments to delete one Colaborador.
     * @example
     * // Delete one Colaborador
     * const Colaborador = await prisma.colaborador.delete({
     *   where: {
     *     // ... filter to delete one Colaborador
     *   }
     * })
     * 
     */
    delete<T extends ColaboradorDeleteArgs>(args: SelectSubset<T, ColaboradorDeleteArgs<ExtArgs>>): Prisma__ColaboradorClient<$Result.GetResult<Prisma.$ColaboradorPayload<ExtArgs>, T, "delete">, never, ExtArgs>

    /**
     * Update one Colaborador.
     * @param {ColaboradorUpdateArgs} args - Arguments to update one Colaborador.
     * @example
     * // Update one Colaborador
     * const colaborador = await prisma.colaborador.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends ColaboradorUpdateArgs>(args: SelectSubset<T, ColaboradorUpdateArgs<ExtArgs>>): Prisma__ColaboradorClient<$Result.GetResult<Prisma.$ColaboradorPayload<ExtArgs>, T, "update">, never, ExtArgs>

    /**
     * Delete zero or more Colaboradors.
     * @param {ColaboradorDeleteManyArgs} args - Arguments to filter Colaboradors to delete.
     * @example
     * // Delete a few Colaboradors
     * const { count } = await prisma.colaborador.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends ColaboradorDeleteManyArgs>(args?: SelectSubset<T, ColaboradorDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Colaboradors.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ColaboradorUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Colaboradors
     * const colaborador = await prisma.colaborador.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends ColaboradorUpdateManyArgs>(args: SelectSubset<T, ColaboradorUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one Colaborador.
     * @param {ColaboradorUpsertArgs} args - Arguments to update or create a Colaborador.
     * @example
     * // Update or create a Colaborador
     * const colaborador = await prisma.colaborador.upsert({
     *   create: {
     *     // ... data to create a Colaborador
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Colaborador we want to update
     *   }
     * })
     */
    upsert<T extends ColaboradorUpsertArgs>(args: SelectSubset<T, ColaboradorUpsertArgs<ExtArgs>>): Prisma__ColaboradorClient<$Result.GetResult<Prisma.$ColaboradorPayload<ExtArgs>, T, "upsert">, never, ExtArgs>


    /**
     * Count the number of Colaboradors.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ColaboradorCountArgs} args - Arguments to filter Colaboradors to count.
     * @example
     * // Count the number of Colaboradors
     * const count = await prisma.colaborador.count({
     *   where: {
     *     // ... the filter for the Colaboradors we want to count
     *   }
     * })
    **/
    count<T extends ColaboradorCountArgs>(
      args?: Subset<T, ColaboradorCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], ColaboradorCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Colaborador.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ColaboradorAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends ColaboradorAggregateArgs>(args: Subset<T, ColaboradorAggregateArgs>): Prisma.PrismaPromise<GetColaboradorAggregateType<T>>

    /**
     * Group by Colaborador.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ColaboradorGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends ColaboradorGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: ColaboradorGroupByArgs['orderBy'] }
        : { orderBy?: ColaboradorGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, ColaboradorGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetColaboradorGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Colaborador model
   */
  readonly fields: ColaboradorFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Colaborador.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__ColaboradorClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    empresa<T extends EmpresaDefaultArgs<ExtArgs> = {}>(args?: Subset<T, EmpresaDefaultArgs<ExtArgs>>): Prisma__EmpresaClient<$Result.GetResult<Prisma.$EmpresaPayload<ExtArgs>, T, "findUniqueOrThrow"> | Null, Null, ExtArgs>
    horario<T extends Colaborador$horarioArgs<ExtArgs> = {}>(args?: Subset<T, Colaborador$horarioArgs<ExtArgs>>): Prisma__HorarioClient<$Result.GetResult<Prisma.$HorarioPayload<ExtArgs>, T, "findUniqueOrThrow"> | null, null, ExtArgs>
    registros<T extends Colaborador$registrosArgs<ExtArgs> = {}>(args?: Subset<T, Colaborador$registrosArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$RegistroPayload<ExtArgs>, T, "findMany"> | Null>
    permisos<T extends Colaborador$permisosArgs<ExtArgs> = {}>(args?: Subset<T, Colaborador$permisosArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$PermisoPayload<ExtArgs>, T, "findMany"> | Null>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the Colaborador model
   */ 
  interface ColaboradorFieldRefs {
    readonly id: FieldRef<"Colaborador", 'String'>
    readonly empresaId: FieldRef<"Colaborador", 'String'>
    readonly nombre: FieldRef<"Colaborador", 'String'>
    readonly apellido: FieldRef<"Colaborador", 'String'>
    readonly cedula: FieldRef<"Colaborador", 'String'>
    readonly cargo: FieldRef<"Colaborador", 'String'>
    readonly email: FieldRef<"Colaborador", 'String'>
    readonly telefono: FieldRef<"Colaborador", 'String'>
    readonly fechaNacimiento: FieldRef<"Colaborador", 'DateTime'>
    readonly salarioMensual: FieldRef<"Colaborador", 'Float'>
    readonly rostroDescriptor: FieldRef<"Colaborador", 'Json'>
    readonly rostroEnroladoEn: FieldRef<"Colaborador", 'DateTime'>
    readonly horarioId: FieldRef<"Colaborador", 'String'>
    readonly activo: FieldRef<"Colaborador", 'Boolean'>
    readonly retiroProgramado: FieldRef<"Colaborador", 'DateTime'>
    readonly creadoEn: FieldRef<"Colaborador", 'DateTime'>
    readonly actualizadoEn: FieldRef<"Colaborador", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * Colaborador findUnique
   */
  export type ColaboradorFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Colaborador
     */
    select?: ColaboradorSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ColaboradorInclude<ExtArgs> | null
    /**
     * Filter, which Colaborador to fetch.
     */
    where: ColaboradorWhereUniqueInput
  }

  /**
   * Colaborador findUniqueOrThrow
   */
  export type ColaboradorFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Colaborador
     */
    select?: ColaboradorSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ColaboradorInclude<ExtArgs> | null
    /**
     * Filter, which Colaborador to fetch.
     */
    where: ColaboradorWhereUniqueInput
  }

  /**
   * Colaborador findFirst
   */
  export type ColaboradorFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Colaborador
     */
    select?: ColaboradorSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ColaboradorInclude<ExtArgs> | null
    /**
     * Filter, which Colaborador to fetch.
     */
    where?: ColaboradorWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Colaboradors to fetch.
     */
    orderBy?: ColaboradorOrderByWithRelationInput | ColaboradorOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Colaboradors.
     */
    cursor?: ColaboradorWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Colaboradors from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Colaboradors.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Colaboradors.
     */
    distinct?: ColaboradorScalarFieldEnum | ColaboradorScalarFieldEnum[]
  }

  /**
   * Colaborador findFirstOrThrow
   */
  export type ColaboradorFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Colaborador
     */
    select?: ColaboradorSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ColaboradorInclude<ExtArgs> | null
    /**
     * Filter, which Colaborador to fetch.
     */
    where?: ColaboradorWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Colaboradors to fetch.
     */
    orderBy?: ColaboradorOrderByWithRelationInput | ColaboradorOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Colaboradors.
     */
    cursor?: ColaboradorWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Colaboradors from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Colaboradors.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Colaboradors.
     */
    distinct?: ColaboradorScalarFieldEnum | ColaboradorScalarFieldEnum[]
  }

  /**
   * Colaborador findMany
   */
  export type ColaboradorFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Colaborador
     */
    select?: ColaboradorSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ColaboradorInclude<ExtArgs> | null
    /**
     * Filter, which Colaboradors to fetch.
     */
    where?: ColaboradorWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Colaboradors to fetch.
     */
    orderBy?: ColaboradorOrderByWithRelationInput | ColaboradorOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Colaboradors.
     */
    cursor?: ColaboradorWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Colaboradors from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Colaboradors.
     */
    skip?: number
    distinct?: ColaboradorScalarFieldEnum | ColaboradorScalarFieldEnum[]
  }

  /**
   * Colaborador create
   */
  export type ColaboradorCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Colaborador
     */
    select?: ColaboradorSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ColaboradorInclude<ExtArgs> | null
    /**
     * The data needed to create a Colaborador.
     */
    data: XOR<ColaboradorCreateInput, ColaboradorUncheckedCreateInput>
  }

  /**
   * Colaborador createMany
   */
  export type ColaboradorCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Colaboradors.
     */
    data: ColaboradorCreateManyInput | ColaboradorCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Colaborador update
   */
  export type ColaboradorUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Colaborador
     */
    select?: ColaboradorSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ColaboradorInclude<ExtArgs> | null
    /**
     * The data needed to update a Colaborador.
     */
    data: XOR<ColaboradorUpdateInput, ColaboradorUncheckedUpdateInput>
    /**
     * Choose, which Colaborador to update.
     */
    where: ColaboradorWhereUniqueInput
  }

  /**
   * Colaborador updateMany
   */
  export type ColaboradorUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Colaboradors.
     */
    data: XOR<ColaboradorUpdateManyMutationInput, ColaboradorUncheckedUpdateManyInput>
    /**
     * Filter which Colaboradors to update
     */
    where?: ColaboradorWhereInput
  }

  /**
   * Colaborador upsert
   */
  export type ColaboradorUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Colaborador
     */
    select?: ColaboradorSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ColaboradorInclude<ExtArgs> | null
    /**
     * The filter to search for the Colaborador to update in case it exists.
     */
    where: ColaboradorWhereUniqueInput
    /**
     * In case the Colaborador found by the `where` argument doesn't exist, create a new Colaborador with this data.
     */
    create: XOR<ColaboradorCreateInput, ColaboradorUncheckedCreateInput>
    /**
     * In case the Colaborador was found with the provided `where` argument, update it with this data.
     */
    update: XOR<ColaboradorUpdateInput, ColaboradorUncheckedUpdateInput>
  }

  /**
   * Colaborador delete
   */
  export type ColaboradorDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Colaborador
     */
    select?: ColaboradorSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ColaboradorInclude<ExtArgs> | null
    /**
     * Filter which Colaborador to delete.
     */
    where: ColaboradorWhereUniqueInput
  }

  /**
   * Colaborador deleteMany
   */
  export type ColaboradorDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Colaboradors to delete
     */
    where?: ColaboradorWhereInput
  }

  /**
   * Colaborador.horario
   */
  export type Colaborador$horarioArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Horario
     */
    select?: HorarioSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: HorarioInclude<ExtArgs> | null
    where?: HorarioWhereInput
  }

  /**
   * Colaborador.registros
   */
  export type Colaborador$registrosArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Registro
     */
    select?: RegistroSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RegistroInclude<ExtArgs> | null
    where?: RegistroWhereInput
    orderBy?: RegistroOrderByWithRelationInput | RegistroOrderByWithRelationInput[]
    cursor?: RegistroWhereUniqueInput
    take?: number
    skip?: number
    distinct?: RegistroScalarFieldEnum | RegistroScalarFieldEnum[]
  }

  /**
   * Colaborador.permisos
   */
  export type Colaborador$permisosArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Permiso
     */
    select?: PermisoSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PermisoInclude<ExtArgs> | null
    where?: PermisoWhereInput
    orderBy?: PermisoOrderByWithRelationInput | PermisoOrderByWithRelationInput[]
    cursor?: PermisoWhereUniqueInput
    take?: number
    skip?: number
    distinct?: PermisoScalarFieldEnum | PermisoScalarFieldEnum[]
  }

  /**
   * Colaborador without action
   */
  export type ColaboradorDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Colaborador
     */
    select?: ColaboradorSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ColaboradorInclude<ExtArgs> | null
  }


  /**
   * Model Registro
   */

  export type AggregateRegistro = {
    _count: RegistroCountAggregateOutputType | null
    _min: RegistroMinAggregateOutputType | null
    _max: RegistroMaxAggregateOutputType | null
  }

  export type RegistroMinAggregateOutputType = {
    id: string | null
    colaboradorId: string | null
    fecha: Date | null
    entrada: Date | null
    salida: Date | null
    tipo: $Enums.TipoRegistro | null
    observacion: string | null
    fotoEntrada: string | null
    fotoSalida: string | null
    editadoPor: string | null
    editadoEn: Date | null
    creadoEn: Date | null
  }

  export type RegistroMaxAggregateOutputType = {
    id: string | null
    colaboradorId: string | null
    fecha: Date | null
    entrada: Date | null
    salida: Date | null
    tipo: $Enums.TipoRegistro | null
    observacion: string | null
    fotoEntrada: string | null
    fotoSalida: string | null
    editadoPor: string | null
    editadoEn: Date | null
    creadoEn: Date | null
  }

  export type RegistroCountAggregateOutputType = {
    id: number
    colaboradorId: number
    fecha: number
    entrada: number
    salida: number
    tipo: number
    observacion: number
    fotoEntrada: number
    fotoSalida: number
    editadoPor: number
    editadoEn: number
    creadoEn: number
    _all: number
  }


  export type RegistroMinAggregateInputType = {
    id?: true
    colaboradorId?: true
    fecha?: true
    entrada?: true
    salida?: true
    tipo?: true
    observacion?: true
    fotoEntrada?: true
    fotoSalida?: true
    editadoPor?: true
    editadoEn?: true
    creadoEn?: true
  }

  export type RegistroMaxAggregateInputType = {
    id?: true
    colaboradorId?: true
    fecha?: true
    entrada?: true
    salida?: true
    tipo?: true
    observacion?: true
    fotoEntrada?: true
    fotoSalida?: true
    editadoPor?: true
    editadoEn?: true
    creadoEn?: true
  }

  export type RegistroCountAggregateInputType = {
    id?: true
    colaboradorId?: true
    fecha?: true
    entrada?: true
    salida?: true
    tipo?: true
    observacion?: true
    fotoEntrada?: true
    fotoSalida?: true
    editadoPor?: true
    editadoEn?: true
    creadoEn?: true
    _all?: true
  }

  export type RegistroAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Registro to aggregate.
     */
    where?: RegistroWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Registros to fetch.
     */
    orderBy?: RegistroOrderByWithRelationInput | RegistroOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: RegistroWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Registros from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Registros.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Registros
    **/
    _count?: true | RegistroCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: RegistroMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: RegistroMaxAggregateInputType
  }

  export type GetRegistroAggregateType<T extends RegistroAggregateArgs> = {
        [P in keyof T & keyof AggregateRegistro]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateRegistro[P]>
      : GetScalarType<T[P], AggregateRegistro[P]>
  }




  export type RegistroGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: RegistroWhereInput
    orderBy?: RegistroOrderByWithAggregationInput | RegistroOrderByWithAggregationInput[]
    by: RegistroScalarFieldEnum[] | RegistroScalarFieldEnum
    having?: RegistroScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: RegistroCountAggregateInputType | true
    _min?: RegistroMinAggregateInputType
    _max?: RegistroMaxAggregateInputType
  }

  export type RegistroGroupByOutputType = {
    id: string
    colaboradorId: string
    fecha: Date
    entrada: Date | null
    salida: Date | null
    tipo: $Enums.TipoRegistro
    observacion: string | null
    fotoEntrada: string | null
    fotoSalida: string | null
    editadoPor: string | null
    editadoEn: Date | null
    creadoEn: Date
    _count: RegistroCountAggregateOutputType | null
    _min: RegistroMinAggregateOutputType | null
    _max: RegistroMaxAggregateOutputType | null
  }

  type GetRegistroGroupByPayload<T extends RegistroGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<RegistroGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof RegistroGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], RegistroGroupByOutputType[P]>
            : GetScalarType<T[P], RegistroGroupByOutputType[P]>
        }
      >
    >


  export type RegistroSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    colaboradorId?: boolean
    fecha?: boolean
    entrada?: boolean
    salida?: boolean
    tipo?: boolean
    observacion?: boolean
    fotoEntrada?: boolean
    fotoSalida?: boolean
    editadoPor?: boolean
    editadoEn?: boolean
    creadoEn?: boolean
    colaborador?: boolean | ColaboradorDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["registro"]>


  export type RegistroSelectScalar = {
    id?: boolean
    colaboradorId?: boolean
    fecha?: boolean
    entrada?: boolean
    salida?: boolean
    tipo?: boolean
    observacion?: boolean
    fotoEntrada?: boolean
    fotoSalida?: boolean
    editadoPor?: boolean
    editadoEn?: boolean
    creadoEn?: boolean
  }

  export type RegistroInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    colaborador?: boolean | ColaboradorDefaultArgs<ExtArgs>
  }

  export type $RegistroPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Registro"
    objects: {
      colaborador: Prisma.$ColaboradorPayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      colaboradorId: string
      fecha: Date
      entrada: Date | null
      salida: Date | null
      tipo: $Enums.TipoRegistro
      observacion: string | null
      fotoEntrada: string | null
      fotoSalida: string | null
      editadoPor: string | null
      editadoEn: Date | null
      creadoEn: Date
    }, ExtArgs["result"]["registro"]>
    composites: {}
  }

  type RegistroGetPayload<S extends boolean | null | undefined | RegistroDefaultArgs> = $Result.GetResult<Prisma.$RegistroPayload, S>

  type RegistroCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = 
    Omit<RegistroFindManyArgs, 'select' | 'include' | 'distinct'> & {
      select?: RegistroCountAggregateInputType | true
    }

  export interface RegistroDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Registro'], meta: { name: 'Registro' } }
    /**
     * Find zero or one Registro that matches the filter.
     * @param {RegistroFindUniqueArgs} args - Arguments to find a Registro
     * @example
     * // Get one Registro
     * const registro = await prisma.registro.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends RegistroFindUniqueArgs>(args: SelectSubset<T, RegistroFindUniqueArgs<ExtArgs>>): Prisma__RegistroClient<$Result.GetResult<Prisma.$RegistroPayload<ExtArgs>, T, "findUnique"> | null, null, ExtArgs>

    /**
     * Find one Registro that matches the filter or throw an error with `error.code='P2025'` 
     * if no matches were found.
     * @param {RegistroFindUniqueOrThrowArgs} args - Arguments to find a Registro
     * @example
     * // Get one Registro
     * const registro = await prisma.registro.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends RegistroFindUniqueOrThrowArgs>(args: SelectSubset<T, RegistroFindUniqueOrThrowArgs<ExtArgs>>): Prisma__RegistroClient<$Result.GetResult<Prisma.$RegistroPayload<ExtArgs>, T, "findUniqueOrThrow">, never, ExtArgs>

    /**
     * Find the first Registro that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RegistroFindFirstArgs} args - Arguments to find a Registro
     * @example
     * // Get one Registro
     * const registro = await prisma.registro.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends RegistroFindFirstArgs>(args?: SelectSubset<T, RegistroFindFirstArgs<ExtArgs>>): Prisma__RegistroClient<$Result.GetResult<Prisma.$RegistroPayload<ExtArgs>, T, "findFirst"> | null, null, ExtArgs>

    /**
     * Find the first Registro that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RegistroFindFirstOrThrowArgs} args - Arguments to find a Registro
     * @example
     * // Get one Registro
     * const registro = await prisma.registro.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends RegistroFindFirstOrThrowArgs>(args?: SelectSubset<T, RegistroFindFirstOrThrowArgs<ExtArgs>>): Prisma__RegistroClient<$Result.GetResult<Prisma.$RegistroPayload<ExtArgs>, T, "findFirstOrThrow">, never, ExtArgs>

    /**
     * Find zero or more Registros that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RegistroFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Registros
     * const registros = await prisma.registro.findMany()
     * 
     * // Get first 10 Registros
     * const registros = await prisma.registro.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const registroWithIdOnly = await prisma.registro.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends RegistroFindManyArgs>(args?: SelectSubset<T, RegistroFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$RegistroPayload<ExtArgs>, T, "findMany">>

    /**
     * Create a Registro.
     * @param {RegistroCreateArgs} args - Arguments to create a Registro.
     * @example
     * // Create one Registro
     * const Registro = await prisma.registro.create({
     *   data: {
     *     // ... data to create a Registro
     *   }
     * })
     * 
     */
    create<T extends RegistroCreateArgs>(args: SelectSubset<T, RegistroCreateArgs<ExtArgs>>): Prisma__RegistroClient<$Result.GetResult<Prisma.$RegistroPayload<ExtArgs>, T, "create">, never, ExtArgs>

    /**
     * Create many Registros.
     * @param {RegistroCreateManyArgs} args - Arguments to create many Registros.
     * @example
     * // Create many Registros
     * const registro = await prisma.registro.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends RegistroCreateManyArgs>(args?: SelectSubset<T, RegistroCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Delete a Registro.
     * @param {RegistroDeleteArgs} args - Arguments to delete one Registro.
     * @example
     * // Delete one Registro
     * const Registro = await prisma.registro.delete({
     *   where: {
     *     // ... filter to delete one Registro
     *   }
     * })
     * 
     */
    delete<T extends RegistroDeleteArgs>(args: SelectSubset<T, RegistroDeleteArgs<ExtArgs>>): Prisma__RegistroClient<$Result.GetResult<Prisma.$RegistroPayload<ExtArgs>, T, "delete">, never, ExtArgs>

    /**
     * Update one Registro.
     * @param {RegistroUpdateArgs} args - Arguments to update one Registro.
     * @example
     * // Update one Registro
     * const registro = await prisma.registro.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends RegistroUpdateArgs>(args: SelectSubset<T, RegistroUpdateArgs<ExtArgs>>): Prisma__RegistroClient<$Result.GetResult<Prisma.$RegistroPayload<ExtArgs>, T, "update">, never, ExtArgs>

    /**
     * Delete zero or more Registros.
     * @param {RegistroDeleteManyArgs} args - Arguments to filter Registros to delete.
     * @example
     * // Delete a few Registros
     * const { count } = await prisma.registro.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends RegistroDeleteManyArgs>(args?: SelectSubset<T, RegistroDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Registros.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RegistroUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Registros
     * const registro = await prisma.registro.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends RegistroUpdateManyArgs>(args: SelectSubset<T, RegistroUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one Registro.
     * @param {RegistroUpsertArgs} args - Arguments to update or create a Registro.
     * @example
     * // Update or create a Registro
     * const registro = await prisma.registro.upsert({
     *   create: {
     *     // ... data to create a Registro
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Registro we want to update
     *   }
     * })
     */
    upsert<T extends RegistroUpsertArgs>(args: SelectSubset<T, RegistroUpsertArgs<ExtArgs>>): Prisma__RegistroClient<$Result.GetResult<Prisma.$RegistroPayload<ExtArgs>, T, "upsert">, never, ExtArgs>


    /**
     * Count the number of Registros.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RegistroCountArgs} args - Arguments to filter Registros to count.
     * @example
     * // Count the number of Registros
     * const count = await prisma.registro.count({
     *   where: {
     *     // ... the filter for the Registros we want to count
     *   }
     * })
    **/
    count<T extends RegistroCountArgs>(
      args?: Subset<T, RegistroCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], RegistroCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Registro.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RegistroAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends RegistroAggregateArgs>(args: Subset<T, RegistroAggregateArgs>): Prisma.PrismaPromise<GetRegistroAggregateType<T>>

    /**
     * Group by Registro.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RegistroGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends RegistroGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: RegistroGroupByArgs['orderBy'] }
        : { orderBy?: RegistroGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, RegistroGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetRegistroGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Registro model
   */
  readonly fields: RegistroFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Registro.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__RegistroClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    colaborador<T extends ColaboradorDefaultArgs<ExtArgs> = {}>(args?: Subset<T, ColaboradorDefaultArgs<ExtArgs>>): Prisma__ColaboradorClient<$Result.GetResult<Prisma.$ColaboradorPayload<ExtArgs>, T, "findUniqueOrThrow"> | Null, Null, ExtArgs>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the Registro model
   */ 
  interface RegistroFieldRefs {
    readonly id: FieldRef<"Registro", 'String'>
    readonly colaboradorId: FieldRef<"Registro", 'String'>
    readonly fecha: FieldRef<"Registro", 'DateTime'>
    readonly entrada: FieldRef<"Registro", 'DateTime'>
    readonly salida: FieldRef<"Registro", 'DateTime'>
    readonly tipo: FieldRef<"Registro", 'TipoRegistro'>
    readonly observacion: FieldRef<"Registro", 'String'>
    readonly fotoEntrada: FieldRef<"Registro", 'String'>
    readonly fotoSalida: FieldRef<"Registro", 'String'>
    readonly editadoPor: FieldRef<"Registro", 'String'>
    readonly editadoEn: FieldRef<"Registro", 'DateTime'>
    readonly creadoEn: FieldRef<"Registro", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * Registro findUnique
   */
  export type RegistroFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Registro
     */
    select?: RegistroSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RegistroInclude<ExtArgs> | null
    /**
     * Filter, which Registro to fetch.
     */
    where: RegistroWhereUniqueInput
  }

  /**
   * Registro findUniqueOrThrow
   */
  export type RegistroFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Registro
     */
    select?: RegistroSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RegistroInclude<ExtArgs> | null
    /**
     * Filter, which Registro to fetch.
     */
    where: RegistroWhereUniqueInput
  }

  /**
   * Registro findFirst
   */
  export type RegistroFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Registro
     */
    select?: RegistroSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RegistroInclude<ExtArgs> | null
    /**
     * Filter, which Registro to fetch.
     */
    where?: RegistroWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Registros to fetch.
     */
    orderBy?: RegistroOrderByWithRelationInput | RegistroOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Registros.
     */
    cursor?: RegistroWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Registros from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Registros.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Registros.
     */
    distinct?: RegistroScalarFieldEnum | RegistroScalarFieldEnum[]
  }

  /**
   * Registro findFirstOrThrow
   */
  export type RegistroFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Registro
     */
    select?: RegistroSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RegistroInclude<ExtArgs> | null
    /**
     * Filter, which Registro to fetch.
     */
    where?: RegistroWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Registros to fetch.
     */
    orderBy?: RegistroOrderByWithRelationInput | RegistroOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Registros.
     */
    cursor?: RegistroWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Registros from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Registros.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Registros.
     */
    distinct?: RegistroScalarFieldEnum | RegistroScalarFieldEnum[]
  }

  /**
   * Registro findMany
   */
  export type RegistroFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Registro
     */
    select?: RegistroSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RegistroInclude<ExtArgs> | null
    /**
     * Filter, which Registros to fetch.
     */
    where?: RegistroWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Registros to fetch.
     */
    orderBy?: RegistroOrderByWithRelationInput | RegistroOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Registros.
     */
    cursor?: RegistroWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Registros from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Registros.
     */
    skip?: number
    distinct?: RegistroScalarFieldEnum | RegistroScalarFieldEnum[]
  }

  /**
   * Registro create
   */
  export type RegistroCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Registro
     */
    select?: RegistroSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RegistroInclude<ExtArgs> | null
    /**
     * The data needed to create a Registro.
     */
    data: XOR<RegistroCreateInput, RegistroUncheckedCreateInput>
  }

  /**
   * Registro createMany
   */
  export type RegistroCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Registros.
     */
    data: RegistroCreateManyInput | RegistroCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Registro update
   */
  export type RegistroUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Registro
     */
    select?: RegistroSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RegistroInclude<ExtArgs> | null
    /**
     * The data needed to update a Registro.
     */
    data: XOR<RegistroUpdateInput, RegistroUncheckedUpdateInput>
    /**
     * Choose, which Registro to update.
     */
    where: RegistroWhereUniqueInput
  }

  /**
   * Registro updateMany
   */
  export type RegistroUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Registros.
     */
    data: XOR<RegistroUpdateManyMutationInput, RegistroUncheckedUpdateManyInput>
    /**
     * Filter which Registros to update
     */
    where?: RegistroWhereInput
  }

  /**
   * Registro upsert
   */
  export type RegistroUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Registro
     */
    select?: RegistroSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RegistroInclude<ExtArgs> | null
    /**
     * The filter to search for the Registro to update in case it exists.
     */
    where: RegistroWhereUniqueInput
    /**
     * In case the Registro found by the `where` argument doesn't exist, create a new Registro with this data.
     */
    create: XOR<RegistroCreateInput, RegistroUncheckedCreateInput>
    /**
     * In case the Registro was found with the provided `where` argument, update it with this data.
     */
    update: XOR<RegistroUpdateInput, RegistroUncheckedUpdateInput>
  }

  /**
   * Registro delete
   */
  export type RegistroDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Registro
     */
    select?: RegistroSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RegistroInclude<ExtArgs> | null
    /**
     * Filter which Registro to delete.
     */
    where: RegistroWhereUniqueInput
  }

  /**
   * Registro deleteMany
   */
  export type RegistroDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Registros to delete
     */
    where?: RegistroWhereInput
  }

  /**
   * Registro without action
   */
  export type RegistroDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Registro
     */
    select?: RegistroSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RegistroInclude<ExtArgs> | null
  }


  /**
   * Model Permiso
   */

  export type AggregatePermiso = {
    _count: PermisoCountAggregateOutputType | null
    _min: PermisoMinAggregateOutputType | null
    _max: PermisoMaxAggregateOutputType | null
  }

  export type PermisoMinAggregateOutputType = {
    id: string | null
    colaboradorId: string | null
    fechaInicio: Date | null
    fechaFin: Date | null
    tipo: $Enums.TipoPermiso | null
    descripcion: string | null
    aprobado: boolean | null
    creadoEn: Date | null
  }

  export type PermisoMaxAggregateOutputType = {
    id: string | null
    colaboradorId: string | null
    fechaInicio: Date | null
    fechaFin: Date | null
    tipo: $Enums.TipoPermiso | null
    descripcion: string | null
    aprobado: boolean | null
    creadoEn: Date | null
  }

  export type PermisoCountAggregateOutputType = {
    id: number
    colaboradorId: number
    fechaInicio: number
    fechaFin: number
    tipo: number
    descripcion: number
    aprobado: number
    creadoEn: number
    _all: number
  }


  export type PermisoMinAggregateInputType = {
    id?: true
    colaboradorId?: true
    fechaInicio?: true
    fechaFin?: true
    tipo?: true
    descripcion?: true
    aprobado?: true
    creadoEn?: true
  }

  export type PermisoMaxAggregateInputType = {
    id?: true
    colaboradorId?: true
    fechaInicio?: true
    fechaFin?: true
    tipo?: true
    descripcion?: true
    aprobado?: true
    creadoEn?: true
  }

  export type PermisoCountAggregateInputType = {
    id?: true
    colaboradorId?: true
    fechaInicio?: true
    fechaFin?: true
    tipo?: true
    descripcion?: true
    aprobado?: true
    creadoEn?: true
    _all?: true
  }

  export type PermisoAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Permiso to aggregate.
     */
    where?: PermisoWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Permisos to fetch.
     */
    orderBy?: PermisoOrderByWithRelationInput | PermisoOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: PermisoWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Permisos from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Permisos.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Permisos
    **/
    _count?: true | PermisoCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: PermisoMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: PermisoMaxAggregateInputType
  }

  export type GetPermisoAggregateType<T extends PermisoAggregateArgs> = {
        [P in keyof T & keyof AggregatePermiso]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregatePermiso[P]>
      : GetScalarType<T[P], AggregatePermiso[P]>
  }




  export type PermisoGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: PermisoWhereInput
    orderBy?: PermisoOrderByWithAggregationInput | PermisoOrderByWithAggregationInput[]
    by: PermisoScalarFieldEnum[] | PermisoScalarFieldEnum
    having?: PermisoScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: PermisoCountAggregateInputType | true
    _min?: PermisoMinAggregateInputType
    _max?: PermisoMaxAggregateInputType
  }

  export type PermisoGroupByOutputType = {
    id: string
    colaboradorId: string
    fechaInicio: Date
    fechaFin: Date
    tipo: $Enums.TipoPermiso
    descripcion: string | null
    aprobado: boolean
    creadoEn: Date
    _count: PermisoCountAggregateOutputType | null
    _min: PermisoMinAggregateOutputType | null
    _max: PermisoMaxAggregateOutputType | null
  }

  type GetPermisoGroupByPayload<T extends PermisoGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<PermisoGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof PermisoGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], PermisoGroupByOutputType[P]>
            : GetScalarType<T[P], PermisoGroupByOutputType[P]>
        }
      >
    >


  export type PermisoSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    colaboradorId?: boolean
    fechaInicio?: boolean
    fechaFin?: boolean
    tipo?: boolean
    descripcion?: boolean
    aprobado?: boolean
    creadoEn?: boolean
    colaborador?: boolean | ColaboradorDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["permiso"]>


  export type PermisoSelectScalar = {
    id?: boolean
    colaboradorId?: boolean
    fechaInicio?: boolean
    fechaFin?: boolean
    tipo?: boolean
    descripcion?: boolean
    aprobado?: boolean
    creadoEn?: boolean
  }

  export type PermisoInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    colaborador?: boolean | ColaboradorDefaultArgs<ExtArgs>
  }

  export type $PermisoPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Permiso"
    objects: {
      colaborador: Prisma.$ColaboradorPayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      colaboradorId: string
      fechaInicio: Date
      fechaFin: Date
      tipo: $Enums.TipoPermiso
      descripcion: string | null
      aprobado: boolean
      creadoEn: Date
    }, ExtArgs["result"]["permiso"]>
    composites: {}
  }

  type PermisoGetPayload<S extends boolean | null | undefined | PermisoDefaultArgs> = $Result.GetResult<Prisma.$PermisoPayload, S>

  type PermisoCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = 
    Omit<PermisoFindManyArgs, 'select' | 'include' | 'distinct'> & {
      select?: PermisoCountAggregateInputType | true
    }

  export interface PermisoDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Permiso'], meta: { name: 'Permiso' } }
    /**
     * Find zero or one Permiso that matches the filter.
     * @param {PermisoFindUniqueArgs} args - Arguments to find a Permiso
     * @example
     * // Get one Permiso
     * const permiso = await prisma.permiso.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends PermisoFindUniqueArgs>(args: SelectSubset<T, PermisoFindUniqueArgs<ExtArgs>>): Prisma__PermisoClient<$Result.GetResult<Prisma.$PermisoPayload<ExtArgs>, T, "findUnique"> | null, null, ExtArgs>

    /**
     * Find one Permiso that matches the filter or throw an error with `error.code='P2025'` 
     * if no matches were found.
     * @param {PermisoFindUniqueOrThrowArgs} args - Arguments to find a Permiso
     * @example
     * // Get one Permiso
     * const permiso = await prisma.permiso.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends PermisoFindUniqueOrThrowArgs>(args: SelectSubset<T, PermisoFindUniqueOrThrowArgs<ExtArgs>>): Prisma__PermisoClient<$Result.GetResult<Prisma.$PermisoPayload<ExtArgs>, T, "findUniqueOrThrow">, never, ExtArgs>

    /**
     * Find the first Permiso that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PermisoFindFirstArgs} args - Arguments to find a Permiso
     * @example
     * // Get one Permiso
     * const permiso = await prisma.permiso.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends PermisoFindFirstArgs>(args?: SelectSubset<T, PermisoFindFirstArgs<ExtArgs>>): Prisma__PermisoClient<$Result.GetResult<Prisma.$PermisoPayload<ExtArgs>, T, "findFirst"> | null, null, ExtArgs>

    /**
     * Find the first Permiso that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PermisoFindFirstOrThrowArgs} args - Arguments to find a Permiso
     * @example
     * // Get one Permiso
     * const permiso = await prisma.permiso.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends PermisoFindFirstOrThrowArgs>(args?: SelectSubset<T, PermisoFindFirstOrThrowArgs<ExtArgs>>): Prisma__PermisoClient<$Result.GetResult<Prisma.$PermisoPayload<ExtArgs>, T, "findFirstOrThrow">, never, ExtArgs>

    /**
     * Find zero or more Permisos that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PermisoFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Permisos
     * const permisos = await prisma.permiso.findMany()
     * 
     * // Get first 10 Permisos
     * const permisos = await prisma.permiso.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const permisoWithIdOnly = await prisma.permiso.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends PermisoFindManyArgs>(args?: SelectSubset<T, PermisoFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$PermisoPayload<ExtArgs>, T, "findMany">>

    /**
     * Create a Permiso.
     * @param {PermisoCreateArgs} args - Arguments to create a Permiso.
     * @example
     * // Create one Permiso
     * const Permiso = await prisma.permiso.create({
     *   data: {
     *     // ... data to create a Permiso
     *   }
     * })
     * 
     */
    create<T extends PermisoCreateArgs>(args: SelectSubset<T, PermisoCreateArgs<ExtArgs>>): Prisma__PermisoClient<$Result.GetResult<Prisma.$PermisoPayload<ExtArgs>, T, "create">, never, ExtArgs>

    /**
     * Create many Permisos.
     * @param {PermisoCreateManyArgs} args - Arguments to create many Permisos.
     * @example
     * // Create many Permisos
     * const permiso = await prisma.permiso.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends PermisoCreateManyArgs>(args?: SelectSubset<T, PermisoCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Delete a Permiso.
     * @param {PermisoDeleteArgs} args - Arguments to delete one Permiso.
     * @example
     * // Delete one Permiso
     * const Permiso = await prisma.permiso.delete({
     *   where: {
     *     // ... filter to delete one Permiso
     *   }
     * })
     * 
     */
    delete<T extends PermisoDeleteArgs>(args: SelectSubset<T, PermisoDeleteArgs<ExtArgs>>): Prisma__PermisoClient<$Result.GetResult<Prisma.$PermisoPayload<ExtArgs>, T, "delete">, never, ExtArgs>

    /**
     * Update one Permiso.
     * @param {PermisoUpdateArgs} args - Arguments to update one Permiso.
     * @example
     * // Update one Permiso
     * const permiso = await prisma.permiso.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends PermisoUpdateArgs>(args: SelectSubset<T, PermisoUpdateArgs<ExtArgs>>): Prisma__PermisoClient<$Result.GetResult<Prisma.$PermisoPayload<ExtArgs>, T, "update">, never, ExtArgs>

    /**
     * Delete zero or more Permisos.
     * @param {PermisoDeleteManyArgs} args - Arguments to filter Permisos to delete.
     * @example
     * // Delete a few Permisos
     * const { count } = await prisma.permiso.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends PermisoDeleteManyArgs>(args?: SelectSubset<T, PermisoDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Permisos.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PermisoUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Permisos
     * const permiso = await prisma.permiso.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends PermisoUpdateManyArgs>(args: SelectSubset<T, PermisoUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one Permiso.
     * @param {PermisoUpsertArgs} args - Arguments to update or create a Permiso.
     * @example
     * // Update or create a Permiso
     * const permiso = await prisma.permiso.upsert({
     *   create: {
     *     // ... data to create a Permiso
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Permiso we want to update
     *   }
     * })
     */
    upsert<T extends PermisoUpsertArgs>(args: SelectSubset<T, PermisoUpsertArgs<ExtArgs>>): Prisma__PermisoClient<$Result.GetResult<Prisma.$PermisoPayload<ExtArgs>, T, "upsert">, never, ExtArgs>


    /**
     * Count the number of Permisos.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PermisoCountArgs} args - Arguments to filter Permisos to count.
     * @example
     * // Count the number of Permisos
     * const count = await prisma.permiso.count({
     *   where: {
     *     // ... the filter for the Permisos we want to count
     *   }
     * })
    **/
    count<T extends PermisoCountArgs>(
      args?: Subset<T, PermisoCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], PermisoCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Permiso.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PermisoAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends PermisoAggregateArgs>(args: Subset<T, PermisoAggregateArgs>): Prisma.PrismaPromise<GetPermisoAggregateType<T>>

    /**
     * Group by Permiso.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PermisoGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends PermisoGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: PermisoGroupByArgs['orderBy'] }
        : { orderBy?: PermisoGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, PermisoGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetPermisoGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Permiso model
   */
  readonly fields: PermisoFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Permiso.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__PermisoClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    colaborador<T extends ColaboradorDefaultArgs<ExtArgs> = {}>(args?: Subset<T, ColaboradorDefaultArgs<ExtArgs>>): Prisma__ColaboradorClient<$Result.GetResult<Prisma.$ColaboradorPayload<ExtArgs>, T, "findUniqueOrThrow"> | Null, Null, ExtArgs>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the Permiso model
   */ 
  interface PermisoFieldRefs {
    readonly id: FieldRef<"Permiso", 'String'>
    readonly colaboradorId: FieldRef<"Permiso", 'String'>
    readonly fechaInicio: FieldRef<"Permiso", 'DateTime'>
    readonly fechaFin: FieldRef<"Permiso", 'DateTime'>
    readonly tipo: FieldRef<"Permiso", 'TipoPermiso'>
    readonly descripcion: FieldRef<"Permiso", 'String'>
    readonly aprobado: FieldRef<"Permiso", 'Boolean'>
    readonly creadoEn: FieldRef<"Permiso", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * Permiso findUnique
   */
  export type PermisoFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Permiso
     */
    select?: PermisoSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PermisoInclude<ExtArgs> | null
    /**
     * Filter, which Permiso to fetch.
     */
    where: PermisoWhereUniqueInput
  }

  /**
   * Permiso findUniqueOrThrow
   */
  export type PermisoFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Permiso
     */
    select?: PermisoSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PermisoInclude<ExtArgs> | null
    /**
     * Filter, which Permiso to fetch.
     */
    where: PermisoWhereUniqueInput
  }

  /**
   * Permiso findFirst
   */
  export type PermisoFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Permiso
     */
    select?: PermisoSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PermisoInclude<ExtArgs> | null
    /**
     * Filter, which Permiso to fetch.
     */
    where?: PermisoWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Permisos to fetch.
     */
    orderBy?: PermisoOrderByWithRelationInput | PermisoOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Permisos.
     */
    cursor?: PermisoWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Permisos from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Permisos.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Permisos.
     */
    distinct?: PermisoScalarFieldEnum | PermisoScalarFieldEnum[]
  }

  /**
   * Permiso findFirstOrThrow
   */
  export type PermisoFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Permiso
     */
    select?: PermisoSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PermisoInclude<ExtArgs> | null
    /**
     * Filter, which Permiso to fetch.
     */
    where?: PermisoWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Permisos to fetch.
     */
    orderBy?: PermisoOrderByWithRelationInput | PermisoOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Permisos.
     */
    cursor?: PermisoWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Permisos from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Permisos.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Permisos.
     */
    distinct?: PermisoScalarFieldEnum | PermisoScalarFieldEnum[]
  }

  /**
   * Permiso findMany
   */
  export type PermisoFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Permiso
     */
    select?: PermisoSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PermisoInclude<ExtArgs> | null
    /**
     * Filter, which Permisos to fetch.
     */
    where?: PermisoWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Permisos to fetch.
     */
    orderBy?: PermisoOrderByWithRelationInput | PermisoOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Permisos.
     */
    cursor?: PermisoWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Permisos from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Permisos.
     */
    skip?: number
    distinct?: PermisoScalarFieldEnum | PermisoScalarFieldEnum[]
  }

  /**
   * Permiso create
   */
  export type PermisoCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Permiso
     */
    select?: PermisoSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PermisoInclude<ExtArgs> | null
    /**
     * The data needed to create a Permiso.
     */
    data: XOR<PermisoCreateInput, PermisoUncheckedCreateInput>
  }

  /**
   * Permiso createMany
   */
  export type PermisoCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Permisos.
     */
    data: PermisoCreateManyInput | PermisoCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Permiso update
   */
  export type PermisoUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Permiso
     */
    select?: PermisoSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PermisoInclude<ExtArgs> | null
    /**
     * The data needed to update a Permiso.
     */
    data: XOR<PermisoUpdateInput, PermisoUncheckedUpdateInput>
    /**
     * Choose, which Permiso to update.
     */
    where: PermisoWhereUniqueInput
  }

  /**
   * Permiso updateMany
   */
  export type PermisoUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Permisos.
     */
    data: XOR<PermisoUpdateManyMutationInput, PermisoUncheckedUpdateManyInput>
    /**
     * Filter which Permisos to update
     */
    where?: PermisoWhereInput
  }

  /**
   * Permiso upsert
   */
  export type PermisoUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Permiso
     */
    select?: PermisoSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PermisoInclude<ExtArgs> | null
    /**
     * The filter to search for the Permiso to update in case it exists.
     */
    where: PermisoWhereUniqueInput
    /**
     * In case the Permiso found by the `where` argument doesn't exist, create a new Permiso with this data.
     */
    create: XOR<PermisoCreateInput, PermisoUncheckedCreateInput>
    /**
     * In case the Permiso was found with the provided `where` argument, update it with this data.
     */
    update: XOR<PermisoUpdateInput, PermisoUncheckedUpdateInput>
  }

  /**
   * Permiso delete
   */
  export type PermisoDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Permiso
     */
    select?: PermisoSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PermisoInclude<ExtArgs> | null
    /**
     * Filter which Permiso to delete.
     */
    where: PermisoWhereUniqueInput
  }

  /**
   * Permiso deleteMany
   */
  export type PermisoDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Permisos to delete
     */
    where?: PermisoWhereInput
  }

  /**
   * Permiso without action
   */
  export type PermisoDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Permiso
     */
    select?: PermisoSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PermisoInclude<ExtArgs> | null
  }


  /**
   * Model DiaFestivo
   */

  export type AggregateDiaFestivo = {
    _count: DiaFestivoCountAggregateOutputType | null
    _min: DiaFestivoMinAggregateOutputType | null
    _max: DiaFestivoMaxAggregateOutputType | null
  }

  export type DiaFestivoMinAggregateOutputType = {
    id: string | null
    empresaId: string | null
    fecha: Date | null
    nombre: string | null
    creadoEn: Date | null
  }

  export type DiaFestivoMaxAggregateOutputType = {
    id: string | null
    empresaId: string | null
    fecha: Date | null
    nombre: string | null
    creadoEn: Date | null
  }

  export type DiaFestivoCountAggregateOutputType = {
    id: number
    empresaId: number
    fecha: number
    nombre: number
    creadoEn: number
    _all: number
  }


  export type DiaFestivoMinAggregateInputType = {
    id?: true
    empresaId?: true
    fecha?: true
    nombre?: true
    creadoEn?: true
  }

  export type DiaFestivoMaxAggregateInputType = {
    id?: true
    empresaId?: true
    fecha?: true
    nombre?: true
    creadoEn?: true
  }

  export type DiaFestivoCountAggregateInputType = {
    id?: true
    empresaId?: true
    fecha?: true
    nombre?: true
    creadoEn?: true
    _all?: true
  }

  export type DiaFestivoAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which DiaFestivo to aggregate.
     */
    where?: DiaFestivoWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of DiaFestivos to fetch.
     */
    orderBy?: DiaFestivoOrderByWithRelationInput | DiaFestivoOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: DiaFestivoWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` DiaFestivos from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` DiaFestivos.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned DiaFestivos
    **/
    _count?: true | DiaFestivoCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: DiaFestivoMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: DiaFestivoMaxAggregateInputType
  }

  export type GetDiaFestivoAggregateType<T extends DiaFestivoAggregateArgs> = {
        [P in keyof T & keyof AggregateDiaFestivo]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateDiaFestivo[P]>
      : GetScalarType<T[P], AggregateDiaFestivo[P]>
  }




  export type DiaFestivoGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: DiaFestivoWhereInput
    orderBy?: DiaFestivoOrderByWithAggregationInput | DiaFestivoOrderByWithAggregationInput[]
    by: DiaFestivoScalarFieldEnum[] | DiaFestivoScalarFieldEnum
    having?: DiaFestivoScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: DiaFestivoCountAggregateInputType | true
    _min?: DiaFestivoMinAggregateInputType
    _max?: DiaFestivoMaxAggregateInputType
  }

  export type DiaFestivoGroupByOutputType = {
    id: string
    empresaId: string | null
    fecha: Date
    nombre: string
    creadoEn: Date
    _count: DiaFestivoCountAggregateOutputType | null
    _min: DiaFestivoMinAggregateOutputType | null
    _max: DiaFestivoMaxAggregateOutputType | null
  }

  type GetDiaFestivoGroupByPayload<T extends DiaFestivoGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<DiaFestivoGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof DiaFestivoGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], DiaFestivoGroupByOutputType[P]>
            : GetScalarType<T[P], DiaFestivoGroupByOutputType[P]>
        }
      >
    >


  export type DiaFestivoSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    empresaId?: boolean
    fecha?: boolean
    nombre?: boolean
    creadoEn?: boolean
    empresa?: boolean | DiaFestivo$empresaArgs<ExtArgs>
  }, ExtArgs["result"]["diaFestivo"]>


  export type DiaFestivoSelectScalar = {
    id?: boolean
    empresaId?: boolean
    fecha?: boolean
    nombre?: boolean
    creadoEn?: boolean
  }

  export type DiaFestivoInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    empresa?: boolean | DiaFestivo$empresaArgs<ExtArgs>
  }

  export type $DiaFestivoPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "DiaFestivo"
    objects: {
      empresa: Prisma.$EmpresaPayload<ExtArgs> | null
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      empresaId: string | null
      fecha: Date
      nombre: string
      creadoEn: Date
    }, ExtArgs["result"]["diaFestivo"]>
    composites: {}
  }

  type DiaFestivoGetPayload<S extends boolean | null | undefined | DiaFestivoDefaultArgs> = $Result.GetResult<Prisma.$DiaFestivoPayload, S>

  type DiaFestivoCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = 
    Omit<DiaFestivoFindManyArgs, 'select' | 'include' | 'distinct'> & {
      select?: DiaFestivoCountAggregateInputType | true
    }

  export interface DiaFestivoDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['DiaFestivo'], meta: { name: 'DiaFestivo' } }
    /**
     * Find zero or one DiaFestivo that matches the filter.
     * @param {DiaFestivoFindUniqueArgs} args - Arguments to find a DiaFestivo
     * @example
     * // Get one DiaFestivo
     * const diaFestivo = await prisma.diaFestivo.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends DiaFestivoFindUniqueArgs>(args: SelectSubset<T, DiaFestivoFindUniqueArgs<ExtArgs>>): Prisma__DiaFestivoClient<$Result.GetResult<Prisma.$DiaFestivoPayload<ExtArgs>, T, "findUnique"> | null, null, ExtArgs>

    /**
     * Find one DiaFestivo that matches the filter or throw an error with `error.code='P2025'` 
     * if no matches were found.
     * @param {DiaFestivoFindUniqueOrThrowArgs} args - Arguments to find a DiaFestivo
     * @example
     * // Get one DiaFestivo
     * const diaFestivo = await prisma.diaFestivo.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends DiaFestivoFindUniqueOrThrowArgs>(args: SelectSubset<T, DiaFestivoFindUniqueOrThrowArgs<ExtArgs>>): Prisma__DiaFestivoClient<$Result.GetResult<Prisma.$DiaFestivoPayload<ExtArgs>, T, "findUniqueOrThrow">, never, ExtArgs>

    /**
     * Find the first DiaFestivo that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {DiaFestivoFindFirstArgs} args - Arguments to find a DiaFestivo
     * @example
     * // Get one DiaFestivo
     * const diaFestivo = await prisma.diaFestivo.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends DiaFestivoFindFirstArgs>(args?: SelectSubset<T, DiaFestivoFindFirstArgs<ExtArgs>>): Prisma__DiaFestivoClient<$Result.GetResult<Prisma.$DiaFestivoPayload<ExtArgs>, T, "findFirst"> | null, null, ExtArgs>

    /**
     * Find the first DiaFestivo that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {DiaFestivoFindFirstOrThrowArgs} args - Arguments to find a DiaFestivo
     * @example
     * // Get one DiaFestivo
     * const diaFestivo = await prisma.diaFestivo.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends DiaFestivoFindFirstOrThrowArgs>(args?: SelectSubset<T, DiaFestivoFindFirstOrThrowArgs<ExtArgs>>): Prisma__DiaFestivoClient<$Result.GetResult<Prisma.$DiaFestivoPayload<ExtArgs>, T, "findFirstOrThrow">, never, ExtArgs>

    /**
     * Find zero or more DiaFestivos that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {DiaFestivoFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all DiaFestivos
     * const diaFestivos = await prisma.diaFestivo.findMany()
     * 
     * // Get first 10 DiaFestivos
     * const diaFestivos = await prisma.diaFestivo.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const diaFestivoWithIdOnly = await prisma.diaFestivo.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends DiaFestivoFindManyArgs>(args?: SelectSubset<T, DiaFestivoFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$DiaFestivoPayload<ExtArgs>, T, "findMany">>

    /**
     * Create a DiaFestivo.
     * @param {DiaFestivoCreateArgs} args - Arguments to create a DiaFestivo.
     * @example
     * // Create one DiaFestivo
     * const DiaFestivo = await prisma.diaFestivo.create({
     *   data: {
     *     // ... data to create a DiaFestivo
     *   }
     * })
     * 
     */
    create<T extends DiaFestivoCreateArgs>(args: SelectSubset<T, DiaFestivoCreateArgs<ExtArgs>>): Prisma__DiaFestivoClient<$Result.GetResult<Prisma.$DiaFestivoPayload<ExtArgs>, T, "create">, never, ExtArgs>

    /**
     * Create many DiaFestivos.
     * @param {DiaFestivoCreateManyArgs} args - Arguments to create many DiaFestivos.
     * @example
     * // Create many DiaFestivos
     * const diaFestivo = await prisma.diaFestivo.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends DiaFestivoCreateManyArgs>(args?: SelectSubset<T, DiaFestivoCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Delete a DiaFestivo.
     * @param {DiaFestivoDeleteArgs} args - Arguments to delete one DiaFestivo.
     * @example
     * // Delete one DiaFestivo
     * const DiaFestivo = await prisma.diaFestivo.delete({
     *   where: {
     *     // ... filter to delete one DiaFestivo
     *   }
     * })
     * 
     */
    delete<T extends DiaFestivoDeleteArgs>(args: SelectSubset<T, DiaFestivoDeleteArgs<ExtArgs>>): Prisma__DiaFestivoClient<$Result.GetResult<Prisma.$DiaFestivoPayload<ExtArgs>, T, "delete">, never, ExtArgs>

    /**
     * Update one DiaFestivo.
     * @param {DiaFestivoUpdateArgs} args - Arguments to update one DiaFestivo.
     * @example
     * // Update one DiaFestivo
     * const diaFestivo = await prisma.diaFestivo.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends DiaFestivoUpdateArgs>(args: SelectSubset<T, DiaFestivoUpdateArgs<ExtArgs>>): Prisma__DiaFestivoClient<$Result.GetResult<Prisma.$DiaFestivoPayload<ExtArgs>, T, "update">, never, ExtArgs>

    /**
     * Delete zero or more DiaFestivos.
     * @param {DiaFestivoDeleteManyArgs} args - Arguments to filter DiaFestivos to delete.
     * @example
     * // Delete a few DiaFestivos
     * const { count } = await prisma.diaFestivo.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends DiaFestivoDeleteManyArgs>(args?: SelectSubset<T, DiaFestivoDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more DiaFestivos.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {DiaFestivoUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many DiaFestivos
     * const diaFestivo = await prisma.diaFestivo.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends DiaFestivoUpdateManyArgs>(args: SelectSubset<T, DiaFestivoUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one DiaFestivo.
     * @param {DiaFestivoUpsertArgs} args - Arguments to update or create a DiaFestivo.
     * @example
     * // Update or create a DiaFestivo
     * const diaFestivo = await prisma.diaFestivo.upsert({
     *   create: {
     *     // ... data to create a DiaFestivo
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the DiaFestivo we want to update
     *   }
     * })
     */
    upsert<T extends DiaFestivoUpsertArgs>(args: SelectSubset<T, DiaFestivoUpsertArgs<ExtArgs>>): Prisma__DiaFestivoClient<$Result.GetResult<Prisma.$DiaFestivoPayload<ExtArgs>, T, "upsert">, never, ExtArgs>


    /**
     * Count the number of DiaFestivos.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {DiaFestivoCountArgs} args - Arguments to filter DiaFestivos to count.
     * @example
     * // Count the number of DiaFestivos
     * const count = await prisma.diaFestivo.count({
     *   where: {
     *     // ... the filter for the DiaFestivos we want to count
     *   }
     * })
    **/
    count<T extends DiaFestivoCountArgs>(
      args?: Subset<T, DiaFestivoCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], DiaFestivoCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a DiaFestivo.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {DiaFestivoAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends DiaFestivoAggregateArgs>(args: Subset<T, DiaFestivoAggregateArgs>): Prisma.PrismaPromise<GetDiaFestivoAggregateType<T>>

    /**
     * Group by DiaFestivo.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {DiaFestivoGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends DiaFestivoGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: DiaFestivoGroupByArgs['orderBy'] }
        : { orderBy?: DiaFestivoGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, DiaFestivoGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetDiaFestivoGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the DiaFestivo model
   */
  readonly fields: DiaFestivoFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for DiaFestivo.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__DiaFestivoClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    empresa<T extends DiaFestivo$empresaArgs<ExtArgs> = {}>(args?: Subset<T, DiaFestivo$empresaArgs<ExtArgs>>): Prisma__EmpresaClient<$Result.GetResult<Prisma.$EmpresaPayload<ExtArgs>, T, "findUniqueOrThrow"> | null, null, ExtArgs>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the DiaFestivo model
   */ 
  interface DiaFestivoFieldRefs {
    readonly id: FieldRef<"DiaFestivo", 'String'>
    readonly empresaId: FieldRef<"DiaFestivo", 'String'>
    readonly fecha: FieldRef<"DiaFestivo", 'DateTime'>
    readonly nombre: FieldRef<"DiaFestivo", 'String'>
    readonly creadoEn: FieldRef<"DiaFestivo", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * DiaFestivo findUnique
   */
  export type DiaFestivoFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the DiaFestivo
     */
    select?: DiaFestivoSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: DiaFestivoInclude<ExtArgs> | null
    /**
     * Filter, which DiaFestivo to fetch.
     */
    where: DiaFestivoWhereUniqueInput
  }

  /**
   * DiaFestivo findUniqueOrThrow
   */
  export type DiaFestivoFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the DiaFestivo
     */
    select?: DiaFestivoSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: DiaFestivoInclude<ExtArgs> | null
    /**
     * Filter, which DiaFestivo to fetch.
     */
    where: DiaFestivoWhereUniqueInput
  }

  /**
   * DiaFestivo findFirst
   */
  export type DiaFestivoFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the DiaFestivo
     */
    select?: DiaFestivoSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: DiaFestivoInclude<ExtArgs> | null
    /**
     * Filter, which DiaFestivo to fetch.
     */
    where?: DiaFestivoWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of DiaFestivos to fetch.
     */
    orderBy?: DiaFestivoOrderByWithRelationInput | DiaFestivoOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for DiaFestivos.
     */
    cursor?: DiaFestivoWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` DiaFestivos from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` DiaFestivos.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of DiaFestivos.
     */
    distinct?: DiaFestivoScalarFieldEnum | DiaFestivoScalarFieldEnum[]
  }

  /**
   * DiaFestivo findFirstOrThrow
   */
  export type DiaFestivoFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the DiaFestivo
     */
    select?: DiaFestivoSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: DiaFestivoInclude<ExtArgs> | null
    /**
     * Filter, which DiaFestivo to fetch.
     */
    where?: DiaFestivoWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of DiaFestivos to fetch.
     */
    orderBy?: DiaFestivoOrderByWithRelationInput | DiaFestivoOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for DiaFestivos.
     */
    cursor?: DiaFestivoWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` DiaFestivos from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` DiaFestivos.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of DiaFestivos.
     */
    distinct?: DiaFestivoScalarFieldEnum | DiaFestivoScalarFieldEnum[]
  }

  /**
   * DiaFestivo findMany
   */
  export type DiaFestivoFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the DiaFestivo
     */
    select?: DiaFestivoSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: DiaFestivoInclude<ExtArgs> | null
    /**
     * Filter, which DiaFestivos to fetch.
     */
    where?: DiaFestivoWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of DiaFestivos to fetch.
     */
    orderBy?: DiaFestivoOrderByWithRelationInput | DiaFestivoOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing DiaFestivos.
     */
    cursor?: DiaFestivoWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` DiaFestivos from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` DiaFestivos.
     */
    skip?: number
    distinct?: DiaFestivoScalarFieldEnum | DiaFestivoScalarFieldEnum[]
  }

  /**
   * DiaFestivo create
   */
  export type DiaFestivoCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the DiaFestivo
     */
    select?: DiaFestivoSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: DiaFestivoInclude<ExtArgs> | null
    /**
     * The data needed to create a DiaFestivo.
     */
    data: XOR<DiaFestivoCreateInput, DiaFestivoUncheckedCreateInput>
  }

  /**
   * DiaFestivo createMany
   */
  export type DiaFestivoCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many DiaFestivos.
     */
    data: DiaFestivoCreateManyInput | DiaFestivoCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * DiaFestivo update
   */
  export type DiaFestivoUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the DiaFestivo
     */
    select?: DiaFestivoSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: DiaFestivoInclude<ExtArgs> | null
    /**
     * The data needed to update a DiaFestivo.
     */
    data: XOR<DiaFestivoUpdateInput, DiaFestivoUncheckedUpdateInput>
    /**
     * Choose, which DiaFestivo to update.
     */
    where: DiaFestivoWhereUniqueInput
  }

  /**
   * DiaFestivo updateMany
   */
  export type DiaFestivoUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update DiaFestivos.
     */
    data: XOR<DiaFestivoUpdateManyMutationInput, DiaFestivoUncheckedUpdateManyInput>
    /**
     * Filter which DiaFestivos to update
     */
    where?: DiaFestivoWhereInput
  }

  /**
   * DiaFestivo upsert
   */
  export type DiaFestivoUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the DiaFestivo
     */
    select?: DiaFestivoSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: DiaFestivoInclude<ExtArgs> | null
    /**
     * The filter to search for the DiaFestivo to update in case it exists.
     */
    where: DiaFestivoWhereUniqueInput
    /**
     * In case the DiaFestivo found by the `where` argument doesn't exist, create a new DiaFestivo with this data.
     */
    create: XOR<DiaFestivoCreateInput, DiaFestivoUncheckedCreateInput>
    /**
     * In case the DiaFestivo was found with the provided `where` argument, update it with this data.
     */
    update: XOR<DiaFestivoUpdateInput, DiaFestivoUncheckedUpdateInput>
  }

  /**
   * DiaFestivo delete
   */
  export type DiaFestivoDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the DiaFestivo
     */
    select?: DiaFestivoSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: DiaFestivoInclude<ExtArgs> | null
    /**
     * Filter which DiaFestivo to delete.
     */
    where: DiaFestivoWhereUniqueInput
  }

  /**
   * DiaFestivo deleteMany
   */
  export type DiaFestivoDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which DiaFestivos to delete
     */
    where?: DiaFestivoWhereInput
  }

  /**
   * DiaFestivo.empresa
   */
  export type DiaFestivo$empresaArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Empresa
     */
    select?: EmpresaSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: EmpresaInclude<ExtArgs> | null
    where?: EmpresaWhereInput
  }

  /**
   * DiaFestivo without action
   */
  export type DiaFestivoDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the DiaFestivo
     */
    select?: DiaFestivoSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: DiaFestivoInclude<ExtArgs> | null
  }


  /**
   * Model Configuracion
   */

  export type AggregateConfiguracion = {
    _count: ConfiguracionCountAggregateOutputType | null
    _min: ConfiguracionMinAggregateOutputType | null
    _max: ConfiguracionMaxAggregateOutputType | null
  }

  export type ConfiguracionMinAggregateOutputType = {
    id: string | null
    empresaId: string | null
    clave: string | null
    valor: string | null
  }

  export type ConfiguracionMaxAggregateOutputType = {
    id: string | null
    empresaId: string | null
    clave: string | null
    valor: string | null
  }

  export type ConfiguracionCountAggregateOutputType = {
    id: number
    empresaId: number
    clave: number
    valor: number
    _all: number
  }


  export type ConfiguracionMinAggregateInputType = {
    id?: true
    empresaId?: true
    clave?: true
    valor?: true
  }

  export type ConfiguracionMaxAggregateInputType = {
    id?: true
    empresaId?: true
    clave?: true
    valor?: true
  }

  export type ConfiguracionCountAggregateInputType = {
    id?: true
    empresaId?: true
    clave?: true
    valor?: true
    _all?: true
  }

  export type ConfiguracionAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Configuracion to aggregate.
     */
    where?: ConfiguracionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Configuracions to fetch.
     */
    orderBy?: ConfiguracionOrderByWithRelationInput | ConfiguracionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: ConfiguracionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Configuracions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Configuracions.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Configuracions
    **/
    _count?: true | ConfiguracionCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: ConfiguracionMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: ConfiguracionMaxAggregateInputType
  }

  export type GetConfiguracionAggregateType<T extends ConfiguracionAggregateArgs> = {
        [P in keyof T & keyof AggregateConfiguracion]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateConfiguracion[P]>
      : GetScalarType<T[P], AggregateConfiguracion[P]>
  }




  export type ConfiguracionGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: ConfiguracionWhereInput
    orderBy?: ConfiguracionOrderByWithAggregationInput | ConfiguracionOrderByWithAggregationInput[]
    by: ConfiguracionScalarFieldEnum[] | ConfiguracionScalarFieldEnum
    having?: ConfiguracionScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: ConfiguracionCountAggregateInputType | true
    _min?: ConfiguracionMinAggregateInputType
    _max?: ConfiguracionMaxAggregateInputType
  }

  export type ConfiguracionGroupByOutputType = {
    id: string
    empresaId: string
    clave: string
    valor: string
    _count: ConfiguracionCountAggregateOutputType | null
    _min: ConfiguracionMinAggregateOutputType | null
    _max: ConfiguracionMaxAggregateOutputType | null
  }

  type GetConfiguracionGroupByPayload<T extends ConfiguracionGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<ConfiguracionGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof ConfiguracionGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], ConfiguracionGroupByOutputType[P]>
            : GetScalarType<T[P], ConfiguracionGroupByOutputType[P]>
        }
      >
    >


  export type ConfiguracionSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    empresaId?: boolean
    clave?: boolean
    valor?: boolean
    empresa?: boolean | EmpresaDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["configuracion"]>


  export type ConfiguracionSelectScalar = {
    id?: boolean
    empresaId?: boolean
    clave?: boolean
    valor?: boolean
  }

  export type ConfiguracionInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    empresa?: boolean | EmpresaDefaultArgs<ExtArgs>
  }

  export type $ConfiguracionPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Configuracion"
    objects: {
      empresa: Prisma.$EmpresaPayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      empresaId: string
      clave: string
      valor: string
    }, ExtArgs["result"]["configuracion"]>
    composites: {}
  }

  type ConfiguracionGetPayload<S extends boolean | null | undefined | ConfiguracionDefaultArgs> = $Result.GetResult<Prisma.$ConfiguracionPayload, S>

  type ConfiguracionCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = 
    Omit<ConfiguracionFindManyArgs, 'select' | 'include' | 'distinct'> & {
      select?: ConfiguracionCountAggregateInputType | true
    }

  export interface ConfiguracionDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Configuracion'], meta: { name: 'Configuracion' } }
    /**
     * Find zero or one Configuracion that matches the filter.
     * @param {ConfiguracionFindUniqueArgs} args - Arguments to find a Configuracion
     * @example
     * // Get one Configuracion
     * const configuracion = await prisma.configuracion.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends ConfiguracionFindUniqueArgs>(args: SelectSubset<T, ConfiguracionFindUniqueArgs<ExtArgs>>): Prisma__ConfiguracionClient<$Result.GetResult<Prisma.$ConfiguracionPayload<ExtArgs>, T, "findUnique"> | null, null, ExtArgs>

    /**
     * Find one Configuracion that matches the filter or throw an error with `error.code='P2025'` 
     * if no matches were found.
     * @param {ConfiguracionFindUniqueOrThrowArgs} args - Arguments to find a Configuracion
     * @example
     * // Get one Configuracion
     * const configuracion = await prisma.configuracion.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends ConfiguracionFindUniqueOrThrowArgs>(args: SelectSubset<T, ConfiguracionFindUniqueOrThrowArgs<ExtArgs>>): Prisma__ConfiguracionClient<$Result.GetResult<Prisma.$ConfiguracionPayload<ExtArgs>, T, "findUniqueOrThrow">, never, ExtArgs>

    /**
     * Find the first Configuracion that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ConfiguracionFindFirstArgs} args - Arguments to find a Configuracion
     * @example
     * // Get one Configuracion
     * const configuracion = await prisma.configuracion.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends ConfiguracionFindFirstArgs>(args?: SelectSubset<T, ConfiguracionFindFirstArgs<ExtArgs>>): Prisma__ConfiguracionClient<$Result.GetResult<Prisma.$ConfiguracionPayload<ExtArgs>, T, "findFirst"> | null, null, ExtArgs>

    /**
     * Find the first Configuracion that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ConfiguracionFindFirstOrThrowArgs} args - Arguments to find a Configuracion
     * @example
     * // Get one Configuracion
     * const configuracion = await prisma.configuracion.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends ConfiguracionFindFirstOrThrowArgs>(args?: SelectSubset<T, ConfiguracionFindFirstOrThrowArgs<ExtArgs>>): Prisma__ConfiguracionClient<$Result.GetResult<Prisma.$ConfiguracionPayload<ExtArgs>, T, "findFirstOrThrow">, never, ExtArgs>

    /**
     * Find zero or more Configuracions that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ConfiguracionFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Configuracions
     * const configuracions = await prisma.configuracion.findMany()
     * 
     * // Get first 10 Configuracions
     * const configuracions = await prisma.configuracion.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const configuracionWithIdOnly = await prisma.configuracion.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends ConfiguracionFindManyArgs>(args?: SelectSubset<T, ConfiguracionFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ConfiguracionPayload<ExtArgs>, T, "findMany">>

    /**
     * Create a Configuracion.
     * @param {ConfiguracionCreateArgs} args - Arguments to create a Configuracion.
     * @example
     * // Create one Configuracion
     * const Configuracion = await prisma.configuracion.create({
     *   data: {
     *     // ... data to create a Configuracion
     *   }
     * })
     * 
     */
    create<T extends ConfiguracionCreateArgs>(args: SelectSubset<T, ConfiguracionCreateArgs<ExtArgs>>): Prisma__ConfiguracionClient<$Result.GetResult<Prisma.$ConfiguracionPayload<ExtArgs>, T, "create">, never, ExtArgs>

    /**
     * Create many Configuracions.
     * @param {ConfiguracionCreateManyArgs} args - Arguments to create many Configuracions.
     * @example
     * // Create many Configuracions
     * const configuracion = await prisma.configuracion.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends ConfiguracionCreateManyArgs>(args?: SelectSubset<T, ConfiguracionCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Delete a Configuracion.
     * @param {ConfiguracionDeleteArgs} args - Arguments to delete one Configuracion.
     * @example
     * // Delete one Configuracion
     * const Configuracion = await prisma.configuracion.delete({
     *   where: {
     *     // ... filter to delete one Configuracion
     *   }
     * })
     * 
     */
    delete<T extends ConfiguracionDeleteArgs>(args: SelectSubset<T, ConfiguracionDeleteArgs<ExtArgs>>): Prisma__ConfiguracionClient<$Result.GetResult<Prisma.$ConfiguracionPayload<ExtArgs>, T, "delete">, never, ExtArgs>

    /**
     * Update one Configuracion.
     * @param {ConfiguracionUpdateArgs} args - Arguments to update one Configuracion.
     * @example
     * // Update one Configuracion
     * const configuracion = await prisma.configuracion.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends ConfiguracionUpdateArgs>(args: SelectSubset<T, ConfiguracionUpdateArgs<ExtArgs>>): Prisma__ConfiguracionClient<$Result.GetResult<Prisma.$ConfiguracionPayload<ExtArgs>, T, "update">, never, ExtArgs>

    /**
     * Delete zero or more Configuracions.
     * @param {ConfiguracionDeleteManyArgs} args - Arguments to filter Configuracions to delete.
     * @example
     * // Delete a few Configuracions
     * const { count } = await prisma.configuracion.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends ConfiguracionDeleteManyArgs>(args?: SelectSubset<T, ConfiguracionDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Configuracions.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ConfiguracionUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Configuracions
     * const configuracion = await prisma.configuracion.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends ConfiguracionUpdateManyArgs>(args: SelectSubset<T, ConfiguracionUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one Configuracion.
     * @param {ConfiguracionUpsertArgs} args - Arguments to update or create a Configuracion.
     * @example
     * // Update or create a Configuracion
     * const configuracion = await prisma.configuracion.upsert({
     *   create: {
     *     // ... data to create a Configuracion
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Configuracion we want to update
     *   }
     * })
     */
    upsert<T extends ConfiguracionUpsertArgs>(args: SelectSubset<T, ConfiguracionUpsertArgs<ExtArgs>>): Prisma__ConfiguracionClient<$Result.GetResult<Prisma.$ConfiguracionPayload<ExtArgs>, T, "upsert">, never, ExtArgs>


    /**
     * Count the number of Configuracions.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ConfiguracionCountArgs} args - Arguments to filter Configuracions to count.
     * @example
     * // Count the number of Configuracions
     * const count = await prisma.configuracion.count({
     *   where: {
     *     // ... the filter for the Configuracions we want to count
     *   }
     * })
    **/
    count<T extends ConfiguracionCountArgs>(
      args?: Subset<T, ConfiguracionCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], ConfiguracionCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Configuracion.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ConfiguracionAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends ConfiguracionAggregateArgs>(args: Subset<T, ConfiguracionAggregateArgs>): Prisma.PrismaPromise<GetConfiguracionAggregateType<T>>

    /**
     * Group by Configuracion.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ConfiguracionGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends ConfiguracionGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: ConfiguracionGroupByArgs['orderBy'] }
        : { orderBy?: ConfiguracionGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, ConfiguracionGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetConfiguracionGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Configuracion model
   */
  readonly fields: ConfiguracionFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Configuracion.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__ConfiguracionClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    empresa<T extends EmpresaDefaultArgs<ExtArgs> = {}>(args?: Subset<T, EmpresaDefaultArgs<ExtArgs>>): Prisma__EmpresaClient<$Result.GetResult<Prisma.$EmpresaPayload<ExtArgs>, T, "findUniqueOrThrow"> | Null, Null, ExtArgs>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the Configuracion model
   */ 
  interface ConfiguracionFieldRefs {
    readonly id: FieldRef<"Configuracion", 'String'>
    readonly empresaId: FieldRef<"Configuracion", 'String'>
    readonly clave: FieldRef<"Configuracion", 'String'>
    readonly valor: FieldRef<"Configuracion", 'String'>
  }
    

  // Custom InputTypes
  /**
   * Configuracion findUnique
   */
  export type ConfiguracionFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Configuracion
     */
    select?: ConfiguracionSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ConfiguracionInclude<ExtArgs> | null
    /**
     * Filter, which Configuracion to fetch.
     */
    where: ConfiguracionWhereUniqueInput
  }

  /**
   * Configuracion findUniqueOrThrow
   */
  export type ConfiguracionFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Configuracion
     */
    select?: ConfiguracionSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ConfiguracionInclude<ExtArgs> | null
    /**
     * Filter, which Configuracion to fetch.
     */
    where: ConfiguracionWhereUniqueInput
  }

  /**
   * Configuracion findFirst
   */
  export type ConfiguracionFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Configuracion
     */
    select?: ConfiguracionSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ConfiguracionInclude<ExtArgs> | null
    /**
     * Filter, which Configuracion to fetch.
     */
    where?: ConfiguracionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Configuracions to fetch.
     */
    orderBy?: ConfiguracionOrderByWithRelationInput | ConfiguracionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Configuracions.
     */
    cursor?: ConfiguracionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Configuracions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Configuracions.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Configuracions.
     */
    distinct?: ConfiguracionScalarFieldEnum | ConfiguracionScalarFieldEnum[]
  }

  /**
   * Configuracion findFirstOrThrow
   */
  export type ConfiguracionFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Configuracion
     */
    select?: ConfiguracionSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ConfiguracionInclude<ExtArgs> | null
    /**
     * Filter, which Configuracion to fetch.
     */
    where?: ConfiguracionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Configuracions to fetch.
     */
    orderBy?: ConfiguracionOrderByWithRelationInput | ConfiguracionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Configuracions.
     */
    cursor?: ConfiguracionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Configuracions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Configuracions.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Configuracions.
     */
    distinct?: ConfiguracionScalarFieldEnum | ConfiguracionScalarFieldEnum[]
  }

  /**
   * Configuracion findMany
   */
  export type ConfiguracionFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Configuracion
     */
    select?: ConfiguracionSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ConfiguracionInclude<ExtArgs> | null
    /**
     * Filter, which Configuracions to fetch.
     */
    where?: ConfiguracionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Configuracions to fetch.
     */
    orderBy?: ConfiguracionOrderByWithRelationInput | ConfiguracionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Configuracions.
     */
    cursor?: ConfiguracionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Configuracions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Configuracions.
     */
    skip?: number
    distinct?: ConfiguracionScalarFieldEnum | ConfiguracionScalarFieldEnum[]
  }

  /**
   * Configuracion create
   */
  export type ConfiguracionCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Configuracion
     */
    select?: ConfiguracionSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ConfiguracionInclude<ExtArgs> | null
    /**
     * The data needed to create a Configuracion.
     */
    data: XOR<ConfiguracionCreateInput, ConfiguracionUncheckedCreateInput>
  }

  /**
   * Configuracion createMany
   */
  export type ConfiguracionCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Configuracions.
     */
    data: ConfiguracionCreateManyInput | ConfiguracionCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Configuracion update
   */
  export type ConfiguracionUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Configuracion
     */
    select?: ConfiguracionSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ConfiguracionInclude<ExtArgs> | null
    /**
     * The data needed to update a Configuracion.
     */
    data: XOR<ConfiguracionUpdateInput, ConfiguracionUncheckedUpdateInput>
    /**
     * Choose, which Configuracion to update.
     */
    where: ConfiguracionWhereUniqueInput
  }

  /**
   * Configuracion updateMany
   */
  export type ConfiguracionUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Configuracions.
     */
    data: XOR<ConfiguracionUpdateManyMutationInput, ConfiguracionUncheckedUpdateManyInput>
    /**
     * Filter which Configuracions to update
     */
    where?: ConfiguracionWhereInput
  }

  /**
   * Configuracion upsert
   */
  export type ConfiguracionUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Configuracion
     */
    select?: ConfiguracionSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ConfiguracionInclude<ExtArgs> | null
    /**
     * The filter to search for the Configuracion to update in case it exists.
     */
    where: ConfiguracionWhereUniqueInput
    /**
     * In case the Configuracion found by the `where` argument doesn't exist, create a new Configuracion with this data.
     */
    create: XOR<ConfiguracionCreateInput, ConfiguracionUncheckedCreateInput>
    /**
     * In case the Configuracion was found with the provided `where` argument, update it with this data.
     */
    update: XOR<ConfiguracionUpdateInput, ConfiguracionUncheckedUpdateInput>
  }

  /**
   * Configuracion delete
   */
  export type ConfiguracionDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Configuracion
     */
    select?: ConfiguracionSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ConfiguracionInclude<ExtArgs> | null
    /**
     * Filter which Configuracion to delete.
     */
    where: ConfiguracionWhereUniqueInput
  }

  /**
   * Configuracion deleteMany
   */
  export type ConfiguracionDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Configuracions to delete
     */
    where?: ConfiguracionWhereInput
  }

  /**
   * Configuracion without action
   */
  export type ConfiguracionDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Configuracion
     */
    select?: ConfiguracionSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ConfiguracionInclude<ExtArgs> | null
  }


  /**
   * Model Usuario
   */

  export type AggregateUsuario = {
    _count: UsuarioCountAggregateOutputType | null
    _min: UsuarioMinAggregateOutputType | null
    _max: UsuarioMaxAggregateOutputType | null
  }

  export type UsuarioMinAggregateOutputType = {
    id: string | null
    empresaId: string | null
    email: string | null
    password: string | null
    nombre: string | null
    rol: $Enums.Rol | null
    activo: boolean | null
    resetToken: string | null
    resetExpira: Date | null
    emailVerificado: boolean | null
    verificacionCodigo: string | null
    verificacionExpira: Date | null
    creadoEn: Date | null
  }

  export type UsuarioMaxAggregateOutputType = {
    id: string | null
    empresaId: string | null
    email: string | null
    password: string | null
    nombre: string | null
    rol: $Enums.Rol | null
    activo: boolean | null
    resetToken: string | null
    resetExpira: Date | null
    emailVerificado: boolean | null
    verificacionCodigo: string | null
    verificacionExpira: Date | null
    creadoEn: Date | null
  }

  export type UsuarioCountAggregateOutputType = {
    id: number
    empresaId: number
    email: number
    password: number
    nombre: number
    rol: number
    activo: number
    resetToken: number
    resetExpira: number
    emailVerificado: number
    verificacionCodigo: number
    verificacionExpira: number
    creadoEn: number
    _all: number
  }


  export type UsuarioMinAggregateInputType = {
    id?: true
    empresaId?: true
    email?: true
    password?: true
    nombre?: true
    rol?: true
    activo?: true
    resetToken?: true
    resetExpira?: true
    emailVerificado?: true
    verificacionCodigo?: true
    verificacionExpira?: true
    creadoEn?: true
  }

  export type UsuarioMaxAggregateInputType = {
    id?: true
    empresaId?: true
    email?: true
    password?: true
    nombre?: true
    rol?: true
    activo?: true
    resetToken?: true
    resetExpira?: true
    emailVerificado?: true
    verificacionCodigo?: true
    verificacionExpira?: true
    creadoEn?: true
  }

  export type UsuarioCountAggregateInputType = {
    id?: true
    empresaId?: true
    email?: true
    password?: true
    nombre?: true
    rol?: true
    activo?: true
    resetToken?: true
    resetExpira?: true
    emailVerificado?: true
    verificacionCodigo?: true
    verificacionExpira?: true
    creadoEn?: true
    _all?: true
  }

  export type UsuarioAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Usuario to aggregate.
     */
    where?: UsuarioWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Usuarios to fetch.
     */
    orderBy?: UsuarioOrderByWithRelationInput | UsuarioOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: UsuarioWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Usuarios from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Usuarios.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Usuarios
    **/
    _count?: true | UsuarioCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: UsuarioMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: UsuarioMaxAggregateInputType
  }

  export type GetUsuarioAggregateType<T extends UsuarioAggregateArgs> = {
        [P in keyof T & keyof AggregateUsuario]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateUsuario[P]>
      : GetScalarType<T[P], AggregateUsuario[P]>
  }




  export type UsuarioGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: UsuarioWhereInput
    orderBy?: UsuarioOrderByWithAggregationInput | UsuarioOrderByWithAggregationInput[]
    by: UsuarioScalarFieldEnum[] | UsuarioScalarFieldEnum
    having?: UsuarioScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: UsuarioCountAggregateInputType | true
    _min?: UsuarioMinAggregateInputType
    _max?: UsuarioMaxAggregateInputType
  }

  export type UsuarioGroupByOutputType = {
    id: string
    empresaId: string | null
    email: string
    password: string
    nombre: string
    rol: $Enums.Rol
    activo: boolean
    resetToken: string | null
    resetExpira: Date | null
    emailVerificado: boolean
    verificacionCodigo: string | null
    verificacionExpira: Date | null
    creadoEn: Date
    _count: UsuarioCountAggregateOutputType | null
    _min: UsuarioMinAggregateOutputType | null
    _max: UsuarioMaxAggregateOutputType | null
  }

  type GetUsuarioGroupByPayload<T extends UsuarioGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<UsuarioGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof UsuarioGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], UsuarioGroupByOutputType[P]>
            : GetScalarType<T[P], UsuarioGroupByOutputType[P]>
        }
      >
    >


  export type UsuarioSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    empresaId?: boolean
    email?: boolean
    password?: boolean
    nombre?: boolean
    rol?: boolean
    activo?: boolean
    resetToken?: boolean
    resetExpira?: boolean
    emailVerificado?: boolean
    verificacionCodigo?: boolean
    verificacionExpira?: boolean
    creadoEn?: boolean
    empresa?: boolean | Usuario$empresaArgs<ExtArgs>
  }, ExtArgs["result"]["usuario"]>


  export type UsuarioSelectScalar = {
    id?: boolean
    empresaId?: boolean
    email?: boolean
    password?: boolean
    nombre?: boolean
    rol?: boolean
    activo?: boolean
    resetToken?: boolean
    resetExpira?: boolean
    emailVerificado?: boolean
    verificacionCodigo?: boolean
    verificacionExpira?: boolean
    creadoEn?: boolean
  }

  export type UsuarioInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    empresa?: boolean | Usuario$empresaArgs<ExtArgs>
  }

  export type $UsuarioPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Usuario"
    objects: {
      empresa: Prisma.$EmpresaPayload<ExtArgs> | null
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      empresaId: string | null
      email: string
      password: string
      nombre: string
      rol: $Enums.Rol
      activo: boolean
      resetToken: string | null
      resetExpira: Date | null
      emailVerificado: boolean
      verificacionCodigo: string | null
      verificacionExpira: Date | null
      creadoEn: Date
    }, ExtArgs["result"]["usuario"]>
    composites: {}
  }

  type UsuarioGetPayload<S extends boolean | null | undefined | UsuarioDefaultArgs> = $Result.GetResult<Prisma.$UsuarioPayload, S>

  type UsuarioCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = 
    Omit<UsuarioFindManyArgs, 'select' | 'include' | 'distinct'> & {
      select?: UsuarioCountAggregateInputType | true
    }

  export interface UsuarioDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Usuario'], meta: { name: 'Usuario' } }
    /**
     * Find zero or one Usuario that matches the filter.
     * @param {UsuarioFindUniqueArgs} args - Arguments to find a Usuario
     * @example
     * // Get one Usuario
     * const usuario = await prisma.usuario.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends UsuarioFindUniqueArgs>(args: SelectSubset<T, UsuarioFindUniqueArgs<ExtArgs>>): Prisma__UsuarioClient<$Result.GetResult<Prisma.$UsuarioPayload<ExtArgs>, T, "findUnique"> | null, null, ExtArgs>

    /**
     * Find one Usuario that matches the filter or throw an error with `error.code='P2025'` 
     * if no matches were found.
     * @param {UsuarioFindUniqueOrThrowArgs} args - Arguments to find a Usuario
     * @example
     * // Get one Usuario
     * const usuario = await prisma.usuario.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends UsuarioFindUniqueOrThrowArgs>(args: SelectSubset<T, UsuarioFindUniqueOrThrowArgs<ExtArgs>>): Prisma__UsuarioClient<$Result.GetResult<Prisma.$UsuarioPayload<ExtArgs>, T, "findUniqueOrThrow">, never, ExtArgs>

    /**
     * Find the first Usuario that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UsuarioFindFirstArgs} args - Arguments to find a Usuario
     * @example
     * // Get one Usuario
     * const usuario = await prisma.usuario.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends UsuarioFindFirstArgs>(args?: SelectSubset<T, UsuarioFindFirstArgs<ExtArgs>>): Prisma__UsuarioClient<$Result.GetResult<Prisma.$UsuarioPayload<ExtArgs>, T, "findFirst"> | null, null, ExtArgs>

    /**
     * Find the first Usuario that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UsuarioFindFirstOrThrowArgs} args - Arguments to find a Usuario
     * @example
     * // Get one Usuario
     * const usuario = await prisma.usuario.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends UsuarioFindFirstOrThrowArgs>(args?: SelectSubset<T, UsuarioFindFirstOrThrowArgs<ExtArgs>>): Prisma__UsuarioClient<$Result.GetResult<Prisma.$UsuarioPayload<ExtArgs>, T, "findFirstOrThrow">, never, ExtArgs>

    /**
     * Find zero or more Usuarios that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UsuarioFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Usuarios
     * const usuarios = await prisma.usuario.findMany()
     * 
     * // Get first 10 Usuarios
     * const usuarios = await prisma.usuario.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const usuarioWithIdOnly = await prisma.usuario.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends UsuarioFindManyArgs>(args?: SelectSubset<T, UsuarioFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$UsuarioPayload<ExtArgs>, T, "findMany">>

    /**
     * Create a Usuario.
     * @param {UsuarioCreateArgs} args - Arguments to create a Usuario.
     * @example
     * // Create one Usuario
     * const Usuario = await prisma.usuario.create({
     *   data: {
     *     // ... data to create a Usuario
     *   }
     * })
     * 
     */
    create<T extends UsuarioCreateArgs>(args: SelectSubset<T, UsuarioCreateArgs<ExtArgs>>): Prisma__UsuarioClient<$Result.GetResult<Prisma.$UsuarioPayload<ExtArgs>, T, "create">, never, ExtArgs>

    /**
     * Create many Usuarios.
     * @param {UsuarioCreateManyArgs} args - Arguments to create many Usuarios.
     * @example
     * // Create many Usuarios
     * const usuario = await prisma.usuario.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends UsuarioCreateManyArgs>(args?: SelectSubset<T, UsuarioCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Delete a Usuario.
     * @param {UsuarioDeleteArgs} args - Arguments to delete one Usuario.
     * @example
     * // Delete one Usuario
     * const Usuario = await prisma.usuario.delete({
     *   where: {
     *     // ... filter to delete one Usuario
     *   }
     * })
     * 
     */
    delete<T extends UsuarioDeleteArgs>(args: SelectSubset<T, UsuarioDeleteArgs<ExtArgs>>): Prisma__UsuarioClient<$Result.GetResult<Prisma.$UsuarioPayload<ExtArgs>, T, "delete">, never, ExtArgs>

    /**
     * Update one Usuario.
     * @param {UsuarioUpdateArgs} args - Arguments to update one Usuario.
     * @example
     * // Update one Usuario
     * const usuario = await prisma.usuario.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends UsuarioUpdateArgs>(args: SelectSubset<T, UsuarioUpdateArgs<ExtArgs>>): Prisma__UsuarioClient<$Result.GetResult<Prisma.$UsuarioPayload<ExtArgs>, T, "update">, never, ExtArgs>

    /**
     * Delete zero or more Usuarios.
     * @param {UsuarioDeleteManyArgs} args - Arguments to filter Usuarios to delete.
     * @example
     * // Delete a few Usuarios
     * const { count } = await prisma.usuario.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends UsuarioDeleteManyArgs>(args?: SelectSubset<T, UsuarioDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Usuarios.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UsuarioUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Usuarios
     * const usuario = await prisma.usuario.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends UsuarioUpdateManyArgs>(args: SelectSubset<T, UsuarioUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one Usuario.
     * @param {UsuarioUpsertArgs} args - Arguments to update or create a Usuario.
     * @example
     * // Update or create a Usuario
     * const usuario = await prisma.usuario.upsert({
     *   create: {
     *     // ... data to create a Usuario
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Usuario we want to update
     *   }
     * })
     */
    upsert<T extends UsuarioUpsertArgs>(args: SelectSubset<T, UsuarioUpsertArgs<ExtArgs>>): Prisma__UsuarioClient<$Result.GetResult<Prisma.$UsuarioPayload<ExtArgs>, T, "upsert">, never, ExtArgs>


    /**
     * Count the number of Usuarios.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UsuarioCountArgs} args - Arguments to filter Usuarios to count.
     * @example
     * // Count the number of Usuarios
     * const count = await prisma.usuario.count({
     *   where: {
     *     // ... the filter for the Usuarios we want to count
     *   }
     * })
    **/
    count<T extends UsuarioCountArgs>(
      args?: Subset<T, UsuarioCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], UsuarioCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Usuario.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UsuarioAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends UsuarioAggregateArgs>(args: Subset<T, UsuarioAggregateArgs>): Prisma.PrismaPromise<GetUsuarioAggregateType<T>>

    /**
     * Group by Usuario.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UsuarioGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends UsuarioGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: UsuarioGroupByArgs['orderBy'] }
        : { orderBy?: UsuarioGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, UsuarioGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetUsuarioGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Usuario model
   */
  readonly fields: UsuarioFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Usuario.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__UsuarioClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    empresa<T extends Usuario$empresaArgs<ExtArgs> = {}>(args?: Subset<T, Usuario$empresaArgs<ExtArgs>>): Prisma__EmpresaClient<$Result.GetResult<Prisma.$EmpresaPayload<ExtArgs>, T, "findUniqueOrThrow"> | null, null, ExtArgs>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the Usuario model
   */ 
  interface UsuarioFieldRefs {
    readonly id: FieldRef<"Usuario", 'String'>
    readonly empresaId: FieldRef<"Usuario", 'String'>
    readonly email: FieldRef<"Usuario", 'String'>
    readonly password: FieldRef<"Usuario", 'String'>
    readonly nombre: FieldRef<"Usuario", 'String'>
    readonly rol: FieldRef<"Usuario", 'Rol'>
    readonly activo: FieldRef<"Usuario", 'Boolean'>
    readonly resetToken: FieldRef<"Usuario", 'String'>
    readonly resetExpira: FieldRef<"Usuario", 'DateTime'>
    readonly emailVerificado: FieldRef<"Usuario", 'Boolean'>
    readonly verificacionCodigo: FieldRef<"Usuario", 'String'>
    readonly verificacionExpira: FieldRef<"Usuario", 'DateTime'>
    readonly creadoEn: FieldRef<"Usuario", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * Usuario findUnique
   */
  export type UsuarioFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Usuario
     */
    select?: UsuarioSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UsuarioInclude<ExtArgs> | null
    /**
     * Filter, which Usuario to fetch.
     */
    where: UsuarioWhereUniqueInput
  }

  /**
   * Usuario findUniqueOrThrow
   */
  export type UsuarioFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Usuario
     */
    select?: UsuarioSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UsuarioInclude<ExtArgs> | null
    /**
     * Filter, which Usuario to fetch.
     */
    where: UsuarioWhereUniqueInput
  }

  /**
   * Usuario findFirst
   */
  export type UsuarioFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Usuario
     */
    select?: UsuarioSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UsuarioInclude<ExtArgs> | null
    /**
     * Filter, which Usuario to fetch.
     */
    where?: UsuarioWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Usuarios to fetch.
     */
    orderBy?: UsuarioOrderByWithRelationInput | UsuarioOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Usuarios.
     */
    cursor?: UsuarioWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Usuarios from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Usuarios.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Usuarios.
     */
    distinct?: UsuarioScalarFieldEnum | UsuarioScalarFieldEnum[]
  }

  /**
   * Usuario findFirstOrThrow
   */
  export type UsuarioFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Usuario
     */
    select?: UsuarioSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UsuarioInclude<ExtArgs> | null
    /**
     * Filter, which Usuario to fetch.
     */
    where?: UsuarioWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Usuarios to fetch.
     */
    orderBy?: UsuarioOrderByWithRelationInput | UsuarioOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Usuarios.
     */
    cursor?: UsuarioWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Usuarios from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Usuarios.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Usuarios.
     */
    distinct?: UsuarioScalarFieldEnum | UsuarioScalarFieldEnum[]
  }

  /**
   * Usuario findMany
   */
  export type UsuarioFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Usuario
     */
    select?: UsuarioSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UsuarioInclude<ExtArgs> | null
    /**
     * Filter, which Usuarios to fetch.
     */
    where?: UsuarioWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Usuarios to fetch.
     */
    orderBy?: UsuarioOrderByWithRelationInput | UsuarioOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Usuarios.
     */
    cursor?: UsuarioWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Usuarios from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Usuarios.
     */
    skip?: number
    distinct?: UsuarioScalarFieldEnum | UsuarioScalarFieldEnum[]
  }

  /**
   * Usuario create
   */
  export type UsuarioCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Usuario
     */
    select?: UsuarioSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UsuarioInclude<ExtArgs> | null
    /**
     * The data needed to create a Usuario.
     */
    data: XOR<UsuarioCreateInput, UsuarioUncheckedCreateInput>
  }

  /**
   * Usuario createMany
   */
  export type UsuarioCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Usuarios.
     */
    data: UsuarioCreateManyInput | UsuarioCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Usuario update
   */
  export type UsuarioUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Usuario
     */
    select?: UsuarioSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UsuarioInclude<ExtArgs> | null
    /**
     * The data needed to update a Usuario.
     */
    data: XOR<UsuarioUpdateInput, UsuarioUncheckedUpdateInput>
    /**
     * Choose, which Usuario to update.
     */
    where: UsuarioWhereUniqueInput
  }

  /**
   * Usuario updateMany
   */
  export type UsuarioUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Usuarios.
     */
    data: XOR<UsuarioUpdateManyMutationInput, UsuarioUncheckedUpdateManyInput>
    /**
     * Filter which Usuarios to update
     */
    where?: UsuarioWhereInput
  }

  /**
   * Usuario upsert
   */
  export type UsuarioUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Usuario
     */
    select?: UsuarioSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UsuarioInclude<ExtArgs> | null
    /**
     * The filter to search for the Usuario to update in case it exists.
     */
    where: UsuarioWhereUniqueInput
    /**
     * In case the Usuario found by the `where` argument doesn't exist, create a new Usuario with this data.
     */
    create: XOR<UsuarioCreateInput, UsuarioUncheckedCreateInput>
    /**
     * In case the Usuario was found with the provided `where` argument, update it with this data.
     */
    update: XOR<UsuarioUpdateInput, UsuarioUncheckedUpdateInput>
  }

  /**
   * Usuario delete
   */
  export type UsuarioDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Usuario
     */
    select?: UsuarioSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UsuarioInclude<ExtArgs> | null
    /**
     * Filter which Usuario to delete.
     */
    where: UsuarioWhereUniqueInput
  }

  /**
   * Usuario deleteMany
   */
  export type UsuarioDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Usuarios to delete
     */
    where?: UsuarioWhereInput
  }

  /**
   * Usuario.empresa
   */
  export type Usuario$empresaArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Empresa
     */
    select?: EmpresaSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: EmpresaInclude<ExtArgs> | null
    where?: EmpresaWhereInput
  }

  /**
   * Usuario without action
   */
  export type UsuarioDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Usuario
     */
    select?: UsuarioSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UsuarioInclude<ExtArgs> | null
  }


  /**
   * Enums
   */

  export const TransactionIsolationLevel: {
    ReadUncommitted: 'ReadUncommitted',
    ReadCommitted: 'ReadCommitted',
    RepeatableRead: 'RepeatableRead',
    Serializable: 'Serializable'
  };

  export type TransactionIsolationLevel = (typeof TransactionIsolationLevel)[keyof typeof TransactionIsolationLevel]


  export const EmpresaScalarFieldEnum: {
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

  export type EmpresaScalarFieldEnum = (typeof EmpresaScalarFieldEnum)[keyof typeof EmpresaScalarFieldEnum]


  export const SuscripcionScalarFieldEnum: {
    id: 'id',
    empresaId: 'empresaId',
    estado: 'estado',
    finPrueba: 'finPrueba',
    pagadoHasta: 'pagadoHasta',
    suspendidaEn: 'suspendidaEn',
    wompiFuentePagoId: 'wompiFuentePagoId',
    creadoEn: 'creadoEn',
    actualizadoEn: 'actualizadoEn'
  };

  export type SuscripcionScalarFieldEnum = (typeof SuscripcionScalarFieldEnum)[keyof typeof SuscripcionScalarFieldEnum]


  export const PagoScalarFieldEnum: {
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

  export type PagoScalarFieldEnum = (typeof PagoScalarFieldEnum)[keyof typeof PagoScalarFieldEnum]


  export const ConfiguracionPlataformaScalarFieldEnum: {
    id: 'id',
    precioTramo1: 'precioTramo1',
    limiteTramo1: 'limiteTramo1',
    precioTramo2: 'precioTramo2'
  };

  export type ConfiguracionPlataformaScalarFieldEnum = (typeof ConfiguracionPlataformaScalarFieldEnum)[keyof typeof ConfiguracionPlataformaScalarFieldEnum]


  export const JornadaVigenciaScalarFieldEnum: {
    id: 'id',
    vigenteDesde: 'vigenteDesde',
    horasSemanales: 'horasSemanales'
  };

  export type JornadaVigenciaScalarFieldEnum = (typeof JornadaVigenciaScalarFieldEnum)[keyof typeof JornadaVigenciaScalarFieldEnum]


  export const TipoHoraScalarFieldEnum: {
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

  export type TipoHoraScalarFieldEnum = (typeof TipoHoraScalarFieldEnum)[keyof typeof TipoHoraScalarFieldEnum]


  export const HorarioScalarFieldEnum: {
    id: 'id',
    empresaId: 'empresaId',
    nombre: 'nombre',
    toleranciaMin: 'toleranciaMin',
    activo: 'activo',
    creadoEn: 'creadoEn'
  };

  export type HorarioScalarFieldEnum = (typeof HorarioScalarFieldEnum)[keyof typeof HorarioScalarFieldEnum]


  export const FranjaHorarioScalarFieldEnum: {
    id: 'id',
    horarioId: 'horarioId',
    dias: 'dias',
    horaEntrada: 'horaEntrada',
    horaSalida: 'horaSalida'
  };

  export type FranjaHorarioScalarFieldEnum = (typeof FranjaHorarioScalarFieldEnum)[keyof typeof FranjaHorarioScalarFieldEnum]


  export const DispositivoKioscoScalarFieldEnum: {
    id: 'id',
    empresaId: 'empresaId',
    nombre: 'nombre',
    token: 'token',
    creadoEn: 'creadoEn',
    ultimoUso: 'ultimoUso'
  };

  export type DispositivoKioscoScalarFieldEnum = (typeof DispositivoKioscoScalarFieldEnum)[keyof typeof DispositivoKioscoScalarFieldEnum]


  export const ColaboradorScalarFieldEnum: {
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

  export type ColaboradorScalarFieldEnum = (typeof ColaboradorScalarFieldEnum)[keyof typeof ColaboradorScalarFieldEnum]


  export const RegistroScalarFieldEnum: {
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

  export type RegistroScalarFieldEnum = (typeof RegistroScalarFieldEnum)[keyof typeof RegistroScalarFieldEnum]


  export const PermisoScalarFieldEnum: {
    id: 'id',
    colaboradorId: 'colaboradorId',
    fechaInicio: 'fechaInicio',
    fechaFin: 'fechaFin',
    tipo: 'tipo',
    descripcion: 'descripcion',
    aprobado: 'aprobado',
    creadoEn: 'creadoEn'
  };

  export type PermisoScalarFieldEnum = (typeof PermisoScalarFieldEnum)[keyof typeof PermisoScalarFieldEnum]


  export const DiaFestivoScalarFieldEnum: {
    id: 'id',
    empresaId: 'empresaId',
    fecha: 'fecha',
    nombre: 'nombre',
    creadoEn: 'creadoEn'
  };

  export type DiaFestivoScalarFieldEnum = (typeof DiaFestivoScalarFieldEnum)[keyof typeof DiaFestivoScalarFieldEnum]


  export const ConfiguracionScalarFieldEnum: {
    id: 'id',
    empresaId: 'empresaId',
    clave: 'clave',
    valor: 'valor'
  };

  export type ConfiguracionScalarFieldEnum = (typeof ConfiguracionScalarFieldEnum)[keyof typeof ConfiguracionScalarFieldEnum]


  export const UsuarioScalarFieldEnum: {
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

  export type UsuarioScalarFieldEnum = (typeof UsuarioScalarFieldEnum)[keyof typeof UsuarioScalarFieldEnum]


  export const SortOrder: {
    asc: 'asc',
    desc: 'desc'
  };

  export type SortOrder = (typeof SortOrder)[keyof typeof SortOrder]


  export const JsonNullValueInput: {
    JsonNull: typeof JsonNull
  };

  export type JsonNullValueInput = (typeof JsonNullValueInput)[keyof typeof JsonNullValueInput]


  export const NullableJsonNullValueInput: {
    DbNull: typeof DbNull,
    JsonNull: typeof JsonNull
  };

  export type NullableJsonNullValueInput = (typeof NullableJsonNullValueInput)[keyof typeof NullableJsonNullValueInput]


  export const NullsOrder: {
    first: 'first',
    last: 'last'
  };

  export type NullsOrder = (typeof NullsOrder)[keyof typeof NullsOrder]


  export const JsonNullValueFilter: {
    DbNull: typeof DbNull,
    JsonNull: typeof JsonNull,
    AnyNull: typeof AnyNull
  };

  export type JsonNullValueFilter = (typeof JsonNullValueFilter)[keyof typeof JsonNullValueFilter]


  /**
   * Field references 
   */


  /**
   * Reference to a field of type 'String'
   */
  export type StringFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'String'>
    


  /**
   * Reference to a field of type 'Boolean'
   */
  export type BooleanFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Boolean'>
    


  /**
   * Reference to a field of type 'DateTime'
   */
  export type DateTimeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'DateTime'>
    


  /**
   * Reference to a field of type 'EstadoSuscripcion'
   */
  export type EnumEstadoSuscripcionFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'EstadoSuscripcion'>
    


  /**
   * Reference to a field of type 'Float'
   */
  export type FloatFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Float'>
    


  /**
   * Reference to a field of type 'Int'
   */
  export type IntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Int'>
    


  /**
   * Reference to a field of type 'MetodoPago'
   */
  export type EnumMetodoPagoFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'MetodoPago'>
    


  /**
   * Reference to a field of type 'EstadoPago'
   */
  export type EnumEstadoPagoFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'EstadoPago'>
    


  /**
   * Reference to a field of type 'Json'
   */
  export type JsonFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Json'>
    


  /**
   * Reference to a field of type 'TipoRegistro'
   */
  export type EnumTipoRegistroFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'TipoRegistro'>
    


  /**
   * Reference to a field of type 'TipoPermiso'
   */
  export type EnumTipoPermisoFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'TipoPermiso'>
    


  /**
   * Reference to a field of type 'Rol'
   */
  export type EnumRolFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Rol'>
    
  /**
   * Deep Input Types
   */


  export type EmpresaWhereInput = {
    AND?: EmpresaWhereInput | EmpresaWhereInput[]
    OR?: EmpresaWhereInput[]
    NOT?: EmpresaWhereInput | EmpresaWhereInput[]
    id?: StringFilter<"Empresa"> | string
    nombre?: StringFilter<"Empresa"> | string
    nit?: StringFilter<"Empresa"> | string
    email?: StringFilter<"Empresa"> | string
    telefono?: StringNullableFilter<"Empresa"> | string | null
    marcadorToken?: StringFilter<"Empresa"> | string
    exentaPago?: BoolFilter<"Empresa"> | boolean
    activa?: BoolFilter<"Empresa"> | boolean
    creadoEn?: DateTimeFilter<"Empresa"> | Date | string
    actualizadoEn?: DateTimeFilter<"Empresa"> | Date | string
    usuarios?: UsuarioListRelationFilter
    colaboradores?: ColaboradorListRelationFilter
    festivos?: DiaFestivoListRelationFilter
    configuracion?: ConfiguracionListRelationFilter
    suscripcion?: XOR<SuscripcionNullableRelationFilter, SuscripcionWhereInput> | null
    horarios?: HorarioListRelationFilter
    dispositivos?: DispositivoKioscoListRelationFilter
  }

  export type EmpresaOrderByWithRelationInput = {
    id?: SortOrder
    nombre?: SortOrder
    nit?: SortOrder
    email?: SortOrder
    telefono?: SortOrderInput | SortOrder
    marcadorToken?: SortOrder
    exentaPago?: SortOrder
    activa?: SortOrder
    creadoEn?: SortOrder
    actualizadoEn?: SortOrder
    usuarios?: UsuarioOrderByRelationAggregateInput
    colaboradores?: ColaboradorOrderByRelationAggregateInput
    festivos?: DiaFestivoOrderByRelationAggregateInput
    configuracion?: ConfiguracionOrderByRelationAggregateInput
    suscripcion?: SuscripcionOrderByWithRelationInput
    horarios?: HorarioOrderByRelationAggregateInput
    dispositivos?: DispositivoKioscoOrderByRelationAggregateInput
  }

  export type EmpresaWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    nit?: string
    marcadorToken?: string
    AND?: EmpresaWhereInput | EmpresaWhereInput[]
    OR?: EmpresaWhereInput[]
    NOT?: EmpresaWhereInput | EmpresaWhereInput[]
    nombre?: StringFilter<"Empresa"> | string
    email?: StringFilter<"Empresa"> | string
    telefono?: StringNullableFilter<"Empresa"> | string | null
    exentaPago?: BoolFilter<"Empresa"> | boolean
    activa?: BoolFilter<"Empresa"> | boolean
    creadoEn?: DateTimeFilter<"Empresa"> | Date | string
    actualizadoEn?: DateTimeFilter<"Empresa"> | Date | string
    usuarios?: UsuarioListRelationFilter
    colaboradores?: ColaboradorListRelationFilter
    festivos?: DiaFestivoListRelationFilter
    configuracion?: ConfiguracionListRelationFilter
    suscripcion?: XOR<SuscripcionNullableRelationFilter, SuscripcionWhereInput> | null
    horarios?: HorarioListRelationFilter
    dispositivos?: DispositivoKioscoListRelationFilter
  }, "id" | "nit" | "marcadorToken">

  export type EmpresaOrderByWithAggregationInput = {
    id?: SortOrder
    nombre?: SortOrder
    nit?: SortOrder
    email?: SortOrder
    telefono?: SortOrderInput | SortOrder
    marcadorToken?: SortOrder
    exentaPago?: SortOrder
    activa?: SortOrder
    creadoEn?: SortOrder
    actualizadoEn?: SortOrder
    _count?: EmpresaCountOrderByAggregateInput
    _max?: EmpresaMaxOrderByAggregateInput
    _min?: EmpresaMinOrderByAggregateInput
  }

  export type EmpresaScalarWhereWithAggregatesInput = {
    AND?: EmpresaScalarWhereWithAggregatesInput | EmpresaScalarWhereWithAggregatesInput[]
    OR?: EmpresaScalarWhereWithAggregatesInput[]
    NOT?: EmpresaScalarWhereWithAggregatesInput | EmpresaScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"Empresa"> | string
    nombre?: StringWithAggregatesFilter<"Empresa"> | string
    nit?: StringWithAggregatesFilter<"Empresa"> | string
    email?: StringWithAggregatesFilter<"Empresa"> | string
    telefono?: StringNullableWithAggregatesFilter<"Empresa"> | string | null
    marcadorToken?: StringWithAggregatesFilter<"Empresa"> | string
    exentaPago?: BoolWithAggregatesFilter<"Empresa"> | boolean
    activa?: BoolWithAggregatesFilter<"Empresa"> | boolean
    creadoEn?: DateTimeWithAggregatesFilter<"Empresa"> | Date | string
    actualizadoEn?: DateTimeWithAggregatesFilter<"Empresa"> | Date | string
  }

  export type SuscripcionWhereInput = {
    AND?: SuscripcionWhereInput | SuscripcionWhereInput[]
    OR?: SuscripcionWhereInput[]
    NOT?: SuscripcionWhereInput | SuscripcionWhereInput[]
    id?: StringFilter<"Suscripcion"> | string
    empresaId?: StringFilter<"Suscripcion"> | string
    estado?: EnumEstadoSuscripcionFilter<"Suscripcion"> | $Enums.EstadoSuscripcion
    finPrueba?: DateTimeFilter<"Suscripcion"> | Date | string
    pagadoHasta?: DateTimeNullableFilter<"Suscripcion"> | Date | string | null
    suspendidaEn?: DateTimeNullableFilter<"Suscripcion"> | Date | string | null
    wompiFuentePagoId?: StringNullableFilter<"Suscripcion"> | string | null
    creadoEn?: DateTimeFilter<"Suscripcion"> | Date | string
    actualizadoEn?: DateTimeFilter<"Suscripcion"> | Date | string
    empresa?: XOR<EmpresaRelationFilter, EmpresaWhereInput>
    pagos?: PagoListRelationFilter
  }

  export type SuscripcionOrderByWithRelationInput = {
    id?: SortOrder
    empresaId?: SortOrder
    estado?: SortOrder
    finPrueba?: SortOrder
    pagadoHasta?: SortOrderInput | SortOrder
    suspendidaEn?: SortOrderInput | SortOrder
    wompiFuentePagoId?: SortOrderInput | SortOrder
    creadoEn?: SortOrder
    actualizadoEn?: SortOrder
    empresa?: EmpresaOrderByWithRelationInput
    pagos?: PagoOrderByRelationAggregateInput
  }

  export type SuscripcionWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    empresaId?: string
    AND?: SuscripcionWhereInput | SuscripcionWhereInput[]
    OR?: SuscripcionWhereInput[]
    NOT?: SuscripcionWhereInput | SuscripcionWhereInput[]
    estado?: EnumEstadoSuscripcionFilter<"Suscripcion"> | $Enums.EstadoSuscripcion
    finPrueba?: DateTimeFilter<"Suscripcion"> | Date | string
    pagadoHasta?: DateTimeNullableFilter<"Suscripcion"> | Date | string | null
    suspendidaEn?: DateTimeNullableFilter<"Suscripcion"> | Date | string | null
    wompiFuentePagoId?: StringNullableFilter<"Suscripcion"> | string | null
    creadoEn?: DateTimeFilter<"Suscripcion"> | Date | string
    actualizadoEn?: DateTimeFilter<"Suscripcion"> | Date | string
    empresa?: XOR<EmpresaRelationFilter, EmpresaWhereInput>
    pagos?: PagoListRelationFilter
  }, "id" | "empresaId">

  export type SuscripcionOrderByWithAggregationInput = {
    id?: SortOrder
    empresaId?: SortOrder
    estado?: SortOrder
    finPrueba?: SortOrder
    pagadoHasta?: SortOrderInput | SortOrder
    suspendidaEn?: SortOrderInput | SortOrder
    wompiFuentePagoId?: SortOrderInput | SortOrder
    creadoEn?: SortOrder
    actualizadoEn?: SortOrder
    _count?: SuscripcionCountOrderByAggregateInput
    _max?: SuscripcionMaxOrderByAggregateInput
    _min?: SuscripcionMinOrderByAggregateInput
  }

  export type SuscripcionScalarWhereWithAggregatesInput = {
    AND?: SuscripcionScalarWhereWithAggregatesInput | SuscripcionScalarWhereWithAggregatesInput[]
    OR?: SuscripcionScalarWhereWithAggregatesInput[]
    NOT?: SuscripcionScalarWhereWithAggregatesInput | SuscripcionScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"Suscripcion"> | string
    empresaId?: StringWithAggregatesFilter<"Suscripcion"> | string
    estado?: EnumEstadoSuscripcionWithAggregatesFilter<"Suscripcion"> | $Enums.EstadoSuscripcion
    finPrueba?: DateTimeWithAggregatesFilter<"Suscripcion"> | Date | string
    pagadoHasta?: DateTimeNullableWithAggregatesFilter<"Suscripcion"> | Date | string | null
    suspendidaEn?: DateTimeNullableWithAggregatesFilter<"Suscripcion"> | Date | string | null
    wompiFuentePagoId?: StringNullableWithAggregatesFilter<"Suscripcion"> | string | null
    creadoEn?: DateTimeWithAggregatesFilter<"Suscripcion"> | Date | string
    actualizadoEn?: DateTimeWithAggregatesFilter<"Suscripcion"> | Date | string
  }

  export type PagoWhereInput = {
    AND?: PagoWhereInput | PagoWhereInput[]
    OR?: PagoWhereInput[]
    NOT?: PagoWhereInput | PagoWhereInput[]
    id?: StringFilter<"Pago"> | string
    suscripcionId?: StringFilter<"Pago"> | string
    monto?: FloatFilter<"Pago"> | number
    colaboradoresFacturados?: IntFilter<"Pago"> | number
    periodoInicio?: DateTimeFilter<"Pago"> | Date | string
    periodoFin?: DateTimeFilter<"Pago"> | Date | string
    metodo?: EnumMetodoPagoFilter<"Pago"> | $Enums.MetodoPago
    estado?: EnumEstadoPagoFilter<"Pago"> | $Enums.EstadoPago
    wompiTransaccionId?: StringNullableFilter<"Pago"> | string | null
    nota?: StringNullableFilter<"Pago"> | string | null
    comprobanteBase64?: StringNullableFilter<"Pago"> | string | null
    registradoPor?: StringNullableFilter<"Pago"> | string | null
    creadoEn?: DateTimeFilter<"Pago"> | Date | string
    suscripcion?: XOR<SuscripcionRelationFilter, SuscripcionWhereInput>
  }

  export type PagoOrderByWithRelationInput = {
    id?: SortOrder
    suscripcionId?: SortOrder
    monto?: SortOrder
    colaboradoresFacturados?: SortOrder
    periodoInicio?: SortOrder
    periodoFin?: SortOrder
    metodo?: SortOrder
    estado?: SortOrder
    wompiTransaccionId?: SortOrderInput | SortOrder
    nota?: SortOrderInput | SortOrder
    comprobanteBase64?: SortOrderInput | SortOrder
    registradoPor?: SortOrderInput | SortOrder
    creadoEn?: SortOrder
    suscripcion?: SuscripcionOrderByWithRelationInput
  }

  export type PagoWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    wompiTransaccionId?: string
    AND?: PagoWhereInput | PagoWhereInput[]
    OR?: PagoWhereInput[]
    NOT?: PagoWhereInput | PagoWhereInput[]
    suscripcionId?: StringFilter<"Pago"> | string
    monto?: FloatFilter<"Pago"> | number
    colaboradoresFacturados?: IntFilter<"Pago"> | number
    periodoInicio?: DateTimeFilter<"Pago"> | Date | string
    periodoFin?: DateTimeFilter<"Pago"> | Date | string
    metodo?: EnumMetodoPagoFilter<"Pago"> | $Enums.MetodoPago
    estado?: EnumEstadoPagoFilter<"Pago"> | $Enums.EstadoPago
    nota?: StringNullableFilter<"Pago"> | string | null
    comprobanteBase64?: StringNullableFilter<"Pago"> | string | null
    registradoPor?: StringNullableFilter<"Pago"> | string | null
    creadoEn?: DateTimeFilter<"Pago"> | Date | string
    suscripcion?: XOR<SuscripcionRelationFilter, SuscripcionWhereInput>
  }, "id" | "wompiTransaccionId">

  export type PagoOrderByWithAggregationInput = {
    id?: SortOrder
    suscripcionId?: SortOrder
    monto?: SortOrder
    colaboradoresFacturados?: SortOrder
    periodoInicio?: SortOrder
    periodoFin?: SortOrder
    metodo?: SortOrder
    estado?: SortOrder
    wompiTransaccionId?: SortOrderInput | SortOrder
    nota?: SortOrderInput | SortOrder
    comprobanteBase64?: SortOrderInput | SortOrder
    registradoPor?: SortOrderInput | SortOrder
    creadoEn?: SortOrder
    _count?: PagoCountOrderByAggregateInput
    _avg?: PagoAvgOrderByAggregateInput
    _max?: PagoMaxOrderByAggregateInput
    _min?: PagoMinOrderByAggregateInput
    _sum?: PagoSumOrderByAggregateInput
  }

  export type PagoScalarWhereWithAggregatesInput = {
    AND?: PagoScalarWhereWithAggregatesInput | PagoScalarWhereWithAggregatesInput[]
    OR?: PagoScalarWhereWithAggregatesInput[]
    NOT?: PagoScalarWhereWithAggregatesInput | PagoScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"Pago"> | string
    suscripcionId?: StringWithAggregatesFilter<"Pago"> | string
    monto?: FloatWithAggregatesFilter<"Pago"> | number
    colaboradoresFacturados?: IntWithAggregatesFilter<"Pago"> | number
    periodoInicio?: DateTimeWithAggregatesFilter<"Pago"> | Date | string
    periodoFin?: DateTimeWithAggregatesFilter<"Pago"> | Date | string
    metodo?: EnumMetodoPagoWithAggregatesFilter<"Pago"> | $Enums.MetodoPago
    estado?: EnumEstadoPagoWithAggregatesFilter<"Pago"> | $Enums.EstadoPago
    wompiTransaccionId?: StringNullableWithAggregatesFilter<"Pago"> | string | null
    nota?: StringNullableWithAggregatesFilter<"Pago"> | string | null
    comprobanteBase64?: StringNullableWithAggregatesFilter<"Pago"> | string | null
    registradoPor?: StringNullableWithAggregatesFilter<"Pago"> | string | null
    creadoEn?: DateTimeWithAggregatesFilter<"Pago"> | Date | string
  }

  export type ConfiguracionPlataformaWhereInput = {
    AND?: ConfiguracionPlataformaWhereInput | ConfiguracionPlataformaWhereInput[]
    OR?: ConfiguracionPlataformaWhereInput[]
    NOT?: ConfiguracionPlataformaWhereInput | ConfiguracionPlataformaWhereInput[]
    id?: IntFilter<"ConfiguracionPlataforma"> | number
    precioTramo1?: FloatFilter<"ConfiguracionPlataforma"> | number
    limiteTramo1?: IntFilter<"ConfiguracionPlataforma"> | number
    precioTramo2?: FloatFilter<"ConfiguracionPlataforma"> | number
  }

  export type ConfiguracionPlataformaOrderByWithRelationInput = {
    id?: SortOrder
    precioTramo1?: SortOrder
    limiteTramo1?: SortOrder
    precioTramo2?: SortOrder
  }

  export type ConfiguracionPlataformaWhereUniqueInput = Prisma.AtLeast<{
    id?: number
    AND?: ConfiguracionPlataformaWhereInput | ConfiguracionPlataformaWhereInput[]
    OR?: ConfiguracionPlataformaWhereInput[]
    NOT?: ConfiguracionPlataformaWhereInput | ConfiguracionPlataformaWhereInput[]
    precioTramo1?: FloatFilter<"ConfiguracionPlataforma"> | number
    limiteTramo1?: IntFilter<"ConfiguracionPlataforma"> | number
    precioTramo2?: FloatFilter<"ConfiguracionPlataforma"> | number
  }, "id">

  export type ConfiguracionPlataformaOrderByWithAggregationInput = {
    id?: SortOrder
    precioTramo1?: SortOrder
    limiteTramo1?: SortOrder
    precioTramo2?: SortOrder
    _count?: ConfiguracionPlataformaCountOrderByAggregateInput
    _avg?: ConfiguracionPlataformaAvgOrderByAggregateInput
    _max?: ConfiguracionPlataformaMaxOrderByAggregateInput
    _min?: ConfiguracionPlataformaMinOrderByAggregateInput
    _sum?: ConfiguracionPlataformaSumOrderByAggregateInput
  }

  export type ConfiguracionPlataformaScalarWhereWithAggregatesInput = {
    AND?: ConfiguracionPlataformaScalarWhereWithAggregatesInput | ConfiguracionPlataformaScalarWhereWithAggregatesInput[]
    OR?: ConfiguracionPlataformaScalarWhereWithAggregatesInput[]
    NOT?: ConfiguracionPlataformaScalarWhereWithAggregatesInput | ConfiguracionPlataformaScalarWhereWithAggregatesInput[]
    id?: IntWithAggregatesFilter<"ConfiguracionPlataforma"> | number
    precioTramo1?: FloatWithAggregatesFilter<"ConfiguracionPlataforma"> | number
    limiteTramo1?: IntWithAggregatesFilter<"ConfiguracionPlataforma"> | number
    precioTramo2?: FloatWithAggregatesFilter<"ConfiguracionPlataforma"> | number
  }

  export type JornadaVigenciaWhereInput = {
    AND?: JornadaVigenciaWhereInput | JornadaVigenciaWhereInput[]
    OR?: JornadaVigenciaWhereInput[]
    NOT?: JornadaVigenciaWhereInput | JornadaVigenciaWhereInput[]
    id?: StringFilter<"JornadaVigencia"> | string
    vigenteDesde?: DateTimeFilter<"JornadaVigencia"> | Date | string
    horasSemanales?: FloatFilter<"JornadaVigencia"> | number
  }

  export type JornadaVigenciaOrderByWithRelationInput = {
    id?: SortOrder
    vigenteDesde?: SortOrder
    horasSemanales?: SortOrder
  }

  export type JornadaVigenciaWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    vigenteDesde?: Date | string
    AND?: JornadaVigenciaWhereInput | JornadaVigenciaWhereInput[]
    OR?: JornadaVigenciaWhereInput[]
    NOT?: JornadaVigenciaWhereInput | JornadaVigenciaWhereInput[]
    horasSemanales?: FloatFilter<"JornadaVigencia"> | number
  }, "id" | "vigenteDesde">

  export type JornadaVigenciaOrderByWithAggregationInput = {
    id?: SortOrder
    vigenteDesde?: SortOrder
    horasSemanales?: SortOrder
    _count?: JornadaVigenciaCountOrderByAggregateInput
    _avg?: JornadaVigenciaAvgOrderByAggregateInput
    _max?: JornadaVigenciaMaxOrderByAggregateInput
    _min?: JornadaVigenciaMinOrderByAggregateInput
    _sum?: JornadaVigenciaSumOrderByAggregateInput
  }

  export type JornadaVigenciaScalarWhereWithAggregatesInput = {
    AND?: JornadaVigenciaScalarWhereWithAggregatesInput | JornadaVigenciaScalarWhereWithAggregatesInput[]
    OR?: JornadaVigenciaScalarWhereWithAggregatesInput[]
    NOT?: JornadaVigenciaScalarWhereWithAggregatesInput | JornadaVigenciaScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"JornadaVigencia"> | string
    vigenteDesde?: DateTimeWithAggregatesFilter<"JornadaVigencia"> | Date | string
    horasSemanales?: FloatWithAggregatesFilter<"JornadaVigencia"> | number
  }

  export type TipoHoraWhereInput = {
    AND?: TipoHoraWhereInput | TipoHoraWhereInput[]
    OR?: TipoHoraWhereInput[]
    NOT?: TipoHoraWhereInput | TipoHoraWhereInput[]
    id?: StringFilter<"TipoHora"> | string
    nombre?: StringFilter<"TipoHora"> | string
    codigo?: StringFilter<"TipoHora"> | string
    horaInicio?: IntFilter<"TipoHora"> | number
    horaFin?: IntFilter<"TipoHora"> | number
    recargo?: FloatFilter<"TipoHora"> | number
    aplica?: JsonFilter<"TipoHora">
    vigenteDesde?: DateTimeFilter<"TipoHora"> | Date | string
    vigenteHasta?: DateTimeNullableFilter<"TipoHora"> | Date | string | null
    activo?: BoolFilter<"TipoHora"> | boolean
  }

  export type TipoHoraOrderByWithRelationInput = {
    id?: SortOrder
    nombre?: SortOrder
    codigo?: SortOrder
    horaInicio?: SortOrder
    horaFin?: SortOrder
    recargo?: SortOrder
    aplica?: SortOrder
    vigenteDesde?: SortOrder
    vigenteHasta?: SortOrderInput | SortOrder
    activo?: SortOrder
  }

  export type TipoHoraWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    codigo_vigenteDesde?: TipoHoraCodigoVigenteDesdeCompoundUniqueInput
    AND?: TipoHoraWhereInput | TipoHoraWhereInput[]
    OR?: TipoHoraWhereInput[]
    NOT?: TipoHoraWhereInput | TipoHoraWhereInput[]
    nombre?: StringFilter<"TipoHora"> | string
    codigo?: StringFilter<"TipoHora"> | string
    horaInicio?: IntFilter<"TipoHora"> | number
    horaFin?: IntFilter<"TipoHora"> | number
    recargo?: FloatFilter<"TipoHora"> | number
    aplica?: JsonFilter<"TipoHora">
    vigenteDesde?: DateTimeFilter<"TipoHora"> | Date | string
    vigenteHasta?: DateTimeNullableFilter<"TipoHora"> | Date | string | null
    activo?: BoolFilter<"TipoHora"> | boolean
  }, "id" | "codigo_vigenteDesde">

  export type TipoHoraOrderByWithAggregationInput = {
    id?: SortOrder
    nombre?: SortOrder
    codigo?: SortOrder
    horaInicio?: SortOrder
    horaFin?: SortOrder
    recargo?: SortOrder
    aplica?: SortOrder
    vigenteDesde?: SortOrder
    vigenteHasta?: SortOrderInput | SortOrder
    activo?: SortOrder
    _count?: TipoHoraCountOrderByAggregateInput
    _avg?: TipoHoraAvgOrderByAggregateInput
    _max?: TipoHoraMaxOrderByAggregateInput
    _min?: TipoHoraMinOrderByAggregateInput
    _sum?: TipoHoraSumOrderByAggregateInput
  }

  export type TipoHoraScalarWhereWithAggregatesInput = {
    AND?: TipoHoraScalarWhereWithAggregatesInput | TipoHoraScalarWhereWithAggregatesInput[]
    OR?: TipoHoraScalarWhereWithAggregatesInput[]
    NOT?: TipoHoraScalarWhereWithAggregatesInput | TipoHoraScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"TipoHora"> | string
    nombre?: StringWithAggregatesFilter<"TipoHora"> | string
    codigo?: StringWithAggregatesFilter<"TipoHora"> | string
    horaInicio?: IntWithAggregatesFilter<"TipoHora"> | number
    horaFin?: IntWithAggregatesFilter<"TipoHora"> | number
    recargo?: FloatWithAggregatesFilter<"TipoHora"> | number
    aplica?: JsonWithAggregatesFilter<"TipoHora">
    vigenteDesde?: DateTimeWithAggregatesFilter<"TipoHora"> | Date | string
    vigenteHasta?: DateTimeNullableWithAggregatesFilter<"TipoHora"> | Date | string | null
    activo?: BoolWithAggregatesFilter<"TipoHora"> | boolean
  }

  export type HorarioWhereInput = {
    AND?: HorarioWhereInput | HorarioWhereInput[]
    OR?: HorarioWhereInput[]
    NOT?: HorarioWhereInput | HorarioWhereInput[]
    id?: StringFilter<"Horario"> | string
    empresaId?: StringFilter<"Horario"> | string
    nombre?: StringFilter<"Horario"> | string
    toleranciaMin?: IntFilter<"Horario"> | number
    activo?: BoolFilter<"Horario"> | boolean
    creadoEn?: DateTimeFilter<"Horario"> | Date | string
    empresa?: XOR<EmpresaRelationFilter, EmpresaWhereInput>
    franjas?: FranjaHorarioListRelationFilter
    colaboradores?: ColaboradorListRelationFilter
  }

  export type HorarioOrderByWithRelationInput = {
    id?: SortOrder
    empresaId?: SortOrder
    nombre?: SortOrder
    toleranciaMin?: SortOrder
    activo?: SortOrder
    creadoEn?: SortOrder
    empresa?: EmpresaOrderByWithRelationInput
    franjas?: FranjaHorarioOrderByRelationAggregateInput
    colaboradores?: ColaboradorOrderByRelationAggregateInput
  }

  export type HorarioWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: HorarioWhereInput | HorarioWhereInput[]
    OR?: HorarioWhereInput[]
    NOT?: HorarioWhereInput | HorarioWhereInput[]
    empresaId?: StringFilter<"Horario"> | string
    nombre?: StringFilter<"Horario"> | string
    toleranciaMin?: IntFilter<"Horario"> | number
    activo?: BoolFilter<"Horario"> | boolean
    creadoEn?: DateTimeFilter<"Horario"> | Date | string
    empresa?: XOR<EmpresaRelationFilter, EmpresaWhereInput>
    franjas?: FranjaHorarioListRelationFilter
    colaboradores?: ColaboradorListRelationFilter
  }, "id">

  export type HorarioOrderByWithAggregationInput = {
    id?: SortOrder
    empresaId?: SortOrder
    nombre?: SortOrder
    toleranciaMin?: SortOrder
    activo?: SortOrder
    creadoEn?: SortOrder
    _count?: HorarioCountOrderByAggregateInput
    _avg?: HorarioAvgOrderByAggregateInput
    _max?: HorarioMaxOrderByAggregateInput
    _min?: HorarioMinOrderByAggregateInput
    _sum?: HorarioSumOrderByAggregateInput
  }

  export type HorarioScalarWhereWithAggregatesInput = {
    AND?: HorarioScalarWhereWithAggregatesInput | HorarioScalarWhereWithAggregatesInput[]
    OR?: HorarioScalarWhereWithAggregatesInput[]
    NOT?: HorarioScalarWhereWithAggregatesInput | HorarioScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"Horario"> | string
    empresaId?: StringWithAggregatesFilter<"Horario"> | string
    nombre?: StringWithAggregatesFilter<"Horario"> | string
    toleranciaMin?: IntWithAggregatesFilter<"Horario"> | number
    activo?: BoolWithAggregatesFilter<"Horario"> | boolean
    creadoEn?: DateTimeWithAggregatesFilter<"Horario"> | Date | string
  }

  export type FranjaHorarioWhereInput = {
    AND?: FranjaHorarioWhereInput | FranjaHorarioWhereInput[]
    OR?: FranjaHorarioWhereInput[]
    NOT?: FranjaHorarioWhereInput | FranjaHorarioWhereInput[]
    id?: StringFilter<"FranjaHorario"> | string
    horarioId?: StringFilter<"FranjaHorario"> | string
    dias?: JsonFilter<"FranjaHorario">
    horaEntrada?: StringFilter<"FranjaHorario"> | string
    horaSalida?: StringFilter<"FranjaHorario"> | string
    horario?: XOR<HorarioRelationFilter, HorarioWhereInput>
  }

  export type FranjaHorarioOrderByWithRelationInput = {
    id?: SortOrder
    horarioId?: SortOrder
    dias?: SortOrder
    horaEntrada?: SortOrder
    horaSalida?: SortOrder
    horario?: HorarioOrderByWithRelationInput
  }

  export type FranjaHorarioWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: FranjaHorarioWhereInput | FranjaHorarioWhereInput[]
    OR?: FranjaHorarioWhereInput[]
    NOT?: FranjaHorarioWhereInput | FranjaHorarioWhereInput[]
    horarioId?: StringFilter<"FranjaHorario"> | string
    dias?: JsonFilter<"FranjaHorario">
    horaEntrada?: StringFilter<"FranjaHorario"> | string
    horaSalida?: StringFilter<"FranjaHorario"> | string
    horario?: XOR<HorarioRelationFilter, HorarioWhereInput>
  }, "id">

  export type FranjaHorarioOrderByWithAggregationInput = {
    id?: SortOrder
    horarioId?: SortOrder
    dias?: SortOrder
    horaEntrada?: SortOrder
    horaSalida?: SortOrder
    _count?: FranjaHorarioCountOrderByAggregateInput
    _max?: FranjaHorarioMaxOrderByAggregateInput
    _min?: FranjaHorarioMinOrderByAggregateInput
  }

  export type FranjaHorarioScalarWhereWithAggregatesInput = {
    AND?: FranjaHorarioScalarWhereWithAggregatesInput | FranjaHorarioScalarWhereWithAggregatesInput[]
    OR?: FranjaHorarioScalarWhereWithAggregatesInput[]
    NOT?: FranjaHorarioScalarWhereWithAggregatesInput | FranjaHorarioScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"FranjaHorario"> | string
    horarioId?: StringWithAggregatesFilter<"FranjaHorario"> | string
    dias?: JsonWithAggregatesFilter<"FranjaHorario">
    horaEntrada?: StringWithAggregatesFilter<"FranjaHorario"> | string
    horaSalida?: StringWithAggregatesFilter<"FranjaHorario"> | string
  }

  export type DispositivoKioscoWhereInput = {
    AND?: DispositivoKioscoWhereInput | DispositivoKioscoWhereInput[]
    OR?: DispositivoKioscoWhereInput[]
    NOT?: DispositivoKioscoWhereInput | DispositivoKioscoWhereInput[]
    id?: StringFilter<"DispositivoKiosco"> | string
    empresaId?: StringFilter<"DispositivoKiosco"> | string
    nombre?: StringFilter<"DispositivoKiosco"> | string
    token?: StringFilter<"DispositivoKiosco"> | string
    creadoEn?: DateTimeFilter<"DispositivoKiosco"> | Date | string
    ultimoUso?: DateTimeNullableFilter<"DispositivoKiosco"> | Date | string | null
    empresa?: XOR<EmpresaRelationFilter, EmpresaWhereInput>
  }

  export type DispositivoKioscoOrderByWithRelationInput = {
    id?: SortOrder
    empresaId?: SortOrder
    nombre?: SortOrder
    token?: SortOrder
    creadoEn?: SortOrder
    ultimoUso?: SortOrderInput | SortOrder
    empresa?: EmpresaOrderByWithRelationInput
  }

  export type DispositivoKioscoWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    token?: string
    AND?: DispositivoKioscoWhereInput | DispositivoKioscoWhereInput[]
    OR?: DispositivoKioscoWhereInput[]
    NOT?: DispositivoKioscoWhereInput | DispositivoKioscoWhereInput[]
    empresaId?: StringFilter<"DispositivoKiosco"> | string
    nombre?: StringFilter<"DispositivoKiosco"> | string
    creadoEn?: DateTimeFilter<"DispositivoKiosco"> | Date | string
    ultimoUso?: DateTimeNullableFilter<"DispositivoKiosco"> | Date | string | null
    empresa?: XOR<EmpresaRelationFilter, EmpresaWhereInput>
  }, "id" | "token">

  export type DispositivoKioscoOrderByWithAggregationInput = {
    id?: SortOrder
    empresaId?: SortOrder
    nombre?: SortOrder
    token?: SortOrder
    creadoEn?: SortOrder
    ultimoUso?: SortOrderInput | SortOrder
    _count?: DispositivoKioscoCountOrderByAggregateInput
    _max?: DispositivoKioscoMaxOrderByAggregateInput
    _min?: DispositivoKioscoMinOrderByAggregateInput
  }

  export type DispositivoKioscoScalarWhereWithAggregatesInput = {
    AND?: DispositivoKioscoScalarWhereWithAggregatesInput | DispositivoKioscoScalarWhereWithAggregatesInput[]
    OR?: DispositivoKioscoScalarWhereWithAggregatesInput[]
    NOT?: DispositivoKioscoScalarWhereWithAggregatesInput | DispositivoKioscoScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"DispositivoKiosco"> | string
    empresaId?: StringWithAggregatesFilter<"DispositivoKiosco"> | string
    nombre?: StringWithAggregatesFilter<"DispositivoKiosco"> | string
    token?: StringWithAggregatesFilter<"DispositivoKiosco"> | string
    creadoEn?: DateTimeWithAggregatesFilter<"DispositivoKiosco"> | Date | string
    ultimoUso?: DateTimeNullableWithAggregatesFilter<"DispositivoKiosco"> | Date | string | null
  }

  export type ColaboradorWhereInput = {
    AND?: ColaboradorWhereInput | ColaboradorWhereInput[]
    OR?: ColaboradorWhereInput[]
    NOT?: ColaboradorWhereInput | ColaboradorWhereInput[]
    id?: StringFilter<"Colaborador"> | string
    empresaId?: StringFilter<"Colaborador"> | string
    nombre?: StringFilter<"Colaborador"> | string
    apellido?: StringFilter<"Colaborador"> | string
    cedula?: StringFilter<"Colaborador"> | string
    cargo?: StringNullableFilter<"Colaborador"> | string | null
    email?: StringNullableFilter<"Colaborador"> | string | null
    telefono?: StringNullableFilter<"Colaborador"> | string | null
    fechaNacimiento?: DateTimeNullableFilter<"Colaborador"> | Date | string | null
    salarioMensual?: FloatFilter<"Colaborador"> | number
    rostroDescriptor?: JsonNullableFilter<"Colaborador">
    rostroEnroladoEn?: DateTimeNullableFilter<"Colaborador"> | Date | string | null
    horarioId?: StringNullableFilter<"Colaborador"> | string | null
    activo?: BoolFilter<"Colaborador"> | boolean
    retiroProgramado?: DateTimeNullableFilter<"Colaborador"> | Date | string | null
    creadoEn?: DateTimeFilter<"Colaborador"> | Date | string
    actualizadoEn?: DateTimeFilter<"Colaborador"> | Date | string
    empresa?: XOR<EmpresaRelationFilter, EmpresaWhereInput>
    horario?: XOR<HorarioNullableRelationFilter, HorarioWhereInput> | null
    registros?: RegistroListRelationFilter
    permisos?: PermisoListRelationFilter
  }

  export type ColaboradorOrderByWithRelationInput = {
    id?: SortOrder
    empresaId?: SortOrder
    nombre?: SortOrder
    apellido?: SortOrder
    cedula?: SortOrder
    cargo?: SortOrderInput | SortOrder
    email?: SortOrderInput | SortOrder
    telefono?: SortOrderInput | SortOrder
    fechaNacimiento?: SortOrderInput | SortOrder
    salarioMensual?: SortOrder
    rostroDescriptor?: SortOrderInput | SortOrder
    rostroEnroladoEn?: SortOrderInput | SortOrder
    horarioId?: SortOrderInput | SortOrder
    activo?: SortOrder
    retiroProgramado?: SortOrderInput | SortOrder
    creadoEn?: SortOrder
    actualizadoEn?: SortOrder
    empresa?: EmpresaOrderByWithRelationInput
    horario?: HorarioOrderByWithRelationInput
    registros?: RegistroOrderByRelationAggregateInput
    permisos?: PermisoOrderByRelationAggregateInput
  }

  export type ColaboradorWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    empresaId_cedula?: ColaboradorEmpresaIdCedulaCompoundUniqueInput
    AND?: ColaboradorWhereInput | ColaboradorWhereInput[]
    OR?: ColaboradorWhereInput[]
    NOT?: ColaboradorWhereInput | ColaboradorWhereInput[]
    empresaId?: StringFilter<"Colaborador"> | string
    nombre?: StringFilter<"Colaborador"> | string
    apellido?: StringFilter<"Colaborador"> | string
    cedula?: StringFilter<"Colaborador"> | string
    cargo?: StringNullableFilter<"Colaborador"> | string | null
    email?: StringNullableFilter<"Colaborador"> | string | null
    telefono?: StringNullableFilter<"Colaborador"> | string | null
    fechaNacimiento?: DateTimeNullableFilter<"Colaborador"> | Date | string | null
    salarioMensual?: FloatFilter<"Colaborador"> | number
    rostroDescriptor?: JsonNullableFilter<"Colaborador">
    rostroEnroladoEn?: DateTimeNullableFilter<"Colaborador"> | Date | string | null
    horarioId?: StringNullableFilter<"Colaborador"> | string | null
    activo?: BoolFilter<"Colaborador"> | boolean
    retiroProgramado?: DateTimeNullableFilter<"Colaborador"> | Date | string | null
    creadoEn?: DateTimeFilter<"Colaborador"> | Date | string
    actualizadoEn?: DateTimeFilter<"Colaborador"> | Date | string
    empresa?: XOR<EmpresaRelationFilter, EmpresaWhereInput>
    horario?: XOR<HorarioNullableRelationFilter, HorarioWhereInput> | null
    registros?: RegistroListRelationFilter
    permisos?: PermisoListRelationFilter
  }, "id" | "empresaId_cedula">

  export type ColaboradorOrderByWithAggregationInput = {
    id?: SortOrder
    empresaId?: SortOrder
    nombre?: SortOrder
    apellido?: SortOrder
    cedula?: SortOrder
    cargo?: SortOrderInput | SortOrder
    email?: SortOrderInput | SortOrder
    telefono?: SortOrderInput | SortOrder
    fechaNacimiento?: SortOrderInput | SortOrder
    salarioMensual?: SortOrder
    rostroDescriptor?: SortOrderInput | SortOrder
    rostroEnroladoEn?: SortOrderInput | SortOrder
    horarioId?: SortOrderInput | SortOrder
    activo?: SortOrder
    retiroProgramado?: SortOrderInput | SortOrder
    creadoEn?: SortOrder
    actualizadoEn?: SortOrder
    _count?: ColaboradorCountOrderByAggregateInput
    _avg?: ColaboradorAvgOrderByAggregateInput
    _max?: ColaboradorMaxOrderByAggregateInput
    _min?: ColaboradorMinOrderByAggregateInput
    _sum?: ColaboradorSumOrderByAggregateInput
  }

  export type ColaboradorScalarWhereWithAggregatesInput = {
    AND?: ColaboradorScalarWhereWithAggregatesInput | ColaboradorScalarWhereWithAggregatesInput[]
    OR?: ColaboradorScalarWhereWithAggregatesInput[]
    NOT?: ColaboradorScalarWhereWithAggregatesInput | ColaboradorScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"Colaborador"> | string
    empresaId?: StringWithAggregatesFilter<"Colaborador"> | string
    nombre?: StringWithAggregatesFilter<"Colaborador"> | string
    apellido?: StringWithAggregatesFilter<"Colaborador"> | string
    cedula?: StringWithAggregatesFilter<"Colaborador"> | string
    cargo?: StringNullableWithAggregatesFilter<"Colaborador"> | string | null
    email?: StringNullableWithAggregatesFilter<"Colaborador"> | string | null
    telefono?: StringNullableWithAggregatesFilter<"Colaborador"> | string | null
    fechaNacimiento?: DateTimeNullableWithAggregatesFilter<"Colaborador"> | Date | string | null
    salarioMensual?: FloatWithAggregatesFilter<"Colaborador"> | number
    rostroDescriptor?: JsonNullableWithAggregatesFilter<"Colaborador">
    rostroEnroladoEn?: DateTimeNullableWithAggregatesFilter<"Colaborador"> | Date | string | null
    horarioId?: StringNullableWithAggregatesFilter<"Colaborador"> | string | null
    activo?: BoolWithAggregatesFilter<"Colaborador"> | boolean
    retiroProgramado?: DateTimeNullableWithAggregatesFilter<"Colaborador"> | Date | string | null
    creadoEn?: DateTimeWithAggregatesFilter<"Colaborador"> | Date | string
    actualizadoEn?: DateTimeWithAggregatesFilter<"Colaborador"> | Date | string
  }

  export type RegistroWhereInput = {
    AND?: RegistroWhereInput | RegistroWhereInput[]
    OR?: RegistroWhereInput[]
    NOT?: RegistroWhereInput | RegistroWhereInput[]
    id?: StringFilter<"Registro"> | string
    colaboradorId?: StringFilter<"Registro"> | string
    fecha?: DateTimeFilter<"Registro"> | Date | string
    entrada?: DateTimeNullableFilter<"Registro"> | Date | string | null
    salida?: DateTimeNullableFilter<"Registro"> | Date | string | null
    tipo?: EnumTipoRegistroFilter<"Registro"> | $Enums.TipoRegistro
    observacion?: StringNullableFilter<"Registro"> | string | null
    fotoEntrada?: StringNullableFilter<"Registro"> | string | null
    fotoSalida?: StringNullableFilter<"Registro"> | string | null
    editadoPor?: StringNullableFilter<"Registro"> | string | null
    editadoEn?: DateTimeNullableFilter<"Registro"> | Date | string | null
    creadoEn?: DateTimeFilter<"Registro"> | Date | string
    colaborador?: XOR<ColaboradorRelationFilter, ColaboradorWhereInput>
  }

  export type RegistroOrderByWithRelationInput = {
    id?: SortOrder
    colaboradorId?: SortOrder
    fecha?: SortOrder
    entrada?: SortOrderInput | SortOrder
    salida?: SortOrderInput | SortOrder
    tipo?: SortOrder
    observacion?: SortOrderInput | SortOrder
    fotoEntrada?: SortOrderInput | SortOrder
    fotoSalida?: SortOrderInput | SortOrder
    editadoPor?: SortOrderInput | SortOrder
    editadoEn?: SortOrderInput | SortOrder
    creadoEn?: SortOrder
    colaborador?: ColaboradorOrderByWithRelationInput
  }

  export type RegistroWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: RegistroWhereInput | RegistroWhereInput[]
    OR?: RegistroWhereInput[]
    NOT?: RegistroWhereInput | RegistroWhereInput[]
    colaboradorId?: StringFilter<"Registro"> | string
    fecha?: DateTimeFilter<"Registro"> | Date | string
    entrada?: DateTimeNullableFilter<"Registro"> | Date | string | null
    salida?: DateTimeNullableFilter<"Registro"> | Date | string | null
    tipo?: EnumTipoRegistroFilter<"Registro"> | $Enums.TipoRegistro
    observacion?: StringNullableFilter<"Registro"> | string | null
    fotoEntrada?: StringNullableFilter<"Registro"> | string | null
    fotoSalida?: StringNullableFilter<"Registro"> | string | null
    editadoPor?: StringNullableFilter<"Registro"> | string | null
    editadoEn?: DateTimeNullableFilter<"Registro"> | Date | string | null
    creadoEn?: DateTimeFilter<"Registro"> | Date | string
    colaborador?: XOR<ColaboradorRelationFilter, ColaboradorWhereInput>
  }, "id">

  export type RegistroOrderByWithAggregationInput = {
    id?: SortOrder
    colaboradorId?: SortOrder
    fecha?: SortOrder
    entrada?: SortOrderInput | SortOrder
    salida?: SortOrderInput | SortOrder
    tipo?: SortOrder
    observacion?: SortOrderInput | SortOrder
    fotoEntrada?: SortOrderInput | SortOrder
    fotoSalida?: SortOrderInput | SortOrder
    editadoPor?: SortOrderInput | SortOrder
    editadoEn?: SortOrderInput | SortOrder
    creadoEn?: SortOrder
    _count?: RegistroCountOrderByAggregateInput
    _max?: RegistroMaxOrderByAggregateInput
    _min?: RegistroMinOrderByAggregateInput
  }

  export type RegistroScalarWhereWithAggregatesInput = {
    AND?: RegistroScalarWhereWithAggregatesInput | RegistroScalarWhereWithAggregatesInput[]
    OR?: RegistroScalarWhereWithAggregatesInput[]
    NOT?: RegistroScalarWhereWithAggregatesInput | RegistroScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"Registro"> | string
    colaboradorId?: StringWithAggregatesFilter<"Registro"> | string
    fecha?: DateTimeWithAggregatesFilter<"Registro"> | Date | string
    entrada?: DateTimeNullableWithAggregatesFilter<"Registro"> | Date | string | null
    salida?: DateTimeNullableWithAggregatesFilter<"Registro"> | Date | string | null
    tipo?: EnumTipoRegistroWithAggregatesFilter<"Registro"> | $Enums.TipoRegistro
    observacion?: StringNullableWithAggregatesFilter<"Registro"> | string | null
    fotoEntrada?: StringNullableWithAggregatesFilter<"Registro"> | string | null
    fotoSalida?: StringNullableWithAggregatesFilter<"Registro"> | string | null
    editadoPor?: StringNullableWithAggregatesFilter<"Registro"> | string | null
    editadoEn?: DateTimeNullableWithAggregatesFilter<"Registro"> | Date | string | null
    creadoEn?: DateTimeWithAggregatesFilter<"Registro"> | Date | string
  }

  export type PermisoWhereInput = {
    AND?: PermisoWhereInput | PermisoWhereInput[]
    OR?: PermisoWhereInput[]
    NOT?: PermisoWhereInput | PermisoWhereInput[]
    id?: StringFilter<"Permiso"> | string
    colaboradorId?: StringFilter<"Permiso"> | string
    fechaInicio?: DateTimeFilter<"Permiso"> | Date | string
    fechaFin?: DateTimeFilter<"Permiso"> | Date | string
    tipo?: EnumTipoPermisoFilter<"Permiso"> | $Enums.TipoPermiso
    descripcion?: StringNullableFilter<"Permiso"> | string | null
    aprobado?: BoolFilter<"Permiso"> | boolean
    creadoEn?: DateTimeFilter<"Permiso"> | Date | string
    colaborador?: XOR<ColaboradorRelationFilter, ColaboradorWhereInput>
  }

  export type PermisoOrderByWithRelationInput = {
    id?: SortOrder
    colaboradorId?: SortOrder
    fechaInicio?: SortOrder
    fechaFin?: SortOrder
    tipo?: SortOrder
    descripcion?: SortOrderInput | SortOrder
    aprobado?: SortOrder
    creadoEn?: SortOrder
    colaborador?: ColaboradorOrderByWithRelationInput
  }

  export type PermisoWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: PermisoWhereInput | PermisoWhereInput[]
    OR?: PermisoWhereInput[]
    NOT?: PermisoWhereInput | PermisoWhereInput[]
    colaboradorId?: StringFilter<"Permiso"> | string
    fechaInicio?: DateTimeFilter<"Permiso"> | Date | string
    fechaFin?: DateTimeFilter<"Permiso"> | Date | string
    tipo?: EnumTipoPermisoFilter<"Permiso"> | $Enums.TipoPermiso
    descripcion?: StringNullableFilter<"Permiso"> | string | null
    aprobado?: BoolFilter<"Permiso"> | boolean
    creadoEn?: DateTimeFilter<"Permiso"> | Date | string
    colaborador?: XOR<ColaboradorRelationFilter, ColaboradorWhereInput>
  }, "id">

  export type PermisoOrderByWithAggregationInput = {
    id?: SortOrder
    colaboradorId?: SortOrder
    fechaInicio?: SortOrder
    fechaFin?: SortOrder
    tipo?: SortOrder
    descripcion?: SortOrderInput | SortOrder
    aprobado?: SortOrder
    creadoEn?: SortOrder
    _count?: PermisoCountOrderByAggregateInput
    _max?: PermisoMaxOrderByAggregateInput
    _min?: PermisoMinOrderByAggregateInput
  }

  export type PermisoScalarWhereWithAggregatesInput = {
    AND?: PermisoScalarWhereWithAggregatesInput | PermisoScalarWhereWithAggregatesInput[]
    OR?: PermisoScalarWhereWithAggregatesInput[]
    NOT?: PermisoScalarWhereWithAggregatesInput | PermisoScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"Permiso"> | string
    colaboradorId?: StringWithAggregatesFilter<"Permiso"> | string
    fechaInicio?: DateTimeWithAggregatesFilter<"Permiso"> | Date | string
    fechaFin?: DateTimeWithAggregatesFilter<"Permiso"> | Date | string
    tipo?: EnumTipoPermisoWithAggregatesFilter<"Permiso"> | $Enums.TipoPermiso
    descripcion?: StringNullableWithAggregatesFilter<"Permiso"> | string | null
    aprobado?: BoolWithAggregatesFilter<"Permiso"> | boolean
    creadoEn?: DateTimeWithAggregatesFilter<"Permiso"> | Date | string
  }

  export type DiaFestivoWhereInput = {
    AND?: DiaFestivoWhereInput | DiaFestivoWhereInput[]
    OR?: DiaFestivoWhereInput[]
    NOT?: DiaFestivoWhereInput | DiaFestivoWhereInput[]
    id?: StringFilter<"DiaFestivo"> | string
    empresaId?: StringNullableFilter<"DiaFestivo"> | string | null
    fecha?: DateTimeFilter<"DiaFestivo"> | Date | string
    nombre?: StringFilter<"DiaFestivo"> | string
    creadoEn?: DateTimeFilter<"DiaFestivo"> | Date | string
    empresa?: XOR<EmpresaNullableRelationFilter, EmpresaWhereInput> | null
  }

  export type DiaFestivoOrderByWithRelationInput = {
    id?: SortOrder
    empresaId?: SortOrderInput | SortOrder
    fecha?: SortOrder
    nombre?: SortOrder
    creadoEn?: SortOrder
    empresa?: EmpresaOrderByWithRelationInput
  }

  export type DiaFestivoWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    empresaId_fecha?: DiaFestivoEmpresaIdFechaCompoundUniqueInput
    AND?: DiaFestivoWhereInput | DiaFestivoWhereInput[]
    OR?: DiaFestivoWhereInput[]
    NOT?: DiaFestivoWhereInput | DiaFestivoWhereInput[]
    empresaId?: StringNullableFilter<"DiaFestivo"> | string | null
    fecha?: DateTimeFilter<"DiaFestivo"> | Date | string
    nombre?: StringFilter<"DiaFestivo"> | string
    creadoEn?: DateTimeFilter<"DiaFestivo"> | Date | string
    empresa?: XOR<EmpresaNullableRelationFilter, EmpresaWhereInput> | null
  }, "id" | "empresaId_fecha">

  export type DiaFestivoOrderByWithAggregationInput = {
    id?: SortOrder
    empresaId?: SortOrderInput | SortOrder
    fecha?: SortOrder
    nombre?: SortOrder
    creadoEn?: SortOrder
    _count?: DiaFestivoCountOrderByAggregateInput
    _max?: DiaFestivoMaxOrderByAggregateInput
    _min?: DiaFestivoMinOrderByAggregateInput
  }

  export type DiaFestivoScalarWhereWithAggregatesInput = {
    AND?: DiaFestivoScalarWhereWithAggregatesInput | DiaFestivoScalarWhereWithAggregatesInput[]
    OR?: DiaFestivoScalarWhereWithAggregatesInput[]
    NOT?: DiaFestivoScalarWhereWithAggregatesInput | DiaFestivoScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"DiaFestivo"> | string
    empresaId?: StringNullableWithAggregatesFilter<"DiaFestivo"> | string | null
    fecha?: DateTimeWithAggregatesFilter<"DiaFestivo"> | Date | string
    nombre?: StringWithAggregatesFilter<"DiaFestivo"> | string
    creadoEn?: DateTimeWithAggregatesFilter<"DiaFestivo"> | Date | string
  }

  export type ConfiguracionWhereInput = {
    AND?: ConfiguracionWhereInput | ConfiguracionWhereInput[]
    OR?: ConfiguracionWhereInput[]
    NOT?: ConfiguracionWhereInput | ConfiguracionWhereInput[]
    id?: StringFilter<"Configuracion"> | string
    empresaId?: StringFilter<"Configuracion"> | string
    clave?: StringFilter<"Configuracion"> | string
    valor?: StringFilter<"Configuracion"> | string
    empresa?: XOR<EmpresaRelationFilter, EmpresaWhereInput>
  }

  export type ConfiguracionOrderByWithRelationInput = {
    id?: SortOrder
    empresaId?: SortOrder
    clave?: SortOrder
    valor?: SortOrder
    empresa?: EmpresaOrderByWithRelationInput
  }

  export type ConfiguracionWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    empresaId_clave?: ConfiguracionEmpresaIdClaveCompoundUniqueInput
    AND?: ConfiguracionWhereInput | ConfiguracionWhereInput[]
    OR?: ConfiguracionWhereInput[]
    NOT?: ConfiguracionWhereInput | ConfiguracionWhereInput[]
    empresaId?: StringFilter<"Configuracion"> | string
    clave?: StringFilter<"Configuracion"> | string
    valor?: StringFilter<"Configuracion"> | string
    empresa?: XOR<EmpresaRelationFilter, EmpresaWhereInput>
  }, "id" | "empresaId_clave">

  export type ConfiguracionOrderByWithAggregationInput = {
    id?: SortOrder
    empresaId?: SortOrder
    clave?: SortOrder
    valor?: SortOrder
    _count?: ConfiguracionCountOrderByAggregateInput
    _max?: ConfiguracionMaxOrderByAggregateInput
    _min?: ConfiguracionMinOrderByAggregateInput
  }

  export type ConfiguracionScalarWhereWithAggregatesInput = {
    AND?: ConfiguracionScalarWhereWithAggregatesInput | ConfiguracionScalarWhereWithAggregatesInput[]
    OR?: ConfiguracionScalarWhereWithAggregatesInput[]
    NOT?: ConfiguracionScalarWhereWithAggregatesInput | ConfiguracionScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"Configuracion"> | string
    empresaId?: StringWithAggregatesFilter<"Configuracion"> | string
    clave?: StringWithAggregatesFilter<"Configuracion"> | string
    valor?: StringWithAggregatesFilter<"Configuracion"> | string
  }

  export type UsuarioWhereInput = {
    AND?: UsuarioWhereInput | UsuarioWhereInput[]
    OR?: UsuarioWhereInput[]
    NOT?: UsuarioWhereInput | UsuarioWhereInput[]
    id?: StringFilter<"Usuario"> | string
    empresaId?: StringNullableFilter<"Usuario"> | string | null
    email?: StringFilter<"Usuario"> | string
    password?: StringFilter<"Usuario"> | string
    nombre?: StringFilter<"Usuario"> | string
    rol?: EnumRolFilter<"Usuario"> | $Enums.Rol
    activo?: BoolFilter<"Usuario"> | boolean
    resetToken?: StringNullableFilter<"Usuario"> | string | null
    resetExpira?: DateTimeNullableFilter<"Usuario"> | Date | string | null
    emailVerificado?: BoolFilter<"Usuario"> | boolean
    verificacionCodigo?: StringNullableFilter<"Usuario"> | string | null
    verificacionExpira?: DateTimeNullableFilter<"Usuario"> | Date | string | null
    creadoEn?: DateTimeFilter<"Usuario"> | Date | string
    empresa?: XOR<EmpresaNullableRelationFilter, EmpresaWhereInput> | null
  }

  export type UsuarioOrderByWithRelationInput = {
    id?: SortOrder
    empresaId?: SortOrderInput | SortOrder
    email?: SortOrder
    password?: SortOrder
    nombre?: SortOrder
    rol?: SortOrder
    activo?: SortOrder
    resetToken?: SortOrderInput | SortOrder
    resetExpira?: SortOrderInput | SortOrder
    emailVerificado?: SortOrder
    verificacionCodigo?: SortOrderInput | SortOrder
    verificacionExpira?: SortOrderInput | SortOrder
    creadoEn?: SortOrder
    empresa?: EmpresaOrderByWithRelationInput
  }

  export type UsuarioWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    email?: string
    resetToken?: string
    AND?: UsuarioWhereInput | UsuarioWhereInput[]
    OR?: UsuarioWhereInput[]
    NOT?: UsuarioWhereInput | UsuarioWhereInput[]
    empresaId?: StringNullableFilter<"Usuario"> | string | null
    password?: StringFilter<"Usuario"> | string
    nombre?: StringFilter<"Usuario"> | string
    rol?: EnumRolFilter<"Usuario"> | $Enums.Rol
    activo?: BoolFilter<"Usuario"> | boolean
    resetExpira?: DateTimeNullableFilter<"Usuario"> | Date | string | null
    emailVerificado?: BoolFilter<"Usuario"> | boolean
    verificacionCodigo?: StringNullableFilter<"Usuario"> | string | null
    verificacionExpira?: DateTimeNullableFilter<"Usuario"> | Date | string | null
    creadoEn?: DateTimeFilter<"Usuario"> | Date | string
    empresa?: XOR<EmpresaNullableRelationFilter, EmpresaWhereInput> | null
  }, "id" | "email" | "resetToken">

  export type UsuarioOrderByWithAggregationInput = {
    id?: SortOrder
    empresaId?: SortOrderInput | SortOrder
    email?: SortOrder
    password?: SortOrder
    nombre?: SortOrder
    rol?: SortOrder
    activo?: SortOrder
    resetToken?: SortOrderInput | SortOrder
    resetExpira?: SortOrderInput | SortOrder
    emailVerificado?: SortOrder
    verificacionCodigo?: SortOrderInput | SortOrder
    verificacionExpira?: SortOrderInput | SortOrder
    creadoEn?: SortOrder
    _count?: UsuarioCountOrderByAggregateInput
    _max?: UsuarioMaxOrderByAggregateInput
    _min?: UsuarioMinOrderByAggregateInput
  }

  export type UsuarioScalarWhereWithAggregatesInput = {
    AND?: UsuarioScalarWhereWithAggregatesInput | UsuarioScalarWhereWithAggregatesInput[]
    OR?: UsuarioScalarWhereWithAggregatesInput[]
    NOT?: UsuarioScalarWhereWithAggregatesInput | UsuarioScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"Usuario"> | string
    empresaId?: StringNullableWithAggregatesFilter<"Usuario"> | string | null
    email?: StringWithAggregatesFilter<"Usuario"> | string
    password?: StringWithAggregatesFilter<"Usuario"> | string
    nombre?: StringWithAggregatesFilter<"Usuario"> | string
    rol?: EnumRolWithAggregatesFilter<"Usuario"> | $Enums.Rol
    activo?: BoolWithAggregatesFilter<"Usuario"> | boolean
    resetToken?: StringNullableWithAggregatesFilter<"Usuario"> | string | null
    resetExpira?: DateTimeNullableWithAggregatesFilter<"Usuario"> | Date | string | null
    emailVerificado?: BoolWithAggregatesFilter<"Usuario"> | boolean
    verificacionCodigo?: StringNullableWithAggregatesFilter<"Usuario"> | string | null
    verificacionExpira?: DateTimeNullableWithAggregatesFilter<"Usuario"> | Date | string | null
    creadoEn?: DateTimeWithAggregatesFilter<"Usuario"> | Date | string
  }

  export type EmpresaCreateInput = {
    id?: string
    nombre: string
    nit: string
    email: string
    telefono?: string | null
    marcadorToken?: string
    exentaPago?: boolean
    activa?: boolean
    creadoEn?: Date | string
    actualizadoEn?: Date | string
    usuarios?: UsuarioCreateNestedManyWithoutEmpresaInput
    colaboradores?: ColaboradorCreateNestedManyWithoutEmpresaInput
    festivos?: DiaFestivoCreateNestedManyWithoutEmpresaInput
    configuracion?: ConfiguracionCreateNestedManyWithoutEmpresaInput
    suscripcion?: SuscripcionCreateNestedOneWithoutEmpresaInput
    horarios?: HorarioCreateNestedManyWithoutEmpresaInput
    dispositivos?: DispositivoKioscoCreateNestedManyWithoutEmpresaInput
  }

  export type EmpresaUncheckedCreateInput = {
    id?: string
    nombre: string
    nit: string
    email: string
    telefono?: string | null
    marcadorToken?: string
    exentaPago?: boolean
    activa?: boolean
    creadoEn?: Date | string
    actualizadoEn?: Date | string
    usuarios?: UsuarioUncheckedCreateNestedManyWithoutEmpresaInput
    colaboradores?: ColaboradorUncheckedCreateNestedManyWithoutEmpresaInput
    festivos?: DiaFestivoUncheckedCreateNestedManyWithoutEmpresaInput
    configuracion?: ConfiguracionUncheckedCreateNestedManyWithoutEmpresaInput
    suscripcion?: SuscripcionUncheckedCreateNestedOneWithoutEmpresaInput
    horarios?: HorarioUncheckedCreateNestedManyWithoutEmpresaInput
    dispositivos?: DispositivoKioscoUncheckedCreateNestedManyWithoutEmpresaInput
  }

  export type EmpresaUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    nombre?: StringFieldUpdateOperationsInput | string
    nit?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    telefono?: NullableStringFieldUpdateOperationsInput | string | null
    marcadorToken?: StringFieldUpdateOperationsInput | string
    exentaPago?: BoolFieldUpdateOperationsInput | boolean
    activa?: BoolFieldUpdateOperationsInput | boolean
    creadoEn?: DateTimeFieldUpdateOperationsInput | Date | string
    actualizadoEn?: DateTimeFieldUpdateOperationsInput | Date | string
    usuarios?: UsuarioUpdateManyWithoutEmpresaNestedInput
    colaboradores?: ColaboradorUpdateManyWithoutEmpresaNestedInput
    festivos?: DiaFestivoUpdateManyWithoutEmpresaNestedInput
    configuracion?: ConfiguracionUpdateManyWithoutEmpresaNestedInput
    suscripcion?: SuscripcionUpdateOneWithoutEmpresaNestedInput
    horarios?: HorarioUpdateManyWithoutEmpresaNestedInput
    dispositivos?: DispositivoKioscoUpdateManyWithoutEmpresaNestedInput
  }

  export type EmpresaUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    nombre?: StringFieldUpdateOperationsInput | string
    nit?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    telefono?: NullableStringFieldUpdateOperationsInput | string | null
    marcadorToken?: StringFieldUpdateOperationsInput | string
    exentaPago?: BoolFieldUpdateOperationsInput | boolean
    activa?: BoolFieldUpdateOperationsInput | boolean
    creadoEn?: DateTimeFieldUpdateOperationsInput | Date | string
    actualizadoEn?: DateTimeFieldUpdateOperationsInput | Date | string
    usuarios?: UsuarioUncheckedUpdateManyWithoutEmpresaNestedInput
    colaboradores?: ColaboradorUncheckedUpdateManyWithoutEmpresaNestedInput
    festivos?: DiaFestivoUncheckedUpdateManyWithoutEmpresaNestedInput
    configuracion?: ConfiguracionUncheckedUpdateManyWithoutEmpresaNestedInput
    suscripcion?: SuscripcionUncheckedUpdateOneWithoutEmpresaNestedInput
    horarios?: HorarioUncheckedUpdateManyWithoutEmpresaNestedInput
    dispositivos?: DispositivoKioscoUncheckedUpdateManyWithoutEmpresaNestedInput
  }

  export type EmpresaCreateManyInput = {
    id?: string
    nombre: string
    nit: string
    email: string
    telefono?: string | null
    marcadorToken?: string
    exentaPago?: boolean
    activa?: boolean
    creadoEn?: Date | string
    actualizadoEn?: Date | string
  }

  export type EmpresaUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    nombre?: StringFieldUpdateOperationsInput | string
    nit?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    telefono?: NullableStringFieldUpdateOperationsInput | string | null
    marcadorToken?: StringFieldUpdateOperationsInput | string
    exentaPago?: BoolFieldUpdateOperationsInput | boolean
    activa?: BoolFieldUpdateOperationsInput | boolean
    creadoEn?: DateTimeFieldUpdateOperationsInput | Date | string
    actualizadoEn?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type EmpresaUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    nombre?: StringFieldUpdateOperationsInput | string
    nit?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    telefono?: NullableStringFieldUpdateOperationsInput | string | null
    marcadorToken?: StringFieldUpdateOperationsInput | string
    exentaPago?: BoolFieldUpdateOperationsInput | boolean
    activa?: BoolFieldUpdateOperationsInput | boolean
    creadoEn?: DateTimeFieldUpdateOperationsInput | Date | string
    actualizadoEn?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type SuscripcionCreateInput = {
    id?: string
    estado?: $Enums.EstadoSuscripcion
    finPrueba: Date | string
    pagadoHasta?: Date | string | null
    suspendidaEn?: Date | string | null
    wompiFuentePagoId?: string | null
    creadoEn?: Date | string
    actualizadoEn?: Date | string
    empresa: EmpresaCreateNestedOneWithoutSuscripcionInput
    pagos?: PagoCreateNestedManyWithoutSuscripcionInput
  }

  export type SuscripcionUncheckedCreateInput = {
    id?: string
    empresaId: string
    estado?: $Enums.EstadoSuscripcion
    finPrueba: Date | string
    pagadoHasta?: Date | string | null
    suspendidaEn?: Date | string | null
    wompiFuentePagoId?: string | null
    creadoEn?: Date | string
    actualizadoEn?: Date | string
    pagos?: PagoUncheckedCreateNestedManyWithoutSuscripcionInput
  }

  export type SuscripcionUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    estado?: EnumEstadoSuscripcionFieldUpdateOperationsInput | $Enums.EstadoSuscripcion
    finPrueba?: DateTimeFieldUpdateOperationsInput | Date | string
    pagadoHasta?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    suspendidaEn?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    wompiFuentePagoId?: NullableStringFieldUpdateOperationsInput | string | null
    creadoEn?: DateTimeFieldUpdateOperationsInput | Date | string
    actualizadoEn?: DateTimeFieldUpdateOperationsInput | Date | string
    empresa?: EmpresaUpdateOneRequiredWithoutSuscripcionNestedInput
    pagos?: PagoUpdateManyWithoutSuscripcionNestedInput
  }

  export type SuscripcionUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    empresaId?: StringFieldUpdateOperationsInput | string
    estado?: EnumEstadoSuscripcionFieldUpdateOperationsInput | $Enums.EstadoSuscripcion
    finPrueba?: DateTimeFieldUpdateOperationsInput | Date | string
    pagadoHasta?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    suspendidaEn?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    wompiFuentePagoId?: NullableStringFieldUpdateOperationsInput | string | null
    creadoEn?: DateTimeFieldUpdateOperationsInput | Date | string
    actualizadoEn?: DateTimeFieldUpdateOperationsInput | Date | string
    pagos?: PagoUncheckedUpdateManyWithoutSuscripcionNestedInput
  }

  export type SuscripcionCreateManyInput = {
    id?: string
    empresaId: string
    estado?: $Enums.EstadoSuscripcion
    finPrueba: Date | string
    pagadoHasta?: Date | string | null
    suspendidaEn?: Date | string | null
    wompiFuentePagoId?: string | null
    creadoEn?: Date | string
    actualizadoEn?: Date | string
  }

  export type SuscripcionUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    estado?: EnumEstadoSuscripcionFieldUpdateOperationsInput | $Enums.EstadoSuscripcion
    finPrueba?: DateTimeFieldUpdateOperationsInput | Date | string
    pagadoHasta?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    suspendidaEn?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    wompiFuentePagoId?: NullableStringFieldUpdateOperationsInput | string | null
    creadoEn?: DateTimeFieldUpdateOperationsInput | Date | string
    actualizadoEn?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type SuscripcionUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    empresaId?: StringFieldUpdateOperationsInput | string
    estado?: EnumEstadoSuscripcionFieldUpdateOperationsInput | $Enums.EstadoSuscripcion
    finPrueba?: DateTimeFieldUpdateOperationsInput | Date | string
    pagadoHasta?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    suspendidaEn?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    wompiFuentePagoId?: NullableStringFieldUpdateOperationsInput | string | null
    creadoEn?: DateTimeFieldUpdateOperationsInput | Date | string
    actualizadoEn?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type PagoCreateInput = {
    id?: string
    monto: number
    colaboradoresFacturados: number
    periodoInicio: Date | string
    periodoFin: Date | string
    metodo: $Enums.MetodoPago
    estado?: $Enums.EstadoPago
    wompiTransaccionId?: string | null
    nota?: string | null
    comprobanteBase64?: string | null
    registradoPor?: string | null
    creadoEn?: Date | string
    suscripcion: SuscripcionCreateNestedOneWithoutPagosInput
  }

  export type PagoUncheckedCreateInput = {
    id?: string
    suscripcionId: string
    monto: number
    colaboradoresFacturados: number
    periodoInicio: Date | string
    periodoFin: Date | string
    metodo: $Enums.MetodoPago
    estado?: $Enums.EstadoPago
    wompiTransaccionId?: string | null
    nota?: string | null
    comprobanteBase64?: string | null
    registradoPor?: string | null
    creadoEn?: Date | string
  }

  export type PagoUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    monto?: FloatFieldUpdateOperationsInput | number
    colaboradoresFacturados?: IntFieldUpdateOperationsInput | number
    periodoInicio?: DateTimeFieldUpdateOperationsInput | Date | string
    periodoFin?: DateTimeFieldUpdateOperationsInput | Date | string
    metodo?: EnumMetodoPagoFieldUpdateOperationsInput | $Enums.MetodoPago
    estado?: EnumEstadoPagoFieldUpdateOperationsInput | $Enums.EstadoPago
    wompiTransaccionId?: NullableStringFieldUpdateOperationsInput | string | null
    nota?: NullableStringFieldUpdateOperationsInput | string | null
    comprobanteBase64?: NullableStringFieldUpdateOperationsInput | string | null
    registradoPor?: NullableStringFieldUpdateOperationsInput | string | null
    creadoEn?: DateTimeFieldUpdateOperationsInput | Date | string
    suscripcion?: SuscripcionUpdateOneRequiredWithoutPagosNestedInput
  }

  export type PagoUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    suscripcionId?: StringFieldUpdateOperationsInput | string
    monto?: FloatFieldUpdateOperationsInput | number
    colaboradoresFacturados?: IntFieldUpdateOperationsInput | number
    periodoInicio?: DateTimeFieldUpdateOperationsInput | Date | string
    periodoFin?: DateTimeFieldUpdateOperationsInput | Date | string
    metodo?: EnumMetodoPagoFieldUpdateOperationsInput | $Enums.MetodoPago
    estado?: EnumEstadoPagoFieldUpdateOperationsInput | $Enums.EstadoPago
    wompiTransaccionId?: NullableStringFieldUpdateOperationsInput | string | null
    nota?: NullableStringFieldUpdateOperationsInput | string | null
    comprobanteBase64?: NullableStringFieldUpdateOperationsInput | string | null
    registradoPor?: NullableStringFieldUpdateOperationsInput | string | null
    creadoEn?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type PagoCreateManyInput = {
    id?: string
    suscripcionId: string
    monto: number
    colaboradoresFacturados: number
    periodoInicio: Date | string
    periodoFin: Date | string
    metodo: $Enums.MetodoPago
    estado?: $Enums.EstadoPago
    wompiTransaccionId?: string | null
    nota?: string | null
    comprobanteBase64?: string | null
    registradoPor?: string | null
    creadoEn?: Date | string
  }

  export type PagoUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    monto?: FloatFieldUpdateOperationsInput | number
    colaboradoresFacturados?: IntFieldUpdateOperationsInput | number
    periodoInicio?: DateTimeFieldUpdateOperationsInput | Date | string
    periodoFin?: DateTimeFieldUpdateOperationsInput | Date | string
    metodo?: EnumMetodoPagoFieldUpdateOperationsInput | $Enums.MetodoPago
    estado?: EnumEstadoPagoFieldUpdateOperationsInput | $Enums.EstadoPago
    wompiTransaccionId?: NullableStringFieldUpdateOperationsInput | string | null
    nota?: NullableStringFieldUpdateOperationsInput | string | null
    comprobanteBase64?: NullableStringFieldUpdateOperationsInput | string | null
    registradoPor?: NullableStringFieldUpdateOperationsInput | string | null
    creadoEn?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type PagoUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    suscripcionId?: StringFieldUpdateOperationsInput | string
    monto?: FloatFieldUpdateOperationsInput | number
    colaboradoresFacturados?: IntFieldUpdateOperationsInput | number
    periodoInicio?: DateTimeFieldUpdateOperationsInput | Date | string
    periodoFin?: DateTimeFieldUpdateOperationsInput | Date | string
    metodo?: EnumMetodoPagoFieldUpdateOperationsInput | $Enums.MetodoPago
    estado?: EnumEstadoPagoFieldUpdateOperationsInput | $Enums.EstadoPago
    wompiTransaccionId?: NullableStringFieldUpdateOperationsInput | string | null
    nota?: NullableStringFieldUpdateOperationsInput | string | null
    comprobanteBase64?: NullableStringFieldUpdateOperationsInput | string | null
    registradoPor?: NullableStringFieldUpdateOperationsInput | string | null
    creadoEn?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ConfiguracionPlataformaCreateInput = {
    id?: number
    precioTramo1?: number
    limiteTramo1?: number
    precioTramo2?: number
  }

  export type ConfiguracionPlataformaUncheckedCreateInput = {
    id?: number
    precioTramo1?: number
    limiteTramo1?: number
    precioTramo2?: number
  }

  export type ConfiguracionPlataformaUpdateInput = {
    id?: IntFieldUpdateOperationsInput | number
    precioTramo1?: FloatFieldUpdateOperationsInput | number
    limiteTramo1?: IntFieldUpdateOperationsInput | number
    precioTramo2?: FloatFieldUpdateOperationsInput | number
  }

  export type ConfiguracionPlataformaUncheckedUpdateInput = {
    id?: IntFieldUpdateOperationsInput | number
    precioTramo1?: FloatFieldUpdateOperationsInput | number
    limiteTramo1?: IntFieldUpdateOperationsInput | number
    precioTramo2?: FloatFieldUpdateOperationsInput | number
  }

  export type ConfiguracionPlataformaCreateManyInput = {
    id?: number
    precioTramo1?: number
    limiteTramo1?: number
    precioTramo2?: number
  }

  export type ConfiguracionPlataformaUpdateManyMutationInput = {
    id?: IntFieldUpdateOperationsInput | number
    precioTramo1?: FloatFieldUpdateOperationsInput | number
    limiteTramo1?: IntFieldUpdateOperationsInput | number
    precioTramo2?: FloatFieldUpdateOperationsInput | number
  }

  export type ConfiguracionPlataformaUncheckedUpdateManyInput = {
    id?: IntFieldUpdateOperationsInput | number
    precioTramo1?: FloatFieldUpdateOperationsInput | number
    limiteTramo1?: IntFieldUpdateOperationsInput | number
    precioTramo2?: FloatFieldUpdateOperationsInput | number
  }

  export type JornadaVigenciaCreateInput = {
    id?: string
    vigenteDesde: Date | string
    horasSemanales: number
  }

  export type JornadaVigenciaUncheckedCreateInput = {
    id?: string
    vigenteDesde: Date | string
    horasSemanales: number
  }

  export type JornadaVigenciaUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    vigenteDesde?: DateTimeFieldUpdateOperationsInput | Date | string
    horasSemanales?: FloatFieldUpdateOperationsInput | number
  }

  export type JornadaVigenciaUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    vigenteDesde?: DateTimeFieldUpdateOperationsInput | Date | string
    horasSemanales?: FloatFieldUpdateOperationsInput | number
  }

  export type JornadaVigenciaCreateManyInput = {
    id?: string
    vigenteDesde: Date | string
    horasSemanales: number
  }

  export type JornadaVigenciaUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    vigenteDesde?: DateTimeFieldUpdateOperationsInput | Date | string
    horasSemanales?: FloatFieldUpdateOperationsInput | number
  }

  export type JornadaVigenciaUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    vigenteDesde?: DateTimeFieldUpdateOperationsInput | Date | string
    horasSemanales?: FloatFieldUpdateOperationsInput | number
  }

  export type TipoHoraCreateInput = {
    id?: string
    nombre: string
    codigo: string
    horaInicio: number
    horaFin: number
    recargo: number
    aplica: JsonNullValueInput | InputJsonValue
    vigenteDesde: Date | string
    vigenteHasta?: Date | string | null
    activo?: boolean
  }

  export type TipoHoraUncheckedCreateInput = {
    id?: string
    nombre: string
    codigo: string
    horaInicio: number
    horaFin: number
    recargo: number
    aplica: JsonNullValueInput | InputJsonValue
    vigenteDesde: Date | string
    vigenteHasta?: Date | string | null
    activo?: boolean
  }

  export type TipoHoraUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    nombre?: StringFieldUpdateOperationsInput | string
    codigo?: StringFieldUpdateOperationsInput | string
    horaInicio?: IntFieldUpdateOperationsInput | number
    horaFin?: IntFieldUpdateOperationsInput | number
    recargo?: FloatFieldUpdateOperationsInput | number
    aplica?: JsonNullValueInput | InputJsonValue
    vigenteDesde?: DateTimeFieldUpdateOperationsInput | Date | string
    vigenteHasta?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    activo?: BoolFieldUpdateOperationsInput | boolean
  }

  export type TipoHoraUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    nombre?: StringFieldUpdateOperationsInput | string
    codigo?: StringFieldUpdateOperationsInput | string
    horaInicio?: IntFieldUpdateOperationsInput | number
    horaFin?: IntFieldUpdateOperationsInput | number
    recargo?: FloatFieldUpdateOperationsInput | number
    aplica?: JsonNullValueInput | InputJsonValue
    vigenteDesde?: DateTimeFieldUpdateOperationsInput | Date | string
    vigenteHasta?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    activo?: BoolFieldUpdateOperationsInput | boolean
  }

  export type TipoHoraCreateManyInput = {
    id?: string
    nombre: string
    codigo: string
    horaInicio: number
    horaFin: number
    recargo: number
    aplica: JsonNullValueInput | InputJsonValue
    vigenteDesde: Date | string
    vigenteHasta?: Date | string | null
    activo?: boolean
  }

  export type TipoHoraUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    nombre?: StringFieldUpdateOperationsInput | string
    codigo?: StringFieldUpdateOperationsInput | string
    horaInicio?: IntFieldUpdateOperationsInput | number
    horaFin?: IntFieldUpdateOperationsInput | number
    recargo?: FloatFieldUpdateOperationsInput | number
    aplica?: JsonNullValueInput | InputJsonValue
    vigenteDesde?: DateTimeFieldUpdateOperationsInput | Date | string
    vigenteHasta?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    activo?: BoolFieldUpdateOperationsInput | boolean
  }

  export type TipoHoraUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    nombre?: StringFieldUpdateOperationsInput | string
    codigo?: StringFieldUpdateOperationsInput | string
    horaInicio?: IntFieldUpdateOperationsInput | number
    horaFin?: IntFieldUpdateOperationsInput | number
    recargo?: FloatFieldUpdateOperationsInput | number
    aplica?: JsonNullValueInput | InputJsonValue
    vigenteDesde?: DateTimeFieldUpdateOperationsInput | Date | string
    vigenteHasta?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    activo?: BoolFieldUpdateOperationsInput | boolean
  }

  export type HorarioCreateInput = {
    id?: string
    nombre: string
    toleranciaMin?: number
    activo?: boolean
    creadoEn?: Date | string
    empresa: EmpresaCreateNestedOneWithoutHorariosInput
    franjas?: FranjaHorarioCreateNestedManyWithoutHorarioInput
    colaboradores?: ColaboradorCreateNestedManyWithoutHorarioInput
  }

  export type HorarioUncheckedCreateInput = {
    id?: string
    empresaId: string
    nombre: string
    toleranciaMin?: number
    activo?: boolean
    creadoEn?: Date | string
    franjas?: FranjaHorarioUncheckedCreateNestedManyWithoutHorarioInput
    colaboradores?: ColaboradorUncheckedCreateNestedManyWithoutHorarioInput
  }

  export type HorarioUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    nombre?: StringFieldUpdateOperationsInput | string
    toleranciaMin?: IntFieldUpdateOperationsInput | number
    activo?: BoolFieldUpdateOperationsInput | boolean
    creadoEn?: DateTimeFieldUpdateOperationsInput | Date | string
    empresa?: EmpresaUpdateOneRequiredWithoutHorariosNestedInput
    franjas?: FranjaHorarioUpdateManyWithoutHorarioNestedInput
    colaboradores?: ColaboradorUpdateManyWithoutHorarioNestedInput
  }

  export type HorarioUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    empresaId?: StringFieldUpdateOperationsInput | string
    nombre?: StringFieldUpdateOperationsInput | string
    toleranciaMin?: IntFieldUpdateOperationsInput | number
    activo?: BoolFieldUpdateOperationsInput | boolean
    creadoEn?: DateTimeFieldUpdateOperationsInput | Date | string
    franjas?: FranjaHorarioUncheckedUpdateManyWithoutHorarioNestedInput
    colaboradores?: ColaboradorUncheckedUpdateManyWithoutHorarioNestedInput
  }

  export type HorarioCreateManyInput = {
    id?: string
    empresaId: string
    nombre: string
    toleranciaMin?: number
    activo?: boolean
    creadoEn?: Date | string
  }

  export type HorarioUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    nombre?: StringFieldUpdateOperationsInput | string
    toleranciaMin?: IntFieldUpdateOperationsInput | number
    activo?: BoolFieldUpdateOperationsInput | boolean
    creadoEn?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type HorarioUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    empresaId?: StringFieldUpdateOperationsInput | string
    nombre?: StringFieldUpdateOperationsInput | string
    toleranciaMin?: IntFieldUpdateOperationsInput | number
    activo?: BoolFieldUpdateOperationsInput | boolean
    creadoEn?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type FranjaHorarioCreateInput = {
    id?: string
    dias: JsonNullValueInput | InputJsonValue
    horaEntrada: string
    horaSalida: string
    horario: HorarioCreateNestedOneWithoutFranjasInput
  }

  export type FranjaHorarioUncheckedCreateInput = {
    id?: string
    horarioId: string
    dias: JsonNullValueInput | InputJsonValue
    horaEntrada: string
    horaSalida: string
  }

  export type FranjaHorarioUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    dias?: JsonNullValueInput | InputJsonValue
    horaEntrada?: StringFieldUpdateOperationsInput | string
    horaSalida?: StringFieldUpdateOperationsInput | string
    horario?: HorarioUpdateOneRequiredWithoutFranjasNestedInput
  }

  export type FranjaHorarioUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    horarioId?: StringFieldUpdateOperationsInput | string
    dias?: JsonNullValueInput | InputJsonValue
    horaEntrada?: StringFieldUpdateOperationsInput | string
    horaSalida?: StringFieldUpdateOperationsInput | string
  }

  export type FranjaHorarioCreateManyInput = {
    id?: string
    horarioId: string
    dias: JsonNullValueInput | InputJsonValue
    horaEntrada: string
    horaSalida: string
  }

  export type FranjaHorarioUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    dias?: JsonNullValueInput | InputJsonValue
    horaEntrada?: StringFieldUpdateOperationsInput | string
    horaSalida?: StringFieldUpdateOperationsInput | string
  }

  export type FranjaHorarioUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    horarioId?: StringFieldUpdateOperationsInput | string
    dias?: JsonNullValueInput | InputJsonValue
    horaEntrada?: StringFieldUpdateOperationsInput | string
    horaSalida?: StringFieldUpdateOperationsInput | string
  }

  export type DispositivoKioscoCreateInput = {
    id?: string
    nombre: string
    token: string
    creadoEn?: Date | string
    ultimoUso?: Date | string | null
    empresa: EmpresaCreateNestedOneWithoutDispositivosInput
  }

  export type DispositivoKioscoUncheckedCreateInput = {
    id?: string
    empresaId: string
    nombre: string
    token: string
    creadoEn?: Date | string
    ultimoUso?: Date | string | null
  }

  export type DispositivoKioscoUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    nombre?: StringFieldUpdateOperationsInput | string
    token?: StringFieldUpdateOperationsInput | string
    creadoEn?: DateTimeFieldUpdateOperationsInput | Date | string
    ultimoUso?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    empresa?: EmpresaUpdateOneRequiredWithoutDispositivosNestedInput
  }

  export type DispositivoKioscoUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    empresaId?: StringFieldUpdateOperationsInput | string
    nombre?: StringFieldUpdateOperationsInput | string
    token?: StringFieldUpdateOperationsInput | string
    creadoEn?: DateTimeFieldUpdateOperationsInput | Date | string
    ultimoUso?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type DispositivoKioscoCreateManyInput = {
    id?: string
    empresaId: string
    nombre: string
    token: string
    creadoEn?: Date | string
    ultimoUso?: Date | string | null
  }

  export type DispositivoKioscoUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    nombre?: StringFieldUpdateOperationsInput | string
    token?: StringFieldUpdateOperationsInput | string
    creadoEn?: DateTimeFieldUpdateOperationsInput | Date | string
    ultimoUso?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type DispositivoKioscoUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    empresaId?: StringFieldUpdateOperationsInput | string
    nombre?: StringFieldUpdateOperationsInput | string
    token?: StringFieldUpdateOperationsInput | string
    creadoEn?: DateTimeFieldUpdateOperationsInput | Date | string
    ultimoUso?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type ColaboradorCreateInput = {
    id?: string
    nombre: string
    apellido: string
    cedula: string
    cargo?: string | null
    email?: string | null
    telefono?: string | null
    fechaNacimiento?: Date | string | null
    salarioMensual: number
    rostroDescriptor?: NullableJsonNullValueInput | InputJsonValue
    rostroEnroladoEn?: Date | string | null
    activo?: boolean
    retiroProgramado?: Date | string | null
    creadoEn?: Date | string
    actualizadoEn?: Date | string
    empresa: EmpresaCreateNestedOneWithoutColaboradoresInput
    horario?: HorarioCreateNestedOneWithoutColaboradoresInput
    registros?: RegistroCreateNestedManyWithoutColaboradorInput
    permisos?: PermisoCreateNestedManyWithoutColaboradorInput
  }

  export type ColaboradorUncheckedCreateInput = {
    id?: string
    empresaId: string
    nombre: string
    apellido: string
    cedula: string
    cargo?: string | null
    email?: string | null
    telefono?: string | null
    fechaNacimiento?: Date | string | null
    salarioMensual: number
    rostroDescriptor?: NullableJsonNullValueInput | InputJsonValue
    rostroEnroladoEn?: Date | string | null
    horarioId?: string | null
    activo?: boolean
    retiroProgramado?: Date | string | null
    creadoEn?: Date | string
    actualizadoEn?: Date | string
    registros?: RegistroUncheckedCreateNestedManyWithoutColaboradorInput
    permisos?: PermisoUncheckedCreateNestedManyWithoutColaboradorInput
  }

  export type ColaboradorUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    nombre?: StringFieldUpdateOperationsInput | string
    apellido?: StringFieldUpdateOperationsInput | string
    cedula?: StringFieldUpdateOperationsInput | string
    cargo?: NullableStringFieldUpdateOperationsInput | string | null
    email?: NullableStringFieldUpdateOperationsInput | string | null
    telefono?: NullableStringFieldUpdateOperationsInput | string | null
    fechaNacimiento?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    salarioMensual?: FloatFieldUpdateOperationsInput | number
    rostroDescriptor?: NullableJsonNullValueInput | InputJsonValue
    rostroEnroladoEn?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    activo?: BoolFieldUpdateOperationsInput | boolean
    retiroProgramado?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    creadoEn?: DateTimeFieldUpdateOperationsInput | Date | string
    actualizadoEn?: DateTimeFieldUpdateOperationsInput | Date | string
    empresa?: EmpresaUpdateOneRequiredWithoutColaboradoresNestedInput
    horario?: HorarioUpdateOneWithoutColaboradoresNestedInput
    registros?: RegistroUpdateManyWithoutColaboradorNestedInput
    permisos?: PermisoUpdateManyWithoutColaboradorNestedInput
  }

  export type ColaboradorUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    empresaId?: StringFieldUpdateOperationsInput | string
    nombre?: StringFieldUpdateOperationsInput | string
    apellido?: StringFieldUpdateOperationsInput | string
    cedula?: StringFieldUpdateOperationsInput | string
    cargo?: NullableStringFieldUpdateOperationsInput | string | null
    email?: NullableStringFieldUpdateOperationsInput | string | null
    telefono?: NullableStringFieldUpdateOperationsInput | string | null
    fechaNacimiento?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    salarioMensual?: FloatFieldUpdateOperationsInput | number
    rostroDescriptor?: NullableJsonNullValueInput | InputJsonValue
    rostroEnroladoEn?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    horarioId?: NullableStringFieldUpdateOperationsInput | string | null
    activo?: BoolFieldUpdateOperationsInput | boolean
    retiroProgramado?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    creadoEn?: DateTimeFieldUpdateOperationsInput | Date | string
    actualizadoEn?: DateTimeFieldUpdateOperationsInput | Date | string
    registros?: RegistroUncheckedUpdateManyWithoutColaboradorNestedInput
    permisos?: PermisoUncheckedUpdateManyWithoutColaboradorNestedInput
  }

  export type ColaboradorCreateManyInput = {
    id?: string
    empresaId: string
    nombre: string
    apellido: string
    cedula: string
    cargo?: string | null
    email?: string | null
    telefono?: string | null
    fechaNacimiento?: Date | string | null
    salarioMensual: number
    rostroDescriptor?: NullableJsonNullValueInput | InputJsonValue
    rostroEnroladoEn?: Date | string | null
    horarioId?: string | null
    activo?: boolean
    retiroProgramado?: Date | string | null
    creadoEn?: Date | string
    actualizadoEn?: Date | string
  }

  export type ColaboradorUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    nombre?: StringFieldUpdateOperationsInput | string
    apellido?: StringFieldUpdateOperationsInput | string
    cedula?: StringFieldUpdateOperationsInput | string
    cargo?: NullableStringFieldUpdateOperationsInput | string | null
    email?: NullableStringFieldUpdateOperationsInput | string | null
    telefono?: NullableStringFieldUpdateOperationsInput | string | null
    fechaNacimiento?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    salarioMensual?: FloatFieldUpdateOperationsInput | number
    rostroDescriptor?: NullableJsonNullValueInput | InputJsonValue
    rostroEnroladoEn?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    activo?: BoolFieldUpdateOperationsInput | boolean
    retiroProgramado?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    creadoEn?: DateTimeFieldUpdateOperationsInput | Date | string
    actualizadoEn?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ColaboradorUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    empresaId?: StringFieldUpdateOperationsInput | string
    nombre?: StringFieldUpdateOperationsInput | string
    apellido?: StringFieldUpdateOperationsInput | string
    cedula?: StringFieldUpdateOperationsInput | string
    cargo?: NullableStringFieldUpdateOperationsInput | string | null
    email?: NullableStringFieldUpdateOperationsInput | string | null
    telefono?: NullableStringFieldUpdateOperationsInput | string | null
    fechaNacimiento?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    salarioMensual?: FloatFieldUpdateOperationsInput | number
    rostroDescriptor?: NullableJsonNullValueInput | InputJsonValue
    rostroEnroladoEn?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    horarioId?: NullableStringFieldUpdateOperationsInput | string | null
    activo?: BoolFieldUpdateOperationsInput | boolean
    retiroProgramado?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    creadoEn?: DateTimeFieldUpdateOperationsInput | Date | string
    actualizadoEn?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type RegistroCreateInput = {
    id?: string
    fecha: Date | string
    entrada?: Date | string | null
    salida?: Date | string | null
    tipo?: $Enums.TipoRegistro
    observacion?: string | null
    fotoEntrada?: string | null
    fotoSalida?: string | null
    editadoPor?: string | null
    editadoEn?: Date | string | null
    creadoEn?: Date | string
    colaborador: ColaboradorCreateNestedOneWithoutRegistrosInput
  }

  export type RegistroUncheckedCreateInput = {
    id?: string
    colaboradorId: string
    fecha: Date | string
    entrada?: Date | string | null
    salida?: Date | string | null
    tipo?: $Enums.TipoRegistro
    observacion?: string | null
    fotoEntrada?: string | null
    fotoSalida?: string | null
    editadoPor?: string | null
    editadoEn?: Date | string | null
    creadoEn?: Date | string
  }

  export type RegistroUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    fecha?: DateTimeFieldUpdateOperationsInput | Date | string
    entrada?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    salida?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    tipo?: EnumTipoRegistroFieldUpdateOperationsInput | $Enums.TipoRegistro
    observacion?: NullableStringFieldUpdateOperationsInput | string | null
    fotoEntrada?: NullableStringFieldUpdateOperationsInput | string | null
    fotoSalida?: NullableStringFieldUpdateOperationsInput | string | null
    editadoPor?: NullableStringFieldUpdateOperationsInput | string | null
    editadoEn?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    creadoEn?: DateTimeFieldUpdateOperationsInput | Date | string
    colaborador?: ColaboradorUpdateOneRequiredWithoutRegistrosNestedInput
  }

  export type RegistroUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    colaboradorId?: StringFieldUpdateOperationsInput | string
    fecha?: DateTimeFieldUpdateOperationsInput | Date | string
    entrada?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    salida?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    tipo?: EnumTipoRegistroFieldUpdateOperationsInput | $Enums.TipoRegistro
    observacion?: NullableStringFieldUpdateOperationsInput | string | null
    fotoEntrada?: NullableStringFieldUpdateOperationsInput | string | null
    fotoSalida?: NullableStringFieldUpdateOperationsInput | string | null
    editadoPor?: NullableStringFieldUpdateOperationsInput | string | null
    editadoEn?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    creadoEn?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type RegistroCreateManyInput = {
    id?: string
    colaboradorId: string
    fecha: Date | string
    entrada?: Date | string | null
    salida?: Date | string | null
    tipo?: $Enums.TipoRegistro
    observacion?: string | null
    fotoEntrada?: string | null
    fotoSalida?: string | null
    editadoPor?: string | null
    editadoEn?: Date | string | null
    creadoEn?: Date | string
  }

  export type RegistroUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    fecha?: DateTimeFieldUpdateOperationsInput | Date | string
    entrada?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    salida?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    tipo?: EnumTipoRegistroFieldUpdateOperationsInput | $Enums.TipoRegistro
    observacion?: NullableStringFieldUpdateOperationsInput | string | null
    fotoEntrada?: NullableStringFieldUpdateOperationsInput | string | null
    fotoSalida?: NullableStringFieldUpdateOperationsInput | string | null
    editadoPor?: NullableStringFieldUpdateOperationsInput | string | null
    editadoEn?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    creadoEn?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type RegistroUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    colaboradorId?: StringFieldUpdateOperationsInput | string
    fecha?: DateTimeFieldUpdateOperationsInput | Date | string
    entrada?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    salida?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    tipo?: EnumTipoRegistroFieldUpdateOperationsInput | $Enums.TipoRegistro
    observacion?: NullableStringFieldUpdateOperationsInput | string | null
    fotoEntrada?: NullableStringFieldUpdateOperationsInput | string | null
    fotoSalida?: NullableStringFieldUpdateOperationsInput | string | null
    editadoPor?: NullableStringFieldUpdateOperationsInput | string | null
    editadoEn?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    creadoEn?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type PermisoCreateInput = {
    id?: string
    fechaInicio: Date | string
    fechaFin: Date | string
    tipo: $Enums.TipoPermiso
    descripcion?: string | null
    aprobado?: boolean
    creadoEn?: Date | string
    colaborador: ColaboradorCreateNestedOneWithoutPermisosInput
  }

  export type PermisoUncheckedCreateInput = {
    id?: string
    colaboradorId: string
    fechaInicio: Date | string
    fechaFin: Date | string
    tipo: $Enums.TipoPermiso
    descripcion?: string | null
    aprobado?: boolean
    creadoEn?: Date | string
  }

  export type PermisoUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    fechaInicio?: DateTimeFieldUpdateOperationsInput | Date | string
    fechaFin?: DateTimeFieldUpdateOperationsInput | Date | string
    tipo?: EnumTipoPermisoFieldUpdateOperationsInput | $Enums.TipoPermiso
    descripcion?: NullableStringFieldUpdateOperationsInput | string | null
    aprobado?: BoolFieldUpdateOperationsInput | boolean
    creadoEn?: DateTimeFieldUpdateOperationsInput | Date | string
    colaborador?: ColaboradorUpdateOneRequiredWithoutPermisosNestedInput
  }

  export type PermisoUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    colaboradorId?: StringFieldUpdateOperationsInput | string
    fechaInicio?: DateTimeFieldUpdateOperationsInput | Date | string
    fechaFin?: DateTimeFieldUpdateOperationsInput | Date | string
    tipo?: EnumTipoPermisoFieldUpdateOperationsInput | $Enums.TipoPermiso
    descripcion?: NullableStringFieldUpdateOperationsInput | string | null
    aprobado?: BoolFieldUpdateOperationsInput | boolean
    creadoEn?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type PermisoCreateManyInput = {
    id?: string
    colaboradorId: string
    fechaInicio: Date | string
    fechaFin: Date | string
    tipo: $Enums.TipoPermiso
    descripcion?: string | null
    aprobado?: boolean
    creadoEn?: Date | string
  }

  export type PermisoUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    fechaInicio?: DateTimeFieldUpdateOperationsInput | Date | string
    fechaFin?: DateTimeFieldUpdateOperationsInput | Date | string
    tipo?: EnumTipoPermisoFieldUpdateOperationsInput | $Enums.TipoPermiso
    descripcion?: NullableStringFieldUpdateOperationsInput | string | null
    aprobado?: BoolFieldUpdateOperationsInput | boolean
    creadoEn?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type PermisoUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    colaboradorId?: StringFieldUpdateOperationsInput | string
    fechaInicio?: DateTimeFieldUpdateOperationsInput | Date | string
    fechaFin?: DateTimeFieldUpdateOperationsInput | Date | string
    tipo?: EnumTipoPermisoFieldUpdateOperationsInput | $Enums.TipoPermiso
    descripcion?: NullableStringFieldUpdateOperationsInput | string | null
    aprobado?: BoolFieldUpdateOperationsInput | boolean
    creadoEn?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type DiaFestivoCreateInput = {
    id?: string
    fecha: Date | string
    nombre: string
    creadoEn?: Date | string
    empresa?: EmpresaCreateNestedOneWithoutFestivosInput
  }

  export type DiaFestivoUncheckedCreateInput = {
    id?: string
    empresaId?: string | null
    fecha: Date | string
    nombre: string
    creadoEn?: Date | string
  }

  export type DiaFestivoUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    fecha?: DateTimeFieldUpdateOperationsInput | Date | string
    nombre?: StringFieldUpdateOperationsInput | string
    creadoEn?: DateTimeFieldUpdateOperationsInput | Date | string
    empresa?: EmpresaUpdateOneWithoutFestivosNestedInput
  }

  export type DiaFestivoUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    empresaId?: NullableStringFieldUpdateOperationsInput | string | null
    fecha?: DateTimeFieldUpdateOperationsInput | Date | string
    nombre?: StringFieldUpdateOperationsInput | string
    creadoEn?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type DiaFestivoCreateManyInput = {
    id?: string
    empresaId?: string | null
    fecha: Date | string
    nombre: string
    creadoEn?: Date | string
  }

  export type DiaFestivoUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    fecha?: DateTimeFieldUpdateOperationsInput | Date | string
    nombre?: StringFieldUpdateOperationsInput | string
    creadoEn?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type DiaFestivoUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    empresaId?: NullableStringFieldUpdateOperationsInput | string | null
    fecha?: DateTimeFieldUpdateOperationsInput | Date | string
    nombre?: StringFieldUpdateOperationsInput | string
    creadoEn?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ConfiguracionCreateInput = {
    id?: string
    clave: string
    valor: string
    empresa: EmpresaCreateNestedOneWithoutConfiguracionInput
  }

  export type ConfiguracionUncheckedCreateInput = {
    id?: string
    empresaId: string
    clave: string
    valor: string
  }

  export type ConfiguracionUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    clave?: StringFieldUpdateOperationsInput | string
    valor?: StringFieldUpdateOperationsInput | string
    empresa?: EmpresaUpdateOneRequiredWithoutConfiguracionNestedInput
  }

  export type ConfiguracionUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    empresaId?: StringFieldUpdateOperationsInput | string
    clave?: StringFieldUpdateOperationsInput | string
    valor?: StringFieldUpdateOperationsInput | string
  }

  export type ConfiguracionCreateManyInput = {
    id?: string
    empresaId: string
    clave: string
    valor: string
  }

  export type ConfiguracionUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    clave?: StringFieldUpdateOperationsInput | string
    valor?: StringFieldUpdateOperationsInput | string
  }

  export type ConfiguracionUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    empresaId?: StringFieldUpdateOperationsInput | string
    clave?: StringFieldUpdateOperationsInput | string
    valor?: StringFieldUpdateOperationsInput | string
  }

  export type UsuarioCreateInput = {
    id?: string
    email: string
    password: string
    nombre: string
    rol?: $Enums.Rol
    activo?: boolean
    resetToken?: string | null
    resetExpira?: Date | string | null
    emailVerificado?: boolean
    verificacionCodigo?: string | null
    verificacionExpira?: Date | string | null
    creadoEn?: Date | string
    empresa?: EmpresaCreateNestedOneWithoutUsuariosInput
  }

  export type UsuarioUncheckedCreateInput = {
    id?: string
    empresaId?: string | null
    email: string
    password: string
    nombre: string
    rol?: $Enums.Rol
    activo?: boolean
    resetToken?: string | null
    resetExpira?: Date | string | null
    emailVerificado?: boolean
    verificacionCodigo?: string | null
    verificacionExpira?: Date | string | null
    creadoEn?: Date | string
  }

  export type UsuarioUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    password?: StringFieldUpdateOperationsInput | string
    nombre?: StringFieldUpdateOperationsInput | string
    rol?: EnumRolFieldUpdateOperationsInput | $Enums.Rol
    activo?: BoolFieldUpdateOperationsInput | boolean
    resetToken?: NullableStringFieldUpdateOperationsInput | string | null
    resetExpira?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    emailVerificado?: BoolFieldUpdateOperationsInput | boolean
    verificacionCodigo?: NullableStringFieldUpdateOperationsInput | string | null
    verificacionExpira?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    creadoEn?: DateTimeFieldUpdateOperationsInput | Date | string
    empresa?: EmpresaUpdateOneWithoutUsuariosNestedInput
  }

  export type UsuarioUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    empresaId?: NullableStringFieldUpdateOperationsInput | string | null
    email?: StringFieldUpdateOperationsInput | string
    password?: StringFieldUpdateOperationsInput | string
    nombre?: StringFieldUpdateOperationsInput | string
    rol?: EnumRolFieldUpdateOperationsInput | $Enums.Rol
    activo?: BoolFieldUpdateOperationsInput | boolean
    resetToken?: NullableStringFieldUpdateOperationsInput | string | null
    resetExpira?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    emailVerificado?: BoolFieldUpdateOperationsInput | boolean
    verificacionCodigo?: NullableStringFieldUpdateOperationsInput | string | null
    verificacionExpira?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    creadoEn?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type UsuarioCreateManyInput = {
    id?: string
    empresaId?: string | null
    email: string
    password: string
    nombre: string
    rol?: $Enums.Rol
    activo?: boolean
    resetToken?: string | null
    resetExpira?: Date | string | null
    emailVerificado?: boolean
    verificacionCodigo?: string | null
    verificacionExpira?: Date | string | null
    creadoEn?: Date | string
  }

  export type UsuarioUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    password?: StringFieldUpdateOperationsInput | string
    nombre?: StringFieldUpdateOperationsInput | string
    rol?: EnumRolFieldUpdateOperationsInput | $Enums.Rol
    activo?: BoolFieldUpdateOperationsInput | boolean
    resetToken?: NullableStringFieldUpdateOperationsInput | string | null
    resetExpira?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    emailVerificado?: BoolFieldUpdateOperationsInput | boolean
    verificacionCodigo?: NullableStringFieldUpdateOperationsInput | string | null
    verificacionExpira?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    creadoEn?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type UsuarioUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    empresaId?: NullableStringFieldUpdateOperationsInput | string | null
    email?: StringFieldUpdateOperationsInput | string
    password?: StringFieldUpdateOperationsInput | string
    nombre?: StringFieldUpdateOperationsInput | string
    rol?: EnumRolFieldUpdateOperationsInput | $Enums.Rol
    activo?: BoolFieldUpdateOperationsInput | boolean
    resetToken?: NullableStringFieldUpdateOperationsInput | string | null
    resetExpira?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    emailVerificado?: BoolFieldUpdateOperationsInput | boolean
    verificacionCodigo?: NullableStringFieldUpdateOperationsInput | string | null
    verificacionExpira?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    creadoEn?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type StringFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[]
    notIn?: string[]
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringFilter<$PrismaModel> | string
  }

  export type StringNullableFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | null
    notIn?: string[] | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableFilter<$PrismaModel> | string | null
  }

  export type BoolFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolFilter<$PrismaModel> | boolean
  }

  export type DateTimeFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[]
    notIn?: Date[] | string[]
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeFilter<$PrismaModel> | Date | string
  }

  export type UsuarioListRelationFilter = {
    every?: UsuarioWhereInput
    some?: UsuarioWhereInput
    none?: UsuarioWhereInput
  }

  export type ColaboradorListRelationFilter = {
    every?: ColaboradorWhereInput
    some?: ColaboradorWhereInput
    none?: ColaboradorWhereInput
  }

  export type DiaFestivoListRelationFilter = {
    every?: DiaFestivoWhereInput
    some?: DiaFestivoWhereInput
    none?: DiaFestivoWhereInput
  }

  export type ConfiguracionListRelationFilter = {
    every?: ConfiguracionWhereInput
    some?: ConfiguracionWhereInput
    none?: ConfiguracionWhereInput
  }

  export type SuscripcionNullableRelationFilter = {
    is?: SuscripcionWhereInput | null
    isNot?: SuscripcionWhereInput | null
  }

  export type HorarioListRelationFilter = {
    every?: HorarioWhereInput
    some?: HorarioWhereInput
    none?: HorarioWhereInput
  }

  export type DispositivoKioscoListRelationFilter = {
    every?: DispositivoKioscoWhereInput
    some?: DispositivoKioscoWhereInput
    none?: DispositivoKioscoWhereInput
  }

  export type SortOrderInput = {
    sort: SortOrder
    nulls?: NullsOrder
  }

  export type UsuarioOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type ColaboradorOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type DiaFestivoOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type ConfiguracionOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type HorarioOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type DispositivoKioscoOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type EmpresaCountOrderByAggregateInput = {
    id?: SortOrder
    nombre?: SortOrder
    nit?: SortOrder
    email?: SortOrder
    telefono?: SortOrder
    marcadorToken?: SortOrder
    exentaPago?: SortOrder
    activa?: SortOrder
    creadoEn?: SortOrder
    actualizadoEn?: SortOrder
  }

  export type EmpresaMaxOrderByAggregateInput = {
    id?: SortOrder
    nombre?: SortOrder
    nit?: SortOrder
    email?: SortOrder
    telefono?: SortOrder
    marcadorToken?: SortOrder
    exentaPago?: SortOrder
    activa?: SortOrder
    creadoEn?: SortOrder
    actualizadoEn?: SortOrder
  }

  export type EmpresaMinOrderByAggregateInput = {
    id?: SortOrder
    nombre?: SortOrder
    nit?: SortOrder
    email?: SortOrder
    telefono?: SortOrder
    marcadorToken?: SortOrder
    exentaPago?: SortOrder
    activa?: SortOrder
    creadoEn?: SortOrder
    actualizadoEn?: SortOrder
  }

  export type StringWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[]
    notIn?: string[]
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type StringNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | null
    notIn?: string[] | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableWithAggregatesFilter<$PrismaModel> | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedStringNullableFilter<$PrismaModel>
    _max?: NestedStringNullableFilter<$PrismaModel>
  }

  export type BoolWithAggregatesFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolWithAggregatesFilter<$PrismaModel> | boolean
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedBoolFilter<$PrismaModel>
    _max?: NestedBoolFilter<$PrismaModel>
  }

  export type DateTimeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[]
    notIn?: Date[] | string[]
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeWithAggregatesFilter<$PrismaModel> | Date | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedDateTimeFilter<$PrismaModel>
    _max?: NestedDateTimeFilter<$PrismaModel>
  }

  export type EnumEstadoSuscripcionFilter<$PrismaModel = never> = {
    equals?: $Enums.EstadoSuscripcion | EnumEstadoSuscripcionFieldRefInput<$PrismaModel>
    in?: $Enums.EstadoSuscripcion[]
    notIn?: $Enums.EstadoSuscripcion[]
    not?: NestedEnumEstadoSuscripcionFilter<$PrismaModel> | $Enums.EstadoSuscripcion
  }

  export type DateTimeNullableFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | null
    notIn?: Date[] | string[] | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableFilter<$PrismaModel> | Date | string | null
  }

  export type EmpresaRelationFilter = {
    is?: EmpresaWhereInput
    isNot?: EmpresaWhereInput
  }

  export type PagoListRelationFilter = {
    every?: PagoWhereInput
    some?: PagoWhereInput
    none?: PagoWhereInput
  }

  export type PagoOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type SuscripcionCountOrderByAggregateInput = {
    id?: SortOrder
    empresaId?: SortOrder
    estado?: SortOrder
    finPrueba?: SortOrder
    pagadoHasta?: SortOrder
    suspendidaEn?: SortOrder
    wompiFuentePagoId?: SortOrder
    creadoEn?: SortOrder
    actualizadoEn?: SortOrder
  }

  export type SuscripcionMaxOrderByAggregateInput = {
    id?: SortOrder
    empresaId?: SortOrder
    estado?: SortOrder
    finPrueba?: SortOrder
    pagadoHasta?: SortOrder
    suspendidaEn?: SortOrder
    wompiFuentePagoId?: SortOrder
    creadoEn?: SortOrder
    actualizadoEn?: SortOrder
  }

  export type SuscripcionMinOrderByAggregateInput = {
    id?: SortOrder
    empresaId?: SortOrder
    estado?: SortOrder
    finPrueba?: SortOrder
    pagadoHasta?: SortOrder
    suspendidaEn?: SortOrder
    wompiFuentePagoId?: SortOrder
    creadoEn?: SortOrder
    actualizadoEn?: SortOrder
  }

  export type EnumEstadoSuscripcionWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.EstadoSuscripcion | EnumEstadoSuscripcionFieldRefInput<$PrismaModel>
    in?: $Enums.EstadoSuscripcion[]
    notIn?: $Enums.EstadoSuscripcion[]
    not?: NestedEnumEstadoSuscripcionWithAggregatesFilter<$PrismaModel> | $Enums.EstadoSuscripcion
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumEstadoSuscripcionFilter<$PrismaModel>
    _max?: NestedEnumEstadoSuscripcionFilter<$PrismaModel>
  }

  export type DateTimeNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | null
    notIn?: Date[] | string[] | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableWithAggregatesFilter<$PrismaModel> | Date | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedDateTimeNullableFilter<$PrismaModel>
    _max?: NestedDateTimeNullableFilter<$PrismaModel>
  }

  export type FloatFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel>
    in?: number[]
    notIn?: number[]
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatFilter<$PrismaModel> | number
  }

  export type IntFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[]
    notIn?: number[]
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntFilter<$PrismaModel> | number
  }

  export type EnumMetodoPagoFilter<$PrismaModel = never> = {
    equals?: $Enums.MetodoPago | EnumMetodoPagoFieldRefInput<$PrismaModel>
    in?: $Enums.MetodoPago[]
    notIn?: $Enums.MetodoPago[]
    not?: NestedEnumMetodoPagoFilter<$PrismaModel> | $Enums.MetodoPago
  }

  export type EnumEstadoPagoFilter<$PrismaModel = never> = {
    equals?: $Enums.EstadoPago | EnumEstadoPagoFieldRefInput<$PrismaModel>
    in?: $Enums.EstadoPago[]
    notIn?: $Enums.EstadoPago[]
    not?: NestedEnumEstadoPagoFilter<$PrismaModel> | $Enums.EstadoPago
  }

  export type SuscripcionRelationFilter = {
    is?: SuscripcionWhereInput
    isNot?: SuscripcionWhereInput
  }

  export type PagoCountOrderByAggregateInput = {
    id?: SortOrder
    suscripcionId?: SortOrder
    monto?: SortOrder
    colaboradoresFacturados?: SortOrder
    periodoInicio?: SortOrder
    periodoFin?: SortOrder
    metodo?: SortOrder
    estado?: SortOrder
    wompiTransaccionId?: SortOrder
    nota?: SortOrder
    comprobanteBase64?: SortOrder
    registradoPor?: SortOrder
    creadoEn?: SortOrder
  }

  export type PagoAvgOrderByAggregateInput = {
    monto?: SortOrder
    colaboradoresFacturados?: SortOrder
  }

  export type PagoMaxOrderByAggregateInput = {
    id?: SortOrder
    suscripcionId?: SortOrder
    monto?: SortOrder
    colaboradoresFacturados?: SortOrder
    periodoInicio?: SortOrder
    periodoFin?: SortOrder
    metodo?: SortOrder
    estado?: SortOrder
    wompiTransaccionId?: SortOrder
    nota?: SortOrder
    comprobanteBase64?: SortOrder
    registradoPor?: SortOrder
    creadoEn?: SortOrder
  }

  export type PagoMinOrderByAggregateInput = {
    id?: SortOrder
    suscripcionId?: SortOrder
    monto?: SortOrder
    colaboradoresFacturados?: SortOrder
    periodoInicio?: SortOrder
    periodoFin?: SortOrder
    metodo?: SortOrder
    estado?: SortOrder
    wompiTransaccionId?: SortOrder
    nota?: SortOrder
    comprobanteBase64?: SortOrder
    registradoPor?: SortOrder
    creadoEn?: SortOrder
  }

  export type PagoSumOrderByAggregateInput = {
    monto?: SortOrder
    colaboradoresFacturados?: SortOrder
  }

  export type FloatWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel>
    in?: number[]
    notIn?: number[]
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedFloatFilter<$PrismaModel>
    _min?: NestedFloatFilter<$PrismaModel>
    _max?: NestedFloatFilter<$PrismaModel>
  }

  export type IntWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[]
    notIn?: number[]
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedIntFilter<$PrismaModel>
    _min?: NestedIntFilter<$PrismaModel>
    _max?: NestedIntFilter<$PrismaModel>
  }

  export type EnumMetodoPagoWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.MetodoPago | EnumMetodoPagoFieldRefInput<$PrismaModel>
    in?: $Enums.MetodoPago[]
    notIn?: $Enums.MetodoPago[]
    not?: NestedEnumMetodoPagoWithAggregatesFilter<$PrismaModel> | $Enums.MetodoPago
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumMetodoPagoFilter<$PrismaModel>
    _max?: NestedEnumMetodoPagoFilter<$PrismaModel>
  }

  export type EnumEstadoPagoWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.EstadoPago | EnumEstadoPagoFieldRefInput<$PrismaModel>
    in?: $Enums.EstadoPago[]
    notIn?: $Enums.EstadoPago[]
    not?: NestedEnumEstadoPagoWithAggregatesFilter<$PrismaModel> | $Enums.EstadoPago
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumEstadoPagoFilter<$PrismaModel>
    _max?: NestedEnumEstadoPagoFilter<$PrismaModel>
  }

  export type ConfiguracionPlataformaCountOrderByAggregateInput = {
    id?: SortOrder
    precioTramo1?: SortOrder
    limiteTramo1?: SortOrder
    precioTramo2?: SortOrder
  }

  export type ConfiguracionPlataformaAvgOrderByAggregateInput = {
    id?: SortOrder
    precioTramo1?: SortOrder
    limiteTramo1?: SortOrder
    precioTramo2?: SortOrder
  }

  export type ConfiguracionPlataformaMaxOrderByAggregateInput = {
    id?: SortOrder
    precioTramo1?: SortOrder
    limiteTramo1?: SortOrder
    precioTramo2?: SortOrder
  }

  export type ConfiguracionPlataformaMinOrderByAggregateInput = {
    id?: SortOrder
    precioTramo1?: SortOrder
    limiteTramo1?: SortOrder
    precioTramo2?: SortOrder
  }

  export type ConfiguracionPlataformaSumOrderByAggregateInput = {
    id?: SortOrder
    precioTramo1?: SortOrder
    limiteTramo1?: SortOrder
    precioTramo2?: SortOrder
  }

  export type JornadaVigenciaCountOrderByAggregateInput = {
    id?: SortOrder
    vigenteDesde?: SortOrder
    horasSemanales?: SortOrder
  }

  export type JornadaVigenciaAvgOrderByAggregateInput = {
    horasSemanales?: SortOrder
  }

  export type JornadaVigenciaMaxOrderByAggregateInput = {
    id?: SortOrder
    vigenteDesde?: SortOrder
    horasSemanales?: SortOrder
  }

  export type JornadaVigenciaMinOrderByAggregateInput = {
    id?: SortOrder
    vigenteDesde?: SortOrder
    horasSemanales?: SortOrder
  }

  export type JornadaVigenciaSumOrderByAggregateInput = {
    horasSemanales?: SortOrder
  }
  export type JsonFilter<$PrismaModel = never> = 
    | PatchUndefined<
        Either<Required<JsonFilterBase<$PrismaModel>>, Exclude<keyof Required<JsonFilterBase<$PrismaModel>>, 'path'>>,
        Required<JsonFilterBase<$PrismaModel>>
      >
    | OptionalFlat<Omit<Required<JsonFilterBase<$PrismaModel>>, 'path'>>

  export type JsonFilterBase<$PrismaModel = never> = {
    equals?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    path?: string
    string_contains?: string | StringFieldRefInput<$PrismaModel>
    string_starts_with?: string | StringFieldRefInput<$PrismaModel>
    string_ends_with?: string | StringFieldRefInput<$PrismaModel>
    array_contains?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_starts_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_ends_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    lt?: InputJsonValue
    lte?: InputJsonValue
    gt?: InputJsonValue
    gte?: InputJsonValue
    not?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
  }

  export type TipoHoraCodigoVigenteDesdeCompoundUniqueInput = {
    codigo: string
    vigenteDesde: Date | string
  }

  export type TipoHoraCountOrderByAggregateInput = {
    id?: SortOrder
    nombre?: SortOrder
    codigo?: SortOrder
    horaInicio?: SortOrder
    horaFin?: SortOrder
    recargo?: SortOrder
    aplica?: SortOrder
    vigenteDesde?: SortOrder
    vigenteHasta?: SortOrder
    activo?: SortOrder
  }

  export type TipoHoraAvgOrderByAggregateInput = {
    horaInicio?: SortOrder
    horaFin?: SortOrder
    recargo?: SortOrder
  }

  export type TipoHoraMaxOrderByAggregateInput = {
    id?: SortOrder
    nombre?: SortOrder
    codigo?: SortOrder
    horaInicio?: SortOrder
    horaFin?: SortOrder
    recargo?: SortOrder
    vigenteDesde?: SortOrder
    vigenteHasta?: SortOrder
    activo?: SortOrder
  }

  export type TipoHoraMinOrderByAggregateInput = {
    id?: SortOrder
    nombre?: SortOrder
    codigo?: SortOrder
    horaInicio?: SortOrder
    horaFin?: SortOrder
    recargo?: SortOrder
    vigenteDesde?: SortOrder
    vigenteHasta?: SortOrder
    activo?: SortOrder
  }

  export type TipoHoraSumOrderByAggregateInput = {
    horaInicio?: SortOrder
    horaFin?: SortOrder
    recargo?: SortOrder
  }
  export type JsonWithAggregatesFilter<$PrismaModel = never> = 
    | PatchUndefined<
        Either<Required<JsonWithAggregatesFilterBase<$PrismaModel>>, Exclude<keyof Required<JsonWithAggregatesFilterBase<$PrismaModel>>, 'path'>>,
        Required<JsonWithAggregatesFilterBase<$PrismaModel>>
      >
    | OptionalFlat<Omit<Required<JsonWithAggregatesFilterBase<$PrismaModel>>, 'path'>>

  export type JsonWithAggregatesFilterBase<$PrismaModel = never> = {
    equals?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    path?: string
    string_contains?: string | StringFieldRefInput<$PrismaModel>
    string_starts_with?: string | StringFieldRefInput<$PrismaModel>
    string_ends_with?: string | StringFieldRefInput<$PrismaModel>
    array_contains?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_starts_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_ends_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    lt?: InputJsonValue
    lte?: InputJsonValue
    gt?: InputJsonValue
    gte?: InputJsonValue
    not?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedJsonFilter<$PrismaModel>
    _max?: NestedJsonFilter<$PrismaModel>
  }

  export type FranjaHorarioListRelationFilter = {
    every?: FranjaHorarioWhereInput
    some?: FranjaHorarioWhereInput
    none?: FranjaHorarioWhereInput
  }

  export type FranjaHorarioOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type HorarioCountOrderByAggregateInput = {
    id?: SortOrder
    empresaId?: SortOrder
    nombre?: SortOrder
    toleranciaMin?: SortOrder
    activo?: SortOrder
    creadoEn?: SortOrder
  }

  export type HorarioAvgOrderByAggregateInput = {
    toleranciaMin?: SortOrder
  }

  export type HorarioMaxOrderByAggregateInput = {
    id?: SortOrder
    empresaId?: SortOrder
    nombre?: SortOrder
    toleranciaMin?: SortOrder
    activo?: SortOrder
    creadoEn?: SortOrder
  }

  export type HorarioMinOrderByAggregateInput = {
    id?: SortOrder
    empresaId?: SortOrder
    nombre?: SortOrder
    toleranciaMin?: SortOrder
    activo?: SortOrder
    creadoEn?: SortOrder
  }

  export type HorarioSumOrderByAggregateInput = {
    toleranciaMin?: SortOrder
  }

  export type HorarioRelationFilter = {
    is?: HorarioWhereInput
    isNot?: HorarioWhereInput
  }

  export type FranjaHorarioCountOrderByAggregateInput = {
    id?: SortOrder
    horarioId?: SortOrder
    dias?: SortOrder
    horaEntrada?: SortOrder
    horaSalida?: SortOrder
  }

  export type FranjaHorarioMaxOrderByAggregateInput = {
    id?: SortOrder
    horarioId?: SortOrder
    horaEntrada?: SortOrder
    horaSalida?: SortOrder
  }

  export type FranjaHorarioMinOrderByAggregateInput = {
    id?: SortOrder
    horarioId?: SortOrder
    horaEntrada?: SortOrder
    horaSalida?: SortOrder
  }

  export type DispositivoKioscoCountOrderByAggregateInput = {
    id?: SortOrder
    empresaId?: SortOrder
    nombre?: SortOrder
    token?: SortOrder
    creadoEn?: SortOrder
    ultimoUso?: SortOrder
  }

  export type DispositivoKioscoMaxOrderByAggregateInput = {
    id?: SortOrder
    empresaId?: SortOrder
    nombre?: SortOrder
    token?: SortOrder
    creadoEn?: SortOrder
    ultimoUso?: SortOrder
  }

  export type DispositivoKioscoMinOrderByAggregateInput = {
    id?: SortOrder
    empresaId?: SortOrder
    nombre?: SortOrder
    token?: SortOrder
    creadoEn?: SortOrder
    ultimoUso?: SortOrder
  }
  export type JsonNullableFilter<$PrismaModel = never> = 
    | PatchUndefined<
        Either<Required<JsonNullableFilterBase<$PrismaModel>>, Exclude<keyof Required<JsonNullableFilterBase<$PrismaModel>>, 'path'>>,
        Required<JsonNullableFilterBase<$PrismaModel>>
      >
    | OptionalFlat<Omit<Required<JsonNullableFilterBase<$PrismaModel>>, 'path'>>

  export type JsonNullableFilterBase<$PrismaModel = never> = {
    equals?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    path?: string
    string_contains?: string | StringFieldRefInput<$PrismaModel>
    string_starts_with?: string | StringFieldRefInput<$PrismaModel>
    string_ends_with?: string | StringFieldRefInput<$PrismaModel>
    array_contains?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_starts_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_ends_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    lt?: InputJsonValue
    lte?: InputJsonValue
    gt?: InputJsonValue
    gte?: InputJsonValue
    not?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
  }

  export type HorarioNullableRelationFilter = {
    is?: HorarioWhereInput | null
    isNot?: HorarioWhereInput | null
  }

  export type RegistroListRelationFilter = {
    every?: RegistroWhereInput
    some?: RegistroWhereInput
    none?: RegistroWhereInput
  }

  export type PermisoListRelationFilter = {
    every?: PermisoWhereInput
    some?: PermisoWhereInput
    none?: PermisoWhereInput
  }

  export type RegistroOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type PermisoOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type ColaboradorEmpresaIdCedulaCompoundUniqueInput = {
    empresaId: string
    cedula: string
  }

  export type ColaboradorCountOrderByAggregateInput = {
    id?: SortOrder
    empresaId?: SortOrder
    nombre?: SortOrder
    apellido?: SortOrder
    cedula?: SortOrder
    cargo?: SortOrder
    email?: SortOrder
    telefono?: SortOrder
    fechaNacimiento?: SortOrder
    salarioMensual?: SortOrder
    rostroDescriptor?: SortOrder
    rostroEnroladoEn?: SortOrder
    horarioId?: SortOrder
    activo?: SortOrder
    retiroProgramado?: SortOrder
    creadoEn?: SortOrder
    actualizadoEn?: SortOrder
  }

  export type ColaboradorAvgOrderByAggregateInput = {
    salarioMensual?: SortOrder
  }

  export type ColaboradorMaxOrderByAggregateInput = {
    id?: SortOrder
    empresaId?: SortOrder
    nombre?: SortOrder
    apellido?: SortOrder
    cedula?: SortOrder
    cargo?: SortOrder
    email?: SortOrder
    telefono?: SortOrder
    fechaNacimiento?: SortOrder
    salarioMensual?: SortOrder
    rostroEnroladoEn?: SortOrder
    horarioId?: SortOrder
    activo?: SortOrder
    retiroProgramado?: SortOrder
    creadoEn?: SortOrder
    actualizadoEn?: SortOrder
  }

  export type ColaboradorMinOrderByAggregateInput = {
    id?: SortOrder
    empresaId?: SortOrder
    nombre?: SortOrder
    apellido?: SortOrder
    cedula?: SortOrder
    cargo?: SortOrder
    email?: SortOrder
    telefono?: SortOrder
    fechaNacimiento?: SortOrder
    salarioMensual?: SortOrder
    rostroEnroladoEn?: SortOrder
    horarioId?: SortOrder
    activo?: SortOrder
    retiroProgramado?: SortOrder
    creadoEn?: SortOrder
    actualizadoEn?: SortOrder
  }

  export type ColaboradorSumOrderByAggregateInput = {
    salarioMensual?: SortOrder
  }
  export type JsonNullableWithAggregatesFilter<$PrismaModel = never> = 
    | PatchUndefined<
        Either<Required<JsonNullableWithAggregatesFilterBase<$PrismaModel>>, Exclude<keyof Required<JsonNullableWithAggregatesFilterBase<$PrismaModel>>, 'path'>>,
        Required<JsonNullableWithAggregatesFilterBase<$PrismaModel>>
      >
    | OptionalFlat<Omit<Required<JsonNullableWithAggregatesFilterBase<$PrismaModel>>, 'path'>>

  export type JsonNullableWithAggregatesFilterBase<$PrismaModel = never> = {
    equals?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    path?: string
    string_contains?: string | StringFieldRefInput<$PrismaModel>
    string_starts_with?: string | StringFieldRefInput<$PrismaModel>
    string_ends_with?: string | StringFieldRefInput<$PrismaModel>
    array_contains?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_starts_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_ends_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    lt?: InputJsonValue
    lte?: InputJsonValue
    gt?: InputJsonValue
    gte?: InputJsonValue
    not?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedJsonNullableFilter<$PrismaModel>
    _max?: NestedJsonNullableFilter<$PrismaModel>
  }

  export type EnumTipoRegistroFilter<$PrismaModel = never> = {
    equals?: $Enums.TipoRegistro | EnumTipoRegistroFieldRefInput<$PrismaModel>
    in?: $Enums.TipoRegistro[]
    notIn?: $Enums.TipoRegistro[]
    not?: NestedEnumTipoRegistroFilter<$PrismaModel> | $Enums.TipoRegistro
  }

  export type ColaboradorRelationFilter = {
    is?: ColaboradorWhereInput
    isNot?: ColaboradorWhereInput
  }

  export type RegistroCountOrderByAggregateInput = {
    id?: SortOrder
    colaboradorId?: SortOrder
    fecha?: SortOrder
    entrada?: SortOrder
    salida?: SortOrder
    tipo?: SortOrder
    observacion?: SortOrder
    fotoEntrada?: SortOrder
    fotoSalida?: SortOrder
    editadoPor?: SortOrder
    editadoEn?: SortOrder
    creadoEn?: SortOrder
  }

  export type RegistroMaxOrderByAggregateInput = {
    id?: SortOrder
    colaboradorId?: SortOrder
    fecha?: SortOrder
    entrada?: SortOrder
    salida?: SortOrder
    tipo?: SortOrder
    observacion?: SortOrder
    fotoEntrada?: SortOrder
    fotoSalida?: SortOrder
    editadoPor?: SortOrder
    editadoEn?: SortOrder
    creadoEn?: SortOrder
  }

  export type RegistroMinOrderByAggregateInput = {
    id?: SortOrder
    colaboradorId?: SortOrder
    fecha?: SortOrder
    entrada?: SortOrder
    salida?: SortOrder
    tipo?: SortOrder
    observacion?: SortOrder
    fotoEntrada?: SortOrder
    fotoSalida?: SortOrder
    editadoPor?: SortOrder
    editadoEn?: SortOrder
    creadoEn?: SortOrder
  }

  export type EnumTipoRegistroWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.TipoRegistro | EnumTipoRegistroFieldRefInput<$PrismaModel>
    in?: $Enums.TipoRegistro[]
    notIn?: $Enums.TipoRegistro[]
    not?: NestedEnumTipoRegistroWithAggregatesFilter<$PrismaModel> | $Enums.TipoRegistro
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumTipoRegistroFilter<$PrismaModel>
    _max?: NestedEnumTipoRegistroFilter<$PrismaModel>
  }

  export type EnumTipoPermisoFilter<$PrismaModel = never> = {
    equals?: $Enums.TipoPermiso | EnumTipoPermisoFieldRefInput<$PrismaModel>
    in?: $Enums.TipoPermiso[]
    notIn?: $Enums.TipoPermiso[]
    not?: NestedEnumTipoPermisoFilter<$PrismaModel> | $Enums.TipoPermiso
  }

  export type PermisoCountOrderByAggregateInput = {
    id?: SortOrder
    colaboradorId?: SortOrder
    fechaInicio?: SortOrder
    fechaFin?: SortOrder
    tipo?: SortOrder
    descripcion?: SortOrder
    aprobado?: SortOrder
    creadoEn?: SortOrder
  }

  export type PermisoMaxOrderByAggregateInput = {
    id?: SortOrder
    colaboradorId?: SortOrder
    fechaInicio?: SortOrder
    fechaFin?: SortOrder
    tipo?: SortOrder
    descripcion?: SortOrder
    aprobado?: SortOrder
    creadoEn?: SortOrder
  }

  export type PermisoMinOrderByAggregateInput = {
    id?: SortOrder
    colaboradorId?: SortOrder
    fechaInicio?: SortOrder
    fechaFin?: SortOrder
    tipo?: SortOrder
    descripcion?: SortOrder
    aprobado?: SortOrder
    creadoEn?: SortOrder
  }

  export type EnumTipoPermisoWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.TipoPermiso | EnumTipoPermisoFieldRefInput<$PrismaModel>
    in?: $Enums.TipoPermiso[]
    notIn?: $Enums.TipoPermiso[]
    not?: NestedEnumTipoPermisoWithAggregatesFilter<$PrismaModel> | $Enums.TipoPermiso
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumTipoPermisoFilter<$PrismaModel>
    _max?: NestedEnumTipoPermisoFilter<$PrismaModel>
  }

  export type EmpresaNullableRelationFilter = {
    is?: EmpresaWhereInput | null
    isNot?: EmpresaWhereInput | null
  }

  export type DiaFestivoEmpresaIdFechaCompoundUniqueInput = {
    empresaId: string
    fecha: Date | string
  }

  export type DiaFestivoCountOrderByAggregateInput = {
    id?: SortOrder
    empresaId?: SortOrder
    fecha?: SortOrder
    nombre?: SortOrder
    creadoEn?: SortOrder
  }

  export type DiaFestivoMaxOrderByAggregateInput = {
    id?: SortOrder
    empresaId?: SortOrder
    fecha?: SortOrder
    nombre?: SortOrder
    creadoEn?: SortOrder
  }

  export type DiaFestivoMinOrderByAggregateInput = {
    id?: SortOrder
    empresaId?: SortOrder
    fecha?: SortOrder
    nombre?: SortOrder
    creadoEn?: SortOrder
  }

  export type ConfiguracionEmpresaIdClaveCompoundUniqueInput = {
    empresaId: string
    clave: string
  }

  export type ConfiguracionCountOrderByAggregateInput = {
    id?: SortOrder
    empresaId?: SortOrder
    clave?: SortOrder
    valor?: SortOrder
  }

  export type ConfiguracionMaxOrderByAggregateInput = {
    id?: SortOrder
    empresaId?: SortOrder
    clave?: SortOrder
    valor?: SortOrder
  }

  export type ConfiguracionMinOrderByAggregateInput = {
    id?: SortOrder
    empresaId?: SortOrder
    clave?: SortOrder
    valor?: SortOrder
  }

  export type EnumRolFilter<$PrismaModel = never> = {
    equals?: $Enums.Rol | EnumRolFieldRefInput<$PrismaModel>
    in?: $Enums.Rol[]
    notIn?: $Enums.Rol[]
    not?: NestedEnumRolFilter<$PrismaModel> | $Enums.Rol
  }

  export type UsuarioCountOrderByAggregateInput = {
    id?: SortOrder
    empresaId?: SortOrder
    email?: SortOrder
    password?: SortOrder
    nombre?: SortOrder
    rol?: SortOrder
    activo?: SortOrder
    resetToken?: SortOrder
    resetExpira?: SortOrder
    emailVerificado?: SortOrder
    verificacionCodigo?: SortOrder
    verificacionExpira?: SortOrder
    creadoEn?: SortOrder
  }

  export type UsuarioMaxOrderByAggregateInput = {
    id?: SortOrder
    empresaId?: SortOrder
    email?: SortOrder
    password?: SortOrder
    nombre?: SortOrder
    rol?: SortOrder
    activo?: SortOrder
    resetToken?: SortOrder
    resetExpira?: SortOrder
    emailVerificado?: SortOrder
    verificacionCodigo?: SortOrder
    verificacionExpira?: SortOrder
    creadoEn?: SortOrder
  }

  export type UsuarioMinOrderByAggregateInput = {
    id?: SortOrder
    empresaId?: SortOrder
    email?: SortOrder
    password?: SortOrder
    nombre?: SortOrder
    rol?: SortOrder
    activo?: SortOrder
    resetToken?: SortOrder
    resetExpira?: SortOrder
    emailVerificado?: SortOrder
    verificacionCodigo?: SortOrder
    verificacionExpira?: SortOrder
    creadoEn?: SortOrder
  }

  export type EnumRolWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.Rol | EnumRolFieldRefInput<$PrismaModel>
    in?: $Enums.Rol[]
    notIn?: $Enums.Rol[]
    not?: NestedEnumRolWithAggregatesFilter<$PrismaModel> | $Enums.Rol
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumRolFilter<$PrismaModel>
    _max?: NestedEnumRolFilter<$PrismaModel>
  }

  export type UsuarioCreateNestedManyWithoutEmpresaInput = {
    create?: XOR<UsuarioCreateWithoutEmpresaInput, UsuarioUncheckedCreateWithoutEmpresaInput> | UsuarioCreateWithoutEmpresaInput[] | UsuarioUncheckedCreateWithoutEmpresaInput[]
    connectOrCreate?: UsuarioCreateOrConnectWithoutEmpresaInput | UsuarioCreateOrConnectWithoutEmpresaInput[]
    createMany?: UsuarioCreateManyEmpresaInputEnvelope
    connect?: UsuarioWhereUniqueInput | UsuarioWhereUniqueInput[]
  }

  export type ColaboradorCreateNestedManyWithoutEmpresaInput = {
    create?: XOR<ColaboradorCreateWithoutEmpresaInput, ColaboradorUncheckedCreateWithoutEmpresaInput> | ColaboradorCreateWithoutEmpresaInput[] | ColaboradorUncheckedCreateWithoutEmpresaInput[]
    connectOrCreate?: ColaboradorCreateOrConnectWithoutEmpresaInput | ColaboradorCreateOrConnectWithoutEmpresaInput[]
    createMany?: ColaboradorCreateManyEmpresaInputEnvelope
    connect?: ColaboradorWhereUniqueInput | ColaboradorWhereUniqueInput[]
  }

  export type DiaFestivoCreateNestedManyWithoutEmpresaInput = {
    create?: XOR<DiaFestivoCreateWithoutEmpresaInput, DiaFestivoUncheckedCreateWithoutEmpresaInput> | DiaFestivoCreateWithoutEmpresaInput[] | DiaFestivoUncheckedCreateWithoutEmpresaInput[]
    connectOrCreate?: DiaFestivoCreateOrConnectWithoutEmpresaInput | DiaFestivoCreateOrConnectWithoutEmpresaInput[]
    createMany?: DiaFestivoCreateManyEmpresaInputEnvelope
    connect?: DiaFestivoWhereUniqueInput | DiaFestivoWhereUniqueInput[]
  }

  export type ConfiguracionCreateNestedManyWithoutEmpresaInput = {
    create?: XOR<ConfiguracionCreateWithoutEmpresaInput, ConfiguracionUncheckedCreateWithoutEmpresaInput> | ConfiguracionCreateWithoutEmpresaInput[] | ConfiguracionUncheckedCreateWithoutEmpresaInput[]
    connectOrCreate?: ConfiguracionCreateOrConnectWithoutEmpresaInput | ConfiguracionCreateOrConnectWithoutEmpresaInput[]
    createMany?: ConfiguracionCreateManyEmpresaInputEnvelope
    connect?: ConfiguracionWhereUniqueInput | ConfiguracionWhereUniqueInput[]
  }

  export type SuscripcionCreateNestedOneWithoutEmpresaInput = {
    create?: XOR<SuscripcionCreateWithoutEmpresaInput, SuscripcionUncheckedCreateWithoutEmpresaInput>
    connectOrCreate?: SuscripcionCreateOrConnectWithoutEmpresaInput
    connect?: SuscripcionWhereUniqueInput
  }

  export type HorarioCreateNestedManyWithoutEmpresaInput = {
    create?: XOR<HorarioCreateWithoutEmpresaInput, HorarioUncheckedCreateWithoutEmpresaInput> | HorarioCreateWithoutEmpresaInput[] | HorarioUncheckedCreateWithoutEmpresaInput[]
    connectOrCreate?: HorarioCreateOrConnectWithoutEmpresaInput | HorarioCreateOrConnectWithoutEmpresaInput[]
    createMany?: HorarioCreateManyEmpresaInputEnvelope
    connect?: HorarioWhereUniqueInput | HorarioWhereUniqueInput[]
  }

  export type DispositivoKioscoCreateNestedManyWithoutEmpresaInput = {
    create?: XOR<DispositivoKioscoCreateWithoutEmpresaInput, DispositivoKioscoUncheckedCreateWithoutEmpresaInput> | DispositivoKioscoCreateWithoutEmpresaInput[] | DispositivoKioscoUncheckedCreateWithoutEmpresaInput[]
    connectOrCreate?: DispositivoKioscoCreateOrConnectWithoutEmpresaInput | DispositivoKioscoCreateOrConnectWithoutEmpresaInput[]
    createMany?: DispositivoKioscoCreateManyEmpresaInputEnvelope
    connect?: DispositivoKioscoWhereUniqueInput | DispositivoKioscoWhereUniqueInput[]
  }

  export type UsuarioUncheckedCreateNestedManyWithoutEmpresaInput = {
    create?: XOR<UsuarioCreateWithoutEmpresaInput, UsuarioUncheckedCreateWithoutEmpresaInput> | UsuarioCreateWithoutEmpresaInput[] | UsuarioUncheckedCreateWithoutEmpresaInput[]
    connectOrCreate?: UsuarioCreateOrConnectWithoutEmpresaInput | UsuarioCreateOrConnectWithoutEmpresaInput[]
    createMany?: UsuarioCreateManyEmpresaInputEnvelope
    connect?: UsuarioWhereUniqueInput | UsuarioWhereUniqueInput[]
  }

  export type ColaboradorUncheckedCreateNestedManyWithoutEmpresaInput = {
    create?: XOR<ColaboradorCreateWithoutEmpresaInput, ColaboradorUncheckedCreateWithoutEmpresaInput> | ColaboradorCreateWithoutEmpresaInput[] | ColaboradorUncheckedCreateWithoutEmpresaInput[]
    connectOrCreate?: ColaboradorCreateOrConnectWithoutEmpresaInput | ColaboradorCreateOrConnectWithoutEmpresaInput[]
    createMany?: ColaboradorCreateManyEmpresaInputEnvelope
    connect?: ColaboradorWhereUniqueInput | ColaboradorWhereUniqueInput[]
  }

  export type DiaFestivoUncheckedCreateNestedManyWithoutEmpresaInput = {
    create?: XOR<DiaFestivoCreateWithoutEmpresaInput, DiaFestivoUncheckedCreateWithoutEmpresaInput> | DiaFestivoCreateWithoutEmpresaInput[] | DiaFestivoUncheckedCreateWithoutEmpresaInput[]
    connectOrCreate?: DiaFestivoCreateOrConnectWithoutEmpresaInput | DiaFestivoCreateOrConnectWithoutEmpresaInput[]
    createMany?: DiaFestivoCreateManyEmpresaInputEnvelope
    connect?: DiaFestivoWhereUniqueInput | DiaFestivoWhereUniqueInput[]
  }

  export type ConfiguracionUncheckedCreateNestedManyWithoutEmpresaInput = {
    create?: XOR<ConfiguracionCreateWithoutEmpresaInput, ConfiguracionUncheckedCreateWithoutEmpresaInput> | ConfiguracionCreateWithoutEmpresaInput[] | ConfiguracionUncheckedCreateWithoutEmpresaInput[]
    connectOrCreate?: ConfiguracionCreateOrConnectWithoutEmpresaInput | ConfiguracionCreateOrConnectWithoutEmpresaInput[]
    createMany?: ConfiguracionCreateManyEmpresaInputEnvelope
    connect?: ConfiguracionWhereUniqueInput | ConfiguracionWhereUniqueInput[]
  }

  export type SuscripcionUncheckedCreateNestedOneWithoutEmpresaInput = {
    create?: XOR<SuscripcionCreateWithoutEmpresaInput, SuscripcionUncheckedCreateWithoutEmpresaInput>
    connectOrCreate?: SuscripcionCreateOrConnectWithoutEmpresaInput
    connect?: SuscripcionWhereUniqueInput
  }

  export type HorarioUncheckedCreateNestedManyWithoutEmpresaInput = {
    create?: XOR<HorarioCreateWithoutEmpresaInput, HorarioUncheckedCreateWithoutEmpresaInput> | HorarioCreateWithoutEmpresaInput[] | HorarioUncheckedCreateWithoutEmpresaInput[]
    connectOrCreate?: HorarioCreateOrConnectWithoutEmpresaInput | HorarioCreateOrConnectWithoutEmpresaInput[]
    createMany?: HorarioCreateManyEmpresaInputEnvelope
    connect?: HorarioWhereUniqueInput | HorarioWhereUniqueInput[]
  }

  export type DispositivoKioscoUncheckedCreateNestedManyWithoutEmpresaInput = {
    create?: XOR<DispositivoKioscoCreateWithoutEmpresaInput, DispositivoKioscoUncheckedCreateWithoutEmpresaInput> | DispositivoKioscoCreateWithoutEmpresaInput[] | DispositivoKioscoUncheckedCreateWithoutEmpresaInput[]
    connectOrCreate?: DispositivoKioscoCreateOrConnectWithoutEmpresaInput | DispositivoKioscoCreateOrConnectWithoutEmpresaInput[]
    createMany?: DispositivoKioscoCreateManyEmpresaInputEnvelope
    connect?: DispositivoKioscoWhereUniqueInput | DispositivoKioscoWhereUniqueInput[]
  }

  export type StringFieldUpdateOperationsInput = {
    set?: string
  }

  export type NullableStringFieldUpdateOperationsInput = {
    set?: string | null
  }

  export type BoolFieldUpdateOperationsInput = {
    set?: boolean
  }

  export type DateTimeFieldUpdateOperationsInput = {
    set?: Date | string
  }

  export type UsuarioUpdateManyWithoutEmpresaNestedInput = {
    create?: XOR<UsuarioCreateWithoutEmpresaInput, UsuarioUncheckedCreateWithoutEmpresaInput> | UsuarioCreateWithoutEmpresaInput[] | UsuarioUncheckedCreateWithoutEmpresaInput[]
    connectOrCreate?: UsuarioCreateOrConnectWithoutEmpresaInput | UsuarioCreateOrConnectWithoutEmpresaInput[]
    upsert?: UsuarioUpsertWithWhereUniqueWithoutEmpresaInput | UsuarioUpsertWithWhereUniqueWithoutEmpresaInput[]
    createMany?: UsuarioCreateManyEmpresaInputEnvelope
    set?: UsuarioWhereUniqueInput | UsuarioWhereUniqueInput[]
    disconnect?: UsuarioWhereUniqueInput | UsuarioWhereUniqueInput[]
    delete?: UsuarioWhereUniqueInput | UsuarioWhereUniqueInput[]
    connect?: UsuarioWhereUniqueInput | UsuarioWhereUniqueInput[]
    update?: UsuarioUpdateWithWhereUniqueWithoutEmpresaInput | UsuarioUpdateWithWhereUniqueWithoutEmpresaInput[]
    updateMany?: UsuarioUpdateManyWithWhereWithoutEmpresaInput | UsuarioUpdateManyWithWhereWithoutEmpresaInput[]
    deleteMany?: UsuarioScalarWhereInput | UsuarioScalarWhereInput[]
  }

  export type ColaboradorUpdateManyWithoutEmpresaNestedInput = {
    create?: XOR<ColaboradorCreateWithoutEmpresaInput, ColaboradorUncheckedCreateWithoutEmpresaInput> | ColaboradorCreateWithoutEmpresaInput[] | ColaboradorUncheckedCreateWithoutEmpresaInput[]
    connectOrCreate?: ColaboradorCreateOrConnectWithoutEmpresaInput | ColaboradorCreateOrConnectWithoutEmpresaInput[]
    upsert?: ColaboradorUpsertWithWhereUniqueWithoutEmpresaInput | ColaboradorUpsertWithWhereUniqueWithoutEmpresaInput[]
    createMany?: ColaboradorCreateManyEmpresaInputEnvelope
    set?: ColaboradorWhereUniqueInput | ColaboradorWhereUniqueInput[]
    disconnect?: ColaboradorWhereUniqueInput | ColaboradorWhereUniqueInput[]
    delete?: ColaboradorWhereUniqueInput | ColaboradorWhereUniqueInput[]
    connect?: ColaboradorWhereUniqueInput | ColaboradorWhereUniqueInput[]
    update?: ColaboradorUpdateWithWhereUniqueWithoutEmpresaInput | ColaboradorUpdateWithWhereUniqueWithoutEmpresaInput[]
    updateMany?: ColaboradorUpdateManyWithWhereWithoutEmpresaInput | ColaboradorUpdateManyWithWhereWithoutEmpresaInput[]
    deleteMany?: ColaboradorScalarWhereInput | ColaboradorScalarWhereInput[]
  }

  export type DiaFestivoUpdateManyWithoutEmpresaNestedInput = {
    create?: XOR<DiaFestivoCreateWithoutEmpresaInput, DiaFestivoUncheckedCreateWithoutEmpresaInput> | DiaFestivoCreateWithoutEmpresaInput[] | DiaFestivoUncheckedCreateWithoutEmpresaInput[]
    connectOrCreate?: DiaFestivoCreateOrConnectWithoutEmpresaInput | DiaFestivoCreateOrConnectWithoutEmpresaInput[]
    upsert?: DiaFestivoUpsertWithWhereUniqueWithoutEmpresaInput | DiaFestivoUpsertWithWhereUniqueWithoutEmpresaInput[]
    createMany?: DiaFestivoCreateManyEmpresaInputEnvelope
    set?: DiaFestivoWhereUniqueInput | DiaFestivoWhereUniqueInput[]
    disconnect?: DiaFestivoWhereUniqueInput | DiaFestivoWhereUniqueInput[]
    delete?: DiaFestivoWhereUniqueInput | DiaFestivoWhereUniqueInput[]
    connect?: DiaFestivoWhereUniqueInput | DiaFestivoWhereUniqueInput[]
    update?: DiaFestivoUpdateWithWhereUniqueWithoutEmpresaInput | DiaFestivoUpdateWithWhereUniqueWithoutEmpresaInput[]
    updateMany?: DiaFestivoUpdateManyWithWhereWithoutEmpresaInput | DiaFestivoUpdateManyWithWhereWithoutEmpresaInput[]
    deleteMany?: DiaFestivoScalarWhereInput | DiaFestivoScalarWhereInput[]
  }

  export type ConfiguracionUpdateManyWithoutEmpresaNestedInput = {
    create?: XOR<ConfiguracionCreateWithoutEmpresaInput, ConfiguracionUncheckedCreateWithoutEmpresaInput> | ConfiguracionCreateWithoutEmpresaInput[] | ConfiguracionUncheckedCreateWithoutEmpresaInput[]
    connectOrCreate?: ConfiguracionCreateOrConnectWithoutEmpresaInput | ConfiguracionCreateOrConnectWithoutEmpresaInput[]
    upsert?: ConfiguracionUpsertWithWhereUniqueWithoutEmpresaInput | ConfiguracionUpsertWithWhereUniqueWithoutEmpresaInput[]
    createMany?: ConfiguracionCreateManyEmpresaInputEnvelope
    set?: ConfiguracionWhereUniqueInput | ConfiguracionWhereUniqueInput[]
    disconnect?: ConfiguracionWhereUniqueInput | ConfiguracionWhereUniqueInput[]
    delete?: ConfiguracionWhereUniqueInput | ConfiguracionWhereUniqueInput[]
    connect?: ConfiguracionWhereUniqueInput | ConfiguracionWhereUniqueInput[]
    update?: ConfiguracionUpdateWithWhereUniqueWithoutEmpresaInput | ConfiguracionUpdateWithWhereUniqueWithoutEmpresaInput[]
    updateMany?: ConfiguracionUpdateManyWithWhereWithoutEmpresaInput | ConfiguracionUpdateManyWithWhereWithoutEmpresaInput[]
    deleteMany?: ConfiguracionScalarWhereInput | ConfiguracionScalarWhereInput[]
  }

  export type SuscripcionUpdateOneWithoutEmpresaNestedInput = {
    create?: XOR<SuscripcionCreateWithoutEmpresaInput, SuscripcionUncheckedCreateWithoutEmpresaInput>
    connectOrCreate?: SuscripcionCreateOrConnectWithoutEmpresaInput
    upsert?: SuscripcionUpsertWithoutEmpresaInput
    disconnect?: SuscripcionWhereInput | boolean
    delete?: SuscripcionWhereInput | boolean
    connect?: SuscripcionWhereUniqueInput
    update?: XOR<XOR<SuscripcionUpdateToOneWithWhereWithoutEmpresaInput, SuscripcionUpdateWithoutEmpresaInput>, SuscripcionUncheckedUpdateWithoutEmpresaInput>
  }

  export type HorarioUpdateManyWithoutEmpresaNestedInput = {
    create?: XOR<HorarioCreateWithoutEmpresaInput, HorarioUncheckedCreateWithoutEmpresaInput> | HorarioCreateWithoutEmpresaInput[] | HorarioUncheckedCreateWithoutEmpresaInput[]
    connectOrCreate?: HorarioCreateOrConnectWithoutEmpresaInput | HorarioCreateOrConnectWithoutEmpresaInput[]
    upsert?: HorarioUpsertWithWhereUniqueWithoutEmpresaInput | HorarioUpsertWithWhereUniqueWithoutEmpresaInput[]
    createMany?: HorarioCreateManyEmpresaInputEnvelope
    set?: HorarioWhereUniqueInput | HorarioWhereUniqueInput[]
    disconnect?: HorarioWhereUniqueInput | HorarioWhereUniqueInput[]
    delete?: HorarioWhereUniqueInput | HorarioWhereUniqueInput[]
    connect?: HorarioWhereUniqueInput | HorarioWhereUniqueInput[]
    update?: HorarioUpdateWithWhereUniqueWithoutEmpresaInput | HorarioUpdateWithWhereUniqueWithoutEmpresaInput[]
    updateMany?: HorarioUpdateManyWithWhereWithoutEmpresaInput | HorarioUpdateManyWithWhereWithoutEmpresaInput[]
    deleteMany?: HorarioScalarWhereInput | HorarioScalarWhereInput[]
  }

  export type DispositivoKioscoUpdateManyWithoutEmpresaNestedInput = {
    create?: XOR<DispositivoKioscoCreateWithoutEmpresaInput, DispositivoKioscoUncheckedCreateWithoutEmpresaInput> | DispositivoKioscoCreateWithoutEmpresaInput[] | DispositivoKioscoUncheckedCreateWithoutEmpresaInput[]
    connectOrCreate?: DispositivoKioscoCreateOrConnectWithoutEmpresaInput | DispositivoKioscoCreateOrConnectWithoutEmpresaInput[]
    upsert?: DispositivoKioscoUpsertWithWhereUniqueWithoutEmpresaInput | DispositivoKioscoUpsertWithWhereUniqueWithoutEmpresaInput[]
    createMany?: DispositivoKioscoCreateManyEmpresaInputEnvelope
    set?: DispositivoKioscoWhereUniqueInput | DispositivoKioscoWhereUniqueInput[]
    disconnect?: DispositivoKioscoWhereUniqueInput | DispositivoKioscoWhereUniqueInput[]
    delete?: DispositivoKioscoWhereUniqueInput | DispositivoKioscoWhereUniqueInput[]
    connect?: DispositivoKioscoWhereUniqueInput | DispositivoKioscoWhereUniqueInput[]
    update?: DispositivoKioscoUpdateWithWhereUniqueWithoutEmpresaInput | DispositivoKioscoUpdateWithWhereUniqueWithoutEmpresaInput[]
    updateMany?: DispositivoKioscoUpdateManyWithWhereWithoutEmpresaInput | DispositivoKioscoUpdateManyWithWhereWithoutEmpresaInput[]
    deleteMany?: DispositivoKioscoScalarWhereInput | DispositivoKioscoScalarWhereInput[]
  }

  export type UsuarioUncheckedUpdateManyWithoutEmpresaNestedInput = {
    create?: XOR<UsuarioCreateWithoutEmpresaInput, UsuarioUncheckedCreateWithoutEmpresaInput> | UsuarioCreateWithoutEmpresaInput[] | UsuarioUncheckedCreateWithoutEmpresaInput[]
    connectOrCreate?: UsuarioCreateOrConnectWithoutEmpresaInput | UsuarioCreateOrConnectWithoutEmpresaInput[]
    upsert?: UsuarioUpsertWithWhereUniqueWithoutEmpresaInput | UsuarioUpsertWithWhereUniqueWithoutEmpresaInput[]
    createMany?: UsuarioCreateManyEmpresaInputEnvelope
    set?: UsuarioWhereUniqueInput | UsuarioWhereUniqueInput[]
    disconnect?: UsuarioWhereUniqueInput | UsuarioWhereUniqueInput[]
    delete?: UsuarioWhereUniqueInput | UsuarioWhereUniqueInput[]
    connect?: UsuarioWhereUniqueInput | UsuarioWhereUniqueInput[]
    update?: UsuarioUpdateWithWhereUniqueWithoutEmpresaInput | UsuarioUpdateWithWhereUniqueWithoutEmpresaInput[]
    updateMany?: UsuarioUpdateManyWithWhereWithoutEmpresaInput | UsuarioUpdateManyWithWhereWithoutEmpresaInput[]
    deleteMany?: UsuarioScalarWhereInput | UsuarioScalarWhereInput[]
  }

  export type ColaboradorUncheckedUpdateManyWithoutEmpresaNestedInput = {
    create?: XOR<ColaboradorCreateWithoutEmpresaInput, ColaboradorUncheckedCreateWithoutEmpresaInput> | ColaboradorCreateWithoutEmpresaInput[] | ColaboradorUncheckedCreateWithoutEmpresaInput[]
    connectOrCreate?: ColaboradorCreateOrConnectWithoutEmpresaInput | ColaboradorCreateOrConnectWithoutEmpresaInput[]
    upsert?: ColaboradorUpsertWithWhereUniqueWithoutEmpresaInput | ColaboradorUpsertWithWhereUniqueWithoutEmpresaInput[]
    createMany?: ColaboradorCreateManyEmpresaInputEnvelope
    set?: ColaboradorWhereUniqueInput | ColaboradorWhereUniqueInput[]
    disconnect?: ColaboradorWhereUniqueInput | ColaboradorWhereUniqueInput[]
    delete?: ColaboradorWhereUniqueInput | ColaboradorWhereUniqueInput[]
    connect?: ColaboradorWhereUniqueInput | ColaboradorWhereUniqueInput[]
    update?: ColaboradorUpdateWithWhereUniqueWithoutEmpresaInput | ColaboradorUpdateWithWhereUniqueWithoutEmpresaInput[]
    updateMany?: ColaboradorUpdateManyWithWhereWithoutEmpresaInput | ColaboradorUpdateManyWithWhereWithoutEmpresaInput[]
    deleteMany?: ColaboradorScalarWhereInput | ColaboradorScalarWhereInput[]
  }

  export type DiaFestivoUncheckedUpdateManyWithoutEmpresaNestedInput = {
    create?: XOR<DiaFestivoCreateWithoutEmpresaInput, DiaFestivoUncheckedCreateWithoutEmpresaInput> | DiaFestivoCreateWithoutEmpresaInput[] | DiaFestivoUncheckedCreateWithoutEmpresaInput[]
    connectOrCreate?: DiaFestivoCreateOrConnectWithoutEmpresaInput | DiaFestivoCreateOrConnectWithoutEmpresaInput[]
    upsert?: DiaFestivoUpsertWithWhereUniqueWithoutEmpresaInput | DiaFestivoUpsertWithWhereUniqueWithoutEmpresaInput[]
    createMany?: DiaFestivoCreateManyEmpresaInputEnvelope
    set?: DiaFestivoWhereUniqueInput | DiaFestivoWhereUniqueInput[]
    disconnect?: DiaFestivoWhereUniqueInput | DiaFestivoWhereUniqueInput[]
    delete?: DiaFestivoWhereUniqueInput | DiaFestivoWhereUniqueInput[]
    connect?: DiaFestivoWhereUniqueInput | DiaFestivoWhereUniqueInput[]
    update?: DiaFestivoUpdateWithWhereUniqueWithoutEmpresaInput | DiaFestivoUpdateWithWhereUniqueWithoutEmpresaInput[]
    updateMany?: DiaFestivoUpdateManyWithWhereWithoutEmpresaInput | DiaFestivoUpdateManyWithWhereWithoutEmpresaInput[]
    deleteMany?: DiaFestivoScalarWhereInput | DiaFestivoScalarWhereInput[]
  }

  export type ConfiguracionUncheckedUpdateManyWithoutEmpresaNestedInput = {
    create?: XOR<ConfiguracionCreateWithoutEmpresaInput, ConfiguracionUncheckedCreateWithoutEmpresaInput> | ConfiguracionCreateWithoutEmpresaInput[] | ConfiguracionUncheckedCreateWithoutEmpresaInput[]
    connectOrCreate?: ConfiguracionCreateOrConnectWithoutEmpresaInput | ConfiguracionCreateOrConnectWithoutEmpresaInput[]
    upsert?: ConfiguracionUpsertWithWhereUniqueWithoutEmpresaInput | ConfiguracionUpsertWithWhereUniqueWithoutEmpresaInput[]
    createMany?: ConfiguracionCreateManyEmpresaInputEnvelope
    set?: ConfiguracionWhereUniqueInput | ConfiguracionWhereUniqueInput[]
    disconnect?: ConfiguracionWhereUniqueInput | ConfiguracionWhereUniqueInput[]
    delete?: ConfiguracionWhereUniqueInput | ConfiguracionWhereUniqueInput[]
    connect?: ConfiguracionWhereUniqueInput | ConfiguracionWhereUniqueInput[]
    update?: ConfiguracionUpdateWithWhereUniqueWithoutEmpresaInput | ConfiguracionUpdateWithWhereUniqueWithoutEmpresaInput[]
    updateMany?: ConfiguracionUpdateManyWithWhereWithoutEmpresaInput | ConfiguracionUpdateManyWithWhereWithoutEmpresaInput[]
    deleteMany?: ConfiguracionScalarWhereInput | ConfiguracionScalarWhereInput[]
  }

  export type SuscripcionUncheckedUpdateOneWithoutEmpresaNestedInput = {
    create?: XOR<SuscripcionCreateWithoutEmpresaInput, SuscripcionUncheckedCreateWithoutEmpresaInput>
    connectOrCreate?: SuscripcionCreateOrConnectWithoutEmpresaInput
    upsert?: SuscripcionUpsertWithoutEmpresaInput
    disconnect?: SuscripcionWhereInput | boolean
    delete?: SuscripcionWhereInput | boolean
    connect?: SuscripcionWhereUniqueInput
    update?: XOR<XOR<SuscripcionUpdateToOneWithWhereWithoutEmpresaInput, SuscripcionUpdateWithoutEmpresaInput>, SuscripcionUncheckedUpdateWithoutEmpresaInput>
  }

  export type HorarioUncheckedUpdateManyWithoutEmpresaNestedInput = {
    create?: XOR<HorarioCreateWithoutEmpresaInput, HorarioUncheckedCreateWithoutEmpresaInput> | HorarioCreateWithoutEmpresaInput[] | HorarioUncheckedCreateWithoutEmpresaInput[]
    connectOrCreate?: HorarioCreateOrConnectWithoutEmpresaInput | HorarioCreateOrConnectWithoutEmpresaInput[]
    upsert?: HorarioUpsertWithWhereUniqueWithoutEmpresaInput | HorarioUpsertWithWhereUniqueWithoutEmpresaInput[]
    createMany?: HorarioCreateManyEmpresaInputEnvelope
    set?: HorarioWhereUniqueInput | HorarioWhereUniqueInput[]
    disconnect?: HorarioWhereUniqueInput | HorarioWhereUniqueInput[]
    delete?: HorarioWhereUniqueInput | HorarioWhereUniqueInput[]
    connect?: HorarioWhereUniqueInput | HorarioWhereUniqueInput[]
    update?: HorarioUpdateWithWhereUniqueWithoutEmpresaInput | HorarioUpdateWithWhereUniqueWithoutEmpresaInput[]
    updateMany?: HorarioUpdateManyWithWhereWithoutEmpresaInput | HorarioUpdateManyWithWhereWithoutEmpresaInput[]
    deleteMany?: HorarioScalarWhereInput | HorarioScalarWhereInput[]
  }

  export type DispositivoKioscoUncheckedUpdateManyWithoutEmpresaNestedInput = {
    create?: XOR<DispositivoKioscoCreateWithoutEmpresaInput, DispositivoKioscoUncheckedCreateWithoutEmpresaInput> | DispositivoKioscoCreateWithoutEmpresaInput[] | DispositivoKioscoUncheckedCreateWithoutEmpresaInput[]
    connectOrCreate?: DispositivoKioscoCreateOrConnectWithoutEmpresaInput | DispositivoKioscoCreateOrConnectWithoutEmpresaInput[]
    upsert?: DispositivoKioscoUpsertWithWhereUniqueWithoutEmpresaInput | DispositivoKioscoUpsertWithWhereUniqueWithoutEmpresaInput[]
    createMany?: DispositivoKioscoCreateManyEmpresaInputEnvelope
    set?: DispositivoKioscoWhereUniqueInput | DispositivoKioscoWhereUniqueInput[]
    disconnect?: DispositivoKioscoWhereUniqueInput | DispositivoKioscoWhereUniqueInput[]
    delete?: DispositivoKioscoWhereUniqueInput | DispositivoKioscoWhereUniqueInput[]
    connect?: DispositivoKioscoWhereUniqueInput | DispositivoKioscoWhereUniqueInput[]
    update?: DispositivoKioscoUpdateWithWhereUniqueWithoutEmpresaInput | DispositivoKioscoUpdateWithWhereUniqueWithoutEmpresaInput[]
    updateMany?: DispositivoKioscoUpdateManyWithWhereWithoutEmpresaInput | DispositivoKioscoUpdateManyWithWhereWithoutEmpresaInput[]
    deleteMany?: DispositivoKioscoScalarWhereInput | DispositivoKioscoScalarWhereInput[]
  }

  export type EmpresaCreateNestedOneWithoutSuscripcionInput = {
    create?: XOR<EmpresaCreateWithoutSuscripcionInput, EmpresaUncheckedCreateWithoutSuscripcionInput>
    connectOrCreate?: EmpresaCreateOrConnectWithoutSuscripcionInput
    connect?: EmpresaWhereUniqueInput
  }

  export type PagoCreateNestedManyWithoutSuscripcionInput = {
    create?: XOR<PagoCreateWithoutSuscripcionInput, PagoUncheckedCreateWithoutSuscripcionInput> | PagoCreateWithoutSuscripcionInput[] | PagoUncheckedCreateWithoutSuscripcionInput[]
    connectOrCreate?: PagoCreateOrConnectWithoutSuscripcionInput | PagoCreateOrConnectWithoutSuscripcionInput[]
    createMany?: PagoCreateManySuscripcionInputEnvelope
    connect?: PagoWhereUniqueInput | PagoWhereUniqueInput[]
  }

  export type PagoUncheckedCreateNestedManyWithoutSuscripcionInput = {
    create?: XOR<PagoCreateWithoutSuscripcionInput, PagoUncheckedCreateWithoutSuscripcionInput> | PagoCreateWithoutSuscripcionInput[] | PagoUncheckedCreateWithoutSuscripcionInput[]
    connectOrCreate?: PagoCreateOrConnectWithoutSuscripcionInput | PagoCreateOrConnectWithoutSuscripcionInput[]
    createMany?: PagoCreateManySuscripcionInputEnvelope
    connect?: PagoWhereUniqueInput | PagoWhereUniqueInput[]
  }

  export type EnumEstadoSuscripcionFieldUpdateOperationsInput = {
    set?: $Enums.EstadoSuscripcion
  }

  export type NullableDateTimeFieldUpdateOperationsInput = {
    set?: Date | string | null
  }

  export type EmpresaUpdateOneRequiredWithoutSuscripcionNestedInput = {
    create?: XOR<EmpresaCreateWithoutSuscripcionInput, EmpresaUncheckedCreateWithoutSuscripcionInput>
    connectOrCreate?: EmpresaCreateOrConnectWithoutSuscripcionInput
    upsert?: EmpresaUpsertWithoutSuscripcionInput
    connect?: EmpresaWhereUniqueInput
    update?: XOR<XOR<EmpresaUpdateToOneWithWhereWithoutSuscripcionInput, EmpresaUpdateWithoutSuscripcionInput>, EmpresaUncheckedUpdateWithoutSuscripcionInput>
  }

  export type PagoUpdateManyWithoutSuscripcionNestedInput = {
    create?: XOR<PagoCreateWithoutSuscripcionInput, PagoUncheckedCreateWithoutSuscripcionInput> | PagoCreateWithoutSuscripcionInput[] | PagoUncheckedCreateWithoutSuscripcionInput[]
    connectOrCreate?: PagoCreateOrConnectWithoutSuscripcionInput | PagoCreateOrConnectWithoutSuscripcionInput[]
    upsert?: PagoUpsertWithWhereUniqueWithoutSuscripcionInput | PagoUpsertWithWhereUniqueWithoutSuscripcionInput[]
    createMany?: PagoCreateManySuscripcionInputEnvelope
    set?: PagoWhereUniqueInput | PagoWhereUniqueInput[]
    disconnect?: PagoWhereUniqueInput | PagoWhereUniqueInput[]
    delete?: PagoWhereUniqueInput | PagoWhereUniqueInput[]
    connect?: PagoWhereUniqueInput | PagoWhereUniqueInput[]
    update?: PagoUpdateWithWhereUniqueWithoutSuscripcionInput | PagoUpdateWithWhereUniqueWithoutSuscripcionInput[]
    updateMany?: PagoUpdateManyWithWhereWithoutSuscripcionInput | PagoUpdateManyWithWhereWithoutSuscripcionInput[]
    deleteMany?: PagoScalarWhereInput | PagoScalarWhereInput[]
  }

  export type PagoUncheckedUpdateManyWithoutSuscripcionNestedInput = {
    create?: XOR<PagoCreateWithoutSuscripcionInput, PagoUncheckedCreateWithoutSuscripcionInput> | PagoCreateWithoutSuscripcionInput[] | PagoUncheckedCreateWithoutSuscripcionInput[]
    connectOrCreate?: PagoCreateOrConnectWithoutSuscripcionInput | PagoCreateOrConnectWithoutSuscripcionInput[]
    upsert?: PagoUpsertWithWhereUniqueWithoutSuscripcionInput | PagoUpsertWithWhereUniqueWithoutSuscripcionInput[]
    createMany?: PagoCreateManySuscripcionInputEnvelope
    set?: PagoWhereUniqueInput | PagoWhereUniqueInput[]
    disconnect?: PagoWhereUniqueInput | PagoWhereUniqueInput[]
    delete?: PagoWhereUniqueInput | PagoWhereUniqueInput[]
    connect?: PagoWhereUniqueInput | PagoWhereUniqueInput[]
    update?: PagoUpdateWithWhereUniqueWithoutSuscripcionInput | PagoUpdateWithWhereUniqueWithoutSuscripcionInput[]
    updateMany?: PagoUpdateManyWithWhereWithoutSuscripcionInput | PagoUpdateManyWithWhereWithoutSuscripcionInput[]
    deleteMany?: PagoScalarWhereInput | PagoScalarWhereInput[]
  }

  export type SuscripcionCreateNestedOneWithoutPagosInput = {
    create?: XOR<SuscripcionCreateWithoutPagosInput, SuscripcionUncheckedCreateWithoutPagosInput>
    connectOrCreate?: SuscripcionCreateOrConnectWithoutPagosInput
    connect?: SuscripcionWhereUniqueInput
  }

  export type FloatFieldUpdateOperationsInput = {
    set?: number
    increment?: number
    decrement?: number
    multiply?: number
    divide?: number
  }

  export type IntFieldUpdateOperationsInput = {
    set?: number
    increment?: number
    decrement?: number
    multiply?: number
    divide?: number
  }

  export type EnumMetodoPagoFieldUpdateOperationsInput = {
    set?: $Enums.MetodoPago
  }

  export type EnumEstadoPagoFieldUpdateOperationsInput = {
    set?: $Enums.EstadoPago
  }

  export type SuscripcionUpdateOneRequiredWithoutPagosNestedInput = {
    create?: XOR<SuscripcionCreateWithoutPagosInput, SuscripcionUncheckedCreateWithoutPagosInput>
    connectOrCreate?: SuscripcionCreateOrConnectWithoutPagosInput
    upsert?: SuscripcionUpsertWithoutPagosInput
    connect?: SuscripcionWhereUniqueInput
    update?: XOR<XOR<SuscripcionUpdateToOneWithWhereWithoutPagosInput, SuscripcionUpdateWithoutPagosInput>, SuscripcionUncheckedUpdateWithoutPagosInput>
  }

  export type EmpresaCreateNestedOneWithoutHorariosInput = {
    create?: XOR<EmpresaCreateWithoutHorariosInput, EmpresaUncheckedCreateWithoutHorariosInput>
    connectOrCreate?: EmpresaCreateOrConnectWithoutHorariosInput
    connect?: EmpresaWhereUniqueInput
  }

  export type FranjaHorarioCreateNestedManyWithoutHorarioInput = {
    create?: XOR<FranjaHorarioCreateWithoutHorarioInput, FranjaHorarioUncheckedCreateWithoutHorarioInput> | FranjaHorarioCreateWithoutHorarioInput[] | FranjaHorarioUncheckedCreateWithoutHorarioInput[]
    connectOrCreate?: FranjaHorarioCreateOrConnectWithoutHorarioInput | FranjaHorarioCreateOrConnectWithoutHorarioInput[]
    createMany?: FranjaHorarioCreateManyHorarioInputEnvelope
    connect?: FranjaHorarioWhereUniqueInput | FranjaHorarioWhereUniqueInput[]
  }

  export type ColaboradorCreateNestedManyWithoutHorarioInput = {
    create?: XOR<ColaboradorCreateWithoutHorarioInput, ColaboradorUncheckedCreateWithoutHorarioInput> | ColaboradorCreateWithoutHorarioInput[] | ColaboradorUncheckedCreateWithoutHorarioInput[]
    connectOrCreate?: ColaboradorCreateOrConnectWithoutHorarioInput | ColaboradorCreateOrConnectWithoutHorarioInput[]
    createMany?: ColaboradorCreateManyHorarioInputEnvelope
    connect?: ColaboradorWhereUniqueInput | ColaboradorWhereUniqueInput[]
  }

  export type FranjaHorarioUncheckedCreateNestedManyWithoutHorarioInput = {
    create?: XOR<FranjaHorarioCreateWithoutHorarioInput, FranjaHorarioUncheckedCreateWithoutHorarioInput> | FranjaHorarioCreateWithoutHorarioInput[] | FranjaHorarioUncheckedCreateWithoutHorarioInput[]
    connectOrCreate?: FranjaHorarioCreateOrConnectWithoutHorarioInput | FranjaHorarioCreateOrConnectWithoutHorarioInput[]
    createMany?: FranjaHorarioCreateManyHorarioInputEnvelope
    connect?: FranjaHorarioWhereUniqueInput | FranjaHorarioWhereUniqueInput[]
  }

  export type ColaboradorUncheckedCreateNestedManyWithoutHorarioInput = {
    create?: XOR<ColaboradorCreateWithoutHorarioInput, ColaboradorUncheckedCreateWithoutHorarioInput> | ColaboradorCreateWithoutHorarioInput[] | ColaboradorUncheckedCreateWithoutHorarioInput[]
    connectOrCreate?: ColaboradorCreateOrConnectWithoutHorarioInput | ColaboradorCreateOrConnectWithoutHorarioInput[]
    createMany?: ColaboradorCreateManyHorarioInputEnvelope
    connect?: ColaboradorWhereUniqueInput | ColaboradorWhereUniqueInput[]
  }

  export type EmpresaUpdateOneRequiredWithoutHorariosNestedInput = {
    create?: XOR<EmpresaCreateWithoutHorariosInput, EmpresaUncheckedCreateWithoutHorariosInput>
    connectOrCreate?: EmpresaCreateOrConnectWithoutHorariosInput
    upsert?: EmpresaUpsertWithoutHorariosInput
    connect?: EmpresaWhereUniqueInput
    update?: XOR<XOR<EmpresaUpdateToOneWithWhereWithoutHorariosInput, EmpresaUpdateWithoutHorariosInput>, EmpresaUncheckedUpdateWithoutHorariosInput>
  }

  export type FranjaHorarioUpdateManyWithoutHorarioNestedInput = {
    create?: XOR<FranjaHorarioCreateWithoutHorarioInput, FranjaHorarioUncheckedCreateWithoutHorarioInput> | FranjaHorarioCreateWithoutHorarioInput[] | FranjaHorarioUncheckedCreateWithoutHorarioInput[]
    connectOrCreate?: FranjaHorarioCreateOrConnectWithoutHorarioInput | FranjaHorarioCreateOrConnectWithoutHorarioInput[]
    upsert?: FranjaHorarioUpsertWithWhereUniqueWithoutHorarioInput | FranjaHorarioUpsertWithWhereUniqueWithoutHorarioInput[]
    createMany?: FranjaHorarioCreateManyHorarioInputEnvelope
    set?: FranjaHorarioWhereUniqueInput | FranjaHorarioWhereUniqueInput[]
    disconnect?: FranjaHorarioWhereUniqueInput | FranjaHorarioWhereUniqueInput[]
    delete?: FranjaHorarioWhereUniqueInput | FranjaHorarioWhereUniqueInput[]
    connect?: FranjaHorarioWhereUniqueInput | FranjaHorarioWhereUniqueInput[]
    update?: FranjaHorarioUpdateWithWhereUniqueWithoutHorarioInput | FranjaHorarioUpdateWithWhereUniqueWithoutHorarioInput[]
    updateMany?: FranjaHorarioUpdateManyWithWhereWithoutHorarioInput | FranjaHorarioUpdateManyWithWhereWithoutHorarioInput[]
    deleteMany?: FranjaHorarioScalarWhereInput | FranjaHorarioScalarWhereInput[]
  }

  export type ColaboradorUpdateManyWithoutHorarioNestedInput = {
    create?: XOR<ColaboradorCreateWithoutHorarioInput, ColaboradorUncheckedCreateWithoutHorarioInput> | ColaboradorCreateWithoutHorarioInput[] | ColaboradorUncheckedCreateWithoutHorarioInput[]
    connectOrCreate?: ColaboradorCreateOrConnectWithoutHorarioInput | ColaboradorCreateOrConnectWithoutHorarioInput[]
    upsert?: ColaboradorUpsertWithWhereUniqueWithoutHorarioInput | ColaboradorUpsertWithWhereUniqueWithoutHorarioInput[]
    createMany?: ColaboradorCreateManyHorarioInputEnvelope
    set?: ColaboradorWhereUniqueInput | ColaboradorWhereUniqueInput[]
    disconnect?: ColaboradorWhereUniqueInput | ColaboradorWhereUniqueInput[]
    delete?: ColaboradorWhereUniqueInput | ColaboradorWhereUniqueInput[]
    connect?: ColaboradorWhereUniqueInput | ColaboradorWhereUniqueInput[]
    update?: ColaboradorUpdateWithWhereUniqueWithoutHorarioInput | ColaboradorUpdateWithWhereUniqueWithoutHorarioInput[]
    updateMany?: ColaboradorUpdateManyWithWhereWithoutHorarioInput | ColaboradorUpdateManyWithWhereWithoutHorarioInput[]
    deleteMany?: ColaboradorScalarWhereInput | ColaboradorScalarWhereInput[]
  }

  export type FranjaHorarioUncheckedUpdateManyWithoutHorarioNestedInput = {
    create?: XOR<FranjaHorarioCreateWithoutHorarioInput, FranjaHorarioUncheckedCreateWithoutHorarioInput> | FranjaHorarioCreateWithoutHorarioInput[] | FranjaHorarioUncheckedCreateWithoutHorarioInput[]
    connectOrCreate?: FranjaHorarioCreateOrConnectWithoutHorarioInput | FranjaHorarioCreateOrConnectWithoutHorarioInput[]
    upsert?: FranjaHorarioUpsertWithWhereUniqueWithoutHorarioInput | FranjaHorarioUpsertWithWhereUniqueWithoutHorarioInput[]
    createMany?: FranjaHorarioCreateManyHorarioInputEnvelope
    set?: FranjaHorarioWhereUniqueInput | FranjaHorarioWhereUniqueInput[]
    disconnect?: FranjaHorarioWhereUniqueInput | FranjaHorarioWhereUniqueInput[]
    delete?: FranjaHorarioWhereUniqueInput | FranjaHorarioWhereUniqueInput[]
    connect?: FranjaHorarioWhereUniqueInput | FranjaHorarioWhereUniqueInput[]
    update?: FranjaHorarioUpdateWithWhereUniqueWithoutHorarioInput | FranjaHorarioUpdateWithWhereUniqueWithoutHorarioInput[]
    updateMany?: FranjaHorarioUpdateManyWithWhereWithoutHorarioInput | FranjaHorarioUpdateManyWithWhereWithoutHorarioInput[]
    deleteMany?: FranjaHorarioScalarWhereInput | FranjaHorarioScalarWhereInput[]
  }

  export type ColaboradorUncheckedUpdateManyWithoutHorarioNestedInput = {
    create?: XOR<ColaboradorCreateWithoutHorarioInput, ColaboradorUncheckedCreateWithoutHorarioInput> | ColaboradorCreateWithoutHorarioInput[] | ColaboradorUncheckedCreateWithoutHorarioInput[]
    connectOrCreate?: ColaboradorCreateOrConnectWithoutHorarioInput | ColaboradorCreateOrConnectWithoutHorarioInput[]
    upsert?: ColaboradorUpsertWithWhereUniqueWithoutHorarioInput | ColaboradorUpsertWithWhereUniqueWithoutHorarioInput[]
    createMany?: ColaboradorCreateManyHorarioInputEnvelope
    set?: ColaboradorWhereUniqueInput | ColaboradorWhereUniqueInput[]
    disconnect?: ColaboradorWhereUniqueInput | ColaboradorWhereUniqueInput[]
    delete?: ColaboradorWhereUniqueInput | ColaboradorWhereUniqueInput[]
    connect?: ColaboradorWhereUniqueInput | ColaboradorWhereUniqueInput[]
    update?: ColaboradorUpdateWithWhereUniqueWithoutHorarioInput | ColaboradorUpdateWithWhereUniqueWithoutHorarioInput[]
    updateMany?: ColaboradorUpdateManyWithWhereWithoutHorarioInput | ColaboradorUpdateManyWithWhereWithoutHorarioInput[]
    deleteMany?: ColaboradorScalarWhereInput | ColaboradorScalarWhereInput[]
  }

  export type HorarioCreateNestedOneWithoutFranjasInput = {
    create?: XOR<HorarioCreateWithoutFranjasInput, HorarioUncheckedCreateWithoutFranjasInput>
    connectOrCreate?: HorarioCreateOrConnectWithoutFranjasInput
    connect?: HorarioWhereUniqueInput
  }

  export type HorarioUpdateOneRequiredWithoutFranjasNestedInput = {
    create?: XOR<HorarioCreateWithoutFranjasInput, HorarioUncheckedCreateWithoutFranjasInput>
    connectOrCreate?: HorarioCreateOrConnectWithoutFranjasInput
    upsert?: HorarioUpsertWithoutFranjasInput
    connect?: HorarioWhereUniqueInput
    update?: XOR<XOR<HorarioUpdateToOneWithWhereWithoutFranjasInput, HorarioUpdateWithoutFranjasInput>, HorarioUncheckedUpdateWithoutFranjasInput>
  }

  export type EmpresaCreateNestedOneWithoutDispositivosInput = {
    create?: XOR<EmpresaCreateWithoutDispositivosInput, EmpresaUncheckedCreateWithoutDispositivosInput>
    connectOrCreate?: EmpresaCreateOrConnectWithoutDispositivosInput
    connect?: EmpresaWhereUniqueInput
  }

  export type EmpresaUpdateOneRequiredWithoutDispositivosNestedInput = {
    create?: XOR<EmpresaCreateWithoutDispositivosInput, EmpresaUncheckedCreateWithoutDispositivosInput>
    connectOrCreate?: EmpresaCreateOrConnectWithoutDispositivosInput
    upsert?: EmpresaUpsertWithoutDispositivosInput
    connect?: EmpresaWhereUniqueInput
    update?: XOR<XOR<EmpresaUpdateToOneWithWhereWithoutDispositivosInput, EmpresaUpdateWithoutDispositivosInput>, EmpresaUncheckedUpdateWithoutDispositivosInput>
  }

  export type EmpresaCreateNestedOneWithoutColaboradoresInput = {
    create?: XOR<EmpresaCreateWithoutColaboradoresInput, EmpresaUncheckedCreateWithoutColaboradoresInput>
    connectOrCreate?: EmpresaCreateOrConnectWithoutColaboradoresInput
    connect?: EmpresaWhereUniqueInput
  }

  export type HorarioCreateNestedOneWithoutColaboradoresInput = {
    create?: XOR<HorarioCreateWithoutColaboradoresInput, HorarioUncheckedCreateWithoutColaboradoresInput>
    connectOrCreate?: HorarioCreateOrConnectWithoutColaboradoresInput
    connect?: HorarioWhereUniqueInput
  }

  export type RegistroCreateNestedManyWithoutColaboradorInput = {
    create?: XOR<RegistroCreateWithoutColaboradorInput, RegistroUncheckedCreateWithoutColaboradorInput> | RegistroCreateWithoutColaboradorInput[] | RegistroUncheckedCreateWithoutColaboradorInput[]
    connectOrCreate?: RegistroCreateOrConnectWithoutColaboradorInput | RegistroCreateOrConnectWithoutColaboradorInput[]
    createMany?: RegistroCreateManyColaboradorInputEnvelope
    connect?: RegistroWhereUniqueInput | RegistroWhereUniqueInput[]
  }

  export type PermisoCreateNestedManyWithoutColaboradorInput = {
    create?: XOR<PermisoCreateWithoutColaboradorInput, PermisoUncheckedCreateWithoutColaboradorInput> | PermisoCreateWithoutColaboradorInput[] | PermisoUncheckedCreateWithoutColaboradorInput[]
    connectOrCreate?: PermisoCreateOrConnectWithoutColaboradorInput | PermisoCreateOrConnectWithoutColaboradorInput[]
    createMany?: PermisoCreateManyColaboradorInputEnvelope
    connect?: PermisoWhereUniqueInput | PermisoWhereUniqueInput[]
  }

  export type RegistroUncheckedCreateNestedManyWithoutColaboradorInput = {
    create?: XOR<RegistroCreateWithoutColaboradorInput, RegistroUncheckedCreateWithoutColaboradorInput> | RegistroCreateWithoutColaboradorInput[] | RegistroUncheckedCreateWithoutColaboradorInput[]
    connectOrCreate?: RegistroCreateOrConnectWithoutColaboradorInput | RegistroCreateOrConnectWithoutColaboradorInput[]
    createMany?: RegistroCreateManyColaboradorInputEnvelope
    connect?: RegistroWhereUniqueInput | RegistroWhereUniqueInput[]
  }

  export type PermisoUncheckedCreateNestedManyWithoutColaboradorInput = {
    create?: XOR<PermisoCreateWithoutColaboradorInput, PermisoUncheckedCreateWithoutColaboradorInput> | PermisoCreateWithoutColaboradorInput[] | PermisoUncheckedCreateWithoutColaboradorInput[]
    connectOrCreate?: PermisoCreateOrConnectWithoutColaboradorInput | PermisoCreateOrConnectWithoutColaboradorInput[]
    createMany?: PermisoCreateManyColaboradorInputEnvelope
    connect?: PermisoWhereUniqueInput | PermisoWhereUniqueInput[]
  }

  export type EmpresaUpdateOneRequiredWithoutColaboradoresNestedInput = {
    create?: XOR<EmpresaCreateWithoutColaboradoresInput, EmpresaUncheckedCreateWithoutColaboradoresInput>
    connectOrCreate?: EmpresaCreateOrConnectWithoutColaboradoresInput
    upsert?: EmpresaUpsertWithoutColaboradoresInput
    connect?: EmpresaWhereUniqueInput
    update?: XOR<XOR<EmpresaUpdateToOneWithWhereWithoutColaboradoresInput, EmpresaUpdateWithoutColaboradoresInput>, EmpresaUncheckedUpdateWithoutColaboradoresInput>
  }

  export type HorarioUpdateOneWithoutColaboradoresNestedInput = {
    create?: XOR<HorarioCreateWithoutColaboradoresInput, HorarioUncheckedCreateWithoutColaboradoresInput>
    connectOrCreate?: HorarioCreateOrConnectWithoutColaboradoresInput
    upsert?: HorarioUpsertWithoutColaboradoresInput
    disconnect?: HorarioWhereInput | boolean
    delete?: HorarioWhereInput | boolean
    connect?: HorarioWhereUniqueInput
    update?: XOR<XOR<HorarioUpdateToOneWithWhereWithoutColaboradoresInput, HorarioUpdateWithoutColaboradoresInput>, HorarioUncheckedUpdateWithoutColaboradoresInput>
  }

  export type RegistroUpdateManyWithoutColaboradorNestedInput = {
    create?: XOR<RegistroCreateWithoutColaboradorInput, RegistroUncheckedCreateWithoutColaboradorInput> | RegistroCreateWithoutColaboradorInput[] | RegistroUncheckedCreateWithoutColaboradorInput[]
    connectOrCreate?: RegistroCreateOrConnectWithoutColaboradorInput | RegistroCreateOrConnectWithoutColaboradorInput[]
    upsert?: RegistroUpsertWithWhereUniqueWithoutColaboradorInput | RegistroUpsertWithWhereUniqueWithoutColaboradorInput[]
    createMany?: RegistroCreateManyColaboradorInputEnvelope
    set?: RegistroWhereUniqueInput | RegistroWhereUniqueInput[]
    disconnect?: RegistroWhereUniqueInput | RegistroWhereUniqueInput[]
    delete?: RegistroWhereUniqueInput | RegistroWhereUniqueInput[]
    connect?: RegistroWhereUniqueInput | RegistroWhereUniqueInput[]
    update?: RegistroUpdateWithWhereUniqueWithoutColaboradorInput | RegistroUpdateWithWhereUniqueWithoutColaboradorInput[]
    updateMany?: RegistroUpdateManyWithWhereWithoutColaboradorInput | RegistroUpdateManyWithWhereWithoutColaboradorInput[]
    deleteMany?: RegistroScalarWhereInput | RegistroScalarWhereInput[]
  }

  export type PermisoUpdateManyWithoutColaboradorNestedInput = {
    create?: XOR<PermisoCreateWithoutColaboradorInput, PermisoUncheckedCreateWithoutColaboradorInput> | PermisoCreateWithoutColaboradorInput[] | PermisoUncheckedCreateWithoutColaboradorInput[]
    connectOrCreate?: PermisoCreateOrConnectWithoutColaboradorInput | PermisoCreateOrConnectWithoutColaboradorInput[]
    upsert?: PermisoUpsertWithWhereUniqueWithoutColaboradorInput | PermisoUpsertWithWhereUniqueWithoutColaboradorInput[]
    createMany?: PermisoCreateManyColaboradorInputEnvelope
    set?: PermisoWhereUniqueInput | PermisoWhereUniqueInput[]
    disconnect?: PermisoWhereUniqueInput | PermisoWhereUniqueInput[]
    delete?: PermisoWhereUniqueInput | PermisoWhereUniqueInput[]
    connect?: PermisoWhereUniqueInput | PermisoWhereUniqueInput[]
    update?: PermisoUpdateWithWhereUniqueWithoutColaboradorInput | PermisoUpdateWithWhereUniqueWithoutColaboradorInput[]
    updateMany?: PermisoUpdateManyWithWhereWithoutColaboradorInput | PermisoUpdateManyWithWhereWithoutColaboradorInput[]
    deleteMany?: PermisoScalarWhereInput | PermisoScalarWhereInput[]
  }

  export type RegistroUncheckedUpdateManyWithoutColaboradorNestedInput = {
    create?: XOR<RegistroCreateWithoutColaboradorInput, RegistroUncheckedCreateWithoutColaboradorInput> | RegistroCreateWithoutColaboradorInput[] | RegistroUncheckedCreateWithoutColaboradorInput[]
    connectOrCreate?: RegistroCreateOrConnectWithoutColaboradorInput | RegistroCreateOrConnectWithoutColaboradorInput[]
    upsert?: RegistroUpsertWithWhereUniqueWithoutColaboradorInput | RegistroUpsertWithWhereUniqueWithoutColaboradorInput[]
    createMany?: RegistroCreateManyColaboradorInputEnvelope
    set?: RegistroWhereUniqueInput | RegistroWhereUniqueInput[]
    disconnect?: RegistroWhereUniqueInput | RegistroWhereUniqueInput[]
    delete?: RegistroWhereUniqueInput | RegistroWhereUniqueInput[]
    connect?: RegistroWhereUniqueInput | RegistroWhereUniqueInput[]
    update?: RegistroUpdateWithWhereUniqueWithoutColaboradorInput | RegistroUpdateWithWhereUniqueWithoutColaboradorInput[]
    updateMany?: RegistroUpdateManyWithWhereWithoutColaboradorInput | RegistroUpdateManyWithWhereWithoutColaboradorInput[]
    deleteMany?: RegistroScalarWhereInput | RegistroScalarWhereInput[]
  }

  export type PermisoUncheckedUpdateManyWithoutColaboradorNestedInput = {
    create?: XOR<PermisoCreateWithoutColaboradorInput, PermisoUncheckedCreateWithoutColaboradorInput> | PermisoCreateWithoutColaboradorInput[] | PermisoUncheckedCreateWithoutColaboradorInput[]
    connectOrCreate?: PermisoCreateOrConnectWithoutColaboradorInput | PermisoCreateOrConnectWithoutColaboradorInput[]
    upsert?: PermisoUpsertWithWhereUniqueWithoutColaboradorInput | PermisoUpsertWithWhereUniqueWithoutColaboradorInput[]
    createMany?: PermisoCreateManyColaboradorInputEnvelope
    set?: PermisoWhereUniqueInput | PermisoWhereUniqueInput[]
    disconnect?: PermisoWhereUniqueInput | PermisoWhereUniqueInput[]
    delete?: PermisoWhereUniqueInput | PermisoWhereUniqueInput[]
    connect?: PermisoWhereUniqueInput | PermisoWhereUniqueInput[]
    update?: PermisoUpdateWithWhereUniqueWithoutColaboradorInput | PermisoUpdateWithWhereUniqueWithoutColaboradorInput[]
    updateMany?: PermisoUpdateManyWithWhereWithoutColaboradorInput | PermisoUpdateManyWithWhereWithoutColaboradorInput[]
    deleteMany?: PermisoScalarWhereInput | PermisoScalarWhereInput[]
  }

  export type ColaboradorCreateNestedOneWithoutRegistrosInput = {
    create?: XOR<ColaboradorCreateWithoutRegistrosInput, ColaboradorUncheckedCreateWithoutRegistrosInput>
    connectOrCreate?: ColaboradorCreateOrConnectWithoutRegistrosInput
    connect?: ColaboradorWhereUniqueInput
  }

  export type EnumTipoRegistroFieldUpdateOperationsInput = {
    set?: $Enums.TipoRegistro
  }

  export type ColaboradorUpdateOneRequiredWithoutRegistrosNestedInput = {
    create?: XOR<ColaboradorCreateWithoutRegistrosInput, ColaboradorUncheckedCreateWithoutRegistrosInput>
    connectOrCreate?: ColaboradorCreateOrConnectWithoutRegistrosInput
    upsert?: ColaboradorUpsertWithoutRegistrosInput
    connect?: ColaboradorWhereUniqueInput
    update?: XOR<XOR<ColaboradorUpdateToOneWithWhereWithoutRegistrosInput, ColaboradorUpdateWithoutRegistrosInput>, ColaboradorUncheckedUpdateWithoutRegistrosInput>
  }

  export type ColaboradorCreateNestedOneWithoutPermisosInput = {
    create?: XOR<ColaboradorCreateWithoutPermisosInput, ColaboradorUncheckedCreateWithoutPermisosInput>
    connectOrCreate?: ColaboradorCreateOrConnectWithoutPermisosInput
    connect?: ColaboradorWhereUniqueInput
  }

  export type EnumTipoPermisoFieldUpdateOperationsInput = {
    set?: $Enums.TipoPermiso
  }

  export type ColaboradorUpdateOneRequiredWithoutPermisosNestedInput = {
    create?: XOR<ColaboradorCreateWithoutPermisosInput, ColaboradorUncheckedCreateWithoutPermisosInput>
    connectOrCreate?: ColaboradorCreateOrConnectWithoutPermisosInput
    upsert?: ColaboradorUpsertWithoutPermisosInput
    connect?: ColaboradorWhereUniqueInput
    update?: XOR<XOR<ColaboradorUpdateToOneWithWhereWithoutPermisosInput, ColaboradorUpdateWithoutPermisosInput>, ColaboradorUncheckedUpdateWithoutPermisosInput>
  }

  export type EmpresaCreateNestedOneWithoutFestivosInput = {
    create?: XOR<EmpresaCreateWithoutFestivosInput, EmpresaUncheckedCreateWithoutFestivosInput>
    connectOrCreate?: EmpresaCreateOrConnectWithoutFestivosInput
    connect?: EmpresaWhereUniqueInput
  }

  export type EmpresaUpdateOneWithoutFestivosNestedInput = {
    create?: XOR<EmpresaCreateWithoutFestivosInput, EmpresaUncheckedCreateWithoutFestivosInput>
    connectOrCreate?: EmpresaCreateOrConnectWithoutFestivosInput
    upsert?: EmpresaUpsertWithoutFestivosInput
    disconnect?: EmpresaWhereInput | boolean
    delete?: EmpresaWhereInput | boolean
    connect?: EmpresaWhereUniqueInput
    update?: XOR<XOR<EmpresaUpdateToOneWithWhereWithoutFestivosInput, EmpresaUpdateWithoutFestivosInput>, EmpresaUncheckedUpdateWithoutFestivosInput>
  }

  export type EmpresaCreateNestedOneWithoutConfiguracionInput = {
    create?: XOR<EmpresaCreateWithoutConfiguracionInput, EmpresaUncheckedCreateWithoutConfiguracionInput>
    connectOrCreate?: EmpresaCreateOrConnectWithoutConfiguracionInput
    connect?: EmpresaWhereUniqueInput
  }

  export type EmpresaUpdateOneRequiredWithoutConfiguracionNestedInput = {
    create?: XOR<EmpresaCreateWithoutConfiguracionInput, EmpresaUncheckedCreateWithoutConfiguracionInput>
    connectOrCreate?: EmpresaCreateOrConnectWithoutConfiguracionInput
    upsert?: EmpresaUpsertWithoutConfiguracionInput
    connect?: EmpresaWhereUniqueInput
    update?: XOR<XOR<EmpresaUpdateToOneWithWhereWithoutConfiguracionInput, EmpresaUpdateWithoutConfiguracionInput>, EmpresaUncheckedUpdateWithoutConfiguracionInput>
  }

  export type EmpresaCreateNestedOneWithoutUsuariosInput = {
    create?: XOR<EmpresaCreateWithoutUsuariosInput, EmpresaUncheckedCreateWithoutUsuariosInput>
    connectOrCreate?: EmpresaCreateOrConnectWithoutUsuariosInput
    connect?: EmpresaWhereUniqueInput
  }

  export type EnumRolFieldUpdateOperationsInput = {
    set?: $Enums.Rol
  }

  export type EmpresaUpdateOneWithoutUsuariosNestedInput = {
    create?: XOR<EmpresaCreateWithoutUsuariosInput, EmpresaUncheckedCreateWithoutUsuariosInput>
    connectOrCreate?: EmpresaCreateOrConnectWithoutUsuariosInput
    upsert?: EmpresaUpsertWithoutUsuariosInput
    disconnect?: EmpresaWhereInput | boolean
    delete?: EmpresaWhereInput | boolean
    connect?: EmpresaWhereUniqueInput
    update?: XOR<XOR<EmpresaUpdateToOneWithWhereWithoutUsuariosInput, EmpresaUpdateWithoutUsuariosInput>, EmpresaUncheckedUpdateWithoutUsuariosInput>
  }

  export type NestedStringFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[]
    notIn?: string[]
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringFilter<$PrismaModel> | string
  }

  export type NestedStringNullableFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | null
    notIn?: string[] | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableFilter<$PrismaModel> | string | null
  }

  export type NestedBoolFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolFilter<$PrismaModel> | boolean
  }

  export type NestedDateTimeFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[]
    notIn?: Date[] | string[]
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeFilter<$PrismaModel> | Date | string
  }

  export type NestedStringWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[]
    notIn?: string[]
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type NestedIntFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[]
    notIn?: number[]
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntFilter<$PrismaModel> | number
  }

  export type NestedStringNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | null
    notIn?: string[] | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableWithAggregatesFilter<$PrismaModel> | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedStringNullableFilter<$PrismaModel>
    _max?: NestedStringNullableFilter<$PrismaModel>
  }

  export type NestedIntNullableFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | null
    notIn?: number[] | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableFilter<$PrismaModel> | number | null
  }

  export type NestedBoolWithAggregatesFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolWithAggregatesFilter<$PrismaModel> | boolean
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedBoolFilter<$PrismaModel>
    _max?: NestedBoolFilter<$PrismaModel>
  }

  export type NestedDateTimeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[]
    notIn?: Date[] | string[]
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeWithAggregatesFilter<$PrismaModel> | Date | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedDateTimeFilter<$PrismaModel>
    _max?: NestedDateTimeFilter<$PrismaModel>
  }

  export type NestedEnumEstadoSuscripcionFilter<$PrismaModel = never> = {
    equals?: $Enums.EstadoSuscripcion | EnumEstadoSuscripcionFieldRefInput<$PrismaModel>
    in?: $Enums.EstadoSuscripcion[]
    notIn?: $Enums.EstadoSuscripcion[]
    not?: NestedEnumEstadoSuscripcionFilter<$PrismaModel> | $Enums.EstadoSuscripcion
  }

  export type NestedDateTimeNullableFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | null
    notIn?: Date[] | string[] | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableFilter<$PrismaModel> | Date | string | null
  }

  export type NestedEnumEstadoSuscripcionWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.EstadoSuscripcion | EnumEstadoSuscripcionFieldRefInput<$PrismaModel>
    in?: $Enums.EstadoSuscripcion[]
    notIn?: $Enums.EstadoSuscripcion[]
    not?: NestedEnumEstadoSuscripcionWithAggregatesFilter<$PrismaModel> | $Enums.EstadoSuscripcion
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumEstadoSuscripcionFilter<$PrismaModel>
    _max?: NestedEnumEstadoSuscripcionFilter<$PrismaModel>
  }

  export type NestedDateTimeNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | null
    notIn?: Date[] | string[] | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableWithAggregatesFilter<$PrismaModel> | Date | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedDateTimeNullableFilter<$PrismaModel>
    _max?: NestedDateTimeNullableFilter<$PrismaModel>
  }

  export type NestedFloatFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel>
    in?: number[]
    notIn?: number[]
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatFilter<$PrismaModel> | number
  }

  export type NestedEnumMetodoPagoFilter<$PrismaModel = never> = {
    equals?: $Enums.MetodoPago | EnumMetodoPagoFieldRefInput<$PrismaModel>
    in?: $Enums.MetodoPago[]
    notIn?: $Enums.MetodoPago[]
    not?: NestedEnumMetodoPagoFilter<$PrismaModel> | $Enums.MetodoPago
  }

  export type NestedEnumEstadoPagoFilter<$PrismaModel = never> = {
    equals?: $Enums.EstadoPago | EnumEstadoPagoFieldRefInput<$PrismaModel>
    in?: $Enums.EstadoPago[]
    notIn?: $Enums.EstadoPago[]
    not?: NestedEnumEstadoPagoFilter<$PrismaModel> | $Enums.EstadoPago
  }

  export type NestedFloatWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel>
    in?: number[]
    notIn?: number[]
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedFloatFilter<$PrismaModel>
    _min?: NestedFloatFilter<$PrismaModel>
    _max?: NestedFloatFilter<$PrismaModel>
  }

  export type NestedIntWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[]
    notIn?: number[]
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedIntFilter<$PrismaModel>
    _min?: NestedIntFilter<$PrismaModel>
    _max?: NestedIntFilter<$PrismaModel>
  }

  export type NestedEnumMetodoPagoWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.MetodoPago | EnumMetodoPagoFieldRefInput<$PrismaModel>
    in?: $Enums.MetodoPago[]
    notIn?: $Enums.MetodoPago[]
    not?: NestedEnumMetodoPagoWithAggregatesFilter<$PrismaModel> | $Enums.MetodoPago
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumMetodoPagoFilter<$PrismaModel>
    _max?: NestedEnumMetodoPagoFilter<$PrismaModel>
  }

  export type NestedEnumEstadoPagoWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.EstadoPago | EnumEstadoPagoFieldRefInput<$PrismaModel>
    in?: $Enums.EstadoPago[]
    notIn?: $Enums.EstadoPago[]
    not?: NestedEnumEstadoPagoWithAggregatesFilter<$PrismaModel> | $Enums.EstadoPago
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumEstadoPagoFilter<$PrismaModel>
    _max?: NestedEnumEstadoPagoFilter<$PrismaModel>
  }
  export type NestedJsonFilter<$PrismaModel = never> = 
    | PatchUndefined<
        Either<Required<NestedJsonFilterBase<$PrismaModel>>, Exclude<keyof Required<NestedJsonFilterBase<$PrismaModel>>, 'path'>>,
        Required<NestedJsonFilterBase<$PrismaModel>>
      >
    | OptionalFlat<Omit<Required<NestedJsonFilterBase<$PrismaModel>>, 'path'>>

  export type NestedJsonFilterBase<$PrismaModel = never> = {
    equals?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    path?: string
    string_contains?: string | StringFieldRefInput<$PrismaModel>
    string_starts_with?: string | StringFieldRefInput<$PrismaModel>
    string_ends_with?: string | StringFieldRefInput<$PrismaModel>
    array_contains?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_starts_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_ends_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    lt?: InputJsonValue
    lte?: InputJsonValue
    gt?: InputJsonValue
    gte?: InputJsonValue
    not?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
  }
  export type NestedJsonNullableFilter<$PrismaModel = never> = 
    | PatchUndefined<
        Either<Required<NestedJsonNullableFilterBase<$PrismaModel>>, Exclude<keyof Required<NestedJsonNullableFilterBase<$PrismaModel>>, 'path'>>,
        Required<NestedJsonNullableFilterBase<$PrismaModel>>
      >
    | OptionalFlat<Omit<Required<NestedJsonNullableFilterBase<$PrismaModel>>, 'path'>>

  export type NestedJsonNullableFilterBase<$PrismaModel = never> = {
    equals?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    path?: string
    string_contains?: string | StringFieldRefInput<$PrismaModel>
    string_starts_with?: string | StringFieldRefInput<$PrismaModel>
    string_ends_with?: string | StringFieldRefInput<$PrismaModel>
    array_contains?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_starts_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_ends_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    lt?: InputJsonValue
    lte?: InputJsonValue
    gt?: InputJsonValue
    gte?: InputJsonValue
    not?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
  }

  export type NestedEnumTipoRegistroFilter<$PrismaModel = never> = {
    equals?: $Enums.TipoRegistro | EnumTipoRegistroFieldRefInput<$PrismaModel>
    in?: $Enums.TipoRegistro[]
    notIn?: $Enums.TipoRegistro[]
    not?: NestedEnumTipoRegistroFilter<$PrismaModel> | $Enums.TipoRegistro
  }

  export type NestedEnumTipoRegistroWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.TipoRegistro | EnumTipoRegistroFieldRefInput<$PrismaModel>
    in?: $Enums.TipoRegistro[]
    notIn?: $Enums.TipoRegistro[]
    not?: NestedEnumTipoRegistroWithAggregatesFilter<$PrismaModel> | $Enums.TipoRegistro
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumTipoRegistroFilter<$PrismaModel>
    _max?: NestedEnumTipoRegistroFilter<$PrismaModel>
  }

  export type NestedEnumTipoPermisoFilter<$PrismaModel = never> = {
    equals?: $Enums.TipoPermiso | EnumTipoPermisoFieldRefInput<$PrismaModel>
    in?: $Enums.TipoPermiso[]
    notIn?: $Enums.TipoPermiso[]
    not?: NestedEnumTipoPermisoFilter<$PrismaModel> | $Enums.TipoPermiso
  }

  export type NestedEnumTipoPermisoWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.TipoPermiso | EnumTipoPermisoFieldRefInput<$PrismaModel>
    in?: $Enums.TipoPermiso[]
    notIn?: $Enums.TipoPermiso[]
    not?: NestedEnumTipoPermisoWithAggregatesFilter<$PrismaModel> | $Enums.TipoPermiso
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumTipoPermisoFilter<$PrismaModel>
    _max?: NestedEnumTipoPermisoFilter<$PrismaModel>
  }

  export type NestedEnumRolFilter<$PrismaModel = never> = {
    equals?: $Enums.Rol | EnumRolFieldRefInput<$PrismaModel>
    in?: $Enums.Rol[]
    notIn?: $Enums.Rol[]
    not?: NestedEnumRolFilter<$PrismaModel> | $Enums.Rol
  }

  export type NestedEnumRolWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.Rol | EnumRolFieldRefInput<$PrismaModel>
    in?: $Enums.Rol[]
    notIn?: $Enums.Rol[]
    not?: NestedEnumRolWithAggregatesFilter<$PrismaModel> | $Enums.Rol
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumRolFilter<$PrismaModel>
    _max?: NestedEnumRolFilter<$PrismaModel>
  }

  export type UsuarioCreateWithoutEmpresaInput = {
    id?: string
    email: string
    password: string
    nombre: string
    rol?: $Enums.Rol
    activo?: boolean
    resetToken?: string | null
    resetExpira?: Date | string | null
    emailVerificado?: boolean
    verificacionCodigo?: string | null
    verificacionExpira?: Date | string | null
    creadoEn?: Date | string
  }

  export type UsuarioUncheckedCreateWithoutEmpresaInput = {
    id?: string
    email: string
    password: string
    nombre: string
    rol?: $Enums.Rol
    activo?: boolean
    resetToken?: string | null
    resetExpira?: Date | string | null
    emailVerificado?: boolean
    verificacionCodigo?: string | null
    verificacionExpira?: Date | string | null
    creadoEn?: Date | string
  }

  export type UsuarioCreateOrConnectWithoutEmpresaInput = {
    where: UsuarioWhereUniqueInput
    create: XOR<UsuarioCreateWithoutEmpresaInput, UsuarioUncheckedCreateWithoutEmpresaInput>
  }

  export type UsuarioCreateManyEmpresaInputEnvelope = {
    data: UsuarioCreateManyEmpresaInput | UsuarioCreateManyEmpresaInput[]
    skipDuplicates?: boolean
  }

  export type ColaboradorCreateWithoutEmpresaInput = {
    id?: string
    nombre: string
    apellido: string
    cedula: string
    cargo?: string | null
    email?: string | null
    telefono?: string | null
    fechaNacimiento?: Date | string | null
    salarioMensual: number
    rostroDescriptor?: NullableJsonNullValueInput | InputJsonValue
    rostroEnroladoEn?: Date | string | null
    activo?: boolean
    retiroProgramado?: Date | string | null
    creadoEn?: Date | string
    actualizadoEn?: Date | string
    horario?: HorarioCreateNestedOneWithoutColaboradoresInput
    registros?: RegistroCreateNestedManyWithoutColaboradorInput
    permisos?: PermisoCreateNestedManyWithoutColaboradorInput
  }

  export type ColaboradorUncheckedCreateWithoutEmpresaInput = {
    id?: string
    nombre: string
    apellido: string
    cedula: string
    cargo?: string | null
    email?: string | null
    telefono?: string | null
    fechaNacimiento?: Date | string | null
    salarioMensual: number
    rostroDescriptor?: NullableJsonNullValueInput | InputJsonValue
    rostroEnroladoEn?: Date | string | null
    horarioId?: string | null
    activo?: boolean
    retiroProgramado?: Date | string | null
    creadoEn?: Date | string
    actualizadoEn?: Date | string
    registros?: RegistroUncheckedCreateNestedManyWithoutColaboradorInput
    permisos?: PermisoUncheckedCreateNestedManyWithoutColaboradorInput
  }

  export type ColaboradorCreateOrConnectWithoutEmpresaInput = {
    where: ColaboradorWhereUniqueInput
    create: XOR<ColaboradorCreateWithoutEmpresaInput, ColaboradorUncheckedCreateWithoutEmpresaInput>
  }

  export type ColaboradorCreateManyEmpresaInputEnvelope = {
    data: ColaboradorCreateManyEmpresaInput | ColaboradorCreateManyEmpresaInput[]
    skipDuplicates?: boolean
  }

  export type DiaFestivoCreateWithoutEmpresaInput = {
    id?: string
    fecha: Date | string
    nombre: string
    creadoEn?: Date | string
  }

  export type DiaFestivoUncheckedCreateWithoutEmpresaInput = {
    id?: string
    fecha: Date | string
    nombre: string
    creadoEn?: Date | string
  }

  export type DiaFestivoCreateOrConnectWithoutEmpresaInput = {
    where: DiaFestivoWhereUniqueInput
    create: XOR<DiaFestivoCreateWithoutEmpresaInput, DiaFestivoUncheckedCreateWithoutEmpresaInput>
  }

  export type DiaFestivoCreateManyEmpresaInputEnvelope = {
    data: DiaFestivoCreateManyEmpresaInput | DiaFestivoCreateManyEmpresaInput[]
    skipDuplicates?: boolean
  }

  export type ConfiguracionCreateWithoutEmpresaInput = {
    id?: string
    clave: string
    valor: string
  }

  export type ConfiguracionUncheckedCreateWithoutEmpresaInput = {
    id?: string
    clave: string
    valor: string
  }

  export type ConfiguracionCreateOrConnectWithoutEmpresaInput = {
    where: ConfiguracionWhereUniqueInput
    create: XOR<ConfiguracionCreateWithoutEmpresaInput, ConfiguracionUncheckedCreateWithoutEmpresaInput>
  }

  export type ConfiguracionCreateManyEmpresaInputEnvelope = {
    data: ConfiguracionCreateManyEmpresaInput | ConfiguracionCreateManyEmpresaInput[]
    skipDuplicates?: boolean
  }

  export type SuscripcionCreateWithoutEmpresaInput = {
    id?: string
    estado?: $Enums.EstadoSuscripcion
    finPrueba: Date | string
    pagadoHasta?: Date | string | null
    suspendidaEn?: Date | string | null
    wompiFuentePagoId?: string | null
    creadoEn?: Date | string
    actualizadoEn?: Date | string
    pagos?: PagoCreateNestedManyWithoutSuscripcionInput
  }

  export type SuscripcionUncheckedCreateWithoutEmpresaInput = {
    id?: string
    estado?: $Enums.EstadoSuscripcion
    finPrueba: Date | string
    pagadoHasta?: Date | string | null
    suspendidaEn?: Date | string | null
    wompiFuentePagoId?: string | null
    creadoEn?: Date | string
    actualizadoEn?: Date | string
    pagos?: PagoUncheckedCreateNestedManyWithoutSuscripcionInput
  }

  export type SuscripcionCreateOrConnectWithoutEmpresaInput = {
    where: SuscripcionWhereUniqueInput
    create: XOR<SuscripcionCreateWithoutEmpresaInput, SuscripcionUncheckedCreateWithoutEmpresaInput>
  }

  export type HorarioCreateWithoutEmpresaInput = {
    id?: string
    nombre: string
    toleranciaMin?: number
    activo?: boolean
    creadoEn?: Date | string
    franjas?: FranjaHorarioCreateNestedManyWithoutHorarioInput
    colaboradores?: ColaboradorCreateNestedManyWithoutHorarioInput
  }

  export type HorarioUncheckedCreateWithoutEmpresaInput = {
    id?: string
    nombre: string
    toleranciaMin?: number
    activo?: boolean
    creadoEn?: Date | string
    franjas?: FranjaHorarioUncheckedCreateNestedManyWithoutHorarioInput
    colaboradores?: ColaboradorUncheckedCreateNestedManyWithoutHorarioInput
  }

  export type HorarioCreateOrConnectWithoutEmpresaInput = {
    where: HorarioWhereUniqueInput
    create: XOR<HorarioCreateWithoutEmpresaInput, HorarioUncheckedCreateWithoutEmpresaInput>
  }

  export type HorarioCreateManyEmpresaInputEnvelope = {
    data: HorarioCreateManyEmpresaInput | HorarioCreateManyEmpresaInput[]
    skipDuplicates?: boolean
  }

  export type DispositivoKioscoCreateWithoutEmpresaInput = {
    id?: string
    nombre: string
    token: string
    creadoEn?: Date | string
    ultimoUso?: Date | string | null
  }

  export type DispositivoKioscoUncheckedCreateWithoutEmpresaInput = {
    id?: string
    nombre: string
    token: string
    creadoEn?: Date | string
    ultimoUso?: Date | string | null
  }

  export type DispositivoKioscoCreateOrConnectWithoutEmpresaInput = {
    where: DispositivoKioscoWhereUniqueInput
    create: XOR<DispositivoKioscoCreateWithoutEmpresaInput, DispositivoKioscoUncheckedCreateWithoutEmpresaInput>
  }

  export type DispositivoKioscoCreateManyEmpresaInputEnvelope = {
    data: DispositivoKioscoCreateManyEmpresaInput | DispositivoKioscoCreateManyEmpresaInput[]
    skipDuplicates?: boolean
  }

  export type UsuarioUpsertWithWhereUniqueWithoutEmpresaInput = {
    where: UsuarioWhereUniqueInput
    update: XOR<UsuarioUpdateWithoutEmpresaInput, UsuarioUncheckedUpdateWithoutEmpresaInput>
    create: XOR<UsuarioCreateWithoutEmpresaInput, UsuarioUncheckedCreateWithoutEmpresaInput>
  }

  export type UsuarioUpdateWithWhereUniqueWithoutEmpresaInput = {
    where: UsuarioWhereUniqueInput
    data: XOR<UsuarioUpdateWithoutEmpresaInput, UsuarioUncheckedUpdateWithoutEmpresaInput>
  }

  export type UsuarioUpdateManyWithWhereWithoutEmpresaInput = {
    where: UsuarioScalarWhereInput
    data: XOR<UsuarioUpdateManyMutationInput, UsuarioUncheckedUpdateManyWithoutEmpresaInput>
  }

  export type UsuarioScalarWhereInput = {
    AND?: UsuarioScalarWhereInput | UsuarioScalarWhereInput[]
    OR?: UsuarioScalarWhereInput[]
    NOT?: UsuarioScalarWhereInput | UsuarioScalarWhereInput[]
    id?: StringFilter<"Usuario"> | string
    empresaId?: StringNullableFilter<"Usuario"> | string | null
    email?: StringFilter<"Usuario"> | string
    password?: StringFilter<"Usuario"> | string
    nombre?: StringFilter<"Usuario"> | string
    rol?: EnumRolFilter<"Usuario"> | $Enums.Rol
    activo?: BoolFilter<"Usuario"> | boolean
    resetToken?: StringNullableFilter<"Usuario"> | string | null
    resetExpira?: DateTimeNullableFilter<"Usuario"> | Date | string | null
    emailVerificado?: BoolFilter<"Usuario"> | boolean
    verificacionCodigo?: StringNullableFilter<"Usuario"> | string | null
    verificacionExpira?: DateTimeNullableFilter<"Usuario"> | Date | string | null
    creadoEn?: DateTimeFilter<"Usuario"> | Date | string
  }

  export type ColaboradorUpsertWithWhereUniqueWithoutEmpresaInput = {
    where: ColaboradorWhereUniqueInput
    update: XOR<ColaboradorUpdateWithoutEmpresaInput, ColaboradorUncheckedUpdateWithoutEmpresaInput>
    create: XOR<ColaboradorCreateWithoutEmpresaInput, ColaboradorUncheckedCreateWithoutEmpresaInput>
  }

  export type ColaboradorUpdateWithWhereUniqueWithoutEmpresaInput = {
    where: ColaboradorWhereUniqueInput
    data: XOR<ColaboradorUpdateWithoutEmpresaInput, ColaboradorUncheckedUpdateWithoutEmpresaInput>
  }

  export type ColaboradorUpdateManyWithWhereWithoutEmpresaInput = {
    where: ColaboradorScalarWhereInput
    data: XOR<ColaboradorUpdateManyMutationInput, ColaboradorUncheckedUpdateManyWithoutEmpresaInput>
  }

  export type ColaboradorScalarWhereInput = {
    AND?: ColaboradorScalarWhereInput | ColaboradorScalarWhereInput[]
    OR?: ColaboradorScalarWhereInput[]
    NOT?: ColaboradorScalarWhereInput | ColaboradorScalarWhereInput[]
    id?: StringFilter<"Colaborador"> | string
    empresaId?: StringFilter<"Colaborador"> | string
    nombre?: StringFilter<"Colaborador"> | string
    apellido?: StringFilter<"Colaborador"> | string
    cedula?: StringFilter<"Colaborador"> | string
    cargo?: StringNullableFilter<"Colaborador"> | string | null
    email?: StringNullableFilter<"Colaborador"> | string | null
    telefono?: StringNullableFilter<"Colaborador"> | string | null
    fechaNacimiento?: DateTimeNullableFilter<"Colaborador"> | Date | string | null
    salarioMensual?: FloatFilter<"Colaborador"> | number
    rostroDescriptor?: JsonNullableFilter<"Colaborador">
    rostroEnroladoEn?: DateTimeNullableFilter<"Colaborador"> | Date | string | null
    horarioId?: StringNullableFilter<"Colaborador"> | string | null
    activo?: BoolFilter<"Colaborador"> | boolean
    retiroProgramado?: DateTimeNullableFilter<"Colaborador"> | Date | string | null
    creadoEn?: DateTimeFilter<"Colaborador"> | Date | string
    actualizadoEn?: DateTimeFilter<"Colaborador"> | Date | string
  }

  export type DiaFestivoUpsertWithWhereUniqueWithoutEmpresaInput = {
    where: DiaFestivoWhereUniqueInput
    update: XOR<DiaFestivoUpdateWithoutEmpresaInput, DiaFestivoUncheckedUpdateWithoutEmpresaInput>
    create: XOR<DiaFestivoCreateWithoutEmpresaInput, DiaFestivoUncheckedCreateWithoutEmpresaInput>
  }

  export type DiaFestivoUpdateWithWhereUniqueWithoutEmpresaInput = {
    where: DiaFestivoWhereUniqueInput
    data: XOR<DiaFestivoUpdateWithoutEmpresaInput, DiaFestivoUncheckedUpdateWithoutEmpresaInput>
  }

  export type DiaFestivoUpdateManyWithWhereWithoutEmpresaInput = {
    where: DiaFestivoScalarWhereInput
    data: XOR<DiaFestivoUpdateManyMutationInput, DiaFestivoUncheckedUpdateManyWithoutEmpresaInput>
  }

  export type DiaFestivoScalarWhereInput = {
    AND?: DiaFestivoScalarWhereInput | DiaFestivoScalarWhereInput[]
    OR?: DiaFestivoScalarWhereInput[]
    NOT?: DiaFestivoScalarWhereInput | DiaFestivoScalarWhereInput[]
    id?: StringFilter<"DiaFestivo"> | string
    empresaId?: StringNullableFilter<"DiaFestivo"> | string | null
    fecha?: DateTimeFilter<"DiaFestivo"> | Date | string
    nombre?: StringFilter<"DiaFestivo"> | string
    creadoEn?: DateTimeFilter<"DiaFestivo"> | Date | string
  }

  export type ConfiguracionUpsertWithWhereUniqueWithoutEmpresaInput = {
    where: ConfiguracionWhereUniqueInput
    update: XOR<ConfiguracionUpdateWithoutEmpresaInput, ConfiguracionUncheckedUpdateWithoutEmpresaInput>
    create: XOR<ConfiguracionCreateWithoutEmpresaInput, ConfiguracionUncheckedCreateWithoutEmpresaInput>
  }

  export type ConfiguracionUpdateWithWhereUniqueWithoutEmpresaInput = {
    where: ConfiguracionWhereUniqueInput
    data: XOR<ConfiguracionUpdateWithoutEmpresaInput, ConfiguracionUncheckedUpdateWithoutEmpresaInput>
  }

  export type ConfiguracionUpdateManyWithWhereWithoutEmpresaInput = {
    where: ConfiguracionScalarWhereInput
    data: XOR<ConfiguracionUpdateManyMutationInput, ConfiguracionUncheckedUpdateManyWithoutEmpresaInput>
  }

  export type ConfiguracionScalarWhereInput = {
    AND?: ConfiguracionScalarWhereInput | ConfiguracionScalarWhereInput[]
    OR?: ConfiguracionScalarWhereInput[]
    NOT?: ConfiguracionScalarWhereInput | ConfiguracionScalarWhereInput[]
    id?: StringFilter<"Configuracion"> | string
    empresaId?: StringFilter<"Configuracion"> | string
    clave?: StringFilter<"Configuracion"> | string
    valor?: StringFilter<"Configuracion"> | string
  }

  export type SuscripcionUpsertWithoutEmpresaInput = {
    update: XOR<SuscripcionUpdateWithoutEmpresaInput, SuscripcionUncheckedUpdateWithoutEmpresaInput>
    create: XOR<SuscripcionCreateWithoutEmpresaInput, SuscripcionUncheckedCreateWithoutEmpresaInput>
    where?: SuscripcionWhereInput
  }

  export type SuscripcionUpdateToOneWithWhereWithoutEmpresaInput = {
    where?: SuscripcionWhereInput
    data: XOR<SuscripcionUpdateWithoutEmpresaInput, SuscripcionUncheckedUpdateWithoutEmpresaInput>
  }

  export type SuscripcionUpdateWithoutEmpresaInput = {
    id?: StringFieldUpdateOperationsInput | string
    estado?: EnumEstadoSuscripcionFieldUpdateOperationsInput | $Enums.EstadoSuscripcion
    finPrueba?: DateTimeFieldUpdateOperationsInput | Date | string
    pagadoHasta?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    suspendidaEn?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    wompiFuentePagoId?: NullableStringFieldUpdateOperationsInput | string | null
    creadoEn?: DateTimeFieldUpdateOperationsInput | Date | string
    actualizadoEn?: DateTimeFieldUpdateOperationsInput | Date | string
    pagos?: PagoUpdateManyWithoutSuscripcionNestedInput
  }

  export type SuscripcionUncheckedUpdateWithoutEmpresaInput = {
    id?: StringFieldUpdateOperationsInput | string
    estado?: EnumEstadoSuscripcionFieldUpdateOperationsInput | $Enums.EstadoSuscripcion
    finPrueba?: DateTimeFieldUpdateOperationsInput | Date | string
    pagadoHasta?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    suspendidaEn?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    wompiFuentePagoId?: NullableStringFieldUpdateOperationsInput | string | null
    creadoEn?: DateTimeFieldUpdateOperationsInput | Date | string
    actualizadoEn?: DateTimeFieldUpdateOperationsInput | Date | string
    pagos?: PagoUncheckedUpdateManyWithoutSuscripcionNestedInput
  }

  export type HorarioUpsertWithWhereUniqueWithoutEmpresaInput = {
    where: HorarioWhereUniqueInput
    update: XOR<HorarioUpdateWithoutEmpresaInput, HorarioUncheckedUpdateWithoutEmpresaInput>
    create: XOR<HorarioCreateWithoutEmpresaInput, HorarioUncheckedCreateWithoutEmpresaInput>
  }

  export type HorarioUpdateWithWhereUniqueWithoutEmpresaInput = {
    where: HorarioWhereUniqueInput
    data: XOR<HorarioUpdateWithoutEmpresaInput, HorarioUncheckedUpdateWithoutEmpresaInput>
  }

  export type HorarioUpdateManyWithWhereWithoutEmpresaInput = {
    where: HorarioScalarWhereInput
    data: XOR<HorarioUpdateManyMutationInput, HorarioUncheckedUpdateManyWithoutEmpresaInput>
  }

  export type HorarioScalarWhereInput = {
    AND?: HorarioScalarWhereInput | HorarioScalarWhereInput[]
    OR?: HorarioScalarWhereInput[]
    NOT?: HorarioScalarWhereInput | HorarioScalarWhereInput[]
    id?: StringFilter<"Horario"> | string
    empresaId?: StringFilter<"Horario"> | string
    nombre?: StringFilter<"Horario"> | string
    toleranciaMin?: IntFilter<"Horario"> | number
    activo?: BoolFilter<"Horario"> | boolean
    creadoEn?: DateTimeFilter<"Horario"> | Date | string
  }

  export type DispositivoKioscoUpsertWithWhereUniqueWithoutEmpresaInput = {
    where: DispositivoKioscoWhereUniqueInput
    update: XOR<DispositivoKioscoUpdateWithoutEmpresaInput, DispositivoKioscoUncheckedUpdateWithoutEmpresaInput>
    create: XOR<DispositivoKioscoCreateWithoutEmpresaInput, DispositivoKioscoUncheckedCreateWithoutEmpresaInput>
  }

  export type DispositivoKioscoUpdateWithWhereUniqueWithoutEmpresaInput = {
    where: DispositivoKioscoWhereUniqueInput
    data: XOR<DispositivoKioscoUpdateWithoutEmpresaInput, DispositivoKioscoUncheckedUpdateWithoutEmpresaInput>
  }

  export type DispositivoKioscoUpdateManyWithWhereWithoutEmpresaInput = {
    where: DispositivoKioscoScalarWhereInput
    data: XOR<DispositivoKioscoUpdateManyMutationInput, DispositivoKioscoUncheckedUpdateManyWithoutEmpresaInput>
  }

  export type DispositivoKioscoScalarWhereInput = {
    AND?: DispositivoKioscoScalarWhereInput | DispositivoKioscoScalarWhereInput[]
    OR?: DispositivoKioscoScalarWhereInput[]
    NOT?: DispositivoKioscoScalarWhereInput | DispositivoKioscoScalarWhereInput[]
    id?: StringFilter<"DispositivoKiosco"> | string
    empresaId?: StringFilter<"DispositivoKiosco"> | string
    nombre?: StringFilter<"DispositivoKiosco"> | string
    token?: StringFilter<"DispositivoKiosco"> | string
    creadoEn?: DateTimeFilter<"DispositivoKiosco"> | Date | string
    ultimoUso?: DateTimeNullableFilter<"DispositivoKiosco"> | Date | string | null
  }

  export type EmpresaCreateWithoutSuscripcionInput = {
    id?: string
    nombre: string
    nit: string
    email: string
    telefono?: string | null
    marcadorToken?: string
    exentaPago?: boolean
    activa?: boolean
    creadoEn?: Date | string
    actualizadoEn?: Date | string
    usuarios?: UsuarioCreateNestedManyWithoutEmpresaInput
    colaboradores?: ColaboradorCreateNestedManyWithoutEmpresaInput
    festivos?: DiaFestivoCreateNestedManyWithoutEmpresaInput
    configuracion?: ConfiguracionCreateNestedManyWithoutEmpresaInput
    horarios?: HorarioCreateNestedManyWithoutEmpresaInput
    dispositivos?: DispositivoKioscoCreateNestedManyWithoutEmpresaInput
  }

  export type EmpresaUncheckedCreateWithoutSuscripcionInput = {
    id?: string
    nombre: string
    nit: string
    email: string
    telefono?: string | null
    marcadorToken?: string
    exentaPago?: boolean
    activa?: boolean
    creadoEn?: Date | string
    actualizadoEn?: Date | string
    usuarios?: UsuarioUncheckedCreateNestedManyWithoutEmpresaInput
    colaboradores?: ColaboradorUncheckedCreateNestedManyWithoutEmpresaInput
    festivos?: DiaFestivoUncheckedCreateNestedManyWithoutEmpresaInput
    configuracion?: ConfiguracionUncheckedCreateNestedManyWithoutEmpresaInput
    horarios?: HorarioUncheckedCreateNestedManyWithoutEmpresaInput
    dispositivos?: DispositivoKioscoUncheckedCreateNestedManyWithoutEmpresaInput
  }

  export type EmpresaCreateOrConnectWithoutSuscripcionInput = {
    where: EmpresaWhereUniqueInput
    create: XOR<EmpresaCreateWithoutSuscripcionInput, EmpresaUncheckedCreateWithoutSuscripcionInput>
  }

  export type PagoCreateWithoutSuscripcionInput = {
    id?: string
    monto: number
    colaboradoresFacturados: number
    periodoInicio: Date | string
    periodoFin: Date | string
    metodo: $Enums.MetodoPago
    estado?: $Enums.EstadoPago
    wompiTransaccionId?: string | null
    nota?: string | null
    comprobanteBase64?: string | null
    registradoPor?: string | null
    creadoEn?: Date | string
  }

  export type PagoUncheckedCreateWithoutSuscripcionInput = {
    id?: string
    monto: number
    colaboradoresFacturados: number
    periodoInicio: Date | string
    periodoFin: Date | string
    metodo: $Enums.MetodoPago
    estado?: $Enums.EstadoPago
    wompiTransaccionId?: string | null
    nota?: string | null
    comprobanteBase64?: string | null
    registradoPor?: string | null
    creadoEn?: Date | string
  }

  export type PagoCreateOrConnectWithoutSuscripcionInput = {
    where: PagoWhereUniqueInput
    create: XOR<PagoCreateWithoutSuscripcionInput, PagoUncheckedCreateWithoutSuscripcionInput>
  }

  export type PagoCreateManySuscripcionInputEnvelope = {
    data: PagoCreateManySuscripcionInput | PagoCreateManySuscripcionInput[]
    skipDuplicates?: boolean
  }

  export type EmpresaUpsertWithoutSuscripcionInput = {
    update: XOR<EmpresaUpdateWithoutSuscripcionInput, EmpresaUncheckedUpdateWithoutSuscripcionInput>
    create: XOR<EmpresaCreateWithoutSuscripcionInput, EmpresaUncheckedCreateWithoutSuscripcionInput>
    where?: EmpresaWhereInput
  }

  export type EmpresaUpdateToOneWithWhereWithoutSuscripcionInput = {
    where?: EmpresaWhereInput
    data: XOR<EmpresaUpdateWithoutSuscripcionInput, EmpresaUncheckedUpdateWithoutSuscripcionInput>
  }

  export type EmpresaUpdateWithoutSuscripcionInput = {
    id?: StringFieldUpdateOperationsInput | string
    nombre?: StringFieldUpdateOperationsInput | string
    nit?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    telefono?: NullableStringFieldUpdateOperationsInput | string | null
    marcadorToken?: StringFieldUpdateOperationsInput | string
    exentaPago?: BoolFieldUpdateOperationsInput | boolean
    activa?: BoolFieldUpdateOperationsInput | boolean
    creadoEn?: DateTimeFieldUpdateOperationsInput | Date | string
    actualizadoEn?: DateTimeFieldUpdateOperationsInput | Date | string
    usuarios?: UsuarioUpdateManyWithoutEmpresaNestedInput
    colaboradores?: ColaboradorUpdateManyWithoutEmpresaNestedInput
    festivos?: DiaFestivoUpdateManyWithoutEmpresaNestedInput
    configuracion?: ConfiguracionUpdateManyWithoutEmpresaNestedInput
    horarios?: HorarioUpdateManyWithoutEmpresaNestedInput
    dispositivos?: DispositivoKioscoUpdateManyWithoutEmpresaNestedInput
  }

  export type EmpresaUncheckedUpdateWithoutSuscripcionInput = {
    id?: StringFieldUpdateOperationsInput | string
    nombre?: StringFieldUpdateOperationsInput | string
    nit?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    telefono?: NullableStringFieldUpdateOperationsInput | string | null
    marcadorToken?: StringFieldUpdateOperationsInput | string
    exentaPago?: BoolFieldUpdateOperationsInput | boolean
    activa?: BoolFieldUpdateOperationsInput | boolean
    creadoEn?: DateTimeFieldUpdateOperationsInput | Date | string
    actualizadoEn?: DateTimeFieldUpdateOperationsInput | Date | string
    usuarios?: UsuarioUncheckedUpdateManyWithoutEmpresaNestedInput
    colaboradores?: ColaboradorUncheckedUpdateManyWithoutEmpresaNestedInput
    festivos?: DiaFestivoUncheckedUpdateManyWithoutEmpresaNestedInput
    configuracion?: ConfiguracionUncheckedUpdateManyWithoutEmpresaNestedInput
    horarios?: HorarioUncheckedUpdateManyWithoutEmpresaNestedInput
    dispositivos?: DispositivoKioscoUncheckedUpdateManyWithoutEmpresaNestedInput
  }

  export type PagoUpsertWithWhereUniqueWithoutSuscripcionInput = {
    where: PagoWhereUniqueInput
    update: XOR<PagoUpdateWithoutSuscripcionInput, PagoUncheckedUpdateWithoutSuscripcionInput>
    create: XOR<PagoCreateWithoutSuscripcionInput, PagoUncheckedCreateWithoutSuscripcionInput>
  }

  export type PagoUpdateWithWhereUniqueWithoutSuscripcionInput = {
    where: PagoWhereUniqueInput
    data: XOR<PagoUpdateWithoutSuscripcionInput, PagoUncheckedUpdateWithoutSuscripcionInput>
  }

  export type PagoUpdateManyWithWhereWithoutSuscripcionInput = {
    where: PagoScalarWhereInput
    data: XOR<PagoUpdateManyMutationInput, PagoUncheckedUpdateManyWithoutSuscripcionInput>
  }

  export type PagoScalarWhereInput = {
    AND?: PagoScalarWhereInput | PagoScalarWhereInput[]
    OR?: PagoScalarWhereInput[]
    NOT?: PagoScalarWhereInput | PagoScalarWhereInput[]
    id?: StringFilter<"Pago"> | string
    suscripcionId?: StringFilter<"Pago"> | string
    monto?: FloatFilter<"Pago"> | number
    colaboradoresFacturados?: IntFilter<"Pago"> | number
    periodoInicio?: DateTimeFilter<"Pago"> | Date | string
    periodoFin?: DateTimeFilter<"Pago"> | Date | string
    metodo?: EnumMetodoPagoFilter<"Pago"> | $Enums.MetodoPago
    estado?: EnumEstadoPagoFilter<"Pago"> | $Enums.EstadoPago
    wompiTransaccionId?: StringNullableFilter<"Pago"> | string | null
    nota?: StringNullableFilter<"Pago"> | string | null
    comprobanteBase64?: StringNullableFilter<"Pago"> | string | null
    registradoPor?: StringNullableFilter<"Pago"> | string | null
    creadoEn?: DateTimeFilter<"Pago"> | Date | string
  }

  export type SuscripcionCreateWithoutPagosInput = {
    id?: string
    estado?: $Enums.EstadoSuscripcion
    finPrueba: Date | string
    pagadoHasta?: Date | string | null
    suspendidaEn?: Date | string | null
    wompiFuentePagoId?: string | null
    creadoEn?: Date | string
    actualizadoEn?: Date | string
    empresa: EmpresaCreateNestedOneWithoutSuscripcionInput
  }

  export type SuscripcionUncheckedCreateWithoutPagosInput = {
    id?: string
    empresaId: string
    estado?: $Enums.EstadoSuscripcion
    finPrueba: Date | string
    pagadoHasta?: Date | string | null
    suspendidaEn?: Date | string | null
    wompiFuentePagoId?: string | null
    creadoEn?: Date | string
    actualizadoEn?: Date | string
  }

  export type SuscripcionCreateOrConnectWithoutPagosInput = {
    where: SuscripcionWhereUniqueInput
    create: XOR<SuscripcionCreateWithoutPagosInput, SuscripcionUncheckedCreateWithoutPagosInput>
  }

  export type SuscripcionUpsertWithoutPagosInput = {
    update: XOR<SuscripcionUpdateWithoutPagosInput, SuscripcionUncheckedUpdateWithoutPagosInput>
    create: XOR<SuscripcionCreateWithoutPagosInput, SuscripcionUncheckedCreateWithoutPagosInput>
    where?: SuscripcionWhereInput
  }

  export type SuscripcionUpdateToOneWithWhereWithoutPagosInput = {
    where?: SuscripcionWhereInput
    data: XOR<SuscripcionUpdateWithoutPagosInput, SuscripcionUncheckedUpdateWithoutPagosInput>
  }

  export type SuscripcionUpdateWithoutPagosInput = {
    id?: StringFieldUpdateOperationsInput | string
    estado?: EnumEstadoSuscripcionFieldUpdateOperationsInput | $Enums.EstadoSuscripcion
    finPrueba?: DateTimeFieldUpdateOperationsInput | Date | string
    pagadoHasta?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    suspendidaEn?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    wompiFuentePagoId?: NullableStringFieldUpdateOperationsInput | string | null
    creadoEn?: DateTimeFieldUpdateOperationsInput | Date | string
    actualizadoEn?: DateTimeFieldUpdateOperationsInput | Date | string
    empresa?: EmpresaUpdateOneRequiredWithoutSuscripcionNestedInput
  }

  export type SuscripcionUncheckedUpdateWithoutPagosInput = {
    id?: StringFieldUpdateOperationsInput | string
    empresaId?: StringFieldUpdateOperationsInput | string
    estado?: EnumEstadoSuscripcionFieldUpdateOperationsInput | $Enums.EstadoSuscripcion
    finPrueba?: DateTimeFieldUpdateOperationsInput | Date | string
    pagadoHasta?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    suspendidaEn?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    wompiFuentePagoId?: NullableStringFieldUpdateOperationsInput | string | null
    creadoEn?: DateTimeFieldUpdateOperationsInput | Date | string
    actualizadoEn?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type EmpresaCreateWithoutHorariosInput = {
    id?: string
    nombre: string
    nit: string
    email: string
    telefono?: string | null
    marcadorToken?: string
    exentaPago?: boolean
    activa?: boolean
    creadoEn?: Date | string
    actualizadoEn?: Date | string
    usuarios?: UsuarioCreateNestedManyWithoutEmpresaInput
    colaboradores?: ColaboradorCreateNestedManyWithoutEmpresaInput
    festivos?: DiaFestivoCreateNestedManyWithoutEmpresaInput
    configuracion?: ConfiguracionCreateNestedManyWithoutEmpresaInput
    suscripcion?: SuscripcionCreateNestedOneWithoutEmpresaInput
    dispositivos?: DispositivoKioscoCreateNestedManyWithoutEmpresaInput
  }

  export type EmpresaUncheckedCreateWithoutHorariosInput = {
    id?: string
    nombre: string
    nit: string
    email: string
    telefono?: string | null
    marcadorToken?: string
    exentaPago?: boolean
    activa?: boolean
    creadoEn?: Date | string
    actualizadoEn?: Date | string
    usuarios?: UsuarioUncheckedCreateNestedManyWithoutEmpresaInput
    colaboradores?: ColaboradorUncheckedCreateNestedManyWithoutEmpresaInput
    festivos?: DiaFestivoUncheckedCreateNestedManyWithoutEmpresaInput
    configuracion?: ConfiguracionUncheckedCreateNestedManyWithoutEmpresaInput
    suscripcion?: SuscripcionUncheckedCreateNestedOneWithoutEmpresaInput
    dispositivos?: DispositivoKioscoUncheckedCreateNestedManyWithoutEmpresaInput
  }

  export type EmpresaCreateOrConnectWithoutHorariosInput = {
    where: EmpresaWhereUniqueInput
    create: XOR<EmpresaCreateWithoutHorariosInput, EmpresaUncheckedCreateWithoutHorariosInput>
  }

  export type FranjaHorarioCreateWithoutHorarioInput = {
    id?: string
    dias: JsonNullValueInput | InputJsonValue
    horaEntrada: string
    horaSalida: string
  }

  export type FranjaHorarioUncheckedCreateWithoutHorarioInput = {
    id?: string
    dias: JsonNullValueInput | InputJsonValue
    horaEntrada: string
    horaSalida: string
  }

  export type FranjaHorarioCreateOrConnectWithoutHorarioInput = {
    where: FranjaHorarioWhereUniqueInput
    create: XOR<FranjaHorarioCreateWithoutHorarioInput, FranjaHorarioUncheckedCreateWithoutHorarioInput>
  }

  export type FranjaHorarioCreateManyHorarioInputEnvelope = {
    data: FranjaHorarioCreateManyHorarioInput | FranjaHorarioCreateManyHorarioInput[]
    skipDuplicates?: boolean
  }

  export type ColaboradorCreateWithoutHorarioInput = {
    id?: string
    nombre: string
    apellido: string
    cedula: string
    cargo?: string | null
    email?: string | null
    telefono?: string | null
    fechaNacimiento?: Date | string | null
    salarioMensual: number
    rostroDescriptor?: NullableJsonNullValueInput | InputJsonValue
    rostroEnroladoEn?: Date | string | null
    activo?: boolean
    retiroProgramado?: Date | string | null
    creadoEn?: Date | string
    actualizadoEn?: Date | string
    empresa: EmpresaCreateNestedOneWithoutColaboradoresInput
    registros?: RegistroCreateNestedManyWithoutColaboradorInput
    permisos?: PermisoCreateNestedManyWithoutColaboradorInput
  }

  export type ColaboradorUncheckedCreateWithoutHorarioInput = {
    id?: string
    empresaId: string
    nombre: string
    apellido: string
    cedula: string
    cargo?: string | null
    email?: string | null
    telefono?: string | null
    fechaNacimiento?: Date | string | null
    salarioMensual: number
    rostroDescriptor?: NullableJsonNullValueInput | InputJsonValue
    rostroEnroladoEn?: Date | string | null
    activo?: boolean
    retiroProgramado?: Date | string | null
    creadoEn?: Date | string
    actualizadoEn?: Date | string
    registros?: RegistroUncheckedCreateNestedManyWithoutColaboradorInput
    permisos?: PermisoUncheckedCreateNestedManyWithoutColaboradorInput
  }

  export type ColaboradorCreateOrConnectWithoutHorarioInput = {
    where: ColaboradorWhereUniqueInput
    create: XOR<ColaboradorCreateWithoutHorarioInput, ColaboradorUncheckedCreateWithoutHorarioInput>
  }

  export type ColaboradorCreateManyHorarioInputEnvelope = {
    data: ColaboradorCreateManyHorarioInput | ColaboradorCreateManyHorarioInput[]
    skipDuplicates?: boolean
  }

  export type EmpresaUpsertWithoutHorariosInput = {
    update: XOR<EmpresaUpdateWithoutHorariosInput, EmpresaUncheckedUpdateWithoutHorariosInput>
    create: XOR<EmpresaCreateWithoutHorariosInput, EmpresaUncheckedCreateWithoutHorariosInput>
    where?: EmpresaWhereInput
  }

  export type EmpresaUpdateToOneWithWhereWithoutHorariosInput = {
    where?: EmpresaWhereInput
    data: XOR<EmpresaUpdateWithoutHorariosInput, EmpresaUncheckedUpdateWithoutHorariosInput>
  }

  export type EmpresaUpdateWithoutHorariosInput = {
    id?: StringFieldUpdateOperationsInput | string
    nombre?: StringFieldUpdateOperationsInput | string
    nit?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    telefono?: NullableStringFieldUpdateOperationsInput | string | null
    marcadorToken?: StringFieldUpdateOperationsInput | string
    exentaPago?: BoolFieldUpdateOperationsInput | boolean
    activa?: BoolFieldUpdateOperationsInput | boolean
    creadoEn?: DateTimeFieldUpdateOperationsInput | Date | string
    actualizadoEn?: DateTimeFieldUpdateOperationsInput | Date | string
    usuarios?: UsuarioUpdateManyWithoutEmpresaNestedInput
    colaboradores?: ColaboradorUpdateManyWithoutEmpresaNestedInput
    festivos?: DiaFestivoUpdateManyWithoutEmpresaNestedInput
    configuracion?: ConfiguracionUpdateManyWithoutEmpresaNestedInput
    suscripcion?: SuscripcionUpdateOneWithoutEmpresaNestedInput
    dispositivos?: DispositivoKioscoUpdateManyWithoutEmpresaNestedInput
  }

  export type EmpresaUncheckedUpdateWithoutHorariosInput = {
    id?: StringFieldUpdateOperationsInput | string
    nombre?: StringFieldUpdateOperationsInput | string
    nit?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    telefono?: NullableStringFieldUpdateOperationsInput | string | null
    marcadorToken?: StringFieldUpdateOperationsInput | string
    exentaPago?: BoolFieldUpdateOperationsInput | boolean
    activa?: BoolFieldUpdateOperationsInput | boolean
    creadoEn?: DateTimeFieldUpdateOperationsInput | Date | string
    actualizadoEn?: DateTimeFieldUpdateOperationsInput | Date | string
    usuarios?: UsuarioUncheckedUpdateManyWithoutEmpresaNestedInput
    colaboradores?: ColaboradorUncheckedUpdateManyWithoutEmpresaNestedInput
    festivos?: DiaFestivoUncheckedUpdateManyWithoutEmpresaNestedInput
    configuracion?: ConfiguracionUncheckedUpdateManyWithoutEmpresaNestedInput
    suscripcion?: SuscripcionUncheckedUpdateOneWithoutEmpresaNestedInput
    dispositivos?: DispositivoKioscoUncheckedUpdateManyWithoutEmpresaNestedInput
  }

  export type FranjaHorarioUpsertWithWhereUniqueWithoutHorarioInput = {
    where: FranjaHorarioWhereUniqueInput
    update: XOR<FranjaHorarioUpdateWithoutHorarioInput, FranjaHorarioUncheckedUpdateWithoutHorarioInput>
    create: XOR<FranjaHorarioCreateWithoutHorarioInput, FranjaHorarioUncheckedCreateWithoutHorarioInput>
  }

  export type FranjaHorarioUpdateWithWhereUniqueWithoutHorarioInput = {
    where: FranjaHorarioWhereUniqueInput
    data: XOR<FranjaHorarioUpdateWithoutHorarioInput, FranjaHorarioUncheckedUpdateWithoutHorarioInput>
  }

  export type FranjaHorarioUpdateManyWithWhereWithoutHorarioInput = {
    where: FranjaHorarioScalarWhereInput
    data: XOR<FranjaHorarioUpdateManyMutationInput, FranjaHorarioUncheckedUpdateManyWithoutHorarioInput>
  }

  export type FranjaHorarioScalarWhereInput = {
    AND?: FranjaHorarioScalarWhereInput | FranjaHorarioScalarWhereInput[]
    OR?: FranjaHorarioScalarWhereInput[]
    NOT?: FranjaHorarioScalarWhereInput | FranjaHorarioScalarWhereInput[]
    id?: StringFilter<"FranjaHorario"> | string
    horarioId?: StringFilter<"FranjaHorario"> | string
    dias?: JsonFilter<"FranjaHorario">
    horaEntrada?: StringFilter<"FranjaHorario"> | string
    horaSalida?: StringFilter<"FranjaHorario"> | string
  }

  export type ColaboradorUpsertWithWhereUniqueWithoutHorarioInput = {
    where: ColaboradorWhereUniqueInput
    update: XOR<ColaboradorUpdateWithoutHorarioInput, ColaboradorUncheckedUpdateWithoutHorarioInput>
    create: XOR<ColaboradorCreateWithoutHorarioInput, ColaboradorUncheckedCreateWithoutHorarioInput>
  }

  export type ColaboradorUpdateWithWhereUniqueWithoutHorarioInput = {
    where: ColaboradorWhereUniqueInput
    data: XOR<ColaboradorUpdateWithoutHorarioInput, ColaboradorUncheckedUpdateWithoutHorarioInput>
  }

  export type ColaboradorUpdateManyWithWhereWithoutHorarioInput = {
    where: ColaboradorScalarWhereInput
    data: XOR<ColaboradorUpdateManyMutationInput, ColaboradorUncheckedUpdateManyWithoutHorarioInput>
  }

  export type HorarioCreateWithoutFranjasInput = {
    id?: string
    nombre: string
    toleranciaMin?: number
    activo?: boolean
    creadoEn?: Date | string
    empresa: EmpresaCreateNestedOneWithoutHorariosInput
    colaboradores?: ColaboradorCreateNestedManyWithoutHorarioInput
  }

  export type HorarioUncheckedCreateWithoutFranjasInput = {
    id?: string
    empresaId: string
    nombre: string
    toleranciaMin?: number
    activo?: boolean
    creadoEn?: Date | string
    colaboradores?: ColaboradorUncheckedCreateNestedManyWithoutHorarioInput
  }

  export type HorarioCreateOrConnectWithoutFranjasInput = {
    where: HorarioWhereUniqueInput
    create: XOR<HorarioCreateWithoutFranjasInput, HorarioUncheckedCreateWithoutFranjasInput>
  }

  export type HorarioUpsertWithoutFranjasInput = {
    update: XOR<HorarioUpdateWithoutFranjasInput, HorarioUncheckedUpdateWithoutFranjasInput>
    create: XOR<HorarioCreateWithoutFranjasInput, HorarioUncheckedCreateWithoutFranjasInput>
    where?: HorarioWhereInput
  }

  export type HorarioUpdateToOneWithWhereWithoutFranjasInput = {
    where?: HorarioWhereInput
    data: XOR<HorarioUpdateWithoutFranjasInput, HorarioUncheckedUpdateWithoutFranjasInput>
  }

  export type HorarioUpdateWithoutFranjasInput = {
    id?: StringFieldUpdateOperationsInput | string
    nombre?: StringFieldUpdateOperationsInput | string
    toleranciaMin?: IntFieldUpdateOperationsInput | number
    activo?: BoolFieldUpdateOperationsInput | boolean
    creadoEn?: DateTimeFieldUpdateOperationsInput | Date | string
    empresa?: EmpresaUpdateOneRequiredWithoutHorariosNestedInput
    colaboradores?: ColaboradorUpdateManyWithoutHorarioNestedInput
  }

  export type HorarioUncheckedUpdateWithoutFranjasInput = {
    id?: StringFieldUpdateOperationsInput | string
    empresaId?: StringFieldUpdateOperationsInput | string
    nombre?: StringFieldUpdateOperationsInput | string
    toleranciaMin?: IntFieldUpdateOperationsInput | number
    activo?: BoolFieldUpdateOperationsInput | boolean
    creadoEn?: DateTimeFieldUpdateOperationsInput | Date | string
    colaboradores?: ColaboradorUncheckedUpdateManyWithoutHorarioNestedInput
  }

  export type EmpresaCreateWithoutDispositivosInput = {
    id?: string
    nombre: string
    nit: string
    email: string
    telefono?: string | null
    marcadorToken?: string
    exentaPago?: boolean
    activa?: boolean
    creadoEn?: Date | string
    actualizadoEn?: Date | string
    usuarios?: UsuarioCreateNestedManyWithoutEmpresaInput
    colaboradores?: ColaboradorCreateNestedManyWithoutEmpresaInput
    festivos?: DiaFestivoCreateNestedManyWithoutEmpresaInput
    configuracion?: ConfiguracionCreateNestedManyWithoutEmpresaInput
    suscripcion?: SuscripcionCreateNestedOneWithoutEmpresaInput
    horarios?: HorarioCreateNestedManyWithoutEmpresaInput
  }

  export type EmpresaUncheckedCreateWithoutDispositivosInput = {
    id?: string
    nombre: string
    nit: string
    email: string
    telefono?: string | null
    marcadorToken?: string
    exentaPago?: boolean
    activa?: boolean
    creadoEn?: Date | string
    actualizadoEn?: Date | string
    usuarios?: UsuarioUncheckedCreateNestedManyWithoutEmpresaInput
    colaboradores?: ColaboradorUncheckedCreateNestedManyWithoutEmpresaInput
    festivos?: DiaFestivoUncheckedCreateNestedManyWithoutEmpresaInput
    configuracion?: ConfiguracionUncheckedCreateNestedManyWithoutEmpresaInput
    suscripcion?: SuscripcionUncheckedCreateNestedOneWithoutEmpresaInput
    horarios?: HorarioUncheckedCreateNestedManyWithoutEmpresaInput
  }

  export type EmpresaCreateOrConnectWithoutDispositivosInput = {
    where: EmpresaWhereUniqueInput
    create: XOR<EmpresaCreateWithoutDispositivosInput, EmpresaUncheckedCreateWithoutDispositivosInput>
  }

  export type EmpresaUpsertWithoutDispositivosInput = {
    update: XOR<EmpresaUpdateWithoutDispositivosInput, EmpresaUncheckedUpdateWithoutDispositivosInput>
    create: XOR<EmpresaCreateWithoutDispositivosInput, EmpresaUncheckedCreateWithoutDispositivosInput>
    where?: EmpresaWhereInput
  }

  export type EmpresaUpdateToOneWithWhereWithoutDispositivosInput = {
    where?: EmpresaWhereInput
    data: XOR<EmpresaUpdateWithoutDispositivosInput, EmpresaUncheckedUpdateWithoutDispositivosInput>
  }

  export type EmpresaUpdateWithoutDispositivosInput = {
    id?: StringFieldUpdateOperationsInput | string
    nombre?: StringFieldUpdateOperationsInput | string
    nit?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    telefono?: NullableStringFieldUpdateOperationsInput | string | null
    marcadorToken?: StringFieldUpdateOperationsInput | string
    exentaPago?: BoolFieldUpdateOperationsInput | boolean
    activa?: BoolFieldUpdateOperationsInput | boolean
    creadoEn?: DateTimeFieldUpdateOperationsInput | Date | string
    actualizadoEn?: DateTimeFieldUpdateOperationsInput | Date | string
    usuarios?: UsuarioUpdateManyWithoutEmpresaNestedInput
    colaboradores?: ColaboradorUpdateManyWithoutEmpresaNestedInput
    festivos?: DiaFestivoUpdateManyWithoutEmpresaNestedInput
    configuracion?: ConfiguracionUpdateManyWithoutEmpresaNestedInput
    suscripcion?: SuscripcionUpdateOneWithoutEmpresaNestedInput
    horarios?: HorarioUpdateManyWithoutEmpresaNestedInput
  }

  export type EmpresaUncheckedUpdateWithoutDispositivosInput = {
    id?: StringFieldUpdateOperationsInput | string
    nombre?: StringFieldUpdateOperationsInput | string
    nit?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    telefono?: NullableStringFieldUpdateOperationsInput | string | null
    marcadorToken?: StringFieldUpdateOperationsInput | string
    exentaPago?: BoolFieldUpdateOperationsInput | boolean
    activa?: BoolFieldUpdateOperationsInput | boolean
    creadoEn?: DateTimeFieldUpdateOperationsInput | Date | string
    actualizadoEn?: DateTimeFieldUpdateOperationsInput | Date | string
    usuarios?: UsuarioUncheckedUpdateManyWithoutEmpresaNestedInput
    colaboradores?: ColaboradorUncheckedUpdateManyWithoutEmpresaNestedInput
    festivos?: DiaFestivoUncheckedUpdateManyWithoutEmpresaNestedInput
    configuracion?: ConfiguracionUncheckedUpdateManyWithoutEmpresaNestedInput
    suscripcion?: SuscripcionUncheckedUpdateOneWithoutEmpresaNestedInput
    horarios?: HorarioUncheckedUpdateManyWithoutEmpresaNestedInput
  }

  export type EmpresaCreateWithoutColaboradoresInput = {
    id?: string
    nombre: string
    nit: string
    email: string
    telefono?: string | null
    marcadorToken?: string
    exentaPago?: boolean
    activa?: boolean
    creadoEn?: Date | string
    actualizadoEn?: Date | string
    usuarios?: UsuarioCreateNestedManyWithoutEmpresaInput
    festivos?: DiaFestivoCreateNestedManyWithoutEmpresaInput
    configuracion?: ConfiguracionCreateNestedManyWithoutEmpresaInput
    suscripcion?: SuscripcionCreateNestedOneWithoutEmpresaInput
    horarios?: HorarioCreateNestedManyWithoutEmpresaInput
    dispositivos?: DispositivoKioscoCreateNestedManyWithoutEmpresaInput
  }

  export type EmpresaUncheckedCreateWithoutColaboradoresInput = {
    id?: string
    nombre: string
    nit: string
    email: string
    telefono?: string | null
    marcadorToken?: string
    exentaPago?: boolean
    activa?: boolean
    creadoEn?: Date | string
    actualizadoEn?: Date | string
    usuarios?: UsuarioUncheckedCreateNestedManyWithoutEmpresaInput
    festivos?: DiaFestivoUncheckedCreateNestedManyWithoutEmpresaInput
    configuracion?: ConfiguracionUncheckedCreateNestedManyWithoutEmpresaInput
    suscripcion?: SuscripcionUncheckedCreateNestedOneWithoutEmpresaInput
    horarios?: HorarioUncheckedCreateNestedManyWithoutEmpresaInput
    dispositivos?: DispositivoKioscoUncheckedCreateNestedManyWithoutEmpresaInput
  }

  export type EmpresaCreateOrConnectWithoutColaboradoresInput = {
    where: EmpresaWhereUniqueInput
    create: XOR<EmpresaCreateWithoutColaboradoresInput, EmpresaUncheckedCreateWithoutColaboradoresInput>
  }

  export type HorarioCreateWithoutColaboradoresInput = {
    id?: string
    nombre: string
    toleranciaMin?: number
    activo?: boolean
    creadoEn?: Date | string
    empresa: EmpresaCreateNestedOneWithoutHorariosInput
    franjas?: FranjaHorarioCreateNestedManyWithoutHorarioInput
  }

  export type HorarioUncheckedCreateWithoutColaboradoresInput = {
    id?: string
    empresaId: string
    nombre: string
    toleranciaMin?: number
    activo?: boolean
    creadoEn?: Date | string
    franjas?: FranjaHorarioUncheckedCreateNestedManyWithoutHorarioInput
  }

  export type HorarioCreateOrConnectWithoutColaboradoresInput = {
    where: HorarioWhereUniqueInput
    create: XOR<HorarioCreateWithoutColaboradoresInput, HorarioUncheckedCreateWithoutColaboradoresInput>
  }

  export type RegistroCreateWithoutColaboradorInput = {
    id?: string
    fecha: Date | string
    entrada?: Date | string | null
    salida?: Date | string | null
    tipo?: $Enums.TipoRegistro
    observacion?: string | null
    fotoEntrada?: string | null
    fotoSalida?: string | null
    editadoPor?: string | null
    editadoEn?: Date | string | null
    creadoEn?: Date | string
  }

  export type RegistroUncheckedCreateWithoutColaboradorInput = {
    id?: string
    fecha: Date | string
    entrada?: Date | string | null
    salida?: Date | string | null
    tipo?: $Enums.TipoRegistro
    observacion?: string | null
    fotoEntrada?: string | null
    fotoSalida?: string | null
    editadoPor?: string | null
    editadoEn?: Date | string | null
    creadoEn?: Date | string
  }

  export type RegistroCreateOrConnectWithoutColaboradorInput = {
    where: RegistroWhereUniqueInput
    create: XOR<RegistroCreateWithoutColaboradorInput, RegistroUncheckedCreateWithoutColaboradorInput>
  }

  export type RegistroCreateManyColaboradorInputEnvelope = {
    data: RegistroCreateManyColaboradorInput | RegistroCreateManyColaboradorInput[]
    skipDuplicates?: boolean
  }

  export type PermisoCreateWithoutColaboradorInput = {
    id?: string
    fechaInicio: Date | string
    fechaFin: Date | string
    tipo: $Enums.TipoPermiso
    descripcion?: string | null
    aprobado?: boolean
    creadoEn?: Date | string
  }

  export type PermisoUncheckedCreateWithoutColaboradorInput = {
    id?: string
    fechaInicio: Date | string
    fechaFin: Date | string
    tipo: $Enums.TipoPermiso
    descripcion?: string | null
    aprobado?: boolean
    creadoEn?: Date | string
  }

  export type PermisoCreateOrConnectWithoutColaboradorInput = {
    where: PermisoWhereUniqueInput
    create: XOR<PermisoCreateWithoutColaboradorInput, PermisoUncheckedCreateWithoutColaboradorInput>
  }

  export type PermisoCreateManyColaboradorInputEnvelope = {
    data: PermisoCreateManyColaboradorInput | PermisoCreateManyColaboradorInput[]
    skipDuplicates?: boolean
  }

  export type EmpresaUpsertWithoutColaboradoresInput = {
    update: XOR<EmpresaUpdateWithoutColaboradoresInput, EmpresaUncheckedUpdateWithoutColaboradoresInput>
    create: XOR<EmpresaCreateWithoutColaboradoresInput, EmpresaUncheckedCreateWithoutColaboradoresInput>
    where?: EmpresaWhereInput
  }

  export type EmpresaUpdateToOneWithWhereWithoutColaboradoresInput = {
    where?: EmpresaWhereInput
    data: XOR<EmpresaUpdateWithoutColaboradoresInput, EmpresaUncheckedUpdateWithoutColaboradoresInput>
  }

  export type EmpresaUpdateWithoutColaboradoresInput = {
    id?: StringFieldUpdateOperationsInput | string
    nombre?: StringFieldUpdateOperationsInput | string
    nit?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    telefono?: NullableStringFieldUpdateOperationsInput | string | null
    marcadorToken?: StringFieldUpdateOperationsInput | string
    exentaPago?: BoolFieldUpdateOperationsInput | boolean
    activa?: BoolFieldUpdateOperationsInput | boolean
    creadoEn?: DateTimeFieldUpdateOperationsInput | Date | string
    actualizadoEn?: DateTimeFieldUpdateOperationsInput | Date | string
    usuarios?: UsuarioUpdateManyWithoutEmpresaNestedInput
    festivos?: DiaFestivoUpdateManyWithoutEmpresaNestedInput
    configuracion?: ConfiguracionUpdateManyWithoutEmpresaNestedInput
    suscripcion?: SuscripcionUpdateOneWithoutEmpresaNestedInput
    horarios?: HorarioUpdateManyWithoutEmpresaNestedInput
    dispositivos?: DispositivoKioscoUpdateManyWithoutEmpresaNestedInput
  }

  export type EmpresaUncheckedUpdateWithoutColaboradoresInput = {
    id?: StringFieldUpdateOperationsInput | string
    nombre?: StringFieldUpdateOperationsInput | string
    nit?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    telefono?: NullableStringFieldUpdateOperationsInput | string | null
    marcadorToken?: StringFieldUpdateOperationsInput | string
    exentaPago?: BoolFieldUpdateOperationsInput | boolean
    activa?: BoolFieldUpdateOperationsInput | boolean
    creadoEn?: DateTimeFieldUpdateOperationsInput | Date | string
    actualizadoEn?: DateTimeFieldUpdateOperationsInput | Date | string
    usuarios?: UsuarioUncheckedUpdateManyWithoutEmpresaNestedInput
    festivos?: DiaFestivoUncheckedUpdateManyWithoutEmpresaNestedInput
    configuracion?: ConfiguracionUncheckedUpdateManyWithoutEmpresaNestedInput
    suscripcion?: SuscripcionUncheckedUpdateOneWithoutEmpresaNestedInput
    horarios?: HorarioUncheckedUpdateManyWithoutEmpresaNestedInput
    dispositivos?: DispositivoKioscoUncheckedUpdateManyWithoutEmpresaNestedInput
  }

  export type HorarioUpsertWithoutColaboradoresInput = {
    update: XOR<HorarioUpdateWithoutColaboradoresInput, HorarioUncheckedUpdateWithoutColaboradoresInput>
    create: XOR<HorarioCreateWithoutColaboradoresInput, HorarioUncheckedCreateWithoutColaboradoresInput>
    where?: HorarioWhereInput
  }

  export type HorarioUpdateToOneWithWhereWithoutColaboradoresInput = {
    where?: HorarioWhereInput
    data: XOR<HorarioUpdateWithoutColaboradoresInput, HorarioUncheckedUpdateWithoutColaboradoresInput>
  }

  export type HorarioUpdateWithoutColaboradoresInput = {
    id?: StringFieldUpdateOperationsInput | string
    nombre?: StringFieldUpdateOperationsInput | string
    toleranciaMin?: IntFieldUpdateOperationsInput | number
    activo?: BoolFieldUpdateOperationsInput | boolean
    creadoEn?: DateTimeFieldUpdateOperationsInput | Date | string
    empresa?: EmpresaUpdateOneRequiredWithoutHorariosNestedInput
    franjas?: FranjaHorarioUpdateManyWithoutHorarioNestedInput
  }

  export type HorarioUncheckedUpdateWithoutColaboradoresInput = {
    id?: StringFieldUpdateOperationsInput | string
    empresaId?: StringFieldUpdateOperationsInput | string
    nombre?: StringFieldUpdateOperationsInput | string
    toleranciaMin?: IntFieldUpdateOperationsInput | number
    activo?: BoolFieldUpdateOperationsInput | boolean
    creadoEn?: DateTimeFieldUpdateOperationsInput | Date | string
    franjas?: FranjaHorarioUncheckedUpdateManyWithoutHorarioNestedInput
  }

  export type RegistroUpsertWithWhereUniqueWithoutColaboradorInput = {
    where: RegistroWhereUniqueInput
    update: XOR<RegistroUpdateWithoutColaboradorInput, RegistroUncheckedUpdateWithoutColaboradorInput>
    create: XOR<RegistroCreateWithoutColaboradorInput, RegistroUncheckedCreateWithoutColaboradorInput>
  }

  export type RegistroUpdateWithWhereUniqueWithoutColaboradorInput = {
    where: RegistroWhereUniqueInput
    data: XOR<RegistroUpdateWithoutColaboradorInput, RegistroUncheckedUpdateWithoutColaboradorInput>
  }

  export type RegistroUpdateManyWithWhereWithoutColaboradorInput = {
    where: RegistroScalarWhereInput
    data: XOR<RegistroUpdateManyMutationInput, RegistroUncheckedUpdateManyWithoutColaboradorInput>
  }

  export type RegistroScalarWhereInput = {
    AND?: RegistroScalarWhereInput | RegistroScalarWhereInput[]
    OR?: RegistroScalarWhereInput[]
    NOT?: RegistroScalarWhereInput | RegistroScalarWhereInput[]
    id?: StringFilter<"Registro"> | string
    colaboradorId?: StringFilter<"Registro"> | string
    fecha?: DateTimeFilter<"Registro"> | Date | string
    entrada?: DateTimeNullableFilter<"Registro"> | Date | string | null
    salida?: DateTimeNullableFilter<"Registro"> | Date | string | null
    tipo?: EnumTipoRegistroFilter<"Registro"> | $Enums.TipoRegistro
    observacion?: StringNullableFilter<"Registro"> | string | null
    fotoEntrada?: StringNullableFilter<"Registro"> | string | null
    fotoSalida?: StringNullableFilter<"Registro"> | string | null
    editadoPor?: StringNullableFilter<"Registro"> | string | null
    editadoEn?: DateTimeNullableFilter<"Registro"> | Date | string | null
    creadoEn?: DateTimeFilter<"Registro"> | Date | string
  }

  export type PermisoUpsertWithWhereUniqueWithoutColaboradorInput = {
    where: PermisoWhereUniqueInput
    update: XOR<PermisoUpdateWithoutColaboradorInput, PermisoUncheckedUpdateWithoutColaboradorInput>
    create: XOR<PermisoCreateWithoutColaboradorInput, PermisoUncheckedCreateWithoutColaboradorInput>
  }

  export type PermisoUpdateWithWhereUniqueWithoutColaboradorInput = {
    where: PermisoWhereUniqueInput
    data: XOR<PermisoUpdateWithoutColaboradorInput, PermisoUncheckedUpdateWithoutColaboradorInput>
  }

  export type PermisoUpdateManyWithWhereWithoutColaboradorInput = {
    where: PermisoScalarWhereInput
    data: XOR<PermisoUpdateManyMutationInput, PermisoUncheckedUpdateManyWithoutColaboradorInput>
  }

  export type PermisoScalarWhereInput = {
    AND?: PermisoScalarWhereInput | PermisoScalarWhereInput[]
    OR?: PermisoScalarWhereInput[]
    NOT?: PermisoScalarWhereInput | PermisoScalarWhereInput[]
    id?: StringFilter<"Permiso"> | string
    colaboradorId?: StringFilter<"Permiso"> | string
    fechaInicio?: DateTimeFilter<"Permiso"> | Date | string
    fechaFin?: DateTimeFilter<"Permiso"> | Date | string
    tipo?: EnumTipoPermisoFilter<"Permiso"> | $Enums.TipoPermiso
    descripcion?: StringNullableFilter<"Permiso"> | string | null
    aprobado?: BoolFilter<"Permiso"> | boolean
    creadoEn?: DateTimeFilter<"Permiso"> | Date | string
  }

  export type ColaboradorCreateWithoutRegistrosInput = {
    id?: string
    nombre: string
    apellido: string
    cedula: string
    cargo?: string | null
    email?: string | null
    telefono?: string | null
    fechaNacimiento?: Date | string | null
    salarioMensual: number
    rostroDescriptor?: NullableJsonNullValueInput | InputJsonValue
    rostroEnroladoEn?: Date | string | null
    activo?: boolean
    retiroProgramado?: Date | string | null
    creadoEn?: Date | string
    actualizadoEn?: Date | string
    empresa: EmpresaCreateNestedOneWithoutColaboradoresInput
    horario?: HorarioCreateNestedOneWithoutColaboradoresInput
    permisos?: PermisoCreateNestedManyWithoutColaboradorInput
  }

  export type ColaboradorUncheckedCreateWithoutRegistrosInput = {
    id?: string
    empresaId: string
    nombre: string
    apellido: string
    cedula: string
    cargo?: string | null
    email?: string | null
    telefono?: string | null
    fechaNacimiento?: Date | string | null
    salarioMensual: number
    rostroDescriptor?: NullableJsonNullValueInput | InputJsonValue
    rostroEnroladoEn?: Date | string | null
    horarioId?: string | null
    activo?: boolean
    retiroProgramado?: Date | string | null
    creadoEn?: Date | string
    actualizadoEn?: Date | string
    permisos?: PermisoUncheckedCreateNestedManyWithoutColaboradorInput
  }

  export type ColaboradorCreateOrConnectWithoutRegistrosInput = {
    where: ColaboradorWhereUniqueInput
    create: XOR<ColaboradorCreateWithoutRegistrosInput, ColaboradorUncheckedCreateWithoutRegistrosInput>
  }

  export type ColaboradorUpsertWithoutRegistrosInput = {
    update: XOR<ColaboradorUpdateWithoutRegistrosInput, ColaboradorUncheckedUpdateWithoutRegistrosInput>
    create: XOR<ColaboradorCreateWithoutRegistrosInput, ColaboradorUncheckedCreateWithoutRegistrosInput>
    where?: ColaboradorWhereInput
  }

  export type ColaboradorUpdateToOneWithWhereWithoutRegistrosInput = {
    where?: ColaboradorWhereInput
    data: XOR<ColaboradorUpdateWithoutRegistrosInput, ColaboradorUncheckedUpdateWithoutRegistrosInput>
  }

  export type ColaboradorUpdateWithoutRegistrosInput = {
    id?: StringFieldUpdateOperationsInput | string
    nombre?: StringFieldUpdateOperationsInput | string
    apellido?: StringFieldUpdateOperationsInput | string
    cedula?: StringFieldUpdateOperationsInput | string
    cargo?: NullableStringFieldUpdateOperationsInput | string | null
    email?: NullableStringFieldUpdateOperationsInput | string | null
    telefono?: NullableStringFieldUpdateOperationsInput | string | null
    fechaNacimiento?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    salarioMensual?: FloatFieldUpdateOperationsInput | number
    rostroDescriptor?: NullableJsonNullValueInput | InputJsonValue
    rostroEnroladoEn?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    activo?: BoolFieldUpdateOperationsInput | boolean
    retiroProgramado?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    creadoEn?: DateTimeFieldUpdateOperationsInput | Date | string
    actualizadoEn?: DateTimeFieldUpdateOperationsInput | Date | string
    empresa?: EmpresaUpdateOneRequiredWithoutColaboradoresNestedInput
    horario?: HorarioUpdateOneWithoutColaboradoresNestedInput
    permisos?: PermisoUpdateManyWithoutColaboradorNestedInput
  }

  export type ColaboradorUncheckedUpdateWithoutRegistrosInput = {
    id?: StringFieldUpdateOperationsInput | string
    empresaId?: StringFieldUpdateOperationsInput | string
    nombre?: StringFieldUpdateOperationsInput | string
    apellido?: StringFieldUpdateOperationsInput | string
    cedula?: StringFieldUpdateOperationsInput | string
    cargo?: NullableStringFieldUpdateOperationsInput | string | null
    email?: NullableStringFieldUpdateOperationsInput | string | null
    telefono?: NullableStringFieldUpdateOperationsInput | string | null
    fechaNacimiento?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    salarioMensual?: FloatFieldUpdateOperationsInput | number
    rostroDescriptor?: NullableJsonNullValueInput | InputJsonValue
    rostroEnroladoEn?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    horarioId?: NullableStringFieldUpdateOperationsInput | string | null
    activo?: BoolFieldUpdateOperationsInput | boolean
    retiroProgramado?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    creadoEn?: DateTimeFieldUpdateOperationsInput | Date | string
    actualizadoEn?: DateTimeFieldUpdateOperationsInput | Date | string
    permisos?: PermisoUncheckedUpdateManyWithoutColaboradorNestedInput
  }

  export type ColaboradorCreateWithoutPermisosInput = {
    id?: string
    nombre: string
    apellido: string
    cedula: string
    cargo?: string | null
    email?: string | null
    telefono?: string | null
    fechaNacimiento?: Date | string | null
    salarioMensual: number
    rostroDescriptor?: NullableJsonNullValueInput | InputJsonValue
    rostroEnroladoEn?: Date | string | null
    activo?: boolean
    retiroProgramado?: Date | string | null
    creadoEn?: Date | string
    actualizadoEn?: Date | string
    empresa: EmpresaCreateNestedOneWithoutColaboradoresInput
    horario?: HorarioCreateNestedOneWithoutColaboradoresInput
    registros?: RegistroCreateNestedManyWithoutColaboradorInput
  }

  export type ColaboradorUncheckedCreateWithoutPermisosInput = {
    id?: string
    empresaId: string
    nombre: string
    apellido: string
    cedula: string
    cargo?: string | null
    email?: string | null
    telefono?: string | null
    fechaNacimiento?: Date | string | null
    salarioMensual: number
    rostroDescriptor?: NullableJsonNullValueInput | InputJsonValue
    rostroEnroladoEn?: Date | string | null
    horarioId?: string | null
    activo?: boolean
    retiroProgramado?: Date | string | null
    creadoEn?: Date | string
    actualizadoEn?: Date | string
    registros?: RegistroUncheckedCreateNestedManyWithoutColaboradorInput
  }

  export type ColaboradorCreateOrConnectWithoutPermisosInput = {
    where: ColaboradorWhereUniqueInput
    create: XOR<ColaboradorCreateWithoutPermisosInput, ColaboradorUncheckedCreateWithoutPermisosInput>
  }

  export type ColaboradorUpsertWithoutPermisosInput = {
    update: XOR<ColaboradorUpdateWithoutPermisosInput, ColaboradorUncheckedUpdateWithoutPermisosInput>
    create: XOR<ColaboradorCreateWithoutPermisosInput, ColaboradorUncheckedCreateWithoutPermisosInput>
    where?: ColaboradorWhereInput
  }

  export type ColaboradorUpdateToOneWithWhereWithoutPermisosInput = {
    where?: ColaboradorWhereInput
    data: XOR<ColaboradorUpdateWithoutPermisosInput, ColaboradorUncheckedUpdateWithoutPermisosInput>
  }

  export type ColaboradorUpdateWithoutPermisosInput = {
    id?: StringFieldUpdateOperationsInput | string
    nombre?: StringFieldUpdateOperationsInput | string
    apellido?: StringFieldUpdateOperationsInput | string
    cedula?: StringFieldUpdateOperationsInput | string
    cargo?: NullableStringFieldUpdateOperationsInput | string | null
    email?: NullableStringFieldUpdateOperationsInput | string | null
    telefono?: NullableStringFieldUpdateOperationsInput | string | null
    fechaNacimiento?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    salarioMensual?: FloatFieldUpdateOperationsInput | number
    rostroDescriptor?: NullableJsonNullValueInput | InputJsonValue
    rostroEnroladoEn?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    activo?: BoolFieldUpdateOperationsInput | boolean
    retiroProgramado?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    creadoEn?: DateTimeFieldUpdateOperationsInput | Date | string
    actualizadoEn?: DateTimeFieldUpdateOperationsInput | Date | string
    empresa?: EmpresaUpdateOneRequiredWithoutColaboradoresNestedInput
    horario?: HorarioUpdateOneWithoutColaboradoresNestedInput
    registros?: RegistroUpdateManyWithoutColaboradorNestedInput
  }

  export type ColaboradorUncheckedUpdateWithoutPermisosInput = {
    id?: StringFieldUpdateOperationsInput | string
    empresaId?: StringFieldUpdateOperationsInput | string
    nombre?: StringFieldUpdateOperationsInput | string
    apellido?: StringFieldUpdateOperationsInput | string
    cedula?: StringFieldUpdateOperationsInput | string
    cargo?: NullableStringFieldUpdateOperationsInput | string | null
    email?: NullableStringFieldUpdateOperationsInput | string | null
    telefono?: NullableStringFieldUpdateOperationsInput | string | null
    fechaNacimiento?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    salarioMensual?: FloatFieldUpdateOperationsInput | number
    rostroDescriptor?: NullableJsonNullValueInput | InputJsonValue
    rostroEnroladoEn?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    horarioId?: NullableStringFieldUpdateOperationsInput | string | null
    activo?: BoolFieldUpdateOperationsInput | boolean
    retiroProgramado?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    creadoEn?: DateTimeFieldUpdateOperationsInput | Date | string
    actualizadoEn?: DateTimeFieldUpdateOperationsInput | Date | string
    registros?: RegistroUncheckedUpdateManyWithoutColaboradorNestedInput
  }

  export type EmpresaCreateWithoutFestivosInput = {
    id?: string
    nombre: string
    nit: string
    email: string
    telefono?: string | null
    marcadorToken?: string
    exentaPago?: boolean
    activa?: boolean
    creadoEn?: Date | string
    actualizadoEn?: Date | string
    usuarios?: UsuarioCreateNestedManyWithoutEmpresaInput
    colaboradores?: ColaboradorCreateNestedManyWithoutEmpresaInput
    configuracion?: ConfiguracionCreateNestedManyWithoutEmpresaInput
    suscripcion?: SuscripcionCreateNestedOneWithoutEmpresaInput
    horarios?: HorarioCreateNestedManyWithoutEmpresaInput
    dispositivos?: DispositivoKioscoCreateNestedManyWithoutEmpresaInput
  }

  export type EmpresaUncheckedCreateWithoutFestivosInput = {
    id?: string
    nombre: string
    nit: string
    email: string
    telefono?: string | null
    marcadorToken?: string
    exentaPago?: boolean
    activa?: boolean
    creadoEn?: Date | string
    actualizadoEn?: Date | string
    usuarios?: UsuarioUncheckedCreateNestedManyWithoutEmpresaInput
    colaboradores?: ColaboradorUncheckedCreateNestedManyWithoutEmpresaInput
    configuracion?: ConfiguracionUncheckedCreateNestedManyWithoutEmpresaInput
    suscripcion?: SuscripcionUncheckedCreateNestedOneWithoutEmpresaInput
    horarios?: HorarioUncheckedCreateNestedManyWithoutEmpresaInput
    dispositivos?: DispositivoKioscoUncheckedCreateNestedManyWithoutEmpresaInput
  }

  export type EmpresaCreateOrConnectWithoutFestivosInput = {
    where: EmpresaWhereUniqueInput
    create: XOR<EmpresaCreateWithoutFestivosInput, EmpresaUncheckedCreateWithoutFestivosInput>
  }

  export type EmpresaUpsertWithoutFestivosInput = {
    update: XOR<EmpresaUpdateWithoutFestivosInput, EmpresaUncheckedUpdateWithoutFestivosInput>
    create: XOR<EmpresaCreateWithoutFestivosInput, EmpresaUncheckedCreateWithoutFestivosInput>
    where?: EmpresaWhereInput
  }

  export type EmpresaUpdateToOneWithWhereWithoutFestivosInput = {
    where?: EmpresaWhereInput
    data: XOR<EmpresaUpdateWithoutFestivosInput, EmpresaUncheckedUpdateWithoutFestivosInput>
  }

  export type EmpresaUpdateWithoutFestivosInput = {
    id?: StringFieldUpdateOperationsInput | string
    nombre?: StringFieldUpdateOperationsInput | string
    nit?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    telefono?: NullableStringFieldUpdateOperationsInput | string | null
    marcadorToken?: StringFieldUpdateOperationsInput | string
    exentaPago?: BoolFieldUpdateOperationsInput | boolean
    activa?: BoolFieldUpdateOperationsInput | boolean
    creadoEn?: DateTimeFieldUpdateOperationsInput | Date | string
    actualizadoEn?: DateTimeFieldUpdateOperationsInput | Date | string
    usuarios?: UsuarioUpdateManyWithoutEmpresaNestedInput
    colaboradores?: ColaboradorUpdateManyWithoutEmpresaNestedInput
    configuracion?: ConfiguracionUpdateManyWithoutEmpresaNestedInput
    suscripcion?: SuscripcionUpdateOneWithoutEmpresaNestedInput
    horarios?: HorarioUpdateManyWithoutEmpresaNestedInput
    dispositivos?: DispositivoKioscoUpdateManyWithoutEmpresaNestedInput
  }

  export type EmpresaUncheckedUpdateWithoutFestivosInput = {
    id?: StringFieldUpdateOperationsInput | string
    nombre?: StringFieldUpdateOperationsInput | string
    nit?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    telefono?: NullableStringFieldUpdateOperationsInput | string | null
    marcadorToken?: StringFieldUpdateOperationsInput | string
    exentaPago?: BoolFieldUpdateOperationsInput | boolean
    activa?: BoolFieldUpdateOperationsInput | boolean
    creadoEn?: DateTimeFieldUpdateOperationsInput | Date | string
    actualizadoEn?: DateTimeFieldUpdateOperationsInput | Date | string
    usuarios?: UsuarioUncheckedUpdateManyWithoutEmpresaNestedInput
    colaboradores?: ColaboradorUncheckedUpdateManyWithoutEmpresaNestedInput
    configuracion?: ConfiguracionUncheckedUpdateManyWithoutEmpresaNestedInput
    suscripcion?: SuscripcionUncheckedUpdateOneWithoutEmpresaNestedInput
    horarios?: HorarioUncheckedUpdateManyWithoutEmpresaNestedInput
    dispositivos?: DispositivoKioscoUncheckedUpdateManyWithoutEmpresaNestedInput
  }

  export type EmpresaCreateWithoutConfiguracionInput = {
    id?: string
    nombre: string
    nit: string
    email: string
    telefono?: string | null
    marcadorToken?: string
    exentaPago?: boolean
    activa?: boolean
    creadoEn?: Date | string
    actualizadoEn?: Date | string
    usuarios?: UsuarioCreateNestedManyWithoutEmpresaInput
    colaboradores?: ColaboradorCreateNestedManyWithoutEmpresaInput
    festivos?: DiaFestivoCreateNestedManyWithoutEmpresaInput
    suscripcion?: SuscripcionCreateNestedOneWithoutEmpresaInput
    horarios?: HorarioCreateNestedManyWithoutEmpresaInput
    dispositivos?: DispositivoKioscoCreateNestedManyWithoutEmpresaInput
  }

  export type EmpresaUncheckedCreateWithoutConfiguracionInput = {
    id?: string
    nombre: string
    nit: string
    email: string
    telefono?: string | null
    marcadorToken?: string
    exentaPago?: boolean
    activa?: boolean
    creadoEn?: Date | string
    actualizadoEn?: Date | string
    usuarios?: UsuarioUncheckedCreateNestedManyWithoutEmpresaInput
    colaboradores?: ColaboradorUncheckedCreateNestedManyWithoutEmpresaInput
    festivos?: DiaFestivoUncheckedCreateNestedManyWithoutEmpresaInput
    suscripcion?: SuscripcionUncheckedCreateNestedOneWithoutEmpresaInput
    horarios?: HorarioUncheckedCreateNestedManyWithoutEmpresaInput
    dispositivos?: DispositivoKioscoUncheckedCreateNestedManyWithoutEmpresaInput
  }

  export type EmpresaCreateOrConnectWithoutConfiguracionInput = {
    where: EmpresaWhereUniqueInput
    create: XOR<EmpresaCreateWithoutConfiguracionInput, EmpresaUncheckedCreateWithoutConfiguracionInput>
  }

  export type EmpresaUpsertWithoutConfiguracionInput = {
    update: XOR<EmpresaUpdateWithoutConfiguracionInput, EmpresaUncheckedUpdateWithoutConfiguracionInput>
    create: XOR<EmpresaCreateWithoutConfiguracionInput, EmpresaUncheckedCreateWithoutConfiguracionInput>
    where?: EmpresaWhereInput
  }

  export type EmpresaUpdateToOneWithWhereWithoutConfiguracionInput = {
    where?: EmpresaWhereInput
    data: XOR<EmpresaUpdateWithoutConfiguracionInput, EmpresaUncheckedUpdateWithoutConfiguracionInput>
  }

  export type EmpresaUpdateWithoutConfiguracionInput = {
    id?: StringFieldUpdateOperationsInput | string
    nombre?: StringFieldUpdateOperationsInput | string
    nit?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    telefono?: NullableStringFieldUpdateOperationsInput | string | null
    marcadorToken?: StringFieldUpdateOperationsInput | string
    exentaPago?: BoolFieldUpdateOperationsInput | boolean
    activa?: BoolFieldUpdateOperationsInput | boolean
    creadoEn?: DateTimeFieldUpdateOperationsInput | Date | string
    actualizadoEn?: DateTimeFieldUpdateOperationsInput | Date | string
    usuarios?: UsuarioUpdateManyWithoutEmpresaNestedInput
    colaboradores?: ColaboradorUpdateManyWithoutEmpresaNestedInput
    festivos?: DiaFestivoUpdateManyWithoutEmpresaNestedInput
    suscripcion?: SuscripcionUpdateOneWithoutEmpresaNestedInput
    horarios?: HorarioUpdateManyWithoutEmpresaNestedInput
    dispositivos?: DispositivoKioscoUpdateManyWithoutEmpresaNestedInput
  }

  export type EmpresaUncheckedUpdateWithoutConfiguracionInput = {
    id?: StringFieldUpdateOperationsInput | string
    nombre?: StringFieldUpdateOperationsInput | string
    nit?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    telefono?: NullableStringFieldUpdateOperationsInput | string | null
    marcadorToken?: StringFieldUpdateOperationsInput | string
    exentaPago?: BoolFieldUpdateOperationsInput | boolean
    activa?: BoolFieldUpdateOperationsInput | boolean
    creadoEn?: DateTimeFieldUpdateOperationsInput | Date | string
    actualizadoEn?: DateTimeFieldUpdateOperationsInput | Date | string
    usuarios?: UsuarioUncheckedUpdateManyWithoutEmpresaNestedInput
    colaboradores?: ColaboradorUncheckedUpdateManyWithoutEmpresaNestedInput
    festivos?: DiaFestivoUncheckedUpdateManyWithoutEmpresaNestedInput
    suscripcion?: SuscripcionUncheckedUpdateOneWithoutEmpresaNestedInput
    horarios?: HorarioUncheckedUpdateManyWithoutEmpresaNestedInput
    dispositivos?: DispositivoKioscoUncheckedUpdateManyWithoutEmpresaNestedInput
  }

  export type EmpresaCreateWithoutUsuariosInput = {
    id?: string
    nombre: string
    nit: string
    email: string
    telefono?: string | null
    marcadorToken?: string
    exentaPago?: boolean
    activa?: boolean
    creadoEn?: Date | string
    actualizadoEn?: Date | string
    colaboradores?: ColaboradorCreateNestedManyWithoutEmpresaInput
    festivos?: DiaFestivoCreateNestedManyWithoutEmpresaInput
    configuracion?: ConfiguracionCreateNestedManyWithoutEmpresaInput
    suscripcion?: SuscripcionCreateNestedOneWithoutEmpresaInput
    horarios?: HorarioCreateNestedManyWithoutEmpresaInput
    dispositivos?: DispositivoKioscoCreateNestedManyWithoutEmpresaInput
  }

  export type EmpresaUncheckedCreateWithoutUsuariosInput = {
    id?: string
    nombre: string
    nit: string
    email: string
    telefono?: string | null
    marcadorToken?: string
    exentaPago?: boolean
    activa?: boolean
    creadoEn?: Date | string
    actualizadoEn?: Date | string
    colaboradores?: ColaboradorUncheckedCreateNestedManyWithoutEmpresaInput
    festivos?: DiaFestivoUncheckedCreateNestedManyWithoutEmpresaInput
    configuracion?: ConfiguracionUncheckedCreateNestedManyWithoutEmpresaInput
    suscripcion?: SuscripcionUncheckedCreateNestedOneWithoutEmpresaInput
    horarios?: HorarioUncheckedCreateNestedManyWithoutEmpresaInput
    dispositivos?: DispositivoKioscoUncheckedCreateNestedManyWithoutEmpresaInput
  }

  export type EmpresaCreateOrConnectWithoutUsuariosInput = {
    where: EmpresaWhereUniqueInput
    create: XOR<EmpresaCreateWithoutUsuariosInput, EmpresaUncheckedCreateWithoutUsuariosInput>
  }

  export type EmpresaUpsertWithoutUsuariosInput = {
    update: XOR<EmpresaUpdateWithoutUsuariosInput, EmpresaUncheckedUpdateWithoutUsuariosInput>
    create: XOR<EmpresaCreateWithoutUsuariosInput, EmpresaUncheckedCreateWithoutUsuariosInput>
    where?: EmpresaWhereInput
  }

  export type EmpresaUpdateToOneWithWhereWithoutUsuariosInput = {
    where?: EmpresaWhereInput
    data: XOR<EmpresaUpdateWithoutUsuariosInput, EmpresaUncheckedUpdateWithoutUsuariosInput>
  }

  export type EmpresaUpdateWithoutUsuariosInput = {
    id?: StringFieldUpdateOperationsInput | string
    nombre?: StringFieldUpdateOperationsInput | string
    nit?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    telefono?: NullableStringFieldUpdateOperationsInput | string | null
    marcadorToken?: StringFieldUpdateOperationsInput | string
    exentaPago?: BoolFieldUpdateOperationsInput | boolean
    activa?: BoolFieldUpdateOperationsInput | boolean
    creadoEn?: DateTimeFieldUpdateOperationsInput | Date | string
    actualizadoEn?: DateTimeFieldUpdateOperationsInput | Date | string
    colaboradores?: ColaboradorUpdateManyWithoutEmpresaNestedInput
    festivos?: DiaFestivoUpdateManyWithoutEmpresaNestedInput
    configuracion?: ConfiguracionUpdateManyWithoutEmpresaNestedInput
    suscripcion?: SuscripcionUpdateOneWithoutEmpresaNestedInput
    horarios?: HorarioUpdateManyWithoutEmpresaNestedInput
    dispositivos?: DispositivoKioscoUpdateManyWithoutEmpresaNestedInput
  }

  export type EmpresaUncheckedUpdateWithoutUsuariosInput = {
    id?: StringFieldUpdateOperationsInput | string
    nombre?: StringFieldUpdateOperationsInput | string
    nit?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    telefono?: NullableStringFieldUpdateOperationsInput | string | null
    marcadorToken?: StringFieldUpdateOperationsInput | string
    exentaPago?: BoolFieldUpdateOperationsInput | boolean
    activa?: BoolFieldUpdateOperationsInput | boolean
    creadoEn?: DateTimeFieldUpdateOperationsInput | Date | string
    actualizadoEn?: DateTimeFieldUpdateOperationsInput | Date | string
    colaboradores?: ColaboradorUncheckedUpdateManyWithoutEmpresaNestedInput
    festivos?: DiaFestivoUncheckedUpdateManyWithoutEmpresaNestedInput
    configuracion?: ConfiguracionUncheckedUpdateManyWithoutEmpresaNestedInput
    suscripcion?: SuscripcionUncheckedUpdateOneWithoutEmpresaNestedInput
    horarios?: HorarioUncheckedUpdateManyWithoutEmpresaNestedInput
    dispositivos?: DispositivoKioscoUncheckedUpdateManyWithoutEmpresaNestedInput
  }

  export type UsuarioCreateManyEmpresaInput = {
    id?: string
    email: string
    password: string
    nombre: string
    rol?: $Enums.Rol
    activo?: boolean
    resetToken?: string | null
    resetExpira?: Date | string | null
    emailVerificado?: boolean
    verificacionCodigo?: string | null
    verificacionExpira?: Date | string | null
    creadoEn?: Date | string
  }

  export type ColaboradorCreateManyEmpresaInput = {
    id?: string
    nombre: string
    apellido: string
    cedula: string
    cargo?: string | null
    email?: string | null
    telefono?: string | null
    fechaNacimiento?: Date | string | null
    salarioMensual: number
    rostroDescriptor?: NullableJsonNullValueInput | InputJsonValue
    rostroEnroladoEn?: Date | string | null
    horarioId?: string | null
    activo?: boolean
    retiroProgramado?: Date | string | null
    creadoEn?: Date | string
    actualizadoEn?: Date | string
  }

  export type DiaFestivoCreateManyEmpresaInput = {
    id?: string
    fecha: Date | string
    nombre: string
    creadoEn?: Date | string
  }

  export type ConfiguracionCreateManyEmpresaInput = {
    id?: string
    clave: string
    valor: string
  }

  export type HorarioCreateManyEmpresaInput = {
    id?: string
    nombre: string
    toleranciaMin?: number
    activo?: boolean
    creadoEn?: Date | string
  }

  export type DispositivoKioscoCreateManyEmpresaInput = {
    id?: string
    nombre: string
    token: string
    creadoEn?: Date | string
    ultimoUso?: Date | string | null
  }

  export type UsuarioUpdateWithoutEmpresaInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    password?: StringFieldUpdateOperationsInput | string
    nombre?: StringFieldUpdateOperationsInput | string
    rol?: EnumRolFieldUpdateOperationsInput | $Enums.Rol
    activo?: BoolFieldUpdateOperationsInput | boolean
    resetToken?: NullableStringFieldUpdateOperationsInput | string | null
    resetExpira?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    emailVerificado?: BoolFieldUpdateOperationsInput | boolean
    verificacionCodigo?: NullableStringFieldUpdateOperationsInput | string | null
    verificacionExpira?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    creadoEn?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type UsuarioUncheckedUpdateWithoutEmpresaInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    password?: StringFieldUpdateOperationsInput | string
    nombre?: StringFieldUpdateOperationsInput | string
    rol?: EnumRolFieldUpdateOperationsInput | $Enums.Rol
    activo?: BoolFieldUpdateOperationsInput | boolean
    resetToken?: NullableStringFieldUpdateOperationsInput | string | null
    resetExpira?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    emailVerificado?: BoolFieldUpdateOperationsInput | boolean
    verificacionCodigo?: NullableStringFieldUpdateOperationsInput | string | null
    verificacionExpira?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    creadoEn?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type UsuarioUncheckedUpdateManyWithoutEmpresaInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    password?: StringFieldUpdateOperationsInput | string
    nombre?: StringFieldUpdateOperationsInput | string
    rol?: EnumRolFieldUpdateOperationsInput | $Enums.Rol
    activo?: BoolFieldUpdateOperationsInput | boolean
    resetToken?: NullableStringFieldUpdateOperationsInput | string | null
    resetExpira?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    emailVerificado?: BoolFieldUpdateOperationsInput | boolean
    verificacionCodigo?: NullableStringFieldUpdateOperationsInput | string | null
    verificacionExpira?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    creadoEn?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ColaboradorUpdateWithoutEmpresaInput = {
    id?: StringFieldUpdateOperationsInput | string
    nombre?: StringFieldUpdateOperationsInput | string
    apellido?: StringFieldUpdateOperationsInput | string
    cedula?: StringFieldUpdateOperationsInput | string
    cargo?: NullableStringFieldUpdateOperationsInput | string | null
    email?: NullableStringFieldUpdateOperationsInput | string | null
    telefono?: NullableStringFieldUpdateOperationsInput | string | null
    fechaNacimiento?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    salarioMensual?: FloatFieldUpdateOperationsInput | number
    rostroDescriptor?: NullableJsonNullValueInput | InputJsonValue
    rostroEnroladoEn?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    activo?: BoolFieldUpdateOperationsInput | boolean
    retiroProgramado?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    creadoEn?: DateTimeFieldUpdateOperationsInput | Date | string
    actualizadoEn?: DateTimeFieldUpdateOperationsInput | Date | string
    horario?: HorarioUpdateOneWithoutColaboradoresNestedInput
    registros?: RegistroUpdateManyWithoutColaboradorNestedInput
    permisos?: PermisoUpdateManyWithoutColaboradorNestedInput
  }

  export type ColaboradorUncheckedUpdateWithoutEmpresaInput = {
    id?: StringFieldUpdateOperationsInput | string
    nombre?: StringFieldUpdateOperationsInput | string
    apellido?: StringFieldUpdateOperationsInput | string
    cedula?: StringFieldUpdateOperationsInput | string
    cargo?: NullableStringFieldUpdateOperationsInput | string | null
    email?: NullableStringFieldUpdateOperationsInput | string | null
    telefono?: NullableStringFieldUpdateOperationsInput | string | null
    fechaNacimiento?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    salarioMensual?: FloatFieldUpdateOperationsInput | number
    rostroDescriptor?: NullableJsonNullValueInput | InputJsonValue
    rostroEnroladoEn?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    horarioId?: NullableStringFieldUpdateOperationsInput | string | null
    activo?: BoolFieldUpdateOperationsInput | boolean
    retiroProgramado?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    creadoEn?: DateTimeFieldUpdateOperationsInput | Date | string
    actualizadoEn?: DateTimeFieldUpdateOperationsInput | Date | string
    registros?: RegistroUncheckedUpdateManyWithoutColaboradorNestedInput
    permisos?: PermisoUncheckedUpdateManyWithoutColaboradorNestedInput
  }

  export type ColaboradorUncheckedUpdateManyWithoutEmpresaInput = {
    id?: StringFieldUpdateOperationsInput | string
    nombre?: StringFieldUpdateOperationsInput | string
    apellido?: StringFieldUpdateOperationsInput | string
    cedula?: StringFieldUpdateOperationsInput | string
    cargo?: NullableStringFieldUpdateOperationsInput | string | null
    email?: NullableStringFieldUpdateOperationsInput | string | null
    telefono?: NullableStringFieldUpdateOperationsInput | string | null
    fechaNacimiento?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    salarioMensual?: FloatFieldUpdateOperationsInput | number
    rostroDescriptor?: NullableJsonNullValueInput | InputJsonValue
    rostroEnroladoEn?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    horarioId?: NullableStringFieldUpdateOperationsInput | string | null
    activo?: BoolFieldUpdateOperationsInput | boolean
    retiroProgramado?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    creadoEn?: DateTimeFieldUpdateOperationsInput | Date | string
    actualizadoEn?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type DiaFestivoUpdateWithoutEmpresaInput = {
    id?: StringFieldUpdateOperationsInput | string
    fecha?: DateTimeFieldUpdateOperationsInput | Date | string
    nombre?: StringFieldUpdateOperationsInput | string
    creadoEn?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type DiaFestivoUncheckedUpdateWithoutEmpresaInput = {
    id?: StringFieldUpdateOperationsInput | string
    fecha?: DateTimeFieldUpdateOperationsInput | Date | string
    nombre?: StringFieldUpdateOperationsInput | string
    creadoEn?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type DiaFestivoUncheckedUpdateManyWithoutEmpresaInput = {
    id?: StringFieldUpdateOperationsInput | string
    fecha?: DateTimeFieldUpdateOperationsInput | Date | string
    nombre?: StringFieldUpdateOperationsInput | string
    creadoEn?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ConfiguracionUpdateWithoutEmpresaInput = {
    id?: StringFieldUpdateOperationsInput | string
    clave?: StringFieldUpdateOperationsInput | string
    valor?: StringFieldUpdateOperationsInput | string
  }

  export type ConfiguracionUncheckedUpdateWithoutEmpresaInput = {
    id?: StringFieldUpdateOperationsInput | string
    clave?: StringFieldUpdateOperationsInput | string
    valor?: StringFieldUpdateOperationsInput | string
  }

  export type ConfiguracionUncheckedUpdateManyWithoutEmpresaInput = {
    id?: StringFieldUpdateOperationsInput | string
    clave?: StringFieldUpdateOperationsInput | string
    valor?: StringFieldUpdateOperationsInput | string
  }

  export type HorarioUpdateWithoutEmpresaInput = {
    id?: StringFieldUpdateOperationsInput | string
    nombre?: StringFieldUpdateOperationsInput | string
    toleranciaMin?: IntFieldUpdateOperationsInput | number
    activo?: BoolFieldUpdateOperationsInput | boolean
    creadoEn?: DateTimeFieldUpdateOperationsInput | Date | string
    franjas?: FranjaHorarioUpdateManyWithoutHorarioNestedInput
    colaboradores?: ColaboradorUpdateManyWithoutHorarioNestedInput
  }

  export type HorarioUncheckedUpdateWithoutEmpresaInput = {
    id?: StringFieldUpdateOperationsInput | string
    nombre?: StringFieldUpdateOperationsInput | string
    toleranciaMin?: IntFieldUpdateOperationsInput | number
    activo?: BoolFieldUpdateOperationsInput | boolean
    creadoEn?: DateTimeFieldUpdateOperationsInput | Date | string
    franjas?: FranjaHorarioUncheckedUpdateManyWithoutHorarioNestedInput
    colaboradores?: ColaboradorUncheckedUpdateManyWithoutHorarioNestedInput
  }

  export type HorarioUncheckedUpdateManyWithoutEmpresaInput = {
    id?: StringFieldUpdateOperationsInput | string
    nombre?: StringFieldUpdateOperationsInput | string
    toleranciaMin?: IntFieldUpdateOperationsInput | number
    activo?: BoolFieldUpdateOperationsInput | boolean
    creadoEn?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type DispositivoKioscoUpdateWithoutEmpresaInput = {
    id?: StringFieldUpdateOperationsInput | string
    nombre?: StringFieldUpdateOperationsInput | string
    token?: StringFieldUpdateOperationsInput | string
    creadoEn?: DateTimeFieldUpdateOperationsInput | Date | string
    ultimoUso?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type DispositivoKioscoUncheckedUpdateWithoutEmpresaInput = {
    id?: StringFieldUpdateOperationsInput | string
    nombre?: StringFieldUpdateOperationsInput | string
    token?: StringFieldUpdateOperationsInput | string
    creadoEn?: DateTimeFieldUpdateOperationsInput | Date | string
    ultimoUso?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type DispositivoKioscoUncheckedUpdateManyWithoutEmpresaInput = {
    id?: StringFieldUpdateOperationsInput | string
    nombre?: StringFieldUpdateOperationsInput | string
    token?: StringFieldUpdateOperationsInput | string
    creadoEn?: DateTimeFieldUpdateOperationsInput | Date | string
    ultimoUso?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type PagoCreateManySuscripcionInput = {
    id?: string
    monto: number
    colaboradoresFacturados: number
    periodoInicio: Date | string
    periodoFin: Date | string
    metodo: $Enums.MetodoPago
    estado?: $Enums.EstadoPago
    wompiTransaccionId?: string | null
    nota?: string | null
    comprobanteBase64?: string | null
    registradoPor?: string | null
    creadoEn?: Date | string
  }

  export type PagoUpdateWithoutSuscripcionInput = {
    id?: StringFieldUpdateOperationsInput | string
    monto?: FloatFieldUpdateOperationsInput | number
    colaboradoresFacturados?: IntFieldUpdateOperationsInput | number
    periodoInicio?: DateTimeFieldUpdateOperationsInput | Date | string
    periodoFin?: DateTimeFieldUpdateOperationsInput | Date | string
    metodo?: EnumMetodoPagoFieldUpdateOperationsInput | $Enums.MetodoPago
    estado?: EnumEstadoPagoFieldUpdateOperationsInput | $Enums.EstadoPago
    wompiTransaccionId?: NullableStringFieldUpdateOperationsInput | string | null
    nota?: NullableStringFieldUpdateOperationsInput | string | null
    comprobanteBase64?: NullableStringFieldUpdateOperationsInput | string | null
    registradoPor?: NullableStringFieldUpdateOperationsInput | string | null
    creadoEn?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type PagoUncheckedUpdateWithoutSuscripcionInput = {
    id?: StringFieldUpdateOperationsInput | string
    monto?: FloatFieldUpdateOperationsInput | number
    colaboradoresFacturados?: IntFieldUpdateOperationsInput | number
    periodoInicio?: DateTimeFieldUpdateOperationsInput | Date | string
    periodoFin?: DateTimeFieldUpdateOperationsInput | Date | string
    metodo?: EnumMetodoPagoFieldUpdateOperationsInput | $Enums.MetodoPago
    estado?: EnumEstadoPagoFieldUpdateOperationsInput | $Enums.EstadoPago
    wompiTransaccionId?: NullableStringFieldUpdateOperationsInput | string | null
    nota?: NullableStringFieldUpdateOperationsInput | string | null
    comprobanteBase64?: NullableStringFieldUpdateOperationsInput | string | null
    registradoPor?: NullableStringFieldUpdateOperationsInput | string | null
    creadoEn?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type PagoUncheckedUpdateManyWithoutSuscripcionInput = {
    id?: StringFieldUpdateOperationsInput | string
    monto?: FloatFieldUpdateOperationsInput | number
    colaboradoresFacturados?: IntFieldUpdateOperationsInput | number
    periodoInicio?: DateTimeFieldUpdateOperationsInput | Date | string
    periodoFin?: DateTimeFieldUpdateOperationsInput | Date | string
    metodo?: EnumMetodoPagoFieldUpdateOperationsInput | $Enums.MetodoPago
    estado?: EnumEstadoPagoFieldUpdateOperationsInput | $Enums.EstadoPago
    wompiTransaccionId?: NullableStringFieldUpdateOperationsInput | string | null
    nota?: NullableStringFieldUpdateOperationsInput | string | null
    comprobanteBase64?: NullableStringFieldUpdateOperationsInput | string | null
    registradoPor?: NullableStringFieldUpdateOperationsInput | string | null
    creadoEn?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type FranjaHorarioCreateManyHorarioInput = {
    id?: string
    dias: JsonNullValueInput | InputJsonValue
    horaEntrada: string
    horaSalida: string
  }

  export type ColaboradorCreateManyHorarioInput = {
    id?: string
    empresaId: string
    nombre: string
    apellido: string
    cedula: string
    cargo?: string | null
    email?: string | null
    telefono?: string | null
    fechaNacimiento?: Date | string | null
    salarioMensual: number
    rostroDescriptor?: NullableJsonNullValueInput | InputJsonValue
    rostroEnroladoEn?: Date | string | null
    activo?: boolean
    retiroProgramado?: Date | string | null
    creadoEn?: Date | string
    actualizadoEn?: Date | string
  }

  export type FranjaHorarioUpdateWithoutHorarioInput = {
    id?: StringFieldUpdateOperationsInput | string
    dias?: JsonNullValueInput | InputJsonValue
    horaEntrada?: StringFieldUpdateOperationsInput | string
    horaSalida?: StringFieldUpdateOperationsInput | string
  }

  export type FranjaHorarioUncheckedUpdateWithoutHorarioInput = {
    id?: StringFieldUpdateOperationsInput | string
    dias?: JsonNullValueInput | InputJsonValue
    horaEntrada?: StringFieldUpdateOperationsInput | string
    horaSalida?: StringFieldUpdateOperationsInput | string
  }

  export type FranjaHorarioUncheckedUpdateManyWithoutHorarioInput = {
    id?: StringFieldUpdateOperationsInput | string
    dias?: JsonNullValueInput | InputJsonValue
    horaEntrada?: StringFieldUpdateOperationsInput | string
    horaSalida?: StringFieldUpdateOperationsInput | string
  }

  export type ColaboradorUpdateWithoutHorarioInput = {
    id?: StringFieldUpdateOperationsInput | string
    nombre?: StringFieldUpdateOperationsInput | string
    apellido?: StringFieldUpdateOperationsInput | string
    cedula?: StringFieldUpdateOperationsInput | string
    cargo?: NullableStringFieldUpdateOperationsInput | string | null
    email?: NullableStringFieldUpdateOperationsInput | string | null
    telefono?: NullableStringFieldUpdateOperationsInput | string | null
    fechaNacimiento?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    salarioMensual?: FloatFieldUpdateOperationsInput | number
    rostroDescriptor?: NullableJsonNullValueInput | InputJsonValue
    rostroEnroladoEn?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    activo?: BoolFieldUpdateOperationsInput | boolean
    retiroProgramado?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    creadoEn?: DateTimeFieldUpdateOperationsInput | Date | string
    actualizadoEn?: DateTimeFieldUpdateOperationsInput | Date | string
    empresa?: EmpresaUpdateOneRequiredWithoutColaboradoresNestedInput
    registros?: RegistroUpdateManyWithoutColaboradorNestedInput
    permisos?: PermisoUpdateManyWithoutColaboradorNestedInput
  }

  export type ColaboradorUncheckedUpdateWithoutHorarioInput = {
    id?: StringFieldUpdateOperationsInput | string
    empresaId?: StringFieldUpdateOperationsInput | string
    nombre?: StringFieldUpdateOperationsInput | string
    apellido?: StringFieldUpdateOperationsInput | string
    cedula?: StringFieldUpdateOperationsInput | string
    cargo?: NullableStringFieldUpdateOperationsInput | string | null
    email?: NullableStringFieldUpdateOperationsInput | string | null
    telefono?: NullableStringFieldUpdateOperationsInput | string | null
    fechaNacimiento?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    salarioMensual?: FloatFieldUpdateOperationsInput | number
    rostroDescriptor?: NullableJsonNullValueInput | InputJsonValue
    rostroEnroladoEn?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    activo?: BoolFieldUpdateOperationsInput | boolean
    retiroProgramado?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    creadoEn?: DateTimeFieldUpdateOperationsInput | Date | string
    actualizadoEn?: DateTimeFieldUpdateOperationsInput | Date | string
    registros?: RegistroUncheckedUpdateManyWithoutColaboradorNestedInput
    permisos?: PermisoUncheckedUpdateManyWithoutColaboradorNestedInput
  }

  export type ColaboradorUncheckedUpdateManyWithoutHorarioInput = {
    id?: StringFieldUpdateOperationsInput | string
    empresaId?: StringFieldUpdateOperationsInput | string
    nombre?: StringFieldUpdateOperationsInput | string
    apellido?: StringFieldUpdateOperationsInput | string
    cedula?: StringFieldUpdateOperationsInput | string
    cargo?: NullableStringFieldUpdateOperationsInput | string | null
    email?: NullableStringFieldUpdateOperationsInput | string | null
    telefono?: NullableStringFieldUpdateOperationsInput | string | null
    fechaNacimiento?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    salarioMensual?: FloatFieldUpdateOperationsInput | number
    rostroDescriptor?: NullableJsonNullValueInput | InputJsonValue
    rostroEnroladoEn?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    activo?: BoolFieldUpdateOperationsInput | boolean
    retiroProgramado?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    creadoEn?: DateTimeFieldUpdateOperationsInput | Date | string
    actualizadoEn?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type RegistroCreateManyColaboradorInput = {
    id?: string
    fecha: Date | string
    entrada?: Date | string | null
    salida?: Date | string | null
    tipo?: $Enums.TipoRegistro
    observacion?: string | null
    fotoEntrada?: string | null
    fotoSalida?: string | null
    editadoPor?: string | null
    editadoEn?: Date | string | null
    creadoEn?: Date | string
  }

  export type PermisoCreateManyColaboradorInput = {
    id?: string
    fechaInicio: Date | string
    fechaFin: Date | string
    tipo: $Enums.TipoPermiso
    descripcion?: string | null
    aprobado?: boolean
    creadoEn?: Date | string
  }

  export type RegistroUpdateWithoutColaboradorInput = {
    id?: StringFieldUpdateOperationsInput | string
    fecha?: DateTimeFieldUpdateOperationsInput | Date | string
    entrada?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    salida?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    tipo?: EnumTipoRegistroFieldUpdateOperationsInput | $Enums.TipoRegistro
    observacion?: NullableStringFieldUpdateOperationsInput | string | null
    fotoEntrada?: NullableStringFieldUpdateOperationsInput | string | null
    fotoSalida?: NullableStringFieldUpdateOperationsInput | string | null
    editadoPor?: NullableStringFieldUpdateOperationsInput | string | null
    editadoEn?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    creadoEn?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type RegistroUncheckedUpdateWithoutColaboradorInput = {
    id?: StringFieldUpdateOperationsInput | string
    fecha?: DateTimeFieldUpdateOperationsInput | Date | string
    entrada?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    salida?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    tipo?: EnumTipoRegistroFieldUpdateOperationsInput | $Enums.TipoRegistro
    observacion?: NullableStringFieldUpdateOperationsInput | string | null
    fotoEntrada?: NullableStringFieldUpdateOperationsInput | string | null
    fotoSalida?: NullableStringFieldUpdateOperationsInput | string | null
    editadoPor?: NullableStringFieldUpdateOperationsInput | string | null
    editadoEn?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    creadoEn?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type RegistroUncheckedUpdateManyWithoutColaboradorInput = {
    id?: StringFieldUpdateOperationsInput | string
    fecha?: DateTimeFieldUpdateOperationsInput | Date | string
    entrada?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    salida?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    tipo?: EnumTipoRegistroFieldUpdateOperationsInput | $Enums.TipoRegistro
    observacion?: NullableStringFieldUpdateOperationsInput | string | null
    fotoEntrada?: NullableStringFieldUpdateOperationsInput | string | null
    fotoSalida?: NullableStringFieldUpdateOperationsInput | string | null
    editadoPor?: NullableStringFieldUpdateOperationsInput | string | null
    editadoEn?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    creadoEn?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type PermisoUpdateWithoutColaboradorInput = {
    id?: StringFieldUpdateOperationsInput | string
    fechaInicio?: DateTimeFieldUpdateOperationsInput | Date | string
    fechaFin?: DateTimeFieldUpdateOperationsInput | Date | string
    tipo?: EnumTipoPermisoFieldUpdateOperationsInput | $Enums.TipoPermiso
    descripcion?: NullableStringFieldUpdateOperationsInput | string | null
    aprobado?: BoolFieldUpdateOperationsInput | boolean
    creadoEn?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type PermisoUncheckedUpdateWithoutColaboradorInput = {
    id?: StringFieldUpdateOperationsInput | string
    fechaInicio?: DateTimeFieldUpdateOperationsInput | Date | string
    fechaFin?: DateTimeFieldUpdateOperationsInput | Date | string
    tipo?: EnumTipoPermisoFieldUpdateOperationsInput | $Enums.TipoPermiso
    descripcion?: NullableStringFieldUpdateOperationsInput | string | null
    aprobado?: BoolFieldUpdateOperationsInput | boolean
    creadoEn?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type PermisoUncheckedUpdateManyWithoutColaboradorInput = {
    id?: StringFieldUpdateOperationsInput | string
    fechaInicio?: DateTimeFieldUpdateOperationsInput | Date | string
    fechaFin?: DateTimeFieldUpdateOperationsInput | Date | string
    tipo?: EnumTipoPermisoFieldUpdateOperationsInput | $Enums.TipoPermiso
    descripcion?: NullableStringFieldUpdateOperationsInput | string | null
    aprobado?: BoolFieldUpdateOperationsInput | boolean
    creadoEn?: DateTimeFieldUpdateOperationsInput | Date | string
  }



  /**
   * Aliases for legacy arg types
   */
    /**
     * @deprecated Use EmpresaCountOutputTypeDefaultArgs instead
     */
    export type EmpresaCountOutputTypeArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = EmpresaCountOutputTypeDefaultArgs<ExtArgs>
    /**
     * @deprecated Use SuscripcionCountOutputTypeDefaultArgs instead
     */
    export type SuscripcionCountOutputTypeArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = SuscripcionCountOutputTypeDefaultArgs<ExtArgs>
    /**
     * @deprecated Use HorarioCountOutputTypeDefaultArgs instead
     */
    export type HorarioCountOutputTypeArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = HorarioCountOutputTypeDefaultArgs<ExtArgs>
    /**
     * @deprecated Use ColaboradorCountOutputTypeDefaultArgs instead
     */
    export type ColaboradorCountOutputTypeArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = ColaboradorCountOutputTypeDefaultArgs<ExtArgs>
    /**
     * @deprecated Use EmpresaDefaultArgs instead
     */
    export type EmpresaArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = EmpresaDefaultArgs<ExtArgs>
    /**
     * @deprecated Use SuscripcionDefaultArgs instead
     */
    export type SuscripcionArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = SuscripcionDefaultArgs<ExtArgs>
    /**
     * @deprecated Use PagoDefaultArgs instead
     */
    export type PagoArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = PagoDefaultArgs<ExtArgs>
    /**
     * @deprecated Use ConfiguracionPlataformaDefaultArgs instead
     */
    export type ConfiguracionPlataformaArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = ConfiguracionPlataformaDefaultArgs<ExtArgs>
    /**
     * @deprecated Use JornadaVigenciaDefaultArgs instead
     */
    export type JornadaVigenciaArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = JornadaVigenciaDefaultArgs<ExtArgs>
    /**
     * @deprecated Use TipoHoraDefaultArgs instead
     */
    export type TipoHoraArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = TipoHoraDefaultArgs<ExtArgs>
    /**
     * @deprecated Use HorarioDefaultArgs instead
     */
    export type HorarioArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = HorarioDefaultArgs<ExtArgs>
    /**
     * @deprecated Use FranjaHorarioDefaultArgs instead
     */
    export type FranjaHorarioArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = FranjaHorarioDefaultArgs<ExtArgs>
    /**
     * @deprecated Use DispositivoKioscoDefaultArgs instead
     */
    export type DispositivoKioscoArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = DispositivoKioscoDefaultArgs<ExtArgs>
    /**
     * @deprecated Use ColaboradorDefaultArgs instead
     */
    export type ColaboradorArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = ColaboradorDefaultArgs<ExtArgs>
    /**
     * @deprecated Use RegistroDefaultArgs instead
     */
    export type RegistroArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = RegistroDefaultArgs<ExtArgs>
    /**
     * @deprecated Use PermisoDefaultArgs instead
     */
    export type PermisoArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = PermisoDefaultArgs<ExtArgs>
    /**
     * @deprecated Use DiaFestivoDefaultArgs instead
     */
    export type DiaFestivoArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = DiaFestivoDefaultArgs<ExtArgs>
    /**
     * @deprecated Use ConfiguracionDefaultArgs instead
     */
    export type ConfiguracionArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = ConfiguracionDefaultArgs<ExtArgs>
    /**
     * @deprecated Use UsuarioDefaultArgs instead
     */
    export type UsuarioArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = UsuarioDefaultArgs<ExtArgs>

  /**
   * Batch Payload for updateMany & deleteMany & createMany
   */

  export type BatchPayload = {
    count: number
  }

  /**
   * DMMF
   */
  export const dmmf: runtime.BaseDMMF
}