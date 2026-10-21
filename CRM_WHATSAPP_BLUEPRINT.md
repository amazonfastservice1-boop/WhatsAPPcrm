# 🚀 WhatsApp CRM Architecture & System Blueprint
### Multi-Country, Multi-Number & Multi-Agent Lead Management System

Ek complete, scalable, aur multi-agent WhatsApp CRM ka mukammal technical aur functional roadmap — including **Multi-Country (Dubai, Saudi Arabia, Pakistan)** WhatsApp routing.

---

## 📌 1. Project Overview & Maqsad
Is system ka maqsad ek centralized **Multi-Number WhatsApp CRM** software banana hai jahan:
1. **Multi-Country Numbers Support**: Alag alag countries ke WhatsApp numbers (jaise 🇦🇪 **Dubai**, 🇸🇦 **Saudi Arabia**, 🇵🇰 **Pakistan**) ek hi unified CRM ke sath connect hon.
2. **Channel-Based Lead Ingestion**: Pata chale ke customer kis number par aaya hai aur us hisaab se auto-tag aur currency set ho (AED, SAR, PKR).
3. **Shared Multi-Agent Team Inbox**: Multiple team members / sales agents ek sath login karke simultaneous chat aur reply kar sakein.
4. **Regional Team Lead Assignment**: Dubai ki leads Dubai team ko, Saudi ki leads Saudi team ko, aur Pakistan ki leads Pakistan team ko auto-assign hon.
5. **Sales Pipeline (Kanban Board)**: Drag-and-drop pipeline ke zariye lead stages track hon (New, In Progress, Qualified, Proposal Sent, Won, Lost).
6. **Internal Notes & Security**: Agents ke private internal notes aur role-based access control.

---

## 🌍 2. Multi-Number WhatsApp Architecture (Dubai, Saudi, Pak)

```
┌────────────────────────┐  ┌────────────────────────┐  ┌────────────────────────┐
│  🇦🇪 Dubai WhatsApp     │  │  🇸🇦 Saudi WhatsApp     │  │  🇵🇰 Pakistan WhatsApp  │
│  (+971 50 XXXXXXX)     │  │  (+966 50 XXXXXXX)     │  │  (+92 300 XXXXXXX)     │
└───────────┬────────────┘  └───────────┬────────────┘  └───────────┬────────────┘
            │                           │                           │
            │ (Webhook or QR Socket)    │ (Webhook or QR Socket)    │ (Webhook or QR Socket)
            ▼                           ▼                           ▼
┌────────────────────────────────────────────────────────────────────────────────┐
│                        Unified CRM Gateway Router                              │
│         - Identifies Target Channel (UAE / KSA / PK)                           │
│         - Parses Inbound Phone Number & Message Payload                        │
└───────────────────────────────────────┬────────────────────────────────────────┘
                                        │
           ┌────────────────────────────┼────────────────────────────┐
           ▼                            ▼                            ▼
  [Dubai Lead Created]        [Saudi Lead Created]         [Pak Lead Created]
   • Channel: 🇦🇪 UAE           • Channel: 🇸🇦 KSA            • Channel: 🇵🇰 PK
   • Currency: AED              • Currency: SAR              • Currency: PKR
   • Timezone: GST (UTC+4)      • Timezone: AST (UTC+3)      • Timezone: PKT (UTC+5)
   • Tag: "Dubai-Branch"        • Tag: "Saudi-Branch"        • Tag: "PK-Branch"
   • Auto-assigned to:          • Auto-assigned to:          • Auto-assigned to:
     🇦🇪 Dubai Sales Team          🇸🇦 Saudi Sales Team          🇵🇰 Pakistan Sales Team
           │                            │                            │
           └────────────────────────────┼────────────────────────────┘
                                        ▼
                      ┌────────────────────────────────────┐
                      │ Real-Time Broadcast via WebSockets │
                      │  - Live Multi-Agent Dashboard      │
                      │  - Filter by Country / All Channels│
                      └─────────────────┬──────────────────┘
                                        │
                                        ▼
                      ┌────────────────────────────────────┐
                      │      Outbound Reply Router         │
                      │  (Reply automatically sends back   │
                      │  via the same originating number!) │
                      └────────────────────────────────────┘
```

---

