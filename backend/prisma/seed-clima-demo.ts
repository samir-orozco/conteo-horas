// Una empresa de prueba para ver el clima laboral en el navegador, en LOCAL (4 de octubre de 2026).
//
//   npx tsx prisma/seed-clima-demo.ts            crea (o vuelve a crear) la empresa con datos
//   npx tsx prisma/seed-clima-demo.ts --borrar   la borra entera
//
// Es una empresa APARTE de la demo de seed.ts a propósito: aquí el kiosco tiene que permitir la cédula
// y no pedir el giro de cabeza (para probar sin cámara), y cambiar eso en la demo le movería el piso a
// quien la esté usando para otra cosa.
//
// Credenciales de prueba, solo para la base local:
//   panel:  admin@clima-demo.test / clima-demo-123
//   kiosco: cédulas 7001 (Ana), 7002 (Luis), 7003 (Sofía), que hoy no han marcado: sirven para probar
//           la ventana. El enlace del kiosco lo imprime al final.
//
// LOS DATOS (pedido del dueño: «ojalá que sean muchos»). Un restaurante de 60 personas en tres sedes,
// con 13 semanas de jornadas y caritas. No son al azar puro, para que el panel cuente algo:
//   - cada persona tiene su ánimo de base; la Sede Sur anda peor que las otras dos;
//   - hace seis a ocho semanas hubo un bajón general (temporada de inventario) y después se recuperó;
//   - los motivos dependen de la sede: en Sur pesan «Mucho trabajo» y «Jefe o supervisor», en Centro
//     «Me tocó quedarme más tiempo», en Norte «Compañeros»;
//   - cinco personas llevan varias respuestas seguidas en Muy mal o Mal («Necesitan atención»);
//   - no todos responden todos los días (alrededor del 70 %), y cada uno descansa un día a la semana;
//   - tres remotos sin sede, para que aparezca «Sin sede».
// Usa un generador con semilla fija: correrlo dos veces da los mismos datos.
import bcrypt from 'bcryptjs';
import { prisma } from '../src/prisma';
import { borrarEmpresaEnCascada } from '../src/utils/borrarEmpresaEnCascada';
import { cifrar, leerClave } from '../src/utils/cifradoConfidencial';
import { rangoDiaBogota } from '../src/utils/fechas';
import { semanaDe, visibleDesde } from '../src/utils/clima';

const NIT = 'clima-demo';
const DIA = 24 * 60 * 60 * 1000;
const HORA = 60 * 60 * 1000;
const DIAS_ATRAS = 91;

