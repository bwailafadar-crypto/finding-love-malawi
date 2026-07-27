import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiGlobe, FiSliders, FiInfo, FiHelpCircle } from 'react-icons/fi';
import api from '../utils/api';

export default function SettingsPage() {
  const navigate = useNavigate();
  const [prefs, setPrefs] = useState({ minAge: 18, maxAge: 50, distance: 50, showMe: 'everyone' });
  const [plans, setPlans] = useState([]);
  const [currentPlan, setCurrentPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const [p, pl] = await Promise.all([api.profiles.get().catch(() => null), api.subscriptions.plans().catch(() => ({ plans: [] }))]);
        if (p) setPrefs({ minAge: p.age_min || 18, maxAge: p.age_max || 50, distance: p.max_distance || 50, showMe: p.looking_for || 'everyone' });
        setPlans(pl.plans || []);
        const cur = await api.subscriptions.current().catch(() => null);
        setCurrentPlan(cur?.subscription || null);
      } catch {}
      setLoading(false);
    };
    load();
  }, []);

  const handleSave = async () => {
    setSaving(true); setMsg('');
    try { await api.profiles.update({ ageMin: prefs.minAge, ageMax: prefs.maxAge, maxDistance: prefs.distance, lookingFor: prefs.showMe }); setMsg('Settings saved!'); setTimeout(() => setMsg(''), 3000); }
    catch (err) { setMsg(err.message || 'Failed'); }
    setSaving(false);
  };

  if (loading) return <div className="flex justify-center items-center h-[calc(100vh-80px)]"><div className="animate-spin rounded-full h-10 w-10 border-4 border-pink-500 border-t-transparent" /></div>;

  return (
    <div className="px-4 pt-4 pb-24">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="p-2 text-gray-600 dark:text-dark-muted hover:text-gray-900 dark:hover:text-white"><FiArrowLeft size={22} /></button>
        <h1 className="text-xl font-extrabold text-gray-900 dark:text-white">Settings</h1>
      </div>
      {msg && <div className="mb-4 p-3 rounded-xl text-sm font-medium bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400">{msg}</div>}
      <div className="mb-6">
        <h2 className="text-xs font-bold text-gray-400 dark:text-dark-muted uppercase tracking-wider mb-3 flex items-center gap-2"><FiSliders size={14} /> Discovery Preferences</h2>
        <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm border border-gray-100 dark:border-dark-border p-4 space-y-5">
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-700 dark:text-dark-text font-medium">Age Range</span>
              <span className="font-bold text-pink-500">{prefs.minAge} - {prefs.maxAge}</span>
            </div>
            <div className="flex gap-3">
              <input type="range" min="18" max="80" value={prefs.minAge} onChange={(e) => setPrefs({ ...prefs, minAge: parseInt(e.target.value) })} className="flex-1 accent-pink-500" />
              <input type="range" min="18" max="80" value={prefs.maxAge} onChange={(e) => setPrefs({ ...prefs, maxAge: parseInt(e.target.value) })} className="flex-1 accent-pink-500" />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-700 dark:text-dark-text font-medium">Max Distance</span>
              <span className="font-bold text-pink-500">{prefs.distance} km</span>
            </div>
            <input type="range" min="5" max="500" value={prefs.distance} onChange={(e) => setPrefs({ ...prefs, distance: parseInt(e.target.value) })} className="w-full accent-pink-500" />
          </div>
          <div>
            <span className="text-gray-700 dark:text-dark-text font-medium text-sm">Show Me</span>
            <div className="flex gap-2 mt-2">
              {['men', 'women', 'everyone'].map((g) => (
                <button key={g} onClick={() => setPrefs({ ...prefs, showMe: g })}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold capitalize transition ${prefs.showMe === g ? 'bg-pink-500 text-white' : 'bg-gray-100 dark:bg-dark-surface text-gray-600 dark:text-dark-muted'}`}>{g}</button>
              ))}
            </div>
          </div>
          <button onClick={handleSave} disabled={saving} className="w-full py-3 bg-pink-500 text-white font-bold rounded-xl hover:bg-pink-600 transition disabled:opacity-50">
            {saving ? 'Saving...' : 'Save Preferences'}
          </button>
        </div>
      </div>
      <div className="mb-6">
        <h2 className="text-xs font-bold text-gray-400 dark:text-dark-muted uppercase tracking-wider mb-3 flex items-center gap-2"><FiGlobe size={14} /> Premium Plans</h2>
        <div className="space-y-3">
          {plans.filter((p) => p.price > 0).map((plan) => (
            <div key={plan.name} className={`bg-white dark:bg-dark-card rounded-2xl p-4 shadow-sm border-2 transition ${currentPlan?.plan === plan.name ? 'border-pink-500' : 'border-gray-100 dark:border-dark-border'}`}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white capitalize">{plan.name}</h3>
                  <p className="text-sm text-gray-500 dark:text-dark-muted">MWK {plan.price?.toLocaleString()}/month</p>
                </div>
                {currentPlan?.plan === plan.name ? (
                  <span className="px-3 py-1.5 bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 text-xs font-bold rounded-full">Current</span>
                ) : (
                  <button onClick={() => api.subscriptions.subscribe(plan.name, 'manual').then(() => { setCurrentPlan({ plan: plan.name }); setMsg('Upgraded!'); }).catch((e) => setMsg(e.message))}
                    className="px-4 py-2 bg-pink-500 text-white font-bold rounded-xl text-sm hover:bg-pink-600 transition">Select</button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm border border-gray-100 dark:border-dark-border overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-50 dark:border-dark-border">
          <FiInfo size={18} className="text-gray-400" />
          <span className="text-sm text-gray-700 dark:text-dark-text">Version 1.0.0</span>
        </div>
        <div className="flex items-center gap-3 px-4 py-4">
          <FiHelpCircle size={18} className="text-gray-400" />
          <span className="text-sm text-gray-700 dark:text-dark-text">Made with love in Malawi</span>
        </div>
      </div>
    </div>
  );
}
