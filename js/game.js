import {
    appState,
    getSelectedSet
} from "./state.js";

import {
    render
} from "./render.js";

/**
 * LEVEL_PAIRS system
 * Each level contains two phases.
 * More levels = more variety before a card is mastered.
 */
const LEVEL_PAIRS = [
    ["multiple-choice", "flashcard"],
    ["true-false", "typing"],
    ["flashcard", "multiple-choice"],
    ["typing", "true-false"]
];

const MAX_LEVEL = LEVEL_PAIRS.length * 2 - 1; // 7 (0-based: 0..7)

function buildStudyQueue(cards) {
    // Shuffle cards so they appear in random order (like Quizlet)
    const shuffled = shuffle([...cards]);
    return shuffled.map(card => ({
        card,
        level: 0,
        phaseIndex: 0,
        completed: false,
        wrongCount: 0
    }));
}

/**
 * Get the current study mode using study.level and study.phaseIndex
 */
export function getCurrentMode(study) {
    const pairIndex = study.level % LEVEL_PAIRS.length;
    return LEVEL_PAIRS[pairIndex][study.phaseIndex];
}

/**
 * Calculate mixed mode progress
 * totalSteps = cards.length * (levels * phasesPerLevel)
 * Each card goes through: level 0 (phase 0, phase 1), level 1 (phase 0, phase 1), ...
 */
export function calculateMixedProgress(game) {
    const totalPhases = LEVEL_PAIRS.length * 2; // 4 levels × 2 phases = 8
    const totalSteps = game.studyQueue.length * totalPhases;

    let completedSteps = 0;
    game.studyQueue.forEach(study => {
        if (study.completed) {
            completedSteps += totalPhases;
        } else {
            const effectiveLevel = Math.max(0, study.level);
            completedSteps += (effectiveLevel * 2) + study.phaseIndex;
        }
    });

    const percentage = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;

    return {
        completedSteps,
        totalSteps,
        percentage
    };
}

function isMixedComplete(game) {
    return game.studyQueue.every(study => study.completed);
}

/**
 * Progression logic (Quizlet-inspired):
 * - Correct answer: advance normally (phaseIndex 0→1, or level++ if phaseIndex 1)
 * - Wrong answer: stay at same level but restart the level's phase 0
 *                (card gets more practice = appears more often)
 * - If max level reached on phaseIndex 1 → completed:true
 */
export function updateStudyProgress(studyItem, isCorrect) {
    if (!studyItem || studyItem.completed) return;

    console.log("PROGRESS UPDATE");
    console.log("Before:", {
        level: studyItem.level,
        phaseIndex: studyItem.phaseIndex
    });
    console.log("Was correct:", isCorrect);

    if (!isCorrect) {
        // WRONG: Stay at current level, reset phase to 0
        // This makes the card appear more often (like Quizlet)
        studyItem.wrongCount++;
        studyItem.phaseIndex = 0;
        console.log("WRONG - Resetting to phase 0, level", studyItem.level);
        return;
    }

    // CORRECT: Advance normally
    if (studyItem.phaseIndex === 0) {
        // Move to next phase in same level
        studyItem.phaseIndex = 1;
        console.log("After:", {
            level: studyItem.level,
            phaseIndex: studyItem.phaseIndex
        });
        console.log("Moving to Phase 1 in Level", studyItem.level);
    } else {
        // phaseIndex === 1, level completed
        const nextLevel = studyItem.level + 1;

        if (nextLevel > MAX_LEVEL) {
            console.log(`LEVEL COMPLETE - Moving: Level ${studyItem.level} → completed`);
            studyItem.completed = true;
            console.log("CARD COMPLETED:", studyItem.card.q);
        } else {
            console.log(`LEVEL COMPLETE - Moving: Level ${studyItem.level} → Level ${nextLevel}`);
            studyItem.level = nextLevel;
            studyItem.phaseIndex = 0;
            console.log("After:", {
                level: studyItem.level,
                phaseIndex: studyItem.phaseIndex
            });
        }
    }
}

