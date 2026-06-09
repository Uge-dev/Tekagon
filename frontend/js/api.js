const API_URL = 'https://tekagon-backend.onrender.com';

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

// ── POLLING ───────────────────────────────────────────────────────────────────
// Tracks the last known message count per context key so we only fire
// the callback for genuinely new messages.
const _pollState = {};  // key -> { timer, lastCount }

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
  _pollState[key] = { timer: null, lastCount: 0, initialized: false };

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
      const prevCount = _pollState[key].lastCount;

      if (!_pollState[key].initialized) {
        _pollState[key].lastCount = msgs.length;
        _pollState[key].initialized = true;
        return;
      }

      if (msgs.length > prevCount) {
        // Slice only the new ones
        const newMsgs = msgs.slice(prevCount);
        _pollState[key].lastCount = msgs.length;

        newMsgs.forEach(msg => {
          // KEY FIX: notify for ALL new messages the user didn't send themselves.
          // Previously this filtered out admin messages, so replies never appeared.
          if (msg.sender !== 'user') {
            onNewMessage(msg);
          }
        });
      }
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

console.log('✅ TekagonAPI loaded');
