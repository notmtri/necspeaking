import { BarChart3, BookOpen, CheckCircle, Mic, Sparkles, Users } from 'lucide-react';

export const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:5000';
export const ADMIN_USERNAME = 'notmtri';
export const DEFAULT_ANNOUNCEMENT = {
  enabled: false,
  message: '',
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
  { value: '4 main features', label: 'in one focused workflow', note: 'Analyze, Samples, Simulation, and Community.', icon: Sparkles },
];

export const HOME_FEATURES = [
  {
    title: 'Analyze',
    description: 'Submit a prompt and recording to receive feedback according to NEC criteria.',
    icon: Mic,
  },
  {
    title: 'Samples',
    description: 'Study strong responses from former competitors and compare structure, language, and delivery.',
    icon: BookOpen,
  },
  {
    title: 'Simulation',
    description: 'Practice with the real test workflow to boost confidence.',
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
  'Get speaking feedback against the official NEC speaking grading rubric.',
  'Learn from sample responses featuring high-scoring performance.',
  'Practice the rhythm of the real test before competition day.',
  'Use a non-profit tool built for students who need focused preparation.'
];

export const HOME_FAQ = [
  { question: 'Who is necs. for?', answer: 'Students preparing for NEC speaking or similar English speaking assessments.' },
  { question: 'How should I self-study with necs.?', answer: 'Start with Analyze, review the weakest criterion, then repeat with a sample or simulation task.' },
  { question: 'Can teachers add materials?', answer: 'Not yet. Teachers can send sample speeches or questions by email for review.' },
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

const IMPROVEMENT_CRITERIA = [
  {
    key: 'content',
    label: 'Content',
    max: 0.9,
    focus: 'Sharpen the answer structure and support each idea with a clear example.',
    drill: 'Plan a 3-part answer in 60 seconds: position, two reasons, and one concrete example.',
    checklist: 'Make every main point answer the exact question.',
  },
  {
    key: 'accuracy',
    label: 'Accuracy',
    max: 0.6,
    focus: 'Reduce grammar slips and choose safer sentence patterns under time pressure.',
    drill: 'Rewrite three sentences from your response with simpler grammar and more precise vocabulary.',
    checklist: 'Check tense, subject-verb agreement, word form, and article use.',
  },
  {
    key: 'delivery',
    label: 'Delivery',
    max: 0.5,
    focus: 'Improve pace, clarity, confidence, and smoother transitions between ideas.',
    drill: 'Repeat the same answer twice: once slowly for clarity, once at test pace with pauses.',
    checklist: 'Use signposting, controlled pauses, and audible final consonants.',
  },
];

export const buildImprovementPlan = (results = {}) => {
  const scores = results.scores || {};
  const feedback = results.feedback || {};
  const totalScore = Number(scores.total || 0);

  const criteria = IMPROVEMENT_CRITERIA.map((criterion) => {
    const score = Number(scores[criterion.key] || 0);
    const ratio = criterion.max > 0 ? score / criterion.max : 0;
    return {
      ...criterion,
      score,
      ratio,
      comment: feedback[criterion.key] || '',
    };
  }).sort((a, b) => a.ratio - b.ratio);

  const priority = criteria[0] || IMPROVEMENT_CRITERIA[0];
  const secondary = criteria[1] || IMPROVEMENT_CRITERIA[1];
  const strongest = [...criteria].sort((a, b) => b.ratio - a.ratio)[0] || IMPROVEMENT_CRITERIA[0];
  const targetScore = Math.min(2, Math.round((totalScore + 0.1) * 100) / 100);

  return {
    priority,
    secondary,
    strongest,
    targetScore,
    focusItems: [priority, secondary],
    checklist: IMPROVEMENT_CRITERIA.map((criterion) => ({
      label: criterion.label,
      text: criterion.checklist,
    })),
  };
};

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
