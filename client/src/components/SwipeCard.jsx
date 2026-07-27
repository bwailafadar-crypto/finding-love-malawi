import { useState, useRef, useEffect } from 'react';
import { FiHeart, FiX, FiStar, FiRefreshCw, FiMapPin, FiBriefcase, FiBookOpen, FiZap } from 'react-icons/fi';
import { getAge } from '../utils/helpers';
import { notifyNewMatch, requestNotificationPermission } from '../utils/notifications';
import api from '../utils/api';

export default function SwipeCard({ profiles: initialProfiles }) {
  const [profiles, setProfiles] = useState(initialProfiles || []);
  const [idx, setIdx] = useState(0);
  const [drag, setDrag] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [matched, setMatched] = useState(null);

  useEffect(() => { setProfiles(initialProfiles || []); setIdx(0); }, [initialProfiles]);
  useEffect(() => { requestNotificationPermission(); }, []);

  const cur = profiles[idx];

  const doSwipe = async (action) => {
    if (!cur) return;
    setDrag(0);
    if (action === 'like' || action === 'super_like') {
      const r = await api.swipes.swipe(cur.user_id, action);
      if (r.isMatch) { setMatched(cur); notifyNewMatch(cur.first_name); setTimeout(() => setMatched(null), 3000); }
    } else {
      await api.swipes.swipe(cur.user_id, action);
    }
    setIdx((p) => p + 1);
  };

  const onTouchStart = (e) => { setDragging(true); setStartX(e.touches[0].clientX); };
  const onTouchMove = (e) => { if (dragging) setDrag(e.touches[0].clientX - startX); };
  const onTouchEnd = () => { setDragging(false); drag > 100 ? doSwipe('like') : drag < -100 ? doSwipe('dislike') : setDrag(0); };

  const onMouseDown = (e) => { setDragging(true); setStartX(e.clientX); };

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e) => setDrag(e.clientX - startX);
    const onUp = () => { setDragging(false); drag > 100 ? doSwipe('like') : drag < -100 ? doSwipe('dislike') : setDrag(0); };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [dragging, drag, startX, idx]);

  const loadMore = async () => { try { const d = await api.swipes.discoverScored(); setProfiles(d); setIdx(0); } catch(e) { console.error(e); } };

  if (!cur) return (
    <div className="flex flex-col items-center justify-center h-[65vh] px-4">
      <div className="text-6xl mb-4">{'\u{1F60A}'}</div>
      <h2 className="text-2xl font-bold text-gray-800 mb-2">No more profiles!</h2>
      <p className="text-gray-500 mb-6 text-center">Check back later for new people near you</p>
      <button onClick={loadMore} className="flex items-center gap-2 gradient-primary text-white py-3 px-6 rounded-full font-semibold hover:opacity-90 transition">
        <FiRefreshCw size={18} /> Refresh
      </button>
    </div>
  );

  const rotation = drag * 0.1;
  const likeOp = Math.max(0, drag / 100);
  const nopeOp = Math.max(0, -drag / 100);

  const photos = cur.photos || [];
  const img = photos[0] || 'https://via.placeholder.com/400x600?text=No+Photo';
  const matchScore = cur.matchScore || 0;
  const sharedInterests = cur.sharedInterests || [];
  const matchReasons = cur.matchReasons || [];

  return (
    <div className="relative px-4">
      {matched && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="match-animation text-center">
            <h2 className="text-4xl font-bold text-white mb-2">It's a Match!</h2>
            <p className="text-white/80 mb-4">You and {matched.first_name} liked each other</p>
            <img src={photos[0] || 'https://via.placeholder.com/128'} alt={matched.first_name}
              className="w-32 h-32 rounded-full object-cover border-4 border-pink-500 mx-auto" />
          </div>
        </div>
      )}

      {/* Match score badge */}
      {matchScore > 60 && (
        <div className="absolute top-2 right-8 z-10 flex items-center gap-1 bg-gradient-to-r from-pink-500 to-purple-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg">
          <FiZap size={12} /> {matchScore}% Match
        </div>
      )}

      <div className="relative h-[65vh] max-w-sm mx-auto touch-none select-none cursor-grab active:cursor-grabbing"
        onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
        onMouseDown={onMouseDown}
        style={{ transform: `translateX(${drag}px) rotate(${rotation}deg)`, transition: dragging ? 'none' : 'transform 0.3s ease' }}>
        <div className="absolute inset-0 rounded-2xl overflow-hidden shadow-xl bg-white">
          <img src={img} alt={cur.first_name} className="w-full h-full object-cover" draggable={false} />
          <div className="absolute top-8 left-8 bg-green-500 text-white px-4 py-2 rounded-lg text-2xl font-bold transform -rotate-12" style={{ opacity: likeOp }}>LIKE</div>
          <div className="absolute top-8 right-8 bg-red-500 text-white px-4 py-2 rounded-lg text-2xl font-bold transform rotate-12" style={{ opacity: nopeOp }}>NOPE</div>
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
            <h2 className="text-3xl font-bold">{cur.first_name}{cur.last_name ? ` ${cur.last_name}` : ''} <span className="font-normal text-xl">{getAge(cur.date_of_birth)}</span></h2>
            {cur.is_verified ? <span className="text-blue-400 text-sm">{'\u2713'} Verified</span> : null}
            <div className="mt-3 space-y-1 text-sm text-white/80">
              {cur.occupation && <p className="flex items-center gap-2"><FiBriefcase size={14} /> {cur.occupation}</p>}
              {cur.education && <p className="flex items-center gap-2"><FiBookOpen size={14} /> {cur.education}</p>}
              {cur.location_name && <p className="flex items-center gap-2"><FiMapPin size={14} /> {cur.location_name}</p>}
            </div>
            {cur.bio && <p className="mt-3 text-sm text-white/70 line-clamp-2">{cur.bio}</p>}

            {sharedInterests.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {sharedInterests.slice(0, 5).map((i) => (
                  <span key={i} className="bg-pink-500/40 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-full font-medium">{i}</span>
                ))}
              </div>
            )}

            {cur.interests?.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {cur.interests.filter(i => !sharedInterests.includes(i)).slice(0, 3).map((i) => (
                  <span key={i} className="bg-white/20 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-full">{i}</span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex justify-center items-center gap-4 mt-6">
        <button onClick={() => doSwipe('dislike')} className="w-14 h-14 rounded-full bg-white shadow-lg flex items-center justify-center text-red-500 hover:scale-110 transition"><FiX size={28} /></button>
        <button onClick={() => doSwipe('super_like')} className="w-12 h-12 rounded-full bg-white shadow-lg flex items-center justify-center text-blue-500 hover:scale-110 transition"><FiStar size={24} /></button>
        <button onClick={() => doSwipe('like')} className="w-14 h-14 rounded-full bg-white shadow-lg flex items-center justify-center text-green-500 hover:scale-110 transition"><FiHeart size={28} /></button>
      </div>
    </div>
  );
}
