import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RevisionMarcaciones from './RevisionMarcaciones';

// LA PANTALLA DE REVISIÓN DE MARCACIONES.
//
// Lo que más importa probar aquí no es que pinte bonito, sino QUE NO CARGUE
// FOTOS QUE NADIE PIDIÓ. La política de tratamiento de datos que está publicada
// afirma que los datos biométricos «no se exponen en los listados del sistema y
// solo se entregan a solicitud expresa de un usuario autorizado». Si esta
// pantalla precargara las fotos de la lista, esa frase de un documento legal en
// línea dejaría de ser cierta. Por eso hay una prueba dedicada a contar
// peticiones, y no solo a mirar lo que se ve.

vi.mock('../lib/api', () => ({ default: { get: vi.fn() } }));

// El detector de pantalla se simula: su aritmética ya está probada aparte con
// imágenes de respuesta conocida (deteccionPantalla.test.ts), y jsdom no decodifica
// JPEG. Lo que se prueba AQUÍ es la costura: que la pista se pinte cuando dispara,
// que no se pinte cuando no, y que una pista que llega tarde no se pegue a la foto
// equivocada al pasar de una marcación a la siguiente.
vi.mock('../lib/pistaPantalla', () => ({
  UMBRAL_PISTA: 0.7,
  pistaDePantalla: vi.fn(),
  pistaDeUrl: vi.fn(),
}));
import { pistaDePantalla, pistaDeUrl } from '../lib/pistaPantalla';
const mirar = pistaDePantalla as unknown as ReturnType<typeof vi.fn>;
const mirarUrl = pistaDeUrl as unknown as ReturnType<typeof vi.fn>;
import api from '../lib/api';
const get = api.get as unknown as ReturnType<typeof vi.fn>;

const evento = (p: Record<string, unknown> = {}) => ({
  clave: 'r1:entrada', registroId: 'r1', momento: 'entrada',
  colaboradorId: 'c1', sedeId: null, hora: '2026-09-09T13:00:00.000Z',
  metodo: 'ROSTRO', tieneFoto: true,
  laPusoElSistema: false, distanciaRepetida: false,
  ...p,
});

const respuesta = (eventos: ReturnType<typeof evento>[]) => ({
  desde: '2026-09-09T05:00:00.000Z', hasta: '2026-09-10T05:00:00.000Z',
  dias: 1, truncado: false, eventos,
  personas: [
    { id: 'c1', nombre: 'Julián', apellido: 'Torres', cargo: 'Mesero' },
    { id: 'c2', nombre: 'Ana', apellido: 'Ruiz', cargo: null },
  ],
});

const FOTO = 'data:image/jpeg;base64,zzz';
const SIN_PISTA = { hay: false, paralelas: 0.3, caras: 1, rasgos: {} as never };
const CON_PISTA = { hay: true, paralelas: 0.94, caras: 2, rasgos: {} as never };

function montarCon(eventos: ReturnType<typeof evento>[]) {
  get.mockImplementation((url: string) => {
    if (url === '/registros/revision') return Promise.resolve({ data: respuesta(eventos) });
    if (url.endsWith('/fotos')) return Promise.resolve({ data: { fotoEntrada: FOTO, fotoSalida: null } });
    return Promise.reject(new Error('url inesperada: ' + url));
  });
  return render(<RevisionMarcaciones />);
}

beforeEach(() => {
  // La memoria de lo revisado vive en localStorage. Sin esto, una prueba deja
  // marcas puestas y la siguiente pasa (o falla) por lo que hizo la anterior.
  localStorage.clear();
  get.mockReset();
  mirar.mockReset(); mirar.mockResolvedValue(SIN_PISTA);
  mirarUrl.mockReset(); mirarUrl.mockResolvedValue(SIN_PISTA);
});

