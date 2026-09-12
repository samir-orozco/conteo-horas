import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';

vi.mock('../lib/api', () => ({ default: { get: vi.fn() } }));
// Sin reloj: que una foto esté vencida depende de la fecha de hoy, y eso no es
// lo que prueba este archivo.
vi.mock('../lib/retencionFotos', () => ({ fotosExpiradas: () => false, MESES_RETENCION_FOTOS: 2 }));
import api from '../lib/api';
import FotosJornada from './FotosJornada';
import type { FotoDeJornada } from '../constants/momentos';

const get = api.get as unknown as ReturnType<typeof vi.fn>;
const bog = (h: number, m: number) => new Date(Date.UTC(2026, 8, 10, h + 5, m)).toISOString();
const IMG = 'data:image/jpeg;base64,x';
const POBLADO = { id: 's1', nombre: 'El Poblado' };
const LAURELES = { id: 's2', nombre: 'Laureles' };

const foto = (p: Partial<FotoDeJornada>): FotoDeJornada => ({
  registroId: 'r1', momento: 'ENTRADA', hora: bog(7, 48), foto: IMG, estimada: false, ...p,
});
const responder = (fotos: FotoDeJornada[]) => get.mockResolvedValue({ data: { fecha: bog(0, 0), fotos } });

beforeEach(() => get.mockReset());

