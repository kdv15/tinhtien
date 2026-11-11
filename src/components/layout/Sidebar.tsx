import React, { useState } from 'react';
import {
  DoorClosed,
  Receipt,
  BookOpen,
  Package,
  BarChart3,
  Users2,
  LayoutDashboard,
  Layers,
  UtensilsCrossed,
  UserCog,
  TableProperties,
  CalendarDays,
  Store as StoreIcon,
  Shield,
  FileText,
  Database,
  ChevronDown,
  ChevronRight,
  X,
  Mic2,
} from 'lucide-react';

export type NavItemKey =
  | 'rooms'
  | 'invoices'
  | 'debt'
  | 'inventory'
  | 'reports'
  | 'service_staff'
  | 'dashboard'
  | 'catalog_rooms'
  | 'catalog_menu'
  | 'catalog_staff'
  | 'catalog_pricing'
  | 'catalog_holidays'
  | 'settings_store'
  | 'settings_users'
  | 'settings_audit'
  | 'settings_backup';

type NavGroupKey = 'management' | 'catalog' | 'settings';

interface SidebarProps {
  currentTab: NavItemKey;
  onSelectTab: (tab: NavItemKey) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  isOpen,
  onClose,
}) => {
  // Nhóm điều hướng accordion: tự động mở nhóm chứa tab hiện tại
  const getInitialGroup = (tab: NavItemKey): NavGroupKey => {
    if (tab.startsWith('catalog_')) return 'catalog';
    if (tab.startsWith('settings_')) return 'settings';
    return 'management';
  };

  const [activeGroup, setActiveGroup] = useState<NavGroupKey>(getInitialGroup(currentTab));

  const toggleGroup = (group: NavGroupKey) => {
    setActiveGroup((prev) => (prev === group ? prev : group));
  };

  const handleSelect = (tab: NavItemKey, group: NavGroupKey) => {
    setActiveGroup(group);
    onSelectTab(tab);
    // Tự động đóng trên mobile drawer
    if (window.innerWidth < 1024) {
      onClose();
    }
  };

  const navGroups = [
    {
      key: 'management' as NavGroupKey,
      title: 'QUẢN LÝ VẬN HÀNH',
      items: [
        {
          key: 'rooms' as NavItemKey,
          label: 'Quản lý phòng',
          icon: DoorClosed,
          badge: 'Mặc định',
        },
        {
          key: 'invoices' as NavItemKey,
          label: 'Hóa đơn & Thanh toán',
          icon: Receipt,
        },
        {
          key: 'service_staff' as NavItemKey,
          label: 'Nhân viên phục vụ (M18)',
          icon: Users2,
          badge: 'Module 18',
        },
        {
          key: 'debt' as NavItemKey,
          label: 'Sổ nợ khách hàng',
          icon: BookOpen,
        },
        {
          key: 'inventory' as NavItemKey,
          label: 'Quản lý kho & Đồ uống',
          icon: Package,
        },
        {
          key: 'reports' as NavItemKey,
          label: 'Báo cáo & Thống kê',
          icon: BarChart3,
        },
        {
          key: 'dashboard' as NavItemKey,
          label: 'Tổng quan Dashboard',
          icon: LayoutDashboard,
        },
      ],
    },
    {
      key: 'catalog' as NavGroupKey,
      title: 'DANH MỤC CẤU HÌNH',
      items: [
        {
          key: 'catalog_rooms' as NavItemKey,
          label: 'Danh mục phòng & Khu vực',
          icon: Layers,
        },
        {
          key: 'catalog_pricing' as NavItemKey,
          label: 'Bảng giá phòng (12 ô)',
          icon: TableProperties,
          badge: 'REV3.2',
        },
        {
          key: 'catalog_menu' as NavItemKey,
          label: 'Thực đơn & Đồ ăn/uống',
          icon: UtensilsCrossed,
        },
        {
          key: 'catalog_staff' as NavItemKey,
          label: 'Nhân viên & Quản lý',
          icon: UserCog,
        },
        {
          key: 'catalog_holidays' as NavItemKey,
          label: 'Lịch ngày lễ tính giá',
          icon: CalendarDays,
        },
      ],
    },
    {
      key: 'settings' as NavGroupKey,
      title: 'HỆ THỐNG & CÀI ĐẶT',
      items: [
        {
          key: 'settings_store' as NavItemKey,
          label: 'Cửa hàng & VietQR',
          icon: StoreIcon,
        },
        {
          key: 'settings_users' as NavItemKey,
          label: 'Tài khoản & Phân quyền',
          icon: Shield,
        },
        {
          key: 'settings_audit' as NavItemKey,
          label: 'Nhật ký hoạt động (Audit)',
          icon: FileText,
        },
        {
          key: 'settings_backup' as NavItemKey,
          label: 'Sao lưu & Phục hồi JSON',
          icon: Database,
        },
      ],
    },
  ];

  return (
    <>
      {/* Backdrop overlay cho thiết bị di động / iPhone */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs lg:hidden transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Thân Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-slate-200 bg-white transition-transform duration-200 ease-in-out lg:static lg:z-0 lg:w-64 lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header của Sidebar trên Mobile */}
        <div className="flex h-16 items-center justify-between border-b border-slate-200 px-4 lg:hidden">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white">
              <Mic2 className="h-4 w-4" />
            </div>
            <span className="font-bold text-slate-900 text-sm">Karaoke Manager</span>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Nội dung danh sách Accordion */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-4">
          {navGroups.map((group) => {
            const isGroupOpen = activeGroup === group.key;
            return (
              <div key={group.key} className="space-y-1">
                {/* Tiêu đề nhóm accordion */}
                <button
                  onClick={() => toggleGroup(group.key)}
                  className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-xs font-bold tracking-wider transition-colors focus:outline-hidden ${
                    isGroupOpen
                      ? 'bg-slate-100 text-slate-900'
                      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                  }`}
                >
                  <span>{group.title}</span>
                  {isGroupOpen ? (
                    <ChevronDown className="h-4 w-4 text-slate-500" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-slate-400" />
                  )}
                </button>

                {/* Danh sách mục con khi mở */}
                {isGroupOpen && (
                  <div className="pt-1 pl-1 space-y-1 animate-in fade-in-50 duration-150">
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const isActive = currentTab === item.key;
                      return (
                        <button
                          key={item.key}
                          onClick={() => handleSelect(item.key, group.key)}
                          className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-medium transition-all focus:outline-hidden ${
                            isActive
                              ? 'bg-blue-600 text-white shadow-xs font-semibold'
                              : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <Icon
                              className={`h-4 w-4 shrink-0 ${
                                isActive ? 'text-white' : 'text-slate-500'
                              }`}
                            />
                            <span className="truncate">{item.label}</span>
                          </div>
                          {item.badge && (
                            <span
                              className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${
                                isActive
                                  ? 'bg-blue-500 text-white'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {item.badge}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer Sidebar: Phiên bản & Offline status */}
        <div className="border-t border-slate-200 p-3 bg-slate-50/50">
          <div className="flex items-center justify-between text-[11px] text-slate-500">
            <span>Phiên bản: <strong>V6.3-REV3.2</strong></span>
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800">
              Offline-Ready
            </span>
          </div>
          <div className="mt-1 text-[10px] text-slate-400">
            Kế thừa đặc tả tổng hợp v0.9
          </div>
        </div>
      </aside>
    </>
  );
};
