// Complete App.js - Full Application with All Components and Mobile Hamburger Menu
import React, { useState, useRef, useEffect } from 'react';
import { Upload, Play, Pause, Download, CheckCircle, AlertCircle, Loader, FileAudio, Settings, Lock, Trash2, Edit3, Mic, Circle, Menu, X } from 'lucide-react';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:5000';
const ADMIN_PASSWORD = '040108Minhtri';

// HELPER FUNCTION - Download document from base64
const downloadDocumentFromBase64 = (base64String, filename) => {
  try {
    console.log('Starting download...', filename);
    
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
    
    console.log('Download successful!');
    return true;
  } catch (error) {
    console.error('Download failed:', error);
    alert('Failed to download: ' + error.message);
    return false;
  }
};

export default function SpeakUpApp() {
  const [currentPage, setCurrentPage] = useState('analyze');
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

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAudioFile(file);
      const url = URL.createObjectURL(file);
      setAudioURL(url);
      setStep('preview');
    }
  };

  const togglePlayback = () => {
    if (audioRef.current) {
      if (isPlaying) audioRef.current.pause();
      else audioRef.current.play();
      setIsPlaying(!isPlaying);
    }
  };

  const analyzeAudio = async () => {
    if (!topic.trim()) {
      setError('Please enter a topic');
      return;
    }
    if (!audioFile) {
      setError('Please upload audio');
      return;
    }

    setStep('uploading');
    setError(null);

    const formData = new FormData();
    formData.append('audio', audioFile);
    formData.append('topic', topic);

    try {
      const response = await fetch(`${API_BASE_URL}/api/analyze`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        setResults(data);
        setStep('results');
      } else {
        setError(data.error || 'Analysis failed');
        setStep('preview');
      }
    } catch (err) {
      setError('Connection failed. Make sure the backend is running.');
      setStep('preview');
    }
  };

  const downloadDocument = () => {
    if (!results) {
      alert('No results available');
      return;
    }

    if (results.document_base64) {
      downloadDocumentFromBase64(results.document_base64, results.document_filename);
    } else if (results.document_url) {
      window.open(`${API_BASE_URL}${results.document_url}`, '_blank');
    } else {
      alert('Document download not available');
    }
  };

  const reset = () => {
    setStep('input');
    setTopic('');
    if (audioURL) URL.revokeObjectURL(audioURL);
    setAudioFile(null);
    setAudioURL(null);
    setResults(null);
    setError(null);
    setIsPlaying(false);
  };

  const openAdminPanel = () => {
    const password = prompt('Enter admin password:');
    if (password === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      setShowAdminPanel(true);
    } else if (password !== null) {
      alert('Incorrect password!');
    }
  };

  const getScoreColor = (score, max) => {
    const percentage = (score / max) * 100;
    if (percentage >= 80) return 'text-green-400';
    if (percentage >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div style={{fontFamily: 'Space Grotesk, ui-sans-serif, system-ui', backgroundColor: '#121212', color: '#d1d1d1'}} className="min-h-screen">
      <header className="sticky top-0 z-50 border-b border-[#222] bg-black">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 select-none">
              <button 
                onClick={() => { setCurrentPage('analyze'); reset(); }}
                className="font-grotesk text-3xl font-extrabold text-white cursor-pointer"
              >
                necs.
              </button>
            </div>

            <div className="flex items-center gap-4 flex-wrap max-w-full overflow-hidden">
              {/* Desktop Navigation */}
              <nav className="hidden md:flex gap-2">
                <button
                  onClick={() => { setCurrentPage('analyze'); reset(); }}
                  className={`px-4 py-2 rounded-xl font-medium ${currentPage === 'analyze' ? 'bg-[#1e90ff] text-white' : 'text-gray-300 hover:bg-gray-800'}`}
                >
                  Analyze
                </button>
                <button
                  onClick={() => setCurrentPage('samples')}
                  className={`px-4 py-2 rounded-xl font-medium ${currentPage === 'samples' ? 'bg-[#1e90ff] text-white' : 'text-gray-300 hover:bg-gray-800'}`}
                >
                  Samples
                </button>
                <button
                  onClick={() => setCurrentPage('simulation')}
                  className={`px-4 py-2 rounded-xl font-medium ${currentPage === 'simulation' ? 'bg-[#1e90ff] text-white' : 'text-gray-300 hover:bg-gray-800'}`}
                >
                  Simulation
                </button>

                <button
                  onClick={openAdminPanel}
                  className="p-2.5 rounded-xl text-gray-300 hover:bg-gray-800"
                  title="Admin Panel"
                >
                  <Settings size={18} />
                </button>
              </nav>

              {/* Mobile Hamburger Menu */}
              <div className="md:hidden flex items-center gap-2">
                <button
                  onClick={openAdminPanel}
                  className="p-2.5 rounded-xl text-gray-300 hover:bg-gray-800"
                  title="Admin Panel"
                >
                  <Settings size={18} />
                </button>
                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="p-2.5 rounded-xl text-gray-300 hover:bg-gray-800"
                >
                  {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
                </button>
              </div>

              <img 
                src="/logo.png" 
                alt="School Logo" 
                className="h-11 w-11 object-cover shrink-0"
                onError={(e) => {
                  e.target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="%234F46E5"/><text x="50" y="60" text-anchor="middle" fill="white" font-size="35" font-family="Arial" font-weight="bold">HS</text></svg>';
                }}
              />
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-gray-900 border-b border-gray-700">
          <nav className="max-w-7xl mx-auto px-6 py-4 flex flex-col gap-2">
            <button
              onClick={() => { 
                setCurrentPage('analyze'); 
                reset(); 
                setMobileMenuOpen(false);
              }}
              className={`px-4 py-3 rounded-xl font-medium text-left ${currentPage === 'analyze' ? 'bg-[#1e90ff] text-white' : 'text-gray-300 hover:bg-gray-800'}`}
            >
              Analyze
            </button>
            <button
              onClick={() => {
                setCurrentPage('samples');
                setMobileMenuOpen(false);
              }}
              className={`px-4 py-3 rounded-xl font-medium text-left ${currentPage === 'samples' ? 'bg-[#1e90ff] text-white' : 'text-gray-300 hover:bg-gray-800'}`}
            >
              Samples
            </button>
            <button
              onClick={() => {
                setCurrentPage('simulation');
                setMobileMenuOpen(false);
              }}
              className={`px-4 py-3 rounded-xl font-medium text-left ${currentPage === 'simulation' ? 'bg-[#1e90ff] text-white' : 'text-gray-300 hover:bg-gray-800'}`}
            >
              Simulation
            </button>
          </nav>
        </div>
      )}

      <div className="max-w-5xl mx-auto px-6 py-8">
        {currentPage === 'analyze' ? (
          <>
            <div className="text-center mb-6">
              <h2 className="text-3xl font-bold mb-2">{step === 'results' ? 'Your Speech Analysis (+/- 0.1)' : 'Analyze Your Speech'}</h2>
              <p className="text-sm text-gray-300">Master NEC Speaking with AI-powered feedback</p>
            </div>

            {error && (
              <div className="mb-6 p-3 rounded-xl flex items-center gap-3 bg-red-700/10 border border-red-700/20">
                <AlertCircle size={18} />
                <span className="font-medium">{error}</span>
              </div>
            )}

            <div className="rounded-xl p-6 bg-gray-800 border border-gray-700">
              {step === 'input' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold mb-2 text-gray-200">Speaking Question</label>
                    <textarea
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      placeholder="Enter the topic or question you'll be speaking about..."
                      className="w-full px-4 py-3 rounded-xl bg-gray-900 border border-gray-700 text-white placeholder-gray-500"
                      rows="4"
                    />
                  </div>

                  <div>
                    <label className="justify-center flex items-center gap-3 px-4 py-3 rounded-xl font-semibold cursor-pointer bg-[#1e90ff] text-white">
                      <Upload size={18} />
                      <span>Upload Audio File</span>
                      <input
                        type="file"
                        accept="audio/*"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>
                  </div>

                  <p className="text-xs text-gray-400 text-center">Supported: MP3, WAV, M4A, WEBM, OGG • Max 5 minutes</p>
                </div>
              )}

              {step === 'preview' && (
                <div className="space-y-6 text-center">
                  <div className="inline-flex items-center justify-center w-20 h-20 mb-4 bg-gray-800 rounded-xl">
                    <FileAudio size={36} />
                  </div>
                  <div className="font-semibold">{audioFile?.name}</div>

                  <div className="flex justify-center gap-3">
                    <button onClick={togglePlayback} className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gray-700 text-white">
                      {isPlaying ? <><Pause size={16} /> Pause</> : <><Play size={16} /> Preview</>}
                    </button>
                    <button onClick={analyzeAudio} className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#1e90ff] text-white">
                      <CheckCircle size={16} /> Analyze Speech
                    </button>
                  </div>

                  <audio ref={audioRef} src={audioURL} onEnded={() => setIsPlaying(false)} />
                </div>
              )}

              {step === 'uploading' && (
                <div className="text-center py-12">
                  <Loader className="animate-spin mx-auto mb-4 text-[#1e90ff]" size={48} />
                  <div className="font-semibold">Analyzing your speech...</div>
                </div>
              )}

              {step === 'results' && results && (
                <div className="space-y-6">
                  <div className="text-center p-6 rounded-xl bg-gray-800 border border-gray-700">
                    <div className="text-5xl font-extrabold text-[#1e90ff]">{results.scores.total.toFixed(2)}</div>
                    <div className="text-sm text-gray-400">out of 2.0</div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    {[
                      { label: '🧠 Content', score: results.scores.content, max: 0.9 },
                      { label: '🎯 Accuracy', score: results.scores.accuracy, max: 0.6 },
                      { label: '🎙️ Delivery', score: results.scores.delivery, max: 0.5 }
                    ].map((item, idx) => (
                      <div key={idx} className="p-4 rounded-xl bg-gray-800 border border-gray-700 text-center">
                        <div className="text-xs font-bold uppercase mb-2 text-gray-300">{item.label}</div>
                        <div className={`text-2xl font-black ${getScoreColor(item.score, item.max)}`}>{item.score.toFixed(2)}</div>
                        <div className="text-xs text-gray-400">/ {item.max.toFixed(1)}</div>
                      </div>
                    ))}
                  </div>

                  <div>
                    <h3 className="text-lg font-bold mb-2">Detailed Feedback</h3>
                    <div className="space-y-3">
                      <div className="p-3 rounded-xl bg-gray-800 border border-gray-700">
                        <div className="font-semibold">🧠 Content</div>
                        <div className="text-sm text-gray-300">{results.feedback.content}</div>
                      </div>
                      <div className="p-3 rounded-xl bg-gray-800 border border-gray-700">
                        <div className="font-semibold">🎯 Accuracy</div>
                        <div className="text-sm text-gray-300">{results.feedback.accuracy}</div>
                      </div>
                      <div className="p-3 rounded-xl bg-gray-800 border border-gray-700">
                        <div className="font-semibold">🎙️ Delivery</div>
                        <div className="text-sm text-gray-300">{results.feedback.delivery}</div>
                      </div>
                    </div>
                  </div>

                  {results.sample_response && (
                    <div className="p-4 rounded-xl bg-gray-800 border border-amber-800">
                      <h4 className="font-bold mb-2">Sample 2.0 Response</h4>
                      <div className="text-sm text-gray-300 whitespace-pre-line">{results.sample_response}</div>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button onClick={downloadDocument} className="inline-flex items-center justify-center gap-2 flex-1 py-3 rounded-xl bg-[#1e90ff] text-white"><Download size={16} /> Download Report</button>
                    <button onClick={reset} className="py-3 px-6 rounded-xl bg-gray-700">New Analysis</button>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : currentPage === 'samples' ? (
          <SampleLibrary />
        ) : (
          <SimulationMode />
        )}
      </div>

      <Footer setCurrentPage={setCurrentPage} />

      {showAdminPanel && isAuthenticated && <AdminPanel onClose={() => setShowAdminPanel(false)} />}
    </div>
  );
}

function SimulationMode() {
  const [simStep, setSimStep] = useState('intro');
  const [currentQuestion, setCurrentQuestion] = useState(null);
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

  const testMicrophone = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      setMicTested(true);
      alert('Microphone test successful! You can now proceed.');
    } catch (err) {
      alert('Microphone access denied. Please enable microphone permissions.');
    }
  };

  const startSimulation = async () => {
    if (!micTested) {
      alert('Please test your microphone first!');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/questions/random`);
      const data = await response.json();
      
      if (data.error) {
        setError('No questions available. Please add questions in admin panel.');
        return;
      }

      setCurrentQuestion(data.question);
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
    } catch (err) {
      setError('Failed to load question. Check your connection.');
    }
  };

  const skipReading = () => {
    clearInterval(timerRef.current);
    setSimStep('preparation');
    setCountdown(300);
    startPreparationTimer();
  };

  const startPreparationTimer = () => {
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
  };

  const startRecordingAuto = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(audioBlob);
        setRecordedAudioURL(audioUrl);
        setRecordedBlob(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setSimStep('recording');
      setRecordingTime(0);

      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      
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
    } catch (err) {
      setError('Failed to start recording. Check microphone permissions.');
    }
  };

  const stopRecording = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    
    setIsRecording(false);
    setSimStep('playback');
  };

  const analyzeRecording = async () => {
    if (!recordedBlob || !currentQuestion) return;

    setSimStep('analyzing');

    const formData = new FormData();
    formData.append('audio', recordedBlob, 'recording.webm');
    formData.append('topic', currentQuestion.question);

    try {
      const response = await fetch(`${API_BASE_URL}/api/analyze`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        setResults(data);
        setSimStep('results');
      } else {
        setError(data.error || 'Analysis failed');
        setSimStep('playback');
      }
    } catch (err) {
      setError('Connection failed. Make sure the backend is running.');
      setSimStep('playback');
    }
  };

  const resetSimulation = () => {
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
  };

  const downloadRecording = () => {
    if (recordedBlob) {
      const url = URL.createObjectURL(recordedBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `simulation_${Date.now()}.webm`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const downloadSimulationReport = () => {
    if (!results) {
      alert('No results available');
      return;
    }

    if (results.document_base64) {
      downloadDocumentFromBase64(results.document_base64, results.document_filename || 'simulation_feedback.docx');
    } else if (results.document_url) {
      window.open(`${API_BASE_URL}${results.document_url}`, '_blank');
    } else {
      alert('Document download not available');
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const getScoreColor = (score, max) => {
    const percentage = (score / max) * 100;
    if (percentage >= 80) return 'text-green-400';
    if (percentage >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-3xl font-bold mb-2">NEC Speaking Simulation</h2>
        <p className="text-sm text-gray-300">Experience the real test interface</p>
      </div>

      {error && (
        <div className="mb-6 p-3 rounded-xl flex items-center gap-3 bg-red-700/10 border border-red-700/20">
          <AlertCircle size={18} />
          <span className="font-medium">{error}</span>
        </div>
      )}

      <div className="rounded-xl p-8 bg-gray-800 border border-gray-700">
        {simStep === 'intro' && (
          <div className="text-center space-y-6">
            <div className="text-6xl mb-4">🎤</div>
            <h3 className="text-2xl font-bold">NEC Speaking Simulation</h3>
            <div className="text-left max-w-md mx-auto space-y-3 text-gray-300">
              <p className="flex items-start gap-2">
                <span className="text-[#1e90ff] font-bold">•</span>
                <span>Please prepare pen and paper for drafting ideas</span>
              </p>
              <p className="flex items-start gap-2">
                <span className="text-[#1e90ff] font-bold">•</span>
                <span>You will have 60 seconds to read the question</span>
              </p>
              <p className="flex items-start gap-2">
                <span className="text-[#1e90ff] font-bold">•</span>
                <span>Then 5 minutes to prepare your response</span>
              </p>
              <p className="flex items-start gap-2">
                <span className="text-[#1e90ff] font-bold">•</span>
                <span>Recording will last exactly 5 minutes</span>
              </p>
            </div>

            <div className="space-y-3 pt-4">
              <button
                onClick={testMicrophone}
                className={`w-full py-3 rounded-xl font-semibold ${
                  micTested ? 'bg-green-600 text-white' : 'bg-gray-700 text-white hover:bg-gray-600'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <Mic size={18} />
                  {micTested ? 'Microphone Ready ✓' : 'Test Microphone'}
                </div>
              </button>

              <button
                onClick={startSimulation}
                disabled={!micTested}
                className={`w-full py-3 rounded-xl font-semibold ${
                  micTested
                    ? 'bg-[#1e90ff] text-white hover:bg-[#1a7be6]'
                    : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                }`}
              >
                Start Simulation
              </button>
            </div>
          </div>
        )}

        {simStep === 'reading' && currentQuestion && (
          <div className="space-y-6">
            <div className="text-center">
              <div className="text-5xl font-extrabold text-[#1e90ff] mb-2">{formatTime(countdown)}</div>
              <div className="text-sm text-gray-400">Time to read the question</div>
            </div>

            <div className="p-6 rounded-xl bg-gray-900 border border-gray-700">
              <div className="text-xs font-bold uppercase text-gray-400 mb-2">Question {currentQuestion.id}</div>
              <div className="text-sm font-semibold text-gray-300 mb-3">{currentQuestion.topic}</div>
              <div className="text-lg text-white">{currentQuestion.question}</div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={skipReading}
                className="flex-1 py-3 rounded-xl bg-[#1e90ff] text-white font-semibold hover:bg-[#1a7be6]"
              >
                Finish Reading Question
              </button>
              <button
                onClick={async () => {
                  clearInterval(timerRef.current);
                  setCountdown(60);
                  
                  try {
                    const response = await fetch(`${API_BASE_URL}/api/questions/random`);
                    const data = await response.json();
                    
                    if (data.error) {
                      setError('No questions available. Please add questions in admin panel.');
                      return;
                    }

                    setCurrentQuestion(data.question);
                    
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
                  } catch (err) {
                    setError('Failed to load question. Check your connection.');
                  }
                }}
                className="px-4 py-3 rounded-xl bg-gray-700 text-white font-semibold hover:bg-gray-600"
              >
                Randomize Again
              </button>
            </div>
          </div>
        )}

        {simStep === 'preparation' && (
          <div className="space-y-6 text-center">
            <div className="text-6xl mb-4">✏️</div>
            <h3 className="text-2xl font-bold">Preparation Time</h3>
            <div className="text-5xl font-extrabold text-[#1e90ff]">{formatTime(countdown)}</div>
            <div className="text-sm text-gray-400">{currentQuestion.question}</div>
            
            <div className="w-full bg-gray-700 rounded-full h-3">
              <div
                className="bg-[#1e90ff] h-3 rounded-full transition-all"
                style={{ width: `${((300 - countdown) / 300) * 100}%` }}
              />
            </div>

            <button
              onClick={() => {
                clearInterval(timerRef.current);
                startRecordingAuto();
              }}
              className="px-6 py-3 rounded-xl bg-[#1e90ff] text-white font-semibold hover:bg-[#1a7be6]"
            >
              Skip Preparation & Start Recording
            </button>
          </div>
        )}

        {simStep === 'recording' && (
          <div className="space-y-6 text-center">
            <div className="flex items-center justify-center">
              <Circle className="text-red-500 animate-pulse" size={48} fill="currentColor" />
            </div>
            <h3 className="text-2xl font-bold text-red-500">Recording...</h3>
            <div className="text-5xl font-extrabold text-white">{formatTime(recordingTime)}</div>
            <div className="text-sm text-gray-400">{currentQuestion.question}</div>
            
            <div className="w-full bg-gray-700 rounded-full h-3">
              <div
                className="bg-red-500 h-3 rounded-full transition-all"
                style={{ width: `${(recordingTime / 300) * 100}%` }}
              />
            </div>

            <button
              onClick={stopRecording}
              className="px-6 py-3 rounded-xl bg-red-600 text-white font-semibold hover:bg-red-700"
            >
              Stop Recording Early
            </button>
          </div>
        )}

        {simStep === 'playback' && (
          <div className="space-y-6 text-center">
            <div className="text-6xl mb-4">✅</div>
            <h3 className="text-2xl font-bold">Recording Complete!</h3>
            <div className="text-gray-300">Duration: {formatTime(recordingTime)}</div>

            <AudioPlayback audioUrl={recordedAudioURL} />

            <div className="flex gap-3">
              <button
                onClick={analyzeRecording}
                className="flex-1 py-3 rounded-xl bg-[#1e90ff] text-white font-semibold"
              >
                Analyze My Speech
              </button>
              <button
                onClick={downloadRecording}
                className="px-6 py-3 rounded-xl bg-gray-700 text-white font-semibold"
              >
                <Download size={18} />
              </button>
            </div>

            <button
              onClick={resetSimulation}
              className="w-full py-3 rounded-xl bg-gray-700 text-white"
            >
              Start New Simulation
            </button>
          </div>
        )}

        {simStep === 'analyzing' && (
          <div className="text-center py-12">
            <Loader className="animate-spin mx-auto mb-4 text-[#1e90ff]" size={48} />
            <div className="font-semibold">Analyzing your speech...</div>
          </div>
        )}

        {simStep === 'results' && results && (
          <div className="space-y-6">
            <h3 className="text-2xl font-bold text-center">Your Results</h3>
            
            <div className="text-center p-6 rounded-xl bg-gray-800 border border-gray-700">
              <div className="text-5xl font-extrabold text-[#1e90ff]">{results.scores.total.toFixed(2)}</div>
              <div className="text-sm text-gray-400">out of 2.0</div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              {[
                { label: '🧠 Content', score: results.scores.content, max: 0.9 },
                { label: '🎯 Accuracy', score: results.scores.accuracy, max: 0.6 },
                { label: '🎙️ Delivery', score: results.scores.delivery, max: 0.5 }
              ].map((item, idx) => (
                <div key={idx} className="p-4 rounded-xl bg-gray-800 border border-gray-700 text-center">
                  <div className="text-xs font-bold uppercase mb-2 text-gray-300">{item.label}</div>
                  <div className={`text-2xl font-black ${getScoreColor(item.score, item.max)}`}>{item.score.toFixed(2)}</div>
                  <div className="text-xs text-gray-400">/ {item.max.toFixed(1)}</div>
                </div>
              ))}
            </div>

            <div>
              <h3 className="text-lg font-bold mb-2">Detailed Feedback</h3>
              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-gray-800 border border-gray-700">
                  <div className="font-semibold">🧠 Content</div>
                  <div className="text-sm text-gray-300">{results.feedback.content}</div>
                </div>
                <div className="p-3 rounded-xl bg-gray-800 border border-gray-700">
                  <div className="font-semibold">🎯 Accuracy</div>
                  <div className="text-sm text-gray-300">{results.feedback.accuracy}</div>
                </div>
                <div className="p-3 rounded-xl bg-gray-800 border border-gray-700">
                  <div className="font-semibold">🎙️ Delivery</div>
                  <div className="text-sm text-gray-300">{results.feedback.delivery}</div>
                </div>
              </div>
            </div>

            {results.sample_response && (
              <div className="p-4 rounded-xl bg-gray-800 border border-amber-800">
                <h4 className="font-bold mb-2">Sample 2.0 Response</h4>
                <div className="text-sm text-gray-300 whitespace-pre-line">{results.sample_response}</div>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={downloadSimulationReport}
                className="flex-1 py-3 rounded-xl bg-[#1e90ff] text-white font-semibold"
              >
                <div className="flex items-center justify-center gap-2">
                  <Download size={16} />
                  Download Report
                </div>
              </button>
              <button
                onClick={downloadRecording}
                className="px-6 py-3 rounded-xl bg-gray-700 text-white font-semibold"
              >
                <Download size={18} />
              </button>
            </div>

            <button
              onClick={resetSimulation}
              className="w-full py-3 rounded-xl bg-gray-700 text-white"
            >
              Start New Simulation
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function AudioPlayback({ audioUrl }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef(null);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    const audio = audioRef.current;
    if (audio && audio.duration) {
      setCurrentTime(audio.currentTime);
      setProgress((audio.currentTime / audio.duration) * 100);
    }
  };

  const handleSeek = (e) => {
    const audio = audioRef.current;
    if (audio && audio.duration) {
      const newTime = (e.target.value / 100) * audio.duration;
      audio.currentTime = newTime;
    }
  };

  const formatTime = (time) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="p-4 bg-gray-900 rounded-xl border border-gray-700">
      <audio
        ref={audioRef}
        src={audioUrl}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={() => setDuration(audioRef.current.duration)}
        onEnded={() => setIsPlaying(false)}
      />
      
      <div className="flex items-center gap-4 flex-wrap max-w-full overflow-hidden">
        <button
          onClick={togglePlay}
          className="flex items-center justify-center w-12 h-12 rounded-full bg-[#1e90ff] text-white hover:bg-[#1a7be6] transition"
        >
          {isPlaying ? <Pause size={20} /> : <Play size={20} />}
        </button>

        <div className="flex-1">
          <input
            type="range"
            value={progress}
            onChange={handleSeek}
            className="w-full accent-[#1e90ff]"
          />
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function PlaybackBar({ audioUrl, onClose }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef(null);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    const audio = audioRef.current;
    if (audio && audio.duration) {
      setCurrentTime(audio.currentTime);
      setProgress((audio.currentTime / audio.duration) * 100);
    }
  };

  const handleSeek = (e) => {
    const audio = audioRef.current;
    const newTime = (e.target.value / 100) * audio.duration;
    audio.currentTime = newTime;
  };

  const formatTime = (time) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#000] border-t border-[#222] p-3 flex items-center justify-between gap-4">
      <audio
        ref={audioRef}
        src={audioUrl}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={() => setDuration(audioRef.current.duration)}
        onEnded={() => setIsPlaying(false)}
      />
      <button
        onClick={togglePlay}
        className="flex items-center justify-center w-10 h-10 rounded-full bg-[#1e90ff] text-white hover:bg-[#1a7be6] transition"
      >
        {isPlaying ? <Pause size={20} /> : <Play size={20} />}
      </button>

      <div className="flex-1 flex flex-col items-center text-sm text-[#d1d1d1]">
        <input
          type="range"
          value={progress}
          onChange={handleSeek}
          className="w-full accent-[#1e90ff]"
        />
        <div className="flex justify-between w-full text-xs text-[#888] mt-1">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      <button onClick={onClose} className="text-[#888] hover:text-[#d1d1d1]">×</button>
    </div>
  );
}

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

  const fetchSamples = async () => {
    setLoadingSamples(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/samples`);
      const data = await res.json();
      setSamples(data.samples || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingSamples(false);
    }
  };

  const fetchQuestions = async () => {
    setLoadingQuestions(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/questions`);
      const data = await res.json();
      setQuestions(data.questions || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingQuestions(false);
    }
  };

  const handleUpload = async () => {
    if (!audioFile || !topic || !speaker || !transcript || !feedback) {
      setMessage('Please fill in all fields');
      return;
    }

    setUploading(true);
    setMessage('');

    const formData = new FormData();
    formData.append('audio', audioFile);
    formData.append('topic', topic);
    formData.append('question', question);
    formData.append('speaker', speaker);
    formData.append('score', score);
    formData.append('transcript', transcript);
    formData.append('feedback', feedback);

    try {
      const response = await fetch(`${API_BASE_URL}/api/samples/upload`, {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      if (data.success) {
        setMessage('✓ Sample uploaded successfully!');
        setAudioFile(null);
        setTopic('');
        setQuestion('');
        setSpeaker('');
        setScore('2.0');
        setTranscript('');
        setFeedback('');
      } else setMessage('Error: ' + (data.error || 'Upload failed'));
    } catch (err) {
      setMessage('Error: Connection failed');
    } finally {
      setUploading(false);
    }
  };

  const startEdit = (sample) => {
    setEditingId(sample.id);
    setEditData({
      topic: sample.topic || '',
      question: sample.question || '',
      speaker: sample.speaker || '',
      score: String(sample.score || ''),
      transcript: sample.transcript || '',
      feedback: sample.feedback || '',
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditData({});
  };

  const saveEdit = async () => {
    try {
      const form = new FormData();
      form.append('topic', editData.topic);
      form.append('speaker', editData.speaker);
      form.append('score', editData.score);
      form.append('question', editData.question);
      form.append('transcript', editData.transcript);
      form.append('feedback', editData.feedback);

      const res = await fetch(`${API_BASE_URL}/api/samples/${editingId}`, {
        method: 'PUT',
        body: form,
      });
      const data = await res.json();
      if (data.success) {
        setMessage('✓ Updated successfully');
        await fetchSamples();
        cancelEdit();
      } else setMessage('Error: ' + (data.error || 'Update failed'));
    } catch (e) {
      setMessage('Error: Connection failed');
    }
  };

  const deleteSample = async (id) => {
    if (!window.confirm('Delete this sample?')) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/samples/${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        setMessage('✓ Deleted successfully');
        await fetchSamples();
      } else setMessage('Error: ' + (data.error || 'Delete failed'));
    } catch (e) {
      setMessage('Error: Connection failed');
    }
  };

  const addQuestion = async () => {
    if (!newQuestionTopic || !newQuestionText) {
      setMessage('Please fill in topic and question');
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: newQuestionTopic,
          question: newQuestionText,
          category: newQuestionCategory,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage('✓ Question added successfully!');
        setNewQuestionTopic('');
        setNewQuestionText('');
        setNewQuestionCategory('General');
        await fetchQuestions();
      } else setMessage('Error: ' + (data.error || 'Failed to add question'));
    } catch (e) {
      setMessage('Error: Connection failed');
    }
  };

  const startEditQuestion = (q) => {
    setEditingQuestionId(q.id);
    setEditQuestionData({
      topic: q.topic || '',
      question: q.question || '',
      category: q.category || 'General',
    });
  };

  const cancelEditQuestion = () => {
    setEditingQuestionId(null);
    setEditQuestionData({});
  };

  const saveEditQuestion = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/questions/${editingQuestionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editQuestionData),
      });
      const data = await res.json();
      if (data.success) {
        setMessage('✓ Question updated');
        await fetchQuestions();
        cancelEditQuestion();
      } else setMessage('Error: ' + (data.error || 'Update failed'));
    } catch (e) {
      setMessage('Error: Connection failed');
    }
  };

  const deleteQuestion = async (id) => {
    if (!window.confirm('Delete this question?')) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/questions/${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        setMessage('✓ Question deleted');
        await fetchQuestions();
      } else setMessage('Error: ' + (data.error || 'Delete failed'));
    } catch (e) {
      setMessage('Error: Connection failed');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6 bg-gray-800 border border-gray-700">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-3">
            <Lock size={18} />
            <h2 className="text-2xl font-bold">Admin Panel</h2>
          </div>
          <button onClick={onClose} className="text-xl font-bold">×</button>
        </div>

        {message && <div className="mb-4 p-3 rounded-md bg-green-700/10 border border-green-700/20">{message}</div>}

        <div className="mb-4 flex gap-2 flex-wrap">
          <button onClick={() => setActiveTab('upload')} className={`px-3 py-2 rounded ${activeTab === 'upload' ? 'bg-[#1e90ff] text-white' : 'bg-gray-700'}`}>Upload Sample</button>
          <button onClick={() => setActiveTab('manage')} className={`px-3 py-2 rounded ${activeTab === 'manage' ? 'bg-[#1e90ff] text-white' : 'bg-gray-700'}`}>Manage Samples</button>
          <button onClick={() => setActiveTab('questions')} className={`px-3 py-2 rounded ${activeTab === 'questions' ? 'bg-[#1e90ff] text-white' : 'bg-gray-700'}`}>Question Bank</button>
        </div>

        {activeTab === 'upload' ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-1">Audio File *</label>
              <input type="file" accept="audio/*" onChange={(e) => setAudioFile(e.target.files[0])} className="w-full text-sm" />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1">Topic *</label>
              <input value={topic} onChange={(e) => setTopic(e.target.value)} className="w-full px-3 py-2 rounded bg-gray-900 border border-gray-700" />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1">Speaking Question</label>
              <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                rows="2"
                className="w-full px-3 py-2 rounded bg-gray-900 border border-gray-700"
              ></textarea>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1">Speaker *</label>
              <input value={speaker} onChange={(e) => setSpeaker(e.target.value)} className="w-full px-3 py-2 rounded bg-gray-900 border border-gray-700" />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1">Score *</label>
              <input value={score} onChange={(e) => setScore(e.target.value)} className="w-full px-3 py-2 rounded bg-gray-900 border border-gray-700" />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1">Transcript *</label>
              <textarea value={transcript} onChange={(e) => setTranscript(e.target.value)} rows="5" className="w-full px-3 py-2 rounded bg-gray-900 border border-gray-700"></textarea>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1">Why This Sample Scored High *</label>
              <textarea value={feedback} onChange={(e) => setFeedback(e.target.value)} rows="4" className="w-full px-3 py-2 rounded bg-gray-900 border border-gray-700"></textarea>
            </div>

            <button onClick={handleUpload} disabled={uploading} className="w-full py-3 rounded bg-[#1e90ff] text-white">
              {uploading ? 'Uploading...' : 'Upload Sample'}
            </button>
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
                      <div>
                        <div className="font-bold">{s.topic}</div>
                        <div className="text-xs text-gray-400">{s.speaker} • {s.score}/2.0</div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => startEdit(s)} className="px-2 py-1 rounded bg-blue-600 text-white"><Edit3 size={14} /></button>
                        <button onClick={() => deleteSample(s.id)} className="px-2 py-1 rounded bg-red-600 text-white"><Trash2 size={14} /></button>
                        <a href={s.audioUrl} target="_blank" rel="noreferrer" className="px-2 py-1 rounded bg-gray-700">Open</a>
                      </div>
                    </div>

                    {editingId === s.id ? (
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
                    ) : null}
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
                <input
                  value={newQuestionTopic}
                  onChange={(e) => setNewQuestionTopic(e.target.value)}
                  placeholder="Source"
                  className="w-full px-3 py-2 rounded bg-gray-800 border border-gray-700"
                />
                <textarea
                  value={newQuestionText}
                  onChange={(e) => setNewQuestionText(e.target.value)}
                  placeholder="Question text..."
                  rows="3"
                  className="w-full px-3 py-2 rounded bg-gray-800 border border-gray-700"
                ></textarea>
                <input
                  value={newQuestionCategory}
                  onChange={(e) => setNewQuestionCategory(e.target.value)}
                  placeholder="Category (optional)"
                  className="w-full px-3 py-2 rounded bg-gray-800 border border-gray-700"
                />
                <button
                  onClick={addQuestion}
                  className="w-full py-2 rounded bg-[#1e90ff] text-white font-semibold"
                >
                  Add Question
                </button>
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
                          <input
                            value={editQuestionData.topic}
                            onChange={(e) => setEditQuestionData({ ...editQuestionData, topic: e.target.value })}
                            className="w-full px-2 py-1 rounded bg-gray-800 border border-gray-700"
                          />
                          <textarea
                            value={editQuestionData.question}
                            onChange={(e) => setEditQuestionData({ ...editQuestionData, question: e.target.value })}
                            rows="3"
                            className="w-full px-2 py-1 rounded bg-gray-800 border border-gray-700"
                          ></textarea>
                          <input
                            value={editQuestionData.category}
                            onChange={(e) => setEditQuestionData({ ...editQuestionData, category: e.target.value })}
                            className="w-full px-2 py-1 rounded bg-gray-800 border border-gray-700"
                          />
                          <div className="flex gap-2">
                            <button onClick={saveEditQuestion} className="px-3 py-2 rounded bg-green-600">Save</button>
                            <button onClick={cancelEditQuestion} className="px-3 py-2 rounded bg-gray-700">Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <div className="font-bold">{q.topic}</div>
                              <div className="text-xs text-gray-400">{q.category}</div>
                            </div>
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
  const [selectedSample, setSelectedSample] = useState(null);
  const [playingId, setPlayingId] = useState(null);
  const audioRef = useRef(null);

  useEffect(() => { fetchSamples(); }, []);

  const fetchSamples = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/samples`);
      const data = await res.json();
      setSamples(data.samples || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const filteredSamples = samples.filter(sample =>
    sample.topic.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (sample.speaker || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (sample.tags || []).some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const openPlayback = (sampleId, audioUrl) => {
    // Just open the playback bar without auto-playing
    if (audioRef.current) {
      audioRef.current.src = audioUrl;
      audioRef.current.pause(); // Make sure it doesn't auto-play
      setPlayingId(sampleId);
    }
  };

  const downloadAudio = (filename, audioUrl) => {
    const link = document.createElement('a');
    link.href = audioUrl;
    link.download = filename;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) return (<div className="text-center py-12"><Loader className="animate-spin mx-auto mb-2" size={36} /><div>Loading samples...</div></div>);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-1">Sample Library</h2>
        <p className="text-sm text-gray-400">Learn from high-scoring speeches</p>
      </div>

      <div className="p-3 bg-gray-800 border border-gray-700 rounded">
        <input type="text" placeholder="Search by topic, speaker, or tag..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full px-3 py-2 rounded bg-gray-900 border border-gray-700" />
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
                <button onClick={() => openPlayback(sample.id, sample.audioUrl)} className="px-3 py-2 rounded bg-gray-700">Playback</button>
                <button onClick={() => downloadAudio(sample.filename, sample.audioUrl)} className="px-3 py-2 rounded bg-gray-700">Download</button>
                <button onClick={() => setSelectedSample(sample)} className="px-3 py-2 rounded bg-[#1e90ff] text-white">View</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <audio ref={audioRef} onEnded={() => setPlayingId(null)} onPause={() => setPlayingId(null)} />
      {playingId && (<PlaybackBar audioUrl={samples.find(s => s.id === playingId)?.audioUrl} onClose={() => {audioRef.current?.pause(); setPlayingId(null);}}/>)}

      {selectedSample && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="rounded-xl max-w-3xl w-full max-h-[85vh] overflow-y-auto p-6 bg-gray-800 border border-gray-700">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-2xl font-bold mb-1">{selectedSample.topic}</h3>
                <div className="text-sm text-gray-400">{selectedSample.speaker} • {selectedSample.score}/2.0</div>
              </div>
              <button onClick={() => setSelectedSample(null)} className="text-xl font-bold">×</button>
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
      <div className="max-w-7xl mx-auto px-12 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-left">
          {/* Support Section with QR Code */}
          <div className="flex flex-col items-center md:items-start">
            <h3 className="text-xl font-bold text-white mb-4">Support necs.</h3>
            <img 
              src="/donation.png" 
              alt="Donation QR Code" 
              className="w-40 h-40 mb-3 rounded-lg border-2 border-gray-700"
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
            <div className="text-sm text-gray-400 text-center md:text-left">
              <p className="font-semibold text-white mb-1">Buy me a coffee ☕</p>
              <p>NGUYEN HOANG MINH TRI</p>
              <p>1041802514</p>
              <p>Vietcombank</p>
            </div>
          </div>

          {/* Quick Links */}
          <div className="flex flex-col">
            <h4 className="text-lg font-semibold text-white mb-4">Quick Links</h4>
            <ul className="space-y-2 text-sm">
              <li><button onClick={() => setCurrentPage('analyze')} className="text-gray-400 hover:text-[#1e90ff] transition">Speech Evaluation</button></li>
              <li><button onClick={() => setCurrentPage('samples')} className="text-gray-400 hover:text-[#1e90ff] transition">Sample Library</button></li>
              <li><button onClick={() => setCurrentPage('simulation')} className="text-gray-400 hover:text-[#1e90ff] transition">NEC Speaking Simulation</button></li>
              <li><button onClick={() => window.open('/necs_user_manual.pdf', '_blank')} className="text-gray-400 hover:text-[#1e90ff] transition"> necs. User Manual </button></li>
            </ul>
          </div>

          {/* Developer */}
          <div className="flex flex-col">
            <h4 className="text-lg font-semibold text-white mb-4">Connect with me</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="https://facebook.com/notmtri" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-[#1e90ff] transition flex items-center gap-2">
              Facebook
              </a></li>
              <li><a href="https://youtube.com/@therealmtri" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-[#1e90ff] transition flex items-center gap-2">
              YouTube
              </a></li>
              <li><a href="https://instagram.com/notmtri" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-[#1e90ff] transition flex items-center gap-2">
              Instagram
              </a></li>
              <li><a href="mailto:nguyenhoangminhtri2k8@gmail.com" className="text-gray-400 hover:text-[#1e90ff] transition flex items-center gap-2">
              Email
              </a></li>
            </ul>
          </div>

          {/* Contact NECS */}
          <div className="flex flex-col">
            <h4 className="text-lg font-semibold text-white mb-4">Contact necs.</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="https://instagram.com/necspeaking" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-[#1e90ff] transition flex items-center gap-2">
              Instagram
              </a></li>
              <li><a href="mailto:necspeaking@gmail.com" className="text-gray-400 hover:text-[#1e90ff] transition flex items-center gap-2">
              Email
              </a></li>
              <li><a href="https://forms.gle/rshYXP6niQ7NR3G68" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-[#1e90ff] transition flex items-center gap-2">
              For User Feedback
              </a></li>
              <li><a href="https://forms.gle/SKY6RSRoQXLehJUL6" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-[#1e90ff] transition flex items-center gap-2">
              For Samples Contributions
              </a></li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-[#222] text-center">
          <p className="text-sm text-gray-400">
            Developed by Nguyen Hoang Minh Tri | English 1 (23-26) | HSGS Le Quy Don - Nam Nha Trang
          </p>
        </div>
      </div>
    </footer>
  );
}