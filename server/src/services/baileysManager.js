import fs from 'fs';
import path from 'path';
import QRCode from 'qrcode';
import pino from 'pino';
import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  Browsers,
  makeCacheableSignalKeyStore,
  downloadMediaMessage,
} from '@whiskeysockets/baileys';
import { prisma } from '../config/db.js';

let sock = null;
let currentQr = null;
let connectionStatus = 'disconnected'; // 'disconnected' | 'connecting' | 'connected'
let connectedUser = null;
let ioInstance = null;
let reconnectAttempts = 0;
let reconnectTimer = null;

const AUTH_DIR = path.resolve(process.cwd(), 'storage/baileys_auth');
const MEDIA_DIR = path.resolve(process.cwd(), 'storage/media');

// Helper to safely parse WhatsApp timestamps (handles Longs, numbers, strings)
export const getTimestamp = (ts) => {
  if (!ts) return null;
  if (typeof ts === 'object' && ts.low !== undefined) {
    return new Date(ts.low * 1000);
  }
  const n = Number(ts);
  if (!isNaN(n) && n > 0) {
    return new Date(n > 100000000000 ? n : n * 1000);
  }
  return null;
};

// Safe reconnect scheduler — cancels any pending timer before scheduling new one
function scheduleReconnect(delayMs) {
  if (reconnectTimer) clearTimeout(reconnectTimer);
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    initBaileys(ioInstance);
  }, delayMs);
}

