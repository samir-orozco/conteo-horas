import { useEffect, useRef, useState } from 'react';
import * as faceapi from 'face-api.js';
import { cargarModelosFaceApi } from '../lib/faceapi';
import { Camera, AlertTriangle, Check } from 'lucide-react';

type Estado = 'cargando' | 'buscando' | 'detectado' | 'procesando' | 'exito' | 'error';

type Props = {
  // foto: JPEG base64 pequeño del momento de la verificación (evidencia de la marcación)
  onCapturado: (descriptor: number[], foto: string) => void;
  onError?: (mensaje: string) => void;
  // Error reportado por el padre (ej. "rostro no reconocido"): pinta el recuadro en rojo
  errorExterno?: string | null;
};

// Distancia entre dos puntos de landmark
const dist = (a: faceapi.Point, b: faceapi.Point) => Math.hypot(a.x - b.x, a.y - b.y);

// Eye Aspect Ratio: cae cuando el ojo se cierra. Usamos su caída y
// recuperación como prueba de vida (parpadeo) — una foto no puede parpadear.
function ear(ojo: faceapi.Point[]): number {
  return (dist(ojo[1], ojo[5]) + dist(ojo[2], ojo[4])) / (2 * dist(ojo[0], ojo[3]));
}

// Cámara + reconocimiento facial con prueba de vida por parpadeo.
// Todo corre en el navegador (face-api.js/TensorFlow.js): la imagen nunca
// sale del dispositivo, solo el descriptor matemático (128 floats) que se
// entrega en onCapturado.
// Captura un JPEG pequeño del cuadro actual del video (máx ~320px de ancho)
function capturarFoto(video: HTMLVideoElement): string {
  const ancho = 320;
  const alto = Math.round((video.videoHeight / video.videoWidth) * ancho) || 240;
  const canvas = document.createElement('canvas');
  canvas.width = ancho;
  canvas.height = alto;
  canvas.getContext('2d')!.drawImage(video, 0, 0, ancho, alto);
  return canvas.toDataURL('image/jpeg', 0.7);
}

export default function CamaraRostro({ onCapturado, onError, errorExterno }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [estado, setEstado] = useState<Estado>('cargando');
  const [mensaje, setMensaje] = useState('Cargando cámara...');

  useEffect(() => {
    let activo = true;
    let capturado = false;
    let baseline: number | null = null;
    const muestrasBaseline: number[] = [];
    let ojosCerrados = false;
    let stream: MediaStream | null = null;
    let cuadroId: number | null = null;

    const detenerCamara = () => {
      if (cuadroId !== null) cancelAnimationFrame(cuadroId);
      stream?.getTracks().forEach(t => t.stop());
    };

    const fallar = (msg: string) => {
      setEstado('error');
      setMensaje(msg);
      onError?.(msg);
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
        setEstado('buscando');
        setMensaje('Ubica tu rostro frente a la cámara');

        // Bucle continuo (no un intervalo fijo): un parpadeo real dura apenas
        // 100-150ms, así que hay que revisar cuadro a cuadro para no saltárselo.
        const analizarCuadro = async () => {
          if (!activo) return;
          if (capturado || !videoRef.current) {
            cuadroId = requestAnimationFrame(analizarCuadro);
            return;
          }

          const deteccion = await faceapi
            .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
            .withFaceLandmarks();

          if (!activo || capturado) return;

          if (!deteccion) {
            baseline = null;
            muestrasBaseline.length = 0;
            ojosCerrados = false;
            setEstado('buscando');
            setMensaje('Ubica tu rostro frente a la cámara');
            cuadroId = requestAnimationFrame(analizarCuadro);
            return;
          }

          const earActual = (ear(deteccion.landmarks.getLeftEye()) + ear(deteccion.landmarks.getRightEye())) / 2;

          if (baseline === null) {
            muestrasBaseline.push(earActual);
            if (muestrasBaseline.length >= 5) {
              baseline = muestrasBaseline.reduce((a, b) => a + b, 0) / muestrasBaseline.length;
            }
            setEstado('detectado');
            setMensaje('Ahora parpadea para continuar');
            cuadroId = requestAnimationFrame(analizarCuadro);
            return;
          }

          if (!ojosCerrados && earActual < baseline * 0.88) {
            ojosCerrados = true;
          } else if (ojosCerrados && earActual > baseline * 0.90) {
            // Parpadeo confirmado: capturamos el descriptor con este cuadro (ojos abiertos)
            capturado = true;
            setEstado('procesando');
            setMensaje('Verificando...');
            const conDescriptor = await faceapi
              .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
              .withFaceLandmarks()
              .withFaceDescriptor();
            if (!activo) return;
            if (!conDescriptor) {
              capturado = false;
              ojosCerrados = false;
              setEstado('buscando');
              setMensaje('No pudimos leer tu rostro, intenta de nuevo');
              cuadroId = requestAnimationFrame(analizarCuadro);
              return;
            }
            const descriptorFinal = Array.from(conDescriptor.descriptor);
            const foto = capturarFoto(videoRef.current);
            setEstado('exito');
            setMensaje('¡Rostro verificado!');
            // Pequeña pausa para que se vea la animación de éxito antes de continuar
            setTimeout(() => {
              if (!activo) return;
              detenerCamara();
              onCapturado(descriptorFinal, foto);
            }, 700);
            return;
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
  }, []);

  const hayError = estado === 'error' || !!errorExterno;

  return (
    <div className="flex flex-col items-center gap-3 w-full">
      <div className={`relative w-full max-w-md aspect-[4/3] rounded-2xl overflow-hidden bg-ink flex items-center justify-center transition-shadow ${hayError ? 'ring-4 ring-red-500' : estado === 'exito' ? 'ring-4 ring-green-500' : estado === 'detectado' || estado === 'procesando' ? 'ring-4 ring-green-400' : ''}`}>
        <video ref={videoRef} className="w-full h-full object-cover [transform:scaleX(-1)]" muted playsInline />
        {estado === 'cargando' && <Camera className="absolute text-white/60" size={40} />}
        {(estado === 'buscando' || estado === 'detectado') && !hayError && (
          <div className="hp-scan-line absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent shadow-[0_0_12px_2px_rgba(255,216,94,0.8)]" />
        )}
        {estado === 'exito' && !hayError && (
          <div className="absolute inset-0 flex items-center justify-center bg-green-600/20">
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
      <p className={`text-sm font-medium text-center ${hayError ? 'text-red-500' : estado === 'exito' ? 'text-green-600' : 'text-muted'}`}>
        {estado === 'error' && <AlertTriangle size={14} className="inline mr-1 -mt-0.5" />}
        {errorExterno ?? mensaje}
      </p>
    </div>
  );
}
