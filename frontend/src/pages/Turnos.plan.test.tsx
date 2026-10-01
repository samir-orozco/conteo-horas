import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Turnos from './Turnos';

// ────────── EL MÓDULO DE TURNOS ES DEL PLAN EMPRESARIAL (30 de septiembre de 2026) ──────────
//
// Decisión del dueño antes de desplegarlo. Y con su forma: el ítem SIGUE en el menú para quien no lo
// tiene, y es al entrar cuando se le ofrece subir de plan. Es el patrón que ya usan Reportes, Sedes y
// Conexiones, y la razón es de venta: a lo que no se ve nadie le pide acceso.
//
// Lo que se prueba es lo que ve una persona: o la rejilla, o la tarjeta con el botón de subir de plan.
// Nunca las dos, que sería enseñar el calendario y cobrarlo al mismo tiempo.

vi.mock('../lib/plan', () => ({ useMiPlan: () => mockPlan() }));
vi.mock('./turnos/CalendarioDeTurnos', () => ({ default: () => <div>LA REJILLA DE TURNOS</div> }));
vi.mock('./turnos/CatalogoDeTurnos', () => ({ default: () => <div>EL CATALOGO</div> }));

let mockPlan: () => { plan: { features: Record<string, boolean> } | null };
beforeEach(() => { mockPlan = () => ({ plan: { features: { turnos: true } } }); });

const montar = () => render(<MemoryRouter><Turnos /></MemoryRouter>);

describe('Turnos y el plan', () => {
  it('con la función en su plan, se ve el calendario', () => {
    montar();
    expect(screen.getByText('LA REJILLA DE TURNOS')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /subir de plan/i })).toBeNull();
  });

  it('sin la función, NO se ve el calendario y se ofrece subir de plan', () => {
    mockPlan = () => ({ plan: { features: { turnos: false } } });
    montar();
    expect(screen.queryByText('LA REJILLA DE TURNOS')).toBeNull();
    expect(screen.getByRole('button', { name: /subir de plan/i })).toBeInTheDocument();
    // Y dice de qué plan es, que es lo que convierte el bloqueo en una oferta.
    expect(screen.getByText(/empresarial/i)).toBeInTheDocument();
  });

  it('tampoco se cuela por la pestaña del catálogo', () => {
    // Las dos pestañas son el mismo módulo. Bloquear solo el calendario dejaría entrar por la otra
    // puerta a crear turnos, que es la mitad del módulo.
    mockPlan = () => ({ plan: { features: { turnos: false } } });
    render(<MemoryRouter initialEntries={['/app/turnos?tab=catalogo']}><Turnos /></MemoryRouter>);
    expect(screen.queryByText('EL CATALOGO')).toBeNull();
    expect(screen.getByRole('button', { name: /subir de plan/i })).toBeInTheDocument();
  });

  it('mientras el plan no ha cargado NO se bloquea, para no parpadear un candado a quien sí lo tiene', () => {
    // `useMiPlan` arranca en null y resuelve después. Bloquear con null le enseñaría la tarjeta de
    // «sube de plan» durante un instante a un cliente Empresarial cada vez que entra.
    mockPlan = () => ({ plan: null });
    montar();
    expect(screen.getByText('LA REJILLA DE TURNOS')).toBeInTheDocument();
  });
});
