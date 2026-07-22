import {
    db
} from "./firebase.js";

import {
    database,
    appState,
    setDatabase
} from "./state.js";

import {
    doc,
    getDoc,
    setDoc,
    collection,
    getDocs,
    addDoc,
    serverTimestamp,
    updateDoc,
    deleteDoc
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

function getUserDocRef() {
    if (!appState.user) return null;
    return doc(db, "users", appState.user.uid);
}

function getSetsCollectionRef() {

    const userRef = getUserDocRef();

    if (!userRef) return null;

    return collection(userRef, "sets");

}

export async function loadUserProfile() {
    const userRef = getUserDocRef();

    if (!userRef) return;

    const snapshot = await getDoc(userRef);

    if (!snapshot.exists()) {

        await saveUserProfile();

    }
}

export async function createSetDoc(set) {
    console.log("A");
    const setsRef = getSetsCollectionRef();
    console.log("B");
    if (!setsRef) return null;

    const setRef = doc(setsRef);
    console.log("C");
    set.id = setRef.id;

    try {

        await setDoc(setRef, {

            name: set.name,

            cards: set.cards,

            createdAt: serverTimestamp(),

            updatedAt: serverTimestamp()

        });

        console.log("D");

    } catch (error) {

        console.error(error);

    }
    return set.id;

}

export async function saveUserProfile() {

}

export async function loadUserSets() {

    const setsRef = getSetsCollectionRef();

    if (!setsRef) return;


    try {

        const snapshot = await getDocs(setsRef);


        // const sets = snapshot.docs.map(doc => ({

        //     id: doc.id,

        //     ...doc.data(),

        //     studyMode:
        //         data.studyMode ??
        //         "multiple-choice"

        // }));

        const sets = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
            };

        });


        setDatabase(sets);


        return sets;


    } catch(error){

        console.error(
            "Load sets error:",
            error
        );

    }

}

export async function updateSetDoc(setId, data) {

    const userRef = getUserDocRef();

    if (!userRef) return;


    const setRef = doc(
        userRef,
        "sets",
        setId
    );


    try {

        await updateDoc(setRef, {

            ...data,

            updatedAt: serverTimestamp()

        });


    } catch(error) {

        console.error(
            "Update set error:",
            error
        );

    }

}

export async function deleteSetDoc(setId) {

    const userRef = getUserDocRef();

    if (!userRef) return;


    const setRef = doc(
        userRef,
        "sets",
        setId
    );


    try {

        await deleteDoc(setRef);

        console.log("Set deleted:", setId);


    } catch(error) {

        console.error(
            "Delete set error:",
            error
        );

    }

}

export async function saveUserSets() {

}

