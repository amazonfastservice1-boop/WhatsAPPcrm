import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

async function sendLiveMessage() {
  const token = process.env.META_SYSTEM_USER_ACCESS_TOKEN;
  const phoneId = process.env.META_PHONE_ID_PAK || process.env.META_PHONE_ID || '1323808554145124';
  const recipient = '923142618923'; // User's personal mobile number

  console.log(`🚀 Sending LIVE WhatsApp Message via Meta Phone ID ${phoneId} to ${recipient}...`);

  // Meta standard hello_world template (allowed for 1st message before customer replies)
  const templatePayload = {
    messaging_product: 'whatsapp',
    to: recipient,
    type: 'template',
    template: {
      name: 'hello_world',
      language: { code: 'en_US' }
    }
  };

  try {
    const res = await axios.post(`https://graph.facebook.com/v19.0/${phoneId}/messages`, templatePayload, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('🎉 SUCCESS! Real WhatsApp Message Sent to Your Mobile!');
    console.log('Meta Message Details:', JSON.stringify(res.data, null, 2));
  } catch (err) {
    console.error('❌ Meta Dispatch Error:', JSON.stringify(err.response?.data || err.message, null, 2));
  }
}

sendLiveMessage();
