import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, within } from '@testing-library/react';
import PantallaMarcar from './PantallaMarcar';
import { decidirUbicacion } from '../decisionUbicacion';
import { MS_CONFIRMAR, MS_CONFIRMAR_REFORZADA } from '../confirmacion';
import type { Estado } from '../tipos';
import type { Modalidad } from '../../../features/colaboradores/modalidad';

// Lo que el kiosco le dice a cada persona sobre su ubicación. Ya no es lo mismo
// para todos, y el caso que importa es el nuevo: un presencial que llegó hasta
// aquí SIN dar el permiso. Antes no podía existir, porque el muro no lo dejaba
// pasar; ahora puede, y tiene que enterarse ANTES de oprimir el botón y no por
// un flash rojo de dos segundos que no le dice qué hacer.

const colaborador = { id: 'c1', nombre: 'Ana', apellido: 'Giraldo', cargo: 'Cajera', modalidad: 'PRESENCIAL' as Modalidad };

// Un toque ya no marca: hay que sostener el botón (2 de octubre de 2026). Las
// pruebas que oprimen el botón grande corren con el reloj falso.
const sostener = (boton: HTMLElement, ms = MS_CONFIRMAR) => {
  fireEvent.pointerDown(boton, { pointerId: 1, button: 0 });
  act(() => { vi.advanceTimersByTime(ms); });
  fireEvent.pointerUp(boton, { pointerId: 1 });
};

const montar = (modalidad: Modalidad, permiso: 'concedido' | 'negado') => render(
  <PantallaMarcar
    colaborador={{ ...colaborador, modalidad }}
    ahora={new Date('2026-09-01T15:00:00.000Z')}
    estado={null}
    marcar={vi.fn()}
    onRegresoOlvidado={vi.fn()}
    marcando={false}
    decisionUbic={decidirUbicacion({ modalidad, validaUbicacion: true, permiso })}
    salir={vi.fn()}
    onNoSoy={vi.fn()}
  />,
);

describe('PantallaMarcar · lo que dice de la ubicación', () => {
  it('al presencial con permiso le confirma que su ubicación está activa', () => {
    montar('PRESENCIAL', 'concedido');
    expect(screen.getByText(/ubicación activada/i)).toBeInTheDocument();
  });

  it('al presencial SIN permiso le avisa que no va a poder marcar, antes de intentarlo', () => {
    montar('PRESENCIAL', 'negado');
    expect(screen.getByText(/sin ubicación no podrás marcar/i)).toBeInTheDocument();
  });

  it('al híbrido le dice que solo se registra la sede, no que va a marcar desde la empresa', () => {
    // Prometerle "marcarás desde la empresa" a un híbrido es directamente falso:
    // marcar desde fuera es un caso soportado.
    montar('HIBRIDO', 'concedido');
    expect(screen.getByText(/se registrará desde qué sede marcas/i)).toBeInTheDocument();
    expect(screen.queryByText(/marcarás desde la empresa/i)).not.toBeInTheDocument();
  });

  it('al híbrido sin permiso no le anuncia un bloqueo que no va a ocurrir', () => {
    montar('HIBRIDO', 'negado');
    expect(screen.queryByText(/no podrás marcar/i)).not.toBeInTheDocument();
  });

  it('al remoto no le dice nada de ubicación, porque no se le mira', () => {
    montar('REMOTO', 'concedido');
    expect(screen.queryByText(/ubicación/i)).not.toBeInTheDocument();
  });
});

