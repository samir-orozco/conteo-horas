// «LUIS, YA REGISTRASTE TU JORNADA» (4 de octubre de 2026, decisión del dueño).
//
// El kiosco pregunta antes de abrir una entrada nueva a quien ya cerró su turno: evita el turno de
// más de quien cree que no le quedó la salida. Esta regla decide qué turno cuenta.
//
// El de hoy, como siempre, cuenta todo el día. Y uno de antes —el de un turno nocturno, guardado en
// el día en que entró— cuenta si se cerró hace menos de cuatro horas. No todo el día: Luis cierra a
// las 6:00 a. m., y a las 7:00 p. m. llega a su turno siguiente; si contara todo el día, el kiosco
// le preguntaría cada noche. Quien vuelve a comprobar que le quedó la salida lo hace en minutos.
export const HORAS_PARA_PREGUNTAR_NOCTURNO = 4;

type Cerrado = { entrada: Date | null; salida: Date | null };

export function jornadaYaRegistrada({ ahora, cerradoDeHoy, ultimoCerrado, pausaEnCurso }: {
  ahora: Date;
  // El último turno cerrado guardado HOY.
  cerradoDeHoy: Cerrado | null;
  // El último turno cerrado, sea del día que sea.
  ultimoCerrado: Cerrado | null;
  // La persona salió a una pausa y el kiosco espera su regreso: su jornada no está cerrada.
  pausaEnCurso: boolean;
}): Cerrado | null {
  if (cerradoDeHoy) return cerradoDeHoy;
  // Sin hora de entrada, el aviso no tendría qué decir.
  if (pausaEnCurso || !ultimoCerrado?.salida || !ultimoCerrado.entrada) return null;
  const hace = ahora.getTime() - ultimoCerrado.salida.getTime();
  return hace < HORAS_PARA_PREGUNTAR_NOCTURNO * 60 * 60 * 1000 ? ultimoCerrado : null;
}
