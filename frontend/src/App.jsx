import React, { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';
import { Analytics } from '@vercel/analytics/react';
import { Loader } from 'lucide-react';
import { AdminLoginModal, ToastViewport } from './components/AppOverlays';
import { AppHeader, AppStatusStack, Footer } from './components/AppChrome';
import ErrorBoundary from './components/ErrorBoundary';
import { API_BASE_URL, DEFAULT_ANNOUNCEMENT, downloadDocumentFromBase64, pageFromLocation, pathForPage, readGuestModePreference, writeGuestModePreference } from './appShared';
import { apiFetch, isAbortError } from './apiClient';
import HomePage from './pages/HomePage';

// HomePage stays eager: it is the landing route and the router's fallback, so
// deferring it would only add a flash. Everything else is split out -- most
// visitors never open Simulation, and AdminPanel (the largest page in the app)
// is useless to anyone who is not an admin.
const AdminPanel = lazy(() => import('./pages/AdminPanel'));
const AnalyzePage = lazy(() => import('./pages/AnalyzePage'));
const AuthPage = lazy(() => import('./pages/AuthPage'));
const CommunityPage = lazy(() => import('./pages/CommunityPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const SampleLibrary = lazy(() => import('./pages/SampleLibrary'));
const SimulationMode = lazy(() => import('./pages/SimulationMode'));

function PageFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center" role="status" aria-live="polite">
      <Loader size={28} className="animate-spin text-sky-300" />
      <span className="sr-only">Loading page</span>
    </div>
  );
}

export default function SpeakUpApp() {
  const [currentPage, setCurrentPage] = useState(() => pageFromLocation(window.location));
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isWarmingBackend, setIsWarmingBackend] = useState(true);
  const [authMode, setAuthMode] = useState('login');
  const [authError, setAuthError] = useState('');
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);
  const [communityLoading, setCommunityLoading] = useState(false);
  const [practiceHistory, setPracticeHistory] = useState([]);
  const [guestMode, setGuestMode] = useState(readGuestModePreference);
  const [guestModeBannerVisible, setGuestModeBannerVisible] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [publicProfiles, setPublicProfiles] = useState([]);
  const [selectedProfileId, setSelectedProfileId] = useState(null);
  const [announcement, setAnnouncement] = useState(DEFAULT_ANNOUNCEMENT);
  const [toasts, setToasts] = useState([]);
  const [adminLoginOpen, setAdminLoginOpen] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [adminLoginError, setAdminLoginError] = useState('');
  const [adminLoginSubmitting, setAdminLoginSubmitting] = useState(false);
  const [adminAuthenticated, setAdminAuthenticated] = useState(false);
  const [installPrompt, setInstallPrompt] = useState(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  const pushToast = useCallback((message, tone = 'info') => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setToasts((current) => [...current, { id, message, tone }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, tone === 'error' ? 6000 : 4000);
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPage(pageFromLocation(window.location));
      setMobileMenuOpen(false);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    const handleBeforeInstallPrompt = (event) => {
      event.preventDefault();
      setInstallPrompt(event);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallApp = useCallback(async () => {
    if (!installPrompt) {
      pushToast('The app is already installed or your browser is not offering an install prompt right now.');
      return;
    }
    installPrompt.prompt();
    try {
      await installPrompt.userChoice;
    } finally {
      setInstallPrompt(null);
    }
  }, [installPrompt, pushToast]);

  useEffect(() => {
    const goOnline = () => setIsOffline(false);
    const goOffline = () => setIsOffline(true);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  useEffect(() => {
    const handleSwUpdate = (event) => {
      const registration = event.detail;
      const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      setToasts((current) => [
        ...current,
        {
          id,
          message: 'A new version of the app is available.',
          tone: 'update',
          action: {
            label: 'Reload now',
            onClick: () => {
              if (registration && registration.waiting) {
                registration.waiting.postMessage({ type: 'SKIP_WAITING' });
              } else {
                window.location.reload();
              }
            },
          },
        },
      ]);
    };
    window.addEventListener('sw-update-available', handleSwUpdate);
    return () => window.removeEventListener('sw-update-available', handleSwUpdate);
  }, []);

  const loadCommunityProfiles = useCallback(async (options = {}) => {
    setCommunityLoading(true);
    try {
      const data = await apiFetch('/api/auth/community', { signal: options.signal });
      if (Array.isArray(data.profiles)) setPublicProfiles(data.profiles);
    } catch (error) {
      if (isAbortError(error)) return;
      setPublicProfiles([]);
    } finally {
      if (!options.signal?.aborted) setCommunityLoading(false);
    }
  }, []);

  const loadPracticeHistory = useCallback(async (options = {}) => {
    try {
      const data = await apiFetch('/api/auth/practice-history', { signal: options.signal });
      if (Array.isArray(data.sessions)) setPracticeHistory(data.sessions);
    } catch (error) {
      if (isAbortError(error)) return;
      setPracticeHistory([]);
    }
  }, []);

  const loadAnnouncement = useCallback(async (options = {}) => {
    try {
      const data = await apiFetch('/api/site/announcement', { signal: options.signal });
      if (data.announcement) setAnnouncement(data.announcement);
    } catch (error) {
      if (isAbortError(error)) return;
      setAnnouncement(DEFAULT_ANNOUNCEMENT);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const warmBackend = async () => {
      try {
        await Promise.all([
          apiFetch('/api/health', { method: 'GET', signal: controller.signal }),
          loadAnnouncement({ signal: controller.signal }),
          loadCommunityProfiles({ signal: controller.signal }),
        ]);
      } catch (error) {
        if (isAbortError(error)) return;
        // Best-effort warmup only.
      } finally {
        if (!controller.signal.aborted) setIsWarmingBackend(false);
      }
    };
    warmBackend();
    return () => controller.abort();
  }, [loadAnnouncement, loadCommunityProfiles]);

  useEffect(() => {
    writeGuestModePreference(guestMode);
  }, [guestMode]);

  useEffect(() => {
    if (!guestMode || currentUser) setGuestModeBannerVisible(true);
  }, [guestMode, currentUser]);

  useEffect(() => {
    const controller = new AbortController();
    const loadCurrentUser = async () => {
      try {
        const data = await apiFetch('/api/auth/me', { signal: controller.signal });
        if (data.authenticated && data.user) {
          setCurrentUser(data.user);
          setSelectedProfileId(data.user.id);
          setGuestMode(false);
          await loadPracticeHistory({ signal: controller.signal });
        }
      } catch (error) {
        if (isAbortError(error)) return;
        // Keep the app usable even if auth restoration fails.
      } finally {
        if (!controller.signal.aborted) setAuthChecking(false);
      }
    };
    loadCurrentUser();
    return () => controller.abort();
  }, [loadPracticeHistory]);

  useEffect(() => {
    const controller = new AbortController();
    const loadAdminSession = async () => {
      try {
        const data = await apiFetch('/api/admin/check', { signal: controller.signal });
        if (!controller.signal.aborted) setAdminAuthenticated(Boolean(data.authenticated));
      } catch (error) {
        if (!isAbortError(error) && !controller.signal.aborted) setAdminAuthenticated(false);
      }
    };
    loadAdminSession();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (currentUser && currentPage === 'profile' && practiceHistory.length === 0) {
      const controller = new AbortController();
      loadPracticeHistory({ signal: controller.signal });
      return () => controller.abort();
    }
    return undefined;
  }, [currentPage, currentUser, loadPracticeHistory, practiceHistory.length]);

  useEffect(() => {
    setPublicProfiles((profiles) => {
      const withoutCurrent = profiles.filter((profile) => profile.id !== currentUser?.id);
      return currentUser ? [currentUser, ...withoutCurrent] : withoutCurrent;
    });
  }, [currentUser]);

  const navTo = useCallback((page) => {
    const nextPath = pathForPage(page);
    if (window.location.pathname !== nextPath) {
      window.history.pushState({}, '', nextPath);
    }
    setCurrentPage(page);
    setMobileMenuOpen(false);
  }, []);

  const downloadReport = useCallback((results) => {
    if (!results) {
      pushToast('No results are available yet.', 'error');
      return;
    }
    if (results.document_base64) {
      downloadDocumentFromBase64(results.document_base64, results.document_filename, {
        onError: (message) => pushToast(message, 'error'),
      });
    } else if (results.document_url) {
      window.open(`${API_BASE_URL}${results.document_url}`, '_blank', 'noopener');
    } else {
      pushToast('Document download is not available for this result.', 'error');
    }
  }, [pushToast]);

  const openAdminPanel = useCallback(() => {
    if (adminAuthenticated) {
      setShowAdminPanel(true);
      return;
    }
    setAdminPassword('');
    setAdminLoginError('');
    setAdminLoginOpen(true);
  }, [adminAuthenticated]);

  const submitAdminLogin = useCallback(async () => {
    if (!adminPassword.trim()) {
      setAdminLoginError('Enter the admin password to continue.');
      return;
    }

    setAdminLoginSubmitting(true);
    setAdminLoginError('');
    try {
      const data = await apiFetch('/api/admin/login', {
        method: 'POST',
        body: { password: adminPassword },
      });
      if (data.success) {
        setAdminAuthenticated(true);
        setShowAdminPanel(true);
        setAdminLoginOpen(false);
        setAdminPassword('');
      } else {
        setAdminLoginError(data.error || 'Incorrect password.');
      }
    } catch (error) {
      setAdminLoginError(error.message || 'Could not reach the admin login endpoint. Make sure the backend is running.');
    } finally {
      setAdminLoginSubmitting(false);
    }
  }, [adminPassword]);

  const handleAdminLogout = useCallback(async () => {
    try {
      await apiFetch('/api/admin/logout', { method: 'POST' });
    } catch {
      // Clear local admin state even if the request fails.
    }
    setAdminAuthenticated(false);
    setShowAdminPanel(false);
    setAdminLoginOpen(false);
    setAdminPassword('');
    setAdminLoginError('');
  }, []);

  const openAuth = useCallback((mode = 'login') => {
    setAuthError('');
    setAuthMode(mode);
    navTo('auth');
  }, [navTo]);

  const continueAsGuest = useCallback(() => {
    setAuthError('');
    setGuestMode(true);
    setGuestModeBannerVisible(true);
    navTo('analyze');
  }, [navTo]);

  const handleAuthSubmit = useCallback(async ({ mode, email, password, profile }) => {
    setAuthSubmitting(true);
    setAuthError('');

    try {
      const data = await apiFetch(`/api/auth/${mode}`, {
        method: 'POST',
        body: { email, password, profile },
      });

      if (!data.user) {
        setAuthError(data.error || 'Authentication failed.');
        return false;
      }

      setCurrentUser(data.user);
      setGuestMode(false);
      setSelectedProfileId(data.user.id);
      await loadPracticeHistory();
      await loadCommunityProfiles();
      navTo('profile');
      return true;
    } catch (error) {
      setAuthError(error.message || 'Could not reach the account endpoint. Make sure the backend is running.');
      return false;
    } finally {
      setAuthSubmitting(false);
    }
  }, [loadCommunityProfiles, loadPracticeHistory, navTo]);

  const handleProfileSave = useCallback(async (updates) => {
    setAuthError('');
    try {
      const data = await apiFetch('/api/auth/profile', { method: 'PUT', body: updates });

      if (!data.user) {
        setAuthError(data.error || 'Could not save profile changes.');
        return false;
      }

      setCurrentUser(data.user);
      setSelectedProfileId(data.user.id);
      await loadCommunityProfiles();
      return true;
    } catch (error) {
      setAuthError(error.message || 'Could not save profile changes.');
      return false;
    }
  }, [loadCommunityProfiles]);

  const handlePasswordUpdate = useCallback(async ({ currentPassword, newPassword }) => {
    setPasswordSubmitting(true);
    setAuthError('');
    try {
      await apiFetch('/api/auth/password', {
        method: 'PUT',
        body: { currentPassword, newPassword },
      });
      return true;
    } catch (error) {
      setAuthError(error.message || 'Could not update password.');
      return false;
    } finally {
      setPasswordSubmitting(false);
    }
  }, []);

  const handleProfileSelect = useCallback((profileId) => {
    setSelectedProfileId(profileId);
  }, []);

  const handleAnalysisUserUpdate = useCallback(async (user) => {
    if (!user) return;
    setCurrentUser(user);
    setSelectedProfileId(user.id);
    await loadPracticeHistory();
    await loadCommunityProfiles();
  }, [loadCommunityProfiles, loadPracticeHistory]);

  const handleLogout = useCallback(async () => {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // Clear local UI state even if the request fails.
    }
    setCurrentUser(null);
    setGuestMode(false);
    setAuthError('');
    setPracticeHistory([]);
    setSelectedProfileId(null);
    navTo('home');
    loadCommunityProfiles();
  }, [loadCommunityProfiles, navTo]);

  const handleDeleteAccount = useCallback(async () => {
    try {
      await apiFetch('/api/auth/account', { method: 'DELETE' });
    } catch (error) {
      setAuthError(error.message || 'Could not delete this account.');
      return false;
    }

    setCurrentUser(null);
    setGuestMode(false);
    setPracticeHistory([]);
    setSelectedProfileId(null);
    navTo('home');
    loadCommunityProfiles();
    return true;
  }, [loadCommunityProfiles, navTo]);

  const selectedProfile = useMemo(
    () => publicProfiles.find((profile) => profile.id === selectedProfileId) || null,
    [publicProfiles, selectedProfileId],
  );

  const renderPage = () => {
    switch (currentPage) {
      case 'auth':
        return (
          <AuthPage
            authMode={authMode}
            setAuthMode={setAuthMode}
            onSubmit={handleAuthSubmit}
            onContinueAsGuest={continueAsGuest}
            currentUser={currentUser}
            authError={authError}
            authSubmitting={authSubmitting}
            authChecking={authChecking}
          />
        );
      case 'profile':
        return (
          <ProfilePage
            currentUser={currentUser}
            practiceHistory={practiceHistory}
            onSave={handleProfileSave}
            onLogout={handleLogout}
            onDeleteAccount={handleDeleteAccount}
            onPasswordUpdate={handlePasswordUpdate}
            authError={authError}
            passwordSubmitting={passwordSubmitting}
          />
        );
      case 'community':
        return (
          <CommunityPage
            profiles={publicProfiles}
            selectedProfile={selectedProfile}
            onSelectProfile={handleProfileSelect}
            currentUser={currentUser}
            loading={communityLoading}
          />
        );
      case 'analyze':
        return (
          <AnalyzePage
            onDownloadReport={downloadReport}
            onAnalysisUserUpdate={handleAnalysisUserUpdate}
            isOffline={isOffline}
            isLoggedIn={Boolean(currentUser)}
          />
        );
      case 'samples':
        return <SampleLibrary />;
      case 'simulation':
        return (
          <SimulationMode
            onAnalysisUserUpdate={handleAnalysisUserUpdate}
            onDownloadReport={downloadReport}
            notify={pushToast}
            isOffline={isOffline}
            isLoggedIn={Boolean(currentUser)}
          />
        );
      case 'home':
      default:
        return <HomePage navTo={navTo} />;
    }
  };

  return (
    <div className="min-h-screen bg-surface-base text-slate-100">
      <a
        href="#main-content"
        className="sr-only rounded-control bg-sky-500 px-4 py-2 font-semibold text-white focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100]"
      >
        Skip to main content
      </a>
      <AppHeader
        currentPage={currentPage}
        navTo={navTo}
        currentUser={currentUser}
        guestMode={guestMode}
        adminAuthenticated={adminAuthenticated}
        openAuth={openAuth}
        openAdminPanel={openAdminPanel}
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
        installPrompt={installPrompt}
        handleInstallApp={handleInstallApp}
        announcement={announcement}
      />

      <main id="main-content" tabIndex={-1} className={currentPage === 'auth' ? 'mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8' : 'mx-auto w-full max-w-7xl px-4 py-4 sm:px-6 sm:py-6 lg:px-8'}>
        <AppStatusStack
          guestMode={guestMode}
          currentUser={currentUser}
          guestModeBannerVisible={guestModeBannerVisible}
          dismissGuestModeBanner={() => setGuestModeBannerVisible(false)}
          openAuth={openAuth}
          authError={authError}
          currentPage={currentPage}
          isWarmingBackend={isWarmingBackend}
          isOffline={isOffline}
        />
        <ErrorBoundary resetKey={currentPage}>
          <Suspense fallback={<PageFallback />}>
            {renderPage()}
          </Suspense>
        </ErrorBoundary>
      </main>

      <Footer navTo={navTo} />
      <Analytics />

      {showAdminPanel && adminAuthenticated && (
        <Suspense fallback={<PageFallback />}>
          <AdminPanel
            onClose={() => setShowAdminPanel(false)}
            onLogout={handleAdminLogout}
            notify={pushToast}
            announcement={announcement}
            onAnnouncementChange={setAnnouncement}
          />
        </Suspense>
      )}
      <AdminLoginModal
        open={adminLoginOpen}
        password={adminPassword}
        onPasswordChange={setAdminPassword}
        onClose={() => {
          if (!adminLoginSubmitting) {
            setAdminLoginOpen(false);
            setAdminLoginError('');
          }
        }}
        onSubmit={submitAdminLogin}
        error={adminLoginError}
        submitting={adminLoginSubmitting}
      />
      <ToastViewport toasts={toasts} dismissToast={dismissToast} />
    </div>
  );
}
