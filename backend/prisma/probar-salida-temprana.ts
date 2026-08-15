// Escenario de prueba para la SALIDA TEMPRANA del kiosko.
//
// Montarlo a mano es incómodo —hacen falta tres cosas a la vez: una franja que
// termine después de la hora actual, el kiosko sin exigir dispositivo vinculado,
// y un turno abierto— y sin las tres el flujo del motivo ni siquiera se dispara.
// Por eso vive aquí y no en la cabeza de nadie.
//
// Solo toca la base local. No usar contra producción.
//
//   npx ts-node prisma/probar-salida-temprana.ts            arma
//   npx ts-node prisma/probar-salida-temprana.ts --limpiar  restaura
import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
const DIAS = ['DOMINGO','LUNES','MARTES','MIERCOLES','JUEVES','VIERNES','SABADO'];
(async () => {
  const limpiar = process.argv.includes('--limpiar');
  const emp = await p.empresa.findFirst({ where: { nombre: 'Seguridad Andina Ltda' }, select: { id: true, marcadorToken: true } });
  const col = await p.colaborador.findFirst({ where: { empresaId: emp!.id, cedula: '1020304050' },
    select: { id: true, horarioId: true } });
  const bog = new Date(Date.now() - 5 * 3600000);
  const hoyDia = DIAS[bog.getUTCDay()];

  // 1. La franja de hoy tiene que terminar DESPUÉS de ahora, si no la salida no es temprana.
  const franjas = await p.franjaHorario.findMany({ where: { horarioId: col!.horarioId! } });
  const deHoy = franjas.find(f => ((f.dias as string[]) ?? []).includes(hoyDia));
  if (deHoy) await p.franjaHorario.update({ where: { id: deHoy.id }, data: { horaSalida: limpiar ? '14:00' : '22:00' } });

  // 2. El kiosko exige dispositivo vinculado: estorba para probar desde el navegador.
  await p.configuracion.updateMany({ where: { empresaId: emp!.id, clave: 'KIOSCO_SOLO_DISPOSITIVOS' },
    data: { valor: limpiar ? '1' : '0' } });

  // 3. Un turno abierto de hoy, para que la próxima marca sea la salida.
  const ini = new Date(bog); ini.setUTCHours(0,0,0,0);
  const fecha = new Date(ini.getTime() + 5 * 3600000);
  await p.registro.deleteMany({ where: { colaboradorId: col!.id, fecha: { gte: fecha, lt: new Date(fecha.getTime() + 86400000) } } });
  // Las novedades que dejó la prueba: si no se borran, el día siguiente arranca
  // con una "cita médica" pendiente de aprobar que nadie pidió.
  await p.permiso.deleteMany({ where: { colaboradorId: col!.id, fechaInicio: { gte: fecha } } });
  if (!limpiar) {
    await p.registro.create({ data: { colaboradorId: col!.id, fecha, entrada: new Date(fecha.getTime() + 8 * 3600000) } });
  }
  console.log(limpiar ? 'Restaurado (franja 14:00, solo-dispositivos ON, registros de hoy borrados).'
    : `Listo. Kiosko: /marcador/${emp!.marcadorToken} · cédula 1020304050 · franja hoy hasta 22:00 · turno abierto desde 08:00.`);
  await p.$disconnect();
})();
