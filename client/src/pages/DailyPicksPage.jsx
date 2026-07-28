import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiStar, FiMapPin, FiHeart, FiClock } from 'react-icons/fi';
import api from '../utils/api';

export default function DailyPicksPage() {
  const navigate = useNavigate();
  const [picks, setPicks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(new Set());

  useEffect(() => {
    const load = async () => {
      try {
        const data = await api.swipes.discoverScored();
        const sorted = (data.profiles || data || [])
          .filter((p) => p.matchScore != null && p.matchScore > 30)
          .sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0))
          .slice(0, 10);
        setPicks(sorted);
      } catch (err) { console.error('Error:', err.message); }
      setLoading(false);
    };
    load();
  }, []);

  const handleLike = async (id) => {
    try {
      await api.swipes.swipe(id, 'like');
      setLiked((prev) => new Set([...prev, id]));
    } catch (err) { console.error('Error:', err.message); }
  };

  if (loading) return (
    <div className="flex justify-center items-center h-[calc(100vh-80px)]">
      <div className="animate-spin rounded-full h-10 w-10 border-4 border-pink-500 border-t-transparent" />
    </div>
  );

  return (
    <div className="px-4 pt-4 pb-4">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="p-2 text-gray-600 dark:text-dark-muted hover:text-gray-900 dark:hover:text-white">
          <FiArrowLeft size={22} />
        </button>
        <div>
          <h1 className="text-xl font-extrabold text-gray-900 dark:text-white">Daily Picks</h1>
          <p className="text-xs text-gray-400 dark:text-dark-muted flex items-center gap-1"><FiClock size={11} /> Refreshes daily</p>
        </div>
        <div className="flex-1" />
        <div className="px-3 py-1.5 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center gap-1">
          <FiStar size={14} className="text-amber-500" />
          <span className="text-xs font-bold text-amber-600 dark:text-amber-400">{picks.length} picks</span>
        </div>
      </div>

      {picks.length === 0 ? (
        <div className="text-center py-20 text-gray-400 dark:text-dark-muted">
          <FiStar size={40} className="mx-auto mb-3 opacity-50" />
          <p className="font-medium">No daily picks today</p>
          <p className="text-sm mt-1">Complete your profile to get better matches</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
          {picks.map((p) => {
            const photo = p.photos?.[0] || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=300&h=400&fit=crop';
            const isLiked = liked.has(p.id);
            return (
              <div key={p.id} className="relative bg-white dark:bg-dark-card rounded-2xl overflow-hidden shadow-sm border border-gray-100 dark:border-dark-border group">
                <div className="aspect-[3/4] bg-gray-100 dark:bg-dark-surface relative">
                  <img src={photo} alt="" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  {/* Score badge */}
                  <div className="absolute top-3 left-3 bg-pink-500/90 backdrop-blur-sm text-white text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                    <FiHeart size={10} /> {p.matchScore}%
                  </div>
                  {p.verified && (
                    <div className="absolute top-3 right-3 bg-blue-500/90 backdrop-blur-sm text-white text-xs font-bold px-2 py-1 rounded-full">✓</div>
                  )}
                  {/* Info */}
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <p className="text-white font-bold text-sm drop-shadow-lg">{p.name || p.first_name}, {p.age || '?'}</p>
                    <p className="text-white/70 text-xs flex items-center gap-1"><FiMapPin size={10} /> {p.location || p.location_name || 'Malawi'}</p>
                  </div>
                </div>
                <div className="p-2 flex gap-2">
                  <button onClick={() => handleLike(p.id)} disabled={isLiked}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition ${
                      isLiked ? 'bg-green-100 text-green-500 dark:bg-green-900/30' : 'bg-pink-500 text-white hover:bg-pink-600'
                    }`}>
                    {isLiked ? 'Liked' : 'Like'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
