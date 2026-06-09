const express = require('express');
const cors = require('cors');
const sgMail = require('@sendgrid/mail');
const connectDB = require('./db');
const User = require('./models/User');
const Ticket = require('./models/Ticket');
const Message = require('./models/Message');

connectDB();

const app = express();
const PORT = process.env.PORT || 3000;

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const SENDGRID_TEMPLATE_ID = process.env.SENDGRID_TEMPLATE_ID;
const SENDER_EMAIL = process.env.SENDGRID_SENDER_EMAIL;

if (!SENDGRID_API_KEY) {
  console.error('ERROR: No SendGrid API key found!');
  process.exit(1);
}

sgMail.setApiKey(SENDGRID_API_KEY);

app.use(cors({ origin: '*' }));
app.options('*', cors());
app.use(express.json());

// ── HEALTH ──────────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ success: true, status: 'running', timestamp: new Date().toISOString() });
});

// ── USER ROUTES ──────────────────────────────────────────────────────────────
app.post('/api/users/register', async (req, res) => {
  try {
    const { userId, name, phone, email, company } = req.body;
    let user = await User.findOne({ userId });
    if (!user) {
      user = await User.create({ userId, name, phone, email, company });
    } else {
      user.lastActive = new Date();
      await user.save();
    }
    res.json({ success: true, user });
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
    const { sender, content, userId, ticketId } = req.body;
    if (!sender || !content || !userId) {
      return res.status(400).json({ success: false, error: 'sender, content, and userId are required' });
    }
    const message = await Message.create({
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

// ── EMAIL ROUTES ──────────────────────────────────────────────────────────────
app.post('/api/send-email', async (req, res) => {
  try {
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
      await sgMail.send({
        to: toEmail, from: SENDER_EMAIL,
        templateId: SENDGRID_TEMPLATE_ID,
        dynamicTemplateData: emailData
      });
      res.json({ success: true, message: 'Booking confirmation sent!', type: 'template' });
    } catch (templateError) {
      await sgMail.send({
        to: toEmail, from: SENDER_EMAIL,
        subject: `Tekagon Booking Confirmation - ${emailData.booking_id}`,
        text: `Hello ${emailData.name}, your booking is confirmed. ID: ${emailData.booking_id}`
      });
      res.json({ success: true, message: 'Booking confirmation sent (simple format)', type: 'simple' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/simple-email', async (req, res) => {
  try {
    const { toEmail, toName, subject, message } = req.body;
    await sgMail.send({
      to: toEmail, from: SENDER_EMAIL,
      subject: subject || 'Message from Tekagon',
      text: message || `Hello ${toName}`
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Tekagon backend running on port ${PORT}`);
});