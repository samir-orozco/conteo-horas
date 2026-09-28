import { describe, it, expect } from 'vitest';
import { vistaDelCalendario, moverVista } from './vistaDelCalendario';
// `lunesDeLaSemana` y `sumarDias` vienen de `semana.ts`, que es OTRO módulo: comprobar la invariante
// de «empieza en lunes» con ellos no es verificar `vistaDelCalendario` consigo mismo.
import { rotuloDeSemana, lunesDeLaSemana, sumarDias } from './semana';

// DÍA, SEMANA Y MES (22 de septiembre de 2026).
//
// Pedido del dueño: «que la parte de arriba quede así, que podamos ver día, Semana y Mes».
//
// POR QUÉ ES UNA DECISIÓN Y NO UN `useState` MÁS: hoy el encabezado tiene la semana metida a mano
// en tres sitios distintos —las flechas suman ±7, el rótulo llama a `rotuloDeSemana`, y las
// columnas salen de `diasDeLaSemana`—. Con tres modos eso son tres ramas en tres lugares, o sea
// tres oportunidades de que uno se quede atrás. Se responde una vez, aquí.
//
// EL ANCLA ES CUALQUIER DÍA DENTRO DEL PERÍODO, no su primer día. Así «Hoy» es siempre `hoy` en los
// tres modos, y no hay que normalizarla desde fuera cada vez que se cambia de modo.
//
// Estas pruebas corren fijadas en América/Los Ángeles (CLAUDE.md §8.1), así que todo va sobre
// cadenas "YYYY-MM-DD" y ningún `new Date` local puede correr un día.

const MARTES = '2026-09-22';

describe('qué días muestra cada modo', () => {
  it('DÍA muestra uno solo, el del ancla', () => {
    const v = vistaDelCalendario('DIA', MARTES);
    expect(v.dias).toEqual([MARTES]);
    expect(v.desde).toBe(MARTES);
    expect(v.hasta).toBe(MARTES);
  });

  it('SEMANA arranca el lunes aunque el ancla caiga a mitad de semana', () => {
    // Lo que hace que el ancla pueda ser cualquier día. El 22 es martes; su lunes es el 21.
    const v = vistaDelCalendario('SEMANA', MARTES);
    expect(v.desde).toBe('2026-09-21');
    expect(v.dias).toHaveLength(7);
    expect(v.hasta).toBe('2026-09-27');
  });

  // EL MES SE DIBUJA CON SEMANAS COMPLETAS (28 de septiembre de 2026), del lunes anterior al día 1 al
  // domingo posterior al último. Antes iba del 1 al último y estos casos lo afirmaban; se reescriben
  // a propósito, no se arreglan de paso.
  //
  // NO ES ESTÉTICO, y esa es toda la razón: pintar un día REESCRIBE SU SEMANA ENTERA (el descanso
  // obligatorio de esa semana se recalcula). Si el mes se cortara a mitad de semana, una escritura
  // tocaría días que no están en pantalla, y el administrador no podría ver lo que acaba de cambiar.
  // El tope del backend son 62 días y el peor mes son 42 columnas (marzo de 2026), así que cabe.

  it('MES arranca el LUNES anterior al día 1, no el día 1', () => {
    // Septiembre de 2026 empieza en martes, así que la rejilla arranca el lunes 31 de agosto.
    const v = vistaDelCalendario('MES', MARTES);
    expect(v.desde).toBe('2026-08-31');
    expect(v.hasta).toBe('2026-10-04');
    expect(v.dias).toHaveLength(35);
  });

  it('y termina el DOMINGO posterior al último día', () => {
    // El 30 de septiembre es miércoles: la semana se completa hasta el domingo 4 de octubre.
    const v = vistaDelCalendario('MES', MARTES);
    expect(v.dias[v.dias.length - 1]).toBe('2026-10-04');
  });

  it('un mes que YA empieza en lunes y termina en domingo no se rellena', () => {
    // Febrero de 2027 empieza lunes y acaba domingo. Es el caso que distingue «siempre añade una
    // semana» de «añade solo lo que falta»: aquí no falta nada y son 28 columnas exactas.
    const v = vistaDelCalendario('MES', '2027-02-15');
    expect(v.desde).toBe('2027-02-01');
    expect(v.hasta).toBe('2027-02-28');
    expect(v.dias).toHaveLength(28);
  });

  it('siempre salen semanas enteras, sea cual sea el mes', () => {
    // Un mes de 31, uno de 28, uno bisiesto de 29 y el peor caso de todos. Lo que se afirma no es el
    // número exacto sino la INVARIANTE: múltiplo de siete, empieza en lunes y acaba en domingo.
    for (const ancla of ['2026-01-15', '2027-02-15', '2028-02-15', '2026-03-15', '2026-12-15']) {
      const v = vistaDelCalendario('MES', ancla);
      expect(v.dias.length % 7).toBe(0);
      expect(lunesDeLaSemana(v.desde)).toBe(v.desde);
      expect(sumarDias(v.hasta, 1)).toBe(lunesDeLaSemana(sumarDias(v.hasta, 1)));
    }
  });

  it('el mes de 42 columnas cabe en el tope de 62 días del backend', () => {
    // Marzo de 2026 empieza en domingo y acaba en martes: es el mes que más relleno necesita. Si
    // algún mes pasara de 62, la ruta devolvería un error y la vista de mes quedaría rota.
    expect(vistaDelCalendario('MES', '2026-03-15').dias).toHaveLength(42);
    for (const ancla of ['2026-01-15', '2026-03-15', '2026-08-15', '2028-02-15']) {
      expect(vistaDelCalendario('MES', ancla).dias.length).toBeLessThanOrEqual(62);
    }
  });

  it('los días van seguidos y sin huecos, y el mes entero está dentro', () => {
    const v = vistaDelCalendario('MES', MARTES);
    // Ni un día del mes se queda fuera: el relleno añade a los lados, nunca quita.
    expect(v.dias).toContain('2026-09-01');
    expect(v.dias).toContain('2026-09-30');
    for (let i = 1; i < v.dias.length; i++) {
      expect(v.dias[i]).toBe(sumarDias(v.dias[i - 1], 1));
    }
  });
});

