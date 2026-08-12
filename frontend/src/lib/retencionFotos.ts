// Retención de las fotos de verificación facial.
//
// El backend las borra solas a los 2 meses (`limpiarFotosAntiguas` en index.ts).
// Cuando eso pasa el registro queda con las fotos en `null`, que es EXACTAMENTE
// lo mismo que se ve cuando la persona marcó con cédula y nunca hubo foto. El
// dato no distingue los dos casos, así que se distinguen por la edad del
// registro: si ya pasó la retención, la ausencia se explica por el borrado.
//
// Para quien audita la diferencia importa: "marcó con cédula" es una decisión
// del trabajador; "ya se borró" es una política del sistema.

export const MESES_RETENCION_FOTOS = 2;

export function fotosExpiradas(fechaRegistro: string, ahora: Date = new Date()): boolean {
  const corte = new Date(ahora);
  corte.setMonth(corte.getMonth() - MESES_RETENCION_FOTOS);
  return new Date(fechaRegistro) < corte;
}
