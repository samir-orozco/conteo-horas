import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CabeceraFicha from './CabeceraFicha';

const persona = {
  nombre: 'Julián', apellido: 'Restrepo', cargo: 'Vigilante', cedula: '1020304050',
  salarioMensual: 1750905, creadoEn: '2026-07-06T05:00:00.000Z', activo: true,
};

const montar = (over = {}, acciones: Record<string, unknown> = {}) => render(
  <CabeceraFicha
    persona={{ ...persona, ...over }}
    onVolver={vi.fn()} onEditar={vi.fn()}
    onArchivoFoto={vi.fn()} onQuitarFoto={vi.fn()}
    {...acciones}
  />,
);

const jpg = () => new File(['x'], 'yo.jpg', { type: 'image/jpeg' });

describe('la cabecera de la ficha', () => {
  it('muestra quién es y lo que lo identifica de un vistazo', () => {
    montar();
    expect(screen.getByRole('heading', { name: /Julián Restrepo/ })).toBeInTheDocument();
    expect(screen.getByText('Vigilante')).toBeInTheDocument();
    expect(screen.getByText(/1020304050/)).toBeInTheDocument();
    expect(screen.getByText(/1\.750\.905/)).toBeInTheDocument();
  });

  it('sin cargo lo dice, en vez de dejar un hueco', () => {
    montar({ cargo: null });
    expect(screen.getByText('Sin cargo')).toBeInTheDocument();
  });

  it('sin foto usa las iniciales', () => {
    montar();
    expect(screen.getByText('JR')).toBeInTheDocument();
    expect(screen.queryByRole('img', { name: /Foto de/i })).not.toBeInTheDocument();
  });

  it('con foto la muestra y describe de quién es, no "avatar"', () => {
    montar({ foto: 'data:image/jpeg;base64,xxx' });
    const img = screen.getByRole('img', { name: /Foto de/i });
    expect(img).toHaveAttribute('src', 'data:image/jpeg;base64,xxx');
    expect(img).toHaveAccessibleName(/Julián Restrepo/);
  });

  it('quien está retirado se ve retirado, y no solo por el color', () => {
    montar({ activo: false });
    expect(screen.getByText('RETIRADO')).toBeInTheDocument();
  });

  it('el estado también se anuncia a un lector de pantalla', () => {
    montar({ activo: false });
    expect(screen.getByLabelText(/Retirado/i)).toBeInTheDocument();
  });

  it('volver y editar hacen lo suyo', async () => {
    const onVolver = vi.fn(), onEditar = vi.fn();
    montar({}, { onVolver, onEditar });
    await userEvent.click(screen.getByRole('button', { name: /Volver/i }));
    expect(onVolver).toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: /Editar/i }));
    expect(onEditar).toHaveBeenCalled();
  });

  it('sin fecha de ingreso no inventa un "desde"', () => {
    montar({ creadoEn: null });
    expect(screen.queryByText(/Desde/i)).not.toBeInTheDocument();
  });
});