describe('las flechas se mueven según el modo', () => {
  it('en DÍA avanzan un día', () => {
    expect(moverVista('DIA', MARTES, 1)).toBe('2026-09-23');
  });

  it('en SEMANA avanzan siete, no uno', () => {
    expect(moverVista('SEMANA', MARTES, 1)).toBe('2026-09-29');
  });

  // AL COMPARAR EL SALTO SE MIRA EL ANCLA, NO `desde` (28 de septiembre de 2026). Desde que el mes se
  // dibuja con semanas completas, `desde` es el lunes anterior al día 1 y puede ser de otro mes: el
  // 28 de septiembre para octubre. Afirmarlo contra «2026-10-01» estaría comprobando el relleno, que
  // ya tiene sus propios casos, en vez de lo que a estos les toca, que es que la flecha NO se salte
  // ningún mes. `moverVista` no cambió: sigue devolviendo el día 1 del mes vecino.
  it('en MES avanzan un mes', () => {
    expect(moverVista('MES', MARTES, 1)).toBe('2026-10-01');
  });

  it('y un mes de 31 días NO se salta el siguiente', () => {
    // El error clásico de sumar 31 días o de conservar el día del mes: del 31 de enero se llega a
    // marzo, y febrero desaparece del calendario sin que nadie lo note.
    expect(moverVista('MES', '2026-01-31', 1)).toBe('2026-02-01');
    // Y el mes al que se llega es de verdad febrero, aunque su rejilla arranque en enero.
    expect(vistaDelCalendario('MES', moverVista('MES', '2026-01-31', 1)).rotulo).toMatch(/febrero/i);
  });

  it('también se puede ir hacia atrás, y cruzando de año', () => {
    expect(moverVista('DIA', '2026-01-01', -1)).toBe('2025-12-31');
    expect(moverVista('SEMANA', '2026-01-05', -1)).toBe('2025-12-29');
    expect(moverVista('MES', '2026-01-15', -1)).toBe('2025-12-01');
  });

  it('y hacia atrás tampoco se salta el mes CORTO', () => {
    // ESTE CASO LO DESTAPÓ UNA MUTACIÓN QUE SOBREVIVIÓ (22 de septiembre de 2026), y el hueco era
    // de la prueba, no del código: el único caso hacia atrás que había escrito iba de enero a
    // diciembre, y diciembre tiene 31 días. Con eso, «restar 31 días» pasaba por correcto.
    //
    // Desde marzo se ve: restar 31 días cae en ENERO, porque febrero tiene 28. Marzo es el mes que
    // distingue, y por eso es el que hay que escribir.
    expect(moverVista('MES', '2026-03-15', -1)).toBe('2026-02-01');
    // Y desde marzo de un año bisiesto, donde febrero tiene 29.
    expect(moverVista('MES', '2028-03-15', -1)).toBe('2028-02-01');
  });
});

describe('qué dice el encabezado', () => {
  it('en SEMANA reusa el rótulo que ya existía, no escribe otro', () => {
    // La aserción que impide una segunda copia de la misma regla (CLAUDE.md §9.3).
    expect(vistaDelCalendario('SEMANA', MARTES).rotulo).toBe(rotuloDeSemana('2026-09-21'));
  });

  it('en MES nombra el mes y el año, y arranca en MAYÚSCULA', () => {
    // Es un TÍTULO, no una frase. El español escribe los meses en minúscula dentro de una oración,
    // y por eso `toLocaleDateString` devuelve «septiembre de 2026»; pero la primera letra de un
    // título va en mayúscula igual, y en un encabezado grande la minúscula se lee como descuido.
    const r = vistaDelCalendario('MES', MARTES).rotulo;
    expect(r).toMatch(/^Septiembre/);
    expect(r).toContain('2026');
  });

  it('en DÍA nombra el día concreto, también con mayúscula', () => {
    const r = vistaDelCalendario('DIA', MARTES).rotulo;
    expect(r).toMatch(/^Martes/);
    expect(r).toContain('22');
    // El mes SIGUE en minúscula cuando va en medio: la mayúscula es del título, no del mes.
    expect(r).toContain('septiembre');
  });
});
