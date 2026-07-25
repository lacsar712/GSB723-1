// Review self-test logic layer.
// 只负责：出题（构建 4 选项）、判分、错题聚合与复习时间推算。
// 展示与交互都在 ReviewQuiz.tsx 中处理，两层解耦以便后续迭代。

export const DEFAULT_ROUND_SIZE = 5;
export const MAX_INTERVAL_DAYS = 30;

export interface ReviewWord {
    id: number;
    word: string;
    pronunciation: string;
    pos: string;
    definition: string;
    example: string;
}

export interface ReviewQuestion {
    word: ReviewWord;
    options: string[]; // 4 个英文选项，含正确答案
}

export interface WrongItem {
    word: string;
    definition: string;
    pronunciation: string;
    selectedWord: string;
}

export interface ReviewSummary {
    total: number;
    correctCount: number;
    wrongCount: number;
    accuracy: number; // 百分比整数
    wrongItems: WrongItem[];
}

// 从干扰词池中随机挑选 count 个不等于正确单词的英文词。
const pickDistractors = (correctWord: string, pool: string[], count: number): string[] => {
    const uniquePool = Array.from(new Set(pool.filter(w => w && w !== correctWord)));
    for (let i = uniquePool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [uniquePool[i], uniquePool[j]] = [uniquePool[j], uniquePool[i]];
    }
    return uniquePool.slice(0, count);
};

const shuffle = <T,>(items: T[]): T[] => {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
};

// 为一轮复习词构建题目：每题展示释义/例句，提供 4 个英文选项。
export const buildQuestions = (words: ReviewWord[], distractorPool: string[]): ReviewQuestion[] => {
    return words.map(word => {
        const distractors = pickDistractors(word.word, distractorPool, 3);
        const options = shuffle([word.word, ...distractors]);
        return { word, options };
    });
};

// 判分：选项是否等于正确单词。
export const checkAnswer = (question: ReviewQuestion, selectedWord: string): boolean => {
    return selectedWord === question.word.word;
};

// 复习间隔推算，与后端规则保持一致（用于前端展示/预测）。
export const computeNextInterval = (currentInterval: number, isCorrect: boolean): number => {
    if (!isCorrect) return 1; // 答错重置为当天
    return Math.min(currentInterval * 2, MAX_INTERVAL_DAYS);
};

// 依据每题作答记录汇总结算数据与错题列表。
export const summarizeRound = (
    questions: ReviewQuestion[],
    answers: Array<{ selectedWord: string; isCorrect: boolean }>
): ReviewSummary => {
    const wrongItems: WrongItem[] = [];
    let correctCount = 0;

    answers.forEach((answer, index) => {
        if (answer.isCorrect) {
            correctCount += 1;
        } else {
            const question = questions[index];
            if (question) {
                wrongItems.push({
                    word: question.word.word,
                    definition: question.word.definition,
                    pronunciation: question.word.pronunciation,
                    selectedWord: answer.selectedWord
                });
            }
        }
    });

    const total = answers.length;
    return {
        total,
        correctCount,
        wrongCount: total - correctCount,
        accuracy: total > 0 ? Math.round((correctCount / total) * 100) : 0,
        wrongItems
    };
};
