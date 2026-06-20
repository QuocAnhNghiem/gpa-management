import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';

const LandingPage = lazy(() => import('./pages/LandingPage'));
const AuthPage = lazy(() => import('./pages/AuthPage'));
const OnboardingWizard = lazy(() => import('./components/onboarding/OnboardingWizard'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const GradesPage = lazy(() => import('./pages/GradesPage'));
const SchedulePage = lazy(() => import('./pages/SchedulePage'));
const ErpSyncPage = lazy(() => import('./pages/ErpSyncPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const NotesPage = lazy(() => import('./pages/NotesPage'));
const VocabularyPage = lazy(() => import('./pages/VocabularyPage'));

const PageFallback = () => (
  <div className="min-h-[100dvh] flex items-center justify-center bg-[#eaebee] text-sm font-bold text-slate-500">
    Đang tải...
  </div>
);

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <BrowserRouter>
          <Suspense fallback={<PageFallback />}>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<AuthPage />} />
              <Route path="/register" element={<Navigate to="/login" replace />} />
              <Route path="/onboarding" element={<ProtectedRoute><OnboardingWizard /></ProtectedRoute>} />

              <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/grades" element={<GradesPage />} />
                <Route path="/schedule" element={<SchedulePage />} />
                <Route path="/erp-sync" element={<ErpSyncPage />} />
                <Route path="/notes" element={<NotesPage />} />
                <Route path="/vocabulary" element={<VocabularyPage />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/settings" element={<SettingsPage />} />
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </ToastProvider>
  );
}
