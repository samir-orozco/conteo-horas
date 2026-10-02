import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import Marcador from './Marcador';

// Con qué abre el kiosco (decisión del dueño del 15 de septiembre de 2026): primero el rostro, y la
// cédula como segunda opción cuando la empresa la permite. Después de cada marcación vuelve al
// rostro, aunque quien marcó haya entrado con la cédula.

const SIN_SESION = { token: null as string | null, colaborador: null as null | Record<string, unknown>, estado: null as null | Record<string, unknown> };
const h = vi.hoisted(() => ({
  permiteCedula: true,
  exigeUbicacion: false,
  salir: undefined as undefined | (() => void),
  // La sesión que devuelve el hook falso. `limpiarSesion` la vacía, y el render
  // siguiente la lee: así se ve qué pantalla queda después.
  sesion: { token: null, colaborador: null, estado: null } as {
    token: string | null; colaborador: null | Record<string, unknown>; estado: null | Record<string, unknown>;
    fotoReferencia?: string | null; parecidoDudoso?: boolean;
  },
  avisarNoSoy: vi.fn<(token: string) => Promise<void>>(() => Promise.resolve()),
  limpiarSesion: vi.fn(),
  // Lo que hace el servidor al marcar, y quién queda en sesión al escribir una cédula.
  marcar: vi.fn<(token: string, cuerpo: Record<string, unknown>) => Promise<unknown>>(() => Promise.resolve({ accion: 'ENTRADA', hora: new Date().toISOString() })),
  alIngresar: null as null | (() => { token: string | null; colaborador: null | Record<string, unknown>; estado: null | Record<string, unknown> }),
  // Quién queda en sesión cuando la cámara reconoce una cara.
  alReconocer: null as null | (() => { token: string | null; colaborador: null | Record<string, unknown>; estado: null | Record<string, unknown> }),
  geoLimpiar: vi.fn(),
}));

vi.mock('./marcador/api', () => ({
  infoKiosco: () => Promise.resolve({ empresa: 'Tuercas & Pernos', requiereDispositivo: false, permiteCedula: h.permiteCedula, exigeUbicacion: h.exigeUbicacion }),
  marcar: (t: string, cuerpo: Record<string, unknown>) => h.marcar(t, cuerpo),
  avisarNoSoy: (t: string) => h.avisarNoSoy(t),
}));
vi.mock('./marcador/useSesionKiosco', () => ({
  useSesionKiosco: () => ({
    // Los valores por defecto van ANTES de la sesión: así una prueba puede poner
    // la foto de la ficha o el parecido dudoso y ver que llegan a la pantalla.
    fotoReferencia: null, parecidoDudoso: false, ...h.sesion, sedes: [], validaUbicacion: undefined,
    ingresar: async () => { if (h.alIngresar) h.sesion = h.alIngresar(); },
    ingresarRostro: async () => { if (h.alReconocer) h.sesion = h.alReconocer(); },
    cargarEstado: vi.fn(),
    limpiarSesion: () => { h.limpiarSesion(); h.sesion = { token: null, colaborador: null, estado: null }; },
  }),
}));
vi.mock('./marcador/useGeolocalizacion', () => ({
  useGeolocalizacion: () => ({
    ubicOk: false, buscandoUbic: false, errorUbic: null, setErrorUbic: vi.fn(), permiso: 'sin-preguntar',
    limpiar: () => h.geoLimpiar(), activarUbicacion: vi.fn(), obtenerUbicacion: vi.fn(),
  }),
}));
vi.mock('./marcador/useVinculoDispositivo', () => ({
  useVinculoDispositivo: () => ({
    claveDispositivo: null, requiereVinculo: false, setRequiereVinculo: vi.fn(), codigoVinculo: '', setCodigoVinculo: vi.fn(),
    errorVinculo: '', setErrorVinculo: vi.fn(), vinculando: false, vincular: vi.fn(), getDeviceToken: () => null, olvidarDispositivo: vi.fn(),
  }),
}));
// Se guarda el `salir` que el kiosco le entrega: es lo que corre al cerrarse el aviso de una marcación.
vi.mock('./marcador/useFlashResultado', () => ({
  useFlashResultado: (salir: () => void) => {
    h.salir = salir;
    return { flash: null, cerrandoFlash: false, mostrarFlashOk: vi.fn(), mostrarFlashError: vi.fn(), cerrarFlash: vi.fn() };
  },
}));
// La cámara de verdad carga los modelos de reconocimiento y pide permiso. Aquí es un
// botón que, al tocarlo, entrega un descriptor y la foto del momento.
vi.mock('../components/CamaraRostro', () => ({
  default: ({ onCapturado }: { onCapturado: (d: number[][], f: string) => void }) => (
    <button onClick={() => onCapturado([[0.1]], 'data:image/jpeg;base64,ahora')}>Cámara del kiosco</button>
  ),
}));

