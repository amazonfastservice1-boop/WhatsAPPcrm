const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const channels = await prisma.whatsAppChannel.findMany();
  console.log('CHANNELS COUNT:', channels.length);
  channels.forEach(c => {
    console.log(`Channel ${c.id}: ${c.name} | Phone: ${c.phoneNumber} | isActive: ${c.isActive}`);
  });

  const totalLeads = await prisma.lead.count();
  console.log('TOTAL LEADS IN DB:', totalLeads);

  const leadsByChannel = await prisma.lead.groupBy({
    by: ['channelId'],
    _count: { id: true }
  });
  console.log('LEADS BY CHANNEL:', JSON.stringify(leadsByChannel, null, 2));

  // Check leads with where { channel: { isActive: true } }
  const activeChannelLeads = await prisma.lead.count({
    where: { channel: { isActive: true } }
  });
  console.log('LEADS WITH ACTIVE CHANNEL:', activeChannelLeads);
}

main().catch(console.error).finally(() => prisma.$disconnect());

