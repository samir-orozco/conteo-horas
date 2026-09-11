// Foto de los números de saldo y tardanzas que un cambio NO debería mover
// (CLAUDE.md §5.3).
//
//   npx ts-node prisma/diferencial-saldo-tardanzas.ts antes.json
//   ...el cambio...
//   npx ts-node prisma/diferencial-saldo-tardanzas.ts despues.json
//   npx ts-node prisma/diferencial-saldo-tardanzas.ts comparar antes.json despues.json
//
// Llama las rutas reales de saldo y tardanzas, montadas dentro del proceso, para
// cada colaborador activo de la base local y cada período de abajo. Solo lee.
//
// Por qué comparar con el script y no con `diff`: la base local la comparten
// varias sesiones, y entre las dos fotos pueden aparecer empresas de prueba
// nuevas. Se comparan las entradas que están en las dos, y en los resúmenes solo
// las personas que ya estaban; lo nuevo se cuenta pero no se compara.
import { readFileSync, writeFileSync } from 'fs';
import { prisma } from '../src/prisma';
import { montarApp } from './app-en-proceso';

const PERIODOS = [
  ['2026-07-01', '2026-07-31'],
  ['2026-08-01', '2026-08-31'],
  ['2026-09-01', '2026-09-10'],
];

type RespLiquidacion = { saldo: unknown; totalAdicional: number; totalRecargos: number; totalExtra: number; registrosCont: number };
type RespTardanzas = { sinHorario: boolean; totalMinutos: number; diasTarde: number; detalle: unknown; montoTardanzas?: number };
type Foto = Record<string, unknown>;
type Resumen = { colaboradores: { colaboradorId: string }[] };

async function tomarFoto(archivo: string) {
  const { app, tokenAdmin } = await montarApp();
  async function leer<T>(url: string, empresaId: string): Promise<T> {
    const r = await app.inject({ method: 'GET', url, headers: { authorization: `Bearer ${tokenAdmin(empresaId)}` } });
    if (r.statusCode !== 200) throw new Error(`${url}: ${r.statusCode} ${r.body}`);
    return r.json<T>();
  }

  const empresas = await prisma.empresa.findMany({ select: { id: true, nombre: true }, orderBy: { id: 'asc' } });
  const colaboradores = await prisma.colaborador.findMany({
    where: { activo: true }, select: { id: true, nombre: true, empresaId: true }, orderBy: { id: 'asc' },
  });

  const foto: Foto = {};
  for (const [desde, hasta] of PERIODOS) {
    for (const e of empresas) {
      foto[`${desde}|${e.nombre}|tardanzas-resumen`] = await leer(`/api/reportes/tardanzas-resumen?desde=${desde}&hasta=${hasta}`, e.id);
      for (const c of colaboradores.filter(x => x.empresaId === e.id)) {
        const q = `colaboradorId=${c.id}&desde=${desde}&hasta=${hasta}`;
        const liq = await leer<RespLiquidacion>(`/api/reportes/liquidacion?${q}`, e.id);
        const tar = await leer<RespTardanzas>(`/api/reportes/tardanzas?${q}`, e.id);
        foto[`${desde}|${e.nombre}|${c.nombre}|${c.id}`] = {
          saldo: liq.saldo,
          totalAdicional: liq.totalAdicional, totalRecargos: liq.totalRecargos, totalExtra: liq.totalExtra, registrosCont: liq.registrosCont,
          tardanzas: { sinHorario: tar.sinHorario, totalMinutos: tar.totalMinutos, diasTarde: tar.diasTarde, detalle: tar.detalle, montoTardanzas: tar.montoTardanzas },
        };
      }
    }
  }
  writeFileSync(archivo, JSON.stringify(foto, null, 2));
  console.log(`${Object.keys(foto).length} entradas guardadas en ${archivo}.`);
}

// Devuelve cuántas entradas que ya existían cambiaron o desaparecieron.
function comparar(rutaAntes: string, rutaDespues: string): number {
  const antes = JSON.parse(readFileSync(rutaAntes, 'utf8')) as Foto;
  const despues = JSON.parse(readFileSync(rutaDespues, 'utf8')) as Foto;
  const distintas: string[] = [];
  const desaparecidas: string[] = [];
  for (const [clave, valor] of Object.entries(antes)) {
    if (!(clave in despues)) { desaparecidas.push(clave); continue; }
    let otro = despues[clave];
    if (clave.endsWith('|tardanzas-resumen')) {
      const ids = new Set((valor as Resumen).colaboradores.map(c => c.colaboradorId));
      otro = { ...(otro as Resumen), colaboradores: (otro as Resumen).colaboradores.filter(c => ids.has(c.colaboradorId)) };
    }
    if (JSON.stringify(valor) !== JSON.stringify(otro)) distintas.push(clave);
  }
  const nuevas = Object.keys(despues).filter(k => !(k in antes)).length;
  console.log(`${Object.keys(antes).length} entradas en la foto de antes · ${nuevas} nuevas en la de después (no se comparan)`);
  console.log(`desaparecidas: ${desaparecidas.length ? desaparecidas.join(', ') : 'ninguna'}`);
  console.log(`distintas: ${distintas.length ? distintas.join(', ') : 'ninguna'}`);
  return desaparecidas.length + distintas.length;
}

async function main() {
  const [modo, a, b] = process.argv.slice(2);
  if (!modo) throw new Error('Falta la ruta del archivo de salida, o "comparar antes.json despues.json".');
  if (modo === 'comparar') {
    if (!a || !b) throw new Error('Uso: comparar antes.json despues.json');
    process.exitCode = comparar(a, b) === 0 ? 0 : 1;
    return;
  }
  await tomarFoto(modo);
}

main()
  .catch(e => { console.error('EXPLOTÓ:', e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
