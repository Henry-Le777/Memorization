import {
    auth,
    provider
} from "./firebase.js";

import {
    signInWithPopup,
    signOut,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";

import {
    appState
} from "./state.js";

import {
    authButton,
    signOutButton,
    avatar,
    username,
    newSetButton
} from "./dom.js";

import {
    loadUserSets,
    loadUserProfile
} from "./firestore.js";

import {
    render
} from "./render.js";

export async function login() {
    try {

        await signInWithPopup(auth, provider);

    } catch (error) {

        console.error(error);

    }
}

export async function logout() {
    try {

        await signOut(auth);

    } catch (error) {

        console.error(error);

    }
}

export function updateAuthUI(user) {

    if (user) {

        authButton.classList.add("hidden");

        signOutButton.classList.remove("hidden");

        username.classList.remove("hidden");

        username.textContent = user.displayName;

        newSetButton.disabled = false;

        // Handle avatar: show with fallback on error
        avatar.classList.remove("hidden");
        avatar.alt = `${user.displayName}'s avatar`;

        // Set onerror fallback: if image fails to load, show initials
        avatar.onerror = function() {
            this.onerror = null; // prevent infinite loop
            this.removeAttribute("src");
            this.style.background = "linear-gradient(135deg, var(--primary), var(--primary-light))";
            this.style.display = "flex";
            this.style.alignItems = "center";
            this.style.justifyContent = "center";
            this.style.color = "white";
            this.style.fontWeight = "bold";
            this.style.fontSize = "16px";
            this.textContent = (user.displayName || "?")[0].toUpperCase();
        };

        // Add timestamp to bust browser cache when switching accounts
        const photoURL = user.photoURL;
        if (photoURL) {
            // Cache-bust: append timestamp so browser re-fetches for different accounts
            const separator = photoURL.includes("?") ? "&" : "?";
            avatar.src = `${photoURL}${separator}t=${Date.now()}`;
        } else {
            // No photoURL: use a fallback with initials
            avatar.removeAttribute("src");
            avatar.style.background = "linear-gradient(135deg, var(--primary), var(--primary-light))";
            avatar.style.display = "flex";
            avatar.style.alignItems = "center";
            avatar.style.justifyContent = "center";
            avatar.style.color = "white";
            avatar.style.fontWeight = "bold";
            avatar.style.fontSize = "16px";
            avatar.textContent = (user.displayName || "?")[0].toUpperCase();
        }

    } else {

        authButton.classList.remove("hidden");

        signOutButton.classList.add("hidden");

        avatar.classList.add("hidden");

        username.classList.add("hidden");

        avatar.removeAttribute("src");
        avatar.onerror = null;
        avatar.style.background = "";
        avatar.style.display = "";
        avatar.style.alignItems = "";
        avatar.style.justifyContent = "";
        avatar.style.color = "";
        avatar.style.fontWeight = "";
        avatar.style.fontSize = "";
        avatar.textContent = "";

        username.textContent = "";

        newSetButton.disabled = true;

    }

}

export function observeAuth() {

    onAuthStateChanged(auth, async user => {

        appState.user = user;

        updateAuthUI(user);


        if (user) {

            await loadUserProfile();

            await loadUserSets();

            render();

        }

    });

}

export function initAuth() {
    observeAuth();
    authButton.addEventListener("click", login);
    signOutButton.addEventListener("click", logout);
}