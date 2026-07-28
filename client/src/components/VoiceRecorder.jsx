import { useState, useRef, useCallback, useEffect } from 'react';
import { FiMic, FiSquare } from 'react-icons/fi';

export default function VoiceRecorder({ onRecordingComplete, onCancel }) {
  const [recording, setRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const startTimeRef = useRef(0);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';
      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        if (timerRef.current) clearInterval(timerRef.current);
        const blob = new Blob(chunksRef.current, { type: mimeType });
        if (blob.size > 0 && onRecordingComplete) {
          onRecordingComplete(blob);
        }
      };

      recorder.start();
      setRecording(true);
      setDuration(0);
      startTimeRef.current = Date.now();
      timerRef.current = setInterval(() => {
        setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 1000);
    } catch (err) {
      console.error('Microphone access denied:', err);
    }
  }, [onRecordingComplete]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setRecording(false);
  }, []);

  const cancelRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.ondataavailable = null;
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
    }
    if (timerRef.current) clearInterval(timerRef.current);
    setRecording(false);
    setDuration(0);
    if (onCancel) onCancel();
  }, [onCancel]);

  if (recording) {
    return (
      <div className="flex items-center gap-3 px-4 py-2">
        <button onClick={cancelRecording} className="p-2 text-gray-400 hover:text-red-500 transition">
          <FiSquare size={18} />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
          <span className="text-sm font-mono text-red-500 font-semibold">{formatTime(duration)}</span>
        </div>
        <div className="flex-1 h-1 bg-gray-200 dark:bg-dark-surface rounded-full overflow-hidden">
          <div
            className="h-full bg-red-500 transition-all duration-300"
            style={{ width: `${Math.min((duration / 60) * 100, 100)}%` }}
          />
        </div>
        <button
          onClick={stopRecording}
          className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center animate-[pulse_1.5s_infinite] shadow-lg"
        >
          <FiMic size={18} className="text-white" />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={startRecording}
      className="p-2.5 text-gray-400 dark:text-dark-muted hover:text-pink-500 transition"
      title="Record voice message"
    >
      <FiMic size={20} />
    </button>
  );
}
