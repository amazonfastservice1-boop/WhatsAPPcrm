import React, { useState, useMemo } from 'react';
import { X, Smartphone, User, DollarSign, MessageSquare, Plus, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';
import { CHANNELS, AGENTS } from '../data/mockData';
import { normalizePhoneNumber } from '../utils/leadFilters';
import { AMAZFAST_SERVICES } from '../data/servicesList';

export default function NewLeadModal({ 
  isOpen, 
  onClose, 
  onAddLead, 
  channels = [], 
  selectedChannel = 'all',
  leads = [],
  onOpenChat
}) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const activeChannels = channels.filter(c => c.id !== 'all');
  const defaultChannelId = (selectedChannel && selectedChannel !== 'all') 
    ? selectedChannel 
    : (activeChannels[0]?.id || '');
  const [channelId, setChannelId] = useState(defaultChannelId);
  const [initialMessage, setInitialMessage] = useState('');
  const [dealValue, setDealValue] = useState('');
  const [serviceInterest, setServiceInterest] = useState('US LLC Formation');
  const [assignedTo, setAssignedTo] = useState('Unassigned');

  React.useEffect(() => {
    if (selectedChannel && selectedChannel !== 'all') {
      setChannelId(selectedChannel);
    } else if (activeChannels.length > 0 && !channelId) {
      setChannelId(activeChannels[0].id);
    }
  }, [selectedChannel, channels]);

  const cleanDigits = phone.replace(/[^0-9]/g, '');
  const normalizedPreview = normalizePhoneNumber(phone);

  // Real-time duplicate check across existing leads
  const existingLeadMatch = useMemo(() => {
    if (cleanDigits.length < 8) return null;
    const norm = normalizedPreview;
    return leads.find(l => {
      const lDigits = (l.phone || '').replace(/[^0-9]/g, '');
      return l.phone === norm || (cleanDigits.length >= 9 && lDigits.endsWith(cleanDigits)) || (cleanDigits.length >= 10 && lDigits.includes(cleanDigits));
    });
  }, [phone, cleanDigits, normalizedPreview, leads]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim() && !existingLeadMatch) {
      alert('Please enter customer name');
      return;
    }
    if (!phone.trim()) {
      alert('Please enter phone number');
      return;
    }

    const cleanPhone = normalizePhoneNumber(phone.trim());

    onAddLead({
      name: (name.trim() || existingLeadMatch?.name || cleanPhone),
      phone: cleanPhone,
      channelId: existingLeadMatch ? (existingLeadMatch.channel || channelId) : channelId,
      dealValue: dealValue || existingLeadMatch?.dealValue || '0',
      serviceInterest: serviceInterest || existingLeadMatch?.serviceInterest || '',
      initialMessage: initialMessage.trim(),
    });
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
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {activeChannels.map((ch) => (
                <button
                  key={ch.id}
                  type="button"
                  onClick={() => setChannelId(ch.id)}
                  className={`p-2.5 rounded-xl border text-center transition-all ${
                    channelId === ch.id
                      ? 'border-orange-500 bg-orange-50/80 text-orange-700 font-bold shadow-xs'
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span className="text-base block">{ch.flag}</span>
                  <span className="text-xs font-bold block mt-0.5 truncate">{ch.name}</span>
                  <span className="text-[10px] text-slate-500 font-mono block">{ch.number}</span>
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
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-extrabold text-slate-700">WhatsApp Mobile Number</label>
              {normalizedPreview && (
                <span className="text-[11px] font-mono font-bold text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> E.164: {normalizedPreview}
                </span>
              )}
            </div>
            <input
              type="text"
              required
              value={phone}
              onChange={(e) => {
                const val = e.target.value;
                setPhone(val);
              }}
              placeholder="e.g. 0315 2072844 ya +92 300 1234567"
              className={`w-full px-3.5 py-2 text-xs font-medium bg-slate-50 border rounded-xl focus:outline-none font-mono ${
                existingLeadMatch ? 'border-amber-400 focus:border-amber-500' : 'border-slate-200 focus:border-orange-500'
              }`}
            />
            <p className="text-[10px] text-slate-400 mt-1">
              Tip: Aap 03... ya +92... dono likh sakte hain, system automatically WhatsApp format mein convert kar dega.
            </p>
          </div>

          {/* Real-time Existing Customer Warning Card */}
          {existingLeadMatch && (
            <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-xs space-y-2 animate-in fade-in">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-amber-900 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Customer Pehle Se CRM Mein Mojood Hai!</span>
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-200 text-amber-900 border border-amber-300">
                  {existingLeadMatch.stage}
                </span>
              </div>
              
              <div className="flex items-center gap-3 bg-white/90 p-2.5 rounded-lg border border-amber-200">
                <img 
                  src={existingLeadMatch.avatar} 
                  alt={existingLeadMatch.name} 
                  className="w-9 h-9 rounded-full object-cover border border-amber-200" 
                />
                <div className="min-w-0 flex-1">
                  <p className="font-black text-slate-900 truncate">{existingLeadMatch.name}</p>
                  <p className="text-[10px] font-mono text-slate-500">{existingLeadMatch.phone} • {existingLeadMatch.channelName}</p>
                  <p className="text-[10px] text-slate-600 mt-0.5">
                    Messages: <span className="font-bold">{existingLeadMatch.messages?.length || 0}</span> • Value: <span className="font-bold">PKR {existingLeadMatch.dealValue || '0'}</span>
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    if (onOpenChat) onOpenChat(existingLeadMatch.id);
                  }}
                  className="w-full sm:flex-1 py-1.5 px-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-xs shadow-2xs transition-all flex items-center justify-center gap-1.5"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Mojooda Chat Kholein</span>
                </button>
                <span className="text-[10px] text-amber-800 font-medium text-center sm:text-left">
                  Ya info update karne ke liye neechay submit karein (Purana data mehfooz rahega)
                </span>
              </div>
            </div>
          )}

          {/* Initial Message (Single Field, truly optional) */}
          <div>
            <label className="text-xs font-extrabold text-slate-700 block mb-1">
              Pehla WhatsApp Message {existingLeadMatch ? '(Pehle se baat chal rahi hai to khali chhor dein)' : '(Optional)'}
            </label>
            <textarea
              rows={2}
              value={initialMessage}
              onChange={(e) => setInitialMessage(e.target.value)}
              placeholder="Customer ko foran bhejney ke liye message likhein (warna khali chhor dein)..."
              className="w-full px-3.5 py-2 text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-orange-500"
            />
          </div>

          {/* Service Selection Dropdown */}
          <div>
            <label className="text-xs font-extrabold text-slate-700 block mb-1">
              💼 Kis Service Ke Liye Interested Hai? (AmazFast Service)
            </label>
            <select
              value={serviceInterest}
              onChange={(e) => setServiceInterest(e.target.value)}
              className="w-full px-3 py-2 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-orange-500 text-slate-800"
            >
              {AMAZFAST_SERVICES.map((s) => (
                <option key={s.id} value={s.shortLabel}>
                  {s.label}
                </option>
              ))}
            </select>
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
              className={`px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-sm transition-all ${
                existingLeadMatch 
                  ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-500/30' 
                  : 'bg-orange-500 hover:bg-orange-600 shadow-orange-500/30'
              }`}
            >
              {existingLeadMatch ? 'Update Karein & Chat Kholein' : '+ Naya Customer Register Karein'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