## ⚙️ 3. How Multi-Number Routing Works in Practice

### 3.1. Unified Inbox with Channel Switcher
Agent ke CRM UI par top bar mein Channel Switcher hoga:
- 🌐 **All Inboxes (Consolidated)**: Saari leads ek view mein (Admin / Managers ke liye).
- 🇦🇪 **Dubai Channel (+971...)**: Sirf Dubai number ki leads aur chats.
- 🇸🇦 **Saudi Channel (+966...)**: Sirf Saudi number ki leads aur chats.
- 🇵🇰 **Pakistan Channel (+92...)**: Sirf Pakistan number ki leads aur chats.

Har lead aur message bubble ke sath country flag badge (🇦🇪 / 🇸🇦 / 🇵🇰) visible hoga taake koi confusion na ho.

### 3.2. Regional Team Permissions & Isolation
- **Role Assignment**:
  - `Dubai Agent`: Sirf Dubai number ki chats dekh aur reply kar sakega.
  - `Saudi Agent`: Sirf Saudi leads handle karega.
  - `Pakistan Agent`: Sirf local Pakistan leads par kaam karega.
  - `Manager / Super Admin`: Teeno channels ko monitor kar sakta hai, re-assign kar sakta hai, aur global reports dekh sakta hai.

### 3.3. Outbound Message Separation (No Mix-ups)
- Jab koi agent reply bhejta hai, CRM backend lead ka `channelId` check karta hai aur usi specific WhatsApp account (Dubai / Saudi / Pak) se message dispatch karta hai.
- Customer ko hamesha usi number se reply milta hai jis number par usne contact kiya tha.

### 3.4. Country-Specific Welcome Messages & Bot Triggers
- **Dubai Number Welcome**: *"Welcome to [Company] UAE! Our Dubai representative will assist you shortly. (Currency: AED)"*
- **Saudi Number Welcome**: *"أهلاً بك في [Company] السعودية! سيقوم ممثلنا بالرد عليك قريباً. (Currency: SAR)"*
- **Pakistan Number Welcome**: *"Assalam o Alaikum! [Company] Pakistan mein khushamdeed. Hamara agent jald apse rabta karega. (Currency: PKR)"*

---

## 🔌 4. Multi-Number Connection Methods

### Option A: Official Meta WhatsApp Cloud API (Recommended)
- Ek hi Meta Business Manager account mein teeno numbers add ho jate hain:
  - Phone ID 1: Dubai (+971...)
  - Phone ID 2: Saudi (+966...)
  - Phone ID 3: Pakistan (+92...)
- Meta ka webhook JSON payload har message ke sath `metadata.phone_number_id` provide karta hai, jisse hamara backend instant identify kar leta hai ke message kis country se aaya hai.
- **Faiday**: 100% Ban-proof, official green tick support, high delivery speed, unlimited agents.

### Option B: Multi-Session QR Code Scanner (Baileys / Web.js)
- CRM ke Settings page par **3 alag WhatsApp Channels** create honge.
- Har channel ka apna alag **QR Code** screen par aayega:
  - QR Code 1 ➔ Dubai ka phone scan karega (Session: `session_dubai`).
  - QR Code 2 ➔ Saudi ka phone scan karega (Session: `session_saudi`).
  - QR Code 3 ➔ Pakistan ka phone scan karega (Session: `session_pak`).
- Server par teeno sessions parallel run hote hain without conflicts.
- **Faiday**: Free of cost, koi Meta approval nahi chahiye.

---

## 🧩 5. Core CRM Modules

### 5.1. Shared Multi-Agent Inbox (Live Chat)
- 3-Column WhatsApp Web layout:
  - **Column 1**: Chats list with Search, Unread filter, Channel filter (UAE/KSA/PK), Tag filters.
  - **Column 2**: Active conversation with real-time delivery status (✓ Sent, ✓✓ Delivered, 👁️ Read). Supports Text, Images, PDF documents, Audio voice notes.
  - **Column 3**: Lead Profile Sidebar (Name, Phone, Channel, Stage, Assigned Agent, Currency, Notes, Custom Fields).

