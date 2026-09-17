// Qué le pasa al kiosco de esta empresa (16 de septiembre de 2026).
//
// La pantalla del Marcador mostraba tres tarjetas de texto fijo y un interruptor, así que no
// distinguía una empresa protegida de una expuesta, ni una tablet marcando de una colgada.
//
// El «ahora» entra como parámetro en vez de leerse aquí: una regla que consulta el reloj cambia
// de resultado según el día en que se ejecute, y eso rompió dos pruebas del reporte de nómina
// esta misma semana sin que nadie tocara el código.

// Quién puede abrir el kiosco hoy.
export type Proteccion =
  // Sin dispositivos exigidos: cualquiera con el link marca, desde donde sea.
  | 'EXPUESTO'
  // Se exigen dispositivos y no hay ninguno vinculado: NADIE puede marcar.
  | 'BLOQUEADO'
  | 'PROTEGIDO';

// Cuánta gente puede marcar sin digitar la cédula.
export type Facial = 'SIN_GENTE' | 'NADIE' | 'PARCIAL' | 'TODOS';

export type DatosDelKiosco = {
  soloDispositivos: boolean;
  dispositivos: number;
  activos: number;
  conRostro: number;
  ultimaMarcacion: string | null;
};

export type EstadoDelKiosco = {
  proteccion: Proteccion;
  facial: Facial;
  minutosSinMarcar: number | null;
};

function proteccionDe(d: DatosDelKiosco): Proteccion {
  if (!d.soloDispositivos) return 'EXPUESTO';
  // Encender la protección sin vincular nada deja el kiosco muerto, y es peor que estar
  // expuesto: el dueño se entera por los reclamos de quien no pudo marcar.
  if (d.dispositivos === 0) return 'BLOQUEADO';
  return 'PROTEGIDO';
}

function facialDe(d: DatosDelKiosco): Facial {
  // Sin gente activa no es «nadie registrado»: no hay a quién registrar, y decir «0 de 0» se
  // lee como un problema que no existe.
  if (d.activos === 0) return 'SIN_GENTE';
  if (d.conRostro === 0) return 'NADIE';
  if (d.conRostro >= d.activos) return 'TODOS';
  return 'PARCIAL';
}

export function estadoDelKiosco(d: DatosDelKiosco, ahora: Date): EstadoDelKiosco {
  // Nunca negativo: un reloj adelantado en la tablet deja marcaciones con hora futura, y
  // «hace -3 minutos» no significa nada para quien lo lee.
  const minutosSinMarcar = d.ultimaMarcacion === null
    ? null
    : Math.max(0, Math.round((ahora.getTime() - new Date(d.ultimaMarcacion).getTime()) / 60000));

  return { proteccion: proteccionDe(d), facial: facialDe(d), minutosSinMarcar };
}
