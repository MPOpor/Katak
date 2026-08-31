import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { apiGetWordCloud } from '../services/api';
import { Cloud, Tag } from 'lucide-react';

export default function WordCloud({ onSelectKeyword }) {
  const { currentWorkspace, period, startDate, endDate } = useApp();
  const [words, setWords] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!currentWorkspace) return;
    const fetchCloud = async () => {
      setLoading(true);
      try {
        const data = await apiGetWordCloud({
          workspace_id: currentWorkspace.id,
          period,
          startDate,
          endDate
        });
        setWords(data || []);
      } catch (err) {
        console.error('Error fetching word cloud:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchCloud();
  }, [currentWorkspace, period, startDate, endDate]);

  const maxVal = words.length > 0 ? Math.max(...words.map(w => w.value)) : 1;

  return (
    <div className="bg-white rounded-2xl p-4 border border-[#FDE68A] shadow-soft">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center text-[#D97706]">
          <Cloud className="w-4 h-4" />
        </div>
        <div>
          <h3 className="text-xs sm:text-sm font-bold text-gray-900">แผนภาพคลาวด์คำ (Word Cloud)</h3>
          <p className="text-[10px] text-gray-400">หมวดหมู่และรายการที่มีความถี่ในการทำรายการสูง</p>
        </div>
      </div>

      {loading ? (
        <div className="h-28 flex items-center justify-center text-xs text-gray-400">
          กำลังวิเคราะห์คำที่มีความถี่สูง...
        </div>
      ) : words.length === 0 ? (
        <div className="h-28 flex flex-col items-center justify-center text-xs text-gray-400">
          <Tag className="w-6 h-6 text-gray-300 mb-1" />
          ยังไม่มีคำสำคัญเพียงพอสำหรับการแสดงผล
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-center gap-2 p-2 min-h-[110px]">
          {words.map((w, idx) => {
            const weight = (w.value / maxVal);
            // Dynamic text sizes
            const sizeClass = weight > 0.75
              ? 'text-sm sm:text-base font-bold px-3 py-1.5'
              : weight > 0.45
              ? 'text-xs sm:text-sm font-semibold px-2.5 py-1'
              : 'text-[11px] font-normal px-2 py-0.5';

            return (
              <button
                key={idx}
                onClick={() => onSelectKeyword && onSelectKeyword(w.text)}
                style={{ color: w.color || '#B45309' }}
                className={`rounded-full border border-amber-200 bg-[#FFFDF0] hover:bg-amber-100 hover:border-amber-300 transition-transform hover:scale-105 shadow-sm flex items-center gap-1 ${sizeClass}`}
              >
                <span>{w.text}</span>
                <span className="text-[10px] text-gray-400 font-normal">({w.value})</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
