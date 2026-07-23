import {
    appState,
    getSelectedSet
} from "./state.js";
import {
    render
} from "./render.js";
import {
    mpLobbyModal,
    mpRoomCodeDisplay,
    mpLobbySetName,
    mpLobbyGameMode,
    mpPlayerCount,
    mpPlayerList,
    mpCancelLobbyButton,
    mpStartGameButton,
    mpJoinModal,
    mpRoomCodeInput,
    mpJoinError,
    mpJoinCancelButton,
    mpJoinConfirmButton,
    mpWaitingModal,
    mpWaitingRoomCode,
    mpWaitingSetName,
    mpWaitingGameMode,
    mpPlayerNameDisplay,
    mpWaitingPlayers,
    mpLeaveWaitingButton,
    mpDashboard,
    mpDashboardQuestion,
    mpLeaderboardList,
    mpEndGameButton,
    sidebarJoinGame,
    display
} from "./dom.js";
import {
    createRoom,
    joinRoom,
    startGame,
    endGame,
    deleteRoom,
    subscribeToRoom,
    updateHostConnection,
    resetMultiplayerState
} from "./multiplayer.js";
import {
    renderMultiplayerGame,
    renderMultiplayerResult,
    renderFinalLeaderboard
} from "./multiplayer-render.js";

let unsubMP = null;

/**
 * Open the multiplayer creation modal with study mode options
 */
export function openMultiplayerSetup(set) {
    if (!set || !set.cards || set.cards.length === 0) {
        return;
    }

    display.innerHTML = `
        <div class="play-home">
            <h2>Multiplayer Setup</h2>
            <p>Configure your multiplayer game</p>
            
            <div class="mp-setup-section">
                <h3>Selected Set: ${set.name}</h3>
                <p>${set.cards.length} cards</p>
            </div>

            <div class="mp-setup-section">
                <h3>Choose Game Mode(s)</h3>
                <p style="font-size: 12px; color: #666; margin-bottom: 10px;">Select one or more modes (click to toggle)</p>
                <div class="mp-mode-options" id="mp-mode-options">
                    <button class="mp-mode-btn" data-mode="multiple-choice">
                        <span>🎯</span> Multiple Choice
                    </button>
                    <button class="mp-mode-btn" data-mode="typing">
                        <span>⌨️</span> Typing
                    </button>
                    <button class="mp-mode-btn" data-mode="flashcard">
                        <span>🗂️</span> Flashcard
                    </button>
                    <button class="mp-mode-btn" data-mode="true-false">
                        <span>✔️</span> True / False
                    </button>
                </div>
            </div>

            <div class="mp-setup-section hidden" id="mp-strict-section">
                <h3>Typing Mode Options</h3>
                <label class="mp-toggle-label">
                    <input type="checkbox" id="mp-strict-toggle">
                    Strict mode (case sensitive)
                </label>
            </div>

            <div class="modal-buttons">
                <button id="mp-setup-back-button" class="action-button secondary">← Back</button>
                <button id="mp-create-room-button" class="action-button primary" disabled>Create Room</button>
            </div>
        </div>
    `;

    const selectedModes = new Set();
    let strictMode = false;

    display.querySelectorAll(".mp-mode-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            if (btn.classList.contains("selected")) {
                btn.classList.remove("selected");
                selectedModes.delete(btn.dataset.mode);
            } else {
                btn.classList.add("selected");
                selectedModes.add(btn.dataset.mode);
            }

            document.getElementById("mp-create-room-button").disabled = selectedModes.size === 0;

            const strictSection = document.getElementById("mp-strict-section");
            if (strictSection) {
                if (selectedModes.has("typing")) {
                    strictSection.classList.remove("hidden");
                } else {
                    strictSection.classList.add("hidden");
                }
            }
        });
    });

    document.getElementById("mp-strict-toggle")?.addEventListener("change", (e) => {
        strictMode = e.target.checked;
    });

    document.getElementById("mp-setup-back-button").addEventListener("click", () => {
        appState.mode = "play";
        render();
    });

    document.getElementById("mp-create-room-button").addEventListener("click", async () => {
        if (selectedModes.size === 0) return;
        const modes = Array.from(selectedModes);
        await createRoomAndShowLobby(set, modes, strictMode);
    });
}

async function createRoomAndShowLobby(set, mode, strictMode) {
    try {
        const roomCode = await createRoom(set, mode, strictMode);
        if (!roomCode) return;

        showHostLobby();
        subscribeToRoomUpdates();
    } catch (error) {
        console.error("Error creating room:", error);
    }
}

function showHostLobby() {
    const mp = appState.multiplayer;

    mpLobbyModal.classList.remove("hidden");
    mpRoomCodeDisplay.textContent = mp.roomCode;
    mpLobbySetName.textContent = `Set: ${mp.set.name}`;
    mpLobbyGameMode.textContent = `Mode: ${formatModes(mp.gameModes)}`;
    mpStartGameButton.disabled = true;

    updatePlayerList();
}

