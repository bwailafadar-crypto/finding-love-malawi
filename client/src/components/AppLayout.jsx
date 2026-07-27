import { useLocation } from 'react-router-dom';
import Navbar from './Navbar';

export default function AppLayout({ children }) {
  const { pathname } = useLocation();
  const hideNav = pathname.startsWith('/call') || pathname.startsWith('/chat/');

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-bg transition-colors">
      <main className={`max-w-lg mx-auto ${hideNav ? 'pb-0' : 'pb-20'}`}>{children}</main>
      {!hideNav && <Navbar />}
    </div>
  );
}
