import React, { useState } from 'react';
import { 
  Search, 
  Send, 
  Paperclip, 
  Smile, 
  MoreVertical, 
  Phone, 
  CheckCheck, 
  UserPlus, 
  Tag, 
  Lock, 
  Clock, 
  Zap, 
  Filter, 
  ShieldAlert,
  ChevronDown,
  Building,
  DollarSign
} from 'lucide-react';
import { AGENTS, PIPELINE_STAGES, QUICK_REPLIES, CHANNELS } from '../data/mockData';

export default function LiveChatView({ 
  leads, 
  selectedLeadId, 
  setSelectedLeadId, 
  selectedChannel, 
  setSelectedChannel,
  onUpdateLead 
}) {
  const [filterTab, setFilterTab] = useState('all'); // all, unassigned, mine, unread
  const [inputText, setInputText] = useState('');
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [searchLeadTerm, setSearchLeadTerm] = useState('');

  // Selected active lead
  const activeLead = leads.find(l => l.id === selectedLeadId) || leads[0];

  // Filtered leads
  const displayLeads = leads.filter(lead => {
    // Channel filter
    if (selectedChannel !== 'all' && lead.channel !== selectedChannel) return false;
    // Tab filter
    if (filterTab === 'unassigned' && lead.assignedTo !== 'Unassigned') return false;
    if (filterTab === 'mine' && lead.assignedTo !== 'Hamza Tariq' && lead.assignedTo !== 'Ali Husni') return false;
    if (filterTab === 'unread' && lead.unreadCount === 0) return false;
    // Search
    if (searchLeadTerm) {
      const term = searchLeadTerm.toLowerCase();
      return lead.name.toLowerCase().includes(term) || lead.phone.includes(term);
    }
    return true;
  });

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputText.trim() || !activeLead) return;

    if (isInternalNote) {
      // Add internal note
      const newNote = {
        id: `note-${Date.now()}`,
        author: 'Ali Husni (Admin)',
        text: inputText,
        time: 'Just now'
      };
      const updatedNotes = [...(activeLead.notes || []), newNote];
      onUpdateLead(activeLead.id, { notes: updatedNotes });
    } else {
      // Add WhatsApp message
      const newMsg = {
        id: `msg-${Date.now()}`,
        sender: 'agent',
        agentName: 'Ali Husni',
        text: inputText,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: 'delivered'
      };
      const updatedMessages = [...activeLead.messages, newMsg];
      onUpdateLead(activeLead.id, { 
        messages: updatedMessages, 
        lastTime: 'Just now',
        unreadCount: 0 
      });
    }

    setInputText('');
  };

  const applyQuickReply = (text) => {
    setInputText(text);
    setShowQuickReplies(false);
  };

  return (
    <div className="flex h-[calc(100vh-73px)] overflow-hidden bg-[#F8F9FC]">
      {/* 1. Left Column: Conversations List (WhatsApp Style) */}
      <div className="w-80 md:w-96 bg-white border-r border-[#EEF2F6] flex flex-col shrink-0">
        {/* Header & Channel Selector */}
        <div className="p-3.5 border-b border-[#F1F5F9] space-y-2.5">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-extrabold text-slate-900 tracking-tight">Customer WhatsApp Chats</h2>
            <span className="text-xs font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-100">
              {displayLeads.length} Customers
            </span>
          </div>

          {/* Quick Channel Filter inside Inbox */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 text-xs">
            {CHANNELS.map(ch => (
              <button
                key={ch.id}
                onClick={() => setSelectedChannel(ch.id)}
                className={`px-2.5 py-1 rounded-lg font-bold shrink-0 transition-all ${
                  selectedChannel === ch.id 
                    ? 'bg-orange-500 text-white shadow-2xs' 
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {ch.flag} {ch.id === 'all' ? 'Saare' : ch.id.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchLeadTerm}
              onChange={(e) => setSearchLeadTerm(e.target.value)}
              placeholder="Customer ka naam ya phone likhein..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 text-xs font-medium text-slate-800 rounded-xl border border-slate-200 focus:outline-none focus:border-orange-500"
            />
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 border-b border-slate-100 pt-1">
            <button 
              onClick={() => setFilterTab('all')}
              className={`pb-1.5 px-1 border-b-2 transition-colors ${filterTab === 'all' ? 'border-orange-500 text-orange-600' : 'border-transparent hover:text-slate-700'}`}
            >
              Saari Chats
            </button>
            <button 
              onClick={() => setFilterTab('unassigned')}
              className={`pb-1.5 px-1 border-b-2 transition-colors ${filterTab === 'unassigned' ? 'border-orange-500 text-orange-600' : 'border-transparent hover:text-slate-700'}`}
            >
              Bina Assign
            </button>
            <button 
              onClick={() => setFilterTab('mine')}
              className={`pb-1.5 px-1 border-b-2 transition-colors ${filterTab === 'mine' ? 'border-orange-500 text-orange-600' : 'border-transparent hover:text-slate-700'}`}
            >
              Meri Chats
            </button>
            <button 
              onClick={() => setFilterTab('unread')}
              className={`pb-1.5 px-1 border-b-2 transition-colors ${filterTab === 'unread' ? 'border-orange-500 text-orange-600' : 'border-transparent hover:text-slate-700'}`}
            >
              Naye Messages
            </button>
          </div>
        </div>

        {/* Conversation Items List */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-50">
          {displayLeads.length === 0 ? (
            <div className="p-8 text-center text-slate-600 text-xs font-medium">
              No chats found in this channel or filter.
            </div>
          ) : (
            displayLeads.map((lead) => {
              const isSelected = activeLead?.id === lead.id;
              const lastMsg = lead.messages[lead.messages.length - 1];
              return (
                <div
                  key={lead.id}
                  onClick={() => {
                    setSelectedLeadId(lead.id);
                    if (lead.unreadCount > 0) {
                      onUpdateLead(lead.id, { unreadCount: 0 });
                    }
                  }}
                  className={`p-3.5 cursor-pointer transition-all flex items-start gap-3 select-none ${
                    isSelected 
                      ? 'bg-orange-50/70 border-l-4 border-orange-500' 
                      : 'hover:bg-slate-50/80'
                  }`}
                >
                  {/* Avatar / Flag */}
                  <div className="relative shrink-0">
                    <div className="w-11 h-11 rounded-full bg-slate-100 flex items-center justify-center font-extrabold text-sm text-slate-700 border border-slate-200">
                      {lead.name.charAt(0)}
                    </div>
                    <span className="absolute -bottom-1 -right-1 text-xs bg-white rounded-full p-0.5 shadow-2xs">
                      {lead.flag}
                    </span>
                  </div>

                  {/* Chat Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <h4 className="text-xs font-extrabold text-slate-900 truncate">
                        {lead.name}
                      </h4>
                      <span className="text-[10px] font-semibold text-slate-600 shrink-0">
                        {lead.lastTime}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-600 truncate font-medium">
                      {lastMsg?.text || 'No messages yet'}
                    </p>

                    <div className="flex items-center justify-between mt-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                        {lead.stage}
                      </span>

                      {lead.unreadCount > 0 ? (
                        <span className="w-5 h-5 rounded-full bg-orange-500 text-white text-[10px] font-bold flex items-center justify-center shadow-xs">
                          {lead.unreadCount}
                        </span>
                      ) : (
                        <span className="text-[10px] font-medium text-slate-600 flex items-center gap-1">
                          {lead.assignedTo === 'Unassigned' ? (
                            <span className="text-amber-600 font-bold">Unassigned</span>
                          ) : (
                            <span>{lead.assignedTo.split(' ')[0]}</span>
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 2. Middle Column: Active Chat Conversation */}
      <div className="flex-1 flex flex-col bg-[#F4F5F8] border-r border-[#EEF2F6] min-w-0">
        {/* Chat Header */}
        <div className="p-3.5 bg-white border-b border-[#EEF2F6] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full bg-orange-100 text-orange-700 font-extrabold flex items-center justify-center text-sm">
              {activeLead.name.charAt(0)}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-extrabold text-slate-900 truncate">{activeLead.name}</h3>
                <span className="text-xs" title={activeLead.channelName}>{activeLead.flag}</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Online
                </span>
              </div>
              <p className="text-xs text-slate-600 font-mono mt-0.5">
                {activeLead.phone} • {activeLead.channelName}
              </p>
            </div>
          </div>

          {/* Quick Agent Actions */}
          <div className="flex items-center gap-2">
            <div className="text-right hidden sm:block">
              <span className="text-[10px] font-bold text-slate-600 block">ASSIGNED TO</span>
              <span className="text-xs font-bold text-orange-600">{activeLead.assignedTo}</span>
            </div>
            <button 
              onClick={() => alert(`Calling ${activeLead.phone} via WhatsApp VoIP...`)}
              className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700"
              title="Call Lead"
            >
              <Phone className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Message Thread */}
        <div className="flex-1 p-5 overflow-y-auto space-y-4">
          <div className="text-center my-2">
            <span className="text-[10px] font-bold uppercase tracking-wider bg-white px-3 py-1 rounded-full text-slate-600 border border-slate-200 shadow-2xs">
              Chat started on {activeLead.channelName}
            </span>
          </div>

          {/* Messages Loop */}
          {activeLead.messages.map((msg) => {
            const isCustomer = msg.sender === 'customer';
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isCustomer ? 'items-start' : 'items-end'}`}
              >
                {!isCustomer && msg.agentName && (
                  <span className="text-[10px] font-bold text-slate-600 mb-0.5 mr-1 flex items-center gap-1">
                    <span>{msg.agentName}</span>
                    <span className="text-orange-600">• Agent</span>
                  </span>
                )}

                <div
                  className={`max-w-md p-3.5 rounded-2xl text-xs font-medium leading-relaxed shadow-sm ${
                    isCustomer
                      ? 'bg-white text-slate-800 rounded-tl-none border border-slate-200/80'
                      : 'bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-tr-none'
                  }`}
                >
                  <p>{msg.text}</p>
                  <div
                    className={`flex items-center justify-end gap-1 mt-1 text-[10px] ${
                      isCustomer ? 'text-slate-600' : 'text-orange-100'
                    }`}
                  >
                    <span>{msg.time}</span>
                    {!isCustomer && <CheckCheck className="w-3.5 h-3.5 text-white stroke-[2.5]" />}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Internal Notes Display (Yellow Sticky Note Style) */}
          {activeLead.notes && activeLead.notes.length > 0 && (
            <div className="pt-2 space-y-2">
              {activeLead.notes.map((note) => (
                <div 
                  key={note.id}
                  className="p-3 bg-amber-50 border border-amber-200/80 rounded-xl text-amber-900 text-xs shadow-2xs"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-extrabold flex items-center gap-1.5 text-amber-800 text-[11px]">
                      <Lock className="w-3 h-3 text-amber-600" /> Private Team Note ({note.author})
                    </span>
                    <span className="text-[10px] text-amber-700">{note.time}</span>
                  </div>
                  <p className="font-medium">{note.text}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Replies Chips Bar */}
        <div className="bg-white border-t border-slate-200/60 px-4 py-2 flex items-center gap-2 overflow-x-auto text-xs shrink-0">
          <span className="text-[10px] font-extrabold text-orange-600 uppercase flex items-center gap-1 shrink-0">
            <Zap className="w-3 h-3 fill-orange-500 text-orange-500" /> Fori Saved Jawab:
          </span>
          {QUICK_REPLIES.map((qr) => (
            <button
              key={qr.shortcut}
              onClick={() => applyQuickReply(qr.content)}
              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-orange-100 hover:text-orange-700 text-slate-700 font-bold shrink-0 transition-colors text-[11px]"
              title={qr.content}
            >
              {qr.shortcut}
            </button>
          ))}
        </div>

        {/* Chat Input Bar */}
        <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-slate-200 shrink-0">
          {/* Internal Note vs WhatsApp Message Toggle */}
          <div className="flex items-center gap-2 mb-2">
            <button
              type="button"
              onClick={() => setIsInternalNote(false)}
              className={`text-xs font-bold px-3 py-1 rounded-lg transition-all ${
                !isInternalNote 
                  ? 'bg-orange-500 text-white shadow-2xs' 
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Customer Ko WhatsApp Jawab Bhejo
            </button>
            <button
              type="button"
              onClick={() => setIsInternalNote(true)}
              className={`text-xs font-bold px-3 py-1 rounded-lg flex items-center gap-1 transition-all ${
                isInternalNote 
                  ? 'bg-amber-500 text-white shadow-2xs' 
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Lock className="w-3 h-3" /> 🔒 Team Ke Liye Private Note
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button 
              type="button"
              onClick={() => alert('Attachments: Image, PDF ya Voice Note WhatsApp par bhejein')}
              className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100"
              title="File/Image Bhejein"
            >
              <Paperclip className="w-4 h-4" />
            </button>

            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={
                isInternalNote
                  ? "🔒 Team ke liye note likhein (Customer ko nahi dikhega)..."
                  : `Yahan WhatsApp message likhein (${activeLead.channelName} se jayega)...`
              }
              className={`flex-1 px-4 py-2 text-xs font-medium rounded-xl border focus:outline-none transition-all ${
                isInternalNote
                  ? 'bg-amber-50/50 border-amber-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20'
                  : 'bg-slate-50 border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20'
              }`}
            />

            <button
              type="submit"
              disabled={!inputText.trim()}
              className={`p-2.5 rounded-xl font-bold text-white transition-all shadow-sm ${
                isInternalNote
                  ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/30'
                  : 'bg-orange-500 hover:bg-orange-600 shadow-orange-500/30'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>

      {/* 3. Right Column: Lead CRM Profile & Pipeline Drawer */}
      <div className="w-80 bg-white border-l border-[#EEF2F6] p-5 overflow-y-auto space-y-6 hidden lg:block shrink-0">
        <div>
          <h3 className="text-sm font-extrabold text-slate-900 tracking-tight mb-1">Customer Ki Maloomat</h3>
          <p className="text-xs text-slate-500 font-medium">Lead status aur agent assignment</p>
        </div>

        {/* Lead Profile Card */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 text-center">
          <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-orange-500 to-amber-400 text-white font-black text-2xl flex items-center justify-center mx-auto shadow-sm">
            {activeLead.name.charAt(0)}
          </div>
          <h4 className="mt-3 text-sm font-extrabold text-slate-900">{activeLead.name}</h4>
          <p className="text-xs font-mono text-slate-500 mt-0.5">{activeLead.phone}</p>
          <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white border border-slate-200 text-xs font-bold text-slate-700 shadow-2xs">
            <span>{activeLead.flag}</span>
            <span>{activeLead.channelName}</span>
          </div>
        </div>

        {/* Lead Stage Dropdown */}
        <div className="space-y-1.5">
          <label className="text-xs font-extrabold text-slate-700">Customer Stage (Status)</label>
          <select
            value={activeLead.stage}
            onChange={(e) => onUpdateLead(activeLead.id, { stage: e.target.value })}
            className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-orange-500"
          >
            {PIPELINE_STAGES.map((s) => (
              <option key={s.id} value={s.id}>{s.title}</option>
            ))}
          </select>
        </div>

        {/* Assign Lead to Agent */}
        <div className="space-y-1.5">
          <label className="text-xs font-extrabold text-slate-700 flex items-center justify-between">
            <span>Kaunsa Staff Handle Karega</span>
            <span className="text-[10px] text-orange-600 font-bold">Auto / Change</span>
          </label>
          <select
            value={activeLead.assignedTo}
            onChange={(e) => onUpdateLead(activeLead.id, { assignedTo: e.target.value })}
            className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-orange-500"
          >
            <option value="Unassigned">-- Kisi Ko Assign Nahi (Khali) --</option>
            {AGENTS.map((a) => (
              <option key={a.id} value={a.name}>
                {a.name} ({a.country})
              </option>
            ))}
          </select>
        </div>

        {/* Deal Value */}
        <div className="space-y-1.5">
          <label className="text-xs font-extrabold text-slate-700">Expected Deal Ki Raqam (Value)</label>
          <div className="relative">
            <input
              type="text"
              value={activeLead.dealValue || ''}
              onChange={(e) => onUpdateLead(activeLead.id, { dealValue: e.target.value })}
              placeholder="e.g. 25,000"
              className="w-full pl-3 pr-14 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-orange-500"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-extrabold text-slate-500">
              {activeLead.currency}
            </span>
          </div>
        </div>

        {/* Tags */}
        <div className="space-y-2">
          <label className="text-xs font-extrabold text-slate-700">Customer Tags (Category)</label>
          <div className="flex flex-wrap gap-1.5">
            {activeLead.tags.map((tag) => (
              <span key={tag} className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-orange-50 text-orange-700 border border-orange-200">
                {tag}
              </span>
            ))}
            <button 
              onClick={() => {
                const newTag = prompt('Naya tag likhein:');
                if (newTag) {
                  onUpdateLead(activeLead.id, { tags: [...activeLead.tags, newTag] });
                }
              }}
              className="px-2 py-1 rounded-lg text-[11px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-600"
            >
              + Tag
            </button>
          </div>
        </div>

        {/* Quick Information Box */}
        <div className="p-3 rounded-xl bg-orange-50/50 border border-orange-100 text-slate-700 text-xs space-y-1">
          <p className="font-extrabold text-orange-900">Regional Routing Active</p>
          <p className="text-[11px] text-slate-600">
            Replies to this customer are routed via the {activeLead.channelName} gateway automatically.
          </p>
        </div>
      </div>
    </div>
  );
}
