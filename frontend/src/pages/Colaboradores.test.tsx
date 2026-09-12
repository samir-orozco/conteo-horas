import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Colaboradores from './Colaboradores';

// EL ALTA DE UN COLABORADOR NO METE LA SEDE PRINCIPAL EN LO QUE SE GUARDA.
//
// Decisión del dueño del 12 de septiembre de 2026, «mostrar la principal»: a un
// presencial al que nadie le elige sede NO se le asigna la Sede principal; se le
// muestra y se le cuenta al leer (backend/src/utils/sedePrincipal.ts). El 11 de
// septiembre la asignaba el servidor, y la primera versión de esta página la
// preseleccionaba al abrir el formulario: quien cambiaba a remoto antes de guardar
// le dejaba la principal a alguien que ya no veía el selector de sedes.
//
// CamposColaborador.test.tsx protege que cambiar la modalidad no toque las sedes.
// Esto protege la otra mitad, que nada cubría: que la página no vuelva a
// preseleccionarla al abrir «Agregar». Se vio en rojo metiendo a propósito la
// preselección en `abrir()`.

vi.mock('../lib/api', () => ({ default: { get: vi.fn(), post: vi.fn(), put: vi.fn() } }));
vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ usuario: { nombre: 'Admin', empresaNombre: 'Empresa de prueba' } }) }));
import api from '../lib/api';
const get = api.get as unknown as ReturnType<typeof vi.fn>;
const post = api.post as unknown as ReturnType<typeof vi.fn>;

// GET /sedes dice cuál es la principal: es justo el dato que tienta a preseleccionarla.
const SEDES = [
  { id: 'sede-principal', nombre: 'Sede principal', principal: true },
  { id: 'sede-norte', nombre: 'Norte', principal: false },
];

beforeEach(() => {
  get.mockReset();
  post.mockReset();
  get.mockImplementation((url: string) => {
    if (url === '/sedes') return Promise.resolve({ data: SEDES });
    if (url === '/colaboradores' || url === '/colaboradores/inactivos' || url === '/horarios') return Promise.resolve({ data: [] });
    if (url === '/suscripcion/mi-plan') {
      return Promise.resolve({ data: { plan: 'EMPRESARIAL', nombrePlan: 'Empresarial', ilimitado: true, limite: null, features: {} } });
    }
    return Promise.reject(new Error('url inesperada: ' + url));
  });
  post.mockResolvedValue({ data: { id: 'nuevo' } });
});

async function llenarAltaNueva() {
  const u = userEvent.setup();
  render(<MemoryRouter><Colaboradores /></MemoryRouter>);
  // Las cargas del montaje terminan ANTES de abrir el formulario: las sedes tienen
  // que estar en la página cuando corre `abrir()`, que es donde una preselección
  // las encontraría.
  await act(async () => {});
  await u.click(screen.getByRole('button', { name: 'Agregar' }));
  await u.type(screen.getByLabelText('Nombre'), 'Ana');
  await u.type(screen.getByLabelText('Apellido'), 'Giraldo');
  await u.type(screen.getByLabelText(/cédula/i), '1020304050');
  await u.type(screen.getByLabelText(/salario mensual/i), '1750000');
  return u;
}

async function loQueSeGuardo() {
  await waitFor(() => expect(post).toHaveBeenCalledTimes(1));
  const [url, payload] = post.mock.calls[0];
  expect(url).toBe('/colaboradores');
  return payload as { sedeIds?: unknown; modalidad?: unknown };
}

describe('Colaboradores · alta de un colaborador y la Sede principal', () => {
  it('remoto: lo que se guarda lleva sedeIds vacío, aunque la empresa tenga Sede principal', async () => {
    const u = await llenarAltaNueva();
    await u.click(screen.getByRole('radio', { name: 'Remoto' }));
    await u.click(screen.getByRole('button', { name: 'Crear colaborador' }));
    const payload = await loQueSeGuardo();
    expect(payload.modalidad).toBe('REMOTO');
    expect(payload.sedeIds).toEqual([]);
  });

  it('presencial sin elegir sede: la principal se muestra «por defecto», pero lo que se guarda lleva sedeIds vacío', async () => {
    const u = await llenarAltaNueva();
    // Se muestra sin elegirla por la persona, y tampoco se guarda: se cuenta al leer.
    expect(screen.getByRole('button', { name: /Sede principal.*por defecto/ })).toHaveAttribute('aria-pressed', 'false');
    await u.click(screen.getByRole('button', { name: 'Crear colaborador' }));
    const payload = await loQueSeGuardo();
    expect(payload.modalidad).toBe('PRESENCIAL');
    expect(payload.sedeIds).toEqual([]);
  });
});

