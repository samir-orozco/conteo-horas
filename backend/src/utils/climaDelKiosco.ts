import { randomUUID } from 'crypto';
import { prisma } from '../prisma';
import { tieneFuncion } from './capacidades';
import { Prisma } from '@prisma/client';
import { debePreguntarClima, leerMotivosDeEmpresa, yaSePreguntoHoy } from './clima';
import { rangoDiaBogota } from './fechas';

// La plomería del clima laboral en el kiosco (4 de octubre de 2026). Las decisiones están en
// `clima.ts`, con sus pruebas; esto solo las conecta con la base.

// Los motivos de cada empresa van en `configuracion`, con esta clave y la lista como JSON.
export const CLAVE_MOTIVOS = 'climaMotivos';

// LA VENTANA ESCRIBE CON SU PROPIO TOKEN, NO CON EL DE LA SESIÓN. Lo firma la salida, y dice de quién
// y de qué jornada es: así la carita solo puede caer en un día que de verdad terminó con una salida,
// y ni la persona ni el día salen nunca del cuerpo de la petición. Las rutas de marcar exigen el rol
// WORKER, así que con este no se puede marcar nada.
export const ROL_CLIMA = 'CLIMA';
export const DURACION_TOKEN_CLIMA = '15m';

// LAS SALIDAS QUE ABREN LA VENTANA: las que la persona marcó en el kiosco al cerrar la jornada. No las
// pausas, ni las que puso el cierre automático (`salidaEstimada`), ni las cargadas a mano (MANUAL). Las
// usan la ventana (¿ya se le preguntó hoy?) y el panel («Respondieron»): las dos cuentas tienen que
// hablar de las mismas salidas. Null en `metodoSalida` son las del kiosco anteriores a esa columna.
export const SALIDAS_QUE_ABREN_LA_VENTANA = {
  salida: { not: null },
  salidaAlmuerzo: false,
  salidaDescanso: false,
  salidaEstimada: false,
  OR: [{ metodoSalida: null }, { metodoSalida: { not: 'MANUAL' } }],
} satisfies Prisma.RegistroWhereInput;

export type TokenClima = { rol: typeof ROL_CLIMA; id: string; empresaId: string; fecha: string; jti: string };

export async function motivosDeEmpresa(empresaId: string): Promise<string[]> {
  const fila = await prisma.configuracion.findUnique({ where: { empresaId_clave: { empresaId, clave: CLAVE_MOTIVOS } } });
  return leerMotivosDeEmpresa(fila?.valor ?? null);
}

// Lo que la respuesta de la salida le manda al kiosco para abrir la ventana, o null si no toca.
export async function climaDeLaSalida(
  p: { colaboradorId: string; empresaId: string; registroId: string; fechaJornada: Date; pausa: boolean },
  firmar: (token: TokenClima) => string,
): Promise<{ token: string; motivos: string[] } | null> {
  // Las consultas se saltan cuando ya se sabe la respuesta: una pausa no pregunta nunca.
  const tieneModulo = !p.pausa && await tieneFuncion(p.empresaId, 'clima');
  const { inicioDia, finDia } = rangoDiaBogota(p.fechaJornada);
  const delDia = { colaboradorId: p.colaboradorId, fecha: { gte: inicioDia, lt: finDia } };
  const [calificada, otrasSalidas] = tieneModulo
    ? await Promise.all([
      prisma.calificacionClima.findFirst({ where: delDia, select: { id: true } }),
      prisma.registro.count({ where: { ...delDia, ...SALIDAS_QUE_ABREN_LA_VENTANA, id: { not: p.registroId } } }),
    ])
    : [null, 0];
  const preguntado = yaSePreguntoHoy({ calificoHoy: !!calificada, otrasSalidasDelKioscoHoy: otrasSalidas });
  if (!debePreguntarClima({ accion: 'SALIDA', pausa: p.pausa, tieneModulo, yaSePreguntoHoy: preguntado })) return null;
  const token = firmar({ rol: ROL_CLIMA, id: p.colaboradorId, empresaId: p.empresaId, fecha: inicioDia.toISOString(), jti: randomUUID() });
  return { token, motivos: await motivosDeEmpresa(p.empresaId) };
}
