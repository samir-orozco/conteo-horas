// A quién se le bloquea el panel para revisar salarios (17 de septiembre de 2026).
//
// La regla parece «a todas las empresas que ya existían», y esa fue la primera versión. Correrla
// contra la base real mostró el hueco: de 10 empresas bloqueadas, 4 no tenían NI UN colaborador
// activo, y el modal les salía con la tabla vacía y nada que corregir.
//
// No es que se les perdone la revisión: es que no existe. Lo que todo esto persigue es una sospecha
// aritmética sobre un salario (básico menos auxilio igual al mínimo), y sin salarios no hay
// aritmética posible.
//
// La marca manda por encima del conteo: quien ya revisó no vuelve a ver el aviso aunque se quede
// sin gente y después vuelva a contratar.
export function revisionPendiente(revisadoEn: Date | null, colaboradoresActivos: number): boolean {
  if (revisadoEn) return false;
  return colaboradoresActivos > 0;
}
