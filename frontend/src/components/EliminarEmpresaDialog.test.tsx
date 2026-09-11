import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EliminarEmpresaDialog, { type ResumenEliminacion } from './EliminarEmpresaDialog';

// Es el único diálogo del producto detrás del cual no hay vuelta atrás.
//
// DECISIÓN DEL DUEÑO (10 de septiembre de 2026): cualquier empresa se puede
// borrar, tenga pagos aprobados o comisiones de afiliado. El diálogo NO bloquea:
// advierte qué se pierde, incluida la plata, y pide escribir el NIT. La misma
// comparación la hace el servidor; la de aquí es solo para habilitar el botón.

const resumen = (extra: Partial<ResumenEliminacion> = {}): ResumenEliminacion => ({
  id: 'e1',
  nombre: 'Panadería El Trigo',
  nit: '901555777-3',
  colaboradores: 12,
  registros: 4830,
  pagosAprobados: 0,
  montoPagosAprobados: 0,
  comisiones: 0,
  montoComisiones: 0,
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

const NIT = '901555777-3';
const campo = () => screen.getByRole('textbox');
const botonEliminar = () => screen.getByRole('button', { name: /eliminar|eliminando/i });

describe('lo que el diálogo le advierte al super admin', () => {
  it('nombra la empresa y cuenta lo que se va a perder', () => {
    render(<EliminarEmpresaDialog {...props} />);
    expect(screen.getByText(/Panadería El Trigo/)).toBeInTheDocument();
    expect(screen.getByText(/12/)).toBeInTheDocument();
    expect(screen.getByText(/4.830|4830/)).toBeInTheDocument();
  });

  it('dice que la información no se puede recuperar', () => {
    render(<EliminarEmpresaDialog {...props} />);
    expect(screen.getByText(/no se puede recuperar/i)).toBeInTheDocument();
  });

  it('con pagos aprobados dice cuántos y por cuánto dinero, y deja borrar igual', async () => {
    render(<EliminarEmpresaDialog {...props} resumen={resumen({ pagosAprobados: 3, montoPagosAprobados: 899_700 })} />);
    const aviso = screen.getByText(/3 pagos aprobados/);
    expect(aviso.textContent).toMatch(/899\.700/);
    await userEvent.type(campo(), NIT);
    expect(botonEliminar()).toBeEnabled();
  });

  it('con comisiones dice por cuánto y que salen de la billetera del afiliado', () => {
    render(<EliminarEmpresaDialog {...props} resumen={resumen({ comisiones: 2, montoComisiones: 59_980 })} />);
    const aviso = screen.getByText(/2 comisiones de afiliado/);
    expect(aviso.textContent).toMatch(/59\.980/);
    expect(aviso.textContent).toMatch(/billetera/i);
  });

  it('un solo pago y una sola comisión se leen en singular', () => {
    render(<EliminarEmpresaDialog {...props} resumen={resumen({ pagosAprobados: 1, montoPagosAprobados: 299_900, comisiones: 1, montoComisiones: 59_980 })} />);
    expect(screen.getByText(/1 pago aprobado por/)).toBeInTheDocument();
    expect(screen.getByText(/1 comisión de afiliado por/)).toBeInTheDocument();
  });

  it('sin pagos ni comisiones no habla de dinero', () => {
    render(<EliminarEmpresaDialog {...props} />);
    expect(screen.queryByText(/pago/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/comisi/i)).not.toBeInTheDocument();
  });
});

describe('mientras calcula y si el cálculo falla', () => {
  it('mientras calcula no ofrece borrar todavía', () => {
    render(<EliminarEmpresaDialog {...props} resumen={null} />);
    expect(screen.queryByRole('button', { name: /eliminar/i })).not.toBeInTheDocument();
  });

  it('si el cálculo falla muestra el error y deja cerrar, en vez de quedarse calculando', async () => {
    // Pasaba con una empresa que otra pestaña ya había borrado (404): el modal
    // se quedaba en "Calculando…" sin botones y el error nunca se veía.
    const onCancelar = vi.fn();
    render(<EliminarEmpresaDialog {...props} resumen={null} error="Empresa no encontrada" onCancelar={onCancelar} />);
    expect(screen.getByText('Empresa no encontrada')).toBeInTheDocument();
    expect(screen.queryByText(/calculando/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /eliminar/i })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /cerrar/i }));
    expect(onCancelar).toHaveBeenCalled();
  });
});

