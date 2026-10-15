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
    // Los casos de clima abiertos (15 de octubre de 2026). Solo llega al administrador con la función.
    casosClima?: number;
  };
  // null: la empresa ya pasó su primer mes o completó los pasos. Sin el campo: un servidor anterior. La
  // clave es un texto y no la lista cerrada porque un servidor más nuevo podría mandar un paso más.
  primerosPasos?: { clave: string; hecho: boolean }[] | null;
  // La asistencia de lunes a domingo y las llegadas tarde de los últimos 7 días (15 de octubre de 2026).
  // Las fechas son medianoches de Bogotá (05:00Z), nunca un 'YYYY-MM-DD' suelto: el navegador lo leería
  // a medianoche UTC y pintaría el día anterior. Opcionales, por la ventana de despliegue.
  asistenciaSemana?: {
    dias: { clave: string; fecha: string; esHoy: boolean; futuro: boolean; festivo: boolean; debian: number; llegaron: number;
      llegaronSinTurno: number; conNovedad: number; enTiempo: number; conTurno: number }[];
  };
  llegadasTarde7d?: {
    dias: { clave: string; fecha: string; esHoy: boolean; festivo: boolean; debian: number; totalMinutos: number;
      personas: { id: string; horaEsperada: string; horaLlegada: string; minutosTarde: number }[] }[];
    personas: Record<string, { nombre: string; fotoMini: string | null }>;
  };
  // El clima de los últimos 7 días (15 de octubre de 2026). null: no es el administrador. Sin el campo: un
  // servidor anterior. Nunca trae nombres: son las cifras de la vista sin el plan (backend: utils/climaDelInicio.ts).
  clima?: ClimaDelInicio | null;
};

export type VistazoDelClima = { total: number; personas: number; promedio: number | null; variacion: number | null; jornadas: number; atencion: number };
export type PruebaDelClima = { disponible: boolean; vigente: { hasta: string } | null; terminada: { hasta: string } | null; dias: number };
export type ClimaDelInicio =
  | { estado: 'SIN_PLAN'; desde: string; hasta: string; vistazo: VistazoDelClima; prueba: PruebaDelClima }
  | { estado: 'ACTIVO'; desde: string; hasta: string; vistazo: VistazoDelClima; distribucion: Record<1 | 2 | 3 | 4 | 5, number>;
      prueba: PruebaDelClima; casosAbiertos: number };

export type Salida = Dash['salidasRecientes'][number];
export type TurnoOlvidado = Dash['turnosOlvidados'][number];
export type Novedad = Dash['novedadesHoy'][number];
export type Evidencia = { data: string; tipo: string; nombre?: string | null };
