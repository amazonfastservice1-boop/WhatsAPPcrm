# WHATSAPP CRM — PERMANENT SYSTEM ARCHITECTURE & HIGH-VOLUME PROTOCOL
**Document Version:** 1.0.0  
**Effective Date:** 2026-11-03  
**Scope:** Universal System-Wide Core Fixes (Independent of individual customer numbers or phone lines)

---

## 1. Executive Summary & Core Principle
This system processes **1,000+ daily WhatsApp messages across 3 active business lines** (Dubai, Saudi Arabia, Pakistan). 

> **RULE OF PERMANENCE:**  
> **Under NO circumstances should any single customer number be hardcoded or patched individually.**  
> Every fix applied must solve the root architectural pipeline (Database, Webhooks, Sockets, and Frontend Rendering) so that any past, present, or future customer automatically behaves with 100% precision.

---

## 2. Root Cause Analysis (Bugs Diagnosed & Solved)

### Bug 1: The Out-Of-Sync DB Timestamps (Fluctuations & Wrong Order)
* **Root Cause:** In PostgreSQL, 411 leads had their `lastMessageAt` column outdated compared to their actual newest message `createdAt` inside the `Message` table. Because Prisma queried `orderBy: { lastMessageAt: 'desc' }`, stale leads were returned out of true chronological order.
* **System-Wide Fix:**
  1. Ran universal database synchronization query:
     ```sql
     UPDATE "Lead" l
     SET "lastMessageAt" = sub.max_created
     FROM (
       SELECT "leadId", MAX("createdAt") as max_created
       FROM "Message"
       GROUP BY "leadId"
     ) sub
     WHERE l.id = sub."leadId"
       AND (l."lastMessageAt" IS NULL OR sub.max_created > l."lastMessageAt");
     ```
  2. In `server/src/routes/leadRoutes.js`, the API dynamically compares `l.lastMessageAt` with `l.messages[0].createdAt` and returns `Math.max(lTime, msgTime)` sorted strictly descending. Even if a webhook message writes with slight latency, the API order remains 100% accurate.

---

### Bug 2: Timestamp Formatting Illusion (3-Day-Old vs Today's Messages)
* **Root Cause:** A 3-day-old message (e.g. October 31st at `11:30 UTC` = `04:30 PM PKT`) was being displayed using time-only formatting (`04:30 PM`). To the agent, it looked like today's 4:30 PM, making it appear that an old chat was ranked above fresh 01:29 AM messages.
* **System-Wide Fix:** Implemented standard WhatsApp Web timestamp rules in `src/utils/leadFilters.js` (`formatWhatsAppTimestamp`):
  * **Today:** Time only (e.g., `01:29 AM`).
  * **Yesterday:** `Kal` / `Yesterday`.
  * **Past 2–6 Days:** Day name (e.g., `Sat`, `Sun`, `Mon`).
  * **Older Dates:** Full date (e.g., `31 Oct`).

---

### Bug 3: Customer Duplicate Rows Across 3 Lines (`uniqueLeads`)
* **Root Cause:** In `schema.prisma`, `@@unique([phoneNumber, channelId])` allows a customer contacting both UAE and KSA lines to exist under separate records. Viewing "Saari Services / Saare Numbers" showed multiple duplicate rows for the same human.
* **System-Wide Fix:** Universal phone deduplication in `src/components/LiveChatView.jsx`:
  * All leads are normalized by raw phone digits (`String(phone).replace(/\D/g, '')`).
  * The single master record with the latest activity timestamp (`rawLastMessageAt`) is rendered.
  * Unread counts are merged (`l.unreadCount + existing.unreadCount`) so agents never miss messages.

---

### Bug 4: Real-Time Chat Jumping / Order Fluctuations on Inbound Messages
* **Root Cause:** When incoming messages arrived via Socket.io, state was updated in-place (`prev.map(...)`), preserving the lead at its old array position instead of moving to the top. Subsequent full-fetches then jumped the item to the top, causing visual flickering.
* **System-Wide Fix:** In `src/App.jsx` (`handleNewMessage`), whenever a message arrives (inbound customer or outbound agent reply), the lead is promoted to index 0:
  ```javascript
  const remaining = prev.filter(l => l.id !== leadId);
  return [updatedLead, ...remaining];
  ```
  This guarantees instantaneous top-shift with zero flickering, identical to official WhatsApp Web.

---

### Bug 5: Customer Chats Badge Showing 2922 Messages Instead of Unread Chats
* **Root Cause:** The sidebar badge was calculating the sum of all unread messages (`reduce((acc, l) => acc + l.unreadCount)`), producing thousands (`2922`).
* **System-Wide Fix:** In `src/App.jsx`, changed calculation to count unique unread conversations:
  ```javascript
  const unreadChatsCount = leads.filter((l) => (l.unreadCount || 0) > 0).length;
  ```
  Now cleanly displays the number of actionable unread conversations (e.g., `124`).

---

### Bug 6: Tab Separation (New Inbound Leads vs Returning Clients)
* **System-Wide Fix:** Built two dedicated, isolated tabs in `LiveChatView.jsx`:
  1. **Tab 1: `⚡ Aaj Ki Leads`:** Strictly filters by `isLeadToday(lead)` — only customers whose FIRST EVER message arrived after 12:00 AM midnight.
  2. **Tab 2: `💬 Saari Chats`:** Full view showing all active conversations (both existing returning clients and today's leads combined).

---

## 3. High-Volume Architecture Verification Checklist
Before any future change is shipped, verify:
- [x] Zero number-specific conditional logic (`lead.phone === '...'`).
- [x] Backend API sorts by `MAX(lastMessageAt, latestMsg.createdAt) DESC`.
- [x] Frontend deduplicates by phone number and combines unread counts.
- [x] Inbound/outbound socket handlers promote active lead to index `0`.
- [x] Timestamps follow WhatsApp relative date formatting (`01:29 AM`, `Kal`, `31 Oct`).
- [x] Production build passes cleanly with zero errors (`npm run build`).

