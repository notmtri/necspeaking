import { BarChart3, BookOpen, CheckCircle, Mic, Sparkles, Users } from 'lucide-react';

export const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:5000';
export const ADMIN_USERNAME = 'notmtri';
export const DEFAULT_ANNOUNCEMENT = {
  enabled: true,
  message: 'IMPORTANT NOTICE: Authentication system is still under development, please continue as guest.',
};

export const PAGE_PATHS = {
  home: '/',
  auth: '/auth',
  profile: '/profile',
  community: '/community',
  analyze: '/analyze',
  samples: '/samples',
  simulation: '/simulation',
};

const PATH_PAGES = Object.entries(PAGE_PATHS).reduce((pages, [page, path]) => {
  pages[path] = page;
  return pages;
}, {});

export const pageFromLocation = (location = window.location) => {
  const normalizedPath = location.pathname.replace(/\/+$/, '') || '/';
  if (PATH_PAGES[normalizedPath]) return PATH_PAGES[normalizedPath];

  const params = new URLSearchParams(location.search);
  const queryPage = params.get('page');
  if (queryPage && PAGE_PATHS[queryPage]) return queryPage;

  return 'home';
};

export const pathForPage = (page) => PAGE_PATHS[page] || PAGE_PATHS.home;

export const isAdminProfile = (profile) => {
  const username = (profile?.username || '').trim().toLowerCase().replace(/^@/, '');
  return Boolean(profile?.isAdmin) || username === ADMIN_USERNAME;
};

export const getDisplayRole = (profile) => (isAdminProfile(profile) ? 'Admin' : (profile?.role || 'Student'));

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

export const HOME_HERO_IMAGE = '/hero.png';
export const FOUNDER_IMAGE = '/founder.jpg';
export const FEEDBACK_AVATAR = createPlaceholderImage('Student Photo', 'Swap in real community images', '#7c3aed');
export const SITE_OWNER_NAME = 'Nguyen Hoang Minh Tri';

export const HOME_STATS = [
  { value: '1,100+', label: 'active users in peak period', note: 'Data received from Google Analytics since 11/2025', icon: BarChart3 },
  { value: '> 50%', label: 'users won the National English Competition', note: 'Data gathered from NEC 25-26', icon: Users },
  { value: '3 core tools', label: 'in one focused workflow', note: 'Analyze, Samples, and Simulation.', icon: Sparkles },
];

export const HOME_FEATURES = [
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

export const HOME_FEEDBACK = [
  { name: 'Ha Van Gia Cat', role: 'First prize - NEC 25-26', quote: '"Amazing app, intuitive design, 10/10."', image: '/gcat.jpg' },
  { name: 'Annie Le Hamel', role: 'Third prize - NEC 25-26', quote: '"Great app! It really helps boost pronunciation and speaking confidence with quick, useful feedback and tailored examples."', image: '/annie.jpg' },
  { name: 'Doan Tran Anh Huy', role: 'Third prize - NEC 25-26', quote: '"After 2 weeks of intensively honing my speaking skills on NECS, I attained the second highest speaking score nationwide!"', image: '/ahuy.jpg' },
  { name: 'Nguyen Minh Tien', role: 'Second prize - NEC 24-25 & 25-26', quote: '"Students liked having one place to practice, compare examples, and build confidence before the real assessment."' },
  { name: 'Dinh Thi Lam Tra', role: 'Teacher | Le Quy Don HSGS - Nam Nha Trang', quote: 'The interface felt clear and fast, so I could focus on speaking instead of figuring out what to click next.' },
  { name: 'Tran Khanh Minh', role: 'Khanh Hoa NEC Team 25-26', quote: 'The report format made it easier to review patterns across multiple practice sessions.' },
];

export const HOME_BENEFITS = [
  'Have your speech graded automatically according to MOET-approved criteria in a matter of minutes.',
  'Level up your speaking style by learning from sample speeches of ex-competitors who scored high in their tests.',
  'Familiarize yourself with the real NEC speaking test interface and protocols, making sure you are not caught off-guard. ',
  'Reduced cost compared to hiring NEC mentors, as NECSpeaking is completely non-profit.'
];

export const HOME_FAQ = [
  { question: 'Who is necs. for?', answer: 'necs. is specifically made for NEC competitors, or those aiming for this competition to improve their speaking.' },
  { question: 'What is the best way to self-study with necs.?', answer: 'Use the Analyze tab to save time. When the results are out, see the criterion scores to identify your weak spots and train yourself from there. Remember to track your progress as well.' },
  { question: 'Can teachers add their own materials?', answer: 'Not yet. But you can contribute sample speeches and questions to me via email so I can add them into the web.' },
];

export const GUEST_STORAGE_KEY = 'necs.guestMode';

export const readGuestModePreference = () => {
  try {
    return window.localStorage.getItem(GUEST_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
};

export const writeGuestModePreference = (value) => {
  try {
    window.localStorage.setItem(GUEST_STORAGE_KEY, value ? 'true' : 'false');
  } catch {
    // Ignore storage failures and keep the in-memory setting.
  }
};

export const createAvatarDataUri = (name = 'necs user', accent = '#0ea5e9') => {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('') || 'N';

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96">
      <defs>
        <linearGradient id="avatar" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stop-color="${accent}" />
          <stop offset="100%" stop-color="#1e293b" />
        </linearGradient>
      </defs>
      <rect width="96" height="96" rx="30" fill="url(#avatar)" />
      <text x="48" y="56" text-anchor="middle" fill="#ffffff" font-size="34" font-weight="700" font-family="Arial, sans-serif">${initials}</text>
    </svg>
  `;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
};

export const createDefaultProfile = () => ({
  id: 'local-user',
  email: 'student@necs.app',
  name: 'New NECS User',
  username: 'newuser',
  className: '',
  school: '',
  cohort: '',
  role: 'Student',
  bio: 'Practicing consistently and tracking progress on necs.',
  avatar: createAvatarDataUri('New NECS User'),
  stats: { practices: 0, avgScore: 0, streak: 0, bestScore: 0 },
  progress: [],
  commitWeeks: [],
});

export const downloadDocumentFromBase64 = (base64String, filename, options = {}) => {
  const { onError } = options;

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
    onError?.(`Failed to download: ${error.message}`);
    return false;
  }
};
