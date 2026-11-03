import React, { useState, useRef } from 'react';
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
  DollarSign,
  AlertCircle,
  Mic,
  Play,
  Edit2,
  Check,
  Loader2,
  MessageSquare,
  X,
  RefreshCw,
  Trash2,
  Forward,
  ArrowDown,
  Image as ImageIcon,
  FileText,
  Download,
  ExternalLink,
  File,
  Users,
  Video,
  Calendar,
  Plus,
  Info
} from 'lucide-react';
import { AGENTS, PIPELINE_STAGES, QUICK_REPLIES } from '../data/mockData';
import { AMAZFAST_SERVICES, getServiceMeta } from '../data/servicesList';
import { api, SERVER_BASE } from '../services/api';
import { formatChannelDisplayName, formatSafeTime, isLeadToday } from '../utils/leadFilters';
import { convertBlobToMp3 } from '../utils/audioEncoder';

const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

function getMediaSrc(url) {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:') || url.startsWith('blob:')) return url;
  if (url.startsWith('/')) return `${SERVER_BASE}${url}`;
  return `${SERVER_BASE}/api/messages/media/${url}`;
}

/**
 * Render message text with auto-detected clickable blue links
 */
function renderMessageContent(text, isCustomer) {
  if (!text) return null;
  // Match URLs starting with http://, https://, or www.
  const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;
  const parts = text.split(urlRegex);

  return parts.map((part, index) => {
    if (part.match(urlRegex)) {
      const href = part.startsWith('www.') ? `https://${part}` : part;
      return (
        <a
          key={index}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className={`underline font-bold break-all transition-colors ${
            isCustomer 
              ? 'text-blue-600 hover:text-blue-800' 
              : 'text-sky-200 hover:text-white underline decoration-sky-300'
          }`}
        >
          {part}
        </a>
      );
    }
    return <span key={index}>{part}</span>;
  });
}

export function formatTo12Hour(timeStr) {
  if (!timeStr) return '';
  if (/am|pm/i.test(timeStr)) return timeStr;
  const parts = timeStr.split(':');
  if (parts.length < 2) return timeStr;
  let hours = parseInt(parts[0], 10);
  const minutes = parts[1];
  if (isNaN(hours)) return timeStr;
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  return `${hours.toString().padStart(2, '0')}:${minutes} ${ampm}`;
}

export function parseTimeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const match12 = timeStr.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (match12) {
    let hours = parseInt(match12[1], 10);
    const minutes = parseInt(match12[2], 10);
    const ampm = match12[3].toUpperCase();
    if (ampm === 'PM' && hours < 12) hours += 12;
    if (ampm === 'AM' && hours === 12) hours = 0;
    return hours * 60 + minutes;
  }
  const parts = timeStr.split(':');
  if (parts.length >= 2) {
    const hours = parseInt(parts[0], 10) || 0;
    const minutes = parseInt(parts[1], 10) || 0;
    return hours * 60 + minutes;
  }
  return 0;
}

function isAudioMessage(msg) {
  if (!msg) return false;
  if (msg.mediaType?.toUpperCase() === 'AUDIO') return true;
  if (/^voice note$/i.test(msg.text?.trim() || '')) return true;
  if (/\.(mp3|ogg|opus|wav|m4a|aac)($|\?)/i.test(msg.mediaUrl || '')) return true;
  if (/\.(mp3|ogg|opus|wav|m4a|aac)($|\?)/i.test(msg.text || '')) return true;
  return false;
}

function isPdfMessage(msg) {
  if (!msg) return false;
  if (/\.pdf($|\?)/i.test(msg.mediaUrl || '')) return true;
  if (/\.pdf($|\?)/i.test(msg.text || '')) return true;
  if ((msg.mediaType?.toUpperCase() === 'DOCUMENT' || msg.mediaType?.toUpperCase() === 'APPLICATION') && 
      (msg.text?.toLowerCase().includes('.pdf') || !msg.text || msg.text === 'Document')) return true;
  return false;
}

function isDocMessage(msg) {
  if (!msg) return false;
  if (msg.mediaType?.toUpperCase() === 'DOCUMENT' || msg.mediaType?.toUpperCase() === 'APPLICATION') return true;
  if (/\.(pdf|doc|docx|xls|xlsx|ppt|pptx|txt|csv|zip)($|\?)/i.test(msg.mediaUrl || '')) return true;
  if (/\.(pdf|doc|docx|xls|xlsx|ppt|pptx|txt|csv|zip)($|\?)/i.test(msg.text || '')) return true;
  return false;
}

function isImageMessage(msg) {
  if (!msg) return false;
  if (msg.mediaType?.toUpperCase() === 'IMAGE') return true;
  if (/\.(jpe?g|png|gif|webp|svg)($|\?)/i.test(msg.mediaUrl || '')) return true;
  return false;
}

function isVideoMessage(msg) {
  if (!msg) return false;
  if (msg.mediaType?.toUpperCase() === 'VIDEO') return true;
  if (/\.(mp4|mov|webm|mkv|3gp)($|\?)/i.test(msg.mediaUrl || '')) return true;
  return false;
}

function formatDocFileName(name) {
  if (!name || name === 'Document' || name === 'WhatsApp Document') return 'WhatsApp_Document.pdf';
  if (/^[a-f0-9]{20,}\.pdf$/i.test(name)) {
    return `Doc_${name.slice(0, 8)}...pdf`;
  }
  return name;
}

export function getStageBadgeStyle(stage) {
  switch (stage) {
    case 'Qualified':
      return 'bg-purple-100 text-purple-800 border-purple-200';
    case 'Proposal Sent':
      return 'bg-amber-100 text-amber-800 border-amber-200';
    case 'Deal Won':
      return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    case 'Contacted':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'New Lead':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'Lost':
    case 'Unqualified':
    case 'Unqualified (Rejected)':
      return 'bg-rose-100 text-rose-800 border-rose-300 font-extrabold';
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200';
  }
}

