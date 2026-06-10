/**
 * auth.js — Firebase Authentication for Tekagon
 *
 * Provides:
 *  - Google Sign-In
 *  - Email + Password Sign-Up with email verification
 *  - Email + Password Sign-In
 *  - Logout with confirmation popup
 *  - Persists userId in localStorage so the rest of the app works unchanged
 *
 * Load AFTER firebase-config.js and BEFORE dashboard.js in your HTML:
 *   <script src="https://www.gstatic.com/firebasejs/9.x.x/firebase-app-compat.js"></script>
 *   <script src="https://www.gstatic.com/firebasejs/9.x.x/firebase-auth-compat.js"></script>
 *   <script src="js/firebase-config.js"></script>
 *   <script src="js/auth.js"></script>
 *   <script src="js/api.js"></script>
 *   <script src="js/dashboard.js"></script>
 */

(function () {
  'use strict';

  // ── Helpers ────────────────────────────────────────────────────────────────

  function injectStyles() {
    if (document.getElementById('tekagon-auth-styles')) return;
    const style = document.createElement('style');
    style.id = 'tekagon-auth-styles';
    style.textContent = `
      /* ── Auth overlay ── */
      #tekagon-auth-overlay {
        position: fixed; inset: 0;
        background: rgba(10, 14, 26, 0.97);
        backdrop-filter: blur(8px);
        display: flex; align-items: center; justify-content: center;
        z-index: 99999; padding: 20px;
        animation: authFadeIn .25s ease;
      }
      @keyframes authFadeIn { from { opacity: 0; } to { opacity: 1; } }

      .auth-card {
        background: #1e293b;
        border: 1px solid rgba(255,255,255,.08);
        border-radius: 18px;
        width: 100%; max-width: 440px;
        box-shadow: 0 24px 64px rgba(0,0,0,.55);
        overflow: hidden;
        animation: authSlideUp .3s cubic-bezier(.2,.9,.3,1);
      }
      @keyframes authSlideUp {
        from { opacity: 0; transform: translateY(24px); }
        to   { opacity: 1; transform: translateY(0); }
      }

      .auth-header {
        padding: 32px 32px 20px;
        background: linear-gradient(135deg, rgba(111,101,255,.15), rgba(18,27,45,.4));
        border-bottom: 1px solid rgba(255,255,255,.05);
        text-align: center;
      }
      .auth-header h2 {
        margin: 0 0 8px;
        font-size: 1.6rem;
        background: linear-gradient(to right, #93fff6, #6f65ff);
        -webkit-background-clip: text; -webkit-text-fill-color: transparent;
      }
      .auth-header p { color: #94a3b8; margin: 0; font-size: .95rem; }

      .auth-body { padding: 28px 32px 32px; }

      .auth-tabs {
        display: flex; gap: 4px;
        background: rgba(255,255,255,.04);
        border-radius: 10px; padding: 4px;
        margin-bottom: 24px;
      }
      .auth-tab {
        flex: 1; padding: 10px; border: none; border-radius: 8px;
        background: transparent; color: #94a3b8;
        cursor: pointer; font-size: .9rem; font-weight: 500;
        transition: all .2s;
      }
      .auth-tab.active {
        background: linear-gradient(135deg, rgba(111,101,255,.3), rgba(147,255,246,.1));
        color: #e2e8f0;
      }

      .auth-form { display: flex; flex-direction: column; gap: 16px; }
      .auth-form.hidden { display: none; }

      .auth-field label {
        display: block; margin-bottom: 7px; font-size: .9rem;
        color: #cbd5e1; font-weight: 500;
      }
      .auth-field input {
        width: 100%; padding: 11px 14px; border-radius: 8px;
        background: rgba(255,255,255,.04);
        border: 1.5px solid rgba(255,255,255,.1);
        color: #e2e8f0; font-size: .95rem;
        transition: border-color .2s;
        box-sizing: border-box;
      }
      .auth-field input:focus {
        outline: none; border-color: #6f65ff;
        background: rgba(255,255,255,.06);
      }

      .auth-error {
        background: rgba(239,68,68,.1); border: 1px solid rgba(239,68,68,.3);
        color: #fca5a5; border-radius: 8px; padding: 10px 14px;
        font-size: .88rem; display: none;
      }
      .auth-error.show { display: block; }

      .auth-info {
        background: rgba(59,130,246,.08); border: 1px solid rgba(59,130,246,.25);
        color: #93c5fd; border-radius: 8px; padding: 10px 14px;
        font-size: .88rem; display: none;
      }
      .auth-info.show { display: block; }

      .btn-auth-submit {
        padding: 13px; border: none; border-radius: 10px;
        background: linear-gradient(135deg, #6f65ff, #93fff6);
        color: #0f172a; font-size: 1rem; font-weight: 700;
        cursor: pointer; transition: all .25s; margin-top: 4px;
      }
      .btn-auth-submit:hover { opacity: .9; transform: translateY(-2px); }
      .btn-auth-submit:disabled { opacity: .5; cursor: not-allowed; transform: none; }

      .auth-divider {
        display: flex; align-items: center; gap: 12px;
        margin: 4px 0; color: #475569; font-size: .85rem;
      }
      .auth-divider::before, .auth-divider::after {
        content: ''; flex: 1; height: 1px;
        background: rgba(255,255,255,.07);
      }

      .btn-google {
        display: flex; align-items: center; justify-content: center; gap: 10px;
        width: 100%; padding: 12px; border-radius: 10px;
        background: rgba(255,255,255,.05);
        border: 1.5px solid rgba(255,255,255,.12);
        color: #e2e8f0; font-size: .95rem; font-weight: 500;
        cursor: pointer; transition: all .2s;
      }
      .btn-google:hover {
        background: rgba(255,255,255,.09); transform: translateY(-2px);
      }
      .btn-google img { width: 20px; height: 20px; }

      /* ── Logout button (injected into nav) ── */
      #tekagon-logout-btn {
        display: flex; align-items: center; gap: 8px;
        width: 100%; justify-content: flex-start;
        margin-top: 8px;
        padding: 9px 18px; border-radius: 8px;
        background: rgba(239,68,68,.1);
        border: 1px solid rgba(239,68,68,.3);
        color: #f87171; font-size: .9rem; font-weight: 500;
        cursor: pointer; transition: all .2s;
        white-space: nowrap;
      }
      #tekagon-logout-btn:hover { background: rgba(239,68,68,.2); }

      /* ── Logout confirmation popup ── */
      #tekagon-logout-confirm {
        position: fixed; inset: 0;
        background: rgba(0,0,0,.75); backdrop-filter: blur(6px);
        display: flex; align-items: center; justify-content: center;
        z-index: 100000; padding: 20px; animation: authFadeIn .2s ease;
      }
      .logout-card {
        background: #1e293b; border: 1px solid rgba(255,255,255,.1);
        border-radius: 14px; padding: 32px; max-width: 380px; width: 100%;
        text-align: center; box-shadow: 0 16px 48px rgba(0,0,0,.5);
        animation: authSlideUp .25s cubic-bezier(.2,.9,.3,1);
      }
      .logout-card .logout-icon {
        width: 56px; height: 56px; border-radius: 14px; margin: 0 auto 16px;
        background: rgba(239,68,68,.12); display: flex; align-items: center;
        justify-content: center; font-size: 1.6rem; color: #f87171;
      }
      .logout-card h3 { margin: 0 0 8px; font-size: 1.25rem; }
      .logout-card p { color: #94a3b8; margin: 0 0 24px; font-size: .95rem; }
      .logout-actions { display: flex; gap: 12px; }
      .btn-logout-cancel {
        flex: 1; padding: 12px; border-radius: 8px;
        background: rgba(255,255,255,.05); border: 1px solid rgba(255,255,255,.1);
        color: #e2e8f0; cursor: pointer; font-size: .95rem;
        transition: all .2s;
      }
      .btn-logout-cancel:hover { background: rgba(255,255,255,.1); }
      .btn-logout-yes {
        flex: 1; padding: 12px; border-radius: 8px;
        background: rgba(239,68,68,.15); border: 1px solid rgba(239,68,68,.35);
        color: #f87171; cursor: pointer; font-size: .95rem; font-weight: 600;
        transition: all .2s;
      }
      .btn-logout-yes:hover { background: rgba(239,68,68,.25); }

      /* ── Verified banner ── */
      .auth-verify-banner {
        background: rgba(16,185,129,.08); border: 1px solid rgba(16,185,129,.25);
        color: #6ee7b7; border-radius: 8px; padding: 12px 16px;
        font-size: .9rem; margin-bottom: 16px;
      }
    `;
    document.head.appendChild(style);
  }

  // ── Auth UI ────────────────────────────────────────────────────────────────

  function showAuthOverlay() {
    injectStyles();

    const overlay = document.createElement('div');
    overlay.id = 'tekagon-auth-overlay';
    overlay.innerHTML = `
      <div class="auth-card">
        <div class="auth-header">
          <h2>Welcome to Tekagon</h2>
          <p>Sign in to access support, tickets, and chat</p>
        </div>
        <div class="auth-body">
          <div class="auth-tabs">
            <button class="auth-tab active" data-tab="signin">Sign In</button>
            <button class="auth-tab" data-tab="signup">Create Account</button>
          </div>

          <div id="auth-error" class="auth-error"></div>
          <div id="auth-info" class="auth-info"></div>

          <!-- Sign-In form -->
          <div class="auth-form" id="form-signin">
            <div class="auth-field">
              <label>Email</label>
              <input type="email" id="si-email" placeholder="you@example.com" autocomplete="email">
            </div>
            <div class="auth-field">
              <label>Password</label>
              <input type="password" id="si-password" placeholder="••••••••" autocomplete="current-password">
            </div>
            <button class="btn-auth-submit" id="btn-signin">Sign In</button>
            <div class="auth-divider">or</div>
            <button class="btn-google" id="btn-google-signin">
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google">
              Continue with Google
            </button>
          </div>

          <!-- Sign-Up form -->
          <div class="auth-form hidden" id="form-signup">
            <div class="auth-field">
              <label>Full Name</label>
              <input type="text" id="su-name" placeholder="John Doe" autocomplete="name">
            </div>
            <div class="auth-field">
              <label>Email</label>
              <input type="email" id="su-email" placeholder="you@example.com" autocomplete="email">
            </div>
            <div class="auth-field">
              <label>Password (min 6 characters)</label>
              <input type="password" id="su-password" placeholder="••••••••" autocomplete="new-password">
            </div>
            <div class="auth-field">
              <label>Phone Number</label>
              <input type="tel" id="su-phone" placeholder="+234 800 000 0000">
            </div>
            <button class="btn-auth-submit" id="btn-signup">Create Account</button>
            <div class="auth-divider">or</div>
            <button class="btn-google" id="btn-google-signup">
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google">
              Continue with Google
            </button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    wireAuthOverlay(overlay);
  }

  function removeAuthOverlay() {
    const el = document.getElementById('tekagon-auth-overlay');
    if (el) el.remove();
  }

  function showAuthError(msg) {
    const el = document.getElementById('auth-error');
    if (el) { el.textContent = msg; el.classList.add('show'); }
    const info = document.getElementById('auth-info');
    if (info) info.classList.remove('show');
  }

  function showAuthInfo(msg) {
    const el = document.getElementById('auth-info');
    if (el) { el.innerHTML = msg; el.classList.add('show'); }
    const err = document.getElementById('auth-error');
    if (err) err.classList.remove('show');
  }

  function clearAuthMessages() {
    ['auth-error', 'auth-info'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.classList.remove('show');
    });
  }

  function setLoading(btnId, loading) {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    btn.disabled = loading;
    btn.textContent = loading ? 'Please wait…' : btn.dataset.label || btn.textContent;
  }

  function wireAuthOverlay(overlay) {
    // Tab switching
    overlay.querySelectorAll('.auth-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        overlay.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const which = tab.dataset.tab;
        document.getElementById('form-signin').classList.toggle('hidden', which !== 'signin');
        document.getElementById('form-signup').classList.toggle('hidden', which !== 'signup');
        clearAuthMessages();
      });
    });

    const auth = firebase.auth();
    const canUseBackendEmailAuth = () =>
      window.TekagonAPI &&
      typeof window.TekagonAPI.signupWithEmail === 'function' &&
      typeof window.TekagonAPI.signinWithEmail === 'function';

    const shouldTryBackendAuth = (code) => [
      'auth/user-not-found',
      'auth/invalid-credential',
      'auth/operation-not-allowed',
      'auth/configuration-not-found',
      'auth/internal-error'
    ].includes(code);

    // ── Sign In ──
    document.getElementById('btn-signin').addEventListener('click', async () => {
      const email = document.getElementById('si-email').value.trim();
      const password = document.getElementById('si-password').value;
      if (!email || !password) return showAuthError('Please enter your email and password.');
      setLoading('btn-signin', true);
      clearAuthMessages();
      try {
        const cred = await auth.signInWithEmailAndPassword(email, password);
        // onAuthStateChanged handles the rest
      } catch (err) {
        if (canUseBackendEmailAuth() && shouldTryBackendAuth(err.code)) {
          const result = await window.TekagonAPI.signinWithEmail({ email, password });
          if (result.success && result.user) {
            setBackendAuthSession(result.user);
            return;
          }
          showAuthError(result.error || friendlyError(err.code));
        } else {
          showAuthError(friendlyError(err.code));
        }
        setLoading('btn-signin', false);
      }
    });

    // ── Sign Up ──
    document.getElementById('btn-signup').addEventListener('click', async () => {
      const name = document.getElementById('su-name').value.trim();
      const email = document.getElementById('su-email').value.trim();
      const password = document.getElementById('su-password').value;
      const phone = document.getElementById('su-phone').value.trim();
      if (!name || !email || !password) return showAuthError('Name, email, and password are required.');
      if (password.length < 6) return showAuthError('Password must be at least 6 characters.');
      setLoading('btn-signup', true);
      clearAuthMessages();
      try {
        const cred = await auth.createUserWithEmailAndPassword(email, password);
        await cred.user.updateProfile({ displayName: name });
        cred.user.sendEmailVerification().catch(() => {});
        if (window.TekagonAPI) {
          await window.TekagonAPI.registerUser({
            userId: 'FB_' + cred.user.uid,
            name,
            phone: phone || '',
            email,
            company: ''
          });
        }
        // Save extra info for use once verified
        localStorage.setItem('pendingUserName', name);
        localStorage.setItem('pendingUserPhone', phone || '');
        // onAuthStateChanged handles the signed-in session.
      } catch (err) {
        if (canUseBackendEmailAuth() && shouldTryBackendAuth(err.code)) {
          const result = await window.TekagonAPI.signupWithEmail({ name, email, password, phone, company: '' });
          if (result.success && result.user) {
            setBackendAuthSession(result.user);
            return;
          }
          showAuthError(result.error || friendlyError(err.code));
        } else {
          showAuthError(friendlyError(err.code));
        }
        setLoading('btn-signup', false);
      }
    });

    // ── Google (both forms) ──
    ['btn-google-signin', 'btn-google-signup'].forEach(id => {
      document.getElementById(id).addEventListener('click', async () => {
        clearAuthMessages();
        try {
          const provider = new firebase.auth.GoogleAuthProvider();
          provider.setCustomParameters({ prompt: 'select_account' });
          await auth.signInWithPopup(provider);
          // onAuthStateChanged handles it
        } catch (err) {
          if (err.code !== 'auth/popup-closed-by-user') {
            showAuthError(friendlyError(err.code));
          }
        }
      });
    });
  }

  // ── Logout button + confirmation ───────────────────────────────────────────

  function injectLogoutButton() {
    if (document.getElementById('tekagon-logout-btn')) return;

    const btn = document.createElement('button');
    btn.id = 'tekagon-logout-btn';
    btn.innerHTML = '<i class="fas fa-sign-out-alt"></i> Logout';
    btn.addEventListener('click', showLogoutConfirm);

    // Place it below Contact Us in the dashboard sidebar when available.
    const target =
      document.querySelector('.sidebar-contact') ||
      document.querySelector('.header-right') ||
      document.querySelector('.admin-header .header-right') ||
      document.querySelector('header') ||
      document.body;
    target.appendChild(btn);
  }

  function showLogoutConfirm() {
    injectStyles();
    if (document.getElementById('tekagon-logout-confirm')) return;

    const popup = document.createElement('div');
    popup.id = 'tekagon-logout-confirm';
    popup.innerHTML = `
      <div class="logout-card">
        <div class="logout-icon"><i class="fas fa-sign-out-alt"></i></div>
        <h3>Log out?</h3>
        <p>Are you sure you want to log out of your Tekagon account?</p>
        <div class="logout-actions">
          <button class="btn-logout-cancel" id="logout-no">No, stay</button>
          <button class="btn-logout-yes" id="logout-yes">Yes, log out</button>
        </div>
      </div>
    `;
    document.body.appendChild(popup);

    document.getElementById('logout-no').addEventListener('click', () => popup.remove());
    document.getElementById('logout-yes').addEventListener('click', async () => {
      popup.remove();
      // Clear session data
      ['chatUserId', 'userName', 'userPhone', 'userEmail', 'userCompany',
       'current_ticket_id', 'pendingUserName', 'pendingUserPhone'].forEach(k =>
        localStorage.removeItem(k)
      );
      await firebase.auth().signOut();
      const btn = document.getElementById('tekagon-logout-btn');
      if (btn) btn.remove();
      showAuthOverlay();
    });
  }

  // ── Map Firebase error codes to human-readable messages ───────────────────
  function friendlyError(code) {
    const map = {
      'auth/user-not-found':       'No account found with that email.',
      'auth/wrong-password':       'Incorrect password.',
      'auth/invalid-email':        'Please enter a valid email address.',
      'auth/email-already-in-use': 'An account with this email already exists.',
      'auth/weak-password':        'Password must be at least 6 characters.',
      'auth/too-many-requests':    'Too many attempts. Please try again later.',
      'auth/network-request-failed': 'Network error. Check your connection.',
      'auth/invalid-credential':   'Incorrect email or password.',
      'auth/operation-not-allowed': 'Email/password sign-in is not enabled in Firebase. Using the Tekagon account system instead.',
      'auth/configuration-not-found': 'Firebase email/password sign-in is not configured.',
      'auth/internal-error':        'Authentication service is temporarily unavailable.',
    };
    return map[code] || 'Something went wrong. Please try again.';
  }

  function setBackendAuthSession(user) {
    removeAuthOverlay();
    const name = user.name || (user.email ? user.email.split('@')[0] : 'User');
    localStorage.setItem('chatUserId', user.userId);
    localStorage.setItem('userName', name);
    localStorage.setItem('userPhone', user.phone || '');
    localStorage.setItem('userEmail', user.email || '');
    localStorage.setItem('userCompany', user.company || '');
    localStorage.removeItem('pendingUserName');
    localStorage.removeItem('pendingUserPhone');
    injectLogoutButton();

    if (typeof window.buildPage === 'function') {
      window.buildPage(window._currentPage || 'home');
    }
  }

  // ── Session handler — runs on every page load ──────────────────────────────

  function onUserSignedIn(firebaseUser) {
    removeAuthOverlay();

    // Build a stable userId from the Firebase UID
    const userId = 'FB_' + firebaseUser.uid;
    const name    = firebaseUser.displayName ||
                    localStorage.getItem('pendingUserName') || 'User';
    const phone   = localStorage.getItem('pendingUserPhone') || '';
    const email   = firebaseUser.email || '';

    // Persist so the rest of the app (which reads localStorage) still works
    localStorage.setItem('chatUserId', userId);
    localStorage.setItem('userName',   name);
    localStorage.setItem('userPhone',  phone);
    localStorage.setItem('userEmail',  email);
    localStorage.removeItem('pendingUserName');
    localStorage.removeItem('pendingUserPhone');

    // Register/update in MongoDB (fire-and-forget)
    if (window.TekagonAPI) {
      window.TekagonAPI.registerUser({ userId, name, phone, email, company: '' })
        .catch(() => {});
    }

    // Add logout button to the nav
    injectLogoutButton();

    // If dashboard.js is loaded and has already built the page, trigger a reload
    // of the chat/dashboard so it picks up the new userId
    if (typeof window.buildPage === 'function') {
      window.buildPage(window._currentPage || 'home');
    }
  }

  function onUserSignedOut() {
    const existingUserId = localStorage.getItem('chatUserId');
    if (existingUserId && existingUserId.startsWith('EMAIL_')) {
      removeAuthOverlay();
      injectLogoutButton();
      if (typeof window.buildPage === 'function') {
        window.buildPage(window._currentPage || 'home');
      }
      return;
    }

    // Remove logout button
    const btn = document.getElementById('tekagon-logout-btn');
    if (btn) btn.remove();
    // Show auth screen
    showAuthOverlay();
  }

  // ── Bootstrap ──────────────────────────────────────────────────────────────

  function init() {
    injectStyles();

    // Wait for Firebase to be ready
    if (typeof firebase === 'undefined' || typeof firebase.auth !== 'function') {
      console.error('auth.js: Firebase Auth SDK not loaded. Check your script tags.');
      return;
    }

    const auth = firebase.auth();

    auth.onAuthStateChanged(user => {
      if (user) {
        onUserSignedIn(user);
      } else {
        onUserSignedOut();
      }
    });
  }

  // Run after DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
