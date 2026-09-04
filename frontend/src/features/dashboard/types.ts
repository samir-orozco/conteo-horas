// Forma de la respuesta de GET /dashboard/empresa (backend: routes/dashboard.ts).
export type Dash = {
  fecha: string;
  hoyEsFestivo: boolean;
  totales: { colaboradoresActivos: number; enPlanta: number; horasSemana: number; horasExtraMes: number };
  enPlanta: { id: string; nombre: string; cargo: string | null; desde: string }[];
  // Salió a almorzar y todavía no vuelve. Antes esta gente aparecía en
  // `salidasRecientes`, en rojo, como quien terminó su jornada y se fue.
  //
  // Opcional a propósito: durante un despliegue hay una ventana en la que el
  // navegador ya tiene este bundle y el servidor todavía responde el anterior,
  // que no manda el campo. Que falte un dato no puede tumbar el tablero.
  enDescanso?: { id: string; nombre: string; cargo: string | null; desde: string }[];
  salidasRecientes: { registroId: string; id: string; nombre: string; cargo: string | null; entrada: string | null; salida: string; tieneFotoSalida: boolean }[];
  llegadasTardeHoy: { id: string; nombre: string; horaLlegada: string; minutosTarde: number }[];
  sinMarcarHoy: { id: string; nombre: string; cargo: string | null; horario: string; horaEntrada: string; novedad: string | null }[];
  turnosOlvidados: { id: string; colaborador: string; entrada: string }[];
  novedadesHoy: { id: string; colaboradorId: string; colaborador: string; tipo: string; descripcion: string | null; aprobado: boolean; fechaInicio: string; fechaFin: string; evidenciaTipo: string | null; evidenciaNombre: string | null }[];
  proximosFestivos: { nombre: string; fecha: string; propio: boolean }[];
  cumpleanos: { id: string; nombre: string; cargo: string | null; dia: number; mes: number; esHoy: boolean }[];
};

export type Salida = Dash['salidasRecientes'][number];
export type TurnoOlvidado = Dash['turnosOlvidados'][number];
export type Novedad = Dash['novedadesHoy'][number];
export type Evidencia = { data: string; tipo: string; nombre?: string | null };
