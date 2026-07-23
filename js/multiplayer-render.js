import { appState } from "./state.js";
import { display } from "./dom.js";
import { render } from "./render.js";
import { setQuestionStartTime, startBonusTimer, clearBonusTimer } from "./multiplayer.js";

/**
 * Render the multiplayer game screen for a player
 * Features: Quizizz-style timer (top-right), Blooket-style answer grid, Quizlet-style header
 */
export function renderMultiplayerGame() {
    const mp = appState.multiplayer;
    const cards = mp.set.cards;
    const currentQ = mp.currentQuestion;
    
    if (!cards || currentQ >= cards.length) {
        renderMultiplayerResult();
        return;
    }
    
    const currentCard = cards[currentQ];
    const totalQuestions = cards.length;
    const progress = ((currentQ) / totalQuestions) * 100;
    const playerData = mp.players[mp.playerId];
    const score = playerData ? playerData.score : 0;
    
    // Determine current mode
    let currentMode = mp.gameMode;
    if (mp.gameModes && mp.gameModes.length > 1) {
        const modeIndex = currentQ % mp.gameModes.length;
        currentMode = mp.gameModes[modeIndex];
    }
    
    // Check if this is a grid-based mode (multiple-choice or true-false)
    const isGridMode = currentMode === "multiple-choice" || currentMode === "true-false";
    
    display.innerHTML = `
        <div class="game-page mp-game-page">
            <div class="game-header">
                <div class="mp-game-header-top">
                    <div class="mp-game-header-left">
                        <h2>${mp.set.name}</h2>
                        <div class="mp-game-header-stats">
                            <span class="question-counter">
                                Q${currentQ + 1} / ${totalQuestions}
                            </span>
                            <span class="score-display">
                                ⭐ ${score}
                            </span>
                        </div>
                    </div>
                    <!-- Quizizz-style bonus timer in top-right corner -->
                    <div class="bonus-timer-container" id="mp-bonus-timer">
                        <svg class="bonus-timer-svg" viewBox="0 0 72 72">
                            <circle class="bonus-timer-bg" cx="36" cy="36" r="32"></circle>
                            <circle class="bonus-timer-progress timer-high" id="mp-timer-circle" cx="36" cy="36" r="32"></circle>
                        </svg>
                        <div class="bonus-timer-label" id="mp-timer-label">
                            <span class="bonus-timer-time" id="mp-timer-time">5</span>
                        </div>
                    </div>
                </div>
                <div class="progress-container">
                    <div class="progress-fill" style="width: ${progress}%"></div>
                </div>
            </div>
            ${renderMultiplayerQuestion(currentCard, currentMode, isGridMode)}
        </div>
    `;
    
    setQuestionStartTime();
    
    // Start the Quizizz-style bonus timer
    startBonusTimer(({ timeLeft, bonusActive, percentage }) => {
        updateTimerUI(timeLeft, bonusActive, percentage);
    });
    
    setupMultiplayerPlayEvents(currentMode);
}

/**
 * Update the timer UI (Quizizz-style circle timer)
 */
function updateTimerUI(timeLeft, bonusActive, percentage) {
    const circle = document.getElementById("mp-timer-circle");
    const timeEl = document.getElementById("mp-timer-time");
    const container = document.getElementById("mp-bonus-timer");
    
    if (!circle || !timeEl) return;
    
    // Update the circle progress
    const circumference = 201; // 2 * PI * 32
    const offset = circumference - (percentage / 100) * circumference;
    circle.style.strokeDashoffset = offset;
    
    // Update time display (rounded to whole seconds)
    const seconds = Math.round(timeLeft / 1000);
    timeEl.textContent = seconds;
    
    // Update color based on time remaining
    circle.classList.remove("timer-high", "timer-mid", "timer-low");
    if (container) container.classList.remove("timer-pulsing");
    
    if (timeLeft > 3000) {
        circle.classList.add("timer-high"); // Green
    } else if (timeLeft > 1500) {
        circle.classList.add("timer-mid"); // Yellow/Orange
    } else if (timeLeft > 0) {
        circle.classList.add("timer-low"); // Red
        if (container) container.classList.add("timer-pulsing"); // Pulse animation
    }
}

function getPlayerScore() {
    const mp = appState.multiplayer;
    const playerData = mp.players[mp.playerId];
    return playerData ? playerData.score : 0;
}

function renderMultiplayerQuestion(currentCard, currentMode, isGridMode) {
    switch (currentMode) {
        case "multiple-choice":
            return renderMPMultipleChoice(currentCard, isGridMode);
        case "typing":
            return renderMPTyping(currentCard);
        case "true-false":
            return renderMPTrueFalse(currentCard);
        case "flashcard":
            return renderMPFlashcard(currentCard);
        default:
            return renderMPMultipleChoice(currentCard, true);
    }
}

