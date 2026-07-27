import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FiSearch, FiHeart, FiUser, FiMessageCircle, FiSun, FiMoon, FiStar } from 'react-icons/fi';
import { useTheme } from '../context/ThemeContext';
import api from '../utils/api';

export default function Navbar() {
  const { pathname } = useLocation();
  const { dark, toggle } = useTheme();
  const [notif, setNotif] = useState({ total: 0 });

  useEffect(() => {
    const load = async () => { try { setNotif(await api.notifications.get()); } catch {} };
    load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, [pathname]);

  const links = [
    { to: '/discover', icon: FiSearch, label: 'Discover' },
    { to: '/daily-picks', icon: FiStar, label: 'Picks' },
    { to: '/matches', icon: FiMessageCircle, label: 'Matches', badge: notif.total },
    { to: '/profile', icon: FiUser, label: 'Profile' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-dark-card border-t border-gray-200 dark:border-dark-border z-50 safe-bottom">
      <div className="max-w-lg mx-auto flex justify-around items-center py-2">
        {links.map(({ to, icon: Icon, label, badge }) => {
          const active = pathname === to || (label === 'Matches' && (pathname.startsWith('/chat') || pathname === '/matches'));
          return (
            <Link key={label} to={to}
              className={`relative flex flex-col items-center py-1 px-3 transition ${active ? 'text-pink-500' : 'text-gray-400 dark:text-dark-muted hover:text-gray-600 dark:hover:text-white'}`}>
              <Icon size={20} />
              {badge > 0 && (
                <span className="absolute -top-0.5 right-0 w-5 h-5 bg-pink-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center pulse-badge">
                  {badge > 9 ? '9+' : badge}
                </span>
              )}
              <span className="text-[10px] mt-0.5 font-medium">{label}</span>
            </Link>
          );
        })}
        <button onClick={toggle}
          className="flex flex-col items-center py-1 px-3 text-gray-400 dark:text-dark-muted hover:text-amber-500 transition">
          {dark ? <FiSun size={20} /> : <FiMoon size={20} />}
          <span className="text-[10px] mt-0.5 font-medium">{dark ? 'Light' : 'Dark'}</span>
        </button>
      </div>
    </nav>
  );
}
