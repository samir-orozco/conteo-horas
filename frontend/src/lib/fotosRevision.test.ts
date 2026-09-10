import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./api', () => ({ default: { get: vi.fn() } }));
import api from './api';
import { pedirFotos, fotoDelMomento, olvidarFotos, registrosEnMemoria, MAX_REGISTROS } from './fotosRevision';

const get = api.get as unknown as ReturnType<typeof vi.fn>;
const FOTOS = { fotoEntrada: 'data:image/jpeg;base64,ENTRADA', fotoSalida: 'data:image/jpeg;base64,SALIDA' };
const pedidasDe = (registroId: string) => get.mock.calls.filter(c => c[0] === `/registros/${registroId}/fotos`).length;

beforeEach(() => {
  olvidarFotos();
  get.mockReset();
  get.mockResolvedValue({ data: FOTOS });
});

describe('el caché de fotos de Revisión', () => {
  it('dos pedidos SIMULTÁNEOS del mismo registro hacen UNA sola petición', async () => {
    // Pasa de verdad: la entrada y la salida de un registro aparecen en pantalla
    // en el mismo instante y las dos miniaturas preguntan antes de que llegue la
    // primera respuesta. Por eso se guarda la promesa y no el resultado.
    const [a, b] = await Promise.all([pedirFotos('r1'), pedirFotos('r1')]);
    expect(pedidasDe('r1')).toBe(1);
    expect(a).toBe(b);
  });

  it('la entrada y la salida salen de la misma respuesta', async () => {
    const f = await pedirFotos('r1');
    expect(fotoDelMomento(f, 'entrada')).toBe(FOTOS.fotoEntrada);
    expect(fotoDelMomento(f, 'salida')).toBe(FOTOS.fotoSalida);
  });

  it('un fallo NO se queda guardado: el siguiente pedido lo vuelve a intentar', async () => {
    // Si se guardara la promesa rechazada, un corte de red de un segundo dejaría
    // ese registro sin foto el resto de la sesión.
    get.mockRejectedValueOnce(new Error('sin red'));
    await expect(pedirFotos('r1')).rejects.toThrow('sin red');
    await Promise.resolve();                       // deja correr el catch interno
    await expect(pedirFotos('r1')).resolves.toEqual(FOTOS);
    expect(pedidasDe('r1')).toBe(2);
  });

  it('no guarda más de MAX_REGISTROS: suelta los más viejos', async () => {
    await Promise.all(Array.from({ length: MAX_REGISTROS + 5 }, (_, i) => pedirFotos(`r${i}`)));
    expect(registrosEnMemoria()).toBe(MAX_REGISTROS);
    // el primero se soltó, así que pedirlo otra vez vuelve a la red
    await pedirFotos('r0');
    expect(pedidasDe('r0')).toBe(2);
  });

  it('usar un registro lo salva del tope aunque sea viejo', async () => {
    await pedirFotos('viejo');
    await Promise.all(Array.from({ length: MAX_REGISTROS - 1 }, (_, i) => pedirFotos(`r${i}`)));
    await pedirFotos('viejo');                     // se toca: pasa a ser el más reciente
    await pedirFotos('uno-mas');                   // esto obliga a soltar uno
    await pedirFotos('viejo');
    expect(pedidasDe('viejo')).toBe(1);            // nunca se soltó
  });

  it('olvidarFotos las suelta todas', async () => {
    await pedirFotos('r1');
    olvidarFotos();
    expect(registrosEnMemoria()).toBe(0);
    await pedirFotos('r1');
    expect(pedidasDe('r1')).toBe(2);
  });
});
