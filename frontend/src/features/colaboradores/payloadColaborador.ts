// Lo que se le manda al servidor al crear o editar un colaborador.
//
// Vive aparte del formulario porque tiene una decisión que no se ve y que puede
// perder datos en silencio: cuándo viaja la foto.
//
// La LISTA no devuelve la foto grande a propósito (son cientos de kilobytes por
// persona en cada carga), así que al editar desde ahí lo que hay en el
// formulario es la MINIATURA de 64 píxeles. Mandarla siempre le degradaría la
// foto a quien solo vino a corregir el cargo, y un null se la borraría. Por eso
// solo viaja cuando de verdad se tocó en esta edición.

export type FormColaborador = Record<string, unknown> & {
  horarioId?: unknown;
  fechaNacimiento?: unknown;
  sedeIds?: unknown;
  foto?: unknown;
  fotoMini?: unknown;
};

export function payloadColaborador(form: FormColaborador, fotoTocada: boolean): Record<string, unknown> {
  const { foto, fotoMini, ...resto } = form;

  return {
    ...resto,
    // Prisma rechaza la cadena vacía tanto en la relación como en el campo de fecha.
    horarioId: form.horarioId || null,
    fechaNacimiento: form.fechaNacimiento ? form.fechaNacimiento : null,
    // Siempre un arreglo: un undefined significaría "no cambiar", y entonces
    // quitarle todas las sedes a alguien no haría nada.
    sedeIds: (form.sedeIds as string[]) ?? [],
    ...(fotoTocada ? { foto: foto ?? null, fotoMini: fotoMini ?? null } : {}),
  };
}
