import {
    display,

    newSetButton,
    cancelButton,
    createButton,

    renameSaveButton,
    renameCancelButton,

    deleteConfirmButton,
    deleteCancelButton,

    addCardSaveButton,
    addCardCancelButton,

    editCardQuestionInput,
    editCardAnswerInput,
    editCardSaveButton,
    editCardCancelButton,

    setNameInput,
    renameInput,

    playSidebarButton,
    editSidebarButton,
    deleteSidebarButton,
    menuButton
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
    openAddCardModal,
    closeAddCardModal,

    handleAddCard,

    handleDeleteCard,

    handleEditCard,
    saveEditedCard,
    closeEditCardModal
} from "./cards.js";

import {
    appState
} from "./state.js";

import {
    render
} from "./render.js";

import {
    startGame
} from "./game.js";

import {
    checkAnswer,
    nextQuestion,
    advanceFlashcardStudy,
    notUnderstandStudyAdvance
} from "./game.js";

export function setupEditEvents() {
    const editCardButtons = display.querySelectorAll(".edit-card-button");
    const deleteCardButtons = display.querySelectorAll(".delete-card-button");
    const renameButton = display.querySelector(".rename-button");
    const addButton = display.querySelector(".add-button");

    renameButton.addEventListener("click", openRenameModal);

    addButton.addEventListener("click", openAddCardModal);

    deleteCardButtons.forEach(button => {
        button.addEventListener("click", () => {
            const cardId = Number(button.dataset.id);
            handleDeleteCard(cardId);
        });
    });
    editCardButtons.forEach(button => {
        button.addEventListener("click", () => {

            const cardId = Number(button.dataset.id);

            handleEditCard(cardId);

        });
    });

}


export function setupModalEvents() {

    newSetButton.addEventListener("click", openModal);

    cancelButton.addEventListener("click", closeModal);

    createButton.addEventListener("click", createSet);

    renameSaveButton.addEventListener("click", renameSet);

    renameCancelButton.addEventListener("click", closeRenameModal);

    deleteConfirmButton.addEventListener("click", deleteSet);

    deleteCancelButton.addEventListener("click", closeDeleteModal);

    addCardSaveButton.addEventListener("click", handleAddCard);

    addCardCancelButton.addEventListener("click", closeAddCardModal);

    editCardCancelButton.addEventListener("click",closeEditCardModal);

    editCardSaveButton.addEventListener("click",saveEditedCard);

}


export function setupKeyboardEvents() {

    setNameInput.addEventListener("keydown", e => {
        if (e.key === "Enter") {
            createSet();
        }
    });

    renameInput.addEventListener("keydown", e => {
        if (e.key === "Enter") {
            renameSet();
        }
    });
    editCardQuestionInput.addEventListener("keydown", e => {
        if (e.key === "Enter") {
            saveEditedCard();
        }
    });
    editCardAnswerInput.addEventListener("keydown", e => {
        if (e.key === "Enter") {
            saveEditedCard();
        }
    });

}


export function setupAuthEvents() {

}

function setupFlashcardEvents() {

    const flipButton =
        display.querySelector("#flip-button");

    const understandButton =
        display.querySelector("#understand-button");

    const notUnderstandButton =
        display.querySelector("#not-understand-button");


    if (flipButton) {

        flipButton.addEventListener(
            "click",
            () => {

                appState.game.phase = "review";

                render();

            }
        );

    }


    if (understandButton) {

        understandButton.addEventListener(
            "click",
            () => {

                appState.game.flashcardStats.understand++;
                if (appState.studyMode === "mixed") {
                    advanceFlashcardStudy();
                }
                console.log(
                    "AFTER FLASHCARD:",
                    appState.game.currentStudy
                );
                nextQuestion();

            }
        );

    }


    if (notUnderstandButton) {

        notUnderstandButton.addEventListener(
            "click",
            () => {

                appState.game.flashcardStats.notUnderstand++;
                if (appState.studyMode === "mixed") {
                    notUnderstandStudyAdvance();
                }
                nextQuestion();

            }
        );

    }

}

export function setupFlashcardResultEvents() {


    const playAgainButton =
        display.querySelector(
            "#play-again-button"
        );


    const backButton =
        display.querySelector(
            "#back-to-play-button"
        );

    if (playAgainButton) {

        playAgainButton.addEventListener(
            "click",
            () => {

                appState.mode =
                    "study-mode";

                render();

            }
        );

    }

    if (backButton) {

        backButton.addEventListener(
            "click",
            () => {

                appState.game = null;

                appState.mode = "play";

                render();

            }
        );

    }

}

