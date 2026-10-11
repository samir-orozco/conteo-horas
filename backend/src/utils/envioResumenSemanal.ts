import { prisma } from '../prisma';
import { enviarCorreo, destinatarios } from './correo';
import { estadoDelContrato, type TipoContrato } from './contratos';
import { rangoReporte } from './fechas';
import { liquidarEmpresa, tardanzasDeEmpresa } from './reportesDeEmpresa';
import {
  semanaDelResumen, armarResumen, correoDelResumen, avisoDelResumen, CLAVE_RESUMEN_SEMANAL,
  type Semana, type Periodo, type EntradaDelResumen,
} from './resumenSemanal';

// LA PLOMERÍA DEL RESUMEN SEMANAL (11 de octubre de 2026).
//
// Consultas, envío y la marca de «ya se mandó». Lo que decide —qué semana, qué dice, a quién no se
// le manda porque no hay nada que contar— está en resumenSemanal.ts, probado. Esto se verifica
// contra la base local con prisma/probar-resumen-semanal.ts (§8.6).

export { CLAVE_RESUMEN_SEMANAL };
export const TIPO_RESUMEN_SEMANAL = 'RESUMEN_SEMANAL';

type Log = { info: (msg: string) => void; error: (obj: unknown, msg?: string) => void };

async function periodo(empresaId: string, s: Semana): Promise<Periodo> {
  const [extras, tardanzas] = await Promise.all([
    liquidarEmpresa(empresaId, s.desde, s.hasta),
    tardanzasDeEmpresa(empresaId, s.desde, s.hasta),
  ]);
  return { horas: extras.filas, tardanzas: tardanzas.filas };
}

// Todo lo que el resumen necesita de una empresa, leído de la base.
async function entradaDe(empresaId: string, semana: Semana & { anterior: Semana }, ahora: Date): Promise<EntradaDelResumen> {
  const { desdeF, finExclusivo } = rangoReporte(semana.desde, semana.hasta);
  const [actual, anterior, cerrados, novedadesPorAprobar, contratos] = await Promise.all([
    periodo(empresaId, semana),
    periodo(empresaId, semana.anterior),
    // Las salidas que puso el auto-cierre. Por (colaboradorId, fecha), igual que los resúmenes:
    // ver el EXPLAIN en el commit (§8.4).
    prisma.registro.findMany({
      where: { colaborador: { empresaId }, fecha: { gte: desdeF, lt: finExclusivo }, salidaEstimada: true },
      select: { fecha: true, colaborador: { select: { nombre: true, apellido: true } } },
      orderBy: { fecha: 'asc' },
    }),
    prisma.permiso.count({ where: { aprobado: false, colaborador: { empresaId, activo: true } } }),
    prisma.contrato.findMany({
      where: { estado: 'VIGENTE', colaborador: { empresaId, activo: true } },
      select: {
        tipo: true, fechaInicio: true, fechaFin: true, fechaInicioPractica: true,
        colaborador: { select: { nombre: true, apellido: true } },
        prorrogas: { select: { desde: true, hasta: true } },
      },
    }),
  ]);

  return {
    semana, actual, anterior,
    turnosCerradosSolos: cerrados.map(r => ({
      nombre: `${r.colaborador.nombre} ${r.colaborador.apellido}`,
      // `fecha` es medianoche de Bogotá (05:00 UTC): su fecha UTC es el día del turno.
      fecha: r.fecha.toISOString().slice(0, 10),
    })),
    novedadesPorAprobar,
    contratos: contratos.flatMap(c => {
      const { alertas } = estadoDelContrato(
        { tipo: c.tipo as TipoContrato, fechaInicio: c.fechaInicio, fechaFin: c.fechaFin, fechaInicioPractica: c.fechaInicioPractica },
        c.prorrogas, ahora,
      );
      const nombre = `${c.colaborador.nombre} ${c.colaborador.apellido}`;
      return alertas.map(a => ({ nombre, tipo: a.tipo, dias: a.dias }));
    }),
  };
}

// La pasada. Corre todos los días a las 7 y al arrancar (programarDiario), y solo hace algo el
// lunes: lo decide `semanaDelResumen`.
//
// Que no salga dos veces se decide con la notificación de la campana, igual que los avisos de
// cobro: su `entidadId` es el lunes de la semana. Se anota DESPUÉS de mandar, así que si el correo
// falla la próxima pasada del mismo lunes lo reintenta.
//
// Devuelve cuántas empresas lo recibieron. Deja rastro siempre, también cuando no toca (§8.3).
export async function enviarResumenesSemanales(log?: Log, ahora = new Date()): Promise<number> {
  const semana = semanaDelResumen(ahora);
  if (!semana) {
    log?.info('Resumen semanal: hoy no toca');
    return 0;
  }

  const empresas = await prisma.empresa.findMany({
    where: { activa: true },
    select: {
      id: true, nombre: true, email: true,
      usuarios: { where: { rol: 'ADMIN', activo: true }, select: { email: true } },
      configuracion: { where: { clave: CLAVE_RESUMEN_SEMANAL }, select: { valor: true } },
    },
  });
  // De aquí salen el enlace a Reportes y el logo, que se publica con el frontend.
  const origen = process.env.FRONTEND_ORIGIN?.split(',')[0] ?? 'http://localhost:5173';

  let enviados = 0, apagadas = 0, sinNada = 0, yaEstaban = 0, fallidas = 0;
  for (const e of empresas) {
    try {
      if (e.configuracion[0]?.valor === '0') { apagadas++; continue; }
      const yaMandado = await prisma.notificacion.findFirst({
        where: { empresaId: e.id, tipo: TIPO_RESUMEN_SEMANAL, entidad: 'resumen', entidadId: semana.desde },
        select: { id: true },
      });
      if (yaMandado) { yaEstaban++; continue; }

      const resumen = armarResumen(await entradaDe(e.id, semana, ahora));
      if (!resumen.hayAlgo) { sinNada++; continue; }

      const correo = correoDelResumen(resumen, e.nombre, origen);
      for (const para of destinatarios(e)) {
        await enviarCorreo({ para, asunto: correo.asunto, html: correo.html });
      }
      const aviso = avisoDelResumen(resumen);
      await prisma.notificacion.create({
        data: { empresaId: e.id, tipo: TIPO_RESUMEN_SEMANAL, titulo: aviso.titulo, cuerpo: aviso.cuerpo, entidad: 'resumen', entidadId: semana.desde },
      });
      enviados++;
    } catch (err) {
      fallidas++;
      log?.error(err, `Resumen semanal: falló la empresa ${e.id}`);
    }
  }
  log?.info(`Resumen semanal ${semana.desde}: ${enviados} enviados · ${yaEstaban} ya estaban · ${apagadas} apagados · ${sinNada} sin nada que contar · ${fallidas} fallidas · de ${empresas.length} empresas`);
  return enviados;
}
