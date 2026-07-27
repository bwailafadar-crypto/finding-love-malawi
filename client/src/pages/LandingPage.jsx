import { Link } from 'react-router-dom';
import { FiHeart, FiMessageCircle, FiShield, FiStar, FiSun, FiMoon } from 'react-icons/fi';
import { useTheme } from '../context/ThemeContext';

export default function LandingPage() {
  const { dark, toggle } = useTheme();

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-500 via-rose-500 to-purple-600 flex flex-col">
      <div className="absolute top-4 right-4 z-10">
        <button onClick={toggle} className="p-2 bg-white/20 backdrop-blur-sm rounded-full text-white hover:bg-white/30 transition">
          {dark ? <FiSun size={20} /> : <FiMoon size={20} />}
        </button>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center text-white">
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
      </div>
      <div className="bg-white dark:bg-dark-card rounded-t-3xl px-6 py-10 mt-8 transition-colors">
        <div className="max-w-sm mx-auto space-y-6">
          {[
            { icon: FiHeart, color: 'pink', title: 'Smart Matching', desc: 'Algorithm finds your best matches based on interests, location, and preferences' },
            { icon: FiMessageCircle, color: 'blue', title: 'Real-time Chat', desc: 'Instant messaging with typing indicators, reactions, GIFs, and video calls' },
            { icon: FiShield, color: 'green', title: 'Verified Profiles', desc: 'Photo verification ensures you are talking to real people' },
            { icon: FiStar, color: 'amber', title: 'Premium Features', desc: 'Boosts, super likes, rewind, and daily picks to find your match faster' },
          ].map(({ icon: Icon, color, title, desc }) => (
            <div key={title} className="flex items-start gap-4">
              <div className={`w-12 h-12 rounded-2xl bg-${color}-100 dark:bg-${color}-900/30 flex items-center justify-center flex-shrink-0`}>
                <Icon size={22} className={`text-${color}-500`} />
              </div>
              <div>
                <h3 className="font-bold text-gray-800 dark:text-white">{title}</h3>
                <p className="text-sm text-gray-500 dark:text-dark-muted">{desc}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="text-center text-xs text-gray-400 dark:text-dark-muted mt-8">Made with love in Malawi</p>
      </div>
    </div>
  );
}
