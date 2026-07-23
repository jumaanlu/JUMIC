import React from 'react';
import { useKaraoke } from '../context/KaraokeContext';
import { StatCard } from '../components/StatCard';
import { Button } from '../components/Button';
import { 
  Music, 
  Mic2, 
  Users, 
  Play, 
  CheckCircle2,
  Clock,
  ExternalLink,
  Info,
  Plus,
  X,
  RefreshCw,
  Bell,
  History,
  Trash2,
  AlertTriangle,
  UserX
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { DJLayout } from '../components/DJLayout';
import { cn } from '../lib/utils';
import { Link, useNavigate } from 'react-router-dom';

export const DJDashboard = () => {
  const { stats, fairQueue, markAsSung, markNoShow, tables, addSongRequest, queue, resetSystem } = useKaraoke();
  const navigate = useNavigate();

  const [showAddModal, setShowAddModal] = React.useState(false);
  const [showResetModal, setShowResetModal] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<'queue' | 'history'>('queue');
  const [lastCount, setLastCount] = React.useState(queue.length);
  const [showToast, setShowToast] = React.useState(false);
  const [isSyncing, setIsSyncing] = React.useState(false);
  const [isResetting, setIsResetting] = React.useState(false);

  const formatDate = (timestamp?: number) => timestamp
    ? new Date(timestamp).toLocaleDateString('es-MX')
    : '---';

  const formatTime = (timestamp?: number) => timestamp
    ? new Date(timestamp).toLocaleTimeString('es-MX', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      })
    : '---';

  const waitMinutes = (createdAt: number, completedAt?: number) => completedAt
    ? Math.max(0, Math.round((completedAt - createdAt) / 60000))
    : null;

  const statusLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'Pendiente';
      case 'singing': return 'Cantando';
      case 'sung': return 'Cantó';
      case 'no_show': return 'No Show';
      case 'removed': return 'Eliminada (registro anterior)';
      default: return status;
    }
  };

  const exportToCSV = () => {
    const headers = [
      'Mesa',
      'Cantante',
      'Canción',
      'Artista',
      'Resultado',
      'Fecha de Solicitud',
      'Hora de Solicitud',
      'Fecha de Atención',
      'Hora de Atención',
      'Tiempo de Espera (min)'
    ];

    const rows = [...queue]
      .sort((a, b) => a.createdAt - b.createdAt)
      .map(song => {
        const table = tables.find(t => t.id === song.tableId);
        const tableName = table ? table.name : `Mesa ${song.tableId}`;
        
        const elapsedMinutes = waitMinutes(song.createdAt, song.completedAt);

        return [
          tableName,
          song.singerName,
          song.songTitle,
          song.artistName,
          statusLabel(song.status),
          formatDate(song.createdAt),
          formatTime(song.createdAt),
          formatDate(song.completedAt),
          formatTime(song.completedAt),
          elapsedMinutes ?? '---'
        ];
      });

    const csvContent = [
      headers.map(h => `"${h.replace(/"/g, '""')}"`).join(','),
      ...rows.map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `reporte_canciones_karaoke_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Monitor for new songs
  React.useEffect(() => {
    if (queue.length > lastCount) {
      setShowToast(true);
      setTimeout(() => setShowToast(false), 4000);
    }
    setLastCount(queue.length);
  }, [queue.length, lastCount]);

  const handleRefresh = () => {
    setIsSyncing(true);
    setTimeout(() => setIsSyncing(false), 800);
  };

  const [newReq, setNewReq] = React.useState({
    tableId: 'mesa-1',
    singerName: '',
    songTitle: '',
    artistName: ''
  });

  const handleManualAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReq.singerName || !newReq.songTitle || !newReq.artistName) return;
    
    await addSongRequest(newReq);
    setShowAddModal(false);
    setNewReq({ tableId: 'mesa-1', singerName: '', songTitle: '', artistName: '' });
  };

  const handleReset = async () => {
    setIsResetting(true);
    try {
      await resetSystem();
      setShowResetModal(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsResetting(false);
    }
  };

  React.useEffect(() => {
    console.log("DJ Dashboard - Queue Updated:", fairQueue);
  }, [fairQueue]);

  const nextSong = fairQueue[0];
  const upcomingQueue = fairQueue.slice(1);

  return (
    <DJLayout>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-5 mb-10">
        <StatCard 
          title="QUEUE STATUS" 
          value={stats.pending} 
          icon={<Clock className="w-5 h-5" />}
          description="CANCIONES EN ESPERA"
        />
        <StatCard 
          title="CANTARON"
          value={stats.completed} 
          icon={<CheckCircle2 className="w-5 h-5 text-app-success" />}
          description="TURNOS COMPLETADOS"
        />
        <StatCard
          title="NO SHOW"
          value={stats.noShows}
          icon={<UserX className="w-5 h-5 text-red-400" />}
          description="TURNOS NO PRESENTADOS"
        />
        <StatCard
          title="ESPERA PROMEDIO"
          value={`${stats.averageWaitMinutes} min`}
          icon={<Clock className="w-5 h-5 text-app-cyan" />}
          description={`${stats.turnsConsumed} TURNOS ATENDIDOS`}
        />
        <StatCard 
          title="MESAS"
          value={stats.activeTables} 
          icon={<Users className="w-5 h-5 text-app-cyan" />}
          description="MESAS EN SESIÓN"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Queue Column */}
        <div className="lg:col-span-2 space-y-8">
          <section className="bg-app-card/40 backdrop-blur-md border border-app-line/50 rounded-[2.5rem] flex flex-col min-h-0 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-app-accent to-app-accent-blue opacity-50" />
            
            <div className="p-8 border-b border-app-line/50 flex flex-col sm:flex-row justify-between gap-6 items-start sm:items-center bg-app-card-light/20">
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-xl bg-app-accent/10 flex items-center justify-center">
                    <Music className="w-4 h-4 text-app-accent" />
                  </div>
                  <h2 className="text-lg font-black uppercase tracking-tighter m-0">
                      Cola de <span className="text-app-accent">Producción</span>
                  </h2>
                  <div className="flex items-center gap-2 px-3 py-1 bg-app-success/5 rounded-full border border-app-success/20">
                      <div className={cn("w-1.5 h-1.5 rounded-full bg-app-success", !isSyncing && "animate-pulse")} />
                      <span className="text-[8px] font-black text-app-success uppercase tracking-[0.2em]">{isSyncing ? 'SYNCING...' : 'LIVE CORE'}</span>
                  </div>
                </div>
                
                <div className="flex bg-app-bg/50 p-1 rounded-2xl border border-app-line/50 w-fit">
                    <button 
                      onClick={() => setActiveTab('queue')}
                      className={cn(
                        "px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all",
                        activeTab === 'queue' ? "bg-app-accent text-white shadow-lg" : "text-app-text-s hover:bg-app-card-light"
                      )}
                    >
                      COLA DE REPRODUCCIÓN
                    </button>
                    <button 
                      onClick={() => setActiveTab('history')}
                      className={cn(
                        "px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all",
                        activeTab === 'history' ? "bg-app-accent text-white shadow-lg" : "text-app-text-s hover:bg-app-card-light"
                      )}
                    >
                      HISTORIAL LOG
                    </button>
                </div>
              </div>
              
              <div className="flex gap-3 w-full sm:w-auto">
                <Button 
                    onClick={handleRefresh}
                    variant="secondary"
                    size="icon"
                    disabled={isSyncing}
                    className="h-12 w-12 rounded-2xl bg-app-card-light/50 border-app-line/50"
                >
                    <RefreshCw className={cn("w-4 h-4", isSyncing && "animate-spin text-app-accent")} />
                </Button>
                <Button 
                    onClick={() => setShowAddModal(true)}
                    variant="primary"
                    size="md" 
                    className="gap-3 flex-1 sm:flex-none uppercase tracking-widest text-[10px] h-12 rounded-2xl"
                >
                    <Plus className="w-4 h-4" />
                    REGISTRAR TEMA
                </Button>
              </div>
            </div>

            <div className="overflow-y-auto max-h-[700px] divide-y divide-app-line/30">
              <AnimatePresence mode="popLayout">
                {activeTab === 'queue' ? (
                  <>
                    {fairQueue.map((song) => {
                      const table = tables.find(t => t.id === song.tableId);
                      const logicalRound = song.logicalRound || 1;
                      
                      const isNext = fairQueue[0]?.id === song.id;
                      return (
                          <motion.div
                            key={song.id}
                            layout
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            className={cn(
                              "p-6 flex items-center justify-between group transition-all duration-300",
                              isNext ? "bg-app-accent/10 border-l-[6px] border-app-accent" : "hover:bg-app-card-light/30"
                            )}
                          >
                            <div className="flex items-center gap-6">
                              <div className="flex flex-col items-center gap-1">
                                <div className={cn(
                                  "px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest",
                                  isNext ? "bg-app-accent text-white shadow-[0_0_15px_rgba(124,58,237,0.4)]" : "bg-app-card-light text-app-text-s border border-app-line/50"
                                )}>
                                  {table?.name || '---'}
                                </div>
                                {isNext && (
                                  <span className="text-[8px] font-black text-app-accent animate-pulse tracking-[0.2em]">WAITING</span>
                                )}
                              </div>
                              
                              <div>
                                <div className="font-black text-app-text-p text-lg tracking-tight flex items-center gap-3">
                                  {song.songTitle}
                                  {isNext && (
                                    <div className="flex gap-1 items-center">
                                      <div className="w-1 h-1 rounded-full bg-app-success animate-bounce" />
                                      <div className="w-1 h-1 rounded-full bg-app-success animate-bounce [animation-delay:0.2s]" />
                                      <div className="w-1 h-1 rounded-full bg-app-success animate-bounce [animation-delay:0.4s]" />
                                    </div>
                                  )}
                                </div>
                                <div className="text-[11px] text-app-text-s/70 font-bold tracking-widest uppercase mt-1 flex items-center gap-2">
                                  {song.artistName} <span className="opacity-20">•</span> <span className="text-app-cyan"> {song.singerName}</span>
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-6">
                              <div className="text-right hidden md:block border-r border-app-line/50 pr-6 mr-2">
                                <div className="text-[9px] text-app-text-s/40 font-black uppercase tracking-[0.2em] mb-1">RONDA</div>
                                <div className="text-lg font-black text-white tabular-nums drop-shadow-[0_0_10px_rgba(255,255,255,0.1)]">#{logicalRound}</div>
                              </div>
                              
                              <div className="flex items-center gap-2">
                                {isNext && (
                                  <Button
                                    onClick={() => markAsSung(song.id)}
                                    variant="primary"
                                    size="md"
                                    className="px-6"
                                  >
                                    <span className="flex items-center gap-2 uppercase tracking-[0.15em] text-[10px]">
                                      <CheckCircle2 className="w-4 h-4" />
                                      COMPLETAR
                                    </span>
                                  </Button>
                                )}
                                
                                {isNext && (
                                  <Button
                                    size="sm"
                                    variant="secondary"
                                    onClick={() => {
                                      if (window.confirm(`¿Marcar a ${song.singerName} como NO SHOW? Contará como turno consumido y liberará un espacio para la mesa.`)) {
                                        markNoShow(song.id);
                                      }
                                    }}
                                    className="h-8 px-2.5 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500 hover:text-white transition-colors"
                                  >
                                    <span className="flex items-center gap-1.5 text-[8px] font-black tracking-widest">
                                      <UserX className="w-3 h-3" />
                                      NO SHOW
                                    </span>
                                  </Button>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    {fairQueue.length === 0 && (
                      <div className="p-20 text-center text-app-text-s">
                        <Music className="w-10 h-10 mx-auto mb-4 opacity-20" />
                        <p className="text-sm font-medium">No hay canciones en la cola.</p>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="p-0">
                    <div className="p-6 border-b border-app-line/30 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-app-card-light/10">
                      <div>
                        <h3 className="text-xs font-black uppercase tracking-widest text-app-text-s m-0 flex items-center gap-2">
                          <History className="w-4 h-4 text-app-accent" />
                          Historial Completo del Evento
                        </h3>
                        <p className="text-[10px] text-app-text-s/60 mt-1 uppercase tracking-wider font-bold">Quién cantó, cuándo solicitó y cuándo fue atendido</p>
                      </div>
                      {queue.length > 0 && (
                        <Button 
                          onClick={exportToCSV}
                          variant="secondary"
                          size="sm"
                          className="text-[9px] font-black uppercase tracking-widest gap-2 bg-app-success/10 hover:bg-app-success/20 text-app-success border border-app-success/20 rounded-xl h-9"
                        >
                          <ExternalLink className="w-3.5 h-3.5 text-app-success" />
                          Descargar Excel (CSV)
                        </Button>
                      )}
                    </div>
                    {tables.map(table => {
                        const tableSongs = queue.filter(q => q.tableId === table.id && q.status !== 'pending');
                        if (tableSongs.length === 0) return null;
                        return (
                            <div key={table.id} className="border-b border-app-line last:border-0">
                                <div className="bg-app-bg/30 px-6 py-2 text-[10px] font-black uppercase tracking-widest text-app-text-s flex justify-between items-center">
                                    <span>{table.name}</span>
                                    <span>{tableSongs.length} turnos</span>
                                </div>
                                <div className="divide-y divide-app-line/30">
                                    {tableSongs.sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0)).map(song => (
                                        <div key={song.id} className="px-6 py-4 flex flex-col lg:flex-row lg:justify-between lg:items-center gap-3">
                                            <div className="min-w-0">
                                                <div className="text-xs font-bold text-app-text-p">{song.songTitle}</div>
                                                <div className="text-[10px] text-app-text-s">{song.artistName} • {song.singerName}</div>
                                            </div>
                                            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                                                <div className="text-[9px] text-app-text-s uppercase tracking-wider">
                                                  <span className="opacity-50">Solicitud</span>
                                                  <strong className="block text-app-text-p mt-0.5">{formatTime(song.createdAt)}</strong>
                                                </div>
                                                <div className="text-[9px] text-app-text-s uppercase tracking-wider">
                                                  <span className="opacity-50">Atención</span>
                                                  <strong className="block text-app-text-p mt-0.5">{formatTime(song.completedAt)}</strong>
                                                </div>
                                                <div className="text-[9px] text-app-text-s uppercase tracking-wider">
                                                  <span className="opacity-50">Espera</span>
                                                  <strong className="block text-app-text-p mt-0.5">{waitMinutes(song.createdAt, song.completedAt) ?? '---'} min</strong>
                                                </div>
                                                <span className={cn(
                                                    "text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-widest",
                                                    song.status === 'sung' ? "bg-app-success/10 text-app-success" : "bg-red-500/10 text-red-500"
                                                )}>
                                                    {statusLabel(song.status)}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                    {queue.filter(q => q.status !== 'pending').length === 0 && (
                        <div className="p-20 text-center text-app-text-s">
                          <History className="w-10 h-10 mx-auto mb-4 opacity-20" />
                          <p className="text-sm font-medium">El historial está vacío.</p>
                        </div>
                    )}
                  </div>
                )}
              </AnimatePresence>
            </div>
          </section>
        </div>

        {/* Sidebar Status Column */}
        <div className="space-y-6">
          <section className="bg-app-card border border-app-line rounded-2xl flex flex-col">
            <div className="p-5 border-b border-app-line flex justify-between items-center">
              <h2 className="text-base font-bold m-0">Estado de Mesas</h2>
              <Button size="sm" variant="outline" className="text-[10px] px-3 h-7" onClick={() => navigate('/dj/tables')}>
                VER TODAS
              </Button>
            </div>
            
            <div className="p-4 space-y-0 text-xs font-bold text-app-text-s uppercase tracking-widest grid grid-cols-[80px_1fr_40px_40px] px-6 border-b border-app-line/50">
                <span>Mesa</span>
                <span>Estado</span>
                <span className="text-center">Turnos</span>
                <span className="text-center">Pend.</span>
            </div>

            <div className="overflow-y-auto max-h-[400px]">
              {tables.slice(0, 15).map((table) => {
                const pendingCount = fairQueue.filter(q => q.tableId === table.id).length;
                return (
                  <div key={table.id} className={cn(
                    "grid grid-cols-[80px_1fr_40px_40px] px-6 py-3 items-center border-b border-app-line transition-colors hover:bg-white/5",
                    !table.isActive && "opacity-40"
                  )}>
                    <span className="text-sm font-bold text-app-text-p">{table.name}</span>
                    <span className="flex items-center gap-2">
                       <span className={cn(
                         "w-2 h-2 rounded-full",
                         table.isActive ? "bg-app-success shadow-[0_0_8px_var(--color-app-success)]" : "bg-red-500"
                       )} />
                       {table.isActive ? 'Activa' : 'Off'}
                    </span>
                    <span className="text-center font-bold text-app-accent">{table.songsSungCount}</span>
                    <span className="text-center font-bold text-app-text-p">{pendingCount}</span>
                  </div>
                );
              })}
            </div>
            
            <div className="p-4 border-top border-app-line text-center text-[10px] text-app-text-s uppercase font-bold tracking-widest bg-app-bg/20">
                Mostrando {Math.min(15, tables.length)} de {tables.length} mesas
            </div>
          </section>

          <section className="bg-app-accent/10 border border-app-accent/20 rounded-2xl p-6 relative overflow-hidden group">
            <div className="absolute -bottom-4 -right-4 opacity-5 group-hover:scale-125 transition-transform duration-500">
               <Mic2 className="w-24 h-24" />
            </div>
            <h3 className="text-base font-bold mb-2">Vista Pública</h3>
            <p className="text-app-text-s text-xs mb-4 leading-relaxed">
              Prueba la experiencia que tendrán tus clientes desde su celular.
            </p>
            <Button 
                onClick={() => window.open('/mesa/mesa-1', '_blank')}
                className="w-full h-11 text-xs font-bold uppercase tracking-widest gap-2"
            >
                Abrir Mesa 1
                <ExternalLink className="w-4 h-4" />
            </Button>
          </section>

          <section className="bg-red-500/5 border border-red-500/20 rounded-2xl p-6 relative overflow-hidden group">
            <div className="absolute -bottom-4 -right-4 opacity-5 group-hover:rotate-12 transition-transform duration-500">
               <Trash2 className="w-24 h-24 text-red-500" />
            </div>
            <h3 className="text-base font-bold mb-2 text-red-500">Mantenimiento</h3>
            <p className="text-app-text-s text-xs mb-4 leading-relaxed">
              Borra todos los pedidos y reinicia los contadores de las mesas para una nueva sesión.
            </p>
            <Button 
                onClick={() => setShowResetModal(true)}
                variant="outline"
                className="w-full h-11 text-xs font-bold uppercase tracking-widest gap-2 border-red-500/30 text-red-500 hover:bg-red-500 hover:text-white"
            >
                Reiniciar Sistema
                <RefreshCw className="w-4 h-4" />
            </Button>
          </section>
        </div>
      </div>

      {/* Reset Confirmation Modal */}
      <AnimatePresence>
        {showResetModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isResetting && setShowResetModal(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md" 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-app-card border border-app-line rounded-[2rem] w-full max-w-sm relative z-10 shadow-2xl overflow-hidden"
            >
              <div className="p-8 text-center">
                <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <AlertTriangle className="w-8 h-8 text-red-500" />
                </div>
                <h3 className="text-xl font-bold uppercase tracking-tight mb-2">¿Reiniciar Sistema?</h3>
                <p className="text-sm text-app-text-s mb-8 leading-relaxed">
                  Esta acción eliminará <b>todas las canciones</b> y pondrá los contadores de las mesas a <b>cero</b>. No se puede deshacer.
                </p>

                <div className="flex flex-col gap-3">
                    <Button 
                        onClick={handleReset}
                        disabled={isResetting}
                        className="w-full bg-red-500 hover:bg-red-600 h-12 text-xs font-bold uppercase tracking-widest gap-2"
                    >
                        {isResetting ? (
                            <>
                                <RefreshCw className="w-4 h-4 animate-spin" />
                                REINICIANDO...
                            </>
                        ) : (
                            'SÍ, REINICIAR TODO'
                        )}
                    </Button>
                    <Button 
                        variant="ghost"
                        disabled={isResetting}
                        onClick={() => setShowResetModal(false)}
                        className="w-full h-12 text-[10px] font-bold uppercase tracking-widest opacity-60"
                    >
                        CANCELAR
                    </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Real-time Notification Toast */}
      <AnimatePresence>
        {showToast && (
          <motion.div 
            initial={{ opacity: 0, y: 50, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, scale: 0.9, x: '-50%' }}
            className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[200] bg-app-accent text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 min-w-[300px]"
          >
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <Bell className="w-5 h-5 animate-bounce" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest opacity-80 leading-none mb-1">Nueva Solicitud</p>
              <p className="text-sm font-bold">¡Alguien acaba de pedir una canción!</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Manual Add Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-app-card border border-app-line rounded-[2rem] w-full max-w-md relative z-10 shadow-2xl overflow-hidden"
            >
              <div className="p-8">
                <div className="flex justify-between items-start mb-8">
                  <div>
                    <h3 className="text-xl font-bold uppercase tracking-tight">Registro Manual</h3>
                    <p className="text-[10px] text-app-text-s font-bold uppercase tracking-widest mt-1 opacity-60">Añadir canción desde el panel</p>
                  </div>
                  <Button size="icon" variant="ghost" onClick={() => setShowAddModal(false)} className="h-8 w-8 -mr-2">
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                <form onSubmit={handleManualAdd} className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-app-text-s uppercase tracking-widest ml-1">Mesa</label>
                    <select 
                        value={newReq.tableId}
                        onChange={e => setNewReq({...newReq, tableId: e.target.value})}
                        className="w-full bg-app-bg/50 px-4 py-3 rounded-xl border border-app-line text-sm font-bold outline-none focus:border-app-accent"
                    >
                        {tables.map(t => (
                            <option key={t.id} value={t.id} className="bg-app-card">{t.name}</option>
                        ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-app-text-s uppercase tracking-widest ml-1">¿Quién va a cantar?</label>
                    <input 
                      type="text"
                      placeholder="Nombre del cliente"
                      value={newReq.singerName}
                      onChange={e => setNewReq({...newReq, singerName: e.target.value})}
                      className="w-full bg-app-bg/50 px-4 py-3 rounded-xl border border-app-line text-sm font-bold outline-none focus:border-app-accent"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-app-text-s uppercase tracking-widest ml-1">¿Qué canción?</label>
                        <input 
                        type="text"
                        placeholder="Título"
                        value={newReq.songTitle}
                        onChange={e => setNewReq({...newReq, songTitle: e.target.value})}
                        className="w-full bg-app-bg/50 px-4 py-3 rounded-xl border border-app-line text-sm font-bold outline-none focus:border-app-accent"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-app-text-s uppercase tracking-widest ml-1">¿De quién es?</label>
                        <input 
                        type="text"
                        placeholder="Artista"
                        value={newReq.artistName}
                        onChange={e => setNewReq({...newReq, artistName: e.target.value})}
                        className="w-full bg-app-bg/50 px-4 py-3 rounded-xl border border-app-line text-sm font-bold outline-none focus:border-app-accent"
                        />
                    </div>
                  </div>

                  <div className="pt-4 flex gap-3">
                    <Button 
                        type="button" 
                        variant="ghost" 
                        onClick={() => setShowAddModal(false)}
                        className="flex-1 h-12 text-[10px] font-bold uppercase tracking-widest"
                    >
                        CANCELAR
                    </Button>
                    <Button 
                        type="submit" 
                        className="flex-1 h-12 text-[10px] font-bold uppercase tracking-widest"
                    >
                        AGREGAR
                    </Button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </DJLayout>
  );
};
