import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../hooks/useSocket';
import { FiPhoneOff, FiMic, FiMicOff, FiVideo, FiVideoOff } from 'react-icons/fi';

const servers = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

export default function VideoCallPage() {
  const { matchId, userId } = useParams();
  const { user } = useAuth();
  const socket = useSocket();
  const navigate = useNavigate();
  const [callState, setCallState] = useState('idle');
  const [timer, setTimer] = useState(0);
  const [muted, setMuted] = useState(false);
  const [camOff, setCamOff] = useState(false);
  const localRef = useRef(null);
  const remoteRef = useRef(null);
  const pcRef = useRef(null);
  const localStream = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    if (callState === 'connected') {
      timerRef.current = setInterval(() => setTimer((t) => t + 1), 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [callState]);

  const startCall = async () => {
    try {
      localStream.current = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      if (localRef.current) localRef.current.srcObject = localStream.current;
      const pc = new RTCPeerConnection(servers);
      pcRef.current = pc;
      localStream.current.getTracks().forEach((t) => pc.addTrack(t, localStream.current));
      pc.ontrack = (e) => { if (remoteRef.current) remoteRef.current.srcObject = e.streams[0]; };
      pc.onicecandidate = (e) => { if (e.candidate) socket?.emit('video_call_signal', { to: parseInt(userId), signal: { type: 'candidate', candidate: e.candidate } }); };
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket?.emit('video_call_signal', { to: parseInt(userId), signal: { type: 'offer', sdp: pc.localDescription } });
      setCallState('calling');
    } catch { navigate(-1); }
  };

  useEffect(() => {
    if (!socket) return;
    startCall();
    socket.on('video_call_signal', async ({ from, signal }) => {
      if (String(from) !== String(userId)) return;
      if (signal.type === 'offer' && pcRef.current) {
        await pcRef.current.setRemoteDescription(new RTCSessionDescription(signal.sdp));
        const answer = await pcRef.current.createAnswer();
        await pcRef.current.setLocalDescription(answer);
        socket.emit('video_call_accept', { to: parseInt(userId), signal: { type: 'answer', sdp: pcRef.current.localDescription } });
      } else if (signal.type === 'answer' && pcRef.current) {
        await pcRef.current.setRemoteDescription(new RTCSessionDescription(signal.sdp));
      } else if (signal.type === 'candidate' && pcRef.current) {
        await pcRef.current.addIceCandidate(new RTCIceCandidate(signal.candidate));
      }
      setCallState('connected');
    });
    socket.on('video_call_accept', async ({ signal }) => {
      if (pcRef.current && signal.type === 'answer') await pcRef.current.setRemoteDescription(new RTCSessionDescription(signal.sdp));
      setCallState('connected');
    });
    socket.on('video_call_end', () => endCall());
    return () => { socket.off('video_call_signal'); socket.off('video_call_accept'); socket.off('video_call_end'); };
  }, [socket, userId]);

  const endCall = () => {
    pcRef.current?.close();
    localStream.current?.getTracks().forEach((t) => t.stop());
    socket?.emit('video_call_end', { to: parseInt(userId) });
    navigate(-1);
  };

  const toggleMute = () => { localStream.current?.getAudioTracks().forEach((t) => t.enabled = muted); setMuted(!muted); };
  const toggleCam = () => { localStream.current?.getVideoTracks().forEach((t) => t.enabled = camOff); setCamOff(!camOff); };
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
