import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiCamera, FiCheckCircle, FiShield, FiRefreshCw } from 'react-icons/fi';
import api from '../utils/api';

export default function VerifyPage() {
  const navigate = useNavigate();
  const [challenge, setChallenge] = useState(null);
  const [photoUrl, setPhotoUrl] = useState('');
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const [s, c] = await Promise.all([
          api.verification.status().catch(() => null),
          api.verification.challenge().catch(() => null),
        ]);
        setStatus(s?.status || 'unverified');
        if (c) setChallenge(c);
      } catch {}
      setLoading(false);
    };
    load();
  }, []);

  const submitVerification = async () => {
    if (!photoUrl.trim() || !challenge) return;
    setSubmitting(true);
    setMsg('');
    try {
      await api.verification.submit(photoUrl.trim(), challenge.id);
      setMsg('Verification submitted! We will review it shortly.');
      setStatus('pending');
    } catch (err) { setMsg(err.message || 'Failed to submit'); }
    setSubmitting(false);
  };

  const newChallenge = async () => {
    try { const c = await api.verification.challenge(); setChallenge(c); } catch {}
  };

  if (loading) return <div className="flex justify-center items-center h-[calc(100vh-80px)]"><div className="animate-spin rounded-full h-10 w-10 border-4 border-pink-500 border-t-transparent" /></div>;

  return (
    <div className="px-4 pt-4 pb-24 max-w-md mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="p-2 text-gray-600 hover:text-gray-900"><FiArrowLeft size={22} /></button>
        <h1 className="text-xl font-extrabold text-gray-900">Photo Verification</h1>
      </div>

      {/* Status */}
      <div className={`mb-6 p-4 rounded-2xl ${
        status === 'verified' ? 'bg-green-50 border-2 border-green-200' :
        status === 'pending' ? 'bg-amber-50 border-2 border-amber-200' :
        'bg-gray-50 border-2 border-gray-200'
      }`}>
        <div className="flex items-center gap-3">
          {status === 'verified' ? (
            <FiCheckCircle size={28} className="text-green-500" />
          ) : status === 'pending' ? (
            <FiRefreshCw size={28} className="text-amber-500 animate-spin" />
          ) : (
            <FiShield size={28} className="text-gray-400" />
          )}
          <div>
            <h3 className="font-bold text-gray-900">
              {status === 'verified' ? 'Verified' : status === 'pending' ? 'Under Review' : 'Not Verified'}
            </h3>
            <p className="text-sm text-gray-500">
              {status === 'verified' ? 'Your profile has a verification badge' :
               status === 'pending' ? 'We are reviewing your photo' :
               'Take a selfie matching the pose below'}
            </p>
          </div>
        </div>
      </div>

      {status === 'unverified' && challenge && (
        <>
          {/* Challenge */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 mb-5">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Required Pose</h3>
            <div className="text-center py-6">
              <div className="w-24 h-24 bg-pink-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FiCamera size={40} className="text-pink-500" />
              </div>
              <p className="text-lg font-bold text-gray-800">{challenge.instruction}</p>
              <p className="text-sm text-gray-500 mt-2">Take a selfie matching this pose to verify your identity</p>
            </div>
            <button onClick={newChallenge} className="w-full py-2.5 text-pink-500 font-bold text-sm border border-pink-200 rounded-xl hover:bg-pink-50 transition flex items-center justify-center gap-2">
              <FiRefreshCw size={14} /> Get Different Pose
            </button>
          </div>

          {/* Photo URL */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 mb-5">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Your Photo</h3>
            <input type="url" value={photoUrl} onChange={(e) => setPhotoUrl(e.target.value)}
              placeholder="Paste a URL to your verification photo"
              className="w-full px-4 py-3 bg-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 focus:bg-white transition mb-3" />
            {photoUrl && (
              <div className="rounded-xl overflow-hidden bg-gray-100 aspect-square">
                <img src={photoUrl} alt="Preview" className="w-full h-full object-cover" onError={(e) => e.target.style.display = 'none'} />
              </div>
            )}
          </div>

          <button onClick={submitVerification} disabled={!photoUrl.trim() || submitting}
            className="w-full py-4 bg-gradient-to-r from-pink-500 to-rose-500 text-white font-bold rounded-xl text-lg shadow-lg shadow-pink-200 hover:shadow-xl transition disabled:opacity-50">
            {submitting ? 'Submitting...' : 'Submit Verification'}
          </button>
        </>
      )}

      {msg && <div className="mt-4 p-3 bg-blue-50 text-blue-600 text-sm rounded-xl font-medium text-center">{msg}</div>}
    </div>
  );
}
