import dotenv from 'dotenv';
dotenv.config();
import axios from 'axios';

async function testWav() {
  const metaToken = process.env.META_SYSTEM_USER_ACCESS_TOKEN;
  const phoneId = process.env.META_PHONE_ID_PAK || '1323808554145124';
  const apiVersion = process.env.META_API_VERSION || 'v19.0';

  // 1-second 8000Hz 16-bit mono PCM WAV
  const sampleRate = 8000;
  const numSamples = sampleRate * 1;
  const dataSize = numSamples * 2;
  const buffer = Buffer.alloc(44 + dataSize);

  // RIFF chunk
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  // fmt chunk
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(1, 22); // 1 channel
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  // data chunk
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  const form = new FormData();
  form.append('messaging_product', 'whatsapp');
  form.append('file', new Blob([buffer], { type: 'audio/wav' }), 'sample.wav');
  form.append('type', 'audio/wav');

  try {
    const res = await axios.post(
      `https://graph.facebook.com/${apiVersion}/${phoneId}/media`,
      form,
      { headers: { Authorization: `Bearer ${metaToken}` } }
    );
    console.log('Meta upload response for WAV:', res.data);
  } catch (err) {
    console.log('Meta error for WAV:', JSON.stringify(err.response?.data || err.message, null, 2));
  }
}

testWav();

