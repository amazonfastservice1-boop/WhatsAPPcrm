import { PrismaClient } from '../server/node_modules/@prisma/client/index.js';
const prisma = new PrismaClient();

async function main() {
  const arif = await prisma.lead.findMany({
    where: { fullName: { contains: 'Arif Khan' } },
    include: { channel: true }
  });
  console.log('Arif Khan rows in DB:');
  arif.forEach(a => {
    console.log(a.id, a.fullName, a.phoneNumber, 'channel:', a.channel?.name, 'channelId:', a.channelId, 'lastMsg:', a.lastMessageAt, 'created:', a.createdAt);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
