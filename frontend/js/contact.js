// This is your external JS file - add this function here
function initializeContactForm() {
    console.log('Initializing contact form...');

    // Wait for DOM elements to be ready
    setTimeout(() => {
        const contactForm = document.getElementById('contactForm');
        if (!contactForm) {
            console.error('Contact form not found!');
            return;
        }
        console.log('Contact form found!');

        // Get all elements
        const submitBtn = document.getElementById('submitBtn');
        const sendingOverlay = document.getElementById('sendingOverlay');
        const successPopup = document.getElementById('successPopup');
        const closeSuccessBtn = document.getElementById('closeSuccess');
        const formError = document.getElementById('formError');

        // Input fields
        const inputs = {
            name: document.getElementById('fullName'),
            phone: document.getElementById('phoneNumber'),
            email: document.getElementById('email'),
            subject: document.getElementById('subject'),
            message: document.getElementById('message')
        };

        // Error elements
        const errors = {
            name: document.getElementById('nameError'),
            phone: document.getElementById('phoneError'),
            email: document.getElementById('emailError'),
            subject: document.getElementById('subjectError'),
            message: document.getElementById('messageError')
        };

        // Validation functions
        function validateName() {
            const name = inputs.name.value.trim();
            if (!name) {
                showError(inputs.name, errors.name, "Please enter your full name");
                return false;
            }
            if (name.length < 2) {
                showError(inputs.name, errors.name, "Name must be at least 2 characters");
                return false;
            }
            hideError(inputs.name, errors.name);
            return true;
        }

        function validatePhone() {
            const phone = inputs.phone.value.trim();
            const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;

            if (!phone) {
                showError(inputs.phone, errors.phone, "Please enter your phone number");
                return false;
            }

            const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');

            if (!phoneRegex.test(cleanPhone)) {
                showError(inputs.phone, errors.phone, "Please enter a valid phone number");
                return false;
            }

            hideError(inputs.phone, errors.phone);
            return true;
        }

        function validateEmail() {
            const email = inputs.email.value.trim();
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

            if (!email) {
                showError(inputs.email, errors.email, "Please enter your email address");
                return false;
            }
            if (!emailRegex.test(email)) {
                showError(inputs.email, errors.email, "Please enter a valid email address");
                return false;
            }
            hideError(inputs.email, errors.email);
            return true;
        }

        function validateSubject() {
            const subject = inputs.subject.value.trim();
            if (!subject) {
                showError(inputs.subject, errors.subject, "Please enter a subject");
                return false;
            }
            if (subject.length < 5) {
                showError(inputs.subject, errors.subject, "Subject must be at least 5 characters");
                return false;
            }
            hideError(inputs.subject, errors.subject);
            return true;
        }

        function validateMessage() {
            const message = inputs.message.value.trim();
            if (!message) {
                showError(inputs.message, errors.message, "Please enter your message");
                return false;
            }
            if (message.length < 10) {
                showError(inputs.message, errors.message, "Message must be at least 10 characters");
                return false;
            }
            hideError(inputs.message, errors.message);
            return true;
        }

        function showError(input, errorElement, message) {
            if (input && errorElement) {
                input.classList.add('error');
                errorElement.textContent = message;
                errorElement.style.display = 'block';
            }
        }

        function hideError(input, errorElement) {
            if (input && errorElement) {
                input.classList.remove('error');
                errorElement.style.display = 'none';
            }
        }

        function validateForm() {
            return validateName() && validatePhone() && validateEmail() && validateSubject() && validateMessage();
        }

        // Real-time validation
        Object.keys(inputs).forEach(key => {
            if (inputs[key]) {
                inputs[key].addEventListener('input', function () {
                    switch (key) {
                        case 'name': validateName(); break;
                        case 'phone': validatePhone(); break;
                        case 'email': validateEmail(); break;
                        case 'subject': validateSubject(); break;
                        case 'message': validateMessage(); break;
                    }
                });

                inputs[key].addEventListener('blur', function () {
                    switch (key) {
                        case 'name': validateName(); break;
                        case 'phone': validatePhone(); break;
                        case 'email': validateEmail(); break;
                        case 'subject': validateSubject(); break;
                        case 'message': validateMessage(); break;
                    }
                });
            }
        });

        // Form submission
        contactForm.addEventListener('submit', async function (e) {
            e.preventDefault();

            // Hide previous errors
            if (formError) formError.classList.remove('active');

            // Validate form
            if (!validateForm()) {
                if (formError) {
                    formError.textContent = "Please fix the errors above before submitting";
                    formError.classList.add('active');
                }
                return;
            }

            // Show loading state
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.classList.add('sending');
            }
            if (sendingOverlay) sendingOverlay.classList.add('active');

            try {
                const formData = new FormData(this);

                // Send to FormSubmit
                const response = await fetch(this.action, {
                    method: 'POST',
                    body: formData,
                    headers: {
                        'Accept': 'application/json'
                    }
                });

                // Hide loading
                if (sendingOverlay) sendingOverlay.classList.remove('active');

                if (response.ok) {
                    // Show success
                    if (successPopup) successPopup.classList.add('active');

                    // Reset form
                    contactForm.reset();

                    // Clear errors
                    Object.values(inputs).forEach(input => {
                        if (input) input.classList.remove('error');
                    });
                    Object.values(errors).forEach(error => {
                        if (error) error.style.display = 'none';
                    });
                    if (formError) formError.classList.remove('active');
                } else {
                    const errorText = await response.text();
                    let errorMessage = 'Failed to send message. Please try again.';

                    if (response.status === 429) {
                        errorMessage = 'Too many requests. Please try again later.';
                    } else if (errorText.includes('unconfirmed')) {
                        errorMessage = 'Form is not activated. Please check your email for confirmation link.';
                    }

                    throw new Error(errorMessage);
                }
            } catch (error) {
                // Show error
                if (sendingOverlay) sendingOverlay.classList.remove('active');
                if (formError) {
                    formError.textContent = error.message;
                    formError.classList.add('active');
                }
                console.error('Form error:', error);
            } finally {
                // Reset button
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.classList.remove('sending');
                }
            }
        });

        // Close success popup
        if (closeSuccessBtn) {
            closeSuccessBtn.addEventListener('click', function () {
                if (successPopup) successPopup.classList.remove('active');
            });
        }

        if (successPopup) {
            successPopup.addEventListener('click', function (e) {
                if (e.target === this) {
                    this.classList.remove('active');
                }
            });
        }

        // Escape key to close popup
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && successPopup && successPopup.classList.contains('active')) {
                successPopup.classList.remove('active');
            }
        });

    }, 50); // Small delay
}