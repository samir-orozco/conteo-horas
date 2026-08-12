"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolverSedeDeMarcacion = resolverSedeDeMarcacion;
const geo_1 = require("./geo");
function resolverSedeDeMarcacion(sedes, lat, lng) {
    // Sin sedes con coordenadas no hay geocerca que validar: quien llama decide
    // si eso significa "no se exige ubicación" o si cae al respaldo de la empresa.
    if (sedes.length === 0)
        return { dentro: true, sede: null, distancia: 0 };
    let masCercana = sedes[0];
    let menorDistancia = Infinity;
    for (const sede of sedes) {
        const d = (0, geo_1.distanciaMetros)(lat, lng, sede.lat, sede.lng);
        if (d < menorDistancia) {
            menorDistancia = d;
            masCercana = sede;
        }
    }
    // Se evalúa contra la más cercana y con SU radio: cada sede tiene el suyo
    // porque un local en un centro comercial no necesita el mismo margen que una
    // finca. Si dos se solapan, gana la más cercana, que es la que la persona
    // tiene delante.
    const dentro = menorDistancia <= masCercana.radio;
    return { dentro, sede: masCercana, distancia: Math.round(menorDistancia) };
}
