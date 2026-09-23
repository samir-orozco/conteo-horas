// Los días de la semana, en el orden de `Date.getDay()`: el índice 0 es DOMINGO.
//
// Vive solo, SIN NINGUNA IMPORTACIÓN, y eso es lo importante de este archivo (20 de septiembre de
// 2026). Estaba escrito CINCO veces: en `tardanzas`, `cierreTurnos`, `horasColombiana`, `dashboard`
// y `worker`. Cinco copias de la misma lista son cinco oportunidades de que una se escriba distinto
// y nadie lo note, porque el índice tiene que casar con `getDay()` y nada lo comprueba.
//
// Y hay una segunda razón, que fue la que obligó a sacarlo: la lista vivía en `tardanzas.ts`, que
// importa de `horasColombiana.ts`. Cuando `horasColombiana` necesitó preguntar qué día descansa una
// persona, el import cerraba el triángulo
//
//   horasColombiana → descansoObligatorio → tardanzas → horasColombiana
//
// Hoy ese import de `tardanzas` es `import type`, que TypeScript borra al compilar, así que el ciclo
// era solo de tipos y no hacía daño. Pero un ciclo en ejecución no falla con un error claro: deja
// una constante en `undefined` durante la inicialización y el fallo aparece después, en otro sitio.
// Con la lista aquí, el ciclo no puede volver a formarse aunque alguien cambie ese `import type`.
//
// Al tocar esta lista: el orden NO es decorativo. `DIAS_SEMANA[fecha.getDay()]` es la forma en que
// medio backend traduce una fecha a un día, y `FranjaHorario.dias` guarda estos mismos nombres, sin
// tildes, en la base de datos de producción.
export const DIAS_SEMANA = ['DOMINGO', 'LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO'];

// El día de la semana de una fecha que YA está anclada a medianoche de Bogotá (`Registro.fecha`,
// `DiaEsperado.fecha`), que se guardan como las 05:00 UTC de ese día.
//
// Se lee con `getUTCDay()` y NO con `getDay()`, y eso es todo lo que hace esta función: `getDay()`
// usa el reloj de la máquina, así que en cualquier equipo al occidente de Colombia —y en la suite,
// que corre fijada en América/Los Ángeles a propósito— devolvería el día ANTERIOR (CLAUDE.md §8.1).
//
// Vive aquí y no en quien la usa porque ya iba por su segunda copia: estaba en `materializarDias`
// y el calendario de turnos necesitaba la misma. Dos copias es como empezaron las cinco de
// `DIAS_SEMANA` (CLAUDE.md §9.3).
export function diaSemanaDeFechaBogota(fecha: Date): string {
  return DIAS_SEMANA[fecha.getUTCDay()];
}

// Un nombre de día tal como llega de la base, normalizado, o `null` si no se reconoce.
//
// Llega aquí desde `descansoObligatorio.ts`, donde era privada, al aparecer la TERCERA necesidad
// (el descanso de una semana rotativa). Al buscarla con `grep` resultó que ya estaban escritas DOS:
// aquella y otra dentro de `cuerpoDeRespuestaDescanso.ts`. Se comprobó antes de fundirlas que
// hacían exactamente lo mismo; todavía no habían derivado. Las dos se migran en este mismo commit,
// que es lo que pide CLAUDE.md §9.3: una regla extraída a medias es peor que no haberla extraído,
// porque parece una sola y son dos.
//
// TOLERANTE Y NO ESTRICTA, a propósito: estos nombres viven en columnas de TEXTO LIBRE de
// producción (`FranjaHorario.dias`, que además es Json, y `Colaborador.descansoDia`). Un valor raro
// no puede cambiar quién descansa cuándo, así que lo que no se reconoce se descarta en silencio en
// vez de reventar. Lo que sí se reconoce vuelve en la forma canónica, porque quien llama lo compara
// contra `DIAS_SEMANA`.
export function diaValido(valor: unknown): string | null {
  if (typeof valor !== 'string') return null;
  const limpio = valor.trim().toUpperCase();
  return DIAS_SEMANA.includes(limpio) ? limpio : null;
}
