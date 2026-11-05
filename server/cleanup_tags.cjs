const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanup() {
  const leads = await prisma.lead.findMany({
    include: {
      tags: { include: { tag: true } }
    }
  });

  for (const lead of leads) {
    const rawTags = lead.tags.map(t => t.tag.name);
    const followUps = rawTags.filter(t => /^follow-?up/i.test(t));
    if (followUps.length > 1) {
      console.log(`Fixing lead ${lead.fullName || lead.phoneNumber}:`, rawTags);
      const keepTag = followUps[followUps.length - 1]; // keep latest
      const deleteTagOnLeads = lead.tags.filter(t => /^follow-?up/i.test(t.tag.name) && t.tag.name !== keepTag);
      for (const t of deleteTagOnLeads) {
        await prisma.tagOnLead.delete({
          where: {
            leadId_tagId: {
              leadId: lead.id,
              tagId: t.tagId
            }
          }
        });
      }
      console.log(`Kept tag '${keepTag}' for lead ${lead.fullName || lead.phoneNumber}`);
    }
  }
}

cleanup().catch(console.error).finally(() => prisma.$disconnect());