export async function initBaileys(io) {
  ioInstance = io;


  if (!fs.existsSync(AUTH_DIR)) {
    fs.mkdirSync(AUTH_DIR, { recursive: true });
  }
  if (!fs.existsSync(MEDIA_DIR)) {
    fs.mkdirSync(MEDIA_DIR, { recursive: true });
  }

  try {
    // Tear down any previous socket so two sockets never fight over one session
    if (sock) {
      try {
        sock.ev.removeAllListeners('connection.update');
        sock.ev.removeAllListeners('messages.upsert');
        sock.ev.removeAllListeners('creds.update');
        sock.end(undefined);
      } catch (e) {}
      sock = null;
    }
    currentQr = null;

    let { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);

    // Fetch latest version with fallback so network hiccup doesn't break QR
    let version = [2, 3000, 1023503940];
    try {
      const fetched = await fetchLatestBaileysVersion();
      if (fetched?.version?.length === 3) {
        version = fetched.version;
        console.log(`📡 Using WhatsApp version: ${version.join('.')} (latest: ${fetched.isLatest})`);
      }
    } catch (vErr) {
      console.warn(`⚠️ Could not fetch latest WA version, using fallback ${version.join('.')}`);
    }

    console.log(`📱 Starting Baileys WhatsApp Engine...`);
    connectionStatus = 'connecting';

    const fatalLogger = pino({ level: 'fatal' });

    sock = makeWASocket({
      version,
      logger: fatalLogger,
      printQRInTerminal: true, // Also print in terminal as backup
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, fatalLogger),
      },
      browser: Browsers.windows('Desktop'), // Native Windows desktop fingerprint
      syncFullHistory: false,
      shouldSyncHistoryMessage: () => false,
      connectTimeoutMs: 60000,
      defaultQueryTimeoutMs: 60000,
      keepAliveIntervalMs: 10000,           // ← Keeps connection alive to prevent silent drops
      retryRequestDelayMs: 500,
      qrTimeout: 60000,                     // ← 60 seconds to scan before expiry
    });


    sock.ev.on('creds.update', saveCreds);

    // In-memory contact book & avatar cache
    const contactBook = new Map();
    const avatarCache = new Map();

    const getProfilePictureSafe = async (jid) => {
      if (!jid || !sock) return null;
      if (avatarCache.has(jid)) return avatarCache.get(jid);
      try {
        const url = await sock.profilePictureUrl(jid, 'image');
        if (url) {
          avatarCache.set(jid, url);
          return url;
        }
      } catch (e) {
        avatarCache.set(jid, null);
      }
      return null;
    };

    let contactSyncTimer = null;
    const processBatchContactUpdates = async () => {
      try {
        let channel = await prisma.whatsAppChannel.findFirst({
          where: { provider: 'QR_BAILEYS', isActive: true },
        }) || await prisma.whatsAppChannel.findFirst({ where: { isActive: true } });
        if (!channel) return;

        const leadsToUpdate = await prisma.lead.findMany({
          where: { channelId: channel.id },
          select: { id: true, phoneNumber: true, fullName: true }
        });

        for (const lead of leadsToUpdate) {
          const rawPhone = lead.phoneNumber.replace('+', '');
          const realName = contactBook.get(rawPhone);
          if (realName && realName !== lead.fullName && !realName.includes('+')) {
            await prisma.lead.update({
              where: { id: lead.id },
              data: { fullName: realName }
            }).catch(() => {});
          }
        }
      } catch (err) {
        console.warn('Batch contact sync error:', err.message);
      }
    };

    const updateContactBook = (contacts) => {
      if (!Array.isArray(contacts)) return;

      for (const c of contacts) {
        if (c.id && c.id.endsWith('@s.whatsapp.net')) {
          const raw = c.id.split('@')[0];
          const name = c.name || c.notify || c.verifiedName;
          if (name) {
            contactBook.set(raw, name);
          }
        }
      }

      // Debounce so thousands of incoming contacts don't overwhelm database pool
      if (contactSyncTimer) clearTimeout(contactSyncTimer);
      contactSyncTimer = setTimeout(processBatchContactUpdates, 2000);
    };

    sock.ev.on('contacts.upsert', (contacts) => updateContactBook(contacts));
    sock.ev.on('contacts.update', (updates) => updateContactBook(updates));

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        try {
          // High-quality QR: large size + error correction H = reliable scan from any phone
          currentQr = await QRCode.toDataURL(qr, {
            errorCorrectionLevel: 'H',
            type: 'image/png',
            width: 512,
            margin: 2,
            color: { dark: '#000000', light: '#ffffff' },
          });
          connectionStatus = 'connecting';
          console.log('⚡ New WhatsApp QR Code ready — scan from Channels tab or terminal above');
          ioInstance?.emit('whatsapp:qr', { qr: currentQr, status: 'connecting' });
        } catch (err) {
          console.error('Error generating QR DataURL:', err);
        }
      }

      if (connection === 'close') {
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        const errMsg = lastDisconnect?.error?.message || '';

        const isRestartRequired = statusCode === DisconnectReason.restartRequired || statusCode === 515 || errMsg.toLowerCase().includes('restart');
        const isLoggedOut = statusCode === DisconnectReason.loggedOut || statusCode === 401;
        const isQrTimeout = statusCode === 408 || errMsg.toLowerCase().includes('qr refs');

        if (isRestartRequired) {
          // ══════════════════════════════════════════════════════════════════
          // WhatsApp 515 (restartRequired): Normal pairing handshake!
          // WhatsApp closes pre-pairing stream once phone scans QR.
          // MUST reconnect immediately (~800ms) to finalize authenticated connection!
          // DO NOT clear auth and DO NOT delay!
          // ══════════════════════════════════════════════════════════════════
          reconnectAttempts = 0;
          connectionStatus = 'connecting';
          currentQr = null;
          console.log(`\x1b[36m⚡ [515 Handshake] Phone paired QR! Reconnecting in 800ms to open live WhatsApp session...\x1b[0m`);
          ioInstance?.emit('whatsapp:status', { status: 'connecting', message: 'Phone paired! Establishing secure link...' });
          scheduleReconnect(800);
          return;
        }

        connectionStatus = 'disconnected';
        currentQr = null;
        connectedUser = null;
        ioInstance?.emit('whatsapp:status', { status: 'disconnected', user: null });

        if (isLoggedOut) {
          // Proper logout — clear everything
          reconnectAttempts = 0;
          console.log(`\x1b[33m⚠️  WhatsApp logged out. Clearing session...\x1b[0m`);
          try { fs.rmSync(AUTH_DIR, { recursive: true, force: true }); } catch (e) {}
          scheduleReconnect(2000);

        } else if (isQrTimeout) {
          // QR expired before user scanned — clear unauthenticated session for fresh QR
          reconnectAttempts = 0;
          console.log(`\x1b[33m⏰  QR scan expired. Generating fresh QR...\x1b[0m`);
          ioInstance?.emit('whatsapp:qr', { qr: null, status: 'qr_expired' });
          try {
            const credsFile = path.join(AUTH_DIR, 'creds.json');
            if (fs.existsSync(credsFile)) {
              const creds = JSON.parse(fs.readFileSync(credsFile, 'utf8'));
              if (!creds?.registered) {
                fs.rmSync(AUTH_DIR, { recursive: true, force: true });
              }
            } else {
              fs.rmSync(AUTH_DIR, { recursive: true, force: true });
            }
          } catch (e) {}
          scheduleReconnect(1500);

        } else {
          // Other unexpected disconnects — moderate backoff
          reconnectAttempts++;
          const delay = Math.min(3000 * reconnectAttempts, 20000);
          console.log(`\x1b[33m🔄  WhatsApp stream closed (${statusCode || errMsg}). Reconnecting in ${delay/1000}s (attempt ${reconnectAttempts})...\x1b[0m`);
          scheduleReconnect(delay);
        }
      } else if (connection === 'open') {
        currentQr = null;
        connectionStatus = 'connected';
        connectedUser = sock.user;

        const cleanPhone = sock.user?.id ? `+${sock.user.id.split(':')[0].replace(/[^0-9]/g, '')}` : 'Unknown';
        const displayName = sock.user?.name || 'My WhatsApp';

        // Reset reconnect backoff on successful connect
        reconnectAttempts = 0;
        if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }

        // ═══════ BIG VISIBLE TERMINAL BANNER ═══════
        console.log('\n\x1b[42m\x1b[30m                                                    \x1b[0m');
        console.log('\x1b[42m\x1b[30m   ✅  WHATSAPP CRM LINKED SUCCESSFULLY!             \x1b[0m');
        console.log('\x1b[42m\x1b[30m                                                    \x1b[0m');
        console.log(`\x1b[32m   📱  Phone   : \x1b[1m${cleanPhone}\x1b[0m`);
        console.log(`\x1b[32m   👤  Name    : \x1b[1m${displayName}\x1b[0m`);
        console.log(`\x1b[32m   🕐  Time    : \x1b[1m${new Date().toLocaleString('en-PK', { timeZone: 'Asia/Karachi' })}\x1b[0m`);
        console.log('\x1b[32m   🚀  Status  : \x1b[1mLIVE — Messages now syncing to CRM\x1b[0m');
        console.log('\x1b[42m\x1b[30m                                                    \x1b[0m\n');

        // Ensure QR Channel exists in database
        try {
          const qrChannel = await prisma.whatsAppChannel.upsert({
            where: { phoneNumber: cleanPhone },
            update: { isActive: true, provider: 'QR_BAILEYS', name: `${displayName} WhatsApp (QR)` },
            create: {
              name: `${displayName} WhatsApp (QR)`,
              countryCode: 'PK',
              countryName: 'Pakistan',
              phoneNumber: cleanPhone,
              currency: 'PKR',
              provider: 'QR_BAILEYS',
              welcomeMessage: 'Assalam o Alaikum! Rabta karne ka shukriya.',
            },
          });
          console.log(`\x1b[36m💾 Database channel synced: ${qrChannel.name}\x1b[0m`);
        } catch (e) {
          console.warn('Channel sync notice:', e.message);
        }

        ioInstance?.emit('whatsapp:status', {
          status: 'connected',
          user: {
            id: sock.user.id,
            name: displayName,
            phone: cleanPhone,
          },
        });
        ioInstance?.emit('lead:new_global');
      }
    });

    // Helper: Extract text or media description from Baileys message
    const parseBaileysContent = (m) => {
      let content = '';
      let mediaType = 'TEXT';

      if (m.message?.conversation) {
        content = m.message.conversation;
      } else if (m.message?.extendedTextMessage?.text) {
        content = m.message.extendedTextMessage.text;
      } else if (m.message?.imageMessage) {
        mediaType = 'IMAGE';
        content = m.message.imageMessage.caption || 'Photo';
      } else if (m.message?.audioMessage) {
        mediaType = 'AUDIO';
        content = 'Voice Note';
      } else if (m.message?.documentMessage) {
        mediaType = 'DOCUMENT';
        content = m.message.documentMessage.fileName || 'Document';
      } else if (m.message?.videoMessage) {
        mediaType = 'VIDEO';
        content = m.message.videoMessage.caption || 'Video';
      }

      return { content, mediaType };
    };

    // Full WhatsApp History Sync Event (Blazing Fast Bulk Ingest with Real Timestamps)
    sock.ev.on('messaging-history.set', async ({ chats, contacts, messages, syncType, isLatest }) => {
      console.log(`📥 [WhatsApp History Sync] Received sync batch: ${chats?.length || 0} chats, ${contacts?.length || 0} contacts, ${messages?.length || 0} messages`);
      
      if (contacts?.length) {
        updateContactBook(contacts);
      }

      try {
        let channel = await prisma.whatsAppChannel.findFirst({
          where: { provider: 'QR_BAILEYS', isActive: true },
        }) || await prisma.whatsAppChannel.findFirst({ where: { isActive: true } });

        if (!channel) return;

        // Map phone -> latest message timestamp
        const phoneLatestTimestamp = new Map();

        // 1. Ingest all individual chats
        if (chats?.length) {
          for (const chat of chats) {
            const jid = chat.id;
            if (!jid || !jid.endsWith('@s.whatsapp.net')) continue;

            const rawPhone = jid.split('@')[0];
            const formattedPhone = rawPhone.startsWith('+') ? rawPhone : `+${rawPhone}`;
            const contactName = chat.name || contactBook.get(rawPhone) || formattedPhone;
            const parsedTime = getTimestamp(chat.conversationTimestamp);
            const lastMsgTime = parsedTime || new Date(0);

            if (parsedTime) {
              phoneLatestTimestamp.set(formattedPhone, parsedTime);
            }

            try {
              await prisma.lead.upsert({
                where: {
                  phoneNumber_channelId: {
                    phoneNumber: formattedPhone,
                    channelId: channel.id,
                  },
                },
                update: {
                  ...(contactName !== formattedPhone ? { fullName: contactName } : {}),
                  ...(parsedTime ? { lastMessageAt: parsedTime } : {}),
                  unreadCount: chat.unreadCount || 0,
                },
                create: {
                  phoneNumber: formattedPhone,
                  fullName: contactName,
                  channelId: channel.id,
                  stage: 'CONTACTED',
                  unreadCount: chat.unreadCount || 0,
                  lastMessageAt: lastMsgTime,
                },
              });
            } catch (cErr) {}
          }
        }

        // 2. High-speed Bulk Ingest for messages (Group by lead, bulk insert)
        if (messages?.length) {
          const phoneSet = new Set();
          const validMsgs = [];

          for (const m of messages) {
            const jid = m.key?.remoteJid;
            if (!jid || !jid.endsWith('@s.whatsapp.net')) continue;

            const { content, mediaType } = parseBaileysContent(m);
            if (!content) continue;

            const rawPhone = jid.split('@')[0];
            const formattedPhone = rawPhone.startsWith('+') ? rawPhone : `+${rawPhone}`;
            phoneSet.add(formattedPhone);

            const msgDate = getTimestamp(m.messageTimestamp) || new Date();
            
            const existingTime = phoneLatestTimestamp.get(formattedPhone);
            if (!existingTime || msgDate > existingTime) {
              phoneLatestTimestamp.set(formattedPhone, msgDate);
            }

            validMsgs.push({
              formattedPhone,
              isFromMe: m.key.fromMe,
              content,
              mediaType,
              msgDate,
              msgId: m.key.id || `hist_${Date.now()}_${Math.random().toString(36).substring(7)}`,
            });
          }

          // Ensure all leads exist in DB & update lastMessageAt to the newest real message
          const phoneToLeadId = new Map();
          for (const phone of phoneSet) {
            try {
              const rawNum = phone.replace('+', '');
              const leadName = contactBook.get(rawNum) || phone;
              const realLatestAt = phoneLatestTimestamp.get(phone) || new Date();

              const lead = await prisma.lead.upsert({
                where: { phoneNumber_channelId: { phoneNumber: phone, channelId: channel.id } },
                update: {
                  lastMessageAt: realLatestAt,
                },
                create: {
                  phoneNumber: phone,
                  fullName: leadName,
                  channelId: channel.id,
                  stage: 'CONTACTED',
                  unreadCount: 0,
                  lastMessageAt: realLatestAt,
                },
              });
              phoneToLeadId.set(phone, lead.id);
            } catch (lErr) {}
          }

          // Prepare bulk message array
          const bulkRecords = [];
          for (const vm of validMsgs) {
            const leadId = phoneToLeadId.get(vm.formattedPhone);
            if (!leadId) continue;

            bulkRecords.push({
              leadId,
              channelId: channel.id,
              senderType: vm.isFromMe ? 'AGENT' : 'CUSTOMER',
              content: vm.content,
              mediaType: vm.mediaType,
              status: 'DELIVERED',
              whatsappMsgId: vm.msgId,
              createdAt: vm.msgDate,
            });
          }

          // Ultra-fast single-query inserts in 500 chunks
          if (bulkRecords.length > 0) {
            for (let i = 0; i < bulkRecords.length; i += 500) {
              const slice = bulkRecords.slice(i, i + 500);
              await prisma.message.createMany({
                data: slice,
                skipDuplicates: true,
              });
            }
          }
        }

        console.log(`✅ [WhatsApp History Sync] Bulk batch saved with real chronological timestamps!`);
        ioInstance?.emit('lead:new_global');
      } catch (err) {
        console.error('❌ Error during WhatsApp history sync:', err.message);
      }
    });

    // Ingest new chats on the fly
    sock.ev.on('chats.upsert', async (newChats) => {
      try {
        let channel = await prisma.whatsAppChannel.findFirst({
          where: { provider: 'QR_BAILEYS', isActive: true },
        }) || await prisma.whatsAppChannel.findFirst({ where: { isActive: true } });

        if (!channel || !Array.isArray(newChats)) return;

        for (const chat of newChats) {
          const jid = chat.id;
          if (!jid || !jid.endsWith('@s.whatsapp.net')) continue;

          const rawPhone = jid.split('@')[0];
          const formattedPhone = rawPhone.startsWith('+') ? rawPhone : `+${rawPhone}`;
          const contactName = chat.name || contactBook.get(rawPhone) || formattedPhone;
          const parsedTime = getTimestamp(chat.conversationTimestamp);

          await prisma.lead.upsert({
            where: {
              phoneNumber_channelId: {
                phoneNumber: formattedPhone,
                channelId: channel.id,
              },
            },
            update: {
              ...(contactName !== formattedPhone ? { fullName: contactName } : {}),
              ...(parsedTime ? { lastMessageAt: parsedTime } : {}),
            },
            create: {
              phoneNumber: formattedPhone,
              fullName: contactName,
              channelId: channel.id,
              stage: 'CONTACTED',
              unreadCount: chat.unreadCount || 0,
              lastMessageAt: parsedTime || new Date(0),
            },
          });
        }
        ioInstance?.emit('lead:new_global');
      } catch (e) {
        console.warn('Error in chats.upsert:', e.message);
      }
    });

    // Inbound & Outbound message listener (Live with Real-time Media & Instant Sockets)
    sock.ev.on('messages.upsert', async ({ messages, type }) => {
      for (const m of messages) {
        const jid = m.key.remoteJid;
        // Ignore groups, broadcasts, and status updates
        if (!jid || !jid.endsWith('@s.whatsapp.net') || jid.includes('broadcast')) continue;

        const rawPhone = jid.split('@')[0];
        const formattedPhone = rawPhone.startsWith('+') ? rawPhone : `+${rawPhone}`;
        const isFromMe = m.key.fromMe;

        const { content, mediaType } = parseBaileysContent(m);
        if (!content && mediaType === 'TEXT') continue;

        // ── LIVE MESSAGE TERMINAL LOG ──────────────────────────────────────
        const senderName = isFromMe ? 'You (Agent)' : (contactBook.get(rawPhone) || m.pushName || formattedPhone);
        const msgPreview = content.length > 60 ? content.substring(0, 60) + '…' : content;
        const typeIcon = { IMAGE: '🖼️', AUDIO: '🎙️', VIDEO: '🎬', DOCUMENT: '📄', TEXT: '💬' }[mediaType] || '💬';
        if (isFromMe) {
          console.log(`\x1b[34m📤 [OUT] You → ${formattedPhone} | ${typeIcon} ${msgPreview}\x1b[0m`);
        } else {
          console.log(`\x1b[33m📩 [IN]  ${senderName} (${formattedPhone}) → CRM | ${typeIcon} ${msgPreview}\x1b[0m`);
        }
        // ───────────────────────────────────────────────────────────────────


        // Auto-download WhatsApp media files (Photos, Voice Notes, Documents, Videos)
        let mediaUrl = null;
        if (['IMAGE', 'DOCUMENT', 'AUDIO', 'VIDEO'].includes(mediaType)) {
          try {
            const buffer = await downloadMediaMessage(
              m,
              'buffer',
              {},
              { logger: fatalLogger, reuploadRequest: sock.updateMediaMessage }
            );
            if (buffer) {
              const extMap = { IMAGE: 'jpg', AUDIO: 'ogg', VIDEO: 'mp4', DOCUMENT: 'pdf' };
              const ext = extMap[mediaType] || 'bin';
              const fileName = `wa_${m.key.id || Date.now()}_${Date.now()}.${ext}`;
              const filePath = path.join(MEDIA_DIR, fileName);
              fs.writeFileSync(filePath, buffer);
              mediaUrl = `/media/${fileName}`;
              console.log(`🖼️ Auto-downloaded WhatsApp ${mediaType} file: ${mediaUrl}`);
            }
          } catch (mErr) {
            console.warn(`Media download warning for ${mediaType}:`, mErr.message);
          }
        }

        try {
          // Find or create channel
          let channel = await prisma.whatsAppChannel.findFirst({
            where: { provider: 'QR_BAILEYS', isActive: true },
          }) || await prisma.whatsAppChannel.findFirst({ where: { isActive: true } });

          if (!channel) continue;

          // Resolve contact name
          const customerName = contactBook.get(rawPhone) || m.pushName || formattedPhone;
          const msgDate = getTimestamp(m.messageTimestamp) || new Date();

          const lead = await prisma.lead.upsert({
            where: {
              phoneNumber_channelId: {
                phoneNumber: formattedPhone,
                channelId: channel.id,
              },
            },
            update: {
              unreadCount: isFromMe ? undefined : { increment: 1 },
              lastMessageAt: msgDate,
              ...(customerName !== formattedPhone ? { fullName: customerName } : {}),
            },
            create: {
              phoneNumber: formattedPhone,
              fullName: customerName,
              avatarUrl: null,
              channelId: channel.id,
              stage: isFromMe ? 'CONTACTED' : 'NEW_LEAD',
              unreadCount: isFromMe ? 0 : 1,
              lastMessageAt: msgDate,
            },
          });

          // Save Message safely using upsert
          const savedMsg = await prisma.message.upsert({
            where: { whatsappMsgId: m.key.id },
            update: {
              status: 'DELIVERED',
              mediaUrl: mediaUrl || undefined,
            },
            create: {
              leadId: lead.id,
              channelId: channel.id,
              senderType: isFromMe ? 'AGENT' : 'CUSTOMER',
              content,
              mediaType,
              mediaUrl,
              status: 'DELIVERED',
              whatsappMsgId: m.key.id,
              createdAt: msgDate,
            },
          });

          const payload = {
            message: savedMsg,
            leadId: lead.id,
            channelId: channel.id,
            channelName: channel.name,
            customerName: lead.fullName,
            avatarUrl: lead.avatarUrl,
          };

          // EMIT TO UI IMMEDIATELY (Sub-10ms response time)
          ioInstance?.to(`lead:${lead.id}`).emit('message:new', payload);
          ioInstance?.emit('message:global_inbound', payload);
          ioInstance?.emit('lead:new_global', lead);

          // Asynchronously fetch avatar in background
          if (!lead.avatarUrl) {
            getProfilePictureSafe(jid).then(async (avatar) => {
              if (avatar) {
                await prisma.lead.update({
                  where: { id: lead.id },
                  data: { avatarUrl: avatar },
                }).catch(() => {});
              }
            }).catch(() => {});
          }
        } catch (dbErr) {
          console.error('Error recording Baileys message:', dbErr.message);
        }
      }
    });

  } catch (error) {
    console.error('Failed to initialize Baileys:', error);
    connectionStatus = 'disconnected';
  }
}

