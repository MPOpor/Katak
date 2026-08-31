import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { apiCreateCategory, apiDeleteCategory } from '../services/api';
import { Plus, Tag, Trash2, ShoppingBag, X, CheckCircle2 } from 'lucide-react';

export default function CategoriesView() {
  const { currentWorkspace, categories, refreshData, showToast } = useApp();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatType, setNewCatType] = useState('expense');
  const [newCatColor, setNewCatColor] = useState('#F59E0B');
  const [processing, setProcessing] = useState(false);

  const colors = ['#F59E0B', '#D97706', '#10B981', '#6366F1', '#3B82F6', '#EC4899', '#8B5CF6', '#EF4444', '#14B8A6'];

  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    setProcessing(true);
    try {
      await apiCreateCategory({
        workspace_id: currentWorkspace.id,
        name: newCatName.trim(),
        type: newCatType,
        color: newCatColor,
        icon: 'Tag'
      });
      showToast(`เพิ่มหมวดหมู่ "${newCatName}" สำเร็จ!`, 'success');
      setNewCatName('');
      setIsAddOpen(false);
      refreshData();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setProcessing(false);
    }
  };

  const handleDelete = async (cat) => {
    if (!window.confirm(`คุณต้องการลบหมวดหมู่ "${cat.name}" ใช่หรือไม่?`)) return;
    try {
      await apiDeleteCategory(cat.id);
      showToast('ลบหมวดหมู่สำเร็จ', 'success');
      refreshData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const incomeCats = categories.filter(c => c.type === 'income');
  const expenseCats = categories.filter(c => c.type === 'expense');

  return (
    <div className="space-y-4 max-w-4xl mx-auto px-4 py-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm sm:text-base font-bold text-gray-900">จัดการหมวดหมู่รายรับ-รายจ่าย</h2>
          <p className="text-xs text-gray-400">สำหรับ: {currentWorkspace?.name}</p>
        </div>

        <button
          onClick={() => setIsAddOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#F59E0B] hover:bg-amber-600 text-white rounded-xl text-xs font-semibold shadow-sm transition"
        >
          <Plus className="w-3.5 h-3.5" />
          เพิ่มหมวดหมู่
        </button>
      </div>

      {/* Add Modal */}
      {isAddOpen && (
        <div className="p-4 bg-white rounded-2xl border border-amber-200 shadow-md animate-slide-up space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-800">เพิ่มหมวดหมู่ใหม่</span>
            <button onClick={() => setIsAddOpen(false)} className="text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleAddCategory} className="space-y-3">
            <div className="grid grid-cols-2 gap-2 bg-gray-100 p-0.5 rounded-xl">
              <button
                type="button"
                onClick={() => setNewCatType('expense')}
                className={`py-1.5 text-xs font-bold rounded-lg ${
                  newCatType === 'expense' ? 'bg-rose-500 text-white shadow-xs' : 'text-gray-600'
                }`}
              >
                รายจ่าย (-)
              </button>
              <button
                type="button"
                onClick={() => setNewCatType('income')}
                className={`py-1.5 text-xs font-bold rounded-lg ${
                  newCatType === 'income' ? 'bg-emerald-500 text-white shadow-xs' : 'text-gray-600'
                }`}
              >
                รายรับ (+)
              </button>
            </div>

            <div>
              <label className="text-[11px] text-gray-600 block mb-1">ชื่อหมวดหมู่</label>
              <input
                type="text"
                required
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                placeholder="เช่น ค่าบรรจุภัณฑ์ของฝาก, ค่าโฆษณา"
                className="w-full px-3 py-1.5 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#F59E0B]"
              />
            </div>

            <div>
              <label className="text-[11px] text-gray-600 block mb-1">เลือกสีประจำหมวดหมู่</label>
              <div className="flex items-center gap-2">
                {colors.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setNewCatColor(c)}
                    style={{ backgroundColor: c }}
                    className={`w-6 h-6 rounded-full transition transform hover:scale-110 ${
                      newCatColor === c ? 'ring-2 ring-offset-2 ring-amber-400 scale-110' : ''
                    }`}
                  />
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={processing}
              className="w-full py-2 bg-[#F59E0B] text-white rounded-xl text-xs font-bold shadow-sm hover:bg-amber-600 transition"
            >
              บันทึกหมวดหมู่
            </button>
          </form>
        </div>
      )}

      {/* Expense Categories */}
      <div className="bg-white rounded-2xl p-4 border border-[#FDE68A] shadow-soft space-y-3">
        <h3 className="text-xs font-bold text-rose-600 flex items-center gap-1.5">
          🔴 หมวดหมู่รายจ่าย ({expenseCats.length} รายการ)
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {expenseCats.map((cat) => (
            <div
              key={cat.id}
              className="p-2.5 rounded-xl border border-gray-100 flex items-center justify-between hover:bg-amber-50/40 transition group"
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: cat.color || '#F59E0B' }}
                />
                <span className="text-xs font-medium text-gray-800">{cat.name}</span>
                {cat.is_default ? (
                  <span className="text-[9px] px-1 rounded bg-gray-100 text-gray-400">มาตรฐาน</span>
                ) : null}
              </div>

              {!cat.is_default && (
                <button
                  onClick={() => handleDelete(cat)}
                  className="text-gray-300 hover:text-red-500 p-1 rounded transition opacity-0 group-hover:opacity-100"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Income Categories */}
      <div className="bg-white rounded-2xl p-4 border border-[#FDE68A] shadow-soft space-y-3">
        <h3 className="text-xs font-bold text-emerald-600 flex items-center gap-1.5">
          🟢 หมวดหมู่รายรับ ({incomeCats.length} รายการ)
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {incomeCats.map((cat) => (
            <div
              key={cat.id}
              className="p-2.5 rounded-xl border border-gray-100 flex items-center justify-between hover:bg-emerald-50/30 transition group"
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: cat.color || '#10B981' }}
                />
                <span className="text-xs font-medium text-gray-800">{cat.name}</span>
                {cat.is_default ? (
                  <span className="text-[9px] px-1 rounded bg-gray-100 text-gray-400">มาตรฐาน</span>
                ) : null}
              </div>

              {!cat.is_default && (
                <button
                  onClick={() => handleDelete(cat)}
                  className="text-gray-300 hover:text-red-500 p-1 rounded transition opacity-0 group-hover:opacity-100"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
