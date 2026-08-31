import React, { useState, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { apiGetSampleSlips, apiParseOCR, apiCreateTransaction } from '../../services/api';
import {
  Camera,
  Upload,
  Sparkles,
  CheckCircle2,
  Sliders,
  RotateCw,
  Eye,
  X,
  FileText,
  Building,
  Calendar,
  Clock,
  User,
  ArrowRight,
  RefreshCw,
  Zap
} from 'lucide-react';

export default function OCRModal() {
  const {
    isOCRModalOpen,
    setIsOCRModalOpen,
    currentWorkspace,
    categories,
    refreshData,
    showToast,
    triggerCelebration
  } = useApp();

  const [sampleSlips, setSampleSlips] = useState([]);
  const [selectedSample, setSelectedSample] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [step, setStep] = useState('upload'); // 'upload' -> 'preprocess' -> 'verify'

  // Image Preprocessing controls
  const [grayscale, setGrayscale] = useState(true);
  const [threshold, setThreshold] = useState(128);
  const [contrast, setContrast] = useState(1.2);
  const [rotation, setRotation] = useState(0);

  // Extracted Fields for Verification Interface
  const [formData, setFormData] = useState({
    amount: '',
    type: 'income',
    categoryId: '',
    date: new Date().toISOString().split('T')[0],
    time: new Date().toTimeString().slice(0, 5),
    sender: '',
    receiver: '',
    bank: 'ธนาคารกสิกรไทย (KBank)',
    referenceNo: '',
    note: '',
    confidence: 95,
    rawText: ''
  });

  const fileInputRef = useRef(null);

  // Load sample slips when modal opens
  React.useEffect(() => {
    if (isOCRModalOpen) {
      apiGetSampleSlips().then(slips => setSampleSlips(slips || [])).catch(console.error);
    }
  }, [isOCRModalOpen]);

  if (!isOCRModalOpen) return null;

  // Handle Select Sample Slip
  const handleSelectSample = async (sample) => {
    setSelectedSample(sample);
    setImagePreview(sample.imageUrl);
    setProcessing(true);

    try {
      const res = await apiParseOCR({ sampleId: sample.id });
      populateFormData(res);
      setStep('verify');
    } catch (err) {
      showToast('เกิดข้อผิดพลาดในการประมวลผล: ' + err.message, 'error');
    } finally {
      setProcessing(false);
    }
  };

  // Handle User File Upload
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setImagePreview(reader.result);
      setStep('preprocess');
    };
    reader.readAsDataURL(file);
  };

  // Run Real OCR with Preprocessed Settings
  const handleRunOCRFromUpload = async () => {
    setProcessing(true);
    try {
      const res = await apiParseOCR({
        imageBase64: imagePreview,
        settings: { grayscale, contrast, rotation }
      });
      populateFormData(res);
      setStep('verify');
    } catch (err) {
      showToast('เกิดข้อผิดพลาดในการประมวลผล OCR: ' + err.message, 'error');
    } finally {
      setProcessing(false);
    }
  };

  const populateFormData = (res) => {
    const matchedCat = categories.find(c =>
      c.type === (res.suggestedType || 'income') &&
      c.name.includes(res.suggestedCategory || '')
    ) || categories.find(c => c.type === (res.suggestedType || 'income'));

    setFormData({
      amount: res.amount !== undefined ? res.amount : '',
      type: res.suggestedType || 'income',
      categoryId: matchedCat ? matchedCat.id : (categories[0]?.id || ''),
      date: res.date || new Date().toISOString().split('T')[0],
      time: res.time || new Date().toTimeString().slice(0, 5),
      sender: res.sender || '',
      receiver: res.receiver || '',
      bank: res.bank || 'ธนาคาร / พร้อมเพย์',
      referenceNo: res.referenceNo || '',
      note: res.note || `สแกนจากสลิป (${res.bank || 'ธนาคาร'})`,
      confidence: res.confidence || 95,
      rawText: res.rawText || ''
    });
  };

  const handleSaveTransaction = async (e) => {
    e.preventDefault();
    if (!formData.amount || !formData.categoryId) {
      showToast('กรุณากรอกยอดเงินและเลือกหมวดหมู่', 'error');
      return;
    }

    setProcessing(true);
    try {
      await apiCreateTransaction({
        workspace_id: currentWorkspace.id,
        category_id: formData.categoryId,
        amount: parseFloat(formData.amount),
        type: formData.type,
        date: formData.date,
        time: formData.time,
        note: formData.note,
        slip_url: imagePreview,
        ocr_raw_text: formData.rawText,
        ocr_confidence: formData.confidence,
        ocr_sender: formData.sender,
        ocr_receiver: formData.receiver,
        ocr_bank: formData.bank,
        ocr_ref_no: formData.referenceNo,
        source: 'ocr'
      });

      triggerCelebration();
      showToast('บันทึกรายการจากสลิปเรียบร้อยแล้ว!', 'success');
      setIsOCRModalOpen(false);
      refreshData();
    } catch (err) {
      showToast('บันทึกล้มเหลว: ' + err.message, 'error');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-pop-in">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-amber-200 overflow-hidden my-auto animate-slide-up">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-amber-50 via-white to-amber-50 px-5 py-3.5 border-b border-amber-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-[#F59E0B] text-white flex items-center justify-center shadow-md">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                ระบบอ่านสลิปและใบเสร็จด้วย OCR
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-[#D97706] font-semibold">
                  AI Optical Extraction
                </span>
              </h3>
              <p className="text-[11px] text-gray-500">
                สกัดข้อมูล วันที่ เวลา ยอดเงินสุทธิ และชื่อผู้รับ/ร้านค้า อัตโนมัติ
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsOCRModalOpen(false)}
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 max-h-[75vh] overflow-y-auto space-y-4">
          {/* STEP 1: UPLOAD / SELECT SAMPLE */}
          {step === 'upload' && (
            <div className="space-y-4">
              {/* Preset Sample Slips for 1-Click Fast Testing */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#F59E0B]" /> สลิปตัวอย่างสำหรับทดสอบทันที (1-Click Test)
                  </span>
                  <span className="text-[10px] text-gray-400">กรณีศึกษา ไร่ธนโชติ</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {sampleSlips.map((sample) => (
                    <button
                      key={sample.id}
                      onClick={() => handleSelectSample(sample)}
                      disabled={processing}
                      className="flex items-center gap-3 p-2.5 rounded-2xl border border-gray-200 hover:border-[#F59E0B] hover:bg-amber-50/50 transition-all text-left group"
                    >
                      <div className="w-12 h-14 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0 border border-gray-200">
                        <img
                          src={sample.imageUrl}
                          alt={sample.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-gray-900 truncate group-hover:text-[#D97706] transition">
                          {sample.bank}
                        </div>
                        <div className="text-[11px] text-gray-600 truncate">{sample.note}</div>
                        <div className="text-xs font-bold text-[#D97706] mt-0.5">
                          {sample.type === 'income' ? '+' : '-'}฿{sample.amount.toLocaleString()}
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-[#D97706] group-hover:translate-x-0.5 transition" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Upload Real Image Section */}
              <div className="border-t border-gray-100 pt-3">
                <span className="text-xs font-bold text-gray-800 block mb-2">
                  หรือ อัปโหลดภาพสลิป / ใบเสร็จ จากอุปกรณ์ของคุณ
                </span>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept="image/*"
                  className="hidden"
                />
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-amber-200 hover:border-[#F59E0B] rounded-3xl p-6 text-center cursor-pointer bg-[#FFFDF0] hover:bg-amber-50/60 transition-all space-y-2"
                >
                  <div className="w-12 h-12 rounded-full bg-amber-100 text-[#D97706] mx-auto flex items-center justify-center">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div className="text-xs font-bold text-gray-800">
                    คลิกเพื่อเลือกไฟล์รูปภาพ หรือ ลากไฟล์มาวางที่นี่
                  </div>
                  <div className="text-[10px] text-gray-400">
                    รองรับไฟล์ JPG, PNG, WEBP (สลิป KBank, SCB, PromptPay, 7-Eleven ฯลฯ)
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: IMAGE PREPROCESSING PIPELINE */}
          {step === 'preprocess' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                  <Sliders className="w-4 h-4 text-[#F59E0B]" /> Image Preprocessing Pipeline (การเตรียมภาพดิจิทัล)
                </span>
                <button
                  onClick={() => setStep('upload')}
                  className="text-xs text-gray-500 hover:text-gray-800"
                >
                  เลือกภาพใหม่
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                {/* Image Preview Canvas */}
                <div className="rounded-2xl border border-gray-200 overflow-hidden bg-gray-900 max-h-64 flex items-center justify-center p-2">
                  <img
                    src={imagePreview}
                    alt="Preprocessing Preview"
                    className="max-h-60 object-contain rounded-lg transition"
                    style={{
                      filter: `${grayscale ? 'grayscale(100%)' : ''} contrast(${contrast})`,
                      transform: `rotate(${rotation}deg)`
                    }}
                  />
                </div>

                {/* Preprocessing Controls */}
                <div className="space-y-3 bg-[#FFFDF0] p-3.5 rounded-2xl border border-amber-200">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-gray-700">Grayscale Conversion (ลดมิติสี)</label>
                    <input
                      type="checkbox"
                      checked={grayscale}
                      onChange={(e) => setGrayscale(e.target.checked)}
                      className="rounded text-[#F59E0B] focus:ring-[#F59E0B] h-4 w-4"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs text-gray-700 mb-1">
                      <span>Contrast Enhancement</span>
                      <span>{contrast}x</span>
                    </div>
                    <input
                      type="range"
                      min="0.8"
                      max="2.5"
                      step="0.1"
                      value={contrast}
                      onChange={(e) => setContrast(parseFloat(e.target.value))}
                      className="w-full accent-[#F59E0B]"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs text-gray-700 mb-1">
                      <span>Deskewing / Rotation (ปรับองศา)</span>
                      <span>{rotation}°</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setRotation((r) => (r + 90) % 360)}
                        className="p-1.5 rounded-lg bg-white border border-gray-300 text-xs text-gray-700 flex items-center gap-1 hover:bg-gray-100"
                      >
                        <RotateCw className="w-3.5 h-3.5" /> หมุน 90°
                      </button>
                    </div>
                  </div>

                  <button
                    onClick={handleRunOCRFromUpload}
                    disabled={processing}
                    className="w-full py-2.5 bg-[#F59E0B] hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-md"
                  >
                    {processing ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" /> กำลังประมวลผล OCR...
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4" /> เริ่มประมวลผล OCR และตรวจจับข้อมูล
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: VERIFICATION INTERFACE */}
          {step === 'verify' && (
            <form onSubmit={handleSaveTransaction} className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-900 flex items-center gap-1 text-emerald-600">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    หน้าต่างตรวจสอบและยืนยันข้อมูล (Verification Interface)
                  </span>
                </div>
                <div className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-semibold">
                  ความแม่นยำ AI: {formData.confidence}%
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Left: Slip Image Preview */}
                <div className="space-y-2">
                  <span className="text-[11px] font-semibold text-gray-500 block">ภาพสลิปต้นฉบับ</span>
                  <div className="rounded-2xl border border-gray-200 overflow-hidden bg-gray-50 flex items-center justify-center p-2 max-h-72">
                    <img
                      src={imagePreview}
                      alt="Verified Slip"
                      className="max-h-64 w-auto object-contain rounded-lg shadow-sm"
                    />
                  </div>
                  <div className="text-[10px] text-gray-400 bg-gray-50 p-2 rounded-xl border border-gray-100">
                    <strong>ข้อความที่ตรวจพบจาก OCR:</strong>
                    <p className="truncate">{formData.rawText || 'ตรวจพบข้อมูลสลิปสำเร็จ'}</p>
                  </div>
                </div>

                {/* Right: Editable Extracted Fields */}
                <div className="space-y-3">
                  {/* Type Toggle */}
                  <div className="grid grid-cols-2 gap-2 bg-gray-100 p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, type: 'income' })}
                      className={`py-1.5 text-xs font-bold rounded-lg transition ${
                        formData.type === 'income' ? 'bg-emerald-500 text-white shadow-sm' : 'text-gray-600'
                      }`}
                    >
                      รายรับ (+)
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, type: 'expense' })}
                      className={`py-1.5 text-xs font-bold rounded-lg transition ${
                        formData.type === 'expense' ? 'bg-rose-500 text-white shadow-sm' : 'text-gray-600'
                      }`}
                    >
                      รายจ่าย (-)
                    </button>
                  </div>

                  {/* Net Amount Field */}
                  <div>
                    <label className="text-[11px] font-bold text-gray-700 block mb-1">
                      ยอดเงินสุทธิ (บาท) *
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-base font-bold text-gray-400">฿</span>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={formData.amount}
                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                        className="w-full pl-8 pr-3 py-2 text-base font-bold text-[#D97706] bg-amber-50/60 border border-amber-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F59E0B]"
                      />
                    </div>
                  </div>

                  {/* Category Selector */}
                  <div>
                    <label className="text-[11px] font-bold text-gray-700 block mb-1">
                      หมวดหมู่ *
                    </label>
                    <select
                      required
                      value={formData.categoryId}
                      onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                      className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#F59E0B]"
                    >
                      <option value="">-- เลือกหมวดหมู่ --</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.type === 'income' ? '🟢 [รับ] ' : '🔴 [จ่าย] '} {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Date & Time */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] font-medium text-gray-600 block mb-1">วันที่</label>
                      <input
                        type="date"
                        value={formData.date}
                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                        className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-medium text-gray-600 block mb-1">เวลา</label>
                      <input
                        type="time"
                        value={formData.time}
                        onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                        className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-xl"
                      />
                    </div>
                  </div>

                  {/* Sender & Receiver Info */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <label className="text-[11px] font-medium text-gray-600 block mb-1">ผู้โอน / จาก</label>
                      <input
                        type="text"
                        value={formData.sender}
                        onChange={(e) => setFormData({ ...formData, sender: e.target.value })}
                        placeholder="ชื่อผู้โอน"
                        className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-medium text-gray-600 block mb-1">ผู้รับ / ถึง</label>
                      <input
                        type="text"
                        value={formData.receiver}
                        onChange={(e) => setFormData({ ...formData, receiver: e.target.value })}
                        placeholder="ชื่อผู้รับ"
                        className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-xl"
                      />
                    </div>
                  </div>

                  {/* Note */}
                  <div>
                    <label className="text-[11px] font-medium text-gray-600 block mb-1">หมายเหตุ</label>
                    <input
                      type="text"
                      value={formData.note}
                      onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                      placeholder="เช่น ลูกค้าซื้อของฝาก 5 กล่อง"
                      className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl"
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setStep('upload')}
                  className="px-4 py-2 text-xs text-gray-500 hover:text-gray-800 font-medium"
                >
                  ← กลับไปเลือกสลิปใหม่
                </button>

                <button
                  type="submit"
                  disabled={processing}
                  className="px-6 py-2.5 bg-gradient-to-r from-[#D97706] to-[#F59E0B] hover:from-amber-600 hover:to-amber-700 text-white rounded-xl text-xs font-bold shadow-lg shadow-amber-500/25 transition-all flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" /> ยืนยันบันทึกข้อมูลลงระบบ
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
