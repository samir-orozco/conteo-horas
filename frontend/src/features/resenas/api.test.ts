import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  pedirPendiente, enviarResena, pedirResenasPublicas, listarResenasAdmin, crearResenaManual,
  editarResenaManual, cambiarEstadoResena, quitarNombreResena, yaRespondio, NOMBRE_ANONIMO,
} from './api';

// Las llamadas al servidor de las reseñas, contra el contrato acordado con el backend.
//
// Es plomería, pero una ruta mal escrita aquí no da error al compilar: da un 404 que la ventana
// mostraría como «no tienes reseña pendiente», o sea un silencio (CLAUDE.md §12.2). Por eso cada
// llamada se compara con su método y su ruta exactos.

const get = vi.fn();
const post = vi.fn();
const put = vi.fn();
vi.mock('../../lib/api', () => ({
  default: {
    get: (...a: unknown[]) => get(...a),
    post: (...a: unknown[]) => post(...a),
    put: (...a: unknown[]) => put(...a),
  },
}));

beforeEach(() => {
  get.mockReset();
  post.mockReset();
  put.mockReset();
});

describe('las rutas de la empresa', () => {
  it('pregunta si hay reseña pendiente y devuelve lo que contestó el servidor', async () => {
    const respuesta = { pendiente: true, opciones: { CON_NOMBRE: 'Sí, como Ana, de Tuercas SAS', ANONIMA: 'Prefiero anónimo' } };
    get.mockResolvedValue({ data: respuesta });
    await expect(pedirPendiente()).resolves.toEqual(respuesta);
    expect(get).toHaveBeenCalledWith('/resenas/pendiente');
  });

  it('envía la reseña con el cuerpo tal cual', async () => {
    post.mockResolvedValue({ data: { ok: true } });
    const cuerpo = { accion: 'ENVIAR' as const, estrellas: 5, texto: 'Muy bueno', comoAparece: 'ANONIMA' as const };
    await expect(enviarResena(cuerpo)).resolves.toEqual({ ok: true });
    expect(post).toHaveBeenCalledWith('/resenas', cuerpo);
  });

  it('omitir va por la misma ruta, con su acción', async () => {
    post.mockResolvedValue({ data: { ok: true } });
    await enviarResena({ accion: 'OMITIR' });
    expect(post).toHaveBeenCalledWith('/resenas', { accion: 'OMITIR' });
  });
});

describe('la ruta pública', () => {
  it('trae las reseñas publicadas y devuelve la lista', async () => {
    const lista = [{ id: 'r1', estrellas: 4, texto: 'Bien', nombre: NOMBRE_ANONIMO, detalle: null }];
    get.mockResolvedValue({ data: { resenas: lista } });
    await expect(pedirResenasPublicas()).resolves.toEqual(lista);
    expect(get).toHaveBeenCalledWith('/resenas/publicas');
  });

  it('la firma de una anónima es la del contrato', () => {
    expect(NOMBRE_ANONIMO).toBe('Cliente de HoraPro');
  });
});

describe('las rutas del super admin', () => {
  it('lista con el resumen', async () => {
    const datos = { resenas: [], resumen: { promedio: null, total: 0, distribucion: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }, omitidas: 0 } };
    get.mockResolvedValue({ data: datos });
    await expect(listarResenasAdmin()).resolves.toEqual(datos);
    expect(get).toHaveBeenCalledWith('/admin/resenas');
  });

  const manual = {
    estrellas: null, texto: 'Excelente', nombrePublico: 'Mateo Vera', cargoPublico: 'CEO Grupo MSM',
    empresaId: null, canal: 'WhatsApp', fechaOpinion: '2026-07-19', referencia: 'chat del 19/07', autorizacion: 'dijo que sí',
  };

  it('crea una manual', async () => {
    post.mockResolvedValue({ data: { ok: true } });
    await crearResenaManual(manual);
    expect(post).toHaveBeenCalledWith('/admin/resenas', manual);
  });

  it('edita una manual por su id', async () => {
    put.mockResolvedValue({ data: { ok: true } });
    await editarResenaManual('r1', manual);
    expect(put).toHaveBeenCalledWith('/admin/resenas/r1', manual);
  });

  it('cambia el estado', async () => {
    put.mockResolvedValue({ data: { ok: true } });
    await cambiarEstadoResena('r1', 'PUBLICADA');
    expect(put).toHaveBeenCalledWith('/admin/resenas/r1/estado', { estado: 'PUBLICADA' });
  });

  it('quita el nombre', async () => {
    post.mockResolvedValue({ data: { ok: true } });
    await quitarNombreResena('r1');
    expect(post).toHaveBeenCalledWith('/admin/resenas/r1/quitar-nombre');
  });

  // Un id raro no puede cambiar de ruta: «r1/estado» no es una reseña.
  it('el id va escapado dentro de la ruta', async () => {
    put.mockResolvedValue({ data: { ok: true } });
    await cambiarEstadoResena('a/b', 'OCULTA');
    expect(put).toHaveBeenCalledWith('/admin/resenas/a%2Fb/estado', { estado: 'OCULTA' });
  });
});

// R9: si otro administrador (u otra pestaña) envió primero, no es un error: es «ya nos dejó su
// opinión, gracias». Se reconoce por el código del contrato, no por el texto del mensaje.
describe('yaRespondio', () => {
  const error = (status: number, data: unknown) => ({ isAxiosError: true, config: {}, response: { status, data } });

  it('reconoce el 409 de «ya respondió»', () => {
    expect(yaRespondio(error(409, { error: 'Ya respondió', codigo: 'YA_RESPONDIO' }))).toBe(true);
  });

  it('un 409 con otro código no lo es', () => {
    expect(yaRespondio(error(409, { error: 'Otro choque', codigo: 'OTRO' }))).toBe(false);
  });

  it('el código sin el 409 tampoco', () => {
    expect(yaRespondio(error(400, { codigo: 'YA_RESPONDIO' }))).toBe(false);
  });

  it('un error sin respuesta, o que no es de axios, no lo es', () => {
    expect(yaRespondio({ isAxiosError: true, config: {} })).toBe(false);
    expect(yaRespondio(new Error('Network Error'))).toBe(false);
    expect(yaRespondio(null)).toBe(false);
    expect(yaRespondio('409')).toBe(false);
  });
});
