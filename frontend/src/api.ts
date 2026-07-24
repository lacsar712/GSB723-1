import axios from 'axios';

const api = axios.create({
    baseURL: '/api',
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export interface ReviewQuestion {
    sessionId: string;
    wordId: number;
    word: string;
    pronunciation: string;
    pos: string;
    definition: string;
    example: string;
    options: string[];
}

export interface ReviewStartResponse {
    sessionId: string;
    questions: ReviewQuestion[];
}

export interface ReviewAnswerResponse {
    isCorrect: boolean;
    correctWord: string;
    intervalDays: number;
    nextReviewAt: string;
    dueImmediately: boolean;
}

export interface WrongAnswer {
    wordId: number;
    word: string;
    pronunciation: string;
    pos: string;
    definition: string;
    example: string;
    selectedOption: string;
}

export interface ReviewResults {
    sessionId: string;
    total: number;
    correct: number;
    wrong: number;
    accuracy: number;
    wrongAnswers: WrongAnswer[];
}

export interface ReviewStats {
    dueCount: number;
    totalLearned: number;
}

export const reviewApi = {
    start: (limit: number = 5) =>
        api.get<ReviewStartResponse>('/review/start', { params: { limit } }).then(r => r.data),
    answer: (sessionId: string, wordId: number, selectedOption: string, correctWord: string) =>
        api.post<ReviewAnswerResponse>('/review/answer', { sessionId, wordId, selectedOption, correctWord }).then(r => r.data),
    results: (sessionId: string) =>
        api.get<ReviewResults>(`/review/results/${sessionId}`).then(r => r.data),
    stats: () =>
        api.get<ReviewStats>('/review/stats').then(r => r.data),
};

export default api;
