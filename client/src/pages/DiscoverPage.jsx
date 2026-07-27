import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FiHeart, FiX, FiStar, FiZap, FiMapPin, FiBriefcase, FiChevronDown, FiChevronUp, FiRefreshCw, FiRotateCcw, FiClock } from 'react-icons/fi';
import api from '../utils/api';

const SWIPE_THRESHOLD = 80;

export default function DiscoverPage() {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [swiping, setSwiping] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [showProfile, setShowProfile] = useState(false);
  const [matchPopup, setMatchPopup] = useState(null);
  const [rewindCount, setRewindCount] = useState(3);
  const [swipedStack, setSwipedStack] = useState([]);
  const cardRef = useRef(null);
  const startX = useRef(0);
  const isDragging = useRef(false);

  const haptic = (ms = 10) => { try { navigator.vibrate?.(ms); } catch {} };

  const loadProfiles = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.swipes.discoverScored();
      const list = Array.isArray(data) ? data : data.profiles || [];
      setProfiles(list);
      setCurrentIndex(0);
      setSwipedStack([]);
    } catch { setProfiles([]); }
    setLoading(false);
  }, []);

  useEffect(() => { loadProfiles(); }, [loadProfiles]);

  const doSwipe = async (action) => {
    const profile = profiles[currentIndex];
    if (!profile || swiping) return;
    setSwiping(true);
    haptic(15);
    try {
      const profileId = profile.id || profile.user_id;
      const res = await api.swipes.swipe(profileId, action);
      if (res.isMatch && res.matchedUser) {
        setMatchPopup(res.matchedUser);
        haptic(50);
      }
      setSwipedStack((s) => [...s, { profile, action }]);
      setDragOffset(0);
      setTimeout(() => setCurrentIndex((i) => i + 1), 250);
    } catch (err) {
      console.error('Swipe error:', err);
    }
    setSwiping(false);
  };

  const handleRewind = async () => {
    if (rewindCount <= 0 || swipedStack.length === 0) return;
    haptic(20);
    try {
      await api.swipes.rewind();
      const last = swipedStack[swipedStack.length - 1];
      setSwipedStack((s) => s.slice(0, -1));
      setCurrentIndex((i) => Math.max(0, i - 1));
      setRewindCount((c) => c - 1);
    } catch {}
  };

  const handleTouchStart = (e) => { startX.current = e.touches[0].clientX; isDragging.current = true; };
  const handleTouchMove = (e) => { if (isDragging.current) setDragOffset(e.touches[0].clientX - startX.current); };
  const handleTouchEnd = () => {
    isDragging.current = false;
    if (Math.abs(dragOffset) > SWIPE_THRESHOLD) doSwipe(dragOffset > 0 ? 'like' : 'nope');
    else setDragOffset(0);
  };

  const handleMouseDown = (e) => {
    startX.current = e.clientX; isDragging.current = true;
    const mm = (ev) => { if (isDragging.current) setDragOffset(ev.clientX - startX.current); };
    const mu = () => {
      isDragging.current = false;
      document.removeEventListener('mousemove', mm);
      document.removeEventListener('mouseup', mu);
      setDragOffset((off) => { if (Math.abs(off) > SWIPE_THRESHOLD) doSwipe(off > 0 ? 'like' : 'nope'); return 0; });
    };
    document.addEventListener('mousemove', mm);
    document.addEventListener('mouseup', mu);
  };

  const profile = profiles[currentIndex];
  const nextProfile = profiles[currentIndex + 1];
  const photos = profile?.photos?.length ? profile.photos : ['https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&h=600&fit=crop'];
  const rotation = dragOffset * 0.05;
  const likeOpacity = dragOffset > 0 ? Math.min(dragOffset / SWIPE_THRESHOLD, 1) : 0;
  const nopeOpacity = dragOffset < 0 ? Math.min(Math.abs(dragOffset) / SWIPE_THRESHOLD, 1) : 0;

  if (loading) return (
    <div className="flex justify-center items-center h-[calc(100vh-80px)]">
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-pink-500 border-t-transparent" />
    </div>
  );

  if (!profile || currentIndex >= profiles.length) return (
    <div className="flex flex-col items-center justify-center h-[calc(100vh-80px)] px-8 text-center">
      <div className="w-24 h-24 bg-pink-100 dark:bg-pink-900/30 rounded-full flex items-center justify-center mb-6">
        <FiHeart size={40} className="text-pink-400" />
      </div>
      <h2 className="text-2xl font-extrabold text-gray-800 dark:text-white mb-2">No more profiles</h2>
      <p className="text-gray-500 dark:text-dark-muted mb-6">Check back later or try adjusting your preferences</p>
      <button onClick={loadProfiles} className="px-6 py-3 bg-pink-500 text-white font-bold rounded-xl hover:bg-pink-600 transition flex items-center gap-2">
        <FiRefreshCw size={18} /> Refresh
      </button>
    </div>
  );

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] px-4 pt-2">
      {/* Card */}
      <div className="relative flex-1 max-w-sm mx-auto w-full select-none">
        {/* Next card preview */}
        {nextProfile && (
          <div className="absolute inset-0 rounded-3xl overflow-hidden shadow-sm opacity-60 scale-[0.95] translate-y-2">
            <img src={nextProfile.photos?.[0] || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&h=600&fit=crop'}
              alt="" className="w-full h-full object-cover" />
          </div>
        )}

        {/* Active card */}
        <div
          ref={cardRef}
          className="absolute inset-0 rounded-3xl overflow-hidden shadow-2xl cursor-grab active:cursor-grabbing"
          style={{ transform: `translateX(${dragOffset}px) rotate(${rotation}deg)`, transition: isDragging.current ? 'none' : 'transform 0.3s ease' }}
          onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}
          onMouseDown={handleMouseDown}
        >
          <img src={photos[0]} alt="" className="absolute inset-0 w-full h-full object-cover" draggable={false} />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

          {/* Swipe labels */}
          <div className="absolute top-8 left-6 rotate-[-15deg] border-4 border-green-500 text-green-500 text-4xl font-extrabold px-4 py-1 rounded-xl pointer-events-none"
            style={{ opacity: likeOpacity, textShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>LIKE</div>
          <div className="absolute top-8 right-6 rotate-[15deg] border-4 border-red-500 text-red-500 text-4xl font-extrabold px-4 py-1 rounded-xl pointer-events-none"
            style={{ opacity: nopeOpacity, textShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>NOPE</div>

          {/* Info */}
          <div className="absolute bottom-0 left-0 right-0 p-5 text-white">
            <div className="flex items-end justify-between">
              <div className="flex-1 min-w-0">
                <h2 className="text-2xl font-extrabold truncate drop-shadow-lg">
                  {profile.name || profile.first_name}, {profile.age || '?'}
                </h2>
                <div className="flex items-center gap-1.5 text-white/80 text-sm mt-1">
                  <FiMapPin size={13} /> {profile.location || profile.location_name || 'Malawi'}
                </div>
                {profile.occupation && (
                  <div className="flex items-center gap-1.5 text-white/70 text-sm mt-0.5">
                    <FiBriefcase size={13} /> {profile.occupation}
                  </div>
                )}
                {profile.last_active && (
                  <div className="flex items-center gap-1.5 text-white/50 text-xs mt-0.5">
                    <FiClock size={11} /> Active {new Date(profile.last_active).toLocaleDateString() === new Date().toLocaleDateString() ? 'today' : 'recently'}
                  </div>
                )}
              </div>
              <button onClick={(e) => { e.stopPropagation(); setShowProfile(!showProfile); }}
                className="p-2 bg-white/20 backdrop-blur-sm rounded-full">
                {showProfile ? <FiChevronDown size={20} /> : <FiChevronUp size={20} />}
              </button>
            </div>
          </div>

          {/* Score badge */}
          {profile.matchScore != null && (
            <div className="absolute top-4 right-4 bg-pink-500/90 backdrop-blur-sm text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg">
              {profile.matchScore}% match
            </div>
          )}
          {profile.verified && (
            <div className="absolute top-4 left-4 bg-blue-500/90 backdrop-blur-sm text-white text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1 shadow-lg">
              Verified
            </div>
          )}
        </div>

        {/* Expanded profile */}
        {showProfile && (
          <div className="absolute bottom-0 left-0 right-0 bg-white dark:bg-dark-card rounded-3xl p-5 shadow-2xl z-10 max-h-[60%] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="w-10 h-1 bg-gray-300 dark:bg-dark-border rounded-full mx-auto mb-4" />
            {profile.bio && <p className="text-gray-700 dark:text-dark-text text-sm mb-3 leading-relaxed">{profile.bio}</p>}
            {profile.interests?.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {profile.interests.map((i) => (
                  <span key={i} className="px-3 py-1 bg-pink-50 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400 text-xs font-semibold rounded-full">{i}</span>
                ))}
              </div>
            )}
            {profile.height && <p className="text-sm text-gray-500 dark:text-dark-muted">Height: {profile.height} cm</p>}
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex justify-center items-center gap-3 py-4">
        <button onClick={handleRewind} disabled={rewindCount <= 0}
          className="w-11 h-11 rounded-full bg-white dark:bg-dark-surface shadow-lg flex items-center justify-center text-amber-400 hover:text-amber-500 hover:scale-110 transition active:scale-95 disabled:opacity-30 relative"
          title="Undo last swipe">
          <FiRotateCcw size={20} />
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">{rewindCount}</span>
        </button>
        <button onClick={() => doSwipe('nope')} disabled={swiping}
          className="w-14 h-14 rounded-full bg-white dark:bg-dark-surface shadow-lg flex items-center justify-center text-red-400 hover:text-red-500 hover:scale-110 transition active:scale-95 disabled:opacity-50">
          <FiX size={28} />
        </button>
        <button onClick={() => doSwipe('superlike')} disabled={swiping}
          className="w-12 h-12 rounded-full bg-white dark:bg-dark-surface shadow-lg flex items-center justify-center text-blue-400 hover:text-blue-500 hover:scale-110 transition active:scale-95 disabled:opacity-50">
          <FiStar size={22} />
        </button>
        <button onClick={() => doSwipe('like')} disabled={swiping}
          className="w-14 h-14 rounded-full bg-white dark:bg-dark-surface shadow-lg flex items-center justify-center text-green-400 hover:text-green-500 hover:scale-110 transition active:scale-95 disabled:opacity-50">
          <FiHeart size={28} />
        </button>
      </div>

      {/* Match popup */}
      {matchPopup && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6" onClick={() => setMatchPopup(null)}>
          <div className="bg-white dark:bg-dark-card rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl match-animation" onClick={(e) => e.stopPropagation()}>
            <div className="text-5xl mb-4">🎉</div>
            <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white mb-2">It's a Match!</h2>
            <p className="text-gray-500 dark:text-dark-muted mb-6">You and <strong>{matchPopup?.name || 'someone'}</strong> liked each other</p>
            <div className="flex gap-3">
              <button onClick={() => setMatchPopup(null)} className="flex-1 py-3 bg-gray-100 dark:bg-dark-surface text-gray-700 dark:text-dark-text font-bold rounded-xl hover:bg-gray-200 transition">
                Keep Swiping
              </button>
              <button onClick={() => setMatchPopup(null)} className="flex-1 py-3 bg-pink-500 text-white font-bold rounded-xl hover:bg-pink-600 transition">
                Send Message
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
