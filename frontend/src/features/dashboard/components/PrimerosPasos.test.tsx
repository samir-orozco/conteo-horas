import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import PrimerosPasos from './PrimerosPasos';

// LA TARJETA «PRIMEROS PASOS» DEL INICIO (14 de octubre de 2026).

const PASOS = [
  { clave: 'SEDE', hecho: true },
  { clave: 'HORARIO', hecho: true },
  { clave: 'TRABAJADOR', hecho: false },
  { clave: 'ROSTRO', hecho: false },
  { clave: 'MARCACION', hecho: false },
];

function Destino() {
  const { pathname, search } = useLocation();
  return <p>Llegó a {pathname}{search}</p>;
}

function montar(pasos = PASOS) {
  return render(
    <MemoryRouter initialEntries={['/app']}>
      <Routes>
        <Route path="/app" element={<PrimerosPasos pasos={pasos} />} />
        <Route path="*" element={<Destino />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('PrimerosPasos', () => {
  it('dice cuántos pasos lleva', () => {
    montar();
    expect(screen.getByRole('heading', { name: 'Primeros pasos' })).toBeInTheDocument();
    expect(screen.getByText('2 de 5')).toBeInTheDocument();
  });

  it('distingue los hechos de los que faltan', () => {
    montar();
    expect(screen.getByRole('button', { name: /Hecho: Tu sede principal ya está creada/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Hecho: Crea tu horario/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Agrega un trabajador/ })).not.toHaveAccessibleName(/Hecho/);
  });

  it('cada paso lleva a donde se hace', () => {
    montar();
    fireEvent.click(screen.getByRole('button', { name: /Haz la primera marcación en el kiosco/ }));
    expect(screen.getByText('Llegó a /app/kiosco')).toBeInTheDocument();
  });

  it('la sede lleva a revisarla en Configuración', () => {
    montar();
    fireEvent.click(screen.getByRole('button', { name: /Tu sede principal/ }));
    expect(screen.getByText('Llegó a /app/configuracion?tab=sedes')).toBeInTheDocument();
  });
});
