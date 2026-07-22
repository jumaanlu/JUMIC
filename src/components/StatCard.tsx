import React from 'react';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  description?: string;
  color?: string;
}

export const StatCard = ({ title, value, icon, description, color = "bg-app-card" }: StatCardProps) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("p-6 rounded-[2rem] border border-app-line flex flex-col gap-4 hover:border-app-accent/30 transition-all duration-300 shadow-xl relative overflow-hidden group", color)}
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-app-accent/5 blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none group-hover:bg-app-accent/10 transition-colors" />
      
      <div className="flex items-center justify-between">
        <div className="p-3 bg-app-bg/50 rounded-2xl text-app-accent border border-app-line/50 group-hover:bg-app-accent/10 transition-colors">
          {icon}
        </div>
        <div className="text-right">
          <h3 className="text-[10px] font-black text-app-text-s uppercase tracking-[0.2em]">{title}</h3>
          <p className="text-3xl font-black text-app-text-p mt-1 leading-none tabular-nums drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]">
            {value}
          </p>
        </div>
      </div>
      
      {description && (
        <div className="pt-4 border-t border-app-line/50">
          <p className="text-[10px] text-app-text-s font-semibold uppercase tracking-widest opacity-60 italic">{description}</p>
        </div>
      )}
    </motion.div>
  );
};
