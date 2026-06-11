const API_URL = window.TEKAGON_PUBLIC_CONFIG?.API_URL || window.TEKAGON_API_URL || '';

// ── USERS ─────────────────────────────────────────────────────────────────────
async function registerUser(userData) {
  try {
    const res = await fetch(`${API_URL}/api/users/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });
    return await res.json();
  } catch (err) {
    console.error('registerUser error:', err);
    return { success: false };
  }
}

async function signupWithEmail(userData) {
  try {
    const res = await fetch(`${API_URL}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });
    return await res.json();
  } catch (err) {
    console.error('signupWithEmail error:', err);
    return { success: false, error: 'Network error. Please try again.' };
  }
}

async function signinWithEmail(credentials) {
  try {
    const res = await fetch(`${API_URL}/api/auth/signin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials)
    });
    return await res.json();
  } catch (err) {
    console.error('signinWithEmail error:', err);
    return { success: false, error: 'Network error. Please try again.' };
  }
}

async function adminLogin(credentials) {
  try {
    const res = await fetch(`${API_URL}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials)
    });
    return await res.json();
  } catch (err) {
    console.error('adminLogin error:', err);
    return { success: false, error: 'Network error. Please try again.' };
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

// ── TICKETS ───────────────────────────────────────────────────────────────────
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

// ── MESSAGES ──────────────────────────────────────────────────────────────────
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

// Returns ALL messages for a user (general + all tickets).
// Filter by ticketId on the frontend when needed.
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

// ── CONTACT ───────────────────────────────────────────────────────────────────
async function sendContactMessage(contactData) {
  try {
    const res = await fetch(`${API_URL}/api/contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(contactData)
    });
    const result = await res.json().catch(() => ({}));
    return {
      success: res.ok && result.success,
      error: result.error || (!res.ok ? 'Failed to send message. Please try again.' : '')
    };
  } catch (err) {
    console.error('sendContactMessage error:', err);
    return { success: false, error: 'Network error. Please try again.' };
  }
}

// ── POLLING ───────────────────────────────────────────────────────────────────
// Tracks seen message IDs per context key so local optimistic messages
// and MongoDB messages do not fight each other during polling.
const _pollState = {};  // key -> { timer, seen, initialized }

function getMessageIdentity(msg) {
  return msg.clientId || msg.id || msg._id || [
    msg.sender,
    msg.userId || '',
    msg.ticketId || '',
    msg.content,
    msg.timestamp
  ].join('|');
}

/**
 * Start polling for new messages.
 *
 * @param {string}   userId        - The current user's ID
 * @param {function} onNewMessage  - Called with each new message object
 * @param {string|null} ticketId   - If set, only fires for messages on this ticket
 */
function startPolling(userId, onNewMessage, ticketId = null) {
  stopPolling();   // clear any previous poll

  const key = ticketId ? `ticket_${ticketId}` : `user_${userId}`;
  _pollState[key] = { timer: null, seen: new Set(), initialized: false };

  async function poll() {
    try {
      let result;
      if (ticketId) {
        result = await getTicketMessages(ticketId);
      } else {
        result = await getUserMessages(userId);
      }

      if (!result.success || !Array.isArray(result.messages)) return;

      const msgs = result.messages;

      if (!_pollState[key].initialized) {
        msgs.forEach(msg => _pollState[key].seen.add(getMessageIdentity(msg)));
        _pollState[key].initialized = true;
        return;
      }

      const newMsgs = msgs.filter(msg => {
        const identity = getMessageIdentity(msg);
        if (_pollState[key].seen.has(identity)) return false;
        _pollState[key].seen.add(identity);
        return true;
      });

      newMsgs.forEach(msg => {
        if (msg.sender !== 'user') {
          onNewMessage(msg);
        }
      });
    } catch (err) {
      console.error('Polling error:', err);
    }
  }

  // Run immediately, then on interval
  poll();
  _pollState[key].timer = setInterval(poll, 1000);
  console.log(`✅ Polling started — userId: ${userId}${ticketId ? ` ticketId: ${ticketId}` : ''}`);
}

function stopPolling() {
  Object.values(_pollState).forEach(s => {
    if (s.timer) clearInterval(s.timer);
  });
  // Clear state
  Object.keys(_pollState).forEach(k => delete _pollState[k]);
}

// ── EXPORT ────────────────────────────────────────────────────────────────────
window.TekagonAPI = {
  registerUser,
  signupWithEmail,
  signinWithEmail,
  adminLogin,
  getAllUsers,
  createTicket,
  getUserTickets,
  getAllTickets,
  updateTicketStatus,
  sendMessage,
  getUserMessages,
  getTicketMessages,
  markMessagesRead,
  sendContactMessage,
  startPolling,
  stopPolling
};

console.log('✅ TekagonAPI loaded');
