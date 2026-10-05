// Lo que devuelve el servidor para el panel del clima laboral (backend/src/routes/clima.ts).

export type ResumenClima = {
  total: number;
  personas: number;
  promedio: number | null;
  variacion: number | null;
  // Jornadas (persona y día) cerradas en el kiosco en el período: contra eso se compara «respondieron».
  jornadas: number;
  // Respuestas en Muy mal o Mal.
  negativas: number;
  distribucion: Record<1 | 2 | 3 | 4 | 5, number>;
  motivos: { motivo: string; veces: number; porcentaje: number }[];
  semanas: { semana: string; promedio: number; total: number }[];
  porSede: { sedeId: string | null; nombre: string; promedio: number; total: number; jornadas: number; participacion: number | null }[];
  atencion: { colaboradorId: string; nombre: string; cargo: string | null; sedes: string[]; dias: number; desde: string; motivo: string | null }[];
  recientes: { colaboradorId: string; nombre: string; fecha: string; carita: number; motivos: string[]; observacion: string | null }[];
};

export type BuzonClima = { semanas: { semana: string; notas: string[] }[] };

export type MotivosClima = {
  motivos: string[];
  otro: string;
  maximo: number;
  predeterminados: string[];
  catalogo: { tema: string; motivos: string[] }[];
};

// El historial de una persona, para «Revisar» (GET /clima/persona/:id).
export type HistorialPersona = {
  nombre: string;
  cargo: string | null;
  sedes: string[];
  respuestas: { fecha: string; carita: number; motivos: string[]; observacion: string | null }[];
};
