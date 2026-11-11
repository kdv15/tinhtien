import React, { useState, useEffect } from 'react';
import {
  UtensilsCrossed,
  Plus,
  Search,
  Edit2,
  Trash2,
  CheckCircle,
  X,
  Boxes,
} from 'lucide-react';
import { MenuItem, ProductCategory } from '../../types';
import { getAllMenuItems, updateMenuItems, addAuditLog, subscribeToStore } from '../../db/storage';
import { formatMoney } from '../../core/pricingEngine';

export const MenuCatalogView: React.FC = () => {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [isNewItem, setIsNewItem] = useState<boolean>(false);

  // Form fields
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState<ProductCategory>('BEVERAGE');
  const [unit, setUnit] = useState('Lon');
  const [salePrice, setSalePrice] = useState<number>(35000);
  const [costPrice, setCostPrice] = useState<number>(20000);
  const [stockQuantity, setStockQuantity] = useState<number>(100);
  const [minStockAlert, setMinStockAlert] = useState<number>(24);

  useEffect(() => {
    const reload = () => {
      setItems(getAllMenuItems());
    };
    reload();
    const unsubscribe = subscribeToStore(reload);
    return () => unsubscribe();
  }, []);

  const openAddModal = () => {
    setIsNewItem(true);
    setEditingItem({} as MenuItem);
    setCode(`SP_${Date.now().toString().slice(-4)}`);
    setName('');
    setCategory('BEVERAGE');
    setUnit('Lon');
    setSalePrice(35000);
    setCostPrice(20000);
    setStockQuantity(100);
    setMinStockAlert(24);
  };

  const openEditModal = (item: MenuItem) => {
    setIsNewItem(false);
    setEditingItem(item);
    setCode(item.code);
    setName(item.name);
    setCategory(item.category);
    setUnit(item.unit);
    setSalePrice(item.salePrice);
    setCostPrice(item.costPrice);
    setStockQuantity(item.stockQuantity);
    setMinStockAlert(item.minStockAlert);
  };

  const handleSaveItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !code.trim()) return;

    const all = [...items];
    if (isNewItem) {
      const newItem: MenuItem = {
        id: `menu_${Date.now()}`,
        storeId: 'store_paris_night',
        code: code.trim().toUpperCase(),
        name: name.trim(),
        category,
        unit: unit.trim(),
        salePrice,
        costPrice,
        stockQuantity,
        minStockAlert,
        isActive: true,
      };
      all.unshift(newItem);
      addAuditLog('SETTINGS_CHANGE', `Thêm món mới vào danh mục: ${newItem.name}`);
    } else if (editingItem) {
      const target = all.find((i) => i.id === editingItem.id);
      if (target) {
        target.code = code.trim().toUpperCase();
        target.name = name.trim();
        target.category = category;
        target.unit = unit.trim();
        target.salePrice = salePrice;
        target.costPrice = costPrice;
        target.stockQuantity = stockQuantity;
        target.minStockAlert = minStockAlert;
        addAuditLog('SETTINGS_CHANGE', `Cập nhật thông tin món: ${target.name}`);
      }
    }

    updateMenuItems(all);
    setEditingItem(null);
  };

  const handleToggleActive = (id: string) => {
    const all = [...items];
    const target = all.find((i) => i.id === id);
    if (target) {
      target.isActive = !target.isActive;
      updateMenuItems(all);
    }
  };

  const filtered = items.filter((item) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return item.name.toLowerCase().includes(q) || item.code.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <UtensilsCrossed className="h-5 w-5 text-blue-600" />
            <span>Danh Mục Thực Đơn & Dịch Vụ</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Quản lý tên món, đơn vị tính, giá bán, giá vốn và định mức tồn kho.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative w-full sm:w-60">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm tên hoặc mã món..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-3 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-hidden"
            />
          </div>

          <button
            onClick={openAddModal}
            className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-blue-700 whitespace-nowrap"
          >
            <Plus className="h-4 w-4" />
            <span>Thêm món</span>
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-[11px] font-bold text-slate-600 uppercase border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Mã</th>
                <th className="px-4 py-3">Tên sản phẩm</th>
                <th className="px-4 py-3">Phân loại</th>
                <th className="px-4 py-3">Đơn vị</th>
                <th className="px-4 py-3 text-right">Giá vốn</th>
                <th className="px-4 py-3 text-right">Giá bán</th>
                <th className="px-4 py-3 text-center">Tồn kho</th>
                <th className="px-4 py-3 text-center">Trạng thái</th>
                <th className="px-4 py-3 text-center">Sửa</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {filtered.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/80">
                  <td className="px-4 py-3 font-mono font-bold text-slate-600">{item.code}</td>
                  <td className="px-4 py-3 font-bold text-slate-900">{item.name}</td>
                  <td className="px-4 py-3 text-slate-600">
                    <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold">
                      {item.category}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{item.unit}</td>
                  <td className="px-4 py-3 text-right text-slate-500">
                    {formatMoney(item.costPrice)}
                  </td>
                  <td className="px-4 py-3 text-right font-extrabold text-blue-700">
                    {formatMoney(item.salePrice)}
                  </td>
                  <td className="px-4 py-3 text-center font-bold text-slate-700">
                    {item.stockQuantity}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => handleToggleActive(item.id)}
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        item.isActive
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {item.isActive ? 'Đang bán' : 'Tạm dừng'}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => openEditModal(item)}
                      className="p-1 rounded text-slate-500 hover:text-blue-600 hover:bg-slate-100"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Thêm / Sửa Món */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl border border-slate-200 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="text-sm font-bold text-slate-900">
                {isNewItem ? 'Thêm Món Mới' : `Sửa Món: ${editingItem.name}`}
              </span>
              <button
                onClick={() => setEditingItem(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="mt-4 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Mã sản phẩm:
                  </label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    required
                    className="w-full rounded-xl border border-slate-300 p-2 text-xs font-mono font-bold text-slate-900 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Đơn vị:</label>
                  <input
                    type="text"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    placeholder="Lon, Chai, Dĩa..."
                    required
                    className="w-full rounded-xl border border-slate-300 p-2 text-xs text-slate-900 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Tên món:</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="VD: Bia Tiger Crystal..."
                  required
                  className="w-full rounded-xl border border-slate-300 p-2 text-xs text-slate-900 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Giá vốn (VNĐ):
                  </label>
                  <input
                    type="number"
                    step="1000"
                    value={costPrice}
                    onChange={(e) => setCostPrice(Number(e.target.value) || 0)}
                    className="w-full rounded-xl border border-slate-300 p-2 text-xs text-slate-900 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Giá bán (VNĐ):
                  </label>
                  <input
                    type="number"
                    step="1000"
                    value={salePrice}
                    onChange={(e) => setSalePrice(Number(e.target.value) || 0)}
                    className="w-full rounded-xl border border-slate-300 p-2 text-xs font-bold text-blue-700 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Số lượng tồn kho:
                  </label>
                  <input
                    type="number"
                    value={stockQuantity}
                    onChange={(e) => setStockQuantity(Number(e.target.value) || 0)}
                    className="w-full rounded-xl border border-slate-300 p-2 text-xs text-slate-900 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Báo hết khi dưới:
                  </label>
                  <input
                    type="number"
                    value={minStockAlert}
                    onChange={(e) => setMinStockAlert(Number(e.target.value) || 0)}
                    className="w-full rounded-xl border border-slate-300 p-2 text-xs text-slate-900 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="flex-1 rounded-xl border border-slate-300 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-blue-600 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-blue-700"
                >
                  Lưu sản phẩm
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
