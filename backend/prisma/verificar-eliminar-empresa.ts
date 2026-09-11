// Verifica la COSTURA que las pruebas unitarias no cubren: que
// `borrarEmpresaEnCascada` borre de verdad, contra MySQL, TODO lo de una empresa
// y NADA de otra, sin violar ninguna llave foránea. Es lo que pide CLAUDE.md §8.6.
//
//   npx tsx prisma/verificar-eliminar-empresa.ts
//
// No necesita el servidor levantado: llama a la función real, no a la ruta (lo
// que responde la ruta está en src/routes/admin.eliminar.test.ts).
//
// Crea DOS empresas de mentira con filas en cada tabla que cuelga de ellas: la
// que se borra y una TESTIGO idéntica que no se toca. Borra la primera en lotes
// de 2, para que el camino de los lotes se recorra de verdad, y comprueba POR ID:
//   - que de la borrada no quedó ni una fila,
//   - que de la testigo no se tocó ni una, y
//   - que lo que la función dice que borró es lo que desapareció.
//
// Por id y no por empresaId, a propósito: `usuarios` y `dias_festivos` tienen la
// llave en ON DELETE SET NULL. Si la cascada se olvidara de ellos, contar por
// empresaId daría 0 igual, con un admin huérfano y un festivo de todas las
// empresas.
//
// Pase lo que pase, al final borra lo que creó.
import { prisma } from '../src/prisma';
import { borrarEmpresaEnCascada } from '../src/utils/borrarEmpresaEnCascada';

const SUFIJO = `del-${Date.now()}`;
const AHORA = new Date();
const DIA = 24 * 60 * 60 * 1000;

type Caso = { empresaId: string; filas: Record<string, string[]>; colaboradorSede: { colaboradorId: string; sedeId: string } };

async function sembrar(etiqueta: string, afiliadoId: string): Promise<Caso> {
  const s = `${SUFIJO}-${etiqueta}`;
  const empresa = await prisma.empresa.create({ data: { nombre: `Empresa ${s}`, nit: s, email: `${s}@ejemplo.co`, afiliadoId } });
  const suscripcion = await prisma.suscripcion.create({ data: { empresaId: empresa.id, finPrueba: AHORA } });
  // Un pago APROBADO y su comisión: la ruta ya no bloquea por ellos, así que la
  // cascada tiene que borrarlos respetando que la comisión apunta al pago.
  const pago = await prisma.pago.create({
    data: { suscripcionId: suscripcion.id, monto: 299900, colaboradoresFacturados: 1, periodoInicio: AHORA, periodoFin: AHORA, metodo: 'MANUAL' },
  });
  const comision = await prisma.comision.create({
    data: { afiliadoId, empresaId: empresa.id, pagoId: pago.id, montoBase: 299900, porcentaje: 20, monto: 59980 },
  });
  const usuario = await prisma.usuario.create({ data: { empresaId: empresa.id, email: `admin-${s}@ejemplo.co`, password: 'x', nombre: 'Admin' } });
  const horario = await prisma.horario.create({ data: { empresaId: empresa.id, nombre: 'Turno' } });
  const franja = await prisma.franjaHorario.create({ data: { horarioId: horario.id, dias: ['LUNES'], horaEntrada: '08:00', horaSalida: '17:00' } });
  const sede = await prisma.sede.create({ data: { empresaId: empresa.id, nombre: 'Principal' } });
  const colaborador = await prisma.colaborador.create({
    data: { empresaId: empresa.id, nombre: 'Ana', apellido: 'Prueba', cedula: `c-${s}`, salarioMensual: 1300000, horarioId: horario.id },
  });
  await prisma.colaboradorSede.create({ data: { colaboradorId: colaborador.id, sedeId: sede.id } });
  const dia = await prisma.diaEsperado.create({ data: { colaboradorId: colaborador.id, fecha: AHORA } });
  // Cinco marcaciones: con lotes de 2, la cascada tiene que partirlas en tres.
  const registros: string[] = [];
  for (let i = 0; i < 5; i++) {
    const r = await prisma.registro.create({
      data: { colaboradorId: colaborador.id, sedeId: sede.id, sedeSalidaId: sede.id, fecha: new Date(AHORA.getTime() - i * DIA) },
    });
    registros.push(r.id);
  }
  const cambio = await prisma.registroCambio.create({ data: { registroId: registros[0], campo: 'entrada', antes: '08:15', despues: '08:00' } });
  // Dos novedades: una que nació de la marcación y otra que vive por su cuenta.
  const permisoLigado = await prisma.permiso.create({
    data: { colaboradorId: colaborador.id, registroId: registros[0], fechaInicio: AHORA, fechaFin: AHORA, tipo: 'MEDICO' },
  });
  const permisoSuelto = await prisma.permiso.create({ data: { colaboradorId: colaborador.id, fechaInicio: AHORA, fechaFin: AHORA, tipo: 'PERSONAL' } });
  const contrato = await prisma.contrato.create({ data: { colaboradorId: colaborador.id, tipo: 'FIJO', fechaInicio: AHORA } });
  const prorroga = await prisma.prorrogaContrato.create({ data: { contratoId: contrato.id, desde: AHORA, hasta: AHORA } });
  const vinculo = await prisma.vinculacionEvento.create({ data: { colaboradorId: colaborador.id, tipo: 'INGRESO', fecha: AHORA } });
  const dispositivo = await prisma.dispositivoKiosco.create({ data: { empresaId: empresa.id, nombre: 'Tablet', token: `t-${s}` } });
  // En 2099: si quedara huérfano mientras se detecta, no altera ningún reporte real.
  const festivo = await prisma.diaFestivo.create({ data: { empresaId: empresa.id, fecha: new Date(Date.UTC(2099, 0, 1, 5)), nombre: `Festivo ${s}` } });
  const configuracion = await prisma.configuracion.create({ data: { empresaId: empresa.id, clave: 'qa', valor: '1' } });
  const notificacion = await prisma.notificacion.create({ data: { empresaId: empresa.id, tipo: 'QA', titulo: 'Aviso' } });
  return {
    empresaId: empresa.id,
    colaboradorSede: { colaboradorId: colaborador.id, sedeId: sede.id },
    filas: {
      empresas: [empresa.id], suscripciones: [suscripcion.id], pagos: [pago.id], comisiones: [comision.id],
      usuarios: [usuario.id], horarios: [horario.id], franjas_horario: [franja.id], sedes: [sede.id],
      colaboradores: [colaborador.id], dias_esperados: [dia.id], registros, registro_cambios: [cambio.id],
      permisos: [permisoLigado.id, permisoSuelto.id], contratos: [contrato.id], prorrogas_contrato: [prorroga.id],
      vinculacion_eventos: [vinculo.id], dispositivos_kiosco: [dispositivo.id], dias_festivos: [festivo.id],
      configuracion: [configuracion.id], notificaciones: [notificacion.id],
    },
  };
}

