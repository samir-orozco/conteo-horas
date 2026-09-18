"use strict";
// Qué salarios parecen traer el auxilio de transporte por dentro (17 de septiembre de 2026).
//
// Hasta hoy el salario era UN solo campo, así que las empresas que ya existen pueden tener el
// auxilio sumado dentro del básico. Cuando es así, cada hora extra y cada recargo de esa persona se
// pagan un 14,2% de más, y nada en pantalla lo delata.
//
// ESTO NO DETECTA CON CERTEZA, y no finge que sí. La única señal defendible es aritmética: que el
// básico menos el auxilio dé exactamente el salario mínimo de ese año. Es el caso de quien escribió
// el total en vez del básico (1.750.905 + 249.095 = 2.000.000), que es el más común y el más
// probable de encontrar en las empresas que ya estaban.
//
// Todo lo demás se lista para que un humano lo revise, pero SIN marcarlo. Señalar por corazonada a
// gente cuyo sueldo está bien haría que nadie vuelva a confiar en la marca, y entonces la marca deja
// de servir para el caso en que sí acierta.
Object.defineProperty(exports, "__esModule", { value: true });
exports.pareceIncluirAuxilio = pareceIncluirAuxilio;
function pareceIncluirAuxilio(salarioBasico, vigencia) {
    if (!vigencia)
        return false;
    // No hay guarda para el salario en cero, y es deliberado: la tenía y una mutación demostró que
    // era código muerto. La resta ya la descarta sola (0 menos el auxilio nunca da el mínimo), así
    // que la guarda solo aparentaba proteger algo. La prueba de ese caso SÍ se conserva.
    //
    // El salario mínimo no se guarda en ninguna parte del producto: sale del tope, que por ley son
    // dos mínimos. Así no hay un segundo número que mantener cada enero.
    const salarioMinimo = vigencia.tope / 2;
    return salarioBasico - vigencia.valor === salarioMinimo;
}
