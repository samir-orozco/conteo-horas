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
  atencion: {
    colaboradorId: string; nombre: string; cargo: string | null; sedes: string[]; dias: number; desde: string; motivo: string | null;
    seguimiento?: { id: string; estado: EstadoDeSeguimiento } | null;
  }[];
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

export type EstadoDeSeguimiento = 'SIN_REVISAR' | 'EN_SEGUIMIENTO' | 'CERRADO';
export type Responsable = { id: string; nombre: string };
export type ComentarioDeSeguimiento = { id: string; autorNombre: string; texto: string; creadoEn: string; editadoEn: string | null };
export type CasoDeSeguimiento = {
  id: string; estado: EstadoDeSeguimiento; responsableId: string | null;
  desde: string; abiertoEn: string; cerradoEn: string | null;
  comentarios: ComentarioDeSeguimiento[];
};

// El historial de una persona, para «Revisar» (GET /clima/persona/:id), con su caso de seguimiento.
export type HistorialPersona = {
  nombre: string;
  cargo: string | null;
  sedes: string[];
  respuestas: { fecha: string; carita: number; motivos: string[]; observacion: string | null }[];
  seguimiento?: CasoDeSeguimiento | null;
  responsables?: Responsable[];
};

// La pestaña «Seguimiento» (GET /clima/seguimientos).
export type FilaDeSeguimiento = {
  id: string; colaboradorId: string; nombre: string; cargo: string | null; sedes: string[];
  estado: EstadoDeSeguimiento; responsableId: string | null; responsable: string | null;
  desde: string; abiertoEn: string; cerradoEn: string | null;
  racha: number | null; comentarios: number;
  ultimoComentario: { texto: string; autorNombre: string; creadoEn: string } | null;
};
export type SeguimientosClima = { responsables: Responsable[]; casos: FilaDeSeguimiento[] };
