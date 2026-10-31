import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

async function sendDirectText() {
  const token = process.env.META_SYSTEM_USER_ACCESS_TOKEN;
  const phoneId = process.env.META_PHONE_ID_PAK || process.env.META_PHONE_ID || '1323808554145124';
  const recipient = '923142618923';

  console.log(`Sending text message from real number ${phoneId} to ${recipient}...`);

  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: recipient,
    type: 'text',
    text: { body: 'Hello Hammad! This is a real test message from your AmazFast WhatsApp CRM.' }
  };

  try {
    const res = await axios.post(`https://graph.facebook.com/v19.0/${phoneId}/messages`, payload, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('🎉 SUCCESS! Real message dispatched:', res.data);
  } catch (err) {
    console.error('Meta Result:', JSON.stringify(err.response?.data || err.message, null, 2));
  }
}

sendDirectText();
