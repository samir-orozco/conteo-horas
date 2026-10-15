import { describe, it, expect } from 'vitest';
import { cuando, diaDelEvento, textoDeEvento } from './agenda';
import type { EventoDeAgenda } from './types';

// «PRÓXIMOS DÍAS» EN EL INICIO (15 de octubre de 2026): cómo se dice cada evento. El servidor manda el tipo, el día
// (medianoche de Bogotá, 05:00Z) y cuántos días faltan; aquí se pone en palabras. Estas pruebas corren en Los
// Ángeles a propósito (vite.config.ts): un día formateado sin la zona de Bogotá saldría con el anterior.

const ev = (e: Partial<EventoDeAgenda> & Pick<EventoDeAgenda, 'tipo'>) => ({ dia: '2026-11-02T05:00:00.000Z', enDias: 18, ...e }) as EventoDeAgenda;

describe('cuando', () => {
  it('hoy, mañana o en cuántos días', () => {
    expect([0, 1, 2, 29].map(cuando)).toEqual(['hoy', 'mañana', 'en 2 días', 'en 29 días']);
  });
});

describe('diaDelEvento', () => {
  it('el día y el mes en hora de Bogotá, aunque el navegador esté al occidente', () => {
    expect(diaDelEvento('2026-11-02T05:00:00.000Z')).toEqual({ dia: '2', mes: 'nov' });
  });
});

describe('textoDeEvento', () => {
  it('un festivo dice su nombre, y si es de la empresa', () => {
    expect(textoDeEvento(ev({ tipo: 'FESTIVO', nombre: 'Todos los Santos', propio: false }))).toEqual({ titulo: 'Todos los Santos', detalle: 'Festivo', destino: null });
    expect(textoDeEvento(ev({ tipo: 'FESTIVO', nombre: 'Aniversario', propio: true })).detalle).toBe('Festivo de la empresa');
  });

  it('un cumpleaños dice de quién', () => {
    expect(textoDeEvento(ev({ tipo: 'CUMPLEANOS', colaboradorId: 'c1', nombre: 'Ana Ruiz' }))).toEqual({ titulo: 'Ana Ruiz', detalle: 'Cumpleaños', destino: null });
  });

  it('un contrato dice qué hay que decidir y lleva a la ficha de la persona, en sus contratos', () => {
    expect(textoDeEvento(ev({ tipo: 'CONTRATO_PREAVISO', colaboradorId: 'c1', nombre: 'Ana Ruiz' }))).toEqual({
      titulo: 'Ana Ruiz', detalle: 'Último día para avisar si no se renueva el contrato', destino: '/app/colaboradores/c1?tab=contratos',
    });
  });

  // Con el preaviso vencido, el contrato se prorroga solo: lo mismo que dicen los pendientes (revisión adversarial).
  it('un contrato con el preaviso vencido dice que se prorroga solo', () => {
    expect(textoDeEvento(ev({ tipo: 'CONTRATO_SE_PRORROGA', colaboradorId: 'c2', nombre: 'Luis Mora' }))).toEqual({
      titulo: 'Luis Mora', detalle: 'Vence y se prorroga solo', destino: '/app/colaboradores/c2?tab=contratos',
    });
  });

  it('la suscripción: el último día de la prueba o del mes pagado, y lleva a pagar; sin montos', () => {
    expect(textoDeEvento(ev({ tipo: 'SUSCRIPCION_VENCE', eraPrueba: true }))).toEqual({
      titulo: 'Último día de tu prueba gratis', detalle: 'Registra el pago para seguir usando HoraPro', destino: '/app/configuracion?tab=suscripcion',
    });
    expect(textoDeEvento(ev({ tipo: 'SUSCRIPCION_VENCE', eraPrueba: false })).titulo).toBe('Último día del mes pagado');
  });

  it('el fin de la prueba del clima lleva a su página', () => {
    expect(textoDeEvento(ev({ tipo: 'PRUEBA_CLIMA_TERMINA' }))).toEqual({
      titulo: 'Último día de la prueba del clima', detalle: 'Después, el clima laboral es del plan Empresarial', destino: '/app/clima',
    });
  });

  // Un servidor más nuevo podría mandar un tipo que este código no conoce: no se rompe ni inventa.
  it('un tipo que no conoce no rompe la lista', () => {
    expect(textoDeEvento(ev({ tipo: 'OTRA_COSA' as EventoDeAgenda['tipo'] }))).toEqual({ titulo: 'Evento', detalle: null, destino: null });
  });
});
