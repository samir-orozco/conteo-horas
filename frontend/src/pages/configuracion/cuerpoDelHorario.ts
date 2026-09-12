import type { Ventana } from '../../lib/descansos';

// Una franja del horario como la edita la pantalla.
export type Franja = {
  dias: string[]; horaEntrada: string; horaSalida: string;
  tieneAlmuerzo?: boolean; almuerzoInicio?: string | null; almuerzoFin?: string | null;
  // Descansos no remunerados: hasta tres por franja, cada uno con su desde y su hasta
  // (12 de septiembre de 2026). Antes era uno solo, con `descansoInicio` y `descansoFin`.
  descansos?: Ventana[];
};

export type FormularioDeHorario = {
  nombre: string; toleranciaMin: number; almuerzoMin: number; toleranciaSalidaMin: number;
  ajustaEntrada: boolean; fotoEnDescanso: boolean; franjas: Franja[];
};

// El cuerpo que se manda al guardar un horario (12 de septiembre de 2026).
//
// Cada franja lleva SIEMPRE la clave `descansos`, también vacía. El servidor reemplaza
// las franjas enteras, y un cuerpo en el que ninguna franja la trae es el de la pantalla
// de antes de los descansos: si lo guardado tiene descansos, responde «recarga»
// (FORMATO_VIEJO) para no borrarlos. Sin la clave, esta pantalla quedaría bloqueada por
// esa guarda en cuanto alguien configure un descanso.
//
// Las filas vacías viajan como están: el servidor las ignora, y numera sus avisos
// («descanso 2: ...») contando la fila que ve el administrador. Quitarlas aquí correría
// ese número.
export function cuerpoDelHorario(h: FormularioDeHorario) {
  return {
    nombre: h.nombre,
    toleranciaMin: h.toleranciaMin,
    almuerzoMin: h.almuerzoMin,
    toleranciaSalidaMin: h.toleranciaSalidaMin,
    ajustaEntrada: h.ajustaEntrada,
    fotoEnDescanso: h.fotoEnDescanso,
    franjas: h.franjas.map(f => ({
      dias: f.dias,
      horaEntrada: f.horaEntrada,
      horaSalida: f.horaSalida,
      tieneAlmuerzo: f.tieneAlmuerzo,
      almuerzoInicio: f.almuerzoInicio,
      almuerzoFin: f.almuerzoFin,
      descansos: (f.descansos ?? []).map(d => ({ inicio: d.inicio, fin: d.fin })),
    })),
  };
}
