import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

// Captura TODO error (render de React + errores globales + promesas no manejadas)
// y lo muestra EN PANTALLA en vez de dejar la página en blanco. Temporal, para
// diagnosticar el crash del kiosco en Android: el usuario le toma foto al texto.

type State = { error: string | null; tipo: 'render' | 'global' | null };

export default class CapturadorErrores extends Component<{ children: ReactNode }, State> {
  state: State = { error: null, tipo: null };

  componentDidMount() {
    window.addEventListener('error', this.onError);
    window.addEventListener('unhandledrejection', this.onRejection);
  }
  componentWillUnmount() {
    window.removeEventListener('error', this.onError);
    window.removeEventListener('unhandledrejection', this.onRejection);
  }

  onError = (e: ErrorEvent) => {
    // "Script error." sin archivo ni línea es lo que el navegador entrega cuando
    // el que falla es un script de OTRO origen: por seguridad borra mensaje,
    // archivo, línea y stack. En esta app el único script externo es el
    // reproductor de YouTube que `VideoVSL` inyecta en la landing, y en Safari de
    // iOS lanza errores internos suyos con cierta frecuencia.
    //
    // No aporta nada —literalmente no hay información— y en cambio tapaba la
    // aplicación entera con una pantalla negra llena de texto técnico. Un fallo
    // dentro del reproductor de un video no puede tumbar HoraPro.
    if (!e.filename && (!e.message || e.message === 'Script error.')) return;
    const stack = e.error?.stack ? `\n${e.error.stack}` : '';
    this.mostrar('global', `${e.message}\n@ ${e.filename}:${e.lineno}:${e.colno}${stack}`);
  };
  onRejection = (e: PromiseRejectionEvent) => {
    const r: any = e.reason;
    // Los errores HTTP de axios (el servidor respondió 4xx/5xx) son estados
    // esperados que maneja la app —p. ej. 402 = empresa en mora, que dispara el
    // modal de pago—, no un cuelgue de la página. No los mostramos como error global.
    if (r?.isAxiosError || r?.response || r?.config) return;
    this.mostrar('global', `Promesa rechazada: ${r?.message ?? String(r)}${r?.stack ? `\n${r.stack}` : ''}`);
  };

  mostrar(tipo: 'render' | 'global', texto: string) {
    // No pisar un error de render (más grave) con uno global posterior
    if (this.state.tipo === 'render') return;
    this.setState({ tipo, error: texto });
  }

  static getDerivedStateFromError(err: any): State {
    return { tipo: 'render', error: `${err?.message ?? String(err)}${err?.stack ? `\n${err.stack}` : ''}` };
  }
  componentDidCatch(err: Error, info: ErrorInfo) {
    this.setState({ tipo: 'render', error: `${err?.message}${err?.stack ? `\n${err.stack}` : ''}\n\n-- componentes --${info.componentStack}` });
  }

  render() {
    const { error, tipo } = this.state;
    const overlay = error ? (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 999999, background: '#1b1b1b', color: '#fff',
        padding: 16, overflow: 'auto', fontFamily: 'system-ui, sans-serif',
      }}>
        <p style={{ color: '#ff6b6b', fontWeight: 800, fontSize: 18, margin: '0 0 8px' }}>⚠️ Se capturó un error ({tipo})</p>
        <pre style={{
          whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: 12, lineHeight: 1.4,
          background: '#000', padding: 12, borderRadius: 8, userSelect: 'text', margin: 0,
        }}>{error}</pre>
        <p style={{ fontSize: 12, color: '#aaa', marginTop: 8 }}>Toma una captura de este texto y envíala.</p>
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button onClick={() => location.reload()}
            style={{ background: '#FFD85E', color: '#303030', border: 0, borderRadius: 8, padding: '10px 16px', fontWeight: 700 }}>
            Recargar
          </button>
          <button onClick={() => this.setState({ error: null, tipo: null })}
            style={{ background: 'transparent', color: '#fff', border: '1px solid #555', borderRadius: 8, padding: '10px 16px' }}>
            Cerrar
          </button>
        </div>
      </div>
    ) : null;

    // Si el error fue de render, no re-montamos los hijos (evita re-crashear)
    if (tipo === 'render') return overlay;
    return (
      <>
        {this.props.children}
        {overlay}
      </>
    );
  }
}
