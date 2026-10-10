import React from 'react';
import { Menu, MapPin, ShieldAlert, User, Bell } from 'lucide-react';

interface AppHeaderProps {
  pageTitle: string;
  onOpenMobileMenu: () => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  pageTitle,
  onOpenMobileMenu,
}) => {
  return (
    <header className="h-16 border-b border-[rgba(148,163,184,0.14)] bg-[#07111F]/90 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between gap-4 sticky top-0 z-30">
      {/* Left side: Mobile Toggle & Page Title */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          className="lg:hidden p-2 text-[#94A3B8] hover:text-[#F1F5F9] hover:bg-[#10233A] rounded-md transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
          aria-label="Open navigation sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <h1 className="text-lg font-bold text-[#F1F5F9] tracking-tight">
            {pageTitle}
          </h1>
        </div>
      </div>

      {/* Right side: Location, Demo Data Badge, Profile */}
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Location label */}
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#0D1B2E] border border-[rgba(148,163,184,0.14)] text-xs text-[#F1F5F9]">
          <MapPin className="w-3.5 h-3.5 text-[#22D3EE]" aria-hidden="true" />
          <span className="font-medium">Kolhapur, Maharashtra</span>
        </div>

        {/* DEMO DATA badge */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-950/40 border border-amber-500/30 text-amber-300 text-xs font-mono font-medium tracking-wide">
          <ShieldAlert className="w-3.5 h-3.5 text-amber-400" aria-hidden="true" />
          <span>DEMO DATA</span>
        </div>

        {/* Accessible profile placeholder */}
        <div className="relative">
          <button
            type="button"
            className="flex items-center gap-2 p-1.5 rounded-full hover:bg-[#10233A] border border-[rgba(148,163,184,0.14)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] transition-colors"
            aria-label="Municipal Environmental Officer Profile"
            title="Municipal Environmental Officer Profile"
          >
            <div className="w-7 h-7 rounded-full bg-[#10233A] border border-[#2563EB]/40 flex items-center justify-center text-xs font-bold font-mono text-[#22D3EE]">
              KP
            </div>
          </button>
        </div>
      </div>
    </header>
  );
};
