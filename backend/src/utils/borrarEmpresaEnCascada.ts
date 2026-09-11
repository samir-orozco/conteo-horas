import { Prisma } from '@prisma/client';
import { partirEnLotes } from './lotes';

// La plomería del borrado de una empresa: veinte tablas, de las hojas a la raíz.
//
// Va en su propio archivo, aparte de `eliminarEmpresa.ts`, por la regla de la
// sección 8.2 de CLAUDE.md: aquel tiene la DECISIÓN y está al 100%; esto habla
// con MySQL y no va a llegar al 80% ni tiene por qué. Se verifica con
// `prisma/verificar-eliminar-empresa.ts`, que crea una empresa de mentira y una
// testigo, llama a ESTA función y comprueba por id lo que quedó.
//
// Recibe el cliente de transacción en vez de importar `prisma`: así el que llama
// decide la transacción, y el script de verificación puede correr la función
// real sin levantar Fastify (sección 8.5).
//
// CÓMO BORRA, Y POR QUÉ ASÍ. Primero junta los ids con lecturas normales, que no
// bloquean nada, y después borra POR ID y EN LOTES. Medido el 10 de septiembre de
// 2026 en la revisión adversarial, sobre MySQL 9.7 y MariaDB 12.3:
//   - Un DELETE ... WHERE colaboradorId IN (...) o WHERE sedeId IN (...) hacía que
//     el motor recorriera la tabla de TODAS las empresas y la dejara bloqueada
//     hasta el commit: el kiosco de las demás esperaba entre 112 y 650 ms. Borrar
//     por clave primaria bloquea solo las filas de esta empresa.
//   - Un IN con más de 65.535 ids revienta el límite de marcadores: una empresa
//     con más marcaciones que eso no se podía eliminar.
//
// El orden no es estético. Casi todas las llaves hacia `empresas` y
// `colaboradores` están en RESTRICT: borrar el padre sin limpiar antes falla. Y
// dos, `usuarios` y `dias_festivos`, están en SET NULL: si se olvidaran, borrar la
// empresa NO fallaría y dejaría un admin huérfano y un festivo de todas las
// empresas.

export const LOTE_BORRADO = 1000;

// Filas borradas por tabla. La ruta lo deja en el log como constancia.
export type BorradoPorTabla = Record<string, number>;

