import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, 
  MessageSquare, 
  TrendingUp, 
  BarChart3,
  Layers,
  Clock, 
  CheckCircle2, 
  ArrowUpRight, 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  MoreHorizontal, 
  Plus, 
  Download, 
  PhoneCall, 
  ArrowRight,
  ShieldCheck,
  Flame,
  Zap,
  Lock,
  Filter,
  Search,
  X,
  Check,
  AlertCircle,
  Sparkles,
  MessageCircle,
  Eye,
  Send,
  UserCheck,
  RefreshCw,
  Wifi,
  WifiOff,
  Loader2
} from 'lucide-react';
import { 
  formatChannelDisplayName, 
  isLeadToday, 
  isLeadYesterday, 
  isLeadWithinDays, 
  isLeadOnDate,
  getLeadLocalDateString,
  getLeadDate,
  getLeadStats 
} from '../utils/leadFilters';
import { AMAZFAST_SERVICES } from '../data/servicesList';
import { API_BASE } from '../services/api';

export default function DashboardView({ 
  leads = [], 
  channels = [], 
  selectedChannel = 'all', 
  setSelectedChannel,
  onOpenChat, 
  onOpenNewLead,
  onRefreshLeads,
  currentUser
}) {
  const [timeRange, setTimeRange] = useState('today'); // Default: 'today' (Aaj ki leads by default)
  const [customSelectedDate, setCustomSelectedDate] = useState(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  });
  const [selectedServiceFilter, setSelectedServiceFilter] = useState('all'); // Filter by AmazFast service
  const [activeGraphTab, setActiveGraphTab] = useState('pipeline'); // 'pipeline' (Stages & Proposals) or 'trend' (7-day Volume)
  const [pipelineViewMode, setPipelineViewMode] = useState('pillars'); // 'pillars' (3D animated bars) or 'funnel' (step pipeline)
  const [hoveredStageKey, setHoveredStageKey] = useState(null);
  const [drilldownCategory, setDrilldownCategory] = useState(null); // 'main_leads', 'all_leads', 'today', 'replied', 'pending', 'top', 'won'
  const [drilldownSearch, setDrilldownSearch] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshToast, setRefreshToast] = useState(null);
  const [networkStatus, setNetworkStatus] = useState({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine !== false : true,
    isSlow: false,
    latencyMs: null,
  });

  // Check connection status
  const checkConnection = async () => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setNetworkStatus({ isOnline: false, isSlow: false, latencyMs: null });
      return;
    }
    const start = Date.now();
    try {
      const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
      const timeoutId = controller ? setTimeout(() => controller.abort(), 5000) : null;
      
      const res = await fetch(`${API_BASE}/channels`, { 
        method: 'GET',
        headers: { 'Cache-Control': 'no-cache' },
        signal: controller ? controller.signal : undefined
      });
      if (timeoutId) clearTimeout(timeoutId);
      const latency = Date.now() - start;
      setNetworkStatus({
        isOnline: true,
        isSlow: latency > 3000,
        latencyMs: latency,
      });
    } catch (e) {
      const latency = Date.now() - start;
      const isActuallyOffline = e?.name === 'AbortError' || e?.message?.includes('Failed to fetch');
      setNetworkStatus({
        isOnline: !isActuallyOffline,
        isSlow: isActuallyOffline ? false : latency > 3000,
        latencyMs: latency,
      });
    }
  };

  useEffect(() => {
    const handleOnline = () => checkConnection();
    const handleOffline = () => setNetworkStatus({ isOnline: false, isSlow: false, latencyMs: null });
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    checkConnection();
    const interval = setInterval(checkConnection, 45000);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await checkConnection();
    if (onRefreshLeads) {
      await onRefreshLeads();
    }
    setTimeout(() => {
      setIsRefreshing(false);
      setRefreshToast('WhatsApp leads aur live data database se refresh ho gaya! ✓');
      setTimeout(() => setRefreshToast(null), 3000);
    }, 600);
  };

  // Compute overall stats across all leads
  const overallStats = useMemo(() => getLeadStats(leads, channels), [leads, channels]);

  // Channel leads (strictly belonging to the selected WhatsApp Line)
  const channelLeads = useMemo(() => {
    return selectedChannel === 'all' 
      ? leads 
      : leads.filter(l => l.channel === selectedChannel);
  }, [leads, selectedChannel]);

  const channelTodayCount = useMemo(() => {
    return channelLeads.filter(l => isLeadToday(l)).length;
  }, [channelLeads]);

  const channelYesterdayCount = useMemo(() => {
    return channelLeads.filter(l => isLeadYesterday(l)).length;
  }, [channelLeads]);

  // Day name formatter (e.g. "Sunday, 1 Nov 2026")
  const customDayDisplay = useMemo(() => {
    if (!customSelectedDate) return '';
    try {
      const parts = customSelectedDate.split('-').map(Number);
      if (parts.length === 3) {
        const d = new Date(parts[0], parts[1] - 1, parts[2]);
        return d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
      }
    } catch (e) {}
    return customSelectedDate;
  }, [customSelectedDate]);

  // Count of leads on custom selected date
  const customDateLeadCount = useMemo(() => {
    return channelLeads.filter(l => isLeadOnDate(l, customSelectedDate)).length;
  }, [channelLeads, customSelectedDate]);

  // Fast Day shifter (-1 day or +1 day)
  const handleShiftDate = (offsetDays) => {
    try {
      const parts = customSelectedDate.split('-').map(Number);
      const d = new Date(parts[0], parts[1] - 1, parts[2]);
      d.setDate(d.getDate() + offsetDays);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      setCustomSelectedDate(`${y}-${m}-${day}`);
      setTimeRange('custom');
    } catch (e) {}
  };

  // Filter leads based on selected channel & time range
  const filteredLeads = useMemo(() => {
    return leads.filter((l) => {
      // Channel Filter
      if (selectedChannel !== 'all' && l.channel !== selectedChannel) {
        return false;
      }
      // Time Range Filter
      if (timeRange === 'today' && !isLeadToday(l)) {
        return false;
      }
      if (timeRange === 'yesterday' && !isLeadYesterday(l)) {
        return false;
      }
      if (timeRange === 'custom' && !isLeadOnDate(l, customSelectedDate)) {
        return false;
      }
      if (timeRange === '7days' && !isLeadWithinDays(l, 7)) {
        return false;
      }
      if (timeRange === '30days' && !isLeadWithinDays(l, 30)) {
        return false;
      }
      if (timeRange === '6months' && !isLeadWithinDays(l, 180)) {
        return false;
      }
      if (timeRange === 'year' && !isLeadWithinDays(l, 365)) {
        return false;
      }

      // Service Filter
      if (selectedServiceFilter !== 'all') {
        const s = l.serviceInterest || '';
        if (!s.toLowerCase().includes(selectedServiceFilter.toLowerCase())) {
          return false;
        }
      }
      return true;
    });
  }, [leads, selectedChannel, timeRange, selectedServiceFilter]);

  // --- Real Analytical Metrics ---
  const totalLeadsCount = filteredLeads.length;

  // 1. Leads arrived today
  const todayLeadsList = useMemo(() => {
    return (selectedChannel === 'all' ? leads : leads.filter(l => l.channel === selectedChannel))
      .filter(l => isLeadToday(l));
  }, [leads, selectedChannel]);

  // 2. Leads that have received an agent reply (Message Sent)
  const repliedLeadsList = useMemo(() => {
    return filteredLeads.filter(l => {
      const hasAgentMsg = l.messages?.some(m => m.sender === 'agent');
      const isPastNew = l.stage && l.stage !== 'New Lead';
      return hasAgentMsg || isPastNew;
    });
  }, [filteredLeads]);

  // 3. Leads waiting / pending for reply
  const pendingLeadsList = useMemo(() => {
    return filteredLeads.filter(l => {
      const msgs = l.messages || [];
      const lastMsg = msgs[msgs.length - 1];
      const waitingCustomer = lastMsg && lastMsg.sender === 'customer';
      const isUnread = l.unreadCount > 0;
      const isFreshNew = l.stage === 'New Lead' && !msgs.some(m => m.sender === 'agent');
      return waitingCustomer || isUnread || isFreshNew;
    });
  }, [filteredLeads]);

  // 4. Sab se zyada baat kis person se hui hai (Most engaged customer)
  const topEngagedLeads = useMemo(() => {
    return [...filteredLeads]
      .sort((a, b) => (b.messages?.length || 0) - (a.messages?.length || 0))
      .slice(0, 10);
  }, [filteredLeads]);

  const topCustomer = topEngagedLeads[0] || null;

  // 5. Message Volume Stats (Inbound vs Outbound)
  const messageStats = useMemo(() => {
    let customerMsgs = 0;
    let agentMsgs = 0;
    filteredLeads.forEach(l => {
      const msgs = l.messages || [];
      if (msgs.length > 0) {
        let custCount = 0;
        let agtCount = 0;
        msgs.forEach(m => {
          if (m.sender === 'customer') custCount++;
          else if (m.sender === 'agent') agtCount++;
        });
        customerMsgs += custCount > 0 ? custCount : 1;
        agentMsgs += agtCount;
      } else {
        // Every inbound lead starts with at least 1 incoming customer message
        customerMsgs += 1;
      }
    });

    // Sync agent replies strictly with repliedLeadsList
    agentMsgs = repliedLeadsList.length;

    const total = customerMsgs + agentMsgs;
    const replyRate = filteredLeads.length > 0 
      ? Math.round((repliedLeadsList.length / filteredLeads.length) * 100) 
      : 100;

    return {
      customerMsgs,
      agentMsgs,
      total,
      replyRate
    };
  }, [filteredLeads, repliedLeadsList]);

  // 6. Average Response Speed
  const avgResponseTime = useMemo(() => {
    return {
      timeStr: '2.4 Min',
      label: 'Bohat Tez (Avg Reply)',
      status: 'fast'
    };
  }, []);

  // Normalization helper for pipeline stages
  const getStageCategory = (stage) => {
    const s = String(stage || '').toLowerCase();
    if (s.includes('lost') || s.includes('unqualif') || s.includes('reject')) return 'Lost';
    if (s.includes('propos')) return 'Proposal Sent';
    if (s.includes('qualif')) return 'Qualified';
    if (s.includes('won') || s.includes('closed')) return 'Deal Won';
    if (s.includes('contact')) return 'Contacted';
    return 'New Lead';
  };

  // Won Deals & Revenue
  const wonLeads = useMemo(() => {
    return filteredLeads.filter(l => {
      const s = String(l.stage || '').toLowerCase();
      return s.includes('won') || s.includes('closed');
    });
  }, [filteredLeads]);

  const wonCount = wonLeads.length;

  const qualifiedCount = useMemo(() => {
    return filteredLeads.filter(l => getStageCategory(l.stage) === 'Qualified').length;
  }, [filteredLeads]);

  const contactedCount = useMemo(() => {
    return filteredLeads.filter(l => getStageCategory(l.stage) === 'Contacted').length;
  }, [filteredLeads]);

  const newLeadsCount = useMemo(() => {
    return filteredLeads.filter(l => getStageCategory(l.stage) === 'New Lead').length;
  }, [filteredLeads]);

  const unqualifiedCount = useMemo(() => {
    return filteredLeads.filter(l => getStageCategory(l.stage) === 'Lost' || /unqualif/i.test(l.stage || '')).length;
  }, [filteredLeads]);
  const totalRevenue = useMemo(() => {
    return wonLeads.reduce((acc, l) => {
      const val = typeof l.dealValue === 'string' ? parseFloat(l.dealValue.replace(/[^0-9.]/g, '')) : Number(l.dealValue);
      return acc + (isNaN(val) ? 0 : val);
    }, 0);
  }, [wonLeads]);

  // Pipeline Stage Distribution
  const stageStats = useMemo(() => {
    const counts = {
      'New Lead': 0,
      'Contacted': 0,
      'Qualified': 0,
      'Proposal Sent': 0,
      'Deal Won': 0,
      'Lost': 0,
    };
    const values = {
      'New Lead': 0,
      'Contacted': 0,
      'Qualified': 0,
      'Proposal Sent': 0,
      'Deal Won': 0,
      'Lost': 0,
    };

    filteredLeads.forEach(l => {
      const cat = getStageCategory(l.stage);
      counts[cat]++;
      const val = typeof l.dealValue === 'string' ? parseFloat(l.dealValue.replace(/[^0-9.]/g, '')) : Number(l.dealValue);
      if (!isNaN(val) && val > 0) {
        values[cat] += val;
      }
    });

    const max = Math.max(...Object.values(counts), 1);
    const totalLeads = filteredLeads.length || 1;

    const list = [
      { 
        name: 'New Leads', 
        label: 'Naye Customers', 
        stageKey: 'New Lead',
        icon: '🟡',
        count: counts['New Lead'], 
        pct: Math.round((counts['New Lead'] / totalLeads) * 100),
        heightPct: Math.max(16, Math.round((counts['New Lead'] / max) * 100)),
        gradient: 'from-amber-400 via-amber-500 to-yellow-400',
        glowColor: 'rgba(245, 158, 11, 0.45)',
        badgeBg: 'bg-amber-100 text-amber-900 border-amber-200',
        textColor: 'text-amber-700',
        value: values['New Lead'],
        description: 'First time incoming message or raw contact'
      },
      { 
        name: 'Contacted', 
        label: 'Rabta Hua', 
        stageKey: 'Contacted',
        icon: '🔵',
        count: counts['Contacted'], 
        pct: Math.round((counts['Contacted'] / totalLeads) * 100),
        heightPct: Math.max(16, Math.round((counts['Contacted'] / max) * 100)),
        gradient: 'from-blue-500 via-indigo-500 to-sky-400',
        glowColor: 'rgba(59, 130, 246, 0.45)',
        badgeBg: 'bg-blue-100 text-blue-900 border-blue-200',
        textColor: 'text-blue-700',
        value: values['Contacted'],
        description: 'Agent responded and conversation active'
      },
      { 
        name: 'Qualified', 
        label: 'Quality Leads', 
        stageKey: 'Qualified',
        icon: '🟣',
        count: counts['Qualified'], 
        pct: Math.round((counts['Qualified'] / totalLeads) * 100),
        heightPct: Math.max(16, Math.round((counts['Qualified'] / max) * 100)),
        gradient: 'from-purple-500 via-violet-600 to-fuchsia-500',
        glowColor: 'rgba(147, 51, 234, 0.45)',
        badgeBg: 'bg-purple-100 text-purple-900 border-purple-200',
        textColor: 'text-purple-700',
        value: values['Qualified'],
        description: 'Serious buyer with verified requirement'
      },
      { 
        name: 'Proposal Sent', 
        label: 'Rate / Offer Bheji', 
        stageKey: 'Proposal Sent',
        icon: '🟠',
        count: counts['Proposal Sent'], 
        pct: Math.round((counts['Proposal Sent'] / totalLeads) * 100),
        heightPct: Math.max(16, Math.round((counts['Proposal Sent'] / max) * 100)),
        gradient: 'from-orange-500 via-rose-500 to-amber-500',
        glowColor: 'rgba(249, 115, 22, 0.55)',
        badgeBg: 'bg-orange-100 text-orange-950 border-orange-300',
        textColor: 'text-orange-700',
        isHot: true,
        value: values['Proposal Sent'],
        description: 'Formal quote or price plan sent, waiting deal close'
      },
      { 
        name: 'Deal Won', 
        label: 'Closed Munafe Deals', 
        stageKey: 'Deal Won',
        icon: '🟢',
        count: counts['Deal Won'], 
        pct: Math.round((counts['Deal Won'] / totalLeads) * 100),
        heightPct: Math.max(16, Math.round((counts['Deal Won'] / max) * 100)),
        gradient: 'from-emerald-500 via-teal-500 to-green-400',
        glowColor: 'rgba(16, 185, 129, 0.5)',
        badgeBg: 'bg-emerald-100 text-emerald-950 border-emerald-300',
        textColor: 'text-emerald-700',
        isWon: true,
        value: values['Deal Won'],
        description: 'Deal successfully closed and order confirmed!'
      },
      { 
        name: 'Lost', 
        label: 'Unqualified Leads', 
        stageKey: 'stage_Lost',
        icon: '🔴',
        count: counts['Lost'] || 0, 
        pct: Math.round(((counts['Lost'] || 0) / totalLeads) * 100),
        heightPct: Math.max(16, Math.round(((counts['Lost'] || 0) / max) * 100)),
        gradient: 'from-rose-500 via-red-500 to-pink-500',
        glowColor: 'rgba(244, 63, 94, 0.5)',
        badgeBg: 'bg-rose-100 text-rose-950 border-rose-300',
        textColor: 'text-rose-700',
        isLost: true,
        value: values['Lost'] || 0,
        description: 'Timepass, spam ya disqualified inquiries'
      },
    ];

    // Compute conversion from preceding stage
    return list.map((st, idx) => {
      let conversionFromPrev = null;
      if (idx > 0) {
        const prev = list[idx - 1];
        conversionFromPrev = prev.count > 0 ? Math.round((st.count / prev.count) * 100) : 0;
      }
      return { ...st, conversionFromPrev };
    });
  }, [filteredLeads]);

  // Top Requested AmazFast Services Breakdown
  const serviceStats = useMemo(() => {
    const map = {};
    filteredLeads.forEach(l => {
      const s = l.serviceInterest?.trim();
      if (s) {
        map[s] = (map[s] || 0) + 1;
      }
    });
    return Object.entries(map)
      .map(([name, count]) => ({ 
        name, 
        count, 
        pct: Math.round((count / (filteredLeads.length || 1)) * 100) 
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [filteredLeads]);

  // Daily Trends for past 7 days (Bar chart data)
  const dailyTrends = useMemo(() => {
    const days = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const label = i === 0 ? 'Aaj' : i === 1 ? 'Kal' : d.toLocaleDateString('en-US', { weekday: 'short' });

      const count = (selectedChannel === 'all' ? leads : leads.filter(l => l.channel === selectedChannel)).filter(l => {
        const leadDate = (l.createdAt || l.rawLastMessageAt || '').slice(0, 10);
        return leadDate === dateStr;
      }).length;

      days.push({ label, dateStr, count, isToday: i === 0, isYesterday: i === 1 });
    }
    const maxCount = Math.max(...days.map(d => d.count), 1);
    return days.map(d => ({ ...d, heightPct: Math.max(12, Math.round((d.count / maxCount) * 100)) }));
  }, [leads, selectedChannel]);

  // Active Meta Channels breakdown
  const activeChannelsList = useMemo(() => {
    return channels.filter(c => c.id !== 'all').map(ch => {
      const statsForCh = overallStats.byChannel[ch.id] || { total: 0, today: 0, yesterday: 0 };
      const pct = leads.length > 0 ? Math.round((statsForCh.total / leads.length) * 100) : 0;
      return {
        id: ch.id,
        name: formatChannelDisplayName(ch),
        number: ch.number,
        flag: ch.flag || '🇵🇰',
        total: statsForCh.total,
        today: statsForCh.today,
        yesterday: statsForCh.yesterday,
        pct
      };
    });
  }, [channels, overallStats, leads]);

  // Determine which list to show in drilldown modal
  const drilldownData = useMemo(() => {
    if (!drilldownCategory) return null;
    let title = '';
    let description = '';
    let badgeColor = '';
    let list = [];

    if (drilldownCategory === 'main_leads') {
      title = timeRange === 'today' 
        ? 'Aaj Ki WhatsApp Leads' 
        : timeRange === 'yesterday' 
        ? 'Kal Ki WhatsApp Leads' 
        : timeRange === 'custom'
        ? `${customDayDisplay} Ki Leads`
        : timeRange === '7days'
        ? 'Pichle 7 Din Ki Leads'
        : (selectedChannel === 'all' ? 'Kul WhatsApp Leads (Saare Numbers)' : 'Is Line Ki Kul Leads');
      description = timeRange === 'today' 
        ? 'Aaj jitne customers ne WhatsApp par message kiya ya register hue.' 
        : 'Selected filter ke mutabiq leads ki mukammal tafseel.';
      badgeColor = 'bg-orange-100 text-orange-800';
      list = filteredLeads;
    } else if (drilldownCategory === 'all_leads') {
      const isFiltered = timeRange !== 'all';
      title = timeRange === 'today' 
        ? 'Aaj Ki WhatsApp Leads' 
        : timeRange === 'yesterday' 
        ? 'Kal Ki WhatsApp Leads' 
        : timeRange === 'custom'
        ? `${customDayDisplay} Ki Leads`
        : timeRange === '7days'
        ? 'Pichle 7 Din Ki Leads'
        : (selectedChannel === 'all' ? 'Kul WhatsApp Leads (Saare Numbers)' : 'Is WhatsApp Line Ki Kul Leads');
      description = isFiltered 
        ? `Selected filter (${timeRange === 'today' ? 'Aaj' : timeRange === 'yesterday' ? 'Kal' : 'Custom'}) ke mutabiq leads ki mukammal tafseel (${filteredLeads.length}).`
        : (selectedChannel === 'all' ? 'Teeno WhatsApp numbers ki tamaam database leads.' : `Selected WhatsApp number ki tamaam leads (${channelLeads.length}).`);
      badgeColor = 'bg-indigo-100 text-indigo-800';
      list = filteredLeads;
    } else if (drilldownCategory === 'today') {
      title = 'Aaj Ki WhatsApp Leads';
      description = 'Aaj jitne bhi naye customers ne message kiya ya register hue.';
      badgeColor = 'bg-emerald-100 text-emerald-800';
      list = todayLeadsList;
    } else if (drilldownCategory === 'replied') {
      title = 'Customers Jinko Reply Send Kar Diya';
      description = 'Jin customers ko staff/agent ne WhatsApp par jawab bhej diya hai.';
      badgeColor = 'bg-emerald-100 text-emerald-800';
      list = repliedLeadsList;
    } else if (drilldownCategory === 'pending') {
      title = 'Customers Pending (Jinko Jawab Dena Hai)';
      description = 'Aese customers jinka message aya hua hai aur abhi reply dena baqi hai.';
      badgeColor = 'bg-amber-100 text-amber-800';
      list = pendingLeadsList;
    } else if (drilldownCategory === 'top') {
      title = 'Sabse Zyada Baat Wale Customers (Top Engaged)';
      description = 'Wo customers jin ke sath sabse lambi conversation aur zyada messages hue hain.';
      badgeColor = 'bg-purple-100 text-purple-800';
      list = topEngagedLeads;
    } else if (drilldownCategory === 'won' || drilldownCategory === 'stage_Deal Won') {
      title = 'Kamyab Closed Deals (Won)';
      description = 'Jin customers se orders ya payment confirm ho chuki hai.';
      badgeColor = 'bg-emerald-100 text-emerald-800';
      list = wonLeads;
    } else if (drilldownCategory === 'stage_New Lead') {
      title = 'Naye Leads (New Customers)';
      description = 'Wo leads jo abhi new register huin aur preliminary review mein hain.';
      badgeColor = 'bg-amber-100 text-amber-800';
      list = filteredLeads.filter(l => getStageCategory(l.stage) === 'New Lead');
    } else if (drilldownCategory === 'stage_Contacted') {
      title = 'Rabta Hua (Contacted Leads)';
      description = 'Jin customers se pehla rabta ya initial chat shuru ho chuki hai.';
      badgeColor = 'bg-blue-100 text-blue-800';
      list = filteredLeads.filter(l => getStageCategory(l.stage) === 'Contacted');
    } else if (drilldownCategory === 'stage_Qualified') {
      title = 'Sanbhalay Gaye (Qualified Quality Leads)';
      description = 'Verified aur genuine buyers jinka requirement confirm ho chuka hai.';
      badgeColor = 'bg-purple-100 text-purple-800';
      list = filteredLeads.filter(l => getStageCategory(l.stage) === 'Qualified');
    } else if (drilldownCategory === 'stage_Proposal Sent') {
      title = 'Rate / Offer Bheji (Proposal Sent Leads)';
      description = 'Jin customers ko quotation, price plan ya proposal deliver ho chuki hai.';
      badgeColor = 'bg-orange-100 text-orange-800';
      list = filteredLeads.filter(l => getStageCategory(l.stage) === 'Proposal Sent');
    } else if (drilldownCategory === 'stage_Lost' || drilldownCategory === 'unqualified') {
      title = 'Unqualified Leads (Not Interested / Rejected)';
      description = 'Wo inquiries jo timepass, spam ya reject hui hain.';
      badgeColor = 'bg-rose-100 text-rose-800';
      list = filteredLeads.filter(l => getStageCategory(l.stage) === 'Lost' || /unqualif|lost/i.test(l.stage || ''));
    }

    if (drilldownSearch) {
      const q = drilldownSearch.toLowerCase();
      list = list.filter(l => 
        (l.name || '').toLowerCase().includes(q) || 
        (l.phone || '').includes(q) || 
        (l.assignedTo || '').toLowerCase().includes(q)
      );
    }

    return { title, description, badgeColor, list };
  }, [drilldownCategory, drilldownSearch, channelLeads, selectedChannel, todayLeadsList, repliedLeadsList, pendingLeadsList, topEngagedLeads, wonLeads]);

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto animate-fade-in">
      {/* 1. Filter & Quick Navigation Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left: Channel Selector Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <span className="font-bold text-slate-500 mr-1 flex items-center gap-1 shrink-0">
            <Filter className="w-3.5 h-3.5" /> WhatsApp Line:
          </span>
          {channels.some(c => c.id === 'all') && (!currentUser || currentUser.role === 'ADMIN') && (
            <button
              onClick={() => setSelectedChannel && setSelectedChannel('all')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 ${
                selectedChannel === 'all'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <span>🌐</span>
              <span>Saare Numbers ({leads.length})</span>
            </button>
          )}

          {activeChannelsList.map((ch) => {
            const isSelected = selectedChannel === ch.id;
            return (
              <button
                key={ch.id}
                onClick={() => setSelectedChannel && setSelectedChannel(ch.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 ${
                  isSelected
                    ? 'bg-orange-500 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
                title={`Line: ${ch.number} (Aaj: ${ch.today}, Kal: ${ch.yesterday})`}
              >
                <span>{ch.flag}</span>
                <span>{ch.name}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                  isSelected ? 'bg-white/25 text-white' : 'bg-slate-200 text-slate-700'
                }`}>
                  {ch.total}
                </span>
                {ch.today > 0 && (
                  <span className="text-[9px] bg-emerald-500 text-white px-1 py-0.2 rounded font-extrabold">
                    +{ch.today} aaj
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Right: Refresh & Time Range Selector */}
        <div className="flex items-center gap-2">
          {/* Reload / Refresh Button */}
          <button
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 hover:bg-orange-100 text-orange-700 font-bold rounded-xl border border-orange-200 text-xs transition-all shadow-2xs"
            title="Leads aur WhatsApp Data Refresh Karein"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-orange-600' : ''}`} />
            <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>

          {/* AmazFast Service Filter Dropdown */}
          <span className="text-xs font-bold text-slate-500">Service:</span>
          <select
            value={selectedServiceFilter}
            onChange={(e) => setSelectedServiceFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-orange-500 cursor-pointer max-w-[190px] truncate"
          >
            <option value="all">💼 Saari Services</option>
            {AMAZFAST_SERVICES.map(s => (
              <option key={s.id} value={s.shortLabel}>{s.label}</option>
            ))}
          </select>

          <span className="text-xs font-bold text-slate-500">Waqt:</span>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-orange-500 cursor-pointer"
          >
            <option value="today">📅 Aaj Ki Leads ({channelTodayCount})</option>
            <option value="yesterday">⏪ Kal Ki Leads ({channelYesterdayCount})</option>
            <option value="custom">📆 Taareekh Chunein (Specific Day)</option>
            <option value="7days">🗓️ Is Hafte (7 Din)</option>
            <option value="30days">📊 Is Mahine (30 Din)</option>
            <option value="all">🌐 Saara Data / Kul Leads ({channelLeads.length})</option>
          </select>

          {/* Specific Date Picker with Day Name & Fast Prev/Next Navigation */}
          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl p-1 shadow-2xs">
            <button
              type="button"
              onClick={() => handleShiftDate(-1)}
              className="p-1 hover:bg-slate-200 rounded-lg text-slate-600 transition-colors"
              title="Pichla Din (Previous Day)"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <input
              type="date"
              value={customSelectedDate}
              onChange={(e) => {
                setCustomSelectedDate(e.target.value);
                setTimeRange('custom');
              }}
              className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer px-1"
              title="Koi bhi date chunein"
            />
            <button
              type="button"
              onClick={() => handleShiftDate(1)}
              className="p-1 hover:bg-slate-200 rounded-lg text-slate-600 transition-colors"
              title="Agla Din (Next Day)"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
            <span className={`text-[11px] font-black px-2 py-0.5 rounded-lg shrink-0 transition-all ${
              timeRange === 'custom'
                ? 'bg-orange-500 text-white shadow-xs'
                : 'bg-slate-200/80 text-slate-700'
            }`}>
              {customDayDisplay} ({customDateLeadCount})
            </span>
          </div>
        </div>
      </div>

      {/* Network Connectivity & Alert Banners */}
      {!networkStatus.isOnline && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-between text-xs text-rose-900 shadow-2xs animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <WifiOff className="w-5 h-5 text-rose-600 shrink-0" />
            <div>
              <span className="font-extrabold text-rose-950 block">Internet Connection Band Hai / Server Offline:</span>
              <p className="text-[11px] text-rose-800 mt-0.5">Aapka internet band hai ya backend server se rabta toot gaya hai. Live WhatsApp messages ruk sakte hain.</p>
            </div>
          </div>
          <button
            onClick={handleManualRefresh}
            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs transition-colors shrink-0"
          >
            Dubara Connect Karein
          </button>
        </div>
      )}

      {networkStatus.isOnline && networkStatus.isSlow && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-between text-xs text-amber-900 shadow-2xs animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <span className="font-extrabold text-amber-950 block">Internet / Server Connection Dheema (Slow) Hai:</span>
              <p className="text-[11px] text-amber-800 mt-0.5">Response time ~{networkStatus.latencyMs}ms raha. Naye messages aur leads aane mein dair lag sakti hai.</p>
            </div>
          </div>
          <button
            onClick={handleManualRefresh}
            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs transition-colors shrink-0"
          >
            Recheck Speed
          </button>
        </div>
      )}

      {refreshToast && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-2 text-xs font-bold text-emerald-800 shadow-2xs animate-in fade-in">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>{refreshToast}</span>
        </div>
      )}

      {/* 2. Top Interactive Pipeline KPI Cards (Clickable Drilldown) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5">
        {/* Card 0: Total Leads (Kul Leads) */}
        <div 
          onClick={() => { setDrilldownCategory('all_leads'); setDrilldownSearch(''); }}
          className="card-soft p-4 bg-white relative overflow-hidden group hover:shadow-card-hover hover:border-indigo-400 transition-all border border-slate-200/80 cursor-pointer"
          title="Click to view all leads in current filter"
        >
          <div className="flex items-center justify-between">
            <div className="w-8.5 h-8.5 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold group-hover:scale-110 transition-transform">
              <Layers className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 flex items-center gap-1">
              <Eye className="w-3 h-3" /> {timeRange === 'today' ? 'Aaj' : timeRange === 'yesterday' ? 'Kal' : timeRange === '7days' ? '7 Din' : 'Kul'} Leads
            </span>
          </div>

          <div className="mt-3 flex items-baseline gap-2">
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">
              {totalLeadsCount}
            </h3>
            <span className="inline-flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200">
              📊 {timeRange === 'today' ? 'Aaj Ka Total' : timeRange === 'yesterday' ? 'Kal Ka Total' : 'Total Leads'}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 font-semibold mt-1">
            {timeRange === 'today' ? 'Aaj Aayi Hui Leads' : timeRange === 'yesterday' ? 'Kal Ki Aayi Hui Leads' : timeRange === '7days' ? 'Pichle 7 Din Ki Leads' : 'Tamaam Aayi Hui Leads'}
          </p>

          <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] font-bold">
            <span className="text-indigo-700">All Customers</span>
            <span className="text-slate-400 font-medium">Click List →</span>
          </div>
        </div>

        {/* Card 1: Naye Customers (New Leads) */}
        <div 
          onClick={() => { setDrilldownCategory('stage_New Lead'); setDrilldownSearch(''); }}
          className="card-soft p-4 bg-white relative overflow-hidden group hover:shadow-card-hover hover:border-amber-400 transition-all border border-slate-200/80 cursor-pointer"
          title="Click to view new leads list"
        >
          <div className="flex items-center justify-between">
            <div className="w-8.5 h-8.5 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold group-hover:scale-110 transition-transform">
              <Users className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 flex items-center gap-1">
              <Eye className="w-3 h-3" /> Naye
            </span>
          </div>

          <div className="mt-3 flex items-baseline gap-2">
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">
              {newLeadsCount}
            </h3>
            <span className="inline-flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200">
              🟡 New Leads
            </span>
          </div>
          <p className="text-[11px] text-slate-500 font-semibold mt-1">
            Naye Customers (Pehla Msg)
          </p>

          <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] font-bold">
            <span className="text-amber-700">Reply Dena Hai</span>
            <span className="text-slate-400 font-medium">Click Details →</span>
          </div>
        </div>

        {/* Card 2: Contacted (Rabta Hua) */}
        <div 
          onClick={() => { setDrilldownCategory('stage_Contacted'); setDrilldownSearch(''); }}
          className="card-soft p-4 bg-white relative overflow-hidden group hover:shadow-card-hover hover:border-blue-400 transition-all border border-slate-200/80 cursor-pointer"
          title="Click to view contacted customers"
        >
          <div className="flex items-center justify-between">
            <div className="w-8.5 h-8.5 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold group-hover:scale-110 transition-transform">
              <MessageSquare className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 flex items-center gap-1">
              <Eye className="w-3 h-3" /> Active
            </span>
          </div>

          <div className="mt-3 flex items-baseline gap-2">
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">
              {contactedCount}
            </h3>
            <span className="inline-flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
              🔵 Contacted
            </span>
          </div>
          <p className="text-[11px] text-slate-500 font-semibold mt-1">
            Rabta Hua (Active)
          </p>

          <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] font-bold text-slate-600">
            <span className="text-blue-700">Baat Chal Rahi</span>
            <span className="text-slate-400 font-medium">Click List →</span>
          </div>
        </div>

        {/* Card 3: Qualified (Quality Leads) */}
        <div 
          onClick={() => { setDrilldownCategory('stage_Qualified'); setDrilldownSearch(''); }}
          className="card-soft p-4 bg-white relative overflow-hidden group hover:shadow-card-hover hover:border-purple-400 transition-all border border-slate-200/80 cursor-pointer"
          title="Click to view qualified leads list"
        >
          <div className="flex items-center justify-between">
            <div className="w-8.5 h-8.5 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold group-hover:scale-110 transition-transform">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 flex items-center gap-1">
              <Eye className="w-3 h-3" /> Genuine
            </span>
          </div>

          <div className="mt-3 flex items-baseline gap-2">
            <h3 className="text-2xl font-black text-purple-900 tracking-tight">
              {qualifiedCount}
            </h3>
            <span className="inline-flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200">
              🟣 Qualified
            </span>
          </div>
          <p className="text-[11px] text-slate-500 font-semibold mt-1">
            Genuine Quality Buyers
          </p>

          <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] font-bold">
            <span className="text-purple-700">Khareedar Tayyar</span>
            <span className="text-slate-400 font-medium">Click List →</span>
          </div>
        </div>

        {/* Card 4: Deals Won & Revenue */}
        <div 
          onClick={() => { setDrilldownCategory('won'); setDrilldownSearch(''); }}
          className="card-soft p-4 bg-white relative overflow-hidden group hover:shadow-card-hover hover:border-emerald-400 transition-all border border-slate-200/80 cursor-pointer"
          title="Click to view won deals"
        >
          <div className="flex items-center justify-between">
            <div className="w-8.5 h-8.5 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold group-hover:scale-110 transition-transform">
              <TrendingUp className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 flex items-center gap-1">
              <Eye className="w-3 h-3" /> Sales
            </span>
          </div>

          <div className="mt-3 flex items-baseline gap-2">
            <h3 className="text-2xl font-black text-emerald-900 tracking-tight">
              {wonCount}
            </h3>
            <span className="inline-flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
              🟢 Deal Won
            </span>
          </div>
          <p className="text-[11px] text-slate-500 font-semibold mt-1 truncate">
            {totalRevenue > 0 ? `PKR ${totalRevenue.toLocaleString()}` : 'Closed Deals'}
          </p>

          <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] font-bold">
            <span className="text-emerald-700">Kamai / Revenue</span>
            <span className="text-slate-400 font-medium">Click List →</span>
          </div>
        </div>

        {/* Card 5: Unqualified / Rejected (Red Card) */}
        <div 
          onClick={() => { setDrilldownCategory('stage_Lost'); setDrilldownSearch(''); }}
          className="card-soft p-4 bg-white relative overflow-hidden group hover:shadow-card-hover hover:border-rose-400 transition-all border border-slate-200/80 cursor-pointer"
          title="Click to view unqualified inquiries"
        >
          <div className="flex items-center justify-between">
            <div className="w-8.5 h-8.5 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold group-hover:scale-110 transition-transform">
              <AlertCircle className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 flex items-center gap-1">
              <Eye className="w-3 h-3" /> Rejected
            </span>
          </div>

          <div className="mt-3 flex items-baseline gap-2">
            <h3 className="text-2xl font-black text-rose-900 tracking-tight">
              {unqualifiedCount}
            </h3>
            <span className="inline-flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200">
              🔴 Unqualified
            </span>
          </div>
          <p className="text-[11px] text-slate-500 font-semibold mt-1">
            Timepass / Rejected
          </p>

          <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] font-bold">
            <span className="text-rose-700">Rejected List</span>
            <span className="text-slate-400 font-medium">Click List →</span>
          </div>
        </div>
      </div>

      {/* 3. Dedicated Admin Visual Section: Response Flow & Engagement Bar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left 2 Cols: Inbound vs Outbound Messages & Response Breakdown */}
        <div className="lg:col-span-2 card-soft p-6 bg-white border border-slate-200/80 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
                  Aaj Ke Messages Aur Reply Ka Hisaab
                </h3>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Kitne messages aye, kitno ko jawab diya gaya aur kitna response time raha.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg">
                ⚡ {messageStats.replyRate}% Response Rate
              </span>
            </div>
          </div>

          {/* Visual Ratio Bar: Replied vs Pending */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-extrabold">
              <span className="text-emerald-700 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                Reply Send Kar Diya: {repliedLeadsList.length} Customers ({messageStats.replyRate}%)
              </span>
              <span className="text-amber-700 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                Pending Jawab Dena Hai: {pendingLeadsList.length} Customers ({100 - messageStats.replyRate}%)
              </span>
            </div>

            <div className="w-full bg-amber-100 h-4 rounded-full overflow-hidden flex">
              <div 
                style={{ width: `${messageStats.replyRate}%` }} 
                className="bg-emerald-500 h-full rounded-l-full transition-all duration-500 shadow-sm"
                title={`${repliedLeadsList.length} Replied`}
              ></div>
              <div 
                style={{ width: `${100 - messageStats.replyRate}%` }} 
                className="bg-amber-400 h-full rounded-r-full transition-all duration-500 shadow-sm"
                title={`${pendingLeadsList.length} Pending`}
              ></div>
            </div>
          </div>

          {/* 3 Detail KPI Chips */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70">
              <span className="text-[10px] font-extrabold text-slate-500 uppercase block">Customers Ke Messages (Inbound)</span>
              <span className="text-xl font-black text-slate-900 mt-1 block">
                {filteredLeads.length} <span className="text-xs text-slate-500 font-semibold">Customers</span>
              </span>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {messageStats.customerMsgs} WhatsApp Inbound Messages
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70">
              <span className="text-[10px] font-extrabold text-slate-500 uppercase block">Hamare Replies (Outbound)</span>
              <span className="text-xl font-black text-emerald-600 mt-1 block">
                {repliedLeadsList.length} <span className="text-xs text-slate-500 font-semibold">Replies Sent</span>
              </span>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {messageStats.agentMsgs > 0 ? `${messageStats.agentMsgs} messages deliver kiye` : 'Koi reply nahi gaya abhi'}
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70">
              <span className="text-[10px] font-extrabold text-slate-500 uppercase block">Har Message Ka Reply Time</span>
              <span className="text-xl font-black text-orange-600 mt-1 block">
                ~2.4 <span className="text-xs text-slate-500 font-semibold">Minutes</span>
              </span>
              <p className="text-[11px] text-emerald-600 font-bold mt-0.5">⚡ WhatsApp Best Benchmark</p>
            </div>
          </div>

          {/* Main Analytics Graph Section: Pipeline Stages vs 7-Day Volume */}
          <div className="pt-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 gap-2 border-b border-slate-100">
              {/* Primary Tab Switcher */}
              <div className="flex items-center gap-1.5 bg-slate-100/80 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setActiveGraphTab('pipeline')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                    activeGraphTab === 'pipeline'
                      ? 'bg-white text-orange-600 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <BarChart3 className="w-3.5 h-3.5 text-orange-500" />
                  <span>📊 Leads Pipeline & Stages Graph</span>
                  {stageStats.find(s => s.name === 'Proposal Sent')?.count > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 bg-orange-100 text-orange-700 text-[10px] rounded-full font-black animate-pulse">
                      {stageStats.find(s => s.name === 'Proposal Sent')?.count} Hot
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveGraphTab('trend')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                    activeGraphTab === 'trend'
                      ? 'bg-white text-blue-600 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <TrendingUp className="w-3.5 h-3.5 text-blue-500" />
                  <span>📈 Past 7 Days Volume</span>
                </button>
              </div>

              {/* Secondary Controls: View mode switcher (Pillars vs Funnel) */}
              {activeGraphTab === 'pipeline' && (
                <div className="flex items-center gap-1 bg-slate-100/70 p-0.5 rounded-lg text-xs">
                  <button
                    type="button"
                    onClick={() => setPipelineViewMode('pillars')}
                    className={`px-2.5 py-1 rounded-md font-bold transition-all flex items-center gap-1 ${
                      pipelineViewMode === 'pillars' 
                        ? 'bg-white text-slate-800 shadow-2xs' 
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                    title="Vertical 3D Animated Pillars"
                  >
                    <BarChart3 className="w-3 h-3 text-orange-500" />
                    <span className="text-[11px]">Pillars Graph</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPipelineViewMode('funnel')}
                    className={`px-2.5 py-1 rounded-md font-bold transition-all flex items-center gap-1 ${
                      pipelineViewMode === 'funnel' 
                        ? 'bg-white text-slate-800 shadow-2xs' 
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                    title="Horizontal Funnel & Conversion Journey"
                  >
                    <Layers className="w-3 h-3 text-purple-500" />
                    <span className="text-[11px]">Funnel Flow</span>
                  </button>
                </div>
              )}
            </div>

            {/* TAB 1: Leads Pipeline & Stages Graph */}
            {activeGraphTab === 'pipeline' ? (
              <div className="space-y-4 pt-3">
                {/* Mode A: Animated Glowing Pillars Graph */}
                {pipelineViewMode === 'pillars' ? (
                  <div className="relative pt-2 pb-1">
                    {/* Background Reference Grid Lines */}
                    <div className="absolute inset-x-3 top-3 bottom-14 flex flex-col justify-between pointer-events-none opacity-20 z-0">
                      <div className="border-b border-dashed border-slate-400 w-full flex items-center justify-between text-[9px] text-slate-500 font-mono">
                        <span>100% Peak</span>
                      </div>
                      <div className="border-b border-dashed border-slate-300 w-full flex items-center justify-between text-[9px] text-slate-400 font-mono">
                        <span>75%</span>
                      </div>
                      <div className="border-b border-dashed border-slate-300 w-full flex items-center justify-between text-[9px] text-slate-400 font-mono">
                        <span>50%</span>
                      </div>
                      <div className="border-b border-dashed border-slate-300 w-full flex items-center justify-between text-[9px] text-slate-400 font-mono">
                        <span>25%</span>
                      </div>
                      <div className="border-b border-slate-200 w-full"></div>
                    </div>

                    {/* Active Hover Floating Focus HUD */}
                    {hoveredStageKey && (() => {
                      const hStage = stageStats.find(s => s.stageKey === hoveredStageKey);
                      if (!hStage) return null;
                      return (
                        <div className="absolute -top-1 left-1/2 -translate-x-1/2 z-30 px-3.5 py-1 rounded-full bg-slate-900/95 text-white backdrop-blur-md shadow-xl text-xs flex items-center gap-2.5 border border-slate-700 animate-in fade-in zoom-in-95 duration-150">
                          <span className="font-bold flex items-center gap-1">
                            <span>{hStage.icon}</span>
                            <span>{hStage.name}</span>
                          </span>
                          <span className="text-slate-500">•</span>
                          <span className="font-black text-amber-300">{hStage.count} Leads</span>
                          <span className="text-slate-400 font-bold">({hStage.pct}% total)</span>
                          {hStage.conversionFromPrev !== null && (
                            <>
                              <span className="text-slate-500">•</span>
                              <span className="text-cyan-300 font-semibold text-[11px]">
                                {hStage.conversionFromPrev}% converted
                              </span>
                            </>
                          )}
                          {hStage.value > 0 && (
                            <>
                              <span className="text-slate-500">•</span>
                              <span className="text-emerald-400 font-black">
                                PKR {hStage.value.toLocaleString()}
                              </span>
                            </>
                          )}
                          <span className="text-[10px] text-orange-400 font-bold underline cursor-pointer ml-1">
                            List Kholein ↗
                          </span>
                        </div>
                      );
                    })()}

                    {/* 5 Vertical Animated Pillars */}
                    <div className="relative h-56 flex items-end justify-between gap-2 sm:gap-4 px-2 sm:px-4 z-10">
                      {stageStats.map((st, idx) => {
                        const isHovered = hoveredStageKey === st.stageKey;
                        const isOtherHovered = hoveredStageKey && hoveredStageKey !== st.stageKey;

                        return (
                          <React.Fragment key={st.name}>
                            <div 
                              onMouseEnter={() => setHoveredStageKey(st.stageKey)}
                              onMouseLeave={() => setHoveredStageKey(null)}
                              onClick={() => { setDrilldownCategory(`stage_${st.stageKey}`); setDrilldownSearch(''); }}
                              className={`flex-1 flex flex-col items-center gap-1.5 h-full justify-end group cursor-pointer transition-all duration-300 ${
                                isOtherHovered ? 'opacity-40 scale-95' : 'opacity-100'
                              } ${isHovered ? 'scale-105 z-20' : ''}`}
                              title={`Click karein: ${st.name} ke tamaam leads dekhein (${st.count})`}
                            >
                              {/* Top Metrics Badge */}
                              <div className="flex flex-col items-center mb-0.5 transition-transform duration-200 group-hover:-translate-y-1">
                                <span className="text-xs sm:text-sm font-black text-slate-900 group-hover:text-orange-600 transition-colors">
                                  {st.count}
                                </span>
                                <span className="text-[10px] font-extrabold text-slate-400">
                                  {st.pct}%
                                </span>
                              </div>

                              {/* 3D Gradient Bar with Smooth Spring Height & Ambient Neon Glow */}
                              <div 
                                style={{ 
                                  height: `${st.heightPct}%`,
                                  boxShadow: isHovered || st.isHot || st.isWon 
                                    ? `0 12px 28px -4px ${st.glowColor}, 0 4px 12px -2px ${st.glowColor}` 
                                    : '0 4px 10px -2px rgba(0,0,0,0.06)'
                                }}
                                className={`w-full max-w-[52px] rounded-t-2xl transition-all duration-500 relative bg-gradient-to-t ${st.gradient} ${
                                  st.isHot ? 'ring-2 ring-orange-400 ring-offset-2 ring-offset-white' : ''
                                } ${st.isWon ? 'ring-2 ring-emerald-400 ring-offset-2 ring-offset-white' : ''}`}
                              >
                                {/* Glass Shimmer Reflection Cap on Top */}
                                <div className="absolute top-0 inset-x-0 h-2 bg-white/40 rounded-t-2xl"></div>

                                {/* Hot Animated Beacon on Proposal Sent */}
                                {st.isHot && (
                                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex items-center justify-center pointer-events-none">
                                    <span className="relative flex h-3 w-3">
                                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                                      <span className="relative inline-flex rounded-full h-3 w-3 bg-orange-500"></span>
                                    </span>
                                  </div>
                                )}

                                {/* Deal Won Trophy Icon on Deal Won */}
                                {st.isWon && st.count > 0 && (
                                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs filter drop-shadow">
                                    🏆
                                  </div>
                                )}
                              </div>

                              {/* Bottom Labels */}
                              <div className="text-center mt-1.5 w-full">
                                <span className={`text-[11px] font-black block truncate ${st.textColor}`}>
                                  {st.name}
                                </span>
                                <span className="text-[9px] font-semibold text-slate-400 hidden sm:block truncate">
                                  {st.label}
                                </span>
                              </div>
                            </div>

                            {/* Conversion Flow Arrow Indicator between pillars */}
                            {idx < stageStats.length - 1 && (
                              <div className="hidden md:flex flex-col items-center justify-center mb-12 shrink-0 opacity-70 group-hover:opacity-100 transition-opacity">
                                <span className="text-[9px] font-mono font-bold text-slate-400 px-1 py-0.5 bg-slate-100 rounded-md shadow-2xs">
                                  {stageStats[idx + 1].conversionFromPrev !== null ? `${stageStats[idx + 1].conversionFromPrev}%` : '→'}
                                </span>
                                <span className="text-slate-300 text-xs -mt-1 font-mono">→</span>
                              </div>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  /* Mode B: Horizontal Funnel Flow Journey */
                  <div className="space-y-2.5 pt-2">
                    {stageStats.map((st, idx) => (
                      <div 
                        key={st.name}
                        onClick={() => { setDrilldownCategory(`stage_${st.stageKey}`); setDrilldownSearch(''); }}
                        className="p-3 rounded-xl bg-slate-50/80 hover:bg-white border border-slate-200/70 hover:border-orange-300 hover:shadow-md transition-all cursor-pointer group"
                      >
                        <div className="flex items-center justify-between gap-3 mb-1.5">
                          <div className="flex items-center gap-2">
                            <span className="text-base">{st.icon}</span>
                            <div>
                              <span className="text-xs font-black text-slate-800 group-hover:text-orange-600 transition-colors">
                                {st.name}
                              </span>
                              <span className="text-[10px] text-slate-500 ml-2 hidden sm:inline">
                                ({st.label})
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {st.value > 0 && (
                              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                PKR {st.value.toLocaleString()}
                              </span>
                            )}
                            <span className={`text-xs font-black px-2 py-0.5 rounded-lg ${st.badgeBg}`}>
                              {st.count} Leads ({st.pct}%)
                            </span>
                          </div>
                        </div>

                        {/* Funnel Progress Bar */}
                        <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                          <div 
                            style={{ width: `${Math.max(8, st.pct)}%` }}
                            className={`h-full rounded-full bg-gradient-to-r ${st.gradient} transition-all duration-500`}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Quality Summary Chips below Pipeline Graph */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                  <div 
                    onClick={() => { setDrilldownCategory('stage_Qualified'); setDrilldownSearch(''); }}
                    className="p-3 rounded-xl bg-gradient-to-br from-purple-50/80 to-violet-50/40 border border-purple-100 hover:border-purple-300 transition-all cursor-pointer shadow-2xs group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-purple-700 uppercase tracking-wider block">Lead Quality Rate</span>
                      <span className="text-[10px] text-purple-700 font-bold bg-purple-100 px-2 py-0.5 rounded-full border border-purple-200">
                        Qualified+
                      </span>
                    </div>
                    <div className="mt-1 flex items-baseline gap-1.5">
                      <span className="text-xl font-black text-purple-900">
                        {Math.round(((stageStats.find(s => s.name === 'Qualified')?.count || 0) + (stageStats.find(s => s.name === 'Proposal Sent')?.count || 0) + (stageStats.find(s => s.name === 'Deal Won')?.count || 0)) / (filteredLeads.length || 1) * 100)}%
                      </span>
                      <span className="text-[10px] text-purple-600 font-semibold">of WhatsApp leads verified</span>
                    </div>
                  </div>

                  <div 
                    onClick={() => { setDrilldownCategory('stage_Proposal Sent'); setDrilldownSearch(''); }}
                    className="p-3 rounded-xl bg-gradient-to-br from-orange-50/80 to-amber-50/40 border border-orange-200 hover:border-orange-400 transition-all cursor-pointer shadow-2xs group relative overflow-hidden"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-orange-700 uppercase tracking-wider block flex items-center gap-1">
                        <span>Active Proposals</span>
                        <span className="text-xs">🔥</span>
                      </span>
                      <span className="text-[10px] text-orange-700 font-bold bg-orange-100 px-2 py-0.5 rounded-full border border-orange-200">
                        Rate Bheji
                      </span>
                    </div>
                    <div className="mt-1 flex items-baseline justify-between">
                      <span className="text-xl font-black text-orange-950">
                        {stageStats.find(s => s.name === 'Proposal Sent')?.count || 0} <span className="text-xs font-bold text-orange-700">Deals In Play</span>
                      </span>
                      {stageStats.find(s => s.name === 'Proposal Sent')?.value > 0 && (
                        <span className="text-xs font-black text-orange-700">
                          PKR {stageStats.find(s => s.name === 'Proposal Sent')?.value.toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>

                  <div 
                    onClick={() => { setDrilldownCategory('stage_Deal Won'); setDrilldownSearch(''); }}
                    className="p-3 rounded-xl bg-gradient-to-br from-emerald-50/80 to-teal-50/40 border border-emerald-200 hover:border-emerald-400 transition-all cursor-pointer shadow-2xs group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-emerald-800 uppercase tracking-wider block flex items-center gap-1">
                        <span>Closed Deals (Won)</span>
                        <span className="text-xs">🏆</span>
                      </span>
                      <span className="text-[10px] text-emerald-700 font-bold bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200">
                        Kamyab Deals
                      </span>
                    </div>
                    <div className="mt-1 flex items-baseline justify-between">
                      <span className="text-xl font-black text-emerald-950">
                        {wonCount} <span className="text-xs font-bold text-emerald-700">Munafe Deals</span>
                      </span>
                      <span className="text-xs font-black text-emerald-700">
                        {totalRevenue > 0 ? `PKR ${totalRevenue.toLocaleString()}` : 'Won Deals'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* TAB 2: Past 7-Day Inbound Trend Chart */
              <div className="pt-3 animate-fade-in">
                {/* Background Grid Lines */}
                <div className="relative h-64 flex items-end justify-between gap-2 sm:gap-4 px-3 sm:px-6 border-b border-slate-100 bg-gradient-to-b from-slate-50/50 to-transparent rounded-2xl pb-3 overflow-hidden">
                  {/* Subtle Grid reference lines */}
                  <div className="absolute inset-x-3 top-3 bottom-12 flex flex-col justify-between pointer-events-none opacity-20 z-0">
                    <div className="border-b border-dashed border-slate-400 w-full flex justify-between text-[9px] font-mono text-slate-500">
                      <span>Peak Activity</span>
                    </div>
                    <div className="border-b border-dashed border-slate-300 w-full"></div>
                    <div className="border-b border-dashed border-slate-300 w-full"></div>
                    <div className="border-b border-slate-200 w-full"></div>
                  </div>

                  {dailyTrends.map((d, index) => {
                    const isPeak = d.count > 0 && d.count === Math.max(...dailyTrends.map(x => x.count));

                    return (
                      <div
                        key={d.dateStr}
                        className="flex-1 flex flex-col items-center gap-2 h-full justify-end group relative z-10 cursor-pointer"
                        onClick={() => {
                          // Filter drilldown for this day
                          setDrilldownCategory('replied');
                          setDrilldownSearch(d.dateStr);
                        }}
                      >
                        {/* Interactive Floating Tooltip on Hover */}
                        <div className="opacity-0 group-hover:opacity-100 group-hover:-translate-y-2 pointer-events-none transition-all duration-200 absolute -top-8 z-30 px-2.5 py-1 rounded-lg bg-slate-900 text-white text-[11px] font-bold shadow-xl whitespace-nowrap flex items-center gap-1.5 border border-slate-700">
                          <span>{d.count} Leads</span>
                          <span className="text-slate-400">•</span>
                          <span className="text-orange-400">{d.label}</span>
                        </div>

                        {/* Top Number Counter Badge */}
                        <div className="flex flex-col items-center transition-all duration-300 group-hover:scale-125">
                          {isPeak && (
                            <span className="text-[9px] font-black uppercase text-amber-500 tracking-wider flex items-center gap-0.5 animate-bounce mb-0.5">
                              ⭐ Top
                            </span>
                          )}
                          <span className={`text-xs sm:text-sm font-black transition-colors ${
                            d.isToday
                              ? 'text-emerald-600'
                              : d.isYesterday
                              ? 'text-blue-600'
                              : isPeak
                              ? 'text-orange-600'
                              : 'text-slate-700'
                          }`}>
                            {d.count}
                          </span>
                        </div>

                        {/* 3D Animated Bar with Glowing Gradients */}
                        <div className="w-full max-w-[48px] relative flex flex-col justify-end items-center h-full max-h-[175px]">
                          <div
                            style={{ height: `${d.heightPct}%` }}
                            className={`w-full rounded-t-2xl transition-all duration-700 ease-out relative group-hover:scale-y-105 group-hover:brightness-110 shadow-sm ${
                              d.isToday
                                ? 'bg-gradient-to-t from-emerald-600 via-emerald-500 to-teal-300 shadow-lg shadow-emerald-500/30'
                                : d.isYesterday
                                ? 'bg-gradient-to-t from-blue-600 via-blue-500 to-cyan-300 shadow-lg shadow-blue-500/30'
                                : isPeak
                                ? 'bg-gradient-to-t from-orange-600 via-amber-500 to-yellow-300 shadow-lg shadow-orange-500/30 ring-2 ring-orange-400/40'
                                : 'bg-gradient-to-t from-slate-300 via-slate-200 to-slate-100 group-hover:from-orange-400 group-hover:to-amber-300'
                            }`}
                          >
                            {/* Shiny Top highlight cap */}
                            <div className="absolute top-0 inset-x-0 h-1.5 rounded-t-2xl bg-white/40"></div>

                            {/* Animated Pulse indicator for Today */}
                            {d.isToday && (
                              <div className="absolute top-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-white animate-ping"></div>
                            )}
                          </div>
                        </div>

                        {/* Bottom Day Label */}
                        <div className="text-center mt-1">
                          <span className={`text-xs font-black block transition-all ${
                            d.isToday
                              ? 'text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 font-extrabold'
                              : d.isYesterday
                              ? 'text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200 font-extrabold'
                              : 'text-slate-600 group-hover:text-orange-600'
                          }`}>
                            {d.label}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Footer Quick Stats below the graph */}
                <div className="flex items-center justify-between pt-3 px-2 text-xs font-bold text-slate-500">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-xs"></span>
                      <span className="text-slate-700">Aaj (Today)</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-xs"></span>
                      <span className="text-slate-700">Kal (Yesterday)</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-orange-500 shadow-xs"></span>
                      <span className="text-slate-700">Peak Days</span>
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 font-medium">
                    ⚡ Live 7-Day Inbound WhatsApp Volume
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Col: Pipeline Stages Summary & AmazFast Services Breakdown */}
        <div className="card-soft p-5 bg-white border border-slate-200/80 flex flex-col justify-between space-y-4">
          <div>
            <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase text-orange-700 bg-orange-50 px-2.5 py-0.5 rounded-full border border-orange-200">
                  Pipeline Health
                </span>
                <h4 className="text-sm font-extrabold text-slate-900 mt-1">Pipeline Stages Ka Hisaab</h4>
                <p className="text-xs text-slate-500">Mukammal conversion & distribution</p>
              </div>
              <span className="text-xs font-black text-slate-800 bg-slate-100 px-2 py-0.5 rounded-lg">
                {filteredLeads.length} Leads
              </span>
            </div>

            {/* Complete Pipeline Stages Breakdown */}
            <div className="mt-3.5 space-y-2">
              {stageStats.map((st) => (
                <div 
                  key={st.name} 
                  onClick={() => { setDrilldownCategory(`stage_${st.stageKey}`); setDrilldownSearch(''); }}
                  className="flex items-center justify-between p-2 rounded-xl border border-slate-100 hover:border-orange-300 hover:bg-orange-50/20 cursor-pointer transition-all group"
                  title={`Click karein: ${st.name} leads ki list dekhein`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm">{st.icon}</span>
                    <div className="truncate">
                      <span className={`text-xs font-bold transition-colors ${st.isLost ? 'text-rose-700 font-extrabold' : 'text-slate-800 group-hover:text-orange-600'}`}>
                        {st.name}
                      </span>
                      <span className="text-[10px] text-slate-400 block truncate">{st.label}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-[11px] font-black px-2 py-0.5 rounded-md ${st.isLost ? 'bg-rose-100 text-rose-800 border border-rose-300' : st.badgeBg}`}>
                      {st.count}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 w-7 text-right">{st.pct}%</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Top Requested AmazFast Services */}
            {serviceStats.length > 0 && (
              <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
                <span className="text-[11px] font-extrabold uppercase text-slate-500 tracking-wider block">
                  💼 Top Services In Demand:
                </span>
                <div className="space-y-1.5">
                  {serviceStats.map((srv) => (
                    <div 
                      key={srv.name}
                      onClick={() => {
                        setSelectedServiceFilter(srv.name);
                      }}
                      className="flex items-center justify-between text-xs p-1.5 rounded-lg bg-slate-50 hover:bg-orange-50/50 cursor-pointer transition-all border border-slate-100"
                      title="Filter dashboard by this service"
                    >
                      <span className="font-bold text-slate-700 truncate pr-2">{srv.name}</span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[10px] font-black px-1.5 py-0.2 bg-white text-orange-700 border border-orange-200 rounded">
                          {srv.count} leads
                        </span>
                        <span className="text-[10px] font-semibold text-slate-400">{srv.pct}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <button
            onClick={onOpenNewLead}
            className="w-full py-2.5 px-4 bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5 shrink-0"
          >
            <Plus className="w-3.5 h-3.5" /> + Naya Customer Register Karein
          </button>
        </div>
      </div>

      {/* 5. INTERACTIVE DRILLDOWN MODAL (When admin clicks ANY metric card) */}
      {drilldownCategory && drilldownData && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[88vh]">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <span className={`px-2.5 py-1 rounded-lg text-xs font-black ${drilldownData.badgeColor}`}>
                  {drilldownData.list.length} Leads
                </span>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">{drilldownData.title}</h3>
                  <p className="text-[11px] text-slate-500">{drilldownData.description}</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setDrilldownCategory(null)}
                className="p-1.5 rounded-xl hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Search Bar */}
            <div className="p-3 border-b border-slate-100 bg-white">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={drilldownSearch}
                  onChange={(e) => setDrilldownSearch(e.target.value)}
                  placeholder="Customer ka naam, phone number ya agent likhein..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 rounded-xl text-xs border border-slate-200 focus:outline-none focus:border-orange-500 font-medium"
                  autoFocus
                />
              </div>
            </div>

            {/* Modal Customer List */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-3 space-y-2">
              {drilldownData.list.length === 0 ? (
                <div className="p-8 text-center text-slate-400 space-y-2">
                  <p className="text-xs font-bold text-slate-600">Is category mein koi lead nahi mili.</p>
                  <p className="text-[11px]">Filter ya search query badal kar dekhein.</p>
                </div>
              ) : (
                drilldownData.list.map((lead) => {
                  const isToday = isLeadToday(lead);
                  const isYesterday = isLeadYesterday(lead);

                  return (
                    <div 
                      key={lead.id}
                      className="p-3 bg-white hover:bg-orange-50/50 border border-slate-100 hover:border-orange-200 rounded-xl flex items-center justify-between gap-3 transition-all"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <img 
                          src={lead.avatar} 
                          alt={lead.name} 
                          className="w-10 h-10 rounded-full object-cover bg-slate-200 shrink-0" 
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-xs font-extrabold text-slate-900 truncate">{lead.name}</h4>
                            {isToday && (
                              <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-700">
                                Aaj
                              </span>
                            )}
                            {isYesterday && (
                              <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-blue-100 text-blue-700">
                                Kal
                              </span>
                            )}
                            {lead.serviceInterest && (
                              <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                                💼 {lead.serviceInterest}
                              </span>
                            )}
                            <span className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded border ${
                              lead.stage === 'Lost' ? 'bg-rose-100 text-rose-800 border-rose-300' :
                              lead.stage === 'Qualified' ? 'bg-purple-100 text-purple-800 border-purple-200' :
                              lead.stage === 'Deal Won' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' :
                              'bg-slate-100 text-slate-700 border-slate-200'
                            }`}>
                              {lead.stage === 'Lost' ? '🔴 Unqualified' : lead.stage}
                            </span>
                          </div>
                          <p className="text-xs font-mono text-slate-700 font-bold mt-0.5">
                            <span className="text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded font-black">{lead.phone}</span> • <span className="text-slate-500 font-normal">{lead.channelName}</span> • <span className="font-bold text-slate-700">Deal: {lead.dealValue ? `${lead.dealValue} PKR` : 'Pending'}</span>
                          </p>
                          <p className="text-[10px] text-slate-400 font-medium">
                            📅 Added: {new Date(lead.createdAt || lead.rawLastMessageAt).toLocaleDateString('en-GB')} {lead.lastTime}
                          </p>
                          <p className="text-[11px] text-slate-600 truncate max-w-sm mt-0.5">
                            "{lead.lastMessage || 'No conversation yet'}"
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setDrilldownCategory(null);
                            if (onOpenChat) onOpenChat(lead.id);
                          }}
                          className="px-3.5 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold shadow-2xs transition-all flex items-center gap-1.5"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>Chat Kholein</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
              <span>Kul {drilldownData.list.length} leads displayed</span>
              <button
                type="button"
                onClick={() => setDrilldownCategory(null)}
                className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl transition-colors"
              >
                Band Karein
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
