import { db } from "./firebase.js";
import { appState } from "./state.js";

import {
    doc,
    setDoc,
    getDoc,
    updateDoc,
    deleteDoc,
    collection,
    serverTimestamp,
    onSnapshot,
    getDocs,
    writeBatch,
    increment,
    runTransaction
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

// === Configuration Constants ===
const ROOM_CODE_LENGTH = 8;
const BONUS_TIME_MS = 5000;
const BASE_SCORE = 10;
const BONUS_POINTS = 2;
const ANIMAL_NAMES = [
    "Clever Fox", "Brave Lion", "Swift Eagle", "Mighty Bear",
    "Gentle Deer", "Wise Owl", "Playful Dolphin", "Stealthy Panther",
    "Bold Tiger", "Loyal Wolf", "Graceful Swan", "Fierce Hawk",
    "Curious Cat", "Happy Dog", "Sneaky Snake", "Roaring Lion",
    "Flying Squirrel", "Dancing Penguin", "Jumping Rabbit", "Sleepy Koala",
    "Speedy Cheetah", "Tiny Mouse", "Big Elephant", "Colorful Parrot",
    "Silly Monkey", "Proud Peacock", "Swimming Shark", "Running Horse"
];

// === Utility Functions ===

/**
 * Generate a random 8-digit room code
 */
function generateRoomCode() {
    let code = "";
    for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
        code += Math.floor(Math.random() * 10).toString();
    }
    return code;
}

/**
 * Generate a random animal-based display name
 */
export function generateDisplayName() {
    return ANIMAL_NAMES[Math.floor(Math.random() * ANIMAL_NAMES.length)];
}

/**
 * Generate a unique player ID for this session
 */
function generatePlayerId() {
    return "player_" + Date.now() + "_" + Math.random().toString(36).substr(2, 6);
}

/**
 * Calculate bonus points based on response time
 * @param {number} timeMs - Time taken to answer in milliseconds
 * @returns {number} Bonus points (0 or BONUS_POINTS)
 */
export function getBonusPoints(timeMs) {
    if (timeMs < BONUS_TIME_MS) {
        return BONUS_POINTS;
    }
    return 0;
}

/**
 * Get the bonus time window in milliseconds
 */
export function getBonusTimeMs() {
    return BONUS_TIME_MS;
}

/**
 * Reset the multiplayer state to defaults
 */
export function resetMultiplayerState() {
    appState.multiplayer = {
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
        bonusTimeMs: BONUS_TIME_MS,
        timeLimitMs: 30000,
        bonusTimerId: null,
        lastResult: null,
    };
}

/**
 * Clear the bonus timer interval
 */
export function clearBonusTimer() {
    if (appState.multiplayer.bonusTimerId) {
        clearInterval(appState.multiplayer.bonusTimerId);
        appState.multiplayer.bonusTimerId = null;
    }
}

// === Room Management ===

/**
 * Create a new multiplayer room as host
 * @param {Object} set - The flashcard set to use
 * @param {string[]} studyModes - Array of game modes
 * @param {boolean} strictMode - Whether typing is strict
 * @returns {Promise<string>} The room code
 */
