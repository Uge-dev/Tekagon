// calendar.js - Enhanced Calendar Manager (same as before)
class CalendarManager {
    constructor() {
        this.currentMonth = new Date().getMonth();
        this.currentYear = new Date().getFullYear();
        this.selectedDate = null;
        this.selectedTime = null;
    }

    initCalendar() {
        this.updateHeader();
        this.generateDays();
        this.setupNavigation();
        this.createTimeSlotsContainer();
        console.log("📅 Calendar initialized");
    }

    createTimeSlotsContainer() {
        // Create time slots container if it doesn't exist
        const calendarWrapper = document.querySelector('.calendar-wrapper');
        if (calendarWrapper && !document.getElementById('sideTimeSlots')) {
            const timeContainer = document.createElement('div');
            timeContainer.id = 'sideTimeSlots';
            timeContainer.className = 'side-time-slots';
            timeContainer.style.display = 'none';

            timeContainer.innerHTML = `
                <div class="time-slots-header">
                    <h3><i class="fas fa-clock"></i> Select Time</h3>
                    <p id="selectedDateDisplay">Select a date first to see available times</p>
                    <p class="timezone-info" id="selectedTimezone"></p>
                </div>
                <div class="time-slots-grid" id="timeSlots">
                    <!-- Time slots will be generated here -->
                </div>
                <div class="time-slots-actions">
                    <button class="btn-next" id="nextStepButton" style="display: none;" disabled>
                        <i class="fas fa-arrow-right"></i> Continue to Details
                    </button>
                </div>
            `;

            // Insert after calendar container
            calendarWrapper.appendChild(timeContainer);

            // Add event listener for next button
            const nextBtn = document.getElementById('nextStepButton');
            if (nextBtn) {
                nextBtn.addEventListener('click', () => {
                    if (window.scheduler) {
                        window.scheduler.goToStep(2);
                    }
                });
            }

            // Update timezone when changed
            const timezoneSelect = document.getElementById('timezone');
            if (timezoneSelect) {
                timezoneSelect.addEventListener('change', () => {
                    this.updateTimezoneDisplay();
                });
            }
        }
    }

    updateHeader() {
        const months = ['January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'];

        const header = document.getElementById('currentMonthYear');
        if (header) {
            header.textContent = `${months[this.currentMonth]} ${this.currentYear}`;
        }
    }

