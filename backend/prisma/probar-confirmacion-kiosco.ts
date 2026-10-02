// Verifica contra el servidor LOCAL (puerto 3001) la plomería de la confirmación del
// kiosco y de la revisión del rostro nuevo (2 de octubre de 2026). Es el paso 2 del
// protocolo de CLAUDE.md §8.6: las decisiones tienen sus pruebas (rostro.test.ts,
// revisionEnrolamiento.test.ts); esto comprueba que las rutas las usan de verdad.
//
//   npx tsx prisma/probar-confirmacion-kiosco.ts
//
// Llama a las rutas reales, mira lo que responden y lo que escriben, y DEJA TODO COMO
// ESTABA: el rostro de la persona usada, sus enlaces, las constancias, la
// notificación y el registro de prueba. Nada de esto va contra producción.
import 'dotenv/config';
import Fastify from 'fastify';
import jwt from '@fastify/jwt';
import { Prisma } from '@prisma/client';
import { prisma } from '../src/prisma';
import { muestrasDe, distanciaEuclidiana } from '../src/utils/rostro';

const API = 'http://localhost:3001/api';
let fallos = 0;
const comprobar = (ok: boolean, texto: string) => {
  console.log(`${ok ? 'OK   ' : 'FALLA'} ${texto}`);
  if (!ok) fallos++;
};