describe('revisión de marcaciones', () => {
  it('LA GUARDA: solo pide la foto de la marcación que se está mirando', async () => {
    // Tres marcaciones en la lista, UNA sola petición de foto. Si alguien
    // cambiara la pantalla para precargarlas, esta prueba se pone roja y con
    // ella se entera de que está contradiciendo la política publicada.
    montarCon([
      evento({ clave: 'r1:entrada', registroId: 'r1' }),
      evento({ clave: 'r2:entrada', registroId: 'r2', colaboradorId: 'c2' }),
      evento({ clave: 'r3:entrada', registroId: 'r3' }),
    ]);
    // El contador es único; el nombre aparece dos veces, en la lista y en la cabecera.
    await screen.findByText('1 / 3');
    await waitFor(() => expect(get.mock.calls.filter(c => String(c[0]).endsWith('/fotos'))).toHaveLength(1));
    expect(get.mock.calls.filter(c => String(c[0]).endsWith('/fotos'))[0][0]).toBe('/registros/r1/fotos');
  });

  it('muestra la foto de quien se está mirando, y dice de quién es', async () => {
    montarCon([evento()]);
    const img = await screen.findByRole('img');
    expect(img).toHaveAttribute('src', FOTO);
    expect(img).toHaveAccessibleName(/Julián Torres/);
  });

  it('con la flecha derecha se pasa a la siguiente y se pide SU foto', async () => {
    // Es lo que hace que revisar cuarenta caras sea viable. Sin teclado, nadie
    // termina la lista.
    montarCon([
      evento({ clave: 'r1:entrada', registroId: 'r1' }),
      evento({ clave: 'r2:entrada', registroId: 'r2', colaboradorId: 'c2' }),
    ]);
    await screen.findByText('1 / 2');
    await userEvent.keyboard('{ArrowRight}');
    await screen.findByText('2 / 2');
    await waitFor(() =>
      expect(get.mock.calls.some(c => c[0] === '/registros/r2/fotos')).toBe(true));
  });

  it('cuando no hay foto explica POR QUÉ, sin adivinar', async () => {
    // Antes el producto decía «marcó con cédula o se cargó a mano» porque no
    // sabía cuál era. Ahora lo sabe.
    montarCon([evento({ tieneFoto: false, metodo: 'CEDULA' })]);
    expect(await screen.findByText(/marcó con su cédula/i)).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('una hora que puso el sistema se dice tal cual', async () => {
    montarCon([evento({ tieneFoto: false, metodo: 'SIN_DATO', laPusoElSistema: true })]);
    expect(await screen.findByText(/la puso el sistema/i)).toBeInTheDocument();
  });

  it('avisa cuando el reconocimiento dio el mismo resultado más de una vez', async () => {
    // La única señal fiable que hay: dos capturas vivas nunca coinciden al
    // milímetro.
    montarCon([evento({ distanciaRepetida: true })]);
    expect(await screen.findByText(/exactamente el mismo resultado/i)).toBeInTheDocument();
  });

  it('sin marcaciones lo dice, en vez de dejar la pantalla en blanco', async () => {
    montarCon([]);
    expect(await screen.findByText(/no hay marcaciones en este período/i)).toBeInTheDocument();
    expect(get.mock.calls.filter(c => String(c[0]).endsWith('/fotos'))).toHaveLength(0);
  });

  it('si la FOTO no carga lo dice, en vez de quedarse en «Cargando» para siempre', async () => {
    // El defecto: el `.catch` guardaba { clave, url: null }, y el render exigía
    // `url` para pintar la imagen, así que caía en la rama de «Cargando foto...»
    // y se quedaba ahí. Quien revisa se queda esperando algo que ya falló.
    get.mockImplementation((url: string) => {
      if (url === '/registros/revision') return Promise.resolve({ data: respuesta([evento()]) });
      return Promise.reject(new Error('la foto no cargó'));
    });
    render(<RevisionMarcaciones />);
    expect(await screen.findByText(/no pudimos cargar esta foto/i)).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText(/cargando foto/i)).not.toBeInTheDocument());
  });

  it('si la petición falla lo dice y no se cae', async () => {
    get.mockImplementation(() => Promise.reject(new Error('caída')));
    render(<RevisionMarcaciones />);
    expect(await screen.findByText(/no pudimos cargar las marcaciones/i)).toBeInTheDocument();
  });
});


