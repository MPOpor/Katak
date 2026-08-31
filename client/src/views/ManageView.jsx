import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import CategoriesView from './CategoriesView';
import AdminView from './AdminView';
import {
  Settings,
  Tags,
  Users,
  History,
  Shield,
  Bell,
  Plus,
  ChevronRight,
  Store,
  Wallet,
  Sparkles
} from 'lucide-react';

export default function ManageView() {
  const {
    currentWorkspace,
    setIsWorkspaceModalOpen,
    setIsMembersModalOpen,
    setIsAuditModalOpen,
    setIsLinePreviewOpen,
    currentUser
  } = useApp();

  const [subSection, setSubSection] = useState('menu'); // 'menu', 'categories', 'admin'

  if (subSection === 'categories') {
    return (
      <div className="space-y-3">
        <button
          onClick={() => setSubSection('menu')}
          className="mx-4 text-xs font-semibold text-[#D97706] hover:underline flex items-center gap-1"
        >
          ← กลับไปเมนูจัดการ
        </button>
        <CategoriesView />
      </div>
    );
  }

  if (subSection === 'admin') {
    return (
      <div className="space-y-3">
        <button
          onClick={() => setSubSection('menu')}
          className="mx-4 text-xs font-semibold text-[#D97706] hover:underline flex items-center gap-1"
        >
          ← กลับไปเมนูจัดการ
        </button>
        <AdminView />
      </div>
    );
  }

  const menuItems = [
    {
      id: 'categories',
      title: 'จัดการหมวดหมู่รายรับ-รายจ่าย',
      desc: 'กำหนดหมวดหมู่เฉพาะของร้านค้า และส่วนบุคคล',
      icon: Tags,
      color: 'bg-amber-100 text-[#D97706]',
      action: () => setSubSection('categories')
    },
    {
      id: 'members',
      title: 'จัดการสมาชิก & สิทธิ์เข้าถึง (RBAC)',
      desc: 'เชิญสมาชิกด้วย QR / ลิงก์, กำหนดสิทธิ์ Owner / Member',
      icon: Users,
      color: 'bg-indigo-100 text-[#6366F1]',
      action: () => setIsMembersModalOpen(true)
    },
    {
      id: 'audit',
      title: 'ประวัติร่องรอยการทำรายการ (Audit Trail)',
      desc: 'ตรวจสอบประวัติการบันทึก แก้ไข ลบรายการของสมาชิก',
      icon: History,
      color: 'bg-blue-100 text-blue-600',
      action: () => setIsAuditModalOpen(true)
    },
    {
      id: 'line',
      title: 'จำลองการแจ้งเตือน LINE Flex Message',
      desc: 'ดูตัวอย่างบัตรแจ้งเตือนสรุปรายรับ-รายจ่าย และเตือนงบเกิน',
      icon: Bell,
      color: 'bg-emerald-100 text-emerald-600',
      action: () => setIsLinePreviewOpen(true)
    },
    {
      id: 'admin',
      title: 'ระบบผู้ดูแลระบบ (Admin Portal)',
      desc: 'ตรวจสอบ System Logs, จัดการผู้ใช้งาน และสถานะ API',
      icon: Shield,
      color: 'bg-purple-100 text-purple-600',
      action: () => setSubSection('admin')
    },
    {
      id: 'new_workspace',
      title: 'สร้างพื้นที่การเงินใหม่ (Workspace)',
      desc: 'เพิ่มร้านค้าใหม่ หรือกระเป๋าเงินกลุ่ม',
      icon: Plus,
      color: 'bg-amber-100 text-amber-600',
      action: () => setIsWorkspaceModalOpen(true)
    }
  ];

  return (
    <div className="space-y-4 max-w-4xl mx-auto px-4 py-2">
      {/* Current Workspace Summary Card */}
      <div className="bg-white rounded-3xl p-4 border border-[#FDE68A] shadow-soft flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-[#D97706] shadow-sm border border-amber-200">
            <Store className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[11px] text-gray-400 font-medium">พื้นที่ปัจจุบัน</div>
            <h3 className="text-sm font-bold text-gray-900">{currentWorkspace?.name}</h3>
            <div className="text-xs text-gray-500 mt-0.5">
              บทบาทของคุณ: <strong className="text-[#D97706] uppercase">{currentWorkspace?.user_role}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Menu Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={item.action}
              className="p-3.5 bg-white rounded-2xl border border-[#FDE68A] hover:border-[#F59E0B] shadow-soft hover:shadow-md transition text-left flex items-center justify-between group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${item.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-gray-900 group-hover:text-[#D97706] transition truncate">
                    {item.title}
                  </h4>
                  <p className="text-[11px] text-gray-400 line-clamp-1">{item.desc}</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-[#D97706] group-hover:translate-x-0.5 transition flex-shrink-0" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
