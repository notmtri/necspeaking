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

/** The one page-title pattern. Every top-level page uses this. */
export function PageHeader({ id, title, description }) {
  return (
    <section className="mx-auto max-w-3xl text-center">
      <h1 id={id} className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
        {title}
      </h1>
      {description && (
        <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-ink-muted sm:text-base">
          {description}
        </p>
      )}
    </section>
  );
}

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
      <header className="sticky top-0 z-50 border-b border-line bg-surface-raised/95 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-4 py-2.5 sm:px-6">
          <div className="flex min-w-0 items-center justify-between gap-3">
            <div className="flex shrink-0 items-center gap-3 select-none">
              <button onClick={() => navTo('home')} className="text-2xl font-bold tracking-tight text-white sm:text-[1.7rem]">
                necs.
              </button>
            </div>

            <div className="flex min-w-0 items-center justify-end gap-2 sm:gap-3">
              <nav className="hidden items-center gap-1 rounded-card border border-line bg-overlay p-1 xl:flex" aria-label="Primary navigation">
                {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => navTo(id)}
                    className={`inline-flex items-center gap-2 rounded-control px-3.5 py-2 text-sm font-semibold transition ${
                      currentPage === id
                        ? 'bg-white text-slate-950'
                        : 'text-ink-muted hover:bg-overlay-hover hover:text-white'
                    }`}
                  >
                    <Icon size={16} />
                    {label}
                  </button>
                ))}
                <button
                  onClick={openAdminPanel}
                  className={`rounded-control p-2.5 transition ${adminAuthenticated ? 'bg-amber-300/10 text-amber-100 hover:bg-amber-300/20' : 'text-ink-muted hover:bg-overlay-hover hover:text-white'}`}
                  title={adminAuthenticated ? 'Admin panel (authenticated)' : 'Admin panel'}
                  aria-label={adminAuthenticated ? 'Open admin panel' : 'Open admin login'}
                >
                  <Settings size={18} />
                </button>
                <button
                  onClick={handleInstallApp}
                  className={`rounded-control p-2.5 transition ${installPrompt ? 'bg-sky-500 text-white hover:bg-sky-400' : 'text-ink-muted hover:bg-overlay-hover hover:text-white'}`}
                  title="Install web app"
                  aria-label="Install web app"
                >
                  <Download size={18} />
                </button>
              </nav>

              <button
                onClick={() => setMobileMenuOpen((value) => !value)}
                className="rounded-control border border-line bg-overlay p-2.5 text-ink-muted transition hover:bg-overlay-hover xl:hidden"
                aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
                aria-expanded={mobileMenuOpen}
              >
                {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
              </button>

              <button
                type="button"
                onClick={() => (currentUser ? navTo('profile') : openAuth('login'))}
                className="flex shrink-0 items-center gap-2 rounded-card border border-line bg-overlay px-2 py-1.5 text-left transition hover:border-sky-300/20 hover:bg-overlay-hover sm:gap-3 sm:py-2"
                title={currentUser ? 'Open profile' : 'Log in'}
              >
                <img
                  src={currentUser?.avatar || '/logo.png'}
                  alt=""
                  className="h-9 w-9 shrink-0 rounded-control object-cover ring-1 ring-white/10 sm:h-10 sm:w-10"
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
                  <div className="truncate text-xs text-ink-subtle">{accountSubtitle}</div>
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
            >
              <X size={15} />
            </button>
          </div>
        </div>
      )}

      {mobileMenuOpen && (
        <div className="border-b border-line bg-surface-raised/95 backdrop-blur-xl xl:hidden">
          <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6">
            <button
              type="button"
              onClick={() => (currentUser ? navTo('profile') : openAuth('login'))}
              className="mb-3 flex w-full items-center gap-3 rounded-card border border-line bg-overlay p-3 text-left transition hover:bg-overlay-hover"
            >
              <img
                src={currentUser?.avatar || '/logo.png'}
                alt=""
                className="h-11 w-11 rounded-control object-cover ring-1 ring-white/10"
              />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-white">{accountLabel}</div>
                <div className="truncate text-xs text-ink-subtle">{accountSubtitle}</div>
              </div>
              <User size={17} className="text-ink-subtle" />
            </button>

            <nav className="grid grid-cols-2 gap-2" aria-label="Mobile navigation">
              {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => navTo(id)}
                  className={`inline-flex min-h-[52px] items-center gap-2 rounded-card px-4 py-3 text-left text-sm font-semibold transition ${
                    currentPage === id
                      ? 'bg-white text-slate-950'
                      : 'border border-line bg-overlay text-ink-muted hover:bg-overlay-hover hover:text-white'
                  }`}
                >
                  <Icon size={17} />
                  {label}
                </button>
              ))}
            </nav>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <button type="button" onClick={openAdminPanel} className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-card border border-line bg-overlay px-4 py-3 text-sm font-semibold text-ink-muted transition hover:bg-overlay-hover">
                <Settings size={16} />
                Admin
              </button>
              <button type="button" onClick={handleInstallApp} className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-card border border-sky-400/20 bg-sky-400/10 px-4 py-3 text-sm font-semibold text-sky-200 transition hover:bg-sky-400/20">
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
        <div className="mb-4 flex items-start justify-center gap-3 rounded-card border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-center text-sm text-rose-100 sm:items-center" role="status" aria-live="polite">
          <AlertCircle size={16} className="shrink-0" />
          <span className="min-w-0 break-words">Offline. Analysis and profile sync resume when connection returns.</span>
        </div>
      )}
      {guestMode && !currentUser && guestModeBannerVisible && currentPage !== 'home' && (
        <div className="mb-4 flex flex-col gap-3 rounded-card border border-sky-400/20 bg-sky-400/10 px-4 py-3 text-slate-100 sm:flex-row sm:items-center sm:justify-between sm:px-5" role="status" aria-live="polite">
          <div className="flex min-w-0 items-start gap-3">
            <div className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-control border border-sky-400/20 bg-sky-400/10 text-sky-200">
              <AlertCircle size={18} />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-white">Guest mode is active</div>
              <div className="mt-1 text-sm leading-6 text-ink-muted">Practice now. Sign in to save sessions.</div>
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
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-line bg-overlay text-ink-muted transition hover:bg-overlay-hover hover:text-white"
              aria-label="Dismiss guest mode notice"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {authError && currentPage !== 'auth' && currentPage !== 'profile' && (
        <div className="mb-4 rounded-card border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100" role="alert">
          {authError}
        </div>
      )}

      {isWarmingBackend && currentPage !== 'home' && (
        <div className="mb-4 flex items-start justify-center gap-3 rounded-card border border-amber-400/25 bg-amber-400/10 px-4 py-3 text-center text-sm text-amber-100 sm:items-center" role="status" aria-live="polite">
          <Loader size={16} className="shrink-0 animate-spin" />
          <span className="min-w-0 break-words">Connecting analysis service...</span>
        </div>
      )}
    </>
  );
}

