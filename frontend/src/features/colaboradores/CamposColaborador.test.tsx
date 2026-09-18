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

// El auxilio vigente llega desde el servidor (GET /configuracion/legales). Decretos 1469 y 1470 de
// 2025, que rigen en 2026: mínimo 1.750.905, auxilio 249.095, tope de dos mínimos.
const AUXILIO_2026 = { valor: 249_095, tope: 3_501_810 };

const montar = (
  valores = {},
  foto?: Parameters<typeof CamposColaborador>[0]['foto'],
  auxilio: { valor: number; tope: number } | null = AUXILIO_2026,
) => {
  const onCambio = vi.fn();
  render(
    <CamposColaborador
      valores={{ nombre: 'Ana', apellido: 'Giraldo', modalidad: 'PRESENCIAL', ...valores }}
      onCambio={onCambio}
      horarios={horarios}
      sedes={sedes}
      resumenFranjas={() => 'L-V 08:00-17:00'}
      foto={foto}
      auxilio={auxilio}
    />,
  );
  return onCambio;
};

// EL AUXILIO SE PROPONE SOLO (17 de septiembre de 2026).
//
// El campo nace vacío y vacío significa «el del decreto», pero el administrador no tiene por qué
// saberse de memoria ni el valor ni el tope de dos mínimos. La ficha se lo muestra.
//
// Lo que se MUESTRA no es lo que se GUARDA: con el campo vacío se enseña el valor del decreto y se
// guarda null. Si se escribiera de verdad, en enero ese número quedaría congelado y habría que
// volver a tocar la ficha de cada persona, que es justo lo que la tabla de vigencias evita.
describe('el auxilio de transporte que propone la ficha', () => {
  it('con salario mínimo muestra el del decreto y dice de dónde sale', () => {
    montar({ salarioMensual: 1_750_905, auxilioTransporte: null });
    expect(screen.getByLabelText(/auxilio de transporte/i)).toHaveValue('249.095');
    // «del decreto» a secas también está en la descripción fija del campo: se busca el texto que
    // solo tiene el aviso.
    expect(screen.getByText(/del decreto vigente/i)).toBeInTheDocument();
  });

  it('por encima de dos mínimos propone cero y avisa que la ley no obliga', () => {
    montar({ salarioMensual: 5_000_000, auxilioTransporte: null });
    expect(screen.getByLabelText(/auxilio de transporte/i)).toHaveValue('0');
    expect(screen.getByText(/no obliga/i)).toBeInTheDocument();
  });

  it('mostrarlo no es guardarlo: abrir la ficha no escribe nada', () => {
    const onCambio = montar({ salarioMensual: 1_750_905, auxilioTransporte: null });
    expect(onCambio).not.toHaveBeenCalled();
  });

  it('un valor escrito a mano manda sobre la propuesta, aunque supere el tope', () => {
    // Decisión del dueño: por encima del tope se avisa, pero no se fuerza. Pagarlo es legal.
    montar({ salarioMensual: 5_000_000, auxilioTransporte: 2_000 });
    expect(screen.getByLabelText(/auxilio de transporte/i)).toHaveValue('2.000');
  });

  it('sin vigencia del servidor no propone ningún número', () => {
    montar({ salarioMensual: 1_750_905, auxilioTransporte: null }, undefined, null);
    expect(screen.getByLabelText(/auxilio de transporte/i)).toHaveValue('');
  });
});

