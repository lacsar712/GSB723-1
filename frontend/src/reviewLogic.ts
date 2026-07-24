import api from './api';

export interface QuizQuestion {
    learningId: number;
    wordId: number;
    word: string;
    pronunciation: string;
    definition: string;
    example: string;
    options: string[];
}

export interface AnswerRecord {
    learningId: number;
    wordId: number;
    correctAnswer: string;
    selectedAnswer: string;
    isCorrect: boolean;
    definition: string;
    pronunciation: string;
}

export interface QuizResult {
    total: number;
    correct: number;
    incorrect: number;
    accuracy: number;
    wrongAnswers: {
        word: string;
        definition: string;
        pronunciation: string;
        userAnswer: string;
    }[];
}

export type QuizPhase = 'idle' | 'loading' | 'question' | 'feedback' | 'result';

export interface QuizState {
    phase: QuizPhase;
    questions: QuizQuestion[];
    currentIndex: number;
    answers: AnswerRecord[];
    selectedOption: string | null;
    showFeedback: boolean;
    result: QuizResult | null;
    error: string | null;
    hasWords: boolean;
}

export const initialQuizState: QuizState = {
    phase: 'idle',
    questions: [],
    currentIndex: 0,
    answers: [],
    selectedOption: null,
    showFeedback: false,
    result: null,
    error: null,
    hasWords: true
};

export async function fetchQuizQuestions(size: number = 5): Promise<{ questions: QuizQuestion[]; hasWords: boolean }> {
    const res = await api.get(`/review/quiz?size=${size}`);
    return {
        questions: res.data.questions || [],
        hasWords: res.data.hasWords !== false
    };
}

export function checkAnswer(currentQuestion: QuizQuestion, selectedOption: string): boolean {
    return selectedOption === currentQuestion.word;
}

export function buildAnswerRecord(question: QuizQuestion, selectedOption: string, isCorrect: boolean): AnswerRecord {
    return {
        learningId: question.learningId,
        wordId: question.wordId,
        correctAnswer: question.word,
        selectedAnswer: selectedOption,
        isCorrect,
        definition: question.definition,
        pronunciation: question.pronunciation
    };
}

export async function submitQuizResults(answers: AnswerRecord[]): Promise<QuizResult> {
    const res = await api.post('/review/submit', { answers });
    return res.data;
}

export function playWordAudio(word: string): void {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(word);
        utterance.lang = 'en-US';
        utterance.rate = 0.8;
        window.speechSynthesis.speak(utterance);
    }
}

export function getCurrentQuestion(state: QuizState): QuizQuestion | null {
    if (state.phase === 'question' || state.phase === 'feedback') {
        return state.questions[state.currentIndex] || null;
    }
    return null;
}

export function isLastQuestion(state: QuizState): boolean {
    return state.currentIndex >= state.questions.length - 1;
}

export function getProgress(state: QuizState): { current: number; total: number } {
    return {
        current: state.currentIndex + 1,
        total: state.questions.length
    };
}
