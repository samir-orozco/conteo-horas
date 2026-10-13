import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SelectorPeriodoDePago from './SelectorPeriodoDePago';

// EL SELECTOR DEL PERÍODO DE PAGO (13 de octubre de 2026). Pone las fechas del período; el período que
// muestra SALE de las fechas, así que si alguien las cambia a mano dice «Fechas personalizadas».
const montar = (desde: string, hasta: string) => {
  const onCambiar = vi.fn();
  render(<SelectorPeriodoDePago desde={desde} hasta={hasta} onCambiar={onCambiar} hoy="2026-10-13" />);
  return onCambiar;
};
const periodo = () => screen.getByRole('combobox', { name: 'Período de pago' });
const mes = () => screen.getByRole('combobox', { name: 'Mes' });

describe('SelectorPeriodoDePago', () => {
  it('elegir la primera quincena pone del 1 al 15 del mes elegido', async () => {
    const onCambiar = montar('2026-10-01', '2026-10-13');
    await userEvent.selectOptions(periodo(), 'Primera quincena');
    expect(onCambiar).toHaveBeenCalledWith('2026-10-01', '2026-10-15');
  });

  it('la segunda quincena va hasta el último día del mes', async () => {
    const onCambiar = montar('2026-09-01', '2026-09-15');
    await userEvent.selectOptions(periodo(), 'Segunda quincena');
    expect(onCambiar).toHaveBeenCalledWith('2026-09-16', '2026-09-30');
  });

  it('muestra el período que son las fechas', () => {
    montar('2026-09-16', '2026-09-30');
    expect(periodo()).toHaveDisplayValue('Segunda quincena');
    expect(mes()).toHaveDisplayValue('septiembre de 2026');
  });

  it('con fechas cambiadas a mano dice «Fechas personalizadas»', () => {
    montar('2026-10-01', '2026-10-13');
    expect(periodo()).toHaveDisplayValue('Fechas personalizadas');
  });

  it('cambiar el mes conserva el tipo de período', async () => {
    const onCambiar = montar('2026-10-01', '2026-10-15');
    await userEvent.selectOptions(mes(), 'agosto de 2026');
    expect(onCambiar).toHaveBeenCalledWith('2026-08-01', '2026-08-15');
  });

  it('con fechas personalizadas, cambiar el mes elige el mes completo', async () => {
    const onCambiar = montar('2026-10-01', '2026-10-13');
    await userEvent.selectOptions(mes(), 'septiembre de 2026');
    expect(onCambiar).toHaveBeenCalledWith('2026-09-01', '2026-09-30');
  });

  it('ofrece el mes de hoy y los doce anteriores, y no meses que no han llegado', () => {
    montar('2026-10-01', '2026-10-15');
    const meses = Array.from(mes().querySelectorAll('option')).map(o => o.textContent);
    expect(meses[0]).toBe('octubre de 2026');
    expect(meses).toContain('octubre de 2025');
    expect(meses).not.toContain('septiembre de 2025');
    expect(meses).not.toContain('noviembre de 2026');
  });

  // Un reporte viejo, pedido con fechas de hace dos años, sigue mostrando su mes.
  it('si las fechas son de un mes más viejo, ese mes también está', () => {
    montar('2024-03-01', '2024-03-31');
    expect(mes()).toHaveDisplayValue('marzo de 2024');
  });
});
