import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PantallaMarcar from './PantallaMarcar';
import { decidirUbicacion } from '../decisionUbicacion';
import type { Estado } from '../tipos';
import type { Modalidad } from '../../../features/colaboradores/modalidad';

// Lo que el kiosco le dice a cada persona sobre su ubicación. Ya no es lo mismo
// para todos, y el caso que importa es el nuevo: un presencial que llegó hasta
// aquí SIN dar el permiso. Antes no podía existir, porque el muro no lo dejaba
// pasar; ahora puede, y tiene que enterarse ANTES de oprimir el botón y no por
// un flash rojo de dos segundos que no le dice qué hacer.

const colaborador = { id: 'c1', nombre: 'Ana', apellido: 'Giraldo', cargo: 'Cajera', modalidad: 'PRESENCIAL' as Modalidad };

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
      />,
    );
    return { marcar, onRegresoOlvidado };
  };

  it('dentro de la ventana del descanso, el botón grande sale al descanso', () => {
    const { marcar } = montarCon({ ...dentro, descanso: { inicio: '09:00', fin: '09:15', ahora: true } });
    fireEvent.click(screen.getByRole('button', { name: /salgo a mi descanso/i }));
    expect(marcar).toHaveBeenCalledWith({ descanso: true });
  });

  it('dentro de la ventana del almuerzo, el botón grande sale a almorzar', () => {
    const { marcar } = montarCon({ ...dentro, almuerzo: { inicio: '12:00', fin: '13:00', ahora: true } });
    fireEvent.click(screen.getByRole('button', { name: /salgo a almorzar/i }));
    expect(marcar).toHaveBeenCalledWith({ almuerzo: true });
  });

  it('fuera de las ventanas y con las dos pausas pendientes, pregunta cuál salida es', () => {
    const { marcar } = montarCon({
      ...dentro,
      almuerzo: { inicio: '12:00', fin: '13:00', ahora: false },
      descanso: { inicio: '09:00', fin: '09:15', ahora: false },
    });
    fireEvent.click(screen.getByRole('button', { name: /registrar salida/i }));
    expect(screen.getByRole('button', { name: /salgo a almorzar/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /salgo a mi descanso/i }));
    expect(marcar).toHaveBeenCalledWith({ descanso: true });
  });

  it('en su descanso, el botón es volver del descanso y no pregunta por un turno nuevo', () => {
    const { marcar } = montarCon({ ...fuera, enDescanso: true, salidaDescanso: '2026-09-01T14:00:00.000Z' });
    expect(screen.getByText(/en descanso desde las/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /volví de mi descanso/i }));
    expect(marcar).toHaveBeenCalledWith();
  });

  it('en su almuerzo, el botón es volver de almorzar', () => {
    const { marcar } = montarCon({ ...fuera, enAlmuerzo: true, salidaAlmuerzo: '2026-09-01T17:00:00.000Z' });
    fireEvent.click(screen.getByRole('button', { name: /volví de almorzar/i }));
    expect(marcar).toHaveBeenCalledWith();
  });

  it('si se le pasó la hora de volver del descanso, pregunta a qué hora volvió en vez de marcar', () => {
    const { marcar, onRegresoOlvidado } = montarCon({
      ...fuera, enDescanso: true, salidaDescanso: '2026-09-01T14:00:00.000Z', regresoSugerido: '2026-09-01T14:15:00.000Z',
    });
    fireEvent.click(screen.getByRole('button', { name: /volví de mi descanso/i }));
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
    fireEvent.click(screen.getByRole('button', { name: /registrar salida/i }));
    expect(marcar).toHaveBeenCalledWith();
  });
});
