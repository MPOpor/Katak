import React, { useEffect, useState } from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import { useApp } from '../context/AppContext';
import { apiGetCategoryBreakdown } from '../services/api';
import { PieChart, ChevronRight, Filter } from 'lucide-react';

ChartJS.register(ArcElement, Tooltip, Legend);

export default function CategoryDonutChart() {
  const { currentWorkspace, period, startDate, endDate, setDrilldownCategory } = useApp();
  const [breakdownType, setBreakdownType] = useState('expense'); // 'expense' or 'income'
  const [categoriesData, setCategoriesData] = useState([]);
  const [totalSum, setTotalSum] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!currentWorkspace) return;
    const fetchBreakdown = async () => {
      setLoading(true);
      try {
        const res = await apiGetCategoryBreakdown({
          workspace_id: currentWorkspace.id,
          period,
          type: breakdownType,
          startDate,
          endDate
        });
        setCategoriesData(res || []);
        const sum = (res || []).reduce((acc, c) => acc + c.total, 0);
        setTotalSum(sum);
      } catch (err) {
        console.error('Error fetching breakdown:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchBreakdown();
  }, [currentWorkspace, period, breakdownType, startDate, endDate]);

  const chartColors = [
    '#F59E0B', '#10B981', '#6366F1', '#3B82F6', '#EF4444',
    '#D97706', '#8B5CF6', '#14B8A6', '#F43F5E', '#84CC16'
  ];

  const chartData = {
    labels: categoriesData.map(c => c.name),
    datasets: [
      {
        data: categoriesData.map(c => c.total),
        backgroundColor: categoriesData.map((c, i) => c.color || chartColors[i % chartColors.length]),
        borderWidth: 2,
        borderColor: '#FFFFFF',
        hoverOffset: 6,
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '70%',
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (context) => {
            const val = context.raw;
            const pct = totalSum > 0 ? Math.round((val / totalSum) * 1000) / 10 : 0;
            return ` ${context.label}: ฿${val.toLocaleString()} (${pct}%)`;
          }
        }
      }
    },
    onClick: (event, elements) => {
      if (elements && elements.length > 0) {
        const index = elements[0].index;
        const selected = categoriesData[index];
        if (selected) {
          setDrilldownCategory(selected);
        }
      }
    }
  };

  return (
    <div className="bg-white rounded-2xl p-4 border border-[#FDE68A] shadow-soft">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center text-[#D97706]">
            <PieChart className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-gray-900">สัดส่วนหมวดหมู่ (Breakdown)</h3>
            <p className="text-[10px] text-gray-400">คลิกที่ชิ้นกราฟเพื่อ Drill-down ดูรายการ</p>
          </div>
        </div>

        {/* Toggle Expense vs Income */}
        <div className="flex items-center bg-gray-100 p-0.5 rounded-lg text-[11px]">
          <button
            onClick={() => setBreakdownType('expense')}
            className={`px-2.5 py-1 rounded-md font-medium transition ${
              breakdownType === 'expense' ? 'bg-white text-rose-600 shadow-sm' : 'text-gray-500'
            }`}
          >
            รายจ่าย
          </button>
          <button
            onClick={() => setBreakdownType('income')}
            className={`px-2.5 py-1 rounded-md font-medium transition ${
              breakdownType === 'income' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500'
            }`}
          >
            รายรับ
          </button>
        </div>
      </div>

      {loading ? (
        <div className="h-44 flex items-center justify-center text-xs text-gray-400">
          กำลังคำนวณสัดส่วนหมวดหมู่...
        </div>
      ) : categoriesData.length === 0 ? (
        <div className="h-44 flex flex-col items-center justify-center text-xs text-gray-400">
          <PieChart className="w-8 h-8 text-gray-300 mb-1" />
          ยังไม่มีรายการ{breakdownType === 'expense' ? 'รายจ่าย' : 'รายรับ'}ในช่วงเวลานี้
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 items-center gap-4">
          {/* Donut Chart with Center Total */}
          <div className="relative h-44 flex items-center justify-center">
            <Doughnut data={chartData} options={chartOptions} />
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-[10px] text-gray-400 font-medium">รวมทั้งหมด</span>
              <span className="text-sm sm:text-base font-bold text-gray-900">
                ฿{totalSum.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Interactive Category List */}
          <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
            {categoriesData.map((cat, idx) => (
              <button
                key={cat.category_id || idx}
                onClick={() => setDrilldownCategory(cat)}
                className="w-full flex items-center justify-between p-1.5 rounded-xl hover:bg-amber-50/70 transition group text-left"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: cat.color || chartColors[idx % chartColors.length] }}
                  />
                  <div className="truncate">
                    <span className="text-xs font-medium text-gray-800 group-hover:text-[#D97706] transition">
                      {cat.name}
                    </span>
                    <span className="text-[10px] text-gray-400 ml-1.5">({cat.count} รายการ)</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <span className="text-xs font-bold text-gray-900">
                    ฿{cat.total.toLocaleString()}
                  </span>
                  <span className="text-[10px] text-gray-500 font-medium w-9 text-right">
                    {cat.percentage}%
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-[#D97706] transition" />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
