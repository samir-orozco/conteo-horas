import type { PersonaDeNomina, Periodo } from './nominaDelPeriodo';
import { filasParaSiigo, type FilaEscrita } from './siigo';

// La descarga directa para Siigo (corrección del dueño del 15 de septiembre de 2026): el botón baja el
// MISMO formato que da Siigo, ya lleno por HoraPro, sin pedirle al cliente que suba nada.
//
// HoraPro lleva adentro la plantilla de Siigo SIN empleados (plantillas/siigoPlantilla.ts): los de cada
// empresa los escribe el sistema al exportar. La copia original traía las 14 personas de la empresa del
// dueño, y eso no puede viajar en el código.
//
// El número de contrato se llena con la cédula, porque HoraPro no conoce el contrato interno del Siigo
// de cada empresa. Quien lo necesite exacto puede subir su propia plantilla: ese camino vive en
// siigo.ts (llenarPlantillaSiigo) y respeta los contratos que ella traiga.
export type ResultadoDirecto = {
  archivo: Uint8Array;
  filasEscritas: FilaEscrita[];
  sinCedula: string[];
};

// Dónde vive cada cosa en la plantilla, medido sobre la que entregó el dueño.
const FILA_TITULOS = 5;
const PRIMERA_FILA = 6;
const COL = { contrato: 'A', cedula: 'B', nombre: 'C', concepto: 'D', unidad: 'E', cantidad: 'F', desde: 'G', hasta: 'H', noHabiles: 'I' };

const nombreDe = (p: PersonaDeNomina) => `${p.nombre} ${p.apellido}`;

export async function archivoParaSiigo(
  personas: PersonaDeNomina[],
  periodo: Periodo,
): Promise<ResultadoDirecto> {
  // Las dos cargas son diferidas: la librería de Excel y la plantilla (148 KB en base64) solo se
  // descargan cuando alguien exporta, no al abrir el panel.
  const [XLSX, { plantillaDeSiigo }] = await Promise.all([
    import('xlsx'),
    import('./plantillas/siigoPlantilla'),
  ]);

  const wb = XLSX.read(plantillaDeSiigo(), { type: 'array' });
  const hoja = wb.Sheets['Novedades'];
  if (!hoja) throw new Error('La plantilla de Siigo que trae HoraPro no tiene la hoja «Novedades».');
  if (hoja[COL.contrato + FILA_TITULOS]?.v !== '#Contrato del empleado') {
    throw new Error('La plantilla de Siigo que trae HoraPro no tiene sus títulos donde se esperaba.');
  }

  // El nombre del concepto tal como lo escribe el catálogo de la plantilla: es lo que Siigo espera ver
  // en la celda, y se lee de la hoja «datos» en vez de armarlo a mano.
  const nombresDeConcepto = new Map<number, string>();
  const datos = wb.Sheets['datos'];
  if (datos) {
    for (const fila of XLSX.utils.sheet_to_json<unknown[]>(datos, { header: 1, blankrows: false })) {
      const [nombre, codigo] = fila as [unknown, unknown];
      if (typeof nombre === 'string' && typeof codigo === 'number' && !nombresDeConcepto.has(codigo)) {
        nombresDeConcepto.set(codigo, nombre);
      }
    }
  }

  // Siigo identifica a cada persona por su documento: sin cédula no hay a quién cargarle la novedad.
  const sinCedula = personas.filter(p => !p.cedula).map(nombreDe);
  const nombrePorCedula = new Map(personas.filter(p => p.cedula).map(p => [p.cedula as string, nombreDe(p)]));

  const filasEscritas: FilaEscrita[] = [];
  let fila = PRIMERA_FILA;
  for (const f of filasParaSiigo(personas, periodo)) {
    const escrita: FilaEscrita = {
      contrato: f.cedula, cedula: f.cedula, nombre: nombrePorCedula.get(f.cedula) ?? '',
      concepto: nombresDeConcepto.get(f.concepto) ?? String(f.concepto),
      unidad: f.unidad, cantidad: f.cantidad, desde: f.desde, hasta: f.hasta, diasNoHabiles: 0,
    };
    XLSX.utils.sheet_add_aoa(hoja, [[
      escrita.contrato, escrita.cedula, escrita.nombre, escrita.concepto,
      escrita.unidad, escrita.cantidad, escrita.desde, escrita.hasta, escrita.diasNoHabiles,
    ]], { origin: COL.contrato + fila });
    filasEscritas.push(escrita);
    fila++;
  }

  // Sin estilos: con ellos el archivo pasaba de 60 KB a 2,2 MB, medido sobre esta misma plantilla.
  const archivo = XLSX.write(wb, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer;
  return { archivo: new Uint8Array(archivo), filasEscritas, sinCedula };
}
