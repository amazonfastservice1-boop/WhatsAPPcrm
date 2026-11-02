import express from 'express';
import { prisma } from '../config/db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Memory cache for immutable first customer message timestamp per lead (0ms instant lookup)
const firstCustomerMsgCache = new Map();

/**
 * GET /api/leads
 * List leads with channel, stage, and search query filters
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const user = req.user;
    const { channelId, stage, search } = req.query;

    const where = {};

    // 1. Strict Role-Based Lead Isolation
    if (user.role === 'ADMIN') {
      // ADMIN: Full system access across all active channels
      // ADMIN: Full system access across all active channels
      if (channelId && channelId !== 'all') {
        where.channelId = channelId;
      } else {
        where.channel = { isActive: true };
      }
    } else {
      // STAFF / AGENT / MANAGER:
      // Staff member ko unke ALLOWED CHANNELS (jaise Line 3: 03710327973) ka pura data nazar aayega!
      // Agar kisi specific lead par assignedToId set hai to wo bhi show hogi.
      // STAFF / AGENT / MANAGER:
      // Staff member ko unke ALLOWED CHANNELS (jaise Line 3: 03710327973) ka pura data nazar aayega!
      // Agar kisi specific lead par assignedToId set hai to wo bhi show hogi.
      if (channelId && channelId !== 'all') {
        if (!user.allowedChannelIds.includes(channelId)) {
          return res.status(403).json({ error: 'Access denied for this WhatsApp channel.' });
        }
        where.channelId = channelId;
      } else {
        where.channelId = { in: user.allowedChannelIds };
        where.channel = { isActive: true };
      }
    }

    // 2. Stage Filter
    if (stage) {
      where.stage = stage;
    }

    // 3. Search Filter (Phone or Name)
    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { phoneNumber: { contains: search } },
      ];
    }

    const leads = await prisma.lead.findMany({
      where,
      include: {
        channel: {
          select: { id: true, name: true, countryCode: true, currency: true },
        },
        assignedTo: {
          select: { id: true, name: true, email: true },
        },
        tags: {
          include: { tag: true },
        },
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          select: { content: true, createdAt: true, senderType: true, status: true },
        },
      },
      orderBy: { lastMessageAt: 'desc' },
    });

    // Strict First Customer Message Resolution:
    // Only leads whose FIRST EVER message arrived after 12:00 AM count as today's new lead!
    const missingLeadIds = leads.map(l => l.id).filter(id => !firstCustomerMsgCache.has(id));
    if (missingLeadIds.length > 0) {
      const newMins = await prisma.message.groupBy({
        by: ['leadId'],
        where: {
          leadId: { in: missingLeadIds },
          senderType: 'CUSTOMER'
        },
        _min: { createdAt: true }
      });
      newMins.forEach(item => {
        if (item.leadId && item._min.createdAt) {
          firstCustomerMsgCache.set(item.leadId, item._min.createdAt);
        }
      });
    }

    const enrichedLeads = leads
      .map(l => {
        const msgTime = l.messages?.[0]?.createdAt ? new Date(l.messages[0].createdAt).getTime() : 0;
        const lTime = l.lastMessageAt ? new Date(l.lastMessageAt).getTime() : 0;
        const trueLastMessageAt = msgTime > lTime ? l.messages[0].createdAt : l.lastMessageAt;

        return {
          ...l,
          lastMessageAt: trueLastMessageAt,
          firstMessageAt: firstCustomerMsgCache.get(l.id) || l.createdAt,
        };
      })
      .sort((a, b) => {
        const timeA = new Date(a.lastMessageAt || a.createdAt || 0).getTime() || 0;
        const timeB = new Date(b.lastMessageAt || b.createdAt || 0).getTime() || 0;
        return timeB - timeA;
      });

    res.json({ leads: enrichedLeads });
  } catch (error) {
    console.error('Error fetching leads:', error);
    res.status(500).json({ error: 'Failed to retrieve leads.' });
  }
});

/**
 * GET /api/leads/:id
 * Get single lead details with notes and history
 */
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const lead = await prisma.lead.findUnique({
      where: { id: req.params.id },
      include: {
        channel: true,
        assignedTo: { select: { id: true, name: true, email: true } },
        notes: {
          include: { author: { select: { id: true, name: true } } },
          orderBy: { createdAt: 'desc' },
        },
        tags: { include: { tag: true } },
      },
    });

    if (!lead) return res.status(404).json({ error: 'Lead not found.' });

    // Enforce channel access for agents
    if (req.user.role !== 'ADMIN' && !req.user.allowedChannelIds.includes(lead.channelId)) {
      return res.status(403).json({ error: 'Access denied for this lead.' });
    }

    res.json({ lead });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch lead details.' });
  }
});

