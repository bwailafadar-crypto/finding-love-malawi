import { useState, useRef } from 'react';
import { FiPlay, FiPause, FiTrash2, FiVolumeX, FiVolume2 } from 'react-icons/fi';

export default function VideoIntro({ videoUrl, isOwn, onDelete }) {
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [progress, setProgress] = useState(0);
  const [showControls, setShowControls] = useState(false);
  const videoRef = useRef(null);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (playing) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setPlaying(!playing);
  };

  const toggleMute = (e) => {
    e.stopPropagation();
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setMuted(!muted);
    }
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const pct = (videoRef.current.currentTime / videoRef.current.duration) * 100;
    setProgress(pct || 0);
  };

  const handleEnded = () => {
    setPlaying(false);
    setProgress(0);
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    if (onDelete) onDelete();
  };

  if (!videoUrl) return null;

  return (
    <div
      className="relative rounded-2xl overflow-hidden bg-black aspect-[9/16] max-h-64 cursor-pointer group"
      onClick={togglePlay}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
    >
      <video
        ref={videoRef}
        src={videoUrl}
        muted={muted}
        playsInline
        loop={false}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        className="w-full h-full object-cover"
      />

      {!playing && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
          <div className="w-14 h-14 bg-white/90 rounded-full flex items-center justify-center shadow-lg animate-[pulse_2s_infinite]">
            <FiPlay size={24} className="text-pink-500 ml-1" />
          </div>
        </div>
      )}

      {playing && (
        <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-black/20">
          <div className="w-12 h-12 bg-black/50 rounded-full flex items-center justify-center">
            <FiPause size={20} className="text-white" />
          </div>
        </div>
      )}

      <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/30">
        <div
          className="h-full bg-pink-500 transition-all duration-200"
          style={{ width: `${progress}%` }}
        />
      </div>

      <button
        onClick={toggleMute}
        className={`absolute top-2 right-2 p-1.5 bg-black/50 rounded-full transition-opacity ${showControls || playing ? 'opacity-100' : 'opacity-0'}`}
      >
        {muted ? <FiVolumeX size={14} className="text-white" /> : <FiVolume2 size={14} className="text-white" />}
      </button>

      {isOwn && (
        <button
          onClick={handleDelete}
          className="absolute top-2 left-2 p-1.5 bg-red-500/80 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <FiTrash2 size={14} className="text-white" />
        </button>
      )}
    </div>
  );
}
