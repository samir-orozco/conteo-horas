import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { LogIn, LogOut, Check, X, Link2Off, ScanFace } from 'lucide-react';
import axios from 'axios';
import logoSimplificado from '../assets/logo-simplificado.svg';
import CamaraRostro from '../components/CamaraRostro';

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api' });

type Colaborador = { id: string; nombre: string; apellido: string; cargo: string | null };
type Estado = { dentroAhora: boolean; entradaAbierta: { entrada: string } | null };
type Flash =
  | { tipo: 'ok'; accion: 'ENTRADA' | 'SALIDA'; hora: string; nombre: string }
  | { tipo: 'error'; msg: string }
  | null;

// Kiosco HoraPro — se abre con el link único de cada empresa: /marcador/<token>
export default function Marcador() {
  const { token: marcadorToken } = useParams<{ token: string }>();
  const [empresa, setEmpresa] = useState<string | null>(null);
  const [linkInvalido, setLinkInvalido] = useState(false);

  // Seguridad: dispositivos autorizados (si la empresa lo activó)
  const claveDispositivo = `hp_kiosco_${marcadorToken}`;
  const [requiereVinculo, setRequiereVinculo] = useState(false);
  const [codigoVinculo, setCodigoVinculo] = useState('');
  const [errorVinculo, setErrorVinculo] = useState('');
  const [vinculando, setVinculando] = useState(false);

  const [token, setToken] = useState<string | null>(null);
  const [colaborador, setColaborador] = useState<Colaborador | null>(null);
  const [estado, setEstado] = useState<Estado | null>(null);
  const [flash, setFlash] = useState<Flash>(null);
  const [cerrandoFlash, setCerrandoFlash] = useState(false);
  const [ahora, setAhora] = useState(new Date());
  const [marcando, setMarcando] = useState(false);

  const [cedula, setCedula] = useState('');
  const [errorLogin, setErrorLogin] = useState('');
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);

  // Método alterno de marcación: reconocimiento facial (corre 100% en el navegador)
  const [modoRostro, setModoRostro] = useState(false);
  const [capturaKey, setCapturaKey] = useState(0);
  // La empresa puede desactivar la cédula (Configuración → Marcación): solo rostro
  const [permiteCedula, setPermiteCedula] = useState(true);
  // Foto tomada al verificar el rostro: se adjunta a la marcación como evidencia
  const [fotoRostro, setFotoRostro] = useState<string | null>(null);

  // Reloj en vivo
  useEffect(() => {
    const t = setInterval(() => setAhora(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Validar el link del kiosco y si exige dispositivo autorizado
  useEffect(() => {
    if (!marcadorToken) { setLinkInvalido(true); return; }
    api.get(`/worker/kiosco/${marcadorToken}`)
      .then(r => {
        setEmpresa(r.data.empresa);
        if (r.data.permiteCedula === false) {
          setPermiteCedula(false);
          setModoRostro(true); // solo rostro: entra directo a la cámara
        }
        if (r.data.requiereDispositivo && !localStorage.getItem(claveDispositivo)) {
          setRequiereVinculo(true);
        }
      })
      .catch(() => setLinkInvalido(true));
  }, [marcadorToken]);

  const vincular = async (e: React.FormEvent) => {
    e.preventDefault();
    setVinculando(true);
    setErrorVinculo('');
    try {
      const r = await api.post('/worker/vincular', { marcadorToken, codigo: codigoVinculo });
      localStorage.setItem(claveDispositivo, r.data.deviceToken);
      setRequiereVinculo(false);
      setCodigoVinculo('');
      setErrorLogin('');
      setCapturaKey(k => k + 1); // si venía en modo rostro, la cámara arranca limpia
    } catch (err: any) {
      setErrorVinculo(err.response?.data?.error ?? 'Código inválido');
    } finally {
      setVinculando(false);
    }
  };

  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  const cargarEstado = useCallback(async (t: string) => {
    const r = await api.get('/worker/estado', { headers: { Authorization: `Bearer ${t}` } });
    setEstado(r.data);
  }, []);

  const salir = () => {
    setToken(null);
    setColaborador(null);
    setEstado(null);
    setCedula('');
    setErrorLogin('');
    setModoRostro(!permiteCedula); // si solo hay rostro, vuelve a la cámara
    setFotoRostro(null);
    setCapturaKey(k => k + 1);
  };

  // Cierra la pantalla de resultado con una animación de salida antes de desmontarla
  const cerrarFlash = (despues?: () => void) => {
    setCerrandoFlash(true);
    setTimeout(() => {
      setFlash(null);
      setCerrandoFlash(false);
      despues?.();
    }, 320);
  };

  const fallar = (msg: string) => {
    setErrorLogin(msg);
    setShake(true);
    setTimeout(() => setShake(false), 550);
  };

  const ingresar = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorLogin('');
    try {
      const r = await api.post('/worker/login', {
        cedula, marcadorToken,
        deviceToken: localStorage.getItem(claveDispositivo) ?? undefined,
      });
      setToken(r.data.token);
      setColaborador(r.data.colaborador);
      await cargarEstado(r.data.token);
    } catch (err: any) {
      if (err.response?.data?.codigo === 'DISPOSITIVO_REQUERIDO') {
        localStorage.removeItem(claveDispositivo); // token revocado o inválido
        setRequiereVinculo(true);
      } else {
        fallar(err.response?.data?.error ?? 'Cédula no registrada');
      }
    } finally {
      setLoading(false);
    }
  };

  // El descriptor (128 floats) ya viene calculado desde CamaraRostro; la
  // imagen nunca sale del dispositivo.
  const loginConRostro = async (descriptor: number[], foto: string) => {
    setErrorLogin('');
    try {
      const r = await api.post('/worker/login-rostro', {
        descriptor, marcadorToken,
        deviceToken: localStorage.getItem(claveDispositivo) ?? undefined,
      });
      setFotoRostro(foto);
      setModoRostro(false);
      setToken(r.data.token);
      setColaborador(r.data.colaborador);
      await cargarEstado(r.data.token);
    } catch (err: any) {
      if (err.response?.data?.codigo === 'DISPOSITIVO_REQUERIDO') {
        // Se mantiene modoRostro: al vincular el dispositivo vuelve a la cámara,
        // no al formulario de cédula
        localStorage.removeItem(claveDispositivo);
        setRequiereVinculo(true);
      } else {
        setErrorLogin(err.response?.data?.error ?? 'No pudimos reconocer tu rostro');
      }
    }
  };

  const marcar = async () => {
    if (!token || marcando) return;
    setMarcando(true);
    try {
      const r = await api.post('/worker/marcar', { foto: fotoRostro ?? undefined }, { headers });
      setFlash({
        tipo: 'ok',
        accion: r.data.accion,
        hora: format(new Date(r.data.hora), 'HH:mm:ss'),
        nombre: colaborador ? `${colaborador.nombre} ${colaborador.apellido}` : '',
      });
      // Confirmación visible 3.5s, luego se cierra con animación y auto-logout
      setTimeout(() => cerrarFlash(salir), 3500);
    } catch {
      setFlash({ tipo: 'error', msg: 'No pudimos registrar tu marcación. Intenta de nuevo.' });
      setTimeout(() => cerrarFlash(), 2500);
    } finally {
      setMarcando(false);
    }
  };

  // ===== Pantallas de resultado (animadas, pantalla completa) =====
  if (flash?.tipo === 'ok') {
    const esEntrada = flash.accion === 'ENTRADA';
    return (
      <div className={`min-h-screen flex items-center justify-center p-4 ${esEntrada ? 'bg-green-600' : 'bg-red-600'} ${cerrandoFlash ? 'hp-fade-out' : 'hp-fade-bg'}`}>
        <div className={`text-center text-white ${cerrandoFlash ? 'hp-pop-out' : ''}`}>
          <div className="relative mx-auto mb-8 w-36 h-36">
            <div className="hp-ripple absolute inset-0 rounded-full bg-white/40" />
            <div className={`relative w-36 h-36 rounded-full bg-white flex items-center justify-center ${cerrandoFlash ? '' : 'hp-pop'}`}>
              {esEntrada
                ? <LogIn size={64} className="text-green-600" strokeWidth={2.5} />
                : <LogOut size={64} className="text-red-600" strokeWidth={2.5} />}
            </div>
          </div>
          <p className={`text-4xl font-extrabold mb-2 ${cerrandoFlash ? '' : 'hp-pop'}`}>{esEntrada ? '¡Entrada registrada!' : '¡Salida registrada!'}</p>
          <p className="text-xl text-white/90">{flash.nombre}</p>
          <p className="text-6xl font-mono font-bold mt-4 tabular-nums">{flash.hora}</p>
          <p className="mt-6 text-white/80 flex items-center justify-center gap-2"><Check size={18} /> {esEntrada ? 'Buen turno' : 'Hasta pronto'}</p>
        </div>
      </div>
    );
  }
  if (flash?.tipo === 'error') {
    return (
      <div className={`min-h-screen bg-red-600 flex items-center justify-center p-4 ${cerrandoFlash ? 'hp-fade-out' : 'hp-fade-bg'}`}>
        <div className={`text-center text-white ${cerrandoFlash ? 'hp-pop-out' : 'hp-shake'}`}>
          <div className={`mx-auto mb-8 w-36 h-36 rounded-full bg-white flex items-center justify-center ${cerrandoFlash ? '' : 'hp-pop'}`}>
            <X size={64} className="text-red-600" strokeWidth={2.5} />
          </div>
          <p className="text-4xl font-extrabold mb-2">Algo salió mal</p>
          <p className="text-xl text-white/90">{flash.msg}</p>
        </div>
      </div>
    );
  }

  // ===== Vinculación del dispositivo (código del panel) =====
  if (requiereVinculo && !linkInvalido) {
    return (
      <div className="min-h-screen bg-ink flex items-center justify-center p-4">
        <div className="w-full max-w-sm rounded-[28px] border border-white/10 bg-white/[0.06] backdrop-blur-2xl shadow-2xl p-8 text-center">
          <img src={logoSimplificado} alt="HoraPro" className="w-16 h-16 mx-auto mb-5" />
          <h1 className="text-xl font-bold text-white mb-1">Autorizar este dispositivo</h1>
          <p className="text-sm text-white/50 mb-6">
            {empresa ?? ''} protege su kiosco. Pide al administrador un código de
            vinculación (panel → Marcador) y digítalo aquí una sola vez.
          </p>
          <form onSubmit={vincular} className="space-y-4">
            <input
              type="text"
              inputMode="numeric"
              autoFocus
              maxLength={6}
              value={codigoVinculo}
              onChange={e => { setCodigoVinculo(e.target.value.replace(/\D/g, '')); setErrorVinculo(''); }}
              placeholder="000000"
              required
              className={`hp-input-dark w-full border rounded-xl px-4 py-3 text-3xl text-center tracking-[0.4em] font-mono placeholder:text-white/20 focus:outline-none transition-colors ${errorVinculo ? 'border-red-400/60 bg-red-500/10 hp-shake' : 'border-white/10 focus:border-primary/60'}`}
            />
            {errorVinculo && <p className="text-red-400 text-sm font-medium">{errorVinculo}</p>}
            <button type="submit" disabled={vinculando || codigoVinculo.length !== 6}
              className="w-full bg-primary hover:bg-primary-dark text-ink font-bold py-3 rounded-xl disabled:opacity-60 transition-colors">
              {vinculando ? 'Vinculando...' : 'Vincular dispositivo'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (linkInvalido) {
    return (
      <div className="min-h-screen bg-ink flex items-center justify-center p-4">
        <div className="w-full max-w-sm rounded-[28px] border border-white/10 bg-white/[0.06] backdrop-blur-2xl shadow-2xl p-8 text-center">
          <Link2Off size={40} className="mx-auto mb-4 text-white/40" />
          <h1 className="text-xl font-bold text-white mb-2">Link de marcación inválido</h1>
          <p className="text-sm text-white/50">Pide a tu administrador el link del marcador de tu empresa.</p>
        </div>
      </div>
    );
  }

  // ===== Login por cédula o rostro =====
  if (!token || !colaborador) {
    return (
      <div className="min-h-screen bg-ink flex items-center justify-center p-4">
        <div className={`relative w-full rounded-[28px] border border-white/10 bg-white/[0.06] backdrop-blur-2xl shadow-2xl p-8 transition-all ${modoRostro ? 'max-w-md' : 'max-w-sm'} ${shake ? 'hp-shake ring-2 ring-red-400/60' : ''}`}>
          <div className="flex flex-col items-center mb-5">
            <img src={logoSimplificado} alt="HoraPro" className="w-14 h-14 mb-3" />
            <p className="text-white font-semibold text-sm">{empresa ?? 'Cargando...'}</p>
          </div>

          {permiteCedula ? (
            <div className="flex justify-center mb-6">
              <div className="inline-flex bg-white/5 border border-white/10 rounded-full p-1">
                <button
                  type="button"
                  onClick={() => { setModoRostro(false); setErrorLogin(''); }}
                  className={`px-5 py-2 rounded-full text-sm font-semibold transition-colors ${!modoRostro ? 'bg-white text-ink' : 'text-white/50 hover:text-white/80'}`}
                >
                  Cédula
                </button>
                <button
                  type="button"
                  onClick={() => { setErrorLogin(''); setFotoRostro(null); setModoRostro(true); }}
                  className={`px-5 py-2 rounded-full text-sm font-semibold transition-colors flex items-center gap-1.5 ${modoRostro ? 'bg-white text-ink' : 'text-white/50 hover:text-white/80'}`}
                >
                  <ScanFace size={15} /> Rostro
                </button>
              </div>
            </div>
          ) : (
            <p className="text-center text-white/50 text-sm font-medium mb-6 flex items-center justify-center gap-1.5">
              <ScanFace size={15} /> Reconocimiento facial
            </p>
          )}

          {modoRostro ? (
            <>
              <CamaraRostro key={capturaKey} modo="login" onCapturado={(descs, foto) => loginConRostro(descs[0], foto)} errorExterno={errorLogin || null}
                permiteFallbackCedula={permiteCedula}
                onUsarCedula={foto => { setFotoRostro(foto); setModoRostro(false); setErrorLogin(''); }} />
              {errorLogin && (
                <button onClick={() => { setErrorLogin(''); setCapturaKey(k => k + 1); }}
                  className="w-full mt-4 bg-primary hover:bg-primary-dark text-ink font-bold py-2.5 rounded-xl text-sm transition-colors">
                  Reintentar
                </button>
              )}
            </>
          ) : (
            <>
              <p className="text-center text-4xl font-mono font-bold text-white my-4 tabular-nums">{format(ahora, 'HH:mm:ss')}</p>
              {fotoRostro && (
                <p className="mb-3 flex items-center justify-center gap-1.5 text-xs font-medium text-green-400">
                  <Check size={14} /> Foto tomada · ingresa tu cédula para confirmar
                </p>
              )}
              <form onSubmit={ingresar} className="space-y-4">
                <input
                  type="text"
                  inputMode="numeric"
                  autoFocus
                  value={cedula}
                  onChange={e => { setCedula(e.target.value.replace(/\D/g, '')); setErrorLogin(''); }}
                  placeholder="Número de cédula"
                  required
                  className={`hp-input-dark w-full border rounded-xl px-4 py-3 text-2xl text-center tracking-widest placeholder:text-white/25 focus:outline-none transition-colors ${errorLogin ? 'border-red-400/60 bg-red-500/10' : 'border-white/10 focus:border-primary/60'}`}
                />
                {errorLogin && <p className="text-red-400 text-sm text-center font-medium">{errorLogin}</p>}
                <button
                  type="submit"
                  disabled={loading || !empresa}
                  className="w-full bg-primary hover:bg-primary-dark text-ink font-bold py-3 rounded-xl text-base disabled:opacity-60 transition-colors"
                >
                  {loading ? 'Verificando...' : 'Continuar'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    );
  }

  // ===== Pantalla de marcación =====
  const dentroAhora = estado?.dentroAhora ?? false;
  const entradaHace = estado?.entradaAbierta?.entrada
    ? format(new Date(estado.entradaAbierta.entrada), 'HH:mm')
    : null;

  return (
    <div className="min-h-screen bg-ink flex items-center justify-center p-4">
      <div className="hp-pop w-full max-w-sm rounded-[28px] border border-white/10 bg-white/[0.06] backdrop-blur-2xl shadow-2xl p-8 text-center">
        <div className="mb-6">
          <div className="bg-primary rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-3">
            <span className="text-2xl font-bold text-ink">
              {colaborador.nombre[0]}{colaborador.apellido[0]}
            </span>
          </div>
          <h2 className="text-xl font-bold text-white">{colaborador.nombre} {colaborador.apellido}</h2>
          {colaborador.cargo && <p className="text-sm text-white/50">{colaborador.cargo}</p>}
        </div>

        <div className="mb-6">
          <p className="text-5xl font-mono font-bold text-white tracking-tight tabular-nums">
            {format(ahora, 'HH:mm:ss')}
          </p>
          <p className="text-sm text-white/50 mt-1 capitalize">
            {format(ahora, "EEEE d 'de' MMMM", { locale: es })}
          </p>
        </div>

        <div className={`mb-6 rounded-xl px-4 py-2 text-sm font-medium ${dentroAhora ? 'bg-green-500/10 text-green-400' : 'bg-white/5 text-white/50'}`}>
          {dentroAhora ? `Entrada registrada a las ${entradaHace}` : 'Sin entrada registrada hoy'}
        </div>

        <button
          onClick={marcar}
          disabled={marcando || !estado}
          className={`w-full font-bold py-5 rounded-2xl text-xl text-white transition-all active:scale-95 disabled:opacity-60 flex items-center justify-center gap-3 shadow-lg
            ${dentroAhora
              ? 'bg-orange-500 hover:bg-orange-400 shadow-orange-900/30'
              : 'bg-green-600 hover:bg-green-500 shadow-green-900/30'
            }`}
        >
          {dentroAhora ? <LogOut size={28} /> : <LogIn size={28} />}
          {marcando ? 'Registrando...' : (dentroAhora ? 'Registrar Salida' : 'Registrar Entrada')}
        </button>

        <button onClick={salir} className="mt-4 text-xs text-white/30 hover:text-white/60 underline">
          No soy yo, cambiar usuario
        </button>
      </div>
    </div>
  );
}
