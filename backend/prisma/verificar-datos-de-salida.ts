// Verifica la COSTURA de los datos de una salida cuando un administrador
// reescribe la jornada entera con PUT /api/registros/jornada/:id.
//
//   npx tsx prisma/verificar-datos-de-salida.ts
//
// Quitar o poner el descanso cambia CUÁL salida guarda cada fila. Lo que dice cómo
// se marcó esa salida (sede, foto, método, distancia, si la estimó el sistema) y
// la novedad de salida temprana tienen que ir con ella, y una foto del kiosco que
// no queda en ninguna fila no se borra sin que el administrador lo confirme. La
// decisión vive en `salidasTrasEditar` y tiene sus pruebas. Esto verifica que la
// ruta la cumpla contra la base: lo que pinta la pantalla de fotos del día
// (GET /:id/jornada/fotos), lo que queda escrito, y que sin confirmar no se
// escriba nada.
//
// NO necesita el backend corriendo. Mismo montaje que `verificar-sede-de-salida.ts`:
// un Fastify en este proceso con las rutas de verdad y `inject`, así que no ocupa
// un puerto ni arranca las tareas diarias. Por lo mismo NO verifica el cableado de
// `index.ts`: los decoradores de autenticación de aquí son una copia mínima.
//
// Las fotos son marcas de texto (`CIERRE_1700`), no imágenes. La ruta no mira los
// bytes, solo los mueve de una fila a otra, y con una marca legible se ve a dónde
// fue a parar cada una.
//
// Crea una empresa de prueba y BORRA todo lo que creó, pase lo que pase.
import Fastify, { type FastifyReply, type FastifyRequest } from 'fastify';
import jwt from '@fastify/jwt';
import { prisma } from '../src/prisma';
import registroRoutes from '../src/routes/registros';

const SUFIJO = `salidat-${Date.now()}`;
const POBLADO = { lat: 6.2087, lng: -75.5674, radio: 150 };
const LAURELES = { lat: 6.2447, lng: -75.5916, radio: 150 };

// Un día pasado y fijo, lejos del kiosco de hoy.
const DIA = '2026-09-01';
const FECHA = new Date(`${DIA}T05:00:00.000Z`);
const hora = (hhmm: string) => new Date(`${DIA}T${hhmm}:00.000-05:00`);
// Bogotá es UTC-5 todo el año, sin horario de verano.
const hhmm = (d: Date | string | null) =>
  d ? new Date(new Date(d).getTime() - 5 * 3_600_000).toISOString().slice(11, 16) : '--:--';

const PREFIJO_FOTO = 'data:image/jpeg;base64,';
const foto = (marca: string) => `${PREFIJO_FOTO}${marca}`;
const marcaDe = (f: string | null) => (f ? f.replace(PREFIJO_FOTO, '') : 'sin foto');

type Caso = { nombre: string; espera: string; ok: boolean; obtenido: string };
const casos: Caso[] = [];
function comprobar(nombre: string, espera: string, obtenido: string) {
  casos.push({ nombre, espera, obtenido, ok: espera === obtenido });
}

type Sesion = { id: string; empresaId: string; nombre: string };
type Respuesta = { estado: number; cuerpo: Record<string, unknown> };
type FotoDelDia = {
  registroId: string; momento: string; hora: string | null; foto: string | null;
  estimada: boolean; sede: { nombre: string } | null;
};
type Vista = { momento: string; hora: string; foto: string; metodo: string; sede: string; estimada: boolean };
// Lo que escribe el kiosco en un momento de la marcación.
type Marca = { hora: string; foto?: string; metodo?: 'ROSTRO' | 'CEDULA'; distancia?: number; sede?: string; estimada?: boolean };

// "SALIDA_ALMUERZO 12:00, REGRESO_ALMUERZO 13:00", o vacío si no vino la lista.
const fotosPedidas = (cuerpo: Record<string, unknown>) => (Array.isArray(cuerpo.fotos)
  ? (cuerpo.fotos as { momento: string; hora: string | null }[]).map(f => `${f.momento} ${hhmm(f.hora)}`).join(', ')
  : '');
