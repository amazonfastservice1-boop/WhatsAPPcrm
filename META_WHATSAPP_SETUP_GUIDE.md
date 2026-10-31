# 📱 Amazon Fast Services — Meta WhatsApp Cloud API Setup Guide
**Project:** AmazFast WhatsApp CRM  
**Date Saved:** 23 October 2026  
**Status:** Ready for Final Token Generation from Office Laptop  

---

## 📌 Account & Configuration Details

| Property | Value | Description |
| :--- | :--- | :--- |
| **Business Name** | `Amazon Fast Services` | Registered Meta Business Display Name |
| **Business Portfolio ID** | `525749246814440` | Meta Business Portfolio ID |
| **WhatsApp Business Account (WABA) ID** | `1424748082882728` | Asset ID for WhatsApp Cloud API |
| **Meta App ID** | `1794853781722577` | Developer App ID (`AmazFast CRM`) |
| **Official Phone Number** | `+92 371 0327973` | Connected WhatsApp Business Number (PK) |
| **Phone Number ID** | `1273540792517478` | Meta Cloud API Dispatch Target ID |
| **System User ID** | `61574228009938` | `Conversions API System User` |
| **Webhook Verify Token** | `amazfast_crm_secure_verify_token_2026` | Token for Webhook handshake |

---

## 🔗 Direct Quick Links (Direct Clicks)

Use these exact links in your browser when you open your office laptop:

1. **System Users & Permanent Token Generator:**  
   👉 [https://business.facebook.com/settings/system-users?business_id=525749246814440](https://business.facebook.com/settings/system-users?business_id=525749246814440)

2. **WhatsApp Phone Numbers Manager (View & Manage Number):**  
   👉 [https://business.facebook.com/wa/manage/phone-numbers/?business_id=525749246814440](https://business.facebook.com/wa/manage/phone-numbers/?business_id=525749246814440)

3. **WhatsApp API Quickstart & Production Setup:**  
   👉 [https://developers.facebook.com/apps/1794853781722577/whatsapp-business/quickstart/](https://developers.facebook.com/apps/1794853781722577/whatsapp-business/quickstart/)

4. **Webhook Configuration Page:**  
   👉 [https://developers.facebook.com/apps/1794853781722577/whatsapp-business/wa-dev-console/](https://developers.facebook.com/apps/1794853781722577/whatsapp-business/wa-dev-console/)

---

## 🚀 Kal Office Laptop Se Karne Wale Steps (Step-by-Step)

### Step 1: System User Ko Assets Assign Karein
1. Click Link #1: [Meta Business System Users](https://business.facebook.com/settings/system-users?business_id=525749246814440)
2. `Conversions API System User` par click karein.
3. Samne **`Assign assets`** ka button dabayein:
   - **Apps:** Left par `Apps` select karein ➔ Apni App par click karein ➔ `Full access / Manage app` switch ON karein.
   - **WhatsApp accounts:** Left par `WhatsApp accounts` select karein ➔ `Amazon Fast Services` par click karein ➔ `Full access / Manage WhatsApp account` switch ON karein.
4. Neeche blue button **`Save changes`** dabayein.

---

### Step 2: Permanent Access Token Generate Karein
1. Samne **`Generate token`** button dabayein.
2. Form mein select karein:
   - **App:** Apni App select karein.
   - **Token Expiration:** **`Never`** select karein (Taake token kabhi expire na ho).
   - **Permissions:** In 2 permissions par tick (check) lagayein:
     - ☑️ `whatsapp_business_messaging`
     - ☑️ `whatsapp_business_management`
3. Neeche blue button **`Generate Token`** dabayein.
4. Lamba token (jo `EAA...` se shuru hoga) copy kar lein!

---

### Step 3: Server `.env` File Mein Token Update Karein
Apne project ke `server/.env` file mein ye line update karein:
```env
META_SYSTEM_USER_ACCESS_TOKEN=YAHAN_APNA_TOKEN_PASTE_KAREIN
META_PHONE_ID_PAK=1273540792517478
META_WABA_ID=1424748082882728
META_WEBHOOK_VERIFY_TOKEN=amazfast_crm_secure_verify_token_2026
```

---

### Step 4: Webhook Setup (Inbound Messages Ke Liye)
1. Link #4 kholen: [Webhook Configuration](https://developers.facebook.com/apps/1794853781722577/whatsapp-business/wa-dev-console/)
2. Webhook URL: `https://your-domain.com/api/webhook` (ya testing ke liye ngrok URL)
3. Verify Token: `amazfast_crm_secure_verify_token_2026`
4. Webhook fields mein **`messages`** ko **Subscribe** karein.

---

## ⚡ Current CRM Status (Aaj Ka Complete Kaam)
- [x] **PostgreSQL Database:** 158 Real WhatsApp Leads aur 1,796+ Past Messages safely synced in database.
- [x] **Database Pool Bottleneck Fixed:** Contact updates batch + debounced, connection pool crash issue permanently resolved.
- [x] **Zero White Screens:** Handled all undefined states in `LiveChatView.jsx` with graceful loaders and safe optional chaining.
- [x] **Direct Outbound Messaging:** Baileys QR outbound messages verified working cleanly with auto-conversion of `03...` to international `923...`.
- [x] **Meta Cloud API Ready:** Backend routers (`webhookRoutes.js` and `messageRoutes.js`) fully coded and awaiting token.
