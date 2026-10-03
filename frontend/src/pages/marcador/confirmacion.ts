import { MIN_MARCA_RECIENTE, minutosEntre } from '../../lib/marcaReciente';
import { horaDoce } from '../../lib/fechas';
import type { Estado } from './tipos';

// CUÁNTO HAY QUE SOSTENER EL BOTÓN DE MARCAR, Y QUÉ SE AVISA (2 de octubre de 2026).
//
// Toda marca se confirma sosteniendo el botón, que lleva el nombre de la persona:
// un toque ya no basta, porque al nombre de arriba no lo mira nadie. Lo normal es
// 0,8 segundos. La reforzada —1,6 segundos y un aviso en ámbar— es para cuando algo
// no cuadra, y es rara a propósito: si saliera siempre, a la semana la gente la
// sostendría sin leer, igual que hoy oprime sin leer.
//
// Por qué estos dos motivos, con el caso del 1 de octubre: una persona sin rostro
// registrado entró como Lina a las 08:49 con una distancia de 0,464. A las 08:52
// llegó Lina, el kiosco la reconoció bien y le ofreció «Registrar Salida». A la
// primera la habría frenado el parecido dudoso; a Lina, la hora.
//
// 0,8 y 1,6 segundos desde el 3 de octubre de 2026. Empezó en 1,5 y 3, y el dueño, al
// probarlo, sintió largos esos y después también 1 y 2. Por debajo de unos 0,7 s se vuelve un
// toque lento que se hace sin mirar, que es lo que este botón existe para evitar: más corto que
// esto ya no conviene. La reforzada sigue durando el doble, para que se note cuando algo no cuadra.
export const MS_CONFIRMAR = 800;
export const MS_CONFIRMAR_REFORZADA = 1600;

export type Confirmacion =
  | { nivel: 'NORMAL'; ms: number }
  // Va a salir a los pocos minutos de su entrada: ¿la entrada fue suya?
  | { nivel: 'REFORZADA'; ms: number; motivo: 'SALIDA_RECIEN_ENTRADA'; entrada: string; minutos: number }
  // La cara se pareció poco a su registro. El aviso no dice a quién más se parece.
  | { nivel: 'REFORZADA'; ms: number; motivo: 'PARECIDO_DUDOSO' };

export function confirmacionDeLaMarca({ estado, ahora, parecidoDudoso }: {
  estado: Estado | null; ahora: Date; parecidoDudoso: boolean;
}): Confirmacion {
  // La hora gana sobre el parecido: es lo único que la persona puede comprobar
  // por sí misma («yo no entré a las 08:49»).
  const entrada = estado?.dentroAhora ? estado.entradaAbierta?.entrada : undefined;
  if (entrada) {
    const minutos = minutosEntre(entrada, ahora);
    if (minutos >= 0 && minutos < MIN_MARCA_RECIENTE) {
      return { nivel: 'REFORZADA', ms: MS_CONFIRMAR_REFORZADA, motivo: 'SALIDA_RECIEN_ENTRADA', entrada, minutos };
    }
  }
  if (parecidoDudoso) return { nivel: 'REFORZADA', ms: MS_CONFIRMAR_REFORZADA, motivo: 'PARECIDO_DUDOSO' };
  return { nivel: 'NORMAL', ms: MS_CONFIRMAR };
}

export function textoDeHace(minutos: number): string {
  if (minutos < 1) return 'hace menos de un minuto';
  return minutos === 1 ? 'hace 1 minuto' : `hace ${minutos} minutos`;
}

// QUÉ DICE EL AVISO DE LA REFORZADA. Un caso por motivo y un `default` que no
// compila si llega uno nuevo sin su texto (CLAUDE.md §9.4).
//
// El del parecido no dice A QUIÉN más se parece la cara: le contaría algo de la
// cara de un compañero a quien está al frente. Y si la ficha no tiene foto, no
// pide «mirar las fotos»: solo hay una.
export function textoDelAviso(
  c: Extract<Confirmacion, { nivel: 'REFORZADA' }>,
  persona: { nombre: string; nombreCompleto: string; hayFotoDeFicha: boolean },
): { titulo: string; detalle: string } {
  switch (c.motivo) {
    case 'SALIDA_RECIEN_ENTRADA':
      return {
        titulo: `Tu entrada figura a las ${horaDoce(c.entrada)}, ${textoDeHace(c.minutos)}.`,
        detalle: 'Si no marcaste a esa hora, no registres nada y avísale a tu administrador.',
      };
    case 'PARECIDO_DUDOSO':
      // La pantalla ya pregunta «¿Eres tú, X?» en grande; el aviso dice qué mirar.
      return {
        titulo: persona.hayFotoDeFicha ? 'Mira bien la foto antes de marcar.' : 'Revisa que el nombre sea el tuyo antes de marcar.',
        detalle: `Si no eres tú, toca «No soy ${persona.nombre}».`,
      };
    default: {
      const nuevo: never = c;
      return nuevo;
    }
  }
}

// LO QUE DICE DEBAJO DEL BOTÓN (diseño del dueño, 3 de octubre de 2026). Redondeado al
// segundo: «0,8 segundos» es un número que nadie cuenta, y lo que importa es que no es un toque.
export function textoDelSostenido(ms: number): string {
  const segundos = Math.max(1, Math.round(ms / 1000));
  return `Mantén presionado durante ${segundos} ${segundos === 1 ? 'segundo' : 'segundos'}`;
}
