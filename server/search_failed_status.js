import axios from 'axios';

async function main() {
  const res = await axios.get('http://127.0.0.1:4040/api/requests/http?limit=50');
  for (const r of res.data.requests) {
    const raw = Buffer.from(r.request.raw, 'base64').toString('utf8');
    if (raw.includes('"failed"') || raw.includes('errors') || raw.includes('CE5C24CCD806867D6EB9A')) {
      console.log('--- FOUND FAILED WEBHOOK ---');
      console.log(raw.slice(raw.indexOf('{')));
    }
  }
}

main().catch(console.error);

