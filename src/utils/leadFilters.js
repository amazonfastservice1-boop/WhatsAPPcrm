// Lead filtering and channel helper utilities

export function normalizePhoneNumber(rawPhone, defaultCountry = 'PK') {
  if (!rawPhone) return '';
  let digits = String(rawPhone).replace(/[^0-9]/g, '');
  if (!digits) return '';

  // Drop international 00 prefix (e.g. 0092... -> 92...)
  if (digits.startsWith('00')) {
    digits = digits.substring(2);
  }

  // Pakistan local formatting:
  // e.g. "03152072844" (11 digits starting with 03) -> "923152072844"
  if (digits.startsWith('03') && digits.length === 11) {
    digits = '92' + digits.substring(1);
  }
  // e.g. "3152072844" (10 digits starting with 3) -> "923152072844"
  else if (digits.startsWith('3') && digits.length === 10) {
    digits = '92' + digits;
  }
  // UAE local formatting:
  else if (digits.startsWith('05') && digits.length === 10 && defaultCountry === 'AE') {
    digits = '971' + digits.substring(1);
  }
  // Saudi local formatting:
  else if (digits.startsWith('05') && digits.length === 10 && defaultCountry === 'SA') {
    digits = '966' + digits.substring(1);
  }

  return `+${digits}`;
}

export function formatSafeTime(rawVal) {
  if (!rawVal) return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  
  if (typeof rawVal === 'string') {
    const trimmed = rawVal.trim();
    if (!trimmed || trimmed.toLowerCase().includes('invalid')) {
      return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    // Already formatted e.g. "06:10 PM" or "Just now"
    if (/^\d{1,2}:\d{2}\s*(AM|PM)?$/i.test(trimmed) || trimmed === 'Just now') {
      return trimmed;
    }
  }

  // Handle Unix timestamp in seconds (Meta Cloud API style, e.g. 1730205831 or "1730205831")
  if (typeof rawVal === 'number' || (typeof rawVal === 'string' && /^\d{10}$/.test(rawVal.trim()))) {
    const num = Number(rawVal);
    const ms = num < 10000000000 ? num * 1000 : num;
    const dNum = new Date(ms);
    if (!isNaN(dNum.getTime())) {
      const res = dNum.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      return res.toLowerCase().includes('invalid') ? new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : res;
    }
  }

  const d = new Date(rawVal);
  if (isNaN(d.getTime())) {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  const formatted = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return formatted.toLowerCase().includes('invalid') ? new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : formatted;
}

export function formatChannelDisplayName(channel) {
  if (!channel) return 'Unknown';
  if (channel.id === 'all') return 'Saare Numbers';
  
  const num = channel.number || channel.phoneNumber || '';
  const cleanNum = num.replace(/\D/g, '');
  
  // Format known numbers cleanly
  if (cleanNum.includes('3322568950')) {
    return 'Line 1: 0332 2568950';
  }
  if (cleanNum.includes('3142573033')) {
    return 'Line 2: 0314 2573033';
  }
  if (cleanNum.includes('3710327973')) {
    return 'Line 3: 0371 0327973';
  }
  if (cleanNum.includes('3142618923')) {
    return 'QR WhatsApp: 0314 2618923';
  }

  // Fallback to channel.name or phone
  if (num) {
    return `Line: ${num}`;
  }
  return channel.name || 'WhatsApp Line';
}

export function parseLeadDate(raw) {
  if (!raw) return null;
  if (raw instanceof Date) return isNaN(raw.getTime()) ? null : raw;
  if (typeof raw === 'number') {
    const ms = raw < 10000000000 ? raw * 1000 : raw;
    const d = new Date(ms);
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (/^\d{10}$/.test(trimmed)) {
      const d = new Date(Number(trimmed) * 1000);
      return isNaN(d.getTime()) ? null : d;
    }
    if (/^\d{13}$/.test(trimmed)) {
      const d = new Date(Number(trimmed));
      return isNaN(d.getTime()) ? null : d;
    }
    const d = new Date(trimmed);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

export function getLeadDate(lead) {
  if (!lead) return null;
  // Primary date is the WhatsApp customer activity timestamp
  return (
    parseLeadDate(lead.rawLastMessageAt) ||
    parseLeadDate(lead.lastMessageAt) ||
    parseLeadDate(lead.createdAt) ||
    parseLeadDate(lead.updatedAt)
  );
}

export function getLeadLocalDateString(lead) {
  const d = getLeadDate(lead);
  if (!d) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function isLeadToday(lead) {
  if (!lead) return false;
  const d = getLeadDate(lead);
  if (!d) return false;
  
  const now = new Date();
  return (
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear()
  );
}

export function isLeadYesterday(lead) {
  if (!lead) return false;
  const d = getLeadDate(lead);
  if (!d) return false;
  
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return (
    d.getDate() === yesterday.getDate() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getFullYear() === yesterday.getFullYear()
  );
}

export function isLeadWithinDays(lead, days = 7) {
  if (!lead) return false;
  const d = getLeadDate(lead);
  if (!d) return false;
  
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  cutoff.setHours(0, 0, 0, 0);
  return d >= cutoff;
}

export function isLeadOnDate(lead, targetDateStr) {
  if (!lead || !targetDateStr) return false;
  return getLeadLocalDateString(lead) === targetDateStr;
}

export function getLeadStats(leads = [], channels = []) {
  const total = leads.length;
  let todayCount = 0;
  let yesterdayCount = 0;
  let last7DaysCount = 0;

  const channelMap = {};
  channels.forEach(ch => {
    if (ch.id !== 'all') {
      channelMap[ch.id] = {
        id: ch.id,
        name: formatChannelDisplayName(ch),
        flag: ch.flag || '🇵🇰',
        number: ch.number || '',
        total: 0,
        today: 0,
        yesterday: 0,
      };
    }
  });

  leads.forEach(l => {
    const isT = isLeadToday(l);
    const isY = isLeadYesterday(l);
    const is7 = isLeadWithinDays(l, 7);

    if (isT) todayCount++;
    if (isY) yesterdayCount++;
    if (is7) last7DaysCount++;

    const chId = l.channel;
    if (channelMap[chId]) {
      channelMap[chId].total++;
      if (isT) channelMap[chId].today++;
      if (isY) channelMap[chId].yesterday++;
    }
  });

  return {
    total,
    todayCount,
    yesterdayCount,
    last7DaysCount,
    byChannel: channelMap,
  };
}
