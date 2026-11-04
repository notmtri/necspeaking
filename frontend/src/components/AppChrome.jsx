import React, { useEffect, useState } from 'react';
import { AlertCircle, ArrowUpRight, Download, Loader, Menu, Settings, UserPlus, X } from 'lucide-react';
import { getDisplayRole, isAdminProfile } from '../appShared';

const NAV_ITEMS = [
  { id: 'home', label: 'Home' },
  { id: 'analyze', label: 'Analyze' },
  { id: 'samples', label: 'Samples' },
  { id: 'simulation', label: 'Simulation' },
  { id: 'community', label: 'Community' },
];

const footerLinks = [
  { label: 'Home', page: 'home' },
  { label: 'Analyze', page: 'analyze' },
  { label: 'Samples', page: 'samples' },
  { label: 'Simulation', page: 'simulation' },
  { label: 'Community', page: 'community' },
  { label: 'Profile', page: 'profile' },
];

const contactLinks = [
  { label: 'Instagram', href: 'https://www.instagram.com/notmtri' },
  { label: 'Facebook', href: 'https://www.facebook.com/notmtri' },
  { label: 'LinkedIn', href: 'https://www.linkedin.com/in/nguyen-hoang-minh-tri-vinuni' },
  { label: 'Zalo', href: 'https://zalo.me/0932015209' },
];

const ICON_BUTTON = 'inline-flex h-9 w-9 items-center justify-center rounded-full text-ink-muted transition-colors duration-200 hover:bg-overlay hover:text-ink';

/** The one page-title pattern. Every top-level page uses this. */
export function PageHeader({ id, title, description }) {
  return (
    <section className="max-w-3xl pt-2 sm:pt-4">
      <h1 id={id} className="text-[2rem] font-semibold leading-[1.1] text-ink sm:text-[2.5rem]">
        {title}
      </h1>
      {description && (
        <p className="mt-3 max-w-[60ch] text-base leading-7 text-ink-muted">
          {description}
        </p>
      )}
    </section>
  );
}

function Wordmark({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="font-display text-[1.65rem] font-bold leading-none tracking-[-0.04em] text-ink"
      aria-label="necs. home"
    >
      necs.
    </button>
  );
}

