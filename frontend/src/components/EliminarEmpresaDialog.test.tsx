import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EliminarEmpresaDialog, { type ResumenEliminacion } from './EliminarEmpresaDialog';

// Es el único diálogo del producto detrás del cual no hay vuelta atrás: se
// lleva colaboradores, marcaciones y contratos de gente real. Por eso no basta
// con un "¿Seguro?": hay que escribir el NIT.
//
// La comparación del NIT también se hace en el servidor. La de aquí es solo
// para habilitar el botón; si alguien la saltara, la ruta rechaza igual.

const resumen = (extra: Partial<ResumenEliminacion> = {}): ResumenEliminacion => ({
  id: 'e1',
  nombre: 'Panadería El Trigo',
  nit: '901555777-3',
  colaboradores: 12,
  registros: 4830,
  pagosAprobados: 0,
  comisiones: 0,
  bloqueo: null,
  ...extra,
});

const props = {
  nombre: 'Panadería El Trigo',
  resumen: resumen(),
  eliminando: false,
  error: '',
  onEliminar: () => {},
  onCancelar: () => {},
};

describe('lo que el diálogo le dice al super admin', () => {
  it('nombra la empresa y cuenta lo que se va a perder', () => {
    render(<EliminarEmpresaDialog {...props} />);
    expect(screen.getByText(/Panadería El Trigo/)).toBeInTheDocument();
    expect(screen.getByText(/12/)).toBeInTheDocument();
    expect(screen.getByText(/4.830|4830/)).toBeInTheDocument();
  });

  it('dice que no se puede deshacer, con esas palabras', () => {
    render(<EliminarEmpresaDialog {...props} />);
    expect(screen.getByText(/no se puede deshacer/i)).toBeInTheDocument();
  });

  it('mientras carga el resumen no ofrece borrar todavía', () => {
    // Sin el resumen no se sabe ni cuánto se pierde ni si está bloqueada.
    // Ofrecer el botón ahí sería ofrecerlo a ciegas.
    render(<EliminarEmpresaDialog {...props} resumen={null} />);
    expect(screen.queryByRole('button', { name: /eliminar/i })).not.toBeInTheDocument();
  });
});

describe('cuando la empresa está bloqueada', () => {
  const bloqueada = resumen({
    pagosAprobados: 3,
    bloqueo: { motivo: 'PAGOS', mensaje: 'Esta empresa tiene 3 pago(s) aprobado(s). Desactívala.' },
  });

  it('explica por qué, con el mensaje del servidor', () => {
    render(<EliminarEmpresaDialog {...props} resumen={bloqueada} />);
    expect(screen.getByText(/3 pago\(s\) aprobado\(s\)/)).toBeInTheDocument();
  });

  it('no pide el NIT ni ofrece borrar: no hay nada que confirmar', () => {
    render(<EliminarEmpresaDialog {...props} resumen={bloqueada} />);
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /eliminar/i })).not.toBeInTheDocument();
  });

  it('deja salir', async () => {
    const onCancelar = vi.fn();
    render(<EliminarEmpresaDialog {...props} resumen={bloqueada} onCancelar={onCancelar} />);
    await userEvent.click(screen.getByRole('button', { name: /cerrar|cancelar|entendido/i }));
    expect(onCancelar).toHaveBeenCalled();
  });
});

describe('la confirmación escrita', () => {
  it('el botón nace deshabilitado', () => {
    render(<EliminarEmpresaDialog {...props} />);
    expect(screen.getByRole('button', { name: /eliminar/i })).toBeDisabled();
  });

  it('un NIT equivocado no lo habilita', async () => {
    render(<EliminarEmpresaDialog {...props} />);
    await userEvent.type(screen.getByRole('textbox'), '901555777');
    expect(screen.getByRole('button', { name: /eliminar/i })).toBeDisabled();
  });

  it('el NIT correcto lo habilita y borra', async () => {
    const onEliminar = vi.fn();
    render(<EliminarEmpresaDialog {...props} onEliminar={onEliminar} />);
    await userEvent.type(screen.getByRole('textbox'), '901555777-3');
    const boton = screen.getByRole('button', { name: /eliminar/i });
    expect(boton).toBeEnabled();
    await userEvent.click(boton);
    expect(onEliminar).toHaveBeenCalledWith('901555777-3');
  });

  it('perdona los espacios de copiar y pegar, igual que el servidor', async () => {
    render(<EliminarEmpresaDialog {...props} />);
    await userEvent.type(screen.getByRole('textbox'), '  901555777-3  ');
    expect(screen.getByRole('button', { name: /eliminar/i })).toBeEnabled();
  });

  it('el campo dice cuál es el NIT que hay que escribir', async () => {
    // Sin esto habría que cerrar el modal para ir a buscarlo a la tabla.
    render(<EliminarEmpresaDialog {...props} />);
    expect(screen.getByText(/901555777-3/)).toBeInTheDocument();
  });
});

describe('mientras borra y cuando falla', () => {
  it('durante el borrado el botón no se puede volver a pulsar', () => {
    // Dos POST seguidos: el segundo encontraría la empresa ya borrada y
    // pintaría un error donde en realidad todo salió bien.
    render(<EliminarEmpresaDialog {...props} eliminando />);
    expect(screen.getByRole('button', { name: /eliminando|eliminar/i })).toBeDisabled();
  });

  it('muestra el error que devolvió el servidor', () => {
    render(<EliminarEmpresaDialog {...props} error="No se pudo eliminar la empresa." />);
    expect(screen.getByText('No se pudo eliminar la empresa.')).toBeInTheDocument();
  });
});

describe('el conteo se lee como lo diría una persona', () => {
  it('una sola persona es "1 colaborador", no "1 colaboradores"', () => {
    render(<EliminarEmpresaDialog {...props} resumen={resumen({ colaboradores: 1 })} />);
    expect(screen.getByText(/^1 colaborador,/)).toBeInTheDocument();
  });

  it('una sola marcación es "1 marcación"', () => {
    render(<EliminarEmpresaDialog {...props} resumen={resumen({ registros: 1 })} />);
    expect(screen.getByText('1 marcación')).toBeInTheDocument();
  });

  it('en cero y en muchos va el plural', () => {
    render(<EliminarEmpresaDialog {...props} resumen={resumen({ colaboradores: 0, registros: 2 })} />);
    expect(screen.getByText(/^0 colaboradores,/)).toBeInTheDocument();
    expect(screen.getByText('2 marcaciones')).toBeInTheDocument();
  });
});
