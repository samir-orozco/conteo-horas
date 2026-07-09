import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { LogIn, LogOut, Check, X, Fingerprint, Link2Off } from 'lucide-react';
import axios from 'axios';
import logoSimplificado from '../assets/logo-simplificado.svg';
import logoCompleto from '../assets/logo-completo.svg';

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
  const [ahora, setAhora] = useState(new Date());
  const [marcando, setMarcando] = useState(false);

  const [cedula, setCedula] = useState('');
  const [errorLogin, setErrorLogin] = useState('');
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);

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

  const marcar = async () => {
    if (!token || marcando) return;
    setMarcando(true);
    try {
      const r = await api.post('/worker/marcar', {}, { headers });
      setFlash({
        tipo: 'ok',
        accion: r.data.accion,
        hora: format(new Date(r.data.hora), 'HH:mm:ss'),
        nombre: colaborador ? `${colaborador.nombre} ${colaborador.apellido}` : '',
      });
      // Confirmación visible 3.5s y auto-logout para el siguiente trabajador
      setTimeout(() => { setFlash(null); salir(); }, 3500);
    } catch {
      setFlash({ tipo: 'error', msg: 'No pudimos registrar tu marcación. Intenta de nuevo.' });
      setTimeout(() => setFlash(null), 2500);
    } finally {
      setMarcando(false);
    }
  };

  // ===== Pantallas de resultado (animadas, pantalla completa) =====
  if (flash?.tipo === 'ok') {
    const esEntrada = flash.accion === 'ENTRADA';
    return (
      <div className={`hp-fade-bg min-h-screen flex items-center justify-center p-4 ${esEntrada ? 'bg-green-600' : 'bg-emerald-700'}`}>
        <div className="text-center text-white">
          <div className="relative mx-auto mb-8 w-36 h-36">
            <div className="hp-ripple absolute inset-0 rounded-full bg-white/40" />
            <div className="hp-pop relative w-36 h-36 rounded-full bg-white flex items-center justify-center">
              {esEntrada
                ? <LogIn size={64} className="text-green-600" strokeWidth={2.5} />
                : <LogOut size={64} className="text-emerald-700" strokeWidth={2.5} />}
            </div>
          </div>
          <p className="hp-pop text-4xl font-extrabold mb-2">{esEntrada ? '¡Entrada registrada!' : '¡Salida registrada!'}</p>
          <p className="text-xl text-white/90">{flash.nombre}</p>
          <p className="text-6xl font-mono font-bold mt-4 tabular-nums">{flash.hora}</p>
          <p className="mt-6 text-white/80 flex items-center justify-center gap-2"><Check size={18} /> {esEntrada ? 'Buen turno' : 'Hasta pronto'}</p>
        </div>
      </div>
    );
  }
  if (flash?.tipo === 'error') {
    return (
      <div className="hp-fade-bg min-h-screen bg-red-600 flex items-center justify-center p-4">
        <div className="text-center text-white hp-shake">
          <div className="hp-pop mx-auto mb-8 w-36 h-36 rounded-full bg-white flex items-center justify-center">
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
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm text-center">
          <img src={logoSimplificado} alt="HoraPro" className="w-20 h-20 mx-auto mb-5" />
          <h1 className="text-xl font-bold text-ink mb-1">Autorizar este dispositivo</h1>
          <p className="text-sm text-muted mb-6">
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
              className={`w-full border-2 rounded-xl px-4 py-3 text-3xl text-center tracking-[0.4em] font-mono focus:outline-none ${errorVinculo ? 'border-red-400 bg-red-50 hp-shake' : 'border-gray-200 focus:border-primary'}`}
            />
            {errorVinculo && <p className="text-red-600 text-sm font-medium">{errorVinculo}</p>}
            <button type="submit" disabled={vinculando || codigoVinculo.length !== 6}
              className="w-full bg-primary hover:bg-primary-dark text-ink font-bold py-3 rounded-xl disabled:opacity-60">
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
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm text-center">
          <Link2Off size={40} className="mx-auto mb-4 text-muted" />
          <h1 className="text-xl font-bold text-ink mb-2">Link de marcación inválido</h1>
          <p className="text-sm text-muted">Pide a tu administrador el link del marcador de tu empresa.</p>
        </div>
      </div>
    );
  }

  // ===== Login por cédula =====
  if (!token || !colaborador) {
    return (
      <div className="min-h-screen bg-ink flex items-center justify-center p-4">
        <div className={`bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm ${shake ? 'hp-shake ring-4 ring-red-400' : ''}`}>
          <img src={logoCompleto} alt="HoraPro" className="h-12 mx-auto mb-3" />
          <p className="text-center text-muted text-sm mb-1">{empresa ?? 'Cargando...'}</p>
          <p className="text-center text-4xl font-mono font-bold text-ink my-4 tabular-nums">{format(ahora, 'HH:mm:ss')}</p>

          <form onSubmit={ingresar} className="space-y-4">
            <input
              type="text"
              inputMode="numeric"
              autoFocus
              value={cedula}
              onChange={e => { setCedula(e.target.value.replace(/\D/g, '')); setErrorLogin(''); }}
              placeholder="Número de cédula"
              required
              className={`w-full border-2 rounded-xl px-4 py-3 text-2xl text-center tracking-widest focus:outline-none ${errorLogin ? 'border-red-400 bg-red-50' : 'border-gray-200 focus:border-primary'}`}
            />
            {errorLogin && <p className="text-red-600 text-sm text-center font-medium">{errorLogin}</p>}
            <button
              type="submit"
              disabled={loading || !empresa}
              className="w-full bg-primary hover:bg-primary-dark text-ink font-bold py-3 rounded-xl text-base disabled:opacity-60 transition-colors"
            >
              {loading ? 'Verificando...' : 'Continuar'}
            </button>
            <button
              type="button"
              disabled
              title="Disponible próximamente"
              className="w-full border-2 border-gray-200 text-gray-400 font-semibold py-3 rounded-xl text-sm flex items-center justify-center gap-2 cursor-not-allowed"
            >
              <Fingerprint size={18} /> Identificarme con huella
              <span className="text-[10px] font-bold bg-gray-100 px-1.5 py-0.5 rounded-full uppercase">Pronto</span>
            </button>
          </form>
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
      <div className="hp-pop bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm text-center">
        <div className="mb-6">
          <div className="bg-primary rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-3">
            <span className="text-2xl font-bold text-ink">
              {colaborador.nombre[0]}{colaborador.apellido[0]}
            </span>
          </div>
          <h2 className="text-xl font-bold text-ink">{colaborador.nombre} {colaborador.apellido}</h2>
          {colaborador.cargo && <p className="text-sm text-muted">{colaborador.cargo}</p>}
        </div>

        <div className="mb-6">
          <p className="text-5xl font-mono font-bold text-ink tracking-tight tabular-nums">
            {format(ahora, 'HH:mm:ss')}
          </p>
          <p className="text-sm text-muted mt-1 capitalize">
            {format(ahora, "EEEE d 'de' MMMM", { locale: es })}
          </p>
        </div>

        <div className={`mb-6 rounded-xl px-4 py-2 text-sm font-medium ${dentroAhora ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-muted'}`}>
          {dentroAhora ? `Entrada registrada a las ${entradaHace}` : 'Sin entrada registrada hoy'}
        </div>

        <button
          onClick={marcar}
          disabled={marcando || !estado}
          className={`w-full font-bold py-5 rounded-2xl text-xl text-white transition-all active:scale-95 disabled:opacity-60 flex items-center justify-center gap-3 shadow-lg
            ${dentroAhora
              ? 'bg-orange-500 hover:bg-orange-400 shadow-orange-200'
              : 'bg-green-600 hover:bg-green-500 shadow-green-200'
            }`}
        >
          {dentroAhora ? <LogOut size={28} /> : <LogIn size={28} />}
          {marcando ? 'Registrando...' : (dentroAhora ? 'Registrar Salida' : 'Registrar Entrada')}
        </button>

        <button onClick={salir} className="mt-4 text-xs text-gray-400 hover:text-muted underline">
          No soy yo, cambiar usuario
        </button>
      </div>
    </div>
  );
}
