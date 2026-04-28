// Complete App.js - Full Application with All Components and Mobile Hamburger Menu
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Analytics } from "@vercel/analytics/react"
import { Upload, Play, Pause, Download, CheckCircle, AlertCircle, Loader, FileAudio } from 'lucide-react';
import { AdminLoginModal, ToastViewport } from './components/AppOverlays';
import { AppHeader, AppStatusStack, Footer } from './components/AppChrome';
import { API_BASE_URL, downloadDocumentFromBase64, readGuestModePreference, writeGuestModePreference } from './appShared';
import AdminPanel from './pages/AdminPanel';
import AuthPage from './pages/AuthPage';
import CommunityPage from './pages/CommunityPage';
import HomePage from './pages/HomePage';
import ProfilePage from './pages/ProfilePage';
import SampleLibrary from './pages/SampleLibrary';
import SimulationMode from './pages/SimulationMode';

export default function SpeakUpApp() {
  const [currentPage, setCurrentPage] = useState('home');
  const [step, setStep] = useState('input');
  const [topic, setTopic] = useState('');
  const [audioFile, setAudioFile] = useState(null);
  const [audioURL, setAudioURL] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
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
  const [toasts, setToasts] = useState([]);
  const [adminLoginOpen, setAdminLoginOpen] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [adminLoginError, setAdminLoginError] = useState('');
  const [adminLoginSubmitting, setAdminLoginSubmitting] = useState(false);

  const audioRef = useRef(null);

  const dismissToast = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const pushToast = useCallback((message, tone = 'info') => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setToasts((current) => [...current, { id, message, tone }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, tone === 'error' ? 6000 : 4000);
  }, []);

  const loadCommunityProfiles = useCallback(async () => {
    setCommunityLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/community`, {
        credentials: 'include',
      });
      const data = await response.json();
      if (response.ok && Array.isArray(data.profiles)) {
        setPublicProfiles(data.profiles);
      }
    } catch {
      setPublicProfiles([]);
    } finally {
      setCommunityLoading(false);
    }
  }, []);

  const loadPracticeHistory = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/practice-history`, {
        credentials: 'include',
      });
      const data = await response.json();
      if (response.ok && Array.isArray(data.sessions)) {
        setPracticeHistory(data.sessions);
      }
    } catch {
      setPracticeHistory([]);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (audioURL) URL.revokeObjectURL(audioURL);
    };
  }, [audioURL]);

  useEffect(() => {
    const warmBackend = async () => {
      try {
        await fetch(`${API_BASE_URL}/api/health`, { method: 'GET' });
      } catch {
        // Best-effort warmup only.
      } finally {
        setIsWarmingBackend(false);
      }
    };
    warmBackend();
  }, []);

  useEffect(() => {
    writeGuestModePreference(guestMode);
  }, [guestMode]);

  useEffect(() => {
    if (!guestMode || currentUser) {
      setGuestModeBannerVisible(true);
    }
  }, [guestMode, currentUser]);

  useEffect(() => {
    const loadCurrentUser = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
          credentials: 'include',
        });
        const data = await response.json();
        if (response.ok && data.authenticated && data.user) {
          setCurrentUser(data.user);
          setSelectedProfileId(data.user.id);
          setGuestMode(false);
          await loadPracticeHistory();
        }
      } catch {
        // Keep the app usable even if auth restoration fails.
      } finally {
        setAuthChecking(false);
      }
    };
    loadCurrentUser();
  }, [loadPracticeHistory]);

  useEffect(() => {
    if (currentPage === 'community' && !communityLoading && publicProfiles.length === 0) {
      loadCommunityProfiles();
    }
  }, [communityLoading, currentPage, loadCommunityProfiles, publicProfiles.length]);

  useEffect(() => {
    if (currentUser && currentPage === 'profile' && practiceHistory.length === 0) {
      loadPracticeHistory();
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
    if (!topic.trim()) { setError('Please enter a topic'); return; }
    if (!audioFile) { setError('Please upload audio'); return; }

    setStep('uploading');
    setError(null);

    const formData = new FormData();
    formData.append('audio', audioFile);
    formData.append('topic', topic);

    try {
      const response = await fetch(`${API_BASE_URL}/api/analyze`, { method: 'POST', body: formData, credentials: 'include' });
      const data = await response.json();
      if (data.success) {
        setResults(data);
        if (data.user) {
          setCurrentUser(data.user);
          setSelectedProfileId(data.user.id);
          loadPracticeHistory();
          loadCommunityProfiles();
        }
        setStep('results');
      }
      else { setError(data.error || 'Analysis failed'); setStep('preview'); }
    } catch {
      setError('Connection failed. Make sure the backend is running.');
      setStep('preview');
    }
  }, [topic, audioFile, loadCommunityProfiles, loadPracticeHistory]);

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
  }, [audioURL]);

  const openAdminPanel = useCallback(async () => {
    setAdminPassword('');
    setAdminLoginError('');
    setAdminLoginOpen(true);
  }, []);

  const submitAdminLogin = useCallback(async () => {
    if (!adminPassword.trim()) {
      setAdminLoginError('Enter the admin password to continue.');
      return;
    }

    setAdminLoginSubmitting(true);
    setAdminLoginError('');
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ password: adminPassword })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setIsAuthenticated(true);
        setShowAdminPanel(true);
        setAdminLoginOpen(false);
        setAdminPassword('');
      } else {
        setAdminLoginError(data.error || 'Incorrect password.');
      }
    } catch {
      setAdminLoginError('Could not reach the admin login endpoint. Make sure the backend is running.');
    } finally {
      setAdminLoginSubmitting(false);
    }
  }, [adminPassword]);

  const getScoreColor = useCallback((score, max) => {
    const percentage = (score / max) * 100;
    if (percentage >= 80) return 'text-green-400';
    if (percentage >= 60) return 'text-yellow-400';
    return 'text-red-400';
  }, []);

  const navTo = useCallback((page) => {
    setCurrentPage(page);
    setMobileMenuOpen(false);
    if (page === 'analyze') reset();
  }, [reset]);

  const openAuth = useCallback((mode = 'login') => {
    setAuthError('');
    setAuthMode(mode);
    setCurrentPage('auth');
    setMobileMenuOpen(false);
  }, []);

  const continueAsGuest = useCallback(() => {
    setAuthError('');
    setGuestMode(true);
    setGuestModeBannerVisible(true);
    setCurrentPage('analyze');
    setMobileMenuOpen(false);
  }, []);

  const handleAuthSubmit = useCallback(async ({ mode, email, password, profile }) => {
    setAuthSubmitting(true);
    setAuthError('');

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password, profile }),
      });
      const data = await response.json();

      if (!response.ok || !data.user) {
        setAuthError(data.error || 'Authentication failed.');
        return false;
      }

      setCurrentUser(data.user);
      setGuestMode(false);
      setSelectedProfileId(data.user.id);
      await loadPracticeHistory();
      await loadCommunityProfiles();
      setCurrentPage('profile');
      return true;
    } catch {
      setAuthError('Could not reach the account endpoint. Make sure the backend is running.');
      return false;
    } finally {
      setAuthSubmitting(false);
    }
  }, [loadCommunityProfiles, loadPracticeHistory]);

  const handleProfileSave = useCallback(async (updates) => {
    setAuthError('');
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(updates),
      });
      const data = await response.json();

      if (!response.ok || !data.user) {
        setAuthError(data.error || 'Could not save profile changes.');
        return false;
      }

      setCurrentUser(data.user);
      setSelectedProfileId(data.user.id);
      await loadCommunityProfiles();
      return true;
    } catch {
      setAuthError('Could not save profile changes.');
      return false;
    }
  }, [loadCommunityProfiles]);

  const handlePasswordUpdate = useCallback(async ({ currentPassword, newPassword }) => {
    setPasswordSubmitting(true);
    setAuthError('');
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await response.json();
      if (!response.ok) {
        setAuthError(data.error || 'Could not update password.');
        return false;
      }
      return true;
    } catch {
      setAuthError('Could not update password.');
      return false;
    } finally {
      setPasswordSubmitting(false);
    }
  }, []);

  const handleProfileSelect = useCallback((profileId) => {
    setSelectedProfileId(profileId);
    setCurrentPage('community');
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
      await fetch(`${API_BASE_URL}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch {
      // Clear local UI state even if the request fails.
    }
    setCurrentUser(null);
    setGuestMode(false);
    setAuthError('');
    setPracticeHistory([]);
    setSelectedProfileId(null);
    setCurrentPage('home');
    setMobileMenuOpen(false);
    loadCommunityProfiles();
  }, [loadCommunityProfiles]);

  const handleDeleteAccount = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/account`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await response.json();
      if (!response.ok) {
        setAuthError(data.error || 'Could not delete this account.');
        return false;
      }
    } catch {
      setAuthError('Could not delete this account.');
      return false;
    }

    setCurrentUser(null);
    setGuestMode(false);
    setPracticeHistory([]);
    setSelectedProfileId(null);
    setCurrentPage('home');
    setMobileMenuOpen(false);
    loadCommunityProfiles();
    return true;
  }, [loadCommunityProfiles]);

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
        openAuth={openAuth}
        openAdminPanel={openAdminPanel}
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
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
                      <div className="mt-2 text-sm leading-7 text-slate-300">Choose one recording file. You’ll be able to preview it before analysis.</div>
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
                      <button onClick={analyzeAudio} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-sky-500 px-6 py-3 font-semibold text-white transition hover:bg-sky-400">
                        <CheckCircle size={16} /> Analyze Speech
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
                  <div className="mt-2 text-sm text-slate-400">This can take a little longer while backend services are busy.</div>
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
          <SimulationMode onAnalysisUserUpdate={handleAnalysisUserUpdate} notify={pushToast} />
        ) : (
          <HomePage navTo={navTo} openAuth={openAuth} continueAsGuest={continueAsGuest} currentUser={currentUser} />
        )}
      </div>

      <Footer setCurrentPage={navTo} />
      <Analytics />

      {showAdminPanel && isAuthenticated && <AdminPanel onClose={() => setShowAdminPanel(false)} notify={pushToast} />}
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


