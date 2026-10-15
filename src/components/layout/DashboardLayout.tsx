import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { AppHeader } from './AppHeader';
import { NavigationItemId } from '../../types/environmental';

interface DashboardLayoutProps {
  activeItem: NavigationItemId;
  pageTitle: string;
  onSelectItem: (id: NavigationItemId) => void;
  children: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  activeItem,
  pageTitle,
  onSelectItem,
  children,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#07111F] text-[#F1F5F9] flex flex-col lg:flex-row antialiased">
      {/* Sidebar */}
      <Sidebar
        activeItem={activeItem}
        onSelectItem={onSelectItem}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <AppHeader
          pageTitle={pageTitle}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-screen-2xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
};
