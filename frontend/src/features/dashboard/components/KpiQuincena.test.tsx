import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';

vi.mock('../../../lib/api', () => ({ default: { get: vi.fn() } }));
import api from '../../../lib/api';
import KpiQuincena from './KpiQuincena';

// LAS EXTRAS Y LOS RECARGOS DE LA QUINCENA EN EL INICIO (15 de octubre de 2026). Decisión del dueño: en pesos, con
// las horas pequeñas debajo. El número es el «Total» del reporte de extras para la quincena en curso, y llevarlo allá
// abre ese reporte con esas fechas. Con un servidor anterior, que no tiene la ruta, queda el KPI de siempre.

const get = api.get as unknown as ReturnType<typeof vi.fn>;
const QUINCENA = { desde: '2026-10-01', hasta: '2026-10-15', total: 2_345_678.4, extras: 2_000_000, recargos: 345_678.4, minutosExtra: 750, minutosConRecargo: 1_830, personas: 4 };

function Destino() {
  const l = useLocation();
  return <p>Llegó a {l.pathname}{l.search}</p>;
}
const montar = () => render(
  <MemoryRouter initialEntries={['/app']}>
    <Routes>
      <Route path="/app" element={<KpiQuincena hoy="2026-10-15" horasExtraMes={12.5} />} />
      <Route path="*" element={<Destino />} />
    </Routes>
  </MemoryRouter>,
);
// Intl separa el signo de pesos con un espacio duro.
const sinEspaciosDuros = (s: string | null) => (s ?? '').split(String.fromCharCode(160)).join(' ');

beforeEach(() => { get.mockReset(); });

describe('KpiQuincena', () => {
  it('pide las extras de la quincena en curso, con sus fechas', async () => {
    get.mockResolvedValue({ data: QUINCENA });
    montar();
    await screen.findByText(/12,5 h extra/);
    expect(get).toHaveBeenCalledWith('/dashboard/quincena', { params: { desde: '2026-10-01', hasta: '2026-10-15' } });
  });

  it('el total en pesos, sin centavos, y debajo las horas extra y las horas con recargo', async () => {
    get.mockResolvedValue({ data: QUINCENA });
    montar();
    const tarjeta = await screen.findByRole('button', { name: /Extras y recargos/ });
    expect(sinEspaciosDuros(tarjeta.textContent)).toContain('$ 2.345.678');
    expect(screen.getByText('12,5 h extra · 30,5 h con recargo')).toBeInTheDocument();
    expect(screen.getByText('1 al 15 de oct')).toBeInTheDocument();
  });

  it('lleva al reporte de extras con las fechas de la quincena', async () => {
    get.mockResolvedValue({ data: QUINCENA });
    montar();
    fireEvent.click(await screen.findByRole('button', { name: /Extras y recargos/ }));
    expect(screen.getByText('Llegó a /app/reportes/extras?desde=2026-10-01&hasta=2026-10-15')).toBeInTheDocument();
  });

  it('mientras carga no inventa un número', () => {
    get.mockReturnValue(new Promise(() => {}));
    montar();
    expect(screen.getByText('…')).toBeInTheDocument();
    expect(screen.queryByText(/\$/)).not.toBeInTheDocument();
  });

  it('si el servidor no la tiene (o falla), queda el KPI de horas extra del mes', async () => {
    get.mockRejectedValue({ response: { status: 404 } });
    montar();
    expect(await screen.findByText('Horas extra del mes')).toBeInTheDocument();
    expect(screen.getByText('12.5h')).toBeInTheDocument();
  });
});
