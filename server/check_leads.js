import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const ismail = await prisma.user.findFirst({
    where: { email: 'staff1@gmail.com' },
    include: { allowedChannels: true }
  });
  const chIds = ismail.allowedChannels.map(ac => ac.channelId);
  const leads = await prisma.lead.findMany({
    where: { channelId: { in: chIds } },
    select: { id: true, fullName: true, phoneNumber: true, stage: true, lastMessageAt: true, createdAt: true, updatedAt: true }
  });
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  const todayLeads = leads.filter(l => {
    const d = new Date(l.lastMessageAt || l.createdAt);
    return d >= startOfToday;
  });
  
  console.log('TOTAL TODAY LEADS:', todayLeads.length);
  todayLeads.forEach((l, i) => {
    console.log(`${i+1}. [${l.stage}] ${l.fullName || 'No Name'} (${l.phoneNumber}) - Last: ${l.lastMessageAt?.toISOString()} - Created: ${l.createdAt?.toISOString()}`);
  });
  process.exit(0);
}

main().catch(console.error);
