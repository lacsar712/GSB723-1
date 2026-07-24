import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2, X, CheckCircle, XCircle, ArrowRight, RotateCcw, BookOpen, Target, Award } from 'lucide-react';
import type { QuizState } from '../reviewLogic';
import {
    initialQuizState,
    fetchQuizQuestions,
    checkAnswer,
    buildAnswerRecord,
    submitQuizResults,
    playWordAudio,
    getCurrentQuestion,
    isLastQuestion,
    getProgress
} from '../reviewLogic';

interface ReviewQuizProps {
    onClose: () => void;
}

const ReviewQuiz: React.FC<ReviewQuizProps> = ({ onClose }) => {
    const [state, setState] = useState<QuizState>(initialQuizState);

    const startQuiz = useCallback(async () => {
        setState(prev => ({ ...prev, phase: 'loading', error: null }));
        try {
            const { questions, hasWords } = await fetchQuizQuestions(5);
            if (!hasWords || questions.length === 0) {
                setState(prev => ({ ...prev, phase: 'idle', hasWords: false }));
                return;
            }
            setState(prev => ({
                ...prev,
                phase: 'question',
                questions,
                currentIndex: 0,
                answers: [],
                selectedOption: null,
                showFeedback: false,
                result: null,
                hasWords: true
            }));
        } catch (err) {
            setState(prev => ({ ...prev, phase: 'idle', error: '加载题目失败，请重试' }));
        }
    }, []);

    useEffect(() => {
        startQuiz();
    }, [startQuiz]);

    const handleSelectOption = (option: string) => {
        if (state.phase !== 'question') return;

        const currentQ = getCurrentQuestion(state);
        if (!currentQ) return;

        const isCorrect = checkAnswer(currentQ, option);
        const answerRecord = buildAnswerRecord(currentQ, option, isCorrect);

        setState(prev => ({
            ...prev,
            selectedOption: option,
            showFeedback: true,
            phase: 'feedback',
            answers: [...prev.answers, answerRecord]
        }));

        setTimeout(() => {
            if (isLastQuestion(state)) {
                finishQuiz([...state.answers, answerRecord]);
            } else {
                setState(prev => ({
                    ...prev,
                    phase: 'question',
                    currentIndex: prev.currentIndex + 1,
                    selectedOption: null,
                    showFeedback: false
                }));
            }
        }, 1200);
    };

    const finishQuiz = async (finalAnswers: typeof state.answers) => {
        setState(prev => ({ ...prev, phase: 'loading' }));
        try {
            const result = await submitQuizResults(finalAnswers);
            setState(prev => ({
                ...prev,
                phase: 'result',
                result
            }));
        } catch (err) {
            setState(prev => ({ ...prev, phase: 'idle', error: '提交结果失败，请重试' }));
        }
    };

    const currentQ = getCurrentQuestion(state);
    const progress = getProgress(state);

    const renderIdle = () => (
        <div className="text-center py-8">
            {state.error ? (
                <>
                    <p className="text-red-400 mb-4">{state.error}</p>
                    <button onClick={startQuiz} className="btn-primary px-6 py-3">
                        重试
                    </button>
                </>
            ) : !state.hasWords ? (
                <>
                    <BookOpen size={64} className="mx-auto text-slate-500 mb-4" />
                    <h3 className="text-xl font-bold text-white mb-2">暂无已掌握单词</h3>
                    <p className="text-slate-400 mb-6">先去学习一些单词，标记为「已掌握」后即可开始复习自测。</p>
                    <button onClick={onClose} className="btn-primary px-6 py-3">
                        返回仪表盘
                    </button>
                </>
            ) : null}
        </div>
    );

    const renderLoading = () => (
        <div className="text-center py-16">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-slate-400">
                {state.phase === 'loading' && state.result === null ? '正在加载复习题目...' : '正在提交结果...'}
            </p>
        </div>
    );

    const renderQuestion = () => {
        if (!currentQ) return null;
        const showFeedback = state.phase === 'feedback';

        return (
            <motion.div
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                key={state.currentIndex}
            >
                <div className="mb-6">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-slate-400">
                            第 {progress.current} / {progress.total} 题
                        </span>
                        <div className="flex gap-1">
                            {state.questions.map((_, i) => (
                                <div
                                    key={i}
                                    className={`w-2 h-2 rounded-full transition-colors ${
                                        i < state.currentIndex
                                            ? 'bg-emerald-400'
                                            : i === state.currentIndex
                                            ? 'bg-primary'
                                            : 'bg-slate-600'
                                    }`}
                                />
                            ))}
                        </div>
                    </div>
                    <div className="w-full bg-slate-700 rounded-full h-1.5">
                        <div
                            className="bg-gradient-to-r from-primary to-accent h-1.5 rounded-full transition-all duration-300"
                            style={{ width: `${(progress.current / progress.total) * 100}%` }}
                        />
                    </div>
                </div>

                <div className="mb-8">
                    <div className="flex items-start justify-between mb-4">
                        <div>
                            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-2">中文释义</h3>
                            <p className="text-3xl text-white font-light leading-relaxed">{currentQ.definition}</p>
                        </div>
                        <button
                            onClick={() => playWordAudio(currentQ.word)}
                            className="p-3 rounded-full bg-slate-800 hover:bg-slate-700 text-primary transition cursor-pointer"
                            title="听发音"
                        >
                            <Volume2 size={24} />
                        </button>
                    </div>

                    <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">例句</h3>
                        <p className="text-lg text-indigo-200 italic font-serif">"{currentQ.example}"</p>
                    </div>
                </div>

                <div className="space-y-3">
                    <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-3">请选择正确的英文单词</h3>
                    {currentQ.options.map((option, idx) => {
                        let optionStyle = 'bg-slate-800/50 border-slate-700 hover:bg-slate-700/50 hover:border-primary/50';

                        if (showFeedback) {
                            if (option === currentQ.word) {
                                optionStyle = 'bg-emerald-500/20 border-emerald-500 text-emerald-400';
                            } else if (option === state.selectedOption && !checkAnswer(currentQ, option)) {
                                optionStyle = 'bg-red-500/20 border-red-500 text-red-400';
                            } else {
                                optionStyle = 'bg-slate-800/30 border-slate-700/50 opacity-50';
                            }
                        }

                        return (
                            <motion.button
                                key={idx}
                                onClick={() => handleSelectOption(option)}
                                disabled={showFeedback}
                                whileHover={!showFeedback ? { scale: 1.02 } : {}}
                                whileTap={!showFeedback ? { scale: 0.98 } : {}}
                                className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200 flex items-center gap-4 group ${optionStyle} ${
                                    showFeedback ? 'cursor-default' : 'cursor-pointer'
                                }`}
                            >
                                <span className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-sm font-bold text-slate-300 group-hover:bg-primary/20 group-hover:text-primary transition-colors">
                                    {String.fromCharCode(65 + idx)}
                                </span>
                                <span className="text-xl font-mono flex-1">{option}</span>
                                {showFeedback && option === currentQ.word && (
                                    <CheckCircle size={24} className="text-emerald-400" />
                                )}
                                {showFeedback && option === state.selectedOption && option !== currentQ.word && (
                                    <XCircle size={24} className="text-red-400" />
                                )}
                            </motion.button>
                        );
                    })}
                </div>
            </motion.div>
        );
    };

    const renderResult = () => {
        if (!state.result) return null;
        const { correct, incorrect, accuracy, wrongAnswers } = state.result;

        const getGrade = () => {
            if (accuracy >= 90) return { text: '太棒了！', color: 'text-emerald-400', icon: Award };
            if (accuracy >= 70) return { text: '做得不错！', color: 'text-primary', icon: Target };
            return { text: '继续加油！', color: 'text-amber-400', icon: BookOpen };
        };

        const grade = getGrade();
        const GradeIcon = grade.icon;

        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center"
            >
                <div className="mb-8">
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.2, type: 'spring' }}
                        className="w-20 h-20 mx-auto mb-4 rounded-full bg-slate-800 flex items-center justify-center"
                    >
                        <GradeIcon size={40} className={grade.color} />
                    </motion.div>
                    <h2 className="text-3xl font-bold text-white mb-2">{grade.text}</h2>
                    <p className="text-slate-400">本轮复习已完成</p>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-8">
                    <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
                        <p className="text-3xl font-bold text-white">{accuracy}%</p>
                        <p className="text-sm text-slate-400">正确率</p>
                    </div>
                    <div className="bg-emerald-500/10 p-4 rounded-xl border border-emerald-500/30">
                        <p className="text-3xl font-bold text-emerald-400">{correct}</p>
                        <p className="text-sm text-slate-400">答对</p>
                    </div>
                    <div className="bg-red-500/10 p-4 rounded-xl border border-red-500/30">
                        <p className="text-3xl font-bold text-red-400">{incorrect}</p>
                        <p className="text-sm text-slate-400">答错</p>
                    </div>
                </div>

                {wrongAnswers.length > 0 && (
                    <div className="mb-8 text-left">
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <XCircle size={20} className="text-red-400" />
                            错题列表
                        </h3>
                        <div className="space-y-3">
                            {wrongAnswers.map((item, idx) => (
                                <motion.div
                                    key={idx}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.3 + idx * 0.1 }}
                                    className="bg-slate-800/50 p-4 rounded-xl border border-red-500/20"
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-1">
                                                <span className="text-xl font-bold text-white">{item.word}</span>
                                                <span className="text-sm text-primary font-mono">{item.pronunciation}</span>
                                            </div>
                                            <p className="text-slate-300 text-sm">{item.definition}</p>
                                            <p className="text-red-400 text-sm mt-1">
                                                你选择了: <span className="line-through">{item.userAnswer}</span>
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => playWordAudio(item.word)}
                                            className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-400 hover:text-primary transition ml-3 cursor-pointer"
                                            title="听发音"
                                        >
                                            <Volume2 size={18} />
                                        </button>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="flex gap-4">
                    <button
                        onClick={startQuiz}
                        className="btn-primary flex-1 flex items-center justify-center gap-2 py-4 cursor-pointer"
                    >
                        <RotateCcw size={20} />
                        再来一轮
                    </button>
                    <button
                        onClick={onClose}
                        className="btn-secondary px-6 py-4 flex items-center gap-2 cursor-pointer"
                    >
                        <ArrowRight size={20} />
                        完成
                    </button>
                </div>
            </motion.div>
        );
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-panel bg-slate-900 p-6 md:p-8 rounded-3xl w-full max-w-xl max-h-[90vh] overflow-y-auto relative"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                        <Target size={28} className="text-primary" />
                        间隔复习自测
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
                    >
                        <X size={24} />
                    </button>
                </div>

                <AnimatePresence mode="wait">
                    {state.phase === 'loading' && (
                        <motion.div key="loading" exit={{ opacity: 0 }}>
                            {renderLoading()}
                        </motion.div>
                    )}
                    {state.phase === 'idle' && (
                        <motion.div key="idle" exit={{ opacity: 0 }}>
                            {renderIdle()}
                        </motion.div>
                    )}
                    {(state.phase === 'question' || state.phase === 'feedback') && (
                        <motion.div key="question" exit={{ opacity: 0 }}>
                            {renderQuestion()}
                        </motion.div>
                    )}
                    {state.phase === 'result' && (
                        <motion.div key="result" exit={{ opacity: 0 }}>
                            {renderResult()}
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </div>
    );
};

export default ReviewQuiz;
