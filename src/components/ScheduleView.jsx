import React, { useState, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  Plus, 
  Search, 
  CheckCircle2, 
  Circle, 
  Trash2, 
  MessageSquare, 
  Phone, 
  AlertCircle, 
  UserCheck, 
  Filter,
  Check,
  X,
  Send,
  Zap,
  Loader2,
  Edit2
} from 'lucide-react';
import { formatChannelDisplayName } from '../utils/leadFilters';
import { api } from '../services/api';

function formatTo12Hour(timeStr) {
  if (!timeStr) return '';
  if (/am|pm/i.test(timeStr)) return timeStr;
  const parts = timeStr.split(':');
  if (parts.length < 2) return timeStr;
  let hours = parseInt(parts[0], 10);
  const minutes = parts[1];
  if (isNaN(hours)) return timeStr;
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  return `${hours.toString().padStart(2, '0')}:${minutes} ${ampm}`;
}

export default function ScheduleView({ 
  leads = [], 
  channels = [], 
  selectedChannel = 'all', 
  setSelectedChannel, 
  onOpenChat 
}) {
  const [filterType, setFilterType] = useState('all'); // all, pending, today, upcoming, overdue, completed
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingReminderId, setEditingReminderId] = useState(null);

  // Form State for new / edit Reminder
  const [selectedLeadId, setSelectedLeadId] = useState('');
  const [reminderTitle, setReminderTitle] = useState('');
  const [reminderDate, setReminderDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [remHour, setRemHour] = useState('11');
  const [remMinute, setRemMinute] = useState('00');
  const [remAmPm, setRemAmPm] = useState('AM');
  const [priority, setPriority] = useState('MEDIUM'); // HIGH, MEDIUM, LOW
  const [assignedAgent, setAssignedAgent] = useState('Ali Husni');
  const [reminderNotes, setReminderNotes] = useState('');
  const [remAutoSend, setRemAutoSend] = useState(true);

  // Reminders list persisted in localStorage
  const [reminders, setReminders] = useState(() => {
    try {
      const saved = localStorage.getItem('crm_schedule_reminders');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed to load reminders:', e);
    }
    return [];
  });

  // Save to localStorage whenever reminders change
  useEffect(() => {
    try {
      localStorage.setItem('crm_schedule_reminders', JSON.stringify(reminders));
    } catch (e) {
      console.warn('Failed to persist reminders:', e);
    }
  }, [reminders]);

  // Real-time synchronization across tabs and with LiveChatView
  useEffect(() => {
    const handleSync = () => {
      try {
        const saved = localStorage.getItem('crm_schedule_reminders');
        if (saved) {
          setReminders(JSON.parse(saved));
        }
      } catch (e) {}
    };

    window.addEventListener('crm_reminders_updated', handleSync);
    window.addEventListener('storage', handleSync);
    return () => {
      window.removeEventListener('crm_reminders_updated', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, []);

  // Seed default follow-ups from real leads if reminders list is empty
  useEffect(() => {
    if (reminders.length === 0 && leads.length > 0) {
      const todayStr = new Date().toISOString().slice(0, 10);
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().slice(0, 10);

      const sampleFollowUps = leads.slice(0, 4).map((l, idx) => ({
        id: `rem-${Date.now()}-${idx}`,
        leadId: l.id,
        leadName: l.name || l.phone,
        leadPhone: l.phone,
        channelId: l.channel,
        title: idx === 0 
          ? 'Quotation & Pricing Follow-up' 
          : idx === 1 
          ? 'WhatsApp Order Confirmation Call' 
          : idx === 2 
          ? 'Catalog & Samples Share' 
          : 'Customer Feedback & Review',
        date: idx < 2 ? todayStr : tomorrowStr,
        time: idx === 0 ? '11:30 AM' : idx === 1 ? '02:00 PM' : idx === 2 ? '04:30 PM' : '06:00 PM',
        priority: idx === 0 ? 'HIGH' : idx === 1 ? 'HIGH' : 'MEDIUM',
        assignedTo: l.assignedTo || 'Ali Husni',
        notes: 'Follow-up on WhatsApp discussion regarding pricing and package details.',
        customMessage: 'Follow-up on WhatsApp discussion regarding pricing and package details.',
        autoSend: true,
        completed: false,
        reminderSent: false,
        createdAt: new Date().toISOString()
      }));

      setReminders(sampleFollowUps);
    }
  }, [leads]);

  // Open modal for a new reminder
  const handleOpenNewReminderModal = () => {
    setEditingReminderId(null);
    setSelectedLeadId('');
    setReminderTitle('');
    setReminderDate(new Date().toISOString().slice(0, 10));
    setRemHour('11');
    setRemMinute('00');
    setRemAmPm('AM');
    setPriority('MEDIUM');
    setAssignedAgent('Ali Husni');
    setReminderNotes('');
    setRemAutoSend(true);
    setIsModalOpen(true);
  };

  // Open modal for editing existing reminder
  const handleStartEditReminder = (rem) => {
    setEditingReminderId(rem.id);
    setSelectedLeadId(rem.leadId || '');
    setReminderTitle(rem.title || '');
    setReminderDate(rem.date || new Date().toISOString().slice(0, 10));

    // Parse time into 12-hour values
    let h = '11', m = '00', ap = 'AM';
    if (rem.time) {
      if (/am|pm/i.test(rem.time)) {
        const match = rem.time.match(/(\d+):(\d+)\s*(AM|PM)/i);
        if (match) {
          h = match[1].padStart(2, '0');
          m = match[2];
          ap = match[3].toUpperCase();
        }
      } else {
        const parts = rem.time.split(':');
        if (parts.length >= 2) {
          let hours = parseInt(parts[0], 10);
          m = parts[1].padStart(2, '0').slice(0, 2);
          ap = hours >= 12 ? 'PM' : 'AM';
          hours = hours % 12 || 12;
          h = hours.toString().padStart(2, '0');
        }
      }
    }
    setRemHour(h);
    setRemMinute(m);
    setRemAmPm(ap);
    setPriority(rem.priority || 'MEDIUM');
    setAssignedAgent(rem.assignedTo || 'Ali Husni');
    setReminderNotes(rem.notes || rem.customMessage || '');
    setRemAutoSend(rem.autoSend !== false);
    setIsModalOpen(true);
  };

  // Handle saving reminder (add or update)
  const handleSaveReminder = (e) => {
    e.preventDefault();
    const matchedLead = leads.find(l => l.id === selectedLeadId);
    const formattedTime = `${remHour.padStart(2, '0')}:${remMinute.padStart(2, '0')} ${remAmPm}`;

    if (editingReminderId) {
      setReminders(prev => {
        const updated = prev.map(r => {
          if (r.id === editingReminderId) {
            return {
              ...r,
              leadId: selectedLeadId || r.leadId,
              leadName: matchedLead ? matchedLead.name : (r.leadName || 'Direct Customer'),
              leadPhone: matchedLead ? matchedLead.phone : (r.leadPhone || ''),
              channelId: matchedLead ? matchedLead.channel : (r.channelId || ''),
              title: reminderTitle || 'Customer Follow-up Call',
              date: reminderDate,
              time: formattedTime,
              priority,
              assignedTo: assignedAgent,
              notes: reminderNotes,
              customMessage: reminderNotes,
              autoSend: remAutoSend,
              updatedAt: new Date().toISOString()
            };
          }
          return r;
        });
        try {
          localStorage.setItem('crm_schedule_reminders', JSON.stringify(updated));
        } catch (err) {}
        return updated;
      });
    } else {
      const newRem = {
        id: `rem-${Date.now()}`,
        leadId: selectedLeadId || null,
        leadName: matchedLead ? matchedLead.name : 'Direct Customer',
        leadPhone: matchedLead ? matchedLead.phone : '',
        channelId: matchedLead ? matchedLead.channel : (selectedChannel !== 'all' ? selectedChannel : channels[1]?.id || ''),
        title: reminderTitle || 'Customer Follow-up Call',
        date: reminderDate,
        time: formattedTime,
        priority,
        assignedTo: assignedAgent,
        notes: reminderNotes,
        customMessage: reminderNotes,
        autoSend: remAutoSend,
        completed: false,
        reminderSent: false,
        createdAt: new Date().toISOString()
      };
      setReminders(prev => {
        const updated = [newRem, ...prev];
        try {
          localStorage.setItem('crm_schedule_reminders', JSON.stringify(updated));
        } catch (err) {}
        return updated;
      });
    }

    setIsModalOpen(false);
    setEditingReminderId(null);
    setReminderTitle('');
    setReminderNotes('');
    window.dispatchEvent(new Event('crm_reminders_updated'));
  };

  // Toggle completed status (auto moves between pending and completed)
  const toggleReminder = (id) => {
    setReminders(prev => {
      const updated = prev.map(r => r.id === id ? { ...r, completed: !r.completed } : r);
      try {
        localStorage.setItem('crm_schedule_reminders', JSON.stringify(updated));
      } catch (err) {}
      return updated;
    });
    window.dispatchEvent(new Event('crm_reminders_updated'));
  };

  // Delete reminder
  const deleteReminder = (id) => {
    setReminders(prev => {
      const updated = prev.filter(r => r.id !== id);
      try {
        localStorage.setItem('crm_schedule_reminders', JSON.stringify(updated));
      } catch (err) {}
      return updated;
    });
    window.dispatchEvent(new Event('crm_reminders_updated'));
  };

  const todayStr = new Date().toISOString().slice(0, 10);

  // Filter reminders (Pending, Today, Upcoming, Overdue, Completed)
  const filteredReminders = reminders.filter(r => {
    // Channel filter
    if (selectedChannel !== 'all' && r.channelId && r.channelId !== selectedChannel) {
      return false;
    }
    // Type filter
    if (filterType === 'pending') {
      if (r.completed) return false;
    } else if (filterType === 'today') {
      if (r.date !== todayStr || r.completed) return false;
    } else if (filterType === 'upcoming') {
      if (r.date <= todayStr || r.completed) return false;
    } else if (filterType === 'overdue') {
      if (r.date >= todayStr || r.completed) return false;
    } else if (filterType === 'completed') {
      if (!r.completed) return false;
    }
    // Search query
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchName = (r.leadName || '').toLowerCase().includes(q);
      const matchPhone = (r.leadPhone || '').includes(q);
      const matchTitle = (r.title || '').toLowerCase().includes(q);
      if (!matchName && !matchPhone && !matchTitle) return false;
    }
    return true;
  });

  // Reminder stats
  const totalCount = reminders.length;
  const pendingCount = reminders.filter(r => !r.completed).length;
  const todayCount = reminders.filter(r => r.date === todayStr && !r.completed).length;
  const upcomingCount = reminders.filter(r => r.date > todayStr && !r.completed).length;
  const overdueCount = reminders.filter(r => r.date < todayStr && !r.completed).length;
  const completedCount = reminders.filter(r => r.completed).length;

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center font-bold">
              <CalendarIcon className="w-4 h-4" />
            </div>
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
              Customer Follow-up Calendar & Reminders
            </h2>
          </div>
          <p className="text-xs text-slate-600 font-medium mt-1">
            WhatsApp leads ke follow-up calls, demo meetings aur customer callbacks schedule aur manage karein.
          </p>
        </div>

        <button
          onClick={handleOpenNewReminderModal}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 shadow-sm shadow-orange-500/30 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>+ Naya Reminder / Schedule Add Karein</span>
        </button>
      </div>

      {/* Number Filter Selector */}
      {channels && channels.length > 0 && (
        <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            <span className="text-xs font-bold text-slate-500 mr-2 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" /> WhatsApp Line:
            </span>
            {channels.map((ch) => {
              const isSelected = selectedChannel === ch.id;
              const chLabel = formatChannelDisplayName(ch);
              const countForCh = ch.id === 'all' 
                ? reminders.length 
                : reminders.filter(r => r.channelId === ch.id).length;

              return (
                <button
                  key={ch.id}
                  onClick={() => setSelectedChannel && setSelectedChannel(ch.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 ${
                    isSelected
                      ? 'bg-orange-500 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <span>{ch.flag}</span>
                  <span>{chLabel}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${isSelected ? 'bg-white/25 text-white' : 'bg-slate-200 text-slate-700'}`}>
                    {countForCh}
                  </span>
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
              placeholder="Reminder ya customer dhoondein..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 text-xs font-semibold text-slate-800 rounded-xl border border-slate-200 focus:outline-none focus:border-orange-500"
            />
          </div>
        </div>
      )}

      {/* 5 Summary Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
        <button
          onClick={() => setFilterType('pending')}
          className={`card-soft p-4 text-left transition-all border ${
            filterType === 'pending' ? 'ring-2 ring-orange-500 border-orange-500 bg-orange-50/40' : 'bg-white border-slate-200/80 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-orange-700">Pending Follow-ups</span>
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-pulse"></span>
          </div>
          <h3 className="text-2xl font-black text-slate-900 mt-2">{pendingCount}</h3>
          <p className="text-[11px] text-slate-500 mt-0.5">Kul Pending Tasks</p>
        </button>

        <button
          onClick={() => setFilterType('today')}
          className={`card-soft p-4 text-left transition-all border ${
            filterType === 'today' ? 'ring-2 ring-amber-500 border-amber-500 bg-amber-50/30' : 'bg-white border-slate-200/80 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-700">Aaj Ke Follow-ups</span>
            <Clock className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <h3 className="text-2xl font-black text-slate-900 mt-2">{todayCount}</h3>
          <p className="text-[11px] text-slate-500 mt-0.5">Today's Scheduled</p>
        </button>

        <button
          onClick={() => setFilterType('upcoming')}
          className={`card-soft p-4 text-left transition-all border ${
            filterType === 'upcoming' ? 'ring-2 ring-blue-500 border-blue-500 bg-blue-50/30' : 'bg-white border-slate-200/80 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-700">Aane Wale (Upcoming)</span>
            <CalendarIcon className="w-3.5 h-3.5 text-blue-500" />
          </div>
          <h3 className="text-2xl font-black text-slate-900 mt-2">{upcomingCount}</h3>
          <p className="text-[11px] text-slate-500 mt-0.5">Next Days Scheduled</p>
        </button>

        <button
          onClick={() => setFilterType('overdue')}
          className={`card-soft p-4 text-left transition-all border ${
            filterType === 'overdue' ? 'ring-2 ring-rose-500 border-rose-500 bg-rose-50/30' : 'bg-white border-slate-200/80 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-700">Baqaya (Overdue)</span>
            <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
          </div>
          <h3 className="text-2xl font-black text-slate-900 mt-2">{overdueCount}</h3>
          <p className="text-[11px] text-slate-500 mt-0.5">Pending Past Due</p>
        </button>

        <button
          onClick={() => setFilterType('completed')}
          className={`card-soft p-4 text-left transition-all border ${
            filterType === 'completed' ? 'ring-2 ring-emerald-500 border-emerald-500 bg-emerald-50/30' : 'bg-white border-slate-200/80 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-700">Mukammal (Completed)</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
          </div>
          <h3 className="text-2xl font-black text-slate-900 mt-2">{completedCount}</h3>
          <p className="text-[11px] text-slate-500 mt-0.5">Successfully Done</p>
        </button>
      </div>

      {/* Filter Tabs Bar */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 text-xs font-bold text-slate-600 overflow-x-auto">
        <button
          onClick={() => setFilterType('all')}
          className={`px-3 py-1.5 rounded-lg transition-all shrink-0 ${
            filterType === 'all' ? 'bg-slate-900 text-white' : 'hover:bg-slate-100 text-slate-700'
          }`}
        >
          Saare ({totalCount})
        </button>
        <button
          onClick={() => setFilterType('pending')}
          className={`px-3 py-1.5 rounded-lg transition-all shrink-0 flex items-center gap-1.5 ${
            filterType === 'pending' ? 'bg-orange-500 text-white font-extrabold shadow-2xs' : 'hover:bg-orange-50 text-orange-700'
          }`}
        >
          <span>⏳ Pending ({pendingCount})</span>
        </button>
        <button
          onClick={() => setFilterType('today')}
          className={`px-3 py-1.5 rounded-lg transition-all shrink-0 ${
            filterType === 'today' ? 'bg-amber-500 text-white' : 'hover:bg-slate-100 text-slate-700'
          }`}
        >
          Aaj Ke ({todayCount})
        </button>
        <button
          onClick={() => setFilterType('upcoming')}
          className={`px-3 py-1.5 rounded-lg transition-all shrink-0 ${
            filterType === 'upcoming' ? 'bg-blue-600 text-white' : 'hover:bg-slate-100 text-slate-700'
          }`}
        >
          Aane Wale ({upcomingCount})
        </button>
        <button
          onClick={() => setFilterType('overdue')}
          className={`px-3 py-1.5 rounded-lg transition-all shrink-0 ${
            filterType === 'overdue' ? 'bg-rose-600 text-white' : 'hover:bg-slate-100 text-slate-700'
          }`}
        >
          Baqaya Overdue ({overdueCount})
        </button>
        <button
          onClick={() => setFilterType('completed')}
          className={`px-3 py-1.5 rounded-lg transition-all shrink-0 ${
            filterType === 'completed' ? 'bg-emerald-600 text-white' : 'hover:bg-slate-100 text-slate-700'
          }`}
        >
          Completed ({completedCount})
        </button>
      </div>

      {/* Reminders List */}
      <div className="space-y-3">
        {filteredReminders.length === 0 ? (
          <div className="card-soft p-12 bg-white text-center text-slate-500 space-y-3 border border-dashed border-slate-300">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <CalendarIcon className="w-6 h-6" />
            </div>
            <h3 className="text-base font-extrabold text-slate-800">Koi Reminder / Follow-up Nahi Mila</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Is filter ke mutabiq koi follow-up task schedule nahi hai. Aap "+ Naya Reminder Add Karein" button se customer callback schedule kar sakte hain.
            </p>
            <button
              onClick={handleOpenNewReminderModal}
              className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold shadow-sm cursor-pointer"
            >
              + Pehla Reminder Schedule Karein
            </button>
          </div>
        ) : (
          filteredReminders.map((rem) => {
            const isToday = rem.date === todayStr;
            const isOverdue = rem.date < todayStr && !rem.completed;

            return (
              <div
                key={rem.id}
                className={`card-soft p-4 bg-white border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 group ${
                  rem.completed 
                    ? 'opacity-60 bg-slate-50/80 border-slate-200' 
                    : isOverdue 
                    ? 'border-rose-300 bg-rose-50/20 shadow-xs' 
                    : isToday 
                    ? 'border-orange-300 bg-orange-50/20 shadow-xs' 
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                {/* Left: Status Toggle + Customer Details */}
                <div className="flex items-start gap-3.5 min-w-0">
                  <button
                    onClick={() => toggleReminder(rem.id)}
                    className="mt-0.5 text-slate-400 hover:text-emerald-600 transition-colors cursor-pointer"
                    title={rem.completed ? 'Wapis Pending Karein' : 'Mukammal Mark Karein'}
                  >
                    {rem.completed ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 fill-emerald-100" />
                    ) : (
                      <Circle className="w-5 h-5 hover:stroke-orange-500" />
                    )}
                  </button>

                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className={`text-sm font-extrabold ${rem.completed ? 'line-through text-slate-500' : 'text-slate-900'}`}>
                        {rem.title}
                      </h4>
                      {/* Priority Tag */}
                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                        rem.priority === 'HIGH' 
                          ? 'bg-rose-100 text-rose-700' 
                          : rem.priority === 'LOW' 
                          ? 'bg-slate-100 text-slate-600' 
                          : 'bg-amber-100 text-amber-700'
                      }`}>
                        {rem.priority}
                      </span>
                      {rem.autoSend !== false && !rem.completed && (
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 flex items-center gap-1 border border-blue-200">
                          <Zap className="w-3 h-3 fill-blue-600" /> Auto WhatsApp
                        </span>
                      )}
                      {isToday && !rem.completed && (
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 animate-pulse">
                          Aaj Ka Task
                        </span>
                      )}
                      {isOverdue && (
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700">
                          Overdue Baqaya
                        </span>
                      )}
                      {rem.completed && (
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                          ✓ Mukammal Done
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
                      <span className="font-bold text-slate-800">
                        👤 {rem.leadName}
                      </span>
                      {rem.leadPhone && (
                        <span className="font-mono text-slate-500 font-semibold">
                          📞 {rem.leadPhone}
                        </span>
                      )}
                      <span className="flex items-center gap-1 font-semibold text-slate-600 font-mono">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>{rem.date} @ {formatTo12Hour(rem.time)}</span>
                      </span>
                      <span className="flex items-center gap-1 font-semibold text-slate-500">
                        <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                        <span>{rem.assignedTo}</span>
                      </span>
                    </div>

                    {rem.notes && (
                      <p className="text-xs text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100 font-medium">
                        💬 {rem.notes}
                      </p>
                    )}
                  </div>
                </div>

                {/* Right: Quick Action Buttons */}
                <div className="flex items-center gap-2 shrink-0 border-t md:border-t-0 pt-2 md:pt-0">
                  {rem.leadId && onOpenChat && (
                    <button
                      onClick={() => onOpenChat(rem.leadId)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-700 font-bold text-xs transition-colors cursor-pointer"
                      title="Open WhatsApp Chat"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Chat Kholein</span>
                    </button>
                  )}

                  {rem.leadPhone && (
                    <a
                      href={`https://wa.me/${rem.leadPhone.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs transition-colors"
                      title="WhatsApp Message on Web"
                    >
                      <Phone className="w-3.5 h-3.5" />
                    </a>
                  )}

                  {/* Edit Button */}
                  <button
                    onClick={() => handleStartEditReminder(rem)}
                    className="p-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold text-xs transition-colors cursor-pointer"
                    title="Reminder Details Edit Karein"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => toggleReminder(rem.id)}
                    className={`p-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                      rem.completed ? 'bg-slate-100 text-slate-600 hover:bg-slate-200' : 'bg-emerald-500 hover:bg-emerald-600 text-white'
                    }`}
                    title={rem.completed ? 'Undo Completion' : 'Mark Done'}
                  >
                    <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                  </button>

                  <button
                    onClick={() => deleteReminder(rem.id)}
                    className="p-2 rounded-xl hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                    title="Delete Reminder"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal: Add or Edit Reminder */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-extrabold text-slate-900">
                {editingReminderId ? '✏️ Reminder / Schedule Edit Karein' : '+ Naya Follow-up / Callback Schedule Karein'}
              </h3>
              <button
                onClick={() => { setIsModalOpen(false); setEditingReminderId(null); }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveReminder} className="space-y-3.5 text-xs">
              {/* Select Lead */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Customer / WhatsApp Lead
                </label>
                <select
                  value={selectedLeadId}
                  onChange={(e) => setSelectedLeadId(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:outline-none focus:border-orange-500"
                >
                  <option value="">-- Customer Chunein (Direct Callback) --</option>
                  {leads.map(l => (
                    <option key={l.id} value={l.id}>
                      {l.name} ({l.phone}) - {l.stage}
                    </option>
                  ))}
                </select>
              </div>

              {/* Title / Topic */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Reminder Title / Mauzoo
                </label>
                <input
                  type="text"
                  required
                  value={reminderTitle}
                  onChange={(e) => setReminderTitle(e.target.value)}
                  placeholder="e.g. Rate quotation discuss krna hai, Demo call"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:outline-none focus:border-orange-500"
                />
              </div>

              {/* Date & 12-Hour Time AM/PM Picker */}
              <div className="space-y-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Date (Tareekh)</label>
                  <input
                    type="date"
                    required
                    value={reminderDate}
                    onChange={(e) => setReminderDate(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Time (12-Hour AM/PM)</label>
                  <div className="flex items-center gap-1.5">
                    {/* Hour (1-12) */}
                    <select
                      value={remHour}
                      onChange={(e) => setRemHour(e.target.value)}
                      className="flex-1 p-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-none focus:border-orange-500"
                    >
                      {['01','02','03','04','05','06','07','08','09','10','11','12'].map(h => (
                        <option key={h} value={h}>{h} baje</option>
                      ))}
                    </select>

                    <span className="font-bold text-slate-400">:</span>

                    {/* Minute (00-55) */}
                    <select
                      value={remMinute}
                      onChange={(e) => setRemMinute(e.target.value)}
                      className="flex-1 p-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-none focus:border-orange-500"
                    >
                      {['00','05','10','15','20','25','30','35','40','45','50','55'].map(m => (
                        <option key={m} value={m}>{m} min</option>
                      ))}
                    </select>

                    {/* AM / PM Pills */}
                    <div className="flex rounded-xl border border-slate-200 p-0.5 bg-slate-100 shrink-0">
                      <button
                        type="button"
                        onClick={() => setRemAmPm('AM')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                          remAmPm === 'AM' ? 'bg-orange-500 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        AM
                      </button>
                      <button
                        type="button"
                        onClick={() => setRemAmPm('PM')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                          remAmPm === 'PM' ? 'bg-orange-500 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        PM
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Priority & Agent */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:outline-none focus:border-orange-500"
                  >
                    <option value="HIGH">High (Zaroori)</option>
                    <option value="MEDIUM">Medium (Normal)</option>
                    <option value="LOW">Low (Aam)</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Assigned Agent</label>
                  <select
                    value={assignedAgent}
                    onChange={(e) => setAssignedAgent(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:outline-none focus:border-orange-500"
                  >
                    <option value="Ali Husni">Ali Husni</option>
                    <option value="Hamza Tariq">Hamza Tariq</option>
                    <option value="Sara Al-Mansoor">Sara Al-Mansoor</option>
                    <option value="Bilal Khan">Bilal Khan</option>
                  </select>
                </div>
              </div>

              {/* Auto-send toggle */}
              <label className="flex items-center gap-2 cursor-pointer select-none bg-orange-50 p-2.5 rounded-xl border border-orange-200">
                <input
                  type="checkbox"
                  checked={remAutoSend}
                  onChange={(e) => setRemAutoSend(e.target.checked)}
                  className="w-4 h-4 accent-orange-600 rounded cursor-pointer"
                />
                <span className="text-xs font-bold text-orange-950">
                  ⚡ Muqarrar waqt par automatically WhatsApp bhejein
                </span>
              </label>

              {/* Notes / WhatsApp Message */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Message / Follow-up Notes
                </label>
                <textarea
                  rows={2}
                  value={reminderNotes}
                  onChange={(e) => setReminderNotes(e.target.value)}
                  placeholder="Customer ko jo WhatsApp message ya call par baat karni hai..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:outline-none focus:border-orange-500 resize-none"
                ></textarea>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => { setIsModalOpen(false); setEditingReminderId(null); }}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold shadow-sm cursor-pointer"
                >
                  {editingReminderId ? 'Update Schedule Karein' : 'Save Schedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