/**
 * POST /api/leads
 * Create a new lead directly in database
 */
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { fullName, phoneNumber, channelId, dealValue, stage = 'NEW_LEAD', serviceInterest } = req.body;
    if (!phoneNumber) return res.status(400).json({ error: 'Phone number is required.' });

    let targetChannelId = channelId;
    if (!targetChannelId || targetChannelId === 'all') {
      const defCh = await prisma.whatsAppChannel.findFirst({ where: { provider: 'META_API', isActive: true } })
                 || await prisma.whatsAppChannel.findFirst({ where: { isActive: true } });
      targetChannelId = defCh?.id;
    }

    if (!targetChannelId) {
      return res.status(400).json({ error: 'No active WhatsApp channel found.' });
    }

    let cleanDigits = phoneNumber.replace(/[^0-9]/g, '');
    if (cleanDigits.startsWith('00')) {
      cleanDigits = cleanDigits.substring(2);
    }
    if (cleanDigits.startsWith('03') && cleanDigits.length === 11) {
      cleanDigits = '92' + cleanDigits.substring(1);
    } else if (cleanDigits.startsWith('3') && cleanDigits.length === 10) {
      cleanDigits = '92' + cleanDigits;
    }
    const cleanPhone = `+${cleanDigits}`;

    // Check if lead already exists for this phone number on target channel or any channel
    const existingOnTarget = await prisma.lead.findFirst({
      where: {
        phoneNumber: cleanPhone,
        channelId: targetChannelId,
      },
      include: {
        channel: true,
        assignedTo: { select: { id: true, name: true, email: true } },
        messages: {
          orderBy: { createdAt: 'asc' },
          include: { senderUser: { select: { id: true, name: true } } },
        },
      },
    });

    let lead;
    let isExisting = false;

    if (existingOnTarget) {
      isExisting = true;
      // Do NOT demote or wipe existing stage (e.g. if already QUALIFIED, PROPOSAL_SENT, WON)
      const updateData = {};
      if (fullName && fullName.trim() && fullName !== cleanPhone) {
        updateData.fullName = fullName.trim();
      }
      if (serviceInterest !== undefined && serviceInterest !== '') {
        updateData.serviceInterest = serviceInterest;
      }
      if (dealValue !== undefined && dealValue !== '' && !isNaN(parseFloat(dealValue))) {
        updateData.dealValue = parseFloat(dealValue);
      }
      // Only set stage if explicitly different from default NEW_LEAD or if existing was still NEW_LEAD
      if (stage && stage !== 'NEW_LEAD' && existingOnTarget.stage === 'NEW_LEAD') {
        updateData.stage = stage;
      }

      lead = await prisma.lead.update({
        where: { id: existingOnTarget.id },
        data: updateData,
        include: {
          channel: true,
          assignedTo: { select: { id: true, name: true, email: true } },
          messages: {
            orderBy: { createdAt: 'asc' },
            include: { senderUser: { select: { id: true, name: true } } },
          },
        },
      });

      req.io?.emit('lead:updated', lead);
    } else {
      // Create fresh new lead
      lead = await prisma.lead.create({
        data: {
          phoneNumber: cleanPhone,
          fullName: fullName || cleanPhone,
          channelId: targetChannelId,
          dealValue: dealValue ? parseFloat(dealValue) : null,
          serviceInterest: serviceInterest || null,
          stage: stage || 'NEW_LEAD',
        },
        include: {
          channel: true,
          assignedTo: { select: { id: true, name: true, email: true } },
          messages: true,
        },
      });

      req.io?.emit('lead:new_global', lead);
    }

    res.status(isExisting ? 200 : 201).json({ 
      lead,
      isExisting,
      message: isExisting 
        ? 'Customer pehle se database mein mojood hai. Details update aur chat open kar di gayi.' 
        : 'Naya customer kamyabi se register ho gaya.'
    });
  } catch (e) {
    console.error('Error creating lead:', e);
    res.status(500).json({ error: 'Failed to create lead in database.' });
  }
});

/**
 * PATCH /api/leads/:id
 * General update for lead details (name, dealValue, stage, assignedTo)
 */
