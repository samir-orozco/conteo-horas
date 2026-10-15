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
  // `pausa` dice a cuál salió. Opcional: un backend anterior no lo manda, y
  // entonces es el almuerzo, que era la única pausa.
  enDescanso?: { id: string; nombre: string; cargo: string | null; desde: string; pausa?: 'ALMUERZO' | 'DESCANSO' }[];
  salidasRecientes: { registroId: string; id: string; nombre: string; cargo: string | null; entrada: string | null; salida: string; tieneFotoSalida: boolean }[];
  llegadasTardeHoy: { id: string; nombre: string; horaLlegada: string; minutosTarde: number }[];
  sinMarcarHoy: { id: string; nombre: string; cargo: string | null; horario: string; horaEntrada: string; novedad: string | null }[];
  turnosOlvidados: { id: string; colaborador: string; entrada: string }[];
  novedadesHoy: { id: string; colaboradorId: string; colaborador: string; tipo: string; descripcion: string | null; aprobado: boolean; fechaInicio: string; fechaFin: string; evidenciaTipo: string | null; evidenciaNombre: string | null }[];
  proximosFestivos: { nombre: string; fecha: string; propio: boolean }[];
  cumpleanos: { id: string; nombre: string; cargo: string | null; dia: number; mes: number; esHoy: boolean }[];
  // Lo que espera a que alguien haga algo (14 de octubre de 2026). Los turnos sin cerrar van aparte, en
  // `turnosOlvidados`, que existe desde antes. Opcional por la misma ventana de despliegue de `enDescanso`.
  pendientes?: {
    novedades: { id: string; colaboradorId: string; colaborador: string; tipo: string; fechaInicio: string; fechaFin: string }[];
    contratos: { colaboradorId: string; colaborador: string; estado: 'POR_VENCER' | 'PREAVISO_VENCIDO' | 'VENCIDO'; vence: string; limitePreaviso: string }[];
  };
  // null: la empresa ya pasó su primer mes o completó los pasos. Sin el campo: un servidor anterior. La
  // clave es un texto y no la lista cerrada porque un servidor más nuevo podría mandar un paso más.
  primerosPasos?: { clave: string; hecho: boolean }[] | null;
};

export type Salida = Dash['salidasRecientes'][number];
export type TurnoOlvidado = Dash['turnosOlvidados'][number];
export type Novedad = Dash['novedadesHoy'][number];
export type Evidencia = { data: string; tipo: string; nombre?: string | null };
