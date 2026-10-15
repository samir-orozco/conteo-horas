// DIAGNÓSTICO: el total a pagar del reporte por persona cuando la persona entra o sale a mitad del período
// (15 de octubre de 2026). Crea una empresa temporal, pide la ruta real /reportes/liquidacion y la borra.
//
// El reporte por persona paga el SALARIO DEL PERÍODO entero (medio salario en una quincena: lib/periodoDePago.ts
// del frontend) y descuenta el saldo de tiempo. Los días del período en que la persona no estaba en el sistema no
// tienen fila en `dias_esperados` (se materializan desde que se crea), así que se exigen con el horario y salen
// como faltante. Ese descuento es hoy lo único que reduce el salario de quien no estuvo vinculado todo el período:
// un prorrateo por HORAS e involuntario. Este script lo pone al lado del prorrateo por DÍAS de la nómina
// colombiana (salario / 30 por cada día vinculado), en cuatro casos de la quincena del 1 al 15 de octubre de 2026
// (horario de lunes a viernes de 8 h; el 12 es festivo):
//   - «Contratada»: entró de verdad el jueves 8 (contrato desde el 8) y trabajó todo desde entonces.
//   - «Antigua»: trabajaba desde 2025 (contrato desde el 1 de marzo de 2025) y la empresa la registró el 8.
//   - «Volvió»: se retiró en septiembre y reingresó el 8; trabajó todo desde entonces.
//   - «Se fue»: trabajó hasta el viernes 9, su último día, y se retiró.
// No compara contra nada: imprime los números para decidir la regla. Todo lo creado se borra al terminar.
//
//   npx ts-node prisma/diagnostico-salario-a-mitad-de-periodo.ts
import 'dotenv/config';
import Fastify from 'fastify';
import { prisma } from '../src/prisma';
import reportesRoutes from '../src/routes/reportes';
import { borrarEmpresaEnCascada } from '../src/utils/borrarEmpresaEnCascada';

const SALARIO = 1_750_905;
// Medianoche de Bogotá del día d de octubre de 2026 (o de otro mes), y una hora de ese día.
const oct = (d: number, h = 0, min = 0) => new Date(Date.UTC(2026, 9, d, h + 5, min));
const pesos = (n: number) => Math.round(n).toLocaleString('es-CO');

