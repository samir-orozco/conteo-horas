import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import TarjetaResena from './TarjetaResena';

// La tarjeta de una reseña, la misma en la landing y en la vista previa del super admin
// (docs/RESENAS.md, R25, R28, R40, R42 y R43).
//
// Lo que se cuida: que las estrellas sean las que la persona dio y no un cinco de adorno, que el
// texto de un cliente nunca se interprete como HTML, y que una anónima no deje ver de quién es.

const resena = {
  estrellas: 4,
  texto: 'Liquidar la nómina nos tomaba dos días.',
  nombre: 'Mateo Vera',
  detalle: 'CEO Grupo MSM',
};

describe('la tarjeta de una reseña', () => {
  it('muestra el comentario, el nombre y el detalle', () => {
    render(<TarjetaResena {...resena} />);
    expect(screen.getByText(/Liquidar la nómina nos tomaba dos días\./)).toBeInTheDocument();
    expect(screen.getByText('Mateo Vera')).toBeInTheDocument();
    expect(screen.getByText('CEO Grupo MSM')).toBeInTheDocument();
  });

  // R40: un lector de pantalla oye la calificación; los dibujos de las estrellas no le dicen nada.
  it('dice cuántas estrellas tiene, para quien no las ve', () => {
    render(<TarjetaResena {...resena} />);
    expect(screen.getByText('4 de 5 estrellas')).toBeInTheDocument();
  });

  // R40: las estrellas REALES. Las tres de hoy pintaban cinco fijas.
  it('pinta llenas solo las estrellas que dio', () => {
    render(<TarjetaResena {...resena} />);
    const estrellas = screen.getByTestId('estrellas');
    expect(estrellas.querySelectorAll('[data-llena="true"]')).toHaveLength(4);
    expect(estrellas.querySelectorAll('[data-llena="false"]')).toHaveLength(1);
  });

  it('con una estrella, una sola llena', () => {
    render(<TarjetaResena {...resena} estrellas={1} />);
    expect(screen.getByText('1 de 5 estrellas')).toBeInTheDocument();
    expect(screen.getByTestId('estrellas').querySelectorAll('[data-llena="true"]')).toHaveLength(1);
  });

  // R28: si la fuente no traía calificación, poner estrellas es fabricar un dato.
  it('sin calificación no muestra estrellas ni las anuncia', () => {
    render(<TarjetaResena {...resena} estrellas={null} />);
    expect(screen.queryByTestId('estrellas')).not.toBeInTheDocument();
    expect(screen.queryByText(/de 5 estrellas/)).not.toBeInTheDocument();
  });

  // R43: el texto del cliente es texto. Si se interpretara como HTML, cualquiera que mande una
  // reseña podría ejecutar código en la landing el día que el dueño la publique.
  it('un texto con etiquetas se ve literal y no se convierte en HTML', () => {
    const malicioso = '<img src=x onerror=alert(1)>';
    const { container } = render(<TarjetaResena {...resena} texto={malicioso} />);
    expect(screen.getByText(malicioso, { exact: false })).toBeInTheDocument();
    expect(container.querySelector('img')).toBeNull();
  });

  // R43: con sus saltos de línea. Sin `pre-line`, un comentario en dos párrafos sale pegado.
  it('conserva los saltos de línea del comentario', () => {
    render(<TarjetaResena {...resena} texto={'Primera línea.\nSegunda línea.'} />);
    const cita = screen.getByText(/Primera línea\./);
    expect(cita.textContent).toContain('Primera línea.\nSegunda línea.');
    expect(cita).toHaveStyle({ whiteSpace: 'pre-line' });
  });

  it('las iniciales salen del nombre y no le hablan al lector de pantalla', () => {
    render(<TarjetaResena {...resena} />);
    expect(screen.getByText('MV')).toHaveAttribute('aria-hidden', 'true');
  });

  it('las iniciales son del primer nombre y del último apellido, en mayúscula', () => {
    render(<TarjetaResena {...resena} nombre="  juan carlos   pérez  " />);
    expect(screen.getByText('JP')).toBeInTheDocument();
  });

  it('con una sola palabra, una sola inicial, y con tilde si la tiene', () => {
    render(<TarjetaResena {...resena} nombre="Ángela" />);
    expect(screen.getByText('Á')).toBeInTheDocument();
  });

  it('un nombre vacío no revienta la tarjeta', () => {
    render(<TarjetaResena {...resena} nombre="   " />);
    expect(screen.getByText(/Liquidar la nómina/)).toBeInTheDocument();
  });

  // R42: de una anónima no viaja ni el nombre ni las iniciales. «CH» serían las iniciales de
  // «Cliente de HoraPro», que parecen las de una persona de verdad.
  it('la anónima lleva un ícono y no unas iniciales inventadas', () => {
    render(<TarjetaResena estrellas={5} texto="Muy bueno." nombre="Cliente de HoraPro" detalle={null} />);
    expect(screen.getByText('Cliente de HoraPro')).toBeInTheDocument();
    expect(screen.queryByText('CH')).not.toBeInTheDocument();
    expect(screen.queryByText('CD')).not.toBeInTheDocument();
    expect(screen.getByTestId('icono-anonimo')).toBeInTheDocument();
  });

  it('sin detalle no deja una línea vacía debajo del nombre', () => {
    const { container } = render(<TarjetaResena {...resena} detalle={null} />);
    expect(container.querySelector('[data-detalle]')).toBeNull();
  });

  // docs/RESENAS.md §10.4: `useReveal` solo anima lo que existe al cargar la página. Las tarjetas
  // llegan después, del servidor, y con esa clase se quedarían invisibles. Es la única consulta por
  // clase de este archivo, y es a propósito: el defecto ES la clase.
  it('no lleva la clase de aparición al bajar, que la dejaría invisible', () => {
    const { container } = render(<TarjetaResena {...resena} />);
    expect(container.querySelector('.hp-reveal')).toBeNull();
  });
});
