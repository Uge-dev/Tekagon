const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  clientId: { type: String, index: true },
  sender: { type: String, required: true },          // 'user' | 'admin' | 'bot'
  content: { type: String, required: true },          // WAS 'message' — now 'content' everywhere
  userId: { type: String, required: true },
  ticketId: { type: String, default: null },
  read: { type: Boolean, default: false },
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Message', messageSchema);
