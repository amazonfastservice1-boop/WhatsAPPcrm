import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

async function findPhoneNumbers() {
  const token = process.env.META_SYSTEM_USER_ACCESS_TOKEN;
  const appId = process.env.META_APP_ID;

  console.log('🔍 Checking registered WhatsApp Phone Numbers on Meta App...');

  try {
    // 1. Get WABAs associated with the app
    const res = await axios.get(`https://graph.facebook.com/v19.0/1794853781722577?fields=name,whatsapp_business_accounts{id,name,phone_numbers{id,display_phone_number,verified_name}}`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log('Response:', JSON.stringify(res.data, null, 2));
  } catch (err) {
    console.log('App query failed, trying businesses...');
    try {
      const bRes = await axios.get(`https://graph.facebook.com/v19.0/me/businesses?fields=id,name,whatsapp_business_accounts{id,name,phone_numbers{id,display_phone_number}}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('Business WABAs:', JSON.stringify(bRes.data, null, 2));
    } catch (bErr) {
      console.error('Error fetching numbers:', bErr.response?.data || bErr.message);
    }
  }
}

findPhoneNumbers();
