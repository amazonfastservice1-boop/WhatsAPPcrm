import fs from 'fs';
import path from 'path';
import express from 'express';
import axios from 'axios';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import { prisma } from '../config/db.js';
import { authenticateToken } from '../middleware/auth.js';
import { isBaileysConnected, sendBaileysMessage } from '../services/baileysManager.js';

if (ffmpegInstaller && ffmpegInstaller.path) {
  ffmpeg.setFfmpegPath(ffmpegInstaller.path);
}

const router = express.Router();

/**
 * Convert any audio file (mp3, webm, wav, mp4) to WhatsApp Voice Note compliant OGG OPUS (Mono, 32kbps)
 */
function convertToOggOpus(inputFilePath, outputFilePath) {
  return new Promise((resolve, reject) => {
    ffmpeg(inputFilePath)
      .noVideo()
      .audioCodec('libopus')
      .audioBitrate(32)
      .audioChannels(1)
      .outputOptions('-application', 'voip')
      .output(outputFilePath)
      .on('end', () => resolve(outputFilePath))
      .on('error', (err) => reject(err))
      .run();
  });
}

/**
 * POST /api/messages/upload
 * Agent uploads an image or attachment before sending to WhatsApp
 */
/**
 * POST /api/messages/upload
 * Agent uploads an image, attachment, or audio blob before sending to WhatsApp
 * Supports both JSON base64 and multipart/form-data
 */
router.post('/upload', authenticateToken, async (req, res) => {
  try {
    const MEDIA_DIR = path.resolve(process.cwd(), 'storage/media');
    if (!fs.existsSync(MEDIA_DIR)) {
      fs.mkdirSync(MEDIA_DIR, { recursive: true });
    }

    const contentType = req.headers['content-type'] || '';
    let buffer, fileName, detectedMime;

    if (contentType.includes('multipart/form-data')) {
      // --- Handle raw binary form upload (for audio blobs) ---
      return res.status(400).json({ error: 'Use base64 upload for audio.' });
    } else {
      // --- Handle base64 JSON upload ---
      const { base64Data, fileName: fn = 'file' } = req.body;
      if (!base64Data) {
        return res.status(400).json({ error: 'base64Data is required.' });
      }

      // Extract MIME type from the data URI (properly handles ;codecs=... parameters)
      const mimeMatch = base64Data.match(/^data:([^;,]+)/);
      detectedMime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';

      // Convert base64 to buffer safely (split by ;base64, handles multiple semicolon headers)
      const base64Clean = base64Data.includes(';base64,')
        ? base64Data.split(';base64,')[1]
        : base64Data.replace(/^data:[^,]+,/, '');
      buffer = Buffer.from(base64Clean, 'base64');
      fileName = fn;

      // Ensure audio files have correct extension matching MIME
      if (detectedMime.includes('audio')) {
        const ext = detectedMime.includes('mp4') ? 'mp4'
          : detectedMime.includes('ogg') ? 'ogg'
          : detectedMime.includes('mpeg') ? 'mp3'
          : detectedMime.includes('webm') ? 'webm'
          : 'ogg';
        if (!fileName.match(/\.(mp4|ogg|mp3|webm|wav|aac|amr)$/i)) {
          fileName = `${fileName.replace(/\.[^.]+$/, '')}.${ext}`;
        }
      }
    }

    const safeName = `out_${Date.now()}_${Math.random().toString(36).substring(7)}_${fileName.replace(/[^a-zA-Z0-9._-]/g, '')}`;
    const filePath = path.join(MEDIA_DIR, safeName);

    fs.writeFileSync(filePath, buffer);

    let mediaType = 'DOCUMENT';
    if (detectedMime?.startsWith('image/')) mediaType = 'IMAGE';
    else if (detectedMime?.startsWith('audio/')) mediaType = 'AUDIO';

    const mediaUrl = `/media/${safeName}`;
    console.log(`📎 Media saved: ${safeName} (${buffer.length} bytes, ${detectedMime}, type=${mediaType})`);

    res.json({
      success: true,
      mediaUrl,
      mediaType,
      mimeType: detectedMime,
    });
  } catch (error) {
    console.error('Failed to save uploaded attachment:', error);
    res.status(500).json({ error: 'Failed to upload attachment.' });
  }
});

/**
 * GET /api/messages/media/:mediaId
 * Stream / Download WhatsApp Voice Notes, PDFs, Images & Media directly from Meta Cloud API
 * Includes disk caching for 0ms reloads and instant downloads
 */