function getNextStudy(game) {
    const available = game.studyQueue.filter(study => !study.completed);

    console.log("NEXT STUDY - Available cards:", available.length);

    if (available.length === 0) {
        return null;
    }

    // Quizlet-style: prefer cards with lower levels AND higher wrong counts
    // Lower level = more practice needed = higher priority
    // Higher wrong count = more struggling = higher priority
    const scored = available.map(study => ({
        study,
        // Lower level = higher priority (more practice needed before mastery)
        // Higher wrong count = higher priority (struggling with this card)
        priority: (MAX_LEVEL - study.level) + (study.wrongCount * 2)
    }));

    // Sort by priority (highest first), then randomize within same priority
    scored.sort((a, b) => {
        if (b.priority !== a.priority) return b.priority - a.priority;
        return Math.random() - 0.5;
    });

    // Try to avoid selecting the same card consecutively
    const lastStudyId = game.lastStudyId;
    let selected;

    if (lastStudyId !== null && scored.length > 1) {
        const different = scored.filter(s => s.study.card.id !== lastStudyId);
        if (different.length > 0) {
            selected = different[0].study;
        } else {
            selected = scored[0].study;
        }
    } else {
        selected = scored[0].study;
    }

    game.lastStudyId = selected.card.id;

    console.log("NEXT STUDY");
    console.log("Card:", selected.card.q);
    console.log("Level:", selected.level);
    console.log("Phase:", selected.phaseIndex);
    console.log("Wrong count:", selected.wrongCount);
    console.log("Mode:", getCurrentMode(selected));

    return selected;
}

export function canStartGame(set) {
    if (set.cards.length < 4) {
        console.log("Need at least 4 cards to play");
        return {
            canPlay: false,
            reason: "Add at least 4 cards"
        };
    }
    const uniqueAnswers = new Set(
        set.cards.map(card => card.a)
    );
    const minimumUniqueAnswers = Math.ceil(
        set.cards.length / 2
    );
    if (uniqueAnswers.size < minimumUniqueAnswers) {
        console.log(`Need at least ${minimumUniqueAnswers} different answers`);
        return {
            canPlay: false,
            reason: `Add at least ${minimumUniqueAnswers} different answers`
        };
    }
    return {
        canPlay: true,
        reason: ""
    };
}

function createGameState(set) {
    return {
        cards: [...set.cards],
        currentIndex: 0,
        currentCard: null,

        mixedIndex: 0,
        currentStudy: null,

        options: [],
        score: 0,
        correct: 0,
        wrong: 0,

        answered: false,
        question: null,
        phase: "answering",

        flashcardStats: {
            understand: 0,
            notUnderstand: 0
        },

        type: set.studyMode,

        studyQueue: buildStudyQueue(set.cards),
        lastStudyId: null
    };
}

function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function generateOptions(currentCard) {
    const game = appState.game;
    const wrongAnswers = [
        ...new Set(
            game.cards
                .filter(card => {
                    return (
                        card.id !== currentCard.id &&
                        card.a !== currentCard.a
                    );
                })
                .map(card => card.a)
        )
    ];
    console.log(wrongAnswers);
    shuffle(wrongAnswers);
    const selectedWrongAnswers = wrongAnswers.slice(0, 3);
    const options = [
        currentCard.a,
        ...selectedWrongAnswers
    ];
    shuffle(options);
    return options;
}

export function startGame() {
    const set = getSelectedSet();

    if (!set) return;

    const result = canStartGame(set);

    if (!result.canPlay) {
        return false;
    }

    appState.game = createGameState(set);
    console.log("INIT QUEUE:", appState.game.studyQueue);

    if (appState.studyMode === "mixed") {
        appState.game.mixedIndex = 0;
    }

    generateQuestion();

    return true;
}

export function generateQuestion() {
    const game = appState.game;
    if (!game) return;

    game.phase = "answering";
    game.answered = false;

    let currentCard;
    let studyMode = appState.studyMode;

    if (studyMode === "mixed") {
        const currentStudy = getNextStudy(game);

        if (!currentStudy) {
            endGame();
            return;
        }

        game.currentStudy = currentStudy;
        currentCard = currentStudy.card;
        studyMode = getCurrentMode(currentStudy);

        console.log("Generated question mode:", studyMode, "for card:", currentCard.q);
    } else {
        currentCard = game.cards[game.currentIndex];
    }

    if (!currentCard) {
        endGame();
        return;
    }

    game.currentCard = currentCard;

    switch (studyMode) {
        case "multiple-choice":
            game.question = createMultipleChoiceQuestion(currentCard);
            break;
        case "typing":
            game.question = createTypingQuestion(currentCard);
            break;
        case "flashcard":
            game.question = createFlashcardQuestion(currentCard);
            break;
        case "true-false":
            game.question = createTrueFalseQuestion(currentCard);
            break;
    }

    console.log("Generated question:", game.question);

    if (game.question.options) {
        game.options = game.question.options;
    } else {
        game.options = [];
    }

    if (game.question.type === "multiple-choice") {
        console.assert(
            new Set(game.options).size === 4,
            "Duplicate options detected!"
        );
    }

    console.log("Current question:", game.currentCard);
    console.log("Options:", game.options);
}

