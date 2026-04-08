// Complete App.js - Full Application with All Components and Mobile Hamburger Menu
import React, { useState, useRef, useEffect, useCallback, useMemo, memo } from 'react';
import { Analytics } from "@vercel/analytics/react"
import { Upload, Play, Pause, Download, CheckCircle, AlertCircle, Loader, FileAudio, Settings, Lock, Trash2, Edit3, Mic, Circle, Menu, X, Home, ArrowRight, Users, Image, BarChart3, Sparkles, BookOpen, HelpCircle, Star, ChevronRight, ChevronLeft } from 'lucide-react';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:5000';
const createPlaceholderImage = (title, subtitle, accent = '#0ea5e9') => {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800">
      <defs>
        <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stop-color="#081120" />
          <stop offset="100%" stop-color="${accent}" />
        </linearGradient>
      </defs>
      <rect width="1200" height="800" rx="48" fill="url(#bg)" />
      <circle cx="960" cy="170" r="92" fill="rgba(255,255,255,0.14)" />
      <circle cx="245" cy="615" r="140" fill="rgba(255,255,255,0.10)" />
      <rect x="108" y="132" width="984" height="536" rx="40" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.16)" />
      <text x="600" y="350" fill="#ffffff" font-size="72" font-weight="700" font-family="Arial, sans-serif" text-anchor="middle">${title}</text>
      <text x="600" y="430" fill="#dbeafe" font-size="30" font-family="Arial, sans-serif" text-anchor="middle">${subtitle}</text>
    </svg>
  `;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
};

const HOME_HERO_IMAGE = '/hero.png';
const FOUNDER_IMAGE = '/founder.jpg';
const FEEDBACK_AVATAR = createPlaceholderImage('Student Photo', 'Swap in real community images', '#7c3aed');

const HOME_STATS = [
  { value: '1,100+', label: 'active users in peak period', note: 'Data received from Google Analytics since 11/2025', icon: BarChart3 },
  { value: '> 50%', label: 'users won the National English Competition', note: 'Data gathered from NEC 25-26', icon: Users },
  { value: '3 core tools', label: 'in one focused workflow', note: 'Analyze, Samples, and Simulation.', icon: Sparkles },
];

const HOME_FEATURES = [
  {
    title: 'Analyze',
    description: 'Insert a topic question of your choice, submit your response, and watch NECSpeaking do its magic!',
    icon: Mic,
  },
  {
    title: 'Samples',
    description: 'Browse strong sample responses to see what a high-performing NEC speaking answer actually sounds and reads like.',
    icon: BookOpen,
  },
  {
    title: 'Simulation',
    description: 'Experience the real test interface and protocols, build your confidence and familiarity with the test environment.',
    icon: CheckCircle,
  },
];

const HOME_FEEDBACK = [
  { name: 'Hà Văn Gia Cát', role: '🥇 FIRST prize - NEC 25-26', quote: '"Amazing app, intuitive design, 10/10 💗"', image: '/gcat.jpg', },
  { name: 'Annie Le Hamel', role: '🥉 THIRD prize - NEC 25-26', quote: 'Great app! It really helps boost pronunciation and speaking confidence with quick, useful feedback and tailored examples.', image: '/annie.jpg', },
  { name: 'Đoàn Trần Anh Huy', role: '🥉 THIRD prize - NEC 25-26', quote: 'After 2 weeks of intensively honing my speaking skills on NECS, I attained the second highest speaking score nationwide!', image: '/ahuy.jpg', },
  { name: 'Nguyễn Minh Tiến', role: '🥈 SECOND prize - NEC 24-25 & 25-26', quote: 'Students liked having one place to practice, compare examples, and build confidence before the real assessment.' },
  { name: 'Đinh Thị Lam Trà', role: 'Teacher | Le Quy Don HSGS - Nam Nha Trang', quote: 'The interface felt clear and fast, so I could focus on speaking instead of figuring out what to click next.' },
  { name: 'Trần Khánh Minh', role: 'Khanh Hoa NEC Team 25-26', quote: 'The report format made it easier to review patterns across multiple practice sessions.' },
];

const HOME_BENEFITS = [
  'Have your speech graded automatically according to MOET-approved criteria in a matter of minutes.',
  'Level up your speaking style by learning from sample speeches of ex-competitors who scored high in their tests.',
  'Familiarize yourself with the real NEC speaking test interface and protocols, making sure you are not caught off-guard. ',
  'Reduced cost compared to hiring NEC mentors, as NECSpeaking is completely non-profit.'
];

const HOME_FAQ = [
  { question: 'Who is necs. for?', answer: 'necs. is specifically made for NEC competitors, or those aiming for this competition to improve their speaking.' },
  { question: 'What is the best way to self-study with necs.?', answer: 'Use the Analyze tab to save time. When the results are out, see the criterion scores to identify your weak spots and train yourself from there. Remember to track your progress as well.' },
  { question: 'Can teachers add their own materials?', answer: 'Not yet. But you can contribute sample speeches and questions to me via email so I can add them into the web.' },
];

// HELPER FUNCTION - Download document from base64
const downloadDocumentFromBase64 = (base64String, filename) => {
  try {
    const binaryString = window.atob(base64String);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const blob = new Blob([bytes], {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || `necs_feedback_${Date.now()}.docx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 100);
    return true;
  } catch (error) {
    console.error('Download failed:', error);
    alert('Failed to download: ' + error.message);
    return false;
  }
};

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

  const audioRef = useRef(null);

  useEffect(() => {
    return () => {
      if (audioURL) URL.revokeObjectURL(audioURL);
    };
  }, [audioURL]);

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
      const response = await fetch(`${API_BASE_URL}/api/analyze`, { method: 'POST', body: formData });
      const data = await response.json();
      if (data.success) { setResults(data); setStep('results'); }
      else { setError(data.error || 'Analysis failed'); setStep('preview'); }
    } catch {
      setError('Connection failed. Make sure the backend is running.');
      setStep('preview');
    }
  }, [topic, audioFile]);

  const downloadDocument = useCallback(() => {
    if (!results) { alert('No results available'); return; }
    if (results.document_base64) {
      downloadDocumentFromBase64(results.document_base64, results.document_filename);
    } else if (results.document_url) {
      window.open(`${API_BASE_URL}${results.document_url}`, '_blank');
    } else {
      alert('Document download not available');
    }
  }, [results]);

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
    const password = prompt('Enter admin password:');
    if (!password) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ password })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setIsAuthenticated(true);
        setShowAdminPanel(true);
      } else {
        alert(data.error || 'Incorrect password!');
      }
    } catch {
      alert('Could not reach the admin login endpoint. Make sure the backend is running.');
    }
  }, []);

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

  return (
    <div style={{ fontFamily: 'Space Grotesk, ui-sans-serif, system-ui' }} className="min-h-screen text-slate-100">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#06101d]/85 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 select-none">
              <button onClick={() => navTo('home')} className="text-3xl font-extrabold tracking-tight text-white cursor-pointer">
                necs.
              </button>
            </div>

            <div className="flex items-center gap-4 flex-wrap max-w-full overflow-hidden">
              {/* Desktop Navigation */}
              <nav className="hidden md:flex gap-2">
                <button onClick={() => navTo('home')} className={`px-4 py-2 rounded-full font-medium transition inline-flex items-center gap-2 ${currentPage === 'home' ? 'bg-sky-500 text-white shadow-[0_0_30px_rgba(56,189,248,0.25)]' : 'text-slate-300 hover:bg-white/10'}`}><Home size={16} /> Home</button>
                <button onClick={() => navTo('analyze')} className={`px-4 py-2 rounded-full font-medium transition ${currentPage === 'analyze' ? 'bg-sky-500 text-white shadow-[0_0_30px_rgba(56,189,248,0.25)]' : 'text-slate-300 hover:bg-white/10'}`}>Analyze</button>
                <button onClick={() => navTo('samples')} className={`px-4 py-2 rounded-full font-medium transition ${currentPage === 'samples' ? 'bg-sky-500 text-white shadow-[0_0_30px_rgba(56,189,248,0.25)]' : 'text-slate-300 hover:bg-white/10'}`}>Samples</button>
                <button onClick={() => navTo('simulation')} className={`px-4 py-2 rounded-full font-medium transition ${currentPage === 'simulation' ? 'bg-sky-500 text-white shadow-[0_0_30px_rgba(56,189,248,0.25)]' : 'text-slate-300 hover:bg-white/10'}`}>Simulation</button>
                <button onClick={openAdminPanel} className="p-2.5 rounded-full text-slate-300 transition hover:bg-white/10 hover:text-white" title="Admin Panel">
                  <Settings size={18} />
                </button>
              </nav>

              {/* Mobile Hamburger Menu */}
              <div className="md:hidden flex items-center gap-2">
                <button onClick={openAdminPanel} className="p-2.5 rounded-full text-slate-300 transition hover:bg-white/10 hover:text-white" title="Admin Panel">
                  <Settings size={18} />
                </button>
                <button onClick={() => setMobileMenuOpen(o => !o)} className="p-2.5 rounded-full text-slate-300 transition hover:bg-white/10 hover:text-white">
                  {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
                </button>
              </div>

              <img
                src="/logo.png"
                alt="School Logo"
                className="h-11 w-11 rounded-2xl object-cover shrink-0 ring-1 ring-white/10 shadow-lg"
                onError={(e) => {
                  e.target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="%234F46E5"/><text x="50" y="60" text-anchor="middle" fill="white" font-size="35" font-family="Arial" font-weight="bold">HS</text></svg>';
                }}
              />
            </div>
          </div>
        </div>
      </header>

      {/* Notification Banner */}
      <div className="w-full border-b border-sky-400/20 bg-sky-400/10 text-center py-2 px-4">
        <p className="text-sm font-medium text-sky-300 inline-flex items-center justify-center gap-2">
          <AlertCircle size={16} className="shrink-0" />
          <span>IMPORTANT NOTICE: necs. service is currently unavailable due to upgrades.</span>
          <AlertCircle size={16} className="shrink-0" />
        </p>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-white/10 bg-[#081120]/95 backdrop-blur-xl">
          <nav className="max-w-7xl mx-auto px-6 py-4 flex flex-col gap-2">
            <button onClick={() => navTo('home')} className={`px-4 py-3 rounded-2xl font-medium text-left transition inline-flex items-center gap-2 ${currentPage === 'home' ? 'bg-sky-500 text-white' : 'text-slate-300 hover:bg-white/10'}`}><Home size={16} /> Home</button>
            <button onClick={() => navTo('analyze')} className={`px-4 py-3 rounded-2xl font-medium text-left transition ${currentPage === 'analyze' ? 'bg-sky-500 text-white' : 'text-slate-300 hover:bg-white/10'}`}>Analyze</button>
            <button onClick={() => navTo('samples')} className={`px-4 py-3 rounded-2xl font-medium text-left transition ${currentPage === 'samples' ? 'bg-sky-500 text-white' : 'text-slate-300 hover:bg-white/10'}`}>Samples</button>
            <button onClick={() => navTo('simulation')} className={`px-4 py-3 rounded-2xl font-medium text-left transition ${currentPage === 'simulation' ? 'bg-sky-500 text-white' : 'text-slate-300 hover:bg-white/10'}`}>Simulation</button>
          </nav>
        </div>
      )}

      <div className="max-w-6xl mx-auto px-3 py-6 sm:px-6 sm:py-8">
        {currentPage === 'home' ? (
          <HomePage navTo={navTo} />
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
        ) : (
          <SimulationMode />
        )}
      </div>

      <Footer setCurrentPage={navTo} />
      <Analytics />

      {showAdminPanel && isAuthenticated && <AdminPanel onClose={() => setShowAdminPanel(false)} />}
    </div>
  );
}