function renderMPMultipleChoice(currentCard, useGrid = true) {
    const mp = appState.multiplayer;
    const cards = mp.set.cards;
    
    // Generate options
    const wrongAnswers = [
        ...new Set(
            cards
                .filter(c => c.id !== currentCard.id && c.a !== currentCard.a)
                .map(c => c.a)
        )
    ];
    shuffle(wrongAnswers);
    const selectedWrong = wrongAnswers.slice(0, 3);
    const options = [currentCard.a, ...selectedWrong];
    shuffle(options);
    
    // Blooket-style: Use 2x2 grid for multiple choice
    const gridClass = useGrid ? 'mp-answer-grid' : 'answer-list';
    
    return `
        <div class="question-card">
            ${currentCard.q}
        </div>
        <div class="${gridClass}">
            ${options.map((option, index) => `
                <button class="answer-button mp-answer-btn" data-answer="${option}">
                    ${String.fromCharCode(65 + index)}. ${option}
                </button>
            `).join("")}
        </div>
    `;
}

function renderMPTyping(currentCard) {
    return `
        <div class="question-card">
            ${currentCard.q}
        </div>
        <div class="typing-container">
            <input
                id="mp-typing-input"
                class="typing-input"
                type="text"
                placeholder="Type your answer..."
                autocomplete="off"
            >
            <button id="mp-check-answer-button" class="action-button primary">
                Check
            </button>
        </div>
    `;
}

function renderMPTrueFalse(currentCard) {
    const wrongAnswers = appState.multiplayer.set.cards
        .filter(c => c.id !== currentCard.id)
        .map(c => c.a);
    shuffle(wrongAnswers);
    const wrongAnswer = wrongAnswers[0] || "No";
    const isStatementTrue = Math.random() < 0.5;
    
    return `
        <div class="question-card true-false-question" data-is-true="${isStatementTrue}">
            <div class="tf-question">${currentCard.q}</div>
            <div class="tf-divider"></div>
            <div class="tf-statement">${isStatementTrue ? currentCard.a : wrongAnswer}</div>
        </div>
        <div class="mp-answer-grid">
            <button class="answer-button mp-answer-btn" data-answer="true">✅ True</button>
            <button class="answer-button mp-answer-btn" data-answer="false">❌ False</button>
        </div>
    `;
}

function renderMPFlashcard(currentCard) {
    return `
        <div class="flashcard">
            <div class="flashcard-inner">
                <div class="flashcard-text">${currentCard.q}</div>
                <div class="flashcard-hint">Click Flip to reveal answer</div>
            </div>
        </div>
        <button id="mp-flip-button" class="action-button primary">Flip</button>
        <div id="mp-flashcard-actions" class="hidden" style="margin-top: 10px; display: flex; gap: 10px;">
            <button id="mp-understand-btn" class="action-button primary">✅ Understand</button>
            <button id="mp-not-understand-btn" class="action-button danger">❌ Not understand</button>
        </div>
    `;
}

/**
 * Show a Quizizz-style result overlay after answering
 */
function showResultOverlay(result) {
    // Remove any existing overlay
    const existing = document.querySelector(".mp-result-overlay");
    if (existing) existing.remove();
    
    const overlay = document.createElement("div");
    overlay.className = "mp-result-overlay";
    overlay.innerHTML = `
        <div class="mp-result-card">
            <div class="mp-result-icon">${result.isCorrect ? "✅" : "❌"}</div>
            <div class="mp-result-text" style="color: ${result.isCorrect ? 'var(--success)' : 'var(--danger)'}">
                ${result.isCorrect ? "Correct!" : "Incorrect"}
            </div>
            ${result.bonusPoints > 0 ? `
                <div class="mp-result-bonus">⚡ +${result.bonusPoints} bonus!</div>
            ` : ""}
            <div class="mp-result-subtext">
                ${result.isCorrect 
                    ? `+${result.scoreGained} points` 
                    : `Answer: ${result.correctAnswer}`
                }
            </div>
        </div>
    `;
    
    document.body.appendChild(overlay);
    
    // Auto-remove after 800ms
    setTimeout(() => {
        if (overlay.parentNode) overlay.remove();
    }, 800);
}

/**
 * Render the multiplayer result/waiting screen
 */
