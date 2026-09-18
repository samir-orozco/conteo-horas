"use strict";
// El auxilio de transporte: cuánto le toca a una persona en un rango (17 de septiembre de 2026).
//
// NO es salario, y por eso vive fuera del valor de la hora. El valor de la hora se calcula sobre el
// salario BÁSICO (`calcularValorHora`, horasColombiana.ts); si el auxilio se mete dentro del salario
// para que aparezca en algún reporte, cada hora extra y cada recargo salen 14,2% más caros
// (249.095 sobre 1.750.905). Ese era el estado del producto hasta hoy.
//
// Dónde SÍ entra, para cuando se haga la liquidación de contrato: cesantías, intereses de cesantías
// y prima. Dónde NO: seguridad social, parafiscales y vacaciones.
Object.defineProperty(exports, "__esModule", { value: true });
exports.auxilioVigente = auxilioVigente;
exports.auxilioDelPeriodo = auxilioDelPeriodo;
// La vigencia que regía en esa fecha. `null` si no hay ninguna sembrada todavía: sin dato no se
// paga, que es lo conservador cuando lo que está en juego es plata de un trabajador.
function auxilioVigente(fecha, vigencias) {
    const aplicables = vigencias
        .filter(v => v.vigenteDesde <= fecha)
        .sort((a, b) => b.vigenteDesde.getTime() - a.vigenteDesde.getTime());
    return aplicables[0] ?? null;
}
// El mes de nómina son 30 días, igual que para el salario. Un rango del 1 al 31 no paga 31
// treintavos de auxilio.
const DIAS_DEL_MES_DE_NOMINA = 30;
function auxilioDelPeriodo(datos, vigencia) {
    const mensual = valorMensual(datos, vigencia);
    if (mensual <= 0)
        return 0;
    // Nunca menos de cero ni más de un mes: unos días negativos (un rango al revés) no pueden restar
    // plata, y un rango largo no puede pagar dos auxilios.
    const dias = Math.min(DIAS_DEL_MES_DE_NOMINA, Math.max(0, datos.diasConDesplazamiento));
    // Se multiplica ANTES de dividir. Al revés, `(249095 / 30) * 30` da 249094,99999999997: el mes
    // completo salía un céntimo corto. Es la misma cola de coma flotante que obligó al motor de horas
    // a sumar minutos crudos en vez de horas redondeadas (liquidarRegistros.ts).
    return (mensual * dias) / DIAS_DEL_MES_DE_NOMINA;
}
// Cuánto es el auxilio mensual de esta persona, antes de prorratear.
function valorMensual(datos, vigencia) {
    // Un valor guardado en la ficha manda sobre el decreto, incluso el cero: es un acuerdo de la
    // empresa, y por eso tampoco se le aplica el tope de los dos salarios mínimos.
    if (datos.auxilioPersona !== null)
        return datos.auxilioPersona;
    // Sin vigencia sembrada no se inventa un valor.
    if (!vigencia)
        return 0;
    if (datos.salarioBasico > vigencia.tope)
        return 0;
    return vigencia.valor;
}
