export let database = [];

export const appState = {
    user: null,
    selectedSetId: null,
    editingCardId: null,
    mode: "welcome",
    game: {
        cards: [],
        currentIndex: 0,
        currentQuestion: null,
        options: [],
        score: 0,
    },
    studyMode: null,
};

export function getSelectedSet() {
    return database.find(set => set.id === appState.selectedSetId);
}

export function setDatabase(newDatabase) {
    database = newDatabase;
}