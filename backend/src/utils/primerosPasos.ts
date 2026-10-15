// «Primeros pasos» en el Inicio de una empresa nueva (14 de octubre de 2026).
//
// Lo decidió el dueño, en este orden: la sede, el horario, un trabajador, su registro biométrico y la
// primera marcación en el kiosco. Cada paso se cumple con UNO: el objetivo es que la empresa vea el
// producto funcionando durante la prueba, no que lo deje configurado entero.
//
// La tarjeta se va cuando están los cinco, o cuando la empresa cumple un mes: a una empresa que lleva
// tiempo usando el producto no se le pide que lo configure.

export type ClavePaso = 'SEDE' | 'HORARIO' | 'TRABAJADOR' | 'ROSTRO' | 'MARCACION';
export type Paso = { clave: ClavePaso; hecho: boolean };
export type Arranque = { horariosActivos: number; colaboradoresActivos: number; conRostro: number; marcoEnElKiosco: boolean };

export const DIAS_DE_ARRANQUE = 30;
const DIA_MS = 24 * 60 * 60 * 1000;

// Va aparte porque decide si vale la pena consultar la base: fuera del mes no se pregunta nada.
export function enArranque(creadaEn: Date, ahora: Date): boolean {
  return ahora.getTime() - creadaEn.getTime() < DIAS_DE_ARRANQUE * DIA_MS;
}

export function primerosPasos(a: Arranque): Paso[] | null {
  const pasos: Paso[] = [
    // Toda empresa nace con su «Sede principal» (el registro la crea en la misma transacción) y la última
    // sede activa no se puede borrar: este paso está hecho desde el primer día.
    { clave: 'SEDE', hecho: true },
    { clave: 'HORARIO', hecho: a.horariosActivos > 0 },
    { clave: 'TRABAJADOR', hecho: a.colaboradoresActivos > 0 },
    { clave: 'ROSTRO', hecho: a.conRostro > 0 },
    { clave: 'MARCACION', hecho: a.marcoEnElKiosco },
  ];
  return pasos.every(p => p.hecho) ? null : pasos;
}
