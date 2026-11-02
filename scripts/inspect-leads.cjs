const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../server/.env') });
const { PrismaClient } = require('../server/node_modules/@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const total = await prisma.lead.count();
  console.log('Total leads in DB:', total);

  // Check Pakistan Time (UTC+5) vs System Time
  const now = new Date();
  console.log('Server / System time:', now.toISOString(), 'Local string:', now.toString());

  // Today boundaries in local time
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const endToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  console.log('startToday:', startToday.toISOString(), 'endToday:', endToday.toISOString());

  const todayLeadsByMsg = await prisma.lead.findMany({
    where: {
      lastMessageAt: {
        gte: startToday,
        lte: endToday
      }
    },
    select: {
      id: true,
      fullName: true,
      phoneNumber: true,
      channelId: true,
      stage: true,
      lastMessageAt: true,
      createdAt: true
    },
    orderBy: { lastMessageAt: 'desc' }
  });

  console.log('Leads with lastMessageAt today (Nov 3):', todayLeadsByMsg.length);
  todayLeadsByMsg.forEach(l => {
    console.log(`- ${l.fullName} (${l.phoneNumber}) | stage: ${l.stage} | lastMsg: ${l.lastMessageAt.toISOString()} | created: ${l.createdAt.toISOString()}`);
  });

  // Also check yesterday leads
  const startYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0, 0);
  const endYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);
  const yesterdayLeads = await prisma.lead.count({
    where: {
      lastMessageAt: {
        gte: startYesterday,
        lte: endYesterday
      }
    }
  });
  console.log('Leads with lastMessageAt yesterday (Nov 2):', yesterdayLeads);
}

main().catch(console.error).finally(() => prisma.$disconnect());
