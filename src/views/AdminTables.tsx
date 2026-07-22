import React, { useState } from 'react';
import { useKaraoke } from '../context/KaraokeContext';
import { DJLayout } from '../components/DJLayout';
import { Button } from '../components/Button';
import { 
  Users, 
  Plus, 
  Search, 
  QrCode, 
  ToggleLeft, 
  ToggleRight,
  ChevronRight,
  MoreVertical,
  X,
  ExternalLink,
  Download,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { QRCodeSVG } from 'qrcode.react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import QRCode from 'qrcode';

export const AdminTables = () => {
  const { tables, toggleTableStatus, addTable, queue } = useKaraoke();
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newTableName, setNewTableName] = useState('');
  const [selectedTableQR, setSelectedTableQR] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const downloadAllQRs = async () => {
    setIsExporting(true);
    const zip = new JSZip();
    const folder = zip.folder("QR_MESAS_JUMIC");

    try {
      for (const table of tables) {
        const url = getQRUrl(table.id);
        // Generate high quality QR as DataURL
        const dataUrl = await QRCode.toDataURL(url, {
          width: 1024,
          margin: 2,
          color: {
            dark: '#0f172a',
            light: '#ffffff'
          }
        });
        
        // Convert base64 to blob-like data for zip
        const base64Data = dataUrl.split(',')[1];
        folder?.file(`${table.name.replace(/\s+/g, '_')}_${table.id}.png`, base64Data, { base64: true });
      }

      const content = await zip.generateAsync({ type: "blob" });
      saveAs(content, "QR_MESAS_JUMIC.zip");
    } catch (err) {
      console.error("Error exporting QRs:", err);
    } finally {
      setIsExporting(false);
    }
  };

  const filteredTables = tables.filter(t => 
    t.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddTable = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTableName.trim()) {
      addTable(newTableName);
      setNewTableName('');
      setIsAddOpen(false);
    }
  };

  const getQRUrl = (id: string) => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/mesa/${id}`;
  };

  return (
    <DJLayout>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div>
          <h1 className="text-3xl font-black text-app-text-p tracking-tighter uppercase mb-1 flex items-center gap-3">
            Gestión de <span className="text-app-accent">Mesas</span>
          </h1>
          <div className="flex items-center gap-3">
            <p className="text-app-text-s text-[10px] font-black uppercase tracking-[0.2em] opacity-40">{tables.length} NODOS CONFIGURADOS</p>
            <div className="h-1 w-1 rounded-full bg-app-text-s/30" />
            <span className="text-[10px] font-black text-app-success uppercase tracking-widest">{tables.filter(t => t.isActive).length} ACTIVAS</span>
          </div>
          {window.location.hostname.includes('ais-dev') && (
            <div className="mt-4 text-[9px] text-amber-500 font-black uppercase tracking-[0.1em] bg-amber-500/10 p-3 rounded-2xl border border-amber-500/20 max-w-md">
              ⚠️ ENTORNOS DE DESARROLLO DETECTADO. LOS QR PUEDEN REQUERIR LOGIN.
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-4">
          <Button 
            variant="secondary"
            onClick={downloadAllQRs}
            disabled={isExporting || tables.length === 0}
            className="gap-3 px-6 h-12 rounded-2xl text-[10px] font-black uppercase tracking-widest"
          >
            {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            EXPORTAR PAQUETE QR
          </Button>
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-app-text-s group-focus-within:text-app-accent transition-colors" />
            <input 
              type="text"
              placeholder="FILTRAR MESA..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12 pr-6 py-3 bg-app-card-light/40 backdrop-blur-md border border-app-line/50 rounded-2xl text-app-text-p text-[10px] font-black uppercase tracking-widest focus:ring-1 focus:ring-app-accent/50 outline-none w-64 transition-all placeholder:text-app-text-s/30"
            />
          </div>
          <Button onClick={() => setIsAddOpen(true)} className="gap-3 px-8 h-12 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-[0_0_20px_rgba(124,58,237,0.2)]">
            <Plus className="w-4 h-4" />
            NUEVA MESA
          </Button>
        </div>
      </div>

      <div className="bg-app-card/30 backdrop-blur-3xl rounded-[2.5rem] border border-app-line/50 shadow-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-app-line/50 bg-app-card-light/20 text-[9px] font-black text-app-text-s/50 uppercase tracking-[0.25em]">
                <th className="px-10 py-6">ORDEN / IDENTIFICADOR</th>
                <th className="px-6 py-6 text-center">ESTADO OPERATIVO</th>
                <th className="px-6 py-6 text-center">TRAFICO</th>
                <th className="px-8 py-6 text-right">ACCIONES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-app-line/30">
              {filteredTables.map((table) => {
                const pendingCount = queue.filter(q => q.tableId === table.id && q.status === 'pending').length;
                return (
                  <tr key={table.id} className="hover:bg-app-accent/5 transition-all duration-300 group">
                    <td className="px-10 py-6">
                      <div className="flex items-center gap-5">
                        <div className="w-10 h-10 bg-app-bg/50 text-app-text-p rounded-xl font-black text-[11px] flex items-center justify-center border border-app-line/50 group-hover:border-app-accent transition-colors tabular-nums">
                          {table.id.split('-')[1] || '00'}
                        </div>
                        <div>
                          <span className="font-black text-app-text-p text-sm tracking-tight block group-hover:text-app-accent transition-colors">{table.name}</span>
                          <span className="text-[9px] text-app-text-s/40 font-black uppercase tracking-[0.1em]">{table.id}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-6">
                      <div className="flex justify-center">
                        <button 
                          onClick={() => toggleTableStatus(table.id)}
                          className={cn(
                            "flex items-center gap-2 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] transition-all",
                            table.isActive 
                              ? "bg-app-success/10 text-app-success shadow-[0_0_10px_rgba(34,197,94,0.1)]" 
                              : "bg-app-card-light/50 text-app-text-s/40 border border-app-line/50"
                          )}
                        >
                          <div className={cn(
                             "w-1.5 h-1.5 rounded-full",
                             table.isActive ? "bg-app-success shadow-[0_0_8px_var(--color-app-success)] animate-pulse" : "bg-app-text-s/40"
                          )} />
                          {table.isActive ? 'ACTIVA' : 'BLOQUEADA'}
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-6">
                      <div className="flex items-center justify-center gap-6">
                        <div className="text-center">
                            <div className="text-[8px] font-black text-app-text-s/30 uppercase tracking-widest mb-0.5">READY</div>
                            <div className="text-sm font-black text-app-text-p tabular-nums">{table.songsSungCount}</div>
                        </div>
                        <div className="h-6 w-px bg-app-line/50" />
                        <div className="text-center">
                            <div className="text-[8px] font-black text-app-text-s/30 uppercase tracking-widest mb-0.5">PENDING</div>
                            <div className={cn(
                                "text-sm font-black tabular-nums",
                                pendingCount > 0 ? "text-app-cyan" : "text-app-text-s/20"
                            )}>
                                {pendingCount}
                            </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center justify-end gap-3">
                        <Button 
                          size="icon" 
                          variant="secondary" 
                          className="h-11 w-11 rounded-xl border-app-line/50 hover:border-app-accent transition-all"
                          title="Obtener QR"
                          onClick={() => setSelectedTableQR(table.id)}
                        >
                          <QrCode className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* QR Modal */}
      <AnimatePresence>
        {selectedTableQR && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedTableQR(null)}
              className="absolute inset-0 bg-app-bg/90 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-app-card p-8 rounded-3xl border border-app-line shadow-2xl relative z-10 max-w-sm w-full text-center"
            >
              <button 
                onClick={() => setSelectedTableQR(null)}
                className="absolute top-4 right-4 p-2 text-app-text-s hover:text-app-text-p transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              
              <div className="mb-6">
                <div className="w-12 h-12 bg-app-accent text-white rounded-xl flex items-center justify-center mx-auto mb-4">
                  <QrCode className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-app-text-p uppercase tracking-tight">
                  {tables.find(t => t.id === selectedTableQR)?.name}
                </h3>
                <p className="text-app-text-s text-xs mt-1 font-bold uppercase tracking-widest">Escanea código de mesa</p>
              </div>

              <div className="bg-white p-4 rounded-2xl mb-6 inline-block shadow-xl">
                <QRCodeSVG value={getQRUrl(selectedTableQR)} size={180} />
              </div>

              <div className="flex flex-col gap-3">
                <Button 
                  onClick={() => window.open(getQRUrl(selectedTableQR), '_blank')}
                  className="w-full h-12 text-xs font-bold uppercase tracking-widest"
                >
                  Probar Vista Mesa
                </Button>
                <p className="text-[9px] text-app-text-s/50 uppercase font-bold font-mono tracking-tighter break-all">
                  {getQRUrl(selectedTableQR)}
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Table Modal */}
      <AnimatePresence>
        {isAddOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddOpen(false)}
              className="absolute inset-0 bg-app-bg/90 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="bg-app-card p-8 rounded-3xl border border-app-line shadow-2xl relative z-10 max-w-md w-full"
            >
              <h3 className="text-lg font-bold text-app-text-p mb-6 uppercase tracking-tight">Agregar Nueva Mesa</h3>
              <form onSubmit={handleAddTable} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-app-text-s uppercase tracking-widest mb-2 px-1">Nombre Identificador</label>
                  <input 
                    type="text"
                    required
                    autoFocus
                    placeholder="Ej. VIP LOUNGE"
                    value={newTableName}
                    onChange={(e) => setNewTableName(e.target.value)}
                    className="w-full px-4 py-3 bg-app-bg border border-app-line rounded-xl text-app-text-p focus:ring-1 focus:ring-app-accent outline-none placeholder:text-app-text-s/30 font-bold text-sm"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <Button type="submit" className="flex-1 h-12">Confirmar</Button>
                  <Button type="button" variant="outline" className="flex-1 h-12" onClick={() => setIsAddOpen(false)}>Cancelar</Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </DJLayout>
  );
};
