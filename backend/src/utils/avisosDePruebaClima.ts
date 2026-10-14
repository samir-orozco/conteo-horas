import type { PrismaClient } from '@prisma/client';
import { prisma } from '../prisma';
import { rangoDiaBogota } from './fechas';
import { FUNCION_DE_PRUEBA, avisoDePrueba, textoDeAviso } from './pruebaClima';

// LA PASADA DIARIA DE LOS AVISOS DE LA PRUEBA GRATIS DEL CLIMA (14 de octubre de 2026, PENDIENTES nº 39, fase 3).
//
// Cuál aviso le toca a cada prueba lo decide `avisoDePrueba` (utils/pruebaClima.ts), con sus pruebas; esto es la
// plomería. La notificación de la campana es la marca de «ya se mandó»: la pasada corre al arrancar y a diario, y
// tiene que poder correr dos veces sin repetir nada. Escribe en el log TAMBIÉN cuando no manda nada (CLAUDE.md §8.3:
// un trabajo que solo habla cuando hace algo no se distingue de uno que nunca corrió).
//
// Se verifica contra la base con `prisma/probar-avisos-prueba-clima.ts`.

type Log = { info: (msg: string) => void; error: (obj: unknown, msg?: string) => void };

const DIA_MS = 24 * 60 * 60 * 1000;
// Una prueba que terminó hace más de una semana ya no recibe el aviso de «terminó»: si la pasada estuvo caída tanto
// tiempo, avisarlo tarde confunde más de lo que informa.
const DIAS_DE_GRACIA_DEL_FIN = 7;

export async function avisarPruebasDelClima(log?: Log, ahora = new Date(), db: PrismaClient = prisma): Promise<number> {
  // La tabla de concesiones es pequeña (una fila por función dada a una empresa), así que leerla entera filtrando
  // por función y origen no es un recorrido de las tablas grandes que prohíbe la §8.4.
  const pruebas = await db.concesionFuncion.findMany({
    where: {
      funcion: FUNCION_DE_PRUEBA, origen: 'PRUEBA', revocadaEn: null,
      hasta: { gt: new Date(ahora.getTime() - DIAS_DE_GRACIA_DEL_FIN * DIA_MS) },
    },
    select: { id: true, empresaId: true, desde: true, hasta: true, revocadaEn: true },
  });

  let enviados = 0;
  for (const p of pruebas) {
    const aviso = avisoDePrueba(p, ahora);
    if (!aviso) continue;
    try {
      // Lo que se ha encontrado, solo para el aviso de avance: las respuestas desde el día en que empezó.
      const hallado = aviso === 'AVANCE'
        ? await db.calificacionClima.aggregate({
          where: { empresaId: p.empresaId, fecha: { gte: rangoDiaBogota(p.desde).inicioDia } },
          _count: { _all: true }, _avg: { carita: true },
        })
        : null;
      const texto = textoDeAviso(aviso, {
        hasta: p.hasta, respuestas: hallado?._count._all ?? 0, promedio: hallado?._avg.carita ?? null,
      });
      const yaMandado = await db.notificacion.findFirst({
        where: { empresaId: p.empresaId, tipo: texto.tipo, entidad: 'clima', entidadId: p.id }, select: { id: true },
      });
      if (yaMandado) continue;
      await db.notificacion.create({
        data: { empresaId: p.empresaId, tipo: texto.tipo, titulo: texto.titulo, cuerpo: texto.cuerpo, entidad: 'clima', entidadId: p.id },
      });
      enviados++;
    } catch (err) {
      log?.error(err, `Pruebas del clima: falló la prueba ${p.id} de la empresa ${p.empresaId}`);
    }
  }
  log?.info(`Pruebas del clima: ${enviados} avisos de ${pruebas.length} pruebas revisadas`);
  return enviados;
}
