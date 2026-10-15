// Verifica la COSTURA de la pestaña Seguimiento del clima (CLAUDE.md §8.6), con la ruta real /clima/seguimientos.
//
// La decisión está probada aparte (utils/clima.test.ts, `casoDeLaAtencion`). Aquí se comprueba que la ruta la use: a
// quien hoy necesita atención con el caso ABIERTO de una racha anterior, la pestaña lo rotulaba «Ya salió de
// "Necesitan atención"» (la racha salía null), porque solo miraba el caso de su racha actual. Los datos locales no
// traen ese caso, así que se crea: una empresa temporal, Ana con tres caritas malas a principios de septiembre (la
// racha que abrió su caso, que sigue EN_SEGUIMIENTO), un buen día el 10 y otras tres malas del 8 al 10 de octubre.
// Todo se borra al terminar.
//
//   npx ts-node prisma/verificar-seguimiento-racha.ts
import 'dotenv/config';
import Fastify from 'fastify';
import { prisma } from '../src/prisma';
import climaRoutes from '../src/routes/clima';
import { borrarEmpresaEnCascada } from '../src/utils/borrarEmpresaEnCascada';

let fallas = 0;
const marca = (ok: boolean, texto: string) => { if (!ok) fallas++; console.log(`  ${ok ? 'ok   ' : 'FALLA'} ${texto}`); };
const dia = (mes: number, d: number) => new Date(Date.UTC(2026, mes - 1, d, 5));

async function main() {
  const SUF = `racha-${Date.now()}`;
  // Exenta de pago: tiene todas las funciones, también el clima.
  const empresa = await prisma.empresa.create({ data: { nombre: `Racha ${SUF}`, nit: `r-${SUF}`, email: `r-${SUF}@ejemplo.co`, exentaPago: true } });
  try {
    const ana = await prisma.colaborador.create({ data: { empresaId: empresa.id, nombre: 'Ana', apellido: SUF, cedula: `a-${SUF}`, salarioMensual: 1_750_905 } });
    const carita = (fecha: Date, c: number) => ({ empresaId: empresa.id, colaboradorId: ana.id, fecha, carita: c, motivos: [] });
    await prisma.calificacionClima.createMany({ data: [
      carita(dia(9, 1), 1), carita(dia(9, 2), 2), carita(dia(9, 3), 1),
      carita(dia(9, 10), 5),
      carita(dia(10, 8), 1), carita(dia(10, 9), 2), carita(dia(10, 10), 1),
    ] });
    await prisma.seguimientoClima.create({ data: { empresaId: empresa.id, colaboradorId: ana.id, desde: dia(9, 1), estado: 'EN_SEGUIMIENTO' } });

    const app = Fastify();
    app.decorate('requireEmpresa', async (request: { user?: unknown; empresaId?: string }) => { request.user = { rol: 'ADMIN', empresaId: empresa.id }; request.empresaId = empresa.id; });
    await app.register(climaRoutes, { prefix: '/clima' });
    await app.ready();
    const r = await app.inject({ method: 'GET', url: '/clima/seguimientos' });
    marca(r.statusCode === 200, `/clima/seguimientos responde ${r.statusCode}`);
    const casos = (r.json().casos ?? []) as { colaboradorId: string; estado: string; racha: number | null; desde: string }[];
    marca(casos.length === 1, `sigue habiendo un solo caso (no se abre otro mientras el viejo siga abierto): ${casos.length}`);
    const suyo = casos.find(c => c.colaboradorId === ana.id);
    marca(suyo?.racha === 3, `el caso abierto de septiembre la muestra en atención hoy, con su racha: ${suyo?.racha ?? 'null («Ya salió»)'}`);
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
