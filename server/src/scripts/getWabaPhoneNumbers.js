import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

async function getWabaPhoneNumbers() {
  const token = process.env.META_SYSTEM_USER_ACCESS_TOKEN;
  const wabaId = process.env.META_WABA_ID || '1976171253043547';

  console.log(`🔍 Querying WABA ID: ${wabaId}...`);

  try {
    const res = await axios.get(`https://graph.facebook.com/v19.0/${wabaId}/phone_numbers`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log('✅ Phone Numbers Found:');
    console.log(JSON.stringify(res.data, null, 2));
  } catch (err) {
    console.error('❌ Failed:', err.response?.data || err.message);
  }
}

getWabaPhoneNumbers();
