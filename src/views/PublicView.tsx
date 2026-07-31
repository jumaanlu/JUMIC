import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useKaraoke } from '../context/KaraokeContext';
import { Button } from '../components/Button';
import { Music, User, Store, Send, CheckCircle2, Clock, Info, XCircle, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

export const PublicView = () => {
  const { tableId } = useParams<{ tableId: string }>();
  const { tables, addSongRequest, isLoading, fairQueue, isSessionActive } = useKaraoke();
  
  const currentTable = tables.find(t => t.id === tableId);
  const pendingSongCount = currentTable
    ? Math.max(
        currentTable.pendingSongCount || 0,
        fairQueue.filter(request => request.tableId === currentTable.id).length
      )
    : 0;
  const isQueueLimitReached = pendingSongCount >= 3;
  
  const [singerName, setSingerName] = useState('');
  const [songTitle, setSongTitle] = useState('');
  const [artistName, setArtistName] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [assignedRound, setAssignedRound] = useState<number | null>(null);
  const [showRules, setShowRules] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-app-bg flex items-center justify-center">
        <div className="text-app-accent animate-pulse font-black uppercase tracking-widest text-[10px]">Verificando Sistema...</div>
      </div>
    );
  }

  if (!isSessionActive) {
    return (
      <div className="min-h-screen bg-app-bg flex items-center justify-center p-6 text-center text-app-text-p font-sans pb-20">
        <div className="max-w-md w-full">
            <header className="mb-10 flex flex-col items-center">
                <img 
                  src="/LOGO PNG.png" 
                  alt="Logo" 
                  className="h-20 w-auto object-contain mb-4 grayscale opacity-50"
                  referrerPolicy="no-referrer"
                />
                <h1 className="text-2xl font-black uppercase tracking-tight hidden">Jumic</h1>
            </header>
            
            <div className="bg-app-card p-10 rounded-[2.5rem] border border-app-line shadow-2xl">
              <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-6 ring-8 ring-red-500/5">
                <Clock className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-black uppercase tracking-tight">Jumic en Pausa</h2>
              <p className="text-app-text-s text-xs mt-4 leading-relaxed font-bold uppercase tracking-widest leading-loose">
                El DJ ha desactivado temporalmente el registro de canciones. 
                <br />
                <span className="text-app-accent">¡Atento al escenario para el aviso de reapertura!</span>
              </p>
            </div>
            
            <footer className="mt-12">
               <p className="text-[9px] text-app-text-s font-bold uppercase tracking-[0.2em] opacity-40">Mesa: {currentTable?.name || '---'}</p>
            </footer>
        </div>
      </div>
    );
  }

  if (!currentTable) {
    return (
      <div className="min-h-screen bg-app-bg flex items-center justify-center p-6 text-center text-app-text-p font-sans">
        <div className="bg-app-card p-10 rounded-3xl border border-app-line max-w-sm w-full">
          <Store className="w-12 h-12 text-app-accent mx-auto mb-6 opacity-30" />
          <h1 className="text-xl font-bold uppercase tracking-tight">Acceso Inválido</h1>
          <p className="text-app-text-s text-xs mt-3 leading-relaxed font-semibold uppercase tracking-widest opacity-60">Por favor escanea el código QR de tu mesa para continuar.</p>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isQueueLimitReached) {
      setError('Tu mesa ya tiene 3 canciones pendientes. Espera a que una sea completada o marcada como NO SHOW.');
      return;
    }
    if (!singerName || !songTitle || !artistName) return;

    setError(null);
    setIsSubmitting(true);

    try {
      const nextRound = await addSongRequest({
        tableId: currentTable.id,
        singerName,
        songTitle,
        artistName,
      });
      setAssignedRound(nextRound);
      
      setSubmitted(true);
      setSingerName('');
      setSongTitle('');
      setArtistName('');
      
      setTimeout(() => setSubmitted(false), 5000);
    } catch (err) {
      console.error("Error sending request:", err);
      setError(
        err instanceof Error && err.message === 'QUEUE_LIMIT'
          ? 'Tu mesa ya tiene 3 canciones pendientes. Podrás registrar otra cuando una sea completada o marcada como NO SHOW.'
          : 'No se pudo enviar la canción. Verifica tu conexión.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-app-bg pb-12 px-6 pt-20 font-sans text-app-text-p selection:bg-app-accent/30 tracking-tight">
      <div className="max-w-md mx-auto">
        <header className="flex flex-col items-center mb-10 relative">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 bg-app-accent-secondary/20 blur-3xl rounded-full" />
          <img 
            src="/LOGO PNG.png" 
            alt="Logo" 
            className="h-24 w-auto object-contain mb-4 drop-shadow-xl relative z-10"
            referrerPolicy="no-referrer"
          />
          <h1 className="text-2xl font-black uppercase tracking-tight hidden">Jumic</h1>
          <div className="mt-2 inline-block px-4 py-1.5 bg-app-accent/10 border border-app-accent/20 rounded-full">
            <p className="text-app-accent font-bold uppercase tracking-widest text-[10px]">{currentTable.name}</p>
          </div>
        </header>

        <AnimatePresence>
          {isQueueLimitReached && (
            <motion.div
              role="alert"
              aria-live="assertive"
              initial={{ opacity: 0, scale: 0.94, y: -12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: -12 }}
              className="mb-6 overflow-hidden rounded-[2rem] border-2 border-red-500 bg-red-500/15 shadow-[0_0_45px_rgba(239,68,68,0.35)]"
            >
              <div className="h-2 bg-red-500 animate-pulse" />
              <div className="p-6 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500 text-white flex items-center justify-center ring-8 ring-red-500/15">
                  <AlertTriangle className="w-9 h-9" />
                </div>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-red-300 mb-2">Atención</p>
                <h2 className="text-xl font-black uppercase tracking-tight text-white">Límite de 3 canciones alcanzado</h2>
                <p className="mt-3 text-xs leading-relaxed font-bold text-red-100">
                  Ya no puedes agregar más canciones. Podrás registrar otra cuando una canción sea completada o marcada como NO SHOW.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {!submitted ? (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-app-card p-8 rounded-[2rem] border border-app-line shadow-2xl space-y-8"
            >
              <div className="space-y-1">
                <h2 className="text-xl font-bold uppercase tracking-tight">Registro de Canción</h2>
                <p className="text-[10px] text-app-text-s font-bold uppercase tracking-widest opacity-60">Completa los detalles para entrar a la lista</p>
                <p className="text-[9px] text-app-accent font-black uppercase tracking-widest pt-2">{pendingSongCount} de 3 canciones pendientes</p>
              </div>
              
              <form onSubmit={handleSubmit} className="space-y-6" aria-disabled={isQueueLimitReached}>
                <div className="space-y-2">
                  <label className="block text-[10px] font-bold text-app-text-s uppercase tracking-widest ml-1 opacity-70">¿Quién va a cantar?</label>
                  <div className="relative group">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-app-text-s transition-colors group-focus-within:text-app-accent" />
                    <input
                      type="text"
                      required
                      disabled={isQueueLimitReached}
                      value={singerName}
                      onChange={e => setSingerName(e.target.value)}
                      placeholder="Nombre del intérprete"
                      className="w-full bg-app-bg/50 pl-11 pr-4 py-4 rounded-2xl border border-app-line focus:border-app-accent focus:ring-1 focus:ring-app-accent/20 outline-none transition-all placeholder:text-app-text-s/30 font-bold text-sm disabled:cursor-not-allowed disabled:opacity-40 disabled:border-red-500/30"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-[10px] font-bold text-app-text-s uppercase tracking-widest ml-1 opacity-70">¿Qué canción vas a cantar?</label>
                  <div className="relative group">
                    <Music className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-app-text-s transition-colors group-focus-within:text-app-accent" />
                    <input
                      type="text"
                      required
                      disabled={isQueueLimitReached}
                      value={songTitle}
                      onChange={e => setSongTitle(e.target.value)}
                      placeholder="Título de la canción"
                      className="w-full bg-app-bg/50 pl-11 pr-4 py-4 rounded-2xl border border-app-line focus:border-app-accent focus:ring-1 focus:ring-app-accent/20 outline-none transition-all placeholder:text-app-text-s/30 font-bold text-sm disabled:cursor-not-allowed disabled:opacity-40 disabled:border-red-500/30"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-[10px] font-bold text-app-text-s uppercase tracking-widest ml-1 opacity-70">¿De quién es la canción?</label>
                  <div className="relative group">
                    <Store className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-app-text-s transition-colors group-focus-within:text-app-accent" />
                    <input
                      type="text"
                      required
                      disabled={isQueueLimitReached}
                      value={artistName}
                      onChange={e => setArtistName(e.target.value)}
                      placeholder="Nombre del artista"
                      className="w-full bg-app-bg/50 pl-11 pr-4 py-4 rounded-2xl border border-app-line focus:border-app-accent focus:ring-1 focus:ring-app-accent/20 outline-none transition-all placeholder:text-app-text-s/30 font-bold text-sm disabled:cursor-not-allowed disabled:opacity-40 disabled:border-red-500/30"
                    />
                  </div>
                </div>

                {error && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-[10px] font-bold text-center uppercase tracking-widest">
                    {error}
                  </div>
                )}

                <div className="pt-4">
                  <Button 
                    type="submit" 
                    disabled={isSubmitting || isQueueLimitReached}
                    className="w-full h-14 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] gap-3"
                  >
                    {isQueueLimitReached ? (
                        <>Límite de canciones alcanzado</>
                    ) : isSubmitting ? (
                        <>Iniciando Transmisión...</>
                    ) : (
                        <>
                            <Send className="w-4 h-4" />
                            Enviar al Escenario
                        </>
                    )}
                  </Button>
                </div>
              </form>
              
              <div className="p-5 bg-app-bg/30 rounded-2xl border border-app-line/50 flex items-center justify-between group cursor-pointer hover:bg-app-accent/5 transition-colors" onClick={() => setShowRules(true)}>
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-app-accent/10 text-app-accent flex items-center justify-center">
                        <Info className="w-4 h-4" />
                    </div>
                    <div>
                        <h3 className="text-[10px] font-bold text-app-text-p uppercase tracking-widest">¿Cómo funciona mi turno?</h3>
                        <p className="text-[9px] text-app-text-s/70 font-semibold uppercase tracking-widest">Da clic aquí para conocerlo</p>
                    </div>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-app-card p-12 rounded-[2.5rem] border border-app-success/30 shadow-2xl text-center"
            >
              <div className="w-20 h-20 bg-app-success/10 text-app-success rounded-full flex items-center justify-center mx-auto mb-8 ring-8 ring-app-success/5 shadow-[0_0_30px_rgba(34,197,94,0.2)]">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h2 className="text-2xl font-black uppercase tracking-tight mb-3">¡Registrada!</h2>
              {assignedRound && (
                <div className="mb-4 inline-block px-3 py-1 bg-app-accent/10 border border-app-accent/20 rounded-full">
                  <p className="text-app-accent font-black uppercase tracking-[0.1em] text-[10px]">Turnos: Ronda {assignedRound}</p>
                </div>
              )}
              <p className="text-app-text-s text-xs mb-10 leading-relaxed font-bold uppercase tracking-widest">Tu solicitud ha sido enviada al DJ. ¡Prepárate para cantar!</p>
              <Button 
                onClick={() => setSubmitted(false)}
                variant="outline" 
                className="w-full h-12 text-[10px] font-black uppercase tracking-widest border-app-line"
              >
                Pedir otra canción
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Rules Modal Overlay */}
        <AnimatePresence>
          {showRules && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-app-bg/80 backdrop-blur-md"
            >
              <motion.div 
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="bg-app-card border border-app-line p-8 rounded-[2.5rem] shadow-2xl max-w-sm w-full relative"
              >
                <button 
                  onClick={() => setShowRules(false)}
                  className="absolute top-6 right-6 text-app-text-s hover:text-app-text-p transition-colors"
                >
                  <XCircle className="w-6 h-6" />
                </button>

                <div className="space-y-6">
                  <header className="text-center pt-2">
                    <div className="w-16 h-16 bg-app-accent/10 text-app-accent rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <Music className="w-8 h-8" />
                    </div>
                    <h2 className="text-xl font-black uppercase tracking-tight">¿Cómo funciona tu turno?</h2>
                    <p className="text-[10px] text-app-text-s font-bold uppercase tracking-widest mt-2">Queremos que todos disfruten del karaoke y tengan oportunidad de cantar de forma justa 😊</p>
                  </header>

                  <div className="space-y-5">
                    <div className="flex gap-4">
                      <div className="text-app-accent font-black text-lg select-none">•</div>
                      <div>
                        <h4 className="text-[11px] font-black uppercase tracking-widest mb-1">Registro por mesa</h4>
                        <p className="text-[10px] text-app-text-s font-semibold uppercase tracking-widest leading-relaxed opacity-70">Las canciones se registran por mesa, así aseguramos que todas tengan su turno.</p>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <div className="text-app-accent font-black text-lg select-none">•</div>
                      <div>
                        <h4 className="text-[11px] font-black uppercase tracking-widest mb-1">Turnos por rondas</h4>
                        <p className="text-[10px] text-app-text-s font-semibold uppercase tracking-widest leading-relaxed opacity-70">Cada mesa canta una vez por ronda antes de repetir, permitiendo que todos participen sin largas esperas.</p>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <div className="text-app-accent font-black text-lg select-none">•</div>
                      <div>
                        <h4 className="text-[11px] font-black uppercase tracking-widest mb-1">Si llegas tarde</h4>
                        <p className="text-[10px] text-app-text-s font-semibold uppercase tracking-widest leading-relaxed opacity-70">Tu primera canción entra al final de la ronda actual cuando quedan al menos 3 turnos. Si la ronda está por terminar, entra al final de la siguiente para evitar ventajas.</p>
                      </div>
                    </div>

                    <div className="p-4 bg-app-bg/50 rounded-2xl border border-app-line/50 space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">💡</span>
                        <p className="text-[9px] font-black uppercase tracking-widest">Importante:</p>
                      </div>
                      <p className="text-[9px] text-app-text-s font-bold uppercase tracking-widest opacity-60">Una vez asignada, tu canción conserva su ronda y no obtiene ventaja por llegar tarde.</p>
                      <p className="text-[9px] text-app-text-s font-bold uppercase tracking-widest opacity-60">Cada mesa puede mantener hasta 3 canciones pendientes. Al completarse una, se libera un espacio.</p>
                      
                      <div className="flex items-center gap-2 pt-2 border-t border-app-line/30">
                        <span className="text-sm">🔹</span>
                        <p className="text-[9px] font-black uppercase tracking-widest text-app-accent">Nota del Sistema:</p>
                      </div>
                      <p className="text-[9px] text-app-text-s font-bold uppercase tracking-widest opacity-60">Una canción por mesa en cada ronda. Nadie repite seguido mientras otra mesa esté esperando.</p>
                    </div>
                  </div>

                  <Button onClick={() => setShowRules(false)} className="w-full rounded-2xl h-12 uppercase font-black text-[10px] tracking-widest mt-4">
                    ¡Entendido!
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Public Queue Preview */}
        <section className="mt-12 space-y-4">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-app-text-s flex items-center gap-2">
              <Clock className="w-3 h-3" />
              Próximos en Cantar
            </h3>
            <span className="text-[9px] font-bold text-app-accent bg-app-accent/10 px-2 py-0.5 rounded-full uppercase tracking-widest leading-none">En Vivo</span>
          </div>

          <div className="space-y-3">
              {fairQueue.slice(0, 5).map((song, idx) => {
                const songTable = tables.find(t => t.id === song.tableId);
                const itemLogicalRound = song.logicalRound || 1;

                return (
                  <div key={song.id} className="bg-app-card/40 border border-app-line/50 p-4 rounded-2xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-black",
                          idx === 0 ? "bg-app-accent text-white" : "bg-app-line text-app-text-s"
                        )}>
                          {idx + 1}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-app-text-p">{song.songTitle}</p>
                          <p className="text-[10px] text-app-text-s font-semibold uppercase tracking-tight">{song.artistName} • {song.singerName}</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-[9px] font-black text-app-accent uppercase tracking-widest">{songTable?.name}</p>
                        <p className="text-[8px] font-bold text-app-text-s uppercase tracking-widest opacity-60">Ronda {itemLogicalRound}</p>
                    </div>
                  </div>
                );
              })}

             {fairQueue.length === 0 && (
                <div className="p-8 border border-dashed border-app-line rounded-2xl text-center">
                   <p className="text-[10px] text-app-text-s font-bold uppercase tracking-widest opacity-40">La lista está libre. ¡Sé el primero!</p>
                </div>
             )}
          </div>
        </section>

        <footer className="mt-16 py-8 border-t border-app-line/30 flex flex-col items-center gap-4">
          <div className="flex items-center gap-4">
             <span className="w-1.5 h-1.5 rounded-full bg-app-success shadow-[0_0_6px_var(--color-app-success)] animate-pulse" />
             <span className="text-[9px] text-app-text-s font-bold uppercase tracking-[0.2em]">Servicio en Vivo • 2026</span>
          </div>
          <p className="text-[8px] text-app-text-s/30 uppercase font-black tracking-widest">Jumic • Powered by AI Studio</p>
        </footer>
      </div>
    </div>
  );
};