router.get('/media/:mediaId', async (req, res) => {
  try {
    const { mediaId } = req.params;
    const download = req.query.download === '1' || req.query.dl === '1';
    const customFilename = req.query.filename || `whatsapp_media_${mediaId}`;

    const MEDIA_DIR = path.resolve(process.cwd(), 'storage/media');
    if (!fs.existsSync(MEDIA_DIR)) {
      fs.mkdirSync(MEDIA_DIR, { recursive: true });
    }

    // Check if media is already cached locally on disk
    const cachedFiles = fs.readdirSync(MEDIA_DIR).filter(f => f.startsWith(`cached_${mediaId}`));
    if (cachedFiles.length > 0) {
      const localCachedPath = path.join(MEDIA_DIR, cachedFiles[0]);
      if (download) {
        return res.download(localCachedPath, customFilename);
      }
      return res.sendFile(localCachedPath);
    }

    const metaToken = process.env.META_SYSTEM_USER_ACCESS_TOKEN;
    if (!metaToken) return res.status(401).send('Meta token missing');

    // 1. Get binary URL from Meta Graph API
    const metaRes = await axios.get(`https://graph.facebook.com/v19.0/${mediaId}`, {
      headers: { Authorization: `Bearer ${metaToken}` },
    });
    const mediaDownloadUrl = metaRes.data?.url;
    const mimeType = metaRes.data?.mime_type || 'application/octet-stream';
    if (!mediaDownloadUrl) return res.status(404).send('Media not found on Meta');

    // Determine extension
    let ext = 'bin';
    if (mimeType.includes('pdf')) ext = 'pdf';
    else if (mimeType.includes('audio') || mimeType.includes('ogg') || mimeType.includes('opus')) ext = 'ogg';
    else if (mimeType.includes('jpeg') || mimeType.includes('jpg')) ext = 'jpg';
    else if (mimeType.includes('png')) ext = 'png';
    else if (mimeType.includes('mp4')) ext = 'mp4';

    const cacheFilePath = path.join(MEDIA_DIR, `cached_${mediaId}.${ext}`);

    // 2. Fetch binary stream from Meta
    const mediaStream = await axios.get(mediaDownloadUrl, {
      headers: { Authorization: `Bearer ${metaToken}` },
      responseType: 'stream',
    });

    const contentType = mediaStream.headers['content-type'] || mimeType;
    res.setHeader('Content-Type', contentType);

    if (download) {
      res.setHeader('Content-Disposition', `attachment; filename="${customFilename.endsWith('.' + ext) ? customFilename : customFilename + '.' + ext}"`);
    }

    // Pipe to disk cache and browser simultaneously
    const fileWriter = fs.createWriteStream(cacheFilePath);
    mediaStream.data.pipe(fileWriter);
    mediaStream.data.pipe(res);
  } catch (err) {
    console.error('Media proxy error:', err.response?.data || err.message);
    res.status(500).send('Error streaming media from Meta');
  }
});

/**
 * GET /api/messages/lead/:leadId
 * Fetch full conversation history for a lead
 */
