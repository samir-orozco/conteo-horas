import { sumarDias, lunesDeLaSemana, diasDeLaSemana, rotuloDeSemana, rotuloDeDia, rotuloDeMes, rotuloDeRango } from './semana';

// DÍA, SEMANA Y MES (22 de septiembre de 2026).
//
// Pedido del dueño: «que la parte de arriba quede así, que podamos ver día, Semana y Mes».
//
// POR QUÉ ES UNA DECISIÓN Y NO UN `useState` MÁS: hasta hoy el encabezado tenía la semana metida a
// mano en tres sitios —las flechas sumaban ±7, el rótulo llamaba a `rotuloDeSemana`, y las columnas
// salían de `diasDeLaSemana`—. Con tres modos eso serían tres ramas en tres lugares, o sea tres
// oportunidades de que una se quede atrás.
//
// EL ANCLA ES CUALQUIER DÍA DENTRO DEL PERÍODO, no su primer día. Esa es la simplificación que
// sostiene todo lo demás: «Hoy» es siempre `hoy` en los tres modos, cambiar de modo no obliga a
// recalcular nada por fuera, y saber si se está viendo el período actual es preguntar si `hoy` está
// entre los días mostrados.
//
// EL MES CABE: el backend acepta hasta 62 días por consulta, y la rejilla ya desplaza a lo ancho
// con la columna de la persona fija (`sticky left-0`), así que 31 columnas se recorren sin perder
// de vista de quién es cada fila.

// QUINCENA entró el 28 de septiembre de 2026: la maqueta la tenía y la vista no. Agregar un modo a
// esta unión hace fallar a compilar `etiquetaDelPeriodo` por su `never`, y eso es a propósito: obliga
// a venir a escribir el caso nuevo en vez de heredar en silencio el comportamiento de otro modo.
export type ModoDeVista = 'DIA' | 'SEMANA' | 'QUINCENA' | 'MES';

export type Vista = {
  desde: string;  // primer día mostrado
  hasta: string;  // último día mostrado, INCLUSIVE: es lo que espera `GET /turnos/calendario`
  dias: string[]; // las columnas de la rejilla, en orden
  rotulo: string; // lo que dice el encabezado
};

const primeroDelMes = (iso: string): string => `${iso.slice(0, 7)}-01`;

// Los días del mes al que pertenece esa fecha, caminando con `sumarDias` hasta que cambia el mes.
//
// Se camina en vez de calcular cuántos días tiene el mes: así no hay una segunda tabla de 30/31 ni
// una regla de bisiestos propia, que son dos cosas que se escriben mal una vez cada cuatro años.
function diasDelMes(primero: string): string[] {
  const dias: string[] = [];
  let d = primero;
  while (d.slice(0, 7) === primero.slice(0, 7)) {
    dias.push(d);
    d = sumarDias(d, 1);
  }
  return dias;
}

// LAS COLUMNAS DE LA VISTA DE MES: SEMANAS COMPLETAS (28 de septiembre de 2026).
//
// Del lunes anterior al día 1 al domingo posterior al último. NO es estético, y esta es la razón:
// pintar un día REESCRIBE SU SEMANA ENTERA, porque el descanso obligatorio se decide por semana. Si
// el mes se cortara a mitad de semana, una sola escritura tocaría días que no están en pantalla y
// quien planifica no vería lo que acaba de cambiar.
//
// VIVE APARTE DE `diasDelMes` Y NO LA REEMPLAZA, que es lo importante: `moverVista` usa aquella para
// saltar de mes, y si le cambiara el significado el salto se calcularía desde un domingo que ya es
// del mes siguiente. Los meses empezarían a repetirse o a saltarse SIN QUE NADA SE QUEJE. Dos
// significados, dos funciones.
//
// El peor mes son 42 columnas (marzo de 2026, que empieza en domingo y acaba en martes) y el tope
// del backend son 62 días, así que cabe con margen. Está medido, no supuesto, y hay una prueba que
// lo afirma.
function columnasDelMes(primero: string): string[] {
  const delMes = diasDelMes(primero);
  const desde = lunesDeLaSemana(primero);
  // El domingo de la semana del último día es su lunes más seis. Así no hace falta una segunda regla
  // de «qué día de la semana es» que pudiera separarse de `lunesDeLaSemana`.
  const hasta = sumarDias(lunesDeLaSemana(delMes[delMes.length - 1]), 6);

  const columnas: string[] = [];
  // Se comparan cadenas ISO, que ordenan igual que las fechas. Sin `new Date` de por medio no hay
  // zona horaria que pueda correr un día (CLAUDE.md §7).
  for (let d = desde; d <= hasta; d = sumarDias(d, 1)) columnas.push(d);
  return columnas;
}

