import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

export default function GoogleSignIn({ mode = 'login', onLoading }) {
  const buttonRef = useRef(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { googleLogin } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || !window.google) return;

    const initGoogle = () => {
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: async (response) => {
          if (!response.credential) return;
          setLoading(true);
          if (onLoading) onLoading(true);
          setError('');
          try {
            const data = await googleLogin(response.credential);
            if (data.isNewUser) {
              navigate('/onboarding');
            } else {
              navigate('/discover');
            }
          } catch (err) {
            setError(err.message || 'Google sign-in failed');
          }
          setLoading(false);
          if (onLoading) onLoading(false);
        },
      });

      if (buttonRef.current) {
        window.google.accounts.id.renderButton(buttonRef.current, {
          theme: 'outline',
          size: 'large',
          width: '100%',
          text: mode === 'register' ? 'signup_with' : 'signin_with',
          shape: 'rectangular',
        });
      }
    };

    if (window.google) {
      initGoogle();
    } else {
      const check = setInterval(() => {
        if (window.google) {
          clearInterval(check);
          initGoogle();
        }
      }, 100);
      return () => clearInterval(check);
    }
  }, [mode, googleLogin, navigate, onLoading]);

  if (!GOOGLE_CLIENT_ID) return null;

  return (
    <div className="w-full">
      {error && <div className="mb-3 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-xl font-medium">{error}</div>}
      <div ref={buttonRef} className="w-full flex justify-center" />
      {loading && <p className="text-center text-sm text-gray-400 mt-2">Signing in with Google...</p>}
    </div>
  );
}
