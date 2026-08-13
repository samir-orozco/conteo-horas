// Service worker de HoraPro. Su ÚNICO trabajo es guardar los modelos de
// reconocimiento facial (~6,7 MB) para que cada teléfono los baje una sola vez
// en su vida.
//
// Por qué hace falta si el servidor ya manda Cache-Control de un año: la caché
// HTTP de un móvil es pequeña y se desaloja sola. 6,7 MB son de los primeros en
// caer, y entonces el trabajador vuelve a esperar la descarga completa en la
// puerta. Cache Storage no se desaloja igual: dura hasta que el usuario borra
// los datos del sitio.
//
// DELIBERADAMENTE no cachea el HTML ni el JS de la aplicación. Solo /models/.
// Así este archivo no puede dejar la app pegada en una versión vieja, que es el
// accidente clásico de los service workers. Si algún día se quiere kiosco sin
// conexión, es una decisión aparte y con su propia estrategia de actualización.

const CACHE = 'horapro-modelos-v1';
const RUTA = '/models/';

self.addEventListener('install', () => {
  // Entra en servicio de una vez, sin esperar a que se cierren las pestañas
  // viejas: no hay nada que pueda romper porque solo toca /models/.
  self.skipWaiting();
});

self.addEventListener('activate', (evento) => {
  evento.waitUntil((async () => {
    // Al subir la versión del modelo, se borra la caché anterior.
    const nombres = await caches.keys();
    await Promise.all(
      nombres
        .filter(n => n.startsWith('horapro-modelos-') && n !== CACHE)
        .map(n => caches.delete(n)),
    );
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (evento) => {
  const peticion = evento.request;
  if (peticion.method !== 'GET') return;

  let url;
  try { url = new URL(peticion.url); } catch { return; }
  if (url.origin !== self.location.origin) return;
  if (!url.pathname.startsWith(RUTA)) return; // todo lo demás va directo a la red

  evento.respondWith((async () => {
    // Todo el camino de caché va protegido: en modo privado, con el
    // almacenamiento lleno o con la cuota agotada, `caches` lanza. Si eso
    // tumbara la petición, el reconocimiento facial dejaría de funcionar por
    // culpa de una optimización. Ante cualquier problema se sirve de la red,
    // que es exactamente como se comportaba antes de existir este archivo.
    try {
      const cache = await caches.open(CACHE);
      const guardado = await cache.match(peticion, { ignoreVary: true });
      if (guardado) return guardado;

      const respuesta = await fetch(peticion);
      // Solo se guarda una respuesta completa y sana. Un 206 o un error no se
      // cachean: quedaría un modelo corrupto y el reconocimiento fallaría para
      // siempre en ese teléfono, que es peor que volver a descargarlo.
      if (respuesta && respuesta.status === 200 && respuesta.type === 'basic') {
        cache.put(peticion, respuesta.clone()).catch(() => {});
      }
      return respuesta;
    } catch {
      return fetch(peticion);
    }
  })());
});

// Permite a la app vaciar la caché de modelos (banco de pruebas: simular un
// teléfono nuevo sin tener que borrar los datos del sitio a mano).
self.addEventListener('message', (evento) => {
  if (evento.data === 'borrar-modelos') {
    evento.waitUntil(caches.delete(CACHE));
  }
});
