import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import DashboardView from './components/DashboardView';
import LiveChatView from './components/LiveChatView';
import KanbanView from './components/KanbanView';
import ChannelsView from './components/ChannelsView';
import TeamView from './components/TeamView';
import NewLeadModal from './components/NewLeadModal';
import { INITIAL_LEADS, QUICK_REPLIES } from './data/mockData';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedChannel, setSelectedChannel] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [leads, setLeads] = useState(INITIAL_LEADS);
  const [selectedLeadId, setSelectedLeadId] = useState(INITIAL_LEADS[0].id);
  const [isNewLeadModalOpen, setIsNewLeadModalOpen] = useState(false);

  // Update lead helper
  const handleUpdateLead = (leadId, updates) => {
    setLeads(prev => prev.map(lead => {
      if (lead.id === leadId) {
        return { ...lead, ...updates };
      }
      return lead;
    }));
  };

  // Add lead helper
  const handleAddLead = (newLead) => {
    setLeads(prev => [newLead, ...prev]);
    setSelectedLeadId(newLead.id);
  };

  // Navigate to chat
  const handleOpenChat = (leadId) => {
    if (leadId) setSelectedLeadId(leadId);
    setActiveTab('chat');
  };

  // Calculate total unread
  const totalUnread = leads.reduce((acc, l) => acc + (l.unreadCount || 0), 0);

  return (
    <div className="flex min-h-screen bg-[#F8F9FC] text-slate-800 antialiased">
      {/* 1. Left Sidebar Navigation */}
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        unreadTotal={totalUnread}
      />

      {/* 2. Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto h-screen">
        {/* Top Header */}
        <Header
          selectedChannel={selectedChannel}
          setSelectedChannel={setSelectedChannel}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onOpenNewLead={() => setIsNewLeadModalOpen(true)}
          activeTab={activeTab}
        />

        {/* Dynamic Views */}
        <main className="flex-1 overflow-y-auto">
          {activeTab === 'dashboard' && (
            <DashboardView
              leads={leads}
              selectedChannel={selectedChannel}
              onOpenChat={handleOpenChat}
              onOpenNewLead={() => setIsNewLeadModalOpen(true)}
            />
          )}

          {activeTab === 'chat' && (
            <LiveChatView
              leads={leads}
              selectedLeadId={selectedLeadId}
              setSelectedLeadId={setSelectedLeadId}
              selectedChannel={selectedChannel}
              setSelectedChannel={setSelectedChannel}
              onUpdateLead={handleUpdateLead}
            />
          )}

          {activeTab === 'kanban' && (
            <KanbanView
              leads={leads}
              onUpdateLead={handleUpdateLead}
              onOpenChat={handleOpenChat}
              onOpenNewLead={() => setIsNewLeadModalOpen(true)}
              selectedChannel={selectedChannel}
            />
          )}

          {activeTab === 'channels' && (
            <ChannelsView />
          )}

          {activeTab === 'team' && (
            <TeamView />
          )}

          {activeTab === 'replies' && (
            <div className="p-6 max-w-5xl mx-auto space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div>
                  <h2 className="text-xl font-extrabold text-slate-900">Quick Replies & Canned Templates</h2>
                  <p className="text-xs text-slate-600">Type shortcut like /pricing in chat to insert pre-saved answers.</p>
                </div>
                <button 
                  onClick={() => alert('New shortcut created!')}
                  className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold shadow-sm"
                >
                  + Add Template
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {QUICK_REPLIES.map(qr => (
                  <div key={qr.shortcut} className="card-soft p-4 bg-white space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold font-mono text-orange-600 bg-orange-50 px-2 py-0.5 rounded border border-orange-100">
                        {qr.shortcut}
                      </span>
                      <span className="text-xs font-bold text-slate-800">{qr.title}</span>
                    </div>
                    <p className="text-xs text-slate-600 font-medium leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      {qr.content}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'schedule' && (
            <div className="p-6 max-w-5xl mx-auto space-y-4">
              <h2 className="text-xl font-extrabold text-slate-900">Follow-up Calendar & Schedule</h2>
              <p className="text-xs text-slate-600">All scheduled customer callbacks and demos across Dubai, Saudi, and Pakistan.</p>
              <div className="card-soft p-6 bg-white space-y-4">
                <div className="flex items-center justify-between p-3 rounded-xl bg-orange-50/60 border border-orange-100">
                  <span className="text-xs font-bold text-orange-900">🇦🇪 Sheikh Rashid Demo Call</span>
                  <span className="text-xs font-mono font-bold text-orange-600">Today 11:00 AM • Assigned: Hamza Tariq</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-teal-50/60 border border-teal-100">
                  <span className="text-xs font-bold text-teal-900">🇸🇦 Riyadh ZATCA Onboarding</span>
                  <span className="text-xs font-mono font-bold text-teal-600">Today 02:30 PM • Assigned: Sara Al-Mansoor</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50/60 border border-emerald-100">
                  <span className="text-xs font-bold text-emerald-900">🇵🇰 Karachi Wholesale Follow-up</span>
                  <span className="text-xs font-mono font-bold text-emerald-600">Today 04:00 PM • Assigned: Bilal Khan</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'broadcast' && (
            <div className="p-6 max-w-4xl mx-auto space-y-4">
              <h2 className="text-xl font-extrabold text-slate-900">WhatsApp Broadcast & Campaigns</h2>
              <p className="text-xs text-slate-600">Send announcements or offers to filtered customer tags via approved templates.</p>
              <div className="card-soft p-6 bg-white space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Target Country / Channel</label>
                  <select className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold">
                    <option>🇦🇪 Dubai Branch (+971)</option>
                    <option>🇸🇦 Saudi Branch (+966)</option>
                    <option>🇵🇰 Pakistan Branch (+92)</option>
                    <option>🌐 All Channels (Global)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Campaign Message</label>
                  <textarea rows={3} placeholder="Write marketing template..." className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"></textarea>
                </div>
                <button 
                  onClick={() => alert('Broadcast campaign queued for delivery!')}
                  className="px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold shadow-sm"
                >
                  Schedule Broadcast
                </button>
              </div>
            </div>
          )}

          {activeTab === 'analytics' && (
            <div className="p-6 max-w-5xl mx-auto space-y-4">
              <h2 className="text-xl font-extrabold text-slate-900">Reports & Analytics</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="card-soft p-5 bg-white">
                  <p className="text-xs text-slate-600 font-bold">Conversion Rate (Dubai)</p>
                  <h3 className="text-2xl font-extrabold text-slate-900 mt-1">28.4%</h3>
                  <p className="text-[11px] text-emerald-600 font-bold mt-1">↑ 4.2% vs last month</p>
                </div>
                <div className="card-soft p-5 bg-white">
                  <p className="text-xs text-slate-600 font-bold">Conversion Rate (Saudi)</p>
                  <h3 className="text-2xl font-extrabold text-slate-900 mt-1">24.1%</h3>
                  <p className="text-[11px] text-emerald-600 font-bold mt-1">↑ 2.8% vs last month</p>
                </div>
                <div className="card-soft p-5 bg-white">
                  <p className="text-xs text-slate-600 font-bold">Conversion Rate (Pak)</p>
                  <h3 className="text-2xl font-extrabold text-slate-900 mt-1">19.8%</h3>
                  <p className="text-[11px] text-emerald-600 font-bold mt-1">↑ 1.5% vs last month</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="p-6 max-w-4xl mx-auto space-y-4">
              <h2 className="text-xl font-extrabold text-slate-900">CRM Settings & Integrations</h2>
              <div className="card-soft p-6 bg-white space-y-4 text-xs">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div>
                    <h4 className="font-extrabold text-slate-900">Meta Cloud API Production Credentials</h4>
                    <p className="text-slate-600">Manage Meta App ID, Token, and Webhook secret</p>
                  </div>
                  <button className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg">
                    Configure Keys
                  </button>
                </div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div>
                    <h4 className="font-extrabold text-slate-900">Auto SLA Alerts</h4>
                    <p className="text-slate-600">Notify manager if any lead is unreplied for &gt; 5 minutes</p>
                  </div>
                  <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-bold">Enabled</span>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* 3. New Lead Modal */}
      <NewLeadModal
        isOpen={isNewLeadModalOpen}
        onClose={() => setIsNewLeadModalOpen(false)}
        onAddLead={handleAddLead}
      />
    </div>
  );
}
