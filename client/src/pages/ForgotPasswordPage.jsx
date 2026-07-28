import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FiArrowLeft, FiMail, FiCheckCircle } from 'react-icons/fi';
import api from '../utils/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) { setError('Email is required'); return; }
    setLoading(true); setError(''); setMsg('');
    try {
      const data = await api.auth.forgotPassword(email.trim().toLowerCase());
      setMsg(data.message || 'If an account exists, a reset link has been sent');
      setSent(true);
    } catch (err) { setError(err.message || 'Failed to send reset link'); }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-white dark:bg-dark-bg flex flex-col transition-colors">
      <div className="px-6 pt-6">
        <Link to="/login" className="p-2 text-gray-600 dark:text-dark-muted hover:text-gray-900 dark:hover:text-white inline-flex">
          <FiArrowLeft size={22} />
        </Link>
      </div>
      <div className="flex-1 flex flex-col justify-center px-8 max-w-md mx-auto w-full">
        {sent ? (
          <div className="text-center fade-in">
            <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <FiCheckCircle size={40} className="text-green-500" />
            </div>
            <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-3">Check your email</h1>
            <p className="text-gray-500 dark:text-dark-muted mb-8 leading-relaxed">{msg}</p>
            <Link to="/login" className="block w-full py-4 bg-gradient-to-r from-pink-500 to-rose-500 text-white font-bold rounded-xl text-lg shadow-lg transition hover:shadow-xl text-center">
              Back to Sign In
            </Link>
          </div>
        ) : (
          <div className="fade-in">
            <div className="mb-10">
              <div className="w-16 h-16 bg-pink-100 dark:bg-pink-900/30 rounded-2xl flex items-center justify-center mb-5">
                <FiMail size={30} className="text-pink-500" />
              </div>
              <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-2">Forgot password?</h1>
              <p className="text-gray-500 dark:text-dark-muted">Enter your email and we'll send you a reset link</p>
            </div>
            {error && <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-xl font-medium">{error}</div>}
            {msg && <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 text-sm rounded-xl font-medium">{msg}</div>}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-1.5">Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3.5 bg-gray-100 dark:bg-dark-surface rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-pink-500 focus:bg-white dark:focus:bg-dark-surface transition"
                  placeholder="you@email.com" required />
              </div>
              <button type="submit" disabled={loading}
                className="w-full py-4 bg-gradient-to-r from-pink-500 to-rose-500 text-white font-bold rounded-xl text-lg shadow-lg shadow-pink-200 dark:shadow-pink-900/30 hover:shadow-xl transition disabled:opacity-50">
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>
            </form>
            <p className="text-center text-gray-500 dark:text-dark-muted text-sm mt-8">
              Remember your password? <Link to="/login" className="text-pink-500 font-bold hover:underline">Sign in</Link>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
