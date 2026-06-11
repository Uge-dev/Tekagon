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

function safeCompare(left, right) {
  const leftBuffer = Buffer.from(left || '');
  const rightBuffer = Buffer.from(right || '');
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
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

    const user = await User.findOneAndUpdate(
      { userId },
      {
        $set: {
          name,
          phone: phone || '',
          email: email || '',
          company: company || '',
          lastActive: new Date()
        },
        $setOnInsert: { registeredAt: new Date() }
      },
      { new: true, upsert: true, runValidators: true }
    );

    res.json({ success: true, user });
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

    const normalizedEmail = email.trim().toLowerCase();
    const existing = await User.findOne({ email: normalizedEmail }).select('+passwordHash +passwordSalt');
    if (existing?.passwordHash) {
      return res.status(409).json({ success: false, error: 'An account with this email already exists' });
    }

    const { salt, hash } = hashPassword(password);
    const userId = existing?.userId || `EMAIL_${crypto.createHash('sha256').update(normalizedEmail).digest('hex').slice(0, 24)}`;
    const user = await User.findOneAndUpdate(
      { userId },
      {
        $set: {
          name,
          phone,
          email: normalizedEmail,
          company,
          authProvider: existing?.authProvider || 'email',
          passwordHash: hash,
          passwordSalt: salt,
          lastActive: new Date()
        },
        $setOnInsert: { registeredAt: new Date() }
      },
      { new: true, upsert: true, runValidators: true }
    );

    res.json({ success: true, user: { userId: user.userId, name: user.name, phone: user.phone, email: user.email, company: user.company } });
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

    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail }).select('+passwordHash +passwordSalt');
    if (!user || !verifyPassword(password, user)) {
      return res.status(401).json({ success: false, error: 'Incorrect email or password' });
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

    if (!safeCompare(username, ADMIN_USERNAME) || !safeCompare(password, ADMIN_PASSWORD)) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    res.json({ success: true });
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

// ── TICKET ROUTES ─────────────────────────────────────────────────────────────
app.post('/api/tickets/create', async (req, res) => {
  try {
    const ticket = await Ticket.create(req.body);
    res.json({ success: true, ticket });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/tickets/user/:userId', async (req, res) => {
  try {
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

// ── MESSAGE ROUTES ────────────────────────────────────────────────────────────
app.post('/api/messages', async (req, res) => {
  try {
    const { sender, content, userId, ticketId, id, clientId } = req.body;
    if (!sender || !content || !userId) {
      return res.status(400).json({ success: false, error: 'sender, content, and userId are required' });
    }
    const message = await Message.create({
      clientId: clientId || id || undefined,
      sender,
      content,
      userId,
      ticketId: ticketId || null,
      read: false
    });
    res.json({ success: true, message });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// KEY FIX: Return ALL messages for a user (general + ticket).
// The frontend filters by ticketId locally. This ensures admin replies
// to ticket threads are visible to the user's polling.
app.get('/api/messages/user/:userId', async (req, res) => {
  try {
    const messages = await Message.find({ userId: req.params.userId }).sort({ timestamp: 1 });
    res.json({ success: true, messages });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// General chat only (ticketId = null) — used when admin wants general thread
app.get('/api/messages/user/:userId/general', async (req, res) => {
  try {
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
      { userId: req.params.userId, sender: { $ne: 'admin' }, read: false },
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
