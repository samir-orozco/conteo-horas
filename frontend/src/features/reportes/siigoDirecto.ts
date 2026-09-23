import type { PersonaDeNomina, Periodo } from './nominaDelPeriodo';
import { filasParaSiigo, type FilaEscrita } from './siigo';

// La descarga directa para Siigo (corrección del dueño del 15 de septiembre de 2026): el botón baja el
// MISMO formato que da Siigo, ya lleno por HoraPro, sin pedirle al cliente que suba nada.
//
// HoraPro lleva adentro la plantilla de Siigo sin los datos de ninguna empresa (plantillas/siigoPlantilla.ts).
// Probado contra el Siigo de un cliente el 23 de septiembre de 2026: acepta un archivo escrito sobre la
// plantilla de OTRA empresa, o sea que no mira de dónde salió; lo que no acepta es un archivo REARMADO.
// Por eso aquí no se vuelve a armar el libro: se le cambian los valores por dentro con
// plantillas/escribirEnPlantillaSiigo.ts, que explica el porqué con las pruebas que se hicieron.
//
// El número de contrato sale de la ficha de cada persona, y si está vacío se usa su cédula, que es el
// caso normal. Siigo rechaza la fila cuando el contrato no existe, y eso pasa con el segundo contrato de
// una persona, al que le pone la cédula con un «-1» al final.
export type ResultadoDirecto = {
  archivo: Uint8Array;
  filasEscritas: FilaEscrita[];
  sinCedula: string[];
};

const FILA_TITULOS = 5;

const nombreDe = (p: PersonaDeNomina) => `${p.nombre} ${p.apellido}`;

export async function archivoParaSiigo(
  personas: PersonaDeNomina[],
  periodo: Periodo,
): Promise<ResultadoDirecto> {
  // Las tres cargas son diferidas: la librería de Excel, la plantilla (en base64) y el escritor solo se
  // descargan cuando alguien exporta, no al abrir el panel.
  const [XLSX, { plantillaDeSiigo }, { escribirEnPlantillaSiigo }] = await Promise.all([
    import('xlsx'),
    import('./plantillas/siigoPlantilla'),
    import('./plantillas/escribirEnPlantillaSiigo'),
  ]);

  const plantilla = plantillaDeSiigo();
  // El libro se abre solo para LEER el catálogo y comprobar que la plantilla es la que se espera. El
  // archivo que se entrega no sale de aquí: sale de escribirEnPlantillaSiigo, sobre los bytes originales.
  const wb = XLSX.read(plantilla, { type: 'array' });
  const hoja = wb.Sheets['Novedades'];
  if (!hoja) throw new Error('La plantilla de Siigo que trae HoraPro no tiene la hoja «Novedades».');
  if (hoja['A' + FILA_TITULOS]?.v !== '#Contrato del empleado') {
    throw new Error('La plantilla de Siigo que trae HoraPro no tiene sus títulos donde se esperaba.');
  }

  // El nombre del concepto y si suma o descuenta, tal como los declara el catálogo de la plantilla
  // (hoja «datos»): es lo que Siigo espera ver en la celda, y la columna oculta «Tipo» se arma con eso.
  const catalogo = new Map<number, { nombre: string; tipo: string }>();
  const datos = wb.Sheets['datos'];
  if (datos) {
    for (const fila of XLSX.utils.sheet_to_json<unknown[]>(datos, { header: 1, blankrows: false })) {
      const [nombre, codigo, tipo] = fila as [unknown, unknown, unknown];
      if (typeof nombre === 'string' && typeof codigo === 'number' && !catalogo.has(codigo)) {
        catalogo.set(codigo, { nombre, tipo: typeof tipo === 'string' ? tipo : '' });
      }
    }
  }

  // Siigo identifica a cada persona por su documento: sin cédula no hay a quién cargarle la novedad.
  const sinCedula = personas.filter(p => !p.cedula).map(nombreDe);
  const nombrePorCedula = new Map(personas.filter(p => p.cedula).map(p => [p.cedula as string, nombreDe(p)]));

  const filasEscritas: FilaEscrita[] = filasParaSiigo(personas, periodo).map(f => {
    const concepto = catalogo.get(f.concepto);
    return {
      contrato: f.contrato, cedula: f.cedula, nombre: nombrePorCedula.get(f.cedula) ?? '',
      concepto: concepto?.nombre ?? String(f.concepto), tipo: concepto?.tipo ?? '',
      unidad: f.unidad, cantidad: f.cantidad, desde: f.desde, hasta: f.hasta, diasNoHabiles: 0,
    };
  });

  return { archivo: escribirEnPlantillaSiigo(plantilla, filasEscritas), filasEscritas, sinCedula };
}
