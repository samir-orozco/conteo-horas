// Costura del kiosco con el interruptor «Calificación del día» (14 de octubre de 2026, PENDIENTES nº 39).
//
// La decisión está probada en utils/clima.ts y la ruta de configuración en su prueba. Lo que ninguna prueba
// toca es POST /worker/marcar: que en una empresa SIN el plan de clima la salida traiga la ventana de las
// caritas, que la carita se guarde, y que con el interruptor apagado deje de traerla. Esto lo comprueba
// contra el servidor LOCAL corriendo, con una empresa temporal de plan Profesional, y BORRA todo lo que creó.
//   npx tsx prisma/probar-calificacion-del-dia.ts
import 'dotenv/config';
import { createSigner } from 'fast-jwt';
import { prisma } from '../src/prisma';
import { capacidadesEmpresa } from '../src/utils/capacidades';

const API = process.env.API_LOCAL ?? 'http://localhost:3001/api';
const firmar = createSigner({ key: process.env.JWT_SECRET! });

async function main() {
  const marca = Date.now();
  const empresa = await prisma.empresa.create({
    data: {
      nombre: 'Prueba calificación', nit: `TMP-CALIF-${marca}`, email: `tmp-calif-${marca}@horapro.co`,
      suscripcion: { create: { plan: 'PROFESIONAL', estado: 'PRUEBA', finPrueba: new Date(Date.now() + 7 * 864e5) } },
    },
  });
  const persona = (n: string) => prisma.colaborador.create({
    data: { empresaId: empresa.id, nombre: n, apellido: 'Prueba', cedula: `TMP-CALIF-${n}-${marca}`, salarioMensual: 1_423_500, modalidad: 'PRESENCIAL' },
  });
  const fallas: string[] = [];
  const debe = (ok: boolean, que: string) => { console.log(`${ok ? 'OK   ' : 'FALLA'} ${que}`); if (!ok) fallas.push(que); };
  const pedir = async (metodo: string, ruta: string, token: string, cuerpo: unknown = {}) => {
    const r = await fetch(`${API}${ruta}`, { method: metodo, headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` }, body: JSON.stringify(cuerpo) });
    return { status: r.status, cuerpo: await r.json() as Record<string, any> };
  };
  // Entrada y salida de una persona: devuelve la respuesta de la salida.
  const jornada = async (id: string) => {
    const t = firmar({ id, rol: 'WORKER', empresaId: empresa.id });
    const e = await pedir('POST', '/worker/marcar', t);
    if (e.cuerpo.accion !== 'ENTRADA') throw new Error(`la entrada no pasó: ${e.status} ${JSON.stringify(e.cuerpo)}`);
    return pedir('POST', '/worker/marcar', t);
  };

  try {
    debe((await capacidadesEmpresa(empresa.id)).features.clima === false, 'la empresa de prueba NO tiene el clima en su plan');

    const ana = await persona('Ana');
    const s1 = await jornada(ana.id);
    debe(s1.cuerpo.accion === 'SALIDA' && !!s1.cuerpo.clima?.token, `sin tocar el interruptor, la salida trae la ventana de las caritas (${s1.status})`);
    if (s1.cuerpo.clima?.token) {
      const c = await pedir('PUT', '/worker/clima', s1.cuerpo.clima.token, { carita: 4, motivos: [] });
      debe(c.status === 200, `la carita se guarda aunque el plan no tenga clima (${c.status})`);
      debe(await prisma.calificacionClima.count({ where: { colaboradorId: ana.id, carita: 4 } }) === 1, 'y quedó en la base');
    }

    await prisma.configuracion.create({ data: { empresaId: empresa.id, clave: 'CLIMA_CALIFICACION_DIA', valor: '0' } });
    const luis = await persona('Luis');
    const s2 = await jornada(luis.id);
    debe(s2.cuerpo.accion === 'SALIDA' && s2.cuerpo.clima === null, `con el interruptor apagado, la salida NO trae la ventana (${JSON.stringify(s2.cuerpo.clima)})`);
  } finally {
    const ids = (await prisma.colaborador.findMany({ where: { empresaId: empresa.id }, select: { id: true } })).map(c => c.id);
    await prisma.calificacionClima.deleteMany({ where: { empresaId: empresa.id } });
    await prisma.registro.deleteMany({ where: { colaboradorId: { in: ids } } });
    await prisma.diaEsperado.deleteMany({ where: { colaboradorId: { in: ids } } });
    await prisma.notificacion.deleteMany({ where: { empresaId: empresa.id } });
    await prisma.configuracion.deleteMany({ where: { empresaId: empresa.id } });
    await prisma.colaborador.deleteMany({ where: { empresaId: empresa.id } });
    await prisma.suscripcion.deleteMany({ where: { empresaId: empresa.id } });
    await prisma.empresa.delete({ where: { id: empresa.id } });
    console.log((await prisma.empresa.count({ where: { id: empresa.id } })) === 0 ? 'limpio: la empresa temporal y todo lo suyo se borraron' : 'NO SE BORRÓ la empresa temporal');
  }
  console.log(fallas.length === 0 ? 'TODO OK' : `${fallas.length} FALLAS`);
  process.exitCode = fallas.length === 0 ? 0 : 1;
}

main().finally(() => prisma.$disconnect());