const resumen = (r: Respuesta) => [r.estado, r.cuerpo.codigo, fotosPedidas(r.cuerpo)].filter(Boolean).join(' ');

async function main() {
  const app = Fastify();
  await app.register(jwt, { secret: `verificacion-${SUFIJO}` });
  app.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
    try { await request.jwtVerify(); } catch { reply.status(401).send({ error: 'No autorizado' }); }
  });
  app.decorate('requireEmpresa', async (request: FastifyRequest, reply: FastifyReply) => {
    try { await request.jwtVerify(); } catch { return reply.status(401).send({ error: 'No autorizado' }); }
    const u = request.user as Sesion;
    Object.assign(request, { empresaId: u.empresaId, usuarioId: u.id, usuarioNombre: u.nombre });
  });
  await app.register(registroRoutes, { prefix: '/api/registros' });
  await app.ready();

  const empresa = await prisma.empresa.create({
    data: { nombre: `Prueba ${SUFIJO}`, nit: SUFIJO, email: `${SUFIJO}@prueba.local`, marcadorToken: SUFIJO, activa: true },
    select: { id: true },
  });
  const sedeA = await prisma.sede.create({ data: { empresaId: empresa.id, nombre: 'El Poblado', ...POBLADO, activa: true }, select: { id: true } });
  const sedeB = await prisma.sede.create({ data: { empresaId: empresa.id, nombre: 'Laureles', ...LAURELES, activa: true }, select: { id: true } });
  const admin = app.jwt.sign({ id: `admin-${SUFIJO}`, email: `${SUFIJO}@prueba.local`, rol: 'ADMIN', nombre: 'Verificación', empresaId: empresa.id });

  const pedir = async (method: 'GET' | 'PUT', url: string, payload?: object): Promise<Respuesta> => {
    const r = await app.inject({ method, url, payload, headers: { authorization: `Bearer ${admin}` } });
    return { estado: r.statusCode, cuerpo: r.json() as Record<string, unknown> };
  };

  // Guarda como el formulario: si el servidor pregunta por fotos, confirma y anota
  // cuáles preguntó, para comprobar que pregunte cuando toca y solo entonces.
  const guardar = async (id: string, cuerpo: object) => {
    const url = `/api/registros/jornada/${id}`;
    const r = await pedir('PUT', url, cuerpo);
    if (r.cuerpo.codigo !== 'BORRA_FOTOS') return `${r.estado} sin preguntar`;
    const confirmado = await pedir('PUT', url, { ...cuerpo, confirmarBorrarFotos: true });
    return `${confirmado.estado} tras preguntar por ${fotosPedidas(r.cuerpo)}`;
  };

  const crear = (etiqueta: string) => prisma.colaborador.create({
    data: {
      empresaId: empresa.id, nombre: etiqueta, apellido: 'Prueba', cedula: `${SUFIJO}-${etiqueta}`,
      salarioMensual: 1_500_000, modalidad: 'PRESENCIAL',
    },
    select: { id: true },
  });

  const marcacion = (colaboradorId: string, ent: Marca, sal: Marca | null, salidaAlmuerzo = false) =>
    prisma.registro.create({
      data: {
        colaboradorId, fecha: FECHA, salidaAlmuerzo,
        entrada: hora(ent.hora), sedeId: ent.sede ?? null,
        fotoEntrada: ent.foto ? foto(ent.foto) : null, metodoEntrada: ent.metodo ?? null, distanciaEntrada: ent.distancia ?? null,
        ...(sal ? {
          salida: hora(sal.hora), sedeSalidaId: sal.sede ?? null, salidaEstimada: sal.estimada ?? false,
          fotoSalida: sal.foto ? foto(sal.foto) : null, metodoSalida: sal.metodo ?? null, distanciaSalida: sal.distancia ?? null,
        } : {}),
      },
      select: { id: true },
    });

  // Una novedad de salida temprana tal como la deja el kiosco: colgada de la
  // marcación que cerró. Aprobada, que es cuando borrarla mueve la liquidación.
  const novedadDe = (colaboradorId: string, registroId: string) => prisma.permiso.create({
    data: { colaboradorId, registroId, tipo: 'MEDICO', descripcion: 'Salida temprana: cita médica', fechaInicio: FECHA, fechaFin: FECHA, aprobado: true },
    select: { id: true },
  });

  // Lo que ve quien abre las fotos del día, con el método y la distancia que la
  // pantalla de revisión pone junto a cada marca.
  const vistaDelDia = async (unId: string): Promise<Vista[]> => {
    const r = await pedir('GET', `/api/registros/${unId}/jornada/fotos`);
    if (r.estado !== 200) throw new Error(`fotos del día: ${r.estado} ${JSON.stringify(r.cuerpo)}`);
    const fotos = r.cuerpo.fotos as FotoDelDia[];
    const filas = await prisma.registro.findMany({
      where: { id: { in: fotos.map(f => f.registroId) } },
      select: { id: true, metodoEntrada: true, metodoSalida: true, distanciaEntrada: true, distanciaSalida: true },
    });
    return fotos.map(f => {
      const fila = filas.find(x => x.id === f.registroId);
      const esEntrada = f.momento === 'ENTRADA' || f.momento === 'REGRESO_ALMUERZO';
      const metodo = esEntrada ? fila?.metodoEntrada : fila?.metodoSalida;
      const distancia = esEntrada ? fila?.distanciaEntrada : fila?.distanciaSalida;
      return {
        momento: f.momento, hora: hhmm(f.hora), foto: marcaDe(f.foto),
        metodo: `${metodo ?? '—'}${distancia != null ? ` ${distancia}` : ''}`,
        sede: f.sede?.nombre ?? 'sin sede', estimada: f.estimada,
      };
    });
  };

  const dondeEstaLaNovedad = async (permisoId: string) => {
    const p = await prisma.permiso.findUnique({
      where: { id: permisoId }, select: { registro: { select: { salida: true, salidaAlmuerzo: true } } },
    });
    if (!p) return 'BORRADA';
    if (!p.registro) return 'suelta';
    return `en la salida de las ${hhmm(p.registro.salida)}${p.registro.salidaAlmuerzo ? ' (al descanso)' : ''}`;
  };

  const pintar = async (titulo: string, unId: string, extra: { novedad?: string; bitacora?: string } = {}) => {
    const vista = await vistaDelDia(unId);
    console.log(`  ${titulo}:`);
    for (const v of vista) {
      console.log(`    ${v.momento.padEnd(17)} ${v.hora}  ${v.foto.padEnd(14)} ${v.metodo.padEnd(12)} ${v.sede}${v.estimada ? '   [estimada: nadie la marcó]' : ''}`);
    }
    if (extra.novedad) console.log(`    novedad de salida temprana: ${await dondeEstaLaNovedad(extra.novedad)}`);
    if (extra.bitacora) {
      const hay = await prisma.registroCambio.count({ where: { id: extra.bitacora } });
      console.log(`    bitácora de la marcación de la tarde: ${hay ? 'se conserva' : 'BORRADA'}`);
    }
    return vista;
  };
  const momento = (vista: Vista[], m: string) => vista.find(v => v.momento === m);
  const describir = (v: Vista | undefined) => (v ? `${v.hora} ${v.foto} ${v.metodo} ${v.sede}` : 'no vino');

  // Las cuatro marcas de un día con descanso, todas del kiosco y con rostro.
  const ENTRADA: Marca = { hora: '08:00', foto: 'ENTRADA_0800', metodo: 'ROSTRO', distancia: 0.30, sede: sedeA.id };
  const DESCANSO: Marca = { hora: '12:00', foto: 'DESCANSO_1200', metodo: 'ROSTRO', distancia: 0.31, sede: sedeB.id };
  const REGRESO: Marca = { hora: '13:00', foto: 'REGRESO_1300', metodo: 'ROSTRO', distancia: 0.33, sede: sedeB.id };
  const CIERRE: Marca = { hora: '17:00', foto: 'CIERRE_1700', metodo: 'ROSTRO', distancia: 0.42, sede: sedeA.id };

  // ---- 1. Quitar el descanso ----
  console.log('\n1. QUITAR EL DESCANSO (08:00 a 17:00 sin descanso)');
  const c1 = await crear('Quitar');
  const a1 = await marcacion(c1.id, ENTRADA, DESCANSO, true);
  const b1 = await marcacion(c1.id, REGRESO, CIERRE);
  const nov1 = await novedadDe(c1.id, b1.id);
  const bit1 = await prisma.registroCambio.create({
    data: { registroId: b1.id, campo: 'salida', antes: '16:40', despues: '17:00', usuarioNombre: 'Verificación' },
    select: { id: true },
  });
  await pintar('antes', a1.id, { novedad: nov1.id, bitacora: bit1.id });
  const QUITAR = { fecha: DIA, entrada: '08:00', salida: '17:00', tipo: 'NORMAL' };
  const r1 = await pedir('PUT', `/api/registros/jornada/${a1.id}`, QUITAR);
  comprobar('quitar: sin confirmar, el servidor pregunta por las fotos que se borrarían',
    '409 BORRA_FOTOS SALIDA_ALMUERZO 12:00, REGRESO_ALMUERZO 13:00', resumen(r1));
  const intacta = await vistaDelDia(a1.id);
  comprobar('quitar: sin confirmar no se escribe nada',
    '4 marcas, salida 17:00 CIERRE_1700, novedad en la salida de las 17:00',
    `${intacta.length} marcas, salida ${momento(intacta, 'SALIDA')?.hora} ${momento(intacta, 'SALIDA')?.foto}, novedad ${await dondeEstaLaNovedad(nov1.id)}`);
  const e1 = await pedir('PUT', `/api/registros/jornada/${a1.id}`, { ...QUITAR, confirmarBorrarFotos: true });
  comprobar('quitar: confirmando, la ruta acepta', '200', `${e1.estado}`);
  const v1 = await pintar('después de confirmar', a1.id, { novedad: nov1.id, bitacora: bit1.id });
  const s1 = momento(v1, 'SALIDA');
  comprobar('quitar: la SALIDA de las 17:00 muestra la foto que se tomó a las 17:00', '17:00 CIERRE_1700', `${s1?.hora} ${s1?.foto}`);
  comprobar('quitar: esa salida lleva el método y la distancia de su marca', 'ROSTRO 0.42', s1?.metodo ?? 'no vino');
  comprobar('quitar: esa salida sigue en la sede donde se cerró', 'El Poblado', s1?.sede ?? 'no vino');
  comprobar('quitar: la novedad de la salida temprana no se borra', 'en la salida de las 17:00', await dondeEstaLaNovedad(nov1.id));
  const quedan = await prisma.registro.count({
    where: { colaboradorId: c1.id, OR: [{ fotoSalida: foto('DESCANSO_1200') }, { fotoEntrada: foto('REGRESO_1300') }] },
  });
  comprobar('quitar: las fotos confirmadas no quedan escondidas en ninguna fila', '0', `${quedan}`);

  // ---- 2. Poner el descanso ----
  console.log('\n2. PONER EL DESCANSO (08:00 a 17:00 pasa a tener descanso de 12:00 a 13:00)');
  const c2 = await crear('Poner');
  const a2 = await marcacion(c2.id, ENTRADA, CIERRE);
  const nov2 = await novedadDe(c2.id, a2.id);
  await pintar('antes', a2.id, { novedad: nov2.id });
  comprobar('poner: no se pierde ninguna foto, así que no pregunta', '200 sin preguntar', await guardar(a2.id,
    { fecha: DIA, entrada: '08:00', descansoSalida: '12:00', descansoRegreso: '13:00', salida: '17:00', tipo: 'NORMAL' }));
  const v2 = await pintar('después', a2.id, { novedad: nov2.id });
  const d2 = momento(v2, 'SALIDA_ALMUERZO');
  const s2 = momento(v2, 'SALIDA');
  comprobar('poner: la SALIDA AL DESCANSO de las 12:00 no muestra la foto de las 17:00', '12:00 sin foto', `${d2?.hora} ${d2?.foto}`);
  comprobar('poner: esa salida al descanso la escribió el administrador y lo dice', 'MANUAL', d2?.metodo ?? 'no vino');
  comprobar('poner: la SALIDA de las 17:00 conserva su foto, su método y su sede', '17:00 CIERRE_1700 ROSTRO 0.42 El Poblado', describir(s2));
  comprobar('poner: la novedad queda en la marcación que tiene la salida del día', 'en la salida de las 17:00', await dondeEstaLaNovedad(nov2.id));

  // ---- 3. Quitar el descanso de una jornada que cerró el sistema ----
  console.log('\n3. QUITAR EL DESCANSO CUANDO LA SALIDA DEL DÍA LA ESTIMÓ EL AUTO-CIERRE');
  const c3 = await crear('Autocierre');
  const a3 = await marcacion(c3.id, ENTRADA, DESCANSO, true);
  // Lo que deja el barrido: hora de fin de la franja y la marca. Ni foto, ni método, ni sede.
  await marcacion(c3.id, REGRESO, { hora: '18:00', estimada: true });
  await pintar('antes', a3.id);
  comprobar('auto-cierre: pregunta por las fotos del descanso y del regreso',
    '200 tras preguntar por SALIDA_ALMUERZO 12:00, REGRESO_ALMUERZO 13:00',
    await guardar(a3.id, { fecha: DIA, entrada: '08:00', salida: '18:00', tipo: 'NORMAL' }));
  const s3 = momento(await pintar('después', a3.id), 'SALIDA');
  comprobar('auto-cierre: la SALIDA de las 18:00 sigue diciendo que nadie la marcó', 'estimada', s3?.estimada ? 'estimada' : 'no estimada');
  comprobar('auto-cierre: y no aparece verificada con la foto y el rostro de otra marca', 'sin foto —', `${s3?.foto} ${s3?.metodo}`);

  // ---- 4. Un descanso sin regreso que pasa a ser la salida del día ----
  console.log('\n4a. DESCANSO SIN REGRESO QUE PASA A SER LA SALIDA DEL DÍA, A OTRA HORA (12:00 -> 17:00)');
  const c4 = await crear('SinRegresoOtraHora');
  const a4 = await marcacion(c4.id, ENTRADA, DESCANSO, true);
  await pintar('antes', a4.id);
  comprobar('sin regreso, otra hora: pregunta por la foto de las 12:00', '200 tras preguntar por SALIDA_ALMUERZO 12:00',
    await guardar(a4.id, { fecha: DIA, entrada: '08:00', salida: '17:00', tipo: 'NORMAL' }));
  const s4 = momento(await pintar('después', a4.id), 'SALIDA');
  comprobar('sin regreso, otra hora: la SALIDA de las 17:00 no muestra la foto tomada a las 12:00', '17:00 sin foto', `${s4?.hora} ${s4?.foto}`);

  // Quien oprimió «salir a descansar» cuando se iba: se corrige qué fue la marca,
  // no cuándo ni dónde ocurrió.
  console.log('\n4b. DESCANSO SIN REGRESO QUE PASA A SER LA SALIDA DEL DÍA, A LA MISMA HORA (botón equivocado)');
  const c4b = await crear('SinRegresoMismaHora');
  const a4b = await marcacion(c4b.id, ENTRADA, DESCANSO, true);
  await pintar('antes', a4b.id);
  comprobar('botón equivocado: no se pierde ninguna foto, así que no pregunta', '200 sin preguntar',
    await guardar(a4b.id, { fecha: DIA, entrada: '08:00', salida: '12:00', tipo: 'NORMAL' }));
  const s4b = momento(await pintar('después', a4b.id), 'SALIDA');
  comprobar('botón equivocado: la SALIDA de las 12:00 conserva su foto, su método y su sede',
    '12:00 DESCANSO_1200 ROSTRO 0.31 Laureles', describir(s4b));

  // ---- 5. Control: mover horas sin tocar el descanso ----
  console.log('\n5. CONTROL: MOVER LAS HORAS SIN QUITAR NI PONER EL DESCANSO');
  const c5 = await crear('MoverHoras');
  const a5 = await marcacion(c5.id, ENTRADA, DESCANSO, true);
  await marcacion(c5.id, REGRESO, CIERRE);
  await pintar('antes', a5.id);
  comprobar('mover horas: no se pierde ninguna foto, así que no pregunta', '200 sin preguntar', await guardar(a5.id,
    { fecha: DIA, entrada: '08:00', descansoSalida: '12:15', descansoRegreso: '13:15', salida: '17:15', tipo: 'NORMAL' }));
  const v5 = await pintar('después', a5.id);
  comprobar('mover horas: la salida al descanso conserva su foto, su método y su sede', '12:15 DESCANSO_1200 ROSTRO 0.31 Laureles', describir(momento(v5, 'SALIDA_ALMUERZO')));
  comprobar('mover horas: la salida del día conserva su foto, su método y su sede', '17:15 CIERRE_1700 ROSTRO 0.42 El Poblado', describir(momento(v5, 'SALIDA')));

  // ---- 6. Reabrir el turno desde el formulario, sin confirmar ----
  console.log('\n6. REABRIR EL TURNO DESDE EL FORMULARIO (salida vacía), SIN CONFIRMAR');
  const c6 = await crear('Reabrir');
  const a6 = await marcacion(c6.id, ENTRADA, CIERRE);
  await pintar('antes', a6.id);
  const r6 = await pedir('PUT', `/api/registros/jornada/${a6.id}`, { fecha: DIA, entrada: '08:00', tipo: 'NORMAL' });
  comprobar('reabrir: pregunta por la foto de la salida', '409 BORRA_FOTOS SALIDA 17:00', resumen(r6));
  const s6 = momento(await pintar('sin confirmar', a6.id), 'SALIDA');
  comprobar('reabrir sin confirmar: la salida sigue ahí con su foto', '17:00 CIERRE_1700', `${s6?.hora} ${s6?.foto}`);

  await app.close();
  console.log('\nRESULTADOS');
  for (const c of casos) {
    console.log(`  ${c.ok ? 'OK  ' : 'MAL '} ${c.nombre}`);
    if (!c.ok) console.log(`       esperaba "${c.espera}" y llegó "${c.obtenido}"`);
  }
  const malos = casos.filter(c => !c.ok).length;
  console.log(`\n${casos.length - malos} de ${casos.length} en verde.`);
  return malos;
}

