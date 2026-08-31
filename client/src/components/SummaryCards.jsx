import React from 'react';
import { useApp } from '../context/AppContext';
import { TrendingUp, TrendingDown, Wallet, AlertTriangle, CheckCircle, ShieldAlert } from 'lucide-react';

export default function SummaryCards() {
  const { overview, currentWorkspace, setIsLinePreviewOpen } = useApp();

  const totalIncome = overview?.totalIncome || 0;
  const totalExpense = overview?.totalExpense || 0;
  const netBalance = overview?.netBalance || 0;
  const budgetLimit = overview?.budgetLimit || 0;
  const budgetUsedPercent = overview?.budgetUsedPercent || 0;
  const budgetRemaining = overview?.budgetRemaining || 0;
  const budgetStatus = overview?.budgetStatus || 'normal';

  return (
    <div className="px-4 py-2 space-y-3 max-w-4xl mx-auto">
      {/* 3 Metric Cards */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {/* Income Card */}
        <div className="bg-white rounded-2xl p-3 sm:p-4 border border-[#FDE68A] shadow-soft relative overflow-hidden transition hover:shadow-md">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] sm:text-xs font-medium text-gray-500">รายรับรวม</span>
            <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            </div>
          </div>
          <div className="text-sm sm:text-lg font-bold text-emerald-600 truncate">
            ฿{totalIncome.toLocaleString()}
          </div>
          <div className="text-[10px] text-gray-400 mt-0.5">
            {overview?.incomeCount || 0} รายการ
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-500 rounded-b-2xl" />
        </div>

        {/* Expense Card */}
        <div className="bg-white rounded-2xl p-3 sm:p-4 border border-[#FDE68A] shadow-soft relative overflow-hidden transition hover:shadow-md">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] sm:text-xs font-medium text-gray-500">รายจ่ายรวม</span>
            <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center">
              <TrendingDown className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            </div>
          </div>
          <div className="text-sm sm:text-lg font-bold text-rose-600 truncate">
            ฿{totalExpense.toLocaleString()}
          </div>
          <div className="text-[10px] text-gray-400 mt-0.5">
            {overview?.expenseCount || 0} รายการ
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-rose-500 rounded-b-2xl" />
        </div>

        {/* Net Balance Card */}
        <div className="bg-white rounded-2xl p-3 sm:p-4 border border-[#FDE68A] shadow-soft relative overflow-hidden transition hover:shadow-md">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] sm:text-xs font-medium text-gray-500">คงเหลือสุทธิ</span>
            <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-amber-50 text-[#D97706] flex items-center justify-center">
              <Wallet className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            </div>
          </div>
          <div className={`text-sm sm:text-lg font-bold truncate ${netBalance >= 0 ? 'text-gray-900' : 'text-red-600'}`}>
            {netBalance >= 0 ? `฿${netBalance.toLocaleString()}` : `-฿${Math.abs(netBalance).toLocaleString()}`}
          </div>
          <div className="text-[10px] text-gray-400 mt-0.5 truncate">
            {netBalance >= 0 ? 'กระแสเงินสดบวก' : 'รายจ่ายเกินรายรับ'}
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#F59E0B] rounded-b-2xl" />
        </div>
      </div>

      {/* Budget Tracker Progress Card */}
      {budgetLimit > 0 && (
        <div className={`rounded-2xl p-3 sm:p-4 border transition-all ${
          budgetStatus === 'exceeded'
            ? 'bg-red-50/70 border-red-200'
            : budgetStatus === 'warning'
            ? 'bg-amber-50/70 border-amber-200'
            : 'bg-white border-[#FDE68A] shadow-soft'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="text-xs font-semibold text-gray-800 flex items-center gap-1.5">
                <span>งบประมาณรายเดือน</span>
                {budgetStatus === 'exceeded' && (
                  <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-bold animate-pulse">
                    <ShieldAlert className="w-3 h-3" /> เกินงบที่กำหนด!
                  </span>
                )}
                {budgetStatus === 'warning' && (
                  <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold">
                    <AlertTriangle className="w-3 h-3" /> ใกล้เต็ม ({budgetUsedPercent}%)
                  </span>
                )}
                {budgetStatus === 'normal' && (
                  <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-semibold">
                    <CheckCircle className="w-3 h-3" /> ปกติ ({budgetUsedPercent}%)
                  </span>
                )}
              </div>
            </div>

            <button
              onClick={() => setIsLinePreviewOpen(true)}
              className="text-[11px] text-[#06C755] font-semibold hover:underline flex items-center gap-1"
            >
              ทดสอบแจ้งเตือน LINE
            </button>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden mb-2">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                budgetStatus === 'exceeded'
                  ? 'bg-red-500'
                  : budgetStatus === 'warning'
                  ? 'bg-amber-500'
                  : 'bg-gradient-to-r from-yellow-300 via-amber-400 to-[#F59E0B]'
              }`}
              style={{ width: `${Math.min(budgetUsedPercent, 100)}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-gray-600">
            <span>ใช้ไปแล้ว: <strong className="text-gray-900">฿{totalExpense.toLocaleString()}</strong></span>
            <span>เป้าหมายงบ: <strong className="text-gray-900">฿{budgetLimit.toLocaleString()}</strong></span>
            <span>คงเหลือ: <strong className={budgetRemaining >= 0 ? 'text-emerald-600' : 'text-red-600'}>
              ฿{budgetRemaining.toLocaleString()}
            </strong></span>
          </div>
        </div>
      )}
    </div>
  );
}
