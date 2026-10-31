import dotenv from 'dotenv';
dotenv.config();
import axios from 'axios';

// A valid minimal silent MP3 frame (MPEG-1 Layer 3, 128kbps, 44100Hz)
// 0xFF, 0xFB, 0x90, 0x64...
function createSilentMp3(numFrames = 50) {
  // 1 frame of silent MP3 @ 128kbps, 44.1kHz is 417 bytes
  const frameHeader = Buffer.from([0xFF, 0xFB, 0x90, 0x64]);
  const frame = Buffer.alloc(417, 0);
  frameHeader.copy(frame, 0);
  const total = Buffer.alloc(417 * numFrames);
  for (let i = 0; i < numFrames; i++) {
    frame.copy(total, i * 417);
  }
  return total;
}

async function testMp3() {
  const metaToken = process.env.META_SYSTEM_USER_ACCESS_TOKEN;
  const phoneId = process.env.META_PHONE_ID_PAK || '1323808554145124';
  const apiVersion = process.env.META_API_VERSION || 'v19.0';
  const recipient = '923142618923';

  const mp3Buffer = createSilentMp3(30); // ~0.8 sec of valid MP3 audio

  console.log('Uploading valid MP3 to Meta...');
  const form = new FormData();
  form.append('messaging_product', 'whatsapp');
  form.append('file', new Blob([mp3Buffer], { type: 'audio/mpeg' }), 'voice_note.mp3');
  form.append('type', 'audio/mpeg');

  try {
    const uploadRes = await axios.post(
      `https://graph.facebook.com/${apiVersion}/${phoneId}/media`,
      form,
      { headers: { Authorization: `Bearer ${metaToken}` } }
    );
    console.log('Upload success! ID:', uploadRes.data.id);
    const mediaId = uploadRes.data.id;

    console.log('Sending audio message to recipient with voice: true...');
    const sendRes = await axios.post(
      `https://graph.facebook.com/${apiVersion}/${phoneId}/messages`,
      {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: recipient,
        type: 'audio',
        audio: { id: mediaId, voice: true }
      },
      { headers: { Authorization: `Bearer ${metaToken}`, 'Content-Type': 'application/json' } }
    );
    console.log('Send response:', sendRes.data);
  } catch (err) {
    console.error('Error:', JSON.stringify(err.response?.data || err.message, null, 2));
  }
}

testMp3();

