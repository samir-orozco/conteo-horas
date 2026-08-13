import { useEffect, useRef, useState } from 'react';
import { Play, Pause, Volume2, VolumeX } from 'lucide-react';

// Reproductor tipo VSL sobre YouTube: SIN barra de progreso; solo play/pausa y
// volumen. Usa la IFrame API de YouTube con los controles nativos apagados y
// controles propios encima, para que no se pueda adelantar el video.
export default function VideoVSL({ videoId }: { videoId: string }) {
  const contRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const [listo, setListo] = useState(false);
  const [iniciado, setIniciado] = useState(false); // ya se dio el primer play
  const [reproduciendo, setReproduciendo] = useState(false);
  const [silenciado, setSilenciado] = useState(false);
  const [volumen, setVolumen] = useState(100);

  useEffect(() => {
    let destruido = false;
    const crear = () => {
      const YT = (window as any).YT;
      if (destruido || !contRef.current || !YT?.Player) return;
      playerRef.current = new YT.Player(contRef.current, {
        videoId,
        width: '100%',
        height: '100%',
        playerVars: {
          controls: 0, modestbranding: 1, rel: 0, disablekb: 1,
          playsinline: 1, fs: 0, iv_load_policy: 3,
        },
        events: {
          onReady: () => setListo(true),
          onStateChange: (e: any) => setReproduciendo(e.data === YT.PlayerState.PLAYING),
        },
      });
    };

    const YT = (window as any).YT;
    if (YT?.Player) {
      crear();
    } else {
      if (!document.getElementById('yt-iframe-api')) {
        const tag = document.createElement('script');
        tag.id = 'yt-iframe-api';
        tag.src = 'https://www.youtube.com/iframe_api';
        document.body.appendChild(tag);
      }
      const prev = (window as any).onYouTubeIframeAPIReady;
      (window as any).onYouTubeIframeAPIReady = () => { prev?.(); crear(); };
    }

    return () => { destruido = true; try { playerRef.current?.destroy?.(); } catch { /* ya destruido */ } };
  }, [videoId]);

  const iniciar = () => {
    const p = playerRef.current;
    setIniciado(true);
    if (p) { if (silenciado) { p.unMute(); setSilenciado(false); } p.playVideo(); }
  };
  const togglePlay = () => {
    const p = playerRef.current; if (!p) return;
    if (reproduciendo) p.pauseVideo();
    else { if (silenciado) { p.unMute(); setSilenciado(false); } p.playVideo(); }
  };
  const toggleMute = () => {
    const p = playerRef.current; if (!p) return;
    if (silenciado) { p.unMute(); p.setVolume(volumen || 100); setSilenciado(false); }
    else { p.mute(); setSilenciado(true); }
  };
  const cambiarVolumen = (v: number) => {
    setVolumen(v);
    const p = playerRef.current; if (!p) return;
    p.setVolume(v);
    if (v === 0) { p.mute(); setSilenciado(true); }
    else if (silenciado) { p.unMute(); setSilenciado(false); }
  };

  return (
    <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-ink shadow-xl">
      {/* El iframe se agranda y se recorta con overflow-hidden para esconder el
          título y el "Mirar en YouTube". Sin eventos: la interacción pasa por nuestros controles. */}
      <div className="absolute inset-0 pointer-events-none" style={{ transform: 'scale(1.35)' }}>
        <div ref={contRef} className="w-full h-full" />
      </div>

      {/* Portada propia (miniatura del video): tapa el estado inicial de YouTube
          y su botón rojo. Al hacer clic, arranca el video con sonido. */}
      {!iniciado && (
        <button onClick={iniciar} aria-label="Reproducir" className="absolute inset-0 w-full h-full group">
          <img
            src={`https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`}
            onError={e => { (e.currentTarget as HTMLImageElement).src = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`; }}
            alt="" className="absolute inset-0 w-full h-full object-cover" />
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="w-20 h-20 rounded-full bg-white/90 group-hover:bg-white flex items-center justify-center shadow-lg transition-colors">
              <Play size={32} className="text-ink translate-x-0.5" fill="currentColor" />
            </span>
          </span>
        </button>
      )}

      {/* Ya iniciado: capa de click para pausar/reanudar (sin botón rojo de YouTube) */}
      {iniciado && (
        <button onClick={togglePlay} aria-label={reproduciendo ? 'Pausar' : 'Reproducir'}
          className="absolute inset-0 w-full h-full flex items-center justify-center group">
          {!reproduciendo && (
            <span className="w-20 h-20 rounded-full bg-white/90 group-hover:bg-white flex items-center justify-center shadow-lg transition-colors">
              <Play size={32} className="text-ink translate-x-0.5" fill="currentColor" />
            </span>
          )}
        </button>
      )}

      {/* Controles propios: play/pausa + volumen, SIN barra de progreso */}
      {listo && iniciado && (
        <div className="absolute bottom-0 left-0 right-0 flex items-center gap-3 px-4 py-3 bg-gradient-to-t from-black/70 to-transparent">
          <button onClick={togglePlay} className="text-white hover:text-primary transition-colors" aria-label={reproduciendo ? 'Pausar' : 'Reproducir'}>
            {reproduciendo ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
          </button>
          <button onClick={toggleMute} className="text-white hover:text-primary transition-colors" aria-label={silenciado ? 'Activar sonido' : 'Silenciar'}>
            {silenciado || volumen === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
          </button>
          <input type="range" min={0} max={100} value={silenciado ? 0 : volumen}
            onChange={e => cambiarVolumen(Number(e.target.value))}
            className="w-24 accent-primary cursor-pointer" aria-label="Volumen" />
        </div>
      )}
    </div>
  );
}
