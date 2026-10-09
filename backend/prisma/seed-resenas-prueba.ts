// Datos de prueba de las reseñas, SOLO para la base LOCAL (8 de octubre de 2026). docs/RESENAS.md.
//
//   npx tsx prisma/seed-resenas-prueba.ts      crea o deja al día todo lo de abajo
//   npx tsx prisma/limpiar-resenas-prueba.ts   lo borra
//
// Credenciales de prueba, solo para la base local:
//   panel:  resenas.admin@horapro.test / resenas-prueba-2026
//
// Qué deja:
//   1. «Ferretería Prueba Reseñas», un cliente que ya lleva DOS pagos y al que HOY le tiene que salir la
//      ventana de la reseña: activa, sin cortesía, al día, con el primer pago real hace unos 40 días
//      (más de un mes calendario, R1), correo verificado y el auxilio ya revisado (R4). Su
//      administrador es el usuario de arriba. Correrlo otra vez le BORRA la reseña que haya dejado, para
//      que la ventana vuelva a salir: es una empresa para probar la ventana, no para guardar opiniones.
//   2. 16 reseñas MANUALES PUBLICADAS, claramente de prueba, para ver el carrusel de la landing con más
//      de 15 (R35, R36): «Cliente de prueba N», canal «Prueba local».
//   3. Los TRES testimonios que hoy están escritos en la landing, como manuales POR REVISAR, con su
//      texto literal (R32, R33). Son las mismas filas, con los mismos ids, que inserta sql/resenas.sql.
//
// Se niega a correr si DATABASE_URL no es la base de desarrollo de este equipo (`motivoParaNoCorrer`).
import bcrypt from 'bcryptjs';
import { prisma } from '../src/prisma';
import { crearSedePrincipal } from '../src/utils/sedesDeEmpresa';
import { claveDiaBogota, medianocheBogota, sumarMesesBogota } from '../src/utils/fechas';
import { revisionPendiente } from '../src/utils/revisionPendiente';
import { elegibleParaResena, esPublicable, limpiarResenaManual, esResenaInvalida } from '../src/utils/resenas';

// Lo que crea, para que limpiar-resenas-prueba.ts borre exactamente esto y nada más.
export const EMPRESA_NOMBRE = 'Ferretería Prueba Reseñas';
export const EMPRESA_NIT = '901999888-7';
export const ADMIN_EMAIL = 'resenas.admin@horapro.test';
export const PREFIJO_PRUEBA = 'resena-prueba-';
// Los mismos de sql/resenas.sql, en el mismo orden (Mateo Vera, Carolina Calle, Santiago Botero). Son
// opacos y con dígitos a propósito: ver el comentario del SQL. utils/resenas.test.ts los compara.
export const IDS_TESTIMONIOS = ['c4bv1s9w54vcy8y0d5wum30qk', 'cty1d3d0r2xet6dfdvmcrmn0j', 'cikrhefh3ufx0wrxs20u1b7tc'];
const REGISTRADA_POR = 'seed-resenas-prueba@horapro.test';
const NOTA_PAGO = 'Pago de prueba local (seed-resenas-prueba)';

// La guarda: este guion borra y escribe a su antojo, así que en una base que no sea la de desarrollo
// no hace nada.
//
// EL HOST SOLO NO DISTINGUE NADA. En el servidor DATABASE_URL también apunta a localhost
// (DESPLIEGUE.md, variables del backend), y backend-build lleva estos guiones: con mirar el host,
// correrlo en la terminal de cPanel publicaba 16 reseñas ficticias en horapro.co. Lo que distingue
// es el nombre de la base, y se exige el de desarrollo en vez de rechazar el de producción: se sabe
// cuál es la buena, no todas las que pueden ser malas. Probada con la de producción en
// seed-resenas-prueba.test.ts (CLAUDE.md §12.10).
const BASE_DE_DESARROLLO = 'conteo_horas';

// Por qué no se puede correr aquí, o null si se puede. El motivo se imprime: lleva el host y la base,
// nunca la dirección entera, que trae la clave.
export function motivoParaNoCorrer(url: string | undefined): string | null {
  let direccion: URL;
  try {
    direccion = new URL(url ?? '');
  } catch {
    return 'DATABASE_URL falta o no se puede leer.';
  }
  if (!['localhost', '127.0.0.1', '[::1]'].includes(direccion.hostname)) {
    return `DATABASE_URL no apunta a este equipo (host: «${direccion.hostname}»).`;
  }
  const base = decodeURIComponent(direccion.pathname.replace(/^\/+/, ''));
  if (base !== BASE_DE_DESARROLLO) return `la base es «${base || 'ninguna'}» y no «${BASE_DE_DESARROLLO}», la de desarrollo.`;
  return null;
}

