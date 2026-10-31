import React, { useState, useEffect } from 'react';
import { 
  Smartphone, 
  CheckCircle2, 
  RefreshCw, 
  Key, 
  ShieldCheck, 
  Globe, 
  MessageSquare, 
  Copy, 
  Settings2, 
  Save, 
  Loader2, 
  AlertCircle, 
  Eye, 
  EyeOff, 
  Plus, 
  Layers, 
  ExternalLink 
} from 'lucide-react';
import { api } from '../services/api';

export default function ChannelsView() {
  const [realChannels, setRealChannels] = useState([]);
  const [loadingChannels, setLoadingChannels] = useState(true);

  // Meta Cloud API Configuration Form State
  const [metaConfig, setMetaConfig] = useState({
    wabaId: '1976171253043547',
    phoneId: '1323808554145124',
    token: '',
    phoneNumber: '+92 332 2568950',
    channelId: '',
    verifyToken: 'amazfast_crm_secure_verify_token_2026',
    isLive: false,
    verifiedName: 'Amazon Fast services',
  });

  const [showToken, setShowToken] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null); // success | error | null
  const [saveMessage, setSaveMessage] = useState('');
  const [copiedWebhook, setCopiedWebhook] = useState(false);

  // 1. Fetch real channels from database
  const loadData = async () => {
    setLoadingChannels(true);
    try {
      if (!localStorage.getItem('token')) {
        await api.login();
      }
      const chRes = await api.getChannels(true);
      if (chRes?.channels && chRes.channels.length > 0) {
        setRealChannels(chRes.channels);
        const pkChannel = chRes.channels.find(c => c.isActive && c.countryCode === 'PK') || chRes.channels[0];
        if (pkChannel) {
          setMetaConfig(prev => ({
            ...prev,
            channelId: prev.channelId || pkChannel.id,
            phoneNumber: prev.phoneNumber || pkChannel.phoneNumber,
            phoneId: prev.phoneId || pkChannel.phoneIdMeta || '1323808554145124',
          }));
        }
      }

      const cfgRes = await api.getMetaConfig();
      if (cfgRes) {
        setMetaConfig(prev => ({
          ...prev,
          wabaId: cfgRes.wabaId || prev.wabaId,
          phoneId: cfgRes.phoneId || prev.phoneId,
          token: prev.token || (cfgRes.maskedToken ? '' : prev.token),
          verifyToken: cfgRes.verifyToken || prev.verifyToken,
          isLive: cfgRes.isLive,
          verifiedName: cfgRes.verifiedName || prev.verifiedName,
          displayNumber: cfgRes.displayNumber || prev.phoneNumber,
        }));
      }
    } catch (err) {
      console.warn('Failed to load channels data:', err);
    } finally {
      setLoadingChannels(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Save Meta Configuration
  const handleSaveMeta = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveStatus(null);
    setSaveMessage('');

    try {
      const payload = {
        channelId: metaConfig.channelId,
        phoneIdMeta: metaConfig.phoneId,
        phoneNumber: metaConfig.phoneNumber,
        metaToken: metaConfig.token,
        metaWabaId: metaConfig.wabaId,
      };

      const res = await api.updateMetaConfig(payload);
      if (res.success) {
        setSaveStatus('success');
        setSaveMessage(res.message || 'Meta WhatsApp Cloud API credentials updated!');
        await loadData();
      } else {
        setSaveStatus('error');
        setSaveMessage(res.error || 'Failed to update credentials.');
      }
    } catch (err) {
      setSaveStatus('error');
      setSaveMessage(err.message || 'Network error.');
    } finally {
      setIsSaving(false);
    }
  };

  const copyWebhookUrl = () => {
    const url = 'https://stallion-panning-ether.ngrok-free.dev/api/webhook';
    navigator.clipboard?.writeText(url);
    setCopiedWebhook(true);
    setTimeout(() => setCopiedWebhook(false), 2000);
  };

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
            WhatsApp Business Numbers & Multi-Country Channels
          </h2>
          <p className="text-xs text-slate-600 font-medium mt-0.5">
            Meta Cloud API official credentials configure karein aur international numbers link karein.
          </p>
        </div>

        <button 
          onClick={loadData}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold shadow-2xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loadingChannels ? 'animate-spin' : ''}`} /> Refresh Status
        </button>
      </div>

      {/* Meta API Live Status Hero Banner */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50 to-blue-50 border border-emerald-200 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-white shadow-sm bg-emerald-600">
            <CheckCircle2 className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-extrabold text-slate-900">
                Official Meta Cloud API: {metaConfig.verifiedName} ({metaConfig.phoneNumber})
              </h4>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold border bg-emerald-100 text-emerald-800 border-emerald-300">
                CONNECTED & ACTIVE
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-0.5">
              Phone ID: <span className="font-mono font-bold text-slate-800">{metaConfig.phoneId}</span> | WABA ID: <span className="font-mono font-bold text-slate-800">{metaConfig.wabaId}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <a 
            href="https://developers.facebook.com/apps/1794853781722577/whatsapp-business/quickstart/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold shadow-2xs"
          >
            <ExternalLink className="w-3.5 h-3.5" /> Meta Console
          </a>
        </div>
      </div>

      {/* Direct API Token & Credentials Input Panel */}
      <div className="card-soft p-6 bg-white border border-slate-200 rounded-2xl shadow-xs">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
              <Key className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">
                Meta Cloud API Credentials Management (Easy Input)
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Yahan se aap direct apna Meta Permanent Token, Phone ID aur WABA ID bina code chherhe update kar sakte hain.
              </p>
            </div>
          </div>
          <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" /> Secure Backend Storage
          </span>
        </div>

        <form onSubmit={handleSaveMeta} className="mt-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Field 1: Access Token */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Meta System User Permanent Access Token
              </label>
              <div className="relative">
                <input
                  type={showToken ? 'text' : 'password'}
                  value={metaConfig.token}
                  onChange={(e) => setMetaConfig({ ...metaConfig, token: e.target.value })}
                  placeholder="EAAZAga... (Token paste karein agar naya token lagana ho)"
                  className="w-full pl-3 pr-20 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-orange-500 focus:outline-none rounded-xl text-xs font-mono text-slate-800"
                />
                <button
                  type="button"
                  onClick={() => setShowToken(!showToken)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs flex items-center gap-1 px-2 py-1 rounded"
                >
                  {showToken ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  {showToken ? 'Hide' : 'Show'}
                </button>
              </div>
              <p className="text-[11px] text-slate-600 mt-1">
                Aapka current token already backend mein safely save hai. Agar naya token dalna ho to yahan paste karein.
              </p>
            </div>

            {/* Field 2: WABA ID */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                WhatsApp Business Account (WABA) ID
              </label>
              <input
                type="text"
                value={metaConfig.wabaId}
                onChange={(e) => setMetaConfig({ ...metaConfig, wabaId: e.target.value })}
                placeholder="1976171253043547"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:bg-white focus:border-orange-500 focus:outline-none rounded-xl text-xs font-mono text-slate-800"
                required
              />
            </div>

            {/* Field 3: Phone Number ID */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Phone Number ID (Meta Dispatch Target)
              </label>
              <input
                type="text"
                value={metaConfig.phoneId}
                onChange={(e) => setMetaConfig({ ...metaConfig, phoneId: e.target.value })}
                placeholder="1323808554145124"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:bg-white focus:border-orange-500 focus:outline-none rounded-xl text-xs font-mono text-slate-800"
                required
              />
            </div>

            {/* Field 4: Display Phone Number */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                WhatsApp Phone Number
              </label>
              <input
                type="text"
                value={metaConfig.phoneNumber}
                onChange={(e) => setMetaConfig({ ...metaConfig, phoneNumber: e.target.value })}
                placeholder="+92 332 2568950"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:bg-white focus:border-orange-500 focus:outline-none rounded-xl text-xs font-bold text-slate-800"
                required
              />
            </div>

            {/* Field 5: Target Country Channel */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Select Channel / Region to Configure
              </label>
              <select
                value={metaConfig.channelId}
                onChange={(e) => {
                  const val = e.target.value;
                  const matched = realChannels.find(c => c.id === val);
                  if (matched) {
                    setMetaConfig(prev => ({
                      ...prev,
                      channelId: matched.id,
                      phoneNumber: matched.phoneNumber || '',
                      phoneId: matched.phoneIdMeta || '',
                    }));
                  } else {
                    setMetaConfig(prev => ({
                      ...prev,
                      channelId: val,
                    }));
                  }
                }}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:bg-white focus:border-orange-500 focus:outline-none rounded-xl text-xs font-bold text-slate-800"
              >
                {realChannels.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.countryCode === 'PK' ? '🇵🇰' : c.countryCode === 'AE' ? '🇦🇪' : '🇸🇦'} {c.name} {c.isActive ? '(Active)' : '(Pending Setup)'}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Feedback Alert */}
          {saveStatus && (
            <div className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
              saveStatus === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
            }`}>
              {saveStatus === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" /> : <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />}
              <span>{saveMessage}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={copyWebhookUrl}
              className="text-xs font-bold text-slate-600 hover:text-orange-600 flex items-center gap-1.5"
            >
              <Copy className="w-3.5 h-3.5" /> {copiedWebhook ? 'Copied Webhook URL!' : 'Copy Webhook URL'}
            </button>

            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-all disabled:opacity-50"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {isSaving ? 'Saving & Verifying...' : 'Save & Test Meta Connection'}
            </button>
          </div>
        </form>
      </div>

      {/* Guide: How to connect Dubai, Saudi & Additional Numbers */}
      <div className="card-soft p-6 bg-slate-900 text-white rounded-2xl shadow-lg space-y-4">
        <div className="flex items-center gap-2.5">
          <Layers className="w-5 h-5 text-orange-400" />
          <h3 className="text-base font-extrabold text-white">
            Doosre Numbers (Dubai, Saudi, Pak-2) Kaise Connect Honge? (Guide)
          </h3>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          Jab aapka yeh pehla number active ho jayega, to baqi numbers connect karna sirf <strong>1 minute ka kaam</strong> hai, kyunki aapka Meta Developer App aur System User Token sabke liye <strong>SAME (aik hi)</strong> use hota hai!
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700/80 space-y-1.5">
            <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-orange-500/20 text-orange-400">Step 1</span>
            <h4 className="text-xs font-bold text-white">Meta Mein Naya Number Add Karein</h4>
            <p className="text-[11px] text-slate-300">
              WhatsApp Manager ➔ Phone Numbers ➔ <strong>"+ Add Phone Number"</strong> dabayein aur apna Dubai (+971) ya Saudi (+966) number daalein.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700/80 space-y-1.5">
            <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-teal-500/20 text-teal-400">Step 2</span>
            <h4 className="text-xs font-bold text-white">Phone ID Copy Karein</h4>
            <p className="text-[11px] text-slate-300">
              Meta har number ke liye ek alag <strong>Phone Number ID</strong> deta hai. Us number ka Phone ID copy karein.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700/80 space-y-1.5">
            <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400">Step 3</span>
            <h4 className="text-xs font-bold text-white">Upar Form Mein Select & Save</h4>
            <p className="text-[11px] text-slate-300">
              Upar wale form mein <strong>Dubai / Saudi Channel</strong> select karke Phone ID paste karke <strong>Save</strong> dabayein. Foran CRM se connect ho jayega!
            </p>
          </div>
        </div>
      </div>

      {/* 3 Real Configured Database Channels */}
      <div>
        <h3 className="text-sm font-extrabold text-slate-900 mb-3">
          Currently Configured WhatsApp Channels in Database
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {realChannels.map((ch) => (
            <div key={ch.id} className="card-soft p-5 bg-white border border-slate-200 rounded-xl flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <span className="text-2xl">{ch.countryCode === 'PK' ? '🇵🇰' : ch.countryCode === 'AE' ? '🇦🇪' : '🇸🇦'}</span>
                    <div>
                      <h4 className="text-xs font-extrabold text-slate-900">{ch.name}</h4>
                      <p className="text-[11px] font-mono font-bold text-orange-600 mt-0.5">{ch.phoneNumber}</p>
                    </div>
                  </div>

                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    ch.phoneIdMeta ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'
                  }`}>
                    {ch.phoneIdMeta ? 'Meta API Ready' : 'Config Pending'}
                  </span>
                </div>

                <div className="mt-4 space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-slate-50">
                    <span className="text-slate-500 font-medium">Gateway Protocol:</span>
                    <span className="font-extrabold text-slate-800">{ch.provider}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-50">
                    <span className="text-slate-500 font-medium">Meta Phone ID:</span>
                    <span className="font-mono text-[11px] text-slate-700 font-semibold truncate max-w-[150px]">
                      {ch.phoneIdMeta || 'Not mapped'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-50">
                    <span className="text-slate-500 font-medium">Currency:</span>
                    <span className="font-extrabold text-slate-800">{ch.currency}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-500 font-medium">Database Leads:</span>
                    <span className="font-extrabold text-slate-900">{ch._count?.leads || 0} Leads</span>
                  </div>
                </div>
              </div>

              <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[10px] text-slate-600 font-bold uppercase">{ch.countryName}</span>
                <button
                  onClick={() => {
                    setMetaConfig(prev => ({
                      ...prev,
                      channelId: ch.id,
                      phoneNumber: ch.phoneNumber,
                      phoneId: ch.phoneIdMeta || '',
                    }));
                    window.scrollTo({ top: 100, behavior: 'smooth' });
                  }}
                  className="text-xs font-bold text-orange-600 hover:text-orange-700"
                >
                  Edit Credentials ↑
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
