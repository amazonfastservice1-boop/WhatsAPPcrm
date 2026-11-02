import React, { useState, useEffect } from 'react';
import { 
  Users, UserPlus, CheckCircle2, Shield, RefreshCw, 
  Trash2, Mail, Lock, Phone, Globe, AlertCircle, X, Check,
  KeyRound, Eye, EyeOff
} from 'lucide-react';
import { api } from '../services/api';

export default function TeamView() {
  const [users, setUsers] = useState([]);
  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [roundRobinEnabled, setRoundRobinEnabled] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [editingPasswordUser, setEditingPasswordUser] = useState(null);
  const [newPasswordVal, setNewPasswordVal] = useState('');
  const [showPasswordMap, setShowPasswordMap] = useState({});
  const [savingPassword, setSavingPassword] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'AGENT',
    channelIds: [],
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const [staffRes, channelsRes] = await Promise.all([
        api.getStaff(),
        api.getChannels(true),
      ]);

      if (staffRes?.users) {
        setUsers(staffRes.users);
      }
      // Only include active channels (Line 1, Line 2, Line 3)
      const allCh = channelsRes?.channels || (Array.isArray(channelsRes) ? channelsRes : []);
      const activeOnly = allCh.filter((c) => c.isActive);
      setChannels(activeOnly);
    } catch (err) {
      console.error('Failed to load team data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleChannelToggle = (channelId) => {
    setFormData((prev) => {
      const exists = prev.channelIds.includes(channelId);
      if (exists) {
        return { ...prev, channelIds: prev.channelIds.filter((id) => id !== channelId) };
      } else {
        return { ...prev, channelIds: [...prev.channelIds, channelId] };
      }
    });
  };

  const handleCreateStaff = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!formData.name || !formData.email || !formData.password) {
      setErrorMsg('Please enter name, email, and password.');
      return;
    }

    if (formData.password.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await api.createStaff(formData);
      if (res?.success) {
        setSuccessMsg('Staff member created successfully!');
        setIsModalOpen(false);
        setFormData({
          name: '',
          email: '',
          password: '',
          role: 'AGENT',
          channelIds: [],
        });
        await loadData();
      } else {
        setErrorMsg(res?.error || 'Failed to create staff member.');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Error occurred while saving staff member.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteStaff = async (user) => {
    if (!window.confirm(`Are you sure you want to remove ${user.name} from staff?`)) {
      return;
    }

    try {
      const res = await api.deleteStaff(user.id);
      if (res?.success) {
        setUsers((prev) => prev.filter((u) => u.id !== user.id));
      } else {
        alert(res?.error || 'Failed to remove staff member.');
      }
    } catch (err) {
      alert('Error deleting staff member');
    }
  };

  const toggleAvailability = async (user) => {
    try {
      const updatedOnline = !user.isOnline;
      // Optimistic UI update
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, isOnline: updatedOnline } : u))
      );
      await api.updateStaff(user.id, { isOnline: updatedOnline });
    } catch (err) {
      console.error('Failed to toggle status:', err);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="w-5 h-5 text-orange-500" />
            Team Members & Sales Agents
          </h2>
          <p className="text-xs text-slate-600 font-medium mt-0.5">
            Configure staff accounts, regional WhatsApp channel permissions, and online availability.
          </p>
        </div>

        <button
          onClick={() => {
            setErrorMsg('');
            setSuccessMsg('');
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 active:scale-95 text-white rounded-xl text-xs font-bold shadow-sm shadow-orange-500/30 transition-all cursor-pointer"
        >
          <UserPlus className="w-4 h-4" /> + Add New Staff / Agent
        </button>
      </div>

      {/* Round Robin Automation Info Box */}
      <div className="p-4 rounded-2xl bg-white border border-[#EEF2F6] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center font-bold shrink-0">
            <RefreshCw className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-extrabold text-slate-900">Regional Round-Robin Auto Assignment</h4>
            <p className="text-xs text-slate-600 font-medium">
              Automatically distribute new inbound leads equally to online agents matching the country number (Pakistan +92, Dubai +971, Saudi +966).
            </p>
          </div>
        </div>

        <button
          onClick={() => setRoundRobinEnabled(!roundRobinEnabled)}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
            roundRobinEnabled
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-slate-100 text-slate-600'
          }`}
        >
          {roundRobinEnabled ? '✓ Enabled' : 'Disabled'}
        </button>
      </div>

      {/* Staff Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h3 className="text-sm font-extrabold text-slate-900">
            Registered Staff & Agents ({users.length})
          </h3>
          <span className="text-xs font-bold text-slate-500">Live Database Sync Active</span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 font-medium text-xs">
            Loading staff members from database...
          </div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center text-slate-400 font-medium text-xs">
            No staff members registered yet. Click &quot;Add New Staff / Agent&quot; to create one.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {users.map((user) => {
              const allowedChannels = user.allowedChannels?.map((ac) => ac.channel) || [];
              const assignedCount = user._count?.assignedLeads ?? 0;
              const messagesCount = user._count?.messagesSent ?? 0;

              return (
                <div
                  key={user.id}
                  className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/70 transition-colors"
                >
                  {/* Left: Avatar & Info */}
                  <div className="flex items-center gap-3.5 min-w-[240px]">
                    <div className="relative">
                      <div className="w-11 h-11 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-700 text-sm shadow-sm">
                        {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                      </div>
                      <span
                        className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full ring-2 ring-white ${
                          user.isOnline ? 'bg-emerald-500' : 'bg-slate-300'
                        }`}
                      ></span>
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-extrabold text-slate-900">{user.name}</h4>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                            user.role === 'ADMIN'
                              ? 'bg-purple-100 text-purple-700'
                              : user.role === 'MANAGER'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-emerald-100 text-emerald-700'
                          }`}
                        >
                          {user.role}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <p className="text-xs font-medium text-slate-500 flex items-center gap-1">
                          <Mail className="w-3 h-3 text-slate-400" />
                          {user.email}
                        </p>

                        {/* Password Eye Toggle for Admin */}
                        {user.role !== 'ADMIN' && (
                          <div className="flex items-center gap-1.5 text-xs bg-slate-100/80 px-2 py-0.5 rounded-md border border-slate-200/80">
                            <Lock className="w-3 h-3 text-slate-400" />
                            <span className="font-mono text-slate-700 font-bold text-[11px]">
                              {showPasswordMap[user.id] 
                                ? (user.plainPassword || '••••••••') 
                                : '••••••••'}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setShowPasswordMap(prev => ({
                                  ...prev,
                                  [user.id]: !prev[user.id]
                                }));
                              }}
                              className="text-slate-400 hover:text-orange-600 transition-colors ml-0.5 cursor-pointer"
                              title={showPasswordMap[user.id] ? 'Hide Password' : 'Show Password'}
                            >
                              {showPasswordMap[user.id] ? (
                                <EyeOff className="w-3.5 h-3.5" />
                              ) : (
                                <Eye className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Middle: Allowed Regional Channels */}
                  <div className="flex-1 md:px-4">
                    <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider mb-1">
                      Assigned WhatsApp Channels
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {user.role === 'ADMIN' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold">
                          <Globe className="w-3 h-3 text-slate-500" /> All Regional Numbers (Admin)
                        </span>
                      ) : allowedChannels.length > 0 ? (
                        allowedChannels.map((c) => (
                          <span
                            key={c.id}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-orange-50 text-orange-800 border border-orange-200/60 text-xs font-semibold"
                          >
                            <Phone className="w-3 h-3 text-orange-500" />
                            {c.name} ({c.countryCode})
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-amber-600 font-medium">
                          No channels assigned yet
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right: Metrics & Actions (Aaj Ki Nayi Leads + Messages Sent) */}
                  <div className="flex flex-wrap items-center gap-4 text-xs font-semibold shrink-0">
                    <div>
                      <span className="text-slate-500 block text-[10px] uppercase font-bold" title="Aaj ke naye incoming customer messages (New Leads)">
                        Nayi Leads (Naya Msg)
                      </span>
                      <div className="flex items-baseline gap-1 mt-0.5">
                        <span className="font-extrabold text-orange-600 text-sm">
                          {user.todayLeadsCount ?? 0}
                        </span>
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1 py-0.2 rounded border border-emerald-200">
                          Aaj
                        </span>
                        <span className="text-[10px] text-slate-400 font-bold ml-1">
                          ({user.channelLeadsCount !== undefined ? user.channelLeadsCount : assignedCount} total)
                        </span>
                      </div>
                    </div>

                    <div>
                      <span className="text-slate-500 block text-[10px] uppercase font-bold">
                        Messages Sent
                      </span>
                      <div className="flex items-baseline gap-1 mt-0.5">
                        <span className="font-extrabold text-slate-900 text-sm">
                          {user.todayMessagesCount ?? 0}
                        </span>
                        <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-1 py-0.2 rounded border border-blue-200">
                          Aaj
                        </span>
                        <span className="text-[10px] text-slate-400 font-bold ml-1">
                          ({messagesCount} total)
                        </span>
                      </div>
                    </div>

                    {/* Status Toggle */}
                    <div>
                      <span className="text-slate-500 block text-[10px] uppercase font-bold mb-0.5">
                        Availability
                      </span>
                      <button
                        onClick={() => toggleAvailability(user)}
                        className={`px-3 py-1 rounded-full text-xs font-bold border transition-colors cursor-pointer ${
                          user.isOnline
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                            : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                        }`}
                      >
                        {user.isOnline ? 'Online' : 'Offline'}
                      </button>
                    </div>

                    {/* Reset Password Button */}
                    <button
                      onClick={() => {
                        setEditingPasswordUser(user);
                        setNewPasswordVal('');
                      }}
                      title="Password Badlein ya Naya Password Set Karein"
                      className="flex items-center gap-1 px-2.5 py-1 text-slate-600 hover:text-orange-600 hover:bg-orange-50 border border-slate-200 rounded-lg text-xs font-bold transition-all cursor-pointer"
                    >
                      <KeyRound className="w-3.5 h-3.5 text-orange-500" />
                      <span>Change Password</span>
                    </button>

                    {/* Delete Action (if not main admin) */}
                    {user.email !== 'admin@amazfast.com' && (
                      <button
                        onClick={() => handleDeleteStaff(user)}
                        title="Remove Staff"
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Staff Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden animate-scale-in">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center font-bold">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">Add New Staff / Agent</h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Create login credentials & assign regional numbers
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleCreateStaff} className="p-5 space-y-4">
              {errorMsg && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {errorMsg}
                </div>
              )}

              {/* Full Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Hamza Khan"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-orange-500 font-medium"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Email Address (Login)</label>
                <input
                  type="email"
                  required
                  placeholder="hamza@amazfast.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-orange-500 font-medium"
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Password</label>
                <input
                  type="password"
                  required
                  placeholder="Minimum 6 characters"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-orange-500 font-medium"
                />
              </div>

              {/* Role */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Staff Role</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-orange-500 font-medium bg-white"
                >
                  <option value="AGENT">AGENT (Can only manage assigned leads)</option>
                  <option value="MANAGER">MANAGER (Can view team performance & leads)</option>
                </select>
                <p className="text-[10px] text-slate-500 mt-1">
                  * Note: System Admin sirf aap hain. Naye staff ko sirf Agent ya Manager ka access mil sakta hai.
                </p>
              </div>

              {/* Allowed Channels Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Allowed Active WhatsApp Channels (Select which numbers this staff can see)
                </label>
                <div className="space-y-2 border border-slate-100 rounded-xl p-3 bg-slate-50/50 max-h-36 overflow-y-auto">
                    {Array.isArray(channels) && channels.length > 0 ? (
                      channels.map((ch) => {
                        const checked = formData.channelIds.includes(ch.id);
                        return (
                          <label
                            key={ch.id}
                            className={`flex items-center justify-between p-2 rounded-lg border text-xs cursor-pointer transition-all ${
                              checked
                                ? 'bg-orange-50/80 border-orange-300 text-orange-900 font-bold'
                                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 font-medium'
                            }`}
                          >
                            <span className="flex items-center gap-2">
                              <Phone className="w-3.5 h-3.5 text-slate-400" />
                              {ch.name} ({ch.countryCode}) - {ch.phoneNumber}
                            </span>
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => handleChannelToggle(ch.id)}
                              className="accent-orange-500"
                            />
                          </label>
                        );
                      })
                    ) : (
                      <p className="text-xs text-slate-400">No channels found</p>
                    )}
                  </div>
                </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-xs font-bold text-white bg-orange-500 hover:bg-orange-600 active:scale-95 disabled:opacity-50 rounded-xl shadow-sm transition-all"
                >
                  {submitting ? 'Creating...' : 'Create Staff Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Change Password Modal */}
      {editingPasswordUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-sm overflow-hidden animate-scale-in">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center font-bold">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-900">Change Staff Password</h4>
                  <p className="text-[10px] text-slate-500 font-medium">{editingPasswordUser.name} ({editingPasswordUser.email})</p>
                </div>
              </div>
              <button 
                onClick={() => setEditingPasswordUser(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!newPasswordVal || newPasswordVal.length < 6) {
                  alert('Password must be at least 6 characters long.');
                  return;
                }
                try {
                  setSavingPassword(true);
                  const res = await api.updateStaff(editingPasswordUser.id, { password: newPasswordVal });
                  if (res?.success) {
                    alert(`Password updated successfully for ${editingPasswordUser.name}!`);
                    setEditingPasswordUser(null);
                    setNewPasswordVal('');
                  } else {
                    alert(res?.error || 'Failed to update password');
                  }
                } catch {
                  alert('Server error updating password');
                } finally {
                  setSavingPassword(false);
                }
              }}
              className="p-4 space-y-3"
            >
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">New Password (Admin Override)</label>
                <input
                  type="text"
                  required
                  placeholder="Enter new password (e.g. ismail123)"
                  value={newPasswordVal}
                  onChange={(e) => setNewPasswordVal(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-orange-500 font-bold"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  * Password change karte hi staff is naye password se login karega.
                </p>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingPasswordUser(null)}
                  className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingPassword}
                  className="px-4 py-1.5 text-xs font-bold text-white bg-orange-500 hover:bg-orange-600 rounded-lg shadow-sm"
                >
                  {savingPassword ? 'Saving...' : 'Set Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
