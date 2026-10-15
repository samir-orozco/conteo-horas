// Comprobación DIFERENCIAL del arreglo de la semana partida (CLAUDE.md §5.3), contra la base local.
//
//   npx ts-node prisma/diferencial-semana-partida.ts antes     guarda lo que dan hoy los reportes
//   npx ts-node prisma/diferencial-semana-partida.ts despues   lo vuelve a correr y compara
//
// Corre /extras-resumen y /nomina (las rutas reales) para cada empresa local en varios períodos, y
// /liquidacion para cada persona con marcaciones. Lo que TIENE que pasar con el arreglo:
//   - un período que empieza un lunes no cambia en nada (no hay semana partida al principio);
//   - en los demás, lo trabajado (ordinarias + extra) es el mismo: solo cambia cuánto es extra;
//   - las extras solo suben, nunca bajan, y los días y marcaciones contados no cambian;
//   - /extras-resumen, /nomina y /liquidacion siguen diciendo lo mismo entre sí;
//   - EL SALDO (15 de octubre de 2026, después de la revisión adversarial): en el período que empieza en
//     lunes no cambia nada, y NADIE queda con más descuento que con el código de antes del arreglo. Gastar el
//     tope de la semana partida solo puede bajar lo que se exige después del corte (a lo sumo, lo mismo), así
//     que un descuento que sube es un faltante falso. La primera versión de este archivo leía campos del saldo
//     que no existen (siempre `null`) y nunca los comparaba; la segunda comparaba minutos con signo (quincenas
//     contra mes), que cuadraban justo en el caso que fallaba porque lo negativo no se devuelve. Ahora compara el
//     DINERO, y un campo que falta es una FALLA.
// Solo lectura: no escribe nada en la base.
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import Fastify from 'fastify';
import { prisma } from '../src/prisma';
import reportesRoutes from '../src/routes/reportes';

const MODO = process.argv[2];
const ARCHIVO = path.join(process.env.DIFERENCIAL_DIR ?? '/tmp', 'diferencial-semana-partida.json');
const PERIODOS: [string, string, boolean][] = [
  // [desde, hasta, empiezaEnLunes]
  ['2026-09-01', '2026-09-15', false],
  ['2026-09-16', '2026-09-30', false],
  ['2026-09-01', '2026-09-30', false],
  ['2026-10-01', '2026-10-15', false],
  ['2026-09-07', '2026-09-20', true],
  ['2026-08-01', '2026-08-31', false],
];

type Fila = { colaboradorId: string; totalAdicional: number; totalExtra: number; totalRecargos: number; minutosOrdinarios?: number; diasCont?: number; registrosCont?: number; liquidacion?: { codigo: string; horas: number }[] };
type Saldo = { sinHorario: boolean; minutosEsperados: number; minutosTrabajados: number; minutosSaldo: number; montoSaldo: number };
type Individual = { totalAdicional: number; totalExtra: number; diasCont: number; registrosCont: number; saldo: Saldo };
const CAMPOS_DEL_SALDO = ['sinHorario', 'minutosEsperados', 'minutosTrabajados', 'minutosSaldo', 'montoSaldo'] as const;

