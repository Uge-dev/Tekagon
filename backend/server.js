const express = require('express');
const cors = require('cors');
const sgMail = require('@sendgrid/mail');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const connectDB = require('./db');
const User = require('./models/User');
const Ticket = require('./models/Ticket');
const Message = require('./models/Message');
const SiteContent = require('./models/SiteContent');
const AdminSettings = require('./models/AdminSettings');
const AuthCode = require('./models/AuthCode');
const DeletedAccount = require('./models/DeletedAccount');

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  fs.readFileSync(filePath, 'utf8').split(/\r?\n/).forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const eq = trimmed.indexOf('=');
    if (eq === -1) return;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  });
}

loadEnvFile(path.join(__dirname, '.env'));
loadEnvFile(path.join(__dirname, '..', '.env'));

connectDB();

const app = express();
const PORT = process.env.PORT || 3000;

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const SENDGRID_TEMPLATE_ID = process.env.SENDGRID_TEMPLATE_ID;
const SENDER_EMAIL = process.env.SENDGRID_SENDER_EMAIL;
const TEAM_BOOKING_EMAIL = process.env.TEAM_BOOKING_EMAIL || process.env.TEKAGON_BOOKING_EMAIL || 'tekagon.digital@gmail.com';
const BREVO_API_KEY = process.env.BREVO_API_KEY;
const CONTACT_RECIPIENT_EMAIL = process.env.CONTACT_RECIPIENT_EMAIL || 'tekagon.digital@gmail.com';
const CONTACT_SENDER_EMAIL = process.env.CONTACT_SENDER_EMAIL;
const CONTACT_SENDER_NAME = process.env.CONTACT_SENDER_NAME || 'Tekagon Website';
const ADMIN_USERNAME = process.env.ADMIN_USERNAME;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

const DEMAND_SERVICES = [
  {
    id: 'brand',
    name: 'Brand Identity & Strategy',
    demandWeight: 1.04,
    aliases: ['brand', 'branding', 'identity', 'logo', 'strategy']
  },
  {
    id: 'product-design',
    name: 'UI/UX & Product Design',
    demandWeight: 1.1,
    aliases: ['ui/ux', 'ui ux', 'ux', 'product design', 'interface design']
  },
  {
    id: 'frontend',
    name: 'Frontend Web Development',
    demandWeight: 1.18,
    aliases: ['frontend', 'front-end', 'website development', 'web development', 'website']
  },
  {
    id: 'backend',
    name: 'Backend & Systems Engineering',
    demandWeight: 1.14,
    aliases: ['backend', 'back-end', 'systems engineering', 'api development', 'system integration']
  },
  {
    id: 'mobile',
    name: 'Mobile Application Development',
    demandWeight: 1.08,
    aliases: ['mobile', 'mobile app', 'application development', 'app development', 'android', 'ios']
  },
  {
    id: 'marketing',
    name: 'Digital Marketing & Growth',
    demandWeight: 1.12,
    aliases: ['digital marketing', 'marketing', 'growth', 'seo', 'social media']
  },
  {
    id: 'devops',
    name: 'DevOps & Cloud Infrastructure',
    demandWeight: 1.16,
    aliases: ['devops', 'cloud', 'infrastructure', 'hosting', 'deployment']
  },
  {
    id: 'consulting',
    name: 'Technical Consulting & Technical Writing',
    demandWeight: 0.98,
    aliases: ['consulting', 'technical writing', 'documentation', 'technical consulting', 'writing']
  },
  {
    id: 'automation',
    name: 'AI & Business Automation',
    demandWeight: 1.22,
    aliases: ['ai', 'automation', 'artificial intelligence', 'machine learning']
  },
  {
    id: 'commerce',
    name: 'E-commerce & Digital Platforms',
    demandWeight: 1.06,
    aliases: ['e-commerce', 'ecommerce', 'commerce', 'digital platform', 'marketplace']
  },
  {
    id: 'quality',
    name: 'Cybersecurity, QA & Optimization',
    demandWeight: 1.13,
    aliases: ['cybersecurity', 'security', 'qa', 'testing', 'optimization', 'performance']
  }
];

function ticketSearchText(ticket) {
  const formData = ticket.formData && typeof ticket.formData === 'object' ? ticket.formData : {};
  return [
    ticket.serviceName,
    formData.service,
    formData.websiteType,
    formData.primaryGoal,
    formData.requiredFeatures,
    formData.industry
  ].flat().filter(Boolean).join(' ').toLowerCase();
}

function demandCategoryFor(ticket) {
  const searchable = ticketSearchText(ticket);
  let bestMatch = null;
  let bestLength = 0;
  DEMAND_SERVICES.forEach(service => {
    service.aliases.forEach(alias => {
      if (searchable.includes(alias) && alias.length > bestLength) {
        bestMatch = service.id;
        bestLength = alias.length;
      }
    });
  });
  return bestMatch;
}

function getEmailName(email) {
  return (email || '').split('@')[0].replace(/[._-]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || 'User';
}

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.pbkdf2Sync(password, salt, 120000, 64, 'sha512').toString('hex');
  return { salt, hash };
}

function verifyPassword(password, user) {
  if (!user?.passwordHash || !user?.passwordSalt) return false;
  const { hash } = hashPassword(password, user.passwordSalt);
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(user.passwordHash, 'hex'));
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function normalizeUsername(name) {
  return String(name || '').trim().replace(/\s+/g, ' ').toLowerCase();
}