let salida = 1;
main()
  .then(malos => { salida = malos === 0 ? 0 : 1; })
  .catch(e => { console.error('EXPLOTÓ:', e); })
  .finally(async () => {
    // Limpieza: se borra todo lo creado, pase lo que pase. Los cambios de la
    // bitácora y las novedades ligadas se van en cascada con sus registros; las
    // novedades se borran igual antes, por si alguna quedó suelta.
    const empresa = await prisma.empresa.findFirst({ where: { marcadorToken: SUFIJO }, select: { id: true } });
    if (empresa) {
      const cols = await prisma.colaborador.findMany({ where: { empresaId: empresa.id }, select: { id: true } });
      const ids = cols.map(c => c.id);
      await prisma.permiso.deleteMany({ where: { colaboradorId: { in: ids } } });
      await prisma.registro.deleteMany({ where: { colaboradorId: { in: ids } } });
      await prisma.diaEsperado.deleteMany({ where: { colaboradorId: { in: ids } } });
      await prisma.colaborador.deleteMany({ where: { id: { in: ids } } });
      await prisma.sede.deleteMany({ where: { empresaId: empresa.id } });
      await prisma.notificacion.deleteMany({ where: { empresaId: empresa.id } });
      await prisma.empresa.delete({ where: { id: empresa.id } });
      console.log('Limpieza: borrada la empresa de prueba y todo lo suyo.');
    }
    await prisma.$disconnect();
    process.exit(salida);
  });
