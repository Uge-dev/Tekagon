// server.js - Complete Express server for Tekagon Scheduler
const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 3000;

// ========== CORS CONFIGURATION ==========
// Allow ALL origins for development
app.use(cors({
    origin: '*', // Allow any origin
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    credentials: false,
    preflightContinue: false,
    optionsSuccessStatus: 204
}));

// Handle preflight requests for all routes
app.options('*', cors());

// ========== MIDDLEWARE ==========
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files (CSS, JS, images)
app.use(express.static(__dirname));

// ========== API ENDPOINTS ==========

// 1. Health Check
app.get('/api/health', (req, res) => {
    console.log('🏥 Health check from:', req.headers.origin || 'unknown origin');
    res.json({
        success: true,
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'Tekagon Scheduler API',
        version: '1.0.0',
        cors: 'enabled',
        allowedOrigin: req.headers.origin || 'any'
    });
});

// 2. Send Email (Mock for now)
app.post('/api/send-email', (req, res) => {
    console.log('📧 Email request received:', {
        from: req.headers.origin,
        to: req.body.toEmail,
        name: req.body.toName
    });

    // Simulate email sending delay
    setTimeout(() => {
        res.json({
            success: true,
            message: 'Email sent successfully!',
            messageId: `tek-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date().toISOString(),
            recipient: req.body.toEmail
        });
    }, 800);
});

// 3. Send Test Email
app.post('/api/test-email', (req, res) => {
    const email = req.body.email || 'tekagon.digital@gmail.com';
    console.log('🧪 Test email request to:', email);

    res.json({
        success: true,
        message: `Test email processed for ${email}`,
        note: 'In production, this would send via SendGrid',
        sendgrid: {
            templateId: 'd-c0191304da1d467694d801a0d1493180',
            sender: 'tekagon.digital@gmail.com'
        }
    });
});

// 4. Create Booking
app.post('/api/create-booking', (req, res) => {
    const booking = req.body;
    console.log('📅 Booking created:', {
        id: booking.id,
        name: booking.name,
        email: booking.email,
        date: booking.date
    });

    res.json({
        success: true,
        message: 'Booking created successfully',
        bookingId: booking.id,
        timestamp: new Date().toISOString(),
        nextSteps: 'Confirmation email has been sent'
    });
});

// 5. Simple contact form
app.post('/api/contact', (req, res) => {
    console.log('📞 Contact form:', req.body);
    res.json({
        success: true,
        message: 'Message received. We\'ll contact you soon!'
    });
});

// ========== STATIC FILE SERVING ==========

// Serve index.html for the root route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Serve other HTML pages if they exist
app.get('/*.html', (req, res) => {
    const filePath = path.join(__dirname, req.path);
    if (fs.existsSync(filePath)) {
        res.sendFile(filePath);
    } else {
        res.status(404).send('Page not found');
    }
});

// 404 handler for API routes
app.use('/api/*', (req, res) => {
    res.status(404).json({
        success: false,
        error: 'API endpoint not found',
        availableEndpoints: [
            'GET /api/health',
            'POST /api/send-email',
            'POST /api/test-email',
            'POST /api/create-booking',
            'POST /api/contact'
        ]
    });
});

// Serve index.html for all other routes (for SPA routing)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// ========== ERROR HANDLING ==========
app.use((err, req, res, next) => {
    console.error('❌ Server error:', err);
    res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// ========== START SERVER ==========
app.listen(PORT, '0.0.0.0', () => {
    console.log(`
🚀 TEKAGON SCHEDULER SERVER STARTED!
══════════════════════════════════════
✅ Server running on all interfaces
✅ Port: ${PORT}
✅ CORS: Enabled for ALL origins (*)
══════════════════════════════════════
📌 Access URLs:
   • Local: http://localhost:${PORT}
   • Network: http://[YOUR-IP]:${PORT}
   • From any origin: Allowed
══════════════════════════════════════
📡 API Endpoints:
   • GET  /api/health           - Health check
   • POST /api/send-email       - Send email
   • POST /api/test-email       - Test email
   • POST /api/create-booking   - Create booking
══════════════════════════════════════
💡 To test CORS:
   1. Open from Live Server (127.0.0.1:5500)
   2. Click "Test Server" button
   3. Should show "Server: Online ✓"
══════════════════════════════════════
`);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
    console.log('👋 Server shutting down gracefully...');
    process.exit(0);
});