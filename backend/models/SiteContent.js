const mongoose = require('mongoose');

const socialCardSchema = new mongoose.Schema({
  imageUrl: { type: String, default: '' },
  title: { type: String, default: '' },
  description: { type: String, default: '' },
  profileImageUrl: { type: String, default: '' },
  profileName: { type: String, default: '' },
  profileSubtitle: { type: String, default: '' },
  buttonText: { type: String, default: 'View Now' },
  buttonUrl: { type: String, default: '' }
}, { _id: false });

const speakerSchema = new mongoose.Schema({
  imageUrl: { type: String, default: '' },
  name: { type: String, default: '' },
  bio: { type: String, default: '' },
  socialIconUrl: { type: String, default: '' },
  socialHandle: { type: String, default: '' },
  socialUrl: { type: String, default: '' }
}, { _id: false });

const eventSchema = new mongoose.Schema({
  published: { type: Boolean, default: false },
  bannerImageUrl: { type: String, default: '' },
  title: { type: String, default: '' },
  description: { type: String, default: '' },
  date: { type: String, default: '' },
  time: { type: String, default: '' },
  platformName: { type: String, default: '' },
  platformIconUrl: { type: String, default: '' },
  registerButtonText: { type: String, default: 'Register Now' },
  registerUrl: { type: String, default: '' },
  speakers: { type: [speakerSchema], default: [] }
}, { _id: false });

const siteContentSchema = new mongoose.Schema({
  key: { type: String, unique: true, default: 'dashboard' },
  socialCards: { type: [socialCardSchema], default: [] },
  event: { type: eventSchema, default: () => ({}) }
}, { timestamps: true });

module.exports = mongoose.model('SiteContent', siteContentSchema);
