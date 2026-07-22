import {
    addCardModal,
    addCardQuestionInput,
    addCardAnswerInput,

    editCardModal,
    editCardQuestionInput,
    editCardAnswerInput
} from "./dom.js";

import {
    appState,
    getSelectedSet
} from "./state.js";

import {
    render
} from "./render.js";

import {
    updateSetDoc
} from "./firestore.js";

export function openAddCardModal() {
    const selectedSet = getSelectedSet();
    if (!selectedSet) return;

    addCardModal.classList.remove("hidden");
    addCardQuestionInput.focus();

}

export function closeAddCardModal() {
    addCardModal.classList.add("hidden");

    addCardQuestionInput.value = "";
    addCardAnswerInput.value = "";
}

export function closeEditCardModal() {

    editCardModal.classList.add("hidden");

    editCardQuestionInput.value = "";
    editCardAnswerInput.value = "";

    appState.editingCardId = null;

}



// export function addCard(question, answer) {

//     const set = getSelectedSet();

//     if (!set) return;

//     set.cards.push({
//         id: Date.now(),
//         q: question,
//         a: answer
//     });

//     render();

// }

export async function addCard(question, answer) {

    const set = getSelectedSet();

    if (!set) return;


    set.cards.push({
        id: Date.now(),
        q: question,
        a: answer
    });


    await updateSetDoc(
        set.id,
        {
            cards: set.cards
        }
    );


    render();

}

export function handleAddCard() {
    const question = addCardQuestionInput.value.trim();
    const answer = addCardAnswerInput.value.trim();

    if (!question || !answer) return;

    addCard(question, answer);

    closeAddCardModal();
}

// export function handleDeleteCard(cardId) {
//     const set = getSelectedSet();
//     if (!set) return;

//     set.cards = set.cards.filter(card => {
//         return card.id !== cardId;
//     });
//     render();
// }

export async function handleDeleteCard(cardId) {

    const set = getSelectedSet();

    if (!set) return;


    set.cards = set.cards.filter(card => {
        return card.id !== cardId;
    });


    await updateSetDoc(
        set.id,
        {
            cards: set.cards
        }
    );


    render();

}

export function handleEditCard(cardId) {

    const set = getSelectedSet();

    if (!set) return;

    const card = set.cards.find(card => {
        return card.id === cardId;
    });

    if (!card) return;

    appState.editingCardId = card.id;

    editCardQuestionInput.value = card.q;
    editCardAnswerInput.value = card.a;

    editCardModal.classList.remove("hidden");

    editCardQuestionInput.focus();

}

// export function saveEditedCard() {

//     const set = getSelectedSet();

//     if (!set) return;

//     const card = set.cards.find(card => {
//         return card.id === appState.editingCardId;
//     });

//     if (!card) return;

//     const question = editCardQuestionInput.value.trim();
//     const answer = editCardAnswerInput.value.trim();

//     if (!question || !answer) return;

//     card.q = question;
//     card.a = answer;

//     closeEditCardModal();

//     render();

// }

export async function saveEditedCard() {

    const set = getSelectedSet();

    if (!set) return;


    const card = set.cards.find(card => {
        return card.id === appState.editingCardId;
    });


    if (!card) return;


    const question = editCardQuestionInput.value.trim();
    const answer = editCardAnswerInput.value.trim();


    if (!question || !answer) return;


    card.q = question;
    card.a = answer;


    await updateSetDoc(
        set.id,
        {
            cards: set.cards
        }
    );


    closeEditCardModal();

    render();

}