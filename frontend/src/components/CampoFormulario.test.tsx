import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import CampoFormulario from './CampoFormulario';

// El rótulo y su explicación van a la izquierda, el control a la derecha.
//
// Lo que importa aquí no es cómo se ve sino que el rótulo quede ATADO al
// control: si son dos cajas sueltas que solo están cerca, tocar el texto no
// enfoca el campo y un lector de pantalla lee un input sin nombre.

describe('CampoFormulario', () => {
  it('el rótulo enfoca el control al tocarlo', () => {
    render(
      <CampoFormulario rotulo="Cédula" descripcion="Con la que marca en el kiosco">
        {(id) => <input id={id} />}
      </CampoFormulario>,
    );
    // getByLabelText solo lo encuentra si la asociación existe de verdad.
    expect(screen.getByLabelText('Cédula')).toBeInTheDocument();
  });

  it('muestra la explicación, que es lo que evita la duda antes de preguntar', () => {
    render(
      <CampoFormulario rotulo="Cédula" descripcion="Con la que marca en el kiosco">
        {(id) => <input id={id} />}
      </CampoFormulario>,
    );
    expect(screen.getByText('Con la que marca en el kiosco')).toBeInTheDocument();
  });

  it('la explicación es opcional', () => {
    render(<CampoFormulario rotulo="Cargo">{(id) => <input id={id} />}</CampoFormulario>);
    expect(screen.getByLabelText('Cargo')).toBeInTheDocument();
  });

  it('marca los obligatorios donde se ven, no solo en el validador', () => {
    render(
      <CampoFormulario rotulo="Nombre" obligatorio>
        {(id) => <input id={id} required />}
      </CampoFormulario>,
    );
    expect(screen.getByText('Nombre').textContent).toContain('*');
  });

  it('un grupo de varios controles no se ata a uno solo', () => {
    // Cuando adentro hay dos o tres campos (nombre y apellido, o las sedes),
    // atar el rótulo al primero mentiría sobre los demás: pasa a ser el
    // encabezado del grupo.
    render(
      <CampoFormulario rotulo="Nombre completo" grupo>
        <input aria-label="Nombre" />
        <input aria-label="Apellido" />
      </CampoFormulario>,
    );
    expect(screen.getByRole('group', { name: 'Nombre completo' })).toBeInTheDocument();
  });
});