export function exigirBaseLocal(): void {
  const motivo = motivoParaNoCorrer(process.env.DATABASE_URL);
  if (motivo) {
    console.error(`ABORTO: ${motivo} Esto es solo para la base local de desarrollo.`);
    process.exit(1);
  }
}

const DIA_MS = 24 * 60 * 60 * 1000;
// El día 1 del mes de Bogotá en que cae `instante`, a medianoche de Bogotá.
const inicioDeMes = (instante: Date) => medianocheBogota(`${claveDiaBogota(instante).slice(0, 7)}-01`);

// ===== 2. Las 16 de prueba =====

// Textos de 30 a 400 caracteres, variados a propósito: cortos, largos, con salto de línea y sin tilde,
// para ver cómo se acomodan en la tarjeta.
const TEXTOS_DE_PRUEBA = [
  'Muy fácil de usar desde el primer día.',
  'Antes cuadrábamos las horas extra con una hoja de cálculo y siempre había diferencias con lo que decía la gente. Ahora el reporte sale solo y nadie discute.',
  'El kiosco con reconocimiento facial funcionó a la primera en la tablet vieja que teníamos guardada.',
  'Lo usamos en tres sedes.\nCada administrador ve lo suyo y yo veo todo desde el celular.',
  'buen servicio, me resolvieron rapido por whatsapp cuando no me cuadraba un festivo',
  'Lo que más valoro es que los recargos nocturnos y dominicales salen calculados con la ley vigente, sin que yo tenga que estar pendiente de cada cambio. Nos ahorró varias discusiones con el contador y con la gente del turno de la noche, que siempre sentía que le pagaban de menos.',
  'Sencillo y claro. Recomendado para empresas pequeñas.',
  'La programación de turnos por semana nos cambió la vida en la panadería: antes era un tablero de corcho.',
  'Todavía estamos aprendiendo, pero el soporte ha sido muy bueno y paciente.',
  'Prueba de texto largo para ver el recorte en la tarjeta. '.repeat(6).trim(),
  'Los permisos y las incapacidades quedan registrados con su soporte, y al final del mes no se pierde nada.',
  'Nos gustó poder exportar la nómina directo para el programa contable.',
  'Funciona bien. Le falta una app nativa, pero en el navegador del celular va perfecto.',
  'El tablero de inicio me dice en la mañana quién no ha llegado. Eso solo ya valió la pena.',
  'Excelente.\n\nLo recomiendo a otros comerciantes del sector.',
  'Pasamos de pelear cada quincena por las horas a no volver a hablar del tema.',
];
// Variadas de 3 a 5, con dos sin estrellas (R28: la tarjeta no las pinta).
const ESTRELLAS_DE_PRUEBA = [5, 4, 5, 3, null, 5, 4, 4, 3, 5, null, 4, 3, 5, 5, 4];

function resenasDePrueba() {
  return TEXTOS_DE_PRUEBA.map((texto, i) => {
    const n = i + 1;
    // Por la misma función que usa la ruta del super admin: si un texto no pasara, el guion lo dice.
    const limpia = limpiarResenaManual({
      estrellas: ESTRELLAS_DE_PRUEBA[i],
      texto,
      nombrePublico: `Cliente de prueba ${n}`,
      cargoPublico: n % 4 === 0 ? null : `Empresa de prueba ${n}`,
      canal: 'Prueba local',
      fechaOpinion: `2026-09-${String(n + 10).padStart(2, '0')}`,
      referencia: 'Datos de prueba locales',
      autorizacion: 'Datos de prueba locales',
    });
    if (esResenaInvalida(limpia)) throw new Error(`La reseña de prueba ${n} no pasa la validación: ${limpia.motivo}`);
    return { id: `${PREFIJO_PRUEBA}${String(n).padStart(2, '0')}`, ...limpia };
  });
}

// ===== 3. Los tres testimonios de la landing =====

