// El auxilio de transporte: cuánto le toca a una persona en un rango (17 de septiembre de 2026).
//
// NO es salario, y por eso vive fuera del valor de la hora. El valor de la hora se calcula sobre el
// salario BÁSICO (`calcularValorHora`, horasColombiana.ts); si el auxilio se mete dentro del salario
// para que aparezca en algún reporte, cada hora extra y cada recargo salen 14,2% más caros
// (249.095 sobre 1.750.905). Ese era el estado del producto hasta hoy.
//
// Dónde SÍ entra, para cuando se haga la liquidación de contrato: cesantías, intereses de cesantías
// y prima. Dónde NO: seguridad social, parafiscales y vacaciones.

// El valor y el tope los fija un decreto cada enero. Viajan como dato, no como constante, para que
// un reporte de diciembre siga mostrando el valor de diciembre. Mismo mecanismo que la jornada legal
// y los recargos (utils/vigencias.ts); no se inventa otro.
export type VigenciaAuxilio = {
  vigenteDesde: Date;
  valor: number;
  // Salario máximo con derecho al auxilio: dos salarios mínimos.
  tope: number;
};

// La vigencia que regía en esa fecha. `null` si no hay ninguna sembrada todavía: sin dato no se
// paga, que es lo conservador cuando lo que está en juego es plata de un trabajador.
export function auxilioVigente(fecha: Date, vigencias: VigenciaAuxilio[]): VigenciaAuxilio | null {
  const aplicables = vigencias
    .filter(v => v.vigenteDesde <= fecha)
    .sort((a, b) => b.vigenteDesde.getTime() - a.vigenteDesde.getTime());
  return aplicables[0] ?? null;
}

export type DatosDelAuxilio = {
  salarioBasico: number;
  // Lo que se guarda en la ficha de la persona:
  //   null  = el del decreto, si su básico da derecho (el caso normal, y el que no hay que
  //           actualizar cada enero persona por persona)
  //   0     = esta empresa no lo paga (da ruta propia, por ejemplo)
  //   otro  = un valor pactado por encima o por debajo del decreto
  auxilioPersona: number | null;
  // Días en que la persona EFECTIVAMENTE viajó al trabajo. No son los días del rango ni los que
  // debía trabajar: el auxilio cubre el desplazamiento, así que vacaciones, incapacidad y licencia
  // no cuentan aunque estén justificadas.
  diasConDesplazamiento: number;
};

// El mes de nómina son 30 días, igual que para el salario. Un rango del 1 al 31 no paga 31
// treintavos de auxilio.
const DIAS_DEL_MES_DE_NOMINA = 30;

export function auxilioDelPeriodo(datos: DatosDelAuxilio, vigencia: VigenciaAuxilio | null): number {
  const mensual = valorMensual(datos, vigencia);
  if (mensual <= 0) return 0;

  // Nunca menos de cero ni más de un mes: unos días negativos (un rango al revés) no pueden restar
  // plata, y un rango largo no puede pagar dos auxilios.
  const dias = Math.min(DIAS_DEL_MES_DE_NOMINA, Math.max(0, datos.diasConDesplazamiento));

  // Se multiplica ANTES de dividir. Al revés, `(249095 / 30) * 30` da 249094,99999999997: el mes
  // completo salía un céntimo corto. Es la misma cola de coma flotante que obligó al motor de horas
  // a sumar minutos crudos en vez de horas redondeadas (liquidarRegistros.ts).
  return (mensual * dias) / DIAS_DEL_MES_DE_NOMINA;
}

// Cuánto es el auxilio mensual de esta persona, antes de prorratear.
function valorMensual(datos: DatosDelAuxilio, vigencia: VigenciaAuxilio | null): number {
  // Un valor guardado en la ficha manda sobre el decreto, incluso el cero: es un acuerdo de la
  // empresa, y por eso tampoco se le aplica el tope de los dos salarios mínimos.
  if (datos.auxilioPersona !== null) return datos.auxilioPersona;

  // Sin vigencia sembrada no se inventa un valor.
  if (!vigencia) return 0;
  if (datos.salarioBasico > vigencia.tope) return 0;
  return vigencia.valor;
}
