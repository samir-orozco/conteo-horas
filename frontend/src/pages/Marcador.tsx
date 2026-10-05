import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { infoKiosco, marcar as apiMarcar, avisarNoSoy, guardarClima, enviarObservacionClima, type OpcionesMarca, type ClimaDeLaSalida } from './marcador/api';
import { useCierrePorInactividad, MS_INACTIVIDAD_KIOSCO } from './marcador/useCierrePorInactividad';
import { useSesionKiosco } from './marcador/useSesionKiosco';
import { useGeolocalizacion } from './marcador/useGeolocalizacion';
import { useVinculoDispositivo } from './marcador/useVinculoDispositivo';
import { useFlashResultado } from './marcador/useFlashResultado';
import PantallaResultado from './marcador/pantallas/PantallaResultado';
import PantallaVinculacion from './marcador/pantallas/PantallaVinculacion';
import PantallaLinkInvalido from './marcador/pantallas/PantallaLinkInvalido';
import PantallaKioscoPausado from './marcador/pantallas/PantallaKioscoPausado';
import PantallaUbicacion from './marcador/pantallas/PantallaUbicacion';
import PantallaLogin from './marcador/pantallas/PantallaLogin';
import PantallaMotivo from './marcador/pantallas/PantallaMotivo';
import { decidirTrasErrorDeMarca, type CasoMotivo } from './marcador/motivoDeMarca';
import PantallaMarcar from './marcador/pantallas/PantallaMarcar';
import RegresoOlvidado from './marcador/pantallas/RegresoOlvidado';
import PantallaClima from './marcador/pantallas/PantallaClima';
import { horaDoce } from '../lib/fechas';
import { decidirUbicacion } from './marcador/decisionUbicacion';
import { mensajeGeo } from './marcador/geo';

