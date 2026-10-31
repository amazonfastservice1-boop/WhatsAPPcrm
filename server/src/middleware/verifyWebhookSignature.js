import crypto from 'crypto';

/**
 * Verifies Meta WhatsApp Webhook X-Hub-Signature-256 HMAC
 * Guarantees that inbound message payloads come strictly from Meta and have not been spoofed.
 */
export function verifyMetaWebhookSignature(req, res, next) {
  // Allow bypassing in development ONLY if explicitly configured
  if (process.env.NODE_ENV === 'development' && process.env.BYPASS_WEBHOOK_VERIFY === 'true') {
    return next();
  }

  const signature = req.headers['x-hub-signature-256'];
  const appSecret = process.env.META_APP_SECRET;

  if (!signature) {
    console.warn('⚠️ Webhook rejected: Missing x-hub-signature-256 header');
    return res.status(401).json({ error: 'Missing webhook signature header' });
  }

  if (!appSecret) {
    console.error('❌ Server configuration error: META_APP_SECRET is not defined in .env');
    return res.status(500).json({ error: 'Server misconfiguration: App Secret missing' });
  }

  const parts = signature.split('=');
  const algo = parts[0];
  const hash = parts[1];

  if (algo !== 'sha256' || !hash) {
    return res.status(400).json({ error: 'Invalid signature algorithm. Expected sha256' });
  }

  try {
    // req.rawBody must be captured by express.json({ verify: ... })
    const payload = req.rawBody || JSON.stringify(req.body);
    const expectedHash = crypto
      .createHmac('sha256', appSecret)
      .update(payload)
      .digest('hex');

    const signatureBuffer = Buffer.from(hash, 'utf8');
    const expectedBuffer = Buffer.from(expectedHash, 'utf8');

    if (
      signatureBuffer.length !== expectedBuffer.length ||
      !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)
    ) {
      console.warn('⚠️ Webhook rejected: Signature mismatch');
      return res.status(403).json({ error: 'Invalid webhook signature' });
    }

    return next();
  } catch (err) {
    console.error('Error verifying webhook signature:', err);
    return res.status(500).json({ error: 'Signature verification internal failure' });
  }
}
