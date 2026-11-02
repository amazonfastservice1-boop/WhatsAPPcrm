function getApiBase() {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    return `${window.location.origin}/api`;
  }
  return 'http://localhost:5000/api';
}

export const API_BASE = getApiBase();
export const SERVER_BASE = API_BASE.replace(/\/api\/?$/, '');

// Helper for auth headers
function getHeaders() {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export const api = {
  // 1. Authentication
  async login(email = 'admin@amazfast.com', password = 'admin123456') {
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (data.token) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
      }
      return data;
    } catch (err) {
      console.warn('Backend login unavailable:', err);
      return null;
    }
  },

  // 2. Channels (Dubai, Saudi, Pak)
  async getChannels(includeInactive = false) {
    try {
      const url = `${API_BASE}/channels${includeInactive ? '?includeInactive=true' : ''}`;
      const res = await fetch(url, { headers: getHeaders() });
      if (!res.ok) throw new Error('Failed to load channels');
      return await res.json();
    } catch (err) {
      console.warn('API error fetching channels:', err);
      return null;
    }
  },

  // 2b. Meta Cloud API Configuration
  async getMetaConfig() {
    try {
      const res = await fetch(`${API_BASE}/channels/meta-config`, { headers: getHeaders() });
      if (!res.ok) throw new Error('Failed to load meta config');
      return await res.json();
    } catch (err) {
      console.warn('API error fetching meta config:', err);
      return null;
    }
  },

  async updateMetaConfig(data) {
    try {
      const res = await fetch(`${API_BASE}/channels/meta-config`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      return await res.json();
    } catch (err) {
      console.error('API error updating meta config:', err);
      return { success: false, error: err.message };
    }
  },

  // 3. Leads
  async getLeads({ channelId, stage, search } = {}) {
    try {
      const params = new URLSearchParams();
      if (channelId && channelId !== 'all') params.append('channelId', channelId);
      if (stage) params.append('stage', stage);
      if (search) params.append('search', search);

      const res = await fetch(`${API_BASE}/leads?${params.toString()}`, {
        headers: getHeaders(),
      });
      if (!res.ok) throw new Error('Failed to load leads');
      return await res.json();
    } catch (err) {
      console.warn('API error fetching leads:', err);
      return null;
    }
  },

  // 3b. Create Lead in Database
  async createLead(data) {
    try {
      const res = await fetch(`${API_BASE}/leads`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to create lead');
      return await res.json();
    } catch (err) {
      console.error('API create lead error:', err);
      return null;
    }
  },

  // 3c. Update Lead Details (Name, Deal Value, etc.)
  async updateLead(leadId, updates) {
    try {
      const res = await fetch(`${API_BASE}/leads/${leadId}`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error('Failed to update lead');
      return await res.json();
    } catch (err) {
      console.error('API update lead error:', err);
      return null;
    }
  },

  // 4. Messages History
  async getMessages(leadId) {
    try {
      const res = await fetch(`${API_BASE}/messages/lead/${leadId}`, {
        headers: getHeaders(),
      });
      if (!res.ok) throw new Error('Failed to load messages');
      return await res.json();
    } catch (err) {
      console.warn('API error fetching messages:', err);
      return null;
    }
  },

  // 5. Send Outbound WhatsApp Message (Supports Text & Media)
  async sendMessage({ leadId, phoneNumber, customerName, channelId, content, mediaType = 'TEXT', mediaUrl }) {
    try {
      const res = await fetch(`${API_BASE}/messages/send`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ leadId, phoneNumber, customerName, channelId, content, mediaType, mediaUrl }),
      });
      if (!res.ok) throw new Error('Failed to send message');
      return await res.json();
    } catch (err) {
      console.error('API send error:', err);
      return null;
    }
  },

  // 5b. Upload Attachment to Server
  async uploadMedia(base64Data, fileName) {
    try {
      const res = await fetch(`${API_BASE}/messages/upload`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ base64Data, fileName }),
      });
      if (!res.ok) throw new Error('Failed to upload media');
      return await res.json();
    } catch (err) {
      console.error('API upload error:', err);
      return null;
    }
  },

  // 5c. React to message
  async reactMessage({ leadId, messageId, emoji, phoneNumber, whatsappMsgId }) {
    try {
      const res = await fetch(`${API_BASE}/messages/react`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ leadId, messageId, emoji, phoneNumber, whatsappMsgId }),
      });
      return await res.json();
    } catch (err) {
      console.warn('API react error:', err);
      return { success: false };
    }
  },

  // 6. Update Lead Stage (Kanban Drag-and-drop)
  async updateStage(leadId, stage, dealValue) {
    try {
      const res = await fetch(`${API_BASE}/leads/${leadId}/stage`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({ stage, dealValue }),
      });
      if (!res.ok) throw new Error('Failed to update stage');
      return await res.json();
    } catch (err) {
      console.error('API update stage error:', err);
      return null;
    }
  },

  // 7. Add Internal Note
  async addNote(leadId, content) {
    try {
      const res = await fetch(`${API_BASE}/leads/${leadId}/notes`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ content }),
      });
      if (!res.ok) throw new Error('Failed to add note');
      return await res.json();
    } catch (err) {
      console.error('API note error:', err);
      return null;
    }
  },

  // 8. WhatsApp QR Engine
  async getWhatsAppStatus() {
    try {
      const res = await fetch(`${API_BASE}/whatsapp/status`);
      return await res.json();
    } catch (err) {
      return { status: 'disconnected', qr: null, user: null };
    }
  },

  async logoutWhatsApp() {
    try {
      const res = await fetch(`${API_BASE}/whatsapp/logout`, { method: 'POST' });
      return await res.json();
    } catch (err) {
      return null;
    }
  },

  async resetWhatsApp() {
    try {
      const res = await fetch(`${API_BASE}/whatsapp/reset`, { method: 'POST' });
      return await res.json();
    } catch (err) {
      return null;
    }
  },

  // 9. Staff / Team Management
  async getStaff() {
    try {
      const res = await fetch(`${API_BASE}/users`, { headers: getHeaders() });
      if (!res.ok) throw new Error('Failed to fetch staff members');
      return await res.json();
    } catch (err) {
      console.error('API error fetching staff:', err);
      return { success: false, users: [] };
    }
  },

  async createStaff(data) {
    try {
      const res = await fetch(`${API_BASE}/users`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      return await res.json();
    } catch (err) {
      console.error('API error creating staff:', err);
      return { success: false, error: err.message };
    }
  },

  async updateStaff(id, data) {
    try {
      const res = await fetch(`${API_BASE}/users/${id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      return await res.json();
    } catch (err) {
      console.error('API error updating staff:', err);
      return { success: false, error: err.message };
    }
  },

  async deleteStaff(id) {
    try {
      const res = await fetch(`${API_BASE}/users/${id}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      return await res.json();
    } catch (err) {
      console.error('API error deleting staff:', err);
      return { success: false, error: err.message };
    }
  },

  // 10. Lead Assignment
  async assignLead(leadId, assignedToId) {
    try {
      const res = await fetch(`${API_BASE}/leads/${leadId}`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({ assignedToId }),
      });
      return await res.json();
    } catch (err) {
      console.error('API error assigning lead:', err);
      return null;
    }
  },
};
