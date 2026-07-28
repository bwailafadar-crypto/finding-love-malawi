import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FiEye, FiEyeOff } from 'react-icons/fi';
import GoogleSignIn from '../components/GoogleSignIn';

export default function RegisterPage() {
  const [form, setForm] = useState({ firstName: '', email: '', password: '', confirmPassword: '', age: '', gender: '' });
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.firstName.trim() || !form.email.trim() || !form.password || !form.age || !form.gender) { setError('All fields are required'); return; }
    if (form.password.length < 8) { setError('Password must be at least 8 characters'); return; }
    if (form.password !== form.confirmPassword) { setError('Passwords do not match'); return; }
    setLoading(true); setError('');
    try {
      const birthYear = new Date().getFullYear() - parseInt(form.age);
      const dateOfBirth = `${birthYear}-01-01`;
      await register({ firstName: form.firstName.trim(), email: form.email.trim().toLowerCase(), password: form.password, dateOfBirth, gender: form.gender });
      navigate('/onboarding');
    } catch (err) {
      const msg = err.message || '';
      if (msg.includes('already') || msg.includes('409')) {
        setError('An account with this email already exists.');
      } else {
        setError(msg || 'Registration failed. Please try again.');
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-white dark:bg-dark-bg flex flex-col transition-colors">
      <div className="flex-1 flex flex-col justify-center px-8 max-w-md mx-auto w-full py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white">Create Account</h1>
          <p className="text-gray-500 dark:text-dark-muted mt-2">Find your perfect match</p>
        </div>
        {error && <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-xl font-medium">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="text" value={form.firstName} onChange={set('firstName')} placeholder="First name"
            className="w-full px-4 py-3.5 bg-gray-100 dark:bg-dark-surface rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 text-gray-900 dark:text-white transition" required />
          <input type="email" value={form.email} onChange={set('email')} placeholder="Email address"
            className="w-full px-4 py-3.5 bg-gray-100 dark:bg-dark-surface rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 text-gray-900 dark:text-white transition" required />
          <div className="relative">
            <input type={showPass ? 'text' : 'password'} value={form.password} onChange={set('password')} placeholder="Password (min 8 characters)"
              className="w-full px-4 py-3.5 bg-gray-100 dark:bg-dark-surface rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 text-gray-900 dark:text-white pr-12 transition" required />
            <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
              {showPass ? <FiEyeOff size={20} /> : <FiEye size={20} />}
            </button>
          </div>
          <input type="password" value={form.confirmPassword} onChange={set('confirmPassword')} placeholder="Confirm password"
            className="w-full px-4 py-3.5 bg-gray-100 dark:bg-dark-surface rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 text-gray-900 dark:text-white transition" required />
          <select value={form.age} onChange={set('age')}
            className="w-full px-4 py-3.5 bg-gray-100 dark:bg-dark-surface rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 text-gray-700 dark:text-white transition" required>
            <option value="">Select your age</option>
            {Array.from({ length: 53 }, (_, i) => 18 + i).map(a => (
              <option key={a} value={a}>{a} years old</option>
            ))}
          </select>
          <select value={form.gender} onChange={set('gender')}
            className="w-full px-4 py-3.5 bg-gray-100 dark:bg-dark-surface rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 text-gray-700 dark:text-white transition" required>
            <option value="">Select gender</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="non-binary">Non-binary</option>
          </select>
          <button type="submit" disabled={loading}
            className="w-full py-4 bg-gradient-to-r from-pink-500 to-rose-500 text-white font-bold rounded-xl text-lg shadow-lg shadow-pink-200 dark:shadow-pink-900/30 hover:shadow-xl transition disabled:opacity-50">
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200 dark:border-gray-700" /></div>
          <div className="relative flex justify-center text-sm"><span className="px-3 bg-white dark:bg-dark-bg text-gray-400">or continue with</span></div>
        </div>
        <GoogleSignIn mode="register" />
        <p className="text-center text-gray-500 dark:text-dark-muted text-sm mt-8">
          Already have an account? <Link to="/login" className="text-pink-500 font-bold hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
