import { describe, it, expect } from 'vitest';
import { climaParaElInicio } from './climaDelInicio';

// EL CLIMA EN EL INICIO (15 de octubre de 2026). Decisiones del dueño: solo lo ve el ADMINISTRADOR; con la
// función, el clima de los últimos 7 días y los casos abiertos; sin ella, las MISMAS cifras sin nombres que la
// vista sin el plan de la página del clima, con la invitación. Lo que sale es una lista blanca: los nombres del
// resumen del panel no pueden llegar al Inicio.

const RESUMEN = {
  total: 40, personas: 12, promedio: 3.8, variacion: 0.2, jornadas: 50,
  distribucion: { 1: 2, 2: 3, 3: 10, 4: 15, 5: 10 },
  atencion: [
    { colaboradorId: 'a', nombre: 'Ana Ruiz', seguimiento: null },                                  // por abrir
    { colaboradorId: 'b', nombre: 'Luis Mora', seguimiento: { id: 's1', estado: 'SIN_REVISAR' } },   // ya abierto
    { colaboradorId: 'c', nombre: 'Caro Díaz', seguimiento: { id: 's2', estado: 'CERRADO' } },       // cerrado: no cuenta
  ],
  recientes: [{ colaboradorId: 'a', nombre: 'Ana Ruiz', observacion: 'nota' }],
};
const PRUEBA = { disponible: true, vigente: null, terminada: null, dias: 30 };
const base = { desde: '2026-10-09', hasta: '2026-10-15', resumen: RESUMEN, prueba: PRUEBA, casosAbiertosEnLaBase: 2 };

describe('climaParaElInicio', () => {
  it('el supervisor no ve nada del clima', () => {
    expect(climaParaElInicio({ ...base, esAdministrador: false, tieneClima: true })).toBeNull();
  });

  it('sin la función: las cifras sin nombres de la vista sin el plan, y la prueba', () => {
    const c = climaParaElInicio({ ...base, esAdministrador: true, tieneClima: false });
    expect(c).toEqual({
      estado: 'SIN_PLAN', desde: '2026-10-09', hasta: '2026-10-15',
      vistazo: { total: 40, personas: 12, promedio: 3.8, variacion: 0.2, jornadas: 50, atencion: 3 },
      prueba: PRUEBA,
    });
  });

  it('con la función: además el reparto de caritas y los casos abiertos, contando los que faltan por abrir', () => {
    const c = climaParaElInicio({ ...base, esAdministrador: true, tieneClima: true });
    // 2 abiertos en la base + Ana, que entró a «necesita atención» y todavía no tiene caso. Caro tiene el suyo cerrado.
    expect(c).toMatchObject({ estado: 'ACTIVO', distribucion: RESUMEN.distribucion, casosAbiertos: 3 });
  });

  it('ningún nombre ni observación sale hacia el Inicio, tenga o no la función', () => {
    for (const tieneClima of [true, false]) {
      const texto = JSON.stringify(climaParaElInicio({ ...base, esAdministrador: true, tieneClima }));
      expect(texto).not.toMatch(/Ana|Luis|Caro|nombre|observacion|nota/);
    }
  });
});
