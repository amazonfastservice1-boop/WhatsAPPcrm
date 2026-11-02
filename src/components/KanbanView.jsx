import React, { useState } from 'react';
import { PIPELINE_STAGES } from '../data/mockData';
import { 
  MoreHorizontal, 
  Plus, 
  ArrowRight, 
  UserCheck, 
  MessageSquare, 
  Calendar as CalendarIcon,
  Filter, 
  Columns3, 
  ListFilter, 
  Search,
  Clock,
  DollarSign,
  TrendingUp,
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import { 
  formatChannelDisplayName, 
  isLeadToday, 
  isLeadYesterday, 
  isLeadWithinDays,
  isLeadOnDate,
  getLeadStats 
} from '../utils/leadFilters';
import { AMAZFAST_SERVICES } from '../data/servicesList';

export default function KanbanView({ 
  leads = [], 
  onUpdateLead, 
  onOpenChat, 
  onOpenNewLead, 
  selectedChannel = 'all',
  setSelectedChannel,
  channels = []
}) {
  const [viewMode, setViewMode] = useState('board'); // 'board' (Kanban) or 'table' (List)
  const [dateFilter, setDateFilter] = useState('today'); // Default: 'today' (Aaj ki leads)
  const [customSelectedDate, setCustomSelectedDate] = useState(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  });
  const [selectedServiceFilter, setSelectedServiceFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Drag and Drop States
  const [draggedLeadId, setDraggedLeadId] = useState(null);
  const [dragOverStageId, setDragOverStageId] = useState(null);

  // Compute stats across all leads
  const stats = React.useMemo(() => getLeadStats(leads, channels), [leads, channels]);

  // Comprehensive Filter: Channel + Date + Search
  const filteredLeads = React.useMemo(() => {
    return leads.filter((l) => {
      // 1. Channel Filter
      if (selectedChannel !== 'all' && l.channel !== selectedChannel) {
        return false;
      }

      // 2. Date Filter
      if (dateFilter === 'today' && !isLeadToday(l)) {
        return false;
      }
      if (dateFilter === 'yesterday' && !isLeadYesterday(l)) {
        return false;
      }
      if (dateFilter === 'custom' && !isLeadOnDate(l, customSelectedDate)) {
        return false;
      }
      if (dateFilter === '7days' && !isLeadWithinDays(l, 7)) {
        return false;
      }
      if (dateFilter === '30days' && !isLeadWithinDays(l, 30)) {
        return false;
      }
      if (dateFilter === '6months' && !isLeadWithinDays(l, 180)) {
        return false;
      }
      if (dateFilter === 'year' && !isLeadWithinDays(l, 365)) {
        return false;
      }

      // 3. Service Filter
      if (selectedServiceFilter !== 'all') {
        const s = l.serviceInterest || '';
        if (!s.toLowerCase().includes(selectedServiceFilter.toLowerCase())) {
          return false;
        }
      }

      // 4. Search Query
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchName = (l.name || '').toLowerCase().includes(q);
        const matchPhone = (l.phone || '').includes(q);
        const matchAgent = (l.assignedTo || '').toLowerCase().includes(q);
        const matchTags = (l.tags || []).some(t => t.toLowerCase().includes(q));
        if (!matchName && !matchPhone && !matchAgent && !matchTags) return false;
      }

      return true;
    });
  }, [leads, selectedChannel, dateFilter, searchQuery]);

  // Drag and Drop Handlers
  const handleDragStart = (e, leadId) => {
    e.dataTransfer.setData('text/plain', leadId);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedLeadId(leadId);
  };

  const handleDragEnd = () => {
    setDraggedLeadId(null);
    setDragOverStageId(null);
  };

  const handleDragOver = (e, stageId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverStageId !== stageId) {
      setDragOverStageId(stageId);
    }
  };

  const handleDragLeave = (e) => {
    if (e.currentTarget.contains(e.relatedTarget)) return;
    setDragOverStageId(null);
  };

  const handleDrop = (e, targetStageId) => {
    e.preventDefault();
    const leadId = e.dataTransfer.getData('text/plain') || draggedLeadId;
    if (leadId) {
      onUpdateLead(leadId, { stage: targetStageId });
    }
    setDraggedLeadId(null);
    setDragOverStageId(null);
  };

  const moveStage = (leadId, newStage) => {
    onUpdateLead(leadId, { stage: newStage });
  };

  // Pipeline total value calculation
  const totalPipelineValue = filteredLeads.reduce((acc, l) => {
    const val = typeof l.dealValue === 'string' ? parseFloat(l.dealValue.replace(/[^0-9.]/g, '')) : Number(l.dealValue);
    return acc + (isNaN(val) ? 0 : val);
  }, 0);

  const wonDealsCount = filteredLeads.filter(l => l.stage === 'Deal Won').length;

  return (
    <div className="p-6 space-y-6 max-w-[1700px] mx-auto animate-fade-in">
      {/* 1. Header Bar: Title, View Switcher & Action */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
              Leads & Sales Deals Pipeline
            </h2>
            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 uppercase tracking-wider">
              Drag & Drop Enabled
            </span>
          </div>
          <p className="text-xs text-slate-600 font-medium mt-0.5">
            Cards ko drag kar ke stages mein move karein. Teen numbers ki leads aur date filters yahan available hain.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* View Mode Toggle: Board vs List */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setViewMode('board')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'board'
                  ? 'bg-white text-orange-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Columns3 className="w-3.5 h-3.5" />
              <span>Kanban Board</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'table'
                  ? 'bg-white text-orange-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ListFilter className="w-3.5 h-3.5" />
              <span>Leads List Table</span>
            </button>
          </div>

          {/* Add Deal Button */}
          <button
            onClick={onOpenNewLead}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 shadow-sm shadow-orange-500/30 transition-all"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>+ Nayi Lead / Deal</span>
          </button>
        </div>
      </div>

      {/* 2. Top Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Card 1: Total Displayed Leads */}
        <div className="card-soft p-4 bg-white border border-slate-200/80">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>Kul Leads (Total)</span>
            <span className="w-2 h-2 rounded-full bg-orange-500"></span>
          </div>
          <h3 className="text-2xl font-black text-slate-900 mt-2">{filteredLeads.length}</h3>
          <p className="text-[11px] text-slate-500 font-semibold mt-0.5">
            Database se active leads
          </p>
        </div>

        {/* Card 2: Today's Leads */}
        <button
          onClick={() => setDateFilter('today')}
          className={`card-soft p-4 text-left transition-all border ${
            dateFilter === 'today' 
              ? 'ring-2 ring-emerald-500 border-emerald-500 bg-emerald-50/40' 
              : 'bg-white border-slate-200/80 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-bold text-emerald-700">
            <span>⚡ Aaj Ki Leads (Today)</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          </div>
          <h3 className="text-2xl font-black text-slate-900 mt-2">{stats.todayCount}</h3>
          <p className="text-[11px] text-emerald-600 font-bold mt-0.5">
            Click karein aaj ki dekhne ke liye
          </p>
        </button>

        {/* Card 3: Yesterday's Leads */}
        <button
          onClick={() => setDateFilter('yesterday')}
          className={`card-soft p-4 text-left transition-all border ${
            dateFilter === 'yesterday' 
              ? 'ring-2 ring-blue-500 border-blue-500 bg-blue-50/40' 
              : 'bg-white border-slate-200/80 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-bold text-blue-700">
            <span>⏪ Kal Ki Leads (Yesterday)</span>
            <Clock className="w-3.5 h-3.5 text-blue-500" />
          </div>
          <h3 className="text-2xl font-black text-slate-900 mt-2">{stats.yesterdayCount}</h3>
          <p className="text-[11px] text-blue-600 font-bold mt-0.5">
            Click karein kal ki dekhne ke liye
          </p>
        </button>

        {/* Card 4: Deals Won Value */}
        <div className="card-soft p-4 bg-white border border-slate-200/80">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>Won Deals / Pipeline</span>
            <TrendingUp className="w-3.5 h-3.5 text-orange-500" />
          </div>
          <h3 className="text-2xl font-black text-slate-900 mt-2">
            {wonDealsCount > 0 ? `${wonDealsCount} Won` : `${totalPipelineValue.toLocaleString()} PKR`}
          </h3>
          <p className="text-[11px] text-orange-600 font-bold mt-0.5">
            Closed Won Sales
          </p>
        </div>
      </div>

      {/* 3. Number Switcher & Date Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
        {/* Row A: WhatsApp Number Channels with live breakdown */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            <span className="font-bold text-slate-500 mr-1 flex items-center gap-1 shrink-0">
              <Filter className="w-3.5 h-3.5" /> WhatsApp Line:
            </span>

            {/* All Numbers Pill */}
            <button
              onClick={() => setSelectedChannel && setSelectedChannel('all')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 ${
                selectedChannel === 'all'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <span>🌐</span>
              <span>Saare Numbers</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                selectedChannel === 'all' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
              }`}>
                {leads.length}
              </span>
            </button>

            {/* Individual Channels */}
            {channels && channels.filter(c => c.id !== 'all').map((ch) => {
              const isSelected = selectedChannel === ch.id;
              const chInfo = stats.byChannel[ch.id] || { total: 0, today: 0, yesterday: 0 };
              const cleanDisplayName = formatChannelDisplayName(ch);

              return (
                <button
                  key={ch.id}
                  onClick={() => setSelectedChannel && setSelectedChannel(ch.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 ${
                    isSelected
                      ? 'bg-orange-500 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                  title={`${cleanDisplayName} (Aaj: ${chInfo.today}, Kal: ${chInfo.yesterday})`}
                >
                  <span>{ch.flag}</span>
                  <span>{cleanDisplayName}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                    isSelected ? 'bg-white/25 text-white' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {chInfo.total}
                  </span>
                  {chInfo.today > 0 && (
                    <span className="text-[9px] bg-emerald-500 text-white px-1 py-0.2 rounded font-extrabold">
                      +{chInfo.today} aaj
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Search Box */}
          <div className="relative min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Lead ka naam ya number search karein..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 text-xs font-semibold text-slate-800 rounded-xl border border-slate-200 focus:outline-none focus:border-orange-500"
            />
          </div>
        </div>

        {/* Row B: Date Range Filter Pills */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-500 flex items-center gap-1">
              <CalendarIcon className="w-3.5 h-3.5" /> Date Filter:
            </span>
            <button
              onClick={() => setDateFilter('all')}
              className={`px-3 py-1 rounded-lg font-bold transition-all ${
                dateFilter === 'all'
                  ? 'bg-orange-100 text-orange-700 border border-orange-200'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              Saari Leads ({leads.length})
            </button>
            <button
              onClick={() => setDateFilter('today')}
              className={`px-3 py-1 rounded-lg font-bold transition-all ${
                dateFilter === 'today'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              📅 Aaj Ki Leads ({stats.todayCount})
            </button>
            <button
              onClick={() => setDateFilter('yesterday')}
              className={`px-3 py-1 rounded-lg font-bold transition-all ${
                dateFilter === 'yesterday'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              ⏪ Kal Ki Leads ({stats.yesterdayCount})
            </button>
            <button
              onClick={() => setDateFilter('7days')}
              className={`px-3 py-1 rounded-lg font-bold transition-all ${
                dateFilter === '7days'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              🗓️ Pichle 7 Din ({stats.last7DaysCount})
            </button>
            <button
              onClick={() => setDateFilter('30days')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                dateFilter === '30days'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              📊 Is Mahine (30 Din)
            </button>
            {/* Custom Specific Date Picker */}
            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
              <input
                type="date"
                value={customSelectedDate}
                onChange={(e) => {
                  setCustomSelectedDate(e.target.value);
                  setDateFilter('custom');
                }}
                className="bg-transparent text-xs font-bold text-slate-800 px-1 focus:outline-none cursor-pointer"
                title="Specific taareekh chunein"
              />
              {dateFilter === 'custom' && (
                <span className="text-[10px] font-black bg-orange-500 text-white px-1.5 py-0.5 rounded">
                  Active
                </span>
              )}
            </div>
          </div>

          {/* Service Dropdown Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-xl">
            <span className="font-bold text-slate-500 text-xs">💼 Service:</span>
            <select
              value={selectedServiceFilter}
              onChange={(e) => setSelectedServiceFilter(e.target.value)}
              className="text-xs font-bold bg-transparent text-slate-800 focus:outline-none cursor-pointer max-w-[170px] truncate"
            >
              <option value="all">🌐 Saari Services</option>
              {AMAZFAST_SERVICES.map(s => (
                <option key={s.id} value={s.shortLabel}>{s.label}</option>
              ))}
            </select>
            {selectedServiceFilter !== 'all' && (
              <button
                onClick={() => setSelectedServiceFilter('all')}
                className="text-[10px] text-orange-600 font-bold hover:underline shrink-0"
              >
                ✕
              </button>
            )}
          </div>

          <div className="text-[11px] font-semibold text-slate-500">
            Natija: <span className="font-bold text-slate-900">{filteredLeads.length}</span> leads matching
          </div>
        </div>
      </div>

      {/* 4. Main View: Board View (Kanban with Drag-and-Drop) */}
      {viewMode === 'board' ? (
        <div className="flex gap-4.5 overflow-x-auto pb-6 min-w-[1100px] select-none">
          {PIPELINE_STAGES.map((stage) => {
            const stageLeads = filteredLeads.filter(l => l.stage === stage.id);
            const isColumnDropTarget = dragOverStageId === stage.id;

            return (
              <div 
                key={stage.id} 
                className="w-72 shrink-0 flex flex-col"
                onDragOver={(e) => handleDragOver(e, stage.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, stage.id)}
              >
                {/* Column Header */}
                <div className={`p-3.5 bg-white border border-[#EEF2F6] rounded-t-2xl flex items-center justify-between border-b-2 transition-colors ${
                  isColumnDropTarget 
                    ? 'border-b-orange-500 bg-orange-50/30' 
                    : stage.id === 'Lost' 
                    ? 'border-b-rose-500' 
                    : 'border-b-orange-500'
                }`}>
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${stage.color}`}></span>
                    <h3 className={`text-xs font-extrabold ${stage.id === 'Lost' ? 'text-rose-700' : 'text-slate-900'}`}>{stage.title}</h3>
                  </div>
                  <span className={`text-xs font-extrabold px-2 py-0.5 rounded-full ${stage.id === 'Lost' ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-700'}`}>
                    {stageLeads.length}
                  </span>
                </div>

                {/* Column Body / Drop Container */}
                <div className={`flex-1 p-2.5 border-x border-b border-[#EEF2F6] rounded-b-2xl space-y-3 min-h-[520px] transition-all ${
                  isColumnDropTarget 
                    ? 'bg-orange-50/60 border-dashed border-2 border-orange-400 ring-2 ring-orange-200' 
                    : 'bg-slate-50/70'
                }`}>
                  {/* Drop Placeholder if hovered */}
                  {isColumnDropTarget && (
                    <div className="p-3 rounded-xl border-2 border-dashed border-orange-400 bg-orange-100/40 text-center text-xs font-bold text-orange-700 animate-pulse">
                      Yahan Drop Karein to "{stage.title}" me move ho jaye gi
                    </div>
                  )}

                  {stageLeads.length === 0 && !isColumnDropTarget ? (
                    <div className="p-8 text-center text-xs text-slate-400 font-medium">
                      Is stage mein koi lead nahi
                    </div>
                  ) : (
                    stageLeads.map((lead) => {
                      const isBeingDragged = draggedLeadId === lead.id;
                      const isToday = isLeadToday(lead);

                      return (
                        <div 
                          key={lead.id}
                          draggable={true}
                          onDragStart={(e) => handleDragStart(e, lead.id)}
                          onDragEnd={handleDragEnd}
                          className={`card-soft p-4 bg-white border border-slate-200/90 hover:border-orange-300 hover:shadow-card-hover transition-all cursor-grab active:cursor-grabbing group relative ${
                            isBeingDragged ? 'opacity-40 ring-2 ring-orange-500 scale-95' : ''
                          }`}
                        >
                          {/* Channel Badge & Time */}
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 flex items-center gap-1">
                              <span>{lead.flag}</span>
                              <span className="truncate max-w-[120px]">{lead.channelName || 'WhatsApp'}</span>
                            </span>
                            <div className="flex items-center gap-1">
                              {isToday && (
                                <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-700">
                                  Aaj
                                </span>
                              )}
                              <span className="text-[10px] text-slate-500 font-semibold">{lead.lastTime}</span>
                            </div>
                          </div>

                          {/* Lead Name & Phone (Clickable to open chat directly) */}
                          <div 
                            onClick={() => onOpenChat && onOpenChat(lead.id)}
                            className="cursor-pointer group/title"
                          >
                            <div className="flex items-center justify-between">
                              <h4 className="text-sm font-extrabold text-slate-900 group-hover/title:text-orange-600 transition-colors">
                                {lead.name}
                              </h4>
                              <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover/title:text-orange-600 group-hover/title:translate-x-0.5 transition-all shrink-0" />
                            </div>
                            <p className="text-xs font-mono text-slate-500 mt-0.5">{lead.phone}</p>
                          </div>

                          {/* Deal Value */}
                          <div className="mt-2.5 py-1 px-2 rounded-lg bg-orange-50/70 border border-orange-100 flex items-center justify-between text-xs font-bold text-orange-950">
                            <span>Deal:</span>
                            <span className="text-orange-600 font-extrabold">
                              {lead.dealValue ? `${lead.dealValue} ${lead.currency}` : 'Pending'}
                            </span>
                          </div>

                          {/* AmazFast Service Selector Dropdown */}
                          <div className="mt-2.5" onClick={(e) => e.stopPropagation()}>
                            <select
                              value={lead.serviceInterest || ''}
                              onChange={(e) => onUpdateLead(lead.id, { serviceInterest: e.target.value })}
                              className="w-full text-[11px] font-extrabold px-2 py-1 rounded-lg border border-slate-200 bg-slate-50 text-slate-800 focus:outline-none focus:border-orange-500 cursor-pointer shadow-2xs"
                              title="Customer kis service mein interested hai"
                            >
                              <option value="">💼 Select Service</option>
                              {AMAZFAST_SERVICES.map(s => (
                                <option key={s.id} value={s.shortLabel}>{s.label}</option>
                              ))}
                            </select>
                          </div>

                          {/* Tags */}
                          {lead.tags && lead.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {lead.tags.slice(0, 2).map((t) => (
                                <span key={t} className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                                  {t}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Direct Chat Buttons */}
                          <div className="flex items-center gap-1.5 mt-2.5">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (onOpenChat) onOpenChat(lead.id);
                              }}
                              className="flex-1 py-1.5 px-2 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 hover:from-emerald-600 hover:to-teal-600 text-emerald-800 hover:text-white border border-emerald-200 hover:border-emerald-600 text-xs font-bold flex items-center justify-center gap-1 shadow-2xs transition-all duration-150"
                              title={`Open WhatsApp chat with ${lead.name}`}
                            >
                              <MessageSquare className="w-3.5 h-3.5 text-emerald-600 group-hover:text-white" />
                              <span>CRM Chat</span>
                            </button>

                            <a
                              href={`https://wa.me/${(lead.phone || '').replace(/[^0-9]/g, '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="py-1.5 px-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1 shadow-2xs transition-all duration-150 shrink-0"
                              title="Direct WhatsApp Web par free chat kholein"
                            >
                              <span>Free WA</span>
                            </a>
                          </div>

                          {/* Footer: Assigned Agent & Action */}
                          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
                            <div className="flex items-center gap-1 text-[11px] text-slate-500 font-semibold truncate max-w-[100px]">
                              <UserCheck className="w-3 h-3 text-slate-400 shrink-0" />
                              <span className="truncate">{lead.assignedTo}</span>
                            </div>

                            <div className="flex items-center gap-1">
                              {/* Dropdown Mover as accessible alternative */}
                              <select
                                value={lead.stage}
                                onChange={(e) => moveStage(lead.id, e.target.value)}
                                className="text-[10px] font-bold bg-slate-100 hover:bg-slate-200 border-none rounded-lg p-1 text-slate-700 cursor-pointer"
                                title="Stage badlein"
                              >
                                {PIPELINE_STAGES.map(s => (
                                  <option key={s.id} value={s.id}>{s.id}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* 5. Alternative View: Leads Table / List View */
        <div className="card-soft bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-extrabold uppercase tracking-wider">
                  <th className="py-3 px-4">Customer Name & Phone</th>
                  <th className="py-3 px-4">WhatsApp Line / Number</th>
                  <th className="py-3 px-4">Stage</th>
                  <th className="py-3 px-4">Deal Value</th>
                  <th className="py-3 px-4">Assigned Agent</th>
                  <th className="py-3 px-4">Last Message / Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLeads.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400 font-semibold">
                      Is filter ke mutabiq koi lead nahi mili.
                    </td>
                  </tr>
                ) : (
                  filteredLeads.map((lead) => {
                    const isToday = isLeadToday(lead);
                    const isYesterday = isLeadYesterday(lead);

                    return (
                      <tr key={lead.id} className="hover:bg-orange-50/30 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <img
                              src={lead.avatar}
                              alt={lead.name}
                              className="w-8 h-8 rounded-full bg-slate-200 object-cover"
                            />
                            <div>
                              <h4 className="font-extrabold text-slate-900">{lead.name}</h4>
                              <p className="font-mono text-slate-500 font-semibold">{lead.phone}</p>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <span className="font-bold text-slate-700 flex items-center gap-1.5">
                            <span>{lead.flag}</span>
                            <span>{lead.channelName}</span>
                          </span>
                        </td>

                        <td className="py-3 px-4">
                          <select
                            value={lead.stage}
                            onChange={(e) => moveStage(lead.id, e.target.value)}
                            className="text-xs font-bold bg-slate-100 border border-slate-200 rounded-lg px-2 py-1 text-slate-800 cursor-pointer"
                          >
                            {PIPELINE_STAGES.map(s => (
                              <option key={s.id} value={s.id}>{s.id}</option>
                            ))}
                          </select>
                        </td>

                        <td className="py-3 px-4 font-extrabold text-orange-600">
                          {lead.dealValue ? `${lead.dealValue} ${lead.currency}` : 'Pending Quote'}
                        </td>

                        <td className="py-3 px-4 font-semibold text-slate-700">
                          {lead.assignedTo}
                        </td>

                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5">
                            {isToday ? (
                              <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-700">
                                Aaj
                              </span>
                            ) : isYesterday ? (
                              <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded bg-blue-100 text-blue-700">
                                Kal
                              </span>
                            ) : null}
                            <span className="text-slate-500 font-medium">{lead.lastTime}</span>
                          </div>
                          <p className="text-slate-400 truncate max-w-[200px] mt-0.5">{lead.lastMessage}</p>
                        </td>

                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => onOpenChat && onOpenChat(lead.id)}
                            className="px-3 py-1.5 rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-700 font-bold text-xs transition-colors inline-flex items-center gap-1"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>Chat</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
