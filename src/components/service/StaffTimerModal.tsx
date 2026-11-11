import React, { useState, useEffect } from 'react';
import {
  Users2,
  X,
  Play,
  Square,
  Clock,
  Edit2,
  CheckCircle,
  AlertCircle,
  Plus,
  RefreshCw,
  RotateCcw,
} from 'lucide-react';
import { Room, ServiceSession, StaffTicket, StaffButtonConfig } from '../../types';
import {
  getServiceSessionBySessionId,
  getStaffButtons,
  getServiceTimerConfig,
  toggleStaffTimer,
  editStaffTicketTime,
  completeServiceSession,
  reopenServiceSession,
  subscribeToStore,
} from '../../db/storage';
import { calculateStaffTicket } from '../../core/serviceTimerEngine';
import { formatMoney } from '../../core/pricingEngine';

interface StaffTimerModalProps {
  room: Room | null;
  isOpen: boolean;
  onClose: () => void;
}

export const StaffTimerModal: React.FC<StaffTimerModalProps> = ({ room, isOpen, onClose }) => {
  const [serviceSession, setServiceSession] = useState<ServiceSession | null>(null);
  const [buttons, setButtons] = useState<StaffButtonConfig[]>([]);
  const [editingTicket, setEditingTicket] = useState<StaffTicket | null>(null);
  const [editCheckIn, setEditCheckIn] = useState<string>('');
  const [editCheckOut, setEditCheckOut] = useState<string>('');
  const [customRealName, setCustomRealName] = useState<string>('');
  const [customManagerName, setCustomManagerName] = useState<string>('');
  const [confirmComplete, setConfirmComplete] = useState<boolean>(false);
  const [, setTicker] = useState<number>(0);

  useEffect(() => {
    if (!isOpen || !room?.currentSessionId) return;

    const reloadData = () => {
      const sess = getServiceSessionBySessionId(room.currentSessionId!);
      setServiceSession(sess || null);
      setButtons(getStaffButtons());
    };

    reloadData();
    const unsubscribe = subscribeToStore(reloadData);

    // Cập nhật từng giây cho các lượt đang chạy
    const interval = setInterval(() => {
      setTicker((prev) => prev + 1);
    }, 1000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [isOpen, room?.currentSessionId]);

  if (!isOpen || !room || !room.currentSessionId) return null;

  const timerConfig = getServiceTimerConfig();
  const tickets = serviceSession?.tickets || [];
  const isCompleted = serviceSession?.status === 'COMPLETED';

  // Xử lý bấm nút nhanh NV1..NV16
  const handleButtonClick = (buttonCode: string) => {
    if (isCompleted) return;
    toggleStaffTimer(room.currentSessionId!, buttonCode, {
      realStaffName: customRealName.trim() || undefined,
      managerName: customManagerName.trim() || undefined,
    });
  };

  const openEditModal = (ticket: StaffTicket) => {
    setEditingTicket(ticket);
    // Định dạng YYYY-MM-DDTHH:mm cho input datetime-local
    const inDate = new Date(ticket.checkInTime);
    inDate.setMinutes(inDate.getMinutes() - inDate.getTimezoneOffset());
    setEditCheckIn(inDate.toISOString().slice(0, 16));

    if (ticket.checkOutTime) {
      const outDate = new Date(ticket.checkOutTime);
      outDate.setMinutes(outDate.getMinutes() - outDate.getTimezoneOffset());
      setEditCheckOut(outDate.toISOString().slice(0, 16));
    } else {
      setEditCheckOut('');
    }
  };

  const handleSaveEditTime = () => {
    if (!editingTicket) return;
    const newIn = new Date(editCheckIn).toISOString();
    const newOut = editCheckOut ? new Date(editCheckOut).toISOString() : undefined;

    editStaffTicketTime(room.currentSessionId!, editingTicket.ticketId, newIn, newOut);
    setEditingTicket(null);
  };

  const handleCompleteSession = () => {
    completeServiceSession(room.currentSessionId!);
    setConfirmComplete(false);
  };

  const handleReopenSession = () => {
    reopenServiceSession(room.currentSessionId!);
  };

  // Tính tổng tiền phục vụ phòng hiện tại
  const totalAmount = tickets.reduce((sum, t) => {
    const calc = calculateStaffTicket(t, timerConfig, new Date());
    return sum + (t.isCompleted ? t.finalAmount : calc.finalAmount);
  }, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-2 sm:p-4 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-4xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header Modal */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-xs">
              <Users2 className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">
                  Tính Giờ Nhân Viên Phục Vụ (Module 18)
                </h2>
                <span className="rounded-md bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-800">
                  {room.name}
                </span>
                {isCompleted && (
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                    Đã lưu / hoàn tất
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500">
                10 phút đầu {formatMoney(timerConfig.first10MinPrice)} • Giá giờ{' '}
                {formatMoney(timerConfig.generalHourlyPrice)} • Làm tròn {timerConfig.roundingMinutes}p
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Thân Modal */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Lưới nút bấm nhanh NV1..NV16 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-blue-600" />
                Lưới chọn nhanh nhân viên (Bấm để Bật / Tắt giờ vào):
              </label>
              {/* Tùy chọn gán nhanh tên thật & quản lý cho lượt bấm kế tiếp */}
              <div className="hidden sm:flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Gợi ý tên thật (tùy chọn)..."
                  value={customRealName}
                  onChange={(e) => setCustomRealName(e.target.value)}
                  className="rounded-lg border border-slate-300 px-2 py-1 text-xs text-slate-800 focus:outline-hidden"
                />
                <input
                  type="text"
                  placeholder="Tên quản lý..."
                  value={customManagerName}
                  onChange={(e) => setCustomManagerName(e.target.value)}
                  className="rounded-lg border border-slate-300 px-2 py-1 text-xs text-slate-800 focus:outline-hidden"
                />
              </div>
            </div>

            <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
              {buttons.map((btn) => {
                // Kiểm tra xem nút này có đang chạy không
                const active = tickets.some((t) => t.buttonCode === btn.buttonCode && !t.isCompleted);

                return (
                  <button
                    key={btn.id}
                    disabled={isCompleted}
                    onClick={() => handleButtonClick(btn.buttonCode)}
                    className={`flex flex-col items-center justify-center h-14 rounded-xl border text-xs font-bold transition-all ${
                      active
                        ? 'bg-emerald-600 border-emerald-700 text-white shadow-md shadow-emerald-500/20 scale-102 animate-pulse'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300'
                    } disabled:opacity-50`}
                  >
                    <span className="text-sm font-extrabold">{btn.displayName}</span>
                    <span className="text-[10px] font-normal opacity-85">
                      {active ? 'Đang chạy' : 'Sẵn sàng'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Bảng danh sách phiếu phục vụ chi tiết */}
          <div className="rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="bg-slate-100 px-3 py-2 text-xs font-bold text-slate-800 flex items-center justify-between">
              <span>Danh sách các lượt phục vụ ({tickets.length} lượt)</span>
              <span className="text-[11px] font-normal text-slate-500">
                (Nhấn đúp vào Giờ vào hoặc Giờ ra để chỉnh sửa thời gian)
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-[11px] font-bold text-slate-600 uppercase border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-2 text-center w-10">STT</th>
                    <th className="px-3 py-2">Tên nút</th>
                    <th className="px-3 py-2">Nhân viên</th>
                    <th className="px-3 py-2">Quản lý</th>
                    <th className="px-3 py-2">Giờ vào</th>
                    <th className="px-3 py-2">Giờ ra</th>
                    <th className="px-3 py-2 text-center">Thời gian</th>
                    <th className="px-3 py-2 text-right">Thành tiền</th>
                    <th className="px-2 py-2 text-center w-12">Sửa</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {tickets.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-3 py-8 text-center text-slate-400 italic">
                        Chưa có nhân viên nào được chọn phục vụ. Bấm các nút NV1..NV16 phía trên để bắt đầu tính giờ.
                      </td>
                    </tr>
                  ) : (
                    tickets.map((t, idx) => {
                      const calc = calculateStaffTicket(t, timerConfig, new Date());
                      const currentMinutes = t.isCompleted ? t.billedMinutes : calc.billedMinutes;
                      const currentFinalAmount = t.isCompleted ? t.finalAmount : calc.finalAmount;

                      return (
                        <tr
                          key={t.ticketId}
                          className={!t.isCompleted ? 'bg-emerald-50/40 font-medium' : 'hover:bg-slate-50'}
                        >
                          <td className="px-3 py-2.5 text-center text-slate-400">{idx + 1}</td>
                          <td className="px-3 py-2.5 font-bold text-blue-700">
                            {t.displayName}
                          </td>
                          <td className="px-3 py-2.5 text-slate-600">
                            {t.realStaffName || <span className="text-slate-300">—</span>}
                          </td>
                          <td className="px-3 py-2.5 text-slate-600">
                            {t.managerName || <span className="text-slate-300">—</span>}
                          </td>
                          <td
                            className="px-3 py-2.5 cursor-pointer hover:underline text-slate-700"
                            onDoubleClick={() => openEditModal(t)}
                            title="Nhấn đúp để sửa giờ vào"
                          >
                            {new Date(t.checkInTime).toLocaleTimeString('vi-VN')}
                          </td>
                          <td
                            className="px-3 py-2.5 cursor-pointer hover:underline"
                            onDoubleClick={() => openEditModal(t)}
                            title="Nhấn đúp để sửa giờ ra"
                          >
                            {t.checkOutTime ? (
                              <span className="text-slate-700">
                                {new Date(t.checkOutTime).toLocaleTimeString('vi-VN')}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-emerald-700 font-bold">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
                                Đang chạy...
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-center font-bold">
                            {currentMinutes} phút
                          </td>
                          <td className="px-3 py-2.5 text-right font-extrabold text-blue-700">
                            {formatMoney(currentFinalAmount)}
                          </td>
                          <td className="px-2 py-2.5 text-center">
                            <button
                              onClick={() => openEditModal(t)}
                              className="p-1 text-slate-400 hover:text-blue-600 rounded hover:bg-slate-100"
                              title="Chỉnh sửa giờ"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer Modal: Tổng cộng & Hành động */}
        <div className="border-t border-slate-200 bg-slate-50 px-4 py-3 shrink-0 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Tổng tiền phục vụ tạm tính:</span>
            <span className="text-lg font-bold text-blue-700">{formatMoney(totalAmount)}</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {isCompleted ? (
              <button
                onClick={handleReopenSession}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-blue-600 bg-blue-50 px-3.5 py-2 text-xs font-bold text-blue-700 hover:bg-blue-100 transition-colors w-full sm:w-auto"
                title="Mở lại phiếu để tiếp tục thêm nhân viên"
              >
                <RotateCcw className="h-4 w-4" />
                <span>Mở lại phiếu phục vụ</span>
              </button>
            ) : (
              <button
                onClick={() => setConfirmComplete(true)}
                disabled={tickets.length === 0}
                className="flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 disabled:opacity-50 transition-colors w-full sm:w-auto"
              >
                <CheckCircle className="h-4 w-4" />
                <span>Lưu phiếu / Kết thúc (F9)</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>

      {/* Modal Hộp thoại sửa giờ vào / giờ ra khi nhấn đúp */}
      {editingTicket && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl border border-slate-200 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <span className="text-sm font-bold text-slate-900">
                Sửa thời gian phục vụ: {editingTicket.displayName}
              </span>
              <button
                onClick={() => setEditingTicket(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-3.5 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Giờ vào:
                </label>
                <input
                  type="datetime-local"
                  value={editCheckIn}
                  onChange={(e) => setEditCheckIn(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-2 text-xs font-mono text-slate-900 focus:outline-hidden"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    Giờ ra:
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const now = new Date();
                      now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
                      setEditCheckOut(now.toISOString().slice(0, 16));
                    }}
                    className="text-[11px] text-blue-600 font-bold hover:underline"
                  >
                    Lấy Bây Giờ
                  </button>
                </div>
                <input
                  type="datetime-local"
                  value={editCheckOut}
                  onChange={(e) => setEditCheckOut(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-2 text-xs font-mono text-slate-900 focus:outline-hidden"
                  placeholder="Để trống nếu đang chạy..."
                />
                <p className="mt-1 text-[10px] text-slate-500">
                  Xóa trống nếu muốn lượt tiếp tục chạy.
                </p>
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <button
                onClick={() => setEditingTicket(null)}
                className="flex-1 rounded-xl border border-slate-300 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Hủy
              </button>
              <button
                onClick={handleSaveEditTime}
                className="flex-1 rounded-xl bg-blue-600 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700"
              >
                Lưu thay đổi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Xác nhận kết thúc phiếu */}
      {confirmComplete && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl border border-slate-200 animate-in zoom-in-95">
            <h3 className="text-sm font-bold text-slate-900">
              Bạn có muốn lưu và kết thúc phiếu này không?
            </h3>
            <p className="mt-2 text-xs text-slate-600 leading-relaxed">
              Tất cả các lượt còn đang chạy sẽ được chốt giờ ra tại thời điểm hiện tại. Sau khi lưu, bạn vẫn có thể mở lại phiếu nếu cần chỉnh sửa.
            </p>
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => setConfirmComplete(false)}
                className="flex-1 rounded-xl border border-slate-300 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Quay lại
              </button>
              <button
                onClick={handleCompleteSession}
                className="flex-1 rounded-xl bg-emerald-600 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700"
              >
                Đồng ý lưu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
