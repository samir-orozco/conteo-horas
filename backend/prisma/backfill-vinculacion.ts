// Historia inicial de los colaboradores que ya existían.
//
// Sin esto, todo el mundo arranca con una línea de tiempo vacía y la ficha
// parecería decir que nadie ingresó nunca. Se usa `creadoEn` como fecha de
// ingreso (es lo más cercano que hay guardado) y se deja dicho en la nota que
// es aproximada, para no hacer pasar por dato lo que es una inferencia.
//
// Idempotente: no vuelve a crear el INGRESO de quien ya lo tiene.
import { prisma } from '../src/prisma';

(async () => {
  const cols = await prisma.colaborador.findMany({
    select: { id: true, nombre: true, apellido: true, creadoEn: true, activo: true,
      fechaRetiro: true, motivoRetiro: true },
  });

  let ingresos = 0, retiros = 0;
  for (const c of cols) {
    const yaTiene = await prisma.vinculacionEvento.count({
      where: { colaboradorId: c.id, tipo: 'INGRESO' },
    });
    if (!yaTiene) {
      await prisma.vinculacionEvento.create({
        data: {
          colaboradorId: c.id, tipo: 'INGRESO', fecha: c.creadoEn,
          nota: 'Fecha tomada de la creación de la ficha, antes de que se registraran los ingresos',
        },
      });
      ingresos++;
    }
    // Quien ya está retirado y no tiene su evento, lo recibe con lo que se sabe.
    if (!c.activo && c.fechaRetiro) {
      const tieneRetiro = await prisma.vinculacionEvento.count({
        where: { colaboradorId: c.id, tipo: 'RETIRO' },
      });
      if (!tieneRetiro) {
        await prisma.vinculacionEvento.create({
          data: { colaboradorId: c.id, tipo: 'RETIRO', fecha: c.fechaRetiro, motivo: c.motivoRetiro },
        });
        retiros++;
      }
    }
  }
  console.log(`  ${cols.length} colaboradores · ${ingresos} ingresos y ${retiros} retiros sembrados`);
  await prisma.$disconnect();
})();
