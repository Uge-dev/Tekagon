
const express = require('express');
const cors = require('cors');
const sgMail = require('@sendgrid/mail');

const connectDB = require('./db');
const User = require('./models/User');
const Ticket = require('./models/Ticket');
const Message = require('./models/Message');

// Connect to MongoDB
connectDB();

const app = express();
const PORT = process.env.PORT || 3000;




const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const SENDGRID_TEMPLATE_ID = process.env.SENDGRID_TEMPLATE_ID;
const SENDER_EMAIL = process.env.SENDGRID_SENDER_EMAIL;
const SENDER_NAME = process.env.SENDGRID_SENDER_NAME;


console.log(' Initializing SendGrid...');
console.log(' Using API Key from:', process.env.SENDGRID_API_KEY ? 'Environment' : 'Hardcoded');

if (!SENDGRID_API_KEY) {
    console.error(' ERROR: No SendGrid API key found!');
    console.error('Set it with: export SENDGRID_API_KEY=your_api_key_here');
    process.exit(1);
}

sgMail.setApiKey(SENDGRID_API_KEY);
console.log('endGrid initialized');

app.use(cors({ origin: '*' }));
app.options('*', cors());
app.use(express.json());


async function testSendGridConnection() {
    try {
        console.log('Testing SendGrid connection...');

        const testMsg = {
            to: SENDER_EMAIL,
            from: SENDER_EMAIL,
            subject: 'SendGrid Connection Test',
            text: 'Testing SendGrid connection...',
            html: '<p>Testing SendGrid connection...</p>'
        };

        await sgMail.send(testMsg);
        return { success: true, message: 'SendGrid connection successful' };
    } catch (error) {
        console.error('SendGrid connection test failed:', error.message);
        console.error('Error details:', error.response?.body || error);
        return { success: false, error: error.message, details: error.response?.body };
    }
}


app.get('/api/health', async (req, res) => {
    console.log('Health check requested');

    const sendgridTest = await testSendGridConnection();

    res.json({
        success: true,
        status: 'running',
        timestamp: new Date().toISOString(),
        sendgrid: sendgridTest,
        endpoints: [
            'GET /api/health',
            'POST /api/send-email',
            'POST /api/test-email',
            'POST /api/simple-email'  
        ]
    });
});


