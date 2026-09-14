import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import RegistroFacial from './RegistroFacial';

// LA PÁGINA DONDE LA PROPIA PERSONA REGISTRA SU ROSTRO, CON EL ENLACE QUE LE MANDÓ SU EMPRESA
// (14 de septiembre de 2026). Se prueba lo que ve y lo que se guarda en cada camino: el enlace que no
// sirve, la cédula equivocada, autorizar y registrar, no autorizar, y quien ya estaba registrado.

const { info, verificar, noAutorizo, registrar } = vi.hoisted(() => ({
  info: vi.fn(), verificar: vi.fn(), noAutorizo: vi.fn(), registrar: vi.fn(),
}));
vi.mock('./registroFacial/api', () => ({
  infoDelEnlace: (...a: unknown[]) => info(...a),
  verificarCedula: (...a: unknown[]) => verificar(...a),
  noAutorizo: (...a: unknown[]) => noAutorizo(...a),
  registrarRostro: (...a: unknown[]) => registrar(...a),
}));

// La cámara de verdad necesita un navegador con cámara y los modelos de face-api. Aquí basta con lo
// que entrega al terminar: los descriptores de cada toma y la primera foto.
const DESCRIPTOR = Array.from({ length: 128 }, (_, i) => i / 1000);
vi.mock('../components/CamaraRostro', () => ({
  default: ({ onCapturado }: { onCapturado: (d: number[][], foto: string) => void }) => (
    <button type="button" onClick={() => onCapturado([DESCRIPTOR, DESCRIPTOR], 'data:image/jpeg;base64,/9j/toma')}>Simular escaneo</button>
  ),
}));
vi.mock('../features/colaboradores/foto', () => ({ miniaturaDe: vi.fn().mockResolvedValue('data:image/jpeg;base64,/9j/mini') }));

const TEXTO = 'Autorizo a Rosa de Castro SAS a tratar mi rostro como dato biométrico para identificarme cuando marco mi asistencia. '
  + 'Sé que es voluntario, que puedo marcar con mi cédula y que puedo retirar esta autorización cuando quiera.';
// Lo que responde GET /registro-facial/:token.
const INFO = {
  nombre: 'Ana María', empresa: 'Rosa de Castro SAS', venceEn: '2026-09-14T20:45:00.000Z',
  textoAutorizacion: TEXTO, textoMayorDeEdad: 'Soy mayor de edad.', permiteCedula: true,
};
const SIN_REGISTRO = { registradoEn: null, tomas: 0, foto: null, noAutorizoEn: null };
const REGISTRADO = { registradoEn: '2026-09-10T15:00:00.000Z', tomas: 5, foto: 'data:image/jpeg;base64,/9j/perfil', noAutorizoEn: null };

beforeEach(() => {
  for (const f of [info, verificar, noAutorizo, registrar]) f.mockReset();
  info.mockResolvedValue(INFO);
});

function abrir() {
  render(
    <MemoryRouter initialEntries={['/registro-facial/tok123']}>
      <Routes><Route path="/registro-facial/:token" element={<RegistroFacial />} /></Routes>
    </MemoryRouter>,
  );
}

async function entrarConCedula(cedula = '1020304050') {
  abrir();
  await userEvent.type(await screen.findByLabelText('Número de cédula'), cedula);
  await userEvent.click(screen.getByRole('button', { name: 'Continuar' }));
}

describe('un enlace que no sirve', () => {
  it('muestra lo que dice el servidor y no pide la cédula', async () => {
    info.mockRejectedValue({ response: { status: 410, data: { error: 'Este enlace venció: duraba una hora. Pide uno nuevo a tu empresa.', codigo: 'ENLACE_VENCIDO' } } });
    abrir();
    expect(await screen.findByText('Este enlace venció: duraba una hora. Pide uno nuevo a tu empresa.')).toBeInTheDocument();
    expect(screen.queryByLabelText('Número de cédula')).not.toBeInTheDocument();
  });
});

describe('la cédula', () => {
  it('saluda por el nombre y pide la cédula antes de mostrar nada del registro', async () => {
    abrir();
    expect(await screen.findByText(/Hola, Ana María/)).toBeInTheDocument();
    expect(screen.getByLabelText('Número de cédula')).toBeInTheDocument();
    expect(screen.queryByText(TEXTO)).not.toBeInTheDocument();
  });

  it('si no coincide, dice cuántos intentos quedan y deja volver a escribirla', async () => {
    verificar.mockRejectedValue({ response: { status: 400, data: { error: 'La cédula no coincide. Te quedan 4 intentos.', codigo: 'CEDULA_NO_COINCIDE' } } });
    await entrarConCedula('999');
    expect(await screen.findByText('La cédula no coincide. Te quedan 4 intentos.')).toBeInTheDocument();
    expect(screen.getByLabelText('Número de cédula')).toBeInTheDocument();
    expect(verificar).toHaveBeenCalledWith('tok123', '999');
  });
});

