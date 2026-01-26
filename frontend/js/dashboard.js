function showTicketDetailsModal(ticketId) {
  const currentUserId = localStorage.getItem('chatUserId');
  const tickets = window.getUserTickets(currentUserId);
  const ticket = tickets[ticketId];


  // Add event listeners for modal buttons - FIXED VERSION
  setTimeout(() => {
    const closeBtn1 = document.getElementById('closeTicketModal');
    const closeBtn2 = document.getElementById('closeModalBtn');

    if (closeBtn1) {
      closeBtn1.onclick = closeTicketModal;
    }

    if (closeBtn2) {
      closeBtn2.onclick = closeTicketModal;
    }

    // Close modal when clicking outside
    const modal = document.getElementById('ticketModal');
    if (modal) {
      modal.onclick = function (e) {
        if (e.target === this) {
          closeTicketModal();
        }
      };
    }
  }, 100);

  if (!ticket) {
    console.error('Ticket not found:', ticketId);
    return;
  }



  console.log('Showing ticket details:', ticket);

  // Helper function to escape HTML
  function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // Helper function to get status icon
  function getStatusIcon(status) {
    const icons = {
      'pending': 'clock',
      'in-progress': 'spinner',
      'completed': 'check-circle',
      'cancelled': 'times-circle'
    };
    return icons[status] || 'question-circle';
  }

  // Create the modal HTML
  const modalHTML = `
    <div class="ticket-modal-overlay" id="ticketModal">
      <div class="ticket-modal">
        <div class="modal-header">
          <h2><i class="fas fa-ticket-alt"></i> Ticket Details</h2>
          <button class="modal-close" id="closeTicketModal">×</button>
        </div>
        
        <div class="modal-body">
          <!-- Ticket Info -->
          <div class="ticket-info-section">
            <div class="ticket-id-display">
              <span class="info-label">Ticket ID:</span>
              <span class="info-value"><code>${ticket.id}</code></span>
            </div>
            
            <div class="ticket-status-display">
              <span class="info-label">Status:</span>
              <span class="status-badge ${ticket.status}">
                <i class="fas fa-${getStatusIcon(ticket.status)}"></i>
                ${ticket.status.charAt(0).toUpperCase() + ticket.status.slice(1)}
              </span>
            </div>
          </div>
          
          <!-- Service Information -->
          <div class="ticket-service-section">
            <h3><i class="fas fa-cog"></i> Service Requested</h3>
            <div class="service-card">
              <div class="service-name">${escapeHtml(ticket.serviceName)}</div>
              ${ticket.formData?.package ? `
                <div class="service-package">
                  <i class="fas fa-box"></i> Package: ${escapeHtml(ticket.formData.package)}
                </div>
              ` : ''}
            </div>
          </div>
          
          <!-- Form Details -->
          <div class="ticket-form-section">
            <h3><i class="fas fa-file-alt"></i> Form Details</h3>
            <div class="form-details-grid">
              ${Object.entries(ticket.formData || {}).map(([key, value]) => {
    let displayValue = value;
    if (Array.isArray(value)) {
      displayValue = value.join(', ');
    }
    if (!displayValue || displayValue.toString().trim() === '') {
      displayValue = '<em>Not provided</em>';
    }
    return `
                  <div class="form-field">
                    <div class="field-label">${escapeHtml(key)}:</div>
                    <div class="field-value">${displayValue}</div>
                  </div>
                `;
  }).join('')}
            </div>
          </div>
          
          <!-- Messages -->
          ${ticket.messages && ticket.messages.length > 0 ? `
            <div class="ticket-messages-section">
              <h3><i class="fas fa-comments"></i> Related Messages</h3>
              <div class="messages-container">
                ${ticket.messages.map(msg => `
                  <div class="message-item ${msg.sender}">
                    <div class="message-header">
                      <span class="message-sender">
                        <i class="fas fa-${msg.sender === 'user' ? 'user' : 'headset'}"></i>
                        ${msg.sender === 'user' ? 'You' : 'Tekagon Support'}
                      </span>
                      <span class="message-time">
                        ${new Date(msg.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <div class="message-content">${escapeHtml(msg.content)}</div>
                  </div>
                `).join('')}
              </div>
            </div>
          ` : ''}
          
          <!-- Admin Notes -->
          ${ticket.adminNotes ? `
            <div class="admin-notes-section">
              <h3><i class="fas fa-sticky-note"></i> Admin Notes</h3>
              <div class="notes-content">${escapeHtml(ticket.adminNotes)}</div>
            </div>
          ` : ''}
        </div>
        
        <div class="modal-footer">
          <div class="ticket-timestamps">
            <div class="timestamp">
              <i class="fas fa-calendar-plus"></i>
              Created: ${new Date(ticket.createdAt).toLocaleString()}
            </div>
            <div class="timestamp">
              <i class="fas fa-calendar-check"></i>
              Updated: ${new Date(ticket.updatedAt).toLocaleString()}
            </div>
          </div>
          <div class="modal-actions">
            <button class="btn-secondary" id="closeModalBtn">
              <i class="fas fa-times"></i> Close
            </button>
            <button class="btn-primary" id="chatAboutTicketBtn" data-ticket-id="${ticket.id}">
              <i class="fas fa-comment"></i> Chat About This Ticket
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  // Remove existing modal
  const existingModal = document.getElementById('ticketModal');
  if (existingModal) existingModal.remove();

  // Add new modal
  document.body.insertAdjacentHTML('beforeend', modalHTML);

  // Add modal styles
  addTicketModalStyles();

  // Add event listeners for modal buttons
  document.getElementById('closeTicketModal')?.addEventListener('click', closeTicketModal);
  document.getElementById('closeModalBtn')?.addEventListener('click', closeTicketModal);

  document.getElementById('chatAboutTicketBtn')?.addEventListener('click', function () {
    const ticketId = this.dataset.ticketId;
    closeTicketModal();

    // Navigate to chat
    if (typeof buildPage === 'function') {
      buildPage('chat');
    }
    localStorage.setItem('current_ticket_id', ticketId);

    setTimeout(() => {
      const chatInput = document.getElementById('chatInput');
      if (chatInput) {
        const tickets = window.getUserTickets(localStorage.getItem('chatUserId'));
        const ticket = tickets[ticketId];
        if (ticket) {
          chatInput.value = `I have a question about my ticket #${ticket.id} for ${ticket.serviceName}`;
          chatInput.focus();
        }
      }
    }, 500);
  });

  // Close modal when clicking outside
  document.getElementById('ticketModal')?.addEventListener('click', function (e) {
    if (e.target === this) {
      closeTicketModal();
    }
  });
}

function closeTicketModal() {
  const modal = document.getElementById('ticketModal');
  if (modal) modal.remove();
}

function addTicketModalStyles() {
  if (document.getElementById('ticketModalStyles')) return;

  const style = document.createElement('style');
  style.id = 'ticketModalStyles';
  style.textContent = `
   
  `;

  document.head.appendChild(style);
}

