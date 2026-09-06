import React, { createContext, useContext, useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import {
  apiGetUsers,
  apiGetCurrentUser,
  apiSwitchUser,
  apiGetWorkspaces,
  apiGetCategories,
  apiGetOverview,
  apiGetGoogleStatus
} from '../services/api';

const AppContext = createContext(null);

export const AppProvider = ({ children }) => {
  // User state
  const [currentUser, setCurrentUser] = useState(null);
  const [allUsers, setAllUsers] = useState([]);
  
  // Workspaces state
  const [workspaces, setWorkspaces] = useState([]);
  const [currentWorkspace, setCurrentWorkspace] = useState(null);

  // Categories state
  const [categories, setCategories] = useState([]);

  // Filter state
  const [period, setPeriod] = useState('month'); // 'today', 'week', 'month', 'year', 'custom'
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Overview data
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);

  // Navigation & View mode
  const [activeTab, setActiveTab] = useState('summaries'); // 'summaries', 'transactions', 'members', 'categories', 'admin', 'line-flex'
  const [isMobileFrame, setIsMobileFrame] = useState(false); // Toggle mobile simulator frame

  // Modals state
  const [isOCRModalOpen, setIsOCRModalOpen] = useState(false);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [isWorkspaceModalOpen, setIsWorkspaceModalOpen] = useState(false);
  const [isMembersModalOpen, setIsMembersModalOpen] = useState(false);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [isLinePreviewOpen, setIsLinePreviewOpen] = useState(false);
  const [isGoogleSyncModalOpen, setIsGoogleSyncModalOpen] = useState(false);
  const [drilldownCategory, setDrilldownCategory] = useState(null);

  // Google Integration Status
  const [googleStatus, setGoogleStatus] = useState(null);

  // Toast / Alerts
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type, id: Date.now() });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  const triggerCelebration = () => {
    try {
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.7 },
        colors: ['#ED2E92', '#10B981', '#F59E0B', '#3B82F6']
      });
    } catch (e) {
      console.log('Confetti error:', e);
    }
  };

  // Initial Load
  const initApp = async () => {
    setLoading(true);
    try {
      // 1. Get users
      const usersRes = await apiGetUsers();
      setAllUsers(usersRes.data || []);
      
      const curr = await apiGetCurrentUser();
      setCurrentUser(curr);

      // 2. Get workspaces
      const wsList = await apiGetWorkspaces();
      setWorkspaces(wsList);
      
      if (wsList && wsList.length > 0) {
        // Default to Thanachote Souvenir Shop if available, else first
        const defaultWs = wsList.find(w => w.id === 'ws_thanachote') || wsList[0];
        setCurrentWorkspace(defaultWs);
      }
    } catch (err) {
      console.error('Initialization error:', err);
      showToast('ไม่สามารถโหลดข้อมูลเริ่มต้นได้: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    initApp();
  }, []);

  // Fetch categories & overview whenever workspace or period changes
  const refreshData = async () => {
    if (!currentWorkspace) return;
    try {
      const cats = await apiGetCategories(currentWorkspace.id);
      setCategories(cats);

      const ov = await apiGetOverview({
        workspace_id: currentWorkspace.id,
        period,
        startDate,
        endDate
      });
      setOverview(ov);
    } catch (err) {
      console.error('Error refreshing data:', err);
    }
  };

  useEffect(() => {
    refreshData();
  }, [currentWorkspace, period, startDate, endDate]);

  // Switch Active User
  const handleSwitchUser = async (userId) => {
    try {
      setLoading(true);
      const res = await apiSwitchUser(userId);
      setCurrentUser(res.data);
      showToast(`สลับบัญชีผู้ใช้เป็น ${res.data.display_name}`, 'success');

      // Refresh workspaces for this user
      const wsList = await apiGetWorkspaces();
      setWorkspaces(wsList);
      if (wsList.length > 0 && (!currentWorkspace || !wsList.find(w => w.id === currentWorkspace.id))) {
        setCurrentWorkspace(wsList[0]);
      }
    } catch (err) {
      showToast('ไม่สามารถสลับผู้ใช้ได้: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Switch Active Workspace
  const handleSwitchWorkspace = (ws) => {
    setCurrentWorkspace(ws);
    showToast(`สลับไปยังพื้นที่: ${ws.name}`, 'info');
  };

  const refreshGoogleStatus = async () => {
    try {
      const res = await apiGetGoogleStatus();
      setGoogleStatus(res);
    } catch (e) {
      console.warn('Could not fetch Google status:', e.message);
    }
  };

  useEffect(() => {
    refreshGoogleStatus();
  }, []);

  return (
    <AppContext.Provider
      value={{
        currentUser,
        allUsers,
        workspaces,
        currentWorkspace,
        categories,
        period,
        startDate,
        endDate,
        overview,
        loading,
        activeTab,
        isMobileFrame,
        toast,
        isOCRModalOpen,
        isVoiceModalOpen,
        isManualModalOpen,
        isWorkspaceModalOpen,
        isMembersModalOpen,
        isAuditModalOpen,
        isLinePreviewOpen,
        isGoogleSyncModalOpen,
        googleStatus,
        drilldownCategory,
        setPeriod,
        setStartDate,
        setEndDate,
        setActiveTab,
        setIsMobileFrame,
        setIsOCRModalOpen,
        setIsVoiceModalOpen,
        setIsManualModalOpen,
        setIsWorkspaceModalOpen,
        setIsMembersModalOpen,
        setIsAuditModalOpen,
        setIsLinePreviewOpen,
        setIsGoogleSyncModalOpen,
        refreshGoogleStatus,
        setDrilldownCategory,
        handleSwitchUser,
        handleSwitchWorkspace,
        refreshData,
        showToast,
        triggerCelebration
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => useContext(AppContext);
