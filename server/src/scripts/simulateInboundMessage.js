import crypto from 'crypto';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

async function simulateInbound() {
  const appSecret = process.env.META_APP_SECRET;

  const payload = JSON.stringify({
    object: 'whatsapp_business_account',
    entry: [
      {
        changes: [
          {
            field: 'messages',
            value: {
              metadata: {
                phone_number_id: '1323808554145124',
              },
              contacts: [
                {
                  profile: { name: 'Hammad (Lead)' },
                  wa_id: '923142618923',
                },
              ],
              messages: [
                {
                  from: '923142618923',
                  id: `wamid.live.${Date.now()}`,
                  type: 'text',
                  text: { body: 'Assalam o Alaikum! Mujhe AmazFast WhatsApp CRM ki details chahiye.' },
                },
              ],
            },
          },
        ],
      },
    ],
  });

  // Generate valid Meta X-Hub-Signature-256
  const hash = crypto.createHmac('sha256', appSecret).update(payload).digest('hex');

  try {
    const res = await axios.post('http://localhost:5000/api/webhook', payload, {
      headers: {
        'Content-Type': 'application/json',
        'x-hub-signature-256': `sha256=${hash}`,
      },
    });
    console.log('✅ Webhook Response:', res.data);
    console.log('📲 Simulated Inbound WhatsApp Message Sent Successfully from +923142618923 to Pakistan Channel!');
  } catch (err) {
    console.error('Failed:', err.response?.data || err.message);
  }
}

simulateInbound();
