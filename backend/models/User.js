const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  phone: { type: String, default: '' },
  email: { type: String, default: '' },
  company: { type: String, default: '' },
  authProvider: { type: String, default: 'external' },
  passwordHash: { type: String, select: false },
  passwordSalt: { type: String, select: false },
  registeredAt: { type: Date, default: Date.now },
  lastActive: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);
