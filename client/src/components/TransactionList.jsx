import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { apiGetTransactions, apiDeleteTransaction, apiGetExportCsvUrl } from '../services/api';
import {
  Search,
  Filter,
  Camera,
  Mic,
  Edit3,
  Trash2,
  Image as ImageIcon,
  CheckCircle2,
  User,
  ShoppingBag,
  Package,
  Zap,
  Home,
  UserCheck,
  Briefcase,
  Coffee,
  Car,
  ShoppingCart,
  HeartPulse,
  Tag,
  X,
  Cloud,
  Download,
  ExternalLink
} from 'lucide-react';

export default function TransactionList({ filterKeyword, onClearKeyword }) {
  const {
    currentWorkspace,
    currentUser,
    period,
    startDate,
    endDate,
    refreshData,
    showToast
  } = useApp();

  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState(filterKeyword || '');
  const [typeFilter, setTypeFilter] = useState('all'); // 'all', 'income', 'expense'
  const [selectedSlip, setSelectedSlip] = useState(null); // For slip image popup modal

  // Fetch transactions
  const fetchTxs = async () => {
    if (!currentWorkspace) return;
    setLoading(true);
    try {
      const data = await apiGetTransactions({
        workspace_id: currentWorkspace.id,
        period,
        startDate,
        endDate,
        type: typeFilter !== 'all' ? typeFilter : undefined,
        search: search || undefined
      });
      setTransactions(data || []);
    } catch (err) {
      console.error('Error fetching transactions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTxs();
  }, [currentWorkspace, period, startDate, endDate, typeFilter, search]);

  useEffect(() => {
    if (filterKeyword !== undefined) {
      setSearch(filterKeyword);
    }
  }, [filterKeyword]);

  // Handle Delete (RBAC verified by backend)
  const handleDelete = async (id) => {
    if (!window.confirm('คุณต้องการลบรายการนี้ใช่หรือไม่?')) return;
    try {
      await apiDeleteTransaction(id);
      showToast('ลบรายการสำเร็จ', 'success');
      fetchTxs();
      refreshData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Group transactions by date
  const groupedTxs = transactions.reduce((groups, tx) => {
    const d = tx.transaction_date;
    if (!groups[d]) groups[d] = [];
    groups[d].push(tx);
    return groups;
  }, {});

  const formatDateHeader = (dateStr) => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const yesterday = new Date();
    yesterday.setDate(now.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const parts = dateStr.split('-');
    const day = parseInt(parts[2], 10);
    const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    const mName = months[parseInt(parts[1], 10) - 1];
    const yearTh = parseInt(parts[0], 10) + 543;

    if (dateStr === todayStr) return `วันนี้ (${day} ${mName} ${yearTh})`;
    if (dateStr === yesterdayStr) return `เมื่อวาน (${day} ${mName} ${yearTh})`;
    return `${day} ${mName} ${yearTh}`;
  };

  return (
    <div className="bg-white rounded-2xl p-4 border border-[#FDE68A] shadow-soft space-y-4">
      {/* Search & Filter Header */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ค้นหาตามชื่อ, หมายเหตุ หรือผู้ลงรายการ..."
            className="w-full pl-9 pr-8 py-2 text-xs bg-[#FFFDF0] border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#F59E0B]"
          />
          {search && (
            <button
              onClick={() => {
                setSearch('');
                if (onClearKeyword) onClearKeyword();
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Type Filter Pills & Export CSV */}
        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <div className="flex items-center bg-gray-100 p-0.5 rounded-xl text-xs">
            <button
              onClick={() => setTypeFilter('all')}
              className={`px-3 py-1.5 rounded-lg font-medium transition ${
                typeFilter === 'all' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
              }`}
            >
              ทั้งหมด
            </button>
            <button
              onClick={() => setTypeFilter('income')}
              className={`px-3 py-1.5 rounded-lg font-medium transition ${
                typeFilter === 'income' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500'
              }`}
            >
              รายรับ
            </button>
            <button
              onClick={() => setTypeFilter('expense')}
              className={`px-3 py-1.5 rounded-lg font-medium transition ${
                typeFilter === 'expense' ? 'bg-white text-rose-600 shadow-sm' : 'text-gray-500'
              }`}
            >
              รายจ่าย
            </button>
          </div>

          {/* Export CSV Download Link */}
          <a
            href={apiGetExportCsvUrl({ workspace_id: currentWorkspace?.id, period, startDate, endDate })}
            download
            title="ส่งออกรายงานรายการทั้งหมดเป็น CSV สำหรับ Excel"
            className="px-2.5 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-[#D97706] font-semibold text-xs border border-amber-200 flex items-center gap-1 shadow-sm transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export CSV</span>
          </a>
        </div>
      </div>

      {/* Transaction Feed */}
      {loading ? (
        <div className="py-12 text-center text-xs text-gray-400">
          กำลังโหลดรายการ...
        </div>
      ) : Object.keys(groupedTxs).length === 0 ? (
        <div className="py-12 text-center text-xs text-gray-400 flex flex-col items-center">
          <Tag className="w-8 h-8 text-gray-300 mb-2" />
          ไม่พบรายการธุรกรรมที่ตรงกับเงื่อนไข
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(groupedTxs).map(([dateStr, txList]) => {
            const daySum = txList.reduce((acc, t) => acc + (t.type === 'income' ? t.amount : -t.amount), 0);

            return (
              <div key={dateStr} className="space-y-1.5">
                {/* Date Group Header */}
                <div className="flex items-center justify-between px-1 py-1 text-xs text-gray-500 border-b border-gray-100">
                  <span className="font-semibold text-gray-700">{formatDateHeader(dateStr)}</span>
                  <span className="text-[11px] font-medium">
                    ยอดสุทธิ:{' '}
                    <strong className={daySum >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                      {daySum >= 0 ? `+฿${daySum.toLocaleString()}` : `-฿${Math.abs(daySum).toLocaleString()}`}
                    </strong>
                  </span>
                </div>

                {/* Items */}
                <div className="divide-y divide-gray-50">
                  {txList.map((tx) => {
                    const isOwner = currentWorkspace?.user_role === 'owner';
                    const canDelete = isOwner || currentWorkspace?.can_delete;

                    return (
                      <div
                        key={tx.id}
                        className="py-2.5 px-2 hover:bg-pink-50/40 rounded-xl transition flex items-center justify-between gap-3 group"
                      >
                        {/* Left Icon & Category */}
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-white shadow-sm"
                            style={{ backgroundColor: tx.category_color || '#3B82F6' }}
                          >
                            <ShoppingBag className="w-4 h-4" />
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-semibold text-gray-900 truncate">
                                {tx.category_name || 'ทั่วไป'}
                              </span>

                              {/* Input method badge */}
                              {tx.input_method === 'ocr' && (
                                <span className="inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.2 rounded bg-purple-100 text-purple-700 font-medium">
                                  <Camera className="w-2.5 h-2.5" /> OCR
                                </span>
                              )}
                              {tx.input_method === 'voice' && (
                                <span className="inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.2 rounded bg-blue-100 text-blue-700 font-medium">
                                  <Mic className="w-2.5 h-2.5" /> เสียง
                                </span>
                              )}
                            </div>

                            {/* Note */}
                            {tx.note && (
                              <p className="text-[11px] text-gray-500 truncate max-w-[200px] sm:max-w-[340px]">
                                {tx.note}
                              </p>
                            )}

                            {/* Author & Audit Tag */}
                            <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-gray-400">
                              <span className="flex items-center gap-1">
                                <User className="w-2.5 h-2.5" />
                                {tx.user_name || 'ผู้ใช้'}
                              </span>
                              {tx.slip_url && (
                                tx.slip_url.includes('drive.google.com') ? (
                                  <a
                                    href={tx.slip_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:underline flex items-center gap-0.5 font-medium ml-1 bg-blue-50 px-1.5 py-0.5 rounded"
                                  >
                                    <Cloud className="w-2.5 h-2.5" /> Drive <ExternalLink className="w-2 h-2" />
                                  </a>
                                ) : (
                                  <button
                                    onClick={() => setSelectedSlip(tx.slip_url)}
                                    className="text-[#D97706] hover:underline flex items-center gap-0.5 font-medium ml-1"
                                  >
                                    <ImageIcon className="w-2.5 h-2.5" /> ดูสลิป
                                  </button>
                                )
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Right Amount & Actions */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <div className="text-right">
                            <div
                              className={`text-xs sm:text-sm font-bold ${
                                tx.type === 'income' ? 'text-emerald-600' : 'text-rose-600'
                              }`}
                            >
                              {tx.type === 'income' ? '+' : '-'}฿{tx.amount.toLocaleString()}
                            </div>
                          </div>

                          {/* Delete button (RBAC controlled) */}
                          {canDelete && (
                            <button
                              onClick={() => handleDelete(tx.id)}
                              title="ลบรายการ"
                              className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition opacity-0 group-hover:opacity-100"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Slip Image Zoom Modal */}
      {selectedSlip && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-pop-in">
          <div className="bg-white rounded-3xl p-4 max-w-sm w-full shadow-2xl relative border border-amber-200">
            <button
              onClick={() => setSelectedSlip(null)}
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 transition"
            >
              <X className="w-4 h-4" />
            </button>
            <h4 className="text-xs font-bold text-gray-900 mb-3 flex items-center gap-1.5">
              <Camera className="w-4 h-4 text-[#D97706]" /> สลิปหลักฐานการโอน / ใบเสร็จ
            </h4>
            <div className="rounded-2xl overflow-hidden border border-gray-100 bg-gray-50 flex items-center justify-center max-h-[500px]">
              <img
                src={selectedSlip}
                alt="Slip Preview"
                className="w-full h-auto object-contain max-h-[480px]"
              />
            </div>
            <div className="mt-3 text-center">
              <button
                onClick={() => setSelectedSlip(null)}
                className="w-full py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-xs font-semibold transition"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