function formatMode(mode) {
    const modes = {
        "multiple-choice": "Multiple Choice",
        "typing": "Typing",
        "flashcard": "Flashcard",
        "true-false": "True/False"
    };
    return modes[mode] || mode;
}

function formatModes(modes) {
    if (!modes || modes.length === 0) return "None";
    if (modes.length === 1) return formatMode(modes[0]);
    return modes.map(m => formatMode(m)).join(", ");
}

function updatePlayerList() {
    const mp = appState.multiplayer;
    const players = Object.values(mp.players);

    mpPlayerCount.textContent = players.length;
    mpPlayerList.innerHTML = players.map(p => `
        <div class="mp-player-item ${p.id === mp.hostId ? 'mp-player-host' : ''}">
            <span class="mp-player-name">${p.displayName}</span>
            <span class="mp-player-badge">${p.id === mp.hostId ? '👑 Host' : ''}</span>
        </div>
    `).join("");

    mpStartGameButton.disabled = players.length < 2;
}

function subscribeToRoomUpdates() {
    if (unsubMP) {
        unsubMP();
    }

    unsubMP = subscribeToRoom((type, data) => {
        if (type === "room_deleted") {
            handleRoomDeleted();
            return;
        }

        if (type === "room") {
            const mp = appState.multiplayer;

            if (mp.status === "playing") {
                if (mp.isHost) {
                    showHostDashboard();
                } else if (display) {
                    mpWaitingModal.classList.add("hidden");
                    renderMultiplayerGame();
                }
            }

            if (mp.status === "finished") {
                if (mp.isHost) {
                    mpDashboard.classList.add("hidden");
                    renderFinalLeaderboard();
                    setTimeout(async () => {
                        await deleteRoom();
                        if (unsubMP) unsubMP();
                    }, 5000);
                } else {
                    renderFinalLeaderboard();
                }
            }
        }

        if (type === "players") {
            const mp = appState.multiplayer;

            if (mp.isHost && mpLobbyModal && !mpLobbyModal.classList.contains("hidden")) {
                updatePlayerList();
            }

            if (!mp.isHost && mpWaitingModal && !mpWaitingModal.classList.contains("hidden")) {
                updateWaitingPlayerList();
            }

            if (mp.isHost && mpDashboard && !mpDashboard.classList.contains("hidden")) {
                updateHostDashboard();
            }

            if (display.querySelector(".mp-mini-leaderboard")) {
                const mp = appState.multiplayer;
                const sorted = Object.values(mp.players).sort((a, b) => b.score - a.score);
                const container = document.getElementById("mp-mini-leaderboard-list");
                if (container) {
                    container.innerHTML = sorted.map((p, i) => `
                        <div class="leaderboard-item ${p.id === mp.playerId ? 'leaderboard-self' : ''}">
                            <span class="leaderboard-rank">#${i + 1}</span>
                            <span class="leaderboard-name">${p.displayName}</span>
                            <span class="leaderboard-score">${p.score}</span>
                        </div>
                    `).join("");
                }
            }
        }
    });
}

function handleRoomDeleted() {
    mpLobbyModal.classList.add("hidden");
    mpWaitingModal.classList.add("hidden");
    mpDashboard.classList.add("hidden");

    resetMultiplayerState();

    display.innerHTML = `
        <div class="solo-result-page">
            <h2>Room Closed</h2>
            <p>The game room has been closed.</p>
            <div class="result-actions">
                <button id="mp-room-closed-back" class="action-button primary">Back to Home</button>
            </div>
        </div>
    `;

    document.getElementById("mp-room-closed-back")?.addEventListener("click", () => {
        appState.mode = "welcome";
        render();
    });

    if (unsubMP) unsubMP();
}

function showHostDashboard() {
    mpLobbyModal.classList.add("hidden");
    mpDashboard.classList.remove("hidden");
    updateHostDashboard();
}

function updateHostDashboard() {
    const mp = appState.multiplayer;
    const totalQ = mp.totalQuestions;

    const playerQuestions = Object.values(mp.players).map(p => p.currentQuestion || 0);
    const maxQuestion = playerQuestions.length > 0
        ? Math.max(...playerQuestions)
        : 0;
    const currentQ = Math.min(maxQuestion + 1, totalQ);

    mpDashboardQuestion.textContent = `Question ${currentQ} / ${totalQ}`;

    const sorted = Object.values(mp.players).sort((a, b) => b.score - a.score);
    mpLeaderboardList.innerHTML = sorted.map((p, i) => `
        <div class="leaderboard-item ${p.id === mp.playerId ? 'leaderboard-self' : ''}">
            <span class="leaderboard-rank">#${i + 1}</span>
            <span class="leaderboard-name">${p.displayName}</span>
            <div class="leaderboard-details">
                <span class="leaderboard-score">${p.score}</span>
                <span class="leaderboard-progress">Q: ${p.currentQuestion || 0}/${totalQ}</span>
            </div>
        </div>
    `).join("");
}

