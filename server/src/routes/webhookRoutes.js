import express from 'express';
import { prisma } from '../config/db.js';
import { verifyMetaWebhookSignature } from '../middleware/verifyWebhookSignature.js';

const router = express.Router();

// High-speed In-Memory Cache to bypass slow database roundtrips
const channelCache = new Map();
const leadCache = new Map();

// Helper: Smart auto-detection of AmazFast service interest from customer messages
function detectServiceInterest(text) {
  if (!text || typeof text !== 'string') return null;
  const t = text.toLowerCase();
  if (/\b(llc|wyoming|delaware|new mexico|us company|llc formation)\b/i.test(t)) return 'US LLC Formation';
  if (/\b(uk ltd|ltd company|companies house|uk company)\b/i.test(t)) return 'UK LTD Formation';
  if (/\b(stripe|payment gateway|stripe account|card payment)\b/i.test(t)) return 'Stripe Gateway';
  if (/\b(paypal|paypal business)\b/i.test(t)) return 'PayPal Business';
  if (/\b(mercury|relay|payoneer|wise|bank account|business bank)\b/i.test(t)) return 'Business Bank';
  if (/\b(wholesale|brand approval|fba wholesale|distributor)\b/i.test(t)) return 'Amazon Wholesale';
  if (/\b(private label|\bpl\b|launch|ppc|product hunting)\b/i.test(t)) return 'Amazon PL';
  if (/\b(brand registry|trademark|brand gating)\b/i.test(t)) return 'Brand Registry';
  if (/\b(shopify|dropshipping|shopify store)\b/i.test(t)) return 'Shopify Store';
  if (/\b(tiktok|tik tok|tiktok shop)\b/i.test(t)) return 'TikTok Shop';
  if (/\b(itin|ein|tax return|tax id|w8ben)\b/i.test(t)) return 'ITIN / EIN Tax';
  if (/\b(virtual address|us address|uk address|mail forwarding)\b/i.test(t)) return 'Virtual Address';
  return null;
}

/**
 * 1. Meta Webhook Verification Handshake
 * GET /api/webhook
 * Meta calls this when you configure the Webhook URL in Facebook App Dashboard
 */
router.get('/', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  const expectedToken = process.env.META_WEBHOOK_VERIFY_TOKEN || 'amazfast_crm_secure_verify_token_2026';

  // Accept valid token or if URL was pasted as token
  if (
    mode === 'subscribe' &&
    (token === expectedToken ||
      token === 'amazfast_crm_secure_verify_token_2026' ||
      token?.includes('ngrok') ||
      token?.includes('webhook'))
  ) {
    console.log('✅ Meta Webhook successfully verified and subscribed with challenge:', challenge);
    return res.status(200).send(challenge);
  }

  console.warn('⚠️ Webhook handshake failed: Verify token mismatch.');
  return res.sendStatus(403);
});

/**
 * 2. Inbound WhatsApp Message Receiver
 * POST /api/webhook * Protected with HMAC X-Hub-Signature-256 verification

 */
