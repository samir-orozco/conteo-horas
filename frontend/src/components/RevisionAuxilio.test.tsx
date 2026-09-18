import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RevisionAuxilio from './RevisionAuxilio';

// EL BLOQUEO QUE PIDE REVISAR LOS SALARIOS (17 de septiembre de 2026).
//
// Las empresas que ya existían capturaron el salario en UN solo campo, así que algunas tienen el
// auxilio de transporte sumado dentro del básico. Cuando es así, cada hora extra y cada recargo de
// esa persona se pagan un 14,2% de más y nada en pantalla lo delata.
//
// Por eso el aviso es bloqueante y vive en el servidor, no en localStorage: limpiar el navegador o
// entrar desde otro equipo no puede hacer que reaparezca, ni que una persona lo descarte y el resto
// de la empresa nunca se entere de que los datos están mal.
//
// Dos cosas que NO hace, a propósito:
//   - No corrige nada solo. La marca «parece incluir el auxilio» es una sospecha aritmética, no una
//     certeza, y cambiar sueldos por corazonada es peor que el problema que resuelve.
//   - No obliga a revisar a mano de uno en uno: se puede confirmar que están bien y seguir. Dejar a
//     una empresa de 250 personas sin sistema hasta que revise 250 fichas es quitarle el producto.
//
// POR QUÉ SE CONSULTA POR `group` Y NO POR `row`: esto era una tabla, y en un teléfono el botón de
// guardar quedaba fuera de pantalla, detrás del scroll horizontal de la tabla. En un modal que
// bloquea el panel entero, la acción principal de cada fila no puede estar escondida.
//
// La salida NO fue «tabla en escritorio, tarjetas en móvil» con clases que oculten una u otra: en
// las pruebas conviven las dos en el DOM y cada persona aparecería dos veces, así que toda consulta
// por nombre se volvería ambigua. Es una sola estructura que se reacomoda.

const { get, post, put } = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn() }));
vi.mock('../lib/api', () => ({
  default: {
    get: (...a: unknown[]) => get(...a),
    post: (...a: unknown[]) => post(...a),
    put: (...a: unknown[]) => put(...a),
    delete: vi.fn(),
  },
}));

const persona = (id: string, nombre: string, salarioMensual: number, pareceIncluirAuxilio = false) => ({
  id, nombre, apellido: 'De Prueba', cedula: '10' + id, cargo: null,
  salarioMensual, auxilioTransporte: null, pareceIncluirAuxilio,
});

const RESPUESTA = {
  pendiente: true,
  auxilio: { valor: 249_095, tope: 3_501_810 },
  colaboradores: [
    persona('c1', 'Santiago', 2_000_000, true),
    persona('c2', 'Ana', 2_500_000, false),
  ],
};

const montar = (data: unknown = RESPUESTA) => {
  get.mockImplementation((url: string) => {
    if (url === '/configuracion/auxilio-pendiente') return Promise.resolve({ data });
    return Promise.reject(new Error('url inesperada: ' + url));
  });
  return render(<RevisionAuxilio />);
};

const fichaDe = (dialogo: HTMLElement, nombre: RegExp) =>
  within(dialogo).getByRole('group', { name: nombre });

beforeEach(() => { post.mockReset(); put.mockReset(); });

