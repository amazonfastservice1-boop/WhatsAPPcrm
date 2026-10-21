import React, { useState } from 'react';
import { AGENTS } from '../data/mockData';
import { Users, UserPlus, CheckCircle2, Shield, RefreshCw } from 'lucide-react';

export default function TeamView() {
  const [team, setTeam] = useState(AGENTS);
  const [roundRobinEnabled, setRoundRobinEnabled] = useState(true);

  const toggleStatus = (id) => {
    setTeam(prev => prev.map(a => {
      if (a.id === id) {
        const nextStatus = a.status === 'Available' ? 'Busy' : a.status === 'Busy' ? 'Offline' : 'Available';
        return {
          ...a,
          status: nextStatus,
          isOnline: nextStatus !== 'Offline'
        };
      }
      return a;
    }));
  };

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Team Members & Sales Agents</h2>
          <p className="text-xs text-slate-600 font-medium mt-0.5">
            Configure regional lead assignments, working hours, and online availability.
          </p>
        </div>

        <button 
          onClick={() => alert('Invite link generated: https://crm-whatsapp.app/invite/agent-team')}
          className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold shadow-sm shadow-orange-500/30 transition-all"
        >
          <UserPlus className="w-4 h-4" /> + Invite New Agent
        </button>
      </div>

      {/* Round Robin Automation Toggle */}
      <div className="p-4 rounded-2xl bg-white border border-[#EEF2F6] shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center font-bold">
            <RefreshCw className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-extrabold text-slate-900">Regional Round-Robin Auto Assignment</h4>
            <p className="text-xs text-slate-600 font-medium">
              Automatically distribute new inbound leads equally to online agents in the matching country branch.
            </p>
          </div>
        </div>

        <button 
          onClick={() => setRoundRobinEnabled(!roundRobinEnabled)}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            roundRobinEnabled 
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
              : 'bg-slate-100 text-slate-600'
          }`}
        >
          {roundRobinEnabled ? '✓ Enabled' : 'Disabled'}
        </button>
      </div>

      {/* Agents Table */}
      <div className="card-soft bg-white overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-extrabold text-slate-900">Active Sales Agents ({team.length})</h3>
          <span className="text-xs font-bold text-slate-600">Click status to toggle</span>
        </div>

        <div className="divide-y divide-slate-100">
          {team.map((agent) => (
            <div key={agent.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/60 transition-colors">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <img 
                    src={agent.avatar} 
                    alt={agent.name} 
                    className="w-11 h-11 rounded-full object-cover ring-2 ring-slate-100" 
                  />
                  <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full ring-2 ring-white ${agent.isOnline ? 'bg-emerald-500' : 'bg-slate-300'}`}></span>
                </div>
                <div>
                  <h4 className="text-sm font-extrabold text-slate-900">{agent.name}</h4>
                  <p className="text-xs font-medium text-slate-600">{agent.role}</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs font-semibold">
                {/* Branch */}
                <div>
                  <span className="text-slate-600 block text-[10px] uppercase font-bold">Assigned Region</span>
                  <span className="font-extrabold text-slate-800">{agent.country}</span>
                </div>

                {/* Assigned Leads */}
                <div>
                  <span className="text-slate-600 block text-[10px] uppercase font-bold">Active Leads</span>
                  <span className="font-extrabold text-orange-600">{agent.assignedCount} leads</span>
                </div>

                {/* Status Toggle Button */}
                <div>
                  <span className="text-slate-600 block text-[10px] uppercase font-bold mb-0.5">Availability</span>
                  <button 
                    onClick={() => toggleStatus(agent.id)}
                    className={`px-3 py-1 rounded-full text-xs font-bold border transition-colors ${
                      agent.status === 'Available'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                        : agent.status === 'Busy'
                        ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                        : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                    }`}
                  >
                    {agent.status}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
