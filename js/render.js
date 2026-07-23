import {
    database,
    appState,
    getSelectedSet
} from "./state.js";

import {
    display,
    setList,
    playSidebarButton,
    editSidebarButton,
    deleteSidebarButton
} from "./dom.js";

// import {
//     setupEditEvents
// } from "./events.js"

import { 
    setupEditEvents,
    setupPlayEvents,
    setupPlayHomeEvents,
    setupSoloResultEvents,
    setupStudyModeEvents,
    setupFlashcardResultEvents
} from "./events.js";

import {
    canStartGame,
    calculateMixedProgress,
    getCurrentMode
} from "./game.js"

import {
    showMultiplayerJoinView
} from "./multiplayer-events.js";

export function render() {
    renderSidebar();
    renderDisplay();
    updateSidebarActions();
}

function renderSidebar() {

    setList.innerHTML = "<h2>Flashcard Sets</h2>";

    database.forEach(set => {

        const button = document.createElement("button");

        button.className = "set-button";

        button.textContent = set.name;

        if (set.id === appState.selectedSetId) {
            button.classList.add("active");
        }

        button.addEventListener("click", () => {

            appState.selectedSetId = set.id;
            appState.mode = "edit";

            render();

        });

        setList.appendChild(button);

    });

}

function renderDisplay() {

    switch (appState.mode) {

        case "welcome":
            renderWelcome();
            break;

        case "edit":
            renderEdit();
            break;

        case "play":
            renderPlayHome();
            break;

        case "solo":
            renderSoloGame();
            break;

        case "multiplayer-play":
            // Rendered via multiplayer-render.js
            break;

        case "solo-result":
            renderSoloResult();
            break;
        
        case "study-mode":
            renderStudyMode();
            break;
            
        case "flashcard-result":
            renderFlashcardResult();
            break;
        case "multiplayer":
            showMultiplayerJoinView();
            return;
        default:
            renderWelcome();

    }

}

function renderWelcome() {

    display.innerHTML = `
        <div class="welcome">
            <h2>Welcome to Memorize</h2>
            <p>Select a flashcard set to begin.</p>
        </div>
    `;

}

function updateSidebarActions() {

    const hasSelection = appState.selectedSetId !== null;

    playSidebarButton.disabled = !hasSelection;

    editSidebarButton.disabled = !hasSelection;

    deleteSidebarButton.disabled = !hasSelection;

}


function renderCards(set) {

    return set.cards.map(card => `
        <div class="card-item">

            <strong>${card.q}</strong>

            <p>${card.a}</p>

            <div class="card-buttons">

                <button
                    class="edit-card-button"
                    data-id="${card.id}">

                    Edit

                </button>

                <button
                    class="delete-card-button"
                    data-id="${card.id}">

                    Delete

                </button>

            </div>

        </div>
    `).join("");

}

function renderEdit() {

    const set = getSelectedSet();

    if (!set) {
        renderWelcome();
        return;
    }

    display.innerHTML = `
        <div class="edit-page">

            <div class="edit-header">

                <h2>${set.name}</h2>

                <div class="set-actions">

                    <button class="rename-button">
                        Rename
                    </button>

                </div>

            </div>

            <div class="edit-toolbar">
                <div class="edit-toolbar-row">
                    <button class="add-button">
                        + Add Card
                    </button>
                </div>
                <div class="edit-toolbar-row">
                    <button class="import-button">📥 Import</button>
                    <button class="export-button">📤 Export</button>
                </div>
            </div>

            <div class="card-list">
                ${renderCards(set)}
            </div>

        </div>
    `;
    setupEditEvents();

}


// function renderPlayHome() {

//     const set = getSelectedSet();

//     if (!set) {
//         renderWelcome();
//         return;
//     }

//     display.innerHTML = `
//         <div class="play-page">

//             <h2>${set.name}</h2>

//             <p>Play mode coming soon.</p>

//         </div>
//     `;

// }

function renderPlayHome() {
    const set = getSelectedSet();
    const result = canStartGame(set);
    display.innerHTML = `
        <div class="play-home">
            <h2>Play</h2>

            <p>Select a game mode</p>

            <button 
                id="solo-button" 
                class="mode-card"
                ${result.canPlay ? "" : "disabled"}>

                <span class="mode-title">
                    👤 Solo
                </span>

                <span class="mode-description">
                    Practice by yourself
                </span>
                ${!result.canPlay ? `
                    <span class="mode-warning">

                        🔒 ${result.reason}

                    </span>
                ` : ""}
            </button>
            <button
                id="multiplayer-button"
                class="mode-card">

                <span class="mode-title">
                    👥 Multiplayer
                </span>

                <span class="mode-description">
                    Play with friends online
                </span>

            </button>
        </div>
    `;
    setupPlayHomeEvents();
}