export function renderMultiplayerResult() {
    const mp = appState.multiplayer;
    const playerData = mp.players[mp.playerId];
    const score = playerData ? playerData.score : 0;
    
    display.innerHTML = `
        <div class="solo-result-page">
            <h2>🎉 All Questions Done!</h2>
            <div class="solo-result-card">
                <div class="score">${score}</div>
                <div class="solo-stat">
                    <span>Correct</span>
                    <span class="correct-stat">${playerData?.correct || 0}</span>
                </div>
                <div class="solo-stat">
                    <span>Wrong</span>
                    <span class="wrong-stat">${playerData?.wrong || 0}</span>
                </div>
                <div class="solo-stat">
                    <span>Accuracy</span>
                    <span>${calculateAccuracy(playerData)}%</span>
                </div>
            </div>
            <p style="color: var(--text-secondary);">Waiting for other players to finish...</p>
            <div class="mp-mini-leaderboard">
                <h3>🏆 Current Standings</h3>
                <div id="mp-mini-leaderboard-list" class="mp-leaderboard-list"></div>
            </div>
        </div>
    `;
    
    updateMiniLeaderboard();
}

function calculateAccuracy(playerData) {
    if (!playerData) return 0;
    const total = (playerData.correct || 0) + (playerData.wrong || 0);
    if (total === 0) return 0;
    return Math.round((playerData.correct / total) * 100);
}

function updateMiniLeaderboard() {
    const container = document.getElementById("mp-mini-leaderboard-list");
    if (!container) return;
    
    const mp = appState.multiplayer;
    const sorted = Object.values(mp.players).sort((a, b) => b.score - a.score);
    
    container.innerHTML = sorted.map((p, i) => `
        <div class="leaderboard-item ${p.id === mp.playerId ? 'leaderboard-self' : ''}">
            <span class="leaderboard-rank">${getMedal(i)}</span>
            <span class="leaderboard-name">${p.displayName}</span>
            <div class="leaderboard-details">
                <span class="leaderboard-score">${p.score}</span>
                <span class="leaderboard-stats">${p.correct || 0}/${(p.correct || 0) + (p.wrong || 0)}</span>
            </div>
        </div>
    `).join("");
}

/**
 * Render the final leaderboard after game ends
 */
export function renderFinalLeaderboard() {
    const mp = appState.multiplayer;
    const sorted = Object.values(mp.players).sort((a, b) => b.score - a.score);
    
    display.innerHTML = `
        <div class="solo-result-page mp-final-result">
            <h2>🏆 Game Over!</h2>
            <div class="mp-final-leaderboard">
                <h3>Final Leaderboard</h3>
                <div class="mp-leaderboard-list">
                    ${sorted.map((p, i) => `
                        <div class="leaderboard-item ${i === 0 ? 'leaderboard-winner' : ''} ${p.id === mp.playerId ? 'leaderboard-self' : ''}">
                            <span class="leaderboard-rank">${getMedal(i)}</span>
                            <span class="leaderboard-name">${p.displayName}</span>
                            <div class="leaderboard-details">
                                <span class="leaderboard-score">${p.score} pts</span>
                                <span class="leaderboard-stats">${p.correct || 0}/${(p.correct || 0) + (p.wrong || 0)}</span>
                            </div>
                        </div>
                    `).join("")}
                </div>
            </div>
            <div class="result-actions">
                <button id="mp-back-home-button" class="action-button primary">Back to Home</button>
            </div>
        </div>
    `;
    
    document.getElementById("mp-back-home-button")?.addEventListener("click", () => {
        location.reload();
    });
}

function getMedal(rank) {
    switch (rank) {
        case 0: return "🥇";
        case 1: return "🥈";
        case 2: return "🥉";
        default: return `#${rank + 1}`;
    }
}

function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

/**
 * Setup events for multiplayer game
 */
