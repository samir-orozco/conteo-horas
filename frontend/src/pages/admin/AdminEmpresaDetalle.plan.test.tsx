import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

// «Plan y funciones» en la ficha de una empresa del super admin (15 de septiembre de 2026). La lista
// de funciones, los cupos, los precios y lo que trae cada plan salen del servidor, igual que en
// «Precios». Antes estaban copiados a mano en esta pantalla: faltaba «Varias sedes», y lo que se
// cambiara en «Precios» hacía que al guardar se inventaran extras.

const { get, put } = vi.hoisted(() => ({ get: vi.fn(), put: vi.fn() }));
vi.mock('../../lib/api', () => ({
  default: { get: (...a: unknown[]) => get(...a), put: (...a: unknown[]) => put(...a), post: vi.fn(), delete: vi.fn() },
}));
// El recibo arrastra la librería de PDF, que aquí no hace falta.
vi.mock('../../lib/recibo', () => ({ descargarReciboPDF: vi.fn() }));

import AdminEmpresaDetalle from './AdminEmpresaDetalle';

const CATALOGO = {
  orden: ['ESENCIAL', 'PROFESIONAL', 'EMPRESARIAL'],
  funciones: [
    { key: 'gps', label: 'Marcación por GPS / geocerca' },
    { key: 'telegram', label: 'Alertas por Telegram' },
    { key: 'multiSede', label: 'Varias sedes' },
    { key: 'siigo', label: 'Integración Siigo', proximamente: true },
  ],
  planes: {
    ESENCIAL: { id: 'ESENCIAL', nombre: 'Esencial', limite: 10, precioMensual: 99900, precioAnual: 999000, features: { gps: false, telegram: false, multiSede: false, siigo: false } },
    // Como quedó en «Precios»: otro precio, otro cupo y sin Telegram.
    PROFESIONAL: { id: 'PROFESIONAL', nombre: 'Profesional', limite: 40, precioMensual: 179900, precioAnual: 1799000, features: { gps: true, telegram: false, multiSede: false, siigo: false } },
    EMPRESARIAL: { id: 'EMPRESARIAL', nombre: 'Empresarial', limite: 150, precioMensual: 299900, precioAnual: 2999000, features: { gps: true, telegram: true, multiSede: true, siigo: true } },
  },
};

const EMPRESA = {
  id: 'emp1', nombre: 'Tuercas & Pernos', nit: '900111222-1', email: 'gerencia@tuercas.co', telefono: null,
  marcadorToken: 'tok', exentaPago: false, activa: true, creadoEn: '2026-08-01T15:00:00.000Z',
  colaboradoresActivos: 5, tarifaMensual: 179900,
  capacidades: {
    plan: 'PROFESIONAL', nombrePlan: 'Profesional', ciclo: 'MENSUAL', limite: 40, ilimitado: false,
    features: { ...CATALOGO.planes.PROFESIONAL.features }, precioMensual: 179900, precioAnual: 1799000,
  },
  usuarios: [],
  suscripcion: {
    estadoEfectivo: 'ACTIVA', diasMora: 0, finPrueba: '2026-08-08T15:00:00.000Z', pagadoHasta: '2026-10-01T05:00:00.000Z',
    pagos: [], plan: 'PROFESIONAL', cicloPago: 'MENSUAL', limiteOverride: null,
  },
};

beforeEach(() => {
  get.mockReset();
  put.mockReset();
  get.mockImplementation((url: string) => {
    if (url === '/admin/empresas/emp1') return Promise.resolve({ data: EMPRESA });
    if (url === '/admin/planes') return Promise.resolve({ data: CATALOGO });
    return Promise.reject(new Error('url inesperada: ' + url));
  });
  put.mockResolvedValue({ data: EMPRESA });
});

const abrir = () => render(
  <MemoryRouter initialEntries={['/admin/empresas/emp1']}>
    <Routes><Route path="/admin/empresas/:id" element={<AdminEmpresaDetalle />} /></Routes>
  </MemoryRouter>,
);
const casilla = (nombre: RegExp) => screen.findByRole('checkbox', { name: nombre });

describe('AdminEmpresaDetalle · plan y funciones', () => {
  it('muestra Varias sedes entre las funciones que se pueden activar', async () => {
    abrir();
    expect(await casilla(/varias sedes/i)).not.toBeChecked();
  });

  it('guardar sin tocar nada no inventa extras, aunque el plan se haya cambiado en Precios', async () => {
    const u = userEvent.setup();
    abrir();
    await u.click(await screen.findByRole('button', { name: 'Guardar plan' }));
    expect(put).toHaveBeenCalledWith('/admin/empresas/emp1/plan', {
      plan: 'PROFESIONAL', cicloPago: 'MENSUAL', limiteOverride: null, funcionesOverride: null,
    });
  });

  it('marcar Varias sedes en Profesional la deja como extra y la guarda así', async () => {
    const u = userEvent.setup();
    abrir();
    await u.click(await casilla(/varias sedes/i));
    expect(within(screen.getByRole('checkbox', { name: /varias sedes/i }).closest('label')!).getByText('EXTRA')).toBeInTheDocument();
    // Lo que ya trae el plan no es extra aunque esté marcado.
    expect(within(screen.getByRole('checkbox', { name: /gps/i }).closest('label')!).queryByText('EXTRA')).toBeNull();
    await u.click(screen.getByRole('button', { name: 'Guardar plan' }));
    expect(put).toHaveBeenCalledWith('/admin/empresas/emp1/plan', expect.objectContaining({ funcionesOverride: { multiSede: true } }));
  });

  it('Siigo dice Próximamente y no se puede marcar', async () => {
    abrir();
    const siigo = await casilla(/integración siigo/i);
    expect(siigo).toBeDisabled();
    expect(within(siigo.closest('label')!).getByText(/próximamente/i)).toBeInTheDocument();
  });

  it('el selector muestra los precios de Precios, y al cambiar de plan trae su cupo y sus funciones', async () => {
    const u = userEvent.setup();
    abrir();
    const selector = await screen.findByDisplayValue(/profesional/i);
    expect(within(selector).getByRole('option', { name: /profesional/i })).toHaveTextContent(/179\.900/);
    await u.selectOptions(selector, 'EMPRESARIAL');
    expect(screen.getByDisplayValue('150')).toBeInTheDocument();
    expect(await casilla(/varias sedes/i)).toBeChecked();
    expect(screen.getByRole('checkbox', { name: /alertas por telegram/i })).toBeChecked();
  });
});