// Con una sesión abierta no se ve el nombre de la empresa sino el saludo: se espera por lo que toque.
const abrir = async (esperar = 'Tuercas & Pernos') => {
  render(
    <MemoryRouter initialEntries={['/marcador/tok-kiosco']}>
      <Routes><Route path="/marcador/:token" element={<Marcador />} /></Routes>
    </MemoryRouter>,
  );
  await screen.findByText(esperar);
};

beforeEach(() => {
  h.permiteCedula = true;
  h.exigeUbicacion = false;
  h.salir = undefined;
  h.sesion = { ...SIN_SESION };
  h.avisarNoSoy.mockClear();
  h.limpiarSesion.mockClear();
  h.marcar.mockReset();
  h.marcar.mockImplementation(() => Promise.resolve({ accion: 'ENTRADA', hora: new Date().toISOString() }));
  h.alIngresar = null;
  h.alReconocer = null;
  h.geoLimpiar.mockClear();
});
afterEach(() => vi.useRealTimers());

// Una sesión abierta de Ana, sin turno todavía.
const sesionDeAna = () => ({
  token: 'tok-ana',
  colaborador: { id: 'c1', nombre: 'Ana', apellido: 'Giraldo', cargo: null, modalidad: 'REMOTO' },
  estado: {
    dentroAhora: false, entradaAbierta: null, turnoCerradoHoy: null,
    almuerzo: null, enAlmuerzo: false, salidaAlmuerzo: null, regresoSugerido: null,
  },
});

describe('Marcador · con qué abre el kiosco', () => {
  it('con la cédula permitida abre en el rostro, y la cédula es la segunda opción', async () => {
    await abrir();
    expect(screen.getByText('Cámara del kiosco')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('Número de cédula')).not.toBeInTheDocument();
    const [primera, segunda] = screen.getAllByRole('button', { name: /^(rostro|cédula)$/i });
    expect(primera).toHaveAccessibleName(/^rostro$/i);
    expect(segunda).toHaveAccessibleName(/^cédula$/i);
  });

  it('la cédula queda a un toque', async () => {
    await abrir();
    fireEvent.click(screen.getByRole('button', { name: /^cédula$/i }));
    expect(screen.getByPlaceholderText('Número de cédula')).toBeInTheDocument();
    expect(screen.queryByText('Cámara del kiosco')).not.toBeInTheDocument();
  });

  it('después de una marcación vuelve al rostro, aunque la persona haya entrado con la cédula', async () => {
    await abrir();
    fireEvent.click(screen.getByRole('button', { name: /^cédula$/i }));
    act(() => h.salir!());
    expect(screen.getByText('Cámara del kiosco')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('Número de cédula')).not.toBeInTheDocument();
  });

  it('sin la cédula permitida abre en el rostro y no ofrece la cédula', async () => {
    h.permiteCedula = false;
    await abrir();
    expect(screen.getByText('Cámara del kiosco')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^cédula$/i })).not.toBeInTheDocument();
  });
});

