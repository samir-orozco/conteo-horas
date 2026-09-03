import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CamposColaborador from './CamposColaborador';

// Los campos que comparten los DOS formularios que editan a un colaborador: el
// de la lista y el de su ficha. Estaban duplicados campo por campo, y ese es el
// defecto que estas pruebas evitan que vuelva: que uno gane un campo y el otro
// se quede atrás, haciendo parecer que la función no existe.

const horarios = [{ id: 'h1', nombre: 'Oficina', franjas: [{ dias: ['LUNES'], horaEntrada: '08:00', horaSalida: '17:00' }] }];
const sedes = [{ id: 's1', nombre: 'El Poblado' }];

const montar = (valores = {}, foto?: Parameters<typeof CamposColaborador>[0]['foto']) => {
  const onCambio = vi.fn();
  render(
    <CamposColaborador
      valores={{ nombre: 'Ana', apellido: 'Giraldo', modalidad: 'PRESENCIAL', ...valores }}
      onCambio={onCambio}
      horarios={horarios}
      sedes={sedes}
      resumenFranjas={() => 'L-V 08:00-17:00'}
      foto={foto}
    />,
  );
  return onCambio;
};

describe('CamposColaborador', () => {
  it('ofrece todos los campos, cada uno alcanzable por su rótulo', () => {
    montar();
    for (const rotulo of [/cédula/i, /cargo/i, /fecha de nacimiento/i, /horario de trabajo/i, /salario mensual/i]) {
      expect(screen.getByLabelText(rotulo)).toBeInTheDocument();
    }
    // Los que son grupo de varios controles se anuncian como grupo.
    expect(screen.getByRole('group', { name: /nombre completo/i })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: /contacto/i })).toBeInTheDocument();
  });

  it('explica lo que no se deduce del nombre del campo', () => {
    montar();
    expect(screen.getByText(/con esta marca en el kiosco/i)).toBeInTheDocument();
    expect(screen.getByText(/llegadas tarde, horas extra y descanso/i)).toBeInTheDocument();
    expect(screen.getByText(/se calcula su hora extra/i)).toBeInTheDocument();
  });

  it('avisa del cambio sin pisar el resto del formulario', async () => {
    const onCambio = montar();
    await userEvent.type(screen.getByLabelText(/cargo/i), 'X');
    // Manda solo lo que cambió: quien recibe hace el spread sobre lo que ya tenía.
    expect(onCambio).toHaveBeenCalledWith({ cargo: 'X' });
  });

  describe('la foto', () => {
    it('solo aparece donde se le pide', () => {
      montar();
      expect(screen.queryByLabelText(/foto del colaborador/i)).not.toBeInTheDocument();
    });

    it('en la lista sí, porque ahí es donde se está dando de alta a la persona', () => {
      montar({}, { onCambio: vi.fn(), onError: vi.fn() });
      expect(screen.getByLabelText(/foto del colaborador/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /subir foto/i })).toBeInTheDocument();
    });
  });

  describe('las sedes', () => {
    it('se ofrecen a un presencial', () => {
      montar({ modalidad: 'PRESENCIAL' });
      expect(screen.getByRole('group', { name: /sedes/i })).toBeInTheDocument();
    });

    it('se esconden para un remoto: asignárselas no cambiaría nada', () => {
      montar({ modalidad: 'REMOTO' });
      expect(screen.queryByRole('group', { name: /sedes/i })).not.toBeInTheDocument();
    });

    it('no se ofrecen si la empresa no tiene sedes creadas', () => {
      render(
        <CamposColaborador
          valores={{ nombre: 'Ana', modalidad: 'PRESENCIAL' }}
          onCambio={vi.fn()} horarios={horarios} sedes={[]} resumenFranjas={() => ''}
        />,
      );
      expect(screen.queryByRole('group', { name: /sedes/i })).not.toBeInTheDocument();
    });
  });
});
