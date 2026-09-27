import { useEffect, useMemo, useState } from 'react';
import { BadgeCheck, Eye, EyeOff, KeyRound, Mail, Save, ShieldAlert, ShieldCheck, User } from 'lucide-react';
import api from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { mensajeDeError } from '../../lib/errores';
import { fuerzaDeClave, iniciales, validarCambioDeClave } from '../../features/admin/cuentaDelSuperAdmin';
import { cuandoPaso, resumenDeVeces } from '../../features/admin/registroDelSistema';

// La cuenta del super administrador (23 de septiembre de 2026).
//
// La estructura sale de la referencia que pasó el dueño: cabecera con avatar y pestañas dentro de
// la tarjeta, y dos columnas —la ancha para editar, la estrecha para el estado—. Lo que NO se
// copió es el contenido, que era de una ficha de candidato: aquí no hay currículum ni entrevistas.
//
// El avatar son iniciales y no una foto: `Usuario` no tiene campo de imagen, y añadirlo obligaría
// a otro cambio de esquema con su despliegue de `prisma-build` (CLAUDE.md §11). Si se quiere foto,
// se decide aparte.
//
// El panel de la derecha no es decoración: lee del registro del sistema quién ha intentado entrar
// a ESTA cuenta. Es lo que el panel del administrador normal no tiene y lo que hace que esta
// pantalla sirva para algo más que escribir un nombre.

type EventoDeAcceso = {
  id: string; veces: number; ultimaVez: string; mensaje: string; ip: string | null; navegador: string | null;
};

const campo = 'w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-ink bg-white focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition';
const etiqueta = 'block text-xs font-semibold text-muted mb-1.5';

const PESTANAS = [
  { id: 'datos', label: 'Mis datos', icono: User },
  { id: 'seguridad', label: 'Seguridad', icono: KeyRound },
] as const;
type Pestana = typeof PESTANAS[number]['id'];

