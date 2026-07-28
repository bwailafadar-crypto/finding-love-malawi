import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiHeart, FiMessageCircle, FiRefreshCw, FiCheck, FiMapPin, FiClock, FiUser, FiSearch } from 'react-icons/fi';
import api from '../utils/api';
import LazyImage from '../components/LazyImage';

const PLACEHOLDER = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&h=400&fit=crop';

export default function UsersPage() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(new Set());
  const [search, setSearch] = useState('');
  const [genderFilter, setGenderFilter] = useState('all');

  const load = async () => {
    setLoading(true);
    try {
      const data = await api.users.online();
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error:', err.message);
      setUsers([]);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleLike = async (userId) => {
    if (liked.has(userId)) return;
    try {
      const res = await api.swipes.swipe(userId, 'like');
      setLiked((prev) => new Set([...prev, userId]));
      if (res.isMatch) {
        alert(`You matched with ${users.find(u => u.id === userId)?.firstName || 'someone'}!`);
      }
    } catch (err) {
      console.error('Like error:', err.message);
    }
  };

  const handleMessage = async (userId) => {
    try {
      const matches = await api.matches.list();
      const list = Array.isArray(matches) ? matches : [];
      const existing = list.find(
        (m) => m.other_user_id === userId || m.user1_id === userId || m.user2_id === userId
      );
      if (existing) {
        navigate(`/chat/${existing.match_id || existing.id}`);
      } else {
        const res = await api.swipes.swipe(userId, 'like');
        setLiked((prev) => new Set([...prev, userId]));
        if (res.isMatch) {
          const updatedMatches = await api.matches.list();
          const newList = Array.isArray(updatedMatches) ? updatedMatches : [];
          const newMatch = newList.find(
            (m) => m.other_user_id === userId || m.user1_id === userId || m.user2_id === userId
          );
          if (newMatch) {
            navigate(`/chat/${newMatch.match_id || newMatch.id}`);
          } else {
            navigate('/matches');
          }
        }
      }
    } catch (err) {
      console.error('Error:', err.message);
    }
  };

  const filtered = users.filter((u) => {
    const name = `${u.firstName || ''} ${u.lastName || ''}`.toLowerCase();
    const matchSearch = !search || name.includes(search.toLowerCase()) || (u.location || '').toLowerCase().includes(search.toLowerCase());
    const matchGender = genderFilter === 'all' || (u.gender || '').toLowerCase() === genderFilter;
    return matchSearch && matchGender;
  });

  const onlineCount = users.filter(u => u.isOnline).length;

  return (
    <div className="min-h-[calc(100vh-80px)] bg-gray-50 dark:bg-dark-bg pb-24">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white/90 dark:bg-dark-card/90 backdrop-blur-lg border-b border-gray-100 dark:border-dark-border px-4 pt-4 pb-3">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-xl font-extrabold text-gray-900 dark:text-white">Everyone</h1>
            <p className="text-xs text-gray-400 dark:text-dark-muted mt-0.5">
              {onlineCount > 0 ? `${onlineCount} online now · ` : ''}{filtered.length} people
            </p>
          </div>
          <button onClick={load}
            className="w-9 h-9 rounded-full bg-gray-100 dark:bg-dark-surface flex items-center justify-center text-gray-500 dark:text-dark-muted hover:bg-pink-50 hover:text-pink-500 transition">
            <FiRefreshCw size={16} />
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <FiSearch size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name or location..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-gray-100 dark:bg-dark-surface rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-dark-muted focus:outline-none focus:ring-2 focus:ring-pink-400 border border-transparent focus:border-pink-300 transition"
          />
        </div>

        {/* Gender filter */}
        <div className="flex gap-2">
          {[
            { key: 'all', label: 'All' },
            { key: 'male', label: 'Men' },
            { key: 'female', label: 'Women' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setGenderFilter(key)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition ${
                genderFilter === key
                  ? 'bg-pink-500 text-white shadow-sm'
                  : 'bg-gray-100 dark:bg-dark-surface text-gray-500 dark:text-dark-muted hover:bg-gray-200 dark:hover:bg-dark-border'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Users grid */}
      <div className="px-4 pt-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="relative">
              <div className="w-12 h-12 rounded-full border-4 border-pink-200 dark:border-pink-900/50" />
              <div className="absolute inset-0 w-12 h-12 rounded-full border-4 border-pink-500 border-t-transparent animate-spin" />
            </div>
            <p className="text-sm text-gray-400 dark:text-dark-muted">Loading people...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-20 h-20 rounded-full bg-gray-100 dark:bg-dark-surface flex items-center justify-center">
              <FiUser size={32} className="text-gray-300 dark:text-dark-muted" />
            </div>
            <p className="text-gray-500 dark:text-dark-muted text-sm text-center">
              {search ? 'No one matches your search' : 'No users found yet'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
            {filtered.map((u) => {
              const photo = u.photos?.[0] || u.avatarUrl || PLACEHOLDER;
              const name = `${u.firstName || ''} ${u.lastName || ''}`.trim();
              return (
                <div key={u.id}
                  className="relative bg-white dark:bg-dark-card rounded-2xl overflow-hidden shadow-sm border border-gray-100 dark:border-dark-border hover:shadow-md transition-all group">
                  {/* Photo */}
                  <div className="relative aspect-[3/4] overflow-hidden">
                    <LazyImage src={photo} alt={name} className="w-full h-full" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                    {/* Online badge */}
                    {u.isOnline && (
                      <div className="absolute top-2 right-2 w-3 h-3 bg-green-400 rounded-full border-2 border-white dark:border-dark-card shadow-sm z-10" />
                    )}

                    {/* Verified badge */}
                    {u.isVerified && (
                      <div className="absolute top-2 left-2 bg-blue-500/90 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5 z-10">
                        <FiCheck size={10} /> Verified
                      </div>
                    )}

                    {/* Bottom info */}
                    <div className="absolute bottom-0 left-0 right-0 p-3 text-white z-10">
                      <h3 className="font-extrabold text-base leading-tight drop-shadow-lg truncate">
                        {name}{u.age ? `, ${u.age}` : ''}
                      </h3>
                      {u.location && (
                        <p className="text-white/80 text-xs flex items-center gap-0.5 mt-0.5 truncate">
                          <FiMapPin size={10} /> {u.location}
                        </p>
                      )}
                      {!u.isOnline && u.lastActive && (
                        <p className="text-white/50 text-[10px] flex items-center gap-0.5 mt-0.5">
                          <FiClock size={8} /> {new Date(u.lastActive).toLocaleDateString() === new Date().toLocaleDateString() ? 'Active today' : 'Recently active'}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex p-2 gap-2">
                    <button
                      onClick={() => handleLike(u.id)}
                      disabled={liked.has(u.id)}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition ${
                        liked.has(u.id)
                          ? 'bg-pink-100 dark:bg-pink-900/30 text-pink-500'
                          : 'bg-gray-100 dark:bg-dark-surface text-gray-600 dark:text-dark-muted hover:bg-pink-50 hover:text-pink-500'
                      }`}
                    >
                      <FiHeart size={13} fill={liked.has(u.id) ? 'currentColor' : 'none'} />
                      {liked.has(u.id) ? 'Liked' : 'Like'}
                    </button>
                    <button
                      onClick={() => handleMessage(u.id)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold bg-pink-500 text-white hover:bg-pink-600 transition shadow-sm"
                    >
                      <FiMessageCircle size={13} /> Message
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
