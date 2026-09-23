import { describe, it, expect } from 'vitest';
import { vistaDelCalendario, moverVista } from './vistaDelCalendario';
import { rotuloDeSemana } from './semana';

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

  it('MES arranca el día 1 aunque el ancla sea el 22', () => {
    const v = vistaDelCalendario('MES', MARTES);
    expect(v.desde).toBe('2026-09-01');
    expect(v.hasta).toBe('2026-09-30');
    expect(v.dias).toHaveLength(30);
  });

  it('y cada mes dura lo suyo, también en año bisiesto', () => {
    // Un mes de 31, uno de 28 y uno de 29. Con un «31» fijo, dos de estos tres se caen.
    expect(vistaDelCalendario('MES', '2026-01-15').dias).toHaveLength(31);
    expect(vistaDelCalendario('MES', '2027-02-15').dias).toHaveLength(28);
    expect(vistaDelCalendario('MES', '2028-02-15').dias).toHaveLength(29);
  });

  it('`hasta` es el ÚLTIMO día mostrado, no el primero del siguiente', () => {
    // La ruta lo quiere inclusive. Pasarle el 1 de octubre pediría 31 días y pintaría una columna
    // que no es de este mes.
    expect(vistaDelCalendario('MES', '2026-01-15').hasta).toBe('2026-01-31');
    expect(vistaDelCalendario('MES', '2026-12-15').hasta).toBe('2026-12-31');
  });

  it('los días van seguidos y sin huecos', () => {
    const v = vistaDelCalendario('MES', MARTES);
    expect(v.dias[0]).toBe('2026-09-01');
    expect(v.dias[v.dias.length - 1]).toBe('2026-09-30');
  });
});

describe('las flechas se mueven según el modo', () => {
  it('en DÍA avanzan un día', () => {
    expect(moverVista('DIA', MARTES, 1)).toBe('2026-09-23');
  });

  it('en SEMANA avanzan siete, no uno', () => {
    expect(moverVista('SEMANA', MARTES, 1)).toBe('2026-09-29');
  });

  it('en MES avanzan un mes', () => {
    expect(vistaDelCalendario('MES', moverVista('MES', MARTES, 1)).desde).toBe('2026-10-01');
  });

  it('y un mes de 31 días NO se salta el siguiente', () => {
    // El error clásico de sumar 31 días o de conservar el día del mes: del 31 de enero se llega a
    // marzo, y febrero desaparece del calendario sin que nadie lo note.
    expect(vistaDelCalendario('MES', moverVista('MES', '2026-01-31', 1)).desde).toBe('2026-02-01');
  });

  it('también se puede ir hacia atrás, y cruzando de año', () => {
    expect(moverVista('DIA', '2026-01-01', -1)).toBe('2025-12-31');
    expect(moverVista('SEMANA', '2026-01-05', -1)).toBe('2025-12-29');
    expect(vistaDelCalendario('MES', moverVista('MES', '2026-01-15', -1)).desde).toBe('2025-12-01');
  });

  it('y hacia atrás tampoco se salta el mes CORTO', () => {
    // ESTE CASO LO DESTAPÓ UNA MUTACIÓN QUE SOBREVIVIÓ (22 de septiembre de 2026), y el hueco era
    // de la prueba, no del código: el único caso hacia atrás que había escrito iba de enero a
    // diciembre, y diciembre tiene 31 días. Con eso, «restar 31 días» pasaba por correcto.
    //
    // Desde marzo se ve: restar 31 días cae en ENERO, porque febrero tiene 28. Marzo es el mes que
    // distingue, y por eso es el que hay que escribir.
    expect(vistaDelCalendario('MES', moverVista('MES', '2026-03-15', -1)).desde).toBe('2026-02-01');
    // Y desde marzo de un año bisiesto, donde febrero tiene 29.
    expect(vistaDelCalendario('MES', moverVista('MES', '2028-03-15', -1)).desde).toBe('2028-02-01');
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
