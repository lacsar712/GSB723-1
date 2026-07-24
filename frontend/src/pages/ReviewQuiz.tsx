import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Volume2,
    X,
    CheckCircle2,
    XCircle,
    Trophy,
    RotateCcw,
    BrainCircuit,
    ChevronRight,
} from 'lucide-react';
import { useReviewQuiz } from '../reviewQuizLogic';

interface ReviewQuizProps {
    onClose: () => void;
    onFinished?: () => void;
}

const ReviewQuiz: React.FC<ReviewQuizProps> = ({ onClose, onFinished }) => {
    const quiz = useReviewQuiz();
    const {
        phase,
        questions,
        currentIndex,
        currentQuestion,
        selectedOption,
        lastResult,
        results,
        correctCount,
        wrongCount,
        progress,
        error,
        startQuiz,
        submitAnswer,
        reset,
        playPronunciation,
    } = quiz;

    useEffect(() => {
        startQuiz(5);
    }, [startQuiz]);

    useEffect(() => {
        if (phase === 'finished' && onFinished) {
            onFinished();
        }
    }, [phase, onFinished]);

    const handleClose = () => {
        reset();
        onClose();
    };

    const handleRetry = () => {
        startQuiz(5);
    };

    const getOptionClass = (option: string) => {
        if (selectedOption === null) {
            return 'bg-slate-800/60 border-slate-700 hover:bg-slate-700/80 hover:border-primary/50 text-slate-100 cursor-pointer';
        }
        if (option === currentQuestion?.word) {
            return 'bg-emerald-500/20 border-emerald-400 text-emerald-100';
        }
        if (option === selectedOption && !lastResult?.isCorrect) {
            return 'bg-red-500/20 border-red-400 text-red-100';
        }
        return 'bg-slate-800/30 border-slate-700/50 text-slate-500';
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={handleClose}
        >
            <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="glass-panel bg-slate-900/95 w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl relative"
                onClick={e => e.stopPropagation()}
            >
                <button
                    onClick={handleClose}
                    className="absolute top-4 right-4 z-10 p-2 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
                >
                    <X size={20} />
                </button>

                {phase === 'loading' && (
                    <div className="p-16 text-center">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/20 mb-6 animate-pulse">
                            <BrainCircuit size={32} className="text-primary" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">正在生成复习题目</h3>
                        <p className="text-slate-400">根据间隔记忆算法挑选最需要复习的单词...</p>
                    </div>
                )}

                {phase === 'playing' && currentQuestion && (
                    <div className="p-6 md:p-10">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <span className="text-sm font-bold text-slate-400">
                                    {currentIndex + 1} / {questions.length}
                                </span>
                                <div className="flex gap-1">
                                    {questions.map((_, i) => (
                                        <div
                                            key={i}
                                            className={`h-1.5 rounded-full transition-all duration-300 ${
                                                i < currentIndex
                                                    ? 'w-6 bg-primary'
                                                    : i === currentIndex
                                                    ? 'w-8 bg-primary'
                                                    : 'w-3 bg-slate-700'
                                            }`}
                                        />
                                    ))}
                                </div>
                            </div>
                            <div className="flex items-center gap-3 text-sm">
                                <span className="text-emerald-400 font-semibold">✓ {correctCount}</span>
                                <span className="text-red-400 font-semibold">✗ {wrongCount}</span>
                            </div>
                        </div>

                        <div className="h-1.5 w-full bg-slate-800 rounded-full mb-8 overflow-hidden">
                            <motion.div
                                className="h-full bg-gradient-to-r from-primary to-secondary rounded-full"
                                initial={false}
                                animate={{ width: `${progress}%` }}
                                transition={{ duration: 0.4 }}
                            />
                        </div>

                        <motion.div
                            key={currentQuestion.wordId}
                            initial={{ opacity: 0, x: 30 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -30 }}
                            transition={{ duration: 0.3 }}
                        >
                            <div className="text-center mb-8">
                                <div className="flex items-center justify-center gap-3 mb-4">
                                    <button
                                        onClick={() => playPronunciation(currentQuestion.word)}
                                        className="p-2 rounded-full bg-slate-800 hover:bg-primary/20 text-slate-400 hover:text-primary transition cursor-pointer"
                                        title="播放发音"
                                    >
                                        <Volume2 size={22} />
                                    </button>
                                    <span className="text-lg font-mono text-primary">{currentQuestion.pronunciation}</span>
                                </div>
                                <p className="text-sm text-slate-500 uppercase tracking-widest mb-2">{currentQuestion.pos}</p>
                                <h2 className="text-3xl md:text-4xl font-bold text-slate-100 mb-4 leading-relaxed">
                                    {currentQuestion.definition}
                                </h2>
                                <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-700/50 max-w-lg mx-auto">
                                    <p className="text-indigo-200/80 italic text-base">
                                        "{currentQuestion.example.replace(
                                            new RegExp('\\b' + currentQuestion.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'gi'),
                                            '_____'
                                        )}"
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {currentQuestion.options.map((option, idx) => (
                                    <motion.button
                                        key={option}
                                        whileHover={selectedOption === null ? { scale: 1.02 } : {}}
                                        whileTap={selectedOption === null ? { scale: 0.98 } : {}}
                                        onClick={() => submitAnswer(option)}
                                        disabled={selectedOption !== null}
                                        className={`p-4 rounded-xl border-2 text-left font-semibold text-lg transition-all duration-200 flex items-center gap-3 ${getOptionClass(option)}`}
                                    >
                                        <span className="w-7 h-7 rounded-full bg-slate-700/50 flex items-center justify-center text-sm font-bold flex-shrink-0">
                                            {String.fromCharCode(65 + idx)}
                                        </span>
                                        <span>{option}</span>
                                        {selectedOption !== null && option === currentQuestion.word && (
                                            <CheckCircle2 size={20} className="ml-auto text-emerald-400" />
                                        )}
                                        {selectedOption !== null && option === selectedOption && !lastResult?.isCorrect && (
                                            <XCircle size={20} className="ml-auto text-red-400" />
                                        )}
                                    </motion.button>
                                ))}
                            </div>

                            <AnimatePresence>
                                {lastResult && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0 }}
                                        className={`mt-6 p-4 rounded-xl flex items-center gap-3 ${
                                            lastResult.isCorrect
                                                ? 'bg-emerald-500/10 border border-emerald-500/30'
                                                : 'bg-red-500/10 border border-red-500/30'
                                        }`}
                                    >
                                        {lastResult.isCorrect ? (
                                            <>
                                                <CheckCircle2 size={24} className="text-emerald-400 flex-shrink-0" />
                                                <div>
                                                    <p className="font-bold text-emerald-300">回答正确！</p>
                                                    <p className="text-sm text-emerald-300/70">
                                                        下次复习将在 {lastResult.intervalDays} 天后
                                                    </p>
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <XCircle size={24} className="text-red-400 flex-shrink-0" />
                                                <div>
                                                    <p className="font-bold text-red-300">
                                                        回答错误，正确答案是 <span className="underline">{lastResult.correctWord}</span>
                                                    </p>
                                                    <p className="text-sm text-red-300/70">该词已加入优先复习队列</p>
                                                </div>
                                            </>
                                        )}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    </div>
                )}

                {phase === 'finished' && results && (
                    <div className="p-6 md:p-10">
                        {results.total === 0 ? (
                            <div className="text-center py-12">
                                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-slate-800 mb-6">
                                    <BrainCircuit size={40} className="text-slate-500" />
                                </div>
                                <h2 className="text-2xl font-bold text-white mb-3">暂无可复习的单词</h2>
                                <p className="text-slate-400 mb-8 max-w-md mx-auto">
                                    你还没有已掌握的单词，或者所有单词都还未到复习时间。先去学习一些新单词吧！
                                </p>
                                <button
                                    onClick={handleClose}
                                    className="btn-primary px-8 py-3 inline-flex items-center gap-2 cursor-pointer"
                                >
                                    返回仪表盘
                                    <ChevronRight size={18} />
                                </button>
                            </div>
                        ) : (
                            <>
                                <div className="text-center mb-8">
                                    <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        transition={{ type: 'spring', delay: 0.1 }}
                                        className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-primary to-secondary mb-4"
                                    >
                                        <Trophy size={36} className="text-white" />
                                    </motion.div>
                                    <h2 className="text-2xl font-bold text-white mb-2">本轮复习完成！</h2>
                                    <p className="text-slate-400">来看看你的表现吧</p>
                                </div>

                                <div className="grid grid-cols-3 gap-3 mb-8">
                                    <div className="bg-slate-800/60 p-5 rounded-xl text-center border border-slate-700/50">
                                        <p className="text-3xl font-bold text-primary mb-1">{results.accuracy}%</p>
                                        <p className="text-xs text-slate-400 uppercase tracking-wider">正确率</p>
                                    </div>
                                    <div className="bg-emerald-500/10 p-5 rounded-xl text-center border border-emerald-500/20">
                                        <p className="text-3xl font-bold text-emerald-400 mb-1">{results.correct}</p>
                                        <p className="text-xs text-slate-400 uppercase tracking-wider">答对</p>
                                    </div>
                                    <div className="bg-red-500/10 p-5 rounded-xl text-center border border-red-500/20">
                                        <p className="text-3xl font-bold text-red-400 mb-1">{results.wrong}</p>
                                        <p className="text-xs text-slate-400 uppercase tracking-wider">答错</p>
                                    </div>
                                </div>

                                {results.wrongAnswers.length > 0 && (
                                    <div className="mb-8">
                                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">
                                            错题回顾 ({results.wrongAnswers.length})
                                        </h3>
                                        <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                                            {results.wrongAnswers.map((w, i) => (
                                                <motion.div
                                                    key={w.wordId}
                                                    initial={{ opacity: 0, x: -10 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    transition={{ delay: i * 0.05 }}
                                                    className="p-4 bg-slate-800/60 rounded-xl border border-slate-700/50"
                                                >
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <h4 className="text-lg font-bold text-white">{w.word}</h4>
                                                                <button
                                                                    onClick={() => playPronunciation(w.word)}
                                                                    className="p-1 rounded-full hover:bg-slate-700 text-slate-400 hover:text-primary transition cursor-pointer"
                                                                    title="播放发音"
                                                                >
                                                                    <Volume2 size={16} />
                                                                </button>
                                                                <span className="text-xs text-slate-500">{w.pronunciation}</span>
                                                            </div>
                                                            <p className="text-sm text-slate-300 mb-1">{w.definition}</p>
                                                            <p className="text-xs text-red-400">
                                                                你选了: <span className="line-through">{w.selectedOption}</span>
                                                            </p>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="flex gap-3">
                                    <button
                                        onClick={handleRetry}
                                        className="btn-secondary flex-1 flex items-center justify-center gap-2 py-3 cursor-pointer"
                                    >
                                        <RotateCcw size={18} />
                                        再来一轮
                                    </button>
                                    <button
                                        onClick={handleClose}
                                        className="btn-primary flex-1 flex items-center justify-center gap-2 py-3 cursor-pointer"
                                    >
                                        完成
                                        <ChevronRight size={18} />
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                )}

                {error && (
                    <div className="p-6 md:p-10 text-center">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-500/20 mb-4">
                            <XCircle size={32} className="text-red-400" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">出错了</h3>
                        <p className="text-slate-400 mb-6">{error}</p>
                        <div className="flex gap-3 justify-center">
                            <button onClick={handleRetry} className="btn-primary px-6 py-2 cursor-pointer">重试</button>
                            <button onClick={handleClose} className="btn-secondary px-6 py-2 cursor-pointer">关闭</button>
                        </div>
                    </div>
                )}
            </motion.div>
        </motion.div>
    );
};

export default ReviewQuiz;
