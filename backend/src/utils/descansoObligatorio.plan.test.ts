import { describe, it, expect } from 'vitest';
import { descansosPlanificadosPorSemana } from './descansoObligatorio';

// EL PLAN DE CADA SEMANA, PARA UN RANGO DE MUCHAS (22 de septiembre de 2026).
//
// La pieza 2 arregló el pintado: al pintar un descanso, su semana se reescribe. Falta el otro
// camino, y es el que muerde en silencio: `materializarColaborador` recorre hasta 60 días y escribe
// `esDescanso` día por día pasando `null` como plan. Cuando alguien cambia un horario, esa
// regeneración corre con `pisarExistentes` y devuelve al DOMINGO las filas AUTO de una semana que
// ya estaba planificada con otro día. Nadie se entera: no falla nada, solo cambia un recargo.
//
// Las dos mitades de la respuesta ya están probadas: `rangoSemanaBogota` dice a qué semana
// pertenece un día, y `descansoDeLaSemana` dice qué día lleva el descanso en una. Lo que se prueba
// aquí es la UNIÓN, que es donde un error aplicaría el plan de una semana a la de al lado.
//
// La clave del mapa es el LUNES de la semana en formato "YYYY-MM-DD". Una semana SIN plan (cero
// turnos de descanso) o AMBIGUA (dos o más) simplemente NO ENTRA: quien pregunta recibe `undefined`
// y pasa `null`, que hace caer al domingo. Es la dirección segura, y así la regla de ambigüedad no
// se escribe dos veces.

const bog = (iso: string) => new Date(`${iso}T05:00:00.000Z`);
const dia = (iso: string, descansoMarcado = false) => ({ fecha: bog(iso), descansoMarcado });

describe('descansosPlanificadosPorSemana', () => {
  it('una semana con el descanso en miércoles queda indexada por su lunes', () => {
    const mapa = descansosPlanificadosPorSemana([
      dia('2026-09-21'), dia('2026-09-22'), dia('2026-09-23', true),
      dia('2026-09-24'), dia('2026-09-25'), dia('2026-09-26'), dia('2026-09-27'),
    ]);
    expect(mapa.get('2026-09-21')).toBe('MIERCOLES');
    expect(mapa.size).toBe(1);
  });

  it('el DOMINGO cuenta para la semana que empezó, no para la siguiente', () => {
    // Si el domingo se fuera a la semana de al lado, su descanso quedaría indexado bajo un lunes
    // que no es el suyo y se aplicaría a siete días equivocados.
    const mapa = descansosPlanificadosPorSemana([dia('2026-09-27', true)]);
    expect(mapa.get('2026-09-21')).toBe('DOMINGO');
    expect(mapa.has('2026-09-28')).toBe(false);
  });

  it('varias semanas, cada una con el suyo', () => {
    const mapa = descansosPlanificadosPorSemana([
      dia('2026-09-23', true),  // semana del 21
      dia('2026-10-01', true),  // semana del 28 (jueves)
      dia('2026-10-05', true),  // semana del 5 (lunes)
    ]);
    expect(mapa.get('2026-09-21')).toBe('MIERCOLES');
    expect(mapa.get('2026-09-28')).toBe('JUEVES');
    expect(mapa.get('2026-10-05')).toBe('LUNES');
    expect(mapa.size).toBe(3);
  });

  it('una semana AMBIGUA no entra en el mapa', () => {
    // Dos descansos pintados en la misma semana es un error de planificación. Elegir uno dejaría al
    // otro como día ordinario, y si ese otro era el domingo le quitaría el recargo.
    const mapa = descansosPlanificadosPorSemana([
      dia('2026-09-23', true), dia('2026-09-27', true),
    ]);
    expect(mapa.has('2026-09-21')).toBe(false);
    expect(mapa.size).toBe(0);
  });

  it('una semana ambigua no contamina a las demás', () => {
    const mapa = descansosPlanificadosPorSemana([
      dia('2026-09-23', true), dia('2026-09-27', true),  // semana del 21: ambigua
      dia('2026-10-01', true),                            // semana del 28: clara
    ]);
    expect(mapa.has('2026-09-21')).toBe(false);
    expect(mapa.get('2026-09-28')).toBe('JUEVES');
  });

  it('una semana sin ningún turno de descanso no entra', () => {
    const mapa = descansosPlanificadosPorSemana([dia('2026-09-23'), dia('2026-09-24')]);
    expect(mapa.size).toBe(0);
  });

  it('los días pueden llegar desordenados', () => {
    // Vienen de una consulta; el orden no se puede suponer.
    const mapa = descansosPlanificadosPorSemana([
      dia('2026-09-27'), dia('2026-09-23', true), dia('2026-09-21'),
    ]);
    expect(mapa.get('2026-09-21')).toBe('MIERCOLES');
  });

  it('una semana que cruza el cambio de mes se agrupa por su lunes', () => {
    // Lunes 28 de septiembre a domingo 4 de octubre. La clave es de septiembre aunque el descanso
    // caiga en octubre.
    const mapa = descansosPlanificadosPorSemana([dia('2026-10-02', true)]);
    expect(mapa.get('2026-09-28')).toBe('VIERNES');
  });

  it('una lista vacía da un mapa vacío, no un error', () => {
    expect(descansosPlanificadosPorSemana([]).size).toBe(0);
  });
});
