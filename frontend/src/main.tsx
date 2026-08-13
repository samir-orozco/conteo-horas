import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Service worker: guarda los modelos de reconocimiento facial para que cada
// teléfono los baje una sola vez (ver public/sw.js). Solo intercepta /models/,
// así que no puede dejar la app pegada en una versión vieja.
//
// Se registra después de `load` para no competir por ancho de banda con el
// arranque de la página, y el fallo se ignora: si el navegador no lo soporta o
// el sitio no está en HTTPS, todo sigue funcionando como antes.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  })
}

// Banco de pruebas: en la consola, `borrarCacheModelos()` simula un teléfono
// nuevo. Antes esto se hacía forzando `cache: 'reload'` en desarrollo, pero eso
// escondía el comportamiento real (y ahora el service worker responde antes).
if (import.meta.env.DEV) {
  import('./lib/faceapi').then(m => {
    (window as unknown as Record<string, unknown>).borrarCacheModelos = m.borrarCacheModelos
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