// Cuántas de ESAS filas siguen existiendo, tabla por tabla, buscándolas por id.
async function contar(caso: Caso): Promise<Record<string, number>> {
  const f = caso.filas;
  const porId = (ids: string[]) => ({ where: { id: { in: ids } } });
  const n = await Promise.all([
    prisma.empresa.count(porId(f.empresas)),
    prisma.suscripcion.count(porId(f.suscripciones)),
    prisma.pago.count(porId(f.pagos)),
    prisma.comision.count(porId(f.comisiones)),
    prisma.usuario.count(porId(f.usuarios)),
    prisma.horario.count(porId(f.horarios)),
    prisma.franjaHorario.count(porId(f.franjas_horario)),
    prisma.sede.count(porId(f.sedes)),
    prisma.colaborador.count(porId(f.colaboradores)),
    prisma.colaboradorSede.count({ where: caso.colaboradorSede }),
    prisma.diaEsperado.count(porId(f.dias_esperados)),
    prisma.registro.count(porId(f.registros)),
    prisma.registroCambio.count(porId(f.registro_cambios)),
    prisma.permiso.count(porId(f.permisos)),
    prisma.contrato.count(porId(f.contratos)),
    prisma.prorrogaContrato.count(porId(f.prorrogas_contrato)),
    prisma.vinculacionEvento.count(porId(f.vinculacion_eventos)),
    prisma.dispositivoKiosco.count(porId(f.dispositivos_kiosco)),
    prisma.diaFestivo.count(porId(f.dias_festivos)),
    prisma.configuracion.count(porId(f.configuracion)),
    prisma.notificacion.count(porId(f.notificaciones)),
  ]);
  const tablas = ['empresas', 'suscripciones', 'pagos', 'comisiones', 'usuarios', 'horarios', 'franjas_horario', 'sedes',
    'colaboradores', 'colaboradores_sedes', 'dias_esperados', 'registros', 'registro_cambios', 'permisos', 'contratos',
    'prorrogas_contrato', 'vinculacion_eventos', 'dispositivos_kiosco', 'dias_festivos', 'configuracion', 'notificaciones'];
  return Object.fromEntries(tablas.map((t, i) => [t, n[i]]));
}

