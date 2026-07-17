import { useEffect, useRef, useState } from 'react';
import * as faceapi from 'face-api.js';
import { cargarModelosFaceApi } from '../lib/faceapi';
import { Camera, AlertTriangle, Check, RotateCcw } from 'lucide-react';

type Modo = 'login' | 'enrolar';
type Estado = 'cargando' | 'guiando' | 'preview' | 'exito' | 'error';

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

// Segundos antes de ofrecer el respaldo "marcar con cédula" en el login.
const SEG_FALLBACK_CEDULA = 8;

// Detección continua para el encuadre en vivo (barata, rápida en celulares).
const opcionesDeteccion = () => new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.4 });
// Captura del descriptor: inputSize mayor = landmarks y descriptor más nítidos.
const opcionesCaptura = () => new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.4 });

// Tiempo que la persona debe quedarse quieta antes de tomar la muestra.
const MS_QUIETO_ENROLAR = 2000;
const MS_QUIETO_LOGIN = 1000;
// Mínimo de cuadros nítidos a promediar por muestra.
const MIN_MUESTRAS_POSE = 3;

// Signo del yaw que tratamos como "derecha". Si en pruebas los lados salen
// invertidos, cambia este valor a -1 (es lo único que hay que tocar).
const SIGNO_DERECHA = 1;

// Giro de cabeza (yaw): posición de la nariz relativa a los ojos.
// ~0 de frente; el signo indica el lado del giro.
function desviacionYaw(landmarks: faceapi.FaceLandmarks68): number {
  const nariz = landmarks.getNose()[3];
  const ojoIzq = landmarks.getLeftEye()[0];
  const ojoDer = landmarks.getRightEye()[3];
  return (nariz.x - ojoIzq.x) / (ojoDer.x - ojoIzq.x) - 0.5;
}

// Promedio elemento a elemento de varios descriptores de 128 floats: reduce el
// ruido y deja una muestra más estable que un solo cuadro.
function promediarDescriptores(lista: number[][]): number[] {
  const out = new Array(128).fill(0);
  for (const d of lista) for (let i = 0; i < 128; i++) out[i] += d[i];
  for (let i = 0; i < 128; i++) out[i] /= lista.length;
  return out;
}

function capturarFoto(video: HTMLVideoElement): string {
  const ancho = 320;
  const alto = Math.round((video.videoHeight / video.videoWidth) * ancho) || 240;
  const canvas = document.createElement('canvas');
  canvas.width = ancho;
  canvas.height = alto;
  canvas.getContext('2d')!.drawImage(video, 0, 0, ancho, alto);
  return canvas.toDataURL('image/jpeg', 0.7);
}

// Guía de encuadre: qué le decimos al usuario para que el rostro llene el óvalo
type Encuadre = 'CENTRA' | 'ACERCATE' | 'ALEJATE' | 'OK';
function evaluarEncuadre(box: faceapi.Box, vw: number, vh: number): Encuadre {
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  if (Math.abs(cx - vw / 2) > vw * 0.28 || Math.abs(cy - vh / 2) > vh * 0.3) return 'CENTRA';
  const proporcion = box.width / vw;
  // Umbrales holgados: el rostro no tiene que llenar el óvalo (evita estirar el brazo)
  if (proporcion < 0.16) return 'ACERCATE';
  if (proporcion > 0.8) return 'ALEJATE';
  return 'OK';
}
const MSG_ENCUADRE: Record<Exclude<Encuadre, 'OK'>, string> = {
  CENTRA: 'Centra tu rostro en el óvalo',
  ACERCATE: 'Acércate un poco',
  ALEJATE: 'Aléjate un poco',
};

type TipoPose = 'frontal' | 'derecha' | 'izquierda';
type PasoEnrolar = { id: string; etiqueta: string; texto: string; tipo: TipoPose };

// ¿La pose actual (según el yaw) cumple lo que pide el paso?
function poseCumple(tipo: TipoPose, dev: number): boolean {
  if (tipo === 'frontal') return Math.abs(dev) < 0.1;
  const magnitud = Math.abs(dev) > 0.13 && Math.abs(dev) < 0.42;
  if (tipo === 'derecha') return magnitud && Math.sign(dev) === SIGNO_DERECHA;
  return magnitud && Math.sign(dev) === -SIGNO_DERECHA;
}

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

    // Estado del flujo (fuera de React para no re-renderizar por cuadro)
    const descriptoresPorPose: number[][] = [];
    const fotosPorPose: string[] = [];
    let idxPaso = 0;
    let holdInicio: number | null = null; // cuándo empezó a quedarse quieto
    let buffer: number[][] = [];           // descriptores acumulados en el hold

    const detenerCamara = () => {
      if (cuadroId !== null) cancelAnimationFrame(cuadroId);
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
        await cargarModelosFaceApi();
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

        const analizarCuadro = async () => {
          if (!activo || terminado) return;
          const video = videoRef.current;
          if (!video) { cuadroId = requestAnimationFrame(analizarCuadro); return; }

          const enHold = holdInicio !== null;
          // En el hold detectamos con más resolución y ya pedimos el descriptor.
          const deteccion = enHold
            ? await faceapi.detectSingleFace(video, opcionesCaptura()).withFaceLandmarks().withFaceDescriptor()
            : await faceapi.detectSingleFace(video, opcionesDeteccion()).withFaceLandmarks();

          if (!activo || terminado) return;

          if (!deteccion) {
            setEncuadreOk(false);
            setMensaje('Ubica tu rostro dentro del óvalo');
            resetHold();
            cuadroId = requestAnimationFrame(analizarCuadro);
            return;
          }

          const encuadre = evaluarEncuadre(deteccion.detection.box, video.videoWidth, video.videoHeight);
          if (encuadre !== 'OK') {
            setEncuadreOk(false);
            setMensaje(MSG_ENCUADRE[encuadre]);
            resetHold();
            cuadroId = requestAnimationFrame(analizarCuadro);
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
            cuadroId = requestAnimationFrame(analizarCuadro);
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

          cuadroId = requestAnimationFrame(analizarCuadro);
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
    return (
      <div className="flex flex-col items-center gap-4 w-full">
        <p className="text-sm font-medium text-ink text-center">Revisa las tomas de tu rostro</p>
        <div className="flex flex-wrap justify-center gap-2">
          {tomas.map((f, i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <img src={f} alt={pasos[i]?.etiqueta ?? `Toma ${i + 1}`}
                className="w-20 h-20 object-cover rounded-xl border border-gray-200 [transform:scaleX(-1)]" />
              <span className="text-[11px] text-muted">{pasos[i]?.etiqueta ?? `Toma ${i + 1}`}</span>
            </div>
          ))}
        </div>
        <div className="flex gap-3 w-full max-w-md">
          <button onClick={repetir}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-gray-300 text-sm font-medium text-gray-600 hover:bg-gray-50">
            <RotateCcw size={15} /> Repetir
          </button>
          <button onClick={aceptarPreview}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-green-600 text-white text-sm font-semibold hover:bg-green-700">
            <Check size={16} /> Aceptar y guardar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3 w-full">
      <div className="relative w-full max-w-md aspect-[4/3] rounded-2xl overflow-hidden bg-ink flex items-center justify-center">
        <video ref={videoRef} className="w-full h-full object-cover [transform:scaleX(-1)]" muted playsInline />
        {estado === 'cargando' && <Camera className="absolute text-white/60" size={40} />}

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
    </div>
  );
}
