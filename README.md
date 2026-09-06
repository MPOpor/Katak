# 💰 Katak - Smart Expense OCR & LINE OA Financial Management

ระบบบันทึกรายรับ-รายจ่ายอัจฉริยะ พร้อมระบบอ่านสลิปโอนเงินธนาคารด้วย **Google Gemini AI & Cloud Vision OCR**, ระบบสั่งการด้วยเสียงภาษาไทย (Thai Voice NLP), และหน้าเว็บแสดงผลสรุปบน **LINE LIFF** ในธีมสีเหลืองอ่อนพาสเทล (Soft Pastel Yellow)

---

## ✨ ฟีเจอร์หลัก (Key Features)

1. **📷 AI Bank Slip OCR Scanner**:
   - อ่านสลิปโอนเงินธนาคารไทย (KBank, SCB, Krungthai, PromptPay, ฯลฯ) อย่างแม่นยำด้วย Google AI
   - ดึงยอดเงินสุทธิ, วันที่, เวลา, รหัสอ้างอิง, ผู้โอน, ผู้รับ และหมวดหมู่อัตโนมัติ
2. **🤖 LINE Official Account Integration**:
   - รับภาพสลิปและข้อความสั่งงานผ่าน LINE OA Webhook
   - ตอบกลับด้วย **LINE Flex Message** สีประจำธนาคารพร้อมปุ่มเปิดดูสรุปบัญชี
3. **🎙️ Thai Voice Input**:
   - บันทึกรายรับ-รายจ่ายด้วยเสียงภาษาไทย (เช่น *"ขายของฝากได้ 1,500 บาท"*, *"จ่ายค่าไฟ 800"*)
4. **🏢 Multi-Tenant Workspace & RBAC**:
   - รองรับการแยกกระเป๋าเงิน (ร้านค้า SME, ครอบครัว, ส่วนบุคคล)
   - จัดการสิทธิ์การเข้าถึง (Owner / Member) พร้อมระบบ Audit Trail บันทึกประวัติกิจกรรม
5. **📊 Interactive Dashboard & Data Visualization**:
   - กราฟแนวโน้มกระแสเงินสด (Trend Line / Bar Chart)
   - กราฟวงกลมแยกสัดส่วนหมวดหมู่ (Donut Breakdown with Drill-down)
   - แผนภาพคลาวด์คำสำคัญ (Word Cloud) และตัวติดตามงบประมาณรายเดือน (Monthly Budget Tracker)

---

## 🛠️ โครงสร้างโปรเจกต์ (Project Architecture)

```
ProjectOCR1/
├── client/                     # Frontend React (Vite + TailwindCSS)
│   ├── src/
│   │   ├── components/         # Dashboard, Charts, Filters, Modals
│   │   ├── views/              # ManageView, CategoriesView, AdminView
│   │   ├── context/            # AppContext State Management
│   │   └── services/           # REST API Client
├── server/                     # Backend Node.js Express & SQLite
│   ├── db/                     # SQLite Database & Migration Schema
│   ├── routes/                 # Express API Routes (Transactions, LINE, OCR, etc.)
│   └── services/               # Google AI OCR, LINE Service, Flex Builder
├── .env.example                # Environment Variable Template
├── .gitignore                  # Git Ignore Rules
└── package.json                # Project Root Scripts
```

---

## 🚀 วิธีการติดตั้งและรันระบบ (Setup & Running)

### 1. ติดตั้ง Dependencies
```bash
# ติดตั้งที่ Root, Server และ Client
npm install
cd server && npm install && cd ..
cd client && npm install && cd ..
```

### 2. ตั้งค่าไฟล์สภาพแวดล้อม (.env)
คัดลอกไฟล์ `.env.example` ไปเป็น `.env`:
```bash
cp .env.example .env
```
กำหนดค่าคีย์ต่างๆ ในไฟล์ `.env`:
- `GOOGLE_API_KEY`: API Key จาก Google AI Studio
- `LINE_CHANNEL_ACCESS_TOKEN`: Messaging API Token จาก LINE Developers
- `LINE_CHANNEL_SECRET`: Channel Secret จาก LINE Developers
- `PUBLIC_APP_URL`: โดเมนภายนอกของคุณ (เช่น `https://katak.fun`)

### 3. รันระบบ (Start Server)
```bash
npm start
```
ระบบจะเปิดใช้งาน Backend & Frontend ที่ `http://localhost:5000`

---

## 🔒 ความปลอดภัย (Security & Privacy)
- ไฟล์ `.env` ที่เก็บคีย์ลับและภาพสลิปในโฟลเดอร์ `uploads/` ถูกตั้งค่าใน `.gitignore` เพื่อป้องกันการอัปโหลดขึ้น GitHub โดยเด็ดขาด
