import React, { useState, useEffect } from 'react';
import {
  Users2,
  UserCog,
  Save,
  Plus,
  Clock,
  Sparkles,
  Edit2,
  X,
  CheckCircle2,
} from 'lucide-react';
import { StaffButtonConfig, ServiceTimerConfig } from '../../types';
import {
  getStaffButtons,
  updateStaffButtons,
  getServiceTimerConfig,
  updateServiceTimerConfig,
  subscribeToStore,
} from '../../db/storage';
import { formatMoney } from '../../core/pricingEngine';

export const StaffCatalogView: React.FC = () => {
  const [buttons, setButtons] = useState<StaffButtonConfig[]>([]);
  const [timerConfig, setTimerConfig] = useState<ServiceTimerConfig>(getServiceTimerConfig());
  const [activeTab, setActiveTab] = useState<'buttons' | 'general_rates'>('buttons');
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [editingBtn, setEditingBtn] = useState<StaffButtonConfig | null>(null);

  // Edit fields
  const [displayName, setDisplayName] = useState('');
  const [customHourlyRate, setCustomHourlyRate] = useState<number | undefined>(undefined);

  useEffect(() => {
    const reload = () => {
      setButtons(getStaffButtons());
      setTimerConfig(getServiceTimerConfig());
    };
    reload();
    const unsubscribe = subscribeToStore(reload);
    return () => unsubscribe();
  }, []);

  const openEditBtn = (btn: StaffButtonConfig) => {
    setEditingBtn(btn);
    setDisplayName(btn.displayName);
    setCustomHourlyRate(btn.customHourlyRate);
  };

  const handleSaveBtn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBtn) return;

    const all = [...buttons];
    const target = all.find((b) => b.id === editingBtn.id);
    if (target) {
      target.displayName = displayName.trim() || target.buttonCode;
      target.customHourlyRate = customHourlyRate && customHourlyRate > 0 ? customHourlyRate : undefined;
      updateStaffButtons(all);
    }
    setEditingBtn(null);
  };

  const handleSaveGeneralConfig = (e: React.FormEvent) => {
    e.preventDefault();
    updateServiceTimerConfig(timerConfig);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <UserCog className="h-5 w-5 text-blue-600" />
            <span>Quản Lý Nhân Viên & Nút Bấm Phục Vụ (Module 18)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Phân biệt độc lập: Tên nút (NV1..), Tên thật nhân viên, và Tên quản lý. Giá riêng gắn
            với nút.
          </p>
        </div>

        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('buttons')}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
              activeTab === 'buttons' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600'
            }`}
          >
            Lưới Nút Bấm (NV1 - NV16)
          </button>
          <button
            onClick={() => setActiveTab('general_rates')}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
              activeTab === 'general_rates' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600'
            }`}
          >
            Cài Đặt Giá Chung
          </button>
        </div>
      </div>

      {activeTab === 'buttons' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {buttons.map((btn) => (
            <div
              key={btn.id}
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs flex flex-col justify-between hover:border-blue-400 transition-colors"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-100 text-blue-800 font-extrabold text-xs">
                    {btn.buttonCode}
                  </span>
                  <button
                    onClick={() => openEditBtn(btn)}
                    className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-slate-100"
                    title="Chỉnh sửa tên và giá riêng"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-3">
                  <div className="text-sm font-bold text-slate-900">{btn.displayName}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Tên hiển thị &amp; in trên hóa đơn
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 text-xs">
                <span className="text-slate-400">Đơn giá áp dụng: </span>
                <strong className="text-blue-700">
                  {btn.customHourlyRate
                    ? `${formatMoney(btn.customHourlyRate)}/h (Giá riêng)`
                    : `${formatMoney(timerConfig.generalHourlyPrice)}/h (Giá chung)`}
                </strong>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'general_rates' && (
        <div className="max-w-xl rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <form onSubmit={handleSaveGeneralConfig} className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
              Công Thức &amp; Bảng Giá Phục Vụ Chung
            </h3>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Giá 10 phút đầu (P_10):
              </label>
              <input
                type="number"
                step="5000"
                value={timerConfig.first10MinPrice}
                onChange={(e) =>
                  setTimerConfig({ ...timerConfig, first10MinPrice: Number(e.target.value) || 0 })
                }
                className="w-full rounded-xl border border-slate-300 p-2 text-xs font-bold text-slate-900 focus:outline-hidden"
              />
              <p className="mt-1 text-[11px] text-slate-500">Mặc định: 40.000 VNĐ</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Giá 1 giờ chung (P_hour):
              </label>
              <input
                type="number"
                step="10000"
                value={timerConfig.generalHourlyPrice}
                onChange={(e) =>
                  setTimerConfig({ ...timerConfig, generalHourlyPrice: Number(e.target.value) || 0 })
                }
                className="w-full rounded-xl border border-slate-300 p-2 text-xs font-bold text-slate-900 focus:outline-hidden"
              />
              <p className="mt-1 text-[11px] text-slate-500">
                Mặc định: 250.000 VNĐ (Nếu nút có giá riêng sẽ dùng giá riêng)
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Bước làm tròn thời gian phục vụ:
              </label>
              <input
                type="number"
                min="1"
                max="60"
                value={timerConfig.roundingMinutes}
                onChange={(e) =>
                  setTimerConfig({ ...timerConfig, roundingMinutes: Number(e.target.value) || 5 })
                }
                className="w-full rounded-xl border border-slate-300 p-2 text-xs font-bold text-slate-900 focus:outline-hidden"
              />
              <p className="mt-1 text-[11px] text-slate-500">
                Mặc định: 5 phút. Công thức: t = ceil(Δt_raw / r) * r
              </p>
            </div>

            <div className="pt-2 flex items-center justify-between">
              {isSaved && (
                <span className="flex items-center gap-1 text-xs font-bold text-emerald-600">
                  <CheckCircle2 className="h-4 w-4" />
                  Đã lưu cấu hình!
                </span>
              )}
              <button
                type="submit"
                className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 ml-auto"
              >
                <Save className="h-4 w-4" />
                <span>Lưu cài đặt</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal Chỉnh Sửa Nút Phục Vụ */}
      {editingBtn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl border border-slate-200 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="text-sm font-bold text-slate-900">
                Sửa Nút Bấm: {editingBtn.buttonCode}
              </span>
              <button
                onClick={() => setEditingBtn(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveBtn} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tên hiển thị / Tên nút:
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="VD: NV1, My 1, Đào 01..."
                  required
                  className="w-full rounded-xl border border-slate-300 p-2 text-xs font-bold text-slate-900 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Đơn giá giờ riêng của nút (VNĐ):
                </label>
                <input
                  type="number"
                  step="10000"
                  value={customHourlyRate || ''}
                  onChange={(e) =>
                    setCustomHourlyRate(e.target.value ? Number(e.target.value) : undefined)
                  }
                  placeholder="Để trống nếu dùng giá chung (250k)..."
                  className="w-full rounded-xl border border-slate-300 p-2 text-xs text-slate-900 focus:outline-hidden"
                />
                <p className="mt-1 text-[10px] text-slate-500">
                  Nếu để trống, hệ thống sẽ tự động dùng giá chung{' '}
                  {formatMoney(timerConfig.generalHourlyPrice)}/h.
                </p>
              </div>

              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditingBtn(null)}
                  className="flex-1 rounded-xl border border-slate-300 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-blue-600 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-blue-700"
                >
                  Lưu thay đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
