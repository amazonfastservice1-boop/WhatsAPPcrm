import { prisma } from './server/src/config/db.js';

async function main() {
  console.log('Synchronizing all Lead lastMessageAt with MAX(Message.createdAt)...');
  const updated = await prisma.$executeRaw`
    UPDATE "Lead" l
    SET "lastMessageAt" = sub.max_created
    FROM (
      SELECT "leadId", MAX("createdAt") as max_created
      FROM "Message"
      GROUP BY "leadId"
    ) sub
    WHERE l.id = sub."leadId"
      AND (l."lastMessageAt" IS NULL OR sub.max_created > l."lastMessageAt");
  `;
  console.log(`Successfully updated ${updated} leads to their true newest message timestamp!`);
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
