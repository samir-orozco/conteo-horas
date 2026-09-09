/**
 * Datos de prueba para la pantalla de Revisión de marcaciones.
 *
 * Crea marcaciones de HOY que cubren todos los casos que la pantalla sabe
 * mostrar, para poder probarla de verdad en vez de mirarla vacía.
 *
 *   npx ts-node --transpile-only prisma/seed-revision.ts            (crear)
 *   npx ts-node --transpile-only prisma/seed-revision.ts --limpiar  (borrar)
 *
 * TODO LO QUE CREA VA MARCADO con una observación reconocible, y `--limpiar`
 * borra exactamente eso y nada más. No toca ninguna marcación de verdad.
 *
 * LAS FOTOS SON PNG DE COLORES, no caras. Sirven para comprobar que la imagen
 * cambia al avanzar, que se pide de a una y que se pinta espejada. NO sirven
 * para evaluar si se distingue un celular de una cara: eso solo se puede probar
 * con fotos reales del kiosco.
 */
import { deflateSync } from 'node:zlib';
import { prisma } from '../src/prisma';

const MARCA = '[prueba-revision]';

// Un PNG de un color plano, hecho a mano. Sin dependencias: el kiosco graba en
// 4:3, así que estas también, para que el hueco y la imagen midan igual.
function pngDeColor(r: number, g: number, b: number, ancho = 320, alto = 240): string {
  const crc32 = (buf: Buffer) => {
    let c = ~0;
    for (const byte of buf) {
      c ^= byte;
      for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xEDB88320 & -(c & 1));
    }
    return ~c >>> 0;
  };
  const trozo = (tipo: string, datos: Buffer) => {
    const largo = Buffer.alloc(4); largo.writeUInt32BE(datos.length);
    const cuerpo = Buffer.concat([Buffer.from(tipo, 'ascii'), datos]);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(cuerpo));
    return Buffer.concat([largo, cuerpo, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(ancho, 0); ihdr.writeUInt32BE(alto, 4);
  ihdr[8] = 8; ihdr[9] = 2; // 8 bits, RGB
  // Cada fila lleva un byte de filtro al principio. Se pintan bandas más claras
  // cada 40 px para que se note si la imagen sale espejada o estirada.
  const filas: Buffer[] = [];
  for (let y = 0; y < alto; y++) {
    const fila = Buffer.alloc(1 + ancho * 3);
    const claro = Math.floor(y / 40) % 2 === 0 ? 0 : 40;
    for (let x = 0; x < ancho; x++) {
      const o = 1 + x * 3;
      fila[o] = Math.min(r + claro + (x < 60 ? 60 : 0), 255);
      fila[o + 1] = Math.min(g + claro, 255);
      fila[o + 2] = Math.min(b + claro, 255);
    }
    filas.push(fila);
  }
  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
    trozo('IHDR', ihdr),
    trozo('IDAT', deflateSync(Buffer.concat(filas))),
    trozo('IEND', Buffer.alloc(0)),
  ]);
  return 'data:image/png;base64,' + png.toString('base64');
}

// Una hora de HOY en Bogotá (UTC-5), en UTC explícito.
function hoyBogota(hora: number, minuto = 0): Date {
  const ahora = new Date();
  const bog = new Date(ahora.getTime() - 5 * 3600 * 1000);
  return new Date(Date.UTC(bog.getUTCFullYear(), bog.getUTCMonth(), bog.getUTCDate(), hora + 5, minuto, 0));
}

async function limpiar() {
  const { count } = await prisma.registro.deleteMany({ where: { observacion: { startsWith: MARCA } } });
  console.log(`\n  Borradas ${count} marcaciones de prueba.\n`);
}

async function crear() {
  const empresa = await prisma.empresa.findFirst({ where: { nit: '900123456-7' }, select: { id: true, nombre: true } });
  if (!empresa) { console.error('No está la empresa demo. Corre `npm run prisma:seed` primero.'); process.exit(1); }

  const cols = await prisma.colaborador.findMany({
    where: { empresaId: empresa.id, activo: true },
    select: { id: true, nombre: true, apellido: true },
    orderBy: { nombre: 'asc' },
    take: 5,
  });
  if (cols.length < 3) { console.error('Hacen falta al menos 3 colaboradores en la empresa demo.'); process.exit(1); }

  const [a, b, c, d = c, e = c] = cols;
  // La misma distancia, calcada, en dos marcaciones de la MISMA persona. Es la
  // única señal fiable que tiene la pantalla y hay que poder verla funcionar.
  const REPETIDA = 0.284163;

  const casos = [
    { col: a, hora: hoyBogota(7, 2), foto: pngDeColor(70, 110, 160), metodo: 'ROSTRO', dist: 0.3182,
      nota: 'normal, con la cara y con foto' },
    { col: b, hora: hoyBogota(7, 15), foto: pngDeColor(160, 90, 70), metodo: 'ROSTRO', dist: REPETIDA,
      nota: 'DISTANCIA REPETIDA 1 de 2' },
    { col: b, hora: hoyBogota(12, 40), foto: pngDeColor(150, 80, 60), metodo: 'ROSTRO', dist: REPETIDA,
      nota: 'DISTANCIA REPETIDA 2 de 2' },
    { col: c, hora: hoyBogota(8, 5), foto: null, metodo: 'CEDULA', dist: null,
      nota: 'marcó con cédula: sin foto, y ahora se dice por qué' },
    { col: d, hora: hoyBogota(8, 30), foto: null, metodo: 'MANUAL', dist: null,
      nota: 'la cargó un administrador' },
    { col: e, hora: hoyBogota(9, 12), foto: pngDeColor(90, 150, 100), metodo: null, dist: null,
      nota: 'SIN método: como las marcaciones anteriores al cambio' },
  ];

  const creados: string[] = [];
  for (const [i, k] of casos.entries()) {
    const r = await prisma.registro.create({
      data: {
        colaboradorId: k.col.id,
        fecha: hoyBogota(0),
        entrada: k.hora,
        fotoEntrada: k.foto,
        metodoEntrada: k.metodo as never,
        distanciaEntrada: k.dist,
        observacion: `${MARCA} ${k.nota}`,
      },
    });
    creados.push(r.id);
    console.log(`  ${String(i + 1).padStart(2)}. ${k.col.nombre} ${k.col.apellido} · ${k.nota}`);
  }

  // Una salida que puso el auto-cierre: sin foto y sin método, porque no la
  // marcó nadie. La pantalla tiene que decirlo con esas palabras.
  const cerrada = await prisma.registro.create({
    data: {
      colaboradorId: a.id,
      fecha: hoyBogota(0),
      entrada: hoyBogota(13, 5),
      salida: hoyBogota(18, 0),
      salidaEstimada: true,
      fotoEntrada: pngDeColor(120, 120, 170),
      metodoEntrada: 'ROSTRO',
      distanciaEntrada: 0.4102,
      observacion: `${MARCA} salida que puso el sistema`,
    },
  });
  creados.push(cerrada.id);
  console.log(`   7. ${a.nombre} ${a.apellido} · entrada con cara + SALIDA QUE PUSO EL SISTEMA`);

  console.log(`\n  ${creados.length} marcaciones creadas en ${empresa.nombre}, todas de HOY.`);
  console.log(`  Para borrarlas: npx ts-node --transpile-only prisma/seed-revision.ts --limpiar\n`);
}

const main = process.argv.includes('--limpiar') ? limpiar : crear;
main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