describe('la pista de "esto podría ser una pantalla"', () => {
  // jsdom NO carga imágenes `data:`, así que el `onLoad` del <img> jamás se
  // dispara solo y el detector nunca se llamaría. Hay que dispararlo a mano.
  // Es la regla 9.1: si no se comprueba, la prueba pasa sin ejercitar nada.
  const cargarLaFoto = async () => {
    const img = await screen.findByRole('img');
    fireEvent.load(img);
    return img;
  };

  it('no dice nada cuando el detector no dispara', async () => {
    mirar.mockResolvedValue(SIN_PISTA);
    montarCon([evento()]);
    await cargarLaFoto();
    await waitFor(() => expect(mirar).toHaveBeenCalled());
    expect(screen.queryByText(/bordes rectos/i)).toBeNull();
  });

  it('avisa cuando dispara, y NO afirma que sea un fraude', async () => {
    mirar.mockResolvedValue(CON_PISTA);
    montarCon([evento()]);
    await cargarLaFoto();
    const aviso = await screen.findByText(/bordes rectos/i);
    // El texto tiene que mandar a MIRAR, no dictar un veredicto. Si alguien lo
    // cambia por "foto de pantalla detectada", esta prueba se cae, y debe.
    expect(aviso.textContent).toMatch(/fíjate/i);
    expect(aviso.textContent).not.toMatch(/fraude|falsa|suplant/i);
  });

  it('aguanta que el detector falle: no rompe la pantalla ni inventa una pista', async () => {
    mirar.mockResolvedValue(null);
    montarCon([evento()]);
    const img = await cargarLaFoto();
    await waitFor(() => expect(mirar).toHaveBeenCalled());
    expect(screen.queryByText(/bordes rectos/i)).toBeNull();
    expect(img).toHaveAttribute('src', FOTO);
  });


  it('y una pista tardía tampoco BORRA la de la foto que se está mirando', async () => {
    // El otro orden de llegada, que la prueba de arriba no cubre: la respuesta
    // de la foto ANTERIOR llega DESPUÉS de la actual. Sin la guarda del setter,
    // la vieja pisa a la nueva y la marca desaparece de una foto que sí la tenía.
    let resolverVieja: (v: unknown) => void = () => {};
    mirar.mockReturnValueOnce(new Promise(r => { resolverVieja = r; }));
    mirar.mockResolvedValue(CON_PISTA);
    montarCon([
      evento({ clave: 'r1:entrada', registroId: 'r1' }),
      evento({ clave: 'r2:entrada', registroId: 'r2', colaboradorId: 'c2' }),
    ]);
    await cargarLaFoto();
    await userEvent.setup().keyboard('{ArrowRight}');
    await screen.findByText('2 / 2');
    fireEvent.load(await screen.findByRole('img'));
    await screen.findByText(/bordes rectos/i);       // la de la SEGUNDA ya está
    resolverVieja(SIN_PISTA);                        // y ahora llega la primera
    await new Promise(r => setTimeout(r, 20));
    expect(screen.queryByText(/bordes rectos/i)).not.toBeNull();
  });

  it('una pista que llega tarde no se pega a la foto siguiente', async () => {
    // El detector tarda; mientras tanto el revisor ya pasó a otra marcación.
    // Si la respuesta vieja se pintara sobre la foto nueva, la pantalla estaría
    // acusando a la persona equivocada, que es el peor error posible aquí.
    let resolver: (v: unknown) => void = () => {};
    mirar.mockReturnValueOnce(new Promise(r => { resolver = r; }));
    mirar.mockResolvedValue(SIN_PISTA);
    montarCon([
      evento({ clave: 'r1:entrada', registroId: 'r1' }),
      evento({ clave: 'r2:entrada', registroId: 'r2', colaboradorId: 'c2' }),
    ]);
    await cargarLaFoto();
    await userEvent.setup().keyboard('{ArrowRight}');
    await screen.findByText('2 / 2');
    resolver(CON_PISTA);                       // llega la pista de la PRIMERA
    await waitFor(() => expect(mirar).toHaveBeenCalledTimes(1));
    expect(screen.queryByText(/bordes rectos/i)).toBeNull();
  });
});


