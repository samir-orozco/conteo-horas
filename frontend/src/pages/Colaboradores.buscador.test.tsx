import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Colaboradores from './Colaboradores';

// EL BUSCADOR DE COLABORADORES (4 de octubre de 2026). Con 180 personas, los
// filtros por sede y por contrato no reemplazan a escribir un nombre.
//
// Lo que se protege además del filtrado: que buscar dentro de «Activos» a quien
// está retirado no responda «no hay nada», que es lo que haría creer que la
// persona no existe en el sistema.

vi.mock('../lib/api', () => ({ default: { get: vi.fn(), post: vi.fn(), put: vi.fn() } }));
vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ usuario: { nombre: 'Admin', empresaNombre: 'Empresa' } }) }));
import api from '../lib/api';
const get = api.get as unknown as ReturnType<typeof vi.fn>;

const ficha = (id: string, nombre: string, apellido: string, cedula: string) => ({
  id, nombre, apellido, cedula, cargo: 'Vigilante', salarioMensual: 1750905,
  sedeIds: [], sedeNombres: [], modalidad: 'PRESENCIAL',
});

const ACTIVOS = [
  ficha('c1', 'Ana María', 'Gómez Ruiz', '1020304050'),
  ficha('c2', 'Pedro', 'Lopez', '7778889'),
];
const RETIRADOS = [{ ...ficha('c3', 'Julián', 'Restrepo', '5556667'), fechaRetiro: '2026-09-01T05:00:00.000Z', motivoRetiro: 'RENUNCIA' }];

beforeEach(() => {
  get.mockReset();
  get.mockImplementation((url: string) => {
    if (url === '/sedes') return Promise.resolve({ data: [] });
    if (url === '/colaboradores') return Promise.resolve({ data: ACTIVOS });
    if (url === '/colaboradores/inactivos') return Promise.resolve({ data: RETIRADOS });
    if (url === '/horarios') return Promise.resolve({ data: [] });
    if (url === '/suscripcion/mi-plan') {
      return Promise.resolve({ data: { plan: 'EMPRESARIAL', nombrePlan: 'Empresarial', ilimitado: true, limite: null, features: {} } });
    }
    return Promise.reject(new Error('url inesperada: ' + url));
  });
});

const abrir = async () => {
  const u = userEvent.setup();
  render(<MemoryRouter><Colaboradores /></MemoryRouter>);
  await act(async () => {});
  return u;
};
const caja = () => screen.getByRole('textbox', { name: /buscar/i });
// La cabecera cuenta como fila, así que las personas son las filas menos una.
const personasEnLaTabla = () => screen.getAllByRole('row').length - 1;

describe('Colaboradores · buscador', () => {
  it('escribir un trozo del apellido deja solo a quien coincide', async () => {
    const u = await abrir();
    expect(personasEnLaTabla()).toBe(2);
    await u.type(caja(), 'gomez');
    expect(personasEnLaTabla()).toBe(1);
    expect(screen.getByText('Ana María Gómez Ruiz')).toBeInTheDocument();
    expect(screen.queryByText('Pedro Lopez')).toBeNull();
  });

  it('encuentra por la cédula, con puntos o sin ellos', async () => {
    const u = await abrir();
    await u.type(caja(), '1.020.304.050');
    expect(personasEnLaTabla()).toBe(1);
    expect(screen.getByText('Ana María Gómez Ruiz')).toBeInTheDocument();
  });

  it('borrar lo escrito devuelve la lista completa', async () => {
    const u = await abrir();
    await u.type(caja(), 'gomez');
    await u.clear(caja());
    expect(personasEnLaTabla()).toBe(2);
  });

  it('cuando nada coincide lo dice, en vez de dejar la tabla en blanco', async () => {
    const u = await abrir();
    await u.type(caja(), 'zzz');
    expect(personasEnLaTabla()).toBe(1); // la fila del mensaje
    expect(screen.getByText(/no encontramos a nadie/i)).toBeInTheDocument();
  });

  // Lo que evita concluir que la persona no está en el sistema.
  it('si solo coincide alguien retirado, lo avisa y ofrece verlo', async () => {
    const u = await abrir();
    await u.type(caja(), 'julian');
    // La frase COMPLETA y de un solo elemento: con un /está entre los
    // retirados/ la prueba pasaba sobre un texto que decía «y está está entre
    // los retirados», porque el patrón flojo no ve la palabra repetida.
    expect(screen.getByText('Hay 1 persona que coincide y está entre los retirados.')).toBeInTheDocument();
    await u.click(screen.getByRole('button', { name: /ver en todos/i }));
    expect(screen.getByText('Julián Restrepo')).toBeInTheDocument();
  });
});
