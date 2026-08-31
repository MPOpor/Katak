import React, { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  apiGetWorkspaceDetails,
  apiUpdateMemberRole,
  apiGetInvite,
  apiJoinWorkspace
} from '../../services/api';
import {
  Users,
  Shield,
  UserCheck,
  QrCode,
  Copy,
  Check,
  X,
  Plus,
  Lock,
  Unlock,
  Key
} from 'lucide-react';

export default function MembersModal() {
  const {
    isMembersModalOpen,
    setIsMembersModalOpen,
    currentWorkspace,
    currentUser,
    refreshData,
    showToast
  } = useApp();

  const [members, setMembers] = useState([]);
  const [inviteData, setInviteData] = useState(null);
  const [copied, setCopied] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchMembers = async () => {
    if (!currentWorkspace) return;
    setLoading(true);
    try {
      const details = await apiGetWorkspaceDetails(currentWorkspace.id);
      setMembers(details.members || []);

      const inv = await apiGetInvite(currentWorkspace.id);
      setInviteData(inv);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isMembersModalOpen) {
      fetchMembers();
    }
  }, [isMembersModalOpen, currentWorkspace]);

  if (!isMembersModalOpen) return null;

  const isOwner = currentWorkspace?.user_role === 'owner';

  // Toggle Member Permissions (RBAC)
  const handleTogglePermission = async (member, field) => {
    if (!isOwner) {
      showToast('เฉพาะเจ้าของพื้นที่ (Owner) เท่านั้นที่สามารถปรับเปลี่ยนสิทธิ์ได้', 'error');
      return;
    }

    const updated = {
      can_add: member.can_add,
      can_edit: member.can_edit,
      can_delete: member.can_delete,
      can_view_reports: member.can_view_reports,
      role: member.role,
      [field]: member[field] ? 0 : 1
    };

    try {
      await apiUpdateMemberRole(currentWorkspace.id, member.user_id, updated);
      showToast('ปรับสิทธิ์สมาชิกสำเร็จ', 'success');
      fetchMembers();
      refreshData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleCopyInvite = () => {
    if (inviteData?.inviteUrl) {
      navigator.clipboard.writeText(inviteData.inviteUrl);
      setCopied(true);
      showToast('คัดลอกลิงก์คำเชิญเรียบร้อยแล้ว', 'success');
      setTimeout(() => setCopied(false), 3000);
    }
  };

  const handleJoinByCode = async (e) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    try {
      await apiJoinWorkspace(joinCode.trim());
      showToast('เข้าร่วมพื้นที่การเงินสำเร็จ!', 'success');
      setJoinCode('');
      refreshData();
      setIsMembersModalOpen(false);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-pop-in">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-amber-200 overflow-hidden my-auto animate-slide-up">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-50 via-white to-amber-50 px-5 py-3.5 border-b border-amber-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-[#F59E0B] text-white flex items-center justify-center shadow-md">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">
                จัดการสมาชิกและสิทธิ์ (RBAC)
              </h3>
              <p className="text-[11px] text-gray-500">
                {currentWorkspace?.name} • สิทธิ์ของคุณ: <strong className="text-amber-700 uppercase">{currentWorkspace?.user_role}</strong>
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsMembersModalOpen(false)}
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* 1. Invite Link & QR Code Box */}
          <div className="bg-gradient-to-br from-amber-50/80 to-yellow-50/80 p-4 rounded-2xl border border-amber-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                <QrCode className="w-4 h-4 text-[#D97706]" /> ลิงก์คำเชิญสมาชิกเข้ากลุ่ม (LINE / QR)
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-white font-mono font-bold text-gray-700 shadow-2xs">
                Code: {inviteData?.invite_code || '...'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={inviteData?.inviteUrl || 'https://liff.line.me/...'}
                className="flex-1 px-3 py-1.5 text-xs bg-white border border-gray-200 rounded-xl text-gray-600 focus:outline-none"
              />
              <button
                onClick={handleCopyInvite}
                className="px-3 py-1.5 bg-[#F59E0B] hover:bg-amber-600 text-white rounded-xl text-xs font-semibold flex items-center gap-1 shadow-sm transition"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'คัดลอกแล้ว' : 'คัดลอก'}
              </button>
            </div>
          </div>

          {/* 2. Members List & RBAC Toggles */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-gray-800">
                รายชื่อสมาชิกในพื้นที่ ({members.length} คน)
              </span>
              {!isOwner && (
                <span className="text-[10px] text-amber-600 font-medium flex items-center gap-1">
                  <Lock className="w-3 h-3" /> เฉพาะ Owner ปรับสิทธิ์ได้
                </span>
              )}
            </div>

            <div className="space-y-2">
              {members.map((m) => (
                <div
                  key={m.id}
                  className="p-3 bg-[#FFFDF0] rounded-2xl border border-amber-100 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <img
                        src={m.picture_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'}
                        alt={m.display_name}
                        className="w-8 h-8 rounded-full object-cover border border-gray-200"
                      />
                      <div>
                        <div className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                          {m.display_name}
                          {m.user_id === currentUser?.id && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 font-medium">คุณ</span>
                          )}
                        </div>
                        <div className="text-[10px] text-gray-400">
                          เข้าร่วม: {m.joined_at?.split(' ')[0]}
                        </div>
                      </div>
                    </div>

                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                      m.role === 'owner' ? 'bg-amber-100 text-[#D97706]' : 'bg-gray-100 text-gray-700'
                    }`}>
                      {m.role}
                    </span>
                  </div>

                  {/* RBAC Permission Chips */}
                  <div className="flex items-center gap-1.5 pt-1 text-[10px] border-t border-gray-100">
                    <span className="text-gray-400 font-medium">สิทธิ์:</span>

                    <button
                      type="button"
                      onClick={() => handleTogglePermission(m, 'can_add')}
                      disabled={!isOwner || m.role === 'owner'}
                      className={`px-2 py-0.5 rounded-md font-medium transition ${
                        m.can_add ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-400 line-through'
                      }`}
                    >
                      เพิ่มรายการ
                    </button>

                    <button
                      type="button"
                      onClick={() => handleTogglePermission(m, 'can_edit')}
                      disabled={!isOwner || m.role === 'owner'}
                      className={`px-2 py-0.5 rounded-md font-medium transition ${
                        m.can_edit ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-400 line-through'
                      }`}
                    >
                      แก้ไข
                    </button>

                    <button
                      type="button"
                      onClick={() => handleTogglePermission(m, 'can_delete')}
                      disabled={!isOwner || m.role === 'owner'}
                      className={`px-2 py-0.5 rounded-md font-medium transition ${
                        m.can_delete ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-400 line-through'
                      }`}
                    >
                      ลบรายการ
                    </button>

                    <button
                      type="button"
                      onClick={() => handleTogglePermission(m, 'can_view_reports')}
                      disabled={!isOwner || m.role === 'owner'}
                      className={`px-2 py-0.5 rounded-md font-medium transition ${
                        m.can_view_reports ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-400 line-through'
                      }`}
                    >
                      ดูรายงาน
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 3. Join another workspace using Invite Code */}
          <div className="border-t border-gray-100 pt-3">
            <span className="text-xs font-bold text-gray-800 block mb-1.5">
              เข้าร่วมพื้นที่อื่นด้วยรหัสคำเชิญ (Invite Code)
            </span>
            <form onSubmit={handleJoinByCode} className="flex items-center gap-2">
              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                placeholder="กรอกรหัสคำเชิญ เช่น THANACHOTE-2026"
                className="flex-1 px-3 py-1.5 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#6366F1]"
              />
              <button
                type="submit"
                className="px-4 py-1.5 bg-[#6366F1] hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm transition"
              >
                เข้าร่วม
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
