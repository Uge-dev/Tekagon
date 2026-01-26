// sendgrid-client.js - Production-ready client for REAL email sending
class SendGridClient {
    constructor() {
        this.config = {
            // Backend server URL - update if deployed
            serverUrl: 'http://localhost:3000',

            // SendGrid template ID (for reference)
            templateId: 'd-c0191304da1d467694d801a0d1493180',
            senderEmail: 'tekagon.digital@gmail.com',
            senderName: 'Tekagon Digital'
        };

        console.log("📧 SendGrid Client initialized");
        console.log("📍 Server:", this.config.serverUrl);
        console.log("📋 Template:", this.config.templateId);
    }

    // ========== CORE EMAIL METHODS ==========

    /**
     * Send email to form user's email address
     * @param {string} toEmail - The email from the form (client's email)
     * @param {string} toName - The name from the form (client's name)
     * @param {object} templateData - All booking data
     * @returns {object} - Result with success/error
     */
    async sendEmail(toEmail, toName, templateData) {
        try {
            console.log("🚀 Sending REAL email to form user...");
            console.log("👤 Recipient:", `${toName} <${toEmail}>`);
            console.log("📋 Booking ID:", templateData.booking_id);

            const response = await fetch(`${this.config.serverUrl}/api/send-email`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    toEmail,     // Client's email from form
                    toName,      // Client's name from form
                    templateData // All booking details
                })
            });

            const result = await response.json();

            if (!response.ok) {
                console.error('❌ Server error response:', result);

                // Check if it's a SendGrid error
                if (result.details) {
                    throw new Error(`SendGrid: ${JSON.stringify(result.details)}`);
                }
                throw new Error(result.error || `Server error: ${response.status}`);
            }

            console.log("✅ Email sent successfully!");
            console.log("📨 Message ID:", result.messageId);
            console.log("👤 Delivered to:", result.recipient);

            return {
                success: true,
                message: 'Email sent successfully!',
                messageId: result.messageId,
                recipient: toEmail,
                details: result
            };

        } catch (error) {
            console.error("❌ Email sending failed:", error);

            // Store for manual sending as fallback
            this.storeEmailLocally(toEmail, toName, templateData, error.message);

            return {
                success: false,
                error: 'Email service temporarily unavailable',
                fallback: 'Email data saved locally for manual sending',
                message: 'Your booking was saved successfully. We\'ll send the confirmation manually.',
                storedLocally: true
            };
        }
    }

    /**
     * Send a test email to verify system works
     * @param {string} email - Email to send test to
     */
    async sendTestEmail(email = 'tekagon.digital@gmail.com') {
        try {
            console.log("🧪 Testing email system...");

            // First, check if server is running
            console.log("🔄 Checking server status...");

            const healthResponse = await fetch(`${this.config.serverUrl}/api/health`);
            const healthResult = await healthResponse.json();

            if (!healthResponse.ok) {
                throw new Error('Server is not running or health check failed');
            }

            console.log("✅ Server is running, health:", healthResult.status);

            // Try the debug endpoint to see SendGrid status
            console.log("🔍 Checking SendGrid configuration...");

            const debugResponse = await fetch(`${this.config.serverUrl}/api/debug-sendgrid`);
            const debugResult = await debugResponse.json();

            if (debugResponse.ok) {
                console.log("📊 SendGrid debug info:", debugResult.sendgrid);

                if (debugResult.sendgrid?.sendTest?.success) {
                    console.log("✅ SendGrid is properly configured!");

                    // Now try the simple email
                    console.log("📧 Attempting to send simple email...");

                    const simpleResponse = await fetch(`${this.config.serverUrl}/api/simple-email`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            toEmail: email,
                            toName: 'Test User',
                            subject: 'Tekagon Scheduler - System Test',
                            message: 'This is a test email to verify your system is working.'
                        })
                    });

                    const simpleResult = await simpleResponse.json();

                    if (simpleResponse.ok) {
                        console.log("✅ Simple email test successful!");
                        return {
                            success: true,
                            message: `Test email sent to ${email}! Check your inbox.`,
                            type: 'simple',
                            details: simpleResult
                        };
                    } else {
                        console.log("⚠️ Simple email failed, trying fallback...");

                        // Try the main send-email endpoint as fallback
                        const fallbackResponse = await fetch(`${this.config.serverUrl}/api/send-email`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                toEmail: email,
                                toName: 'Test User',
                                templateData: {
                                    name: 'Test User',
                                    company: 'Test Company',
                                    date: new Date().toLocaleDateString(),
                                    time: new Date().toLocaleTimeString(),
                                    booking_id: `TEST-${Date.now()}`,
                                    current_year: new Date().getFullYear().toString()
                                }
                            })
                        });

                        const fallbackResult = await fallbackResponse.json();

                        if (fallbackResponse.ok) {
                            return {
                                success: true,
                                message: `Test email sent (fallback) to ${email}!`,
                                type: 'fallback',
                                details: fallbackResult
                            };
                        } else {
                            throw new Error(fallbackResult.error || 'Email methods failed');
                        }
                    }
                } else {
                    // SendGrid not properly configured
                    const errorMsg = debugResult.sendgrid?.sendTest?.error || 'SendGrid configuration issue';
                    console.error("❌ SendGrid issue:", errorMsg);

                    return {
                        success: false,
                        error: 'SendGrid configuration error',
                        message: errorMsg,
                        troubleshooting: [
                            '1. Check your SendGrid API key is valid',
                            '2. Verify sender email is authenticated in SendGrid',
                            '3. Check SendGrid account has sending permissions'
                        ],
                        debugInfo: debugResult
                    };
                }
            } else {
                throw new Error('Cannot get debug information');
            }

        } catch (error) {
            console.error("❌ Email test failed:", error);

            // Provide specific troubleshooting based on error
            let troubleshooting = [
                '1. Make sure backend server is running: node server.js',
                '2. Check if SendGrid API key is valid',
                '3. Check console for detailed error messages'
            ];

            // Check if it's a connection error
            if (error.message.includes('fetch') || error.message.includes('network')) {
                troubleshooting = [
                    '1. Make sure backend server is running on port 3000',
                    '2. Run: node server.js in terminal',
                    '3. Check if http://localhost:3000/api/health works in browser'
                ];
            }

            return {
                success: false,
                error: 'Email system test failed',
                message: error.message,
                troubleshooting: troubleshooting
            };
        }
    }

    /**
     * Verify SendGrid configuration is working
     */
    async verifySendGrid() {
        try {
            console.log("🔍 Verifying SendGrid configuration...");

            // Try the full verification endpoint first
            try {
                const response = await fetch(`${this.config.serverUrl}/api/verify-sendgrid`, {
                    method: 'GET',
                    headers: { 'Accept': 'application/json' }
                });

                const result = await response.json();

                if (response.ok) {
                    console.log("✅ SendGrid verification successful:", result);
                    return result;
                }
            } catch (error) {
                console.log("⚠️ Full verification failed, trying simple status...");
            }

            // Fallback: Try simple status endpoint
            try {
                const response = await fetch(`${this.config.serverUrl}/api/sendgrid-status`, {
                    method: 'GET',
                    headers: { 'Accept': 'application/json' }
                });

                const result = await response.json();

                if (response.ok) {
                    console.log("✅ SendGrid status check:", result);
                    return {
                        success: true,
                        message: 'SendGrid is configured',
                        sendgrid: result
                    };
                }
            } catch (error) {
                console.log("⚠️ Status check also failed");
            }

            // Last resort: Check if health endpoint mentions SendGrid
            try {
                const response = await fetch(`${this.config.serverUrl}/api/health`);
                const result = await response.json();

                if (response.ok && result.sendgrid) {
                    return {
                        success: true,
                        message: 'SendGrid configured (via health check)',
                        sendgrid: { status: 'configured' }
                    };
                }
            } catch (error) {
                // Ignore
            }

            // All checks failed
            return {
                success: false,
                error: 'Cannot verify SendGrid configuration',
                troubleshooting: [
                    '1. Make sure backend server has latest code',
                    '2. Check SendGrid API key in server.js',
                    '3. Verify endpoints exist in server.js'
                ]
            };

        } catch (error) {
            console.error("❌ Verification error:", error);
            return {
                success: false,
                error: 'Verification failed',
                message: error.message
            };
        }
    }

    /**
     * Test server connection
     */
    async testConnection() {
        try {
            console.log("🧪 Testing server connection...");

            const response = await fetch(`${this.config.serverUrl}/api/health`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                }
            });

            const result = await response.json();

            if (response.ok) {
                console.log("✅ Server is healthy:", result);
                return {
                    success: true,
                    message: 'Server is connected and healthy',
                    details: result
                };
            } else {
                console.error("❌ Server health check failed:", result);
                return {
                    success: false,
                    error: 'Server health check failed',
                    details: result
                };
            }

        } catch (error) {
            console.error("❌ Server connection test failed:", error);
            return {
                success: false,
                error: 'Cannot connect to server',
                message: error.message,
                solution: 'Make sure: 1. Server is running (node server.js) 2. Port 3000 is available'
            };
        }
    }

    // ========== HELPER METHODS ==========

    /**
     * Store email locally when SendGrid fails (fallback)
     */
    storeEmailLocally(toEmail, toName, templateData, errorMessage = '') {
        try {
            const emailRecord = {
                id: `local-${Date.now()}`,
                toEmail,
                toName,
                templateData,
                templateId: this.config.templateId,
                error: errorMessage,
                timestamp: new Date().toISOString(),
                status: 'pending_manual',
                instructions: `
MANUAL SENDING REQUIRED:
1. Go to: https://app.sendgrid.com
2. Use Template ID: ${this.config.templateId}
3. Send to: ${toName} <${toEmail}>
4. Use this template data:
${JSON.stringify(templateData, null, 2)}
                `
            };

            // Save to localStorage
            const pendingEmails = JSON.parse(localStorage.getItem('pending_emails') || '[]');
            pendingEmails.push(emailRecord);
            localStorage.setItem('pending_emails', JSON.stringify(pendingEmails));

            // Also save individually for easy access
            localStorage.setItem(`email_${emailRecord.id}`, JSON.stringify(emailRecord));

            console.log("💾 Email stored locally. ID:", emailRecord.id);
            console.log("📋 To send manually, run: viewPendingEmails()");
            console.log("📧 Email data saved for:", toEmail);

            return emailRecord.id;

        } catch (error) {
            console.error("❌ Failed to store email locally:", error);
            return null;
        }
    }

    /**
  * Generate meeting link based on platform
  */
    generateMeetingLink(platform, phone = '') {
        switch (platform) {
            case 'google-meet':
                // For Google Meet, you should schedule a real meeting
                // This is a placeholder - in production, use Google Calendar API
                return 'https://meet.google.com/new';
            case 'zoom':
                // For Zoom, you should create a real meeting via Zoom API
                // This is a placeholder
                return 'https://zoom.us/meeting/schedule';
            case 'whatsapp':
                const cleanPhone = phone.replace(/\D/g, '');
                return cleanPhone ? `https://wa.me/${cleanPhone}` : 'Will be provided via WhatsApp';
            case 'phone':
                return phone || 'Phone number will be provided';
            default:
                return 'Meeting details will be provided';
        }
    }


    /**
 * Prepare template data for SendGrid
 * This data will be used in the email template
 */
    prepareBookingData(booking, formatDate, formatTime, getPlatformDisplay) {
        const meetingLink = this.generateMeetingLink(booking.platform, booking.phone);
        const platformDisplay = getPlatformDisplay ? getPlatformDisplay(booking.platform) : booking.platform || '';

        // Determine meeting instructions based on platform
        let meetingInstructions = '';
        let meetingDetails = '';

        switch (booking.platform) {
            case 'google-meet':
                meetingInstructions = 'A Google Meet link will be sent to you 30 minutes before the session.';
                meetingDetails = 'Virtual Meeting - Google Meet';
                break;
            case 'zoom':
                meetingInstructions = 'A Zoom meeting link and password will be sent to you 30 minutes before the session.';
                meetingDetails = 'Virtual Meeting - Zoom';
                break;
            case 'whatsapp':
                meetingInstructions = `We'll contact you via WhatsApp at ${booking.phone} at the scheduled time.`;
                meetingDetails = `WhatsApp Call to ${booking.phone}`;
                break;
            case 'phone':
                meetingInstructions = `We'll call you at ${booking.phone} at the scheduled time.`;
                meetingDetails = `Phone Call to ${booking.phone}`;
                break;
            default:
                meetingInstructions = 'Meeting details will be provided before the session.';
                meetingDetails = 'Virtual Meeting';
        }

        return {
            // Client information (from form)
            name: booking.name || '',
            company: booking.company || '',
            phone: booking.phone || '',

            // Session details
            date: formatDate ? formatDate(booking.date) : booking.date || '',
            time: formatTime ? formatTime(booking.time) : booking.time || '',
            timezone: booking.timezone || 'UTC',
            platform: platformDisplay,

            // Meeting instructions
            meeting_instructions: meetingInstructions,
            meeting_details: meetingDetails,

            // Additional info
            business_type: booking.businessType || '',
            guests: (booking.guests && booking.guests.length > 0) ? booking.guests.join(', ') : 'None',
            notes: booking.notes || 'None',

            // Booking reference
            booking_id: booking.id || '',
            meeting_link: meetingLink,

            // System fields
            current_year: new Date().getFullYear().toString(),

            // Support contact
            support_email: 'support@tekagon.com',
            support_phone: '+234 800 000 0000'
        };
    }
}

