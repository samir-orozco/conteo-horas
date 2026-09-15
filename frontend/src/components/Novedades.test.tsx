import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Novedades from './Novedades';
import { vistaKey, apagadoKey, guiaKey } from './novedadesVisibles';

const usuario = { id: 'u1', rol: 'ADMIN', nombre: 'Sam' };
vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ usuario }) }));
vi.mock('react-router-dom', () => ({ useNavigate: () => vi.fn() }));

// Lo que el cliente ve cuando entra y hay novedades. La decisión de mostrarlas
// se prueba aparte en novedadesVisibles.test.ts; aquí importa el contenido y
// que la casilla de "no volver a mostrar" de verdad quede guardada.

beforeEach(() => {
  localStorage.clear();
  // Ya pasó por el video de bienvenida: sin eso las novedades no se abren.
  localStorage.setItem(guiaKey(usuario.id), '1');
});

const avanzar = async (veces: number) => {
  for (let i = 0; i < veces; i++) await userEvent.click(screen.getByRole('button', { name: /continuar/i }));
};

describe('Novedades', () => {
  it('se abre sola y arranca por lo más reciente', () => {
    // Decisión del dueño del 14 de septiembre de 2026: lo nuevo va primero y lo
    // anterior se queda detrás, en vez de reemplazarse.
    render(<Novedades />);
    expect(screen.getByText('Novedades de HoraPro')).toBeInTheDocument();
    expect(screen.getByText(/registra su rostro desde su celular/i)).toBeInTheDocument();
  });

  it('cuenta las diez novedades: las de los últimos despliegues primero y las de antes detrás', async () => {
    render(<Novedades />);
    const titulos = [
      /registra su rostro desde su celular/i,
      /te dice hacia dónde girar/i,
      /hasta tres descansos/i,
      /jornada completa de un solo paso/i,
      /el detalle de la jornada, parte por parte/i,
      /tus contratos avisan/i,
      /quien trabaja desde la casa/i,
      /sube todo tu equipo con un excel/i,
      /su historia completa/i,
      /encuentra a quien buscas/i,
    ];
    for (let i = 0; i < titulos.length; i++) {
      expect(screen.getByText(titulos[i])).toBeInTheDocument();
      if (i < titulos.length - 1) await avanzar(1);
    }
    // En la última el botón deja de invitar a seguir.
    expect(screen.getByRole('button', { name: /listo/i })).toBeInTheDocument();
  });

  it('quien ya vio el lote de septiembre las vuelve a ver, porque hay novedades nuevas', () => {
    // La llave del lote anterior, escrita tal cual la guardaba el navegador.
    localStorage.setItem(`horapro_novedades_2026-09_${usuario.id}`, '1');
    render(<Novedades />);
    expect(screen.getByText('Novedades de HoraPro')).toBeInTheDocument();
  });

  it('al cerrarlas quedan como vistas, para no repetirlas en cada pantalla', async () => {
    render(<Novedades />);
    await userEvent.click(screen.getByRole('button', { name: /cerrar/i }));
    expect(localStorage.getItem(vistaKey(usuario.id))).toBe('1');
    expect(localStorage.getItem(apagadoKey(usuario.id))).toBeNull();
  });

  it('la casilla de no volver a mostrar se respeta al cerrar', async () => {
    render(<Novedades />);
    await userEvent.click(screen.getByLabelText(/no volver a mostrarme las novedades/i));
    await userEvent.click(screen.getByRole('button', { name: /cerrar/i }));
    expect(localStorage.getItem(apagadoKey(usuario.id))).toBe('1');
  });

  it('marcar la casilla y NO cerrar no apaga nada', async () => {
    // La decisión se guarda al cerrar, no al tocar la casilla: quien la marca
    // por curiosidad y sigue leyendo no debería perder las próximas.
    render(<Novedades />);
    await userEvent.click(screen.getByLabelText(/no volver a mostrarme las novedades/i));
    expect(localStorage.getItem(apagadoKey(usuario.id))).toBeNull();
  });

  it('no se repite a quien ya vio este lote', () => {
    localStorage.setItem(vistaKey(usuario.id), '1');
    const { container } = render(<Novedades />);
    expect(container).toBeEmptyDOMElement();
  });

  it('pero se abre igual si la pide desde el menú', () => {
    localStorage.setItem(vistaKey(usuario.id), '1');
    render(<Novedades forzado />);
    expect(screen.getByText('Novedades de HoraPro')).toBeInTheDocument();
  });
});
