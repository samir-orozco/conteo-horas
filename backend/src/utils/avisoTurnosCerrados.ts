import { prisma } from '../prisma';
import { enviarTelegram } from './telegram';
import {
  tocaElMensajeDeTurnos, mensajeTurnosCerrados,
  CLAVE_TURNOS_CERRADOS, CLAVE_TURNOS_CERRADOS_ENVIADO,
} from './turnosCerradosSolos';

// LA PLOMERÍA DE «TURNOS CERRADOS SOLOS» (13 de octubre de 2026). Corre a las 7 y al arrancar
// (programarDiario); lo que decide si toca y el texto están en turnosCerradosSolos.ts, probados. Se
// verifica contra la base local con prisma/probar-turnos-cerrados.ts (§8.6).

type Log = { info: (msg: string) => void; error: (obj: unknown, msg?: string) => void };

const DIA_MS = 24 * 60 * 60 * 1000;

async function empresasConElAviso() {
  const cfgs = await prisma.configuracion.findMany({
    where: { clave: { in: [CLAVE_TURNOS_CERRADOS, 'TELEGRAM_CHAT_ID', CLAVE_TURNOS_CERRADOS_ENVIADO] }, empresa: { activa: true } },
    select: { empresaId: true, clave: true, valor: true },
  });
  const porEmpresa = new Map<string, Record<string, string>>();
  for (const c of cfgs) porEmpresa.set(c.empresaId, { ...porEmpresa.get(c.empresaId), [c.clave]: c.valor });
  return [...porEmpresa.entries()]
    .filter(([, m]) => m[CLAVE_TURNOS_CERRADOS] === '1' && m.TELEGRAM_CHAT_ID?.trim())
    .map(([empresaId, m]) => ({ empresaId, chat: m.TELEGRAM_CHAT_ID.trim(), ultimoEnvio: m[CLAVE_TURNOS_CERRADOS_ENVIADO] ?? null }));
}

export async function avisarTurnosCerrados(log?: Log, ahora = new Date()): Promise<number> {
  const origen = process.env.FRONTEND_ORIGIN?.split(',')[0] ?? 'http://localhost:5173';
  const empresas = await empresasConElAviso();
  let enviados = 0, fallidas = 0;
  for (const { empresaId, chat, ultimoEnvio } of empresas) {
    try {
      const toca = tocaElMensajeDeTurnos(ahora, ultimoEnvio);
      if (!toca) continue;

      // Por (colaboradorId, fecha), como los demás barridos (§8.4). La entrada de un turno cerrado es
      // al menos 18 horas anterior a su cierre; una semana de margen cubre una app dormida varios días.
      const ids = (await prisma.colaborador.findMany({ where: { empresaId }, select: { id: true } })).map(c => c.id);
      const cerrados = ids.length ? await prisma.registro.findMany({
        where: {
          colaboradorId: { in: ids },
          fecha: { gte: new Date(toca.desde.getTime() - 7 * DIA_MS) },
          salidaEstimada: true,
          // Lo cerró el sistema en la ventana, y nadie lo ha corregido: si un administrador ya lo
          // editó, ya lo revisó y no hay nada que avisar.
          editadoPor: 'SISTEMA',
          editadoEn: { gte: toca.desde, lt: toca.hasta },
        },
        select: { entrada: true, salida: true, colaborador: { select: { nombre: true, apellido: true } } },
      }) : [];

      if (cerrados.length) {
        const r = await enviarTelegram(chat, mensajeTurnosCerrados(
          cerrados.map(c => ({ nombre: `${c.colaborador.nombre} ${c.colaborador.apellido}`, entrada: c.entrada!, salidaEstimada: c.salida })),
          `${origen}/app/registros`,
        ));
        if (!r.ok) log?.error(r.error, `Turnos cerrados: Telegram rechazó el mensaje de la empresa ${empresaId}`);
        else enviados++;
      }
      // Se anota aunque no hubiera nada que contar o Telegram fallara: es la marca de que la pasada de
      // hoy ya se hizo, y sin ella cada arranque de la app volvería a intentarlo.
      await prisma.configuracion.upsert({
        where: { empresaId_clave: { empresaId, clave: CLAVE_TURNOS_CERRADOS_ENVIADO } },
        update: { valor: toca.hoy },
        create: { empresaId, clave: CLAVE_TURNOS_CERRADOS_ENVIADO, valor: toca.hoy },
      });
    } catch (err) {
      fallidas++;
      log?.error(err, `Turnos cerrados: falló la empresa ${empresaId}`);
    }
  }
  log?.info(`Turnos cerrados por Telegram: ${enviados} mensajes · ${empresas.length} empresas con el aviso · ${fallidas} fallidas`);
  return enviados;
}
