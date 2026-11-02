const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const total = await prisma.lead.count();
  console.log('Total leads in DB:', total);
  const now = new Date();
  console.log('System now:', now.toString(), 'ISO:', now.toISOString());
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const endToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  
  const leadsToday = await prisma.lead.findMany({
    where: { lastMessageAt: { gte: startToday, lte: endToday } },
    select: { fullName: true, phoneNumber: true, lastMessageAt: true, createdAt: true, stage: true },
    orderBy: { lastMessageAt: 'desc' }
  });
  console.log('Leads with lastMessageAt TODAY (Nov 3):', leadsToday.length);
  leadsToday.forEach(l => console.log('  ', l.fullName, l.phoneNumber, 'lastMsg:', l.lastMessageAt.toISOString(), 'stage:', l.stage));
}
main().catch(console.error).finally(() => prisma.$disconnect());
