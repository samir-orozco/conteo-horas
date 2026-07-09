import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  Clock, Users, Calendar, Settings, BarChart2, LogOut, Menu, X,
  Building2, CreditCard, LayoutDashboard, AlertTriangle, Home,
} from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import BloqueoPago from './BloqueoPago';
import logoCompleto from '../assets/logo-completo.svg';

type NavItem = { to: string; label: string; icon: any };
type NavSection = { titulo: string; items: NavItem[] };

const navEmpresa: NavSection[] = [
  {
    titulo: 'General',
    items: [
      { to: '/app', label: 'Inicio', icon: Home },
      { to: '/app/kiosco', label: 'Marcador', icon: Clock },
      { to: '/app/colaboradores', label: 'Colaboradores', icon: Users },
      { to: '/app/registros', label: 'Registros', icon: BarChart2 },
    ],
  },
  {
    titulo: 'Herramientas',
    items: [
      { to: '/app/festivos', label: 'Festivos', icon: Calendar },
      { to: '/app/reportes', label: 'Reportes', icon: BarChart2 },
      { to: '/app/configuracion', label: 'Configuración', icon: Settings },
      { to: '/app/suscripcion', label: 'Suscripción', icon: CreditCard },
    ],
  },
];

const navSuperAdmin: NavSection[] = [
  {
    titulo: 'Plataforma',
    items: [
      { to: '/admin', label: 'Dashboard', icon: LayoutDashboard },
      { to: '/admin/empresas', label: 'Empresas', icon: Building2 },
      { to: '/admin/pagos', label: 'Pagos', icon: CreditCard },
      { to: '/admin/configuracion', label: 'Precios', icon: Settings },
    ],
  },
];

function Logo() {
  return <img src={logoCompleto} alt="HoraPro" className="h-9" />;
}

export default function Layout() {
  const { usuario, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const esSuperAdmin = usuario?.rol === 'SUPER_ADMIN';
  const secciones = esSuperAdmin ? navSuperAdmin : navEmpresa;
  const enMora = usuario?.estadoSuscripcion === 'EN_MORA';

  const handleLogout = () => { logout(); navigate('/login'); };

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
      isActive ? 'bg-primary text-ink' : 'text-muted hover:bg-gray-100 hover:text-ink'
    }`;

  const NavContent = ({ onNav }: { onNav?: () => void }) => (
    <nav className="flex-1 px-4 py-2 space-y-5 overflow-y-auto">
      {secciones.map(sec => (
        <div key={sec.titulo}>
          <p className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400">{sec.titulo}</p>
          <div className="space-y-1">
            {sec.items.map(({ to, label, icon: Icon }) => (
              <NavLink key={to} to={to} end={to === '/app' || to === '/admin'} onClick={onNav} className={linkClass}>
                <Icon size={18} />{label}
              </NavLink>
            ))}
          </div>
        </div>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen bg-[#f6f6f4] flex">
      {/* Sidebar desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-gray-200 min-h-screen sticky top-0 h-screen">
        <div className="px-6 py-5 border-b border-gray-100">
          <Logo />
        </div>
        <NavContent />
        <div className="border-t border-gray-100 p-4">
          <div className="flex items-center gap-3 px-2">
            <div className="bg-primary/30 rounded-full w-9 h-9 flex items-center justify-center text-sm font-bold text-ink">
              {usuario?.nombre?.[0] ?? '?'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-ink truncate">{usuario?.nombre}</p>
              <p className="text-xs text-muted truncate">
                {esSuperAdmin ? 'Super Admin' : usuario?.empresaNombre ?? usuario?.email}
              </p>
            </div>
            <button onClick={handleLogout} title="Cerrar sesión" className="text-muted hover:text-ink">
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="md:hidden fixed top-0 left-0 right-0 bg-white border-b border-gray-200 z-50 flex items-center justify-between px-4 py-3">
        <Logo />
        <button onClick={() => setMenuOpen(!menuOpen)} className="text-ink">
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden fixed inset-0 bg-white z-40 pt-16 flex flex-col">
          <NavContent onNav={() => setMenuOpen(false)} />
          <button onClick={handleLogout} className="flex items-center gap-3 px-7 py-4 text-muted text-sm border-t border-gray-100">
            <LogOut size={16} />Cerrar sesión
          </button>
        </div>
      )}

      <main className="flex-1 mt-14 md:mt-0 overflow-auto">
        {enMora && (
          <div className="bg-primary/40 border-b border-primary px-6 py-2.5 flex items-center gap-2 text-sm text-ink">
            <AlertTriangle size={16} />
            <span>Tu suscripción está <b>en mora</b>. Realiza el pago para evitar la suspensión del servicio.</span>
          </div>
        )}
        <Outlet />
      </main>

      {/* Bloqueo total del panel cuando la suscripción está vencida */}
      {!esSuperAdmin && <BloqueoPago />}
    </div>
  );
}
