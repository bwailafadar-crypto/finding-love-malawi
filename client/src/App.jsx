import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import AppLayout from './components/AppLayout';
import PageTransition from './components/PageTransition';
import ErrorBoundary from './components/ErrorBoundary';
import useNotifications from './hooks/useNotifications';

const LandingPage = lazy(() => import('./pages/LandingPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const OnboardingPage = lazy(() => import('./pages/OnboardingPage'));
const DiscoverPage = lazy(() => import('./pages/DiscoverPage'));
const MatchesPage = lazy(() => import('./pages/MatchesPage'));
const ChatPage = lazy(() => import('./pages/ChatPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const ProfileEditPage = lazy(() => import('./pages/ProfileEditPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const VerifyPage = lazy(() => import('./pages/VerifyPage'));
const VideoCallPage = lazy(() => import('./pages/VideoCallPage'));
const AdminPage = lazy(() => import('./pages/AdminPage'));
const DailyPicksPage = lazy(() => import('./pages/DailyPicksPage'));
const StoriesPage = lazy(() => import('./pages/StoriesPage'));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'));
const PremiumPage = lazy(() => import('./pages/PremiumPage'));
const UsersPage = lazy(() => import('./pages/UsersPage'));

function PageLoader() {
  return (
    <div className="flex justify-center items-center h-screen dark:bg-dark-bg">
      <div className="flex flex-col items-center gap-3">
        <div className="relative">
          <div className="w-12 h-12 rounded-full border-4 border-pink-200 dark:border-pink-900/50" />
          <div className="absolute inset-0 w-12 h-12 rounded-full border-4 border-pink-500 border-t-transparent animate-spin" />
        </div>
      </div>
    </div>
  );
}

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function GuestRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (user) return <Navigate to="/discover" replace />;
  return children;
}

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <ErrorBoundary>
      <AnimatePresence mode="wait">
        <Suspense fallback={<PageLoader />}>
          <Routes location={location} key={location.pathname}>
          <Route path="/" element={<GuestRoute><PageTransition><LandingPage /></PageTransition></GuestRoute>} />
          <Route path="/login" element={<GuestRoute><PageTransition><LoginPage /></PageTransition></GuestRoute>} />
          <Route path="/register" element={<GuestRoute><PageTransition><RegisterPage /></PageTransition></GuestRoute>} />
          <Route path="/forgot-password" element={<GuestRoute><PageTransition><ForgotPasswordPage /></PageTransition></GuestRoute>} />
          <Route path="/reset-password" element={<GuestRoute><PageTransition><ResetPasswordPage /></PageTransition></GuestRoute>} />
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
          <Route path="/stories" element={<ProtectedRoute><AppLayout><PageTransition><StoriesPage /></PageTransition></AppLayout></ProtectedRoute>} />
          <Route path="/users" element={<ProtectedRoute><AppLayout><PageTransition><UsersPage /></PageTransition></AppLayout></ProtectedRoute>} />
          <Route path="/premium" element={<ProtectedRoute><PageTransition><PremiumPage /></PageTransition></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/discover" />} />
          </Routes>
        </Suspense>
      </AnimatePresence>
    </ErrorBoundary>
  );
}

function NotificationListener() {
  useNotifications();
  return null;
}

export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <div className="min-h-screen bg-gray-50 dark:bg-dark-bg transition-colors duration-300">
          <NotificationListener />
          <AnimatedRoutes />
        </div>
      </ThemeProvider>
    </AuthProvider>
  );
}
