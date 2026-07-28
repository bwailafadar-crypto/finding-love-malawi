import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../hooks/useSocket';
import { FiArrowLeft, FiSend, FiPhone, FiVideo, FiMoreVertical, FiInfo, FiSmile, FiCheck, FiClock, FiMic, FiPlay, FiPause, FiMessageCircle } from 'react-icons/fi';
import api from '../utils/api';
import VoiceRecorder from '../components/VoiceRecorder';
import LazyImage from '../components/LazyImage';

const REACTIONS = ['❤️', '😂', '😮', '😢', '👍', '🔥'];
const REPORT_REASONS = ['Inappropriate content', 'Harassment', 'Fake profile', 'Spam', 'Other'];

function AudioMessage({ content, isMine }) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef(null);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (playing) audioRef.current.pause();
    else audioRef.current.play();
  };

  return (
    <div className={`flex items-center gap-2 px-3 py-2.5 rounded-2xl min-w-[160px] ${
      isMine ? 'bg-pink-500 text-white rounded-br-md' : 'bg-white dark:bg-dark-surface text-gray-800 dark:text-dark-text rounded-bl-md shadow-sm'
    }`}>
      <audio
        ref={audioRef}
        src={content}
        onTimeUpdate={() => {
          if (audioRef.current) setProgress((audioRef.current.currentTime / audioRef.current.duration) * 100);
        }}
        onEnded={() => { setPlaying(false); setProgress(0); }}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        preload="metadata"
      />
      <button onClick={togglePlay} className="flex-shrink-0">
        {playing ? <FiPause size={16} /> : <FiPlay size={16} className="ml-0.5" />}
      </button>
      <div className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden">
        <div className="h-full bg-current transition-all duration-200 rounded-full" style={{ width: `${progress || 0}%` }} />
      </div>
      <FiMic size={12} className="flex-shrink-0 opacity-60" />
    </div>
  );
}

