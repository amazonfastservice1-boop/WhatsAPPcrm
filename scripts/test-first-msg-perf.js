import { PrismaClient } from '../server/node_modules/@prisma/client/index.js';
const prisma = new PrismaClient();

async function main() {
  const start = Date.now();
  // Get MIN(createdAt) for customer messages per leadId
  const firstCustomerMsgs = await prisma.message.groupBy({
    by: ['leadId'],
    where: { senderType: 'CUSTOMER' },
    _min: { createdAt: true }
  });

  const firstMsgMap = new Map();
  firstCustomerMsgs.forEach(item => {
    if (item.leadId && item._min.createdAt) {
      firstMsgMap.set(item.leadId, item._min.createdAt);
    }
  });

  console.log(`Queried ${firstCustomerMsgs.length} leads firstMessage in ${Date.now() - start}ms`);
  
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  
  let countToday = 0;
  firstMsgMap.forEach((firstAt, leadId) => {
    if (firstAt >= startToday) {
      countToday++;
    }
  });
  console.log('Count of leads whose FIRST customer message is today:', countToday);
}

main().catch(console.error).finally(() => prisma.$disconnect());
