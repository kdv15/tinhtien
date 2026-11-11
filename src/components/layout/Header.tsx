import React, { useState, useEffect } from 'react';
import {
  Menu,
  Clock,
  Wifi,
  WifiOff,
  UserCheck,
  Building2,
  Mic2,
  ChevronDown,
  LogOut,
  ShieldCheck,
} from 'lucide-react';
import { Store, User } from '../../types';
import { getCurrentUser, getStore, getAllRooms, subscribeToStore } from '../../db/storage';

interface HeaderProps {
  onToggleSidebar: () => void;
  onOpenSwitchUser: () => void;
  onOpenStoreSettings: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onToggleSidebar,
  onOpenSwitchUser,
  onOpenStoreSettings,
}) => {
  const [store, setStore] = useState<Store>(getStore());
  const [currentUser, setCurrentUser] = useState<User>(getCurrentUser());
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [occupiedCount, setOccupiedCount] = useState<number>(0);
  const [totalRoomsCount, setTotalRoomsCount] = useState<number>(0);

  useEffect(() => {
    const updateStats = () => {
      setStore(getStore());
      setCurrentUser(getCurrentUser());
      const rooms = getAllRooms();
      setTotalRoomsCount(rooms.length);
      setOccupiedCount(rooms.filter((r) => r.status === 'OCCUPIED' || r.status === 'WAITING_PAYMENT').length);
    };

    updateStats();
    const unsubscribe = subscribeToStore(updateStats);

    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      unsubscribe();
      clearInterval(timer);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white px-3 sm:px-5 shadow-xs">
      {/* Cụm bên trái: Hamburger + Tên Quán */}
      <div className="flex items-center gap-2 sm:gap-4">
        <button
          onClick={onToggleSidebar}
          className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 transition-colors focus:outline-hidden"
          title="Mở menu điều hướng"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div
          onClick={onOpenStoreSettings}
          className="flex items-center gap-2.5 cursor-pointer group"
          title="Bấm để xem/sửa thông tin cửa hàng"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm shadow-blue-500/20 group-hover:bg-blue-700 transition-colors">
            <Mic2 className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-base sm:text-lg font-bold text-slate-900 leading-tight tracking-tight group-hover:text-blue-600 transition-colors line-clamp-1">
                {store.name || 'Karaoke Manager'}
              </h1>
            </div>
            <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <Building2 className="h-3 w-3" />
                Quầy thu ngân chính
              </span>
              <span>•</span>
              <span className="font-medium text-emerald-600">
                Đang hát: {occupiedCount}/{totalRoomsCount} phòng
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Cụm giữa: Đồng hồ thời gian thực */}
      <div className="hidden md:flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-1.5 border border-slate-200 text-xs font-medium text-slate-700 shadow-2xs">
        <Clock className="h-4 w-4 text-blue-600 animate-pulse" />
        <span className="text-sm font-semibold tracking-wide">
          {currentTime.toLocaleTimeString('vi-VN')}
        </span>
        <span className="text-slate-400">|</span>
        <span className="text-slate-600 capitalize">
          {currentTime.toLocaleDateString('vi-VN', {
            weekday: 'short',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
          })}
        </span>
      </div>

      {/* Cụm bên phải: Offline-First Badge + User Avatar / Switch */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Trạng thái mạng / Offline */}
        <div
          className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold border ${
            isOnline
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-amber-50 text-amber-700 border-amber-200'
          }`}
          title={isOnline ? 'Đang kết nối Cloud' : 'Mất mạng - Đang chạy chế độ Offline an toàn'}
        >
          {isOnline ? (
            <>
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="hidden sm:inline">Trực tuyến</span>
            </>
          ) : (
            <>
              <WifiOff className="h-3.5 w-3.5 text-amber-600" />
              <span className="text-xs">Offline</span>
            </>
          )}
        </div>

        {/* Nút chuyển đổi tài khoản */}
        <button
          onClick={onOpenSwitchUser}
          className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-left text-xs text-slate-800 hover:bg-slate-100 transition-colors focus:outline-hidden"
          title="Chuyển đổi nhân viên / Phân quyền"
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100 text-blue-700 font-bold text-xs">
            {currentUser.fullName.charAt(0)}
          </div>
          <div className="hidden sm:block text-left">
            <div className="font-semibold text-slate-900 leading-tight">
              {currentUser.fullName}
            </div>
            <div className="text-[10px] text-slate-500 capitalize flex items-center gap-1">
              {currentUser.role === 'owner' ? (
                <ShieldCheck className="h-2.5 w-2.5 text-amber-500" />
              ) : (
                <UserCheck className="h-2.5 w-2.5 text-blue-500" />
              )}
              {currentUser.role}
            </div>
          </div>
          <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
        </button>
      </div>
    </header>
  );
};
