import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { apiGetTransactions } from '../services/api';
import { X, Tag, ShoppingBag, ArrowUpRight, ArrowDownLeft, Image as ImageIcon } from 'lucide-react';

export default function DrilldownDrawer() {
  const {
    drilldownCategory,
    setDrilldownCategory,
    currentWorkspace,
    period,
    startDate,
    endDate
  } = useApp();

  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!drilldownCategory || !currentWorkspace) return;
    const fetchCategoryTxs = async () => {
      setLoading(true);
      try {
        const data = await apiGetTransactions({
          workspace_id: currentWorkspace.id,
          category_id: drilldownCategory.category_id,
          period,
          startDate,
          endDate
        });
        setTransactions(data || []);
      } catch (err) {
        console.error('Error fetching drilldown transactions:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchCategoryTxs();
  }, [drilldownCategory, currentWorkspace, period, startDate, endDate]);

  if (!drilldownCategory) return null;

  const totalAmount = transactions.reduce((acc, t) => acc + t.amount, 0);

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-pop-in">
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-amber-200 max-h-[85vh] flex flex-col animate-slide-up"
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-sm"
              style={{ backgroundColor: drilldownCategory.color || '#F59E0B' }}
            >
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-gray-400 font-medium">เจาะลึกรายการ (Drill-down)</div>
              <h3 className="text-sm sm:text-base font-bold text-gray-900">
                {drilldownCategory.name}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-[10px] text-gray-400">ยอดรวมหมวดนี้</div>
              <div className="text-sm sm:text-base font-bold text-[#D97706]">
                ฿{totalAmount.toLocaleString()}
              </div>
            </div>
            <button
              onClick={() => setDrilldownCategory(null)}
              className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content List */}
        <div className="p-4 overflow-y-auto space-y-2 flex-1">
          {loading ? (
            <div className="py-8 text-center text-xs text-gray-400">
              กำลังโหลดรายการเจาะลึก...
            </div>
          ) : transactions.length === 0 ? (
            <div className="py-8 text-center text-xs text-gray-400">
              ไม่พบรายการในหมวดหมู่นี้
            </div>
          ) : (
            transactions.map((tx) => (
              <div
                key={tx.id}
                className="p-3 bg-[#FFFDF0] rounded-2xl border border-amber-100 flex items-center justify-between gap-3 hover:border-amber-300 transition"
              >
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-gray-800 truncate">
                    {tx.note || tx.category_name}
                  </div>
                  <div className="text-[10px] text-gray-400 mt-0.5">
                    {tx.transaction_date} • ผู้ลงรายการ: {tx.user_name || 'ผู้ใช้'}
                  </div>
                </div>

                <div className="text-right flex-shrink-0">
                  <div
                    className={`text-xs sm:text-sm font-bold ${
                      tx.type === 'income' ? 'text-emerald-600' : 'text-rose-600'
                    }`}
                  >
                    {tx.type === 'income' ? '+' : '-'}฿{tx.amount.toLocaleString()}
                  </div>
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-gray-100 text-gray-500 font-medium">
                    {tx.input_method.toUpperCase()}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-gray-50 rounded-b-3xl border-t border-gray-100 text-center">
          <button
            onClick={() => setDrilldownCategory(null)}
            className="w-full py-2 bg-white hover:bg-gray-100 border border-gray-200 text-gray-700 rounded-xl text-xs font-semibold transition"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
}
