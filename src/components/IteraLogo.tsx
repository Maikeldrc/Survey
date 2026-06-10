import React from 'react';
import logoUrl from '../../assets/itera-health-logo.png';

interface IteraLogoProps {
  className?: string;
  variant?: 'light' | 'dark' | 'white';
  showSubtitle?: boolean;
}

export default function IteraLogo({ className = '', variant = 'dark', showSubtitle = true }: IteraLogoProps) {
  return (
    <div
      className={`select-none ${variant === 'white' ? 'rounded-lg bg-white px-3 py-2 shadow-sm ring-1 ring-white/20' : ''} ${className}`}
      id="itera-logo-container"
    >
      <img
        src={logoUrl}
        alt={showSubtitle ? 'itera.health - Scalable Health Outcomes' : 'itera.health'}
        className="h-auto w-full max-w-[245px] object-contain"
        draggable={false}
      />
    </div>
  );
}
