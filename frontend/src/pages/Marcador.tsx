import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { infoKiosco, marcar as apiMarcar, enviarNovedad as apiEnviarNovedad } from './marcador/api';
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
  const [salidaTemprana, setSalidaTemprana] = useState<null | { accion: 'ENTRADA' | 'SALIDA'; hora: string }>(null);
  const [novedadTipo, setNovedadTipo] = useState('MEDICO');
  const [novedadDesc, setNovedadDesc] = useState('');
  const [enviandoNovedad, setEnviandoNovedad] = useState(false);

  const sesion = useSesionKiosco(marcadorToken);
  const geo = useGeolocalizacion();
  const vinculo = useVinculoDispositivo(marcadorToken, () => { setErrorLogin(''); setCapturaKey(k => k + 1); });

  const nombreColab = sesion.colaborador ? `${sesion.colaborador.nombre} ${sesion.colaborador.apellido}` : '';

  // salir(): libera la sesión y deja el kiosco listo para el siguiente colaborador
  const salir = () => {
    sesion.limpiarSesion();
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

  const marcar = async (opciones?: { almuerzo?: boolean }) => {
    if (!sesion.token || marcando) return;
    setMarcando(true);
    geo.setErrorUbic(null);
    try {
      let ubic: { lat?: number; lng?: number } = {};
      if (exigeUbicacion) {
        // Ya capturamos la ubicación al entrar (gate). Refrescamos y, si falla,
        // usamos la del gate (permiso ya concedido → esto casi nunca falla).
        try {
          ubic = await geo.obtenerUbicacion();
        } catch {
          if (geo.ubicOk) ubic = geo.ubicOk;
        }
      }
      const r = await apiMarcar(sesion.token, {
        foto: fotoRostro ?? undefined, ...ubic,
        ...(opciones?.almuerzo ? { almuerzo: true } : {}),
      });
      // Si salió antes de su horario, primero pedimos el motivo (queda como novedad).
      // Salir a almorzar nunca pide motivo: el servidor ya no lo marca como temprana.
      if (r.accion === 'SALIDA' && r.salidaTemprana) {
        setNovedadTipo('MEDICO');
        setNovedadDesc('');
        setSalidaTemprana({ accion: r.accion, hora: r.hora });
      } else {
        mostrarFlashOk(r.accion, r.hora, nombreColab, r.salidaAlmuerzo);
      }
    } catch (err: any) {
      mostrarFlashError(err.response?.data?.error ?? 'No pudimos registrar tu marcación. Intenta de nuevo.');
    } finally {
      setMarcando(false);
    }
  };

  // La salida ya quedó registrada; esto solo adjunta el motivo como novedad pendiente.
  const enviarNovedadTemprana = async (omitir: boolean) => {
    if (!salidaTemprana) return;
    const { accion, hora } = salidaTemprana;
    if (!omitir) {
      setEnviandoNovedad(true);
      try {
        await apiEnviarNovedad(sesion.token!, { tipo: novedadTipo, descripcion: novedadDesc });
      } catch { /* la salida ya está guardada; si falla la novedad no bloqueamos */ }
      setEnviandoNovedad(false);
    }
    setSalidaTemprana(null);
    mostrarFlashOk(accion, hora, nombreColab);
  };

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
  if (empresa && exigeUbicacion && !geo.ubicOk) {
    return <PantallaUbicacion empresa={empresa} errorUbic={geo.errorUbic} activarUbicacion={geo.activarUbicacion} buscandoUbic={geo.buscandoUbic} />;
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
  if (salidaTemprana) {
    return (
      <PantallaSalidaTemprana
        novedadTipo={novedadTipo} setNovedadTipo={setNovedadTipo}
        novedadDesc={novedadDesc} setNovedadDesc={setNovedadDesc}
        enviarNovedadTemprana={enviarNovedadTemprana} enviandoNovedad={enviandoNovedad}
      />
    );
  }
  return (
    <PantallaMarcar
      colaborador={sesion.colaborador} sedes={sesion.sedes} ahora={ahora} estado={sesion.estado}
      marcar={marcar} marcando={marcando}
      exigeUbicacion={exigeUbicacion} ubicOk={geo.ubicOk} salir={salir}
    />
  );
}