router.get('/lead/:leadId', authenticateToken, async (req, res) => {
  try {
    const { leadId } = req.params;

    const rawMessages = await prisma.message.findMany({
      where: { leadId },
      include: {
        senderUser: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    const messages = rawMessages.reverse();

    // Reset unread count for this lead safely
    await prisma.lead.updateMany({
      where: { id: leadId },
      data: { unreadCount: 0 },
    });

    res.json({ messages });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to load conversation history.' });
  }
});

/**
 * POST /api/messages/send
 * Agent sends outbound WhatsApp reply
 * Enforces originating channel lockdown (always sends back via customer's contacted number)
 */
router.post('/send', authenticateToken, async (req, res) => {
  try {
    const { leadId, content, mediaType = 'TEXT', mediaUrl } = req.body;
    const user = req.user;

    if (!leadId || !content) {
      return res.status(400).json({ error: 'leadId and message content are required.' });
    }

    // 1. Fetch Lead (or find/create if mock ID was passed)
    let lead = await prisma.lead.findUnique({
      where: { id: leadId },
      include: { channel: true },
    });

    if (!lead) {
      let targetChannel = req.body.channelId 
        ? await prisma.whatsAppChannel.findUnique({ where: { id: req.body.channelId } })
        : null;

      if (!targetChannel) {
        targetChannel = await prisma.whatsAppChannel.findFirst({
          where: { countryCode: 'PK', isActive: true },
        }) || await prisma.whatsAppChannel.findFirst({ where: { isActive: true } });
      }

      if (!targetChannel) {
        return res.status(400).json({ error: 'No active WhatsApp channel configured.' });
      }

      const targetPhone = req.body.phoneNumber || leadId.replace(/[^0-9+]/g, '') || '+923142618923';
      const cleanPhone = targetPhone.startsWith('+') ? targetPhone : `+${targetPhone}`;

      lead = await prisma.lead.upsert({
        where: {
          phoneNumber_channelId: {
            phoneNumber: cleanPhone,
            channelId: targetChannel.id,
          },
        },
        update: {},
        create: {
          fullName: req.body.customerName || 'Customer',
          phoneNumber: cleanPhone,
          channelId: targetChannel.id,
          stage: 'CONTACTED',
        },
        include: { channel: true },
      });
    }

    // 2. Channel Authorization Check
    if (user.role !== 'ADMIN' && !user.allowedChannelIds.includes(lead.channelId)) {
      return res.status(403).json({ error: 'Access denied: You cannot message this regional lead.' });
    }

    let whatsappMsgId = `out_${Date.now()}`;
    let dispatchStatus = 'SENT';
    let metaErrorDetails = null;

    // Robust E.164 phone normalization
    let cleanDigits = (lead.phoneNumber || '').replace(/[^0-9]/g, '').trim();
    if (cleanDigits.startsWith('00')) cleanDigits = cleanDigits.substring(2);
    if (cleanDigits.startsWith('03') && cleanDigits.length === 11) {
      cleanDigits = '92' + cleanDigits.substring(1);
    } else if (cleanDigits.startsWith('3') && cleanDigits.length === 10) {
      cleanDigits = '92' + cleanDigits;
    }
    const cleanRecipientPhone = cleanDigits;
    const formattedE164Phone = `+${cleanDigits}`;

    // Auto-repair DB lead phone if it was stored without country code (e.g. +0315...)
    if (lead.phoneNumber !== formattedE164Phone) {
      prisma.lead.update({
        where: { id: lead.id },
        data: { phoneNumber: formattedE164Phone }
      }).catch(() => {});
      lead.phoneNumber = formattedE164Phone;
    }

    if (lead.channel?.provider === 'QR_BAILEYS' && isBaileysConnected()) {
      try {
        console.log(`📤 Dispatching WhatsApp message via Baileys QR Engine to ${cleanRecipientPhone}...`);
        const mediaObj = mediaUrl ? { type: mediaType, url: mediaUrl } : null;
        const baileysRes = await sendBaileysMessage(cleanRecipientPhone, content, mediaObj);
        whatsappMsgId = baileysRes.id;
        dispatchStatus = 'SENT';
        console.log('✅ Baileys Outbound Success:', baileysRes);
      } catch (bErr) {
        console.error('❌ Baileys Dispatch Error:', bErr.message);
        dispatchStatus = 'FAILED';
        metaErrorDetails = bErr.message;
      }
    } else {
      const metaToken = process.env.META_SYSTEM_USER_ACCESS_TOKEN;
      const channel = lead.channel || await prisma.whatsAppChannel.findUnique({ where: { id: lead.channelId } });
      const phoneId = channel?.phoneIdMeta;

      if (!phoneId) {
        console.error(`❌ Lead channel (${lead.channelId}) has no phoneIdMeta! Cannot dispatch.`);
        return res.status(400).json({ error: `Channel ${channel?.name || lead.channelId} has no Meta Phone ID configured.` });
      }

      console.log(`📤 Dispatching WhatsApp message to ${cleanRecipientPhone} via Channel "${channel.name}" (Meta Phone ID: ${phoneId})...`);

      if (metaToken && phoneId && !metaToken.includes('EAAG...')) {
        try {
          const apiVersion = process.env.META_API_VERSION || 'v19.0';

          let metaPayload = {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: cleanRecipientPhone,
          };

          // If message contains media (Image, Document, or Audio)
          if (mediaUrl && (mediaType === 'IMAGE' || mediaType === 'DOCUMENT' || mediaType === 'AUDIO')) {
            const cleanRelPath = mediaUrl.replace(/^\/media\//, '');
            const localFilePath = path.resolve(process.cwd(), 'storage/media', cleanRelPath);

            if (fs.existsSync(localFilePath)) {
              const fileBuffer = fs.readFileSync(localFilePath);
              const fileSize = fileBuffer.length;
              const fileName = path.basename(localFilePath);
              const isImg = mediaType === 'IMAGE';
              const isAudio = mediaType === 'AUDIO';

              console.log(`📁 Media file: ${fileName}, Size: ${fileSize} bytes`);

              if (fileSize < 100) {
                console.warn(`⚠️ Media file too small (${fileSize} bytes) - likely corrupted upload, skipping media send.`);
              } else {
                try {
                  // Determine exact MIME type from file extension and content
                  let mimeType = 'application/octet-stream';
                  if (isImg) {
                    if (fileName.match(/\.png$/i)) mimeType = 'image/png';
                    else if (fileName.match(/\.webp$/i)) mimeType = 'image/webp';
                    else mimeType = 'image/jpeg';
                  } else if (isAudio) {
                    if (fileName.match(/\.mp3$/i) || fileName.match(/\.mpeg$/i)) mimeType = 'audio/mpeg';
                    else if (fileName.match(/\.mp4$/i) || fileName.match(/\.m4a$/i)) mimeType = 'audio/mp4';
                    else if (fileName.match(/\.aac$/i)) mimeType = 'audio/aac';
                    else if (fileName.match(/\.ogg$/i)) mimeType = 'audio/ogg';
                    else mimeType = 'audio/mpeg';
                  } else {
                    if (fileName.match(/\.pdf$/i)) mimeType = 'application/pdf';
                    else if (fileName.match(/\.docx?$/i)) mimeType = 'application/msword';
                    else mimeType = 'application/octet-stream';
                  }

                  let uploadBuffer = fileBuffer;
                  let metaUploadMime = mimeType;
                  let metaUploadName = fileName;

                  // If audio: convert to WhatsApp Voice Note compliant OGG OPUS (Mono, 32kbps)
                  if (isAudio) {
                    try {
                      const oggPath = localFilePath.replace(/\.[^.]+$/, '') + '_ptt.ogg';
                      await convertToOggOpus(localFilePath, oggPath);
                      if (fs.existsSync(oggPath)) {
                        uploadBuffer = fs.readFileSync(oggPath);
                        metaUploadMime = 'audio/ogg';
                        metaUploadName = 'voice_note.ogg';
                        console.log(`🎵 Converted audio to WhatsApp OGG OPUS (PTT): ${uploadBuffer.length} bytes`);
                      }
                    } catch (convErr) {
                      console.warn('⚠️ FFmpeg conversion warning, using fallback buffer:', convErr.message);
                      metaUploadMime = 'audio/mpeg';
                      metaUploadName = `${fileName.replace(/\.[^.]+$/, '')}.mp3`;
                    }
                  }

                  const form = new FormData();
                  form.append('messaging_product', 'whatsapp');
                  form.append('file', new Blob([uploadBuffer], { type: metaUploadMime }), metaUploadName);
                  form.append('type', metaUploadMime);

                  console.log(`📤 Uploading ${mediaType} (${metaUploadMime}, ${fileSize} bytes) to Meta Media API...`);
                  const metaUploadRes = await axios.post(
                    `https://graph.facebook.com/${apiVersion}/${phoneId}/media`,
                    form,
                    {
                      headers: {
                        Authorization: `Bearer ${metaToken}`,
                      },
                    }
                  );

                  const uploadedMediaId = metaUploadRes.data?.id;
                  console.log(`✅ Meta Media Upload Success, ID: ${uploadedMediaId}`);

                  if (uploadedMediaId) {
                    if (isImg) {
                      metaPayload.type = 'image';
                      metaPayload.image = {
                        id: uploadedMediaId,
                        caption: content && !content.startsWith('out_') && content !== 'Voice Note' ? content : undefined,
                      };
                    } else if (isAudio) {
                      metaPayload.type = 'audio';
                      metaPayload.audio = { 
                        id: uploadedMediaId,
                        voice: true 
                      };
                    } else {
                      metaPayload.type = 'document';
                      metaPayload.document = {
                        id: uploadedMediaId,
                        caption: content && !content.startsWith('out_') && content !== 'Voice Note' ? content : undefined,
                        filename: fileName.replace(/^out_\d+_[a-z0-9]+_/, ''),
                      };
                    }
                  }
                } catch (upErr) {
                  console.error('❌ Meta Media Upload failed:', JSON.stringify(upErr.response?.data || upErr.message));
                  // Set failed status for media uploads that fail (don't silently degrade to text)
                  dispatchStatus = 'FAILED';
                  metaErrorDetails = `Media upload failed: ${upErr.response?.data?.error?.message || upErr.message}`;
                }
              }
            } else {
              console.warn(`⚠️ Media file not found on disk: ${localFilePath}`);
            }
          }

          // If media upload failed, do NOT fallback to sending "Voice Note" text!
          if (dispatchStatus === 'FAILED') {
            throw new Error(metaErrorDetails || 'Failed to dispatch media attachment');
          }

          // Text message if not a media attachment
          if (!metaPayload.type) {
            metaPayload.type = 'text';
            metaPayload.text = { body: content || 'Hello' };
          }

          const metaResponse = await axios.post(
            `https://graph.facebook.com/${apiVersion}/${phoneId}/messages`,
            metaPayload,
            {
              headers: {
                Authorization: `Bearer ${metaToken}`,
                'Content-Type': 'application/json',
              },
            }
          );

          console.log('✅ Meta Outbound Success:', metaResponse.data);

          if (metaResponse.data?.messages?.[0]?.id) {
            whatsappMsgId = metaResponse.data.messages[0].id;
          }
        } catch (metaErr) {
          console.error('❌ Meta API Outbound Error:', metaErr.response?.data || metaErr.message);
          dispatchStatus = 'FAILED';
          metaErrorDetails = metaErr.response?.data?.error?.message || metaErr.message;
        }
      } else {
        dispatchStatus = 'FAILED';
        metaErrorDetails = 'Neither Baileys QR Engine is connected nor Meta Token is active.';
      }
    }

    // 4. Save outbound message to Database safely
    const savedMessage = await prisma.message.upsert({
      where: { whatsappMsgId },
      update: {
        status: dispatchStatus,
      },
      create: {
        leadId: lead.id,
        channelId: lead.channelId,
        senderType: 'AGENT',
        senderUserId: user.id,
        content,
        mediaType,
        mediaUrl,
        status: dispatchStatus,
        whatsappMsgId,
      },
      include: {
        senderUser: { select: { id: true, name: true } },
      },
    });

    // 5. Update lead timestamp and stage if it was NEW_LEAD -> CONTACTED
    await prisma.lead.update({
      where: { id: lead.id },
      data: {
        lastMessageAt: new Date(),
        stage: lead.stage === 'NEW_LEAD' ? 'CONTACTED' : lead.stage,
      },
    });

    // 6. Broadcast real-time message to all active agents viewing this CRM
    req.io?.emit('message:new', {
      message: savedMessage,
      leadId: lead.id,
      channelId: lead.channelId,
    });

    res.status(201).json({ 
      message: savedMessage,
      success: dispatchStatus === 'SENT',
      metaError: metaErrorDetails
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Failed to dispatch outbound message.' });
  }
});

/**
 * POST /api/messages/react
 * React to a message with an emoji (👍, ❤️, 😂, 😮, 😢, 🙏)
 */
router.post('/react', authenticateToken, async (req, res) => {
  try {
    const { leadId, messageId, emoji, phoneNumber, whatsappMsgId } = req.body;

    // 1. Broadcast reaction via socket in real time
    req.io?.emit('message:reaction', { leadId, messageId, emoji });

    // 2. If Meta WhatsApp message ID is available, dispatch native reaction to WhatsApp
    if (whatsappMsgId) {
      try {
        const metaToken = process.env.META_ACCESS_TOKEN;
        const phoneId = process.env.META_PHONE_NUMBER_ID;
        const apiVersion = process.env.META_API_VERSION || 'v19.0';
        if (metaToken && phoneId && phoneNumber) {
          const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');
          await axios.post(
            `https://graph.facebook.com/${apiVersion}/${phoneId}/messages`,
            {
              messaging_product: 'whatsapp',
              recipient_type: 'individual',
              to: cleanPhone,
              type: 'reaction',
              reaction: {
                message_id: whatsappMsgId,
                emoji: emoji || ''
              }
            },
            {
              headers: {
                Authorization: `Bearer ${metaToken}`,
                'Content-Type': 'application/json',
              }
            }
          );
        }
      } catch (metaErr) {
        console.warn('Meta reaction dispatch notice:', metaErr.response?.data || metaErr.message);
      }
    }

    res.json({ success: true, messageId, emoji });
  } catch (err) {
    console.error('Reaction error:', err);
    res.status(500).json({ error: 'Failed to apply reaction.' });
  }
});

export default router;