export async function createRoom(set, studyModes, strictMode) {
    if (!set || !set.cards || set.cards.length === 0) {
        throw new Error("Cannot create room: no cards in set");
    }

    let roomCode;
    let exists = true;

    while (exists) {
        roomCode = generateRoomCode();
        const roomRef = doc(db, "multiplayer_games", roomCode);
        const snapshot = await getDoc(roomRef);
        exists = snapshot.exists();
    }

    const playerId = generatePlayerId();
    const displayName = generateDisplayName();

    const roomData = {
        host: {
            playerId: playerId,
            displayName: displayName + " (Host)",
            set: {
                id: set.id,
                name: set.name,
                cards: set.cards,
                studyModes: studyModes,
                strictMode: strictMode
            }
        },
        status: "waiting",
        currentQuestion: 0,
        totalQuestions: set.cards.length,
        gameModes: studyModes,
        strictMode: strictMode,
        createdAt: serverTimestamp(),
        hostConnected: true,
    };

    const roomRef = doc(db, "multiplayer_games", roomCode);
    await setDoc(roomRef, roomData);

    const playerRef = doc(db, "multiplayer_games", roomCode, "players", playerId);
    await setDoc(playerRef, {
        displayName: displayName + " (Host)",
        score: 0,
        correct: 0,
        wrong: 0,
        currentQuestion: 0,
        answers: [],
        connected: true,
        joinedAt: serverTimestamp()
    });

    appState.multiplayer.roomCode = roomCode;
    appState.multiplayer.playerId = playerId;
    appState.multiplayer.displayName = displayName + " (Host)";
    appState.multiplayer.isHost = true;
    appState.multiplayer.hostId = playerId;
    appState.multiplayer.set = set;
    appState.multiplayer.status = "waiting";
    appState.multiplayer.currentQuestion = 0;
    appState.multiplayer.totalQuestions = set.cards.length;
    appState.multiplayer.gameModes = studyModes;
    appState.multiplayer.gameMode = studyModes[0];
    appState.multiplayer.strictMode = strictMode;
    appState.multiplayer.bonusTimeMs = BONUS_TIME_MS;
    appState.multiplayer.timeLimitMs = 30000;
    appState.multiplayer.lastResult = null;

    return roomCode;
}

/**
 * Join an existing multiplayer room
 * @param {string} roomCode - The 8-digit room code
 * @returns {Promise<Object>} Result with success status
 */
export async function joinRoom(roomCode) {
    if (!roomCode || roomCode.length !== ROOM_CODE_LENGTH || !/^\d+$/.test(roomCode)) {
        return { success: false, error: "Please enter a valid 8-digit code." };
    }

    const roomRef = doc(db, "multiplayer_games", roomCode);
    const snapshot = await getDoc(roomRef);

    if (!snapshot.exists()) {
        return { success: false, error: "Room not found. Check the code and try again." };
    }

    const roomData = snapshot.data();

    if (roomData.status !== "waiting") {
        return { success: false, error: "This game has already started or ended." };
    }

    const playerId = generatePlayerId();
    const displayName = generateDisplayName();

    const playerRef = doc(db, "multiplayer_games", roomCode, "players", playerId);
    await setDoc(playerRef, {
        displayName: displayName,
        score: 0,
        correct: 0,
        wrong: 0,
        currentQuestion: 0,
        answers: [],
        connected: true,
        joinedAt: serverTimestamp()
    });

    appState.multiplayer.roomCode = roomCode;
    appState.multiplayer.playerId = playerId;
    appState.multiplayer.displayName = displayName;
    appState.multiplayer.isHost = false;
    appState.multiplayer.hostId = roomData.host.playerId;
    appState.multiplayer.set = roomData.host.set;
    appState.multiplayer.status = "waiting";
    appState.multiplayer.currentQuestion = 0;
    appState.multiplayer.totalQuestions = roomData.totalQuestions;
    appState.multiplayer.gameModes = roomData.gameModes || [roomData.gameMode];
    appState.multiplayer.gameMode = roomData.gameModes ? roomData.gameModes[0] : roomData.gameMode;
    appState.multiplayer.strictMode = roomData.strictMode;
    appState.multiplayer.bonusTimeMs = BONUS_TIME_MS;
    appState.multiplayer.timeLimitMs = 30000;
    appState.multiplayer.lastResult = null;

    return { success: true, roomData };
}

/**
 * Start the multiplayer game (host only)
 */
export async function startGame() {
    const roomCode = appState.multiplayer.roomCode;
    if (!roomCode || !appState.multiplayer.isHost) return;

    const roomRef = doc(db, "multiplayer_games", roomCode);

    const playersSnapshot = await getDocs(collection(db, "multiplayer_games", roomCode, "players"));

    const batch = writeBatch(db);

    playersSnapshot.forEach(playerDoc => {
        batch.update(playerDoc.ref, { currentQuestion: 0 });
    });

    batch.update(roomRef, {
        status: "playing",
        currentQuestion: 0,
        startedAt: serverTimestamp()
    });

    await batch.commit();

    appState.multiplayer.status = "playing";
}

