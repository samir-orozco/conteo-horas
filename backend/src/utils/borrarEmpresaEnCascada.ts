import { Prisma } from '@prisma/client';

// La plomería del borrado de una empresa: veinte tablas, de las hojas a la raíz.
//
// Va en su propio archivo, aparte de `eliminarEmpresa.ts`, por la regla de la
// sección 8.2 de CLAUDE.md: aquel tiene la DECISIÓN (qué se puede borrar y qué
// no) y está al 100%; esto habla con MySQL y no va a llegar al 80% ni tiene por
// qué. Se verifica con `prisma/verificar-eliminar-empresa.ts`, que crea una
// empresa de mentira, llama a ESTA función y comprueba lo que quedó.
//
// Recibe el cliente de transacción en vez de importar `prisma`: así el que
// llama decide la transacción, y el script de verificación puede correr la
// función real sin levantar Fastify (sección 8.5).
//
// El orden no es estético. De las diez tablas que apuntan a `empresas`, solo
// las que cuelgan de `colaboradores` y `franjas_horario` tienen ON DELETE
// CASCADE: borrar la empresa sin limpiar antes falla con error de restricción.

export async function borrarEmpresaEnCascada(
  tx: Prisma.TransactionClient,
  empresaId: string,
): Promise<void> {
  const colaboradores = (await tx.colaborador.findMany({ where: { empresaId }, select: { id: true } })).map(c => c.id);
  const sedes = (await tx.sede.findMany({ where: { empresaId }, select: { id: true } })).map(s => s.id);
  const horarios = (await tx.horario.findMany({ where: { empresaId }, select: { id: true } })).map(h => h.id);
  const contratos = (await tx.contrato.findMany({ where: { colaboradorId: { in: colaboradores } }, select: { id: true } })).map(c => c.id);
  const registros = (await tx.registro.findMany({ where: { colaboradorId: { in: colaboradores } }, select: { id: true } })).map(r => r.id);
  const suscripcion = await tx.suscripcion.findUnique({ where: { empresaId }, select: { id: true } });

  await tx.prorrogaContrato.deleteMany({ where: { contratoId: { in: contratos } } });
  await tx.contrato.deleteMany({ where: { colaboradorId: { in: colaboradores } } });
  await tx.vinculacionEvento.deleteMany({ where: { colaboradorId: { in: colaboradores } } });
  await tx.diaEsperado.deleteMany({ where: { colaboradorId: { in: colaboradores } } });
  await tx.registroCambio.deleteMany({ where: { registroId: { in: registros } } });
  await tx.permiso.deleteMany({ where: { colaboradorId: { in: colaboradores } } });
  await tx.registro.deleteMany({ where: { colaboradorId: { in: colaboradores } } });
  await tx.registro.deleteMany({ where: { sedeId: { in: sedes } } });
  await tx.colaboradorSede.deleteMany({
    where: { OR: [{ colaboradorId: { in: colaboradores } }, { sedeId: { in: sedes } }] },
  });
  await tx.colaborador.deleteMany({ where: { empresaId } });
  await tx.sede.deleteMany({ where: { empresaId } });
  // Después de colaboradores: `colaboradores.horarioId` los apunta.
  await tx.franjaHorario.deleteMany({ where: { horarioId: { in: horarios } } });
  await tx.horario.deleteMany({ where: { empresaId } });
  await tx.dispositivoKiosco.deleteMany({ where: { empresaId } });
  await tx.diaFestivo.deleteMany({ where: { empresaId } });
  await tx.configuracion.deleteMany({ where: { empresaId } });
  await tx.notificacion.deleteMany({ where: { empresaId } });
  await tx.usuario.deleteMany({ where: { empresaId } });
  await tx.comision.deleteMany({ where: { empresaId } });
  if (suscripcion) {
    // Quedan los PENDIENTE y RECHAZADO: los APROBADO bloquean antes de llegar aquí.
    await tx.pago.deleteMany({ where: { suscripcionId: suscripcion.id } });
    await tx.suscripcion.delete({ where: { id: suscripcion.id } });
  }
  await tx.empresa.delete({ where: { id: empresaId } });
}
