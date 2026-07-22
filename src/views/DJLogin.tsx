import React, { useState } from 'react';
import { useKaraoke } from '../context/KaraokeContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { Lock, Mail, Music2, ShieldCheck } from 'lucide-react';
import { motion } from 'motion/react';

export const DJLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const { login } = useKaraoke();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoggingIn(true);
    
    try {
      const success = await login(email, password);
      if (success) {
        navigate('/dj/dashboard');
      } else {
        setError('Acceso denegado. Verifica tus credenciales.');
        setIsLoggingIn(false);
      }
    } catch (e: any) {
      if (e.message === 'ENABLE_EMAIL_AUTH') {
        setError('ERROR CRÍTICO: El proveedor de "Correo/Contraseña" está desactivado en la consola de Firebase.');
      } else {
        setError('Error inesperado al conectar con el servidor.');
      }
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-app-bg flex items-center justify-center p-6 selection:bg-app-accent/30 font-sans tracking-tight">
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-app-card p-10 rounded-[2.5rem] border border-app-line shadow-2xl relative z-10"
      >
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-app-accent text-white mb-6 shadow-xl shadow-app-accent/20">
            <Music2 className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-black text-app-text-p uppercase tracking-tight">DJ Acceso</h1>
          <p className="text-app-text-s text-[10px] uppercase font-bold tracking-[0.2em] mt-3 opacity-60">Control Administrativo Central</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="block text-[10px] font-bold text-app-text-s uppercase tracking-widest ml-1 opacity-70">Identificación</label>
            <div className="relative group">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-app-text-s transition-colors group-focus-within:text-app-accent" />
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="usuario@karaokepro.com"
                className="w-full pl-11 pr-4 py-4 bg-app-bg border border-app-line rounded-2xl text-app-text-p placeholder:text-app-text-s/30 focus:border-app-accent outline-none transition-all font-bold text-sm"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-[10px] font-bold text-app-text-s uppercase tracking-widest ml-1 opacity-70">Clave Maestra</label>
            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-app-text-s transition-colors group-focus-within:text-app-accent" />
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-11 pr-4 py-4 bg-app-bg border border-app-line rounded-2xl text-app-text-p placeholder:text-app-text-s/30 focus:border-app-accent outline-none transition-all font-bold text-sm"
              />
            </div>
          </div>
          
          {error && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-[10px] font-bold text-center uppercase tracking-widest"
            >
              {error}
            </motion.div>
          )}

          <div className="pt-4">
            <Button 
                type="submit" 
                disabled={isLoggingIn}
                className="w-full h-14 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em]"
            >
              {isLoggingIn ? 'Autenticando...' : 'Autenticar'}
            </Button>
          </div>
        </form>

        <div className="mt-12 pt-8 border-t border-app-line/30 flex flex-col items-center gap-4">
          <div className="flex items-center gap-2 text-app-text-s text-[9px] uppercase font-bold tracking-widest">
            <ShieldCheck className="w-3.5 h-3.5 text-app-success" />
            Encriptación de Grado Industrial
          </div>
        </div>
      </motion.div>
    </div>
  );
};
