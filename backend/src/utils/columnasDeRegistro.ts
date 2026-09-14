import type { Prisma } from '@prisma/client';

// Todas las columnas de una marcación menos las dos fotos de verificación facial, para las
// consultas que leen marcaciones enteras y no muestran las fotos (13 de septiembre de 2026).
// `fotoEntrada` y `fotoSalida` son base64 de cientos de KB: la lista de Registros las traía
// de MySQL solo para saber si existían. Si hace falta saberlo, se pregunta aparte trayendo
// solo los ids, como hace el detalle de la jornada.
//
// Una lista y no «todas menos las fotos»: el cliente de Prisma 5.22 no tiene `omit` sin
// activar una función en vista previa del esquema. La prueba de al lado la compara con las
// columnas que declara el cliente, así que una columna nueva no se queda afuera sin que
// nadie lo note.
export const REGISTRO_SIN_FOTOS = {
  id: true, colaboradorId: true, sedeId: true, sedeSalidaId: true, fecha: true, entrada: true, salida: true,
  tipo: true, observacion: true, salidaEstimada: true, salidaAlmuerzo: true, salidaDescanso: true,
  descansoVentana: true, entradaEstimada: true, metodoEntrada: true, metodoSalida: true,
  distanciaEntrada: true, distanciaSalida: true, editadoPor: true, editadoEn: true, creadoEn: true,
} satisfies Prisma.RegistroSelect;