function createMultipleChoiceQuestion(currentCard) {
    return {
        type: "multiple-choice",
        card: currentCard,
        options: generateOptions(currentCard)
    };
}

function createTypingQuestion(currentCard) {
    return {
        type: "typing",
        card: currentCard
    };
}

function createFlashcardQuestion(currentCard) {
    return {
        type: "flashcard",
        card: currentCard
    };
}

function createTrueFalseQuestion(currentCard) {
    const makeTrue = Math.random() < 0.5;

    const wrongAnswers = appState.game.cards
        .filter(card => {
            return card.id !== currentCard.id;
        })
        .map(card => card.a);

    shuffle(wrongAnswers);

    const wrongAnswer = wrongAnswers[0];

    return {
        type: "true-false",
        card: currentCard,
        statement: makeTrue ? currentCard.a : wrongAnswer,
        isTrue: makeTrue
    };
}

export function checkAnswer(answer) {
    const game = appState.game;
    if (!game) return;
    if (game.answered) {
        return;
    }

    game.answered = true;
    game.phase = "review";

    let isCorrect;

    if (game.question.type === "true-false") {
        isCorrect = String(game.question.isTrue) === answer;
    } else {
        isCorrect = answer === game.currentCard.a;
    }

    if (isCorrect) {
        game.score++;
        game.correct++;
        console.log("Correct");
    } else {
        game.wrong++;
        console.log("Wrong");
    }

    // Mixed mode: update study progress (Quizlet-style: wrong = stay at level)
    if (appState.studyMode === "mixed") {
        updateStudyProgress(game.currentStudy, isCorrect);

        const progress = calculateMixedProgress(game);
        console.log("PROGRESS BAR");
        console.log("Completed:", `${progress.completedSteps}/${progress.totalSteps}`);
        console.log("Percentage:", `${progress.percentage}%`);
    }

    console.log("After:", game.score);

    game.lastResult = {
        isCorrect,
        userAnswer: answer,
        correctAnswer: game.question.card ? game.question.card.a : game.currentCard.a
    };

    return {
        isCorrect,
        correctAnswer: game.currentCard.a
    };
}

// Move to next question
export function nextQuestion() {
    const game = appState.game;

    if (!game) return;

    if (appState.studyMode === "mixed") {
        // Check if all cards completed
        if (isMixedComplete(game)) {
            endGame();
            return;
        }

        generateQuestion();
        render();

        return;
    }

    // Non-mixed mode
    game.currentIndex++;

    if (game.currentIndex >= game.cards.length) {
        endGame();
        return;
    }

    generateQuestion();
    render();
}

export function advanceFlashcardStudy() {
    if (appState.studyMode === "mixed" && appState.game && appState.game.currentStudy) {
        // For flashcard in mixed mode, "Understand" = correct, "Not understand" = wrong
        // We need to determine if the user understood
        // This is called from events.js where we know which button was clicked
        updateStudyProgress(appState.game.currentStudy, true);

        const progress = calculateMixedProgress(appState.game);
        console.log("PROGRESS BAR");
        console.log("Completed:", `${progress.completedSteps}/${progress.totalSteps}`);
        console.log("Percentage:", `${progress.percentage}%`);
    }
}

/**
 * Called when user clicks "Not understand" on a flashcard in mixed mode
 * This should NOT advance the card (like a wrong answer)
 */
export function notUnderstandStudyAdvance() {
    if (appState.studyMode === "mixed" && appState.game && appState.game.currentStudy) {
        // "Not understand" = wrong = don't advance
        updateStudyProgress(appState.game.currentStudy, false);

        const progress = calculateMixedProgress(appState.game);
        console.log("PROGRESS BAR");
        console.log("Completed:", `${progress.completedSteps}/${progress.totalSteps}`);
        console.log("Percentage:", `${progress.percentage}%`);
    }
}

// Finish game
export function endGame() {
    console.log(appState.studyMode);
    if (appState.studyMode === "flashcard") {
        appState.mode = "flashcard-result";
    } else {
        appState.mode = "solo-result";
    }
    console.log(appState.mode);
    render();
}