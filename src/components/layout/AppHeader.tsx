import React from 'react';
import { Menu, MapPin, ShieldAlert } from 'lucide-react';

interface AppHeaderProps {
  pageTitle: string;
  onOpenMobileMenu: () => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  pageTitle,
  onOpenMobileMenu,
}) => {
  // Split "Title · Subtitle" for two-tone rendering
  const [title, subtitle] = pageTitle.split(' · ');

  return (
    <header
      className="h-14 px-4 sm:px-6 flex items-center justify-between gap-4 sticky top-0 z-30"
      style={{
        background: 'rgba(7,17,31,0.85)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(148,163,184,0.10)',
      }}
    >
      {/* Left: Mobile menu + page title */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          className="lg:hidden p-2 text-[#64748B] hover:text-[#F1F5F9] hover:bg-[#10233A] rounded-md transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
          aria-label="Open navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="min-w-0">
          <h1 className="text-sm font-semibold text-[#F1F5F9] truncate leading-tight">
            {title}
            {subtitle && (
              <span className="text-[#475569] font-normal ml-2 hidden sm:inline">
                · {subtitle}
              </span>
            )}
          </h1>
        </div>
      </div>

      {/* Right: Location, DEMO badge, avatar */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Location */}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs text-[#64748B]"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(148,163,184,0.10)' }}>
          <MapPin className="w-3 h-3 text-[#22D3EE]" aria-hidden="true" />
          <span className="font-medium text-[#94A3B8]">Kolhapur, MH</span>
        </div>

        {/* DEMO DATA badge */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono font-semibold tracking-wide"
          style={{
            background: 'rgba(120,53,15,0.25)',
            border: '1px solid rgba(251,146,60,0.25)',
            color: '#FCD34D',
          }}>
          <ShieldAlert className="w-3 h-3" aria-hidden="true" />
          <span className="hidden xs:inline">DEMO</span>
          <span className="xs:hidden">DEMO</span>
        </div>

        {/* Avatar */}
        <button
          type="button"
          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold font-mono transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
          style={{
            background: 'linear-gradient(135deg, #1e3a5f 0%, #10233A 100%)',
            border: '1px solid rgba(34,211,238,0.3)',
            color: '#22D3EE',
          }}
          aria-label="Profile"
          title="Municipal Environmental Officer"
        >
          KP
        </button>
      </div>
    </header>
  );
};