describe('CamposColaborador', () => {
  it('ofrece todos los campos, cada uno alcanzable por su rótulo', () => {
    montar();
    // «Salario básico» y no «Salario mensual»: el auxilio de transporte va en su propio campo, y
    // meterlo dentro del salario encarece cada hora extra y cada recargo un 14,2% en el mínimo.
    for (const rotulo of [/cédula/i, /cargo/i, /fecha de nacimiento/i, /horario de trabajo/i, /salario básico/i, /auxilio de transporte/i]) {
      expect(screen.getByLabelText(rotulo)).toBeInTheDocument();
    }
    // Los que son grupo de varios controles se anuncian como grupo.
    expect(screen.getByRole('group', { name: /nombre completo/i })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: /contacto/i })).toBeInTheDocument();
  });

  it('explica lo que no se deduce del nombre del campo', () => {
    montar();
    expect(screen.getByText(/la que digita para marcar en el kiosco/i)).toBeInTheDocument();
    expect(screen.getByText(/llegadas tarde, extras y pausas/i)).toBeInTheDocument();
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

    it('cambiar la modalidad no toca las sedes: la principal se muestra, no se mete en el formulario', async () => {
      // Revisión del 11 de septiembre de 2026: con la principal metida en el
      // formulario, quien pasaba a remoto antes de guardar se la dejaba sin verla.
      const onCambio = vi.fn();
      render(
        <CamposColaborador
          valores={{ nombre: 'Ana', modalidad: 'PRESENCIAL', sedeIds: [] }}
          onCambio={onCambio} horarios={horarios} resumenFranjas={() => ''}
          sedes={[{ id: 's1', nombre: 'Sede principal', principal: true }]}
        />,
      );
      await userEvent.click(screen.getByRole('radio', { name: /remoto/i }));
      expect(onCambio).toHaveBeenLastCalledWith({ modalidad: 'REMOTO' });
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

  describe('el permiso de cerrar el turno en otra sede', () => {
    const dosSedes = [{ id: 's1', nombre: 'El Poblado' }, { id: 's2', nombre: 'Laureles' }];
    const conDosSedes = (valores: Record<string, unknown>) => {
      const onCambio = vi.fn();
      render(
        <CamposColaborador
          valores={{ nombre: 'Ana', modalidad: 'PRESENCIAL', ...valores }}
          onCambio={onCambio} horarios={horarios} sedes={dosSedes} resumenFranjas={() => ''}
        />,
      );
      return onCambio;
    };
    const permiso = () => screen.queryByRole('switch', { name: /cerrar el turno en una sede distinta/i });

    it('se ofrece a un presencial con dos o más sedes, apagado por defecto', () => {
      conDosSedes({ sedeIds: ['s1', 's2'] });
      expect(permiso()).toBeInTheDocument();
      expect(permiso()).toHaveAttribute('aria-checked', 'false');
    });

    it('con una sola sede no se ofrece: no hay a dónde cruzar', () => {
      conDosSedes({ sedeIds: ['s1'] });
      expect(permiso()).not.toBeInTheDocument();
    });

    it('a un híbrido no se le ofrece: la regla de misma sede ya no le aplica', () => {
      conDosSedes({ modalidad: 'HIBRIDO', sedeIds: ['s1', 's2'] });
      expect(permiso()).not.toBeInTheDocument();
    });

    it('enseña el valor guardado', () => {
      conDosSedes({ sedeIds: ['s1', 's2'], puedeCerrarEnOtraSede: true });
      expect(permiso()).toHaveAttribute('aria-checked', 'true');
    });

    it('activarlo avisa el valor nuevo', async () => {
      const onCambio = conDosSedes({ sedeIds: ['s1', 's2'] });
      await userEvent.setup().click(permiso()!);
      expect(onCambio).toHaveBeenCalledWith({ puedeCerrarEnOtraSede: true });
    });

    it('apagarlo avisa el valor nuevo: así se le quita el permiso a quien lo tenía', async () => {
      const onCambio = conDosSedes({ sedeIds: ['s1', 's2'], puedeCerrarEnOtraSede: true });
      await userEvent.setup().click(permiso()!);
      expect(onCambio).toHaveBeenCalledWith({ puedeCerrarEnOtraSede: false });
    });

    it('la ayuda de las sedes deja de prometer «la misma donde lo abrió» cuando hay permiso', () => {
      conDosSedes({ sedeIds: ['s1', 's2'], puedeCerrarEnOtraSede: true });
      expect(screen.getByText(/cerrar el turno en una distinta de la que lo abrió/i)).toBeInTheDocument();
      expect(screen.queryByText(/debe cerrar el turno en la misma/i)).not.toBeInTheDocument();
    });
  });
});
