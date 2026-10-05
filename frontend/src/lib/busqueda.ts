import { sinTildes } from './texto';

// EL CRITERIO DE UN BUSCADOR DE PERSONAS, UNA SOLA VEZ (4 de octubre de 2026).
//
// Lo usan Colaboradores y Revisión de marcaciones. Va aquí y no dentro de una
// de las dos pantallas porque dos buscadores que con lo mismo escrito
// encuentran cosas distintas son dos productos (CLAUDE.md §9.3).
//
// Las tildes y las mayúsculas las resuelve `sinTildes`, que existe justo para
// esto: nadie escribe «Julián» con tilde en un buscador, y quien sí la escriba
// tampoco puede quedarse sin resultados.

const limpiar = (s: string) => sinTildes(s).replace(/\s+/g, ' ').trim();

// Una cédula se escribe con puntos la mitad de las veces —se copia y se pega de
// otro lado— y se guarda sin ellos. Solo se aplica a lo que es puro número:
// quitarle los puntos a una palabra cualquiera encontraría cosas por motivos
// que nadie puede explicar.
const esNumero = (s: string) => /^[\d.]+$/.test(s);

export function coincideBusqueda(consulta: string, campos: Array<string | null | undefined>): boolean {
  const q = limpiar(consulta);
  // Sin nada escrito el buscador no opina: filtrar aquí dejaría la lista vacía
  // al abrir la pantalla.
  if (!q) return true;

  const heno = limpiar(campos.filter(Boolean).join(' '));
  if (!heno) return false;
  const henoSinPuntos = heno.replace(/\./g, '');

  // TODAS las palabras tienen que estar, en cualquier campo y en cualquier
  // orden: así «ana gomez» encuentra a Ana María Gómez aunque el nombre y el
  // apellido sean dos campos distintos, y escribir más acota en vez de ampliar.
  return q.split(' ').every(palabra =>
    heno.includes(palabra)
    || (esNumero(palabra) && henoSinPuntos.includes(palabra.replace(/\./g, ''))));
}