// Almuerzo y descanso no remunerado son dos pausas distintas: una se paga y la
// otra no. Si el kiosco manda la marca de una como la de la otra, el error no se
// ve en la pantalla: sale en la nómina.
describe('PantallaMarcar · las pausas', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());
  // Turno abierto desde las 8:00 y ninguna pausa marcada todavía.
  const dentro: Estado = {
    dentroAhora: true, entradaAbierta: { entrada: '2026-09-01T13:00:00.000Z' }, turnoCerradoHoy: null,
    almuerzo: null, enAlmuerzo: false, salidaAlmuerzo: null,
    descanso: null, enDescanso: false, salidaDescanso: null,
    regresoSugerido: null,
  };
  // Salió a una pausa: no hay turno abierto y el tramo de la mañana quedó cerrado.
  const fuera: Estado = {
    ...dentro, dentroAhora: false, entradaAbierta: null,
    turnoCerradoHoy: { entrada: '2026-09-01T13:00:00.000Z', salida: '2026-09-01T14:00:00.000Z' },
  };

  const montarCon = (estado: Estado) => {
    const marcar = vi.fn();
    const onRegresoOlvidado = vi.fn();
    render(
      <PantallaMarcar
        colaborador={colaborador} ahora={new Date('2026-09-01T14:00:00.000Z')} estado={estado}
        marcar={marcar} onRegresoOlvidado={onRegresoOlvidado} marcando={false}
        decisionUbic={decidirUbicacion({ modalidad: 'REMOTO', validaUbicacion: false, permiso: 'concedido' })}
        salir={vi.fn()}
        onNoSoy={vi.fn()}
      />,
    );
    return { marcar, onRegresoOlvidado };
  };

  it('dentro de la ventana del descanso, el botón grande sale al descanso', () => {
    const { marcar } = montarCon({ ...dentro, descanso: { inicio: '09:00', fin: '09:15', ahora: true } });
    sostener(screen.getByRole('button', { name: /salgo a mi descanso/i }));
    expect(marcar).toHaveBeenCalledWith({ descanso: true });
  });

  it('dentro de la ventana del almuerzo, el botón grande sale a almorzar', () => {
    const { marcar } = montarCon({ ...dentro, almuerzo: { inicio: '12:00', fin: '13:00', ahora: true } });
    sostener(screen.getByRole('button', { name: /salgo a almorzar/i }));
    expect(marcar).toHaveBeenCalledWith({ almuerzo: true });
  });

  it('«Termino mi jornada» también se sostiene: un toque no marca', () => {
    const { marcar } = montarCon({ ...dentro, almuerzo: { inicio: '12:00', fin: '13:00', ahora: true } });
    const boton = screen.getByRole('button', { name: /termino mi jornada/i });
    fireEvent.pointerDown(boton, { pointerId: 1, button: 0 });
    fireEvent.pointerUp(boton, { pointerId: 1 });
    fireEvent.click(boton);
    act(() => { vi.advanceTimersByTime(5000); });
    expect(marcar).not.toHaveBeenCalled();
    sostener(boton);
    expect(marcar).toHaveBeenCalledWith();
  });

  it('fuera de las ventanas y con las dos pausas pendientes, pregunta cuál salida es', () => {
    const { marcar } = montarCon({
      ...dentro,
      almuerzo: { inicio: '12:00', fin: '13:00', ahora: false },
      descanso: { inicio: '09:00', fin: '09:15', ahora: false },
    });
    sostener(screen.getByRole('button', { name: /registrar salida/i }));
    expect(screen.getByRole('button', { name: /salgo a almorzar/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /salgo a mi descanso/i }));
    expect(marcar).toHaveBeenCalledWith({ descanso: true });
  });

  it('en su descanso, el botón es volver del descanso y no pregunta por un turno nuevo', () => {
    const { marcar } = montarCon({ ...fuera, enDescanso: true, salidaDescanso: '2026-09-01T14:00:00.000Z' });
    expect(screen.getByText(/en descanso desde las/i)).toBeInTheDocument();
    sostener(screen.getByRole('button', { name: /volví de mi descanso/i }));
    expect(marcar).toHaveBeenCalledWith();
  });

  it('en su almuerzo, el botón es volver de almorzar', () => {
    const { marcar } = montarCon({ ...fuera, enAlmuerzo: true, salidaAlmuerzo: '2026-09-01T17:00:00.000Z' });
    sostener(screen.getByRole('button', { name: /volví de almorzar/i }));
    expect(marcar).toHaveBeenCalledWith();
  });

  it('si se le pasó la hora de volver del descanso, pregunta a qué hora volvió en vez de marcar', () => {
    const { marcar, onRegresoOlvidado } = montarCon({
      ...fuera, enDescanso: true, salidaDescanso: '2026-09-01T14:00:00.000Z', regresoSugerido: '2026-09-01T14:15:00.000Z',
    });
    sostener(screen.getByRole('button', { name: /volví de mi descanso/i }));
    expect(onRegresoOlvidado).toHaveBeenCalled();
    expect(marcar).not.toHaveBeenCalled();
  });

  // Deshacer el despliegue de los descansos (12 de septiembre de 2026) deja pantallas
  // nuevas contra un servidor anterior, que no manda nada del descanso. Ahí el kiosco
  // tiene que seguir marcando: el botón se pinta y la salida va sin pausa.
  it('un Estado sin los campos del descanso pinta el botón y marca sin pausa', () => {
    const sinDescanso: Estado = {
      dentroAhora: true, entradaAbierta: { entrada: '2026-09-01T13:00:00.000Z' }, turnoCerradoHoy: null,
      almuerzo: null, enAlmuerzo: false, salidaAlmuerzo: null, regresoSugerido: null,
    };
    const { marcar } = montarCon(sinDescanso);
    sostener(screen.getByRole('button', { name: /registrar salida/i }));
    expect(marcar).toHaveBeenCalledWith();
  });
});

