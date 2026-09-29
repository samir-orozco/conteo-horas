import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Toast, { AvisoFlotante, PilaDeAvisos } from './Toast';

// LOS AVISOS FLOTANTES (28 de septiembre de 2026, para igualar la maqueta).
//
// El que había era una barra oscura de una línea que se iba a los 2,5 segundos: servía para decir
// «Guardado» y nada más. La programación en bloque necesita otra cosa, y no por estética: su aviso
// LLEVA DENTRO EL DESHACER, que es la única marcha atrás de una escritura de cientos de filas.
//
// DE AHÍ SALE LA ÚNICA REGLA DE COMPORTAMIENTO QUE HAY AQUÍ: el reloj se para mientras el puntero
// está encima. Una red de seguridad que se evapora mientras la estás leyendo no es una red. Es lo
// que hace la maqueta y es lo que estas pruebas afirman.
//
// ES UN SOLO COMPONENTE PARA TODA LA APP y no uno nuevo al lado: cuatro pantallas ya usaban `Toast`
// con la forma simple, y dos diseños de aviso conviviendo son dos verdades sobre cómo avisa este
// producto (CLAUDE.md §9.3). La forma simple sigue funcionando: el mensaje pasa a ser el título.

// `shouldAdvanceTime` NO ES OPCIONAL AQUÍ, y ya estaba aprendido en esta suite: el comentario de
// `CalendarioDeTurnos.planificar.test.tsx` lo cuenta. Un reloj falso a secas congela el que usan
// `userEvent` y los `findBy*` para sondear, y las pruebas se cuelgan cinco segundos cada una. Cuatro
// tiempos agotados parecen un rojo del componente y no dicen nada de él.
beforeEach(() => { vi.useFakeTimers({ shouldAdvanceTime: true }); });
afterEach(() => { vi.useRealTimers(); });

const persona = () => userEvent.setup({ advanceTimers: (ms: number) => vi.advanceTimersByTime(ms) });

const correr = async (ms: number) => {
  await act(async () => { vi.advanceTimersByTime(ms); });
};

describe('un aviso flotante', () => {
  it('dice su título y su texto', () => {
    render(<AvisoFlotante tipo="ok" titulo="Programación deshecha"
      texto="La semana quedó como estaba antes de aplicar." onCerrar={() => {}} />);
    expect(screen.getByText('Programación deshecha')).toBeInTheDocument();
    expect(screen.getByText('La semana quedó como estaba antes de aplicar.')).toBeInTheDocument();
  });

  it('se anuncia como estado, no como diálogo', () => {
    // `role="status"` y no `alert`: un lector de pantalla lo lee al terminar lo que esté diciendo, en
    // vez de interrumpir. Un aviso de «ya está hecho» no es una interrupción.
    render(<AvisoFlotante tipo="ok" titulo="Listo" onCerrar={() => {}} />);
    expect(screen.getByRole('status')).toHaveTextContent('Listo');
  });

  it('la equis lo cierra', async () => {
    const cerrar = vi.fn();
    const usuario = persona();
    render(<AvisoFlotante tipo="ok" titulo="Listo" onCerrar={cerrar} />);
    await usuario.click(screen.getByRole('button', { name: /cerrar aviso/i }));
    expect(cerrar).toHaveBeenCalledTimes(1);
  });

  it('el botón de acción hace lo suyo Y CIERRA, para que no quede colgando', async () => {
    const deshacer = vi.fn();
    const cerrar = vi.fn();
    const usuario = persona();
    render(<AvisoFlotante tipo="aviso" titulo="Se detuvo la programación"
      accion={{ texto: 'Deshacer esta programación', al: deshacer }} onCerrar={cerrar} />);
    await usuario.click(screen.getByRole('button', { name: 'Deshacer esta programación' }));
    expect(deshacer).toHaveBeenCalledTimes(1);
    expect(cerrar).toHaveBeenCalledTimes(1);
  });

  it('sin acción no dibuja ningún botón que no sea el de cerrar', () => {
    render(<AvisoFlotante tipo="ok" titulo="Listo" onCerrar={() => {}} />);
    expect(screen.getAllByRole('button')).toHaveLength(1);
  });

  it('se va solo a los diez segundos', async () => {
    const cerrar = vi.fn();
    render(<AvisoFlotante tipo="ok" titulo="Listo" onCerrar={cerrar} />);
    await correr(9_000);
    expect(cerrar).not.toHaveBeenCalled();
    await correr(1_500);
    expect(cerrar).toHaveBeenCalledTimes(1);
  });

  it('EL RELOJ SE PARA CON EL PUNTERO ENCIMA, que es la razón de ser de este componente', async () => {
    // Sin esto, el «Deshacer esta programación» desaparece mientras alguien lee el aviso que lo
    // ofrece. La marcha atrás de cientos de filas no puede depender de leer rápido.
    const cerrar = vi.fn();
    const usuario = persona();
    render(<AvisoFlotante tipo="aviso" titulo="Se detuvo la programación"
      accion={{ texto: 'Deshacer esta programación', al: () => {} }} onCerrar={cerrar} />);

    await usuario.hover(screen.getByRole('status'));
    await correr(30_000);
    expect(cerrar, 'con el puntero encima no se va nunca').not.toHaveBeenCalled();

    await usuario.unhover(screen.getByRole('status'));
    await correr(3_000);
    expect(cerrar, 'al retirar el puntero vuelve a contar').toHaveBeenCalledTimes(1);
  });
});

describe('la forma simple, la que ya usaban cuatro pantallas', () => {
  it('con un mensaje, lo muestra', () => {
    render(<Toast mensaje="Colaborador guardado" onClose={() => {}} />);
    expect(screen.getByText('Colaborador guardado')).toBeInTheDocument();
  });

  it('sin mensaje no dibuja nada', () => {
    const { container } = render(<Toast mensaje={null} onClose={() => {}} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('SE SIGUE YENDO A LOS 2,5 SEGUNDOS y no a los diez', async () => {
    // El aviso largo existe porque lleva el deshacer dentro. Un «Guardado» sin nada que hacer no
    // tiene por qué quedarse diez segundos tapando la esquina de la pantalla.
    const cerrar = vi.fn();
    render(<Toast mensaje="Guardado" onClose={cerrar} />);
    await correr(2_600);
    expect(cerrar).toHaveBeenCalledTimes(1);
  });
});

describe('la pila', () => {
  it('apila varios avisos a la vez', () => {
    render(<PilaDeAvisos
      avisos={[
        { id: 1, tipo: 'ok', titulo: 'Programación deshecha' },
        { id: 2, tipo: 'aviso', titulo: 'Se detuvo la programación' },
      ]}
      onCerrar={() => {}} />);
    expect(screen.getAllByRole('status')).toHaveLength(2);
  });

  it('cada uno se cierra por su id, no por su posición', async () => {
    // Por posición, cerrar el primero cerraría al de abajo en cuanto la lista cambie de orden.
    const cerrar = vi.fn();
    const usuario = persona();
    render(<PilaDeAvisos
      avisos={[
        { id: 7, tipo: 'ok', titulo: 'Primero' },
        { id: 9, tipo: 'aviso', titulo: 'Segundo' },
      ]}
      onCerrar={cerrar} />);
    await usuario.click(screen.getAllByRole('button', { name: /cerrar aviso/i })[1]);
    expect(cerrar).toHaveBeenCalledWith(9);
  });

  it('sin avisos no dibuja nada', () => {
    const { container } = render(<PilaDeAvisos avisos={[]} onCerrar={() => {}} />);
    expect(container).toBeEmptyDOMElement();
  });
});