describe('RevisionAuxilio', () => {
  it('la empresa que ya revisó no ve nada', async () => {
    montar({ pendiente: false, auxilio: null, colaboradores: [] });
    // Se le da tiempo a que cargue antes de afirmar que no hay diálogo.
    await new Promise(r => setTimeout(r, 0));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('la empresa pendiente ve el bloqueo con su gente', async () => {
    montar();
    const dialogo = await screen.findByRole('dialog');
    expect(dialogo).toHaveTextContent('Santiago');
    expect(dialogo).toHaveTextContent('Ana');
  });

  it('marca solo a quien parece traer el auxilio adentro, y no a los demás', async () => {
    montar();
    const dialogo = await screen.findByRole('dialog');
    expect(fichaDe(dialogo, /Santiago/)).toHaveTextContent(/parece incluir/i);
    expect(fichaDe(dialogo, /Ana/)).not.toHaveTextContent(/parece incluir/i);
  });

  // Cada persona es UNA ficha, a todos los anchos. Si alguien vuelve a partir esto en una versión
  // de escritorio y otra de móvil, aquí aparecerían dos Santiagos y esta consulta fallaría sola.
  it('cada persona aparece una sola vez, sin duplicar por ancho de pantalla', async () => {
    montar();
    const dialogo = await screen.findByRole('dialog');
    expect(within(dialogo).getAllByRole('group')).toHaveLength(2);
    expect(within(dialogo).getAllByRole('button', { name: /guardar/i })).toHaveLength(2);
  });

  // El dinero se lee como lo escribe alguien en Colombia. Esta es la pantalla cuyo único trabajo es
  // que una persona mire salarios y detecte uno mal escrito: un número de siete dígitos sin separar
  // es justo donde se esconde un cero de más.
  it('muestra los salarios con puntos de miles', async () => {
    montar();
    const dialogo = await screen.findByRole('dialog');
    expect(within(fichaDe(dialogo, /Santiago/)).getByLabelText(/salario básico/i)).toHaveValue('2.000.000');
  });

  // Cuántas hay que mirar. Sin esta frase, un administrador con 250 fichas no sabe si el aviso le
  // habla de una persona o de cuarenta. Una mutación demostró que borrarla no rompía nada.
  it('dice cuántas personas hay que revisar, en singular', async () => {
    montar();
    const dialogo = await screen.findByRole('dialog');
    expect(dialogo).toHaveTextContent(/hay 1 persona cuyo salario parece incluir el auxilio/i);
  });

  it('y en plural cuando son varias', async () => {
    montar({
      ...RESPUESTA,
      colaboradores: [
        persona('c1', 'Santiago', 2_000_000, true),
        persona('c3', 'Luciana', 2_000_000, true),
        persona('c2', 'Ana', 2_500_000, false),
      ],
    });
    const dialogo = await screen.findByRole('dialog');
    expect(dialogo).toHaveTextContent(/hay 2 personas cuyo salario parece incluir el auxilio/i);
  });

  it('se puede confirmar que están bien sin tocar a nadie, y el bloqueo se va', async () => {
    const usuario = userEvent.setup();
    post.mockResolvedValue({ data: { ok: true } });
    montar();
    const dialogo = await screen.findByRole('dialog');
    await usuario.click(within(dialogo).getByRole('button', { name: /están bien|confirmar/i }));

    expect(post).toHaveBeenCalledWith('/configuracion/auxilio-revisado');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('corregir a una persona la guarda por la ruta de siempre, con los dos campos', async () => {
    const usuario = userEvent.setup();
    put.mockResolvedValue({ data: {} });
    montar();
    const dialogo = await screen.findByRole('dialog');
    const ficha = fichaDe(dialogo, /Santiago/);

    await usuario.clear(within(ficha).getByLabelText(/salario básico/i));
    await usuario.type(within(ficha).getByLabelText(/salario básico/i), '1750905');
    await usuario.click(within(ficha).getByRole('button', { name: /guardar/i }));

    // Lo que se ve lleva puntos; lo que viaja es el número. Antes se guardaba con `Number(...)`,
    // que sobre "1.750.905" da NaN.
    expect(put).toHaveBeenCalledWith('/colaboradores/c1', { salarioMensual: 1_750_905, auxilioTransporte: null });
  });

  // Vacío y cero NO son lo mismo, y es la distinción más cara de esta pantalla: vacío es «que lo
  // ponga el decreto», cero es «esta empresa no lo paga». `formatearMiles(0)` devuelve cadena
  // vacía, así que un cero formateado sin cuidado se convierte solo en automático.
  it('un auxilio en cero se ve como 0 y no como campo vacío', async () => {
    montar({
      ...RESPUESTA,
      colaboradores: [{ ...persona('c1', 'Santiago', 2_000_000, true), auxilioTransporte: 0 }],
    });
    const dialogo = await screen.findByRole('dialog');
    expect(within(fichaDe(dialogo, /Santiago/)).getByLabelText(/auxilio/i)).toHaveValue('0');
  });

  // Escribir un 0 a mano es el caso que más fácil se rompe: `formatearMiles(0)` devuelve cadena
  // vacía, así que un formateo ingenuo en el `onChange` borraría el campo mientras la persona
  // escribe, y al guardar mandaría «automático» donde pidió «aquí no se paga».
  it('escribir un 0 deja un 0, no borra el campo', async () => {
    const usuario = userEvent.setup();
    put.mockResolvedValue({ data: {} });
    montar();
    const dialogo = await screen.findByRole('dialog');
    const ficha = fichaDe(dialogo, /Santiago/);
    const campoAuxilio = within(ficha).getByLabelText(/auxilio/i);

    await usuario.type(campoAuxilio, '0');
    expect(campoAuxilio).toHaveValue('0');

    await usuario.click(within(ficha).getByRole('button', { name: /guardar/i }));
    expect(put).toHaveBeenCalledWith('/colaboradores/c1', { salarioMensual: 2_000_000, auxilioTransporte: 0 });
  });

  it('y ese cero llega al servidor como cero, no como automático', async () => {
    const usuario = userEvent.setup();
    put.mockResolvedValue({ data: {} });
    montar({
      ...RESPUESTA,
      colaboradores: [{ ...persona('c1', 'Santiago', 2_000_000, true), auxilioTransporte: 0 }],
    });
    const dialogo = await screen.findByRole('dialog');
    const ficha = fichaDe(dialogo, /Santiago/);
    await usuario.click(within(ficha).getByRole('button', { name: /guardar/i }));

    expect(put).toHaveBeenCalledWith('/colaboradores/c1', { salarioMensual: 2_000_000, auxilioTransporte: 0 });
  });
});
