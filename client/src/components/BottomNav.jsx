import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  LayoutDashboard,
  ReceiptText,
  Plus,
  Users,
  Settings,
  Camera,
  Mic,
  Edit,
  Sparkles,
  X
} from 'lucide-react';

export default function BottomNav() {
  const {
    activeTab,
    setActiveTab,
    setIsOCRModalOpen,
    setIsVoiceModalOpen,
    setIsManualModalOpen,
    currentWorkspace
  } = useApp();

  const [isFabMenuOpen, setIsFabMenuOpen] = useState(false);

  const navItems = [
    { id: 'summaries', label: 'สรุปภาพรวม', icon: LayoutDashboard },
    { id: 'transactions', label: 'รายการ', icon: ReceiptText },
    { id: 'fab', label: '', icon: Plus, isFab: true },
    { id: 'members', label: 'สมาชิก/สิทธิ์', icon: Users },
    { id: 'manage', label: 'จัดการระบบ', icon: Settings },
  ];

  const handleNavClick = (item) => {
    if (item.isFab) {
      setIsFabMenuOpen(!isFabMenuOpen);
    } else {
      setActiveTab(item.id);
      setIsFabMenuOpen(false);
    }
  };

  return (
    <>
      {/* Pop-up Smart Data Input Action Menu */}
      {isFabMenuOpen && (
        <div
          onClick={() => setIsFabMenuOpen(false)}
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs flex items-end justify-center pb-24 px-4 animate-pop-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm bg-white rounded-3xl p-4 shadow-2xl border border-amber-200 space-y-2.5 animate-slide-up"
          >
            <div className="flex items-center justify-between px-2 pb-1 border-b border-gray-100">
              <span className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-[#F59E0B]" /> นำเข้าข้อมูลอัจฉริยะ (Smart Input)
              </span>
              <button
                onClick={() => setIsFabMenuOpen(false)}
                className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-1">
              {/* Option 1: OCR Slip Scanner */}
              <button
                onClick={() => {
                  setIsFabMenuOpen(false);
                  setIsOCRModalOpen(true);
                }}
                className="flex flex-col items-center justify-center p-3 rounded-2xl bg-amber-50/90 hover:bg-amber-100/90 border border-amber-200 transition group text-center"
              >
                <div className="w-11 h-11 rounded-full bg-[#F59E0B] text-white flex items-center justify-center shadow-md group-hover:scale-105 transition">
                  <Camera className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-gray-900 mt-2">สแกนสลิป</span>
                <span className="text-[9px] text-[#D97706] font-semibold">OCR อัตโนมัติ</span>
              </button>

              {/* Option 2: Thai Voice Input */}
              <button
                onClick={() => {
                  setIsFabMenuOpen(false);
                  setIsVoiceModalOpen(true);
                }}
                className="flex flex-col items-center justify-center p-3 rounded-2xl bg-blue-50/80 hover:bg-blue-100/80 border border-blue-100 transition group text-center"
              >
                <div className="w-11 h-11 rounded-full bg-[#3B82F6] text-white flex items-center justify-center shadow-md group-hover:scale-105 transition">
                  <Mic className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-gray-900 mt-2">สั่งด้วยเสียง</span>
                <span className="text-[9px] text-[#3B82F6] font-semibold">ภาษาไทย STT</span>
              </button>

              {/* Option 3: Manual Entry Form */}
              <button
                onClick={() => {
                  setIsFabMenuOpen(false);
                  setIsManualModalOpen(true);
                }}
                className="flex flex-col items-center justify-center p-3 rounded-2xl bg-emerald-50/80 hover:bg-emerald-100/80 border border-emerald-100 transition group text-center"
              >
                <div className="w-11 h-11 rounded-full bg-[#10B981] text-white flex items-center justify-center shadow-md group-hover:scale-105 transition">
                  <Edit className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-gray-900 mt-2">กรอกแบบฟอร์ม</span>
                <span className="text-[9px] text-[#10B981] font-semibold">แป้นคิดเลข</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Nav Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-[#FFFDF7]/95 backdrop-blur-md border-t border-[#FDE68A] px-4 py-2">
        <div className="max-w-md mx-auto flex items-center justify-around">
          {navItems.map((item) => {
            const Icon = item.icon;
            if (item.isFab) {
              return (
                <div key="fab" className="relative -top-5">
                  <button
                    onClick={() => handleNavClick(item)}
                    className="w-13 h-13 sm:w-14 sm:h-14 rounded-full bg-gradient-to-tr from-[#D97706] via-[#F59E0B] to-[#FBBF24] text-white flex items-center justify-center shadow-float hover:scale-105 active:scale-95 transition-transform border-4 border-white"
                  >
                    <Plus className={`w-6 h-6 transition-transform duration-200 ${isFabMenuOpen ? 'rotate-45' : ''}`} />
                  </button>
                </div>
              );
            }

            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item)}
                className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all ${
                  isActive ? 'text-[#D97706]' : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110' : ''}`} />
                <span className={`text-[10px] mt-0.5 ${isActive ? 'font-bold' : 'font-medium'}`}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