// Texto literal, faltas incluidas (R33). Copiado del arreglo TESTIMONIOS de frontend/src/pages/Landing.tsx.
const TESTIMONIOS = [
  {
    id: IDS_TESTIMONIOS[0], nombrePublico: 'Mateo Vera', cargoPublico: 'CEO Grupo MSM · Founder Fem Probiotics',
    texto: 'Liquidar la nómina nos tomaba dos días y siempre había reclamos por los recargos. Con HoraPro es cuestión de minutos y los números cuadran. Dejamos de improvisar con hojas de cálculo.',
  },
  {
    id: IDS_TESTIMONIOS[1], nombrePublico: 'Carolina Calle', cargoPublico: 'CEO Tuercas & Pernos',
    texto: 'Lo que más me gustó es que la gente marca con la cara y se acabaron las excusas de "se me olvidó firmar". Los reportes de quién llegó tarde me los reviso desde el celular en la mañana.',
  },
  {
    id: IDS_TESTIMONIOS[2], nombrePublico: 'Santiago Botero', cargoPublico: 'Gerente Lavadora Las Brisas',
    texto: 'la verdad no soy de tecnologia y pense q iba ser complicado pero no. mis muchachos marcan con la cara y yo veo todo desde el telefono. me ahorro un monton de tiempo y ya no peleo con el excel jaja. muy recomendado',
  },
];

