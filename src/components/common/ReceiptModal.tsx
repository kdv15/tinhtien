import React from 'react';
import { Printer, X, QrCode, Download, CheckCircle2 } from 'lucide-react';
import { Invoice, Store } from '../../types';
import { getStore } from '../../db/storage';
import { formatMoney } from '../../core/pricingEngine';
import { getVietQRImageUrl } from '../../core/vietQrGenerator';

interface ReceiptModalProps {
  invoice: Invoice | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ invoice, isOpen, onClose }) => {
  if (!isOpen || !invoice) return null;

  const store: Store = getStore();

  const handlePrint = () => {
    window.print();
  };

  const vietQrUrl = getVietQRImageUrl(
    {
      bankId: store.bankName?.split(' ')[0] || 'MB',
      bankName: store.bankName || 'MBBank',
      accountNo: store.bankAccountNo || '0908123456888',
      accountName: store.bankAccountName || 'KARAOKE PARIS NIGHT',
    },
    invoice.final_amount,
    `TT ${invoice.invoiceNumber} ${invoice.roomCode}`
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-3 sm:p-4 backdrop-blur-xs overflow-y-auto print:p-0 print:bg-white print:fixed print:inset-0">
      {/* Container phiếu in */}
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden my-auto print:shadow-none print:border-none print:w-full print:max-w-none">
        {/* Nút tác vụ (ẩn khi in) */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-3 print:hidden">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
            <Printer className="h-4 w-4 text-blue-600" />
            <span>Xem trước phiếu in ({invoice.invoiceNumber})</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition-colors"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>In hóa đơn (XP-58)</span>
            </button>
            <button
              onClick={onClose}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-200"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Khung Hóa đơn chuẩn 58mm/80mm */}
        <div
          id="printable-receipt"
          className="p-5 font-mono text-xs text-slate-900 leading-relaxed max-h-[80vh] overflow-y-auto print:max-h-none print:overflow-visible print:p-2"
        >
          {/* Header quán */}
          <div className="text-center pb-3 border-b border-dashed border-slate-300">
            <h2 className="text-base font-bold tracking-tight uppercase">{store.name}</h2>
            {store.address && <p className="text-[11px] text-slate-600 mt-0.5">{store.address}</p>}
            {store.phone && <p className="text-[11px] text-slate-600">Hotline: {store.phone}</p>}
            {store.headerGreeting && (
              <p className="text-[10px] italic text-slate-500 mt-1">{store.headerGreeting}</p>
            )}
            <div className="mt-2 text-sm font-bold tracking-widest uppercase">
              HÓA ĐƠN THANH TOÁN
            </div>
            <div className="text-[11px] text-slate-500">Số: {invoice.invoiceNumber}</div>
          </div>

          {/* Thông tin phòng & thời gian */}
          <div className="py-2.5 border-b border-dashed border-slate-300 space-y-1 text-[11px]">
            <div className="flex justify-between font-bold text-slate-800 text-xs">
              <span>Phòng: {invoice.roomName}</span>
              <span>Thời gian: {invoice.totalDurationFormatted}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Giờ vào: {new Date(invoice.checkInTime).toLocaleTimeString('vi-VN')}</span>
              <span>Giờ ra: {new Date(invoice.checkOutTime).toLocaleTimeString('vi-VN')}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Ngày: {new Date(invoice.checkInTime).toLocaleDateString('vi-VN')}</span>
              <span>Thu ngân: {invoice.cashierName}</span>
            </div>
            {invoice.customerName && (
              <div className="text-slate-700">Khách hàng: {invoice.customerName}</div>
            )}
          </div>

          {/* Chi tiết phân đoạn tiền phòng (Option A) */}
          <div className="py-2.5 border-b border-dashed border-slate-300">
            <div className="font-bold text-[11px] text-slate-800 uppercase mb-1">
              1. TIỀN GIỜ HÁT
            </div>
            {invoice.segmentsBreakdown.map((seg, idx) => (
              <div key={idx} className="flex justify-between py-0.5 text-[11px]">
                <div>
                  <span className="font-medium">{seg.roomName}</span>{' '}
                  <span className="text-slate-500">({seg.durationMinutes}p)</span>
                </div>
                <div className="font-semibold">{formatMoney(seg.amount)}</div>
              </div>
            ))}
            <div className="flex justify-between text-[11px] font-bold text-slate-800 pt-1 mt-1 border-t border-dotted border-slate-200">
              <span>Cộng tiền giờ:</span>
              <span>{formatMoney(invoice.payable_amount)}</span>
            </div>
          </div>

          {/* Chi tiết Dịch vụ / Món ăn */}
          {invoice.orderItems && invoice.orderItems.length > 0 && (
            <div className="py-2.5 border-b border-dashed border-slate-300">
              <div className="font-bold text-[11px] text-slate-800 uppercase mb-1">
                2. DỊCH VỤ & ĐỒ UỐNG
              </div>
              <div className="space-y-1 text-[11px]">
                {invoice.orderItems.map((item, idx) => (
                  <div key={idx} className="flex justify-between py-0.5">
                    <div className="max-w-[65%] truncate">
                      <span>{item.name}</span>
                      <span className="text-slate-500 ml-1">
                        x{item.quantity} {item.unit}
                      </span>
                    </div>
                    <div className="font-semibold">{formatMoney(item.totalAmount)}</div>
                  </div>
                ))}
              </div>
              <div className="flex justify-between text-[11px] font-bold text-slate-800 pt-1 mt-1 border-t border-dotted border-slate-200">
                <span>Cộng đồ uống/món:</span>
                <span>{formatMoney(invoice.orderTotal)}</span>
              </div>
            </div>
          )}

          {/* Chi tiết Nhân viên phục vụ (Module 18) */}
          {invoice.staffServiceTickets && invoice.staffServiceTickets.length > 0 && (
            <div className="py-2.5 border-b border-dashed border-slate-300">
              <div className="font-bold text-[11px] text-slate-800 uppercase mb-1">
                3. TIỀN PHỤC VỤ PHÒNG
              </div>
              <div className="space-y-1 text-[11px]">
                {invoice.staffServiceTickets.map((t, idx) => (
                  <div key={idx} className="flex justify-between py-0.5">
                    <div>
                      <span className="font-semibold text-slate-800">{t.displayName}</span>
                      {t.managerName && (
                        <span className="text-slate-500 text-[10px]"> (QL: {t.managerName})</span>
                      )}
                      <span className="text-slate-500 text-[10px] ml-1">({t.durationMinutes}p)</span>
                    </div>
                    <div className="font-semibold">{formatMoney(t.amount)}</div>
                  </div>
                ))}
              </div>
              <div className="flex justify-between text-[11px] font-bold text-slate-800 pt-1 mt-1 border-t border-dotted border-slate-200">
                <span>Cộng tiền phục vụ:</span>
                <span>{formatMoney(invoice.staffServiceTotal)}</span>
              </div>
            </div>
          )}

          {/* Giảm giá & Phụ thu */}
          {(invoice.discountAmount > 0 || invoice.surchargeAmount > 0) && (
            <div className="py-2 border-b border-dashed border-slate-300 space-y-1 text-[11px]">
              {invoice.discountAmount > 0 && (
                <div className="flex justify-between text-emerald-700 font-semibold">
                  <span>Giảm giá ({invoice.discountPercent}%):</span>
                  <span>-{formatMoney(invoice.discountAmount)}</span>
                </div>
              )}
              {invoice.surchargeAmount > 0 && (
                <div className="flex justify-between text-slate-700">
                  <span>Phụ thu {invoice.surchargeReason ? `(${invoice.surchargeReason})` : ''}:</span>
                  <span>+{formatMoney(invoice.surchargeAmount)}</span>
                </div>
              )}
            </div>
          )}

          {/* TỔNG TIỀN THANH TOÁN (FINAL_AMOUNT) */}
          <div className="py-3 border-b-2 border-slate-900 text-slate-900">
            <div className="flex justify-between items-baseline text-base font-bold">
              <span>TỔNG CỘNG:</span>
              <span className="text-lg text-blue-700">{formatMoney(invoice.final_amount)}</span>
            </div>
            <div className="flex justify-between text-[11px] text-slate-600 mt-1">
              <span>Hình thức:</span>
              <span className="font-bold uppercase">
                {invoice.paymentMethod === 'CASH'
                  ? 'Tiền mặt'
                  : invoice.paymentMethod === 'BANK_TRANSFER'
                  ? 'Chuyển khoản VietQR'
                  : invoice.paymentMethod === 'DEBT'
                  ? 'Ghi vào Sổ nợ'
                  : 'Thanh toán hỗn hợp'}
              </span>
            </div>
          </div>

          {/* Mã QR thanh toán VietQR ngân hàng */}
          {store.bankAccountNo && invoice.final_amount > 0 && (
            <div className="py-3 border-b border-dashed border-slate-300 text-center">
              <div className="flex items-center justify-center gap-1.5 text-[11px] font-bold text-slate-800 mb-1">
                <QrCode className="h-3.5 w-3.5 text-blue-600" />
                <span>QUÉT MÃ VIETQR ĐỂ CHUYỂN KHOẢN</span>
              </div>
              <div className="flex justify-center p-1 bg-white inline-block rounded-xl border border-slate-200">
                <img
                  src={vietQrUrl}
                  alt="VietQR Code"
                  className="h-36 w-36 object-contain"
                  loading="lazy"
                />
              </div>
              <p className="text-[10px] text-slate-500 mt-1">
                {store.bankName} • STK: <strong>{store.bankAccountNo}</strong>
              </p>
              <p className="text-[10px] text-slate-500 uppercase">{store.bankAccountName}</p>
            </div>
          )}

          {/* Lời cảm ơn */}
          <div className="pt-3 text-center text-[10px] text-slate-500 italic">
            <p>{store.footerThankYou || 'Xin cảm ơn quý khách và hẹn gặp lại!'}</p>
            <p className="mt-0.5 text-[9px] text-slate-400">
              Phần mềm Karaoke Manager - V6.3 REV3.2
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
