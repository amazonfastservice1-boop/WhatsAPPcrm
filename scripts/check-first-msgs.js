import { PrismaClient } from '../server/node_modules/@prisma/client/index.js';
const prisma = new PrismaClient();

async function main() {
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  console.log('Start of today (PKT):', startToday.toISOString());

  // 1. Group by leadId for CUSTOMER messages to find MIN(createdAt)
  const firstCustomerMsgs = await prisma.message.groupBy({
    by: ['leadId'],
    where: { senderType: 'CUSTOMER' },
    _min: { createdAt: true }
  });

  const leadsFirstToday = firstCustomerMsgs.filter(item => {
    return item._min.createdAt && item._min.createdAt >= startToday;
  });

  console.log('Leads whose FIRST EVER CUSTOMER message arrived TODAY (after 12 AM):', leadsFirstToday.length);
  for (const item of leadsFirstToday) {
    const lead = await prisma.lead.findUnique({
      where: { id: item.leadId },
      select: { fullName: true, phoneNumber: true, channelId: true, stage: true }
    });
    console.log(`- ${lead?.fullName} (${lead?.phoneNumber}) | firstMsg: ${item._min.createdAt.toISOString()}`);
  }

  // Also check leads who have messages where senderType is not CUSTOMER (e.g. agent initiated)
  const totalLeads = await prisma.lead.count();
  console.log('Total leads in database:', totalLeads);
}

main().catch(console.error).finally(() => prisma.$disconnect());