async function main() {
  exigirBaseLocal();
  const ahora = new Date();

  // ----- 1. El cliente con dos pagos -----
  // Primer pago real hace unos 40 días: cubre hasta el comienzo de este mes. Segundo pago: este mes.
  const inicioPrimerPago = medianocheBogota(claveDiaBogota(new Date(ahora.getTime() - 40 * DIA_MS)));
  const inicioEsteMes = inicioDeMes(ahora);
  const inicioMesSiguiente = sumarMesesBogota(inicioEsteMes, 1);

  // Si el NIT de prueba lo tuviera otra empresa, no se toca: se mira ANTES de escribir.
  const conEseNit = await prisma.empresa.findUnique({ where: { nit: EMPRESA_NIT }, select: { nombre: true } });
  if (conEseNit && conEseNit.nombre !== EMPRESA_NOMBRE) throw new Error(`El NIT ${EMPRESA_NIT} es de «${conEseNit.nombre}»: no se toca.`);
  const empresa = await prisma.empresa.upsert({
    where: { nit: EMPRESA_NIT },
    update: { activa: true, exentaPago: false, auxilioRevisadoEn: ahora, afiliadoId: null },
    create: { nombre: EMPRESA_NOMBRE, nit: EMPRESA_NIT, email: ADMIN_EMAIL, activa: true, exentaPago: false, auxilioRevisadoEn: ahora },
  });
  if ((await prisma.sede.count({ where: { empresaId: empresa.id } })) === 0) await crearSedePrincipal(prisma, empresa.id);

  const conEseCorreo = await prisma.usuario.findUnique({ where: { email: ADMIN_EMAIL }, select: { empresaId: true } });
  if (conEseCorreo && conEseCorreo.empresaId !== empresa.id) throw new Error(`El correo ${ADMIN_EMAIL} es de otra cuenta: no se toca.`);
  const hash = await bcrypt.hash('resenas-prueba-2026', 10);
  const admin = await prisma.usuario.upsert({
    where: { email: ADMIN_EMAIL },
    update: { nombre: 'Lucía Prueba', rol: 'ADMIN', activo: true, empresaId: empresa.id, emailVerificado: true, password: hash },
    create: { email: ADMIN_EMAIL, password: hash, nombre: 'Lucía Prueba', rol: 'ADMIN', activo: true, empresaId: empresa.id, emailVerificado: true },
  });

  const suscripcion = await prisma.suscripcion.upsert({
    where: { empresaId: empresa.id },
    update: { estado: 'ACTIVA', finPrueba: inicioPrimerPago, pagadoHasta: inicioMesSiguiente, suspendidaEn: null, plan: 'PROFESIONAL', cicloPago: 'MENSUAL' },
    create: { empresaId: empresa.id, estado: 'ACTIVA', finPrueba: inicioPrimerPago, pagadoHasta: inicioMesSiguiente, plan: 'PROFESIONAL', cicloPago: 'MENSUAL' },
  });
  // Los pagos se rehacen con las fechas de hoy: son todos de este guion.
  await prisma.pago.deleteMany({ where: { suscripcionId: suscripcion.id } });
  const pagoBase = { suscripcionId: suscripcion.id, colaboradoresFacturados: 1, metodo: 'MANUAL' as const, estado: 'APROBADO' as const, nota: NOTA_PAGO, registradoPor: REGISTRADA_POR };
  await prisma.pago.create({ data: { ...pagoBase, monto: 169_900, periodoInicio: inicioPrimerPago, periodoFin: inicioEsteMes } });
  await prisma.pago.create({ data: { ...pagoBase, monto: 169_900, periodoInicio: inicioEsteMes, periodoFin: inicioMesSiguiente } });

  // Sin reseña: así la ventana vuelve a salir aunque ya se haya probado.
  const borradas = await prisma.resena.deleteMany({ where: { empresaId: empresa.id } });

  // ----- 2 y 3. Las reseñas manuales -----
  for (const r of resenasDePrueba()) {
    const datos = { ...r, origen: 'MANUAL' as const, estado: 'PUBLICADA' as const, registradaPor: REGISTRADA_POR, publicadaEn: ahora };
    if (!esPublicable(datos).publicable) throw new Error(`La reseña ${r.id} no sería publicable: ${esPublicable(datos).motivo}`);
    await prisma.resena.upsert({ where: { id: r.id }, update: datos, create: datos });
  }
  for (const t of TESTIMONIOS) {
    const datos = {
      ...t, origen: 'MANUAL' as const, estado: 'POR_REVISAR' as const, estrellas: null, comoAparece: 'CON_NOMBRE' as const,
      canal: 'Landing anterior', fechaOpinion: medianocheBogota('2026-07-19'),
    };
    await prisma.resena.upsert({ where: { id: t.id }, update: datos, create: datos });
  }

  // ----- La comprobación, con las funciones de verdad y leyendo la base de nuevo -----
  const [e, s, cuantasResenas, colaboradoresActivos, u, publicadas, testimonios] = await Promise.all([
    prisma.empresa.findUniqueOrThrow({ where: { id: empresa.id }, select: { id: true, activa: true, exentaPago: true, auxilioRevisadoEn: true } }),
    prisma.suscripcion.findUniqueOrThrow({ where: { empresaId: empresa.id }, include: { pagos: { select: { estado: true, monto: true, periodoInicio: true } } } }),
    prisma.resena.count({ where: { empresaId: empresa.id } }),
    prisma.colaborador.count({ where: { empresaId: empresa.id, activo: true } }),
    prisma.usuario.findUniqueOrThrow({ where: { id: admin.id }, select: { rol: true, activo: true, emailVerificado: true, empresaId: true } }),
    prisma.resena.count({ where: { id: { startsWith: PREFIJO_PRUEBA }, estado: 'PUBLICADA' } }),
    prisma.resena.count({ where: { id: { in: IDS_TESTIMONIOS }, estado: 'POR_REVISAR' } }),
  ]);
  const elegible = elegibleParaResena({ empresa: e, suscripcion: s, pagos: s.pagos, yaTieneResena: cuantasResenas > 0 }, new Date());
  const comprobaciones: Array<[string, boolean]> = [
    [`elegibleParaResena da true hoy (${claveDiaBogota(ahora)})`, elegible],
    ['el usuario es ADMIN activo de esa empresa, con el correo verificado', u.rol === 'ADMIN' && u.activo && u.emailVerificado && u.empresaId === e.id],
    ['no le sale antes la revisión del auxilio', !revisionPendiente(e.auxilioRevisadoEn, colaboradoresActivos)],
    [`dos pagos APROBADO > 0 (inicios ${s.pagos.map(p => claveDiaBogota(p.periodoInicio)).join(' y ')})`, s.pagos.filter(p => p.estado === 'APROBADO' && p.monto > 0).length === 2],
    ['16 reseñas de prueba publicadas', publicadas === 16],
    ['3 testimonios por revisar', testimonios === 3],
  ];
  console.log('');
  for (const [que, ok] of comprobaciones) console.log(`  ${ok ? 'ok   ' : 'FALLA'} ${que}`);
  if (borradas.count) console.log(`\n  (se borró la reseña que la empresa ya había dejado: ${borradas.count})`);
  console.log(`
Cómo entrar:
  correo:      ${ADMIN_EMAIL}
  contraseña:  la que dice el comentario de arriba de prisma/seed-resenas-prueba.ts
  La ventana sale al entrar a Inicio (/app). Si en esa carga sale antes la guía de bienvenida o las
  Novedades, la reseña espera a la siguiente carga (R4): ciérralas y recarga /app.
`);
  if (comprobaciones.some(([, ok]) => !ok)) process.exitCode = 1;
}

if (require.main === module) {
  main()
    .catch(e => { console.error(e); process.exitCode = 1; })
    .finally(() => prisma.$disconnect());
}
