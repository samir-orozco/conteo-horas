// Verifica la COSTURA que las pruebas unitarias no cubren: que /marcar lea el
// permiso del colaborador, aplique `puedeCerrarAqui` y guarde dónde se cerró el
// turno. Es lo que pide CLAUDE.md §8.6.
//
//   1. Levanta el backend:  npm run dev
//   2. En otra terminal:    npx tsx prisma/verificar-cierre-otra-sede.ts
//
// Crea una empresa de prueba con DOS sedes con coordenadas, a unos 2 km una de
// otra, y tres colaboradores asignados a las dos. Llama POST /api/worker/marcar
// de verdad, comprueba lo que quedó escrito, y BORRA todo lo que creó.
//
// POR QUÉ DOS SEDES Y ENTRANDO DENTRO. El script de modalidad crea una sola sede
// y un híbrido que entra desde lejos, así que su registro queda sin sede y la
// regla de misma sede ni siquiera llega a evaluarse: pasaría igual aunque se
// borrara la guarda. Este no.
import { prisma } from '../src/prisma';

const API = process.env.API ?? 'http://localhost:3001';
const SUFIJO = `sede2-${Date.now()}`;

// Las mismas sedes de modalidad.test.ts.
const POBLADO = { lat: 6.2087, lng: -75.5674, radio: 150 };
const LAURELES = { lat: 6.2447, lng: -75.5916, radio: 150 };
const EN_POBLADO = { lat: 6.2087, lng: -75.5674 };
const EN_LAURELES = { lat: 6.2447, lng: -75.5916 };

type Caso = { nombre: string; espera: string; ok: boolean; obtenido: string };
const casos: Caso[] = [];
function comprobar(nombre: string, espera: string, obtenido: string) {
  casos.push({ nombre, espera, obtenido, ok: espera === obtenido });
}

async function marcar(token: string, coords: { lat: number; lng: number }) {
  const r = await fetch(`${API}/api/worker/marcar`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify({ lat: coords.lat, lng: coords.lng }),
  });
  const cuerpo = await r.json().catch(() => ({}));
  return { estado: r.status, cuerpo: cuerpo as { accion?: string; codigo?: string } };
}

async function login(marcadorToken: string, cedula: string) {
  const r = await fetch(`${API}/api/worker/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ marcadorToken, cedula }),
  });
  if (!r.ok) throw new Error(`login falló para ${cedula}: ${r.status} ${await r.text()}`);
  return (await r.json()) as { token: string };
}

async function main() {
  const empresa = await prisma.empresa.create({
    data: { nombre: `Prueba ${SUFIJO}`, nit: SUFIJO, email: `${SUFIJO}@prueba.local`, marcadorToken: SUFIJO, activa: true },
    select: { id: true, marcadorToken: true },
  });
  const sedeA = await prisma.sede.create({ data: { empresaId: empresa.id, nombre: 'El Poblado', ...POBLADO, activa: true }, select: { id: true } });
  const sedeB = await prisma.sede.create({ data: { empresaId: empresa.id, nombre: 'Laureles', ...LAURELES, activa: true }, select: { id: true } });
  const nombre = (id: string | null | undefined) => (id === sedeA.id ? 'Poblado' : id === sedeB.id ? 'Laureles' : 'sin sede');

  const crear = async (etiqueta: string, modalidad: 'PRESENCIAL' | 'HIBRIDO', permiso: boolean) => {
    const c = await prisma.colaborador.create({
      data: {
        empresaId: empresa.id, nombre: etiqueta, apellido: 'Prueba', cedula: `${SUFIJO}-${etiqueta}`,
        salarioMensual: 1_500_000, modalidad, puedeCerrarEnOtraSede: permiso,
      },
      select: { id: true, cedula: true },
    });
    await prisma.colaboradorSede.createMany({ data: [{ colaboradorId: c.id, sedeId: sedeA.id }, { colaboradorId: c.id, sedeId: sedeB.id }] });
    return c;
  };
  const ultimo = (colaboradorId: string) => prisma.registro.findFirst({
    where: { colaboradorId }, orderBy: { creadoEn: 'desc' }, select: { sedeId: true, sedeSalidaId: true, salida: true },
  });

  const sinPermiso = await crear('SinPermiso', 'PRESENCIAL', false);
  const conPermiso = await crear('ConPermiso', 'PRESENCIAL', true);
  const hibrido = await crear('Hibrido', 'HIBRIDO', false);
  const t = {
    sin: (await login(empresa.marcadorToken, sinPermiso.cedula)).token,
    con: (await login(empresa.marcadorToken, conPermiso.cedula)).token,
    hib: (await login(empresa.marcadorToken, hibrido.cedula)).token,
  };

  // ---- PRESENCIAL SIN permiso: la regla de siempre, intacta ----
  const s1 = await marcar(t.sin, EN_POBLADO);
  comprobar('sin permiso: entra en Poblado', '200 ENTRADA', `${s1.estado} ${s1.cuerpo.accion}`);
  const s2 = await marcar(t.sin, EN_LAURELES);
  comprobar('sin permiso: NO puede cerrar en Laureles', '403 SEDE_DISTINTA', `${s2.estado} ${s2.cuerpo.codigo}`);
  comprobar('sin permiso: el rechazo no cerró nada', 'abierto', (await ultimo(sinPermiso.id))?.salida ? 'cerrado' : 'abierto');
  const s3 = await marcar(t.sin, EN_POBLADO);
  comprobar('sin permiso: cierra donde abrió', '200 SALIDA', `${s3.estado} ${s3.cuerpo.accion}`);
  const rs = await ultimo(sinPermiso.id);
  comprobar('sin permiso: queda dónde abrió y dónde cerró', 'Poblado→Poblado', `${nombre(rs?.sedeId)}→${nombre(rs?.sedeSalidaId)}`);

  // ---- PRESENCIAL CON permiso: el supervisor ----
  const c1 = await marcar(t.con, EN_POBLADO);
  comprobar('con permiso: entra en Poblado', '200 ENTRADA', `${c1.estado} ${c1.cuerpo.accion}`);
  const c2 = await marcar(t.con, EN_LAURELES);
  comprobar('con permiso: SÍ puede cerrar en Laureles', '200 SALIDA', `${c2.estado} ${c2.cuerpo.accion}`);
  const rc = await ultimo(conPermiso.id);
  comprobar('con permiso: el turno dice que cruzó de sede', 'Poblado→Laureles', `${nombre(rc?.sedeId)}→${nombre(rc?.sedeSalidaId)}`);

  // ---- HIBRIDO: nunca se bloqueaba, y ahora además queda dónde cerró ----
  const h1 = await marcar(t.hib, EN_POBLADO);
  comprobar('híbrido: entra en Poblado', '200 ENTRADA', `${h1.estado} ${h1.cuerpo.accion}`);
  const h2 = await marcar(t.hib, EN_LAURELES);
  comprobar('híbrido: cierra en Laureles', '200 SALIDA', `${h2.estado} ${h2.cuerpo.accion}`);
  const rh = await ultimo(hibrido.id);
  comprobar('híbrido: recupera la sede de cierre que antes perdía', 'Poblado→Laureles', `${nombre(rh?.sedeId)}→${nombre(rh?.sedeSalidaId)}`);

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
