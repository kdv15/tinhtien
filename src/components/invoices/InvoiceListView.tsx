import React, { useState, useEffect } from 'react';
import {
  Receipt,
  Search,
  Printer,
  RotateCcw,
  Calendar,
  CheckCircle,
  Clock,
  Filter,
  Eye,
  AlertCircle,
} from 'lucide-react';
import { Invoice } from '../../types';
import { getAllInvoices, reopenInvoice, subscribeToStore } from '../../db/storage';
import { ReceiptModal } from '../common/ReceiptModal';
import { PinDialog } from '../common/PinDialog';
import { formatMoney } from '../../core/pricingEngine';

export const InvoiceListView: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [invoiceToReopen, setInvoiceToReopen] = useState<Invoice | null>(null);
  const [reopenReason, setReopenReason] = useState<string>('');
  const [showPinDialog, setShowPinDialog] = useState<boolean>(false);
  const [showReopenModal, setShowReopenModal] = useState<boolean>(false);

  useEffect(() => {
    const reload = () => {
      setInvoices(getAllInvoices());
    };
    reload();
    const unsubscribe = subscribeToStore(reload);
    return () => unsubscribe();
  }, []);

  const filteredInvoices = invoices.filter((inv) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      inv.invoiceNumber.toLowerCase().includes(q) ||
      inv.roomName.toLowerCase().includes(q) ||
      inv.roomCode.toLowerCase().includes(q) ||
      (inv.customerName && inv.customerName.toLowerCase().includes(q))
    );
  });

  const handleStartReopen = (inv: Invoice) => {
    setInvoiceToReopen(inv);
    setShowPinDialog(true);
  };

  const handlePinSuccess = () => {
    setShowPinDialog(false);
    setShowReopenModal(true);
  };

  const handleConfirmReopen = () => {
    if (!invoiceToReopen) return;
    reopenInvoice(invoiceToReopen.id, reopenReason);
    setShowReopenModal(false);
    setInvoiceToReopen(null);
  };

  return (
    <div className="space-y-4">
      {/* Tiêu đề & Công cụ tìm kiếm */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Receipt className="h-5 w-5 text-blue-600" />
            <span>Hóa Đơn & Lịch Sử Thanh Toán</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Dữ liệu tài chính bất biến, không xóa cứng, hỗ trợ mở lại phiếu với xác thực cấp 2.
          </p>
        </div>

        <div className="relative sm:w-64">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm số hóa đơn, phòng, khách..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-3 text-xs text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-hidden"
          />
        </div>
      </div>

      {/* Bảng Danh Sách Hóa Đơn */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-[11px] font-bold text-slate-600 uppercase border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Số hóa đơn</th>
                <th className="px-4 py-3">Phòng</th>
                <th className="px-4 py-3">Thời gian</th>
                <th className="px-4 py-3">Khách hàng</th>
                <th className="px-4 py-3 text-right">Tiền phòng</th>
                <th className="px-4 py-3 text-right">Tổng thanh toán</th>
                <th className="px-4 py-3 text-center">Hình thức</th>
                <th className="px-4 py-3 text-center">Thu ngân</th>
                <th className="px-4 py-3 text-center">Tác vụ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-slate-400 italic">
                    Chưa có hóa đơn nào phát sinh trong hệ thống.
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-blue-700">
                      {inv.invoiceNumber}
                      {inv.isReopened && (
                        <span className="block text-[9px] text-amber-700 font-sans font-semibold">
                          (Đã mở lại)
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      {inv.roomName} ({inv.roomCode})
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      <div>{new Date(inv.checkOutTime).toLocaleTimeString('vi-VN')}</div>
                      <div className="text-[10px] text-slate-400">
                        {new Date(inv.checkOutTime).toLocaleDateString('vi-VN')} ({inv.totalDurationFormatted})
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {inv.customerName || <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right font-medium">
                      {formatMoney(inv.payable_amount)}
                    </td>
                    <td className="px-4 py-3 text-right font-black text-blue-700 text-sm">
                      {formatMoney(inv.final_amount)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          inv.paymentMethod === 'BANK_TRANSFER'
                            ? 'bg-blue-100 text-blue-800'
                            : inv.paymentMethod === 'DEBT'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {inv.paymentMethod === 'BANK_TRANSFER'
                          ? 'VietQR'
                          : inv.paymentMethod === 'DEBT'
                          ? 'Ghi nợ'
                          : 'Tiền mặt'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-slate-600 text-[11px]">
                      {inv.cashierName}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => setSelectedInvoice(inv)}
                          className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                          title="In lại hóa đơn"
                        >
                          <Printer className="h-3.5 w-3.5 text-blue-600" />
                          <span>In lại</span>
                        </button>

                        <button
                          onClick={() => handleStartReopen(inv)}
                          className="flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-amber-50 hover:text-amber-700"
                          title="Mở lại hóa đơn (Yêu cầu mật khẩu cấp 2)"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
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

      {/* Modal In Lại Hóa Đơn */}
      <ReceiptModal
        invoice={selectedInvoice}
        isOpen={Boolean(selectedInvoice)}
        onClose={() => setSelectedInvoice(null)}
      />

      {/* Xác thực Mật khẩu cấp 2 */}
      <PinDialog
        isOpen={showPinDialog}
        title="Xác thực Mở Lại Hóa Đơn"
        description="Thao tác mở lại hóa đơn đã thanh toán yêu cầu mật khẩu quản trị bảo mật (Mặc định: 9999)."
        onSuccess={handlePinSuccess}
        onCancel={() => {
          setShowPinDialog(false);
          setInvoiceToReopen(null);
        }}
      />

      {/* Modal Nhập Lý Do Mở Lại Hóa Đơn */}
      {showReopenModal && invoiceToReopen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl border border-slate-200 animate-in zoom-in-95">
            <h3 className="text-sm font-bold text-slate-900">
              Mở lại hóa đơn {invoiceToReopen.invoiceNumber}
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Hệ thống sẽ tự động ghi nhật ký Audit Log: người thực hiện, thời điểm và lý do.
            </p>

            <div className="mt-3">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Lý do mở lại (tùy chọn - có thể để trống):
              </label>
              <input
                type="text"
                value={reopenReason}
                onChange={(e) => setReopenReason(e.target.value)}
                className="w-full rounded-xl border border-slate-300 p-2 text-xs text-slate-800 focus:outline-hidden"
                placeholder="Nhập lý do nếu có (không bắt buộc)..."
              />
            </div>

            <div className="mt-4 flex gap-2">
              <button
                onClick={() => {
                  setShowReopenModal(false);
                  setInvoiceToReopen(null);
                }}
                className="flex-1 rounded-xl border border-slate-300 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Hủy
              </button>
              <button
                onClick={handleConfirmReopen}
                className="flex-1 rounded-xl bg-amber-600 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-amber-700"
              >
                Xác nhận mở lại
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
