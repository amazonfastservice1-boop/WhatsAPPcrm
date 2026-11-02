import path from 'path';
import fs from 'fs';
import http from 'http';
import { spawn } from 'child_process';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import { Server } from 'socket.io';
import webhookRoutes from './routes/webhookRoutes.js';
import channelRoutes from './routes/channelRoutes.js';
import leadRoutes from './routes/leadRoutes.js';
import authRoutes from './routes/authRoutes.js';
import messageRoutes from './routes/messageRoutes.js';
import userRoutes from './routes/userRoutes.js';
import { setupSocketEvents } from './sockets/chatSocket.js';
import { initBaileys, getBaileysStatus, logoutBaileys, resetBaileys } from './services/baileysManager.js';

// Load environment variables securely from .env
dotenv.config();

const app = express();
app.set('trust proxy', 1);
const server = http.createServer(app);

// Ensure storage and media directories exist
const MEDIA_DIR = path.resolve(process.cwd(), 'storage/media');
if (!fs.existsSync(MEDIA_DIR)) {
  fs.mkdirSync(MEDIA_DIR, { recursive: true });
}

// -----------------------------------------------------------------------------
// Security: CORS Configuration
// -----------------------------------------------------------------------------
const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS || 'http://localhost:5173,http://localhost:3000').split(',');

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

// -----------------------------------------------------------------------------
// Body Parser with Raw Body preservation for HMAC Signature Verification
// -----------------------------------------------------------------------------
app.use(
  express.json({
    limit: '25mb',
    verify: (req, res, buf) => {
      req.rawBody = buf; // Preserves unparsed buffer for X-Hub-Signature-256
    },
  })
);
app.use(express.urlencoded({ limit: '25mb', extended: true }));

// Serve WhatsApp media files statically
app.use('/media', express.static(MEDIA_DIR));

// -----------------------------------------------------------------------------
// Security: General Rate Limiting
// -----------------------------------------------------------------------------
const generalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '150', 10),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please slow down.' },
});
app.use('/api/', generalLimiter);

// -----------------------------------------------------------------------------
// Real-time Socket.io Setup
// -----------------------------------------------------------------------------
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => callback(null, true),
    credentials: true,
  },
});

// Attach socket io to request so routes can trigger real-time broadcasts
app.use((req, res, next) => {
  req.io = io;
  next();
});

setupSocketEvents(io);
// Baileys disabled to focus 100% on Meta Cloud API and keep server fast
// initBaileys(io);

// -----------------------------------------------------------------------------
// WhatsApp QR Scanner Endpoints
// -----------------------------------------------------------------------------
app.get('/api/whatsapp/status', (req, res) => {
  res.json(getBaileysStatus());
});

app.post('/api/whatsapp/logout', async (req, res) => {
  await logoutBaileys();
  res.json({ success: true, message: 'Logged out. Ready for new QR scan.' });
});

// Force clear session & generate completely fresh QR
app.post('/api/whatsapp/reset', async (req, res) => {
  try {
    await resetBaileys();
    res.json({ success: true, message: 'Session cleared. Fresh QR generating in 3 seconds...' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// -----------------------------------------------------------------------------
// API Routes
// -----------------------------------------------------------------------------
app.use('/api/webhook', webhookRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/channels', channelRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/users', userRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'WhatsApp CRM Backend Gateway',
    version: '1.0.0',
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, async () => {
  console.log(`🚀 WhatsApp CRM Backend running securely on port ${PORT}`);
  console.log(`📡 Socket.io gateway initialized`);

  // ---------------------------------------------------------------------------
  // Permanent Auto-Healing Ngrok Webhook Tunnel
  // Keeps Meta WhatsApp Webhook alive forever without manual commands
  // ---------------------------------------------------------------------------
  const NGROK_EXE = 'C:\\Users\\shabb\\AppData\\Roaming\\npm\\node_modules\\ngrok\\bin\\ngrok.exe';
  const NGROK_DOMAIN = 'stallion-panning-ether.ngrok-free.dev';

  if (fs.existsSync(NGROK_EXE)) {
    const launchNgrok = () => {
      const child = spawn(NGROK_EXE, ['http', `--url=${NGROK_DOMAIN}`, String(PORT)], {
        stdio: 'ignore',
        detached: true,
      });
      child.unref();
      return child;
    };

    const checkAndRevive = async () => {
      try {
        const axios = (await import('axios')).default;
        const res = await axios.get('http://localhost:4040/api/tunnels', { timeout: 1500 });
        const isUp = res.data?.tunnels?.some(t => t.public_url?.includes(NGROK_DOMAIN));
        if (isUp) {
          console.log(`🌐 Permanent Ngrok Tunnel is ACTIVE: https://${NGROK_DOMAIN}`);
        } else {
          console.warn('⚠️ Ngrok tunnel missing, starting automatically...');
          launchNgrok();
        }
      } catch (e) {
        console.warn('⚠️ Ngrok daemon down, reviving automatically...');
        launchNgrok();
      }
    };

    // Immediate check + launch
    await checkAndRevive();

    // 20-second watchdog to ensure it NEVER stops
    setInterval(checkAndRevive, 20000);
  }

  // ---------------------------------------------------------------------------
  // Production Anti-Sleep Keep-Alive (Prevents Render Free Tier from Sleeping)
  // ---------------------------------------------------------------------------
  const PROD_URL = process.env.RENDER_EXTERNAL_URL || 'https://whatsappcrm-9nko.onrender.com';
  const keepAlivePing = async () => {
    try {
      const axios = (await import('axios')).default;
      await axios.get(`${PROD_URL}/health`, { timeout: 10000 });
      console.log(`💓 Production Keep-Alive Ping successful to ${PROD_URL}/health`);
    } catch (err) {
      console.warn(`Keep-alive ping warning: ${err.message}`);
    }
  };

  // Ping every 8 minutes (Render sleeps after 15 mins)
  setInterval(keepAlivePing, 8 * 60 * 1000);
});
