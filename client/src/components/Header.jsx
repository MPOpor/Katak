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
  History,
  Cloud,
  LogIn
} from 'lucide-react';
import GoogleLoginModal from './modals/GoogleLoginModal';

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
    setIsGoogleSyncModalOpen,
    googleStatus,
    overview
  } = useApp();

  const [isWsDropdownOpen, setIsWsDropdownOpen] = useState(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [isGoogleLoginOpen, setIsGoogleLoginOpen] = useState(false);

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

        {/* Right Actions: Cloud Sync, Audit Trail, LINE Simulator, Switch User, Frame Mode */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Google Drive & Sheets Cloud Sync Button */}
          <button
            onClick={() => setIsGoogleSyncModalOpen(true)}
            title="ซิงค์ Google Drive & Sheets"
            className="p-2 rounded-full bg-amber-50 border border-amber-300 text-[#D97706] hover:bg-amber-100 shadow-sm transition flex items-center gap-1 group"
          >
            <Cloud className="w-4 h-4 text-[#D97706]" />
            <span className="hidden md:inline text-[11px] font-bold text-[#D97706]">Google Sync</span>
          </button>

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

                {/* Google Sign In Button in Dropdown */}
                <div className="border-t border-gray-100 mt-2 pt-2">
                  <button
                    onClick={() => {
                      setIsGoogleLoginOpen(true);
                      setIsUserDropdownOpen(false);
                    }}
                    className="w-full flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold text-gray-700 hover:bg-amber-50 rounded-xl transition border border-gray-200 shadow-sm"
                  >
                    <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                    <span>เข้าสู่ระบบด้วย Google</span>
                  </button>
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

      {/* Google Login Modal */}
      <GoogleLoginModal
        isOpen={isGoogleLoginOpen}
        onClose={() => setIsGoogleLoginOpen(false)}
      />
    </header>
  );
}