describe('la confirmación escrita', () => {
  it('el botón nace deshabilitado', () => {
    render(<EliminarEmpresaDialog {...props} />);
    expect(botonEliminar()).toBeDisabled();
  });

  it('un NIT equivocado no lo habilita', async () => {
    render(<EliminarEmpresaDialog {...props} />);
    await userEvent.type(campo(), '901555777');
    expect(botonEliminar()).toBeDisabled();
  });

  it('el NIT correcto lo habilita y borra', async () => {
    const onEliminar = vi.fn();
    render(<EliminarEmpresaDialog {...props} onEliminar={onEliminar} />);
    await userEvent.type(campo(), NIT);
    expect(botonEliminar()).toBeEnabled();
    await userEvent.click(botonEliminar());
    expect(onEliminar).toHaveBeenCalledWith(NIT);
  });

  it('perdona los espacios de copiar y pegar, y manda el NIT sin ellos', async () => {
    const onEliminar = vi.fn();
    render(<EliminarEmpresaDialog {...props} onEliminar={onEliminar} />);
    await userEvent.type(campo(), `  ${NIT}  `);
    await userEvent.click(botonEliminar());
    expect(onEliminar).toHaveBeenCalledWith(NIT);
  });

  it('quitarle el guion no lo habilita: se compara el NIT tal como está guardado', async () => {
    render(<EliminarEmpresaDialog {...props} />);
    await userEvent.type(campo(), '9015557773');
    expect(botonEliminar()).toBeDisabled();
  });

  it('un NIT guardado con espacios alrededor se compara sin ellos, igual que el servidor', async () => {
    render(<EliminarEmpresaDialog {...props} resumen={resumen({ nit: `  ${NIT} ` })} />);
    await userEvent.type(campo(), NIT);
    expect(botonEliminar()).toBeEnabled();
  });

  it('el campo dice cuál es el NIT que hay que escribir', () => {
    render(<EliminarEmpresaDialog {...props} />);
    expect(screen.getByText(/901555777-3/)).toBeInTheDocument();
  });

  it('Cancelar cierra sin borrar', async () => {
    const onCancelar = vi.fn();
    const onEliminar = vi.fn();
    render(<EliminarEmpresaDialog {...props} onCancelar={onCancelar} onEliminar={onEliminar} />);
    await userEvent.click(screen.getByRole('button', { name: /cancelar/i }));
    expect(onCancelar).toHaveBeenCalled();
    expect(onEliminar).not.toHaveBeenCalled();
  });
});

describe('mientras borra y cuando falla', () => {
  it('durante el borrado, con el NIT ya escrito, el botón no se puede volver a pulsar', async () => {
    // Con el campo vacío el botón ya está deshabilitado por el NIT, así que la
    // prueba escribe el NIT primero: si no, pasaría aunque `eliminando` no
    // deshabilitara nada.
    const onEliminar = vi.fn();
    const { rerender } = render(<EliminarEmpresaDialog {...props} onEliminar={onEliminar} />);
    await userEvent.type(campo(), NIT);
    rerender(<EliminarEmpresaDialog {...props} onEliminar={onEliminar} eliminando />);
    expect(botonEliminar()).toBeDisabled();
    fireEvent.click(botonEliminar());
    expect(onEliminar).not.toHaveBeenCalled();
  });

  it('fuera del borrado, tocar fuera del modal lo cierra', () => {
    const onCancelar = vi.fn();
    render(<EliminarEmpresaDialog {...props} onCancelar={onCancelar} />);
    fireEvent.click(screen.getByRole('dialog').parentElement!);
    expect(onCancelar).toHaveBeenCalled();
  });

  it('durante el borrado no deja cancelar ni cerrar tocando fuera', async () => {
    // Cerrar no detenía el borrado: seguía corriendo, y si fallaba el error se
    // perdía, o se pintaba en el modal de la siguiente empresa que se abriera.
    const onCancelar = vi.fn();
    const { rerender } = render(<EliminarEmpresaDialog {...props} onCancelar={onCancelar} />);
    await userEvent.type(campo(), NIT);
    rerender(<EliminarEmpresaDialog {...props} onCancelar={onCancelar} eliminando />);
    expect(screen.getByRole('button', { name: /cancelar/i })).toBeDisabled();
    fireEvent.click(screen.getByRole('dialog').parentElement!);
    expect(onCancelar).not.toHaveBeenCalled();
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