### 5.2. Lead Assignment Engine
- **Manual Assignment**: Dropdown se kisi bhi available agent ko assign karein.
- **Auto-Assign (Round-Robin by Region)**:
  - Dubai leads divide hongi Dubai online agents mein.
  - Saudi leads divide hongi Saudi online agents mein.
  - Pakistan leads divide hongi Pakistan online agents mein.

### 5.3. Kanban Sales Pipeline
Drag-and-drop board with customized stages:
1. 📥 **New Lead**: Uncontacted inbound message.
2. 💬 **Contacted**: First reply given.
3. 🎯 **Qualified / Interested**: Requirement gathered.
4. 📝 **Proposal / Quote Sent**: Quotation delivered.
5. 🏆 **Deal Won**: Successful conversion.
6. ❌ **Lost / Inactive**: No response or disqualified.

### 5.4. Internal Team Notes & Activity History
- Chat view ke andar private notes (yellow highlight) jo customer ko nahi jaate. Team internally strategy discuss kar sakti hai.

### 5.5. Canned Responses & Quick Replies
- `/pricing-dubai` ➔ AED pricing table auto-fill.
- `/pricing-saudi` ➔ SAR pricing table auto-fill.
- `/pricing-pak` ➔ PKR pricing table auto-fill.
- `/bank-uae`, `/bank-pk`, `/timings`, `/catalog`.

---

## 💾 6. Database Schema (PostgreSQL / Prisma ORM)

```prisma
// WhatsApp Channel / Phone Number Model
model WhatsAppChannel {
  id              String      @id @default(uuid())
  name            String      // e.g. "Dubai Sales", "Saudi Support", "Pakistan Main"
  countryCode     String      // "AE", "SA", "PK"
  countryName     String      // "United Arab Emirates", "Saudi Arabia", "Pakistan"
  phoneNumber     String      @unique // "+971501234567"
  currency        String      @default("USD") // "AED", "SAR", "PKR"
  timezone        String      @default("UTC")
  provider        ChannelType @default(META_API) // META_API or QR_BAILEYS
  phoneIdMeta     String?     // Meta Phone Number ID
  sessionKey      String?     // QR session identifier
  isActive        Boolean     @default(true)
  welcomeMessage  String?
  leads           Lead[]
  assignedAgents  UserChannelAccess[]
  messages        Message[]
  createdAt       DateTime    @default(now())
}

enum ChannelType {
  META_API
  QR_BAILEYS
}

// User / Agent Model
model User {
  id              String              @id @default(uuid())
  name            String
  email           String              @unique
  passwordHash    String
  role            Role                @default(AGENT) // ADMIN, MANAGER, AGENT
  isOnline        Boolean             @default(false)
  allowedChannels UserChannelAccess[] // Regional channel permissions
  assignedLeads   Lead[]
  messagesSent    Message[]
  notes           InternalNote[]
  createdAt       DateTime            @default(now())
}

enum Role {
  ADMIN
  MANAGER
  AGENT
}

// Agent to Channel Access Mapping
model UserChannelAccess {
  userId    String
  channelId String
  user      User            @relation(fields: [userId], references: [id])
  channel   WhatsAppChannel @relation(fields: [channelId], references: [id])

  @@id([userId, channelId])
}

// Lead / Contact Model
model Lead {
  id              String          @id @default(uuid())
  phoneNumber     String          // Customer's phone e.g. "+97155..."
  fullName        String?
  avatarUrl       String?
  channelId       String          // Linked to Dubai, Saudi, or Pak number
  channel         WhatsAppChannel @relation(fields: [channelId], references: [id])
  stage           LeadStage       @default(NEW_LEAD)
  dealValue       Float?          // Deal amount in channel's currency
  assignedToId    String?
  assignedTo      User?           @relation(fields: [assignedToId], references: [id])
  tags            TagOnLead[]
  notes           InternalNote[]
  messages        Message[]
  lastMessageAt   DateTime        @default(now())
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt

  @@unique([phoneNumber, channelId]) // Same customer can talk to different branches separately
}

enum LeadStage {
  NEW_LEAD
  CONTACTED
  QUALIFIED
  PROPOSAL_SENT
  WON
  LOST
}

// Message Model
model Message {
  id             String          @id @default(uuid())
  leadId         String
  lead           Lead            @relation(fields: [leadId], references: [id])
  channelId      String
  channel        WhatsAppChannel @relation(fields: [channelId], references: [id])
  senderType     SenderType      // CUSTOMER, AGENT, SYSTEM
  senderUserId   String?
  senderUser     User?           @relation(fields: [senderUserId], references: [id])
  content        String
  mediaType      MediaType       @default(TEXT) // TEXT, IMAGE, DOCUMENT, AUDIO, VIDEO
  mediaUrl       String?
  status         MessageStatus   @default(SENT) // SENT, DELIVERED, READ, FAILED
  whatsappMsgId  String?         @unique
  createdAt      DateTime        @default(now())
}

enum SenderType {
  CUSTOMER
  AGENT
  SYSTEM
}

enum MediaType {
  TEXT
  IMAGE
  DOCUMENT
  AUDIO
  VIDEO
}

enum MessageStatus {
  SENT
  DELIVERED
  READ
  FAILED
}

// Internal Team Note
model InternalNote {
  id        String   @id @default(uuid())
  leadId    String
  lead      Lead     @relation(fields: [leadId], references: [id])
  authorId  String
  author    User     @relation(fields: [authorId], references: [id])
  content   String
  createdAt DateTime @default(now())
}

// Tags Model
model Tag {
  id    String      @id @default(uuid())
  name  String      @unique
  color String      @default("#3B82F6")
  leads TagOnLead[]
}

model TagOnLead {
  leadId String
  tagId  String
  lead   Lead   @relation(fields: [leadId], references: [id])
  tag    Tag    @relation(fields: [tagId], references: [id])

  @@id([leadId, tagId])
}
```

