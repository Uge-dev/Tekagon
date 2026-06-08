/**
 * Polling Service - Real-time chat & ticket updates without Socket.io
 * Works perfectly with Render free tier
 */

class PollingService {
  constructor(config = {}) {
    this.apiUrl = config.apiUrl || 'https://tekagon-backend.onrender.com';
    this.pollInterval = config.pollInterval || 3000; // 3 seconds
    this.pollIntervals = new Map();
    this.lastTimestamps = new Map();
    this.messageCallbacks = new Map();
    this.ticketCallbacks = new Map();
    this.statusCallbacks = [];
    this.isRunning = false;
    this.retryCount = 0;
    this.maxRetries = 5;
    
    console.log(' Polling Service initialized');
  }

  getInitialTimestamp() {
  return new Date(Date.now() - 5 * 60 * 1000).toISOString(); // 5 minutes ago
}

  /**
   * Start polling for user messages
   */
  startUserPolling(userId, onNewMessage) {
    if (!userId) {
      console.error('❌ User ID required for polling');
      return;
    }

    // Store callback
    this.messageCallbacks.set(userId, onNewMessage);

if (!this.lastTimestamps.has(`user_${userId}`)) {
  this.lastTimestamps.set(
    `user_${userId}`,
    this.getInitialTimestamp()
  );
}
    // Clear any existing polling for this user
    if (this.pollIntervals.has(`user_${userId}`)) {
      clearInterval(this.pollIntervals.get(`user_${userId}`));
    }

    // Start polling
    console.log(`📨 Starting user message polling for ${userId}`);
    this.pollUserMessages(userId);

    const interval = setInterval(() => this.pollUserMessages(userId), this.pollInterval);
    this.pollIntervals.set(`user_${userId}`, interval);
  }

