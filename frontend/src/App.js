// Complete App.js - Full Application with All Components and Mobile Hamburger Menu
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Analytics } from "@vercel/analytics/react"
import { Upload, Play, Pause, Download, CheckCircle, AlertCircle, Loader, FileAudio } from 'lucide-react';
import { AdminLoginModal, ToastViewport } from './components/AppOverlays';
import { AppHeader, AppStatusStack, Footer } from './components/AppChrome';
import { API_BASE_URL, DEFAULT_ANNOUNCEMENT, downloadDocumentFromBase64, pageFromLocation, pathForPage, readGuestModePreference, writeGuestModePreference } from './appShared';
import { apiFetch, isAbortError, waitForAnalysisJob } from './apiClient';
import AdminPanel from './pages/AdminPanel';
import AuthPage from './pages/AuthPage';
import CommunityPage from './pages/CommunityPage';
import HomePage from './pages/HomePage';
import ProfilePage from './pages/ProfilePage';
import SampleLibrary from './pages/SampleLibrary';
import SimulationMode from './pages/SimulationMode';

export default function SpeakUpApp() {
  const [currentPage, setCurrentPage] = useState(() => {
    return pageFromLocation(window.location);
  });
  const [step, setStep] = useState('input');
  const [topic, setTopic] = useState('');
  const [audioFile, setAudioFile] = useState(null);
  const [audioURL, setAudioURL] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [analysisProgressMessage, setAnalysisProgressMessage] = useState('Queued for processing.');
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

  const audioRef = useRef(null);
  const [installPrompt, setInstallPrompt] = useState(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  const pushToast = useCallback((message, tone = 'info') => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setToasts((current) => [...current, { id, message, tone }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, tone === 'error' ? 6000 : 4000);
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
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
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
            label: 'Reload Now',
            onClick: () => {
              if (registration && registration.waiting) {
                registration.waiting.postMessage({ type: 'SKIP_WAITING' });
              } else {
                window.location.reload();
              }
            }
          }
        }
      ]);
    };
    window.addEventListener('sw-update-available', handleSwUpdate);
    return () => window.removeEventListener('sw-update-available', handleSwUpdate);
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const loadCommunityProfiles = useCallback(async (options = {}) => {
    setCommunityLoading(true);
    try {
      const data = await apiFetch('/api/auth/community', { signal: options.signal });
      if (Array.isArray(data.profiles)) {
        setPublicProfiles(data.profiles);
      }
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
      if (Array.isArray(data.sessions)) {
        setPracticeHistory(data.sessions);
      }
    } catch (error) {
      if (isAbortError(error)) return;
      setPracticeHistory([]);
    }
  }, []);

  const loadAnnouncement = useCallback(async (options = {}) => {
    try {
      const data = await apiFetch('/api/site/announcement', { signal: options.signal });
      if (data.announcement) {
        setAnnouncement(data.announcement);
      }
    } catch (error) {
      if (isAbortError(error)) return;
      setAnnouncement(DEFAULT_ANNOUNCEMENT);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (audioURL) URL.revokeObjectURL(audioURL);
    };
  }, [audioURL]);

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
  }, [loadAnnouncement]);

  useEffect(() => {
    writeGuestModePreference(guestMode);
  }, [guestMode]);

  useEffect(() => {
    if (!guestMode || currentUser) {
      setGuestModeBannerVisible(true);
    }
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
        if (!controller.signal.aborted) {
          setAdminAuthenticated(Boolean(data.authenticated));
        }
      } catch (error) {
        if (!isAbortError(error) && !controller.signal.aborted) {
          setAdminAuthenticated(false);
        }
      }
    };
    loadAdminSession();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!communityLoading && publicProfiles.length === 0) {
      const controller = new AbortController();
      loadCommunityProfiles({ signal: controller.signal });
      return () => controller.abort();
    }
  }, [communityLoading, loadCommunityProfiles, publicProfiles.length]);

  useEffect(() => {
    if (currentUser && currentPage === 'profile' && practiceHistory.length === 0) {
      const controller = new AbortController();
      loadPracticeHistory({ signal: controller.signal });
      return () => controller.abort();
    }
  }, [currentPage, currentUser, loadPracticeHistory, practiceHistory.length]);

  useEffect(() => {
    setPublicProfiles((profiles) => {
      const withoutCurrent = profiles.filter((profile) => profile.id !== currentUser?.id);
      return currentUser ? [currentUser, ...withoutCurrent] : withoutCurrent;
    });
  }, [currentUser]);

  const handleFileUpload = useCallback((e) => {
    const file = e.target.files[0];
    if (file) {
      if (audioURL) URL.revokeObjectURL(audioURL);
      setAudioFile(file);
      const url = URL.createObjectURL(file);
      setAudioURL(url);
      setIsPlaying(false);
      setResults(null);
      setError(null);
      setStep('preview');
    }
  }, [audioURL]);

  const togglePlayback = useCallback(() => {
    if (audioRef.current) {
      if (isPlaying) audioRef.current.pause();
      else audioRef.current.play();
      setIsPlaying(p => !p);
    }
  }, [isPlaying]);

  const analyzeAudio = useCallback(async () => {
    if (isOffline) {
      setError('You are offline. Cannot perform analysis.');
      return;
    }
    if (!topic.trim()) { setError('Please enter a topic'); return; }
    if (!audioFile) { setError('Please upload audio'); return; }

    setStep('uploading');
    setError(null);
    setAnalysisProgressMessage('Uploading audio and queueing analysis.');

    const formData = new FormData();
    formData.append('audio', audioFile);
    formData.append('topic', topic);
    formData.append('source', 'analyze');

    try {
      const data = await apiFetch('/api/analyze', { method: 'POST', body: formData });
      const job = await waitForAnalysisJob(data.job.id, {
        onTick: (jobState) => setAnalysisProgressMessage(jobState?.progressMessage || 'Processing analysis job.'),
      });

      const result = job.result || null;
      if (!result) {
        throw new Error('Analysis job completed without a result payload.');
      }

      setResults(result);
      if (result.user) {
        setCurrentUser(result.user);
        setSelectedProfileId(result.user.id);
        loadPracticeHistory();
        loadCommunityProfiles();
      }
      setStep('results');
    } catch (error) {
      setError(error.message || 'Connection failed. Make sure the backend is running.');
      setStep('preview');
    }
  }, [topic, audioFile, loadCommunityProfiles, loadPracticeHistory, isOffline]);

  const downloadDocument = useCallback(() => {
    if (!results) {
      pushToast('No results are available yet.', 'error');
      return;
    }
    if (results.document_base64) {
      downloadDocumentFromBase64(results.document_base64, results.document_filename, {
        onError: (message) => pushToast(message, 'error'),
      });
    } else if (results.document_url) {
      window.open(`${API_BASE_URL}${results.document_url}`, '_blank');
    } else {
      pushToast('Document download is not available for this result.', 'error');
    }
  }, [results, pushToast]);

  const reset = useCallback(() => {
    setStep('input');
    setTopic('');
    if (audioURL) URL.revokeObjectURL(audioURL);
    setAudioFile(null);
    setAudioURL(null);
    setResults(null);
    setError(null);
    setIsPlaying(false);
    setAnalysisProgressMessage('Queued for processing.');
  }, [audioURL]);

  const openAdminPanel = useCallback(async () => {
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
        body: { password: adminPassword }
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

  const getScoreColor = useCallback((score, max) => {
    const percentage = (score / max) * 100;
    if (percentage >= 80) return 'text-green-400';
    if (percentage >= 60) return 'text-yellow-400';
    return 'text-red-400';
  }, []);

  const navTo = useCallback((page) => {
    const nextPath = pathForPage(page);
    if (window.location.pathname !== nextPath) {
      window.history.pushState({}, '', nextPath);
    }
    setCurrentPage(page);
    setMobileMenuOpen(false);
    if (page === 'analyze') reset();
  }, [reset]);

  const openAuth = useCallback((mode = 'login') => {
    setAuthError('');
    setAuthMode(mode);
    navTo('auth');
    setMobileMenuOpen(false);
  }, [navTo]);

  const continueAsGuest = useCallback(() => {
    setAuthError('');
    setGuestMode(true);
    setGuestModeBannerVisible(true);
    navTo('analyze');
    setMobileMenuOpen(false);
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
      const data = await apiFetch('/api/auth/profile', {
        method: 'PUT',
        body: updates,
      });

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
    navTo('community');
  }, [navTo]);

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
    setMobileMenuOpen(false);
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
    setMobileMenuOpen(false);
    loadCommunityProfiles();
    return true;
  }, [loadCommunityProfiles, navTo]);

  const selectedProfile = useMemo(
    () => publicProfiles.find((profile) => profile.id === selectedProfileId) || null,
    [publicProfiles, selectedProfileId],
  );

  return (
    <div style={{ fontFamily: 'Space Grotesk, ui-sans-serif, system-ui' }} className="min-h-screen text-slate-100 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.18),_transparent_30%),linear-gradient(180deg,#04111f_0%,#06101d_40%,#081220_100%)]">
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

      <div className={currentPage === 'auth' ? 'mx-auto max-w-6xl px-3 py-6 sm:px-6 sm:py-8' : 'mx-auto w-full max-w-7xl px-4 py-4 sm:px-6 sm:py-6 lg:px-8'}>
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
        {currentPage === 'home' ? (
          <HomePage navTo={navTo} openAuth={openAuth} continueAsGuest={continueAsGuest} currentUser={currentUser} />
        ) : currentPage === 'auth' ? (
          <AuthPage authMode={authMode} setAuthMode={setAuthMode} onSubmit={handleAuthSubmit} currentUser={currentUser} authError={authError} authSubmitting={authSubmitting} authChecking={authChecking} />
        ) : currentPage === 'profile' ? (
          <ProfilePage currentUser={currentUser} practiceHistory={practiceHistory} onSave={handleProfileSave} onLogout={handleLogout} onDeleteAccount={handleDeleteAccount} onPasswordUpdate={handlePasswordUpdate} authError={authError} passwordSubmitting={passwordSubmitting} />
        ) : currentPage === 'community' ? (
          <CommunityPage profiles={publicProfiles} selectedProfile={selectedProfile} onSelectProfile={handleProfileSelect} currentUser={currentUser} loading={communityLoading} />
        ) : currentPage === 'analyze' ? (
          <div className="space-y-6">
            {error && (
              <div className="rounded-2xl border border-red-400/25 bg-red-500/10 p-4 flex items-center gap-3 text-red-100">
                <AlertCircle size={18} />
                <span className="font-medium">{error}</span>
              </div>
            )}

            <div className="text-center mb-6">
              <h2 className="text-2xl sm:text-3xl font-bold mb-2 text-white">NEC Speech Analysis</h2>
              <p className="text-sm text-slate-300">Get your speech graded and reviewed in seconds!</p>
            </div>

            <div className="rounded-[32px] border border-white/10 bg-slate-950/65 p-6 shadow-[0_20px_80px_rgba(2,6,23,0.4)] sm:p-8">
              {step === 'input' && (
                <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
                  <div className="space-y-5">
                    <div>
                      <div className="mb-2 text-sm font-semibold text-slate-200">Speaking Question</div>
                      <p className="mb-3 text-sm text-slate-400">Paste the exact prompt so the feedback stays aligned with the task.</p>
                    </div>
                    <textarea
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      placeholder="Enter the topic or question you'll be speaking about..."
                      className="min-h-[210px] w-full rounded-[24px] border border-white/10 bg-[#07111f] px-5 py-4 text-white placeholder:text-slate-500"
                      rows="6"
                    />
                  </div>
                  <div className="space-y-4">
                    <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-5">
                      <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Workflow</div>
                      <div className="mt-3 space-y-3 text-sm text-slate-300">
                        <div className="flex items-center gap-3"><span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-sky-300">1</span><span>Paste the speaking prompt.</span></div>
                        <div className="flex items-center gap-3"><span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-sky-300">2</span><span>Upload and preview the recording.</span></div>
                        <div className="flex items-center gap-3"><span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-sky-300">3</span><span>Run analysis and download the report.</span></div>
                      </div>
                    </div>
                    <div className="rounded-[28px] border border-dashed border-sky-400/35 bg-sky-400/8 p-5">
                      <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-400/15 text-sky-300">
                        <FileAudio size={22} />
                      </div>
                      <div className="text-lg font-bold text-white">Upload your response</div>
                      <div className="mt-2 text-sm leading-7 text-slate-300">Choose one recording file. You'll be able to preview it before analysis.</div>
                      <label className="mt-5 inline-flex w-full items-center justify-center gap-3 rounded-2xl bg-sky-500 px-4 py-3 font-semibold text-white transition hover:bg-sky-400">
                        <Upload size={18} />
                        <span>Upload Audio File</span>
                        <input type="file" accept="audio/*" onChange={handleFileUpload} className="hidden" />
                      </label>
                      <p className="mt-3 text-xs text-slate-400">Supported: MP3, WAV, M4A, WEBM, OGG | Max 5 minutes</p>
                    </div>
                  </div>
                </div>
              )}

              {step === 'preview' && (
                <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
                  <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-6 text-center">
                    <div className="inline-flex items-center justify-center w-20 h-20 mb-4 rounded-3xl bg-sky-400/12 text-sky-300">
                      <FileAudio size={36} />
                    </div>
                    <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Uploaded File</div>
                    <div className="mt-3 text-lg font-semibold text-white break-all">{audioFile?.name}</div>
                    <div className="mt-2 text-sm text-slate-400">Preview the recording, then continue when it sounds correct.</div>
                  </div>
                  <div className="rounded-[28px] border border-white/10 bg-[#07111f] p-6">
                    <div className="text-sm font-semibold text-slate-200">Ready for submission</div>
                    <div className="mt-2 text-sm leading-7 text-slate-400">Once you submit, the app scores your speech and generates written feedback with a downloadable report.</div>
                    <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                      <button onClick={togglePlayback} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.05] px-6 py-3 text-white transition hover:bg-white/[0.09]">
                        {isPlaying ? <><Pause size={16} /> Pause Preview</> : <><Play size={16} /> Play Preview</>}
                      </button>
                      <button
                        onClick={analyzeAudio}
                        disabled={isOffline}
                        className={`inline-flex items-center justify-center gap-2 rounded-2xl px-6 py-3 font-semibold text-white transition ${isOffline ? 'bg-slate-700 cursor-not-allowed opacity-50' : 'bg-sky-500 hover:bg-sky-400'}`}
                      >
                        <CheckCircle size={16} /> {isOffline ? 'Offline - Cannot Analyze' : 'Analyze Speech'}
                      </button>
                    </div>
                    <div className="mt-6 rounded-2xl border border-sky-400/15 bg-sky-400/8 p-4 text-sm text-slate-300">
                      The analysis works best when the topic matches the actual response and the audio is clear.
                    </div>
                  </div>
                  <audio ref={audioRef} src={audioURL} onEnded={() => setIsPlaying(false)} />
                </div>
              )}

              {step === 'uploading' && (
                <div className="text-center py-14">
                  <div className="mx-auto mb-5 inline-flex h-20 w-20 items-center justify-center rounded-full border border-sky-400/25 bg-sky-400/10 text-sky-300">
                    <Loader className="animate-spin" size={40} />
                  </div>
                  <div className="text-xl font-semibold text-white">Analyzing your speech...</div>
                  <div className="mt-2 text-sm text-slate-300">{analysisProgressMessage}</div>
                  <div className="mt-1 text-sm text-slate-500">This can take a little longer while backend services are busy.</div>
                </div>
              )}

              {step === 'results' && results && (
                <div className="space-y-6">
                  <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
                    <div className="rounded-[28px] border border-sky-400/20 bg-sky-400/10 p-6 text-center">
                      <div className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-300">Overall Score</div>
                      <div className="mt-4 text-6xl font-extrabold text-white">{results.scores.total.toFixed(2)}</div>
                      <div className="mt-2 text-sm text-slate-300">out of 2.0</div>
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                      {[
                        { label: 'Content', score: results.scores.content, max: 0.9 },
                        { label: 'Accuracy', score: results.scores.accuracy, max: 0.6 },
                        { label: 'Delivery', score: results.scores.delivery, max: 0.5 }
                      ].map((item, idx) => (
                        <div key={idx} className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5 text-center">
                          <div className="text-xs font-bold uppercase tracking-[0.22em] text-slate-400">{item.label}</div>
                          <div className={`mt-3 text-3xl font-black ${getScoreColor(item.score, item.max)}`}>{item.score.toFixed(2)}</div>
                          <div className="mt-1 text-xs text-slate-500">/ {item.max.toFixed(1)}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-bold mb-3 text-white">Detailed Feedback</h3>
                    <div className="space-y-3">
                      <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
                        <div className="font-semibold text-white">Content</div>
                        <div className="mt-2 text-sm leading-7 text-slate-300">{results.feedback.content}</div>
                      </div>
                      <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
                        <div className="font-semibold text-white">Accuracy</div>
                        <div className="mt-2 text-sm leading-7 text-slate-300">{results.feedback.accuracy}</div>
                      </div>
                      <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
                        <div className="font-semibold text-white">Delivery</div>
                        <div className="mt-2 text-sm leading-7 text-slate-300">{results.feedback.delivery}</div>
                      </div>
                    </div>
                  </div>

                  {results.sample_response && (
                    <div className="rounded-[24px] border border-amber-400/20 bg-amber-400/8 p-4">
                      <h4 className="font-bold mb-2 text-white">Sample 2.0 Response</h4>
                      <div className="text-sm whitespace-pre-line text-slate-200">{results.sample_response}</div>
                    </div>
                  )}

                  <div className="flex flex-col gap-3 sm:flex-row">
                    <button onClick={downloadDocument} className="inline-flex items-center justify-center gap-2 flex-1 rounded-2xl bg-sky-500 py-3 text-white transition hover:bg-sky-400"><Download size={16} /> Download Report</button>
                    <button onClick={reset} className="rounded-2xl border border-white/10 bg-white/[0.04] px-6 py-3 text-white transition hover:bg-white/[0.08]">New Analysis</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : currentPage === 'samples' ? (
          <SampleLibrary />
        ) : currentPage === 'simulation' ? (
          <SimulationMode onAnalysisUserUpdate={handleAnalysisUserUpdate} notify={pushToast} isOffline={isOffline} />
        ) : (
          <HomePage navTo={navTo} openAuth={openAuth} continueAsGuest={continueAsGuest} currentUser={currentUser} />
        )}
      </div>

      <Footer setCurrentPage={navTo} />
      <Analytics />

      {showAdminPanel && adminAuthenticated && (
        <AdminPanel
          onClose={() => setShowAdminPanel(false)}
          onLogout={handleAdminLogout}
          notify={pushToast}
          announcement={announcement}
          onAnnouncementChange={setAnnouncement}
        />
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



