import { claveDia, esPermisoRemunerado } from './saldoTiempo';

// Las novedades de una persona dentro del período del reporte de nómina (15 de septiembre de 2026).
//
// Cuenta DÍAS DE CALENDARIO en Bogotá, no instantes: una novedad que viene de antes del período o que
// sigue después solo aporta los días que caen dentro. Se cuentan días distintos y no novedades, para
// que dos novedades del mismo tipo que se pisan el mismo día no paguen ese día dos veces.
//
// Las de parte del día (una cita médica de 14:00 a 17:00) NO suman un día: van contadas aparte. Un día
// de nómina es un día completo, y mandar media tarde como un día le pagaría de más a la persona.
//
// Si se paga o no lo dice la política de la empresa, la misma que usa el saldo de tiempo.
export type NovedadDeReporte = {
  tipo: string;
  fechaInicio: Date;
  fechaFin: Date;
  horaInicio?: string | null;
  horaFin?: string | null;
};

export type FilaDeNovedad = { tipo: string; remunerado: boolean; dias: number; parciales: number };

const DIA_MS = 24 * 60 * 60 * 1000;

export function novedadesDelPeriodo(
  permisos: NovedadDeReporte[],
  desdeF: Date,
  finExclusivo: Date,
  politica: Set<string>,
): FilaDeNovedad[] {
  // Los días del período, una sola vez. Recorrerlos por fuera acota solo, sin cuentas de fechas.
  const diasDelPeriodo: string[] = [];
  for (let t = desdeF.getTime(); t < finExclusivo.getTime(); t += DIA_MS) diasDelPeriodo.push(claveDia(new Date(t)));

  const diasPorTipo = new Map<string, Set<string>>();
  const parcialesPorTipo = new Map<string, number>();

  for (const permiso of permisos) {
    const ini = claveDia(permiso.fechaInicio);
    const fin = claveDia(permiso.fechaFin);
    const esParcial = !!(permiso.horaInicio && permiso.horaFin);
    for (const clave of diasDelPeriodo) {
      if (clave < ini) continue;
      if (clave > fin) continue;
      if (esParcial) {
        parcialesPorTipo.set(permiso.tipo, (parcialesPorTipo.get(permiso.tipo) ?? 0) + 1);
        break; // una novedad de parte del día es una sola, aunque su rango tocara varios
      }
      if (!diasPorTipo.has(permiso.tipo)) diasPorTipo.set(permiso.tipo, new Set());
      diasPorTipo.get(permiso.tipo)!.add(clave);
    }
  }

  const tipos = new Set([...diasPorTipo.keys(), ...parcialesPorTipo.keys()]);
  return [...tipos]
    .map(tipo => ({
      tipo,
      remunerado: esPermisoRemunerado(tipo, politica),
      dias: diasPorTipo.get(tipo)?.size ?? 0,
      parciales: parcialesPorTipo.get(tipo) ?? 0,
    }))
    .sort((a, b) => a.tipo.localeCompare(b.tipo));
}
