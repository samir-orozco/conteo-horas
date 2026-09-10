// jsdom no implementa IntersectionObserver. Este simulado NO dispara nada solo:
// una prueba que quiera que algo "aparezca en pantalla" tiene que pedirlo con
// `simularVisibles`. Si disparara al observar, las pruebas no podrían comprobar
// que una miniatura fuera de la vista NO pide su foto, que es justo lo que importa.
type Callback = (entradas: IntersectionObserverEntry[], observer: IntersectionObserver) => void;

const vivos = new Set<ObservadorFalso>();

class ObservadorFalso {
  readonly root = null;
  readonly rootMargin = '0px';
  readonly thresholds = [0];
  readonly elementos = new Set<Element>();
  // Sin propiedad en el constructor: `erasableSyntaxOnly` la prohíbe, porque no
  // es sintaxis que se pueda borrar sin generar código.
  readonly callback: Callback;
  constructor(callback: Callback) { this.callback = callback; vivos.add(this); }
  observe(el: Element) { this.elementos.add(el); }
  unobserve(el: Element) { this.elementos.delete(el); }
  disconnect() { this.elementos.clear(); vivos.delete(this); }
  takeRecords(): IntersectionObserverEntry[] { return []; }
}

export function instalarObservadorFalso() {
  if (typeof window !== 'undefined' && !('IntersectionObserver' in window)) {
    (window as unknown as { IntersectionObserver: unknown }).IntersectionObserver = ObservadorFalso;
    (globalThis as unknown as { IntersectionObserver: unknown }).IntersectionObserver = ObservadorFalso;
  }
}

/** Marca como visibles los elementos observados. Sin filtro: todos. */
export function simularVisibles(filtro: (el: Element) => boolean = () => true) {
  for (const io of [...vivos]) {
    const entradas = [...io.elementos].filter(filtro).map(target => ({
      target, isIntersecting: true, intersectionRatio: 1,
    })) as unknown as IntersectionObserverEntry[];
    if (entradas.length) io.callback(entradas, io as unknown as IntersectionObserver);
  }
}

export const observadoresVivos = () => vivos.size;