async function main() {
  if (MODO !== 'antes' && MODO !== 'despues') throw new Error('uso: antes | despues');
  const empresas = await prisma.empresa.findMany({ select: { id: true, nombre: true } });
  const datos: Record<string, unknown> = {};
  for (const e of empresas) {
    const app = Fastify();
    app.decorate('requireEmpresa', async (request: { empresaId?: string }) => { request.empresaId = e.id; });
    await app.register(reportesRoutes, { prefix: '/reportes' });
    await app.ready();
    // TODAS las personas que marcaron en septiembre, las mismas en todos los períodos. Con una muestra de 10 por
    // empresa la puerta del dinero no veía ni el defecto original.
    const sept = await app.inject({ method: 'GET', url: '/reportes/nomina?desde=2026-09-01&hasta=2026-09-30' });
    const personas = ((sept.json().colaboradores ?? []) as Fila[]).filter(f => (f.registrosCont ?? 0) > 0).map(f => f.colaboradorId);
    for (const [desde, hasta] of PERIODOS) {
      const extras = await app.inject({ method: 'GET', url: `/reportes/extras-resumen?desde=${desde}&hasta=${hasta}` });
      const nomina = await app.inject({ method: 'GET', url: `/reportes/nomina?desde=${desde}&hasta=${hasta}` });
      if (extras.statusCode !== 200 || nomina.statusCode !== 200) throw new Error(`${e.nombre} ${desde}: ${extras.statusCode}/${nomina.statusCode}`);
      const filasNomina = (nomina.json().filas ?? nomina.json().colaboradores ?? nomina.json()) as Fila[];
      const individuales: Record<string, Individual> = {};
      for (const id of personas) {
        const l = await app.inject({ method: 'GET', url: `/reportes/liquidacion?colaboradorId=${id}&desde=${desde}&hasta=${hasta}` });
        const j = l.json();
        // Un campo que no existe es un error del instrumento, no un saldo en cero.
        const faltan = CAMPOS_DEL_SALDO.filter(c => typeof j.saldo?.[c] !== (c === 'sinHorario' ? 'boolean' : 'number'));
        if (faltan.length) throw new Error(`/liquidacion de ${id} ${desde}: el saldo no trae ${faltan.join(', ')}`);
        const saldo = Object.fromEntries(CAMPOS_DEL_SALDO.map(c => [c, j.saldo[c]])) as Saldo;
        individuales[id] = { totalAdicional: j.totalAdicional, totalExtra: j.totalExtra, diasCont: j.diasCont, registrosCont: j.registrosCont, saldo };
      }
      datos[`${e.id}|${desde}|${hasta}`] = { empresa: e.nombre, extras: extras.json(), nomina: filasNomina, individuales };
    }
    await app.close();
  }

  if (MODO === 'antes') {
    fs.writeFileSync(ARCHIVO, JSON.stringify(datos));
    console.log(`Guardado: ${Object.keys(datos).length} combinaciones empresa × período en ${ARCHIVO}`);
    return;
  }

  const antes = JSON.parse(fs.readFileSync(ARCHIVO, 'utf-8')) as typeof datos;
  let fallas = 0, cambiaron = 0, iguales = 0;
  const marca = (ok: boolean, texto: string) => { if (!ok) { fallas++; console.log(`  FALLA ${texto}`); } };
  const minutosDe = (f: Fila, cod: (c: string) => boolean) => Math.round((f.liquidacion ?? []).filter(l => cod(l.codigo)).reduce((s, l) => s + l.horas * 60, 0));
  const esExtra = (c: string) => ['HED', 'HEN', 'HEDD', 'HEND'].includes(c);
  let saldosQueCambiaron = 0, saldosComparados = 0;
  for (const [clave, d] of Object.entries(datos) as [string, { empresa: string; nomina: Fila[]; individuales: Record<string, Individual> }][]) {
    const [, desde, hasta] = clave.split('|');
    const lunes = PERIODOS.find(p => p[0] === desde && p[1] === hasta)![2];
    const a = antes[clave] as typeof d;
    if (!a) { marca(false, `${clave}: no estaba en «antes»`); continue; }
    const porId = new Map(a.nomina.map(f => [f.colaboradorId, f]));
    let distinto = false;
    for (const f of d.nomina) {
      const v = porId.get(f.colaboradorId);
      if (!v) continue;
      const totalAntes = minutosDe(v, () => true), totalAhora = minutosDe(f, () => true);
      const extraAntes = minutosDe(v, esExtra), extraAhora = minutosDe(f, esExtra);
      if (JSON.stringify(v) !== JSON.stringify(f)) distinto = true;
      if (lunes) marca(JSON.stringify(v) === JSON.stringify(f), `${d.empresa} ${desde}..${hasta} ${f.colaboradorId}: empieza en lunes y cambió`);
      // Las horas de cada código vienen redondeadas a dos decimales (0,3 min de error como mucho por
      // código), así que la suma de varios códigos tiene ese margen: no es un cambio de lo trabajado.
      const margen = 0.3 * ((v.liquidacion ?? []).length + (f.liquidacion ?? []).length) + 0.5;
      marca(Math.abs(totalAntes - totalAhora) <= margen, `${d.empresa} ${desde}..${hasta} ${f.colaboradorId}: lo trabajado cambió ${totalAntes} → ${totalAhora} min (margen ${margen})`);
      marca(extraAhora >= extraAntes - 1, `${d.empresa} ${desde}..${hasta} ${f.colaboradorId}: las extras bajaron ${extraAntes} → ${extraAhora} min`);
      marca(v.diasCont === f.diasCont && v.registrosCont === f.registrosCont, `${d.empresa} ${desde}..${hasta} ${f.colaboradorId}: cambiaron los días o marcaciones contados`);
      const ind = d.individuales[f.colaboradorId];
      if (ind) marca(Math.abs((ind.totalAdicional ?? 0) - f.totalAdicional) < 1, `${d.empresa} ${desde}..${hasta} ${f.colaboradorId}: /liquidacion (${ind.totalAdicional}) y /nomina (${f.totalAdicional}) no coinciden`);
    }
    // El saldo de cada persona: en un período que empieza en lunes no cambia nada; en los demás se cuenta
    // cuántos cambiaron y se muestran, para mirarlos.
    for (const [id, ind] of Object.entries(d.individuales)) {
      const viejo = a.individuales?.[id];
      if (!viejo) continue;
      saldosComparados++;
      if (lunes) marca(JSON.stringify(viejo) === JSON.stringify(ind), `${d.empresa} ${desde}..${hasta} ${id}: empieza en lunes y su /liquidacion cambió`);
      marca(ind.saldo.montoSaldo <= viejo.saldo.montoSaldo + 0.01,
        `${d.empresa} ${desde}..${hasta} ${id}: el descuento SUBIÓ ${viejo.saldo.montoSaldo} → ${ind.saldo.montoSaldo} (exigidas ${viejo.saldo.minutosEsperados} → ${ind.saldo.minutosEsperados}, ordinarias ${viejo.saldo.minutosTrabajados} → ${ind.saldo.minutosTrabajados})`);
      if (!lunes && JSON.stringify(viejo.saldo) !== JSON.stringify(ind.saldo)) {
        saldosQueCambiaron++;
        if (saldosQueCambiaron <= 12) console.log(`    saldo ${d.empresa} ${desde}..${hasta} ${id.slice(-6)}: esperadas ${viejo.saldo.minutosEsperados} → ${ind.saldo.minutosEsperados}, ordinarias ${viejo.saldo.minutosTrabajados} → ${ind.saldo.minutosTrabajados}, saldo ${viejo.saldo.minutosSaldo} → ${ind.saldo.minutosSaldo} min, descuento ${viejo.saldo.montoSaldo} → ${ind.saldo.montoSaldo}`);
      }
    }
    if (distinto) {
      cambiaron++;
      const sum = (fs2: Fila[], k: 'totalAdicional' | 'totalExtra') => Math.round(fs2.reduce((s, x) => s + (x[k] ?? 0), 0));
      console.log(`  ${d.empresa.padEnd(28)} ${desde}..${hasta}  adicional ${sum(a.nomina, 'totalAdicional').toLocaleString('es-CO')} → ${sum(d.nomina, 'totalAdicional').toLocaleString('es-CO')}  ·  extras ${sum(a.nomina, 'totalExtra').toLocaleString('es-CO')} → ${sum(d.nomina, 'totalExtra').toLocaleString('es-CO')}`);
    } else iguales++;
  }
  // La prueba más fuerte: las dos quincenas de septiembre suman exactamente el mes, persona por persona.
  const empresasIds = [...new Set(Object.keys(datos).map(k => k.split('|')[0]))];
  for (const id of empresasIds) {
    const q1 = datos[`${id}|2026-09-01|2026-09-15`] as { empresa: string; nomina: Fila[] };
    const q2 = datos[`${id}|2026-09-16|2026-09-30`] as { nomina: Fila[] };
    const mes = datos[`${id}|2026-09-01|2026-09-30`] as { nomina: Fila[] };
    const de = (x: { nomina: Fila[] }, cid: string) => x.nomina.find(f => f.colaboradorId === cid)?.totalAdicional ?? 0;
    for (const f of mes.nomina) {
      const suma = de(q1, f.colaboradorId) + de(q2, f.colaboradorId);
      marca(Math.abs(suma - f.totalAdicional) < 1, `${q1.empresa} ${f.colaboradorId}: quincenas ${Math.round(suma)} y mes ${Math.round(f.totalAdicional)} no coinciden`);
    }
  }
  console.log(`\nSaldos: ${saldosComparados} comparados con «antes» (${saldosQueCambiaron} cambiaron, todos en períodos que no empiezan en lunes; ninguno con más descuento).`);
  marca(saldosComparados > 0, 'se compararon saldos');
  console.log(`\n${Object.keys(datos).length} combinaciones: ${cambiaron} cambiaron, ${iguales} iguales. ${fallas === 0 ? 'TODAS LAS INVARIANTES EN VERDE.' : `${fallas} FALLA(S).`}`);
  if (fallas > 0) process.exitCode = 1;
}

main().catch(e => { console.error('FALLÓ:', e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
