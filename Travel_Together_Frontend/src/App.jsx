import { Routes, Route, Navigate, useNavigate, useParams } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

import { useAuth }       from './context/AuthContext';
import ProtectedRoute    from './components/shared/ProtectedRoute';

import LandingPage       from './components/LandingPage/LandingPage';
import SignUp            from './components/Authentication/SignUp';
import Verify            from './components/Authentication/Verify';
import ProfileSetup      from './components/Onboarding/ProfileSetup';
import Discover          from './components/Discover';
import ChatPage          from './components/Chat/ChatPage';
import ProfilePage       from './components/Profile/ProfilePage';
import Dashboard         from './components/Dashboard/Dashboard';
import GroupDashboard    from './components/Dashboard/GroupDashboard';
import TripWelcome       from './components/Dashboard/TripWelcome';
import CreateTripPage    from './components/CreateTripPage';
import SettingsPage      from './components/Settings/SettingsPage';
import TripPublicPage   from './components/Discover/TripPublicPage';
import RatingPage       from './components/Rating/RatingPage';

/* ── Public route wrappers ────────────────────────────────────── */

function PublicProfileRoute() {
  const { userId } = useParams();
  return <ProfilePage isOwner={false} userId={userId} />;
}

function LandingRoute() {
  const nav = useNavigate();
  const { user, loading } = useAuth();

  if (loading) return <div className="min-h-screen bg-[#071422]" />;
  if (user) return <Navigate to="/discover" replace />;

  return (
    <LandingPage
      onGetStarted={() => nav('/signup')}
      onSignIn={() => nav('/signup')}
      onBrowse={() => nav('/discover')}
    />
  );
}

function SignUpRoute() {
  const nav = useNavigate();
  return (
    <SignUp
      onVerify={email => {
        sessionStorage.setItem('tt_email', email);
        nav('/verify');
      }}
      onSignIn={() => nav('/signup')}
    />
  );
}

function VerifyRoute() {
  const { login } = useAuth();
  const email = sessionStorage.getItem('tt_email') || '';
  return (
    <Verify
      email={email}
      // login() fetches the user profile, stores tokens, and navigates
      // to /onboarding for new users or /discover for returning users.
      onVerified={(tokens) => login(tokens)}
      onBack={() => history.back()}
    />
  );
}

/* ── Onboarding route wrapper (protected) ─────────────────────── */

function OnboardingRoute() {
  const nav = useNavigate();
  const { refreshUser } = useAuth();
  return <ProfileSetup onComplete={async () => { await refreshUser(); nav('/discover'); }} />;
}

/* ── App route wrappers (protected) ──────────────────────────── */

function DiscoverRoute() {
  const nav = useNavigate();
  return <Discover onJoinTrip={() => nav('/trip-welcome')} />;
}

function TripWelcomeRoute() {
  const nav = useNavigate();
  return <TripWelcome onEnterDashboard={() => nav('/group-dashboard')} />;
}

function CreateTripRoute() {
  const nav = useNavigate();
  return <CreateTripPage onClose={() => nav('/dashboard')} onGoToDashboard={id => nav(id ? `/group-dashboard/${id}` : '/dashboard')} />;
}

/* ── Root ─────────────────────────────────────────────────────── */
export default function App() {
  return (
    <>
      <Toaster />
      <Routes>
        {/* Public */}
        <Route path="/"        element={<LandingRoute />} />
        <Route path="/signup"  element={<SignUpRoute />} />
        <Route path="/verify"  element={<VerifyRoute />} />
        <Route path="/trip/:tripId" element={<TripPublicPage />} />

        {/* Onboarding — token exists but onboarding not complete */}
        <Route path="/onboarding" element={<ProtectedRoute><OnboardingRoute /></ProtectedRoute>} />

        {/* Main app */}
        <Route path="/discover"        element={<DiscoverRoute />} />
        <Route path="/chat"            element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />
        <Route path="/profile"         element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
        <Route path="/profile/:userId" element={<ProtectedRoute><PublicProfileRoute /></ProtectedRoute>} />
        <Route path="/dashboard"       element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/group-dashboard/:tripId" element={<ProtectedRoute><GroupDashboard /></ProtectedRoute>} />
        <Route path="/trip-welcome"    element={<ProtectedRoute><TripWelcomeRoute /></ProtectedRoute>} />
        <Route path="/create-trip"     element={<ProtectedRoute><CreateTripRoute /></ProtectedRoute>} />
        <Route path="/settings"        element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
        <Route path="/trips/:tripId/rate" element={<ProtectedRoute><RatingPage /></ProtectedRoute>} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
