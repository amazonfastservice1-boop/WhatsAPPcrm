import { prisma } from './server/src/config/db.js';

async function main() {
  const result = await prisma.$queryRaw`
    SELECT l.id, l."fullName", l."phoneNumber", l."lastMessageAt", MAX(m."createdAt") as "realLastMessageAt"
    FROM "Lead" l
    LEFT JOIN "Message" m ON m."leadId" = l.id
    GROUP BY l.id, l."fullName", l."phoneNumber", l."lastMessageAt"
    HAVING MAX(m."createdAt") IS NOT NULL AND MAX(m."createdAt") > l."lastMessageAt"
  `;
  console.log('Out of sync leads count:', result.length);
  if (result.length > 0) {
    console.log('Sample out of sync:', result.slice(0, 5));
  }
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
