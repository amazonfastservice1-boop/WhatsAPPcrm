import { prisma } from './src/config/db.js';
import jwt from 'jsonwebtoken';
import axios from 'axios';

async function main() {
  const user = await prisma.user.findUnique({
    where: { email: 'staff1@gmail.com' },
    include: { allowedChannels: true }
  });
  console.log('User:', user.name, user.role, 'allowedChannels:', user.allowedChannels);
  const token = jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET || 'fallback_development_secret'
  );

  try {
    const res = await axios.get('http://localhost:5000/api/leads', {
      headers: { Authorization: 'Bearer ' + token }
    });
    console.log('Leads count returned for staff1:', res.data.leads.length);
    const channelsInLeads = new Set(res.data.leads.map(l => l.channelId));
    console.log('Channel IDs in returned leads:', Array.from(channelsInLeads));

    const chRes = await axios.get('http://localhost:5000/api/channels', {
      headers: { Authorization: 'Bearer ' + token }
    });
    console.log('Channels returned for staff1:', chRes.data.channels.map(c => c.name + ' (' + c.phoneNumber + ')'));
  } catch (e) {
    console.error('Error:', e.response?.data || e.message);
  }
  process.exit(0);
}
main();