export async function borrarEmpresaEnCascada(
  tx: Prisma.TransactionClient,
  empresaId: string,
  { lote = LOTE_BORRADO }: { lote?: number } = {},
): Promise<BorradoPorTabla> {
  const borrado: BorradoPorTabla = {};
  const ids = (filas: { id: string }[]) => filas.map(f => f.id);
  const enLotes = async (tabla: string, lista: string[], borrar: (parte: string[]) => Promise<{ count: number }>) => {
    let n = 0;
    for (const parte of partirEnLotes(lista, lote)) n += (await borrar(parte)).count;
    borrado[tabla] = (borrado[tabla] ?? 0) + n;
  };
  const deSuGente = { colaborador: { empresaId } };
  // Las marcaciones de su gente, y también las que se hicieron en sus sedes.
  const susRegistros = { OR: [deSuGente, { sede: { empresaId } }] };

  const colaboradores = ids(await tx.colaborador.findMany({ where: { empresaId }, select: { id: true } }));
  const sedes = ids(await tx.sede.findMany({ where: { empresaId }, select: { id: true } }));
  const horarios = ids(await tx.horario.findMany({ where: { empresaId }, select: { id: true } }));

  await enLotes('prorrogas_contrato', ids(await tx.prorrogaContrato.findMany({ where: { contrato: deSuGente }, select: { id: true } })),
    parte => tx.prorrogaContrato.deleteMany({ where: { id: { in: parte } } }));
  await enLotes('contratos', ids(await tx.contrato.findMany({ where: deSuGente, select: { id: true } })),
    parte => tx.contrato.deleteMany({ where: { id: { in: parte } } }));
  await enLotes('vinculacion_eventos', ids(await tx.vinculacionEvento.findMany({ where: deSuGente, select: { id: true } })),
    parte => tx.vinculacionEvento.deleteMany({ where: { id: { in: parte } } }));
  await enLotes('dias_esperados', ids(await tx.diaEsperado.findMany({ where: deSuGente, select: { id: true } })),
    parte => tx.diaEsperado.deleteMany({ where: { id: { in: parte } } }));
  await enLotes('registro_cambios', ids(await tx.registroCambio.findMany({ where: { registro: susRegistros }, select: { id: true } })),
    parte => tx.registroCambio.deleteMany({ where: { id: { in: parte } } }));
  await enLotes('permisos', ids(await tx.permiso.findMany({ where: deSuGente, select: { id: true } })),
    parte => tx.permiso.deleteMany({ where: { id: { in: parte } } }));
  await enLotes('registros', ids(await tx.registro.findMany({ where: susRegistros, select: { id: true } })),
    parte => tx.registro.deleteMany({ where: { id: { in: parte } } }));
  // Llave compuesta, sin id: se borra por colaborador y por sede, que son el
  // comienzo de su clave y de su índice.
  await enLotes('colaboradores_sedes', colaboradores, parte => tx.colaboradorSede.deleteMany({ where: { colaboradorId: { in: parte } } }));
  await enLotes('colaboradores_sedes', sedes, parte => tx.colaboradorSede.deleteMany({ where: { sedeId: { in: parte } } }));
  await enLotes('colaboradores', colaboradores, parte => tx.colaborador.deleteMany({ where: { id: { in: parte } } }));
  await enLotes('sedes', sedes, parte => tx.sede.deleteMany({ where: { id: { in: parte } } }));
  // Después de colaboradores: `colaboradores.horarioId` los apunta.
  await enLotes('franjas_horario', ids(await tx.franjaHorario.findMany({ where: { horario: { empresaId } }, select: { id: true } })),
    parte => tx.franjaHorario.deleteMany({ where: { id: { in: parte } } }));
  await enLotes('horarios', horarios, parte => tx.horario.deleteMany({ where: { id: { in: parte } } }));
  await enLotes('dispositivos_kiosco', ids(await tx.dispositivoKiosco.findMany({ where: { empresaId }, select: { id: true } })),
    parte => tx.dispositivoKiosco.deleteMany({ where: { id: { in: parte } } }));
  await enLotes('dias_festivos', ids(await tx.diaFestivo.findMany({ where: { empresaId }, select: { id: true } })),
    parte => tx.diaFestivo.deleteMany({ where: { id: { in: parte } } }));
  await enLotes('configuracion', ids(await tx.configuracion.findMany({ where: { empresaId }, select: { id: true } })),
    parte => tx.configuracion.deleteMany({ where: { id: { in: parte } } }));
  await enLotes('notificaciones', ids(await tx.notificacion.findMany({ where: { empresaId }, select: { id: true } })),
    parte => tx.notificacion.deleteMany({ where: { id: { in: parte } } }));
  await enLotes('usuarios', ids(await tx.usuario.findMany({ where: { empresaId }, select: { id: true } })),
    parte => tx.usuario.deleteMany({ where: { id: { in: parte } } }));
  // Antes que los pagos: cada comisión apunta a su pago.
  await enLotes('comisiones', ids(await tx.comision.findMany({ where: { empresaId }, select: { id: true } })),
    parte => tx.comision.deleteMany({ where: { id: { in: parte } } }));

  const suscripcion = await tx.suscripcion.findUnique({ where: { empresaId }, select: { id: true } });
  if (suscripcion) {
    await enLotes('pagos', ids(await tx.pago.findMany({ where: { suscripcionId: suscripcion.id }, select: { id: true } })),
      parte => tx.pago.deleteMany({ where: { id: { in: parte } } }));
    await tx.suscripcion.delete({ where: { id: suscripcion.id } });
    borrado.suscripciones = 1;
  }
  await tx.empresa.delete({ where: { id: empresaId } });
  borrado.empresas = 1;
  return borrado;
}
