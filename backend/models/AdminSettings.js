const mongoose = require('mongoose');

const adminSettingsSchema = new mongoose.Schema({
  key: { type: String, default: 'primary', unique: true },
  chat: {
    autoResponseDelay: { type: Number, default: 5 },
    enableAutoResponses: { type: Boolean, default: true },
    welcomeMessage: { type: String, default: 'Hello! Welcome to Tekagon Support. How can I help you today?' }
  },
  notifications: {
    emailNotifications: { type: Boolean, default: true },
    desktopNotifications: { type: Boolean, default: false },
    sound: { type: String, default: 'default' }
  },
  security: {
    sessionTimeout: { type: Number, default: 30 },
    passwordHash: { type: String, default: '', select: false },
    passwordSalt: { type: String, default: '', select: false }
  },
  data: {
    autoDeleteDays: { type: Number, default: 90 },
    exportFormat: { type: String, default: 'json' }
  }
}, { timestamps: true });

module.exports = mongoose.model('AdminSettings', adminSettingsSchema);
