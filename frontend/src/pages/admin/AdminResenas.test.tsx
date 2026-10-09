import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import AdminResenas from './AdminResenas';
import type { ResenaAdmin, ResumenResenas } from '../../features/resenas/api';

// La pantalla «Reseñas» del super admin (docs/RESENAS.md, sección 4), con el servidor simulado. Se
// consulta por lo que ve una persona (texto, rol), no por clases de CSS (CLAUDE.md §7). La suite corre
// en Los Ángeles: las fechas tienen que salir en Bogotá.

const { get, post, put } = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn() }));
vi.mock('../../lib/api', () => ({
  default: {
    get: (...a: unknown[]) => get(...a), post: (...a: unknown[]) => post(...a),
    put: (...a: unknown[]) => put(...a), delete: vi.fn(),
  },
}));

const BASE: ResenaAdmin = {
  id: 'r1', origen: 'CLIENTE', estado: 'POR_REVISAR', empresaId: 'e1', usuarioId: 'u1', estrellas: 5,
  texto: 'Ya no peleamos con el Excel a fin de mes.', comoAparece: 'CON_NOMBRE',
  nombrePublico: 'Juan Pérez', cargoPublico: 'Tuercas SAS',
  textoAutorizacion: 'Sí, como Juan Pérez, de Tuercas SAS', versionPolitica: '1.2',
  canal: null, referencia: null, autorizacion: null, fechaOpinion: null, registradaPor: null,
  planAlEnviar: 'PROFESIONAL', mesesPagadosAlEnviar: 2, nombreRetiradoEn: null, publicadaEn: null,
  // Las 06:00 UTC del 2 de octubre: la 1 a. m. en Bogotá, las 11 p. m. del 1 en Los Ángeles.
  creadoEn: '2026-10-02T06:00:00.000Z', actualizadoEn: '2026-10-02T06:00:00.000Z',
  empresaNombre: 'Tuercas SAS', empresaActiva: true, estadoSuscripcion: 'ACTIVA', esReferida: false,
  autorNombre: 'Juan Pérez', autorEmail: 'juan@tuercas.co', mesesPagados: 3,
  marcas: [], publicable: true, motivoNoPublicable: null,
};

const ANONIMA: ResenaAdmin = {
  ...BASE, id: 'r2', estrellas: 2, comoAparece: 'ANONIMA', texto: 'El kiosco se demora en reconocer a la gente.',
  nombrePublico: 'Ana Ruiz', cargoPublico: 'Lavandería Las Brisas', empresaId: 'e2', empresaNombre: 'Lavandería Las Brisas',
  autorNombre: 'Ana Ruiz', autorEmail: 'ana@brisas.co', estadoSuscripcion: 'SUSPENDIDA', esReferida: true,
  marcas: ['TELEFONO'], creadoEn: '2026-10-01T15:00:00.000Z',
};

const CORTA: ResenaAdmin = {
  ...BASE, id: 'r3', empresaId: 'e3', texto: 'Muy buena.', nombrePublico: 'Luis Mora', cargoPublico: 'Panadería Mora',
  empresaNombre: 'Panadería Mora', autorNombre: 'Luis Mora',
  publicable: false, motivoNoPublicable: 'Necesita al menos 20 caracteres de texto.',
};

const MANUAL: ResenaAdmin = {
  ...BASE, id: 'r4', origen: 'MANUAL', estado: 'PUBLICADA', empresaId: null, usuarioId: null, estrellas: null,
  comoAparece: 'CON_NOMBRE', texto: 'Liquidar la nómina nos tomaba dos días.',
  nombrePublico: 'Mateo Vera', cargoPublico: 'CEO Grupo MSM', textoAutorizacion: null, versionPolitica: null,
  canal: 'WhatsApp', referencia: 'chat del 19/07', autorizacion: 'dijo que sí',
  // Medianoche de Bogotá: en Los Ángeles serían las 10 p. m. del 18.
  fechaOpinion: '2026-07-19T05:00:00.000Z', registradaPor: 'samir@horapro.co',
  planAlEnviar: null, mesesPagadosAlEnviar: null, empresaNombre: null, empresaActiva: null,
  estadoSuscripcion: null, autorNombre: null, autorEmail: null, mesesPagados: null,
};