function setupTypingEvents() {
    const typingInput =
        display.querySelector("#typing-input");

    const checkButton =
        display.querySelector("#check-answer-button");

    if (checkButton) {
        checkButton.addEventListener("click", () => {
            if (appState.game.phase === "answering") {
                const answer = typingInput.value.trim();
                const result = checkAnswer(answer);
                if (!result) return;
                render();
                return;
            }
            if (appState.game.phase === "review") {
                nextQuestion();
            }
        });
    }
}

function setupMultipleChoiceEvents() {
    const answerButtons = display.querySelectorAll(
        ".answer-button"
    );

    answerButtons.forEach(button => {

        button.addEventListener("click", () => {
            const answer = button.dataset.answer;
            const result = checkAnswer(answer, button);
            console.log(result);
            if (result.isCorrect) {
                button.classList.add("correct");
            }
            else {
                button.classList.add("wrong");
                answerButtons.forEach(answerButton => {
                    if (
                        answerButton.dataset.answer ===
                        result.correctAnswer
                    ) {
                        answerButton.classList.add("correct");
                    }
                });
            }
            answerButtons.forEach(answerButton => {
                answerButton.disabled = true;
            });
            setTimeout(() => {
                nextQuestion();
            }, 750);
        });

    });

}

function setupTrueFalseEvents() {

    const game = appState.game;

    if (
        !game ||
        game.question.type !== "true-false"
    ) {
        return;
    }

    const answerButtons =
        display.querySelectorAll(".answer-button");

    answerButtons.forEach(button => {

        button.addEventListener("click", () => {

            const answer =
                button.dataset.answer;

            const result =
                checkAnswer(answer);

            if (!result) return;

            if (result.isCorrect) {

                button.classList.add("correct");

            }
            else {

                button.classList.add("wrong");

                answerButtons.forEach(answerButton => {

                    if (
                        answerButton.dataset.answer ===
                        String(game.question.isTrue)
                    ) {

                        answerButton.classList.add("correct");

                    }

                });

            }

            answerButtons.forEach(answerButton => {

                answerButton.disabled = true;

            });

            setTimeout(() => {

                nextQuestion();

            }, 750);

        });

    });

}

export function setupPlayEvents() {
    setupTypingEvents();
    setupMultipleChoiceEvents();
    setupFlashcardEvents();
    setupTrueFalseEvents();
}

function selectStudyMode(mode) {
    appState.studyMode = mode;
    const started = startGame();
    if (!started) return;
    appState.mode = "solo";
    render();
}

export function setupStudyModeEvents() {
    const multipleChoiceButton =
        display.querySelector("#multiple-choice-button");

    const typingButton =
        display.querySelector("#typing-button");

    const flashcardButton =
        display.querySelector("#flashcard-button");

    const trueFalseButton =
        display.querySelector("#true-false-button");

    const backButton =
        display.querySelector("#back-to-play-button");
    const mixedButton =
        display.querySelector("#mixed-button");
    multipleChoiceButton.addEventListener("click", () => {
        selectStudyMode("multiple-choice");
    });
    typingButton.addEventListener("click", () => {
        selectStudyMode("typing");
    });
    flashcardButton.addEventListener("click", () => {
        selectStudyMode("flashcard");
    });
    trueFalseButton.addEventListener("click", () => {
        selectStudyMode("true-false");
    });
    mixedButton.addEventListener("click", () => {
        selectStudyMode("mixed");
    });
    backButton.addEventListener("click", () => {
        appState.mode = "play";
        render();
    });
}

export function startSoloMode() {
    appState.mode = "study-mode";
    render();
}

export function setupPlayHomeEvents() {
    const soloButton = display.querySelector(
        "#solo-button"
    );
    if (!soloButton) return;
    soloButton.addEventListener("click", () => {
        startSoloMode();
    });
}

export function setupSoloResultEvents() {
    const playAgainButton = display.querySelector(
        "#play-again-button"
    );

    const backButton = display.querySelector(
        "#back-to-play-button"
    );
    playAgainButton?.addEventListener(
        "click",
        () => {
            startSoloMode();
        }
    );
    backButton?.addEventListener(
        "click",
        () => {
            appState.mode = "play";
            render();
        }
    );
}

export function setupSidebarEvents() {
    playSidebarButton.addEventListener("click", () => {
        // startGame();
        appState.mode = "play";
        render();
    });

    editSidebarButton.addEventListener("click", () => {
        appState.mode = "edit";
        render();
    });
    deleteSidebarButton.addEventListener("click", openDeleteModal);
}

export function setupMobileMenu() {

    const sidebar = document.querySelector(".sidebar");

    menuButton.addEventListener("click", () => {

        sidebar.classList.toggle("open");

    });

}

export function setupEvents() {

    setupModalEvents();

    setupKeyboardEvents();

    setupAuthEvents();

    setupSidebarEvents();

    setupMobileMenu();

}