/**
 * Submit an answer for the current question
 * @param {string} answer - The player's answer
 * @param {boolean|null} isTrueFalse - For true-false mode, whether statement is true
 * @returns {Promise<Object|null>} Result with correctness and score info
 */
export async function submitAnswer(answer, isTrueFalse = null) {
    const roomCode = appState.multiplayer.roomCode;
    const playerId = appState.multiplayer.playerId;
    const currentQ = appState.multiplayer.currentQuestion;

    if (!roomCode || !playerId) return null;

    const timeMs = appState.multiplayer.questionStartTime
        ? Date.now() - appState.multiplayer.questionStartTime
        : 0;

    const set = appState.multiplayer.set;
    const cards = set.cards;
    const currentCard = cards[currentQ];

    if (!currentCard) return null;

    let currentMode = appState.multiplayer.gameMode;
    if (appState.multiplayer.gameModes && appState.multiplayer.gameModes.length > 1) {
        const modeIndex = currentQ % appState.multiplayer.gameModes.length;
        currentMode = appState.multiplayer.gameModes[modeIndex];
    }

    let isCorrect = false;

    if (currentMode === "true-false") {
        const expectedAnswer = isTrueFalse !== null ? isTrueFalse : (currentCard.a.toLowerCase() === "true");
        isCorrect = String(expectedAnswer) === answer;
    } else if (currentMode === "typing") {
        if (appState.multiplayer.strictMode) {
            isCorrect = answer.trim() === currentCard.a.trim();
        } else {
            isCorrect = answer.trim().toLowerCase() === currentCard.a.trim().toLowerCase();
        }
    } else {
        isCorrect = answer === currentCard.a;
    }

    let scoreGained = 0;
    let bonusPoints = 0;

    if (isCorrect) {
        scoreGained = BASE_SCORE;
        bonusPoints = getBonusPoints(timeMs);
        scoreGained += bonusPoints;
    }

    const playerRef = doc(db, "multiplayer_games", roomCode, "players", playerId);

    try {
        await runTransaction(db, async (transaction) => {
            const playerDoc = await transaction.get(playerRef);
            if (!playerDoc.exists()) return;

            const playerData = playerDoc.data();
            const newAnswers = [...(playerData.answers || [])];
            newAnswers.push({
                questionIndex: currentQ,
                answer: answer,
                timeMs: timeMs,
                correct: isCorrect,
                bonus: bonusPoints,
                scoreGained: scoreGained
            });

            transaction.update(playerRef, {
                score: increment(scoreGained),
                correct: increment(isCorrect ? 1 : 0),
                wrong: increment(isCorrect ? 0 : 1),
                currentQuestion: currentQ + 1,
                answers: newAnswers
            });
        });
    } catch (error) {
        console.error("Error submitting answer:", error);
        return null;
    }

    appState.multiplayer.currentQuestion = currentQ + 1;

    const result = {
        isCorrect,
        correctAnswer: currentCard.a,
        userAnswer: answer,
        scoreGained,
        bonusPoints,
        timeMs,
    };

    appState.multiplayer.lastResult = result;

    return result;
}

/**
 * End the game (host only)
 */
export async function endGame() {
    const roomCode = appState.multiplayer.roomCode;
    if (!roomCode || !appState.multiplayer.isHost) return;

    const roomRef = doc(db, "multiplayer_games", roomCode);
    await updateDoc(roomRef, {
        status: "finished",
        endedAt: serverTimestamp()
    });

    appState.multiplayer.status = "finished";
}

/**
 * Clean up an abandoned room (used when host closes tab/window unexpectedly)
 * This is a standalone function that doesn't rely on appState to be valid.
 */
