// Verifica la COSTURA que las pruebas unitarias no cubren: que
// `borrarEmpresaEnCascada` borre de verdad, contra MySQL, en las veinte tablas
// y en un orden que no viole ninguna llave foránea. Es lo que pide CLAUDE.md §8.6.
//
//   npx tsx prisma/verificar-eliminar-empresa.ts
//
// No necesita el servidor levantado: llama a la función real, no a la ruta.
// Crea una empresa de mentira con UNA FILA EN CADA TABLA que cuelga de ella,
// corre el borrado de verdad, comprueba tabla por tabla que no quedó nada, y
// borra lo poco que sobrevive a propósito (el afiliado, que es una persona y
// no parte de la empresa).
//
// Lo que este script NO verifica: los códigos de respuesta de la ruta
// (204/400/409). Eso es la ruta, no la cascada, y se comprueba en el navegador.
import { prisma } from '../src/prisma';
import { borrarEmpresaEnCascada } from '../src/utils/borrarEmpresaEnCascada';

const SUFIJO = `del-${Date.now()}`;
const AHORA = new Date();

type Resultado = { tabla: string; antes: number; despues: number; ok: boolean };
const resultados: Resultado[] = [];

async function main() {
  console.log(`\nVerificación del borrado en cascada — sufijo ${SUFIJO}\n`);

  // ---------- 1. El caso: una empresa con un hijo en cada tabla ----------
  const afiliado = await prisma.afiliado.create({
    data: { nombre: `Afiliado ${SUFIJO}`, codigo: SUFIJO.toUpperCase() },
  });

  const empresa = await prisma.empresa.create({
    data: {
      nombre: `Empresa ${SUFIJO}`,
      nit: SUFIJO,
      email: `${SUFIJO}@ejemplo.co`,
      afiliadoId: afiliado.id,
    },
  });

  const suscripcion = await prisma.suscripcion.create({
    data: { empresaId: empresa.id, finPrueba: AHORA },
  });

  // Un pago APROBADO y su comisión. La ruta los bloquearía, pero la cascada no
  // decide: tiene que saber borrarlos, y sobre todo respetar que la comisión
  // apunta al pago y el pago a la suscripción.
  const pago = await prisma.pago.create({
    data: {
      suscripcionId: suscripcion.id,
      monto: 299900,
      colaboradoresFacturados: 1,
      periodoInicio: AHORA,
      periodoFin: AHORA,
      metodo: 'MANUAL',
    },
  });
  await prisma.comision.create({
    data: { afiliadoId: afiliado.id, empresaId: empresa.id, pagoId: pago.id, montoBase: 299900, porcentaje: 20, monto: 59980 },
  });

  await prisma.usuario.create({
    data: { empresaId: empresa.id, email: `admin-${SUFIJO}@ejemplo.co`, password: 'x', nombre: 'Admin' },
  });

  const horario = await prisma.horario.create({ data: { empresaId: empresa.id, nombre: 'Turno' } });
  await prisma.franjaHorario.create({
    data: { horarioId: horario.id, dias: ['LUNES'], horaEntrada: '08:00', horaSalida: '17:00' },
  });

  const sede = await prisma.sede.create({ data: { empresaId: empresa.id, nombre: 'Principal' } });

  const colaborador = await prisma.colaborador.create({
    data: {
      empresaId: empresa.id, nombre: 'Ana', apellido: 'Prueba',
      cedula: `c${Date.now()}`, salarioMensual: 1300000, horarioId: horario.id,
    },
  });
  await prisma.colaboradorSede.create({ data: { colaboradorId: colaborador.id, sedeId: sede.id } });
  await prisma.diaEsperado.create({ data: { colaboradorId: colaborador.id, fecha: AHORA } });

  const registro = await prisma.registro.create({
    data: { colaboradorId: colaborador.id, sedeId: sede.id, fecha: AHORA },
  });
  await prisma.registroCambio.create({
    data: { registroId: registro.id, campo: 'entrada', antes: '08:15', despues: '08:00' },
  });
  // Dos novedades: una que nació de la marcación y otra que vive por su cuenta.
  await prisma.permiso.create({
    data: { colaboradorId: colaborador.id, registroId: registro.id, fechaInicio: AHORA, fechaFin: AHORA, tipo: 'MEDICO' },
  });
  await prisma.permiso.create({
    data: { colaboradorId: colaborador.id, fechaInicio: AHORA, fechaFin: AHORA, tipo: 'PERSONAL' },
  });

  const contrato = await prisma.contrato.create({
    data: { colaboradorId: colaborador.id, tipo: 'FIJO', fechaInicio: AHORA },
  });
  await prisma.prorrogaContrato.create({ data: { contratoId: contrato.id, desde: AHORA, hasta: AHORA } });
  await prisma.vinculacionEvento.create({
    data: { colaboradorId: colaborador.id, tipo: 'INGRESO', fecha: AHORA },
  });

  await prisma.dispositivoKiosco.create({
    data: { empresaId: empresa.id, nombre: 'Tablet', token: `t-${SUFIJO}` },
  });
  await prisma.diaFestivo.create({ data: { empresaId: empresa.id, fecha: AHORA, nombre: 'Festivo propio' } });
  await prisma.configuracion.create({ data: { empresaId: empresa.id, clave: 'qa', valor: '1' } });
  await prisma.notificacion.create({ data: { empresaId: empresa.id, tipo: 'QA', titulo: 'Aviso' } });

  // ---------- 2. Contar antes ----------
  const contar = () => contarTodo(empresa.id, colaborador.id, sede.id, horario.id, suscripcion.id, contrato.id, registro.id);
  const antes = await contar();
  const totalAntes = Object.values(antes).reduce((a, b) => a + b, 0);
  console.log(`Caso creado: ${totalAntes} filas en ${Object.keys(antes).length} tablas.`);

  // ---------- 3. Correr la función DE VERDAD ----------
  const t0 = Date.now();
  await prisma.$transaction(async (tx) => borrarEmpresaEnCascada(tx, empresa.id), { timeout: 60_000 });
  const ms = Date.now() - t0;
  console.log(`Borrado ejecutado en ${ms} ms.\n`);

  // ---------- 4. Comprobar lo que quedó ----------
  const despues = await contar();
  for (const tabla of Object.keys(antes)) {
    resultados.push({
      tabla,
      antes: antes[tabla],
      despues: despues[tabla],
      ok: antes[tabla] > 0 && despues[tabla] === 0,
    });
  }

  const ancho = Math.max(...resultados.map(r => r.tabla.length));
  for (const r of resultados) {
    const marca = r.ok ? 'ok  ' : 'FALLA';
    console.log(`  ${marca} ${r.tabla.padEnd(ancho)}  ${r.antes} → ${r.despues}`);
  }

  // El afiliado NO se borra: es una persona, no parte de la empresa. Que siga
  // vivo es parte de lo que se está comprobando.
  const afiliadoVivo = await prisma.afiliado.count({ where: { id: afiliado.id } });
  console.log(`\n  ${afiliadoVivo === 1 ? 'ok   ' : 'FALLA'} el afiliado sobrevive al borrado de su referido  (${afiliadoVivo})`);

  // ---------- 5. Borrar lo que este script creó ----------
  await prisma.afiliado.delete({ where: { id: afiliado.id } });
  const sobras = await prisma.afiliado.count({ where: { codigo: SUFIJO.toUpperCase() } });

  const fallas = resultados.filter(r => !r.ok).length + (afiliadoVivo === 1 ? 0 : 1) + sobras;
  console.log(`\n${fallas === 0 ? 'TODO EN VERDE' : `${fallas} COMPROBACIÓN(ES) EN ROJO`}. Limpieza: sin sobras.\n`);
  process.exitCode = fallas === 0 ? 0 : 1;
}

