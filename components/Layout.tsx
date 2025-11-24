import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTheme } from '../services/ThemeContext';
import { useSettings } from '../services/SettingsContext';
import { useAuth } from '../services/AuthContext';

interface LayoutProps {
  children: React.ReactNode;
  hideSidebar?: boolean;
}

const Layout: React.FC<LayoutProps> = ({ children, hideSidebar = false }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { settings } = useSettings();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  if (hideSidebar) {
    return <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors">{children}</div>;
  }

  const navItems = [
    { name: 'Recepção', path: '/reception', icon: 'desk' },
    { name: 'Sala de Atendimento', path: '/attendant', icon: 'support_agent' },
    { name: 'Painel TV', path: '/tv-panel', icon: 'monitor' },
    { name: 'Coordenação', path: '/dashboard', icon: 'bar_chart' },
    { name: 'Relatórios', path: '/reports', icon: 'description' },
  ];

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 dark:bg-slate-950 text-white flex flex-col fixed h-full z-20 border-r border-slate-800">
        <div className="p-6 border-b border-slate-800 flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-lg">
            <span className="material-symbols-outlined text-white text-xl">account_balance</span>
          </div>
          <div>
            <h1 className="font-bold text-sm leading-tight">SAS</h1>
            <p className="text-xs text-slate-400">Uruburetama</p>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                  }`}
              >
                <span className="material-symbols-outlined">{item.icon}</span>
                <span className="font-medium">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800 space-y-4">
          {/* Theme Toggle in Sidebar */}
          <button
            onClick={toggleTheme}
            className="flex items-center gap-3 px-4 py-2 w-full rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <span className="material-symbols-outlined">
              {theme === 'dark' ? 'light_mode' : 'dark_mode'}
            </span>
            <span className="text-sm font-medium">
              {theme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}
            </span>
          </button>

          <div className="flex items-center gap-3 px-2 pt-2">
            <img src={user?.avatarUrl} alt="Avatar" className="w-8 h-8 rounded-full border border-slate-600" />
            <div className="overflow-hidden">
              <p className="text-sm font-medium text-white truncate">{user?.name}</p>
              <Link to="/profile" className="text-xs text-slate-400 truncate capitalize hover:text-blue-400 block">Editar Perfil</Link>
            </div>
            <button onClick={handleLogout} className="ml-auto text-slate-400 hover:text-red-400" title="Sair">
              <span className="material-symbols-outlined text-lg">logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 transition-colors duration-300">
        {children}
      </main>
    </div>
  );
};

export default Layout;