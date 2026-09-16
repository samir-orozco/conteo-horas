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
const claveDia = (iso: string) => new Date(iso).toLocaleDateString('en-CA', { timeZone: TZ });

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