describe('el barrido del día', () => {
  const pedirBarrido = async () => {
    const u = userEvent.setup();
    await u.click(await screen.findByRole('button', { name: /Buscar aparatos/i }));
    return u;
  };

  it('LA GUARDA SIGUE EN PIE: no mira una sola foto hasta que se le pide', async () => {
    // La política publicada dice que los datos biométricos «no se exponen en los
    // listados y solo se entregan a solicitud expresa de un usuario autorizado».
    // Si alguien hiciera esto automático al abrir la pantalla, esa frase de un
    // documento legal en línea dejaría de ser cierta, y esta prueba se cae.
    montarCon([
      evento({ clave: 'r1:entrada', registroId: 'r1' }),
      evento({ clave: 'r2:entrada', registroId: 'r2', colaboradorId: 'c2' }),
      evento({ clave: 'r3:entrada', registroId: 'r3' }),
    ]);
    await screen.findByText('1 / 3');
    await waitFor(() => expect(get.mock.calls.filter(c => String(c[0]).endsWith('/fotos'))).toHaveLength(1));
    expect(mirarUrl).not.toHaveBeenCalled();
  });

  it('marca en la lista las que disparan, y solo esas', async () => {
    mirarUrl.mockImplementation((url: string) => Promise.resolve(url === FOTO ? CON_PISTA : SIN_PISTA));
    get.mockImplementation((url: string) => {
      if (url === '/registros/revision') return Promise.resolve({ data: respuesta([
        evento({ clave: 'r1:entrada', registroId: 'r1' }),
        evento({ clave: 'r2:entrada', registroId: 'r2', colaboradorId: 'c2' }),
      ]) });
      if (url === '/registros/r1/fotos') return Promise.resolve({ data: { fotoEntrada: FOTO, fotoSalida: null } });
      if (url === '/registros/r2/fotos') return Promise.resolve({ data: { fotoEntrada: 'data:image/jpeg;base64,otra', fotoSalida: null } });
      return Promise.reject(new Error('url inesperada: ' + url));
    });
    render(<RevisionMarcaciones />);
    await pedirBarrido();
    expect(await screen.findByText(/1 con bordes rectos, de 2 revisadas/i)).toBeTruthy();
    expect(screen.getAllByText(/^Revisar$/)).toHaveLength(1);
  });

  it('las que NO se pudieron leer se cuentan aparte y NO como revisadas', async () => {
    // Un «listo» que esconde fallos es peor que no hacer nada: el supervisor
    // dejaría de mirar justo las que nadie miró.
    mirarUrl.mockResolvedValue(null);
    montarCon([evento({ clave: 'r1:entrada', registroId: 'r1' })]);
    await pedirBarrido();
    // Y sobre todo: NO puede volver a salir el botón como si no hubiera pasado
    // nada. Quien lo oprimió tiene que enterarse de que fallo todo.
    expect(await screen.findByText(/No se pudo leer ninguna foto/i)).toBeTruthy();
    expect(screen.getByText(/1 no se pudieron leer/i)).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Buscar aparatos/i })).toBeNull();
  });

  it('«Repetida» le gana a «Revisar»: un hecho manda sobre una sospecha', async () => {
    mirarUrl.mockResolvedValue(CON_PISTA);
    montarCon([evento({ clave: 'r1:entrada', registroId: 'r1', distanciaRepetida: true })]);
    await pedirBarrido();
    await screen.findByText(/1 con bordes rectos/i);
    expect(screen.getByText('Repetida')).toBeTruthy();
    expect(screen.queryByText(/^Revisar$/)).toBeNull();
  });

  it('«ya revisada y limpia» se ve distinto de «nadie la ha mirado»', async () => {
    // Si las dos se vieran igual, después de parar un barrido a medias se
    // confiaría en filas que en realidad nunca se revisaron. Es el mismo error
    // que un resumen que esconde los fallos, pero fila por fila.
    mirarUrl.mockImplementation((url: string) => Promise.resolve(url === FOTO ? SIN_PISTA : null));
    get.mockImplementation((url: string) => {
      if (url === '/registros/revision') return Promise.resolve({ data: respuesta([
        evento({ clave: 'r1:entrada', registroId: 'r1' }),
        evento({ clave: 'r2:entrada', registroId: 'r2', colaboradorId: 'c2' }),
      ]) });
      if (url === '/registros/r1/fotos') return Promise.resolve({ data: { fotoEntrada: FOTO, fotoSalida: null } });
      if (url === '/registros/r2/fotos') return Promise.resolve({ data: { fotoEntrada: 'data:image/jpeg;base64,rota', fotoSalida: null } });
      return Promise.reject(new Error('url inesperada: ' + url));
    });
    render(<RevisionMarcaciones />);
    await pedirBarrido();
    await screen.findByText(/de 1 revisadas/i);
    // La que se pudo leer queda marcada como vista; la que no, sin nada.
    expect(screen.getAllByLabelText(/Ya revisada, sin bordes rectos/i)).toHaveLength(1);
  });

  it('lo medido pertenece a la MARCACIÓN, así que sobrevive al cambio de rango', async () => {
    // Antes esta prueba exigía lo contrario, y estaba mal: una medición no
    // caduca porque el revisor mire siete días en vez de uno. Lo que sí es del
    // barrido, y por eso se recalcula, es el contador de progreso.
    mirarUrl.mockResolvedValue(CON_PISTA);
    montarCon([evento({ clave: 'r1:entrada', registroId: 'r1' })]);
    const u = userEvent.setup();
    await u.click(await screen.findByRole('button', { name: /Buscar aparatos/i }));
    await screen.findByText(/1 con bordes rectos/i);

    await u.click(screen.getByRole('button', { name: '7 días' }));
    await screen.findByText('1 / 1');
    expect(screen.getAllByText(/^Revisar$/)).toHaveLength(1);
  });

  it('lo medido sobrevive a recargar la pantalla, sin volver a pedir las fotos', async () => {
    // Es lo que se pidió: dar el botón una vez y que la etiqueta quede.
    mirarUrl.mockResolvedValue(CON_PISTA);
    montarCon([evento({ clave: 'r1:entrada', registroId: 'r1' })]);
    await pedirBarrido();
    await screen.findByText(/1 con bordes rectos/i);

    cleanup();
    mirarUrl.mockClear();
    const pedidosAntes = get.mock.calls.filter(c => String(c[0]).endsWith('/fotos')).length;
    montarCon([evento({ clave: 'r1:entrada', registroId: 'r1' })]);
    expect(await screen.findByText(/1 con bordes rectos/i)).toBeTruthy();
    expect(screen.getAllByText(/^Revisar$/)).toHaveLength(1);
    // Y la clave: la marca está SIN haber vuelto a mirar ninguna foto.
    expect(mirarUrl).not.toHaveBeenCalled();
    const pedidosDespues = get.mock.calls.filter(c => String(c[0]).endsWith('/fotos')).length;
    expect(pedidosDespues - pedidosAntes).toBeLessThanOrEqual(1); // solo la que se está mirando
  });
});