// Kiosco HoraPro — se abre con el link único de cada empresa: /marcador/<token>
// Orquesta los hooks (sesión, geolocalización, dispositivo, flash) y decide qué
// pantalla mostrar. La lógica de cada parte vive en pages/marcador/.
export default function Marcador() {
  const { token: marcadorToken } = useParams<{ token: string }>();
  const [empresa, setEmpresa] = useState<string | null>(null);
  const [linkInvalido, setLinkInvalido] = useState(false);
  // Pausado por falta de pago (4 de octubre de 2026): lo dice el servidor al cargar, o al intentar entrar
  // si la pausa empezó con la pantalla ya abierta.
  const [kioscoPausado, setKioscoPausado] = useState(false);
  const [ahora, setAhora] = useState(new Date());

  // Config del kiosco (viene de /worker/kiosco/:token)
  const [permiteCedula, setPermiteCedula] = useState(true);
  // ¿El ingreso facial pide girar la cabeza? Lo decide el servidor por empresa.
  // Por defecto NO, y se asume que no mientras la respuesta no diga lo contrario:
  // un fallo cargando la configuración no puede dejar a nadie sin poder marcar.
  const [exigeReto, setExigeReto] = useState(false);
  const [exigeUbicacion, setExigeUbicacion] = useState(false);
  // Ya vio la pantalla que ofrece activar la ubicación y decidió seguir sin
  // darla. No es lo mismo que negar el permiso del navegador: es no querer ni
  // que se lo pregunten.
  const [omitioUbicacion, setOmitioUbicacion] = useState(false);

  // Estado del login/UI. Abre en el rostro aunque la empresa permita la cédula, que queda como
  // segunda opción (decisión del dueño del 15 de septiembre de 2026).
  const [modoRostro, setModoRostro] = useState(true);
  const [capturaKey, setCapturaKey] = useState(0);
  const [fotoRostro, setFotoRostro] = useState<string | null>(null);
  const [cedula, setCedula] = useState('');
  const [errorLogin, setErrorLogin] = useState('');
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);
  const [marcando, setMarcando] = useState(false);

  // Motivo de una salida temprana o de una llegada tarde. El servidor lo pidió y
  // NO marcó nada: aquí se guardan el caso y las opciones con las que hay que
  // reintentar cuando la persona lo dé, o descartarlas si prefiere volver atrás.
  const [pideMotivo, setPideMotivo] = useState<null | { caso: CasoMotivo; opciones: OpcionesMarca }>(null);
  const [novedadTipo, setNovedadTipo] = useState('MEDICO');
  const [novedadDesc, setNovedadDesc] = useState('');
  const [enviandoNovedad, setEnviandoNovedad] = useState(false);
  // Volvió de una pausa —almuerzo o descanso— pero se le pasó la hora: antes de
  // abrir el turno se le pregunta a qué hora regresó. Si no, marcar a las 17:00
  // el regreso de un almuerzo de las 12:00 le borraría la tarde entera.
  const [preguntandoRegreso, setPreguntandoRegreso] = useState(false);
  // CLIMA LABORAL (4 de octubre de 2026). La respuesta de la salida trae con qué abrir la ventana de
  // las caritas, pero la ventana sale DESPUÉS del aviso verde: mientras tanto se guarda aquí, en un
  // ref, porque quien la lee es el cierre del aviso. La hora va con ella para decir en la ventana a
  // qué hora quedó la salida.
  //
  // Va ATADA a quien marcó (`colaboradorId`): solo se muestra si la sesión abierta es la de esa persona.
  // Con la red pegada, un cierre a destiempo podía dejar la ventana de una persona lista para la
  // siguiente, con el token de la primera (revisión adversarial del 4 de octubre de 2026).
  type ClimaDeAlguien = ClimaDeLaSalida & { hora: string; colaboradorId: string };
  const climaPendiente = useRef<ClimaDeAlguien | null>(null);
  const [clima, setClima] = useState<ClimaDeAlguien | null>(null);

  const sesion = useSesionKiosco(marcadorToken);
  const geo = useGeolocalizacion();

  // Qué hacer con la ubicación de QUIEN está marcando. Antes esto era una sola
  // pregunta por empresa; ahora depende de la persona, y la persona solo se
  // conoce después del login (por eso el valor por defecto es PRESENCIAL: antes
  // de saber quién es, la opción segura es la que valida).
  const decisionUbic = decidirUbicacion({
    modalidad: sesion.colaborador?.modalidad ?? 'PRESENCIAL',
    // Del login, que es quien sabe de esta persona. Antes de que exista sesión
    // se cae a la config de la empresa, que es lo único disponible ahí.
    validaUbicacion: sesion.validaUbicacion ?? exigeUbicacion,
    permiso: geo.permiso,
  });
  const vinculo = useVinculoDispositivo(marcadorToken, () => { setErrorLogin(''); setCapturaKey(k => k + 1); });

  const nombreColab = sesion.colaborador ? `${sesion.colaborador.nombre} ${sesion.colaborador.apellido}` : '';

  // salir(): libera la sesión y deja el kiosco listo para el siguiente colaborador.
  //
  // `mismaPersona`: la que se va es la misma que se queda («No soy X» pasa a la
  // cédula con la misma persona al frente). Entonces no se le vuelve a preguntar
  // por la ubicación que ya dio o que ya decidió no dar.
  const salir = ({ mismaPersona = false }: { mismaPersona?: boolean } = {}) => {
    sesion.limpiarSesion();
    if (!mismaPersona) {
      geo.limpiar();
      setOmitioUbicacion(false);
    }
    setCedula('');
    setErrorLogin('');
    setModoRostro(true); // vuelve a la cámara, aunque quien marcó haya entrado con la cédula
    setFotoRostro(null);
    setCapturaKey(k => k + 1);
    // LO QUE VIVE AQUÍ Y NO EN LA PANTALLA DE LA PERSONA (2 de octubre de 2026). La
    // pantalla del motivo y la del regreso olvidado cuelgan del Marcador, que no se
    // desmonta. Antes daba igual porque salir() solo corría tras una marca; con el
    // cierre por inactividad corre con cualquiera abierta, y la siguiente persona
    // caía en la de la anterior, con su texto y un botón de un toque.
    setPideMotivo(null);
    setPreguntandoRegreso(false);
    setNovedadTipo('MEDICO');
    setNovedadDesc('');
    // La ventana de las caritas también: es de la persona que se va.
    climaPendiente.current = null;
    setClima(null);
  };

  // Al cerrarse el aviso de una marca, o se abre la ventana de las caritas o se libera el kiosco.
  const { flash, cerrandoFlash, mostrarFlashOk, mostrarFlashError } = useFlashResultado(() => {
    const pendiente = climaPendiente.current;
    climaPendiente.current = null;
    if (pendiente) setClima(pendiente);
    else salir();
  });

  // «NO SOY X» (2 de octubre de 2026). Queda la huella en el servidor y se descarta
  // la sesión. Si la empresa permite la cédula, sigue por ahí CON la foto que se
  // acaba de tomar, que es de quien está frente al kiosco: volver a la cámara la
  // reconocería otra vez como la misma persona.
  const noSoy = () => {
    const token = sesion.token;
    const foto = fotoRostro;
    if (token) avisarNoSoy(token).catch(() => { /* la huella es para medir; no detiene a nadie */ });
    salir({ mismaPersona: true });
    if (permiteCedula) {
      setModoRostro(false);
      setFotoRostro(foto);
    } else {
      setErrorLogin('Si el kiosco no te reconoce bien, avísale a tu administrador.');
    }
  };

  const fallar = (msg: string) => {
    setErrorLogin(msg);
    setShake(true);
    setTimeout(() => setShake(false), 550);
  };

  // NADIE QUEDA CON LA PANTALLA DE OTRO (2 de octubre de 2026). Con una sesión
  // abierta, o en la pantalla de la cédula (que puede guardar la foto de alguien
  // que se fue sin escribirla), treinta segundos sin tocar nada vuelven a la
  // cámara. Mientras se marca o se envía, no corre.
  useCierrePorInactividad(
    !flash && !marcando && !loading && (!!sesion.token || !modoRostro),
    MS_INACTIVIDAD_KIOSCO,
    () => salir(),
  );

  // Reloj en vivo
  useEffect(() => {
    const t = setInterval(() => setAhora(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Validar el link del kiosco y su configuración
  useEffect(() => {
    if (!marcadorToken) { setLinkInvalido(true); return; }
    infoKiosco(marcadorToken)
      .then(info => {
        setEmpresa(info.empresa);
        setKioscoPausado(info.pausado === true);
        setExigeUbicacion(info.exigeUbicacion === true);
        setExigeReto(info.exigeReto === true);
        if (info.permiteCedula === false) {
          setPermiteCedula(false);
          setModoRostro(true); // solo rostro: entra directo a la cámara
        }
        if (info.requiereDispositivo && !vinculo.getDeviceToken()) {
          vinculo.setRequiereVinculo(true);
        }
      })
      .catch(() => setLinkInvalido(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [marcadorToken]);

  const ingresar = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorLogin('');
    try {
      await sesion.ingresar(cedula, vinculo.getDeviceToken());
    } catch (err: any) {
      if (err.response?.data?.codigo === 'KIOSCO_PAUSADO') {
        setKioscoPausado(true);
      } else if (err.response?.data?.codigo === 'DISPOSITIVO_REQUERIDO') {
        vinculo.olvidarDispositivo();
        vinculo.setRequiereVinculo(true);
      } else {
        fallar(err.response?.data?.error ?? 'No pudimos conectarte. Reintenta.');
      }
    } finally {
      setLoading(false);
    }
  };

  // El descriptor (128 floats) ya viene calculado desde CamaraRostro; la imagen
  // nunca sale del dispositivo.
  const loginConRostro = async (descriptor: number[], foto: string) => {
    setErrorLogin('');
    try {
      await sesion.ingresarRostro(descriptor, vinculo.getDeviceToken());
      setFotoRostro(foto);
      setModoRostro(false);
    } catch (err: any) {
      if (err.response?.data?.codigo === 'KIOSCO_PAUSADO') {
        setKioscoPausado(true);
      } else if (err.response?.data?.codigo === 'DISPOSITIVO_REQUERIDO') {
        // Se mantiene modoRostro: al vincular vuelve a la cámara, no a la cédula
        vinculo.olvidarDispositivo();
        vinculo.setRequiereVinculo(true);
      } else {
        setErrorLogin(err.response?.data?.error ?? 'No pudimos reconocer tu rostro');
      }
    }
  };

  const marcar = async (opciones?: OpcionesMarca) => {
    if (!sesion.token || marcando) return;
    setMarcando(true);
    geo.setErrorUbic(null);
    try {
      let ubic: { lat?: number; lng?: number } = {};
      // Quién necesita coordenadas lo decide la modalidad de ESTA persona, no la
      // configuración de la empresa. Antes se capturaban siempre que la empresa
      // usara geolocalización, incluso para quien tenía prometido que no.
      if (decisionUbic.capturarCoords) {
        try {
          ubic = await geo.obtenerUbicacion();
        } catch (e) {
          // Ya NO se cae de vuelta a `geo.ubicOk`. Sin muro, esa lectura puede
          // ser de otra persona de hace horas en la misma tablet: para un
          // presencial dejaría pasar una marca desde fuera con una lectura vieja
          // de dentro, y para un híbrido escribiría la sede equivocada, que es
          // justo el dato que esta funcionalidad viene a producir.
          geo.setErrorUbic(mensajeGeo(e));
        }
      }
      const r = await apiMarcar(sesion.token, {
        foto: fotoRostro ?? undefined, ...ubic,
        ...(opciones?.almuerzo ? { almuerzo: true } : {}),
        ...(opciones?.descanso ? { descanso: true } : {}),
        ...(opciones?.regresoA ? { regresoA: opciones.regresoA } : {}),
        // El motivo de la salida temprana. Sin esto, `enviarNovedadTemprana`
        // reintentaba la marca EXACTAMENTE igual que la primera vez: el servidor
        // volvía a responder REQUIERE_MOTIVO, el catch de abajo reabría la
        // pantalla del motivo, y la persona quedaba encerrada sin poder marcar
        // su salida.
        ...(opciones?.novedadTipo ? { novedadTipo: opciones.novedadTipo } : {}),
        ...(opciones?.novedadDescripcion ? { novedadDescripcion: opciones.novedadDescripcion } : {}),
      });
      // Si el servidor la pidió, la ventana de las caritas se abre al cerrarse el aviso. Quién decide
      // que toca (salida que cierra la jornada, plan con el módulo, sin calificar hoy) es el servidor.
      climaPendiente.current = r.clima && sesion.colaborador
        ? { ...r.clima, hora: horaDoce(r.hora), colaboradorId: sesion.colaborador.id }
        : null;
      // La pausa la confirma el SERVIDOR, no el botón que se tocó: si la ventana
      // ya no aplicaba, la marca quedó como salida normal y la pantalla lo dice.
      mostrarFlashOk(r.accion, r.hora, nombreColab,
        r.salidaAlmuerzo ? 'ALMUERZO' : r.salidaDescanso ? 'DESCANSO' : undefined);
    } catch (err: any) {
      // El servidor puede NO haber marcado por dos razones que no son fallos: se
      // va antes de hora o llega tarde, y en los dos casos pide el motivo. Qué
      // hacer con cada respuesta lo decide `decidirTrasErrorDeMarca`, con sus
      // pruebas, incluido no reabrir la pantalla si el motivo ya no sirvió.
      const decision = decidirTrasErrorDeMarca(err, !!opciones?.novedadTipo);
      if (decision.accion === 'PEDIR_MOTIVO') {
        setNovedadTipo('MEDICO');
        setNovedadDesc('');
        setPideMotivo({ caso: decision.caso, opciones: opciones ?? {} });
        return;
      }
      mostrarFlashError(decision.mensaje);
    } finally {
      setMarcando(false);
    }
  };

  // Con el motivo en la mano se reintenta la marca. La marca y la novedad se
  // guardan en la MISMA llamada: separadas, un fallo de la segunda dejaba la
  // marca escrita y el motivo perdido.
  const enviarMotivo = async () => {
    if (!pideMotivo) return;
    const { opciones } = pideMotivo;
    setEnviandoNovedad(true);
    setPideMotivo(null);
    await marcar({ ...opciones, novedadTipo, novedadDescripcion: novedadDesc });
    setEnviandoNovedad(false);
  };

  // Volver atrás: no hay nada que deshacer, porque no se marcó nada.
  const cancelarMotivo = () => setPideMotivo(null);

  // ===== Selección de pantalla (mismo orden que antes) =====
  if (flash) return <PantallaResultado flash={flash} cerrandoFlash={cerrandoFlash} />;
  if (clima && clima.colaboradorId === sesion.colaborador?.id) {
    return (
      <PantallaClima
        nombre={sesion.colaborador.nombre} hora={clima.hora} motivos={clima.motivos}
        guardar={c => guardarClima(clima.token, c)}
        enviarObservacion={o => enviarObservacionClima(clima.token, o)}
        onTerminar={() => salir()}
      />
    );
  }
  if (kioscoPausado) return <PantallaKioscoPausado empresa={empresa} />;
  if (vinculo.requiereVinculo && !linkInvalido) {
    return (
      <PantallaVinculacion
        empresa={empresa} vincular={vinculo.vincular}
        codigoVinculo={vinculo.codigoVinculo} setCodigoVinculo={vinculo.setCodigoVinculo}
        setErrorVinculo={vinculo.setErrorVinculo} errorVinculo={vinculo.errorVinculo} vinculando={vinculo.vinculando}
      />
    );
  }
  if (linkInvalido) return <PantallaLinkInvalido />;
  // Se OFRECE la ubicación antes del login, no se exige. Antes esto era un muro
  // (`!geo.ubicOk` y no se pasaba de ahí), y esa decisión se tomaba por EMPRESA,
  // cuando todavía no se sabe quién va a marcar: a un remoto lo dejaba plantado
  // sin llegar nunca a la pantalla de login. Quien decide bloquear es el
  // servidor, ya sabiendo quién es la persona.
  //
  // La condición mira `errorUbic` además de `sin-preguntar` porque al fallar el
  // GPS el permiso pasa a 'negado' en el mismo render: sin eso la pantalla se
  // desmontaba justo cuando tenía algo que explicar, y su guía de iOS/Android y
  // su botón de reintentar quedaban inalcanzables. Con esto se queda, y la
  // puerta para seguir es el botón, no un fallo del navegador.
  if (empresa && exigeUbicacion && (geo.permiso === 'sin-preguntar' || geo.errorUbic) && !omitioUbicacion) {
    return (
      <PantallaUbicacion
        empresa={empresa} errorUbic={geo.errorUbic}
        activarUbicacion={geo.activarUbicacion} buscandoUbic={geo.buscandoUbic}
        onContinuar={() => setOmitioUbicacion(true)}
      />
    );
  }
  if (!sesion.token || !sesion.colaborador) {
    return (
      <PantallaLogin
        empresa={empresa} permiteCedula={permiteCedula} exigeReto={exigeReto} modoRostro={modoRostro}
        onModoCedula={() => { setModoRostro(false); setErrorLogin(''); }}
        onModoRostro={() => { setErrorLogin(''); setFotoRostro(null); setModoRostro(true); }}
        shake={shake} capturaKey={capturaKey}
        loginConRostro={loginConRostro}
        onUsarCedula={foto => { setFotoRostro(foto); setModoRostro(false); setErrorLogin(''); }}
        onReintentar={() => { setErrorLogin(''); setCapturaKey(k => k + 1); }}
        errorLogin={errorLogin} ahora={ahora} fotoRostro={fotoRostro}
        cedula={cedula} onCedulaChange={v => { setCedula(v); setErrorLogin(''); }}
        ingresar={ingresar} loading={loading}
      />
    );
  }
  // De qué pausa está volviendo, si salió a una. El servidor manda una sola.
  const pausaSinVolver = sesion.estado?.enAlmuerzo && sesion.estado.salidaAlmuerzo
    ? { pausa: 'ALMUERZO' as const, salida: sesion.estado.salidaAlmuerzo }
    : sesion.estado?.enDescanso && sesion.estado.salidaDescanso
      ? { pausa: 'DESCANSO' as const, salida: sesion.estado.salidaDescanso }
      : null;
  if (preguntandoRegreso && pausaSinVolver && sesion.estado?.regresoSugerido) {
    return (
      <RegresoOlvidado
        pausa={pausaSinVolver.pausa}
        salida={pausaSinVolver.salida}
        sugerido={sesion.estado.regresoSugerido}
        ahora={ahora}
        marcando={marcando}
        onConfirmar={regresoA => { setPreguntandoRegreso(false); marcar({ regresoA }); }}
        onCancelar={() => setPreguntandoRegreso(false)}
      />
    );
  }
  if (pideMotivo) {
    return (
      <PantallaMotivo
        caso={pideMotivo.caso}
        novedadTipo={novedadTipo} setNovedadTipo={setNovedadTipo}
        novedadDesc={novedadDesc} setNovedadDesc={setNovedadDesc}
        onConfirmar={enviarMotivo} onVolver={cancelarMotivo}
        enviando={enviandoNovedad}
      />
    );
  }
  return (
    <PantallaMarcar
      colaborador={sesion.colaborador} sedes={sesion.sedes} ahora={ahora} estado={sesion.estado}
      marcar={marcar} marcando={marcando}
      onRegresoOlvidado={() => setPreguntandoRegreso(true)}
      decisionUbic={decisionUbic} salir={() => salir()}
      onNoSoy={noSoy}
      fotoReferencia={sesion.fotoReferencia}
      parecidoDudoso={sesion.parecidoDudoso}
    />
  );
}
