import React, { useState } from 'react';
import { useApp } from './context/AppContext';
import Header from './components/Header';
import PeriodFilter from './components/PeriodFilter';
import SummaryCards from './components/SummaryCards';
import TrendChart from './components/TrendChart';
import CategoryDonutChart from './components/CategoryDonutChart';
import WordCloud from './components/WordCloud';
import TransactionList from './components/TransactionList';
import BottomNav from './components/BottomNav';
import DrilldownDrawer from './components/DrilldownDrawer';

// Modals
import OCRModal from './components/modals/OCRModal';
import VoiceModal from './components/modals/VoiceModal';
import ManualEntryModal from './components/modals/ManualEntryModal';
import WorkspaceModal from './components/modals/WorkspaceModal';
import MembersModal from './components/modals/MembersModal';
import AuditTrailModal from './components/modals/AuditTrailModal';
import LineFlexPreviewModal from './components/modals/LineFlexPreviewModal';

// Views
import ManageView from './views/ManageView';

import { Sparkles, CheckCircle2, AlertCircle, Info, Smartphone, Monitor } from 'lucide-react';

export default function App() {
  const {
    activeTab,
    isMobileFrame,
    toast,
    loading,
    currentWorkspace
  } = useApp();

  const [selectedWordKeyword, setSelectedWordKeyword] = useState('');

  return (
    <div className={`min-h-screen bg-[#FEFDF5] text-[#1F2937] ${isMobileFrame ? 'py-4 sm:py-8 flex justify-center items-start' : ''}`}>
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 animate-pop-in">
          <div className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl shadow-xl border text-xs font-semibold ${
            toast.type === 'error'
              ? 'bg-red-50 text-red-800 border-red-200'
              : toast.type === 'info'
              ? 'bg-amber-50 text-amber-900 border-amber-200'
              : 'bg-emerald-50 text-emerald-800 border-emerald-200'
          }`}>
            {toast.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
            ) : toast.type === 'info' ? (
              <Info className="w-4 h-4 text-amber-600 flex-shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            )}
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* Main Container (Mobile Frame or Full Responsive Web App) */}
      <div
        className={`w-full bg-[#FFFDF7] shadow-2xl transition-all duration-300 relative ${
          isMobileFrame
            ? 'max-w-[430px] min-h-[850px] rounded-[42px] border-[8px] border-gray-900 overflow-hidden ring-12 ring-amber-500/10'
            : 'min-h-screen'
        }`}
      >
        {/* Mobile Mockup Speaker Notch */}
        {isMobileFrame && (
          <div className="bg-gray-900 h-6 w-full flex items-center justify-center relative z-50">
            <div className="w-20 h-3.5 bg-black rounded-full" />
          </div>
        )}

        {/* Top Header */}
        <Header />

        {/* Period Filter (Shown on Summaries and Transactions) */}
        {(activeTab === 'summaries' || activeTab === 'transactions') && (
          <PeriodFilter />
        )}

        {/* Main Content View by Active Tab */}
        <main className="pb-24 pt-1">
          {/* 1. SUMMARIES / DASHBOARD TAB */}
          {activeTab === 'summaries' && (
            <div className="space-y-3 sm:space-y-4 animate-slide-up">
              {/* Summary Cards & Monthly Budget */}
              <SummaryCards />

              {/* Data Visualization Grid */}
              <div className="max-w-4xl mx-auto px-4 grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                {/* Trend Line / Bar Chart */}
                <TrendChart />

                {/* Category Donut Breakdown */}
                <CategoryDonutChart />
              </div>

              {/* Word Cloud */}
              <div className="max-w-4xl mx-auto px-4">
                <WordCloud onSelectKeyword={(kw) => setSelectedWordKeyword(kw)} />
              </div>

              {/* Transaction Feed preview */}
              <div className="max-w-4xl mx-auto px-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-bold text-gray-800">
                    รายการธุรกรรมล่าสุด
                  </h3>
                  {selectedWordKeyword && (
                    <span className="text-xs text-[#D97706] font-semibold">
                      กรองคำว่า: "{selectedWordKeyword}"
                    </span>
                  )}
                </div>
                <TransactionList
                  filterKeyword={selectedWordKeyword}
                  onClearKeyword={() => setSelectedWordKeyword('')}
                />
              </div>
            </div>
          )}

          {/* 2. TRANSACTIONS TAB */}
          {activeTab === 'transactions' && (
            <div className="max-w-4xl mx-auto px-4 animate-slide-up">
              <TransactionList />
            </div>
          )}

          {/* 3. MEMBERS TAB */}
          {activeTab === 'members' && (
            <div className="animate-slide-up">
              <MembersModal />
            </div>
          )}

          {/* 4. MANAGE TAB (Categories / Admin / Settings) */}
          {activeTab === 'manage' && (
            <div className="animate-slide-up">
              <ManageView />
            </div>
          )}
        </main>

        {/* Fixed Bottom Navigation Bar */}
        <BottomNav />

        {/* Global Modals */}
        <OCRModal />
        <VoiceModal />
        <ManualEntryModal />
        <WorkspaceModal />
        <MembersModal />
        <AuditTrailModal />
        <LineFlexPreviewModal />
        <DrilldownDrawer />
      </div>
    </div>
  );
}