---

## 🛠️ 7. Recommended Technical Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Frontend UI** | **Next.js 14 (App Router) + React** | Fast, reactive, SSR-ready CRM portal |
| **Styling** | **Tailwind CSS + Lucide Icons** | WhatsApp-style clean dark/light mode interface |
| **State & Realtime** | **Socket.io Client** | Instant multi-channel live chats without page refresh |
| **Backend & APIs** | **Node.js (Next.js Server Actions / API Routes)** | Webhook receivers, message router, assignment logic |
| **Database** | **PostgreSQL (Supabase / Local) + Prisma ORM** | Reliable relational storage for channels, leads, chats |
| **WhatsApp Engines** | **Meta Cloud API** or **Baileys (Multi-Session)** | Gateway to WhatsApp network |
| **File Storage** | **AWS S3 or Cloudinary** | Storing incoming/outgoing images, PDFs, voice notes |

---

## 📅 8. Step-by-Step Implementation Roadmap

```
Phase 1: Project Setup & Multi-Channel Design System
  ├─ Initialize Next.js 14 + Tailwind CSS + Lucide Icons
  ├─ Setup PostgreSQL & Prisma with WhatsAppChannel, Lead, User, Message schemas
  └─ Implement Channel Switcher UI (🇦🇪 Dubai | 🇸🇦 Saudi | 🇵🇰 Pakistan | 🌐 All)

Phase 2: Multi-Agent Shared Inbox (Live UI)
  ├─ 3-Panel Chat Interface (Conversations, Chat Window, Lead Details Drawer)
  ├─ Country flag badges, delivery ticks, media preview
  └─ Real-time message mockup engine for instant testing

Phase 3: Lead Management & Regional Assignment
  ├─ Regional Round-Robin auto assignment (UAE team gets UAE leads, etc.)
  ├─ Drag-and-drop Kanban Pipeline with multi-currency values
  ├─ Internal private notes & tagging system
  └─ Quick replies library (/pricing, /bank, /timings)

Phase 4: WhatsApp Multi-Number Connector
  ├─ Multi-number Meta Cloud API Webhook handler
  ├─ Multi-session Baileys QR Code engine (if using QR scanner)
  └─ Outbound reply dispatcher matching lead's channel

Phase 5: Analytics, SLA & Production Deployment
  ├─ Regional performance reports (Dubai vs Saudi vs PK conversion rates)
  ├─ Agent first-response time (FRT) & leaderboards
  └─ Production Docker / VPS deployment setup
```

---

## 🚀 Ready for Implementation
Aap is file ko standard reference ke taur par use kar sakte hain. Agla step yeh hai ke hum **Phase 1 & Phase 2: Complete Multi-Number CRM Dashboard & Live Chat UI** build karna shuru karein.
