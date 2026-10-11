// Costura del kiosco con el margen fuera de la geocerca (11 de octubre de 2026, PENDIENTES nº 11).
//
// La regla está probada en utils/ (modalidad, sedes, avisoFueraDeGeocerca). Lo que ninguna prueba toca
// es la ruta POST /worker/marcar: que lea el margen de la sede, escriba las marcas en `registros` y deje
// el aviso en la campana. Esto lo comprueba contra el servidor LOCAL corriendo, con una persona temporal,
// y BORRA todo lo que creó (CLAUDE.md §8.6).
//
// Necesita una sede con ubicación y margen > 0 (se busca la primera) y el backend en http://localhost:3001.
//   npx tsx prisma/probar-margen-kiosco.ts
import 'dotenv/config';
import { createSigner } from 'fast-jwt';
import { prisma } from '../src/prisma';

const API = process.env.API_LOCAL ?? 'http://localhost:3001/api';
const METRO_EN_GRADOS = 1 / 111_195; // un metro de latitud, aprox.

async function main() {
  const sede = await prisma.sede.findFirst({ where: { activa: true, lat: { not: null }, lng: { not: null }, margenFuera: { gt: 0 } } });
  if (!sede || sede.lat === null || sede.lng === null) throw new Error('No hay ninguna sede con ubicación y margen: ponle uno en Configuración > Sedes');
  const alNorte = (m: number) => ({ lat: sede.lat! + m * METRO_EN_GRADOS, lng: sede.lng! });
  console.log(`sede «${sede.nombre}»: radio ${sede.radio} m, margen ${sede.margenFuera} m`);

  const col = await prisma.colaborador.create({
    data: {
      empresaId: sede.empresaId, nombre: 'Prueba', apellido: 'Margen', cedula: `TMP-MARGEN-${Date.now()}`,
      salarioMensual: 1_423_500, modalidad: 'PRESENCIAL', sedes: { create: { sedeId: sede.id } },
    },
  });
  const token = createSigner({ key: process.env.JWT_SECRET! })({ id: col.id, rol: 'WORKER', empresaId: sede.empresaId });
  const marcar = async (m: number) => {
    const r = await fetch(`${API}/worker/marcar`, {
      method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify(alNorte(m)),
    });
    return { status: r.status, cuerpo: await r.json() as Record<string, unknown> };
  };

  const fallas: string[] = [];
  const debe = (cond: boolean, que: string) => { console.log(`${cond ? 'OK   ' : 'FALLA'} ${que}`); if (!cond) fallas.push(que); };

  try {
    const fuera = sede.radio + Math.floor(sede.margenFuera / 2);
    const lejos = sede.radio + sede.margenFuera + 100;

    const e = await marcar(fuera);
    debe(e.status === 200 && e.cuerpo.accion === 'ENTRADA', `entrada a ${fuera} m pasa (status ${e.status}, ${JSON.stringify(e.cuerpo.accion ?? e.cuerpo.error)})`);
    const [reg] = await prisma.registro.findMany({ where: { colaboradorId: col.id } });
    debe(reg?.fueraGeocercaEntrada === true, 'la entrada queda marcada fuera de la geocerca');
    debe(reg?.sedeId === sede.id, 'la entrada queda con la sede');

    const s1 = await marcar(lejos);
    debe(s1.status === 403 && s1.cuerpo.codigo === 'FUERA_DE_UBICACION', `salida a ${lejos} m, más allá del margen, se rechaza (status ${s1.status})`);

    const s2 = await marcar(10);
    debe(s2.status === 200 && s2.cuerpo.accion === 'SALIDA', `salida a 10 m pasa (status ${s2.status}, ${JSON.stringify(s2.cuerpo.accion ?? s2.cuerpo.error)})`);
    const cerrado = await prisma.registro.findUnique({ where: { id: reg.id } });
    debe(cerrado?.salida !== null && cerrado?.fueraGeocercaSalida === false, 'la salida dentro NO queda marcada');
    debe(cerrado?.fueraGeocercaEntrada === true, 'la entrada sigue marcada después de cerrar');

    await new Promise(r => setTimeout(r, 500)); // el aviso es fire-and-forget
    const avisos = await prisma.notificacion.findMany({ where: { empresaId: sede.empresaId, entidadId: reg.id } });
    debe(avisos.length === 1 && avisos[0].tipo === 'MARCO_FUERA_DE_GEOCERCA', `un solo aviso en la campana, de la entrada (hay ${avisos.length})`);
    if (avisos[0]) console.log(`      «${avisos[0].titulo}» / «${avisos[0].cuerpo}»`);
  } finally {
    // Borra todo lo que creó, también si algo falló a la mitad.
    const ids = (await prisma.registro.findMany({ where: { colaboradorId: col.id }, select: { id: true } })).map(r => r.id);
    await prisma.notificacion.deleteMany({ where: { OR: [{ entidadId: { in: ids } }, { entidadId: col.id }] } });
    await prisma.registro.deleteMany({ where: { colaboradorId: col.id } });
    await prisma.diaEsperado.deleteMany({ where: { colaboradorId: col.id } });
    await prisma.colaboradorSede.deleteMany({ where: { colaboradorId: col.id } });
    await prisma.colaborador.delete({ where: { id: col.id } });
    const queda = await prisma.colaborador.count({ where: { id: col.id } });
    console.log(queda === 0 ? 'limpio: la persona temporal y sus marcas se borraron' : 'NO SE BORRÓ la persona temporal');
  }
  console.log(fallas.length === 0 ? 'TODO OK' : `${fallas.length} FALLAS`);
  process.exitCode = fallas.length === 0 ? 0 : 1;
}

main().finally(() => prisma.$disconnect());
