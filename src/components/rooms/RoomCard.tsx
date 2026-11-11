import React, { useState, useEffect } from 'react';
import {
  Clock,
  Users2,
  UtensilsCrossed,
  ArrowRightLeft,
  ReceiptText,
  Play,
  Sparkles,
  AlertCircle,
  Tag,
} from 'lucide-react';
import { Room, Session, OrderItem, ServiceSession } from '../../types';
import {
  getSessionById,
  getOrderItemsBySession,
  getServiceSessionBySessionId,
} from '../../db/storage';
import { calculateSessionPricing, formatDuration, formatMoney } from '../../core/pricingEngine';

interface RoomCardProps {
  room: Room;
  onOpenRoom: (room: Room) => void;
  onViewDetails: (room: Room) => void;
  onTransferRoom: (room: Room) => void;
  onStaffTimer: (room: Room) => void;
  onCheckout: (room: Room) => void;
}

export const RoomCard: React.FC<RoomCardProps> = ({
  room,
  onOpenRoom,
  onViewDetails,
  onTransferRoom,
  onStaffTimer,
  onCheckout,
}) => {
  const [session, setSession] = useState<Session | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [serviceSession, setServiceSession] = useState<ServiceSession | null>(null);
  const [liveDuration, setLiveDuration] = useState<number>(0);
  const [livePayableRoom, setLivePayableRoom] = useState<number>(0);

  useEffect(() => {
    if (room.currentSessionId) {
      const sess = getSessionById(room.currentSessionId);
      if (sess && sess.status === 'ACTIVE') {
        setSession(sess);
        setOrderItems(getOrderItemsBySession(sess.id));
        setServiceSession(getServiceSessionBySessionId(sess.id) || null);

        const checkInTime = new Date(sess.startTime).getTime();
        const diff = Math.max(0, Math.floor((Date.now() - checkInTime) / 1000));
        setLiveDuration(diff);

        const pricing = calculateSessionPricing(sess, new Date());
        setLivePayableRoom(pricing.payable_amount);
      } else {
        setSession(null);
      }
    } else {
      setSession(null);
    }

    const interval = setInterval(() => {
      if (room.currentSessionId) {
        const sess = getSessionById(room.currentSessionId);
        if (sess && sess.status === 'ACTIVE') {
          const checkInTime = new Date(sess.startTime).getTime();
          const diff = Math.max(0, Math.floor((Date.now() - checkInTime) / 1000));
          setLiveDuration(diff);

          const pricing = calculateSessionPricing(sess, new Date());
          setLivePayableRoom(pricing.payable_amount);
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [room.currentSessionId, room.status]);

  const isOccupied = room.status === 'OCCUPIED';
  const isWaitingPayment = room.status === 'WAITING_PAYMENT';
  const isAvailable = room.status === 'AVAILABLE';

  const orderTotal = orderItems.reduce((acc, item) => acc + item.totalAmount, 0);
  const activeStaffCount =
    serviceSession?.tickets.filter((t) => !t.isCompleted).length || 0;

  // Tính tổng tiền tạm tính hiện tại
  const tempTotal = livePayableRoom + orderTotal;

  // Màu sắc thẻ phòng theo đặc tả v0.9 Mục 5.2
  const cardBorderClass = isOccupied
    ? 'border-emerald-400 bg-white shadow-emerald-500/10'
    : isWaitingPayment
    ? 'border-amber-400 bg-amber-50/30 shadow-amber-500/10'
    : isAvailable
    ? 'border-slate-200 bg-white hover:border-blue-400 hover:shadow-blue-500/10'
    : 'border-slate-200 bg-slate-100 opacity-60';

  const statusBadge = isOccupied ? (
    <span className="flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
      Đang hát
    </span>
  ) : isWaitingPayment ? (
    <span className="flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800">
      <span className="h-2 w-2 rounded-full bg-amber-500" />
      Chờ thanh toán
    </span>
  ) : isAvailable ? (
    <span className="flex items-center gap-1.5 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-bold text-blue-800">
      <span className="h-2 w-2 rounded-full bg-blue-500" />
      Phòng trống
    </span>
  ) : (
    <span className="rounded-full bg-slate-200 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
      Bảo trì
    </span>
  );

  return (
    <div
      className={`group relative flex flex-col justify-between rounded-2xl border-2 p-4 shadow-sm transition-all duration-200 ${cardBorderClass}`}
    >
      {/* Cụm Header của Thẻ Phòng */}
      <div>
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-extrabold text-slate-900 group-hover:text-blue-600 transition-colors">
                {room.name}
              </span>
              <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-bold text-slate-600">
                {room.code}
              </span>
            </div>
            <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <Tag className="h-3 w-3 text-slate-400" />
                {room.categoryName}
              </span>
              <span>•</span>
              <span>{room.areaName}</span>
            </div>
          </div>
          <div>{statusBadge}</div>
        </div>

        {/* Nội dung khi phòng ĐANG HOẠT ĐỘNG */}
        {isOccupied && session && (
          <div className="mt-3.5 space-y-2.5 rounded-xl bg-slate-50 p-2.5 border border-slate-100">
            {/* Đồng hồ đếm giờ sống */}
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1 text-slate-600 font-medium">
                <Clock className="h-3.5 w-3.5 text-emerald-600 animate-pulse" />
                Thời gian:
              </span>
              <span className="font-mono font-bold text-slate-900 text-sm">
                {formatDuration(liveDuration)}
              </span>
            </div>

            {/* Giá trị tạm tính */}
            <div className="flex items-center justify-between text-xs border-t border-slate-200/60 pt-1.5">
              <span className="text-slate-600">Tiền phòng tạm:</span>
              <span className="font-bold text-blue-700">{formatMoney(livePayableRoom)}</span>
            </div>

            {orderTotal > 0 && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600">
                  Đồ uống ({orderItems.length} món):
                </span>
                <span className="font-semibold text-slate-800">{formatMoney(orderTotal)}</span>
              </div>
            )}

            {/* Huy hiệu nhân viên phục vụ đang hoạt động */}
            {activeStaffCount > 0 && (
              <div className="flex items-center justify-between text-[11px] bg-emerald-50 text-emerald-800 px-2 py-1 rounded-lg border border-emerald-200/60">
                <span className="flex items-center gap-1 font-medium">
                  <Users2 className="h-3 w-3 text-emerald-600" />
                  Đang phục vụ:
                </span>
                <span className="font-bold">{activeStaffCount} nhân viên</span>
              </div>
            )}

            {/* Khách hàng (nếu có) */}
            {session.customerName && (
              <div className="text-[11px] text-slate-500 truncate">
                Khách: <strong>{session.customerName}</strong>
              </div>
            )}
          </div>
        )}

        {/* Khi phòng trống */}
        {isAvailable && (
          <div className="my-6 text-center text-xs text-slate-400 italic">
            Phòng đang sẵn sàng đón khách
          </div>
        )}
      </div>

      {/* Cụm Nút Tác vụ (Action Bar) */}
      <div className="mt-4 pt-3 border-t border-slate-100">
        {isAvailable ? (
          <button
            onClick={() => onOpenRoom(room)}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-blue-700 active:scale-98 transition-all"
          >
            <Play className="h-3.5 w-3.5 fill-current" />
            <span>Mở phòng hát</span>
          </button>
        ) : (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() => onViewDetails(room)}
                className="flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                title="Gọi món & xem chi tiết"
              >
                <UtensilsCrossed className="h-3.5 w-3.5 text-amber-600" />
                <span>Gọi món</span>
              </button>

              <button
                onClick={() => onStaffTimer(room)}
                className="flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                title="Tính giờ nhân viên phục vụ (Module 18)"
              >
                <Users2 className="h-3.5 w-3.5 text-blue-600" />
                <span>Tính giờ ({activeStaffCount})</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() => onTransferRoom(room)}
                className="flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                title="Chuyển phòng theo Option A liên tục"
              >
                <ArrowRightLeft className="h-3.5 w-3.5 text-indigo-600" />
                <span>Chuyển phòng</span>
              </button>

              <button
                onClick={() => onCheckout(room)}
                className="flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 active:scale-98 transition-all"
                title="Tính tiền và in hóa đơn"
              >
                <ReceiptText className="h-3.5 w-3.5" />
                <span>Thanh toán</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
