import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { Volume2, CheckCircle, XCircle, ArrowRight, RotateCcw, Home } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    DEFAULT_ROUND_SIZE,
    buildQuestions,
    checkAnswer,
    summarizeRound,
} from './reviewLogic';
import type { ReviewQuestion, ReviewSummary } from './reviewLogic';

type QuizPhase = 'loading' | 'empty' | 'quiz' | 'result';

interface AnswerRecord {
    selectedWord: string;
    isCorrect: boolean;
}

const ReviewQuiz: React.FC = () => {
    const navigate = useNavigate();
    const [phase, setPhase] = useState<QuizPhase>('loading');
    const [questions, setQuestions] = useState<ReviewQuestion[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState<AnswerRecord[]>([]);
    const [selectedWord, setSelectedWord] = useState<string | null>(null);
    const [summary, setSummary] = useState<ReviewSummary | null>(null);

    const loadSession = async () => {
        setPhase('loading');
        setQuestions([]);
        setCurrentIndex(0);
        setAnswers([]);
        setSelectedWord(null);
        setSummary(null);
        try {
            const res = await api.get('/review/session', { params: { size: DEFAULT_ROUND_SIZE } });
            const built = buildQuestions(res.data.words, res.data.distractorPool);
            if (built.length === 0) {
                setPhase('empty');
                return;
            }
            setQuestions(built);
            setPhase('quiz');
        } catch (e) {
            console.error(e);
            setPhase('empty');
        }
    };

    useEffect(() => {
        loadSession();
    }, []);

    const playAudio = (text: string) => {
        const utter = new SpeechSynthesisUtterance(text);
        window.speechSynthesis.speak(utter);
    };

    const currentQuestion = questions[currentIndex];

    const handleSelect = async (option: string) => {
        if (selectedWord || !currentQuestion) return; // 已作答，忽略重复点击

        const isCorrect = checkAnswer(currentQuestion, option);
        setSelectedWord(option);

        const record: AnswerRecord = { selectedWord: option, isCorrect };
        const nextAnswers = [...answers, record];
        setAnswers(nextAnswers);

        // 记录作答结果并更新复习调度
        try {
            await api.post('/review/answer', {
                word_id: currentQuestion.word.id,
                is_correct: isCorrect,
                selected_word: option,
            });
        } catch (e) {
            console.error(e);
        }

        // 即时反馈后自动进入下一题
        setTimeout(() => {
            if (currentIndex + 1 >= questions.length) {
                setSummary(summarizeRound(questions, nextAnswers));
                setPhase('result');
            } else {
                setCurrentIndex(currentIndex + 1);
                setSelectedWord(null);
            }
        }, 1000);
    };

    const progress = useMemo(
        () => (questions.length > 0 ? (currentIndex / questions.length) * 100 : 0),
        [currentIndex, questions.length]
    );

    if (phase === 'loading') {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-primary text-xl font-bold animate-pulse">复习加载中...</div>
            </div>
        );
    }

    if (phase === 'empty') {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen p-6">
                <div className="glass-panel p-10 rounded-2xl text-center max-w-lg w-full">
                    <h2 className="text-3xl font-bold text-white mb-4">暂无需要复习的单词</h2>
                    <p className="text-slate-400 mb-8">先去掌握一些单词，稍后它们会自动进入复习队列。</p>
                    <button onClick={() => navigate('/')} className="btn-primary w-full flex items-center justify-center gap-2">
                        <Home size={20} /> 返回主页
                    </button>
                </div>
            </div>
        );
    }

    if (phase === 'result' && summary) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen p-6">
                <div className="glass-panel p-8 md:p-10 rounded-2xl max-w-lg w-full animate-fade-in-up">
                    <h2 className="text-4xl font-bold mb-6 text-center bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">
                        复习完成！
                    </h2>

                    <div className="grid grid-cols-3 gap-4 mb-8 text-center">
                        <div className="bg-slate-800/50 p-4 rounded-xl">
                            <div className="text-slate-400 text-sm">正确率</div>
                            <div className="text-2xl font-bold text-emerald-400">{summary.accuracy}%</div>
                        </div>
                        <div className="bg-slate-800/50 p-4 rounded-xl">
                            <div className="text-slate-400 text-sm">答对</div>
                            <div className="text-2xl font-bold text-primary">{summary.correctCount}</div>
                        </div>
                        <div className="bg-slate-800/50 p-4 rounded-xl">
                            <div className="text-slate-400 text-sm">答错</div>
                            <div className="text-2xl font-bold text-red-400">{summary.wrongCount}</div>
                        </div>
                    </div>

                    <div className="mb-8">
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <XCircle size={20} className="text-red-400" /> 错题列表
                        </h3>
                        {summary.wrongItems.length > 0 ? (
                            <div className="space-y-3 max-h-64 overflow-y-auto">
                                {summary.wrongItems.map((item, i) => (
                                    <div key={i} className="p-4 bg-slate-800 rounded-lg border border-slate-700">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h4 className="text-lg font-bold text-white">{item.word}</h4>
                                                <p className="text-primary text-sm">{item.pronunciation}</p>
                                            </div>
                                            <button onClick={() => playAudio(item.word)} className="text-slate-400 hover:text-primary" title="发音">
                                                <Volume2 size={18} />
                                            </button>
                                        </div>
                                        <p className="text-slate-300 mt-2 text-sm">释义：{item.definition}</p>
                                        <p className="text-red-400 mt-1 text-sm">你的错选：{item.selectedWord}</p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center text-emerald-400 py-6">全部答对，太棒了！</div>
                        )}
                    </div>

                    <div className="flex gap-4">
                        <button onClick={loadSession} className="btn-primary flex-1 flex items-center justify-center gap-2">
                            <RotateCcw size={20} /> 再来一轮
                        </button>
                        <button onClick={() => navigate('/')} className="btn-secondary px-6 flex items-center justify-center gap-2">
                            <Home size={20} /> 返回主页
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (!currentQuestion) return null;

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-900">
            {/* Progress Bar */}
            <div className="fixed top-0 left-0 w-full h-2 bg-slate-800">
                <div className="h-full bg-primary transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>

            <div className="w-full max-w-2xl">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentQuestion.word.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="glass-panel p-8 md:p-12 rounded-3xl w-full shadow-2xl"
                    >
                        <div className="flex items-center justify-between mb-8">
                            <span className="text-slate-400 text-sm font-semibold tracking-wider uppercase">
                                复习 {currentIndex + 1} / {questions.length}
                            </span>
                            <button
                                onClick={() => playAudio(currentQuestion.word.word)}
                                className="text-primary hover:text-indigo-400 transition flex items-center gap-1"
                                title="发音"
                            >
                                <Volume2 size={22} />
                            </button>
                        </div>

                        <div className="mb-8 text-center">
                            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-2">释义</h3>
                            <p className="text-3xl text-white font-light mb-6">{currentQuestion.word.definition}</p>
                            <div className="bg-slate-800/50 p-5 rounded-xl border border-slate-700/50">
                                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">例句</h3>
                                <p className="text-lg text-indigo-200 italic font-serif">"{currentQuestion.word.example}"</p>
                            </div>
                        </div>

                        <p className="text-slate-300 text-center mb-4">选出正确的英文单词：</p>
                        <div className="grid grid-cols-2 gap-4">
                            {currentQuestion.options.map(option => {
                                const isAnswered = selectedWord !== null;
                                const isThisSelected = selectedWord === option;
                                const isTheCorrect = option === currentQuestion.word.word;

                                let stateClass = 'btn-secondary hover:border-primary';
                                if (isAnswered) {
                                    if (isTheCorrect) {
                                        stateClass = 'bg-emerald-500/20 border-emerald-500 text-emerald-300';
                                    } else if (isThisSelected) {
                                        stateClass = 'bg-red-500/20 border-red-500 text-red-300';
                                    } else {
                                        stateClass = 'btn-secondary opacity-50';
                                    }
                                }

                                return (
                                    <button
                                        key={option}
                                        onClick={() => handleSelect(option)}
                                        disabled={isAnswered}
                                        className={`py-4 px-4 rounded-xl border text-lg font-semibold transition flex items-center justify-center gap-2 ${stateClass}`}
                                    >
                                        {isAnswered && isTheCorrect && <CheckCircle size={18} />}
                                        {isAnswered && isThisSelected && !isTheCorrect && <XCircle size={18} />}
                                        {option}
                                    </button>
                                );
                            })}
                        </div>

                        <AnimatePresence>
                            {selectedWord && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0 }}
                                    className="mt-6 text-center flex items-center justify-center gap-2"
                                >
                                    {selectedWord === currentQuestion.word.word ? (
                                        <span className="text-emerald-400 font-bold flex items-center gap-2">
                                            <CheckCircle size={20} /> 回答正确！
                                        </span>
                                    ) : (
                                        <span className="text-red-400 font-bold flex items-center gap-2">
                                            <XCircle size={20} /> 正确答案：{currentQuestion.word.word}
                                        </span>
                                    )}
                                    <ArrowRight size={18} className="text-slate-500 animate-pulse" />
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
};

export default ReviewQuiz;