function AccountButton({ currentUser, guestMode, onClick, compact = false }) {
  const isAdmin = isAdminProfile(currentUser);
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-w-0 items-center gap-2.5 rounded-full border border-line bg-surface-raised py-1 pl-1 pr-3 text-left transition-colors duration-200 hover:bg-overlay"
      title="Open profile"
    >
      <img src={currentUser.avatar || '/logo.png'} alt="" className="h-8 w-8 shrink-0 rounded-full object-cover" />
      {!compact && (
        <span className="min-w-0">
          <span className="block max-w-[140px] truncate text-sm font-medium text-ink">{currentUser.username}</span>
          <span className="block text-xs text-ink-subtle">
            {isAdmin ? 'Admin' : guestMode ? 'Guest' : getDisplayRole(currentUser)}
          </span>
        </span>
      )}
    </button>
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
  const showAnnouncement = Boolean(announcement?.enabled && announcement?.message && !announcementDismissed);

  useEffect(() => {
    setAnnouncementDismissed(false);
  }, [announcement?.enabled, announcement?.message]);

  const utilityButtons = (
    <>
      <button
        type="button"
        onClick={openAdminPanel}
        className={`${ICON_BUTTON} ${adminAuthenticated ? 'bg-amber-50 text-amber-800 hover:bg-amber-100 hover:text-amber-900' : ''}`}
        title={adminAuthenticated ? 'Admin panel (authenticated)' : 'Admin panel'}
        aria-label={adminAuthenticated ? 'Open admin panel' : 'Open admin login'}
      >
        <Settings size={17} />
      </button>
      <button
        type="button"
        onClick={handleInstallApp}
        className={`${ICON_BUTTON} ${installPrompt ? 'bg-sky-50 text-sky-700 hover:bg-sky-100 hover:text-sky-800' : ''}`}
        title="Install web app"
        aria-label="Install web app"
      >
        <Download size={17} />
      </button>
    </>
  );

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-line bg-surface-base/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Wordmark onClick={() => navTo('home')} />

          <nav className="hidden items-center gap-1 lg:flex" aria-label="Primary navigation">
            {NAV_ITEMS.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => navTo(id)}
                aria-current={currentPage === id ? 'page' : undefined}
                className={`rounded-full px-3.5 py-2 text-sm font-medium transition-colors duration-200 ${
                  currentPage === id ? 'bg-overlay text-ink' : 'text-ink-muted hover:text-ink'
                }`}
              >
                {label}
              </button>
            ))}
          </nav>

          <div className="flex min-w-0 items-center gap-2">
            <div className="hidden items-center gap-1 lg:flex">{utilityButtons}</div>
            {currentUser ? (
              <div className="hidden sm:block">
                <AccountButton currentUser={currentUser} guestMode={guestMode} onClick={() => navTo('profile')} />
              </div>
            ) : (
              <div className="hidden items-center gap-2 sm:flex">
                <button
                  type="button"
                  onClick={() => openAuth('login')}
                  className="rounded-full bg-overlay px-4 py-2 text-sm font-medium text-ink transition-colors duration-200 hover:bg-overlay-hover"
                >
                  Log in
                </button>
                <button
                  type="button"
                  onClick={() => openAuth('signup')}
                  className="rounded-full bg-ink px-4 py-2 text-sm font-medium text-white transition-colors duration-200 hover:bg-ink/85"
                >
                  Sign up
                </button>
              </div>
            )}
            <button
              type="button"
              onClick={() => setMobileMenuOpen((value) => !value)}
              className={`${ICON_BUTTON} lg:hidden`}
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="border-t border-line bg-surface-base lg:hidden">
            <div className="mx-auto max-w-7xl px-4 pb-5 pt-3 sm:px-6">
              <nav className="grid gap-1" aria-label="Mobile navigation">
                {NAV_ITEMS.map(({ id, label }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => navTo(id)}
                    aria-current={currentPage === id ? 'page' : undefined}
                    className={`rounded-control px-3 py-3 text-left text-base font-medium transition-colors duration-200 ${
                      currentPage === id ? 'bg-overlay text-ink' : 'text-ink-muted hover:bg-overlay hover:text-ink'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </nav>
              <div className="mt-4 flex items-center justify-between gap-3 border-t border-line pt-4">
                {currentUser ? (
                  <AccountButton currentUser={currentUser} guestMode={guestMode} onClick={() => navTo('profile')} />
                ) : (
                  <div className="flex gap-2">
                    <button type="button" onClick={() => openAuth('login')} className="rounded-full bg-overlay px-4 py-2.5 text-sm font-medium text-ink">
                      Log in
                    </button>
                    <button type="button" onClick={() => openAuth('signup')} className="rounded-full bg-ink px-4 py-2.5 text-sm font-medium text-white">
                      Sign up
                    </button>
                  </div>
                )}
                <div className="flex items-center gap-1">{utilityButtons}</div>
              </div>
            </div>
          </div>
        )}
      </header>

      {showAnnouncement && (
        <div className="w-full border-b border-sky-100 bg-sky-50 px-4 py-2" role="status" aria-live="polite">
          <div className="mx-auto flex max-w-7xl items-start gap-2 text-left text-sm leading-6 text-sky-900 sm:items-center sm:px-2 lg:px-4">
            <AlertCircle size={16} className="mt-1 shrink-0 text-sky-600 sm:mt-0" />
            <p className="min-w-0 flex-1 break-words">{announcement.message}</p>
            <button
              type="button"
              onClick={() => setAnnouncementDismissed(true)}
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sky-700 transition-colors hover:bg-sky-100"
              aria-label="Dismiss announcement"
            >
              <X size={15} />
            </button>
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
        <div className="mb-4 flex items-start gap-3 rounded-card border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 sm:items-center" role="status" aria-live="polite">
          <AlertCircle size={16} className="mt-0.5 shrink-0 sm:mt-0" />
          <span className="min-w-0 break-words">Offline. Analysis and profile sync resume when connection returns.</span>
        </div>
      )}
      {guestMode && !currentUser && guestModeBannerVisible && currentPage !== 'home' && (
        <div className="mb-4 flex flex-col gap-3 rounded-card border border-sky-100 bg-sky-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5" role="status" aria-live="polite">
          <div className="min-w-0 text-sm leading-6">
            <span className="font-medium text-ink">Guest mode is active.</span>{' '}
            <span className="text-ink-muted">Practise now; sign up to save your sessions.</span>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              type="button"
              onClick={() => openAuth('signup')}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-ink px-4 py-2 text-sm font-medium text-white transition-colors duration-200 hover:bg-ink/85"
            >
              <UserPlus size={15} />
              Save progress
            </button>
            <button
              type="button"
              onClick={dismissGuestModeBanner}
              className={ICON_BUTTON}
              aria-label="Dismiss guest mode notice"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {authError && currentPage !== 'auth' && currentPage !== 'profile' && (
        <div className="mb-4 rounded-card border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800" role="alert">
          {authError}
        </div>
      )}

      {isWarmingBackend && currentPage !== 'home' && (
        <div className="mb-4 flex items-center gap-3 rounded-card border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900" role="status" aria-live="polite">
          <Loader size={16} className="shrink-0 animate-spin" />
          <span className="min-w-0 break-words">Connecting analysis service...</span>
        </div>
      )}
    </>
  );
}

export function Footer({ navTo, onFeedback }) {
  return (
    <footer className="mt-20 border-t border-line bg-surface-sunken sm:mt-28">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr] lg:grid-cols-[1.6fr_0.8fr_0.8fr_1.2fr] lg:px-8">
        <div className="max-w-sm">
          <div className="font-display text-2xl font-bold tracking-[-0.04em] text-ink">necs.</div>
          <p className="mt-3 text-sm leading-6 text-ink-muted">
            Free NEC speaking practice: rubric-based feedback, high-scoring samples and a timed mock test.
          </p>
          {onFeedback && (
            <button
              type="button"
              onClick={onFeedback}
              className="mt-5 inline-flex items-center gap-2 rounded-full border border-line bg-surface-raised px-4 py-2 text-sm font-medium text-ink transition-colors duration-200 hover:bg-overlay"
            >
              Send feedback
            </button>
          )}
        </div>

        <nav aria-label="Footer navigation">
          <h2 className="font-sans text-sm font-semibold tracking-normal text-ink">Practice</h2>
          <ul className="mt-4 space-y-2.5 text-sm">
            {footerLinks.map((link) => (
              <li key={link.page}>
                <button type="button" onClick={() => navTo(link.page)} className="text-ink-muted transition-colors hover:text-ink">
                  {link.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label="Contact links">
          <h2 className="font-sans text-sm font-semibold tracking-normal text-ink">Contact</h2>
          <ul className="mt-4 space-y-2.5 text-sm">
            {contactLinks.map((link) => (
              <li key={link.href}>
                <a href={link.href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-ink-muted transition-colors hover:text-ink">
                  {link.label}
                  <ArrowUpRight size={13} />
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <aside className="flex items-start gap-4 md:col-span-3 lg:col-span-1" aria-label="Support necs.">
          <img
            src="/donation.png"
            alt="Vietcombank QR code for donations to necs."
            className="h-24 w-24 shrink-0 rounded-control border border-line bg-white object-cover"
            onError={(event) => {
              event.currentTarget.style.display = 'none';
            }}
          />
          <div className="text-sm leading-6 text-ink-muted">
            <h2 className="font-sans text-sm font-semibold tracking-normal text-ink">Buy me a coffee</h2>
            <p className="mt-1">NGUYEN HOANG MINH TRI</p>
            <p className="tabular">1041802514</p>
            <p>Vietcombank</p>
          </div>
        </aside>
      </div>
      <div className="border-t border-line">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-5 pb-20 text-sm text-ink-subtle sm:flex-row sm:gap-8 sm:px-6 sm:pb-5 lg:px-8">
          <p>Developed by Nguyen Hoang Minh Tri.</p>
          <p>Free for every NEC candidate.</p>
        </div>
      </div>
    </footer>
  );
}
