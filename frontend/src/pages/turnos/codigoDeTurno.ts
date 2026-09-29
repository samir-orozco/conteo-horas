import { sinTildes } from '../../lib/texto';

// EL CÓDIGO CORTO DE CADA TURNO, PARA LA CELDA DEL MES (28 de septiembre de 2026).
//
// En la vista de mes hay hasta cuarenta y dos columnas y la celda mide unos cuarenta píxeles. «Jornada
// nocturna» ahí se parte en dos renglones y la columna se ensancha hasta la palabra más larga: medido,
// la tabla pasaba de tres mil píxeles dentro de un contenedor de mil, o sea que para llegar a la
// última semana había que raspar a lo ancho. El bloque de la prueba lo cuenta entero.
//
// SE DERIVA DEL NOMBRE y no sale de un campo del catálogo, que es lo que hace la maqueta. Agregarle
// una columna al catálogo es un cambio de esquema, y en este proyecto eso se habla antes y arrastra
// el artefacto de Prisma (CLAUDE.md §4 y §11). Derivarlo no cuesta nada de eso.
//
// LA INVARIANTE ES QUE NO SE REPITAN, y está por encima de que quepan: dos turnos distintos con la
// misma letra en la misma rejilla son dos turnos que nadie puede distinguir, y aquí eso significa
// programar el turno equivocado sin que nada se vea raro. El ancho es una preferencia y por eso el
// desempate agota treinta y seis formas de dos caracteres antes de crecer.

// Lo que se prueba a ser el segundo carácter, en orden: la segunda letra del propio nombre —que es la
// que lo hace legible, «Ma» de Madrugada— y después dígitos y letras, que ya no significan nada pero
// distinguen.
const RELLENOS = '23456789abcdefghijklmnopqrstuvwxyz'.split('');

export function codigosDelCatalogo(
  turnos: readonly { id: string; nombre: string }[],
): Record<string, string> {
  const usados = new Set<string>();
  const codigos: Record<string, string> = {};

  for (const turno of turnos) {
    // Solo letras y dígitos: «· Noche» o «  Tarde» salen de copiar y pegar, y su código no puede ser
    // un punto ni un espacio.
    const letras = sinTildes(turno.nombre).replace(/[^a-z0-9]/g, '');
    // Un nombre sin nada legible no revienta la rejilla: se dibuja un signo que lo dice. Reventar
    // aquí dejaría el mes entero en blanco por un turno mal creado.
    const base = letras.length > 0 ? letras[0].toUpperCase() : '?';

    const candidatos = [
      base,
      ...(letras.length > 1 ? [base + letras[1]] : []),
      ...RELLENOS.map(r => base + r),
    ];
    // El último recurso crece de tamaño a propósito: antes un código feo que dos turnos iguales.
    const codigo = candidatos.find(c => !usados.has(c)) ?? `${base}${usados.size}`;

    usados.add(codigo);
    codigos[turno.id] = codigo;
  }

  return codigos;
}
