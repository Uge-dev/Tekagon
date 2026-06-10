// firebase-config.js
const publicConfig = window.TEKAGON_PUBLIC_CONFIG || {};
const firebaseConfig = {
    apiKey: publicConfig.FIREBASE_API_KEY || '',
    authDomain: publicConfig.FIREBASE_AUTH_DOMAIN || '',
    projectId: publicConfig.FIREBASE_PROJECT_ID || '',
    storageBucket: publicConfig.FIREBASE_STORAGE_BUCKET || '',
    messagingSenderId: publicConfig.FIREBASE_MESSAGING_SENDER_ID || '',
    appId: publicConfig.FIREBASE_APP_ID || '',
    measurementId: publicConfig.FIREBASE_MEASUREMENT_ID || ''
};

// Initialise only once
if (firebaseConfig.apiKey && !firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
    console.log('Firebase initialised');
} else if (!firebaseConfig.apiKey) {
    console.warn('Firebase public config is missing. Set the VITE_FIREBASE_* variables before building.');
}

// You are using MongoDB, not Firestore — db is not needed
window.db = null;
window.firebaseConfig = firebaseConfig;
