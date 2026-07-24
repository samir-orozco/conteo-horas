import { useEffect, useRef, useState } from 'react';
import * as faceapi from 'face-api.js';
import { cargarModelosLigeros, cargarModeloRostro } from '../lib/faceapi';
import { Camera, AlertTriangle, Check } from 'lucide-react';
import PreviewEnrolamiento from './camaraRostro/PreviewEnrolamiento';
import {
  SEG_FALLBACK_CEDULA, opcionesDeteccion, opcionesCaptura, MS_QUIETO_ENROLAR, MS_QUIETO_LOGIN,
  MIN_MUESTRAS_POSE, MS_MIN_CUADRO, desviacionYaw, promediarDescriptores, capturarFoto,
  evaluarEncuadre, MSG_ENCUADRE, poseCumple, type Modo, type Estado, type PasoEnrolar,
} from './camaraRostro/rostroCliente';

type Props = {
  // login: captura rápida quedándose quieto (sin gestos)
  // enrolar: captura guiada de varias poses con preview para aceptar/repetir
  modo?: Modo;
  // Enrolamiento: agrega una toma final sin gafas (para quien las usa a diario)
  pasoGafas?: boolean;
  // Siempre entrega la lista de muestras; en login la lista tiene 1 elemento.
  // foto: JPEG pequeño del momento (evidencia de la marcación)
  onCapturado: (descriptores: number[][], foto: string) => void;
  onError?: (mensaje: string) => void;
  // Error reportado por el padre (ej. "rostro no reconocido"): pinta el óvalo en rojo
  errorExterno?: string | null;
  // Login: si la empresa permite cédula, tras unos segundos ofrece un respaldo
  // que toma la foto del momento y deja marcar digitando la cédula.
  permiteFallbackCedula?: boolean;
  onUsarCedula?: (foto: string) => void;
};

