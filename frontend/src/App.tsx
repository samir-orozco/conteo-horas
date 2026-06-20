import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Reloj from './pages/Reloj';
import Colaboradores from './pages/Colaboradores';
import Registros from './pages/Registros';
import Festivos from './pages/Festivos';
import Reportes from './pages/Reportes';
import Configuracion from './pages/Configuracion';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { usuario, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-800" /></div>;
  return usuario ? <>{children}</> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
            <Route index element={<Reloj />} />
            <Route path="colaboradores" element={<Colaboradores />} />
            <Route path="registros" element={<Registros />} />
            <Route path="festivos" element={<Festivos />} />
            <Route path="reportes" element={<Reportes />} />
            <Route path="configuracion" element={<Configuracion />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
