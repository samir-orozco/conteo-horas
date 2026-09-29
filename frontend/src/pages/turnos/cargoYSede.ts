// LA SEGUNDA LÍNEA DE LA COLUMNA DE LA PERSONA: «Guarda · Centro».
//
// Pedido del dueño el 28 de septiembre de 2026, copiando la maqueta. En una rejilla de doce personas,
// saber de qué sede es cada una es lo que evita programarle a alguien un turno donde no va.
//
// ES UNA FUNCIÓN Y NO UN `? :` porque los dos datos faltan por separado: son cuatro casos, que es el
// conjunto abierto del que advierte el §9.4. Escrito como ternario, lo que sale en cuanto uno viene
// vacío es « · Centro» o «Guarda · ». El bloque de la prueba tiene el resto del razonamiento.

type ParaLaLinea = {
  cargo: string | null;
  // Opcional a propósito: el campo se agregó a la ruta esta misma tarde, y un navegador con la
  // respuesta anterior en caché lo trae sin él. Ya dejó la pantalla en blanco una vez hoy.
  sedes?: readonly { id: string; nombre: string }[];
};

export function cargoYSede({ cargo, sedes }: ParaLaLinea): string {
  const suCargo = (cargo ?? '').trim();
  const susSedes = (sedes ?? []).map(s => s.nombre.trim()).filter(Boolean);

  // VARIAS SEDES SE CUENTAN Y NO SE LISTAN. Con la modalidad híbrida una persona puede estar en dos o
  // tres, cosa que la maqueta no contempla. «Centro, Norte, Sur» no cabe en los 180 px de la columna
  // y saldría recortado a «Centro, No…», que dice menos que el número.
  const laSede = susSedes.length === 1 ? susSedes[0]
    : susSedes.length > 1 ? `${susSedes.length} sedes`
      : '';

  // La raya cuando no hay ninguno de los dos: una línea vacía descuadra la fila respecto a las demás
  // y además no se distingue de un dato que no cargó.
  return [suCargo, laSede].filter(Boolean).join(' · ') || '—';
}
