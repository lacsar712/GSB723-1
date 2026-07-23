import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { X, HelpCircle, ArrowRight, TrendingUp, TrendingDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Word {
    id: number;
    word: string;
    definition: string;
    rank: number;
    difficulty_level: number;
}

interface Answer {
    wordId: number;
    rank: number;
    isCorrect: boolean;
}

interface TestResult {
    vocab_size: number;
    correct_count: number;
    total_questions: number;
    accuracy: number;
}

const TOTAL_QUESTIONS = 15;
const INITIAL_ABILITY = 3000;
const ABILITY_ADJUSTMENT_CORRECT = 800;
const ABILITY_ADJUSTMENT_WRONG = 600;

const VocabularyTest: React.FC = () => {
    const [allWords, setAllWords] = useState<Word[]>([]);
    const [currentWord, setCurrentWord] = useState<Word | null>(null);
    const [currentAbility, setCurrentAbility] = useState(INITIAL_ABILITY);
    const [answers, setAnswers] = useState<Answer[]>([]);
    const [showDefinition, setShowDefinition] = useState(false);
    const [loading, setLoading] = useState(true);
    const [completed, setCompleted] = useState(false);
    const [result, setResult] = useState<TestResult | null>(null);
    const [abilityTrend, setAbilityTrend] = useState<'up' | 'down' | null>(null);
    const navigate = useNavigate();

    useEffect(() => {
        api.get('/test/words').then(res => {
            setAllWords(res.data);
            setLoading(false);
        }).catch(err => {
            console.error(err);
            setLoading(false);
        });
    }, []);

    const selectNextWord = useCallback((ability: number, answeredIds: number[]) => {
        const availableWords = allWords.filter(w => !answeredIds.includes(w.id));
        if (availableWords.length === 0) return null;

        // Find word closest to current ability estimate
        const sortedByDistance = availableWords
            .map(w => ({ ...w, distance: Math.abs(w.rank - ability) }))
            .sort((a, b) => a.distance - b.distance);

        // Add some randomness among close candidates
        const candidates = sortedByDistance.slice(0, Math.min(3, sortedByDistance.length));
        return candidates[Math.floor(Math.random() * candidates.length)];
    }, [allWords]);

    useEffect(() => {
        if (allWords.length > 0 && !currentWord && answers.length < TOTAL_QUESTIONS) {
            const answeredIds = answers.map(a => a.wordId);
            const nextWord = selectNextWord(currentAbility, answeredIds);
            setCurrentWord(nextWord);
        }
    }, [allWords, currentWord, answers, currentAbility, selectNextWord]);

    const handleAnswer = async (correct: boolean) => {
        if (!currentWord) return;

        const newAnswer: Answer = {
            wordId: currentWord.id,
            rank: currentWord.rank,
            isCorrect: correct
        };

        const newAnswers = [...answers, newAnswer];
        setAnswers(newAnswers);

        // Adaptive ability adjustment
        let newAbility: number;
        if (correct) {
            newAbility = currentAbility + ABILITY_ADJUSTMENT_CORRECT;
            setAbilityTrend('up');
        } else {
            newAbility = Math.max(100, currentAbility - ABILITY_ADJUSTMENT_WRONG);
            setAbilityTrend('down');
        }
        setCurrentAbility(newAbility);

        // Clear trend indicator after animation
        setTimeout(() => setAbilityTrend(null), 500);

        if (newAnswers.length >= TOTAL_QUESTIONS) {
            await finishTest(newAnswers);
        } else {
            setShowDefinition(false);
            setCurrentWord(null);
        }
    };

    const finishTest = async (finalAnswers: Answer[]) => {
        setLoading(true);
        try {
            const res = await api.post('/test/submit', { answers: finalAnswers });
            setResult(res.data);
            setCompleted(true);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-primary text-xl font-bold animate-pulse">
                    测试加载中...
                </div>
            </div>
        );
    }

    if (completed && result) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen p-6">
                <div className="glass-panel p-10 rounded-2xl text-center max-w-lg w-full animate-fade-in-up">
                    <h2 className="text-4xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">
                        测试完成！
                    </h2>
                    <p className="text-slate-300 text-lg mb-4">您的预估词汇量为:</p>
                    <div className="text-6xl font-extrabold text-white mb-4 drop-shadow-lg">
                        {result.vocab_size}
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-8 text-sm">
                        <div className="bg-slate-800/50 p-4 rounded-xl">
                            <div className="text-slate-400">正确率</div>
                            <div className="text-2xl font-bold text-emerald-400">{result.accuracy}%</div>
                        </div>
                        <div className="bg-slate-800/50 p-4 rounded-xl">
                            <div className="text-slate-400">答对题数</div>
                            <div className="text-2xl font-bold text-primary">
                                {result.correct_count}/{result.total_questions}
                            </div>
                        </div>
                    </div>

                    <p className="text-slate-400 mb-8">准备好扩展您的词库了吗？</p>
                    <button
                        onClick={() => navigate('/')}
                        className="btn-primary w-full flex items-center justify-center gap-2"
                    >
                        开始学习 <ArrowRight size={20} />
                    </button>
                </div>
            </div>
        );
    }

    if (!currentWord) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-primary text-xl font-bold animate-pulse">
                    准备下一题...
                </div>
            </div>
        );
    }

    const progress = (answers.length / TOTAL_QUESTIONS) * 100;
    const correctCount = answers.filter(a => a.isCorrect).length;

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-900">
            {/* Progress Bar */}
            <div className="fixed top-0 left-0 w-full h-2 bg-slate-800">
                <div
                    className="h-full bg-primary transition-all duration-500"
                    style={{ width: `${progress}%` }}
                />
            </div>

            {/* Ability Trend Indicator */}
            <AnimatePresence>
                {abilityTrend && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className={`fixed top-8 right-8 flex items-center gap-2 px-4 py-2 rounded-full ${
                            abilityTrend === 'up'
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : 'bg-red-500/20 text-red-400'
                        }`}
                    >
                        {abilityTrend === 'up' ? (
                            <>
                                <TrendingUp size={20} />
                                <span>难度提升</span>
                            </>
                        ) : (
                            <>
                                <TrendingDown size={20} />
                                <span>难度降低</span>
                            </>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="w-full max-w-2xl relative">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentWord.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="glass-panel p-8 md:p-12 rounded-3xl w-full min-h-[400px] flex flex-col items-center justify-center text-center shadow-2xl"
                    >
                        <div className="flex items-center gap-4 mb-4">
                            <span className="text-slate-400 text-sm font-semibold tracking-wider uppercase">
                                单词 {answers.length + 1} / {TOTAL_QUESTIONS}
                            </span>
                            <span className="text-emerald-400 text-sm">
                                已对 {correctCount} 题
                            </span>
                        </div>

                        <h2 className="text-5xl md:text-6xl font-bold text-white mb-12">
                            {currentWord.word}
                        </h2>

                        {!showDefinition ? (
                            <div className="space-y-6 w-full max-w-md">
                                <p className="text-slate-300 mb-8">您认识这个单词吗？</p>
                                <div className="grid grid-cols-2 gap-4">
                                    <button
                                        onClick={() => handleAnswer(false)}
                                        className="btn-secondary flex flex-col items-center py-6 hover:bg-red-500/10 hover:border-red-500 hover:text-red-400"
                                    >
                                        <X size={32} className="mb-2" />
                                        不认识
                                    </button>
                                    <button
                                        onClick={() => setShowDefinition(true)}
                                        className="btn-secondary flex flex-col items-center py-6 hover:bg-emerald-500/10 hover:border-emerald-500 hover:text-emerald-400"
                                    >
                                        <HelpCircle size={32} className="mb-2" />
                                        有点印象
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="w-full animate-fade-in-up">
                                <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700 mb-8">
                                    <h3 className="text-lg font-semibold text-primary mb-2">释义</h3>
                                    <p className="text-xl text-slate-200">{currentWord.definition}</p>
                                </div>
                                <p className="text-slate-300 mb-6">您刚才想对了吗？</p>
                                <div className="grid grid-cols-2 gap-4">
                                    <button
                                        onClick={() => handleAnswer(false)}
                                        className="btn-secondary bg-red-500/10 border-red-500/50 text-red-400 hover:bg-red-500/20"
                                    >
                                        想错了
                                    </button>
                                    <button
                                        onClick={() => handleAnswer(true)}
                                        className="btn-primary bg-emerald-600 hover:bg-emerald-500"
                                    >
                                        对了
                                    </button>
                                </div>
                            </div>
                        )}
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
};

export default VocabularyTest;