// LA SEDE QUE SE VE EN LA LISTA, Y EL FILTRO.
//
// «Mostrar la principal» (12 de septiembre de 2026): un presencial sin sedes se ve y
// se filtra en la Sede principal, con «por defecto». «Sin sede» queda para un
// híbrido o un remoto sin sedes.
describe('Colaboradores · la sede que se ve en la lista', () => {
  const persona = (nombre: string, extra: Record<string, unknown>) => ({
    id: `c-${nombre}`, nombre, apellido: 'Prueba', cedula: nombre, salarioMensual: 1_000_000,
    estadoContrato: 'VIGENTE', sedeIds: [], sedeNombres: [], ...extra,
  });
  const ACTIVOS = [
    persona('Ana', { modalidad: 'PRESENCIAL' }),
    persona('Beto', { modalidad: 'REMOTO' }),
    persona('Caro', { modalidad: 'PRESENCIAL', sedeIds: ['sede-norte'], sedeNombres: ['Norte'] }),
  ];
  // GET /colaboradores/inactivos no trae ni la modalidad ni las sedes.
  const RETIRADO = { id: 'c-Dani', nombre: 'Dani', apellido: 'Prueba', cedula: 'Dani', salarioMensual: 1_000_000, fechaRetiro: null, motivoRetiro: null };

  beforeEach(() => {
    get.mockImplementation((url: string) => {
      if (url === '/sedes') return Promise.resolve({ data: SEDES });
      if (url === '/colaboradores') return Promise.resolve({ data: ACTIVOS });
      if (url === '/colaboradores/inactivos') return Promise.resolve({ data: [RETIRADO] });
      if (url === '/horarios') return Promise.resolve({ data: [] });
      if (url === '/suscripcion/mi-plan') {
        return Promise.resolve({ data: { plan: 'EMPRESARIAL', nombrePlan: 'Empresarial', ilimitado: true, limite: null, features: {} } });
      }
      return Promise.reject(new Error('url inesperada: ' + url));
    });
  });

  const fila = (nombre: string) => screen.queryByRole('row', { name: new RegExp(nombre) });

  it('un presencial sin sedes se ve en la Sede principal «por defecto»; un remoto sin sedes, «Sin sede»', async () => {
    render(<MemoryRouter><Colaboradores /></MemoryRouter>);
    const ana = await screen.findByRole('row', { name: /Ana/ });
    await waitFor(() => expect(ana).toHaveTextContent('Sede principal (por defecto)'));
    expect(ana).not.toHaveTextContent('Sin sede');
    expect(fila('Beto')).toHaveTextContent('Sin sede');
    expect(fila('Beto')).not.toHaveTextContent('por defecto');
    expect(fila('Caro')).toHaveTextContent('Norte');
    expect(fila('Caro')).not.toHaveTextContent('por defecto');
  });

  it('en el filtro, la Sede principal trae al presencial sin sedes, y «Sin sede» solo al remoto', async () => {
    const u = userEvent.setup();
    render(<MemoryRouter><Colaboradores /></MemoryRouter>);
    await screen.findByRole('row', { name: /Ana/ });
    await act(async () => {});
    await u.click(screen.getByRole('button', { name: 'Filtros' }));
    await u.click(screen.getByRole('button', { name: 'Sede principal' }));
    expect(fila('Ana')).not.toBeNull();
    expect(fila('Beto')).toBeNull();
    expect(fila('Caro')).toBeNull();
    await u.click(screen.getByRole('button', { name: 'Sede principal' }));
    await u.click(screen.getByRole('button', { name: 'Sin sede' }));
    expect(fila('Beto')).not.toBeNull();
    expect(fila('Ana')).toBeNull();
    expect(fila('Caro')).toBeNull();
  });

  it('un retirado no se ve «Sin sede» ni «por defecto»: la lista no trae sus sedes ni su modalidad', async () => {
    const u = userEvent.setup();
    render(<MemoryRouter><Colaboradores /></MemoryRouter>);
    await act(async () => {});
    await u.click(await screen.findByRole('button', { name: /Retirados/ }));
    const dani = await screen.findByRole('row', { name: /Dani/ });
    expect(dani).not.toHaveTextContent('Sin sede');
    expect(dani).not.toHaveTextContent('por defecto');
  });
});
