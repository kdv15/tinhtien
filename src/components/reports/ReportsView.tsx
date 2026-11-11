import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Calendar,
  DollarSign,
  TrendingUp,
  Receipt,
  Users2,
  UtensilsCrossed,
  Clock,
  Download,
} from 'lucide-react';
import { Invoice } from '../../types';
import { getAllInvoices, subscribeToStore } from '../../db/storage';
import { formatMoney } from '../../core/pricingEngine';

export const ReportsView: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [filterPeriod, setFilterPeriod] = useState<'TODAY' | 'WEEK' | 'MONTH' | 'ALL'>('ALL');

  useEffect(() => {
    const reload = () => {
      setInvoices(getAllInvoices());
    };
    reload();
    const unsubscribe = subscribeToStore(reload);
    return () => unsubscribe();
  }, []);

  // Lọc theo thời gian
  const filteredInvoices = invoices.filter((inv) => {
    if (filterPeriod === 'ALL') return true;
    const invDate = new Date(inv.checkOutTime);
    const now = new Date();

    if (filterPeriod === 'TODAY') {
      return invDate.toDateString() === now.toDateString();
    }
    if (filterPeriod === 'WEEK') {
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return invDate >= oneWeekAgo;
    }
    if (filterPeriod === 'MONTH') {
      return (
        invDate.getMonth() === now.getMonth() && invDate.getFullYear() === now.getFullYear()
      );
    }
    return true;
  });

  // Tổng hợp số liệu
  const totalRevenue = filteredInvoices.reduce((sum, i) => sum + i.final_amount, 0);
  const totalRoomCharge = filteredInvoices.reduce((sum, i) => sum + i.payable_amount, 0);
  const totalOrders = filteredInvoices.reduce((sum, i) => sum + i.orderTotal, 0);
  const totalStaffService = filteredInvoices.reduce((sum, i) => sum + i.staffServiceTotal, 0);
  const totalDiscount = filteredInvoices.reduce((sum, i) => sum + i.discountAmount, 0);

  // Danh sách các lượt phục vụ nhân viên chi tiết từ các hóa đơn (Module 18)
  const allStaffTickets = filteredInvoices.flatMap((inv) =>
    (inv.staffServiceTickets || []).map((t) => ({
      ...t,
      invoiceNumber: inv.invoiceNumber,
      roomName: inv.roomName,
      date: inv.checkOutTime,
    }))
  );

  return (
    <div className="space-y-4">
      {/* Header & Bộ Lọc Thời Gian */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-blue-600" />
            <span>Báo Cáo Doanh Thu &amp; Thống Kê</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Thống kê doanh thu tiền phòng, đồ uống và tiền giờ phục vụ phòng Karaoke.
          </p>
        </div>

        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
          {[
            { id: 'TODAY', label: 'Hôm nay' },
            { id: 'WEEK', label: '7 ngày qua' },
            { id: 'MONTH', label: 'Tháng này' },
            { id: 'ALL', label: 'Tất cả' },
          ].map((p) => (
            <button
              key={p.id}
              onClick={() => setFilterPeriod(p.id as any)}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                filterPeriod === p.id
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Thống Kê Tổng Hợp */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-2xl border border-blue-200 bg-blue-50/40 p-4 shadow-xs">
          <div className="text-xs font-semibold text-blue-800 flex items-center gap-1">
            <DollarSign className="h-4 w-4" />
            Tổng doanh thu thực tế
          </div>
          <div className="text-2xl font-black text-blue-900 mt-1">
            {formatMoney(totalRevenue)}
          </div>
          <div className="text-[11px] text-blue-600 mt-1">
            {filteredInvoices.length} lượt hóa đơn
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="text-xs font-semibold text-slate-600 flex items-center gap-1">
            <TrendingUp className="h-4 w-4 text-emerald-600" />
            Doanh thu tiền giờ phòng
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1">
            {formatMoney(totalRoomCharge)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Đã làm tròn theo quy tắc REV3.2</div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="text-xs font-semibold text-slate-600 flex items-center gap-1">
            <UtensilsCrossed className="h-4 w-4 text-amber-600" />
            Đồ uống &amp; Thực phẩm
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1">
            {formatMoney(totalOrders)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Bia, snack, trái cây, khăn</div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="text-xs font-semibold text-slate-600 flex items-center gap-1">
            <Users2 className="h-4 w-4 text-purple-600" />
            Phục vụ phòng (M18)
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1">
            {formatMoney(totalStaffService)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">{allStaffTickets.length} lượt phục vụ</div>
        </div>
      </div>

      {/* Bảng Chi Tiết Báo Cáo Phục Vụ Nhân Viên (Module 18 - Mục 11.8 Spec) */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs">
        <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
          <div>
            <div className="font-bold text-xs text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Users2 className="h-4 w-4 text-blue-600" />
              <span>Báo Cáo Chi Tiết Giờ Phục Vụ Phòng (Mỗi lượt 1 dòng theo Mục 11.8)</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              Liệt kê từng lượt độc lập, không gộp theo tên, bảo toàn dữ liệu đối soát.
            </div>
          </div>
          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-700">
            {allStaffTickets.length} lượt
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-[11px] font-bold text-slate-600 uppercase border-b border-slate-200">
              <tr>
                <th className="px-4 py-2.5">Thời gian</th>
                <th className="px-4 py-2.5">Hóa đơn</th>
                <th className="px-4 py-2.5">Phòng</th>
                <th className="px-4 py-2.5">Tên nút</th>
                <th className="px-4 py-2.5">Quản lý</th>
                <th className="px-4 py-2.5 text-center">Thời lượng</th>
                <th className="px-4 py-2.5 text-right">Tiền phục vụ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {allStaffTickets.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-400 italic">
                    Chưa có lượt phục vụ nào được ghi nhận trong khoảng thời gian này.
                  </td>
                </tr>
              ) : (
                allStaffTickets.map((t, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/80">
                    <td className="px-4 py-2.5 text-slate-600">
                      {new Date(t.date).toLocaleDateString('vi-VN')} {new Date(t.date).toLocaleTimeString('vi-VN')}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-blue-700 font-semibold">
                      {t.invoiceNumber}
                    </td>
                    <td className="px-4 py-2.5 font-bold text-slate-900">{t.roomName}</td>
                    <td className="px-4 py-2.5 font-bold text-purple-700">{t.displayName}</td>
                    <td className="px-4 py-2.5 text-slate-600">{t.managerName || '—'}</td>
                    <td className="px-4 py-2.5 text-center font-bold">{t.durationMinutes} phút</td>
                    <td className="px-4 py-2.5 text-right font-extrabold text-blue-700">
                      {formatMoney(t.amount)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
