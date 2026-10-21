import React from 'react';
import { PIPELINE_STAGES, CHANNELS } from '../data/mockData';
import { MoreHorizontal, Plus, ArrowRight, UserCheck, MessageSquare } from 'lucide-react';

export default function KanbanView({ leads, onUpdateLead, onOpenChat, onOpenNewLead, selectedChannel }) {
  const filteredLeads = selectedChannel === 'all' 
    ? leads 
    : leads.filter(l => l.channel === selectedChannel);

  const moveStage = (leadId, newStage) => {
    onUpdateLead(leadId, { stage: newStage });
  };

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto overflow-x-auto">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Sales Deals Pipeline</h2>
          <p className="text-xs text-slate-600 font-medium mt-0.5">
            Track lead progression from initial WhatsApp message to closed deal.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onOpenNewLead}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-orange-500 hover:bg-orange-600 shadow-sm shadow-orange-500/30"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" /> + Add Deal / Lead
          </button>
        </div>
      </div>

      {/* Kanban Columns */}
      <div className="flex gap-4.5 overflow-x-auto pb-6 min-w-[1100px]">
        {PIPELINE_STAGES.map((stage) => {
          const stageLeads = filteredLeads.filter(l => l.stage === stage.id);
          return (
            <div key={stage.id} className="w-72 shrink-0 flex flex-col">
              {/* Column Header */}
              <div className="p-3.5 bg-white border border-[#EEF2F6] rounded-t-2xl flex items-center justify-between border-b-2 border-b-orange-500">
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${stage.color}`}></span>
                  <h3 className="text-xs font-extrabold text-slate-900">{stage.title}</h3>
                </div>
                <span className="text-xs font-extrabold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                  {stageLeads.length}
                </span>
              </div>

              {/* Column Body / Cards */}
              <div className="flex-1 p-2.5 bg-slate-50/70 border-x border-b border-[#EEF2F6] rounded-b-2xl space-y-3 min-h-[500px]">
                {stageLeads.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-600 font-medium">
                    No leads in this stage
                  </div>
                ) : (
                  stageLeads.map((lead) => (
                    <div 
                      key={lead.id}
                      className="card-soft p-4 bg-white hover:border-orange-200 hover:shadow-card-hover transition-all cursor-pointer group"
                    >
                      {/* Top Channel badge & Time */}
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 flex items-center gap-1">
                          <span>{lead.flag}</span>
                          <span>{lead.channel.toUpperCase()}</span>
                        </span>
                        <span className="text-[10px] text-slate-600 font-semibold">{lead.lastTime}</span>
                      </div>

                      {/* Lead Name & Phone */}
                      <h4 className="text-sm font-extrabold text-slate-900 group-hover:text-orange-600 transition-colors">
                        {lead.name}
                      </h4>
                      <p className="text-xs font-mono text-slate-600 mt-0.5">{lead.phone}</p>

                      {/* Deal Value */}
                      <div className="mt-3 py-1.5 px-2 rounded-lg bg-orange-50/60 border border-orange-100 flex items-center justify-between text-xs font-bold text-orange-950">
                        <span>Deal Value:</span>
                        <span className="text-orange-600 font-extrabold">
                          {lead.dealValue ? `${lead.dealValue} ${lead.currency}` : 'Pending Quote'}
                        </span>
                      </div>

                      {/* Tags */}
                      <div className="flex flex-wrap gap-1 mt-3">
                        {lead.tags.map((t) => (
                          <span key={t} className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                            {t}
                          </span>
                        ))}
                      </div>

                      {/* Assigned Agent & Quick Actions */}
                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs text-slate-600">
                          <UserCheck className="w-3.5 h-3.5 text-slate-600" />
                          <span className="font-semibold truncate max-w-[100px]">{lead.assignedTo}</span>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => onOpenChat(lead.id)}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-orange-100 text-slate-600 hover:text-orange-600"
                            title="Open Chat"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                          </button>

                          {/* Quick Stage Mover Selector */}
                          <select
                            value={lead.stage}
                            onChange={(e) => moveStage(lead.id, e.target.value)}
                            className="text-[10px] font-bold bg-slate-100 hover:bg-slate-200 border-none rounded-lg p-1 text-slate-700 cursor-pointer"
                            title="Move Stage"
                          >
                            {PIPELINE_STAGES.map(s => (
                              <option key={s.id} value={s.id}>{s.id}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
