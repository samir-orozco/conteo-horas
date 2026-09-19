import { describe, it, expect, vi } from 'vitest';
import { correrRonda } from './programarDiario';

// EL ENVOLTORIO DE LOS BARRIDOS DIARIOS (19 de septiembre de 2026).
//
// Arregla el defecto 2 de la sección 8.3 del CLAUDE.md para los cuatro trabajos a la vez: «un
// trabajo que solo habla cuando hace algo es indistinguible de uno que nunca corrió».
//
// Hoy los cuatro callan cuando no encuentran nada. `mantenerVentana` tiene
// `if (total > 0) log.info(...)` y `limpiarFotosAntiguas` tiene `if (count > 0) app.log.info(...)`.
// Si el barrido deja de correr, el log se ve exactamente igual que si corriera sin trabajo, que es
// lo que hizo que las dos semanas del auto-cierre pasaran desapercibidas.
//
// El envoltorio registra SIEMPRE: al empezar y al terminar, con el resultado. Y si el trabajo
// revienta, deja una huella distinguible del camino normal en vez de dejar que el error se pierda.
//
// Los cuatro trabajos no tienen la misma firma: tres devuelven Promise<number> y
// `limpiarFotosAntiguas` devuelve Promise<void>. El envoltorio acepta las dos.

const hacerLog = () => {
  const info: string[] = [];
  const error: string[] = [];
  return { info, error, log: { info: (m: string) => info.push(m), error: (_o: unknown, m?: string) => error.push(m ?? '') } };
};

describe('correrRonda', () => {
  // Se exige la línea de CIERRE con su resultado, no solo que el nombre aparezca en el log.
  //
  // La primera versión afirmaba `info.some(m => /ventana/.test(m))`, y una mutación demostró que
  // eso no probaba nada: la línea de «arranca» ya trae el nombre, así que borrar el cierre dejaba
  // la prueba en verde. Justo el defecto que este envoltorio viene a arreglar.
  it('deja rastro del RESULTADO aunque el trabajo no haya hecho nada', async () => {
    const { info, log } = hacerLog();
    await correrRonda('ventana', async () => 0, log);
    expect(info.some(m => /ventana/.test(m) && /termin/.test(m) && m.includes('0'))).toBe(true);
  });

  it('dice cuánto hizo cuando sí hizo algo', async () => {
    const { info, log } = hacerLog();
    await correrRonda('ventana', async () => 37, log);
    expect(info.some(m => m.includes('37'))).toBe(true);
  });

  it('acepta un trabajo que no devuelve nada', async () => {
    const { info, log } = hacerLog();
    await correrRonda('fotos', async () => {}, log);
    expect(info.some(m => /fotos/.test(m) && /termin/.test(m))).toBe(true);
  });

  // El defecto 3: un catch que devuelve un valor neutro y sigue convierte una caída en un silencio.
  it('un fallo deja huella distinguible y no tumba el proceso', async () => {
    const { error, log } = hacerLog();
    await expect(correrRonda('ventana', async () => { throw new Error('la base no responde'); }, log))
      .resolves.toBeUndefined();
    expect(error.length).toBe(1);
    expect(error[0]).toMatch(/ventana/);
  });

  it('el fallo de un trabajo no impide que el siguiente corra', async () => {
    const { info, log } = hacerLog();
    await correrRonda('uno', async () => { throw new Error('x'); }, log);
    await correrRonda('dos', async () => 5, log);
    expect(info.some(m => /dos/.test(m) && m.includes('5'))).toBe(true);
  });

  it('funciona sin log, que es como lo llaman las pruebas y los scripts', async () => {
    const fn = vi.fn(async () => 1);
    await correrRonda('sin-log', fn);
    expect(fn).toHaveBeenCalledOnce();
  });
});