// ========== GLOBAL ADMIN FUNCTIONS ==========

/**
 * Send a REAL test email to verify email delivery
 */
/**
 * View pending emails stored locally
 */
function viewPendingEmails() {
    try {
        const pendingEmails = JSON.parse(localStorage.getItem('pending_emails') || '[]');

        if (pendingEmails.length === 0) {
            alert("✅ No pending emails in local storage.\n\nAll emails were sent successfully!");
            return;
        }

        console.group("📧 PENDING EMAILS (Need Manual Sending)");
        console.log(`Found ${pendingEmails.length} email(s) that need manual sending:`);

        pendingEmails.forEach((email, index) => {
            console.group(`Email #${index + 1}`);
            console.log(`ID: ${email.id}`);
            console.log(`To: ${email.toName} <${email.toEmail}>`);
            console.log(`Booking ID: ${email.templateData.booking_id}`);
            console.log(`Error: ${email.error || 'Unknown'}`);
            console.log(`Stored: ${new Date(email.timestamp).toLocaleString()}`);
            console.log(`Instructions: ${email.instructions}`);
            console.groupEnd();
        });

        console.groupEnd();

        const message = `📧 ${pendingEmails.length} PENDING EMAIL(S)\n\n` +
            `Some emails failed to send automatically.\n\n` +
            `CHECK CONSOLE (F12) for:\n` +
            `• Email addresses\n` +
            `• Booking details\n` +
            `• Manual sending instructions\n\n` +
            `To send manually:\n` +
            `1. Go to SendGrid Dashboard\n` +
            `2. Use Template ID: d-c0191304da1d467694d801a0d1493180\n` +
            `3. Send to emails shown in console`;

        alert(message);

    } catch (error) {
        console.error("Error viewing pending emails:", error);
        alert(`Error: ${error.message}`);
    }
}

/**
 * Clear all local email data
 */
function clearLocalEmailData() {
    if (confirm("⚠️ Clear ALL locally stored email data?\n\nThis cannot be undone.")) {
        localStorage.removeItem('pending_emails');
        alert("✅ All local email data cleared!");
    }
}

// ========== EXPOSE FUNCTIONS GLOBALLY ==========
window.SendGridClient = SendGridClient;
window.viewPendingEmails = viewPendingEmails;
window.clearLocalEmailData = clearLocalEmailData;

console.log("✅ SendGrid Client loaded successfully");
console.log("Available global functions:");
console.log("- viewPendingEmails() - View emails needing manual send");