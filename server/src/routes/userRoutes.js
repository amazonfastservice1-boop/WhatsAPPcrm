import express from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../config/db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// GET all staff / users with their assigned channels and lead counts
router.get('/', authenticateToken, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isOnline: true,
        plainPassword: true,
        createdAt: true,
        allowedChannels: {
          include: {
            channel: {
              select: {
                id: true,
                name: true,
                countryCode: true,
                phoneNumber: true,
              },
            },
          },
        },
        _count: {
          select: {
            assignedLeads: true,
            messagesSent: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Calculate actual active leads and today's activity for each staff member
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const enrichedUsers = await Promise.all(
      users.map(async (u) => {
        const allowedChannelIds = u.allowedChannels.map((ac) => ac.channel.id);
        
        let channelLeadsCount = 0;
        let todayLeadsCount = 0;

        const baseChannelWhere = u.role === 'ADMIN' 
          ? { channel: { isActive: true } } 
          : allowedChannelIds.length > 0 
          ? { channelId: { in: allowedChannelIds } } 
          : null;

        if (baseChannelWhere) {
          channelLeadsCount = await prisma.lead.count({ where: baseChannelWhere });
          // Only count NEW inbound leads with fresh message today (prevent double counting qualified/lost)
          todayLeadsCount = await prisma.lead.count({
            where: {
              ...baseChannelWhere,
              stage: 'NEW_LEAD',
              lastMessageAt: { gte: startOfToday },
            },
          });
        }

        // Messages sent today by this specific user
        const todayMessagesCount = await prisma.message.count({
          where: {
            senderUserId: u.id,
            createdAt: { gte: startOfToday }
          }
        });

        return {
          ...u,
          channelLeadsCount,
          todayLeadsCount,
          todayMessagesCount,
        };
      })
    );

    res.json({ success: true, users: enrichedUsers });
  } catch (err) {
    console.error('Error fetching staff members:', err);
    res.status(500).json({ error: 'Failed to fetch staff members' });
  }
});

// POST create a new staff member (Admin only)
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, email, password, role = 'AGENT', channelIds = [] } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    // Security Rule: Only 1 Admin allowed in the system
    const safeRole = role === 'MANAGER' ? 'MANAGER' : 'AGENT';

    // Check if email already exists
    const existing = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (existing) {
      return res.status(400).json({ error: 'A staff member with this email already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Create user with transaction to attach channel access
    const newUser = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: name.trim(),
          email: email.toLowerCase().trim(),
          passwordHash,
          plainPassword: password,
          role: safeRole,
          isOnline: false,
        },
      });

      if (channelIds && channelIds.length > 0) {
        await tx.userChannelAccess.createMany({
          data: channelIds.map((channelId) => ({
            userId: user.id,
            channelId,
          })),
        });
      }

      return user;
    });

    res.status(201).json({
      success: true,
      message: 'Staff member created successfully',
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
      },
    });
  } catch (err) {
    console.error('Error creating staff member:', err);
    res.status(500).json({ error: 'Failed to create staff member' });
  }
});

// PUT update staff details, password, or channel access
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, role, isOnline, channelIds, password } = req.body;

    const dataToUpdate = {};
    if (name) dataToUpdate.name = name.trim();
    if (role && role !== 'ADMIN') dataToUpdate.role = role;
    if (typeof isOnline === 'boolean') dataToUpdate.isOnline = isOnline;
    if (password && password.length >= 6) {
      const salt = await bcrypt.genSalt(10);
      dataToUpdate.passwordHash = await bcrypt.hash(password, salt);
      dataToUpdate.plainPassword = password;
    }

    await prisma.$transaction(async (tx) => {
      if (Object.keys(dataToUpdate).length > 0) {
        await tx.user.update({
          where: { id },
          data: dataToUpdate,
        });
      }

      if (Array.isArray(channelIds)) {
        // Replace channel access
        await tx.userChannelAccess.deleteMany({
          where: { userId: id },
        });

        if (channelIds.length > 0) {
          await tx.userChannelAccess.createMany({
            data: channelIds.map((channelId) => ({
              userId: id,
              channelId,
            })),
          });
        }
      }
    });

    res.json({ success: true, message: 'Staff member updated successfully' });
  } catch (err) {
    console.error('Error updating staff member:', err);
    res.status(500).json({ error: 'Failed to update staff member' });
  }
});

// DELETE a staff member
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Do not allow deleting own self
    if (req.user && req.user.id === id) {
      return res.status(400).json({ error: 'You cannot delete your own admin account' });
    }

    // Unassign leads first
    await prisma.lead.updateMany({
      where: { assignedToId: id },
      data: { assignedToId: null },
    });

    await prisma.user.delete({
      where: { id },
    });

    res.json({ success: true, message: 'Staff member removed' });
  } catch (err) {
    console.error('Error deleting staff member:', err);
    res.status(500).json({ error: 'Failed to delete staff member' });
  }
});

export default router;