router.patch('/:id', authenticateToken, async (req, res) => {
  try {
    const { fullName, stage, dealValue, assignedToId, serviceInterest, tags } = req.body;
    const leadId = req.params.id;

    const data = {};
    if (fullName !== undefined) data.fullName = fullName;
    if (stage !== undefined) {
      const s = String(stage).toUpperCase();
      if (s.includes('LOST') || s.includes('UNQUALIF') || s.includes('REJECT')) data.stage = 'LOST';
      else if (s.includes('QUALIF')) data.stage = 'QUALIFIED';
      else if (s.includes('PROPOS')) data.stage = 'PROPOSAL_SENT';
      else if (s.includes('WON') || s.includes('CLOSED')) data.stage = 'WON';
      else if (s.includes('CONTACT')) data.stage = 'CONTACTED';
      else if (s.includes('NEW')) data.stage = 'NEW_LEAD';
      else data.stage = stage;
    }
    if (serviceInterest !== undefined) data.serviceInterest = serviceInterest;
    if (dealValue !== undefined) data.dealValue = dealValue === '' ? null : parseFloat(dealValue);
    if (assignedToId !== undefined) data.assignedToId = assignedToId === '' ? null : assignedToId;

    // Handle Tags update in PostgreSQL
    if (Array.isArray(tags)) {
      await prisma.tagOnLead.deleteMany({ where: { leadId } });
      for (const tagName of tags) {
        if (typeof tagName === 'string' && tagName.trim()) {
          const cleanName = tagName.trim();
          const tagRecord = await prisma.tag.upsert({
            where: { name: cleanName },
            create: { name: cleanName },
            update: {},
          });
          await prisma.tagOnLead.create({
            data: {
              leadId,
              tagId: tagRecord.id,
            },
          }).catch(() => {});
        }
      }
    }

    const updatedLead = await prisma.lead.update({
      where: { id: leadId },
      data,
      include: {
        channel: true,
        assignedTo: { select: { id: true, name: true, email: true } },
        tags: { include: { tag: true } },
      },
    });

    req.io?.emit('lead:updated', updatedLead);
    req.io?.emit('lead:stage_updated', {
      leadId: updatedLead.id,
      stage: updatedLead.stage,
      serviceInterest: updatedLead.serviceInterest,
      dealValue: updatedLead.dealValue,
      channelId: updatedLead.channelId,
    });
    res.json({ lead: updatedLead });
  } catch (error) {
    console.error('Error updating lead:', error);
    res.status(500).json({ error: 'Failed to update lead details.' });
  }
});

/**
 * PATCH /api/leads/:id/stage
 * Update Kanban stage
 */
router.patch('/:id/stage', authenticateToken, async (req, res) => {
  try {
    const { stage, dealValue } = req.body;
    const leadId = req.params.id;

    let targetStage = undefined;
    if (stage) {
      const s = String(stage).toUpperCase();
      if (s.includes('LOST') || s.includes('UNQUALIF') || s.includes('REJECT')) targetStage = 'LOST';
      else if (s.includes('QUALIF')) targetStage = 'QUALIFIED';
      else if (s.includes('PROPOS')) targetStage = 'PROPOSAL_SENT';
      else if (s.includes('WON') || s.includes('CLOSED')) targetStage = 'WON';
      else if (s.includes('CONTACT')) targetStage = 'CONTACTED';
      else if (s.includes('NEW')) targetStage = 'NEW_LEAD';
      else targetStage = stage;
    }

    const updatedLead = await prisma.lead.update({
      where: { id: leadId },
      data: {
        ...(targetStage ? { stage: targetStage } : {}),
        ...(dealValue !== undefined ? { dealValue: parseFloat(dealValue) } : {}),
      },
      include: {
        channel: true,
        assignedTo: { select: { id: true, name: true } },
      },
    });

    // Broadcast stage change to real-time boards
    req.io?.emit('lead:stage_updated', {
      leadId: updatedLead.id,
      stage: updatedLead.stage,
      dealValue: updatedLead.dealValue,
      channelId: updatedLead.channelId,
    });

    res.json({ lead: updatedLead });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update lead stage.' });
  }
});

/**
 * POST /api/leads/:id/notes
 * Add internal private team note (Never sent to WhatsApp)
 */
router.post('/:id/notes', authenticateToken, async (req, res) => {
  try {
    const { content } = req.body;
    if (!content) return res.status(400).json({ error: 'Note content is required.' });

    const note = await prisma.internalNote.create({
      data: {
        leadId: req.params.id,
        authorId: req.user.id,
        content,
      },
      include: {
        author: { select: { id: true, name: true } },
      },
    });

    // Real-time broadcast strictly to internal team members viewing this lead
    req.io?.to(`lead:${req.params.id}`).emit('note:new', note);

    res.status(201).json({ note });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add internal note.' });
  }
});

export default router;
