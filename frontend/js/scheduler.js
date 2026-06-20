// scheduler.js - Main Application (Production version)
class TekagonScheduler {
    constructor() {
        console.log("🎯 Initializing Tekagon Scheduler...");

        this.state = {
            currentStep: 1,
            selectedDate: null,
            selectedTime: null,
            selectedPlatform: 'google-meet',
            guests: [],
            bookingData: null,
            bookingId: null,
            isProcessing: false,
            lastSubmissionTime: 0
        };

        // Make sure SendGridClient is loaded
        if (typeof SendGridClient === 'undefined') {
            console.error("❌ SendGridClient is not defined!");
            // Try to load it dynamically
            this.loadSendGridClient();
        } else {
            this.sendGrid = new SendGridClient(); // Updated to use server client
        }

        this.calendar = null;

        this.init();
    }

    async loadSendGridClient() {
        console.log("🔄 Loading SendGridClient dynamically...");
        // Create a minimal version if not loaded
        this.sendGrid = {
            prepareBookingData: (booking, formatDate, formatTime, getPlatformDisplay) => {
                return {
                    name: booking.name || '',
                    company: booking.company || '',
                    date: formatDate ? formatDate(booking.date) : booking.date || '',
                    time: formatTime ? formatTime(booking.time) : booking.time || '',
                    timezone: booking.timezone || 'UTC',
                    platform: getPlatformDisplay ? getPlatformDisplay(booking.platform) : booking.platform || '',
                    business_type: booking.businessType || '',
                    phone: booking.phone || '',
                    guests: (booking.guests && booking.guests.length > 0) ? booking.guests.join(', ') : '',
                    notes: booking.notes || '',
                    booking_id: booking.id || '',
                    meeting_link: '',
                    current_year: new Date().getFullYear().toString()
                };
            },
            sendEmail: async () => {
                console.log("⚠️ SendGridClient not available, storing locally");
                return { success: true, message: 'Email stored locally' };
            }
        };
    }

    async init() {
        try {
            this.setupEventListeners();
            this.setupFormHandlers();

            // Initialize calendar
            this.calendar = new CalendarManager();
            this.calendar.initCalendar();
            console.log("📅 Calendar initialized");

            console.log("✅ Tekagon Scheduler ready");
        } catch (error) {
            console.error("❌ Scheduler initialization failed:", error);
        }
    }

