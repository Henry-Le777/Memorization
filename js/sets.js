import {
    modal,
    setNameInput,

    renameModal,
    renameInput,

    deleteModal
} from "./dom.js";

import {
    database,
    appState,
    getSelectedSet,
    setDatabase
} from "./state.js";

import {
    render
} from "./render.js";

import {
    createSetDoc,
    updateSetDoc,
    deleteSetDoc
} from "./firestore.js";

export async function createSet() {

    console.log("1");

    const name = setNameInput.value.trim();

    if (!name) return;

    // database.push({
    //     id: Date.now(),
    //     name,
    //     cards: []
    // });

    // appState.selectedSetId = database.at(-1).id;
    const newSet = {
        name,
        cards: [],
    };
    console.log("2");
    await createSetDoc(newSet);
    console.log("Returned from Firestore");
    console.log("3");
    database.push(newSet);
    console.log("4");
    appState.selectedSetId = newSet.id;
    appState.mode = "edit";

    closeModal();

    render();

}

// export async function deleteSet() {

//     const selectedSet = getSelectedSet();

//     if (!selectedSet) return;

//     // setDatabase(database.filter(set => set.id !== selectedSet.id));
//     setDatabase(
//     database.filter(set => {
//         return set.id !== selectedSet.id;
//     })
//     );

//     appState.selectedSetId = null;
//     appState.mode = "welcome";

//     closeDeleteModal();

//     render();

// }

export async function deleteSet() {

    const selectedSet = getSelectedSet();

    if (!selectedSet) return;


    await deleteSetDoc(selectedSet.id);


    setDatabase(
        database.filter(set => {
            return set.id !== selectedSet.id;
        })
    );


    appState.selectedSetId = null;
    appState.mode = "welcome";


    closeDeleteModal();

    render();

}

// export function renameSet() {

//     const selectedSet = getSelectedSet();

//     if (!selectedSet) return;

//     const newName = renameInput.value.trim();

//     if (!newName) return;

//     selectedSet.name = newName;

//     closeRenameModal();

//     render();

// }

export async function renameSet() {

    const selectedSet = getSelectedSet();

    if (!selectedSet) return;


    const newName = renameInput.value.trim();

    if (!newName) return;


    selectedSet.name = newName;


    await updateSetDoc(
        selectedSet.id,
        {
            name: newName
        }
    );


    closeRenameModal();

    render();

}



export function openModal() {
    modal.classList.remove("hidden");
    setNameInput.focus();
}

export function closeModal() {
    modal.classList.add("hidden");
    setNameInput.value = "";
}

export function openDeleteModal() {

    deleteModal.classList.remove("hidden");

}

export function closeDeleteModal() {

    deleteModal.classList.add("hidden");

}

export function openRenameModal() {

    const selectedSet = getSelectedSet();

    if (!selectedSet) return;

    renameInput.value = selectedSet.name;

    renameModal.classList.remove("hidden");

    renameInput.focus();

    renameInput.select();

}

export function closeRenameModal() {

    renameModal.classList.add("hidden");

    renameInput.value = "";

}