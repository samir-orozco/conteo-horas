// Reglas de la historia de vinculación de un colaborador.
//
// La línea de tiempo se ordena por la fecha en que las cosas PASARON, no por
// cuándo se registraron, porque para un certificado laboral o una liquidación
// lo que importa es la fecha real. Eso abre la puerta a fechar hacia atrás, y
// ahí aparece el estado imposible: registrar un retiro con fecha anterior al
// último reingreso deja una historia que dice que la persona salió antes de
// haber vuelto.

export type EventoVinculacion = {
  tipo: 'INGRESO' | 'RETIRO' | 'REINGRESO';
  fecha: Date;
};

// Desde cuándo corre el vínculo ACTUAL: el último ingreso o reingreso.
// Los retiros no cuentan, porque no abren un vínculo, lo cierran.
export function fechaMinimaDeRetiro(eventos: EventoVinculacion[]): Date | null {
  const aperturas = eventos
    .filter(e => e.tipo === 'INGRESO' || e.tipo === 'REINGRESO')
    .map(e => e.fecha.getTime());
  return aperturas.length ? new Date(Math.max(...aperturas)) : null;
}

// El mismo día del ingreso sí vale: se puede entrar y salir el mismo día, y
// pasa de verdad con contratos de un día o con quien no se presentó.
export function retiroEsCoherente(fecha: Date, eventos: EventoVinculacion[]): boolean {
  const minima = fechaMinimaDeRetiro(eventos);
  return minima === null || fecha.getTime() >= minima.getTime();
}
