import React, { useState, useEffect, useCallback, useMemo, useRef, lazy, Suspense } from 'react';
import { Analytics } from '@vercel/analytics/react';
import { Loader, MessageSquare } from 'lucide-react';
import { AppHeader, AppStatusStack, Footer } from './components/AppChrome';
import ErrorBoundary from './components/ErrorBoundary';
import { API_BASE_URL, DEFAULT_ANNOUNCEMENT, PAGE_TITLES, downloadDocumentFromBase64, pageFromLocation, pathForPage, readGuestModePreference, writeGuestModePreference } from './appShared';
import { apiFetch, isAbortError } from './apiClient';
import HomePage from './pages/HomePage';

// HomePage stays eager: it is the landing route and the router's fallback, so
// deferring it would only add a flash. Everything else is split out -- most
// visitors never open Simulation, and AdminPanel (the largest page in the app)
// is useless to anyone who is not an admin.
const AdminPanel = lazy(() => import('./pages/AdminPanel'));
// Pop-ups and toasts (and the motion library they animate with) load in their
// own chunk: fetched when the browser is idle, or the first time one is needed.
const loadOverlays = () => import('./components/AppOverlays');
const AdminLoginModal = lazy(() => loadOverlays().then((module) => ({ default: module.AdminLoginModal })));
const FeedbackModal = lazy(() => loadOverlays().then((module) => ({ default: module.FeedbackModal })));
const ToastViewport = lazy(() => loadOverlays().then((module) => ({ default: module.ToastViewport })));
const AnalyzePage = lazy(() => import('./pages/AnalyzePage'));
const AuthPage = lazy(() => import('./pages/AuthPage'));
const CommunityPage = lazy(() => import('./pages/CommunityPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const SampleLibrary = lazy(() => import('./pages/SampleLibrary'));
const SimulationMode = lazy(() => import('./pages/SimulationMode'));

function PageFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center" role="status" aria-live="polite">
      <Loader size={28} className="animate-spin text-sky-600 dark:text-sky-300" />
      <span className="sr-only">Loading page</span>
    </div>
  );
}

// Longer than a warm health check (~0.2-1.7 s observed) and far shorter than
// a cold start (20-45 s).
const BACKEND_SLOW_MS = 2000;