function setupMultiplayerPlayEvents(currentMode) {
    const mp = appState.multiplayer;
    
    if (currentMode === "multiple-choice") {
        const answerButtons = display.querySelectorAll(".mp-answer-btn");
        answerButtons.forEach(btn => {
            btn.addEventListener("click", async () => {
                btn.disabled = true;
                const answer = btn.dataset.answer;
                const result = await submitAnswerAndRender(answer);
                if (result) {
                    // Show Quizizz-style overlay
                    showResultOverlay(result);
                    
                    if (result.isCorrect) {
                        btn.classList.add("correct");
                    } else {
                        btn.classList.add("wrong");
                        answerButtons.forEach(b => {
                            if (b.dataset.answer === result.correctAnswer) {
                                b.classList.add("correct");
                            }
                        });
                    }
                    answerButtons.forEach(b => b.disabled = true);
                    clearBonusTimer();
                    setTimeout(() => {
                        advanceMultiplayerQuestion();
                    }, 1000);
                }
            });
        });
    }
    
    if (currentMode === "true-false") {
        const answerButtons = display.querySelectorAll(".mp-answer-btn");
        const questionCard = display.querySelector(".true-false-question");
        const isStatementTrue = questionCard ? questionCard.dataset.isTrue === "true" : true;
        
        answerButtons.forEach(btn => {
            btn.addEventListener("click", async () => {
                btn.disabled = true;
                const answer = btn.dataset.answer;
                const result = await submitAnswerAndRender(answer, isStatementTrue);
                if (result) {
                    // Show Quizizz-style overlay
                    showResultOverlay(result);
                    
                    const correctAnswer = isStatementTrue ? "true" : "false";
                    if (result.isCorrect) {
                        btn.classList.add("correct");
                    } else {
                        btn.classList.add("wrong");
                        answerButtons.forEach(b => {
                            if (b.dataset.answer === correctAnswer) {
                                b.classList.add("correct");
                            }
                        });
                    }
                    answerButtons.forEach(b => b.disabled = true);
                    clearBonusTimer();
                    setTimeout(() => {
                        advanceMultiplayerQuestion();
                    }, 1000);
                }
            });
        });
    }
    
    if (currentMode === "typing") {
        const input = document.getElementById("mp-typing-input");
        const checkBtn = document.getElementById("mp-check-answer-button");
        
        const handleCheck = async () => {
            if (!input || !checkBtn) return;
            const answer = input.value.trim();
            if (!answer) return;
            input.disabled = true;
            checkBtn.disabled = true;
            
            const result = await submitAnswerAndRender(answer);
            if (result) {
                // Show Quizizz-style overlay
                showResultOverlay(result);
                clearBonusTimer();
                
                const container = input.parentElement;
                const resultDiv = document.createElement("div");
                resultDiv.className = "typing-result";
                resultDiv.innerHTML = `
                    <div class="typing-result-header ${result.isCorrect ? 'result-correct' : 'result-wrong'}">
                        ${result.isCorrect ? "✅ Correct" : "❌ Incorrect"}
                        ${result.bonusPoints > 0 ? " (+2 bonus!)" : ""}
                    </div>
                    <div class="typing-result-body">
                        <div class="typing-result-section">
                            <div class="typing-result-label">Your Answer</div>
                            <div class="typing-result-value">${result.userAnswer}</div>
                        </div>
                        ${!result.isCorrect ? `
                            <div class="typing-result-section">
                                <div class="typing-result-label">Correct Answer</div>
                                <div class="typing-result-value correct-text">${result.correctAnswer}</div>
                            </div>
                        ` : ""}
                    </div>
                `;
                container.appendChild(resultDiv);
                
                setTimeout(() => {
                    advanceMultiplayerQuestion();
                }, 1500);
            }
        };
        
        checkBtn?.addEventListener("click", handleCheck);
        input?.addEventListener("keydown", (e) => {
            if (e.key === "Enter") handleCheck();
        });
    }
    
    if (currentMode === "flashcard") {
        const flipBtn = document.getElementById("mp-flip-button");
        const flashcardText = document.querySelector(".flashcard-text");
        const flashcardHint = document.querySelector(".flashcard-hint");
        const actions = document.getElementById("mp-flashcard-actions");
        
        flipBtn?.addEventListener("click", () => {
            const currentCard = mp.set.cards[mp.currentQuestion];
            if (flashcardText) flashcardText.textContent = currentCard.a;
            if (flashcardHint) flashcardHint.textContent = "Answer revealed";
            if (flipBtn) flipBtn.classList.add("hidden");
            if (actions) {
                actions.classList.remove("hidden");
                actions.style.display = "flex";
            }
        });
        
        const currentCard = mp.set.cards[mp.currentQuestion];
        
        document.getElementById("mp-understand-btn")?.addEventListener("click", async () => {
            await submitAnswerAndRender(currentCard.a);
            clearBonusTimer();
            advanceMultiplayerQuestion();
        });
        
        document.getElementById("mp-not-understand-btn")?.addEventListener("click", async () => {
            await submitAnswerAndRender("wrong_answer");
            clearBonusTimer();
            advanceMultiplayerQuestion();
        });
    }
}

async function submitAnswerAndRender(answer, isTrueFalse = null) {
    const { submitAnswer } = await import("./multiplayer.js");
    const result = await submitAnswer(answer, isTrueFalse);
    return result;
}

function advanceMultiplayerQuestion() {
    const mp = appState.multiplayer;
    const totalQuestions = mp.set.cards.length;
    
    if (mp.currentQuestion >= totalQuestions) {
        renderMultiplayerResult();
    } else {
        renderMultiplayerGame();
    }
}