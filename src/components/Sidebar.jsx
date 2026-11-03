import React from 'react';
import { 
  LayoutDashboard, 
  MessageSquare, 
  Kanban, 
  Calendar, 
  Send, 
  Smartphone, 
  Users, 
  Zap, 
  BarChart3, 
  Settings, 
  LogOut,
  ChevronRight,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';

export default function Sidebar({ activeTab, setActiveTab, unreadTotal = 4, waStatus = 'disconnected', currentUser, onLogout }) {
  const mainNav = [
    { id: 'dashboard', label: 'Main Overview', icon: LayoutDashboard },
    { id: 'chat', label: 'Customer Chats', icon: MessageSquare, badge: unreadTotal },
    { id: 'kanban', label: 'Leads & Deals', icon: Kanban },
    { id: 'schedule', label: 'Call Reminders', icon: Calendar },
  ];

  const manageNav = [
    ...(currentUser?.role === 'ADMIN' ? [
      { 
        id: 'channels', 
        label: 'WhatsApp Numbers', 
        icon: Smartphone, 
        highlight: waStatus === 'connected' ? '● Live' : waStatus === 'connecting' ? '● QR Ready' : '● Offline',
        isLive: waStatus === 'connected'
      },
      { id: 'team', label: 'Staff & Agents', icon: Users }
    ] : []),
    { id: 'replies', label: 'Quick Saved Replies', icon: Zap },
    ...(currentUser?.role === 'ADMIN' ? [
      { id: 'settings', label: 'System Settings', icon: Settings }
    ] : []),
  ];

  return (
    <aside className="w-48 lg:w-52 2xl:w-60 bg-white border-r border-[#EEF2F6] flex flex-col justify-between h-screen shrink-0 sticky top-0 select-none z-30 transition-all">
      {/* Top Brand Logo */}
      <div>
        <div className="p-3.5 pb-3 flex items-center justify-between border-b border-[#F1F5F9]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-orange-600 via-orange-500 to-amber-400 flex items-center justify-center text-white shadow-md shadow-orange-500/20 shrink-0">
              <MessageSquare className="w-4 h-4 fill-white" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1">
                <span className="font-extrabold text-sm tracking-tight text-slate-900">AmazFast</span>
                <span className="text-[9px] font-bold px-1 py-0.5 rounded bg-orange-100 text-orange-700 tracking-wide">PORTAL</span>
              </div>
              <p className="text-[10px] font-semibold text-slate-500 truncate">Service WhatsApp Hub</p>
            </div>
          </div>
        </div>

        {/* Navigation Sections */}
        <div className="px-3 py-4 space-y-6 overflow-y-auto max-h-[calc(100vh-230px)]">
          {/* Main Menu */}
          <div>
            <p className="px-3 text-[11px] font-bold tracking-wider text-slate-600 uppercase mb-2">Main Menu</p>
            <nav className="space-y-1">
              {mainNav.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 ${
                      isActive
                        ? 'bg-orange-50 text-orange-600 shadow-sm border border-orange-100/60'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`w-4 h-4 ${isActive ? 'text-orange-600 stroke-[2.2]' : 'text-slate-600'}`} />
                      <span>{item.label}</span>
                    </div>
                    {item.badge ? (
                      <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-orange-500 text-white animate-pulse">
                        {item.badge}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Management Menu */}
          <div>
            <p className="px-3 text-[11px] font-bold tracking-wider text-slate-600 uppercase mb-2">Management</p>
            <nav className="space-y-1">
              {manageNav.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 ${
                      isActive
                        ? 'bg-orange-50 text-orange-600 shadow-sm border border-orange-100/60'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`w-4 h-4 ${isActive ? 'text-orange-600 stroke-[2.2]' : 'text-slate-600'}`} />
                      <span>{item.label}</span>
                    </div>
                    {item.highlight ? (
                      <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded border ${
                        item.isLive 
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-300 font-extrabold'
                          : waStatus === 'connecting'
                          ? 'bg-amber-50 text-amber-700 border-amber-300'
                          : 'bg-slate-100 text-slate-500 border-slate-200'
                      }`}>
                        {item.highlight}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      </div>

      {/* Bottom Profile & Status Card */}
      <div className="p-3 border-t border-[#F1F5F9] bg-[#FAFBFC]">
        {/* WhatsApp Cloud Status Widget */}
        <div className="p-3 mb-2 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 text-white shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-orange-100 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-ping"></span>
              Live Gateway
            </span>
            <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded font-semibold text-white">99.9% Uptime</span>
          </div>
          <p className="text-xs font-bold">3 Numbers Connected</p>
          <div className="flex items-center gap-1 mt-1 text-[11px] text-orange-100">
            <span>🇦🇪 UAE</span> • <span>🇸🇦 KSA</span> • <span>🇵🇰 PK</span>
          </div>
        </div>

        {/* User Card */}
        <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-100 shadow-2xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="relative">
              <div className="w-8 h-8 rounded-full bg-orange-100 border border-orange-200 flex items-center justify-center font-black text-orange-600 text-xs">
                {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'A'}
              </div>
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white"></span>
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-800 truncate">{currentUser?.name || 'Admin User'}</p>
              <p className="text-[10px] font-bold text-orange-600 uppercase tracking-wider">{currentUser?.role || 'ADMIN'}</p>
            </div>
          </div>
          {onLogout && (
            <button
              onClick={onLogout}
              className="text-slate-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-lg transition-all"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