// CONFIRMAR QUIÉN ES ANTES DE MARCAR (2 de octubre de 2026).
//
// El 1 de octubre una persona sin rostro registrado marcó como Lina a las 08:49, y
// a las 08:52 Lina, reconocida bien, oprimió «Registrar Salida» sobre esa entrada.
// Las dos tenían el nombre en pantalla y ninguna lo miró.
describe('PantallaMarcar · confirmar quién es antes de marcar', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  const fuera: Estado = {
    dentroAhora: false, entradaAbierta: null, turnoCerradoHoy: null,
    almuerzo: null, enAlmuerzo: false, salidaAlmuerzo: null, regresoSugerido: null,
  };
  const FICHA = 'data:image/jpeg;base64,ficha';

  const montarConfirmando = (estado: Estado, opciones: { ahora?: string; fotoReferencia?: string | null; parecidoDudoso?: boolean } = {}) => {
    const marcar = vi.fn();
    const salir = vi.fn();
    const onNoSoy = vi.fn();
    render(
      <PantallaMarcar
        colaborador={colaborador} ahora={new Date(opciones.ahora ?? '2026-10-01T13:49:00Z')} estado={estado}
        marcar={marcar} onRegresoOlvidado={vi.fn()} marcando={false}
        decisionUbic={decidirUbicacion({ modalidad: 'REMOTO', validaUbicacion: false, permiso: 'concedido' })}
        salir={salir} onNoSoy={onNoSoy}
        fotoReferencia={opciones.fotoReferencia === undefined ? FICHA : opciones.fotoReferencia}
        parecidoDudoso={opciones.parecidoDudoso ?? false}
      />,
    );
    return { marcar, salir, onNoSoy };
  };

  // EL DISEÑO DEL DUEÑO (3 de octubre de 2026): una pregunta en grande, la tarjeta de la
  // persona con la foto que tiene registrada y su sede, el reloj, y el botón que dice a nombre
  // de quién y QUÉ se marca.
  it('pregunta «¿Eres tú?» con el nombre, y el botón dice quién y qué se marca', () => {
    montarConfirmando(fuera);
    expect(screen.getByRole('heading', { name: '¿Eres tú, Ana?' })).toBeInTheDocument();
    expect(screen.getByText('Ana Giraldo')).toBeInTheDocument();
    expect(screen.getByText('Cajera')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^soy ana, registrar entrada$/i })).toBeInTheDocument();
  });

  it('dice cuánto hay que sostener el botón, debajo de él', () => {
    montarConfirmando(fuera);
    expect(screen.getByText('Mantén presionado durante 1 segundo')).toBeInTheDocument();
  });

  it('la fecha va en hora de Bogotá, con día y mes en mayúscula', () => {
    // 13:49 UTC del 1 de octubre son las 08:49 del jueves 1 en Bogotá. Las pruebas corren en
    // Los Ángeles a propósito: si la fecha se calculara en la zona del aparato, aquí también
    // daría el 1, pero un error de zona se vería a otras horas (CLAUDE.md §7).
    montarConfirmando(fuera);
    expect(screen.getByText('Jueves, 1 de Octubre')).toBeInTheDocument();
  });

  it('la sede va en una etiqueta en la tarjeta de la persona', () => {
    render(
      <PantallaMarcar
        colaborador={colaborador} sedes={[{ id: 's1', nombre: 'Sede principal' }]}
        ahora={new Date('2026-10-01T13:49:00Z')} estado={fuera}
        marcar={vi.fn()} onRegresoOlvidado={vi.fn()} marcando={false}
        decisionUbic={decidirUbicacion({ modalidad: 'REMOTO', validaUbicacion: false, permiso: 'concedido' })}
        salir={vi.fn()} onNoSoy={vi.fn()}
      />,
    );
    expect(screen.getByText('Sede principal')).toBeInTheDocument();
  });

  it('un toque, como el del 1 de octubre, no marca', () => {
    const { marcar } = montarConfirmando(fuera);
    const boton = screen.getByRole('button', { name: /soy ana, registrar entrada/i });
    fireEvent.pointerDown(boton, { pointerId: 1, button: 0 });
    fireEvent.pointerUp(boton, { pointerId: 1 });
    fireEvent.click(boton);
    act(() => { vi.advanceTimersByTime(5000); });
    expect(marcar).not.toHaveBeenCalled();
  });

  it('sostenido el tiempo normal, marca', () => {
    const { marcar } = montarConfirmando(fuera);
    sostener(screen.getByRole('button', { name: /soy ana, registrar entrada/i }));
    expect(marcar).toHaveBeenCalledWith();
  });

  // La foto es la que la persona tiene REGISTRADA, no la que se acaba de tomar: la de ahora
  // le muestra a cada quien su propia cara, que es lo que espera ver y no le dice nada.
  it('muestra la foto registrada en el sistema, y no la que se acaba de tomar', () => {
    montarConfirmando(fuera);
    expect(screen.getByAltText(/foto de la ficha de ana giraldo/i)).toHaveAttribute('src', FICHA);
    expect(screen.queryByRole('img', { name: /ahora/i })).not.toBeInTheDocument();
  });

  it('sin foto en la ficha, quedan las iniciales', () => {
    montarConfirmando(fuera, { fotoReferencia: null });
    expect(screen.queryByAltText(/foto de la ficha/i)).not.toBeInTheDocument();
    expect(screen.getByText('AG')).toBeInTheDocument();
  });

  it('«No soy Ana» se ve como un botón y avisa', () => {
    const { onNoSoy, marcar } = montarConfirmando(fuera);
    fireEvent.click(screen.getByRole('button', { name: /no soy ana/i }));
    expect(onNoSoy).toHaveBeenCalled();
    expect(marcar).not.toHaveBeenCalled();
  });

  it('EL CASO DEL 1 DE OCTUBRE: salir a los 3 minutos de la entrada lo dice con la hora y pide el sostenido reforzado', () => {
    const dentro: Estado = { ...fuera, dentroAhora: true, entradaAbierta: { entrada: '2026-10-01T13:49:21Z' } };
    const { marcar } = montarConfirmando(dentro, { ahora: '2026-10-01T13:52:39Z' });
    expect(screen.getByText(/tu entrada figura a las 8:49 a\. m\., hace 3 minutos/i)).toBeInTheDocument();
    const boton = screen.getByRole('button', { name: /soy ana, registrar salida/i });
    sostener(boton, MS_CONFIRMAR);
    expect(marcar).not.toHaveBeenCalled();
    sostener(boton, MS_CONFIRMAR_REFORZADA);
    expect(marcar).toHaveBeenCalledTimes(1);
  });

  it('ahí mismo se puede salir sin marcar', () => {
    const dentro: Estado = { ...fuera, dentroAhora: true, entradaAbierta: { entrada: '2026-10-01T13:49:21Z' } };
    const { salir, marcar } = montarConfirmando(dentro, { ahora: '2026-10-01T13:52:39Z' });
    fireEvent.click(screen.getByRole('button', { name: /salir sin marcar/i }));
    expect(salir).toHaveBeenCalled();
    expect(marcar).not.toHaveBeenCalled();
  });

  it('el parecido dudoso pide mirar las fotos y el sostenido reforzado', () => {
    const { marcar } = montarConfirmando(fuera, { parecidoDudoso: true });
    expect(screen.getByText(/mira bien la foto/i)).toBeInTheDocument();
    expect(screen.getByText('Mantén presionado durante 2 segundos')).toBeInTheDocument();
    const boton = screen.getByRole('button', { name: /soy ana, registrar entrada/i });
    sostener(boton, MS_CONFIRMAR);
    expect(marcar).not.toHaveBeenCalled();
    sostener(boton, MS_CONFIRMAR_REFORZADA);
    expect(marcar).toHaveBeenCalledTimes(1);
  });

  // Antes de esto, «No soy Ana» era la única forma de irse sin marcar, y quien solo
  // venía a mirar su entrada lo tocaba: el servidor anotaba una identificación
  // falsa que no ocurrió, y la cédula quedaba esperando con su foto.
  it('en una marca normal también se puede salir sin marcar, sin decir que no es ella', () => {
    const { salir, onNoSoy, marcar } = montarConfirmando(fuera);
    fireEvent.click(screen.getByRole('button', { name: /salir sin marcar/i }));
    expect(salir).toHaveBeenCalled();
    expect(onNoSoy).not.toHaveBeenCalled();
    expect(marcar).not.toHaveBeenCalled();
  });

  it('mientras marca, «No soy» y «Salir sin marcar» no se pueden tocar', () => {
    render(
      <PantallaMarcar
        colaborador={colaborador} ahora={new Date('2026-10-01T13:49:00Z')} estado={fuera}
        marcar={vi.fn()} onRegresoOlvidado={vi.fn()} marcando
        decisionUbic={decidirUbicacion({ modalidad: 'REMOTO', validaUbicacion: false, permiso: 'concedido' })}
        salir={vi.fn()} onNoSoy={vi.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: /no soy ana/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /salir sin marcar/i })).toBeDisabled();
  });

  it('sin foto en la ficha no pide mirar una foto que no está', () => {
    montarConfirmando(fuera, { fotoReferencia: null, parecidoDudoso: true });
    expect(screen.queryByText(/mira bien la foto/i)).not.toBeInTheDocument();
    expect(screen.getByText(/revisa que el nombre sea el tuyo/i)).toBeInTheDocument();
  });

  it('desde «Ya registraste tu jornada», su «No soy Ana» avisa', () => {
    const cerrado: Estado = { ...fuera, turnoCerradoHoy: { entrada: '2026-10-01T13:49:21Z', salida: '2026-10-01T13:52:39Z' } };
    const { onNoSoy, marcar } = montarConfirmando(cerrado, { ahora: '2026-10-01T13:56:53Z' });
    sostener(screen.getByRole('button', { name: /soy ana, registrar entrada/i }));
    const aviso = screen.getByText('Ana, ya registraste tu jornada de hoy').parentElement!;
    fireEvent.click(within(aviso).getByRole('button', { name: /no soy ana/i }));
    expect(onNoSoy).toHaveBeenCalledTimes(1);
    expect(marcar).not.toHaveBeenCalled();
  });

  // LO QUE YA TIENE A SU NOMBRE HOY (3 de octubre de 2026, diseño del dueño): la lista de sus
  // marcas del día. Es lo que habría delatado la entrada de las 8:49 que Lina no hizo.
  it('lista las marcas que ya tiene hoy, con su hora en 12 horas', () => {
    montarConfirmando({
      ...fuera, dentroAhora: true, entradaAbierta: { entrada: '2026-10-01T13:49:21Z' },
      marcasDeHoy: [
        { momento: 'ENTRADA', hora: '2026-10-01T13:49:21Z' },
      ],
    }, { ahora: '2026-10-01T13:52:39Z' });
    expect(screen.getByRole('heading', { name: 'Marcas de hoy' })).toBeInTheDocument();
    expect(screen.getByText('Entrada registrada a las 8:49 a. m.')).toBeInTheDocument();
  });

  it('con muchas marcas muestra las tres últimas y dice cuántas más hay', () => {
    const horas = ['11:02', '13:30', '13:45', '16:01', '17:00', '21:04', '23:00'];
    montarConfirmando({
      ...fuera, dentroAhora: true, entradaAbierta: { entrada: '2026-10-01T23:00:00Z' },
      marcasDeHoy: horas.map((h, i) => ({ momento: i % 2 === 0 ? 'ENTRADA' : 'SALIDA', hora: `2026-10-01T${h}:00Z` })),
    }, { ahora: '2026-10-01T23:30:00Z' });
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
    expect(screen.getByText('Entrada registrada a las 6:00 p. m.')).toBeInTheDocument();
    expect(screen.queryByText('Entrada registrada a las 6:02 a. m.')).not.toBeInTheDocument();
    expect(screen.getByText('y 4 más')).toBeInTheDocument();
  });

  it('sin marcas hoy no muestra la lista', () => {
    montarConfirmando({ ...fuera, marcasDeHoy: [] });
    expect(screen.queryByRole('heading', { name: 'Marcas de hoy' })).not.toBeInTheDocument();
  });

  it('«No soy Ana» es un botón aunque ya no tenga borde', () => {
    montarConfirmando(fuera);
    expect(screen.getByRole('button', { name: /^no soy ana$/i })).toBeInTheDocument();
  });

  it('una marca normal no muestra ningún aviso', () => {
    montarConfirmando(fuera);
    expect(screen.queryByText(/mira bien la foto/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/tu entrada figura/i)).not.toBeInTheDocument();
  });
});
