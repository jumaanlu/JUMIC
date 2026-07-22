import React from 'react';
import { Link } from 'react-router-dom';
import { Music, Music2, Users, Mic2, ArrowRight } from 'lucide-react';
import { Button } from '../components/Button';
import { motion } from 'motion/react';

export const Home = () => {
  return (
    <div className="min-h-screen bg-app-bg flex flex-col items-center justify-center p-6 text-app-text-p font-sans selection:bg-app-accent/30 tracking-tight">
      {/* Background gradients */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-app-accent/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[120px] animate-pulse" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl w-full text-center relative z-10"
      >
        <header className="mb-12">
          <div className="flex justify-center mb-6 relative">
            <div className="absolute inset-0 bg-app-accent-secondary/30 blur-3xl rounded-full" />
            <img 
              src="/LOGO PNG.png" 
              alt="Jumic Logo" 
              className="h-28 md:h-36 w-auto object-contain drop-shadow-2xl relative z-10"
              referrerPolicy="no-referrer"
            />
          </div>
          <h1 className="text-5xl md:text-6xl font-black uppercase tracking-tighter mb-4 hidden">
            Jumic
          </h1>
          <p className="text-app-text-s text-sm md:text-base font-bold uppercase tracking-[0.3em] opacity-60">
            Escenario Digital • Gestión Inteligente
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card for users/tables */}
          <motion.div 
            whileHover={{ y: -5 }}
            className="bg-app-card p-8 rounded-[2.5rem] border border-app-line shadow-xl flex flex-col items-center text-center group transition-all hover:border-app-accent/30"
          >
            <div className="w-14 h-14 rounded-2xl bg-app-bg text-app-accent flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Mic2 className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold uppercase tracking-tight mb-2">Para Cantantes</h3>
            <p className="text-app-text-s text-xs mb-8 leading-relaxed font-semibold uppercase tracking-widest opacity-60">
              Escanea el QR de tu mesa para registrar tu canción en la lista del DJ.
            </p>
            <Link to="/mesa/mesa-1" className="w-full mt-auto">
              <Button variant="outline" className="w-full h-12 rounded-2xl text-[10px] font-black uppercase tracking-widest border-app-line hover:bg-app-accent/5">
                Probar Mesa 1
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </motion.div>

          {/* Card for DJ */}
          <motion.div 
            whileHover={{ y: -5 }}
            className="bg-app-card p-8 rounded-[2.5rem] border border-app-line shadow-xl flex flex-col items-center text-center group transition-all hover:border-app-accent/30"
          >
            <div className="w-14 h-14 rounded-2xl bg-app-bg text-indigo-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold uppercase tracking-tight mb-2">Para el DJ</h3>
            <p className="text-app-text-s text-xs mb-8 leading-relaxed font-semibold uppercase tracking-widest opacity-60">
              Gestiona la cola de canciones, mesas y estadísticas del sistema.
            </p>
            <Link to="/dj/login" className="w-full mt-auto">
              <Button className="w-full h-14 rounded-2xl text-[11px] font-black uppercase tracking-widest gap-2">
                Entrar al Panel
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </motion.div>
        </div>

        <footer className="mt-16 flex flex-col items-center gap-4 text-app-text-s text-[10px] font-bold uppercase tracking-widest opacity-40">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-app-accent-secondary animate-pulse" />
              <span>Turnos pensados para todos</span>
            </div>
           <p>&copy; 2026 Jumic Version 2.0</p>
        </footer>
      </motion.div>
    </div>
  );
};
