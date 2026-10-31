# 🛡️ Security Architecture & Threat Mitigation Guide (SECURITY.md)
### AmazFast Multi-Country & Multi-Number WhatsApp CRM

This document defines the comprehensive security policies, threat vectors, mitigations, secrets management practices, and environment configuration standards for the Multi-Country WhatsApp CRM system.

---

## 📑 Table of Contents
1. [Core Security Principles](#1-core-security-principles)
2. [Environment Variables & Secrets Security (.env)](#2-environment-variables--secrets-security-env)
3. [Meta Cloud API & Webhook Verification](#3-meta-cloud-api--webhook-verification)
4. [Regional Multi-Tenant Data Isolation (UAE, KSA, PK)](#4-regional-multi-tenant-data-isolation-uae-ksa-pk)
5. [Role-Based Access Control (RBAC)](#5-role-based-access-control-rbac)
6. [Outbound Message Routing & Anti-Hijack Guard](#6-outbound-message-routing--anti-hijack-guard)
7. [Baileys / QR Code Multi-Session Encryption](#7-baileys--qr-code-multi-session-encryption)
8. [Internal Notes & PII Data Protection](#8-internal-notes--pii-data-protection)
9. [Rate Limiting, Anti-Spam & Ingestion Protection](#9-rate-limiting-anti-spam--ingestion-protection)
10. [Incident Response & Security Checklist](#10-incident-response--security-checklist)

---

## 1. Core Security Principles

- **Zero-Trust Boundaries**: Never trust client-side requests. Every operation (read, reply, note, stage change) must validate user session, role, and regional channel permissions on the backend.
- **Strict Separation of Concerns**: Public browser bundles must never contain database strings, Meta secrets, or encryption keys.
- **Defense in Depth**: Authenticate at the network perimeter (CORS, Rate Limiting), gateway (Webhook signature), application (JWT, RBAC), and database (Prisma foreign key constraints & scopes).

---

## 2. Environment Variables & Secrets Security (.env)

### 2.1. Client-Side vs. Server-Side Separation

```
┌──────────────────────────────────────┐       ┌──────────────────────────────────────┐
│  Client Bundle (Vite / React)        │       │  Server Backend (Node / Express)     │
│  - ONLY 'VITE_' prefixed variables   │       │  - Full process.env access           │
│  - INSECURE by design (visible to all│       │  - SECURE (never sent to browser)    │
│  - Examples:                         │       │  - Examples:                         │
│    ✓ VITE_API_URL                    │       │    🔒 DATABASE_URL                   │
│    ✓ VITE_APP_NAME                   │       │    🔒 META_APP_SECRET                │
│    ✗ NEVER VITE_META_TOKEN           │       │    🔒 META_SYSTEM_USER_ACCESS_TOKEN  │
│    ✗ NEVER VITE_DB_PASSWORD          │       │    🔒 JWT_SECRET                     │
└──────────────────────────────────────┘       └──────────────────────────────────────┘
```

> [!CAUTION]
> Any variable prefixed with `VITE_` is baked directly into the static JavaScript files served to users' browsers. Anyone can open DevTools and inspect them. Never prefix private secrets with `VITE_`.

### 2.2. Rules for `.env` File Management

1. **Git Exclusions**: Ensure `.gitignore` explicitly prevents `.env` and `.env.*` from being committed. Only `.env.example` (containing dummy values) is tracked in version control.
2. **Secret Generation**: Never use predictable strings like `"secret123"`. Generate high-entropy keys using cryptographic utilities:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
3. **Production Deployment**: Inject production secrets via environment variables in the container runtime (Docker, Kubernetes, AWS Secrets Manager, Doppler, or Railway/Vercel Environment Settings) rather than copying `.env` files onto servers.
4. **Automated Secret Scanning**: Pre-commit hooks (`gitleaks`, `trufflehog`) should scan all commits to prevent accidental credential leaks.

---

## 3. Meta Cloud API & Webhook Verification

### 3.1. Webhook Signature Validation (`X-Hub-Signature-256`)

Meta sends every inbound WhatsApp message payload with an HTTP header:
`X-Hub-Signature-256: sha256=<HMAC_HEX>`

The CRM backend **MUST** verify this signature using HMAC-SHA256 with the `META_APP_SECRET` against the raw, unparsed request buffer before processing:

```javascript
// Server-side Webhook verification middleware
import crypto from 'crypto';

export function verifyMetaWebhookSignature(req, res, next) {
  const signature = req.headers['x-hub-signature-256'];
  if (!signature) {
    return res.status(401).json({ error: 'Missing webhook signature header' });
  }

  const [algo, hash] = signature.split('=');
  if (algo !== 'sha256') {
    return res.status(400).json({ error: 'Unsupported signature algorithm' });
  }

  // req.rawBody must be preserved before JSON.parse()
  const expectedHash = crypto
    .createHmac('sha256', process.env.META_APP_SECRET)
    .update(req.rawBody)
    .digest('hex');

  if (!crypto.timingSafeEqual(Buffer.from(hash, 'utf8'), Buffer.from(expectedHash, 'utf8'))) {
    return res.status(403).json({ error: 'Invalid webhook signature' });
  }

  return next();
}
```

### 3.2. Verification Token for Webhook Setup (`GET /api/webhook`)

During the Meta App webhook handshake:
```javascript
app.get('/api/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.META_WEBHOOK_VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
});
```

### 3.3. Token Privilege Scope & Rotation
- Use a **System User Permanent Access Token** created inside Meta Business Manager, restricted exclusively to:
  - `whatsapp_business_messaging`
  - `whatsapp_business_management`
- Do not use temporary Graph API explorer tokens in production (they expire in 24 hours).
- Rotate system user tokens bi-annually or immediately upon personnel departure.

---

## 4. Regional Multi-Tenant Data Isolation (UAE, KSA, PK)

The CRM manages multiple phone channels:
- 🇦🇪 Dubai Channel (`+971 50 ...`, Channel ID: `chan_uae`)
- 🇸🇦 Saudi Channel (`+966 50 ...`, Channel ID: `chan_ksa`)
- 🇵🇰 Pakistan Channel (`+92 300 ...`, Channel ID: `chan_pk`)

### 4.1. Horizontal Privilege Escalation Protection

An agent assigned only to the Pakistan branch must **never** be able to view, query, or reply to Dubai or Saudi leads.

```javascript
// Enforcement Middleware on all Lead/Chat endpoints
export async function requireChannelAccess(req, res, next) {
  const user = req.user; // Authenticated via JWT
  const targetChannelId = req.params.channelId || req.body.channelId || req.query.channelId;

  // Super Admins have global access
  if (user.role === 'ADMIN') return next();

  // Query UserChannelAccess mapping
  const hasAccess = await prisma.userChannelAccess.findUnique({
    where: {
      userId_channelId: {
        userId: user.id,
        channelId: targetChannelId,
      },
    },
  });

  if (!hasAccess) {
    return res.status(403).json({ 
      error: 'Access denied: You are not authorized to view or manage this regional channel.' 
    });
  }

  return next();
}
```

### 4.2. Database Query Isolation

Every database query fetching leads or messages must explicitly filter by the user's permitted channel IDs:
```typescript
const permittedChannels = await getPermittedChannelIds(req.user.id);

const leads = await prisma.lead.findMany({
  where: {
    channelId: { in: permittedChannels },
    ...(req.query.stage ? { stage: req.query.stage } : {})
  }
});
```

---

## 5. Role-Based Access Control (RBAC)

| Capability | Admin | Regional Manager | Sales Agent |
| :--- | :---: | :---: | :---: |
| View All Regional Channels (UAE + KSA + PK) | ✅ | ❌ (Own region only) | ❌ (Assigned channel only) |
| Reply to WhatsApp Customer | ✅ | ✅ | ✅ (If assigned / permitted) |
| Create & View Internal Private Notes | ✅ | ✅ | ✅ |
| Reassign Lead to Another Agent | ✅ | ✅ (Within region) | ❌ |
| Export Customer Contact List (CSV / Excel) | ✅ | ❌ | ❌ |
| Manage System API Keys & Webhooks | ✅ | ❌ | ❌ |
| Delete Leads or Chat History | ✅ | ❌ | ❌ |

---

## 6. Outbound Message Routing & Anti-Hijack Guard

### The Threat
If an agent working on a Saudi lead inadvertently clicks send and the system routes the message via the Dubai WhatsApp Phone ID, customer trust is broken, and regional compliance is violated.

### The Mitigation (Locked Routing Dispatcher)
The backend message dispatcher must query the target lead's `channelId` and strictly lookup the associated Phone Number ID from the database/environment:

```javascript
export async function dispatchOutboundWhatsAppMessage(leadId, messageText, agentUser) {
  // 1. Fetch lead and verify channel
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: { channel: true },
  });

  if (!lead) throw new Error('Lead not found');

  // 2. Resolve originating channel's official Phone ID
  const phoneId = lead.channel.phoneIdMeta;
  if (!phoneId) throw new Error('Channel does not have a configured Meta Phone ID');

  // 3. Dispatch strictly through the originating channel
  const response = await axios.post(
    `https://graph.facebook.com/${process.env.META_API_VERSION}/${phoneId}/messages`,
    {
      messaging_product: 'whatsapp',
      to: lead.phoneNumber,
      type: 'text',
      text: { body: messageText },
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.META_SYSTEM_USER_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
    }
  );

  return response.data;
}
```

---

## 7. Baileys / QR Code Multi-Session Encryption

If using Baileys multi-device socket sessions instead of Meta Cloud API:

1. **At-Rest Storage Encryption**: Session credentials (`creds.json`, `app-state-sync-keys`) must not be stored in plaintext. Encrypt session files on disk using **AES-256-GCM** with `SESSION_ENCRYPTION_KEY`.
2. **Directory Permissions**: Keep session storage directories (`storage/secure_sessions/`) strictly outside the public web root (`chmod 700`).
3. **Session Revocation**: When an agent or admin deletes a channel in settings, the system must trigger `sock.logout()` and securely purge the encryption keys and files immediately.

---

## 8. Internal Notes & PII Data Protection

### 8.1. Internal Notes Secrecy
Internal team notes allow agents to collaborate (e.g. discussing pricing discount limits or customer temperament).
- **Rule**: Internal notes (`model InternalNote`) must NEVER be forwarded to Meta's WhatsApp API.
- **WebSocket Broadcast**: When a note is created, Socket.io broadcasts it only to the internal CRM room (`room:team_channel_${channelId}`), never to any public customer socket.

### 8.2. PII Protection (Personally Identifiable Information)
- **Phone Number Masking**: In the UI, agents can be restricted from seeing full customer numbers (e.g., `+971 50 *** 4589`) to prevent agent database scraping.
- **Media Expiration**: Inbound media documents (customer passports, trade licenses, payment receipts) stored on AWS S3 must use **Pre-Signed Expiring URLs** (max 15 minutes TTL) rather than public readable buckets.

---

## 9. Rate Limiting, Anti-Spam & Ingestion Protection

1. **Inbound Webhook Queue (BullMQ / Redis)**:
   - High volume campaigns (e.g. 5,000 inbound leads/hour) can overwhelm Node.js.
   - Webhook endpoint immediately returns HTTP 200 after signature validation and pushes the payload to a Redis BullMQ queue for async worker processing.
2. **Outbound Rate Limiting**:
   - Meta imposes messaging tiers (Tier 1: 1,000 conversations/24h, Tier 2: 10,000, etc.).
   - CRM implements an outbound token bucket limiter to prevent accidental broadcast spamming that could cause number suspension.
3. **DDoS & Brute Force Protection**:
   - `express-rate-limit` on `/api/auth/login` (max 5 failed attempts per IP per 15 minutes).
   - Account lockout after 5 consecutive failed passwords.

---

## 10. Incident Response & Security Checklist

### Pre-Deployment Security Checklist
- [ ] `.gitignore` contains `.env`, `.env.*`, `sessions/`, and key files.
- [ ] `git status` verifies no `.env` or credential files are staged.
- [ ] All client variables start with `VITE_` and contain **zero** private credentials.
- [ ] Meta `X-Hub-Signature-256` webhook verification is enabled and tested.
- [ ] Database credentials use SSL connection (`sslmode=require` in production).
- [ ] User role authorization middleware protects every API route.
- [ ] S3 bucket access policy is private with pre-signed URLs.

### Security Contact & Reporting
If you identify any security vulnerability within this CRM platform:
1. Contact the security lead immediately at: `security@amazfast.com`
2. Do not disclose vulnerabilities publicly or open public GitHub issues.
3. Include reproduction steps, environment details, and affected endpoints.
