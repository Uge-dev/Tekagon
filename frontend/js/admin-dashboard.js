// Admin Dashboard - Chat Management System
const TICKET_CHAT_KEY = 'tekagon_ticket_chats';
class AdminChatDashboard {
constructor() {
  this.currentPage = 'dashboard';
  this.selectedUser = null;
  this.selectedTicket = null;
  this.conversations = {};
  this.ticketChats = {};
  this.registeredUsers = {}; // ← add this line
  this.allTicketsList = [];  // ← add this line too
  this.managedContent = {
    socialCards: [],
    event: { published: false, speakers: [] }
  };
  this.adminSettings = {
    chat: {
      autoResponseDelay: 5,
      enableAutoResponses: true,
      welcomeMessage: 'Hello! Welcome to Tekagon Support. How can I help you today?'
    },
    notifications: {
      emailNotifications: true,
      desktopNotifications: false,
      sound: 'default'
    },
    security: { sessionTimeout: 30 },
    data: { autoDeleteDays: 90, exportFormat: 'json' }
  };
  this.stats = {
    totalUsers: 0,
    activeToday: 0,
    unreadMessages: 0,
    totalMessages: 0
  };
  this.init();
  this.debugStorage();
}

  // Add this method to your AdminChatDashboard class
  debugStorage() {
    console.log('=== LOCALSTORAGE DEBUG ===');
    console.log('tekagon_chat_conversations:', localStorage.getItem('tekagon_chat_conversations'));
    console.log('tekagon_chat_users:', localStorage.getItem('tekagon_chat_users'));
    console.log('tekagon_tickets:', localStorage.getItem('tekagon_tickets'));
    console.log('tekagon_all_tickets:', localStorage.getItem('tekagon_all_tickets'));
    console.log('tekagon_ticket_chats:', localStorage.getItem('tekagon_ticket_chats'));

    // List all localStorage keys
    console.log('All localStorage keys:');
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      console.log(`${key}:`, localStorage.getItem(key));
    }
  }

  normalizeMessage(msg) {
    if (!msg) return msg;
    return {
      ...msg,
      id: msg.clientId || msg.id || msg._id || [
        msg.sender,
        msg.userId || '',
        msg.ticketId || '',
        msg.content,
        msg.timestamp
      ].join('|'),
      content: msg.content || msg.message || '',
      timestamp: msg.timestamp || new Date().toISOString()
    };
  }

  getMessageKey(msg) {
    const normalized = this.normalizeMessage(msg);
    return normalized.clientId || normalized.id || normalized._id || [
      normalized.sender,
      normalized.userId || '',
      normalized.ticketId || '',
      normalized.content,
      normalized.timestamp
    ].join('|');
  }

  mergeMessages(...messageLists) {
    const merged = new Map();

    messageLists.flat().filter(Boolean).forEach(message => {
      const normalized = this.normalizeMessage(message);
      const key = this.getMessageKey(normalized);
      merged.set(key, { ...(merged.get(key) || {}), ...normalized });
    });

    return Array.from(merged.values()).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  }

  getUserDisplayName(userId, fallbackUser = {}) {
    const userInfo = this.registeredUsers[userId] || fallbackUser || {};
    const candidate =
      userInfo.name ||
      userInfo.fullName ||
      localStorage.getItem(`${userId}_name`) ||
      userInfo.email ||
      localStorage.getItem(`${userId}_email`) ||
      '';

    if (candidate && candidate !== 'User' && candidate.includes('@')) {
      return candidate.split('@')[0].replace(/[._-]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    }

    return candidate && candidate !== 'User' ? candidate : 'User';
  }

  setConversationMessages(userId, messages) {
    this.conversations[userId] = this.mergeMessages(this.conversations[userId] || [], messages);
    localStorage.setItem('tekagon_chat_conversations', JSON.stringify(this.conversations));

    const ticketChats = JSON.parse(localStorage.getItem(TICKET_CHAT_KEY) || '{}');
    this.conversations[userId].filter(msg => msg.ticketId).forEach(msg => {
      ticketChats[msg.ticketId] = this.mergeMessages(ticketChats[msg.ticketId] || [], msg);
    });
    localStorage.setItem(TICKET_CHAT_KEY, JSON.stringify(ticketChats));

    return this.conversations[userId];
  }

  renderOpenConversationMessages(userId, ticketId = null) {
    if (this.selectedUser !== userId) return;

    const messagesDiv = document.getElementById('conversationMessages');
    if (!messagesDiv) return;

    const userInfo = this.registeredUsers[userId] || {};
    const userName = this.getUserDisplayName(userId, userInfo);
    let messages = [];

    if (ticketId) {
      const ticketChats = JSON.parse(localStorage.getItem(TICKET_CHAT_KEY) || '{}');
      messages = ticketChats[ticketId] || [];
    } else {
      messages = (this.conversations[userId] || []).filter(message => !message.ticketId);
    }

    messagesDiv.innerHTML = messages.map(msg => this.renderAdminChatMessage(msg, userName)).join('');
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  }


  // Add these methods to your AdminChatDashboard class if not already present

  getFormFieldIcon(fieldName) {
    const iconMap = {
      'fullName': 'user',
      'email': 'envelope',
      'phone': 'phone',
      'businessName': 'building',
      'company': 'building',
      'website': 'globe',
      'budget': 'dollar-sign',
      'package': 'box',
      'services': 'list',
      'message': 'comment',
      'description': 'file-alt',
      'deadline': 'calendar',
      'timeline': 'clock',
      'requirements': 'clipboard-list',
      'preferences': 'star',
      'questions': 'question-circle'
    };

    return iconMap[fieldName] || 'info-circle';
  }

  formatFormFieldName(key) {
    // Convert camelCase or snake_case to readable format
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/_/g, ' ')
      .replace(/^\w/, c => c.toUpperCase())
      .replace(/\b\w/g, l => l.toUpperCase())
      .trim();
  }

  getStatusIcon(status) {
    const icons = {
      'pending': 'clock',
      'in-progress': 'spinner',
      'completed': 'check-circle',
      'cancelled': 'times-circle'
    };
    return icons[status] || 'question-circle';
  }
 init() {
  this.checkAuth();
  this.loadData().then(() => {
    this.renderDashboard();
    this.setupEventListeners();
    this.startAutoRefresh();
    this.initAdminSocket();
  });
  this.debugStorage();
}

