import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import VistazoSinPlan from './VistazoSinPlan';
import type { VistazoClima } from './tipos';

// LO QUE VE DEL CLIMA UNA EMPRESA SIN EL PLAN (14 de octubre de 2026, PENDIENTES nº 39, fase 4): el ánimo promedio, la
// participación, CUÁNTAS personas necesitan atención y cuántas notas hay en el buzón. Sin nombres: el servidor no
// los manda (utils/climaSinPlan.ts del backend); aquí se prueba lo que ve el administrador.

const V: VistazoClima = { total: 60, personas: 38, promedio: 3.8, variacion: 0.2, jornadas: 80, atencion: 2 };
const montar = (v: Partial<VistazoClima> = {}, notas: number | null = 4, onVerBuzon = vi.fn()) => {
  render(<VistazoSinPlan v={{ ...V, ...v }} notasDelBuzon={notas} onVerBuzon={onVerBuzon} />);
  return onVerBuzon;
};

describe('VistazoSinPlan', () => {
  it('el ánimo promedio con su variación, como en el panel completo', () => {
    montar();
    const animo = screen.getByRole('group', { name: 'Ánimo promedio' });
    expect(within(animo).getByText('3,8')).toBeInTheDocument();
    expect(within(animo).getByText('▲ 0,2')).toBeInTheDocument();
  });

  it('cuántos respondieron frente a las jornadas', () => {
    montar();
    const r = screen.getByRole('group', { name: 'Respondieron' });
    expect(within(r).getByText('75 %')).toBeInTheDocument();
    expect(within(r).getByText('60 de 80 jornadas')).toBeInTheDocument();
  });

  it('cuántas personas necesitan atención, y que con el plan se ve quiénes', () => {
    montar();
    const a = screen.getByRole('group', { name: 'Necesitan atención' });
    expect(within(a).getByText('2')).toBeInTheDocument();
    expect(within(a).getByText('personas')).toBeInTheDocument();
    expect(within(a).getByText('Con el plan Empresarial ves quiénes y por qué')).toBeInTheDocument();
  });

  it('en singular con una persona', () => {
    montar({ atencion: 1 });
    expect(within(screen.getByRole('group', { name: 'Necesitan atención' })).getByText('persona')).toBeInTheDocument();
  });

  it('con nadie en atención lo dice, sin vender nada', () => {
    montar({ atencion: 0 });
    const a = screen.getByRole('group', { name: 'Necesitan atención' });
    expect(within(a).getByText('Nadie lleva tres respuestas malas seguidas')).toBeInTheDocument();
    expect(within(a).queryByText('Con el plan Empresarial ves quiénes y por qué')).toBeNull();
  });

  it('las notas del buzón, y el botón para ir a verlo', async () => {
    const onVerBuzon = montar();
    const b = screen.getByRole('group', { name: 'Buzón confidencial' });
    expect(within(b).getByText('4')).toBeInTheDocument();
    await userEvent.click(within(b).getByRole('button', { name: 'Ver el buzón' }));
    expect(onVerBuzon).toHaveBeenCalled();
  });

  it('sin respuestas en el período, lo dice en vez de mostrar ceros', () => {
    montar({ total: 0, promedio: null, atencion: 0 });
    expect(screen.getByText('Todavía nadie calificó su día en este período.')).toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Ánimo promedio' })).toBeNull();
  });
});
