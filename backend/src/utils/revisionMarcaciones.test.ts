import { describe, it, expect } from 'vitest';
import { estadoDeMetodo, eventosDeRevision, type FilaDeRevision } from './revisionMarcaciones';

// LO QUE ALIMENTA LA PANTALLA DE REVISIÓN DE MARCACIONES.
//
// Un supervisor recorre las marcaciones del día viendo una foto a la vez, para
// detectar a alguien marcando con la foto de un compañero en la pantalla de un
// celular. El detector es el ojo; esto solo decide QUÉ se le pone delante y en
// qué orden.
//
// NO HAY ORDEN POR SOSPECHA, Y ES UNA DECISIÓN, NO UN OLVIDO. El fraude que se
// busca produce una marcación que se ve perfecta: `metodoEntrada = ROSTRO` y una
// distancia buena, porque el reconocedor SÍ hizo match, que es justo por lo que
// el truco funciona. Cualquier puntaje construido con estos datos pondría el
// fraude de último. Y `CEDULA` no significa «esquivó la cámara»: el botón solo
// aparece tras 8 segundos de que la cámara no reconoce
// (`rostroCliente.ts:13`), así que señalaría todos los días a la misma gente
// inocente, y encima castigaría a quien ejerce un derecho que la propia política
// declara facultativo. Un orden falso es peor que ninguno: el supervisor confía
// y deja de mirar lo de abajo, que es donde estaría el fraude.
//
// LA ÚNICA SEÑAL QUE SÍ VALE es la distancia repetida al milímetro. Dos capturas
// vivas nunca dan el mismo número, así que un valor idéntico es la huella de un
// descriptor copiado y reenviado. Es prueba, no sospecha, y detecta OTRO ataque.

// Un instante en hora de Bogotá (UTC-5 todo el año), en UTC explícito: la suite
// corre en America/Los_Angeles a propósito (sección 8.1).
const bog = (d: number, h: number, min = 0) =>
  new Date(Date.UTC(2026, 8, d, h + 5, min, 0));

const fila = (p: Partial<FilaDeRevision> & { id: string }): FilaDeRevision => ({
  colaboradorId: 'c1', sedeId: null,
  entrada: null, salida: null,
  entradaEstimada: false, salidaEstimada: false,
  metodoEntrada: null, metodoSalida: null,
  distanciaEntrada: null, distanciaSalida: null,
  tieneFotoEntrada: false, tieneFotoSalida: false,
  ...p,
});

describe('cómo se lee el método guardado', () => {
  it('reconoce los tres valores del enum', () => {
    expect(estadoDeMetodo('ROSTRO')).toBe('ROSTRO');
    expect(estadoDeMetodo('CEDULA')).toBe('CEDULA');
    expect(estadoDeMetodo('MANUAL')).toBe('MANUAL');
  });

  it('lo que no reconoce es SIN_DATO, no una suposición', () => {
    // El null de la base significa «no se sabe», nunca «cédula». Son las
    // marcaciones anteriores a que se midiera el método, y las de sesiones
    // abiertas antes del despliegue, que duran 12 horas.
    for (const v of [null, undefined, '', 'rostro', 'OTRO', 0, {}]) {
      expect(estadoDeMetodo(v)).toBe('SIN_DATO');
    }
  });
});