describe('autorizar y registrar', () => {
  it('no deja seguir sin marcar la autorización y la mayoría de edad', async () => {
    verificar.mockResolvedValue(SIN_REGISTRO);
    await entrarConCedula();
    const seguir = await screen.findByRole('button', { name: 'Continuar al registro' });
    expect(seguir).toBeDisabled();
    await userEvent.click(screen.getByLabelText(TEXTO));
    expect(seguir).toBeDisabled();
    await userEvent.click(screen.getByLabelText('Soy mayor de edad.'));
    expect(seguir).toBeEnabled();
  });

  it('con las dos marcadas, escanea y guarda exactamente el texto que se mostró', async () => {
    verificar.mockResolvedValue(SIN_REGISTRO);
    registrar.mockResolvedValue({ ok: true, registradoEn: '2026-09-14T20:00:00.000Z', tomas: 2 });
    await entrarConCedula();
    await userEvent.click(await screen.findByLabelText(TEXTO));
    await userEvent.click(screen.getByLabelText('Soy mayor de edad.'));
    await userEvent.click(screen.getByRole('button', { name: 'Continuar al registro' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Simular escaneo' }));
    expect(await screen.findByText(/Tu rostro quedó registrado/)).toBeInTheDocument();
    expect(registrar).toHaveBeenCalledWith('tok123', {
      cedula: '1020304050', texto: TEXTO, mayorDeEdad: true, descriptores: [DESCRIPTOR, DESCRIPTOR],
      foto: 'data:image/jpeg;base64,/9j/toma', fotoMini: 'data:image/jpeg;base64,/9j/mini',
    });
  });

  it('enlaza la política de privacidad', async () => {
    verificar.mockResolvedValue(SIN_REGISTRO);
    await entrarConCedula();
    expect(await screen.findByRole('link', { name: /política de privacidad/i })).toHaveAttribute('href', '/legal/privacidad/');
  });
});

describe('no autorizar', () => {
  it('guarda la decisión con el texto que no aceptó, y dice cómo va a marcar', async () => {
    verificar.mockResolvedValue(SIN_REGISTRO);
    noAutorizo.mockResolvedValue({ ok: true });
    await entrarConCedula();
    await userEvent.click(await screen.findByRole('button', { name: 'No autorizo el uso de mis datos biométricos' }));
    expect(await screen.findByText(/Quedó registrado que no autorizas/)).toBeInTheDocument();
    expect(screen.getByText(/Puedes marcar tu asistencia con tu cédula/)).toBeInTheDocument();
    // Sin la casilla de mayoría de edad marcada no se manda nada sobre la edad: no marcarla no es decir que es menor.
    expect(noAutorizo).toHaveBeenCalledWith('tok123', { cedula: '1020304050', texto: TEXTO });
    expect(registrar).not.toHaveBeenCalled();
  });

  it('si la empresa no deja marcar con cédula, no le promete esa salida', async () => {
    info.mockResolvedValue({ ...INFO, permiteCedula: false });
    verificar.mockResolvedValue(SIN_REGISTRO);
    noAutorizo.mockResolvedValue({ ok: true });
    await entrarConCedula();
    await userEvent.click(await screen.findByRole('button', { name: 'No autorizo el uso de mis datos biométricos' }));
    expect(await screen.findByText(/Quedó registrado que no autorizas/)).toBeInTheDocument();
    expect(screen.queryByText(/Puedes marcar tu asistencia con tu cédula/)).not.toBeInTheDocument();
  });
});

describe('quien ya tiene su rostro registrado', () => {
  it('ve desde cuándo, cuántas tomas tiene y su foto de perfil', async () => {
    verificar.mockResolvedValue(REGISTRADO);
    await entrarConCedula();
    expect(await screen.findByText(/10 de septiembre de 2026/)).toBeInTheDocument();
    expect(screen.getByText(/5 tomas/)).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Tu foto de perfil' })).toHaveAttribute('src', REGISTRADO.foto);
  });

  it('puede actualizarlo: vuelve a leer y marcar la autorización antes del escaneo', async () => {
    verificar.mockResolvedValue(REGISTRADO);
    await entrarConCedula();
    await userEvent.click(await screen.findByRole('button', { name: 'Actualizar mi registro' }));
    expect(await screen.findByRole('button', { name: 'Continuar al registro' })).toBeDisabled();
  });

  it('puede retirar su autorización, confirmándolo, y su registro se borra', async () => {
    verificar.mockResolvedValue(REGISTRADO);
    noAutorizo.mockResolvedValue({ ok: true });
    await entrarConCedula();
    await userEvent.click(await screen.findByRole('button', { name: 'Retirar mi autorización' }));
    expect(noAutorizo).not.toHaveBeenCalled();
    await userEvent.click(await screen.findByRole('button', { name: 'Sí, retirar mi autorización' }));
    expect(await screen.findByText(/Tu registro facial se borró/)).toBeInTheDocument();
    expect(noAutorizo).toHaveBeenCalledWith('tok123', { cedula: '1020304050', texto: TEXTO });
  });
});

describe('lo que se dice según el caso', () => {
  async function autorizarYEscanear() {
    await entrarConCedula();
    await userEvent.click(await screen.findByLabelText(TEXTO));
    await userEvent.click(screen.getByLabelText('Soy mayor de edad.'));
    await userEvent.click(screen.getByRole('button', { name: 'Continuar al registro' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Simular escaneo' }));
  }

  it('quien no tenía registro y no autoriza no lee que se le borró algo', async () => {
    verificar.mockResolvedValue(SIN_REGISTRO);
    noAutorizo.mockResolvedValue({ ok: true });
    await entrarConCedula();
    await userEvent.click(await screen.findByRole('button', { name: 'No autorizo el uso de mis datos biométricos' }));
    expect(await screen.findByText(/Quedó registrado que no autorizas/)).toBeInTheDocument();
    expect(screen.queryByText(/se borró/)).not.toBeInTheDocument();
  });

  it('al confirmar el retiro, le recuerda que puede marcar con la cédula', async () => {
    verificar.mockResolvedValue(REGISTRADO);
    await entrarConCedula();
    await userEvent.click(await screen.findByRole('button', { name: 'Retirar mi autorización' }));
    expect(await screen.findByText(/Podrás marcar con tu cédula/)).toBeInTheDocument();
  });

  it('al confirmar el retiro, si la empresa no deja marcar con cédula, no se lo promete', async () => {
    info.mockResolvedValue({ ...INFO, permiteCedula: false });
    verificar.mockResolvedValue(REGISTRADO);
    await entrarConCedula();
    await userEvent.click(await screen.findByRole('button', { name: 'Retirar mi autorización' }));
    expect(await screen.findByText(/ya no podrá reconocerte/)).toBeInTheDocument();
    expect(screen.queryByText(/Podrás marcar con tu cédula/)).not.toBeInTheDocument();
  });

  it('si no se pudo sacar la miniatura, registra igual y no la manda', async () => {
    const { miniaturaDe } = await import('../features/colaboradores/foto');
    vi.mocked(miniaturaDe).mockRejectedValueOnce(new Error('sin canvas'));
    verificar.mockResolvedValue(SIN_REGISTRO);
    registrar.mockResolvedValue({ ok: true, registradoEn: '2026-09-14T20:00:00.000Z', tomas: 2 });
    await autorizarYEscanear();
    expect(await screen.findByText(/Tu rostro quedó registrado/)).toBeInTheDocument();
    // El servidor rechaza un fotoMini que no sea texto: mandarlo en null tumbaría el registro entero.
    expect(registrar.mock.calls[0][1]).not.toHaveProperty('fotoMini');
  });

  it('si el enlace deja de servir mientras escanea, lo muestra como un enlace que no sirve', async () => {
    verificar.mockResolvedValue(SIN_REGISTRO);
    registrar.mockRejectedValue({ response: { status: 410, data: { error: 'Este enlace venció: duraba una hora. Pide uno nuevo a tu empresa.', codigo: 'ENLACE_VENCIDO' } } });
    await autorizarYEscanear();
    expect(await screen.findByText('Este enlace no se puede usar')).toBeInTheDocument();
    expect(screen.getByText('Este enlace venció: duraba una hora. Pide uno nuevo a tu empresa.')).toBeInTheDocument();
  });

  it('si el guardado falla por otra cosa, vuelve a la autorización con el aviso y las casillas marcadas', async () => {
    verificar.mockResolvedValue(SIN_REGISTRO);
    registrar.mockRejectedValue({ response: { status: 400, data: { error: 'No pudimos leer bien tu rostro. Intenta el escaneo otra vez.', codigo: 'ROSTRO_INVALIDO' } } });
    await autorizarYEscanear();
    expect(await screen.findByText('No pudimos leer bien tu rostro. Intenta el escaneo otra vez.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Continuar al registro' })).toBeEnabled();
  });
});

// La primera toma queda como foto de perfil si la persona no tenía una, igual que en la ficha
// (utils/fotoPerfil.ts, fotoParaEnrolar). La página no puede decir que ninguna foto del escaneo se guarda.
describe('la foto de perfil', () => {
  it('antes de escanear le dice que la primera toma queda como su foto si no tiene una', async () => {
    verificar.mockResolvedValue(SIN_REGISTRO);
    await entrarConCedula();
    expect(await screen.findByText(/Si no tienes foto de perfil, la primera toma queda como tu foto/)).toBeInTheDocument();
  });

  it('quien ya está registrado lee qué se guarda de verdad', async () => {
    verificar.mockResolvedValue(REGISTRADO);
    await entrarConCedula();
    expect(await screen.findByText(/10 de septiembre de 2026/)).toBeInTheDocument();
    expect(screen.getByText(/se guarda un cálculo/)).toBeInTheDocument();
    expect(screen.queryByText(/Las fotos del escaneo no se guardan/)).not.toBeInTheDocument();
  });
});
