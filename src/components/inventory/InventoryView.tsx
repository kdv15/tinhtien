import React, { useState, useEffect } from 'react';
import {
  Package,
  Search,
  Plus,
  ArrowUpRight,
  AlertTriangle,
  Boxes,
  X,
  CheckCircle,
  FileText,
} from 'lucide-react';
import { MenuItem } from '../../types';
import { getAllMenuItems, updateMenuItems, addAuditLog, subscribeToStore } from '../../db/storage';
import { formatMoney } from '../../core/pricingEngine';

export const InventoryView: React.FC = () => {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [showImportModal, setShowImportModal] = useState<boolean>(false);
  const [selectedItemForImport, setSelectedItemForImport] = useState<MenuItem | null>(null);
  const [importQty, setImportQty] = useState<number>(24);
  const [importCost, setImportCost] = useState<number>(0);
  const [importNote, setImportNote] = useState<string>('Nhập hàng định kỳ');

  useEffect(() => {
    const reload = () => {
      setItems(getAllMenuItems());
    };
    reload();
    const unsubscribe = subscribeToStore(reload);
    return () => unsubscribe();
  }, []);

  const filteredItems = items.filter((item) => {
    if (selectedCategory !== 'ALL' && item.category !== selectedCategory) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return item.name.toLowerCase().includes(q) || item.code.toLowerCase().includes(q);
  });

  const lowStockCount = items.filter((i) => i.stockQuantity <= i.minStockAlert).length;
  const totalStockUnits = items.reduce((sum, i) => sum + i.stockQuantity, 0);

  const handleOpenImport = (item: MenuItem) => {
    setSelectedItemForImport(item);
    setImportCost(item.costPrice);
    setShowImportModal(true);
  };

  const handleConfirmImport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItemForImport || importQty <= 0) return;

    const allItems = [...items];
    const target = allItems.find((i) => i.id === selectedItemForImport.id);
    if (target) {
      target.stockQuantity += importQty;
      if (importCost > 0) target.costPrice = importCost;
      updateMenuItems(allItems);

      addAuditLog(
        'INVENTORY_CHANGE',
        `Nhập kho: ${target.name} +${importQty} ${target.unit}. Ghi chú: ${importNote}`
      );
    }

    setShowImportModal(false);
    setSelectedItemForImport(null);
  };

  return (
    <div className="space-y-4">
      {/* KPI & Header Kho */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="text-xs text-slate-500 font-medium">Tổng mặt hàng trong kho</div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-black text-slate-900">{items.length}</span>
            <span className="text-xs text-slate-400 font-medium">{totalStockUnits} đơn vị</span>
          </div>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50/40 p-4 shadow-xs">
          <div className="text-xs text-amber-700 font-medium flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
            Cảnh báo sắp hết hàng
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-black text-amber-900">{lowStockCount}</span>
            <span className="text-xs text-amber-700 font-semibold">Cần nhập thêm</span>
          </div>
        </div>

        <div className="rounded-2xl border border-blue-200 bg-blue-50/40 p-4 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs text-blue-700 font-medium">Nhập kho nhanh</div>
            <div className="text-xs text-slate-500 mt-0.5">Bổ sung số lượng tồn kho</div>
          </div>
          <button
            onClick={() => handleOpenImport(items[0])}
            className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            <span>Nhập hàng</span>
          </button>
        </div>
      </div>

      {/* Bộ lọc & Tìm kiếm */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-xs">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: 'ALL', label: 'Tất cả' },
            { id: 'BEVERAGE', label: 'Bia & Đồ uống' },
            { id: 'SNACK', label: 'Đồ khô & Snack' },
            { id: 'FRUIT', label: 'Trái cây' },
            { id: 'OTHER', label: 'Khác' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all whitespace-nowrap ${
                selectedCategory === cat.id
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className="relative sm:w-64">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm tên hoặc mã sản phẩm..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-3 text-xs text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-hidden"
          />
        </div>
      </div>

      {/* Bảng Danh Sách Tồn Kho */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-[11px] font-bold text-slate-600 uppercase border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Mã hàng</th>
                <th className="px-4 py-3">Tên sản phẩm</th>
                <th className="px-4 py-3">Đơn vị</th>
                <th className="px-4 py-3 text-right">Giá vốn</th>
                <th className="px-4 py-3 text-right">Giá bán</th>
                <th className="px-4 py-3 text-center">Tồn kho hiện tại</th>
                <th className="px-4 py-3 text-center">Định mức cảnh báo</th>
                <th className="px-4 py-3 text-center">Tác vụ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {filteredItems.map((item) => {
                const isLow = item.stockQuantity <= item.minStockAlert;
                return (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-slate-600">{item.code}</td>
                    <td className="px-4 py-3 font-bold text-slate-900">{item.name}</td>
                    <td className="px-4 py-3 text-slate-600">{item.unit}</td>
                    <td className="px-4 py-3 text-right text-slate-500">
                      {formatMoney(item.costPrice)}
                    </td>
                    <td className="px-4 py-3 text-right font-extrabold text-blue-700">
                      {formatMoney(item.salePrice)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-black ${
                          isLow
                            ? 'bg-red-100 text-red-800 animate-pulse'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {item.stockQuantity}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-slate-400">
                      ≤ {item.minStockAlert}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleOpenImport(item)}
                        className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-bold text-blue-700 hover:bg-blue-50 transition-colors mx-auto"
                      >
                        <ArrowUpRight className="h-3.5 w-3.5" />
                        <span>Nhập kho</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Nhập Kho Nhanh */}
      {showImportModal && selectedItemForImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl border border-slate-200 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="text-sm font-bold text-slate-900">
                Nhập Kho: {selectedItemForImport.name}
              </span>
              <button
                onClick={() => setShowImportModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmImport} className="mt-4 space-y-3">
              <div className="rounded-xl bg-slate-50 p-2.5 text-xs text-slate-600">
                Tồn kho hiện tại: <strong>{selectedItemForImport.stockQuantity}</strong> (
                {selectedItemForImport.unit})
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Số lượng nhập thêm ({selectedItemForImport.unit}):
                </label>
                <input
                  type="number"
                  min="1"
                  value={importQty}
                  onChange={(e) => setImportQty(Number(e.target.value) || 0)}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-sm font-bold text-slate-900 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Đơn giá vốn nhập (VNĐ):
                </label>
                <input
                  type="number"
                  step="1000"
                  value={importCost}
                  onChange={(e) => setImportCost(Number(e.target.value) || 0)}
                  className="w-full rounded-xl border border-slate-300 p-2 text-xs text-slate-900 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Ghi chú:</label>
                <input
                  type="text"
                  value={importNote}
                  onChange={(e) => setImportNote(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-2 text-xs text-slate-800 focus:outline-hidden"
                />
              </div>

              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowImportModal(false)}
                  className="flex-1 rounded-xl border border-slate-300 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={importQty <= 0}
                  className="flex-1 rounded-xl bg-blue-600 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-blue-700 disabled:opacity-50"
                >
                  Xác nhận nhập kho
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
