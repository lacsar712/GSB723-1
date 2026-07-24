import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api, { reviewApi } from '../api';
import type { ReviewStats } from '../api';
import { CheckCircle, BarChart2, Book, Volume2, LogOut, RefreshCw, BrainCircuit, ListChecks } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import ReviewQuiz from './ReviewQuiz';

interface RecommendedWord {
    id: number;
    word: string;
    pronunciation: string;
    pos: string;
    definition: string;
    example: string;
    rank?: number;
    frequency?: number;
    difficulty_level?: number;
}

interface HistoryItem {
    id: number;
    word: string;
    pronunciation: string;
    definition: string;
    status: string;
}

const Dashboard: React.FC = () => {
    const { user, logout } = useAuth();
    const [word, setWord] = useState<RecommendedWord | null>(null);
    const [stats, setStats] = useState<any>([]);
    const [reviewStats, setReviewStats] = useState<ReviewStats>({ dueCount: 0, totalLearned: 0 });
    const [loading, setLoading] = useState(true);
    const [showWordList, setShowWordList] = useState(false);
    const [showQuiz, setShowQuiz] = useState(false);
    const navigate = useNavigate();

    const fetchRecommendation = async () => {
        try {
            const res = await api.get('/recommend');
            setWord(res.data);
        } catch (e) {
            console.error(e);
        }
    };

    const fetchStats = async () => {
        try {
            const res = await api.get('/stats');
            const history = res.data.history;
            setStats({
                chartData: history.map((_: any, i: number) => ({ name: `Day ${i + 1}`, words: i + 1 })),
                history: history
            });
        } catch (e) { console.error(e); }
    };

    const fetchReviewStats = useCallback(async () => {
        try {
            const data = await reviewApi.stats();
            setReviewStats(data);
        } catch (e) {
            console.error(e);
        }
    }, []);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const refreshData = () => {
        setLoading(true);
        Promise.all([fetchRecommendation(), fetchStats(), fetchReviewStats()]).then(() => setLoading(false));
    };

    useEffect(() => {
        refreshData();
    }, []);

    const handleLearn = async () => {
        if (!word) return;
        try {
            await api.post('/learn/record', { word_id: word.id, status: 'learned' });
            await fetchRecommendation();
            await fetchStats();
            await fetchReviewStats();
        } catch (e) { console.error(e); }
    };

    const handleSkip = async () => {
        if (!word) return;
        try {
            await api.post('/learn/record', { word_id: word.id, status: 'skipped' });
            await fetchRecommendation();
        } catch (e) { console.error(e); }
    };

    const playAudio = (text?: string) => {
        if (!('speechSynthesis' in window)) return;
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(text || word?.word || '');
        utter.lang = 'en-US';
        window.speechSynthesis.speak(utter);
    };

    const handleQuizFinish = useCallback(() => {
        fetchStats();
        fetchReviewStats();
        fetchRecommendation();
    }, [fetchReviewStats]);

    if (loading) return <div className="p-8 text-center text-white">加载主页中...</div>;

    return (
        <div className="min-h-screen bg-slate-900 p-4 md:p-8">
            <header className="flex justify-between items-center mb-8 max-w-6xl mx-auto">
                <div>
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">
                        你好, {user?.username}
                    </h1>
                    <p className="text-slate-400">当前词汇量: <span className="text-white font-bold">{user?.vocab_size}</span> 词</p>
                </div>
                <div className="flex items-center gap-4">
                    <button onClick={refreshData} title="刷新数据" className="p-2 rounded-full bg-slate-800 border border-slate-700 hover:bg-slate-700 transition cursor-pointer">
                        <RefreshCw size={20} className="text-primary" />
                    </button>
                    <button onClick={handleLogout} title="退出登录" className="p-2 rounded-full bg-slate-800 border border-slate-700 hover:bg-red-500/20 hover:text-red-400 hover:border-red-500 transition cursor-pointer">
                        <LogOut size={20} />
                    </button>
                </div>
            </header>

            <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                    {word && !('message' in word) ? (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="glass-panel p-8 md:p-12 rounded-3xl relative overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 p-4 bg-white/5 rounded-bl-2xl backdrop-blur-md">
                                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">每日推荐</span>
                                {word.frequency && (
                                    <div className="flex items-center gap-1 mt-1">
                                        <span className="text-xs text-slate-400">常用度:</span>
                                        <div className="flex gap-0.5">
                                            {[...Array(5)].map((_, i) => (
                                                <div
                                                    key={i}
                                                    className={`w-1.5 h-1.5 rounded-full ${
                                                        i < Math.ceil((word.frequency || 0) / 2)
                                                            ? 'bg-emerald-400'
                                                            : 'bg-slate-600'
                                                    }`}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="mb-8">
                                <div className="flex items-baseline gap-4 mb-2">
                                    <h2 className="text-6xl font-bold text-white tracking-tight">{word.word}</h2>
                                    <span className="text-2xl text-slate-400 italic font-serif">{word.pos}</span>
                                </div>
                                <div className="flex items-center gap-2 text-primary cursor-pointer hover:text-indigo-400 transition" onClick={() => playAudio()}>
                                    <Volume2 size={24} />
                                    <span className="text-lg font-mono">{word.pronunciation}</span>
                                </div>
                            </div>

                            <div className="space-y-8 mb-12">
                                <div>
                                    <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-2">释义</h3>
                                    <p className="text-2xl text-slate-200 font-light leading-relaxed">{word.definition}</p>
                                </div>

                                <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700/50">
                                    <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-2">例句</h3>
                                    <p className="text-xl text-indigo-200 italic font-serif">"{word.example}"</p>
                                </div>
                            </div>

                            <div className="flex gap-4">
                                <button onClick={handleLearn} className="btn-primary flex-1 flex items-center justify-center gap-2 py-4 text-lg cursor-pointer">
                                    <CheckCircle size={24} />
                                    标为已掌握
                                </button>
                                <button onClick={handleSkip} className="btn-secondary px-6 cursor-pointer" title="跳过">
                                    <Book size={24} />
                                </button>
                            </div>
                        </motion.div>
                    ) : (
                        <div className="glass-panel p-12 rounded-3xl text-center">
                            <h2 className="text-3xl font-bold text-white mb-4">全部完成！</h2>
                            <p className="text-slate-400">太棒了！您已经掌握了当前难度的所有单词。</p>
                        </div>
                    )}
                </div>

                <div className="space-y-8">
                    <div className="glass-panel p-6 rounded-2xl">
                        <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                            <BarChart2 size={20} className="text-secondary" />
                            学习进度
                        </h3>
                        <div className="h-48 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={stats.chartData ? stats.chartData : [{ name: 'Start', words: 0 }]}>
                                    <XAxis dataKey="name" hide />
                                    <YAxis hide />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }}
                                    />
                                    <Line type="monotone" dataKey="words" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 4, fill: '#8b5cf6' }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="flex justify-between mt-4 text-sm text-slate-400">
                            <span>今日已学</span>
                            <span className="text-white font-bold">{stats.history ? stats.history.length : 0} 词</span>
                        </div>
                    </div>

                    <div className="glass-panel p-6 rounded-2xl bg-gradient-to-br from-indigo-900/20 to-purple-900/20">
                        <h3 className="text-lg font-bold text-white mb-4">快捷操作</h3>
                        <div className="space-y-3">
                            <button
                                onClick={() => setShowQuiz(true)}
                                className="w-full text-left p-4 rounded-xl bg-gradient-to-r from-primary/20 to-secondary/20 hover:from-primary/30 hover:to-secondary/30 border border-primary/30 transition text-white flex items-center gap-3 group cursor-pointer"
                            >
                                <span className="w-9 h-9 rounded-lg bg-primary/30 flex items-center justify-center group-hover:bg-primary/50 transition">
                                    <BrainCircuit size={18} className="text-primary" />
                                </span>
                                <div className="flex-1">
                                    <div className="font-bold">复习自测</div>
                                    <div className="text-xs text-slate-400">
                                        {reviewStats.dueCount > 0
                                            ? `${reviewStats.dueCount} 个单词到期待复习`
                                            : reviewStats.totalLearned > 0
                                                ? '暂无到期，可随时自测'
                                                : '掌握单词后即可复习'}
                                    </div>
                                </div>
                                {reviewStats.dueCount > 0 && (
                                    <span className="px-2 py-0.5 rounded-full bg-accent text-white text-xs font-bold animate-pulse">
                                        {reviewStats.dueCount}
                                    </span>
                                )}
                            </button>

                            <button
                                onClick={() => setShowWordList(true)}
                                className="w-full text-left p-3 rounded-lg bg-slate-800/50 hover:bg-slate-800 transition text-slate-300 hover:text-white flex items-center gap-3 cursor-pointer"
                            >
                                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                                <ListChecks size={16} className="text-slate-400" />
                                查看已掌握单词
                            </button>

                            <button
                                onClick={() => navigate('/test')}
                                className="w-full text-left p-3 rounded-lg bg-slate-800/50 hover:bg-slate-800 transition text-slate-300 hover:text-white flex items-center gap-3 cursor-pointer"
                            >
                                <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                                重测词汇量
                            </button>
                        </div>
                    </div>
                </div>

                <AnimatePresence>
                    {showWordList && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
                            onClick={() => setShowWordList(false)}
                        >
                            <motion.div
                                initial={{ scale: 0.95, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.95, opacity: 0 }}
                                className="glass-panel bg-slate-900 p-6 rounded-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto"
                                onClick={e => e.stopPropagation()}
                            >
                                <div className="flex justify-between items-center mb-6">
                                    <h2 className="text-2xl font-bold text-white">已掌握单词</h2>
                                    <button onClick={() => setShowWordList(false)} className="text-slate-400 hover:text-white cursor-pointer">✕</button>
                                </div>
                                <div className="space-y-4">
                                    {stats.history && stats.history.length > 0 ? (
                                        stats.history.map((h: HistoryItem, i: number) => (
                                            <div key={i} className="p-4 bg-slate-800 rounded-lg border border-slate-700">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <h3 className="text-xl font-bold text-white">{h.word}</h3>
                                                        <p className="text-primary text-sm">{h.pronunciation}</p>
                                                    </div>
                                                    <button onClick={() => playAudio(h.word)} className="text-slate-400 hover:text-primary cursor-pointer">
                                                        <Volume2 size={18} />
                                                    </button>
                                                </div>
                                                <p className="text-slate-300 mt-2 text-sm">{h.definition}</p>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-center text-slate-500 py-8">暂无已学单词，快去学习吧！</div>
                                    )}
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <AnimatePresence>
                    {showQuiz && (
                        <ReviewQuiz
                            onClose={() => setShowQuiz(false)}
                            onFinished={handleQuizFinish}
                        />
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default Dashboard;
