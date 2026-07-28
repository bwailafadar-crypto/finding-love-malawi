import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiUsers, FiFlag, FiShield, FiCheckCircle, FiXCircle } from 'react-icons/fi';
import api from '../utils/api';

export default function AdminPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('dashboard');
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [u, r] = await Promise.all([
          api.admin.users().catch(() => ({ users: [] })),
          api.admin.reports().catch(() => ({ reports: [] })),
        ]);
        setUsers(u.users || []);
        setReports(r.reports || []);
        setStats({ totalUsers: (u.users || []).length, totalReports: (r.reports || []).length, activeReports: (r.reports || []).filter((x) => x.status === 'pending').length });
      } catch (err) { console.error('Error:', err.message); }
      setLoading(false);
    };
    load();
  }, []);

  const toggleBan = async (id, banned) => {
    try {
      if (banned) await api.admin.unbanUser(id);
      else await api.admin.banUser(id);
      setUsers((prev) => prev.map((u) => u.id === id ? { ...u, is_active: banned } : u));
    } catch (err) { console.error('Error:', err.message); }
  };

  const resolveReport = async (id) => {
    try {
      await api.admin.resolveReport(id);
      setReports((prev) => prev.map((r) => r.id === id ? { ...r, status: 'resolved' } : r));
    } catch (err) { console.error('Error:', err.message); }
  };

  if (loading) return <div className="flex justify-center items-center h-[calc(100vh-80px)]"><div className="animate-spin rounded-full h-10 w-10 border-4 border-pink-500 border-t-transparent" /></div>;

  return (
    <div className="px-4 pt-4 pb-24">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="p-2 text-gray-600 hover:text-gray-900"><FiArrowLeft size={22} /></button>
        <h1 className="text-xl font-extrabold text-gray-900">Admin Dashboard</h1>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-white rounded-2xl p-4 text-center shadow-sm border border-gray-100">
            <p className="text-2xl font-extrabold text-blue-500">{stats.totalUsers}</p>
            <p className="text-xs text-gray-500 mt-1 font-medium">Users</p>
          </div>
          <div className="bg-white rounded-2xl p-4 text-center shadow-sm border border-gray-100">
            <p className="text-2xl font-extrabold text-amber-500">{stats.activeReports}</p>
            <p className="text-xs text-gray-500 mt-1 font-medium">Open Reports</p>
          </div>
          <div className="bg-white rounded-2xl p-4 text-center shadow-sm border border-gray-100">
            <p className="text-2xl font-extrabold text-gray-300">{stats.totalReports}</p>
            <p className="text-xs text-gray-500 mt-1 font-medium">All Reports</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex bg-gray-100 rounded-2xl p-1 mb-5">
        <button onClick={() => setTab('dashboard')} className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition ${tab === 'dashboard' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>Users</button>
        <button onClick={() => setTab('reports')} className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition ${tab === 'reports' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>Reports</button>
      </div>

      {tab === 'dashboard' && (
        <div className="space-y-2">
          {users.map((u) => (
            <div key={u.id} className="flex items-center gap-3 bg-white rounded-2xl p-3 shadow-sm border border-gray-100">
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-600">
                {u.name?.[0] || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-900 text-sm truncate">{u.name}</p>
                <p className="text-xs text-gray-400 truncate">{u.email}</p>
              </div>
              <button onClick={() => toggleBan(u.id, u.is_active)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  u.is_active ? 'bg-red-50 text-red-500 hover:bg-red-100' : 'bg-green-50 text-green-500 hover:bg-green-100'
                }`}>
                {u.is_active ? 'Ban' : 'Unban'}
              </button>
            </div>
          ))}
          {users.length === 0 && <p className="text-center text-gray-400 py-10">No users found</p>}
        </div>
      )}

      {tab === 'reports' && (
        <div className="space-y-3">
          {reports.map((r) => (
            <div key={r.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <span className={`inline-block px-2 py-1 rounded-full text-[10px] font-bold ${
                    r.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'
                  }`}>{r.status}</span>
                  <span className="ml-2 text-xs text-gray-400">{r.reason}</span>
                </div>
                {r.status === 'pending' && (
                  <button onClick={() => resolveReport(r.id)}
                    className="px-3 py-1.5 bg-green-50 text-green-600 rounded-xl text-xs font-bold hover:bg-green-100 flex items-center gap-1">
                    <FiCheckCircle size={12} /> Resolve
                  </button>
                )}
              </div>
              {r.description && <p className="text-sm text-gray-600 mt-2">{r.description}</p>}
            </div>
          ))}
          {reports.length === 0 && <p className="text-center text-gray-400 py-10">No reports</p>}
        </div>
      )}
    </div>
  );
}
