import { diasEntre, lunesDeLaSemana } from './semana';
import type { ModoDeVista } from './vistaDelCalendario';

// DÓNDE ESTÁ PARADO EL CALENDARIO RESPECTO A HOY (28 de septiembre de 2026).
//
// El título dice «Septiembre de 2026» o «28 sep – 4 oct», y eso no responde la pregunta que uno se
// hace al llegar: ¿esto es la semana en curso, o me fui tres semanas adelante con las flechas?
// Programar turnos en el mes equivocado no se ve raro en pantalla: se ve igual que programarlos en el
// correcto, y se descubre cuando alguien no aparece a trabajar.
//
// POR QUÉ ES PURO Y NO UN `? :` EN EL JSX: es aritmética de calendario, la que falla en silencio.

export type EtiquetaDePeriodo = {
  texto: string;
  // Si el período que se está viendo es el de hoy. La pantalla lo resalta con eso; no se deduce del
  // texto, porque deducirlo obligaría a comparar cadenas traducidas.
  esActual: boolean;
};

// El vecino inmediato se dice CON SU NOMBRE y no con un número: «En 1 día» y «Hace 1 semana» son
// correctos y suenan a máquina. De dos en adelante sí se cuenta.
function porDiferencia(
  dif: number, cero: string, siguiente: string, pasado: string, plural: string,
): EtiquetaDePeriodo {
  if (dif === 0) return { texto: cero, esActual: true };
  if (dif === 1) return { texto: siguiente, esActual: false };
  if (dif === -1) return { texto: pasado, esActual: false };
  return { texto: dif > 0 ? `En ${dif} ${plural}` : `Hace ${-dif} ${plural}`, esActual: false };
}

// Meses ABSOLUTOS desde una época cualquiera, para poder restarlos.
//
// Restar el número de mes es el error que hay que evitar: diciembre es 12 y enero es 1, así que la
// resta da -11 y la etiqueta diría «hace 11 meses» del mes que viene. Y el simétrico: comparando solo
// el número, septiembre del año que viene sería «el mes en curso».
function mesesAbsolutos(iso: string): number {
  const [anio, mes] = iso.split('-').map(Number);
  return anio * 12 + (mes - 1);
}

// UN CASO POR MODO, con `default` explícito que revienta en vez de adivinar (CLAUDE.md §9.4).
//
// La maqueta lo decide con `if (VISTA === 'SEMANA') ... else ...`, o sea binario sobre TRES modos: la
// vista de día cae en el `else` y muestra «Semanas completas», que de un día no dice nada.
//
// `hoy` entra por parámetro, igual que en `sePuedePintar`. Leyéndolo del reloj aquí dentro, esto no se
// podría probar y diría una cosa distinta cada día.
export function etiquetaDelPeriodo(modo: ModoDeVista, ancla: string, hoy: string): EtiquetaDePeriodo {
  switch (modo) {
    case 'DIA':
      return porDiferencia(diasEntre(hoy, ancla), 'Hoy', 'Mañana', 'Ayer', 'días');
    case 'SEMANA':
      // SE CUENTA DE LUNES A LUNES, NO DE FECHA A FECHA. Hoy lunes 28 y el ancla el jueves 1 de
      // octubre son la MISMA semana, pero hay cuatro días de diferencia: restando fechas saldría
      // «semana siguiente» estando parado en la semana en curso.
      return porDiferencia(
        diasEntre(lunesDeLaSemana(hoy), lunesDeLaSemana(ancla)) / 7,
        'Semana en curso', 'Semana siguiente', 'Semana pasada', 'semanas',
      );
    // LA QUINCENA NO SE CUENTA EN QUINCENAS, y esto es lo único delicado de este archivo.
    //
    // El rango arranca en el LUNES DEL ANCLA, así que las quincenas de esta vista NO caen en una
    // rejilla fija: dos anclas separadas por una semana producen quincenas que se solapan siete días.
    // «En 2 quincenas» sería inventarse una unidad que no existe, porque no hay una quincena 1, una 2
    // y una 3 sobre las que contar.
    //
    // Lo que sí es cierto siempre: o es la que contiene HOY —la que arranca en el lunes de esta
    // semana— o no lo es, y entonces la distancia honesta va en SEMANAS, que es la unidad en la que de
    // verdad se mueve. `porDiferencia` encaja tal cual: cero semanas ES la quincena en curso.
    case 'QUINCENA':
      return porDiferencia(
        diasEntre(lunesDeLaSemana(hoy), lunesDeLaSemana(ancla)) / 7,
        'Quincena en curso', 'Semana siguiente', 'Semana pasada', 'semanas',
      );

    case 'MES':
      return porDiferencia(
        mesesAbsolutos(ancla) - mesesAbsolutos(hoy),
        'Mes en curso', 'Mes siguiente', 'Mes pasado', 'meses',
      );
    default: {
      // Inalcanzable mientras `ModoDeVista` tenga estos tres valores, y el compilador lo comprueba.
      // El día que se agregue un cuarto —una quincena—, esto revienta en la primera pasada en vez de
      // mostrar el texto de otro período, que es lo que haría un `else`.
      const nunca: never = modo;
      throw new Error(`modo de vista sin etiqueta: ${String(nunca)}`);
    }
  }
}
