import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAccessibility } from '../context/AccessibilityContext';
import { Shield, Users, Package, Trash2, AlertCircle, Activity, MessageSquare, CreditCard, Clock, Flag, AlertTriangle, ChevronRight } from 'lucide-react';
import ConfirmationModal from '../components/ConfirmationModal';
import { useSocket } from '../context/SocketContext';

// ... (Interfaces remain the same)

const Admin: React.FC = () => {
  const { announce } = useAccessibility();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'users' | 'reports' | 'errors'>('users');
  const [warningUserId, setWarningUserId] = useState<string | null>(null);
  const [warningMessage, setWarningMessage] = useState('');
  const [sendingWarning, setSendingWarning] = useState(false);
  const { onlineUsers = [] } = useSocket();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [usersRes, statsRes, reportsRes] = await Promise.all([
          api.get('/admin/users'),
          api.get('/admin/stats'),
          api.get('/admin/reports')
        ]);
        setUsers(Array.isArray(usersRes.data) ? usersRes.data : []);
        setStats(statsRes.data);
        setReports(Array.isArray(reportsRes.data) ? reportsRes.data : []);
        announce('Admin dashboard loaded.');
      } catch (error) {
        console.error('Error fetching admin data:', error);
        setUsers([]);
        setReports([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [announce]);

  // ... (resolveReport, sendWarning, deleteUser logic remains same)

  if (loading) return (
    <div className="max-w-7xl mx-auto px-4 py-20 text-center">
      <div className="animate-spin h-10 w-10 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto mb-4"></div>
      <p className="font-black text-slate-400 uppercase tracking-widest text-xs">Initializing Systems...</p>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <header className="flex items-center gap-5 mb-10">
        <div className="bg-indigo-600 p-3 rounded-2xl shadow-lg shadow-indigo-100 dark:shadow-none">
          <Shield className="h-7 w-7 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-slate-50 tracking-tight">Console</h1>
          <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">System Management & Oversight</p>
        </div>
      </header>

      {/* SLEEK STATS GRID */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-10">
        {[
          { label: 'Total Users', val: stats?.totalUsers, icon: <Users className="h-4 w-4 text-indigo-600" />, sub: `${onlineUsers.length} Live` },
          { label: 'Pending Reports', val: stats?.totalReports, icon: <Flag className="h-4 w-4 text-red-600" />, danger: (stats?.totalReports || 0) > 0 },
          { label: 'Listings', val: stats?.totalListings, icon: <Package className="h-4 w-4 text-emerald-600" /> },
          { label: 'Messages', val: stats?.totalMessages, icon: <MessageSquare className="h-4 w-4 text-amber-600" /> },
          { label: 'Volume', val: stats?.totalTransactions, icon: <CreditCard className="h-4 w-4 text-purple-600" /> },
        ].map((s, i) => (
          <div key={i} className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-lg">{s.icon}</div>
              {s.sub && <span className="text-[9px] font-black text-green-500 uppercase tracking-tighter">{s.sub}</span>}
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{s.label}</p>
            <h3 className={`text-xl font-black ${s.danger ? 'text-red-600' : 'text-slate-900 dark:text-slate-50'}`}>{s.val || 0}</h3>
          </div>
        ))}
      </div>

      {/* TIGHT TAB NAVIGATION */}
      <div className="flex gap-6 mb-8 border-b border-slate-100 dark:border-slate-800">
        {['users', 'reports', 'errors'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={`pb-4 px-1 text-xs font-black uppercase tracking-widest transition-all relative ${
              activeTab === tab ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            {tab}
            {tab === 'reports' && (stats?.totalReports || 0) > 0 && (
              <span className="ml-2 bg-red-600 text-white text-[9px] px-1.5 py-0.5 rounded-md">{stats?.totalReports}</span>
            )}
            {activeTab === tab && <div className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-600 rounded-t-full"></div>}
          </button>
        ))}
      </div>

      {/* DATA TABLES */}
      <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
        {activeTab === 'users' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-400 text-[10px] font-black uppercase tracking-widest">
                  <th className="px-6 py-4">Identity</th>
                  <th className="px-6 py-4">Authorization</th>
                  <th className="px-6 py-4">Registry Date</th>
                  <th className="px-6 py-4 text-right">Operations</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {(Array.isArray(users) ? users : []).map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 bg-indigo-600 rounded-xl flex items-center justify-center text-white text-xs font-black">
                          {u.name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900 dark:text-slate-50">{u.name}</p>
                          <p className="text-[10px] font-medium text-slate-400">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-[9px] font-black px-2 py-1 rounded-md uppercase tracking-tighter ${
                        u.role === 'admin' ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs font-bold text-slate-500">
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {u.role !== 'admin' && (
                        <div className="flex justify-end gap-1">
                          <button onClick={() => setWarningUserId(u.id)} className="p-2 text-slate-300 hover:text-amber-500 transition-colors"><AlertTriangle className="h-4 w-4" /></button>
                          <button onClick={() => setUserToDelete(u.id)} className="p-2 text-slate-300 hover:text-red-500 transition-colors"><Trash2 className="h-4 w-4" /></button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'reports' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              {/* ... (Apply similar sleek table classes to Reports) */}
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {(Array.isArray(reports) ? reports : []).map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                    <td className="px-6 py-4 text-sm font-bold text-slate-900 dark:text-slate-50">{r.reported_name}</td>
                    <td className="px-6 py-4 text-xs font-medium text-slate-500">{r.reason}</td>
                    <td className="px-6 py-4">
                      <span className={`text-[9px] font-black px-2 py-1 rounded-md uppercase ${r.status === 'pending' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                       <button onClick={() => resolveReport(r.id)} className="text-[10px] font-black uppercase text-indigo-600 hover:underline">Mark Resolved</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ... (Apply similar logic to Errors tab) */}
      </div>

      {/* WARNING MODAL & CONFIRMATION MODAL styled with rounded-[2.5rem] and font-black buttons */}
      {/* ... */}
    </div>
  );
};

export default Admin;