import {
    auth,
    provider,
    db
} from "./firebase.js";

import {
    database,
    appState,
    getSelectedSet
} from "./state.js";

import {
    render
} from "./render.js";

// import {
//     setupEvents
// } from "./events.js";

import {
    modal,
    display,
    setList,
    authButton,

    newSetButton,
    createButton,
    cancelButton,
    setNameInput,

    playSidebarButton,
    editSidebarButton,
    deleteSidebarButton,

    renameModal,
    renameInput,
    renameCancelButton,
    renameSaveButton,

    deleteModal,
    deleteCancelButton,
    deleteConfirmButton,

    addCardModal,
    addCardQuestionInput,
    addCardAnswerInput,
    addCardCancelButton,
    addCardSaveButton,

    editCardModal,
    editCardQuestionInput,
    editCardAnswerInput,
    editCardCancelButton,
    editCardSaveButton
} from "./dom.js";

import {
    openModal,
    closeModal,
    createSet,

    openRenameModal,
    closeRenameModal,
    renameSet,

    openDeleteModal,
    closeDeleteModal,
    deleteSet
} from "./sets.js";

import {
    handleAddCard,
    closeAddCardModal,

    saveEditedCard,
    closeEditCardModal
} from "./cards.js";

import {
    setupEvents
} from "./events.js";

import {
    initAuth
} from "./auth.js";

import {
    showMultiplayerJoinView,
    setupMultiplayerEvents
} from "./multiplayer-events.js";

function init() {
    initAuth();
    setupEvents();
    setupMultiplayerEvents();
    render();
}

init();

