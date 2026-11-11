import React, { useState } from 'react';
import {
  ReceiptText,
  X,
  CreditCard,
  Banknote,
  QrCode,
  BookOpen,
  CheckCircle,
  Percent,
  Plus,
  AlertCircle,
} from 'lucide-react';
import { Room, Session, OrderItem, ServiceSession, Invoice, PaymentMethod } from '../../types';
import {
  getSessionById,
  getOrderItemsBySession,
  getServiceSessionBySessionId,
  getStore,
  checkoutAndCreateInvoice,
} from '../../db/storage';
import { calculateSessionPricing, formatDuration, formatMoney } from '../../core/pricingEngine';
import { getVietQRImageUrl } from '../../core/vietQrGenerator';

interface CheckoutModalProps {
  room: Room | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (invoice: Invoice) => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  room,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [surchargeAmount, setSurchargeAmount] = useState<number>(0);
  const [surchargeReason, setSurchargeReason] = useState<string>('');
  const [customerName, setCustomerName] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [cashReceived, setCashReceived] = useState<number>(0);
  const [errorMsg, setErrorMsg] = useState<string>('');

  if (!isOpen || !room || !room.currentSessionId) return null;

  const session = getSessionById(room.currentSessionId);
  if (!session) return null;

  const store = getStore();
  const pricing = calculateSessionPricing(session, new Date());
  const orderItems = getOrderItemsBySession(session.id);
  const orderTotal = orderItems.reduce((acc, i) => acc + i.totalAmount, 0);

  const serviceSession = getServiceSessionBySessionId(session.id);
  const staffTickets = serviceSession?.tickets || [];
  const staffServiceTotal = staffTickets.reduce((acc, t) => acc + t.finalAmount, 0);

  // Tính giảm giá
  let effectiveDiscount = discountAmount;
  if (discountPercent > 0 && discountAmount === 0) {
    effectiveDiscount = Math.round(((pricing.payable_amount + orderTotal) * discountPercent) / 100);
  }

  // TỔNG CỘNG THANH TOÁN (FINAL AMOUNT)
  const finalAmount = Math.max(
    0,
    pricing.payable_amount + orderTotal + staffServiceTotal - effectiveDiscount + surchargeAmount
  );

  const vietQrUrl = getVietQRImageUrl(
    {
      bankId: store.bankName?.split(' ')[0] || 'MB',
      bankName: store.bankName || 'MBBank',
      accountNo: store.bankAccountNo || '0908123456888',
      accountName: store.bankAccountName || 'KARAOKE PARIS NIGHT',
    },
    finalAmount,
    `TT ${room.code}`
  );

