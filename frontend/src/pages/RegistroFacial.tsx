import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ScanFace, ShieldCheck, CheckCircle } from 'lucide-react';
import logoCompleto from '../assets/logo-completo.svg';
import CamaraRostro from '../components/CamaraRostro';
import { miniaturaDe } from '../features/colaboradores/foto';
import { fechaLarga } from '../lib/fechas';
import { infoDelEnlace, verificarCedula, noAutorizo, registrarRostro, type InfoEnlace, type EstadoRegistro } from './registroFacial/api';

// LA PÁGINA DONDE LA PROPIA PERSONA REGISTRA SU ROSTRO, CON EL ENLACE QUE LE MANDÓ SU EMPRESA
// (14 de septiembre de 2026).
//
// El orden es a propósito: primero la cédula, para que nada del registro se vea sin confirmar quién
// abrió el enlace; después la autorización, que es voluntaria y se puede rechazar con un botón tan
// visible como el de aceptar; y recién con las dos casillas marcadas, el escaneo. Lo que se manda al
// guardar es el texto tal cual se mostró, que es lo que queda en la constancia.

type Paso = 'cargando' | 'no-sirve' | 'cedula' | 'registrado' | 'confirmar-retiro' | 'autorizacion' | 'escaneo' | 'listo' | 'no-autorizo';

type ErrorHttp = { response?: { status?: number; data?: { error?: string } } };

const BOTON_PRINCIPAL = 'w-full bg-primary hover:bg-primary-dark text-ink font-bold py-3 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed';
const BOTON_SECUNDARIO = 'w-full border-2 border-gray-200 hover:border-gray-300 text-ink font-semibold py-3 rounded-xl disabled:opacity-50';
const CASILLA = 'flex items-start gap-3 text-sm text-ink cursor-pointer';

