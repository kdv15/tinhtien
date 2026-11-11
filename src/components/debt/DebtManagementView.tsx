import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Search,
  Plus,
  ArrowDownLeft,
  Calendar,
  History,
  X,
  CheckCircle,
  Banknote,
  QrCode,
  DollarSign,
} from 'lucide-react';
import { CustomerDebt, DebtPaymentRecord } from '../../types';
import { getAllDebts, payCustomerDebt, recordCustomerDebt, subscribeToStore } from '../../db/storage';
import { formatMoney } from '../../core/pricingEngine';

export const DebtManagementView: React.FC = () => {
  const [debts, setDebts] = useState<CustomerDebt[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedDebtForPayment, setSelectedDebtForPayment] = useState<CustomerDebt | null>(null);
  const [selectedDebtForHistory, setSelectedDebtForHistory] = useState<CustomerDebt | null>(null);

  // Form thanh toán nợ
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payMethod, setPayMethod] = useState<'CASH' | 'BANK_TRANSFER'>('CASH');
  const [payNote, setPayNote] = useState<string>('');

  useEffect(() => {
    const reload = () => {
      setDebts(getAllDebts());
    };
    reload();
    const unsubscribe = subscribeToStore(reload);
    return () => unsubscribe();
  }, []);

  const totalOutstanding = debts.reduce((sum, d) => sum + d.balance, 0);

  const filteredDebts = debts.filter((d) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return d.customerName.toLowerCase().includes(q) || d.phone.includes(q);
  });

  const handleOpenPayment = (debt: CustomerDebt) => {
    setSelectedDebtForPayment(debt);
    setPayAmount(debt.balance);
    setPayNote('Khách trả nợ');
  };

  const handleConfirmPayment = () => {
    if (!selectedDebtForPayment || payAmount <= 0) return;
    payCustomerDebt(selectedDebtForPayment.id, payAmount, payMethod, payNote);
    setSelectedDebtForPayment(null);
  };

  return (
    <div className="space-y-4">
      {/* Header & KPI Sổ Nợ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="md:col-span-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-amber-600" />
              <span>Sổ Nợ Khách Hàng</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Theo dõi công nợ, lịch sử trả từng lần, độc lập với doanh số tiền mặt/chuyển khoản.
            </p>
          </div>

          <div className="relative w-full sm:w-60">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm tên, số điện thoại..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-3 text-xs text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-hidden"
            />
          </div>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50/40 p-4 shadow-xs flex flex-col justify-between">
          <div className="text-xs font-semibold text-amber-800">Tổng công nợ còn phải thu</div>
          <div className="text-2xl font-black text-amber-900 mt-1">
            {formatMoney(totalOutstanding)}
          </div>
        </div>
      </div>

      {/* Bảng Danh Sách Công Nợ */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-[11px] font-bold text-slate-600 uppercase border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Khách hàng</th>
                <th className="px-4 py-3">Số điện thoại</th>
                <th className="px-4 py-3">Địa chỉ</th>
                <th className="px-4 py-3 text-right">Tổng nợ gốc</th>
                <th className="px-4 py-3 text-right">Đã trả</th>
                <th className="px-4 py-3 text-right">Còn nợ</th>
                <th className="px-4 py-3 text-center">Hóa đơn</th>
                <th className="px-4 py-3 text-center">Tác vụ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {filteredDebts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-400 italic">
                    Không có khách hàng nào ghi nợ trong danh sách.
                  </td>
                </tr>
              ) : (
                filteredDebts.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3 font-bold text-slate-900">{d.customerName}</td>
                    <td className="px-4 py-3 font-mono text-slate-600">{d.phone || '—'}</td>
                    <td className="px-4 py-3 text-slate-500">{d.address || '—'}</td>
                    <td className="px-4 py-3 text-right font-medium text-slate-600">
                      {formatMoney(d.totalDebt)}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-emerald-600">
                      {formatMoney(d.totalPaid)}
                    </td>
                    <td className="px-4 py-3 text-right font-extrabold text-amber-700 text-sm">
                      {formatMoney(d.balance)}
                    </td>
                    <td className="px-4 py-3 text-center text-slate-500">
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px]">
                        {d.invoiceIds.join(', ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          disabled={d.balance <= 0}
                          onClick={() => handleOpenPayment(d)}
                          className="flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-bold text-white shadow-2xs hover:bg-emerald-700 disabled:opacity-40"
                        >
                          <ArrowDownLeft className="h-3.5 w-3.5" />
                          <span>Thu nợ</span>
                        </button>

                        <button
                          onClick={() => setSelectedDebtForHistory(d)}
                          className="flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                          title="Xem lịch sử trả nợ"
                        >
                          <History className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Thu Tiền Trả Nợ */}
      {selectedDebtForPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl border border-slate-200 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="text-sm font-bold text-slate-900">
                Thu Tiền Nợ: {selectedDebtForPayment.customerName}
              </span>
              <button
                onClick={() => setSelectedDebtForPayment(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <div className="rounded-xl bg-amber-50 p-3 text-xs text-amber-900 border border-amber-200">
                Tổng số tiền nợ hiện tại:{' '}
                <strong>{formatMoney(selectedDebtForPayment.balance)}</strong>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Số tiền khách trả đợt này (VNĐ):
                </label>
                <input
                  type="number"
                  step="10000"
                  max={selectedDebtForPayment.balance}
                  value={payAmount}
                  onChange={(e) => setPayAmount(Number(e.target.value) || 0)}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-sm font-bold text-blue-700 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Hình thức thanh toán:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPayMethod('CASH')}
                    className={`flex items-center justify-center gap-1.5 p-2 rounded-xl border text-xs font-bold ${
                      payMethod === 'CASH'
                        ? 'border-blue-600 bg-blue-50 text-blue-700'
                        : 'border-slate-200 text-slate-700'
                    }`}
                  >
                    <Banknote className="h-4 w-4" />
                    <span>Tiền mặt</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPayMethod('BANK_TRANSFER')}
                    className={`flex items-center justify-center gap-1.5 p-2 rounded-xl border text-xs font-bold ${
                      payMethod === 'BANK_TRANSFER'
                        ? 'border-blue-600 bg-blue-50 text-blue-700'
                        : 'border-slate-200 text-slate-700'
                    }`}
                  >
                    <QrCode className="h-4 w-4" />
                    <span>Chuyển khoản</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Ghi chú:</label>
                <input
                  type="text"
                  value={payNote}
                  onChange={(e) => setPayNote(e.target.value)}
                  placeholder="Ghi chú đợt trả..."
                  className="w-full rounded-xl border border-slate-300 p-2 text-xs text-slate-800 focus:outline-hidden"
                />
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <button
                onClick={() => setSelectedDebtForPayment(null)}
                className="flex-1 rounded-xl border border-slate-300 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Hủy
              </button>
              <button
                onClick={handleConfirmPayment}
                disabled={payAmount <= 0}
                className="flex-1 rounded-xl bg-emerald-600 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 disabled:opacity-50"
              >
                Xác nhận thu nợ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Lịch Sử Trả Nợ */}
      {selectedDebtForHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl border border-slate-200 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="text-sm font-bold text-slate-900">
                Lịch Sử Trả Nợ: {selectedDebtForHistory.customerName}
              </span>
              <button
                onClick={() => setSelectedDebtForHistory(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 max-h-64 overflow-y-auto space-y-2">
              {selectedDebtForHistory.history.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400 italic">
                  Chưa có lịch sử thanh toán nợ nào được ghi nhận.
                </div>
              ) : (
                selectedDebtForHistory.history.map((record) => (
                  <div
                    key={record.id}
                    className="flex justify-between items-center rounded-xl bg-slate-50 p-2.5 border border-slate-100 text-xs"
                  >
                    <div>
                      <div className="font-bold text-slate-900">
                        {formatMoney(record.amount)} ({record.paymentMethod === 'CASH' ? 'Tiền mặt' : 'Chuyển khoản'})
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Thu ngân: {record.cashierName} • {record.note || 'Không ghi chú'}
                      </div>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {new Date(record.paymentDate).toLocaleDateString('vi-VN')}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 text-right">
              <button
                onClick={() => setSelectedDebtForHistory(null)}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
