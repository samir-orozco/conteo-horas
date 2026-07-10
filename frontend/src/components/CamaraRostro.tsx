import { useEffect, useRef, useState } from 'react';
import * as faceapi from 'face-api.js';
import { cargarModelosFaceApi } from '../lib/faceapi';
import { Camera, AlertTriangle, Check } from 'lucide-react';

type Modo = 'login' | 'enrolar';
type Estado = 'cargando' | 'guiando' | 'exito' | 'error';

type Props = {
  // login: 1 captura rápida con prueba de vida (parpadeo suave)
  // enrolar: captura guiada de varias poses (frente + perfiles + sin gafas)
  modo?: Modo;
  // Enrolamiento: agrega una toma final sin gafas (para quien las usa a diario)
  pasoGafas?: boolean;
  // Siempre entrega la lista de muestras; en login la lista tiene 1 elemento.
  // foto: JPEG pequeño del momento (evidencia de la marcación)
  onCapturado: (descriptores: number[][], foto: string) => void;
  onError?: (mensaje: string) => void;
  // Error reportado por el padre (ej. "rostro no reconocido"): pinta el óvalo en rojo
  errorExterno?: string | null;
};

// inputSize bajo = detección 2-3x más rápida en celulares; a distancia de
// kiosco (rostro llenando el óvalo) la precisión no se resiente.
const opcionesDetector = () => new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.4 });

const dist = (a: faceapi.Point, b: faceapi.Point) => Math.hypot(a.x - b.x, a.y - b.y);

// Eye Aspect Ratio: cae cuando el ojo se cierra (prueba de vida por parpadeo)
function ear(ojo: faceapi.Point[]): number {
  return (dist(ojo[1], ojo[5]) + dist(ojo[2], ojo[4])) / (2 * dist(ojo[0], ojo[3]));
}

// Giro de cabeza (yaw): posición de la nariz relativa a los ojos.
// ~0 de frente; positivo/negativo según el lado del giro.
function desviacionYaw(landmarks: faceapi.FaceLandmarks68): number {
  const nariz = landmarks.getNose()[3];
  const ojoIzq = landmarks.getLeftEye()[0];
  const ojoDer = landmarks.getRightEye()[3];
  return (nariz.x - ojoIzq.x) / (ojoDer.x - ojoIzq.x) - 0.5;
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
  if (Math.abs(cx - vw / 2) > vw * 0.2 || Math.abs(cy - vh / 2) > vh * 0.22) return 'CENTRA';
  const proporcion = box.width / vw;
  if (proporcion < 0.26) return 'ACERCATE';
  if (proporcion > 0.62) return 'ALEJATE';
  return 'OK';
}
const MSG_ENCUADRE: Record<Exclude<Encuadre, 'OK'>, string> = {
  CENTRA: 'Centra tu rostro en el óvalo',
  ACERCATE: 'Acércate un poco',
  ALEJATE: 'Aléjate un poco',
};

type PasoEnrolar = { id: string; etiqueta: string; texto: string; tipo: 'frontal' | 'lado' | 'ladoOpuesto' };