function escapeRegExp(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function isDeletedAccount({ userId = '', email = '' } = {}) {
  const filters = [];
  if (userId) filters.push({ userId });
  const normalizedEmail = normalizeEmail(email);
  if (normalizedEmail) filters.push({ email: normalizedEmail });
  if (!filters.length) return false;
  return Boolean(await DeletedAccount.exists({ $or: filters }));
}

async function findUserBySessionIdentity(userId, email = '') {
  const filters = [];
  if (userId) filters.push({ userId });
  const normalizedEmail = normalizeEmail(email);
  if (normalizedEmail) filters.push({ email: normalizedEmail });
  if (!filters.length) return null;
  return User.findOne({ $or: filters }).sort({ lastActive: -1 });
}

function createNumericCode() {
  return String(crypto.randomInt(100000, 1000000));
}

function hashAuthCode(email, purpose, code) {
  return crypto
    .createHash('sha256')
    .update(`${normalizeEmail(email)}:${purpose}:${String(code).trim()}`)
    .digest('hex');
}

async function sendAuthCodeEmail({ email, name, code, purpose }) {
  if (!SENDGRID_API_KEY || !SENDER_EMAIL || !email) {
    return { sent: false, error: 'Email service is not configured' };
  }

  const isReset = purpose === 'password-reset';
  const subject = isReset ? 'Reset your Tekagon password' : 'Verify your Tekagon email';
  const headline = isReset ? 'Password reset code' : 'Email verification code';
  const intro = isReset
    ? 'Use this code to reset your Tekagon password.'
    : 'Use this code to verify your email and finish creating your Tekagon account.';

  try {
    const [result] = await sgMail.send({
      to: email,
      from: SENDER_EMAIL,
      subject,
      text: `Hello ${name || 'there'},\n\n${intro}\n\nCode: ${code}\n\nThis code expires in 15 minutes. If you did not request this, you can ignore this email.\n\nTekagon Team`,
      html: `
        <div style="font-family:Arial,sans-serif;background:#050713;color:#e2e8f0;padding:28px;">
          <div style="max-width:520px;margin:auto;background:#111827;border:1px solid rgba(147,255,246,.18);border-radius:16px;padding:28px;">
            <h2 style="margin:0 0 10px;color:#93fff6;">${headline}</h2>
            <p style="line-height:1.6;color:#cbd5e1;">Hello ${name || 'there'},</p>
            <p style="line-height:1.6;color:#cbd5e1;">${intro}</p>
            <div style="font-size:32px;letter-spacing:8px;font-weight:700;color:#ffffff;background:linear-gradient(135deg,#6f65ff,#163a45);border-radius:12px;padding:18px;text-align:center;margin:24px 0;">${code}</div>
            <p style="line-height:1.6;color:#94a3b8;">This code expires in 15 minutes. If you did not request this, you can ignore this email.</p>
            <p style="margin-top:28px;color:#cbd5e1;">Tekagon Team</p>
          </div>
        </div>
      `
    });
    return { sent: true, messageId: result?.headers?.['x-message-id'] || null };
  } catch (error) {
    console.error('Auth code email failed:', error.message);
    return { sent: false, error: error.message };
  }
}

async function sendWelcomeEmail(user) {
  if (!SENDGRID_API_KEY || !SENDER_EMAIL || !user?.email) return { sent: false };
  try {
    const [result] = await sgMail.send({
      to: user.email,
      from: SENDER_EMAIL,
      subject: 'Welcome to Tekagon',
      text: `Hello ${user.name || 'there'},\n\nWelcome to Tekagon. Your account is ready, and you can now book sessions, order services, create tickets, and chat with our team from your dashboard.\n\nTekagon Team`
    });
    return { sent: true, messageId: result?.headers?.['x-message-id'] || null };
  } catch (error) {
    console.error('Welcome email failed:', error.message);
    return { sent: false, error: error.message };
  }
}

function safeCompare(left, right) {
  const leftBuffer = Buffer.from(left || '');
  const rightBuffer = Buffer.from(right || '');
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

const DEFAULT_SOCIAL_CARDS = [
  {
    imageUrl: '../Images/trending (2).jpeg',
    title: 'Social Betting Platform',
    description: 'Atreides returns, Business visibility can be enhanced by design',
    profileImageUrl: '../Images/thumb_1.png',
    profileName: 'Luelink',
    profileSubtitle: 'Social betting',
    buttonText: 'View Now',
    buttonUrl: ''
  },
  {
    imageUrl: '../Images/trending (1).jpeg',
    title: 'All In one Solution',
    description: 'Atreides returns, Business visibility can be enhanced by design',
    profileImageUrl: '../Images/thumb_2.png',
    profileName: 'TeckIQ',
    profileSubtitle: 'Tech Services',
    buttonText: 'View Now',
    buttonUrl: ''
  },
  {
    imageUrl: '../Images/trending (3).jpeg',
    title: 'Food Brand',
    description: 'Atreides returns, Business visibility can be enhanced by design',
    profileImageUrl: '../Images/thumb_3.png',
    profileName: 'Deylish Kitchen',
    profileSubtitle: 'All in one movies',
    buttonText: 'View Now',
    buttonUrl: ''
  },
  {
    imageUrl: 'https://images.unsplash.com/photo-1524985069026-dd778a71c7b4?auto=format&fit=crop&w=800&q=60',
    title: 'Medical Branding',
    description: 'Atreides returns, Business visibility can be enhanced by design',
    profileImageUrl: '../Images/thumb_4.png',
    profileName: 'City of Hope',
    profileSubtitle: 'Medical treatment & services',
    buttonText: 'View Now',
    buttonUrl: ''
  }
];

const DEFAULT_EVENT = {
  published: false,
  bannerImageUrl: '',
  title: 'Raising Brand Ambassadors',
  description: '',
  date: '',
  time: '',
  platformName: 'Google Meet',
  platformIconUrl: '',
  registerButtonText: 'Register Now',
  registerUrl: '',
  speakers: []
};

function sanitizeText(value, maxLength = 500) {
  return String(value || '').trim().slice(0, maxLength);
}

function sanitizeUrl(value) {
  const url = sanitizeText(value, 2000);
  if (!url) return '';
  if (/^(https?:\/\/|\/|\.\.?\/)/i.test(url)) return url;
  return '';
}

function normalizeSocialCard(card = {}) {
  return {
    imageUrl: sanitizeUrl(card.imageUrl),
    title: sanitizeText(card.title, 120),
    description: sanitizeText(card.description, 500),
    profileImageUrl: sanitizeUrl(card.profileImageUrl),
    profileName: sanitizeText(card.profileName, 120),
    profileSubtitle: sanitizeText(card.profileSubtitle, 180),
    buttonText: sanitizeText(card.buttonText, 60) || 'View Now',
    buttonUrl: sanitizeUrl(card.buttonUrl)
  };
}

function normalizeEvent(event = {}) {
  const speakers = Array.isArray(event.speakers) ? event.speakers.slice(0, 12) : [];
  return {
    published: Boolean(event.published),
    bannerImageUrl: sanitizeUrl(event.bannerImageUrl),
    title: sanitizeText(event.title, 120),
    description: sanitizeText(event.description, 1200),
    date: sanitizeText(event.date, 80),
    time: sanitizeText(event.time, 80),
    platformName: sanitizeText(event.platformName, 120),
    platformIconUrl: sanitizeUrl(event.platformIconUrl),
    registerButtonText: sanitizeText(event.registerButtonText, 60) || 'Register Now',
    registerUrl: sanitizeUrl(event.registerUrl),
    speakers: speakers.map(speaker => ({
      imageUrl: sanitizeUrl(speaker.imageUrl),
      name: sanitizeText(speaker.name, 120),
      bio: sanitizeText(speaker.bio, 600),
      socialIconUrl: sanitizeUrl(speaker.socialIconUrl),
      socialHandle: sanitizeText(speaker.socialHandle, 120),
      socialUrl: sanitizeUrl(speaker.socialUrl)
    }))
  };
}

function createAdminToken(username) {
  const payload = Buffer.from(JSON.stringify({
    username,
    expiresAt: Date.now() + (8 * 60 * 60 * 1000)
  })).toString('base64url');
  const signature = crypto.createHmac('sha256', ADMIN_PASSWORD).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

function requireAdmin(req, res, next) {
  if (!ADMIN_USERNAME || !ADMIN_PASSWORD) {
    return res.status(500).json({ success: false, error: 'Admin credentials are not configured' });
  }
  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  const [payload, signature] = token.split('.');
  if (!payload || !signature) {
    return res.status(401).json({ success: false, error: 'Admin login required' });
  }
  const expected = crypto.createHmac('sha256', ADMIN_PASSWORD).update(payload).digest('base64url');
  if (!safeCompare(signature, expected)) {
    return res.status(401).json({ success: false, error: 'Invalid admin session' });
  }
  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (parsed.username !== ADMIN_USERNAME || parsed.expiresAt < Date.now()) {
      return res.status(401).json({ success: false, error: 'Admin session expired' });
    }
    next();
  } catch (error) {
    return res.status(401).json({ success: false, error: 'Invalid admin session' });
  }
}

if (!SENDGRID_API_KEY) {
  console.warn('WARNING: No SendGrid API key found. Email routes will fail until SENDGRID_API_KEY is configured.');
} else {
  sgMail.setApiKey(SENDGRID_API_KEY);
}

app.use(cors({ origin: '*' }));
app.options('*', cors());
app.use(express.json());

// ── HEALTH ──────────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ success: true, status: 'running', timestamp: new Date().toISOString() });
});

