import { useLocation } from 'react-router-dom';
import Navbar from './Navbar';

export default function AppLayout({ children }) {
  const { pathname } = useLocation();
  const hideNav = pathname.startsWith('/call') || pathname.startsWith('/chat/');

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-bg transition-colors">
      <Navbar />
      <main className={`max-w-lg md:max-w-2xl lg:max-w-4xl xl:max-w-5xl mx-auto px-4 md:px-6 ${hideNav ? 'pb-0 pt-0' : 'pb-20 md:pb-6 md:pt-20'}`}>{children}</main>
    </div>
  );
}
