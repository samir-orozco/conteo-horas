import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ModalCerrarTurno from './ModalCerrarTurno';

// CERRAR UN TURNO OLVIDADO (8 de octubre de 2026). El caso que lo rompió, con los números reales:
//
//   tramo 1:  07:00:23 → 16:42:40
//   tramo 2:  16:42:54 → sin salida          (el que se quería cerrar)
//
// El modal reenviaba la entrada como «16:42», sin segundos, así que el tramo 2 empezaba 54 s
// antes de lo real, DENTRO del tramo 1, y el servidor lo rechazaba por cruce. Y la persona solo
// veía «No pudimos guardar»: el motivo que el servidor sí explica se perdía en el camino.

vi.mock('../api', () => ({ cerrarRegistro: vi.fn() }));
import { cerrarRegistro } from '../api';
const cerrar = cerrarRegistro as unknown as ReturnType<typeof vi.fn>;

// 16:42:54 en Bogotá es 21:42:54 UTC.
const TURNO = { id: 'r1', colaborador: 'ROSA MARCANO', entrada: '2026-10-07T21:42:54.404Z' } as never;

function abrir() {
  const onClose = vi.fn();
  const onDone = vi.fn();
  render(<ModalCerrarTurno turno={TURNO} onClose={onClose} onDone={onDone} />);
  return { onClose, onDone };
}
const escribirSalida = (hhmm: string) => fireEvent.change(screen.getByLabelText('Salida'), { target: { value: hhmm } });
const cerrarTurno = () => fireEvent.click(screen.getByRole('button', { name: 'Cerrar turno' }));
const mensaje = () => document.querySelector('p.text-red-600')?.textContent;

beforeEach(() => { cerrar.mockReset(); cerrar.mockResolvedValue({}); });

describe('ModalCerrarTurno', () => {
  it('muestra la entrada de la persona tal como quedó marcada', () => {
    abrir();
    expect(screen.getByLabelText('Entrada')).toHaveValue('16:42');
    expect(screen.getByLabelText('Fecha')).toHaveValue('2026-10-07');
  });

  it('con la entrada sin tocar manda SOLO la salida, para no mover los segundos de la entrada real', async () => {
    const { onClose, onDone } = abrir();
    escribirSalida('19:00');
    cerrarTurno();
    await waitFor(() => expect(cerrar).toHaveBeenCalledTimes(1));
    const [id, cuerpo] = cerrar.mock.calls[0];
    expect(id).toBe('r1');
    expect(cuerpo).not.toHaveProperty('entrada');
    // 19:00 en Bogotá es 00:00 UTC del día siguiente.
    expect(cuerpo.salida).toEqual(new Date('2026-10-08T00:00:00.000Z'));
    await waitFor(() => expect(onDone).toHaveBeenCalled());
    expect(onClose).toHaveBeenCalled();
  });

  it('si la persona SÍ corrige la entrada, la manda', async () => {
    abrir();
    fireEvent.change(screen.getByLabelText('Entrada'), { target: { value: '16:00' } });
    escribirSalida('19:00');
    cerrarTurno();
    await waitFor(() => expect(cerrar).toHaveBeenCalledTimes(1));
    const [, cuerpo] = cerrar.mock.calls[0];
    expect(cuerpo.entrada).toEqual(new Date('2026-10-07T21:00:00.000Z'));
    expect(cuerpo.salida).toEqual(new Date('2026-10-08T00:00:00.000Z'));
  });

  it('una salida con hora menor que la entrada es del día siguiente, y lo dice antes de guardar', async () => {
    abrir();
    expect(screen.queryByText(/^Salida el /)).toBeNull();
    escribirSalida('19:00');
    expect(screen.queryByText(/^Salida el /)).toBeNull();

    escribirSalida('07:00');
    expect(screen.getByText('Salida el 8 de octubre')).toBeInTheDocument();
    cerrarTurno();
    await waitFor(() => expect(cerrar).toHaveBeenCalledTimes(1));
    // 07:00 del 8 de octubre en Bogotá es 12:00 UTC.
    expect(cerrar.mock.calls[0][1].salida).toEqual(new Date('2026-10-08T12:00:00.000Z'));
  });

  it('muestra el motivo que da el servidor, no un «intenta de nuevo» que no dice nada', async () => {
    const motivo = 'Ese horario se cruza con otra marcación del mismo día, la de 07:00 a 16:42. Nadie puede estar en dos turnos a la vez.';
    cerrar.mockRejectedValue({ response: { status: 400, data: { error: motivo, codigo: 'CRUCE_DE_MARCACIONES' } } });
    const { onDone } = abrir();
    escribirSalida('19:00');
    cerrarTurno();
    await waitFor(() => expect(mensaje()).toBe(motivo));
    expect(onDone).not.toHaveBeenCalled();
  });

  it('si el servidor no dice nada, queda el mensaje de respaldo', async () => {
    cerrar.mockRejectedValue({});
    abrir();
    escribirSalida('19:00');
    cerrarTurno();
    await waitFor(() => expect(mensaje()).toBe('No pudimos guardar. Intenta de nuevo.'));
  });

  it('sin hora de salida pide la hora y no llama al servidor', () => {
    abrir();
    cerrarTurno();
    expect(mensaje()).toBe('Indica la hora de salida.');
    expect(cerrar).not.toHaveBeenCalled();
  });

  it('una salida a la misma hora que la entrada no es un turno', () => {
    abrir();
    escribirSalida('16:42');
    cerrarTurno();
    expect(mensaje()).toBe('La salida debe ser posterior a la entrada.');
    expect(cerrar).not.toHaveBeenCalled();
  });
});
