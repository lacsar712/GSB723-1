import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api';
import { UserPlus } from 'lucide-react';

const Register: React.FC = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post('/register', { username, password });
            navigate('/login');
        } catch (err: any) {
            setError(err.response?.data?.error || 'Registration failed');
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-[url('https://images.unsplash.com/photo-1546410531-bb4caa6b424d?q=80&w=2071&auto=format&fit=crop')] bg-cover bg-center">
            <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm"></div>
            <div className="relative z-10 glass-panel p-8 rounded-2xl w-full max-w-md animate-fade-in-up">
                <div className="flex justify-center mb-6">
                    <div className="p-4 bg-gradient-to-br from-accent to-secondary rounded-full shadow-lg shadow-accent/30">
                        <UserPlus size={40} className="text-white" />
                    </div>
                </div>
                <h2 className="text-3xl font-bold text-center mb-2 bg-clip-text text-transparent bg-gradient-to-r from-pink-300 to-purple-300">加入我们</h2>
                <p className="text-slate-400 text-center mb-8">今天就开始积累您的词汇量</p>

                {error && <div className="bg-red-500/20 text-red-200 p-3 rounded-lg mb-4 text-center text-sm">{error}</div>}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <input
                            type="text"
                            placeholder="用户名"
                            className="input-field"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                        />
                    </div>
                    <div>
                        <input
                            type="password"
                            placeholder="密码"
                            className="input-field"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>
                    <button type="submit" className="w-full btn-primary bg-gradient-to-r from-accent to-secondary mt-4">
                        注册
                    </button>
                </form>
                <div className="mt-6 text-center text-slate-400 text-sm">
                    已有账号？ <Link to="/login" className="text-accent hover:text-pink-400 font-medium">登录</Link>
                </div>
            </div>
        </div>
    );
};

export default Register;
