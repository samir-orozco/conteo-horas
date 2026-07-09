import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import api from '../lib/api';

type Usuario = {
  id: string;
  email: string;
  nombre: string;
  rol: string;
  empresaId: string | null;
  empresaNombre: string | null;
  estadoSuscripcion: string | null;
};
type DatosRegistro = { empresa: string; nit: string; nombre: string; email: string; password: string; telefono?: string };
type AuthCtx = {
  usuario: Usuario | null;
  login: (email: string, password: string) => Promise<Usuario>;
  registrar: (datos: DatosRegistro) => Promise<Usuario>;
  logout: () => void;
  loading: boolean;
};

const AuthContext = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      api.get('/auth/me').then(r => setUsuario(r.data)).catch(() => localStorage.removeItem('token')).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('token', data.token);
    setUsuario(data.usuario);
    return data.usuario as Usuario;
  };

  const registrar = async (datos: DatosRegistro) => {
    const { data } = await api.post('/auth/registro', datos);
    localStorage.setItem('token', data.token);
    setUsuario(data.usuario);
    return data.usuario as Usuario;
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUsuario(null);
  };

  return <AuthContext.Provider value={{ usuario, login, registrar, logout, loading }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth fuera de AuthProvider');
  return ctx;
};
