import { describe, it, expect } from 'vitest';
import { PLANES, FEATURES, capacidadesDe, type FeatureKey } from './planes';

// ────────── EL MÓDULO DE TURNOS ES DEL PLAN EMPRESARIAL (30 de septiembre de 2026) ──────────
//
// Decisión del dueño antes de desplegarlo: «que el módulo de turnos solamente esté disponible para
// el plan empresarial, pero que yo también pueda hacer la modificación dentro de los planes internos
// de cada cliente».
//
// LAS DOS MITADES SE PRUEBAN AQUÍ porque son la misma regla vista desde dos lados: qué trae el plan
// por defecto, y que un override por empresa pueda contradecirlo. La segunda es la que de verdad
// pidió: poder prendérselo a un cliente de plan Profesional sin cambiarle el plan ni el precio.
//
// NO HACE FALTA TOCAR NINGUNA PANTALLA DEL SUPER ADMIN. Las dos —la de los planes generales y la de
// la ficha de cada empresa— recorren el catálogo `FEATURES` que les manda el servidor, así que una
// clave nueva les aparece sola, con su casilla. Se comprobó leyendo las dos antes de escribir esto.

const KEY: FeatureKey = 'turnos';

describe('la función de turnos en el catálogo de planes', () => {
  it('está en el catálogo, con un nombre que una persona entiende', () => {
    // De este `label` sale el texto de la casilla en las dos pantallas del super admin. Si fuera la
    // clave cruda, el dueño vería «turnos» en vez de algo que se pueda leer.
    const f = FEATURES.find(x => x.key === KEY);
    expect(f?.label).toBe('Turnos y programación');
    // Y NO va como «Próximamente»: eso deja la casilla apagada y sin poder marcarla, que es lo que
    // se hizo con Siigo mientras no existía. Turnos existe y se despliega hoy.
    expect(f?.proximamente).toBeUndefined();
  });

  it('solo la trae el plan Empresarial', () => {
    expect(PLANES.ESENCIAL.features.turnos).toBe(false);
    expect(PLANES.PROFESIONAL.features.turnos).toBe(false);
    expect(PLANES.EMPRESARIAL.features.turnos).toBe(true);
  });

  it('y el super admin puede prendérsela a una empresa que NO la tiene en su plan', () => {
    // La segunda mitad del pedido. Un cliente de plan Profesional al que se le activa turnos sin
    // cambiarle el plan: el override manda sobre lo que trae el plan.
    // LA FORMA REAL con la que viaja un override: dentro de `funcionesOverride` de la suscripción,
    // que es la columna donde el super admin lo guarda desde la ficha de la empresa. La primera
    // versión de esta prueba se lo pasaba como un quinto parámetro que no existe, y por eso fallaba:
    // un fixture que no es un ejemplo de verdad no prueba la costura que dice probar (§9.2).
    const cap = capacidadesDe(
      { plan: 'PROFESIONAL', funcionesOverride: { turnos: true } },
      false, PLANES,
    );
    expect(cap.features.turnos).toBe(true);
    // Y lo demás de su plan no se mueve: un override es de UNA función, no un cambio de plan.
    expect(cap.features.multiSede).toBe(false);
    expect(cap.limite).toBe(PLANES.PROFESIONAL.limite);
  });

  it('y apagársela a una Empresarial que no la quiere', () => {
    const cap = capacidadesDe(
      { plan: 'EMPRESARIAL', funcionesOverride: { turnos: false } },
      false, PLANES,
    );
    expect(cap.features.turnos).toBe(false);
    expect(cap.features.multiSede).toBe(true);
  });
});
