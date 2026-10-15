import { vistazoDelClima, type VistazoDelClima } from './climaSinPlan';

// El clima en el Inicio (15 de octubre de 2026). Decisiones del dueño: solo lo ve el ADMINISTRADOR (igual que el
// panel); con la función, el clima de los últimos 7 días y los casos abiertos; sin ella, las MISMAS cifras sin
// nombres que la vista sin el plan de la página del clima (utils/climaSinPlan.ts), con la invitación a probarlo.
// Lo que sale es una lista blanca, como la de la vista sin el plan: el resumen del panel trae nombres y
// observaciones, y nada de eso puede llegar al Inicio.

type Prueba = { disponible: boolean; vigente: { hasta: Date } | null; terminada: { hasta: Date } | null; dias: number };
type Distribucion = Record<1 | 2 | 3 | 4 | 5, number>;

export type ClimaDelInicio =
  | null
  | { estado: 'SIN_PLAN'; desde: string; hasta: string; vistazo: VistazoDelClima; prueba: Prueba }
  | { estado: 'ACTIVO'; desde: string; hasta: string; vistazo: VistazoDelClima; distribucion: Distribucion; prueba: Prueba; casosAbiertos: number };

export function climaParaElInicio(e: {
  esAdministrador: boolean;
  tieneClima: boolean;
  desde: string;
  hasta: string;
  // El resumen del panel (utils/lecturasDelClima.ts), leído SIN abrir casos.
  resumen: {
    total: number; personas: number; promedio: number | null; variacion: number | null; jornadas: number;
    distribucion: Distribucion; atencion: { seguimiento: { estado: string } | null }[];
  };
  prueba: Prueba;
  // Los casos SIN_REVISAR y EN_SEGUIMIENTO que ya están en la base.
  casosAbiertosEnLaBase: number;
}): ClimaDelInicio {
  if (!e.esAdministrador) return null;
  const vistazo = vistazoDelClima(e.resumen);
  if (!e.tieneClima) return { estado: 'SIN_PLAN', desde: e.desde, hasta: e.hasta, vistazo, prueba: e.prueba };
  // El Inicio no abre casos (un GET que se carga a cada rato no escribe): cuenta como abiertos también los de
  // quienes entraron a «necesita atención» y todavía no tienen caso. Sin caso es exactamente lo que
  // `casosPorAbrir` abriría: ni uno de esta racha, ni otro abierto (el resumen trae uno u otro en `seguimiento`).
  const porAbrir = e.resumen.atencion.filter(a => a.seguimiento === null).length;
  return {
    estado: 'ACTIVO', desde: e.desde, hasta: e.hasta, vistazo,
    distribucion: { ...e.resumen.distribucion }, prueba: e.prueba, casosAbiertos: e.casosAbiertosEnLaBase + porAbrir,
  };
}
