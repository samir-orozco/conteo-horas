/**
 * Le da a un colaborador de la demo una historia larga de verdad, para poder
 * mirar la línea de tiempo con más de dos hitos: con soportes, con notas, con
 * quién lo registró y con suficientes movimientos para que aparezca el
 * "Ver más".
 *
 * Solo toca a Carlos Ramírez de la empresa demo. Borra su historia y la vuelve
 * a escribir, así que se puede correr las veces que haga falta.
 *
 *   npx tsx prisma/sembrar-historia.ts
 */
import { PrismaClient, TipoVinculacion, MotivoRetiro } from '@prisma/client';

const prisma = new PrismaClient();

const CEDULA = '1020304050';
const EMAIL_ADMIN = 'admin@seguridadandina.co';

const medianoche = (s: string) => new Date(`${s}T05:00:00.000Z`);

// PDF mínimo pero válido, para que el visor tenga algo real que abrir.
const PDF = (titulo: string) => 'data:application/pdf;base64,' + Buffer.from(
  `%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n` +
  `2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n` +
  `3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 300 120]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj\n` +
  `4 0 obj<</Length 70>>stream\nBT /F1 12 Tf 20 60 Td (${titulo}) Tj ET\nendstream endobj\n` +
  `5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj\ntrailer<</Root 1 0 R>>`).toString('base64');

const doc = (nombre: string, titulo: string) => ({
  documento: PDF(titulo), documentoTipo: 'application/pdf', documentoNombre: nombre,
});

// Cuatro pasos por la empresa en cinco años. Es un caso extremo a propósito:
// si la línea de tiempo aguanta esto, aguanta cualquier ficha real.
const HISTORIA: {
  tipo: TipoVinculacion; fecha: string; motivo?: MotivoRetiro; nota?: string;
  adjunto?: [string, string];
}[] = [
  { tipo: 'INGRESO', fecha: '2021-03-01',
    nota: 'Entró como vigilante para la sede norte.' },

  { tipo: 'RETIRO', fecha: '2022-06-30', motivo: 'RENUNCIA',
    nota: 'Renunció para irse a estudiar. Avisó con un mes de anticipación.',
    adjunto: ['carta-renuncia-2022.pdf', 'Carta de renuncia - Carlos Ramirez'] },

  { tipo: 'REINGRESO', fecha: '2023-01-16',
    nota: 'Volvió al terminar el semestre, al mismo cargo.' },

  { tipo: 'RETIRO', fecha: '2023-11-30', motivo: 'SIN_JUSTA_CAUSA',
    nota: 'Se cerró la sede norte. Se liquidó indemnización del artículo 64.',
    adjunto: ['acta-terminacion-2023.pdf', 'Acta de terminacion - sede norte'] },

  { tipo: 'REINGRESO', fecha: '2024-05-02',
    nota: 'Reingresó cuando se reabrió la operación, ahora en la sede centro.' },

  { tipo: 'RETIRO', fecha: '2025-02-28', motivo: 'FIN_CONTRATO',
    nota: 'Terminó el contrato a término fijo. Se avisó con 30 días.',
    adjunto: ['preaviso-2025.pdf', 'Preaviso de no prorroga'] },

  { tipo: 'REINGRESO', fecha: '2025-09-01',
    nota: 'Nuevo contrato, esta vez a término indefinido.' },

  { tipo: 'RETIRO', fecha: '2026-08-24', motivo: 'RENUNCIA',
    nota: 'Renunció para trabajar de forma independiente.',
    adjunto: ['carta-renuncia-2026.pdf', 'Carta de renuncia - Carlos Ramirez'] },
];

(async () => {
  const usuario = await prisma.usuario.findUnique({
    where: { email: EMAIL_ADMIN }, select: { id: true, nombre: true, empresaId: true },
  });
  if (!usuario?.empresaId) throw new Error(`No encontré al usuario ${EMAIL_ADMIN}`);

  const col = await prisma.colaborador.findFirst({
    where: { cedula: CEDULA, empresaId: usuario.empresaId },
    select: { id: true, nombre: true, apellido: true },
  });
  if (!col) throw new Error(`No encontré al colaborador con cédula ${CEDULA}`);

  await prisma.vinculacionEvento.deleteMany({ where: { colaboradorId: col.id } });

  for (const e of HISTORIA) {
    await prisma.vinculacionEvento.create({
      data: {
        colaboradorId: col.id,
        tipo: e.tipo,
        fecha: medianoche(e.fecha),
        motivo: e.motivo ?? null,
        nota: e.nota ?? null,
        usuarioId: usuario.id,
        ...(e.adjunto ? doc(e.adjunto[0], e.adjunto[1]) : {}),
      },
    });
  }

  // El estado de hoy tiene que coincidir con el último hito, o la ficha se
  // contradice a sí misma: la tarjeta diría una fecha y la historia otra.
  const ultimo = HISTORIA[HISTORIA.length - 1];
  await prisma.colaborador.update({
    where: { id: col.id },
    data: {
      activo: ultimo.tipo === 'RETIRO' ? false : true,
      fechaRetiro: ultimo.tipo === 'RETIRO' ? medianoche(ultimo.fecha) : null,
      motivoRetiro: ultimo.tipo === 'RETIRO' ? ultimo.motivo ?? null : null,
      creadoEn: medianoche(HISTORIA[0].fecha),
    },
  });

  console.log(`${col.nombre} ${col.apellido}: ${HISTORIA.length} movimientos, registrados por ${usuario.nombre}.`);
  console.log(`Desde ${HISTORIA[0].fecha}, último día ${ultimo.fecha}.`);
  await prisma.$disconnect();
})();
