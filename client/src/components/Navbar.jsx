import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FiSearch, FiHeart, FiUser, FiMessageCircle, FiSun, FiMoon, FiStar, FiCircle, FiUsers } from 'react-icons/fi';
import { useTheme } from '../context/ThemeContext';
import api from '../utils/api';

export default function Navbar() {
  const { pathname } = useLocation();
  const { dark, toggle } = useTheme();
  const [notif, setNotif] = useState({ total: 0 });

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    const load = async () => { try { setNotif(await api.notifications.get()); } catch (err) { console.error('Error:', err.message); } };
    load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, [pathname]);

  const links = [
    { to: '/discover', icon: FiSearch, label: 'Discover' },
    { to: '/daily-picks', icon: FiStar, label: 'Picks' },
    { to: '/stories', icon: FiCircle, label: 'Stories' },
    { to: '/users', icon: FiUsers, label: 'People' },
    { to: '/matches', icon: FiMessageCircle, label: 'Matches', badge: notif.total },
    { to: '/profile', icon: FiUser, label: 'Profile' },
  ];

  const isActive = (label, to) =>
    pathname === to ||
    (label === 'Matches' && (pathname.startsWith('/chat') || pathname === '/matches')) ||
    (label === 'Stories' && pathname === '/stories') ||
    (label === 'People' && pathname === '/users') ||
    (label === 'Discover' && pathname === '/discover') ||
    (label === 'Picks' && pathname === '/daily-picks') ||
    (label === 'Profile' && pathname.startsWith('/profile'));

  return (
    <>
      {/* Desktop top navbar */}
      <nav className="hidden md:flex fixed top-0 left-0 right-0 bg-white/95 dark:bg-dark-card/95 backdrop-blur-lg border-b border-gray-200 dark:border-dark-border z-50">
        <div className="max-w-5xl mx-auto w-full flex items-center justify-between px-6 h-16">
          <Link to="/discover" className="flex items-center gap-2 flex-shrink-0">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center">
              <FiHeart size={16} className="text-white" fill="white" />
            </div>
            <span className="text-lg font-extrabold bg-gradient-to-r from-pink-500 to-rose-500 bg-clip-text text-transparent hidden lg:block">Finding Love</span>
          </Link>

          <div className="flex items-center gap-1">
            {links.map(({ to, icon: Icon, label, badge }) => {
              const active = isActive(label, to);
              return (
                <Link key={label} to={to}
                  className={`relative flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition ${
                    active
                      ? 'text-pink-500 bg-pink-50 dark:bg-pink-900/20'
                      : 'text-gray-500 dark:text-dark-muted hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-dark-surface'
                  }`}>
                  <Icon size={18} />
                  <span className="hidden lg:inline">{label}</span>
                  {badge > 0 && (
                    <span className="w-5 h-5 bg-pink-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center pulse-badge">
                      {badge > 9 ? '9+' : badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>

          <button onClick={toggle}
            className="p-2 rounded-xl text-gray-500 dark:text-dark-muted hover:text-amber-500 hover:bg-gray-100 dark:hover:bg-dark-surface transition">
            {dark ? <FiSun size={20} /> : <FiMoon size={20} />}
          </button>
        </div>
      </nav>

      {/* Mobile bottom navbar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-dark-card border-t border-gray-200 dark:border-dark-border z-50 safe-bottom">
        <div className="max-w-lg mx-auto flex justify-around items-center py-2">
          {links.map(({ to, icon: Icon, label, badge }) => {
            const active = isActive(label, to);
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
    </>
  );
}
