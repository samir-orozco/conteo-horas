// QUÉ SE LE PONE DELANTE AL SUPERVISOR EN LA PANTALLA DE REVISIÓN, Y EN QUÉ ORDEN.
//
// El problema que resuelve: alguien marca mostrando la foto de un compañero en
// la pantalla de un celular. Eso no lo detecta ningún dato que guardemos, lo
// detecta el ojo de una persona al ver el brillo de la pantalla, el filo del
// bisel o la mano que lo sostiene. Este módulo no detecta nada: decide qué
// momentos existen, en qué orden se recorren, y marca la única señal fiable.
//
// NO HAY ORDEN POR SOSPECHA, Y ES UNA DECISIÓN TOMADA, NO UN OLVIDO.
// Se diseñó, se revisó y se descartó, por dos razones que se sostienen solas:
//
//   1. El fraude que se busca produce una marcación que se ve PERFECTA:
//      `metodoEntrada = ROSTRO` y una distancia baja y buena, porque el
//      reconocedor sí hizo match. Ese es justamente el motivo por el que el
//      truco funciona. Cualquier puntaje armado con estos datos pondría el
//      fraude real de último en la cola.
//   2. `CEDULA` no significa «esquivó la cámara». El botón de la cédula solo
//      aparece tras `SEG_FALLBACK_CEDULA` = 8 segundos de que la cámara no
//      reconoce a la persona (`frontend/.../rostroCliente.ts:13`). O sea que
//      señala al de gafas, al que le da el sol de frente y al que quedó mal
//      enrolado, todos los días y siempre a los mismos. Y encima castiga a quien
//      ejerce un derecho que la propia política de privacidad declara
//      facultativo en su punto 5.1.
//
// Un orden falso es PEOR que ninguno: el supervisor confía en él y deja de mirar
// lo de abajo, que es exactamente donde estaría el fraude. Por eso el orden es
// cronológico, que es como ocurrió el día y como se lee sin pensar.

export type Momento = 'entrada' | 'salida';
export type EstadoMetodo = 'ROSTRO' | 'CEDULA' | 'MANUAL' | 'SIN_DATO';

// Un caso por valor y un `default` explícito, aunque hoy el enum tenga tres:
// la regla 9.4 salió de un `? :` sobre un conjunto abierto que reventó al llegar
// el tercer caso. `SIN_DATO` significa NO SE SABE, nunca «cédula»: son las
// marcaciones anteriores a que se midiera el método, y las de sesiones abiertas
// antes del despliegue, que duran 12 horas.
export function estadoDeMetodo(v: unknown): EstadoMetodo {
  switch (v) {
    case 'ROSTRO': return 'ROSTRO';
    case 'CEDULA': return 'CEDULA';
    case 'MANUAL': return 'MANUAL';
    default: return 'SIN_DATO';
  }
}

export type FilaDeRevision = {
  id: string; colaboradorId: string; sedeId: string | null;
  entrada: Date | null; salida: Date | null;
  entradaEstimada: boolean; salidaEstimada: boolean;
  metodoEntrada: string | null; metodoSalida: string | null;
  distanciaEntrada: number | null; distanciaSalida: number | null;
  tieneFotoEntrada: boolean; tieneFotoSalida: boolean;
};

// Lo que viaja al navegador. FÍJATE EN LO QUE NO ESTÁ: la distancia cruda. Es el
// resultado de un cotejo biométrico, y la política publicada afirma que los
// datos biométricos no se exponen en los listados del sistema. Viaja la señal
// (`distanciaRepetida`), nunca el número.
export type EventoDeRevision = {
  clave: string; registroId: string; momento: Momento;
  colaboradorId: string; sedeId: string | null; hora: Date;
  metodo: EstadoMetodo; tieneFoto: boolean;
  laPusoElSistema: boolean; distanciaRepetida: boolean;
};

// La única señal que sí vale: la misma distancia, idéntica, dos veces en la
// misma persona.
//
// Dos capturas vivas no dan nunca el mismo número, así que un valor repetido al
// milímetro es la huella de un descriptor copiado del inspector y reenviado. Es
// PRUEBA y no sospecha, y detecta un ataque DISTINTO al de la foto en el celular.
//
// Se cuenta por persona a propósito: copiar un descriptor es copiar el de
// alguien concreto. Cruzar personas inventaría una relación que no existe y
// gastaría en ruido la única señal fiable que hay.
function clavesConDistanciaRepetida(filas: FilaDeRevision[]): Set<string> {
  const vistas = new Map<string, string[]>(); // `${colaboradorId}|${distancia}` -> claves
  const anotar = (colaboradorId: string, distancia: number | null, clave: string) => {
    if (distancia === null) return;
    const k = `${colaboradorId}|${distancia}`;
    vistas.set(k, [...(vistas.get(k) ?? []), clave]);
  };
  for (const f of filas) {
    if (f.entrada) anotar(f.colaboradorId, f.distanciaEntrada, `${f.id}:entrada`);
    if (f.salida) anotar(f.colaboradorId, f.distanciaSalida, `${f.id}:salida`);
  }
  const repetidas = new Set<string>();
  for (const claves of vistas.values()) {
    if (claves.length > 1) for (const c of claves) repetidas.add(c);
  }
  return repetidas;
}

// Una fila de `registros` guarda DOS momentos, cada uno con su foto y su método.
// La unidad de revisión es el momento y no la fila: el fraude ocurre al marcar.
//
// Un momento sin hora no es un evento. Un turno abierto no tiene salida, y eso
// no es «una salida sin foto» sino una salida que todavía no ocurrió.
export function eventosDeRevision(filas: FilaDeRevision[]): EventoDeRevision[] {
  const repetidas = clavesConDistanciaRepetida(filas);
  const eventos: EventoDeRevision[] = [];

  for (const f of filas) {
    const momentos: { momento: Momento; hora: Date | null; metodo: string | null; foto: boolean; estimada: boolean }[] = [
      { momento: 'entrada', hora: f.entrada, metodo: f.metodoEntrada, foto: f.tieneFotoEntrada, estimada: f.entradaEstimada },
      { momento: 'salida', hora: f.salida, metodo: f.metodoSalida, foto: f.tieneFotoSalida, estimada: f.salidaEstimada },
    ];
    for (const m of momentos) {
      if (!m.hora) continue;
      const clave = `${f.id}:${m.momento}`;
      eventos.push({
        clave, registroId: f.id, momento: m.momento,
        colaboradorId: f.colaboradorId, sedeId: f.sedeId, hora: m.hora,
        metodo: estadoDeMetodo(m.metodo),
        tieneFoto: m.foto,
        laPusoElSistema: m.estimada,
        distanciaRepetida: repetidas.has(clave),
      });
    }
  }

  // Del más reciente al más viejo: es el orden en que alguien revisa un día.
  return eventos.sort((a, b) => b.hora.getTime() - a.hora.getTime());
}