async function http(metodo: string, ruta: string, cuerpo?: unknown, token?: string) {
  const r = await fetch(API + ruta, {
    method: metodo,
    headers: { ...(cuerpo !== undefined ? { 'content-type': 'application/json' } : {}), ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
  });
  let datos: any = null;
  try { datos = await r.json(); } catch { /* sin cuerpo */ }
  return { status: r.status, datos };
}

// Un descriptor a distancia exacta `d` de `base`, en la dirección de `dir`.
function aDistancia(base: number[], d: number, dir: number[]): number[] {
  const n = Math.sqrt(dir.reduce((s, v) => s + v * v, 0));
  return base.map((v, i) => v + (d * dir[i]) / n);
}

async function main() {
  const inicio = new Date();

  // Una empresa con kiosco, sin exigir dispositivo y con al menos dos personas
  // activas con rostro en formato de lista. La cédula se prueba solo si la permite.
  const empresas = await prisma.empresa.findMany({ where: { activa: true }, select: { id: true, nombre: true, marcadorToken: true } });
  let elegida: { empresa: (typeof empresas)[number]; a: any; b: any; admin: any; conCedula: boolean } | null = null;
  for (const e of empresas) {
    const cfg = await prisma.configuracion.findMany({ where: { empresaId: e.id, clave: { in: ['KIOSCO_SOLO_DISPOSITIVOS', 'KIOSCO_PERMITE_CEDULA'] } } });
    if (cfg.some(c => c.clave === 'KIOSCO_SOLO_DISPOSITIVOS' && c.valor === '1')) continue;
    const conCedula = !cfg.some(c => c.clave === 'KIOSCO_PERMITE_CEDULA' && c.valor === '0');
    const gente = await prisma.colaborador.findMany({
      where: { empresaId: e.id, activo: true, rostroDescriptor: { not: Prisma.DbNull } },
      select: { id: true, nombre: true, apellido: true, cedula: true, rostroDescriptor: true, rostroEnroladoEn: true, rostroRechazadoEn: true, fotoMini: true, foto: true },
    });
    const conLista = gente.filter(g => muestrasDe(g.rostroDescriptor).length >= 2);
    const admin = await prisma.usuario.findFirst({ where: { empresaId: e.id, rol: 'ADMIN' }, select: { id: true, email: true, nombre: true } });
    if (conLista.length >= 2 && admin) { elegida = { empresa: e, a: conLista[0], b: conLista[1], admin, conCedula }; break; }
  }
  if (!elegida) { console.log('No hay en la base local una empresa con dos personas enroladas para probar.'); return; }
  const { empresa, a, b, admin, conCedula } = elegida;
  console.log(`Empresa: ${empresa.nombre} · A = ${a.nombre} ${a.apellido} · B = ${b.nombre} ${b.apellido}\n`);

  const A = muestrasDe(a.rostroDescriptor);
  const B = muestrasDe(b.rostroDescriptor);
  const enlacesAntes = await prisma.enlaceRegistroFacial.findMany({ where: { colaboradorId: a.id }, select: { id: true, anuladoEn: true } });

  // El token de administrador se firma aquí con el mismo secreto del servidor. No se imprime.
  const firmador = Fastify();
  await firmador.register(jwt, { secret: process.env.JWT_SECRET || 'conteo_horas_secret_2024' });
  await firmador.ready();
  const tokenAdmin = firmador.jwt.sign({ id: admin.id, email: admin.email, rol: 'ADMIN', nombre: admin.nombre, empresaId: empresa.id });

  let registroDePrueba: string | null = null;
  try {
    // ── 1. Ingreso facial con la cara exacta de A ──
    const r1 = await http('POST', '/worker/login-rostro', { descriptor: A[0], marcadorToken: empresa.marcadorToken });
    comprobar(r1.status === 200 && r1.datos?.colaborador?.id === a.id, `login-rostro reconoce a A (${r1.status})`);
    comprobar(r1.datos?.parecidoDudoso === false, 'con la cara exacta, el parecido NO es dudoso');
    comprobar((r1.datos?.fotoReferencia ?? null) === (a.fotoMini ?? null), `trae la miniatura de la ficha (${a.fotoMini ? `${a.fotoMini.length} caracteres` : 'A no tiene miniatura: null'})`);

    // ── 2. «No soy A» con esa sesión ──
    const r2 = await http('POST', '/worker/no-soy', {}, r1.datos?.token);
    comprobar(r2.status === 200 && r2.datos?.ok === true, `/no-soy responde ok (${r2.status})`);
    const r2b = await http('POST', '/worker/no-soy', {});
    comprobar(r2b.status === 401, `/no-soy sin sesión se rechaza (${r2b.status})`);

    // ── 3. A a 0,46 de su registro, alejándose de B: dudoso ──
    const lejosDeB = A[0].map((v, i) => v - B[0][i]);
    const casi = aDistancia(A[0], 0.46, lejosDeB);
    const r3 = await http('POST', '/worker/login-rostro', { descriptor: casi, marcadorToken: empresa.marcadorToken });
    if (r3.status === 200 && r3.datos?.colaborador?.id === a.id) {
      comprobar(r3.datos?.parecidoDudoso === true, 'a 0,46 de su registro el parecido SÍ es dudoso');
    } else {
      console.log(`AVISO a 0,46 no salió A (${r3.status} ${r3.datos?.error ?? r3.datos?.colaborador?.nombre}): no se pudo comprobar el dudoso por esta vía`);
    }

    // ── 4. Ingreso con cédula ──
    if (conCedula) {
      const r4 = await http('POST', '/worker/login', { cedula: a.cedula, marcadorToken: empresa.marcadorToken });
      comprobar(r4.status === 200 && r4.datos?.parecidoDudoso === false, `login con cédula: parecidoDudoso=false (${r4.status})`);
      comprobar(r4.datos?.fotoReferencia === null, 'login con cédula NO trae la cara: con el enlace y una cédula no se cosechan fotos');
    } else {
      console.log('AVISO esta empresa no permite la cédula: el ingreso con cédula se prueba en el navegador');
    }

    // ── 5. Registrar el rostro de A desde la ficha con tomas de dos personas ──
    const incoherentes = [A[0], aDistancia(A[0], 0.9, lejosDeB)];
    const r5 = await http('POST', `/colaboradores/${a.id}/rostro`, { descriptores: incoherentes }, tokenAdmin);
    comprobar(r5.status === 400 && r5.datos?.codigo === 'TOMAS_INCOHERENTES', `tomas de dos personas: 400 TOMAS_INCOHERENTES (${r5.status} ${r5.datos?.codigo})`);

    // ── 6. Registrar el rostro de A con las tomas de B: se parece a B ──
    const dentroBs = Math.max(...B.flatMap((x, i) => B.slice(i + 1).map(y => distanciaEuclidiana(x, y))));
    console.log(`     (las tomas de B distan entre sí hasta ${dentroBs.toFixed(3)})`);
    const r6 = await http('POST', `/colaboradores/${a.id}/rostro`, { descriptores: B }, tokenAdmin);
    comprobar(r6.status === 409 && r6.datos?.codigo === 'ROSTRO_PARECIDO', `con la cara de B: 409 ROSTRO_PARECIDO (${r6.status} ${r6.datos?.codigo})`);
    comprobar(Array.isArray(r6.datos?.parecidos) && r6.datos.parecidos.some((p: any) => p.id === b.id), 'y dice que se parece a B, con su nombre');
    const trasR6 = await prisma.colaborador.findUnique({ where: { id: a.id }, select: { rostroDescriptor: true } });
    comprobar(JSON.stringify(trasR6?.rostroDescriptor) === JSON.stringify(a.rostroDescriptor), 'el 409 NO guardó nada');

    // ── 7. Lo mismo confirmando: se guarda ──
    const r7 = await http('POST', `/colaboradores/${a.id}/rostro`, { descriptores: B, confirmarParecido: true }, tokenAdmin);
    comprobar(r7.status === 200, `confirmando, se guarda (${r7.status})`);
    const trasR7 = await prisma.colaborador.findUnique({ where: { id: a.id }, select: { rostroDescriptor: true } });
    comprobar(JSON.stringify(trasR7?.rostroDescriptor) === JSON.stringify(B), 'y lo guardado son las tomas mandadas');
    // Se restaura ya, para que lo que sigue parta del rostro de verdad.
    await prisma.colaborador.update({ where: { id: a.id }, data: { rostroDescriptor: a.rostroDescriptor, rostroEnroladoEn: a.rostroEnroladoEn, rostroRechazadoEn: a.rostroRechazadoEn } });

    // ── 8. Por el enlace: incoherente se rechaza sin gastar el enlace; parecido se guarda y avisa ──
    const e1 = await http('POST', `/colaboradores/${a.id}/enlace-rostro`, undefined, tokenAdmin);
    comprobar(e1.status === 201 && typeof e1.datos?.token === 'string', `se crea un enlace de prueba (${e1.status})`);
    const tokEnlace = e1.datos?.token as string;
    const info = await http('GET', `/registro-facial/${tokEnlace}`);
    const base = { cedula: a.cedula, texto: info.datos?.textoAutorizacion, mayorDeEdad: true };
    const e2 = await http('POST', `/registro-facial/${tokEnlace}/registrar`, { ...base, descriptores: incoherentes });
    comprobar(e2.status === 400 && e2.datos?.codigo === 'ROSTRO_INVALIDO', `enlace con tomas de dos personas: 400 (${e2.status} ${e2.datos?.codigo})`);
    comprobar(!JSON.stringify(e2.datos).includes(b.nombre), 'y el mensaje no nombra a nadie');
    const e3 = await http('POST', `/registro-facial/${tokEnlace}/registrar`, { ...base, descriptores: B });
    comprobar(e3.status === 200, `enlace con la cara de B: se guarda (${e3.status}) — el enlace seguía sirviendo tras el 400`);
    comprobar(!JSON.stringify(e3.datos).includes(b.nombre), 'y a quien registra no se le dice a quién se parece');
    const aviso = await prisma.notificacion.findFirst({ where: { empresaId: empresa.id, tipo: 'ROSTRO_PARECIDO', creadoEn: { gte: inicio } } });
    comprobar(!!aviso && aviso.entidadId === a.id && aviso.titulo.includes(`${b.nombre} ${b.apellido}`), `al administrador le llega el aviso: «${aviso?.titulo ?? 'NINGUNO'}»`);

    // ── 9. El panel: parecidoDudoso viaja por foto, decidido en el servidor ──
    const fecha = new Date(Date.UTC(2026, 7, 3, 5, 0, 0)); // un lunes de agosto
    const yaHay = await prisma.registro.count({ where: { colaboradorId: a.id, fecha } });
    if (yaHay === 0) {
      const reg = await prisma.registro.create({
        data: {
          colaboradorId: a.id, fecha, entrada: new Date(Date.UTC(2026, 7, 3, 13, 49)), salida: new Date(Date.UTC(2026, 7, 3, 13, 52)),
          metodoEntrada: 'ROSTRO', metodoSalida: 'ROSTRO', distanciaEntrada: 0.4640, distanciaSalida: 0.2662,
        },
      });
      registroDePrueba = reg.id;
      const f = await http('GET', `/registros/${reg.id}/jornada/fotos`, undefined, tokenAdmin);
      const entrada = f.datos?.fotos?.find((x: any) => x.momento === 'ENTRADA');
      const salida = f.datos?.fotos?.find((x: any) => x.momento === 'SALIDA');
      comprobar(f.status === 200 && entrada?.parecidoDudoso === true, `jornada/fotos: la entrada a 0,464 viene dudosa (${f.status})`);
      comprobar(salida?.parecidoDudoso === false, 'y la salida a 0,266 no');
      comprobar(entrada && !('distancia' in entrada), 'viaja el veredicto, no el número');
    } else {
      console.log('AVISO el 3 de agosto ya tiene registros de A: no se crea el de prueba');
    }
  } finally {
    // ── Dejar todo como estaba ──
    await prisma.colaborador.update({ where: { id: a.id }, data: { rostroDescriptor: a.rostroDescriptor, rostroEnroladoEn: a.rostroEnroladoEn, rostroRechazadoEn: a.rostroRechazadoEn, foto: a.foto, fotoMini: a.fotoMini } });
    const constancias = await prisma.constanciaBiometrica.deleteMany({ where: { colaboradorId: a.id, creadoEn: { gte: inicio } } });
    const enlacesNuevos = await prisma.enlaceRegistroFacial.deleteMany({ where: { colaboradorId: a.id, id: { notIn: enlacesAntes.map(x => x.id) } } });
    for (const x of enlacesAntes) await prisma.enlaceRegistroFacial.update({ where: { id: x.id }, data: { anuladoEn: x.anuladoEn } });
    const avisos = await prisma.notificacion.deleteMany({ where: { empresaId: empresa.id, tipo: 'ROSTRO_PARECIDO', creadoEn: { gte: inicio } } });
    if (registroDePrueba) await prisma.registro.delete({ where: { id: registroDePrueba } });
    console.log(`\nLimpieza: rostro de A restaurado · ${constancias.count} constancias, ${enlacesNuevos.count} enlaces y ${avisos.count} avisos de prueba borrados · ${enlacesAntes.length} enlaces previos devueltos a su estado${registroDePrueba ? ' · registro de prueba borrado' : ''}`);
    const final = await prisma.colaborador.findUnique({ where: { id: a.id }, select: { rostroDescriptor: true } });
    comprobar(JSON.stringify(final?.rostroDescriptor) === JSON.stringify(a.rostroDescriptor), 'el rostro de A quedó como estaba');
    await firmador.close();
  }
  console.log(fallos === 0 ? '\nTODO BIEN' : `\n${fallos} COMPROBACIONES FALLARON`);
  process.exitCode = fallos === 0 ? 0 : 1;
}

main().finally(() => prisma.$disconnect());
