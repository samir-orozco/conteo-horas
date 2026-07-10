import { useState, useEffect } from 'react';
import { Save, Building2, User, Lock } from 'lucide-react';
import api from '../../lib/api';
import { useAuth } from '../../context/AuthContext';

type Empresa = { nombre: string; nit: string; email: string; telefono: string | null };

const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary';

export default function TabCuenta() {
  const { usuario, refrescarUsuario } = useAuth();

  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [guardandoEmpresa, setGuardandoEmpresa] = useState(false);
  const [okEmpresa, setOkEmpresa] = useState(false);
  const [errorEmpresa, setErrorEmpresa] = useState('');

  const [perfil, setPerfil] = useState({ nombre: '', email: '' });
  const [guardandoPerfil, setGuardandoPerfil] = useState(false);
  const [okPerfil, setOkPerfil] = useState(false);
  const [errorPerfil, setErrorPerfil] = useState('');

  const [claves, setClaves] = useState({ actual: '', nueva: '', confirmar: '' });
  const [guardandoClave, setGuardandoClave] = useState(false);
  const [okClave, setOkClave] = useState(false);
  const [errorClave, setErrorClave] = useState('');

  const esAdmin = usuario?.rol === 'ADMIN';

  useEffect(() => {
    api.get('/configuracion/empresa').then(r => setEmpresa(r.data));
  }, []);

  useEffect(() => {
    if (usuario) setPerfil({ nombre: usuario.nombre, email: usuario.email });
  }, [usuario]);

  const guardarEmpresa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empresa) return;
    setGuardandoEmpresa(true);
    setErrorEmpresa('');
    try {
      const r = await api.put('/configuracion/empresa', { nombre: empresa.nombre, nit: empresa.nit, telefono: empresa.telefono });
      setEmpresa(r.data);
      setOkEmpresa(true);
      setTimeout(() => setOkEmpresa(false), 2000);
    } catch (err: any) {
      setErrorEmpresa(err.response?.data?.error ?? 'No pudimos guardar los datos de la empresa');
    } finally {
      setGuardandoEmpresa(false);
    }
  };

  const guardarPerfil = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardandoPerfil(true);
    setErrorPerfil('');
    try {
      await api.put('/auth/me', { nombre: perfil.nombre, email: perfil.email });
      await refrescarUsuario();
      setOkPerfil(true);
      setTimeout(() => setOkPerfil(false), 2000);
    } catch (err: any) {
      setErrorPerfil(err.response?.data?.error ?? 'No pudimos guardar tus datos');
    } finally {
      setGuardandoPerfil(false);
    }
  };

  const guardarClave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorClave('');
    if (claves.nueva.length < 6) return setErrorClave('La nueva contraseña debe tener al menos 6 caracteres');
    if (claves.nueva !== claves.confirmar) return setErrorClave('Las contraseñas nuevas no coinciden');
    setGuardandoClave(true);
    try {
      await api.put('/auth/me', { passwordActual: claves.actual, passwordNueva: claves.nueva });
      setClaves({ actual: '', nueva: '', confirmar: '' });
      setOkClave(true);
      setTimeout(() => setOkClave(false), 2000);
    } catch (err: any) {
      setErrorClave(err.response?.data?.error ?? 'No pudimos cambiar tu contraseña');
    } finally {
      setGuardandoClave(false);
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-3xl">
      <div>
        <h1 className="text-xl font-bold text-ink">Cuenta</h1>
        <p className="text-sm text-muted">Los datos que registraste al crear tu cuenta en HoraPro.</p>
      </div>

      {/* Datos de la empresa */}
      <form onSubmit={guardarEmpresa} className="bg-white rounded-card border border-gray-200 p-6">
        <h3 className="font-semibold text-ink mb-4 flex items-center gap-2"><Building2 size={17} /> Datos de la empresa</h3>
        {empresa ? (
          <div className="grid md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-muted mb-1">Nombre de la empresa</label>
              <input value={empresa.nombre} disabled={!esAdmin} onChange={e => setEmpresa(p => p && ({ ...p, nombre: e.target.value }))} required className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted mb-1">NIT</label>
              <input value={empresa.nit} disabled={!esAdmin} onChange={e => setEmpresa(p => p && ({ ...p, nit: e.target.value }))} required className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted mb-1">Teléfono</label>
              <input value={empresa.telefono ?? ''} disabled={!esAdmin} onChange={e => setEmpresa(p => p && ({ ...p, telefono: e.target.value }))} className={inputCls} />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-muted mb-1">Correo de contacto</label>
              <input value={empresa.email} disabled className={`${inputCls} bg-gray-50 text-muted`} />
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted">Cargando...</p>
        )}
        {errorEmpresa && <p className="text-red-600 text-sm mt-3">{errorEmpresa}</p>}
        {esAdmin && (
          <button type="submit" disabled={guardandoEmpresa || !empresa} className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-ink px-5 py-2 rounded-xl text-sm font-semibold mt-4 disabled:opacity-60">
            <Save size={16} />{guardandoEmpresa ? 'Guardando...' : okEmpresa ? '¡Guardado!' : 'Guardar cambios'}
          </button>
        )}
        {!esAdmin && <p className="text-xs text-muted mt-3">Solo el administrador puede editar los datos de la empresa.</p>}
      </form>

      {/* Mi cuenta */}
      <form onSubmit={guardarPerfil} className="bg-white rounded-card border border-gray-200 p-6">
        <h3 className="font-semibold text-ink mb-4 flex items-center gap-2"><User size={17} /> Mi cuenta</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-muted mb-1">Tu nombre</label>
            <input value={perfil.nombre} onChange={e => setPerfil(p => ({ ...p, nombre: e.target.value }))} required className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted mb-1">Correo electrónico</label>
            <input type="email" value={perfil.email} onChange={e => setPerfil(p => ({ ...p, email: e.target.value }))} required className={inputCls} />
          </div>
        </div>
        {errorPerfil && <p className="text-red-600 text-sm mt-3">{errorPerfil}</p>}
        <button type="submit" disabled={guardandoPerfil} className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-ink px-5 py-2 rounded-xl text-sm font-semibold mt-4 disabled:opacity-60">
          <Save size={16} />{guardandoPerfil ? 'Guardando...' : okPerfil ? '¡Guardado!' : 'Guardar cambios'}
        </button>
      </form>

      {/* Cambiar contraseña */}
      <form onSubmit={guardarClave} className="bg-white rounded-card border border-gray-200 p-6">
        <h3 className="font-semibold text-ink mb-4 flex items-center gap-2"><Lock size={17} /> Cambiar contraseña</h3>
        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-muted mb-1">Contraseña actual</label>
            <input type="password" value={claves.actual} onChange={e => setClaves(p => ({ ...p, actual: e.target.value }))} required className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted mb-1">Nueva contraseña</label>
            <input type="password" value={claves.nueva} onChange={e => setClaves(p => ({ ...p, nueva: e.target.value }))} required minLength={6} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted mb-1">Confirmar nueva contraseña</label>
            <input type="password" value={claves.confirmar} onChange={e => setClaves(p => ({ ...p, confirmar: e.target.value }))} required minLength={6} className={inputCls} />
          </div>
        </div>
        {errorClave && <p className="text-red-600 text-sm mt-3">{errorClave}</p>}
        <button type="submit" disabled={guardandoClave} className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-ink px-5 py-2 rounded-xl text-sm font-semibold mt-4 disabled:opacity-60">
          <Save size={16} />{guardandoClave ? 'Guardando...' : okClave ? '¡Contraseña actualizada!' : 'Cambiar contraseña'}
        </button>
      </form>
    </div>
  );
}
