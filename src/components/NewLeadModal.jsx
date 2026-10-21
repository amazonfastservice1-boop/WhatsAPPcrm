import React, { useState } from 'react';
import { X, Smartphone, User, DollarSign, MessageSquare, Plus } from 'lucide-react';
import { CHANNELS, AGENTS } from '../data/mockData';

export default function NewLeadModal({ isOpen, onClose, onAddLead }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [channelId, setChannelId] = useState('dubai');
  const [initialMessage, setInitialMessage] = useState('Hi, I need information and pricing details.');
  const [dealValue, setDealValue] = useState('');
  const [assignedTo, setAssignedTo] = useState('Unassigned');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      alert('Please enter both name and phone number');
      return;
    }

    const channelObj = CHANNELS.find(c => c.id === channelId) || CHANNELS[1];

    const newLead = {
      id: `lead-${Date.now()}`,
      name: name.trim(),
      phone: phone.trim(),
      channel: channelId,
      channelName: channelObj.name,
      flag: channelObj.flag,
      currency: channelObj.currency,
      dealValue: dealValue || '0',
      stage: 'New Lead',
      assignedTo: assignedTo,
      unreadCount: 1,
      lastTime: 'Just now',
      tags: ['New Inbound', channelObj.country],
      notes: [],
      messages: [
        {
          id: `m-${Date.now()}`,
          sender: 'customer',
          text: initialMessage,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          status: 'delivered'
        }
      ]
    };

    onAddLead(newLead);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center font-bold">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">Nayi WhatsApp Lead Add Karein</h3>
              <p className="text-xs text-slate-500">AmazFast Service portal mein customer register karein</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Target WhatsApp Channel */}
          <div>
            <label className="text-xs font-extrabold text-slate-700 block mb-1">
              Kis WhatsApp Number Par Lead Aayi?
            </label>
            <div className="grid grid-cols-3 gap-2">
              {CHANNELS.filter(c => c.id !== 'all').map((ch) => (
                <button
                  key={ch.id}
                  type="button"
                  onClick={() => setChannelId(ch.id)}
                  className={`p-2.5 rounded-xl border text-center transition-all ${
                    channelId === ch.id
                      ? 'border-orange-500 bg-orange-50/80 text-orange-700 font-bold'
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span className="text-base block">{ch.flag}</span>
                  <span className="text-xs font-bold block mt-0.5">{ch.id.toUpperCase()}</span>
                  <span className="text-[10px] text-slate-600 block">{ch.currency}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Customer Name */}
          <div>
            <label className="text-xs font-extrabold text-slate-700 block mb-1">Customer Ka Pura Naam</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Tariq Al-Mansoor ya Ahmed Ali"
              className="w-full px-3.5 py-2 text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-orange-500"
            />
          </div>

          {/* Phone Number */}
          <div>
            <label className="text-xs font-extrabold text-slate-700 block mb-1">WhatsApp Phone Number</label>
            <input
              type="text"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. +971 50 123 4567 ya +92 300 123 4567"
              className="w-full px-3.5 py-2 text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-orange-500"
            />
          </div>

          {/* Initial Message */}
          <div>
            <label className="text-xs font-extrabold text-slate-700 block mb-1">Customer Ka Pehla Message</label>
            <textarea
              rows={2}
              value={initialMessage}
              onChange={(e) => setInitialMessage(e.target.value)}
              placeholder="Customer ne WhatsApp par kya pucha..."
              className="w-full px-3.5 py-2 text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-orange-500"
            ></textarea>
          </div>

          {/* Deal Value & Agent */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-extrabold text-slate-700 block mb-1">Deal Value (Approx)</label>
              <input
                type="text"
                value={dealValue}
                onChange={(e) => setDealValue(e.target.value)}
                placeholder="e.g. 15,000"
                className="w-full px-3.5 py-2 text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-orange-500"
              />
            </div>
            <div>
              <label className="text-xs font-extrabold text-slate-700 block mb-1">Assign to Agent</label>
              <select
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                className="w-full px-3 py-2 text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-orange-500"
              >
                <option value="Unassigned">-- Auto Round-Robin --</option>
                {AGENTS.map((a) => (
                  <option key={a.id} value={a.name}>{a.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Buttons */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-orange-500 hover:bg-orange-600 shadow-sm shadow-orange-500/30"
            >
              Capture Lead
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