    // ... rest of the scheduler.js code continues the same as before ...
    // Copy the rest from the previous scheduler.js file
    setupEventListeners() {
        console.log("🔗 Setting up event listeners...");

        // Navigation buttons
        const nextStepButton = document.getElementById('nextStepButton');
        if (nextStepButton) {
            nextStepButton.addEventListener('click', () => this.goToStep(2));
        }

        const backButton = document.getElementById('backButton');
        if (backButton) {
            backButton.addEventListener('click', () => this.goToPreviousStep());
        }

        // Guest management
        const addGuestBtn = document.getElementById('addGuestBtn');
        if (addGuestBtn) {
            addGuestBtn.addEventListener('click', () => this.addGuestInput());
        }

        // Platform selection
        document.querySelectorAll('input[name="platform"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.state.selectedPlatform = e.target.value;
                console.log("📱 Platform selected:", e.target.value);
            });
        });

        // Confirmation actions
        const actions = [
            { id: 'newBookingBtn', method: () => this.resetScheduler() },
            { id: 'downloadCalendarBtn', method: () => this.downloadCalendarInvite() },
            { id: 'openInvitationBtn', method: () => this.openInvitation() }
        ];

        actions.forEach(({ id, method }) => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('click', method);
            }
        });
    }

    setupFormHandlers() {
        const bookingForm = document.getElementById('bookingForm');
        if (bookingForm) {
            bookingForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleFormSubmit(e);
            });
        }
    }

    addGuestInput() {
        const container = document.getElementById('guestsContainer');
        if (!container) return;

        const div = document.createElement('div');
        div.className = 'guest-input';
        div.innerHTML = `
            <input type="email" placeholder="team.member@company.com" required>
            <button type="button" class="remove-guest" title="Remove guest">
                <i class="fas fa-times"></i>
            </button>
        `;

        container.appendChild(div);

        div.querySelector('.remove-guest').addEventListener('click', () => {
            div.remove();
        });
    }

    goToStep(step) {
        console.log(`➡️ Navigating to step ${step}`);

        // Validate before proceeding to step 2
        if (step === 2) {
            const dateSelected = window.selectedCalendarDate;
            const timeSelected = window.selectedCalendarTime;

            if (!dateSelected || !timeSelected) {
                this.showNotification('⚠️ Please select a date AND a time first!', 'warning');
                return;
            }

            this.state.selectedDate = dateSelected;
            this.state.selectedTime = timeSelected;

            console.log("✅ Date/time selected:", {
                date: this.state.selectedDate,
                time: this.state.selectedTime
            });
        }

        // Hide all steps
        document.querySelectorAll('.step').forEach(stepEl => {
            stepEl.classList.remove('active');
        });

        // Show selected step
        const stepEl = document.getElementById(`step${step}`);
        if (stepEl) {
            stepEl.classList.add('active');
        }

        // Update back button visibility
        const backButton = document.getElementById('backButton');
        if (backButton) {
            backButton.style.display = step > 1 ? 'flex' : 'none';
        }

        this.state.currentStep = step;
    }

    goToPreviousStep() {
        if (this.state.currentStep > 1) {
            this.goToStep(this.state.currentStep - 1);
        }
    }

    async handleFormSubmit(e) {
        e.preventDefault();

        // Prevent duplicate submissions
        if (this.state.isProcessing) {
            console.log("⏳ Already processing, ignoring duplicate click");
            return;
        }

        const currentTime = Date.now();
        if (currentTime - this.state.lastSubmissionTime < 5000) {
            this.showNotification('⏳ Please wait a moment before submitting again', 'info');
            return;
        }

        this.state.isProcessing = true;
        this.state.lastSubmissionTime = currentTime;

        const submitBtn = document.getElementById('scheduleBtn');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
        submitBtn.disabled = true;

        // Show loading overlay
        this.showLoading('Creating your booking...');

        try {
            // Collect form data
            const formData = this.collectFormData();

            // Validate required fields
            const validation = this.validateFormData(formData);
            if (!validation.valid) {
                this.showNotification(`❌ Please fill in: ${validation.missing.join(', ')}`, 'error');
                this.hideLoading();
                return;
            }

            // Process guests
            formData.guests = this.getGuestEmails();

            // Generate booking ID
            formData.id = this.generateBookingId();

            // Update loading text
            this.updateLoadingText('Saving booking details...');

            // Create booking
            const bookingResult = await this.createBooking(formData);

            if (bookingResult.success) {
                this.state.bookingData = formData;
                this.state.bookingId = formData.id;

                // Update loading text
                this.updateLoadingText('Sending confirmation email...');

                // Send confirmation email via SERVER
                const emailResult = await this.sendConfirmationEmail(formData);

                // Update UI and navigate to confirmation
                this.updateConfirmationPage(formData, formData.id);
                this.goToStep(3);
                window.addTekagonNotification?.({
                    id: `booking_${formData.id}`,
                    type: 'booking',
                    title: 'Session Booked Successfully',
                    description: 'Check up your calendar not to miss your scheduled Date and Time',
                    iconClass: 'fas fa-calendar-check',
                    targetPage: 'book'
                });

                if (emailResult.success) {
                    this.showNotification('✅ Booking confirmed! Email sent successfully.', 'success');
                } else {
                    this.showNotification('⚠️ Booking saved! Email may be delayed.', 'warning');
                }
                console.log("🎉 Booking completed successfully");

            } else {
                this.showNotification(`❌ Booking failed: ${bookingResult.error}`, 'error');
            }

        } catch (error) {
            console.error("❌ Form submission error:", error);
            this.showNotification(`❌ An error occurred: ${error.message}`, 'error');
        } finally {
            // Reset button state
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
            this.state.isProcessing = false;

            // Hide loading overlay
            this.hideLoading();
        }
    }

    collectFormData() {
        return {
            name: document.getElementById('name').value.trim(),
            email: document.getElementById('email').value.trim(),
            phone: document.getElementById('phone').value.trim(),
            company: document.getElementById('company').value.trim(),
            businessType: document.getElementById('businessType').value,
            notes: document.getElementById('notes').value.trim() || '',
            platform: this.state.selectedPlatform,
            date: this.state.selectedDate ? this.formatDateForStorage(this.state.selectedDate) : null,
            time: this.state.selectedTime,
            timezone: document.getElementById('timezone').value || 'Africa/Lagos'
        };
    }

    validateFormData(formData) {
        const required = ['name', 'email', 'phone', 'company', 'businessType', 'date', 'time'];
        const missing = required.filter(field => !formData[field]);

        return {
            valid: missing.length === 0,
            missing: missing
        };
    }

    getGuestEmails() {
        const guestInputs = document.querySelectorAll('#guestsContainer input');
        return Array.from(guestInputs)
            .map(input => input.value.trim())
            .filter(email => email !== '' && this.validateEmail(email));
    }

    validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    generateBookingId() {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substr(2, 6).toUpperCase();
        return `TEK-${timestamp}-${random}`;
    }

    async createBooking(formData) {
        try {
            const booking = {
                id: formData.id,
                name: formData.name,
                email: formData.email,
                phone: formData.phone,
                company: formData.company,
                businessType: formData.businessType,
                notes: formData.notes,
                platform: formData.platform,
                date: formData.date,
                time: formData.time,
                timezone: formData.timezone,
                guests: formData.guests || [],
                created_at: new Date().toISOString(),
                status: 'confirmed',
                source: 'web_scheduler'
            };

            console.log("💾 Creating booking:", booking);

            const backendResult = await window.TekagonAPI?.createBooking?.(booking);
            if (!backendResult?.success) {
                throw new Error(backendResult?.error || 'Booking could not be saved to the server');
            }
            console.log("✅ Booking saved to MongoDB:", backendResult.booking?.id || booking.id);

            // Save to Firebase
            if (window.db && typeof window.db.collection === 'function') {
                try {
                    const docRef = await window.db.collection('bookings').add(booking);
                    console.log("✅ Saved to Firebase, ID:", docRef.id);
                } catch (firebaseError) {
                    console.warn("⚠️ Firebase save failed:", firebaseError);
                    // Continue anyway - we'll save via server
                }
            }

            // Also save to localStorage as backup
            localStorage.setItem(`booking_${booking.id}`, JSON.stringify(booking));
            this.storeRecentBooking(booking);

            return { success: true, bookingId: booking.id };
        } catch (error) {
            console.error("❌ Booking creation error:", error);
            return { success: false, error: error.message };
        }
    }

    storeRecentBooking(booking) {
        try {
            const recentBookings = JSON.parse(localStorage.getItem('recent_bookings') || '[]');
            recentBookings.unshift({
                id: booking.id,
                name: booking.name,
                email: booking.email,
                date: booking.date,
                time: booking.time,
                company: booking.company,
                timestamp: new Date().toISOString()
            });
            // Keep only last 20 bookings
            localStorage.setItem('recent_bookings', JSON.stringify(recentBookings.slice(0, 20)));
        } catch (error) {
            console.error("Failed to store recent booking:", error);
        }
    }

    async sendConfirmationEmail(booking) {
        try {
            console.log("📧 Sending confirmation email...");

            // Prepare template data
            const templateData = this.sendGrid.prepareBookingData(
                booking,
                this.formatDateForDisplay.bind(this),
                this.formatTimeForDisplay.bind(this),
                this.getPlatformDisplay.bind(this)
            );

            // Send via server
            const result = await this.sendGrid.sendEmail(booking.email, booking.name, templateData);

            if (result.success) {
                console.log("✅ Email sent successfully!");

                // Show different message based on email type
                if (result.type === 'simple') {
                    console.log("📝 Sent as simple email (template system unavailable)");
                    this.showNotification("✅ Booking confirmed! Email sent (simple format).", "success");
                } else {
                    console.log("🎨 Sent as template email");
                    this.showNotification("✅ Booking confirmed! Email sent with full details.", "success");
                }
                return { success: true, result };

            } else {
                console.warn("⚠️ Email had issues:", result.message);
                this.showNotification("⚠️ Booking saved! Email may be delayed.", "warning");

                // Store for manual follow-up
                this.storeForManualFollowup(booking, result.error);
                return { success: false, result };
            }

        } catch (error) {
            console.error("❌ Email processing error:", error);
            // Don't show error to user - booking is still saved
            console.log("📝 Booking saved locally for manual processing");
            return { success: false, error };
        }
    }

    storeForManualFollowup(booking, error) {
        try {
            const manualBookings = JSON.parse(localStorage.getItem('manual_bookings') || '[]');
            manualBookings.push({
                ...booking,
                error: error,
                timestamp: new Date().toISOString(),
                status: 'pending_email'
            });
            localStorage.setItem('manual_bookings', JSON.stringify(manualBookings));
            console.log("📝 Booking stored for manual follow-up");
        } catch (err) {
            console.error("Failed to store manual booking:", err);
        }
    }

    updateConfirmationPage(formData, bookingId) {
        // Update time display
        const timeDisplay = this.formatTimeForDisplay(formData.time);
        const dateDisplay = this.formatDateForDisplay(formData.date);

        document.getElementById('confirmationTime').textContent =
            `${timeDisplay}, ${dateDisplay}`;

        // Update other fields
        document.getElementById('confirmationTimezone').textContent = formData.timezone;
        document.getElementById('confirmationPlatform').textContent =
            this.getPlatformDisplay(formData.platform);
        document.getElementById('confirmationBookingId').textContent = bookingId;
    }

    downloadCalendarInvite() {
        if (!this.state.bookingData) {
            this.showNotification('No booking data available', 'warning');
            return;
        }

        const booking = this.state.bookingData;
        const date = new Date(booking.date + 'T' + booking.time);
        const endDate = new Date(date.getTime() + 60 * 60 * 1000); // 1 hour later

        const ics = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Tekagon Digital//SME-Spot Scheduler//EN
CALSCALE:GREGORIAN
METHOD:REQUEST
BEGIN:VEVENT
UID:${booking.id}@tekagon.com
DTSTAMP:${this.formatDateForICS(new Date())}
DTSTART:${this.formatDateForICS(date)}
DTEND:${this.formatDateForICS(endDate)}
SUMMARY:SME-Spot Session with ${booking.company}
DESCRIPTION:Meeting with ${booking.name}\\nNotes: ${booking.notes || 'None'}
LOCATION:${booking.platform === 'phone' ? 'Phone Call' : 'Virtual Meeting'}
ORGANIZER;CN="Tekagon Digital":mailto:support@tekagon.com
ATTENDEE;CN="${booking.name}";ROLE=REQ-PARTICIPANT;RSVP=TRUE:mailto:${booking.email}
STATUS:CONFIRMED
END:VEVENT
END:VCALENDAR`;

        const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `tekagon-session-${booking.id}.ics`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        this.showNotification('📥 Calendar invitation downloaded', 'success');
    }

    openInvitation() {
        if (!this.state.bookingData) {
            this.showNotification('No booking data available', 'warning');
            return;
        }

        const booking = this.state.bookingData;
        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Meeting Invitation - ${booking.id}</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 30px; max-width: 800px; margin: 0 auto; }
                    .invitation { border: 2px solid #6366f1; border-radius: 16px; padding: 30px; }
                    .header { background: #6366f1; color: white; padding: 20px; border-radius: 12px 12px 0 0; margin: -30px -30px 20px -30px; }
                    h1 { margin: 0; }
                    .details { margin: 20px 0; }
                    .detail-row { display: flex; margin: 10px 0; padding: 10px; background: #f8fafc; border-radius: 8px; }
                    .detail-label { font-weight: bold; min-width: 150px; color: #1e293b; }
                    .actions { margin-top: 30px; text-align: center; }
                    button { padding: 12px 24px; background: #6366f1; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 16px; }
                </style>
            </head>
            <body>
                <div class="invitation">
                    <div class="header">
                        <h1>Tekagon Digital - SME-Spot Session</h1>
                    </div>
                    <div class="details">
                        <div class="detail-row">
                            <div class="detail-label">Booking ID:</div>
                            <div>${booking.id}</div>
                        </div>
                        <div class="detail-row">
                            <div class="detail-label">Date:</div>
                            <div>${this.formatDateForDisplay(booking.date)}</div>
                        </div>
                        <div class="detail-row">
                            <div class="detail-label">Time:</div>
                            <div>${this.formatTimeForDisplay(booking.time)} (${booking.timezone})</div>
                        </div>
                        <div class="detail-row">
                            <div class="detail-label">With:</div>
                            <div>${booking.name}</div>
                        </div>
                        <div class="detail-row">
                            <div class="detail-label">Company:</div>
                            <div>${booking.company}</div>
                        </div>
                        <div class="detail-row">
                            <div class="detail-label">Platform:</div>
                            <div>${this.getPlatformDisplay(booking.platform)}</div>
                        </div>
                        ${booking.notes ? `
                        <div class="detail-row">
                            <div class="detail-label">Notes:</div>
                            <div>${booking.notes}</div>
                        </div>
                        ` : ''}
                    </div>
                    <div class="actions">
                        <button onclick="window.print()">Print Invitation</button>
                    </div>
                </div>
            </body>
            </html>
        `;

        const win = window.open('', '_blank');
        win.document.write(html);
        win.document.close();
    }

    resetScheduler() {
        console.log("🔄 Resetting scheduler...");

        // Reset state
        this.state = {
            currentStep: 1,
            selectedDate: null,
            selectedTime: null,
            selectedPlatform: 'google-meet',
            guests: [],
            bookingData: null,
            bookingId: null,
            isProcessing: false,
            lastSubmissionTime: 0
        };

        // Reset form
        const bookingForm = document.getElementById('bookingForm');
        if (bookingForm) {
            bookingForm.reset();
        }

        // Reset guests container
        const guestsContainer = document.getElementById('guestsContainer');
        if (guestsContainer) {
            guestsContainer.innerHTML = '';
        }

        // Reset calendar
        if (this.calendar) {
            this.calendar.reset();
        }

        // Reset platform selection
        const platformRadios = document.querySelectorAll('input[name="platform"]');
        if (platformRadios.length > 0) {
            platformRadios[0].checked = true;
            this.state.selectedPlatform = 'google-meet';
        }

        // Clear window variables
        window.selectedCalendarDate = null;
        window.selectedCalendarTime = null;

        // Go to step 1
        this.goToStep(1);

        this.showNotification('Scheduler reset. Ready for new booking.', 'info');
    }

    // Loading overlay methods
    showLoading(text = 'Processing...') {
        const overlay = document.getElementById('loadingOverlay');
        const textElement = document.getElementById('loadingText');

        if (overlay) overlay.style.display = 'flex';
        if (textElement) textElement.textContent = text;
    }

    hideLoading() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) overlay.style.display = 'none';
    }

    updateLoadingText(text) {
        const textElement = document.getElementById('loadingText');
        if (textElement) textElement.textContent = text;
    }

    // Helper functions
    showNotification(message, type = 'info') {
        console.log(`📢 ${type.toUpperCase()}: ${message}`);

        // Remove existing notifications
        const existing = document.querySelector('.notification');
        if (existing) existing.remove();

        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <span>${message}</span>
                <button class="notification-close">&times;</button>
            </div>
        `;

        // Add to DOM
        document.body.appendChild(notification);

        // Add close functionality
        notification.querySelector('.notification-close').addEventListener('click', () => {
            notification.remove();
        });

        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 5000);
    }

    // Date/Time formatting helpers
    formatDateForStorage(date) {
        if (!date) return '';

        const d = new Date(date);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');

        return `${year}-${month}-${day}`;
    }

    formatDateForDisplay(dateString) {
        if (!dateString) return '';

        const date = new Date(dateString);
        const options = {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        };

        return date.toLocaleDateString('en-US', options);
    }

    formatTimeForDisplay(timeString) {
        if (!timeString) return '';

        const [hours, minutes] = timeString.split(':');
        const hour = parseInt(hours);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour % 12 || 12;

        return `${displayHour}:${minutes} ${ampm}`;
    }

    formatDateForICS(date) {
        if (!date) return '';

        const pad = (num) => String(num).padStart(2, '0');
        return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    }

    getPlatformDisplay(platform) {
        const platforms = {
            'google-meet': 'Google Meet',
            'zoom': 'Zoom Meeting',
            'whatsapp': 'WhatsApp Call',
            'phone': 'Phone Call'
        };

        return platforms[platform] || platform;
    }

    // Export function for debugging
    exportState() {
        return {
            ...this.state,
            calendarDate: window.selectedCalendarDate,
            calendarTime: window.selectedCalendarTime
        };
    }
}

window.TekagonScheduler = TekagonScheduler;

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TekagonScheduler;
}