export default function AdminCuenta() {
  const { usuario, refrescarUsuario } = useAuth();
  const [pestana, setPestana] = useState<Pestana>('datos');

  const [perfil, setPerfil] = useState({ nombre: '', email: '' });
  const [guardandoPerfil, setGuardandoPerfil] = useState(false);
  const [avisoPerfil, setAvisoPerfil] = useState('');
  const [errorPerfil, setErrorPerfil] = useState('');

  const [claves, setClaves] = useState({ actual: '', nueva: '', confirmar: '' });
  const [verClave, setVerClave] = useState(false);
  const [guardandoClave, setGuardandoClave] = useState(false);
  const [avisoClave, setAvisoClave] = useState('');
  const [errorClave, setErrorClave] = useState('');

  const [intentos, setIntentos] = useState<EventoDeAcceso[] | null>(null);

  const nombreDeSesion = usuario?.nombre;
  const correoDeSesion = usuario?.email;

  // El formulario arranca con lo que hay en la sesión, y vuelve a hacerlo cuando la sesión cambia
  // (después de guardar, `refrescarUsuario` trae los datos nuevos).
  //
  // Se ajusta DURANTE el render comparando contra lo último visto, y no dentro de un `useEffect`.
  // Dos razones: un efecto que llama a `setState` encadena renders —lo marca el linter— y, sobre
  // todo, la primera versión dependía del objeto `usuario` entero; como quien lo provee puede
  // recrearlo en cada render, eso fue un bucle infinito que colgó la suite.
  const sesion = `${nombreDeSesion ?? ''}\u0000${correoDeSesion ?? ''}`;
  const [sesionVista, setSesionVista] = useState<string | null>(null);
  if (sesion !== sesionVista && nombreDeSesion !== undefined) {
    setSesionVista(sesion);
    setPerfil({ nombre: nombreDeSesion, email: correoDeSesion ?? '' });
  }

  // Los intentos contra ESTA cuenta salen del mismo registro del sistema, filtrando por el correo.
  useEffect(() => {
    if (!correoDeSesion) return;
    const consulta = new URLSearchParams({ tipo: 'ACCESO', buscar: correoDeSesion, limite: '5' });
    api.get(`/admin/eventos?${consulta}`)
      .then(r => setIntentos(r.data.eventos))
      .catch(() => setIntentos([]));
  }, [correoDeSesion]);

  const fuerza = useMemo(() => fuerzaDeClave(claves.nueva), [claves.nueva]);

  const guardarPerfil = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorPerfil(''); setAvisoPerfil('');
    setGuardandoPerfil(true);
    try {
      await api.put('/auth/me', { nombre: perfil.nombre, email: perfil.email });
      // Sin esto, la cabecera sigue saludando con el nombre viejo hasta que se recargue la página.
      await refrescarUsuario();
      setAvisoPerfil('Tus datos quedaron guardados.');
    } catch (err) {
      setErrorPerfil(mensajeDeError(err, 'No pudimos guardar tus datos.'));
    } finally {
      setGuardandoPerfil(false);
    }
  };

  const guardarClave = async (e: React.FormEvent) => {
    e.preventDefault();
    setAvisoClave('');
    const reparo = validarCambioDeClave(claves);
    if (reparo) return setErrorClave(reparo);
    setErrorClave('');
    setGuardandoClave(true);
    try {
      await api.put('/auth/me', { passwordActual: claves.actual, passwordNueva: claves.nueva });
      // Se vacían siempre: dejar una contraseña escrita en pantalla, en un equipo que alguien más
      // puede mirar, es exactamente lo que este panel existe para evitar.
      setClaves({ actual: '', nueva: '', confirmar: '' });
      setVerClave(false);
      setAvisoClave('Contraseña actualizada. La próxima vez entra con la nueva.');
    } catch (err) {
      setErrorClave(mensajeDeError(err, 'No pudimos cambiar tu contraseña.'));
    } finally {
      setGuardandoClave(false);
    }
  };

  return (
    <div className="p-6 md:p-8">
      <h1 className="text-2xl font-bold text-ink mb-5">Mi cuenta</h1>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_320px] gap-5 items-start">
        <div className="space-y-5">
          {/* Cabecera: quién eres */}
          <div className="bg-white rounded-card border border-gray-200 p-6">
            <div className="flex flex-wrap items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-primary/30 flex items-center justify-center text-xl font-bold text-ink shrink-0">
                {iniciales(usuario?.nombre)}
              </div>
              <div className="min-w-0">
                <h2 className="text-xl font-bold text-ink truncate">{usuario?.nombre}</h2>
                <p className="text-sm text-muted truncate">Super administrador · HoraPro</p>
              </div>
            </div>

            <div className="flex gap-2 mt-5">
              {PESTANAS.map(p => {
                const activa = p.id === pestana;
                return (
                  <button key={p.id} onClick={() => setPestana(p.id)}
                    className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold border transition ${
                      activa ? 'bg-primary/20 text-ink border-primary/40' : 'bg-white text-muted border-gray-200 hover:text-ink hover:bg-gray-50'}`}>
                    <p.icono size={16} /> {p.label}
                  </button>
                );
              })}
            </div>
          </div>

          {pestana === 'datos' && (
            <form onSubmit={guardarPerfil} className="bg-white rounded-card border border-gray-200 p-6">
              <h3 className="font-semibold text-ink mb-1">Tus datos</h3>
              <p className="text-sm text-muted mb-5">Con este correo entras a HoraPro y recibes los avisos de la plataforma.</p>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="cuenta-nombre" className={etiqueta}>Nombre</label>
                  <input id="cuenta-nombre" value={perfil.nombre} required className={campo}
                    onChange={e => setPerfil(p => ({ ...p, nombre: e.target.value }))} />
                </div>
                <div>
                  <label htmlFor="cuenta-email" className={etiqueta}>Correo electrónico</label>
                  <input id="cuenta-email" type="email" value={perfil.email} required className={campo}
                    onChange={e => setPerfil(p => ({ ...p, email: e.target.value }))} />
                </div>
              </div>

              {errorPerfil && <p className="text-sm text-red-600 mt-4">{errorPerfil}</p>}
              {avisoPerfil && <p className="text-sm text-green-700 mt-4">{avisoPerfil}</p>}

              <button type="submit" disabled={guardandoPerfil}
                className="inline-flex items-center gap-2 bg-primary hover:bg-primary-dark text-ink px-5 py-2.5 rounded-xl text-sm font-bold mt-5 disabled:opacity-60">
                <Save size={16} /> {guardandoPerfil ? 'Guardando…' : 'Guardar cambios'}
              </button>
            </form>
          )}

          {pestana === 'seguridad' && (
            <form onSubmit={guardarClave} className="bg-white rounded-card border border-gray-200 p-6">
              <h3 className="font-semibold text-ink mb-1">Cambiar contraseña</h3>
              <p className="text-sm text-muted mb-5">
                Pedimos la actual para confirmar que eres tú y no alguien que encontró tu sesión abierta.
              </p>

              <div className="space-y-4 max-w-md">
                <div>
                  <label htmlFor="clave-actual" className={etiqueta}>Contraseña actual</label>
                  <input id="clave-actual" type="password" value={claves.actual} className={campo}
                    onChange={e => setClaves(c => ({ ...c, actual: e.target.value }))} />
                </div>

                <div>
                  <label htmlFor="clave-nueva" className={etiqueta}>Nueva contraseña</label>
                  <span className="relative block">
                    <input id="clave-nueva" type={verClave ? 'text' : 'password'} value={claves.nueva}
                      className={`${campo} pr-11`}
                      onChange={e => setClaves(c => ({ ...c, nueva: e.target.value }))} />
                    <button type="button" onClick={() => setVerClave(v => !v)}
                      aria-label={verClave ? 'Ocultar la contraseña' : 'Ver la contraseña'}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink">
                      {verClave ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </span>

                  {claves.nueva && (
                    <div className="mt-2.5">
                      <div className="flex gap-1.5" aria-hidden>
                        {[1, 2, 3, 4].map(n => (
                          <span key={n} className={`h-1.5 flex-1 rounded-full ${
                            n <= fuerza.nivel
                              ? fuerza.nivel <= 1 ? 'bg-red-400' : fuerza.nivel === 2 ? 'bg-orange-400' : fuerza.nivel === 3 ? 'bg-amber-400' : 'bg-green-500'
                              : 'bg-gray-200'}`} />
                        ))}
                      </div>
                      <p className="text-xs text-muted mt-1.5">
                        <span className="font-semibold text-ink">{fuerza.etiqueta}.</span>{' '}
                        {fuerza.falta.length > 0
                          ? `Le falta ${fuerza.falta.join(', ')}.`
                          : 'Cumple todo lo que recomendamos.'}
                      </p>
                    </div>
                  )}
                </div>

                <div>
                  <label htmlFor="clave-confirmar" className={etiqueta}>Repite la nueva contraseña</label>
                  <input id="clave-confirmar" type={verClave ? 'text' : 'password'} value={claves.confirmar} className={campo}
                    onChange={e => setClaves(c => ({ ...c, confirmar: e.target.value }))} />
                </div>
              </div>

              {errorClave && <p className="text-sm text-red-600 mt-4">{errorClave}</p>}
              {avisoClave && <p className="text-sm text-green-700 mt-4">{avisoClave}</p>}

              <button type="submit" disabled={guardandoClave}
                className="inline-flex items-center gap-2 bg-primary hover:bg-primary-dark text-ink px-5 py-2.5 rounded-xl text-sm font-bold mt-5 disabled:opacity-60">
                <KeyRound size={16} /> {guardandoClave ? 'Cambiando…' : 'Cambiar contraseña'}
              </button>
            </form>
          )}
        </div>

        {/* Columna de estado */}
        <div className="space-y-5">
          <section className="bg-white rounded-card border border-gray-200 p-6">
            <h3 className="font-semibold text-ink mb-4">Tu acceso</h3>
            <dl className="space-y-4">
              <Dato icono={<ShieldCheck size={16} className="text-blue-600" />} fondo="bg-blue-50"
                valor="Super administrador" etiqueta="Ves y editas todas las empresas" />
              <Dato icono={<Mail size={16} className="text-amber-600" />} fondo="bg-amber-50"
                valor={usuario?.email ?? '—'} etiqueta="Con este correo entras" />
              <Dato icono={<BadgeCheck size={16} className="text-green-600" />} fondo="bg-green-50"
                valor={usuario?.emailVerificado ? 'Correo verificado' : 'Correo sin verificar'}
                etiqueta="Hace falta para recuperar la contraseña" />
            </dl>
          </section>

          <section className="bg-white rounded-card border border-gray-200 p-6">
            <h3 className="font-semibold text-ink mb-1">Intentos contra tu cuenta</h3>
            <p className="text-xs text-muted mb-4">Del registro del sistema. Cada línea agrupa los intentos de una misma IP.</p>

            {intentos === null && <p className="text-sm text-muted">Cargando…</p>}

            {intentos?.length === 0 && (
              <p className="text-sm text-green-700 flex items-start gap-2">
                <ShieldCheck size={16} className="mt-0.5 shrink-0" />
                Nadie ha intentado entrar a tu cuenta.
              </p>
            )}

            <ul className="space-y-3">
              {intentos?.map(i => (
                <li key={i.id} className="flex items-start gap-3">
                  <span className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center shrink-0">
                    <ShieldAlert size={16} className="text-red-600" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-ink">{i.ip ?? 'IP desconocida'}</span>
                    <span className="block text-xs text-muted">{resumenDeVeces(i.veces)} · {cuandoPaso(i.ultimaVez)}</span>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}

function Dato({ icono, fondo, valor, etiqueta: texto }: { icono: React.ReactNode; fondo: string; valor: string; etiqueta: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className={`w-8 h-8 rounded-lg ${fondo} flex items-center justify-center shrink-0`}>{icono}</span>
      <span className="min-w-0">
        <dt className="text-sm font-semibold text-ink break-words">{valor}</dt>
        <dd className="text-xs text-muted">{texto}</dd>
      </span>
    </div>
  );
}
