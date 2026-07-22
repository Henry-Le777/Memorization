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

        avatar.classList.remove("hidden");

        username.classList.remove("hidden");

        avatar.src = user.photoURL;

        username.textContent = user.displayName;

        newSetButton.disabled = false;
        

    } else {

        authButton.classList.remove("hidden");

        signOutButton.classList.add("hidden");

        avatar.classList.add("hidden");

        username.classList.add("hidden");

        avatar.removeAttribute("src");

        username.textContent = "";

        newSetButton.disabled = true;

    }

}

// export function observeAuth() {

//     onAuthStateChanged(auth, async user => {

//         appState.user = user;

//         updateAuthUI(user);


//         if (user) {

//             await loadUserProfile();

//             await loadUserSets();

//             console.log("User data loaded");

//         }

//     });

// }

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