import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Analytics } from "@vercel/analytics/react"
import { Upload, Pause, Download, CheckCircle, AlertCircle, Loader, FileAudio, ClipboardList, RotateCcw, Volume2, Mic, Square } from 'lucide-react';
import { AdminLoginModal, ToastViewport } from './components/AppOverlays';
import { AppHeader, AppStatusStack, Footer } from './components/AppChrome';
import ResultsInsights from './components/ResultsInsights';
import { API_BASE_URL, DEFAULT_ANNOUNCEMENT, downloadDocumentFromBase64, pageFromLocation, pathForPage, readGuestModePreference, writeGuestModePreference } from './appShared';
import { apiFetch, isAbortError, waitForAnalysisJob } from './apiClient';
import AdminPanel from './pages/AdminPanel';
import AuthPage from './pages/AuthPage';
import CommunityPage from './pages/CommunityPage';
import HomePage from './pages/HomePage';
import ProfilePage from './pages/ProfilePage';
import SampleLibrary from './pages/SampleLibrary';
import SimulationMode from './pages/SimulationMode';

const ANALYZE_MAX_RECORDING_SECONDS = 300;
const ANALYZE_MAX_AUDIO_BYTES = 50 * 1024 * 1024;
const SAMPLE_ANALYZE_PROMPT = 'Many students join competitions to improve confidence. What have you learned from preparing for an English competition?';

const formatDuration = (seconds = 0) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
};

