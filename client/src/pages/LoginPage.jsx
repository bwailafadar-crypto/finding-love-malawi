import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FiEye, FiEyeOff } from 'react-icons/fi';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) { setError('All fields are required'); return; }
    setLoading(true); setError('');
    try {
      await login(email.trim().toLowerCase(), password);
      navigate('/discover');
    } catch (err) { setError(err.message || 'Invalid credentials'); }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-white dark:bg-dark-bg flex flex-col transition-colors">
      <div className="flex-1 flex flex-col justify-center px-8 max-w-md mx-auto w-full">
        <div className="mb-10">
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white">Welcome back</h1>
          <p className="text-gray-500 dark:text-dark-muted mt-2">Sign in to continue</p>
        </div>
        {error && <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-xl font-medium">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-1.5">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3.5 bg-gray-100 dark:bg-dark-surface rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-pink-500 focus:bg-white dark:focus:bg-dark-surface transition"
              placeholder="you@email.com" required />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-1.5">Password</label>
            <div className="relative">
              <input type={showPass ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3.5 bg-gray-100 dark:bg-dark-surface rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-pink-500 pr-12 transition"
                placeholder="Enter password" required />
              <button type="button" onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showPass ? <FiEyeOff size={20} /> : <FiEye size={20} />}
              </button>
            </div>
            <div className="text-right mt-1.5">
              <Link to="/forgot-password" className="text-sm text-pink-500 font-semibold hover:underline">Forgot password?</Link>
            </div>
          </div>
          <button type="submit" disabled={loading}
            className="w-full py-4 bg-gradient-to-r from-pink-500 to-rose-500 text-white font-bold rounded-xl text-lg shadow-lg shadow-pink-200 dark:shadow-pink-900/30 hover:shadow-xl transition disabled:opacity-50">
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        <p className="text-center text-gray-500 dark:text-dark-muted text-sm mt-8">
          Don't have an account? <Link to="/register" className="text-pink-500 font-bold hover:underline">Sign up</Link>
        </p>
      </div>
    </div>
  );
}