export default function ChatPage() {
  const { matchId } = useParams();
  const { user } = useAuth();
  const socket = useSocket();
  const navigate = useNavigate();
  const [match, setMatch] = useState(null);
  const [allMatches, setAllMatches] = useState([]);
  const [messages, setMessages] = useState([]);
  const [newMsg, setNewMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [otherTyping, setOtherTyping] = useState(false);
  const [online, setOnline] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showGif, setShowGif] = useState(false);
  const [gifSearch, setGifSearch] = useState('');
  const [gifs, setGifs] = useState([]);
  const [reactingTo, setReactingTo] = useState(null);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportDesc, setReportDesc] = useState('');
  const [reportSuccess, setReportSuccess] = useState(false);
  const [blockSuccess, setBlockSuccess] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const messagesEnd = useRef(null);
  const typingTimeout = useRef(null);
  const menuRef = useRef(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [mRes, msgRes] = await Promise.all([
          api.matches.list().catch(() => []),
          api.messages.list(matchId).catch(() => []),
        ]);
        const list = Array.isArray(mRes) ? mRes : mRes.matches || [];
        setAllMatches(list);
        const m = list.find((x) => String(x.match_id ?? x.id) === String(matchId));
        if (m) setMatch(m);
        const msgs = Array.isArray(msgRes) ? msgRes : msgRes.messages || [];
        setMessages(msgs);
      } catch (err) { console.error('Error:', err.message); }
      setLoading(false);
    };
    load();
  }, [matchId]);

  useEffect(() => { messagesEnd.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setShowMenu(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!socket || !matchId) return;
    socket.emit('join_chat', matchId);
    socket.on('new_message', (msg) => { if (String(msg.match_id) === String(matchId)) setMessages((prev) => [...prev, msg]); });
    socket.on('message_read', ({ matchId: mId }) => {
      if (String(mId) === String(matchId)) setMessages((prev) => prev.map((m) => m.sender_id === user.id ? { ...m, is_read: 1 } : m));
    });
    socket.on('message_reaction', ({ messageId, reaction, matchId: mId }) => {
      if (String(mId) === String(matchId)) setMessages((prev) => prev.map((m) => m.id === messageId ? { ...m, reaction } : m));
    });
    socket.on('user_typing', ({ matchId: mId }) => { if (String(mId) === String(matchId)) setOtherTyping(true); });
    socket.on('user_stop_typing', ({ matchId: mId }) => { if (String(mId) === String(matchId)) setOtherTyping(false); });
    socket.on('online_users', (users) => { if (match?.other_user?.id) setOnline(users.includes(match.other_user.id)); });
    return () => { socket.emit('leave_chat', matchId); socket.off('new_message'); socket.off('user_typing'); socket.off('user_stop_typing'); socket.off('message_read'); socket.off('message_reaction'); };
  }, [socket, matchId, match?.other_user?.id]);

  const handleTyping = () => {
    socket?.emit('typing', { matchId, userId: user.id });
    clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => socket?.emit('stop_typing', { matchId, userId: user.id }), 2000);
  };

  const sendMessage = async (content, type = 'text') => {
    if (!content?.trim() || sending) return;
    setSending(true);
    const msg = content.trim();
    setNewMsg('');
    try {
      const sent = await api.messages.send(matchId, msg, type);
      setMessages((prev) => [...prev, sent]);
      socket?.emit('stop_typing', { matchId, userId: user.id });
    } catch { setNewMsg(msg); }
    setSending(false);
  };

  const handleReact = async (messageId, reaction) => {
    try {
      setMessages((prev) => prev.map((m) => m.id === messageId ? { ...m, reaction } : m));
      setReactingTo(null);
      await api.messages.react(matchId, messageId, reaction);
    } catch (err) { console.error('Error:', err.message); }
  };

  const searchGifs = async () => {
    if (!gifSearch.trim()) return;
    try {
      const placeholder = Array.from({ length: 8 }, (_, i) => ({
        id: i,
        url: `https://media.giphy.com/media/${['l0MYt5jPR6QX5pnqM', '3o7btZ1GtDz2dGBrFS', 'l0HlBO7eyXzSZkJri', 'l46Cy1rHbQ92uuLXa'][i % 4]}/giphy.gif`,
        preview: `https://media.giphy.com/media/${['l0MYt5jPR6QX5pnqM', '3o7btZ1GtDz2dGBrFS', 'l0HlBO7eyXzSZkJri', 'l46Cy1rHbQ92uuLXa'][i % 4]}/200.gif`,
      }));
      setGifs(placeholder);
    } catch (err) { console.error('Error:', err.message); }
  };

  const sendGif = (url) => { sendMessage(url, 'image'); setShowGif(false); setGifs([]); setGifSearch(''); };

  const handleVoiceRecording = useCallback(async (blob) => {
    setShowVoiceRecorder(false);
    try {
      const result = await api.upload.audio(new File([blob], 'voice.webm', { type: 'audio/webm' }));
      if (result.url) {
        sendMessage(result.url, 'audio');
      }
    } catch (err) {
      console.error('Voice upload error:', err);
    }
  }, [sendMessage]);

  const handleBlock = async () => {
    if (!otherUser.id) return;
    setActionLoading(true);
    try {
      await api.reports.block(otherUser.id);
      setBlockSuccess(true);
      setTimeout(() => navigate('/matches'), 1500);
    } catch (err) { console.error('Block error:', err.message); }
    setActionLoading(false);
  };

  const handleReport = async () => {
    if (!reportReason || !otherUser.id) return;
    setActionLoading(true);
    try {
      await api.reports.report(otherUser.id, reportReason, reportDesc);
      setReportSuccess(true);
      setTimeout(() => { setShowReportModal(false); setReportSuccess(false); setReportReason(''); setReportDesc(''); }, 2000);
    } catch (err) { console.error('Report error:', err.message); }
    setActionLoading(false);
  };

  const otherUser = match?.other_user || {
    id: match?.other_user_id || '',
    name: match?.first_name ? `${match.first_name} ${match.last_name || ''}`.trim() : 'Match',
    photos: match?.photos || [],
  };

  const renderStatus = (msg) => {
    if (msg.sender_id !== user.id) return null;
    if (msg.is_read) return <span className="text-blue-400 font-bold text-xs">✓✓</span>;
    return <span className="text-gray-400 font-bold text-xs">✓</span>;
  };

  if (loading) return (
    <div className="flex justify-center items-center h-screen dark:bg-dark-bg">
      <div className="animate-spin rounded-full h-10 w-10 border-4 border-pink-500 border-t-transparent" />
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-dark-bg transition-colors">
      {/* Desktop sidebar - match list */}
      <div className="hidden lg:flex lg:flex-col lg:w-80 xl:w-96 bg-white dark:bg-dark-card border-r border-gray-100 dark:border-dark-border flex-shrink-0">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-dark-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center">
              <FiMessageCircle size={14} className="text-white" />
            </div>
            <h2 className="text-lg font-extrabold text-gray-900 dark:text-white">Messages</h2>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {allMatches.map((m) => {
            const ou = m.other_user || {};
            const otherName = ou.first_name ? `${ou.first_name} ${ou.last_name || ''}`.trim() : m.first_name ? `${m.first_name} ${m.last_name || ''}`.trim() : 'Match';
            const otherPhoto = ou.photos?.[0] || m.photos?.[0] || '';
            const isActive = String(m.match_id ?? m.id) === String(matchId);
            return (
              <button key={m.match_id ?? m.id} onClick={() => navigate(`/chat/${m.match_id ?? m.id}`)}
                className={`w-full flex items-center gap-3 px-5 py-3 transition text-left ${
                  isActive
                    ? 'bg-pink-50 dark:bg-pink-900/20 border-r-2 border-pink-500'
                    : 'hover:bg-gray-50 dark:hover:bg-dark-surface'
                }`}>
                <div className="relative flex-shrink-0">
                  <LazyImage src={otherPhoto || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80&h=80&fit=crop'}
                    alt="" className="w-12 h-12 rounded-full bg-gray-100 dark:bg-dark-surface" />
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 rounded-full border-2 border-white dark:border-dark-card" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`font-bold text-sm truncate ${isActive ? 'text-pink-600 dark:text-pink-400' : 'text-gray-900 dark:text-white'}`}>{otherName}</p>
                  <p className="text-xs text-gray-400 dark:text-dark-muted truncate">Tap to open chat</p>
                </div>
              </button>
            );
          })}
          {allMatches.length === 0 && (
            <div className="px-5 py-12 text-center text-gray-400 dark:text-dark-muted">
              <p className="text-sm">No matches yet</p>
            </div>
          )}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col min-w-0">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-dark-card border-b border-gray-100 dark:border-dark-border sticky top-0 z-10">
        <button onClick={() => navigate(-1)} className="p-1 text-gray-600 dark:text-dark-muted hover:text-gray-900 dark:hover:text-white md:hidden">
          <FiArrowLeft size={22} />
        </button>
        <div className="relative">
          <LazyImage src={otherUser.photos?.[0] || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80&h=80&fit=crop'}
            alt="" className="w-10 h-10 rounded-full bg-gray-100" />
          {online && <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 rounded-full border-2 border-white dark:border-dark-card" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-gray-900 dark:text-white text-sm truncate">{otherUser.name}</p>
          <p className="text-xs text-gray-400 dark:text-dark-muted">{otherTyping ? 'Typing...' : online ? 'Online' : 'Offline'}</p>
        </div>
        <div className="relative" ref={menuRef}>
          <button onClick={() => setShowMenu(!showMenu)} className="p-2 text-gray-400 dark:text-dark-muted hover:text-gray-600 dark:hover:text-white">
            <FiMoreVertical size={20} />
          </button>
          {showMenu && (
            <div className="absolute right-0 top-10 bg-white dark:bg-dark-card shadow-xl rounded-xl border border-gray-100 dark:border-dark-border py-1 w-48 z-20">
              <button onClick={() => { navigate(`/call/${matchId}/${otherUser.id}`); setShowMenu(false); }}
                className="w-full px-4 py-2.5 text-left text-sm text-gray-700 dark:text-dark-text hover:bg-gray-50 dark:hover:bg-dark-surface flex items-center gap-2">
                <FiPhone size={16} /> Voice Call
              </button>
              <button onClick={() => { navigate(`/call/${matchId}/${otherUser.id}`); setShowMenu(false); }}
                className="w-full px-4 py-2.5 text-left text-sm text-gray-700 dark:text-dark-text hover:bg-gray-50 dark:hover:bg-dark-surface flex items-center gap-2">
                <FiVideo size={16} /> Video Call
              </button>
              <button onClick={() => { setShowMenu(false); }}
                className="w-full px-4 py-2.5 text-left text-sm text-gray-700 dark:text-dark-text hover:bg-gray-50 dark:hover:bg-dark-surface flex items-center gap-2">
                <FiInfo size={16} /> Profile
              </button>
              <div className="border-t border-gray-100 dark:border-dark-border my-1" />
              <button onClick={() => { setShowMenu(false); setShowReportModal(true); }}
                className="w-full px-4 py-2.5 text-left text-sm text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 flex items-center gap-2">
                Report User
              </button>
              <button onClick={() => { setShowMenu(false); setShowBlockModal(true); }}
                className="w-full px-4 py-2.5 text-left text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2">
                Block User
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center py-12 text-gray-400 dark:text-dark-muted">
            <div className="w-16 h-16 bg-pink-100 dark:bg-pink-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
              <FiSmile size={28} className="text-pink-400" />
            </div>
            <p className="font-medium">You matched with {otherUser.name}!</p>
            <p className="text-sm mt-1">Send a message to start the conversation</p>
          </div>
        )}
        {messages.map((msg, i) => {
          const isMine = msg.sender_id === user.id;
          const showAvatar = !isMine && (i === 0 || messages[i - 1]?.sender_id !== msg.sender_id);
          return (
            <div key={msg.id || i} className={`flex items-end gap-2 ${isMine ? 'justify-end' : 'justify-start'}`}>
              {!isMine && showAvatar && (
                <LazyImage src={otherUser.photos?.[0] || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=40&h=40&fit=crop'}
                  alt="" className="w-7 h-7 rounded-full bg-gray-100 flex-shrink-0" />
              )}
              {!isMine && !showAvatar && <div className="w-7 flex-shrink-0" />}
              <div className="relative max-w-[75%] group" onDoubleClick={() => setReactingTo(msg.id)}>
                {msg.message_type === 'image' ? (
                  <img src={msg.content} alt="" className="rounded-2xl max-w-[250px] shadow-sm" />
                ) : msg.message_type === 'audio' ? (
                  <AudioMessage content={msg.content} isMine={isMine} />
                ) : (
                  <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                    isMine ? 'bg-pink-500 text-white rounded-br-md' : 'bg-white dark:bg-dark-surface text-gray-800 dark:text-dark-text rounded-bl-md shadow-sm'
                  }`}>
                    {msg.content}
                  </div>
                )}
                <div className={`flex items-center gap-1 mt-0.5 ${isMine ? 'justify-end' : 'justify-start'}`}>
                  <span className="text-[10px] text-gray-400 dark:text-dark-muted">
                    {msg.created_at ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                  </span>
                  {renderStatus(msg)}
                </div>
                {msg.reaction && (
                  <div className={`absolute -bottom-2 ${isMine ? 'right-2' : 'left-2'} bg-white dark:bg-dark-surface rounded-full px-1.5 py-0.5 text-xs shadow-sm border border-gray-100 dark:border-dark-border`}>
                    {msg.reaction}
                  </div>
                )}
                {reactingTo === msg.id && (
                  <div className="absolute -top-10 left-0 bg-white dark:bg-dark-card rounded-full shadow-lg px-2 py-1 flex gap-1 border border-gray-100 dark:border-dark-border z-20">
                    {REACTIONS.map((r) => (
                      <button key={r} onClick={() => handleReact(msg.id, r)}
                        className="text-lg hover:scale-125 transition px-1">{r}</button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {otherTyping && (
          <div className="flex items-center gap-2">
            <div className="px-4 py-3 bg-white dark:bg-dark-surface rounded-2xl rounded-bl-md shadow-sm">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEnd} />
      </div>

      {/* GIF panel */}
      {showGif && (
        <div className="border-t border-gray-100 dark:border-dark-border bg-white dark:bg-dark-card p-3">
          <div className="flex gap-2 mb-3">
            <input type="text" value={gifSearch} onChange={(e) => setGifSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && searchGifs()}
              placeholder="Search GIFs..."
              className="flex-1 px-3 py-2 bg-gray-100 dark:bg-dark-surface rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-pink-500" />
            <button onClick={searchGifs} className="px-3 py-2 bg-pink-500 text-white rounded-xl text-sm font-bold">Search</button>
          </div>
          <div className="grid grid-cols-4 gap-2 max-h-40 overflow-y-auto">
            {gifs.map((g) => (
              <button key={g.id} onClick={() => sendGif(g.url)} className="rounded-lg overflow-hidden aspect-square">
                <img src={g.preview} alt="" className="w-full h-full object-cover hover:opacity-80 transition" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="px-4 py-3 bg-white dark:bg-dark-card border-t border-gray-100 dark:border-dark-border safe-bottom">
        {showVoiceRecorder ? (
          <VoiceRecorder
            onRecordingComplete={handleVoiceRecording}
            onCancel={() => setShowVoiceRecorder(false)}
          />
        ) : (
          <div className="flex items-end gap-2">
            <button onClick={() => setShowGif(!showGif)}
              className={`p-2.5 rounded-full transition ${showGif ? 'bg-pink-500 text-white' : 'text-gray-400 dark:text-dark-muted hover:text-gray-600'}`}>
              <FiSmile size={20} />
            </button>
            <input type="text" value={newMsg} onChange={(e) => { setNewMsg(e.target.value); handleTyping(); }}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage(newMsg)}
              placeholder="Type a message..."
              className="flex-1 px-4 py-3 bg-gray-100 dark:bg-dark-surface rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 focus:bg-white dark:focus:bg-dark-surface transition"
              disabled={sending} />
            {newMsg.trim() ? (
              <button onClick={() => sendMessage(newMsg)} disabled={sending}
                className="w-11 h-11 bg-pink-500 text-white rounded-full flex items-center justify-center flex-shrink-0 hover:bg-pink-600 transition disabled:opacity-40">
                <FiSend size={18} />
              </button>
            ) : (
              <button onClick={() => setShowVoiceRecorder(true)}
                className="w-11 h-11 bg-pink-500 text-white rounded-full flex items-center justify-center flex-shrink-0 hover:bg-pink-600 transition">
                <FiMic size={18} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Block Confirmation Modal */}
      {showBlockModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => { if (!blockSuccess && !actionLoading) setShowBlockModal(false); }} />
          <div className="relative w-full max-w-sm bg-white dark:bg-dark-card rounded-3xl shadow-2xl overflow-hidden animate-[slideUp_0.3s_ease-out]"
            style={{ animation: 'slideUp 0.3s ease-out' }}>
            <div className="p-6 text-center">
              {blockSuccess ? (
                <>
                  <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">User Blocked</h3>
                  <p className="text-sm text-gray-500 dark:text-dark-muted mt-2">Returning to matches...</p>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">Block this user?</h3>
                  <p className="text-sm text-gray-500 dark:text-dark-muted mt-2">They won't be able to message you.</p>
                  <div className="flex gap-3 mt-6">
                    <button onClick={() => setShowBlockModal(false)}
                      className="flex-1 px-4 py-3 bg-gray-100 dark:bg-dark-surface text-gray-700 dark:text-dark-text rounded-2xl text-sm font-semibold hover:bg-gray-200 dark:hover:bg-gray-700 transition">
                      Cancel
                    </button>
                    <button onClick={handleBlock} disabled={actionLoading}
                      className="flex-1 px-4 py-3 bg-red-500 text-white rounded-2xl text-sm font-semibold hover:bg-red-600 transition disabled:opacity-50">
                      {actionLoading ? 'Blocking...' : 'Block'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
          <style>{`@keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }`}</style>
        </div>
      )}

      {/* Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => { if (!reportSuccess && !actionLoading) { setShowReportModal(false); setReportReason(''); setReportDesc(''); } }} />
          <div className="relative w-full max-w-sm bg-white dark:bg-dark-card rounded-3xl shadow-2xl overflow-hidden animate-[slideUp_0.3s_ease-out]"
            style={{ animation: 'slideUp 0.3s ease-out' }}>
            <div className="p-6">
              {reportSuccess ? (
                <div className="text-center py-4">
                  <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">Report submitted. Thank you.</h3>
                </div>
              ) : (
                <>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white text-center mb-1">Report User</h3>
                  <p className="text-sm text-gray-500 dark:text-dark-muted text-center mb-5">Why are you reporting {otherUser.name}?</p>
                  <div className="space-y-2 mb-4">
                    {REPORT_REASONS.map((r) => (
                      <button key={r} onClick={() => setReportReason(r)}
                        className={`w-full px-4 py-3 rounded-2xl text-sm text-left transition flex items-center justify-between ${
                          reportReason === r
                            ? 'bg-pink-50 dark:bg-pink-900/20 border-2 border-pink-500 text-pink-600 dark:text-pink-400 font-semibold'
                            : 'bg-gray-50 dark:bg-dark-surface border-2 border-transparent text-gray-700 dark:text-dark-text hover:border-gray-200 dark:hover:border-dark-border'
                        }`}>
                        <span>{r}</span>
                        {reportReason === r && (
                          <div className="w-5 h-5 bg-pink-500 rounded-full flex items-center justify-center flex-shrink-0">
                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                  <textarea value={reportDesc} onChange={(e) => setReportDesc(e.target.value)}
                    placeholder="Additional details (optional)"
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-dark-surface border border-gray-200 dark:border-dark-border rounded-2xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-pink-500 mb-4"
                    rows={3} />
                  <div className="flex gap-3">
                    <button onClick={() => { setShowReportModal(false); setReportReason(''); setReportDesc(''); }}
                      className="flex-1 px-4 py-3 bg-gray-100 dark:bg-dark-surface text-gray-700 dark:text-dark-text rounded-2xl text-sm font-semibold hover:bg-gray-200 dark:hover:bg-gray-700 transition">
                      Cancel
                    </button>
                    <button onClick={handleReport} disabled={!reportReason || actionLoading}
                      className="flex-1 px-4 py-3 bg-pink-500 text-white rounded-2xl text-sm font-semibold hover:bg-pink-600 transition disabled:opacity-50">
                      {actionLoading ? 'Submitting...' : 'Submit'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
          <style>{`@keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }`}</style>
        </div>
      )}
    </div>
    </div>
  );
}