// Generador con semilla (mulberry32): mismos datos en cada corrida.
let semilla = 20261004;
const azar = () => {
  semilla = (semilla + 0x6d2b79f5) | 0;
  let t = semilla;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const uno = <T>(lista: T[]) => lista[Math.floor(azar() * lista.length)];
const normal = () => Math.sqrt(-2 * Math.log(azar() || 1e-9)) * Math.cos(2 * Math.PI * azar());

const NOMBRES = ['Ana', 'Luis', 'Sofía', 'Carlos', 'Diana', 'Jorge', 'Valentina', 'Andrés', 'Camila', 'Felipe', 'Laura', 'Santiago',
  'Daniela', 'Mateo', 'Mariana', 'Sebastián', 'Paula', 'Juan David', 'Natalia', 'Julián', 'Carolina', 'Esteban', 'Juliana', 'Cristian',
  'Lina', 'Óscar', 'Manuela', 'David', 'Alejandra', 'Miguel', 'Isabella', 'Samuel', 'Gabriela', 'Nicolás', 'Tatiana', 'Ricardo',
  'Melissa', 'Fernando', 'Luisa', 'Kevin', 'Ximena', 'Héctor', 'Angélica', 'Brayan', 'Yuliana', 'Wilson', 'Paola', 'Jhon',
  'Sara', 'Mauricio', 'Vanessa', 'Edwin', 'Katherine', 'Diego', 'Lorena', 'Fabián', 'Marcela', 'Iván', 'Johana', 'Álvaro'];
const APELLIDOS = ['Gómez', 'Pérez', 'Ríos', 'Mejía', 'López', 'Vargas', 'Restrepo', 'Ramírez', 'Torres', 'Castaño', 'Ospina', 'Cardona',
  'Henao', 'Zapata', 'Giraldo', 'Muñoz', 'Rojas', 'Arango', 'Valencia', 'Jaramillo', 'Montoya', 'Salazar', 'Quintero', 'Patiño'];
const CARGOS = ['Atención en mesa', 'Caja', 'Cocina', 'Auxiliar de cocina', 'Bodega', 'Domicilios', 'Aseo', 'Barra'];

const MOTIVOS_POR_SEDE: Record<string, [string, number][]> = {
  'Sede Centro': [['Me tocó quedarme más tiempo', 5], ['Mucho trabajo', 3], ['Compañeros', 1], ['Algo personal', 2], ['Jefe o supervisor', 1]],
  'Sede Norte': [['Compañeros', 5], ['Mucho trabajo', 2], ['Algo personal', 2], ['Me tocó quedarme más tiempo', 1], ['Jefe o supervisor', 1]],
  'Sede Sur': [['Mucho trabajo', 5], ['Jefe o supervisor', 4], ['Me tocó quedarme más tiempo', 2], ['Algo personal', 1], ['Compañeros', 1]],
  'Sin sede': [['Algo personal', 3], ['Mucho trabajo', 2], ['Compañeros', 1]],
};
const conPeso = (lista: [string, number][]) => {
  const total = lista.reduce((s, [, p]) => s + p, 0);
  let x = azar() * total;
  for (const [m, p] of lista) { x -= p; if (x <= 0) return m; }
  return lista[0][0];
};

const OBSERVACIONES: Record<number, string[]> = {
  1: ['Me dejaron sola en el cierre otra vez.', 'Hoy no alcanzamos con tanta gente y faltaron dos compañeros.', 'Me regañaron delante de los clientes.',
    'Salí casi dos horas tarde y nadie avisó.', 'Estoy muy cansado, llevo tres dobles seguidos.'],
  2: ['Llegó tarde el pedido y nos tocó correr.', 'La freidora volvió a fallar.', 'Mucho trabajo y poca gente en la tarde.',
    'No me avisaron el cambio de turno.', 'Discusión en la cocina por los pedidos.'],
  3: ['Día normal, algo pesado al mediodía.', 'Faltaron insumos pero lo resolvimos.', 'Tranquilo, aunque el turno fue largo.'],
  4: ['Buen día, el equipo ayudó mucho.', 'Se organizó bien el cierre.', 'Hoy salimos a tiempo.'],
  5: ['Excelente día, nos felicitaron los clientes.', 'Muy buen ambiente hoy.', 'Gracias al supervisor por el apoyo en el pico.'],
};

const NOTAS_CONFIDENCIALES = [
  'El supervisor de la Sede Sur grita a la gente delante de los clientes.',
  'Los turnos del fin de semana se publican el domingo en la noche y no alcanzamos a organizarnos.',
  'El microondas del comedor lleva un mes dañado.',
  'Me gustaría que reconocieran cuando uno se queda más tiempo.',
  'Hay preferencias con los turnos: siempre les tocan los mejores a los mismos.',
  'No hay dónde guardar las cosas personales y se han perdido celulares.',
  'El baño del personal en Norte no tiene agua desde hace días.',
  'Nos están pidiendo que marquemos la salida y sigamos trabajando.',
  'Sería bueno tener uniformes de repuesto, en la cocina se ensucian rápido.',
  'Una compañera recibe comentarios incómodos de un cliente frecuente y nadie hace nada.',
  'Me da miedo decir que estoy enfermo porque me descuentan.',
  'El aire acondicionado de la cocina no funciona y el calor es insoportable.',
  'Agradezco que hayan cambiado el horario de las entregas, ahora es mucho mejor.',
  'Falta capacitación para los nuevos, aprenden a punta de regaños.',
  'Las propinas no se reparten claro, nadie sabe cuánto le toca.',
  'Me siento muy bien en el equipo de Centro, ojalá se mantenga.',
  'El jefe de bodega cambia las reglas cada semana.',
  'Necesitamos un descanso de verdad a mitad del turno, no cinco minutos de pie.',
  'Hubo un accidente con el aceite y no había botiquín.',
  'El pago de las horas extra de septiembre llegó incompleto.',
  'Gracias por la jornada de integración, nos hacía falta.',
  'Hay compañeros que fuman en la puerta de la cocina.',
];

async function borrar() {
  const e = await prisma.empresa.findUnique({ where: { nit: NIT }, select: { id: true } });
  if (!e) return false;
  await prisma.$transaction(tx => borrarEmpresaEnCascada(tx, e.id), { timeout: 120_000 });
  return true;
}

async function main() {
  if (process.argv.includes('--borrar')) {
    console.log((await borrar()) ? 'Empresa de clima borrada.' : 'No había empresa de clima.');
    return;
  }
  const clave = leerClave(process.env.CLAVE_CONFIDENCIAL);
  if (!clave) throw new Error('Falta CLAVE_CONFIDENCIAL en backend/.env');
  await borrar();

  const empresa = await prisma.empresa.create({
    data: { nombre: 'Restaurante Clima Demo', nit: NIT, email: 'contacto@clima-demo.test', exentaPago: true, auxilioRevisadoEn: new Date() },
  });
  // La más antigua es la principal: se crean en este orden a propósito.
  const sedes: Record<string, string> = {};
  for (const [i, nombre] of ['Sede Centro', 'Sede Norte', 'Sede Sur'].entries()) {
    const s = await prisma.sede.create({ data: { empresaId: empresa.id, nombre, creadoEn: new Date(Date.now() - (10 - i) * 1000) } });
    sedes[nombre] = s.id;
  }
  await prisma.usuario.create({
    data: { email: 'admin@clima-demo.test', password: await bcrypt.hash('clima-demo-123', 10), nombre: 'Admin Clima', rol: 'ADMIN', empresaId: empresa.id, emailVerificado: true },
  });
  await prisma.configuracion.createMany({
    data: [
      { empresaId: empresa.id, clave: 'KIOSCO_PERMITE_CEDULA', valor: '1' },
      { empresaId: empresa.id, clave: 'KIOSCO_RETO_POSE', valor: '0' },
    ],
  });

  // ── La gente ──
  type Persona = { id: string; nombre: string; sede: string; base: number; descansa: number; responde: number };
  const gente: Persona[] = [];
  for (let i = 0; i < 60; i++) {
    const sede = i >= 57 ? 'Sin sede' : (['Sede Centro', 'Sede Norte', 'Sede Sur'] as const)[i % 3];
    const nombre = NOMBRES[i];
    const c = await prisma.colaborador.create({
      data: {
        empresaId: empresa.id, nombre, apellido: `${APELLIDOS[i % APELLIDOS.length]} ${APELLIDOS[(i * 7 + 3) % APELLIDOS.length]}`,
        cedula: String(7001 + i), cargo: uno(CARGOS), salarioMensual: 1500000 + Math.round(azar() * 8) * 100000,
        // Sin coordenadas en las sedes, nadie necesita GPS; los tres del final son remotos y sin sede.
        modalidad: sede === 'Sin sede' ? 'REMOTO' : 'PRESENCIAL',
      },
    });
    if (sede !== 'Sin sede') await prisma.colaboradorSede.create({ data: { colaboradorId: c.id, sedeId: sedes[sede] } });
    gente.push({
      id: c.id, nombre, sede,
      base: 3.7 + normal() * 0.45 - (sede === 'Sede Sur' ? 0.6 : 0) + (sede === 'Sede Centro' ? 0.15 : 0),
      // 0 = domingo. La mayoría descansa el domingo; algunos, entre semana.
      descansa: azar() < 0.7 ? 0 : 1 + Math.floor(azar() * 6),
      responde: 0.55 + azar() * 0.35,
    });
  }

  // Cinco personas con una racha mala al final: sus últimas k respuestas en Muy mal o Mal. Repartidas en
  // las tres sedes (la sede es el índice módulo 3) y una sin sede.
  const conRacha = new Map<string, number>([[gente[5].id, 6], [gente[7].id, 4], [gente[14].id, 3], [gente[21].id, 5], [gente[58].id, 3]]);

  const hoy = rangoDiaBogota(new Date()).inicioDia;
  const registros: { colaboradorId: string; sedeId: string | null; sedeSalidaId: string | null; fecha: Date; entrada: Date; salida: Date; metodoEntrada: 'CEDULA'; metodoSalida: 'CEDULA' }[] = [];
  const calificaciones: { empresaId: string; colaboradorId: string; fecha: Date; carita: number; motivos: string[]; observacion: string | null }[] = [];

  for (const p of gente) {
    const delaPersona: typeof calificaciones = [];
    for (let d = DIAS_ATRAS; d >= 0; d--) {
      // Hoy no marcan las tres primeras (Ana, Luis, Sofía): quedan libres para probar el kiosco.
      if (d === 0 && ['7001', '7002', '7003'].includes(String(7001 + gente.indexOf(p)))) continue;
      const fecha = new Date(hoy.getTime() - d * DIA);
      const diaSemana = new Date(fecha.getTime() - 5 * HORA).getUTCDay();
      if (diaSemana === p.descansa) continue;
      if (azar() < 0.04) continue; // alguna ausencia suelta
      const entrada = new Date(fecha.getTime() + (12 + azar() * 2) * HORA);
      const salida = new Date(entrada.getTime() + (8 + azar() * 1.5) * HORA);
      const sedeId = p.sede === 'Sin sede' ? null : sedes[p.sede];
      registros.push({ colaboradorId: p.id, sedeId, sedeSalidaId: sedeId, fecha, entrada, salida, metodoEntrada: 'CEDULA', metodoSalida: 'CEDULA' });
      if (azar() > p.responde) continue;

      // El ánimo del día: su base, el bajón de hace 6 a 8 semanas, un poco mejor los sábados, y ruido.
      const semanasAtras = d / 7;
      const bajon = semanasAtras >= 6 && semanasAtras <= 8.5 ? -0.8 : semanasAtras < 2 ? 0.2 : 0;
      const sabado = diaSemana === 6 ? 0.25 : 0;
      const carita = Math.max(1, Math.min(5, Math.round(p.base + bajon + sabado + normal() * 0.85)));
      delaPersona.push({ empresaId: empresa.id, colaboradorId: p.id, fecha, carita, motivos: [], observacion: null });
    }
    // La racha mala del final, para «Necesitan atención». La respuesta de justo antes es buena, para que
    // la racha tenga un comienzo claro.
    const k = conRacha.get(p.id);
    if (k && delaPersona.length > k + 1) {
      for (let j = delaPersona.length - k; j < delaPersona.length; j++) delaPersona[j].carita = azar() < 0.5 ? 1 : 2;
      delaPersona[delaPersona.length - k - 1].carita = 4;
    }
    for (const c of delaPersona) {
      if (c.carita <= 3 && azar() < 0.8) {
        const motivos = new Set([conPeso(MOTIVOS_POR_SEDE[p.sede])]);
        if (azar() < 0.35) motivos.add(conPeso(MOTIVOS_POR_SEDE[p.sede]));
        c.motivos = [...motivos];
      }
      if (azar() < (c.carita <= 2 ? 0.25 : 0.08)) c.observacion = uno(OBSERVACIONES[c.carita]);
    }
    calificaciones.push(...delaPersona);
  }

  for (let i = 0; i < registros.length; i += 1000) await prisma.registro.createMany({ data: registros.slice(i, i + 1000) });
  for (let i = 0; i < calificaciones.length; i += 1000) await prisma.calificacionClima.createMany({ data: calificaciones.slice(i, i + 1000) });

  // Notas confidenciales repartidas en las 12 semanas del buzón, entre una y cuatro por semana. Cada una
  // con su autor cifrado, como las de verdad. Las de hoy no se ven hasta mañana.
  const notas = [];
  let n = 0;
  for (let semana = 0; semana < 12; semana++) {
    for (let j = 0, cuantas = 1 + Math.floor(azar() * 4); j < cuantas; j++) {
      const momento = new Date(hoy.getTime() - (semana * 7 + Math.floor(azar() * 7)) * DIA + (17 + azar() * 4) * HORA);
      const autor = uno(gente);
      notas.push({
        empresaId: empresa.id, semana: semanaDe(momento), visibleDesde: visibleDesde(momento),
        texto: NOTAS_CONFIDENCIALES[n++ % NOTAS_CONFIDENCIALES.length], autorCifrado: cifrar(autor.id, clave),
      });
    }
  }
  await prisma.observacionConfidencial.createMany({ data: notas });

  console.log(`Empresa «${empresa.nombre}»: ${gente.length} personas en 3 sedes, ${registros.length} jornadas, `
    + `${calificaciones.length} calificaciones y ${notas.length} notas confidenciales en ${DIAS_ATRAS + 1} días.`);
  console.log(`Kiosco: http://localhost:5175/marcador/${empresa.marcadorToken}`);
  console.log('Panel:  http://localhost:5175/app/clima');
}

main()
  .catch(e => { console.error('FALLÓ:', e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
