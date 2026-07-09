import { Registro, Horario, DiaFestivo, Permiso } from '@prisma/client';
import { toZonedTime } from 'date-fns-tz';

const TZ = 'America/Bogota';
const DIAS = ['DOMINGO', 'LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO'];

export type Tardanza = {
  fecha: string; // YYYY-MM-DD (día calendario Bogotá)
  horaEsperada: string; // "08:00" + tolerancia informada aparte
  horaLlegada: string; // "08:25"
  minutosTarde: number; // ya descontada la tolerancia
};

function minutosDe(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

function claveDia(d: Date): string {
  const z = toZonedTime(d, TZ);
  return `${z.getFullYear()}-${String(z.getMonth() + 1).padStart(2, '0')}-${String(z.getDate()).padStart(2, '0')}`;
}

// Llegadas tarde: primera entrada de cada día vs hora del horario + tolerancia.
// No cuenta festivos, días fuera del horario ni días cubiertos por novedades.
export function calcularTardanzas(
  registros: Registro[],
  horario: Horario,
  festivos: DiaFestivo[],
  permisos: Permiso[]
): { detalle: Tardanza[]; totalMinutos: number; diasTarde: number; toleranciaMin: number } {
  const diasHorario = new Set((horario.dias as string[]) ?? []);
  const esperadoMin = minutosDe(horario.horaEntrada);
  const festSet = new Set(festivos.map(f => claveDia(f.fecha)));

  // Primera entrada por día calendario
  const primeraEntrada = new Map<string, Date>();
  for (const r of registros) {
    if (!r.entrada) continue;
    const clave = claveDia(r.entrada);
    const actual = primeraEntrada.get(clave);
    if (!actual || r.entrada < actual) primeraEntrada.set(clave, r.entrada);
  }

  const detalle: Tardanza[] = [];
  for (const [clave, entrada] of [...primeraEntrada.entries()].sort()) {
    const z = toZonedTime(entrada, TZ);
    if (!diasHorario.has(DIAS[z.getDay()])) continue;
    if (festSet.has(clave)) continue;
    const cubiertoPorNovedad = permisos.some(p => claveDia(p.fechaInicio) <= clave && clave <= claveDia(p.fechaFin));
    if (cubiertoPorNovedad) continue;

    const llegadaMin = z.getHours() * 60 + z.getMinutes();
    const tarde = llegadaMin - (esperadoMin + horario.toleranciaMin);
    if (tarde > 0) {
      detalle.push({
        fecha: clave,
        horaEsperada: horario.horaEntrada,
        horaLlegada: `${String(z.getHours()).padStart(2, '0')}:${String(z.getMinutes()).padStart(2, '0')}`,
        minutosTarde: tarde,
      });
    }
  }

  return {
    detalle,
    totalMinutos: detalle.reduce((s, t) => s + t.minutosTarde, 0),
    diasTarde: detalle.length,
    toleranciaMin: horario.toleranciaMin,
  };
}
