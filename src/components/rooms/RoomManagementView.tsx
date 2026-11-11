import React, { useState, useEffect } from 'react';
import {
  DoorClosed,
  Search,
  Filter,
  Plus,
  Play,
  Clock,
  Sparkles,
  DollarSign,
  UtensilsCrossed,
  Users2,
  X,
  Layers,
} from 'lucide-react';
import { Room, Area, Invoice } from '../../types';
import {
  getAllRooms,
  getAllAreas,
  openRoom,
  subscribeToStore,
} from '../../db/storage';
import { RoomCard } from './RoomCard';
import { RoomSessionModal } from './RoomSessionModal';
import { RoomTransferModal } from './RoomTransferModal';
import { StaffTimerModal } from '../service/StaffTimerModal';
import { CheckoutModal } from '../checkout/CheckoutModal';
import { ReceiptModal } from '../common/ReceiptModal';
import { formatMoney } from '../../core/pricingEngine';

export const RoomManagementView: React.FC = () => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [selectedAreaId, setSelectedAreaId] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals state
  const [activeRoomForDetails, setActiveRoomForDetails] = useState<Room | null>(null);
  const [activeRoomForTransfer, setActiveRoomForTransfer] = useState<Room | null>(null);
  const [activeRoomForStaffTimer, setActiveRoomForStaffTimer] = useState<Room | null>(null);
  const [activeRoomForCheckout, setActiveRoomForCheckout] = useState<Room | null>(null);
  const [activeRoomForOpen, setActiveRoomForOpen] = useState<Room | null>(null);
  const [activeInvoiceForReceipt, setActiveInvoiceForReceipt] = useState<Invoice | null>(null);

  // Form mở phòng mới
  const [openCustomerName, setOpenCustomerName] = useState<string>('');
  const [openCustomerPhone, setOpenCustomerPhone] = useState<string>('');
  const [openNotes, setOpenNotes] = useState<string>('');

  useEffect(() => {
    const reload = () => {
      setRooms(getAllRooms());
      setAreas(getAllAreas());
    };

    reload();
    const unsubscribe = subscribeToStore(reload);
    return () => unsubscribe();
  }, []);

  // Thống kê nhanh
  const totalCount = rooms.length;
  const occupiedCount = rooms.filter((r) => r.status === 'OCCUPIED').length;
  const availableCount = rooms.filter((r) => r.status === 'AVAILABLE').length;
  const waitingPaymentCount = rooms.filter((r) => r.status === 'WAITING_PAYMENT').length;

  // Lọc phòng
  const filteredRooms = rooms.filter((room) => {
    if (selectedAreaId !== 'ALL' && room.areaId !== selectedAreaId) return false;
    if (selectedStatus !== 'ALL' && room.status !== selectedStatus) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      return (
        room.name.toLowerCase().includes(q) ||
        room.code.toLowerCase().includes(q) ||
        room.categoryName.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleOpenRoomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRoomForOpen) return;

    openRoom(activeRoomForOpen.id, {
      customerName: openCustomerName.trim(),
      customerPhone: openCustomerPhone.trim(),
      notes: openNotes.trim(),
    });

    setActiveRoomForOpen(null);
    setOpenCustomerName('');
    setOpenCustomerPhone('');
    setOpenNotes('');
  };

  return (
    <div className="space-y-4">
      {/* Cụm Thống kê nhanh (KPI Bar) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xs">
          <div className="text-xs text-slate-500 font-medium">Tổng số phòng</div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-black text-slate-900">{totalCount}</span>
            <span className="text-[11px] font-semibold text-slate-400">Tất cả khu vực</span>
          </div>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-3.5 shadow-xs">
          <div className="text-xs text-emerald-700 font-medium flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            Đang hoạt động
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-black text-emerald-800">{occupiedCount}</span>
            <span className="text-[11px] font-semibold text-emerald-600">
              {Math.round((occupiedCount / (totalCount || 1)) * 100)}% công suất
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-blue-200 bg-blue-50/40 p-3.5 shadow-xs">
          <div className="text-xs text-blue-700 font-medium">Phòng trống</div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-black text-blue-800">{availableCount}</span>
            <span className="text-[11px] font-semibold text-blue-600">Sẵn sàng nhận khách</span>
          </div>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50/40 p-3.5 shadow-xs">
          <div className="text-xs text-amber-700 font-medium">Chờ thanh toán</div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-black text-amber-800">{waitingPaymentCount}</span>
            <span className="text-[11px] font-semibold text-amber-600">Cần chốt hóa đơn</span>
          </div>
        </div>
      </div>

      {/* Thanh Công Cụ: Lọc Khu Vực, Trạng Thái & Ô Tìm Kiếm */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-xs">
        {/* Lọc theo Khu Vực */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0">
          <button
            onClick={() => setSelectedAreaId('ALL')}
            className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all whitespace-nowrap ${
              selectedAreaId === 'ALL'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Tất cả khu ({rooms.length})
          </button>
          {areas.map((area) => (
            <button
              key={area.id}
              onClick={() => setSelectedAreaId(area.id)}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all whitespace-nowrap ${
                selectedAreaId === area.id
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {area.name}
            </button>
          ))}
        </div>

        {/* Cụm Tìm Kiếm & Lọc Trạng Thái */}
        <div className="flex items-center gap-2">
          {/* Lọc Trạng Thái */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 py-1.5 px-2.5 text-xs font-semibold text-slate-700 focus:outline-hidden"
          >
            <option value="ALL">Mọi trạng thái</option>
            <option value="OCCUPIED">Đang hát</option>
            <option value="AVAILABLE">Phòng trống</option>
            <option value="WAITING_PAYMENT">Chờ thanh toán</option>
          </select>

          {/* Ô Tìm Kiếm */}
          <div className="relative flex-1 md:w-56">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm tên hoặc mã phòng..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-3 text-xs text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-hidden"
            />
          </div>
        </div>
      </div>

      {/* Lưới Thẻ Phòng (Room Cards Grid) */}
      {filteredRooms.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center text-slate-400">
          <DoorClosed className="h-10 w-10 mx-auto text-slate-300 mb-2" />
          <div className="font-semibold text-slate-600">Không tìm thấy phòng nào phù hợp</div>
          <div className="text-xs text-slate-400 mt-1">
            Vui lòng thử đổi từ khóa tìm kiếm hoặc chọn bộ lọc khác.
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
          {filteredRooms.map((room) => (
            <RoomCard
              key={room.id}
              room={room}
              onOpenRoom={(r) => setActiveRoomForOpen(r)}
              onViewDetails={(r) => setActiveRoomForDetails(r)}
              onTransferRoom={(r) => setActiveRoomForTransfer(r)}
              onStaffTimer={(r) => setActiveRoomForStaffTimer(r)}
              onCheckout={(r) => setActiveRoomForCheckout(r)}
            />
          ))}
        </div>
      )}

      {/* Modal Mở Phòng Hát */}
      {activeRoomForOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl border border-slate-200 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 font-bold text-slate-900">
                <Play className="h-5 w-5 text-blue-600 fill-current" />
                <span>Mở phòng hát: {activeRoomForOpen.name}</span>
              </div>
              <button
                onClick={() => setActiveRoomForOpen(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleOpenRoomSubmit} className="mt-4 space-y-3">
              <div className="rounded-xl bg-blue-50 p-3 text-xs text-blue-900 border border-blue-200">
                <div>Loại phòng: <strong>{activeRoomForOpen.categoryName}</strong> • {activeRoomForOpen.areaName}</div>
                <div className="mt-1 text-[11px] text-blue-700">
                  Thời gian tính tiền bắt đầu được tính ngay khi bấm xác nhận mở phòng.
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tên khách hàng (tùy chọn):
                </label>
                <input
                  type="text"
                  value={openCustomerName}
                  onChange={(e) => setOpenCustomerName(e.target.value)}
                  placeholder="VD: Anh Nam, Chị Trang..."
                  className="w-full rounded-xl border border-slate-300 p-2 text-xs text-slate-900 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Số điện thoại khách:
                </label>
                <input
                  type="text"
                  value={openCustomerPhone}
                  onChange={(e) => setOpenCustomerPhone(e.target.value)}
                  placeholder="09xx..."
                  className="w-full rounded-xl border border-slate-300 p-2 text-xs text-slate-900 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Ghi chú phòng:
                </label>
                <input
                  type="text"
                  value={openNotes}
                  onChange={(e) => setOpenNotes(e.target.value)}
                  placeholder="Ghi chú thêm..."
                  className="w-full rounded-xl border border-slate-300 p-2 text-xs text-slate-900 focus:outline-hidden"
                />
              </div>

              <div className="mt-4 flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveRoomForOpen(null)}
                  className="flex-1 rounded-xl border border-slate-300 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-blue-600 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition-colors"
                >
                  Xác nhận mở phòng
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Chi Tiết Phòng & Gọi Món */}
      <RoomSessionModal
        room={activeRoomForDetails}
        isOpen={Boolean(activeRoomForDetails)}
        onClose={() => setActiveRoomForDetails(null)}
        onOpenTransfer={() => {
          setActiveRoomForTransfer(activeRoomForDetails);
        }}
        onOpenStaffTimer={() => {
          setActiveRoomForStaffTimer(activeRoomForDetails);
        }}
        onOpenCheckout={() => {
          setActiveRoomForCheckout(activeRoomForDetails);
        }}
      />

      {/* Modal Chuyển Phòng Option A */}
      <RoomTransferModal
        currentRoom={activeRoomForTransfer}
        isOpen={Boolean(activeRoomForTransfer)}
        onClose={() => setActiveRoomForTransfer(null)}
        onSuccess={() => {
          setActiveRoomForTransfer(null);
        }}
      />

      {/* Modal Tính Giờ Nhân Viên Phục Vụ (Module 18) */}
      <StaffTimerModal
        room={activeRoomForStaffTimer}
        isOpen={Boolean(activeRoomForStaffTimer)}
        onClose={() => setActiveRoomForStaffTimer(null)}
      />

      {/* Modal Thanh Toán & VietQR */}
      <CheckoutModal
        room={activeRoomForCheckout}
        isOpen={Boolean(activeRoomForCheckout)}
        onClose={() => setActiveRoomForCheckout(null)}
        onSuccess={(invoice) => {
          setActiveRoomForCheckout(null);
          setActiveInvoiceForReceipt(invoice);
        }}
      />

      {/* Modal In Hóa Đơn & Mã QR */}
      <ReceiptModal
        invoice={activeInvoiceForReceipt}
        isOpen={Boolean(activeInvoiceForReceipt)}
        onClose={() => setActiveInvoiceForReceipt(null)}
      />
    </div>
  );
};
