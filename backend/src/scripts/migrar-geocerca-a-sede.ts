import { prisma } from '../prisma';

// Convierte la geocerca única de cada empresa en una "Sede principal" y asigna
// a todos sus colaboradores.
//
// Por qué hace falta: la geocerca vivía en `Configuracion` (GEO_LAT/LNG/RADIO),
// una sola por empresa. Si se activaran las sedes sin migrar, quien ya usa GPS
// se quedaría sin geocerca de un día para otro — o peor, marcando desde
// cualquier lado sin que el sistema lo note.
//
// El código NO depende de esta migración: si un colaborador no tiene sedes, el
// kiosco cae a la geocerca de la empresa como siempre. Esto solo mueve a la
// gente al modelo nuevo para que pueda tener más de un local.
//
// Es idempotente: una empresa que ya tenga sedes se salta.
//
// Se ejecuta con: node dist/scripts/migrar-geocerca-a-sede.js
// En local:      npx ts-node src/scripts/migrar-geocerca-a-sede.ts

async function main() {
  const empresas = await prisma.empresa.findMany({ select: { id: true, nombre: true } });
  console.log(`Empresas: ${empresas.length}\n`);

  let creadas = 0, saltadas = 0, asignaciones = 0;

  for (const empresa of empresas) {
    const yaTiene = await prisma.sede.count({ where: { empresaId: empresa.id } });
    if (yaTiene > 0) {
      console.log(`   ${empresa.nombre.padEnd(28)} ya tiene ${yaTiene} sede(s), se salta`);
      saltadas++;
      continue;
    }

    const cfgs = await prisma.configuracion.findMany({
      where: { empresaId: empresa.id, clave: { in: ['GEO_EXIGIR', 'GEO_LAT', 'GEO_LNG', 'GEO_RADIO'] } },
    });
    const map = Object.fromEntries(cfgs.map(c => [c.clave, c.valor]));
    const lat = Number(map.GEO_LAT), lng = Number(map.GEO_LNG);
    // Solo se copian las coordenadas si la empresa TENÍA el geocerco activo. Si
    // lo tenía apagado, la sede nace sin ubicación y sigue sin exigir GPS: la
    // migración no puede empezar a bloquear marcaciones que antes pasaban.
    const conGeo = map.GEO_EXIGIR === '1' && Number.isFinite(lat) && Number.isFinite(lng);

    const sede = await prisma.sede.create({
      data: {
        empresaId: empresa.id,
        nombre: 'Sede principal',
        lat: conGeo ? lat : null,
        lng: conGeo ? lng : null,
        radio: Number(map.GEO_RADIO) || 150,
      },
    });

    const colaboradores = await prisma.colaborador.findMany({
      where: { empresaId: empresa.id },
      select: { id: true },
    });
    if (colaboradores.length > 0) {
      await prisma.colaboradorSede.createMany({
        data: colaboradores.map(c => ({ colaboradorId: c.id, sedeId: sede.id })),
        skipDuplicates: true,
      });
    }

    creadas++;
    asignaciones += colaboradores.length;
    console.log(`   ${empresa.nombre.padEnd(28)} sede creada ${conGeo ? `con geocerca (${lat}, ${lng}, ${sede.radio} m)` : 'SIN ubicación (no la tenía)'} · ${colaboradores.length} colaborador(es)`);
  }

  console.log(`\nSedes creadas: ${creadas} · empresas saltadas: ${saltadas} · asignaciones: ${asignaciones}`);
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
