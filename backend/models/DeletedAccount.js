const mongoose = require('mongoose');

const deletedAccountSchema = new mongoose.Schema({
  userId: { type: String, trim: true, index: true },
  email: { type: String, lowercase: true, trim: true, index: true },
  name: { type: String, trim: true },
  deletedAt: { type: Date, default: Date.now },
  reason: { type: String, default: 'admin-delete' }
});

deletedAccountSchema.index({ email: 1, userId: 1 });

module.exports = mongoose.model('DeletedAccount', deletedAccountSchema);