initAdminSocket() {
  // Poll for new messages every 3 seconds
  setInterval(async () => {
    if (!window.TekagonAPI) return;

    try {
      // Check all users for new messages
      for (const userId of Object.keys(this.registeredUsers)) {
        const result = await window.TekagonAPI.getUserMessages(userId);
        if (result.success) {
          const previousKeys = new Set((this.conversations[userId] || []).map(msg => this.getMessageKey(msg)));
          const mergedMessages = this.setConversationMessages(userId, result.messages);
          const newMessages = mergedMessages.filter(msg => !previousKeys.has(this.getMessageKey(msg)));

          if (newMessages.length > 0) {
            newMessages.forEach(msg => {
              if (msg.sender !== 'admin') {
                console.log('📨 New message from user:', msg);
                this.showNotification(`New message from user`, 'info');
                if (this.adminSettings.notifications.desktopNotifications && window.Notification?.permission === 'granted') {
                  new Notification('New Tekagon message', {
                    body: `${this.getUserDisplayName(userId)}: ${String(msg.content || '').slice(0, 120)}`
                  });
                }
                this.playNotificationSound();
                this.calculateStats();
                this.updateBadge();

                this.renderOpenConversationMessages(userId, this.selectedTicket);
              }
            });
          }
        }
      }
    } catch (err) {
      console.error('Admin polling error:', err);
    }
  }, 1000);

  console.log('✅ Admin polling started');
}

  async refreshTickets() {
    await this.loadTickets();
    this.updateBadge();
    this.loadPage('tickets');
  }

  filterTickets() {
    const filterStatus = document.getElementById('filterStatus')?.value || '';
    const query = document.getElementById('searchTickets')?.value.trim().toLowerCase() || '';
    const rows = document.querySelectorAll('.ticket-row');
    let visibleCount = 0;

    rows.forEach(row => {
      const matchesStatus = !filterStatus || row.dataset.status === filterStatus;
      const matchesQuery = !query || (row.dataset.search || row.textContent || '').toLowerCase().includes(query);
      const visible = matchesStatus && matchesQuery;
      row.style.display = visible ? '' : 'none';
      if (visible) visibleCount++;
    });
    const summary = document.getElementById('ticketSearchSummary');
    if (summary) summary.textContent = `${visibleCount} ticket${visibleCount === 1 ? '' : 's'}`;
  }

  checkAuth() {
    const isAdmin = localStorage.getItem('adminLoggedIn') === 'true';
    const hasToken = Boolean(sessionStorage.getItem('tekagonAdminToken'));
    if (!isAdmin || !hasToken) {
      localStorage.removeItem('adminLoggedIn');
      this.showLogin();
      return false;
    }
    return true;
  }


  showLogin() {
    document.body.innerHTML = `
      <div class="admin-login">
        <div class="login-card">
          <div class="login-header">
            <h1><i class="fas fa-shield-alt"></i> Admin Login</h1>
            <p>Enter your credentials to access the admin dashboard</p>
          </div>
          
          <form id="loginForm">
            <div class="form-group">
              <label>Username</label>
              <input type="text" id="username" placeholder="admin" required>
            </div>

            
            <div class="form-group">
              <label>Password</label>
              <input type="password" id="password" placeholder="Enter password" required>
            </div>
            
            <button type="submit" class="btn-login">
              <i class="fas fa-sign-in-alt"></i> Login
            </button>
          </form>
          
          <div class="login-footer">
            <p>Use the admin credentials configured on the backend.</p>
          </div>
        </div>
      </div>
    `;

    document.getElementById('loginForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = document.getElementById('username').value;
      const password = document.getElementById('password').value;

      if (!window.TekagonAPI || typeof window.TekagonAPI.adminLogin !== 'function') {
        alert('Admin login service is unavailable');
        return;
      }

      const result = await window.TekagonAPI.adminLogin({ username, password });
      if (result.success) {
        localStorage.setItem('adminLoggedIn', 'true');
        location.reload();
      } else {
        alert(result.error || 'Invalid credentials');
      }
    });

    this.addAdminStyles();
  }

 async loadData() {
  try {
    // Try MongoDB first
    if (window.TekagonAPI) {
      console.log('📊 Loading data from MongoDB...');

      const conversationResult = await window.TekagonAPI.getAdminConversations?.();
      if (conversationResult?.success) {
        this.registeredUsers = conversationResult.users || {};
        const freshConversations = {};
        Object.entries(conversationResult.conversations || {}).forEach(([userId, messages]) => {
          freshConversations[userId] = this.mergeMessages(messages);
        });
        this.conversations = freshConversations;
      } else {
        const usersResult = await window.TekagonAPI.getAllUsers();
        if (usersResult.success) {
          this.registeredUsers = {};
          usersResult.users.forEach(u => {
            this.registeredUsers[u.userId] = u;
          });
          console.log('✅ Users loaded:', usersResult.users.length);
        }
      }

      // Load tickets
      const ticketsResult = await window.TekagonAPI.getAllTickets();
      if (ticketsResult.success) {
        this.allTicketsList = ticketsResult.tickets;
        console.log('✅ Tickets loaded:', ticketsResult.tickets.length);
      }

      const contentResult = await window.TekagonAPI.getDashboardContent();
      if (contentResult.success && contentResult.content) {
        this.managedContent = contentResult.content;
      }

      const settingsResult = await window.TekagonAPI.getAdminSettings?.();
      if (settingsResult?.success && settingsResult.settings) {
        this.adminSettings = {
          ...this.adminSettings,
          ...settingsResult.settings,
          chat: { ...this.adminSettings.chat, ...(settingsResult.settings.chat || {}) },
          notifications: { ...this.adminSettings.notifications, ...(settingsResult.settings.notifications || {}) },
          security: { ...this.adminSettings.security, ...(settingsResult.settings.security || {}) },
          data: { ...this.adminSettings.data, ...(settingsResult.settings.data || {}) }
        };
      }

      if (!conversationResult?.success) {
        for (const userId of Object.keys(this.registeredUsers)) {
          const msgResult = await window.TekagonAPI.getUserMessages(userId);
          if (msgResult.success) {
            this.conversations[userId] = this.mergeMessages(this.conversations[userId] || [], msgResult.messages);
          }
        }
      }

      console.log('✅ All data loaded from MongoDB');
    }

    // Fallback to localStorage
    else {
      console.warn('⚠️ TekagonAPI not available, using localStorage');
      const conversationsData = localStorage.getItem('tekagon_chat_conversations');
      this.conversations = conversationsData ? JSON.parse(conversationsData) : {};
      const ticketChatsData = localStorage.getItem('tekagon_ticket_chats');
      this.ticketChats = ticketChatsData ? JSON.parse(ticketChatsData) : {};
      const usersData = localStorage.getItem('tekagon_chat_users');
      this.registeredUsers = usersData ? JSON.parse(usersData) : {};
    }

    this.calculateStats();

  } catch (e) {
    console.error('Failed to load admin data:', e);
    this.conversations = {};
    this.ticketChats = {};
    this.registeredUsers = {};
  }
}

  calculateStats() {
    const userIds = Object.keys(this.registeredUsers);
    const today = new Date().toISOString().split('T')[0];

    let totalMessages = 0;
    let unreadMessages = 0;
    let activeToday = 0;

    userIds.forEach(userId => {
      const messages = this.conversations[userId] || [];
      totalMessages += messages.length;

      // Count unread messages
      const unread = messages.filter(msg => !msg.read && msg.sender === 'user').length;
      unreadMessages += unread;

      const lastActive = this.registeredUsers[userId]?.lastActive;
      if (lastActive && new Date(lastActive).toISOString().startsWith(today)) {
        activeToday++;
      }
    });

    this.stats = {
      totalUsers: userIds.length,
      activeToday: activeToday,
      unreadMessages: unreadMessages,
      totalMessages: totalMessages
    };
  }

  // Add this method to get user registration info
  getUserRegistrationInfo(userId) {
    try {
      const users = JSON.parse(localStorage.getItem('tekagon_chat_users') || '{}');
      const userInfo = users[userId];

      if (userInfo) {
        return {
          name: this.getUserDisplayName(userId, userInfo),
          phone: userInfo.phone || 'Not provided',
          email: userInfo.email || 'Not provided',
          company: userInfo.company || 'Not provided',
          registeredAt: userInfo.registeredAt
        };
      }
    } catch (e) {
      console.error('Error getting user info:', e);
    }

    return null;
  }

  async loadTickets() {
  try {
    if (window.TekagonAPI) {
      const result = await window.TekagonAPI.getAllTickets();
      if (result.success) {
        this.allTicketsList = result.tickets;
        console.log('✅ Tickets loaded from MongoDB:', result.tickets.length);
        return;
      }
    }

    // Fallback to localStorage
    const allTickets = localStorage.getItem('tekagon_all_tickets');
    this.allTicketsList = allTickets ? JSON.parse(allTickets) : [];

  } catch (e) {
    console.error('Failed to load tickets:', e);
    this.allTicketsList = [];
  }
}


  renderDashboard() {
    if (!this.checkAuth()) return;

    document.body.innerHTML = `
      <div class="admin-container">
        <!-- Header -->
        <header class="admin-header">
          <div class="header-left">
            <h1><i class="fas fa-shield-alt"></i> Tekagon Admin Dashboard</h1>
            <p>Manage user conversations and system settings</p>
          </div>
          <div class="header-right">
            <button id="logoutBtn" class="btn-logout">
              <i class="fas fa-sign-out-alt"></i> Logout
            </button>
          </div>
        </header>
        
        <!-- Navigation -->
        <nav class="admin-nav">
          <button class="nav-btn active" data-page="dashboard">
            <i class="fas fa-tachometer-alt"></i> Dashboard
          </button>
          <button class="nav-btn" data-page="chats">
            <i class="fas fa-comments"></i> Chats
            <span class="badge" id="unreadBadge">${this.stats.unreadMessages}</span>
          </button>
          <button class="nav-btn" data-page="users">
            <i class="fas fa-users"></i> Users
          </button>
          <button class="nav-btn" data-page="tickets">
            <i class="fas fa-ticket-alt"></i> Tickets
            <span class="badge" id="ticketBadge">${this.getPendingTicketsCount()}</span>
          </button>
          <button class="nav-btn" data-page="email">
            <i class="fas fa-envelope"></i> Email
          </button>
          <button class="nav-btn" data-page="social-content">
            <i class="fas fa-images"></i> Social Cards
          </button>
          <button class="nav-btn" data-page="events-content">
            <i class="fas fa-calendar-alt"></i> Events
          </button>
          <button class="nav-btn" data-page="settings">
            <i class="fas fa-cog"></i> Settings
          </button>
        </nav>
        
        <!-- Main Content -->
        <main class="admin-main" id="adminMain">
          <!-- Content will be loaded here -->
        </main>
      </div>
    `;



    const requestedPage = new URLSearchParams(location.hash.replace(/^#/, '')).get('page');
    const allowedPages = ['dashboard', 'chats', 'users', 'tickets', 'email', 'social-content', 'events-content', 'settings'];
    this.loadPage(allowedPages.includes(requestedPage) ? requestedPage : 'dashboard', false);
    this.addAdminStyles();
    this.addContentManagerStyles();
  }


  getPendingTicketsCount() {
    try {
      return this.allTicketsList ? this.allTicketsList.filter(t => t.status === 'pending').length : 0;
    } catch (e) {
      console.error('Error counting pending tickets:', e);
      return 0;
    }
  }

  loadPage(page, updateHistory = true) {
    this.currentPage = page;
    if (updateHistory) {
      const nextHash = `#page=${encodeURIComponent(page)}`;
      if (location.hash !== nextHash) history.replaceState(null, '', nextHash);
    }

    // Update active nav button
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.page === page);
    });

    const mainContent = document.getElementById('adminMain');

    switch (page) {
      case 'dashboard':
        mainContent.innerHTML = this.renderDashboardPage();
        break;
      case 'chats':
        mainContent.innerHTML = this.renderChatsPage();
        break;
      case 'users':
        mainContent.innerHTML = this.renderUsersPage();
        break;
      case 'email':
        mainContent.innerHTML = this.renderEmailPage();
        break;
      case 'tickets':
        mainContent.innerHTML = this.renderTicketsPage();
        break;
      case 'social-content':
        mainContent.innerHTML = this.renderSocialContentPage();
        break;
      case 'events-content':
        mainContent.innerHTML = this.renderEventsContentPage();
        break;
      case 'settings':
        mainContent.innerHTML = this.renderSettingsPage();
        break;
    }
    this.bindImageUploadInputs();
    this.bindContentEditorActions();
    this.bindAdminPageActions();
  }

  bindAdminPageActions() {
    const filterItems = (inputId, itemSelector, buttonId = '') => {
      const input = document.getElementById(inputId);
      if (!input) return;
      const applyFilter = () => {
        const query = input.value.trim().toLowerCase();
        document.querySelectorAll(itemSelector).forEach(item => {
          item.style.display = (item.textContent || '').toLowerCase().includes(query) ? '' : 'none';
        });
      };
      input.addEventListener('input', applyFilter);
      input.addEventListener('keydown', event => {
        if (event.key === 'Enter') applyFilter();
      });
      document.getElementById(buttonId)?.addEventListener('click', applyFilter);
    };
    filterItems('searchChats', '.conversation-item');
    filterItems('searchUsers', '.users-table tbody tr', 'searchUsersBtn');
    document.getElementById('searchTicketsBtn')?.addEventListener('click', () => this.filterTickets());
    document.getElementById('searchTickets')?.addEventListener('input', () => this.filterTickets());
    document.getElementById('searchTickets')?.addEventListener('keydown', event => {
      if (event.key === 'Enter') this.filterTickets();
    });
  }

  renderDashboardPage() {
    return `
      <div class="dashboard-page">
        <!-- Stats Cards -->
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-icon users">
              <i class="fas fa-users"></i>
            </div>
            <div class="stat-content">
              <h3>${this.stats.totalUsers}</h3>
              <p>Total Users</p>
            </div>
          </div>
          
          <div class="stat-card">
            <div class="stat-icon active">
              <i class="fas fa-user-check"></i>
            </div>
            <div class="stat-content">
              <h3>${this.stats.activeToday}</h3>
              <p>Active Today</p>
            </div>
          </div>
          
          <div class="stat-card">
            <div class="stat-icon messages">
              <i class="fas fa-comments"></i>
            </div>
            <div class="stat-content">
              <h3>${this.stats.unreadMessages}</h3>
              <p>Unread Messages</p>
            </div>
          </div>
          
          <div class="stat-card">
            <div class="stat-icon total">
              <i class="fas fa-database"></i>
            </div>
            <div class="stat-content">
              <h3>${this.stats.totalMessages}</h3>
              <p>Total Messages</p>
            </div>
          </div>
        </div>
        
        <!-- Recent Chats -->
        <div class="section-card">
          <div class="section-header">
            <h2><i class="fas fa-clock"></i> Recent Conversations</h2>
            <button class="btn-refresh" onclick="adminDashboard.loadData(); adminDashboard.loadPage('dashboard');">
              <i class="fas fa-sync-alt"></i> Refresh
            </button>
          </div>
          
          <div class="recent-chats">
            ${this.getRecentConversations().map(conv => `
              <div class="chat-item ${conv.unread ? 'unread' : ''}" onclick="adminDashboard.selectUser('${conv.userId}')">
                <div class="chat-item-header">
                  <div class="user-info">
                    <div class="user-avatar">
                      <i class="fas fa-user"></i>
                    </div>
                    <div>
                      <div class="user-name">${conv.userName}</div>
                      <div class="user-id">${conv.userId.substring(0, 12)}...</div>
                    </div>
                  </div>
                  <div class="chat-time">${conv.lastMessageTime}</div>
                </div>
                <div class="chat-preview">${conv.lastMessage}</div>
                ${conv.unread ? `<div class="unread-badge">${conv.unreadCount} new</div>` : ''}
              </div>
            `).join('')}
            
            ${this.getRecentConversations().length === 0 ? `
              <div class="empty-state">
                <i class="fas fa-comments" style="font-size: 3rem; opacity: 0.3;"></i>
                <h3>No Conversations Yet</h3>
                <p>When users start chatting, their conversations will appear here.</p>
              </div>
            ` : ''}
          </div>
        </div>
        
        <!-- Quick Actions -->
        <div class="section-card">
          <div class="section-header">
            <h2><i class="fas fa-bolt"></i> Quick Actions</h2>
          </div>
          
          <div class="quick-actions">
            <button class="quick-action-btn" onclick="adminDashboard.broadcastMessage()">
              <i class="fas fa-bullhorn"></i>
              <span>Broadcast Message</span>
            </button>
            
            <button class="quick-action-btn" onclick="adminDashboard.exportAllChats()">
              <i class="fas fa-download"></i>
              <span>Export All Chats</span>
            </button>
            
            <button class="quick-action-btn" onclick="adminDashboard.clearOldChats()">
              <i class="fas fa-trash"></i>
              <span>Clear Old Chats</span>
            </button>
            
            <button class="quick-action-btn" onclick="adminDashboard.sendTestEmail()">
              <i class="fas fa-envelope"></i>
              <span>Send Test Email</span>
            </button>
          </div>
        </div>
      </div>
    `;
  }

  renderChatsPage() {
    const userIds = Object.keys(this.conversations);

    return `
      <div class="chats-page">
        <div class="section-card">
          <div class="section-header">
            <h2><i class="fas fa-comments"></i> All Conversations</h2>
            <div class="header-actions">
              <input type="text" id="searchChats" placeholder="Search conversations..." class="search-input">
              <button class="btn-primary" onclick="adminDashboard.loadPage('users')">
                <i class="fas fa-user"></i> Select User
              </button>
            </div>
          </div>
          
          <div class="conversations-list">
            ${userIds.map(userId => {
      const messages = this.conversations[userId] || [];
      const lastMessage = messages[messages.length - 1];
      const userName = this.getUserDisplayName(userId);
      const unreadCount = messages.filter(msg => !msg.read && msg.sender === 'user').length;

      return `
                <div class="conversation-item ${unreadCount > 0 ? 'unread' : ''}" onclick="adminDashboard.openConversation('${userId}')">
                  <div class="conversation-header">
                    <div class="user-avatar">
                      <i class="fas fa-user"></i>
                    </div>
                    <div class="user-details">
                      <div class="user-name">${userName}</div>
                      <div class="user-id">${userId.substring(0, 15)}...</div>
                    </div>
                    <div class="conversation-stats">
                      <span class="message-count">${messages.length} messages</span>
                      <span class="unread-count">${unreadCount} unread</span>
                    </div>
                  </div>
                  
                  ${lastMessage ? `
                    <div class="last-message">
                      <div class="message-content">${lastMessage.content.length > 100 ? lastMessage.content.substring(0, 100) + '...' : lastMessage.content}</div>
                      <div class="message-time">${new Date(lastMessage.timestamp).toLocaleString()}</div>
                    </div>
                  ` : ''}
                  
                  <div class="conversation-actions">
                    <button class="action-btn" onclick="event.stopPropagation(); adminDashboard.markAsRead('${userId}')">
                      <i class="fas fa-check-double"></i> Mark Read
                    </button>
                    <button class="action-btn" onclick="event.stopPropagation(); adminDashboard.exportConversation('${userId}')">
                      <i class="fas fa-download"></i> Export
                    </button>
                    <button class="action-btn delete" onclick="event.stopPropagation(); adminDashboard.deleteConversation('${userId}')">
                      <i class="fas fa-trash"></i> Delete
                    </button>
                  </div>
                </div>
              `;
    }).join('')}
            
            ${userIds.length === 0 ? `
              <div class="empty-state">
                <i class="fas fa-comment-slash" style="font-size: 3rem; opacity: 0.3;"></i>
                <h3>No Conversations</h3>
                <p>When users start chatting, their conversations will appear here.</p>
              </div>
            ` : ''}
          </div>
        </div>
      </div>
    `;
  }


  renderUsersPage() {
    const userIds = Object.keys(this.registeredUsers);

    return `
      <div class="users-page">
        <div class="section-card">
          <div class="section-header">
            <h2><i class="fas fa-users"></i> Registered Users</h2>
            <div class="header-actions admin-search-control">
              <input type="search" id="searchUsers" placeholder="Search by name, email, or user ID" class="search-input">
              <button type="button" class="btn-primary search-action" id="searchUsersBtn" title="Search users">
                <i class="fas fa-search"></i><span>Search</span>
              </button>
            </div>
          </div>
          
          <table class="users-table">
            <thead>
              <tr>
                <th>User ID</th>
                <th>Name</th>
                <th>Messages</th>
                <th>Last Active</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${userIds.map(userId => {
      const messages = this.conversations[userId] || [];
      const userInfo = this.registeredUsers[userId] || {};
      const userName = this.getUserDisplayName(userId, userInfo);
      const lastActive = userInfo.lastActive || userInfo.registeredAt;
      const isActive = lastActive && Date.now() - new Date(lastActive).getTime() < 2 * 60 * 1000;

      return `
                  <tr data-user-id="${this.escapeHtml(userId)}">
                    <td><code title="${this.escapeHtml(userId)}">${this.escapeHtml(userId.substring(0, 16))}${userId.length > 16 ? '...' : ''}</code></td>
                    <td><strong>${this.escapeHtml(userName)}</strong><br><small>${this.escapeHtml(userInfo.email || '')}</small></td>
                    <td>${messages.length}</td>
                    <td>${lastActive ? new Date(lastActive).toLocaleString() : 'Never'}</td>
                    <td>
                      <span class="status-badge ${isActive ? 'active' : 'inactive'}">
                        ${isActive ? 'Active now' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <button class="table-btn" onclick="adminDashboard.openConversation('${userId}')">
                        <i class="fas fa-comment"></i>
                      </button>
                      <button class="table-btn" onclick="adminDashboard.sendEmailToUser('${userId}')">
                        <i class="fas fa-envelope"></i>
                      </button>
                      <button class="table-btn delete" onclick="adminDashboard.deleteUser('${userId}')">
                        <i class="fas fa-trash"></i>
                      </button>
                    </td>
                  </tr>
                `;
    }).join('')}
              
              ${userIds.length === 0 ? `
                <tr>
                  <td colspan="6" class="empty-table">
                    <i class="fas fa-users" style="font-size: 2rem; opacity: 0.3;"></i>
                    <h4>No Users Found</h4>
                    <p>When users start chatting, they will appear here.</p>
                  </td>
                </tr>
              ` : ''}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  renderEmailPage() {
    const userIds = Object.keys(this.conversations);

    return `
      <div class="email-page">
        <div class="email-composer">
          <div class="section-header">
            <h2><i class="fas fa-envelope"></i> Send Email to Users</h2>
          </div>
          
          <form id="emailForm" onsubmit="event.preventDefault(); adminDashboard.sendEmail();">
            <div class="form-group">
              <label>Recipients</label>
              <select id="emailRecipients" multiple style="height: 100px;">
                <option value="all">All Users (${userIds.length})</option>
                ${userIds.map(userId => {
      const userName = this.getUserDisplayName(userId);
      return `<option value="${userId}">${userName} (${userId.substring(0, 10)}...)</option>`;
    }).join('')}
              </select>
            </div>
            
            <div class="form-group">
              <label>Subject</label>
              <input type="text" id="emailSubject" placeholder="Important Update from Tekagon" required>
            </div>
            
            <div class="form-group">
              <label>Message</label>
              <textarea id="emailMessage" rows="6" placeholder="Type your email message here..." required></textarea>
            </div>
            
            <div class="form-actions">
              <button type="button" class="btn-secondary" onclick="adminDashboard.loadTemplate()">
                <i class="fas fa-file-alt"></i> Load Template
              </button>
              <button type="submit" class="btn-primary">
                <i class="fas fa-paper-plane"></i> Send Email
              </button>
            </div>
          </form>
        </div>
        
        <div class="email-templates">
          <div class="section-header">
            <h2><i class="fas fa-file-alt"></i> Email Templates</h2>
          </div>
          
          <div class="templates-grid">
            <div class="template-card" onclick="adminDashboard.useTemplate('welcome')">
              <div class="template-icon">
                <i class="fas fa-hand-wave"></i>
              </div>
              <h4>Welcome Email</h4>
              <p>Send to new users</p>
            </div>
            
            <div class="template-card" onclick="adminDashboard.useTemplate('update')">
              <div class="template-icon">
                <i class="fas fa-bullhorn"></i>
              </div>
              <h4>Update Announcement</h4>
              <p>Product updates/news</p>
            </div>
            
            <div class="template-card" onclick="adminDashboard.useTemplate('promo')">
              <div class="template-icon">
                <i class="fas fa-percentage"></i>
              </div>
              <h4>Promotional</h4>
              <p>Special offers/discounts</p>
            </div>
            
            <div class="template-card" onclick="adminDashboard.useTemplate('survey')">
              <div class="template-icon">
                <i class="fas fa-poll"></i>
              </div>
              <h4>Feedback Survey</h4>
              <p>Request user feedback</p>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  escapeValue(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  imageField(label, inputId, value, previewClass = '') {
    const safeValue = this.escapeValue(value);
    return `
      <div class="content-image-field">
        <label for="${inputId}">${label}</label>
        <div class="content-image-row">
          <input type="url" id="${inputId}" value="${safeValue}" placeholder="https://res.cloudinary.com/...">
          <label class="upload-image-btn" for="${inputId}-file">
            <i class="fas fa-cloud-upload-alt"></i> Upload
          </label>
          <input class="content-file-input" id="${inputId}-file" type="file" accept="image/*" data-url-target="${inputId}">
        </div>
        ${safeValue ? `<img class="content-image-preview ${previewClass}" src="${safeValue}" alt="">` : ''}
      </div>
    `;
  }

  renderSocialContentPage() {
    const cards = Array.isArray(this.managedContent.socialCards) ? this.managedContent.socialCards : [];
    return `
      <div class="managed-content-page">
        <div class="managed-page-heading">
          <div>
            <h2><i class="fas fa-images"></i> Dashboard Social Cards</h2>
            <p>Edit and publish one card at a time. Changes appear on the user dashboard after refresh.</p>
          </div>
        </div>
        <div class="managed-cards-grid">
          ${[0, 1, 2, 3].map(index => {
            const card = cards[index] || {};
            return `
              <form class="managed-editor-card social-card-editor" data-card-index="${index}">
                <div class="managed-card-title">
                  <span>Card ${index + 1}</span>
                  <button class="btn-primary" type="submit"><i class="fas fa-save"></i> Save Card</button>
                </div>
                ${this.imageField('Main card image', `social-${index}-imageUrl`, card.imageUrl)}
                <div class="managed-form-grid">
                  <div class="form-group">
                    <label for="social-${index}-title">Title</label>
                    <input id="social-${index}-title" value="${this.escapeValue(card.title)}" required>
                  </div>
                  <div class="form-group">
                    <label for="social-${index}-profileName">Profile or brand name</label>
                    <input id="social-${index}-profileName" value="${this.escapeValue(card.profileName)}">
                  </div>
                </div>
                <div class="form-group">
                  <label for="social-${index}-description">Description</label>
                  <textarea id="social-${index}-description" rows="3">${this.escapeValue(card.description)}</textarea>
                </div>
                ${this.imageField('Small profile image', `social-${index}-profileImageUrl`, card.profileImageUrl, 'is-avatar')}
                <div class="managed-form-grid">
                  <div class="form-group">
                    <label for="social-${index}-profileSubtitle">Profile subtitle</label>
                    <input id="social-${index}-profileSubtitle" value="${this.escapeValue(card.profileSubtitle)}">
                  </div>
                  <div class="form-group">
                    <label for="social-${index}-buttonText">Button text</label>
                    <input id="social-${index}-buttonText" value="${this.escapeValue(card.buttonText || 'View Now')}">
                  </div>
                </div>
                <div class="form-group">
                  <label for="social-${index}-buttonUrl">Button link</label>
                  <input type="url" id="social-${index}-buttonUrl" value="${this.escapeValue(card.buttonUrl)}" placeholder="https://instagram.com/...">
                </div>
              </form>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  renderEventsContentPage() {
    const event = this.managedContent.event || {};
    const speakers = Array.isArray(event.speakers) ? event.speakers : [];
    return `
      <div class="managed-content-page">
        <div class="managed-page-heading">
          <div>
            <h2><i class="fas fa-calendar-alt"></i> Events & Blogs Content</h2>
            <p>The hero and speaker cards retain the dashboard event layout shown to users.</p>
          </div>
          <button class="btn-primary" id="saveEventContentBtn" type="button">
            <i class="fas fa-save"></i> Save Event
          </button>
        </div>

        <section class="managed-editor-card">
          <div class="publish-row">
            <div>
              <strong>Publish this event</strong>
              <p>Turn this off to show “No Event” on the dashboard.</p>
            </div>
            <input id="event-published" type="checkbox" ${event.published ? 'checked' : ''}>
          </div>
          ${this.imageField('Main banner image', 'event-bannerImageUrl', event.bannerImageUrl)}
          <div class="form-group">
            <label for="event-title">Main title</label>
            <input id="event-title" value="${this.escapeValue(event.title)}" placeholder="Raising Brand Ambassadors">
          </div>
          <div class="form-group">
            <label for="event-description">Event description</label>
            <textarea id="event-description" rows="4">${this.escapeValue(event.description)}</textarea>
          </div>
          <div class="managed-form-grid managed-form-grid-3">
            <div class="form-group">
              <label for="event-date">Date</label>
              <input id="event-date" value="${this.escapeValue(event.date)}" placeholder="15th Feb, 2026">
            </div>
            <div class="form-group">
              <label for="event-time">Time</label>
              <input id="event-time" value="${this.escapeValue(event.time)}" placeholder="2:00PM">
            </div>
            <div class="form-group">
              <label for="event-platformName">Platform name</label>
              <input id="event-platformName" value="${this.escapeValue(event.platformName)}" placeholder="Google Meet">
            </div>
          </div>
          ${this.imageField('Platform image icon', 'event-platformIconUrl', event.platformIconUrl, 'is-icon')}
          <div class="managed-form-grid">
            <div class="form-group">
              <label for="event-registerButtonText">Register button text</label>
              <input id="event-registerButtonText" value="${this.escapeValue(event.registerButtonText || 'Register Now')}">
            </div>
            <div class="form-group">
              <label for="event-registerUrl">Registration link</label>
              <input type="url" id="event-registerUrl" value="${this.escapeValue(event.registerUrl)}" placeholder="https://meet.google.com/...">
            </div>
          </div>
        </section>

        <div class="managed-page-heading speaker-heading">
          <div>
            <h2>Speakers</h2>
            <p>Add speakers in the same order they should appear.</p>
          </div>
          <button class="btn-secondary" id="addEventSpeakerBtn" type="button">
            <i class="fas fa-plus"></i> Add Speaker
          </button>
        </div>
        <div id="speakerEditors" class="speaker-editor-grid">
          ${speakers.map((speaker, index) => `
            <article class="managed-editor-card speaker-editor" data-speaker-index="${index}">
              <div class="managed-card-title">
                <span>Speaker ${index + 1}</span>
                <button class="icon-delete-btn remove-speaker-btn" data-speaker-index="${index}" type="button" title="Remove speaker">
                  <i class="fas fa-trash"></i>
                </button>
              </div>
              ${this.imageField('Speaker image', `speaker-${index}-imageUrl`, speaker.imageUrl)}
              <div class="form-group">
                <label for="speaker-${index}-name">Speaker name</label>
                <input id="speaker-${index}-name" value="${this.escapeValue(speaker.name)}">
              </div>
              <div class="form-group">
                <label for="speaker-${index}-bio">About speaker</label>
                <textarea id="speaker-${index}-bio" rows="4">${this.escapeValue(speaker.bio)}</textarea>
              </div>
              ${this.imageField('Social platform icon', `speaker-${index}-socialIconUrl`, speaker.socialIconUrl, 'is-icon')}
              <div class="managed-form-grid">
                <div class="form-group">
                  <label for="speaker-${index}-socialHandle">Social handle</label>
                  <input id="speaker-${index}-socialHandle" value="${this.escapeValue(speaker.socialHandle)}" placeholder="@pedroahmed">
                </div>
                <div class="form-group">
                  <label for="speaker-${index}-socialUrl">Social profile link</label>
                  <input type="url" id="speaker-${index}-socialUrl" value="${this.escapeValue(speaker.socialUrl)}">
                </div>
              </div>
            </article>
          `).join('')}
        </div>
      </div>
    `;
  }

  async saveSocialCard(event, index) {
    event.preventDefault();
    const value = field => document.getElementById(`social-${index}-${field}`)?.value.trim() || '';
    const card = {
      imageUrl: value('imageUrl'),
      title: value('title'),
      description: value('description'),
      profileImageUrl: value('profileImageUrl'),
      profileName: value('profileName'),
      profileSubtitle: value('profileSubtitle'),
      buttonText: value('buttonText'),
      buttonUrl: value('buttonUrl')
    };
    const result = await window.TekagonAPI.updateSocialCard(index, card);
    if (!result.success) {
      this.showNotification(result.error || 'Card could not be saved', 'error');
      return;
    }
    this.managedContent.socialCards = result.socialCards;
    this.showNotification(`Card ${index + 1} saved`, 'success');
  }

  addEventSpeaker() {
    const speakers = Array.isArray(this.managedContent.event?.speakers)
      ? this.managedContent.event.speakers
      : [];
    if (speakers.length >= 12) {
      this.showNotification('A maximum of 12 speakers is supported', 'error');
      return;
    }
    this.captureEventDraft();
    this.managedContent.event.speakers.push({
      imageUrl: '',
      name: '',
      bio: '',
      socialIconUrl: '',
      socialHandle: '',
      socialUrl: ''
    });
    this.loadPage('events-content');
  }

  removeEventSpeaker(index) {
    this.captureEventDraft();
    this.managedContent.event.speakers.splice(index, 1);
    this.loadPage('events-content');
  }

  captureEventDraft() {
    if (!document.getElementById('event-title')) return this.managedContent.event;
    const value = id => document.getElementById(id)?.value.trim() || '';
    const speakers = Array.from(document.querySelectorAll('.speaker-editor')).map((editor, index) => ({
      imageUrl: value(`speaker-${index}-imageUrl`),
      name: value(`speaker-${index}-name`),
      bio: value(`speaker-${index}-bio`),
      socialIconUrl: value(`speaker-${index}-socialIconUrl`),
      socialHandle: value(`speaker-${index}-socialHandle`),
      socialUrl: value(`speaker-${index}-socialUrl`)
    }));
    this.managedContent.event = {
      published: Boolean(document.getElementById('event-published')?.checked),
      bannerImageUrl: value('event-bannerImageUrl'),
      title: value('event-title'),
      description: value('event-description'),
      date: value('event-date'),
      time: value('event-time'),
      platformName: value('event-platformName'),
      platformIconUrl: value('event-platformIconUrl'),
      registerButtonText: value('event-registerButtonText'),
      registerUrl: value('event-registerUrl'),
      speakers
    };
    return this.managedContent.event;
  }

  async saveEventContent() {
    const event = this.captureEventDraft();
    const result = await window.TekagonAPI.updateDashboardEvent(event);
    if (!result.success) {
      this.showNotification(result.error || 'Event could not be saved', 'error');
      return;
    }
    this.managedContent.event = result.event;
    this.showNotification('Event content saved', 'success');
  }

  bindImageUploadInputs() {
    document.querySelectorAll('.content-file-input').forEach(input => {
      input.addEventListener('change', async () => {
        const file = input.files?.[0];
        if (!file) return;
        const target = document.getElementById(input.dataset.urlTarget);
        try {
          const url = await this.uploadImageToCloudinary(file);
          if (target) target.value = url;
          const field = input.closest('.content-image-field');
          let preview = field?.querySelector('.content-image-preview');
          if (!preview && field) {
            preview = document.createElement('img');
            preview.className = 'content-image-preview';
            preview.alt = '';
            field.appendChild(preview);
          }
          if (preview) preview.src = url;
          this.showNotification('Image uploaded. Save the card or event to publish it.', 'success');
        } catch (error) {
          this.showNotification(error.message || 'Image upload failed', 'error');
        }
      });
    });
  }

  bindContentEditorActions() {
    document.querySelectorAll('.social-card-editor').forEach(form => {
      form.addEventListener('submit', event => {
        this.saveSocialCard(event, Number(form.dataset.cardIndex));
      });
    });
    document.getElementById('saveEventContentBtn')?.addEventListener('click', () => this.saveEventContent());
    document.getElementById('addEventSpeakerBtn')?.addEventListener('click', () => this.addEventSpeaker());
    document.querySelectorAll('.remove-speaker-btn').forEach(button => {
      button.addEventListener('click', () => this.removeEventSpeaker(Number(button.dataset.speakerIndex)));
    });
  }

  async uploadImageToCloudinary(file) {
    const config = window.TEKAGON_PUBLIC_CONFIG || {};
    const cloudName = config.CLOUDINARY_CLOUD_NAME;
    const uploadPreset = config.CLOUDINARY_UPLOAD_PRESET;
    if (!cloudName || !uploadPreset) {
      throw new Error('Cloudinary cloud name and unsigned upload preset are not configured in Vercel');
    }
    if (!file.type.startsWith('image/')) throw new Error('Please choose an image file');
    if (file.size > 10 * 1024 * 1024) throw new Error('Image must be smaller than 10MB');

    const form = new FormData();
    form.append('file', file);
    form.append('upload_preset', uploadPreset);
    form.append('folder', 'tekagon/dashboard-content');
    const response = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/image/upload`, {
      method: 'POST',
      body: form
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.secure_url) {
      throw new Error(result.error?.message || 'Cloudinary rejected the upload');
    }
    return result.secure_url;
  }

  addContentManagerStyles() {
    if (document.getElementById('contentManagerStyles')) return;
    const style = document.createElement('style');
    style.id = 'contentManagerStyles';
    style.textContent = `
      .managed-content-page { display: grid; gap: 22px; }
      .managed-page-heading {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 18px;
      }
      .managed-page-heading h2 { margin-bottom: 6px; }
      .managed-page-heading p,
      .publish-row p { color: #94a3b8; line-height: 1.45; }
      .managed-cards-grid,
      .speaker-editor-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 20px;
      }
      .managed-editor-card {
        min-width: 0;
        padding: 22px;
        border: 1px solid rgba(255,255,255,.08);
        border-radius: 8px;
        background: rgba(255,255,255,.025);
      }
      .managed-card-title,
      .publish-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 14px;
        margin-bottom: 20px;
      }
      .managed-card-title > span { font-size: 1.1rem; font-weight: 700; }
      .managed-form-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 15px;
      }
      .managed-form-grid-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
      .content-image-field { margin-bottom: 20px; }
      .content-image-field > label {
        display: block;
        margin-bottom: 8px;
        font-weight: 500;
      }
      .content-image-row { display: flex; gap: 10px; }
      .content-image-row input[type="url"] {
        min-width: 0;
        flex: 1;
        padding: 12px 14px;
        border: 1px solid rgba(255,255,255,.1);
        border-radius: 6px;
        background: rgba(255,255,255,.03);
        color: #e2e8f0;
      }
      .content-file-input { position: absolute; width: 1px; height: 1px; opacity: 0; pointer-events: none; }
      .upload-image-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 7px;
        padding: 11px 14px;
        border: 1px solid rgba(147,255,246,.3);
        border-radius: 6px;
        color: #93fff6;
        cursor: pointer;
        white-space: nowrap;
      }
      .content-image-preview {
        width: 100%;
        max-height: 220px;
        display: block;
        margin-top: 12px;
        border-radius: 6px;
        object-fit: cover;
        background: #080d18;
      }
      .content-image-preview.is-avatar,
      .content-image-preview.is-icon {
        width: 64px;
        height: 64px;
        border-radius: 50%;
        object-fit: cover;
      }
      .content-image-preview.is-icon { border-radius: 6px; object-fit: contain; }
      .publish-row input[type="checkbox"] { width: 24px; height: 24px; accent-color: #6f65ff; }
      .speaker-heading { margin-top: 6px; }
      .icon-delete-btn {
        width: 36px;
        height: 36px;
        border: 1px solid rgba(239,68,68,.35);
        border-radius: 6px;
        background: rgba(239,68,68,.1);
        color: #ef4444;
        cursor: pointer;
      }
      @media (max-width: 900px) {
        .managed-cards-grid,
        .speaker-editor-grid,
        .managed-form-grid,
        .managed-form-grid-3 { grid-template-columns: 1fr; }
        .managed-page-heading { align-items: flex-start; flex-direction: column; }
      }
      @media (max-width: 520px) {
        .managed-editor-card { padding: 16px; }
        .managed-card-title { align-items: flex-start; }
        .content-image-row { flex-direction: column; }
      }
    `;
    document.head.appendChild(style);
  }

  renderSettingsPage() {
    const settings = this.adminSettings;
    return `
      <div class="settings-page">
        <div class="managed-page-heading settings-heading">
          <div>
            <span class="managed-eyebrow">Administration</span>
            <h2>System Settings</h2>
            <p>These preferences are stored securely in MongoDB and apply across admin sessions.</p>
          </div>
          <button class="btn-primary" onclick="adminDashboard.saveAllSettings()">
            <i class="fas fa-save"></i> Save All Settings
          </button>
        </div>
        <div class="settings-grid">
          <div class="settings-card">
            <h3><i class="fas fa-comments"></i> Chat Settings</h3>
            <div class="settings-group">
              <label>Auto-response delay (seconds)</label>
              <input type="number" id="autoResponseDelay" value="${settings.chat.autoResponseDelay}" min="0" max="60">
            </div>
            <div class="settings-group settings-toggle-row">
              <label for="enableAutoResponses">Enable auto-responses</label>
              <input type="checkbox" id="enableAutoResponses" ${settings.chat.enableAutoResponses ? 'checked' : ''}>
            </div>
            <div class="settings-group">
              <label>Default welcome message</label>
              <textarea id="welcomeMessage" rows="3">${this.escapeHtml(settings.chat.welcomeMessage)}</textarea>
            </div>
            <button class="btn-primary" onclick="adminDashboard.saveChatSettings()">
              Save Chat Settings
            </button>
          </div>
          
          <div class="settings-card">
            <h3><i class="fas fa-bell"></i> Notifications</h3>
            <div class="settings-group settings-toggle-row">
              <label for="emailNotifications">Email notifications for new messages</label>
              <input type="checkbox" id="emailNotifications" ${settings.notifications.emailNotifications ? 'checked' : ''}>
            </div>
            <div class="settings-group settings-toggle-row">
              <label for="desktopNotifications">Desktop notifications</label>
              <input type="checkbox" id="desktopNotifications" ${settings.notifications.desktopNotifications ? 'checked' : ''}>
            </div>
            <div class="settings-group">
              <label>Notification sound</label>
              <select id="notificationSound">
                ${['default', 'chime', 'bell', 'none'].map(value => `<option value="${value}" ${settings.notifications.sound === value ? 'selected' : ''}>${value.charAt(0).toUpperCase() + value.slice(1)}</option>`).join('')}
              </select>
            </div>
            <button class="btn-primary" onclick="adminDashboard.saveNotificationSettings()">
              Save Notification Settings
            </button>
          </div>
          
          <div class="settings-card">
            <h3><i class="fas fa-shield-alt"></i> Security</h3>
            <div class="settings-group">
              <label>Change Admin Password</label>
              <input type="password" id="newPassword" placeholder="New password">
            </div>
            <div class="settings-group">
              <label>Confirm Password</label>
              <input type="password" id="confirmPassword" placeholder="Confirm new password">
            </div>
            <div class="settings-group">
              <label>Session timeout (minutes)</label>
              <input type="number" id="sessionTimeout" value="${settings.security.sessionTimeout}" min="5" max="240">
            </div>
            <div class="actions-group">
              <button class="btn-secondary" onclick="adminDashboard.saveSecuritySettings()">
                <i class="fas fa-clock"></i> Save Timeout
              </button>
              <button class="btn-primary" onclick="adminDashboard.changePassword()">
                <i class="fas fa-key"></i> Change Password
              </button>
            </div>
          </div>
          
          <div class="settings-card">
            <h3><i class="fas fa-database"></i> Data Management</h3>
            <div class="settings-group">
              <label>Auto-delete old messages (days)</label>
              <input type="number" id="autoDeleteDays" value="${settings.data.autoDeleteDays}" min="1" max="365">
            </div>
            <div class="settings-group">
              <label>Export format</label>
              <select id="exportFormat">
                ${['json', 'csv', 'txt'].map(value => `<option value="${value}" ${settings.data.exportFormat === value ? 'selected' : ''}>${value.toUpperCase()}</option>`).join('')}
              </select>
            </div>
            <div class="actions-group">
              <button class="btn-primary" onclick="adminDashboard.saveDataSettings()">
                <i class="fas fa-save"></i> Save Data Settings
              </button>
              <button class="btn-secondary" onclick="adminDashboard.exportAllData()">
                <i class="fas fa-download"></i> Export All Data
              </button>
              <button class="btn-danger" onclick="adminDashboard.clearAllData()">
                <i class="fas fa-trash"></i> Clear All Data
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  getRecentConversations() {
    const userIds = Object.keys(this.conversations);
    const recent = [];

    userIds.forEach(userId => {
      const messages = this.conversations[userId] || [];
      if (messages.length > 0) {
        const lastMessage = messages[messages.length - 1];
        const userName = this.getUserDisplayName(userId);
        const unreadCount = messages.filter(msg => !msg.read && msg.sender === 'user').length;

        recent.push({
          userId: userId,
          userName: userName,
          lastMessage: lastMessage.content.length > 50 ? lastMessage.content.substring(0, 50) + '...' : lastMessage.content,
          lastMessageTime: new Date(lastMessage.timestamp).toLocaleTimeString(),
          unread: unreadCount > 0,
          unreadCount: unreadCount
        });
      }
    });

    // Sort by most recent
    return recent.sort((a, b) => {
      const timeA = this.conversations[a.userId]?.[this.conversations[a.userId].length - 1]?.timestamp || 0;
      const timeB = this.conversations[b.userId]?.[this.conversations[b.userId].length - 1]?.timestamp || 0;
      return new Date(timeB) - new Date(timeA);
    }).slice(0, 5);
  }

  selectUser(userId) {
    this.selectedUser = userId;
    this.openConversation(userId);
  }

  // Update the openConversation method to support ticket chats
  openConversation(userId, ticketId = null) {
    if (!userId) {
      alert('Please select a user first');
      return;
    }

    this.selectedUser = userId;
    this.selectedTicket = ticketId || null;

    // Get user info from registration data
    const users = JSON.parse(localStorage.getItem('tekagon_chat_users') || '{}');
    const userInfo = this.registeredUsers[userId] || users[userId] || {};
    const userName = this.getUserDisplayName(userId, userInfo);

    // Mark messages as read
    this.markAsRead(userId);

    let ticketInfo = '';
    let messages = [];

    if (ticketId) {
      // Load ticket-specific messages
      const ticketChats = JSON.parse(localStorage.getItem('tekagon_ticket_chats') || '{}');
      messages = ticketChats[ticketId] || [];

      const ticket = this.getTicket(userId, ticketId);
      if (ticket) {
        ticketInfo = `
        <div class="ticket-chat-header">
          <div class="ticket-chat-badge">
            <i class="fas fa-ticket-alt"></i>
            Ticket #${ticketId.substring(0, 10)}
          </div>
          <div class="ticket-chat-service">${this.escapeHtml(ticket.serviceName)}</div>
          <div class="ticket-chat-status ${this.escapeHtml(ticket.status)}">${this.escapeHtml(ticket.status)}</div>
        </div>
      `;
      }
    } else {
      // Load general conversation messages
      messages = (this.conversations[userId] || []).filter(message => !message.ticketId);
    }

    // Open conversation in modal
    const modalHTML = `
    <div class="conversation-modal" id="conversationModal">
      <div class="modal-content">
        <div class="modal-header">
          <div class="user-header-info">
            <div class="user-avatar">
              <i class="fas fa-user"></i>
            </div>
            <div>
              <h3>${this.escapeHtml(userName)}</h3>
              <div class="user-id">ID: ${this.escapeHtml(userId.substring(0, 15))}...</div>
            </div>
          </div>
          <button class="modal-close" onclick="adminDashboard.closeModal()">×</button>
        </div>
        
        ${ticketInfo}
        
        <div class="modal-body">
          <div class="conversation-messages" id="conversationMessages">
            ${messages.map(msg => this.renderChatMessage(msg, userName)).join('') || '<div class="empty-state compact"><p>No messages in this conversation yet.</p></div>'}
          </div>
          
          <div class="message-input">
            <textarea id="adminReply" placeholder="Type your reply..." rows="3"></textarea>
            <div class="message-actions">
              <button onclick="adminDashboard.sendAdminReply('${userId}', '${ticketId || ''}')" class="btn-primary">
                <i class="fas fa-paper-plane"></i> Send Reply
              </button>
              <button onclick="adminDashboard.addQuickResponse('${userId}')" class="btn-secondary">
                <i class="fas fa-bolt"></i> Quick Response
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

    // Remove existing modal
    const existingModal = document.getElementById('conversationModal');
    if (existingModal) existingModal.remove();

    // Add new modal
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    document.getElementById('adminReply')?.addEventListener('keydown', event => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        this.sendAdminReply(userId, ticketId || '');
      }
    });
    document.getElementById('conversationModal')?.addEventListener('click', event => {
      if (event.target.id === 'conversationModal') this.closeModal();
    });

    // Scroll to bottom
    setTimeout(() => {
      const messagesDiv = document.getElementById('conversationMessages');
      if (messagesDiv) {
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
      }
    }, 100);

    this.refreshConversation(userId, ticketId);
  }

  async refreshConversation(userId, ticketId = null) {
    if (!window.TekagonAPI) return;
    try {
      if (ticketId) {
        const result = await window.TekagonAPI.getTicketMessages(ticketId);
        if (result.success) {
          const ticketChats = JSON.parse(localStorage.getItem(TICKET_CHAT_KEY) || '{}');
          ticketChats[ticketId] = this.mergeMessages(ticketChats[ticketId] || [], result.messages);
          localStorage.setItem(TICKET_CHAT_KEY, JSON.stringify(ticketChats));
        }
      } else {
        const result = await window.TekagonAPI.getUserMessages(userId);
        if (result.success) this.setConversationMessages(userId, result.messages);
      }
      this.renderOpenConversationMessages(userId, ticketId);
      this.markAsRead(userId, ticketId);
    } catch (error) {
      console.warn('Conversation refresh failed:', error);
      this.showNotification('Conversation opened from cached messages. Live refresh will retry.', 'info');
    }
  }

  closeModal() {
    const modal = document.getElementById('conversationModal');
    if (modal) modal.remove();
    this.selectedUser = null;
    this.selectedTicket = null;
  }

 
  markAsRead(userId) {
    if (!this.conversations[userId]) return;

    let updated = false;
    this.conversations[userId].forEach(msg => {
      if (!msg.read && msg.sender === 'user') {
        msg.read = true;
        updated = true;
      }
    });

    if (updated) {
      localStorage.setItem('tekagon_chat_conversations', JSON.stringify(this.conversations));
      this.calculateStats();
      this.updateBadge();
    }
  }

  exportConversation(userId) {
    const messages = this.conversations[userId] || [];
    const userName = this.getUserDisplayName(userId);

    const chatText = messages.map(msg => {
      const time = new Date(msg.timestamp).toLocaleString();
      const sender = msg.sender === 'user' ? userName : 'Tekagon Support';
      return `[${time}] ${sender}: ${msg.content}`;
    }).join('\n');

    const blob = new Blob([chatText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tekagon-chat-${userId.substring(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async deleteConversation(userId) {
    if (confirm('Delete this conversation and all of its messages?')) {
      const result = await window.TekagonAPI?.deleteAdminConversation?.(userId);
      if (result && !result.success) {
        this.showNotification(result.error || 'Failed to delete conversation', 'error');
        return;
      }
      delete this.conversations[userId];
      localStorage.setItem('tekagon_chat_conversations', JSON.stringify(this.conversations));
      this.calculateStats();
      this.updateBadge();
      this.loadPage('chats');
      this.showNotification('Conversation deleted', 'success');
    }
  }

  async sendEmail() {
    const subject = document.getElementById('emailSubject').value;
    const message = document.getElementById('emailMessage').value;

    if (!subject || !message) {
      alert('Please fill in subject and message');
      return;
    }

    const selected = Array.from(document.getElementById('emailRecipients').selectedOptions).map(option => option.value);
    if (!selected.length) {
      this.showNotification('Select at least one email recipient', 'error');
      return;
    }
    const userIds = selected.includes('all') ? [] : selected;
    const result = await window.TekagonAPI?.sendAdminEmail?.({ userIds, subject, message });
    if (!result?.success) {
      this.showNotification(result?.error || 'Email could not be sent', 'error');
      return;
    }
    this.showNotification(`Email sent to ${result.sent} recipient${result.sent === 1 ? '' : 's'}`, 'success');
  }

  async broadcastMessage() {
    const message = prompt('Enter broadcast message to send to all users:');
    if (message && message.trim()) {
      const result = await window.TekagonAPI?.broadcastAdminMessage?.(message.trim());
      if (!result?.success) {
        this.showNotification(result?.error || 'Broadcast failed', 'error');
        return;
      }
      (result.messages || []).forEach(savedMessage => {
        this.setConversationMessages(savedMessage.userId, savedMessage);
      });
      this.calculateStats();
      this.showNotification(`Broadcast sent to ${result.sent} user${result.sent === 1 ? '' : 's'}`, 'success');
    }
  }

  exportAllChats() {
    const allData = {
      conversations: this.conversations,
      stats: this.stats,
      exportedAt: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(allData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tekagon-chats-export-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async clearOldChats() {
    const configuredDays = Number(localStorage.getItem('tekagon_auto_delete_days') || 90);
    const entered = prompt('Delete messages older than how many days?', String(configuredDays));
    if (entered === null) return;
    const days = Math.min(Math.max(Number(entered) || configuredDays, 1), 3650);
    if (!confirm(`Delete all messages older than ${days} days?`)) return;
    const result = await window.TekagonAPI?.clearOldAdminMessages?.(days);
    if (!result?.success) {
      this.showNotification(result?.error || 'Old chats could not be cleared', 'error');
      return;
    }
    await this.loadData();
    this.loadPage(this.currentPage);
    this.showNotification(`${result.deletedMessages || 0} old message${result.deletedMessages === 1 ? '' : 's'} deleted`, 'success');
  }

  sendTestEmail() {
    this.loadPage('email');
    this.useTemplate('update');
    this.showNotification('Email composer opened. Select a recipient to send a test.', 'info');
  }

  sendEmailToUser(userId) {
    this.loadPage('email');
    const select = document.getElementById('emailRecipients');
    if (select) {
      Array.from(select.options).forEach(option => {
        option.selected = option.value === userId;
      });
    }
    this.useTemplate('welcome');
  }

  async deleteUser(userId) {
    const name = this.getUserDisplayName(userId);
    if (!confirm(`Delete ${name}, their tickets, and all of their messages?`)) return;
    const result = await window.TekagonAPI?.deleteAdminUser?.(userId);
    if (!result?.success) {
      this.showNotification(result?.error || 'User could not be deleted', 'error');
      return;
    }
    delete this.registeredUsers[userId];
    delete this.conversations[userId];
    this.allTicketsList = this.allTicketsList.filter(ticket => ticket.userId !== userId);
    this.calculateStats();
    this.loadPage('users');
    this.showNotification('User and related records deleted', 'success');
  }

  useTemplate(type) {
    const templates = {
      welcome: {
        subject: 'Welcome to Tekagon',
        message: 'Hello,\n\nWelcome to Tekagon. We are glad to have you with us. Reply to this email if you need any assistance.\n\nTekagon Team'
      },
      update: {
        subject: 'Important Update from Tekagon',
        message: 'Hello,\n\nWe have an important update to share with you. Please log in to your Tekagon dashboard for the latest information.\n\nTekagon Team'
      },
      promo: {
        subject: 'A Special Offer from Tekagon',
        message: 'Hello,\n\nWe have a special offer available for selected Tekagon services. Contact our team to learn more.\n\nTekagon Team'
      },
      survey: {
        subject: 'Share Your Feedback with Tekagon',
        message: 'Hello,\n\nWe would appreciate your feedback about your experience with Tekagon. Your response helps us improve.\n\nTekagon Team'
      }
    };
    const template = templates[type] || templates.update;
    const subject = document.getElementById('emailSubject');
    const message = document.getElementById('emailMessage');
    if (subject) subject.value = template.subject;
    if (message) message.value = template.message;
  }

  loadTemplate() {
    this.useTemplate('update');
  }

  collectSettingsForm() {
    return {
      chat: {
        autoResponseDelay: Number(document.getElementById('autoResponseDelay')?.value ?? this.adminSettings.chat.autoResponseDelay),
        enableAutoResponses: Boolean(document.getElementById('enableAutoResponses')?.checked),
        welcomeMessage: document.getElementById('welcomeMessage')?.value || this.adminSettings.chat.welcomeMessage
      },
      notifications: {
        emailNotifications: Boolean(document.getElementById('emailNotifications')?.checked),
        desktopNotifications: Boolean(document.getElementById('desktopNotifications')?.checked),
        sound: document.getElementById('notificationSound')?.value || this.adminSettings.notifications.sound
      },
      security: {
        sessionTimeout: Number(document.getElementById('sessionTimeout')?.value || this.adminSettings.security.sessionTimeout)
      },
      data: {
        autoDeleteDays: Number(document.getElementById('autoDeleteDays')?.value || this.adminSettings.data.autoDeleteDays),
        exportFormat: document.getElementById('exportFormat')?.value || this.adminSettings.data.exportFormat
      }
    };
  }

  async saveAllSettings(successMessage = 'Settings saved') {
    const settings = this.collectSettingsForm();
    if (settings.notifications.desktopNotifications && window.Notification?.permission === 'default') {
      const permission = await window.Notification.requestPermission();
      settings.notifications.desktopNotifications = permission === 'granted';
    }
    const result = await window.TekagonAPI?.updateAdminSettings?.(settings);
    if (!result?.success) {
      this.showNotification(result?.error || 'Could not save settings', 'error');
      return false;
    }
    this.adminSettings = {
      ...this.adminSettings,
      ...result.settings,
      chat: { ...this.adminSettings.chat, ...(result.settings?.chat || {}) },
      notifications: { ...this.adminSettings.notifications, ...(result.settings?.notifications || {}) },
      security: { ...this.adminSettings.security, ...(result.settings?.security || {}) },
      data: { ...this.adminSettings.data, ...(result.settings?.data || {}) }
    };
    this.showNotification(successMessage, 'success');
    return true;
  }

  saveChatSettings() {
    return this.saveAllSettings('Chat settings saved');
  }

  saveNotificationSettings() {
    return this.saveAllSettings('Notification settings saved');
  }

  saveSecuritySettings() {
    return this.saveAllSettings('Security settings saved');
  }

  saveDataSettings() {
    return this.saveAllSettings('Data settings saved');
  }

  async changePassword() {
    const password = document.getElementById('newPassword')?.value || '';
    const confirmation = document.getElementById('confirmPassword')?.value || '';
    if (password.length < 8) {
      this.showNotification('Password must be at least 8 characters', 'error');
      return;
    }
    if (password !== confirmation) {
      this.showNotification('Passwords do not match', 'error');
      return;
    }
    const settingsSaved = await this.saveAllSettings('Session timeout saved');
    if (!settingsSaved) return;
    const result = await window.TekagonAPI?.updateAdminPassword?.(password);
    if (!result?.success) {
      this.showNotification(result?.error || 'Could not change password', 'error');
      return;
    }
    document.getElementById('newPassword').value = '';
    document.getElementById('confirmPassword').value = '';
    this.showNotification('Admin password changed. Use the new password next time you sign in.', 'success');
  }

  exportAllData() {
    const payload = {
      users: this.registeredUsers,
      conversations: this.conversations,
      tickets: this.allTicketsList,
      content: this.managedContent,
      exportedAt: new Date().toISOString()
    };
    const format = this.adminSettings.data.exportFormat || 'json';
    let contents = JSON.stringify(payload, null, 2);
    let mimeType = 'application/json';
    if (format === 'txt') {
      contents = [
        `Tekagon admin export - ${payload.exportedAt}`,
        `Users: ${Object.keys(payload.users).length}`,
        `Tickets: ${payload.tickets.length}`,
        '',
        JSON.stringify(payload, null, 2)
      ].join('\n');
      mimeType = 'text/plain';
    } else if (format === 'csv') {
      const rows = [['Type', 'ID', 'Name', 'Status', 'Created']];
      Object.values(payload.users).forEach(user => rows.push(['User', user.userId, user.name || user.email || '', '', user.registeredAt || '']));
      payload.tickets.forEach(ticket => rows.push(['Ticket', ticket.id || ticket.ticketId, ticket.serviceName || '', ticket.status || '', ticket.createdAt || '']));
      contents = rows.map(row => row.map(value => `"${String(value ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
      mimeType = 'text/csv';
    }
    const blob = new Blob([contents], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `tekagon-admin-export-${new Date().toISOString().slice(0, 10)}.${format}`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async clearAllData() {
    if (!confirm('This will permanently delete every user, message, and ticket. Continue?')) return;
    const confirmation = prompt('Type DELETE ALL DATA to confirm');
    if (confirmation !== 'DELETE ALL DATA') {
      this.showNotification('Data deletion cancelled', 'info');
      return;
    }
    for (const userId of Object.keys(this.registeredUsers)) {
      const result = await window.TekagonAPI?.deleteAdminUser?.(userId);
      if (!result?.success) {
        this.showNotification(`Deletion stopped at ${this.getUserDisplayName(userId)}`, 'error');
        return;
      }
    }
    this.registeredUsers = {};
    this.conversations = {};
    this.allTicketsList = [];
    this.calculateStats();
    this.loadPage('dashboard');
    this.showNotification('All user data was deleted', 'success');
  }

  updateBadge() {
    const badge = document.getElementById('unreadBadge');
    if (badge) {
      badge.textContent = this.stats.unreadMessages;
      badge.style.display = this.stats.unreadMessages > 0 ? 'flex' : 'none';
    }
    const ticketBadge = document.getElementById('ticketBadge');
    if (ticketBadge) {
      const pendingTickets = this.getPendingTicketsCount();
      ticketBadge.textContent = pendingTickets;
      ticketBadge.style.display = pendingTickets > 0 ? 'flex' : 'none';
    }
  }

  setupEventListeners() {
    // Navigation buttons
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.loadPage(btn.dataset.page);
      });
    });
    window.addEventListener('hashchange', () => {
      const page = new URLSearchParams(location.hash.replace(/^#/, '')).get('page');
      if (page && page !== this.currentPage) this.loadPage(page, false);
    });



    // Logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('adminLoggedIn');
        sessionStorage.removeItem('tekagonAdminToken');
        location.reload();
      });
    }
  }

  startAutoRefresh() {
    // Keep ticket counts and conversations current without requiring a refresh.
    setInterval(async () => {
      await this.loadData();
      this.updateBadge();

      // Refresh current page if on chats page
      if (!document.getElementById('conversationModal') && (this.currentPage === 'chats' || this.currentPage === 'dashboard')) {
        this.loadPage(this.currentPage);
      }

      if (document.getElementById('conversationModal') && this.selectedUser) {
        this.renderOpenConversationMessages(this.selectedUser, this.selectedTicket);
      }
    }, 3000);
  }



  renderTicketsPage() {
    try {
      console.log('=== Starting renderTicketsPage ===');
      console.log('Tickets loaded, count:', this.allTicketsList?.length);

      const pendingCount = this.allTicketsList?.filter(t => t.status === 'pending').length || 0;
      const inProgressCount = this.allTicketsList?.filter(t => t.status === 'in-progress').length || 0;
      const completedCount = this.allTicketsList?.filter(t => t.status === 'completed').length || 0;

      console.log('Counts calculated:', { pendingCount, inProgressCount, completedCount });

      // Generate the HTML
      const html = `
    <div class="tickets-admin-page">
      <!-- Ticket Stats -->
      <div class="ticket-stats-grid">
        <div class="ticket-stat-card">
          <div class="ticket-stat-icon pending">
            <i class="fas fa-clock"></i>
          </div>
          <div class="ticket-stat-content">
            <h3>${pendingCount}</h3>
            <p>Pending Tickets</p>
          </div>
        </div>
        
        <div class="ticket-stat-card">
          <div class="ticket-stat-icon progress">
            <i class="fas fa-spinner"></i>
          </div>
          <div class="ticket-stat-content">
            <h3>${inProgressCount}</h3>
            <p>In Progress</p>
          </div>
        </div>
        
        <div class="ticket-stat-card">
          <div class="ticket-stat-icon completed">
            <i class="fas fa-check-circle"></i>
          </div>
          <div class="ticket-stat-content">
            <h3>${completedCount}</h3>
            <p>Completed</p>
          </div>
        </div>
        
        <div class="ticket-stat-card">
          <div class="ticket-stat-icon total">
            <i class="fas fa-ticket-alt"></i>
          </div>
          <div class="ticket-stat-content">
            <h3>${this.allTicketsList?.length || 0}</h3>
            <p>Total Tickets</p>
          </div>
        </div>
      </div>
      
      <!-- Tickets Table -->
      <div class="section-card">
        <div class="section-header">
          <h2><i class="fas fa-ticket-alt"></i> All Service Tickets</h2>
          <div class="header-actions admin-search-control ticket-search-control">
            <input type="search" id="searchTickets" placeholder="Ticket ID, service, customer, or status" class="search-input">
            <button type="button" class="btn-primary search-action" id="searchTicketsBtn" title="Search tickets">
              <i class="fas fa-search"></i><span>Search</span>
            </button>
            <select id="filterStatus" class="filter-select" onchange="adminDashboard.filterTickets()">
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="in-progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <button class="btn-primary" onclick="adminDashboard.refreshTickets()">
              <i class="fas fa-sync-alt"></i> Refresh
            </button>
          </div>
        </div>
        
        <div class="tickets-admin-table-container">
          <table class="tickets-admin-table">
            <thead>
              <tr>
                <th>Ticket ID</th>
                <th>Service</th>
                <th>Customer</th>
                <th>Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody id="ticketsTableBody">
              ${this.generateTicketsRows()}
            </tbody>
          </table>
        </div>
        
        <!-- Ticket Summary -->
        <div class="ticket-summary">
          <div class="summary-item">
            <span class="summary-label">Showing:</span>
            <span class="summary-value" id="ticketSearchSummary">${this.allTicketsList?.length || 0} tickets</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">Last Updated:</span>
            <span class="summary-value" id="lastUpdatedTime">${new Date().toLocaleTimeString()}</span>
          </div>
        </div>
      </div>
    </div>
    `;

      console.log('=== renderTicketsPage completed successfully ===');
      return html;

    } catch (error) {
      console.error('❌ ERROR in renderTicketsPage:', error);
      console.error('Error stack:', error.stack);

      // Return error message
      return `
      <div class="error-container">
        <h2><i class="fas fa-exclamation-triangle"></i> Error Loading Tickets</h2>
        <p>There was an error loading the tickets page:</p>
        <pre>${error.message}</pre>
        <button class="btn-primary" onclick="adminDashboard.loadPage('dashboard')">
          Return to Dashboard
        </button>
      </div>
    `;
    }
  }

  openTicketChat(userId, ticketId) {
    if (!userId || userId === 'N/A') {
      this.showNotification('Invalid user ID', 'error');
      return;
    }

    if (!ticketId || ticketId === 'N/A') {
      this.showNotification('Invalid ticket ID', 'error');
      return;
    }

    // Open conversation in modal with ticket context
    this.openConversation(userId, ticketId);
  }

 
  // Add quick response
  addQuickResponse(text) {
    const replyInput = document.getElementById('adminReply');
    if (replyInput) {
      replyInput.value = text;
      replyInput.focus();
    }
  }



  generateTicketsRows() {
    try {
      if (!this.allTicketsList || this.allTicketsList.length === 0) {
        return `
            <tr>
                <td colspan="6" class="empty-tickets-cell">
                    <div class="empty-tickets-message">
                        <i class="fas fa-ticket-alt" style="font-size: 3rem; opacity: 0.3;"></i>
                        <h4>No Tickets Found</h4>
                        <p>When users submit service forms, tickets will appear here.</p>
                    </div>
                </td>
            </tr>
            `;
      }

      // Sort tickets by date
      const sortedTickets = [...this.allTicketsList].sort((a, b) =>
        new Date(b.createdAt) - new Date(a.createdAt)
      );

      // Generate rows
      return sortedTickets.map(ticket => {
        try {
          // Ensure all required properties exist
          const ticketId = ticket.ticketId || ticket.id || 'N/A';
          const userId = ticket.userId || 'N/A';
          const serviceName = ticket.serviceName || 'Unknown Service';
          const userName = ticket.userName || this.getUserDisplayName(userId);
          const status = ticket.status || 'pending';
          const createdAt = ticket.createdAt ? new Date(ticket.createdAt) : new Date();
          const packageName = ticket.package || '';

          return `
                <tr class="ticket-row ${status}" data-status="${this.escapeHtml(status)}" data-search="${this.escapeHtml([ticketId, userId, serviceName, userName, status, packageName].join(' ').toLowerCase())}">
                    <td>
                        <div class="ticket-id-cell">
                            <code>${ticketId.substring(0, 12)}</code>
                            <small>${userId.substring(0, 8)}</small>
                        </div>
                    </td>
                    <td>
                        <div class="ticket-service-cell">
                            <strong>${this.escapeHtml(serviceName)}</strong>
                            ${packageName ? `<br><small>${this.escapeHtml(packageName)}</small>` : ''}
                        </div>
                    </td>
                    <td>
                        <div class="ticket-customer-cell">
                            <i class="fas fa-user"></i>
                            ${this.escapeHtml(userName)}
                        </div>
                    </td>
                    <td>
                        <span class="ticket-status-badge ${status}">
                            ${status.charAt(0).toUpperCase() + status.slice(1)}
                        </span>
                    </td>
                    <td>
                        ${createdAt.toLocaleDateString()}<br>
                        <small>${createdAt.toLocaleTimeString()}</small>
                    </td>
                    <td>
                        <div class="ticket-actions-cell">
                            <button class="table-btn view" onclick="adminDashboard.viewAdminTicket('${userId}', '${ticketId}')" title="View Details">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="table-btn chat" onclick="adminDashboard.openTicketChat('${userId}', '${ticketId}')" title="Chat about this ticket">
                                <i class="fas fa-comment"></i>
                            </button>
                            <select class="status-select-small" onchange="adminDashboard.updateTicketStatus('${userId}', '${ticketId}', this.value)">
                                <option value="pending" ${status === 'pending' ? 'selected' : ''}>Pending</option>
                                <option value="in-progress" ${status === 'in-progress' ? 'selected' : ''}>In Progress</option>
                                <option value="completed" ${status === 'completed' ? 'selected' : ''}>Completed</option>
                                <option value="cancelled" ${status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
                            </select>
                        </div>
                    </td>
                </tr>
                `;
        } catch (rowError) {
          console.error('Error generating row for ticket:', ticket, rowError);
          return `<tr><td colspan="6">Error loading ticket</td></tr>`;
        }
      }).join('');

    } catch (error) {
      console.error('Error in generateTicketsRows:', error);
      return `<tr><td colspan="6">Error loading tickets</td></tr>`;
    }
  }

  // Add this escapeHtml method to the AdminChatDashboard class
  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  formatMessageContent(message) {
    const repaired = String(message?.content || '')
      .replace(/â¢/g, '-')
      .replace(/â|â€“/g, '-')
      .replace(/Ã/g, 'x');
    if (!/^NEW SERVICE REQUEST/i.test(repaired)) {
      return this.escapeHtml(repaired).replace(/\n/g, '<br>');
    }
    const valueFor = label => repaired.match(new RegExp(`^${label}:\\s*(.+)$`, 'im'))?.[1]?.trim() || '';
    const fields = repaired.split('\n').map(line => line.trim().match(/^[-*]\s*([^:]+):\s*(.*)$/)).filter(Boolean);
    const ticketId = repaired.match(/Ticket #([^\s]+)/i)?.[1] || '';
    return `
      <article class="ticket-chat-summary">
        <div class="ticket-chat-summary__header">
          <span class="ticket-chat-summary__icon"><i class="fas fa-ticket-alt"></i></span>
          <span><small>Service request</small><strong>${this.escapeHtml(valueFor('Service') || 'New service request')}</strong></span>
        </div>
        <div class="ticket-chat-summary__meta">
          ${ticketId ? `<div><span>Ticket</span><strong>#${this.escapeHtml(ticketId)}</strong></div>` : ''}
          ${valueFor('Customer') ? `<div><span>Customer</span><strong>${this.escapeHtml(valueFor('Customer'))}</strong></div>` : ''}
          ${valueFor('Package') ? `<div><span>Package</span><strong>${this.escapeHtml(valueFor('Package'))}</strong></div>` : ''}
          ${valueFor('Submitted') ? `<div><span>Submitted</span><strong>${this.escapeHtml(valueFor('Submitted'))}</strong></div>` : ''}
        </div>
        ${fields.length ? `<div class="ticket-chat-summary__details">${fields.map(field => `
          <div><span>${this.escapeHtml(field[1])}</span><strong>${this.escapeHtml(field[2])}</strong></div>
        `).join('')}</div>` : ''}
      </article>
    `;
  }

  viewAdminTicket(userId, ticketId) {
    try {
      console.log('Viewing ticket:', { userId, ticketId });

      const tickets = JSON.parse(localStorage.getItem('tekagon_tickets') || '{}');
      const ticket = this.getTicket(userId, ticketId);

      if (!ticket) {
        alert('Ticket not found');
        return;
      }

      console.log('Ticket found:', ticket);

      // Format form data for display in grid
      const formDataHtml = Object.entries(ticket.formData || {})
        .map(([key, value]) => {
          let displayValue = value;

          // Handle arrays (like checkboxes)
          if (Array.isArray(value)) {
            displayValue = value.join(', ');
          }

          // Handle empty values
          if (!displayValue || displayValue.toString().trim() === '') {
            displayValue = '<span style="color: #94a3b8; font-style: italic;">Not provided</span>';
          }

          // Handle long values
          if (displayValue.toString().length > 100) {
            displayValue = displayValue.toString().substring(0, 100) + '...';
          }

          return `
                <div class="form-data-item">
                    <div class="form-data-key">
                        <i class="fas fa-fw fa-${this.getFormFieldIcon(key)}"></i>
                        ${this.formatFormFieldName(key)}
                    </div>
                    <div class="form-data-value">${displayValue}</div>
                </div>
            `;
        })
        .join('');

      // Create modal HTML with new layout
      const modalHTML = `
        <div class="admin-ticket-modal" id="adminTicketModal">
            <div class="modal-overlay" onclick="adminDashboard.closeAdminModal()"></div>
            <div class="modal-content">
                <div class="modal-header">
                    <h3><i class="fas fa-ticket-alt"></i> Ticket Details - #${ticket.id.substring(0, 10)}</h3>
                    <button class="modal-close" onclick="adminDashboard.closeAdminModal()">×</button>
                </div>
                
                <div class="modal-body">
                    <!-- Ticket Information Grid -->
                    <div class="ticket-info-grid">
                        <!-- Basic Information -->
                        <div class="info-section">
                            <h4><i class="fas fa-info-circle"></i> Basic Information</h4>
                            <div class="info-grid">
                                <div class="info-item">
                                    <label>Status</label>
                                    <div class="info-value ${ticket.status}">
                                        <span class="status-badge ${ticket.status}">
                                            <i class="fas fa-${this.getStatusIcon(ticket.status)}"></i>
                                            ${ticket.status.toUpperCase()}
                                        </span>
                                    </div>
                                </div>
                                <div class="info-item">
                                    <label>Service</label>
                                    <div class="info-value">${ticket.serviceName}</div>
                                </div>
                                <div class="info-item">
                                    <label>Package</label>
                                    <div class="info-value">${ticket.formData?.package || 'Not specified'}</div>
                                </div>
                                <div class="info-item">
                                    <label>Created</label>
                                    <div class="info-value">${new Date(ticket.createdAt).toLocaleString()}</div>
                                </div>
                                <div class="info-item">
                                    <label>Last Updated</label>
                                    <div class="info-value">${ticket.updatedAt ? new Date(ticket.updatedAt).toLocaleString() : 'Never'}</div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Customer Information -->
                        <div class="info-section">
                            <h4><i class="fas fa-user-circle"></i> Customer Information</h4>
                            <div class="info-grid">
                                <div class="info-item">
                                    <label>Name</label>
                                    <div class="info-value">${ticket.userName}</div>
                                </div>
                                <div class="info-item">
                                    <label>User ID</label>
                                    <div class="info-value"><code>${ticket.userId}</code></div>
                                </div>
                                <div class="info-item">
                                    <label>Email</label>
                                    <div class="info-value">${ticket.formData?.email || 'Not provided'}</div>
                                </div>
                                <div class="info-item">
                                    <label>Phone</label>
                                    <div class="info-value">${ticket.formData?.phone || 'Not provided'}</div>
                                </div>
                                <div class="info-item">
                                    <label>Company/Business</label>
                                    <div class="info-value">${ticket.formData?.businessName || 'Not provided'}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Form Data Section -->
                    ${formDataHtml ? `
                    <div class="form-data-section">
                        <h4><i class="fas fa-file-alt"></i> Form Submission Details</h4>
                        <div class="form-data-grid">
                            ${formDataHtml}
                        </div>
                    </div>
                    ` : ''}
                    
                    <!-- Admin Notes Section -->
                    <div class="notes-section">
                        <h4><i class="fas fa-sticky-note"></i> Admin Notes & Communication</h4>
                        <textarea id="adminTicketNotes" placeholder="Add notes about this ticket...">${ticket.adminNotes || ''}</textarea>
                        <div class="notes-actions">
                            <button class="btn-save-notes" onclick="adminDashboard.saveTicketNotes('${userId}', '${ticketId}')">
                                <i class="fas fa-save"></i> Save Notes
                            </button>
                            <button class="btn-add-to-chat" onclick="adminDashboard.addTicketToChat('${userId}', '${ticketId}')">
                                <i class="fas fa-comment"></i> Start Chat
                            </button>
                        </div>
                    </div>
                </div>
                
                <div class="modal-footer">
                    <button class="btn-secondary" onclick="adminDashboard.closeAdminModal()">
                        <i class="fas fa-times"></i> Close
                    </button>
                    <button class="btn-status" onclick="adminDashboard.openStatusModal('${userId}', '${ticketId}')">
                        <i class="fas fa-sync-alt"></i> Change Status
                    </button>
                    <button class="btn-primary" onclick="adminDashboard.startChatWithUser('${userId}', '${ticketId}')">
                        <i class="fas fa-comments"></i> Chat Now
                    </button>
                </div>
            </div>
        </div>
    `;

      // Remove existing modal
      const existingModal = document.getElementById('adminTicketModal');
      if (existingModal) existingModal.remove();

      // Add new modal
      document.body.insertAdjacentHTML('beforeend', modalHTML);

      // Add modal styles if not already added
      this.addTicketModalStyles();

    } catch (error) {
      console.error('Error viewing ticket:', error);
      alert('Error loading ticket details: ' + error.message);
    }
  }



  // Add this helper method for form field icons
  getFormFieldIcon(fieldName) {
    const iconMap = {
      'fullName': 'user',
      'email': 'envelope',
      'phone': 'phone',
      'businessName': 'building',
      'company': 'building',
      'website': 'globe',
      'budget': 'dollar-sign',
      'package': 'box',
      'services': 'list',
      'message': 'comment',
      'description': 'file-alt',
      'deadline': 'calendar',
      'timeline': 'clock',
      'requirements': 'clipboard-list',
      'preferences': 'star',
      'questions': 'question-circle'
    };

    return iconMap[fieldName] || 'info-circle';
  }

  formatFormFieldName(key) {
    // Convert camelCase or snake_case to readable format
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/_/g, ' ')
      .replace(/^\w/, c => c.toUpperCase())
      .replace(/\b\w/g, l => l.toUpperCase());
  }

  chatWithUser(userId) {
    console.log('Opening chat with user:', userId);

    // Store the userId for the conversation
    localStorage.setItem('admin_chat_userId', userId);

    // Open conversation
    this.openConversation(userId);
  }

  startChatWithUser(userId, ticketId) {
    console.log('Starting chat for ticket:', ticketId);

    // Store both userId and ticketId
    localStorage.setItem('admin_chat_userId', userId);
    localStorage.setItem('admin_chat_ticketId', ticketId);

    // Close the ticket modal
    this.closeAdminModal();

    // Open conversation
    this.openConversation(userId, ticketId);

    // Auto-fill message about the ticket
    setTimeout(() => {
      const adminReply = document.getElementById('adminReply');
      if (adminReply) {
        const ticket = this.getTicket(userId, ticketId);
        if (ticket) {
          adminReply.value = `Regarding your ${ticket.serviceName} request (Ticket #${ticketId}): `;
          adminReply.focus();
        }
      }
    }, 500);
  }

  getTicket(userId, ticketId) {
    try {
      const tickets = JSON.parse(localStorage.getItem('tekagon_tickets') || '{}');
      return tickets[userId]?.[ticketId] ||
        this.allTicketsList.find(ticket => (ticket.id || ticket.ticketId) === ticketId && ticket.userId === userId) ||
        null;
    } catch (error) {
      console.error('Error getting ticket:', error);
      return null;
    }
  }

  async updateTicketStatus(userId, ticketId, newStatus) {
    try {
      console.log('Updating ticket status:', { userId, ticketId, newStatus });

      // Get tickets from localStorage
      const tickets = JSON.parse(localStorage.getItem('tekagon_tickets') || '{}');

      // Update in user's tickets
      if (tickets[userId] && tickets[userId][ticketId]) {
        tickets[userId][ticketId].status = newStatus;
        tickets[userId][ticketId].updatedAt = new Date().toISOString();
        localStorage.setItem('tekagon_tickets', JSON.stringify(tickets));
        console.log('Updated in tekagon_tickets');
      }

      // Update in allTickets list
      const allTickets = JSON.parse(localStorage.getItem('tekagon_all_tickets') || '[]');
      const ticketIndex = allTickets.findIndex(t => t.ticketId === ticketId);

      if (ticketIndex > -1) {
        allTickets[ticketIndex].status = newStatus;
        allTickets[ticketIndex].updatedAt = new Date().toISOString();
        localStorage.setItem('tekagon_all_tickets', JSON.stringify(allTickets));
        console.log('Updated in tekagon_all_tickets');
      } else {
        // Ticket not found in allTickets, add it
        const ticket = tickets[userId] ? tickets[userId][ticketId] : null;
        if (ticket) {
          allTickets.push({
            ticketId: ticketId,
            userId: userId,
            serviceName: ticket.serviceName,
            userName: ticket.userName,
            status: newStatus,
            createdAt: ticket.createdAt,
            updatedAt: new Date().toISOString()
          });
          localStorage.setItem('tekagon_all_tickets', JSON.stringify(allTickets));
          console.log('Added to tekagon_all_tickets');
        }
      }

      const backendResult = await window.TekagonAPI?.updateTicketStatus?.(ticketId, newStatus);
      if (backendResult && !backendResult.success) {
        throw new Error(backendResult.error || 'Backend status update failed');
      }
      const inMemoryTicket = this.allTicketsList.find(ticket => (ticket.id || ticket.ticketId) === ticketId);
      if (inMemoryTicket) {
        inMemoryTicket.status = newStatus;
        inMemoryTicket.updatedAt = new Date().toISOString();
      }

      // Show success notification
      this.showNotification(`Ticket status updated to ${newStatus}`, 'success');

      // Refresh the tickets page if we're on it
      if (this.currentPage === 'tickets') {
        setTimeout(() => {
          this.loadPage('tickets');
        }, 1000);
      }

    } catch (error) {
      console.error('Error updating ticket status:', error);
      this.showNotification('Failed to update ticket status', 'error');
    }
  }

  openStatusModal(userId, ticketId) {
    const ticket = this.getTicket(userId, ticketId);
    if (!ticket) return;

    // Close any existing status modal first
    this.closeStatusModal();

    const modalHTML = `
    <div class="status-modal" id="statusModal">
        <div class="modal-content">
            <div class="modal-header">
                <h3><i class="fas fa-sync-alt"></i> Change Ticket Status</h3>
                <button class="modal-close" onclick="adminDashboard.closeStatusModal()">×</button>
            </div>
            
            <div class="modal-body">
                <div class="current-status">
                    <p>Current status:</p>
                    <div class="current-status-badge ${ticket.status}">
                        <i class="fas fa-${this.getStatusIcon(ticket.status)}"></i>
                        <span>${ticket.status.charAt(0).toUpperCase() + ticket.status.slice(1)}</span>
                    </div>
                </div>
                
                <div class="status-options">
                    <label class="status-option ${ticket.status === 'pending' ? 'selected' : ''}">
                        <input type="radio" name="newStatus" value="pending" ${ticket.status === 'pending' ? 'checked' : ''}>
                        <div class="status-content">
                            <div class="status-icon pending">
                                <i class="fas fa-clock"></i>
                            </div>
                            <div class="status-text">
                                <div class="status-title">Pending</div>
                                <div class="status-desc">Waiting for action</div>
                            </div>
                        </div>
                    </label>
                    
                    <label class="status-option ${ticket.status === 'in-progress' ? 'selected' : ''}">
                        <input type="radio" name="newStatus" value="in-progress" ${ticket.status === 'in-progress' ? 'checked' : ''}>
                        <div class="status-content">
                            <div class="status-icon progress">
                                <i class="fas fa-spinner"></i>
                            </div>
                            <div class="status-text">
                                <div class="status-title">In Progress</div>
                                <div class="status-desc">Currently being worked on</div>
                            </div>
                        </div>
                    </label>
                    
                    <label class="status-option ${ticket.status === 'completed' ? 'selected' : ''}">
                        <input type="radio" name="newStatus" value="completed" ${ticket.status === 'completed' ? 'checked' : ''}>
                        <div class="status-content">
                            <div class="status-icon completed">
                                <i class="fas fa-check-circle"></i>
                            </div>
                            <div class="status-text">
                                <div class="status-title">Completed</div>
                                <div class="status-desc">Work finished</div>
                            </div>
                        </div>
                    </label>
                    
                    <label class="status-option ${ticket.status === 'cancelled' ? 'selected' : ''}">
                        <input type="radio" name="newStatus" value="cancelled" ${ticket.status === 'cancelled' ? 'checked' : ''}>
                        <div class="status-content">
                            <div class="status-icon cancelled">
                                <i class="fas fa-times-circle"></i>
                            </div>
                            <div class="status-text">
                                <div class="status-title">Cancelled</div>
                                <div class="status-desc">Request cancelled</div>
                            </div>
                        </div>
                    </label>
                </div>
                
                <div class="status-notes">
                    <label for="statusChangeNote">Add a note (optional):</label>
                    <textarea id="statusChangeNote" placeholder="Why are you changing the status? Any additional comments..." rows="3"></textarea>
                </div>
            </div>
            
            <div class="modal-footer">
                <button class="btn-secondary" onclick="adminDashboard.closeStatusModal()">
                    Cancel
                </button>
                <button class="btn-primary" onclick="adminDashboard.confirmStatusChange('${userId}', '${ticketId}')">
                    Update Status
                </button>
            </div>
        </div>
    </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Add styles if not already added
    this.addStatusModalStyles();



    // Add event listeners for radio buttons
    setTimeout(() => {
      document.querySelectorAll('.status-option').forEach(option => {
        option.addEventListener('click', function () {
          document.querySelectorAll('.status-option').forEach(opt => opt.classList.remove('selected'));
          this.classList.add('selected');
          this.querySelector('input').checked = true;
        });
      });
    }, 100);
  }
  closeStatusModal() {
    const modal = document.getElementById('statusModal');
    if (modal) modal.remove();
  }

  confirmStatusChange(userId, ticketId) {
    const newStatus = document.querySelector('input[name="newStatus"]:checked')?.value;
    const note = document.getElementById('statusChangeNote')?.value;

    if (!newStatus) {
      this.showNotification('Please select a status', 'error');
      return;
    }

    // Update status
    this.updateTicketStatus(userId, ticketId, newStatus);

    // Add note if provided
    if (note && note.trim()) {
      this.addTicketNote(userId, ticketId, `Status changed to ${newStatus}: ${note}`);
    }

    // Close modal
    this.closeStatusModal();

    // Close ticket modal if open
    this.closeAdminModal();
  }

  addTicketNote(userId, ticketId, note) {
    try {
      const tickets = JSON.parse(localStorage.getItem('tekagon_tickets') || '{}');
      if (tickets[userId] && tickets[userId][ticketId]) {
        if (!tickets[userId][ticketId].adminNotes) {
          tickets[userId][ticketId].adminNotes = '';
        }
        tickets[userId][ticketId].adminNotes += `\n[${new Date().toLocaleString()}] ${note}`;
        localStorage.setItem('tekagon_tickets', JSON.stringify(tickets));
      }
    } catch (error) {
      console.error('Error adding ticket note:', error);
    }
  }

  

  // Update renderAdminChatMessage to show ticket context
  renderAdminChatMessage(msg, userName) {
    const time = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const date = new Date(msg.timestamp).toLocaleDateString();
    const isFromAdmin = msg.sender === 'admin';

    return `
    <div class="admin-message ${isFromAdmin ? 'from-admin' : 'from-user'}">
        <div class="message-header">
            <span class="message-sender">
                ${isFromAdmin ? 'You (Admin)' : userName}
            </span>
            <span class="message-time">${date} ${time}</span>
        </div>
        <div class="message-content">${this.formatMessageContent(msg)}</div>
        ${msg.ticketId ? `
            <div class="message-context">
                <i class="fas fa-ticket-alt"></i>
                Ticket #${msg.ticketId.substring(0, 10)}
            </div>
        ` : ''}
        ${msg.read && !isFromAdmin ?
        '<div class="message-status"><i class="fas fa-check-double"></i> Read</div>' :
        ''
      }
    </div>
    `;
  }

 
  

  // Add this method for saving ticket messages
  saveTicketMessage(userId, ticketId, message) {
    try {
      const ticketChats = JSON.parse(localStorage.getItem(TICKET_CHAT_KEY) || '{}');

      if (!ticketChats[ticketId]) {
        ticketChats[ticketId] = [];
      }

      ticketChats[ticketId] = this.mergeMessages(ticketChats[ticketId], message);
      localStorage.setItem(TICKET_CHAT_KEY, JSON.stringify(ticketChats));

      return true;
    } catch (e) {
      console.error('Failed to save ticket message:', e);
      return false;
    }
  }

  // Add this method to track unread messages
  updateUnreadNotification() {
    // Count unread messages across all conversations
    let unreadCount = 0;

    // Check general conversations
    Object.values(this.conversations).forEach(messages => {
      unreadCount += messages.filter(msg =>
        msg.sender !== 'admin' && !msg.read
      ).length;
    });

    // Check ticket chats
    try {
      const ticketChats = JSON.parse(localStorage.getItem(TICKET_CHAT_KEY) || '{}');
      Object.values(ticketChats).forEach(messages => {
        unreadCount += messages.filter(msg =>
          msg.sender !== 'admin' && !msg.read
        ).length;
      });
    } catch (e) {
      console.error('Error checking ticket chats:', e);
    }

    // Update badge
    const badge = document.getElementById('unreadBadge');
    if (badge) {
      badge.textContent = unreadCount;
      badge.style.display = unreadCount > 0 ? 'flex' : 'none';
    }

    // Update page title
    if (unreadCount > 0) {
      document.title = `(${unreadCount}) Admin - Tekagon`;
    } else {
      document.title = 'Admin - Tekagon';
    }
  }


  // Mark messages as read (with ticket context)
  async markAsRead(userId, ticketId = null) {
    if (ticketId) {
      // Mark ticket messages as read
      const ticketChats = JSON.parse(localStorage.getItem(TICKET_CHAT_KEY) || '{}');
      if (ticketChats[ticketId]) {
        let updated = false;
        ticketChats[ticketId].forEach(msg => {
          if (!msg.read && msg.sender !== 'admin') {
            msg.read = true;
            updated = true;
          }
        });

        if (updated) {
          localStorage.setItem(TICKET_CHAT_KEY, JSON.stringify(ticketChats));
        }
      }
    } else {
      // Mark general messages as read
      if (!this.conversations[userId]) return;

      let updated = false;
      this.conversations[userId].forEach(msg => {
        if (!msg.read && msg.sender !== 'admin') {
          msg.read = true;
          updated = true;
        }
      });

      if (updated) {
        localStorage.setItem('tekagon_chat_conversations', JSON.stringify(this.conversations));
      }
    }

    this.calculateStats();
    this.updateBadge();
    if (!ticketId) {
      const result = await window.TekagonAPI?.markMessagesRead?.(userId);
      if (result && !result.success) console.warn('Backend read status update failed', result.error);
    }
  }

  renderChatMessage(msg, userName) {
    const time = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const date = new Date(msg.timestamp).toLocaleDateString();

    if (msg.sender === 'user') {
      return `
      <div class="admin-message user">
        <div class="message-header">
          <span class="message-sender">${userName}</span>
          <span class="message-time">${date} ${time}</span>
        </div>
        <div class="message-content">${this.formatMessageContent(msg)}</div>
      </div>
    `;
    } else {
      const senderName = msg.sender === 'bot' ? 'Tekagon Support' : 'Admin';
      return `
      <div class="admin-message admin">
        <div class="message-header">
          <span class="message-sender">${senderName}</span>
          <span class="message-time">${date} ${time}</span>
        </div>
        <div class="message-content">${this.formatMessageContent(msg)}</div>
        ${msg.read ? '<div class="message-status"><i class="fas fa-check-double"></i> Read</div>' : ''}
      </div>
    `;
    }
  }

  async sendAdminReply(userId, ticketId = '') {
  const replyInput = document.getElementById('adminReply');
  const message = replyInput.value.trim();

  if (!message) {
    alert('Please enter a message');
    return;
  }

  const adminMessage = {
    id: 'admin_' + Date.now(),
    sender: 'admin',
    content: message,
    timestamp: new Date().toISOString(),
    read: false,
    ticketId: ticketId || null,
    userId: userId
  };

  if (ticketId) {
    this.saveTicketMessage(userId, ticketId, adminMessage);
  } else {
    this.setConversationMessages(userId, adminMessage);
  }
  this.renderOpenConversationMessages(userId, ticketId || null);

  // Save to MongoDB
  if (window.TekagonAPI) {
    try {
      const result = await window.TekagonAPI.sendMessage({
        id: adminMessage.id,
        clientId: adminMessage.id,
        sender: 'admin',
        content: message,
        userId: userId,
        ticketId: ticketId || null,
        read: false
      });
      if (result && result.success && result.message) {
        const savedMessage = { ...result.message, id: result.message.clientId || adminMessage.id };
        if (ticketId) {
          this.saveTicketMessage(userId, ticketId, savedMessage);
        } else {
          this.setConversationMessages(userId, savedMessage);
        }
        this.renderOpenConversationMessages(userId, ticketId || null);
      }
      console.log('✅ Admin message saved to MongoDB');
    } catch (err) {
      console.warn('⚠️ MongoDB save failed:', err);
    }
  }

  replyInput.value = '';
  replyInput.focus();
  this.calculateStats();
  this.updateBadge();
}

  addTicketMessage(userId, ticketId, message, sender) {
    try {
      const tickets = JSON.parse(localStorage.getItem('tekagon_tickets') || '{}');
      if (tickets[userId] && tickets[userId][ticketId]) {
        if (!tickets[userId][ticketId].messages) {
          tickets[userId][ticketId].messages = [];
        }
        tickets[userId][ticketId].messages.push({
          sender: sender,
          content: message,
          timestamp: new Date().toISOString()
        });
        localStorage.setItem('tekagon_tickets', JSON.stringify(tickets));
        return true;
      }
    } catch (error) {
      console.error('Error adding ticket message:', error);
    }
    return false;
  }

  getTicketUserName(userId) {
    try {
      const tickets = JSON.parse(localStorage.getItem('tekagon_tickets') || '{}');
      const userTickets = tickets[userId];
      if (userTickets) {
        const firstTicket = Object.values(userTickets)[0];
        return firstTicket?.userName || null;
      }
    } catch (error) {
      console.error('Error getting ticket user name:', error);
    }
    return null;
  }

  // Add status modal styles
  addStatusModalStyles() {
  }


  // Add these helper methods to your class

  addTicketModalStyles() {
    if (document.getElementById('ticketModalStyles')) return;

    const style = document.createElement('style');
    style.id = 'ticketModalStyles';
    style.textContent = `

    /* Red notification badge */
.badge {
    background-color: #ef4444 !important;
    color: white !important;
    font-size: 12px;
    font-weight: bold;
    padding: 2px 6px;
    border-radius: 10px;
    margin-left: 8px;
}

/* Message unread indicator */
.unread .message-header {
    font-weight: bold;
}

.unread .message-content {
    border-left: 3px solid #ef4444;
    padding-left: 8px;
}

/* Chat sections in admin */
.chat-sections {
    display: flex;
    flex-direction: column;
    gap: 15px;
    margin-bottom: 20px;
}

.chat-section {
    padding: 15px;
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 8px;
    cursor: pointer;
}

.chat-section.active {
    background: rgba(124, 92, 255, 0.1);
    border-color: rgba(124, 92, 255, 0.3);
}

.chat-section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
}

