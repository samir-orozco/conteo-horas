import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
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
    expect(screen.getByText(/el kiosco confirma quién marca/i)).toBeInTheDocument();
  });

  it('cuenta las quince novedades: las de los últimos despliegues primero y las de antes detrás', async () => {
    render(<Novedades />);
    const titulos = [
      // Lote del 3 de octubre de 2026: la confirmación del kiosco, en UNA sola vista (pedido del dueño).
      /el kiosco confirma quién marca/i,
      // Despliegue del 30 de septiembre de 2026: el módulo de turnos.
      /programa los turnos de tu equipo/i,
      /marca un bloque de celdas/i,
      /antes de que una programación salga cara/i,
      /ya no se llama «dominical»/i,
      // Y lo anterior, que se queda detrás.
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

  // Cuatro puntos y no quince: el cuarto queda en gris —«hay más»— hasta la última
  // (puntosDeNovedades.ts tiene la regla; aquí, que la ventana la use).
  it('muestra cuatro puntos, y el cuarto solo se activa en la última novedad', async () => {
    render(<Novedades />);
    const fila = () => screen.getByRole('img', { name: /^novedad \d+ de 15$/i });
    const activo = () => [...fila().children].findIndex(p => p.getAttribute('aria-current') === 'step');
    expect(fila()).toHaveAccessibleName('Novedad 1 de 15');
    expect(fila().children).toHaveLength(4);
    expect(activo()).toBe(0);
    await avanzar(13);
    expect(fila()).toHaveAccessibleName('Novedad 14 de 15');
    expect(fila().children).toHaveLength(4);
    expect(activo()).toBe(2);
    await avanzar(1);
    expect(activo()).toBe(3);
  });

  // «Listo» mide lo que «Continuar» porque va encimado sobre un «Continuar» invisible. Ese texto
  // de relleno no puede colarse en lo que oye un lector de pantalla.
  it('el botón se llama solo «Continuar», y en la última solo «Listo»', async () => {
    render(<Novedades />);
    expect(screen.getByRole('button', { name: 'Continuar' })).toBeInTheDocument();
    await avanzar(14);
    expect(screen.getByRole('button', { name: 'Listo' })).toBeInTheDocument();
  });

  it('quien ya vio el lote de septiembre las vuelve a ver, porque hay novedades nuevas', () => {
    // La llave del lote anterior, escrita tal cual la guardaba el navegador.
    localStorage.setItem(`horapro_novedades_2026-09_${usuario.id}`, '1');
    render(<Novedades />);
    expect(screen.getByText('Novedades de HoraPro')).toBeInTheDocument();
  });

  it('quien ya vio el lote de turnos las vuelve a ver, porque llegó la del kiosco', () => {
    localStorage.setItem(`horapro_novedades_2026-09-30_${usuario.id}`, '1');
    render(<Novedades />);
    expect(screen.getByText(/el kiosco confirma quién marca/i)).toBeInTheDocument();
  });

  // UN CLIC POR FUERA YA NO LA CIERRA (3 de octubre de 2026, pedido del dueño). Al pasar de una
  // novedad a otra la ventana cambia de alto, el botón «Continuar» se mueve, y el clic que iba para
  // él caía en el fondo: la ventana se cerraba, quedaba como vista, y quien no sabe dónde están las
  // novedades en el menú no las volvía a encontrar. Ahora se cierra solo con la X (o con «Listo»).
  it('un clic por fuera no la cierra ni la da por vista', async () => {
    render(<Novedades />);
    await userEvent.click(screen.getByTestId('fondo'));
    expect(screen.getByText('Novedades de HoraPro')).toBeInTheDocument();
    expect(screen.getByText(/el kiosco confirma quién marca/i)).toBeInTheDocument();
    expect(localStorage.getItem(vistaKey(usuario.id))).toBeNull();
  });

  // La sacudida es solo movimiento, así que la prueba mira la marca `data-sacudiendo` del envoltorio
  // y no la clase de CSS (CLAUDE.md §7). Que esa marca de verdad mueva la ventana se comprobó en el
  // navegador: la animación que corre es hp-sacudida.
  const envoltorio = () => screen.getByTestId('fondo').firstElementChild as HTMLElement;
  // jsdom no tiene AnimationEvent, y entonces React escucha «webkitAnimationEnd»; un navegador de
  // verdad manda «animationend». Se disparan los dos para no depender del entorno.
  const terminarAnimacion = (el: Element) => {
    fireEvent.animationEnd(el);
    fireEvent(el, new Event('webkitAnimationEnd', { bubbles: true }));
  };

  it('un clic por fuera la sacude', async () => {
    render(<Novedades />);
    expect(envoltorio()).not.toHaveAttribute('data-sacudiendo');
    await userEvent.click(screen.getByTestId('fondo'));
    expect(envoltorio()).toHaveAttribute('data-sacudiendo');
  });

  it('un clic dentro no la sacude', async () => {
    render(<Novedades />);
    await userEvent.click(screen.getByText(/el kiosco confirma quién marca/i));
    await avanzar(1);
    expect(envoltorio()).not.toHaveAttribute('data-sacudiendo');
  });

  // Seleccionar texto con el ratón y soltar fuera: el navegador manda el clic al fondo, y la ventana
  // se sacudía sin que nadie lo hubiera pedido.
  it('seleccionar texto y soltar fuera no la sacude', () => {
    render(<Novedades />);
    fireEvent.pointerDown(screen.getByText(/el kiosco confirma quién marca/i));
    fireEvent.click(screen.getByTestId('fondo'));
    expect(envoltorio()).not.toHaveAttribute('data-sacudiendo');
  });

  it('la animación de entrada no corta la sacudida, y al terminar la suya se puede volver a sacudir', async () => {
    render(<Novedades />);
    await userEvent.click(screen.getByTestId('fondo'));
    // La de entrada de la ventana burbujea hasta el envoltorio.
    terminarAnimacion(envoltorio().firstElementChild!);
    expect(envoltorio()).toHaveAttribute('data-sacudiendo');
    terminarAnimacion(envoltorio());
    expect(envoltorio()).not.toHaveAttribute('data-sacudiendo');
    await userEvent.click(screen.getByTestId('fondo'));
    expect(envoltorio()).toHaveAttribute('data-sacudiendo');
  });

  it('un clic por fuera no le hace perder la novedad en la que iba', async () => {
    render(<Novedades />);
    await avanzar(2);
    await userEvent.click(screen.getByTestId('fondo'));
    expect(screen.getByText(/marca un bloque de celdas/i)).toBeInTheDocument();
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

  // El de turnos se le mostró a todos (LOTE_INELUDIBLE); el del kiosco respeta a quien las apagó.
  it('a quien apagó las novedades no le salta el lote del kiosco', () => {
    localStorage.setItem(apagadoKey(usuario.id), '1');
    const { container } = render(<Novedades />);
    expect(container).toBeEmptyDOMElement();
  });

  it('pero se abre igual si la pide desde el menú', () => {
    localStorage.setItem(vistaKey(usuario.id), '1');
    render(<Novedades forzado />);
    expect(screen.getByText('Novedades de HoraPro')).toBeInTheDocument();
  });
});
