import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { FiArrowLeft, FiLock, FiEye, FiEyeOff, FiCheckCircle } from 'react-icons/fi';
import api from '../utils/api';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  if (!token) {
    return (
      <div className="min-h-screen bg-white dark:bg-dark-bg flex flex-col items-center justify-center px-8 transition-colors">
        <div className="text-center">
          <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white mb-2">Invalid Reset Link</h1>
          <p className="text-gray-500 dark:text-dark-muted mb-6">This password reset link is invalid or missing.</p>
          <Link to="/forgot-password" className="px-6 py-3 bg-pink-500 text-white font-bold rounded-xl hover:bg-pink-600 transition">
            Request New Link
          </Link>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!password || !confirmPassword) { setError('All fields are required'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match'); return; }
    setLoading(true); setError('');
    try {
      await api.auth.resetPassword(token, password);
      setSuccess(true);
    } catch (err) { setError(err.message || 'Failed to reset password'); }
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
        {success ? (
          <div className="text-center fade-in">
            <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <FiCheckCircle size={40} className="text-green-500" />
            </div>
            <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-3">Password Reset!</h1>
            <p className="text-gray-500 dark:text-dark-muted mb-8">Your password has been updated successfully.</p>
            <Link to="/login" className="block w-full py-4 bg-gradient-to-r from-pink-500 to-rose-500 text-white font-bold rounded-xl text-lg shadow-lg transition hover:shadow-xl text-center">
              Sign In
            </Link>
          </div>
        ) : (
          <div className="fade-in">
            <div className="mb-10">
              <div className="w-16 h-16 bg-pink-100 dark:bg-pink-900/30 rounded-2xl flex items-center justify-center mb-5">
                <FiLock size={30} className="text-pink-500" />
              </div>
              <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-2">New password</h1>
              <p className="text-gray-500 dark:text-dark-muted">Enter your new password below</p>
            </div>
            {error && <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-xl font-medium">{error}</div>}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-1.5">New Password</label>
                <div className="relative">
                  <input type={showPass ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3.5 bg-gray-100 dark:bg-dark-surface rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-pink-500 pr-12 transition"
                    placeholder="Min 8 characters" required />
                  <button type="button" onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPass ? <FiEyeOff size={20} /> : <FiEye size={20} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-1.5">Confirm Password</label>
                <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3.5 bg-gray-100 dark:bg-dark-surface rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-pink-500 transition"
                  placeholder="Repeat password" required />
              </div>
              <button type="submit" disabled={loading}
                className="w-full py-4 bg-gradient-to-r from-pink-500 to-rose-500 text-white font-bold rounded-xl text-lg shadow-lg shadow-pink-200 dark:shadow-pink-900/30 hover:shadow-xl transition disabled:opacity-50">
                {loading ? 'Resetting...' : 'Reset Password'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
