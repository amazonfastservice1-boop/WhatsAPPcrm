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
  onNavigateToChannels,
  currentUser
}) {
  const userName = currentUser?.name || 'Admin';

  return (
    <header className="bg-white border-b border-[#EEF2F6] px-3.5 lg:px-5 py-2 lg:py-2.5 sticky top-0 z-20 flex items-center justify-between gap-2.5 shrink-0 select-none">
      {/* Left: Greeting & Current page title */}
      <div className="shrink-0 min-w-0">
        <div className="flex items-center gap-1.5">
          <h1 className="text-sm lg:text-base font-extrabold text-slate-900 tracking-tight whitespace-nowrap truncate max-w-[140px] sm:max-w-none">
            Welcome, {userName} 👋
          </h1>
          <span className="hidden md:inline-block px-1.5 py-0.2 rounded-full text-[9px] font-extrabold bg-orange-100 text-orange-700 whitespace-nowrap">
            {currentUser?.role === 'ADMIN' ? 'Super Admin' : currentUser?.role || 'Staff'}
          </span>
        </div>
        <p className="hidden xl:block text-[11px] text-slate-500 font-medium">
          {currentUser?.role === 'ADMIN' 
            ? 'AmazFast WhatsApp numbers ka live control portal' 
            : 'Aapke assigned WhatsApp channel ka live workspace'}
        </p>
      </div>

      {/* Right Controls: Search, Channel Selector, Action Buttons */}
      <div className="flex items-center gap-1.5 lg:gap-2.5 min-w-0 shrink-0">
        {/* Search Bar */}
        <div className="relative w-32 sm:w-44 lg:w-52 shrink-0 hidden sm:block">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search leads..."
            className="w-full pl-8 pr-7 py-1.5 bg-slate-50 hover:bg-slate-100/80 focus:bg-white text-xs font-medium text-slate-800 rounded-xl border border-slate-200/80 focus:border-orange-500 focus:outline-none transition-all"
          />
          <kbd className="hidden lg:inline-block absolute right-2 top-1/2 -translate-y-1/2 text-[9px] bg-white border border-slate-200 text-slate-400 px-1 py-0.2 rounded font-mono">
            ⌘K
          </kbd>
        </div>

        {/* WhatsApp Channel Switcher Pill */}
        <div className="flex items-center bg-slate-100/90 p-0.5 rounded-xl border border-slate-200/60 shrink-0 gap-0.5">
          {Array.isArray(channels) && channels.length > 0 ? channels.map((ch) => {
            const isSelected = selectedChannel === ch.id;
            const displayName = formatChannelDisplayName(ch);
            const shortName = ch.id === 'all' ? 'Saare' : (displayName.split(':')[0] || displayName);
            return (
              <button
                key={ch.id}
                onClick={() => setSelectedChannel(ch.id)}
                className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold transition-all shrink-0 ${
                  isSelected
                    ? 'bg-white text-orange-600 shadow-2xs border border-orange-100'
                    : 'text-slate-600 hover:text-slate-800 hover:bg-white/50'
                }`}
                title={ch.number || displayName}
              >
                <span>{ch.flag}</span>
                <span className="hidden 2xl:inline">{displayName}</span>
                <span className="inline 2xl:hidden">{shortName}</span>
              </button>
            );
          }) : (
            <button className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold bg-white text-orange-600 shadow-2xs border border-orange-100">
              <span>📱</span>
              <span className="hidden sm:inline">WhatsApp</span>
            </button>
          )}
        </div>

        {/* Real-time WhatsApp Device Status Badge */}
        {waStatus === 'connected' ? (
          <button 
            onClick={onNavigateToChannels}
            title="Click to view connected WhatsApp device details"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-bold hover:bg-emerald-100 transition-all shadow-2xs shrink-0"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="hidden md:inline">Live</span>
            {waUser?.phone && (
              <span className="text-[10px] font-mono text-emerald-950 bg-emerald-200/80 px-1 py-0.2 rounded font-bold hidden lg:inline">
                {waUser.phone}
              </span>
            )}
          </button>
        ) : (
          <button
            onClick={onNavigateToChannels}
            title="Click to scan QR code and connect WhatsApp"
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all border shrink-0 ${
              waStatus === 'connecting'
                ? 'bg-amber-50 border-amber-300 text-amber-900 hover:bg-amber-100'
                : 'bg-rose-50 border-rose-300 text-rose-700 hover:bg-rose-100'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${waStatus === 'connecting' ? 'bg-amber-500 animate-pulse' : 'bg-rose-500'}`} />
            <span className="hidden sm:inline">{waStatus === 'connecting' ? 'Scan QR' : 'Connect'}</span>
          </button>
        )}

        {/* Export CSV Button */}
        <button 
          onClick={() => alert('Leads file download ho gayi: amazfast_leads_export.csv')}
          className="hidden xl:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-all shadow-2xs shrink-0"
        >
          <Download className="w-3.5 h-3.5 text-slate-500" />
          <span>Excel/CSV</span>
        </button>

        {/* Add New Lead Button */}
        <button 
          onClick={onOpenNewLead}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 shadow-sm shadow-orange-500/30 transition-all shrink-0 whitespace-nowrap"
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>+ Lead</span>
        </button>
      </div>
    </header>
  );
}
