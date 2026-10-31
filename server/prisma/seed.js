import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding initial WhatsApp CRM data...');

  // 1. Create WhatsApp Channels (Dubai, Saudi Arabia, Pakistan)
  const dubaiChannel = await prisma.whatsAppChannel.upsert({
    where: { phoneNumber: '+971501234567' },
    update: {},
    create: {
      name: 'Dubai Main Branch',
      countryCode: 'AE',
      countryName: 'United Arab Emirates',
      phoneNumber: '+971501234567',
      currency: 'AED',
      timezone: 'Asia/Dubai',
      phoneIdMeta: process.env.META_PHONE_ID_DUBAI || 'meta_phone_id_dubai_mock',
      welcomeMessage: 'Welcome to AmazFast Dubai! Our UAE representative will assist you in AED.',
    },
  });

  const saudiChannel = await prisma.whatsAppChannel.upsert({
    where: { phoneNumber: '+966501234567' },
    update: {},
    create: {
      name: 'Saudi Arabia Branch',
      countryCode: 'SA',
      countryName: 'Saudi Arabia',
      phoneNumber: '+966501234567',
      currency: 'SAR',
      timezone: 'Asia/Riyadh',
      phoneIdMeta: process.env.META_PHONE_ID_SAUDI || 'meta_phone_id_saudi_mock',
      welcomeMessage: 'أهلاً بك في AmazFast السعودية! سيقوم ممثلنا بالرد عليك بالريال السعودي.',
    },
  });

  const pakChannel = await prisma.whatsAppChannel.upsert({
    where: { phoneNumber: '+923001234567' },
    update: {},
    create: {
      name: 'Pakistan Head Office',
      countryCode: 'PK',
      countryName: 'Pakistan',
      phoneNumber: '+923001234567',
      currency: 'PKR',
      timezone: 'Asia/Karachi',
      phoneIdMeta: process.env.META_PHONE_ID_PAK || 'meta_phone_id_pak_mock',
      welcomeMessage: 'Assalam o Alaikum! AmazFast Pakistan mein khushamdeed.',
    },
  });

  console.log('✅ Channels created:', [dubaiChannel.name, saudiChannel.name, pakChannel.name]);

  // 2. Create Super Admin User
  const defaultPasswordHash = await bcrypt.hash('admin123456', 10);
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@amazfast.com' },
    update: {},
    create: {
      name: 'Super Admin',
      email: 'admin@amazfast.com',
      passwordHash: defaultPasswordHash,
      role: 'ADMIN',
      isOnline: true,
      allowedChannels: {
        create: [
          { channelId: dubaiChannel.id },
          { channelId: saudiChannel.id },
          { channelId: pakChannel.id },
        ],
      },
    },
  });

  console.log('✅ Super Admin created: admin@amazfast.com (Password: admin123456)');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