// Una empresa que pulsó «Omitir». No se lista: solo se cuenta en el resumen.
const OMITIDA: ResenaAdmin = {
  ...BASE, id: 'r5', estado: 'OMITIDA', estrellas: null, texto: '', comoAparece: null, empresaId: 'e5',
  nombrePublico: 'Pedro Omitió', cargoPublico: 'Ferretería Omisa', empresaNombre: 'Ferretería Omisa',
  autorNombre: 'Pedro Omitió', publicable: false, motivoNoPublicable: 'La empresa omitió la reseña: no hay nada que publicar.',
};

// Archivada: sale de la lista normal y queda en su pestaña (R21).
const ARCHIVADA: ResenaAdmin = {
  ...BASE, id: 'r6', estado: 'ARCHIVADA', empresaId: 'e6', texto: 'Una que el dueño decidió guardar aparte.',
  nombrePublico: 'Sara Gil', cargoPublico: 'Óptica Gil', empresaNombre: 'Óptica Gil', autorNombre: 'Sara Gil',
  publicable: false, motivoNoPublicable: 'Una reseña archivada no se puede publicar.',
};

const RESUMEN: ResumenResenas = { promedio: 4.3, total: 23, distribucion: { 1: 1, 2: 2, 3: 2, 4: 6, 5: 12 }, omitidas: 2 };
const EMPRESAS = [
  { id: 'e1', nombre: 'Tuercas SAS' },
  { id: 'e7', nombre: 'Grupo MSM' },
];

function responder(resenas: ResenaAdmin[] = [BASE, ANONIMA, CORTA, MANUAL, OMITIDA, ARCHIVADA], resumen: ResumenResenas = RESUMEN) {
  get.mockImplementation((url: string) => {
    if (url === '/admin/resenas') return Promise.resolve({ data: { resenas, resumen } });
    if (url === '/admin/empresas') return Promise.resolve({ data: EMPRESAS });
    return Promise.reject(new Error(`GET inesperado: ${url}`));
  });
}

const pintar = () => render(<MemoryRouter><AdminResenas /></MemoryRouter>);

// La fila de una reseña, buscada por su texto.
const filaDe = async (texto: string | RegExp) => (await screen.findByText(texto)).closest('li')!;

beforeEach(() => {
  get.mockReset();
  post.mockReset();
  put.mockReset();
  post.mockResolvedValue({ data: { ok: true } });
  put.mockResolvedValue({ data: { ok: true } });
  responder();
});