describe('las fotos de verificación facial del día', () => {
  it('con varios turnos, cada uno lleva su título con las horas y sus propias fotos', async () => {
    // Es el caso de la captura que motivó el cambio: seis fotos seguidas donde
    // no se sabía qué salida cerraba qué entrada.
    responder([
      foto({ registroId: 'a', momento: 'ENTRADA', hora: bog(7, 48), jornada: 0 }),
      foto({ registroId: 'a', momento: 'SALIDA', hora: bog(8, 32), jornada: 0 }),
      foto({ registroId: 'b', momento: 'ENTRADA', hora: bog(8, 32), jornada: 1 }),
      foto({ registroId: 'b', momento: 'SALIDA', hora: bog(9, 6), jornada: 1 }),
      foto({ registroId: 'c', momento: 'ENTRADA', hora: bog(9, 7), jornada: 2 }),
      foto({ registroId: 'c', momento: 'SALIDA', hora: bog(9, 7), jornada: 2 }),
    ]);
    render(<FotosJornada registroId="a" />);
    const t1 = await screen.findByRole('region', { name: 'Turno 1 · 07:48 a 08:32' });
    const t2 = screen.getByRole('region', { name: 'Turno 2 · 08:32 a 09:06' });
    const t3 = screen.getByRole('region', { name: 'Turno 3 · 09:07 a 09:07' });
    for (const t of [t1, t2, t3]) expect(within(t).getAllByRole('img')).toHaveLength(2);
  });

  it('un turno sin entrada no inventa la hora de inicio', async () => {
    // Una marcación cargada a mano puede traer solo la salida: el formulario no
    // exige entrada. Su única hora es la de salida, y no es un inicio.
    responder([
      foto({ registroId: 'a', momento: 'ENTRADA', hora: bog(8, 0), jornada: 0 }),
      foto({ registroId: 'a', momento: 'SALIDA', hora: bog(10, 0), jornada: 0 }),
      foto({ registroId: 'b', momento: 'SALIDA', hora: bog(12, 0), foto: null, jornada: 1 }),
    ]);
    render(<FotosJornada registroId="a" />);
    expect(await screen.findByRole('region', { name: 'Turno 1 · 08:00 a 10:00' })).toBeTruthy();
    expect(screen.getByRole('region', { name: 'Turno 2 · sin entrada, salida 12:00' })).toBeTruthy();
  });

  it('con un solo turno no pone título: sería ruido', async () => {
    responder([
      foto({ momento: 'ENTRADA', jornada: 0 }),
      foto({ momento: 'SALIDA', hora: bog(17, 0), jornada: 0 }),
    ]);
    render(<FotosJornada registroId="r1" />);
    expect(await screen.findAllByRole('img')).toHaveLength(2);
    expect(screen.queryByRole('region')).toBeNull();
    expect(screen.queryByText(/Turno 1/)).toBeNull();
  });

  it('cada foto dice en qué sede se tomó', async () => {
    responder([
      foto({ momento: 'ENTRADA', jornada: 0, sede: POBLADO }),
      foto({ momento: 'SALIDA', hora: bog(17, 0), jornada: 0, sede: LAURELES }),
    ]);
    render(<FotosJornada registroId="r1" />);
    expect(await screen.findByAltText('Foto de entrada en El Poblado')).toBeTruthy();
    expect(screen.getByAltText('Foto de salida en Laureles')).toBeTruthy();
    expect(screen.getByText('El Poblado')).toBeTruthy();
    expect(screen.getByText('Laureles')).toBeTruthy();
  });

  it('avisa cuando el turno abrió y cerró en sedes distintas, y solo entonces', async () => {
    responder([
      foto({ registroId: 'a', momento: 'ENTRADA', jornada: 0, sede: POBLADO }),
      foto({ registroId: 'a', momento: 'SALIDA', hora: bog(12, 0), jornada: 0, sede: LAURELES }),
      foto({ registroId: 'b', momento: 'ENTRADA', hora: bog(13, 0), jornada: 1, sede: POBLADO }),
      foto({ registroId: 'b', momento: 'SALIDA', hora: bog(17, 0), jornada: 1, sede: POBLADO }),
    ]);
    render(<FotosJornada registroId="a" />);
    const t1 = await screen.findByRole('region', { name: /Turno 1/ });
    const t2 = screen.getByRole('region', { name: /Turno 2/ });
    expect(within(t1).getByText('Abrió y cerró en sedes distintas')).toBeTruthy();
    expect(within(t2).queryByText('Abrió y cerró en sedes distintas')).toBeNull();
  });

  it('una salida sin sede no hereda la de la entrada de su turno', async () => {
    // La entrada del mismo turno SÍ trae sede: es la única de la que se podría
    // heredar. Sin ella en el fixture, no inventar nada sale gratis.
    responder([
      foto({ momento: 'ENTRADA', jornada: 0, sede: POBLADO }),
      foto({ momento: 'SALIDA', hora: bog(17, 0), jornada: 0, sede: null }),
    ]);
    render(<FotosJornada registroId="r1" />);
    expect(await screen.findByAltText('Foto de salida')).toBeTruthy();
    expect(screen.getByAltText('Foto de entrada en El Poblado')).toBeTruthy();
    expect(screen.getAllByText('El Poblado')).toHaveLength(1);
  });

  it('una entrada sin sede probada lleva su sede por defecto, con esa etiqueta, sin afirmar dónde se tomó la foto', async () => {
    // 12 de septiembre de 2026: la sede de un presencial que marcó sin ubicación se
    // muestra al leer. En la etiqueta sí; en el texto de la foto no, porque nadie
    // probó que se tomara ahí.
    responder([
      foto({ momento: 'ENTRADA', jornada: 0, sede: null, sedeAtribuida: { id: 's0', nombre: 'Sede principal', activa: true, porDefecto: true } }),
      foto({ momento: 'SALIDA', hora: bog(17, 0), jornada: 0, sede: null }),
    ]);
    render(<FotosJornada registroId="r1" />);
    expect(await screen.findByText('Sede principal (por defecto)')).toBeTruthy();
    expect(screen.getByAltText('Foto de entrada')).toBeTruthy();
  });

  it('con un backend que todavía no manda el turno, cae a la lista de antes', async () => {
    responder([
      foto({ registroId: 'a', momento: 'ENTRADA' }),
      foto({ registroId: 'a', momento: 'SALIDA', hora: bog(8, 32) }),
      foto({ registroId: 'b', momento: 'ENTRADA', hora: bog(9, 0) }),
    ]);
    render(<FotosJornada registroId="a" />);
    expect(await screen.findAllByRole('img')).toHaveLength(3);
    expect(screen.queryByRole('region')).toBeNull();
  });

  it('sigue explicando por qué falta una foto', async () => {
    responder([
      foto({ momento: 'ENTRADA', jornada: 0 }),
      foto({ momento: 'SALIDA', hora: bog(17, 0), foto: null, jornada: 0 }),
    ]);
    render(<FotosJornada registroId="r1" />);
    expect(await screen.findByText(/marcó/)).toBeTruthy();
  });
});
