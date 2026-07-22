import {
    addCardModal,
    addCardQuestionInput,
    addCardAnswerInput,

    editCardModal,
    editCardQuestionInput,
    editCardAnswerInput,

    importExportModal,
    importExportTitle,
    importExportTextarea,
    importExportStats,
    importExportActionButton,
    importExportCancelButton
} from "./dom.js";

import {
    appState,
    getSelectedSet,
    database
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

function parseImportText(text) {
    const lines = text.split("\n");
    const cards = [];
    let skippedLines = 0;

    for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line || line.startsWith("#")) continue;

        const parts = line.split("\t");
        if (parts.length >= 2) {
            const q = parts[0].trim();
            const a = parts.slice(1).join("\t").trim();
            if (q && a) {
                cards.push({ id: Date.now() + cards.length, q, a });
            } else {
                skippedLines++;
            }
        } else {
            skippedLines++;
        }
    }

    return { cards, skippedLines };
}

let importExportMode = "import";

export function openImportModal() {
    importExportMode = "import";
    importExportTitle.textContent = "Import Cards";
    importExportTextarea.value = "";
    importExportTextarea.readOnly = false;
    importExportTextarea.placeholder = "question1\tanswer1\nquestion2\tanswer2\nquestion3\tanswer3";
    importExportActionButton.textContent = "Import";
    importExportActionButton.className = "action-button primary";
    importExportStats.textContent = "";
    importExportStats.className = "import-export-stats";
    importExportModal.classList.remove("hidden");
    importExportTextarea.focus();
}

export function openExportModal() {
    importExportMode = "export";
    const set = getSelectedSet();
    if (!set || !set.cards || set.cards.length === 0) {
        alert("No cards to export.");
        return;
    }

    importExportTitle.textContent = "Export Cards";
    importExportTextarea.value = set.cards.map(card => `${card.q}\t${card.a}`).join("\n");
    importExportTextarea.readOnly = true;
    importExportTextarea.placeholder = "";
    importExportActionButton.textContent = "Copy to Clipboard";
    importExportActionButton.className = "action-button secondary";
    importExportStats.textContent = `${set.cards.length} cards ready to copy`;
    importExportStats.className = "import-export-stats success";
    importExportModal.classList.remove("hidden");
    importExportTextarea.select();
}

export function openExportAllModal() {
    importExportMode = "export-all";
    const setsWithCards = database.filter(set => set.cards && set.cards.length > 0);
    if (setsWithCards.length === 0) {
        alert("No sets with cards to export.");
        return;
    }

    const lines = [];
    for (const set of setsWithCards) {
        lines.push(`# ${set.name}`);
        for (const card of set.cards) {
            lines.push(`${card.q}\t${card.a}`);
        }
        lines.push("");
    }

    importExportTitle.textContent = "Export All Sets";
    importExportTextarea.value = lines.join("\n").trim();
    importExportTextarea.readOnly = true;
    importExportTextarea.placeholder = "";
    importExportActionButton.textContent = "Copy to Clipboard";
    importExportActionButton.className = "action-button secondary";
    const totalCards = setsWithCards.reduce((sum, set) => sum + set.cards.length, 0);
    importExportStats.textContent = `${setsWithCards.length} sets, ${totalCards} cards ready to copy`;
    importExportStats.className = "import-export-stats success";
    importExportModal.classList.remove("hidden");
    importExportTextarea.select();
}

export function closeImportExportModal() {
    importExportModal.classList.add("hidden");
}

export async function handleImportExportAction() {
    if (importExportMode === "import") {
        const text = importExportTextarea.value;
        if (!text.trim()) return;

        const { cards, skippedLines } = parseImportText(text);

        if (cards.length === 0) {
            importExportStats.textContent = "No valid cards found. Use question\ten answer (tab-separated).";
            importExportStats.className = "import-export-stats error";
            return;
        }

        const set = getSelectedSet();
        if (!set) return;

        set.cards.push(...cards);
        await updateSetDoc(set.id, { cards: set.cards });
        render();
        closeImportExportModal();
    } else {
        importExportTextarea.select();
        navigator.clipboard.writeText(importExportTextarea.value).then(() => {
            importExportStats.textContent = "Copied to clipboard!";
            importExportStats.className = "import-export-stats success";
        }).catch(() => {
            importExportStats.textContent = "Press Ctrl+C to copy";
            importExportStats.className = "import-export-stats error";
        });
    }
}