export default function SpeakUpApp() {
  const [currentPage, setCurrentPage] = useState(() => pageFromLocation(window.location));
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isWarmingBackend, setIsWarmingBackend] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [authError, setAuthError] = useState('');
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);
  // Whether the backend can send email (RESEND_API_KEY set); hides prompts that would fail.
  const [emailEnabled, setEmailEnabled] = useState(false);
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);
  const [communityLoading, setCommunityLoading] = useState(true);
  const communityLoadedRef = useRef(false);
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
      communityLoadedRef.current = true;
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

  // The community list is ~200 KB from the slowest endpoint and only the
  // Community page uses it. It used to load on every page view and hold the
  // "Connecting analysis service..." banner up for ~3 s after the page was
  // already usable (~0.6 s). Load it when Community is first opened; later
  // refreshes (after login or an analysis) only run once it has been loaded.
  const refreshCommunityProfiles = useCallback(
    () => (communityLoadedRef.current ? loadCommunityProfiles() : Promise.resolve()),
    [loadCommunityProfiles],
  );

  useEffect(() => {
    document.title = PAGE_TITLES[currentPage] || PAGE_TITLES.home;
  }, [currentPage]);

  useEffect(() => {
    if (currentPage !== 'community' || communityLoadedRef.current) return undefined;
    const controller = new AbortController();
    loadCommunityProfiles({ signal: controller.signal });
    return () => controller.abort();
  }, [currentPage, loadCommunityProfiles]);

  useEffect(() => {
    const controller = new AbortController();
    // The banner means what it says: only the analysis service's own health
    // check counts, and only a slow answer -- the free-tier server waking up,
    // which takes 20-45 s -- shows it. A warm server answers in well under the
    // threshold and the banner never appears.
    const slowTimer = window.setTimeout(() => setIsWarmingBackend(true), BACKEND_SLOW_MS);
    apiFetch('/api/health', { method: 'GET', signal: controller.signal })
      .catch(() => {
        // Reachability problems surface on the action that needs the server.
      })
      .finally(() => {
        window.clearTimeout(slowTimer);
        if (!controller.signal.aborted) setIsWarmingBackend(false);
      });
    loadAnnouncement({ signal: controller.signal });
    return () => {
      controller.abort();
      window.clearTimeout(slowTimer);
    };
  }, [loadAnnouncement]);

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
        setEmailEnabled(Boolean(data.emailEnabled));
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

  // Bumped by "Start my first practice"; Analyze fills in a random question.
  const [randomQuestionRequest, setRandomQuestionRequest] = useState(0);
  const handleRandomQuestionHandled = useCallback(() => setRandomQuestionRequest(0), []);
  const startPractice = useCallback((mode) => {
    if (mode === 'simulation') {
      navTo('simulation');
      return;
    }
    setRandomQuestionRequest((count) => count + 1);
    navTo('analyze');
  }, [navTo]);

  const [feedbackOpen, setFeedbackOpen] = useState(false);

  // Mount the pop-up chunk once it is wanted (or prefetched), and keep it
  // mounted so pop-ups can animate out.
  const [overlaysMounted, setOverlaysMounted] = useState(false);
  const overlaysWanted = overlaysMounted || feedbackOpen || adminLoginOpen || toasts.length > 0;
  useEffect(() => {
    if (overlaysWanted && !overlaysMounted) setOverlaysMounted(true);
  }, [overlaysWanted, overlaysMounted]);
  useEffect(() => {
    const idle = window.requestIdleCallback || ((callback) => window.setTimeout(callback, 2000));
    const cancel = window.cancelIdleCallback || window.clearTimeout;
    const handle = idle(() => {
      loadOverlays().then(() => setOverlaysMounted(true), () => {});
    });
    return () => cancel(handle);
  }, []);

  // The admin panel stays mounted until its exit animation has finished.
  const [adminPanelMounted, setAdminPanelMounted] = useState(false);
  const adminPanelOpen = showAdminPanel && adminAuthenticated;
  useEffect(() => {
    if (adminPanelOpen) setAdminPanelMounted(true);
  }, [adminPanelOpen]);
  const openFeedback = useCallback(() => setFeedbackOpen(true), []);
  const closeFeedback = useCallback(() => setFeedbackOpen(false), []);
  const sendFeedback = useCallback(async ({ message, contact }) => {
    await apiFetch('/api/feedback', { method: 'POST', body: { message, contact, page: currentPage } });
    pushToast('Thanks! Your feedback was sent.', 'success');
  }, [currentPage, pushToast]);

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
      await refreshCommunityProfiles();
      navTo('profile');
      if (data.claimedResults) {
        pushToast(data.claimedResults === 1
          ? 'Your guest result was saved to your profile.'
          : `${data.claimedResults} guest results were saved to your profile.`, 'success');
      }
      return true;
    } catch (error) {
      setAuthError(error.message || 'Could not reach the account endpoint. Make sure the backend is running.');
      return false;
    } finally {
      setAuthSubmitting(false);
    }
  }, [refreshCommunityProfiles, loadPracticeHistory, navTo, pushToast]);

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
      // Confirm as soon as the server has it; the community list (a slow
      // request) catches up in the background.
      pushToast('Profile saved.', 'success');
      refreshCommunityProfiles().catch(() => {});
      return true;
    } catch (error) {
      setAuthError(error.message || 'Could not save profile changes.');
      return false;
    }
  }, [refreshCommunityProfiles, pushToast]);

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
    await refreshCommunityProfiles();
  }, [loadPracticeHistory, refreshCommunityProfiles]);

  // Photo or cover saved straight from the profile header; errors go back to it.
  const handleQuickProfileSave = useCallback(async (updates) => {
    const data = await apiFetch('/api/auth/profile', { method: 'PUT', body: updates });
    if (!data.user) throw new Error(data.error || 'Could not save that image.');
    setCurrentUser(data.user);
  }, []);

  const handleEmailVerified = useCallback((user) => {
    if (!user) return;
    setCurrentUser(user);
    pushToast('Email confirmed.', 'success');
  }, [pushToast]);

  const handlePasswordReset = useCallback(async (user) => {
    if (!user) return;
    setCurrentUser(user);
    setGuestMode(false);
    setSelectedProfileId(user.id);
    navTo('profile');
    pushToast('Password changed. You are logged in.', 'success');
    await loadPracticeHistory();
  }, [loadPracticeHistory, navTo, pushToast]);

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
    refreshCommunityProfiles();
  }, [refreshCommunityProfiles, navTo]);

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
    refreshCommunityProfiles();
    return true;
  }, [refreshCommunityProfiles, navTo]);

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
            onPasswordReset={handlePasswordReset}
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
            onStartPractice={startPractice}
            emailEnabled={emailEnabled}
            onEmailVerified={handleEmailVerified}
            onQuickSave={handleQuickProfileSave}
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
            emailEnabled={emailEnabled}
            onEmailVerified={handleEmailVerified}
          />
        );
      case 'analyze':
        return (
          <AnalyzePage
            onDownloadReport={downloadReport}
            onAnalysisUserUpdate={handleAnalysisUserUpdate}
            isOffline={isOffline}
            isLoggedIn={Boolean(currentUser)}
            onOpenAuth={openAuth}
            randomQuestionRequest={randomQuestionRequest}
            onRandomQuestionHandled={handleRandomQuestionHandled}
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
            onOpenAuth={openAuth}
          />
        );
      case 'home':
      default:
        return <HomePage navTo={navTo} />;
    }
  };

  return (
    <div className="min-h-svh bg-surface-base text-ink">
      <a
        href="#main-content"
        className="sr-only rounded-control bg-ink px-4 py-2 font-semibold text-on-ink focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100]"
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

      <Footer navTo={navTo} onFeedback={openFeedback} />
      <Analytics />

      {(adminPanelMounted || adminPanelOpen) && adminAuthenticated && (
        <Suspense fallback={adminPanelOpen ? <PageFallback /> : null}>
          <AdminPanel
            open={adminPanelOpen}
            onExitComplete={() => setAdminPanelMounted(false)}
            onClose={() => setShowAdminPanel(false)}
            onLogout={handleAdminLogout}
            notify={pushToast}
            announcement={announcement}
            onAnnouncementChange={setAnnouncement}
          />
        </Suspense>
      )}
      {overlaysWanted && (
      <Suspense fallback={null}>
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
      </Suspense>
      )}
      {/* Kept off the simulation, where it would sit on top of a timed test. */}
      {currentPage !== 'simulation' && (
        <button
          type="button"
          onClick={openFeedback}
          className="material fixed bottom-[calc(1rem+env(safe-area-inset-bottom,0px))] right-[calc(1rem+env(safe-area-inset-right,0px))] z-[60] inline-flex items-center gap-2 rounded-full border border-sky-200 dark:border-sky-400/25 bg-surface-raised/95 p-3 text-sm font-semibold text-sky-700 dark:text-sky-300 shadow-lg backdrop-blur transition hover:bg-overlay-hover sm:px-4 sm:py-2.5"
          aria-label="Send feedback"
        >
          <MessageSquare size={16} aria-hidden="true" />
          <span className="hidden sm:inline">Feedback</span>
        </button>
      )}
      {overlaysWanted && (
        <Suspense fallback={null}>
          <FeedbackModal open={feedbackOpen} onClose={closeFeedback} onSubmit={sendFeedback} isLoggedIn={Boolean(currentUser)} />
          <ToastViewport toasts={toasts} dismissToast={dismissToast} />
        </Suspense>
      )}
    </div>
  );
}
