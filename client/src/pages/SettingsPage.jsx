import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  FiArrowLeft, FiSliders, FiUser, FiEye, FiBell, FiAlertTriangle,
  FiInfo, FiCheck, FiMail, FiHeart
} from 'react-icons/fi';
import api from '../utils/api';

const Toggle = ({ enabled, onChange }) => (
  <button
    onClick={() => onChange(!enabled)}
    className={`w-10 h-6 rounded-full transition-colors flex-shrink-0 ${
      enabled ? 'bg-pink-500' : 'bg-gray-300 dark:bg-gray-600'
    } relative`}
  >
    <div
      className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform shadow-sm ${
        enabled ? 'translate-x-4' : 'translate-x-0.5'
      }`}
    />
  </button>
);

function ToggleRow({ icon: Icon, label, description, enabled, onChange }) {
  return (
    <div className="flex items-center justify-between py-3.5">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-dark-surface flex items-center justify-center flex-shrink-0">
          <Icon size={18} className="text-gray-500 dark:text-dark-muted" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-800 dark:text-white">{label}</p>
          {description && (
            <p className="text-xs text-gray-400 dark:text-dark-muted mt-0.5">{description}</p>
          )}
        </div>
      </div>
      <Toggle enabled={enabled} onChange={onChange} />
    </div>
  );
}

export default function SettingsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Discovery prefs
  const [prefs, setPrefs] = useState({ minAge: 18, maxAge: 50, distance: 50, showMe: 'everyone' });

  // Account (display only)
  const [profile, setProfile] = useState(null);

  // Privacy toggles (localStorage)
  const [privacy, setPrivacy] = useState({
    showOnline: true,
    showDistance: true,
    matchesOnly: false,
  });

  // Notification toggles (localStorage)
  const [notifications, setNotifications] = useState({
    newMatches: true,
    newMessages: true,
    newLikes: false,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [msgError, setMsgError] = useState(false);

  // Delete account
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteInput, setDeleteInput] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const [p] = await Promise.all([api.profiles.get().catch(() => null)]);
        if (p) {
          setPrefs({
            minAge: p.age_min || 18,
            maxAge: p.age_max || 50,
            distance: p.max_distance || 50,
            showMe: p.looking_for || 'everyone',
          });
          setProfile(p);
        }

        // Load privacy from localStorage
        try {
          const saved = JSON.parse(localStorage.getItem('settings_privacy') || '{}');
          setPrivacy((prev) => ({
            ...prev,
            ...(saved.showOnline !== undefined && { showOnline: saved.showOnline }),
            ...(saved.showDistance !== undefined && { showDistance: saved.showDistance }),
            ...(saved.matchesOnly !== undefined && { matchesOnly: saved.matchesOnly }),
          }));
        } catch {}

        // Load notifications from localStorage
        try {
          const saved = JSON.parse(localStorage.getItem('settings_notifications') || '{}');
          setNotifications((prev) => ({
            ...prev,
            ...(saved.newMatches !== undefined && { newMatches: saved.newMatches }),
            ...(saved.newMessages !== undefined && { newMessages: saved.newMessages }),
            ...(saved.newLikes !== undefined && { newLikes: saved.newLikes }),
          }));
        } catch {}
      } catch (err) {
        console.error('Error:', err.message);
      }
      setLoading(false);
    };
    load();
  }, []);

  const handleSaveDiscovery = async () => {
    setSaving(true);
    setMsg('');
    try {
      await api.profiles.update({
        ageMin: prefs.minAge,
        ageMax: prefs.maxAge,
        maxDistance: prefs.distance,
        lookingFor: prefs.showMe,
      });
      setMsg('Settings saved!');
      setMsgError(false);
      setTimeout(() => setMsg(''), 3000);
    } catch (err) {
      setMsg(err.message || 'Failed to save');
      setMsgError(true);
    }
    setSaving(false);
  };

  const savePrivacy = (key, value) => {
    const updated = { ...privacy, [key]: value };
    setPrivacy(updated);
    localStorage.setItem('settings_privacy', JSON.stringify(updated));
  };

  const saveNotification = (key, value) => {
    const updated = { ...notifications, [key]: value };
    setNotifications(updated);
    localStorage.setItem('settings_notifications', JSON.stringify(updated));
  };

  const handleDeleteAccount = () => {
    console.log('Account deletion requested by user:', user?.id || user?.email);
    setShowDeleteModal(false);
    setDeleteInput('');
    setMsg('Account deletion request logged. Contact support for assistance.');
    setTimeout(() => setMsg(''), 4000);
  };

  const getAge = (dob) => {
    if (!dob) return '—';
    return Math.floor((Date.now() - new Date(dob).getTime()) / 31557600000);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-80px)]">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-pink-500 border-t-transparent" />
          <p className="text-sm text-gray-400 dark:text-dark-muted font-medium">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 pt-4 pb-24 md:max-w-2xl lg:max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="p-2 text-gray-600 dark:text-dark-muted hover:text-gray-900 dark:hover:text-white transition"
        >
          <FiArrowLeft size={22} />
        </button>
        <h1 className="text-xl font-extrabold text-gray-900 dark:text-white">Settings</h1>
      </div>

      {/* Success / Error Message */}
      {msg && (
        <div className={`mb-5 p-3.5 rounded-xl text-sm font-semibold flex items-center gap-2 border ${msgError ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-100 dark:border-red-800/30' : 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border-green-100 dark:border-green-800/30'}`}>
          <FiCheck size={16} className="flex-shrink-0" />
          {msg}
        </div>
      )}

      {/* ── Discovery Preferences ── */}
      <div className="mb-6">
        <h2 className="text-xs font-bold text-gray-400 dark:text-dark-muted uppercase tracking-wider mb-3 flex items-center gap-2">
          <FiSliders size={14} /> Discovery Preferences
        </h2>
        <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm border border-gray-100 dark:border-dark-border p-5 space-y-6">
          {/* Age Range */}
          <div>
            <div className="flex justify-between text-sm mb-2.5">
              <span className="text-gray-700 dark:text-dark-text font-medium">Age Range</span>
              <span className="font-bold text-pink-500">{prefs.minAge} – {prefs.maxAge}</span>
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <p className="text-[10px] font-medium text-gray-400 dark:text-dark-muted mb-1 uppercase">Min</p>
                <input
                  type="range" min="18" max="80" value={prefs.minAge}
                  onChange={(e) => setPrefs({ ...prefs, minAge: parseInt(e.target.value) })}
                  className="w-full accent-pink-500"
                />
              </div>
              <div className="flex-1">
                <p className="text-[10px] font-medium text-gray-400 dark:text-dark-muted mb-1 uppercase">Max</p>
                <input
                  type="range" min="18" max="80" value={prefs.maxAge}
                  onChange={(e) => setPrefs({ ...prefs, maxAge: parseInt(e.target.value) })}
                  className="w-full accent-pink-500"
                />
              </div>
            </div>
          </div>

          {/* Max Distance */}
          <div>
            <div className="flex justify-between text-sm mb-2.5">
              <span className="text-gray-700 dark:text-dark-text font-medium">Max Distance</span>
              <span className="font-bold text-pink-500">{prefs.distance} km</span>
            </div>
            <input
              type="range" min="5" max="500" value={prefs.distance}
              onChange={(e) => setPrefs({ ...prefs, distance: parseInt(e.target.value) })}
              className="w-full accent-pink-500"
            />
          </div>

          {/* Show Me */}
          <div>
            <span className="text-gray-700 dark:text-dark-text font-medium text-sm block mb-2.5">Show Me</span>
            <div className="flex gap-2">
              {['men', 'women', 'everyone'].map((g) => (
                <button
                  key={g}
                  onClick={() => setPrefs({ ...prefs, showMe: g })}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold capitalize transition-all duration-200 ${
                    prefs.showMe === g
                      ? 'bg-pink-500 text-white shadow-md shadow-pink-500/20'
                      : 'bg-gray-100 dark:bg-dark-surface text-gray-600 dark:text-dark-muted hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleSaveDiscovery}
            disabled={saving}
            className="w-full py-3 bg-gradient-to-r from-pink-500 to-rose-500 text-white font-bold rounded-xl hover:from-pink-600 hover:to-rose-600 transition-all duration-200 disabled:opacity-50 shadow-md shadow-pink-500/20"
          >
            {saving ? (
              <span className="flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                Saving...
              </span>
            ) : (
              'Save Preferences'
            )}
          </button>
        </div>
      </div>

      {/* ── Account Settings ── */}
      <div className="mb-6">
        <h2 className="text-xs font-bold text-gray-400 dark:text-dark-muted uppercase tracking-wider mb-3 flex items-center gap-2">
          <FiUser size={14} /> Account
        </h2>
        <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm border border-gray-100 dark:border-dark-border overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50 dark:border-dark-border">
            <p className="text-[10px] font-medium text-gray-400 dark:text-dark-muted uppercase mb-1">Email</p>
            <p className="text-sm font-semibold text-gray-800 dark:text-white flex items-center gap-2">
              <FiMail size={14} className="text-gray-400" />
              {user?.email || 'Not available'}
            </p>
          </div>
          <div className="px-5 py-4 border-b border-gray-50 dark:border-dark-border">
            <p className="text-[10px] font-medium text-gray-400 dark:text-dark-muted uppercase mb-1">Name</p>
            <p className="text-sm font-semibold text-gray-800 dark:text-white flex items-center gap-2">
              <FiUser size={14} className="text-gray-400" />
              {profile?.first_name || user?.name || 'Not set'}
            </p>
          </div>
          <div className="px-5 py-4">
            <p className="text-[10px] font-medium text-gray-400 dark:text-dark-muted uppercase mb-1">Gender</p>
            <p className="text-sm font-semibold text-gray-800 dark:text-white flex items-center gap-2">
              <FiHeart size={14} className="text-gray-400" />
              {profile?.gender ? profile.gender.charAt(0).toUpperCase() + profile.gender.slice(1) : 'Not set'}
            </p>
          </div>
        </div>
      </div>

      {/* ── Privacy ── */}
      <div className="mb-6">
        <h2 className="text-xs font-bold text-gray-400 dark:text-dark-muted uppercase tracking-wider mb-3 flex items-center gap-2">
          <FiEye size={14} /> Privacy
        </h2>
        <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm border border-gray-100 dark:border-dark-border px-5 divide-y divide-gray-50 dark:divide-dark-border">
          <ToggleRow
            icon={FiEye}
            label="Show Online Status"
            description="Others can see when you're active"
            enabled={privacy.showOnline}
            onChange={(v) => savePrivacy('showOnline', v)}
          />
          <ToggleRow
            icon={FiSliders}
            label="Show Distance"
            description="Display your approximate distance"
            enabled={privacy.showDistance}
            onChange={(v) => savePrivacy('showDistance', v)}
          />
          <ToggleRow
            icon={FiUser}
            label="Messages from Matches Only"
            description="Only matched users can message you"
            enabled={privacy.matchesOnly}
            onChange={(v) => savePrivacy('matchesOnly', v)}
          />
        </div>
      </div>

      {/* ── Notifications ── */}
      <div className="mb-6">
        <h2 className="text-xs font-bold text-gray-400 dark:text-dark-muted uppercase tracking-wider mb-3 flex items-center gap-2">
          <FiBell size={14} /> Notifications
        </h2>
        <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm border border-gray-100 dark:border-dark-border px-5 divide-y divide-gray-50 dark:divide-dark-border">
          <ToggleRow
            icon={FiHeart}
            label="New Matches"
            description="Get notified when you match with someone"
            enabled={notifications.newMatches}
            onChange={(v) => saveNotification('newMatches', v)}
          />
          <ToggleRow
            icon={FiMail}
            label="New Messages"
            description="Get notified for incoming messages"
            enabled={notifications.newMessages}
            onChange={(v) => saveNotification('newMessages', v)}
          />
          <ToggleRow
            icon={FiHeart}
            label="New Likes"
            description="Get notified when someone likes you"
            enabled={notifications.newLikes}
            onChange={(v) => saveNotification('newLikes', v)}
          />
        </div>
      </div>

      {/* ── Danger Zone ── */}
      <div className="mb-6">
        <h2 className="text-xs font-bold text-red-400 uppercase tracking-wider mb-3 flex items-center gap-2">
          <FiAlertTriangle size={14} /> Danger Zone
        </h2>
        <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm border border-red-100 dark:border-red-900/30 p-5">
          <p className="text-sm text-gray-600 dark:text-dark-muted mb-4">
            Permanently delete your account and all associated data. This action cannot be undone.
          </p>
          <button
            onClick={() => setShowDeleteModal(true)}
            className="w-full py-3 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 transition-all duration-200 shadow-md shadow-red-500/20 text-sm"
          >
            Delete Account
          </button>
        </div>
      </div>

      {/* ── About ── */}
      <div className="mb-6">
        <h2 className="text-xs font-bold text-gray-400 dark:text-dark-muted uppercase tracking-wider mb-3 flex items-center gap-2">
          <FiInfo size={14} /> About
        </h2>
        <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm border border-gray-100 dark:border-dark-border overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-50 dark:border-dark-border">
            <FiInfo size={18} className="text-gray-400" />
            <span className="text-sm font-medium text-gray-700 dark:text-dark-text">Version 1.0.0</span>
          </div>
          <div className="flex items-center gap-3 px-5 py-4">
            <FiHeart size={18} className="text-pink-500" />
            <span className="text-sm font-medium text-gray-700 dark:text-dark-text">Made with love in Malawi ❤️</span>
          </div>
        </div>
      </div>

      {/* ── Save All Button ── */}
      <button
        onClick={handleSaveDiscovery}
        disabled={saving}
        className="w-full py-3.5 bg-gradient-to-r from-pink-500 to-rose-500 text-white font-bold rounded-2xl hover:from-pink-600 hover:to-rose-600 transition-all duration-200 disabled:opacity-50 shadow-lg shadow-pink-500/25 text-sm tracking-wide"
      >
        {saving ? (
          <span className="flex items-center justify-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
            Saving all settings...
          </span>
        ) : (
          'Save All Settings'
        )}
      </button>

      {/* ── Delete Account Modal ── */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => { setShowDeleteModal(false); setDeleteInput(''); }} />
          <div className="relative bg-white dark:bg-dark-card rounded-2xl shadow-2xl p-6 w-full max-w-sm animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-center w-14 h-14 rounded-full bg-red-100 dark:bg-red-900/30 mx-auto mb-4">
              <FiAlertTriangle size={28} className="text-red-500" />
            </div>
            <h3 className="text-lg font-extrabold text-gray-900 dark:text-white text-center mb-2">
              Delete Account?
            </h3>
            <p className="text-sm text-gray-500 dark:text-dark-muted text-center mb-5 leading-relaxed">
              This is permanent and cannot be undone. All your data, matches, and messages will be lost.
            </p>
            <div className="mb-5">
              <label className="text-xs font-bold text-gray-400 dark:text-dark-muted uppercase tracking-wider block mb-2">
                Type <span className="text-red-500">DELETE</span> to confirm
              </label>
              <input
                type="text"
                value={deleteInput}
                onChange={(e) => setDeleteInput(e.target.value)}
                placeholder="DELETE"
                className="w-full px-4 py-3 bg-gray-50 dark:bg-dark-surface border border-gray-200 dark:border-dark-border rounded-xl text-sm font-medium text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition placeholder:text-gray-300"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => { setShowDeleteModal(false); setDeleteInput(''); }}
                className="flex-1 py-3 bg-gray-100 dark:bg-dark-surface text-gray-700 dark:text-dark-muted font-bold rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleteInput !== 'DELETE'}
                className="flex-1 py-3 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 transition text-sm disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