export default function CamaraRostro({ modo = 'login', pasoGafas = false, onCapturado, onError, errorExterno, permiteFallbackCedula = false, onUsarCedula }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [mostrarFallback, setMostrarFallback] = useState(false);
  const [estado, setEstado] = useState<Estado>('cargando');
  const [mensaje, setMensaje] = useState('Cargando cámara...');
  const [encuadreOk, setEncuadreOk] = useState(false);
  const [pasoActual, setPasoActual] = useState(0);
  const [progreso, setProgreso] = useState(0); // 0..1 del "quédate quieto"
  const [intento, setIntento] = useState(0);    // se incrementa al "Repetir"
  const [tomas, setTomas] = useState<string[]>([]); // fotos del preview (enrolar)
  const descsPreview = useRef<number[][]>([]);   // descriptores esperando aceptación
  const [progModelos, setProgModelos] = useState(0); // 0..1 carga de los modelos livianos
  const [metrica, setMetrica] = useState<{ camara?: number; rostro?: number }>({}); // solo dev

  const pasos: PasoEnrolar[] = modo === 'enrolar'
    ? [
        { id: 'frente', etiqueta: 'Frente', texto: 'Mira de frente a la cámara', tipo: 'frontal' },
        { id: 'derecha', etiqueta: 'Derecha', texto: 'Gira tu rostro a la derecha', tipo: 'derecha' },
        { id: 'izquierda', etiqueta: 'Izquierda', texto: 'Gira tu rostro a la izquierda', tipo: 'izquierda' },
        ...(pasoGafas ? [{ id: 'singafas', etiqueta: 'Sin gafas', texto: 'Quítate las gafas y mira de frente', tipo: 'frontal' as const }] : []),
      ]
    : [];

  useEffect(() => {
    let activo = true;
    let terminado = false;
    let stream: MediaStream | null = null;
    let cuadroId: number | null = null;
    let cuadroTimeout: ReturnType<typeof setTimeout> | null = null;
    let erroresSeguidos = 0;

    // Estado del flujo (fuera de React para no re-renderizar por cuadro)
    const descriptoresPorPose: number[][] = [];
    const fotosPorPose: string[] = [];
    let idxPaso = 0;
    let holdInicio: number | null = null; // cuándo empezó a quedarse quieto
    let buffer: number[][] = [];           // descriptores acumulados en el hold
    let rostroListo = false;               // ¿ya cargó el modelo de reconocimiento?
    let progRostro = 0;                    // 0..1 de su descarga en segundo plano

    const detenerCamara = () => {
      if (cuadroId !== null) cancelAnimationFrame(cuadroId);
      if (cuadroTimeout !== null) clearTimeout(cuadroTimeout);
      stream?.getTracks().forEach(t => t.stop());
    };

    const fallar = (msg: string) => {
      setEstado('error');
      setMensaje(msg);
      onError?.(msg);
    };

    const resetHold = () => { holdInicio = null; buffer = []; setProgreso(0); };

    (async () => {
      try {
        const t0 = performance.now();
        // 1) Modelos livianos (detector + landmarks): con esto ya enciende la cámara.
        await cargarModelosLigeros(p => { if (activo) setProgModelos(p); });
        if (!activo) return;
        // 2) Reconocimiento (~6.1MB) en segundo plano: solo hace falta al capturar.
        cargarModeloRostro(p => { progRostro = p; })
          .then(() => {
            if (!activo) return;
            rostroListo = true;
            setMetrica(m => ({ ...m, rostro: Math.round(performance.now() - t0) }));
          })
          .catch(() => { /* si falla, el hold seguirá esperando; el padre maneja el error */ });

        // Resolución "ideal" (no exacta): evita que iOS arranque en un lente y
        // cambie a otro (gran angular → normal) y reduce el zoom/recorte del sensor.
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        });
        if (!activo) { stream.getTracks().forEach(t => t.stop()); return; }
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setEstado('guiando');
        setMensaje('Ubica tu rostro dentro del óvalo');
        setMetrica(m => ({ ...m, camara: Math.round(performance.now() - t0) }));

        function programarSiguiente() {
          if (!activo || terminado) return;
          // En captura ("hold") vamos a máxima fluidez; el resto con un piso de ~120ms.
          if (holdInicio !== null) {
            cuadroId = requestAnimationFrame(analizarCuadro);
          } else {
            cuadroTimeout = setTimeout(() => { cuadroId = requestAnimationFrame(analizarCuadro); }, MS_MIN_CUADRO);
          }
        }

        const analizarCuadro = async () => {
          if (!activo || terminado) return;
          const video = videoRef.current;
          if (!video) { programarSiguiente(); return; }

          try {
            const enHold = holdInicio !== null;
            // En el hold detectamos con más resolución y ya pedimos el descriptor.
            const deteccion = enHold
              ? await faceapi.detectSingleFace(video, opcionesCaptura()).withFaceLandmarks().withFaceDescriptor()
              : await faceapi.detectSingleFace(video, opcionesDeteccion()).withFaceLandmarks();
            erroresSeguidos = 0; // el cuadro se procesó sin lanzar

            if (!activo || terminado) return;

            if (!deteccion) {
              setEncuadreOk(false);
              setMensaje('Ubica tu rostro dentro del óvalo');
              resetHold();
              programarSiguiente();
              return;
            }

            const encuadre = evaluarEncuadre(deteccion.detection.box, video.videoWidth, video.videoHeight);
            if (encuadre !== 'OK') {
              setEncuadreOk(false);
              setMensaje(MSG_ENCUADRE[encuadre]);
              resetHold();
              programarSiguiente();
              return;
            }
            setEncuadreOk(true);

            // ¿Se cumple la condición para (seguir) capturando?
            const paso = modo === 'enrolar' ? pasos[idxPaso] : null;
            const condicionOk = paso ? poseCumple(paso.tipo, desviacionYaw(deteccion.landmarks)) : true;

            if (!condicionOk) {
              // Rompió la pose: reinicia el conteo de "quieto"
              if (paso) setMensaje(paso.texto);
              resetHold();
              programarSiguiente();
              return;
            }

            // La captura del descriptor necesita el modelo de reconocimiento (pesado).
            // Si aún está bajando, mantenemos el encuadre y esperamos con su %.
            if (!rostroListo) {
              setMensaje(`Preparando reconocimiento… ${Math.round(progRostro * 100)}%`);
              resetHold();
              programarSiguiente();
              return;
            }

            // Arranca o continúa el "quédate quieto"
            if (holdInicio === null) {
              holdInicio = performance.now();
              buffer = [];
            }
            // Si esta detección trajo descriptor (estamos en hold), lo guardamos
            const desc = (deteccion as any).descriptor as Float32Array | undefined;
            if (desc) buffer.push(Array.from(desc));

            const objetivo = modo === 'enrolar' ? MS_QUIETO_ENROLAR : MS_QUIETO_LOGIN;
            const transcurrido = performance.now() - holdInicio;
            setProgreso(Math.min(1, transcurrido / objetivo));
            setMensaje(paso ? `${paso.texto} · mantente quieto` : 'Quédate quieto un momento...');

            if (transcurrido >= objetivo && buffer.length >= MIN_MUESTRAS_POSE) {
              const muestra = promediarDescriptores(buffer);
              const foto = capturarFoto(video);

              if (modo === 'enrolar') {
                descriptoresPorPose.push(muestra);
                fotosPorPose.push(foto);
                idxPaso += 1;
                setPasoActual(idxPaso);
                resetHold();
                if (idxPaso >= pasos.length) {
                  // Todas las poses listas → preview para aceptar/repetir
                  terminado = true;
                  detenerCamara();
                  descsPreview.current = descriptoresPorPose;
                  setTomas(fotosPorPose);
                  setEstado('preview');
                  return;
                }
              } else {
                // Login: una sola muestra promediada → listo
                terminado = true;
                setEstado('exito');
                setMensaje('¡Rostro verificado!');
                setTimeout(() => {
                  if (!activo) return;
                  detenerCamara();
                  onCapturado([muestra], foto);
                }, 400);
                return;
              }
            }

            programarSiguiente();
          } catch {
            if (!activo || terminado) return;
            // Error transitorio (video aún en 0x0, hipo del modelo): reintenta el
            // siguiente cuadro; si es persistente, muestra error en vez de congelarse.
            erroresSeguidos++;
            if (erroresSeguidos >= 20) { fallar('La cámara tuvo un problema. Toca Reintentar.'); return; }
            programarSiguiente();
          }
        };
        cuadroId = requestAnimationFrame(analizarCuadro);
      } catch (e: any) {
        const msg = e?.name === 'NotAllowedError'
          ? 'Debes permitir el acceso a la cámara para continuar'
          : 'No pudimos iniciar la cámara';
        fallar(msg);
      }
    })();

    return () => {
      activo = false;
      detenerCamara();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modo, pasoGafas, intento]);

  // Login: tras unos segundos sin reconocer, ofrece el respaldo con cédula.
  useEffect(() => {
    if (modo !== 'login' || !permiteFallbackCedula) return;
    setMostrarFallback(false);
    const t = setTimeout(() => setMostrarFallback(true), SEG_FALLBACK_CEDULA * 1000);
    return () => clearTimeout(t);
  }, [modo, permiteFallbackCedula, intento]);

  const usarCedula = () => {
    const v = videoRef.current;
    onUsarCedula?.(v ? capturarFoto(v) : '');
  };

  const aceptarPreview = () => {
    onCapturado(descsPreview.current, tomas[0]);
  };
  const repetir = () => {
    descsPreview.current = [];
    setTomas([]);
    setPasoActual(0);
    setProgreso(0);
    setEncuadreOk(false);
    setMensaje('Cargando cámara...');
    setEstado('cargando');
    setIntento(i => i + 1);
  };

  const hayError = estado === 'error' || !!errorExterno;
  const colorOvalo = hayError ? '#f87171' : estado === 'exito' ? '#4ade80' : encuadreOk ? '#4ade80' : '#FFD85E';

  // ===== Preview de enrolamiento: aceptar o repetir =====
  if (estado === 'preview') {
    return <PreviewEnrolamiento tomas={tomas} pasos={pasos} onAceptar={aceptarPreview} onRepetir={repetir} />;
  }

  return (
    <div className="flex flex-col items-center gap-3 w-full">
      <div className="relative w-full max-w-md aspect-[4/3] rounded-2xl overflow-hidden bg-ink flex items-center justify-center">
        <video ref={videoRef} className="w-full h-full object-cover [transform:scaleX(-1)]" muted playsInline />
        {estado === 'cargando' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-8 text-center">
            <Camera className="text-white/50 animate-pulse" size={34} />
            <div className="w-44 h-1.5 rounded-full bg-white/15 overflow-hidden">
              <div className="h-full bg-primary transition-[width] duration-200 ease-out" style={{ width: `${Math.round(progModelos * 100)}%` }} />
            </div>
            <p className="text-white/85 text-sm font-medium">Preparando la cámara… {Math.round(progModelos * 100)}%</p>
            <p className="text-white/40 text-xs">Esto solo pasa la primera vez en este teléfono</p>
          </div>
        )}

        {/* Óvalo guía: oscurece alrededor y marca dónde debe ir el rostro */}
        {(estado === 'guiando' || estado === 'exito' || hayError) && (
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 75" preserveAspectRatio="none" aria-hidden="true">
            <path
              d="M0 0 H100 V75 H0 Z M50 37.5 m-23 0 a23 30 0 1 0 46 0 a23 30 0 1 0 -46 0"
              fill="rgba(0,0,0,0.45)"
              fillRule="evenodd"
            />
            <ellipse cx="50" cy="37.5" rx="23" ry="30" fill="none" stroke={colorOvalo} strokeWidth="1.4"
              strokeDasharray={estado === 'guiando' && !encuadreOk ? '4 2.5' : undefined} />
          </svg>
        )}

        {/* Línea de escaneo mientras lee el rostro (CSS puro; funciona en Android) */}
        {estado === 'guiando' && encuadreOk && (
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="hp-scan-line absolute left-[18%] right-[18%] h-0.5 bg-green-400/80 rounded-full shadow-[0_0_8px_rgba(74,222,128,0.9)]" />
          </div>
        )}

        {/* Barra de progreso del "quédate quieto" (robusta, sin pathLength) */}
        {progreso > 0 && estado === 'guiando' && (
          <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-white/20">
            <div className="h-full bg-green-400 transition-[width] duration-100 ease-linear" style={{ width: `${Math.round(progreso * 100)}%` }} />
          </div>
        )}

        {estado === 'exito' && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative w-20 h-20">
              <div className="hp-ripple absolute inset-0 rounded-full bg-green-400/50" />
              <div className="hp-pop relative w-20 h-20 rounded-full bg-white flex items-center justify-center">
                <Check size={36} className="text-green-600" strokeWidth={3} />
              </div>
            </div>
          </div>
        )}
        {hayError && (
          <div className="absolute inset-0 flex items-center justify-center bg-red-600/25">
            <div className="hp-pop w-20 h-20 rounded-full bg-white flex items-center justify-center">
              <AlertTriangle size={34} className="text-red-500" strokeWidth={2.5} />
            </div>
          </div>
        )}
      </div>

      {/* Progreso del enrolamiento: un chip por pose */}
      {modo === 'enrolar' && !hayError && (
        <div className="flex flex-wrap justify-center gap-1.5">
          {pasos.map((p, i) => (
            <span key={p.id}
              className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${
                i < pasoActual ? 'bg-green-100 text-green-700'
                : i === pasoActual ? 'bg-primary/30 text-ink'
                : 'bg-gray-100 text-muted'
              }`}>
              {i < pasoActual && <Check size={12} strokeWidth={3} />}
              {p.etiqueta}
            </span>
          ))}
        </div>
      )}

      <p className={`text-sm font-medium text-center ${hayError ? 'text-red-500' : estado === 'exito' ? 'text-green-600' : 'text-muted'}`}>
        {estado === 'error' && <AlertTriangle size={14} className="inline mr-1 -mt-0.5" />}
        {errorExterno ?? mensaje}
      </p>

      {/* Respaldo: si tarda en reconocer, marcar con cédula tomando la foto del momento */}
      {modo === 'login' && permiteFallbackCedula && mostrarFallback && (estado === 'guiando' || !!errorExterno) && (
        <button onClick={usarCedula}
          className="text-xs font-medium text-white/60 hover:text-white underline underline-offset-2 decoration-white/30">
          ¿Problemas? Marcar con cédula
        </button>
      )}

      {/* Cronómetro de carga — SOLO en desarrollo (banco de pruebas). En prod no aparece. */}
      {import.meta.env.DEV && (metrica.camara != null || metrica.rostro != null) && (
        <p className="text-[10px] font-mono text-white/30">
          ⏱ cámara {metrica.camara ?? '…'}ms · reconocimiento {metrica.rostro ?? '…'}ms
        </p>
      )}
    </div>
  );
}
