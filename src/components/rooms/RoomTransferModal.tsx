import React, { useState } from 'react';
import { ArrowRightLeft, X, AlertCircle, CheckCircle2, DoorOpen } from 'lucide-react';
import { Room } from '../../types';
import { getAllRooms, transferRoom } from '../../db/storage';

interface RoomTransferModalProps {
  currentRoom: Room | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const RoomTransferModal: React.FC<RoomTransferModalProps> = ({
  currentRoom,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [selectedTargetId, setSelectedTargetId] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

  if (!isOpen || !currentRoom || !currentRoom.currentSessionId) return null;

  const allRooms = getAllRooms();
  // Chỉ hiện các phòng đang TRỐNG (AVAILABLE)
  const availableRooms = allRooms.filter((r) => r.status === 'AVAILABLE' && r.id !== currentRoom.id);

  const handleTransfer = () => {
    if (!selectedTargetId) {
      setErrorMsg('Vui lòng chọn phòng muốn chuyển đến');
      return;
    }

    try {
      transferRoom(currentRoom.currentSessionId!, selectedTargetId);
      setErrorMsg('');
      onSuccess();
      onClose();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Có lỗi xảy ra khi chuyển phòng');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2 text-slate-800 font-bold">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700">
              <ArrowRightLeft className="h-4 w-4" />
            </div>
            <span>Chuyển phòng hát (Phương án A)</span>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Thông tin phòng hiện tại */}
        <div className="mt-4 rounded-xl bg-slate-50 p-3 border border-slate-200/80">
          <div className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">
            Phòng hiện tại:
          </div>
          <div className="mt-1 flex items-center justify-between">
            <span className="text-base font-bold text-slate-900">
              {currentRoom.name} ({currentRoom.code})
            </span>
            <span className="rounded-md bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-800">
              {currentRoom.categoryName}
            </span>
          </div>
        </div>

        {/* Giải thích quy tắc Phương án A đã chốt 100% */}
        <div className="mt-3 rounded-xl bg-blue-50 p-3 text-xs text-blue-900 border border-blue-200/80 leading-relaxed">
          <div className="font-bold flex items-center gap-1 mb-1 text-blue-800">
            <CheckCircle2 className="h-3.5 w-3.5 text-blue-600" />
            Quy tắc chuyển phòng liên tục:
          </div>
          Thời gian khách đã hát tại <strong>{currentRoom.name}</strong> sẽ được chốt và tính theo giá của {currentRoom.name}. Thời gian từ lúc chuyển sang phòng mới sẽ tính theo giá của phòng mới. <em>Tuyệt đối không tính hồi tố toàn bộ giờ!</em>
        </div>

        {/* Danh sách phòng trống để chuyển đến */}
        <div className="mt-4">
          <label className="block text-xs font-bold text-slate-700 mb-1.5">
            Chọn phòng trống muốn chuyển đến:
          </label>
          {availableRooms.length === 0 ? (
            <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50 p-3 text-center text-xs text-amber-800">
              Hiện tại không có phòng trống nào khác để chuyển!
            </div>
          ) : (
            <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
              {availableRooms.map((target) => (
                <label
                  key={target.id}
                  className={`flex cursor-pointer items-center justify-between rounded-xl border p-2.5 transition-all ${
                    selectedTargetId === target.id
                      ? 'border-indigo-600 bg-indigo-50/50 text-indigo-950 font-bold'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="targetRoom"
                      value={target.id}
                      checked={selectedTargetId === target.id}
                      onChange={() => {
                        setSelectedTargetId(target.id);
                        setErrorMsg('');
                      }}
                      className="text-indigo-600 focus:ring-indigo-500"
                    />
                    <DoorOpen className="h-4 w-4 text-slate-400" />
                    <span className="text-xs">{target.name}</span>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 font-medium">
                      {target.categoryName}
                    </span>{' '}
                    • {target.areaName}
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>

        {errorMsg && (
          <div className="mt-3 flex items-center gap-1.5 text-xs text-red-600">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-slate-300 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            Đóng
          </button>
          <button
            type="button"
            disabled={!selectedTargetId || availableRooms.length === 0}
            onClick={handleTransfer}
            className="flex-1 rounded-xl bg-indigo-600 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            Xác nhận chuyển
          </button>
        </div>
      </div>
    </div>
  );
};
