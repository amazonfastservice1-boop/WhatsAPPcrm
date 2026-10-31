import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import DashboardView from './components/DashboardView';
import LiveChatView from './components/LiveChatView';
import KanbanView from './components/KanbanView';
import ChannelsView from './components/ChannelsView';
import TeamView from './components/TeamView';
import ScheduleView from './components/ScheduleView';
import NewLeadModal from './components/NewLeadModal';
import { QUICK_REPLIES } from './data/mockData';
import { socket } from './services/socket';
import { api } from './services/api';
import { formatChannelDisplayName, formatSafeTime, normalizePhoneNumber } from './utils/leadFilters';

// Helper: get country flag and key from country code
function getChannelMeta(countryCode) {
  const code = (countryCode || '').toLowerCase();
  if (code === 'ae') return { flag: '🇦🇪', key: 'dubai', currency: 'AED' };
  if (code === 'sa') return { flag: '🇸🇦', key: 'saudi', currency: 'SAR' };
  return { flag: '🇵🇰', key: 'pakistan', currency: 'PKR' };
}

export default function App() {
  const [activeTab, setActiveTab] = useState('chat');
  const [selectedChannel, setSelectedChannel] = useState('all');
  // Dynamic channels loaded from database — starts with just the 'All' option
  const [channels, setChannels] = useState([
    { id: 'all', name: 'Saare Numbers', flag: '🌐', number: 'All Channels' }
  ]);
  const [searchQuery, setSearchQuery] = useState('');
  const [leads, setLeads] = useState([]);
  const [selectedLeadId, setSelectedLeadId] = useState(null);
  const [isNewLeadModalOpen, setIsNewLeadModalOpen] = useState(false);
  const [waStatus, setWaStatus] = useState('disconnected');
  const [waUser, setWaUser] = useState(null);
  const [connectionToast, setConnectionToast] = useState(null);

  const selectedLeadIdRef = React.useRef(selectedLeadId);
  useEffect(() => {
    selectedLeadIdRef.current = selectedLeadId;
  }, [selectedLeadId]);

  // Helper to format database lead into CRM UI lead
  const formatApiLead = (l) => {
    const channelCode = l.channel?.countryCode?.toLowerCase() || 'pk';
    const { flag } = getChannelMeta(channelCode);
    // Use the real DB channel UUID as the channel key for filtering
    const channelKey = l.channel?.id || l.channelId || 'unknown';
    
    const stageMap = {
      NEW_LEAD: 'New Lead',
      CONTACTED: 'Contacted',
      QUALIFIED: 'Qualified',
      PROPOSAL_SENT: 'Proposal Sent',
      WON: 'Deal Won',
      LOST: 'Lost',
    };

    // Clean name: if fullName is masked or raw phone, format phone nicely
    let displayName = l.fullName || l.phoneNumber;
    if (!displayName || displayName.includes('∙') || displayName.startsWith('+92')) {
      displayName = l.fullName && !l.fullName.includes('∙') ? l.fullName : l.phoneNumber;
    }

    const avatarBgColors = ['128C7E', '075E54', '25D366', '34B7F1', 'E542A3', '7C4DFF', 'FF5722', '00897B'];
    const charCode = (displayName || 'U').charCodeAt(0);
    const bg = avatarBgColors[charCode % avatarBgColors.length];
    const generatedAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName || 'U')}&background=${bg}&color=fff&size=128&bold=true&rounded=true`;

    return {
      id: l.id,
      name: displayName,
      phone: l.phoneNumber,
      channel: channelKey,
      channelName: l.channel?.name || `${flag} Channel`,
      flag: flag,
      currency: l.channel?.currency || 'PKR',
      dealValue: l.dealValue ? l.dealValue.toLocaleString() : '0',
      stage: stageMap[l.stage] || l.stage || 'New Lead',
      assignedToId: l.assignedToId || null,
      assignedTo: l.assignedTo?.name || 'Unassigned',
      assignedAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      avatar: l.avatarUrl || generatedAvatar,
      unreadCount: l.unreadCount || 0,
      createdAt: l.createdAt ? new Date(l.createdAt).toISOString() : new Date().toISOString(),
      rawLastMessageAt: l.lastMessageAt || l.messages?.[0]?.createdAt || 0,
      lastMessage: l.lastMessage || l.messages?.[0]?.content || 'WhatsApp conversation',
      lastTime: l.lastMessageAt ? formatSafeTime(l.lastMessageAt) : 'Just now',
      tags: l.tags?.map((t) => t.tag?.name) || ['WhatsApp Inbound'],
      notes: l.notes || [],
      messages: l.messages?.map((m) => ({
        id: m.id,
        sender: m.senderType === 'AGENT' ? 'agent' : 'customer',
        agentName: m.senderUser?.name || 'Agent',
        text: m.content,
        mediaType: m.mediaType || (m.content === 'Voice Note' ? 'AUDIO' : 'TEXT'),
        mediaUrl: m.mediaUrl || null,
        time: formatSafeTime(m.createdAt),
        status: (m.status || 'delivered').toLowerCase(),
      })) || [],
    };
  };

  // Reusable leads fetcher from PostgreSQL (Intelligent Merge — Never wipes open conversation)
  const fetchRealLeads = React.useCallback(async () => {
    try {
      const res = await api.getLeads();
      if (res?.leads && res.leads.length > 0) {
        const realLeads = res.leads.map(formatApiLead);
        setLeads((prev) => {
          if (prev.length === 0) return realLeads;
          // Preserve full message thread for whichever lead is currently open
          return realLeads.map((newLead) => {
            const existing = prev.find((p) => p.id === newLead.id);
            if (existing && existing.messages && existing.messages.length > 0) {
              return {
                ...newLead,
                messages: existing.messages,
                lastMessage: existing.lastMessage || newLead.lastMessage,
                unreadCount: existing.id === selectedLeadIdRef.current ? 0 : (existing.unreadCount || newLead.unreadCount),
              };
            }
            return newLead;
          });
        });
        if (!selectedLeadIdRef.current) {
          setSelectedLeadId(realLeads[0].id);
        }
      }
    } catch (err) {
      console.warn('Failed to load leads:', err);
    }
  }, []);

  // Load 100% REAL leads from database on startup (ZERO mock data)
  useEffect(() => {
    async function initRealData() {
      try {
        await api.login();

        // Load real channels from database and build dynamic switcher
        const chRes = await api.getChannels();
        if (chRes?.channels && chRes.channels.length > 0) {
          const dbChannels = chRes.channels.map((ch) => {
            const code = (ch.countryCode || 'PK').toLowerCase();
            const { flag } = getChannelMeta(code);
            return {
              id: ch.id,           // real UUID — used for filtering
              name: formatChannelDisplayName(ch),
              flag,
              number: ch.phoneNumber || '',
            };
          });
          setChannels([
            { id: 'all', name: 'Saare Numbers', flag: '🌐', number: 'All Channels' },
            ...dbChannels,
          ]);

          // Automatically default to the Real Meta API Channel (+92 332 2568950)
          const realMetaChannel = dbChannels.find(
            (c) => c.number?.includes('3322568950') || c.id === '25f254f7-edc2-42de-b782-fff737c75999'
          );
          if (realMetaChannel) {
            setSelectedChannel(realMetaChannel.id);
          }
        }

        await fetchRealLeads();

        // Also get initial WhatsApp connection status
        const statusRes = await api.getWhatsAppStatus();
        if (statusRes?.status) {
          setWaStatus(statusRes.status);
          if (statusRes.user) setWaUser(statusRes.user);
        }
      } catch (err) {
        console.warn('⚠️ Backend/DB unavailable on startup:', err.message);
        // App stays functional — user will see empty state instead of white screen
      }
    }
    initRealData();
  }, [fetchRealLeads]);

  // Fetch full conversation history when active lead changes
  useEffect(() => {
    if (!selectedLeadId) return;
    async function loadChat() {
      try {
        const data = await api.getMessages(selectedLeadId);
        if (data?.messages) {
          setLeads((prev) =>
            prev.map((l) => {
              if (l.id === selectedLeadId) {
                return {
                  ...l,
                  messages: data.messages.map((m) => ({
                    id: m.id,
                    sender: m.senderType === 'AGENT' ? 'agent' : 'customer',
                    agentName: m.senderUser?.name || 'Agent',
                    text: m.content,
                    mediaType: m.mediaType || (m.content === 'Voice Note' ? 'AUDIO' : 'TEXT'),
                    mediaUrl: m.mediaUrl || null,
                    time: formatSafeTime(m.createdAt),
                    status: (m.status || 'delivered').toLowerCase(),
                  })),
                  unreadCount: 0,
                };
              }
              return l;
            })
          );
        }
      } catch (err) {
        console.warn('⚠️ Could not load chat messages:', err.message);
      }
    }
    loadChat();
  }, [selectedLeadId]);

  // Authenticate and wire real-time WebSocket listeners ONCE (Stable, no reload loops)
  useEffect(() => {
    let debouncedTimer = null;

    const handleNewMessage = (payload) => {
      const msg = payload.message || payload;
      const targetLeadId = payload.leadId || msg.leadId;
      const currentSelected = selectedLeadIdRef.current;
      const now = new Date();
      const messageContent = msg.content || (msg.mediaType === 'AUDIO' ? 'Voice Note' : 'New Message');

      setLeads((prev) => {
        const found = prev.some((l) => l.id === targetLeadId);
        if (!found) {
          // If customer not yet in list, reload real leads immediately!
          fetchRealLeads();
          return prev;
        }

        return prev.map((l) => {
          if (l.id === targetLeadId) {
            const formatted = {
              id: msg.id || `msg-${Date.now()}`,
              sender: msg.senderType === 'AGENT' ? 'agent' : 'customer',
              agentName: msg.senderUser?.name || 'Agent',
              text: messageContent,
              mediaType: msg.mediaType || (messageContent === 'Voice Note' ? 'AUDIO' : 'TEXT'),
              mediaUrl: msg.mediaUrl || null,
              time: formatSafeTime(msg.createdAt || now),
              status: (msg.status || 'delivered').toLowerCase(),
            };

            const existingMsgs = l.messages || [];
            
            // Smart Deduplication & In-place update to eliminate double-bubble flicker
            let isDup = existingMsgs.some((m) => m.id === formatted.id);
            let newMsgs = existingMsgs;

            if (!isDup && formatted.sender === 'agent') {
              const pendingIdx = existingMsgs.findIndex(
                (m) => m.sender === 'agent' && (m.status === 'sending' || m.id?.startsWith('msg-')) && m.text === formatted.text
              );
              if (pendingIdx !== -1) {
                newMsgs = existingMsgs.map((m, idx) => 
                  idx === pendingIdx ? { ...m, ...formatted, id: formatted.id, status: 'delivered' } : m
                );
                isDup = true;
              }
            }

            if (!isDup) {
              newMsgs = [...existingMsgs, formatted];
            }

            return {
              ...l,
              messages: newMsgs,
              lastMessage: messageContent,
              lastTime: formatSafeTime(msg.createdAt || now),
              rawLastMessageAt: now.toISOString(),
              unreadCount: l.id === currentSelected ? 0 : (l.unreadCount || 0) + 1,
            };
          }
          return l;
        });
      });
    };

    const handleNewLead = (newLeadData) => {
      if (!newLeadData || !newLeadData.id) return;
      setLeads((prev) => {
        const exists = prev.some((l) => l.id === newLeadData.id);
        if (exists) {
          return prev.map((l) => {
            if (l.id === newLeadData.id) {
              return {
                ...l,
                lastMessage: newLeadData.lastMessage || l.lastMessage,
                lastTime: 'Just now',
                rawLastMessageAt: new Date().toISOString(),
              };
            }
            return l;
          });
        }
        const formattedLead = formatApiLead(newLeadData);
        if (newLeadData.lastMessage) {
          formattedLead.lastMessage = newLeadData.lastMessage;
        }
        return [formattedLead, ...prev];
      });
    };

    const handleStageUpdate = ({ leadId, stage, dealValue }) => {
      setLeads((prev) =>
        prev.map((l) => (l.id === leadId ? { ...l, stage, ...(dealValue !== undefined ? { dealValue } : {}) } : l))
      );
    };

    const handleWaStatus = (data) => {
      if (data?.status) {
        setWaStatus((prev) => {
          if (prev !== 'connected' && data.status === 'connected') {
            setConnectionToast({
              title: '🎉 WhatsApp Connected Successfully!',
              phone: data.user?.phone || 'Live Line',
              name: data.user?.name || 'CRM Linked WhatsApp',
            });
            setTimeout(() => setConnectionToast(null), 8000);
            // Refresh all chats & leads immediately from database!
            fetchRealLeads();
            setTimeout(fetchRealLeads, 2500);
          }
          return data.status;
        });
        if (data.user) setWaUser(data.user);
      }
    };

    socket.on('message:new', handleNewMessage);
    socket.on('lead:new', handleNewLead);
    socket.on('lead:new_global', handleNewLead);
    socket.on('lead:stage_updated', handleStageUpdate);
    socket.on('whatsapp:status', handleWaStatus);

    return () => {
      if (debouncedTimer) clearTimeout(debouncedTimer);
      socket.off('message:new', handleNewMessage);
      socket.off('lead:new', handleNewLead);
      socket.off('lead:new_global', handleNewLead);
      socket.off('lead:stage_updated', handleStageUpdate);
      socket.off('whatsapp:status', handleWaStatus);
    };
  }, []);

  // Update lead helper - persists to PostgreSQL database
  const handleUpdateLead = (leadId, updates) => {
    setLeads((prev) =>
      prev.map((lead) => {
        if (lead.id === leadId) {
          return { ...lead, ...updates };
        }
        return lead;
      })
    );

    // Call backend API if lead exists in database
    if (leadId && typeof leadId === 'string' && !leadId.startsWith('mock-')) {
      const apiUpdates = {};
      if (updates.name !== undefined) apiUpdates.fullName = updates.name;
      if (updates.fullName !== undefined) apiUpdates.fullName = updates.fullName;
      if (updates.dealValue !== undefined) apiUpdates.dealValue = updates.dealValue;
      if (updates.assignedToId !== undefined) apiUpdates.assignedToId = updates.assignedToId;
      if (updates.stage !== undefined) {
        const reverseStageMap = {
          'New Lead': 'NEW_LEAD',
          'Contacted': 'CONTACTED',
          'Qualified': 'QUALIFIED',
          'Proposal Sent': 'PROPOSAL_SENT',
          'Deal Won': 'WON',
          'Lost': 'LOST',
        };
        apiUpdates.stage = reverseStageMap[updates.stage] || updates.stage;
      }

      if (Object.keys(apiUpdates).length > 0) {
        api.updateLead(leadId, apiUpdates).catch((e) => console.warn('Failed to persist lead update:', e));
      }
    }
  };

  // Add lead helper - persists to database & opens live chat
  const handleAddLead = async (leadData) => {
    try {
      const cleanPhone = normalizePhoneNumber(leadData.phone);
      const targetChannelId = (leadData.channelId && leadData.channelId !== 'all') 
        ? leadData.channelId 
        : (selectedChannel !== 'all' ? selectedChannel : undefined);

      const res = await api.createLead({
        fullName: leadData.name,
        phoneNumber: cleanPhone,
        channelId: targetChannelId,
        dealValue: leadData.dealValue,
        stage: 'NEW_LEAD',
      });

      if (res?.lead) {
        const formatted = formatApiLead(res.lead);
        setLeads((prev) => {
          const existing = prev.find((l) => l.id === formatted.id || l.phone === formatted.phone);
          // Preserve complete message history and stage if existing customer
          if (existing && (!formatted.messages || formatted.messages.length === 0)) {
            formatted.messages = existing.messages || [];
            formatted.stage = existing.stage || formatted.stage;
          }
          return [formatted, ...prev.filter((l) => l.id !== formatted.id && l.phone !== formatted.phone)];
        });
        setSelectedLeadId(formatted.id);
        setActiveTab('chat');

        // Only dispatch initial greeting if user explicitly typed one AND not an existing customer with history
        if (leadData.initialMessage && leadData.initialMessage.trim() && !res?.isExisting) {
          api.sendMessage({
            leadId: formatted.id,
            phoneNumber: formatted.phone,
            customerName: formatted.name,
            channelId: formatted.channel,
            content: leadData.initialMessage.trim(),
          });
        }
      }
    } catch (err) {
      console.error('Failed to create lead in database:', err);
    }
  };

  // Navigate to chat
  const handleOpenChat = (leadId) => {
    if (leadId) setSelectedLeadId(leadId);
    setActiveTab('chat');
  };

  // Calculate total unread
  const totalUnread = leads.reduce((acc, l) => acc + (l.unreadCount || 0), 0);

  return (
    <div className="flex min-h-screen bg-[#F8F9FC] text-slate-800 antialiased relative">
      {/* Real-time WhatsApp Link Notification Toast */}
      {connectionToast && (
        <div className="fixed top-5 right-6 z-50 animate-bounce bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3.5 border border-emerald-400/50 backdrop-blur-md">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-xl shadow-inner">
            📱
          </div>
          <div>
            <h4 className="font-extrabold text-sm tracking-tight">{connectionToast.title}</h4>
            <p className="text-xs text-emerald-100 font-medium mt-0.5">
              <span className="font-bold text-white">{connectionToast.phone}</span> ({connectionToast.name}) is now live and syncing messages!
            </p>
          </div>
          <button 
            onClick={() => setConnectionToast(null)} 
            className="ml-3 text-white/80 hover:text-white text-xs font-bold px-2.5 py-1 bg-white/15 hover:bg-white/25 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      )}

      {/* 1. Left Sidebar Navigation */}
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        unreadTotal={totalUnread}
        waStatus={waStatus}
      />

      {/* 2. Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto h-screen">
        {/* Top Header */}
        <Header
          selectedChannel={selectedChannel}
          setSelectedChannel={setSelectedChannel}
          channels={channels}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onOpenNewLead={() => setIsNewLeadModalOpen(true)}
          activeTab={activeTab}
          waStatus={waStatus}
          waUser={waUser}
          onNavigateToChannels={() => setActiveTab('channels')}
        />

        {/* Dynamic Views */}
        <main className="flex-1 overflow-y-auto">
          {activeTab === 'dashboard' && (
            <DashboardView
              leads={leads}
              channels={channels}
              selectedChannel={selectedChannel}
              setSelectedChannel={setSelectedChannel}
              onOpenChat={handleOpenChat}
              onOpenNewLead={() => setIsNewLeadModalOpen(true)}
              onRefreshLeads={fetchRealLeads}
            />
          )}

          {activeTab === 'chat' && (
            <LiveChatView
              leads={leads}
              selectedLeadId={selectedLeadId}
              setSelectedLeadId={setSelectedLeadId}
              selectedChannel={selectedChannel}
              setSelectedChannel={setSelectedChannel}
              channels={channels}
              onUpdateLead={handleUpdateLead}
              onRefreshLeads={fetchRealLeads}
              onOpenNewLead={() => setIsNewLeadModalOpen(true)}
            />
          )}

          {activeTab === 'kanban' && (
            <KanbanView
              leads={leads}
              channels={channels}
              selectedChannel={selectedChannel}
              setSelectedChannel={setSelectedChannel}
              onUpdateLead={handleUpdateLead}
              onOpenChat={handleOpenChat}
              onOpenNewLead={() => setIsNewLeadModalOpen(true)}
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
            <ScheduleView
              leads={leads}
              channels={channels}
              selectedChannel={selectedChannel}
              setSelectedChannel={setSelectedChannel}
              onOpenChat={handleOpenChat}
            />
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
        channels={channels}
        selectedChannel={selectedChannel}
        leads={leads}
        onOpenChat={handleOpenChat}
      />
    </div>
  );
}
