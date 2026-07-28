import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { capturarRef } from './lib/ref';
import { rutaInicio } from './lib/rutas';
import CapturadorErrores from './components/CapturadorErrores';
import Layout from './components/Layout';
import Login from './pages/Login';
import Landing from './pages/Landing';
import Registro from './pages/Registro';
import Olvide from './pages/Olvide';
import Restablecer from './pages/Restablecer';
import DashboardEmpresa from './pages/DashboardEmpresa';
import MarcadorLink from './pages/MarcadorLink';
import Colaboradores from './pages/Colaboradores';
import ColaboradorDetalle from './pages/ColaboradorDetalle';
import Registros from './pages/Registros';
import Festivos from './pages/Festivos';
import Reportes from './pages/Reportes';
import Configuracion from './pages/Configuracion';
import AutoLogin from './pages/AutoLogin';
import Marcador from './pages/Marcador';
import Suscripcion from './pages/Suscripcion';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminEmpresas from './pages/admin/AdminEmpresas';
import AdminPagos from './pages/admin/AdminPagos';
import AdminConfiguracion from './pages/admin/AdminConfiguracion';
import AdminEmpresaDetalle from './pages/admin/AdminEmpresaDetalle';
import AdminAfiliados from './pages/admin/AdminAfiliados';
import PanelAfiliado from './pages/PanelAfiliado';
import RegistroAfiliado from './pages/RegistroAfiliado';

function Cargando() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ink" />
    </div>
  );
}

// Rutas de empresa: si entra un super admin o afiliado, va a su propio panel
function EmpresaRoute({ children }: { children: React.ReactNode }) {
  const { usuario, loading } = useAuth();
  if (loading) return <Cargando />;
  if (!usuario) return <Navigate to="/login" replace />;
  if (usuario.rol !== 'ADMIN' && usuario.rol !== 'SUPERVISOR') return <Navigate to={rutaInicio(usuario.rol)} replace />;
  return <>{children}</>;
}

function SuperAdminRoute({ children }: { children: React.ReactNode }) {
  const { usuario, loading } = useAuth();
  if (loading) return <Cargando />;
  if (!usuario) return <Navigate to="/login" replace />;
  if (usuario.rol !== 'SUPER_ADMIN') return <Navigate to={rutaInicio(usuario.rol)} replace />;
  return <>{children}</>;
}

function AfiliadoRoute({ children }: { children: React.ReactNode }) {
  const { usuario, loading } = useAuth();
  if (loading) return <Cargando />;
  if (!usuario) return <Navigate to="/login" replace />;
  if (usuario.rol !== 'AFILIADO') return <Navigate to={rutaInicio(usuario.rol)} replace />;
  return <>{children}</>;
}

// Home pública: landing para visitantes. Si hay sesión, se sigue mostrando
// (Landing ajusta sus botones), así que un usuario logueado también puede verla.
function PublicHome() {
  const { loading } = useAuth();
  if (loading) return <Cargando />;
  return <Landing />;
}

export default function App() {
  // Captura el ?ref= del link de afiliado en cualquier página de entrada (landing, /registro)
  useEffect(() => { capturarRef(); }, []);
  return (
    <CapturadorErrores>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Público */}
          <Route path="/" element={<PublicHome />} />
          <Route path="/registro" element={<Registro />} />
          <Route path="/afiliado/registro" element={<RegistroAfiliado />} />
          <Route path="/login" element={<Login />} />
          <Route path="/olvide" element={<Olvide />} />
          <Route path="/restablecer" element={<Restablecer />} />
          <Route path="/autologin" element={<AutoLogin />} />
          <Route path="/marcador/:token" element={<Marcador />} />
          <Route path="/marcador" element={<Marcador />} />

          {/* Panel de empresa */}
          <Route path="/app" element={<EmpresaRoute><Layout /></EmpresaRoute>}>
            <Route index element={<DashboardEmpresa />} />
            <Route path="kiosco" element={<MarcadorLink />} />
            <Route path="colaboradores" element={<Colaboradores />} />
            <Route path="colaboradores/:id" element={<ColaboradorDetalle />} />
            <Route path="registros" element={<Registros />} />
            <Route path="festivos" element={<Festivos />} />
            <Route path="reportes" element={<Reportes />} />
            <Route path="configuracion" element={<Configuracion />} />
            <Route path="suscripcion" element={<Suscripcion />} />
          </Route>

          {/* Panel super admin HoraPro */}
          <Route path="/admin" element={<SuperAdminRoute><Layout /></SuperAdminRoute>}>
            <Route index element={<AdminDashboard />} />
            <Route path="empresas" element={<AdminEmpresas />} />
            <Route path="empresas/:id" element={<AdminEmpresaDetalle />} />
            <Route path="pagos" element={<AdminPagos />} />
            <Route path="afiliados" element={<AdminAfiliados />} />
            <Route path="configuracion" element={<AdminConfiguracion />} />
          </Route>

          {/* Panel del afiliado (programa de referidos) */}
          <Route path="/afiliado" element={<AfiliadoRoute><PanelAfiliado /></AfiliadoRoute>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
    </CapturadorErrores>
  );
}
