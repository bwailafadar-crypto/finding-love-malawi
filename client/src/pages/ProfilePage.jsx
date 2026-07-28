import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { FiEdit3, FiSettings, FiShield, FiLogOut, FiHeart, FiStar, FiCheckCircle, FiChevronRight, FiShare2, FiCopy, FiSun, FiMoon, FiZap } from 'react-icons/fi';
import api from '../utils/api';

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const { dark, toggle } = useTheme();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ matches: 0, likes: 0 });
  const [showShare, setShowShare] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [p, m, l] = await Promise.all([
          api.profiles.get().catch(() => null),
          api.matches.list().catch(() => []),
          api.swipes.likes().catch(() => []),
        ]);
        setProfile(p);
        const mList = Array.isArray(m) ? m : m.matches || [];
        const lList = Array.isArray(l) ? l : l.likes || [];
        setStats({ matches: mList.length, likes: lList.length });
      } catch (err) { console.error('Error:', err.message); }
      setLoading(false);
    };
    load();
  }, []);

  const handleLogout = async () => { await logout(); navigate('/login'); };

  const shareProfile = async () => {
    const url = `${window.location.origin}/profile/${user?.id}`;
    if (navigator.share) {
      try { await navigator.share({ title: `Check out ${profile?.name || 'my'} profile`, url }); } catch (err) { console.error('Error:', err.message); }
    } else {
      try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch (err) { console.error('Error:', err.message); }
    }
  };

  if (loading) return (
    <div className="flex justify-center items-center h-[calc(100vh-80px)]">
      <div className="animate-spin rounded-full h-10 w-10 border-4 border-pink-500 border-t-transparent" />
    </div>
  );

  const photo = profile?.photos?.[0] || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&h=500&fit=crop';
  const interests = Array.isArray(profile?.interests) ? profile.interests : [];
  const photos = Array.isArray(profile?.photos) ? profile.photos : [];

  return (
    <div className="px-4 pt-4 pb-4 md:max-w-2xl lg:max-w-3xl mx-auto">
      {/* Profile header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="relative">
          <img src={photo} alt="" className="w-20 h-20 rounded-2xl object-cover bg-gray-100" />
          {profile?.is_verified && (
            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
              <FiCheckCircle size={14} className="text-white" />
            </div>
          )}
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-extrabold text-gray-900 dark:text-white">{profile?.first_name || user?.name || 'You'}</h1>
          <p className="text-sm text-gray-500 dark:text-dark-muted">{profile?.date_of_birth ? Math.floor((Date.now() - new Date(profile.date_of_birth).getTime()) / 31557600000) : '?'} · {profile?.location_name || 'Malawi'}</p>
          <div className="flex items-center gap-1 text-amber-500 text-sm mt-0.5">
            <FiStar size={13} /> {profile?.plan || 'Free'} Plan
          </div>
        </div>
        <Link to="/profile/edit" className="p-3 bg-gray-100 dark:bg-dark-surface rounded-xl text-gray-600 dark:text-dark-muted hover:bg-gray-200 transition">
          <FiEdit3 size={20} />
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-white dark:bg-dark-card rounded-2xl p-4 text-center shadow-sm border border-gray-100 dark:border-dark-border">
          <p className="text-2xl font-extrabold text-pink-500">{stats.matches}</p>
          <p className="text-xs text-gray-500 dark:text-dark-muted mt-1 font-medium">Matches</p>
        </div>
        <div className="bg-white dark:bg-dark-card rounded-2xl p-4 text-center shadow-sm border border-gray-100 dark:border-dark-border">
          <p className="text-2xl font-extrabold text-red-400">{stats.likes}</p>
          <p className="text-xs text-gray-500 dark:text-dark-muted mt-1 font-medium">Likes</p>
        </div>
        <div className="bg-white dark:bg-dark-card rounded-2xl p-4 text-center shadow-sm border border-gray-100 dark:border-dark-border">
          <p className="text-2xl font-extrabold text-blue-500">
            {profile?.is_verified ? '✓' : '—'}
          </p>
          <p className="text-xs text-gray-500 dark:text-dark-muted mt-1 font-medium">{profile?.is_verified ? 'Verified' : 'Unverified'}</p>
        </div>
      </div>

      {/* Bio */}
      {profile?.bio && (
        <div className="bg-white dark:bg-dark-card rounded-2xl p-4 mb-4 shadow-sm border border-gray-100 dark:border-dark-border">
          <h3 className="text-xs font-bold text-gray-400 dark:text-dark-muted uppercase tracking-wider mb-2">About Me</h3>
          <p className="text-sm text-gray-700 dark:text-dark-text leading-relaxed">{profile.bio}</p>
        </div>
      )}

      {/* Interests */}
      {interests.length > 0 && (
        <div className="bg-white dark:bg-dark-card rounded-2xl p-4 mb-4 shadow-sm border border-gray-100 dark:border-dark-border">
          <h3 className="text-xs font-bold text-gray-400 dark:text-dark-muted uppercase tracking-wider mb-2">Interests</h3>
          <div className="flex flex-wrap gap-2">
            {interests.map((i) => (
              <span key={i} className="px-3 py-1.5 bg-pink-50 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400 text-xs font-semibold rounded-full">{i}</span>
            ))}
          </div>
        </div>
      )}

      {/* Photos */}
      {photos.length > 1 && (
        <div className="bg-white dark:bg-dark-card rounded-2xl p-4 mb-4 shadow-sm border border-gray-100 dark:border-dark-border">
          <h3 className="text-xs font-bold text-gray-400 dark:text-dark-muted uppercase tracking-wider mb-2">Photos ({photos.length})</h3>
          <div className="grid grid-cols-3 gap-2">
            {photos.map((p, i) => (
              <img key={i} src={p} alt="" className="aspect-square rounded-xl object-cover bg-gray-100" loading="lazy" />
            ))}
          </div>
        </div>
      )}

      {/* Menu items */}
      <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm border border-gray-100 dark:border-dark-border overflow-hidden mb-4">
        <button onClick={shareProfile} className="w-full flex items-center gap-3 px-4 py-4 hover:bg-gray-50 dark:hover:bg-dark-surface transition border-b border-gray-50 dark:border-dark-border">
          <FiShare2 size={20} className="text-gray-400" />
          <span className="flex-1 text-sm font-semibold text-gray-700 dark:text-dark-text text-left">{copied ? 'Link copied!' : 'Share Profile'}</span>
          {copied ? <FiCheckCircle size={16} className="text-green-500" /> : <FiCopy size={16} className="text-gray-300" />}
        </button>
        <Link to="/verify" className="flex items-center gap-3 px-4 py-4 hover:bg-gray-50 dark:hover:bg-dark-surface transition border-b border-gray-50 dark:border-dark-border">
          <FiShield size={20} className="text-gray-400" />
          <span className="flex-1 text-sm font-semibold text-gray-700 dark:text-dark-text">Photo Verification</span>
          {profile?.is_verified ? (
            <span className="text-xs font-bold text-blue-500 bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded-full">Verified</span>
          ) : (
            <FiChevronRight size={16} className="text-gray-300" />
          )}
        </Link>
        <button onClick={toggle} className="w-full flex items-center gap-3 px-4 py-4 hover:bg-gray-50 dark:hover:bg-dark-surface transition border-b border-gray-50 dark:border-dark-border">
          {dark ? <FiSun size={20} className="text-amber-400" /> : <FiMoon size={20} className="text-gray-400" />}
          <span className="flex-1 text-sm font-semibold text-gray-700 dark:text-dark-text text-left">{dark ? 'Light Mode' : 'Dark Mode'}</span>
          <div className={`w-10 h-6 rounded-full transition-colors ${dark ? 'bg-pink-500' : 'bg-gray-300'} relative`}>
            <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform shadow-sm ${dark ? 'translate-x-4' : 'translate-x-0.5'}`} />
          </div>
        </button>
        <Link to="/settings" className="flex items-center gap-3 px-4 py-4 hover:bg-gray-50 dark:hover:bg-dark-surface transition">
          <FiSettings size={20} className="text-gray-400" />
          <span className="flex-1 text-sm font-semibold text-gray-700 dark:text-dark-text">Settings</span>
          <FiChevronRight size={16} className="text-gray-300" />
        </Link>
        <Link to="/premium" className="flex items-center gap-3 px-4 py-4 hover:bg-gray-50 dark:hover:bg-dark-surface transition border-t border-gray-50 dark:border-dark-border">
          <div className="w-5 h-5 bg-gradient-to-br from-amber-400 to-orange-500 rounded flex items-center justify-center">
            <FiZap size={12} className="text-white" />
          </div>
          <span className="flex-1 text-sm font-semibold text-gray-700 dark:text-dark-text">Go Premium</span>
          <span className="text-xs font-bold text-amber-500 bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded-full">NEW</span>
        </Link>
      </div>

      {/* Logout */}
      <button onClick={handleLogout}
        className="w-full flex items-center justify-center gap-2 py-4 bg-white dark:bg-dark-card rounded-2xl shadow-sm border border-gray-100 dark:border-dark-border text-red-500 font-bold text-sm hover:bg-red-50 dark:hover:bg-red-900/10 transition">
        <FiLogOut size={18} /> Sign Out
      </button>
    </div>
  );
}
