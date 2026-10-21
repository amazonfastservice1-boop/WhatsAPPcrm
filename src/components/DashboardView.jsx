import React, { useState } from 'react';
import { 
  Users, 
  MessageSquare, 
  TrendingUp, 
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
  Zap
} from 'lucide-react';
import { CHANNELS, AGENTS, UPCOMING_SCHEDULE } from '../data/mockData';

export default function DashboardView({ leads, selectedChannel, onOpenChat, onOpenNewLead }) {
  const [timeRange, setTimeRange] = useState('Last 30 days');
  const [activeDate, setActiveDate] = useState(8);
  const [hoveredMonth, setHoveredMonth] = useState('Mar');

  // Filter leads based on selected channel
  const filteredLeads = selectedChannel === 'all' 
    ? leads 
    : leads.filter(l => l.channel === selectedChannel);

  // Month bar chart data
  const monthlyData = [
    { month: 'Jan', total: 65, dubai: 30, saudi: 22, pak: 13, height: '48%' },
    { month: 'Feb', total: 80, dubai: 38, saudi: 26, pak: 16, height: '60%' },
    { month: 'Mar', total: 120, dubai: 55, saudi: 42, pak: 23, height: '90%', isCurrent: true },
    { month: 'Apr', total: 95, dubai: 44, saudi: 32, pak: 19, height: '72%' },
    { month: 'May', total: 110, dubai: 52, saudi: 38, pak: 20, height: '82%' },
    { month: 'Jun', total: 105, dubai: 48, saudi: 37, pak: 20, height: '78%' },
    { month: 'Jul', total: 130, dubai: 62, saudi: 44, pak: 24, height: '98%' },
  ];

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* 4 Top Metric Cards (Matches Screenshot layout) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Total Inbound Leads */}
        <div className="card-soft p-5 bg-white relative overflow-hidden group hover:shadow-card-hover transition-all">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center font-bold">
              <Users className="w-5 h-5" />
            </div>
            <button className="text-slate-400 hover:text-slate-600 p-1">
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight">1,420+</h3>
            <span className="inline-flex items-center text-xs font-bold px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-600 border border-emerald-100">
              <ArrowUpRight className="w-3 h-3 mr-0.5" /> 12.5%
            </span>
          </div>
          <p className="text-xs text-slate-500 font-semibold mt-1">
            Kul Naye WhatsApp Customers (+500 naye)
          </p>
          {/* Mini Gradient Bar Chart */}
          <div className="mt-4 flex items-end gap-1.5 h-10">
            <div className="flex-1 bg-orange-100 rounded-t-md h-[40%] group-hover:bg-orange-200 transition-colors"></div>
            <div className="flex-1 bg-orange-200 rounded-t-md h-[60%] group-hover:bg-orange-300 transition-colors"></div>
            <div className="flex-1 bg-orange-300 rounded-t-md h-[50%] group-hover:bg-orange-400 transition-colors"></div>
            <div className="flex-1 bg-orange-400 rounded-t-md h-[80%] group-hover:bg-orange-500 transition-colors"></div>
            <div className="flex-1 bg-gradient-to-t from-orange-500 to-amber-400 rounded-t-md h-[100%] shadow-xs"></div>
          </div>
        </div>

        {/* Card 2: Active WhatsApp Chats */}
        <div className="card-soft p-5 bg-white relative overflow-hidden group hover:shadow-card-hover transition-all">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <MessageSquare className="w-5 h-5" />
            </div>
            <button className="text-slate-400 hover:text-slate-600 p-1">
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight">344</h3>
            <span className="inline-flex items-center text-xs font-bold px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-600 border border-emerald-100">
              <ArrowUpRight className="w-3 h-3 mr-0.5" /> 3.5%
            </span>
          </div>
          <p className="text-xs text-slate-500 font-semibold mt-1">
            Abhi Chal Rahi WhatsApp Chats
          </p>
          {/* Channel distribution bar */}
          <div className="mt-5 space-y-1.5">
            <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden flex">
              <div style={{ width: '45%' }} className="bg-orange-500" title="Dubai 45%"></div>
              <div style={{ width: '35%' }} className="bg-teal-500" title="Saudi 35%"></div>
              <div style={{ width: '20%' }} className="bg-emerald-500" title="Pak 20%"></div>
            </div>
            <div className="flex justify-between text-[11px] font-semibold text-slate-500">
              <span className="text-orange-600 font-bold">🇦🇪 Dubai: 142</span>
              <span className="text-teal-600 font-bold">🇸🇦 Saudi: 118</span>
              <span className="text-emerald-600 font-bold">🇵🇰 Pak: 84</span>
            </div>
          </div>
        </div>

        {/* Card 3: Avg. Response Time */}
        <div className="card-soft p-5 bg-white relative overflow-hidden group hover:shadow-card-hover transition-all">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <Clock className="w-5 h-5" />
            </div>
            <button className="text-slate-400 hover:text-slate-600 p-1">
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight">1.8 <span className="text-sm font-semibold text-slate-500">Mins</span></h3>
            <span className="inline-flex items-center text-xs font-bold px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-600 border border-emerald-100">
              ⚡ Bohot Tez
            </span>
          </div>
          <p className="text-xs text-slate-500 font-semibold mt-1">
            Customer Ko Pehla Jawab Dene Ka Time
          </p>
          <div className="mt-4 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium">Sabse Aage:</span>
            <span className="font-bold text-orange-600 flex items-center gap-1">
              🇦🇪 Dubai Staff (1.2 Mins)
            </span>
          </div>
        </div>

        {/* Card 4: Deals Closed / Won */}
        <div className="card-soft p-5 bg-white relative overflow-hidden group hover:shadow-card-hover transition-all">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center font-bold">
              <TrendingUp className="w-5 h-5" />
            </div>
            <button className="text-slate-400 hover:text-slate-600 p-1">
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight">$42,500+</h3>
            <span className="inline-flex items-center text-xs font-bold px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-600 border border-emerald-100">
              <ArrowUpRight className="w-3 h-3 mr-0.5" /> 8.2%
            </span>
          </div>
          <p className="text-xs text-slate-500 font-semibold mt-1">
            Kamyab Deals (85 Final Order Ho Gaye)
          </p>
          <div className="mt-4 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium">Bari Deal:</span>
            <span className="font-bold text-slate-800">🇸🇦 Dr. Faisal ($9,100)</span>
          </div>
        </div>
      </div>

      {/* Middle Section: Big Chart + Follow-up Calendar (Matching Screenshot Layout) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left 2 Cols: Leads & Conversion Overview Chart */}
        <div className="lg:col-span-2 card-soft p-6 bg-white flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-orange-500"></span>
                  <h3 className="text-base font-extrabold text-slate-900 tracking-tight">Leads Aur WhatsApp Messages Ka Hisaab</h3>
                </div>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Mahana hisaab: Dubai, Saudi Arabia aur Pakistan numbers ki leads
                </p>
              </div>

              <div className="flex items-center gap-2">
                {/* Time Range Filter */}
                <select
                  value={timeRange}
                  onChange={(e) => setTimeRange(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-orange-500"
                >
                  <option>Pichle 7 Din (Last 7 days)</option>
                  <option>Pichle 30 Din (Last 30 days)</option>
                  <option>Pichle 3 Mahine (Last 90 days)</option>
                </select>

                <button 
                  onClick={() => alert('Chart report downloaded!')}
                  className="p-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-400 hover:text-slate-700"
                  title="Download Report"
                >
                  <Download className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Legend pills */}
            <div className="flex flex-wrap items-center gap-4 mt-4 text-xs font-semibold text-slate-500">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span>
                Kul Leads (Total)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
                🇦🇪 Dubai Branch
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-teal-500"></span>
                🇸🇦 Saudi Branch
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                🇵🇰 Pakistan Branch
              </span>
            </div>
          </div>

          {/* Interactive Bar Chart Visualization */}
          <div className="mt-8 pt-4">
            <div className="relative h-64 flex items-end justify-between gap-3 px-4 border-b border-slate-100">
              {/* Tooltip on active bar (like in screenshot) */}
              <div className="absolute top-2 left-1/3 -translate-x-1/2 bg-white/95 backdrop-blur-sm border border-slate-200 shadow-xl rounded-xl p-3 z-10 min-w-[190px] animate-fade-in pointer-events-none">
                <p className="text-[11px] font-bold text-slate-600">March 2026 Peak</p>
                <div className="mt-2 space-y-1 text-xs">
                  <div className="flex justify-between items-center text-slate-600">
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-orange-500"></span> Total:
                    </span>
                    <span className="font-extrabold text-slate-900">120 Leads</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-600">
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-amber-400"></span> 🇦🇪 Dubai:
                    </span>
                    <span className="font-bold text-amber-600">55 Leads</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-600">
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-teal-500"></span> 🇸🇦 Saudi:
                    </span>
                    <span className="font-bold text-teal-600">42 Leads</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-600">
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span> 🇵🇰 Pak:
                    </span>
                    <span className="font-bold text-emerald-600">23 Leads</span>
                  </div>
                </div>
              </div>

              {monthlyData.map((item) => {
                return (
                  <div 
                    key={item.month} 
                    className="flex-1 flex flex-col items-center gap-2 h-full justify-end group cursor-pointer"
                    onMouseEnter={() => setHoveredMonth(item.month)}
                  >
                    <div 
                      style={{ height: item.height }}
                      className={`w-full max-w-[48px] rounded-xl transition-all duration-300 relative flex flex-col justify-end overflow-hidden ${
                        item.isCurrent 
                          ? 'bg-gradient-to-t from-orange-600 via-orange-500 to-amber-400 shadow-md shadow-orange-500/20' 
                          : 'bg-slate-100 group-hover:bg-orange-200'
                      }`}
                    >
                      {/* Subtle internal segment lines */}
                      <div className="h-[25%] bg-white/20 border-b border-white/20"></div>
                      <div className="h-[35%] bg-white/10"></div>
                    </div>
                    <span className={`text-xs font-bold ${item.isCurrent ? 'text-orange-600' : 'text-slate-600 group-hover:text-slate-700'}`}>
                      {item.month}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-between items-center pt-3 text-[11px] font-semibold text-slate-600">
              <span>0 Leads</span>
              <span>50 Leads</span>
              <span>100 Leads</span>
              <span>150 Leads</span>
            </div>
          </div>
        </div>

        {/* Right 1 Col: Mini Follow-Up Calendar & Schedule (Exact Screenshot Widget) */}
        <div className="card-soft p-5 bg-white flex flex-col justify-between">
          <div>
            {/* Calendar Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <button className="p-1 rounded-lg hover:bg-slate-100 text-slate-600">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <h4 className="text-sm font-extrabold text-slate-900">March 2026</h4>
              <button className="p-1 rounded-lg hover:bg-slate-100 text-slate-600">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Days of week */}
            <div className="grid grid-cols-7 gap-1 text-center mt-3 text-[10px] font-bold text-slate-600">
              <span>SUN</span><span>MON</span><span>TUE</span><span>WED</span><span>THU</span><span>FRI</span><span>SAT</span>
            </div>

            {/* Calendar Days */}
            <div className="grid grid-cols-7 gap-1 text-center mt-2 text-xs font-semibold text-slate-700">
              <span className="p-2 text-slate-300">27</span>
              <span className="p-2 text-slate-300">28</span>
              <span className="p-2">1</span>
              <span className="p-2">2</span>
              <span className="p-2">3</span>
              <span className="p-2">4</span>
              <span className="p-2">5</span>
              <span className="p-2">6</span>
              <span className="p-2">7</span>
              {/* Active Day with Dots badge (Matching Screenshot) */}
              <button 
                onClick={() => setActiveDate(8)}
                className="p-1.5 rounded-xl bg-orange-500 text-white font-extrabold relative shadow-sm shadow-orange-500/30"
              >
                8
                <span className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
                  <span className="w-1 h-1 rounded-full bg-white"></span>
                  <span className="w-1 h-1 rounded-full bg-white"></span>
                </span>
              </button>
              <span className="p-2">9</span>
              <span className="p-2">10</span>
              <span className="p-2">11</span>
              <span className="p-2">12</span>
              <span className="p-2">13</span>
              <span className="p-2">14</span>
              <span className="p-2">15</span>
              <span className="p-2">16</span>
              <span className="p-2">17</span>
              <span className="p-2">18</span>
              <span className="p-2">19</span>
            </div>

            {/* Floating Activity Detail Card (Matching Screenshot) */}
            <div className="mt-4 p-4 rounded-xl bg-slate-900 text-white shadow-lg space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-orange-400 uppercase tracking-wider">Aaj Ki Customer Calls</span>
                <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-300">3 Baqi Hain</span>
              </div>

              <div className="space-y-2 text-xs">
                {UPCOMING_SCHEDULE.map((item) => (
                  <div key={item.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`w-2 h-2 rounded-full ${item.color} shrink-0`}></span>
                      <span className="font-medium truncate text-slate-200">{item.title}</span>
                    </div>
                    <span className="text-[11px] text-slate-400 font-mono shrink-0 ml-2">{item.time}</span>
                  </div>
                ))}
              </div>

              <button 
                onClick={() => alert('Naya reminder add ho gaya!')}
                className="w-full mt-2 py-2 px-3 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" /> + Naya Reminder Lagayein
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row: 3 Panels matching screenshot (Donut, Agent Workload, Recent Inbound Leads) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Card 1: Leads by Country (Donut representation) */}
        <div className="card-soft p-5 bg-white flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h4 className="text-sm font-extrabold text-slate-900">Mulk Ke Hisaab Se Leads</h4>
              <p className="text-xs text-slate-500 font-medium">Har number ka hissa</p>
            </div>
            <button className="text-slate-400 p-1">
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </div>

          {/* Donut representation */}
          <div className="my-6 flex items-center justify-center">
            <div className="relative w-44 h-44 rounded-full border-8 border-orange-500 flex items-center justify-center shadow-inner">
              <div className="absolute inset-0 rounded-full border-8 border-teal-500 border-t-transparent border-l-transparent -rotate-45"></div>
              <div className="text-center">
                <span className="text-xs font-semibold text-slate-500">Kul Customers</span>
                <p className="text-2xl font-black text-slate-900 tracking-tight">1,420</p>
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                  100% Connected
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-100 text-xs font-semibold">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span>
                <span>🇦🇪 Dubai (AED)</span>
              </span>
              <span className="text-slate-900 font-bold">639 Leads (45%)</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-teal-500"></span>
                <span>🇸🇦 Saudi Arabia (SAR)</span>
              </span>
              <span className="text-slate-900 font-bold">497 Leads (35%)</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                <span>🇵🇰 Pakistan (PKR)</span>
              </span>
              <span className="text-slate-900 font-bold">284 Leads (20%)</span>
            </div>
          </div>
        </div>

        {/* Card 2: Agent Workload & Status */}
        <div className="card-soft p-5 bg-white flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h4 className="text-sm font-extrabold text-slate-900">Online Staff & Agents</h4>
              <p className="text-xs text-slate-500 font-medium">Auto barabar taqseem (Round-Robin)</p>
            </div>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              4 Online
            </span>
          </div>

          <div className="space-y-3.5 my-3 overflow-y-auto max-h-72 pr-1">
            {AGENTS.map((agent) => (
              <div key={agent.id} className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="relative shrink-0">
                    <img 
                      src={agent.avatar} 
                      alt={agent.name} 
                      className="w-9 h-9 rounded-full object-cover ring-2 ring-slate-100" 
                    />
                    <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ring-2 ring-white ${agent.isOnline ? 'bg-emerald-500' : 'bg-slate-300'}`}></span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-800 truncate">{agent.name}</p>
                    <p className="text-[11px] font-medium text-slate-500 truncate">{agent.role}</p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    agent.status === 'Available' 
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                      : agent.status === 'Busy'
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : 'bg-slate-100 text-slate-500 border-slate-200'
                  }`}>
                    {agent.status}
                  </span>
                  <p className="text-[10px] text-slate-500 font-semibold mt-0.5">{agent.assignedCount} leads</p>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-slate-100">
            <button 
              onClick={() => alert('Auto distribution rule on hai!')}
              className="w-full text-center text-xs font-bold text-orange-600 hover:text-orange-700 py-1"
            >
              Auto Assignment Rules Dekhein →
            </button>
          </div>
        </div>

        {/* Card 3: Recent Inbound WhatsApp Leads */}
        <div className="card-soft p-5 bg-white flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h4 className="text-sm font-extrabold text-slate-900">Taaza WhatsApp Messages</h4>
              <p className="text-xs text-slate-500 font-medium">Click karke direct jawab dein</p>
            </div>
            <button 
              onClick={onOpenNewLead}
              className="text-xs font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1"
            >
              + Naya
            </button>
          </div>

          <div className="space-y-2.5 my-3 overflow-y-auto max-h-72 pr-1">
            {filteredLeads.slice(0, 5).map((lead) => (
              <div 
                key={lead.id}
                onClick={() => onOpenChat(lead.id)}
                className="p-2.5 rounded-xl border border-slate-100 hover:border-orange-200 hover:bg-orange-50/40 cursor-pointer transition-all group"
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-sm">{lead.flag}</span>
                    <span className="text-xs font-bold text-slate-800 truncate group-hover:text-orange-600">{lead.name}</span>
                  </div>
                  <span className="text-[10px] font-semibold text-slate-500">{lead.lastTime}</span>
                </div>
                
                <p className="text-[11px] text-slate-600 font-medium truncate">
                  {lead.messages[lead.messages.length - 1]?.text || 'Naya customer message'}
                </p>

                <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-50 text-[10px]">
                  <span className="font-bold text-slate-700">
                    {lead.dealValue ? `${lead.dealValue} ${lead.currency}` : 'Quote Baqi'}
                  </span>
                  <span className="px-1.5 py-0.5 rounded font-bold bg-orange-100 text-orange-700">
                    {lead.stage}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-slate-100">
            <button 
              onClick={() => onOpenChat()}
              className="w-full text-center text-xs font-bold text-orange-600 hover:text-orange-700 py-1 flex items-center justify-center gap-1"
            >
              Customer Chats Kholein & Jawab Dein <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
