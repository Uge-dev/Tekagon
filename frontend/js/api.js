// api.js - Handles all communication with the backend

const API_URL = 'https://tekagon-backend.onrender.com';

// ── USER ──
async function registerUser(userData) {
  try {
    const res = await fetch(`${API_URL}/api/users/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });
    return await res.json();
  } catch (err) {
    console.error('Register user error:', err);
    return { success: false };
  }
}

async function getAllUsers() {
  try {
    const res = await fetch(`${API_URL}/api/users`);
    return await res.json();
  } catch (err) {
    console.error('Get users error:', err);
    return { success: false, users: [] };
  }
}

// ── TICKETS ──
async function createTicket(ticketData) {
  try {
    const res = await fetch(`${API_URL}/api/tickets/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ticketData)
    });
    return await res.json();
  } catch (err) {
    console.error('Create ticket error:', err);
    return { success: false };
  }
}

async function getUserTickets(userId) {
  try {
    const res = await fetch(`${API_URL}/api/tickets/user/${userId}`);
    return await res.json();
  } catch (err) {
    console.error('Get tickets error:', err);
    return { success: false, tickets: [] };
  }
}

async function getAllTickets() {
  try {
    const res = await fetch(`${API_URL}/api/tickets/all`);
    return await res.json();
  } catch (err) {
    console.error('Get all tickets error:', err);
    return { success: false, tickets: [] };
  }
}

async function updateTicketStatus(ticketId, status) {
  try {
    const res = await fetch(`${API_URL}/api/tickets/${ticketId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    return await res.json();
  } catch (err) {
    console.error('Update ticket error:', err);
    return { success: false };
  }
}

// ── MESSAGES ──
async function sendMessage(messageData) {
  try {
    const res = await fetch(`${API_URL}/api/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(messageData)
    });
    return await res.json();
  } catch (err) {
    console.error('Send message error:', err);
    return { success: false };
  }
}

async function getUserMessages(userId) {
  try {
    const res = await fetch(`${API_URL}/api/messages/user/${userId}`);
    return await res.json();
  } catch (err) {
    console.error('Get messages error:', err);
    return { success: false, messages: [] };
  }
}

async function getTicketMessages(ticketId) {
  try {
    const res = await fetch(`${API_URL}/api/messages/ticket/${ticketId}`);
    return await res.json();
  } catch (err) {
    console.error('Get ticket messages error:', err);
    return { success: false, messages: [] };
  }
}

async function markMessagesRead(userId) {
  try {
    const res = await fetch(`${API_URL}/api/messages/read/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' }
    });
    return await res.json();
  } catch (err) {
    console.error('Mark read error:', err);
    return { success: false };
  }
}

// ── EXPORT ──
window.TekagonAPI = {
  registerUser,
  getAllUsers,
  createTicket,
  getUserTickets,
  getAllTickets,
  updateTicketStatus,
  sendMessage,
  getUserMessages,
  getTicketMessages,
  markMessagesRead
};

console.log('✅ Tekagon API loaded');