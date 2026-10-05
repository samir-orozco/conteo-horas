import { describe, it, expect } from 'vitest';
import { PLANES, FEATURES, capacidadesDe, combinarPlanes, mensajeDeFuncionBloqueada } from './planes';

// ────────── CLIMA LABORAL ES DEL PLAN EMPRESARIAL (3 de octubre de 2026) ──────────
//
// Decisión del dueño: «Solo en el empresarial». Igual que turnos, el super admin puede prenderlo o
// apagarlo por empresa desde su ficha, y la casilla le aparece sola porque las dos pantallas recorren
// `FEATURES` (planes.turnos.test.ts lo explica).

describe('clima laboral en el catálogo de planes', () => {
  it('está en el catálogo con su nombre, y no como «Próximamente»', () => {
    const f = FEATURES.find(x => x.key === 'clima');
    expect(f?.label).toBe('Clima laboral');
    expect(f?.proximamente).toBeUndefined();
  });

  it('solo lo trae el plan Empresarial', () => {
    expect(PLANES.ESENCIAL.features.clima).toBe(false);
    expect(PLANES.PROFESIONAL.features.clima).toBe(false);
    expect(PLANES.EMPRESARIAL.features.clima).toBe(true);
  });

  it('una configuración de planes guardada ANTES de existir el módulo no se lo quita a Empresarial', () => {
    // El super admin ya guardó overrides de los planes en «Precios», con las funciones que había
    // entonces. Esa lista no menciona `clima`, y no mencionarla no puede leerse como apagarla.
    const guardado = { EMPRESARIAL: { features: { turnos: true, multiSede: true } } };
    expect(combinarPlanes(guardado).EMPRESARIAL.features.clima).toBe(true);
  });

  it('el super admin puede prenderlo a una empresa de otro plan', () => {
    const cap = capacidadesDe({ plan: 'PROFESIONAL', funcionesOverride: { clima: true } }, false, PLANES);
    expect(cap.features.clima).toBe(true);
    expect(cap.features.turnos).toBe(false);
  });
});

describe('mensajeDeFuncionBloqueada', () => {
  it('nombra el módulo que el plan no incluye', () => {
    expect(mensajeDeFuncionBloqueada('clima')).toBe('Tu plan no incluye «Clima laboral». Sube de plan para usarlo.');
    // Antes la guarda decía «turnos» para cualquier función: con un segundo módulo detrás, mentía.
    expect(mensajeDeFuncionBloqueada('turnos')).toBe('Tu plan no incluye «Turnos y programación». Sube de plan para usarlo.');
  });
});
