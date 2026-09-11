import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import AdminEmpresas from './AdminEmpresas';

// El cableado del borrado de empresas en la pantalla del super admin: qué pide
// al abrir, qué muestra si algo falla y qué hace al confirmar. El diálogo tiene
// sus propias pruebas; aquí se prueba lo que la pantalla le pasa.

const { get, post } = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock('../../lib/api', () => ({
  default: { get: (...a: unknown[]) => get(...a), post: (...a: unknown[]) => post(...a), put: vi.fn(), delete: vi.fn() },
}));

const fila = (id: string, nombre: string, nit: string) => ({
  id, nombre, nit, email: `${id}@ejemplo.co`, telefono: null, marcadorToken: `t-${id}`,
  exentaPago: false, activa: true, colaboradoresActivos: 3, tarifaMensual: 0,
  estadoSuscripcion: 'PRUEBA', diasMora: 0, pagadoHasta: null, finPrueba: null, precioModo: null,
});
const ALFA = fila('empA', 'Empresa Alfa', '900111222-1');
const BETA = fila('empB', 'Empresa Beta', '900333444-2');
const resumenDe = (e: typeof ALFA, extra: Record<string, unknown> = {}) => ({
  id: e.id, nombre: e.nombre, nit: e.nit, colaboradores: 3, registros: 10,
  pagosAprobados: 0, montoPagosAprobados: 0, comisiones: 0, montoComisiones: 0, ...extra,
});

type Respuesta = { data: unknown };

// Una respuesta que llega cuando la prueba decide.
function diferida() {
  let resolver!: (v: Respuesta) => void;
  let rechazar!: (e: unknown) => void;
  const promesa = new Promise<Respuesta>((a, b) => { resolver = a; rechazar = b; });
  return { promesa, resolver, rechazar };
}

let resumenes: Record<string, () => Promise<Respuesta>>;

beforeEach(() => {
  get.mockReset();
  post.mockReset();
  resumenes = {
    empA: () => Promise.resolve({ data: resumenDe(ALFA) }),
    empB: () => Promise.resolve({ data: resumenDe(BETA) }),
  };
  get.mockImplementation((url: string) => {
    if (url === '/admin/empresas') return Promise.resolve({ data: [ALFA, BETA] });
    const m = url.match(/^\/admin\/empresas\/(\w+)\/eliminacion$/);
    const pedir = m ? resumenes[m[1]] : undefined;
    return pedir ? pedir() : Promise.reject(new Error(`GET inesperado: ${url}`));
  });
});

async function montar() {
  render(<MemoryRouter><AdminEmpresas /></MemoryRouter>);
  await screen.findByText('Empresa Alfa');
}

async function abrirEliminar(nombre: string) {
  const filaEl = screen.getByText(nombre).closest('tr')!;
  await userEvent.click(within(filaEl).getByTitle('Más opciones'));
  await userEvent.click(screen.getByRole('button', { name: /eliminar empresa/i }));
  return screen.findByRole('dialog');
}

async function confirmarCon(nit: string) {
  const dialogo = await abrirEliminar('Empresa Alfa');
  await within(dialogo).findByText('900111222-1');
  await userEvent.type(within(dialogo).getByRole('textbox'), nit);
  await userEvent.click(within(dialogo).getByRole('button', { name: /eliminar empresa/i }));
  return dialogo;
}

describe('abrir el borrado', () => {
  it('pide el resumen de ESA empresa y muestra su NIT', async () => {
    await montar();
    const dialogo = await abrirEliminar('Empresa Alfa');
    expect(get).toHaveBeenCalledWith('/admin/empresas/empA/eliminacion');
    expect(await within(dialogo).findByText('900111222-1')).toBeInTheDocument();
  });

  it('si pedir el resumen falla, el error se ve y el modal se puede cerrar', async () => {
    resumenes.empA = () => Promise.reject({ response: { status: 404, data: { error: 'Empresa no encontrada' } } });
    await montar();
    const dialogo = await abrirEliminar('Empresa Alfa');
    expect(await within(dialogo).findByText('Empresa no encontrada')).toBeInTheDocument();
    await userEvent.click(within(dialogo).getByRole('button', { name: /cerrar/i }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

describe('confirmar el borrado', () => {
  it('manda el NIT escrito, avisa con el nombre, cierra el modal y recarga la lista', async () => {
    post.mockResolvedValue({ status: 204 });
    await montar();
    await confirmarCon('900111222-1');
    expect(post).toHaveBeenCalledWith('/admin/empresas/empA/eliminar', { confirmacion: '900111222-1' });
    expect(await screen.findByText('Empresa "Empresa Alfa" eliminada')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(get.mock.calls.filter(([url]) => url === '/admin/empresas')).toHaveLength(2);
  });

  it('si el servidor rechaza, su mensaje se ve dentro del modal', async () => {
    post.mockRejectedValue({ response: { status: 400, data: { error: 'Escribe el NIT de la empresa, exactamente como aparece, para confirmar.' } } });
    await montar();
    const dialogo = await confirmarCon('900111222-1');
    expect(await within(dialogo).findByText(/exactamente como aparece/)).toBeInTheDocument();
  });

  it('un 500 que no escribió la ruta no se muestra como "Internal Server Error"', async () => {
    post.mockRejectedValue({ response: { status: 500, data: { error: 'Internal Server Error' } } });
    await montar();
    const dialogo = await confirmarCon('900111222-1');
    expect(await within(dialogo).findByText(/no se pudo eliminar la empresa/i)).toBeInTheDocument();
    expect(screen.queryByText('Internal Server Error')).not.toBeInTheDocument();
  });

  it('el 500 que sí escribió la ruta se muestra tal cual', async () => {
    post.mockRejectedValue({ response: { status: 500, data: { error: 'No se pudo eliminar la empresa y no se borró nada. Intenta de nuevo en un momento.' } } });
    await montar();
    const dialogo = await confirmarCon('900111222-1');
    expect(await within(dialogo).findByText(/no se borró nada/)).toBeInTheDocument();
  });
});

describe('dos empresas seguidas', () => {
  it('un resumen que llega tarde no se pinta en el modal de otra empresa', async () => {
    const tarde = diferida();
    resumenes.empA = () => tarde.promesa;
    await montar();
    // Se abre Alfa y se cierra tocando fuera antes de que llegue su resumen...
    fireEvent.click((await abrirEliminar('Empresa Alfa')).parentElement!);
    const dialogo = await abrirEliminar('Empresa Beta');
    expect(await within(dialogo).findByText('900333444-2')).toBeInTheDocument();
    // ...y el de Alfa llega cuando ya está abierto el de Beta.
    await act(async () => { tarde.resolver({ data: resumenDe(ALFA, { colaboradores: 99 }) }); await tarde.promesa; });
    const ahora = screen.getByRole('dialog');
    expect(within(ahora).queryByText('900111222-1')).not.toBeInTheDocument();
    expect(within(ahora).getByText('900333444-2')).toBeInTheDocument();
  });

  it('un error que llega tarde tampoco se pinta en el modal de otra empresa', async () => {
    const tarde = diferida();
    resumenes.empA = () => tarde.promesa;
    await montar();
    fireEvent.click((await abrirEliminar('Empresa Alfa')).parentElement!);
    const dialogo = await abrirEliminar('Empresa Beta');
    await within(dialogo).findByText('900333444-2');
    await act(async () => {
      tarde.rechazar({ response: { status: 500, data: { error: 'error-de-alfa' } } });
      await tarde.promesa.catch(() => {});
    });
    expect(screen.queryByText('error-de-alfa')).not.toBeInTheDocument();
  });
});