export default function SpeakUpApp() {
  const [currentPage, setCurrentPage] = useState(() => {
    return pageFromLocation(window.location);
  });
  const [step, setStep] = useState('input');
  const [topic, setTopic] = useState('');
  const [audioFile, setAudioFile] = useState(null);
  const [audioURL, setAudioURL] = useState(null);
  const [audioSourceType, setAudioSourceType] = useState('upload');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isAnalyzeRecording, setIsAnalyzeRecording] = useState(false);
  const [analyzeRecordingSeconds, setAnalyzeRecordingSeconds] = useState(0);
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
  const uploadInputRef = useRef(null);
  const replaceInputRef = useRef(null);
  const analyzeRecorderRef = useRef(null);
  const analyzeAudioChunksRef = useRef([]);
  const analyzeRecordingTimerRef = useRef(null);
  const analyzeStreamRef = useRef(null);
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

  const releaseAnalyzeRecordingResources = useCallback(() => {
    if (analyzeRecordingTimerRef.current) {
      clearInterval(analyzeRecordingTimerRef.current);
      analyzeRecordingTimerRef.current = null;
    }
    if (analyzeStreamRef.current) {
      analyzeStreamRef.current.getTracks().forEach((track) => track.stop());
      analyzeStreamRef.current = null;
    }
  }, []);

  const cancelAnalyzeRecording = useCallback(() => {
    const recorder = analyzeRecorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      recorder.ondataavailable = null;
      recorder.onstop = null;
      recorder.stop();
    }
    analyzeRecorderRef.current = null;
    analyzeAudioChunksRef.current = [];
    releaseAnalyzeRecordingResources();
    setIsAnalyzeRecording(false);
    setAnalyzeRecordingSeconds(0);
  }, [releaseAnalyzeRecordingResources]);

  useEffect(() => {
    return () => {
      if (audioURL) URL.revokeObjectURL(audioURL);
    };
  }, [audioURL]);

  useEffect(() => {
    return () => {
      cancelAnalyzeRecording();
    };
  }, [cancelAnalyzeRecording]);

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

  const clearAnalyzeAudio = useCallback(() => {
    if (audioURL) URL.revokeObjectURL(audioURL);
    setAudioFile(null);
    setAudioURL(null);
    setAudioSourceType('upload');
    setIsPlaying(false);
  }, [audioURL]);

  const handleFileUpload = useCallback((e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > ANALYZE_MAX_AUDIO_BYTES) {
        setError('Audio file is over 50 MB. Upload a shorter recording or compress the file before analysis.');
        e.target.value = '';
        return;
      }
      cancelAnalyzeRecording();
      if (audioURL) URL.revokeObjectURL(audioURL);
      setAudioFile(file);
      const url = URL.createObjectURL(file);
      setAudioURL(url);
      setAudioSourceType('upload');
      setIsPlaying(false);
      setAnalyzeRecordingSeconds(0);
      setResults(null);
      setError(null);
      setStep('preview');
      e.target.value = '';
    }
  }, [audioURL, cancelAnalyzeRecording]);

  const startAnalyzeRecording = useCallback(async () => {
    if (isAnalyzeRecording) return;
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setError('Recording is not supported in this browser. Upload an audio file instead.');
      return;
    }

    clearAnalyzeAudio();
    setError(null);
    setResults(null);
    setStep('input');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const preferredType = MediaRecorder.isTypeSupported?.('audio/webm') ? 'audio/webm' : '';
      const recorder = preferredType ? new MediaRecorder(stream, { mimeType: preferredType }) : new MediaRecorder(stream);

      analyzeStreamRef.current = stream;
      analyzeRecorderRef.current = recorder;
      analyzeAudioChunksRef.current = [];
      setAudioSourceType('recording');
      setAnalyzeRecordingSeconds(0);

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) analyzeAudioChunksRef.current.push(event.data);
      };

      recorder.onstop = () => {
        const type = preferredType || 'audio/webm';
        const audioBlob = new Blob(analyzeAudioChunksRef.current, { type });
        analyzeAudioChunksRef.current = [];
        releaseAnalyzeRecordingResources();
        setIsAnalyzeRecording(false);

        if (audioBlob.size === 0) {
          setAudioSourceType('upload');
          setError('No recording audio was captured. Try recording again or upload a file.');
          return;
        }

        const recordedFile = new File([audioBlob], `necs-recording-${Date.now()}.webm`, { type });
        setAudioFile(recordedFile);
        setAudioURL(URL.createObjectURL(recordedFile));
        setAudioSourceType('recording');
        setIsPlaying(false);
        setStep('preview');
      };

      recorder.start();
      setIsAnalyzeRecording(true);
      analyzeRecordingTimerRef.current = setInterval(() => {
        setAnalyzeRecordingSeconds((current) => {
          const next = current + 1;
          if (next >= ANALYZE_MAX_RECORDING_SECONDS) {
            if (analyzeRecordingTimerRef.current) {
              clearInterval(analyzeRecordingTimerRef.current);
              analyzeRecordingTimerRef.current = null;
            }
            if (analyzeRecorderRef.current && analyzeRecorderRef.current.state !== 'inactive') {
              analyzeRecorderRef.current.stop();
            }
            return ANALYZE_MAX_RECORDING_SECONDS;
          }
          return next;
        });
      }, 1000);
    } catch {
      releaseAnalyzeRecordingResources();
      setIsAnalyzeRecording(false);
      setAudioSourceType('upload');
      setError('Microphone access was blocked. Allow microphone permission or upload an audio file instead.');
    }
  }, [clearAnalyzeAudio, isAnalyzeRecording, releaseAnalyzeRecordingResources]);

  const stopAnalyzeRecording = useCallback(() => {
    if (analyzeRecordingTimerRef.current) {
      clearInterval(analyzeRecordingTimerRef.current);
      analyzeRecordingTimerRef.current = null;
    }
    if (analyzeRecorderRef.current && analyzeRecorderRef.current.state !== 'inactive') {
      analyzeRecorderRef.current.stop();
    } else {
      releaseAnalyzeRecordingResources();
      setIsAnalyzeRecording(false);
    }
  }, [releaseAnalyzeRecordingResources]);

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
    if (!topic.trim()) { setError('Enter a speaking prompt before analyzing.'); return; }
    if (!audioFile) { setError('Upload or record an audio response before analyzing.'); return; }

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
    cancelAnalyzeRecording();
    setStep('input');
    setTopic('');
    clearAnalyzeAudio();
    setResults(null);
    setError(null);
    setAnalysisProgressMessage('Queued for processing.');
  }, [cancelAnalyzeRecording, clearAnalyzeAudio]);

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
  const analyzeWorkflow = [
    {
      label: 'Record',
      icon: Mic,
      active: step === 'input' || step === 'preview',
      complete: step === 'uploading' || step === 'results',
    },
    {
      label: 'Analyze',
      icon: Loader,
      active: step === 'uploading',
      complete: step === 'results',
    },
    {
      label: 'Review',
      icon: CheckCircle,
      active: step === 'results',
      complete: false,
    },
  ];

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#071019_0%,#08111d_48%,#050b12_100%)] text-slate-100">
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
          <HomePage navTo={navTo} />
        ) : currentPage === 'auth' ? (
          <AuthPage authMode={authMode} setAuthMode={setAuthMode} onSubmit={handleAuthSubmit} currentUser={currentUser} authError={authError} authSubmitting={authSubmitting} authChecking={authChecking} />
        ) : currentPage === 'profile' ? (
          <ProfilePage currentUser={currentUser} practiceHistory={practiceHistory} onSave={handleProfileSave} onLogout={handleLogout} onDeleteAccount={handleDeleteAccount} onPasswordUpdate={handlePasswordUpdate} authError={authError} passwordSubmitting={passwordSubmitting} />
        ) : currentPage === 'community' ? (
          <CommunityPage profiles={publicProfiles} selectedProfile={selectedProfile} onSelectProfile={handleProfileSelect} currentUser={currentUser} loading={communityLoading} />
        ) : currentPage === 'analyze' ? (
          <div className="space-y-4 sm:space-y-6">
            <section className="mx-auto max-w-3xl text-center" aria-labelledby="analyze-page-title">
              <h1 id="analyze-page-title" className="text-2xl font-black tracking-tight text-white sm:text-3xl">
                Analyze
              </h1>
              <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-slate-400 sm:text-base">
                Record or upload a response, run analysis, and receive feedback.
              </p>
            </section>

            <div className="mx-auto max-w-xl rounded-2xl border border-white/10 bg-white/[0.025] p-1.5" aria-label="Analyze workflow">
              <div className="grid grid-cols-3 gap-1.5">
                {analyzeWorkflow.map((item) => {
                  const Icon = item.complete ? CheckCircle : item.icon;
                  return (
                    <div
                      key={item.label}
                      className={`flex min-h-[44px] items-center justify-center gap-2 rounded-xl px-2 py-2 text-xs font-semibold transition sm:text-sm ${
                        item.complete
                          ? 'bg-emerald-400/10 text-emerald-100'
                          : item.active
                            ? 'bg-sky-400/10 text-sky-100'
                            : 'text-slate-500'
                      }`}
                    >
                      <Icon size={16} className={item.active && item.label === 'Analyze' ? 'animate-spin' : ''} />
                      <span>{item.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-3 rounded-xl border border-rose-400/25 bg-rose-500/10 p-3 text-sm text-rose-100 sm:p-4" role="alert">
                <AlertCircle size={18} className="mt-0.5" />
                <span className="min-w-0 font-medium">{error}</span>
              </div>
            )}

            <div className="rounded-2xl border border-white/10 bg-slate-950/55 p-4 sm:p-5 lg:p-6">
              {step === 'input' && (
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1.08fr)_minmax(320px,0.92fr)]">
                  <div className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.04] p-4 sm:p-5">
                    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-400/12 text-sky-200 sm:h-11 sm:w-11">
                        <ClipboardList size={20} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold text-white">Speaking prompt</div>
                        <div className="mt-1 text-sm leading-6 text-slate-400">Use the exact question when you have it.</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setTopic(SAMPLE_ANALYZE_PROMPT)}
                        className="inline-flex min-h-[40px] shrink-0 items-center justify-center gap-2 rounded-xl border border-sky-400/20 bg-sky-400/10 px-4 py-2 text-sm font-semibold text-sky-100 transition hover:bg-sky-400/15"
                      >
                        <ClipboardList size={15} />
                        Use sample prompt
                      </button>
                    </div>
                    <textarea
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      placeholder="Enter the topic or question."
                      className="min-h-[178px] w-full resize-y rounded-xl border border-white/10 bg-[#07111f] px-4 py-3 text-white outline-none transition placeholder:text-slate-300 focus:border-sky-400/40 focus:ring-2 focus:ring-sky-400/10 sm:min-h-[220px] sm:px-5 sm:py-4"
                      rows="6"
                    />
                  </div>
                  <div className="min-w-0 space-y-4">
                    <div className="rounded-2xl border border-sky-400/25 bg-sky-400/10 p-4 sm:p-5">
                      <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-sky-400/15 text-sky-200 sm:h-12 sm:w-12">
                        <FileAudio size={22} />
                      </div>
                      <div className="text-lg font-bold text-white">Upload audio</div>
                      <div id="recording-file-help" className="mt-2 text-sm leading-6 text-slate-300">MP3, WAV, M4A, WEBM, or OGG. Max 50 MB.</div>
                      <button
                        type="button"
                        onClick={() => uploadInputRef.current?.click()}
                        aria-describedby="recording-file-help"
                        aria-controls="recording-file-input"
                        className="mt-4 inline-flex w-full items-center justify-center gap-3 rounded-xl bg-sky-500 px-4 py-3 font-semibold text-white transition hover:bg-sky-400 active:translate-y-px"
                      >
                        <Upload size={18} />
                        Upload audio
                      </button>
                      <input id="recording-file-input" ref={uploadInputRef} type="file" accept="audio/*" onChange={handleFileUpload} className="hidden" />
                    </div>

                    <div className={`rounded-2xl border p-4 transition sm:p-5 ${isAnalyzeRecording ? 'border-rose-400/30 bg-rose-500/10' : 'border-white/10 bg-white/[0.04]'}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-400/12 text-emerald-200 sm:h-11 sm:w-11">
                            <Mic size={20} />
                          </div>
                          <div className="mt-4 text-lg font-bold text-white">Record audio</div>
                          <div className="mt-2 text-sm leading-6 text-slate-300">Use your microphone, then preview before analysis.</div>
                        </div>
                        <div className={`rounded-full border px-3 py-1 text-sm font-semibold ${isAnalyzeRecording ? 'border-rose-300/30 bg-rose-300/10 text-rose-100' : 'border-white/10 bg-white/[0.05] text-slate-300'}`}>
                          {formatDuration(analyzeRecordingSeconds)}
                        </div>
                      </div>
                      <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/[0.08]">
                        <div
                          className={`h-full rounded-full transition-all ${isAnalyzeRecording ? 'bg-rose-400' : 'bg-emerald-400'}`}
                          style={{ width: `${Math.min(100, (analyzeRecordingSeconds / ANALYZE_MAX_RECORDING_SECONDS) * 100)}%` }}
                        />
                      </div>
                      {isAnalyzeRecording ? (
                        <div className="mt-5 grid grid-cols-[1fr_auto] gap-2">
                          <button onClick={stopAnalyzeRecording} className="inline-flex items-center justify-center gap-2 rounded-xl bg-rose-500 px-4 py-3 font-semibold text-white transition hover:bg-rose-400">
                            <Square size={16} fill="currentColor" />
                            Stop recording
                          </button>
                          <button onClick={cancelAnalyzeRecording} className="inline-flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-slate-200 transition hover:bg-white/[0.08]" aria-label="Cancel recording" title="Cancel recording">
                            <RotateCcw size={16} />
                          </button>
                        </div>
                      ) : (
                        <button onClick={startAnalyzeRecording} className="mt-5 inline-flex w-full items-center justify-center gap-3 rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 font-semibold text-emerald-100 transition hover:bg-emerald-400/15 active:translate-y-px">
                          <Mic size={18} />
                          Start recording
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {step === 'preview' && (
                <div className="grid gap-5 lg:grid-cols-[minmax(280px,0.85fr)_minmax(0,1.15fr)]">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 text-center sm:p-6">
                    <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-sky-400/12 text-sky-200 sm:h-20 sm:w-20">
                      <FileAudio size={36} />
                    </div>
                    <div className="text-sm font-semibold text-slate-300">{audioSourceType === 'recording' ? 'Browser recording' : 'Uploaded file'}</div>
                    <div className="mt-3 break-all text-lg font-semibold text-white">{audioFile?.name}</div>
                    <div className="mt-2 text-sm text-slate-400">
                      {audioSourceType === 'recording'
                        ? `Recorded in the browser. Duration: ${formatDuration(analyzeRecordingSeconds)}.`
                        : 'Preview the recording, then continue when it sounds correct.'}
                    </div>
                    <div className="mt-5 flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={() => replaceInputRef.current?.click()}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-white/[0.08]"
                      >
                        <Upload size={15} />
                        Replace file
                      </button>
                      <input ref={replaceInputRef} type="file" accept="audio/*" onChange={handleFileUpload} className="hidden" />
                      <button onClick={startAnalyzeRecording} className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-2.5 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-400/15">
                        <Mic size={15} />
                        Record again
                      </button>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-[#07111f] p-5 sm:p-6">
                    <div className="text-sm font-semibold text-white">Ready for submission</div>
                    <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.04] p-4">
                      <div className="text-sm font-semibold text-slate-300">Prompt</div>
                      <div className="mt-2 max-h-28 overflow-y-auto text-sm leading-7 text-slate-300">{topic || 'No prompt entered yet.'}</div>
                    </div>
                    <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                      <button onClick={togglePlayback} className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.05] px-6 py-3 font-semibold text-white transition hover:bg-white/[0.09]">
                        {isPlaying ? <><Pause size={16} /> Pause preview</> : <><Volume2 size={16} /> Play preview</>}
                      </button>
                      <button
                        onClick={analyzeAudio}
                        disabled={isOffline}
                        className={`inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 font-semibold text-white transition ${isOffline ? 'bg-slate-700 cursor-not-allowed opacity-50' : 'bg-sky-500 hover:bg-sky-400'}`}
                      >
                        <CheckCircle size={16} /> {isOffline ? 'Offline, cannot analyze' : 'Analyze speech'}
                      </button>
                    </div>
                    <div className="mt-5 grid gap-3 sm:grid-cols-3">
                      {['Content', 'Accuracy', 'Delivery'].map((label) => (
                        <div key={label} className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-center text-sm font-semibold text-slate-200">
                          {label}
                        </div>
                      ))}
                    </div>
                  </div>
                  <audio ref={audioRef} src={audioURL} onEnded={() => setIsPlaying(false)} />
                </div>
              )}

              {step === 'uploading' && (
                <div className="text-center py-14" role="status" aria-live="polite">
                  <div className="mx-auto mb-5 inline-flex h-20 w-20 items-center justify-center rounded-full border border-sky-400/25 bg-sky-400/10 text-sky-200">
                    <Loader className="animate-spin" size={40} />
                  </div>
                  <div className="text-xl font-semibold text-white">Analyzing speech</div>
                  <div className="mt-2 text-sm text-slate-300">{analysisProgressMessage}</div>
                  <div className="mx-auto mt-6 h-2 max-w-md overflow-hidden rounded-full bg-white/[0.06]">
                    <div className="h-full w-1/2 animate-pulse rounded-full bg-sky-400" />
                  </div>
                </div>
              )}

              {step === 'results' && results && (
                <div className="space-y-6">
                  <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
                    <div className="rounded-2xl border border-sky-400/20 bg-sky-400/10 p-6 text-center">
                      <div className="text-sm font-semibold text-sky-200">Overall score</div>
                      <div className="mt-4 text-6xl font-extrabold text-white">{results.scores.total.toFixed(2)}</div>
                      <div className="mt-2 text-sm text-slate-300">out of 2.0</div>
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                      {[
                        { label: 'Content', score: results.scores.content, max: 0.9 },
                        { label: 'Accuracy', score: results.scores.accuracy, max: 0.6 },
                        { label: 'Delivery', score: results.scores.delivery, max: 0.5 }
                      ].map((item, idx) => (
                        <div key={idx} className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 text-center">
                          <div className="text-sm font-bold text-slate-300">{item.label}</div>
                          <div className={`mt-3 text-3xl font-black ${getScoreColor(item.score, item.max)}`}>{item.score.toFixed(2)}</div>
                          <div className="mt-1 text-xs text-slate-500">/ {item.max.toFixed(1)}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="mb-3 text-lg font-bold text-white">Detailed feedback</h3>
                    <div className="grid gap-3 lg:grid-cols-3">
                      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                        <div className="font-semibold text-white">Content</div>
                        <div className="mt-2 text-sm leading-7 text-slate-300">{results.feedback.content}</div>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                        <div className="font-semibold text-white">Accuracy</div>
                        <div className="mt-2 text-sm leading-7 text-slate-300">{results.feedback.accuracy}</div>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                        <div className="font-semibold text-white">Delivery</div>
                        <div className="mt-2 text-sm leading-7 text-slate-300">{results.feedback.delivery}</div>
                      </div>
                    </div>
                  </div>

                  <ResultsInsights results={results} />

                  {results.sample_response && (
                    <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4">
                      <h4 className="font-bold mb-2 text-white">Sample 2.0 response</h4>
                      <div className="text-sm whitespace-pre-line text-slate-200">{results.sample_response}</div>
                    </div>
                  )}

                  <div className="flex flex-col gap-3 sm:flex-row">
                    <button onClick={downloadDocument} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-sky-500 py-3 font-semibold text-white transition hover:bg-sky-400"><Download size={16} /> Download report</button>
                    <button onClick={reset} className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-6 py-3 font-semibold text-white transition hover:bg-white/[0.08]"><RotateCcw size={16} /> New analysis</button>
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

