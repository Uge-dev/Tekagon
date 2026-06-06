const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  serviceName: { type: String, required: true },
  formData: { type: Object, default: {} },
  userId: { type: String, required: true },
  userName: { type: String, default: '' },
  status: { type: String, default: 'pending' },
  priority: { type: String, default: 'normal' },
  adminNotes: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Ticket', ticketSchema);