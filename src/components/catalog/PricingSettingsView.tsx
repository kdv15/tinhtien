import React, { useState, useEffect } from 'react';
import {
  TableProperties,
  Save,
  RotateCcw,
  Plus,
  Trash2,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Lock,
  ShieldCheck,
} from 'lucide-react';
import { PricingConfig, PriceMatrixRow, RoundingStepMinutes, MoneyRoundingScope } from '../../types';
import { getPricingConfig, updatePricingConfig, subscribeToStore } from '../../db/storage';
import { PinDialog } from '../common/PinDialog';
import { formatMoney } from '../../core/pricingEngine';

export const PricingSettingsView: React.FC = () => {
  const [config, setConfig] = useState<PricingConfig>(getPricingConfig());
  const [matrix, setMatrix] = useState<PriceMatrixRow[]>(getPricingConfig().matrix);
  const [newHoliday, setNewHoliday] = useState<string>('');
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [showPinDialog, setShowPinDialog] = useState<boolean>(false);
  const [isAuthorized, setIsAuthorized] = useState<boolean>(false);

  useEffect(() => {
    const reload = () => {
      const current = getPricingConfig();
      setConfig(current);
      setMatrix(current.matrix);
    };
    reload();
    const unsubscribe = subscribeToStore(reload);
    return () => unsubscribe();
  }, []);

  const handleMatrixChange = (index: number, field: keyof PriceMatrixRow, value: number) => {
    const updated = [...matrix];
    updated[index] = {
      ...updated[index],
      [field]: value,
    };
    setMatrix(updated);
    setIsSaved(false);
  };

  const handleSaveConfig = () => {
    if (!isAuthorized) {
      setShowPinDialog(true);
      return;
    }

    const updatedConfig: PricingConfig = {
      ...config,
      matrix,
    };
    updatePricingConfig(updatedConfig);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const handleAddHoliday = () => {
    if (!newHoliday.trim() || config.holidays.includes(newHoliday.trim())) return;
    const updated = {
      ...config,
      holidays: [...config.holidays, newHoliday.trim()].sort(),
    };
    setConfig(updated);
    updatePricingConfig(updated);
    setNewHoliday('');
  };

  const handleRemoveHoliday = (dateStr: string) => {
    const updated = {
      ...config,
      holidays: config.holidays.filter((d) => d !== dateStr),
    };
    setConfig(updated);
    updatePricingConfig(updated);
  };

  return (
    <div className="space-y-4">
      {/* Header & Công cụ Lưu */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <TableProperties className="h-5 w-5 text-blue-600" />
              <span>Cài Đặt Bảng Giá & Pricing Engine</span>
            </h2>
            <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-[10px] font-bold text-blue-800">
              Chuẩn REV3.2
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Snapshot cấu hình được khóa vào từng phiên phòng khi mở. Thay đổi tại đây không làm sai
            lệch phiên đang chạy.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isSaved && (
            <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 animate-in fade-in">
              <CheckCircle2 className="h-4 w-4" />
              Đã lưu thành công!
            </span>
          )}

          <button
            onClick={handleSaveConfig}
            className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition-colors"
          >
            <Save className="h-4 w-4" />
            <span>Lưu bảng giá</span>
          </button>
        </div>
      </div>

      {/* Cấu Hình Chung của Pricing Engine */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* 1. Phương thức tính giá */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-2">
          <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
            1. Phương thức tính giá giờ:
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setConfig({ ...config, method: 'TIME_SLOTS' });
                setIsSaved(false);
              }}
              className={`p-2.5 rounded-xl border text-xs font-bold text-left transition-all ${
                config.method === 'TIME_SLOTS'
                  ? 'border-blue-600 bg-blue-50 text-blue-700'
                  : 'border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <div>Theo Buổi</div>
              <div className="text-[10px] font-normal text-slate-500 mt-0.5">
                Ma trận 12 ô (Sáng, Chiều, Tối, Khuya)
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                setConfig({ ...config, method: 'ONE_PRICE' });
                setIsSaved(false);
              }}
              className={`p-2.5 rounded-xl border text-xs font-bold text-left transition-all ${
                config.method === 'ONE_PRICE'
                  ? 'border-blue-600 bg-blue-50 text-blue-700'
                  : 'border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <div>1 Giá Cố Định</div>
              <div className="text-[10px] font-normal text-slate-500 mt-0.5">
                Chỉ lấy cột Sáng áp cho cả ngày
              </div>
            </button>
          </div>
        </div>

        {/* 2. Bước nhảy làm tròn thời gian R (FLOOR) */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-2">
          <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
            2. Làm tròn thời gian (Hàm FLOOR):
          </label>
          <select
            value={config.roundingMinutes}
            onChange={(e) => {
              setConfig({
                ...config,
                roundingMinutes: Number(e.target.value) as RoundingStepMinutes,
              });
              setIsSaved(false);
            }}
            className="w-full rounded-xl border border-slate-300 p-2 text-xs font-bold text-slate-800 focus:outline-hidden"
          >
            <option value="0">R = 0 phút (Giữ nguyên giây thực tế)</option>
            <option value="5">R = 5 phút (Làm tròn xuống block 5 phút)</option>
            <option value="10">R = 10 phút (Làm tròn xuống block 10 phút)</option>
            <option value="15">R = 15 phút (Làm tròn xuống block 15 phút)</option>
            <option value="20">R = 20 phút (Làm tròn xuống block 20 phút)</option>
            <option value="25">R = 25 phút (Làm tròn xuống block 25 phút)</option>
            <option value="30">R = 30 phút (Làm tròn xuống block 30 phút)</option>
            <option value="60">R = 60 phút (Làm tròn xuống block 60 phút)</option>
          </select>
          <p className="text-[11px] text-slate-500 leading-tight">
            Làm tròn độc lập trên từng phòng (RoomUsageSegment) theo đúng quyết định đã chốt.
          </p>
        </div>

        {/* 3. Làm tròn tiền & Phạm vi Q6 */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-2">
          <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
            3. Phạm vi làm tròn tiền (Q6):
          </label>
          <select
            value={config.moneyRoundingScope}
            onChange={(e) => {
              setConfig({
                ...config,
                moneyRoundingScope: e.target.value as MoneyRoundingScope,
              });
              setIsSaved(false);
            }}
            className="w-full rounded-xl border border-slate-300 p-2 text-xs font-bold text-slate-800 focus:outline-hidden"
          >
            <option value="total_session">Tổng phiên (Q6.B - Mặc định)</option>
            <option value="per_segment">Từng đoạn phòng (Q6.A)</option>
          </select>
          <p className="text-[11px] text-slate-500 leading-tight">
            Làm tròn LÊN bội số 1.000 VNĐ. Triệt tiêu sai số dấu phẩy động bằng số học nguyên BigInt.
          </p>
        </div>
      </div>

      {/* MA TRẬN ĐƠN GIÁ & MỨC TỐI THIỂU */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs">
        <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
          <div className="font-bold text-xs text-slate-800 uppercase tracking-wider">
            {config.method === 'ONE_PRICE'
              ? 'Bảng Đơn Giá Cố Định (Phương Thức 1 Giá) & Mức Tối Thiểu'
              : 'Bảng Đơn Giá Giờ (Phương Thức Theo Buổi - 12 Ô Ma Trận) & Mức Tối Thiểu'}
          </div>
          <div className="text-[11px] text-slate-500">
            {config.method === 'ONE_PRICE'
              ? 'Giá cố định cho cả ngày theo loại ngày • Giá 0 = Miễn phí • Giá 1 = 1 VNĐ/h'
              : 'Giá 0 = Miễn phí • Giá 1 = 1 VNĐ/h • Sáng (07-11h) • Chiều (11-17h) • Tối (17-24h) • Khuya (00-07h)'}
          </div>
        </div>

        <div className="overflow-x-auto">
          {config.method === 'ONE_PRICE' ? (
            /* BẢNG ĐƠN GIÁ CỐ ĐỊNH RIÊNG BIỆT CHO PHƯƠNG THỨC ONE_PRICE */
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100 text-[11px] font-bold text-slate-700 uppercase border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 border-r border-slate-200">Loại Phòng</th>
                  <th className="px-4 py-3 text-center bg-blue-50/70 border-r border-slate-200">
                    Đơn Giá Cố Định - Ngày Thường (VNĐ/h)
                  </th>
                  <th className="px-4 py-3 text-center bg-indigo-50/70 border-r border-slate-200">
                    Đơn Giá Cố Định - Cuối Tuần (VNĐ/h)
                  </th>
                  <th className="px-4 py-3 text-center bg-amber-50/70 border-r border-slate-200">
                    Đơn Giá Cố Định - Ngày Lễ (VNĐ/h)
                  </th>
                  <th className="px-4 py-3 text-center bg-red-50/50">Mức Tối Thiểu (VNĐ)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {matrix.map((row, idx) => (
                  <tr key={row.categoryId} className="hover:bg-slate-50/60">
                    <td className="px-4 py-3 font-bold text-slate-900 border-r border-slate-200 bg-slate-50/30">
                      {row.categoryName}
                    </td>
                    <td className="p-2 text-center border-r border-slate-200 bg-blue-50/20">
                      <input
                        type="number"
                        step="5000"
                        value={row.fixedPriceNormal !== undefined ? row.fixedPriceNormal : row.morningNormal}
                        onChange={(e) => handleMatrixChange(idx, 'fixedPriceNormal', Number(e.target.value) || 0)}
                        className="w-32 rounded-lg border border-slate-300 p-2 text-center font-mono font-bold text-xs text-blue-700 focus:outline-hidden"
                      />
                    </td>
                    <td className="p-2 text-center border-r border-slate-200 bg-indigo-50/20">
                      <input
                        type="number"
                        step="5000"
                        value={row.fixedPriceWeekend !== undefined ? row.fixedPriceWeekend : row.morningWeekend}
                        onChange={(e) => handleMatrixChange(idx, 'fixedPriceWeekend', Number(e.target.value) || 0)}
                        className="w-32 rounded-lg border border-slate-300 p-2 text-center font-mono font-bold text-xs text-indigo-700 focus:outline-hidden"
                      />
                    </td>
                    <td className="p-2 text-center border-r border-slate-200 bg-amber-50/20">
                      <input
                        type="number"
                        step="5000"
                        value={row.fixedPriceHoliday !== undefined ? row.fixedPriceHoliday : row.morningHoliday}
                        onChange={(e) => handleMatrixChange(idx, 'fixedPriceHoliday', Number(e.target.value) || 0)}
                        className="w-32 rounded-lg border border-slate-300 p-2 text-center font-mono font-bold text-xs text-amber-700 focus:outline-hidden"
                      />
                    </td>
                    <td className="p-2 text-center bg-red-50/30">
                      <input
                        type="number"
                        step="10000"
                        value={row.minimumCharge}
                        onChange={(e) => handleMatrixChange(idx, 'minimumCharge', Number(e.target.value) || 0)}
                        className="w-32 rounded-lg border border-red-300 p-2 text-center font-mono font-bold text-xs text-red-700 focus:outline-hidden"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            /* MA TRẬN 12 Ô ĐƠN GIÁ THEO BUỔI */
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100 text-[10px] font-bold text-slate-700 uppercase border-b border-slate-200">
                <tr>
                  <th rowSpan={2} className="px-3 py-2 border-r border-slate-200">Loại Phòng</th>
                  <th colSpan={3} className="px-3 py-1.5 text-center bg-blue-50/70 border-r border-slate-200">
                    BUỔI SÁNG (07:00 - 10:59)
                  </th>
                  <th colSpan={3} className="px-3 py-1.5 text-center bg-amber-50/70 border-r border-slate-200">
                    BUỔI CHIỀU (11:00 - 16:59)
                  </th>
                  <th colSpan={3} className="px-3 py-1.5 text-center bg-indigo-50/70 border-r border-slate-200">
                    BUỔI TỐI (17:00 - 23:59)
                  </th>
                  <th colSpan={3} className="px-3 py-1.5 text-center bg-purple-50/70 border-r border-slate-200">
                    BUỔI KHUYA (00:00 - 06:59)
                  </th>
                  <th rowSpan={2} className="px-3 py-2 text-center bg-red-50/50">Mức Tối Thiểu</th>
                </tr>
                <tr className="border-t border-slate-200 text-[9px]">
                  <th className="px-1.5 py-1 text-center bg-blue-50/40">Thường</th>
                  <th className="px-1.5 py-1 text-center bg-blue-50/40">T7/CN</th>
                  <th className="px-1.5 py-1 text-center bg-blue-50/40 border-r border-slate-200">Lễ</th>

                  <th className="px-1.5 py-1 text-center bg-amber-50/40">Thường</th>
                  <th className="px-1.5 py-1 text-center bg-amber-50/40">T7/CN</th>
                  <th className="px-1.5 py-1 text-center bg-amber-50/40 border-r border-slate-200">Lễ</th>

                  <th className="px-1.5 py-1 text-center bg-indigo-50/40">Thường</th>
                  <th className="px-1.5 py-1 text-center bg-indigo-50/40">T7/CN</th>
                  <th className="px-1.5 py-1 text-center bg-indigo-50/40 border-r border-slate-200">Lễ</th>

                  <th className="px-1.5 py-1 text-center bg-purple-50/40">Thường</th>
                  <th className="px-1.5 py-1 text-center bg-purple-50/40">T7/CN</th>
                  <th className="px-1.5 py-1 text-center bg-purple-50/40 border-r border-slate-200">Lễ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {matrix.map((row, idx) => (
                  <tr key={row.categoryId} className="hover:bg-slate-50/60">
                    <td className="px-3 py-2 font-bold text-slate-900 border-r border-slate-200 bg-slate-50/30">
                      {row.categoryName}
                    </td>

                    {/* SÁNG */}
                    <td className="p-1">
                      <input
                        type="number"
                        step="5000"
                        value={row.morningNormal}
                        onChange={(e) => handleMatrixChange(idx, 'morningNormal', Number(e.target.value) || 0)}
                        className="w-16 rounded border border-slate-200 p-1 text-center font-mono text-[11px] focus:outline-hidden"
                      />
                    </td>
                    <td className="p-1">
                      <input
                        type="number"
                        step="5000"
                        value={row.morningWeekend}
                        onChange={(e) => handleMatrixChange(idx, 'morningWeekend', Number(e.target.value) || 0)}
                        className="w-16 rounded border border-slate-200 p-1 text-center font-mono text-[11px] focus:outline-hidden"
                      />
                    </td>
                    <td className="p-1 border-r border-slate-200">
                      <input
                        type="number"
                        step="5000"
                        value={row.morningHoliday}
                        onChange={(e) => handleMatrixChange(idx, 'morningHoliday', Number(e.target.value) || 0)}
                        className="w-16 rounded border border-slate-200 p-1 text-center font-mono text-[11px] focus:outline-hidden"
                      />
                    </td>

                    {/* CHIỀU */}
                    <td className="p-1">
                      <input
                        type="number"
                        step="5000"
                        value={row.afternoonNormal}
                        onChange={(e) => handleMatrixChange(idx, 'afternoonNormal', Number(e.target.value) || 0)}
                        className="w-16 rounded border border-slate-200 p-1 text-center font-mono text-[11px] focus:outline-hidden"
                      />
                    </td>
                    <td className="p-1">
                      <input
                        type="number"
                        step="5000"
                        value={row.afternoonWeekend}
                        onChange={(e) => handleMatrixChange(idx, 'afternoonWeekend', Number(e.target.value) || 0)}
                        className="w-16 rounded border border-slate-200 p-1 text-center font-mono text-[11px] focus:outline-hidden"
                      />
                    </td>
                    <td className="p-1 border-r border-slate-200">
                      <input
                        type="number"
                        step="5000"
                        value={row.afternoonHoliday}
                        onChange={(e) => handleMatrixChange(idx, 'afternoonHoliday', Number(e.target.value) || 0)}
                        className="w-16 rounded border border-slate-200 p-1 text-center font-mono text-[11px] focus:outline-hidden"
                      />
                    </td>

                    {/* TỐI */}
                    <td className="p-1">
                      <input
                        type="number"
                        step="5000"
                        value={row.eveningNormal}
                        onChange={(e) => handleMatrixChange(idx, 'eveningNormal', Number(e.target.value) || 0)}
                        className="w-16 rounded border border-slate-200 p-1 text-center font-mono text-[11px] focus:outline-hidden"
                      />
                    </td>
                    <td className="p-1">
                      <input
                        type="number"
                        step="5000"
                        value={row.eveningWeekend}
                        onChange={(e) => handleMatrixChange(idx, 'eveningWeekend', Number(e.target.value) || 0)}
                        className="w-16 rounded border border-slate-200 p-1 text-center font-mono text-[11px] focus:outline-hidden"
                      />
                    </td>
                    <td className="p-1 border-r border-slate-200">
                      <input
                        type="number"
                        step="5000"
                        value={row.eveningHoliday}
                        onChange={(e) => handleMatrixChange(idx, 'eveningHoliday', Number(e.target.value) || 0)}
                        className="w-16 rounded border border-slate-200 p-1 text-center font-mono text-[11px] focus:outline-hidden"
                      />
                    </td>

                    {/* KHUYA */}
                    <td className="p-1">
                      <input
                        type="number"
                        step="5000"
                        value={row.lateNightNormal}
                        onChange={(e) => handleMatrixChange(idx, 'lateNightNormal', Number(e.target.value) || 0)}
                        className="w-16 rounded border border-slate-200 p-1 text-center font-mono text-[11px] focus:outline-hidden"
                      />
                    </td>
                    <td className="p-1">
                      <input
                        type="number"
                        step="5000"
                        value={row.lateNightWeekend}
                        onChange={(e) => handleMatrixChange(idx, 'lateNightWeekend', Number(e.target.value) || 0)}
                        className="w-16 rounded border border-slate-200 p-1 text-center font-mono text-[11px] focus:outline-hidden"
                      />
                    </td>
                    <td className="p-1 border-r border-slate-200">
                      <input
                        type="number"
                        step="5000"
                        value={row.lateNightHoliday}
                        onChange={(e) => handleMatrixChange(idx, 'lateNightHoliday', Number(e.target.value) || 0)}
                        className="w-16 rounded border border-slate-200 p-1 text-center font-mono text-[11px] focus:outline-hidden"
                      />
                    </td>

                    {/* MỨC TỐI THIỂU */}
                    <td className="p-1 text-center bg-red-50/30">
                      <input
                        type="number"
                        step="10000"
                        value={row.minimumCharge}
                        onChange={(e) => handleMatrixChange(idx, 'minimumCharge', Number(e.target.value) || 0)}
                        className="w-20 rounded border border-red-200 p-1 text-center font-mono text-[11px] font-bold text-red-700 focus:outline-hidden"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* LỊCH NGÀY LỄ ÁP DỤNG ĐƠN GIÁ LỄ */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-blue-600" />
              <span>Danh Sách Ngày Lễ Được Cấu Hình (Áp đơn giá Ngày Lễ)</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              Ưu tiên tính giá: Ngày Lễ &gt; Cuối tuần &gt; Ngày thường.
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="date"
              value={newHoliday}
              onChange={(e) => setNewHoliday(e.target.value)}
              className="rounded-xl border border-slate-300 p-1.5 text-xs text-slate-800 focus:outline-hidden"
            />
            <button
              onClick={handleAddHoliday}
              disabled={!newHoliday}
              className="flex items-center gap-1 rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-blue-700 disabled:opacity-40"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Thêm ngày lễ</span>
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {config.holidays.map((dateStr) => (
            <span
              key={dateStr}
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-50 px-2.5 py-1 text-xs font-mono font-bold text-blue-800 border border-blue-200"
            >
              <span>{dateStr}</span>
              <button
                onClick={() => handleRemoveHoliday(dateStr)}
                className="text-blue-400 hover:text-red-600"
                title="Xóa ngày này"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      </div>

      {/* Pin Dialog xác thực bảo mật */}
      <PinDialog
        isOpen={showPinDialog}
        title="Xác thực Thay Đổi Bảng Giá"
        description="Thay đổi bảng giá ảnh hưởng trực tiếp đến doanh thu phòng và yêu cầu mật khẩu quản trị (Mặc định: 9999)."
        onSuccess={() => {
          setIsAuthorized(true);
          setShowPinDialog(false);
          handleSaveConfig();
        }}
        onCancel={() => setShowPinDialog(false)}
      />
    </div>
  );
};