  const handleCheckout = () => {
    if (paymentMethod === 'DEBT' && !customerName.trim()) {
      setErrorMsg('Vui lòng nhập tên khách hàng khi chọn hình thức Ghi Nợ!');
      return;
    }

    try {
      const invoice = checkoutAndCreateInvoice(session.id, {
        paymentMethod,
        discountPercent,
        discountAmount: effectiveDiscount,
        surchargeAmount,
        surchargeReason,
        customerName: customerName.trim() || session.customerName,
        customerPhone: customerPhone.trim() || session.customerPhone,
        notes,
        cashReceived: paymentMethod === 'CASH' ? cashReceived || finalAmount : undefined,
      });

      onSuccess(invoice);
      onClose();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Có lỗi khi xử lý thanh toán');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-2 sm:p-4 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[94vh] flex flex-col">
        {/* Header Modal */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-3.5 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-xs">
              <ReceiptText className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Thanh Toán Hóa Đơn - {room.name} ({room.code})
              </h2>
              <div className="text-xs text-slate-500">
                Thời gian hát: <strong>{formatDuration(pricing.totalBilledSeconds)}</strong> (Thực
                tế: {formatDuration(pricing.totalActualSeconds)})
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Nội dung thanh toán */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Tóm tắt chi phí các khoản */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-2.5">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-600">
                1. Tiền giờ hát ({pricing.calculatedSegments.length} phân đoạn):
              </span>
              <span className="font-bold text-slate-900">
                {formatMoney(pricing.payable_amount)}
              </span>
            </div>

            {orderTotal > 0 && (
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-600">
                  2. Đồ uống & Đồ ăn ({orderItems.length} món):
                </span>
                <span className="font-bold text-slate-900">{formatMoney(orderTotal)}</span>
              </div>
            )}

            {staffServiceTotal > 0 && (
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-600">
                  3. Tiền phục vụ nhân viên (Module 18 - {staffTickets.length} lượt):
                </span>
                <span className="font-bold text-slate-900">
                  {formatMoney(staffServiceTotal)}
                </span>
              </div>
            )}

            {/* Chiết khấu & Phụ phí */}
            <div className="border-t border-slate-200 pt-2.5 grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Giảm giá (%)
                </label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={discountPercent || ''}
                    onChange={(e) => {
                      setDiscountPercent(Number(e.target.value) || 0);
                      setDiscountAmount(0);
                    }}
                    placeholder="0%"
                    className="w-full rounded-lg border border-slate-300 p-1.5 text-xs text-slate-900 focus:outline-hidden"
                  />
                  <span className="text-xs text-slate-500">%</span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Phụ phí (VNĐ)
                </label>
                <input
                  type="number"
                  step="5000"
                  value={surchargeAmount || ''}
                  onChange={(e) => setSurchargeAmount(Number(e.target.value) || 0)}
                  placeholder="0 đ"
                  className="w-full rounded-lg border border-slate-300 p-1.5 text-xs text-slate-900 focus:outline-hidden"
                />
              </div>
            </div>

            {/* Tổng số tiền phải thu (Final Amount) */}
            <div className="border-t-2 border-slate-300 pt-3 flex justify-between items-baseline">
              <div>
                <div className="text-xs uppercase tracking-wider font-extrabold text-slate-700">
                  TỔNG CỘNG PHẢI THANH TOÁN:
                </div>
                {effectiveDiscount > 0 && (
                  <div className="text-[11px] text-emerald-600">
                    Đã giảm: -{formatMoney(effectiveDiscount)}
                  </div>
                )}
              </div>
              <div className="text-2xl font-black text-blue-700">
                {formatMoney(finalAmount)}
              </div>
            </div>
          </div>

          {/* Chọn Phương thức thanh toán */}
          <div>
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
              Hình thức thanh toán:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'CASH', label: 'Tiền mặt', icon: Banknote },
                { id: 'BANK_TRANSFER', label: 'Chuyển khoản VietQR', icon: QrCode },
                { id: 'DEBT', label: 'Ghi vào Sổ nợ', icon: BookOpen },
                { id: 'MULTI', label: 'Hỗn hợp', icon: CreditCard },
              ].map((m) => {
                const Icon = m.icon;
                const isSelected = paymentMethod === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      setPaymentMethod(m.id as PaymentMethod);
                      setErrorMsg('');
                    }}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-bold transition-all ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-xs'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <Icon className="h-5 w-5 mb-1 text-slate-600" />
                    <span>{m.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Hiển thị VietQR trực quan khi chọn Chuyển khoản */}
          {paymentMethod === 'BANK_TRANSFER' && (
            <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3.5 flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
              <div className="p-1.5 bg-white rounded-xl border border-slate-200 shrink-0">
                <img
                  src={vietQrUrl}
                  alt="Mã VietQR"
                  className="h-32 w-32 object-contain"
                  loading="lazy"
                />
              </div>
              <div className="text-xs space-y-1">
                <div className="font-bold text-slate-900 text-sm">
                  Quét mã VietQR để thanh toán {formatMoney(finalAmount)}
                </div>
                <div className="text-slate-600">Ngân hàng: <strong>{store.bankName}</strong></div>
                <div className="text-slate-600">Số tài khoản: <strong>{store.bankAccountNo}</strong></div>
                <div className="text-slate-600">Chủ tài khoản: <strong>{store.bankAccountName}</strong></div>
                <div className="text-[11px] text-blue-700 italic">Nội dung CK: TT {room.code}</div>
              </div>
            </div>
          )}

          {/* Thông tin khách hàng & Sổ nợ */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tên khách hàng {paymentMethod === 'DEBT' && <span className="text-red-500">*</span>}:
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => {
                  setCustomerName(e.target.value);
                  setErrorMsg('');
                }}
                placeholder="Nhập tên khách..."
                className="w-full rounded-xl border border-slate-300 p-2 text-xs text-slate-900 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Số điện thoại:
              </label>
              <input
                type="text"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="09xx..."
                className="w-full rounded-xl border border-slate-300 p-2 text-xs text-slate-900 focus:outline-hidden"
              />
            </div>
          </div>

          {errorMsg && (
            <div className="flex items-center gap-1.5 text-xs text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-200">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        {/* Footer Hành Động */}
        <div className="border-t border-slate-200 bg-slate-50 px-5 py-3.5 shrink-0 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
          >
            Quay lại
          </button>

          <button
            type="button"
            onClick={handleCheckout}
            className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 active:scale-98 transition-all"
          >
            <CheckCircle className="h-4 w-4" />
            <span>Xác nhận thanh toán & In hóa đơn</span>
          </button>
        </div>
      </div>
    </div>
  );
};
