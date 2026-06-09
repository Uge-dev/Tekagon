// firebase-config.js
const firebaseConfig = {
    apiKey: "AIzaSyAz5tLFyyTuBJYr0VtLHIrUqhnrJIf8tvs",
    authDomain: "tekagon-scheduling.firebaseapp.com",
    projectId: "tekagon-scheduling",
    storageBucket: "tekagon-scheduling.firebasestorage.app",
    messagingSenderId: "743488562874",
    appId: "1:743488562874:web:71ce7f7cdf0a7214c7c483",
    measurementId: "G-M9H2XESGL8"
};

// Initialise only once
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
    console.log('Firebase initialised');
}

// You are using MongoDB, not Firestore — db is not needed
window.db = null;
window.firebaseConfig = firebaseConfig;