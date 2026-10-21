# WhatsApp Multi-Country CRM & Multi-Agent Lead Management System

A specialized, multi-channel WhatsApp CRM designed to manage inbound leads across multiple international numbers (e.g. 🇦🇪 **Dubai / UAE**, 🇸🇦 **Saudi Arabia / KSA**, 🇵🇰 **Pakistan / PK**), assign chats to regional agents, reply directly from a shared inbox, and track deals in a Kanban pipeline.

For the complete technical blueprint, database schema, and architecture, refer to:
👉 **[CRM_WHATSAPP_BLUEPRINT.md](file:///d:/Downloads/crm-whatsapp/CRM_WHATSAPP_BLUEPRINT.md)**

## Key Highlights
- **Multi-Country Channel Routing**: Separate Dubai, Saudi, and Pakistan numbers with auto-tagging and currencies (AED, SAR, PKR).
- **Channel Switcher & Unified View**: View all leads at once or filter by specific country number.
- **Regional Agent Assignment**: Auto-route Dubai leads to Dubai agents, Saudi leads to Saudi agents via Round-Robin.
- **Outbound Reply Isolation**: CRM automatically replies back through the exact number the customer originally contacted.
- **Shared WhatsApp Inbox**: Multi-agent real-time chat interface with delivery receipts and media support.
- **Kanban Sales Pipeline**: Track leads across customizable sales stages (`New`, `Contacted`, `Qualified`, `Proposal`, `Won`, `Lost`).
- **Internal Private Notes**: Invisible collaboration between agents directly inside the chat window.
- **Canned Responses**: Country-specific quick reply shortcuts (`/pricing-dubai`, `/pricing-saudi`, `/pricing-pak`).