async function main() {
  console.log(`\nVerificación del borrado en cascada, sufijo ${SUFIJO}\n`);
  let fallas = 0;
  let afiliadoId: string | null = null;
  const empresas: string[] = [];
  const marca = (ok: boolean) => { if (!ok) fallas++; return ok ? 'ok   ' : 'FALLA'; };
  try {
    afiliadoId = (await prisma.afiliado.create({ data: { nombre: `Afiliado ${SUFIJO}`, codigo: SUFIJO.toUpperCase() } })).id;
    const borrada = await sembrar('borrada', afiliadoId);
    empresas.push(borrada.empresaId);
    const testigo = await sembrar('testigo', afiliadoId);
    empresas.push(testigo.empresaId);

    const antesB = await contar(borrada);
    const antesT = await contar(testigo);
    const tablas = Object.keys(antesB);
    console.log(`Caso creado: dos empresas, cada una con ${Object.values(antesB).reduce((a, b) => a + b, 0)} filas en ${tablas.length} tablas.`);

    const t0 = Date.now();
    const borrado = await prisma.$transaction(tx => borrarEmpresaEnCascada(tx, borrada.empresaId, { lote: 2 }), { timeout: 60_000 });
    console.log(`Borrado ejecutado en ${Date.now() - t0} ms, en lotes de 2.\n`);

    const despuesB = await contar(borrada);
    const despuesT = await contar(testigo);
    const ancho = Math.max(...tablas.map(t => t.length));
    console.log('  La empresa borrada: tiene que quedar en 0, y la función tiene que contar lo mismo que desapareció');
    for (const t of tablas) {
      const ok = antesB[t] > 0 && despuesB[t] === 0 && (borrado[t] ?? 0) === antesB[t];
      console.log(`    ${marca(ok)} ${t.padEnd(ancho)}  ${antesB[t]} → ${despuesB[t]}   (la función dice ${borrado[t] ?? 0})`);
    }
    console.log('\n  La empresa testigo: no se puede tocar ni una fila');
    for (const t of tablas) {
      const ok = antesT[t] > 0 && despuesT[t] === antesT[t];
      console.log(`    ${marca(ok)} ${t.padEnd(ancho)}  ${antesT[t]} → ${despuesT[t]}`);
    }
    // SET NULL no borra: le cambia la empresa. Por eso de la testigo se mira que sigan siendo suyos.
    const suyos = await Promise.all([
      prisma.usuario.count({ where: { id: { in: testigo.filas.usuarios }, empresaId: testigo.empresaId } }),
      prisma.diaFestivo.count({ where: { id: { in: testigo.filas.dias_festivos }, empresaId: testigo.empresaId } }),
    ]);
    console.log(`    ${marca(suyos[0] === 1 && suyos[1] === 1)} su usuario y su festivo siguen siendo de ella  (${suyos.join(', ')})`);

    const afiliadoVivo = await prisma.afiliado.count({ where: { id: afiliadoId } });
    console.log(`\n  ${marca(afiliadoVivo === 1)} el afiliado sobrevive al borrado de su referido  (${afiliadoVivo})`);
  } catch (e) {
    fallas++;
    console.error('\nLa verificación se cayó a mitad:', e);
  } finally {
    // Limpieza, pase lo que pase. Antes, si la cascada fallaba, quedaba en la base
    // una empresa con un pago APROBADO de mentira que sumaba en /admin/ingresos.
    for (const empresaId of empresas) {
      if (await prisma.empresa.count({ where: { id: empresaId } })) {
        await prisma.$transaction(tx => borrarEmpresaEnCascada(tx, empresaId), { timeout: 60_000 })
          .catch(e => { fallas++; console.error(`No se pudo limpiar la empresa ${empresaId}:`, e); });
      }
    }
    // Lo que una cascada rota pudo dejar huérfano con empresaId en null.
    await prisma.usuario.deleteMany({ where: { email: { contains: SUFIJO } } });
    await prisma.diaFestivo.deleteMany({ where: { nombre: { startsWith: `Festivo ${SUFIJO}` } } });
    if (afiliadoId) await prisma.afiliado.deleteMany({ where: { id: afiliadoId } });
    const sobras = (await prisma.empresa.count({ where: { nit: { startsWith: SUFIJO } } }))
      + (await prisma.usuario.count({ where: { email: { contains: SUFIJO } } }))
      + (await prisma.diaFestivo.count({ where: { nombre: { startsWith: `Festivo ${SUFIJO}` } } }))
      + (await prisma.afiliado.count({ where: { codigo: SUFIJO.toUpperCase() } }));
    if (sobras) fallas++;
    console.log(`\n${fallas === 0 ? 'TODO EN VERDE' : `${fallas} COMPROBACIÓN(ES) EN ROJO`}. Limpieza: ${sobras ? `QUEDARON ${sobras} FILAS` : 'sin sobras'}.\n`);
    process.exitCode = fallas === 0 ? 0 : 1;
  }
}

main().finally(() => prisma.$disconnect());
