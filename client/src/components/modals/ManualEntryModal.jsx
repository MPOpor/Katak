import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { apiCreateTransaction } from '../../services/api';
import {
  Edit3,
  X,
  CheckCircle2,
  Calendar,
  Delete,
  ShoppingBag,
  Sparkles
} from 'lucide-react';

export default function ManualEntryModal() {
  const {
    isManualModalOpen,
    setIsManualModalOpen,
    currentWorkspace,
    categories,
    refreshData,
    showToast,
    triggerCelebration
  } = useApp();

  const [type, setType] = useState('expense'); // 'expense' or 'income'
  const [amountStr, setAmountStr] = useState('0');
  const [selectedCatId, setSelectedCatId] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [processing, setProcessing] = useState(false);

  if (!isManualModalOpen) return null;

  // Filter categories by selected type
  const availableCats = categories.filter(c => c.type === type);

  // Keypad Calculator
  const handleKeypad = (val) => {
    if (val === 'C') {
      setAmountStr('0');
    } else if (val === 'DEL') {
      if (amountStr.length <= 1) setAmountStr('0');
      else setAmountStr(amountStr.slice(0, -1));
    } else if (val === '.') {
      if (!amountStr.includes('.')) setAmountStr(amountStr + '.');
    } else {
      if (amountStr === '0') setAmountStr(val);
      else if (amountStr.length < 10) setAmountStr(amountStr + val);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const amount = parseFloat(amountStr);
    if (!amount || amount <= 0) {
      showToast('กรุณาระบุจำนวนเงิน', 'error');
      return;
    }
    if (!selectedCatId) {
      showToast('กรุณาเลือกหมวดหมู่', 'error');
      return;
    }

    setProcessing(true);
    try {
      await apiCreateTransaction({
        workspace_id: currentWorkspace.id,
        category_id: selectedCatId,
        type,
        amount,
        note,
        input_method: 'manual',
        transaction_date: date
      });

      showToast('✓ บันทึกรายการสำเร็จ!', 'success');
      triggerCelebration();
      refreshData();
      setIsManualModalOpen(false);
      setAmountStr('0');
      setNote('');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-pop-in">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-pink-100 overflow-hidden my-auto animate-slide-up">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-50 via-white to-emerald-50 px-5 py-3.5 border-b border-emerald-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-[#10B981] text-white flex items-center justify-center shadow-md">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">
                บันทึกรายการด้วยตนเอง
              </h3>
              <p className="text-[11px] text-gray-500">
                พร้อมแป้นคิดเลขด่วนและเลือกหมวดหมู่
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsManualModalOpen(false)}
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-4 space-y-3 max-h-[80vh] overflow-y-auto">
          {/* Income vs Expense Toggle */}
          <div className="grid grid-cols-2 gap-2 bg-gray-100 p-1 rounded-2xl">
            <button
              type="button"
              onClick={() => {
                setType('expense');
                setSelectedCatId('');
              }}
              className={`py-2 text-xs font-bold rounded-xl transition ${
                type === 'expense' ? 'bg-rose-500 text-white shadow-sm' : 'text-gray-600'
              }`}
            >
              รายจ่าย (-)
            </button>
            <button
              type="button"
              onClick={() => {
                setType('income');
                setSelectedCatId('');
              }}
              className={`py-2 text-xs font-bold rounded-xl transition ${
                type === 'income' ? 'bg-emerald-500 text-white shadow-sm' : 'text-gray-600'
              }`}
            >
              รายรับ (+)
            </button>
          </div>

          {/* Amount Display */}
          <div className="bg-[#FDFBF9] border border-gray-200 rounded-2xl p-3 text-right">
            <span className="text-[11px] text-gray-400 block mb-0.5">จำนวนเงิน (บาท)</span>
            <div className={`text-3xl font-bold truncate ${type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
              ฿{parseFloat(amountStr || '0').toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
            </div>
          </div>

          {/* Category Grid */}
          <div>
            <label className="text-xs font-bold text-gray-700 block mb-1.5">
              เลือกหมวดหมู่ *
            </label>
            <div className="grid grid-cols-3 gap-1.5 max-h-36 overflow-y-auto pr-1">
              {availableCats.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCatId(cat.id)}
                  className={`p-2 rounded-xl border text-left transition flex items-center gap-1.5 ${
                    selectedCatId === cat.id
                      ? 'border-[#F59E0B] bg-amber-50 text-[#D97706] font-bold shadow-xs'
                      : 'border-gray-100 bg-white hover:bg-gray-50 text-gray-700 text-xs'
                  }`}
                >
                  <div
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: cat.color || '#3B82F6' }}
                  />
                  <span className="text-[11px] truncate">{cat.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Calculator Keypad */}
          <div className="grid grid-cols-4 gap-1.5 pt-1">
            {['7', '8', '9', 'C', '4', '5', '6', 'DEL', '1', '2', '3', '0', '00', '.'].map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => handleKeypad(key)}
                className={`py-2 rounded-xl text-sm font-bold transition active:scale-95 ${
                  key === 'C'
                    ? 'bg-rose-100 text-rose-700 hover:bg-rose-200'
                    : key === 'DEL'
                    ? 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-800'
                } ${key === '0' ? 'col-span-1' : ''}`}
              >
                {key}
              </button>
            ))}
          </div>

          {/* Date & Note */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <div>
              <label className="text-[11px] text-gray-500 block mb-1">วันที่</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-xl"
              />
            </div>
            <div>
              <label className="text-[11px] text-gray-500 block mb-1">หมายเหตุ</label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="เช่น ค่าขนม, ค่าส่งของ"
                className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-xl"
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={processing}
            className="w-full py-3 bg-gradient-to-r from-[#10B981] to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white rounded-2xl text-xs font-bold shadow-md transition flex items-center justify-center gap-1.5 mt-2"
          >
            <CheckCircle2 className="w-4 h-4" /> บันทึกรายการนี้
          </button>
        </form>
      </div>
    </div>
  );
}