function renderStudyMode() {

    display.innerHTML = `
        <div class="study-mode-page">

            <h2 class="study-mode-heading">
                Choose Study Mode
            </h2>

            <div class="study-mode-list">

                <button
                    id="multiple-choice-button"
                    class="study-mode-option">

                    <span class="study-mode-icon">
                        🎯
                    </span>

                    <span class="study-mode-title">
                        Multiple Choice
                    </span>

                </button>

                <button
                    id="typing-button"
                    class="study-mode-option">

                    <span class="study-mode-icon">
                        ⌨️
                    </span>

                    <span class="study-mode-title">
                        Typing
                    </span>

                </button>

                <button
                    id="flashcard-button"
                    class="study-mode-option">

                    <span class="study-mode-icon">
                        🗂️
                    </span>

                    <span class="study-mode-title">
                        Flashcard
                    </span>

                </button>

                <button
                    id="true-false-button"
                    class="study-mode-option">

                    <span class="study-mode-icon">
                        ✔️
                    </span>

                    <span class="study-mode-title">
                        True / False
                    </span>

                </button>

                <button
                    id="mixed-button"
                    class="study-mode-option">

                    <span class="study-mode-icon">
                        🎲
                    </span>

                    <span class="study-mode-title">
                        Mixed
                    </span>

                </button>

            </div>

            <button
                id="back-to-play-button"
                class="study-mode-back">

                ← Back

            </button>

        </div>
    `;
    setupStudyModeEvents();
}

function renderSoloGame() {

    const set = getSelectedSet();

    const game = appState.game;


    if (!set || !game) {

        renderWelcome();

        return;

    }

    const question = game.question;
    
    let progress;
    let progressLabel = "";

    if (appState.studyMode === "mixed") {
        const mixedProgress = calculateMixedProgress(game);
        progress = mixedProgress.percentage;
        progressLabel = `
            <span class="question-counter">
                ${mixedProgress.completedSteps} / ${mixedProgress.totalSteps}
            </span>
        `;
    } else {
        progress = ((game.currentIndex + 1) / game.cards.length) * 100;
        const currentQuestion = game.currentIndex + 1;
        const totalQuestions = game.cards.length;
        progressLabel = `
            <span class="question-counter">
                Question ${currentQuestion} / ${totalQuestions}
            </span>
        `;
    }


    display.innerHTML = `

        <div class="game-page">


            <div class="game-header">

                <h2>
                    ${set.name}
                </h2>


                <div class="game-info">

                    ${progressLabel}

                    <span>
                        Score: ${game.score}
                    </span>

                </div>

                <div class="progress-container">
                    <div 
                        class="progress-fill"
                        style="width: ${progress}%">
                    </div>
                </div>
            </div>

            ${renderQuestion()}
            
        </div>

    `;
    setupPlayEvents();

}

function renderQuestion() {
    const game = appState.game;
    const question = game.question;
    if (!question) return "";
    switch(question.type) {
        case "multiple-choice":
            return renderMultipleChoiceQuestion(question);
        case "typing":
            return renderTypingQuestion(question);
        case "flashcard":
            return renderFlashcardQuestion(question);
        case "true-false":
            return renderTrueFalseQuestion(question);
        case "mixed":
            return renderMixedQuestion(question);
        default:
            return "";
    }
    // return `
    //     <div class="question-card">
    //         ${question.card.q}
    //     </div>
    //     <div class="answer-list">
    //         ${question.options.map((option,index)=>`
    //             <button
    //                 class="answer-button"
    //                 data-answer="${option}">
    //                 ${String.fromCharCode(65 + index)}.
    //                 ${option}
    //             </button>
    //         `).join("")}
    //     </div>
    // `;
}

function renderMultipleChoiceQuestion(question) {

    return `

        <div class="question-card">

            ${question.card.q}

        </div>


        <div class="answer-list">

            ${question.options.map((option,index)=>`

                <button
                    class="answer-button"
                    data-answer="${option}">

                    ${String.fromCharCode(65 + index)}.
                    ${option}

                </button>

            `).join("")}

        </div>

    `;

}

