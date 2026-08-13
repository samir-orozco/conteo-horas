import { distanciaMetros } from './geo';

// Resuelve DESDE QUÉ SEDE está marcando alguien.
//
// Un trabajador puede tener varias sedes asignadas —quien rota entre locales—,
// así que basta con estar dentro de cualquiera de ellas. Si está fuera de todas,
// la marcación no se registra: es la regla que pidió el dueño.
//
// Cuando rechaza, devuelve igual la sede más cercana y la distancia, para poder
// decirle a la persona "estás a 800 m de El Poblado" en vez de un "fuera de
// ubicación" que no le sirve para nada.

export type SedeGeocerca = { id: string; nombre: string; lat: number; lng: number; radio: number };

export type ResultadoSede = {
  dentro: boolean;
  sede: SedeGeocerca | null; // la que aplica, o la más cercana si está fuera
  distancia: number; // metros a esa sede
};

export function resolverSedeDeMarcacion(
  sedes: SedeGeocerca[],
  lat: number,
  lng: number,
): ResultadoSede {
  // Sin sedes con coordenadas no hay geocerca que validar: quien llama decide
  // si eso significa "no se exige ubicación" o si cae al respaldo de la empresa.
  if (sedes.length === 0) return { dentro: true, sede: null, distancia: 0 };

  let masCercana: SedeGeocerca = sedes[0];
  let menorDistancia = Infinity;

  for (const sede of sedes) {
    const d = distanciaMetros(lat, lng, sede.lat, sede.lng);
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
