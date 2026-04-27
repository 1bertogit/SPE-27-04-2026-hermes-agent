import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Activity,
  LayoutDashboard,
  Users,
  ClipboardList,
  Camera,
  BarChart3,
  Settings,
  HelpCircle,
  LogOut,
  ChevronDown,
  Menu,
  X,
  Sun,
  Moon,
  CalendarDays,
  BookOpen,
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { useThemeStore } from '../../stores/themeStore';
import { Avatar } from '../ui/Avatar';

const navLinks = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/patients', label: 'Pacientes', icon: Users },
  { to: '/appointments', label: 'Agendamentos', icon: CalendarDays },
  { to: '/evaluations', label: 'Avaliações', icon: ClipboardList },
  { to: '/photos', label: 'Fotos', icon: Camera },
  { to: '/analytics', label: 'Relatórios', icon: BarChart3 },
  { to: '/reference', label: 'Referência', icon: BookOpen },
];

export function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, signOut } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
    setProfileOpen(false);
  }, [location.pathname]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const toggleProfile = () => {
    setProfileOpen((prev) => !prev);
    if (!profileOpen) setMobileOpen(false);
  };

  const toggleMobile = () => {
    setMobileOpen((prev) => !prev);
    if (!mobileOpen) setProfileOpen(false);
  };

  return (
    <nav className="fixed top-0 left-0 right-0 h-16 bg-white/90 dark:bg-editorial-navy/90 backdrop-blur-xl border-b border-editorial-cream dark:border-editorial-navy-light/20 z-40 transition-colors duration-300">
      <div className="max-w-container mx-auto h-full px-4 lg:px-8 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link to="/dashboard" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-editorial-gold/10 border border-editorial-gold/20 flex items-center justify-center">
              <Activity className="h-5 w-5 text-editorial-gold" />
            </div>
            <span className="text-lg font-bold font-serif text-editorial-navy dark:text-editorial-cream hidden sm:inline">SPE-M</span>
          </Link>

          <div className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => {
              const active = location.pathname.startsWith(link.to);
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`flex items-center gap-2 px-3 py-2 rounded text-sm font-medium transition-colors ${
                    active
                      ? 'text-editorial-gold bg-editorial-gold/8'
                      : 'text-editorial-muted hover:text-editorial-navy dark:hover:text-editorial-cream hover:bg-editorial-cream/50 dark:hover:bg-white/5'
                  }`}
                >
                  <link.icon className="h-4 w-4" />
                  {link.label}
                </Link>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className="relative w-10 h-10 rounded-lg flex items-center justify-center text-editorial-muted hover:text-editorial-navy dark:hover:text-editorial-cream hover:bg-editorial-cream/50 dark:hover:bg-white/5 transition-all duration-300 focus-ring"
            aria-label={theme === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro'}
          >
            <Sun className={`h-[18px] w-[18px] absolute transition-all duration-300 ${theme === 'dark' ? 'opacity-0 rotate-90 scale-0' : 'opacity-100 rotate-0 scale-100'}`} />
            <Moon className={`h-[18px] w-[18px] absolute transition-all duration-300 ${theme === 'dark' ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-0'}`} />
          </button>

          <div className="relative">
            <button
              onClick={toggleProfile}
              className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-editorial-cream/50 dark:hover:bg-white/5 transition-colors focus-ring"
            >
              <Avatar name={profile?.full_name ?? 'U'} size="sm" />
              <span className="text-sm text-editorial-navy dark:text-editorial-cream hidden md:inline max-w-[120px] truncate">
                {profile?.full_name || 'Usuário'}
              </span>
              <ChevronDown className="h-4 w-4 text-editorial-muted hidden md:block" />
            </button>

            {profileOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setProfileOpen(false)} />
                <div className="absolute right-0 top-full mt-1 w-52 bg-white dark:bg-editorial-navy border border-editorial-cream dark:border-editorial-navy-light/20 rounded-lg shadow-lg z-50 py-1 animate-slide-down">
                  <div className="px-3 py-2 border-b border-editorial-cream dark:border-editorial-navy-light/20 mb-1">
                    <p className="text-sm font-medium text-editorial-navy dark:text-editorial-cream truncate">
                      {profile?.full_name || 'Usuário'}
                    </p>
                    <p className="text-xs text-editorial-muted truncate">{profile?.email}</p>
                  </div>
                  <Link
                    to="/settings"
                    onClick={() => setProfileOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-editorial-muted hover:text-editorial-navy dark:hover:text-editorial-cream hover:bg-editorial-cream/40 dark:hover:bg-white/5 transition-colors"
                  >
                    <Settings className="h-4 w-4" />
                    Configurações
                  </Link>
                  <Link
                    to="/help"
                    onClick={() => setProfileOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-editorial-muted hover:text-editorial-navy dark:hover:text-editorial-cream hover:bg-editorial-cream/40 dark:hover:bg-white/5 transition-colors"
                  >
                    <HelpCircle className="h-4 w-4" />
                    Ajuda
                  </Link>
                  <hr className="border-editorial-cream dark:border-editorial-navy-light/20 my-1" />
                  <button
                    onClick={handleSignOut}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-editorial-rose hover:bg-editorial-rose-light transition-colors w-full text-left"
                  >
                    <LogOut className="h-4 w-4" />
                    Sair
                  </button>
                </div>
              </>
            )}
          </div>

          <button
            onClick={toggleMobile}
            className="lg:hidden p-2 text-editorial-muted hover:text-editorial-navy dark:hover:text-editorial-cream transition-colors"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="lg:hidden bg-white dark:bg-editorial-navy border-b border-editorial-cream dark:border-editorial-navy-light/20 px-4 py-2 animate-slide-down">
          {navLinks.map((link) => {
            const active = location.pathname.startsWith(link.to);
            return (
              <Link
                key={link.to}
                to={link.to}
                className={`flex items-center gap-2 px-3 py-2.5 rounded text-sm font-medium transition-colors ${
                  active
                    ? 'text-editorial-gold bg-editorial-gold/8'
                    : 'text-editorial-muted hover:text-editorial-navy dark:hover:text-editorial-cream hover:bg-editorial-cream/50 dark:hover:bg-white/5'
                }`}
              >
                <link.icon className="h-4 w-4" />
                {link.label}
              </Link>
            );
          })}
        </div>
      )}
    </nav>
  );
}
