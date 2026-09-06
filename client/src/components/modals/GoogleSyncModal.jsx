import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import {
  apiGetGoogleStatus,
  apiTestGoogleConnection,
  apiSyncGoogleSheets,
  apiUpdateGoogleConfig,
  apiGetExportCsvUrl
} from '../../services/api';
import {
  X,
  Cloud,
  FileSpreadsheet,
  FolderSync,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Download,
  Settings,
  ShieldCheck,
  Sparkles,
  Info,
  Copy,
  Check
} from 'lucide-react';

export default function GoogleSyncModal() {
  const {
    isGoogleSyncModalOpen,
    setIsGoogleSyncModalOpen,
    currentWorkspace,
    showToast,
    triggerCelebration,
    googleStatus,
    refreshGoogleStatus
  } = useApp();

  const [testing, setTesting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [copied, setCopied] = useState(false);

  const [driveParentFolderId, setDriveParentFolderId] = useState('');
  const [spreadsheetId, setSpreadsheetId] = useState('');
  const [showConfigForm, setShowConfigForm] = useState(false);

  useEffect(() => {
    if (googleStatus) {
      setDriveParentFolderId(googleStatus.driveParentFolderId || '');
      setSpreadsheetId(googleStatus.spreadsheetId || '');
    }
  }, [googleStatus]);

  if (!isGoogleSyncModalOpen) return null;

  const handleCopyEmail = (email) => {
    if (!email) return;
    navigator.clipboard.writeText(email);
    setCopied(true);
    showToast('คัดลอกอีเมล Service Account แล้ว', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await apiTestGoogleConnection({
        customDriveParentId: driveParentFolderId,
        customSpreadsheetId: spreadsheetId
      });
      setTestResult(res);
      if (res.drive?.success || res.sheets?.success) {
        showToast('ทดสอบการเชื่อมต่อเรียบร้อย', 'success');
      } else {
        showToast('พบข้อผิดพลาดในการเชื่อมต่อ กรุณาตรวจสอบการแชร์สิทธิ์', 'error');
      }
      refreshGoogleStatus();
    } catch (err) {
      showToast('การทดสอบล้มเหลว: ' + err.message, 'error');
    } finally {
      setTesting(false);
    }
  };

  const handleSyncToSheets = async () => {
    setSyncing(true);
    try {
      const res = await apiSyncGoogleSheets({
        workspaceId: currentWorkspace?.id,
        customSpreadsheetId: spreadsheetId
      });
      showToast(res.message || 'ซิงค์ข้อมูลขึ้น Google Sheets สำเร็จ!', 'success');
      triggerCelebration();
      refreshGoogleStatus();
    } catch (err) {
      showToast('ซิงค์ข้อมูลไม่สำเร็จ: ' + err.message, 'error');
    } finally {
      setSyncing(false);
    }
  };

  const handleSaveConfig = async (e) => {
    e.preventDefault();
    setSavingConfig(true);
    try {
      await apiUpdateGoogleConfig({
        driveParentFolderId,
        spreadsheetId
      });
      showToast('บันทึกการตั้งค่า Google Drive & Sheets เรียบร้อย', 'success');
      refreshGoogleStatus();
      setShowConfigForm(false);
    } catch (err) {
      showToast('บันทึกไม่สำเร็จ: ' + err.message, 'error');
    } finally {
      setSavingConfig(false);
    }
  };

  const exportCsvUrl = apiGetExportCsvUrl({ workspace_id: currentWorkspace?.id });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#FFFDF7] w-full max-w-lg rounded-3xl border border-[#FDE68A] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-scale-up">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-amber-500 via-amber-600 to-yellow-500 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-2xl bg-white/20 backdrop-blur-md">
              <Cloud className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-sm leading-tight">
                เชื่อมต่อ Google Drive & Sheets
              </h3>
              <p className="text-[11px] text-white/80">
                สำรองภาพสลิป และซิงค์บัญชีขึ้นคลาวด์อัตโนมัติ
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsGoogleSyncModalOpen(false)}
            className="p-1.5 rounded-full hover:bg-white/20 text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4 overflow-y-auto custom-scrollbar flex-1 text-xs text-gray-700">
          {/* Service Account Banner */}
          {googleStatus?.serviceAccountEmail && (
            <div className="bg-amber-50 rounded-2xl p-3 border border-amber-200 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <ShieldCheck className="w-4 h-4 text-[#D97706] flex-shrink-0" />
                <div className="min-w-0">
                  <div className="text-[10px] text-gray-500 font-medium">Service Account Email:</div>
                  <div className="text-[11px] font-bold text-gray-800 truncate font-mono">
                    {googleStatus.serviceAccountEmail}
                  </div>
                </div>
              </div>
              <button
                onClick={() => handleCopyEmail(googleStatus.serviceAccountEmail)}
                className="px-2.5 py-1 rounded-xl bg-white border border-amber-300 hover:bg-amber-100 text-[#D97706] font-semibold text-[11px] flex items-center gap-1 transition flex-shrink-0 shadow-sm"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'คัดลอกแล้ว' : 'คัดลอก'}</span>
              </button>
            </div>
          )}

          {/* Status Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Google Drive Card */}
            <div className="bg-white rounded-2xl p-3.5 border border-[#FDE68A] shadow-soft space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                    📁
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 text-xs">Google Drive</h4>
                    <span className="text-[10px] text-gray-400">เก็บภาพสลิป / ใบเสร็จ</span>
                  </div>
                </div>
                {googleStatus?.driveParentFolderId ? (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                    ตั้งค่าแล้ว
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-[10px] font-bold">
                    ยังไม่ตั้งค่า
                  </span>
                )}
              </div>

              {googleStatus?.driveUrl && (
                <a
                  href={googleStatus.driveUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-1.5 px-2.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold text-[11px] flex items-center justify-center gap-1 transition border border-blue-200"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>เปิดโฟลเดอร์ Google Drive</span>
                </a>
              )}
            </div>

            {/* Google Sheets Card */}
            <div className="bg-white rounded-2xl p-3.5 border border-[#FDE68A] shadow-soft space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                    📊
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 text-xs">Google Sheets</h4>
                    <span className="text-[10px] text-gray-400">ตารางรายรับ-รายจ่าย</span>
                  </div>
                </div>
                {googleStatus?.spreadsheetId ? (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                    ตั้งค่าแล้ว
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-[10px] font-bold">
                    ยังไม่ตั้งค่า
                  </span>
                )}
              </div>

              {googleStatus?.spreadsheetUrl && (
                <a
                  href={googleStatus.spreadsheetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-1.5 px-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold text-[11px] flex items-center justify-center gap-1 transition border border-emerald-200"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>เปิดตาราง Google Sheets</span>
                </a>
              )}
            </div>
          </div>

          {/* Test Diagnostics Result */}
          {testResult && (
            <div className="bg-gray-50 rounded-2xl p-3 border border-gray-200 space-y-2 animate-fade-in">
              <div className="font-bold text-gray-800 text-xs flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-blue-600" />
                <span>ผลการทดสอบการเชื่อมต่อ:</span>
              </div>
              <div className="space-y-1.5 text-[11px]">
                <div className="flex items-start gap-1.5">
                  {testResult.data?.drive?.success ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
                  )}
                  <span><strong>Google Drive:</strong> {testResult.data?.drive?.message}</span>
                </div>
                <div className="flex items-start gap-1.5">
                  {testResult.data?.sheets?.success ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
                  )}
                  <span><strong>Google Sheets:</strong> {testResult.data?.sheets?.message}</span>
                </div>
              </div>
            </div>
          )}

          {/* Main Action Buttons */}
          <div className="space-y-2 pt-1">
            {/* 1-Click Sync to Sheets */}
            <button
              onClick={handleSyncToSheets}
              disabled={syncing}
              className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition active:scale-[0.98] disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
              <span>{syncing ? 'กำลังซิงค์ข้อมูลขึ้น Google Sheets...' : '🚀 ซิงค์รายการทั้งหมดขึ้น Google Sheets ตอนนี้'}</span>
            </button>

            {/* Test Connection Button */}
            <button
              onClick={handleTestConnection}
              disabled={testing}
              className="w-full py-2.5 px-4 rounded-2xl bg-amber-50 hover:bg-amber-100 text-[#D97706] font-bold text-xs flex items-center justify-center gap-2 border border-amber-300 transition"
            >
              <ShieldCheck className={`w-4 h-4 ${testing ? 'animate-spin' : ''}`} />
              <span>{testing ? 'กำลังตรวจสอบสิทธิ์...' : '🧪 ทดสอบการเชื่อมต่อ Google Drive & Sheets'}</span>
            </button>

            {/* Export CSV Download Link */}
            <a
              href={exportCsvUrl}
              download
              className="w-full py-2.5 px-4 rounded-2xl bg-white hover:bg-gray-50 text-gray-700 font-semibold text-xs flex items-center justify-center gap-2 border border-gray-300 shadow-sm transition"
            >
              <Download className="w-4 h-4 text-gray-500" />
              <span>📥 ดาวน์โหลดไฟล์รายงานรายรับ-รายจ่าย (CSV สำหรับ Excel)</span>
            </a>
          </div>

          {/* Toggle Configuration Form */}
          <div className="pt-2 border-t border-gray-100">
            <button
              onClick={() => setShowConfigForm(!showConfigForm)}
              className="text-[11px] font-bold text-[#D97706] hover:underline flex items-center gap-1"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>{showConfigForm ? 'ซ่อนการตั้งค่า Folder ID & Sheet ID' : '⚙️ แก้ไข Google Drive Parent Folder ID & Spreadsheet ID'}</span>
            </button>

            {showConfigForm && (
              <form onSubmit={handleSaveConfig} className="mt-3 space-y-3 p-3.5 bg-white rounded-2xl border border-amber-200 animate-slide-up">
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">
                    Google Drive Parent Folder ID
                  </label>
                  <input
                    type="text"
                    value={driveParentFolderId}
                    onChange={(e) => setDriveParentFolderId(e.target.value)}
                    placeholder="เช่น 1A2b3C4d5E6f7G8h9I..."
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-amber-500 text-xs font-mono"
                  />
                  <span className="text-[10px] text-gray-400">
                    ID โฟลเดอร์จาก URL ใน Google Drive: drive.google.com/drive/folders/<strong>[FOLDER_ID]</strong>
                  </span>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">
                    Google Sheet Spreadsheet ID
                  </label>
                  <input
                    type="text"
                    value={spreadsheetId}
                    onChange={(e) => setSpreadsheetId(e.target.value)}
                    placeholder="เช่น 1AbCdEfGhIjKlMnOpQrStUvWxYz..."
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-amber-500 text-xs font-mono"
                  />
                  <span className="text-[10px] text-gray-400">
                    ID ชีตจาก URL ใน Google Sheets: docs.google.com/spreadsheets/d/<strong>[SPREADSHEET_ID]</strong>/edit
                  </span>
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowConfigForm(false)}
                    className="px-3 py-1.5 rounded-xl border text-gray-600 hover:bg-gray-100 text-xs font-semibold"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    disabled={savingConfig}
                    className="px-4 py-1.5 rounded-xl bg-[#F59E0B] hover:bg-[#D97706] text-white text-xs font-bold shadow-sm transition"
                  >
                    {savingConfig ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่า'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500 px-5">
          <span>ระบบซิงค์คลาวด์อัจฉริยะ Katak</span>
          <button
            onClick={() => setIsGoogleSyncModalOpen(false)}
            className="px-3 py-1 rounded-xl bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold transition"
          >
            ปิด
          </button>
        </div>
      </div>
    </div>
  );
}