document.addEventListener('DOMContentLoaded', () => {
  // Add at the top of your dashboard.js
  let submissionTimeout = null;

  // --- DOM refs
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('overlay');
  const hamburger = document.getElementById('hamburger');
  const notifBtn = document.getElementById('notifBtn');
  const profileBtn = document.getElementById('profileBtn');
  const carouselEl = document.getElementById('carousel');
  const carouselPrev = document.getElementById('carouselPrev');
  const carouselNext = document.getElementById('carouselNext');
  // parent wrapper of the carousel (may be a hero/banner container) — used to hide empty space
  const carouselParent = carouselEl ? carouselEl.parentElement : null;
  // snapshot inline styles of the parent so we can restore them when showing again
  const _carouselParentInline = carouselParent ? {
    display: carouselParent.style.display || '',
    margin: carouselParent.style.margin || '',
    padding: carouselParent.style.padding || '',
    height: carouselParent.style.height || '',
    minHeight: carouselParent.style.minHeight || '',
    overflow: carouselParent.style.overflow || ''
  } : null;
  const pageEl = document.getElementById('page');

  // ========== GLOBAL TICKET FUNCTIONS ==========
  // These MUST be defined before they're used

  window.createTicket = function (serviceName, formData, userId) {
    console.log('createTicket called with:', { serviceName, userId });

    try {
      const ticketId = 'TKT_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      const ticket = {
        id: ticketId,
        serviceName: serviceName,
        formData: formData,
        userId: userId,
        userName: localStorage.getItem('userName') || formData.fullName || 'User',
        status: 'pending',
        priority: 'normal',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        messages: [],
        adminNotes: ''
      };

      console.log('Ticket object created:', ticketId);

      // Save to localStorage
      const tickets = JSON.parse(localStorage.getItem('tekagon_tickets') || '{}');
      console.log('Existing tickets:', Object.keys(tickets).length);

      if (!tickets[userId]) tickets[userId] = {};
      tickets[userId][ticketId] = ticket;

      localStorage.setItem('tekagon_tickets', JSON.stringify(tickets));
      console.log('Saved to tekagon_tickets');

      // Also add to all tickets list for admin
      const allTickets = JSON.parse(localStorage.getItem('tekagon_all_tickets') || '[]');
      allTickets.push({
        ticketId: ticketId,
        userId: userId,
        serviceName: serviceName,
        status: 'pending',
        createdAt: ticket.createdAt
      });

      localStorage.setItem('tekagon_all_tickets', JSON.stringify(allTickets));
      console.log('Saved to tekagon_all_tickets');

      return ticket;

    } catch (error) {
      console.error('Error in createTicket:', error);
      throw error;
    }
  };

  window.formatServiceBrief = function (serviceName, formData, userName, ticketId) {
    console.log('formatServiceBrief called');

    try {
      let brief = `🚀 NEW SERVICE REQUEST - Ticket #${ticketId}\n`;
      brief += `=====================================\n`;
      brief += `📋 Service: ${serviceName}\n`;
      brief += `👤 Customer: ${userName}\n`;
      brief += `🆔 User ID: ${localStorage.getItem('chatUserId') || 'N/A'}\n`;
      brief += `📅 Submitted: ${new Date().toLocaleString()}\n`;
      brief += `=====================================\n\n`;

      // Add package info if available
      if (formData.package) {
        brief += `📦 Package: ${formData.package}\n`;
      }

      brief += `📝 FORM DETAILS:\n`;

      // Only include non-empty fields
      Object.entries(formData).forEach(([key, value]) => {
        if (value && value.toString().trim() !== '') {
          brief += `• ${key}: ${value}\n`;
        }
      });

      brief += `\n=====================================\n`;
      brief += `✅ Ticket created: #${ticketId}\n`;
      brief += `🔗 View in admin dashboard for updates\n`;

      return brief;

    } catch (error) {
      console.error('Error in formatServiceBrief:', error);
      return `New service request for ${serviceName} - Ticket #${ticketId}`;
    }
  };

  window.getUserTickets = function (userId) {
    const tickets = JSON.parse(localStorage.getItem('tekagon_tickets') || '{}');
    return tickets[userId] || {};
  };
  // ========== END GLOBAL FUNCTIONS ==========

  // Add these event handlers (place them after the DOMContentLoaded event)
  window.handleChatInputKeydown = function (event) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      window.sendChatMessage();
    }
  };

  window.switchToTicketChat = function (ticketId) {
    currentChatTicket = ticketId;
    localStorage.setItem('current_ticket_id', ticketId);
    buildPage('chat');
  };

  window.switchToGeneralChat = function () {
    currentChatTicket = null;
    localStorage.removeItem('current_ticket_id');
    buildPage('chat');
  };

  window.dismissNotification = function () {
    console.log('Dismissing notification...');

    const notification = document.getElementById('floatingNotification');
    if (notification) {
      notification.style.opacity = '0';
      notification.style.transform = 'translateY(20px)';
      setTimeout(() => notification.remove(), 300);
    }

    // Don't mark messages as read when dismissing notification
    // Let users manually read them
  };
  window.setQuickReply = function (message) {
    const chatInput = document.getElementById('chatInput');
    if (chatInput) {
      chatInput.value = message;
      chatInput.focus();
    }
  };

  // Enhanced sendChatMessage function
  window.sendChatMessage = function () {
    const chatInput = document.getElementById('chatInput');
    if (!chatInput) return;

    const message = chatInput.value.trim();
    if (!message) return;

    const currentTicketId = localStorage.getItem('current_ticket_id');
    const userId = localStorage.getItem('chatUserId');

    // Create message object
    const newMessage = {
      id: 'msg_' + Date.now(),
      sender: 'user',
      content: message,
      timestamp: new Date().toISOString(),
      read: true,
      ticketId: currentTicketId || null
    };

    if (currentTicketId) {
      // Save to SEPARATE ticket chats storage
      saveTicketMessage(currentTicketId, newMessage);

      // Also update the ticket with this message
      const tickets = JSON.parse(localStorage.getItem('tekagon_tickets') || '{}');
      if (tickets[userId] && tickets[userId][currentTicketId]) {
        if (!tickets[userId][currentTicketId].messages) {
          tickets[userId][currentTicketId].messages = [];
        }
        tickets[userId][currentTicketId].messages.push({
          sender: 'user',
          content: message,
          timestamp: new Date().toISOString()
        });
        localStorage.setItem('tekagon_tickets', JSON.stringify(tickets));
      }
    } else {
      // Save to general chat ONLY (not mixed with tickets)
      const conversations = JSON.parse(localStorage.getItem(CHAT_STORAGE_KEY) || '{}');
      if (!conversations[userId]) conversations[userId] = [];
      conversations[userId].push(newMessage);
      localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(conversations));
    }

    // Update UI
    const messagesContainer = document.getElementById('messagesContainer');
    if (messagesContainer) {
      const messageHTML = renderChatMessage(newMessage);
      messagesContainer.innerHTML += messageHTML;
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    // Clear input
    chatInput.value = '';
    chatInput.focus();

    // Show typing indicator
    showTypingIndicator();

    // Simulate response
    setTimeout(() => {
      simulateSupportResponse(message, currentTicketId, userId);
    }, 1500 + Math.random() * 2000);
  };

  // Fix ticket message saving - COMPLETELY SEPARATE storage
  function saveTicketMessage(ticketId, message) {
    try {
      // Use SEPARATE storage for ticket chats
      const ticketChats = JSON.parse(localStorage.getItem(TICKET_CHAT_KEY) || '{}');

      if (!ticketChats[ticketId]) {
        ticketChats[ticketId] = [];
      }

      // Only add to ticket-specific chat
      ticketChats[ticketId].push(message);

      // Save SEPARATELY from general chats
      localStorage.setItem(TICKET_CHAT_KEY, JSON.stringify(ticketChats));

      console.log(`Saved message to SEPARATE ticket chat for ${ticketId}`);

    } catch (e) {
      console.error('Failed to save ticket message:', e);
    }
  }

  // Fix simulateSupportResponse to respect separation
  function simulateSupportResponse(userMessage, ticketId = null, userId) {
    hideTypingIndicator();

    let response;

    if (ticketId) {
      const responses = [
        `Thank you for your message regarding ticket #${ticketId.substring(0, 10)}. We're looking into it.`,
        `We've received your update for ticket #${ticketId.substring(0, 10)}. Our team will review it shortly.`,
        `Regarding your ticket #${ticketId.substring(0, 10)}: Can you provide more details about the issue?`,
        `We're currently working on ticket #${ticketId.substring(0, 10)}. We'll update you shortly.`
      ];
      response = responses[Math.floor(Math.random() * responses.length)];
    } else {
      const responses = [
        "Thanks for your message! Our team will get back to you shortly.",
        "I understand. We're reviewing your request and will respond soon.",
        "Great question! Our typical timeline for that is 4-6 weeks.",
        "Can you provide more details about what you're looking for?"
      ];
      response = responses[Math.floor(Math.random() * responses.length)];
    }

    const supportMessage = {
      id: 'support_' + Date.now(),
      sender: 'bot',
      content: response,
      timestamp: new Date().toISOString(),
      read: false,
      ticketId: ticketId
    };

    if (ticketId) {
      // Save to SEPARATE ticket chat storage
      saveTicketMessage(ticketId, supportMessage);
    } else {
      // Save to general chat storage only
      const conversations = JSON.parse(localStorage.getItem(CHAT_STORAGE_KEY) || '{}');
      if (!conversations[userId]) conversations[userId] = [];
      conversations[userId].push(supportMessage);
      localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(conversations));
    }

    // Update UI
    const messagesContainer = document.getElementById('messagesContainer');
    if (messagesContainer) {
      messagesContainer.innerHTML += renderChatMessage(supportMessage);
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    // Update notification
    updateUnreadNotification();
  }

  // nav elements
  const navMainBtns = Array.from(document.querySelectorAll('.nav-item.nav-main'));
  const navGroup = document.querySelector('.nav-group');
  const navGroupToggle = document.querySelector('.nav-group-toggle');
  const navGroupList = document.querySelector('.nav-group-list');
  const navSubitems = Array.from(document.querySelectorAll('.nav-subitem'));

  // default state
  let currentPage = 'home';
  let previousPage = null;
  // lastViewState holds the exact state of the page before opening a detail (used to restore on Back)
  let lastViewState = null;
  // when we want to open a specific item after building a page (used for hash restore)
  let pendingOpenItem = null;
  let currentSlide = 0;
  let slideCount = 0;
  let slideInterval = null;
  const AUTO_MS = 5000;

  // --- Chat System Variables
  let chatMessages = [];
  let currentChatUser = null;
  let currentChatTicket = null;
  const CHAT_STORAGE_KEY = 'tekagon_chat_conversations';
  const TICKET_CHAT_KEY = 'tekagon_ticket_chats'; // New: Separate storage for ticket chats

  // --- Page data (change image paths to ./assets/... if you add local files)
  const pageData = {
    home: {
      title: 'Trending Projects',
      banners: [
        { title: 'Dune: Part Two', desc: 'Paul Atreides returns, Business visibility can be enhanced by design tool to visualise prospective products of your business', meta: 'View Now', count: '+100 Views', inlineIconText: '4.7', inlineImage: '../Images/people.png', inlineIcon: '../Images/Polygon.png', image: 'https://images.unsplash.com/photo-1505685296765-3a2736de412f?auto=format&fit=crop&w=1650&q=80' },
        { title: 'Launching Gamer', desc: 'Paul Atreides returns, Business visibility can be enhanced by design tool to visualise prospective products of your business', meta: 'View Now', count: '+105 Views', inlineIconText: '4.7', inlineImage: '../Images/people.png', inlineIcon: '../Images/Polygon.png', image: '../Images/back3.png' },
        { title: 'Nocturne Runner', desc: 'Paul Atreides returns, Business visibility can be enhanced by design tool to visualise prospective products of your business', meta: 'View Now', count: '+110 Views', inlineIconText: '4.7', inlineImage: '../Images/people.png', inlineIcon: '../Images/Polygon.png', image: '../Images/seta.png' }
      ],
      items: [
        { title: 'Social Betting Platform', prf: 'Luelink', prfTxt: 'Social betting', inlineImage: '../Images/thumb_1.png', btn: 'View Now', meta: 'Atreides returns, Business visibility can be enhanced by design ', img: '../Images/trending (2).jpeg' },
        { title: 'All In one Solution', prf: 'TeckIQ', prfTxt: 'Tech Services', inlineImage: '../Images/thumb_2.png', btn: 'View Now', meta: 'Atreides returns, Business visibility can be enhanced by design', img: '../Images/trending (1).jpeg' },
        { title: 'Food Brand', prf: 'Deylish Kitchen', prfTxt: 'All in one movies', inlineImage: '../Images/thumb_3.png', btn: 'View Now', meta: 'Atreides returns, Business visibility can be enhanced by design', img: '../Images/trending (3).jpeg' },
        { title: 'Medical Branding', prf: 'City of Hope', prfTxt: 'Medical treatment & services', inlineImage: '../Images/thumb_4.png', btn: 'View Now', meta: 'Atreides returns, Business visibility can be enhanced by design', img: 'https://images.unsplash.com/photo-1524985069026-dd778a71c7b4?auto=format&fit=crop&w=800&q=60' }
      ]
    },
    service: {
      title: '',
    },
    stack: { title: 'Tech Stack' },

    contact: { title: '' },

    // Add this to the pageData object (around line 30-40)
    book: {
      title: 'Book a Session',
      banners: [{
        title: 'Schedule Your Session',
        desc: 'Transform your business with expert digital guidance',
        meta: 'SME Digital Consultation',
        image: '../Images/servBck (1).jfif'
      }]
    },

    // Chatbot page data
    chat: {
      title: 'Live Chat Support',
      banners: [{
        title: 'Live Chat Support',
        desc: 'Chat with our team in real-time',
        image: '../Images/servBck (1).jfif'
      }]
    },

    // Add to pageData object (around other pages)
    tickets: {
      title: 'My Tickets',
      banners: [{
        title: 'Service Tickets',
        desc: 'Track your service requests and orders',
        image: '../Images/servBck (1).jfif'
      }]
    },

    portfolio: {
      title: 'Portfolio',
      banners: [{ title: 'Selected Work', meta: 'Portfolio', desc: 'A selection of recent projects.', image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1650&q=80' }],
      items: []
    },

    'portfolio-mobile': {
      title: 'Mobile App Projects',
      banners: [{ title: 'Mobile', meta: 'iOS & Android', desc: 'Beautiful mobile experiences', image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=1650&q=80' }],
      items: [
        { title: 'Social Betting Platform', prf: 'Luelink', prfTxt: 'Social betting', inlineImage: '../Images/thumb_1.png', btn: 'View Now', meta: 'Atreides returns, Business visibility can be enhanced by design ', img: '../Images/trending (2).jpeg' },
        { title: 'All In one Solution', prf: 'TeckIQ', prfTxt: 'Tech Services', inlineImage: '../Images/thumb_2.png', btn: 'View Now', meta: 'Atreides returns, Business visibility can be enhanced by design', img: '../Images/trending (1).jpeg' },
        { title: 'Food Brand', prf: 'Deylish Kitchen', prfTxt: 'All in one movies', inlineImage: '../Images/thumb_3.png', btn: 'View Now', meta: 'Atreides returns, Business visibility can be enhanced by design', img: '../Images/trending (3).jpeg' },
        { title: 'Medical Branding', prf: 'City of Hope', prfTxt: 'Medical treatment & services', inlineImage: '../Images/thumb_4.png', btn: 'View Now', meta: 'Atreides returns, Business visibility can be enhanced by design', img: 'https://images.unsplash.com/photo-1524985069026-dd778a71c7b4?auto=format&fit=crop&w=800&q=60' },
        { title: 'Social Betting Platform', prf: 'Luelink', prfTxt: 'Social betting', inlineImage: '../Images/thumb_1.png', btn: 'View Now', meta: 'Atreides returns, Business visibility can be enhanced by design ', img: '../Images/cards/crd (1).gif' },
        { title: 'All In one Solution', prf: 'TeckIQ', prfTxt: 'Tech Services', inlineImage: '../Images/thumb_2.png', btn: 'View Now', meta: 'Atreides returns, Business visibility can be enhanced by design', img: '../Images/cards/crd (1).webp' },
        { title: 'Food Brand', prf: 'Deylish Kitchen', prfTxt: 'All in one movies', inlineImage: '../Images/thumb_3.png', btn: 'View Now', meta: 'Atreides returns, Business visibility can be enhanced by design', img: '../Images/cards/crd (1).png' },
        { title: 'Medical Branding', prf: 'City of Hope', prfTxt: 'Medical treatment & services', inlineImage: '../Images/thumb_4.png', btn: 'View Now', meta: 'Atreides returns, Business visibility can be enhanced by design', img: '../Images/cards/crd (1).jpeg' }
      ]
    },

    'portfolio-web': {
      title: 'Web Development',
      banners: [{ title: 'Web', meta: 'Modern websites', desc: 'Fast & accessible websites', image: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1650&q=80' }],
      items: [
        { title: 'Social Betting Platform', prf: 'Luelink', prfTxt: 'Social betting', inlineImage: '../Images/thumb_1.png', btn: 'View Now', meta: 'Atreides returns, Business visibility can be enhanced by design ', img: '../Images/cards/crd (10).gif' },
        { title: 'All In one Solution', prf: 'TeckIQ', prfTxt: 'Tech Services', inlineImage: '../Images/thumb_2.png', btn: 'View Now', meta: 'Atreides returns, Business visibility can be enhanced by design', img: '../Images/cards/crd (10).jpeg' },
        { title: 'Food Brand', prf: 'Deylish Kitchen', prfTxt: 'All in one movies', inlineImage: '../Images/thumb_3.png', btn: 'View Now', meta: 'Atreides returns, Business visibility can be enhanced by design', img: '../Images/cards/crd (10).webp' },
        { title: 'Medical Branding', prf: 'City of Hope', prfTxt: 'Medical treatment & services', inlineImage: '../Images/thumb_4.png', btn: 'View Now', meta: 'Atreides returns, Business visibility can be enhanced by design', img: '../Images/cards/crd (11).gif' },
        { title: 'Social Betting Platform', prf: 'Luelink', prfTxt: 'Social betting', inlineImage: '../Images/thumb_1.png', btn: 'View Now', meta: 'Atreides returns, Business visibility can be enhanced by design ', img: '../Images/cards/crd (19).jpeg' },
        { title: 'All In one Solution', prf: 'TeckIQ', prfTxt: 'Tech Services', inlineImage: '../Images/thumb_2.png', btn: 'View Now', meta: 'Atreides returns, Business visibility can be enhanced by design', img: '../Images/trending (1).jpeg' },
        { title: 'Food Brand', prf: 'Deylish Kitchen', prfTxt: 'All in one movies', inlineImage: '../Images/thumb_3.png', btn: 'View Now', meta: 'Atreides returns, Business visibility can be enhanced by design', img: '../Images/cards/crd (12).gif' },
        { title: 'Medical Branding', prf: 'City of Hope', prfTxt: 'Medical treatment & services', inlineImage: '../Images/thumb_4.png', btn: 'View Now', meta: 'Atreides returns, Business visibility can be enhanced by design', img: '../Images/cards/crd (12).jpeg' }
      ]
    },

    'portfolio-brand': {
      title: 'Branding',
      banners: [{ title: 'Branding', meta: 'Identity', desc: 'Logos and visual systems', image: '../Images/cards/crd (13).gif' }],
      items: [
        { title: 'Social Betting Platform', prf: 'Luelink', prfTxt: 'Social betting', inlineImage: '../Images/luelink/Group 1.png', btn: 'View Now', meta: 'Atreides returns, Business visibility can be enhanced by design ', img: '../Images/trending (1).jpeg' },
        { title: 'All In one Solution', prf: 'TeckIQ', prfTxt: 'Tech Services', inlineImage: '../Images/thumb_2.png', btn: 'View Now', meta: 'Atreides returns, Business visibility can be enhanced by design', img: '../Images/cards/crd (19).jpeg' },
        { title: 'Food Brand', prf: 'Deylish Kitchen', prfTxt: 'All in one movies', inlineImage: '../Images/thumb_3.png', btn: 'View Now', meta: 'Atreides returns, Business visibility can be enhanced by design', img: '../Images/cards/crd (14).gif' },
        { title: 'Medical Branding', prf: 'City of Hope', prfTxt: 'Medical treatment & services', inlineImage: '../Images/thumb_4.png', btn: 'View Now', meta: 'Atreides returns, Business visibility can be enhanced by design', img: '../Images/cards/crd (1).gif' },
        { title: 'Social Betting Platform', prf: 'Luelink', prfTxt: 'Social betting', inlineImage: '../Images/thumb_1.png', btn: 'View Now', meta: 'Atreides returns, Business visibility can be enhanced by design ', img: '../Images/cards/crd (14).jpeg' },
        { title: 'All In one Solution', prf: 'TeckIQ', prfTxt: 'Tech Services', inlineImage: '../Images/thumb_2.png', btn: 'View Now', meta: 'Atreides returns, Business visibility can be enhanced by design', img: '../Images/cards/crd (19).webp' },
        { title: 'Food Brand', prf: 'Deylish Kitchen', prfTxt: 'All in one movies', inlineImage: '../Images/thumb_3.png', btn: 'View Now', meta: 'Atreides returns, Business visibility can be enhanced by design', img: '../Images/cards/crd (15).gif' },
        { title: 'Medical Branding', prf: 'City of Hope', prfTxt: 'Medical treatment & services', inlineImage: '../Images/thumb_4.png', btn: 'View Now', meta: 'Atreides returns, Business visibility can be enhanced by design', img: '../Images/cards/crd (15).jpeg' }
      ]
    },
    'portfolio-uiux': {
      title: 'UI/UX & Product',
      banners: [{ title: 'Product Design', meta: 'UI / UX', desc: 'Design systems & experiences', image: '../Images/cards/crd (15).webp' }],
      items: [
        { title: 'Social Betting Platform', prf: 'Luelink', prfTxt: 'Social betting', inlineImage: '../Images/thumb_1.png', btn: 'View Now', meta: 'Atreides returns, Business visibility can be enhanced by design ', img: '../Images/cards/crd (16).gif' },
        { title: 'All In one Solution', prf: 'TeckIQ', prfTxt: 'Tech Services', inlineImage: '../Images/thumb_2.png', btn: 'View Now', meta: 'Atreides returns, Business visibility can be enhanced by design', img: '../Images/cards/crd (16).jpeg' },
        { title: 'Food Brand', prf: 'Deylish Kitchen', prfTxt: 'All in one movies', inlineImage: '../Images/thumb_3.png', btn: 'View Now', meta: 'Atreides returns, Business visibility can be enhanced by design', img: '../Images/cards/crd (16).webp' },
        { title: 'Medical Branding', prf: 'City of Hope', prfTxt: 'Medical treatment & services', inlineImage: '../Images/thumb_4.png', btn: 'View Now', meta: 'Atreides returns, Business visibility can be enhanced by design', img: '../Images/cards/crd (17).gif' },
        { title: 'Social Betting Platform', prf: 'Luelink', prfTxt: 'Social betting', inlineImage: '../Images/thumb_1.png', btn: 'View Now', meta: 'Atreides returns, Business visibility can be enhanced by design ', img: '../Images/cards/crd (17).jpeg' },
        { title: 'All In one Solution', prf: 'TeckIQ', prfTxt: 'Tech Services', inlineImage: '../Images/thumb_2.png', btn: 'View Now', meta: 'Atreides returns, Business visibility can be enhanced by design', img: '../Images/cards/crd (17).webp' },
        { title: 'Food Brand', prf: 'Deylish Kitchen', prfTxt: 'All in one movies', inlineImage: '../Images/thumb_3.png', btn: 'View Now', meta: 'Atreides returns, Business visibility can be enhanced by design', img: '../Images/cards/crd (18).jpeg' },
        { title: 'Medical Branding', prf: 'City of Hope', prfTxt: 'Medical treatment & services', inlineImage: '../Images/thumb_4.png', btn: 'View Now', meta: 'Atreides returns, Business visibility can be enhanced by design', img: '../Images/cards/crd (18).gif' }
      ]
    },
    profile: {
      title: 'Profile',
      banners: [{ image: '../Images/tekagon profile dashboard.png' }],
      heroImage: '../Images/abt (1).jfif',
      about: 'Tekagon is a forward-thinking digital and technology agency focused on building scalable products, strong brands, and high-performing digital systems for modern businesses. Our mission is to empower businesses through innovative technology solutions and creative design, helping them thrive in a rapidly evolving digital landscape. We specialize in web and mobile app development, UI/UX design, branding, and digital marketing, delivering tailored solutions that drive growth and enhance user experiences. Our team of experts is dedicated to pushing the boundaries of technology and design, ensuring our clients stay ahead of the curve. At Tekagon, we believe in the power of collaboration, innovation, and excellence to transform ideas into impactful digital realities.',
      contact: {
        email: 'support@tekagon.com',
        phone: '+234 816 788 3281',
        address: 'Effurun, Warri City, Delta State, Nigeria',
        socials: {
          linkedin: { icon: 'fa-brands fa-linkedin', url: 'https://linkedin.com/' },
          twitter: { icon: 'fa-brands fa-twitter', url: 'https://twitter.com/' },
          dribbble: { icon: 'fa-brands fa-dribbble', url: 'https://dribbble.com/' },
          facebook: { icon: 'fa-brands fa-facebook', url: 'https://facebook.com/' },
          instagram: { icon: 'fa-brands fa-instagram', url: 'https://instagram.com/' }
        }
      }
    }
  };

  // Add this function near the top of dashboard.js

  // --- Helpers for building UI
  function escapeHtml(str) { if (!str) return ''; return String(str).replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m])); }

  // --- Card pages registry (separate from pageData)
  // Use this map to register per-card innerHTML detail pages keyed by "sourcePage::index".
  const cardPages = {};

  // Register a card page by key. key = `${sourcePage}::${index}`
  function registerCardPage(key, html) {
    if (!key) return;
    cardPages[key] = String(html || '');
  }

  function getCardPage(key) {
    return cardPages[key];
  };

  (function registerCustomCardPages() {
    try {
      registerCardPage('portfolio-mobile::0', `
        <div class="banner-wrap card-detail-banner" style="background-image: url('../Images/servBck (1).jfif');">
          <button id="backToPrev" class="back-btn">← Back</button>
          <div class="card-detail-overlay"><h1 class="card-detail-title">Portfolio Web — Case Study</h1></div>
        </div>
                  <!-- Portfolio 1 SECTION -->
            <section class="abtCont">
           
            <div>
              <p class="orange-label">Behind the Designs</p>

              <h2 class="about-title">
                Bible Quiz App
              </h2>
              <!-- LEFT SIDE IMAGE -->
                <div class="about-image-box">
                  <img src="../images/Quiz.jpeg" alt="About Image">
                </div>
              </div>
             

                <div>
                  <p class="small-text"><i class="fa-solid fa-check-circle"></i>
Designed and developed a full-stack quiz website for church examinations and competitions.</p>

                  <p class="small-text"><i class="fa-solid fa-check-circle"></i> Built responsive user interfaces using HTML, CSS, and JavaScript for a seamless participant experience. </p>

                  <p class="small-text"><i class="fa-solid fa-check-circle"></i> Implemented dynamic quiz logic and scoring systems using JavaScript.</p>

                  <p class="small-text"> <i class="fa-solid fa-check-circle"></i>Utilized JSON for data storage and management due to the project’s short-term deployment needs. </p>

                  <p class="small-text"><i class="fa-solid fa-check-circle"></i> Ensured functionality for multiple user groups, including students and administrators.</p>

                  <p class="small-text"><i class="fa-solid fa-check-circle"></i> Optimized performance, user experience, and reliability for church examination operations.
                </p>

                <br>
                  
                  <button class="btn-primary">Get in touch →</button>
                </div>
           
           

              <!-- IMAGE GRID -->
              
            </section>
            <div class="img-row">
                <img src="img1.jpg" />
                <img src="img2.jpg" />
                <img src="img3.jpg" />
              </div>

      `);

      registerCardPage('portfolio-mobile::1', `
        <div class="banner-wrap" style="background-image: url('../Images/servBck (1).jfif'); height:380px; background-size:cover; background-position:center; border-radius:10px; position:relative;">
          <button id="backToPrev" style="position:absolute; left:12px; top:12px; z-index:120; padding:10px 12px; border-radius:8px; background:rgba(0,0,0,0.5); color:#fff; border:0; cursor:pointer;">← Back</button>
          <div style="position:absolute; left:28px; bottom:28px; color:#fff; z-index:110;"><h1 style="margin:0; font-size:2rem;">Portfolio Web — Case Study</h1></div>
        </div>
                <!-- Portfolio 1 SECTION -->
            <section class="abtCont">
           
            <div>
              <p class="orange-label">Behind the Designs</p>

              <h2 class="about-title">
                PayPlexx Banking App
              </h2>
              <!-- LEFT SIDE IMAGE -->
                <div class="about-image-box">
                  <img src="../images/payplexx.png" alt="About Image">
                </div>
              </div>
             

                <div>
                  <p class="small-text"><i class="fa-solid fa-check-circle"></i>  Developed, maintained, and optimized backend systems to ensure high performance and scalability.</p>

                  <p class="small-text"><i class="fa-solid fa-check-circle"></i> Fixed bugs and resolved technical issues to enhance system stability and improve user experience.</p>

                 <p class="small-text"><i class="fa-solid fa-check-circle"></i> Integrated smooth communication flow between frontend and backend using RESTful APIs.</p>

                 <p class="small-text"><i class="fa-solid fa-check-circle"></i>  Designed and managed MongoDB databases for data storage, retrieval, and performance optimization.</p>

                 <p class="small-text"><i class="fa-solid fa-check-circle"></i>  Integrated various third-party APIs to extend application functionality and improve service delivery.</p>

                 <p class="small-text"><i class="fa-solid fa-check-circle"></i>  Collaborated with frontend developers and designers to ensure seamless system integration.</p>

                 <p class="small-text"><i class="fa-solid fa-check-circle"></i>  Deployed and managed backend applications on servers, ensuring reliable uptime and performance.</p>

                 <p class="small-text"><i class="fa-solid fa-check-circle"></i> Regularly updated and refactored codebases to improve maintainability, security, and efficiency.</p>

                <br>
                  
                  <button class="btn-primary">Get in touch →</button>
                </div>
           
           

              <!-- IMAGE GRID -->
              
            </section>
            <div class="img-row">
                <img src="../images/payplexx_1.png" />
                <img src="../images/payplexx_2.png" />
                <img src="../images/payplexx_3.png" />
              </div>
      `);

      registerCardPage('portfolio-mobile::2', `
        <div class="banner-wrap" style="background-image: url('../Images/servBck (1).jfif'); height:380px; background-size:cover; background-position:center; border-radius:10px; position:relative;">
          <button id="backToPrev" style="position:absolute; left:12px; top:12px; z-index:120; padding:10px 12px; border-radius:8px; background:rgba(0,0,0,0.5); color:#fff; border:0; cursor:pointer;">← Back</button>
          <div style="position:absolute; left:28px; bottom:28px; color:#fff; z-index:110;"><h1 style="margin:0; font-size:2rem;">Portfolio Web — Case Study</h1></div>
        </div>
        <section class="card" style="padding:18px;">
          <h3>Overview</h3>
          <p style="color:var(--muted);">Custom HTML for portfolio-web::0</p>
        </section>
      `);

      registerCardPage('portfolio-mobile::3', `
        <div class="banner-wrap" style="background-image: url('../Images/servBck (1).jfif'); height:380px; background-size:cover; background-position:center; border-radius:10px; position:relative;">
          <button id="backToPrev" style="position:absolute; left:12px; top:12px; z-index:120; padding:10px 12px; border-radius:8px; background:rgba(0,0,0,0.5); color:#fff; border:0; cursor:pointer;">← Back</button>
          <div style="position:absolute; left:28px; bottom:28px; color:#fff; z-index:110;"><h1 style="margin:0; font-size:2rem;">Portfolio Web — Case Study</h1></div>
        </div>
        <section class="card" style="padding:18px;">
          <h3>Overview</h3>
          <p style="color:var(--muted);">Custom HTML for portfolio-web::0</p>
        </section>
      `);

      registerCardPage('portfolio-mobile::4', `
        <div class="banner-wrap" style="background-image: url('../Images/servBck (1).jfif'); height:380px; background-size:cover; background-position:center; border-radius:10px; position:relative;">
          <button id="backToPrev" style="position:absolute; left:12px; top:12px; z-index:120; padding:10px 12px; border-radius:8px; background:rgba(0,0,0,0.5); color:#fff; border:0; cursor:pointer;">← Back</button>
          <div style="position:absolute; left:28px; bottom:28px; color:#fff; z-index:110;"><h1 style="margin:0; font-size:2rem;">Portfolio Web — Case Study</h1></div>
        </div>
        <section class="card" style="padding:18px;">
          <h3>Overview</h3>
          <p style="color:var(--muted);">Custom HTML for portfolio-web::0</p>
        </section>
      `);

      registerCardPage('portfolio-mobile::5', `
        <div class="banner-wrap" style="background-image: url('../Images/servBck (1).jfif'); height:380px; background-size:cover; background-position:center; border-radius:10px; position:relative;">
          <button id="backToPrev" style="position:absolute; left:12px; top:12px; z-index:120; padding:10px 12px; border-radius:8px; background:rgba(0,0,0,0.5); color:#fff; border:0; cursor:pointer;">← Back</button>
          <div style="position:absolute; left:28px; bottom:28px; color:#fff; z-index:110;"><h1 style="margin:0; font-size:2rem;">Portfolio Web — Case Study</h1></div>
        </div>
        <section class="card" style="padding:18px;">
          <h3>Overview</h3>
          <p style="color:var(--muted);">Custom HTML for portfolio-web::0</p>
        </section>
      `);

      registerCardPage('portfolio-mobile::6', `
        <div class="banner-wrap" style="background-image: url('../Images/servBck (1).jfif'); height:380px; background-size:cover; background-position:center; border-radius:10px; position:relative;">
          <button id="backToPrev" style="position:absolute; left:12px; top:12px; z-index:120; padding:10px 12px; border-radius:8px; background:rgba(0,0,0,0.5); color:#fff; border:0; cursor:pointer;">← Back</button>
          <div style="position:absolute; left:28px; bottom:28px; color:#fff; z-index:110;"><h1 style="margin:0; font-size:2rem;">Portfolio Web — Case Study</h1></div>
        </div>
        <section class="card" style="padding:18px;">
          <h3>Overview</h3>
          <p style="color:var(--muted);">Custom HTML for portfolio-web::0</p>
        </section>
      `);



      // --- manual register of web page portfolio section
      registerCardPage('portfolio-web::7', `
        <div class="banner-wrap" style="background-image: url('../Images/servBck (1).jfif'); height:380px; background-size:cover; background-position:center; border-radius:10px; position:relative;">
          <button id="backToPrev" style="position:absolute; left:12px; top:12px; z-index:120; padding:10px 12px; border-radius:8px; background:rgba(0,0,0,0.5); color:#fff; border:0; cursor:pointer;">← Back</button>
          <div style="position:absolute; left:28px; bottom:28px; color:#fff; z-index:110;"><h1 style="margin:0; font-size:2rem;">Portfolio Web — Case Study</h1></div>
        </div>
        <section class="card" style="padding:18px;">
          <h3>Overview</h3>
          <p style="color:var(--muted);">Custom HTML for portfolio-web::0</p>
        </section>
      `);

      registerCardPage('portfolio-web::1', `
        <div class="banner-wrap" style="background-image: url('../Images/servBck (1).jfif'); height:380px; background-size:cover; background-position:center; border-radius:10px; position:relative;">
          <button id="backToPrev" style="position:absolute; left:12px; top:12px; z-index:120; padding:10px 12px; border-radius:8px; background:rgba(0,0,0,0.5); color:#fff; border:0; cursor:pointer;">← Back</button>
          <div style="position:absolute; left:28px; bottom:28px; color:#fff; z-index:110;"><h1 style="margin:0; font-size:2rem;">Portfolio Web — Case Study</h1></div>
        </div>
        <section class="card" style="padding:18px;">
          <h3>Overview</h3>
          <p style="color:var(--muted);">Custom HTML for portfolio-web::0</p>
        </section>
      `);

      registerCardPage('portfolio-web::2', `
        <div class="banner-wrap" style="background-image: url('../Images/servBck (2).jfif'); height:380px; background-size:cover; background-position:center; border-radius:10px; position:relative;">
          <button id="backToPrev" style="position:absolute; left:12px; top:12px; z-index:120; padding:10px 12px; border-radius:8px; background:rgba(0,0,0,0.5); color:#fff; border:0; cursor:pointer;">← Back</button>
          <div style="position:absolute; left:28px; bottom:28px; color:#fff; z-index:110;"><h1 style="margin:0; font-size:2rem;">Portfolio Web — Case Study</h1></div>
        </div>
        <section class="card" style="padding:18px;">
          <h3>Overview</h3>
          <p style="color:var(--muted);">Custom HTML for portfolio-web::2</p>
        </section>
      `);

      registerCardPage('portfolio-web::3', `
        <div class="banner-wrap" style="background-image: url('../Images/servBck (1).jfif'); height:380px; background-size:cover; background-position:center; border-radius:10px; position:relative;">
          <button id="backToPrev" style="position:absolute; left:12px; top:12px; z-index:120; padding:10px 12px; border-radius:8px; background:rgba(0,0,0,0.5); color:#fff; border:0; cursor:pointer;">← Back</button>
          <div style="position:absolute; left:28px; bottom:28px; color:#fff; z-index:110;"><h1 style="margin:0; font-size:2rem;">Portfolio Web — Case Study</h1></div>
        </div>
        <section class="card" style="padding:18px;">
          <h3>Overview</h3>
          <p style="color:var(--muted);">Custom HTML for portfolio-web::3</p>
        </section>
      `);


      registerCardPage('portfolio-web::4', `
        <div class="banner-wrap" style="background:#0b1220; height:340px; display:flex; align-items:center; justify-content:center; border-radius:8px; color:#fff; position:relative;">
          <button id="backToPrev" style="position:absolute; left:12px; top:12px; padding:8px; border-radius:6px; background:rgba(255,255,255,0.06); color:#fff; border:0; cursor:pointer;">← Back</button>
          <div style="text-align:center;"><h1>Portfolio Web — Landing Page Revamp</h1></div>
        </div>
        <div class="card" style="padding:16px;"><p style="color:var(--muted);">Custom detail for portfolio-web::4</p></div>
      `);

      registerCardPage('portfolio-web::5', `
        <div class="banner-wrap" style="background-image: url('../Images/servBck (1).jfif'); height:380px; background-size:cover; background-position:center; border-radius:10px; position:relative;">
          <button id="backToPrev" style="position:absolute; left:12px; top:12px; z-index:120; padding:10px 12px; border-radius:8px; background:rgba(0,0,0,0.5); color:#fff; border:0; cursor:pointer;">← Back</button>
          <div style="position:absolute; left:28px; bottom:28px; color:#fff; z-index:110;"><h1 style="margin:0; font-size:2rem;">Portfolio Web — Case Study</h1></div>
        </div>
        <section class="card" style="padding:18px;">
          <h3>Overview</h3>
          <p style="color:var(--muted);">Custom HTML for portfolio-web::5</p>
        </section>
      `);

      registerCardPage('portfolio-web::6', `
        <div class="banner-wrap" style="background-image: url('../Images/servBck (1).jfif'); height:380px; background-size:cover; background-position:center; border-radius:10px; position:relative;">
          <button id="backToPrev" style="position:absolute; left:12px; top:12px; z-index:120; padding:10px 12px; border-radius:8px; background:rgba(0,0,0,0.5); color:#fff; border:0; cursor:pointer;">← Back</button>
          <div style="position:absolute; left:28px; bottom:28px; color:#fff; z-index:110;"><h1 style="margin:0; font-size:2rem;">Portfolio Web — Case Study</h1></div>
        </div>
        <section class="card" style="padding:18px;">
          <h3>Overview</h3>
          <p style="color:var(--muted);">Custom HTML for portfolio-web::5</p>
        </section>
      `);

      registerCardPage('portfolio-web::7', `
        <div class="banner-wrap" style="background-image: url('../Images/servBck (1).jfif'); height:380px; background-size:cover; background-position:center; border-radius:10px; position:relative;">
          <button id="backToPrev" style="position:absolute; left:12px; top:12px; z-index:120; padding:10px 12px; border-radius:8px; background:rgba(0,0,0,0.5); color:#fff; border:0; cursor:pointer;">← Back</button>
          <div style="position:absolute; left:28px; bottom:28px; color:#fff; z-index:110;"><h1 style="margin:0; font-size:2rem;">Portfolio Web — Case Study</h1></div>
        </div>
        <section class="card" style="padding:18px;">
          <h3>Overview</h3>
          <p style="color:var(--muted);">Custom HTML for portfolio-web::5</p>
        </section>
      `);

      registerCardPage('portfolio-web::8', `
        <div class="banner-wrap" style="background-image: url('../Images/servBck (1).jfif'); height:380px; background-size:cover; background-position:center; border-radius:10px; position:relative;">
          <button id="backToPrev" style="position:absolute; left:12px; top:12px; z-index:120; padding:10px 12px; border-radius:8px; background:rgba(0,0,0,0.5); color:#fff; border:0; cursor:pointer;">← Back</button>
          <div style="position:absolute; left:28px; bottom:28px; color:#fff; z-index:110;"><h1 style="margin:0; font-size:2rem;">Portfolio Web — Case Study</h1></div>
        </div>
        <section class="card" style="padding:18px;">
          <h3>Overview</h3>
          <p style="color:var(--muted);">Custom HTML for portfolio-web::5</p>
        </section>
      `);


      // --- Detail for branding portfolio page

      registerCardPage('portfolio-brand::0', `
        <div class="banner-wrap" style="background-image: url('../Images/luelink/banner.jpg'); height:380px; background-size:cover; background-position:center; border-radius:10px; position:relative;">
          <button id="backToPrev" style="position:absolute; left:12px; top:12px; z-index:120; padding:10px 12px; border-radius:8px; background:rgba(255, 255, 255, 0.09); color:#fff; border:0; cursor:pointer;">← Back</button>
          <div style="position:absolute; left:28px; bottom:28px; color:#fff; z-index:110;"><h1 style="margin:0; font-size:2rem;"></div>
        </div>
       
         <footer class="service-footer">
      <div class="footer-grid">
        <div class="footer-col">
          <h4>Company</h4>
          <ul>
            <li><a href="#">About Us</a></li>
            <li><a href="#">Careers</a></li>
            <li><a href="#">Contact</a></li>
            <li><a href="#">Blog</a></li>
          </ul>
        </div>
        <div class="footer-col">
          <h4>Services</h4>
          <ul>
            <li><a href="#">Web Development</a></li>
            <li><a href="#">Digital Marketing</a></li>
            <li><a href="#">Brand Design</a></li>
            <li><a href="#">SEO Services</a></li>
          </ul>
        </div>
        <div class="footer-col">
          <h4>Support</h4>
          <ul>
            <li><a href="#">Help Center</a></li>
            <li><a href="#">Documentation</a></li>
            <li><a href="#">API Status</a></li>
            <li><a href="#">Live Chat</a></li>
          </ul>
        </div>
        <div class="footer-col">
          <h4>Legal</h4>
          <ul>
            <li><a href="#">Privacy Policy</a></li>
            <li><a href="#">Terms of Service</a></li>
            <li><a href="#">Cookie Policy</a></li>
            <li><a href="#">GDPR</a></li>
          </ul>
        </div>
      </div>
      <div class="footer-status">
        <div class="status-text">
          <span class="status-indicator"></span>
          <span>All systems operational</span>
        </div>
        <div class="status-time" id="status-time"></div>
      </div>
    </footer>
      `);

      registerCardPage('portfolio-brand::1', `
        <div class="banner-wrap" style="background-image: url('../Images/servBck (1).jfif'); height:380px; background-size:cover; background-position:center; border-radius:10px; position:relative;">
          <button id="backToPrev" style="position:absolute; left:12px; top:12px; z-index:120; padding:10px 12px; border-radius:8px; background:rgba(0,0,0,0.5); color:#fff; border:0; cursor:pointer;">← Back</button>
          <div style="position:absolute; left:28px; bottom:28px; color:#fff; z-index:110;"><h1 style="margin:0; font-size:2rem;">Portfolio Web — Case Study</h1></div>
        </div>
        <section class="card" style="padding:18px;">
          <h3>Overview</h3>
          <p style="color:var(--muted);">Custom HTML for portfolio-web::5</p>
        </section>
      `);



      // --- Detailed custom registrations for requested portfolios
      // portfolio-uiux: 3 detailed pages (0..2)
      (function registerUIUX() {
        [0, 1, 2].forEach(i => {
          const key = 'portfolio-uiux::' + i;
          registerCardPage(key, `
            <div class="banner-wrap" style="background-image:url('../Images/cards/crd (16).jpeg'); height:380px; background-size:cover; background-position:center; border-radius:10px; position:relative;">
              <button id="backToPrev" style="position:absolute; left:12px; top:12px; padding:10px; border-radius:8px; background:rgba(0,0,0,0.5); color:#fff; border:0; cursor:pointer;">← Back</button>
              <div style="position:absolute; left:28px; bottom:28px; color:#fff;"><h1 style="margin:0; font-size:2rem;">UI/UX Case Study ${i + 1}</h1></div>
            </div>
            <section class="card" style="padding:18px;">
              <h3>Project UI Gallery</h3>
              <div style="display:grid; grid-template-columns:repeat(5,1fr); gap:8px; margin-top:12px;">
                <div style="background-image:url('../Images/cards/crd (16).webp'); background-size:cover; height:160px; border-radius:8px;"></div>
                <div style="background-image:url('../Images/cards/crd (17).jpeg'); background-size:cover; height:160px; border-radius:8px;"></div>
                <div style="background-image:url('../Images/cards/crd (18).jpeg'); background-size:cover; height:160px; border-radius:8px;"></div>
                <div style="background-image:url('../Images/cards/crd (15).gif'); background-size:cover; height:160px; border-radius:8px;"></div>
                <div style="background-image:url('../Images/thumb_3.png'); background-size:cover; height:160px; border-radius:8px;"></div>
              </div>
              <hr style="margin:18px 0; border:none; border-top:1px solid rgba(255,255,255,0.04);" />
              <h3>Detailed Writeup</h3>
              <p style="color:var(--muted);">A long-form project write-up describing goals, process, research, iterations, user testing results, and final outcomes. Replace this paragraph with your project-specific content for UI/UX case study ${i + 1}.</p>
              <div style="display:grid; grid-template-columns:repeat(4,1fr); gap:12px; margin-top:16px;">
                <div class="card"><h4>Main Context</h4><p style="color:var(--muted);">Research</p></div>
                <div class="card"><h4>Main Context</h4><p style="color:var(--muted);">Design System</p></div>
                <div class="card"><h4>Main Context</h4><p style="color:var(--muted);">Prototyping</p></div>
                <div class="card"><h4>Main Context</h4><p style="color:var(--muted);">Accessibility</p></div>
              </div>
            </section>
          `);
        });
      })();


      // Example: create placeholders for portfolio pages (0..9) — you can remove these and register bespoke HTML per key instead
      registerPlaceholders('portfolio-web', 5);
      // placeholders for portfolio-mobile, portfolio-uiux and portfolio-brand (0..9)
      registerPlaceholders('portfolio-mobile', 10);
      registerPlaceholders('portfolio-uiux', 10);
      registerPlaceholders('portfolio-brand', 10);


    } catch (e) {
      // noop
    }
  })();

  function openCardByKey(key, opts = {}) {
    if (!key) return;
    // ensure carousel / banner hidden when opening a card page
    try { if (carouselParent) carouselParent.style.display = 'none'; if (carouselEl) carouselEl.style.display = 'none'; } catch (e) { }

    // Only render pages that have been explicitly registered via registerCardPage(key, html).
    // Automatic generation has been removed so you can define any HTML per-card.
    const html = getCardPage(key);
    if (!html) {
      // Helpful fallback UI so it's obvious when a key isn't registered
      pageEl.innerHTML = `<div class="card"><h3>Detail not found</h3><p>No detail page registered for "${escapeHtml(key)}". Register it with <code>registerCardPage('${escapeHtml(key)}', htmlString)</code>.</p></div>`;
      console.warn('No registered card page for', key);
      return;
    }

    // render
    pageEl.innerHTML = '';
    const container = document.createElement('div');
    container.className = 'portfolio-item-page';
    container.innerHTML = html;
    pageEl.appendChild(container);

    // wire back button (same behavior as before)
    const backBtn = document.getElementById('backToPrev');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        const state = lastViewState || { page: (opts && opts.sourcePage) || 'home', scrollY: 0 };
        // restore nav
        if (state.activeMain || state.activeSub) {
          navMainBtns.forEach(n => n.classList.toggle('active', n.dataset.page === state.activeMain));
          navSubitems.forEach(s => s.classList.toggle('active', s.dataset.page === state.activeSub));
          if (state.navExpanded) navGroup && navGroup.classList.add('expanded'); else navGroup && navGroup.classList.remove('expanded');
        } else {
          const goto = state.page;
          navMainBtns.forEach(n => n.classList.toggle('active', n.dataset.page === goto));
          navSubitems.forEach(s => s.classList.toggle('active', s.dataset.page === goto));
          if (navSubitems.some(s => s.dataset.page === goto)) navGroup && navGroup.classList.add('expanded'); else navGroup && navGroup.classList.remove('expanded');
        }
        buildPage(state.page);
        currentPage = state.page;
        previousPage = null;
        window.scrollTo(0, state.scrollY || 0);
        lastViewState = null;
        if (window.matchMedia && window.matchMedia('(max-width:768px)').matches) { sidebar && sidebar.classList.remove('open'); overlay && overlay.classList.remove('visible'); }
      });
    }

    // persist hash
    try { location.hash = '#item=' + encodeURIComponent(key); } catch (e) { }
    if (window.feather) feather.replace();
    currentPage = 'portfolio-item';
    window.scrollTo(0, 0);
  }

  // --- Build carousel slides
  function buildCarousel(banners) {
    carouselEl.innerHTML = '';


    banners.forEach(b => {
      const s = document.createElement('div');
      s.className = 'slide';
      s.style.backgroundImage = `url('${b.image}')`;
      s.innerHTML = `<div class="slide-content">
      
      <divs class="h-textContent">
        <h1 class="h-title">${escapeHtml(b.title)}</h1>
         <p class="h-desc">${escapeHtml(b.desc || '')}</p>
        <div class="h-meta">${escapeHtml(b.meta || '')}</div>
        </div>

         <div class="polygonMain">
          <div class="polygon">
         <h1 class="h-polygonText">${escapeHtml(b.inlineIconText || '')}</h1>
        <img src="${escapeHtml(b.inlineIcon)}" alt="Item" class="h-polygon">
         </div>
        <div class="count-view">
         <p class="h-count">${escapeHtml(b.count || '')}</p>
        <img src="${escapeHtml(b.inlineImage)}" alt="Item" class="h-people">
         </div>
         </div>
      </div>`;
      carouselEl.appendChild(s);
    });

    slideCount = banners.length;
    currentSlide = 0;
    gotoSlide(0);
    resetAutoSlide();
  }

  function gotoSlide(i) {
    if (slideCount === 0) return;
    currentSlide = ((i % slideCount) + slideCount) % slideCount;
    const x = -currentSlide * 100;
    carouselEl.style.transform = `translateX(${x}%)`;
  }
  function nextSlide() { gotoSlide(currentSlide + 1); }
  function prevSlide() { gotoSlide(currentSlide - 1); }
  carouselNext.addEventListener('click', () => { nextSlide(); resetAutoSlide(); });
  carouselPrev.addEventListener('click', () => { prevSlide(); resetAutoSlide(); });

  function resetAutoSlide() {
    if (slideInterval) clearInterval(slideInterval);
    slideInterval = setInterval(() => nextSlide(), AUTO_MS);
  }

  // --- Build page grid / profile
  function buildPage(pageKey) {

    const data = pageData[pageKey];
    pageEl.innerHTML = '';
    // persist current page in the URL hash so refresh remains on this page
    try { location.hash = '#page=' + encodeURIComponent(pageKey); } catch (e) { }
    if (!data) {
      pageEl.innerHTML = `<h3>Not found</h3><p>No content defined for "${escapeHtml(pageKey)}"</p>`;
      return;
    }
    // load page-specific styles when available
    if (pageKey === 'stack') {
      // load stack-specific styles and the on-scroll animation CSS so stack page animations work
      ensurePageCss('../styles/stack.css', 'stack-styles-link');
      ensurePageCss('../styles/onScroll.css', 'scroll-anim-styles-link');
    }
    if (pageKey === 'contact') ensurePageCss('../styles/contact.css', 'contact-styles-link');


    // carousel: only build/show on home or profile. On other pages remove/hide it completely.
    if (pageKey === 'home') {
      // ensure container visible
      if (carouselEl) carouselEl.style.display = '';
      if (carouselParent) {
        // restore previously stored inline styles (if any)
        if (_carouselParentInline) {
          carouselParent.style.display = _carouselParentInline.display;
          carouselParent.style.margin = _carouselParentInline.margin;
          carouselParent.style.padding = _carouselParentInline.padding;
          carouselParent.style.height = _carouselParentInline.height;
          carouselParent.style.minHeight = _carouselParentInline.minHeight;
          carouselParent.style.overflow = _carouselParentInline.overflow;
        } else {
          carouselParent.style.display = '';
        }
      }
      // build carousel with available banners
      buildCarousel(data.banners || []);
      // show controls when carousel visible
      if (carouselPrev) carouselPrev.style.display = 'block';
      if (carouselNext) carouselNext.style.display = 'block';
    } else {
      // stop auto-advance and clear slides
      if (typeof slideInterval !== 'undefined' && slideInterval) {
        clearInterval(slideInterval);
        slideInterval = null;
      }
      if (carouselEl) {
        carouselEl.innerHTML = '';
        carouselEl.style.display = 'none';
      }
      // hide parent wrapper to remove empty spacing (if present) and collapse margins/padding
      if (carouselParent) {
        carouselParent.style.display = 'none';
        carouselParent.style.margin = '0';
        carouselParent.style.padding = '0';
        carouselParent.style.height = '0';
        carouselParent.style.minHeight = '0';
        carouselParent.style.overflow = 'hidden';
      }
      if (carouselPrev) carouselPrev.style.display = 'none';
      if (carouselNext) carouselNext.style.display = 'none';
      slideCount = 0;
      currentSlide = 0;
    }


    if (pageKey === 'profile') {
      pageEl.innerHTML = `
 <div class='prof-bkg' style="background-image: url('${pageData.profile.banners[0].image}');"></div>
 `;
    };


    // special: profile page (about + contact)
    if (pageKey === 'profile') {
      const header = document.createElement('div');
      header.innerHTML = `<h3>${escapeHtml(data.title || 'Profile')}</h3>`;
      pageEl.appendChild(header);

      const hero = document.createElement('div');
      hero.className = 'card';
      hero.style.padding = '20px';
      hero.innerHTML = `
      <div style="display:flex;gap:20px;align-items:flex-start;">
        <div style="width:140px;height:140px;flex-shrink:0;border-radius:10px;background-image:url('${data.heroImage || ''}');background-size:cover;background-position:center"></div>
        <div style="flex:1;max-width:100%;">
          <h4 style="margin:0 0 8px 0">Tekagon</h4>
          <p style="margin:0;color:${getCssVar('--muted')};line-height:1.6;font-size:0.95rem;">${escapeHtml(data.about || '')}</p>
        </div>
      </div>`;
      pageEl.appendChild(hero);

      const contact = document.createElement('div');
      contact.className = 'card';
      contact.style.padding = '20px';
      contact.style.marginTop = '20px';
      contact.innerHTML = `<h4>Contact</h4>
        <p>Email: <a href="mailto:${escapeHtml(data.contact.email)}" style="color:inherit;text-decoration:none">${escapeHtml(data.contact.email)}</a></p>
        <p>Phone: ${escapeHtml(data.contact.phone)}</p>
        <p>Address: ${escapeHtml(data.contact.address)}</p>
        <div style="display:flex;gap:16px;margin-top:16px;align-items:center;">
          ${Object.entries(data.contact.socials).map(([key, social]) => `
            <a href="${social.url}" target="_blank" rel="noreferrer" class="social-icon-link" title="${key}">
              <i class="${social.icon}"></i>
            </a>
          `).join('')}
        </div>`;
      pageEl.appendChild(contact);
      return;
    }


    // Initialize chat user with registration
    function initializeChat() {
      // Check if user is registered
      currentChatUser = localStorage.getItem('chatUserId');

      if (!currentChatUser) {
        showUserRegistration();
        return;
      }

      loadUserMessages();
    }

    // Show user registration modal
    function showUserRegistration() {
      const modalHTML = `
    <div class="user-reg-modal-overlay" id="userRegModal">
        <div class="user-reg-modal">
            <div class="modal-header">
                <h2><i class="fas fa-user-plus"></i> Welcome to Tekagon Support</h2>
                <p>Please register to start chatting with our team</p>
            </div>
            
            <form id="userRegForm" class="modal-body">
                <div class="form-group">
                    <label for="regFullName"><i class="fas fa-user"></i> Full Name *</label>
                    <input type="text" id="regFullName" placeholder="John Doe" required>
                </div>
                
                <div class="form-group">
                    <label for="regPhone"><i class="fas fa-phone"></i> Phone Number *</label>
                    <input type="tel" id="regPhone" placeholder="+234 800 000 0000" required>
                </div>
                
                <div class="form-group">
                    <label for="regEmail"><i class="fas fa-envelope"></i> Email Address</label>
                    <input type="email" id="regEmail" placeholder="john@company.com">
                </div>
                
                <div class="form-group">
                    <label for="regCompany"><i class="fas fa-building"></i> Company Name</label>
                    <input type="text" id="regCompany" placeholder="Your Company Inc">
                </div>
                
                <div class="form-actions">
                    <button type="submit" class="btn-primary">
                        <i class="fas fa-check"></i> Start Chatting
                    </button>
                </div>
            </form>
        </div>
    </div>
    `;

      // Remove existing modal
      const existingModal = document.getElementById('userRegModal');
      if (existingModal) existingModal.remove();

      // Add new modal
      document.body.insertAdjacentHTML('beforeend', modalHTML);

      // Add styles
      addUserRegStyles();

      // Handle form submission
      document.getElementById('userRegForm').addEventListener('submit', function (e) {
        e.preventDefault();

        const name = document.getElementById('regFullName').value.trim();
        const phone = document.getElementById('regPhone').value.trim();
        const email = document.getElementById('regEmail').value.trim();
        const company = document.getElementById('regCompany').value.trim();

        if (!name || !phone) {
          alert('Please enter your name and phone number');
          return;
        }

        // Create user ID from name and phone
        const userId = 'USER_' + name.replace(/\s+/g, '_').toUpperCase() + '_' +
          phone.replace(/\D/g, '').slice(-8) + '_' +
          Date.now().toString().slice(-6);

        // Save user info
        localStorage.setItem('chatUserId', userId);
        localStorage.setItem('userName', name);
        localStorage.setItem('userPhone', phone);
        localStorage.setItem('userEmail', email);
        localStorage.setItem('userCompany', company);

        // Store in users list for admin
        const users = JSON.parse(localStorage.getItem('tekagon_chat_users') || '{}');
        users[userId] = {
          id: userId,
          name: name,
          phone: phone,
          email: email,
          company: company,
          registeredAt: new Date().toISOString(),
          lastActive: new Date().toISOString()
        };
        localStorage.setItem('tekagon_chat_users', JSON.stringify(users));

        // Close modal
        document.getElementById('userRegModal').remove();

        // Initialize chat
        currentChatUser = userId;
        loadUserMessages();

        // Reload chat interface
        if (currentPage === 'chat') {
          buildPage('chat');
        }
      });
    }

    // Add styles for registration modal
    function addUserRegStyles() {
      if (document.getElementById('userRegStyles')) return;

      const style = document.createElement('style');
      style.id = 'userRegStyles';
      style.textContent = `
        .user-reg-modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.9);
            backdrop-filter: blur(5px);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10001;
            padding: 20px;
        }
        
        .user-reg-modal {
            background: #1e293b;
            border-radius: 16px;
            max-width: 500px;
            width: 100%;
            max-height: 90vh;
            overflow: hidden;
            border: 1px solid rgba(255, 255, 255, 0.1);
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
            animation: slideUp 0.3s ease-out;
        }
        
        .user-reg-modal .modal-header {
            padding: 30px;
            background: linear-gradient(135deg, rgba(124, 92, 255, 0.2), rgba(18, 27, 45, 0.4));
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
            text-align: center;
        }
        
        .user-reg-modal .modal-header h2 {
            margin: 0 0 10px 0;
            background: linear-gradient(to right, #93fff6, #6f65ff);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        
        .user-reg-modal .modal-header p {
            color: #94a3b8;
            margin: 0;
        }
        
        .user-reg-modal .modal-body {
            padding: 30px;
        }
        
        .user-reg-modal .form-group {
            margin-bottom: 20px;
        }
        
        .user-reg-modal label {
            display: block;
            margin-bottom: 8px;
            color: #e2e8f0;
            font-weight: 500;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .user-reg-modal input {
            width: 100%;
            padding: 12px 16px;
            background: rgba(255, 255, 255, 0.03);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 8px;
            color: #e2e8f0;
            font-size: 0.95rem;
            transition: all 0.2s;
        }
        
        .user-reg-modal input:focus {
            outline: none;
            border-color: #6f65ff;
            background: rgba(255, 255, 255, 0.05);
        }
        
        .user-reg-modal .form-actions {
            margin-top: 30px;
        }
        
        .user-reg-modal .btn-primary {
            width: 100%;
            padding: 14px;
            background: linear-gradient(135deg, #6f65ff, #93fff6);
            border: none;
            border-radius: 8px;
            color: #0f172a;
            font-weight: 600;
            font-size: 1rem;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            transition: all 0.3s;
        }
        
        .user-reg-modal .btn-primary:hover {
            opacity: 0.9;
            transform: translateY(-2px);
        }
    `;

      document.head.appendChild(style);
    }

    // Load user messages with ticket separation
    function loadUserMessages() {
      try {
        const allConversations = JSON.parse(localStorage.getItem(CHAT_STORAGE_KEY) || '{}');
        chatMessages = allConversations[currentChatUser] || [];

        // Load ticket chats
        const ticketChats = JSON.parse(localStorage.getItem(TICKET_CHAT_KEY) || '{}');

        // Add welcome message if no messages
        if (chatMessages.length === 0 && Object.keys(ticketChats).length === 0) {
          chatMessages.push({
            id: 'welcome_' + Date.now(),
            sender: 'bot',
            content: 'Hello! Welcome to Tekagon Support. How can I help you today?',
            timestamp: new Date().toISOString(),
            read: true,
            type: 'general'
          });
          saveChatMessages();
        }

        // Update unread notification
        updateUnreadNotification();

      } catch (e) {
        console.error('Failed to load chat messages:', e);
        chatMessages = [];
      }
    }

    // Update the chat interface to show separated sections
    function buildChatInterface() {
      // Get current ticket ID if any
      const currentTicketId = localStorage.getItem('current_ticket_id');
      const userTickets = window.getUserTickets(currentChatUser);
      const ticketList = Object.values(userTickets);

      // Check for unread messages
      const hasUnread = checkForUnreadMessages();

      pageEl.innerHTML = `
    <!-- Chat Header -->
    <div class="chat-header-section">
        <div class="chat-header-info">
            <h1 class="header-title"> Live Chat Support</h1>
            <p>Chat with Tekagon support about your inquiries and tickets</p>
        </div>
        
        <div class="user-status-badge">
            <div class="status-indicator active"></div>
            <span>Connected</span>
            ${hasUnread ? '<div class="unread-alert-badge"><i class="fas fa-bell"></i> New Messages</div>' : ''}
        </div>
    </div>
    
    <!-- Chat Container with Sidebar -->
    <div class="chat-container-with-sidebar">
        <!-- Sidebar -->
        <div class="chat-sidebar">
            <!-- User Info -->
            <div class="sidebar-user-info">
                <div class="user-avatar-large">
                    <i class="fas fa-user"></i>
                </div>
                <div class="user-details">
                    <h4>${localStorage.getItem('userName') || 'User'}</h4>
                    <p class="user-phone">${localStorage.getItem('userPhone') || 'Not set'}</p>
                    <p class="user-id">ID: ${currentChatUser.substring(0, 12)}...</p>
                </div>
            </div>
            
            <!-- Chat Sections -->
            <div class="chat-sections">
                <!-- General Inquiries -->
                <div class="chat-section ${!currentTicketId ? 'active' : ''}" data-chat-type="general">
                    <div class="section-header">
                        <i class="fas fa-comment-dots"></i>
                        <span>General Inquiries</span>
                        ${checkUnreadGeneral() ? '<span class="section-unread">!</span>' : ''}
                    </div>
                    <p class="section-desc">General questions and support</p>
                </div>
                
                <!-- Ticket Chats -->
                <div class="ticket-chats-section">
                    <div class="section-title">
                        <i class="fas fa-ticket-alt"></i>
                        <span>Ticket Conversations</span>
                    </div>
                    
                    <div class="ticket-chat-list" id="ticketChatList">
                        ${ticketList.length > 0 ? ticketList.map(ticket => `
                            <div class="ticket-chat-item ${currentTicketId === ticket.id ? 'active' : ''}" 
                                 data-ticket-id="${ticket.id}"
                                 onclick="switchToTicketChat('${ticket.id}')">
                                <div class="ticket-chat-info">
                                    <div class="ticket-chat-header">
                                        <span class="ticket-service">${ticket.serviceName}</span>
                                        <span class="ticket-status-badge ${ticket.status}">${ticket.status}</span>
                                    </div>
                                    <p class="ticket-id">#${ticket.id.substring(0, 10)}</p>
                                    ${checkUnreadTicket(ticket.id) ? '<div class="ticket-unread-badge"><i class="fas fa-envelope"></i></div>' : ''}
                                </div>
                            </div>
                        `).join('') :
          '<div class="no-tickets-msg"><p>No tickets yet</p></div>'}
                    </div>
                </div>
            </div>
            
            <!-- New Ticket Button -->
            <button class="btn-new-ticket-chat" onclick="buildPage('service')">
                <i class="fas fa-plus-circle"></i> New Service Request
            </button>
        </div>
        
        <!-- Chat Main Area -->
        <div class="chat-main-area">
            <!-- Chat Header -->
            <div class="chat-main-header" id="chatMainHeader">
                ${currentTicketId ? `
                    <div class="ticket-chat-header-active">
                        <button class="btn-back-to-general" onclick="switchToGeneralChat()">
                            <i class="fas fa-arrow-left"></i> Back
                        </button>
                        <div class="active-ticket-info">
                            <h3>Ticket #${currentTicketId.substring(0, 10)}</h3>
                            <p>${userTickets[currentTicketId]?.serviceName || 'Service Request'}</p>
                        </div>
                    </div>
                ` : `
                   
                `}
            </div>
            
            <!-- Messages Container -->
            <div class="messages-container-wrapper" id="messagesContainer">
                <!-- Messages will be loaded here -->
            </div>
            
            <!-- Input Area -->
            <div class="chat-input-area">
                <div class="input-wrapper">
                    <textarea 
                        id="chatInput" 
                        placeholder="Type your message here..." 
                        rows="2"
                        onkeydown="handleChatInputKeydown(event)"
                    ></textarea>
                    
                    <div class="input-actions">
                        <button id="sendMessage" class="btn-send-message">
                            <i class="fas fa-paper-plane"></i> Send
                        </button>
                    </div>
                </div>
                
                <div class="quick-replies">
                    <button class="quick-reply-btn" onclick="setQuickReply('I need help with my ticket')">
                        Need help with ticket
                    </button>
                    <button class="quick-reply-btn" onclick="setQuickReply('What is the status of my request?')">
                        Check status
                    </button>
                    <button class="quick-reply-btn" onclick="setQuickReply('I have a general question')">
                        General question
                    </button>
                </div>
            </div>
        </div>
    </div>
    
    <!-- Notification Alert (floating) -->
    ${hasUnread ? `
        <div class="floating-notification-alert" id="floatingNotification">
            <div class="alert-content">
                <i class="fas fa-bell"></i>
                <div>
                    <strong>New Messages</strong>
                    <p>You have unread messages</p>
                </div>
                <button onclick="dismissNotification()" class="btn-dismiss">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        </div>
    ` : ''}
    `;

      // Initialize chat
      initializeChatListeners();


      // Fix: Add event delegation for chat sections
      setTimeout(() => {
        // Handle General Inquiries section click
        const generalSection = document.querySelector('[data-chat-type="general"]');
        if (generalSection) {
          generalSection.addEventListener('click', () => {
            switchToGeneralChat();
          });
        }

        // Fix: Handle ticket chat item clicks with proper event delegation
        document.addEventListener('click', function (e) {
          const ticketChatItem = e.target.closest('.ticket-chat-item');
          if (ticketChatItem) {
            const ticketId = ticketChatItem.dataset.ticketId;
            if (ticketId) {
              switchToTicketChat(ticketId);
            }
          }
        });

        // Fix: Handle back button
        const backButton = document.querySelector('.btn-back-to-general');
        if (backButton) {
          backButton.addEventListener('click', switchToGeneralChat);
        }

        // Fix: Handle new ticket button
        const newTicketBtn = document.querySelector('.btn-new-ticket-chat');
        if (newTicketBtn) {
          newTicketBtn.addEventListener('click', () => {
            buildPage('service');
          });
        }
      }, 100);


      // Load appropriate messages
      if (currentTicketId) {
        loadTicketChatMessages(currentTicketId);
      } else {
        loadGeneralChatMessages();
      }

      // Add chat styles
      addEnhancedChatStyles();

      // Show notification if there are unread messages
      setTimeout(() => {
        const hasUnread = checkForUnreadMessages();
        if (hasUnread) {
          showFloatingNotification(true);
        }
      }, 500);

    }



    // Load general chat messages
    function loadGeneralChatMessages() {
      const messagesContainer = document.getElementById('messagesContainer');
      if (!messagesContainer) return;

      const generalMessages = chatMessages.filter(msg => !msg.ticketId || msg.type === 'general');

      messagesContainer.innerHTML = generalMessages.map(msg => renderChatMessage(msg)).join('');

      // Mark messages as read when viewed
      markGeneralMessagesAsRead();

      // Scroll to bottom
      setTimeout(() => {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      }, 100);
    }

    function markGeneralMessagesAsRead() {
      const conversations = JSON.parse(localStorage.getItem(CHAT_STORAGE_KEY) || '{}');
      if (conversations[currentChatUser]) {
        let changed = false;
        conversations[currentChatUser].forEach(msg => {
          if (msg.sender !== 'user' && !msg.read) {
            msg.read = true;
            changed = true;
          }
        });

        if (changed) {
          localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(conversations));
          updateUnreadNotification();
        }
      }
    }

    function loadTicketChatMessages(ticketId) {
      const messagesContainer = document.getElementById('messagesContainer');
      if (!messagesContainer) return;

      // Get ONLY from ticket chats storage
      const ticketChats = JSON.parse(localStorage.getItem(TICKET_CHAT_KEY) || '{}');
      const ticketMessages = ticketChats[ticketId] || [];

      // DO NOT mix with general messages - keep them completely separate
      messagesContainer.innerHTML = ticketMessages.map(msg => renderChatMessage(msg)).join('');

      // Mark as read
      markTicketMessagesAsRead(ticketId);

      // Scroll to bottom
      setTimeout(() => {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      }, 100);
    }

    function renderChatMessage(msg) {
      const time = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const date = new Date(msg.timestamp).toLocaleDateString();

      // Determine if message is unread (from support/admin and not read)
      const isUnread = msg.sender !== 'user' && !msg.read;

      if (msg.sender === 'user') {
        return `
    <div class="message-bubble user-message">
        <div class="message-header">
            <span class="message-sender">You</span>
            <span class="message-time">${date} ${time}</span>
        </div>
        <div class="message-content">${escapeHtml(msg.content)}</div>
        ${msg.ticketId ? `
            <div class="message-context">
                <i class="fas fa-ticket-alt"></i>
                Ticket #${msg.ticketId.substring(0, 10)}
            </div>
        ` : ''}
    </div>
    `;
      } else {
        const senderName = msg.sender === 'bot' ? 'Tekagon Support' : 'Admin';
        const isAdmin = msg.sender === 'admin';

        return `
    <div class="message-bubble support-message ${isAdmin ? 'admin-message' : ''} ${isUnread ? 'unread-message' : ''}">
        ${isUnread ? '<div class="unread-indicator"><i class="fas fa-circle"></i> New</div>' : ''}
        <div class="message-header">
            <span class="message-sender">
                <i class="fas ${isAdmin ? 'fa-user-shield' : 'fa-headset'}"></i>
                ${senderName}
            </span>
            <span class="message-time">${date} ${time}</span>
        </div>
        <div class="message-content">${escapeHtml(msg.content)}</div>
        ${msg.ticketId ? `
            <div class="message-context ticket-context">
                <i class="fas fa-ticket-alt"></i>
                Regarding Ticket #${msg.ticketId.substring(0, 10)}
            </div>
        ` : ''}
    </div>
    `;
      }
    }

    // Switch to ticket chat
    function switchToTicketChat(ticketId) {
      currentChatTicket = ticketId;
      localStorage.setItem('current_ticket_id', ticketId);
      buildPage('chat');
    }

    // Switch to general chat
    function switchToGeneralChat() {
      currentChatTicket = null;
      localStorage.removeItem('current_ticket_id');
      buildPage('chat');
    }

    // Check for unread messages
    function checkForUnreadMessages() {
      // Check general messages
      const hasUnreadGeneral = chatMessages.some(msg =>
        msg.sender !== 'user' && !msg.read
      );

      // Check ticket messages
      const ticketChats = JSON.parse(localStorage.getItem(TICKET_CHAT_KEY) || '{}');
      const hasUnreadTicket = Object.values(ticketChats).some(messages =>
        messages.some(msg => msg.sender !== 'user' && !msg.read)
      );

      return hasUnreadGeneral || hasUnreadTicket;
    }

    // Check unread general messages
    function checkUnreadGeneral() {
      return chatMessages.some(msg =>
        (!msg.ticketId || msg.type === 'general') &&
        msg.sender !== 'user' &&
        !msg.read
      );
    }

    // Check unread ticket messages
    function checkUnreadTicket(ticketId) {
      const ticketChats = JSON.parse(localStorage.getItem(TICKET_CHAT_KEY) || '{}');
      const ticketMessages = ticketChats[ticketId] || [];

      return ticketMessages.some(msg =>
        msg.sender !== 'user' && !msg.read
      );
    }

    // Update unread notification
    function updateUnreadNotification() {
      const hasUnread = checkForUnreadMessages();

      // Update badge in navigation
      const chatNav = document.querySelector('[data-page="chat"]');
      if (chatNav) {
        let badge = chatNav.querySelector('.nav-badge');
        if (hasUnread && !badge) {
          badge = document.createElement('span');
          badge.className = 'nav-badge';
          badge.textContent = '!';
          chatNav.appendChild(badge);
        } else if (!hasUnread && badge) {
          badge.remove();
        }
      }

      // Update page title
      if (hasUnread) {
        document.title = '(!) Chat - Tekagon';
      } else if (document.title.startsWith('(!)')) {
        document.title = 'Chat - Tekagon';
      }
    }

    // Dismiss notification
    function dismissNotification() {
      const notification = document.getElementById('floatingNotification');
      if (notification) {
        notification.remove();
      }

      // Mark all as read
      markAllMessagesAsRead();
      updateUnreadNotification();
    }

    // Mark all messages as read
    function markAllMessagesAsRead() {
      // Mark general messages
      chatMessages.forEach(msg => {
        if (msg.sender !== 'user') {
          msg.read = true;
        }
      });

      // Mark ticket messages
      const ticketChats = JSON.parse(localStorage.getItem(TICKET_CHAT_KEY) || '{}');
      Object.keys(ticketChats).forEach(ticketId => {
        ticketChats[ticketId].forEach(msg => {
          if (msg.sender !== 'user') {
            msg.read = true;
          }
        });
      });

      localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify({ [currentChatUser]: chatMessages }));
      localStorage.setItem(TICKET_CHAT_KEY, JSON.stringify(ticketChats));
    }

    // Mark ticket messages as read
    function markTicketMessagesAsRead(ticketId) {
      const ticketChats = JSON.parse(localStorage.getItem(TICKET_CHAT_KEY) || '{}');

      if (ticketChats[ticketId]) {
        ticketChats[ticketId].forEach(msg => {
          if (msg.sender !== 'user') {
            msg.read = true;
          }
        });

        localStorage.setItem(TICKET_CHAT_KEY, JSON.stringify(ticketChats));
        updateUnreadNotification();
      }
    }

    // Enhanced chat styles
    // function addEnhancedChatStyles() {
    //   if (document.getElementById('enhancedChatStyles')) return;

    //   const style = document.createElement('style');
    //   style.id = 'enhancedChatStyles';
    //   ;

    //   document.head.appendChild(style);
    // }

    // Handle chat input keydown
    function handleChatInputKeydown(event) {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendChatMessage();
      }
    }

    // Set quick reply
    function setQuickReply(message) {
      const chatInput = document.getElementById('chatInput');
      if (chatInput) {
        chatInput.value = message;
        chatInput.focus();
      }
    }

    function initializeChatListeners() {
      // Send message button
      const sendBtn = document.getElementById('sendMessage');
      const chatInput = document.getElementById('chatInput');

      if (sendBtn && chatInput) {
        // Remove any existing listeners to prevent duplicates
        sendBtn.replaceWith(sendBtn.cloneNode(true));
        chatInput.replaceWith(chatInput.cloneNode(true));

        // Get fresh references
        const freshSendBtn = document.getElementById('sendMessage');
        const freshChatInput = document.getElementById('chatInput');

        freshSendBtn.addEventListener('click', window.sendChatMessage);

        // Add keydown handler
        freshChatInput.addEventListener('keydown', function (e) {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            window.sendChatMessage();
          }
        });
      }

      // Auto-focus input
      setTimeout(() => {
        if (chatInput) {
          chatInput.focus();
        }
      }, 500);
    }

    // Send chat message (updated for ticket separation)
    function sendChatMessage() {
      const chatInput = document.getElementById('chatInput');
      if (!chatInput) return;

      const message = chatInput.value.trim();
      if (!message) return;

      const currentTicketId = localStorage.getItem('current_ticket_id');

      // Create message object
      const newMessage = {
        id: 'msg_' + Date.now(),
        sender: 'user',
        content: message,
        timestamp: new Date().toISOString(),
        read: true, // User's own message is always read
        ticketId: currentTicketId || null
      };

      if (currentTicketId) {
        // Save to ticket chats
        saveTicketMessage(currentTicketId, newMessage);
      } else {
        // Save to general chat
        chatMessages.push(newMessage);
        saveChatMessages();
      }

      // Update UI
      const messagesContainer = document.getElementById('messagesContainer');
      if (messagesContainer) {
        messagesContainer.innerHTML += renderChatMessage(newMessage);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      }

      // Clear input
      chatInput.value = '';
      chatInput.focus();

      // Show typing indicator
      showTypingIndicator();

      // Simulate response
      setTimeout(() => {
        simulateSupportResponse(message, currentTicketId);
      }, 1500 + Math.random() * 2000);
    }

    // Save ticket message
    function saveTicketMessage(ticketId, message) {
      try {
        const ticketChats = JSON.parse(localStorage.getItem(TICKET_CHAT_KEY) || '{}');

        if (!ticketChats[ticketId]) {
          ticketChats[ticketId] = [];
        }

        ticketChats[ticketId].push(message);
        localStorage.setItem(TICKET_CHAT_KEY, JSON.stringify(ticketChats));

        // Also add to chat history for reference
        chatMessages.push(message);
        saveChatMessages();

        // Update admin notification
        updateAdminNotification(ticketId);

      } catch (e) {
        console.error('Failed to save ticket message:', e);
      }
    }


    // Simulate support response
    function simulateSupportResponse(userMessage, ticketId = null) {
      hideTypingIndicator();

      let response;

      if (ticketId) {
        const responses = [
          `Thank you for your message regarding ticket #${ticketId.substring(0, 10)}. We're looking into it.`,
          `We've received your update for ticket #${ticketId.substring(0, 10)}. Our team will review it shortly.`,
          `Regarding your ticket #${ticketId.substring(0, 10)}: Can you provide more details about the issue?`,
          `We're currently working on ticket #${ticketId.substring(0, 10)}. We'll update you shortly.`
        ];
        response = responses[Math.floor(Math.random() * responses.length)];
      } else {
        const responses = [
          "Thanks for your message! Our team will get back to you shortly.",
          "I understand. We're reviewing your request and will respond soon.",
          "Great question! Our typical timeline for that is 4-6 weeks.",
          "Can you provide more details about what you're looking for?"
        ];
        response = responses[Math.floor(Math.random() * responses.length)];
      }

      const supportMessage = {
        id: 'support_' + Date.now(),
        sender: 'bot',
        content: response,
        timestamp: new Date().toISOString(),
        read: false,
        ticketId: ticketId
      };

      if (ticketId) {
        saveTicketMessage(ticketId, supportMessage);
      } else {
        chatMessages.push(supportMessage);
        saveChatMessages();
      }

      // Update UI
      const messagesContainer = document.getElementById('messagesContainer');
      if (messagesContainer) {
        messagesContainer.innerHTML += renderChatMessage(supportMessage);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      }

      // Update notification
      updateUnreadNotification();
    }

    // special: chat page
    if (pageKey === 'chat') {
      // Remove carousel on chat page
      if (carouselEl) carouselEl.style.display = 'none';
      if (carouselParent) {
        carouselParent.style.display = 'none';
        carouselParent.style.margin = '0';
        carouselParent.style.padding = '0';
        carouselParent.style.height = '0';
        carouselParent.style.minHeight = '0';
        carouselParent.style.overflow = 'hidden';
      }

      // Initialize chat user
      function initializeChat() {
        // Check if user is registered
        currentChatUser = localStorage.getItem('chatUserId');

        if (!currentChatUser) {
          showUserRegistration();
          return;
        }

        loadUserMessages();
      }



      // Initialize chat
      initializeChat();

      // If user is registered, build interface
      if (currentChatUser) {
        buildChatInterface();
      }

      return;
    }

    // Load general chat messages
    function loadGeneralChatMessages() {
      const messagesContainer = document.getElementById('messagesContainer');
      if (!messagesContainer) return;

      const generalMessages = chatMessages.filter(msg => !msg.ticketId || msg.type === 'general');

      messagesContainer.innerHTML = generalMessages.map(msg => renderChatMessage(msg)).join('');

      // Scroll to bottom
      setTimeout(() => {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      }, 100);
    }

    // Load ticket chat messages
    function loadTicketChatMessages(ticketId) {
      const messagesContainer = document.getElementById('messagesContainer');
      if (!messagesContainer) return;

      // Get ticket chats
      const ticketChats = JSON.parse(localStorage.getItem(TICKET_CHAT_KEY) || '{}');
      const ticketMessages = ticketChats[ticketId] || [];

      // Also include general messages that reference this ticket
      const ticketReferenceMessages = chatMessages.filter(msg =>
        msg.ticketId === ticketId || (msg.content && msg.content.includes(ticketId))
      );

      const allTicketMessages = [...ticketMessages, ...ticketReferenceMessages]
        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

      messagesContainer.innerHTML = allTicketMessages.map(msg => renderChatMessage(msg)).join('');

      // Mark as read
      markTicketMessagesAsRead(ticketId);

      // Scroll to bottom
      setTimeout(() => {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      }, 100);
    }

    // Add this function to handle auto-dismissing notifications
    function showAutoDismissNotification(message, type = 'info', duration = 5000) {
      // Remove any existing notification
      const existing = document.getElementById('autoDismissNotification');
      if (existing) existing.remove();

      const notificationHTML = `
    <div class="auto-dismiss-notification ${type}" id="autoDismissNotification">
      <div class="notification-content">
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        <span>${message}</span>
      </div>
      <div class="notification-progress"></div>
    </div>
  `;

      document.body.insertAdjacentHTML('beforeend', notificationHTML);

      // Auto remove after duration
      setTimeout(() => {
        const notification = document.getElementById('autoDismissNotification');
        if (notification) {
          notification.style.opacity = '0';
          notification.style.transform = 'translateY(-20px)';
          setTimeout(() => notification.remove(), 300);
        }
      }, duration);
    }

    // Update the floating notification to auto-dismiss
    function showFloatingNotification(hasUnread) {
      if (!hasUnread) return;

      // Remove any existing notification
      const existing = document.getElementById('floatingNotification');
      if (existing) existing.remove();

      const notificationHTML = `
    <div class="floating-notification-alert" id="floatingNotification">
      <div class="alert-content">
        <i class="fas fa-bell"></i>
        <div>
          <strong>New Messages</strong>
          <p>You have unread messages</p>
        </div>
        <button id="dismissNotificationBtn" class="btn-dismiss">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="notification-progress-bar"></div>
    </div>
  `;

      document.body.insertAdjacentHTML('beforeend', notificationHTML);

      // Auto dismiss after 10 seconds
      setTimeout(() => {
        dismissNotification();
      }, 10000);

      // Add dismiss button event listener
      const dismissBtn = document.getElementById('dismissNotificationBtn');
      if (dismissBtn) {
        dismissBtn.addEventListener('click', dismissNotification);
      }
    }

    // Render chat message with enhanced styling
    function renderChatMessage(msg) {
      const time = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const date = new Date(msg.timestamp).toLocaleDateString();

      if (msg.sender === 'user') {
        return `
        <div class="message-bubble user-message ${msg.unread ? 'unread' : ''}">
            <div class="message-header">
               
                <span class="message-time">${time}</span>
            </div>
            <div class="message-content">${escapeHtml(msg.content)}</div>
            ${msg.ticketId ? `
                <div class="message-context">
                    <i class="fas fa-ticket-alt"></i>
                    Ticket #${msg.ticketId.substring(0, 10)}
                </div>
            ` : ''}
        </div>
        `;
      } else {
        const senderName = msg.sender === 'bot' ? 'Tekagon Support' : 'Admin';
        const isAdmin = msg.sender === 'admin';

        return `
        <div class="message-bubble support-message ${isAdmin ? 'admin-message' : ''}">
            <div class="message-header">
                <span class="message-sender">
                    <i class="fas ${isAdmin ? 'fa-user-shield' : 'fa-headset'}"></i>
                    ${senderName}
                </span>
                <span class="message-time">${time}</span>
            </div>
            <div class="message-content">${escapeHtml(msg.content)}</div>
            ${msg.ticketId ? `
                <div class="message-context ticket-context">
                    <i class="fas fa-ticket-alt"></i>
                    Regarding Ticket #${msg.ticketId.substring(0, 10)}
                </div>
            ` : ''}
        </div>
        `;
      }
    }

    // Switch to ticket chat
    function switchToTicketChat(ticketId) {
      currentChatTicket = ticketId;
      localStorage.setItem('current_ticket_id', ticketId);
      buildPage('chat');
    }

    // Switch to general chat
    function switchToGeneralChat() {
      currentChatTicket = null;
      localStorage.removeItem('current_ticket_id');
      buildPage('chat');
    }

    // Enhanced function to check for unread messages
    function checkForUnreadMessages() {
      let hasUnread = false;

      // Check general messages
      const conversations = JSON.parse(localStorage.getItem(CHAT_STORAGE_KEY) || '{}');
      const userMessages = conversations[currentChatUser] || [];
      2
      hasUnread = userMessages.some(msg =>
        msg.sender !== 'user' && !msg.read
      );

      // Check ticket messages
      if (!hasUnread) {
        const ticketChats = JSON.parse(localStorage.getItem(TICKET_CHAT_KEY) || '{}');
        Object.values(ticketChats).forEach(messages => {
          if (messages.some(msg => msg.sender !== 'user' && !msg.read)) {
            hasUnread = true;
          }
        });
      }

      return hasUnread;
    }

    // Enhanced function to mark ALL messages as read
    function markAllMessagesAsRead() {
      console.log('Marking ALL messages as read...');

      // Mark general messages
      const conversations = JSON.parse(localStorage.getItem(CHAT_STORAGE_KEY) || '{}');
      if (conversations[currentChatUser]) {
        conversations[currentChatUser].forEach(msg => {
          if (msg.sender !== 'user') {
            msg.read = true;
          }
        });
        localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(conversations));
      }

      // Mark ticket messages
      const ticketChats = JSON.parse(localStorage.getItem(TICKET_CHAT_KEY) || '{}');
      Object.keys(ticketChats).forEach(ticketId => {
        ticketChats[ticketId].forEach(msg => {
          if (msg.sender !== 'user') {
            msg.read = true;
          }
        });
      });
      localStorage.setItem(TICKET_CHAT_KEY, JSON.stringify(ticketChats));

      // Update UI
      updateUnreadNotification();
    }

    // Enhanced function to mark ticket messages as read
    function markTicketMessagesAsRead(ticketId) {
      console.log('Marking ticket messages as read:', ticketId);

      const ticketChats = JSON.parse(localStorage.getItem(TICKET_CHAT_KEY) || '{}');

      if (ticketChats[ticketId]) {
        let changed = false;
        ticketChats[ticketId].forEach(msg => {
          if (msg.sender !== 'user' && !msg.read) {
            msg.read = true;
            changed = true;
          }
        });

        if (changed) {
          localStorage.setItem(TICKET_CHAT_KEY, JSON.stringify(ticketChats));
          updateUnreadNotification();
        }
      }
    }

    // Enhanced updateUnreadNotification function
    function updateUnreadNotification() {
      const hasUnread = checkForUnreadMessages();
      console.log('Updating unread notification. Has unread?', hasUnread);

      // Update badge in navigation
      const chatNav = document.querySelector('[data-page="chat"]');
      if (chatNav) {
        let badge = chatNav.querySelector('.nav-badge');

        if (hasUnread && !badge) {
          badge = document.createElement('span');
          badge.className = 'nav-badge';
          badge.textContent = '!';
          badge.id = 'chatNavBadge';
          chatNav.appendChild(badge);
        } else if (!hasUnread && badge) {
          badge.remove();
        }
      }

      // Update page title
      if (hasUnread) {
        document.title = '(!) Chat - Tekagon';

        // Show floating notification if not already shown
        const existingNotification = document.getElementById('floatingNotification');
        if (!existingNotification) {
          setTimeout(() => {
            showFloatingNotification(true);
          }, 1000);
        }
      } else {
        document.title = document.title.replace('(!) ', '');

        // Remove floating notification
        const notification = document.getElementById('floatingNotification');
        if (notification) {
          notification.remove();
        }
      }

      // Update unread indicator in chat header
      updateChatHeaderUnreadIndicator(hasUnread);
    }

    // New function to update chat header unread indicator
    function updateChatHeaderUnreadIndicator(hasUnread) {
      const userStatusBadge = document.querySelector('.user-status-badge');
      if (userStatusBadge) {
        let unreadBadge = userStatusBadge.querySelector('.unread-alert-badge');

        if (hasUnread && !unreadBadge) {
          unreadBadge = document.createElement('div');
          unreadBadge.className = 'unread-alert-badge';
          unreadBadge.innerHTML = '<i class="fas fa-bell"></i> New Messages';
          userStatusBadge.appendChild(unreadBadge);
        } else if (!hasUnread && unreadBadge) {
          unreadBadge.remove();
        }
      }
    }
    // Send chat message (updated for ticket separation)
    function sendChatMessage() {
      const chatInput = document.getElementById('chatInput');
      if (!chatInput) return;

      const message = chatInput.value.trim();
      if (!message) return;

      const currentTicketId = localStorage.getItem('current_ticket_id');

      // Create message object
      const newMessage = {
        id: 'msg_' + Date.now(),
        sender: 'user',
        content: message,
        timestamp: new Date().toISOString(),
        read: true, // User's own message is always read
        ticketId: currentTicketId || null
      };

      if (currentTicketId) {
        // Save to ticket chats
        saveTicketMessage(currentTicketId, newMessage);
      } else {
        // Save to general chat
        chatMessages.push(newMessage);
        saveChatMessages();
      }

      // Update UI
      const messagesContainer = document.getElementById('messagesContainer');
      if (messagesContainer) {
        messagesContainer.innerHTML += renderChatMessage(newMessage);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      }

      // Clear input
      chatInput.value = '';
      chatInput.focus();

      // Show typing indicator
      showTypingIndicator();

      // Simulate response
      setTimeout(() => {
        simulateSupportResponse(message, currentTicketId);
      }, 1500 + Math.random() * 2000);
    }

    // Save ticket message
    function saveTicketMessage(ticketId, message) {
      try {
        const ticketChats = JSON.parse(localStorage.getItem(TICKET_CHAT_KEY) || '{}');

        if (!ticketChats[ticketId]) {
          ticketChats[ticketId] = [];
        }

        ticketChats[ticketId].push(message);
        localStorage.setItem(TICKET_CHAT_KEY, JSON.stringify(ticketChats));

        // Also add to chat history for reference
        chatMessages.push(message);
        saveChatMessages();

        // Update admin notification
        updateAdminNotification(ticketId);

      } catch (e) {
        console.error('Failed to save ticket message:', e);
      }
    }

    // Simulate support response
    function simulateSupportResponse(userMessage, ticketId = null) {
      hideTypingIndicator();

      let response;

      if (ticketId) {
        const responses = [
          `Thank you for your message regarding ticket #${ticketId.substring(0, 10)}. We're looking into it.`,
          `We've received your update for ticket #${ticketId.substring(0, 10)}. Our team will review it shortly.`,
          `Regarding your ticket #${ticketId.substring(0, 10)}: Can you provide more details about the issue?`,
          `We're currently working on ticket #${ticketId.substring(0, 10)}. We'll update you shortly.`
        ];
        response = responses[Math.floor(Math.random() * responses.length)];
      } else {
        const responses = [
          "Thanks for your message! Our team will get back to you shortly.",
          "I understand. We're reviewing your request and will respond soon.",
          "Great question! Our typical timeline for that is 4-6 weeks.",
          "Can you provide more details about what you're looking for?"
        ];
        response = responses[Math.floor(Math.random() * responses.length)];
      }

      const supportMessage = {
        id: 'support_' + Date.now(),
        sender: 'bot',
        content: response,
        timestamp: new Date().toISOString(),
        read: false,
        ticketId: ticketId
      };

      if (ticketId) {
        saveTicketMessage(ticketId, supportMessage);
      } else {
        chatMessages.push(supportMessage);
        saveChatMessages();
      }

      // Update UI
      const messagesContainer = document.getElementById('messagesContainer');
      if (messagesContainer) {
        messagesContainer.innerHTML += renderChatMessage(supportMessage);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      }

      // Update notification
      updateUnreadNotification();
    }

    // Enhanced chat styles


    // Handle chat input keydown
    function handleChatInputKeydown(event) {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendChatMessage();
      }
    }

    // Set quick reply
    function setQuickReply(message) {
      const chatInput = document.getElementById('chatInput');
      if (chatInput) {
        chatInput.value = message;
        chatInput.focus();
      }
    }

    // Initialize chat listeners
    function initializeChatListeners() {
      // Send message button
      const sendBtn = document.getElementById('sendMessage');
      const chatInput = document.getElementById('chatInput');

      if (sendBtn && chatInput) {
        sendBtn.addEventListener('click', sendChatMessage);
      }

      // Auto-focus input
      setTimeout(() => {
        if (chatInput) {
          chatInput.focus();
        }
      }, 500);
    }

    // Save chat messages
    function saveChatMessages() {
      try {
        const allConversations = JSON.parse(localStorage.getItem(CHAT_STORAGE_KEY) || '{}');
        allConversations[currentChatUser] = chatMessages;
        localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(allConversations));
      } catch (e) {
        console.error('Failed to save chat messages:', e);
      }
    }

    // Show typing indicator
    function showTypingIndicator() {
      const messagesContainer = document.getElementById('messagesContainer');
      if (!messagesContainer) return;

      const typingIndicator = document.createElement('div');
      typingIndicator.className = 'message-bubble support-message typing-indicator';
      typingIndicator.innerHTML = `
        <div class="typing-dots">
            <div class="dot"></div>
            <div class="dot"></div>
            <div class="dot"></div>
        </div>
    `;

      messagesContainer.appendChild(typingIndicator);
      messagesContainer.scrollTop = messagesContainer.scrollHeight;

      // Store reference to remove later
      window.currentTypingIndicator = typingIndicator;
    }

    // Hide typing indicator
    function hideTypingIndicator() {
      if (window.currentTypingIndicator) {
        window.currentTypingIndicator.remove();
        window.currentTypingIndicator = null;
      }
    }

    // In the buildPage function, find the tickets page section and update the HTML:
    if (pageKey === 'tickets') {
      // Remove carousel on tickets page
      if (carouselEl) carouselEl.style.display = 'none';
      if (carouselParent) {
        carouselParent.style.display = 'none';
        carouselParent.style.margin = '0';
        carouselParent.style.padding = '0';
        carouselParent.style.height = '0';
        carouselParent.style.minHeight = '0';
        carouselParent.style.overflow = 'hidden';
      }

      // Get current user ID
      const currentUserId = localStorage.getItem('chatUserId');
      const userTickets = getUserTickets(currentUserId);
      const ticketList = Object.values(userTickets);

      pageEl.innerHTML = `

     <div class="main-header">
            <div class="header-content">
                <div class="header-badge">
                    <i class="fas fa-rocket"></i> SME Digital Consultation
                </div>
                <h1 class="header-title">Book a Service Ticket</h1>
                <p class="header-subtitle">Track all your service requests and their progress</p>
            </div>
        </div>

    <div class="tickets-actions">
      <div class="tickets-stats">
        <div class="stat-card">
          <div class="stat-icon pending">
            <i class="fas fa-clock"></i>
          </div>
          <div class="stat-content">
            <h3>${ticketList.filter(t => t.status === 'pending').length}</h3>
            <p>Pending</p>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon progress">
            <i class="fas fa-spinner"></i>
          </div>
          <div class="stat-content">
            <h3>${ticketList.filter(t => t.status === 'in-progress').length}</h3>
            <p>In Progress</p>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon completed">
            <i class="fas fa-check-circle"></i>
          </div>
          <div class="stat-content">
            <h3>${ticketList.filter(t => t.status === 'completed').length}</h3>
            <p>Completed</p>
          </div>
        </div>
      </div>
      

    <div class="tickets-list">
      ${ticketList.length > 0 ? ticketList.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).map(ticket => `
        <div class="ticket-card ${ticket.status}">
          <div class="ticket-header">
            <div class="ticket-id">
              <span class="ticket-badge">#${ticket.id.substring(0, 10)}</span>
              <span class="status-badge ${ticket.status}">
                <i class="fas fa-${getStatusIcon(ticket.status)}"></i>
                ${ticket.status.charAt(0).toUpperCase() + ticket.status.slice(1)}
              </span>
            </div>
            <div class="ticket-date">
              ${new Date(ticket.createdAt).toLocaleDateString()}
            </div>
          </div>
          
          <div class="ticket-content">
            <h3>${escapeHtml(ticket.serviceName)}</h3>
            <div class="ticket-preview">
              ${Object.entries(ticket.formData).slice(0, 3).map(([key, value]) => `
                <div class="form-field">
                  <strong>${escapeHtml(key)}:</strong>
                  <span>${escapeHtml(String(value).substring(0, 50))}${String(value).length > 50 ? '...' : ''}</span>
                </div>
              `).join('')}
            </div>
          </div>
          
          <div class="ticket-footer">
            <div class="ticket-meta">
              <span class="meta-item">
                <i class="fas fa-user"></i>
                ${escapeHtml(ticket.userName)}
              </span>
              <span class="meta-item">
                <i class="fas fa-comments"></i>
                ${(ticket.messages || []).length} messages
              </span>
              <span class="meta-item whatsapp-ticket" data-ticket-id="${ticket.id}">
                <i class="fab fa-whatsapp"></i>
                WhatsApp Support
              </span>
            </div>
            <div class="ticket-actions">
              <button class="btn-view-ticket" data-ticket-id="${ticket.id}" data-action="view">
                  <i class="fas fa-eye"></i> View Details
              </button>
              <button class="btn-chat-ticket" data-ticket-id="${ticket.id}" data-action="chat">
                  <i class="fas fa-comment"></i> Chat
              </button>
              <button class="btn-whatsapp-ticket" data-ticket-id="${ticket.id}" data-action="whatsapp">
                  <i class="fab fa-whatsapp"></i> WhatsApp
              </button>
            </div>
          </div>
        </div>
      `).join('') : `
        <div class="empty-tickets">
          <div class="empty-icon">
            <i class="fas fa-ticket-alt"></i>
          </div>
          <h3>No Tickets Yet</h3>
          <p>You haven't created any service tickets yet. Order a service to get started!</p>
          <button class="btn-primary" onclick="buildPage('service')">
            <i class="fas fa-rocket"></i> Browse Services
          </button>
        </div>
      `}
    </div>
<div class="tickets-help">
  <div>
            <h3>Need Immediate Assistance?</h3>
            <p>Chat with us directly on WhatsApp for faster support</p>
            <button class="btn-whatsapp" id="whatsappSupportBtn">
              <i class="fab fa-whatsapp"></i> Chat on WhatsApp
            </button>
            <p class="whatsapp-info">
              <i class="fas fa-clock"></i> Available: Mon-Fri, 9AM-6PM (WAT)<br>
              <i class="fas fa-bolt"></i> Average Response Time: 15 minutes
            </p>
          </div>
          
    <div>
      <h3><i class="fas fa-question-circle"></i> Need Help?</h3>
      <p>If you have questions about your tickets, you can:</p>
      <ul>
        <li>Click "Chat" on any ticket to talk with support</li>
        <li>Click "WhatsApp" for immediate assistance</li>
        <li>Email us at support@tekagon.com</li>
        <li>Check the status updates on your ticket details page</li>
      </ul>
    </div>
</div>
  `;

      // Add WhatsApp functionality
      addWhatsAppSupport();

      // Add ticket styles (make sure this includes WhatsApp styles)
      addTicketStyles();

      // Add event listeners for ticket buttons
      addTicketEventListeners();


      // Add this event listener after the tickets page is built
      document.addEventListener('click', function (e) {
        const button = e.target.closest('.btn-view-ticket, .btn-chat-ticket');
        if (!button) return;

        const ticketId = button.dataset.ticketId;
        const action = button.dataset.action;

        if (!ticketId) return;

        if (action === 'view') {
          showTicketDetailsModal(ticketId);
        } else if (action === 'chat') {
          // Navigate to chat page
          if (typeof buildPage === 'function') {
            buildPage('chat');
          }
          localStorage.setItem('current_ticket_id', ticketId);

          setTimeout(() => {
            const chatInput = document.getElementById('chatInput');
            if (chatInput) {
              const currentUserId = localStorage.getItem('chatUserId');
              const tickets = window.getUserTickets(currentUserId);
              const ticket = tickets[ticketId];
              if (ticket) {
                chatInput.value = `I have a question about my ticket #${ticket.id} for ${ticket.serviceName}`;
                chatInput.focus();
              }
            }
          }, 500);
        }
      });

      // Add ticket styles
      addTicketStyles();
      return;
    }

    // Tickets Helper

    function getStatusIcon(status) {
      const icons = {
        'pending': 'clock',
        'in-progress': 'spinner',
        'completed': 'check-circle',
        'cancelled': 'times-circle'
      };
      return icons[status] || 'question-circle';
    }

    function viewTicketDetails(ticketId) {
      const currentUserId = localStorage.getItem('chatUserId');
      const tickets = getUserTickets(currentUserId);
      const ticket = tickets[ticketId];

      if (!ticket) return;

      // Create ticket details modal
      const modalHTML = `
    <div class="ticket-modal-overlay" id="ticketModal">
      <div class="ticket-modal">
        <div class="modal-header">
          <h2>Ticket Details</h2>
          <button class="modal-close" onclick="closeTicketModal()">×</button>
        </div>
        
        <div class="modal-body">
          <div class="ticket-info">
            <div class="ticket-id-display">
              <span class="ticket-id-label">Ticket ID:</span>
              <span class="ticket-id-value">${ticket.id}</span>
            </div>
            
            <div class="ticket-status-display">
              <span class="status-label">Status:</span>
              <span class="status-value ${ticket.status}">
                <i class="fas fa-${getStatusIcon(ticket.status)}"></i>
                ${ticket.status.charAt(0).toUpperCase() + ticket.status.slice(1)}
              </span>
            </div>
          </div>
          
          <div class="ticket-service">
            <h3><i class="fas fa-cog"></i> Service Requested</h3>
            <div class="service-name">${escapeHtml(ticket.serviceName)}</div>
          </div>
          
          <div class="ticket-form-data">
            <h3><i class="fas fa-file-alt"></i> Form Details</h3>
            <div class="form-data-grid">
              ${Object.entries(ticket.formData).map(([key, value]) => `
                <div class="form-field-detail">
                  <label>${escapeHtml(key)}:</label>
                  <div class="field-value">${escapeHtml(String(value))}</div>
                </div>
              `).join('')}
            </div>
          </div>
          
          ${ticket.messages && ticket.messages.length > 0 ? `
            <div class="ticket-messages">
              <h3><i class="fas fa-comments"></i> Related Messages</h3>
              <div class="messages-list">
                ${ticket.messages.map(msg => `
                  <div class="ticket-message ${msg.sender}">
                    <div class="message-sender">
                      <i class="fas fa-${msg.sender === 'user' ? 'user' : 'headset'}"></i>
                      ${msg.sender === 'user' ? 'You' : 'Support'}
                    </div>
                    <div class="message-content">${escapeHtml(msg.content)}</div>
                    <div class="message-time">
                      ${new Date(msg.timestamp).toLocaleString()}
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>
          ` : ''}
          
          ${ticket.adminNotes ? `
            <div class="admin-notes">
              <h3><i class="fas fa-sticky-note"></i> Admin Notes</h3>
              <div class="notes-content">${escapeHtml(ticket.adminNotes)}</div>
            </div>
          ` : ''}
        </div>
        
        <div class="modal-footer">
          <div class="ticket-timestamps">
            <div class="timestamp">
              <i class="fas fa-calendar-plus"></i>
              Created: ${new Date(ticket.createdAt).toLocaleString()}
            </div>
            <div class="timestamp">
              <i class="fas fa-calendar-check"></i>
              Updated: ${new Date(ticket.updatedAt).toLocaleString()}
            </div>
          </div>
          <div class="modal-actions">
            <button class="btn-secondary" onclick="closeTicketModal()">
              <i class="fas fa-times"></i> Close
            </button>
            <button class="btn-primary" onclick="chatAboutTicket('${ticket.id}')">
              <i class="fas fa-comment"></i> Chat About This Ticket
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

      // Remove existing modal
      const existingModal = document.getElementById('ticketModal');
      if (existingModal) existingModal.remove();

      // Add new modal
      document.body.insertAdjacentHTML('beforeend', modalHTML);
      addTicketModalStyles();
    }

    function closeTicketModal() {
      const modal = document.getElementById('ticketModal');
      if (modal) modal.remove();
    }

    function chatAboutTicket(ticketId) {
      const currentUserId = localStorage.getItem('chatUserId');
      const tickets = getUserTickets(currentUserId);
      const ticket = tickets[ticketId];

      if (!ticket) return;

      // Navigate to chat page with ticket context
      buildPage('chat');

      // Store current ticket context
      localStorage.setItem('current_ticket_id', ticketId);

      // You could also pre-populate a message about the ticket
      setTimeout(() => {
        const chatInput = document.getElementById('chatInput');
        if (chatInput) {
          chatInput.value = `I have a question about my ticket #${ticket.id} for ${ticket.serviceName}`;
          chatInput.focus();
        }
      }, 500);
    }

    // Add this function to handle WhatsApp support
    function addWhatsAppSupport() {
      // WhatsApp configuration
      const whatsappConfig = {
        phoneNumber: '+2348167883281', // Replace with your WhatsApp business number
        defaultMessage: 'Hello Tekagon Support, I need assistance with my service ticket.',
        businessHours: {
          start: 9, // 9 AM
          end: 18,  // 6 PM
          timezone: 'Africa/Lagos'
        }
      };

      // Check if within business hours
      function isWithinBusinessHours() {
        const now = new Date();
        const lagosTime = new Date(now.toLocaleString('en-US', { timeZone: 'Africa/Lagos' }));
        const currentHour = lagosTime.getHours();
        const currentDay = lagosTime.getDay(); // 0 = Sunday, 1 = Monday, etc.

        // Check if it's a weekday (Monday to Friday)
        const isWeekday = currentDay >= 1 && currentDay <= 5;

        // Check if within business hours
        return isWeekday && currentHour >= whatsappConfig.businessHours.start &&
          currentHour < whatsappConfig.businessHours.end;
      }

      // Format WhatsApp URL
      function getWhatsAppUrl(ticketId = null, ticketData = null) {
        let message = whatsappConfig.defaultMessage;

        if (ticketId) {
          const userId = localStorage.getItem('chatUserId');
          const userName = localStorage.getItem('userName') || 'Customer';
          const userPhone = localStorage.getItem('userPhone') || '';

          message = `Hello Tekagon Support,\n\nI need assistance with my service ticket.\n\n`;
          message += `📋 Ticket ID: ${ticketId}\n`;
          message += `👤 Name: ${userName}\n`;
          if (userPhone) message += `📞 Phone: ${userPhone}\n`;
          message += `\nPlease provide an update on my ticket status.`;

          if (ticketData) {
            message += `\n\nService: ${ticketData.serviceName}`;
            message += `\nStatus: ${ticketData.status}`;
            message += `\nCreated: ${new Date(ticketData.createdAt).toLocaleDateString()}`;
          }
        }

        // Encode the message for URL
        const encodedMessage = encodeURIComponent(message);
        return `https://wa.me/${whatsappConfig.phoneNumber}?text=${encodedMessage}`;
      }

      // Main WhatsApp button click handler
      const whatsappBtn = document.getElementById('whatsappSupportBtn');
      if (whatsappBtn) {
        whatsappBtn.addEventListener('click', function (e) {
          e.preventDefault();

          if (!isWithinBusinessHours()) {
            showWhatsAppHoursModal();
            return;
          }

          // Open WhatsApp with default message
          const whatsappUrl = getWhatsAppUrl();
          window.open(whatsappUrl, '_blank');

          // Track the click
          trackWhatsAppClick('general_support');
        });
      }

      // Ticket-specific WhatsApp buttons
      document.addEventListener('click', function (e) {
        // WhatsApp ticket button in actions
        const whatsappTicketBtn = e.target.closest('.btn-whatsapp-ticket');
        if (whatsappTicketBtn) {
          e.preventDefault();
          const ticketId = whatsappTicketBtn.dataset.ticketId;
          if (!ticketId) return;

          if (!isWithinBusinessHours()) {
            showWhatsAppHoursModal();
            return;
          }

          // Get ticket data
          const userId = localStorage.getItem('chatUserId');
          const tickets = getUserTickets(userId);
          const ticket = tickets[ticketId];

          if (ticket) {
            const whatsappUrl = getWhatsAppUrl(ticketId, ticket);
            window.open(whatsappUrl, '_blank');

            // Track the click
            trackWhatsAppClick('ticket_specific', ticketId);
          }
        }

        // WhatsApp link in ticket meta
        const whatsappMeta = e.target.closest('.whatsapp-ticket');
        if (whatsappMeta) {
          e.preventDefault();
          const ticketId = whatsappMeta.dataset.ticketId;
          if (!ticketId) return;

          if (!isWithinBusinessHours()) {
            showWhatsAppHoursModal();
            return;
          }

          // Get ticket data
          const userId = localStorage.getItem('chatUserId');
          const tickets = getUserTickets(userId);
          const ticket = tickets[ticketId];

          if (ticket) {
            const whatsappUrl = getWhatsAppUrl(ticketId, ticket);
            window.open(whatsappUrl, '_blank');

            // Track the click
            trackWhatsAppClick('ticket_meta', ticketId);
          }
        }
      });

      // Show business hours modal
      function showWhatsAppHoursModal() {
        const modalHTML = `
      <div class="whatsapp-modal-overlay" id="whatsappModal">
        <div class="whatsapp-modal">
          <div class="modal-header">
            <div class="whatsapp-modal-icon">
              <i class="fab fa-whatsapp"></i>
            </div>
            <h3>Outside Business Hours</h3>
            <button class="modal-close" id="closeWhatsAppModal">×</button>
          </div>
          
          <div class="modal-body">
            <div class="business-hours-info">
              <div class="hours-card">
                <i class="fas fa-clock"></i>
                <div>
                  <h4>Business Hours</h4>
                  <p>Monday - Friday: 9:00 AM - 6:00 PM (WAT)</p>
                  <p>Saturday: 10:00 AM - 2:00 PM (WAT)</p>
                  <p>Sunday: Closed</p>
                </div>
              </div>
              
              <div class="alternative-options">
                <h4>Alternative Options:</h4>
                <ul>
                  <li><i class="fas fa-comment"></i> Use our in-app chat (available 24/7)</li>
                  <li><i class="fas fa-envelope"></i> Email: support@tekagon.com</li>
                  <li><i class="fas fa-calendar"></i> Schedule a callback for next business day</li>
                </ul>
              </div>
            </div>
          </div>
          
          <div class="modal-footer">
            <button class="btn-secondary" id="useChatBtn">
              <i class="fas fa-comment"></i> Use In-App Chat
            </button>
            <button class="btn-primary" id="continueWhatsAppBtn">
              <i class="fab fa-whatsapp"></i> Continue to WhatsApp
            </button>
          </div>
        </div>
      </div>
    `;

        // Remove existing modal
        const existingModal = document.getElementById('whatsappModal');
        if (existingModal) existingModal.remove();

        // Add new modal
        document.body.insertAdjacentHTML('beforeend', modalHTML);

        // Add event listeners
        document.getElementById('closeWhatsAppModal')?.addEventListener('click', () => {
          document.getElementById('whatsappModal')?.remove();
        });

        document.getElementById('useChatBtn')?.addEventListener('click', () => {
          document.getElementById('whatsappModal')?.remove();
          // Navigate to chat page
          buildPage('chat');
        });

        document.getElementById('continueWhatsAppBtn')?.addEventListener('click', () => {
          document.getElementById('whatsappModal')?.remove();
          // Open WhatsApp anyway
          const whatsappUrl = getWhatsAppUrl();
          window.open(whatsappUrl, '_blank');
        });

        // Close on outside click
        document.getElementById('whatsappModal')?.addEventListener('click', function (e) {
          if (e.target === this) {
            this.remove();
          }
        });

        // Add styles if not present
        addWhatsAppModalStyles();
      }

      // Track WhatsApp clicks (optional analytics)
      function trackWhatsAppClick(type, ticketId = null) {
        const userId = localStorage.getItem('chatUserId');
        const trackData = {
          type: type,
          ticketId: ticketId,
          userId: userId,
          timestamp: new Date().toISOString(),
          withinBusinessHours: isWithinBusinessHours()
        };

        // Save to localStorage for analytics
        const whatsappAnalytics = JSON.parse(localStorage.getItem('tekagon_whatsapp_analytics') || '[]');
        whatsappAnalytics.push(trackData);

        // Keep only last 100 entries
        if (whatsappAnalytics.length > 100) {
          whatsappAnalytics.shift();
        }

        localStorage.setItem('tekagon_whatsapp_analytics', JSON.stringify(whatsappAnalytics));

        console.log('WhatsApp click tracked:', trackData);
      }

      // Update UI based on business hours
      function updateWhatsAppUI() {
        const isOpen = isWithinBusinessHours();
        const statusIndicator = document.querySelector('.whatsapp-status');

        if (statusIndicator) {
          statusIndicator.className = `whatsapp-status ${isOpen ? 'open' : 'closed'}`;
          statusIndicator.innerHTML = isOpen ?
            '<i class="fas fa-circle"></i> Available Now' :
            '<i class="fas fa-circle"></i> Returns at 9 AM';
        }
      }

      // Initialize
      updateWhatsAppUI();

      // Update status every minute
      setInterval(updateWhatsAppUI, 60000);
    }

    function addWhatsAppModalStyles() {
      if (document.getElementById('whatsappModalStyles')) return;

      const style = document.createElement('style');
      style.id = 'whatsappModalStyles';
      style.textContent = `
    .whatsapp-modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.8);
      backdrop-filter: blur(5px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      padding: 20px;
      animation: fadeIn 0.3s ease-out;
    }
    
    .whatsapp-modal {
      background: #1e293b;
      border-radius: 16px;
      max-width: 500px;
      width: 100%;
      max-height: 90vh;
      overflow: hidden;
      border: 1px solid rgba(255, 255, 255, 0.1);
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
      animation: slideUp 0.3s ease-out;
    }
    
    .whatsapp-modal .modal-header {
      padding: 30px;
      background: linear-gradient(135deg, rgba(37, 211, 102, 0.2), rgba(18, 27, 45, 0.4));
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      text-align: center;
      position: relative;
    }
    
    .whatsapp-modal-icon {
      width: 80px;
      height: 80px;
      background: #25d366;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 20px;
      font-size: 2.5rem;
      color: white;
    }
    
    .whatsapp-modal .modal-header h3 {
      margin: 0;
      color: white;
      font-size: 1.8rem;
    }
    
    .whatsapp-modal .modal-close {
      position: absolute;
      top: 20px;
      right: 20px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
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
    
    .whatsapp-modal .modal-close:hover {
      background: rgba(255, 255, 255, 0.1);
    }
    
    .whatsapp-modal .modal-body {
      padding: 30px;
    }
    
    .business-hours-info {
      display: flex;
      flex-direction: column;
      gap: 25px;
    }
    
    .hours-card {
      background: rgba(37, 211, 102, 0.05);
      border: 1px solid rgba(37, 211, 102, 0.1);
      border-radius: 12px;
      padding: 20px;
      display: flex;
      align-items: flex-start;
      gap: 15px;
    }
    
    .hours-card i {
      color: #25d366;
      font-size: 1.5rem;
      margin-top: 5px;
    }
    
    .hours-card h4 {
      margin: 0 0 10px 0;
      color: #e2e8f0;
    }
    
    .hours-card p {
      margin: 5px 0;
      color: #94a3b8;
      font-size: 0.95rem;
    }
    
    .alternative-options h4 {
      color: #e2e8f0;
      margin-bottom: 15px;
    }
    
    .alternative-options ul {
      list-style: none;
      padding: 0;
      margin: 0;
    }
    
    .alternative-options li {
      padding: 10px 0;
      color: #94a3b8;
      display: flex;
      align-items: center;
      gap: 10px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    }
    
    .alternative-options li:last-child {
      border-bottom: none;
    }
    
    .alternative-options li i {
      color: #93fff6;
      width: 20px;
    }
    
    .whatsapp-modal .modal-footer {
      padding: 20px 30px;
      background: rgba(255, 255, 255, 0.02);
      border-top: 1px solid rgba(255, 255, 255, 0.05);
      display: flex;
      gap: 12px;
    }
    
    .whatsapp-modal .btn-secondary,
    .whatsapp-modal .btn-primary {
      flex: 1;
      padding: 14px;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      transition: all 0.3s;
      border: none;
      font-size: 1rem;
    }
    
    .whatsapp-modal .btn-secondary {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: var(--text);
    }
    
    .whatsapp-modal .btn-primary {
      background: linear-gradient(135deg, #25d366, #128C7E);
      color: white;
    }
    
    .whatsapp-modal .btn-secondary:hover {
      background: rgba(255, 255, 255, 0.1);
      transform: translateY(-2px);
    }
    
    .whatsapp-modal .btn-primary:hover {
      opacity: 0.9;
      transform: translateY(-2px);
    }
    
    @media (max-width: 768px) {
      .whatsapp-modal .modal-footer {
        flex-direction: column;
      }
    }
  `;

      document.head.appendChild(style);
    }

    function addTicketStyles() {
      if (document.getElementById('ticketStyles')) return;

      const style = document.createElement('style');
      style.id = 'ticketStyles';
      style.textContent = `

      /* WhatsApp Support Section */
   
  `;

      document.head.appendChild(style);
    }

    function addTicketEventListeners() {
      document.addEventListener('click', function (e) {
        const button = e.target.closest('.btn-view-ticket, .btn-chat-ticket, .btn-whatsapp-ticket');
        if (!button) return;

        const ticketId = button.dataset.ticketId;
        const action = button.dataset.action;

        if (!ticketId) return;

        if (action === 'view') {
          showTicketDetailsModal(ticketId);
        } else if (action === 'chat') {
          // Navigate to chat page
          if (typeof buildPage === 'function') {
            buildPage('chat');
          }
          localStorage.setItem('current_ticket_id', ticketId);

          setTimeout(() => {
            const chatInput = document.getElementById('chatInput');
            if (chatInput) {
              const currentUserId = localStorage.getItem('chatUserId');
              const tickets = window.getUserTickets(currentUserId);
              const ticket = tickets[ticketId];
              if (ticket) {
                chatInput.value = `I have a question about my ticket #${ticket.id} for ${ticket.serviceName}`;
                chatInput.focus();
              }
            }
          }, 500);
        } else if (action === 'whatsapp') {
          // WhatsApp functionality will be handled by addWhatsAppSupport()
          // This is just a fallback
          console.log('WhatsApp button clicked for ticket:', ticketId);
        }
      });
    }

    // special: stack page — edit HTML here directly
    if (pageKey === 'stack') {
      pageEl.innerHTML = `
    <section class="stack-section dark">
  <div class="stack-category">
    <h2>Design</h2>
    <div class="stack-grid">
      <div class="stack-item">
        <img src="https://upload.wikimedia.org/wikipedia/commons/a/af/Adobe_Photoshop_CC_icon.svg" alt="Photoshop">
        <div>
          <h3>Photoshop</h3>
          <p>Photo Editing</p>
        </div>
      </div>
      <div class="stack-item">
        <img src="https://upload.wikimedia.org/wikipedia/commons/f/fb/Adobe_Illustrator_CC_icon.svg" alt="Illustrator">
        <div>
          <h3>Illustrator</h3>
          <p>Vector Design</p>
        </div>
      </div>
      <div class="stack-item">
        <img src="https://upload.wikimedia.org/wikipedia/commons/3/33/Figma-logo.svg" alt="Figma">
        <div>
          <h3>Figma</h3>
          <p>Interface Design</p>
        </div>
      </div>
      <div class="stack-item">
        <img src="https://upload.wikimedia.org/wikipedia/commons/c/c2/Adobe_XD_CC_icon.svg" alt="Adobe XD">
        <div>
          <h3>Adobe XD</h3>
          <p>Prototyping</p>
        </div>
      </div>
      <div class="stack-item">
        <img src="https://upload.wikimedia.org/wikipedia/commons/c/cb/Adobe_After_Effects_CC_icon.svg" alt="After Effects">
        <div>
          <h3>After Effects</h3>
          <p>Motion Graphics</p>
        </div>
      </div>
      <div class="stack-item">
        <img src="https://upload.wikimedia.org/wikipedia/commons/4/40/Adobe_Premiere_Pro_CC_icon.svg" alt="Premiere Pro">
        <div>
          <h3>Premiere Pro</h3>
          <p>Video Editing</p>
        </div>
      </div> 
     
    </div>
  </div>
</section>


<section class="stack-section dark">
  <!-- Frontend Frameworks -->
  <div class="stack-category">
    <h2>Frontend Frameworks</h2>
    <div class="stack-grid">
      <div class="stack-item">
        <img src="https://upload.wikimedia.org/wikipedia/commons/a/a7/React-icon.svg" alt="React">
        <div>
          <h3>React</h3>
          <p>UI Framework</p>
        </div>
      </div>
      <div class="stack-item">
        <img src="https://upload.wikimedia.org/wikipedia/commons/d/d9/Node.js_logo.svg" alt="React Native">
        <div>
          <h3>React Native</h3>
          <p>Mobile Framework</p>
        </div>
      </div>
      <div class="stack-item">
        <img class='nxtjs' src="https://upload.wikimedia.org/wikipedia/commons/8/8e/Nextjs-logo.svg" alt="Next.js">
        <div>
          <h3>Next.js</h3>
          <p>Full-stack React Framework</p>
        </div>
      </div>
    </div>
  </div>

  <!-- Programming Languages -->
  <div class="stack-category">
    <h2>Programming Languages</h2>
    <div class="stack-grid">
      <div class="stack-item">
        <img src="https://upload.wikimedia.org/wikipedia/commons/c/c3/Python-logo-notext.svg" alt="Python">
        <div>
          <h3>Python</h3>
          <p>General Purpose</p>
        </div>
      </div>
      <div class="stack-item">
        <img src="https://upload.wikimedia.org/wikipedia/commons/6/6a/JavaScript-logo.png" alt="JavaScript">
        <div>
          <h3>JavaScript</h3>
          <p>Frontend Scripting</p>
        </div>
      </div>
      <div class="stack-item">
        <img src="https://upload.wikimedia.org/wikipedia/commons/1/18/C_Programming_Language.svg" alt="C++">
        <div>
          <h3>C++</h3>
          <p>High-performance</p>
        </div>
      </div>
      <div class="stack-item">
        <img src="https://upload.wikimedia.org/wikipedia/commons/4/4f/Csharp_Logo.png" alt="C#">
        <div>
          <h3>C#</h3>
          <p>Microsoft Stack</p>
        </div>
      </div>
      <div class="stack-item">
        <img src="https://upload.wikimedia.org/wikipedia/en/3/30/Java_programming_language_logo.svg" alt="Java">
        <div>
          <h3>Java</h3>
          <p>Cross-platform</p>
        </div>
      </div>
     
      </div>
    </div>
  </div>

  <!-- Mobile & UI Tools -->
  <div class="stack-category">
    <h2>Mobile & UI</h2>
    <div class="stack-grid">
      <div class="stack-item">
        <img src="https://upload.wikimedia.org/wikipedia/commons/1/17/Google-flutter-logo.png" alt="Flutter">
        <div>
          <h3>Flutter</h3>
          <p>Cross-platform SDK</p>
        </div>
      </div>
      <div class="stack-item">
        <img src="https://upload.wikimedia.org/wikipedia/commons/7/74/Kotlin_Icon.png" alt="Kotlin">
        <div>
          <h3>Kotlin</h3>
          <p>Android Development</p>
        </div>
      </div>
      <div class="stack-item">
        <img src="https://upload.wikimedia.org/wikipedia/commons/2/27/PHP-logo.svg" alt="PHP">
        <div>
          <h3>PHP</h3>
          <p>Server-side Scripting</p>
        </div>
      </div>
    </div>
  </div>

  <!-- Backend & Cloud -->
  <div class="stack-category">
    <h2>Backend & Cloud</h2>
    <div class="stack-grid">
      <div class="stack-item">
        <img src="https://upload.wikimedia.org/wikipedia/commons/d/d9/Node.js_logo.svg" alt="Node.js">
        <div>
          <h3>Node.js</h3>
          <p>Server Environment</p>
        </div>
      </div>
      <div class="stack-item">
        <img src="https://upload.wikimedia.org/wikipedia/commons/6/64/Expressjs.png" alt="Express.js">
        <div>
          <h3>Express.js</h3>
          <p>Backend Framework</p>
        </div>
      </div>
      <div class="stack-item">
        <img src="https://upload.wikimedia.org/wikipedia/commons/9/93/Amazon_Web_Services_Logo.svg" alt="AWS">
        <div>
          <h3>AWS</h3>
          <p>Cloud Platform</p>
        </div>
      </div>
      <div class="stack-item">
        <img src="https://upload.wikimedia.org/wikipedia/commons/3/37/Firebase_Logo.svg" alt="Firebase">
        <div>
          <h3>Firebase</h3>
          <p>Backend as a Service</p>
        </div>
      </div>
      <div class="stack-item">
        <img src="https://upload.wikimedia.org/wikipedia/commons/4/4e/Docker_%28container_engine%29_logo.svg" alt="Docker">
        <div>
          <h3>Docker</h3>
          <p>Containerization</p>
        </div>
      </div>
      <div class="stack-item">
        <img src="https://upload.wikimedia.org/wikipedia/commons/3/39/Kubernetes_logo_without_workmark.svg" alt="Kubernetes">
        <div>
          <h3>Kubernetes</h3>
          <p>Container Orchestration</p>
        </div>
      </div>
      <div class="stack-item">
        <img src="https://upload.wikimedia.org/wikipedia/commons/3/35/Tux.svg" alt="Linux">
        <div>
          <h3>Linux</h3>
          <p>Operating System</p>
        </div>
      </div>
      <div class="stack-item">
        <img src="https://upload.wikimedia.org/wikipedia/commons/e/e0/Git-logo.svg" alt="Git">
        <div>
          <h3>Git</h3>
          <p>Version Control</p>
        </div>
      </div>
    </div>
  </div>
</section>


      `;
      return;
    }


    // special: book page with scheduler
    if (pageKey === 'book') {
      // Remove carousel on book page
      if (carouselEl) carouselEl.style.display = 'none';
      if (carouselParent) {
        carouselParent.style.display = 'none';
        carouselParent.style.margin = '0';
        carouselParent.style.padding = '0';
        carouselParent.style.height = '0';
        carouselParent.style.minHeight = '0';
        carouselParent.style.overflow = 'hidden';
      }

      pageEl.innerHTML = `
    <!-- Scheduler Component -->
    <div class="scheduling-container" id="schedulingComponent">

        <!-- Main Header -->
        <div class="main-header">
            <div class="header-content">
                <div class="header-badge">
                    <i class="fas fa-rocket"></i> SME Digital Consultation
                </div>
                <h1 class="header-title">Schedule Your Session</h1>
                <p class="header-subtitle">Transform your business with expert digital guidance</p>
            </div>
        </div>

        <!-- Back Button -->
        <div class="back-button-container">
            <button class="back-button" id="backButton" style="display: none;">
                <i class="fas fa-arrow-left"></i> Back
            </button>
        </div>

        <div class="scheduling-wrapper">

            <!-- Sidebar -->
           

            <!-- Main Content -->
            <div class="main-content">

                <!-- Step 1: Date & Time -->
                <div class="step active" id="step1">
                    <div class="step-header">
                        <h2>Select Date & Time</h2>
                        <p>Choose when you'd like your digital consultation session</p>
                    </div>

                    <div class="timezone-selector">
                        <div class="form-group">
                            <label for="timezone"><i class="fas fa-globe"></i> Time Zone</label>
                            <select id="timezone">
                                <option value="Africa/Lagos">🇳🇬 West Africa Time (WAT)</option>
                                <option value="UTC">🌐 Coordinated Universal Time (UTC)</option>
                                <option value="America/New_York">🇺🇸 Eastern Time (ET)</option>
                                <option value="Europe/London">🇬🇧 Greenwich Mean Time (GMT)</option>
                                <option value="Asia/Dubai">🇦🇪 Gulf Standard Time (GST)</option>
                            </select>
                        </div>
                    </div>

                    <div class="calendar-wrapper">
                        <div class="calendar-container">
                            <div class="calendar-header">
                                <button id="prevMonth" class="calendar-nav-button">
                                    <i class="fas fa-chevron-left"></i>
                                </button>
                                <h3 id="currentMonthYear">Loading...</h3>
                                <button id="nextMonth" class="calendar-nav-button">
                                    <i class="fas fa-chevron-right"></i>
                                </button>
                            </div>

                            <div class="calendar-weekdays">
                                <div>Mon</div>
                                <div>Tue</div>
                                <div>Wed</div>
                                <div>Thu</div>
                                <div>Fri</div>
                                <div>Sat</div>
                                <div>Sun</div>
                            </div>

                            <div class="calendar-days" id="calendarDays">
                                <!-- Calendar generated by JavaScript -->
                            </div>
                        </div>

                        <!-- Time slots container (created by JavaScript) -->
                    </div>
                </div>

                <!-- Step 2: Details Form -->
                <div class="step" id="step2">
                    <div class="step-header">
                        <h2>Enter Your Details</h2>
                        <p>Tell us about yourself and your business needs</p>
                    </div>

                    <form id="bookingForm">
                        <div class="form-row">
                            <div class="form-group">
                                <label for="name"><i class="fas fa-user"></i> Full Name *</label>
                                <input type="text" id="name" name="name" required placeholder="John Doe">
                            </div>

                            <div class="form-group">
                                <label for="email"><i class="fas fa-envelope"></i> Email Address *</label>
                                <input type="email" id="email" name="email" required placeholder="john@company.com">
                            </div>
                        </div>

                        <div class="form-group">
                            <div class="add-guests-header"
                                style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                                <label><i class="fas fa-users"></i> Add Team Members (Optional)</label>
                                <button type="button" class="btn-add-guest" id="addGuestBtn">
                                    <i class="fas fa-plus"></i> Add Member
                                </button>
                            </div>
                            <div class="guests-container" id="guestsContainer">
                                <!-- Guest inputs added here -->
                            </div>
                            <small style="color: var(--gray); font-size: 13px;">Team members will receive calendar
                                invites and session updates</small>
                        </div>

                        <div class="form-group">
                            <label><i class="fas fa-video"></i> Meeting Platform *</label>
                            <div class="platform-options">
                                <label class="platform-option">
                                    <input type="radio" name="platform" value="google-meet" checked>
                                    <div class="platform-content">
                                        <span class="platform-icon"><i class="fab fa-google"></i></span>
                                        <div>
                                            <div style="font-weight: 600; margin-bottom: 5px;">Google Meet</div>
                                            <small style="color: var(--gray);">Best for G Suite users</small>
                                        </div>
                                    </div>
                                </label>

                                <label class="platform-option">
                                    <input type="radio" name="platform" value="zoom">
                                    <div class="platform-content">
                                        <span class="platform-icon"><i class="fas fa-video"></i></span>
                                        <div>
                                            <div style="font-weight: 600; margin-bottom: 5px;">Zoom Meeting</div>
                                            <small style="color: var(--gray);">Enterprise-grade video
                                                conferencing</small>
                                        </div>
                                    </div>
                                </label>

                                <label class="platform-option">
                                    <input type="radio" name="platform" value="phone">
                                    <div class="platform-content">
                                        <span class="platform-icon"><i class="fas fa-phone"></i></span>
                                        <div>
                                            <div style="font-weight: 600; margin-bottom: 5px;">Phone Call</div>
                                            <small style="color: var(--gray);">Direct phone consultation</small>
                                        </div>
                                    </div>
                                </label>
                            </div>
                        </div>

                        <div class="form-row">
                            <div class="form-group">
                                <label for="company"><i class="fas fa-building"></i> Company Name *</label>
                                <input type="text" id="company" name="company" required placeholder="Your Company Inc">
                            </div>

                            <div class="form-group">
                                <label for="phone"><i class="fas fa-mobile-alt"></i> Phone Number *</label>
                                <input type="tel" id="phone" name="phone" required placeholder="+234 800 000 0000">
                            </div>
                        </div>

                        <div class="form-group">
                            <label for="businessType"><i class="fas fa-chart-pie"></i> Business Type *</label>
                            <select id="businessType" name="businessType" required>
                                <option value="">Select your industry</option>
                                <option value="retail">🛍️ Retail & E-commerce</option>
                                <option value="services">💼 Professional Services</option>
                                <option value="manufacturing">🏭 Manufacturing</option>
                                <option value="tech">💻 Technology & Software</option>
                                <option value="consulting">🎯 Consulting</option>
                                <option value="hospitality">🏨 Hospitality & Tourism</option>
                                <option value="education">🎓 Education & Training</option>
                                <option value="healthcare">🏥 Healthcare</option>
                                <option value="agriculture">🌱 Agriculture</option>
                                <option value="other">🔗 Other Industry</option>
                            </select>
                        </div>

                        <div class="form-group">
                            <label for="notes"><i class="fas fa-sticky-note"></i> What would you like to
                                discuss?</label>
                            <textarea id="notes" name="notes" rows="4"
                                placeholder="Tell us about your current challenges, goals, or specific topics you'd like to cover during the session..."></textarea>
                        </div>

                        <div class="terms-section">
                            <p><i class="fas fa-shield-alt"></i> By proceeding, you confirm that you have read and agree
                                to Tekagon Digital's <a href="#">Terms of Service</a> and <a href="#">Privacy
                                    Policy</a>. Your data is securely encrypted and protected.</p>
                        </div>

                        <button type="submit" class="btn-schedule" id="scheduleBtn">
                            <i class="fas fa-calendar-check"></i> Confirm & Schedule Session
                        </button>
                    </form>
                </div>

                <!-- Step 3: Confirmation -->
                <div class="step confirmation-step" id="step3">
                    <div class="confirmation-icon">
                        <i class="fas fa-check"></i>
                    </div>
                    <h2 class="confirmation-title">You're All Set! 🎉</h2>
                    <p class="confirmation-text">
                        Your SME-Spot session has been scheduled successfully! A beautiful confirmation email with all
                        the details has been sent to your inbox. Check your email for the complete session overview.
                    </p>

                    <div class="confirmation-actions">
                        <button class="btn-invitation" id="openInvitationBtn">
                            <i class="fas fa-external-link-alt"></i> View Digital Invitation
                        </button>
                        <button class="btn-download-calendar" id="downloadCalendarBtn">
                            <i class="fas fa-download"></i> Add to Calendar
                        </button>
                    </div>

                    <div class="summary-card">
                        <h3><i class="fas fa-calendar-alt"></i> Session Summary</h3>

                        <div class="summary-grid">
                            <div class="summary-item">
                                <div class="summary-icon time-icon">
                                    <i class="fas fa-clock"></i>
                                </div>
                                <div style="text-align: left;">
                                    <div class="summary-value" id="confirmationTime">Time will appear here</div>
                                    <small class="summary-label" id="confirmationTimezone">Timezone</small>
                                </div>
                            </div>

                            <div class="summary-item">
                                <div class="summary-icon platform-icon">
                                    <i class="fas fa-video"></i>
                                </div>
                                <div style="text-align: left;">
                                    <div class="summary-value" id="confirmationPlatform">Platform</div>
                                    <small class="summary-label" id="confirmationPlatformDetails">Meeting
                                        details</small>
                                </div>
                            </div>

                            <div class="summary-item">
                                <div class="summary-icon id-icon">
                                    <i class="fas fa-id-card"></i>
                                </div>
                                <div style="text-align: left;">
                                    <div class="summary-label">Reference ID</div>
                                    <div class="booking-id" id="confirmationBookingId">Will appear here</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <button class="btn-new-booking" id="newBookingBtn">
                        <i class="fas fa-plus-circle"></i> Schedule Another Session
                    </button>
                </div>
            </div>
        </div>
    </div>

    <!-- Loading Overlay -->
    <div id="loadingOverlay" class="loading-overlay" style="display: none;">
        <div class="loading-content">
            <div class="loading-spinner">
                <i class="fas fa-spinner fa-spin"></i>
            </div>
            <div class="loading-text" id="loadingText">Processing...</div>
        </div>
    </div>

    <!-- Initialize scheduler -->
  
  `;

      // Initialize the scheduler after the page loads
      setTimeout(() => {
        if (typeof TekagonScheduler === 'function') {
          try {
            window.scheduler = new TekagonScheduler();
            console.log("✅ Scheduler initialized successfully in book page");
          } catch (error) {
            console.error("❌ Failed to initialize scheduler:", error);
          }
        }
      }, 500);

      return;
    }



    // special: contact page — edit HTML here directly
    if (pageKey === 'contact' || pageKey === 'contact Us') {
      pageEl.innerHTML = `
   <section class="contact-section">
        <h2 class="header-title">Get in Touch</h2>
        <form class="contact-form" id="contactForm" action="https://formsubmit.co/tekagon.digital@gmail.com"
            method="POST">
            <!-- FormSubmit Configuration -->
            <input type="text" name="_honey" style="display:none">
            <input type="hidden" name="_captcha" value="false">
            <input type="hidden" name="_template" value="table">
            <input type="hidden" name="_subject" value="New Contact Form Submission from Website">

            <!-- Optional: Redirect after success -->
            <!-- <input type="hidden" name="_next" value="https://yourwebsite.com/thank-you.html"> -->

            <!-- Optional: CC other emails -->
            <!-- <input type="hidden" name="_cc" value="other@email.com"> -->

            <div class="contact-row">
                <div class="contact-group">
                    <label>Full Name <span>*</span></label>
                    <input type="text" id="fullName" name="name" placeholder="Enter your full name" required />
                    <div class="error-text" id="nameError">Please enter your full name</div>
                </div>
                <div class="contact-group">
                    <label>Company Name</label>
                    <input type="text" id="companyName" name="company" placeholder="Your company name" />
                </div>
            </div>

            <div class="contact-row">
                <div class="contact-group">
                    <label>Phone Number <span>*</span></label>
                    <input type="tel" id="phoneNumber" name="phone" placeholder="Your phone number" required />
                    <div class="error-text" id="phoneError">Please enter a valid phone number</div>
                </div>
                <div class="contact-group">
                    <label>Your Email <span>*</span></label>
                    <input type="email" id="email" name="email" placeholder="your.email@example.com" required />
                    <div class="error-text" id="emailError">Please enter a valid email address</div>
                </div>
            </div>

            <div class="contact-group">
                <label>Subject <span>*</span></label>
                <input type="text" id="subject" name="subject" placeholder="What is this regarding?" required />
                <div class="error-text" id="subjectError">Please enter a subject</div>
            </div>

            <div class="contact-group">
                <label>Message <span>*</span></label>
                <textarea id="message" name="message" rows="5" placeholder="Tell us how we can help you..."
                    required></textarea>
                <div class="error-text" id="messageError">Please enter your message</div>
            </div>

            <div class="error-message" id="formError">
                <!-- Error message will appear here -->
            </div>

            <button type="submit" id="submitBtn" class="contact-submit">
                <div class="submit-loader"></div>
                <span class="submit-text">
                    <i data-feather="send"></i> Send Message
                </span>
            </button>
        </form>
    </section>

    <!-- Sending Overlay -->
    <div class="sending-overlay" id="sendingOverlay">
        <div class="sending-animation">
            <div class="spinner"></div>
            <h3>Sending Your Message</h3>
            <p>Please wait while we send your message. This will only take a moment.</p>
        </div>
    </div>

    <!-- Success Popup -->
    <div class="success-popup" id="successPopup">
        <div class="success-content">
            <div class="success-icon">
                <i data-feather="check"></i>
            </div>
            <h2>Message Sent Successfully!</h2>
            <p>Thank you for contacting us. We've received your message and will get back to you within 24 hours.</p>
            <button class="close-btn" id="closeSuccess">Got It</button>
        </div>
    </div>
      `;


      initializeContactForm();

      // Reinitialize Feather Icons
      if (typeof feather !== 'undefined') {
        feather.replace();
      }

    }


    const header = document.createElement('div');
    header.innerHTML = `<h4>${escapeHtml(data.title || '')}</h4>`;
    pageEl.appendChild(header);

    // Helper: render a single portfolio item as its own page (uses innerHTML)
    // opts: { sourcePage: string, index: number }
    function renderPortfolioItem(item, opts = {}) {
      const prev = previousPage || currentPage || (opts.sourcePage || 'home');
      pageEl.innerHTML = '';
      const container = document.createElement('div');
      container.className = 'portfolio-item-page';

      // if an item provides custom HTML for the detail page, use it; otherwise render the default layout
      const detailInner = item.detailHtml ? item.detailHtml : `
        <div class="banner-wrap" style="background-image: url('${escapeHtml(item.img || item.image || '')}'); height: 360px; background-size:cover; background-position:center; border-radius:12px; margin-bottom:18px; position:relative;">
          <button id="backToPrev" style="position:absolute; left:12px; top:12px; z-index:120; padding:10px 12px; border-radius:8px; background:rgba(0,0,0,0.5); color:#fff; border:0; cursor:pointer;">← Back</button>
          <div style="position:absolute; bottom:16px; left:20px; z-index:110; color:#fff;">
            <h1 style="margin:0; font-size:2rem;">${escapeHtml(item.title || '')}</h1>
            <p style="margin:6px 0 0 0; color:rgba(255,255,255,0.9);">${escapeHtml(item.meta || '')}</p>
          </div>
        </div>
        <div class="card" style="padding:20px;">
          <div style="display:flex; gap:20px; flex-wrap:wrap;">
            <div style="flex:1 1 360px; min-width:260px;">
              <h3>Overview</h3>
              <p style="color:${getCssVar('--muted')};">${escapeHtml(item.prfTxt || item.desc || '')}</p>
              <p style="margin-top:12px;"><strong>Provider:</strong> ${escapeHtml(item.prf || '')}</p>
              <p><strong>Action:</strong> ${escapeHtml(item.btn || '')}</p>
            </div>
            <div style="flex:1 1 320px; min-width:260px;">
              <h3>Gallery</h3>
              <div style="display:grid; grid-template-columns:repeat(2,1fr); gap:8px;">
                <div style="background-image:url('${escapeHtml(item.img || '')}'); background-size:cover; background-position:center; height:120px; border-radius:8px;"></div>
                <div style="background-image:url('${escapeHtml(item.inlineImage || '')}'); background-size:cover; background-position:center; height:120px; border-radius:8px;"></div>
              </div>
            </div>
          </div>

          <hr style="margin:18px 0; border:none; border-top:1px solid rgba(255,255,255,0.04);" />

          <section style="display:flex; gap:20px; flex-wrap:wrap;">
            <div style="flex:2 1 420px;">
              <h3>Project Details</h3>
              <p style="color:${getCssVar('--muted')};">${escapeHtml(item.meta || '')}</p>
              <p style="margin-top:12px; color:${getCssVar('--muted')};">Detailed description and structured content can go here. This content is rendered from javascript using innerHTML so you can include sections, images and formatted text.</p>
            </div>
            <div style="flex:1 1 240px; min-width:220px;">
              <h3>Quick Info</h3>
              <ul style="color:${getCssVar('--muted')};">
                <li>Views: ${escapeHtml(item.count || '+0')}</li>
                <li>Type: ${escapeHtml(item.prfTxt || '—')}</li>
                <li>Contact: support@tekagon.com</li>
              </ul>
            </div>
          </section>
        </div>`;

      container.innerHTML = detailInner;
      pageEl.appendChild(container);

      // back button wiring: go exactly to previous page
      const backBtn = document.getElementById('backToPrev');
      if (backBtn) {
        backBtn.addEventListener('click', () => {
          // prefer the exact saved view state; fallback to prev/current or to the sourcePage
          const state = lastViewState || { page: prev || (opts.sourcePage || 'home'), scrollY: 0, activeMain: opts.sourcePage || null };

          // restore active nav buttons using saved activeMain/activeSub when available
          if (state.activeMain || state.activeSub) {
            navMainBtns.forEach(n => n.classList.toggle('active', n.dataset.page === state.activeMain));
            navSubitems.forEach(s => s.classList.toggle('active', s.dataset.page === state.activeSub));
            if (state.navExpanded) navGroup && navGroup.classList.add('expanded'); else navGroup && navGroup.classList.remove('expanded');
          } else {
            // fallback: mark active by page key
            const goto = state.page;
            navMainBtns.forEach(n => n.classList.toggle('active', n.dataset.page === goto));
            navSubitems.forEach(s => s.classList.toggle('active', s.dataset.page === goto));
            if (navSubitems.some(s => s.dataset.page === goto)) navGroup && navGroup.classList.add('expanded'); else navGroup && navGroup.classList.remove('expanded');
          }

          // render previous page and restore scroll
          buildPage(state.page);
          currentPage = state.page;
          previousPage = null;
          window.scrollTo(0, state.scrollY || 0);
          lastViewState = null;

          if (window.matchMedia && window.matchMedia('(max-width:768px)').matches) {
            sidebar && sidebar.classList.remove('open');
            overlay && overlay.classList.remove('visible');
          }
        });
      }

      // update hash so refresh restores this item
      try {
        if (opts && opts.sourcePage && typeof opts.index !== 'undefined') {
          location.hash = '#item=' + encodeURIComponent(opts.sourcePage + '::' + opts.index);
        } else {
          location.hash = '#item=' + encodeURIComponent((opts.sourcePage || prev) + '::0');
        }
      } catch (e) { }

      // ensure icons and scroll to top
      if (window.feather) feather.replace();
      window.scrollTo(0, 0);
    }

    const grid = document.createElement('div');
    grid.className = 'grid';
    // allow home page to show a representative item from each portfolio section
    let items = data.items || [];
    if (pageKey === 'home') {
      items = [];
      Object.keys(pageData).forEach(k => {
        if (k && k.startsWith && k.startsWith('portfolio')) {
          const p = pageData[k];
          if (p && Array.isArray(p.items) && p.items.length) {
            const it = Object.assign({}, p.items[0]);
            it.__sourcePage = k;
            it.__sourceIndex = 0;
            items.push(it);
          }
        }
      });
    }
    if ((pageKey !== "service" && page.items && page.items.length > 0)) {
      const note = document.createElement('div');
      note.className = 'card';
      note.innerHTML = `<p style="color:${getCssVar('--muted')}">No items to show in this section.</p>`;
      grid.appendChild(note);
    } else {
      items.forEach((it, idx) => {
        const c = document.createElement('div');
        c.className = 'card';
        c.innerHTML = `<div class="thumb" style="background-image:url('${it.img}')"></div>
                       <h4>${escapeHtml(it.title)}</h4>
                       <p class="thumbTxt" style="color:${getCssVar('--muted')}">${escapeHtml(it.meta || '')}</p>
                       <div class="prf" style="">
                        <img src="${escapeHtml(it.inlineImage)}" alt="Item" class="it-people">
                         <div class="prfTxt" style="">
                          <h5>${escapeHtml(it.prf || '')}</h5>
                          <p>${escapeHtml(it.prfTxt || '')}</p>
                         </div>
                           </div>
                         <p class="it_btn">${escapeHtml(it.btn || '')}</p>
                       </div>`;

        grid.appendChild(c);
        // NOTE: automatic per-card registration has been intentionally removed.
        // You must register each card's detail HTML manually using registerCardPage('<sourcePage>::<index>', htmlString).
        // This allows each card to use a completely custom structure independent of pageData.

        // attach click handler to the button area to open the item detail page
        // use a small timeout to ensure element is in DOM
        setTimeout(() => {
          const btn = c.querySelector('.it_btn');
          if (btn) {
            btn.style.cursor = 'pointer';
            btn.addEventListener('click', (e) => {
              // capture exact previous view state so Back can restore nav and scroll
              const activeMain = (navMainBtns.find(n => n.classList.contains('active')) || {}).dataset?.page || null;
              const activeSub = (navSubitems.find(s => s.classList.contains('active')) || {}).dataset?.page || null;
              const sourcePage = it.__sourcePage || pageKey;
              lastViewState = {
                // when clicking from a portfolio-sourced card, record its original portfolio page
                page: sourcePage || currentPage || 'home',
                scrollY: (typeof window !== 'undefined' && window.scrollY) ? window.scrollY : 0,
                activeMain,
                activeSub,
                navExpanded: !!(navGroup && navGroup.classList.contains('expanded'))
              };
              // set current page placeholder and render item detail
              previousPage = lastViewState.page;
              currentPage = 'portfolio-item';
              // open the registered card page (or auto-register a default) using a unique key
              const key = (sourcePage || pageKey) + '::' + (typeof it.__sourceIndex !== 'undefined' ? it.__sourceIndex : idx);
              // log the computed key so you can register it via registerCardPage(key, html)
              console.log('Opening card key:', key, 'title:', it.title);
              if (!getCardPage(key)) console.warn('No registered page for', key, ' — registered keys:', Object.keys(cardPages).slice(0, 50));
              openCardByKey(key, { item: it, sourcePage: sourcePage, index: (typeof it.__sourceIndex !== 'undefined' ? it.__sourceIndex : idx) });
            });
          }
        }, 0);
      });
    }
    pageEl.appendChild(grid);

    // If a pending item was requested (via hash restore), open it now and stop building further home-specific sections
    if (pendingOpenItem && pendingOpenItem.sourcePage === pageKey) {
      const p = pageData[pageKey];
      const idx = typeof pendingOpenItem.index !== 'undefined' ? pendingOpenItem.index : 0;
      const it = p && p.items && p.items[idx];
      pendingOpenItem = null;
      if (it) {
        // ensure nav shows the parent portfolio page
        navMainBtns.forEach(n => n.classList.toggle('active', n.dataset.page === pageKey));
        navSubitems.forEach(s => s.classList.remove('active'));
        const key = pageKey + '::' + idx;
        openCardByKey(key, { item: it, sourcePage: pageKey, index: idx });
        return;
      }
    }

    // --- Ticket System Functions ---
    function createTicket(serviceName, formData, userId) {
      const ticketId = 'TKT_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      const ticket = {
        id: ticketId,
        serviceName: serviceName,
        formData: formData,
        userId: userId,
        userName: localStorage.getItem('userName') || 'User',
        status: 'pending', // pending, in-progress, completed, cancelled
        priority: 'normal', // low, normal, high
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        messages: [], // Chat messages related to this ticket
        adminNotes: ''
      };

      // Save to localStorage
      const tickets = JSON.parse(localStorage.getItem('tekagon_tickets') || '{}');
      if (!tickets[userId]) tickets[userId] = {};
      tickets[userId][ticketId] = ticket;
      localStorage.setItem('tekagon_tickets', JSON.stringify(tickets));

      // Also add to all tickets list for admin
      const allTickets = JSON.parse(localStorage.getItem('tekagon_all_tickets') || '[]');
      allTickets.push({
        ticketId: ticketId,
        userId: userId,
        serviceName: serviceName,
        status: 'pending',
        createdAt: ticket.createdAt
      });
      localStorage.setItem('tekagon_all_tickets', JSON.stringify(allTickets));

      return ticket;
    }

    function getUserTickets(userId) {
      const tickets = JSON.parse(localStorage.getItem('tekagon_tickets') || '{}');
      return tickets[userId] || {};
    }

    function updateTicketStatus(ticketId, userId, newStatus) {
      const tickets = JSON.parse(localStorage.getItem('tekagon_tickets') || '{}');
      if (tickets[userId] && tickets[userId][ticketId]) {
        tickets[userId][ticketId].status = newStatus;
        tickets[userId][ticketId].updatedAt = new Date().toISOString();
        localStorage.setItem('tekagon_tickets', JSON.stringify(tickets));
        return true;
      }
      return false;
    }

    function addTicketMessage(ticketId, userId, message, sender) {
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
      return false;
    }

    // --- Custom Section (only for home page)
    if (pageKey === 'home') {
      const featureSection = document.createElement('div');
      featureSection.className = 'feature-section';
      featureSection.innerHTML = `
    <div class="feature-content">
      <div class="feature-image">
        <img src="../Images/abt (3).jfif" alt="Featured Project" />
      </div>
      <div class="feature-text">
        <h2 class="feature-title">INNOVATION BEYOND BOUNDARIES</h2>
        <div class="feature-profile">
          <img src="../Images/thumb_4.png" alt="Profile" class="profile-img">
          <span class="profile-name">Tekagon Tech Company</span>
        </div>
        <p class="feature-desc">
        At Tekagon, we fuse design, technology, and strategy to
         build brands that stand out. From identity creation to app development, we help 
         businesses grow, connect, and dominate their digital space.</p>
         <div class= 'feat-serv'>
         <p>ACTIVELY TAKING ORDERS</p>       
         <h2>0<span>2</span>.0<span>4</span>.0<span>7</span></h2>
         </div>
        <button class="feature-btn">Discover More</button>
      </div>
    </div>
  `;
      pageEl.appendChild(featureSection);
    }


    // === OUR VALUES SECTION (histogram) ===
    if (pageKey === 'home') {
      const ourValuesSection = document.createElement('section');
      ourValuesSection.className = 'our-values-section';
      ourValuesSection.innerHTML = `
  <div class="values-header">
    <h2>Our Values</h2>
  </div>
  <div class="values-grid">
    <div class="values-card chart-card">
      <h3>Tech Services Growth (historical)</h3>
      <canvas id="growthChartBar"></canvas>
    </div>
    <div class="values-card data-card">
      <h3>Tekagon Growth Metrics</h3>
      <table class="metrics-table">
        <thead>
          <tr><th>Service</th><th>Value</th><th>Year</th></tr>
        </thead>
        <tbody id="metricsBody"></tbody>
      </table>
    </div>
  </div>
`;
      pageEl.appendChild(ourValuesSection);




      // load Chart.js dynamically if not present
      if (!window.Chart) {
        const s = document.createElement('script');
        s.src = "https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js";
        s.onload = initGrowthBar;
        document.body.appendChild(s);
      } else {
        initGrowthBar();
      }

      function initGrowthBar() {
        // ensure canvas exists (we just appended it)
        const canvas = document.getElementById('growthChartBar');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        // create vertical gradient for bars (light-blue -> purple)
        // Create horizontal gradient (white → light-blue → purple)
        // Create a vertical gradient for each bar (white → #93fff6 → #6f65ff)
        function createBarGradient(ctx) {
          const gradient = ctx.createLinearGradient(0, 0, 0, ctx.canvas.height);
          gradient.addColorStop(0.8, 'rgba(161, 154, 255, 1)');  // purple bottom
          gradient.addColorStop(0.5, 'rgba(255, 255, 255, 1)');  // white top
          gradient.addColorStop(0.6, 'rgba(181, 255, 249, 1)'); // light blue mid

          return gradient;
        }

        const barGradient = createBarGradient(ctx);


        // base dataset (8 points)
        let barYears = [2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025];
        let barValues = [30, 45, 60, 75, 90, 120, 160, 210];

        // Chart config (bar)
        const config = {
          type: 'bar',
          data: {
            labels: barYears.slice(),
            datasets: [{
              label: 'Services growth',
              data: barValues.slice(),
              backgroundColor: barGradient,
              borderRadius: 8,
              barThickness: 'flex',
              maxBarThickness: 40,
              datasets: [{
                label: 'Services Growth',
                data: barValues.slice(),
                backgroundColor: barGradient,
                borderRadius: 8,
                barThickness: 'flex',
                maxBarThickness: 40
              }]

            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: { duration: 600 },
            plugins: {
              legend: { display: false },
              tooltip: {
                backgroundColor: 'rgba(18,18,24,0.95)',
                titleColor: '#fff',
                bodyColor: '#ddd',
                borderColor: 'rgba(255,255,255,0.04)',
                borderWidth: 1,
                shadowOffsetX: 0,
                shadowOffsetY: 0,
                shadowBlur: 1,
                shadowColor: 'rgba(0, 255, 255, 1)',

              }
            },
            scales: {
              x: {
                ticks: { color: '#cfcfe6' },
                grid: { display: false }
              },
              y: {
                beginAtZero: true,
                ticks: { color: '#cfcfe6' },
                grid: { color: 'rgba(255,255,255,0.04)' }
              }
            }
          }
        };

        // create chart instance (set canvas height so gradient works)
        canvas.style.height = '320px';
        const growthChartBar = new Chart(ctx, config);

        // sliding-forward simulation (every 2s push new value)
        const slideInterval = 2000;
        setInterval(() => {
          const nextYear = (barYears[barYears.length - 1] || new Date().getFullYear()) + 1;
          // generate next value with gentle upward trend + randomness
          const last = barValues[barValues.length - 1] || 100;
          const delta = Math.round(Math.random() * 30 - 5); // -5 .. +25
          const nextVal = Math.max(5, last + delta);

          barYears.push(nextYear);
          barValues.push(nextVal);

          // keep window length = 8
          if (barYears.length > 8) {
            barYears.shift();
            barValues.shift();
          }

          // update chart data & re-render
          growthChartBar.data.labels = barYears.slice();
          growthChartBar.data.datasets[0].data = barValues.slice();
          growthChartBar.data.datasets[0].backgroundColor = createBarGradient(ctx);
          growthChartBar.update();
        }, slideInterval);

        // populate metrics table
        const metrics = [
          { service: 'Cloud Integration', value: '+85%', year: 2024 },
          { service: 'Product Design', value: '+73%', year: 2024 },
          { service: 'AI Systems', value: '+92%', year: 2025 },
          { service: 'Customer Experience', value: '+67%', year: 2025 },
          { service: 'Product Design', value: '+73%', year: 2024 },
          { service: 'AI Systems', value: '+92%', year: 2025 },
          { service: 'Customer Experience', value: '+67%', year: 2025 },
          { service: 'Product Design', value: '+73%', year: 2024 },
          { service: 'AI Systems', value: '+92%', year: 2025 },
          { service: 'Customer Experience', value: '+67%', year: 2025 },
        ];
        const metricsBody = document.getElementById('metricsBody');
        metricsBody.innerHTML = ''; // clear
        metrics.forEach(m => {
          const tr = document.createElement('tr');
          tr.innerHTML = `<td>${m.service}</td><td>${m.value}</td><td>${m.year}</td>`;
          metricsBody.appendChild(tr);
        });
      }
    }


    if (pageKey === 'home') {
      const softSection = document.createElement('div');
      softSection.className = 'soft-section';
      softSection.innerHTML = `
    <div class="soft-content">
     
      <div class="soft-text">
        <h2 class="soft-title">Software and Languages of Specialty and Stack</h2>
       <div class="soft-icons">
       <div class='ph'>
       <span class="iconify" data-icon="simple-icons:adobephotoshop"></span><h5>Photoshop</h5></div>
       <div class='ill'>
       <span class="iconify" data-icon="simple-icons:adobeillustrator"></span><h5>Illustrator</h5></div>
       <div class='xd'>
       <span class="iconify" data-icon="simple-icons:adobexd"></span><h5>Adobe XD</h5></div>
       <div class='fig'>
        <span class="iconify" data-icon="simple-icons:figma"></span><h5>Figma</h5></div>
      
       <div class='dav'>
       <span class="iconify" data-icon="simple-icons:davinciresolve"></span><h5>DaVinci Resolve</h5></div>
        <div class='ind'>
        <span class="iconify" data-icon="simple-icons:adobeindesign"></span><h5>Adobe InDesign</h5></div>
         <div class='pre'>
       <span class="iconify" data-icon="simple-icons:adobepremierepro"></span><h5>Adobe Premiere Pro</h5></div>
       </div>

       <div class="soft-icons">
       <div class='py'>
       <span class="iconify" data-icon="simple-icons:python"></span><h5>Python</h5></div>
       <div class='jv'>
       <span class="iconify" data-icon="simple-icons:javascript"></span><h5>JavaScript</h5></div>
       <div class='rt'>
       <span class="iconify" data-icon="simple-icons:react"></span><h5>React & Native</h5></div>
       <div class='nx'>
       <span class="iconify" data-icon="simple-icons:nextdotjs"></span><h5>Next.js</h5></div>
       <div class='fl'>
       <span class="iconify" data-icon="simple-icons:flutter"></span><h5>Flutter</h5></div>
        <div class='dt'>
        <span class="iconify" data-icon="simple-icons:dart"></span><h5>Dart</h5></div>
        <div class='cp'>
        <span class="iconify" data-icon="simple-icons:cplusplus"></span>
        <h5>C++</h5></div>
        <div class='cs'>
        <span class="iconify" data-icon="simple-icons:csharp"></span>
        <h5>C#</h5></div>
        <div class='ja'>
        <span class="iconify" data-icon="simple-icons:java"></span>
        <h5>Java</h5></div>
        <div class='tp'>
        <span class="iconify" data-icon="simple-icons:typescript"></span>
        <h5>TypeScript</h5></div>
        <div class='nd'>
        <span class="iconify" data-icon="simple-icons:nodedotjs"></span>
        <h5>Node.js</h5></div>
         <div class='ex'>
        <span class="iconify" data-icon="simple-icons:express"></span>
        <h5>Express.js</h5></div>
         <div class='am'>
        <span class="iconify" data-icon="simple-icons:amazonaws"></span>
        <h5>AWS</h5></div>
         <div class='fb'>
        <span class="iconify" data-icon="simple-icons:firebase"></span>
        <h5>Firebase</h5></div>
          <div class='dk'>
        <span class="iconify" data-icon="simple-icons:docker"></span>
        <h5>Docker</h5></div>
          <div class='gt'>
        <span class="iconify" data-icon="simple-icons:git"></span>
        <h5>Git</h5></div>
        <div class='kb'>
        <span class="iconify" data-icon="simple-icons:kubernetes"></span>
        <h5>Kubernetes</h5></div>
        <div class='ln'>
        <span class="iconify" data-icon="simple-icons:linux"></span>
        <h5>Linux</h5></div>
         <div class='kt'>
        <span class="iconify" data-icon="simple-icons:kotlin"></span>
        <h5>Kotlin</h5></div>
         <div class='php'>
        <span class="iconify" data-icon="simple-icons:php"></span>
        <h5>PHP</h5></div>
       </div>
      </div>
       </div>  `;
      pageEl.appendChild(softSection);
    }


    //business section
    if (pageKey === 'home') {
      if (pageKey === 'home') {
        const featureSection = document.createElement('div');
        featureSection.className = 'business-section';
        featureSection.innerHTML = `
  <div class="business-top">
      <div class="ai-header">
        <h5 class="ai-tagline">Building AI solutions</h5>
        <h2 class="ai-title">Business Growth With <br><span>Tekagon Excellence</span></h2>
        <p class="ai-subtext">
          Empowering Tekagon to achieve scalable innovation through<br> intelligent systems, automation, and deep insights.
        </p>
      </div>
  </div>
    <div class="business-content">
      <div class="business-image">
<video autoplay loop muted playsinline class="bg-video">
  <source src="../Images/animated shape.mp4" type="video/mp4">
  Your browser does not support the video tag.
</video>

      </div>      
      <div class="business-text">
        <div class="strategy-grid">
    <div class="strategy-box">
      <div class="icon">
        <i data-feather="cpu"></i>
      </div>
      <h3>Digital Transformation</h3>
      <p>Reinvent operations through automation, data, and digital systems.</p>
    </div>

    <div class="strategy-box">
      <div class="icon">
        <i data-feather="activity"></i>
      </div>
      <h3>AI-Driven Decisions</h3>
      <p>Empower growth with predictive intelligence and smart analytics.</p>
    </div>

    <div class="strategy-box" data-box="creative">
      <div class="icon">
        <i data-feather="layout"></i>
      </div>
      <h3>Creative Design & UX</h3>
      <p class="strategy-text" style="opacity: 1 !important; visibility: visible !important; display: block !important;">Shape experiences that merge technology, design, and storytelling.</p>
    </div>

    <div class="strategy-box" data-box="integration">
      <div class="icon">
        <i data-feather="cloud"></i>
      </div>
      <h3>Smart Integration</h3>
      <p class="strategy-text" style="opacity: 1 !important; visibility: visible !important; display: block !important;">Connect systems seamlessly — from cloud to customer.</p>
    </div>
  </div>
         
      </div>
    </div>
  `;
        pageEl.appendChild(featureSection);
      }
    }

    const homeFooter = document.createElement('footer');
    homeFooter.className = 'service-footer';
    homeFooter.innerHTML = `
      <div class="footer-grid">
        <div class="footer-col">
          <h4>Company</h4>
          <ul>
            <li><a href="#">About Us</a></li>
            <li><a href="#">Careers</a></li>
            <li><a href="#">Contact</a></li>
            <li><a href="#">Blog</a></li>
          </ul>
        </div>
        <div class="footer-col">
          <h4>Services</h4>
          <ul>
            <li><a href="#">Web Development</a></li>
            <li><a href="#">Digital Marketing</a></li>
            <li><a href="#">Brand Design</a></li>
            <li><a href="#">SEO Services</a></li>
          </ul>
        </div>
        <div class="footer-col">
          <h4>Support</h4>
          <ul>
            <li><a href="#">Help Center</a></li>
            <li><a href="#">Documentation</a></li>
            <li><a href="#">API Status</a></li>
            <li><a href="#">Live Chat</a></li>
          </ul>
        </div>
        <div class="footer-col">
          <h4>Legal</h4>
          <ul>
            <li><a href="#">Privacy Policy</a></li>
            <li><a href="#">Terms of Service</a></li>
            <li><a href="#">Cookie Policy</a></li>
            <li><a href="#">GDPR</a></li>
          </ul>
        </div>
      </div>
      <div class="footer-status">
        <div class="status-text">
          <span class="status-indicator"></span>
          <span>All systems operational</span>
        </div>
        <div class="status-time" id="status-time-home"></div>
      </div>
  `;
    pageEl.appendChild(homeFooter);


    // --- Custom Service content (dynamically appended) ---
    if (pageKey === 'service') {
      pageEl.innerHTML = `
    <section class="service-hero">
      <div class="service-hero-content">
        <div class="hero-tag"> <span class="hero-txt">What's new?</span> <span>Instantly Order for A Service →</span></div>
        <h1>The Evolution of <br><span>Digital Services.</span></h1>
        <p>Bringing trust, speed, and security to crypto.</p>
        <div class="hero-buttons">
         
          <button class="btn-hero">Contact Us</button>
        </div>
      </div>
    </section>
  `;
    }


    if (pageKey === 'service') {
      // remove existing service-specific area if present (prevents duplicates when navigating)
      const existing = pageEl.querySelector('.service-extra-section');
      if (existing) existing.remove();

      const serviceSection = document.createElement('div');
      serviceSection.className = 'service-extra-section';
      serviceSection.innerHTML = `
    <div class="Graphic"><h1>Graphic Design</h1>
  <div class="Graphic-btn">
  <button class="gr-btn" data-key="Brand Identity">Brand Identity</button>
  <button class="gr-btn" data-key="UI/UX">UI/UX</button>
  <button class="gr-btn" data-key="Motion Graphics">Motion Graphics</button>
  <button class="gr-btn" data-key="Product Design">Product Design</button>
  </div>
    </div>
    <div class="pricing-section">
   
      <div class="pricing-container">
     
        <!-- Turquoise Trek Card -->
        <div class="pricing-card turquoise">
          <div class="card-header">
            <div class="card-icon">
             <img src="../Images/servcard-turk.png" alt="">
            </div>
            <h3>Turquoise Trek</h3>
            <p>Seamless Web to Integration, Decentralized applications</p>
          </div>
          <div class="card-price">
            <h2>$4,200<span class="price-duration">/month</span></h2>
          </div>
          <button class="btn-outline">Choose this plan</button>
          <ul class="card-features">
            <li><i class="feat-icon" data-feather="users"></i> <span class="feat-text">Unlimited seats available</span> </li>
            <li><i class="feat-icon" data-feather="hard-drive"></i> <span class="feat-text"> 1TB+ of cloud storage</span></li>
            <li><i class="feat-icon" data-feather="database"></i> <span class="feat-text">Own your data</span> </li>
            <li><i class="feat-icon" data-feather="shield"></i> <span class="feat-text">Censorship-resistant</span> </li>
            <li><i class="feat-icon" data-feather="share-2"></i> <span class="feat-text">Decentralized social media</span> </li>
          </ul>
          
        </div>

        <!-- Purple Lift Card - Most Popular -->
        <div class="pricing-card purple">
          <span class="popular-tag">Most popular</span>
          <div class="card-header">
            <div class="card-icon">
              <img src="../Images/servcard-pup.png" alt="">
            </div>
            <h3>Purple Lift</h3>
            <p>Supercharged crypto tools, Personalized guidance, Market insights</p>
          </div>
          <div class="card-price">
            <h2>$10,500<span class="price-duration">/month</span></h2>
          </div>
          <button class="btn-solid">Choose this plan</button>
          <ul class="card-features">
            <li><i class="feat-icon" data-feather="users"></i> <span class="feat-text">Unlimited seats available</span> </li>
            <li><i class="feat-icon" data-feather="hard-drive"></i> <span class="feat-text"> 1TB+ of cloud storage</span></li>
            <li><i class="feat-icon" data-feather="database"></i> <span class="feat-text">Own your data</span> </li>
            <li><i class="feat-icon" data-feather="shield"></i> <span class="feat-text">Censorship-resistant</span> </li>
            <li><i class="feat-icon" data-feather="share-2"></i> <span class="feat-text">Decentralized social media</span> </li>
          </ul>
          
        </div>

        <!-- Off-white Card -->
        <div class="pricing-card offwhite">
          <div class="card-header">
            <div class="card-icon">
           <img src="../Images/servcard-brown.png" alt="">
            </div>
            <h3>Off-white</h3>
            <p>Own your data, Censorship-resistant, Decentralized social media</p>
          </div>
          <div class="card-price">
            <h2>$300<span class="price-duration">/month</span></h2>
          </div>
                    <button class="btn-outline">Contact us</button>
          <ul class="card-features">
            <li><i class="feat-icon" data-feather="users"></i> <span class="feat-text">Unlimited seats available</span> </li>
            <li><i class="feat-icon" data-feather="hard-drive"></i> <span class="feat-text"> 1TB+ of cloud storage</span></li>
            <li><i class="feat-icon" data-feather="database"></i> <span class="feat-text">Own your data</span> </li>
            <li><i class="feat-icon" data-feather="shield"></i> <span class="feat-text">Censorship-resistant</span> </li>
            <li><i class="feat-icon" data-feather="share-2"></i> <span class="feat-text">Decentralized social media</span> </li>
          </ul>

        </div>
      </div>
    </div>

    


    <div class="Graphic"><h1>Coding Services</h1>
  <div class="Graphic-btn">
  <button class="gr-btn" data-key="Web/App">Web/App</button>
  <button class="gr-btn" data-key="Digital Foundation">Digital Foundation</button>
  <button class="gr-btn" data-key="System Connection">System Connection</button>
  <button class="gr-btn" data-key="Management Services">Management Services</button>
    
  </div>
    <div class="pricing-section">
   
      <div class="pricing-container">
     
        <!-- Turquoise Trek Card -->
     
      </div>
    </div>


  <section class="serviceContact">
      <div class="serviceContactContent">
        <div class="ft-tag"> <span>Instantly Order for A Service →</span></div>
        <h1>Contact US For Specified Services</span></h1>
        <p>can't find the services you are looking for?, contact us for with detailed specification</p>
        <div class="service-buttons">
         
          <button class="btn-service">Tekagon Admin</button>
        </div>
      </div>
      <div>
     <img src="../Images/setb (2)-assets/servCont.png" alt="">
      </div>
    </section>


    <footer class="service-footer">
      <div class="footer-grid">
        <div class="footer-col">
          <h4>Company</h4>
          <ul>
            <li><a href="#">About Us</a></li>
            <li><a href="#">Careers</a></li>
            <li><a href="#">Contact</a></li>
            <li><a href="#">Blog</a></li>
          </ul>
        </div>
        <div class="footer-col">
          <h4>Services</h4>
          <ul>
            <li><a href="#">Web Development</a></li>
            <li><a href="#">Digital Marketing</a></li>
            <li><a href="#">Brand Design</a></li>
            <li><a href="#">SEO Services</a></li>
          </ul>
        </div>
        <div class="footer-col">
          <h4>Support</h4>
          <ul>
            <li><a href="#">Help Center</a></li>
            <li><a href="#">Documentation</a></li>
            <li><a href="#">API Status</a></li>
            <li><a href="#">Live Chat</a></li>
          </ul>
        </div>
        <div class="footer-col">
          <h4>Legal</h4>
          <ul>
            <li><a href="#">Privacy Policy</a></li>
            <li><a href="#">Terms of Service</a></li>
            <li><a href="#">Cookie Policy</a></li>
            <li><a href="#">GDPR</a></li>
          </ul>
        </div>
      </div>
      <div class="footer-status">
        <div class="status-text">
          <span class="status-indicator"></span>
          <span>All systems operational</span>
        </div>
        <div class="status-time" id="status-time"></div>
      </div>
    </footer>
     
    </section>  
  `;


      // append the new section to pageEl (after any existing content)
      pageEl.appendChild(serviceSection);

      // replace feather icons inside the newly added section
      if (window.feather) feather.replace();

      // --- Service card data map (edit this object to change card content per button)
      const serviceCardSets = {
        /* Graphic Design buttons */
        'Brand Identity': [
          {
            title: 'Full Branding',
            desc: 'Seamless Web to Integration, Decentralized applications',
            price: '$4,200',
            duration: '/month',
            theme: 'turquoise',
            img: '../Images/servcard-turk.png',
            btnText: 'Choose this plan',
            btnType: 'outline',
            features: ['Unlimited seats available', '1TB+ of cloud storage', 'Own your data']
          },
          {
            title: 'Purple Lift',
            desc: 'Supercharged crypto tools, Personalized guidance, Market insights',
            price: '$10,500',
            duration: '/month',
            theme: 'purple',
            img: '../Images/servcard-pup.png',
            btnText: 'Choose this plan',
            btnType: 'solid',
            features: ['Unlimited seats available', '1TB+ of cloud storage', 'Censorship-resistant']
          },
          {
            title: 'E-marketing design',
            desc: 'Own your data, Censorship-resistant, Decentralized social media',
            price: '$300',
            duration: '/month',
            theme: 'offwhite',
            img: '../Images/servcard-brown.png',
            btnText: 'Contact us',
            btnType: 'outline',
            features: ['Unlimited seats available', '1TB+ of cloud storage', 'Own your data']
          }
        ],

        //for ui/ux list

        'UI/UX': [
          {
            title: 'Mobile App UI',
            desc: 'Seamless Web to Integration, Decentralized applications',
            price: '$4,200',
            duration: '/month',
            theme: 'turquoise',
            img: '../Images/servcard-turk.png',
            btnText: 'Choose this plan',
            btnType: 'outline',
            features: ['Unlimited seats available', '1TB+ of cloud storage', 'Own your data']
          },
          {
            title: 'Web UI',
            desc: 'Supercharged crypto tools, Personalized guidance, Market insights',
            price: '$10,500',
            duration: '/month',
            theme: 'purple',
            img: '../Images/servcard-pup.png',
            btnText: 'Choose this plan',
            btnType: 'solid',
            features: ['Unlimited seats available', '1TB+ of cloud storage', 'Censorship-resistant']
          },
          {
            title: 'Off-white',
            desc: 'Own your data, Censorship-resistant, Decentralized social media',
            price: '$300',
            duration: '/month',
            theme: 'offwhite',
            img: '../Images/servcard-brown.png',
            btnText: 'Contact us',
            btnType: 'outline',
            features: ['Unlimited seats available', '1TB+ of cloud storage', 'Own your data']
          }
        ],


        // fallback to 'Brand Identity' if null
        'Motion Graphics': [
          {
            title: 'E-market Ads',
            desc: 'Seamless Web to Integration, Decentralized applications',
            price: '$4,200',
            duration: '/month',
            theme: 'turquoise',
            img: '../Images/servcard-turk.png',
            btnText: 'Choose this plan',
            btnType: 'outline',
            features: ['Unlimited seats available', '1TB+ of cloud storage', 'Own your data']
          },
          {
            title: 'Prototype product',
            desc: 'Supercharged crypto tools, Personalized guidance, Market insights',
            price: '$10,500',
            duration: '/month',
            theme: 'purple',
            img: '../Images/servcard-pup.png',
            btnText: 'Choose this plan',
            btnType: 'solid',
            features: ['Unlimited seats available', '1TB+ of cloud storage', 'Censorship-resistant']
          },
          {
            title: 'Off-white',
            desc: 'Own your data, Censorship-resistant, Decentralized social media',
            price: '$300',
            duration: '/month',
            theme: 'offwhite',
            img: '../Images/servcard-brown.png',
            btnText: 'Contact us',
            btnType: 'outline',
            features: ['Unlimited seats available', '1TB+ of cloud storage', 'Own your data']
          }
        ],
        'Product Design': [
          {
            title: 'Product Protype',
            desc: 'Seamless Web to Integration, Decentralized applications',
            price: '$4,200',
            duration: '/month',
            theme: 'turquoise',
            img: '../Images/servcard-turk.png',
            btnText: 'Choose this plan',
            btnType: 'outline',
            features: ['Unlimited seats available', '1TB+ of cloud storage', 'Own your data']
          },
          {
            title: 'Purple Lift',
            desc: 'Supercharged crypto tools, Personalized guidance, Market insights',
            price: '$10,500',
            duration: '/month',
            theme: 'purple',
            img: '../Images/servcard-pup.png',
            btnText: 'Choose this plan',
            btnType: 'solid',
            features: ['Unlimited seats available', '1TB+ of cloud storage', 'Censorship-resistant']
          },
          {
            title: 'Off-white',
            desc: 'Own your data, Censorship-resistant, Decentralized social media',
            price: '$300',
            duration: '/month',
            theme: 'offwhite',
            img: '../Images/servcard-brown.png',
            btnText: 'Contact us',
            btnType: 'outline',
            features: ['Unlimited seats available', '1TB+ of cloud storage', 'Own your data']
          }
        ],

        /* Coding Services buttons */
        'Web/App': [
          {
            title: 'Web Application Development',
            desc: 'Seamless Web to Integration, Decentralized applications',
            price: '$4,200',
            duration: '/month',
            theme: 'turquoise',
            img: '../Images/servcard-turk.png',
            btnText: 'Choose this plan',
            btnType: 'outline',
            features: ['Unlimited seats available', '1TB+ of cloud storage', 'Own your data']
          },
          {
            title: 'Mobile App Development',
            desc: 'Supercharged crypto tools, Personalized guidance, Market insights',
            price: '$10,500',
            duration: '/month',
            theme: 'purple',
            img: '../Images/servcard-pup.png',
            btnText: 'Choose this plan',
            btnType: 'solid',
            features: ['Unlimited seats available', '1TB+ of cloud storage', 'Censorship-resistant']
          },
          {
            title: 'Desktop Application',
            desc: 'Own your data, Censorship-resistant, Decentralized social media',
            price: '$300',
            duration: '/month',
            theme: 'offwhite',
            img: '../Images/servcard-brown.png',
            btnText: 'Contact us',
            btnType: 'outline',
            features: ['Unlimited seats available', '1TB+ of cloud storage', 'Own your data']
          }
        ],


        'Digital Foundation': [
          {
            title: 'Mobile UI',
            desc: 'Seamless Web to Integration, Decentralized applications',
            price: '$4,200',
            duration: '/month',
            theme: 'turquoise',
            img: '../Images/servcard-turk.png',
            btnText: 'Choose this plan',
            btnType: 'outline',
            features: ['Unlimited seats available', '1TB+ of cloud storage', 'Own your data']
          },
          {
            title: 'Purple',
            desc: 'Supercharged crypto tools, Personalized guidance, Market insights',
            price: '$10,500',
            duration: '/month',
            theme: 'purple',
            img: '../Images/servcard-pup.png',
            btnText: 'Choose this plan',
            btnType: 'solid',
            features: ['Unlimited seats available', '1TB+ of cloud storage', 'Censorship-resistant']
          },
          {
            title: 'white',
            desc: 'Own your data, Censorship-resistant, Decentralized social media',
            price: '$300',
            duration: '/month',
            theme: 'offwhite',
            img: '../Images/servcard-brown.png',
            btnText: 'Contact us',
            btnType: 'outline',
            features: ['Unlimited seats available', '1TB+ of cloud storage', 'Own your data']
          }
        ],


        'System Connection': [
          {
            title: ' Integration',
            desc: 'Seamless Web to Integration, Decentralized applications',
            price: '$4,200',
            duration: '/month',
            theme: 'turquoise',
            img: '../Images/servcard-turk.png',
            btnText: 'Choose this plan',
            btnType: 'outline',
            features: ['Unlimited seats available', '1TB+ of cloud storage', 'Own your data']
          },
          {
            title: ' Native Development',
            desc: 'Supercharged crypto tools, Personalized guidance, Market insights',
            price: '$10,500',
            duration: '/month',
            theme: 'purple',
            img: '../Images/servcard-pup.png',
            btnText: 'Choose this plan',
            btnType: 'solid',
            features: ['Unlimited seats available', '1TB+ of cloud storage', 'Censorship-resistant']
          },
          {
            title: ' Development & Integration',
            desc: 'Own your data, Censorship-resistant, Decentralized social media',
            price: '$300',
            duration: '/month',
            theme: 'offwhite',
            img: '../Images/servcard-brown.png',
            btnText: 'Contact us',
            btnType: 'outline',
            features: ['Unlimited seats available', '1TB+ of cloud storage', 'Own your data']
          }
        ],

        'Management Services': [
          {
            title: 'Code Base Banagement',
            desc: 'Seamless Web to Integration, Decentralized applications',
            price: '$4,200',
            duration: '/month',
            theme: 'turquoise',
            img: '../Images/servcard-turk.png',
            btnText: 'Choose this plan',
            btnType: 'outline',
            features: ['Unlimited seats available', '1TB+ of cloud storage', 'Own your data']
          },
          {
            title: 'SEO Optimization',
            desc: 'Supercharged crypto tools, Personalized guidance, Market insights',
            price: '$10,500',
            duration: '/month',
            theme: 'purple',
            img: '../Images/servcard-pup.png',
            btnText: 'Choose this plan',
            btnType: 'solid',
            features: ['Unlimited seats available', '1TB+ of cloud storage', 'Censorship-resistant']
          },
          {
            title: 'Debugging and Code Refubbsihing',
            desc: 'Own your data, Censorship-resistant, Decentralized social media',
            price: '$300',
            duration: '/month',
            theme: 'offwhite',
            img: '../Images/servcard-brown.png',
            btnText: 'Contact us',
            btnType: 'outline',
            features: ['Unlimited seats available', '1TB+ of cloud storage', 'Own your data']
          }
        ]

      };




      // Helper: create a pricing card DOM element from data
      // Add this to your dashboard.js after line with "// Helper: create a pricing card DOM element"
      // Or add it as a new function in the service page section

      // ========== PLAN SELECTION & CHECKOUT SYSTEM ==========

      // 1. Plan Data Storage
      const planData = {
        // Graphic Design Plans
        'brand-identity-full': {
          id: 'brand-identity-full',
          title: 'Full Branding',
          category: 'Graphic Design',
          subcategory: 'Brand Identity',
          price: 4200,
          currency: '$',
          period: 'month',
          features: [
            'Logo design & variations',
            'Brand style guide',
            'Business card design',
            'Social media kit',
            'Unlimited revisions',
            'Source files delivery'
          ],
          popular: false,
          description: 'Complete brand identity package including all essential assets',
          deliveryTime: '14-21 days'
        },

        'uiux-mobile-app': {
          id: 'uiux-mobile-app',
          title: 'Mobile App UI',
          category: 'Graphic Design',
          subcategory: 'UI/UX',
          price: 4200,
          currency: '$',
          period: 'month',
          features: [
            'UI/UX design for mobile app',
            'Wireframing & prototyping',
            'Design system',
            'User testing included',
            'Developer handoff',
            '3 months support'
          ],
          popular: false,
          description: 'Professional mobile app UI/UX design with user testing',
          deliveryTime: '3-4 weeks'
        },

        'purple-lift-popular': {
          id: 'purple-lift-popular',
          title: 'Purple Lift',
          category: 'Graphic Design',
          subcategory: 'Brand Identity',
          price: 10500,
          currency: '$',
          period: 'month',
          features: [
            'Everything in Full Branding',
            'Animated logo variations',
            'Brand video intro',
            'Website design',
            'Priority support',
            'Dedicated project manager'
          ],
          popular: true,
          description: 'Premium branding package with animation and priority support',
          deliveryTime: '21-28 days'
        },

        // Coding Services Plans
        'web-app-dev': {
          id: 'web-app-dev',
          title: 'Web Application Development',
          category: 'Coding Services',
          subcategory: 'Web/App',
          price: 4200,
          currency: '$',
          period: 'month',
          features: [
            'Custom web application',
            'Responsive design',
            'Admin dashboard',
            'API integration',
            '3 months maintenance',
            'Deployment support'
          ],
          popular: false,
          description: 'Full-stack web application development',
          deliveryTime: '6-8 weeks'
        },

        'mobile-app-dev': {
          id: 'mobile-app-dev',
          title: 'Mobile App Development',
          category: 'Coding Services',
          subcategory: 'Web/App',
          price: 10500,
          currency: '$',
          period: 'month',
          features: [
            'iOS & Android app',
            'Cross-platform (React Native)',
            'Backend API',
            'App store submission',
            '6 months maintenance',
            'Analytics integration'
          ],
          popular: true,
          description: 'Cross-platform mobile app development',
          deliveryTime: '8-10 weeks'
        },

        // Add more plans as needed...
      };

      // 2. Shopping Cart System
      const shoppingCart = {
        items: [],
        subtotal: 0,
        tax: 0,
        total: 0,

        addItem(planId, quantity = 1) {
          const plan = planData[planId];
          if (!plan) return false;

          // Check if already in cart
          const existingIndex = this.items.findIndex(item => item.planId === planId);

          if (existingIndex > -1) {
            this.items[existingIndex].quantity += quantity;
          } else {
            this.items.push({
              planId,
              quantity,
              ...plan
            });
          }

          this.calculateTotals();
          this.saveToStorage();
          this.updateCartUI();
          return true;
        },

        removeItem(planId) {
          this.items = this.items.filter(item => item.planId !== planId);
          this.calculateTotals();
          this.saveToStorage();
          this.updateCartUI();
        },

        updateQuantity(planId, quantity) {
          const item = this.items.find(item => item.planId === planId);
          if (item) {
            item.quantity = quantity;
            if (quantity <= 0) {
              this.removeItem(planId);
            } else {
              this.calculateTotals();
              this.saveToStorage();
              this.updateCartUI();
            }
          }
        },

        calculateTotals() {
          this.subtotal = this.items.reduce((sum, item) =>
            sum + (item.price * item.quantity), 0);
          this.tax = this.subtotal * 0.1; // 10% tax example
          this.total = this.subtotal + this.tax;
        },

        clearCart() {
          this.items = [];
          this.calculateTotals();
          this.saveToStorage();
          this.updateCartUI();
        },

        saveToStorage() {
          localStorage.setItem('tekagon_cart', JSON.stringify(this.items));
          localStorage.setItem('tekagon_cart_totals', JSON.stringify({
            subtotal: this.subtotal,
            tax: this.tax,
            total: this.total
          }));
        },

        loadFromStorage() {
          const savedItems = localStorage.getItem('tekagon_cart');
          const savedTotals = localStorage.getItem('tekagon_cart_totals');

          if (savedItems) {
            this.items = JSON.parse(savedItems);
          }

          if (savedTotals) {
            const totals = JSON.parse(savedTotals);
            this.subtotal = totals.subtotal || 0;
            this.tax = totals.tax || 0;
            this.total = totals.total || 0;
          } else {
            this.calculateTotals();
          }

          this.updateCartUI();
        },

        updateCartUI() {
          // Create or update cart UI
          const cartCount = this.items.reduce((sum, item) => sum + item.quantity, 0);

          // Update cart badge
          let cartBadge = document.getElementById('cartBadge');
          if (!cartBadge) {
            cartBadge = document.createElement('div');
            cartBadge.id = 'cartBadge';
            cartBadge.style.cssText = `
        position: absolute;
        top: -8px;
        right: -8px;
        background: #ef4444;
        color: white;
        font-size: 12px;
        font-weight: bold;
        width: 20px;
        height: 20px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
      `;

            const notifBtn = document.getElementById('notifBtn');
            if (notifBtn) {
              notifBtn.style.position = 'relative';
              notifBtn.appendChild(cartBadge);
            }
          }

          cartBadge.textContent = cartCount;
          cartBadge.style.display = cartCount > 0 ? 'flex' : 'none';
        }
      };

      // 3. Plan Selection Modal
      function showPlanDetailsModal(planId) {
        const plan = planData[planId];
        if (!plan) return;

        const modalHTML = `
    <div class="plan-modal-overlay" id="planModalOverlay">
      <div class="plan-modal">
        <div class="modal-header">
          <h3>${plan.title}</h3>
          <button class="modal-close" onclick="closePlanModal()">×</button>
        </div>
        
        <div class="modal-body">
          <div class="plan-price-section">
            <div class="price-display">
              <span class="currency">${plan.currency}</span>
              <span class="amount">${plan.price.toLocaleString()}</span>
              <span class="period">/${plan.period}</span>
            </div>
            ${plan.popular ? '<span class="popular-badge">Most Popular</span>' : ''}
          </div>
          
          <div class="plan-category">
            <span class="category-badge">${plan.category}</span>
            <span class="subcategory-badge">${plan.subcategory}</span>
          </div>
          
          <p class="plan-description">${plan.description}</p>
          
          <div class="delivery-info">
            <i class="fas fa-clock"></i>
            <span>Estimated delivery: <strong>${plan.deliveryTime}</strong></span>
          </div>
          
          <div class="features-list">
            <h4>What's included:</h4>
            <ul>
              ${plan.features.map(feature => `
                <li>
                  <i class="fas fa-check-circle"></i>
                  <span>${feature}</span>
                </li>
              `).join('')}
            </ul>
          </div>
          
          <div class="quantity-selector">
            <label for="planQuantity">Quantity:</label>
            <div class="quantity-controls">
              <button class="qty-btn" onclick="adjustQuantity(-1)">−</button>
              <input type="number" id="planQuantity" value="1" min="1" max="10">
              <button class="qty-btn" onclick="adjustQuantity(1)">+</button>
            </div>
          </div>
        </div>
        
        <div class="modal-footer">
          <button class="btn-secondary" onclick="closePlanModal()">
            <i class="fas fa-times"></i> Cancel
          </button>
          <button class="btn-primary" onclick="addToCart('${plan.id}')">
            <i class="fas fa-cart-plus"></i> Add to Cart - ${plan.currency}${plan.price}
          </button>
        </div>
      </div>
    </div>
  `;

        // Remove existing modal
        const existingModal = document.getElementById('planModalOverlay');
        if (existingModal) existingModal.remove();

        // Add new modal
        document.body.insertAdjacentHTML('beforeend', modalHTML);

        // Add styles if not present
        addPlanModalStyles();
      }

      // 4. Add to Cart Function
      function addToCart(planId) {
        const quantityInput = document.getElementById('planQuantity');
        const quantity = quantityInput ? parseInt(quantityInput.value) || 1 : 1;

        const success = shoppingCart.addItem(planId, quantity);

        if (success) {
          showNotification('Added to cart!', 'success');
          closePlanModal();

          // Show cart summary
          setTimeout(() => {
            showCartSummary();
          }, 500);
        } else {
          showNotification('Failed to add item', 'error');
        }
      }

      // 5. Cart Summary/Checkout Modal
      function showCartSummary() {
        if (shoppingCart.items.length === 0) {
          showNotification('Your cart is empty', 'info');
          return;
        }

        const cartHTML = `
    <div class="cart-modal-overlay" id="cartModalOverlay">
      <div class="cart-modal">
        <div class="modal-header">
          <h3>Your Cart (${shoppingCart.items.length} items)</h3>
          <button class="modal-close" onclick="closeCartModal()">×</button>
        </div>
        
        <div class="modal-body">
          <div class="cart-items">
            ${shoppingCart.items.map(item => `
              <div class="cart-item" data-plan-id="${item.planId}">
                <div class="item-info">
                  <h4>${item.title}</h4>
                  <div class="item-details">
                    <span class="item-category">${item.category} • ${item.subcategory}</span>
                    <span class="item-price">${item.currency}${item.price}/${item.period}</span>
                  </div>
                </div>
                
                <div class="item-controls">
                  <div class="quantity-controls">
                    <button class="qty-btn" onclick="updateCartQuantity('${item.planId}', ${item.quantity - 1})">−</button>
                    <span class="qty-display">${item.quantity}</span>
                    <button class="qty-btn" onclick="updateCartQuantity('${item.planId}', ${item.quantity + 1})">+</button>
                  </div>
                  <button class="remove-btn" onclick="removeFromCart('${item.planId}')">
                    <i class="fas fa-trash"></i>
                  </button>
                </div>
                
                <div class="item-total">
                  ${item.currency}${(item.price * item.quantity).toLocaleString()}
                </div>
              </div>
            `).join('')}
          </div>
          
          <div class="cart-summary">
            <div class="summary-row">
              <span>Subtotal</span>
              <span>$${shoppingCart.subtotal.toLocaleString()}</span>
            </div>
            <div class="summary-row">
              <span>Tax (10%)</span>
              <span>$${shoppingCart.tax.toLocaleString()}</span>
            </div>
            <div class="summary-row total">
              <span>Total</span>
              <span>$${shoppingCart.total.toLocaleString()}</span>
            </div>
          </div>
        </div>
        
        <div class="modal-footer">
          <button class="btn-secondary" onclick="closeCartModal()">
            Continue Shopping
          </button>
          <button class="btn-primary" onclick="proceedToCheckout()">
            <i class="fas fa-lock"></i> Proceed to Checkout
          </button>
        </div>
      </div>
    </div>
  `;

        // Remove existing modal
        const existingCart = document.getElementById('cartModalOverlay');
        if (existingCart) existingCart.remove();

        // Add new modal
        document.body.insertAdjacentHTML('beforeend', cartHTML);

        // Add cart modal styles
        addCartModalStyles();
      }

      // 6. Checkout Function
      function proceedToCheckout() {
        closeCartModal();

        // Create checkout form
        const checkoutHTML = `
    <div class="checkout-modal-overlay" id="checkoutModalOverlay">
      <div class="checkout-modal">
        <div class="modal-header">
          <h3>Complete Your Purchase</h3>
          <button class="modal-close" onclick="closeCheckoutModal()">×</button>
        </div>
        
        <form id="checkoutForm" class="modal-body">
          <div class="checkout-grid">
            <div class="checkout-form">
              <h4>Contact Information</h4>
              
              <div class="form-group">
                <label>Full Name *</label>
                <input type="text" name="name" required placeholder="John Doe">
              </div>
              
              <div class="form-group">
                <label>Email Address *</label>
                <input type="email" name="email" required placeholder="john@company.com">
              </div>
              
              <div class="form-group">
                <label>Phone Number *</label>
                <input type="tel" name="phone" required placeholder="+234 800 000 0000">
              </div>
              
              <div class="form-group">
                <label>Company Name</label>
                <input type="text" name="company" placeholder="Your Company Inc">
              </div>
              
              <h4 style="margin-top: 30px;">Payment Details</h4>
              
              <div class="form-group">
                <label>Card Number *</label>
                <div class="card-input">
                  <input type="text" name="cardNumber" required placeholder="1234 5678 9012 3456" maxlength="19">
                  <i class="fab fa-cc-visa"></i>
                </div>
              </div>
              
              <div class="form-row">
                <div class="form-group">
                  <label>Expiry Date *</label>
                  <input type="text" name="expiry" required placeholder="MM/YY" maxlength="5">
                </div>
                
                <div class="form-group">
                  <label>CVV *</label>
                  <input type="text" name="cvv" required placeholder="123" maxlength="3">
                </div>
              </div>
            </div>
            
            <div class="order-summary">
              <h4>Order Summary</h4>
              
              <div class="order-items">
                ${shoppingCart.items.map(item => `
                  <div class="order-item">
                    <div class="order-item-title">
                      <span>${item.title} × ${item.quantity}</span>
                      <span>$${(item.price * item.quantity).toLocaleString()}</span>
                    </div>
                    <div class="order-item-category">${item.subcategory}</div>
                  </div>
                `).join('')}
              </div>
              
              <div class="order-totals">
                <div class="total-row">
                  <span>Subtotal</span>
                  <span>$${shoppingCart.subtotal.toLocaleString()}</span>
                </div>
                <div class="total-row">
                  <span>Tax</span>
                  <span>$${shoppingCart.tax.toLocaleString()}</span>
                </div>
                <div class="total-row grand-total">
                  <span>Total</span>
                  <span>$${shoppingCart.total.toLocaleString()}</span>
                </div>
              </div>
              
              <div class="secure-payment">
                <i class="fas fa-lock"></i>
                <span>Secure payment processed by Stripe</span>
              </div>
            </div>
          </div>
        </form>
        
        <div class="modal-footer">
          <button class="btn-secondary" onclick="closeCheckoutModal()">
            Cancel
          </button>
          <button class="btn-primary" onclick="processPayment()">
            <i class="fas fa-credit-card"></i> Pay $${shoppingCart.total.toLocaleString()}
          </button>
        </div>
      </div>
    </div>
  `;

        document.body.insertAdjacentHTML('beforeend', checkoutHTML);
        addCheckoutStyles();
      }

      // 7. Utility Functions
      function closePlanModal() {
        const modal = document.getElementById('planModalOverlay');
        if (modal) modal.remove();
      }

      function closeCartModal() {
        const modal = document.getElementById('cartModalOverlay');
        if (modal) modal.remove();
      }

      function closeCheckoutModal() {
        const modal = document.getElementById('checkoutModalOverlay');
        if (modal) modal.remove();
      }

      function updateCartQuantity(planId, newQuantity) {
        shoppingCart.updateQuantity(planId, newQuantity);

        // Refresh cart modal if open
        const cartModal = document.getElementById('cartModalOverlay');
        if (cartModal) {
          showCartSummary();
        }
      }

      function removeFromCart(planId) {
        shoppingCart.removeItem(planId);

        // Refresh cart modal if open
        const cartModal = document.getElementById('cartModalOverlay');
        if (cartModal) {
          if (shoppingCart.items.length === 0) {
            closeCartModal();
            showNotification('Cart is empty', 'info');
          } else {
            showCartSummary();
          }
        }
      }

      function adjustQuantity(change) {
        const input = document.getElementById('planQuantity');
        if (!input) return;

        let newValue = parseInt(input.value) + change;
        if (newValue < 1) newValue = 1;
        if (newValue > 10) newValue = 10;

        input.value = newValue;
      }

      // 8. Payment Processing (Mock)
      function processPayment() {
        const form = document.getElementById('checkoutForm');
        if (!form || !form.checkValidity()) {
          showNotification('Please fill all required fields', 'error');
          form.reportValidity();
          return;
        }

        // Show processing
        showNotification('Processing payment...', 'info');

        // Mock API call
        setTimeout(() => {
          closeCheckoutModal();

          // Show success
          const successHTML = `
      <div class="success-modal-overlay" id="successModal">
        <div class="success-modal">
          <div class="success-icon">
            <i class="fas fa-check-circle"></i>
          </div>
          <h2>Payment Successful! 🎉</h2>
          <p>Thank you for your order. We've sent a confirmation email with your order details.</p>
          
          <div class="order-confirmation">
            <div class="confirmation-number">
              Order #: <strong>TEK${Date.now().toString().slice(-8)}</strong>
            </div>
            <div class="confirmation-total">
              Total Paid: <strong>$${shoppingCart.total.toLocaleString()}</strong>
            </div>
          </div>
          
          <div class="next-steps">
            <h4>What happens next?</h4>
            <ol>
              <li>Our team will contact you within 24 hours</li>
              <li>We'll schedule a project kickoff meeting</li>
              <li>You'll receive regular project updates</li>
            </ol>
          </div>
          
          <div class="success-actions">
            <button class="btn-secondary" onclick="closeSuccessModal()">
              <i class="fas fa-download"></i> Download Invoice
            </button>
            <button class="btn-primary" onclick="closeSuccessModalAndClear()">
              <i class="fas fa-home"></i> Return to Dashboard
            </button>
          </div>
        </div>
      </div>
    `;

          document.body.insertAdjacentHTML('beforeend', successHTML);
          addSuccessModalStyles();

        }, 2000);
      }

      function closeSuccessModal() {
        const modal = document.getElementById('successModal');
        if (modal) modal.remove();
      }

      function closeSuccessModalAndClear() {
        const modal = document.getElementById('successModal');
        if (modal) modal.remove();

        // Clear cart
        shoppingCart.clearCart();
      }


      // 11. Initialize Everything
      function initializeServicePageFeatures() {

        // Add event listeners to "Choose this plan" buttons
        document.addEventListener('click', function (e) {
          const chooseBtn = e.target.closest('.btn-solid, .btn-outline');
          if (chooseBtn) {
            const card = chooseBtn.closest('.pricing-card');
            if (card) {
              const serviceTitle = card.querySelector('h3')?.textContent || '';
              const planName = chooseBtn.classList.contains('btn-solid') ? 'Premium' :
                chooseBtn.classList.contains('btn-primary') ? 'Standard' : 'Basic';

              // Map card title to service name
              let serviceName = '';
              if (serviceTitle.includes('Branding') || serviceTitle.includes('Full Branding')) {
                serviceName = 'Brand Identity';
              } else if (serviceTitle.includes('UI') || serviceTitle.includes('App UI')) {
                serviceName = 'UI/UX Design';
              } else if (serviceTitle.includes('Web Application')) {
                serviceName = 'Website Development';
              } else if (serviceTitle.includes('Mobile App')) {
                serviceName = 'Mobile App Development';
              } else if (serviceTitle.includes('E-market')) {
                serviceName = 'Digital Marketing';
              } else {
                // Try to match with known services
                for (const knownService in serviceToQuestionnaireMap) {
                  if (serviceTitle.toLowerCase().includes(knownService.toLowerCase())) {
                    serviceName = knownService;
                    break;
                  }
                }
              }

              // If no match found, use a default
              if (!serviceName) {
                serviceName = 'Website Development';
              }

              // Open questionnaire for this service
              buildQuestionnairePage(serviceName, planName);
              e.preventDefault();
              e.stopPropagation();
            }
          }
        });

        // Load cart from storage
        shoppingCart.loadFromStorage();

        // Initialize plan buttons
        initializePlanButtons();

        // Add cart icon to notification button
        const notifBtn = document.getElementById('notifBtn');
        if (notifBtn) {
          notifBtn.title = 'View Cart';
          notifBtn.innerHTML = '<i class="fas fa-shopping-cart"></i>';
        }
      }

      // 12. Call initialization when service page loads
      // Add this to your service page initialization
      if (pageKey === 'service') {
        setTimeout(() => {
          initializeServicePageFeatures();
        }, 500);
      }


      function createPricingCard(data) {
        const card = document.createElement('div');
        card.className = `pricing-card ${data.theme || ''}`.trim();
        card.innerHTML = `
      <div class="card-header">
        <div class="card-icon"><img src="${escapeHtml(data.img || '')}" alt=""></div>
        <h3>${escapeHtml(data.title || '')}</h3>
        <p>${escapeHtml(data.desc || '')}</p>
      </div>
      <div class="card-price"><h2>${escapeHtml(data.price || '')}<span class="price-duration">${escapeHtml(data.duration || '')}</span></h2></div>
      <button class="${data.btnType === 'solid' ? 'btn-solid' : 'btn-outline'}">${escapeHtml(data.btnText || 'Choose')}</button>
      <ul class="card-features">
        ${(data.features || []).map(f => `<li><i class="feat-icon" data-feather="check"></i> <span class="feat-text">${escapeHtml(f)}</span></li>`).join('')}
      </ul>
    `;
        return card;
      }



      // Renderer: replace cards in a container with provided dataset (array of card objects)
      function renderCardsInContainer(container, dataset) {
        if (!container) return;
        container.innerHTML = ''; // clear existing
        dataset.forEach(d => {
          const node = createPricingCard(d);
          container.appendChild(node);
        });
        // refresh icons
        if (window.feather) try { feather.replace(); } catch (e) { }
      }

      // Attach click handlers to all .gr-btn inside each .Graphic block to replace (not append) cards
      (function attachReplaceButtons() {
        try {
          const graphicBlocks = Array.from(serviceSection.querySelectorAll('.Graphic'));
          graphicBlocks.forEach(block => {
            const btnWrap = block.querySelector('.Graphic-btn');
            // Find the associated pricing-section. Some markup places it as the next sibling,
            // other times it may be nested differently — try several fallbacks.
            let pricingSection = null;
            if (block.nextElementSibling && block.nextElementSibling.classList && block.nextElementSibling.classList.contains('pricing-section')) {
              pricingSection = block.nextElementSibling;
            } else {
              // Look for the first .pricing-section that appears after this block in the document
              const allPricing = serviceSection.querySelectorAll('.pricing-section');
              for (const ps of allPricing) {
                try {
                  if (block.compareDocumentPosition(ps) & Node.DOCUMENT_POSITION_FOLLOWING) {
                    pricingSection = ps;
                    break;
                  }
                } catch (e) {
                  // ignore compare errors and continue
                }
              }
              // final fallback: look for a descendant pricing-section inside the block
              if (!pricingSection) pricingSection = block.querySelector('.pricing-section');
            }
            if (!btnWrap || !pricingSection) return;
            const container = pricingSection.querySelector('.pricing-container');
            if (!container) return;



            // If the container already has 3 cards, record them as default dataset (used when button mapping is null)
            const defaultCards = Array.from(container.querySelectorAll('.pricing-card')).map(c => {
              // Extract basic values from existing DOM to create a default data object
              const title = c.querySelector('.card-header h3') ? c.querySelector('.card-header h3').textContent.trim() : '';
              const desc = c.querySelector('.card-header p') ? c.querySelector('.card-header p').textContent.trim() : '';
              const img = c.querySelector('.card-icon img') ? c.querySelector('.card-icon img').getAttribute('src') : '';
              const price = c.querySelector('.card-price h2') ? c.querySelector('.card-price h2').childNodes[0].textContent.trim() : '';
              const durationEl = c.querySelector('.price-duration');
              const duration = durationEl ? durationEl.textContent.trim() : '';
              const theme = Array.from(c.classList).find(cl => cl === 'turquoise' || cl === 'purple' || cl === 'offwhite') || '';
              const btn = c.querySelector('button') ? c.querySelector('button').textContent.trim() : '';
              const btnType = c.querySelector('button') && c.querySelector('button').classList.contains('btn-solid') ? 'solid' : 'outline';
              const features = Array.from(c.querySelectorAll('.card-features li')).map(li => li.textContent.trim());
              return { title, desc, img, price, duration, theme, btnText: btn, btnType, features };
            });

            // Ensure the first button's dataset is used as the initial display.
            const buttons = Array.from(btnWrap.querySelectorAll('.gr-btn'));
            if (buttons.length) {
              const firstBtn = buttons[0];
              const firstKey = firstBtn.getAttribute('data-key') || firstBtn.textContent.trim();
              // If there's no explicit mapping for the first key, bind the current DOM cards as its dataset
              if (!serviceCardSets[firstKey]) serviceCardSets[firstKey] = defaultCards;
              let initialDataset = serviceCardSets[firstKey];
              if (Array.isArray(initialDataset) && initialDataset.length === 1 && initialDataset[0] === null) initialDataset = defaultCards;
              renderCardsInContainer(container, initialDataset.map(d => d || defaultCards[0]));
              // debug
              console.debug('init pricing for', firstKey, 'mapped?', !!serviceCardSets[firstKey]);
              // mark the first button active
              buttons.forEach(b => b.classList.remove('active'));
              firstBtn.classList.add('active');
            }

            // Button clicks: replace cards with staggered exit animation then render new set
            let _replaceAnimating = false;
            btnWrap.addEventListener('click', (ev) => {
              const btn = ev.target && ev.target.closest ? ev.target.closest('.gr-btn') : null;
              if (!btn) return;
              if (_replaceAnimating) return; // ignore clicks while animating
              const key = (btn.getAttribute && btn.getAttribute('data-key')) ? btn.getAttribute('data-key') : (btn.textContent.trim && btn.textContent.trim()) || '';
              console.debug('gr-btn clicked:', key, 'hasMapping?', !!serviceCardSets[key]);
              let dataset = serviceCardSets[key];
              if (!dataset) dataset = serviceCardSets['Brand Identity'] || defaultCards;
              if (Array.isArray(dataset) && dataset.length === 1 && dataset[0] === null) dataset = defaultCards;

              // set active class on clicked button and remove from siblings
              buttons.forEach(b => b.classList.remove('active'));
              btn.classList.add('active');

              // animate out existing cards one after another, then replace
              const existingCards = Array.from(container.querySelectorAll('.pricing-card'));
              if (!existingCards.length) {
                renderCardsInContainer(container, dataset.map(d => d || defaultCards[0]));
                return;
              }

              _replaceAnimating = true;
              // stagger each card's exit
              existingCards.forEach((card, i) => {
                // ensure base state present
                card.classList.remove('anim-service-active');
                // staggered add of exit class
                setTimeout(() => {
                  card.classList.add('anim-service-exit');
                }, i * 120);
              });

              // after last exit transition, clear and render
              const totalDelay = existingCards.length * 120 + 420; // last stagger + transition buffer
              setTimeout(() => {
                // remove old nodes
                existingCards.forEach(c => { try { c.remove(); } catch (e) { } });
                // render new cards
                renderCardsInContainer(container, dataset.map(d => d || defaultCards[0]));
                // re-init service observers so new cards animate in
                try { initServiceScrollAnimations(); } catch (e) { console.error('re-init service animations', e); }
                _replaceAnimating = false;
              }, totalDelay);
            });
          });
        } catch (e) { console.error('attachReplaceButtons error', e); }
      })();
    };




    // initialize or cleanup scroll-triggered animations for home page
    if (pageKey === 'home') {
      initScrollAnimations();
    } else {
      cleanupScrollAnimations();
    }

    // initialize or cleanup animations for service page (isolated)
    if (pageKey === 'service') {
      initServiceScrollAnimations();
    } else {
      cleanupServiceAnimations();
    }
  }


  // --- Scroll animation utilities (animate blocks on enter/exit depending on scroll direction)
  let _animObserver = null;
  let _lastScrollY = window.scrollY || 0;
  let _scrollDir = 1; // 1 = down, -1 = up
  let _scrollListenerAttached = false;

  function _onScrollDir() {
    const y = window.scrollY || 0;
    if (y > _lastScrollY) _scrollDir = 1; else if (y < _lastScrollY) _scrollDir = -1;
    _lastScrollY = y;
  }

  function injectAnimStyles() {
    // Prefer loading the compiled external CSS (generated from _onScroll.scss).
    // If it already exists, don't add it again. If not available, fall back to injecting the inline style.
    if (document.getElementById('scroll-anim-styles-link')) return;
    try {
      const link = document.createElement('link');
      link.id = 'scroll-anim-styles-link';
      link.rel = 'stylesheet';
      link.href = 'styles/onScroll.css';
      document.head.appendChild(link);
      // if the stylesheet fails to load (e.g. dev hasn't compiled SCSS), fallback to inline styles after a timeout
      link.onerror = () => {
        if (document.getElementById('scroll-anim-styles')) return;
        const s = document.createElement('style');
        s.id = 'scroll-anim-styles';
        s.textContent = `
    /* initial states */
    .anim-initial{opacity:0;will-change:transform,opacity}
    .init-up{transform:translate3d(0,28px,0)}
    .init-bottom{transform:translate3d(0,48px,0)}
    .init-top{transform:translate3d(0,-48px,0)}
    .init-left{transform:translate3d(-48px,0,0)}
    .init-right{transform:translate3d(48px,0,0)}

    /* active (enter) */
    .anim-active{opacity:1;transform:translate3d(0,0,0);transition:transform .8s cubic-bezier(.2,.9,.3,1),opacity .6s ease}

    /* exit (scrolling up) */
    .out-left{opacity:0;transform:translate3d(-48px,0,0);transition:transform .6s cubic-bezier(.2,.9,.3,1),opacity .45s ease}
    .out-right{opacity:0;transform:translate3d(48px,0,0);transition:transform .6s cubic-bezier(.2,.9,.3,1),opacity .45s ease}
    .out-top{opacity:0;transform:translate3d(0,-48px,0);transition:transform .6s cubic-bezier(.2,.9,.3,1),opacity .45s ease}
    .out-bottom{opacity:0;transform:translate3d(0,48px,0);transition:transform .6s cubic-bezier(.2,.9,.3,1),opacity .45s ease}
    `;
        document.head.appendChild(s);
      };
    } catch (e) {
      // fallback: inject inline style immediately
      if (document.getElementById('scroll-anim-styles')) return;
      const s = document.createElement('style');
      s.id = 'scroll-anim-styles';
      s.textContent = `
    /* initial states */
    .anim-initial{opacity:0;will-change:transform,opacity}
    .init-up{transform:translate3d(0,28px,0)}
    .init-bottom{transform:translate3d(0,48px,0)}
    .init-top{transform:translate3d(0,-48px,0)}
    .init-left{transform:translate3d(-48px,0,0)}
    .init-right{transform:translate3d(48px,0,0)}

    /* active (enter) */
    .anim-active{opacity:1;transform:translate3d(0,0,0);transition:transform .8s cubic-bezier(.2,.9,.3,1),opacity .6s ease}

    /* exit (scrolling up) */
    .out-left{opacity:0;transform:translate3d(-48px,0,0);transition:transform .6s cubic-bezier(.2,.9,.3,1),opacity .45s ease}
    .out-right{opacity:0;transform:translate3d(48px,0,0);transition:transform .6s cubic-bezier(.2,.9,.3,1),opacity .45s ease}
    .out-top{opacity:0;transform:translate3d(0,-48px,0);transition:transform .6s cubic-bezier(.2,.9,.3,1),opacity .45s ease}
    .out-bottom{opacity:0;transform:translate3d(0,48px,0);transition:transform .6s cubic-bezier(.2,.9,.3,1),opacity .45s ease}
    `;
      document.head.appendChild(s);
    }
  }

  function initScrollAnimations() {
    injectAnimStyles();

    // prevent horizontal overflow during transforms
    try { document.documentElement.style.overflowX = 'hidden'; } catch (e) { }

    if (!_scrollListenerAttached) {
      window.addEventListener('scroll', _onScrollDir, { passive: true });
      _scrollListenerAttached = true;
    }

    if (_animObserver) { try { _animObserver.disconnect(); } catch (e) { } _animObserver = null; }

    const itemsToObserve = [];

    // Banner: animate upward at load (if present)
    if (carouselParent) {
      carouselParent.classList.add('anim-initial', 'init-up');
      // small delay to ensure paint
      requestAnimationFrame(() => setTimeout(() => carouselParent.classList.add('anim-active'), 80));
      itemsToObserve.push(carouselParent);
    }

    // Grid cards (cards directly after banner) - alternate L->R and R->L on enter
    const grid = pageEl.querySelector('.grid');
    if (grid) {
      const cards = Array.from(grid.querySelectorAll('.card'));
      cards.forEach((card, i) => {
        card.classList.add('anim-initial');
        if (i % 2 === 0) { card.classList.add('init-left'); card.dataset._exit = 'out-left'; }
        else { card.classList.add('init-right'); card.dataset._exit = 'out-right'; }
        itemsToObserve.push(card);
      });
    }

    // Feature section: entire section bottom->top; image left->right; text right->left
    const feat = pageEl.querySelector('.feature-section');
    if (feat) {
      feat.classList.add('anim-initial', 'init-bottom'); feat.dataset._exit = 'out-bottom'; itemsToObserve.push(feat);
      const img = feat.querySelector('.feature-image img, .feature-image');
      const txt = feat.querySelector('.feature-text');
      if (img) { img.classList.add('anim-initial', 'init-left'); img.dataset._exit = 'out-left'; itemsToObserve.push(img); }
      if (txt) { txt.classList.add('anim-initial', 'init-right'); txt.dataset._exit = 'out-right'; itemsToObserve.push(txt); }
    }

    // Our values section
    const vals = pageEl.querySelector('.our-values-section');
    if (vals) {
      vals.classList.add('anim-initial', 'init-bottom'); vals.dataset._exit = 'out-bottom'; itemsToObserve.push(vals);
      const chart = vals.querySelector('.chart-card');
      const dataCard = vals.querySelector('.data-card');
      if (chart) { chart.classList.add('anim-initial', 'init-left'); chart.dataset._exit = 'out-left'; itemsToObserve.push(chart); }
      if (dataCard) { dataCard.classList.add('anim-initial', 'init-right'); dataCard.dataset._exit = 'out-right'; itemsToObserve.push(dataCard); }
    }

    // Business section
    const business = pageEl.querySelector('.business-section');
    if (business) {
      business.classList.add('anim-initial', 'init-bottom'); business.dataset._exit = 'out-bottom'; itemsToObserve.push(business);
      const bimg = business.querySelector('.business-image img, .business-image video, .business-image');
      if (bimg) { bimg.classList.add('anim-initial', 'init-left'); bimg.dataset._exit = 'out-left'; itemsToObserve.push(bimg); }
    }

    // Strategy boxes inside Business section: simplified animation with guaranteed text visibility
    if (business) {
      const strategyBoxes = Array.from(business.querySelectorAll('.strategy-box'));
      if (strategyBoxes && strategyBoxes.length) {
        strategyBoxes.forEach((sb, idx) => {
          // Clean start - remove any existing animation classes
          sb.classList.remove('anim-initial', 'init-left', 'init-right', 'init-top', 'init-bottom', 'anim-active');

          // Set up new animation state
          sb.classList.add('anim-initial');
          // Last two boxes come from opposite sides
          if (idx >= 2) {
            sb.classList.add(idx === 2 ? 'init-left' : 'init-right');
            sb.dataset._exit = idx === 2 ? 'out-left' : 'out-right';

            // Force their text to be visible
            const text = sb.querySelector('.strategy-text');
            if (text) {
              text.style.cssText = 'opacity: 1 !important; visibility: visible !important; display: block !important;';
            }
          } else {
            // First two boxes keep original animation
            sb.classList.add(idx === 0 ? 'init-left' : 'init-right');
            sb.dataset._exit = idx === 0 ? 'out-left' : 'out-right';
          }

          // Observe for animation
          itemsToObserve.push(sb);
        });
      }
    }
    // --- Text elements in and around Business: animate bottom->top (reverse to top->bottom on upward scroll)
    const surrounding = [];
    if (business) surrounding.push(business);
    if (feat) surrounding.push(feat);
    if (vals) surrounding.push(vals);
    const softSection = pageEl.querySelector('.soft-section');
    if (softSection) surrounding.push(softSection);

    surrounding.forEach(sec => {
      const textEls = Array.from(sec.querySelectorAll('h1,h2,h3,h4,p, .feature-text, .ai-header, .ai-title, .ai-subtext, .feature-desc, .soft-text'));
      textEls.forEach((te, i) => {
        te.classList.add('anim-initial', 'init-bottom');
        // define reverse init (from top) so observer can swap on upward scroll
        te.dataset._init = 'init-bottom';
        te.dataset._initRev = 'init-top';
        // small stagger for readability
        te.style.transitionDelay = `${(i % 6) * 40}ms`;
        itemsToObserve.push(te);
      });
    });

    // Last four cards at bottom - animate individually with specified directions
    const allCards = Array.from(pageEl.querySelectorAll('.card'));
    if (allCards.length >= 4) {
      const last4 = allCards.slice(-4);
      const mapping = ['init-top', 'init-left', 'init-right', 'init-bottom'];
      const exitMap = ['out-bottom', 'out-right', 'out-left', 'out-top'];
      last4.forEach((el, idx) => {
        el.classList.add('anim-initial', mapping[idx]);
        el.dataset._exit = exitMap[idx];
        itemsToObserve.push(el);
      });
    }

    // Soft-icons: animate from bottom->top by grid row (stagger)
    const softIcons = Array.from(pageEl.querySelectorAll('.soft-section .soft-icons > div'));
    if (softIcons.length) {
      softIcons.forEach((ic, i) => {
        ic.classList.add('anim-initial', 'init-bottom');
        // set staggered delay
        ic.style.transitionDelay = `${(i % 6) * 80}ms`;
        itemsToObserve.push(ic);
      });
    }

    // Observer: on intersecting -> always animate in (anim-active). On leave -> animate out depending on scroll direction using _exit
    _animObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        const el = entry.target;
        if (entry.isIntersecting) {
          // Strategy box specific handling - ensure box and text become visible
          if (el.classList.contains('strategy-box')) {
            el.classList.add('anim-active');
            el.classList.remove('out-left', 'out-right', 'out-top', 'out-bottom');
            // Force text visibility after animation
            const text = el.querySelector('.strategy-text');
            if (text) {
              text.style.opacity = '1';
              text.style.transform = 'none';
              text.style.visibility = 'visible';
            }
            return;
          }

          // Regular element animation logic
          if (el.dataset && el.dataset._initRev) {
            if (_scrollDir >= 1) {
              el.classList.remove(el.dataset._initRev);
              el.classList.add(el.dataset._init);
            } else {
              el.classList.remove(el.dataset._init);
              el.classList.add(el.dataset._initRev);
            }
            // force a layout then activate
            void el.offsetWidth;
            el.classList.add('anim-active');
            el.classList.remove('out-left', 'out-right', 'out-top', 'out-bottom');
            return;
          }

          // Generic case: animate into place
          el.classList.add('anim-active');
          el.classList.remove('out-left', 'out-right', 'out-top', 'out-bottom');
        } else {
          // leaving viewport: if scrolling up, animate away using dataset._exit
          el.classList.remove('anim-active');
          const out = el.dataset._exit || null;
          if (_scrollDir < 0 && out) el.classList.add(out);
        }
      });
    }, { root: null, rootMargin: '0px 0px -12% 0px', threshold: 0.08 });

    itemsToObserve.forEach(n => _animObserver.observe(n));

    // Fallback: some elements (e.g. strategy-box) may still be not visible due to timing/layout.
    // After a short delay, reveal any strategy boxes that are within the viewport but not yet active.
    setTimeout(() => {
      try {
        const strategyBoxes = Array.from(pageEl.querySelectorAll('.strategy-box'));
        strategyBoxes.forEach(sb => {
          if (!sb.classList.contains('anim-active')) {
            const r = sb.getBoundingClientRect();
            if (r.top < (window.innerHeight || document.documentElement.clientHeight) && r.bottom > 0) {
              // ensure correct init class present
              if (sb.dataset && sb.dataset._initRev && _scrollDir < 0) {
                sb.classList.remove(sb.dataset._init);
                sb.classList.add(sb.dataset._initRev);
              }
              sb.classList.add('anim-active');
              sb.classList.remove('out-left', 'out-right', 'out-top', 'out-bottom');
            }
          }
        });
      } catch (e) { /* ignore */ }
    }, 650);
  }

  function cleanupScrollAnimations() {
    if (_animObserver) { try { _animObserver.disconnect(); } catch (e) { } _animObserver = null; }
    // restore overflow
    try { document.documentElement.style.overflowX = ''; } catch (e) { }
    // remove classes from elements within pageEl
    const selector = '.anim-initial, .init-up, .init-left, .init-right, .init-bottom, .init-top, .anim-active, .out-left, .out-right, .out-top, .out-bottom';
    const els = Array.from(pageEl.querySelectorAll(selector));
    els.forEach(el => {
      el.classList.remove('anim-initial', 'init-up', 'init-left', 'init-right', 'init-bottom', 'init-top', 'anim-active', 'out-left', 'out-right', 'out-top', 'out-bottom');
      el.style.transitionDelay = '';
      delete el.dataset._animIndex; delete el.dataset._enter; delete el.dataset._exit; delete el.dataset._init; delete el.dataset._initRev;
    });
  }

  // --- Service-only scroll animations (isolated from home animations)
  let _serviceObserver = null;
  let _serviceScrollDir = 1; // 1 = down, -1 = up
  let _serviceScrollListenerAttached = false;
  let _service_onScrollDir = null;

  function injectServiceStyles() {
    if (document.getElementById('service-anim-styles')) return;
    const s = document.createElement('style');
    s.id = 'service-anim-styles';
    s.textContent = `
    .anim-service-init{opacity:0;transform:translateY(20px);will-change:transform,opacity;transition:transform .6s cubic-bezier(.2,.9,.2,1),opacity .45s ease}
    .anim-service-active{opacity:1;transform:translateY(0)}
    @media (max-width:768px){
      .anim-service-init{transform:translateY(10px);transition:transform .45s cubic-bezier(.2,.9,.2,1),opacity .35s ease}
    }
    `;
    document.head.appendChild(s);
  }

  function initServiceScrollAnimations() {
    try {
      injectServiceStyles();
      if (_serviceObserver) { try { _serviceObserver.disconnect(); } catch (e) { } _serviceObserver = null; }

      const toObserve = [];

      // hero content
      const hero = pageEl.querySelector('.service-hero');
      if (hero) {
        hero.classList.add('anim-service-init');
        toObserve.push(hero);
        const heroChildren = hero.querySelectorAll('.service-hero-content > *');
        heroChildren.forEach((ch, i) => { ch.classList.add('anim-service-init'); ch.style.transitionDelay = (i * 80) + 'ms'; toObserve.push(ch); });
      }

      // graphic buttons and headings
      const headings = Array.from(pageEl.querySelectorAll('.service-extra-section .Graphic, .service-extra-section .Graphic-btn, .service-extra-section h1'));
      headings.forEach((el, i) => { el.classList.add('anim-service-init'); el.style.transitionDelay = (i * 60) + 'ms'; toObserve.push(el); });

      // pricing cards
      const cards = Array.from(pageEl.querySelectorAll('.service-extra-section .pricing-card'));
      cards.forEach((c, i) => { c.classList.add('anim-service-init'); c.style.transitionDelay = (120 + i * 60) + 'ms'; toObserve.push(c); });

      // footer
      const footer = pageEl.querySelector('.service-footer');
      if (footer) { footer.classList.add('anim-service-init'); footer.style.transitionDelay = '200ms'; toObserve.push(footer); }

      // attach small scroll dir tracker so we can react differently on upward scrolls if needed
      let _serviceLastScrollY = window.scrollY || 0;
      _service_onScrollDir = function () {
        const y = window.scrollY || 0;
        if (y > _serviceLastScrollY) _serviceScrollDir = 1; else if (y < _serviceLastScrollY) _serviceScrollDir = -1;
        _serviceLastScrollY = y;
      };
      if (!_serviceScrollListenerAttached) {
        window.addEventListener('scroll', _service_onScrollDir, { passive: true });
        _serviceScrollListenerAttached = true;
      }

      _serviceObserver = new IntersectionObserver((entries) => {
        entries.forEach(en => {
          const el = en.target;
          if (en.isIntersecting) {
            // entering viewport -> show
            el.classList.add('anim-service-active');
          } else {
            // leaving viewport -> hide so it can re-animate when re-entering
            el.classList.remove('anim-service-active');
          }
        });
      }, { root: null, rootMargin: '0px 0px -10% 0px', threshold: 0.08 });

      toObserve.forEach(n => { if (n && n.nodeType === 1) _serviceObserver.observe(n); });
    } catch (e) { console.error('initServiceScrollAnimations', e); }
  }

  function cleanupServiceAnimations() {
    if (_serviceObserver) { try { _serviceObserver.disconnect(); } catch (e) { } _serviceObserver = null; }
    // remove service scroll listener if attached
    if (_serviceScrollListenerAttached) { try { window.removeEventListener('scroll', _service_onScrollDir); } catch (e) { } _serviceScrollListenerAttached = false; }

    const selector = '.anim-service-init, .anim-service-active, .anim-service-exit';
    const els = Array.from(pageEl.querySelectorAll(selector));
    els.forEach(el => { el.classList.remove('anim-service-init', 'anim-service-active', 'anim-service-exit'); el.style.transitionDelay = ''; });
  }


  function getCssVar(name) { return getComputedStyle(document.documentElement).getPropertyValue(name) || '#98a0ad'; }

  // Helper to ensure page-specific stylesheet is loaded once
  function ensurePageCss(href, id) {
    try {
      if (!id) id = href;
      if (document.getElementById(id)) return;
      const l = document.createElement('link');
      l.rel = 'stylesheet';
      l.href = href;
      l.id = id;
      document.head.appendChild(l);
    } catch (e) { console.warn('ensurePageCss failed', e); }
  }

  navMainBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const page = btn.dataset.page;

      if (btn.classList.contains('nav-group-toggle')) {
        const was = navGroup.classList.toggle('expanded');
        navGroupList.setAttribute('aria-hidden', String(!was));

        return;
      }


      navGroup.classList.remove('expanded');
      navGroupList.setAttribute('aria-hidden', 'true');


      navMainBtns.forEach(n => n.classList.remove('active'));
      navSubitems.forEach(s => s.classList.remove('active'));
      btn.classList.add('active');



      buildPage(page);

      // on mobile close drawer after click
      if (window.matchMedia('(max-width:768px)').matches) {
        closeDrawer();
      }
    });
  });

  // nav group toggle: the portfolio toggle is present in navMainBtns as nav-group-toggle so handled above

  // subitems: when clicked -> load page, keep group open
  navSubitems.forEach(sub => {
    sub.addEventListener('click', () => {
      const page = sub.dataset.page;
      navSubitems.forEach(s => s.classList.remove('active'));
      sub.classList.add('active');

      // keep group open
      navGroup.classList.add('expanded');
      navGroupList.setAttribute('aria-hidden', 'false');

      // render subpage
      buildPage(page);

      // close drawer on mobile
      if (window.matchMedia('(max-width:768px)').matches) {
        closeDrawer();
      }
    });
  });

  // profile button toggles profile page: open first click, go back to previous page on second click
  profileBtn.addEventListener('click', () => {
    // If we're not currently on the profile page -> open it and remember previous page
    if (currentPage !== 'profile') {
      previousPage = currentPage; // remember where we were
      // clear active states in nav (profile is not part of nav)
      navMainBtns.forEach(n => n.classList.remove('active'));
      navSubitems.forEach(s => s.classList.remove('active'));
      // render profile and update state
      buildPage('profile');
      currentPage = 'profile';
      // on mobile close drawer after action for UX
      if (window.matchMedia('(max-width:768px)').matches) closeDrawer();
      return;
    }

    // If we are already on profile -> return to previous page (or home if none)
    const goto = previousPage || 'home';
    // Set active states: if goto matches a main nav or subitem, mark it active
    navMainBtns.forEach(n => n.classList.toggle('active', n.dataset.page === goto));
    navSubitems.forEach(s => s.classList.toggle('active', s.dataset.page === goto));

    // If the goto page is a subitem, make sure the nav-group remains expanded
    if (navSubitems.some(s => s.dataset.page === goto)) {
      navGroup.classList.add('expanded');
      navGroupList.setAttribute('aria-hidden', 'false');
    } else {
      navGroup.classList.remove('expanded');
      navGroupList.setAttribute('aria-hidden', 'true');
    }

    // Render previous page and update state
    buildPage(goto);
    currentPage = goto;
    previousPage = null; // clear previous
    if (window.matchMedia('(max-width:768px)').matches) closeDrawer();
  });


  // Update your existing notifBtn event listener:
  notifBtn.addEventListener('click', () => {
    if (isAdmin) {
      // Admin: Show chat notifications
      const unreadCount = getUnreadCount();
      if (unreadCount > 0) {
        // Go to chat page to see messages
        buildPage('chat');
        // Mark current nav as active
        navMainBtns.forEach(n => n.classList.remove('active'));
        const chatNav = document.querySelector('[data-page="chat"]');
        if (chatNav) chatNav.classList.add('active');
      } else {
        alert('No new messages');
      }
    } else {
      alert('No new notifications (placeholder)');
    }
  });

  // --- Drawer open/close (mobile)
  const hamburgerBtn = document.getElementById('hamburger');
  function openDrawer() { sidebar.classList.add('open'); overlay.classList.add('visible'); overlay.setAttribute('aria-hidden', 'false'); }
  function closeDrawer() { sidebar.classList.remove('open'); overlay.classList.remove('visible'); overlay.setAttribute('aria-hidden', 'true'); sidebar.style.transform = ''; overlay.style.opacity = ''; }

  hamburgerBtn && hamburgerBtn.addEventListener('click', () => openDrawer());
  overlay && overlay.addEventListener('click', () => closeDrawer());

  // touch gestures to open/close drawer on mobile
  let touchStartX = 0, touchCurrentX = 0, touchActive = false;
  const THRESHOLD = 80, DRAWER_W = 260;
  function onTouchStart(e) {
    if (e.touches && e.touches.length === 1) {
      touchStartX = e.touches[0].clientX;
      touchCurrentX = touchStartX;
      touchActive = true;
    }
  }
  function onTouchMove(e) {
    if (!touchActive) return;
    touchCurrentX = e.touches[0].clientX;
    const dx = touchCurrentX - touchStartX;

    if (!sidebar.classList.contains('open') && touchStartX < 60 && dx > 0) {
      const pct = Math.min(dx / DRAWER_W, 1);
      sidebar.style.transform = `translateX(${(-100 + pct * 100)}%)`;
      overlay.classList.add('visible');
      overlay.style.opacity = String(Math.min(pct * 1, 1));
    }

    if (sidebar.classList.contains('open') && dx < 0) {
      const pct = Math.min(Math.abs(dx) / DRAWER_W, 1);
      sidebar.style.transform = `translateX(${(-pct * 100)}%)`;
      overlay.style.opacity = String(Math.max(1 - pct, 0));
    }
  }
  function onTouchEnd() {
    if (!touchActive) return;
    const dx = touchCurrentX - touchStartX;
    if (!sidebar.classList.contains('open') && touchStartX < 60 && dx > THRESHOLD) {
      openDrawer();
      sidebar.style.transform = '';
      overlay.style.opacity = '';
    } else if (sidebar.classList.contains('open') && dx < -THRESHOLD) {
      closeDrawer();
      sidebar.style.transform = '';
      overlay.style.opacity = '';
    } else {
      sidebar.style.transform = '';
      overlay.style.opacity = '';
      if (!sidebar.classList.contains('open')) overlay.classList.remove('visible');
    }
    touchActive = false;
  }
  window.addEventListener('touchstart', onTouchStart, { passive: true });
  window.addEventListener('touchmove', onTouchMove, { passive: true });
  window.addEventListener('touchend', onTouchEnd);

  // keyboard navigation for carousel and escape drawer
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeDrawer();
    if (e.key === 'ArrowLeft') { prevSlide(); resetAutoSlide(); }
    if (e.key === 'ArrowRight') { nextSlide(); resetAutoSlide(); }
  });

  // carousel helpers referenced above
  function prevSlide() { gotoSlide(currentSlide - 1); }
  function nextSlide() { gotoSlide(currentSlide + 1); }
  function gotoSlide(i) {
    const count = carouselEl.children.length;
    if (!count) return;
    currentSlide = ((i % count) + count) % count;
    carouselEl.style.transform = `translateX(${-currentSlide * 100}%)`;
  }
  function resetAutoSlide() { if (slideInterval) clearInterval(slideInterval); slideInterval = setInterval(() => nextSlide(), AUTO_MS); }

  // initialize from URL hash (preserve page on refresh)
  function initFromHash() {
    const hash = (location.hash || '').toString();
    if (hash.startsWith('#item=')) {
      try {
        const v = decodeURIComponent(hash.slice(6));
        const parts = v.split('::');
        const src = parts[0];
        const idx = parseInt(parts[1], 10) || 0;
        if (pageData[src]) {
          // set pending item then build its parent page which will open the item
          pendingOpenItem = { sourcePage: src, index: idx };
          buildPage(src);
          return;
        }
      } catch (e) { }
    }
    if (hash.startsWith('#page=')) {
      try {
        const p = decodeURIComponent(hash.slice(6));
        if (pageData[p]) { buildPage(p); return; }
      } catch (e) { }

    }
    buildPage('home');
  }

  // --- Service Questionnaire System ---
  const serviceQuestionnaires = {
    // Universal questions (appear for all services)
    universal: [
      {
        id: 'fullName',
        type: 'text',
        label: 'Full Name *',
        required: true,
        placeholder: 'John Doe'
      },
      {
        id: 'email',
        type: 'email',
        label: 'Email Address *',
        required: true,
        placeholder: 'john@company.com'
      },
      {
        id: 'phone',
        type: 'tel',
        label: 'Phone / WhatsApp Number *',
        required: true,
        placeholder: '+234 800 000 0000'
      },
      {
        id: 'businessName',
        type: 'text',
        label: 'Business / Brand Name *',
        required: true,
        placeholder: 'Your Company Inc'
      },
      {
        id: 'industry',
        type: 'text',
        label: 'Industry / Niche *',
        required: true,
        placeholder: 'E-commerce, Tech, Healthcare, etc.'
      },
      {
        id: 'targetAudience',
        type: 'textarea',
        label: 'Target Audience *',
        required: true,
        placeholder: 'Describe your target customers (age, location, interests, etc.)'
      },
      {
        id: 'primaryGoal',
        type: 'textarea',
        label: 'Primary Goal for This Service *',
        required: true,
        placeholder: 'What do you want to achieve with this service?'
      },
      {
        id: 'package',
        type: 'radio',
        label: 'Selected Package *',
        required: true,
        options: [
          { value: 'basic', label: 'Basic (Regular) - Core delivery only, limited scope' },
          { value: 'standard', label: 'Standard (Medium) - Expanded scope, strategy included' },
          { value: 'premium', label: 'Premium - Full service scope, consultation included' }
        ]
      },
      {
        id: 'budget',
        type: 'select',
        label: 'Budget Range *',
        required: true,
        options: [
          { value: 'under-500', label: 'Under $500' },
          { value: '500-2000', label: '$500 - $2,000' },
          { value: '2000-5000', label: '$2,000 - $5,000' },
          { value: '5000-10000', label: '$5,000 - $10,000' },
          { value: '10000-plus', label: '$10,000+' }
        ]
      },
      {
        id: 'timeline',
        type: 'select',
        label: 'Expected Timeline *',
        required: true,
        options: [
          { value: 'urgent', label: 'ASAP (1-2 weeks)' },
          { value: 'fast', label: 'Fast (2-4 weeks)' },
          { value: 'normal', label: 'Normal (4-8 weeks)' },
          { value: 'flexible', label: 'Flexible (8+ weeks)' }
        ]
      },
      {
        id: 'communication',
        type: 'checkbox',
        label: 'Preferred Communication Channel *',
        required: true,
        options: [
          { value: 'chat', label: 'Chat (On-platform)' },
          { value: 'email', label: 'Email' },
          { value: 'whatsapp', label: 'WhatsApp' }
        ]
      }
    ],

    // Website Development
    'website-development': [
      {
        id: 'websiteType',
        type: 'select',
        label: 'Website Type *',
        required: true,
        options: [
          { value: 'business', label: 'Business Website' },
          { value: 'portfolio', label: 'Portfolio Website' },
          { value: 'ecommerce', label: 'E-commerce Store' },
          { value: 'landing-page', label: 'Landing Page' },
          { value: 'web-app', label: 'Web Application' }
        ]
      },
      {
        id: 'numberOfPages',
        type: 'number',
        label: 'Number of Pages *',
        required: true,
        placeholder: 'e.g., 5, 10, 20+'
      },
      {
        id: 'requiredFeatures',
        type: 'textarea',
        label: 'Required Features *',
        required: true,
        placeholder: 'Contact form, blog, user accounts, payment gateway, etc.'
      },
      {
        id: 'domainHosting',
        type: 'radio',
        label: 'Domain & Hosting Availability *',
        required: true,
        options: [
          { value: 'have-domain', label: 'I already have domain and hosting' },
          { value: 'need-domain', label: 'I need help with domain registration' },
          { value: 'need-hosting', label: 'I need hosting setup' },
          { value: 'need-both', label: 'I need both domain and hosting' }
        ]
      },
      {
        id: 'contentReady',
        type: 'radio',
        label: 'Content Readiness *',
        required: true,
        options: [
          { value: 'ready', label: 'All content is ready' },
          { value: 'partial', label: 'Some content is ready' },
          { value: 'none', label: 'No content ready (need copywriting)' }
        ]
      },
      {
        id: 'designStyle',
        type: 'textarea',
        label: 'Design Style Preference',
        required: false,
        placeholder: 'Modern, minimal, corporate, colorful, etc.'
      },
      {
        id: 'referenceWebsites',
        type: 'textarea',
        label: 'Reference Websites (URLs)',
        required: false,
        placeholder: 'List websites you like (separate with commas)'
      }
    ],

    // E-commerce Development
    'ecommerce-development': [
      {
        id: 'productType',
        type: 'radio',
        label: 'Product Type *',
        required: true,
        options: [
          { value: 'physical', label: 'Physical Products' },
          { value: 'digital', label: 'Digital Products' },
          { value: 'both', label: 'Both Physical and Digital' }
        ]
      },
      {
        id: 'estimatedProducts',
        type: 'number',
        label: 'Estimated Number of Products *',
        required: true,
        placeholder: 'e.g., 50, 100, 500+'
      },
      {
        id: 'paymentMethods',
        type: 'checkbox',
        label: 'Payment Methods Required *',
        required: true,
        options: [
          { value: 'card', label: 'Credit/Debit Cards' },
          { value: 'paypal', label: 'PayPal' },
          { value: 'bank-transfer', label: 'Bank Transfer' },
          { value: 'crypto', label: 'Cryptocurrency' },
          { value: 'mobile-money', label: 'Mobile Money' }
        ]
      },
      {
        id: 'shippingRegions',
        type: 'textarea',
        label: 'Shipping Regions *',
        required: true,
        placeholder: 'Countries or regions you will ship to'
      },
      {
        id: 'inventoryManagement',
        type: 'radio',
        label: 'Inventory Management Required? *',
        required: true,
        options: [
          { value: 'yes', label: 'Yes' },
          { value: 'no', label: 'No' }
        ]
      },
      {
        id: 'currencySupport',
        type: 'textarea',
        label: 'Currency Support',
        required: false,
        placeholder: 'USD, EUR, NGN, etc.'
      },
      {
        id: 'competitorStores',
        type: 'textarea',
        label: 'Competitor Stores',
        required: false,
        placeholder: 'List competitor websites'
      }
    ],

    // Mobile App Development
    'mobile-app-development': [
      {
        id: 'appType',
        type: 'radio',
        label: 'App Type *',
        required: true,
        options: [
          { value: 'mvp', label: 'MVP (Minimum Viable Product)' },
          { value: 'full-product', label: 'Full Product' },
          { value: 'prototype', label: 'Prototype' }
        ]
      },
      {
        id: 'platform',
        type: 'checkbox',
        label: 'Platform *',
        required: true,
        options: [
          { value: 'android', label: 'Android' },
          { value: 'ios', label: 'iOS' },
          { value: 'both', label: 'Both (Cross-platform)' }
        ]
      },
      {
        id: 'coreFeatures',
        type: 'textarea',
        label: 'Core Features *',
        required: true,
        placeholder: 'List the main features your app needs'
      },
      {
        id: 'authentication',
        type: 'radio',
        label: 'Authentication Required? *',
        required: true,
        options: [
          { value: 'yes', label: 'Yes (User login/signup)' },
          { value: 'no', label: 'No' }
        ]
      },
      {
        id: 'backendRequired',
        type: 'radio',
        label: 'Backend / API Required? *',
        required: true,
        options: [
          { value: 'yes', label: 'Yes' },
          { value: 'no', label: 'No (Static app only)' }
        ]
      },
      {
        id: 'monetization',
        type: 'select',
        label: 'Monetization Model',
        required: false,
        options: [
          { value: 'paid-app', label: 'Paid App' },
          { value: 'in-app-purchases', label: 'In-app Purchases' },
          { value: 'subscription', label: 'Subscription' },
          { value: 'ads', label: 'Advertising' },
          { value: 'freemium', label: 'Freemium' },
          { value: 'none', label: 'No Monetization' }
        ]
      },
      {
        id: 'similarApps',
        type: 'textarea',
        label: 'Similar Apps',
        required: false,
        placeholder: 'List similar apps you like'
      }
    ],

    // UI/UX Design
    'uiux-design': [
      {
        id: 'productType',
        type: 'checkbox',
        label: 'Product Type *',
        required: true,
        options: [
          { value: 'web', label: 'Web Design' },
          { value: 'mobile', label: 'Mobile App Design' },
          { value: 'dashboard', label: 'Dashboard Design' },
          { value: 'desktop', label: 'Desktop Application' }
        ]
      },
      {
        id: 'platform',
        type: 'textarea',
        label: 'Platform Details',
        required: false,
        placeholder: 'Specific platforms or frameworks (if any)'
      },
      {
        id: 'numberOfScreens',
        type: 'number',
        label: 'Number of Screens *',
        required: true,
        placeholder: 'e.g., 5, 10, 20+'
      },
      {
        id: 'designStage',
        type: 'radio',
        label: 'Design Stage *',
        required: true,
        options: [
          { value: 'idea', label: 'Idea (Starting from scratch)' },
          { value: 'redesign', label: 'Redesign (Improving existing design)' },
          { value: 'wireframe', label: 'Have wireframes, need visual design' }
        ]
      },
      {
        id: 'brandGuidelines',
        type: 'radio',
        label: 'Brand Guidelines Available? *',
        required: true,
        options: [
          { value: 'yes', label: 'Yes (I have brand guidelines)' },
          { value: 'no', label: 'No (Need brand development)' },
          { value: 'partial', label: 'Partial (Some guidelines available)' }
        ]
      },
      {
        id: 'designStyle',
        type: 'textarea',
        label: 'Design Style Preference',
        required: false,
        placeholder: 'Modern, minimal, dark mode, colorful, etc.'
      },
      {
        id: 'deliverables',
        type: 'checkbox',
        label: 'Required Deliverables *',
        required: true,
        options: [
          { value: 'wireframes', label: 'Wireframes' },
          { value: 'mockups', label: 'Mockups' },
          { value: 'prototype', label: 'Interactive Prototype' },
          { value: 'design-system', label: 'Design System' },
          { value: 'assets', label: 'Design Assets' },
          { value: 'specs', label: 'Developer Specifications' }
        ]
      }
    ],

    // Add more services as needed...
    'digital-marketing': [
      {
        id: 'marketingObjective',
        type: 'radio',
        label: 'Marketing Objective *',
        required: true,
        options: [
          { value: 'leads', label: 'Generate Leads' },
          { value: 'sales', label: 'Drive Sales' },
          { value: 'awareness', label: 'Brand Awareness' },
          { value: 'engagement', label: 'Engagement' },
          { value: 'traffic', label: 'Website Traffic' }
        ]
      },
      {
        id: 'platforms',
        type: 'checkbox',
        label: 'Platforms to Use *',
        required: true,
        options: [
          { value: 'facebook', label: 'Facebook' },
          { value: 'instagram', label: 'Instagram' },
          { value: 'twitter', label: 'Twitter/X' },
          { value: 'linkedin', label: 'LinkedIn' },
          { value: 'google-ads', label: 'Google Ads' },
          { value: 'tiktok', label: 'TikTok' }
        ]
      },
      {
        id: 'monthlyBudget',
        type: 'select',
        label: 'Monthly Ad Budget *',
        required: true,
        options: [
          { value: 'under-500', label: 'Under $500' },
          { value: '500-1000', label: '$500 - $1,000' },
          { value: '1000-3000', label: '$1,000 - $3,000' },
          { value: '3000-5000', label: '$3,000 - $5,000' },
          { value: '5000-plus', label: '$5,000+' }
        ]
      },
      {
        id: 'targetLocation',
        type: 'textarea',
        label: 'Target Audience Location *',
        required: true,
        placeholder: 'Countries, cities, or regions'
      },
      {
        id: 'existingAssets',
        type: 'radio',
        label: 'Existing Marketing Assets? *',
        required: true,
        options: [
          { value: 'yes', label: 'Yes (I have creatives, copy, etc.)' },
          { value: 'no', label: 'No (Need everything created)' },
          { value: 'partial', label: 'Partial (Some assets available)' }
        ]
      },
      {
        id: 'kpis',
        type: 'textarea',
        label: 'Key Performance Indicators (KPIs) *',
        required: true,
        placeholder: 'What metrics will determine success?'
      },
      {
        id: 'campaignDuration',
        type: 'select',
        label: 'Campaign Duration *',
        required: true,
        options: [
          { value: '1-month', label: '1 Month' },
          { value: '3-months', label: '3 Months' },
          { value: '6-months', label: '6 Months' },
          { value: 'ongoing', label: 'Ongoing' }
        ]
      }
    ]
  };

  // Map service names to questionnaire keys
  const serviceToQuestionnaireMap = {
    'Website Development': 'website-development',
    'E-commerce Development': 'ecommerce-development',
    'Mobile App Development': 'mobile-app-development',
    'UI/UX Design': 'uiux-design',
    'Digital Marketing': 'digital-marketing',
    'Brand Identity': 'brand-identity',
    'Logo Design': 'logo-design',
    'SEO': 'seo',
    'Social Media Management': 'social-media-management',
    'Content Writing': 'content-writing',
    'Copywriting': 'copywriting',
    'Product Design': 'product-design',
    'Business Automation': 'business-automation',
    'CRM Development': 'crm-development',
    'DevOps': 'devops',
    'Website Maintenance': 'website-maintenance',
    'Cloud Services': 'cloud-services',
    'Payment Integration': 'payment-integration',
    'Tech Consultation': 'tech-consultation',
    'Video Editing': 'video-editing',
    'Motion Graphics': 'motion-graphics',
    'Animation': 'animation',
    'Photo Editing': 'photo-editing',
    'Graphic Design': 'graphic-design',
    'Social Media Content': 'social-media-content',
    'IT Support': 'it-support',
    'Software Maintenance': 'software-maintenance',
    'API Development': 'api-development',
    'Data Analytics': 'data-analytics'
  };

  function buildQuestionnairePage(serviceName, planName = 'Standard') {
    const questionnaireKey = serviceToQuestionnaireMap[serviceName] || 'website-development';
    const serviceQuestions = serviceQuestionnaires[questionnaireKey] || serviceQuestionnaires['website-development'];

    // Set current page state
    currentPage = 'questionnaire';
    previousPage = 'service';

    // Hide carousel
    if (carouselEl) carouselEl.style.display = 'none';
    if (carouselParent) {
      carouselParent.style.display = 'none';
      carouselParent.style.margin = '0';
      carouselParent.style.padding = '0';
      carouselParent.style.height = '0';
      carouselParent.style.minHeight = '0';
      carouselParent.style.overflow = 'hidden';
    }

    pageEl.innerHTML = `
    <div class="questionnaire-container">
      <div class="questionnaire-header">
        <button class="back-to-service" onclick="buildPage('service')">
          <i class="fas fa-arrow-left"></i> Back to Services
        </button>
        <h1>${escapeHtml(serviceName)} - Service Questionnaire</h1>
        <p>Please fill out this form to help us understand your requirements for the "${planName}" package</p>
        
        <div class="questionnaire-progress">
          <div class="progress-steps">
            <div class="step active">
              <div class="step-number">1</div>
              <div class="step-label">Universal Info</div>
            </div>
            <div class="step">
              <div class="step-number">2</div>
              <div class="step-label">${escapeHtml(serviceName)}</div>
            </div>
            <div class="step">
              <div class="step-number">3</div>
              <div class="step-label">Review & Submit</div>
            </div>
          </div>
        </div>
      </div>
      
      <form id="serviceQuestionnaireForm" class="questionnaire-form">
        <!-- Service Info -->
        <div class="form-section">
          <div class="section-header">
            <h2><i class="fas fa-info-circle"></i> Service Information</h2>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Selected Service *</label>
              <input type="text" value="${escapeHtml(serviceName)}" readonly class="readonly-input">
            </div>
            <div class="form-group">
              <label>Selected Package *</label>
              <input type="text" value="${escapeHtml(planName)}" readonly class="readonly-input">
            </div>
          </div>
        </div>
        
        <!-- Universal Questions -->
        <div class="form-section" id="universalSection">
          <div class="section-header">
            <h2><i class="fas fa-user-circle"></i> Universal Information (Required for all services)</h2>
            <p class="section-subtitle">This information helps us understand your business and goals</p>
          </div>
          <div class="universal-questions" id="universalQuestions">
            <!-- Universal questions will be generated here -->
          </div>
        </div>
        
        <!-- Service-Specific Questions -->
        <div class="form-section" id="serviceSection" style="display: none;">
          <div class="section-header">
            <h2><i class="fas fa-cog"></i> ${escapeHtml(serviceName)} - Specific Requirements</h2>
            <p class="section-subtitle">Tell us about your specific needs for this service</p>
          </div>
          <div class="service-questions" id="serviceQuestions">
            <!-- Service-specific questions will be generated here -->
          </div>
        </div>
        
        <!-- Review Section -->
        <div class="form-section" id="reviewSection" style="display: none;">
          <div class="section-header">
            <h2><i class="fas fa-clipboard-check"></i> Review Your Submission</h2>
            <p class="section-subtitle">Please review all information before submitting</p>
          </div>
          <div class="review-content" id="reviewContent">
            <!-- Review content will be generated here -->
          </div>
        </div>
        
        <!-- Navigation Buttons -->
        <div class="questionnaire-navigation">
          <button type="button" class="btn-prev" id="prevBtn" style="display: none;">
            <i class="fas fa-arrow-left"></i> Previous
          </button>
          <button type="button" class="btn-next" id="nextBtn">
            Next: Service Details <i class="fas fa-arrow-right"></i>
          </button>
          <button type="button" class="btn-submit" id="submitBtn" style="display: none;">
            <i class="fas fa-paper-plane"></i> Submit & Start Chat
          </button>
        </div>
      </form>
      
      <div class="questionnaire-help">
        <h3><i class="fas fa-question-circle"></i> Need Help?</h3>
        <p>If you have questions about this form, you can:</p>
        <ul>
          <li>Chat with us now for assistance</li>
          <li>Email support@tekagon.com</li>
          <li>Provide as much detail as possible for accurate pricing</li>
        </ul>
      </div>
    </div>
  `;

    // Generate universal questions
    generateQuestionFields('universalQuestions', serviceQuestionnaires.universal);

    // Generate service-specific questions
    generateQuestionFields('serviceQuestions', serviceQuestions);

    // Initialize form navigation
    initializeQuestionnaireNavigation(serviceName, planName);

    // Add questionnaire styles
    addQuestionnaireStyles();
  }

  function generateQuestionFields(containerId, questions) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = questions.map((q, index) => {
      const required = q.required ? '<span class="required-star">*</span>' : '';

      switch (q.type) {
        case 'text':
        case 'email':
        case 'tel':
        case 'number':
          return `
          <div class="form-question">
            <label for="${q.id}">${q.label} ${required}</label>
            <input type="${q.type}" 
                   id="${q.id}" 
                   name="${q.id}" 
                   placeholder="${q.placeholder || ''}"
                   ${q.required ? 'required' : ''}
                   class="question-input">
            ${q.helpText ? `<div class="help-text">${q.helpText}</div>` : ''}
          </div>
        `;

        case 'textarea':
          return `
          <div class="form-question">
            <label for="${q.id}">${q.label} ${required}</label>
            <textarea id="${q.id}" 
                      name="${q.id}" 
                      rows="3" 
                      placeholder="${q.placeholder || ''}"
                      ${q.required ? 'required' : ''}
                      class="question-textarea"></textarea>
            ${q.helpText ? `<div class="help-text">${q.helpText}</div>` : ''}
          </div>
        `;

        case 'select':
          return `
          <div class="form-question">
            <label for="${q.id}">${q.label} ${required}</label>
            <select id="${q.id}" 
                    name="${q.id}" 
                    ${q.required ? 'required' : ''}
                    class="question-select">
              <option value="">Select an option</option>
              ${q.options.map(opt => `
                <option value="${opt.value}">${opt.label}</option>
              `).join('')}
            </select>
            ${q.helpText ? `<div class="help-text">${q.helpText}</div>` : ''}
          </div>
        `;

        case 'radio':
          return `
          <div class="form-question">
            <label>${q.label} ${required}</label>
            <div class="radio-group">
              ${q.options.map(opt => `
                <label class="radio-option">
                  <input type="radio" 
                         name="${q.id}" 
                         value="${opt.value}"
                         ${q.required ? 'required' : ''}>
                  <span class="radio-label">${opt.label}</span>
                </label>
              `).join('')}
            </div>
            ${q.helpText ? `<div class="help-text">${q.helpText}</div>` : ''}
          </div>
        `;

        case 'checkbox':
          return `
          <div class="form-question">
            <label>${q.label} ${required}</label>
            <div class="checkbox-group">
              ${q.options.map(opt => `
                <label class="checkbox-option">
                  <input type="checkbox" 
                         name="${q.id}[]" 
                         value="${opt.value}">
                  <span class="checkbox-label">${opt.label}</span>
                </label>
              `).join('')}
            </div>
            ${q.helpText ? `<div class="help-text">${q.helpText}</div>` : ''}
          </div>
        `;

        default:
          return '';
      }
    }).join('');
  }

  function initializeQuestionnaireNavigation(serviceName, planName) {
    let currentStep = 1;
    const totalSteps = 3;

    const universalSection = document.getElementById('universalSection');
    const serviceSection = document.getElementById('serviceSection');
    const reviewSection = document.getElementById('reviewSection');

    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const submitBtn = document.getElementById('submitBtn');

    // Update step indicators
    function updateStepIndicators() {
      const steps = document.querySelectorAll('.progress-steps .step');
      steps.forEach((step, index) => {
        step.classList.remove('active', 'completed');
        if (index + 1 === currentStep) {
          step.classList.add('active');
        } else if (index + 1 < currentStep) {
          step.classList.add('completed');
        }
      });
    }

    // Update navigation buttons
    function updateNavigationButtons() {
      prevBtn.style.display = currentStep > 1 ? 'flex' : 'none';

      if (currentStep < totalSteps) {
        nextBtn.style.display = 'flex';
        submitBtn.style.display = 'none';
        nextBtn.innerHTML = currentStep === 1 ?
          'Next: Service Details <i class="fas fa-arrow-right"></i>' :
          'Next: Review & Submit <i class="fas fa-arrow-right"></i>';
      } else {
        nextBtn.style.display = 'none';
        submitBtn.style.display = 'flex';
      }

      // Update sections visibility
      universalSection.style.display = currentStep === 1 ? 'block' : 'none';
      serviceSection.style.display = currentStep === 2 ? 'block' : 'none';
      reviewSection.style.display = currentStep === 3 ? 'block' : 'none';

      // Update review content if we're on review step
      if (currentStep === 3) {
        updateReviewContent(serviceName, planName);
      }
    }

    // Next button click
    nextBtn.addEventListener('click', () => {
      // Validate current step
      if (currentStep === 1) {
        // Validate universal section
        const universalInputs = universalSection.querySelectorAll('[required]');
        let isValid = true;

        universalInputs.forEach(input => {
          if (!input.value.trim()) {
            isValid = false;
            input.classList.add('error');
          } else {
            input.classList.remove('error');
          }

          // Special handling for checkboxes and radios
          if (input.type === 'checkbox' || input.type === 'radio') {
            const name = input.name;
            const checked = universalSection.querySelectorAll(`input[name="${name}"]:checked`);
            if (checked.length === 0 && input.hasAttribute('required')) {
              isValid = false;
              // Highlight the group
              const group = input.closest('.radio-group, .checkbox-group');
              if (group) group.classList.add('error');
            } else {
              const group = input.closest('.radio-group, .checkbox-group');
              if (group) group.classList.remove('error');
            }
          }
        });

        if (!isValid) {
          alert('Please fill in all required fields in the Universal Information section.');
          return;
        }
      } else if (currentStep === 2) {
        // Validate service-specific section
        const serviceInputs = serviceSection.querySelectorAll('[required]');
        let isValid = true;

        serviceInputs.forEach(input => {
          if (!input.value.trim()) {
            isValid = false;
            input.classList.add('error');
          } else {
            input.classList.remove('error');
          }
        });

        if (!isValid) {
          alert('Please fill in all required fields in the Service Details section.');
          return;
        }
      }

      currentStep++;
      updateStepIndicators();
      updateNavigationButtons();
    });

    // Previous button click
    prevBtn.addEventListener('click', () => {
      currentStep--;
      updateStepIndicators();
      updateNavigationButtons();
    });

    // Submit button click
    submitBtn.addEventListener('click', (e) => {
      e.preventDefault();
      handleQuestionnaireSubmit(serviceName, planName);
    });

    // Initialize
    updateStepIndicators();
    updateNavigationButtons();
  }

  function updateReviewContent(serviceName, planName) {
    const reviewContent = document.getElementById('reviewContent');
    if (!reviewContent) return;

    // Collect all form data
    const form = document.getElementById('serviceQuestionnaireForm');
    const formData = new FormData(form);
    const data = {};

    // Convert FormData to object
    for (let [key, value] of formData.entries()) {
      if (key.endsWith('[]')) {
        const baseKey = key.slice(0, -2);
        if (!data[baseKey]) data[baseKey] = [];
        data[baseKey].push(value);
      } else {
        data[key] = value;
      }
    }

    // Generate review HTML
    reviewContent.innerHTML = `
    <div class="review-summary">
      <div class="review-section">
        <h3><i class="fas fa-info-circle"></i> Service Information</h3>
        <div class="review-item">
          <strong>Service:</strong> ${escapeHtml(serviceName)}
        </div>
        <div class="review-item">
          <strong>Package:</strong> ${escapeHtml(planName)}
        </div>
      </div>
      
      <div class="review-section">
        <h3><i class="fas fa-user-circle"></i> Universal Information</h3>
        ${Object.entries(data)
        .filter(([key]) => key !== 'service' && key !== 'package')
        .filter(([key]) => {
          const universalIds = serviceQuestionnaires.universal.map(q => q.id);
          return universalIds.includes(key);
        })
        .map(([key, value]) => `
            <div class="review-item">
              <strong>${getQuestionLabel(key, 'universal')}:</strong>
              ${Array.isArray(value) ? value.join(', ') : escapeHtml(String(value))}
            </div>
          `).join('')}
      </div>
      
      <div class="review-section">
        <h3><i class="fas fa-cog"></i> ${escapeHtml(serviceName)} Requirements</h3>
        ${Object.entries(data)
        .filter(([key]) => {
          const universalIds = serviceQuestionnaires.universal.map(q => q.id);
          return !universalIds.includes(key) && key !== 'service' && key !== 'package';
        })
        .map(([key, value]) => `
            <div class="review-item">
              <strong>${getQuestionLabel(key, serviceToQuestionnaireMap[serviceName])}:</strong>
              ${Array.isArray(value) ? value.join(', ') : escapeHtml(String(value))}
            </div>
          `).join('')}
      </div>
    </div>
    
    <div class="review-note">
      <p><i class="fas fa-exclamation-circle"></i> By clicking "Submit & Start Chat", you agree that:</p>
      <ul>
        <li>This information will be sent to Tekagon's team</li>
        <li>A support ticket will be created for your request</li>
        <li>You'll be redirected to chat for immediate assistance</li>
        <li>An email confirmation will be sent to ${data.email || 'your email'}</li>
      </ul>
    </div>
  `;
  }

  function getQuestionLabel(questionId, questionnaireType) {
    const questions = questionnaireType === 'universal'
      ? serviceQuestionnaires.universal
      : serviceQuestionnaires[questionnaireType] || [];

    const question = questions.find(q => q.id === questionId);
    return question ? question.label.replace('*', '').trim() : questionId;
  }

  function handleQuestionnaireSubmit(serviceName, planName) {
    try {
      console.log('=== STARTING FORM SUBMISSION ===');
      console.log('Service:', serviceName);
      console.log('Plan:', planName);

      // Debug: Check if functions exist
      console.log('createTicket exists?', typeof window.createTicket);
      console.log('formatServiceBrief exists?', typeof window.formatServiceBrief);

      if (typeof window.createTicket === 'undefined') {
        console.error('CRITICAL: createTicket is not available!');
        alert('System error: Ticket creation function not loaded. Please refresh the page.');
        hideLoading();
        return;
      }

      // Collect form data
      const form = document.getElementById('serviceQuestionnaireForm');
      if (!form) {
        console.error('Form element not found');
        alert('Form not found. Please refresh and try again.');
        return;
      }

      // Get form data
      const formData = new FormData(form);
      const data = {};

      // Convert FormData to object
      for (let [key, value] of formData.entries()) {
        // Handle array fields (checkboxes)
        if (key.endsWith('[]')) {
          const baseKey = key.slice(0, -2);
          if (!data[baseKey]) data[baseKey] = [];
          data[baseKey].push(value);
        } else {
          data[key] = value;
        }
      }

      console.log('Form data collected, keys:', Object.keys(data));

      // Validate required fields
      if (!data.fullName || !data.email) {
        alert('Please fill in your name and email address.');
        return;
      }

      // Add service info
      data.service = serviceName;
      data.package = planName;
      data.submittedAt = new Date().toISOString();

      // Get or create user ID
      let userId = localStorage.getItem('chatUserId');
      if (!userId) {
        userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('chatUserId', userId);
        localStorage.setItem('userName', data.fullName);
      }

      console.log('User ID:', userId);

      // Save user name
      const userName = data.fullName;
      localStorage.setItem('userName', userName);

      // Show loading
      showLoading('Creating your service ticket...');

      // Create ticket
      console.log('Calling createTicket...');
      let ticket;
      try {
        ticket = window.createTicket(serviceName, data, userId);
        console.log('✅ Ticket created successfully:', ticket.id);
      } catch (ticketError) {
        console.error('❌ Ticket creation failed:', ticketError);
        hideLoading();
        alert('Failed to create ticket: ' + ticketError.message);
        return;
      }

      // Format brief BEFORE using it
      console.log('Formatting brief...');
      let brief;
      try {
        brief = window.formatServiceBrief(serviceName, data, userName, ticket.id);
        console.log('✅ Brief formatted');
      } catch (briefError) {
        console.error('Brief formatting error:', briefError);
        brief = `New ${serviceName} request from ${userName}`;
      }

      // NOW create SEPARATE ticket chat entry with the formatted brief
      const ticketChats = JSON.parse(localStorage.getItem(TICKET_CHAT_KEY) || '{}');
      ticketChats[ticket.id] = []; // Initialize empty array for this ticket

      // Add initial system message to TICKET CHAT ONLY (not general chat)
      const ticketMessage = {
        id: 'ticket_' + Date.now(),
        sender: 'system',
        content: brief,
        timestamp: new Date().toISOString(),
        read: false,
        isTicket: true,
        ticketId: ticket.id
      };

      ticketChats[ticket.id].push(ticketMessage);
      localStorage.setItem(TICKET_CHAT_KEY, JSON.stringify(ticketChats));

      console.log(`✅ Created SEPARATE ticket chat for ${ticket.id}`);

      // Store brief for chat (optional - you might not need this anymore)
      localStorage.setItem('pending_brief', brief);
      localStorage.setItem('pending_ticket_id', ticket.id);

      // REMOVE or COMMENT OUT this part - we're NOT adding to general conversations anymore
      // to keep tickets completely separate
      /*
      // Add to chat conversations
      try {
        const conversations = JSON.parse(localStorage.getItem('tekagon_chat_conversations') || '{}');
        if (!conversations[userId]) conversations[userId] = [];
  
        conversations[userId].push({
          id: 'ticket_' + Date.now(),
          sender: 'system',
          content: brief,
          timestamp: new Date().toISOString(),
          read: false,
          isTicket: true,
          ticketId: ticket.id
        });
  
        localStorage.setItem('tekagon_chat_conversations', JSON.stringify(conversations));
        console.log('✅ Added to chat conversations');
      } catch (chatError) {
        console.warn('Could not add to chat:', chatError);
        // Continue anyway
      }
      */

      // Hide loading and redirect
      console.log('✅ All steps completed, redirecting to chat...');

      setTimeout(() => {
        hideLoading();

        // Navigate to chat page
        buildPage('chat');

        // Auto-fill chat message after page loads
        setTimeout(() => {
          const chatInput = document.getElementById('chatInput');
          if (chatInput) {
            chatInput.value = `I just submitted a ticket for ${serviceName} (Ticket #${ticket.id}). Can you tell me about the next steps?`;
            chatInput.focus();

            // Optionally auto-send after a moment
            setTimeout(() => {
              const sendBtn = document.getElementById('sendMessage');
              if (sendBtn && chatInput.value.trim()) {
                console.log('Auto-sending chat message...');
                sendBtn.click();
              }
            }, 1500);
          }
        }, 1000);

      }, 1500);

    } catch (error) {
      console.error('❌ FORM SUBMISSION ERROR:', error);
      console.error('Error stack:', error.stack);
      hideLoading();
      alert('An unexpected error occurred: ' + error.message);
    }
  }


  // Modify the showLoading function to include timeout
  function showLoading(message = 'Processing...', timeoutMs = 10000) {
    // Clear any existing timeout
    if (submissionTimeout) {
      clearTimeout(submissionTimeout);
      submissionTimeout = null;
    }

    // Remove any existing loading
    hideLoading();

    const loadingHTML = `
    <div class="questionnaire-loading" id="questionnaireLoading">
      <div class="loading-content">
        <div class="loading-spinner">
          <div class="spinner-circle"></div>
        </div>
        <div class="loading-text">${message}</div>
        <div class="loading-subtext">This will only take a moment...</div>
        <div class="loading-progress">
          <div class="progress-bar">
            <div class="progress-fill"></div>
          </div>
        </div>
        <button class="loading-cancel" onclick="forceHideLoading()">
          Cancel
        </button>
      </div>
    </div>
  `;

    document.body.insertAdjacentHTML('beforeend', loadingHTML);

    // Set timeout to auto-hide if something goes wrong
    submissionTimeout = setTimeout(() => {
      console.warn('Submission timeout - forcing hide');
      forceHideLoading();
      alert('The request is taking longer than expected. Please try again.');
    }, timeoutMs);

    // Add escape key listener
    const escapeHandler = (e) => {
      if (e.key === 'Escape') forceHideLoading();
    };
    document.addEventListener('keydown', escapeHandler);
    window.currentLoadingEscapeHandler = escapeHandler;
  }

  function forceHideLoading() {
    if (submissionTimeout) {
      clearTimeout(submissionTimeout);
      submissionTimeout = null;
    }

    const loading = document.getElementById('questionnaireLoading');
    if (loading) {
      loading.remove();
    }

    // Remove escape key listener
    if (window.currentLoadingEscapeHandler) {
      document.removeEventListener('keydown', window.currentLoadingEscapeHandler);
      window.currentLoadingEscapeHandler = null;
    }
  }

  function hideLoading() {
    if (submissionTimeout) {
      clearTimeout(submissionTimeout);
      submissionTimeout = null;
    }

    const loading = document.getElementById('questionnaireLoading');
    if (loading) {
      loading.style.opacity = '0';
      loading.style.transform = 'scale(0.95)';

      setTimeout(() => {
        loading.remove();
      }, 300);
    }

    // Remove escape key listener
    if (window.currentLoadingEscapeHandler) {
      document.removeEventListener('keydown', window.currentLoadingEscapeHandler);
      window.currentLoadingEscapeHandler = null;
    }
  }

  function addQuestionnaireStyles() {
    if (document.getElementById('questionnaireStyles')) return;

    const style = document.createElement('style');
    style.id = 'questionnaireStyles';
    style.textContent = `
    .questionnaire-container {
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
    }
    
    .questionnaire-header {
      background: linear-gradient(135deg, rgba(124, 92, 255, 0.2), rgba(18, 27, 45, 0.4));
      border-radius: 12px;
      padding: 30px;
      margin-bottom: 30px;
      border: 1px solid rgba(255, 255, 255, 0.1);
      position: relative;
    }
    
    .back-to-service {
      position: absolute;
      top: 20px;
      left: 20px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: var(--text);
      padding: 8px 16px;
      border-radius: 6px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.9rem;
      transition: all 0.2s;
    }
    
    .back-to-service:hover {
      background: rgba(255, 255, 255, 0.1);
      transform: translateY(-2px);
    }
    
    .questionnaire-header h1 {
      background: linear-gradient(to right, white, #93fff6);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      font-size: 2rem;
      margin: 0 0 10px 0;
      text-align: center;
    }
    
    .questionnaire-header p {
      color: var(--muted);
      text-align: center;
      margin-bottom: 30px;
    }
    
    .questionnaire-progress {
      background: rgba(255, 255, 255, 0.03);
      border-radius: 8px;
      padding: 20px;
    }
    
    .progress-steps {
      display: flex;
      justify-content: space-between;
      position: relative;
    }
    
    .progress-steps::before {
      content: '';
      position: absolute;
      top: 20px;
      left: 10%;
      right: 10%;
      height: 2px;
      background: rgba(255, 255, 255, 0.1);
      z-index: 1;
    }
    
    .step {
      display: flex;
      flex-direction: column;
      align-items: center;
      position: relative;
      z-index: 2;
      flex: 1;
    }
    
    .step-number {
      width: 40px;
      height: 40px;
      background: rgba(255, 255, 255, 0.05);
      border: 2px solid rgba(255, 255, 255, 0.1);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
      margin-bottom: 10px;
      transition: all 0.3s;
    }
    
    .step.active .step-number {
      background: linear-gradient(135deg, rgba(124, 92, 255, 0.9), rgba(111, 101, 255, 0.9));
      border-color: rgba(124, 92, 255, 0.5);
      color: white;
      transform: scale(1.1);
    }
    
    .step.completed .step-number {
      background: rgba(16, 185, 129, 0.2);
      border-color: rgba(16, 185, 129, 0.5);
      color: #10b981;
    }
    
    .step-label {
      font-size: 0.85rem;
      color: var(--muted);
      text-align: center;
    }
    
    .step.active .step-label {
      color: var(--text);
      font-weight: 500;
    }
    
    .questionnaire-form {
      margin-bottom: 40px;
    }
    
    .form-section {
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: 12px;
      padding: 30px;
      margin-bottom: 20px;
      animation: fadeIn 0.3s ease-out;
    }
    
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    
    .section-header {
      margin-bottom: 30px;
    }
    
    .section-header h2 {
      font-size: 1.5rem;
      margin-bottom: 10px;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    
    .section-header h2 i {
      color: #93fff6;
    }
    
    .section-subtitle {
      color: var(--muted);
      font-size: 0.95rem;
    }
    
    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-bottom: 20px;
    }
    
    @media (max-width: 768px) {
      .form-row {
        grid-template-columns: 1fr;
      }
    }
    
    .form-question {
      margin-bottom: 25px;
    }
    
    .form-question label {
      display: block;
      margin-bottom: 8px;
      font-weight: 500;
      color: var(--text);
    }
    
    .required-star {
      color: #ef4444;
      margin-left: 4px;
    }
    
    .question-input,
    .question-textarea,
    .question-select,
    .readonly-input {
      width: 100%;
      padding: 12px 16px;
      background: rgba(255, 255, 255, 0.03);
      border: 2px solid rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      color: var(--text);
      font-size: 0.95rem;
      transition: all 0.2s;
    }
    
    .readonly-input {
      background: rgba(255, 255, 255, 0.02);
      border-color: rgba(255, 255, 255, 0.05);
      cursor: not-allowed;
    }
    
    .question-input:focus,
    .question-textarea:focus,
    .question-select:focus {
      outline: none;
      border-color: #6f65ff;
      background: rgba(255, 255, 255, 0.05);
    }
    
    .question-input.error,
    .question-textarea.error,
    .question-select.error {
      border-color: #ef4444;
    }
    
    .question-textarea {
      resize: vertical;
      min-height: 100px;
      font-family: inherit;
    }
    
    .radio-group,
    .checkbox-group {
      display: flex;
      flex-direction: column;
      gap: 12px;
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: 8px;
      padding: 20px;
    }
    
    .radio-group.error,
    .checkbox-group.error {
      border-color: #ef4444;
    }
    
    .radio-option,
    .checkbox-option {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      cursor: pointer;
      padding: 8px;
      border-radius: 6px;
      transition: all 0.2s;
    }
    
    .radio-option:hover,
    .checkbox-option:hover {
      background: rgba(255, 255, 255, 0.03);
    }
    
    .radio-option input,
    .checkbox-option input {
      margin-top: 4px;
      accent-color: #6f65ff;
    }
    
    .radio-label,
    .checkbox-label {
      flex: 1;
      color: var(--text);
      line-height: 1.5;
    }
    
    .help-text {
      margin-top: 6px;
      font-size: 0.85rem;
      color: var(--muted);
    }
    
    .questionnaire-navigation {
      display: flex;
      justify-content: space-between;
      padding: 20px;
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: 12px;
    }
    
    .btn-prev,
    .btn-next,
    .btn-submit {
      padding: 12px 24px;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 10px;
      transition: all 0.3s;
      border: none;
      font-size: 1rem;
    }
    
    .btn-prev {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: var(--text);
    }
    
    .btn-next {
      background: linear-gradient(135deg, rgba(124, 92, 255, 0.2), rgba(111, 101, 255, 0.1));
      border: 1px solid rgba(124, 92, 255, 0.3);
      color: #93fff6;
    }
    
    .btn-submit {
      background: linear-gradient(135deg, rgba(124, 92, 255, 0.9), rgba(111, 101, 255, 0.9));
      color: white;
    }
    
    .btn-prev:hover,
    .btn-next:hover,
    .btn-submit:hover {
      transform: translateY(-2px);
    }
    
    .btn-prev:hover {
      background: rgba(255, 255, 255, 0.1);
    }
    
    .btn-next:hover {
      background: linear-gradient(135deg, rgba(124, 92, 255, 0.3), rgba(111, 101, 255, 0.2));
    }
    
    .btn-submit:hover {
      opacity: 0.9;
    }
    
    .review-summary {
      background: rgba(255, 255, 255, 0.01);
      border-radius: 8px;
      padding: 20px;
      border: 1px solid rgba(255, 255, 255, 0.05);
    }
    
    .review-section {
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    }
    
    .review-section:last-child {
      border-bottom: none;
      margin-bottom: 0;
      padding-bottom: 0;
    }
    
    .review-section h3 {
      font-size: 1.2rem;
      margin-bottom: 15px;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    
    .review-item {
      margin-bottom: 10px;
      padding: 10px;
      background: rgba(255, 255, 255, 0.02);
      border-radius: 6px;
    }
    
    .review-item strong {
      display: inline-block;
      min-width: 150px;
      color: #93fff6;
    }
    
    .review-note {
      margin-top: 30px;
      padding: 20px;
      background: rgba(245, 158, 11, 0.05);
      border: 1px solid rgba(245, 158, 11, 0.1);
      border-radius: 8px;
    }
    
    .review-note p {
      color: #f59e0b;
      font-weight: 500;
      margin-bottom: 10px;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    
    .review-note ul {
      color: var(--muted);
      padding-left: 20px;
    }
    
    .review-note li {
      margin-bottom: 5px;
    }
    
    .questionnaire-help {
      background: rgba(16, 185, 129, 0.05);
      border: 1px solid rgba(16, 185, 129, 0.1);
      border-radius: 12px;
      padding: 24px;
      margin-top: 40px;
    }
    
    .questionnaire-help h3 {
      color: #10b981;
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 15px;
    }
    
    .questionnaire-help p {
      color: var(--muted);
      margin-bottom: 15px;
    }
    
    .questionnaire-help ul {
      color: var(--muted);
      padding-left: 20px;
    }
    
    .questionnaire-help li {
      margin-bottom: 8px;
    }

    .loading-progress {
  margin: 15px 0;
}

.progress-bar {
  width: 100%;
  height: 4px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  width: 0%;
  background: linear-gradient(to right, #7c5cff, #93fff6);
  border-radius: 2px;
  animation: progressAnimation 10s linear infinite;
}

@keyframes progressAnimation {
  0% { width: 0%; }
  50% { width: 70%; }
  100% { width: 100%; }
}
    
    .questionnaire-loading {
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
      backdrop-filter: blur(5px);
      transition: all 0.3s ease;
    }
    

    
    .loading-content {
      background: var(--panel);
      padding: 40px;
      border-radius: 16px;
      text-align: center;
      border: 1px solid rgba(255, 255, 255, 0.1);
      max-width: 400px;
      width: 90%;
      animation: modalAppear 0.3s ease-out;
    }
    
    @keyframes modalAppear {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    
    .loading-spinner {
      margin: 0 auto 20px;
      width: 60px;
      height: 60px;
    }
    
    .spinner-circle {
      width: 100%;
      height: 100%;
      border: 4px solid rgba(124, 92, 255, 0.2);
      border-top: 4px solid #7c5cff;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }
    
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    
    .loading-text {
      font-size: 1.2rem;
      color: var(--text);
      margin-bottom: 10px;
      font-weight: 500;
    }
    
    .loading-subtext {
      color: var(--muted);
      font-size: 0.9rem;
      margin-bottom: 20px;
    }
    
    .loading-cancel {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: var(--text);
      padding: 8px 20px;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.2s;
      font-size: 0.9rem;
    }
    
    .loading-cancel:hover {
      background: rgba(255, 255, 255, 0.1);
    }

    
    .loading-spinner {
      font-size: 3rem;
      color: #93fff6;
      margin-bottom: 20px;
    }
    
    
  `;

    document.head.appendChild(style);
  }

  initFromHash();

  // Make functions globally accessible
  window.showTicketDetailsModal = showTicketDetailsModal;
  window.closeTicketModal = closeTicketModal;
  window.getUserTickets = getUserTickets;

  // ensure feather icons are loaded into DOM (initial)
  if (window.feather) feather.replace();
});


