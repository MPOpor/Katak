import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  ChevronDown,
  Store,
  Wallet,
  Users,
  Plus,
  Bell,
  Smartphone,
  Monitor,
  Shield,
  UserCheck,
  Sparkles,
  History
} from 'lucide-react';

export default function Header() {
  const {
    currentUser,
    allUsers,
    workspaces,
    currentWorkspace,
    isMobileFrame,
    handleSwitchUser,
    handleSwitchWorkspace,
    setIsMobileFrame,
    setIsWorkspaceModalOpen,
    setIsAuditModalOpen,
    setIsLinePreviewOpen,
    overview
  } = useApp();

  const [isWsDropdownOpen, setIsWsDropdownOpen] = useState(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);

  const getWorkspaceIcon = (type) => {
    if (type === 'merchant') return <Store className="w-4 h-4 text-[#D97706]" />;
    if (type === 'group') return <Users className="w-4 h-4 text-[#6366F1]" />;
    return <Wallet className="w-4 h-4 text-[#10B981]" />;
  };

  const getWorkspaceTypeBadge = (type) => {
    if (type === 'merchant') return <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-medium">ร้านค้า SME</span>;
    if (type === 'group') return <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 font-medium">กลุ่ม/บ้าน</span>;
    return <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 font-medium">ส่วนบุคคล</span>;
  };

  return (
    <header className="sticky top-0 z-40 bg-[#FEFDF5]/95 backdrop-blur-md border-b border-[#FDE68A] px-4 py-2.5">
      <div className="max-w-4xl mx-auto flex items-center justify-between gap-2">
        {/* Left: Workspace Selector */}
        <div className="relative">
          <button
            onClick={() => {
              setIsWsDropdownOpen(!isWsDropdownOpen);
              setIsUserDropdownOpen(false);
            }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-[#FDE68A] shadow-sm hover:border-[#F59E0B] transition-all text-left"
          >
            <div className="w-7 h-7 rounded-full bg-amber-50 flex items-center justify-center border border-amber-200">
              {currentWorkspace ? getWorkspaceIcon(currentWorkspace.type) : <Store className="w-4 h-4 text-amber-600" />}
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-amber-800/80 font-normal leading-tight">พื้นที่การเงิน</span>
              <span className="text-sm font-semibold text-gray-900 leading-tight max-w-[150px] sm:max-w-[220px] truncate">
                {currentWorkspace ? currentWorkspace.name : 'กำลังโหลด...'}
              </span>
            </div>
            <ChevronDown className="w-4 h-4 text-gray-400 ml-1" />
          </button>

          {/* Workspace Dropdown */}
          {isWsDropdownOpen && (
            <div className="absolute left-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-[#FDE68A] p-2 z-50 animate-pop-in">
              <div className="text-[11px] font-semibold text-gray-400 px-3 py-1.5 uppercase tracking-wider">
                เลือกพื้นที่การเงิน (Workspaces)
              </div>
              <div className="space-y-1">
                {workspaces.map((ws) => (
                  <button
                    key={ws.id}
                    onClick={() => {
                      handleSwitchWorkspace(ws);
                      setIsWsDropdownOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition-all ${
                      currentWorkspace?.id === ws.id
                        ? 'bg-amber-50 text-[#D97706] font-semibold'
                        : 'hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center">
                        {getWorkspaceIcon(ws.type)}
                      </div>
                      <div>
                        <div className="text-xs font-medium">{ws.name}</div>
                        <div className="text-[10px] text-gray-400">{ws.member_count || 1} สมาชิก</div>
                      </div>
                    </div>
                    {getWorkspaceTypeBadge(ws.type)}
                  </button>
                ))}
              </div>

              <div className="border-t border-gray-100 mt-2 pt-2">
                <button
                  onClick={() => {
                    setIsWorkspaceModalOpen(true);
                    setIsWsDropdownOpen(false);
                  }}
                  className="w-full flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-medium text-[#D97706] hover:bg-amber-50 rounded-xl transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  สร้างพื้นที่การเงินใหม่
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Actions: Audit Trail, LINE Simulator, Switch User, Frame Mode */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Audit Trail Button */}
          <button
            onClick={() => setIsAuditModalOpen(true)}
            title="ประวัติการทำรายการ (Audit Trail)"
            className="p-2 rounded-full bg-white border border-[#FDE68A] text-gray-600 hover:text-[#D97706] hover:border-[#F59E0B] shadow-sm transition"
          >
            <History className="w-4 h-4" />
          </button>

          {/* LINE Notification Simulator Button */}
          <button
            onClick={() => setIsLinePreviewOpen(true)}
            title="จำลองแจ้งเตือน LINE Flex Message"
            className="relative p-2 rounded-full bg-[#06C755]/10 border border-[#06C755]/30 text-[#06C755] hover:bg-[#06C755] hover:text-white shadow-sm transition"
          >
            <Bell className="w-4 h-4" />
            {overview?.budgetStatus === 'exceeded' && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full animate-ping" />
            )}
          </button>

          {/* User Profile Switcher */}
          <div className="relative">
            <button
              onClick={() => {
                setIsUserDropdownOpen(!isUserDropdownOpen);
                setIsWsDropdownOpen(false);
              }}
              className="flex items-center gap-1.5 p-1 sm:px-2.5 sm:py-1 rounded-full bg-white border border-[#FDE68A] shadow-sm hover:border-[#F59E0B] transition text-left"
            >
              <img
                src={currentUser?.picture_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                alt="Profile"
                className="w-6 h-6 rounded-full object-cover border border-amber-200"
              />
              <span className="hidden sm:inline text-xs font-medium text-gray-800 max-w-[90px] truncate">
                {currentUser?.display_name?.split(' ')[0] || 'ผู้ใช้'}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
            </button>

            {/* User Dropdown */}
            {isUserDropdownOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-[#FDE68A] p-2 z-50 animate-pop-in">
                <div className="text-[11px] font-semibold text-gray-400 px-3 py-1.5 uppercase tracking-wider">
                  สลับผู้ใช้งาน (Role Switcher)
                </div>
                <div className="space-y-1">
                  {allUsers.map((u) => (
                    <button
                      key={u.id}
                      onClick={() => {
                        handleSwitchUser(u.id);
                        setIsUserDropdownOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition-all ${
                        currentUser?.id === u.id
                          ? 'bg-amber-50 text-[#D97706] font-semibold'
                          : 'hover:bg-gray-50 text-gray-700'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <img
                          src={u.picture_url}
                          alt={u.display_name}
                          className="w-7 h-7 rounded-full object-cover border border-gray-200"
                        />
                        <div>
                          <div className="text-xs font-medium">{u.display_name}</div>
                          <div className="text-[10px] text-gray-400">{u.role}</div>
                        </div>
                      </div>
                      {currentUser?.id === u.id && <UserCheck className="w-4 h-4 text-[#D97706]" />}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Toggle Mobile Frame / Responsive Web */}
          <button
            onClick={() => setIsMobileFrame(!isMobileFrame)}
            title={isMobileFrame ? 'ขยายเป็น Web App เต็มจอ' : 'ย่อเป็นกรอบมือถือ (LIFF View)'}
            className="hidden sm:flex p-2 rounded-full bg-white border border-[#FDE68A] text-gray-600 hover:text-[#D97706] hover:border-[#F59E0B] shadow-sm transition"
          >
            {isMobileFrame ? <Monitor className="w-4 h-4" /> : <Smartphone className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </header>
  );
}
