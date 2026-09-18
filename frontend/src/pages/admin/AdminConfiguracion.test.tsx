import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AdminConfiguracion from './AdminConfiguracion';

// LAS VIGENCIAS DEL AUXILIO DE TRANSPORTE, EN LA PANTALLA DE LA PLATAFORMA (17 de septiembre
// de 2026).
//
// Cada enero el gobierno fija por decreto el salario mínimo y el auxilio. Hasta hoy esos números
// vivían en el `seed`, así que actualizarlos exigía un despliegue completo. Ahora se agregan aquí.
//
// Lo importante de esta pantalla es que AGREGA, no reemplaza: cada año es una fila nueva y las
// anteriores se quedan. Si se editara la vieja, un reporte de diciembre pasaría a liquidarse con el
// decreto de enero, y la historia dejaría de cuadrar con lo que se pagó.

const { get, post } = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock('../../lib/api', () => ({
  default: { get: (...a: unknown[]) => get(...a), post: (...a: unknown[]) => post(...a), put: vi.fn(), delete: vi.fn() },
}));

const PLANES = {
  planes: {
    basico: { id: 'basico', nombre: 'Básico', precioMensual: 50_000, precioAnual: 500_000, limite: 10, features: {} },
  },
  funciones: [{ key: 'exportar', label: 'Exportar a Excel' }],
  orden: ['basico'],
};

const VIGENCIAS = [
  { id: 'v2026', vigenteDesde: '2026-01-01T05:00:00.000Z', valor: 249_095, tope: 3_501_810 },
  { id: 'v2025', vigenteDesde: '2025-01-01T05:00:00.000Z', valor: 200_000, tope: 2_847_000 },
];

beforeEach(() => {
  get.mockImplementation((url: string) => {
    if (url === '/admin/planes') return Promise.resolve({ data: PLANES });
    if (url === '/admin/auxilios') return Promise.resolve({ data: VIGENCIAS });
    return Promise.reject(new Error('url inesperada: ' + url));
  });
  post.mockReset();
});

describe('el auxilio de transporte en la configuración de la plataforma', () => {
  it('muestra las vigencias que ya existen, la más reciente primero', async () => {
    render(<AdminConfiguracion />);
    const panel = await screen.findByRole('region', { name: /auxilio de transporte/i });
    expect(panel).toHaveTextContent('249.095');
    expect(panel).toHaveTextContent('200.000');
  });

  it('agrega una vigencia nueva con la fecha, el valor y el tope', async () => {
    const usuario = userEvent.setup();
    post.mockResolvedValue({ data: { id: 'v2027', vigenteDesde: '2027-01-01T05:00:00.000Z', valor: 270_000, tope: 3_800_000 } });
    render(<AdminConfiguracion />);
    await screen.findByRole('region', { name: /auxilio de transporte/i });

    await usuario.type(screen.getByLabelText(/rige desde/i), '2027-01-01');
    await usuario.type(screen.getByLabelText(/^auxilio$/i), '270000');
    await usuario.type(screen.getByLabelText(/tope/i), '3800000');
    await usuario.click(screen.getByRole('button', { name: /agregar vigencia/i }));

    expect(post).toHaveBeenCalledWith('/admin/auxilios', {
      vigenteDesde: '2027-01-01', valor: 270_000, tope: 3_800_000,
    });
  });

  it('si el servidor rechaza los datos, lo dice con su mensaje', async () => {
    const usuario = userEvent.setup();
    post.mockRejectedValue({ response: { data: { error: 'El tope tiene que ser mayor que el auxilio.' } } });
    render(<AdminConfiguracion />);
    await screen.findByRole('region', { name: /auxilio de transporte/i });

    await usuario.type(screen.getByLabelText(/rige desde/i), '2027-01-01');
    await usuario.type(screen.getByLabelText(/^auxilio$/i), '3800000');
    await usuario.type(screen.getByLabelText(/tope/i), '270000');
    await usuario.click(screen.getByRole('button', { name: /agregar vigencia/i }));

    expect(await screen.findByText(/el tope tiene que ser mayor/i)).toBeInTheDocument();
  });
});
