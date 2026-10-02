import { useEffect, useRef, useState } from 'react';
import * as faceapi from 'face-api.js';
import { cargarModelosLigeros, cargarModeloRostro, modelosEnCache } from '../lib/faceapi';
import { Camera, AlertTriangle, Check, ArrowLeft, ArrowRight } from 'lucide-react';
import PreviewEnrolamiento from './camaraRostro/PreviewEnrolamiento';
import {
  SEG_FALLBACK_CEDULA, opcionesDeteccion, opcionesCaptura, MS_QUIETO_ENROLAR, MS_QUIETO_LOGIN,
  MIN_MUESTRAS_POSE, MS_MIN_CUADRO, desviacionYaw, promediarDescriptores, capturarFoto,
  MSG_ENCUADRE, poseCumple, RESTRICCIONES_VIDEO, fijarZoomMinimo,
  esperarVideoEstable, crearEstabilizadorEncuadre, numeroDeLaCuenta,
  type Modo, type Estado, type TipoPose,
} from './camaraRostro/rostroCliente';
import {
  sortearLado, poseDelReto, flechaDelReto, MS_QUIETO_GIRO, lecturaDelGiro, textoDelReto,
  type FaseDelReto, type LecturaDelGiro,
} from './camaraRostro/reto';
import MedidorDeGiro from './camaraRostro/MedidorDeGiro';
import { pasosDeEnrolamiento, mensajeBajoLaTarjeta, type PasoGuiado } from './camaraRostro/pasosEnrolar';
import TarjetaDePaso from './camaraRostro/TarjetaDePaso';

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
  // Login: pedir un giro de cabeza antes de capturar. Lo decide el servidor por
  // empresa y llega apagado por defecto: un reto que falle deja a la gente sin
  // poder marcar, y esta es la parte del producto que ya rompió el ingreso
  // varias veces.
  exigeReto?: boolean;
};

// La regla vacía: nada girado todavía.
const GIRO_SIN_EMPEZAR: LecturaDelGiro = { estado: 'FALTA', avance: 0, encendidas: 0 };

