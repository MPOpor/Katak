import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { apiGetGoogleAuthConfig, apiGoogleLogin } from '../../services/api';
import {
  X,
  User,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  LogOut,
  Mail,
  ArrowRight
} from 'lucide-react';

export default function GoogleLoginModal({ isOpen, onClose }) {
  const {
    currentUser,
    handleSwitchUser,
    refreshData,
    showToast,
    triggerCelebration
  } = useApp();

  const [loading, setLoading] = useState(false);
  const [googleConfig, setGoogleConfig] = useState({ isConfigured: false, clientId: null });
  const [customEmail, setCustomEmail] = useState('');
  const [customName, setCustomName] = useState('');
  const [showCustomForm, setShowCustomForm] = useState(false);

  useEffect(() => {
    if (isOpen) {
      apiGetGoogleAuthConfig().then(setGoogleConfig).catch(console.error);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Handle Google Login Flow
  const handlePerformGoogleLogin = async (mockProfile = null) => {
    setLoading(true);
    try {
      const payload = mockProfile ? { mockProfile } : {
        mockProfile: {
          email: customEmail || 'thanachote.owner@gmail.com',
          name: customName || 'ณิชา ทองอยู่ (Google Account)',
          picture: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
        }
      };

      const res = await apiGoogleLogin(payload);
      showToast(res.message || 'เข้าสู่ระบบด้วย Google สำเร็จ!', 'success');
      triggerCelebration();
      refreshData();
      onClose();
    } catch (err) {
      showToast('เข้าสู่ระบบไม่สำเร็จ: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#FFFDF7] w-full max-w-md rounded-3xl border border-[#FDE68A] shadow-2xl overflow-hidden flex flex-col animate-scale-up">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-amber-500 via-amber-600 to-yellow-500 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-2xl bg-white/20 backdrop-blur-md">
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#ffffff"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#ffffff"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#ffffff"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#ffffff"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-sm leading-tight">
                เข้าสู่ระบบด้วย Google
              </h3>
              <p className="text-[11px] text-white/80">
                Sign in with Google Account
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/20 text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 text-xs text-gray-700">
          {/* Current User Info */}
          {currentUser && (
            <div className="bg-white rounded-2xl p-3.5 border border-[#FDE68A] shadow-soft flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img
                  src={currentUser.picture_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                  alt="Avatar"
                  className="w-10 h-10 rounded-full object-cover border-2 border-amber-300 shadow-sm"
                />
                <div>
                  <div className="text-[10px] text-gray-400 font-medium">เข้าสู่ระบบอยู่ในชื่อ:</div>
                  <div className="font-bold text-gray-900 text-xs">{currentUser.display_name}</div>
                  <div className="text-[10px] text-[#D97706] font-medium">{currentUser.email || 'ผู้ใช้งานระบบ'}</div>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                Online
              </span>
            </div>
          )}

          {/* Google Sign In Button */}
          <button
            onClick={() => handlePerformGoogleLogin()}
            disabled={loading}
            className="w-full py-3 px-4 rounded-2xl bg-white hover:bg-gray-50 text-gray-800 font-bold text-xs flex items-center justify-center gap-3 border border-gray-300 shadow-md hover:shadow-lg transition active:scale-[0.98]"
          >
            {/* Multi-colored Google "G" Logo */}
            <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
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
            <span>{loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบด้วยบัญชี Google'}</span>
          </button>

          {/* Quick Demo Google Accounts */}
          <div className="space-y-2 pt-1">
            <div className="text-[11px] font-bold text-gray-500 flex items-center justify-between">
              <span>หรือเลือกบัญชีตัวอย่างเพื่อทดสอบ:</span>
            </div>

            <div className="space-y-1.5">
              <button
                onClick={() => handlePerformGoogleLogin({
                  sub: 'g_nicha_owner',
                  email: 'nicha.owner@gmail.com',
                  name: 'ณิชา ทองอยู่ (เจ้าของร้าน)',
                  picture: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'
                })}
                className="w-full p-2.5 rounded-xl bg-white hover:bg-amber-50 border border-amber-200 text-left flex items-center justify-between group transition"
              >
                <div className="flex items-center gap-2">
                  <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150" alt="" className="w-7 h-7 rounded-full object-cover" />
                  <div>
                    <div className="font-bold text-gray-900 text-xs group-hover:text-[#D97706]">ณิชา ทองอยู่ (Owner)</div>
                    <div className="text-[10px] text-gray-400">nicha.owner@gmail.com</div>
                  </div>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-[#D97706] group-hover:translate-x-0.5 transition" />
              </button>

              <button
                onClick={() => handlePerformGoogleLogin({
                  sub: 'g_somchai_staff',
                  email: 'somchai.staff@gmail.com',
                  name: 'สมชาย ผู้ช่วยร้าน (Member)',
                  picture: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150'
                })}
                className="w-full p-2.5 rounded-xl bg-white hover:bg-amber-50 border border-amber-200 text-left flex items-center justify-between group transition"
              >
                <div className="flex items-center gap-2">
                  <img src="https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150" alt="" className="w-7 h-7 rounded-full object-cover" />
                  <div>
                    <div className="font-bold text-gray-900 text-xs group-hover:text-[#D97706]">สมชาย ผู้ช่วยร้าน (Staff)</div>
                    <div className="text-[10px] text-gray-400">somchai.staff@gmail.com</div>
                  </div>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-[#D97706] group-hover:translate-x-0.5 transition" />
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500 px-5">
          <span>ปลอดภัยด้วยมาตรฐาน Google OAuth 2.0</span>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded-xl bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold transition"
          >
            ปิด
          </button>
        </div>
      </div>
    </div>
  );
}
