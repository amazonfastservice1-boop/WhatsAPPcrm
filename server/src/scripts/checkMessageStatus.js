import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

async function checkStatus() {
  const token = process.env.META_SYSTEM_USER_ACCESS_TOKEN;
  const msgId = 'wamid.HBgMOTIzMTQyNjE4OTIzFQIAERgUQ0VFNEYwRjU5REVBQ0UwRkYxM0MA';

  try {
    const res = await axios.get(`https://graph.facebook.com/v19.0/${msgId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('Status:', res.data);
  } catch (err) {
    console.error('Check failed:', err.response?.data || err.message);
  }
}

checkStatus();
