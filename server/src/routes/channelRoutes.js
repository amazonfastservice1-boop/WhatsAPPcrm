import express from 'express';
import { prisma } from '../config/db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

/**
 * GET /api/channels
 * List all WhatsApp Channels with stats
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const user = req.user;

    // Filter by allowed channels if user is an AGENT
    const includeInactive = req.query.includeInactive === 'true' || req.query.all === 'true';
    const whereClause =
      user.role === 'ADMIN'
        ? (includeInactive ? {} : { isActive: true })
        : { isActive: true, id: { in: user.allowedChannelIds } };

    const channels = await prisma.whatsAppChannel.findMany({
      where: whereClause,
      include: {
        _count: {
          select: {
            leads: true,
            messages: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    res.json({ channels });
  } catch (error) {
    console.error('Error fetching channels:', error);
    res.status(500).json({ error: 'Failed to retrieve channels.' });
  }
});

/**
 * GET /api/channels/meta-config
 * Read current Meta Cloud API status & active parameters
 */
router.get('/meta-config', authenticateToken, async (req, res) => {
  try {
    const token = process.env.META_SYSTEM_USER_ACCESS_TOKEN || '';
    const phoneId = process.env.META_PHONE_ID || process.env.META_PHONE_ID_PAK || '';
    const wabaId = process.env.META_WABA_ID || '';
    const verifyToken = process.env.META_WEBHOOK_VERIFY_TOKEN || '';

    let isLive = false;
    let verifiedName = 'Amazon Fast services';
    let displayNumber = '+92 332 2568950';

    if (token && phoneId) {
      try {
        const axios = (await import('axios')).default;
        const apiRes = await axios.get(`https://graph.facebook.com/v19.0/${phoneId}?fields=id,verified_name,display_phone_number,account_mode`, {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 4000,
        });
        if (apiRes.data?.id) {
          isLive = true;
          verifiedName = apiRes.data.verified_name || verifiedName;
          displayNumber = apiRes.data.display_phone_number || displayNumber;
        }
      } catch (e) {
        // Token valid or not
      }
    }

    res.json({
      wabaId,
      phoneId,
      maskedToken: token ? `${token.substring(0, 10)}...${token.substring(token.length - 8)}` : '',
      verifyToken,
      isLive,
      verifiedName,
      displayNumber,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load Meta configuration.' });
  }
});

/**
 * POST /api/channels/meta-config
 * Update Meta Token, Phone ID, WABA ID from CRM UI
 */
router.post('/meta-config', authenticateToken, async (req, res) => {
  try {
    const { channelId, phoneIdMeta, phoneNumber, metaToken, metaWabaId } = req.body;

    const fs = (await import('fs')).default;
    const path = (await import('path')).default;

    // 1. Update in-memory process.env
    if (metaToken && metaToken.trim()) process.env.META_SYSTEM_USER_ACCESS_TOKEN = metaToken.trim();
    if (phoneIdMeta && phoneIdMeta.trim()) {
      process.env.META_PHONE_ID = phoneIdMeta.trim();
      process.env.META_PHONE_ID_PAK = phoneIdMeta.trim();
    }
    if (metaWabaId && metaWabaId.trim()) process.env.META_WABA_ID = metaWabaId.trim();

    // 2. Persist to server/.env and root .env
    const envPaths = [
      path.resolve(process.cwd(), '.env'),
      path.resolve(process.cwd(), '../.env'),
    ];

    envPaths.forEach((p) => {
      try {
        if (fs.existsSync(p)) {
          let envContent = fs.readFileSync(p, 'utf8');
          if (metaToken && metaToken.trim()) {
            envContent = envContent.replace(/META_SYSTEM_USER_ACCESS_TOKEN=.*/g, `META_SYSTEM_USER_ACCESS_TOKEN=${metaToken.trim()}`);
          }
          if (phoneIdMeta && phoneIdMeta.trim()) {
            envContent = envContent.replace(/META_PHONE_ID=.*/g, `META_PHONE_ID=${phoneIdMeta.trim()}`);
            envContent = envContent.replace(/META_PHONE_ID_PAK=.*/g, `META_PHONE_ID_PAK=${phoneIdMeta.trim()}`);
          }
          if (metaWabaId && metaWabaId.trim()) {
            envContent = envContent.replace(/META_WABA_ID=.*/g, `META_WABA_ID=${metaWabaId.trim()}`);
          }
          fs.writeFileSync(p, envContent);
        }
      } catch (e) {
        console.warn('Could not persist env to', p, e.message);
      }
    });

    // 3. Update or Create Database WhatsAppChannel
    if (channelId && channelId !== 'new') {
      await prisma.whatsAppChannel.update({
        where: { id: channelId },
        data: {
          phoneIdMeta: phoneIdMeta || undefined,
          phoneNumber: phoneNumber || undefined,
          provider: 'META_API',
          isActive: true,
        },
      });
    } else if (channelId === 'new' && phoneNumber && phoneIdMeta) {
      const isAE = phoneNumber.startsWith('+971');
      const isSA = phoneNumber.startsWith('+966');
      const countryCode = isAE ? 'AE' : isSA ? 'SA' : 'PK';
      const countryName = isAE ? 'United Arab Emirates' : isSA ? 'Saudi Arabia' : 'Pakistan';
      const currency = isAE ? 'AED' : isSA ? 'SAR' : 'PKR';
      const timezone = isAE ? 'Asia/Dubai' : isSA ? 'Asia/Riyadh' : 'Asia/Karachi';

      await prisma.whatsAppChannel.create({
        data: {
          name: req.body.channelName || `WhatsApp (${phoneNumber})`,
          phoneNumber,
          phoneIdMeta,
          countryCode,
          countryName,
          currency,
          timezone,
          provider: 'META_API',
          isActive: true,
          welcomeMessage: 'Assalam o Alaikum! AmazFast mein khushamdeed.',
        },
      });
    }

    // 4. Test connection live with Graph API
    let connectionStatus = 'SAVED';
    let details = null;
    const activeToken = process.env.META_SYSTEM_USER_ACCESS_TOKEN;
    const activePhoneId = process.env.META_PHONE_ID;

    if (activeToken && activePhoneId) {
      try {
        const axios = (await import('axios')).default;
        const testRes = await axios.get(`https://graph.facebook.com/v19.0/${activePhoneId}?fields=id,verified_name,display_phone_number,account_mode`, {
          headers: { Authorization: `Bearer ${activeToken}` },
        });
        connectionStatus = 'CONNECTED_LIVE';
        details = testRes.data;
      } catch (apiErr) {
        connectionStatus = 'TOKEN_SAVED_PENDING_META';
        details = apiErr.response?.data?.error?.message || apiErr.message;
      }
    }

    res.json({
      success: true,
      message: 'Meta WhatsApp Cloud API credentials updated successfully!',
      connectionStatus,
      details,
    });
  } catch (err) {
    console.error('Error saving Meta config:', err);
    res.status(500).json({ error: 'Failed to update Meta configuration.' });
  }
});

export default router;
