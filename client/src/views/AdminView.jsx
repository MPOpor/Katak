import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  apiGetAdminUsers,
  apiUpdateUserStatus,
  apiGetSystemLogs,
  apiGetAdminStats
} from '../../src/services/api';
import {
  Shield,
  Users,
  Database,
  Activity,
  Lock,
  Unlock,
  Search,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Server,
  Cpu
} from 'lucide-react';

export default function AdminView() {
  const { currentUser, showToast } = useApp();
  const [users, setUsers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [logFilter, setLogFilter] = useState('');
  const [searchUser, setSearchUser] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const [uList, lList, sData] = await Promise.all([
        apiGetAdminUsers(),
        apiGetSystemLogs({ limit: 40 }),
        apiGetAdminStats()
      ]);
      setUsers(uList || []);
      setLogs(lList || []);
      setStats(sData || null);
    } catch (err) {
      console.error(err);
      showToast('เกิดข้อผิดพลาดในการโหลดข้อมูลแอดมิน: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleToggleStatus = async (user) => {
    const newStatus = user.status === 'active' ? 'suspended' : 'active';
    try {
      await apiUpdateUserStatus(user.id, newStatus);
      showToast(`เปลี่ยนสถานะของ ${user.display_name} เป็น ${newStatus} สำเร็จ`, 'success');
      fetchAdminData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const filteredUsers = users.filter(u => 
    u.display_name.toLowerCase().includes(searchUser.toLowerCase()) ||
    u.line_user_id.toLowerCase().includes(searchUser.toLowerCase())
  );

  const filteredLogs = logs.filter(l => !logFilter || l.level === logFilter);

  return (
    <div className="space-y-4 max-w-4xl mx-auto px-4 py-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-purple-600 text-white flex items-center justify-center shadow-md">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-bold text-gray-900">ระบบผู้ดูแลระบบ (Admin Portal)</h2>
            <p className="text-xs text-gray-400">ตรวจสอบสถานะ API, จัดการผู้ใช้ และ System Logs</p>
          </div>
        </div>

        <button
          onClick={fetchAdminData}
          className="p-2 rounded-xl bg-white border border-gray-200 text-gray-600 hover:text-purple-600 shadow-sm transition"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="bg-white p-3 rounded-2xl border border-[#FDE68A] shadow-soft">
            <span className="text-[11px] text-gray-500 block">ผู้ใช้ทั้งหมด</span>
            <div className="text-lg font-bold text-gray-900 mt-0.5">{stats.totalUsers} คน</div>
          </div>
          <div className="bg-white p-3 rounded-2xl border border-[#FDE68A] shadow-soft">
            <span className="text-[11px] text-gray-500 block">Workspaces</span>
            <div className="text-lg font-bold text-[#D97706] mt-0.5">{stats.totalWorkspaces} พื้นที่</div>
          </div>
          <div className="bg-white p-3 rounded-2xl border border-[#FDE68A] shadow-soft">
            <span className="text-[11px] text-gray-500 block">ธุรกรรมในระบบ</span>
            <div className="text-lg font-bold text-indigo-600 mt-0.5">{stats.totalTransactions} รายการ</div>
          </div>
          <div className="bg-white p-3 rounded-2xl border border-[#FDE68A] shadow-soft">
            <span className="text-[11px] text-gray-500 block">ยอดหมุนเวียนรวม</span>
            <div className="text-lg font-bold text-emerald-600 mt-0.5">฿{stats.totalVolume.toLocaleString()}</div>
          </div>
        </div>
      )}

      {/* API Connections Health Monitor */}
      {stats?.apiStatus && (
        <div className="bg-white rounded-2xl p-4 border border-[#FDE68A] shadow-soft space-y-2.5">
          <h3 className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
            <Server className="w-4 h-4 text-amber-600" /> สถานะการเชื่อมต่อ API & Cloud Services
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            {Object.entries(stats.apiStatus).map(([key, val]) => (
              <div key={key} className="p-2.5 bg-gray-50 rounded-xl flex items-center justify-between border border-gray-100">
                <span className="text-gray-600 font-medium capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                <span className="flex items-center gap-1 text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-semibold border border-emerald-200">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" /> {val}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* User Management Table (RBAC / Suspend) */}
      <div className="bg-white rounded-2xl p-4 border border-[#FDE68A] shadow-soft space-y-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <h3 className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
            <Users className="w-4 h-4 text-purple-600" /> จัดการบัญชีผู้ใช้งานและสิทธิ์ ({users.length} บัญชี)
          </h3>
          <div className="relative w-full sm:w-56">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchUser}
              onChange={(e) => setSearchUser(e.target.value)}
              placeholder="ค้นหาชื่อหรือ LINE ID..."
              className="w-full pl-8 pr-3 py-1 text-xs bg-gray-50 border border-gray-200 rounded-xl"
            />
          </div>
        </div>

        <div className="divide-y divide-gray-100 max-h-60 overflow-y-auto">
          {filteredUsers.map((u) => (
            <div key={u.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5 min-w-0">
                <img
                  src={u.picture_url}
                  alt={u.display_name}
                  className="w-7 h-7 rounded-full object-cover border border-gray-200"
                />
                <div className="min-w-0">
                  <div className="font-semibold text-gray-900 truncate flex items-center gap-1.5">
                    {u.display_name}
                    <span className={`text-[9px] px-1.5 py-0.2 rounded font-medium ${
                      u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {u.role}
                    </span>
                  </div>
                  <div className="text-[10px] text-gray-400 truncate">
                    ID: {u.line_user_id} • {u.workspace_count} พื้นที่ • {u.transaction_count} ธุรกรรม
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleToggleStatus(u)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 transition ${
                  u.status === 'active'
                    ? 'bg-emerald-100 text-emerald-800 hover:bg-red-100 hover:text-red-800'
                    : 'bg-red-100 text-red-800 hover:bg-emerald-100 hover:text-emerald-800'
                }`}
              >
                {u.status === 'active' ? (
                  <>
                    <Unlock className="w-3 h-3 text-emerald-600" /> ใช้งานอยู่ (Active)
                  </>
                ) : (
                  <>
                    <Lock className="w-3 h-3 text-red-600" /> ถูกระงับสิทธิ์ (Suspended)
                  </>
                )}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* System Logs (Section 4.3) */}
      <div className="bg-white rounded-2xl p-4 border border-[#EBE3DE] shadow-soft space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
            <Activity className="w-4 h-4 text-purple-600" /> บันทึกการทำงานของระบบ (System Logs)
          </h3>
          <div className="flex items-center gap-1 text-[10px]">
            <button
              onClick={() => setLogFilter('')}
              className={`px-2 py-0.5 rounded ${!logFilter ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600'}`}
            >
              ทั้งหมด
            </button>
            <button
              onClick={() => setLogFilter('INFO')}
              className={`px-2 py-0.5 rounded ${logFilter === 'INFO' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}
            >
              INFO
            </button>
            <button
              onClick={() => setLogFilter('WARN')}
              className={`px-2 py-0.5 rounded ${logFilter === 'WARN' ? 'bg-amber-600 text-white' : 'bg-gray-100 text-gray-600'}`}
            >
              WARN
            </button>
            <button
              onClick={() => setLogFilter('ERROR')}
              className={`px-2 py-0.5 rounded ${logFilter === 'ERROR' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-600'}`}
            >
              ERROR
            </button>
          </div>
        </div>

        <div className="space-y-1.5 max-h-56 overflow-y-auto font-mono text-[11px]">
          {filteredLogs.map((log) => (
            <div
              key={log.id}
              className="p-2 bg-gray-50 rounded-xl border border-gray-100 flex items-start justify-between gap-2"
            >
              <div>
                <div className="flex items-center gap-1.5">
                  <span className={`text-[9px] px-1 py-0.2 rounded font-bold ${
                    log.level === 'ERROR' ? 'bg-red-100 text-red-700' : log.level === 'WARN' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {log.level}
                  </span>
                  <span className="text-gray-500 font-semibold">[{log.module}]</span>
                  <span className="text-gray-800">{log.message}</span>
                </div>
              </div>
              <span className="text-[10px] text-gray-400 whitespace-nowrap flex-shrink-0">
                {log.timestamp?.split(' ')[1]}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
