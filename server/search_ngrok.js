import axios from 'axios';

async function main() {
  const res = await axios.get('http://127.0.0.1:4040/api/requests/http?limit=20');
  const targetId = 'CE5973BA31B70301E2EBA';
  for (const r of res.data.requests) {
    const raw = Buffer.from(r.request.raw, 'base64').toString('utf8');
    if (raw.includes(targetId)) {
      console.log('--- FOUND WEBHOOK FOR MP3 MSG ---');
      console.log(raw.slice(raw.indexOf('{')));
    }
  }
}

main().catch(console.error);
