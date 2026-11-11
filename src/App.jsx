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
import { formatChannelDisplayName, formatSafeTime, formatWhatsAppTimestamp, normalizePhoneNumber, parseTimeToMinutes } from './utils/leadFilters';

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

// Tag Normalization & Zero-Flicker Equality Checker (Enforces Single Latest Follow-up Tag)
export function normalizeTagList(tags) {
  if (!Array.isArray(tags)) return [];
  const cleanList = Array.from(
    new Set(
      tags
        .map((t) => (typeof t === 'string' ? t.trim() : (t?.tag?.name || t?.name || '').trim()))
        .filter(Boolean)
    )
  );

  // Enforce single latest follow-up tag rule: never stack multiple follow-up status tags
  const followUpTags = cleanList.filter((t) => /^follow-?up/i.test(t));
  if (followUpTags.length > 1) {
    const keepTag = followUpTags[followUpTags.length - 1];
    return cleanList.filter((t) => !/^follow-?up/i.test(t) || t === keepTag).sort();
  }

  return cleanList.sort();
}

export function areTagListsEqual(tagsA, tagsB) {
  const normA = normalizeTagList(tagsA);
  const normB = normalizeTagList(tagsB);
  if (normA.length !== normB.length) return false;
  return normA.every((t, i) => t === normB[i]);
}

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

  // Persistent Dashboard filter state (preserved when navigating to Chat & returning back)
  const [dashboardTimeRange, setDashboardTimeRange] = useState('today');
  const [dashboardCustomDate, setDashboardCustomDate] = useState(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  });
  const [dashboardServiceFilter, setDashboardServiceFilter] = useState('all');

  // Context carried from Dashboard -> Chat when user opens a chat from a specific section/date
  const [chatFilterContext, setChatFilterContext] = useState(null);

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

    const recentLocal = recentLocalUpdatesRef.current.get(l.id);
    const isRecentlyClickedHere = recentLocal && (Date.now() - recentLocal.timestamp < 20000);

    const apiTags = (l.tags || []).map((t) => (typeof t === 'string' ? t : t?.tag?.name || t?.name || '')).filter(Boolean);
    const dbStage = STAGE_MAP[l.stage] || l.stage || 'New Lead';

    // Database (PostgreSQL) is the single source of truth shared between Staff and Admin,
    // except during the 20s optimistic lock right after a local button click on this browser.
    const resolvedTags = isRecentlyClickedHere && Array.isArray(recentLocal.tags)
      ? recentLocal.tags
      : apiTags;
    const resolvedStage = isRecentlyClickedHere && recentLocal.stage
      ? recentLocal.stage
      : dbStage;

    const hasActiveStatusOrTags = (resolvedStage && resolvedStage !== 'New Lead' && resolvedStage !== 'Contacted') || resolvedTags.length > 0 || Boolean(l.serviceInterest);
    const resolvedStatusDate = isRecentlyClickedHere && recentLocal.statusUpdatedAt
      ? recentLocal.statusUpdatedAt
      : (hasActiveStatusOrTags
          ? (l.updatedAt ? new Date(l.updatedAt).toISOString() : new Date().toISOString())
          : null);

    return {
      id: l.id,
      name: displayName,
      phone: l.phoneNumber,
      channel: channelKey,
      channelId: l.channelId,
      channelName: l.channel?.name || `${flag} Channel`,
      flag: flag,
      currency: l.channel?.currency || 'PKR',
      dealValue: l.dealValue ? l.dealValue.toLocaleString() : '0',
      serviceInterest: l.serviceInterest || '',
      stage: resolvedStage,
      statusUpdatedAt: resolvedStatusDate,
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
      tags: normalizeTagList(resolvedTags),
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
            let tags = newLead.tags;

            // If locally edited within last 15 seconds, lock local user choice against slow DB replication
            if (localUpdate && Date.now() - localUpdate.timestamp < 15000) {
              if (localUpdate.stage !== undefined) stage = localUpdate.stage;
              if (localUpdate.serviceInterest !== undefined) serviceInterest = localUpdate.serviceInterest;
              if (localUpdate.tags !== undefined) tags = localUpdate.tags;
            } else if (existing) {
              // Preserve existing stage if local stage is Qualified or Deal Won or Lost
              if (existing.stage && existing.stage !== 'New Lead' && newLead.stage === 'New Lead') {
                stage = existing.stage;
              }
              // Preserve existing tags if server returned empty
              if (Array.isArray(existing.tags) && existing.tags.length > 0 && (!tags || tags.length === 0)) {
                tags = existing.tags;
              }
            }

            const mergedTags = normalizeTagList(tags !== undefined ? tags : existing?.tags);

            if (existing && existing.messages && existing.messages.length > 0) {
              return {
                ...newLead,
                stage,
                serviceInterest,
                tags: mergedTags,
                messages: existing.messages,
                lastMessage: existing.lastMessage || newLead.lastMessage,
                unreadCount: existing.id === selectedLeadIdRef.current ? 0 : (existing.unreadCount || newLead.unreadCount),
              };
            }
            return {
              ...newLead,
              stage,
              serviceInterest,
              tags: mergedTags,
            };
          });

          // Map-based equality check: if no lead changed content or timestamp, DO NOT update state (stops list fluctuating & flickering!)
          if (prev.length === merged.length) {
            let hasChanged = false;
            const prevMap = new Map(prev.map((p) => [p.id, p]));
            for (let i = 0; i < merged.length; i++) {
              const m = merged[i];
              const p = prevMap.get(m.id);
              if (
                !p || 
                p.stage !== m.stage || 
                p.serviceInterest !== m.serviceInterest || 
                p.unreadCount !== m.unreadCount || 
                p.lastMessage !== m.lastMessage ||
                !areTagListsEqual(p.tags, m.tags)
              ) {
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

    const handleStageUpdate = ({ leadId, stage, dealValue, serviceInterest, tags }) => {
      const localUpdate = recentLocalUpdatesRef.current.get(leadId);
      const isRecentlyEdited = localUpdate && (Date.now() - localUpdate.timestamp < 20000);
      if (isRecentlyEdited && localUpdate.stage !== undefined) {
        return; // Lock against stale socket stage broadcast!
      }

      const nowIso = new Date().toISOString();
      const displayStage = STAGE_MAP[stage] || stage;
      const normalizedTags = Array.isArray(tags) ? normalizeTagList(tags) : undefined;
      setLeads((prev) =>
        prev.map((l) => {
          if (l.id !== leadId) return l;
          return {
            ...l,
            stage: displayStage || l.stage,
            ...(normalizedTags !== undefined ? { tags: normalizedTags } : {}),
            ...(serviceInterest !== undefined ? { serviceInterest } : {}),
            ...(dealValue !== undefined ? { dealValue } : {}),
            statusUpdatedAt: nowIso,
            updatedAt: nowIso
          };
        })
      );
    };

    const handleLeadUpdated = (updatedLead) => {
      if (!updatedLead || !updatedLead.id) return;
      const localUpdate = recentLocalUpdatesRef.current.get(updatedLead.id);
      const isRecentlyEdited = localUpdate && (Date.now() - localUpdate.timestamp < 20000);

      let displayStage = STAGE_MAP[updatedLead.stage] || updatedLead.stage;
      let updatedTags = Array.isArray(updatedLead.tags) 
        ? normalizeTagList(updatedLead.tags) 
        : undefined;

      // Lock user's explicit local clicks against any out-of-order socket arrival
      if (isRecentlyEdited) {
        if (localUpdate.stage !== undefined) {
          displayStage = localUpdate.stage;
        }
        if (localUpdate.tags !== undefined) {
          updatedTags = normalizeTagList(localUpdate.tags);
        }
      }

      const nowIso = updatedLead.updatedAt ? new Date(updatedLead.updatedAt).toISOString() : new Date().toISOString();

      setLeads((prev) => {
        const target = prev.find(l => l.id === updatedLead.id);
        if (!target) return prev;
        
        // Zero-Flicker Guard: If nothing actually changed in this lead, SKIP state update!
        const stageSame = !displayStage || target.stage === displayStage;
        const serviceSame = updatedLead.serviceInterest === undefined || target.serviceInterest === updatedLead.serviceInterest;
        const tagsSame = updatedTags === undefined || areTagListsEqual(target.tags, updatedTags);
        const nameSame = !updatedLead.fullName || target.name === updatedLead.fullName;

        if (stageSame && serviceSame && tagsSame && nameSame && target.statusUpdatedAt) {
          return prev; // Skips re-render! Completely stops flickering!
        }

        return prev.map((l) => {
          if (l.id !== updatedLead.id) return l;
          return {
            ...l,
            name: updatedLead.fullName || l.name,
            stage: displayStage || l.stage,
            serviceInterest: updatedLead.serviceInterest !== undefined ? updatedLead.serviceInterest : l.serviceInterest,
            dealValue: updatedLead.dealValue !== undefined ? updatedLead.dealValue : l.dealValue,
            tags: updatedTags !== undefined ? updatedTags : l.tags,
            statusUpdatedAt: nowIso,
            updatedAt: nowIso
          };
        });
      });
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
    const existingLocal = recentLocalUpdatesRef.current.get(leadId) || {};
    const currentLead = leads.find((l) => l.id === leadId);
    const cleanPhoneKey = String(currentLead?.phone || '').replace(/\D/g, '');
    const isStatusOrTagChange = updates.stage !== undefined || updates.tags !== undefined || updates.serviceInterest !== undefined || updates.dealValue !== undefined;

    const resolvedStage = updates.stage !== undefined 
      ? updates.stage 
      : (existingLocal.stage !== undefined ? existingLocal.stage : currentLead?.stage);

    const resolvedTags = updates.tags !== undefined 
      ? updates.tags 
      : (existingLocal.tags !== undefined ? existingLocal.tags : currentLead?.tags);

    const mergedLocal = { 
      ...existingLocal, 
      ...updates, 
      stage: resolvedStage,
      tags: normalizeTagList(resolvedTags),
      statusUpdatedAt: isStatusOrTagChange ? nowIso : (existingLocal.statusUpdatedAt || currentLead?.statusUpdatedAt),
      timestamp: Date.now() 
    };
    recentLocalUpdatesRef.current.set(leadId, mergedLocal);

    // Find all lead IDs sharing this phone number (so old contacts with multiple records stay 100% in sync)
    const matchingIds = leads
      .filter((l) => l.id === leadId || (cleanPhoneKey && String(l.phone || '').replace(/\D/g, '') === cleanPhoneKey))
      .map((l) => l.id);
    if (!matchingIds.includes(leadId)) matchingIds.push(leadId);

    matchingIds.forEach((mId) => {
      recentLocalUpdatesRef.current.set(mId, mergedLocal);
      if (resolvedTags !== undefined) {
        try {
          localStorage.setItem(`crm_lead_tags_${mId}`, JSON.stringify(resolvedTags));
        } catch (e) {}
      }
      if (resolvedStage !== undefined) {
        try {
          localStorage.setItem(`crm_lead_stage_${mId}`, resolvedStage);
        } catch (e) {}
      }
      if (isStatusOrTagChange) {
        try {
          localStorage.setItem(`crm_lead_status_date_${mId}`, nowIso);
        } catch (e) {}
      }
    });

    if (cleanPhoneKey) {
      try {
        if (resolvedTags !== undefined) localStorage.setItem(`crm_phone_tags_${cleanPhoneKey}`, JSON.stringify(resolvedTags));
        if (resolvedStage !== undefined) localStorage.setItem(`crm_phone_stage_${cleanPhoneKey}`, resolvedStage);
        if (isStatusOrTagChange) localStorage.setItem(`crm_phone_status_date_${cleanPhoneKey}`, nowIso);
      } catch (e) {}
    }

    setLeads((prev) =>
      prev.map((lead) => {
        const isTarget = lead.id === leadId;
        const isSamePhone = Boolean(cleanPhoneKey && String(lead.phone || '').replace(/\D/g, '') === cleanPhoneKey);
        if (isTarget) {
          let nextMessages = updates.messages !== undefined ? updates.messages : lead.messages;
          if (updates.messagePatch && Array.isArray(nextMessages)) {
            const { tempId, changes } = updates.messagePatch;
            nextMessages = nextMessages.map((m) => (m.id === tempId ? { ...m, ...changes } : m));
          }
          return { 
            ...lead, 
            ...updates,
            messages: nextMessages,
            stage: resolvedStage || lead.stage,
            tags: resolvedTags !== undefined ? normalizeTagList(resolvedTags) : lead.tags,
            statusUpdatedAt: isStatusOrTagChange ? nowIso : lead.statusUpdatedAt,
            updatedAt: nowIso 
          };
        }
        if (isSamePhone && isStatusOrTagChange) {
          return {
            ...lead,
            stage: resolvedStage || lead.stage,
            tags: resolvedTags !== undefined ? normalizeTagList(resolvedTags) : lead.tags,
            serviceInterest: updates.serviceInterest !== undefined ? updates.serviceInterest : lead.serviceInterest,
            dealValue: updates.dealValue !== undefined ? updates.dealValue : lead.dealValue,
            statusUpdatedAt: nowIso,
            updatedAt: nowIso
          };
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

      // Only pass tags to backend API if tags were explicitly changed in this call
      if (updates.tags !== undefined) {
        apiUpdates.tags = normalizeTagList(updates.tags);
      }

      // Only pass stage to backend API if stage was explicitly changed in this call
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
        matchingIds.forEach((mId) => {
          if (mId && typeof mId === 'string' && !mId.startsWith('mock-')) {
            api.updateLead(mId, apiUpdates).catch((e) => console.warn('Failed to persist lead update:', e));
          }
        });
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

  // RELIABLE SCHEDULED REMINDER DISPATCHER:
  // Strict rule: ONLY sends WhatsApp messages when the USER explicitly scheduled a reminder for a lead.
  // Never creates any reminders or sends unsolicited messages on its own.
  React.useEffect(() => {
    // One-time repair for any reminder mistakenly marked completed by legacy wipe without actually being sent
    try {
      const raw = localStorage.getItem('crm_schedule_reminders');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          let modified = false;
          const restored = parsed.map(r => {
            if (r.completed && !r.reminderSentAt && r.autoSend === false) {
              modified = true;
              return { ...r, autoSend: true, completed: false, reminderSent: false };
            }
            return r;
          });
          if (modified) {
            localStorage.setItem('crm_schedule_reminders', JSON.stringify(restored));
            window.dispatchEvent(new Event('crm_reminders_updated'));
          }
        }
      }
    } catch (e) {}

    const processScheduledReminders = async () => {
      try {
        const raw = localStorage.getItem('crm_schedule_reminders');
        if (!raw) return;
        const reminders = JSON.parse(raw);
        if (!Array.isArray(reminders) || reminders.length === 0) return;

        const now = new Date();
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, '0');
        const d = String(now.getDate()).padStart(2, '0');
        const localTodayStr = `${y}-${m}-${d}`;
        const currentTotalMinutes = now.getHours() * 60 + now.getMinutes();

        let hasChanged = false;
        const updatedList = [...reminders];

        for (let i = 0; i < updatedList.length; i++) {
          const rem = updatedList[i];
          // STRICT VERIFICATION:
          // 1. Must NOT be already completed or already sent
          // 2. autoSend must be explicitly allowed (not false)
          // 3. Must have a valid phone number
          if (rem.completed || rem.reminderSent || rem.autoSend === false || !rem.leadPhone) {
            continue;
          }

          if (rem.date && rem.time) {
            const remMinutes = parseTimeToMinutes(rem.time);
            const isDue = rem.date < localTodayStr || (rem.date === localTodayStr && remMinutes <= currentTotalMinutes);

            if (isDue) {
              hasChanged = true;
              rem.reminderSent = true;
              rem.completed = true;
              const sentTimeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              rem.reminderSentAt = sentTimeStr;

              const msgText = String(rem.customMessage || rem.notes || rem.title || '').replace(/^["']|["']$/g, '');

              console.log(`⏰ [Auto Reminder] Dispatching scheduled follow-up to ${rem.leadName} (${rem.leadPhone}) at ${sentTimeStr}`);

              try {
                await api.sendMessage({
                  leadId: rem.leadId || `lead-${rem.leadPhone.replace(/\D/g, '')}`,
                  phoneNumber: rem.leadPhone,
                  customerName: rem.leadName,
                  channelId: rem.channelId,
                  content: msgText,
                  mediaType: 'TEXT',
                });

                // Append message to live lead state
                setLeads(prevLeads => prevLeads.map(l => {
                  if (l.id === rem.leadId || l.phone === rem.leadPhone) {
                    const newMsg = {
                      id: `rem-auto-${Date.now()}`,
                      sender: 'agent',
                      agentName: 'System (Scheduled Reminder)',
                      text: msgText,
                      time: sentTimeStr,
                      status: 'delivered'
                    };
                    return {
                      ...l,
                      messages: [...(l.messages || []), newMsg],
                      lastMessage: msgText,
                      lastTime: 'Just now'
                    };
                  }
                  return l;
                }));

                setConnectionToast({
                  title: '⏰ Scheduled Reminder Bhej Diya Gaya',
                  name: rem.leadName,
                  phone: rem.leadPhone
                });
                setTimeout(() => setConnectionToast(null), 5000);
              } catch (sendErr) {
                console.error('Failed to auto-send scheduled reminder:', sendErr);
              }
            }
          }
        }

        if (hasChanged) {
          localStorage.setItem('crm_schedule_reminders', JSON.stringify(updatedList));
          window.dispatchEvent(new Event('crm_reminders_updated'));
        }
      } catch (err) {
        console.warn('Error checking scheduled reminders:', err);
      }
    };

    const timer = setInterval(processScheduledReminders, 10000);
    processScheduledReminders();
    return () => clearInterval(timer);
  }, []);

  // Navigate to chat (optionally carrying Dashboard section/date filter context)
  const handleOpenChat = (leadId, context = null) => {
    if (leadId) setSelectedLeadId(leadId);
    if (context) {
      setChatFilterContext({ ...context, appliedAt: Date.now() });
    }
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
              onUpdateLead={handleUpdateLead}
              currentUser={currentUser}
              timeRange={dashboardTimeRange}
              setTimeRange={setDashboardTimeRange}
              customSelectedDate={dashboardCustomDate}
              setCustomSelectedDate={setDashboardCustomDate}
              selectedServiceFilter={dashboardServiceFilter}
              setSelectedServiceFilter={setDashboardServiceFilter}
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
              chatFilterContext={chatFilterContext}
              setChatFilterContext={setChatFilterContext}
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
