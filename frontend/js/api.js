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
    return { success: false };
  }
}

async function getUserTickets(userId) {
  try {
    const res = await fetch(`${API_URL}/api/tickets/user/${userId}`);
    return await res.json();
  } catch (err) {
    return { success: false, tickets: [] };
  }
}

async function getAllTickets() {
  try {
    const res = await fetch(`${API_URL}/api/tickets/all`);
    return await res.json();
  } catch (err) {
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
    return { success: false };
  }
}

async function getUserMessages(userId) {
  try {
    const res = await fetch(`${API_URL}/api/messages/user/${userId}`);
    return await res.json();
  } catch (err) {
    return { success: false, messages: [] };
  }
}

async function getTicketMessages(ticketId) {
  try {
    const res = await fetch(`${API_URL}/api/messages/ticket/${ticketId}`);
    return await res.json();
  } catch (err) {
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
    return { success: false };
  }
}

// ── POLLING (replaces Socket.io) ──
let pollingInterval = null;
let lastMessageCount = 0;

function startPolling(userId, onNewMessage, ticketId = null) {
  // Clear existing polling
  if (pollingInterval) clearInterval(pollingInterval);

  pollingInterval = setInterval(async () => {
    try {
      let result;
      if (ticketId) {
        result = await getTicketMessages(ticketId);
      } else {
        result = await getUserMessages(userId);
      }

      if (result.success && result.messages) {
        const newCount = result.messages.length;
        if (newCount > lastMessageCount) {
          // New messages arrived
          const newMessages = result.messages.slice(lastMessageCount);
          newMessages.forEach(msg => {
            if (msg.sender !== 'user') {
              onNewMessage(msg);
            }
          });
          lastMessageCount = newCount;
        }
      }
    } catch (err) {
      console.error('Polling error:', err);
    }
  }, 3000); // Check every 3 seconds

  console.log('✅ Polling started for:', userId);
}

function stopPolling() {
  if (pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = null;
    console.log('⏹️ Polling stopped');
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
  markMessagesRead,
  startPolling,
  stopPolling
};

console.log('✅ Tekagon API loaded');