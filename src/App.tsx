import React, { useState, useEffect } from 'react';
import { Header } from './components/layout/Header';
import { Sidebar, NavItemKey } from './components/layout/Sidebar';
import { RoomManagementView } from './components/rooms/RoomManagementView';
import { InvoiceListView } from './components/invoices/InvoiceListView';
import { DebtManagementView } from './components/debt/DebtManagementView';
import { InventoryView } from './components/inventory/InventoryView';
import { ReportsView } from './components/reports/ReportsView';
import { PricingSettingsView } from './components/catalog/PricingSettingsView';
import { MenuCatalogView } from './components/catalog/MenuCatalogView';
import { StaffCatalogView } from './components/catalog/StaffCatalogView';
import { SettingsView } from './components/settings/SettingsView';
import { LoginModal } from './components/auth/LoginModal';
import { initDatabase, getAllRooms } from './db/storage';
import { Users2, DoorClosed, Receipt, BarChart3, Clock, AlertCircle } from 'lucide-react';

export default function App() {
  const [currentTab, setCurrentTab] = useState<NavItemKey>('rooms');
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);

  useEffect(() => {
    // Khởi tạo database local ban đầu
    initDatabase();

    // Lắng nghe phím tắt POS theo Mục 11.7 của đặc tả
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F5') {
        e.preventDefault();
        setCurrentTab('rooms');
      } else if (e.key === 'F6') {
        e.preventDefault();
        setCurrentTab('catalog_pricing');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-100 font-sans text-slate-900 antialiased selection:bg-blue-600 selection:text-white">
      {/* Sidebar Navigation */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={(tab) => setCurrentTab(tab)}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Vùng nội dung chính */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Header */}
        <Header
          onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
          onOpenSwitchUser={() => setIsLoginModalOpen(true)}
          onOpenStoreSettings={() => setCurrentTab('settings_store')}
        />

        {/* Thân Màn Hình Vận Hành */}
        <main className="flex-1 overflow-y-auto p-3 sm:p-5">
          <div className="mx-auto max-w-7xl">
            {currentTab === 'rooms' && <RoomManagementView />}
            {currentTab === 'invoices' && <InvoiceListView />}
            {currentTab === 'debt' && <DebtManagementView />}
            {currentTab === 'inventory' && <InventoryView />}
            {currentTab === 'reports' && <ReportsView />}
            {currentTab === 'dashboard' && <ReportsView />}
            {currentTab === 'service_staff' && <StaffCatalogView />}

            {/* Nhóm Danh Mục */}
            {currentTab === 'catalog_rooms' && <RoomManagementView />}
            {currentTab === 'catalog_pricing' && <PricingSettingsView />}
            {currentTab === 'catalog_holidays' && <PricingSettingsView />}
            {currentTab === 'catalog_menu' && <MenuCatalogView />}
            {currentTab === 'catalog_staff' && <StaffCatalogView />}

            {/* Nhóm Cài Đặt */}
            {currentTab === 'settings_store' && <SettingsView />}
            {currentTab === 'settings_users' && <SettingsView />}
            {currentTab === 'settings_audit' && <SettingsView />}
            {currentTab === 'settings_backup' && <SettingsView />}
          </div>
        </main>
      </div>

      {/* Modal Chuyển Đổi Tài Khoản */}
      <LoginModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} />
    </div>
  );
}
