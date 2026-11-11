import React, { useState, useEffect } from 'react';
import {
  Store as StoreIcon,
  Save,
  QrCode,
  Shield,
  FileText,
  Database,
  Download,
  Upload,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { Store, AuditLog } from '../../types';
import {
  getStore,
  updateStore,
  getAuditLogs,
  exportDatabaseBackup,
  restoreDatabaseBackup,
  resetDatabaseToDefault,
  subscribeToStore,
} from '../../db/storage';
import { POPULAR_VIETNAMESE_BANKS } from '../../core/vietQrGenerator';

export const SettingsView: React.FC = () => {
  const [store, setStore] = useState<Store>(getStore());
  const [logs, setLogs] = useState<AuditLog[]>(getAuditLogs());
  const [activeTab, setActiveTab] = useState<'store' | 'vietqr' | 'audit' | 'backup'>('store');
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [restoreJson, setRestoreJson] = useState<string>('');
  const [restoreStatus, setRestoreStatus] = useState<string>('');

  useEffect(() => {
    const reload = () => {
      setStore(getStore());
      setLogs(getAuditLogs());
    };
    reload();
    const unsubscribe = subscribeToStore(reload);
    return () => unsubscribe();
  }, []);

  const handleSaveStore = (e: React.FormEvent) => {
    e.preventDefault();
    updateStore(store);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const handleExportBackup = () => {
    const jsonStr = exportDatabaseBackup();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Karaoke_Manager_Backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleRestoreSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!restoreJson.trim()) return;
    const ok = restoreDatabaseBackup(restoreJson.trim());
    if (ok) {
      setRestoreStatus('Phục hồi dữ liệu thành công!');
      setRestoreJson('');
      setTimeout(() => setRestoreStatus(''), 4000);
    } else {
      setRestoreStatus('Lỗi: File JSON sao lưu không hợp lệ!');
    }
  };

  const handleResetDatabase = () => {
    if (
      window.confirm(
        'CẢNH BÁO: Thao tác này sẽ xóa toàn bộ dữ liệu hiện tại và khôi phục về trạng thái khởi tạo mẫu. Bạn có chắc chắn không?'
      )
    ) {
      resetDatabaseToDefault();
    }
  };

  return (
    <div className="space-y-4">
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <StoreIcon className="h-5 w-5 text-blue-600" />
            <span>Cài Đặt Hệ Thống &amp; Cửa Hàng</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Thông tin quán, tài khoản nhận tiền VietQR, nhật ký kiểm toán và sao lưu dữ liệu.
          </p>
        </div>

        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl overflow-x-auto">
          {[
            { id: 'store', label: 'Cửa hàng', icon: StoreIcon },
            { id: 'vietqr', label: 'VietQR', icon: QrCode },
            { id: 'audit', label: 'Audit Log', icon: FileText },
            { id: 'backup', label: 'Sao lưu / Phục hồi', icon: Database },
          ].map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id as any)}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all whitespace-nowrap ${
                  activeTab === t.id
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Cửa hàng */}
      {activeTab === 'store' && (
        <div className="max-w-2xl rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <form onSubmit={handleSaveStore} className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
              Thông Tin Thương Hiệu Trên Hóa Đơn
            </h3>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tên quán Karaoke:
              </label>
              <input
                type="text"
                value={store.name}
                onChange={(e) => setStore({ ...store, name: e.target.value })}
                required
                className="w-full rounded-xl border border-slate-300 p-2.5 text-sm font-bold text-slate-900 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Địa chỉ hiển thị:
              </label>
              <input
                type="text"
                value={store.address}
                onChange={(e) => setStore({ ...store, address: e.target.value })}
                className="w-full rounded-xl border border-slate-300 p-2 text-xs text-slate-900 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Số điện thoại / Hotline:
              </label>
              <input
                type="text"
                value={store.phone}
                onChange={(e) => setStore({ ...store, phone: e.target.value })}
                className="w-full rounded-xl border border-slate-300 p-2 text-xs text-slate-900 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Lời chào đầu hóa đơn:
              </label>
              <input
                type="text"
                value={store.headerGreeting || ''}
                onChange={(e) => setStore({ ...store, headerGreeting: e.target.value })}
                className="w-full rounded-xl border border-slate-300 p-2 text-xs text-slate-900 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Lời cảm ơn chân trang hóa đơn:
              </label>
              <input
                type="text"
                value={store.footerThankYou || ''}
                onChange={(e) => setStore({ ...store, footerThankYou: e.target.value })}
                className="w-full rounded-xl border border-slate-300 p-2 text-xs text-slate-900 focus:outline-hidden"
              />
            </div>

            <div className="pt-2 flex items-center justify-between">
              {isSaved && (
                <span className="flex items-center gap-1 text-xs font-bold text-emerald-600">
                  <CheckCircle2 className="h-4 w-4" />
                  Đã lưu thông tin cửa hàng!
                </span>
              )}
              <button
                type="submit"
                className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-blue-700 ml-auto"
              >
                <Save className="h-4 w-4" />
                <span>Lưu thông tin</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tab VietQR */}
      {activeTab === 'vietqr' && (
        <div className="max-w-2xl rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <form onSubmit={handleSaveStore} className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
              Cấu Hình Tài Khoản Nhận Chuyển Khoản VietQR
            </h3>
            <p className="text-xs text-slate-500">
              Mã QR thanh toán chuẩn VietQR sẽ tự động được tạo kèm số tiền chính xác trên phiếu thu
              ngân và màn hình thanh toán.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Ngân hàng:</label>
              <select
                value={store.bankName}
                onChange={(e) => setStore({ ...store, bankName: e.target.value })}
                className="w-full rounded-xl border border-slate-300 p-2.5 text-xs font-bold text-slate-900 focus:outline-hidden"
              >
                {POPULAR_VIETNAMESE_BANKS.map((bank) => (
                  <option key={bank.id} value={bank.name}>
                    {bank.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Số tài khoản nhận tiền:
              </label>
              <input
                type="text"
                value={store.bankAccountNo}
                onChange={(e) => setStore({ ...store, bankAccountNo: e.target.value })}
                required
                className="w-full rounded-xl border border-slate-300 p-2.5 text-sm font-mono font-bold text-slate-900 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tên chủ tài khoản (In hoa không dấu):
              </label>
              <input
                type="text"
                value={store.bankAccountName}
                onChange={(e) => setStore({ ...store, bankAccountName: e.target.value.toUpperCase() })}
                required
                className="w-full rounded-xl border border-slate-300 p-2.5 text-sm font-bold uppercase text-slate-900 focus:outline-hidden"
              />
            </div>

            <div className="pt-2 flex items-center justify-between">
              {isSaved && (
                <span className="flex items-center gap-1 text-xs font-bold text-emerald-600">
                  <CheckCircle2 className="h-4 w-4" />
                  Đã lưu cấu hình VietQR!
                </span>
              )}
              <button
                type="submit"
                className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-blue-700 ml-auto"
              >
                <Save className="h-4 w-4" />
                <span>Lưu thông tin ngân hàng</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tab Audit Log */}
      {activeTab === 'audit' && (
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs">
          <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
            <div className="font-bold text-xs text-slate-800 uppercase tracking-wider">
              Nhật Ký Hoạt Động &amp; Kiểm Toán (Audit Trail - {logs.length} bản ghi)
            </div>
            <div className="text-[11px] text-slate-500">
              Ghi nhận bất biến mọi thao tác: mở phòng, chuyển phòng, thanh toán, mở lại hóa đơn...
            </div>
          </div>

          <div className="overflow-x-auto max-h-[60vh]">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-[11px] font-bold text-slate-600 uppercase border-b border-slate-200 sticky top-0">
                <tr>
                  <th className="px-4 py-2.5">Thời điểm</th>
                  <th className="px-4 py-2.5">Người thực hiện</th>
                  <th className="px-4 py-2.5">Hành động</th>
                  <th className="px-4 py-2.5">Nội dung chi tiết</th>
                  <th className="px-4 py-2.5">Thiết bị</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80">
                    <td className="px-4 py-2.5 text-slate-600 font-mono text-[11px] whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString('vi-VN')}
                    </td>
                    <td className="px-4 py-2.5 font-bold text-slate-900 whitespace-nowrap">
                      {log.userName}
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-[10px] font-bold text-slate-700">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-slate-700 leading-relaxed">{log.description}</td>
                    <td className="px-4 py-2.5 text-slate-400 text-[11px] whitespace-nowrap">
                      {log.deviceId}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab Backup & Restore */}
      {activeTab === 'backup' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Download className="h-4 w-4 text-blue-600" />
              <span>Xuất Bản Sao Lưu Dữ Liệu (Export JSON)</span>
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Tải về toàn bộ cơ sở dữ liệu hiện tại bao gồm: hóa đơn, danh mục phòng, bảng giá, thực
              đơn, sổ nợ và nhật ký kiểm toán dạng tệp tin JSON an toàn.
            </p>
            <button
              onClick={handleExportBackup}
              className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-blue-700"
            >
              <Download className="h-4 w-4" />
              <span>Tải file sao lưu về máy</span>
            </button>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Upload className="h-4 w-4 text-amber-600" />
              <span>Phục Hồi Dữ Liệu (Import JSON)</span>
            </h3>
            <form onSubmit={handleRestoreSubmit} className="space-y-2">
              <textarea
                rows={3}
                placeholder="Dán nội dung JSON sao lưu vào đây..."
                value={restoreJson}
                onChange={(e) => setRestoreJson(e.target.value)}
                className="w-full rounded-xl border border-slate-300 p-2 text-xs font-mono text-slate-900 focus:outline-hidden"
              />
              {restoreStatus && (
                <div className="text-xs font-bold text-blue-700">{restoreStatus}</div>
              )}
              <button
                type="submit"
                disabled={!restoreJson.trim()}
                className="flex items-center gap-1.5 rounded-xl bg-amber-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-amber-700 disabled:opacity-50"
              >
                <Upload className="h-4 w-4" />
                <span>Khôi phục dữ liệu</span>
              </button>
            </form>
          </div>

          <div className="md:col-span-2 rounded-2xl border border-red-200 bg-red-50/50 p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <div className="text-xs font-bold text-red-800 uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <span>Khôi phục dữ liệu mẫu ban đầu (Factory Reset)</span>
              </div>
              <p className="text-xs text-red-700 mt-1">
                Xóa sạch các hóa đơn và giao dịch thử nghiệm, đặt lại bảng giá và thực đơn chuẩn mẫu.
              </p>
            </div>
            <button
              onClick={handleResetDatabase}
              className="rounded-xl border border-red-300 bg-white px-4 py-2 text-xs font-bold text-red-700 hover:bg-red-50 whitespace-nowrap"
            >
              Đặt lại dữ liệu mẫu
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
