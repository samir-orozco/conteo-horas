import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Colaboradores from './Colaboradores';

// LA TABLA DE COLABORADORES MARCA EL REGISTRO FACIAL (14 de septiembre de 2026): quién tiene su rostro
// registrado y quién dijo que no autoriza. Quien no tiene registro no lleva etiqueta.

vi.mock('../lib/api', () => ({ default: { get: vi.fn(), post: vi.fn(), put: vi.fn() } }));
vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ usuario: { nombre: 'Admin', empresaNombre: 'Empresa de prueba' } }) }));
import api from '../lib/api';
const get = api.get as unknown as ReturnType<typeof vi.fn>;

// Filas como las devuelve GET /colaboradores.
const fila = (id: string, nombre: string, extra: Record<string, unknown>) => ({
  id, nombre, apellido: 'Prueba', cedula: `10${id}`, cargo: null, salarioMensual: 1_500_000, activo: true,
  sedeIds: [], sedeNombres: [], estadoContrato: null, fotoMini: null, modalidad: 'PRESENCIAL',
  rostroEnroladoEn: null, rostroRechazadoEn: null, ...extra,
});

beforeEach(() => {
  get.mockReset();
  get.mockImplementation((url: string) => {
    if (url === '/colaboradores') {
      return Promise.resolve({
        data: [
          fila('1', 'Ana', { rostroEnroladoEn: '2026-09-10T15:00:00.000Z' }),
          fila('2', 'Luis', { rostroRechazadoEn: '2026-09-12T15:00:00.000Z' }),
          fila('3', 'Pedro', {}),
        ],
      });
    }
    if (url === '/colaboradores/inactivos' || url === '/horarios' || url === '/sedes') return Promise.resolve({ data: [] });
    if (url === '/suscripcion/mi-plan') {
      return Promise.resolve({ data: { plan: 'EMPRESARIAL', nombrePlan: 'Empresarial', ilimitado: true, limite: null, features: {} } });
    }
    return Promise.reject(new Error('url inesperada: ' + url));
  });
});

describe('la tabla de colaboradores', () => {
  it('marca a quien tiene el rostro registrado y a quien no autorizó, y a nadie más', async () => {
    render(<MemoryRouter><Colaboradores /></MemoryRouter>);
    expect(await screen.findByText('Rostro registrado')).toBeInTheDocument();
    expect(screen.getByText('No autorizó')).toBeInTheDocument();
    expect(screen.getAllByText(/^(Rostro registrado|No autorizó)$/)).toHaveLength(2);
  });
});