const HomePage = memo(function HomePage({ navTo }) {
  const feedbacksPerPage = 3;
  const totalFeedbackPages = Math.ceil(HOME_FEEDBACK.length / feedbacksPerPage);
  const [feedbackPage, setFeedbackPage] = useState(0);
  const visibleFeedback = useMemo(() => {
    const start = feedbackPage * feedbacksPerPage;
    return HOME_FEEDBACK.slice(start, start + feedbacksPerPage);
  }, [feedbackPage]);

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-[36px] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.25),_transparent_30%),linear-gradient(135deg,_rgba(8,17,32,0.98),_rgba(5,10,18,0.95))] shadow-[0_24px_120px_rgba(2,6,23,0.45)]">
        <div className="grid gap-8 px-6 py-8 lg:grid-cols-[1.1fr_0.9fr] lg:px-10 lg:py-10">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-sky-400/30 bg-sky-400/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-sky-200">
              <Sparkles size={15} />
              BRAND NEW HOMEPAGE
            </div>
            <div className="space-y-4">
              <h1 className="text-5xl font-black tracking-tight text-white sm:text-6xl">
                Master NEC Speaking
              </h1>
              <p className="max-w-2xl text-base leading-8 text-slate-300">
                NECSpeaking (necs.) is an online learning platform that helps students to train English speaking ability, especially that of those aiming for the NEC. NECSpeaking offers a precise training experience, a simulation of the real test environment and an archive for creative, high-scoring sample speeches from ex-competitors. 
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <button onClick={() => navTo('analyze')} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-sky-500 px-8 py-3 font-semibold text-white transition hover:bg-sky-400">
                Get Started
                <ArrowRight size={17} />
              </button>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {HOME_STATS.map((stat) => {
                const Icon = stat.icon;
                return (
                  <div key={stat.label} className="rounded-2xl border border-white/10 bg-slate-950/55 p-4">
                    <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-400/15 text-sky-300">
                      <Icon size={20} />
                    </div>
                    <div className="text-2xl font-black text-white">{stat.value}</div>
                    <div className="mt-1 text-sm font-semibold text-slate-200">{stat.label}</div>
                    <div className="mt-2 text-xs leading-6 text-slate-400">{stat.note}</div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid gap-4">
            <div className="overflow-hidden rounded-[32px] border border-white/10 bg-white/[0.04]">
              <img
                src={HOME_HERO_IMAGE}
                alt="Placeholder for home hero visual"
                loading="eager"
                className="h-full min-h-[280px] w-full object-cover"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-400/15 text-emerald-300">
                  <CheckCircle size={18} />
                </div>
                <div className="mt-4 text-lg font-bold text-white">Built for focused practice</div>
                <div className="mt-2 text-sm leading-7 text-slate-300">With no advertisement, a streamlined, direct workflow, and a clean user interface, concentration is easier than ever.</div>
              </div>
              <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-400/15 text-amber-300">
                  <Star size={18} />
                </div>
                <div className="mt-4 text-lg font-bold text-white">Easy to use</div>
                <div className="mt-2 text-sm leading-7 text-slate-300">As instructions are present anywhere you go, with an additional user manual at the end of the page, even 5-year-old Little Tony can use NECSpeaking!</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-[32px] border border-white/10 bg-slate-950/65 p-6 shadow-[0_20px_80px_rgba(2,6,23,0.4)] sm:p-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-slate-300">
            <Image size={14} />
            About the Founder & developer
          </div>
          <div className="mt-5">
            <h2 className="text-3xl font-black text-white">Nguyễn Hoàng Minh Trí</h2>
            <div className="mt-5 grid gap-5 md:grid-cols-[240px_1fr] md:items-start">
              <img
                src={FOUNDER_IMAGE}
                alt="Placeholder founder portrait"
                loading="lazy"
                className="h-70 w-full rounded-[28px] object-cover ring-1 ring-white/10"
              />
              <div>
                <p className="text-sm leading-7 text-slate-300">
                  I am a Grade 12 English-major student at Le Quy Don HSGS - Nam Nha Trang with national-level
                  achievements in academic English and debate, currently transitioning into computer
                  science and AI. I am deeply interested in integrating technology into education.
                </p>
              </div>
            </div>
            <div className="mt-5 rounded-[24px] border border-white/10 bg-white/[0.04] p-5">
              <p className="text-sm leading-7 text-slate-400">
                Things I'm so proud of in my high school years:
              </p>
              <p className="mt-3 text-sm leading-7 text-slate-400">
                - 8.5 IELTS (9.0R - 9.0L - 7.5W - 7.5S) 
              </p>
              <p className="mt-3 text-sm leading-7 text-slate-400">
                - 1550 SAT (760 EBR&W - 790 MATH)
              </p>
              <p className="mt-3 text-sm leading-7 text-slate-400">
                - SILVER medal - Olympic 30/4 XXIX (24-25)
              </p>
              <p className="mt-3 text-sm leading-7 text-slate-400">
                - Proud member of Khanh Hoa NEC Team 24-25
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-[32px] border border-white/10 bg-slate-950/65 p-6 shadow-[0_20px_80px_rgba(2,6,23,0.4)] sm:p-8">
          <div className="flex items-center justify-between gap-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-slate-300">
              <Users size={14} />
              User feedback
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setFeedbackPage((page) => Math.max(page - 1, 0))}
                disabled={feedbackPage === 0}
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-slate-200 transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Show previous feedbacks"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                type="button"
                onClick={() => setFeedbackPage((page) => Math.min(page + 1, totalFeedbackPages - 1))}
                disabled={feedbackPage >= totalFeedbackPages - 1}
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-slate-200 transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Show next feedbacks"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
          <div className="mt-5 space-y-4">
            {visibleFeedback.map((item) => (
              <div key={`${item.name}-${item.role}`} className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
                <div className="flex items-start gap-4">
                  <img
                    src={item.image || FEEDBACK_AVATAR}
                    alt={`Photo of ${item.name}`}
                    loading="lazy"
                    className="h-28 w-28 rounded-2xl object-cover ring-1 ring-white/10"
                  />
                  <div className="min-w-0 flex-1">
                    <div>
                      <div className="font-semibold text-white">{item.name}</div>
                      <div className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-500">{item.role}</div>
                    </div>
                    <p className="mt-3 text-sm leading-7 text-slate-300">{item.quote}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-[32px] border border-white/10 bg-slate-950/65 p-6 shadow-[0_20px_80px_rgba(2,6,23,0.4)] sm:p-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-slate-300">
              <Sparkles size={14} />
              Core features
            </div>
            <h2 className="mt-4 text-3xl font-black text-white">Three ways to practice with necs.</h2>
          </div>
        </div>
        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          {HOME_FEATURES.map((feature) => {
            const Icon = feature.icon;
            return (
              <div key={feature.title} className="rounded-[28px] border border-white/10 bg-white/[0.04] p-6">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-400/15 text-sky-300">
                  <Icon size={22} />
                </div>
                <h3 className="mt-5 text-xl font-bold text-white">{feature.title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-300">{feature.description}</p>
                <button onClick={() => navTo(feature.title.toLowerCase())} className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-sky-300 transition hover:text-sky-200">
                  Open {feature.title}
                  <ChevronRight size={16} />
                </button>
              </div>
            );
          })}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-[32px] border border-white/10 bg-slate-950/65 p-6 shadow-[0_20px_80px_rgba(2,6,23,0.4)] sm:p-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-slate-300">
            <CheckCircle size={14} />
            Benefits of using necs.
          </div>
          <div className="mt-5 space-y-4">
            {HOME_BENEFITS.map((benefit) => (
              <div key={benefit} className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <CheckCircle size={18} className="mt-0.5 shrink-0 text-emerald-300" />
                <p className="text-sm leading-7 text-slate-300">{benefit}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[32px] border border-white/10 bg-slate-950/65 p-6 shadow-[0_20px_80px_rgba(2,6,23,0.4)] sm:p-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-slate-300">
            <HelpCircle size={14} />
            FAQ
          </div>
          <div className="mt-5 space-y-4">
            {HOME_FAQ.map((item) => (
              <div key={item.question} className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5">
                <div className="text-base font-semibold text-white">{item.question}</div>
                <p className="mt-2 text-sm leading-7 text-slate-300">{item.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
});

function SimulationMode() {
  const [simStep, setSimStep] = useState('intro');
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [questionBank, setQuestionBank] = useState([]);
  const [loadingQuestionBank, setLoadingQuestionBank] = useState(false);
  const [selectedQuestionId, setSelectedQuestionId] = useState('random');
  const [countdown, setCountdown] = useState(60);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedAudioURL, setRecordedAudioURL] = useState(null);
  const [recordedBlob, setRecordedBlob] = useState(null);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [micTested, setMicTested] = useState(false);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (recordedAudioURL) URL.revokeObjectURL(recordedAudioURL);
    };
  }, [recordedAudioURL]);

  const testMicrophone = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      setMicTested(true);
      alert('Microphone test successful! You can now proceed.');
    } catch {
      alert('Microphone access denied. Please enable microphone permissions.');
    }
  }, []);

  const startPreparationTimer = useCallback(() => {
    timerRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          startRecordingAuto();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const startReadingTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setSimStep('reading');
    setCountdown(60);
    timerRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          setSimStep('preparation');
          setCountdown(300);
          startPreparationTimer();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [startPreparationTimer]);

  const fetchQuestionBank = useCallback(async () => {
    setLoadingQuestionBank(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/questions`);
      const data = await response.json();
      setQuestionBank(data.questions || []);
    } catch {
      setQuestionBank([]);
    } finally {
      setLoadingQuestionBank(false);
    }
  }, []);

  useEffect(() => {
    fetchQuestionBank();
  }, [fetchQuestionBank]);

  const fetchAndSetQuestion = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/questions/random`);
      const data = await response.json();
      if (data.error) { setError('No questions available. Please add questions in admin panel.'); return false; }
      setCurrentQuestion(data.question);
      setError(null);
      startReadingTimer();
      return true;
    } catch {
      setError('Failed to load question. Check your connection.');
      return false;
    }
  }, [startReadingTimer]);

  const startSimulation = useCallback(async () => {
    if (!micTested) { alert('Please test your microphone first!'); return; }
    if (selectedQuestionId !== 'random') {
      const selectedQuestion = questionBank.find((question) => String(question.id) === selectedQuestionId);
      if (!selectedQuestion) {
        setError('Selected question could not be found. Please choose again.');
        return;
      }
      setCurrentQuestion(selectedQuestion);
      setError(null);
      startReadingTimer();
      return;
    }
    await fetchAndSetQuestion();
  }, [micTested, selectedQuestionId, questionBank, startReadingTimer, fetchAndSetQuestion]);

  const skipReading = useCallback(() => {
    clearInterval(timerRef.current);
    setSimStep('preparation');
    setCountdown(300);
    startPreparationTimer();
  }, [startPreparationTimer]);

  const startRecordingAuto = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setRecordedAudioURL(URL.createObjectURL(audioBlob));
        setRecordedBlob(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setSimStep('recording');
      setRecordingTime(0);

      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          const newTime = prev + 1;
          if (newTime >= 300) {
            clearInterval(timerRef.current);
            timerRef.current = null;
            stopRecording();
            return 300;
          }
          return newTime;
        });
      }, 1000);
    } catch {
      setError('Failed to start recording. Check microphone permissions.');
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    setSimStep('playback');
  }, []);

  const analyzeRecording = useCallback(async () => {
    if (!recordedBlob || !currentQuestion) return;
    setSimStep('analyzing');
    const formData = new FormData();
    formData.append('audio', recordedBlob, 'recording.webm');
    formData.append('topic', currentQuestion.question);
    try {
      const response = await fetch(`${API_BASE_URL}/api/analyze`, { method: 'POST', body: formData });
      const data = await response.json();
      if (data.success) { setResults(data); setSimStep('results'); }
      else { setError(data.error || 'Analysis failed'); setSimStep('playback'); }
    } catch {
      setError('Connection failed. Make sure the backend is running.');
      setSimStep('playback');
    }
  }, [recordedBlob, currentQuestion]);

  const resetSimulation = useCallback(() => {
    setSimStep('intro');
    setCurrentQuestion(null);
    setCountdown(60);
    setRecordingTime(0);
    setIsRecording(false);
    if (recordedAudioURL) URL.revokeObjectURL(recordedAudioURL);
    setRecordedAudioURL(null);
    setRecordedBlob(null);
    setResults(null);
    setError(null);
    if (timerRef.current) clearInterval(timerRef.current);
  }, [recordedAudioURL]);

  const downloadRecording = useCallback(() => {
    if (recordedBlob) {
      const url = URL.createObjectURL(recordedBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `simulation_${Date.now()}.webm`;
      a.click();
      URL.revokeObjectURL(url);
    }
  }, [recordedBlob]);

  const downloadSimulationReport = useCallback(() => {
    if (!results) { alert('No results available'); return; }
    if (results.document_base64) {
      downloadDocumentFromBase64(results.document_base64, results.document_filename || 'simulation_feedback.docx');
    } else if (results.document_url) {
      window.open(`${API_BASE_URL}${results.document_url}`, '_blank');
    } else {
      alert('Document download not available');
    }
  }, [results]);

  const formatTime = useCallback((seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }, []);

  const getScoreColor = useCallback((score, max) => {
    const percentage = (score / max) * 100;
    if (percentage >= 80) return 'text-green-400';
    if (percentage >= 60) return 'text-yellow-400';
    return 'text-red-400';
  }, []);

  const randomizeQuestion = useCallback(async () => {
    await fetchAndSetQuestion();
  }, [fetchAndSetQuestion]);

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl sm:text-3xl font-bold mb-2 text-white">NEC Speaking Simulation</h2>
        <p className="text-sm text-slate-300">Experience the real test interface</p>
      </div>

      {error && (
        <div className="mb-6 rounded-2xl border border-red-400/25 bg-red-500/10 p-4 flex items-center gap-3 text-red-100">
          <AlertCircle size={18} />
          <span className="font-medium">{error}</span>
        </div>
      )}

      <div className="rounded-[28px] sm:rounded-[32px] border border-white/10 bg-slate-950/65 p-4 sm:p-8 shadow-[0_20px_80px_rgba(2,6,23,0.4)]">
        {simStep === 'intro' && (
          <div className="text-center space-y-6">            
            <h3 className="text-2xl font-bold text-white">🍀 Good luck! 🍀</h3>
            <div className="mx-auto grid max-w-3xl gap-3 text-left md:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-slate-300">Prepare pen and paper for drafting ideas.</div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-slate-300">You will have 60 seconds to read the question.</div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-slate-300">Then 5 minutes to prepare your response.</div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-slate-300">Recording lasts exactly 5 minutes.</div>
            </div>
            <div className="space-y-3 pt-4 max-w-2xl mx-auto w-full">
              <div className="w-full rounded-xl border border-gray-700 bg-gray-900 p-4 text-left">
                <h3 className="font-bold mb-3">Question Bank ({questionBank.length} questions)</h3>
                {loadingQuestionBank ? (
                  <div className="text-center py-8">
                    <Loader className="animate-spin mx-auto" size={28} />
                  </div>
                ) : (
                  <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                    <button
                      type="button"
                      onClick={() => setSelectedQuestionId('random')}
                      className={`w-full text-left p-3 bg-gray-900 border rounded transition ${selectedQuestionId === 'random' ? 'border-sky-500' : 'border-gray-700'}`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <div className="font-bold">Random question</div>
                          <div className="text-xs text-gray-400">Question Bank</div>
                        </div>
                      </div>
                      <div className="text-sm text-gray-300">System picks one random question from the bank when simulation starts.</div>
                    </button>

                    {questionBank.length === 0 ? (
                      <div className="text-center py-4 text-gray-400">No questions yet. Add your first question in admin panel.</div>
                    ) : (
                      questionBank.map((question) => (
                        <button
                          key={question.id}
                          type="button"
                          onClick={() => setSelectedQuestionId(String(question.id))}
                          className={`w-full text-left p-3 bg-gray-900 border rounded transition ${selectedQuestionId === String(question.id) ? 'border-sky-500' : 'border-gray-700'}`}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <div className="font-bold">{question.topic}</div>
                              <div className="text-xs text-gray-400">{question.category || 'General'}</div>
                            </div>
                          </div>
                          <div className="text-sm text-gray-300">{question.question}</div>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
              <button onClick={testMicrophone} className={`w-full py-3 rounded-2xl font-semibold transition ${micTested ? 'bg-emerald-500 text-white' : 'bg-white/[0.06] text-white hover:bg-white/[0.1]'}`}>
                <div className="flex items-center justify-center gap-2">
                  <Mic size={18} />
                  {micTested ? 'Microphone Ready' : 'Test Microphone'}
                </div>
              </button>
              <button onClick={startSimulation} disabled={!micTested} className={`w-full py-3 rounded-2xl font-semibold transition ${micTested ? 'bg-sky-500 text-white hover:bg-sky-400' : 'bg-slate-700 text-slate-400 cursor-not-allowed'}`}>
                Start Simulation
              </button>
            </div>
          </div>
        )}

        {simStep === 'reading' && currentQuestion && (
          <div className="space-y-6">
            <div className="text-center">
              <div className="text-5xl font-extrabold text-sky-300 mb-2">{formatTime(countdown)}</div>
              <div className="text-sm text-slate-400">Time to read the question</div>
            </div>
            <div className="rounded-[28px] border border-white/10 bg-[#07111f] p-6">
              <div className="text-xs font-bold uppercase tracking-[0.22em] text-slate-400 mb-2">Question {currentQuestion.id}</div>
              <div className="text-sm font-semibold text-slate-300 mb-3">{currentQuestion.topic}</div>
              <div className="text-lg text-white">{currentQuestion.question}</div>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <button onClick={skipReading} className="flex-1 py-3 rounded-2xl bg-sky-500 text-white font-semibold transition hover:bg-sky-400">Finish Reading Question</button>
              <button onClick={randomizeQuestion} className="px-4 py-3 rounded-2xl border border-white/10 bg-white/[0.04] text-white font-semibold transition hover:bg-white/[0.08]">Randomize Again</button>
            </div>
          </div>
        )}

        {simStep === 'preparation' && (
          <div className="space-y-6 text-center">
            <div className="mx-auto inline-flex h-20 w-20 items-center justify-center rounded-full bg-sky-400/12 text-sky-300">
              <CheckCircle size={34} />
            </div>
            <h3 className="text-2xl font-bold text-white">Preparation Time</h3>
            <div className="text-5xl font-extrabold text-sky-300">{formatTime(countdown)}</div>
            <div className="text-sm text-slate-400">{currentQuestion.question}</div>
            <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden">
              <div className="bg-sky-400 h-3 rounded-full transition-all" style={{ width: `${((300 - countdown) / 300) * 100}%` }} />
            </div>
            <button onClick={() => { clearInterval(timerRef.current); startRecordingAuto(); }} className="px-6 py-3 rounded-2xl bg-sky-500 text-white font-semibold transition hover:bg-sky-400">
              Skip Preparation & Start Recording
            </button>
          </div>
        )}

        {simStep === 'recording' && (
          <div className="space-y-6 text-center">
            <div className="flex items-center justify-center">
              <div className="inline-flex h-24 w-24 items-center justify-center rounded-full border border-red-400/20 bg-red-500/10">
                <Circle className="text-red-500 animate-pulse" size={48} fill="currentColor" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-red-500">Recording...</h3>
            <div className="text-5xl font-extrabold text-white">{formatTime(recordingTime)}</div>
            <div className="text-sm text-slate-400">{currentQuestion.question}</div>
            <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden">
              <div className="bg-red-500 h-3 rounded-full transition-all" style={{ width: `${(recordingTime / 300) * 100}%` }} />
            </div>
            <button onClick={stopRecording} className="px-6 py-3 rounded-2xl bg-red-600 text-white font-semibold transition hover:bg-red-500">Stop Recording Early</button>
          </div>
        )}

        {simStep === 'playback' && (
          <div className="space-y-6 text-center">
            <div className="mx-auto inline-flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/12 text-emerald-300">
              <CheckCircle size={34} />
            </div>
            <h3 className="text-2xl font-bold text-white">Recording Complete!</h3>
            <div className="text-slate-300">Duration: {formatTime(recordingTime)}</div>
            <AudioPlayback audioUrl={recordedAudioURL} />
            <div className="flex flex-col gap-3 sm:flex-row">
              <button onClick={analyzeRecording} className="flex-1 py-3 rounded-2xl bg-sky-500 text-white font-semibold transition hover:bg-sky-400">Analyze My Speech</button>
              <button onClick={downloadRecording} className="px-6 py-3 rounded-2xl border border-white/10 bg-white/[0.04] text-white font-semibold transition hover:bg-white/[0.08]"><Download size={18} /></button>
            </div>
            <button onClick={resetSimulation} className="w-full py-3 rounded-2xl border border-white/10 bg-white/[0.04] text-white transition hover:bg-white/[0.08]">Start New Simulation</button>
          </div>
        )}

        {simStep === 'analyzing' && (
          <div className="text-center py-12">
            <div className="mx-auto mb-5 inline-flex h-20 w-20 items-center justify-center rounded-full border border-sky-400/25 bg-sky-400/10 text-sky-300">
              <Loader className="animate-spin" size={40} />
            </div>
            <div className="font-semibold text-white">Analyzing your speech...</div>
          </div>
        )}

        {simStep === 'results' && results && (
          <div className="space-y-6">
            <h3 className="text-2xl font-bold text-center text-white">Your Results</h3>
            <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
              <div className="text-center rounded-[28px] border border-sky-400/20 bg-sky-400/10 p-6">
                <div className="text-5xl font-extrabold text-white">{results.scores.total.toFixed(2)}</div>
                <div className="mt-2 text-sm text-slate-300">out of 2.0</div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {[
                  { label: 'Content', score: results.scores.content, max: 0.9 },
                  { label: 'Accuracy', score: results.scores.accuracy, max: 0.6 },
                  { label: 'Delivery', score: results.scores.delivery, max: 0.5 }
                ].map((item, idx) => (
                  <div key={idx} className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4 text-center">
                    <div className="text-xs font-bold uppercase tracking-[0.22em] text-slate-400">{item.label}</div>
                    <div className={`mt-3 text-2xl font-black ${getScoreColor(item.score, item.max)}`}>{item.score.toFixed(2)}</div>
                    <div className="mt-1 text-xs text-slate-500">/ {item.max.toFixed(1)}</div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-lg font-bold mb-2 text-white">Detailed Feedback</h3>
              <div className="space-y-3">
                <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4"><div className="font-semibold text-white">Content</div><div className="mt-2 text-sm leading-7 text-slate-300">{results.feedback.content}</div></div>
                <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4"><div className="font-semibold text-white">Accuracy</div><div className="mt-2 text-sm leading-7 text-slate-300">{results.feedback.accuracy}</div></div>
                <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4"><div className="font-semibold text-white">Delivery</div><div className="mt-2 text-sm leading-7 text-slate-300">{results.feedback.delivery}</div></div>
              </div>
            </div>
            {results.sample_response && (
              <div className="rounded-[24px] border border-amber-400/20 bg-amber-400/8 p-4">
                <h4 className="font-bold mb-2 text-white">Sample 2.0 Response</h4>
                <div className="text-sm text-slate-200 whitespace-pre-line">{results.sample_response}</div>
              </div>
            )}
            <div className="flex flex-col gap-3 sm:flex-row">
              <button onClick={downloadSimulationReport} className="flex-1 py-3 rounded-2xl bg-sky-500 text-white font-semibold transition hover:bg-sky-400">
                <div className="flex items-center justify-center gap-2"><Download size={16} />Download Report</div>
              </button>
              <button onClick={downloadRecording} className="px-6 py-3 rounded-2xl border border-white/10 bg-white/[0.04] text-white font-semibold transition hover:bg-white/[0.08]"><Download size={18} /></button>
            </div>
            <button onClick={resetSimulation} className="w-full py-3 rounded-2xl border border-white/10 bg-white/[0.04] text-white transition hover:bg-white/[0.08]">Start New Simulation</button>
          </div>
        )}
      </div>
    </div>
  );
}

const AudioPlayback = memo(function AudioPlayback({ audioUrl }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef(null);

  useEffect(() => {
    setIsPlaying(false);
    setProgress(0);
    setCurrentTime(0);
    setDuration(0);
  }, [audioUrl]);

  const togglePlay = useCallback(async () => {
    if (!audioRef.current) return;
    try {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        await audioRef.current.play();
        setIsPlaying(true);
      }
    } catch {
      setIsPlaying(false);
    }
  }, [isPlaying]);

  const handleTimeUpdate = useCallback(() => {
    const audio = audioRef.current;
    if (audio && audio.duration) {
      setCurrentTime(audio.currentTime);
      setProgress((audio.currentTime / audio.duration) * 100);
    }
  }, []);

  const handleLoadedMetadata = useCallback(() => {
    const audio = audioRef.current;
    if (audio) setDuration(audio.duration || 0);
  }, []);

  const handleSeek = useCallback((e) => {
    const audio = audioRef.current;
    if (audio && audio.duration) {
      audio.currentTime = (Number(e.target.value) / 100) * audio.duration;
    }
  }, []);

  const formatTime = useCallback((time) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }, []);

  return (
    <div className="p-4 bg-gray-900 rounded-xl border border-gray-700">
      <audio
        ref={audioRef}
        src={audioUrl}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onPause={() => setIsPlaying(false)}
        onEnded={() => setIsPlaying(false)}
      />
      <div className="flex items-center gap-4 flex-wrap max-w-full overflow-hidden">
        <button onClick={togglePlay} className="flex items-center justify-center w-12 h-12 rounded-full bg-[#1e90ff] text-white hover:bg-[#1a7be6] transition">
          {isPlaying ? <Pause size={20} /> : <Play size={20} />}
        </button>
        <div className="flex-1">
          <input type="range" value={progress} onChange={handleSeek} className="w-full accent-[#1e90ff]" />
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
      </div>
    </div>
  );
});

const PlaybackBar = memo(function PlaybackBar({ audioUrl, onClose, autoPlay = false }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef(null);

  useEffect(() => {
    const audio = audioRef.current;
    setIsPlaying(false);
    setProgress(0);
    setCurrentTime(0);
    setDuration(0);

    if (!audio || !audioUrl || !autoPlay) return;

    const playAudio = async () => {
      try {
        await audio.play();
        setIsPlaying(true);
      } catch {
        setIsPlaying(false);
      }
    };

    playAudio();
  }, [audioUrl, autoPlay]);

  const togglePlay = useCallback(async () => {
    if (!audioRef.current) return;
    try {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        await audioRef.current.play();
        setIsPlaying(true);
      }
    } catch {
      setIsPlaying(false);
    }
  }, [isPlaying]);

  const handleTimeUpdate = useCallback(() => {
    const audio = audioRef.current;
    if (audio && audio.duration) {
      setCurrentTime(audio.currentTime);
      setProgress((audio.currentTime / audio.duration) * 100);
    }
  }, []);

  const handleLoadedMetadata = useCallback(() => {
    const audio = audioRef.current;
    if (audio) setDuration(audio.duration || 0);
  }, []);

  const handleSeek = useCallback((e) => {
    const audio = audioRef.current;
    if (audio && audio.duration) {
      audio.currentTime = (Number(e.target.value) / 100) * audio.duration;
    }
  }, []);

  const formatTime = useCallback((time) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }, []);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#000] border-t border-[#222] p-3 flex items-center justify-between gap-4">
      <audio
        ref={audioRef}
        src={audioUrl}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onPause={() => setIsPlaying(false)}
        onEnded={() => setIsPlaying(false)}
      />
      <button onClick={togglePlay} className="flex items-center justify-center w-10 h-10 rounded-full bg-[#1e90ff] text-white hover:bg-[#1a7be6] transition">
        {isPlaying ? <Pause size={20} /> : <Play size={20} />}
      </button>
      <div className="flex-1 flex flex-col items-center text-sm text-[#d1d1d1]">
        <input type="range" value={progress} onChange={handleSeek} className="w-full accent-[#1e90ff]" />
        <div className="flex justify-between w-full text-xs text-[#888] mt-1">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>
      <button onClick={onClose} className="text-[#888] hover:text-[#d1d1d1]">Close</button>
    </div>
  );
});

function AdminPanel({ onClose }) {
  const [activeTab, setActiveTab] = useState('upload');
  const [audioFile, setAudioFile] = useState(null);
  const [topic, setTopic] = useState('');
  const [question, setQuestion] = useState('');
  const [speaker, setSpeaker] = useState('');
  const [score, setScore] = useState('2.0');
  const [transcript, setTranscript] = useState('');
  const [feedback, setFeedback] = useState('');
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [samples, setSamples] = useState([]);
  const [loadingSamples, setLoadingSamples] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});

  const [questions, setQuestions] = useState([]);
  const [loadingQuestions, setLoadingQuestions] = useState(true);
  const [newQuestionTopic, setNewQuestionTopic] = useState('');
  const [newQuestionText, setNewQuestionText] = useState('');
  const [newQuestionCategory, setNewQuestionCategory] = useState('General');
  const [editingQuestionId, setEditingQuestionId] = useState(null);
  const [editQuestionData, setEditQuestionData] = useState({});

  useEffect(() => {
    if (activeTab === 'manage') fetchSamples();
    if (activeTab === 'questions') fetchQuestions();
  }, [activeTab]);

  const fetchSamples = useCallback(async () => {
    setLoadingSamples(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/samples`);
      const data = await res.json();
      setSamples(data.samples || []);
    } catch (e) { console.error(e); }
    finally { setLoadingSamples(false); }
  }, []);

  const fetchQuestions = useCallback(async () => {
    setLoadingQuestions(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/questions`);
      const data = await res.json();
      setQuestions(data.questions || []);
    } catch (e) { console.error(e); }
    finally { setLoadingQuestions(false); }
  }, []);

  const handleUpload = useCallback(async () => {
    if (!audioFile || !topic || !speaker || !transcript || !feedback) { setMessage('Please fill in all fields'); return; }
    setUploading(true); setMessage('');
    const formData = new FormData();
    formData.append('audio', audioFile); formData.append('topic', topic);
    formData.append('question', question); formData.append('speaker', speaker);
    formData.append('score', score); formData.append('transcript', transcript);
    formData.append('feedback', feedback);
    try {
      const response = await fetch(`${API_BASE_URL}/api/samples/upload`, { method: 'POST', credentials: 'include', body: formData });
      const data = await response.json();
      if (data.success) {
        setMessage('Sample uploaded successfully!');
        setAudioFile(null); setTopic(''); setQuestion(''); setSpeaker(''); setScore('2.0'); setTranscript(''); setFeedback('');
      } else setMessage('Error: ' + (data.error || 'Upload failed'));
    } catch { setMessage('Error: Connection failed'); }
    finally { setUploading(false); }
  }, [audioFile, topic, question, speaker, score, transcript, feedback]);

  const startEdit = useCallback((sample) => {
    setEditingId(sample.id);
    setEditData({ topic: sample.topic || '', question: sample.question || '', speaker: sample.speaker || '', score: String(sample.score || ''), transcript: sample.transcript || '', feedback: sample.feedback || '' });
  }, []);

  const cancelEdit = useCallback(() => { setEditingId(null); setEditData({}); }, []);

  const saveEdit = useCallback(async () => {
    try {
      const form = new FormData();
      Object.entries(editData).forEach(([k, v]) => form.append(k, v));
      const res = await fetch(`${API_BASE_URL}/api/samples/${editingId}`, { method: 'PUT', credentials: 'include', body: form });
      const data = await res.json();
      if (data.success) { setMessage('Updated successfully'); await fetchSamples(); cancelEdit(); }
      else setMessage('Error: ' + (data.error || 'Update failed'));
    } catch { setMessage('Error: Connection failed'); }
  }, [editData, editingId, fetchSamples, cancelEdit]);

  const deleteSample = useCallback(async (id) => {
    if (!window.confirm('Delete this sample?')) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/samples/${id}`, { method: 'DELETE', credentials: 'include' });
      const data = await res.json();
      if (data.success) { setMessage('Deleted successfully'); await fetchSamples(); }
      else setMessage('Error: ' + (data.error || 'Delete failed'));
    } catch { setMessage('Error: Connection failed'); }
  }, [fetchSamples]);

  const addQuestion = useCallback(async () => {
    if (!newQuestionTopic || !newQuestionText) { setMessage('Please fill in topic and question'); return; }
    try {
      const res = await fetch(`${API_BASE_URL}/api/questions`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ topic: newQuestionTopic, question: newQuestionText, category: newQuestionCategory }) });
      const data = await res.json();
      if (data.success) { setMessage('Question added successfully!'); setNewQuestionTopic(''); setNewQuestionText(''); setNewQuestionCategory('General'); await fetchQuestions(); }
      else setMessage('Error: ' + (data.error || 'Failed to add question'));
    } catch { setMessage('Error: Connection failed'); }
  }, [newQuestionTopic, newQuestionText, newQuestionCategory, fetchQuestions]);

  const startEditQuestion = useCallback((q) => {
    setEditingQuestionId(q.id);
    setEditQuestionData({ topic: q.topic || '', question: q.question || '', category: q.category || 'General' });
  }, []);

  const cancelEditQuestion = useCallback(() => { setEditingQuestionId(null); setEditQuestionData({}); }, []);

  const saveEditQuestion = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/questions/${editingQuestionId}`, { method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editQuestionData) });
      const data = await res.json();
      if (data.success) { setMessage('Question updated'); await fetchQuestions(); cancelEditQuestion(); }
      else setMessage('Error: ' + (data.error || 'Update failed'));
    } catch { setMessage('Error: Connection failed'); }
  }, [editingQuestionId, editQuestionData, fetchQuestions, cancelEditQuestion]);

  const deleteQuestion = useCallback(async (id) => {
    if (!window.confirm('Delete this question?')) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/questions/${id}`, { method: 'DELETE', credentials: 'include' });
      const data = await res.json();
      if (data.success) { setMessage('Question deleted'); await fetchQuestions(); }
      else setMessage('Error: ' + (data.error || 'Delete failed'));
    } catch { setMessage('Error: Connection failed'); }
  }, [fetchQuestions]);

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6 bg-gray-800 border border-gray-700">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-3"><Lock size={18} /><h2 className="text-2xl font-bold">Admin Panel</h2></div>
          <button onClick={onClose} className="text-xl font-bold">Close</button>
        </div>

        {message && <div className="mb-4 p-3 rounded-md bg-green-700/10 border border-green-700/20">{message}</div>}

        <div className="mb-4 flex gap-2 flex-wrap">
          <button onClick={() => setActiveTab('upload')} className={`px-3 py-2 rounded ${activeTab === 'upload' ? 'bg-[#1e90ff] text-white' : 'bg-gray-700'}`}>Upload Sample</button>
          <button onClick={() => setActiveTab('manage')} className={`px-3 py-2 rounded ${activeTab === 'manage' ? 'bg-[#1e90ff] text-white' : 'bg-gray-700'}`}>Manage Samples</button>
          <button onClick={() => setActiveTab('questions')} className={`px-3 py-2 rounded ${activeTab === 'questions' ? 'bg-[#1e90ff] text-white' : 'bg-gray-700'}`}>Question Bank</button>
        </div>

        {activeTab === 'upload' ? (
          <div className="space-y-4">
            <div><label className="block text-sm font-semibold mb-1">Audio File *</label><input type="file" accept="audio/*" onChange={(e) => setAudioFile(e.target.files[0])} className="w-full text-sm" /></div>
            <div><label className="block text-sm font-semibold mb-1">Topic *</label><input value={topic} onChange={(e) => setTopic(e.target.value)} className="w-full px-3 py-2 rounded bg-gray-900 border border-gray-700" /></div>
            <div><label className="block text-sm font-semibold mb-1">Speaking Question</label><textarea value={question} onChange={(e) => setQuestion(e.target.value)} rows="2" className="w-full px-3 py-2 rounded bg-gray-900 border border-gray-700"></textarea></div>
            <div><label className="block text-sm font-semibold mb-1">Speaker *</label><input value={speaker} onChange={(e) => setSpeaker(e.target.value)} className="w-full px-3 py-2 rounded bg-gray-900 border border-gray-700" /></div>
            <div><label className="block text-sm font-semibold mb-1">Score *</label><input value={score} onChange={(e) => setScore(e.target.value)} className="w-full px-3 py-2 rounded bg-gray-900 border border-gray-700" /></div>
            <div><label className="block text-sm font-semibold mb-1">Transcript *</label><textarea value={transcript} onChange={(e) => setTranscript(e.target.value)} rows="5" className="w-full px-3 py-2 rounded bg-gray-900 border border-gray-700"></textarea></div>
            <div><label className="block text-sm font-semibold mb-1">Why This Sample Scored High *</label><textarea value={feedback} onChange={(e) => setFeedback(e.target.value)} rows="4" className="w-full px-3 py-2 rounded bg-gray-900 border border-gray-700"></textarea></div>
            <button onClick={handleUpload} disabled={uploading} className="w-full py-3 rounded bg-[#1e90ff] text-white">{uploading ? 'Uploading...' : 'Upload Sample'}</button>
          </div>
        ) : activeTab === 'manage' ? (
          <div>
            {loadingSamples ? (
              <div className="text-center py-8"><Loader className="animate-spin mx-auto mb-2" size={36} /><div>Loading samples...</div></div>
            ) : (
              <div className="space-y-3">
                {samples.map(s => (
                  <div key={s.id} className="p-3 bg-gray-900 border border-gray-700 rounded flex flex-col gap-2">
                    <div className="flex justify-between items-start gap-3">
                      <div><div className="font-bold">{s.topic}</div><div className="text-xs text-gray-400">{s.speaker} | {s.score}/2.0</div></div>
                      <div className="flex gap-2">
                        <button onClick={() => startEdit(s)} className="px-2 py-1 rounded bg-blue-600 text-white"><Edit3 size={14} /></button>
                        <button onClick={() => deleteSample(s.id)} className="px-2 py-1 rounded bg-red-600 text-white"><Trash2 size={14} /></button>
                        <a href={s.audioUrl} target="_blank" rel="noreferrer" className="px-2 py-1 rounded bg-gray-700">Open</a>
                      </div>
                    </div>
                    {editingId === s.id && (
                      <div className="pt-2 space-y-2">
                        <input value={editData.topic} onChange={(e) => setEditData({ ...editData, topic: e.target.value })} placeholder="Topic" className="w-full px-2 py-1 rounded bg-gray-900 border border-gray-700" />
                        <input value={editData.speaker} onChange={(e) => setEditData({ ...editData, speaker: e.target.value })} placeholder="Speaker" className="w-full px-2 py-1 rounded bg-gray-900 border border-gray-700" />
                        <input value={editData.score} onChange={(e) => setEditData({ ...editData, score: e.target.value })} placeholder="Score" className="w-full px-2 py-1 rounded bg-gray-900 border border-gray-700" />
                        <textarea value={editData.question} onChange={(e) => setEditData({ ...editData, question: e.target.value })} rows="2" placeholder="Question" className="w-full px-2 py-1 rounded bg-gray-900 border border-gray-700"></textarea>
                        <textarea value={editData.transcript} onChange={(e) => setEditData({ ...editData, transcript: e.target.value })} rows="3" placeholder="Transcript" className="w-full px-2 py-1 rounded bg-gray-900 border border-gray-700"></textarea>
                        <textarea value={editData.feedback} onChange={(e) => setEditData({ ...editData, feedback: e.target.value })} rows="2" placeholder="Feedback" className="w-full px-2 py-1 rounded bg-gray-900 border border-gray-700"></textarea>
                        <div className="flex gap-2">
                          <button onClick={saveEdit} className="px-3 py-2 rounded bg-green-600">Save</button>
                          <button onClick={cancelEdit} className="px-3 py-2 rounded bg-gray-700">Cancel</button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            <div className="p-4 bg-gray-900 rounded-xl border border-gray-700">
              <h3 className="font-bold mb-3">Add New Question</h3>
              <div className="space-y-3">
                <input value={newQuestionTopic} onChange={(e) => setNewQuestionTopic(e.target.value)} placeholder="Source" className="w-full px-3 py-2 rounded bg-gray-800 border border-gray-700" />
                <textarea value={newQuestionText} onChange={(e) => setNewQuestionText(e.target.value)} placeholder="Question text..." rows="3" className="w-full px-3 py-2 rounded bg-gray-800 border border-gray-700"></textarea>
                <input value={newQuestionCategory} onChange={(e) => setNewQuestionCategory(e.target.value)} placeholder="Category (optional)" className="w-full px-3 py-2 rounded bg-gray-800 border border-gray-700" />
                <button onClick={addQuestion} className="w-full py-2 rounded bg-[#1e90ff] text-white font-semibold">Add Question</button>
              </div>
            </div>
            <div>
              <h3 className="font-bold mb-3">Question Bank ({questions.length} questions)</h3>
              {loadingQuestions ? (
                <div className="text-center py-8"><Loader className="animate-spin mx-auto" size={36} /></div>
              ) : questions.length === 0 ? (
                <div className="text-center py-8 text-gray-400">No questions yet. Add your first question above!</div>
              ) : (
                <div className="space-y-3">
                  {questions.map(q => (
                    <div key={q.id} className="p-3 bg-gray-900 border border-gray-700 rounded">
                      {editingQuestionId === q.id ? (
                        <div className="space-y-2">
                          <input value={editQuestionData.topic} onChange={(e) => setEditQuestionData({ ...editQuestionData, topic: e.target.value })} className="w-full px-2 py-1 rounded bg-gray-800 border border-gray-700" />
                          <textarea value={editQuestionData.question} onChange={(e) => setEditQuestionData({ ...editQuestionData, question: e.target.value })} rows="3" className="w-full px-2 py-1 rounded bg-gray-800 border border-gray-700"></textarea>
                          <input value={editQuestionData.category} onChange={(e) => setEditQuestionData({ ...editQuestionData, category: e.target.value })} className="w-full px-2 py-1 rounded bg-gray-800 border border-gray-700" />
                          <div className="flex gap-2">
                            <button onClick={saveEditQuestion} className="px-3 py-2 rounded bg-green-600">Save</button>
                            <button onClick={cancelEditQuestion} className="px-3 py-2 rounded bg-gray-700">Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex justify-between items-start mb-2">
                            <div><div className="font-bold">{q.topic}</div><div className="text-xs text-gray-400">{q.category}</div></div>
                            <div className="flex gap-2">
                              <button onClick={() => startEditQuestion(q)} className="px-2 py-1 rounded bg-blue-600"><Edit3 size={14} /></button>
                              <button onClick={() => deleteQuestion(q.id)} className="px-2 py-1 rounded bg-red-600"><Trash2 size={14} /></button>
                            </div>
                          </div>
                          <div className="text-sm text-gray-300">{q.question}</div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SampleLibrary() {
  const [samples, setSamples] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedSample, setSelectedSample] = useState(null);
  const [playingSample, setPlayingSample] = useState(null);

  // Debounce search input by 250ms to avoid filtering on every keystroke
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm), 250);
    return () => clearTimeout(t);
  }, [searchTerm]);

  const fetchSamples = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/samples`);
      const data = await res.json();
      setSamples(data.samples || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchSamples(); }, [fetchSamples]);

  // Memoized filtering so it doesn't re-run on every render
  const filteredSamples = useMemo(() => {
    const term = debouncedSearch.toLowerCase();
    if (!term) return samples;
    return samples.filter(sample =>
      sample.topic.toLowerCase().includes(term) ||
      (sample.speaker || '').toLowerCase().includes(term) ||
      (sample.tags || []).some(tag => tag.toLowerCase().includes(term))
    );
  }, [samples, debouncedSearch]);

  const openPlayback = useCallback((sample) => {
    setPlayingSample(sample);
  }, []);

  const downloadAudio = useCallback((filename, audioUrl) => {
    const link = document.createElement('a');
    link.href = audioUrl;
    link.download = filename;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, []);

  if (loading) return (
    <div className="text-center py-12">
      <Loader className="animate-spin mx-auto mb-2" size={36} />
      <div>Loading samples...</div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-1">Sample Library</h2>
        <p className="text-sm text-gray-400">Learn from high-scoring speeches</p>
      </div>

      <div className="p-3 bg-gray-800 border border-gray-700 rounded">
        <input
          type="text"
          placeholder="Search by topic, speaker, or tag..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-3 py-2 rounded bg-gray-900 border border-gray-700"
        />
      </div>

      {filteredSamples.length === 0 ? (
        <div className="text-center p-6 bg-gray-800 border border-gray-700 rounded">No samples found</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredSamples.map(sample => (
            <div key={sample.id} className="p-4 bg-gray-800 border border-gray-700 rounded">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <div className="font-bold">{sample.topic}</div>
                  <div className="text-xs text-gray-400">{sample.speaker}</div>
                </div>
                <div className="text-2xl font-black text-[#1e90ff]">{sample.score}</div>
              </div>
              <div className="mb-2 text-sm text-[#d1d1d1] italic">{sample.question || '(no question provided)'}</div>
              <div className="flex gap-2">
                <button onClick={() => openPlayback(sample)} className="px-3 py-2 rounded bg-gray-700">Playback</button>
                <button onClick={() => downloadAudio(sample.filename, sample.audioUrl)} className="px-3 py-2 rounded bg-gray-700">Download</button>
                <button onClick={() => setSelectedSample(sample)} className="px-3 py-2 rounded bg-[#1e90ff] text-white">View</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {playingSample && (
        <PlaybackBar
          audioUrl={playingSample.audioUrl}
          autoPlay
          onClose={() => setPlayingSample(null)}
        />
      )}

      {selectedSample && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="rounded-xl max-w-3xl w-full max-h-[85vh] overflow-y-auto p-6 bg-gray-800 border border-gray-700">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-2xl font-bold mb-1">{selectedSample.topic}</h3>
                <div className="text-sm text-gray-400">{selectedSample.speaker} | {selectedSample.score}/2.0</div>
              </div>
              <button onClick={() => setSelectedSample(null)} className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-200 transition hover:bg-white/10" aria-label="Close sample details">
                <X size={18} />
              </button>
            </div>
            {selectedSample.transcript && (
              <div className="mb-4">
                <h4 className="font-bold mb-2">Transcript</h4>
                <div className="p-3 rounded bg-gray-900 border border-gray-700 text-sm text-gray-300">{selectedSample.transcript}</div>
              </div>
            )}
            {selectedSample.feedback && (
              <div>
                <h4 className="font-bold mb-2">Why This Speech Scored High</h4>
                <div className="p-3 rounded bg-gray-900 border border-gray-700 text-sm text-gray-300">{selectedSample.feedback}</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Footer({ setCurrentPage }) {
  return (
    <footer className="mt-16 border-t border-[#222] bg-black">
      <div className="max-w-7xl mx-auto px-4 py-10 sm:px-6 sm:py-12 lg:px-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-left">
          <div className="flex flex-col items-center md:items-start">
            <h3 className="text-xl font-bold text-white mb-4">Support necs.</h3>
            <img src="/donation.png" alt="Donation QR Code" className="w-40 h-40 mb-3 rounded-lg border-2 border-gray-700" onError={(e) => { e.target.style.display = 'none'; }} />
            <div className="text-sm text-gray-400 text-center md:text-left">
              <p className="font-semibold text-white mb-1">Buy me a coffee</p>
              <p>NGUYEN HOANG MINH TRI</p>
              <p>1041802514</p>
              <p>Vietcombank</p>
            </div>
          </div>
          <div className="flex flex-col">
            <h4 className="text-lg font-semibold text-white mb-4">Quick Links</h4>
            <ul className="space-y-2 text-sm">
              <li><button onClick={() => setCurrentPage('home')} className="text-gray-400 hover:text-[#1e90ff] transition">Home</button></li>
              <li><button onClick={() => setCurrentPage('analyze')} className="text-gray-400 hover:text-[#1e90ff] transition">Speech Evaluation</button></li>
              <li><button onClick={() => setCurrentPage('samples')} className="text-gray-400 hover:text-[#1e90ff] transition">Sample Library</button></li>
              <li><button onClick={() => setCurrentPage('simulation')} className="text-gray-400 hover:text-[#1e90ff] transition">NEC Speaking Simulation</button></li>
              <li><button onClick={() => window.open('/necs_user_manual.pdf', '_blank')} className="text-gray-400 hover:text-[#1e90ff] transition">necs. User Manual</button></li>
            </ul>
          </div>
          <div className="flex flex-col">
            <h4 className="text-lg font-semibold text-white mb-4">Connect with me</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="https://facebook.com/notmtri" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-[#1e90ff] transition flex items-center gap-2">Facebook</a></li>
              <li><a href="https://youtube.com/@therealmtri" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-[#1e90ff] transition flex items-center gap-2">YouTube</a></li>
              <li><a href="https://instagram.com/notmtri" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-[#1e90ff] transition flex items-center gap-2">Instagram</a></li>
              <li><a href="mailto:nguyenhoangminhtri2k8@gmail.com" className="text-gray-400 hover:text-[#1e90ff] transition flex items-center gap-2">Email</a></li>
            </ul>
          </div>
          <div className="flex flex-col">
            <h4 className="text-lg font-semibold text-white mb-4">Contact necs.</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="https://instagram.com/necspeaking" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-[#1e90ff] transition flex items-center gap-2">Instagram</a></li>
              <li><a href="mailto:necspeaking@gmail.com" className="text-gray-400 hover:text-[#1e90ff] transition flex items-center gap-2">Email</a></li>
              <li><a href="https://forms.gle/rshYXP6niQ7NR3G68" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-[#1e90ff] transition flex items-center gap-2">For User Feedback</a></li>
              <li><a href="https://forms.gle/SKY6RSRoQXLehJUL6" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-[#1e90ff] transition flex items-center gap-2">For Samples Contributions</a></li>
            </ul>
          </div>
        </div>
        <div className="mt-12 pt-8 border-t border-[#222] text-center">
          <p className="text-sm text-gray-400">Developed by Nguyen Hoang Minh Tri | English 1 (23-26) | HSGS Le Quy Don - Nam Nha Trang</p>
        </div>
      </div>
    </footer>
  );
}

