import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FiArrowLeft, FiPlus, FiX, FiTrash2, FiChevronLeft, FiChevronRight, FiCamera } from 'react-icons/fi';
import api from '../utils/api';

export default function StoriesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [viewerStoryIdx, setViewerStoryIdx] = useState(0);
  const [showCreate, setShowCreate] = useState(false);
  const [newStory, setNewStory] = useState({ content: '', contentType: 'text' });
  const [posting, setPosting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadingStory, setUploadingStory] = useState(false);
  const storyFileRef = useRef(null);

  const loadStories = useCallback(async () => {
    try {
      const data = await api.stories.feed();
      setStories(Array.isArray(data) ? data : []);
    } catch { setStories([]); }
    setLoading(false);
  }, []);

  useEffect(() => { loadStories(); }, [loadStories]);

  // Group stories by user
  const grouped = stories.reduce((acc, s) => {
    const uid = s.user_id;
    if (!acc[uid]) {
      let parsed = [];
      try { parsed = typeof s.photos === 'string' ? JSON.parse(s.photos || '[]') : (s.photos || []); } catch { parsed = []; }
      acc[uid] = { user: { id: uid, first_name: s.first_name, photos: parsed }, stories: [], viewed: s.viewed };
    }
    acc[uid].stories.push(s);
    if (s.viewed) acc[uid].viewed = true;
    return acc;
  }, {});
  const groups = Object.values(grouped);
  const myGroup = groups.find((g) => g.user.id === user?.id);
  const otherGroups = groups.filter((g) => g.user.id !== user?.id);

  // Viewer
  const openViewer = (groupIdx, storyIdx = 0) => {
    const idx = groupIdx === -1 ? 0 : groupIdx;
    setViewerIndex(idx);
    setViewerStoryIdx(storyIdx);
    setViewerOpen(true);
    setProgress(0);
  };

  const currentGroup = viewerOpen ? (viewerIndex === -1 ? myGroup : otherGroups[viewerIndex]) : null;
  const currentStory = currentGroup?.stories?.[viewerStoryIdx];

  // Auto-advance story
  useEffect(() => {
    if (!viewerOpen || !currentStory) return;
    const timer = setTimeout(() => {
      if (viewerStoryIdx < (currentGroup?.stories?.length || 1) - 1) {
        setViewerStoryIdx((i) => i + 1);
        setProgress(0);
      } else if (viewerIndex < otherGroups.length - 1) {
        setViewerIndex((i) => i + 1);
        setViewerStoryIdx(0);
        setProgress(0);
      } else {
        setViewerOpen(false);
      }
    }, 5000);
    return () => clearTimeout(timer);
  }, [viewerOpen, currentStory, viewerStoryIdx, viewerIndex, currentGroup, otherGroups.length]);

  // Progress bar
  useEffect(() => {
    if (!viewerOpen) return;
    setProgress(0);
    const interval = setInterval(() => setProgress((p) => Math.min(p + 2, 100)), 100);
    return () => clearInterval(interval);
  }, [viewerOpen, viewerStoryIdx, viewerIndex]);

  // Mark as viewed
  useEffect(() => {
    if (viewerOpen && currentStory && !currentStory.viewed) {
      api.stories.view(currentStory.id).catch(() => {});
      setStories((prev) => prev.map((s) => s.id === currentStory.id ? { ...s, viewed: 1 } : s));
    }
  }, [viewerOpen, currentStory]);

  const handlePost = async () => {
    if (!newStory.content.trim()) return;
    setPosting(true);
    try {
      await api.stories.post(newStory.content.trim(), newStory.contentType);
      setShowCreate(false);
      setNewStory({ content: '', contentType: 'text' });
      loadStories();
    } catch (err) { console.error('Error:', err.message); }
    setPosting(false);
  };

  const handleStoryImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingStory(true);
    try {
      const result = await api.upload.photo(file);
      setNewStory({ content: result.url, contentType: 'image' });
    } catch (err) { console.error('Error:', err.message); }
    setUploadingStory(false);
    if (storyFileRef.current) storyFileRef.current.value = '';
  };

  const handleDelete = async (storyId) => {
    if (!confirm('Delete this story?')) return;
    try {
      await api.stories.delete(storyId);
      setStories((prev) => prev.filter((s) => s.id !== storyId));
      setViewerOpen(false);
    } catch (err) { console.error('Error:', err.message); }
  };

  if (loading) return (
    <div className="flex justify-center items-center h-[calc(100vh-80px)]">
      <div className="animate-spin rounded-full h-10 w-10 border-4 border-pink-500 border-t-transparent" />
    </div>
  );

  return (
    <div className="px-4 pt-4 pb-4">
      <div className="flex items-center gap-3 mb-5">
        <button onClick={() => navigate(-1)} className="p-2 text-gray-600 dark:text-dark-muted hover:text-gray-900 dark:hover:text-white">
          <FiArrowLeft size={22} />
        </button>
        <h1 className="text-xl font-extrabold text-gray-900 dark:text-white">Stories</h1>
      </div>

      {/* Story rings */}
      <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
        {/* My story / create */}
        <button onClick={() => myGroup ? openViewer(-1) : setShowCreate(true)} className="flex flex-col items-center gap-1.5 flex-shrink-0">
          <div className="relative">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center ${myGroup ? 'story-ring' : 'bg-gray-200 dark:bg-dark-surface border-2 border-dashed border-gray-300 dark:border-dark-border'}`}>
              {user?.photos?.[0] ? (
                <img src={user.photos[0]} alt="" className="w-[58px] h-[58px] rounded-full object-cover" />
              ) : (
                <span className="text-2xl font-bold text-gray-400">{user?.first_name?.[0] || user?.name?.[0] || '?'}</span>
              )}
            </div>
            {!myGroup && (
              <div className="absolute -bottom-0.5 -right-0.5 w-6 h-6 bg-pink-500 rounded-full flex items-center justify-center border-2 border-white dark:border-dark-card">
                <FiPlus size={12} className="text-white" />
              </div>
            )}
          </div>
          <span className="text-[10px] font-medium text-gray-600 dark:text-dark-muted w-16 text-center truncate">
            {myGroup ? 'Your story' : 'Add story'}
          </span>
        </button>

        {/* Other stories */}
        {otherGroups.map((g, i) => (
          <button key={g.user.id} onClick={() => openViewer(i)} className="flex flex-col items-center gap-1.5 flex-shrink-0">
            <div className={`${g.viewed ? 'story-ring-seen' : 'story-ring'} p-0.5 rounded-full`}>
              <div className="w-[58px] h-[58px] rounded-full overflow-hidden bg-white dark:bg-dark-card">
                {g.user.photos?.[0] ? (
                  <img src={g.user.photos[0]} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-200 dark:bg-dark-surface">
                    <span className="text-xl font-bold text-gray-400">{g.user.first_name?.[0] || '?'}</span>
                  </div>
                )}
              </div>
            </div>
            <span className="text-[10px] font-medium text-gray-600 dark:text-dark-muted w-16 text-center truncate">
              {g.user.first_name}
            </span>
          </button>
        ))}

        {otherGroups.length === 0 && !myGroup && (
          <div className="flex-1 text-center py-8 text-gray-400 dark:text-dark-muted">
            <p className="text-sm">No stories yet. Be the first to post!</p>
          </div>
        )}
      </div>

      {/* Stories list */}
      {stories.length === 0 ? (
        <div className="text-center py-16 text-gray-400 dark:text-dark-muted">
          <div className="w-20 h-20 bg-gray-100 dark:bg-dark-surface rounded-full flex items-center justify-center mx-auto mb-4">
            <FiPlus size={32} className="text-gray-300" />
          </div>
          <p className="font-medium mb-1">No active stories</p>
          <p className="text-sm mb-4">Stories disappear after 24 hours</p>
          <button onClick={() => setShowCreate(true)} className="px-6 py-3 bg-pink-500 text-white font-bold rounded-xl hover:bg-pink-600 transition">
            Post a Story
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <h2 className="text-xs font-bold text-gray-400 dark:text-dark-muted uppercase tracking-wider">Recent Stories</h2>
          {otherGroups.map((g, i) => (
            <button key={g.user.id} onClick={() => openViewer(i)}
              className="w-full flex items-center gap-3 bg-white dark:bg-dark-card rounded-2xl p-3 shadow-sm border border-gray-100 dark:border-dark-border hover:shadow-md transition text-left">
              <div className={`${g.viewed ? 'story-ring-seen' : 'story-ring'} p-0.5 rounded-full`}>
                <div className="w-12 h-12 rounded-full overflow-hidden bg-white dark:bg-dark-card">
                  {g.user.photos?.[0] ? (
                    <img src={g.user.photos[0]} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-200 dark:bg-dark-surface">
                      <span className="text-lg font-bold text-gray-400">{g.user.first_name?.[0] || '?'}</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-900 dark:text-white text-sm">{g.user.first_name}</p>
                <p className="text-xs text-gray-400 dark:text-dark-muted">{g.stories.length} {g.stories.length === 1 ? 'story' : 'stories'}</p>
              </div>
              <div className="text-gray-300 dark:text-dark-border"><FiChevronRight size={18} /></div>
            </button>
          ))}
        </div>
      )}

      {/* Story Viewer Overlay */}
      {viewerOpen && currentStory && (
        <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
          {/* Close */}
          <button onClick={() => setViewerOpen(false)} className="absolute top-4 right-4 z-30 p-2 text-white/80 hover:text-white">
            <FiX size={24} />
          </button>

          {/* Prev group */}
          {(viewerIndex > 0 || (viewerIndex === -1 && myGroup)) && (
            <button onClick={() => {
              if (viewerIndex > 0) { setViewerIndex((i) => i - 1); setViewerStoryIdx(0); setProgress(0); }
              else { setViewerIndex(-1); setViewerStoryIdx(0); setProgress(0); }
            }} className="absolute left-2 top-1/2 -translate-y-1/2 z-30 p-2 bg-white/20 rounded-full text-white hover:bg-white/30">
              <FiChevronLeft size={20} />
            </button>
          )}

          {/* Next group */}
          {viewerIndex < otherGroups.length - 1 && (
            <button onClick={() => { setViewerIndex((i) => i + 1); setViewerStoryIdx(0); setProgress(0); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 z-30 p-2 bg-white/20 rounded-full text-white hover:bg-white/30">
              <FiChevronRight size={20} />
            </button>
          )}

          {/* Progress bars */}
          <div className="absolute top-3 left-3 right-3 flex gap-1 z-20">
            {currentGroup?.stories?.map((s, i) => (
              <div key={s.id} className="flex-1 h-0.5 bg-white/30 rounded-full overflow-hidden">
                <div className="h-full bg-white rounded-full transition-all duration-100"
                  style={{ width: i < viewerStoryIdx ? '100%' : i === viewerStoryIdx ? `${progress}%` : '0%' }} />
              </div>
            ))}
          </div>

          {/* User info */}
          <div className="absolute top-6 left-3 right-3 flex items-center gap-2.5 z-20">
            <div className="w-8 h-8 rounded-full overflow-hidden bg-white/20">
              {currentGroup?.user?.photos?.[0] ? (
                <img src={currentGroup.user.photos[0]} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-xs font-bold text-white">{currentGroup?.user?.first_name?.[0]}</span>
                </div>
              )}
            </div>
            <div className="flex-1">
              <p className="text-white font-bold text-sm">{currentGroup?.user?.first_name}</p>
              <p className="text-white/50 text-[10px]">{new Date(currentStory.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
            </div>
            {currentStory.user_id === user?.id && (
              <button onClick={() => handleDelete(currentStory.id)} className="p-2 text-white/60 hover:text-red-400">
                <FiTrash2 size={18} />
              </button>
            )}
          </div>

          {/* Story content */}
          <div className="w-full h-full flex items-center justify-center px-4">
            {currentStory.content_type === 'image' ? (
              <img src={currentStory.content} alt="" className="max-w-full max-h-full object-contain rounded-lg" />
            ) : (
              <div className="max-w-sm w-full p-8 bg-gradient-to-br from-pink-500 to-purple-600 rounded-2xl text-center">
                <p className="text-white text-lg font-medium leading-relaxed whitespace-pre-wrap">{currentStory.content}</p>
              </div>
            )}
          </div>

          {/* Tap zones */}
          <div className="absolute inset-0 flex z-10">
            <div className="w-1/3 h-full" onClick={() => {
              if (viewerStoryIdx > 0) { setViewerStoryIdx((i) => i - 1); setProgress(0); }
              else if (viewerIndex > 0) { setViewerIndex((i) => i - 1); setViewerStoryIdx(0); setProgress(0); }
              else if (viewerIndex === -1 && myGroup) { setViewerIndex(-1); setViewerStoryIdx(0); setProgress(0); }
            }} />
            <div className="w-1/3 h-full" />
            <div className="w-1/3 h-full" onClick={() => {
              if (viewerStoryIdx < (currentGroup?.stories?.length || 1) - 1) { setViewerStoryIdx((i) => i + 1); setProgress(0); }
              else if (viewerIndex < otherGroups.length - 1) { setViewerIndex((i) => i + 1); setViewerStoryIdx(0); setProgress(0); }
              else { setViewerOpen(false); }
            }} />
          </div>
        </div>
      )}

      {/* Create Story Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center" onClick={() => setShowCreate(false)}>
          <div className="bg-white dark:bg-dark-card rounded-t-3xl sm:rounded-3xl w-full max-w-md p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="w-10 h-1 bg-gray-300 dark:bg-dark-border rounded-full mx-auto mb-4" />
            <h2 className="text-lg font-extrabold text-gray-900 dark:text-white mb-4">New Story</h2>

            {/* Content type toggle */}
            <div className="flex gap-2 mb-4">
              {[{ id: 'text', label: 'Text' }, { id: 'image', label: 'Image' }].map(({ id, label }) => (
                <button key={id} onClick={() => setNewStory({ ...newStory, contentType: id })}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition ${newStory.contentType === id ? 'bg-pink-500 text-white' : 'bg-gray-100 dark:bg-dark-surface text-gray-600 dark:text-dark-muted'}`}>
                  {label}
                </button>
              ))}
            </div>

            {newStory.contentType === 'text' ? (
              <textarea value={newStory.content} onChange={(e) => setNewStory({ ...newStory, content: e.target.value })}
                rows={4} placeholder="What's on your mind?"
                className="w-full px-4 py-3 bg-gray-100 dark:bg-dark-surface rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 resize-none text-gray-900 dark:text-white mb-4" />
            ) : (
              <div className="space-y-3 mb-4">
                <input ref={storyFileRef} type="file" accept="image/*" onChange={handleStoryImageUpload} className="hidden" />
                <button onClick={() => storyFileRef.current?.click()} disabled={uploadingStory}
                  className="w-full py-8 border-2 border-dashed border-gray-300 dark:border-dark-border rounded-xl flex flex-col items-center gap-2 text-gray-400 hover:border-pink-400 hover:text-pink-400 transition disabled:opacity-50">
                  {uploadingStory ? (
                    <div className="animate-spin rounded-full h-6 w-6 border-2 border-pink-500 border-t-transparent" />
                  ) : (
                    <>
                      <FiCamera size={28} />
                      <span className="text-sm font-semibold">Tap to upload photo</span>
                    </>
                  )}
                </button>
                <div className="text-center text-xs text-gray-400 dark:text-dark-muted">or</div>
                <input type="url" value={newStory.content} onChange={(e) => setNewStory({ ...newStory, content: e.target.value })}
                  placeholder="Paste image URL"
                  className="w-full px-4 py-3 bg-gray-100 dark:bg-dark-surface rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 text-gray-900 dark:text-white" />
              </div>
            )}

            {newStory.contentType === 'image' && newStory.content && (
              <div className="rounded-xl overflow-hidden mb-4 aspect-video bg-gray-100 dark:bg-dark-surface">
                <img src={newStory.content} alt="" className="w-full h-full object-cover" onError={(e) => e.target.style.display = 'none'} />
              </div>
            )}

            <button onClick={handlePost} disabled={!newStory.content.trim() || posting}
              className="w-full py-3.5 bg-gradient-to-r from-pink-500 to-rose-500 text-white font-bold rounded-xl text-lg shadow-lg shadow-pink-200 dark:shadow-pink-900/30 hover:shadow-xl transition disabled:opacity-50">
              {posting ? 'Posting...' : 'Share Story'}
            </button>
            <p className="text-center text-xs text-gray-400 dark:text-dark-muted mt-3">Stories expire after 24 hours</p>
          </div>
        </div>
      )}
    </div>
  );
}
