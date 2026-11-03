import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import DashboardView from './components/DashboardView';
import LiveChatView from './components/LiveChatView';
import KanbanView from './components/KanbanView';
import ChannelsView from './components/ChannelsView';
import TeamView from './components/TeamView';
import ScheduleView from './components/ScheduleView';
import NewLeadModal from './components/NewLeadModal';
import LoginModal from './components/LoginModal';
import { QUICK_REPLIES } from './data/mockData';
import { socket } from './services/socket';
import { api } from './services/api';
import { formatChannelDisplayName, formatSafeTime, formatWhatsAppTimestamp, normalizePhoneNumber } from './utils/leadFilters';

// Helper: get country flag and key from country code
function getChannelMeta(countryCode) {
  const code = (countryCode || '').toLowerCase();
  if (code === 'ae') return { flag: '🇦🇪', key: 'dubai', currency: 'AED' };
  if (code === 'sa') return { flag: '🇸🇦', key: 'saudi', currency: 'SAR' };
  return { flag: '🇵🇰', key: 'pakistan', currency: 'PKR' };
}

// Module-level stage mapping ensuring global availability across socket listeners and formatters
const STAGE_MAP = {
  NEW_LEAD: 'New Lead',
  CONTACTED: 'Contacted',
  QUALIFIED: 'Qualified',
  PROPOSAL_SENT: 'Proposal Sent',
  WON: 'Deal Won',
  LOST: 'Lost',
};

