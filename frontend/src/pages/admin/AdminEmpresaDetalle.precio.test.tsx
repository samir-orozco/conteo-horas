import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

// «Precio del cliente» en la ficha de la empresa (4 de octubre de 2026). El
// formulario ya existía en el menú de la lista de empresas; lo que faltaba era
// tenerlo donde se mira al cliente. Es el MISMO formulario, no una copia: de
// eso se encarga CamposDePrecio.

const { get, put } = vi.hoisted(() => ({ get: vi.fn(), put: vi.fn() }));
vi.mock('../../lib/api', () => ({
  default: { get: (...a: unknown[]) => get(...a), put: (...a: unknown[]) => put(...a), post: vi.fn(), delete: vi.fn() },
}));
vi.mock('../../lib/recibo', () => ({ descargarReciboPDF: vi.fn() }));

import AdminEmpresaDetalle from './AdminEmpresaDetalle';

const CATALOGO = {
  orden: ['PROFESIONAL'],
  funciones: [{ key: 'gps', label: 'Marcación por GPS / geocerca' }],
  planes: {
    PROFESIONAL: {
      id: 'PROFESIONAL', nombre: 'Profesional', limite: 40, precioMensual: 179900, precioAnual: 1799000,
      features: { gps: true },
    },
  },
};

const EMPRESA = {
  id: 'emp1', nombre: 'Tuercas & Pernos', nit: '900111222-1', email: 'gerencia@tuercas.co', telefono: null,
  marcadorToken: 'tok', exentaPago: false, activa: true, creadoEn: '2026-08-01T15:00:00.000Z',
  colaboradoresActivos: 5, tarifaMensual: 179900,
  capacidades: {
    plan: 'PROFESIONAL', nombrePlan: 'Profesional', ciclo: 'MENSUAL', limite: 40, ilimitado: false,
    features: { gps: true }, precioMensual: 179900, precioAnual: 1799000,
  },
  usuarios: [],
  suscripcion: {
    estadoEfectivo: 'ACTIVA', diasMora: 0, finPrueba: '2026-08-08T15:00:00.000Z', pagadoHasta: null,
    pagos: [], plan: 'PROFESIONAL', cicloPago: 'MENSUAL', limiteOverride: null,
    precioModo: null, precioFijo: null, precioTramo1: null, limiteTramo1: null, precioTramo2: null,
  },
};

const montar = (empresa: unknown = EMPRESA) => {
  get.mockReset();
  put.mockReset();
  get.mockImplementation((url: string) => {
    if (url === '/admin/empresas/emp1') return Promise.resolve({ data: empresa });
    if (url === '/admin/planes') return Promise.resolve({ data: CATALOGO });
    return Promise.reject(new Error('url inesperada: ' + url));
  });
  put.mockResolvedValue({ data: empresa });
  return render(
    <MemoryRouter initialEntries={['/admin/empresas/emp1']}>
      <Routes><Route path="/admin/empresas/:id" element={<AdminEmpresaDetalle />} /></Routes>
    </MemoryRouter>,
  );
};

const modo = () => screen.findByRole('combobox', { name: /modo de precio/i });
const guardar = () => screen.findByRole('button', { name: 'Guardar precio' });

beforeEach(() => { get.mockReset(); put.mockReset(); });

describe('AdminEmpresaDetalle · precio del cliente', () => {
  it('ofrece el precio del cliente en la ficha, y arranca en el global', async () => {
    montar();
    expect(await modo()).toHaveValue('GLOBAL');
  });

  it('muestra el precio propio que la empresa ya tiene', async () => {
    montar({
      ...EMPRESA,
      suscripcion: { ...EMPRESA.suscripcion, precioModo: 'FIJO', precioFijo: 250000 },
    });
    expect(await modo()).toHaveValue('FIJO');
    expect(screen.getByRole('textbox', { name: /valor fijo mensual/i })).toHaveValue('250.000');
  });

  it('guarda un precio fijo escrito a mano', async () => {
    const u = userEvent.setup();
    montar();
    await u.selectOptions(await modo(), 'FIJO');
    await u.type(screen.getByRole('textbox', { name: /valor fijo mensual/i }), '300000');
    await u.click(await guardar());
    expect(put).toHaveBeenCalledWith('/admin/empresas/emp1/precio', {
      modo: 'FIJO', precioFijo: 300000, precioTramo1: 0, limiteTramo1: 0, precioTramo2: 0,
    });
  });

  // Volver al global es lo que BORRA el precio propio en el servidor, así que
  // tiene que poder guardarse igual que los otros dos modos.
  it('volver al precio global se guarda y deja de ser un precio propio', async () => {
    const u = userEvent.setup();
    montar({
      ...EMPRESA,
      suscripcion: { ...EMPRESA.suscripcion, precioModo: 'FIJO', precioFijo: 250000 },
    });
    await u.selectOptions(await modo(), 'GLOBAL');
    await u.click(await guardar());
    expect(put).toHaveBeenCalledWith('/admin/empresas/emp1/precio', expect.objectContaining({ modo: 'GLOBAL' }));
  });

  // Igual que «Plan y funciones»: a quien tiene acceso ilimitado de cortesía no
  // se le cobra, así que ofrecerle un precio propio es ofrecer algo que no rige.
  it('a una empresa con acceso ilimitado no se le ofrece precio propio', async () => {
    montar({ ...EMPRESA, exentaPago: true });
    // Se espera por el encabezado, que es de UN solo elemento: «acceso
    // ilimitado» sale dos veces en la tarjeta del plan y la espera pasaba por
    // un texto ambiguo.
    expect(await screen.findByRole('heading', { name: 'Tuercas & Pernos' })).toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: /modo de precio/i })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Guardar precio' })).toBeNull();
  });
});
