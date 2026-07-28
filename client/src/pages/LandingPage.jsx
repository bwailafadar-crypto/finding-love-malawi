import { Link } from 'react-router-dom';
import { FiHeart, FiSun, FiMoon } from 'react-icons/fi';
import { useTheme } from '../context/ThemeContext';

export default function LandingPage() {
  const { dark, toggle } = useTheme();

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-500 via-rose-500 to-purple-600 flex flex-col items-center justify-center px-6 text-center text-white">
      <div className="absolute top-4 right-4 z-10">
        <button onClick={toggle} className="p-2 bg-white/20 backdrop-blur-sm rounded-full text-white hover:bg-white/30 transition">
          {dark ? <FiSun size={20} /> : <FiMoon size={20} />}
        </button>
      </div>
      <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-3xl flex items-center justify-center mb-6 rotate-6">
        <FiHeart size={40} className="text-white fill-white" />
      </div>
      <h1 className="text-4xl md:text-5xl font-extrabold mb-3 tracking-tight">Finding Love</h1>
      <h2 className="text-xl md:text-2xl font-light mb-2 text-white/90">Malawi</h2>
      <p className="text-white/70 text-sm max-w-sm mb-10">Connect with amazing people near you. Swipe, match, and start a conversation that could change your life.</p>
      <div className="w-full max-w-sm space-y-3">
        <Link to="/register" className="block w-full py-4 bg-white text-pink-600 font-bold rounded-2xl text-center text-lg shadow-xl hover:shadow-2xl transition transform hover:scale-[1.02]">
          Create Account
        </Link>
        <Link to="/login" className="block w-full py-4 bg-white/10 backdrop-blur-sm text-white font-semibold rounded-2xl text-center border border-white/20 hover:bg-white/20 transition">
          Sign In
        </Link>
      </div>
      <p className="text-white/40 text-xs mt-12">Made with love in Malawi</p>
    </div>
  );
}
