// Verifica la COSTURA del saldo en la semana que cruza el corte (CLAUDE.md §8.6), con la ruta real /liquidacion.
//
// La decisión está probada aparte (utils/liquidarRegistros.test.ts, «el saldo de la semana partida»). Aquí se
// comprueba que la ruta le pase al cálculo lo que necesita: lo que el motor contó como ordinario antes del corte y
// la fecha de creación de la persona. Los datos locales no traen ningún caso así (el diferencial de la semana
// partida no lo vería), por eso se crean: una empresa temporal con horario de lunes a sábado de 07:00 a 15:00
// (48 h, jornada de 42 h) y cuatro personas en la semana del lunes 28 de septiembre de 2026, pidiendo el período
// del jueves 1 al sábado 3 de octubre:
//   - «Larga»: de lunes a miércoles se quedó hasta las 17:00 y cumplió de jueves a sábado → sin descuento.
//   - «Justa»: cumplió al minuto toda la semana → sin descuento.
//   - «Sábado»: cumplió de lunes a viernes y faltó el sábado → debe 2 h (42 exigidas en la semana, 40 trabajadas).
//   - «Nueva»: creada el miércoles 30 a las 9, trabajó miércoles a viernes y faltó el sábado → debe las 8 h del sábado.
//   - «Vuelve»: creada hace meses, retirada el 10 de septiembre y reingresada el miércoles 30 a las 9; trabajó
//     miércoles a viernes y faltó el sábado → debe las 8 h del sábado (sin mirar el reingreso, se le perdonaban 6).
// Todo lo creado se borra al terminar.
//
//   npx ts-node prisma/verificar-saldo-semana-partida.ts
import 'dotenv/config';
import Fastify from 'fastify';
import { prisma } from '../src/prisma';
import reportesRoutes from '../src/routes/reportes';
import { borrarEmpresaEnCascada } from '../src/utils/borrarEmpresaEnCascada';

let fallas = 0;
const marca = (ok: boolean, texto: string) => { if (!ok) fallas++; console.log(`  ${ok ? 'ok   ' : 'FALLA'} ${texto}`); };

// Un instante de la semana del lunes 28 de septiembre de 2026 en hora de Bogotá: n días después del lunes.
const bog = (n: number, h = 0, min = 0) => new Date(Date.UTC(2026, 8, 28 + n, h + 5, min));

async function main() {
  const SUF = `saldo-${Date.now()}`;
  const empresa = await prisma.empresa.create({ data: { nombre: `Saldo ${SUF}`, nit: `s-${SUF}`, email: `s-${SUF}@ejemplo.co` } });
  try {
    const horario = await prisma.horario.create({
      data: {
        empresaId: empresa.id, nombre: 'Seis días', toleranciaMin: 0, almuerzoMin: 0,
        franjas: { create: [{ dias: ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO'], horaEntrada: '07:00', horaSalida: '15:00', tieneAlmuerzo: false }] },
      },
    });
    const persona = (nombre: string, creadoEn: Date) => prisma.colaborador.create({
      data: { empresaId: empresa.id, nombre, apellido: SUF, cedula: `${nombre}-${SUF}`, salarioMensual: 1_500_000, horarioId: horario.id, creadoEn },
    });
    const antes = new Date(Date.UTC(2026, 8, 1, 5));
    const larga = await persona('Larga', antes);
    const justa = await persona('Justa', antes);
    const sabado = await persona('Sabado', antes);
    const nueva = await persona('Nueva', bog(2, 9));
    const vuelve = await persona('Vuelve', antes);
    await prisma.vinculacionEvento.createMany({ data: [
      { colaboradorId: vuelve.id, tipo: 'RETIRO', fecha: new Date(Date.UTC(2026, 8, 10, 5)), creadoEn: new Date(Date.UTC(2026, 8, 10, 20)) },
      { colaboradorId: vuelve.id, tipo: 'REINGRESO', fecha: bog(2), creadoEn: bog(2, 9) },
    ] });
    const marcas = (colaboradorId: string, dias: number[], hasta = (_n: number) => 15) =>
      dias.map(n => ({ colaboradorId, fecha: bog(n), entrada: bog(n, 7), salida: bog(n, hasta(n)), metodoEntrada: 'CEDULA' as const }));
    await prisma.registro.createMany({ data: [
      ...marcas(larga.id, [0, 1, 2, 3, 4, 5], n => (n <= 2 ? 17 : 15)),
      ...marcas(justa.id, [0, 1, 2, 3, 4, 5]),
      ...marcas(sabado.id, [0, 1, 2, 3, 4]),
      ...marcas(nueva.id, [2, 3, 4]),
      ...marcas(vuelve.id, [2, 3, 4]),
    ] });

    const app = Fastify();
    app.decorate('requireEmpresa', async (request: { user?: unknown; empresaId?: string }) => { request.user = { rol: 'ADMIN', empresaId: empresa.id }; request.empresaId = empresa.id; });
    await app.register(reportesRoutes, { prefix: '/reportes' });
    await app.ready();
    const saldoDe = async (id: string) => {
      const r = await app.inject({ method: 'GET', url: `/reportes/liquidacion?colaboradorId=${id}&desde=2026-10-01&hasta=2026-10-03` });
      if (r.statusCode !== 200) throw new Error(`/liquidacion respondió ${r.statusCode}: ${r.body.slice(0, 200)}`);
      return r.json().saldo as { minutosEsperados: number; minutosTrabajados: number; minutosSaldo: number; montoSaldo: number };
    };
    console.log('Período del jueves 1 al sábado 3 de octubre de 2026, semana partida desde el lunes 28:');
    const casos: [string, string, number][] = [
      ['Larga: se quedó de más antes del corte y cumplió después', larga.id, 0],
      ['Justa: cumplió al minuto', justa.id, 0],
      ['Sábado: faltó el sábado', sabado.id, 2 * 60],
      ['Nueva: alta del miércoles, faltó el sábado', nueva.id, 8 * 60],
      ['Vuelve: reingresó el miércoles, faltó el sábado', vuelve.id, 8 * 60],
    ];
    for (const [texto, id, debe] of casos) {
      const s = await saldoDe(id);
      const descontado = Math.max(0, s.minutosSaldo);
      marca(descontado === debe, `${texto}: exigidas ${s.minutosEsperados}, ordinarias ${s.minutosTrabajados}, se descuentan ${descontado} min ($${s.montoSaldo}); debía ${debe}`);
    }
    await app.close();
  } finally {
    await prisma.$transaction(tx => borrarEmpresaEnCascada(tx, empresa.id), { timeout: 120000 });
    const sobras = await prisma.empresa.count({ where: { id: empresa.id } });
    console.log(`\n${fallas === 0 ? 'TODO EN VERDE.' : `${fallas} FALLA(S).`} Empresa temporal: ${sobras === 0 ? 'borrada' : 'SIN BORRAR'}.`);
    if (sobras) fallas++;
    await prisma.$disconnect();
    if (fallas > 0) process.exitCode = 1;
  }
}

main().catch(e => { console.error('FALLÓ:', e); process.exitCode = 1; });