.section-unread {
    background: #ef4444;
    color: white;
    padding: 2px 8px;
    border-radius: 10px;
    font-size: 12px;
}
    
        .admin-ticket-modal {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: #0f172a;
            z-index: 10000;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            backdrop-filter: blur(10px);
        }
        
        .modal-overlay {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.9);
            backdrop-filter: blur(5px);
        }
        
        .admin-ticket-modal .modal-content {
            position: relative;
            background: #1e293b;
            width: 100%;
            height: 100%;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            z-index: 2;
            border: 1px solid rgba(124, 92, 255, 0.1);
        }
        
        .modal-header {
            padding: 20px 30px;
            background: linear-gradient(135deg, rgba(18, 27, 45, 0.95), rgba(30, 41, 59, 0.9));
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-shrink: 0;
        }
        
        .modal-header h3 {
            margin: 0;
            font-size: 1.5rem;
            display: flex;
            align-items: center;
            gap: 12px;
            background: linear-gradient(to right, #93fff6, #6f65ff);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        
        .modal-close {
            background: rgba(239, 68, 68, 0.1);
            border: 1px solid rgba(239, 68, 68, 0.3);
            color: #ef4444;
            font-size: 20px;
            cursor: pointer;
            width: 40px;
            height: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 8px;
            transition: all 0.2s;
        }
        
        .modal-close:hover {
            background: rgba(239, 68, 68, 0.2);
            transform: scale(1.1);
        }
        
        .modal-body {
            flex: 1;
            overflow-y: auto;
            padding: 30px;
            display: flex;
            flex-direction: column;
            gap: 25px;
        }
        
        /* Ticket Information Sections */
        .ticket-info-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 25px;
            margin-bottom: 10px;
        }
        
        .info-section {
            background: rgba(255, 255, 255, 0.02);
            border: 1px solid rgba(255, 255, 255, 0.05);
            border-radius: 12px;
            padding: 25px;
            transition: all 0.3s;
        }
        
        .info-section:hover {
            border-color: rgba(124, 92, 255, 0.2);
            transform: translateY(-2px);
        }
        
        .info-section h4 {
            margin: 0 0 20px 0;
            font-size: 1.1rem;
            color: #93fff6;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .info-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
            gap: 15px;
        }
        
        .info-item {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }
        
        .info-item label {
            font-size: 0.85rem;
            color: #94a3b8;
            font-weight: 500;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .info-value {
            font-size: 1rem;
            color: #e2e8f0;
            font-weight: 500;
            word-break: break-word;
        }
        
        .info-value.pending { color: #f59e0b; }
        .info-value.in-progress { color: #3b82f6; }
        .info-value.completed { color: #10b981; }
        .info-value.cancelled { color: #ef4444; }
        
        /* Form Data Section */
        .form-data-section {
            background: rgba(255, 255, 255, 0.02);
            border: 1px solid rgba(255, 255, 255, 0.05);
            border-radius: 12px;
            padding: 25px;
            margin-top: 10px;
        }
        
        .form-data-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 20px;
        }
        
        .form-data-item {
            background: rgba(255, 255, 255, 0.01);
            border: 1px solid rgba(255, 255, 255, 0.03);
            border-radius: 8px;
            padding: 20px;
            transition: all 0.2s;
        }
        
        .form-data-item:hover {
            background: rgba(255, 255, 255, 0.02);
            border-color: rgba(124, 92, 255, 0.1);
        }
        
        .form-data-key {
            font-size: 0.9rem;
            color: #93fff6;
            font-weight: 500;
            margin-bottom: 8px;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .form-data-value {
            font-size: 1rem;
            color: #cbd5e1;
            line-height: 1.5;
            word-break: break-word;
        }
        
        /* Notes Section */
        .notes-section {
            background: rgba(255, 255, 255, 0.02);
            border: 1px solid rgba(255, 255, 255, 0.05);
            border-radius: 12px;
            padding: 25px;
            margin-top: 10px;
        }
        
        .notes-section h4 {
            margin: 0 0 20px 0;
            font-size: 1.1rem;
            color: #93fff6;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        #adminTicketNotes {
            width: 100%;
            min-height: 120px;
            padding: 15px;
            background: rgba(255, 255, 255, 0.03);
            border: 1px solid rgba(124, 92, 255, 0.2);
            border-radius: 8px;
            color: #e2e8f0;
            font-size: 0.95rem;
            font-family: inherit;
            resize: vertical;
            transition: all 0.2s;
        }
        
        #adminTicketNotes:focus {
            outline: none;
            border-color: #6f65ff;
            box-shadow: 0 0 0 2px rgba(124, 92, 255, 0.1);
        }
        
        .notes-actions {
            display: flex;
            gap: 15px;
            margin-top: 20px;
        }
        
        .btn-save-notes, .btn-add-to-chat {
            padding: 12px 24px;
            border-radius: 8px;
            font-size: 0.95rem;
            font-weight: 500;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 8px;
            transition: all 0.3s;
            border: none;
        }
        
        .btn-save-notes {
            background: linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(16, 185, 129, 0.1));
            border: 1px solid rgba(16, 185, 129, 0.3);
            color: #10b981;
        }
        
        .btn-add-to-chat {
            background: linear-gradient(135deg, rgba(124, 92, 255, 0.2), rgba(111, 101, 255, 0.1));
            border: 1px solid rgba(124, 92, 255, 0.3);
            color: #93fff6;
        }
        
        .btn-save-notes:hover, .btn-add-to-chat:hover {
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
        }
        
        /* Footer Actions */
        .modal-footer {
            padding: 25px 30px;
            background: linear-gradient(135deg, rgba(18, 27, 45, 0.95), rgba(30, 41, 59, 0.9));
            border-top: 1px solid rgba(255, 255, 255, 0.1);
            display: flex;
            justify-content: flex-end;
            gap: 15px;
            flex-shrink: 0;
        }
        
        .btn-secondary, .btn-primary, .btn-status {
            padding: 14px 28px;
            border-radius: 8px;
            font-size: 0.95rem;
            font-weight: 500;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 10px;
            transition: all 0.3s;
            border: none;
        }
        
        .btn-secondary {
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            color: #e2e8f0;
        }
        
        .btn-primary {
            background: linear-gradient(135deg, #6f65ff, #93fff6);
            color: #0f172a;
            font-weight: 600;
        }
        
        .btn-status {
            background: linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(245, 158, 11, 0.1));
            border: 1px solid rgba(245, 158, 11, 0.3);
            color: #f59e0b;
        }
        
        .btn-secondary:hover {
            background: rgba(255, 255, 255, 0.1);
            transform: translateY(-2px);
        }
        
        .btn-primary:hover {
            opacity: 0.9;
            transform: translateY(-2px);
            box-shadow: 0 5px 20px rgba(111, 101, 255, 0.3);
        }
        
        .btn-status:hover {
            background: linear-gradient(135deg, rgba(245, 158, 11, 0.3), rgba(245, 158, 11, 0.2));
            transform: translateY(-2px);
        }
        
        /* Status Badge */
        .status-badge {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 6px 15px;
            border-radius: 20px;
            font-size: 0.9rem;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .status-badge.pending {
            background: rgba(245, 158, 11, 0.15);
            color: #f59e0b;
            border: 1px solid rgba(245, 158, 11, 0.3);
        }
        
        .status-badge.in-progress {
            background: rgba(59, 130, 246, 0.15);
            color: #3b82f6;
            border: 1px solid rgba(59, 130, 246, 0.3);
        }
        
        .status-badge.completed {
            background: rgba(16, 185, 129, 0.15);
            color: #10b981;
            border: 1px solid rgba(16, 185, 129, 0.3);
        }
        
        .status-badge.cancelled {
            background: rgba(239, 68, 68, 0.15);
            color: #ef4444;
            border: 1px solid rgba(239, 68, 68, 0.3);
        }
        
        /* Responsive Design */
        @media (max-width: 1200px) {
            .ticket-info-grid {
                grid-template-columns: 1fr;
            }
            
            .form-data-grid {
                grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
            }
        }
        
        @media (max-width: 768px) {
            .modal-body {
                padding: 20px;
            }
            
            .info-grid {
                grid-template-columns: 1fr;
            }
            
            .form-data-grid {
                grid-template-columns: 1fr;
            }
            
            .modal-footer {
                flex-direction: column;
            }
            
            .btn-secondary, .btn-primary, .btn-status {
                width: 100%;
                justify-content: center;
            }
            
            .notes-actions {
                flex-direction: column;
            }
            
            .btn-save-notes, .btn-add-to-chat {
                width: 100%;
                justify-content: center;
            }
        }
        
        /* Scrollbar Styling */
        .modal-body::-webkit-scrollbar {
            width: 8px;
        }
        
        .modal-body::-webkit-scrollbar-track {
            background: rgba(255, 255, 255, 0.02);
            border-radius: 4px;
        }
        
        .modal-body::-webkit-scrollbar-thumb {
            background: rgba(124, 92, 255, 0.3);
            border-radius: 4px;
        }
        
        .modal-body::-webkit-scrollbar-thumb:hover {
            background: rgba(124, 92, 255, 0.5);
        }
        
        /* Section Animations */
        .info-section, .form-data-section, .notes-section {
            animation: fadeInUp 0.4s ease-out;
        }
        
        @keyframes fadeInUp {
            from {
                opacity: 0;
                transform: translateY(20px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
    `;
    document.head.appendChild(style);
  }

  showNotification(message, type = 'info') {
    // Remove existing notification
    const existingNotification = document.querySelector('.admin-notification');
    if (existingNotification) existingNotification.remove();

    // Create notification element
    const notification = document.createElement('div');
    notification.className = `admin-notification ${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        </div>
    `;

    // Add to body
    document.body.appendChild(notification);

    // Remove after 3 seconds
    setTimeout(() => {
      notification.style.opacity = '0';
      notification.style.transform = 'translateX(100%)';
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

  playNotificationSound() {
    const sound = this.adminSettings.notifications.sound;
    if (!sound || sound === 'none') return;
    try {
      const context = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = sound === 'bell' ? 'sine' : 'triangle';
      oscillator.frequency.value = sound === 'chime' ? 660 : sound === 'bell' ? 880 : 520;
      gain.gain.setValueAtTime(0.08, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.35);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.35);
    } catch (error) {
      console.warn('Notification sound could not play', error);
    }
  }

  closeAdminModal() {
    const modal = document.getElementById('adminTicketModal');
    if (modal) modal.remove();
  }

  async saveTicketNotes(userId, ticketId) {
    try {
      const notes = document.getElementById('adminTicketNotes')?.value || '';
      const tickets = JSON.parse(localStorage.getItem('tekagon_tickets') || '{}');

      if (tickets[userId] && tickets[userId][ticketId]) {
        tickets[userId][ticketId].adminNotes = notes;
        localStorage.setItem('tekagon_tickets', JSON.stringify(tickets));
      }
      const result = await window.TekagonAPI?.updateAdminTicketNotes?.(ticketId, notes);
      if (result && !result.success) throw new Error(result.error || 'Backend notes update failed');
      const ticket = this.allTicketsList.find(item => (item.id || item.ticketId) === ticketId);
      if (ticket) ticket.adminNotes = notes;
      this.showNotification('Notes saved successfully', 'success');
    } catch (error) {
      console.error('Error saving notes:', error);
      this.showNotification('Failed to save notes', 'error');
    }
  }

  addTicketToChat(userId, ticketId) {
    const notes = document.getElementById('adminTicketNotes')?.value || '';
    if (notes.trim()) {
      this.saveTicketNotes(userId, ticketId);
    }
    this.closeAdminModal();
    this.startChatWithUser(userId, ticketId);
  }

  addQuickResponse(userId) {
    const quickResponses = [
      "Hello! How can I assist you today?",
      "Thank you for contacting us. One moment please.",
      "I'm looking into your request now.",
      "Could you please provide more details?",
      "This has been forwarded to our technical team.",
      "We appreciate your patience."
    ];

    const randomResponse = quickResponses[Math.floor(Math.random() * quickResponses.length)];
    const replyInput = document.getElementById('adminReply');
    if (replyInput) {
      replyInput.value = randomResponse;
      replyInput.focus();
    }
  }

  addAdminStyles() {
    if (document.getElementById('adminStyles')) return;

    const style = document.createElement('style');
    style.id = 'adminStyles';
    style.textContent = `
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
        background: #0f172a;
        color: #e2e8f0;
        min-height: 100vh;
      }

      /* Ticket Admin Styles - Add these at the end of your existing CSS */
        .ticket-stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }

        .ticket-stat-card {
            background: rgba(255, 255, 255, 0.03);
            border: 1px solid rgba(255, 255, 255, 0.05);
            border-radius: 12px;
            padding: 20px;
            display: flex;
            align-items: center;
            gap: 15px;
            transition: all 0.3s;
        }

        .ticket-stat-card:hover {
            transform: translateY(-4px);
            border-color: rgba(255, 255, 255, 0.1);
        }

        .ticket-stat-icon {
            width: 50px;
            height: 50px;
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 20px;
        }

        .ticket-stat-icon.pending {
            background: linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(245, 158, 11, 0.1));
            color: #f59e0b;
        }

        .ticket-stat-icon.progress {
            background: linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(59, 130, 246, 0.1));
            color: #3b82f6;
        }

        .ticket-stat-icon.completed {
            background: linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(16, 185, 129, 0.1));
            color: #10b981;
        }

        .ticket-stat-icon.total {
            background: linear-gradient(135deg, rgba(124, 92, 255, 0.2), rgba(111, 101, 255, 0.1));
            color: #93fff6;
        }

        .ticket-stat-content h3 {
            font-size: 1.8rem;
            margin-bottom: 5px;
        }

        .ticket-stat-content p {
            color: var(--muted);
            font-size: 0.9rem;
        }

        .tickets-admin-table-container {
            overflow-x: auto;
            margin-bottom: 20px;
        }

        .tickets-admin-table {
            width: 100%;
            border-collapse: collapse;
        }

        .tickets-admin-table th {
            background: rgba(255, 255, 255, 0.03);
            padding: 12px 16px;
            text-align: left;
            font-weight: 600;
            color: #94a3b8;
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
            white-space: nowrap;
        }

        .tickets-admin-table td {
            padding: 16px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }

        .ticket-row:hover {
            background: rgba(255, 255, 255, 0.02);
        }

        .ticket-id-cell {
            display: flex;
            flex-direction: column;
        }

        .ticket-id-cell code {
            font-family: monospace;
            font-size: 0.9rem;
            color: #93fff6;
        }

        .ticket-id-cell small {
            font-size: 0.75rem;
            color: #94a3b8;
            margin-top: 4px;
        }

        .ticket-service-cell {
            display: flex;
            flex-direction: column;
        }

        .ticket-service-cell small {
            color: #94a3b8;
            font-size: 0.85rem;
            margin-top: 4px;
        }

        .ticket-customer-cell {
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .ticket-status-badge {
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 0.85rem;
            font-weight: 500;
        }

        .ticket-status-badge.pending {
            background: rgba(245, 158, 11, 0.1);
            color: #f59e0b;
            border: 1px solid rgba(245, 158, 11, 0.3);
        }

        .ticket-status-badge.in-progress {
            background: rgba(59, 130, 246, 0.1);
            color: #3b82f6;
            border: 1px solid rgba(59, 130, 246, 0.3);
        }

        .ticket-status-badge.completed {
            background: rgba(16, 185, 129, 0.1);
            color: #10b981;
            border: 1px solid rgba(16, 185, 129, 0.3);
        }

        .ticket-status-badge.cancelled {
            background: rgba(239, 68, 68, 0.1);
            color: #ef4444;
            border: 1px solid rgba(239, 68, 68, 0.3);
        }

        .ticket-actions-cell {
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .table-btn {
            width: 32px;
            height: 32px;
            border-radius: 6px;
            border: none;
            background: rgba(255, 255, 255, 0.05);
            color: var(--text);
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s;
        }

        .table-btn.view {
            background: rgba(59, 130, 246, 0.1);
            color: #3b82f6;
        }

        .table-btn.chat {
            background: rgba(124, 92, 255, 0.1);
            color: #93fff6;
        }

        .table-btn:hover {
            transform: translateY(-2px);
        }

        .status-select-small {
            padding: 6px 10px;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 6px;
            color: var(--text);
            font-size: 0.85rem;
            cursor: pointer;
        }

        .empty-tickets-cell {
            text-align: center;
            padding: 40px !important;
        }

        .empty-tickets-message {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 15px;
            color: #94a3b8;
        }

        .ticket-summary {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding-top: 20px;
            border-top: 1px solid rgba(255, 255, 255, 0.05);
        }

        .summary-item {
            display: flex;
            align-items: center;
            gap: 10px;
            color: var(--muted);
            font-size: 0.9rem;
        }

        .summary-label {
            font-weight: 500;
        }

        .summary-value {
            color: var(--text);
        }

        /* Ticket Modal Styles */
        .admin-ticket-modal {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            padding: 20px;
            backdrop-filter: blur(5px);
        }

        .modal-overlay {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
        }

        .admin-ticket-modal .modal-content {
            background: #1e293b;
            border-radius: 16px;
            max-width: 800px;
            width: 100%;
            max-height: 90vh;
            overflow: hidden;
            border: 1px solid rgba(255, 255, 255, 0.1);
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
            position: relative;
            z-index: 2;
        }

        .modal-header {
            padding: 20px 24px;
            background: linear-gradient(135deg, rgba(124, 92, 255, 0.2), rgba(18, 27, 45, 0.4));
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .user-header-info {
            display: flex;
            align-items: center;
            gap: 15px;
        }

        .user-avatar {
            width: 40px;
            height: 40px;
            background: linear-gradient(135deg, rgba(124, 92, 255, 0.2), rgba(111, 101, 255, 0.1));
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #93fff6;
        }

        .user-id {
            font-size: 0.85rem;
            color: #94a3b8;
            margin-top: 4px;
        }

        .ticket-chat-header {
            padding: 15px 24px;
            background: rgba(255, 255, 255, 0.02);
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
            display: flex;
            align-items: center;
            gap: 15px;
            flex-wrap: wrap;
        }

        .ticket-chat-badge {
            background: linear-gradient(135deg, rgba(124, 92, 255, 0.2), rgba(111, 101, 255, 0.1));
            border: 1px solid rgba(124, 92, 255, 0.3);
            color: #93fff6;
            padding: 6px 12px;
            border-radius: 20px;
            font-size: 0.85rem;
            display: flex;
            align-items: center;
            gap: 6px;
        }

        .ticket-chat-service {
            font-weight: 500;
            color: var(--text);
        }

        .ticket-chat-status {
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 0.8rem;
            font-weight: 500;
            margin-left: auto;
        }

        .ticket-chat-status.pending {
            background: rgba(245, 158, 11, 0.1);
            color: #f59e0b;
            border: 1px solid rgba(245, 158, 11, 0.3);
        }

        .ticket-chat-status.in-progress {
            background: rgba(59, 130, 246, 0.1);
            color: #3b82f6;
            border: 1px solid rgba(59, 130, 246, 0.3);
        }

        .ticket-chat-status.completed {
            background: rgba(16, 185, 129, 0.1);
            color: #10b981;
            border: 1px solid rgba(16, 185, 129, 0.3);
        }

        .ticket-chat-status.cancelled {
            background: rgba(239, 68, 68, 0.1);
            color: #ef4444;
            border: 1px solid rgba(239, 68, 68, 0.3);
        }

        .modal-body {
            padding: 24px;
            display: flex;
            flex-direction: column;
            height: 60vh;
        }

        .ticket-modal-info {
            background: rgba(255, 255, 255, 0.02);
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 20px;
        }

        .info-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 15px;
        }

        .info-item {
            display: flex;
            flex-direction: column;
            gap: 5px;
        }

        .info-item label {
            font-size: 0.85rem;
            color: #94a3b8;
        }

        .info-value {
            font-weight: 500;
            color: var(--text);
            display: flex;
            align-items: center;
            gap: 6px;
        }

        .info-value.pending { color: #f59e0b; }
        .info-value.in-progress { color: #3b82f6; }
        .info-value.completed { color: #10b981; }
        .info-value.cancelled { color: #ef4444; }

        .contact-section {
            background: rgba(255, 255, 255, 0.02);
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 20px;
            border: 1px solid rgba(255, 255, 255, 0.05);
        }

        .contact-section h4 {
            margin-bottom: 15px;
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .contact-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 15px;
        }

        .contact-item {
            display: flex;
            flex-direction: column;
            gap: 5px;
        }

        .contact-item label {
            font-size: 0.85rem;
            color: #94a3b8;
            display: flex;
            align-items: center;
            gap: 6px;
        }

        .contact-item span {
            font-weight: 500;
            color: var(--text);
        }

        .ticket-modal-form-data {
            margin-bottom: 20px;
        }

        .ticket-modal-form-data h4 {
            margin-bottom: 15px;
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .form-data-container {
            background: rgba(255, 255, 255, 0.01);
            border: 1px solid rgba(255, 255, 255, 0.05);
            border-radius: 8px;
            padding: 20px;
            max-height: 300px;
            overflow-y: auto;
        }

        .form-data-item {
            display: flex;
            margin-bottom: 15px;
            padding-bottom: 15px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }

        .form-data-item:last-child {
            margin-bottom: 0;
            padding-bottom: 0;
            border-bottom: none;
        }

        .form-data-key {
            min-width: 200px;
            font-weight: 500;
            color: #93fff6;
            font-size: 0.9rem;
        }

        .form-data-value {
            flex: 1;
            color: var(--muted);
            word-break: break-word;
        }

        .ticket-modal-notes {
            margin-bottom: 20px;
        }

        .ticket-modal-notes h4 {
            margin-bottom: 15px;
            display: flex;
            align-items: center;
            gap: 10px;
        }

        #adminTicketNotes {
            width: 100%;
            padding: 12px;
            background: rgba(255, 255, 255, 0.03);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 8px;
            color: var(--text);
            margin-bottom: 15px;
            resize: vertical;
            font-family: inherit;
        }

        .notes-actions {
            display: flex;
            gap: 10px;
        }

        .btn-save-notes, .btn-add-to-chat {
            padding: 8px 16px;
            border-radius: 6px;
            font-size: 0.9rem;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 6px;
            transition: all 0.2s;
            border: none;
        }

        .btn-save-notes {
            background: linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(16, 185, 129, 0.05));
            border: 1px solid rgba(16, 185, 129, 0.2);
            color: #10b981;
        }

        .btn-add-to-chat {
            background: linear-gradient(135deg, rgba(124, 92, 255, 0.1), rgba(111, 101, 255, 0.05));
            border: 1px solid rgba(124, 92, 255, 0.2);
            color: #93fff6;
        }

        .btn-save-notes:hover, .btn-add-to-chat:hover {
            transform: translateY(-2px);
        }

        .modal-footer {
            padding: 20px 24px;
            background: rgba(255, 255, 255, 0.02);
            border-top: 1px solid rgba(255, 255, 255, 0.05);
        }

        .modal-footer-actions {
            display: flex;
            gap: 10px;
            justify-content: flex-end;
        }

        .btn-status {
            background: linear-gradient(135deg, rgba(245, 158, 11, 0.1), rgba(245, 158, 11, 0.05));
            border: 1px solid rgba(245, 158, 11, 0.2);
            color: #f59e0b;
            padding: 10px 20px;
            border-radius: 8px;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 8px;
            transition: all 0.2s;
        }

        .btn-status:hover {
            background: linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(245, 158, 11, 0.1));
        }

    /* Status Modal Styles */
    .status-modal {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(15, 23, 42, 0.95);
        backdrop-filter: blur(10px);
        z-index: 10001;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
        animation: fadeIn 0.3s ease-out;
    }
    
    @keyframes fadeIn {
        from {
            opacity: 0;
        }
        to {
            opacity: 1;
        }
    }
    
    .status-modal .modal-content {
        background: #1e293b;
        border-radius: 16px;
        max-width: 500px;
        width: 100%;
        max-height: 90vh;
        overflow: hidden;
        border: 1px solid rgba(124, 92, 255, 0.2);
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
        animation: slideUp 0.3s ease-out;
    }
    
    @keyframes slideUp {
        from {
            opacity: 0;
            transform: translateY(20px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
    
    .current-status {
        display: flex;
        align-items: center;
        gap: 15px;
        margin-bottom: 25px;
        padding: 15px;
        background: rgba(255, 255, 255, 0.02);
        border-radius: 10px;
        border: 1px solid rgba(255, 255, 255, 0.05);
    }
    
    .current-status p {
        margin: 0;
        color: #94a3b8;
        font-weight: 500;
    }
    
    .current-status-badge {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 8px 16px;
        border-radius: 20px;
        font-size: 0.9rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }
    
    .current-status-badge.pending {
        background: rgba(245, 158, 11, 0.15);
        color: #f59e0b;
        border: 1px solid rgba(245, 158, 11, 0.3);
    }
    
    .current-status-badge.in-progress {
        background: rgba(59, 130, 246, 0.15);
        color: #3b82f6;
        border: 1px solid rgba(59, 130, 246, 0.3);
    }
    
    .current-status-badge.completed {
        background: rgba(16, 185, 129, 0.15);
        color: #10b981;
        border: 1px solid rgba(16, 185, 129, 0.3);
    }
    
    .current-status-badge.cancelled {
        background: rgba(239, 68, 68, 0.15);
        color: #ef4444;
        border: 1px solid rgba(239, 68, 68, 0.3);
    }
    
    .status-options {
        display: flex;
        flex-direction: column;
        gap: 10px;
        margin-bottom: 25px;
    }
    
    .status-option {
        background: rgba(255, 255, 255, 0.02);
        border: 2px solid rgba(255, 255, 255, 0.1);
        border-radius: 12px;
        padding: 18px;
        cursor: pointer;
        transition: all 0.2s;
    }
    
    .status-option:hover {
        background: rgba(255, 255, 255, 0.05);
        border-color: rgba(124, 92, 255, 0.3);
        transform: translateY(-2px);
    }
    
    .status-option.selected {
        background: rgba(124, 92, 255, 0.1);
        border-color: rgba(124, 92, 255, 0.4);
        box-shadow: 0 5px 15px rgba(124, 92, 255, 0.1);
    }
    
    .status-option input[type="radio"] {
        display: none;
    }
    
    .status-content {
        display: flex;
        align-items: center;
        gap: 15px;
    }
    
    .status-icon {
        width: 45px;
        height: 45px;
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.3rem;
        flex-shrink: 0;
    }
    
    .status-icon.pending {
        background: rgba(245, 158, 11, 0.1);
        color: #f59e0b;
    }
    
    .status-icon.progress {
        background: rgba(59, 130, 246, 0.1);
        color: #3b82f6;
    }
    
    .status-icon.completed {
        background: rgba(16, 185, 129, 0.1);
        color: #10b981;
    }
    
    .status-icon.cancelled {
        background: rgba(239, 68, 68, 0.1);
        color: #ef4444;
    }
    
    .status-text {
        flex: 1;
    }
    
    .status-title {
        font-weight: 600;
        color: #e2e8f0;
        margin-bottom: 4px;
        font-size: 1.1rem;
    }
    
    .status-desc {
        color: #94a3b8;
        font-size: 0.9rem;
        line-height: 1.4;
    }
    
    .status-notes {
        margin-top: 20px;
    }
    
    .status-notes label {
        display: block;
        margin-bottom: 10px;
        color: #94a3b8;
        font-weight: 500;
        font-size: 0.95rem;
    }
    
    #statusChangeNote {
        width: 100%;
        padding: 15px;
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid rgba(124, 92, 255, 0.2);
        border-radius: 10px;
        color: #e2e8f0;
        font-size: 0.95rem;
        font-family: inherit;
        resize: vertical;
        transition: all 0.2s;
    }
    
    #statusChangeNote:focus {
        outline: none;
        border-color: #6f65ff;
        box-shadow: 0 0 0 2px rgba(124, 92, 255, 0.1);
    }
    
    .status-modal .modal-body {
        padding: 30px;
    }
    
    .status-modal .modal-footer {
        padding: 20px 30px;
        background: rgba(255, 255, 255, 0.02);
        border-top: 1px solid rgba(255, 255, 255, 0.05);
        display: flex;
        gap: 15px;
        justify-content: flex-end;
    }
    
    /* Ensure modals appear on top */
    .status-modal {
        z-index: 10001 !important;
    }
    
    .admin-ticket-modal {
        z-index: 10000 !important;
    }
        /* Admin Notifications */
        .admin-notification {
            position: fixed;
            top: 20px;
            right: 20px;
            background: var(--panel);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 8px;
            padding: 15px 20px;
            display: flex;
            align-items: center;
            gap: 12px;
            z-index: 10001;
            animation: slideIn 0.3s ease-out;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
            transition: all 0.3s;
        }

        @keyframes slideIn {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }

        .admin-notification.success {
            border-left: 4px solid #10b981;
        }

        .admin-notification.error {
            border-left: 4px solid #ef4444;
        }

        .admin-notification.info {
            border-left: 4px solid #3b82f6;
        }

        .notification-content {
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .notification-content i {
            font-size: 1.2rem;
        }

        .admin-notification.success .notification-content i {
            color: #10b981;
        }

        .admin-notification.error .notification-content i {
            color: #ef4444;
        }

        .admin-notification.info .notification-content i {
            color: #3b82f6;
        }

        /* Error Container */
        .error-container {
            text-align: center;
            padding: 60px 40px;
            background: rgba(239, 68, 68, 0.05);
            border: 1px solid rgba(239, 68, 68, 0.1);
            border-radius: 12px;
            margin: 20px;
        }

        .error-container h2 {
            color: #ef4444;
            margin-bottom: 20px;
        }

        .error-container pre {
            background: rgba(0, 0, 0, 0.3);
            padding: 15px;
            border-radius: 8px;
            text-align: left;
            overflow-x: auto;
            margin: 20px 0;
            font-family: monospace;
        }

        /* Responsive */
        @media (max-width: 768px) {
            .ticket-stats-grid {
                grid-template-columns: repeat(2, 1fr);
            }
            
            .tickets-admin-table th,
            .tickets-admin-table td {
                padding: 12px 8px;
                font-size: 0.85rem;
            }
            
            .info-grid {
                grid-template-columns: 1fr;
            }
            
            .contact-grid {
                grid-template-columns: 1fr;
            }
            
            .form-data-item {
                flex-direction: column;
                gap: 5px;
            }
            
            .form-data-key {
                min-width: auto;
            }
            
            .modal-footer-actions {
                flex-direction: column;
            }
        }

        /* Admin Ticket Chat Styles */
.ticket-chat-context {
    padding: 15px 24px;
    background: rgba(124, 92, 255, 0.05);
    border-bottom: 1px solid rgba(124, 92, 255, 0.1);
}

.context-actions {
    display: flex;
    gap: 15px;
    align-items: center;
}

.btn-view-ticket {
    background: rgba(59, 130, 246, 0.1);
    border: 1px solid rgba(59, 130, 246, 0.3);
    color: #3b82f6;
    padding: 8px 16px;
    border-radius: 6px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.9rem;
    transition: all 0.2s;
}

.btn-view-ticket:hover {
    background: rgba(59, 130, 246, 0.2);
    transform: translateY(-2px);
}

.ticket-info-badge {
    background: rgba(124, 92, 255, 0.1);
    border: 1px solid rgba(124, 92, 255, 0.3);
    color: #93fff6;
    padding: 4px 10px;
    border-radius: 12px;
    font-size: 0.8rem;
    display: inline-flex;
    align-items: center;
    gap: 5px;
    margin-top: 5px;
}

.ticket-status-select {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: #e2e8f0;
    padding: 8px 12px;
    border-radius: 6px;
    font-size: 0.9rem;
    cursor: pointer;
    margin-left: auto;
}

.admin-message.from-admin {
    background: rgba(16, 185, 129, 0.1);
    border: 1px solid rgba(16, 185, 129, 0.2);
    margin-left: auto;
    margin-right: 0;
}

.admin-message.from-user {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    margin-right: auto;
    margin-left: 0;
}

.message-context {
    margin-top: 8px;
    padding-top: 8px;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    font-size: 0.8rem;
    color: #94a3b8;
    display: flex;
    align-items: center;
    gap: 5px;
}

.message-status {
    margin-top: 5px;
    font-size: 0.75rem;
    color: #10b981;
    text-align: right;
}

.quick-response-buttons {
    display: flex;
    gap: 10px;
    margin-top: 10px;
}

.btn-quick-response {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: #94a3b8;
    padding: 6px 12px;
    border-radius: 6px;
    font-size: 0.85rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 6px;
    transition: all 0.2s;
}

.btn-quick-response:hover {
    background: rgba(124, 92, 255, 0.1);
    color: #93fff6;
    border-color: rgba(124, 92, 255, 0.3);
}

/* User Registration Styles for Admin */
.user-registration-view {
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 8px;
    padding: 20px;
    margin-bottom: 20px;
}

.registration-info-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 15px;
}

.registration-info-item {
    display: flex;
    flex-direction: column;
    gap: 5px;
}

.registration-info-item label {
    font-size: 0.85rem;
    color: #94a3b8;
    font-weight: 500;
}

.registration-info-item span {
    color: #e2e8f0;
    font-weight: 500;
}


      // Add these styles to the addAdminStyles() method:

// Ticket Admin Styles
.ticket-stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.ticket-stat-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 15px;
  transition: all 0.3s;
}

.ticket-stat-card:hover {
  transform: translateY(-4px);
  border-color: rgba(255, 255, 255, 0.1);
}

.ticket-stat-icon {
  width: 50px;
  height: 50px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
}

.ticket-stat-icon.pending {
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(245, 158, 11, 0.1));
  color: #f59e0b;
}

.ticket-stat-icon.progress {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(59, 130, 246, 0.1));
  color: #3b82f6;
}

.ticket-stat-icon.completed {
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(16, 185, 129, 0.1));
  color: #10b981;
}

.ticket-stat-icon.total {
  background: linear-gradient(135deg, rgba(124, 92, 255, 0.2), rgba(111, 101, 255, 0.1));
  color: #93fff6;
}

.ticket-stat-content h3 {
  font-size: 1.8rem;
  margin-bottom: 5px;
}

.ticket-stat-content p {
  color: var(--muted);
  font-size: 0.9rem;
}

.tickets-admin-table-container {
  overflow-x: auto;
  margin-bottom: 20px;
}

.tickets-admin-table {
  width: 100%;
  border-collapse: collapse;
}

.tickets-admin-table th {
  background: rgba(255, 255, 255, 0.03);
  padding: 12px 16px;
  text-align: left;
  font-weight: 600;
  color: #94a3b8;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  white-space: nowrap;
}

.tickets-admin-table td {
  padding: 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.ticket-row:hover {
  background: rgba(255, 255, 255, 0.02);
}

.ticket-id-cell {
  display: flex;
  flex-direction: column;
}

.ticket-id-cell code {
  font-family: monospace;
  font-size: 0.9rem;
  color: #93fff6;
}

.ticket-id-cell small {
  font-size: 0.75rem;
  color: #94a3b8;
  margin-top: 4px;
}

.ticket-service-cell {
  display: flex;
  flex-direction: column;
}

.ticket-service-cell small {
  color: #94a3b8;
  font-size: 0.85rem;
  margin-top: 4px;
}

.ticket-customer-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.ticket-status-badge {
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 500;
}

.ticket-status-badge.pending {
  background: rgba(245, 158, 11, 0.1);
  color: #f59e0b;
  border: 1px solid rgba(245, 158, 11, 0.3);
}

.ticket-status-badge.in-progress {
  background: rgba(59, 130, 246, 0.1);
  color: #3b82f6;
  border: 1px solid rgba(59, 130, 246, 0.3);
}

.ticket-status-badge.completed {
  background: rgba(16, 185, 129, 0.1);
  color: #10b981;
  border: 1px solid rgba(16, 185, 129, 0.3);
}

.ticket-status-badge.cancelled {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
  border: 1px solid rgba(239, 68, 68, 0.3);
}

.ticket-actions-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.table-btn {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  border: none;
  background: rgba(255, 255, 255, 0.05);
  color: var(--text);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.table-btn.view {
  background: rgba(59, 130, 246, 0.1);
  color: #3b82f6;
}

.table-btn.chat {
  background: rgba(124, 92, 255, 0.1);
  color: #93fff6;
}

.table-btn:hover {
  transform: translateY(-2px);
}

.status-select-small {
  padding: 6px 10px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  color: var(--text);
  font-size: 0.85rem;
  cursor: pointer;
}

.empty-tickets-cell {
  text-align: center;
  padding: 40px !important;
}

.empty-tickets-message {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 15px;
  color: #94a3b8;
}

.ticket-summary {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
}

.summary-item {
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--muted);
  font-size: 0.9rem;
}

.summary-label {
  font-weight: 500;
}

.summary-value {
  color: var(--text);
}

/* Ticket Modal Styles */
.admin-ticket-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  padding: 20px;
  backdrop-filter: blur(5px);
}

.admin-ticket-modal .modal-content {
  background: #1e293b;
  border-radius: 16px;
  max-width: 800px;
  width: 100%;
  max-height: 90vh;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
}

.ticket-modal-info {
  background: rgba(255, 255, 255, 0.02);
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 15px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.info-item label {
  font-size: 0.85rem;
  color: #94a3b8;
}

.info-value {
  font-weight: 500;
  color: var(--text);
}

.info-value.pending { color: #f59e0b; }
.info-value.in-progress { color: #3b82f6; }
.info-value.completed { color: #10b981; }
.info-value.cancelled { color: #ef4444; }

.ticket-modal-form-data {
  margin-bottom: 20px;
}

.ticket-modal-form-data h4 {
  margin-bottom: 15px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.form-data-container {
  background: rgba(255, 255, 255, 0.01);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  padding: 20px;
  max-height: 300px;
  overflow-y: auto;
}

.form-data-item {
  display: flex;
  margin-bottom: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.form-data-item:last-child {
  margin-bottom: 0;
  padding-bottom: 0;
  border-bottom: none;
}

.form-data-key {
  min-width: 200px;
  font-weight: 500;
  color: #93fff6;
}

.form-data-value {
  flex: 1;
  color: var(--muted);
  word-break: break-word;
}

.ticket-modal-notes {
  margin-bottom: 20px;
}

.ticket-modal-notes h4 {
  margin-bottom: 15px;
  display: flex;
  align-items: center;
  gap: 10px;
}

#adminTicketNotes {
  width: 100%;
  padding: 12px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  color: var(--text);
  margin-bottom: 15px;
  resize: vertical;
}

.btn-save-notes {
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(16, 185, 129, 0.05));
  border: 1px solid rgba(16, 185, 129, 0.2);
  color: #10b981;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s;
}

.btn-save-notes:hover {
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(16, 185, 129, 0.1));
  transform: translateY(-2px);
}

.modal-footer-actions {
  display: flex;
  gap: 15px;
  justify-content: flex-end;
}

/* Admin Notifications */
.admin-notification {
  position: fixed;
  top: 20px;
  right: 20px;
  background: var(--panel);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 15px 20px;
  display: flex;
  align-items: center;
  gap: 12px;
  z-index: 10001;
  animation: slideIn 0.3s ease-out;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
  transition: all 0.3s;
}

@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

.admin-notification.success {
  border-left: 4px solid #10b981;
}

.admin-notification.error {
  border-left: 4px solid #ef4444;
}

.admin-notification.info {
  border-left: 4px solid #3b82f6;
}

.notification-content {
  display: flex;
  align-items: center;
  gap: 10px;
}

.notification-content i {
  font-size: 1.2rem;
}

.admin-notification.success .notification-content i {
  color: #10b981;
}

.admin-notification.error .notification-content i {
  color: #ef4444;
}

.admin-notification.info .notification-content i {
  color: #3b82f6;
}

/* Responsive */
@media (max-width: 768px) {
  .ticket-stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .tickets-admin-table th,
  .tickets-admin-table td {
    padding: 12px 8px;
    font-size: 0.85rem;
  }
  
  .info-grid {
    grid-template-columns: 1fr;
  }
  
  .form-data-item {
    flex-direction: column;
    gap: 5px;
  }
  
  .form-data-key {
    min-width: auto;
  }
  
  .modal-footer-actions {
    flex-direction: column;
  }
}
      
      .admin-container {
        max-width: 1400px;
        margin: 0 auto;
        padding: 20px;
      }
      
      .admin-header {
        background: rgba(255, 255, 255, 0.03);
        border-radius: 12px;
        padding: 24px 30px;
        margin-bottom: 24px;
        border: 1px solid rgba(255, 255, 255, 0.05);
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      
      .header-left h1 {
        background: linear-gradient(to right, #93fff6, #6f65ff);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        margin-bottom: 8px;
        display: flex;
        align-items: center;
        gap: 10px;
      }
      
      .header-left p {
        color: #94a3b8;
        font-size: 0.95rem;
      }
      
      .btn-logout {
        background: rgba(239, 68, 68, 0.1);
        border: 1px solid rgba(239, 68, 68, 0.3);
        color: #ef4444;
        padding: 10px 20px;
        border-radius: 8px;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 8px;
        transition: all 0.2s;
      }
      
      .btn-logout:hover {
        background: rgba(239, 68, 68, 0.2);
        transform: translateY(-2px);
      }
      
      .admin-nav {
        display: flex;
        gap: 10px;
        margin-bottom: 24px;
        flex-wrap: wrap;
      }
      
      .nav-btn {
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid rgba(255, 255, 255, 0.1);
        color: #94a3b8;
        padding: 12px 20px;
        border-radius: 8px;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 8px;
        transition: all 0.2s;
        position: relative;
      }
      
      .nav-btn.active {
        background: linear-gradient(135deg, rgba(124, 92, 255, 0.2), rgba(111, 101, 255, 0.1));
        color: #93fff6;
        border-color: rgba(124, 92, 255, 0.3);
      }
      
      .nav-btn:hover {
        background: rgba(255, 255, 255, 0.05);
        transform: translateY(-2px);
      }
      
      .badge {
        background: #ef4444;
        color: white;
        font-size: 12px;
        font-weight: bold;
        min-width: 20px;
        height: 20px;
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0 6px;
        margin-left: 5px;
      }
      
      .stats-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
        gap: 20px;
        margin-bottom: 24px;
      }
      
      .stat-card {
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid rgba(255, 255, 255, 0.05);
        border-radius: 12px;
        padding: 24px;
        display: flex;
        align-items: center;
        gap: 20px;
        transition: all 0.2s;
      }
      
      .stat-card:hover {
        transform: translateY(-4px);
        border-color: rgba(255, 255, 255, 0.1);
      }
      
      .stat-icon {
        width: 60px;
        height: 60px;
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 24px;
      }
      
      .stat-icon.users {
        background: linear-gradient(135deg, rgba(124, 92, 255, 0.2), rgba(111, 101, 255, 0.1));
        color: #93fff6;
      }
      
      .stat-icon.active {
        background: linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(16, 185, 129, 0.1));
        color: #10b981;
      }
      
      .stat-icon.messages {
        background: linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(59, 130, 246, 0.1));
        color: #3b82f6;
      }
      
      .stat-icon.total {
        background: linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(245, 158, 11, 0.1));
        color: #f59e0b;
      }
      
      .stat-content h3 {
        font-size: 2rem;
        margin-bottom: 4px;
      }
      
      .stat-content p {
        color: #94a3b8;
        font-size: 0.9rem;
      }
      
      .section-card {
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid rgba(255, 255, 255, 0.05);
        border-radius: 12px;
        padding: 24px;
        margin-bottom: 24px;
      }
      
      .section-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
      }
      
      .section-header h2 {
        font-size: 1.25rem;
        display: flex;
        align-items: center;
        gap: 10px;
      }
      
      .btn-refresh {
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        color: #e2e8f0;
        padding: 8px 16px;
        border-radius: 6px;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 6px;
        transition: all 0.2s;
      }
      
      .btn-refresh:hover {
        background: rgba(255, 255, 255, 0.1);
      }
      
      .recent-chats {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      
      .chat-item {
        background: rgba(255, 255, 255, 0.02);
        border: 1px solid rgba(255, 255, 255, 0.05);
        border-radius: 8px;
        padding: 16px;
        cursor: pointer;
        transition: all 0.2s;
        position: relative;
      }
      
      .chat-item:hover {
        background: rgba(255, 255, 255, 0.05);
        transform: translateY(-2px);
      }
      
      .chat-item.unread {
        border-left: 4px solid #ef4444;
      }
      
      .chat-item-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 10px;
      }
      
      .user-info {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      
      .user-avatar {
        width: 40px;
        height: 40px;
        background: linear-gradient(135deg, rgba(124, 92, 255, 0.2), rgba(111, 101, 255, 0.1));
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #93fff6;
      }
      
      .user-name {
        font-weight: 500;
      }
      
      .user-id {
        font-size: 0.85rem;
        color: #94a3b8;
      }
      
      .chat-time {
        font-size: 0.85rem;
        color: #94a3b8;
      }
      
      .chat-preview {
        color: #cbd5e1;
        font-size: 0.9rem;
        margin-bottom: 10px;
      }
      
      .unread-badge {
        background: #ef4444;
        color: white;
        font-size: 0.75rem;
        padding: 2px 8px;
        border-radius: 10px;
        position: absolute;
        top: 12px;
        right: 12px;
      }
      
      .empty-state {
        text-align: center;
        padding: 40px 20px;
        color: #94a3b8;
      }
      
      .quick-actions {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 15px;
      }
      
      .quick-action-btn {
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid rgba(255, 255, 255, 0.1);
        color: #e2e8f0;
        padding: 20px;
        border-radius: 8px;
        cursor: pointer;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 12px;
        transition: all 0.2s;
      }
      
      .quick-action-btn:hover {
        background: rgba(124, 92, 255, 0.1);
        border-color: rgba(124, 92, 255, 0.3);
        transform: translateY(-4px);
      }
      
      .quick-action-btn i {
        font-size: 2rem;
        color: #93fff6;
      }
      
      .conversations-list {
        display: flex;
        flex-direction: column;
        gap: 15px;
      }
      
      .conversation-item {
        background: rgba(255, 255, 255, 0.02);
        border: 1px solid rgba(255, 255, 255, 0.05);
        border-radius: 8px;
        padding: 20px;
        transition: all 0.2s;
      }
      
      .conversation-item:hover {
        background: rgba(255, 255, 255, 0.05);
      }
      
      .conversation-item.unread {
        border-left: 4px solid #ef4444;
      }
      
      .conversation-header {
        display: flex;
        align-items: center;
        gap: 15px;
        margin-bottom: 15px;
      }
      
      .user-details {
        flex: 1;
      }
      
      .conversation-stats {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 5px;
      }
      
      .message-count, .unread-count {
        font-size: 0.85rem;
        color: #94a3b8;
      }
      
      .unread-count {
        color: #ef4444;
      }
      
      .last-message {
        background: rgba(255, 255, 255, 0.01);
        border-radius: 6px;
        padding: 12px;
        margin-bottom: 15px;
      }
      
      .message-content {
        color: #cbd5e1;
        font-size: 0.9rem;
        margin-bottom: 5px;
      }
      
      .message-time {
        font-size: 0.8rem;
        color: #94a3b8;
        text-align: right;
      }
      
      .conversation-actions {
        display: flex;
        gap: 10px;
      }
      
      .action-btn {
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        color: #e2e8f0;
        padding: 8px 15px;
        border-radius: 6px;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 0.85rem;
        transition: all 0.2s;
      }
      
      .action-btn:hover {
        background: rgba(255, 255, 255, 0.1);
      }
      
      .action-btn.delete:hover {
        background: rgba(239, 68, 68, 0.1);
        border-color: rgba(239, 68, 68, 0.3);
        color: #ef4444;
      }
      
      .users-table {
        width: 100%;
        border-collapse: collapse;
      }
      
      .users-table th {
        background: rgba(255, 255, 255, 0.03);
        padding: 12px 16px;
        text-align: left;
        font-weight: 600;
        color: #94a3b8;
        border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      }
      
      .users-table td {
        padding: 16px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      }
      
      .users-table tr:hover {
        background: rgba(255, 255, 255, 0.02);
      }
      
      .status-badge {
        padding: 4px 12px;
        border-radius: 20px;
        font-size: 0.8rem;
        font-weight: 500;
      }
      
      .status-badge.active {
        background: rgba(16, 185, 129, 0.1);
        color: #10b981;
        border: 1px solid rgba(16, 185, 129, 0.3);
      }
      
      .status-badge.inactive {
        background: rgba(255, 255, 255, 0.05);
        color: #94a3b8;
        border: 1px solid rgba(255, 255, 255, 0.1);
      }
      
      .table-btn {
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        color: #e2e8f0;
        width: 36px;
        height: 36px;
        border-radius: 6px;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        margin: 0 2px;
        transition: all 0.2s;
      }
      
      .table-btn:hover {
        background: rgba(255, 255, 255, 0.1);
      }
      
      .table-btn.delete:hover {
        background: rgba(239, 68, 68, 0.1);
        border-color: rgba(239, 68, 68, 0.3);
        color: #ef4444;
      }
      
      .empty-table {
        text-align: center;
        padding: 40px !important;
      }
      
      .email-composer {
        margin-bottom: 30px;
      }
      
      .form-group {
        margin-bottom: 20px;
      }
      
      .form-group label {
        display: block;
        margin-bottom: 8px;
        font-weight: 500;
      }
      
      .form-group input,
      .form-group select,
      .form-group textarea {
        width: 100%;
        padding: 12px 16px;
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 8px;
        color: #e2e8f0;
        font-size: 0.95rem;
        transition: border-color 0.2s;
      }
      
      .form-group input:focus,
      .form-group select:focus,
      .form-group textarea:focus {
        outline: none;
        border-color: #6f65ff;
      }
      
      .form-actions {
        display: flex;
        gap: 15px;
      }
      
      .btn-primary {
        background: linear-gradient(135deg, #6f65ff, #93fff6);
        border: none;
        color: #0f172a;
        padding: 12px 24px;
        border-radius: 8px;
        font-weight: 600;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 8px;
        transition: all 0.2s;
      }
      
      .btn-primary:hover {
        opacity: 0.9;
        transform: translateY(-2px);
      }
      
      .btn-secondary {
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        color: #e2e8f0;
        padding: 12px 24px;
        border-radius: 8px;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 8px;
        transition: all 0.2s;
      }
      
      .btn-secondary:hover {
        background: rgba(255, 255, 255, 0.1);
        transform: translateY(-2px);
      }
      
      .templates-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 15px;
      }
      
      .template-card {
        background: rgba(255, 255, 255, 0.02);
        border: 1px solid rgba(255, 255, 255, 0.05);
        border-radius: 8px;
        padding: 20px;
        cursor: pointer;
        transition: all 0.2s;
      }
      
      .template-card:hover {
        background: rgba(124, 92, 255, 0.05);
        border-color: rgba(124, 92, 255, 0.2);
        transform: translateY(-4px);
      }
      
      .template-icon {
        width: 50px;
        height: 50px;
        background: linear-gradient(135deg, rgba(124, 92, 255, 0.2), rgba(111, 101, 255, 0.1));
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.5rem;
        color: #93fff6;
        margin-bottom: 15px;
      }
      
      .template-card h4 {
        margin-bottom: 8px;
      }
      
      .template-card p {
        color: #94a3b8;
        font-size: 0.9rem;
      }
      
      .settings-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        gap: 20px;
      }
      
      .settings-card {
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 8px;
        padding: 24px;
      }
      
      .settings-card h3 {
        margin-bottom: 20px;
        display: flex;
        align-items: center;
        gap: 10px;
      }
      
      .settings-group {
        margin-bottom: 15px;
      }
      
      .settings-group label {
        display: block;
        margin-bottom: 8px;
        font-weight: 500;
      }

      .settings-group input:not([type="checkbox"]),
      .settings-group select,
      .settings-group textarea {
        width: 100%;
        min-height: 42px;
        padding: 10px 12px;
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 6px;
        background: rgba(7, 12, 30, 0.72);
        color: #f8fafc;
        font: inherit;
      }

      .settings-group textarea {
        min-height: 96px;
        resize: vertical;
      }

      .settings-group input:focus,
      .settings-group select:focus,
      .settings-group textarea:focus {
        outline: 2px solid rgba(147, 255, 246, 0.22);
        border-color: #93fff6;
      }

      .settings-card > .btn-primary,
      .settings-card .actions-group > button {
        justify-content: center;
        width: 100%;
      }
      
      .actions-group {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      
      .btn-danger {
        background: rgba(239, 68, 68, 0.1);
        border: 1px solid rgba(239, 68, 68, 0.3);
        color: #ef4444;
        padding: 12px 24px;
        border-radius: 8px;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 8px;
        transition: all 0.2s;
      }
      
      .btn-danger:hover {
        background: rgba(239, 68, 68, 0.2);
        transform: translateY(-2px);
      }
      
      .conversation-modal {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        padding: 20px;
        backdrop-filter: blur(5px);
      }
      
      .modal-content {
        background: #1e293b;
        border-radius: 16px;
        max-width: 600px;
        width: 100%;
        max-height: 80vh;
        overflow: hidden;
        border: 1px solid rgba(255, 255, 255, 0.1);
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
      }
      
      .modal-header {
        padding: 20px 24px;
        background: linear-gradient(135deg, rgba(124, 92, 255, 0.2), rgba(18, 27, 45, 0.4));
        border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      
      .modal-header h3 {
        margin: 0;
        font-size: 1.25rem;
        display: flex;
        align-items: center;
        gap: 10px;
      }
      
      .modal-close {
        background: none;
        border: none;
        color: #e2e8f0;
        font-size: 24px;
        cursor: pointer;
        width: 36px;
        height: 36px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 6px;
        transition: all 0.2s;
      }
      
      .modal-close:hover {
        background: rgba(255, 255, 255, 0.1);
      }
      
      .modal-body {
        padding: 24px;
        display: flex;
        flex-direction: column;
        height: 60vh;
      }
      
      .conversation-messages {
        flex: 1;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 15px;
        margin-bottom: 20px;
      }
      
      .admin-message {
        max-width: 80%;
        padding: 12px 16px;
        border-radius: 16px;
      }
      
      .admin-message.user {
        align-self: flex-start !important;
        margin-right: auto !important;
        margin-left: 0 !important;
        background: rgba(124, 92, 255, 0.1);
        border: 1px solid rgba(124, 92, 255, 0.2);
      }
      
      .admin-message.admin {
        align-self: flex-end !important;
        margin-left: auto !important;
        margin-right: 0 !important;
        background: linear-gradient(135deg, rgba(16, 185, 129, 0.9), rgba(16, 185, 129, 0.7));
        color: white;
      }

      .admin-message.from-user {
        align-self: flex-start !important;
        margin-right: auto !important;
        margin-left: 0 !important;
      }

      .admin-message.from-admin {
        align-self: flex-end !important;
        margin-left: auto !important;
        margin-right: 0 !important;
      }
      
      .message-input {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      
      .message-input textarea {
        width: 100%;
        padding: 12px;
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 8px;
        color: #e2e8f0;
        resize: none;
      }
      
      /* Login Styles */
      .admin-login {
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
        background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
      }
      
      .login-card {
        background: rgba(255, 255, 255, 0.03);
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 16px;
        padding: 40px;
        width: 100%;
        max-width: 400px;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
      }
      
      .login-header {
        text-align: center;
        margin-bottom: 30px;
      }
      
      .login-header h1 {
        background: linear-gradient(to right, #93fff6, #6f65ff);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        margin-bottom: 10px;
      }
      
      .login-header p {
        color: #94a3b8;
      }

      .btn-login {
        width: 100%;
        min-height: 44px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        border: 0;
        border-radius: 8px;
        background: linear-gradient(135deg, #93fff6, #6f65ff);
        color: #07101f;
        font: inherit;
        font-weight: 700;
        cursor: pointer;
      }

      // Add to addAdminStyles() method:
.error-container {
  text-align: center;
  padding: 60px 40px;
  background: rgba(239, 68, 68, 0.05);
  border: 1px solid rgba(239, 68, 68, 0.1);
  border-radius: 12px;
  margin: 20px;
}

.error-container h2 {
  color: #ef4444;
  margin-bottom: 20px;
}

.error-container pre {
  background: rgba(0, 0, 0, 0.3);
  padding: 15px;
  border-radius: 8px;
  text-align: left;
  overflow-x: auto;
  margin: 20px 0;
  font-family: monospace;
}
      
      .login-footer {
        margin-top: 30px;
        padding-top: 20px;
        border-top: 1px solid rgba(255, 255, 255, 0.1);
        text-align: center;
        color: #94a3b8;
        font-size: 0.9rem;
      }
      
      .login-footer small {
        opacity: 0.7;
      }

      .admin-search-control {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
      }

      .admin-search-control .search-input {
        min-width: 260px;
        flex: 1 1 280px;
      }

      .search-action {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        min-height: 42px;
      }

      .settings-heading {
        margin-bottom: 18px;
        padding: 22px;
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 8px;
        background: rgba(255, 255, 255, 0.025);
      }

      .settings-heading h2 {
        margin: 3px 0 6px;
      }

      .settings-heading p {
        margin: 0;
        color: #94a3b8;
      }

      .settings-toggle-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
      }

      .settings-toggle-row input[type="checkbox"] {
        width: 20px;
        height: 20px;
        accent-color: #7c5cff;
      }

      .ticket-chat-summary {
        overflow: hidden;
        border: 1px solid rgba(147, 255, 246, 0.2);
        border-radius: 8px;
        background: #0b1028;
      }

      .ticket-chat-summary__header {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 14px;
        background: linear-gradient(90deg, rgba(111, 101, 255, 0.2), rgba(147, 255, 246, 0.08));
      }

      .ticket-chat-summary__header small,
      .ticket-chat-summary__header strong,
      .ticket-chat-summary__meta span,
      .ticket-chat-summary__meta strong,
      .ticket-chat-summary__details span,
      .ticket-chat-summary__details strong {
        display: block;
      }

      .ticket-chat-summary__icon {
        display: grid;
        width: 36px;
        height: 36px;
        place-items: center;
        border-radius: 50%;
        background: linear-gradient(135deg, #93fff6, #6f65ff);
        color: #05081c;
      }

      .ticket-chat-summary__meta,
      .ticket-chat-summary__details {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 1px;
        background: rgba(255, 255, 255, 0.08);
      }

      .ticket-chat-summary__meta > div,
      .ticket-chat-summary__details > div {
        padding: 10px 12px;
        background: #0b1028;
      }

      .ticket-chat-summary__meta span,
      .ticket-chat-summary__details span,
      .ticket-chat-summary__header small {
        color: #94a3b8;
        font-size: 0.75rem;
      }

      .ticket-chat-summary__meta strong,
      .ticket-chat-summary__details strong {
        margin-top: 2px;
        overflow-wrap: anywhere;
        color: #f8fafc;
        font-size: 0.82rem;
      }
      
      @media (max-width: 768px) {
        .admin-container {
          padding: 10px;
        }
        
        .admin-header {
          flex-direction: column;
          gap: 15px;
          text-align: center;
        }
        
        .admin-nav {
          flex-direction: column;
        }
        
        .stats-grid {
          grid-template-columns: 1fr;
        }
        
        .quick-actions {
          grid-template-columns: 1fr;
        }
        
        .conversation-header {
          flex-direction: column;
          align-items: flex-start;
        }
        
        .conversation-stats {
          flex-direction: row;
          align-items: center;
          gap: 15px;
        }
        
        .form-actions {
          flex-direction: column;
        }

        .admin-search-control,
        .admin-search-control .search-input,
        .admin-search-control .search-action,
        .ticket-search-control .filter-select {
          width: 100%;
          min-width: 0;
        }
      }
    `;

    document.head.appendChild(style);
  }
}

// Helper function for notifications
function showAdminNotification(message, type = 'info') {
  // Create notification element
  const notification = document.createElement('div');
  notification.className = `admin-notification ${type}`;
  notification.innerHTML = `
    <div class="notification-content">
      <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
      <span>${message}</span>
    </div>
  `;

  // Add to body
  document.body.appendChild(notification);

  // Remove after 3 seconds
  setTimeout(() => {
    notification.style.opacity = '0';
    notification.style.transform = 'translateX(100%)';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// Initialize admin dashboard
let adminDashboard;
document.addEventListener('DOMContentLoaded', () => {
  adminDashboard = new AdminChatDashboard();
  window.adminDashboard = adminDashboard;
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      adminDashboard.closeModal();
      adminDashboard.closeAdminModal();
      adminDashboard.closeStatusModal();
    }
  });
});