// «NO SOY X» Y NADIE QUEDA CON LA PANTALLA DE OTRO (2 de octubre de 2026).
describe('Marcador · cuando la persona reconocida no es la que está', () => {
  it('«No soy Ana» deja la huella, cierra la sesión y sigue por la cédula', async () => {
    h.sesion = sesionDeAna();
    await abrir('Hola, Ana Giraldo');
    fireEvent.click(screen.getByRole('button', { name: /no soy ana/i }));
    expect(h.avisarNoSoy).toHaveBeenCalledWith('tok-ana');
    expect(h.limpiarSesion).toHaveBeenCalled();
    expect(await screen.findByPlaceholderText('Número de cédula')).toBeInTheDocument();
    // Sigue la misma persona: no se le borra la ubicación que ya dio.
    expect(h.geoLimpiar).not.toHaveBeenCalled();
  });

  it('reconocida por la cámara, «No soy» pasa a la cédula CON la foto que se acaba de tomar', async () => {
    h.alReconocer = sesionDeAna;
    await abrir();
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Cámara del kiosco' })); });
    expect(await screen.findByAltText('Tu foto de ahora')).toHaveAttribute('src', 'data:image/jpeg;base64,ahora');
    fireEvent.click(screen.getByRole('button', { name: /no soy ana/i }));
    expect(await screen.findByText(/foto tomada · ingresa tu cédula/i)).toBeInTheDocument();
  });

  it('la foto de la ficha y el parecido dudoso del login llegan a la pantalla', async () => {
    h.sesion = { ...sesionDeAna(), fotoReferencia: 'data:image/jpeg;base64,ficha', parecidoDudoso: true };
    await abrir('Hola, Ana Giraldo');
    expect(screen.getByAltText(/foto de la ficha de ana giraldo/i)).toHaveAttribute('src', 'data:image/jpeg;base64,ficha');
    expect(screen.getByText(/mira bien las fotos/i)).toBeInTheDocument();
  });

  it('a la misma persona no le vuelve a pedir la ubicación que ya decidió no dar', async () => {
    h.exigeUbicacion = true;
    h.sesion = sesionDeAna();
    await abrir('Activa tu ubicación');
    fireEvent.click(screen.getByRole('button', { name: /continuar sin ubicación/i }));
    fireEvent.click(await screen.findByRole('button', { name: /no soy ana/i }));
    expect(await screen.findByPlaceholderText('Número de cédula')).toBeInTheDocument();
    expect(screen.queryByText('Activa tu ubicación')).not.toBeInTheDocument();
  });

  it('si la empresa no permite la cédula, vuelve a la cámara y dice qué hacer', async () => {
    h.permiteCedula = false;
    h.sesion = sesionDeAna();
    await abrir('Hola, Ana Giraldo');
    fireEvent.click(screen.getByRole('button', { name: /no soy ana/i }));
    expect(await screen.findByText('Cámara del kiosco')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reintentar/i })).toBeInTheDocument();
  });
});

describe('Marcador · treinta segundos sin tocar nada', () => {
  it('con una sesión abierta, cierra la sesión', async () => {
    h.sesion = sesionDeAna();
    await abrir('Hola, Ana Giraldo');
    vi.useFakeTimers();
    // La cuenta arrancó con el reloj de verdad: un toque la reinicia con el falso.
    fireEvent.pointerDown(window);
    act(() => { vi.advanceTimersByTime(29_000); });
    expect(h.limpiarSesion).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(1_000); });
    expect(h.limpiarSesion).toHaveBeenCalled();
    // La que viene puede ser otra persona: su ubicación no es la de esta.
    expect(h.geoLimpiar).toHaveBeenCalled();
  });

  it('en la pantalla de la cédula, vuelve a la cámara', async () => {
    await abrir();
    vi.useFakeTimers();
    fireEvent.click(screen.getByRole('button', { name: /^cédula$/i }));
    expect(screen.getByPlaceholderText('Número de cédula')).toBeInTheDocument();
    act(() => { vi.advanceTimersByTime(30_000); });
    expect(screen.getByText('Cámara del kiosco')).toBeInTheDocument();
  });

  it('en la cámara, sin nadie, no hace nada', async () => {
    await abrir();
    vi.useFakeTimers();
    // Un toque con el reloj falso: si la cuenta corriera en la cámara, se armaría
    // aquí y el avance de abajo la alcanzaría. Sin esto la prueba pasaba sola.
    fireEvent.pointerDown(window);
    act(() => { vi.advanceTimersByTime(60_000); });
    expect(h.limpiarSesion).not.toHaveBeenCalled();
  });
});

