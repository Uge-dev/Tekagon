const mongoose = require('mongoose');

const authCodeSchema = new mongoose.Schema({
  email: { type: String, required: true, lowercase: true, trim: true, index: true },
  purpose: { type: String, required: true, enum: ['signup', 'password-reset'], index: true },
  codeHash: { type: String, required: true },
  attempts: { type: Number, default: 0 },
  payload: { type: mongoose.Schema.Types.Mixed, default: {} },
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
  createdAt: { type: Date, default: Date.now }
});

authCodeSchema.index({ email: 1, purpose: 1 });

module.exports = mongoose.model('AuthCode', authCodeSchema);