router.post('/', verifyMetaWebhookSignature, async (req, res) => {
  // Acknowledge receipt to Meta immediately (Meta requires fast 200 OK)
  res.status(200).send('EVENT_RECEIVED');

  try {
    const body = req.body;

    if (body.object !== 'whatsapp_business_account') {
      return;
    }

    const entries = body.entry || [];
    for (const entry of entries) {
      const changes = entry.changes || [];
      for (const change of changes) {
        if (change.field !== 'messages' && change.field !== 'message_echoes') continue;

        const value = change.value;
        const metadata = value.metadata;
        const incomingPhoneNumberId = metadata?.phone_number_id;

        // Match incoming channel by Meta Phone ID (Strict match, no cross-channel leakage)
        let channel = incomingPhoneNumberId ? channelCache.get(incomingPhoneNumberId) : null;
        if (!channel && incomingPhoneNumberId) {
          channel = await prisma.whatsAppChannel.findFirst({
            where: { phoneIdMeta: incomingPhoneNumberId, isActive: true },
          });
          if (channel) channelCache.set(incomingPhoneNumberId, channel);
        }

        // If channel not found, log warning and do NOT cross-post to an arbitrary channel
        if (!channel) {
          console.warn(`⚠️ No active channel found for Meta Phone ID: ${incomingPhoneNumberId}. Ignoring message to prevent leakage.`);
          continue;
        }

        // A. Handle Status Updates (Sent, Delivered, Read, Played)
        const statuses = value.statuses || [];
        for (const statusObj of statuses) {
          const whatsappMsgId = statusObj.id;
          let status = statusObj.status?.toUpperCase(); // SENT, DELIVERED, READ, FAILED, PLAYED
          if (status === 'PLAYED') status = 'READ';

          const validStatuses = ['SENT', 'DELIVERED', 'READ', 'FAILED'];
          const errorReason = statusObj.errors?.[0]?.message || statusObj.errors?.[0]?.title || null;
          if (status === 'FAILED') {
            console.error(`❌ Meta Outbound Delivery Failed for ${whatsappMsgId}:`, JSON.stringify(statusObj.errors || statusObj));
          }

          if (whatsappMsgId && validStatuses.includes(status)) {
            // Live status update to UI immediately
            req.io?.emit('message:status_update', {
              whatsappMsgId,
              status,
              recipientId: statusObj.recipient_id,
              errorReason,
            });

            // Persist status in background without blocking
            prisma.message.updateMany({
              where: { whatsappMsgId },
              data: { status },
            }).catch(() => {});
          }
        }

        // B. Handle Inbound Messages & Agent Mobile Echoes
        const messages = value.messages || value.message_echoes || [];
        const contacts = value.contacts || [];

        for (const msg of messages) {
          // Detect if message is an Agent Reply sent from WhatsApp Phone App (Echo)
          const isAgentEcho =
            change.field === 'message_echoes' ||
            msg.is_echo === true ||
            (msg.from && channel.phoneNumber && msg.from.replace(/[^0-9]/g, '') === channel.phoneNumber.replace(/[^0-9]/g, ''));

          // For customer messages: customer phone is in msg.from
          // For agent mobile replies: customer phone is in msg.recipient_id or msg.to
          const targetCustomerRaw = isAgentEcho
            ? (msg.recipient_id || msg.to || msg.from)
            : msg.from;

          if (!targetCustomerRaw) continue;

          const formattedPhone = targetCustomerRaw.startsWith('+') ? targetCustomerRaw : `+${targetCustomerRaw}`;
          const contactObj = contacts.find((c) => c.wa_id === targetCustomerRaw);
          const customerName = contactObj?.profile?.name || formattedPhone;
          const senderType = isAgentEcho ? 'AGENT' : 'CUSTOMER';

          // 1. Channel-Isolated Lead Lookup (Composite key: channel.id + formattedPhone)
          const leadCacheKey = `${channel.id}:${formattedPhone}`;
          let lead = leadCache.get(leadCacheKey);
          if (!lead) {
            lead = await prisma.lead.findUnique({
              where: {
                phoneNumber_channelId: {
                  phoneNumber: formattedPhone,
                  channelId: channel.id,
                },
              },
              include: { channel: true },
            });
            if (lead) leadCache.set(leadCacheKey, lead);
          }

          let isBrandNewLead = false;
          if (!lead) {
            lead = await prisma.lead.create({
              data: {
                phoneNumber: formattedPhone,
                fullName: customerName,
                channelId: channel.id,
                stage: isAgentEcho ? 'CONTACTED' : 'NEW_LEAD',
                unreadCount: isAgentEcho ? 0 : 1,
                lastMessageAt: new Date(),
              },
              include: { channel: true },
            });
            leadCache.set(leadCacheKey, lead);
            isBrandNewLead = true;
          }

          // 2. Parse message content & handle all WhatsApp Cloud API types
          let content = '';
          let mediaType = 'TEXT';
          let mediaUrl = null;

          if (msg.type === 'text') {
            content = msg.text?.body || '';
          } else if (msg.type === 'image') {
            mediaType = 'IMAGE';
            content = msg.image?.caption || 'Photo';
            mediaUrl = msg.image?.id; // Meta Media ID
          } else if (msg.type === 'document') {
            mediaType = 'DOCUMENT';
            content = msg.document?.filename || 'Document';
            mediaUrl = msg.document?.id;
          } else if (msg.type === 'audio' || msg.type === 'voice') {
            mediaType = 'AUDIO';
            content = 'Voice Note';
            mediaUrl = msg.audio?.id || msg.voice?.id;
          } else if (msg.type === 'video') {
            mediaType = 'VIDEO';
            content = msg.video?.caption || 'Video';
            mediaUrl = msg.video?.id;
          } else if (msg.type === 'sticker') {
            mediaType = 'IMAGE';
            content = 'Sticker';
            mediaUrl = msg.sticker?.id;
          } else if (msg.type === 'reaction') {
            const emoji = msg.reaction?.emoji || '';
            const targetMsgId = msg.reaction?.message_id;
            if (targetMsgId) {
              req.io?.emit('message:reaction', { leadId: lead.id, whatsappMsgId: targetMsgId, reaction: emoji });
              prisma.message.updateMany({
                where: { whatsappMsgId: targetMsgId },
                data: { reaction: emoji },
              }).catch(() => {});
            }
            continue; // Skip creating an empty message bubble for reactions!
          } else if (msg.type === 'interactive') {
            content = msg.interactive?.button_reply?.title || msg.interactive?.list_reply?.title || 'Interactive Response';
          } else if (msg.type === 'button') {
            content = msg.button?.text || 'Button Response';
          } else if (msg.type === 'location') {
            content = `📍 Location: ${msg.location?.name || ''} (${msg.location?.latitude}, ${msg.location?.longitude})`;
          } else if (msg.type === 'contacts') {
            content = `👤 Contact: ${msg.contacts?.[0]?.name?.formatted_name || 'Contact Card'}`;
          } else {
            content = msg.text?.body || '';
          }

          // Skip completely empty messages to prevent empty / Invalid Date bubbles
          if (!content && !mediaUrl) {
            continue;
          }

          // Smart Auto-Tagging: Detect AmazFast service interest from customer message keywords
          if (!isAgentEcho && content && (!lead.serviceInterest || lead.serviceInterest === '')) {
            const detectedService = detectServiceInterest(content);
            if (detectedService) {
              lead.serviceInterest = detectedService;
              leadCache.set(leadCacheKey, lead);
              prisma.lead.update({
                where: { id: lead.id },
                data: { serviceInterest: detectedService }
              }).catch(() => {});
              req.io?.emit('lead:updated', { ...lead, serviceInterest: detectedService });
            }
          }

          // Calculate safe timestamp from Meta unix seconds or current time
          const timestampMs = msg.timestamp ? Number(msg.timestamp) * 1000 : Date.now();
          const safeDate = !isNaN(timestampMs) && timestampMs > 100000000000 ? new Date(timestampMs) : new Date();
          const msgDateIso = safeDate.toISOString();

          // 3. INSTANT 0ms REAL-TIME BROADCAST TO CRM
          const instantMsg = {
            id: msg.id || `wamid_${Date.now()}`,
            leadId: lead.id,
            channelId: channel.id,
            senderType,
            content,
            mediaType,
            mediaUrl,
            status: 'DELIVERED',
            createdAt: msgDateIso,
          };

          const payload = {
            message: instantMsg,
            leadId: lead.id,
            channelId: channel.id,
            channelName: channel.name,
            customerName: lead.fullName || customerName,
            content,
          };

          req.io?.emit('message:new', payload);
          if (isBrandNewLead && !isAgentEcho) {
            req.io?.emit('lead:new', {
              ...lead,
              lastMessageAt: safeDate,
              lastMessage: content,
              messages: [{
                id: instantMsg.id,
                sender: 'customer',
                text: content,
                mediaType,
                mediaUrl,
                time: safeDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                status: 'delivered'
              }]
            });
          }

          console.log(`⚡ [0ms Sync] ${isAgentEcho ? '📱 Agent Mobile WhatsApp Reply' : '📥 Customer Message'} for ${formattedPhone}: "${content}"`);

          // 4. Persist to PostgreSQL asynchronously in the background
          Promise.all([
            prisma.lead.update({
              where: { id: lead.id },
              data: {
                ...(isAgentEcho ? {} : { unreadCount: { increment: 1 } }),
                lastMessageAt: safeDate,
                fullName: lead.fullName || customerName,
              },
            }),
            prisma.message.upsert({
              where: { whatsappMsgId: msg.id },
              update: {},
              create: {
                leadId: lead.id,
                channelId: channel.id,
                senderType,
                content,
                mediaType,
                mediaUrl,
                status: 'DELIVERED',
                whatsappMsgId: msg.id,
                createdAt: safeDate,
              },
            }),
          ]).catch((dbErr) => console.error('Background DB persist error:', dbErr.message));
        }
      }
    }
  } catch (error) {
    console.error('❌ Error processing inbound Meta webhook:', error);
  }
});

export default router;
