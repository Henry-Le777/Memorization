import { initializeApp } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js";

import {
    getAuth,
    GoogleAuthProvider
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";

import {
    getFirestore
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyA0u2ozR42tHV5ojigc3b8gRbzW27ME280",
    authDomain: "memorize-74418.firebaseapp.com",
    projectId: "memorize-74418",
    storageBucket: "memorize-74418.firebasestorage.app",
    messagingSenderId: "367409842690",
    appId: "1:367409842690:web:88ffcc870e606c98a1751b",
    measurementId: "G-SGLH0GLJQQ"
};

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);

const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: 'select_account' });

const db = getFirestore(app);

export {
    auth,
    provider,
    db
};

