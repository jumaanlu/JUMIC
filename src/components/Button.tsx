import React from 'react';
import { cn } from '../lib/utils';

interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  children?: React.ReactNode;
  className?: string;
  onClick?: (e: any) => void;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
  title?: string;
}

export const Button = ({ 
  children, 
  className, 
  variant = 'primary', 
  size = 'md', 
  ...props 
}: ButtonProps) => {
  const variants = {
    primary: 'bg-linear-to-r from-app-accent to-app-accent-blue text-white hover:shadow-[0_0_20px_rgba(124,58,237,0.4)] shadow-lg',
    secondary: 'bg-app-card-light text-app-text-p hover:bg-app-line border border-app-line/50',
    outline: 'border border-app-line text-app-text-s hover:text-white hover:border-app-accent hover:shadow-[0_0_15px_rgba(124,58,237,0.1)] transition-all bg-transparent',
    danger: 'bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500 hover:text-white shadow-sm',
    ghost: 'hover:bg-app-card-light text-app-text-s/60 hover:text-app-text-p',
    cyan: 'bg-app-cyan/10 text-app-cyan border border-app-cyan/20 hover:bg-app-cyan hover:text-app-bg shadow-sm hover:shadow-[0_0_15px_rgba(34,211,238,0.3)]',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest',
    md: 'px-5 py-2.5 text-sm font-semibold',
    lg: 'px-8 py-4 text-base font-bold uppercase tracking-wider',
    icon: 'p-2.5',
  };

  return (
    <button
      className={cn(
        'inline-flex items-center justify-center rounded-2xl transition-all duration-300 active:scale-95 disabled:opacity-50 disabled:pointer-events-none cursor-pointer',
        variants[variant as keyof typeof variants] || variants.primary,
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
};