function LiveSyncLoader() {
  const [percent, setPercent] = React.useState(15);
  const [stepText, setStepText] = React.useState('Render Cloud Server Se Connect Ho Raha Hai...');

  React.useEffect(() => {
    const t1 = setTimeout(() => {
      setPercent(38);
      setStepText('WhatsApp Lines & Database Channels Sync Ho Rahe Hain...');
    }, 900);
    const t2 = setTimeout(() => {
      setPercent(64);
      setStepText('Customer WhatsApp Chats & Messages Decrypt Ho Rahe Hain...');
    }, 2200);
    const t3 = setTimeout(() => {
      setPercent(86);
      setStepText('AmazFast Sales Pipelines & Stages Finalize Ho Rahi Hain...');
    }, 4500);
    const t4 = setTimeout(() => {
      setPercent(98);
      setStepText('Final Sync... Live Conversations Tayyar Hain');
    }, 7500);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, []);

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-[#F4F5F8]">
      <div className="max-w-md w-full bg-white p-7 rounded-3xl border border-slate-200/80 shadow-xl space-y-5 animate-fade-in">
        <div className="relative mx-auto w-16 h-16 flex items-center justify-center">
          <div className="absolute inset-0 rounded-2xl bg-orange-500/20 animate-ping" />
          <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-tr from-orange-600 to-amber-500 text-white flex items-center justify-center shadow-lg shadow-orange-500/30">
            <MessageSquare className="w-8 h-8" />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-black uppercase tracking-wider text-orange-600 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
              Live Database Synchronization
            </span>
            <span className="text-sm font-black font-mono text-slate-900 bg-orange-50 px-2.5 py-0.5 rounded-full border border-orange-200">
              {percent}%
            </span>
          </div>

          <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200">
            <div 
              className="h-full bg-gradient-to-r from-orange-500 via-amber-500 to-emerald-500 rounded-full transition-all duration-700 ease-out shadow-xs"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>

        <div className="space-y-1">
          <p className="text-xs font-extrabold text-slate-800 transition-all">
            {stepText}
          </p>
          <p className="text-[11px] text-slate-500">
            Database se 450+ customers aur real WhatsApp messages sync ho rahe hain.
          </p>
        </div>

        <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
          <span>Cloud Gateway: Active</span>
          <span className="text-emerald-600 font-bold">24/7 Background Connected</span>
        </div>
      </div>
    </div>
  );
}

export default function LiveChatView({ 
  leads = [], 
  selectedLeadId, 
  setSelectedLeadId, 
  selectedChannel, 
  setSelectedChannel,
  channels = [],
  onUpdateLead,
  onRefreshLeads,
  onOpenNewLead
}) {
  const [filterTab, setFilterTab] = useState('all'); // all, unassigned, mine, unread
  const [selectedServiceFilter, setSelectedServiceFilter] = useState('all'); // 'all' or service id
  const [inputText, setInputText] = useState('');
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [searchLeadTerm, setSearchLeadTerm] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);
  const [editNameVal, setEditNameVal] = useState('');
  const [pendingImage, setPendingImage] = useState(null); // { file, previewUrl, base64 }
  const [isUploading, setIsUploading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showCustomerDetails, setShowCustomerDetails] = useState(false);
  const fileInputRef = useRef(null);

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingTimerRef = useRef(null);

  // Chat Scroll & Auto-alignment states
  const messagesEndRef = useRef(null);
  const chatScrollContainerRef = useRef(null);
  const [showScrollBottomBtn, setShowScrollBottomBtn] = useState(false);

  // Message Reactions & Forward states
  const [activeReactionMsgId, setActiveReactionMsgId] = useState(null);
  const [forwardingMsg, setForwardingMsg] = useState(null);
  const [forwardSearch, setForwardSearch] = useState('');
  const [forwardSuccessToast, setForwardSuccessToast] = useState(null);

  // Customer Follow-up & Reminders (Right Sidebar)
  const [leadReminders, setLeadReminders] = useState(() => {
    try {
      const saved = localStorage.getItem('crm_schedule_reminders');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed to load reminders:', e);
    }
    return [];
  });
  const [showAddReminderForm, setShowAddReminderForm] = useState(false);
  const [editingRemId, setEditingRemId] = useState(null);
  const [newRemTitle, setNewRemTitle] = useState('');
  const [newRemDate, setNewRemDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [newRemHour, setNewRemHour] = useState('05');
  const [newRemMinute, setNewRemMinute] = useState('00');
  const [newRemAmPm, setNewRemAmPm] = useState('PM');
  const [newRemCustomMsg, setNewRemCustomMsg] = useState('');
  const [newRemAutoSend, setNewRemAutoSend] = useState(true);
  const [newRemPriority, setNewRemPriority] = useState('HIGH');
  const [sendingReminderId, setSendingReminderId] = useState(null);
  const [reminderToast, setReminderToast] = useState(null);
  const [smartBarToast, setSmartBarToast] = useState(null);

  const saveRemindersToStorage = (updated) => {
    setLeadReminders(updated);
    try {
      localStorage.setItem('crm_schedule_reminders', JSON.stringify(updated));
      window.dispatchEvent(new Event('crm_reminders_updated'));
    } catch (e) {
      console.warn(e);
    }
  };

  // Sync across tabs and ScheduleView
  const [realStaffList, setRealStaffList] = useState([]);
  React.useEffect(() => {
    api.getStaff().then((res) => {
      if (res?.users) setRealStaffList(res.users);
    }).catch(() => {});
  }, []);

  React.useEffect(() => {
    const handleSync = () => {
      try {
        const saved = localStorage.getItem('crm_schedule_reminders');
        if (saved) setLeadReminders(JSON.parse(saved));
      } catch (e) {}
    };
    window.addEventListener('crm_reminders_updated', handleSync);
    window.addEventListener('storage', handleSync);
    return () => {
      window.removeEventListener('crm_reminders_updated', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, []);

  const scrollToBottom = (behavior = 'auto') => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior });
    }
  };

  const getMsgReaction = (msgId, defaultReaction) => {
    return localStorage.getItem(`crm_msg_reaction_${msgId}`) || defaultReaction || null;
  };

  const handleToggleReaction = async (msg, emoji) => {
    if (!activeLead) return;
    const current = getMsgReaction(msg.id, msg.reaction);
    const newEmoji = current === emoji ? '' : emoji;

    if (newEmoji) {
      localStorage.setItem(`crm_msg_reaction_${msg.id}`, newEmoji);
    } else {
      localStorage.removeItem(`crm_msg_reaction_${msg.id}`);
    }

    // Update in memory lead messages
    onUpdateLead(activeLead.id, {
      messages: (activeLead.messages || []).map((m) =>
        m.id === msg.id ? { ...m, reaction: newEmoji || null } : m
      ),
    });

    setActiveReactionMsgId(null);

    // Call server to broadcast and/or forward to WhatsApp Meta API
    try {
      await api.reactMessage({
        leadId: activeLead.id,
        messageId: msg.id,
        emoji: newEmoji,
        phoneNumber: activeLead.phone,
        whatsappMsgId: msg.whatsappMsgId || msg.id,
      });
    } catch (e) {
      console.warn('Reaction sync note:', e);
    }
  };

  const handleExecuteForward = async (targetLead, msg) => {
    if (!targetLead || !msg) return;
    const contentToSend = msg.text || (msg.mediaType === 'AUDIO' ? 'Voice Note' : 'Attachment');
    const mediaType = msg.mediaType || 'TEXT';
    const mediaUrl = msg.mediaUrl || null;

    setForwardingMsg(null);
    setForwardSuccessToast(`Message '${targetLead.name}' ko forward kar diya gaya!`);
    setTimeout(() => setForwardSuccessToast(null), 5000);

    try {
      const res = await api.sendMessage({
        leadId: targetLead.id,
        phoneNumber: targetLead.phone,
        customerName: targetLead.name,
        channelId: targetLead.channel,
        content: contentToSend,
        mediaType,
        mediaUrl,
      });

      const newMsg = {
        id: res?.message?.id || `fwd-${Date.now()}`,
        sender: 'agent',
        agentName: 'Agent',
        text: contentToSend,
        mediaType,
        mediaUrl,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: res?.success ? 'delivered' : 'failed',
      };

      onUpdateLead(targetLead.id, {
        messages: [...(targetLead.messages || []), newMsg],
        lastMessage: contentToSend,
        lastTime: 'Just now',
      });
    } catch (err) {
      console.error('Forward failed:', err);
    }
  };

  const handleChatScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 150;
    setShowScrollBottomBtn(!isNearBottom);
  };

  const handleStartEditLeadReminder = (rem) => {
    setEditingRemId(rem.id);
    setNewRemTitle(rem.title || '');
    setNewRemDate(rem.date || new Date().toISOString().slice(0, 10));
    setNewRemCustomMsg(rem.customMessage || rem.notes || '');
    setNewRemAutoSend(rem.autoSend !== false);
    setNewRemPriority(rem.priority || 'HIGH');

    let h = '05', m = '00', ap = 'PM';
    if (rem.time) {
      if (/am|pm/i.test(rem.time)) {
        const match = rem.time.match(/(\d+):(\d+)\s*(AM|PM)/i);
        if (match) {
          h = match[1].padStart(2, '0');
          m = match[2];
          ap = match[3].toUpperCase();
        }
      } else {
        const parts = rem.time.split(':');
        if (parts.length >= 2) {
          let hours = parseInt(parts[0], 10);
          m = parts[1].padStart(2, '0').slice(0, 2);
          ap = hours >= 12 ? 'PM' : 'AM';
          hours = hours % 12 || 12;
          h = hours.toString().padStart(2, '0');
        }
      }
    }
    setNewRemHour(h);
    setNewRemMinute(m);
    setNewRemAmPm(ap);
    setShowAddReminderForm(true);
  };

  const handleCreateLeadReminder = (e) => {
    e.preventDefault();
    if (!activeLead || !newRemTitle.trim()) return;

    const formattedTime12h = `${newRemHour.padStart(2, '0')}:${newRemMinute.padStart(2, '0')} ${newRemAmPm}`;
    const defaultMsg = `Assalam o Alaikum ${activeLead.name}! Yeh aapke follow-up ke hawale se reminder message hai: "${newRemTitle.trim()}". Shukriya!`;

    if (editingRemId) {
      const updated = leadReminders.map(r => {
        if (r.id === editingRemId) {
          return {
            ...r,
            title: newRemTitle.trim(),
            date: newRemDate,
            time: formattedTime12h,
            priority: newRemPriority,
            customMessage: newRemCustomMsg.trim() || defaultMsg,
            autoSend: newRemAutoSend,
            updatedAt: new Date().toISOString()
          };
        }
        return r;
      });
      saveRemindersToStorage(updated);
      setReminderToast(`Reminder "${newRemTitle.trim()}" update ho gaya (${formattedTime12h})! ✓`);
    } else {
      const newRem = {
        id: `rem-${Date.now()}`,
        leadId: activeLead.id,
        leadName: activeLead.name,
        leadPhone: activeLead.phone,
        channelId: activeLead.channel,
        title: newRemTitle.trim(),
        date: newRemDate,
        time: formattedTime12h,
        priority: newRemPriority,
        customMessage: newRemCustomMsg.trim() || defaultMsg,
        autoSend: newRemAutoSend,
        assignedTo: activeLead.assignedTo || 'Ali Husni',
        completed: false,
        reminderSent: false,
        createdAt: new Date().toISOString()
      };
      const updated = [newRem, ...leadReminders];
      saveRemindersToStorage(updated);
      setReminderToast(`Reminder schedule ho gaya (${formattedTime12h})! ✓`);
    }

    setEditingRemId(null);
    setNewRemTitle('');
    setNewRemCustomMsg('');
    setShowAddReminderForm(false);
    setTimeout(() => setReminderToast(null), 3000);
  };

  const handleToggleLeadReminder = (remId) => {
    const updated = leadReminders.map(r => r.id === remId ? { ...r, completed: !r.completed } : r);
    saveRemindersToStorage(updated);
  };

  const handleDeleteLeadReminder = (remId) => {
    const updated = leadReminders.filter(r => r.id !== remId);
    saveRemindersToStorage(updated);
  };

  const handleSendWhatsAppReminderDirect = async (rem) => {
    if (!rem.leadPhone) return;
    setSendingReminderId(rem.id);
    const msg = rem.customMessage || `Assalam o Alaikum ${rem.leadName || 'Customer'}! Yeh aapke follow-up ke hawale se reminder message hai: "${rem.title}". Shukriya!`;

    try {
      if (api.sendMessage) {
        await api.sendMessage({
          leadId: rem.leadId || activeLead?.id,
          phoneNumber: rem.leadPhone,
          customerName: rem.leadName,
          channelId: rem.channelId || activeLead?.channel,
          content: msg,
          mediaType: 'TEXT',
        });
      }
      const sentTimeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const updated = leadReminders.map(r => r.id === rem.id ? { 
        ...r, 
        reminderSent: true, 
        reminderSentAt: sentTimeStr,
        completed: true
      } : r);
      saveRemindersToStorage(updated);

      // Append locally to chat if this lead is open
      if (activeLead && (activeLead.id === rem.leadId || activeLead.phone === rem.leadPhone)) {
        const newMsg = {
          id: `rem-sent-${Date.now()}`,
          sender: 'agent',
          agentName: 'System (Reminder)',
          text: msg,
          time: sentTimeStr,
          status: 'delivered'
        };
        onUpdateLead(activeLead.id, {
          messages: [...(activeLead.messages || []), newMsg],
          lastMessage: msg,
          lastTime: 'Just now'
        });
      }

      setReminderToast(`WhatsApp Reminder ${rem.leadPhone} par foran bhej diya gaya! ✓`);
      setTimeout(() => setReminderToast(null), 4000);
    } catch (err) {
      console.error('Error sending WhatsApp reminder:', err);
      window.open(`https://wa.me/${rem.leadPhone.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
    } finally {
      setSendingReminderId(null);
    }
  };

  const leadsRef = React.useRef(leads);
  React.useEffect(() => {
    leadsRef.current = leads;
  }, [leads]);

  const leadRemindersRef = React.useRef(leadReminders);
  React.useEffect(() => {
    leadRemindersRef.current = leadReminders;
  }, [leadReminders]);

  // Background Auto-Sender: Automatically sends WhatsApp message when scheduled time arrives
  React.useEffect(() => {
    const checkScheduledReminders = async () => {
      const currentReminders = leadRemindersRef.current || [];
      const currentLeads = leadsRef.current || [];
      const now = new Date();
      const currentDate = now.toISOString().slice(0, 10);
      const currentHours = now.getHours();
      const currentMinutes = now.getMinutes();
      const currentTotalMinutes = currentHours * 60 + currentMinutes;

      let hasChanged = false;
      const updatedList = [...currentReminders];

      for (let i = 0; i < updatedList.length; i++) {
        const r = updatedList[i];
        if (r.completed || r.reminderSent) continue;
        if (r.autoSend === false) continue; // manual only

        // Check if date has arrived
        if (r.date <= currentDate) {
          const remTotalMinutes = parseTimeToMinutes(r.time);
          // If past date, or if today and time reached
          if (r.date < currentDate || remTotalMinutes <= currentTotalMinutes) {
            console.log(`⏰ Auto-dispatching scheduled reminder for ${r.leadName} (${r.time})`);
            hasChanged = true;
            r.reminderSent = true;
            r.reminderSentAt = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            r.completed = true;

            const msgToSend = r.customMessage || `Assalam o Alaikum ${r.leadName || 'Customer'}! Yeh aapke follow-up ke hawale se automated reminder hai: "${r.title}".`;

            if (r.leadPhone && api.sendMessage) {
              try {
                await api.sendMessage({
                  leadId: r.leadId,
                  phoneNumber: r.leadPhone,
                  customerName: r.leadName,
                  channelId: r.channelId,
                  content: msgToSend,
                  mediaType: 'TEXT',
                });

                if (onUpdateLead && r.leadId) {
                  const targetLead = currentLeads.find(l => l.id === r.leadId);
                  if (targetLead) {
                    const newMsg = {
                      id: `sched-${Date.now()}`,
                      sender: 'agent',
                      agentName: 'System (Scheduled Message)',
                      text: msgToSend,
                      time: r.reminderSentAt,
                      status: 'delivered'
                    };
                    onUpdateLead(r.leadId, {
                      messages: [...(targetLead.messages || []), newMsg],
                      lastMessage: msgToSend,
                      lastTime: 'Just now'
                    });
                  }
                }
                setReminderToast(`⚡ Scheduled Message "${r.leadName}" ko WhatsApp par deliver ho gaya! ✓`);
                setTimeout(() => setReminderToast(null), 5000);
              } catch (err) {
                console.error('Failed to auto-send scheduled reminder:', err);
              }
            }
          }
        }
      }

      if (hasChanged) {
        saveRemindersToStorage(updatedList);
      }
    };

    const interval = setInterval(checkScheduledReminders, 10000); // Check every 10s quietly
    checkScheduledReminders();
    return () => clearInterval(interval);
  }, []);

  // Filtered and sorted leads (latest active chats first, deduplicated by phone & channel)
  const uniqueLeads = React.useMemo(() => {
    // High-volume phone deduplication: Keep ONE master lead per phone number (the one with latest activity)
    const phoneMap = new Map();
    leads.forEach((l) => {
      if (!l.id) return;
      const key = selectedChannel === 'all' 
        ? (l.phone ? String(l.phone).replace(/\D/g, '') : l.id) 
        : `${l.id}`;
      
      const existing = phoneMap.get(key);
      if (!existing) {
        phoneMap.set(key, l);
      } else {
        const existingTime = new Date(existing.rawLastMessageAt || existing.createdAt || 0).getTime();
        const incomingTime = new Date(l.rawLastMessageAt || l.createdAt || 0).getTime();
        if (incomingTime > existingTime) {
          phoneMap.set(key, {
            ...l,
            unreadCount: (l.unreadCount || 0) + (existing.unreadCount || 0),
          });
        } else {
          phoneMap.set(key, {
            ...existing,
            unreadCount: (existing.unreadCount || 0) + (l.unreadCount || 0),
          });
        }
      }
    });
    return Array.from(phoneMap.values());
  }, [leads, selectedChannel]);

  const stageCounts = React.useMemo(() => {
    const list = selectedChannel === 'all' ? uniqueLeads : uniqueLeads.filter(l => l.channel === selectedChannel);
    const scheduledRemCount = list.filter(lead => 
      leadReminders.some(r => !r.completed && !r.reminderSent && (r.leadId === lead.id || (lead.phone && r.leadPhone && r.leadPhone.replace(/\D/g, '') === lead.phone.replace(/\D/g, ''))))
    ).length;

    const todayNewCount = list.filter(l => isLeadToday(l)).length;

    return {
      all: list.length,
      todayNew: todayNewCount,
      unread: list.filter(l => l.unreadCount > 0).length,
      reminders: scheduledRemCount,
      qualified: list.filter(l => /qualif/i.test(l.stage || '')).length,
      proposal: list.filter(l => /proposal/i.test(l.stage || '')).length,
      won: list.filter(l => /won|closed/i.test(l.stage || '')).length,
      contacted: list.filter(l => /contact/i.test(l.stage || '')).length,
      unqualified: list.filter(l => /lost|unqualif/i.test(l.stage || '')).length,
      new: list.filter(l => /new/i.test(l.stage || '') && !l.messages?.some(m => m.sender === 'agent')).length,
      unassigned: list.filter(l => !l.assignedTo || l.assignedTo === 'Unassigned').length,
    };
  }, [uniqueLeads, selectedChannel, leadReminders]);

  // Memoized, 100% deterministic sorted display leads (NO flickering, NO order jumping)
  const displayLeads = React.useMemo(() => {
    return uniqueLeads
      .filter((lead) => {
        // Channel filter
        if (selectedChannel !== 'all' && lead.channel !== selectedChannel) return false;
        // Tab filter
        if (filterTab === 'today') {
          // Strictly brand-new inbound leads of today (first customer message after 12:00 AM)
          if (!isLeadToday(lead)) return false;
        }
        if (filterTab === 'reminders') {
          const hasRem = leadReminders.some((r) => 
            !r.completed && !r.reminderSent && (r.leadId === lead.id || (lead.phone && r.leadPhone && r.leadPhone.replace(/\D/g, '') === lead.phone.replace(/\D/g, '')))
          );
          if (!hasRem) return false;
        }
        if (filterTab === 'unassigned' && lead.assignedTo !== 'Unassigned') return false;
        if (filterTab === 'mine' && lead.assignedTo !== 'Hamza Tariq' && lead.assignedTo !== 'Ali Husni') return false;
        if (filterTab === 'unread' && lead.unreadCount === 0) return false;
        if (filterTab === 'qualified' && !/qualif/i.test(lead.stage || '')) return false;
        if (filterTab === 'proposal' && !/proposal/i.test(lead.stage || '')) return false;
        if (filterTab === 'won' && !/won|closed/i.test(lead.stage || '')) return false;
        if (filterTab === 'contacted' && !/contact/i.test(lead.stage || '')) return false;
        if (filterTab === 'unqualified' && !/lost|unqualif/i.test(lead.stage || '')) return false;
        if (filterTab === 'new' && (!/new/i.test(lead.stage || '') || lead.messages?.some((m) => m.sender === 'agent'))) return false;

        // Service Filter
        if (selectedServiceFilter !== 'all') {
          const sMeta = getServiceMeta(lead.serviceInterest);
          if (!sMeta || (sMeta.id !== selectedServiceFilter && sMeta.shortLabel !== selectedServiceFilter && sMeta.label !== selectedServiceFilter)) {
            return false;
          }
        }
        // Search
        if (searchLeadTerm) {
          const term = searchLeadTerm.toLowerCase();
          return (lead.name || '').toLowerCase().includes(term) || (lead.phone || '').includes(term);
        }
        return true;
      })
      .sort((a, b) => {
        const timeA = new Date(a.rawLastMessageAt || a.createdAt || 0).getTime() || 0;
        const timeB = new Date(b.rawLastMessageAt || b.createdAt || 0).getTime() || 0;
        if (timeB !== timeA) return timeB - timeA;
        return String(a.id || '').localeCompare(String(b.id || ''));
      });
  }, [uniqueLeads, selectedChannel, filterTab, leadReminders, selectedServiceFilter, searchLeadTerm]);

  // Selected active lead (Locked to uniqueLeads by selectedLeadId so active chat NEVER jumps to another customer)
  const activeLead = React.useMemo(() => {
    return uniqueLeads.find((l) => l.id === selectedLeadId) || (displayLeads.length > 0 ? displayLeads[0] : null);
  }, [uniqueLeads, selectedLeadId, displayLeads]);

  // Set initial selectedLeadId only if none selected
  React.useEffect(() => {
    if (!selectedLeadId && activeLead?.id) {
      setSelectedLeadId(activeLead.id);
    }
  }, [selectedLeadId, activeLead?.id, setSelectedLeadId]);

  // Reminders for currently active lead
  const activeLeadReminders = React.useMemo(() => {
    if (!activeLead) return [];
    return leadReminders.filter(r => 
      r.leadId === activeLead.id || 
      (activeLead.phone && r.leadPhone && r.leadPhone.replace(/\D/g, '') === activeLead.phone.replace(/\D/g, ''))
    );
  }, [leadReminders, activeLead?.id, activeLead?.phone]);

  // Auto-scroll chat to bottom when switching chats or when new messages arrive
  React.useEffect(() => {
    const timer = setTimeout(() => {
      scrollToBottom('auto');
    }, 50);
    return () => clearTimeout(timer);
  }, [selectedLeadId, activeLead?.id, activeLead?.messages?.length]);

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isImg = file.type.startsWith('image/');
    const reader = new FileReader();
    reader.onload = (ev) => {
      setPendingImage({
        file,
        previewUrl: ev.target.result,
        base64: ev.target.result, // includes data:...;base64,...
        fileName: file.name,
        isImage: isImg,
      });
    };
    reader.readAsDataURL(file);
    // Reset input so same file can be re-selected
    e.target.value = '';
  };

  const startRecording = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert('Aapka browser microphone recording support nahi karta.');
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];

      let mimeType = 'audio/webm';
      if (MediaRecorder.isTypeSupported('audio/ogg; codecs=opus')) {
        mimeType = 'audio/ogg; codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        mimeType = 'audio/mp4';
      } else if (MediaRecorder.isTypeSupported('audio/webm; codecs=opus')) {
        mimeType = 'audio/webm; codecs=opus';
      }

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.start(250);
      setIsRecording(true);
      setRecordingSeconds(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Microphone access error:', err);
      alert('Microphone permission allow karein voice note record karne ke liye.');
    }
  };

  const cancelRecording = () => {
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream?.getTracks().forEach((track) => track.stop());
    }
    setIsRecording(false);
    setRecordingSeconds(0);
    audioChunksRef.current = [];
  };

  const sendVoiceRecording = async () => {
    if (!mediaRecorderRef.current || !activeLead) return;
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);

    const recorder = mediaRecorderRef.current;
    setIsRecording(false);

    // Wait for all chunks to arrive after stop(), then process
    const processAudio = async () => {
      recorder.stream?.getTracks().forEach((track) => track.stop());
      const rawMime = recorder.mimeType || 'audio/webm';
      const rawAudioBlob = new Blob(audioChunksRef.current, { type: rawMime });

      console.log(`🎤 Voice raw blob ready: ${rawAudioBlob.size} bytes, type=${rawMime}`);
      if (rawAudioBlob.size < 100) {
        console.warn('⚠️ Audio blob too small, aborting send.');
        return;
      }

      // Convert to genuine, standard MP3 for Meta WhatsApp delivery
      const mp3Blob = await convertBlobToMp3(rawAudioBlob);
      console.log(`🎵 MP3 ready: ${mp3Blob.size} bytes, type=${mp3Blob.type}`);

      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Audio = reader.result;
        if (!base64Audio || base64Audio.length < 100) {
          console.warn('⚠️ base64Audio empty, aborting send.');
          return;
        }

        const tempId = `msg-${Date.now()}`;
        const localBlobUrl = URL.createObjectURL(mp3Blob);

        const newMsg = {
          id: tempId,
          sender: 'agent',
          agentName: 'Ali Husni',
          text: 'Voice Note',
          mediaType: 'AUDIO',
          mediaUrl: localBlobUrl,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          status: 'sending',
        };

        const updatedMessages = [...(activeLead.messages || []), newMsg];
        onUpdateLead(activeLead.id, { messages: updatedMessages, lastTime: 'Just now', unreadCount: 0 });
        setIsUploading(true);

        try {
          const uploadRes = await api.uploadMedia(base64Audio, `voice_${Date.now()}.mp3`);
          setIsUploading(false);

          if (uploadRes?.mediaUrl) {
            const res = await api.sendMessage({
              leadId: activeLead.id,
              phoneNumber: activeLead.phone,
              customerName: activeLead.name,
              channelId: activeLead.channel,
              content: 'Voice Note',
              mediaType: 'AUDIO',
              mediaUrl: uploadRes.mediaUrl,
            });

            const isDelivered = res?.success === true;
            onUpdateLead(activeLead.id, {
              messages: updatedMessages.map((m) =>
                m.id === tempId
                  ? {
                      ...m,
                      id: res?.message?.id || tempId,
                      mediaUrl: uploadRes.mediaUrl,
                      status: isDelivered ? 'delivered' : 'failed',
                      errorReason: res?.metaError || (!isDelivered ? 'Voice note delivery failed' : null),
                    }
                  : m
              ),
            });
          } else {
            onUpdateLead(activeLead.id, {
              messages: updatedMessages.map((m) => (m.id === tempId ? { ...m, status: 'failed' } : m)),
            });
          }
        } catch (err) {
          console.error('Error sending voice note:', err);
          setIsUploading(false);
          onUpdateLead(activeLead.id, {
            messages: updatedMessages.map((m) => (m.id === tempId ? { ...m, status: 'failed' } : m)),
          });
        }
      };
      reader.readAsDataURL(mp3Blob);
    };

    recorder.onstop = processAudio;

    if (recorder.state !== 'inactive') {
      recorder.stop(); // onstop fires after all ondataavailable events complete
    } else {
      processAudio();
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!activeLead) return;
    if (!inputText.trim() && !pendingImage) return;

    const textToSend = inputText || (pendingImage ? '' : '');
    setInputText('');
    const imageToSend = pendingImage;
    setPendingImage(null);

    if (isInternalNote) {
      // Add internal note locally
      const newNote = {
        id: `note-${Date.now()}`,
        author: 'Ali Husni (Admin)',
        text: textToSend,
        time: 'Just now'
      };
      const updatedNotes = [...(activeLead.notes || []), newNote];
      onUpdateLead(activeLead.id, { notes: updatedNotes });
      api.addNote(activeLead.id, textToSend).catch(() => {});
    } else {
      const tempId = `msg-${Date.now()}`;
      const newMsg = {
        id: tempId,
        sender: 'agent',
        agentName: 'Ali Husni',
        text: textToSend || (imageToSend ? imageToSend.fileName : ''),
        mediaType: imageToSend ? 'IMAGE' : 'TEXT',
        mediaUrl: imageToSend ? imageToSend.previewUrl : null, // local preview while uploading
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: 'sending'
      };
      const updatedMessages = [...(activeLead.messages || []), newMsg];
      onUpdateLead(activeLead.id, { messages: updatedMessages, lastTime: 'Just now', unreadCount: 0 });

      try {
        let mediaUrl = null;
        let mediaType = 'TEXT';

        if (imageToSend) {
          setIsUploading(true);
          const uploadRes = await api.uploadMedia(imageToSend.base64, imageToSend.fileName);
          setIsUploading(false);
          if (uploadRes?.mediaUrl) {
            mediaUrl = uploadRes.mediaUrl;
            mediaType = uploadRes.mediaType || 'IMAGE';
            // Replace local preview with server URL in state
            onUpdateLead(activeLead.id, {
              messages: updatedMessages.map(m => m.id === tempId ? { ...m, mediaUrl: `${SERVER_BASE}${mediaUrl}` } : m)
            });
          }
        }

        const res = await api.sendMessage({
          leadId: activeLead.id,
          phoneNumber: activeLead.phone,
          customerName: activeLead.name,
          channelId: activeLead.channel,
          content: textToSend || (imageToSend ? imageToSend.fileName : ''),
          mediaType,
          mediaUrl,
        });

        const isDelivered = res?.success === true;
        onUpdateLead(activeLead.id, {
          messages: updatedMessages.map(m => m.id === tempId ? {
            ...m,
            id: res?.message?.id || tempId,
            status: isDelivered ? 'delivered' : 'failed',
            errorReason: res?.metaError || (!isDelivered ? 'WhatsApp delivery failed' : null)
          } : m)
        });
      } catch (err) {
        setIsUploading(false);
        onUpdateLead(activeLead.id, {
          messages: updatedMessages.map(m => m.id === tempId ? {
            ...m,
            status: 'failed',
            errorReason: err?.message || 'Server connection error'
          } : m)
        });
      }
    }
  };

  const applyQuickReply = (text) => {
    setInputText(text);
    setShowQuickReplies(false);
  };


  if (leads.length === 0) {
    return (
      <div className="flex h-full w-full overflow-hidden bg-[#F8F9FC]">
        {/* Left Column: Conversations List */}
        <div className="w-72 sm:w-80 xl:w-[330px] 2xl:w-96 bg-white border-r border-[#EEF2F6] flex flex-col shrink-0">
          <div className="p-3.5 border-b border-[#F1F5F9] space-y-2.5">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-extrabold text-slate-900 tracking-tight">Customer WhatsApp Chats</h2>
              <span className="text-xs font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-100 animate-pulse">
                Syncing...
              </span>
            </div>
            <p className="text-xs text-slate-500">Live WhatsApp Chat</p>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin text-orange-500 mb-2" />
            <p className="text-xs font-semibold">Database connect ho rahi hai...</p>
          </div>
        </div>

        {/* Interactive Percentage Loading Screen */}
        <LiveSyncLoader />
      </div>
    );
  }

  return (
    <div className="flex h-full w-full overflow-hidden bg-[#F8F9FC]">
      {/* 1. Left Column: Conversations List (WhatsApp Style) */}
      <div className="w-72 sm:w-80 xl:w-[330px] 2xl:w-96 bg-white border-r border-[#EEF2F6] flex flex-col shrink-0">
        {/* Header & Channel Selector */}
        <div className="p-3.5 border-b border-[#F1F5F9] space-y-2.5">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-extrabold text-slate-900 tracking-tight">Customer WhatsApp Chats</h2>
            <div className="flex items-center gap-1.5">
              <button
                onClick={async () => {
                  if (onRefreshLeads) {
                    setIsRefreshing(true);
                    await onRefreshLeads();
                    setTimeout(() => setIsRefreshing(false), 500);
                  }
                }}
                title="Refresh customer chats from WhatsApp"
                className="p-1 rounded-lg text-slate-500 hover:text-orange-600 hover:bg-orange-50 transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-orange-500' : ''}`} />
              </button>
              <span className="text-xs font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-100">
                {displayLeads.length} Customers
              </span>
            </div>
          </div>

          {/* Quick Channel Filter inside Inbox */}
          {Array.isArray(channels) && channels.length > 0 && (
            <div className="flex items-center gap-1 overflow-x-auto pb-1 text-xs">
              {channels.map(ch => {
                const displayName = formatChannelDisplayName(ch);
                return (
                  <button
                    key={ch.id}
                    onClick={() => setSelectedChannel(ch.id)}
                    className={`px-2.5 py-1 rounded-lg font-bold shrink-0 transition-all ${
                      selectedChannel === ch.id 
                        ? 'bg-orange-500 text-white shadow-2xs' 
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                    title={ch.number || displayName}
                  >
                    <span>{ch.flag}</span> <span>{displayName}</span>
                  </button>
                );
              })}
            </div>
          )}

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

          {/* AmazFast Service Filter Dropdown */}
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-50 border border-slate-200/80 rounded-xl">
            <span className="text-[10px] font-black uppercase text-slate-500 shrink-0">💼 Service:</span>
            <select
              value={selectedServiceFilter}
              onChange={(e) => setSelectedServiceFilter(e.target.value)}
              className="flex-1 text-[11px] font-bold bg-transparent text-slate-800 focus:outline-none cursor-pointer truncate"
            >
              <option value="all">🌐 Saari Services (All)</option>
              {AMAZFAST_SERVICES.map(s => (
                <option key={s.id} value={s.shortLabel}>{s.label}</option>
              ))}
            </select>
            {selectedServiceFilter !== 'all' && (
              <button
                type="button"
                onClick={() => setSelectedServiceFilter('all')}
                className="text-[10px] text-orange-600 font-black hover:underline shrink-0"
                title="Reset service filter"
              >
                ✕ Clear
              </button>
            )}
          </div>

          {/* Filter Tabs / Stage Sections */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 text-xs border-b border-slate-100 pt-1">
            {/* Tab 1: Aaj Ki Nayi Leads (First time customers after 12 AM) */}
            <button 
              type="button"
              onClick={() => setFilterTab('today')}
              className={`pb-1 px-2.5 border-b-2 font-black whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                filterTab === 'today' 
                  ? 'border-emerald-600 text-emerald-700 bg-emerald-50/70 font-black rounded-t shadow-2xs' 
                  : 'border-transparent text-slate-500 hover:text-emerald-700 hover:bg-emerald-50/40 rounded-t'
              }`}
              title="Aaj aane wali naye customers ki leads jinka pehla message 12:00 AM ke baad aaya hai"
            >
              <span>⚡ Aaj Ki Leads</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                filterTab === 'today' ? 'bg-emerald-600 text-white' : 'bg-emerald-100 text-emerald-800'
              }`}>
                {stageCounts.todayNew}
              </span>
            </button>

            {/* Tab 2: Saari Chats (Existing returning clients + Aaj ki leads) */}
            <button 
              type="button"
              onClick={() => setFilterTab('all')}
              className={`pb-1 px-2.5 border-b-2 font-bold whitespace-nowrap transition-colors ${
                filterTab === 'all' ? 'border-orange-500 text-orange-600 bg-orange-50/40 rounded-t' : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
              title="Tamaam chats — Purane customers aur aaj ki leads dono shamil hain"
            >
              Saari Chats ({stageCounts.all})
            </button>
            <button 
              type="button"
              onClick={() => setFilterTab('unread')}
              className={`pb-1 px-2 border-b-2 font-bold whitespace-nowrap transition-colors ${
                filterTab === 'unread' ? 'border-orange-500 text-orange-600' : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Unread ({stageCounts.unread})
            </button>
            <button 
              type="button"
              onClick={() => setFilterTab('reminders')}
              className={`pb-1 px-2.5 border-b-2 font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                filterTab === 'reminders' 
                  ? 'border-orange-500 text-orange-700 bg-orange-50 font-extrabold rounded-t shadow-2xs' 
                  : 'border-transparent text-slate-500 hover:text-orange-600 hover:bg-orange-50/40 rounded-t'
              }`}
              title="Scheduled Reminders aur Auto-Send Messages"
            >
              <span>⏰ Reminders</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                filterTab === 'reminders' ? 'bg-orange-500 text-white' : 'bg-orange-100 text-orange-700'
              }`}>
                {stageCounts.reminders}
              </span>
            </button>
            <button 
              type="button"
              onClick={() => setFilterTab('qualified')}
              className={`pb-1 px-2 border-b-2 font-bold whitespace-nowrap transition-colors ${
                filterTab === 'qualified' ? 'border-purple-600 text-purple-700 bg-purple-50/50 rounded-t' : 'border-transparent text-slate-500 hover:text-purple-700'
              }`}
            >
              🟣 Qualified ({stageCounts.qualified})
            </button>
            <button 
              type="button"
              onClick={() => setFilterTab('proposal')}
              className={`pb-1 px-2 border-b-2 font-bold whitespace-nowrap transition-colors ${
                filterTab === 'proposal' ? 'border-amber-600 text-amber-700 bg-amber-50/50 rounded-t' : 'border-transparent text-slate-500 hover:text-amber-700'
              }`}
            >
              🟠 Proposal ({stageCounts.proposal})
            </button>
            <button 
              type="button"
              onClick={() => setFilterTab('won')}
              className={`pb-1 px-2 border-b-2 font-bold whitespace-nowrap transition-colors ${
                filterTab === 'won' ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50 rounded-t' : 'border-transparent text-slate-500 hover:text-emerald-700'
              }`}
            >
              🟢 Deal Won ({stageCounts.won})
            </button>
            <button 
              type="button"
              onClick={() => setFilterTab('contacted')}
              className={`pb-1 px-2 border-b-2 font-bold whitespace-nowrap transition-colors ${
                filterTab === 'contacted' ? 'border-blue-600 text-blue-700 bg-blue-50/50 rounded-t' : 'border-transparent text-slate-500 hover:text-blue-700'
              }`}
            >
              🔵 Contacted ({stageCounts.contacted})
            </button>
            <button 
              type="button"
              onClick={() => setFilterTab('new')}
              className={`pb-1 px-2 border-b-2 font-bold whitespace-nowrap transition-colors ${
                filterTab === 'new' ? 'border-yellow-600 text-yellow-700 bg-yellow-50/50 rounded-t' : 'border-transparent text-slate-500 hover:text-yellow-700'
              }`}
            >
              🟡 Naye ({stageCounts.new})
            </button>
            <button 
              type="button"
              onClick={() => setFilterTab('unqualified')}
              className={`pb-1 px-2 border-b-2 font-bold whitespace-nowrap transition-colors ${
                filterTab === 'unqualified' ? 'border-rose-600 text-rose-700 bg-rose-50/50 rounded-t' : 'border-transparent text-slate-500 hover:text-rose-700'
              }`}
            >
              🔴 Unqualified ({stageCounts.unqualified})
            </button>
            <button 
              type="button"
              onClick={() => setFilterTab('unassigned')}
              className={`pb-1 px-2 border-b-2 font-bold whitespace-nowrap transition-colors ${
                filterTab === 'unassigned' ? 'border-slate-500 text-slate-700' : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Bina Assign ({stageCounts.unassigned})
            </button>
          </div>
        </div>

        {/* Conversation Items List */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-50">
          {displayLeads.length === 0 ? (
            <div className="p-6 text-center space-y-3">
              <p className="text-xs font-bold text-slate-700">Koi Chat Maujood Nahi</p>
              <p className="text-[11px] text-slate-500">
                Is filter ke mutabiq koi WhatsApp conversation nahi mili.
              </p>
              {filterTab !== 'all' && (
                <button
                  type="button"
                  onClick={() => { setFilterTab('all'); setSearchLeadTerm(''); }}
                  className="px-3 py-1.5 bg-orange-50 hover:bg-orange-100 text-orange-600 text-xs font-bold rounded-lg border border-orange-200 transition-colors inline-block"
                >
                  Saari Chats Dekhein
                </button>
              )}
            </div>
          ) : (
            displayLeads.map((lead) => {
              const isSelected = activeLead?.id === lead.id;
              const msgs = lead.messages || [];
              const lastMsg = msgs[msgs.length - 1];
              const pendingRem = leadReminders.find(r => 
                !r.completed && !r.reminderSent && (
                  r.leadId === lead.id || 
                  (lead.phone && r.leadPhone && r.leadPhone.replace(/\D/g, '') === lead.phone.replace(/\D/g, ''))
                )
              );
              return (
                <div
                  key={lead.id}
                  onClick={() => {
                    setSelectedLeadId(lead.id);
                    if (lead.unreadCount > 0) {
                      onUpdateLead(lead.id, { unreadCount: 0 });
                    }
                  }}
                  className={`p-3.5 cursor-pointer transition-colors duration-150 flex items-start gap-3 select-none relative ${
                    isSelected 
                      ? 'bg-orange-50/70 border-l-4 border-orange-500' 
                      : pendingRem
                      ? 'bg-amber-50/30 hover:bg-amber-50/60 border-l-3 border-orange-400'
                      : 'hover:bg-slate-50/80'
                  }`}
                >
                  {/* Avatar / Flag */}
                  <div className="relative shrink-0">
                    <div className="w-11 h-11 rounded-full overflow-hidden border border-slate-200 bg-slate-100 flex items-center justify-center font-extrabold text-sm text-slate-700">
                      {lead.avatar ? (
                        <img 
                          src={lead.avatar} 
                          alt={lead.name} 
                          className="w-full h-full object-cover"
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                      ) : (
                        <span>{lead.name?.charAt(0) || '?'}</span>
                      )}
                    </div>
                    <span className="absolute -bottom-1 -right-1 text-xs bg-white rounded-full p-0.5 shadow-2xs">
                      {lead.flag}
                    </span>
                  </div>

                  {/* Chat Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <div className="flex items-center gap-1.5 min-w-0 pr-1 flex-wrap">
                        <h4 className="text-xs font-extrabold text-slate-900 truncate">
                          {lead.name}
                        </h4>
                        {pendingRem && (
                          <span 
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-black bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-2xs shrink-0 animate-pulse"
                            title={`Scheduled Reminder: "${pendingRem.title}" @ ${formatTo12Hour(pendingRem.time)}`}
                          >
                            <span>⏰</span>
                            <span>{formatTo12Hour(pendingRem.time)}</span>
                          </span>
                        )}
                        <span className={`text-[9px] font-black px-1.5 py-0.2 rounded border shrink-0 ${getStageBadgeStyle(lead.stage)}`}>
                          {lead.stage}
                        </span>
                        {lead.serviceInterest && (
                          <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 shrink-0" title={`Service: ${lead.serviceInterest}`}>
                            💼 {lead.serviceInterest}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] font-semibold text-slate-600 shrink-0">
                        {lead.lastTime}
                      </span>
                    </div>

                    {pendingRem && (
                      <div className="mt-0.5 mb-1 flex items-center gap-1 text-[10px] font-bold text-orange-800 bg-orange-100/70 border border-orange-200/80 px-1.5 py-0.5 rounded-md truncate">
                        <span className="shrink-0">⏰ Reminder:</span>
                        <span className="truncate italic">"{pendingRem.title}"</span>
                        <span className="text-[9px] font-black text-orange-600 shrink-0 font-mono">({formatTo12Hour(pendingRem.time)})</span>
                      </div>
                    )}

                    <p className="text-[11px] text-slate-600 truncate font-medium">
                      {lastMsg?.text || lead.lastMessage || 'No messages yet'}
                    </p>

                    <div className="flex items-center justify-between mt-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${getStageBadgeStyle(lead.stage)}`}>
                        {lead.dealValue ? `${lead.dealValue} ${lead.currency}` : lead.stage}
                      </span>

                      {lead.unreadCount > 0 ? (
                        <span className="w-5 h-5 rounded-full bg-orange-500 text-white text-[10px] font-bold flex items-center justify-center shadow-xs">
                          {lead.unreadCount}
                        </span>
                      ) : (
                        <span className="text-[10px] font-medium text-slate-600 flex items-center gap-1">
                          {(!lead.assignedTo || lead.assignedTo === 'Unassigned') ? (
                            <span className="text-amber-600 font-bold">Unassigned</span>
                          ) : (
                            <span>{(lead.assignedTo || '').split(' ')[0]}</span>
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

      {/* 2. Middle & Right Columns */}
      {!activeLead ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500 bg-[#F4F5F8]">
          <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mb-4 shadow-sm">
            <Filter className="w-8 h-8" />
          </div>
          <h3 className="text-base font-extrabold text-slate-800">
            {filterTab !== 'all' 
              ? `Stage: '${filterTab.toUpperCase()}' Khali Hai` 
              : selectedChannel !== 'all' 
                ? 'Is Channel Mein Abhi Koi Chat Nahi Hai' 
                : 'Koi Chat Selected Nahi Hai'}
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mt-1 mb-4 leading-relaxed">
            {filterTab === 'proposal'
              ? "Abhi kisi customer ka stage 'Proposal Sent' nahi hai. Aap chat header mein stage dropdown se ya Kanban board se customer ko 'Proposal Sent' stage mein shift kar sakte hain."
              : filterTab !== 'all'
                ? `Is filter ('${filterTab}') ke mutabiq abhi koi customer nahi hai. Saari chats dekhne ke liye button dabayein.`
                : 'Jab koi naya customer message karega toh chat yahan automatically aa jayegi.'}
          </p>
          {filterTab !== 'all' ? (
            <button
              onClick={() => { setFilterTab('all'); setSearchLeadTerm(''); }}
              className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
            >
              Saari Chats Dekhein
            </button>
          ) : (
            onOpenNewLead && (
              <button
                onClick={onOpenNewLead}
                className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-2"
              >
                + Naya Customer / Chat Shuru Karein
              </button>
            )
          )}
        </div>
      ) : (
        <>
          {/* 2. Middle Column: Active Chat Conversation */}
          <div className="flex-1 flex flex-col bg-[#F4F5F8] border-r border-[#EEF2F6] min-w-0">
        {/* Chat Header */}
        <div className="p-3.5 bg-white border-b border-[#EEF2F6] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full shrink-0 overflow-hidden border border-slate-200 bg-orange-100 flex items-center justify-center font-extrabold text-sm text-orange-700">
              {activeLead?.avatar ? (
                <img 
                  src={activeLead.avatar} 
                  alt={activeLead?.name || 'Customer'} 
                  className="w-full h-full object-cover"
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              ) : (
                <span>{(activeLead?.name || '+').charAt(0)}</span>
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                {isEditingName ? (
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={editNameVal}
                      onChange={(e) => setEditNameVal(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          if (editNameVal.trim()) {
                            onUpdateLead(activeLead.id, { name: editNameVal.trim() });
                          }
                          setIsEditingName(false);
                        } else if (e.key === 'Escape') {
                          setIsEditingName(false);
                        }
                      }}
                      autoFocus
                      className="text-xs font-bold px-2 py-0.5 border border-orange-400 rounded-lg bg-orange-50/50 focus:outline-none"
                    />
                    <button
                      onClick={() => {
                        if (editNameVal.trim()) {
                          onUpdateLead(activeLead.id, { name: editNameVal.trim() });
                        }
                        setIsEditingName(false);
                      }}
                      className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                      title="Save Name"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 group">
                    <h3 className="text-sm font-extrabold text-slate-900 truncate">{activeLead.name}</h3>
                    <button
                      onClick={() => {
                        setEditNameVal(activeLead.name);
                        setIsEditingName(true);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-orange-600 transition-opacity"
                      title="Edit Customer Name"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                  </div>
                )}
                <span className="text-xs" title={activeLead.channelName}>{activeLead.flag}</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Online
                </span>

                {/* Direct Stage Mover from Chat */}
                <select
                  value={activeLead.stage}
                  onChange={(e) => onUpdateLead(activeLead.id, { stage: e.target.value })}
                  className={`text-[10px] font-extrabold px-2 py-0.5 rounded-lg border cursor-pointer transition-all ${getStageBadgeStyle(activeLead.stage)}`}
                  title="Kanban Stage Badlein (Foran update hoga)"
                >
                  {PIPELINE_STAGES.map(s => (
                    <option key={s.id} value={s.id}>{s.id}</option>
                  ))}
                </select>
              </div>
              <p className="text-xs text-slate-600 font-mono mt-0.5 flex items-center gap-1.5 flex-wrap">
                <span className="font-black text-slate-900 text-sm tracking-wide bg-slate-100 px-2 py-0.5 rounded-md select-all border border-slate-200/80">
                  📞 {activeLead.phone}
                </span>
                <span className="text-slate-400">•</span>
                <span className="font-bold text-slate-600">{activeLead.channelName}</span>
              </p>
            </div>
          </div>

          {/* Quick Agent Actions */}
          <div className="flex items-center gap-2">
            <div className="text-right hidden sm:block">
              <span className="text-[10px] font-bold text-slate-600 block">ASSIGNED TO</span>
              <span className="text-xs font-bold text-orange-600">{activeLead.assignedTo}</span>
            </div>

            {/* Direct WhatsApp Web Link for 1-Click First Contact */}
            <a
              href={`https://wa.me/${(activeLead.phone || '').replace(/[^0-9]/g, '')}?text=${encodeURIComponent('Assalam o Alaikum, AmazFast support team se rabta karne ka shukriya!')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all"
              title="Direct WhatsApp Web ya Mobile App mein khol kar baat shuru karein"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">WhatsApp Web</span>
            </a>

            <button 
              onClick={() => alert(`Calling ${activeLead.phone} via WhatsApp VoIP...`)}
              className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700"
              title="Call Lead"
            >
              <Phone className="w-4 h-4" />
            </button>

            {/* Customer CRM Profile Toggle (Gives laptops spacious unzoomed chat width) */}
            <button 
              type="button"
              onClick={() => setShowCustomerDetails(prev => !prev)}
              className={`p-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all ${
                showCustomerDetails 
                  ? 'bg-orange-500 text-white border-orange-500 shadow-2xs' 
                  : 'border-slate-200 hover:bg-slate-50 text-slate-700 bg-white'
              }`}
              title={showCustomerDetails ? "Customer Details Chupayein" : "Customer Details Dekhein"}
            >
              <Info className="w-4 h-4" />
              <span className="hidden xl:inline">{showCustomerDetails ? 'Hide Details' : 'Details'}</span>
            </button>
          </div>
        </div>

        {/* ⚡ AmazFast Smart Qualification & Service Bar (Paper-Pencil Replacement) */}
        <div className="bg-white border-b border-slate-200 px-3.5 py-2 flex flex-wrap items-center justify-between gap-2 shrink-0 shadow-2xs">
          {/* Service Dropdown */}
          <div className="flex items-center gap-1.5 min-w-[220px]">
            <span className="text-[11px] font-black uppercase text-slate-500 flex items-center gap-1">
              <span>💼</span>
              <span>Service:</span>
            </span>
            <select
              value={activeLead.serviceInterest || ''}
              onChange={(e) => {
                const sVal = e.target.value;
                onUpdateLead(activeLead.id, { serviceInterest: sVal });
                if (sVal) {
                  setSmartBarToast(`💼 Service "${sVal}" save ho gayi! Dashboard update ✓`);
                  setTimeout(() => setSmartBarToast(null), 3000);
                }
              }}
              className="flex-1 text-xs font-bold px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 text-slate-800 focus:outline-none focus:border-orange-500 cursor-pointer shadow-2xs transition-all hover:bg-orange-50/40"
              title="Customer kis AmazFast service mein interested hai (LLC, Stripe, Amazon, Tax, etc.)"
            >
              <option value="">-- Service Select Karein --</option>
              {AMAZFAST_SERVICES.map((s) => (
                <option key={s.id} value={s.shortLabel}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          {/* 1-Click Fast Qualification Buttons */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Qualified Button */}
            <button
              type="button"
              onClick={() => {
                onUpdateLead(activeLead.id, { stage: 'Qualified' });
                setSmartBarToast('🟣 Lead "Qualified" ho gayi! Dashboard KPI update ✓');
                setTimeout(() => setSmartBarToast(null), 3500);
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all flex items-center gap-1 shadow-2xs ${
                activeLead.stage === 'Qualified'
                  ? 'bg-purple-600 text-white ring-2 ring-purple-300'
                  : 'bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200'
              }`}
              title="Mark as Genuine / Qualified Buyer"
            >
              <span>🟣</span>
              <span>Qualified</span>
            </button>

            {/* Unqualified / Lost Button */}
            <button
              type="button"
              onClick={() => {
                onUpdateLead(activeLead.id, { stage: 'Lost' });
                setSmartBarToast('🔴 Lead "Unqualified / Rejected" ho gayi! Dashboard update ✓');
                setTimeout(() => setSmartBarToast(null), 3500);
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all flex items-center gap-1 shadow-2xs ${
                activeLead.stage === 'Lost'
                  ? 'bg-rose-600 text-white ring-2 ring-rose-300'
                  : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
              }`}
              title="Mark as Unqualified / Not Interested / Spam"
            >
              <span>🔴</span>
              <span>Unqualified</span>
            </button>

            {/* Deal Closed / Won Button (Direct One-Click Deal Won) */}
            <button
              type="button"
              onClick={() => {
                onUpdateLead(activeLead.id, { stage: 'Deal Won' });
                setSmartBarToast(`🟢 Mubarak! Deal Won ho gayi! Dashboard update ✓`);
                setTimeout(() => setSmartBarToast(null), 3000);
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all flex items-center gap-1 shadow-2xs ${
                activeLead.stage === 'Deal Won'
                  ? 'bg-emerald-600 text-white ring-2 ring-emerald-300'
                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
              }`}
              title="Order Final / Deal Closed"
            >
              <span>🟢</span>
              <span>Deal Won</span>
            </button>

            {/* Follow-up Reminder Button */}
            <button
              type="button"
              onClick={() => setShowAddReminderForm(true)}
              className="px-2.5 py-1 rounded-lg text-xs font-black bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200 transition-all flex items-center gap-1 shadow-2xs"
              title="Follow-up Call / Message Schedule Karein"
            >
              <span>⏰</span>
              <span>Follow-up</span>
            </button>

            {/* Direct Free WhatsApp Button */}
            <a
              href={`https://wa.me/${(activeLead.phone || '').replace(/[^0-9]/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-2.5 py-1 rounded-lg text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white transition-all flex items-center gap-1 shadow-2xs"
              title="Mobile ya WhatsApp Web par free mein direct chat kholein"
            >
              <span>💬</span>
              <span>Free WA</span>
            </a>
          </div>
        </div>

        {/* Live Status Toast Banner */}
        {smartBarToast && (
          <div className="bg-slate-900 text-white text-xs font-bold px-4 py-1.5 flex items-center justify-between shadow-md animate-in slide-in-from-top-1">
            <span className="flex items-center gap-1.5">
              <Check className="w-4 h-4 text-emerald-400" />
              <span>{smartBarToast}</span>
            </span>
            <button 
              onClick={() => setSmartBarToast(null)}
              className="text-slate-400 hover:text-white text-xs ml-4"
            >
              ✕
            </button>
          </div>
        )}

        {/* Message Thread */}
        <div 
          ref={chatScrollContainerRef}
          onScroll={handleChatScroll}
          className="flex-1 p-5 overflow-y-auto space-y-4 relative"
        >
          <div className="text-center my-2">
            <span className="text-[10px] font-bold uppercase tracking-wider bg-white px-3 py-1 rounded-full text-slate-600 border border-slate-200 shadow-2xs">
              Chat started on {activeLead.channelName}
            </span>
          </div>

          {/* Meta 24-Hour Policy Notice: If customer hasn't replied yet */}
          {!(activeLead.messages || []).some(m => m.sender === 'customer') ? (
            <div className="p-3 bg-amber-50 border border-amber-300 rounded-2xl text-xs text-amber-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
              <div className="flex items-start gap-2.5">
                <div className="w-7 h-7 rounded-xl bg-amber-200 text-amber-800 flex items-center justify-center font-black text-sm shrink-0">
                  ⚠️
                </div>
                <div>
                  <span className="font-extrabold text-amber-950 block">Naya Manually Added Number (Meta 24h Policy):</span>
                  <p className="text-[11px] text-amber-900 leading-snug mt-0.5">
                    Is customer ne abhi tak aapke number par WhatsApp se message nahi kiya. Meta Cloud API anjaan number ko direct free text bhejne ki ijazat nahi deta. Pehla message WhatsApp Web se karein ya customer se message karwayen.
                  </p>
                </div>
              </div>
              <a
                href={`https://wa.me/${(activeLead.phone || '').replace(/[^0-9]/g, '')}?text=${encodeURIComponent('Assalam o Alaikum, AmazFast support se rabta karne ka shukriya!')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shrink-0 flex items-center justify-center gap-1.5 shadow-sm transition-all"
              >
                <span>📱 WhatsApp Se Pehla Msg Karein ↗</span>
              </a>
            </div>
          ) : (
            /* WhatsApp Cloud API 24h Policy Notice for Active Customer */
            <div className="p-2.5 bg-blue-50/80 border border-blue-200/60 rounded-xl text-[11px] text-blue-900 flex items-start gap-2 shadow-2xs">
              <ShieldAlert className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Meta WhatsApp Official Session Guide:</span>
                <p className="text-blue-800 text-[10px] mt-0.5 leading-snug">
                  Customer jab aapke number (<code className="font-bold">{activeLead.channel === 'pakistan' ? '+92 371 0327973' : activeLead.phone}</code>) par WhatsApp se message bhejta hai, to 24-ghante ki free chat window open hoti hai aur CRM se replies foran deliver hote hain.
                </p>
              </div>
            </div>
          )}

          {/* Messages Loop */}
          {(activeLead.messages || []).filter(msg => {
            if (!msg) return false;
            const hasText = Boolean(msg.text && msg.text.trim().length > 0 && msg.text.trim() !== 'Invalid Date');
            const hasMedia = Boolean(msg.mediaUrl || msg.mediaType === 'AUDIO' || (msg.text?.startsWith('out_') && msg.text?.endsWith('.mp3')));
            return hasText || hasMedia;
          }).map((msg) => {
            const isCustomer = msg.sender === 'customer';
            const reaction = getMsgReaction(msg.id, msg.reaction);
            return (
              <div
                key={msg.id}
                className={`flex flex-col group/msg relative ${isCustomer ? 'items-start' : 'items-end'}`}
              >
                {!isCustomer && msg.agentName && (
                  <span className="text-[10px] font-bold text-slate-600 mb-0.5 mr-1 flex items-center gap-1">
                    <span>{msg.agentName}</span>
                    <span className="text-orange-600">• Agent</span>
                  </span>
                )}

                <div className="relative max-w-md">
                  {/* WhatsApp Quick Action Bar on Hover (React + Forward) */}
                  <div
                    className={`absolute -top-3.5 ${
                      isCustomer ? '-right-1' : '-left-1'
                    } hidden group-hover/msg:flex items-center gap-0.5 bg-white border border-slate-200 rounded-full shadow-md px-1.5 py-0.5 z-20 transition-all`}
                  >
                    {/* Emoji React Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveReactionMsgId(activeReactionMsgId === msg.id ? null : msg.id);
                      }}
                      className="p-1 rounded-full hover:bg-amber-50 text-slate-500 hover:text-amber-600 transition-colors"
                      title="Emoji React Karein (WhatsApp Style)"
                    >
                      <Smile className="w-3.5 h-3.5" />
                    </button>

                    {/* Forward Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setForwardingMsg(msg);
                        setActiveReactionMsgId(null);
                      }}
                      className="p-1 rounded-full hover:bg-orange-50 text-slate-500 hover:text-orange-600 transition-colors"
                      title="Kisi aur Customer ko Forward Karein"
                    >
                      <Forward className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Floating Emoji Picker when active */}
                  {activeReactionMsgId === msg.id && (
                    <div
                      className={`absolute -top-11 ${
                        isCustomer ? 'left-0' : 'right-0'
                      } bg-white border border-slate-200 rounded-full shadow-xl px-2 py-1 flex items-center gap-1 z-30 animate-in fade-in zoom-in-95`}
                    >
                      {REACTION_EMOJIS.map((emoji) => {
                        const isSelected = reaction === emoji;
                        return (
                          <button
                            key={emoji}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleReaction(msg, emoji);
                            }}
                            className={`text-sm p-1 hover:scale-125 transition-transform rounded-full ${
                              isSelected ? 'bg-amber-100 ring-1 ring-amber-400' : 'hover:bg-slate-100'
                            }`}
                            title={`React ${emoji}`}
                          >
                            {emoji}
                          </button>
                        );
                      })}
                      <button
                        type="button"
                        onClick={() => setActiveReactionMsgId(null)}
                        className="p-0.5 text-slate-400 hover:text-slate-600 rounded-full ml-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )}

                  {/* Message Bubble */}
                  <div
                    className={`p-3.5 rounded-2xl text-xs font-medium leading-relaxed shadow-sm relative ${
                      isCustomer
                        ? 'bg-white text-slate-800 rounded-tl-none border border-slate-200/80'
                        : 'bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-tr-none'
                    }`}
                  >
                    {/* 1. Voice Note / Audio Player */}
                    {isAudioMessage(msg) ? (
                      <div className="py-1 min-w-[280px]">
                        <div className="flex items-center gap-2.5">
                          {/* WhatsApp Style Profile Picture with Mic Badge */}
                          <div className="relative shrink-0">
                            <img
                              src={isCustomer ? (activeLead.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(activeLead.name || 'C')}&background=075E54&color=fff`) : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                              alt="Voice Sender"
                              className="w-10 h-10 rounded-full object-cover border-2 border-white/80 shadow-xs"
                              onError={(e) => { e.target.src = 'https://ui-avatars.com/api/?name=User&background=f97316&color=fff'; }}
                            />
                            <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center text-white shadow-xs">
                              <Mic className="w-2.5 h-2.5 stroke-[2.5]" />
                            </span>
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between mb-1 text-[11px] font-bold">
                              <span>WhatsApp Voice Note</span>
                              <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold ${
                                isCustomer ? 'bg-slate-100 text-slate-600' : 'bg-black/20 text-white'
                              }`}>
                                PTT
                              </span>
                            </div>
                            {msg.mediaUrl ? (
                              <div className="space-y-1">
                                <audio
                                  controls
                                  preload="metadata"
                                  className="w-full h-8 rounded-lg"
                                  src={getMediaSrc(msg.mediaUrl)}
                                />
                                <div className="flex items-center justify-between text-[10px] pt-0.5">
                                  <span className={isCustomer ? 'text-slate-500 font-medium' : 'text-orange-100'}>
                                    Audio Voice Note
                                  </span>
                                  <a
                                    href={`${getMediaSrc(msg.mediaUrl)}?download=1&filename=voice_${msg.id || Date.now()}.mp3`}
                                    download={`voice_note_${msg.id || Date.now()}.mp3`}
                                    onClick={(e) => e.stopPropagation()}
                                    className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                                      isCustomer
                                        ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                                        : 'bg-white/20 hover:bg-white/30 text-white'
                                    }`}
                                    title="Voice recording apne computer mein save karein"
                                  >
                                    <Download className="w-2.5 h-2.5" />
                                    <span>Download</span>
                                  </a>
                                </div>
                              </div>
                            ) : (
                              <div className="text-[10px] italic opacity-80">Voice message recorded</div>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : isPdfMessage(msg) ? (
                      /* 2. Rich WhatsApp PDF Document Card */
                      <div className={`p-3 rounded-2xl border transition-all min-w-[270px] ${
                        isCustomer 
                          ? 'bg-slate-50/90 border-slate-200/90 text-slate-800' 
                          : 'bg-white/15 border-white/25 text-white'
                      }`}>
                        <div className="flex items-start gap-3">
                          <div className="w-11 h-11 rounded-xl bg-red-500/10 border border-red-500/30 flex flex-col items-center justify-center shrink-0 text-red-600 font-extrabold shadow-2xs">
                            <FileText className="w-5 h-5 text-red-500" />
                            <span className="text-[8px] tracking-wider font-black -mt-0.5 text-red-600">PDF</span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <h5 className="text-xs font-bold truncate leading-tight" title={msg.text || 'WhatsApp PDF Document'}>
                              {formatDocFileName(msg.text)}
                            </h5>
                            <p className={`text-[10px] mt-0.5 ${isCustomer ? 'text-slate-500' : 'text-orange-100'}`}>
                              WhatsApp PDF Document
                            </p>
                            <div className="flex items-center gap-2 mt-2 pt-1 border-t border-black/5 dark:border-white/10">
                              <a
                                href={getMediaSrc(msg.mediaUrl || msg.text)}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all shadow-2xs ${
                                  isCustomer
                                    ? 'bg-orange-500 text-white hover:bg-orange-600'
                                    : 'bg-white text-orange-600 hover:bg-orange-50'
                                }`}
                                title="PDF Nayi Tab Mein Kholein"
                              >
                                <ExternalLink className="w-3 h-3" />
                                <span>Dekhein</span>
                              </a>
                              <a
                                href={`${getMediaSrc(msg.mediaUrl || msg.text)}?download=1&filename=${encodeURIComponent(msg.text || 'document.pdf')}`}
                                download={msg.text || 'document.pdf'}
                                onClick={(e) => e.stopPropagation()}
                                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all border ${
                                  isCustomer
                                    ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                                    : 'bg-white/10 hover:bg-white/20 text-white border-white/20'
                                }`}
                                title="PDF Computer Mein Download Karein"
                              >
                                <Download className="w-3 h-3" />
                                <span>Download</span>
                              </a>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : isDocMessage(msg) ? (
                      /* 3. General Document Card (Word, Excel, Text) */
                      <div className={`p-2.5 rounded-xl border transition-all min-w-[250px] ${
                        isCustomer 
                          ? 'bg-slate-50 border-slate-200 text-slate-800' 
                          : 'bg-white/10 border-white/20 text-white'
                      }`}>
                        <div className="flex items-center gap-2.5">
                          <div className={`p-2 rounded-lg text-lg ${isCustomer ? 'bg-orange-100 text-orange-600' : 'bg-white/20 text-white'}`}>
                            <File className="w-4 h-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold truncate" title={msg.text}>{formatDocFileName(msg.text)}</p>
                            <span className="text-[10px] opacity-75">WhatsApp Document</span>
                          </div>
                          <a
                            href={`${getMediaSrc(msg.mediaUrl || msg.text)}?download=1&filename=${encodeURIComponent(msg.text || 'document')}`}
                            download={msg.text || 'document'}
                            onClick={(e) => e.stopPropagation()}
                            className="p-1.5 rounded-lg hover:bg-black/10 transition-colors"
                            title="Download Document"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </div>
                    ) : isVideoMessage(msg) && msg.mediaUrl ? (
                      /* 4. Video Player */
                      <div className="space-y-1.5 max-w-[280px]">
                        <video
                          controls
                          className="rounded-xl w-full max-h-[220px] bg-black"
                          src={getMediaSrc(msg.mediaUrl)}
                        />
                        {msg.text && msg.text !== 'Video' && (
                          <div className="text-xs whitespace-pre-wrap leading-relaxed">
                            {renderMessageContent(msg.text, isCustomer)}
                          </div>
                        )}
                      </div>
                    ) : isImageMessage(msg) && msg.mediaUrl ? (
                      /* 5. Image with Preview */
                      <div className="space-y-1.5">
                        <img
                          src={getMediaSrc(msg.mediaUrl)}
                          alt="WhatsApp Image"
                          className="rounded-xl max-w-[260px] max-h-[260px] object-cover cursor-pointer hover:opacity-95 transition-opacity border border-white/20 shadow-sm"
                          onClick={() => window.open(getMediaSrc(msg.mediaUrl), '_blank')}
                        />
                        {msg.text && msg.text !== 'Photo' && !msg.text.startsWith('out_') && (
                          <div className="text-xs whitespace-pre-wrap leading-relaxed">
                            {renderMessageContent(msg.text, isCustomer)}
                          </div>
                        )}
                      </div>
                    ) : (
                      /* 6. Standard Text Message */
                      <div className="whitespace-pre-wrap leading-relaxed text-xs break-words break-all">
                        {renderMessageContent(
                          msg.text?.startsWith('out_') && msg.text?.endsWith('.mp3') ? 'Voice Note' : msg.text, 
                          isCustomer
                        )}
                      </div>
                    )}

                    <div
                      className={`flex items-center justify-end gap-1 mt-1 text-[10px] ${
                        isCustomer ? 'text-slate-600' : 'text-orange-100'
                      }`}
                    >
                      <span className="font-medium font-mono">{formatSafeTime(msg.time || msg.createdAt)}</span>
                      {!isCustomer && (
                        msg.status === 'failed' ? (
                          <span title={msg.errorReason || "WhatsApp deliver nahi hua (Customer care session closed ya Meta restriction)"} className="inline-flex items-center gap-0.5 text-red-200">
                            <AlertCircle className="w-3.5 h-3.5 text-red-300 stroke-[2.5]" />
                          </span>
                        ) : msg.status === 'sending' ? (
                          <Clock className="w-3.5 h-3.5 text-orange-200 animate-spin" />
                        ) : (
                          <CheckCheck className="w-3.5 h-3.5 text-white stroke-[2.5]" />
                        )
                      )}
                    </div>

                    {/* Reaction Floating Badge */}
                    {reaction && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleReaction(msg, reaction);
                        }}
                        title="Reaction hatane ke liye dabayein"
                        className={`absolute -bottom-2.5 ${
                          isCustomer ? 'right-2' : 'left-2'
                        } bg-white border border-slate-200 shadow-sm px-1.5 py-0.5 rounded-full text-xs flex items-center gap-0.5 hover:scale-110 transition-transform cursor-pointer z-10 text-slate-800`}
                      >
                        <span>{reaction}</span>
                      </button>
                    )}
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

          {/* Auto-scroll anchor */}
          <div ref={messagesEndRef} className="h-1" />
        </div>

        {/* Scroll To Bottom Floating Button */}
        {showScrollBottomBtn && (
          <div className="relative">
            <button
              type="button"
              onClick={() => scrollToBottom('smooth')}
              className="absolute -top-12 right-6 z-20 px-3 py-1.5 rounded-full bg-white text-orange-600 shadow-md border border-slate-200 hover:bg-orange-50 hover:scale-105 transition-all flex items-center gap-1 text-xs font-bold"
              title="Naye messages par jayein"
            >
              <ArrowDown className="w-3.5 h-3.5 animate-bounce" />
              <span>Naye Messages (Neeche)</span>
            </button>
          </div>
        )}

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

          {isRecording ? (
            <div className="flex items-center gap-3 p-2.5 bg-red-50 border border-red-200 rounded-xl">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse shrink-0" />
                <span className="text-xs font-bold text-red-700">Voice Note Record Ho Raha Hai:</span>
                <span className="text-xs font-mono font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded-md shrink-0">
                  {Math.floor(recordingSeconds / 60)}:{(recordingSeconds % 60).toString().padStart(2, '0')}
                </span>
                <div className="hidden sm:flex items-center gap-1 h-3 flex-1 overflow-hidden opacity-60">
                  <div className="w-1 bg-red-400 h-2 animate-pulse" />
                  <div className="w-1 bg-red-500 h-3 animate-pulse delay-75" />
                  <div className="w-1 bg-red-400 h-2.5 animate-pulse delay-150" />
                  <div className="w-1 bg-red-600 h-3 animate-pulse delay-100" />
                  <div className="w-1 bg-red-500 h-2 animate-pulse delay-200" />
                </div>
              </div>
              <button
                type="button"
                onClick={cancelRecording}
                className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:text-red-600 hover:bg-red-100 transition-colors flex items-center gap-1"
                title="Cancel Recording"
              >
                <Trash2 className="w-3.5 h-3.5" /> Cancel
              </button>
              <button
                type="button"
                onClick={sendVoiceRecording}
                className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-red-500 hover:bg-red-600 text-white shadow-xs flex items-center gap-1.5 transition-all"
                title="Send Voice Note"
              >
                <Send className="w-3.5 h-3.5" /> Voice Bhejein
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt"
                className="hidden"
                onChange={handleImageSelect}
              />
              <button 
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-2 text-slate-400 hover:text-orange-600 rounded-xl hover:bg-orange-50 transition-colors"
                title="Photo ya Document File Select Karein"
              >
                <Paperclip className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={startRecording}
                className="p-2 text-slate-400 hover:text-orange-600 rounded-xl hover:bg-orange-50 transition-colors"
                title="Voice Note Record Karein"
              >
                <Mic className="w-4 h-4" />
              </button>

              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={
                  isInternalNote
                    ? "🔒 Team ke liye note likhein (Customer ko nahi dikhega)..."
                    : pendingImage
                      ? "Caption likhein (optional)..."
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
                disabled={(!inputText.trim() && !pendingImage) || isUploading}
                className={`p-2.5 rounded-xl font-bold text-white transition-all shadow-sm ${
                  isInternalNote
                    ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/30'
                    : 'bg-orange-500 hover:bg-orange-600 shadow-orange-500/30'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </div>
          )}

          {/* Pending Media Preview Strip */}
          {pendingImage && (
            <div className="mt-2 flex items-center gap-2 p-2 bg-orange-50 border border-orange-200 rounded-xl">
              {pendingImage.isImage ? (
                <img
                  src={pendingImage.previewUrl}
                  alt="Preview"
                  className="w-12 h-12 object-cover rounded-lg border border-orange-300 shrink-0"
                />
              ) : (
                <div className="w-12 h-12 rounded-lg bg-orange-100 border border-orange-300 flex items-center justify-center text-xl shrink-0">
                  📄
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-bold text-orange-900 truncate">{pendingImage.fileName}</p>
                <p className="text-[10px] text-orange-600">
                  {pendingImage.isImage ? 'Photo' : 'Document'} ready to send
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPendingImage(null)}
                className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                title="Cancel"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
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
            {(activeLead?.name || '+').charAt(0)}
          </div>
          <h4 className="mt-3 text-base font-black text-slate-900 tracking-tight">{activeLead.name}</h4>
          
          {/* Bold, prominent customer phone number */}
          <div className="mt-2 flex items-center justify-center">
            <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 text-white shadow-md border border-slate-800">
              <Phone className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-lg font-black font-mono tracking-wider select-all text-white">
                {activeLead.phone}
              </span>
            </div>
          </div>

          <div className="mt-2.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white border border-slate-200 text-xs font-bold text-slate-700 shadow-2xs">
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
            <span className="text-[10px] text-orange-600 font-bold">Live DB Sync</span>
          </label>
          <select
            value={activeLead.assignedToId || ''}
            onChange={(e) => {
              const selectedId = e.target.value;
              const selectedAgent = realStaffList.find((s) => s.id === selectedId);
              onUpdateLead(activeLead.id, {
                assignedToId: selectedId ? selectedId : null,
                assignedTo: selectedAgent ? selectedAgent.name : 'Unassigned',
              });
            }}
            className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-orange-500 cursor-pointer"
          >
            <option value="">-- Kisi Ko Assign Nahi (Unassigned) --</option>
            {realStaffList.length > 0 ? (
              realStaffList.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.name} ({agent.role}) - {agent.isOnline ? '🟢 Online' : '⚪ Offline'}
                </option>
              ))
            ) : (
              AGENTS.map((a) => (
                <option key={a.id} value={a.name}>
                  {a.name} ({a.country})
                </option>
              ))
            )}
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
            {(activeLead.tags || []).map((tag) => (
              <span key={tag} className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-orange-50 text-orange-700 border border-orange-200">
                {tag}
              </span>
            ))}
            <button 
              onClick={() => {
                const newTag = prompt('Naya tag likhein:');
                if (newTag) {
                  onUpdateLead(activeLead.id, { tags: [...(activeLead.tags || []), newTag] });
                }
              }}
              className="px-2 py-1 rounded-lg text-[11px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-600"
            >
              + Tag
            </button>
          </div>
        </div>

        {/* Customer Follow-up & Reminders Section */}
        <div className="space-y-2.5 pt-2 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <label className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-orange-600" />
              <span>Lead Reminder & Follow-up</span>
            </label>
            {!showAddReminderForm && (
              <button
                type="button"
                onClick={() => setShowAddReminderForm(true)}
                className="text-[11px] font-bold text-orange-600 hover:text-orange-700 bg-orange-50 hover:bg-orange-100 px-2.5 py-1 rounded-lg border border-orange-200 transition-colors flex items-center gap-1"
                title="Is customer ke liye naya reminder schedule karein"
              >
                <Plus className="w-3 h-3 stroke-[2.5]" />
                <span>+ Schedule</span>
              </button>
            )}
          </div>

          {/* Toast Notification */}
          {reminderToast && (
            <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-[11px] font-bold flex items-center gap-1.5 animate-in fade-in">
              <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>{reminderToast}</span>
            </div>
          )}

          {/* Add / Edit Reminder Form */}
          {showAddReminderForm && (
            <form onSubmit={handleCreateLeadReminder} className="p-3 bg-orange-50/50 rounded-xl border border-orange-200 space-y-2 text-xs animate-in fade-in">
              <div className="flex items-center justify-between pb-1 border-b border-orange-200/60">
                <span className="font-extrabold text-orange-950 text-[11px]">
                  {editingRemId ? '✏️ Reminder Edit Karein' : 'Naya Reminder Schedule Karein'}
                </span>
                <button
                  type="button"
                  onClick={() => { setShowAddReminderForm(false); setEditingRemId(null); }}
                  className="p-0.5 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Topic / Mauzoo:</label>
                <input
                  type="text"
                  required
                  value={newRemTitle}
                  onChange={(e) => setNewRemTitle(e.target.value)}
                  placeholder="e.g. Rate Quotation, Demo Call, Order Finalize"
                  className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-orange-500"
                />
              </div>

              {/* Custom WhatsApp Message Input */}
              <div>
                <label className="text-[10px] font-bold text-slate-700 block mb-0.5 flex items-center justify-between">
                  <span>WhatsApp Message (Jo Bhejna Hai):</span>
                  <span className="text-[9px] text-orange-600 font-bold">Auto-Deliver Hoga</span>
                </label>
                <textarea
                  rows={2}
                  value={newRemCustomMsg}
                  onChange={(e) => setNewRemCustomMsg(e.target.value)}
                  placeholder={`Assalam o Alaikum ${activeLead?.name || 'Customer'}! Yeh aapke follow-up ke hawale se message hai...`}
                  className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:border-orange-500 resize-none"
                />
              </div>

              {/* Date & 12-Hour Time Picker (No 17:00 / 24-hour confusion!) */}
              <div className="space-y-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Tareekh (Date):</label>
                  <input
                    type="date"
                    required
                    value={newRemDate}
                    onChange={(e) => setNewRemDate(e.target.value)}
                    className="w-full p-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Waqt (12-Hour Time AM/PM):</label>
                  <div className="flex items-center gap-1.5">
                    {/* Hour (1-12) */}
                    <select
                      value={newRemHour}
                      onChange={(e) => setNewRemHour(e.target.value)}
                      className="flex-1 p-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:border-orange-500"
                    >
                      {['01','02','03','04','05','06','07','08','09','10','11','12'].map(h => (
                        <option key={h} value={h}>{h} baje</option>
                      ))}
                    </select>

                    <span className="font-bold text-slate-400">:</span>

                    {/* Minute (00-55) */}
                    <select
                      value={newRemMinute}
                      onChange={(e) => setNewRemMinute(e.target.value)}
                      className="flex-1 p-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:border-orange-500"
                    >
                      {['00','05','10','15','20','25','30','35','40','45','50','55'].map(m => (
                        <option key={m} value={m}>{m} min</option>
                      ))}
                    </select>

                    {/* AM / PM Pills */}
                    <div className="flex rounded-lg border border-slate-200 p-0.5 bg-slate-100 shrink-0">
                      <button
                        type="button"
                        onClick={() => setNewRemAmPm('AM')}
                        className={`px-2 py-1 rounded text-[10px] font-black transition-all ${
                          newRemAmPm === 'AM' ? 'bg-orange-500 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        AM
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewRemAmPm('PM')}
                        className={`px-2 py-1 rounded text-[10px] font-black transition-all ${
                          newRemAmPm === 'PM' ? 'bg-orange-500 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        PM
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Auto-send toggle */}
              <label className="flex items-center gap-2 cursor-pointer select-none bg-orange-100/40 p-2 rounded-lg border border-orange-200/60 mt-1">
                <input
                  type="checkbox"
                  checked={newRemAutoSend}
                  onChange={(e) => setNewRemAutoSend(e.target.checked)}
                  className="w-3.5 h-3.5 accent-orange-600 rounded"
                />
                <span className="text-[11px] font-extrabold text-orange-950">
                  ⚡ Muqarrar waqt par automatically WhatsApp send karein
                </span>
              </label>

              <div>
                <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Priority:</label>
                <div className="flex items-center gap-1.5">
                  {['HIGH', 'MEDIUM', 'LOW'].map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setNewRemPriority(p)}
                      className={`flex-1 py-1 rounded-lg text-[10px] font-extrabold transition-all border ${
                        newRemPriority === p
                          ? p === 'HIGH' ? 'bg-rose-500 text-white border-rose-600' : p === 'MEDIUM' ? 'bg-amber-500 text-white border-amber-600' : 'bg-slate-700 text-white border-slate-800'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="submit"
                  className="flex-1 py-1.5 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-lg text-xs shadow-2xs transition-colors"
                >
                  {editingRemId ? 'Update Karein' : 'Schedule Karein'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowAddReminderForm(false); setEditingRemId(null); }}
                  className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs transition-colors"
                >
                  Radd
                </button>
              </div>
            </form>
          )}

          {/* List of active customer's reminders */}
          {activeLeadReminders.length === 0 && !showAddReminderForm ? (
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-150 text-center">
              <Clock className="w-5 h-5 text-slate-400 mx-auto mb-1" />
              <p className="text-[11px] font-bold text-slate-700">Koi Reminder Schedule Nahi</p>
              <p className="text-[10px] text-slate-500 mt-0.5">Is customer ke liye follow-up callback schedule karne ke liye button dabayein.</p>
              <button
                type="button"
                onClick={() => setShowAddReminderForm(true)}
                className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-orange-600 hover:text-orange-700"
              >
                <span>+ Follow-up Add Karein</span>
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {activeLeadReminders.map((rem) => {
                const isOverdue = rem.date < new Date().toISOString().slice(0, 10) && !rem.completed;
                return (
                  <div
                    key={rem.id}
                    className={`p-2.5 rounded-xl border transition-all text-xs space-y-1.5 ${
                      rem.completed
                        ? 'bg-slate-50/70 border-slate-200 opacity-70'
                        : isOverdue
                        ? 'bg-rose-50/60 border-rose-200'
                        : 'bg-white border-slate-200 shadow-2xs'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1.5">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                          <span className={`text-[9px] font-black px-1.5 py-0.2 rounded border ${
                            rem.priority === 'HIGH' ? 'bg-rose-100 text-rose-700 border-rose-200' :
                            rem.priority === 'MEDIUM' ? 'bg-amber-100 text-amber-700 border-amber-200' :
                            'bg-slate-100 text-slate-600 border-slate-200'
                          }`}>
                            {rem.priority}
                          </span>
                          <span className="text-[10px] font-bold text-slate-600 font-mono">
                            {rem.date} @ {formatTo12Hour(rem.time)}
                          </span>
                          {rem.autoSend !== false && !rem.completed && !rem.reminderSent && (
                            <span className="text-[9px] px-1 py-0.2 rounded font-extrabold bg-blue-50 text-blue-700 border border-blue-200">
                              ⚡ Auto
                            </span>
                          )}
                        </div>
                        <h5 className={`font-bold leading-snug truncate ${rem.completed ? 'line-through text-slate-500' : 'text-slate-900'}`}>
                          {rem.title}
                        </h5>
                        {rem.customMessage && (
                          <p className={`text-[11px] p-1.5 rounded-lg border font-medium mt-1 leading-snug break-words ${
                            rem.completed ? 'bg-slate-100/60 border-slate-200 text-slate-500 line-through' : 'bg-orange-50/70 border-orange-200/70 text-slate-800'
                          }`}>
                            💬 "{rem.customMessage}"
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {/* Edit Reminder */}
                        <button
                          type="button"
                          onClick={() => handleStartEditLeadReminder(rem)}
                          className="p-1 rounded-md text-slate-400 hover:text-amber-600 hover:bg-amber-50"
                          title="Reminder Edit Karein"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleLeadReminder(rem.id)}
                          className={`p-1 rounded-md text-[10px] font-bold ${
                            rem.completed ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600 hover:bg-emerald-50 hover:text-emerald-700'
                          }`}
                          title={rem.completed ? 'Wapis Pending Karein' : 'Mukammal (Done) Mark Karein'}
                        >
                          <Check className="w-3 h-3 stroke-[2.5]" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteLeadReminder(rem.id)}
                          className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                          title="Reminder Khatam Karein"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {/* WhatsApp Action Button */}
                    <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[10px]">
                      {rem.reminderSent ? (
                        <span className="text-emerald-600 font-bold flex items-center gap-1">
                          <CheckCheck className="w-3 h-3" /> Sent ({rem.reminderSentAt || 'Haan'})
                        </span>
                      ) : (
                        <span className="text-slate-500">
                          {rem.completed ? 'Completed' : 'Pending Callback'}
                        </span>
                      )}

                      {!rem.completed && (
                        <button
                          type="button"
                          disabled={sendingReminderId === rem.id}
                          onClick={() => handleSendWhatsAppReminderDirect(rem)}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold border border-emerald-200 transition-colors shadow-2xs"
                          title="Is customer ko WhatsApp par direct reminder message bhejein"
                        >
                          {sendingReminderId === rem.id ? (
                            <Loader2 className="w-2.5 h-2.5 animate-spin" />
                          ) : (
                            <Zap className="w-2.5 h-2.5 fill-emerald-600" />
                          )}
                          <span>WhatsApp Reminder</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Quick Information Box */}
        <div className="p-3 rounded-xl bg-orange-50/50 border border-orange-100 text-slate-700 text-xs space-y-1">
          <p className="font-extrabold text-orange-900">Regional Routing Active</p>
          <p className="text-[11px] text-slate-600">
            Replies to this customer are routed via the {activeLead.channelName} gateway automatically.
          </p>
        </div>
      </div>
      </>
      )}

      {/* 4. Forward Message Modal */}
      {forwardingMsg && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]">
            {/* Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center font-bold">
                  <Forward className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">Message Forward Karein</h3>
                  <p className="text-[11px] text-slate-500">Kisi doosre customer ko yeh WhatsApp par bhejein</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setForwardingMsg(null)}
                className="p-1 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Message Preview */}
            <div className="p-3 bg-slate-50 border-b border-slate-200/70 text-xs text-slate-700">
              <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Preview:</span>
              <div className="p-2.5 bg-white rounded-xl border border-slate-200 line-clamp-3 italic text-slate-800 shadow-2xs">
                {forwardingMsg.text || (forwardingMsg.mediaType === 'AUDIO' ? '🎵 Voice Note' : '📎 Attachment')}
              </div>
            </div>

            {/* Search Input */}
            <div className="p-3 border-b border-slate-100">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={forwardSearch}
                  onChange={(e) => setForwardSearch(e.target.value)}
                  placeholder="Customer ka naam ya phone likhein..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 rounded-xl text-xs border border-slate-200 focus:outline-none focus:border-orange-500 font-medium"
                  autoFocus
                />
              </div>
            </div>

            {/* Customer List */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2 space-y-1">
              {uniqueLeads
                .filter(l => l.id !== activeLead?.id)
                .filter(l => {
                  if (!forwardSearch) return true;
                  const q = forwardSearch.toLowerCase();
                  return (l.name || '').toLowerCase().includes(q) || (l.phone || '').includes(q);
                })
                .slice(0, 30)
                .map(lead => (
                  <div
                    key={lead.id}
                    onClick={() => handleExecuteForward(lead, forwardingMsg)}
                    className="p-2.5 flex items-center justify-between hover:bg-orange-50/70 cursor-pointer rounded-xl transition-colors group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center font-bold text-xs text-slate-700 shrink-0 overflow-hidden">
                        {lead.avatar ? (
                          <img src={lead.avatar} alt={lead.name} className="w-full h-full object-cover" />
                        ) : (
                          lead.name?.charAt(0)
                        )}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-slate-900 truncate group-hover:text-orange-600">
                          {lead.name}
                        </h4>
                        <p className="text-[11px] text-slate-500 font-mono truncate">{lead.phone} • {lead.channelName}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="px-3 py-1 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-xs font-bold shadow-2xs group-hover:scale-105 transition-all flex items-center gap-1 shrink-0"
                    >
                      <Forward className="w-3 h-3" />
                      <span>Bhejo</span>
                    </button>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* 5. Forward Success Toast */}
      {forwardSuccessToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 border border-emerald-400 text-xs font-bold animate-in fade-in slide-in-from-bottom-2">
          <Check className="w-4 h-4 text-white" />
          <span>{forwardSuccessToast}</span>
        </div>
      )}
    </div>
  );
}