app.get('/api/debug-sendgrid', (req, res) => {
  res.json({
    success: true,
    sendgrid: {
      configured: Boolean(SENDGRID_API_KEY && SENDER_EMAIL),
      hasApiKey: Boolean(SENDGRID_API_KEY),
      hasSenderEmail: Boolean(SENDER_EMAIL),
      hasTemplateId: Boolean(SENDGRID_TEMPLATE_ID),
      senderEmail: SENDER_EMAIL || null,
      templateId: SENDGRID_TEMPLATE_ID || null
    }
  });
});

// ── USER ROUTES ──────────────────────────────────────────────────────────────
app.post('/api/users/register', async (req, res) => {
  try {
    const { userId, name, phone, email, company } = req.body;
    if (!userId || !name) {
      return res.status(400).json({ success: false, error: 'userId and name are required' });
    }

    const normalizedEmail = normalizeEmail(email);
    if (await isDeletedAccount({ userId, email: normalizedEmail })) {
      return res.status(403).json({ success: false, deleted: true, error: 'This account has been deleted by admin. Please contact support.' });
    }

    const existing = normalizedEmail
      ? await User.findOne({ $or: [{ userId }, { email: normalizedEmail }] }).sort({ lastActive: -1 })
      : await User.findOne({ userId });
    const canonicalUserId = existing?.userId || userId;
    const user = await User.findOneAndUpdate(
      { userId: canonicalUserId },
      {
        $set: {
          name,
          phone: phone || '',
          email: normalizedEmail,
          company: company || '',
          lastActive: new Date()
        },
        $setOnInsert: { registeredAt: new Date() }
      },
      { new: true, upsert: true, runValidators: true }
    );
    const created = !existing;
    const welcomeEmail = created ? await sendWelcomeEmail(user) : { sent: false };
    res.json({ success: true, user, created, welcomeEmailSent: welcomeEmail.sent });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/auth/signup', async (req, res) => {
  try {
    const { name, email, password, phone = '', company = '' } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, error: 'Name, email, and password are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, error: 'Password must be at least 6 characters' });
    }

    const normalizedEmail = normalizeEmail(email);
    const normalizedName = normalizeUsername(name);
    if (await isDeletedAccount({ email: normalizedEmail })) {
      return res.status(403).json({ success: false, deleted: true, error: 'This account has been deleted by admin. Please contact support.' });
    }

    const existing = await User.findOne({ email: normalizedEmail }).sort({ lastActive: -1 }).select('+passwordHash +passwordSalt');
    if (existing) {
      return res.status(409).json({ success: false, error: 'An account with this email already exists' });
    }
    const sameUsername = await User.findOne({
      name: { $regex: `^${escapeRegExp(normalizedName)}$`, $options: 'i' }
    }).lean();
    if (sameUsername) {
      return res.status(409).json({ success: false, error: 'This username is already in use. Please choose another name.' });
    }

    const { salt, hash } = hashPassword(password);
    const userId = `EMAIL_${crypto.createHash('sha256').update(normalizedEmail).digest('hex').slice(0, 24)}`;
    const code = createNumericCode();
    const emailResult = await sendAuthCodeEmail({ email: normalizedEmail, name, code, purpose: 'signup' });
    if (!emailResult.sent) {
      return res.status(503).json({ success: false, error: 'Email verification service is not configured. Please contact support.' });
    }

    await AuthCode.deleteMany({ email: normalizedEmail, purpose: 'signup' });
    await AuthCode.create({
      email: normalizedEmail,
      purpose: 'signup',
      codeHash: hashAuthCode(normalizedEmail, 'signup', code),
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      payload: {
        userId,
        name,
        phone,
        company,
        authProvider: 'email',
        passwordHash: hash,
        passwordSalt: salt,
        existingUserId: ''
      }
    });

    res.json({
      success: true,
      requiresVerification: true,
      email: normalizedEmail,
      message: 'Verification code sent to your email.'
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/auth/signup/verify', async (req, res) => {
  try {
    const normalizedEmail = normalizeEmail(req.body.email);
    const code = String(req.body.code || '').trim();
    if (!normalizedEmail || !code) {
      return res.status(400).json({ success: false, error: 'Email and verification code are required' });
    }

    const authCode = await AuthCode.findOne({ email: normalizedEmail, purpose: 'signup' }).sort({ createdAt: -1 });
    if (!authCode || authCode.expiresAt < new Date()) {
      return res.status(400).json({ success: false, error: 'Verification code expired. Please request a new code.' });
    }
    if (authCode.attempts >= 5) {
      await AuthCode.deleteOne({ _id: authCode._id });
      return res.status(429).json({ success: false, error: 'Too many attempts. Please request a new code.' });
    }
    if (!safeCompare(authCode.codeHash, hashAuthCode(normalizedEmail, 'signup', code))) {
      authCode.attempts += 1;
      await authCode.save();
      return res.status(400).json({ success: false, error: 'Invalid verification code' });
    }

    const existing = await User.findOne({ email: normalizedEmail }).sort({ lastActive: -1 }).select('+passwordHash +passwordSalt');
    if (await isDeletedAccount({ email: normalizedEmail })) {
      await AuthCode.deleteMany({ email: normalizedEmail, purpose: 'signup' });
      return res.status(403).json({ success: false, deleted: true, error: 'This account has been deleted by admin. Please contact support.' });
    }
    if (existing) {
      await AuthCode.deleteMany({ email: normalizedEmail, purpose: 'signup' });
      return res.status(409).json({ success: false, error: 'An account with this email already exists' });
    }

    const payload = authCode.payload || {};
    const normalizedName = normalizeUsername(payload.name);
    const sameUsername = await User.findOne({
      name: { $regex: `^${escapeRegExp(normalizedName)}$`, $options: 'i' }
    }).lean();
    if (sameUsername) {
      await AuthCode.deleteMany({ email: normalizedEmail, purpose: 'signup' });
      return res.status(409).json({ success: false, error: 'This username is already in use. Please choose another name.' });
    }

    const userId = payload.existingUserId || payload.userId || `EMAIL_${crypto.createHash('sha256').update(normalizedEmail).digest('hex').slice(0, 24)}`;
    const user = await User.findOneAndUpdate(
      { userId },
      {
        $set: {
          name: payload.name || getEmailName(normalizedEmail),
          phone: payload.phone || '',
          email: normalizedEmail,
          company: payload.company || '',
          authProvider: payload.authProvider || 'email',
          passwordHash: payload.passwordHash,
          passwordSalt: payload.passwordSalt,
          lastActive: new Date()
        },
        $setOnInsert: { registeredAt: new Date() }
      },
      { new: true, upsert: true, runValidators: true }
    );

    await AuthCode.deleteMany({ email: normalizedEmail, purpose: 'signup' });
    const welcomeEmail = await sendWelcomeEmail(user);
    res.json({
      success: true,
      created: true,
      welcomeEmailSent: welcomeEmail.sent,
      user: { userId: user.userId, name: user.name, phone: user.phone, email: user.email, company: user.company }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/auth/password/forgot', async (req, res) => {
  try {
    const normalizedEmail = normalizeEmail(req.body.email);
    if (!normalizedEmail) {
      return res.status(400).json({ success: false, error: 'Email is required' });
    }

    const user = await User.findOne({ email: normalizedEmail }).sort({ lastActive: -1 }).select('+passwordHash +passwordSalt');
    if (!user?.passwordHash) {
      return res.json({ success: true, message: 'If this email exists, a reset code has been sent.' });
    }

    const code = createNumericCode();
    const emailResult = await sendAuthCodeEmail({ email: normalizedEmail, name: user.name, code, purpose: 'password-reset' });
    if (!emailResult.sent) {
      return res.status(503).json({ success: false, error: 'Password reset email service is not configured. Please contact support.' });
    }

    await AuthCode.deleteMany({ email: normalizedEmail, purpose: 'password-reset' });
    await AuthCode.create({
      email: normalizedEmail,
      purpose: 'password-reset',
      codeHash: hashAuthCode(normalizedEmail, 'password-reset', code),
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      payload: { userId: user.userId }
    });

    res.json({ success: true, message: 'If this email exists, a reset code has been sent.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/auth/password/reset', async (req, res) => {
  try {
    const normalizedEmail = normalizeEmail(req.body.email);
    const code = String(req.body.code || '').trim();
    const password = String(req.body.password || '');
    if (!normalizedEmail || !code || !password) {
      return res.status(400).json({ success: false, error: 'Email, reset code, and new password are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, error: 'Password must be at least 6 characters' });
    }

    const authCode = await AuthCode.findOne({ email: normalizedEmail, purpose: 'password-reset' }).sort({ createdAt: -1 });
    if (!authCode || authCode.expiresAt < new Date()) {
      return res.status(400).json({ success: false, error: 'Reset code expired. Please request a new code.' });
    }
    if (authCode.attempts >= 5) {
      await AuthCode.deleteOne({ _id: authCode._id });
      return res.status(429).json({ success: false, error: 'Too many attempts. Please request a new code.' });
    }
    if (!safeCompare(authCode.codeHash, hashAuthCode(normalizedEmail, 'password-reset', code))) {
      authCode.attempts += 1;
      await authCode.save();
      return res.status(400).json({ success: false, error: 'Invalid reset code' });
    }

    const user = await User.findOne({ email: normalizedEmail }).sort({ lastActive: -1 }).select('+passwordHash +passwordSalt');
    if (!user?.passwordHash) {
      return res.status(404).json({ success: false, error: 'User not found. Please create an account first.' });
    }

    const { salt, hash } = hashPassword(password);
    user.passwordSalt = salt;
    user.passwordHash = hash;
    user.authProvider = user.authProvider || 'email';
    user.lastActive = new Date();
    await user.save();
    await AuthCode.deleteMany({ email: normalizedEmail, purpose: 'password-reset' });

    res.json({ success: true, message: 'Password reset successfully. You can now sign in.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/auth/signin', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required' });
    }

    const normalizedEmail = normalizeEmail(email);
    if (await isDeletedAccount({ email: normalizedEmail })) {
      return res.status(403).json({ success: false, deleted: true, error: 'This account has been deleted by admin. Please contact support.' });
    }

    const matchingUsers = await User.find({ email: normalizedEmail })
      .sort({ lastActive: -1 })
      .select('+passwordHash +passwordSalt');
    if (!matchingUsers.length) {
      return res.status(404).json({ success: false, error: 'User not found. Please create an account first.' });
    }
    const user = matchingUsers.find(candidate => verifyPassword(password, candidate));
    if (!verifyPassword(password, user)) {
      return res.status(401).json({ success: false, error: 'Incorrect password' });
    }

    user.lastActive = new Date();
    await user.save();
    res.json({ success: true, user: { userId: user.userId, name: user.name || getEmailName(user.email), phone: user.phone, email: user.email, company: user.company } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/admin/login', async (req, res) => {
  try {
    if (!ADMIN_USERNAME || !ADMIN_PASSWORD) {
      return res.status(500).json({ success: false, error: 'Admin credentials are not configured' });
    }

    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, error: 'Username and password are required' });
    }

    const settings = await AdminSettings.findOne({ key: 'primary' }).select('+security.passwordHash +security.passwordSalt');
    const passwordMatches = settings?.security?.passwordHash
      ? verifyPassword(password, {
        passwordHash: settings.security.passwordHash,
        passwordSalt: settings.security.passwordSalt
      })
      : safeCompare(password, ADMIN_PASSWORD);
    if (!safeCompare(username, ADMIN_USERNAME) || !passwordMatches) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    const timeoutMinutes = Math.min(Math.max(settings?.security?.sessionTimeout || 30, 5), 240);
    const token = createAdminToken(username);
    const [payload] = token.split('.');
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    parsed.expiresAt = Date.now() + timeoutMinutes * 60 * 1000;
    const nextPayload = Buffer.from(JSON.stringify(parsed)).toString('base64url');
    const signature = crypto.createHmac('sha256', ADMIN_PASSWORD).update(nextPayload).digest('base64url');
    res.json({ success: true, token: `${nextPayload}.${signature}` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.patch('/api/users/:userId/activity', async (req, res) => {
  try {
    if (await isDeletedAccount({ userId: req.params.userId })) {
      return res.status(403).json({ success: false, deleted: true, error: 'This account has been deleted by admin' });
    }
    const user = await User.findOneAndUpdate(
      { userId: req.params.userId },
      { lastActive: new Date() },
      { new: true }
    );
    res.json({ success: Boolean(user), lastActive: user?.lastActive || null });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/users/:userId/session', async (req, res) => {
  try {
    const email = normalizeEmail(req.query.email || '');
    if (await isDeletedAccount({ userId: req.params.userId, email })) {
      return res.status(403).json({ success: false, deleted: true, error: 'This account has been deleted by admin' });
    }
    const user = await findUserBySessionIdentity(req.params.userId, email);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found. Please create an account first.' });
    }
    user.lastActive = new Date();
    await user.save();
    res.json({
      success: true,
      user: { userId: user.userId, name: user.name, phone: user.phone, email: user.email, company: user.company }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── MANAGED DASHBOARD CONTENT ────────────────────────────────────────────────
app.get('/api/content/dashboard', async (req, res) => {
  try {
    const content = await SiteContent.findOne({ key: 'dashboard' }).lean();
    res.json({
      success: true,
      content: {
        socialCards: content?.socialCards?.length === 4 ? content.socialCards : DEFAULT_SOCIAL_CARDS,
        event: content?.event ? { ...DEFAULT_EVENT, ...content.event } : DEFAULT_EVENT,
        updatedAt: content?.updatedAt || null
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/api/admin/content/social-cards/:index', requireAdmin, async (req, res) => {
  try {
    const index = Number(req.params.index);
    if (!Number.isInteger(index) || index < 0 || index > 3) {
      return res.status(400).json({ success: false, error: 'Card index must be between 0 and 3' });
    }

    const existing = await SiteContent.findOne({ key: 'dashboard' }).lean();
    const cards = existing?.socialCards?.length === 4
      ? existing.socialCards.map(card => normalizeSocialCard(card))
      : DEFAULT_SOCIAL_CARDS.map(card => ({ ...card }));
    cards[index] = normalizeSocialCard(req.body);

    const content = await SiteContent.findOneAndUpdate(
      { key: 'dashboard' },
      { $set: { socialCards: cards }, $setOnInsert: { event: DEFAULT_EVENT } },
      { new: true, upsert: true, runValidators: true }
    );
    res.json({ success: true, socialCards: content.socialCards });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/api/admin/content/event', requireAdmin, async (req, res) => {
  try {
    const event = normalizeEvent(req.body);
    const content = await SiteContent.findOneAndUpdate(
      { key: 'dashboard' },
      { $set: { event }, $setOnInsert: { socialCards: DEFAULT_SOCIAL_CARDS } },
      { new: true, upsert: true, runValidators: true }
    );
    res.json({ success: true, event: content.event });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find().sort({ registeredAt: -1 });
    res.json({ success: true, users });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/admin/conversations', requireAdmin, async (req, res) => {
  try {
    const [users, messages] = await Promise.all([
      User.find().sort({ lastActive: -1 }).lean(),
      Message.find().sort({ timestamp: 1 }).lean()
    ]);
    const usersById = {};
    const canonicalUserIds = {};
    users.forEach(user => {
      const identity = String(user.email || user.userId).trim().toLowerCase();
      if (!canonicalUserIds[identity]) {
        canonicalUserIds[identity] = user.userId;
        usersById[user.userId] = user;
      }
      canonicalUserIds[user.userId] = canonicalUserIds[identity];
    });
    const conversations = {};

    messages.forEach(message => {
      const canonicalUserId = canonicalUserIds[message.userId] || message.userId;
      if (!usersById[canonicalUserId]) return;
      if (!conversations[canonicalUserId]) conversations[canonicalUserId] = [];
      conversations[canonicalUserId].push({ ...message, userId: canonicalUserId });
    });

    res.json({ success: true, users: usersById, conversations });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/admin/settings', requireAdmin, async (req, res) => {
  try {
    const settings = await AdminSettings.findOneAndUpdate(
      { key: 'primary' },
      { $setOnInsert: { key: 'primary' } },
      { new: true, upsert: true }
    ).lean();
    if (settings?.security) {
      delete settings.security.passwordHash;
      delete settings.security.passwordSalt;
    }
    res.json({ success: true, settings });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/api/admin/settings', requireAdmin, async (req, res) => {
  try {
    const input = req.body || {};
    const update = {
      chat: {
        autoResponseDelay: Math.min(Math.max(Number(input.chat?.autoResponseDelay) || 0, 0), 60),
        enableAutoResponses: Boolean(input.chat?.enableAutoResponses),
        welcomeMessage: sanitizeText(input.chat?.welcomeMessage, 1000)
      },
      notifications: {
        emailNotifications: Boolean(input.notifications?.emailNotifications),
        desktopNotifications: Boolean(input.notifications?.desktopNotifications),
        sound: ['default', 'chime', 'bell', 'none'].includes(input.notifications?.sound)
          ? input.notifications.sound
          : 'default'
      },
      'security.sessionTimeout': Math.min(Math.max(Number(input.security?.sessionTimeout) || 30, 5), 240),
      data: {
        autoDeleteDays: Math.min(Math.max(Number(input.data?.autoDeleteDays) || 90, 1), 365),
        exportFormat: ['json', 'csv', 'txt'].includes(input.data?.exportFormat)
          ? input.data.exportFormat
          : 'json'
      }
    };
    const settings = await AdminSettings.findOneAndUpdate(
      { key: 'primary' },
      { $set: update, $setOnInsert: { key: 'primary' } },
      { new: true, upsert: true, runValidators: true }
    ).lean();
    if (settings?.security) {
      delete settings.security.passwordHash;
      delete settings.security.passwordSalt;
    }
    const cutoff = new Date(Date.now() - settings.data.autoDeleteDays * 24 * 60 * 60 * 1000);
    const cleanup = await Message.deleteMany({ timestamp: { $lt: cutoff } });
    res.json({ success: true, settings, deletedExpiredMessages: cleanup.deletedCount });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/api/admin/settings/password', requireAdmin, async (req, res) => {
  try {
    const password = String(req.body.password || '');
    if (password.length < 8) {
      return res.status(400).json({ success: false, error: 'Password must be at least 8 characters' });
    }
    const { salt, hash } = hashPassword(password);
    await AdminSettings.findOneAndUpdate(
      { key: 'primary' },
      {
        $set: {
          'security.passwordHash': hash,
          'security.passwordSalt': salt
        },
        $setOnInsert: { key: 'primary' }
      },
      { new: true, upsert: true }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/admin/conversations/:userId', requireAdmin, async (req, res) => {
  try {
    const result = await Message.deleteMany({ userId: req.params.userId });
    res.json({ success: true, deletedMessages: result.deletedCount });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/admin/users/:userId', requireAdmin, async (req, res) => {
  try {
    const userId = req.params.userId;
    const user = await User.findOne({ userId }).lean();
    const relatedUsers = user?.email
      ? await User.find({ email: user.email }, { userId: 1, email: 1, name: 1 }).lean()
      : await User.find({ userId }, { userId: 1, email: 1, name: 1 }).lean();
    const relatedUserIds = [...new Set(relatedUsers.map(item => item.userId).filter(Boolean))];
    const deletedMarkers = relatedUsers.length ? relatedUsers : [{ userId, email: user?.email || '', name: user?.name || '' }];
    await Promise.all(deletedMarkers.map(item => DeletedAccount.findOneAndUpdate(
      {
        $or: [
          ...(item.userId ? [{ userId: item.userId }] : []),
          ...(item.email ? [{ email: normalizeEmail(item.email) }] : [])
        ]
      },
      {
        $set: {
          userId: item.userId || userId,
          email: normalizeEmail(item.email || user?.email || ''),
          name: item.name || user?.name || '',
          deletedAt: new Date(),
          reason: 'admin-delete'
        }
      },
      { upsert: true, new: true }
    )));

    const [userResult, messageResult, ticketResult, authCodeResult] = await Promise.all([
      User.deleteMany({ userId: { $in: relatedUserIds } }),
      Message.deleteMany({ userId: { $in: relatedUserIds } }),
      Ticket.deleteMany({ userId: { $in: relatedUserIds } }),
      AuthCode.deleteMany({
        $or: [
          { email: { $in: deletedMarkers.map(item => normalizeEmail(item.email)).filter(Boolean) } },
          { 'payload.userId': { $in: relatedUserIds } }
        ]
      })
    ]);
    res.json({
      success: true,
      deletedUser: userResult.deletedCount,
      deletedMessages: messageResult.deletedCount,
      deletedTickets: ticketResult.deletedCount,
      deletedAuthCodes: authCodeResult.deletedCount
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/admin/messages/older-than/:days', requireAdmin, async (req, res) => {
  try {
    const days = Math.min(Math.max(Number(req.params.days) || 90, 1), 3650);
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const result = await Message.deleteMany({ timestamp: { $lt: cutoff } });
    res.json({ success: true, deletedMessages: result.deletedCount, cutoff });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/admin/messages/broadcast', requireAdmin, async (req, res) => {
  try {
    const content = sanitizeText(req.body.content, 2000);
    if (!content) return res.status(400).json({ success: false, error: 'Message is required' });
    const users = await User.find({}, { userId: 1 }).lean();
    const userIds = [...new Set(users.map(user => user.userId).filter(Boolean))];
    if (!userIds.length) return res.json({ success: true, sent: 0, messages: [] });

    const messages = await Message.insertMany(userIds.map(userId => ({
      clientId: `broadcast_${Date.now()}_${userId}`,
      sender: 'admin',
      content,
      userId,
      ticketId: null,
      read: false
    })));
    res.json({ success: true, sent: messages.length, messages });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/admin/email', requireAdmin, async (req, res) => {
  try {
    if (!SENDGRID_API_KEY || !SENDER_EMAIL) {
      return res.status(503).json({ success: false, error: 'SendGrid is not configured' });
    }
    const subject = sanitizeText(req.body.subject, 200);
    const message = sanitizeText(req.body.message, 10000);
    const requestedUserIds = Array.isArray(req.body.userIds) ? req.body.userIds : [];
    if (!subject || !message) {
      return res.status(400).json({ success: false, error: 'Subject and message are required' });
    }

    const query = requestedUserIds.length ? { userId: { $in: requestedUserIds } } : { email: { $ne: '' } };
    const users = await User.find(query).lean();
    const recipients = [...new Set(users.map(user => user.email).filter(Boolean))];
    if (!recipients.length) {
      return res.status(400).json({ success: false, error: 'No user email addresses were found' });
    }

    await Promise.all(recipients.map(email => sgMail.send({
      to: email,
      from: SENDER_EMAIL,
      subject,
      text: message
    })));
    res.json({ success: true, sent: recipients.length });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── TICKET ROUTES ─────────────────────────────────────────────────────────────
app.post('/api/tickets/create', async (req, res) => {
  try {
    if (await isDeletedAccount({ userId: req.body.userId })) {
      return res.status(403).json({ success: false, deleted: true, error: 'This account has been deleted by admin' });
    }
    const ticket = await Ticket.create(req.body);
    res.json({ success: true, ticket });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/tickets/user/:userId', async (req, res) => {
  try {
    if (await isDeletedAccount({ userId: req.params.userId })) {
      return res.status(403).json({ success: false, deleted: true, tickets: [], error: 'This account has been deleted by admin' });
    }
    const tickets = await Ticket.find({ userId: req.params.userId }).sort({ createdAt: -1 });
    res.json({ success: true, tickets });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/tickets/all', async (req, res) => {
  try {
    const tickets = await Ticket.find().sort({ createdAt: -1 });
    res.json({ success: true, tickets });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/market-demand', async (req, res) => {
  try {
    res.set('Cache-Control', 'no-store');
    const now = new Date();
    const currentYear = now.getUTCFullYear();
    const yearStart = new Date(Date.UTC(currentYear, 0, 1));
    const dayOfYear = Math.max(1, Math.floor((now - yearStart) / (24 * 60 * 60 * 1000)) + 1);
    const currentWindowStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const previousWindowStart = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
    const tickets = await Ticket.find({
      createdAt: { $gte: yearStart },
      status: { $ne: 'cancelled' }
    }, {
      serviceName: 1,
      formData: 1,
      createdAt: 1
    }).lean();

    const metrics = Object.fromEntries(DEMAND_SERVICES.map(service => [service.id, {
      ...service,
      yearRequests: 0,
      currentRequests: 0,
      previousRequests: 0,
      weightedDemand: 0
    }]));

    tickets.forEach(ticket => {
      const categoryId = demandCategoryFor(ticket);
      if (!categoryId) return;
      const metric = metrics[categoryId];
      const createdAt = new Date(ticket.createdAt);
      const ageDays = Math.max(0, (now - createdAt) / (24 * 60 * 60 * 1000));
      metric.yearRequests++;
      metric.weightedDemand += Math.exp(-ageDays / 45);
      if (createdAt >= currentWindowStart) metric.currentRequests++;
      else if (createdAt >= previousWindowStart) metric.previousRequests++;
    });

    const indexedServices = DEMAND_SERVICES.map((service, index) => {
      const metric = metrics[service.id];
      const activityGrowth = metric.previousRequests > 0
        ? Math.round(((metric.currentRequests - metric.previousRequests) / metric.previousRequests) * 100)
        : metric.currentRequests > 0 ? 15 : 0;
      const seasonalTrend = Math.round(6 + (Math.sin((dayOfYear + index * 17) / 24) * 4));
      const growth = Math.max(1, seasonalTrend + Math.round(activityGrowth * 0.25));
      const ytdIndex = Math.max(1, Math.round(
        dayOfYear * service.demandWeight +
        metric.yearRequests * 12 +
        metric.weightedDemand * 8
      ));
      return {
        id: service.id,
        name: service.name,
        ytdIndex,
        growth,
        requests: metric.yearRequests,
        recentRequests: metric.currentRequests,
        year: currentYear
      };
    });
    const highestIndex = Math.max(...indexedServices.map(service => service.ytdIndex));
    const lowestIndex = Math.min(...indexedServices.map(service => service.ytdIndex));
    const indexRange = Math.max(1, highestIndex - lowestIndex);
    const services = indexedServices.map(service => ({
      ...service,
      score: Math.round(42 + ((service.ytdIndex - lowestIndex) / indexRange) * 58)
    }));

    res.json({
      success: true,
      source: 'Tekagon year-to-date demand index',
      methodology: 'The index combines elapsed days in the current year, category trend weighting, and confirmed Tekagon service-ticket activity. Request totals remain actual database records.',
      updatedAt: now.toISOString(),
      dayOfYear,
      chart: services.slice(0, 8),
      services
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.patch('/api/tickets/:ticketId/status', async (req, res) => {
  try {
    const ticket = await Ticket.findOneAndUpdate(
      { id: req.params.ticketId },
      { status: req.body.status, updatedAt: new Date() },
      { new: true }
    );
    res.json({ success: true, ticket });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.patch('/api/admin/tickets/:ticketId/notes', requireAdmin, async (req, res) => {
  try {
    const ticket = await Ticket.findOneAndUpdate(
      { id: req.params.ticketId },
      { adminNotes: sanitizeText(req.body.adminNotes, 10000), updatedAt: new Date() },
      { new: true }
    );
    if (!ticket) return res.status(404).json({ success: false, error: 'Ticket not found' });
    res.json({ success: true, ticket });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── MESSAGE ROUTES ────────────────────────────────────────────────────────────
app.post('/api/messages', async (req, res) => {
  try {
    const { sender, content, userId, ticketId, id, clientId, messageType, metadata } = req.body;
    if (!sender || !content || !userId) {
      return res.status(400).json({ success: false, error: 'sender, content, and userId are required' });
    }
    if (await isDeletedAccount({ userId })) {
      return res.status(403).json({ success: false, deleted: true, error: 'This account has been deleted by admin' });
    }
    const message = await Message.create({
      clientId: clientId || id || undefined,
      sender,
      content,
      userId,
      ticketId: ticketId || null,
      messageType: sanitizeText(messageType || 'text', 80),
      metadata: metadata && typeof metadata === 'object' ? metadata : {},
      read: false
    });
    res.json({ success: true, message });

    if (sender === 'user') {
      AdminSettings.findOne({ key: 'primary' }).lean().then(settings => {
        if (settings?.notifications?.emailNotifications && SENDGRID_API_KEY && SENDER_EMAIL && TEAM_BOOKING_EMAIL) {
          sgMail.send({
            to: TEAM_BOOKING_EMAIL,
            from: SENDER_EMAIL,
            subject: `New Tekagon chat message from ${userId}`,
            text: `User: ${userId}\nTicket: ${ticketId || 'General chat'}\n\n${content}`
          }).catch(error => console.error('Admin chat email notification failed:', error.message));
        }
        if (settings?.chat?.enableAutoResponses && settings.chat.welcomeMessage) {
          const delay = Math.min(Math.max(Number(settings.chat.autoResponseDelay) || 0, 0), 60) * 1000;
          setTimeout(async () => {
            const recentAutomaticReply = await Message.exists({
              userId,
              ticketId: ticketId || null,
              sender: 'bot',
              timestamp: { $gte: new Date(Date.now() - 12 * 60 * 60 * 1000) }
            });
            const newerAdminReply = await Message.exists({
              userId,
              ticketId: ticketId || null,
              sender: 'admin',
              timestamp: { $gt: message.timestamp }
            });
            if (recentAutomaticReply || newerAdminReply) return;
            await Message.create({
              clientId: `auto_${Date.now()}_${message._id}`,
              sender: 'bot',
              content: settings.chat.welcomeMessage,
              userId,
              ticketId: ticketId || null,
              read: false
            });
          }, delay).unref?.();
        }
      }).catch(error => console.error('Admin setting lookup failed:', error.message));
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// KEY FIX: Return ALL messages for a user (general + ticket).
// The frontend filters by ticketId locally. This ensures admin replies
// to ticket threads are visible to the user's polling.
app.get('/api/messages/user/:userId', async (req, res) => {
  try {
    if (await isDeletedAccount({ userId: req.params.userId })) {
      return res.status(403).json({ success: false, deleted: true, messages: [], error: 'This account has been deleted by admin' });
    }
    const messages = await Message.find({ userId: req.params.userId }).sort({ timestamp: 1 });
    res.json({ success: true, messages });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// General chat only (ticketId = null) — used when admin wants general thread
app.get('/api/messages/user/:userId/general', async (req, res) => {
  try {
    if (await isDeletedAccount({ userId: req.params.userId })) {
      return res.status(403).json({ success: false, deleted: true, messages: [], error: 'This account has been deleted by admin' });
    }
    const messages = await Message.find({
      userId: req.params.userId,
      ticketId: null
    }).sort({ timestamp: 1 });
    res.json({ success: true, messages });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/messages/ticket/:ticketId', async (req, res) => {
  try {
    const messages = await Message.find({ ticketId: req.params.ticketId }).sort({ timestamp: 1 });
    res.json({ success: true, messages });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.patch('/api/messages/read/:userId', async (req, res) => {
  try {
    await Message.updateMany(
      { userId: req.params.userId, sender: { $in: ['admin', 'bot'] }, read: false },
      { read: true }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── CONTACT ROUTE ─────────────────────────────────────────────────────────────
app.post('/api/contact', async (req, res) => {
  try {
    if (!BREVO_API_KEY || !CONTACT_SENDER_EMAIL || !CONTACT_RECIPIENT_EMAIL) {
      return res.status(503).json({ success: false, error: 'Contact email service is not configured' });
    }

    const clean = value => String(value || '').trim();
    const name = clean(req.body.name);
    const company = clean(req.body.company);
    const phone = clean(req.body.phone);
    const email = clean(req.body.email).toLowerCase();
    const subject = clean(req.body.subject);
    const message = clean(req.body.message);
    const honeypot = clean(req.body.website);
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (honeypot) return res.json({ success: true });
    if (!name || !phone || !emailPattern.test(email) || !subject || !message) {
      return res.status(400).json({ success: false, error: 'Please complete all required fields correctly' });
    }
    if (name.length > 120 || company.length > 160 || phone.length > 40 || subject.length > 180 || message.length > 5000) {
      return res.status(400).json({ success: false, error: 'One or more fields are too long' });
    }

    const textContent = [
      'New Tekagon contact form message',
      '',
      `Name: ${name}`,
      `Company: ${company || 'Not provided'}`,
      `Phone: ${phone}`,
      `Email: ${email}`,
      `Subject: ${subject}`,
      '',
      message
    ].join('\n');

    const brevoResponse = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'api-key': BREVO_API_KEY,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        sender: { email: CONTACT_SENDER_EMAIL, name: CONTACT_SENDER_NAME },
        to: [{ email: CONTACT_RECIPIENT_EMAIL, name: 'Tekagon Team' }],
        replyTo: { email, name },
        subject: `Website contact: ${subject}`,
        textContent
      })
    });

    if (!brevoResponse.ok) {
      const providerError = await brevoResponse.text();
      console.error('Brevo contact email failed:', brevoResponse.status, providerError);
      return res.status(502).json({ success: false, error: 'Email service could not send your message. Please try again.' });
    }

    const providerResult = await brevoResponse.json().catch(() => ({}));
    res.json({ success: true, messageId: providerResult.messageId || null });
  } catch (error) {
    console.error('Contact route failed:', error);
    res.status(500).json({ success: false, error: 'Failed to send message. Please try again.' });
  }
});

// ── EMAIL ROUTES ──────────────────────────────────────────────────────────────
app.post('/api/send-email', async (req, res) => {
  try {
    if (!SENDGRID_API_KEY) {
      return res.status(500).json({ success: false, error: 'SendGrid is not configured' });
    }

    const { toEmail, toName, templateData } = req.body;
    const emailData = {
      name: templateData?.name || toName,
      company: templateData?.company || 'Not specified',
      date: templateData?.date || 'Date not set',
      time: templateData?.time || 'Time not set',
      booking_id: templateData?.booking_id || `TEK-${Date.now()}`,
      current_year: new Date().getFullYear().toString(),
      ...templateData
    };
    try {
      const recipients = [
        { email: toEmail, name: toName || emailData.name, role: 'client' },
        { email: TEAM_BOOKING_EMAIL, name: 'Tekagon Team', role: 'team' }
      ].filter((recipient, index, list) =>
        recipient.email && list.findIndex(item => item.email.toLowerCase() === recipient.email.toLowerCase()) === index
      );

      const results = await Promise.all(recipients.map(recipient => sgMail.send({
        to: recipient.email, from: SENDER_EMAIL,
        templateId: SENDGRID_TEMPLATE_ID,
        dynamicTemplateData: {
          ...emailData,
          recipient_role: recipient.role,
          team_booking_email: TEAM_BOOKING_EMAIL
        }
      })));
      res.json({
        success: true,
        message: 'Booking confirmation sent!',
        type: 'template',
        messageId: results[0]?.[0]?.headers?.['x-message-id'] || null,
        recipient: toEmail,
        teamRecipient: TEAM_BOOKING_EMAIL,
        recipients: recipients.map(recipient => recipient.email)
      });
    } catch (templateError) {
      const text = [
        `Hello ${emailData.name}, your booking is confirmed.`,
        `Booking ID: ${emailData.booking_id}`,
        `Date: ${emailData.date}`,
        `Time: ${emailData.time}`,
        `Platform: ${emailData.platform || emailData.meeting_details || 'Not specified'}`,
        `Meeting link: ${emailData.meeting_link || 'Not provided'}`,
        `Notes: ${emailData.notes || 'None'}`
      ].join('\n');
      const recipients = [
        { email: toEmail, name: toName || emailData.name },
        { email: TEAM_BOOKING_EMAIL, name: 'Tekagon Team' }
      ].filter((recipient, index, list) =>
        recipient.email && list.findIndex(item => item.email.toLowerCase() === recipient.email.toLowerCase()) === index
      );
      const results = await Promise.all(recipients.map(recipient => sgMail.send({
        to: recipient.email, from: SENDER_EMAIL,
        subject: `Tekagon Booking Confirmation - ${emailData.booking_id}`,
        text
      })));
      res.json({
        success: true,
        message: 'Booking confirmation sent (simple format)',
        type: 'simple',
        messageId: results[0]?.[0]?.headers?.['x-message-id'] || null,
        recipient: toEmail,
        teamRecipient: TEAM_BOOKING_EMAIL,
        recipients: recipients.map(recipient => recipient.email)
      });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/simple-email', async (req, res) => {
  try {
    if (!SENDGRID_API_KEY) {
      return res.status(500).json({ success: false, error: 'SendGrid is not configured' });
    }

    const { toEmail, toName, subject, message } = req.body;
    const [sendResult] = await sgMail.send({
      to: toEmail, from: SENDER_EMAIL,
      subject: subject || 'Message from Tekagon',
      text: message || `Hello ${toName}`
    });
    res.json({
      success: true,
      messageId: sendResult?.headers?.['x-message-id'] || null,
      recipient: toEmail
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Tekagon backend running on port ${PORT}`);
});
