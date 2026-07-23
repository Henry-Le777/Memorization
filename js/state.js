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
    // Multiplayer state
    multiplayer: {
        roomCode: null,
        playerId: null,
        displayName: null,
        isHost: false,
        hostId: null,
        set: null,
        status: null,
        currentQuestion: 0,
        totalQuestions: 0,
        players: {},
        questionStartTime: null,
        gameModes: [],
        gameMode: null,
        strictMode: false,
        bonusTimeMs: 5000,
        timeLimitMs: 30000,
        bonusTimerId: null,
        lastResult: null,
        gameStartTime: null,
        timerIntervalId: null,
    },
};

export function getSelectedSet() {
    return database.find(set => set.id === appState.selectedSetId);
}

export function setDatabase(newDatabase) {
    database = newDatabase;
}
