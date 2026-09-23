import { sumarDias, lunesDeLaSemana, diasDeLaSemana, rotuloDeSemana, rotuloDeDia, rotuloDeMes } from './semana';

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

export type ModoDeVista = 'DIA' | 'SEMANA' | 'MES';

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

export function vistaDelCalendario(modo: ModoDeVista, ancla: string): Vista {
  if (modo === 'DIA') {
    return { desde: ancla, hasta: ancla, dias: [ancla], rotulo: rotuloDeDia(ancla) };
  }

  if (modo === 'SEMANA') {
    const lunes = lunesDeLaSemana(ancla);
    const dias = diasDeLaSemana(lunes);
    return { desde: lunes, hasta: dias[6], dias, rotulo: rotuloDeSemana(lunes) };
  }

  if (modo === 'MES') {
    const primero = primeroDelMes(ancla);
    const dias = diasDelMes(primero);
    return { desde: primero, hasta: dias[dias.length - 1], dias, rotulo: rotuloDeMes(primero) };
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
