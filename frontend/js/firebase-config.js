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
try {
    if (firebase.firestore) {
        db = firebase.firestore();
        console.log("Firebase Firestore available");

        // Enable offline persistence
        db.enablePersistence()
            .catch((err) => {
                if (err.code == 'failed-precondition') {
                    console.log("Multiple tabs open, persistence can only be enabled in one tab at a time.");
                } else if (err.code == 'unimplemented') {
                    console.log("The current browser doesn't support persistence.");
                }
            });
    }
} catch (error) {
    console.error("Firebase Firestore error:", error);
    db = null;
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { firebaseConfig, db };
}

// Store in window for global access
window.db = db;
window.firebaseConfig = firebaseConfig;