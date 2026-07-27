import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import AppLayout from './components/AppLayout';
import PageTransition from './components/PageTransition';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import OnboardingPage from './pages/OnboardingPage';
import DiscoverPage from './pages/DiscoverPage';
import MatchesPage from './pages/MatchesPage';
import ChatPage from './pages/ChatPage';
import ProfilePage from './pages/ProfilePage';
import ProfileEditPage from './pages/ProfileEditPage';
import SettingsPage from './pages/SettingsPage';
import VerifyPage from './pages/VerifyPage';
import VideoCallPage from './pages/VideoCallPage';
import AdminPage from './pages/AdminPage';
import DailyPicksPage from './pages/DailyPicksPage';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex justify-center items-center h-screen dark:bg-dark-bg"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-pink-500" /></div>;
  if (!user) return <Navigate to="/login" />;
  return children;
}

function GuestRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex justify-center items-center h-screen dark:bg-dark-bg"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-pink-500" /></div>;
  if (user) return <Navigate to="/discover" />;
  return children;
}

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<GuestRoute><PageTransition><LandingPage /></PageTransition></GuestRoute>} />
        <Route path="/login" element={<GuestRoute><PageTransition><LoginPage /></PageTransition></GuestRoute>} />
        <Route path="/register" element={<GuestRoute><PageTransition><RegisterPage /></PageTransition></GuestRoute>} />
        <Route path="/onboarding" element={<ProtectedRoute><PageTransition><OnboardingPage /></PageTransition></ProtectedRoute>} />
        <Route path="/discover" element={<ProtectedRoute><AppLayout><PageTransition><DiscoverPage /></PageTransition></AppLayout></ProtectedRoute>} />
        <Route path="/matches" element={<ProtectedRoute><AppLayout><PageTransition><MatchesPage /></PageTransition></AppLayout></ProtectedRoute>} />
        <Route path="/chat/:matchId" element={<ProtectedRoute><AppLayout><ChatPage /></AppLayout></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><AppLayout><PageTransition><ProfilePage /></PageTransition></AppLayout></ProtectedRoute>} />
        <Route path="/profile/edit" element={<ProtectedRoute><AppLayout><PageTransition><ProfileEditPage /></PageTransition></AppLayout></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><AppLayout><PageTransition><SettingsPage /></PageTransition></AppLayout></ProtectedRoute>} />
        <Route path="/verify" element={<ProtectedRoute><AppLayout><PageTransition><VerifyPage /></PageTransition></AppLayout></ProtectedRoute>} />
        <Route path="/call/:matchId/:userId" element={<ProtectedRoute><VideoCallPage /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute><AppLayout><PageTransition><AdminPage /></PageTransition></AppLayout></ProtectedRoute>} />
        <Route path="/daily-picks" element={<ProtectedRoute><AppLayout><PageTransition><DailyPicksPage /></PageTransition></AppLayout></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/discover" />} />
      </Routes>
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <div className="min-h-screen bg-gray-50 dark:bg-dark-bg transition-colors duration-300">
          <AnimatedRoutes />
        </div>
      </ThemeProvider>
    </AuthProvider>
  );
}
