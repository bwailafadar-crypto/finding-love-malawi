import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiCamera, FiTrash2, FiPlus } from 'react-icons/fi';
import api from '../utils/api';

const INTERESTS = ['Music','Dancing','Travel','Cooking','Sports','Reading','Movies','Art','Fashion','Gaming','Nature','Photography','Technology','Food','Coffee','Yoga','Fitness','Hiking','Swimming','Church'];

export default function ProfileEditPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', bio: '', location: '', occupation: '', height: '', interests: [], photos: [] });
  const [newPhoto, setNewPhoto] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const p = await api.profiles.get();
        if (p) setForm({
          name: p.first_name || '',
          bio: p.bio || '',
          location: p.location_name || '',
          occupation: p.occupation || '',
          height: p.height?.toString() || '',
          interests: Array.isArray(p.interests) ? p.interests : [],
          photos: Array.isArray(p.photos) ? p.photos : [],
        });
      } catch {}
      setLoading(false);
    };
    load();
  }, []);

  const toggleInterest = (i) => setForm((f) => ({ ...f, interests: f.interests.includes(i) ? f.interests.filter((x) => x !== i) : [...f.interests, i] }));
  const addPhoto = () => { if (!newPhoto.trim() || form.photos.length >= 9) return; setForm((f) => ({ ...f, photos: [...f.photos, newPhoto.trim()] })); setNewPhoto(''); };
  const removePhoto = (idx) => setForm((f) => ({ ...f, photos: f.photos.filter((_, i) => i !== idx) }));

  const handleSave = async () => {
    setSaving(true); setMsg('');
    try {
      await api.profiles.update({
        firstName: form.name, bio: form.bio, locationName: form.location,
        occupation: form.occupation, height: form.height ? parseInt(form.height) : null,
        interests: form.interests, photos: form.photos,
      });
      setMsg('Profile updated!');
      setTimeout(() => navigate('/profile'), 1500);
    } catch (err) { setMsg(err.message || 'Failed'); }
    setSaving(false);
  };

  if (loading) return <div className="flex justify-center items-center h-[calc(100vh-80px)]"><div className="animate-spin rounded-full h-10 w-10 border-4 border-pink-500 border-t-transparent" /></div>;

  return (
    <div className="px-4 pt-4 pb-24">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="p-2 text-gray-600 dark:text-dark-muted hover:text-gray-900 dark:hover:text-white"><FiArrowLeft size={22} /></button>
        <h1 className="text-xl font-extrabold text-gray-900 dark:text-white">Edit Profile</h1>
      </div>
      {msg && <div className={`mb-4 p-3 rounded-xl text-sm font-medium ${msg.includes('updated') ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400' : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'}`}>{msg}</div>}
      <div className="space-y-5">
        <div>
          <label className="block text-xs font-bold text-gray-400 dark:text-dark-muted uppercase tracking-wider mb-2">Photos</label>
          <div className="grid grid-cols-3 gap-2">
            {form.photos.map((p, i) => (
              <div key={i} className="relative aspect-square rounded-xl overflow-hidden bg-gray-100 dark:bg-dark-surface group">
                <img src={p} alt="" className="w-full h-full object-cover" loading="lazy" />
                <button onClick={() => removePhoto(i)} className="absolute top-1.5 right-1.5 p-1 bg-black/50 rounded-full text-white opacity-0 group-hover:opacity-100 transition"><FiTrash2 size={12} /></button>
              </div>
            ))}
            {form.photos.length < 9 && (
              <div className="aspect-square rounded-xl border-2 border-dashed border-gray-200 dark:border-dark-border flex items-center justify-center"><FiCamera size={24} className="text-gray-300 dark:text-dark-muted" /></div>
            )}
          </div>
          <div className="flex gap-2 mt-3">
            <input type="url" value={newPhoto} onChange={(e) => setNewPhoto(e.target.value)} placeholder="Paste image URL"
              className="flex-1 px-3 py-2.5 bg-gray-100 dark:bg-dark-surface rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 text-gray-900 dark:text-white" />
            <button onClick={addPhoto} className="px-4 py-2.5 bg-pink-500 text-white rounded-xl font-bold text-sm hover:bg-pink-600 transition"><FiPlus size={18} /></button>
          </div>
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-400 dark:text-dark-muted uppercase tracking-wider mb-2">Name</label>
          <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full px-4 py-3 bg-gray-100 dark:bg-dark-surface rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 text-gray-900 dark:text-white transition" />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-400 dark:text-dark-muted uppercase tracking-wider mb-2">Bio</label>
          <textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} rows={3}
            className="w-full px-4 py-3 bg-gray-100 dark:bg-dark-surface rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 text-gray-900 dark:text-white resize-none transition"
            placeholder="Tell others about yourself..." />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-400 dark:text-dark-muted uppercase tracking-wider mb-2">Location</label>
          <input type="text" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="e.g. Lilongwe"
            className="w-full px-4 py-3 bg-gray-100 dark:bg-dark-surface rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 text-gray-900 dark:text-white transition" />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-400 dark:text-dark-muted uppercase tracking-wider mb-2">Occupation</label>
          <input type="text" value={form.occupation} onChange={(e) => setForm({ ...form, occupation: e.target.value })} placeholder="e.g. Software Engineer"
            className="w-full px-4 py-3 bg-gray-100 dark:bg-dark-surface rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 text-gray-900 dark:text-white transition" />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-400 dark:text-dark-muted uppercase tracking-wider mb-2">Height (cm)</label>
          <input type="number" value={form.height} onChange={(e) => setForm({ ...form, height: e.target.value })} placeholder="e.g. 175"
            className="w-full px-4 py-3 bg-gray-100 dark:bg-dark-surface rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 text-gray-900 dark:text-white transition" />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-400 dark:text-dark-muted uppercase tracking-wider mb-2">Interests</label>
          <div className="flex flex-wrap gap-2">
            {INTERESTS.map((i) => (
              <button key={i} onClick={() => toggleInterest(i)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${form.interests.includes(i) ? 'bg-pink-500 text-white' : 'bg-gray-100 dark:bg-dark-surface text-gray-600 dark:text-dark-muted hover:bg-gray-200'}`}>{i}</button>
            ))}
          </div>
        </div>
        <button onClick={handleSave} disabled={saving}
          className="w-full py-4 bg-gradient-to-r from-pink-500 to-rose-500 text-white font-bold rounded-xl text-lg shadow-lg shadow-pink-200 dark:shadow-pink-900/30 hover:shadow-xl transition disabled:opacity-50">
          {saving ? 'Saving...' : 'Save Profile'}
        </button>
      </div>
    </div>
  );
}
