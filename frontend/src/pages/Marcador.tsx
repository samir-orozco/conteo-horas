import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { infoKiosco, marcar as apiMarcar, type OpcionesMarca } from './marcador/api';
import { useSesionKiosco } from './marcador/useSesionKiosco';
import { useGeolocalizacion } from './marcador/useGeolocalizacion';
import { useVinculoDispositivo } from './marcador/useVinculoDispositivo';
import { useFlashResultado } from './marcador/useFlashResultado';
import PantallaResultado from './marcador/pantallas/PantallaResultado';
import PantallaVinculacion from './marcador/pantallas/PantallaVinculacion';
import PantallaLinkInvalido from './marcador/pantallas/PantallaLinkInvalido';
import PantallaUbicacion from './marcador/pantallas/PantallaUbicacion';
import PantallaLogin from './marcador/pantallas/PantallaLogin';
import PantallaSalidaTemprana from './marcador/pantallas/PantallaSalidaTemprana';
import PantallaMarcar from './marcador/pantallas/PantallaMarcar';
import RegresoOlvidado from './marcador/pantallas/RegresoOlvidado';
import { decidirUbicacion } from './marcador/decisionUbicacion';
import { mensajeGeo } from './marcador/geo';

// Kiosco HoraPro — se abre con el link único de cada empresa: /marcador/<token>
// Orquesta los hooks (sesión, geolocalización, dispositivo, flash) y decide qué
// pantalla mostrar. La lógica de cada parte vive en pages/marcador/.
export default function Marcador() {
  const { token: marcadorToken } = useParams<{ token: string }>();
  const [empresa, setEmpresa] = useState<string | null>(null);
  const [linkInvalido, setLinkInvalido] = useState(false);
  const [ahora, setAhora] = useState(new Date());

  // Config del kiosco (viene de /worker/kiosco/:token)
  const [permiteCedula, setPermiteCedula] = useState(true);
  const [exigeUbicacion, setExigeUbicacion] = useState(false);
  // Ya vio la pantalla que ofrece activar la ubicación y decidió seguir sin
  // darla. No es lo mismo que negar el permiso del navegador: es no querer ni
  // que se lo pregunten.
  const [omitioUbicacion, setOmitioUbicacion] = useState(false);

  // Estado del login/UI
  const [modoRostro, setModoRostro] = useState(false);
  const [capturaKey, setCapturaKey] = useState(0);
  const [fotoRostro, setFotoRostro] = useState<string | null>(null);
  const [cedula, setCedula] = useState('');
  const [errorLogin, setErrorLogin] = useState('');
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);
  const [marcando, setMarcando] = useState(false);

  // Salida temprana (se pide motivo antes de confirmar)
  // El servidor pidió motivo y NO marcó nada. Aquí se guardan las opciones con
  // las que hay que reintentar cuando la persona lo dé, o descartarlas si prefiere
  // volver atrás.
  const [salidaTemprana, setSalidaTemprana] = useState<null | OpcionesMarca>(null);
  const [novedadTipo, setNovedadTipo] = useState('MEDICO');
  const [novedadDesc, setNovedadDesc] = useState('');
  const [enviandoNovedad, setEnviandoNovedad] = useState(false);

  const sesion = useSesionKiosco(marcadorToken);
  const geo = useGeolocalizacion();

  // Qué hacer con la ubicación de QUIEN está marcando. Antes esto era una sola
  // pregunta por empresa; ahora depende de la persona, y la persona solo se
  // conoce después del login (por eso el valor por defecto es PRESENCIAL: antes
  // de saber quién es, la opción segura es la que valida).
  const decisionUbic = decidirUbicacion({
    modalidad: sesion.colaborador?.modalidad ?? 'PRESENCIAL',
    empresaPideUbicacion: exigeUbicacion,
    permiso: geo.permiso,
  });
  const vinculo = useVinculoDispositivo(marcadorToken, () => { setErrorLogin(''); setCapturaKey(k => k + 1); });

  const nombreColab = sesion.colaborador ? `${sesion.colaborador.nombre} ${sesion.colaborador.apellido}` : '';

  // salir(): libera la sesión y deja el kiosco listo para el siguiente colaborador
  const salir = () => {
    sesion.limpiarSesion();
    geo.limpiar();
    setOmitioUbicacion(false);
    setCedula('');
    setErrorLogin('');
    setModoRostro(!permiteCedula); // si solo hay rostro, vuelve a la cámara
    setFotoRostro(null);
    setCapturaKey(k => k + 1);
  };

  const { flash, cerrandoFlash, mostrarFlashOk, mostrarFlashError } = useFlashResultado(salir);

  const fallar = (msg: string) => {
    setErrorLogin(msg);
    setShake(true);
    setTimeout(() => setShake(false), 550);
  };

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
        setExigeUbicacion(info.exigeUbicacion === true);
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
      if (err.response?.data?.codigo === 'DISPOSITIVO_REQUERIDO') {
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
      if (err.response?.data?.codigo === 'DISPOSITIVO_REQUERIDO') {
        // Se mantiene modoRostro: al vincular vuelve a la cámara, no a la cédula
        vinculo.olvidarDispositivo();
        vinculo.setRequiereVinculo(true);
      } else {
        setErrorLogin(err.response?.data?.error ?? 'No pudimos reconocer tu rostro');
      }
    }
  };

  // Volvió del almuerzo pero se le pasó la hora: antes de abrir el turno se le
  // pregunta a qué hora regresó. Si no, marcar a las 17:00 el regreso de un
  // almuerzo de las 12:00 le borraría la tarde entera.
  const [preguntandoRegreso, setPreguntandoRegreso] = useState(false);

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
        ...(opciones?.regresoA ? { regresoA: opciones.regresoA } : {}),
        // El motivo de la salida temprana. Sin esto, `enviarNovedadTemprana`
        // reintentaba la marca EXACTAMENTE igual que la primera vez: el servidor
        // volvía a responder REQUIERE_MOTIVO, el catch de abajo reabría la
        // pantalla del motivo, y la persona quedaba encerrada sin poder marcar
        // su salida.
        ...(opciones?.novedadTipo ? { novedadTipo: opciones.novedadTipo } : {}),
        ...(opciones?.novedadDescripcion ? { novedadDescripcion: opciones.novedadDescripcion } : {}),
      });
      mostrarFlashOk(r.accion, r.hora, nombreColab, r.salidaAlmuerzo);
    } catch (err: any) {
      // Se va antes de que termine su jornada: el servidor NO marcó nada y pide
      // el motivo. Salir al descanso nunca llega aquí.
      if (err.response?.status === 409 && err.response?.data?.codigo === 'REQUIERE_MOTIVO') {
        // Si YA veníamos con motivo y el servidor lo vuelve a pedir, el problema
        // no es que falte: es que no le sirvió. Reabrir la pantalla en silencio
        // deja a la persona dando vueltas sin entender por qué, delante del
        // kiosco y con la fila esperando. Se dice que falló y se sale.
        if (opciones?.novedadTipo) {
          mostrarFlashError('No pudimos registrar el motivo de tu salida. Avisa a tu supervisor.');
          return;
        }
        setNovedadTipo('MEDICO');
        setNovedadDesc('');
        setSalidaTemprana(opciones ?? {});
        return;
      }
      mostrarFlashError(err.response?.data?.error ?? 'No pudimos registrar tu marcación. Intenta de nuevo.');
    } finally {
      setMarcando(false);
    }
  };

  // Con el motivo en la mano se reintenta la marca. La salida y la novedad se
  // guardan en la MISMA llamada: separadas, un fallo de la segunda dejaba la
  // jornada cerrada y el motivo perdido.
  const enviarNovedadTemprana = async () => {
    if (!salidaTemprana) return;
    const opciones = salidaTemprana;
    setEnviandoNovedad(true);
    setSalidaTemprana(null);
    await marcar({ ...opciones, novedadTipo, novedadDescripcion: novedadDesc });
    setEnviandoNovedad(false);
  };

  // Volver atrás: no hay nada que deshacer, porque no se marcó nada.
  const cancelarSalidaTemprana = () => setSalidaTemprana(null);

  // ===== Selección de pantalla (mismo orden que antes) =====
  if (flash) return <PantallaResultado flash={flash} cerrandoFlash={cerrandoFlash} />;
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
        empresa={empresa} permiteCedula={permiteCedula} modoRostro={modoRostro}
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
  if (preguntandoRegreso && sesion.estado?.salidaAlmuerzo && sesion.estado.regresoSugerido) {
    return (
      <RegresoOlvidado
        salida={sesion.estado.salidaAlmuerzo}
        sugerido={sesion.estado.regresoSugerido}
        ahora={ahora}
        marcando={marcando}
        onConfirmar={regresoA => { setPreguntandoRegreso(false); marcar({ regresoA }); }}
        onCancelar={() => setPreguntandoRegreso(false)}
      />
    );
  }
  if (salidaTemprana) {
    return (
      <PantallaSalidaTemprana
        novedadTipo={novedadTipo} setNovedadTipo={setNovedadTipo}
        novedadDesc={novedadDesc} setNovedadDesc={setNovedadDesc}
        enviarNovedadTemprana={enviarNovedadTemprana} onVolver={cancelarSalidaTemprana}
        enviandoNovedad={enviandoNovedad}
      />
    );
  }
  return (
    <PantallaMarcar
      colaborador={sesion.colaborador} sedes={sesion.sedes} ahora={ahora} estado={sesion.estado}
      marcar={marcar} marcando={marcando}
      onRegresoOlvidado={() => setPreguntandoRegreso(true)}
      decisionUbic={decisionUbic} salir={salir}
    />
  );
}
