const API_URLS = {
  auth: 'https://functions.poehali.dev/3f1e2b7c-ac99-43bb-9e3d-0990cdf6f7ea',
  messages: 'https://functions.poehali.dev/f49f8152-b778-4c0d-8229-8861723a3124',
  moderation: 'https://functions.poehali.dev/e9774f52-69b0-4a6e-9b3b-e10905feafd3',
  sms: 'https://functions.poehali.dev/58533b13-5bd0-4ce1-825a-0eb4027d637f',
};

export type User = {
  id: number;
  username: string | null;
  phone: string | null;
  full_name: string | null;
  is_admin: boolean;
  avatar_url: string | null;
};

export type AuthResponse = {
  user: User;
  token: string;
};

export type Chat = {
  chat_id: number;
  user_id: number;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  is_online: boolean;
  last_message: string | null;
  last_message_time: string | null;
  unread_count: number;
};

export type Message = {
  id: number;
  message_text: string;
  sent_at: string;
  is_read: boolean;
  sender_id: number;
  sender_username: string;
};

export type Report = {
  id: number;
  reported_username: string;
  reported_by_username: string;
  reason: string;
  status: string;
  created_at: string;
};

export const api = {
  async sendSmsCode(phone: string): Promise<{ message: string; dev_code?: string }> {
    const response = await fetch(API_URLS.sms, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'send', phone }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to send SMS');
    }
    
    return response.json();
  },

  async verifySmsCode(phone: string, code: string): Promise<{ verified: boolean }> {
    const response = await fetch(API_URLS.sms, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'verify', phone, code }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Verification failed');
    }
    
    return response.json();
  },

  async register(phone: string, username: string, full_name: string): Promise<AuthResponse> {
    const response = await fetch(API_URLS.auth, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, username, full_name }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Registration failed');
    }
    
    return response.json();
  },

  async searchUsers(query: string): Promise<User[]> {
    const response = await fetch(`${API_URLS.auth}?q=${encodeURIComponent(query)}`);
    
    if (!response.ok) {
      throw new Error('Search failed');
    }
    
    const data = await response.json();
    return data.users;
  },

  async getChats(userId: number): Promise<Chat[]> {
    const response = await fetch(API_URLS.messages, {
      headers: { 'X-User-Id': userId.toString() },
    });
    
    if (!response.ok) {
      throw new Error('Failed to load chats');
    }
    
    const data = await response.json();
    return data.chats;
  },

  async getMessages(userId: number, chatId: number): Promise<Message[]> {
    const response = await fetch(`${API_URLS.messages}?chat_id=${chatId}`, {
      headers: { 'X-User-Id': userId.toString() },
    });
    
    if (!response.ok) {
      throw new Error('Failed to load messages');
    }
    
    const data = await response.json();
    return data.messages;
  },

  async sendMessage(userId: number, recipientId: number, messageText: string): Promise<{ message: any; chat_id: number }> {
    const response = await fetch(API_URLS.messages, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Id': userId.toString(),
      },
      body: JSON.stringify({ recipient_id: recipientId, message_text: messageText }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to send message');
    }
    
    return response.json();
  },

  async submitReport(userId: number, reportedUserId: number, reason: string): Promise<void> {
    const response = await fetch(API_URLS.moderation, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Id': userId.toString(),
      },
      body: JSON.stringify({ reported_user_id: reportedUserId, reason }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to submit report');
    }
  },

  async getReports(userId: number): Promise<Report[]> {
    const response = await fetch(API_URLS.moderation, {
      headers: { 'X-User-Id': userId.toString() },
    });
    
    if (!response.ok) {
      throw new Error('Failed to load reports');
    }
    
    const data = await response.json();
    return data.reports;
  },

  async resolveReport(userId: number, reportId: number, status: string): Promise<void> {
    const response = await fetch(API_URLS.moderation, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Id': userId.toString(),
      },
      body: JSON.stringify({ report_id: reportId, status }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to resolve report');
    }
  },
};