export default function CamaraRostro({ modo = 'login', pasoGafas = false, onCapturado, onError, errorExterno, permiteFallbackCedula = false, onUsarCedula, exigeReto = false }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [mostrarFallback, setMostrarFallback] = useState(false);
  const [estado, setEstado] = useState<Estado>('cargando');
  const [mensaje, setMensaje] = useState('Cargando cámara...');
  const [encuadreOk, setEncuadreOk] = useState(false);
  const [pasoActual, setPasoActual] = useState(0);
  const [progreso, setProgreso] = useState(0); // 0..1 del "quédate quieto"
  // EL RETO DE GIRO. Solo en login y solo si la empresa lo activó. El lado se
  // sortea UNA vez por intento: si se resorteara en cada cuadro, la flecha
  // parpadearía y sería imposible de seguir.
  const retoActivo = modo === 'login' && exigeReto;
  const [ladoReto, setLadoReto] = useState<TipoPose>(() => sortearLado(Math.random()));
  const [faseReto, setFaseReto] = useState<FaseDelReto>('GIRAR');
  const [retoOk, setRetoOk] = useState(false);
  // Cuánto va del giro, para la regla que se llena junto al óvalo (2 de octubre de 2026).
  const [lecturaGiro, setLecturaGiro] = useState<LecturaDelGiro>(GIRO_SIN_EMPEZAR);
  // La foto que se acaba de tomar, de fondo mientras el servidor verifica.
  const [fotoVerificando, setFotoVerificando] = useState<string | null>(null);
  // El bucle lee el reto POR REFERENCIA, no por la clausura del efecto.
  //
  // `exigeReto` llega del servidor DESPUÉS de montar: la pantalla de login se
  // pinta antes de que responda `/kiosco/:token`. Si el bucle lo capturara al
  // arrancar, el reto no se activaría nunca en la primera carga. Y meterlo en
  // las dependencias del efecto reiniciaría el video a mitad del encuadre, que
  // en un teléfono lento se ve como un parpadeo feo justo cuando la persona ya
  // se estaba acomodando.
  const retoRef = useRef({ activo: retoActivo, lado: ladoReto });
  useEffect(() => { retoRef.current = { activo: retoActivo, lado: ladoReto }; }, [retoActivo, ladoReto]);
  const [intento, setIntento] = useState(0);    // se incrementa al "Repetir"
  const [tomas, setTomas] = useState<string[]>([]); // fotos del preview (enrolar)
  const descsPreview = useRef<number[][]>([]);   // descriptores esperando aceptación
  const [progModelos, setProgModelos] = useState(0); // 0..1 carga de los modelos livianos
  // Descarga del modelo pesado. Se refleja en React —y no solo en la variable del
  // bucle— para poder avisar SIEMPRE que sigue preparándose, aunque el encuadre
  // todavía no esté bien. Antes ese aviso solo salía si el rostro ya estaba
  // centrado, que es justo cuando la persona ya no necesita que se lo digan.
  const [progRostroUI, setProgRostroUI] = useState(0);
  const [rostroListoUI, setRostroListoUI] = useState(false);
  // ¿Este teléfono ya tiene los modelos guardados? Si los tiene no hay espera que
  // anunciar, y prometer uno la vuelve sospechosa. `null` = todavía no se sabe.
  const [primeraVez, setPrimeraVez] = useState<boolean | null>(null);
  const [metrica, setMetrica] = useState<{ camara?: number; rostro?: number }>({}); // solo dev

  // Los pasos del registro guiado, con su dibujo y su flecha (camaraRostro/pasosEnrolar.ts).
  const pasos: PasoGuiado[] = modo === 'enrolar' ? pasosDeEnrolamiento(pasoGafas) : [];

  useEffect(() => {
    let activo = true;
    let terminado = false;
    let stream: MediaStream | null = null;
    let cuadroId: number | null = null;
    let cuadroTimeout: ReturnType<typeof setTimeout> | null = null;
    let erroresSeguidos = 0;
    // Estado del reto DENTRO del bucle. Va en variables locales y no en React
    // porque el bucle lee esto muchas veces por segundo y un `setState` por
    // cuadro dispararía renders en cascada. Lo que sí va a React es solo lo que
    // se pinta, a través de `setFaseReto` y `setRetoOk`, que cambian pocas veces.
    let retoCumplido = false;
    let holdReto: number | null = null;
    const faseDelRetoRef = { current: 'GIRAR' as FaseDelReto };
    // La última lectura del giro que se pintó: solo se avisa a React cuando cambia la
    // regla o el texto, no en cada cuadro.
    let ultimaLectura: LecturaDelGiro = GIRO_SIN_EMPEZAR;

    // Estado del flujo (fuera de React para no re-renderizar por cuadro)
    const descriptoresPorPose: number[][] = [];
    const fotosPorPose: string[] = [];
    let idxPaso = 0;
    let holdInicio: number | null = null; // cuándo empezó a quedarse quieto
    let buffer: number[][] = [];           // descriptores acumulados en el hold
    let rostroListo = false;               // ¿ya cargó el modelo de reconocimiento?
    const encuadreEstable = crearEstabilizadorEncuadre();

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
        modelosEnCache().then(hay => { if (activo) setPrimeraVez(!hay); });
        // 1) Modelos livianos (detector + landmarks): con esto ya enciende la cámara.
        await cargarModelosLigeros(p => { if (activo) setProgModelos(p); });
        if (!activo) return;
        // 2) Reconocimiento (~6.1MB) en segundo plano: solo hace falta al capturar.
        cargarModeloRostro(p => { if (activo) setProgRostroUI(p); })
          .then(() => {
            if (!activo) return;
            rostroListo = true;
            setRostroListoUI(true);
            setMetrica(m => ({ ...m, rostro: Math.round(performance.now() - t0) }));
          })
          .catch(() => { /* si falla, el hold seguirá esperando; el padre maneja el error */ });

        stream = await navigator.mediaDevices.getUserMedia(RESTRICCIONES_VIDEO);
        if (!activo) { stream.getTracks().forEach(t => t.stop()); return; }
        await fijarZoomMinimo(stream);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        if (!activo) return;

        // El track suele renegociar la resolución en los primeros cientos de
        // milisegundos, y con `object-cover` eso se ve como si la imagen se
        // acercara y se alejara sola. Se espera a que deje de moverse ANTES de
        // enseñarla, y mientras tanto se dice qué está pasando.
        setEstado('calibrando');
        setMensaje('Calibrando la cámara…');
        if (videoRef.current) await esperarVideoEstable(videoRef.current);
        if (!activo) return;

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
              encuadreEstable.reiniciar();
              resetHold();
              programarSiguiente();
              return;
            }

            // El cuadro detectado tiembla; el estabilizador promedia posición y
            // tamaño antes de decidir, así el mensaje no salta cerca del umbral.
            const encuadre = encuadreEstable.siguiente(
              deteccion.detection.box, video.videoWidth, video.videoHeight,
            );
            if (encuadre !== 'OK') {
              setEncuadreOk(false);
              setMensaje(MSG_ENCUADRE[encuadre]);
              resetHold();
              programarSiguiente();
              return;
            }
            setEncuadreOk(true);

            // ¿Se cumple la condición para (seguir) capturando?
            const yaw = desviacionYaw(deteccion.landmarks);
            const paso = modo === 'enrolar' ? pasos[idxPaso] : null;

            // EL RETO DE GIRO, antes de todo lo demás. Una foto en la pantalla de
            // un celular no puede girar la cabeza cuando se le pide y volver al
            // frente. Comprobado el 9 de septiembre de 2026: una foto así se
            // aceptó y dio la MEJOR distancia del día, porque una foto es una
            // cara frontal, quieta y bien iluminada.
            //
            // No es un muro: inclinando el celular se falsea parte del giro. Por
            // eso el lado se sortea. Y el servidor no puede comprobar nada de
            // esto, porque el descriptor lo calcula el navegador.
            if (retoRef.current.activo && !retoCumplido) {
              const pedida = poseDelReto(faseDelRetoRef.current, retoRef.current.lado);
              if (faseDelRetoRef.current === 'GIRAR') {
                const lectura = lecturaDelGiro(retoRef.current.lado, yaw);
                if (lectura.encendidas !== ultimaLectura.encendidas || lectura.estado !== ultimaLectura.estado) {
                  ultimaLectura = lectura;
                  setLecturaGiro(lectura);
                }
              }
              if (!poseCumple(pedida, yaw)) {
                resetHold();
                programarSiguiente();
                return;
              }
              // Sostener el giro un instante evita que un temblor lo dé por
              // hecho. Es corto a propósito: alargarlo es lo que convirtió el
              // intento del parpadeo en algo que había que hacer "superfuerte".
              if (holdReto === null) holdReto = performance.now();
              if (performance.now() - holdReto < MS_QUIETO_GIRO) {
                programarSiguiente();
                return;
              }
              holdReto = null;
              if (faseDelRetoRef.current === 'GIRAR') {
                faseDelRetoRef.current = 'VOLVER';
                setFaseReto('VOLVER');
                programarSiguiente();
                return;
              }
              // Volvió al frente: el reto queda cumplido y sigue la captura normal.
              retoCumplido = true;
              setRetoOk(true);
            }

            const condicionOk = paso ? poseCumple(paso.tipo, yaw) : true;

            if (!condicionOk) {
              // Rompió la pose: reinicia el conteo de "quieto"
              if (paso) setMensaje(paso.texto);
              resetHold();
              programarSiguiente();
              return;
            }

            // La captura del descriptor necesita el modelo de reconocimiento (pesado).
            // Si aún está bajando, mantenemos el encuadre y esperamos con su %.
            // El porcentaje lo lleva el aviso fijo de abajo, que se ve siempre.
            if (!rostroListo) {
              setMensaje('Ya casi: terminando de preparar el reconocimiento');
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
                // Login: una sola muestra promediada, y a preguntarle al servidor.
                //
                // «VERIFICANDO…» Y NO «¡ROSTRO VERIFICADO!» (2 de octubre de 2026). Antes
                // salía un chulo verde con ese texto ANTES de preguntarle al servidor, y si
                // el servidor rechazaba la cara la pantalla se contradecía. Ahora la foto que
                // se tomó queda de fondo, desenfocada, con «Verificando…» hasta que el
                // servidor responda: si acepta, el kiosco cambia de pantalla; si no, llega
                // `errorExterno`. Y se entrega de una vez, sin los 400 ms de la animación.
                terminado = true;
                detenerCamara();
                setFotoVerificando(foto);
                setEstado('verificando');
                setMensaje('Verificando…');
                onCapturado([muestra], foto);
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
    // Lado nuevo en cada intento: si se repitiera, se podría ensayar.
    setLadoReto(sortearLado(Math.random()));
    setFaseReto('GIRAR');
    setRetoOk(false);
    setLecturaGiro(GIRO_SIN_EMPEZAR);
    setFotoVerificando(null);
    setIntento(i => i + 1);
  };

  const hayError = estado === 'error' || !!errorExterno;
  const verificando = estado === 'verificando' && !errorExterno;
  const colorOvalo = hayError ? '#f87171' : encuadreOk ? '#4ade80' : '#FFD85E';
  // La regla del giro solo mientras se gira: al volver al frente ya no dice nada útil.
  const mostrarMedidor = retoActivo && !retoOk && faseReto === 'GIRAR' && estado === 'guiando' && encuadreOk;
  const textoReto = textoDelReto(faseReto, lecturaGiro.estado);
  // Mientras se ve el aviso del reto, ese ES el mensaje: el de abajo se queda en el último
  // que puso el ciclo («Ubica tu rostro dentro del óvalo») y diría otra cosa a la vez.
  const avisoDelReto = retoActivo && !retoOk && estado === 'guiando' && encuadreOk && !hayError;

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
            {primeraVez !== false && (
              <p className="text-white/40 text-xs">Esto solo pasa la primera vez en este teléfono</p>
            )}
          </div>
        )}

        {/* Calibración: el track todavía puede cambiar de resolución y el recorte
            saltaría a la vista. Se tapa mientras se estabiliza y se explica. */}
        {estado === 'calibrando' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-8 text-center bg-ink/80 backdrop-blur-sm">
            <Camera className="text-white/60 animate-pulse" size={34} />
            <p className="text-white/85 text-sm font-medium">Calibrando la cámara…</p>
            <p className="text-white/40 text-xs">Un segundo, estamos ajustando el enfoque</p>
          </div>
        )}

        {/* La foto que se tomó, desenfocada, mientras el servidor verifica, y también si
            después la rechaza: con la cámara ya apagada, el fondo sería negro. */}
        {fotoVerificando && (estado === 'verificando' || hayError) && (
          <img src={fotoVerificando} alt="La foto que se está verificando"
            className="absolute inset-0 w-full h-full object-cover [transform:scaleX(-1)] scale-110 blur-md" />
        )}
        {verificando && (
          <div role="status" className="absolute inset-0 flex items-center justify-center">
            <span className="flex items-center gap-2 rounded-full bg-black/70 px-4 py-2 text-sm font-semibold text-white">
              <span aria-hidden="true" className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              Verificando…
            </span>
          </div>
        )}

        {/* Óvalo guía: oscurece alrededor y marca dónde debe ir el rostro */}
        {(estado === 'guiando' || hayError) && (
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
        {/* La regla del giro va en su propio SVG, con las mismas coordenadas del óvalo: el
            de arriba está oculto para los lectores de pantalla y esta sí tiene que decir
            cuánto va. */}
        {mostrarMedidor && (
          <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 75" preserveAspectRatio="none">
            <MedidorDeGiro lectura={lecturaGiro} lado={flechaDelReto(ladoReto)} />
          </svg>
        )}

        {/* EL RETO DE GIRO. Una flecha grande que late hacia el lado que toca, y
            nada de palabras como "derecha": el preview está espejado y ahí es
            donde se pierde la gente. La flecha no es ambigua, se sigue sin
            pensar, y su lado sale de la misma constante que la detección, así
            que no pueden contradecirse. */}
        {retoActivo && !retoOk && estado === 'guiando' && encuadreOk && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            {faseReto === 'GIRAR' ? (
              <div className={`absolute ${flechaDelReto(ladoReto) === 'izq' ? 'left-3' : 'right-3'} flex flex-col items-center gap-1`}>
                <div className="hp-ripple absolute inset-0 rounded-full bg-primary/30" />
                <div className="relative w-16 h-16 rounded-full bg-primary flex items-center justify-center shadow-lg">
                  {flechaDelReto(ladoReto) === 'izq'
                    ? <ArrowLeft size={34} className="text-ink" strokeWidth={3} />
                    : <ArrowRight size={34} className="text-ink" strokeWidth={3} />}
                </div>
              </div>
            ) : (
              <div className="relative w-16 h-16 rounded-full bg-green-400 flex items-center justify-center shadow-lg">
                <Check size={34} className="text-white" strokeWidth={3} />
              </div>
            )}
          </div>
        )}

        {/* LA FLECHA DE LOS GIROS DEL REGISTRO (14 de septiembre de 2026). El paso decía «Gira tu rostro
            a la derecha» para una pose que se hace girando hacia la izquierda propia, y la gente giraba
            al revés. La flecha sale de la misma regla que la del reto (pasosEnrolar.ts), así que no puede
            contradecir lo que espera la detección. Va aparte del bloque del reto a propósito: el ingreso
            del kiosco no se toca. Se esconde mientras sostiene la pose, para que no siga girando. */}
        {modo === 'enrolar' && estado === 'guiando' && encuadreOk && progreso === 0 && pasos[pasoActual]?.flecha && (
          <div className="absolute inset-0 pointer-events-none flex items-center">
            <div className={`absolute ${pasos[pasoActual].flecha === 'izq' ? 'left-3' : 'right-3'}`}>
              <div className="hp-ripple absolute inset-0 rounded-full bg-primary/30" />
              <div className="relative w-14 h-14 rounded-full bg-primary flex items-center justify-center shadow-lg">
                {pasos[pasoActual].flecha === 'izq'
                  ? <ArrowLeft size={30} className="text-ink" strokeWidth={3} />
                  : <ArrowRight size={30} className="text-ink" strokeWidth={3} />}
              </div>
            </div>
          </div>
        )}

        {/* Línea de escaneo mientras lee el rostro (CSS puro; funciona en Android) */}
        {estado === 'guiando' && encuadreOk && (
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="hp-scan-line absolute left-[18%] right-[18%] h-0.5 bg-green-400/80 rounded-full shadow-[0_0_8px_rgba(74,222,128,0.9)]" />
          </div>
        )}

        {/* EL «QUÉDATE QUIETO». En el ingreso, un 3, 2, 1 grande en la esquina (2 de
            octubre de 2026): antes era esta misma barra de pocos píxeles al borde, que casi
            nadie veía. El registro guiado sigue con la barra, porque allí manda la tarjeta
            del paso. */}
        {progreso > 0 && estado === 'guiando' && modo === 'login' && (
          <div aria-live="polite" className="absolute bottom-2 right-4 pointer-events-none">
            <span key={numeroDeLaCuenta(progreso)} className="hp-pop block text-6xl font-extrabold tabular-nums text-white [text-shadow:0_2px_10px_rgba(0,0,0,0.55)]">
              {numeroDeLaCuenta(progreso)}
            </span>
          </div>
        )}
        {progreso > 0 && estado === 'guiando' && modo === 'enrolar' && (
          <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-white/20">
            <div className="h-full bg-green-400 transition-[width] duration-100 ease-linear" style={{ width: `${Math.round(progreso * 100)}%` }} />
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

      {/* La instrucción del reto, en grande y de una sola cosa a la vez. Pedir dos
          cosas a la vez es lo que hizo fracasar el intento del parpadeo. */}
      {avisoDelReto && (
        <div className="w-full max-w-md rounded-xl bg-primary/20 px-4 py-3 text-center">
          <p className="text-base font-bold text-ink">{textoReto.titulo}</p>
          <p className="text-xs text-muted mt-0.5">{textoReto.detalle}</p>
        </div>
      )}

      {/* La tarjeta del paso que toca, con su dibujo (14 de septiembre de 2026). Se ve desde que la
          cámara se prepara, para que la persona sepa qué viene. */}
      {modo === 'enrolar' && !hayError && (estado === 'cargando' || estado === 'calibrando' || estado === 'guiando') && pasos[pasoActual] && (
        <TarjetaDePaso paso={pasos[pasoActual]} numero={pasoActual + 1} total={pasos.length} />
      )}

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

      {/* Mientras verifica no se repite «Verificando…» aquí abajo: ya lo dice la imagen. Y
          mientras está el aviso del reto, el aviso es el mensaje. */}
      {!verificando && !avisoDelReto && (
        <p className={`text-sm font-medium text-center ${hayError ? 'text-red-500' : 'text-muted'}`}>
          {estado === 'error' && <AlertTriangle size={14} className="inline mr-1 -mt-0.5" />}
          {errorExterno ?? (modo === 'enrolar' ? mensajeBajoLaTarjeta(mensaje, pasos[pasoActual]?.texto) : mensaje)}
        </p>
      )}

      {/* AVISO DE QUE LA FOTO QUEDA GUARDADA.
          No es decoración legal: es la única defensa que sirve contra un fraude
          CON CÓMPLICE. Todo lo que se le pueda pedir a alguien que sepa o tenga
          (un PIN, una clave, un segundo factor) el cómplice se lo presta con
          gusto, porque quiere que lo marquen. Lo que no se puede delegar es
          estar parado frente a la cámara: la foto graba la cara de quien oprime
          el botón, y aquí se enteran los DOS de que eso queda.
          Va fuera de todo condicional de estado a propósito. Si solo apareciera
          cuando la cámara ya funciona, no lo vería justo quien está a punto de
          irse por el camino de la cédula, que es el ataque más barato. */}
      {modo === 'login' && (
        <p className="text-[11px] text-center text-muted max-w-xs">
          Cada marcación guarda una foto que tu empresa puede revisar.
        </p>
      )}

      {/* Aviso fijo mientras baja el modelo pesado. Va aquí y no dentro del bucle
          de cuadros porque allí solo aparecía cuando el encuadre ya estaba bien:
          quien se está acomodando —el que de verdad necesita saber que falta— no
          lo veía nunca, y la espera parecía que el kiosco estuviera colgado. */}
      {!rostroListoUI && primeraVez === true && (estado === 'guiando' || estado === 'calibrando') && !hayError && (
        <div className="w-full max-w-md flex items-center gap-2.5 px-3 py-2 rounded-xl bg-primary/15">
          <div className="flex-1">
            <p className="text-xs font-semibold text-ink/80">
              Preparando el reconocimiento… {Math.round(progRostroUI * 100)}%
            </p>
            <div className="mt-1 h-1 rounded-full bg-black/10 overflow-hidden">
              <div className="h-full bg-primary transition-[width] duration-200 ease-out"
                style={{ width: `${Math.round(progRostroUI * 100)}%` }} />
            </div>
          </div>
          <span className="text-[10px] text-muted whitespace-nowrap">solo la 1ª vez</span>
        </div>
      )}

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