function renderTypingQuestion(question) {
    const game = appState.game;
    
    return `

        <div class="question-card">

            ${question.card.q}

        </div>

        <div class="typing-container">
            ${game.phase === "review"
                ? `
                    <div class="typing-result">

                        <div class="
                            typing-result-header
                            ${
                                game.lastResult.isCorrect
                                    ? "result-correct"
                                    : "result-wrong"
                            }">

                            ${
                                game.lastResult.isCorrect
                                    ? "✅ Correct"
                                    : "❌ Incorrect"
                            }

                        </div>

                        <div class="typing-result-body">

                            <div class="typing-result-section">

                                <div class="typing-result-label">
                                    Your Answer
                                </div>

                                <div class="typing-result-value">

                                    ${game.lastResult.userAnswer}

                                </div>

                            </div>

                            ${
                                !game.lastResult.isCorrect
                                    ? `
                                        <div class="typing-result-section">

                                            <div class="typing-result-label">
                                                Correct Answer
                                            </div>

                                            <div class="typing-result-value correct-text">

                                                ${game.lastResult.correctAnswer}

                                            </div>

                                        </div>
                                    `
                                    : ""
                            }

                        </div>

                    </div>
                `
                : ""
            }
            ${game.phase === "answering"
                ? `
                    <input
                        id="typing-input"
                        class="typing-input"
                        type="text"
                        placeholder="Type your answer..."
                    >
                `
                : ""
            }            
            <button
                id="check-answer-button"
                class="action-button">
                ${game.phase === "answering"
                    ? "Check"
                    : "Next"}
            </button>
        </div>
    `;
}

function renderFlashcardQuestion(question) {

    const game = appState.game;

    return `

        <div class="flashcard">
            <div class="flashcard-inner">

                <div class="flashcard-text">

                    ${
                        game.phase === "answering"
                            ? question.card.q
                            : question.card.a
                    }

                </div>

                <div class="flashcard-hint">

                    ${
                        game.phase === "answering"
                            ? "Click Flip to reveal answer"
                            : "Answer revealed"
                    }

                </div>

            </div>
        </div>
        ${
            game.phase === "answering"

            ? `
                <button id="flip-button">
                    Flip
                </button>
            `

            : `
                <button id="understand-button">
                    ✅ Understand
                </button>

                <button id="not-understand-button">
                    ❌ Not understand
                </button>
            `
        }
    `;

}

function renderTrueFalseQuestion(question) {

    return `

        <div class="question-card">

            <div class="tf-question">

                ${question.card.q}

            </div>

            <div class="tf-divider"></div>

            <div class="tf-statement">

                ${question.statement}

            </div>

        </div>

        <div class="answer-list">

            <button
                class="answer-button"
                data-answer="true">

                ✅ True

            </button>

            <button
                class="answer-button"
                data-answer="false">

                ❌ False

            </button>

        </div>

    `;

}


function renderSoloResult() {
    const game = appState.game;
    const accuracy = Math.round(
        game.correct / (game.correct + game.wrong) * 100
    );
    if (!game) {

        renderWelcome();

        return;

    }
    display.innerHTML = `

    <div class="solo-result-page">
        <h2>
            Game Finished
        </h2>
        <div class="result-score">
            <p>
                Score:
                ${game.score}
            </p>
        </div>
        <div class="result-stats">
            <p>
                Correct:
                ${game.correct}

            </p>
            <p>
                Wrong:
                ${game.wrong}
            </p>
            <p>
                Accuracy:
                ${accuracy}%
            </p>
        </div>
        <div class="result-actions">

            <button id="play-again-button">

                Play Again

            </button>

            <button id="back-to-play-button">

                Back to Play

            </button>

        </div>
    </div>
    `;
    setupSoloResultEvents();
}

export function renderFlashcardResult() {

    const stats =
        appState.game.flashcardStats;

    const total =
        stats.understand +
        stats.notUnderstand;


    const percentage =
        Math.round(
            (stats.understand / total) * 100
        );


    display.innerHTML = `

        <div class="result-page">


            <h2>
                Flashcard Result
            </h2>


            <div class="result-card">


                <div class="result-item">

                    <span>
                        Total Cards
                    </span>

                    <strong>
                        ${total}
                    </strong>

                </div>


                <div class="result-item">

                    <span>
                        Understand
                    </span>

                    <strong>
                        ${stats.understand}
                    </strong>

                </div>


                <div class="result-item">

                    <span>
                        Need Review
                    </span>

                    <strong>
                        ${stats.notUnderstand}
                    </strong>

                </div>


                <div class="result-score">

                    ${percentage}% mastered

                </div>


            </div>


            <div class="result-actions">

                <button
                    id="play-again-button"
                    class="action-button">

                    Play Again

                </button>


                <button
                    id="back-to-play-button"
                    class="action-button secondary">

                    Back to Play

                </button>


            </div>


        </div>

    `;
    setupFlashcardResultEvents();
}