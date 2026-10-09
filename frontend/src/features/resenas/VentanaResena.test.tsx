import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import VentanaResena from './VentanaResena';
import { mostradaKey } from './debeMostrarResena';
import { guiaKey, vistaKey } from '../../components/novedadesVisibles';

// LA VENTANA «HABLEMOS DE RESULTADOS» (docs/RESENAS.md §3).
//
// Cuándo sale lo decide `debeMostrarResena`, que tiene sus propias pruebas. Aquí se prueba lo que esa
// función no puede ver: que la ventana le pregunte al servidor solo cuando hace falta, que la
// decisión se tome una vez por carga y que salga una sola vez por pestaña, y lo que pasa dentro de la
// ventana. Se consulta por lo que ve
// una persona (texto, rol), no por clases de CSS (CLAUDE.md §7).

const sesion = vi.hoisted(() => ({
  usuario: { id: 'u1', rol: 'ADMIN', nombre: 'Juan Pérez', emailVerificado: true as boolean | undefined },
}));
vi.mock('../../context/AuthContext', () => ({ useAuth: () => ({ usuario: sesion.usuario }) }));

const { get, post } = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock('../../lib/api', () => ({
  default: {
    get: (...a: unknown[]) => get(...a),
    post: (...a: unknown[]) => post(...a),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

// Los textos los arma el servidor con el nombre y la empresa de la base (R13). Se usan unos que la
// ventana no podría inventar, para que una prueba verde signifique que los pintó tal cual.
const OPCIONES = {
  CON_NOMBRE: 'Sí, como Juan Pérez, de Tuercas SAS',
  ANONIMA: 'Prefiero anónimo (saldría como «Cliente de HoraPro»)',
};
const PENDIENTE = { data: { pendiente: true, opciones: OPCIONES } };
const NO_PENDIENTE = { data: { pendiente: false, opciones: null } };

const YA_RESPONDIO = {
  response: { status: 409, data: { error: 'Tu empresa ya nos dejó su opinión, gracias.', codigo: 'YA_RESPONDIO' } },
};

// Un botón para moverse por el panel sin desmontar la ventana, como hace el menú del Layout.
function IrA({ a }: { a: string }) {
  const navegar = useNavigate();
  return <button type="button" onClick={() => navegar(a)}>Ir a {a}</button>;
}

const pintar = (ruta = '/app') => render(
  <MemoryRouter initialEntries={[ruta]}>
    <VentanaResena />
    <IrA a="/app" />
    <IrA a="/app/registros" />
  </MemoryRouter>,
);

const ventana = () => screen.findByRole('dialog', { name: 'Hablemos de resultados' });
const sinVentana = () => expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
// Una vuelta del bucle de eventos: la respuesta simulada ya resolvió y React ya pintó.
const esperarUnaVuelta = () => new Promise(r => setTimeout(r, 0));
// Lo mismo, pero dentro de `act`: React termina TODO lo que dejó la respuesta, efectos incluidos. Sin
// esto, comprobar que algo NO pasó (la marca de la pestaña) da verde aunque fuera a pasar un instante
// después: se vio con la marca vieja, que se escribía en un efecto.
const asentar = () => act(async () => { await esperarUnaVuelta(); });
const marcadaEnLaPestana = () => sessionStorage.getItem(mostradaKey('u1')) === '1';
// Una respuesta del servidor que llega cuando la prueba lo dice.
const respuestaEnEspera = () => {
  let responder: (valor: unknown) => void = () => {};
  get.mockImplementationOnce(() => new Promise(r => { responder = r; }));
  return (valor: unknown) => act(async () => responder(valor));
};

const estrella = (n: number) => screen.getByRole('radio', { name: n === 1 ? '1 estrella' : `${n} estrellas` });
const enviar = () => screen.getByRole('button', { name: 'Enviar' });
const caja = () => screen.getByRole('textbox', { name: /tu experiencia/i });

beforeEach(() => {
  sesion.usuario = { id: 'u1', rol: 'ADMIN', nombre: 'Juan Pérez', emailVerificado: true };
  localStorage.clear();
  sessionStorage.clear();
  // Ya vio la guía de bienvenida y el lote de novedades de hoy: en esta carga no sale ningún otro aviso.
  localStorage.setItem(guiaKey('u1'), '1');
  localStorage.setItem(vistaKey('u1'), '1');
  get.mockReset();
  post.mockReset();
  get.mockImplementation((url: string) =>
    url === '/resenas/pendiente' ? Promise.resolve(PENDIENTE) : Promise.reject(new Error('url inesperada: ' + url)));
  post.mockResolvedValue({ data: { ok: true } });
});

describe('VentanaResena: cuándo sale', () => {
  it('al administrador, en Inicio y con la empresa pendiente, le sale la ventana', async () => {
    pintar();
    expect(await ventana()).toBeInTheDocument();
    expect(get).toHaveBeenCalledWith('/resenas/pendiente');
  });

  // R2. El servidor lo vuelve a comprobar; aquí ni siquiera se le pregunta.
  it('al supervisor no le sale, y ni se le pregunta al servidor', async () => {
    sesion.usuario = { ...sesion.usuario, rol: 'SUPERVISOR' };
    pintar();
    await esperarUnaVuelta();
    expect(get).not.toHaveBeenCalled();
    sinVentana();
  });

  // R3: «en la primera carga del panel después de volverse elegible». Un «no» no gasta nada: la
  // pestaña no queda marcada, y la siguiente carga (F5, o salir y volver a entrar en esa misma
  // pestaña) vuelve a preguntar. Si quedara marcada, quien trabaja siempre en una pestaña no la vería
  // nunca: sessionStorage sobrevive a la recarga.
  it('si el servidor dice que no, no sale, y en la siguiente carga vuelve a preguntar', async () => {
    get.mockResolvedValueOnce(NO_PENDIENTE);
    const primera = pintar();
    await asentar();
    expect(get).toHaveBeenCalledWith('/resenas/pendiente');
    sinVentana();
    expect(marcadaEnLaPestana()).toBe(false);
    // Al día siguiente ya es elegible, y recarga en la misma pestaña.
    primera.unmount();
    pintar();
    expect(await ventana()).toBeInTheDocument();
    expect(get).toHaveBeenCalledTimes(2);
  });

  // Lo que manda es `pendiente`. Las opciones son solo el texto de los radios.
  it('con `pendiente: false` no sale aunque vengan las opciones', async () => {
    get.mockResolvedValue({ data: { pendiente: false, opciones: OPCIONES } });
    pintar();
    await asentar();
    expect(get).toHaveBeenCalled();
    sinVentana();
    expect(marcadaEnLaPestana()).toBe(false);
  });

  it('si la pregunta al servidor falla, no sale, y en la siguiente carga vuelve a preguntar', async () => {
    get.mockRejectedValueOnce(new Error('sin red'));
    const primera = pintar();
    await asentar();
    expect(get).toHaveBeenCalled();
    sinVentana();
    expect(marcadaEnLaPestana()).toBe(false);
    primera.unmount();
    pintar();
    expect(await ventana()).toBeInTheDocument();
  });

  // R3: «ni dos veces en la misma pestaña». Lo que marca la pestaña es que haya salido.
  it('al salir queda marcada en la pestaña', async () => {
    pintar();
    await ventana();
    expect(marcadaEnLaPestana()).toBe(true);
  });

  it('si ya salió en esta pestaña, no vuelve a preguntar', async () => {
    sessionStorage.setItem(mostradaKey('u1'), '1');
    pintar();
    await esperarUnaVuelta();
    expect(get).not.toHaveBeenCalled();
    sinVentana();
  });

  // R4: con otro aviso en esta carga, la reseña espera a la siguiente. Y no se gasta una petición en
  // preguntar lo que de todos modos no se va a mostrar.
  it('con las novedades por mostrar no pregunta, y sale en la siguiente carga, ya sin ellas', async () => {
    localStorage.removeItem(vistaKey('u1'));
    const primera = pintar();
    await esperarUnaVuelta();
    expect(get).not.toHaveBeenCalled();
    expect(marcadaEnLaPestana()).toBe(false);
    sinVentana();
    // Las cierra (eso escribe su llave) y recarga.
    localStorage.setItem(vistaKey('u1'), '1');
    primera.unmount();
    pintar();
    expect(await ventana()).toBeInTheDocument();
  });

  // Lo que evita el amontonamiento de R4 dentro de UNA carga es la decisión, que no se repite: cerrar
  // las novedades no la hace saltar detrás de ellas, ni al volver a Inicio.
  it('en la misma carga, cerrar las novedades no la hace salir detrás', async () => {
    localStorage.removeItem(vistaKey('u1'));
    pintar();
    await esperarUnaVuelta();
    localStorage.setItem(vistaKey('u1'), '1');
    await userEvent.click(screen.getByRole('button', { name: 'Ir a /app' }));
    await esperarUnaVuelta();
    expect(get).not.toHaveBeenCalled();
    sinVentana();
  });

  it('a quien todavía no vio la guía de bienvenida no le sale, y sí en la siguiente carga', async () => {
    localStorage.removeItem(guiaKey('u1'));
    const primera = pintar();
    await esperarUnaVuelta();
    expect(get).not.toHaveBeenCalled();
    expect(marcadaEnLaPestana()).toBe(false);
    sinVentana();
    localStorage.setItem(guiaKey('u1'), '1');
    primera.unmount();
    pintar();
    expect(await ventana()).toBeInTheDocument();
  });

  // R3: «ni en mitad de un trabajo». Si la respuesta llega cuando la persona ya abrió un modal de
  // Inicio o escribe en un campo, la ventana le caería encima y le quitaría el foco. Espera a la
  // siguiente carga, sin gastar nada.
  it('si la persona ya empezó a hacer algo en Inicio cuando llega la respuesta, no le cae encima', async () => {
    const responder = respuestaEnEspera();
    const primera = pintar();
    await esperarUnaVuelta();
    fireEvent.pointerDown(document.body);
    await responder(PENDIENTE);
    sinVentana();
    expect(marcadaEnLaPestana()).toBe(false);
    primera.unmount();
    pintar();
    expect(await ventana()).toBeInTheDocument();
  });

  it('una tecla también cuenta como empezar a hacer algo', async () => {
    const responder = respuestaEnEspera();
    pintar();
    await esperarUnaVuelta();
    fireEvent.keyDown(document.body, { key: 'a' });
    await responder(PENDIENTE);
    sinVentana();
  });

  // Si se va de Inicio antes de la respuesta y vuelve, lo de la primera visita se olvida: volver a
  // entrar es justo cuando la ventana tiene que salir.
  it('si se fue de Inicio y volvió, sale al volver', async () => {
    const responder = respuestaEnEspera();
    pintar();
    await esperarUnaVuelta();
    await userEvent.click(screen.getByRole('button', { name: 'Ir a /app/registros' }));
    await responder(PENDIENTE);
    sinVentana();
    await userEvent.click(screen.getByRole('button', { name: 'Ir a /app' }));
    expect(await ventana()).toBeInTheDocument();
  });

  // Lo que hizo en OTRA pantalla no cuenta, ni el clic del menú que la trajo a Inicio: entrar a Inicio
  // es justo cuando la ventana tiene que salir.
  it('lo que hizo antes de llegar a Inicio no cuenta', async () => {
    const responder = respuestaEnEspera();
    pintar('/app/registros');
    await esperarUnaVuelta();
    fireEvent.keyDown(document.body, { key: 'a' });
    await userEvent.click(screen.getByRole('button', { name: 'Ir a /app' }));
    await responder(PENDIENTE);
    expect(await ventana()).toBeInTheDocument();
  });

  it('con el correo sin verificar no le sale', async () => {
    sesion.usuario = { ...sesion.usuario, emailVerificado: false };
    pintar();
    await esperarUnaVuelta();
    expect(get).not.toHaveBeenCalled();
    sinVentana();
  });

  it('fuera de Inicio no sale, y sale al llegar a Inicio', async () => {
    pintar('/app/registros');
    await esperarUnaVuelta();
    sinVentana();
    expect(marcadaEnLaPestana()).toBe(false);
    await userEvent.click(screen.getByRole('button', { name: 'Ir a /app' }));
    expect(await ventana()).toBeInTheDocument();
  });

  // Lo que dijo el servidor al cargar es lo que vale para esta carga (R4): si al cargar había otro
  // aviso del servidor (el auxilio por revisar) y se resolvió en otra pantalla, la reseña no sale
  // detrás al llegar a Inicio. Se pregunta UNA vez.
  it('lo que dijo el servidor al cargar el panel es lo que vale al llegar a Inicio', async () => {
    get.mockResolvedValueOnce(NO_PENDIENTE).mockResolvedValue(PENDIENTE);
    pintar('/app/registros');
    await esperarUnaVuelta();
    // Se preguntó al cargar, todavía fuera de Inicio. Sin esto la prueba pasaría también preguntando
    // al llegar a Inicio, porque la primera respuesta simulada es la del «no».
    expect(get).toHaveBeenCalledTimes(1);
    await userEvent.click(screen.getByRole('button', { name: 'Ir a /app' }));
    await esperarUnaVuelta();
    sinVentana();
    expect(get).toHaveBeenCalledTimes(1);
  });
});

describe('VentanaResena: lo que hay dentro', () => {
  it('el foco arranca en las estrellas', async () => {
    pintar();
    await ventana();
    expect(estrella(1)).toHaveFocus();
  });

  it('ninguna estrella ni ninguna opción viene marcada', async () => {
    pintar();
    await ventana();
    for (const radio of screen.getAllByRole('radio')) expect(radio).not.toBeChecked();
  });

  it('«Enviar» no se puede pulsar sin estrellas, y sí con ellas aunque no haya texto', async () => {
    pintar();
    await ventana();
    expect(enviar()).toBeDisabled();
    await userEvent.click(estrella(4));
    expect(enviar()).toBeEnabled();
  });

  it('con el texto vacío no pregunta si se publica', async () => {
    pintar();
    await ventana();
    expect(screen.queryByRole('group', { name: /presumir tu opinión/i })).not.toBeInTheDocument();
    await userEvent.type(caja(), '   ');
    expect(screen.queryByRole('group', { name: /presumir tu opinión/i })).not.toBeInTheDocument();
  });

  // Una autorización que se da con solo no tocar nada no es una autorización expresa (Ley 1581).
  it('con texto pregunta si se publica, sin opción marcada, y no deja enviar hasta elegir', async () => {
    pintar();
    await ventana();
    await userEvent.click(estrella(5));
    await userEvent.type(caja(), 'Ya no peleamos con el Excel.');
    const pregunta = screen.getByRole('group', { name: '¿Nos dejas presumir tu opinión en la web?' });
    const conNombre = screen.getByRole('radio', { name: OPCIONES.CON_NOMBRE });
    const anonima = screen.getByRole('radio', { name: OPCIONES.ANONIMA });
    expect(pregunta).toContainElement(conNombre);
    expect(conNombre).not.toBeChecked();
    expect(anonima).not.toBeChecked();
    expect(screen.getByText('HoraPro sabrá quién la escribió; en la web, no.')).toBeInTheDocument();
    expect(enviar()).toBeDisabled();
    await userEvent.click(anonima);
    expect(enviar()).toBeEnabled();
  });

  it('muestra el ejemplo debajo de la caja y cuenta los caracteres', async () => {
    pintar();
    await ventana();
    expect(screen.getByText('Ej: "Ya no peleamos con el Excel a fin de mes..."')).toBeInTheDocument();
    expect(screen.getByText('0/500')).toBeInTheDocument();
    await userEvent.type(caja(), 'Hola');
    expect(screen.getByText('4/500')).toBeInTheDocument();
    expect(caja()).toHaveAttribute('maxLength', '500');
  });

  it('enviar solo con estrellas manda las estrellas, sin texto ni opción', async () => {
    pintar();
    await ventana();
    await userEvent.click(estrella(4));
    await userEvent.click(enviar());
    expect(post).toHaveBeenCalledWith('/resenas', { accion: 'ENVIAR', estrellas: 4 });
  });

  it('enviar con texto manda el texto y la opción elegida', async () => {
    pintar();
    await ventana();
    await userEvent.click(estrella(5));
    await userEvent.type(caja(), 'Ya no peleamos con el Excel.');
    await userEvent.click(screen.getByRole('radio', { name: OPCIONES.CON_NOMBRE }));
    await userEvent.click(enviar());
    expect(post).toHaveBeenCalledWith('/resenas', {
      accion: 'ENVIAR', estrellas: 5, texto: 'Ya no peleamos con el Excel.', comoAparece: 'CON_NOMBRE',
    });
  });

  // R5.
  it('al enviar se cierra y da las gracias', async () => {
    pintar();
    await ventana();
    await userEvent.click(estrella(3));
    await userEvent.click(enviar());
    expect(await screen.findByText('¡Gracias por contarnos!')).toBeInTheDocument();
    sinVentana();
  });

  it('«Omitir» manda OMITIR y se cierra', async () => {
    pintar();
    await ventana();
    await userEvent.click(screen.getByRole('button', { name: 'Omitir' }));
    expect(post).toHaveBeenCalledWith('/resenas', { accion: 'OMITIR' });
    await vi.waitFor(() => sinVentana());
  });

  // R9: otro administrador, o la misma persona en otra pestaña, respondió primero. No es un error.
  it('si la empresa ya respondió, se cierra con un aviso amable', async () => {
    post.mockRejectedValue(YA_RESPONDIO);
    pintar();
    await ventana();
    await userEvent.click(estrella(5));
    await userEvent.click(enviar());
    expect(await screen.findByText('Tu empresa ya nos dejó su opinión, gracias.')).toBeInTheDocument();
    sinVentana();
  });

  it('«Enviar» protegido contra el doble clic: una sola petición', async () => {
    post.mockReturnValue(new Promise(() => {}));
    pintar();
    await ventana();
    await userEvent.click(estrella(5));
    await userEvent.dblClick(enviar());
    expect(post).toHaveBeenCalledTimes(1);
  });

  it('«Omitir» también: una sola petición', async () => {
    post.mockReturnValue(new Promise(() => {}));
    pintar();
    await ventana();
    await userEvent.dblClick(screen.getByRole('button', { name: 'Omitir' }));
    expect(post).toHaveBeenCalledTimes(1);
  });

  // Sin una salida, un servidor caído dejaría el panel entero tapado por una ventana que no se puede
  // cerrar. «Cerrar por ahora» no gasta nada: no se guardó ninguna fila y vuelve en otra pestaña (R8).
  it('si el envío falla, lo dice, sigue abierta, y deja cerrarla sin gastar la oportunidad', async () => {
    post.mockRejectedValue({ response: { status: 403, data: { error: 'Tu empresa todavía no puede dejar una reseña.' } } });
    pintar();
    await ventana();
    await userEvent.click(estrella(2));
    await userEvent.click(enviar());
    expect(await screen.findByRole('alert')).toHaveTextContent('Tu empresa todavía no puede dejar una reseña.');
    expect(await ventana()).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Cerrar por ahora' }));
    sinVentana();
    expect(post).toHaveBeenCalledTimes(1);
  });

  it('si el envío falla sin decir por qué, da un mensaje propio', async () => {
    post.mockRejectedValue(new Error('Network Error'));
    pintar();
    await ventana();
    await userEvent.click(estrella(2));
    await userEvent.click(enviar());
    expect(await screen.findByRole('alert')).toHaveTextContent(/no pudimos guardar/i);
    expect(enviar()).toBeEnabled();
  });
});

describe('VentanaResena: no se cierra sin querer (R7)', () => {
  // jsdom no tiene AnimationEvent, y entonces React escucha «webkitAnimationEnd»; un navegador de
  // verdad manda «animationend». Se disparan los dos, igual que en Novedades.test.tsx.
  const terminarAnimacion = (el: Element) => {
    fireEvent.animationEnd(el);
    fireEvent(el, new Event('webkitAnimationEnd', { bubbles: true }));
  };
  const envoltorio = () => screen.getByTestId('fondo').firstElementChild as HTMLElement;

  it('un clic fuera no la cierra: la sacude', async () => {
    pintar();
    await ventana();
    expect(envoltorio()).not.toHaveAttribute('data-sacudiendo');
    await userEvent.click(screen.getByTestId('fondo'));
    expect(await ventana()).toBeInTheDocument();
    expect(envoltorio()).toHaveAttribute('data-sacudiendo');
    terminarAnimacion(envoltorio());
    expect(envoltorio()).not.toHaveAttribute('data-sacudiendo');
    expect(post).not.toHaveBeenCalled();
  });

  it('un clic dentro no la sacude', async () => {
    pintar();
    await ventana();
    await userEvent.click(screen.getByText('Hablemos de resultados'));
    expect(envoltorio()).not.toHaveAttribute('data-sacudiendo');
  });

  // Seleccionar texto con el ratón y soltar fuera: el navegador manda el clic al fondo.
  it('seleccionar texto y soltar fuera no la sacude', async () => {
    pintar();
    await ventana();
    fireEvent.pointerDown(screen.getByText('Hablemos de resultados'));
    fireEvent.click(screen.getByTestId('fondo'));
    expect(envoltorio()).not.toHaveAttribute('data-sacudiendo');
  });

  it('Escape no la cierra', async () => {
    pintar();
    await ventana();
    await userEvent.keyboard('{Escape}');
    expect(await ventana()).toBeInTheDocument();
    expect(post).not.toHaveBeenCalled();
  });
});

describe('VentanaResena: el foco no sale de la ventana', () => {
  // CON `fireEvent` Y NO CON `userEvent.tab()`, a propósito. Al final del documento user-event vuelve al
  // principio, y ahí el guardián del foco (la última prueba de este bloque) lo trae de vuelta a la
  // ventana: la prueba pasaba sin que la ventana diera la vuelta. Un navegador, en cambio, se va a la
  // barra de direcciones, donde ningún guardián llega. Lo que se mira es que la ventana corte ese Tab.
  it('Tab desde el último botón vuelve a las estrellas sin salir de la ventana', async () => {
    pintar();
    await ventana();
    // Sin estrellas, «Enviar» está deshabilitado y el último que recibe el foco es «Omitir».
    const omitir = screen.getByRole('button', { name: 'Omitir' });
    omitir.focus();
    const siguioDeLargo = fireEvent.keyDown(omitir, { key: 'Tab' });
    expect(siguioDeLargo).toBe(false);
    expect(estrella(1)).toHaveFocus();
  });

  it('Mayús+Tab desde las estrellas va al último botón', async () => {
    pintar();
    await ventana();
    await userEvent.tab({ shift: true });
    expect(screen.getByRole('button', { name: 'Omitir' })).toHaveFocus();
  });

  it('con «Enviar» habilitado, el último es «Enviar»', async () => {
    pintar();
    await ventana();
    await userEvent.click(estrella(3));
    await userEvent.tab({ shift: true });
    expect(enviar()).toHaveFocus();
    await userEvent.tab();
    expect(estrella(3)).toHaveFocus();
  });

  it('si el foco se va a algo de detrás, vuelve a la ventana', async () => {
    pintar();
    await ventana();
    screen.getByRole('button', { name: 'Ir a /app' }).focus();
    expect(estrella(1)).toHaveFocus();
  });
});

describe('VentanaResena: reducir movimiento', () => {
  const conPreferencia = (reducir: boolean) =>
    vi.spyOn(window, 'matchMedia').mockImplementation(consulta => ({
      matches: reducir && consulta.includes('prefers-reduced-motion: reduce'),
      media: consulta,
      addEventListener: () => {},
      removeEventListener: () => {},
    }) as unknown as MediaQueryList);

  // La marca `data-animada` es para la prueba, que no mira clases de CSS (igual que `data-sacudiendo`).
  it('entra con la animación de escala', async () => {
    conPreferencia(false);
    pintar();
    expect(await ventana()).toHaveAttribute('data-animada');
  });

  it('con «reducir movimiento» entra sin la animación de escala', async () => {
    conPreferencia(true);
    pintar();
    expect(await ventana()).not.toHaveAttribute('data-animada');
  });
});
