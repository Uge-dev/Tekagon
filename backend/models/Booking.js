const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, lowercase: true, trim: true, index: true },
  phone: { type: String, required: true, trim: true },
  company: { type: String, required: true, trim: true },
  businessType: { type: String, required: true, trim: true },
  notes: { type: String, default: '' },
  platform: { type: String, default: 'google-meet' },
  date: { type: String, required: true },
  time: { type: String, required: true },
  timezone: { type: String, default: 'Africa/Lagos' },
  guests: { type: [String], default: [] },
  status: { type: String, default: 'confirmed', index: true },
  source: { type: String, default: 'web_scheduler' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Booking', bookingSchema);