export default function CamaraRostro({ modo = 'login', pasoGafas = false, onCapturado, onError, errorExterno }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [estado, setEstado] = useState<Estado>('cargando');
  const [mensaje, setMensaje] = useState('Cargando cámara...');
  const [encuadreOk, setEncuadreOk] = useState(false);
  const [pasoActual, setPasoActual] = useState(0);

  const pasos: PasoEnrolar[] = modo === 'enrolar'
    ? [
        { id: 'frente', etiqueta: 'Frente', texto: 'Mira de frente a la cámara', tipo: 'frontal' },
        { id: 'lado1', etiqueta: 'Un lado', texto: 'Gira levemente la cabeza hacia un lado', tipo: 'lado' },
        { id: 'lado2', etiqueta: 'Otro lado', texto: 'Ahora gira levemente hacia el otro lado', tipo: 'ladoOpuesto' },
        ...(pasoGafas ? [{ id: 'singafas', etiqueta: 'Sin gafas', texto: 'Quítate las gafas y mira de frente', tipo: 'frontal' as const }] : []),
      ]
    : [];

  useEffect(() => {
    let activo = true;
    let terminado = false;
    let stream: MediaStream | null = null;
    let cuadroId: number | null = null;

    // Estado del flujo (vive fuera de React para no re-renderizar por cuadro)
    const descriptores: number[][] = [];
    let foto: string | null = null;
    let idxPaso = 0;
    let establesPaso = 0; // cuadros seguidos cumpliendo la pose
    let signoLado = 0; // hacia qué lado giró en el paso "lado"
    // Parpadeo suave (login)
    let baseline: number | null = null;
    const muestrasBaseline: number[] = [];
    let earPrevio: number | null = null;
    let ojosCerrados = false;

    const detenerCamara = () => {
      if (cuadroId !== null) cancelAnimationFrame(cuadroId);
      stream?.getTracks().forEach(t => t.stop());
    };

    const fallar = (msg: string) => {
      setEstado('error');
      setMensaje(msg);
      onError?.(msg);
    };

    const finalizar = (video: HTMLVideoElement) => {
      terminado = true;
      setEstado('exito');
      setMensaje(modo === 'enrolar' ? '¡Rostro registrado!' : '¡Rostro verificado!');
      const fotoFinal = foto ?? capturarFoto(video);
      // Pausa breve para que se vea la animación de éxito antes de continuar
      setTimeout(() => {
        if (!activo) return;
        detenerCamara();
        onCapturado(descriptores, fotoFinal);
      }, 700);
    };

    (async () => {
      try {
        await cargarModelosFaceApi();
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: 480, height: 360 } });
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

          const deteccion = await faceapi
            .detectSingleFace(video, opcionesDetector())
            .withFaceLandmarks();

          if (!activo || terminado) return;

          if (!deteccion) {
            setEncuadreOk(false);
            setMensaje('Ubica tu rostro dentro del óvalo');
            establesPaso = 0;
            baseline = null;
            muestrasBaseline.length = 0;
            ojosCerrados = false;
            cuadroId = requestAnimationFrame(analizarCuadro);
            return;
          }

          const encuadre = evaluarEncuadre(deteccion.detection.box, video.videoWidth, video.videoHeight);
          if (encuadre !== 'OK') {
            setEncuadreOk(false);
            setMensaje(MSG_ENCUADRE[encuadre]);
            establesPaso = 0;
            cuadroId = requestAnimationFrame(analizarCuadro);
            return;
          }
          setEncuadreOk(true);

          if (modo === 'enrolar') {
            // ===== Enrolamiento guiado por poses =====
            const paso = pasos[idxPaso];
            setMensaje(paso.texto);
            const dev = desviacionYaw(deteccion.landmarks);
            const cumple =
              paso.tipo === 'frontal' ? Math.abs(dev) < 0.09
              : paso.tipo === 'lado' ? Math.abs(dev) > 0.15 && Math.abs(dev) < 0.38
              : dev * signoLado < 0 && Math.abs(dev) > 0.15 && Math.abs(dev) < 0.38;

            establesPaso = cumple ? establesPaso + 1 : 0;
            if (establesPaso >= 3) {
              const completa = await faceapi
                .detectSingleFace(video, opcionesDetector())
                .withFaceLandmarks()
                .withFaceDescriptor();
              if (!activo || terminado) return;
              if (completa) {
                descriptores.push(Array.from(completa.descriptor));
                if (paso.tipo === 'lado') signoLado = Math.sign(dev);
                if (paso.id === 'frente') foto = capturarFoto(video);
                idxPaso += 1;
                establesPaso = 0;
                setPasoActual(idxPaso);
                if (idxPaso >= pasos.length) { finalizar(video); return; }
              }
            }
          } else {
            // ===== Login: prueba de vida con parpadeo suave =====
            const earCrudo = (ear(deteccion.landmarks.getLeftEye()) + ear(deteccion.landmarks.getRightEye())) / 2;
            // Suavizado: promedio con el cuadro anterior para filtrar ruido
            const earActual = earPrevio === null ? earCrudo : (earCrudo + earPrevio) / 2;
            earPrevio = earCrudo;

            if (baseline === null) {
              muestrasBaseline.push(earActual);
              setMensaje('Quédate quieto un momento...');
              if (muestrasBaseline.length >= 5) {
                baseline = muestrasBaseline.reduce((a, b) => a + b, 0) / muestrasBaseline.length;
              }
              cuadroId = requestAnimationFrame(analizarCuadro);
              return;
            }

            setMensaje('Parpadea suavemente');
            // Cerrado: caída relativa O valor absoluto típico de ojo cerrado.
            // Con el rostro llenando el óvalo la señal es limpia: basta un parpadeo normal.
            if (!ojosCerrados && (earActual < baseline * 0.86 || earActual < 0.2)) {
              ojosCerrados = true;
            } else if (ojosCerrados && earActual > baseline * 0.93) {
              const completa = await faceapi
                .detectSingleFace(video, opcionesDetector())
                .withFaceLandmarks()
                .withFaceDescriptor();
              if (!activo || terminado) return;
              if (completa) {
                descriptores.push(Array.from(completa.descriptor));
                foto = capturarFoto(video);
                finalizar(video);
                return;
              }
              ojosCerrados = false;
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
  }, [modo, pasoGafas]);

  const hayError = estado === 'error' || !!errorExterno;
  const colorOvalo = hayError ? '#f87171' : estado === 'exito' ? '#4ade80' : encuadreOk ? '#4ade80' : '#FFD85E';

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
                : i === pasoActual && estado !== 'exito' ? 'bg-primary/30 text-ink'
                : i === pasoActual ? 'bg-green-100 text-green-700'
                : 'bg-gray-100 text-muted'
              }`}>
              {(i < pasoActual || estado === 'exito') && <Check size={12} strokeWidth={3} />}
              {p.etiqueta}
            </span>
          ))}
        </div>
      )}

      <p className={`text-sm font-medium text-center ${hayError ? 'text-red-500' : estado === 'exito' ? 'text-green-600' : 'text-muted'}`}>
        {estado === 'error' && <AlertTriangle size={14} className="inline mr-1 -mt-0.5" />}
        {errorExterno ?? mensaje}
      </p>
    </div>
  );
}
