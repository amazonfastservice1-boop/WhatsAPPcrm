import React from 'react';
import { Search, Download, Plus, Globe, Bell, Filter } from 'lucide-react';
import { formatChannelDisplayName } from '../utils/leadFilters';

export default function Header({ 
  selectedChannel, 
  setSelectedChannel, 
  channels = [],
  searchQuery, 
  setSearchQuery,
  onOpenNewLead,
  activeTab,
  waStatus = 'disconnected',
  waUser = null,
  onNavigateToChannels
}) {
  return (
    <header className="bg-white border-b border-[#EEF2F6] px-6 py-3.5 sticky top-0 z-20 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
      {/* Left: Greeting & Current page title */}
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
            Welcome, Ali Husni 👋
          </h1>
          <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-orange-100 text-orange-700">
            AmazFast Service
          </span>
        </div>
        <p className="text-xs text-slate-500 font-medium mt-0.5">
          Dubai, Saudi Arabia aur Pakistan WhatsApp numbers ka live control portal
        </p>
      </div>

      {/* Right Controls: Search, Channel Selector, Action Buttons */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search Bar */}
        <div className="relative min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Customer ka naam, number ya tag dhoondein..."
            className="w-full pl-9 pr-8 py-2 bg-slate-50 hover:bg-slate-100/80 focus:bg-white text-xs font-medium text-slate-800 rounded-xl border border-slate-200/80 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/15 transition-all"
          />
          <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] bg-white border border-slate-200 text-slate-400 px-1.5 py-0.5 rounded font-mono shadow-2xs">
            ⌘K
          </kbd>
        </div>

        {/* WhatsApp Channel Switcher Pill */}
        <div className="flex items-center bg-slate-100/90 p-1 rounded-xl border border-slate-200/60 flex-wrap gap-0.5">
          {Array.isArray(channels) && channels.length > 0 ? channels.map((ch) => {
            const isSelected = selectedChannel === ch.id;
            const displayName = formatChannelDisplayName(ch);
            return (
              <button
                key={ch.id}
                onClick={() => setSelectedChannel(ch.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  isSelected
                    ? 'bg-white text-orange-600 shadow-xs border border-orange-100'
                    : 'text-slate-600 hover:text-slate-800 hover:bg-white/50'
                }`}
                title={ch.number || displayName}
              >
                <span>{ch.flag}</span>
                <span className="hidden sm:inline">
                  {displayName}
                </span>
              </button>
            );
          }) : (
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-white text-orange-600 shadow-xs border border-orange-100">
              <span>🌐</span>
              <span className="hidden sm:inline">Saare Numbers</span>
            </button>
          )}
        </div>

        {/* Real-time WhatsApp Device Status Badge */}
        {waStatus === 'connected' ? (
          <button 
            onClick={onNavigateToChannels}
            title="Click to view connected WhatsApp device details"
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-bold hover:bg-emerald-100 transition-all shadow-xs"
          >
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="flex items-center gap-1.5">
              <span>WhatsApp Live</span>
              {waUser?.phone && (
                <span className="text-[11px] font-mono text-emerald-950 bg-emerald-200/80 px-1.5 py-0.5 rounded font-bold">
                  {waUser.phone}
                </span>
              )}
            </span>
          </button>
        ) : (
          <button
            onClick={onNavigateToChannels}
            title="Click to scan QR code and connect WhatsApp"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
              waStatus === 'connecting'
                ? 'bg-amber-50 border-amber-300 text-amber-900 hover:bg-amber-100'
                : 'bg-rose-50 border-rose-300 text-rose-700 hover:bg-rose-100'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${waStatus === 'connecting' ? 'bg-amber-500 animate-pulse' : 'bg-rose-500'}`} />
            <span>{waStatus === 'connecting' ? 'Scan WhatsApp QR' : 'Connect WhatsApp'}</span>
          </button>
        )}

        {/* Export CSV Button */}
        <button 
          onClick={() => alert('Leads file download ho gayi: amazfast_leads_export.csv')}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-2xs"
        >
          <Download className="w-3.5 h-3.5 text-slate-500" />
          <span className="hidden sm:inline">Excel/CSV File</span>
        </button>

        {/* Add New Lead Button */}
        <button 
          onClick={onOpenNewLead}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 shadow-sm shadow-orange-500/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>+ Nayi Lead Banayein</span>
        </button>
      </div>
    </header>
  );
}
