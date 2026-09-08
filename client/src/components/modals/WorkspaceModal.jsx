import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { apiCreateWorkspace } from '../../services/api';
import { Store, Users, Wallet, Plus, X, CheckCircle2 } from 'lucide-react';

export default function WorkspaceModal() {
  const { isWorkspaceModalOpen, setIsWorkspaceModalOpen, refreshWorkspaces, showToast } = useApp();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('merchant');
  const [budgetLimit, setBudgetLimit] = useState('');
  const [processing, setProcessing] = useState(false);

  if (!isWorkspaceModalOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    setProcessing(true);
    try {
      const res = await apiCreateWorkspace({
        name: name.trim(),
        description: description.trim(),
        type,
        budget_limit: parseFloat(budgetLimit || '0')
      });

      showToast(`สร้างพื้นที่ "${name}" สำเร็จ!`, 'success');
      setName('');
      setDescription('');
      setBudgetLimit('');
      setIsWorkspaceModalOpen(false);
      await refreshWorkspaces(res?.data?.id);
    } catch (err) {
      showToast('สร้างพื้นที่การเงินล้มเหลว: ' + err.message, 'error');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-pop-in">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-amber-200 overflow-hidden animate-slide-up">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-50 via-white to-amber-50 px-5 py-3.5 border-b border-amber-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#F59E0B] text-white flex items-center justify-center shadow-md">
              <Plus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">สร้างพื้นที่การเงินใหม่</h3>
              <p className="text-[11px] text-gray-500">แยกกระเป๋าเงินส่วนตัว กลุ่ม และร้านค้า</p>
            </div>
          </div>
          <button
            onClick={() => setIsWorkspaceModalOpen(false)}
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Workspace Type Selector */}
          <div>
            <label className="text-xs font-bold text-gray-700 block mb-1.5">
              ประเภทพื้นที่การเงิน *
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setType('merchant')}
                className={`p-3 rounded-2xl border flex flex-col items-center gap-1.5 transition text-center ${
                  type === 'merchant'
                    ? 'border-[#F59E0B] bg-amber-50/80 text-[#D97706] font-bold shadow-xs'
                    : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                }`}
              >
                <Store className="w-5 h-5" />
                <span className="text-xs">ร้านค้า SME</span>
              </button>

              <button
                type="button"
                onClick={() => setType('group')}
                className={`p-3 rounded-2xl border flex flex-col items-center gap-1.5 transition text-center ${
                  type === 'group'
                    ? 'border-[#6366F1] bg-indigo-50/80 text-[#6366F1] font-bold shadow-xs'
                    : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                }`}
              >
                <Users className="w-5 h-5" />
                <span className="text-xs">กลุ่ม/บ้าน</span>
              </button>

              <button
                type="button"
                onClick={() => setType('personal')}
                className={`p-3 rounded-2xl border flex flex-col items-center gap-1.5 transition text-center ${
                  type === 'personal'
                    ? 'border-[#10B981] bg-emerald-50/80 text-[#10B981] font-bold shadow-xs'
                    : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                }`}
              >
                <Wallet className="w-5 h-5" />
                <span className="text-xs">ส่วนบุคคล</span>
              </button>
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="text-xs font-bold text-gray-700 block mb-1">
              ชื่อพื้นที่การเงิน *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="เช่น ร้านขายของฝาก สาขา 2, เงินกองกลางเพื่อน"
              className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#F59E0B]"
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">
              คำอธิบายรายละเอียด
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="เช่น บัญชีรายรับ-รายจ่ายสาขาใหม่"
              className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl"
            />
          </div>

          {/* Monthly Budget */}
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">
              งบประมาณรายเดือน (บาท)
            </label>
            <input
              type="number"
              value={budgetLimit}
              onChange={(e) => setBudgetLimit(e.target.value)}
              placeholder="เช่น 30000 (0 = ไม่จำกัด)"
              className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl"
            />
          </div>

          <button
            type="submit"
            disabled={processing}
            className="w-full py-2.5 bg-[#F59E0B] hover:bg-amber-600 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center justify-center gap-1.5"
          >
            <CheckCircle2 className="w-4 h-4" /> บันทึกและเริ่มใช้งาน
          </button>
        </form>
      </div>
    </div>
  );
}
