import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

async function checkBusiness() {
  const token = process.env.META_SYSTEM_USER_ACCESS_TOKEN;
  const businessId = '525749246814440';

  console.log(`Checking Business ID ${businessId}...`);
  try {
    const res = await axios.get(`https://graph.facebook.com/v19.0/${businessId}?fields=name,owned_whatsapp_business_accounts{id,name,phone_numbers{id,display_phone_number}}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('Business Accounts:', JSON.stringify(res.data, null, 2));
  } catch (err) {
    console.error('Business query failed:', err.response?.data || err.message);
  }
}

checkBusiness();
