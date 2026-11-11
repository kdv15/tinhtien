import React, { useState, useEffect } from 'react';
import {
  X,
  Clock,
  UtensilsCrossed,
  Users2,
  ArrowRightLeft,
  ReceiptText,
  AlertTriangle,
  Plus,
  Minus,
  Trash2,
  Layers,
  Sparkles,
} from 'lucide-react';
import { Room, Session, MenuItem, OrderItem, ServiceSession } from '../../types';
import {
  getSessionById,
  getAllMenuItems,
  getOrderItemsBySession,
  addOrderItemToSession,
  updateOrderItemQuantity,
  cancelRoomSession,
  getServiceSessionBySessionId,
  subscribeToStore,
} from '../../db/storage';
import { calculateSessionPricing, formatDuration, formatMoney } from '../../core/pricingEngine';

interface RoomSessionModalProps {
  room: Room | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenTransfer: () => void;
  onOpenStaffTimer: () => void;
  onOpenCheckout: () => void;
}

export const RoomSessionModal: React.FC<RoomSessionModalProps> = ({
  room,
  isOpen,
  onClose,
  onOpenTransfer,
  onOpenStaffTimer,
  onOpenCheckout,
}) => {
  const [activeTab, setActiveTab] = useState<'orders' | 'segments' | 'cancel'>('orders');
  const [session, setSession] = useState<Session | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [serviceSession, setServiceSession] = useState<ServiceSession | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [cancelReason, setCancelReason] = useState<string>('Nhân viên bấm nhầm phòng');
  const [, setTicker] = useState<number>(0);

  useEffect(() => {
    if (!isOpen || !room?.currentSessionId) return;

    const reload = () => {
      const sess = getSessionById(room.currentSessionId!);
      setSession(sess || null);
      setMenuItems(getAllMenuItems().filter((m) => m.isActive));
      setOrderItems(getOrderItemsBySession(room.currentSessionId!));
      setServiceSession(getServiceSessionBySessionId(room.currentSessionId!) || null);
    };

    reload();
    const unsubscribe = subscribeToStore(reload);

    const interval = setInterval(() => {
      setTicker((prev) => prev + 1);
    }, 1000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [isOpen, room?.currentSessionId]);

  if (!isOpen || !room || !room.currentSessionId || !session) return null;

  const pricing = calculateSessionPricing(session, new Date());
  const orderTotal = orderItems.reduce((acc, i) => acc + i.totalAmount, 0);
  const activeStaffTickets = serviceSession?.tickets.filter((t) => !t.isCompleted) || [];

  const filteredMenuItems =
    selectedCategory === 'ALL'
      ? menuItems
      : menuItems.filter((m) => m.category === selectedCategory);

  const handleAddMenuItem = (item: MenuItem) => {
    addOrderItemToSession(session.id, item.id, 1);
  };

  const handleCancelSession = () => {
    if (window.confirm(`Bạn có chắc chắn muốn hủy phiên phòng ${room.name} không?`)) {
      cancelRoomSession(session.id, cancelReason);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-2 sm:p-4 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-4xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header Modal */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white font-black text-sm">
              {room.code}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">{room.name}</h2>
                <span className="rounded-md bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-800">
                  {room.categoryName}
                </span>
                <span className="text-xs text-slate-500">• {room.areaName}</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-600 mt-0.5">
                <span className="flex items-center gap-1 font-semibold text-emerald-700">
                  <Clock className="h-3.5 w-3.5 animate-pulse" />
                  Hát: {formatDuration(pricing.totalActualSeconds)}
                </span>
                <span>•</span>
                <span>Vào: {new Date(session.startTime).toLocaleTimeString('vi-VN')}</span>
                {session.customerName && <span>• Khách: {session.customerName}</span>}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-200"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Thanh Điều Hướng Tabs */}
        <div className="flex border-b border-slate-200 px-4 bg-white shrink-0">
          <button
            onClick={() => setActiveTab('orders')}
            className={`flex items-center gap-1.5 border-b-2 py-3 px-3 text-xs font-bold transition-colors ${
              activeTab === 'orders'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <UtensilsCrossed className="h-4 w-4" />
            <span>Gọi đồ uống & Món ({orderItems.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('segments')}
            className={`flex items-center gap-1.5 border-b-2 py-3 px-3 text-xs font-bold transition-colors ${
              activeTab === 'segments'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Layers className="h-4 w-4" />
            <span>Phân đoạn phòng & Đơn giá ({pricing.calculatedSegments.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('cancel')}
            className={`flex items-center gap-1.5 border-b-2 py-3 px-3 text-xs font-bold transition-colors ml-auto ${
              activeTab === 'cancel'
                ? 'border-red-600 text-red-600'
                : 'border-transparent text-slate-400 hover:text-red-600'
            }`}
          >
            <AlertTriangle className="h-4 w-4" />
            <span>Hủy phiên mở nhầm</span>
          </button>
        </div>

        {/* Thân Modal theo Tab */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'orders' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              {/* Cột trái (7/12): Danh sách thực đơn để chọn */}
              <div className="lg:col-span-7 space-y-3">
                {/* Lọc danh mục */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                  {[
                    { id: 'ALL', label: 'Tất cả' },
                    { id: 'BEVERAGE', label: 'Bia & Đồ uống' },
                    { id: 'SNACK', label: 'Đồ khô & Snack' },
                    { id: 'FRUIT', label: 'Trái cây' },
                    { id: 'OTHER', label: 'Khác' },
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`rounded-lg px-2.5 py-1 text-xs font-semibold whitespace-nowrap transition-colors ${
                        selectedCategory === cat.id
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>

                {/* Lưới sản phẩm */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[50vh] overflow-y-auto pr-1">
                  {filteredMenuItems.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleAddMenuItem(item)}
                      className="cursor-pointer rounded-xl border border-slate-200 p-2.5 bg-slate-50/50 hover:bg-blue-50/50 hover:border-blue-300 transition-all flex flex-col justify-between"
                    >
                      <div>
                        <div className="font-bold text-xs text-slate-900 line-clamp-1">
                          {item.name}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          Đơn vị: {item.unit} • Kho: {item.stockQuantity}
                        </div>
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-xs font-extrabold text-blue-700">
                          {formatMoney(item.salePrice)}
                        </span>
                        <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-600 hover:text-white transition-colors">
                          <Plus className="h-3.5 w-3.5" />
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Cột phải (5/12): Danh sách món đã gọi trong phòng */}
              <div className="lg:col-span-5 rounded-xl border border-slate-200 bg-slate-50 p-3 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-2">
                    <span className="text-xs font-bold text-slate-800">
                      Món đã gọi ({orderItems.length})
                    </span>
                    <span className="text-xs font-bold text-blue-700">
                      {formatMoney(orderTotal)}
                    </span>
                  </div>

                  {orderItems.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-400 italic">
                      Chưa gọi món nào. Bấm vào sản phẩm bên trái để thêm vào phòng.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[42vh] overflow-y-auto pr-1">
                      {orderItems.map((ord) => (
                        <div
                          key={ord.id}
                          className="flex items-center justify-between rounded-lg bg-white p-2 border border-slate-200 shadow-2xs"
                        >
                          <div className="min-w-0 pr-2">
                            <div className="text-xs font-bold text-slate-900 truncate">
                              {ord.name}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {formatMoney(ord.unitPrice)} / {ord.unit}
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              onClick={() => updateOrderItemQuantity(ord.id, ord.quantity - 1)}
                              className="flex h-6 w-6 items-center justify-center rounded-md bg-slate-100 text-slate-600 hover:bg-slate-200"
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className="w-5 text-center text-xs font-bold text-slate-900">
                              {ord.quantity}
                            </span>
                            <button
                              onClick={() => updateOrderItemQuantity(ord.id, ord.quantity + 1)}
                              className="flex h-6 w-6 items-center justify-center rounded-md bg-slate-100 text-slate-600 hover:bg-slate-200"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                            <span className="text-xs font-bold text-slate-800 ml-1.5 min-w-[50px] text-right">
                              {formatMoney(ord.totalAmount)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'segments' && (
            <div className="space-y-3">
              <div className="rounded-xl bg-blue-50 p-3 text-xs text-blue-900 border border-blue-200">
                <strong>Chi tiết tính tiền theo Phương án A (Continuous Segments):</strong> Phiên
                hát có {pricing.calculatedSegments.length} phân đoạn phòng. Làm tròn thời gian FLOOR
                độc lập theo bước nhảy R={session.pricingConfigSnapshot.roundingMinutes} phút.
              </div>

              <div className="space-y-2">
                {pricing.calculatedSegments.map((seg, idx) => (
                  <div
                    key={seg.segmentId}
                    className="rounded-xl border border-slate-200 bg-white p-3 shadow-2xs space-y-2"
                  >
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-700">
                          {idx + 1}
                        </span>
                        <span className="font-bold text-slate-900">{seg.roomName}</span>
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
                          {seg.categoryName}
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-bold text-blue-700">
                          {formatMoney(seg.payableAmount)}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          Thô: {formatMoney(seg.rawAmount)}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-slate-600">
                      <div>
                        <span className="text-slate-400">Giờ vào: </span>
                        <strong>{new Date(seg.checkInTime).toLocaleTimeString('vi-VN')}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400">Giờ ra: </span>
                        <strong>
                          {seg.checkOutTime
                            ? new Date(seg.checkOutTime).toLocaleTimeString('vi-VN')
                            : 'Đang hát...'}
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-400">Thực tế: </span>
                        <strong>{formatDuration(seg.actualSeconds)}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400">Tính tiền: </span>
                        <strong>{formatDuration(seg.billedSeconds)}</strong>
                      </div>
                    </div>

                    {/* Subsegments bên trong nếu qua ranh giới */}
                    {seg.subsegments.length > 1 && (
                      <div className="mt-2 pt-2 border-t border-dashed border-slate-200">
                        <div className="text-[11px] font-semibold text-slate-500 mb-1">
                          Các lát cắt khung giờ (Hare-Niemeyer allocation):
                        </div>
                        <div className="space-y-1">
                          {seg.subsegments.map((sub) => (
                            <div
                              key={sub.id}
                              className="flex justify-between text-[11px] bg-slate-50 p-1.5 rounded"
                            >
                              <span>
                                {sub.timeSlotName} ({sub.dayTypeName}) • Đơn giá:{' '}
                                {formatMoney(sub.hourlyRate)}/h
                              </span>
                              <span>
                                {formatDuration(sub.billedSeconds)} = {formatMoney(sub.rawAmount)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'cancel' && (
            <div className="max-w-lg mx-auto py-4 space-y-4 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-red-600 mx-auto">
                <AlertTriangle className="h-7 w-7" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Hủy Phiên Phòng (Mistake Cancellation)
                </h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Áp dụng theo Mục 6 Báo cáo REV3.2: Trường hợp nhân viên mở nhầm phòng hoặc khách vào
                  đổi ý ra ngay. Tiền phòng = 0 VNĐ, không phát hành hóa đơn tài chính, tự động ghi
                  Audit Log.
                </p>
              </div>

              <div className="text-left">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nhập lý do hủy phiên:
                </label>
                <input
                  type="text"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-800 focus:outline-hidden"
                  placeholder="Nhập lý do hủy..."
                />
              </div>

              <button
                onClick={handleCancelSession}
                className="w-full rounded-xl bg-red-600 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-red-700 transition-colors"
              >
                Xác nhận hủy phiên phòng này
              </button>
            </div>
          )}
        </div>

        {/* Footer Tác vụ Nhanh */}
        <div className="border-t border-slate-200 bg-slate-50 px-4 py-3 shrink-0 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-4 text-xs">
            <div>
              <span className="text-slate-500">Tiền phòng tạm: </span>
              <strong className="text-blue-700 font-bold">
                {formatMoney(pricing.payable_amount)}
              </strong>
            </div>
            <div>
              <span className="text-slate-500">Đồ uống: </span>
              <strong className="text-slate-800 font-bold">{formatMoney(orderTotal)}</strong>
            </div>
            <div>
              <span className="text-slate-500">TỔNG TẠM: </span>
              <strong className="text-base font-extrabold text-blue-800">
                {formatMoney(pricing.payable_amount + orderTotal)}
              </strong>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => {
                onClose();
                onOpenStaffTimer();
              }}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <Users2 className="h-4 w-4 text-blue-600" />
              <span>Tính giờ ({activeStaffTickets.length})</span>
            </button>

            <button
              onClick={() => {
                onClose();
                onOpenTransfer();
              }}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <ArrowRightLeft className="h-4 w-4 text-indigo-600" />
              <span>Chuyển phòng</span>
            </button>

            <button
              onClick={() => {
                onClose();
                onOpenCheckout();
              }}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition-colors"
            >
              <ReceiptText className="h-4 w-4" />
              <span>Thanh toán</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
