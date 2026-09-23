import { describe, it, expect } from 'vitest';
import { limpiarDecisionDeDescanso, MAXIMO_DE_NOTA } from './cuerpoDeDecisionDeDescanso';

// EL ÚNICO CAMINO DE ESCRITURA SOBRE LA DECISIÓN DE UN DESCANSO TRABAJADO (22 de septiembre de 2026).
//
// El cuerpo llega de la red, así que toda la validación vive aquí y no puede apoyarse en que la
// pantalla la haya hecho antes.
//
// Qué está en juego, y no es un recargo: esta tabla NO mueve plata (el recargo sale de
// `dias_esperados.esDescanso`, que esto no toca). Lo que está en juego es el REGISTRO: es lo único
// que la empresa va a poder mostrar el día que alguien reclame que le debían un día libre. Un dato
// mal validado aquí no rompe una pantalla, deja una constancia que dice algo que no pasó.
//
// El alcance va primero, igual que en `cuerpoDeRespuestaDescanso`: sin esa guarda, un cuerpo armado
// a mano escribiría decisiones sobre la gente de otra empresa.

const VALIDOS = ['c1', 'c2'];
const base = { colaboradorId: 'c1', fecha: '2026-10-04', decision: 'DINERO' };

describe('limpiarDecisionDeDescanso', () => {
  it('un cuerpo completo y válido pasa', () => {
    expect(limpiarDecisionDeDescanso(
      { ...base, decision: 'COMPENSATORIO', fechaCompensatorio: '2026-10-07', nota: 'Acordado con ella' },
      VALIDOS,
    )).toEqual({
      ok: true,
      datos: {
        colaboradorId: 'c1', fecha: '2026-10-04', decision: 'COMPENSATORIO',
        fechaCompensatorio: '2026-10-07', nota: 'Acordado con ella',
      },
    });
  });

  it('un colaborador de OTRA empresa se rechaza, y esa guarda va primero', () => {
    const r = limpiarDecisionDeDescanso({ ...base, colaboradorId: 'ajeno' }, VALIDOS);
    expect(r.ok).toBe(false);
  });

  it('una fecha mal formada se rechaza antes de construir ningún Date', () => {
    // `new Date("hoy")` da un Invalid Date que viaja hasta la consulta sin quejarse.
    expect(limpiarDecisionDeDescanso({ ...base, fecha: 'hoy' }, VALIDOS).ok).toBe(false);
    expect(limpiarDecisionDeDescanso({ ...base, fecha: '2026-13-40' }, VALIDOS).ok).toBe(false);
    expect(limpiarDecisionDeDescanso({ ...base, fecha: '' }, VALIDOS).ok).toBe(false);
  });

  it('una decisión que no es una de las tres se rechaza', () => {
    // Un caso por valor con rechazo explícito de todo lo demás (§9.4). Aceptar un valor raro
    // dejaría una constancia ilegible el día que alguien la lea en un juzgado.
    expect(limpiarDecisionDeDescanso({ ...base, decision: 'ALGO' }, VALIDOS).ok).toBe(false);
    expect(limpiarDecisionDeDescanso({ ...base, decision: '' }, VALIDOS).ok).toBe(false);
  });

  it('las tres decisiones válidas se aceptan', () => {
    for (const d of ['PENDIENTE', 'DINERO']) {
      expect(limpiarDecisionDeDescanso({ ...base, decision: d }, VALIDOS).ok).toBe(true);
    }
    expect(limpiarDecisionDeDescanso(
      { ...base, decision: 'COMPENSATORIO', fechaCompensatorio: '2026-10-07' }, VALIDOS,
    ).ok).toBe(true);
  });

  it('COMPENSATORIO SIN día asignado se rechaza', () => {
    // Es la mitad del dato. Guardar «se le debe un día» sin decir cuál deja una constancia que no
    // prueba nada, que es peor que no tenerla porque parece que sí.
    expect(limpiarDecisionDeDescanso({ ...base, decision: 'COMPENSATORIO' }, VALIDOS).ok).toBe(false);
  });

  it('el día compensatorio no puede ser el mismo que se trabajó', () => {
    expect(limpiarDecisionDeDescanso(
      { ...base, decision: 'COMPENSATORIO', fechaCompensatorio: '2026-10-04' }, VALIDOS,
    ).ok).toBe(false);
  });

  it('DINERO con día compensatorio: se DESCARTA el día, no se rechaza el cuerpo', () => {
    // Residuo de la pantalla: el administrador eligió un día y después cambió a dinero. Es la misma
    // doctrina que `cuerpoDeRespuestaDescanso` con `dia` cuando el tipo es ROTATIVO. Guardarlo
    // dejaría una decisión que dice dos cosas a la vez.
    const r = limpiarDecisionDeDescanso({ ...base, decision: 'DINERO', fechaCompensatorio: '2026-10-07' }, VALIDOS);
    expect(r).toEqual({
      ok: true,
      datos: { colaboradorId: 'c1', fecha: '2026-10-04', decision: 'DINERO', fechaCompensatorio: null, nota: null },
    });
  });

  it('PENDIENTE también lo descarta', () => {
    const r = limpiarDecisionDeDescanso({ ...base, decision: 'PENDIENTE', fechaCompensatorio: '2026-10-07' }, VALIDOS);
    expect(r.ok && r.datos.fechaCompensatorio).toBe(null);
  });

  it('la nota se recorta, y una nota vacía queda en null y no en cadena vacía', () => {
    // `null` y `''` significan lo mismo para quien lee, pero solo uno se distingue en la base de
    // «nadie escribió nada».
    const r = limpiarDecisionDeDescanso({ ...base, nota: '   se acordó por teléfono   ' }, VALIDOS);
    expect(r.ok && r.datos.nota).toBe('se acordó por teléfono');
    const v = limpiarDecisionDeDescanso({ ...base, nota: '    ' }, VALIDOS);
    expect(v.ok && v.datos.nota).toBe(null);
  });

  it('una nota enorme se rechaza: es guarda de abuso, no regla de negocio', () => {
    const r = limpiarDecisionDeDescanso({ ...base, nota: 'x'.repeat(MAXIMO_DE_NOTA + 1) }, VALIDOS);
    expect(r.ok).toBe(false);
  });

  it('un cuerpo que no es un objeto no revienta', () => {
    for (const basura of [null, undefined, 'texto', 42, []]) {
      expect(limpiarDecisionDeDescanso(basura, VALIDOS).ok).toBe(false);
    }
  });
});