export function Footer({ navTo }) {
  const contactLinks = [
    { label: 'Instagram', href: 'https://www.instagram.com/notmtri' },
    { label: 'Facebook', href: 'https://www.facebook.com/notmtri' },
    { label: 'LinkedIn', href: 'https://www.linkedin.com/in/nguyen-hoang-minh-tri-vinuni' },
    { label: 'Zalo', href: 'https://zalo.me/0932015209' },
  ];

  return (
    <footer className="mt-10 border-t border-line bg-surface-sunken sm:mt-14">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-7 md:grid-cols-2 xl:grid-cols-[minmax(0,1.15fr)_minmax(150px,0.7fr)_minmax(180px,0.8fr)_minmax(260px,0.95fr)] xl:items-start">
          <div className="max-w-xl">
            <div className="text-2xl font-bold tracking-tight text-white">necs.</div>
            <p className="mt-2 text-sm leading-6 text-ink-muted">
              NEC speaking practice for students who need fast feedback, sample responses, and mock-test flow.
            </p>
          </div>

          <nav aria-label="Footer navigation">
            <h2 className="mb-3 text-sm font-semibold text-slate-200">Navigate</h2>
            <ul className="grid grid-cols-2 gap-x-5 gap-y-2 text-sm sm:grid-cols-3 xl:grid-cols-1">
              {footerLinks.map((link) => (
                <li key={link.page}>
                  <button onClick={() => navTo(link.page)} className="text-left text-ink-muted transition hover:text-sky-200">
                    {link.label}
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Contact links">
            <h2 className="mb-3 text-sm font-semibold text-slate-200">Contact</h2>
            <ul className="space-y-2 text-sm">
              {contactLinks.map((link) => (
                <li key={link.href}>
                  <a href={link.href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-ink-muted transition hover:text-sky-200">
                    {link.label}
                    <ExternalLink size={13} />
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <aside className="w-full rounded-card border border-line bg-overlay p-4" aria-label="Support necs.">
            <div className="inline-flex items-center gap-2 text-sm font-semibold text-slate-100">
              <Coffee size={16} className="text-amber-100" />
              Support necs.
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-[112px_1fr] sm:items-center xl:grid-cols-1">
              <img
                src="/donation.png"
                alt="Donation QR code"
                className="h-28 w-28 rounded-control border border-line object-cover"
                onError={(event) => {
                  event.currentTarget.style.display = 'none';
                }}
              />
              <div className="text-sm leading-6 text-ink-muted">
                <p className="font-semibold text-white">Buy me a coffee</p>
                <p>NGUYEN HOANG MINH TRI</p>
                <p>1041802514</p>
                <p>Vietcombank</p>
              </div>
            </div>
          </aside>
        </div>

        <div className="mt-6 flex flex-col gap-3 border-t border-line pt-5 text-sm text-ink-subtle sm:flex-row sm:items-center sm:justify-between">
          <p>Developed by Nguyen Hoang Minh Tri.</p>
          <p className="font-semibold text-ink-muted">necs. speaking practice</p>
        </div>
      </div>
    </footer>
  );
}
