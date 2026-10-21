import React, { useState } from 'react';
import { Smartphone, QrCode, CheckCircle2, RefreshCw, Key, ShieldCheck, Globe, MessageSquare, Copy } from 'lucide-react';

export default function ChannelsView() {
  const [channels, setChannels] = useState([
    {
      id: 'dubai',
      name: 'Dubai / UAE Branch',
      flag: '🇦🇪',
      number: '+971 50 492 8812',
      country: 'United Arab Emirates',
      currency: 'AED',
      provider: 'Meta Cloud API',
      status: 'Connected',
      battery: '100% Cloud',
      todayMsgs: 342,
      welcomeMsg: 'Assalam o Alaikum! Welcome to our Dubai Branch. How can we assist you with our services today?'
    },
    {
      id: 'saudi',
      name: 'Saudi Arabia Branch',
      flag: '🇸🇦',
      number: '+966 54 810 9931',
      country: 'Saudi Arabia',
      currency: 'SAR',
      provider: 'Meta Cloud API',
      status: 'Connected',
      battery: '100% Cloud',
      todayMsgs: 289,
      welcomeMsg: 'أهلاً بك في فرع المملكة العربية السعودية! يسعدنا تقديم الاستشارة وعروض الأسعار المعتمدة.'
    },
    {
      id: 'pakistan',
      name: 'Pakistan Branch',
      flag: '🇵🇰',
      number: '+92 300 847 2190',
      country: 'Pakistan',
      currency: 'PKR',
      provider: 'Baileys Multi-Session QR',
      status: 'Connected',
      battery: 'Phone Online (92%)',
      todayMsgs: 198,
      welcomeMsg: 'Assalam o Alaikum! Hamari sales team se rabta karne ka shukriya. Hum jald apko reply dete hain.'
    }
  ]);

  const [activeQrModal, setActiveQrModal] = useState(null);

  const copyWebhook = () => {
    navigator.clipboard?.writeText('https://crm-whatsapp-backend.app/api/webhooks/whatsapp');
    alert('Webhook URL copied to clipboard: https://crm-whatsapp-backend.app/api/webhooks/whatsapp');
  };

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
            WhatsApp Business Numbers & Channels
          </h2>
          <p className="text-xs text-slate-600 font-medium mt-0.5">
            Manage international lines (Dubai, Saudi Arabia, Pakistan) with auto-routing.
          </p>
        </div>

        <button 
          onClick={() => setActiveQrModal('new')}
          className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold shadow-sm shadow-orange-500/30 transition-all"
        >
          <Smartphone className="w-4 h-4" /> + Connect New WhatsApp Number
        </button>
      </div>

      {/* Webhook Gateway Info Card */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-orange-500/10 via-amber-500/10 to-transparent border border-orange-200/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-500 text-white flex items-center justify-center font-bold">
            <Key className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-extrabold text-slate-900">Universal Inbound Webhook Endpoint</h4>
            <p className="text-[11px] font-mono text-slate-600">https://crm-whatsapp-backend.app/api/webhooks/whatsapp</p>
          </div>
        </div>

        <button 
          onClick={copyWebhook}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold shadow-2xs shrink-0"
        >
          <Copy className="w-3.5 h-3.5 text-slate-500" /> Copy Webhook URL
        </button>
      </div>

      {/* 3 WhatsApp Channel Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {channels.map((ch) => (
          <div key={ch.id} className="card-soft p-5 bg-white flex flex-col justify-between">
            <div>
              {/* Header */}
              <div className="flex items-start justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <span className="text-2xl">{ch.flag}</span>
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900">{ch.name}</h3>
                    <p className="text-xs font-mono font-bold text-orange-600 mt-0.5">{ch.number}</p>
                  </div>
                </div>

                <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  {ch.status}
                </span>
              </div>

              {/* Specs */}
              <div className="mt-4 space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-600 font-semibold">Gateway Protocol:</span>
                  <span className="font-extrabold text-slate-800">{ch.provider}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-600 font-semibold">Local Currency:</span>
                  <span className="font-extrabold text-orange-600">{ch.currency}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-600 font-semibold">Today Messages:</span>
                  <span className="font-extrabold text-slate-800">{ch.todayMsgs} sent/recv</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-600 font-semibold">Uptime Status:</span>
                  <span className="font-extrabold text-emerald-600">{ch.battery}</span>
                </div>
              </div>

              {/* Country Welcome Template */}
              <div className="mt-4 p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                <span className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider block mb-1">
                  Auto Welcome Message:
                </span>
                <p className="text-slate-700 font-medium italic text-[11px]">"{ch.welcomeMsg}"</p>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-5 pt-3 border-t border-slate-100 flex items-center gap-2">
              <button 
                onClick={() => setActiveQrModal(ch.id)}
                className="flex-1 py-2 px-3 rounded-xl bg-slate-100 hover:bg-orange-50 hover:text-orange-700 text-slate-700 text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
              >
                <QrCode className="w-3.5 h-3.5" /> Re-scan QR / Session
              </button>
              <button 
                onClick={() => alert(`Synchronized connection for ${ch.name}!`)}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600"
                title="Sync Status"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* QR Code Scanner Simulator Modal */}
      {activeQrModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 text-center space-y-4 shadow-2xl animate-fade-in border border-slate-100">
            <div className="w-12 h-12 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center mx-auto">
              <QrCode className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-base font-extrabold text-slate-900">Scan WhatsApp QR Code</h3>
              <p className="text-xs text-slate-600 mt-1">
                Open WhatsApp on your phone ➔ Linked Devices ➔ Link a Device.
              </p>
            </div>

            {/* QR Mockup */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 inline-block shadow-inner">
              <img 
                src="https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=WHATSAPP_CRM_SESSION_DEMO_OK" 
                alt="WhatsApp QR Code"
                className="w-44 h-44 mx-auto rounded-lg"
              />
            </div>

            <p className="text-[11px] font-semibold text-emerald-600 flex items-center justify-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Waiting for scan from mobile app...
            </p>

            <button
              onClick={() => setActiveQrModal(null)}
              className="w-full py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition-colors"
            >
              Done / Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
