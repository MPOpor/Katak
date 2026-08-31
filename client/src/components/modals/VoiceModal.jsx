import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { apiGetSampleVoiceCommands, apiParseVoice, apiCreateTransaction } from '../../services/api';
import {
  Mic,
  MicOff,
  Sparkles,
  CheckCircle2,
  X,
  Volume2,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  ShoppingBag,
  RefreshCw
} from 'lucide-react';

export default function VoiceModal() {
  const {
    isVoiceModalOpen,
    setIsVoiceModalOpen,
    currentWorkspace,
    categories,
    refreshData,
    showToast,
    triggerCelebration
  } = useApp();

  const [sampleCommands, setSampleCommands] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [processing, setProcessing] = useState(false);

  // Parsed NLP Result
  const [parsedData, setParsedData] = useState(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [manualAmount, setManualAmount] = useState('');
  const [manualType, setManualType] = useState('expense');

  useEffect(() => {
    if (isVoiceModalOpen) {
      apiGetSampleVoiceCommands().then(cmd => setSampleCommands(cmd || [])).catch(console.error);
      setTranscript('');
      setParsedData(null);
    }
  }, [isVoiceModalOpen]);

  if (!isVoiceModalOpen) return null;

  // Web Speech API Voice Recognition
  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      showToast('เบราว์เซอร์นี้ไม่รองรับ Web Speech API โดยตรง คุณสามารถคลิกเลือกคำสั่งเสียงตัวอย่างด้านล่างเพื่อทดสอบได้ทันที', 'info');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'th-TH';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsRecording(true);
      setTranscript('กำลังฟังเสียงภาษาไทยของคุณ...');
    };

    recognition.onresult = (event) => {
      const text = event.results[0][0].transcript;
      setTranscript(text);
      setIsRecording(false);
      handleProcessVoiceText(text);
    };

    recognition.onerror = (event) => {
      console.error('Speech error:', event.error);
      setIsRecording(false);
      showToast('เกิดข้อผิดพลาดในการฟังเสียง: ' + event.error, 'error');
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognition.start();
  };

  // Process text via Backend Thai NLP
  const handleProcessVoiceText = async (text) => {
    setProcessing(true);
    try {
      const res = await apiParseVoice(text);
      setParsedData(res);
      setManualAmount(res.amount || '');
      setManualType(res.type || 'expense');

      // Match category
      let matchedCatId = '';
      const matched = categories.find(c => 
        c.name.includes(res.category) || res.category.includes(c.name)
      );
      if (matched) {
        matchedCatId = matched.id;
      } else if (categories.length > 0) {
        const defaultCat = categories.find(c => c.type === res.type) || categories[0];
        matchedCatId = defaultCat.id;
      }
      setSelectedCategoryId(matchedCatId);
    } catch (err) {
      showToast('เกิดข้อผิดพลาดในการวิเคราะห์ข้อความ: ' + err.message, 'error');
    } finally {
      setProcessing(false);
    }
  };

  // Select preset sample command
  const handleSelectSample = (sample) => {
    setTranscript(sample.text);
    handleProcessVoiceText(sample.text);
  };

  // Save Transaction
  const handleSave = async () => {
    if (!manualAmount || !selectedCategoryId) {
      showToast('กรุณาระบุยอดเงินและหมวดหมู่', 'error');
      return;
    }

    setProcessing(true);
    try {
      await apiCreateTransaction({
        workspace_id: currentWorkspace.id,
        category_id: selectedCategoryId,
        type: manualType,
        amount: parseFloat(manualAmount),
        note: transcript,
        input_method: 'voice',
        transaction_date: new Date().toISOString().split('T')[0]
      });

      showToast('✓ บันทึกรายการผ่านคำสั่งเสียงภาษาไทยสำเร็จ!', 'success');
      triggerCelebration();
      refreshData();
      setIsVoiceModalOpen(false);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-pop-in">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-amber-200 overflow-hidden my-auto animate-slide-up">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-50 via-white to-blue-50 px-5 py-3.5 border-b border-blue-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-[#3B82F6] text-white flex items-center justify-center shadow-md">
              <Mic className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                สั่งการด้วยเสียงภาษาไทย (Voice Input)
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-semibold">
                  Thai NLP
                </span>
              </h3>
              <p className="text-[11px] text-gray-500">
                แปลงเสียงพูดเป็นตัวเลขและหมวดหมู่รายรับ-รายจ่ายอัตโนมัติ
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsVoiceModalOpen(false)}
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Animated Microphone Recorder */}
          <div className="text-center py-4 bg-gradient-to-b from-blue-50/50 to-transparent rounded-3xl border border-blue-50">
            <div className="relative inline-block">
              {isRecording && (
                <div className="absolute inset-0 rounded-full bg-blue-400 animate-ping opacity-50" />
              )}
              <button
                type="button"
                onClick={startListening}
                className={`w-18 h-18 sm:w-20 sm:h-20 rounded-full flex items-center justify-center text-white shadow-xl transition-transform hover:scale-105 active:scale-95 ${
                  isRecording ? 'bg-red-500 animate-pulse' : 'bg-gradient-to-tr from-blue-600 to-indigo-500'
                }`}
              >
                {isRecording ? <MicOff className="w-8 h-8" /> : <Mic className="w-8 h-8" />}
              </button>
            </div>

            <div className="mt-3">
              <span className="text-xs font-bold text-gray-800 block">
                {isRecording ? 'กำลังฟังเสียงของคุณ...' : 'แตะที่ไมโครโฟนแล้วพูด'}
              </span>
              <span className="text-[11px] text-gray-400">
                เช่น "ขายของได้ 1500 บาท", "จ่ายค่าไฟร้าน 800 บาท"
              </span>
            </div>

            {transcript && (
              <div className="mt-3 mx-4 p-3 bg-white rounded-2xl border border-blue-100 shadow-sm text-xs font-medium text-blue-900">
                "{transcript}"
              </div>
            )}
          </div>

          {/* Preset Voice Samples for Testing */}
          <div>
            <span className="text-xs font-bold text-gray-800 flex items-center gap-1.5 mb-2">
              <Sparkles className="w-3.5 h-3.5 text-blue-500" /> หรือแตะคำสั่งเสียงตัวอย่างเพื่อทดสอบทันที:
            </span>
            <div className="space-y-1.5">
              {sampleCommands.map((cmd) => (
                <button
                  key={cmd.id}
                  onClick={() => handleSelectSample(cmd)}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl border border-gray-200 hover:border-blue-300 hover:bg-blue-50/50 transition text-left group"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-6 h-6 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0">
                      <Volume2 className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-xs font-medium text-gray-800 truncate group-hover:text-blue-600">
                      "{cmd.text}"
                    </span>
                  </div>
                  <span className="text-xs font-bold text-blue-600 flex-shrink-0">
                    {cmd.type === 'income' ? '+' : '-'}฿{cmd.amount.toLocaleString()}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* NLP Parsing Results Card */}
          {parsedData && (
            <div className="p-4 bg-[#FDFBF9] rounded-2xl border border-blue-200 shadow-sm space-y-3 animate-slide-up">
              <div className="flex items-center justify-between text-xs font-bold text-gray-800 border-b border-gray-200 pb-2">
                <span className="flex items-center gap-1 text-blue-600">
                  <CheckCircle2 className="w-4 h-4 text-blue-500" />
                  ผลลัพธ์การสกัด Intent & Entity จากเสียง
                </span>
                <span className="text-[10px] text-gray-400">ความมั่นใจ: {parsedData.confidence}%</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {/* Type Toggle */}
                <div>
                  <label className="text-[10px] font-semibold text-gray-500 block mb-1">ประเภท</label>
                  <div className="grid grid-cols-2 gap-1 bg-gray-200 p-0.5 rounded-lg">
                    <button
                      type="button"
                      onClick={() => setManualType('income')}
                      className={`py-1 text-xs font-bold rounded-md ${
                        manualType === 'income' ? 'bg-emerald-500 text-white shadow-sm' : 'text-gray-600'
                      }`}
                    >
                      รายรับ
                    </button>
                    <button
                      type="button"
                      onClick={() => setManualType('expense')}
                      className={`py-1 text-xs font-bold rounded-md ${
                        manualType === 'expense' ? 'bg-rose-500 text-white shadow-sm' : 'text-gray-600'
                      }`}
                    >
                      รายจ่าย
                    </button>
                  </div>
                </div>

                {/* Amount */}
                <div>
                  <label className="text-[10px] font-semibold text-gray-500 block mb-1">จำนวนเงิน (บาท)</label>
                  <input
                    type="number"
                    value={manualAmount}
                    onChange={(e) => setManualAmount(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs font-bold text-blue-600 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="text-[10px] font-semibold text-gray-500 block mb-1">หมวดหมู่อัตโนมัติ</label>
                <select
                  value={selectedCategoryId}
                  onChange={(e) => setSelectedCategoryId(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.type === 'income' ? '🟢 [รับ] ' : '🔴 [จ่าย] '} {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={handleSave}
                disabled={processing}
                className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center justify-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" /> บันทึกรายการนี้ลงบัญชี
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