// Cuenta las filas del caso en cada tabla, por id, sin barrer tablas enteras.
async function contarTodo(
  empresaId: string, colaboradorId: string, sedeId: string,
  horarioId: string, suscripcionId: string, contratoId: string, registroId: string,
): Promise<Record<string, number>> {
  const [
    empresas, usuarios, suscripciones, pagos, comisiones, horarios, franjas, sedes,
    colaboradores, colabSedes, diasEsperados, registros, cambios, permisos,
    contratos, prorrogas, vinculacion, dispositivos, festivos, configuracion, notificaciones,
  ] = await Promise.all([
    prisma.empresa.count({ where: { id: empresaId } }),
    prisma.usuario.count({ where: { empresaId } }),
    prisma.suscripcion.count({ where: { empresaId } }),
    prisma.pago.count({ where: { suscripcionId } }),
    prisma.comision.count({ where: { empresaId } }),
    prisma.horario.count({ where: { empresaId } }),
    prisma.franjaHorario.count({ where: { horarioId } }),
    prisma.sede.count({ where: { empresaId } }),
    prisma.colaborador.count({ where: { empresaId } }),
    prisma.colaboradorSede.count({ where: { colaboradorId } }),
    prisma.diaEsperado.count({ where: { colaboradorId } }),
    prisma.registro.count({ where: { colaboradorId } }),
    prisma.registroCambio.count({ where: { registroId } }),
    prisma.permiso.count({ where: { colaboradorId } }),
    prisma.contrato.count({ where: { colaboradorId } }),
    prisma.prorrogaContrato.count({ where: { contratoId } }),
    prisma.vinculacionEvento.count({ where: { colaboradorId } }),
    prisma.dispositivoKiosco.count({ where: { empresaId } }),
    prisma.diaFestivo.count({ where: { empresaId } }),
    prisma.configuracion.count({ where: { empresaId } }),
    prisma.notificacion.count({ where: { empresaId } }),
  ]);
  return {
    empresas, usuarios, suscripciones, pagos, comisiones, horarios,
    franjas_horario: franjas, sedes, colaboradores, colaboradores_sedes: colabSedes,
    dias_esperados: diasEsperados, registros, registro_cambios: cambios, permisos,
    contratos, prorrogas_contrato: prorrogas, vinculacion_eventos: vinculacion,
    dispositivos_kiosco: dispositivos, dias_festivos: festivos, configuracion, notificaciones,
  };
}

main()
  .catch(e => { console.error(e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