describe('qué marcaciones se le ponen delante al supervisor', () => {
  it('una fila con entrada y salida son DOS eventos, cada uno con lo suyo', () => {
    // La unidad no es la fila sino el momento: el fraude ocurre al marcar, y
    // cada momento tiene su propia foto y su propio método.
    const ev = eventosDeRevision([fila({
      id: 'r1', entrada: bog(9, 8), salida: bog(9, 17),
      metodoEntrada: 'ROSTRO', metodoSalida: 'CEDULA',
      tieneFotoEntrada: true, tieneFotoSalida: false,
    })]);
    expect(ev).toHaveLength(2);
    expect(ev.map(e => e.clave)).toEqual(['r1:salida', 'r1:entrada']);
    expect(ev.map(e => e.metodo)).toEqual(['CEDULA', 'ROSTRO']);
    expect(ev.map(e => e.tieneFoto)).toEqual([false, true]);
  });

  it('un momento sin hora no es un evento', () => {
    // Un turno abierto no tiene salida. Eso no es «una salida sin foto», es una
    // salida que todavía no ocurrió, y meterla ensuciaría el recorrido.
    expect(eventosDeRevision([fila({ id: 'r1', entrada: bog(9, 8) })])).toHaveLength(1);
    expect(eventosDeRevision([fila({ id: 'r1' })])).toHaveLength(0);
  });

  it('van del más reciente al más viejo', () => {
    const ev = eventosDeRevision([
      fila({ id: 'r1', entrada: bog(9, 8) }),
      fila({ id: 'r2', entrada: bog(9, 14) }),
      fila({ id: 'r3', entrada: bog(9, 11) }),
    ]);
    expect(ev.map(e => e.registroId)).toEqual(['r2', 'r3', 'r1']);
  });

  it('la marca que puso el sistema va rotulada, no escondida', () => {
    // El auto-cierre pone salidas que nadie marcó. No tienen foto y no hay nada
    // que revisar en ellas, pero esconderlas haría ver el día completo cuando no
    // lo está, y quien audita necesita saber por qué falta esa foto.
    const [e] = eventosDeRevision([fila({
      id: 'r1', salida: bog(9, 22), salidaEstimada: true,
    })]);
    expect(e.laPusoElSistema).toBe(true);
    expect(e.tieneFoto).toBe(false);
  });

  it('LA SEÑAL: la misma distancia repetida en la misma persona se marca', () => {
    // Dos capturas vivas no dan el mismo número. Idéntico dos veces es un
    // descriptor copiado y reenviado.
    const ev = eventosDeRevision([
      fila({ id: 'r1', colaboradorId: 'c1', entrada: bog(9, 8), metodoEntrada: 'ROSTRO', distanciaEntrada: 0.31415 }),
      fila({ id: 'r2', colaboradorId: 'c1', entrada: bog(9, 9), metodoEntrada: 'ROSTRO', distanciaEntrada: 0.31415 }),
    ]);
    // El largo se afirma primero a propósito: `[].every(...)` es `true`, así que
    // sin esta línea la prueba pasaría con la función devolviendo lista vacía.
    expect(ev).toHaveLength(2);
    expect(ev.every(e => e.distanciaRepetida)).toBe(true);
  });

  it('una distancia que aparece una sola vez NO se marca', () => {
    const ev = eventosDeRevision([
      fila({ id: 'r1', colaboradorId: 'c1', entrada: bog(9, 8), metodoEntrada: 'ROSTRO', distanciaEntrada: 0.31 }),
      fila({ id: 'r2', colaboradorId: 'c1', entrada: bog(9, 9), metodoEntrada: 'ROSTRO', distanciaEntrada: 0.42 }),
    ]);
    expect(ev).toHaveLength(2);
    expect(ev.some(e => e.distanciaRepetida)).toBe(false);
  });

  it('la misma distancia en personas DISTINTAS no se marca', () => {
    // La copia de un descriptor es de una persona concreta. Cruzar personas
    // inventaría una relación que no existe y gastaría la única señal fiable en
    // ruido.
    const ev = eventosDeRevision([
      fila({ id: 'r1', colaboradorId: 'c1', entrada: bog(9, 8), metodoEntrada: 'ROSTRO', distanciaEntrada: 0.31415 }),
      fila({ id: 'r2', colaboradorId: 'c2', entrada: bog(9, 9), metodoEntrada: 'ROSTRO', distanciaEntrada: 0.31415 }),
    ]);
    expect(ev).toHaveLength(2);
    expect(ev.some(e => e.distanciaRepetida)).toBe(false);
  });

  it('la señal cruza entrada y salida de la misma persona', () => {
    // Reenviar el mismo descriptor sirve igual para entrar que para salir.
    const ev = eventosDeRevision([fila({
      id: 'r1', colaboradorId: 'c1', entrada: bog(9, 8), salida: bog(9, 17),
      metodoEntrada: 'ROSTRO', metodoSalida: 'ROSTRO',
      distanciaEntrada: 0.2718, distanciaSalida: 0.2718,
    })]);
    expect(ev).toHaveLength(2);
    expect(ev.every(e => e.distanciaRepetida)).toBe(true);
  });

  it('sin distancia no hay señal, aunque el método sea ROSTRO', () => {
    const ev = eventosDeRevision([
      fila({ id: 'r1', colaboradorId: 'c1', entrada: bog(9, 8), metodoEntrada: 'ROSTRO', distanciaEntrada: null }),
      fila({ id: 'r2', colaboradorId: 'c1', entrada: bog(9, 9), metodoEntrada: 'ROSTRO', distanciaEntrada: null }),
    ]);
    expect(ev).toHaveLength(2);
    expect(ev.some(e => e.distanciaRepetida)).toBe(false);
  });

  it('NINGÚN evento trae la distancia cruda', () => {
    // Es el resultado de un cotejo biométrico. La política dice que los datos
    // biométricos no se exponen en los listados: viaja la señal, nunca el número.
    const ev = eventosDeRevision([fila({
      id: 'r1', entrada: bog(9, 8), metodoEntrada: 'ROSTRO', distanciaEntrada: 0.31415,
    })]);
    expect(JSON.stringify(ev)).not.toContain('0.31415');
    expect(ev[0]).not.toHaveProperty('distancia');
    expect(ev[0]).not.toHaveProperty('distanciaEntrada');
  });
});
