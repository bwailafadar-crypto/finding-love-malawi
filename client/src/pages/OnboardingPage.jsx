import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FiArrowRight, FiArrowLeft, FiCheck, FiCamera, FiMapPin, FiUpload } from 'react-icons/fi';
import api from '../utils/api';

const INTERESTS = ['Music','Dancing','Travel','Cooking','Sports','Reading','Movies','Art','Fashion','Gaming','Nature','Photography','Technology','Food','Coffee','Yoga','Fitness','Hiking','Swimming','Church'];

const PROMPTS = [
  'A perfect first date is...',
  "I'm looking for someone who...",
  'My most irrational fear is...',
  'The way to my heart is...',
  'I geek out on...',
  'My simple pleasures are...',
];

const STEPS = ['photos', 'about', 'interests', 'prompts', 'preferences'];

export default function OnboardingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    photos: [],
    bio: '',
    location: '',
    occupation: '',
    interests: [],
    prompts: PROMPTS.map((q) => ({ question: q, answer: '' })),
    lookingFor: 'everyone',
    ageMin: 18,
    ageMax: 50,
  });
  const [newPhoto, setNewPhoto] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  const toggleInterest = (i) => {
    setForm((f) => ({
      ...f,
      interests: f.interests.includes(i) ? f.interests.filter((x) => x !== i) : f.interests.length < 10 ? [...f.interests, i] : f.interests,
    }));
  };

  const updatePrompt = (index, value) => {
    setForm((f) => {
      const prompts = [...f.prompts];
      prompts[index] = { ...prompts[index], answer: value.slice(0, 150) };
      return { ...f, prompts };
    });
  };

  const addPhoto = () => {
    if (!newPhoto.trim() || form.photos.length >= 9) return;
    setForm((f) => ({ ...f, photos: [...f.photos, newPhoto.trim()] }));
    setNewPhoto('');
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    const remaining = 9 - form.photos.length;
    const toUpload = files.slice(0, remaining);
    setUploading(true);
    try {
      const result = await api.upload.photos(toUpload);
      setForm((f) => ({ ...f, photos: [...f.photos, ...result.photos] }));
    } catch (err) { console.error('Error:', err.message); }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleFinish = async () => {
    setSaving(true);
    try {
      await api.profiles.update({
        photos: form.photos,
        bio: form.bio,
        locationName: form.location,
        occupation: form.occupation,
        interests: form.interests,
        prompts: form.prompts.filter((p) => p.answer.trim()),
        lookingFor: form.lookingFor,
        ageMin: form.ageMin,
        ageMax: form.ageMax,
      });
      navigate('/discover');
    } catch (err) { console.error('Error:', err.message); }
    setSaving(false);
  };

  const promptsAnswered = form.prompts.filter((p) => p.answer.trim()).length;
  const progress = ((step + 1) / STEPS.length) * 100;
  const canNext = step === 0 ? form.photos.length > 0 : step === 1 ? true : step === 2 ? form.interests.length > 0 : step === 3 ? promptsAnswered >= 2 : true;

  return (
    <div className="min-h-screen bg-white dark:bg-dark-bg flex flex-col">
      {/* Progress bar */}
      <div className="px-6 pt-12 pb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-bold text-gray-400 dark:text-dark-muted">Step {step + 1} of {STEPS.length}</span>
          <span className="text-sm font-bold text-pink-500">{Math.round(progress)}%</span>
        </div>
        <div className="h-2 bg-gray-100 dark:bg-dark-surface rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-pink-500 to-rose-500 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-6 overflow-y-auto">
        {step === 0 && (
          <div className="fade-in">
            <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white mb-2">Add your photos</h2>
            <p className="text-gray-500 dark:text-dark-muted text-sm mb-6">Add at least 1 photo. Great photos get 10x more matches.</p>
            <div className="grid grid-cols-3 gap-3 mb-4">
              {form.photos.map((p, i) => (
                <div key={i} className="relative aspect-square rounded-2xl overflow-hidden bg-gray-100 dark:bg-dark-surface group">
                  <img src={p} alt="" className="w-full h-full object-cover" />
                  <button onClick={() => setForm((f) => ({ ...f, photos: f.photos.filter((_, j) => j !== i) }))}
                    className="absolute top-2 right-2 w-6 h-6 bg-black/50 rounded-full text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition">×</button>
                </div>
              ))}
              {form.photos.length < 9 && (
                <button onClick={() => fileRef.current?.click()} disabled={uploading}
                  className="aspect-square rounded-2xl border-2 border-dashed border-gray-200 dark:border-dark-border flex flex-col items-center justify-center text-gray-300 hover:border-pink-400 transition disabled:opacity-50">
                  {uploading ? (
                    <div className="animate-spin rounded-full h-6 w-6 border-2 border-pink-500 border-t-transparent" />
                  ) : (
                    <>
                      <FiUpload size={24} />
                      <span className="text-xs mt-1 font-medium">Upload</span>
                    </>
                  )}
                </button>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" multiple onChange={handleFileUpload} className="hidden" />
            <div className="flex gap-2">
              <input type="url" value={newPhoto} onChange={(e) => setNewPhoto(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addPhoto()}
                placeholder="Or paste image URL"
                className="flex-1 px-4 py-3 bg-gray-100 dark:bg-dark-surface rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-pink-500" />
              <button onClick={addPhoto} className="px-4 py-3 bg-pink-500 text-white rounded-xl font-bold text-sm">Add</button>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="fade-in">
            <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white mb-2">Tell us about you</h2>
            <p className="text-gray-500 dark:text-dark-muted text-sm mb-6">Write a short bio and add your details.</p>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Bio</label>
                <textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} rows={3}
                  placeholder="I love exploring new places and trying local food..."
                  className="w-full px-4 py-3 bg-gray-100 dark:bg-dark-surface rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 resize-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5 flex items-center gap-1"><FiMapPin size={12} /> Location</label>
                <input type="text" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })}
                  placeholder="e.g. Lilongwe, Malawi"
                  className="w-full px-4 py-3 bg-gray-100 dark:bg-dark-surface rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-pink-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Occupation</label>
                <input type="text" value={form.occupation} onChange={(e) => setForm({ ...form, occupation: e.target.value })}
                  placeholder="e.g. Software Engineer"
                  className="w-full px-4 py-3 bg-gray-100 dark:bg-dark-surface rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-pink-500" />
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="fade-in">
            <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white mb-2">Pick your interests</h2>
            <p className="text-gray-500 dark:text-dark-muted text-sm mb-6">Select at least 3. This helps us find better matches.</p>
            <div className="flex flex-wrap gap-2">
              {INTERESTS.map((i) => (
                <button key={i} onClick={() => toggleInterest(i)}
                  className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                    form.interests.includes(i)
                      ? 'bg-pink-500 text-white shadow-md shadow-pink-200 dark:shadow-pink-900/30 scale-105'
                      : 'bg-gray-100 dark:bg-dark-surface text-gray-600 dark:text-dark-muted hover:bg-gray-200'
                  }`}>{i}</button>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-3">{form.interests.length}/10 selected</p>
          </div>
        )}

        {step === 3 && (
          <div className="fade-in">
            <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white mb-2">Show your personality</h2>
            <p className="text-gray-500 dark:text-dark-muted text-sm mb-6">Answer at least 2 prompts to let matches know the real you.</p>
            <div className="space-y-4">
              {form.prompts.map((prompt, i) => (
                <div key={i} className="bg-gray-100 dark:bg-dark-surface rounded-2xl p-4">
                  <label className="block text-sm font-bold text-pink-500 mb-2">{prompt.question}</label>
                  <textarea
                    value={prompt.answer}
                    onChange={(e) => updatePrompt(i, e.target.value)}
                    rows={2}
                    placeholder="Your answer..."
                    className="w-full px-4 py-3 bg-white dark:bg-dark-bg rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 resize-none"
                  />
                  <p className="text-xs text-gray-400 text-right mt-1">{prompt.answer.length}/150</p>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-3">{promptsAnswered}/2 minimum answered</p>
          </div>
        )}

        {step === 4 && (
          <div className="fade-in">
            <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white mb-2">Set your preferences</h2>
            <p className="text-gray-500 dark:text-dark-muted text-sm mb-6">Who would you like to see?</p>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-dark-text mb-2">Show me</label>
                <div className="flex gap-2">
                  {['men', 'women', 'everyone'].map((g) => (
                    <button key={g} onClick={() => setForm({ ...form, lookingFor: g })}
                      className={`flex-1 py-3 rounded-xl font-bold text-sm capitalize transition ${
                        form.lookingFor === g ? 'bg-pink-500 text-white' : 'bg-gray-100 dark:bg-dark-surface text-gray-600 dark:text-dark-muted'
                      }`}>{g}</button>
                  ))}
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-700 dark:text-dark-text font-medium">Age range</span>
                  <span className="font-bold text-pink-500">{form.ageMin} - {form.ageMax}</span>
                </div>
                <div className="flex gap-3">
                  <input type="range" min="18" max="80" value={form.ageMin}
                    onChange={(e) => setForm({ ...form, ageMin: parseInt(e.target.value) })}
                    className="flex-1 accent-pink-500" />
                  <input type="range" min="18" max="80" value={form.ageMax}
                    onChange={(e) => setForm({ ...form, ageMax: parseInt(e.target.value) })}
                    className="flex-1 accent-pink-500" />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="px-6 py-4 flex gap-3 safe-bottom">
        {step > 0 && (
          <button onClick={() => setStep((s) => s - 1)}
            className="px-5 py-3.5 bg-gray-100 dark:bg-dark-surface text-gray-700 dark:text-dark-text font-bold rounded-xl hover:bg-gray-200 transition flex items-center gap-1">
            <FiArrowLeft size={18} /> Back
          </button>
        )}
        <button onClick={() => step < STEPS.length - 1 ? setStep((s) => s + 1) : handleFinish()}
          disabled={!canNext || saving}
          className="flex-1 py-3.5 bg-gradient-to-r from-pink-500 to-rose-500 text-white font-bold rounded-xl text-lg shadow-lg shadow-pink-200 dark:shadow-pink-900/30 hover:shadow-xl transition disabled:opacity-40 flex items-center justify-center gap-2">
          {saving ? 'Saving...' : step < STEPS.length - 1 ? <>Next <FiArrowRight size={18} /></> : <>Done <FiCheck size={18} /></>}
        </button>
      </div>
    </div>
  );
}