async function main() {
  const SUF = `mitad-${Date.now()}`;
  const empresa = await prisma.empresa.create({ data: { nombre: `Mitad ${SUF}`, nit: `m-${SUF}`, email: `m-${SUF}@ejemplo.co` } });
  try {
    const horario = await prisma.horario.create({
      data: {
        empresaId: empresa.id, nombre: 'Oficina', toleranciaMin: 0, almuerzoMin: 60,
        franjas: { create: [{ dias: ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES'], horaEntrada: '08:00', horaSalida: '17:00', tieneAlmuerzo: true }] },
      },
    });
    const persona = (nombre: string, creadoEn: Date, extra: Record<string, unknown> = {}) => prisma.colaborador.create({
      data: { empresaId: empresa.id, nombre, apellido: SUF, cedula: `${nombre}-${SUF}`, salarioMensual: SALARIO, horarioId: horario.id, creadoEn, ...extra },
    });
    const contratada = await persona('Contratada', oct(8, 9));
    const antigua = await persona('Antigua', oct(8, 9));
    const volvio = await persona('Volvio', new Date(Date.UTC(2025, 2, 1, 14)));
    const sefue = await persona('Sefue', new Date(Date.UTC(2025, 2, 1, 14)), { activo: false, fechaRetiro: oct(9) });
    await prisma.contrato.createMany({ data: [
      { colaboradorId: contratada.id, tipo: 'INDEFINIDO', fechaInicio: oct(8) },
      { colaboradorId: antigua.id, tipo: 'INDEFINIDO', fechaInicio: new Date(Date.UTC(2025, 2, 1, 5)) },
    ] });
    await prisma.vinculacionEvento.createMany({ data: [
      { colaboradorId: volvio.id, tipo: 'RETIRO', fecha: new Date(Date.UTC(2026, 8, 10, 5)), creadoEn: new Date(Date.UTC(2026, 8, 10, 20)) },
      { colaboradorId: volvio.id, tipo: 'REINGRESO', fecha: oct(8), creadoEn: oct(8, 9) },
      { colaboradorId: sefue.id, tipo: 'RETIRO', fecha: oct(9), creadoEn: oct(9, 18) },
    ] });
    // Marca de 08:00 a 17:00 los días hábiles indicados (el almuerzo lo cobra el horario).
    const marcas = (colaboradorId: string, dias: number[]) =>
      dias.map(d => ({ colaboradorId, fecha: oct(d), entrada: oct(d, 8), salida: oct(d, 17), metodoEntrada: 'CEDULA' as const }));
    await prisma.registro.createMany({ data: [
      ...marcas(contratada.id, [8, 9, 13, 14, 15]),
      ...marcas(antigua.id, [8, 9, 13, 14, 15]),
      ...marcas(volvio.id, [8, 9, 13, 14, 15]),
      ...marcas(sefue.id, [1, 2, 5, 6, 7, 8, 9]),
    ] });

    const app = Fastify();
    app.decorate('requireEmpresa', async (request: { user?: unknown; empresaId?: string }) => { request.user = { rol: 'ADMIN', empresaId: empresa.id }; request.empresaId = empresa.id; });
    await app.register(reportesRoutes, { prefix: '/reportes' });
    await app.ready();

    const salarioDelPeriodo = SALARIO / 2;
    console.log(`Quincena del 1 al 15 de octubre de 2026 · salario ${pesos(SALARIO)} · salario del período ${pesos(salarioDelPeriodo)}\n`);
    const casos: [string, string, number][] = [
      ['Contratada el 8', contratada.id, 8],
      ['Antigua, registrada el 8', antigua.id, 15],
      ['Volvió el 8', volvio.id, 8],
      ['Se fue el 9', sefue.id, 9],
    ];
    for (const [texto, id, diasVinculados] of casos) {
      const r = await app.inject({ method: 'GET', url: `/reportes/liquidacion?colaboradorId=${id}&desde=2026-10-01&hasta=2026-10-15` });
      if (r.statusCode !== 200) throw new Error(`${texto}: /liquidacion respondió ${r.statusCode}`);
      const j = r.json() as { totalAdicional: number; saldo: { minutosEsperados: number; minutosTrabajados: number; minutosSaldo: number; montoSaldo: number } };
      const hoy = salarioDelPeriodo + j.totalAdicional - j.saldo.montoSaldo;
      const porDias = (SALARIO / 30) * diasVinculados + j.totalAdicional;
      console.log(`${texto}`);
      console.log(`  exigidas ${j.saldo.minutosEsperados / 60} h, trabajadas ${j.saldo.minutosTrabajados / 60} h, faltante ${j.saldo.minutosSaldo / 60} h → descuento ${pesos(j.saldo.montoSaldo)}`);
      console.log(`  HOY el reporte paga ${pesos(hoy)} · prorrateado por ${diasVinculados} días vinculados serían ${pesos(porDias)} · diferencia ${pesos(hoy - porDias)}\n`);
    }
    await app.close();
  } finally {
    await prisma.$transaction(tx => borrarEmpresaEnCascada(tx, empresa.id), { timeout: 120000 });
    const sobras = await prisma.empresa.count({ where: { id: empresa.id } });
    console.log(`Empresa temporal: ${sobras === 0 ? 'borrada' : 'SIN BORRAR'}.`);
    await prisma.$disconnect();
    if (sobras) process.exitCode = 1;
  }
}

main().catch(e => { console.error('FALLÓ:', e); process.exitCode = 1; });
