import { useState, useCallback, useRef } from 'react';
import { reviewApi } from './api';
import type {
    ReviewQuestion,
    ReviewResults,
    ReviewAnswerResponse,
} from './api';

export type QuizPhase = 'idle' | 'loading' | 'playing' | 'finished';

export interface AnswerRecord {
    wordId: number;
    selectedOption: string;
    isCorrect: boolean;
    correctWord: string;
}

export interface ReviewQuizState {
    phase: QuizPhase;
    questions: ReviewQuestion[];
    currentIndex: number;
    selectedOption: string | null;
    lastResult: ReviewAnswerResponse | null;
    results: ReviewResults | null;
    correctCount: number;
    wrongCount: number;
    answerHistory: AnswerRecord[];
    error: string | null;
}

const AUTO_ADVANCE_MS = 1200;

export function useReviewQuiz() {
    const [state, setState] = useState<ReviewQuizState>({
        phase: 'idle',
        questions: [],
        currentIndex: 0,
        selectedOption: null,
        lastResult: null,
        results: null,
        correctCount: 0,
        wrongCount: 0,
        answerHistory: [],
        error: null,
    });

    const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const clearAdvanceTimer = useCallback(() => {
        if (advanceTimer.current) {
            clearTimeout(advanceTimer.current);
            advanceTimer.current = null;
        }
    }, []);

    const startQuiz = useCallback(async (limit: number = 5) => {
        clearAdvanceTimer();
        setState({
            phase: 'loading',
            questions: [],
            currentIndex: 0,
            selectedOption: null,
            lastResult: null,
            results: null,
            correctCount: 0,
            wrongCount: 0,
            answerHistory: [],
            error: null,
        });
        try {
            const data = await reviewApi.start(limit);
            if (!data.questions || data.questions.length === 0) {
                setState(prev => ({
                    ...prev,
                    phase: 'finished',
                    results: {
                        sessionId: data.sessionId,
                        total: 0,
                        correct: 0,
                        wrong: 0,
                        accuracy: 0,
                        wrongAnswers: [],
                    },
                }));
                return;
            }
            setState(prev => ({
                ...prev,
                phase: 'playing',
                questions: data.questions,
                currentIndex: 0,
            }));
        } catch (e: any) {
            setState(prev => ({
                ...prev,
                phase: 'idle',
                error: e?.response?.data?.error || '获取复习题目失败，请稍后重试',
            }));
        }
    }, [clearAdvanceTimer]);

    const finishQuiz = useCallback(async (sessionId: string, history: AnswerRecord[]) => {
        try {
            const results = await reviewApi.results(sessionId);
            setState(prev => ({
                ...prev,
                phase: 'finished',
                results,
                selectedOption: null,
                lastResult: null,
            }));
        } catch (e: any) {
            const correct = history.filter(a => a.isCorrect).length;
            const total = history.length;
            const wrong = total - correct;
            setState(prev => ({
                ...prev,
                phase: 'finished',
                results: {
                    sessionId,
                    total,
                    correct,
                    wrong,
                    accuracy: total > 0 ? Math.round((correct / total) * 100) : 0,
                    wrongAnswers: history
                        .filter(a => !a.isCorrect)
                        .map(a => {
                            const q = prev.questions.find(q => q.wordId === a.wordId)!;
                            return {
                                wordId: a.wordId,
                                word: q.word,
                                pronunciation: q.pronunciation,
                                pos: q.pos,
                                definition: q.definition,
                                example: q.example,
                                selectedOption: a.selectedOption,
                            };
                        }),
                },
            }));
        }
    }, []);

    const advance = useCallback((nextIndex: number, sessionId: string, history: AnswerRecord[]) => {
        if (nextIndex >= state.questions.length) {
            finishQuiz(sessionId, history);
        } else {
            setState(prev => ({
                ...prev,
                currentIndex: nextIndex,
                selectedOption: null,
                lastResult: null,
            }));
        }
    }, [state.questions.length, finishQuiz]);

    const submitAnswer = useCallback(async (option: string) => {
        if (state.phase !== 'playing') return;
        if (state.selectedOption !== null) return;

        const current = state.questions[state.currentIndex];
        if (!current) return;

        setState(prev => ({ ...prev, selectedOption: option }));

        try {
            const result = await reviewApi.answer(
                current.sessionId,
                current.wordId,
                option,
                current.word
            );

            const record: AnswerRecord = {
                wordId: current.wordId,
                selectedOption: option,
                isCorrect: result.isCorrect,
                correctWord: result.correctWord,
            };

            const newHistory = [...state.answerHistory, record];
            const newCorrect = state.correctCount + (result.isCorrect ? 1 : 0);
            const newWrong = state.wrongCount + (result.isCorrect ? 0 : 1);

            setState(prev => ({
                ...prev,
                lastResult: result,
                correctCount: newCorrect,
                wrongCount: newWrong,
                answerHistory: newHistory,
            }));

            const nextIndex = state.currentIndex + 1;
            advanceTimer.current = setTimeout(() => {
                advance(nextIndex, current.sessionId, newHistory);
            }, AUTO_ADVANCE_MS);
        } catch (e: any) {
            setState(prev => ({
                ...prev,
                selectedOption: null,
                error: e?.response?.data?.error || '提交答案失败，请重试',
            }));
        }
    }, [state.phase, state.selectedOption, state.questions, state.currentIndex, state.answerHistory, state.correctCount, state.wrongCount, advance]);

    const reset = useCallback(() => {
        clearAdvanceTimer();
        setState({
            phase: 'idle',
            questions: [],
            currentIndex: 0,
            selectedOption: null,
            lastResult: null,
            results: null,
            correctCount: 0,
            wrongCount: 0,
            answerHistory: [],
            error: null,
        });
    }, [clearAdvanceTimer]);

    const playPronunciation = useCallback((text: string) => {
        if (!text) return;
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            const utter = new SpeechSynthesisUtterance(text);
            utter.lang = 'en-US';
            window.speechSynthesis.speak(utter);
        }
    }, []);

    return {
        ...state,
        currentQuestion: state.questions[state.currentIndex] || null,
        progress: state.questions.length > 0
            ? Math.round(((state.currentIndex) / state.questions.length) * 100)
            : 0,
        startQuiz,
        submitAnswer,
        reset,
        playPronunciation,
    };
}
