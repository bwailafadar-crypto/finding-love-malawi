import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSocket } from '../hooks/useSocket';
import { FiPhoneOff, FiMic, FiMicOff, FiVideo, FiVideoOff } from 'react-icons/fi';

const servers = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }] };

export default function VideoCallPage() {
  const { matchId, userId } = useParams();
  const socket = useSocket();
  const navigate = useNavigate();
  const [callState, setCallState] = useState('connecting');
  const [timer, setTimer] = useState(0);
  const [muted, setMuted] = useState(false);
  const [camOff, setCamOff] = useState(false);
  const localRef = useRef(null);
  const remoteRef = useRef(null);
  const pcRef = useRef(null);
  const localStream = useRef(null);
  const timerRef = useRef(null);
  const startedRef = useRef(false);

  const targetId = parseInt(userId);
  useEffect(() => { if (!userId || isNaN(targetId)) navigate(-1); }, [userId]);

  useEffect(() => {
    if (callState === 'connected') {
      timerRef.current = setInterval(() => setTimer((t) => t + 1), 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [callState]);

  const cleanup = useCallback(() => {
    pcRef.current?.close();
    pcRef.current = null;
    localStream.current?.getTracks().forEach((t) => t.stop());
    localStream.current = null;
    clearInterval(timerRef.current);
  }, []);

  const endCall = useCallback(() => {
    socket?.emit('video_call_end', { to: parseInt(userId) });
    cleanup();
    navigate(-1);
  }, [socket, userId, cleanup, navigate]);

  useEffect(() => {
    if (!socket || startedRef.current) return;
    startedRef.current = true;

    const targetId = parseInt(userId);
    let pc = null;

    const start = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localStream.current = stream;
        if (localRef.current) localRef.current.srcObject = stream;

        pc = new RTCPeerConnection(servers);
        pcRef.current = pc;

        stream.getTracks().forEach((t) => pc.addTrack(t, stream));

        pc.ontrack = (e) => {
          if (remoteRef.current) remoteRef.current.srcObject = e.streams[0];
        };

        pc.onicecandidate = (e) => {
          if (e.candidate) {
            socket.emit('video_call_signal', { to: targetId, signal: { type: 'candidate', candidate: e.candidate.toJSON() } });
          }
        };

        pc.onconnectionstatechange = () => {
          if (pc.connectionState === 'connected') setCallState('connected');
          if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') endCall();
        };

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit('video_call_signal', { to: targetId, signal: { type: 'offer', sdp: pc.localDescription.toJSON() } });
        setCallState('calling');
      } catch (err) {
        console.error('Call setup error:', err);
        cleanup();
        navigate(-1);
      }
    };

    const onSignal = async ({ from, signal }) => {
      if (String(from) !== String(userId)) return;

      if (signal.type === 'offer' && pcRef.current) {
        await pcRef.current.setRemoteDescription(new RTCSessionDescription(signal.sdp));
        const answer = await pcRef.current.createAnswer();
        await pcRef.current.setLocalDescription(answer);
        socket.emit('video_call_accept', { to: targetId, signal: { type: 'answer', sdp: pcRef.current.localDescription.toJSON() } });
        setCallState('connected');
      } else if (signal.type === 'answer' && pcRef.current) {
        await pcRef.current.setRemoteDescription(new RTCSessionDescription(signal.sdp));
        setCallState('connected');
      } else if (signal.type === 'candidate' && pcRef.current) {
        try { await pcRef.current.addIceCandidate(new RTCIceCandidate(signal.candidate)); } catch {}
      }
    };

    const onAccept = async ({ signal }) => {
      if (pcRef.current && signal.type === 'answer') {
        await pcRef.current.setRemoteDescription(new RTCSessionDescription(signal.sdp));
        setCallState('connected');
      }
    };

    const onEnd = () => { cleanup(); navigate(-1); };

    socket.on('video_call_signal', onSignal);
    socket.on('video_call_accept', onAccept);
    socket.on('video_call_end', onEnd);

    start();

    return () => {
      socket.off('video_call_signal', onSignal);
      socket.off('video_call_accept', onAccept);
      socket.off('video_call_end', onEnd);
      cleanup();
    };
  }, [socket, userId]);

  const toggleMute = () => {
    localStream.current?.getAudioTracks().forEach((t) => { t.enabled = muted; });
    setMuted(!muted);
  };

  const toggleCam = () => {
    localStream.current?.getVideoTracks().forEach((t) => { t.enabled = camOff; });
    setCamOff(!camOff);
  };

  const fmt = (s) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  return (
    <div className="h-screen bg-gray-900 flex flex-col relative">
      <video ref={remoteRef} autoPlay playsInline className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
        <div className="bg-black/40 backdrop-blur-sm text-white px-4 py-2 rounded-full text-sm font-medium">
          {callState === 'calling' ? 'Calling...' : callState === 'connected' ? fmt(timer) : 'Connecting...'}
        </div>
      </div>
      <video ref={localRef} autoPlay playsInline muted className="absolute bottom-28 right-4 w-32 h-44 rounded-2xl object-cover border-2 border-white/20 z-10 shadow-2xl" />
      <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-6 z-10">
        <button onClick={toggleMute} className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm text-white flex items-center justify-center hover:bg-white/30 transition">
          {muted ? <FiMicOff size={22} /> : <FiMic size={22} />}
        </button>
        <button onClick={endCall} className="w-16 h-16 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition shadow-lg">
          <FiPhoneOff size={26} />
        </button>
        <button onClick={toggleCam} className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm text-white flex items-center justify-center hover:bg-white/30 transition">
          {camOff ? <FiVideoOff size={22} /> : <FiVideo size={22} />}
        </button>
      </div>
    </div>
  );
}
