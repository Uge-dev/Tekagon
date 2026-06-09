const firebaseConfig = {
    apiKey: "AIzaSyAz5tLFyyTuBJYr0VtLHIrUqhnrJIf8tvs",
    authDomain: "tekagon-scheduling.firebaseapp.com",
    projectId: "tekagon-scheduling",
    storageBucket: "tekagon-scheduling.firebasestorage.app",
    messagingSenderId: "743488562874",
    appId: "1:743488562874:web:71ce7f7cdf0a7214c7c483",
    measurementId: "G-M9H2XESGL8"
};

// Initialize only if not already initialized
if (!firebase.apps.length) {
    try {
        firebase.initializeApp(firebaseConfig);
        console.log("Firebase initialized successfully");
    } catch (error) {
        console.error("Firebase initialization failed:", error);
    }
} else {
    console.log("Firebase already initialized");
}

// Make Firestore globally available
let db = null;
// You're using MongoDB, not Firestore — no db needed here
const db = null;
window.db = db;

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { firebaseConfig, db };
}

// Store in window for global access
window.db = db;
window.firebaseConfig = firebaseConfig;