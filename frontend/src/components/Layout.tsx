import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Clock, Users, Calendar, Settings, BarChart2, LogOut, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { to: '/', label: 'Reloj', icon: Clock },
  { to: '/colaboradores', label: 'Colaboradores', icon: Users },
  { to: '/registros', label: 'Registros', icon: BarChart2 },
  { to: '/festivos', label: 'Festivos', icon: Calendar },
  { to: '/reportes', label: 'Reportes', icon: BarChart2 },
  { to: '/configuracion', label: 'Configuración', icon: Settings },
];

export default function Layout() {
  const { usuario, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-blue-900 text-white min-h-screen">
        <div className="p-6 border-b border-blue-800">
          <h1 className="text-xl font-bold">Conteo Horas</h1>
          <p className="text-blue-300 text-sm mt-1">{usuario?.nombre}</p>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} end={to === '/'}
              className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${isActive ? 'bg-blue-700 text-white' : 'text-blue-200 hover:bg-blue-800'}`}>
              <Icon size={18} />{label}
            </NavLink>
          ))}
        </nav>
        <button onClick={handleLogout} className="flex items-center gap-3 px-8 py-4 text-blue-300 hover:text-white text-sm border-t border-blue-800">
          <LogOut size={16} />Cerrar sesión
        </button>
      </aside>

      {/* Mobile header */}
      <div className="md:hidden fixed top-0 left-0 right-0 bg-blue-900 text-white z-50 flex items-center justify-between px-4 py-3">
        <h1 className="font-bold">Conteo Horas</h1>
        <button onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X size={22} /> : <Menu size={22} />}</button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden fixed inset-0 bg-blue-900 text-white z-40 pt-16">
          <nav className="p-4 space-y-1">
            {navItems.map(({ to, label, icon: Icon }) => (
              <NavLink key={to} to={to} end={to === '/'} onClick={() => setMenuOpen(false)}
                className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium ${isActive ? 'bg-blue-700' : 'text-blue-200'}`}>
                <Icon size={18} />{label}
              </NavLink>
            ))}
            <button onClick={handleLogout} className="flex items-center gap-3 px-4 py-3 text-blue-300 text-sm w-full">
              <LogOut size={16} />Cerrar sesión
            </button>
          </nav>
        </div>
      )}

      <main className="flex-1 md:ml-0 mt-14 md:mt-0 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
