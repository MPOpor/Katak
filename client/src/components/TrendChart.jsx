import React, { useEffect, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import { useApp } from '../context/AppContext';
import { apiGetTrend } from '../services/api';
import { TrendingUp, BarChart2 } from 'lucide-react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function TrendChart() {
  const { currentWorkspace, period, startDate, endDate } = useApp();
  const [trendData, setTrendData] = useState([]);
  const [chartType, setChartType] = useState('line'); // 'line' or 'bar'
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!currentWorkspace) return;
    const fetchTrend = async () => {
      setLoading(true);
      try {
        const data = await apiGetTrend({
          workspace_id: currentWorkspace.id,
          period,
          startDate,
          endDate
        });
        setTrendData(data || []);
      } catch (err) {
        console.error('Error fetching trend:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchTrend();
  }, [currentWorkspace, period, startDate, endDate]);

  // Format labels for Thai date display (e.g. 24 ส.ค.)
  const labels = trendData.map(d => {
    const parts = d.date.split('-');
    if (parts.length === 3) {
      const day = parseInt(parts[2], 10);
      const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
      const mIdx = parseInt(parts[1], 10) - 1;
      return `${day} ${months[mIdx] || ''}`;
    }
    return d.date;
  });

  const chartData = {
    labels,
    datasets: [
      {
        label: 'รายรับ (Income)',
        data: trendData.map(d => d.income),
        borderColor: '#10B981',
        backgroundColor: chartType === 'line' ? 'rgba(16, 185, 129, 0.12)' : '#10B981',
        fill: chartType === 'line',
        tension: 0.35,
        borderRadius: 6,
        pointRadius: 4,
        pointBackgroundColor: '#10B981',
      },
      {
        label: 'รายจ่าย (Expense)',
        data: trendData.map(d => d.expense),
        borderColor: '#EF4444',
        backgroundColor: chartType === 'line' ? 'rgba(239, 68, 68, 0.12)' : '#EF4444',
        fill: chartType === 'line',
        tension: 0.35,
        borderRadius: 6,
        pointRadius: 4,
        pointBackgroundColor: '#EF4444',
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        align: 'end',
        labels: {
          boxWidth: 12,
          usePointStyle: true,
          font: { family: "'Prompt', sans-serif", size: 11 }
        }
      },
      tooltip: {
        callbacks: {
          label: (context) => ` ${context.dataset.label}: ฿${context.parsed.y.toLocaleString()}`
        }
      }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { font: { family: "'Prompt', sans-serif", size: 10 } }
      },
      y: {
        grid: { color: '#F3F4F6' },
        ticks: {
          font: { family: "'Prompt', sans-serif", size: 10 },
          callback: (value) => `฿${value >= 1000 ? (value / 1000) + 'k' : value}`
        }
      }
    }
  };

  return (
    <div className="bg-white rounded-2xl p-4 border border-[#FDE68A] shadow-soft">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center text-[#D97706]">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-gray-900">แนวโน้มกระแสเงินสด (Trend)</h3>
            <p className="text-[10px] text-gray-400">เปรียบเทียบรายรับและรายจ่าย</p>
          </div>
        </div>

        {/* Toggle Line / Bar */}
        <div className="flex items-center bg-gray-100 p-0.5 rounded-lg text-[11px]">
          <button
            onClick={() => setChartType('line')}
            className={`px-2 py-1 rounded-md font-medium transition ${
              chartType === 'line' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
            }`}
          >
            เส้น
          </button>
          <button
            onClick={() => setChartType('bar')}
            className={`px-2 py-1 rounded-md font-medium transition ${
              chartType === 'bar' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
            }`}
          >
            แท่ง
          </button>
        </div>
      </div>

      <div className="h-56 sm:h-64 w-full">
        {loading ? (
          <div className="h-full flex items-center justify-center text-xs text-gray-400">
            กำลังประมวลผลกราฟ...
          </div>
        ) : trendData.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-xs text-gray-400">
            <BarChart2 className="w-8 h-8 text-gray-300 mb-1" />
            ยังไม่มีข้อมูลธุรกรรมในช่วงเวลานี้
          </div>
        ) : chartType === 'line' ? (
          <Line data={chartData} options={chartOptions} />
        ) : (
          <Bar data={chartData} options={chartOptions} />
        )}
      </div>
    </div>
  );
}
