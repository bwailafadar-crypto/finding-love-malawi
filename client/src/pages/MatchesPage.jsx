import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FiHeart, FiTrash2, FiLock, FiClock } from 'react-icons/fi';
import api from '../utils/api';
import LazyImage from '../components/LazyImage';

export default function MatchesPage() {
  const [matches, setMatches] = useState([]);
  const [newMatches, setNewMatches] = useState([]);
  const [likes, setLikes] = useState([]);
  const [tab, setTab] = useState('matches');
  const [loading, setLoading] = useState(true);
  const [showLikes, setShowLikes] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [m, n, l] = await Promise.all([
          api.matches.list().catch(() => []),
          api.matches.new().catch(() => []),
          api.swipes.likes().catch(() => []),
        ]);
        setMatches(Array.isArray(m) ? m : m.matches || []);
        setNewMatches(Array.isArray(n) ? n : n.matches || []);
        setLikes(Array.isArray(l) ? l : l.likes || []);
      } catch (err) { console.error('Error:', err.message); }
      setLoading(false);
    };
    load();
  }, []);

  const removeMatch = async (id) => {
    if (!confirm('Remove this match?')) return;
    try { await api.matches.remove(id); setMatches((prev) => prev.filter((m) => (m.match_id ?? m.id) !== id)); } catch (err) { console.error('Error:', err.message); }
  };

  const tabs = [
    { id: 'matches', label: 'Matches', count: matches.length },
    { id: 'new', label: 'New', count: newMatches.length },
    { id: 'likes', label: 'Likes', count: likes.length },
  ];

  return (
    <div className="px-4 pt-3 pb-4">
      <div className="flex items-center gap-3 mb-4">
        <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white">Matches</h1>
        <div className="flex-1" />
        <div className="flex items-center gap-1 text-gray-400 dark:text-dark-muted">
          <FiHeart size={16} />
          <span className="text-sm font-medium">{likes.length} likes</span>
        </div>
      </div>

      <div className="flex bg-gray-100 dark:bg-dark-surface rounded-2xl p-1 mb-5">
        {tabs.map(({ id, label, count }) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition ${tab === id ? 'bg-white dark:bg-dark-card text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-dark-muted'}`}>
            {label} {count > 0 && <span className="text-pink-500">({count})</span>}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-pink-500 border-t-transparent" />
        </div>
      ) : (
        <div>
          {(tab === 'matches' || tab === 'new') && (
            <>
              {(tab === 'new' ? newMatches : matches).length === 0 ? (
                <div className="text-center py-20 text-gray-400 dark:text-dark-muted">
                  <FiHeart size={40} className="mx-auto mb-3 opacity-50" />
                  <p className="font-medium">No {tab === 'new' ? 'new matches' : 'matches'} yet</p>
                  <p className="text-sm mt-1">Keep swiping to find someone special</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
                  {(tab === 'new' ? newMatches : matches).map((m) => {
                    const other = m.other_user || m;
                    return (
                      <Link key={m.match_id ?? m.id} to={`/chat/${m.match_id ?? m.id}`}
                        className="relative bg-white dark:bg-dark-card rounded-2xl overflow-hidden shadow-sm border border-gray-100 dark:border-dark-border group hover:shadow-md transition">
                        <div className="aspect-[4/5] bg-gray-100 dark:bg-dark-surface">
                          <LazyImage src={other.photos?.[0] || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=300&h=400&fit=crop'}
                            alt="" className="w-full h-full" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition" />
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 p-3">
                          <p className="text-white font-bold text-sm drop-shadow-lg">{other.name || other.first_name}</p>
                          {other.last_active && (
                            <p className="text-white/60 text-[10px] flex items-center gap-0.5 mt-0.5"><FiClock size={9} /> Active {new Date(other.last_active).toLocaleDateString() === new Date().toLocaleDateString() ? 'today' : 'recently'}</p>
                          )}
                        </div>
                        {tab === 'matches' && (
                          <button onClick={(e) => { e.preventDefault(); removeMatch(m.match_id ?? m.id); }}
                            className="absolute top-2 right-2 p-1.5 bg-black/30 rounded-full text-white opacity-0 group-hover:opacity-100 transition hover:bg-red-500">
                            <FiTrash2 size={12} />
                          </button>
                        )}
                        <div className="absolute top-2 left-2 w-3 h-3 bg-green-400 rounded-full border-2 border-white" />
                      </Link>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {tab === 'likes' && (
            <>
              {likes.length === 0 ? (
                <div className="text-center py-20 text-gray-400 dark:text-dark-muted">
                  <FiHeart size={40} className="mx-auto mb-3 opacity-50" />
                  <p className="font-medium">No likes yet</p>
                  <p className="text-sm mt-1">Someone might be swiping on you right now</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {!showLikes && (
                    <div className="text-center py-6">
                      <div className="relative inline-block">
                        <div className="grid grid-cols-3 gap-2">
                          {likes.slice(0, 6).map((l, i) => {
                            const u = l.user || l;
                            return (
                              <div key={u.id || i} className="relative">
                                <LazyImage src={u.photos?.[0] || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop'}
                                  alt="" className="aspect-square rounded-xl bg-gray-100" />
                              </div>
                            );
                          })}
                        </div>
                        <div className="absolute inset-0 bg-white/70 dark:bg-dark-bg/70 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center">
                          <FiLock size={28} className="text-pink-500 mb-2" />
                          <p className="font-bold text-gray-800 dark:text-white text-sm">{likes.length} people liked you</p>
                          <p className="text-xs text-gray-500 dark:text-dark-muted mb-3">Swipe right on them to match!</p>
                          <button onClick={() => setShowLikes(true)} className="px-6 py-2.5 bg-gradient-to-r from-pink-500 to-rose-500 text-white font-bold rounded-xl text-sm shadow-lg">
                            Reveal Likes
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                  {showLikes && likes.map((l) => {
                    const u = l.user || l;
                    return (
                      <div key={u.id} className="flex items-center gap-3 bg-white dark:bg-dark-card rounded-2xl p-3 shadow-sm border border-gray-100 dark:border-dark-border">
                        <LazyImage src={u.photos?.[0] || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80&h=80&fit=crop'}
                          alt="" className="w-14 h-14 rounded-xl bg-gray-100 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-gray-900 dark:text-white truncate">{u.name || u.first_name}</p>
                          <p className="text-sm text-gray-500 dark:text-dark-muted">{u.age || '?'} · {u.location || 'Malawi'}</p>
                        </div>
                        <Link to="/discover" className="px-4 py-2 bg-pink-500 text-white font-bold rounded-xl text-sm hover:bg-pink-600 transition">View</Link>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