export function getBaileysStatus() {
  const cleanPhone = connectedUser?.id ? `+${connectedUser.id.split(':')[0].replace(/[^0-9]/g, '')}` : null;
  return {
    status: connectionStatus,
    qr: currentQr,
    user: connectedUser ? {
      name: connectedUser.name || 'My WhatsApp',
      phone: cleanPhone,
    } : null,
  };
}

export function isBaileysConnected() {
  return connectionStatus === 'connected' && sock !== null;
}

export async function sendBaileysMessage(phoneNumber, text, media = null) {
  if (!sock || connectionStatus !== 'connected') {
    throw new Error('WhatsApp QR engine is not connected. Please scan QR code first.');
  }

  let cleanNumber = phoneNumber.replace(/[^0-9]/g, '');

  // Normalize Pakistani numbers (e.g. 03328204380 -> 923328204380)
  if (cleanNumber.startsWith('03') && cleanNumber.length === 11) {
    cleanNumber = '92' + cleanNumber.substring(1);
  } else if (cleanNumber.startsWith('3') && cleanNumber.length === 10) {
    cleanNumber = '92' + cleanNumber;
  }

  const jid = `${cleanNumber}@s.whatsapp.net`;
  let result;

  if (media && media.type === 'IMAGE' && media.url) {
    console.log(`📤 Dispatching WhatsApp Image via Baileys to ${jid}...`);
    if (media.url.startsWith('/media/')) {
      const localPath = path.resolve(process.cwd(), 'storage' + media.url);
      if (fs.existsSync(localPath)) {
        result = await sock.sendMessage(jid, {
          image: fs.readFileSync(localPath),
          caption: text || '',
        });
      } else {
        result = await sock.sendMessage(jid, { text: `${text || ''} ${media.url}` });
      }
    } else {
      result = await sock.sendMessage(jid, {
        image: { url: media.url },
        caption: text || '',
      });
    }
  } else {
    console.log(`📤 Sending Baileys WhatsApp Message to ${jid}: "${text}"`);
    result = await sock.sendMessage(jid, { text });
  }

  return {
    id: result?.key?.id || `baileys_${Date.now()}`,
    status: 'SENT',
  };
}

