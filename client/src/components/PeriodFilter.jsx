import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Calendar, ChevronRight } from 'lucide-react';

export default function PeriodFilter() {
  const { period, startDate, endDate, setPeriod, setStartDate, setEndDate } = useApp();
  const [showCustomPicker, setShowCustomPicker] = useState(false);

  const filters = [
    { id: 'today', label: 'วันนี้' },
    { id: 'week', label: '7 วัน' },
    { id: 'month', label: 'เดือนนี้' },
    { id: 'year', label: 'ปีนี้' },
    { id: 'custom', label: 'กำหนดเอง' }
  ];

  const handleSelect = (fId) => {
    if (fId === 'custom') {
      setShowCustomPicker(true);
      setPeriod('custom');
    } else {
      setShowCustomPicker(false);
      setPeriod(fId);
    }
  };

  return (
    <div className="px-4 py-2">
      <div className="max-w-4xl mx-auto flex items-center justify-between gap-2 overflow-x-auto no-scrollbar py-1">
        <div className="flex items-center gap-1.5 bg-white p-1 rounded-full border border-[#FDE68A] shadow-sm">
          {filters.map((f) => (
            <button
              key={f.id}
              onClick={() => handleSelect(f.id)}
              className={`px-3 py-1 text-xs rounded-full font-medium transition-all ${
                period === f.id
                  ? 'bg-[#F59E0B] text-white shadow-sm font-semibold'
                  : 'text-amber-950/70 hover:text-amber-950 hover:bg-amber-50'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Current Period Label */}
        <div className="hidden sm:flex items-center gap-1 text-xs text-amber-900 font-medium bg-[#FEF9C3] px-3 py-1 rounded-full border border-amber-200">
          <Calendar className="w-3.5 h-3.5 text-[#D97706]" />
          <span>สิงหาคม 2569</span>
        </div>
      </div>

      {/* Custom Date Range Picker */}
      {showCustomPicker && (
        <div className="max-w-4xl mx-auto mt-2 p-3 bg-white rounded-2xl border border-amber-200 shadow-md flex flex-wrap items-center gap-3 animate-slide-up">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">ตั้งแต่วันที่:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="text-xs px-2.5 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#F59E0B]"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">ถึงวันที่:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="text-xs px-2.5 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#F59E0B]"
            />
          </div>
          <button
            onClick={() => setPeriod('custom')}
            className="text-xs px-3 py-1.5 bg-[#F59E0B] text-white rounded-lg font-medium hover:bg-amber-600 transition"
          >
            ใช้ตัวกรอง
          </button>
        </div>
      )}
    </div>
  );
}
