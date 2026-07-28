import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FiHeart, FiX, FiStar, FiZap, FiMapPin, FiBriefcase, FiChevronUp, FiChevronDown, FiRefreshCw, FiRotateCcw, FiClock, FiCheck, FiMessageCircle, FiPlay, FiPlus } from 'react-icons/fi';
import api from '../utils/api';
import LazyImage from '../components/LazyImage';

const SWIPE_THRESHOLD = 80;

export default function DiscoverPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [swiping, setSwiping] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [showProfile, setShowProfile] = useState(false);
  const [matchPopup, setMatchPopup] = useState(null);
  const [rewindCount, setRewindCount] = useState(3);
  const [swipedStack, setSwipedStack] = useState([]);
  const [activePhoto, setActivePhoto] = useState(0);
  const [sortBy, setSortBy] = useState('recommended');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [storyGroups, setStoryGroups] = useState([]);
  const [viewerStoryGroup, setViewerStoryGroup] = useState(null);
  const [viewerStoryIdx, setViewerStoryIdx] = useState(0);
  const [storyProgress, setStoryProgress] = useState(0);
  const cardRef = useRef(null);
  const startX = useRef(0);
  const isDragging = useRef(false);
  const dragOffsetRef = useRef(0);

  const haptic = (ms = 10) => { try { navigator.vibrate?.(ms); } catch (err) { console.error('Error:', err.message); } };

  const loadProfiles = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.swipes.discoverScored();
      const list = Array.isArray(data) ? data : data.profiles || [];
      setProfiles(list);
      setCurrentIndex(0);
      setSwipedStack([]);
      setActivePhoto(0);
      setSortBy('recommended');
    } catch (err) { console.error('Error:', err.message); setProfiles([]); }
    setLoading(false);
  }, []);

  useEffect(() => { loadProfiles(); }, [loadProfiles]);

  useEffect(() => { setActivePhoto(0); setShowProfile(false); }, [currentIndex]);

  useEffect(() => {
    const closeSort = (e) => {
      if (showSortMenu && !e.target.closest('[data-sort-menu]')) setShowSortMenu(false);
    };
    document.addEventListener('mousedown', closeSort);
    return () => document.removeEventListener('mousedown', closeSort);
  }, [showSortMenu]);

  useEffect(() => {
    const loadStories = async () => {
      try {
        const data = await api.stories.feed();
        const list = Array.isArray(data) ? data : [];
          const grouped = list.reduce((acc, s) => {
          const uid = s.user_id;
          if (!acc[uid]) {
            const photos = Array.isArray(s.photos) ? s.photos : [];
            acc[uid] = { user: { id: uid, first_name: s.first_name, photos }, stories: [], viewed: !!s.viewed };
          }
          acc[uid].stories.push(s);
          if (s.viewed) acc[uid].viewed = true;
          return acc;
        }, {});
        setStoryGroups(Object.values(grouped));
      } catch { setStoryGroups([]); }
    };
    loadStories();
  }, []);

  useEffect(() => {
    if (!viewerStoryGroup) return;
    setStoryProgress(0);
    const timer = setTimeout(() => {
      const group = viewerStoryGroup;
      if (viewerStoryIdx < group.stories.length - 1) {
        setViewerStoryIdx((i) => i + 1);
      } else {
        setViewerStoryGroup(null);
      }
    }, 5000);
    return () => clearTimeout(timer);
  }, [viewerStoryGroup, viewerStoryIdx]);

  useEffect(() => {
    if (!viewerStoryGroup) return;
    setStoryProgress(0);
    const interval = setInterval(() => setStoryProgress((p) => Math.min(p + 2, 100)), 100);
    return () => clearInterval(interval);
  }, [viewerStoryGroup, viewerStoryIdx]);

  useEffect(() => {
    if (viewerStoryGroup) {
      const story = viewerStoryGroup.stories[viewerStoryIdx];
      if (story && !story.viewed) {
        api.stories.view(story.id).catch(() => {});
        setStoryGroups((prev) => prev.map((g) => g.user.id === viewerStoryGroup.user.id ? { ...g, viewed: true } : g));
      }
    }
  }, [viewerStoryGroup, viewerStoryIdx]);

  const sortedProfiles = [...profiles].sort((a, b) => {
    if (sortBy === 'distance') {
      if (a.distance == null && b.distance == null) return b.matchScore - a.matchScore;
      if (a.distance == null) return 1;
      if (b.distance == null) return -1;
      return a.distance - b.distance;
    }
    if (sortBy === 'recent') {
      const aTime = a.last_active ? new Date(a.last_active).getTime() : 0;
      const bTime = b.last_active ? new Date(b.last_active).getTime() : 0;
      return bTime - aTime;
    }
    return b.matchScore - a.matchScore;
  });

  const doSwipe = async (action) => {
    const profile = sortedProfiles[currentIndex];
    if (!profile || swiping) return;
    setSwiping(true);
    haptic(15);

    const flyOut = action === 'like' || action === 'super_like' ? 600 : -600;
    setDragOffset(flyOut);

    try {
      const profileId = profile.id || profile.user_id;
      const res = await api.swipes.swipe(profileId, action);
      if (res.isMatch && res.matchedUser) {
        setMatchPopup(res.matchedUser);
        haptic(50);
      }
      setSwipedStack((s) => [...s, { profile, action }]);
      await new Promise((r) => setTimeout(r, 300));
      setDragOffset(0);
      setCurrentIndex((i) => i + 1);
    } catch (err) {
      console.error('Swipe error:', err);
      setDragOffset(0);
    }
    setSwiping(false);
  };

  const handleRewind = async () => {
    if (rewindCount <= 0 || swipedStack.length === 0) return;
    haptic(20);
    try {
      await api.swipes.rewind();
      setSwipedStack((s) => s.slice(0, -1));
      setCurrentIndex((i) => Math.max(0, i - 1));
      setRewindCount((c) => c - 1);
    } catch (err) { console.error('Error:', err.message); }
  };

  const handleTouchStart = (e) => { if (swiping) return; startX.current = e.touches[0].clientX; isDragging.current = true; };
  const handleTouchMove = (e) => { if (isDragging.current) { const off = e.touches[0].clientX - startX.current; dragOffsetRef.current = off; setDragOffset(off); } };
  const handleTouchEnd = () => {
    if (!isDragging.current) return;
    isDragging.current = false;
    const off = dragOffsetRef.current;
    dragOffsetRef.current = 0;
    if (Math.abs(off) > SWIPE_THRESHOLD) doSwipe(off > 0 ? 'like' : 'dislike');
    else {
      const currentPhotos = profiles[currentIndex]?.photos;
      const pArr = currentPhotos?.length ? currentPhotos : [''];
      if (Math.abs(off) < 10 && pArr.length > 1) {
        const card = cardRef.current;
        if (card) {
          const rect = card.getBoundingClientRect();
          const touchX = startX.current - rect.left;
          if (touchX > rect.width / 2) setActivePhoto((p) => Math.min(p + 1, pArr.length - 1));
          else setActivePhoto((p) => Math.max(p - 1, 0));
        }
      }
      setDragOffset(0);
    }
  };

  const handleMouseDown = (e) => {
    if (swiping) return;
    startX.current = e.clientX; isDragging.current = true;
    const mm = (ev) => { if (isDragging.current) { const off = ev.clientX - startX.current; dragOffsetRef.current = off; setDragOffset(off); } };
    const mu = () => {
      isDragging.current = false;
      document.removeEventListener('mousemove', mm);
      document.removeEventListener('mouseup', mu);
      const off = dragOffsetRef.current;
      dragOffsetRef.current = 0;
      if (Math.abs(off) > SWIPE_THRESHOLD) doSwipe(off > 0 ? 'like' : 'dislike');
      else setDragOffset(0);
    };
    document.addEventListener('mousemove', mm);
    document.addEventListener('mouseup', mu);
  };

  const profile = sortedProfiles[currentIndex];
  const nextProfile = sortedProfiles[currentIndex + 1];
  const nextPhotos = nextProfile?.photos?.length ? nextProfile.photos : ['https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&h=600&fit=crop'];
  const photos = profile?.photos?.length ? profile.photos : ['https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&h=600&fit=crop'];
  const rotation = dragOffset * 0.04;
  const likeOpacity = dragOffset > 0 ? Math.min(dragOffset / SWIPE_THRESHOLD, 1) : 0;
  const nopeOpacity = dragOffset < 0 ? Math.min(Math.abs(dragOffset) / SWIPE_THRESHOLD, 1) : 0;

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-[calc(100vh-80px)] gap-4">
      <div className="relative">
        <div className="w-16 h-16 rounded-full border-4 border-pink-200 dark:border-pink-900/50" />
        <div className="absolute inset-0 w-16 h-16 rounded-full border-4 border-pink-500 border-t-transparent animate-spin" />
      </div>
      <p className="text-sm font-semibold text-gray-400 dark:text-dark-muted animate-pulse">Finding people near you...</p>
    </div>
  );

  if (!profile || currentIndex >= sortedProfiles.length) return (
    <div className="flex flex-col items-center justify-center h-[calc(100vh-80px)] px-8 text-center">
      <div className="relative mb-8">
        <div className="w-28 h-28 bg-gradient-to-br from-pink-100 to-rose-100 dark:from-pink-900/30 dark:to-rose-900/30 rounded-full flex items-center justify-center">
          <FiHeart size={44} className="text-pink-400" />
        </div>
        <div className="absolute -top-2 -right-2 w-8 h-8 bg-amber-400 rounded-full flex items-center justify-center shadow-lg">
          <FiZap size={16} className="text-white" />
        </div>
      </div>
      <h2 className="text-2xl font-extrabold text-gray-800 dark:text-white mb-2">You've seen everyone!</h2>
      <p className="text-gray-500 dark:text-dark-muted mb-8 max-w-xs">Check back later for new people or adjust your preferences to see more</p>
      <button onClick={loadProfiles}
        className="px-8 py-3.5 bg-gradient-to-r from-pink-500 to-rose-500 text-white font-bold rounded-2xl shadow-lg shadow-pink-200 dark:shadow-pink-900/30 hover:shadow-xl hover:scale-105 transition-all flex items-center gap-2">
        <FiRefreshCw size={18} /> Refresh
      </button>
    </div>
  );

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] px-4 pt-1">
      {/* Story rings */}
      {storyGroups.length > 0 && (
        <div className="flex gap-3 overflow-x-auto py-3 scrollbar-hide">
          {storyGroups.map((g) => (
            <button key={g.user.id} onClick={() => { setViewerStoryGroup(g); setViewerStoryIdx(0); setStoryProgress(0); }}
              className="flex flex-col items-center gap-1 flex-shrink-0">
              <div className={`${g.viewed ? 'story-ring-seen' : 'story-ring'} p-0.5 rounded-full`}>
                <div className="w-[54px] h-[54px] rounded-full overflow-hidden bg-white dark:bg-dark-card">
                  {g.user.photos?.[0] ? (
                    <img src={g.user.photos[0]} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-200 dark:bg-dark-surface">
                      <span className="text-lg font-bold text-gray-400">{g.user.first_name?.[0] || '?'}</span>
                    </div>
                  )}
                </div>
              </div>
              <span className="text-[10px] font-medium text-gray-500 dark:text-dark-muted w-14 text-center truncate">{g.user.first_name}</span>
            </button>
          ))}
          <button onClick={() => navigate('/stories')}
            className="flex flex-col items-center gap-1 flex-shrink-0">
            <div className="w-[54px] h-[54px] rounded-full bg-gray-100 dark:bg-dark-surface border-2 border-dashed border-gray-300 dark:border-dark-border flex items-center justify-center">
              <FiPlus size={20} className="text-gray-400" />
            </div>
            <span className="text-[10px] font-medium text-gray-500 dark:text-dark-muted w-14 text-center">Your story</span>
          </button>
        </div>
      )}

      {/* Sort bar */}
      <div className="flex justify-end mb-2 relative" data-sort-menu>
        <button
          onClick={() => setShowSortMenu(!showSortMenu)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-dark-surface rounded-full text-xs font-semibold text-gray-600 dark:text-dark-text shadow-sm border border-gray-100 dark:border-dark-border"
        >
          {sortBy === 'recommended' ? 'Recommended' : sortBy === 'distance' ? 'Distance' : 'Recently Active'}
          <FiChevronDown size={12} />
        </button>
        {showSortMenu && (
          <div className="absolute top-full right-0 mt-1 bg-white dark:bg-dark-card rounded-xl shadow-xl border border-gray-100 dark:border-dark-border py-1 w-44 z-30">
            {[
              { key: 'recommended', label: 'Recommended' },
              { key: 'distance', label: 'Distance' },
              { key: 'recent', label: 'Recently Active' },
            ].map((opt) => (
              <button
                key={opt.key}
                onClick={() => { setSortBy(opt.key); setShowSortMenu(false); setCurrentIndex(0); setSwipedStack([]); }}
                className={`w-full px-4 py-2.5 text-left text-sm transition flex items-center justify-between ${
                  sortBy === opt.key
                    ? 'text-pink-500 font-semibold bg-pink-50 dark:bg-pink-900/20'
                    : 'text-gray-700 dark:text-dark-text hover:bg-gray-50 dark:hover:bg-dark-surface'
                }`}
              >
                {opt.label}
                {sortBy === opt.key && <FiCheck size={14} className="text-pink-500" />}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Card stack */}
      <div className="relative flex-1 max-w-sm mx-auto w-full select-none" style={{ perspective: '1000px' }}>
        {/* Third card (deepest) */}
        {sortedProfiles[currentIndex + 2] && (
          <div className="absolute inset-0 rounded-[2rem] overflow-hidden shadow-sm scale-[0.88] translate-y-4 opacity-30">
            <LazyImage src={sortedProfiles[currentIndex + 2].photos?.[0] || nextPhotos[0]} alt="" className="w-full h-full" />
          </div>
        )}

        {/* Next card preview */}
        {nextProfile && (
          <div className="absolute inset-0 rounded-[2rem] overflow-hidden shadow-md scale-[0.93] translate-y-2 opacity-70">
            <LazyImage src={nextPhotos[0]} alt="" className="w-full h-full" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
          </div>
        )}

        {/* Active card */}
        <div
          ref={cardRef}
          className="absolute inset-0 rounded-[2rem] overflow-hidden cursor-grab active:cursor-grabbing"
          style={{
            transform: `translateX(${dragOffset}px) rotate(${rotation}deg) scale(1)`,
            transition: isDragging.current ? 'none' : 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
            touchAction: 'pan-y',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25), 0 0 0 1px rgba(0,0,0,0.05)'
          }}
          onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}
          onMouseDown={handleMouseDown}
        >
          {/* Photo with swipe */}
          <div className="absolute inset-0">
            <LazyImage src={photos[activePhoto] || photos[0]} alt="" className="w-full h-full" />
          </div>

          {/* Gradient overlay — stronger at bottom */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/5 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-transparent" />

          {/* Photo dots */}
          {photos.length > 1 && (
            <div className="absolute top-3 left-3 right-3 flex gap-1 z-10 px-1">
              {photos.map((_, i) => (
                <div key={i} className={`flex-1 h-[3px] rounded-full transition-all duration-300 ${i === activePhoto ? 'bg-white shadow-lg' : i < activePhoto ? 'bg-white/60' : 'bg-white/25'}`} />
              ))}
            </div>
          )}

          {/* Swipe labels */}
          <div className="absolute top-16 left-5 rotate-[-12deg] border-[3px] border-green-400 text-green-400 text-4xl font-black px-5 py-1 rounded-2xl pointer-events-none"
            style={{ opacity: likeOpacity, textShadow: '0 4px 12px rgba(0,0,0,0.4)' }}>LIKE</div>
          <div className="absolute top-16 right-5 rotate-[12deg] border-[3px] border-red-400 text-red-400 text-4xl font-black px-5 py-1 rounded-2xl pointer-events-none"
            style={{ opacity: nopeOpacity, textShadow: '0 4px 12px rgba(0,0,0,0.4)' }}>NOPE</div>

          {/* Match score badge */}
          {profile.matchScore != null && (
            <div className="absolute top-5 right-4 bg-gradient-to-r from-pink-500 to-rose-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg backdrop-blur-sm">
              {profile.matchScore}% match
            </div>
          )}
          {profile.video_intro_url && (
            <div className="absolute top-14 left-4 bg-black/60 backdrop-blur-sm text-white text-xs font-bold px-2.5 py-1.5 rounded-full flex items-center gap-1 shadow-lg">
              <FiPlay size={10} fill="white" /> Intro
            </div>
          )}
          {profile.is_verified && (
            <div className="absolute top-5 left-4 bg-blue-500/90 backdrop-blur-sm text-white text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1 shadow-lg">
              <FiCheck size={12} /> Verified
            </div>
          )}

          {/* Bottom info */}
          <div className="absolute bottom-0 left-0 right-0 p-5 pb-4 text-white z-10">
            <div className="flex items-end justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-[1.7rem] font-extrabold truncate drop-shadow-lg leading-tight">
                    {profile.name || profile.first_name}{profile.age ? `, ${profile.age}` : ''}
                  </h2>
                  {profile.verified && (
                    <div className="flex-shrink-0 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                      <FiCheck size={14} className="text-white" strokeWidth={3} />
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-3 text-white/80 text-sm">
                  {(profile.location || profile.location_name) && (
                    <span className="flex items-center gap-1"><FiMapPin size={12} /> {profile.location || profile.location_name}</span>
                  )}
                  {profile.last_active && (
                    <span className="flex items-center gap-1 text-white/50 text-xs">
                      <FiClock size={10} /> {new Date(profile.last_active).toLocaleDateString() === new Date().toLocaleDateString() ? 'Active today' : 'Recently active'}
                    </span>
                  )}
                </div>
              </div>
              <button onClick={(e) => { e.stopPropagation(); setShowProfile(!showProfile); }}
                className="p-2.5 bg-white/15 backdrop-blur-md rounded-full hover:bg-white/25 transition ml-2 flex-shrink-0">
                <FiChevronUp size={18} className={`text-white transition-transform duration-300 ${showProfile ? 'rotate-180' : ''}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Expanded profile sheet */}
        {showProfile && (
          <div className="absolute bottom-0 left-0 right-0 bg-white dark:bg-dark-card rounded-t-3xl p-5 shadow-2xl z-20 max-h-[55%] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
            style={{ animation: 'slideUp 0.3s ease-out' }}>
            <div className="w-10 h-1 bg-gray-300 dark:bg-dark-border rounded-full mx-auto mb-4" />
            {profile.occupation && (
              <div className="flex items-center gap-2 text-gray-700 dark:text-dark-text text-sm mb-3">
                <div className="w-8 h-8 bg-pink-100 dark:bg-pink-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                  <FiBriefcase size={14} className="text-pink-500" />
                </div>
                <span className="font-medium">{profile.occupation}</span>
              </div>
            )}
            {profile.bio && (
              <div className="mb-4">
                <p className="text-gray-700 dark:text-dark-text text-sm leading-relaxed">{profile.bio}</p>
              </div>
            )}
            {profile.interests?.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-bold text-gray-400 dark:text-dark-muted uppercase tracking-wider mb-2">Interests</p>
                <div className="flex flex-wrap gap-1.5">
                  {profile.interests.map((i) => (
                    <span key={i} className="px-3 py-1.5 bg-gradient-to-r from-pink-50 to-rose-50 dark:from-pink-900/20 dark:to-rose-900/20 text-pink-600 dark:text-pink-400 text-xs font-semibold rounded-full border border-pink-100 dark:border-pink-800/30">{i}</span>
                  ))}
                </div>
              </div>
            )}
            {(profile.height || profile.education) && (
              <div className="flex gap-4 text-sm text-gray-500 dark:text-dark-muted">
                {profile.height && <span>{profile.height} cm</span>}
                {profile.education && <span>{profile.education}</span>}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex justify-center items-center gap-4 py-4 pb-2">
        {/* Rewind */}
        <button onClick={handleRewind} disabled={rewindCount <= 0 || swipedStack.length === 0}
          className="relative group">
          <div className="w-12 h-12 rounded-full bg-white dark:bg-dark-surface shadow-lg shadow-amber-100 dark:shadow-amber-900/20 flex items-center justify-center text-amber-400 group-hover:text-amber-500 group-hover:scale-110 transition-all active:scale-95 disabled:opacity-20 disabled:scale-100">
            <FiRotateCcw size={20} />
          </div>
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-br from-amber-400 to-orange-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-md">{rewindCount}</span>
        </button>

        {/* Nope */}
        <button onClick={() => doSwipe('dislike')} disabled={swiping}
          className="group">
          <div className="w-16 h-16 rounded-full bg-white dark:bg-dark-surface shadow-xl shadow-red-100 dark:shadow-red-900/20 flex items-center justify-center text-red-400 group-hover:text-red-500 group-hover:scale-110 group-hover:shadow-red-200 dark:group-hover:shadow-red-900/40 transition-all active:scale-90 disabled:opacity-50 disabled:scale-100">
            <FiX size={32} strokeWidth={2.5} />
          </div>
        </button>

        {/* Super Like */}
        <button onClick={() => doSwipe('super_like')} disabled={swiping}
          className="group">
          <div className="w-14 h-14 rounded-full bg-white dark:bg-dark-surface shadow-xl shadow-blue-100 dark:shadow-blue-900/20 flex items-center justify-center text-blue-400 group-hover:text-blue-500 group-hover:scale-110 group-hover:shadow-blue-200 dark:group-hover:shadow-blue-900/40 transition-all active:scale-90 disabled:opacity-50 disabled:scale-100">
            <FiStar size={24} strokeWidth={2.5} />
          </div>
        </button>

        {/* Like */}
        <button onClick={() => doSwipe('like')} disabled={swiping}
          className="group">
          <div className="w-16 h-16 rounded-full bg-white dark:bg-dark-surface shadow-xl shadow-green-100 dark:shadow-green-900/20 flex items-center justify-center text-green-400 group-hover:text-green-500 group-hover:scale-110 group-hover:shadow-green-200 dark:group-hover:shadow-green-900/40 transition-all active:scale-90 disabled:opacity-50 disabled:scale-100">
            <FiHeart size={32} strokeWidth={2.5} />
          </div>
        </button>

        {/* Boost */}
        <button onClick={() => doSwipe('boost')} disabled={swiping}
          className="group">
          <div className="w-12 h-12 rounded-full bg-white dark:bg-dark-surface shadow-lg shadow-purple-100 dark:shadow-purple-900/20 flex items-center justify-center text-purple-400 group-hover:text-purple-500 group-hover:scale-110 transition-all active:scale-95 disabled:opacity-20 disabled:scale-100">
            <FiZap size={20} />
          </div>
        </button>
      </div>

      {/* Match popup */}
      {matchPopup && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-6" onClick={() => setMatchPopup(null)}>
          <div className="bg-white dark:bg-dark-card rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl" onClick={(e) => e.stopPropagation()}
            style={{ animation: 'matchPop 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)' }}>
            <div className="relative mb-6">
              <div className="text-6xl mb-2">🎉</div>
              <div className="absolute -top-2 left-1/2 -translate-x-1/2">
                <div className="w-4 h-4 bg-pink-400 rounded-full animate-ping absolute" />
                <div className="w-4 h-4 bg-pink-500 rounded-full relative" />
              </div>
            </div>
            <h2 className="text-3xl font-extrabold bg-gradient-to-r from-pink-500 to-rose-500 bg-clip-text text-transparent mb-2">It's a Match!</h2>
            <p className="text-gray-500 dark:text-dark-muted mb-8">You and <strong className="text-gray-900 dark:text-white">{matchPopup?.name || 'someone'}</strong> liked each other</p>
            <div className="flex gap-3">
              <button onClick={() => setMatchPopup(null)}
                className="flex-1 py-3.5 bg-gray-100 dark:bg-dark-surface text-gray-700 dark:text-dark-text font-bold rounded-2xl hover:bg-gray-200 transition text-sm">
                Keep Swiping
              </button>
              <button onClick={() => { setMatchPopup(null); navigate('/matches'); }}
                className="flex-1 py-3.5 bg-gradient-to-r from-pink-500 to-rose-500 text-white font-bold rounded-2xl hover:shadow-lg transition flex items-center justify-center gap-2 text-sm shadow-lg shadow-pink-200 dark:shadow-pink-900/30">
                <FiMessageCircle size={16} /> Message
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Story Viewer Overlay */}
      {viewerStoryGroup && (
        <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
          <button onClick={() => setViewerStoryGroup(null)} className="absolute top-4 right-4 z-30 p-2 text-white/80 hover:text-white">
            <FiX size={24} />
          </button>
          <div className="absolute top-3 left-3 right-3 flex gap-1 z-20">
            {viewerStoryGroup.stories.map((s, i) => (
              <div key={s.id} className="flex-1 h-0.5 bg-white/30 rounded-full overflow-hidden">
                <div className="h-full bg-white rounded-full transition-all duration-100"
                  style={{ width: i < viewerStoryIdx ? '100%' : i === viewerStoryIdx ? `${storyProgress}%` : '0%' }} />
              </div>
            ))}
          </div>
          <div className="absolute top-6 left-3 right-3 flex items-center gap-2.5 z-20">
            <div className="w-8 h-8 rounded-full overflow-hidden bg-white/20">
              {viewerStoryGroup.user.photos?.[0] ? (
                <img src={viewerStoryGroup.user.photos[0]} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-xs font-bold text-white">{viewerStoryGroup.user.first_name?.[0]}</span>
                </div>
              )}
            </div>
            <p className="text-white font-bold text-sm">{viewerStoryGroup.user.first_name}</p>
          </div>
          <div className="w-full h-full flex items-center justify-center px-4">
            {viewerStoryGroup.stories[viewerStoryIdx]?.content_type === 'image' ? (
              <img src={viewerStoryGroup.stories[viewerStoryIdx].content} alt="" className="max-w-full max-h-full object-contain rounded-lg" />
            ) : (
              <div className="max-w-sm w-full p-8 bg-gradient-to-br from-pink-500 to-purple-600 rounded-2xl text-center">
                <p className="text-white text-lg font-medium leading-relaxed whitespace-pre-wrap">{viewerStoryGroup.stories[viewerStoryIdx]?.content}</p>
              </div>
            )}
          </div>
          <div className="absolute inset-0 flex z-10">
            <div className="w-1/3 h-full" onClick={() => {
              if (viewerStoryIdx > 0) setViewerStoryIdx((i) => i - 1);
              else setViewerStoryGroup(null);
            }} />
            <div className="w-1/3 h-full" />
            <div className="w-1/3 h-full" onClick={() => {
              if (viewerStoryIdx < viewerStoryGroup.stories.length - 1) setViewerStoryIdx((i) => i + 1);
              else setViewerStoryGroup(null);
            }} />
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes matchPop {
          0% { transform: scale(0.3); opacity: 0; }
          50% { transform: scale(1.05); }
          70% { transform: scale(0.95); }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