describe('la foto, desde el propio círculo', () => {
  it('el círculo es un control y dice de quién es la foto que se va a cambiar', async () => {
    montar();
    expect(screen.getByRole('button', { name: /foto de Julián Restrepo/i })).toBeInTheDocument();
  });

  it('ofrece subir una foto', async () => {
    montar();
    await userEvent.click(screen.getByRole('button', { name: /foto de Julián Restrepo/i }));
    expect(screen.getByText(/Subir una foto/i)).toBeInTheDocument();
  });

  it('quitar la foto solo aparece cuando hay una: no se quita lo que no existe', async () => {
    montar();
    await userEvent.click(screen.getByRole('button', { name: /foto de Julián Restrepo/i }));
    expect(screen.queryByText(/Quitar la foto/i)).not.toBeInTheDocument();

    await userEvent.keyboard('{Escape}');
    montar({ foto: 'data:image/jpeg;base64,xxx' });
    await userEvent.click(screen.getAllByRole('button', { name: /foto de Julián Restrepo/i })[1]);
    expect(screen.getByText(/Quitar la foto/i)).toBeInTheDocument();
  });

  it('elegir un archivo lo entrega tal cual, sin tocarlo', async () => {
    const onArchivoFoto = vi.fn();
    montar({}, { onArchivoFoto });
    await userEvent.click(screen.getByRole('button', { name: /foto de Julián Restrepo/i }));
    await userEvent.upload(screen.getByLabelText(/Subir una foto/i), jpg());
    expect(onArchivoFoto).toHaveBeenCalledWith(expect.any(File));
  });

  it('un PDF no pasa, y se dice por qué', async () => {
    // Se dispara el change a mano, SIN pasar por el filtro de `accept`.
    //
    // La primera versión de esta prueba usaba userEvent.upload y no podía
    // fallar: userEvent respeta el accept del input, así que el archivo nunca
    // llegaba al manejador y la aserción se cumplía sola. Comprobado por
    // mutación: rompiendo la guarda del componente, la prueba seguía verde.
    //
    // Y el accept no es una defensa: se salta eligiendo "todos los archivos" y
    // arrastrar y soltar ni lo mira. Lo que protege es la guarda, y esto es lo
    // que la ejercita.
    const onArchivoFoto = vi.fn();
    montar({}, { onArchivoFoto });
    await userEvent.click(screen.getByRole('button', { name: /foto de Julián Restrepo/i }));
    const entrada = screen.getByLabelText(/Subir una foto/i) as HTMLInputElement;
    const pdf = new File(['x'], 'contrato.pdf', { type: 'application/pdf' });
    fireEvent.change(entrada, { target: { files: [pdf] } });
    expect(onArchivoFoto).not.toHaveBeenCalled();
    expect(screen.getByText(/no es una foto/i)).toBeInTheDocument();
  });

  it('el SVG sí llega a la guarda, y ahí se rechaza con un mensaje', async () => {
    // Un SVG pasa el filtro de `image/*`, así que este es el caso que prueba
    // que la comprobación en código existe y dice algo.
    const onArchivoFoto = vi.fn();
    montar({}, { onArchivoFoto });
    await userEvent.click(screen.getByRole('button', { name: /foto de Julián Restrepo/i }));
    await userEvent.upload(screen.getByLabelText(/Subir una foto/i),
      new File(['<svg/>'], 'logo.svg', { type: 'image/svg+xml' }));
    expect(screen.getByText(/no es una foto/i)).toBeInTheDocument();
  });

  it('un HEIC ya no lo bloquea la guarda de formato', async () => {
    // Lo que esta prueba comprueba, y NO más que eso: que la lista blanca de
    // tres MIME ya no está, así que el archivo llega al manejador en vez de
    // rebotar con "La foto debe ser JPG, PNG o WEBP".
    //
    // Lo que NO puede comprobar: que la foto se convierta. Eso lo hace el
    // canvas, que jsdom no implementa, y encima depende de si el navegador sabe
    // decodificar HEIC (Safari sí, Chrome en escritorio no). Cuando no sabe, el
    // <img> falla y la persona recibe el mensaje de `cargar()`, que por eso
    // dice qué hacer en vez de solo decir que no se pudo.
    const onArchivoFoto = vi.fn();
    montar({}, { onArchivoFoto });
    await userEvent.click(screen.getByRole('button', { name: /foto de Julián Restrepo/i }));
    await userEvent.upload(screen.getByLabelText(/Subir una foto/i),
      new File(['x'], 'IMG_0421.HEIC', { type: 'image/heic' }));
    expect(onArchivoFoto).toHaveBeenCalledWith(expect.any(File));
  });

  it('un SVG no pasa aunque el navegador lo llame imagen', async () => {
    // Es la única imagen que se rechaza: es un documento y puede traer scripts.
    const onArchivoFoto = vi.fn();
    montar({}, { onArchivoFoto });
    await userEvent.click(screen.getByRole('button', { name: /foto de Julián Restrepo/i }));
    await userEvent.upload(screen.getByLabelText(/Subir una foto/i),
      new File(['<svg/>'], 'logo.svg', { type: 'image/svg+xml' }));
    expect(onArchivoFoto).not.toHaveBeenCalled();
  });

  it('quitar la foto avisa a quien manda', async () => {
    const onQuitarFoto = vi.fn();
    montar({ foto: 'data:image/jpeg;base64,xxx' }, { onQuitarFoto });
    await userEvent.click(screen.getByRole('button', { name: /foto de Julián Restrepo/i }));
    await userEvent.click(screen.getByText(/Quitar la foto/i));
    expect(onQuitarFoto).toHaveBeenCalled();
  });

  it('mientras guarda lo dice, para que nadie vuelva a hacer clic', () => {
    montar({}, { guardandoFoto: true });
    expect(screen.getByText(/Guardando/i)).toBeInTheDocument();
  });
});

// La modalidad decide si a esta persona se le valida la ubicación al marcar, y
// hasta ahora solo se veía abriendo el formulario de edición.
describe('modalidad de trabajo', () => {
  it('se ve sin tener que abrir el formulario', () => {
    montar({ modalidad: 'REMOTO' });
    expect(screen.getByText('Remoto')).toBeInTheDocument();
  });

  it('la presencial también se pinta: un hueco se leería como dato faltante', () => {
    montar({ modalidad: 'PRESENCIAL' });
    expect(screen.getByText('Presencial')).toBeInTheDocument();
  });

  it('sin el dato cae en presencial, que es como trabajaba todo el mundo antes', () => {
    montar();
    expect(screen.getByText('Presencial')).toBeInTheDocument();
  });
});
