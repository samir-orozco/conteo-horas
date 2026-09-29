// A QUIÉN SE VE EN LA REJILLA (28 de septiembre de 2026).
//
// La maqueta tiene buscador, filtro de sede y filtro de cargo; la vista no tenía ninguno. Con doce
// personas se vive sin ellos; con ciento cincuenta, programarle a una obliga a recorrer la lista
// entera.
//
// POR QUÉ ES PURO Y NO UN `filter` DENTRO DEL JSX: de esta lista sale QUÉ SE PUEDE SELECCIONAR, y por
// lo tanto a quién se le escribe al aplicar un bloque. Una persona que se cuele en la lista filtrada
// recibe jornadas que nadie quiso ponerle.

export type PersonaParaFiltrar = {
  id: string;
  nombre: string;
  apellido: string;
  // Hay gente sin cargo puesto, y por eso es anulable: no es «todavía sin cargar».
  cargo: string | null;
  // EN PLURAL. `ColaboradorSede` es una tabla puente: un supervisor puede recorrer varias.
  sedes: { id: string; nombre: string }[];
};

export type FiltrosDeLaRejilla = {
  texto: string;
  cargo: string;
  sedeId: string;
};

// Sin tildes y en minúscula, para comparar lo que una persona escribe con lo que hay guardado.
//
// LAS DOS DIRECCIONES IMPORTAN: nadie escribe «Julián» con tilde en un buscador, y quien sí la escriba
// tampoco puede quedarse sin resultados. Sin esto, media lista de nombres colombianos no se encuentra.
function sinTildes(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

// GENÉRICA EN LA PERSONA para que quien llame no pierda el tipo por el camino: la pantalla le pasa
// filas del calendario, que traen muchísimo más que estos cinco campos, y tiene que recuperarlas
// enteras. Con un tipo fijo haría falta un `as` en el llamador, y un `as` es una promesa sin comprobar.
export function quienSeVe<T extends PersonaParaFiltrar>(
  personas: readonly T[],
  { texto, cargo, sedeId }: FiltrosDeLaRejilla,
): T[] {
  const busca = sinTildes(texto.trim());

  return personas.filter(persona => {
    if (cargo && persona.cargo !== cargo) return false;

    // «TIENE ESTA SEDE ENTRE LAS SUYAS», y no «su sede es esta». La maqueta compara contra una sola
    // porque allí cada persona tiene una; aquí, un supervisor asignado a dos desaparecería del filtro
    // de una de ellas estando asignado a las dos.
    if (sedeId && !persona.sedes.some(sede => sede.id === sedeId)) return false;

    // El cargo entra en la búsqueda, como en la maqueta: es lo que permite escribir «super» y ver a
    // los supervisores sin abrir el otro filtro. `?? ''` y no el cargo a secas, o un `null` se
    // convertiría en el texto «null» y «ul» encontraría a todo el que no tiene cargo.
    if (busca) {
      const dondeBuscar = sinTildes(`${persona.nombre} ${persona.apellido} ${persona.cargo ?? ''}`);
      if (!dondeBuscar.includes(busca)) return false;
    }

    return true;
  });
}
