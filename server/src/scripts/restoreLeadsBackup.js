import fs from 'fs';
import path from 'path';
import { prisma } from '../config/db.js';

const BACKUP_DIR = path.resolve(process.cwd(), 'storage/backups');
const BACKUP_FILE = path.join(BACKUP_DIR, 'leads_backup_latest.json');

async function createBackupNow() {
  console.log('📦 Database se saari leads fetch ho rahi hain...');
  const leads = await prisma.lead.findMany({
    include: {
      channel: { select: { id: true, name: true, countryCode: true, currency: true } },
      assignedTo: { select: { id: true, name: true, email: true } },
      tags: { include: { tag: true } },
      messages: {
        take: 1,
        orderBy: { createdAt: 'desc' },
        select: { content: true, createdAt: true, senderType: true, status: true },
      },
    },
    orderBy: { lastMessageAt: 'desc' },
  });

  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }

  const payload = {
    savedAt: new Date().toISOString(),
    count: leads.length,
    leads,
  };

  fs.writeFileSync(BACKUP_FILE, JSON.stringify(payload, null, 2), 'utf8');
  console.log(`✅ Kamyab! Kul ${leads.length} leads ka backup save ho gaya: ${BACKUP_FILE}`);
}

async function restoreBackupNow() {
  if (!fs.existsSync(BACKUP_FILE)) {
    console.error(`❌ Backup file nahi mili: ${BACKUP_FILE}`);
    console.log('Pehle "--backup-now" chala kar backup banayein.');
    process.exit(1);
  }

  const raw = fs.readFileSync(BACKUP_FILE, 'utf8');
  const parsed = JSON.parse(raw);
  const leads = parsed?.leads || [];

  console.log(`🔄 Backup (${parsed.savedAt}) se ${leads.length} leads check aur restore ho rahi hain...`);
  let restoredCount = 0;

  for (const item of leads) {
    if (!item.phoneNumber || !item.channelId) continue;
    try {
      await prisma.lead.upsert({
        where: {
          phoneNumber_channelId: {
            phoneNumber: item.phoneNumber,
            channelId: item.channelId,
          },
        },
        update: {
          fullName: item.fullName || undefined,
          stage: item.stage || undefined,
          serviceInterest: item.serviceInterest || undefined,
          dealValue: item.dealValue ?? undefined,
        },
        create: {
          id: item.id,
          phoneNumber: item.phoneNumber,
          fullName: item.fullName,
          avatarUrl: item.avatarUrl || null,
          channelId: item.channelId,
          stage: item.stage || 'NEW_LEAD',
          dealValue: item.dealValue ?? null,
          serviceInterest: item.serviceInterest || null,
          unreadCount: item.unreadCount || 0,
          lastMessageAt: item.lastMessageAt ? new Date(item.lastMessageAt) : new Date(),
          createdAt: item.createdAt ? new Date(item.createdAt) : new Date(),
        },
      });
      restoredCount++;
    } catch (e) {
      // Ignore individual constraint conflicts
    }
  }

  console.log(`✅ Restore mukammal! ${restoredCount} leads database mein verify/restore ho gayin.`);
}

const isBackupNow = process.argv.includes('--backup-now');
(isBackupNow ? createBackupNow() : restoreBackupNow())
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Error:', err.message);
    process.exit(1);
  });