export default function RegistroFacial() {
  const { token = '' } = useParams<{ token: string }>();
  const [paso, setPaso] = useState<Paso>('cargando');
  const [info, setInfo] = useState<InfoEnlace | null>(null);
  const [registro, setRegistro] = useState<EstadoRegistro | null>(null);
  const [cedula, setCedula] = useState('');
  const [autoriza, setAutoriza] = useState(false);
  const [mayorDeEdad, setMayorDeEdad] = useState(false);
  const [usaGafas, setUsaGafas] = useState(false);
  const [error, setError] = useState('');
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    let vigente = true;
    infoDelEnlace(token)
      .then(datos => { if (vigente) { setInfo(datos); setPaso('cedula'); } })
      .catch((err: ErrorHttp) => {
        if (!vigente) return;
        setError(err.response?.data?.error ?? 'No pudimos abrir este enlace. Intenta de nuevo en un momento.');
        setPaso('no-sirve');
      });
    return () => { vigente = false; };
  }, [token]);

  // Un 404 o un 410 es un enlace que dejó de servir mientras la página estaba abierta (venció, se usó,
  // se bloqueó): se muestra como tal, no como un error del paso en que iba. Devuelve si fue eso.
  const fallar = (err: unknown, respaldo: string): boolean => {
    const e = err as ErrorHttp;
    setError(e.response?.data?.error ?? respaldo);
    const dejoDeServir = e.response?.status === 404 || e.response?.status === 410;
    if (dejoDeServir) setPaso('no-sirve');
    return dejoDeServir;
  };

  const enviarCedula = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setError('');
    setOcupado(true);
    try {
      const estado = await verificarCedula(token, cedula);
      setRegistro(estado);
      setPaso(estado.registradoEn ? 'registrado' : 'autorizacion');
    } catch (err) {
      fallar(err, 'No pudimos comprobar la cédula. Intenta de nuevo.');
    } finally {
      setOcupado(false);
    }
  };

  const decirNoAutorizo = async () => {
    if (!info) return;
    setError('');
    setOcupado(true);
    try {
      await noAutorizo(token, { cedula, texto: info.textoAutorizacion, ...(mayorDeEdad ? { mayorDeEdad: true as const } : {}) });
      setPaso('no-autorizo');
    } catch (err) {
      fallar(err, 'No pudimos guardar tu decisión. Intenta de nuevo.');
    } finally {
      setOcupado(false);
    }
  };

  const alCapturar = async (descriptores: number[][], foto: string) => {
    if (!info) return;
    setError('');
    setOcupado(true);
    try {
      // La miniatura se saca en el navegador, igual que en la ficha. Si falla, la lista usa las iniciales.
      const fotoMini = await miniaturaDe(foto).catch(() => null);
      await registrarRostro(token, {
        cedula, texto: info.textoAutorizacion, mayorDeEdad: true, descriptores, foto,
        ...(fotoMini ? { fotoMini } : {}),
      });
      setPaso('listo');
    } catch (err) {
      // Si el enlace sigue sirviendo, vuelve a la autorización con las casillas marcadas: un clic y otro escaneo.
      if (!fallar(err, 'No pudimos guardar tu registro. Intenta el escaneo otra vez.')) setPaso('autorizacion');
    } finally {
      setOcupado(false);
    }
  };

  const avisoDeError = error ? <p role="alert" className="text-red-600 text-sm">{error}</p> : null;

  return (
    <div className="min-h-screen bg-[#f6f6f4] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 w-full max-w-md">
        <img src={logoCompleto} alt="HoraPro" className="h-10 mb-6" />

        {paso === 'cargando' && <p className="text-sm text-muted">Abriendo tu enlace...</p>}

        {paso === 'no-sirve' && (
          <div className="text-center py-4">
            <h1 className="text-xl font-bold text-ink mb-2">Este enlace no se puede usar</h1>
            <p className="text-sm text-muted">{error}</p>
          </div>
        )}

        {paso === 'cedula' && info && (
          <>
            <h1 className="text-xl font-bold text-ink flex items-center gap-2"><ScanFace size={20} /> Hola, {info.nombre}</h1>
            <p className="text-sm text-muted mt-1 mb-6">
              {info.empresa} te invita a registrar tu rostro para marcar tu asistencia. Para empezar, confirma que eres tú.
            </p>
            <form onSubmit={enviarCedula} className="space-y-4">
              <div>
                <label htmlFor="cedula" className="block text-xs font-medium text-muted mb-1">Número de cédula</label>
                <input id="cedula" inputMode="numeric" autoComplete="off" required value={cedula}
                  onChange={e => setCedula(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
              {avisoDeError}
              <button type="submit" disabled={ocupado} className={BOTON_PRINCIPAL}>Continuar</button>
            </form>
          </>
        )}

        {paso === 'registrado' && info && registro?.registradoEn && (
          <div className="space-y-4">
            <h1 className="text-xl font-bold text-ink flex items-center gap-2"><ScanFace size={20} /> Ya tienes tu rostro registrado</h1>
            {registro.foto && (
              <img src={registro.foto} alt="Tu foto de perfil" className="w-24 h-24 rounded-full object-cover mx-auto" />
            )}
            <p className="text-sm text-ink">
              Está registrado desde el {fechaLarga(registro.registradoEn)}, con {registro.tomas} {registro.tomas === 1 ? 'toma' : 'tomas'}.
            </p>
            {/* La primera toma sí queda como foto de perfil cuando no había una (utils/fotoPerfil.ts): no se
                puede decir que ninguna foto del escaneo se guarda. */}
            <p className="text-xs text-muted">
              De tu rostro se guarda un cálculo, que no se puede volver a convertir en una imagen. De las tomas del escaneo, solo la primera puede quedar como tu foto de perfil, y solo si no tenías una.
            </p>
            {avisoDeError}
            <button type="button" className={BOTON_PRINCIPAL}
              onClick={() => { setAutoriza(false); setMayorDeEdad(false); setError(''); setPaso('autorizacion'); }}>
              Actualizar mi registro
            </button>
            <button type="button" className={BOTON_SECUNDARIO} onClick={() => { setError(''); setPaso('confirmar-retiro'); }}>
              Retirar mi autorización
            </button>
          </div>
        )}

        {paso === 'confirmar-retiro' && info && (
          <div className="space-y-4">
            <h1 className="text-xl font-bold text-ink">¿Retirar tu autorización?</h1>
            <p className="text-sm text-ink">
              Se borra tu registro facial y {info.empresa} ya no podrá reconocerte por tu rostro en el kiosco.
              {info.permiteCedula ? ' Podrás marcar con tu cédula.' : ''}
            </p>
            {avisoDeError}
            <button type="button" disabled={ocupado} className={BOTON_PRINCIPAL} onClick={decirNoAutorizo}>
              Sí, retirar mi autorización
            </button>
            <button type="button" disabled={ocupado} className={BOTON_SECUNDARIO} onClick={() => setPaso('registrado')}>
              No, volver
            </button>
          </div>
        )}

        {paso === 'autorizacion' && info && (
          <div className="space-y-4">
            <h1 className="text-xl font-bold text-ink flex items-center gap-2"><ShieldCheck size={20} /> Tu autorización</h1>
            <p className="text-sm text-muted">Antes de escanear tu rostro, lee esto. Aceptar no es obligatorio.</p>
            <p className="text-xs text-muted">
              De tu rostro se guarda un cálculo, que no se puede volver a convertir en una imagen. Si no tienes foto de perfil, la primera toma queda como tu foto.
            </p>
            <label className={CASILLA}>
              <input type="checkbox" checked={autoriza} onChange={e => setAutoriza(e.target.checked)} className="mt-1 rounded" />
              <span>{info.textoAutorizacion}</span>
            </label>
            <label className={CASILLA}>
              <input type="checkbox" checked={mayorDeEdad} onChange={e => setMayorDeEdad(e.target.checked)} className="mt-1 rounded" />
              <span>{info.textoMayorDeEdad}</span>
            </label>
            <label className={`${CASILLA} text-muted`}>
              <input type="checkbox" checked={usaGafas} onChange={e => setUsaGafas(e.target.checked)} className="mt-1 rounded" />
              <span>Uso gafas casi siempre (se hace una toma más, sin ellas).</span>
            </label>
            <p className="text-xs text-muted">
              Más detalles en la{' '}
              <a href="/legal/privacidad/" target="_blank" rel="noopener noreferrer" className="underline">política de privacidad</a>.
            </p>
            {avisoDeError}
            <button type="button" disabled={!autoriza || !mayorDeEdad || ocupado} className={BOTON_PRINCIPAL}
              onClick={() => { setError(''); setPaso('escaneo'); }}>
              Continuar al registro
            </button>
            <button type="button" disabled={ocupado} className={BOTON_SECUNDARIO} onClick={decirNoAutorizo}>
              No autorizo el uso de mis datos biométricos
            </button>
          </div>
        )}

        {paso === 'escaneo' && (
          <div className="space-y-4">
            <h1 className="text-xl font-bold text-ink flex items-center gap-2"><ScanFace size={20} /> Escanea tu rostro</h1>
            <p className="text-sm text-muted">Busca buena luz y sigue las indicaciones de la pantalla.</p>
            <CamaraRostro modo="enrolar" pasoGafas={usaGafas} onCapturado={alCapturar} />
            {ocupado && <p className="text-sm text-muted text-center">Guardando...</p>}
            {avisoDeError}
          </div>
        )}

        {paso === 'listo' && info && (
          <div className="text-center py-4">
            <div className="hp-pop w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={26} className="text-green-600" />
            </div>
            <h1 className="text-xl font-bold text-ink mb-2">¡Listo, {info.nombre}!</h1>
            <p className="text-sm text-muted">Tu rostro quedó registrado. Ya puedes marcar tu asistencia con él en el kiosco de {info.empresa}.</p>
          </div>
        )}

        {paso === 'no-autorizo' && info && (
          <div className="text-center py-4 space-y-2">
            <h1 className="text-xl font-bold text-ink">Listo</h1>
            <p className="text-sm text-ink">
              Quedó registrado que no autorizas el uso de tu rostro.{registro?.registradoEn ? ' Tu registro facial se borró.' : ''}
            </p>
            <p className="text-sm text-muted">
              {info.permiteCedula ? 'Puedes marcar tu asistencia con tu cédula.' : 'Pregúntale a tu empresa cómo vas a marcar tu asistencia.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
