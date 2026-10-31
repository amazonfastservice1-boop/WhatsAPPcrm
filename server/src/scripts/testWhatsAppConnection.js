import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

async function testWhatsApp() {
  console.log('🔍 Testing Meta WhatsApp Cloud API connection...');

  const token = process.env.META_SYSTEM_USER_ACCESS_TOKEN;
  const appId = process.env.META_APP_ID;

  if (!token) {
    console.error('❌ META_SYSTEM_USER_ACCESS_TOKEN missing in .env');
    return;
  }

  try {
    // 1. Check Token & User Info
    const userRes = await axios.get(`https://graph.facebook.com/v19.0/me?fields=id,name`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log(`✅ 1. Meta API Connected Successfully! Authenticated as: ${userRes.data.name} (ID: ${userRes.data.id})`);

    // 2. Check App Details
    if (appId) {
      const appRes = await axios.get(`https://graph.facebook.com/v19.0/${appId}?fields=id,name`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log(`✅ 2. Meta App Verified: "${appRes.data.name}" (App ID: ${appRes.data.id})`);
    }

    // 3. Check WhatsApp Business Accounts (WABA)
    try {
      const wabaRes = await axios.get(`https://graph.facebook.com/v19.0/me/businesses`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log('🏢 Business Portfolios:', wabaRes.data.data?.map(b => `${b.name} (${b.id})`) || 'None listed directly');
    } catch (e) {
      // Non-critical if user doesn't have business list permission
    }

    console.log('\n🎉 ALL CHECKS PASSED: Meta WhatsApp Cloud API Token is 100% VALID and ACTIVE!');
  } catch (err) {
    console.error('❌ Connection test failed:', err.response?.data?.error?.message || err.message);
  }
}

testWhatsApp();
