# 🛡️ WhatsApp CRM — Leads Backup & Restore Guide (Mukammal Tareeqa)

Aapki tamaam WhatsApp leads (**2,830+ leads, tags, status, deal values, aur messages preview**) ko mehfooz rakhne ke liye CRM mein **Automatic Backup & Failover System** لگا diya gaya hai.

---

## 📂 1. Backup Kahan Save Hota Hai?

Jab bhi CRM server chalta hai aur leads load hoti hain, server har **5 minute** baad automatically saari leads ka latest snapshot is file mein save karta rehta hai:

- **Backup File Location:**  
  `storage/backups/leads_backup_latest.json` (ya `server/storage/backups/leads_backup_latest.json`)

Is file ke andar:
- `savedAt`: Kis waqt backup save hua
- `count`: Kul kitni leads backup mein hain
- `leads`: Har customer ka naam, phone number, WhatsApp line (`channelId`), status (`stage`), tags (`Follow-up`, `Qualified`, etc.), `serviceInterest`, `dealValue`, `firstMessageAt`, aur `lastMessageAt`

---

## ⚡ 2. Automatic Recovery (Khud-ba-Khud Wapis Aana)

Agar kabhi internet ya remote database (Supabase) mein koi temporary glitch aaye:
1. Backend ([server/src/routes/leadRoutes.js](file:///d:/Downloads/crm-whatsapp/server/src/routes/leadRoutes.js)) automatically `storage/backups/leads_backup_latest.json` read kar leta hai.
2. Dashboard aur Live Chat par aapka data **bina ruke (0 downtime)** show hota rehta hai.
3. Frontend ([src/App.jsx](file:///d:/Downloads/crm-whatsapp/src/App.jsx)) mein har lead par individual `try / catch` failsafe laga hai taake kisi aik lead ke emoji ya naam ki wajah se baqi leads kabhi block na hon.

---

## 🔄 3. Backup Se Database Mein Data Wapis Lane Ka Command (Manual Restore)

Agar kabhi aapko backup file se saari leads dobara PostgreSQL database mein restore karni hon, tou terminal (PowerShell) mein sirf ye **1 command** chalayein:

```powershell
node server/src/scripts/restoreLeadsBackup.js
```

### Ye Command Kya Karegi?
1. `storage/backups/leads_backup_latest.json` file ko kholegi.
2. Har lead ko check karegi (`phoneNumber` + `channelId` ke mutabiq).
3. Agar koi lead missing hui ya uska status/tag restore karna hua tou database mein safely `upsert` (wapis save) kar degi — **koi duplicate banaye baghair**.

---

## 💾 4. Kisi Bhi Waqt Naya Manual Backup Lene Ka Command

Agar aap khud kisi bhi waqt apni leads ka naya backup snapshot banana chahein, tou ye command chalayein:

```powershell
node server/src/scripts/restoreLeadsBackup.js --backup-now
```

Is se usi waqt database se saari leads fetch ho kar `storage/backups/leads_backup_latest.json` mein save ho jayengi.
