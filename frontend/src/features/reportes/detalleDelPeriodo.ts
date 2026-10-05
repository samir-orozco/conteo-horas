import { TZ } from '../../lib/fechas';

// Lo que muestra el modal de «Detalles» del reporte de nómina (15 de septiembre de 2026): día por día,
// a qué hora entró y salió cada persona en el período, y qué novedad tenía ese día.
//
// Por qué no se reusa el `detalleRegistros` que ya devuelve el motor: ese solo trae los días que
// generaron recargo o extra, así que una jornada normal de lunes no aparecería. Aquí hace falta el
// período completo, que es lo que la persona espera ver cuando abre el ojo de una fila.
//
// El día se saca SIEMPRE en hora de Bogotá. Un turno guardado a medianoche de Bogotá son las 05:00
// UTC: comparar el instante crudo corre los días para cualquiera al occidente de Colombia.

export type RegistroDelPeriodo = {
  id: string;
  fecha: string;
  entrada: string | null;
  salida: string | null;
};

export type NovedadDelPeriodo = {
  id: string;
  tipo: string;
  fechaInicio: string;
  fechaFin: string;
  aprobado: boolean;
  remunerado: boolean;
  descripcion: string | null;
};

export type DiaDelPeriodo = {
  dia: string;
  entrada: string | null;
  salida: string | null;
  sinSalida: boolean;
  // Cuántas JORNADAS tuvo ese día, no cuántas veces marcó: `GET /registros` ya junta los tramos de
  // un día partido por el almuerzo o por un descanso, y devuelve una fila por jornada. Medido contra
  // la base local el 15 de septiembre de 2026: un día con tres marcaciones llega como una sola fila.
  jornadas: number;
  novedades: NovedadDelPeriodo[];
};

// "2026-09-10": el día de calendario en Bogotá. `en-CA` da el formato ISO sin armarlo a mano.
//
// Se exporta desde el 5 de octubre de 2026: el modal necesita el día de una novedad para pintar su
// rango, y una segunda copia de esta conversión en la pantalla se separaría de esta (§9.3).
export const diaEnBogota = (iso: string) => new Date(iso).toLocaleDateString('en-CA', { timeZone: TZ });
const claveDia = diaEnBogota;

// "08:05". `h23` para que la medianoche sea 00:00 y no 24:00.
const horaDeBogota = (iso: string) =>
  new Date(iso).toLocaleTimeString('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });

export function diasDelPeriodo(
  registros: RegistroDelPeriodo[],
  novedades: NovedadDelPeriodo[],
  desde: string,
  hasta: string,
): DiaDelPeriodo[] {
  // El rango de cada novedad, ya en días de Bogotá: se calcula una vez y no por cada día.
  const rangos = novedades
    .filter(n => n.aprobado)
    .map(n => ({ novedad: n, ini: claveDia(n.fechaInicio), fin: claveDia(n.fechaFin) }));

  const porDia = new Map<string, RegistroDelPeriodo[]>();
  for (const reg of registros) {
    const dia = claveDia(reg.fecha);
    if (dia < desde || dia > hasta) continue;
    const suyos = porDia.get(dia);
    if (suyos) suyos.push(reg);
    else porDia.set(dia, [reg]);
  }

  return [...porDia.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([dia, suyos]) => {
      const entradas = suyos.map(r => r.entrada).filter((h): h is string => !!h).map(horaDeBogota).sort();
      const salidas = suyos.map(r => r.salida).filter((h): h is string => !!h).map(horaDeBogota).sort();
      return {
        dia,
        entrada: entradas[0] ?? null,
        salida: salidas[salidas.length - 1] ?? null,
        sinSalida: suyos.some(r => r.entrada && !r.salida),
        jornadas: suyos.length,
        novedades: rangos.filter(r => r.ini <= dia && dia <= r.fin).map(r => r.novedad),
      };
    });
}

// LAS NOVEDADES PENDIENTES DE APROBAR QUE TOCAN EL PERÍODO (5 de octubre de 2026).
//
// El modal pide TODAS las novedades de la persona —la ruta no acepta rango— y
// hasta ahora solo usaba las aprobadas, para pintar el día. Una pendiente no se
// veía en ninguna parte del reporte, así que no había desde dónde aprobarla
// (petición 23 del dueño).
//
// SE MIRA EL CRUCE CON EL PERÍODO, no que quepa dentro: una incapacidad del 28
// de agosto al 3 de septiembre hay que decidirla igual cuando se está mirando
// septiembre. Y los días se comparan en Bogotá, como todo lo de este archivo:
// una novedad de un solo día guardada a medianoche de Bogotá son las 05:00 UTC,
// y comparada cruda se cae del período por cinco horas.
export function pendientesDelPeriodo(
  novedades: NovedadDelPeriodo[],
  desde: string,
  hasta: string,
): NovedadDelPeriodo[] {
  return novedades
    .filter(n => !n.aprobado)
    .filter(n => claveDia(n.fechaInicio) <= hasta && claveDia(n.fechaFin) >= desde)
    // De la más antigua a la más reciente: el orden en que llegan es el de la
    // ruta, y una lista que baila entre dos aperturas se lee mal.
    .sort((a, b) => claveDia(a.fechaInicio).localeCompare(claveDia(b.fechaInicio)));
}
