import React from 'react';
import {
  LayoutDashboard,
  Map,
  Wind,
  Flame,
  Trash2,
  Bot,
  Sliders,
  Settings,
  X,
  Leaf,
} from 'lucide-react';
import { NavigationItemId } from '../../types/environmental';

interface NavigationItem {
  id: NavigationItemId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  accent?: string; // active icon color
}

const NAV_ITEMS: NavigationItem[] = [
  { id: 'overview',          label: 'Overview',          icon: LayoutDashboard, accent: 'text-[#22D3EE]' },
  { id: 'city-map',          label: 'City Map',          icon: Map,             accent: 'text-[#22D3EE]' },
  { id: 'air-quality',       label: 'Air Quality',       icon: Wind,            accent: 'text-sky-400' },
  { id: 'urban-heat',        label: 'Urban Heat',        icon: Flame,           accent: 'text-[#FB923C]' },
  { id: 'waste-management',  label: 'Waste Management',  icon: Trash2,          accent: 'text-[#C084FC]' },
  { id: 'ask-ecotwin',       label: 'Ask EcoTwin',       icon: Bot,             accent: 'text-emerald-400' },
  { id: 'what-if-simulator', label: 'What-if Simulator', icon: Sliders,         accent: 'text-amber-400' },
  { id: 'settings',          label: 'Settings',          icon: Settings,        accent: 'text-slate-400' },
];

interface SidebarProps {
  activeItem: NavigationItemId;
  onSelectItem: (id: NavigationItemId) => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeItem,
  onSelectItem,
  mobileOpen,
  onCloseMobile,
}) => {
  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          role="presentation"
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 flex flex-col
          transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
        style={{
          background: 'linear-gradient(180deg, #0A1628 0%, #07111F 100%)',
          borderRight: '1px solid rgba(148,163,184,0.10)',
        }}
        aria-label="Sidebar navigation"
      >
        {/* Brand Block */}
        <div className="h-16 px-5 flex items-center justify-between"
          style={{ borderBottom: '1px solid rgba(148,163,184,0.10)' }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
              style={{
                background: 'linear-gradient(135deg, #0f3460 0%, #10233A 100%)',
                border: '1px solid rgba(34,211,238,0.35)',
                boxShadow: '0 0 12px rgba(34,211,238,0.15)',
              }}>
              <Leaf className="w-4 h-4 text-[#22D3EE]" />
            </div>
            <div>
              <span className="text-base font-bold tracking-tight text-[#F1F5F9] block leading-none">
                EcoTwin
              </span>
              <span className="text-[10px] font-medium tracking-widest block mt-0.5"
                style={{ color: '#22D3EE', opacity: 0.8 }}>
                KOLHAPUR · MH
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onCloseMobile}
            className="lg:hidden p-1.5 text-[#94A3B8] hover:text-[#F1F5F9] hover:bg-[#10233A] rounded-md transition-colors"
            aria-label="Close navigation"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation List */}
        <nav className="flex-1 py-4 px-2 space-y-0.5 overflow-y-auto">
          <div className="px-3 pb-2 pt-1 text-[9px] font-mono uppercase tracking-widest text-[#94A3B8]/60">
            Workspaces
          </div>
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeItem === item.id;
            const accentColor = item.accent ?? 'text-[#22D3EE]';

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onSelectItem(item.id);
                  onCloseMobile();
                }}
                className={`
                  nav-item-active w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium
                  rounded-md transition-all duration-150 text-left focus:outline-none
                  focus-visible:ring-2 focus-visible:ring-[#2563EB]
                  ${isActive
                    ? 'text-[#F1F5F9] font-semibold'
                    : 'text-[#64748B] hover:text-[#CBD5E1] hover:bg-white/[0.04]'
                  }
                `}
                style={isActive ? {
                  background: 'linear-gradient(90deg, rgba(34,211,238,0.08) 0%, rgba(34,211,238,0.02) 100%)',
                  borderRadius: '6px',
                } : undefined}
              >
                <Icon className={`w-4 h-4 shrink-0 transition-colors ${isActive ? accentColor : 'text-[#475569]'}`} />
                <span className="truncate">{item.label}</span>
                {isActive && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#22D3EE] shrink-0" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Bottom Context Info */}
        <div className="p-4" style={{ borderTop: '1px solid rgba(148,163,184,0.10)' }}>
          {/* Live indicator */}
          <div className="flex items-center gap-2 mb-3">
            <span className="live-dot w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
            <span className="text-[11px] text-[#94A3B8]">Demo data stream active</span>
          </div>
          <div className="text-[11px] text-[#94A3B8] space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[#475569]">Region</span>
              <span className="text-[#94A3B8] font-mono">Kolhapur (MH)</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#475569]">Build</span>
              <span className="text-amber-400/80 font-mono text-[10px]">v1.0.0-demo</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