// LO QUE QUEDA ABIERTO NO PUEDE HEREDARLO LA SIGUIENTE PERSONA (2 de octubre de 2026).
//
// El cierre por inactividad llama a salir() con cualquier pantalla abierta. La del
// motivo y la del regreso olvidado viven en el Marcador, no en la pantalla de la
// persona: si salir() no las limpia, la siguiente que entra cae directo en ellas,
// con el texto de la anterior y un botón de un toque.
describe('Marcador · lo que deja abierto quien se va', () => {
  const sesionDeBruno = () => ({
    token: 'tok-bruno',
    colaborador: { id: 'c2', nombre: 'Bruno', apellido: 'Ríos', cargo: null, modalidad: 'REMOTO' },
    estado: {
      dentroAhora: false, entradaAbierta: null, turnoCerradoHoy: null,
      almuerzo: null, enAlmuerzo: false, salidaAlmuerzo: null, regresoSugerido: null,
    },
  });
  const sostener = async (nombre: RegExp) => {
    const b = screen.getByRole('button', { name: nombre });
    fireEvent.pointerDown(b, { pointerId: 1, button: 0 });
    await act(async () => { vi.advanceTimersByTime(1500); });
    fireEvent.pointerUp(b, { pointerId: 1 });
    await act(async () => {});
  };
  const entraBrunoConCedula = async () => {
    h.alIngresar = sesionDeBruno;
    fireEvent.click(screen.getByRole('button', { name: /^cédula$/i }));
    fireEvent.change(screen.getByPlaceholderText('Número de cédula'), { target: { value: '222' } });
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /^continuar$/i })); });
    await act(async () => {});
  };

  it('el motivo que escribió Ana no le aparece a Bruno', async () => {
    h.marcar.mockImplementation(() => Promise.reject({ response: { status: 409, data: { codigo: 'REQUIERE_MOTIVO_TARDANZA' } } }));
    h.sesion = sesionDeAna();
    await abrir('Hola, Ana Giraldo');
    vi.useFakeTimers();
    await sostener(/soy ana · registrar entrada/i);
    const campo = screen.getByRole('textbox');
    fireEvent.change(campo, { target: { value: 'cita médica de Ana' } });
    await act(async () => { vi.advanceTimersByTime(30_000); });
    expect(h.limpiarSesion).toHaveBeenCalled();
    h.marcar.mockClear();
    await entraBrunoConCedula();
    expect(screen.getByText('Hola, Bruno Ríos')).toBeInTheDocument();
    expect(screen.queryByDisplayValue('cita médica de Ana')).not.toBeInTheDocument();
    expect(h.marcar).not.toHaveBeenCalled();
  });

  it('la pregunta del regreso olvidado de Ana no le aparece a Bruno', async () => {
    const enDescanso = (s: ReturnType<typeof sesionDeAna>) => ({ ...s, estado: {
      ...s.estado, enDescanso: true, salidaDescanso: '2026-10-02T14:00:00Z', regresoSugerido: '2026-10-02T14:15:00Z',
    } });
    h.sesion = enDescanso(sesionDeAna());
    await abrir('Hola, Ana Giraldo');
    vi.useFakeTimers();
    await sostener(/soy ana · volví de mi descanso/i);
    expect(screen.getByText('No marcaste tu regreso')).toBeInTheDocument();
    await act(async () => { vi.advanceTimersByTime(30_000); });
    // Bruno también vuelve de un descanso con la hora pasada: es cuando la pantalla
    // de Ana, si quedó viva, se le abre sola.
    h.alIngresar = () => enDescanso(sesionDeBruno() as ReturnType<typeof sesionDeAna>);
    fireEvent.click(screen.getByRole('button', { name: /^cédula$/i }));
    fireEvent.change(screen.getByPlaceholderText('Número de cédula'), { target: { value: '222' } });
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /^continuar$/i })); });
    await act(async () => {});
    expect(screen.getByText('Hola, Bruno Ríos')).toBeInTheDocument();
    expect(screen.queryByText('No marcaste tu regreso')).not.toBeInTheDocument();
  });
});