describe('AdminResenas', () => {
  it('arriba, el promedio y la distribución de las de clientes, con las omitidas aparte (R15)', async () => {
    pintar();
    expect(await screen.findByText('4,3 ★')).toBeInTheDocument();
    expect(screen.getByText(/23 reseñas/)).toBeInTheDocument();
    const barras = screen.getByRole('list', { name: 'Distribución por estrellas' });
    expect(within(barras).getByRole('listitem', { name: '5 estrellas: 12' })).toBeInTheDocument();
    expect(within(barras).getByRole('listitem', { name: '1 estrella: 1' })).toBeInTheDocument();
    expect(screen.getByText(/2 empresas omitieron/)).toBeInTheDocument();
  });

  it('sin reseñas de clientes lo dice, en vez de un promedio vacío', async () => {
    responder([MANUAL], { promedio: null, total: 0, distribucion: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }, omitidas: 0 });
    pintar();
    expect(await screen.findByText(/Todavía no hay calificaciones de clientes/)).toBeInTheDocument();
  });

  it('las omitidas no se listan, y las pestañas cuentan sin ellas', async () => {
    pintar();
    await filaDe(/Ya no peleamos/);
    expect(screen.queryByText('Pedro Omitió')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Por revisar\s*3/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Publicadas\s*1/ })).toBeInTheDocument();
  });

  it('una archivada no está en «Todas»: se ve en su pestaña, y desde ahí vuelve a revisión (R21)', async () => {
    pintar();
    await filaDe(/Ya no peleamos/);
    expect(screen.queryByText(/guardar aparte/)).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /Archivadas\s*1/ }));
    const fila = await filaDe(/guardar aparte/);
    expect(screen.queryByText(/Ya no peleamos/)).not.toBeInTheDocument();
    expect(within(fila).queryByRole('button', { name: 'Publicar' })).not.toBeInTheDocument();
    await userEvent.click(within(fila).getByRole('button', { name: 'Devolver a revisión' }));
    expect(put).toHaveBeenCalledWith('/admin/resenas/r6/estado', { estado: 'POR_REVISAR' });
  });

  it('la fecha que pinta es la de Bogotá, no la del navegador', async () => {
    pintar();
    const fila = await filaDe(/Ya no peleamos/);
    expect(within(fila).getByText(/2 de oct de 2026/)).toBeInTheDocument();
    expect(within(fila).queryByText(/1 de oct de 2026/)).not.toBeInTheDocument();
    // La de una manual es la fecha de la opinión, anclada a medianoche de Bogotá (R31).
    const manual = await filaDe(/Liquidar la nómina/);
    expect(within(manual).getByText(/19 de jul de 2026/)).toBeInTheDocument();
  });

  it('una fila dice origen, plan y meses pagados; una manual, canal y quién la cargó (R14, R29)', async () => {
    pintar();
    expect(within(await filaDe(/Ya no peleamos/)).getByText(/Cliente · Profesional · 3 meses pagados/)).toBeInTheDocument();
    expect(within(await filaDe(/Liquidar la nómina/)).getByText(/Manual · WhatsApp · cargada por samir@horapro.co/)).toBeInTheDocument();
  });

  it('una anónima firma como «Cliente de HoraPro» y aquí, solo aquí, dice quién la escribió', async () => {
    pintar();
    const fila = await filaDe(/El kiosco se demora/);
    expect(within(fila).getByText('Cliente de HoraPro')).toBeInTheDocument();
    expect(within(fila).getByText(/Ana Ruiz · ana@brisas.co · Lavandería Las Brisas/)).toBeInTheDocument();

    // En la vista previa, que es la tarjeta de la landing, el nombre no aparece.
    await userEvent.click(within(fila).getByRole('button', { name: 'Publicar' }));
    const previa = await screen.findByRole('dialog', { name: 'Vista previa' });
    expect(within(previa).getByText('Cliente de HoraPro')).toBeInTheDocument();
    expect(within(previa).queryByText(/Ana Ruiz/)).not.toBeInTheDocument();
    expect(within(previa).queryByText(/Lavandería/)).not.toBeInTheDocument();
  });

  it('marca ⚑ las de 1 y 2 estrellas, lo que hay que leer, la empresa suspendida y la referida (R17, R18)', async () => {
    pintar();
    const fila = await filaDe(/El kiosco se demora/);
    expect(within(fila).getByRole('img', { name: 'Para hacerle seguimiento' })).toBeInTheDocument();
    expect(within(fila).getByRole('img', { name: '2 de 5 estrellas' })).toBeInTheDocument();
    expect(within(fila).getByText('Trae un teléfono')).toBeInTheDocument();
    expect(within(fila).getByText('Empresa suspendida')).toBeInTheDocument();
    expect(within(fila).getByText('Referida')).toBeInTheDocument();

    const otra = await filaDe(/Ya no peleamos/);
    expect(within(otra).queryByRole('img', { name: 'Para hacerle seguimiento' })).not.toBeInTheDocument();
  });

  it('publicar enseña antes la misma tarjeta de la landing, y al confirmar cambia el estado (R25)', async () => {
    pintar();
    const fila = await filaDe(/Ya no peleamos/);
    await userEvent.click(within(fila).getByRole('button', { name: 'Publicar' }));
    expect(put).not.toHaveBeenCalled();

    const previa = await screen.findByRole('dialog', { name: 'Vista previa' });
    expect(within(previa).getByText('Juan Pérez')).toBeInTheDocument();
    expect(within(previa).getByText('Tuercas SAS')).toBeInTheDocument();
    expect(within(previa).getByText('5 de 5 estrellas')).toBeInTheDocument();

    await userEvent.click(within(previa).getByRole('button', { name: 'Sí, publicar' }));
    expect(put).toHaveBeenCalledWith('/admin/resenas/r1/estado', { estado: 'PUBLICADA' });
    // Y vuelve a pedir la lista, para que la fila diga el estado nuevo.
    await vi.waitFor(() => expect(get.mock.calls.filter(([u]) => u === '/admin/resenas')).toHaveLength(2));
  });

  it('publicar está deshabilitado cuando no se puede, y dice por qué (R20)', async () => {
    pintar();
    const fila = await filaDe(/Muy buena/);
    expect(within(fila).getByRole('button', { name: 'Publicar' })).toBeDisabled();
    expect(within(fila).getByText('Necesita al menos 20 caracteres de texto.')).toBeInTheDocument();
  });

  it('ofrece solo los movimientos válidos: una publicada se oculta o se archiva, sin vista previa', async () => {
    pintar();
    const fila = await filaDe(/Liquidar la nómina/);
    expect(within(fila).queryByRole('button', { name: 'Publicar' })).not.toBeInTheDocument();
    await userEvent.click(within(fila).getByRole('button', { name: 'Ocultar' }));
    expect(put).toHaveBeenCalledWith('/admin/resenas/r4/estado', { estado: 'OCULTA' });
    expect(within(fila).getByRole('button', { name: 'Archivar' })).toBeInTheDocument();
  });

  it('quitar el nombre pide confirmación y avisa que no se deshace (R23)', async () => {
    pintar();
    const fila = await filaDe(/Ya no peleamos/);
    await userEvent.click(within(fila).getByRole('button', { name: 'Quitar el nombre' }));
    expect(post).not.toHaveBeenCalled();

    const dialogo = await screen.findByRole('dialog', { name: /Quitar el nombre/ });
    expect(within(dialogo).getByText(/no se puede deshacer/i)).toBeInTheDocument();
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Sí, quitar el nombre' }));
    expect(post).toHaveBeenCalledWith('/admin/resenas/r1/quitar-nombre');
  });

  it('el texto de un cliente no se edita; el de una manual sí (R22, R29)', async () => {
    pintar();
    expect(within(await filaDe(/Ya no peleamos/)).queryByRole('button', { name: 'Editar' })).not.toBeInTheDocument();
    expect(within(await filaDe(/Liquidar la nómina/)).getByRole('button', { name: 'Editar' })).toBeInTheDocument();
  });

  it('filtra por estrellas, por origen y con el buscador (R16)', async () => {
    pintar();
    await filaDe(/Ya no peleamos/);
    await userEvent.selectOptions(screen.getByLabelText('Origen'), 'MANUAL');
    expect(screen.queryByText(/Ya no peleamos/)).not.toBeInTheDocument();
    expect(screen.getByText(/Liquidar la nómina/)).toBeInTheDocument();

    await userEvent.selectOptions(screen.getByLabelText('Origen'), '');
    await userEvent.selectOptions(screen.getByLabelText('Estrellas'), '2');
    expect(screen.getByText(/El kiosco se demora/)).toBeInTheDocument();
    expect(screen.queryByText(/Liquidar la nómina/)).not.toBeInTheDocument();

    await userEvent.selectOptions(screen.getByLabelText('Estrellas'), '');
    await userEvent.type(screen.getByLabelText('Buscar'), 'ana@brisas');
    expect(screen.getByText(/El kiosco se demora/)).toBeInTheDocument();
    expect(screen.queryByText(/Ya no peleamos/)).not.toBeInTheDocument();
  });

  it('«+ Nueva reseña» manda el cuerpo que espera el servidor (4.3)', async () => {
    pintar();
    await filaDe(/Ya no peleamos/);
    await userEvent.click(screen.getByRole('button', { name: /Nueva reseña/ }));
    const formulario = await screen.findByRole('dialog', { name: 'Nueva reseña' });
    const campo = (etiqueta: string | RegExp) => within(formulario).getByLabelText(etiqueta);

    await userEvent.click(within(formulario).getByRole('radio', { name: '4 estrellas' }));
    await userEvent.type(campo('Texto'), 'Liquidar la nómina nos tomaba dos días.');
    await userEvent.type(campo('Nombre'), 'Mateo Vera');
    await userEvent.type(campo('Cargo y empresa'), 'CEO Grupo MSM');
    // La lista de empresas sale de GET /admin/empresas, que ya existe.
    await within(formulario).findByRole('option', { name: 'Grupo MSM' });
    await userEvent.selectOptions(campo(/Es cliente de HoraPro/), 'e7');
    await userEvent.selectOptions(campo('Canal'), 'WhatsApp');
    await userEvent.clear(campo('Fecha de la opinión'));
    await userEvent.type(campo('Fecha de la opinión'), '2026-07-19');
    await userEvent.type(campo('Dónde quedó'), 'chat de WhatsApp del 19/07');
    await userEvent.type(campo('Cómo autorizó'), 'dijo que sí por WhatsApp');
    await userEvent.click(within(formulario).getByRole('button', { name: 'Guardar' }));

    expect(post).toHaveBeenCalledWith('/admin/resenas', {
      estrellas: 4, texto: 'Liquidar la nómina nos tomaba dos días.', nombrePublico: 'Mateo Vera',
      cargoPublico: 'CEO Grupo MSM', empresaId: 'e7', canal: 'WhatsApp', fechaOpinion: '2026-07-19',
      referencia: 'chat de WhatsApp del 19/07', autorizacion: 'dijo que sí por WhatsApp',
    });
    await vi.waitFor(() => expect(screen.queryByRole('dialog', { name: 'Nueva reseña' })).not.toBeInTheDocument());
  });

  it('una empresa que ya tiene su reseña no se puede elegir otra vez (D1)', async () => {
    pintar();
    await filaDe(/Ya no peleamos/);
    await userEvent.click(screen.getByRole('button', { name: /Nueva reseña/ }));
    const formulario = await screen.findByRole('dialog', { name: 'Nueva reseña' });
    expect(await within(formulario).findByRole('option', { name: /Tuercas SAS/ })).toBeDisabled();
    expect(within(formulario).getByRole('option', { name: 'Grupo MSM' })).toBeEnabled();
  });

  it('sin estrellas ni «la fuente no traía calificación» no manda nada (R28)', async () => {
    pintar();
    await filaDe(/Ya no peleamos/);
    await userEvent.click(screen.getByRole('button', { name: /Nueva reseña/ }));
    const formulario = await screen.findByRole('dialog', { name: 'Nueva reseña' });
    await userEvent.type(within(formulario).getByLabelText('Texto'), 'Una opinión sin calificación.');
    await userEvent.click(within(formulario).getByRole('button', { name: 'Guardar' }));
    expect(post).not.toHaveBeenCalled();
    expect(within(formulario).getByText(/Elige las estrellas/)).toBeInTheDocument();

    await userEvent.click(within(formulario).getByLabelText('La fuente no traía calificación'));
    await userEvent.click(within(formulario).getByRole('button', { name: 'Guardar' }));
    expect(post).toHaveBeenCalledWith('/admin/resenas', expect.objectContaining({ estrellas: null }));
  });

  it('editar una manual la trae llena, con la fecha en el día de Bogotá, y la guarda con PUT', async () => {
    pintar();
    await userEvent.click(within(await filaDe(/Liquidar la nómina/)).getByRole('button', { name: 'Editar' }));
    const formulario = await screen.findByRole('dialog', { name: 'Editar reseña' });
    expect(within(formulario).getByLabelText('Fecha de la opinión')).toHaveValue('2026-07-19');
    expect(within(formulario).getByLabelText('La fuente no traía calificación')).toBeChecked();

    await userEvent.click(within(formulario).getByRole('button', { name: 'Guardar' }));
    expect(put).toHaveBeenCalledWith('/admin/resenas/r4', expect.objectContaining({
      estrellas: null, nombrePublico: 'Mateo Vera', fechaOpinion: '2026-07-19', canal: 'WhatsApp',
    }));
  });

  it('si el servidor rechaza un cambio, dice por qué', async () => {
    put.mockRejectedValueOnce({ response: { status: 409, data: { error: 'Alguien la cambió mientras tanto. Recarga la lista.' } } });
    pintar();
    await userEvent.click(within(await filaDe(/Liquidar la nómina/)).getByRole('button', { name: 'Ocultar' }));
    expect(await screen.findByText('Alguien la cambió mientras tanto. Recarga la lista.')).toBeInTheDocument();
  });

  it('si la lista no carga, lo dice en vez de quedarse en blanco', async () => {
    get.mockRejectedValue({ response: { status: 500, data: { error: 'Error interno' } } });
    pintar();
    expect(await screen.findByText('Error interno')).toBeInTheDocument();
  });
});
