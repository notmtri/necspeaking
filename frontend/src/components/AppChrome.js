import React, { useEffect, useState } from 'react';
import { AlertCircle, BookOpen, Coffee, Download, ExternalLink, Home, Loader, Menu, Mic, PlayCircle, Settings, User, UserPlus, Users, X } from 'lucide-react';
import { getDisplayRole, isAdminProfile } from '../appShared';

const NAV_ITEMS = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'analyze', label: 'Analyze', icon: Mic },
  { id: 'samples', label: 'Samples', icon: BookOpen },
  { id: 'simulation', label: 'Simulation', icon: PlayCircle },
  { id: 'community', label: 'Community', icon: Users },
];

const footerLinks = [
  { label: 'Home', page: 'home' },
  { label: 'Analyze', page: 'analyze' },
  { label: 'Samples', page: 'samples' },
  { label: 'Simulation', page: 'simulation' },
  { label: 'Community', page: 'community' },
  { label: 'Profile', page: 'profile' },
];

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
  const [announcementDismissed, setAnnouncementDismissed] = useState(false);
  const currentUserIsAdmin = isAdminProfile(currentUser);
  const currentUserRole = getDisplayRole(currentUser);
  const showAnnouncement = Boolean(announcement?.enabled && announcement?.message && !announcementDismissed);
  const accountLabel = currentUser ? currentUser.username : 'Log in';
  const accountSubtitle = currentUser
    ? `${currentUserRole} profile`
    : guestMode
      ? 'Guest session active'
      : 'Sign in to save progress';

  useEffect(() => {
    setAnnouncementDismissed(false);
  }, [announcement?.enabled, announcement?.message]);

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#06101d]/94 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-4 py-2.5 sm:px-6">
          <div className="flex min-w-0 items-center justify-between gap-3">
            <div className="flex shrink-0 items-center gap-3 select-none">
              <button onClick={() => navTo('home')} className="cursor-pointer text-2xl font-extrabold tracking-tight text-white sm:text-[1.7rem]">
                necs.
              </button>
            </div>

            <div className="flex min-w-0 items-center justify-end gap-2 sm:gap-3">
              <nav className="hidden items-center gap-1 rounded-2xl border border-white/10 bg-white/[0.04] p-1 xl:flex" aria-label="Primary navigation">
                {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => navTo(id)}
                    className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold transition ${
                      currentPage === id
                        ? 'bg-white text-slate-950'
                        : 'text-slate-300 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <Icon size={16} />
                    {label}
                  </button>
                ))}
                <button
                  onClick={openAdminPanel}
                  className={`rounded-xl p-2.5 transition ${adminAuthenticated ? 'bg-amber-300/10 text-amber-100 hover:bg-amber-300/15' : 'text-slate-300 hover:bg-white/10 hover:text-white'}`}
                  title={adminAuthenticated ? 'Admin Panel (authenticated)' : 'Admin Panel'}
                  aria-label={adminAuthenticated ? 'Open admin panel' : 'Open admin login'}
                >
                  <Settings size={18} />
                </button>
                <button
                  onClick={handleInstallApp}
                  className={`rounded-xl p-2.5 transition ${installPrompt ? 'bg-sky-500 text-white hover:bg-sky-400' : 'text-slate-300 hover:bg-white/10 hover:text-white'}`}
                  title="Install Web App"
                  aria-label="Install Web App"
                >
                  <Download size={18} />
                </button>
              </nav>

              <button onClick={() => setMobileMenuOpen((value) => !value)} className="rounded-xl border border-white/10 bg-white/[0.04] p-2.5 text-slate-300 transition hover:bg-white/10 xl:hidden" aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}>
                {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
              </button>

              <button
                type="button"
                onClick={() => (currentUser ? navTo('profile') : openAuth('login'))}
                className="group flex shrink-0 items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-2 py-1.5 text-left transition hover:border-sky-300/20 hover:bg-white/[0.08] sm:gap-3 sm:py-2"
                title={currentUser ? 'Open profile' : 'Log in'}
              >
                <img
                  src={currentUser?.avatar || '/logo.png'}
                  alt={currentUser ? `${currentUser.name} profile` : 'School Logo'}
                  className="h-9 w-9 shrink-0 rounded-xl object-cover ring-1 ring-white/10 sm:h-10 sm:w-10"
                  onError={(e) => {
                    e.target.src = currentUser?.avatar || 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="%234F46E5"/><text x="50" y="60" text-anchor="middle" fill="white" font-size="35" font-family="Arial" font-weight="bold">HS</text></svg>';
                  }}
                />
                <div className="hidden max-w-[180px] pr-2 sm:block">
                  <div className="flex items-center gap-2">
                    <div className="truncate text-sm font-semibold text-white">{accountLabel}</div>
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
                  <div className="truncate text-xs text-slate-400">{accountSubtitle}</div>
                </div>
              </button>
            </div>
          </div>
        </div>
      </header>

      {showAnnouncement && (
        <div className="w-full border-b border-sky-400/20 bg-sky-400/10 px-3 py-2" role="status" aria-live="polite">
          <div className="mx-auto flex max-w-7xl items-start gap-2 text-left text-xs font-medium leading-5 text-sky-200 sm:items-center sm:text-sm">
            <AlertCircle size={16} className="mt-0.5 shrink-0 sm:mt-0" />
            <p className="min-w-0 flex-1 break-words">{announcement.message}</p>
            <button
              type="button"
              onClick={() => setAnnouncementDismissed(true)}
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sky-100 transition hover:bg-sky-300/10"
              aria-label="Dismiss announcement"
              title="Dismiss announcement"
            >
              <X size={15} />
            </button>
          </div>
        </div>
      )}

      {mobileMenuOpen && (
        <div className="border-b border-white/10 bg-[#081120]/97 backdrop-blur-xl xl:hidden">
          <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6">
            <button
              type="button"
              onClick={() => (currentUser ? navTo('profile') : openAuth('login'))}
              className="mb-3 flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-left transition hover:bg-white/[0.08]"
            >
              <img
                src={currentUser?.avatar || '/logo.png'}
                alt={currentUser ? `${currentUser.name} profile` : 'School Logo'}
                className="h-11 w-11 rounded-xl object-cover ring-1 ring-white/10"
              />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-white">{accountLabel}</div>
                <div className="truncate text-xs text-slate-400">{accountSubtitle}</div>
              </div>
              <User size={17} className="text-slate-400" />
            </button>

            <nav className="grid grid-cols-2 gap-2" aria-label="Mobile navigation">
              {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => navTo(id)}
                  className={`inline-flex min-h-[52px] items-center gap-2 rounded-2xl px-4 py-3 text-left text-sm font-semibold transition ${
                    currentPage === id
                      ? 'bg-white text-slate-950'
                      : 'border border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/[0.08] hover:text-white'
                  }`}
                >
                  <Icon size={17} />
                  {label}
                </button>
              ))}
            </nav>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <button type="button" onClick={openAdminPanel} className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-slate-300 transition hover:bg-white/[0.08]">
                <Settings size={16} />
                Admin
              </button>
              <button type="button" onClick={handleInstallApp} className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl border border-sky-400/20 bg-sky-400/10 px-4 py-3 text-sm font-semibold text-sky-200 transition hover:bg-sky-400/15">
                <Download size={16} />
                Install
              </button>
            </div>
          </div>
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
        <div className="mb-4 flex items-start justify-center gap-3 rounded-2xl border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-center text-sm text-rose-100 sm:items-center" role="status" aria-live="polite">
          <AlertCircle size={16} className="shrink-0" />
          <span className="min-w-0 break-words">Offline. Analysis and profile sync resume when connection returns.</span>
        </div>
      )}
      {guestMode && !currentUser && guestModeBannerVisible && currentPage !== 'home' && (
        <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-sky-400/20 bg-sky-400/10 px-4 py-3 text-slate-100 sm:flex-row sm:items-center sm:justify-between sm:px-5" role="status" aria-live="polite">
          <div className="flex min-w-0 items-start gap-3">
            <div className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-sky-400/20 bg-sky-400/12 text-sky-200">
              <AlertCircle size={18} />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-white">Guest mode is active</div>
              <div className="mt-1 text-sm leading-6 text-slate-300">Practice now. Sign in to save sessions.</div>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2 self-end sm:self-auto">
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
        <div className="mb-4 rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100" role="alert">
          {authError}
        </div>
      )}

      {isWarmingBackend && currentPage !== 'home' && (
        <div className="mb-4 flex items-start justify-center gap-3 rounded-2xl border border-amber-400/25 bg-amber-400/10 px-4 py-3 text-center text-sm text-amber-100 sm:items-center" role="status" aria-live="polite">
          <Loader size={16} className="shrink-0 animate-spin" />
          <span className="min-w-0 break-words">Connecting analysis service...</span>
        </div>
      )}
    </>
  );
}

