import React from 'react';
import { AlertCircle, Download, Home, Loader, Menu, Settings, User, UserPlus, Users, X } from 'lucide-react';
import { getDisplayRole, isAdminProfile } from '../appShared';

export function AppHeader({
  currentPage,
  navTo,
  currentUser,
  guestMode,
  adminAuthenticated,
  openAuth,
  openAdminPanel,
  mobileMenuOpen,
  setMobileMenuOpen,
  installPrompt,
  handleInstallApp,
  announcement,
}) {
  const currentUserIsAdmin = isAdminProfile(currentUser);
  const currentUserRole = getDisplayRole(currentUser);
  const accountLabel = currentUser ? currentUser.username : 'Log in';
  const accountSubtitle = currentUser
    ? `${currentUserRole} profile`
    : guestMode
      ? 'Guest session active'
      : 'Sign in to save progress';

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#06101d]/85 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 select-none">
              <button onClick={() => navTo('home')} className="text-3xl font-extrabold tracking-tight text-white cursor-pointer">
                necs.
              </button>
            </div>

            <div className="flex items-center gap-3 flex-wrap max-w-full overflow-hidden">
              <nav className="hidden md:flex gap-2">
                <button onClick={() => navTo('home')} className={`px-4 py-2 rounded-full font-medium transition inline-flex items-center gap-2 ${currentPage === 'home' ? 'bg-sky-500 text-white shadow-[0_0_30px_rgba(56,189,248,0.25)]' : 'text-slate-300 hover:bg-white/10'}`}><Home size={16} /> Home</button>
                <button onClick={() => navTo('analyze')} className={`px-4 py-2 rounded-full font-medium transition ${currentPage === 'analyze' ? 'bg-sky-500 text-white shadow-[0_0_30px_rgba(56,189,248,0.25)]' : 'text-slate-300 hover:bg-white/10'}`}>Analyze</button>
                <button onClick={() => navTo('samples')} className={`px-4 py-2 rounded-full font-medium transition ${currentPage === 'samples' ? 'bg-sky-500 text-white shadow-[0_0_30px_rgba(56,189,248,0.25)]' : 'text-slate-300 hover:bg-white/10'}`}>Samples</button>
                <button onClick={() => navTo('simulation')} className={`px-4 py-2 rounded-full font-medium transition ${currentPage === 'simulation' ? 'bg-sky-500 text-white shadow-[0_0_30px_rgba(56,189,248,0.25)]' : 'text-slate-300 hover:bg-white/10'}`}>Simulation</button>
                <button onClick={() => navTo('community')} className={`px-4 py-2 rounded-full font-medium transition inline-flex items-center gap-2 ${currentPage === 'community' ? 'bg-sky-500 text-white shadow-[0_0_30px_rgba(56,189,248,0.25)]' : 'text-slate-300 hover:bg-white/10'}`}><Users size={16} /> Community</button>
                <button
                  onClick={openAdminPanel}
                  className={`p-2.5 rounded-full transition ${adminAuthenticated ? 'bg-amber-300/10 text-amber-100 hover:bg-amber-300/15' : 'text-slate-300 hover:bg-white/10 hover:text-white'}`}
                  title={adminAuthenticated ? 'Admin Panel (authenticated)' : 'Admin Panel'}
                >
                  <Settings size={18} />
                </button>
                {installPrompt && (
                  <button onClick={handleInstallApp} className="px-4 py-2 rounded-full font-medium transition bg-sky-500 hover:bg-sky-400 text-white flex items-center gap-1.5 shadow-[0_0_30px_rgba(56,189,248,0.25)] text-sm animate-pulse" title="Install Web App">
                    <Download size={15} /> Install
                  </button>
                )}
              </nav>

              <button onClick={() => setMobileMenuOpen((value) => !value)} className="md:hidden p-2.5 rounded-full text-slate-300 transition hover:bg-white/10">
                {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
              </button>

              <button
                type="button"
                onClick={() => (currentUser ? navTo('profile') : openAuth('login'))}
                className="group flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.04] px-2 py-2 text-left transition hover:bg-white/[0.08]"
                title={currentUser ? 'Open profile' : 'Log in'}
              >
                <img
                  src={currentUser?.avatar || '/logo.png'}
                  alt={currentUser ? `${currentUser.name} profile` : 'School Logo'}
                  className="h-11 w-11 rounded-2xl object-cover shrink-0 ring-1 ring-white/10 shadow-lg"
                  onError={(e) => {
                    e.target.src = currentUser?.avatar || 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="%234F46E5"/><text x="50" y="60" text-anchor="middle" fill="white" font-size="35" font-family="Arial" font-weight="bold">HS</text></svg>';
                  }}
                />
                <div className="hidden sm:block pr-2">
                  <div className="flex items-center gap-2">
                    <div className="text-sm font-semibold text-white">{accountLabel}</div>
                    {currentUserIsAdmin && (
                      <span className="rounded-full border border-amber-300/30 bg-amber-300/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-100">
                        admin
                      </span>
                    )}
                    {!currentUser && guestMode && (
                      <span className="rounded-full border border-sky-300/25 bg-sky-300/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-sky-100">
                        guest
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-400">{accountSubtitle}</div>
                </div>
              </button>
            </div>
          </div>
        </div>
      </header>

      {announcement?.enabled && announcement?.message && (
        <div className="w-full border-b border-sky-400/20 bg-sky-400/10 text-center py-2 px-4">
          <p className="text-sm font-medium text-sky-300 inline-flex items-center justify-center gap-2">
            <AlertCircle size={16} className="shrink-0" />
            <span>{announcement.message}</span>
            <AlertCircle size={16} className="shrink-0" />
          </p>
        </div>
      )}

      {mobileMenuOpen && (
        <div className="md:hidden border-b border-white/10 bg-[#081120]/95 backdrop-blur-xl">
          <nav className="mx-auto max-w-7xl px-6 py-4 flex flex-col gap-2">
            <button onClick={() => navTo('home')} className={`px-4 py-3 rounded-2xl font-medium text-left transition inline-flex items-center gap-2 ${currentPage === 'home' ? 'bg-sky-500 text-white' : 'text-slate-300 hover:bg-white/10'}`}><Home size={16} /> Home</button>
            <button onClick={() => navTo('analyze')} className={`px-4 py-3 rounded-2xl font-medium text-left transition ${currentPage === 'analyze' ? 'bg-sky-500 text-white' : 'text-slate-300 hover:bg-white/10'}`}>Analyze</button>
            <button onClick={() => navTo('samples')} className={`px-4 py-3 rounded-2xl font-medium text-left transition ${currentPage === 'samples' ? 'bg-sky-500 text-white' : 'text-slate-300 hover:bg-white/10'}`}>Samples</button>
            <button onClick={() => navTo('simulation')} className={`px-4 py-3 rounded-2xl font-medium text-left transition ${currentPage === 'simulation' ? 'bg-sky-500 text-white' : 'text-slate-300 hover:bg-white/10'}`}>Simulation</button>
            <button onClick={() => navTo('community')} className={`px-4 py-3 rounded-2xl font-medium text-left transition inline-flex items-center gap-2 ${currentPage === 'community' ? 'bg-sky-500 text-white' : 'text-slate-300 hover:bg-white/10'}`}><Users size={16} /> Community</button>
            <button onClick={() => (currentUser ? navTo('profile') : openAuth('login'))} className="px-4 py-3 rounded-2xl font-medium text-left text-slate-300 transition hover:bg-white/10 inline-flex items-center gap-2">
              <User size={16} />
              {currentUser ? 'Profile' : 'Log In'}
            </button>
            {installPrompt && (
              <button onClick={handleInstallApp} className="px-4 py-3 rounded-2xl font-medium text-left text-sky-300 hover:bg-sky-400/10 transition inline-flex items-center gap-2">
                <Download size={16} /> Install Web App
              </button>
            )}
          </nav>
        </div>
      )}
    </>
  );
}

export function AppStatusStack({
  guestMode,
  currentUser,
  guestModeBannerVisible,
  dismissGuestModeBanner,
  openAuth,
  authError,
  currentPage,
  isWarmingBackend,
  isOffline,
}) {
  return (
    <>
      {isOffline && (
        <div className="mb-4 flex items-center justify-center gap-3 rounded-2xl border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-center text-sm text-rose-100 animate-pulse">
          <AlertCircle size={16} className="shrink-0" />
          <span>Working Offline. Speech analysis and profile sync are unavailable until connection is restored.</span>
        </div>
      )}
      {guestMode && !currentUser && guestModeBannerVisible && (
        <div className="mb-4 flex flex-col gap-3 rounded-[24px] border border-sky-400/20 bg-[linear-gradient(135deg,rgba(14,165,233,0.12),rgba(15,23,42,0.92))] px-4 py-4 text-slate-100 shadow-[0_16px_40px_rgba(2,6,23,0.25)] sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-sky-400/20 bg-sky-400/12 text-sky-200">
              <AlertCircle size={18} />
            </div>
            <div>
              <div className="text-sm font-semibold text-white">Guest mode is active</div>
              <div className="mt-1 text-sm leading-6 text-slate-300">
                Practice works normally, but your scores, profile changes, and history will not be saved after you leave this session.
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              type="button"
              onClick={() => openAuth('signup')}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-sky-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-400"
            >
              <UserPlus size={15} />
              Save progress
            </button>
            <button
              type="button"
              onClick={dismissGuestModeBanner}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-slate-300 transition hover:bg-white/[0.08] hover:text-white"
              aria-label="Dismiss guest mode notice"
              title="Dismiss guest mode notice"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {authError && currentPage !== 'auth' && currentPage !== 'profile' && (
        <div className="mb-4 rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
          {authError}
        </div>
      )}

      {isWarmingBackend && (
        <div className="mb-4 flex items-center justify-center gap-3 rounded-2xl border border-amber-400/25 bg-amber-400/10 px-4 py-3 text-center text-sm text-amber-100">
          <Loader size={16} className="animate-spin" />
          <span>Loading service and reconnecting backend tools...</span>
        </div>
      )}
    </>
  );
}

export function Footer({ setCurrentPage }) {
  return (
    <footer className="mt-16 border-t border-[#222] bg-black">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-12 lg:px-12">
        <div className="grid grid-cols-1 gap-8 text-left md:grid-cols-4">
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
              <li><button onClick={() => setCurrentPage('community')} className="text-gray-400 hover:text-[#1e90ff] transition">Community Profiles</button></li>
              <li><button onClick={() => setCurrentPage('profile')} className="text-gray-400 hover:text-[#1e90ff] transition">My Profile</button></li>
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

