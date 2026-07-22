import React from 'react';
import { useKaraoke } from '../context/KaraokeContext';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { Button } from '../components/Button';
import { 
  LayoutDashboard, 
  Users, 
  LogOut, 
  Music, 
  Mic2,
  Settings,
  ChevronRight
} from 'lucide-react';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';

export const DJLayout = ({ children }: { children: React.ReactNode }) => {
  const { logout, stats, isSessionActive, toggleSession } = useKaraoke();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/dj/login');
  };

  const navItems = [
    { label: 'PRODUCCIÓN', path: '/dj/dashboard', icon: LayoutDashboard },
    { label: 'GESTIÓN MESAS', path: '/dj/tables', icon: Users },
  ];

  return (
    <div className="min-h-screen bg-app-bg flex text-app-text-p selection:bg-app-accent/30 selection:text-white">
      {/* Sidebar */}
      <aside className="w-64 bg-app-card/60 backdrop-blur-3xl border-r border-app-line flex flex-col fixed inset-y-0 z-50">
        <div className="p-8">
          <Link to="/dj/dashboard" className="flex flex-col gap-1 items-center">
            <img 
              src="/LOGO PNG.png" 
              alt="Logo" 
              className="h-10 w-auto object-contain drop-shadow-[0_0_15px_rgba(124,58,237,0.3)] mb-2"
              referrerPolicy="no-referrer"
            />
            <div className="flex items-center gap-1.5">
              <span className="text-xl font-black tracking-tighter uppercase">Jumic</span>
              <span className="px-1.5 py-0.5 rounded bg-app-accent text-white text-[8px] font-black uppercase tracking-widest shadow-[0_0_10px_rgba(124,58,237,0.5)]">PRO</span>
            </div>
          </Link>
        </div>

        <nav className="flex-1 px-4 space-y-6 mt-4">
          <div>
            <div className="px-3 mb-4 text-[9px] font-black text-app-text-s/40 uppercase tracking-[0.25em]">Estación de Trabajo</div>
            <div className="space-y-1.5">
              {navItems.map((item) => {
                const isActive = location.pathname === item.path;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-2xl transition-all group relative overflow-hidden",
                      isActive 
                        ? "bg-app-accent text-white shadow-xl shadow-app-accent/20" 
                        : "text-app-text-s hover:bg-app-card-light hover:text-app-text-p"
                    )}
                  >
                    {isActive && (
                      <motion.div 
                        layoutId="nav-glow"
                        className="absolute inset-0 bg-linear-to-r from-app-accent to-app-accent-blue opacity-100"
                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                      />
                    )}
                    <Icon className={cn("w-4 h-4 relative z-10", isActive ? "text-white" : "text-app-text-s group-hover:text-app-accent")} />
                    <span className="font-black text-[10px] tracking-widest relative z-10">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </nav>

        <div className="p-6 mt-auto space-y-4">
          <div className="bg-app-card-light/40 backdrop-blur-md rounded-[2rem] p-5 border border-app-line/50">
            <div className="flex items-center justify-between mb-3 text-[9px] font-black uppercase tracking-widest text-app-text-s/60">
              <span>ESTADO</span>
              <span className={cn(isSessionActive ? "text-app-success" : "text-app-warning")}>
                {isSessionActive ? 'ACTIVO' : 'PAUSA'}
              </span>
            </div>
            <div className="flex items-center justify-center p-1 bg-app-bg/50 rounded-2xl border border-app-line/50">
              <button 
                onClick={toggleSession}
                className={cn(
                  "w-full py-2.5 rounded-xl text-[9px] font-black tracking-[0.2em] transition-all",
                  isSessionActive ? "bg-app-success/10 text-app-success" : "bg-app-warning/10 text-app-warning"
                )}
              >
                {isSessionActive ? 'APAGAR' : 'ENCENDER'}
              </button>
            </div>
          </div>
          
          <button 
            className="w-full h-12 flex items-center justify-center gap-2 text-[10px] font-black text-app-text-s/40 hover:text-red-400 uppercase tracking-[0.2em] transition-colors"
            onClick={handleLogout}
          >
            <LogOut className="w-3.5 h-3.5" />
            DESCONECTAR
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64 flex flex-col">
        <header className="h-20 bg-app-bg/50 backdrop-blur-md border-b border-app-line/50 flex items-center justify-between px-10 sticky top-0 z-40">
          <div>
            <div className="text-[10px] font-black text-app-text-s uppercase tracking-[0.25em] mb-0.5 opacity-40">Consola Central</div>
            <h2 className="text-app-text-p font-black text-xl tracking-tighter uppercase flex items-center gap-2">
              Jumic <span className="text-app-accent">System</span>
            </h2>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="flex items-baseline gap-1.5 text-right hidden sm:block">
                <span className="text-[10px] font-black text-app-text-s uppercase tracking-widest opacity-40">Pendientes</span>
                <span className="text-xl font-black text-app-cyan tabular-nums">{stats.pending}</span>
            </div>
            <div className="w-px h-8 bg-app-line" />
            <button 
              onClick={toggleSession}
              className={cn(
                "flex items-center gap-3 px-6 py-2.5 rounded-2xl text-[10px] font-black transition-all border",
                isSessionActive 
                  ? "bg-app-success/5 text-app-success border-app-success/20 hover:shadow-[0_0_15px_rgba(34,197,94,0.15)]" 
                  : "bg-app-warning/5 text-app-warning border-app-warning/20 hover:shadow-[0_0_15px_rgba(245,158,11,0.15)]"
              )}
            >
              <div className={cn(
                "w-1.5 h-1.5 rounded-full",
                isSessionActive ? "bg-app-success shadow-[0_0_8px_var(--color-app-success)] animate-pulse" : "bg-app-warning"
              )} />
              {isSessionActive ? 'KARAOKE LIVE' : 'LISTA CERRADA'}
            </button>
          </div>
        </header>

        <div className="p-10 overflow-y-auto">
          {children}
        </div>
      </main>
    </div>
  );
};
