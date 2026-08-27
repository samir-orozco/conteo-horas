import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import HistorialVinculacion, { type Evento } from './HistorialVinculacion';

let n = 0;
const evento = (over: Partial<Evento> = {}): Evento => ({
  id: 'e' + (++n), tipo: 'INGRESO', fecha: '2026-07-06T05:00:00.000Z',
  motivo: null, nota: null, documentoTipo: null, documentoNombre: null,
  usuarioNombre: null, ...over,
});

const montar = (props: Partial<Parameters<typeof HistorialVinculacion>[0]> = {}) =>
  render(
    <HistorialVinculacion
      eventos={[]} error={false}
      onVerDocumento={() => {}} onReintentar={() => {}}
      {...props}
    />,
  );

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.setSystemTime(new Date('2026-08-26T15:00:00.000Z'));
});
afterEach(() => vi.useRealTimers());

describe('la historia de vinculación', () => {
  it('con un solo ingreso lo muestra, en vez de quedar en blanco', () => {
    montar({ eventos: [evento()] });
    expect(screen.getByText(/Historia con la empresa/i)).toBeInTheDocument();
    expect(screen.getByText(/Ingresó/i)).toBeInTheDocument();
  });

  it('sin ningún evento lo dice con palabras', () => {
    montar({ eventos: [] });
    expect(screen.getByText(/Sin movimientos registrados/i)).toBeInTheDocument();
  });

  it('mientras carga no pinta nada: un esqueleto de 200ms molesta más que el vacío', () => {
    const { container } = montar({ eventos: null });
    expect(container).toBeEmptyDOMElement();
  });

  it('pinta cada entrada y cada salida con su fecha', () => {
    montar({ eventos: [
      evento({ tipo: 'RETIRO', fecha: '2026-08-24T05:00:00.000Z', motivo: 'SIN_JUSTA_CAUSA' }),
      evento({ tipo: 'REINGRESO', fecha: '2026-08-20T05:00:00.000Z' }),
      evento({ tipo: 'INGRESO', fecha: '2026-07-06T05:00:00.000Z' }),
    ] });
    expect(screen.getByText(/Se retiró/i)).toBeInTheDocument();
    expect(screen.getByText(/Reingresó/i)).toBeInTheDocument();
    expect(screen.getByText(/Despido sin justa causa/i)).toBeInTheDocument();
  });

  // --- Un fallo del servidor NO es lo mismo que no tener historia ---

  it('si el servidor falla lo dice, en vez de afirmar que no hay movimientos', () => {
    // Decir "Sin movimientos registrados" cuando en realidad no se pudo
    // preguntar es afirmar algo falso sobre el historial legal de una persona.
    montar({ eventos: null, error: true });
    expect(screen.getByText(/No pudimos cargar la historia/i)).toBeInTheDocument();
    expect(screen.queryByText(/Sin movimientos registrados/i)).not.toBeInTheDocument();
  });

  it('y deja volver a intentarlo', async () => {
    const onReintentar = vi.fn();
    montar({ eventos: null, error: true, onReintentar });
    await userEvent.click(screen.getByRole('button', { name: /Reintentar/i }));
    expect(onReintentar).toHaveBeenCalled();
  });

  // --- Rótulos de tiempo y autoría ---

  it('cada hito lleva su rótulo de tiempo, para ubicarlo sin leer la fecha completa', () => {
    montar({ eventos: [
      evento({ tipo: 'RETIRO', fecha: '2026-08-26T05:00:00.000Z', motivo: 'RENUNCIA' }),
      evento({ tipo: 'REINGRESO', fecha: '2026-08-24T05:00:00.000Z' }),
    ] });
    expect(screen.getByText('HOY')).toBeInTheDocument();
    expect(screen.getByText('HACE 2 DÍAS')).toBeInTheDocument();
  });

  it('un hito viejo no repite la fecha en el rótulo, que ya está arriba', () => {
    montar({ eventos: [
      evento({ tipo: 'REINGRESO', fecha: '2025-09-01T05:00:00.000Z', usuarioNombre: 'Admin Demo' }),
    ] });
    expect(screen.getByText(/1 de septiembre de 2025/)).toBeInTheDocument();
    expect(screen.queryByText(/1 DE SEPTIEMBRE DE 2025/)).not.toBeInTheDocument();
    expect(screen.getByText(/Registrado por Admin Demo/).textContent?.trim())
      .toBe('Registrado por Admin Demo');
  });

  it('dice quién lo registró, que es la mitad de para qué sirve una bitácora', () => {
    montar({ eventos: [evento({ tipo: 'RETIRO', motivo: 'RENUNCIA', usuarioNombre: 'Ana Gómez' })] });
    expect(screen.getByText(/Ana Gómez/)).toBeInTheDocument();
  });

  it('no inventa un autor cuando no se sabe quién fue', () => {
    montar({ eventos: [evento({ usuarioNombre: null })] });
    expect(screen.getByText(/Ingresó/i)).toBeInTheDocument();
    expect(screen.queryByText(/Registrado por/i)).not.toBeInTheDocument();
  });

  // --- El soporte ---

  it('abrir el soporte pide el documento de ESE hito, no el de la persona', async () => {
    const onVer = vi.fn();
    montar({ onVerDocumento: onVer, eventos: [
      evento({ id: 'ev-2022', tipo: 'RETIRO', motivo: 'RENUNCIA',
        documentoTipo: 'application/pdf', documentoNombre: 'carta-2022.pdf' }),
    ] });
    await userEvent.click(screen.getByRole('button', { name: /carta-2022\.pdf/i }));
    expect(onVer).toHaveBeenCalledWith('/colaboradores/vinculacion/ev-2022/documento', 'carta-2022.pdf');
  });

  it('una foto del soporte se anuncia como imagen, no como PDF', () => {
    montar({ eventos: [
      evento({ tipo: 'RETIRO', motivo: 'RENUNCIA', documentoTipo: 'image/jpeg', documentoNombre: 'renuncia.jpg' }),
    ] });
    expect(screen.getByText('Imagen')).toBeInTheDocument();
    expect(screen.queryByText('PDF')).not.toBeInTheDocument();
  });

  it('un soporte sin nombre igual se puede abrir', () => {
    montar({ eventos: [
      evento({ tipo: 'RETIRO', motivo: 'RENUNCIA', documentoTipo: 'application/pdf', documentoNombre: null }),
    ] });
    expect(screen.getByRole('button', { name: /Soporte/i })).toBeInTheDocument();
  });

  // --- El plegado ---

  it('con historia larga muestra los últimos y ofrece ver el resto', async () => {
    montar({ eventos: Array.from({ length: 8 }, (_, i) =>
      evento({ tipo: i % 2 === 0 ? 'RETIRO' : 'REINGRESO', motivo: i % 2 === 0 ? 'RENUNCIA' : null,
        fecha: `2026-0${i + 1}-10T05:00:00.000Z` })) });
    const ver = screen.getByRole('button', { name: /Ver 4 movimientos más/i });
    expect(screen.getAllByRole('listitem')).toHaveLength(4);

    await userEvent.click(ver);
    expect(screen.getAllByRole('listitem')).toHaveLength(8);
    expect(screen.queryByRole('button', { name: /Ver .* más/i })).not.toBeInTheDocument();
  });

  it('cuando falta uno solo lo dice en singular', () => {
    montar({ eventos: Array.from({ length: 5 }, (_, i) =>
      evento({ fecha: `2026-0${i + 1}-10T05:00:00.000Z` })) });
    expect(screen.getByRole('button', { name: /Ver 1 movimiento más/i })).toBeInTheDocument();
  });

  it('con pocos movimientos no ofrece ver más, porque no hay nada escondido', () => {
    montar({ eventos: [evento(), evento({ tipo: 'RETIRO', motivo: 'RENUNCIA' })] });
    expect(screen.queryByRole('button', { name: /Ver .* más/i })).not.toBeInTheDocument();
  });
});
