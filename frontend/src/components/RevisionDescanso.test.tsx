import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RevisionDescanso from './RevisionDescanso';

// EL BLOQUEO QUE PREGUNTA QUÉ DÍA DESCANSA LA GENTE (21 de septiembre de 2026).
//
// La ley colombiana presume que el descanso obligatorio es el domingo SALVO acuerdo escrito. Hasta
// ahora nadie podía declarar otro día, así que la presunción se cumplía sola. Desde que el motor
// lee la declaración, hay que preguntarla: sin respuesta, a quien trabaja domingo con acuerdo se le
// sigue cobrando un recargo que no corresponde, y a quien NO tiene acuerdo hay que seguir
// pagándoselo.
//
// Se pregunta por HORARIO y no por persona: quienes comparten horario comparten el patrón de días.
// Y NO se le pregunta a todo el mundo: un horario que no cubre el domingo ya está resuelto por la
// ley. Eso lo decide el backend con `preguntasDeDescanso`, que es puro y tiene sus pruebas; aquí
// solo llega lo que hay que preguntar.
//
// Se consulta por `group` y por etiqueta, no por clases: una prueba que se rompe al renombrar una
// clase no está probando comportamiento (§7).

const { get, post } = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock('../lib/api', () => ({
  default: {
    get: (...a: unknown[]) => get(...a),
    post: (...a: unknown[]) => post(...a),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

const horario = (
  id: string, nombre: string, origen: string, personas: number, sugerido: string | null = null,
) => ({ id, nombre, origen, personas, sugerido });

// El caso real de la base: siete días configurados, así que no hay día que deducir.
const SIETE_DIAS = horario('h1', 'Jornada demo', 'SIN_DIA_LIBRE', 2);
// El otro caso: trabaja domingo y le queda un solo día libre, que se sugiere.
const UN_DIA_LIBRE = horario('h2', 'Rotativo fin de semana', 'PROPUESTA', 5, 'MIERCOLES');

const montar = (data: unknown = { pendiente: true, horarios: [SIETE_DIAS] }) => {
  get.mockImplementation((url: string) => {
    if (url === '/configuracion/descanso-pendiente') return Promise.resolve({ data });
    return Promise.reject(new Error('url inesperada: ' + url));
  });
  return render(<RevisionDescanso />);
};

const fichaDe = (dialogo: HTMLElement, nombre: RegExp) =>
  within(dialogo).getByRole('group', { name: nombre });

beforeEach(() => { post.mockReset(); });

describe('RevisionDescanso', () => {
  it('la empresa que ya respondió no ve nada', async () => {
    montar({ pendiente: false, horarios: [] });
    await new Promise(r => setTimeout(r, 0));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('la empresa sin horarios que preguntar tampoco, aunque no haya respondido', async () => {
    // La mayoría: su mundo entero es de lunes a viernes y la ley ya les responde con el domingo.
    montar({ pendiente: false, horarios: [] });
    await new Promise(r => setTimeout(r, 0));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('muestra el horario y a cuánta gente afecta', async () => {
    montar();
    const dialogo = await screen.findByRole('dialog');
    const ficha = fichaDe(dialogo, /Jornada demo/);
    expect(ficha).toHaveTextContent(/2 personas/i);
  });

  it('cuando no hay día que deducir, no preselecciona ninguno', async () => {
    // Es el caso que más importa: con los siete días configurados no se puede adivinar, y
    // preseleccionar uno haría que alguien lo confirmara sin mirarlo.
    montar();
    const dialogo = await screen.findByRole('dialog');
    const opciones = within(fichaDe(dialogo, /Jornada demo/)).getAllByRole('radio');
    expect(opciones).toHaveLength(8); // los siete días más «rota cada semana»
    expect(opciones.some(o => (o as HTMLInputElement).checked)).toBe(false);
  });

  it('cuando queda un solo día libre, lo sugiere ya elegido', async () => {
    montar({ pendiente: true, horarios: [UN_DIA_LIBRE] });
    const dialogo = await screen.findByRole('dialog');
    expect(within(fichaDe(dialogo, /Rotativo fin de semana/)).getByRole('radio', { name: 'Miércoles' }))
      .toBeChecked();
  });

  it('no deja guardar mientras quede un horario sin responder', async () => {
    // Guardar marca la empresa como revisada, así que una respuesta parcial daría por resuelto lo
    // que nadie contestó y esos horarios no volverían a preguntarse nunca.
    montar({ pendiente: true, horarios: [SIETE_DIAS, UN_DIA_LIBRE] });
    const dialogo = await screen.findByRole('dialog');
    expect(within(dialogo).getByRole('button', { name: /guardar/i })).toBeDisabled();
  });

  it('elegir un día fijo se guarda como FIJO con ese día', async () => {
    const usuario = userEvent.setup();
    post.mockResolvedValue({ data: { ok: true } });
    montar();
    const dialogo = await screen.findByRole('dialog');
    await usuario.click(within(fichaDe(dialogo, /Jornada demo/)).getByRole('radio', { name: 'Martes' }));
    await usuario.click(within(dialogo).getByRole('button', { name: /guardar/i }));

    expect(post).toHaveBeenCalledWith('/configuracion/descanso-revisado', {
      respuestas: [{ horarioId: 'h1', tipo: 'FIJO', dia: 'MARTES' }],
    });
  });

  it('elegir que rota se guarda como ROTATIVO y sin día', async () => {
    // El día no viaja: en un turno rotativo lo define el turno de cada semana, y mandar uno dejaría
    // una declaración que dice dos cosas a la vez.
    const usuario = userEvent.setup();
    post.mockResolvedValue({ data: { ok: true } });
    montar();
    const dialogo = await screen.findByRole('dialog');
    await usuario.click(within(fichaDe(dialogo, /Jornada demo/)).getByRole('radio', { name: /Rota/ }));
    await usuario.click(within(dialogo).getByRole('button', { name: /guardar/i }));

    expect(post).toHaveBeenCalledWith('/configuracion/descanso-revisado', {
      respuestas: [{ horarioId: 'h1', tipo: 'ROTATIVO', dia: null }],
    });
  });

  it('después de guardar, el bloqueo se va', async () => {
    const usuario = userEvent.setup();
    post.mockResolvedValue({ data: { ok: true } });
    montar();
    const dialogo = await screen.findByRole('dialog');
    await usuario.click(within(fichaDe(dialogo, /Jornada demo/)).getByRole('radio', { name: /Rota/ }));
    await usuario.click(within(dialogo).getByRole('button', { name: /guardar/i }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('si el guardado falla, el bloqueo se queda y lo dice', async () => {
    // No puede desaparecer sin haber guardado: la empresa creería que respondió.
    const usuario = userEvent.setup();
    post.mockRejectedValue({ response: { data: { error: 'Faltan horarios por responder.' } } });
    montar();
    const dialogo = await screen.findByRole('dialog');
    await usuario.click(within(fichaDe(dialogo, /Jornada demo/)).getByRole('radio', { name: /Rota/ }));
    await usuario.click(within(dialogo).getByRole('button', { name: /guardar/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/faltan horarios/i);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('dice que hace falta el acuerdo escrito, no solo la casilla', async () => {
    // Es la parte legal: declarar otro día sin el papel firmado no vale, y el modal no puede
    // sugerir que basta con elegirlo aquí.
    montar();
    const dialogo = await screen.findByRole('dialog');
    expect(dialogo).toHaveTextContent(/acuerdo escrito/i);
  });
});