/**
 * Open join room modal
 */
export function openJoinModal() {
    mpJoinModal.classList.remove("hidden");
    mpRoomCodeInput.value = "";
    mpJoinError.classList.add("hidden");
    mpRoomCodeInput.focus();
}

function closeJoinModal() {
    mpJoinModal.classList.add("hidden");
}

async function handleJoinRoom() {
    const code = mpRoomCodeInput.value.trim();

    if (code.length !== 8 || !/^\d+$/.test(code)) {
        mpJoinError.textContent = "Please enter a valid 8-digit code.";
        mpJoinError.classList.remove("hidden");
        return;
    }

    mpJoinConfirmButton.disabled = true;
    mpJoinError.classList.add("hidden");

    const result = await joinRoom(code);

    if (!result.success) {
        mpJoinError.textContent = result.error;
        mpJoinError.classList.remove("hidden");
        mpJoinConfirmButton.disabled = false;
        return;
    }

    closeJoinModal();
    showWaitingRoom();
    subscribeToRoomUpdates();
}

function showWaitingRoom() {
    const mp = appState.multiplayer;

    mpWaitingModal.classList.remove("hidden");
    mpWaitingRoomCode.textContent = mp.roomCode;
    mpWaitingSetName.textContent = `Set: ${mp.set.name}`;
    mpWaitingGameMode.textContent = `Mode: ${formatModes(mp.gameModes)}`;
    mpPlayerNameDisplay.textContent = mp.displayName;

    updateWaitingPlayerList();
}

function updateWaitingPlayerList() {
    const mp = appState.multiplayer;
    const players = Object.values(mp.players);

    mpWaitingPlayers.innerHTML = players.map(p => `
        <div class="mp-player-item ${p.id === mp.playerId ? 'mp-player-self' : ''}">
            <span class="mp-player-name">${p.displayName}</span>
            ${p.id === mp.hostId ? '<span class="mp-player-badge">👑 Host</span>' : ''}
        </div>
    `).join("");
}

/**
 * Setup multiplayer event listeners
 */
export function setupMultiplayerEvents() {
    sidebarJoinGame?.addEventListener("click", () => {
        openJoinModal();
    });

    document.addEventListener("click", async (e) => {
        if (e.target && e.target.id === "mp-cancel-lobby-button") {
            mpLobbyModal.classList.add("hidden");
            await deleteRoom();
            if (unsubMP) unsubMP();
            appState.mode = "play";
            render();
        }

        if (e.target && e.target.id === "mp-start-game-button") {
            const btn = e.target;
            if (btn.disabled) return;
            try {
                await startGame();
            } catch (error) {
                console.error("Error starting game:", error);
            }
        }

        if (e.target && e.target.id === "mp-leave-waiting-button") {
            mpWaitingModal.classList.add("hidden");
            await deleteRoom();
            if (unsubMP) unsubMP();
            appState.mode = "welcome";
            render();
        }

        if (e.target && e.target.id === "mp-end-game-button") {
            await endGame();
        }
    });

    mpJoinCancelButton?.addEventListener("click", closeJoinModal);
    mpJoinConfirmButton?.addEventListener("click", handleJoinRoom);
    mpRoomCodeInput?.addEventListener("keydown", (e) => {
        if (e.key === "Enter") handleJoinRoom();
    });
    mpRoomCodeInput?.addEventListener("input", () => {
        mpJoinError.classList.add("hidden");
    });
}

/**
 * Show join room UI from play home
 */
export function showMultiplayerJoinView() {
    display.innerHTML = `
        <div class="play-home">
            <h2>Multiplayer</h2>
            <p>Join or create a multiplayer game</p>
            
            <div class="mp-action-buttons">
                <button id="mp-create-game-btn" class="mode-card">
                    <span class="mode-title">🎮 Create Game</span>
                    <span class="mode-description">Host a new multiplayer session</span>
                </button>
                
                <button id="mp-join-game-btn" class="mode-card">
                    <span class="mode-title">🔗 Join Game</span>
                    <span class="mode-description">Enter a room code to join</span>
                </button>
            </div>
            
            <div class="modal-buttons" style="margin-top: 20px;">
                <button id="mp-back-from-multiplayer" class="action-button secondary">← Back</button>
            </div>
        </div>
    `;

    document.getElementById("mp-create-game-btn")?.addEventListener("click", () => {
        const set = getSelectedSet();
        if (set) {
            openMultiplayerSetup(set);
        }
    });

    document.getElementById("mp-join-game-btn")?.addEventListener("click", openJoinModal);

    document.getElementById("mp-back-from-multiplayer")?.addEventListener("click", () => {
        appState.mode = "play";
        render();
    });
}
