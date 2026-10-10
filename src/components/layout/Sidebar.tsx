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
  Compass,
} from 'lucide-react';
import { NavigationItemId } from '../../types/environmental';

interface NavigationItem {
  id: NavigationItemId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  isFoundationMilestone?: boolean;
}

const NAV_ITEMS: NavigationItem[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard, isFoundationMilestone: true },
  { id: 'city-map', label: 'City Map', icon: Map, isFoundationMilestone: true },
  { id: 'air-quality', label: 'Air Quality', icon: Wind, isFoundationMilestone: true },
  { id: 'urban-heat', label: 'Urban Heat', icon: Flame, isFoundationMilestone: true },
  { id: 'waste-management', label: 'Waste Management', icon: Trash2, isFoundationMilestone: true },
  { id: 'ask-ecotwin', label: 'Ask EcoTwin', icon: Bot },
  { id: 'what-if-simulator', label: 'What-if Simulator', icon: Sliders },
  { id: 'settings', label: 'Settings', icon: Settings },
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
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden transition-opacity"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-[#0A1628] border-r border-[rgba(148,163,184,0.14)] flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-label="Sidebar navigation"
      >
        {/* Brand Block */}
        <div className="h-16 px-5 border-b border-[rgba(148,163,184,0.14)] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#10233A] border border-[rgba(34,211,238,0.3)] flex items-center justify-center">
              <Compass className="w-4 h-4 text-[#22D3EE]" />
            </div>
            <div>
              <span className="text-base font-bold tracking-tight text-[#F1F5F9] block leading-none">
                EcoTwin
              </span>
              <span className="text-[11px] font-medium text-[#22D3EE] tracking-wide block mt-1">
                Environmental Intelligence
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
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          <div className="px-3 pb-2 text-[10px] font-mono uppercase tracking-wider text-[#94A3B8]">
            Twin Workspaces
          </div>
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeItem === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onSelectItem(item.id);
                  onCloseMobile();
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 text-xs font-medium rounded-md transition-colors text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] ${
                  isActive
                    ? 'bg-[#10233A] text-[#22D3EE] font-semibold border border-[rgba(34,211,238,0.2)]'
                    : 'text-[#94A3B8] hover:text-[#F1F5F9] hover:bg-[#10233A]/60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 ${
                      isActive ? 'text-[#22D3EE]' : 'text-[#94A3B8]'
                    }`}
                  />
                  <span>{item.label}</span>
                </div>

                {!item.isFoundationMilestone && (
                  <span className="text-[9px] font-mono uppercase text-slate-500 bg-[#07111F] px-1.5 py-0.5 rounded border border-[rgba(148,163,184,0.08)]">
                    Phase 2
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Bottom Context Info */}
        <div className="p-4 border-t border-[rgba(148,163,184,0.14)] bg-[#07111F]/50">
          <div className="text-[11px] text-[#94A3B8] space-y-1">
            <div className="flex items-center justify-between">
              <span>Target Region</span>
              <span className="text-[#F1F5F9] font-mono">Kolhapur (MH)</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Environment</span>
              <span className="text-amber-400 font-mono text-[10px]">Demo Twin v1.0</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
