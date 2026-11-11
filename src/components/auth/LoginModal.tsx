import React, { useState } from 'react';
import { UserCheck, X, ShieldCheck, Lock, User as UserIcon } from 'lucide-react';
import { User } from '../../types';
import { getAllUsers, getCurrentUser, setCurrentUser } from '../../db/storage';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose }) => {
  const [users] = useState<User[]>(getAllUsers());
  const [currentUser, setCurrentUserState] = useState<User>(getCurrentUser());
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [pin, setPin] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

  if (!isOpen) return null;

  const handleSelectUser = (u: User) => {
    setSelectedUser(u);
    setPin('');
    setErrorMsg('');
  };

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    if (selectedUser.pinCode && pin !== selectedUser.pinCode) {
      setErrorMsg('Mã PIN không đúng. Vui lòng thử lại!');
      return;
    }

    setCurrentUser(selectedUser);
    setCurrentUserState(selectedUser);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl border border-slate-200 animate-in zoom-in-95">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2 font-bold text-slate-900">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
              <UserCheck className="h-5 w-5" />
            </div>
            <span>Chuyển Đổi Tài Khoản Thu Ngân / Ca</span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="h-4 w-4" />
          </button>
        </div>

        {!selectedUser ? (
          <div className="mt-4 space-y-2">
            <p className="text-xs text-slate-500 mb-2">
              Chọn nhân viên ca làm việc đang trực tại quầy POS:
            </p>
            {users.map((u) => {
              const isCurrent = u.id === currentUser.id;
              return (
                <button
                  key={u.id}
                  onClick={() => handleSelectUser(u)}
                  className={`flex w-full items-center justify-between rounded-xl border p-3 transition-all ${
                    isCurrent
                      ? 'border-blue-600 bg-blue-50/50 shadow-xs'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700 font-bold text-sm">
                      {u.fullName.charAt(0)}
                    </div>
                    <div className="text-left">
                      <div className="font-bold text-xs text-slate-900">{u.fullName}</div>
                      <div className="text-[11px] text-slate-500 capitalize flex items-center gap-1">
                        {u.role === 'owner' ? (
                          <ShieldCheck className="h-3 w-3 text-amber-500" />
                        ) : (
                          <UserIcon className="h-3 w-3 text-blue-500" />
                        )}
                        {u.role}
                      </div>
                    </div>
                  </div>
                  {isCurrent && (
                    <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-[10px] font-bold text-blue-800">
                      Đang dùng
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ) : (
          <form onSubmit={handlePinSubmit} className="mt-4 space-y-3">
            <div className="rounded-xl bg-slate-50 p-3 flex items-center justify-between border border-slate-200">
              <div>
                <div className="text-xs text-slate-500">Đăng nhập tài khoản:</div>
                <div className="font-bold text-sm text-slate-900">{selectedUser.fullName}</div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedUser(null)}
                className="text-xs text-blue-600 font-bold hover:underline"
              >
                Đổi người khác
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nhập mã PIN cá nhân:
              </label>
              <input
                type="password"
                maxLength={6}
                autoFocus
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value);
                  setErrorMsg('');
                }}
                placeholder="Nhập mã PIN (Gợi ý: admin 1234, cashier 0000)..."
                className="w-full rounded-xl border border-slate-300 p-2.5 text-center font-mono text-lg tracking-widest text-slate-900 focus:outline-hidden"
              />
            </div>

            {errorMsg && (
              <div className="text-xs text-red-600 font-medium text-center">{errorMsg}</div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedUser(null)}
                className="flex-1 rounded-xl border border-slate-300 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Quay lại
              </button>
              <button
                type="submit"
                className="flex-1 rounded-xl bg-blue-600 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-blue-700"
              >
                Vào ca
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