export function vistaDelCalendario(modo: ModoDeVista, ancla: string): Vista {
  if (modo === 'DIA') {
    return { desde: ancla, hasta: ancla, dias: [ancla], rotulo: rotuloDeDia(ancla) };
  }

  if (modo === 'SEMANA') {
    const lunes = lunesDeLaSemana(ancla);
    const dias = diasDeLaSemana(lunes);
    return { desde: lunes, hasta: dias[6], dias, rotulo: rotuloDeSemana(lunes) };
  }

  // LA QUINCENA SON DOS SEMANAS COMPLETAS DESDE EL LUNES, y no del 1 al 15.
  //
  // Cada empresa planifica en su propio período, pero la unidad que LIQUIDA no cambia: el tope de 42
  // horas y el descanso obligatorio son SEMANALES. Del 1 al 15 parte dos semanas por la mitad, y
  // entonces pintar un día reescribe la semana entera de esa persona tocando días que no están en
  // pantalla. Es el mismo defecto que ya obligó a dibujar el mes con semanas completas.
  if (modo === 'QUINCENA') {
    const lunes = lunesDeLaSemana(ancla);
    const dias = Array.from({ length: 14 }, (_, i) => sumarDias(lunes, i));
    return { desde: lunes, hasta: dias[13], dias, rotulo: rotuloDeRango(lunes, dias[13]) };
  }

  if (modo === 'MES') {
    const primero = primeroDelMes(ancla);
    // Semanas completas: `desde` ya no es el día 1 sino el lunes anterior, y `hasta` el domingo
    // posterior al último. El rótulo sigue nombrando EL MES, que es lo que se está programando.
    const dias = columnasDelMes(primero);
    return { desde: dias[0], hasta: dias[dias.length - 1], dias, rotulo: rotuloDeMes(primero) };
  }

  // Un caso por valor y nada de `else` (CLAUDE.md §9.4). El tipo no deja llegar hasta aquí; esto
  // está para que agregar un cuarto modo obligue a venir a escribirlo, en vez de heredar en
  // silencio el comportamiento del mes.
  throw new Error(`Modo de vista desconocido: ${modo}`);
}

// La nueva ancla al tocar una flecha. Devuelve un día CUALQUIERA del período vecino, porque
// `vistaDelCalendario` ya normaliza.
export function moverVista(modo: ModoDeVista, ancla: string, pasos: number): string {
  if (modo === 'DIA') return sumarDias(ancla, pasos);

  if (modo === 'SEMANA') return sumarDias(ancla, 7 * pasos);

  // Catorce días de golpe. No hace falta ir al lunes primero: `vistaDelCalendario` ya lo hace con el
  // ancla que reciba, así que el resultado cae siempre dentro de la quincena siguiente.
  if (modo === 'QUINCENA') return sumarDias(ancla, 14 * pasos);

  if (modo === 'MES') {
    // Ni sumar 31 días ni conservar el día del mes: las dos formas se saltan febrero entero
    // saliendo del 31 de enero. Se va al primero del mes y se salta por el borde.
    let d = primeroDelMes(ancla);
    for (let i = 0; i < Math.abs(pasos); i++) {
      const delMes = diasDelMes(d);
      const vecino = pasos > 0 ? sumarDias(delMes[delMes.length - 1], 1) : sumarDias(d, -1);
      d = primeroDelMes(vecino);
    }
    return d;
  }

  throw new Error(`Modo de vista desconocido: ${modo}`);
}