export async function logoutBaileys() {
  if (sock) {
    try {
      await sock.logout();
    } catch (e) {}
  }
  fs.rmSync(AUTH_DIR, { recursive: true, force: true });
  connectionStatus = 'disconnected';
  currentQr = null;
  connectedUser = null;
  if (ioInstance) {
    initBaileys(ioInstance);
  }
}

// Force-reset: kills current socket, clears all auth, waits 3s then restarts fresh
export async function resetBaileys() {
  console.log('\x1b[35m🔁 Force QR Reset — killing socket & clearing session...\x1b[0m');

  // Cancel any pending reconnect
  if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
  reconnectAttempts = 0;

  // Kill existing socket
  if (sock) {
    try { sock.ev.removeAllListeners(); sock.end(undefined); } catch (e) {}
    sock = null;
  }

  // Clear all auth files
  try {
    fs.rmSync(AUTH_DIR, { recursive: true, force: true });
    fs.mkdirSync(AUTH_DIR, { recursive: true });
  } catch (e) {}

  connectionStatus = 'disconnected';
  currentQr = null;
  connectedUser = null;
  ioInstance?.emit('whatsapp:status', { status: 'disconnected', user: null });
  ioInstance?.emit('whatsapp:qr', { qr: null, status: 'qr_expired' });

  // Wait 3 seconds then start fresh (gives WhatsApp servers time to release)
  console.log('\x1b[35m⏳ Waiting 3s then generating fresh QR...\x1b[0m');
  scheduleReconnect(3000);
}

