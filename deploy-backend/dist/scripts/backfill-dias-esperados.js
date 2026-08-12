"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const prisma_1 = require("../prisma");
const materializarDias_1 = require("../utils/materializarDias");
// Rellena `dias_esperados` hacia atrás para TODA la plataforma. Se corre UNA vez
// al desplegar la función; de ahí en adelante la ventana la mantiene el propio
// servidor al arrancar y cada 24h.
//
// Vive en `src/` y no en `prisma/` para que `tsc` lo compile a `dist/` y viaje
// al servidor: allá no hay ts-node. Se ejecuta con:
//   node dist/scripts/backfill-dias-esperados.js
// En local: npx ts-node src/scripts/backfill-dias-esperados.ts
//
// Usa el horario ACTUAL de cada colaborador, porque es el único dato que existe:
// el sistema nunca guardó cuál era antes ni cuándo cambió. Es decir, congela el
// pasado tal como se ve HOY. Lo ya dañado por ediciones anteriores no se
// recupera — eso ya estaba asumido — pero de aquí en adelante deja de moverse.
//
// Es idempotente: no pisa ninguna fila existente, y nunca toca una MANUAL.
// Correrlo dos veces no cambia nada.
async function main() {
    const antes = await prisma_1.prisma.diaEsperado.count();
    console.log(`Filas antes: ${antes}`);
    const t0 = process.hrtime.bigint();
    const { colaboradores, dias } = await (0, materializarDias_1.backfillTodos)({
        info: (m) => console.log(m),
        error: (e, m) => console.error(m, e),
    });
    const segs = Number(process.hrtime.bigint() - t0) / 1e9;
    const despues = await prisma_1.prisma.diaEsperado.count();
    console.log(`\nColaboradores recorridos: ${colaboradores}`);
    console.log(`Días escritos: ${dias}`);
    console.log(`Filas después: ${despues} (+${despues - antes}) en ${segs.toFixed(1)}s`);
    // Un vistazo por colaborador, para cotejar que a nadie le quedó un hueco.
    const porColaborador = await prisma_1.prisma.diaEsperado.groupBy({
        by: ['colaboradorId'],
        _count: { _all: true },
        _min: { fecha: true },
        _max: { fecha: true },
    });
    const nombres = new Map((await prisma_1.prisma.colaborador.findMany({ select: { id: true, nombre: true, apellido: true } }))
        .map(c => [c.id, `${c.nombre} ${c.apellido}`]));
    console.log('\nCobertura por colaborador:');
    for (const g of porColaborador) {
        const desde = g._min.fecha?.toISOString().slice(0, 10);
        const hasta = g._max.fecha?.toISOString().slice(0, 10);
        console.log(`   ${(nombres.get(g.colaboradorId) ?? g.colaboradorId).padEnd(24)} ${g._count._all} días  ${desde} → ${hasta}`);
    }
}
main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma_1.prisma.$disconnect());
