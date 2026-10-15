import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import ClimaSemana from './ClimaSemana';
import type { ClimaDelInicio } from '../types';

// LA TARJETA DEL CLIMA EN EL INICIO (15 de octubre de 2026). Decisiones del dueño: solo la ve el administrador
// (el servidor no la manda a nadie más); con la función, el clima de los últimos 7 días, cómo se sintieron y
// cuántas personas necesitan atención; sin ella, las MISMAS cifras sin nombres y la invitación a probarlo.

const VISTAZO = { total: 40, personas: 12, promedio: 3.84, variacion: 0.2, jornadas: 50, atencion: 3 };
const PRUEBA = { disponible: false, vigente: null, terminada: null, dias: 30 };
const ACTIVO: ClimaDelInicio = {
  estado: 'ACTIVO', desde: '2026-10-09', hasta: '2026-10-15', vistazo: VISTAZO,
  distribucion: { 1: 2, 2: 3, 3: 10, 4: 15, 5: 10 }, prueba: PRUEBA, casosAbiertos: 3,
};
const SIN_PLAN: ClimaDelInicio = { estado: 'SIN_PLAN', desde: '2026-10-09', hasta: '2026-10-15', vistazo: VISTAZO, prueba: { ...PRUEBA, disponible: true } };

function Destino() {
  const l = useLocation();
  return <p>Llegó a {l.pathname}{l.search}</p>;
}
const montar = (clima: ClimaDelInicio) => render(
  <MemoryRouter initialEntries={['/app']}>
    <Routes>
      <Route path="/app" element={<ClimaSemana clima={clima} />} />
      <Route path="*" element={<Destino />} />
    </Routes>
  </MemoryRouter>,
);
const tarjeta = () => screen.getByRole('region', { name: 'Clima laboral' });

describe('ClimaSemana', () => {
  it('con la función: el ánimo, la variación frente a los 7 días anteriores y quiénes respondieron', () => {
    montar(ACTIVO);
    const t = within(tarjeta());
    expect(t.getByText('3,8')).toBeInTheDocument();
    expect(t.getByText('▲ 0,2')).toBeInTheDocument();
    expect(t.getByText(/frente a los 7 días anteriores/)).toBeInTheDocument();
    expect(t.getByText('80 %')).toBeInTheDocument();
    expect(t.getByText('40 de 50 jornadas')).toBeInTheDocument();
    expect(t.getByText('últimos 7 días')).toBeInTheDocument();
  });

  it('con la función: cómo se sintieron, con la cantidad de cada carita escrita y no solo el color', () => {
    montar(ACTIVO);
    const reparto = within(screen.getByRole('list', { name: 'Cómo se sintieron' }));
    expect(reparto.getAllByRole('listitem').map(li => li.getAttribute('aria-label')))
      .toEqual(['Muy mal: 2', 'Mal: 3', 'Normal: 10', 'Bien: 15', 'Muy bien: 10']);
  });

  // A la pestaña Seguimiento y no al resumen: el resumen del panel las esconde si el mes no tiene respuestas, y
  // Seguimiento las muestra siempre, con su caso (verificación adversarial del 15 de octubre de 2026).
  it('con la función: las personas que necesitan atención llevan al seguimiento del clima', () => {
    montar(ACTIVO);
    fireEvent.click(screen.getByRole('button', { name: /3 personas necesitan atención/ }));
    expect(screen.getByText('Llegó a /app/clima?tab=seguimiento')).toBeInTheDocument();
  });

  it('con la función y nadie en atención, lo dice sin botón', () => {
    montar({ ...ACTIVO, vistazo: { ...VISTAZO, atencion: 0 } });
    expect(screen.queryByRole('button', { name: /necesita/ })).not.toBeInTheDocument();
    expect(screen.getByText('Nadie lleva tres respuestas malas seguidas')).toBeInTheDocument();
  });

  // «Necesita atención» no depende de los 7 días: es cómo está cada uno hoy. Una semana sin respuestas (vacaciones
  // colectivas, la pregunta apagada) no puede esconder a quien ya la necesitaba (revisión adversarial).
  it('sin respuestas en los 7 días, quien necesita atención sigue a la vista', () => {
    montar({ ...ACTIVO, vistazo: { ...VISTAZO, total: 0, personas: 0, promedio: null, variacion: null, atencion: 2 }, distribucion: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } });
    expect(screen.getByText('Nadie calificó su día en los últimos 7 días.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /2 personas necesitan atención/ })).toBeInTheDocument();
  });

  it('sin la función y sin respuestas en los 7 días, también dice cuántos necesitan atención', () => {
    montar({ ...SIN_PLAN, vistazo: { ...VISTAZO, total: 0, personas: 0, promedio: null, variacion: null, atencion: 2 } });
    expect(screen.getByText(/2 personas necesitan atención/)).toBeInTheDocument();
  });

  it('con la prueba gratis en curso, dice hasta cuándo', () => {
    montar({ ...ACTIVO, prueba: { ...PRUEBA, vigente: { hasta: '2026-11-13T05:00:00.000Z' } } });
    expect(screen.getByText(/Prueba gratis hasta el 12 de noviembre de 2026/)).toBeInTheDocument();
  });

  it('sin respuestas en los 7 días, lo dice en vez de pintar ceros', () => {
    montar({ ...ACTIVO, vistazo: { ...VISTAZO, total: 0, personas: 0, promedio: null, variacion: null, atencion: 0 }, distribucion: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } });
    expect(screen.getByText('Nadie calificó su día en los últimos 7 días.')).toBeInTheDocument();
    expect(screen.queryByRole('list', { name: 'Cómo se sintieron' })).not.toBeInTheDocument();
  });

  it('sin la función: las mismas cifras, sin el reparto ni a quién ver, y la invitación a la prueba', () => {
    montar(SIN_PLAN);
    const t = within(tarjeta());
    expect(t.getByText('3,8')).toBeInTheDocument();
    expect(t.getByText('80 %')).toBeInTheDocument();
    expect(t.getByText('Plan Empresarial')).toBeInTheDocument();
    expect(t.getByText(/3 personas necesitan atención/)).toBeInTheDocument();
    expect(t.queryByRole('button', { name: /necesitan atención/ })).not.toBeInTheDocument();
    expect(t.queryByRole('list', { name: 'Cómo se sintieron' })).not.toBeInTheDocument();
    fireEvent.click(t.getByRole('button', { name: 'Pruébalo gratis 30 días' }));
    expect(screen.getByText('Llegó a /app/clima')).toBeInTheDocument();
  });

  it('sin la función y con la prueba ya usada: cuándo terminó y subir de plan', () => {
    montar({ ...SIN_PLAN, prueba: { ...PRUEBA, terminada: { hasta: '2026-10-15T05:00:00.000Z' } } });
    expect(screen.getByText('Tu prueba gratis terminó el 14 de octubre de 2026.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Subir de plan/ }));
    expect(screen.getByText('Llegó a /app/configuracion?tab=suscripcion')).toBeInTheDocument();
  });

  it('sin la función y sin respuestas: qué es el clima, y la invitación', () => {
    montar({ ...SIN_PLAN, vistazo: { ...VISTAZO, total: 0, personas: 0, promedio: null, variacion: null, atencion: 0 } });
    expect(screen.getByText(/califica su día con una carita/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Pruébalo gratis 30 días' })).toBeInTheDocument();
  });
});