app.post('/api/simple-email', async (req, res) => {
    try {
        const { toEmail, toName, subject, message } = req.body;

        console.log('Sending simple email to:', toEmail);

        const msg = {
            to: toEmail,
            from: SENDER_EMAIL,
            subject: subject || 'Tekagon Scheduler - Simple Test',
            text: message || `Hello ${toName},\n\nThis is a simple test email from Tekagon Scheduler.\n\nTime: ${new Date().toLocaleString()}`,
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px;">
                    <h2 style="color: #6366f1;">Tekagon Scheduler - Simple Test</h2>
                    <p>Hello <strong>${toName}</strong>,</p>
                    <p>This is a simple test email from your Tekagon Scheduler system.</p>
                    <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin: 15px 0;">
                        <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
                        <p><strong>System:</strong> Tekagon Scheduler Backend</p>
                        <p><strong>Status:</strong> Working ✓</p>
                    </div>
                    <p>If you receive this, your email system is working!</p>
                </div>
            `
        };

        const response = await sgMail.send(msg);

        console.log('Simple email sent!');

        res.json({
            success: true,
            message: 'Simple test email sent successfully!',
            recipient: toEmail,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Simple email error:', error.message);
        console.error('Full error:', error);

        res.status(500).json({
            success: false,
            error: 'Failed to send simple email',
            message: error.message,
            details: error.response?.body || 'No details',
            troubleshooting: 'Check SendGrid API key and sender authentication'
        });
    }
});


app.post('/api/test-email', async (req, res) => {
    try {
        const email = req.body.email || SENDER_EMAIL;

        console.log('Sending template test email to:', email);

        try {
            const msg = {
                to: email,
                from: SENDER_EMAIL,
                templateId: SENDGRID_TEMPLATE_ID,
                dynamicTemplateData: {
                    name: 'Test User',
                    company: 'Test Company',
                    date: new Date().toLocaleDateString(),
                    time: new Date().toLocaleTimeString(),
                    booking_id: `TEST-${Date.now()}`,
                    current_year: new Date().getFullYear().toString()
                }
            };

            const response = await sgMail.send(msg);

            console.log(' Template email sent successfully!');

            return res.json({
                success: true,
                message: 'Template test email sent!',
                type: 'template',
                recipient: email
            });

        } catch (templateError) {
            console.log('Template email failed, trying simple email...');

            // Fallback to simple email
            const simpleMsg = {
                to: email,
                from: SENDER_EMAIL,
                subject: 'Tekagon Scheduler - Test (Template Failed)',
                text: `Test email. Template system failed, but simple email works.\n\nError: ${templateError.message}`,
                html: `<p>Test email sent. Template system had issues.</p>`
            };

            await sgMail.send(simpleMsg);

            return res.json({
                success: true,
                message: 'Email sent (simple fallback)',
                type: 'simple_fallback',
                note: 'Template failed, sent simple email instead',
                templateError: templateError.message,
                recipient: email
            });
        }

    } catch (error) {
        console.error(' All email attempts failed:', error.message);

        res.status(500).json({
            success: false,
            error: 'All email methods failed',
            message: error.message,
            details: error.response?.body || 'No response body',
            actionRequired: [
                '1. Verify SendGrid API key is valid',
                '2. Check sender email is verified in SendGrid',
                '3. Check SendGrid account has sending permissions'
            ]
        });
    }
});


app.post('/api/send-email', async (req, res) => {
    try {
        const { toEmail, toName, templateData } = req.body;

        console.log('📧 Sending booking email to:', toEmail);

     
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
            const msg = {
                to: toEmail,
                from: SENDER_EMAIL,
                templateId: SENDGRID_TEMPLATE_ID,
                dynamicTemplateData: emailData
            };

            await sgMail.send(msg);

            console.log(' Booking email sent via template');

            res.json({
                success: true,
                message: 'Booking confirmation sent!',
                type: 'template',
                recipient: toEmail
            });

        } catch (templateError) {
            console.log(' Template failed, sending simple confirmation...');

            const simpleMsg = {
                to: toEmail,
                from: SENDER_EMAIL,
                subject: `Tekagon Booking Confirmation - ${emailData.booking_id}`,
                text: `
Hello ${emailData.name},

Your booking has been confirmed!

Details:
- Booking ID: ${emailData.booking_id}
- Date: ${emailData.date}
- Time: ${emailData.time}
- Company: ${emailData.company}

We'll contact you soon with meeting details.

Thank you,
Tekagon Digital Team
                `,
                html: `
<div style="font-family: Arial, sans-serif; padding: 20px;">
    <h2 style="color: #6366f1;">Booking Confirmed!</h2>
    <p>Hello <strong>${emailData.name}</strong>,</p>
    <p>Your booking with Tekagon Digital has been confirmed.</p>
    
    <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin: 15px 0;">
        <h3 style="margin-top: 0;">Booking Details</h3>
        <p><strong>Booking ID:</strong> ${emailData.booking_id}</p>
        <p><strong>Date:</strong> ${emailData.date}</p>
        <p><strong>Time:</strong> ${emailData.time}</p>
        <p><strong>Company:</strong> ${emailData.company}</p>
    </div>
    
    <p>We'll contact you shortly with the meeting link and additional details.</p>
    
    <p>Best regards,<br>
    <strong>Tekagon Digital Team</strong></p>
</div>
                `
            };

            await sgMail.send(simpleMsg);

            res.json({
                success: true,
                message: 'Booking confirmation sent (simple format)',
                type: 'simple',
                recipient: toEmail,
                note: 'Template system unavailable, sent simple confirmation'
            });
        }

    } catch (error) {
        console.error('❌ Booking email failed:', error.message);

        res.status(500).json({
            success: false,
            error: 'Could not send booking confirmation',
            message: 'Your booking was saved, but email failed',
            details: error.message,
            fallback: 'Please contact support@tekagon.com with your booking ID'
        });
    }
});


app.get('/api/debug-sendgrid', async (req, res) => {
    try {
        console.log('🐛 Debugging SendGrid...');

 
        const apiKeyValid = SENDGRID_API_KEY.startsWith('SG.') && SENDGRID_API_KEY.length > 50;

  
        let sendTest = { success: false, error: 'Not tested' };
        try {
            const testMsg = {
                to: SENDER_EMAIL,
                from: SENDER_EMAIL,
                subject: 'SendGrid Debug Test',
                text: 'Debug test at ' + new Date().toISOString()
            };
            await sgMail.send(testMsg);
            sendTest = { success: true };
        } catch (sendError) {
            sendTest = {
                success: false,
                error: sendError.message,
                response: sendError.response?.body
            };
        }

        res.json({
            timestamp: new Date().toISOString(),
            sendgrid: {
                apiKey: {
                    startsWithSG: SENDGRID_API_KEY.startsWith('SG.'),
                    length: SENDGRID_API_KEY.length,
                    first10Chars: SENDGRID_API_KEY.substring(0, 10) + '...',
                    valid: apiKeyValid
                },
                sender: SENDER_EMAIL,
                template: SENDGRID_TEMPLATE_ID,
                sendTest: sendTest,
                library: 'SendGrid Node.js v7.7.0'
            },
            server: {
                port: PORT,
                environment: process.env.NODE_ENV || 'development',
                nodeVersion: process.version
            }
        });

    } catch (error) {
        res.status(500).json({
            error: 'Debug failed',
            message: error.message
        });
    }
});

// ── USER ROUTES ──
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

// ── TICKET ROUTES ──
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
    const tickets = await Ticket.find({ userId: req.params.userId })
      .sort({ createdAt: -1 });
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

app.post('/api/messages', async (req, res) => {
  try {
    const message = await Message.create(req.body);
    
    const io = req.app.get('io');
    
    // If admin sent message, notify the user
    if (req.body.sender === 'admin') {
      io.to(req.body.userId).emit('new_message', message);
      console.log('📨 Message sent to user:', req.body.userId);
    }
    
    // If user sent message, notify admin
    if (req.body.sender === 'user') {
      io.to('admin_room').emit('new_message', message);
      console.log('📨 Message sent to admin room');
    }
    
    res.json({ success: true, message });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

const http = require('http');
const { Server } = require('socket.io');

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST']
  }
});

// Socket.io connection
io.on('connection', (socket) => {
  console.log('🔌 User connected:', socket.id);

  // User joins their own room
  socket.on('join_room', (userId) => {
    socket.join(userId);
    console.log(`👤 User ${userId} joined room`);
  });

  // Admin joins admin room
  socket.on('join_admin', () => {
    socket.join('admin_room');
    console.log('👑 Admin joined admin room');
  });

  socket.on('disconnect', () => {
    console.log('🔌 User disconnected:', socket.id);
  });
});

// Make io accessible in routes
app.set('io', io);

server.listen(PORT, async () => {
    console.log(`
 TEKAGON SCHEDULER BACKEND

 Server: http://localhost:${PORT}
 SendGrid: Initializing...

`);


    const testResult = await testSendGridConnection();

    if (testResult.success) {
        console.log('🎉 SendGrid: CONNECTED AND WORKING!');
        console.log('📧 Emails will be sent to recipients');
    } else {
        console.log('⚠️ SendGrid: CONNECTION ISSUE');
        console.log('Error:', testResult.error);
        console.log('Emails may fail. Check API key and configuration.');
    }

    console.log(`
════════════════════════════════
📡 ENDPOINTS:
   • GET  /api/health         - Health check
   • POST /api/simple-email   - Simple email (always works)
   • POST /api/test-email     - Test email (with fallback)
   • POST /api/send-email     - Send booking email
   • GET  /api/debug-sendgrid - Debug info
════════════════════════════════
💡 Quick test:
   curl -X POST http://localhost:${PORT}/api/simple-email \\
        -H "Content-Type: application/json" \\
        -d '{"toEmail":"tekagon.digital@gmail.com","toName":"Test"}'
════════════════════════════════
`);
});