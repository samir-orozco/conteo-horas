// Verifica la COSTURA que las pruebas unitarias no cubren: que la ruta real de
// marcación lea la modalidad del colaborador y aplique la decisión correcta
// contra MySQL. Es lo que pide CLAUDE.md §8.6.
//
//   1. Levanta el backend:  npm run dev
//   2. En otra terminal:    npx tsx prisma/verificar-modalidad-marca.ts
//
// Crea una empresa de prueba con una sede con coordenadas y tres colaboradores,
// llama POST /api/worker/marcar de verdad, comprueba lo que quedó escrito, y
// BORRA todo lo que creó.
import { prisma } from '../src/prisma';

const API = process.env.API ?? 'http://localhost:3001';
const SUFIJO = `mod-${Date.now()}`;

// El Poblado, Medellín. Y un punto en Bogotá, que hace de "la casa".
const SEDE = { lat: 6.2087, lng: -75.5674, radio: 150 };
const DENTRO = { lat: 6.2087, lng: -75.5674 };
const LEJOS = { lat: 4.711, lng: -74.0721 };

type Caso = { nombre: string; espera: string; ok: boolean; obtenido: string };
const casos: Caso[] = [];

function comprobar(nombre: string, espera: string, obtenido: string) {
  casos.push({ nombre, espera, obtenido, ok: espera === obtenido });
}

async function marcar(token: string, coords: { lat: number; lng: number } | null) {
  const r = await fetch(`${API}/api/worker/marcar`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify(coords ? { lat: coords.lat, lng: coords.lng } : {}),
  });
  const cuerpo = await r.json().catch(() => ({}));
  return { estado: r.status, cuerpo: cuerpo as any };
}

async function login(marcadorToken: string, cedula: string) {
  const r = await fetch(`${API}/api/worker/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ marcadorToken, cedula }),
  });
  if (!r.ok) throw new Error(`login falló para ${cedula}: ${r.status} ${await r.text()}`);
  return (await r.json()) as { token: string; colaborador: { modalidad?: string } };
}

async function main() {
  const empresa = await prisma.empresa.create({
    data: { nombre: `Prueba ${SUFIJO}`, nit: SUFIJO, email: `${SUFIJO}@prueba.local`, marcadorToken: SUFIJO, activa: true },
    select: { id: true, marcadorToken: true },
  });
  const sede = await prisma.sede.create({
    data: { empresaId: empresa.id, nombre: 'El Poblado', ...SEDE, activa: true },
    select: { id: true },
  });

  const crear = async (modalidad: 'PRESENCIAL' | 'HIBRIDO' | 'REMOTO', conSede: boolean) => {
    const c = await prisma.colaborador.create({
      data: {
        empresaId: empresa.id, nombre: modalidad, apellido: 'Prueba',
        cedula: `${SUFIJO}-${modalidad}${conSede ? '' : '-sinsede'}`,
        salarioMensual: 1_500_000, modalidad,
      },
      select: { id: true, cedula: true },
    });
    if (conSede) await prisma.colaboradorSede.create({ data: { colaboradorId: c.id, sedeId: sede.id } });
    return c;
  };

  const presencial = await crear('PRESENCIAL', true);
  const hibrido = await crear('HIBRIDO', true);
  const remoto = await crear('REMOTO', true); // con sedes A PROPÓSITO: el estado contradictorio

  const sesion = {
    presencial: await login(empresa.marcadorToken, presencial.cedula),
    hibrido: await login(empresa.marcadorToken, hibrido.cedula),
    remoto: await login(empresa.marcadorToken, remoto.cedula),
  };

  comprobar('el login informa la modalidad al kiosco', 'REMOTO', String(sesion.remoto.colaborador.modalidad));

  // ---- PRESENCIAL: se comporta igual que antes de este cambio ----
  const p1 = await marcar(sesion.presencial.token, LEJOS);
  comprobar('PRESENCIAL desde lejos: rechazado', '403 FUERA_DE_UBICACION', `${p1.estado} ${p1.cuerpo.codigo}`);
  const p2 = await marcar(sesion.presencial.token, null);
  comprobar('PRESENCIAL sin coordenadas: se las exige', '400 UBICACION_REQUERIDA', `${p2.estado} ${p2.cuerpo.codigo}`);
  const p3 = await marcar(sesion.presencial.token, DENTRO);
  comprobar('PRESENCIAL dentro de su sede: entra', '200 ENTRADA', `${p3.estado} ${p3.cuerpo.accion}`);

  // ---- HIBRIDO: nunca se bloquea, pero anota dónde estaba ----
  const h1 = await marcar(sesion.hibrido.token, LEJOS);
  comprobar('HIBRIDO desde la casa: marca igual', '200 ENTRADA', `${h1.estado} ${h1.cuerpo.accion}`);
  const regHibrido = await prisma.registro.findFirst({
    where: { colaboradorId: hibrido.id }, orderBy: { creadoEn: 'desc' }, select: { id: true, sedeId: true },
  });
  comprobar('HIBRIDO fuera: el registro queda SIN sede', 'sin sede', regHibrido?.sedeId ? 'con sede' : 'sin sede');

  // ---- REMOTO: no se le mira la ubicación, ni con sedes asignadas ----
  const r1 = await marcar(sesion.remoto.token, null);
  comprobar('REMOTO sin coordenadas: marca normal', '200 ENTRADA', `${r1.estado} ${r1.cuerpo.accion}`);
  const regRemoto = await prisma.registro.findFirst({
    where: { colaboradorId: remoto.id }, orderBy: { creadoEn: 'desc' }, select: { sedeId: true },
  });
  comprobar('REMOTO con sedes asignadas: tampoco se le anota una', 'sin sede', regRemoto?.sedeId ? 'con sede' : 'sin sede');

  // ---- HIBRIDO cierra el turno desde otro lado ----
  const h2 = await marcar(sesion.hibrido.token, DENTRO);
  comprobar('HIBRIDO cierra desde otra parte: no lo frena SEDE_DISTINTA', '200 SALIDA', `${h2.estado} ${h2.cuerpo.accion}`);

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
    // Limpieza: se borra todo lo creado, pase lo que pase.
    const empresa = await prisma.empresa.findFirst({ where: { marcadorToken: SUFIJO }, select: { id: true } });
    if (empresa) {
      const cols = await prisma.colaborador.findMany({ where: { empresaId: empresa.id }, select: { id: true } });
      const ids = cols.map(c => c.id);
      await prisma.registro.deleteMany({ where: { colaboradorId: { in: ids } } });
      await prisma.colaboradorSede.deleteMany({ where: { colaboradorId: { in: ids } } });
      await prisma.colaborador.deleteMany({ where: { id: { in: ids } } });
      await prisma.sede.deleteMany({ where: { empresaId: empresa.id } });
      await prisma.notificacion.deleteMany({ where: { empresaId: empresa.id } });
      await prisma.empresa.delete({ where: { id: empresa.id } });
      console.log('Limpieza: borrada la empresa de prueba y todo lo suyo.');
    }
    await prisma.$disconnect();
    process.exit(salida);
  });
