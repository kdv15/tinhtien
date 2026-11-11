import React, { useState } from 'react';
import { ShieldCheck, Lock, X, AlertCircle } from 'lucide-react';
import { verifyLevel2Password } from '../../db/storage';

interface PinDialogProps {
  isOpen: boolean;
  title?: string;
  description?: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export const PinDialog: React.FC<PinDialogProps> = ({
  isOpen,
  title = 'Xác thực Mật khẩu Cấp 2',
  description = 'Thao tác này yêu cầu mật khẩu quản trị bảo mật (Mặc định: 9999).',
  onSuccess,
  onCancel,
}) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (verifyLevel2Password(password.trim())) {
      setError(false);
      setPassword('');
      onSuccess();
    } else {
      setError(true);
      setPassword('');
    }
  };

  const handleKeyPress = (num: string) => {
    if (password.length < 8) {
      setPassword((prev) => prev + num);
      setError(false);
    }
  };

  const handleBackspace = () => {
    setPassword((prev) => prev.slice(0, -1));
    setError(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
      <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2 text-slate-800 font-bold">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <span>{title}</span>
          </div>
          <button
            onClick={onCancel}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="mt-3 text-xs text-slate-500 leading-relaxed">
          {description}
        </p>

        <form onSubmit={handleSubmit} className="mt-4">
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="password"
              autoFocus
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError(false);
              }}
              placeholder="Nhập mã bảo vệ cấp 2..."
              className="w-full rounded-xl border border-slate-300 py-2.5 pl-9 pr-3 text-center text-lg font-mono tracking-widest text-slate-900 placeholder:text-xs placeholder:tracking-normal placeholder:font-sans focus:border-blue-500 focus:outline-hidden"
            />
          </div>

          {error && (
            <div className="mt-2 flex items-center gap-1.5 text-xs text-red-600">
              <AlertCircle className="h-3.5 w-3.5" />
              <span>Mật khẩu cấp 2 không chính xác. Vui lòng thử lại.</span>
            </div>
          )}

          {/* Bàn phím số nhanh cho POS cảm ứng / iPhone */}
          <div className="mt-4 grid grid-cols-3 gap-2">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
              <button
                key={digit}
                type="button"
                onClick={() => handleKeyPress(digit)}
                className="flex h-11 items-center justify-center rounded-xl bg-slate-50 text-base font-semibold text-slate-800 hover:bg-slate-100 active:bg-slate-200 transition-colors"
              >
                {digit}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setPassword('')}
              className="flex h-11 items-center justify-center rounded-xl bg-slate-100 text-xs font-semibold text-slate-600 hover:bg-slate-200"
            >
              Xóa hết
            </button>
            <button
              type="button"
              onClick={() => handleKeyPress('0')}
              className="flex h-11 items-center justify-center rounded-xl bg-slate-50 text-base font-semibold text-slate-800 hover:bg-slate-100"
            >
              0
            </button>
            <button
              type="button"
              onClick={handleBackspace}
              className="flex h-11 items-center justify-center rounded-xl bg-slate-100 text-xs font-semibold text-slate-600 hover:bg-slate-200"
            >
              ⌫ Xóa
            </button>
          </div>

          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 rounded-xl border border-slate-300 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={password.length === 0}
              className="flex-1 rounded-xl bg-blue-600 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 disabled:opacity-50"
            >
              Xác nhận
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