    generateDays() {
        const container = document.getElementById('calendarDays');
        if (!container) return;

        container.innerHTML = '';
        const today = new Date();
        const firstDay = new Date(this.currentYear, this.currentMonth, 1);
        const lastDay = new Date(this.currentYear, this.currentMonth + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDay = firstDay.getDay();

        // Adjust starting day to Monday as first day of week
        const adjustedStart = startingDay === 0 ? 6 : startingDay - 1;

        // Add empty cells for days before the first day of the month
        for (let i = 0; i < adjustedStart; i++) {
            const emptyDay = document.createElement('div');
            emptyDay.className = 'calendar-day empty';
            container.appendChild(emptyDay);
        }

        // Generate days for the current month
        for (let day = 1; day <= daysInMonth; day++) {
            const dayEl = document.createElement('div');
            dayEl.className = 'calendar-day';
            dayEl.textContent = day;
            dayEl.dataset.date = `${this.currentYear}-${String(this.currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

            // Mark today
            if (day === today.getDate() &&
                this.currentMonth === today.getMonth() &&
                this.currentYear === today.getFullYear()) {
                dayEl.classList.add('today');
            }

            // Mark if selected
            if (this.selectedDate &&
                this.selectedDate.getDate() === day &&
                this.selectedDate.getMonth() === this.currentMonth &&
                this.selectedDate.getFullYear() === this.currentYear) {
                dayEl.classList.add('selected');
            }

            // Add click event
            dayEl.addEventListener('click', () => {
                this.selectDate(day);
            });

            container.appendChild(dayEl);
        }
    }

    selectDate(day) {
        // Remove previous selection
        document.querySelectorAll('.calendar-day.selected').forEach(el => {
            el.classList.remove('selected');
        });

        // Add selection to clicked day
        const dayElements = document.querySelectorAll('.calendar-day:not(.empty)');
        const selectedIndex = Array.from(dayElements).findIndex(el =>
            parseInt(el.textContent) === day
        );

        if (selectedIndex !== -1) {
            dayElements[selectedIndex].classList.add('selected');
        }

        // Store selected date
        this.selectedDate = new Date(this.currentYear, this.currentMonth, day);

        // Store in window for scheduler to access
        window.selectedCalendarDate = this.selectedDate;

        // Update selected date display
        this.updateSelectedDateDisplay();

        // Show time slots
        this.showTimeSlots();

        console.log("📅 Date selected:", this.selectedDate);
    }

    updateSelectedDateDisplay() {
        if (!this.selectedDate) return;

        const displayElement = document.getElementById('selectedDateDisplay');
        if (displayElement) {
            const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
            displayElement.textContent = this.selectedDate.toLocaleDateString('en-US', options);
        }

        this.updateTimezoneDisplay();
    }

    updateTimezoneDisplay() {
        const timezoneElement = document.getElementById('selectedTimezone');
        if (timezoneElement) {
            const timezoneSelect = document.getElementById('timezone');
            const selectedOption = timezoneSelect ? timezoneSelect.options[timezoneSelect.selectedIndex] : null;
            const timezoneText = selectedOption ? selectedOption.text : 'West Africa Time (WAT)';
            timezoneElement.textContent = `Timezone: ${timezoneText}`;
        }
    }

    showTimeSlots() {
        const timeContainer = document.getElementById('sideTimeSlots');
        if (timeContainer) {
            timeContainer.style.display = 'block';
            this.generateTimeSlots();

            // Reset time selection
            this.selectedTime = null;
            window.selectedCalendarTime = null;

            // Show next button but keep disabled until time is selected
            const nextBtn = document.getElementById('nextStepButton');
            if (nextBtn) {
                nextBtn.style.display = 'inline-flex';
                nextBtn.disabled = true;
            }
        }
    }

    generateTimeSlots() {
        const container = document.getElementById('timeSlots');
        if (!container) return;

        container.innerHTML = '';

        // Generate time slots (9 AM to 5 PM, every 30 minutes)
        const timeSlots = [];
        for (let hour = 9; hour <= 17; hour++) {
            for (let minute = 0; minute < 60; minute += 30) { // Every 30 minutes
                if (hour === 17 && minute === 30) break; // Stop at 5:00 PM

                const time24 = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
                const hour12 = hour === 12 ? 12 : hour % 12;
                const ampm = hour >= 12 ? 'PM' : 'AM';
                const time12 = `${hour12}:${minute.toString().padStart(2, '0')} ${ampm}`;

                timeSlots.push({ time24, time12 });
            }
        }

        // Generate time slot buttons
        timeSlots.forEach(slot => {
            const slotElement = document.createElement('button');
            slotElement.type = 'button';
            slotElement.className = 'time-slot';
            slotElement.textContent = slot.time12;
            slotElement.dataset.time = slot.time24;

            // Mark if selected
            if (this.selectedTime === slot.time24) {
                slotElement.classList.add('selected');
            }

            slotElement.addEventListener('click', (e) => {
                // Remove previous selection
                document.querySelectorAll('.time-slot.selected').forEach(el => {
                    el.classList.remove('selected');
                });

                // Select this time
                e.target.classList.add('selected');
                this.selectedTime = slot.time24;

                // Store in window
                window.selectedCalendarTime = slot.time24;

                // Enable next button
                const nextBtn = document.getElementById('nextStepButton');
                if (nextBtn) {
                    nextBtn.disabled = false;
                }

                console.log("⏰ Time selected:", slot.time24);
            });

            container.appendChild(slotElement);
        });
    }

    setupNavigation() {
        const prevBtn = document.getElementById('prevMonth');
        const nextBtn = document.getElementById('nextMonth');

        if (prevBtn) {
            prevBtn.addEventListener('click', () => this.changeMonth(-1));
        }

        if (nextBtn) {
            nextBtn.addEventListener('click', () => this.changeMonth(1));
        }
    }

    changeMonth(delta) {
        this.currentMonth += delta;

        if (this.currentMonth < 0) {
            this.currentMonth = 11;
            this.currentYear--;
        } else if (this.currentMonth > 11) {
            this.currentMonth = 0;
            this.currentYear++;
        }

        this.updateHeader();
        this.generateDays();

        // Hide time slots when changing month
        const timeContainer = document.getElementById('sideTimeSlots');
        if (timeContainer) {
            timeContainer.style.display = 'none';
        }

        const nextBtn = document.getElementById('nextStepButton');
        if (nextBtn) {
            nextBtn.style.display = 'none';
        }

        // Reset time selection
        this.selectedTime = null;
        window.selectedCalendarTime = null;
        window.selectedCalendarDate = null;
    }

    // Reset calendar selection
    reset() {
        this.selectedDate = null;
        this.selectedTime = null;
        window.selectedCalendarDate = null;
        window.selectedCalendarTime = null;

        // Clear selections in UI
        document.querySelectorAll('.calendar-day.selected').forEach(el => {
            el.classList.remove('selected');
        });

        document.querySelectorAll('.time-slot.selected').forEach(el => {
            el.classList.remove('selected');
        });

        // Hide time slots
        const timeContainer = document.getElementById('sideTimeSlots');
        if (timeContainer) {
            timeContainer.style.display = 'none';
        }

        // Hide next button
        const nextBtn = document.getElementById('nextStepButton');
        if (nextBtn) {
            nextBtn.style.display = 'none';
            nextBtn.disabled = true;
        }

        console.log("🔄 Calendar reset");
    }
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CalendarManager;
}