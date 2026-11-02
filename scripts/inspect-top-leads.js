import { PrismaClient } from '../server/node_modules/@prisma/client/index.js';
const prisma = new PrismaClient();

async function main() {
  const names = ['Arif Khan', 'God Is Big', 'BELIEVE ON YOUR SELF', 'baijidsarkermd', 'huzaifa', 'FARIS QURESHI', 'Farmanullah', 'Muhammad Usman'];
  const leads = await prisma.lead.findMany({
    where: { fullName: { in: names } },
    select: { id: true, fullName: true, lastMessageAt: true, createdAt: true }
  });
  console.log('Exact DB values:');
  leads.forEach(l => {
    console.log(l.fullName, 'lastMsg:', l.lastMessageAt, 'created:', l.createdAt);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
