import React, { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { apiGetAuditTrail } from '../../services/api';
import { History, X, Shield, Clock, User, CheckCircle2 } from 'lucide-react';

export default function AuditTrailModal() {
  const { isAuditModalOpen, setIsAuditModalOpen, currentWorkspace } = useApp();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAuditModalOpen && currentWorkspace) {
      setLoading(true);
      apiGetAuditTrail(currentWorkspace.id)
        .then(data => setLogs(data || []))
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [isAuditModalOpen, currentWorkspace]);

  if (!isAuditModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-pop-in">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-amber-200 overflow-hidden my-auto animate-slide-up">
        {/* Header */}
        <div className="bg-gradient-to-r from-gray-50 via-white to-gray-50 px-5 py-3.5 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-gray-900 text-white flex items-center justify-center shadow-md">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">
                ประวัติร่องรอยการทำรายการ (Audit Trail)
              </h3>
              <p className="text-[11px] text-gray-500">
                {currentWorkspace?.name} • บันทึกกิจกรรมเพื่อความโปร่งใส
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsAuditModalOpen(false)}
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 max-h-[70vh] overflow-y-auto space-y-3">
          {loading ? (
            <div className="py-8 text-center text-xs text-gray-400">
              กำลังโหลดประวัติ Audit Trail...
            </div>
          ) : logs.length === 0 ? (
            <div className="py-8 text-center text-xs text-gray-400">
              ยังไม่มีประวัติกิจกรรมในพื้นที่นี้
            </div>
          ) : (
            logs.map((log) => (
              <div
                key={log.id}
                className="p-3 bg-[#FDFBF9] rounded-2xl border border-gray-100 space-y-1 hover:border-gray-200 transition"
              >
                <div className="flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-1.5 font-bold text-gray-800">
                    <User className="w-3.5 h-3.5 text-gray-400" />
                    <span>{log.user_name || 'ผู้ใช้'}</span>
                  </div>
                  <span className="text-gray-400 text-[10px] flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {log.created_at}
                  </span>
                </div>

                <p className="text-xs text-gray-700 font-medium">
                  {log.details}
                </p>

                <div className="text-[9px] text-gray-400 uppercase font-mono">
                  ACTION: {log.action} • ID: {log.entity_id || log.id}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
