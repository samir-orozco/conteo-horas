import type { PrismaClient } from '@prisma/client';
import { prisma } from '../prisma';
import { atencionDeLaEmpresa, esClimaSinPlan } from './atencionClima';
import { avisoDeAtencionSinPlan, textoDelAvisoSinPlan } from './climaSinPlan';
import { FUNCION_DE_PRUEBA, estadoDePrueba } from './pruebaClima';

// LA PASADA DIARIA DEL AVISO DEL CLIMA A LAS EMPRESAS SIN EL PLAN (14 de octubre de 2026, PENDIENTES nº 39, fase 4).
//
// Si alguien entró a «necesita atención» en una empresa que no tiene el clima, la campana lo dice sin decir quién.
// Cuándo toca lo decide `avisoDeAtencionSinPlan` (utils/climaSinPlan.ts), con sus pruebas; esto es la plomería. El
// último aviso es la marca: su `entidadId` guarda hasta qué día de entrada contó. Escribe en el log TAMBIÉN cuando no
// manda nada (CLAUDE.md §8.3).
//
// Se verifica contra la base con `prisma/probar-aviso-clima-sin-plan.ts`.

type Log = { info: (msg: string) => void; error: (obj: unknown, msg?: string) => void };

export const TIPO_AVISO_SIN_PLAN = 'CLIMA_ATENCION_SIN_PLAN';

export async function avisarClimaSinPlan(log?: Log, ahora = new Date(), db: PrismaClient = prisma): Promise<number> {
  const empresas = await db.empresa.findMany({ where: { activa: true }, select: { id: true } });

  let enviados = 0, sinPlan = 0, fallidas = 0;
  for (const e of empresas) {
    try {
      if (!await esClimaSinPlan(e.id, db)) continue;
      sinPlan++;
      const enAtencion = await atencionDeLaEmpresa(e.id, undefined, db);
      if (enAtencion.length === 0) continue;
      // Por (empresaId, creadoEn), el índice de la campana (§8.4: ver el EXPLAIN en el commit).
      const ultimo = await db.notificacion.findFirst({
        where: { empresaId: e.id, tipo: TIPO_AVISO_SIN_PLAN }, orderBy: { creadoEn: 'desc' }, select: { creadoEn: true, entidadId: true },
      });
      const aviso = avisoDeAtencionSinPlan({ enAtencion, ultimo: ultimo && { creadoEn: ultimo.creadoEn, hastaDia: ultimo.entidadId }, ahora });
      if (!aviso) continue;
      const pruebas = await db.concesionFuncion.findMany({
        where: { empresaId: e.id, funcion: FUNCION_DE_PRUEBA, origen: 'PRUEBA' }, select: { desde: true, hasta: true, revocadaEn: true },
      });
      const texto = textoDelAvisoSinPlan(aviso.personas, estadoDePrueba(pruebas, ahora).disponible);
      await db.notificacion.create({
        data: { empresaId: e.id, tipo: texto.tipo, titulo: texto.titulo, cuerpo: texto.cuerpo, entidad: 'clima', entidadId: aviso.hastaDia },
      });
      enviados++;
    } catch (err) {
      fallidas++;
      log?.error(err, `Clima sin el plan: falló la empresa ${e.id}`);
    }
  }
  log?.info(`Clima sin el plan: ${enviados} avisos · ${sinPlan} empresas sin el plan revisadas · ${fallidas} fallidas · de ${empresas.length} empresas`);
  return enviados;
}
