import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import {
  apiGetSampleSlips,
  apiProcessSlipMessage
} from '../../services/api';
import {
  MessageSquare,
  Send,
  Camera,
  Image as ImageIcon,
  CheckCircle2,
  Sparkles,
  RefreshCw,
  X,
  ExternalLink,
  Bot,
  User,
  ShieldCheck
} from 'lucide-react';

export default function LineFlexPreviewModal() {
  const {
    isLinePreviewOpen,
    setIsLinePreviewOpen,
    currentWorkspace,
    currentUser,
    refreshData,
    showToast,
    triggerCelebration,
    setActiveTab
  } = useApp();

  const [sampleSlips, setSampleSlips] = useState([]);
  const [messages, setMessages] = useState([]);
  const [processing, setProcessing] = useState(false);
  const fileInputRef = useRef(null);
  const chatBottomRef = useRef(null);

  // Initial welcome message in LINE OA
  useEffect(() => {
    if (isLinePreviewOpen) {
      apiGetSampleSlips().then(s => setSampleSlips(s || [])).catch(console.error);

      if (messages.length === 0) {
        setMessages([
          {
            id: 'msg_welcome',
            sender: 'bot',
            time: '14:20',
            text: 'สวัสดีค่ะคุณ ' + (currentUser?.display_name?.split(' ')[0] || 'ลูกค้า') + ' 🙏 ยินดีต้อนรับสู่ระบบบัญชี ป้านวล (ร้านขายของฝากไร่ธนโชติ)\n\nสามารถส่งรูปภาพ "สลิปโอนเงิน" หรือ "ใบเสร็จ" เข้ามาในแชทนี้ได้เลยค่ะ ระบบ OCR จะสแกนและสรุปข้อมูลให้ทันทีค่ะ ✨'
          }
        ]);
      }
    }
  }, [isLinePreviewOpen]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, processing]);

  if (!isLinePreviewOpen) return null;

  // Handle User Sending a Slip (via Sample or Upload)
  const handleSendSlip = async (sample) => {
    if (processing) return;

    const userMsgId = 'msg_user_' + Date.now();
    const timeNow = new Date().toTimeString().slice(0, 5);

    // 1. Add User Slip Image Message
    setMessages((prev) => [
      ...prev,
      {
        id: userMsgId,
        sender: 'user',
        time: timeNow,
        type: 'image_slip',
        imageUrl: sample.imageUrl,
        caption: sample.name
      }
    ]);

    setProcessing(true);

    try {
      // Call backend to process OCR & build real Flex Message
      const res = await apiProcessSlipMessage({
        sampleId: sample.id,
        workspaceId: currentWorkspace?.id
      });

      const ocr = res.ocrResult;
      const flex = res.flexMessage;

      // 2. Add Bot Reply with Professional Flex Card
      setMessages((prev) => [
        ...prev,
        {
          id: 'msg_bot_' + Date.now(),
          sender: 'bot',
          time: new Date().toTimeString().slice(0, 5),
          type: 'flex_card',
          data: {
            amount: ocr.amount,
            type: ocr.suggestedType,
            bank: ocr.bank,
            date: ocr.date,
            time: ocr.time,
            sender: ocr.sender,
            receiver: ocr.receiver,
            referenceNo: ocr.referenceNo,
            category: ocr.suggestedCategory,
            workspaceName: currentWorkspace?.name || 'ร้านขายของฝากไร่ธนโชติ',
            userName: currentUser?.display_name || 'ณิชา ทองอยู่',
            confidence: ocr.confidence || 98.5
          }
        }
      ]);

      showToast(`✓ สแกนสลิป ${ocr.bank} สำเร็จ ยอดเงิน ฿${ocr.amount.toLocaleString()} บาท`, 'success');
      triggerCelebration();
      refreshData();
    } catch (err) {
      showToast('เกิดข้อผิดพลาดในการประมวลผลสลิป: ' + err.message, 'error');
    } finally {
      setProcessing(false);
    }
  };

  // Upload Custom Slip File
  const handleCustomFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Use default sample data for simulation
    const fakeSample = sampleSlips[0] || {
      id: 'sample-kbank-1',
      name: 'สลิปโอนเงิน (อัปโหลด)',
      imageUrl: URL.createObjectURL(file)
    };
    handleSendSlip(fakeSample);
  };

  const getBankColor = (bank) => {
    if (/scb|ไทยพาณิชย์/i.test(bank)) return '#4E2E80';
    if (/krungthai|กรุงไทย/i.test(bank)) return '#00A4E4';
    if (/bangkok|กรุงเทพ|bbl/i.test(bank)) return '#1E3A8A';
    if (/ttb|ทหารไทย/i.test(bank)) return '#002D62';
    if (/gsb|ออมสิน/i.test(bank)) return '#EB1985';
    if (/promptpay|พร้อมเพย์/i.test(bank)) return '#003D79';
    if (/7-eleven|เซเว่น/i.test(bank)) return '#007A3E';
    return '#00A950'; // KBank Green default
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-pop-in">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-gray-200 overflow-hidden my-auto flex flex-col h-[90vh] max-h-[750px] animate-slide-up">
        {/* LINE OA Header */}
        <div className="bg-[#00B900] text-white px-4 py-3 flex items-center justify-between shadow-md flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-white text-[#00B900] flex items-center justify-center font-bold text-sm shadow-inner">
                ป้านวล
              </div>
              <ShieldCheck className="w-4 h-4 text-emerald-300 absolute -bottom-0.5 -right-0.5 bg-[#00B900] rounded-full" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-bold leading-tight">ป้านวล บัญชีอัจฉริยะ</h3>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-white/20 text-white font-medium">LINE OA</span>
              </div>
              <p className="text-[11px] text-white/90 leading-tight">
                {currentWorkspace?.name} • ตอบกลับอัตโนมัติ
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsLinePreviewOpen(false)}
            className="w-8 h-8 rounded-full bg-black/10 hover:bg-black/20 flex items-center justify-center text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* LINE Chat History Canvas */}
        <div className="bg-[#7A91AB] flex-1 overflow-y-auto p-4 space-y-3.5">
          <div className="text-center my-1">
            <span className="text-[10px] bg-black/25 text-white px-3 py-0.5 rounded-full font-medium shadow-xs">
              วันนี้ 24 สิงหาคม 2569
            </span>
          </div>

          {messages.map((msg) => {
            if (msg.sender === 'user') {
              return (
                <div key={msg.id} className="flex flex-col items-end gap-1 animate-slide-up">
                  <div className="bg-[#8EE4AF] text-gray-900 rounded-2xl rounded-tr-xs p-2.5 shadow-md max-w-[78%]">
                    {msg.type === 'image_slip' && (
                      <div className="space-y-1.5">
                        <div className="rounded-xl overflow-hidden max-h-48 border border-black/10 bg-white">
                          <img
                            src={msg.imageUrl}
                            alt="Sent Slip"
                            className="w-full h-full object-contain"
                          />
                        </div>
                        <div className="text-[11px] font-semibold text-gray-800 flex items-center gap-1">
                          <ImageIcon className="w-3.5 h-3.5 text-gray-700" />
                          <span>{msg.caption || 'ส่งภาพสลิปโอนเงิน'}</span>
                        </div>
                      </div>
                    )}
                  </div>
                  <span className="text-[9px] text-white/80 pr-1">{msg.time}</span>
                </div>
              );
            }

            // BOT MESSAGES
            return (
              <div key={msg.id} className="flex items-start gap-2 max-w-[90%] animate-slide-up">
                <div className="w-8 h-8 rounded-full bg-[#00B900] text-white flex items-center justify-center font-bold text-xs flex-shrink-0 shadow-md mt-1">
                  ป้านวล
                </div>

                <div className="space-y-1 flex-1">
                  {msg.text && (
                    <div className="bg-white rounded-2xl rounded-tl-xs p-3 shadow-md text-xs text-gray-800 leading-relaxed whitespace-pre-line">
                      {msg.text}
                    </div>
                  )}

                  {/* PROFESSIONAL LINE FLEX MESSAGE CARD */}
                  {msg.type === 'flex_card' && (
                    <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100 animate-pop-in">
                      {/* Flex Header with Bank Color */}
                      <div
                        className="text-white p-4"
                        style={{ backgroundColor: getBankColor(msg.data.bank) }}
                      >
                        <div className="flex items-center justify-between text-[11px] text-white/90 mb-1">
                          <span className="font-bold flex items-center gap-1">
                            📷 สแกนสลิปสำเร็จ (OCR Auto-Detected)
                          </span>
                          <span className="bg-white/20 px-2 py-0.5 rounded-full font-mono text-[10px] font-bold">
                            {msg.data.confidence}% AI
                          </span>
                        </div>

                        <div className="text-xs font-semibold text-white/90">
                          {msg.data.bank}
                        </div>

                        <div className="flex items-baseline justify-between mt-2 pt-1 border-t border-white/20">
                          <div className="text-2xl font-bold">
                            {msg.data.type === 'income' ? '+฿' : '-฿'}
                            {parseFloat(msg.data.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </div>
                          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-white/25">
                            {msg.data.type === 'income' ? 'รายรับ' : 'รายจ่าย'}
                          </span>
                        </div>
                      </div>

                      {/* Flex Body Details Table */}
                      <div className="p-3.5 space-y-2 text-xs divide-y divide-gray-100">
                        <div className="space-y-1.5 pb-2">
                          <div className="flex justify-between">
                            <span className="text-gray-500">หมวดหมู่</span>
                            <strong className="text-gray-900">{msg.data.category}</strong>
                          </div>

                          <div className="flex justify-between">
                            <span className="text-gray-500">วันที่ / เวลา</span>
                            <span className="text-gray-800 font-medium">{msg.data.date} {msg.data.time}</span>
                          </div>

                          {msg.data.sender && (
                            <div className="flex justify-between">
                              <span className="text-gray-500">ผู้โอน (จาก)</span>
                              <span className="text-gray-800 truncate max-w-[170px] text-right font-medium">
                                {msg.data.sender}
                              </span>
                            </div>
                          )}

                          {msg.data.receiver && (
                            <div className="flex justify-between">
                              <span className="text-gray-500">ผู้รับ (ถึง)</span>
                              <strong className="text-gray-900 truncate max-w-[170px] text-right">
                                {msg.data.receiver}
                              </strong>
                            </div>
                          )}

                          {msg.data.referenceNo && (
                            <div className="flex justify-between text-[11px]">
                              <span className="text-gray-400">รหัสอ้างอิง</span>
                              <span className="font-mono text-gray-500 truncate max-w-[180px]">
                                {msg.data.referenceNo}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Workspace & Author Info */}
                        <div className="pt-2 space-y-1">
                          <div className="flex justify-between text-[11px]">
                            <span className="text-gray-500">พื้นที่การเงิน</span>
                            <strong className="text-[#D97706]">{msg.data.workspaceName}</strong>
                          </div>
                          <div className="flex justify-between text-[11px]">
                            <span className="text-gray-500">บันทึกโดย</span>
                            <span className="text-gray-800">{msg.data.userName}</span>
                          </div>
                        </div>
                      </div>

                      {/* Flex Action Buttons */}
                      <div className="p-3 bg-[#FFFDF0] border-t border-amber-100 space-y-1.5">
                        <button
                          onClick={() => {
                            setIsLinePreviewOpen(false);
                            setActiveTab('summaries');
                          }}
                          className="w-full py-2 bg-[#F59E0B] hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm"
                        >
                          📊 ดูสรุปการเงินบน LIFF (ป้านวล)
                        </button>

                        <button
                          onClick={() => {
                            setIsLinePreviewOpen(false);
                            setActiveTab('transactions');
                          }}
                          className="w-full py-1.5 bg-white hover:bg-gray-100 text-gray-700 border border-gray-200 rounded-xl text-xs font-semibold transition"
                        >
                          🔍 ตรวจสอบ / แก้ไขรายการนี้
                        </button>
                      </div>
                    </div>
                  )}

                  <span className="text-[9px] text-white/80 pl-1 block">{msg.time}</span>
                </div>
              </div>
            );
          })}

          {/* Typing Indicator */}
          {processing && (
            <div className="flex items-center gap-2 text-white text-xs animate-pulse">
              <div className="w-8 h-8 rounded-full bg-[#00B900] text-white flex items-center justify-center font-bold text-xs shadow-md">
                ป้านวล
              </div>
              <div className="bg-white text-gray-800 rounded-2xl rounded-tl-xs p-3 shadow-md flex items-center gap-2">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#00B900]" />
                <span className="text-xs font-medium">กำลังสแกนและอ่านสลิปด้วย AI OCR...</span>
              </div>
            </div>
          )}

          <div ref={chatBottomRef} />
        </div>

        {/* 1-Click Fast Slip Selector Toolbar */}
        <div className="bg-white p-3 border-t border-gray-200 flex-shrink-0 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-gray-700 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-[#00B900]" />
              ส่งสลิปจำลองผ่าน LINE OA (คลิกเพื่อทดสอบทันที):
            </span>
            <span className="text-[10px] text-gray-400">กรณีศึกษา ไร่ธนโชติ</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            {sampleSlips.map((sample) => (
              <button
                key={sample.id}
                onClick={() => handleSendSlip(sample)}
                disabled={processing}
                className="p-2 rounded-xl border border-gray-200 hover:border-[#00B900] hover:bg-emerald-50/50 text-left transition flex flex-col justify-between group"
              >
                <div className="flex items-center gap-1 text-[10px] font-bold text-gray-900 truncate group-hover:text-[#00B900]">
                  <Camera className="w-3 h-3 text-[#00B900] flex-shrink-0" />
                  <span className="truncate">{sample.bank?.split(' ')[0]}</span>
                </div>
                <div className="text-xs font-bold text-[#00B900] mt-1">
                  {sample.type === 'income' ? '+' : '-'}฿{sample.amount.toLocaleString()}
                </div>
              </button>
            ))}
          </div>

          {/* Real Slip Upload Button */}
          <div className="pt-1 flex items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleCustomFileUpload}
              accept="image/*"
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={processing}
              className="w-full py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5"
            >
              <Camera className="w-4 h-4 text-gray-600" /> อัปโหลดภาพสลิปจริงจากเครื่องของคุณ
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