export async function cleanupAbandonedRoom() {
    const roomCode = appState.multiplayer.roomCode;
    if (!roomCode) return;

    try {
        const roomRef = doc(db, "multiplayer_games", roomCode);
        const playersSnapshot = await getDocs(collection(db, "multiplayer_games", roomCode, "players"));

        const batch = writeBatch(db);
        batch.delete(roomRef);
        playersSnapshot.forEach(playerDoc => {
            batch.delete(playerDoc.ref);
        });

        await batch.commit();
        console.log("Cleaned up abandoned room:", roomCode);
    } catch (error) {
        console.error("Error cleaning up abandoned room:", error);
    }
}

/**
 * Delete the room after game is done
 */
export async function deleteRoom() {
    const roomCode = appState.multiplayer.roomCode;
    if (!roomCode) return;

    const roomRef = doc(db, "multiplayer_games", roomCode);
    const playersSnapshot = await getDocs(collection(db, "multiplayer_games", roomCode, "players"));

    const batch = writeBatch(db);
    batch.delete(roomRef);
    playersSnapshot.forEach(playerDoc => {
        batch.delete(playerDoc.ref);
    });

    await batch.commit();

    resetMultiplayerState();
}

/**
 * Subscribe to room updates for real-time sync
 * @param {Function} callback - Called when room data changes
 * @returns {Function} Unsubscribe function
 */
export function subscribeToRoom(callback) {
    const roomCode = appState.multiplayer.roomCode;
    if (!roomCode) return () => {};

    const roomRef = doc(db, "multiplayer_games", roomCode);
    const unsubRoom = onSnapshot(roomRef, (snapshot) => {
        if (!snapshot.exists()) {
            appState.multiplayer.status = "deleted";
            callback("room_deleted", null);
            return;
        }

        const data = snapshot.data();
        appState.multiplayer.status = data.status;

        if (data.currentQuestion !== undefined) {
            appState.multiplayer.currentQuestion = data.currentQuestion;
        }
        if (data.totalQuestions !== undefined) {
            appState.multiplayer.totalQuestions = data.totalQuestions;
        }

        callback("room", data);
    });

    const playersRef = collection(db, "multiplayer_games", roomCode, "players");
    const unsubPlayers = onSnapshot(playersRef, (snapshot) => {
        const players = {};

        snapshot.forEach(doc => {
            const playerData = doc.data();
            players[doc.id] = {
                ...playerData,
                id: doc.id
            };
        });

        appState.multiplayer.players = players;
        callback("players", players);
    });

    return () => {
        unsubRoom();
        unsubPlayers();
    };
}

/**
 * Update host connection status
 */
export async function updateHostConnection(connected) {
    const roomCode = appState.multiplayer.roomCode;
    if (!roomCode || !appState.multiplayer.isHost) return;

    const roomRef = doc(db, "multiplayer_games", roomCode);
    await updateDoc(roomRef, {
        hostConnected: connected
    });
}

/**
 * Set the question start time (called when a new question is rendered)
 */
export function setQuestionStartTime() {
    appState.multiplayer.questionStartTime = Date.now();
}

/**
 * Start the bonus timer interval that updates the UI every 100ms
 * @param {Function} onTick - Called every tick with { timeLeft, bonusActive, percentage }
 * @returns {number} The interval ID
 */
export function startBonusTimer(onTick) {
    clearBonusTimer();
    
    const bonusTimeMs = appState.multiplayer.bonusTimeMs || 5000;
    const startTime = Date.now();
    
    const id = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const timeLeft = Math.max(0, bonusTimeMs - elapsed);
        const bonusActive = timeLeft > 0;
        const percentage = (timeLeft / bonusTimeMs) * 100;
        
        onTick({ timeLeft, bonusActive, percentage });
        
        if (timeLeft <= 0) {
            clearInterval(id);
            appState.multiplayer.bonusTimerId = null;
        }
    }, 100);
    
    appState.multiplayer.bonusTimerId = id;
    return id;
}

/**
 * Get the current time elapsed since question start
 * @returns {number} Time in milliseconds
 */
export function getElapsedTime() {
    if (!appState.multiplayer.questionStartTime) return 0;
    return Date.now() - appState.multiplayer.questionStartTime;
}