export default function App() {
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [isAuthenticated, setIsAuthenticated] = useState(() => !!localStorage.getItem('token'));
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
  const [isAppLoading, setIsAppLoading] = useState(false);

  const selectedLeadIdRef = React.useRef(selectedLeadId);
  const recentLocalUpdatesRef = React.useRef(new Map());
  useEffect(() => {
    selectedLeadIdRef.current = selectedLeadId;
  }, [selectedLeadId]);

  // Helper to format database lead into CRM UI lead
  const formatApiLead = (l) => {
    const channelCode = l.channel?.countryCode?.toLowerCase() || 'pk';
    const { flag } = getChannelMeta(channelCode);
    // Use the real DB channel UUID as the channel key for filtering
    const channelKey = l.channel?.id || l.channelId || 'unknown';
    
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
      serviceInterest: l.serviceInterest || '',
      stage: STAGE_MAP[l.stage] || l.stage || 'New Lead',
      assignedToId: l.assignedToId || null,
      assignedTo: l.assignedTo?.name || 'Unassigned',
      assignedAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      avatar: l.avatarUrl || generatedAvatar,
      unreadCount: l.unreadCount || 0,
      createdAt: l.createdAt ? new Date(l.createdAt).toISOString() : new Date().toISOString(),
      updatedAt: l.updatedAt ? new Date(l.updatedAt).toISOString() : new Date().toISOString(),
      firstMessageAt: l.firstMessageAt ? new Date(l.firstMessageAt).toISOString() : (l.createdAt ? new Date(l.createdAt).toISOString() : new Date().toISOString()),
      rawLastMessageAt: (() => {
        const msgTime = l.messages?.[0]?.createdAt ? new Date(l.messages[0].createdAt).getTime() : 0;
        const lTime = l.lastMessageAt ? new Date(l.lastMessageAt).getTime() : 0;
        const trueTime = Math.max(msgTime, lTime) || (l.createdAt ? new Date(l.createdAt).getTime() : Date.now());
        return new Date(trueTime).toISOString();
      })(),
      lastMessage: l.lastMessage || l.messages?.[0]?.content || 'WhatsApp conversation',
      lastTime: formatWhatsAppTimestamp((() => {
        const msgTime = l.messages?.[0]?.createdAt ? new Date(l.messages[0].createdAt).getTime() : 0;
        const lTime = l.lastMessageAt ? new Date(l.lastMessageAt).getTime() : 0;
        const trueTime = Math.max(msgTime, lTime) || (l.createdAt ? new Date(l.createdAt).getTime() : Date.now());
        return new Date(trueTime).toISOString();
      })()),
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

  // Reusable leads fetcher from PostgreSQL (Intelligent Merge — Never wipes open conversation or pending edits)
  const fetchRealLeads = React.useCallback(async (overrideReset = false) => {
    try {
      const res = await api.getLeads();
      if (res?.leads) {
        const realLeads = res.leads.map(formatApiLead);
        setLeads((prev) => {
          if (overrideReset || prev.length === 0) return realLeads;

          // Merge preserving active conversation and recent local user edits
          const merged = realLeads.map((newLead) => {
            const existing = prev.find((p) => p.id === newLead.id);
            const localUpdate = recentLocalUpdatesRef.current.get(newLead.id);

            let stage = newLead.stage;
            let serviceInterest = newLead.serviceInterest;

            // If locally edited within last 12 seconds, lock local user choice against slow DB replication
            if (localUpdate && Date.now() - localUpdate.timestamp < 12000) {
              if (localUpdate.stage) stage = localUpdate.stage;
              if (localUpdate.serviceInterest !== undefined) serviceInterest = localUpdate.serviceInterest;
            }

            if (existing && existing.messages && existing.messages.length > 0) {
              return {
                ...newLead,
                stage,
                serviceInterest,
                messages: existing.messages,
                lastMessage: existing.lastMessage || newLead.lastMessage,
                unreadCount: existing.id === selectedLeadIdRef.current ? 0 : (existing.unreadCount || newLead.unreadCount),
              };
            }
            return {
              ...newLead,
              stage,
              serviceInterest,
            };
          });

          // Map-based equality check: if no lead changed content or timestamp, DO NOT update state (stops list fluctuating!)
          if (prev.length === merged.length) {
            let hasChanged = false;
            const prevMap = new Map(prev.map((p) => [p.id, p]));
            for (let i = 0; i < merged.length; i++) {
              const m = merged[i];
              const p = prevMap.get(m.id);
              if (!p || p.stage !== m.stage || p.serviceInterest !== m.serviceInterest || p.unreadCount !== m.unreadCount || p.lastMessage !== m.lastMessage) {
                hasChanged = true;
                break;
              }
              const pTime = new Date(p.rawLastMessageAt || 0).getTime();
              const mTime = new Date(m.rawLastMessageAt || 0).getTime();
              if (Math.abs(pTime - mTime) > 3000) {
                hasChanged = true;
                break;
              }
            }
            if (!hasChanged) return prev; // Preserve identity -> React skips re-render!
          }

          return merged;
        });
        if (realLeads.length > 0 && (!selectedLeadIdRef.current || overrideReset)) {
          setSelectedLeadId(realLeads[0].id);
        }
      }
    } catch (err) {
      console.warn('Failed to load leads:', err);
    }
  }, []);

  // Strict User Profile & Channel Data Initializer (With Full Safety Loader)
  const initUserData = React.useCallback(async (userObj) => {
    if (!userObj) return;
    setIsAppLoading(true);
    // Instant Wipe to ensure no data from previous user leaks
    setLeads([]);
    setChannels([]);
    setSelectedLeadId(null);

    try {
      // 1. Fetch assigned channels for this specific authenticated user
      const chRes = await api.getChannels();
      const rawChannels = chRes?.channels || [];
      const dbChannels = rawChannels.map((ch) => {
        const code = (ch.countryCode || 'PK').toLowerCase();
        const { flag } = getChannelMeta(code);
        return {
          id: ch.id,
          name: formatChannelDisplayName(ch),
          flag,
          number: ch.phoneNumber || '',
        };
      });

      if (userObj.role === 'ADMIN') {
        // Admin gets "Saare Numbers" pill + all active channels
        const adminChannels = [
          { id: 'all', name: 'Saare Numbers', flag: '🌐', number: 'All Channels' },
          ...dbChannels,
        ];
        setChannels(adminChannels);
        // Default to Line 1 (+92 332 2568950) if present, else 'all'
        const line1 = dbChannels.find((c) => c.number?.includes('3322568950') || c.id === '25f254f7-edc2-42de-b782-fff737c75999');
        setSelectedChannel(line1 ? line1.id : 'all');
      } else {
        // Staff / Agent sees ONLY their assigned number! No 'all' option!
        setChannels(dbChannels);
        if (dbChannels.length > 0) {
          setSelectedChannel(dbChannels[0].id);
        } else {
          setSelectedChannel(null);
        }
      }

      // 2. Fetch leads strictly isolated for this user (hard reset)
      await fetchRealLeads(true);

      // 3. Status check
      const statusRes = await api.getWhatsAppStatus();
      if (statusRes?.status) {
        setWaStatus(statusRes.status);
        if (statusRes.user) setWaUser(statusRes.user);
      }
    } catch (err) {
      console.error('Failed to init user data:', err);
    } finally {
      // Small graceful delay to ensure seamless transition without flicker
      setTimeout(() => {
        setIsAppLoading(false);
      }, 500);
    }
  }, [fetchRealLeads]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsAuthenticated(false);
    setCurrentUser(null);
    setLeads([]);
    setChannels([]);
    setSelectedChannel(null);
    setSelectedLeadId(null);
  };

  const handleLoginSuccess = async (user) => {
    setCurrentUser(user);
    setIsAuthenticated(true);
    await initUserData(user);
  };

  // Run on mount if authenticated user already exists in storage
  useEffect(() => {
    if (isAuthenticated && currentUser) {
      initUserData(currentUser);
    }
  }, []);

  // High-reliability live background synchronization watchdog
  // Ensures messages appear within seconds even if Socket drops or has high latency in production
  useEffect(() => {
    if (!isAuthenticated || isAppLoading) return;

    const interval = setInterval(async () => {
      // 1. Silently sync leads list (for new incoming leads or updated timestamps)
      await fetchRealLeads();

      // 2. If a lead conversation is currently active, fetch latest messages
      if (selectedLeadIdRef.current) {
        try {
          const data = await api.getMessages(selectedLeadIdRef.current);
          if (data?.messages) {
            setLeads((prev) =>
              prev.map((l) => {
                if (l.id === selectedLeadIdRef.current) {
                  const incomingCount = data.messages.length;
                  const currentCount = l.messages?.length || 0;
                  if (incomingCount !== currentCount) {
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
                    };
                  }
                }
                return l;
              })
            );
          }
        } catch {}
      }
    }, 30000); // 30s calm background sync (WebSocket handles 0ms instant updates)

    return () => clearInterval(interval);
  }, [isAuthenticated, isAppLoading, fetchRealLeads]);

  // Fetch full conversation history when active lead changes
  useEffect(() => {
    if (!selectedLeadId) return;
    async function loadChat() {
      try {
        const data = await api.getMessages(selectedLeadId);
        if (data?.messages) {
          setLeads((prev) => {
            const currentLead = prev.find((l) => l.id === selectedLeadId);
            if (!currentLead) return prev;
            const existingMsgs = currentLead.messages || [];
            if (existingMsgs.length === data.messages.length && currentLead.unreadCount === 0) {
              const lastExisting = existingMsgs[existingMsgs.length - 1];
              const lastIncoming = data.messages[data.messages.length - 1];
              if (lastExisting?.id === lastIncoming?.id && lastExisting?.text === lastIncoming?.content) {
                return prev; // Zero changes -> preserve reference to prevent re-render!
              }
            }

            return prev.map((l) => {
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
            });
          });
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
        const targetLead = prev.find((l) => l.id === targetLeadId);
        if (!targetLead) {
          // If customer not yet in list, reload real leads immediately!
          fetchRealLeads();
          return prev;
        }

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

        const existingMsgs = targetLead.messages || [];
        
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

        const updatedLead = {
          ...targetLead,
          messages: newMsgs,
          lastMessage: messageContent,
          lastTime: formatWhatsAppTimestamp(msg.createdAt || now),
          rawLastMessageAt: (msg.createdAt ? new Date(msg.createdAt) : now).toISOString(),
          unreadCount: targetLead.id === currentSelected ? 0 : (targetLead.unreadCount || 0) + 1,
        };

        // WhatsApp Realtime Behavior: Active chat leaps to the absolute top of the list!
        const remaining = prev.filter((l) => l.id !== targetLeadId);
        return [updatedLead, ...remaining];
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

    const handleStageUpdate = ({ leadId, stage, dealValue, serviceInterest }) => {
      const displayStage = STAGE_MAP[stage] || stage;
      setLeads((prev) =>
        prev.map((l) => {
          if (l.id !== leadId) return l;
          if (l.stage === displayStage && (serviceInterest === undefined || l.serviceInterest === serviceInterest)) {
            return l;
          }
          return {
            ...l,
            stage: displayStage,
            ...(serviceInterest !== undefined ? { serviceInterest } : {}),
            ...(dealValue !== undefined ? { dealValue } : {}),
            updatedAt: new Date().toISOString()
          };
        })
      );
    };

    const handleLeadUpdated = (updatedLead) => {
      if (!updatedLead || !updatedLead.id) return;
      const displayStage = STAGE_MAP[updatedLead.stage] || updatedLead.stage;
      const updatedTags = Array.isArray(updatedLead.tags) 
        ? updatedLead.tags.map((t) => t.tag?.name || t.name || t) 
        : undefined;

      setLeads((prev) =>
        prev.map((l) => {
          if (l.id !== updatedLead.id) return l;
          return {
            ...l,
            name: updatedLead.fullName || l.name,
            stage: displayStage,
            serviceInterest: updatedLead.serviceInterest !== undefined ? updatedLead.serviceInterest : l.serviceInterest,
            dealValue: updatedLead.dealValue !== undefined ? updatedLead.dealValue : l.dealValue,
            tags: updatedTags !== undefined ? updatedTags : l.tags,
            updatedAt: new Date().toISOString()
          };
        })
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
    socket.on('lead:updated', handleLeadUpdated);
    socket.on('whatsapp:status', handleWaStatus);

    return () => {
      if (debouncedTimer) clearTimeout(debouncedTimer);
      socket.off('message:new', handleNewMessage);
      socket.off('lead:new', handleNewLead);
      socket.off('lead:new_global', handleNewLead);
      socket.off('lead:stage_updated', handleStageUpdate);
      socket.off('lead:updated', handleLeadUpdated);
      socket.off('whatsapp:status', handleWaStatus);
    };
  }, []);

  // Update lead helper - persists to PostgreSQL database with instant optimistic locking
  const handleUpdateLead = (leadId, updates) => {
    const nowIso = new Date().toISOString();
    recentLocalUpdatesRef.current.set(leadId, { ...updates, timestamp: Date.now() });

    setLeads((prev) =>
      prev.map((lead) => {
        if (lead.id === leadId) {
          return { ...lead, ...updates, updatedAt: nowIso };
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
      if (updates.serviceInterest !== undefined) apiUpdates.serviceInterest = updates.serviceInterest;
      if (updates.assignedToId !== undefined) apiUpdates.assignedToId = updates.assignedToId;
      if (updates.tags !== undefined) apiUpdates.tags = updates.tags;
      if (updates.stage !== undefined) {
        const s = String(updates.stage).toLowerCase();
        let targetStage = 'NEW_LEAD';
        if (s.includes('lost') || s.includes('unqualif') || s.includes('reject')) targetStage = 'LOST';
        else if (s.includes('qualif')) targetStage = 'QUALIFIED';
        else if (s.includes('propos')) targetStage = 'PROPOSAL_SENT';
        else if (s.includes('won') || s.includes('closed')) targetStage = 'WON';
        else if (s.includes('contact')) targetStage = 'CONTACTED';
        else targetStage = updates.stage;
        apiUpdates.stage = targetStage;
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
        serviceInterest: leadData.serviceInterest,
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

  // SAFETY PROTOCOL: Wipe any legacy auto-send flags from reminders so NO customer ever receives automated messages
  React.useEffect(() => {
    try {
      const raw = localStorage.getItem('crm_schedule_reminders');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const sanitized = parsed.map(r => ({ ...r, autoSend: false, completed: true, reminderSent: true }));
          localStorage.setItem('crm_schedule_reminders', JSON.stringify(sanitized));
        }
      }
    } catch (e) {}
  }, []);

  // Navigate to chat
  const handleOpenChat = (leadId) => {
    if (leadId) setSelectedLeadId(leadId);
    setActiveTab('chat');
  };

  // Calculate unread conversations count (chats needing attention)
  const unreadChatsCount = leads.filter((l) => (l.unreadCount || 0) > 0).length;

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#F8F9FC] text-slate-800 antialiased relative">
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
        unreadTotal={unreadChatsCount}
        waStatus={waStatus}
        currentUser={currentUser}
        onLogout={handleLogout}
      />

      {/* 2. Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
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
          currentUser={currentUser}
        />

        {/* Dynamic Views */}
        <main className={`flex-1 min-h-0 ${activeTab === 'chat' ? 'overflow-hidden flex flex-col' : 'overflow-y-auto'}`}>
          {activeTab === 'dashboard' && (
            <DashboardView
              leads={leads}
              channels={channels}
              selectedChannel={selectedChannel}
              setSelectedChannel={setSelectedChannel}
              onOpenChat={handleOpenChat}
              onOpenNewLead={() => setIsNewLeadModalOpen(true)}
              onRefreshLeads={fetchRealLeads}
              currentUser={currentUser}
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
              currentUser={currentUser}
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
              currentUser={currentUser}
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

      {/* 4. Full-Screen Data Isolation & Login Loader */}
      {isAppLoading && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-md text-white animate-fade-in select-none">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full mx-4 shadow-2xl text-center border border-slate-100 animate-scale-in">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-500 flex items-center justify-center text-white shadow-lg shadow-orange-500/30">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
            <h3 className="text-lg font-black text-slate-900 tracking-tight">
              Data Sync Ho Raha Hai...
            </h3>
            <p className="text-xs text-slate-500 font-semibold mt-1.5 leading-relaxed">
              {currentUser?.name ? `${currentUser.name} (${currentUser.role})` : 'Account'} ka assigned WhatsApp number aur leads database se load ho rahi hain...
            </p>
            <div className="mt-5 w-full bg-slate-100 h-2 rounded-full overflow-hidden">
              <div className="bg-gradient-to-r from-orange-500 to-amber-400 h-full rounded-full animate-pulse w-4/5"></div>
            </div>
          </div>
        </div>
      )}

      {/* 5. Secure Authentication Modal */}
      {!isAuthenticated && (
        <LoginModal onLoginSuccess={handleLoginSuccess} />
      )}
    </div>
  );
}