export function Footer({ setCurrentPage }) {
  const productLinks = [
    { label: 'Instagram', href: 'https://www.instagram.com/notmtri' },
    { label: 'Facebook', href: 'https://www.facebook.com/notmtri' },
    { label: 'LinkedIn', href: 'https://www.linkedin.com/in/nguyen-hoang-minh-tri-vinuni' },
    { label: 'Zalo', href: 'https://zalo.me/0932015209' },

  ];

  return (
    <footer className="mt-10 border-t border-white/10 bg-[#050b13] sm:mt-14">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-7 md:grid-cols-2 xl:grid-cols-[minmax(0,1.15fr)_minmax(150px,0.7fr)_minmax(180px,0.8fr)_minmax(260px,0.95fr)] xl:items-start">
          <div className="max-w-xl">
            <div className="text-2xl font-extrabold tracking-tight text-white">necs.</div>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              NEC speaking practice for students who need fast feedback, sample responses, and mock-test flow.
            </p>
          </div>

          <nav aria-label="Footer navigation">
            <h4 className="mb-3 text-sm font-semibold text-slate-200">Navigate</h4>
            <ul className="grid grid-cols-2 gap-x-5 gap-y-2 text-sm sm:grid-cols-3 xl:grid-cols-1">
              {footerLinks.map((link) => (
                <li key={link.page}>
                  <button onClick={() => setCurrentPage(link.page)} className="text-left text-slate-400 transition hover:text-sky-200">
                    {link.label}
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Contact links">
            <h4 className="mb-3 text-sm font-semibold text-slate-200">Contact</h4>
            <ul className="space-y-2 text-sm">
              {productLinks.map((link) => (
                <li key={link.href}>
                  <a href={link.href} target={link.href.startsWith('mailto:') ? undefined : '_blank'} rel="noopener noreferrer" className="inline-flex items-center gap-2 text-slate-400 transition hover:text-sky-200">
                    {link.label}
                    {!link.href.startsWith('mailto:') && <ExternalLink size={13} />}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <aside className="w-full rounded-2xl border border-white/10 bg-white/[0.03] p-4" aria-label="Support necs.">
            <div className="inline-flex items-center gap-2 text-sm font-semibold text-slate-100">
              <Coffee size={16} className="text-amber-100" />
              Support necs.
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-[112px_1fr] sm:items-center xl:grid-cols-1">
              <img
                src="/donation.png"
                alt="Donation QR code"
                className="h-28 w-28 rounded-xl border border-white/10 object-cover"
                onError={(event) => {
                  event.currentTarget.style.display = 'none';
                }}
              />
              <div className="text-sm leading-6 text-slate-400">
                <p className="font-semibold text-white">Buy me a coffee</p>
                <p>NGUYEN HOANG MINH TRI</p>
                <p>1041802514</p>
                <p>Vietcombank</p>
              </div>
            </div>
          </aside>
        </div>

        <div className="mt-6 flex flex-col gap-3 border-t border-white/10 pt-5 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>Developed by Nguyen Hoang Minh Tri.</p>
          <p className="font-semibold text-slate-400">necs. speaking practice</p>
        </div>
      </div>
    </footer>
  );
}