  /**
   * Poll for user messages
   */
  async pollUserMessages(userId) {
    try {
      const lastTimestamp = this.lastTimestamps.get(`user_${userId}`) || new Date(0).toISOString();
      
      const response = await fetch(`${this.apiUrl}/api/messages/user/${userId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();

      if (data.success && data.messages && Array.isArray(data.messages)) {
        // Filter for new messages only
        const newMessages = data.messages.filter(msg => {
         const msgTime = new Date(msg.timestamp || msg.createdAt);
          const lastTime = new Date(lastTimestamp);
          return msgTime > lastTime;
        });

        if (newMessages.length > 0) {
          console.log(`📬 Found ${newMessages.length} new messages`);
          
          // Update timestamp
          this.lastTimestamps.set(
            `user_${userId}`,
            new Date(Math.max(...newMessages.map(m => new Date(m.timestamp)))).toISOString()
          );

          // Call callback for each new message
          const callback = this.messageCallbacks.get(userId);
          if (callback) {
            newMessages.forEach(msg => {
              if (msg.sender !== 'user') { // Don't notify user of their own messages
                callback(msg);
              }
            });
          }

          // Update badge
          this.updateUnreadBadge(userId, data.messages);
          this.retryCount = 0; // Reset retry on success
        }
      }
    } catch (error) {
      console.error(`⚠️ User message polling error: ${error.message}`);
      this.handlePollingError(userId, 'user');
    }
  }

  /**
   * Start polling for ticket messages
   */
  startTicketPolling(ticketId, onNewMessage) {
    if (!ticketId) {
      console.error('❌ Ticket ID required for polling');
      return;
    }

    // Store callback
    this.ticketCallbacks.set(ticketId, onNewMessage);

 if (!this.lastTimestamps.has(`ticket_${ticketId}`)) {
  this.lastTimestamps.set(
    `ticket_${ticketId}`,
    this.getInitialTimestamp()
  );
}

    // Clear any existing polling for this ticket
    if (this.pollIntervals.has(`ticket_${ticketId}`)) {
      clearInterval(this.pollIntervals.get(`ticket_${ticketId}`));
    }

    // Start polling
    console.log(`🎫 Starting ticket polling for ${ticketId}`);
    this.pollTicketMessages(ticketId);

    const interval = setInterval(() => this.pollTicketMessages(ticketId), this.pollInterval);
    this.pollIntervals.set(`ticket_${ticketId}`, interval);
  }

  /**
   * Poll for ticket messages
   */
  async pollTicketMessages(ticketId) {
    try {
      const lastTimestamp = this.lastTimestamps.get(`ticket_${ticketId}`) || new Date(0).toISOString();
      
      const response = await fetch(`${this.apiUrl}/api/messages/ticket/${ticketId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();

      if (data.success && data.messages && Array.isArray(data.messages)) {
        // Filter for new messages
        const newMessages = data.messages.filter(msg => {
          const msgTime = new Date(msg.timestamp);
          const lastTime = new Date(lastTimestamp);
          return msgTime > lastTime;
        });

        if (newMessages.length > 0) {
          console.log(`📬 Found ${newMessages.length} new ticket messages`);
          
          // Update timestamp
          this.lastTimestamps.set(
            `ticket_${ticketId}`,
            new Date(Math.max(...newMessages.map(m => new Date(m.timestamp)))).toISOString()
          );

          // Call callback
          const callback = this.ticketCallbacks.get(ticketId);
          if (callback) {
            newMessages.forEach(msg => {
              if (msg.sender !== 'user') {
                callback(msg);
              }
            });
          }

          this.retryCount = 0;
        }
      }
    } catch (error) {
      console.error(`⚠️ Ticket polling error: ${error.message}`);
      this.handlePollingError(ticketId, 'ticket');
    }
  }

  /**
   * Poll for all tickets (admin)
   */
  startTicketsPolling(onTicketUpdate) {
    if (!onTicketUpdate) {
      console.error('❌ Callback required for ticket polling');
      return;
    }

    this.ticketCallbacks.set('all_tickets', onTicketUpdate);

   if (!this.lastTimestamps.has('all_tickets')) {
  this.lastTimestamps.set(
    'all_tickets',
    this.getInitialTimestamp()
  );
}
    if (this.pollIntervals.has('all_tickets')) {
      clearInterval(this.pollIntervals.get('all_tickets'));
    }

    console.log('🎫 Starting all tickets polling (admin)');
    this.pollAllTickets();

    const interval = setInterval(() => this.pollAllTickets(), this.pollInterval);
    this.pollIntervals.set('all_tickets', interval);
  }

  /**
   * Poll all tickets
   */
  async pollAllTickets() {
    try {
      const response = await fetch(`${this.apiUrl}/api/tickets/all`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();

      if (data.success && data.tickets) {
        const callback = this.ticketCallbacks.get('all_tickets');
        if (callback) {
          callback(data.tickets);
        }
        this.retryCount = 0;
      }
    } catch (error) {
      console.error(`⚠️ All tickets polling error: ${error.message}`);
      this.handlePollingError('all_tickets', 'tickets');
    }
  }

  /**
   * Poll for unread message count
   */
  async getUnreadCount(userId) {
    try {
      const response = await fetch(`${this.apiUrl}/api/messages/user/${userId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.messages) {
          const unreadCount = data.messages.filter(msg => !msg.read && msg.sender !== 'user').length;
          return unreadCount;
        }
      }
      return 0;
    } catch (error) {
      console.error('❌ Failed to get unread count:', error);
      return 0;
    }
  }

  /**
   * Update unread badge
   */
  updateUnreadBadge(userId, messages) {
    if (!messages) return;

    const unreadCount = messages.filter(msg => !msg.read && msg.sender !== 'user').length;
    
    // Update DOM badge if it exists
    const badge = document.querySelector('[data-unread-badge]');
    if (badge) {
      badge.textContent = unreadCount;
      badge.style.display = unreadCount > 0 ? 'flex' : 'none';
    }

    // Update page title
    if (unreadCount > 0) {
      document.title = `(${unreadCount}) Messages - Tekagon`;
    } else {
      document.title = 'Tekagon Dashboard';
    }
  }

  /**
   * Stop polling for a specific resource
   */
  stopPolling(resourceId) {
    if (this.pollIntervals.has(resourceId)) {
      clearInterval(this.pollIntervals.get(resourceId));
      this.pollIntervals.delete(resourceId);
      console.log(`⏹️ Polling stopped for ${resourceId}`);
    }
  }

  /**
   * Stop all polling
   */
  stopAllPolling() {
    this.pollIntervals.forEach((interval) => clearInterval(interval));
    this.pollIntervals.clear();
    this.messageCallbacks.clear();
    this.ticketCallbacks.clear();
    this.lastTimestamps.clear();
    console.log('⏹️ All polling stopped');
  }

  /**
   * Handle polling errors with retry logic
   */
  handlePollingError(resourceId, type) {
    this.retryCount++;

    if (this.retryCount > this.maxRetries) {
      console.error(`❌ Max retries exceeded for ${resourceId}`);
      this.notifyStatus({
        type: 'error',
        message: 'Connection lost. Please refresh the page.',
        resource: resourceId
      });
      this.stopPolling(resourceId);
    } else {
      console.log(`⚠️ Retry attempt ${this.retryCount}/${this.maxRetries}`);
    }
  }

  /**
   * Notify status subscribers
   */
  onStatusChange(callback) {
    this.statusCallbacks.push(callback);
  }

  /**
   * Notify all subscribers of status change
   */
  notifyStatus(status) {
    this.statusCallbacks.forEach(callback => callback(status));
  }

  /**
   * Get current polling status
   */
  getStatus() {
    return {
      isRunning: this.pollIntervals.size > 0,
      activePolls: Array.from(this.pollIntervals.keys()),
      retryCount: this.retryCount
    };
  }

  /**
   * Test connection
   */
  async testConnection() {
    try {
      const response = await fetch(`${this.apiUrl}/api/health`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Connection test successful:', data);
        return { success: true, data };
      } else {
        console.error('❌ Connection test failed:', response.status);
        return { success: false, status: response.status };
      }
    } catch (error) {
      console.error('❌ Connection test error:', error);
      return { success: false, error: error.message };
    }
  }
}

// Export globally
window.PollingService = PollingService;

// Create global instance
if (!window.pollingService) {
  window.pollingService = new PollingService({
    apiUrl: 'https://tekagon-backend.onrender.com',
    pollInterval: 3000
  });
}

console.log('🚀 Polling Service ready');
