/* ------------------------------------------------------------------
   Mock data. Every person, provider and school here is fictional.
   Neighbourhood names and public emergency numbers are real.
------------------------------------------------------------------- */

// The demo story is set on 15 October 2026. The tester build (DEMO_LIVE_DATE) runs on the
// real date instead, and app.js shifts every sample date by the same number of days.
const STORY_DAY = new Date('2026-10-15T09:00:00');
const TODAY = typeof DEMO_LIVE_DATE !== 'undefined' && DEMO_LIVE_DATE ? (() => { const d = new Date(); d.setHours(9, 0, 0, 0); return d; })() : STORY_DAY;
const UNI = { name: 'VinUniversity', short: 'VinUni' };

const COLLEGES = {
  CECS: 'College of Engineering & Computer Science',
  CBM: 'College of Business & Management',
  CHS: 'College of Health Sciences',
  CAS: 'College of Arts & Sciences',
};

const HELP_TOPICS = ['Schools', 'Housing', 'Banking', 'Health insurance', 'Medical care', 'Food markets', 'Transportation', 'Sports', 'Settling in Hanoi'];
const AREAS = ['Ocean Park', 'Ecopark', 'Long Biên', 'Tây Hồ', 'Hoàn Kiếm', 'Undecided'];
const KID_RANGES = ['0–2', '3–6', '7–10', '11–14', '15–18'];

const INTEREST_TAGS = ['Running', 'Hiking', 'Cycling', 'Football', 'Tennis', 'Pickleball', 'Swimming', 'Golf', 'Yoga', 'Book club', 'Cooking', 'Photography', 'Chess', 'Ceramics', 'Travel', 'Music', 'Board games', 'Family activities', 'Rugby', 'Basketball'];

const AVATAR_TONES = ['#1B3F86', '#8A1C2B', '#0F6B5C', '#7A4E12', '#4B3A8C', '#2E5E8C', '#8C3A5E', '#3F6B2E'];

// buddy: { available, max, base } — base = buddies outside this demo's match list
const FACULTY = [
  { id: 'sofia', first: 'Sofia', last: 'Lindqvist', title: 'Assistant Professor', college: 'CECS', expertise: ['Machine learning', 'Fairness in AI'], interests: ['Running', 'Hiking', 'Book club', 'Cooking'], languages: ['Swedish', 'English', 'German'], regions: ['Nordics', 'Western Europe'], country: 'Sweden', helpTopics: [], wantsHelp: ['Schools', 'Housing', 'Health insurance', 'Banking'], buddy: { available: false, max: 0, base: 0 }, contact: 'Teams', phone: '+84 90 000 1101', phoneVis: 'me', family: { partner: true, kids: ['7–10', '11–14'], vis: 'match' }, area: 'Undecided', years: 0, joined: '2026-10-01', isNew: true, complete: 72, photo: true },
  { id: 'james', first: 'James', last: 'Okafor', title: 'Senior Lecturer', college: 'CBM', expertise: ['Corporate finance', 'Emerging markets'], interests: ['Football', 'Running', 'Travel'], languages: ['English', 'Yoruba'], regions: ['UK', 'West Africa'], country: 'United Kingdom', helpTopics: ['Banking', 'Housing', 'Settling in Hanoi'], wantsHelp: [], buddy: { available: true, max: 2, base: 0 }, contact: 'WhatsApp', phone: '+84 90 000 2202', phoneVis: 'faculty', family: { partner: true, kids: ['11–14'], vis: 'match' }, area: 'Ocean Park', years: 3, joined: '2023-08-14', complete: 96, moderator: ['housing'], updated: '2025-11-02' },
  { id: 'priya', first: 'Priya', last: 'Raman', title: 'Associate Professor', college: 'CHS', expertise: ['Epidemiology', 'Global health'], interests: ['Yoga', 'Cooking', 'Music'], languages: ['English', 'Tamil', 'Hindi'], regions: ['South Asia'], country: 'India', helpTopics: ['Health insurance', 'Medical care', 'Food markets'], wantsHelp: [], buddy: { available: true, max: 2, base: 1 }, contact: 'Teams', phoneVis: 'me', family: { partner: true, kids: [], vis: 'me' }, area: 'Ecopark', years: 4, joined: '2022-08-01', complete: 90, moderator: ['health'] },
  { id: 'mateo', first: 'Mateo', last: 'Fernández', title: 'Lecturer', college: 'CAS', expertise: ['Sociolinguistics', 'Language policy'], interests: ['Book club', 'Travel', 'Photography'], languages: ['Spanish', 'Portuguese', 'English', 'Vietnamese'], regions: ['Southern Europe', 'Latin America'], country: 'Spain', helpTopics: ['Settling in Hanoi', 'Transportation'], wantsHelp: [], buddy: { available: true, max: 1, base: 0 }, contact: 'Email', phoneVis: 'me', family: { partner: false, kids: [], vis: 'me' }, area: 'Hoàn Kiếm', years: 5, joined: '2021-09-01', complete: 88 },
  { id: 'hannah', first: 'Hannah', last: 'Becker', title: 'Assistant Professor', college: 'CECS', expertise: ['Robotics', 'Control systems'], interests: ['Cycling', 'Hiking', 'Family activities'], languages: ['German', 'English'], regions: ['Western Europe'], country: 'Germany', helpTopics: ['Schools', 'Settling in Hanoi'], wantsHelp: [], buddy: { available: true, max: 2, base: 0 }, contact: 'Teams', phone: '+84 90 000 3303', phoneVis: 'faculty', family: { partner: true, kids: ['7–10'], vis: 'match' }, area: 'Ocean Park', years: 2, joined: '2024-08-05', complete: 94 },
  { id: 'daniel', first: 'Daniel', last: 'Kim', title: 'Associate Professor', college: 'CBM', expertise: ['Consumer behaviour', 'Digital marketing'], interests: ['Golf', 'Cooking'], languages: ['English', 'Korean'], regions: ['East Asia', 'North America'], country: 'United States', helpTopics: ['Food markets'], wantsHelp: [], buddy: { available: true, max: 1, base: 0 }, contact: 'Teams', phoneVis: 'me', family: { partner: true, kids: ['3–6'], vis: 'faculty' }, area: 'Ocean Park', years: 3, joined: '2023-08-14', complete: 81 },
  { id: 'aisha', first: 'Aisha', last: 'Rahman', title: 'Lecturer', college: 'CHS', expertise: ['Nursing education', 'Maternal health'], interests: ['Family activities', 'Swimming'], languages: ['English', 'Bengali', 'French'], regions: ['South Asia', 'North America'], country: 'Canada', helpTopics: ['Medical care', 'Schools'], wantsHelp: [], buddy: { available: false, max: 0, base: 0 }, contact: 'Email', phoneVis: 'me', family: { partner: true, kids: ['3–6', '7–10'], vis: 'faculty' }, area: 'Ocean Park', years: 2, joined: '2024-01-08', complete: 77 },
  { id: 'lucas', first: 'Lucas', last: 'Moreau', title: 'Assistant Professor', college: 'CECS', expertise: ['Cybersecurity', 'Cryptography'], interests: ['Tennis', 'Music'], languages: ['French', 'English'], regions: ['Western Europe'], country: 'France', helpTopics: ['Housing'], wantsHelp: [], buddy: { available: true, max: 2, base: 1 }, contact: 'Teams', phoneVis: 'me', family: { partner: false, kids: [], vis: 'me' }, area: 'Tây Hồ', years: 3, joined: '2023-01-09', complete: 85 },
  { id: 'emily', first: 'Emily', last: 'Carter', title: 'Associate Professor', college: 'CAS', expertise: ['Developmental psychology'], interests: ['Book club', 'Yoga', 'Family activities'], languages: ['English'], regions: ['North America'], country: 'United States', helpTopics: ['Schools', 'Settling in Hanoi'], wantsHelp: [], buddy: { available: true, max: 1, base: 0 }, contact: 'Teams', phoneVis: 'me', family: { partner: true, kids: ['11–14'], vis: 'match' }, area: 'Ocean Park', years: 4, joined: '2022-08-01', complete: 92 },
  { id: 'kenji', first: 'Kenji', last: 'Watanabe', title: 'Lecturer', college: 'CECS', expertise: ['Computer vision', 'Embedded AI'], interests: ['Running', 'Photography'], languages: ['Japanese', 'English'], regions: ['East Asia'], country: 'Japan', helpTopics: ['Transportation', 'Sports'], wantsHelp: [], buddy: { available: true, max: 2, base: 0 }, contact: 'Teams', phoneVis: 'me', family: { partner: false, kids: [], vis: 'me' }, area: 'Ocean Park', years: 2, joined: '2024-08-05', complete: 89 },
  { id: 'olivia', first: 'Olivia', last: 'Nguyen-Smith', title: 'Senior Lecturer', college: 'CBM', expertise: ['Accounting', 'Public finance'], interests: ['Pickleball', 'Board games'], languages: ['English', 'Vietnamese'], regions: ['Oceania', 'Southeast Asia'], country: 'Australia', helpTopics: ['Banking'], wantsHelp: [], buddy: { available: true, max: 1, base: 0 }, contact: 'Zalo', phoneVis: 'faculty', phone: '+84 90 000 4404', family: { partner: true, kids: [], vis: 'me' }, area: 'Long Biên', years: 6, joined: '2020-09-01', complete: 91 },
  { id: 'rafael', first: 'Rafael', last: 'Costa', title: 'Assistant Professor', college: 'CHS', expertise: ['Biomedical engineering'], interests: ['Football', 'Swimming'], languages: ['Portuguese', 'English', 'Spanish'], regions: ['Latin America'], country: 'Brazil', helpTopics: ['Sports'], wantsHelp: [], buddy: { available: false, max: 0, base: 0 }, contact: 'WhatsApp', phoneVis: 'me', family: { partner: false, kids: [], vis: 'me' }, area: 'Ocean Park', years: 1, joined: '2025-08-11', complete: 64 },
  { id: 'ingrid', first: 'Ingrid', last: 'Haugen', title: 'Associate Professor', college: 'CAS', expertise: ['Environmental science', 'Climate adaptation'], interests: ['Hiking', 'Travel', 'Running'], languages: ['Norwegian', 'English', 'Swedish'], regions: ['Nordics'], country: 'Norway', helpTopics: ['Settling in Hanoi'], wantsHelp: [], buddy: { available: true, max: 2, base: 2 }, contact: 'Teams', phoneVis: 'me', family: { partner: true, kids: [], vis: 'me' }, area: 'Tây Hồ', years: 4, joined: '2022-08-01', complete: 87 },
  { id: 'pieter', first: 'Pieter', last: 'de Vries', title: 'Lecturer', college: 'CECS', expertise: ['Data systems', 'Distributed databases'], interests: ['Cycling', 'Board games'], languages: ['Dutch', 'English', 'German'], regions: ['Western Europe'], country: 'Netherlands', helpTopics: ['Transportation'], wantsHelp: [], buddy: { available: true, max: 1, base: 0 }, contact: 'Teams', phoneVis: 'me', family: { partner: true, kids: ['3–6'], vis: 'match' }, area: 'Ecopark', years: 1, joined: '2025-08-11', complete: 70 },
  { id: 'grace', first: 'Grace', last: 'Achieng', title: 'Lecturer', college: 'CBM', expertise: ['Entrepreneurship', 'Innovation policy'], interests: ['Running', 'Music'], languages: ['English', 'Swahili'], regions: ['East Africa'], country: 'Kenya', helpTopics: ['Food markets'], wantsHelp: [], buddy: { available: false, max: 0, base: 0 }, contact: 'WhatsApp', phoneVis: 'me', family: { partner: false, kids: [], vis: 'me' }, area: 'Long Biên', years: 2, joined: '2024-08-05', complete: 58 },
  { id: 'michael', first: 'Michael', last: "O'Brien", title: 'Senior Lecturer', college: 'CAS', expertise: ['Southeast Asian history'], interests: ['Book club', 'Music', 'Board games'], languages: ['English', 'Irish', 'Vietnamese'], regions: ['UK', 'Western Europe'], country: 'Ireland', helpTopics: ['Settling in Hanoi'], wantsHelp: [], buddy: { available: true, max: 1, base: 1 }, contact: 'Email', phoneVis: 'me', family: { partner: false, kids: [], vis: 'me' }, area: 'Hoàn Kiếm', years: 7, joined: '2019-08-19', complete: 83, updated: '2025-09-01' },
  { id: 'wei', first: 'Wei', last: 'Chen', title: 'Assistant Professor', college: 'CECS', expertise: ['Computer networks', 'Edge computing'], interests: ['Pickleball', 'Cooking'], languages: ['English', 'Mandarin', 'Malay'], regions: ['Southeast Asia', 'East Asia'], country: 'Singapore', helpTopics: ['Food markets', 'Sports'], wantsHelp: [], buddy: { available: true, max: 1, base: 0 }, contact: 'Teams', phoneVis: 'me', family: { partner: true, kids: [], vis: 'me' }, area: 'Ocean Park', years: 2, joined: '2024-08-05', complete: 86 },
  { id: 'laura', first: 'Laura', last: 'Rossi', title: 'Associate Professor', college: 'CHS', expertise: ['Pharmacology'], interests: ['Cooking', 'Ceramics'], languages: ['Italian', 'English', 'French'], regions: ['Southern Europe'], country: 'Italy', helpTopics: ['Food markets'], wantsHelp: [], buddy: { available: false, max: 0, base: 0 }, contact: 'Teams', phoneVis: 'me', family: { partner: true, kids: ['15–18'], vis: 'faculty' }, area: 'Tây Hồ', years: 3, joined: '2023-08-14', complete: 80 },
  { id: 'samuel', first: 'Samuel', last: 'Mensah', title: 'Lecturer', college: 'CBM', expertise: ['Development economics'], interests: ['Football', 'Basketball'], languages: ['English', 'Twi'], regions: ['West Africa', 'North America'], country: 'Ghana', helpTopics: [], wantsHelp: ['Banking'], buddy: { available: false, max: 0, base: 0 }, contact: 'WhatsApp', phoneVis: 'me', family: { partner: false, kids: [], vis: 'me' }, area: 'Ocean Park', years: 1, joined: '2025-08-11', complete: 61 },
  { id: 'anna', first: 'Anna', last: 'Kowalska', title: 'Assistant Professor', college: 'CAS', expertise: ['Applied mathematics', 'Optimisation'], interests: ['Chess', 'Family activities'], languages: ['Polish', 'English'], regions: ['Central Europe'], country: 'Poland', helpTopics: ['Schools'], wantsHelp: [], buddy: { available: true, max: 1, base: 0 }, contact: 'Teams', phoneVis: 'me', family: { partner: true, kids: ['0–2', '3–6'], vis: 'match' }, area: 'Ocean Park', years: 2, joined: '2024-08-05', complete: 79 },
  { id: 'david', first: 'David', last: 'Abrams', title: 'Assistant Professor', college: 'CECS', expertise: ['Human–computer interaction'], interests: ['Photography', 'Running'], languages: ['English', 'French'], regions: ['North America'], country: 'Canada', helpTopics: [], wantsHelp: ['Housing', 'Schools'], buddy: { available: false, max: 0, base: 0 }, contact: 'Teams', phoneVis: 'me', family: { partner: true, kids: ['7–10'], vis: 'match' }, area: 'Ocean Park', years: 0, joined: '2026-08-10', isNew: true, complete: 74 },
  { id: 'fatima', first: 'Fatima', last: 'Al-Sayed', title: 'Associate Professor', college: 'CHS', expertise: ['Public health', 'Health systems'], interests: ['Swimming', 'Family activities'], languages: ['Arabic', 'English', 'French'], regions: ['Middle East', 'UK'], country: 'Egypt', helpTopics: ['Schools', 'Food markets'], wantsHelp: [], buddy: { available: true, max: 2, base: 0 }, contact: 'WhatsApp', phoneVis: 'me', family: { partner: true, kids: ['3–6'], vis: 'match' }, area: 'Ocean Park', years: 3, joined: '2023-08-14', complete: 88 },
  { id: 'ryan', first: 'Ryan', last: 'Mitchell', title: 'Lecturer', college: 'CAS', expertise: ['Condensed matter physics'], interests: ['Hiking', 'Rugby', 'Travel'], languages: ['English'], regions: ['Oceania'], country: 'New Zealand', helpTopics: ['Sports'], wantsHelp: [], buddy: { available: false, max: 0, base: 0 }, contact: 'Teams', phoneVis: 'me', family: { partner: false, kids: [], vis: 'me' }, area: 'Long Biên', years: 1, joined: '2025-08-11', complete: 55 },
  { id: 'mei', first: 'Mei', last: 'Tanaka', title: 'Assistant Professor', college: 'CBM', expertise: ['Operations management', 'Supply chains'], interests: ['Yoga', 'Ceramics', 'Photography'], languages: ['Japanese', 'English'], regions: ['East Asia'], country: 'Japan', helpTopics: ['Settling in Hanoi'], wantsHelp: [], buddy: { available: true, max: 1, base: 0 }, contact: 'Teams', phoneVis: 'me', family: { partner: false, kids: [], vis: 'me' }, area: 'Ecopark', years: 2, joined: '2024-08-05', complete: 84 },
  { id: 'noah', first: 'Noah', last: 'Fischer', title: 'Assistant Professor', college: 'CAS', expertise: ['Political philosophy'], interests: ['Football', 'Chess'], languages: ['German', 'French', 'English'], regions: ['Western Europe'], country: 'Switzerland', helpTopics: [], wantsHelp: ['Banking', 'Housing'], buddy: { available: false, max: 0, base: 0 }, contact: 'Teams', phoneVis: 'me', family: { partner: false, kids: [], vis: 'me' }, area: 'Ocean Park', years: 0, joined: '2026-08-10', isNew: true, complete: 68 },
  { id: 'marcus', first: 'Marcus', last: 'Lee', title: 'Assistant Professor', college: 'CBM', expertise: ['Behavioural economics'], interests: ['Golf', 'Basketball'], languages: ['English', 'Cantonese'], regions: ['North America', 'East Asia'], country: 'United States', helpTopics: [], wantsHelp: ['Housing', 'Food markets'], buddy: { available: false, max: 0, base: 0 }, contact: 'Teams', phoneVis: 'me', family: { partner: false, kids: [], vis: 'me' }, area: 'Undecided', years: 0, joined: '2026-10-05', isNew: true, complete: 45 },
  { id: 'yasmin', first: 'Yasmin', last: 'Haddad', title: 'Lecturer', college: 'CHS', expertise: ['Physiotherapy'], interests: ['Swimming', 'Yoga'], languages: ['Arabic', 'French', 'English'], regions: ['Middle East', 'Western Europe'], country: 'Lebanon', helpTopics: [], wantsHelp: ['Health insurance', 'Schools'], buddy: { available: false, max: 0, base: 0 }, contact: 'WhatsApp', phoneVis: 'me', family: { partner: true, kids: ['3–6'], vis: 'match' }, area: 'Undecided', years: 0, joined: '2026-10-08', isNew: true, complete: 52 },
];

// People who are not in the faculty directory
const OTHERS = [
  { id: 'erik', first: 'Erik', last: 'Lindqvist', title: 'Partner of Dr. Sofia Lindqvist', guest: true, partnerOf: 'sofia', email: 'erik.lindqvist@example.se', interests: ['Cooking', 'Cycling', 'Family activities'], languages: ['Swedish', 'English'] },
  { id: 'tom', first: 'Tom', last: 'Becker', title: 'Partner of Dr. Hannah Becker', guest: true, partnerOf: 'hannah' },
  { id: 'linh', first: 'Linh', last: 'Trần', title: 'Faculty Affairs Officer', staff: true, email: 'linh.tran@vinuni.example' },
  { id: 'hr', first: 'HR', last: 'Benefits Team', title: 'Human Resources', staff: true, official: true },
  { id: 'io', first: 'International', last: 'Office', title: 'International Office', staff: true, official: true },
];

const PERSONAS = [
  { id: 'sofia', role: 'faculty', label: 'New faculty', blurb: { proposal: 'Joined CECS on 1 October with her partner and two children. Still looking for a home and a school.', revised: 'Signed her contract; arrives 9 November with her partner and two children. Has an invitation link before her VinUni account exists.' } },
  { id: 'james', role: 'faculty', label: 'Established faculty', blurb: { proposal: 'Three years at CBM, lives in Ocean Park, moderates the Housing forum and volunteers as a buddy.', revised: 'Three years at CBM, lives in Ocean Park, volunteers as a buddy and answers housing questions.' } },
  { id: 'erik', role: 'partner', label: 'Partner / spouse', blurb: { proposal: "Sofia's partner. Handles school visits and house hunting while Sofia teaches. Has no VinUni account.", revised: "Sofia's partner, with a guest account linked to hers. Handles school visits and house hunting." } },
  { id: 'linh', role: 'admin', label: 'Platform administrator', blurb: { proposal: 'Faculty Affairs. Approves matches, moderates content, manages categories and accounts.', revised: 'Faculty Affairs. Runs the pilot: matches buddies by hand, invites new hires, tracks the pilot metrics.' } },
];

/* ---------- Forums (§5) — in the revised version these become topic tags ---------- */
const FORUMS = [
  { id: 'schools', name: 'Finding the Right Schools for Your Children', short: 'Schools', desc: 'School options, admissions, curricula, transport, fees and parent experiences.', mod: 'emily', icon: 'book', disclaimer: null },
  { id: 'housing', name: 'Finding the Right Realtor and Home', short: 'Housing', desc: 'Neighbourhoods, commuting, apartment and house searches, realtors, leases and utilities.', mod: 'james', icon: 'home', disclaimer: 'Faculty recommendations are not official VinUniversity endorsements of any realtor, landlord or property.' },
  { id: 'health', name: 'Medical and Health Insurance', short: 'Health & insurance', desc: 'Insurance for partners and dependents, clinics, hospitals and situations outside standard benefits.', mod: 'priya', icon: 'shield', disclaimer: 'Peer discussion only. For your actual benefits, see the official HR guide “Health insurance & dependents”.' },
  { id: 'food', name: 'International Food Markets', short: 'Food', desc: 'Ingredients from home, specialty stores, markets and delivery.', mod: 'laura', icon: 'star', disclaimer: null },
  { id: 'sports', name: 'Sports Forum', short: 'Sports', desc: 'Running, tennis, football, pickleball, swimming, cycling, gyms, hiking and informal teams.', mod: 'kenji', icon: 'activity', disclaimer: null },
  { id: 'books', name: 'Book Club', short: 'Book club', desc: 'Monthly selections, discussion dates, suggestions and voting.', mod: 'emily', icon: 'book', disclaimer: null },
  { id: 'banking', name: 'Banking and Personal Finance Logistics', short: 'Banking', desc: 'Opening accounts, international transfers, cards, ATMs and payment apps.', mod: 'olivia', icon: 'tag', disclaimer: 'Peer comments are not financial advice. Check fees and terms with the provider.' },
  { id: 'weekend', name: 'Weekend Activities', short: 'Weekend', desc: 'Day trips, cultural events, family outings, restaurants, museums and travel ideas.', mod: 'mateo', icon: 'map', disclaimer: null },
  { id: 'newto', name: 'New to Hanoi', short: 'New to Hanoi', desc: 'General onboarding questions that do not fit another category.', mod: 'michael', icon: 'globe', disclaimer: null },
  { id: 'buysell', name: 'Buy / Sell / Give Away', short: 'Buy / sell', desc: 'Furniture and household items. Optional future forum, subject to university policy.', mod: null, icon: 'swap', disclaimer: null, future: true },
];
const PARTNER_TAG = { id: 'partners', short: 'Partners & families', name: 'Partners & families', desc: 'For partners and family members: language classes, jobs, friendships, life while your partner teaches.' };

const THREADS = [
  { id: 't1', forum: 'schools', title: 'Bilingual or full IB for a 9-year-old arriving mid-year?', author: 'david', date: '2026-10-09', body: 'Our daughter is 9 and has only been taught in English and French. We are choosing between a bilingual Vietnamese–English school near Ocean Park and an IB school in Tây Hồ (longer commute). Has anyone moved a child mid-year? How hard was it to settle in?', replies: [
    { author: 'hannah', date: '2026-10-09', body: 'Our son started at a bilingual school in Ocean Park in January. The first month was hard. The school gave him a buddy and extra English–Vietnamese support, and by March he was fine. The short commute made a huge difference to our family life.' },
    { author: 'emily', date: '2026-10-10', body: 'Ask both schools about their mid-year intake support. One IB school I know runs a two-week transition programme. Also check whether the IB school runs a bus to Ocean Park. Most charge for it separately.' }] },
  { id: 't2', forum: 'schools', title: 'Which schools actually run buses to Ocean Park?', author: 'fatima', date: '2026-09-28', body: 'Trying to confirm which schools have a bus stop inside Ocean Park and not just “nearby”. Any up-to-date experience?', replies: [
    { author: 'james', date: '2026-09-29', body: 'Red River International picks up at two points inside the development. The West Lake British School bus stops at the main gate, about 50 minutes each way at rush hour.' }] },
  { id: 't3', forum: 'schools', title: 'Mid-year admissions: documents to prepare before you arrive', author: 'emily', date: '2026-08-20', pinned: true, body: 'Collected from several families: passports, previous two years of school reports (translated if not in English), vaccination records, birth certificates, and a letter from the previous school. Some schools also ask for an entrance assessment, which can usually be done online before arrival.', replies: [
    { author: 'aisha', date: '2026-08-21', body: 'Add: medical history for children with allergies. Our school nurse asked for it on day one.' },
    { author: 'anna', date: '2026-08-25', body: 'For kindergarten, some schools ask for a short video call with the child. Worth asking early.' }] },
  { id: 't4', forum: 'housing', title: 'Ocean Park vs. Tây Hồ for a family that commutes every day', author: 'david', date: '2026-10-12', body: 'Tây Hồ has more international restaurants and schools, but the commute looks long. How do you all weigh this up?', replies: [
    { author: 'lucas', date: '2026-10-12', body: 'I live in Tây Hồ and love it, but it is 45–60 minutes each way in traffic. For a family with a school run as well, I would not do it.' },
    { author: 'james', date: '2026-10-13', body: 'Ocean Park: 10 minutes to campus, lots of families, parks. You trade some atmosphere for about 1.5 hours a day back. Happy to show you around on a weekend.' }] },
  { id: 't5', forum: 'housing', title: 'Realtor experiences: please share the good and the bad', author: 'james', date: '2026-07-03', pinned: true, body: 'Moderator thread. Please share realtor experiences, including what went wrong. Please do not post phone numbers of private individuals publicly. Use the Recommendations page or message people directly.', replies: [
    { author: 'pieter', date: '2026-07-10', body: 'Good experience with Ms. Hoa at Lotus Home Realty. She showed us 6 places in Ecopark in one morning and negotiated the deposit down to one month.' },
    { author: 'grace', date: '2026-08-02', body: 'Be careful with listings that show furniture that is not included. Ask for a written inventory before signing.' },
    { author: 'ryan', date: '2026-08-15', body: 'One agent asked for a “holding fee” in cash before showing us anything. We walked away. Never pay before you have seen the place and the contract.' }] },
  { id: 't6', forum: 'housing', title: 'Is a 12-month lease with two months’ deposit normal?', author: 'marcus', date: '2026-10-14', body: 'First apartment offer in Ocean Park: 12-month lease, two months’ deposit, rent paid quarterly in advance. Is this standard, and is any of it negotiable?', replies: [] },
  { id: 't7', forum: 'health', title: 'Insurance for a partner who isn’t employed by VinUni', author: 'yasmin', date: '2026-10-13', body: 'My husband will not work here at first. Is he covered under my plan, or do we need to buy separate insurance? HR pointed me to a PDF but it’s unclear about spouses.', replies: [
    { author: 'priya', date: '2026-10-13', body: 'From my experience (not official advice): check the dependants section of your benefits summary. Some plans let you add a spouse at your own cost during the first 30 days only. HR is running an insurance Q&A on 29 October that is worth joining.' }] },
  { id: 't8', forum: 'health', title: 'Which hospitals have English-speaking paediatricians?', author: 'aisha', date: '2026-09-15', body: 'Looking for a paediatrician who speaks English for routine check-ups and the occasional fever at 2am.', replies: [
    { author: 'fatima', date: '2026-09-16', body: 'Red River Family Clinic in Long Biên has two English-speaking paediatricians and a 24h line.' },
    { author: 'priya', date: '2026-09-17', body: 'Adding: save the clinic’s emergency number before you need it. In an emergency, the public ambulance number is 115.' }] },
  { id: 't9', forum: 'food', title: 'Where to find rye flour and Nordic baking supplies?', author: 'ingrid', date: '2026-09-30', body: 'I would trade a lot for proper rye bread. Anyone found rye flour, cardamom in bulk, or fresh yeast?', replies: [
    { author: 'laura', date: '2026-09-30', body: 'West Lake Imports in Tây Hồ has rye flour most weeks. Fresh yeast you have to ask for at the counter.' },
    { author: 'wei', date: '2026-10-01', body: 'Cardamom pods in bulk are cheap at the spice stalls in Long Biên market.' }] },
  { id: 't10', forum: 'food', title: 'Korean grocery delivery that reaches Gia Lâm', author: 'daniel', date: '2026-08-28', body: 'Sharing: Seoul Mart takes orders by Zalo and delivers to Ocean Park on Tuesdays and Fridays.', replies: [
    { author: 'kenji', date: '2026-08-29', body: 'They also have Japanese rice and miso. Thanks!' }] },
  { id: 't11', forum: 'food', title: 'Halal butchers east of the river?', author: 'fatima', date: '2026-10-05', body: 'Any reliable halal butcher or supermarket section on the Long Biên / Gia Lâm side?', replies: [
    { author: 'grace', date: '2026-10-06', body: 'The large supermarket in Long Biên has a small halal-certified section in the frozen aisle. Ask the staff, it is not labelled clearly.' }] },
  { id: 't12', forum: 'sports', title: 'Pickleball at Ocean Park: beginners welcome on Wednesdays', author: 'wei', date: '2026-10-01', body: 'We play every Wednesday at 18:00 at the courts in Park 2. Paddles to borrow. All levels.', replies: [
    { author: 'olivia', date: '2026-10-02', body: 'Can confirm, very friendly. I had never played before September.' },
    { author: 'samuel', date: '2026-10-03', body: 'I’ll come next week.' }] },
  { id: 't13', forum: 'sports', title: 'Anyone up for a half marathon in December?', author: 'kenji', date: '2026-10-08', body: 'Thinking of a training group for a December half marathon. Saturday long runs from campus, 06:00 to beat the heat.', replies: [
    { author: 'grace', date: '2026-10-08', body: 'In! I have been looking for a running group.' }] },
  { id: 't14', forum: 'books', title: 'Vote for November’s book', author: 'emily', date: '2026-10-10', body: 'October: “The Sympathizer”, meeting 22 October. Vote for November below: (1) “The Sorrow of War” (2) “Dust Child” (3) “Paradise of the Blind”.', replies: [
    { author: 'michael', date: '2026-10-10', body: '(1). It’s essential reading for anyone living here.' },
    { author: 'mateo', date: '2026-10-11', body: '(3) for me.' },
    { author: 'ingrid', date: '2026-10-12', body: '(1) as well.' }] },
  { id: 't15', forum: 'banking', title: 'Opening a bank account before your residence card arrives?', author: 'david', date: '2026-09-20', body: 'HR says my temporary residence card will take 4–6 weeks. Can I open an account with just a passport and work permit?', replies: [
    { author: 'olivia', date: '2026-09-20', body: 'Some banks will open a basic account with passport + visa + employment letter, then upgrade once the card arrives. Bring the HR letter, it makes all the difference.' },
    { author: 'james', date: '2026-09-21', body: 'Do it in week 1. Almost everything here is paid by QR code from a bank app.' }] },
  { id: 't16', forum: 'banking', title: 'Cheapest way to send money home every month?', author: 'samuel', date: '2026-10-11', body: 'I send part of my salary home each month. Bank wire fees are adding up. What do others use?', replies: [
    { author: 'olivia', date: '2026-10-11', body: 'Compare the total cost (fee + exchange-rate margin), not just the fee. A multi-currency account was cheapest for me, but check what your home bank allows. Not financial advice!' }] },
  { id: 't17', forum: 'weekend', title: 'Day trip ideas under 2 hours from Gia Lâm', author: 'mateo', date: '2026-09-26', body: 'Let’s build a list. Mine: Bát Tràng ceramics village (20 min), Đường Lâm ancient village, Ba Vì for hiking.', replies: [
    { author: 'ingrid', date: '2026-09-27', body: 'Ba Vì is lovely in October–November. Go early, it’s busy by 10.' },
    { author: 'mei', date: '2026-09-28', body: 'Bát Tràng with kids: book a pottery workshop, they love it.' }] },
  { id: 't18', forum: 'weekend', title: 'Ninh Bình in November: weather and where to stay?', author: 'ryan', date: '2026-10-14', body: 'Planning a long weekend in mid-November. Is it worth staying two nights? Any homestays people liked?', replies: [] },
  { id: 't19', forum: 'newto', title: 'What I wish I’d known in my first month', author: 'michael', date: '2026-08-15', pinned: true, body: 'A thread for newcomers. Add yours! Mine: get a local SIM at the airport, install Grab before you land, and don’t try to do everything in week one.', replies: [
    { author: 'hannah', date: '2026-08-15', body: 'Bring passport photos. Lots of paperwork wants them.' },
    { author: 'kenji', date: '2026-08-16', body: 'Rainy season is real. Buy a proper poncho, not an umbrella.' },
    { author: 'fatima', date: '2026-08-18', body: 'Say yes to every invitation in your first month, even when you are tired.' },
    { author: 'james', date: '2026-08-20', body: 'Find your buddy and actually call them. Most of us are happy to help.' }] },
  { id: 't20', forum: 'newto', title: 'Grab or Xanh SM for the daily commute?', author: 'yasmin', date: '2026-10-02', body: 'Is one more reliable for an 8am class from Long Biên?', replies: [
    { author: 'kenji', date: '2026-10-02', body: 'Both are fine. Book 10 minutes earlier than you think you need at 7:30–8:00.' }] },
  { id: 't21', forum: 'newto', title: 'Getting a SIM / eSIM on arrival', author: 'marcus', date: '2026-10-13', body: 'Should I sort this at the airport or wait?', replies: [
    { author: 'wei', date: '2026-10-13', body: 'Airport is easiest; they register it with your passport on the spot.' }] },
  // Revised version only
  { id: 't22', forum: 'health', revOnly: true, source: 'zalo', title: 'Pharmacies near campus that open late', author: 'priya', date: '2026-10-07', body: 'Saved from the Faculty Zalo group by a moderator so it can be searched later. Summary: two pharmacies at the Ocean Park main gate are open until 22:00, and one inside the S2 towers is open 24h.', replies: [
    { author: 'aisha', date: '2026-10-07', body: 'The 24h one has a pharmacist who speaks good English.' }] },
  { id: 't23', forum: 'partners', revOnly: true, title: 'Partners: anyone want to start a Vietnamese language group?', author: 'tom', date: '2026-10-06', body: 'I’m Hannah’s partner. A few of us at home during the day would love a weekly beginner Vietnamese class and coffee. Anyone interested?', replies: [
    { author: 'emily', date: '2026-10-07', body: 'My husband would love this. I’ll pass it on!' }] },
];

const REPORTS = [
  { id: 'r1', thread: 't5', replyIdx: null, reason: 'Phone number of a private individual posted in a reply', by: 'grace', date: '2026-10-12', status: 'open', excerpt: '“…call Mr. Tuấn directly on 09xx xxx xxx, he can also…”' },
  { id: 'r2', thread: 't16', replyIdx: null, reason: 'Possible paid promotion of a money-transfer service', by: 'samuel', date: '2026-10-13', status: 'open', excerpt: '“Use my referral code for 0 fees on your first transfer…”' },
];

/* ---------- Living in Hanoi guides (§3, SharePoint knowledge base) ---------- */
const GUIDES = [
  { id: 'g1', title: 'Your first week in Hanoi', cat: 'Settling in Hanoi', source: 'official', owner: 'io', reviewed: '2026-08-01', next: '2027-02-01', mins: 6, summary: 'A day-by-day checklist from landing at Nội Bài to your first payday.', sections: [
    { h: 'Before you land', body: '<ul><li>Install a ride-hailing app (Grab or Xanh SM) and a translation app with offline Vietnamese.</li><li>Bring passport photos (4×6 cm), printed copies of your contract and degree certificates.</li><li>Tell HR your flight number. VinUni can arrange airport pickup.</li></ul>' },
    { h: 'Days 1–3', body: '<ul><li>Buy a SIM or eSIM at the airport. It is registered to your passport on the spot.</li><li>Check in with HR for your work permit and residence card paperwork.</li><li>Collect your staff card and sign in to your VinUniversity account.</li></ul>' },
    { h: 'Days 4–7', body: '<ul><li>Open a bank account. Bring your passport, visa and HR employment letter.</li><li>Meet your buddy for coffee.</li><li>Walk around campus and Ocean Park, and find your nearest pharmacy and clinic.</li></ul>' },
    { h: 'Who to contact', body: '<p><b>HR</b> for contract, payroll, insurance and residence paperwork. <b>International Office</b> for visas and family visas. <b>IT</b> for accounts. This community is for everything else.</p>' }] },
  { id: 'g2', title: 'Choosing where to live', cat: 'Housing', source: 'faculty', owner: 'james', reviewed: '2026-03-10', next: '2026-09-10', mins: 8, summary: 'Neighbourhoods compared by commute, schools and atmosphere, plus how leases work.', sections: [
    { h: 'Neighbourhoods at a glance', body: '<table class="tbl"><thead><tr><th>Area</th><th>Commute to campus</th><th>Good for</th></tr></thead><tbody><tr><td>Ocean Park</td><td>5–15 min</td><td>Families, short commute, parks</td></tr><tr><td>Ecopark</td><td>20–30 min</td><td>Green space, quieter, houses</td></tr><tr><td>Long Biên</td><td>25–35 min</td><td>Local life, value, markets</td></tr><tr><td>Tây Hồ</td><td>45–60 min</td><td>International restaurants, lake, nightlife</td></tr><tr><td>Hoàn Kiếm</td><td>35–50 min</td><td>Old Quarter, culture, walking city</td></tr></tbody></table>' },
    { h: 'Leases and deposits', body: '<p>Most leases are 12 months, with one to two months’ deposit and rent paid monthly or quarterly. Everything is negotiable, especially the deposit and furniture. Get a written inventory before signing.</p>' },
    { h: 'Red flags', body: '<ul><li>Cash “holding fees” before a viewing.</li><li>No written contract, or a contract in Vietnamese only with no translation.</li><li>Furniture in photos that is “not included”.</li></ul>' }] },
  { id: 'g3', title: 'International and bilingual schools', cat: 'Schools', source: 'faculty', owner: 'emily', reviewed: '2026-07-15', next: '2027-01-15', mins: 7, summary: 'How the curricula differ, when to apply, and how the commute affects your choice.', sections: [
    { h: 'Curricula you will see', body: '<ul><li><b>IB</b> (PYP/MYP/DP): inquiry-based, internationally portable.</li><li><b>British</b> (IGCSE/A-Level): structured, exam-focused.</li><li><b>American</b>: AP courses, US-style transcripts.</li><li><b>Bilingual Vietnamese–English</b>: closer to campus, lower fees, strong integration.</li></ul>' },
    { h: 'When to apply', body: '<p>Apply as soon as you sign your contract. Mid-year places exist but are limited, especially for ages 7–10. Most schools can run assessments online before you arrive.</p>' },
    { h: 'Fees and allowances', body: '<p>Fees vary widely. Check your contract for any education allowance and ask HR what documents they need for reimbursement.</p>' }] },
  { id: 'g4', title: 'Opening a bank account', cat: 'Banking', source: 'official', owner: 'hr', reviewed: '2026-06-01', next: '2026-12-01', mins: 4, summary: 'What to bring, which documents HR provides, and how payments work in daily life.', sections: [
    { h: 'What to bring', body: '<ul><li>Passport with valid visa</li><li>Employment confirmation letter from HR</li><li>Temporary residence card (if you already have it)</li></ul>' },
    { h: 'Paying day to day', body: '<p>Most payments use QR codes from a banking app, including street food, taxis and rent. Set up your app on day one.</p>' },
    { h: 'Sending money abroad', body: '<p>International transfers need supporting documents (such as a payslip or contract). Ask your bank which documents it needs for regular transfers.</p>' }] },
  { id: 'g5', title: 'Health insurance and dependants', cat: 'Health insurance', source: 'official', owner: 'hr', reviewed: '2025-09-20', next: '2026-09-20', mins: 5, summary: 'What your university plan covers, how to add family members, and emergency numbers.', sections: [
    { h: 'Your plan', body: '<p>Sample content: see your benefits summary for inpatient, outpatient and dental limits. Keep your insurance card on your phone.</p>' },
    { h: 'Covering a partner and children', body: '<p>Sample content: dependants can be added during the enrolment window after you join. Contact HR Benefits within your first 30 days.</p>' },
    { h: 'Emergency numbers', body: '<table class="tbl"><tbody><tr><td>Ambulance</td><td><b>115</b></td></tr><tr><td>Police</td><td><b>113</b></td></tr><tr><td>Fire</td><td><b>114</b></td></tr></tbody></table>' }] },
  { id: 'g6', title: 'Medical care in Hanoi', cat: 'Medical care', source: 'faculty', owner: 'priya', reviewed: '2026-05-02', next: '2026-11-02', mins: 6, summary: 'International clinics, public hospitals, pharmacies and paediatric care, from faculty experience.', sections: [
    { h: 'Clinics vs. hospitals', body: '<p>International clinics have English-speaking staff and direct billing with many insurers. Large public hospitals are excellent for specialist care but expect queues and Vietnamese-only paperwork. Bring a Vietnamese-speaking friend.</p>' },
    { h: 'Pharmacies', body: '<p>Pharmacies are everywhere and many medicines are sold without prescription. Ask for the active ingredient, not the brand.</p>' }] },
  { id: 'g7', title: 'Getting around', cat: 'Transportation', source: 'faculty', owner: 'kenji', reviewed: '2026-09-01', next: '2027-03-01', mins: 4, summary: 'Ride-hailing, motorbikes, cycling and getting to Nội Bài airport.', sections: [
    { h: 'Ride-hailing', body: '<p>Grab and Xanh SM both work well. At peak times (07:30–08:30, 17:00–18:30) book 10 minutes early.</p>' },
    { h: 'Airport', body: '<p>Nội Bài is 45–60 minutes from campus. Pre-book a car for early flights.</p>' }] },
  { id: 'g8', title: 'International food and groceries', cat: 'Food markets', source: 'faculty', owner: 'laura', reviewed: '2026-04-10', next: '2026-10-10', mins: 5, summary: 'Where faculty find ingredients from home, from supermarkets to Zalo-order delivery.', sections: [
    { h: 'Supermarkets', body: '<p>Large supermarkets in Ocean Park and Long Biên carry imported basics. Specialty items are cheaper at import stores in Tây Hồ.</p>' },
    { h: 'Ordering by Zalo', body: '<p>Many small importers take orders through Zalo and deliver on fixed days. See the Recommendations page for current ones.</p>' }] },
];

/* ---------- Recommendations (§3) ---------- */
const RECS = [
  { id: 'rc1', name: 'Lotus Home Realty: Ms. Hoa', cat: 'Housing', by: 'james', date: '2026-08-12', confirms: 4, commercial: true, notes: 'Patient with families, fluent English, did not push long leases. Covers Ocean Park and Ecopark.' },
  { id: 'rc2', name: 'Red River Family Clinic (Long Biên)', cat: 'Medical care', by: 'priya', date: '2026-06-02', confirms: 6, commercial: true, notes: 'Two English-speaking paediatricians, 24h phone line, direct billing with several insurers.' },
  { id: 'rc3', name: 'West Lake Imports: European deli', cat: 'Food markets', by: 'laura', date: '2025-11-20', confirms: 3, commercial: true, notes: 'Rye flour, cheeses, cured meats. Ask at the counter for fresh yeast.' },
  { id: 'rc4', name: 'Seoul Mart (orders by Zalo)', cat: 'Food markets', by: 'daniel', date: '2026-05-15', confirms: 2, commercial: true, notes: 'Korean and Japanese groceries delivered to Ocean Park on Tuesdays and Fridays.' },
  { id: 'rc5', name: 'Ocean Park pickleball courts (Park 2)', cat: 'Sports', by: 'wei', date: '2026-09-30', confirms: 5, commercial: false, notes: 'Free public courts. The faculty group plays Wednesdays at 18:00.' },
  { id: 'rc6', name: 'Mr. Tuấn: English-speaking driver for airport runs', cat: 'Transportation', by: 'kenji', date: '2025-08-01', confirms: 1, commercial: true, notes: 'Reliable for 5am flights. Book two days ahead.' },
  { id: 'rc7', name: 'Hanoi Tennis Academy: weekend kids’ classes', cat: 'Sports', by: 'lucas', date: '2026-02-10', confirms: 2, commercial: true, notes: 'Small groups, coaches speak English and French.' },
  { id: 'rc8', name: 'Little Lotus Kindergarten (bilingual)', cat: 'Schools', by: 'anna', date: '2026-07-01', confirms: 3, commercial: true, notes: 'Ages 2–6, warm staff, 10 minutes from campus.' },
  { id: 'rc9', name: 'Using a multi-currency account for transfers', cat: 'Banking', by: 'olivia', date: '2026-09-05', confirms: 4, commercial: false, finance: true, notes: 'Compare total cost (fee + exchange margin). Worked out cheapest for my monthly transfers.' },
  { id: 'rc10', name: 'Bát Tràng pottery workshops', cat: 'Weekend', by: 'mei', date: '2026-04-20', confirms: 7, commercial: true, notes: '20 minutes from campus. Great with children; book a table for a family.' },
  { id: 'rc11', name: 'Old Quarter Books: English section', cat: 'Weekend', by: 'michael', date: '2025-09-01', confirms: 1, commercial: true, notes: 'Second-hand English novels and Vietnamese history in translation.' },
  { id: 'rc12', name: 'Green Leaf Dental', cat: 'Medical care', by: 'aisha', date: '2026-01-15', confirms: 2, commercial: true, notes: 'English-speaking dentist, clear prices up front.' },
];

/* ---------- Events (§3) ---------- */
const EVENTS = [
  { id: 'e1', title: 'New Faculty Welcome Mixer', date: '2026-10-16', time: '17:30', loc: 'Faculty Lounge, Building A', cat: 'Social', by: 'io', official: true, cap: 60, going: ['james', 'hannah', 'mateo', 'priya', 'david', 'noah', 'marcus', 'yasmin', 'wei', 'emily', 'olivia'], desc: 'Meet colleagues across all four colleges. Partners welcome. Light dinner provided.' },
  { id: 'e2', title: 'Book Club: “The Sympathizer”', date: '2026-10-22', time: '19:00', loc: 'Lotus Café, Ocean Park', cat: 'Cultural', by: 'emily', cap: 14, going: ['emily', 'michael', 'mateo', 'ingrid', 'priya', 'anna'], desc: 'October discussion. New members welcome, even if you have not finished the book.' },
  { id: 'e3', title: 'Sunday hike: Ba Vì National Park', date: '2026-10-25', time: '06:30', loc: 'Departs from the campus main gate', cat: 'Weekend', by: 'ingrid', cap: 20, going: ['ingrid', 'ryan', 'kenji', 'hannah', 'grace', 'mateo', 'pieter'], desc: 'Moderate 4-hour hike. We share two minivans; around 250,000 VND per person.' },
  { id: 'e4', title: 'Health insurance Q&A with HR', date: '2026-10-29', time: '12:00', loc: 'Online (Teams)', cat: 'Official', by: 'hr', official: true, cap: 100, going: ['yasmin', 'david', 'marcus', 'samuel', 'noah'], desc: 'HR Benefits explains coverage for partners and dependants. Bring your questions.' },
  { id: 'e5', title: 'Kids’ Halloween party', date: '2026-10-31', time: '16:00', loc: 'Clubhouse, Ocean Park S1', cat: 'Family', by: 'hannah', cap: 40, going: ['hannah', 'aisha', 'fatima', 'anna', 'daniel', 'david'], desc: 'Costumes, games and a pumpkin-carving table. Each family brings a snack.' },
  { id: 'e6', title: 'Long Biên market food walk', date: '2026-11-01', time: '08:00', loc: 'Long Biên market entrance', cat: 'Cultural', by: 'laura', cap: 12, going: ['laura', 'wei', 'priya', 'grace'], desc: 'A morning walk through the market with a Vietnamese-speaking colleague. Learn what to buy and how.' },
  { id: 'e7', title: 'Pickleball Wednesdays', date: '2026-10-21', time: '18:00', loc: 'Park 2 courts, Ocean Park', cat: 'Sports', by: 'wei', cap: 16, weekly: true, going: ['wei', 'olivia', 'samuel', 'james'], desc: 'All levels. Paddles to borrow.' },
  { id: 'e8', title: 'Saturday Running Club', date: '2026-10-17', time: '06:00', loc: 'Campus main gate', cat: 'Sports', by: 'kenji', cap: 30, weekly: true, going: ['kenji', 'grace', 'james', 'ingrid'], desc: '5 km and 10 km groups. Half-marathon training from November.' },
  { id: 'e9', title: 'Bát Tràng ceramics trip', date: '2026-11-08', time: '09:00', loc: 'Bát Tràng village (shared transport)', cat: 'Family', by: 'mei', cap: 16, going: ['mei', 'laura', 'anna', 'hannah', 'aisha'], desc: 'Pottery workshop for adults and children, then lunch in the village.' },
  { id: 'e10', title: 'Old Quarter walking tour', date: '2026-11-15', time: '15:00', loc: 'Hoàn Kiếm Lake, north end', cat: 'Cultural', by: 'mateo', cap: 15, going: ['mateo', 'michael'], desc: 'History, architecture and street food, with a historian (Michael) as guide.' },
  { id: 'e11', title: '5-a-side football', date: '2026-10-23', time: '18:00', loc: 'Campus sports field', cat: 'Sports', by: 'james', cap: 14, weekly: true, going: ['james', 'rafael', 'samuel', 'noah', 'ryan'], desc: 'Friendly game every Friday. Bring water.' },
  { id: 'e12', title: 'Thanksgiving potluck', date: '2026-11-26', time: '18:30', loc: 'Faculty Lounge, Building A', cat: 'Social', by: 'emily', cap: 50, going: ['emily', 'daniel', 'david', 'aisha'], desc: 'Everyone is welcome. Bring a dish from your home country.' },
  { id: 'e0', title: 'Mid-Autumn lantern evening', date: '2026-09-25', time: '18:00', loc: 'Campus central lawn', cat: 'Cultural', by: 'io', official: true, cap: 200, going: ['james', 'hannah', 'mei', 'kenji', 'anna'], desc: 'Mooncakes, lanterns and a lion dance.' },
];

/* ---------- Matching (§6) ---------- */
const FACTORS = [
  { key: 'college', label: 'College / professional field', w: 3 },
  { key: 'culture', label: 'Country, language or cultural familiarity', w: 2 },
  { key: 'family', label: 'Family / life stage', w: 2 },
  { key: 'hobbies', label: 'Hobbies and sports', w: 2 },
  { key: 'help', label: 'Help topics', w: 3 },
  { key: 'area', label: 'Location / commute (broad area)', w: 1 },
];

// status: requested → introduced → checkin_due → active | rematch | declined
const MATCHES = [
  { id: 'm1', seeker: 'david', buddy: 'kenji', status: 'active', created: '2026-07-28', intro: '2026-07-30', checkin: '2026-08-20', checkinResult: 'Going well', score: 71 },
  { id: 'm2', seeker: 'noah', buddy: 'james', status: 'checkin_due', created: '2026-08-12', intro: '2026-08-14', checkin: '2026-10-16', score: 68 },
  { id: 'm3', seeker: 'marcus', buddy: 'daniel', status: 'requested', created: '2026-10-13', score: 74 },
  { id: 'm4', seeker: 'yasmin', buddy: 'fatima', status: 'requested', created: '2026-10-14', score: 81 },
];

/* ---------- Notifications (Power Automate flows in §8) ---------- */
const NOTIFS = [
  { id: 'n1', to: 'sofia', date: '2026-10-14', auto: true, text: 'Complete your profile (72%) to get better buddy suggestions.', go: 'profile' },
  { id: 'n2', to: 'sofia', date: '2026-10-12', auto: true, text: 'Welcome to the International Faculty Community! Start with “Your first week in Hanoi”.', go: 'guide/g1' },
  { id: 'n3', to: 'james', date: '2026-10-14', auto: true, text: '2-week check-in due for your buddy Noah Fischer.', go: 'match' },
  { id: 'n4', to: 'james', date: '2026-10-13', auto: false, text: 'Lucas Moreau replied in “Ocean Park vs. Tây Hồ…”.', go: 'thread/t4' },
  { id: 'n5', to: 'james', date: '2026-10-02', auto: true, text: 'Your profile was last confirmed 11 months ago. Please review it.', go: 'profile' },
  { id: 'n6', to: 'linh', date: '2026-10-14', auto: true, text: '2 buddy-match requests are waiting for confirmation.', go: 'admin/matching' },
  { id: 'n7', to: 'linh', date: '2026-10-13', auto: true, text: '2 posts were reported for moderation.', go: 'admin/moderation' },
  { id: 'n8', to: 'linh', date: '2026-10-12', auto: true, text: 'Some resources have passed their review date.', go: 'admin/content' },
  { id: 'n9', to: 'erik', date: '2026-10-14', auto: true, text: 'Welcome, Erik. Sofia added you as her partner. You can now see community Q&A, guides and events.', go: 'home' },
];

const FLOWS = [
  { id: 'f1', name: 'New-faculty onboarding', trigger: 'New account created in Entra ID', action: 'Sends welcome message, onboarding checklist and buddy-request link', on: true, last: '2026-10-08', runs: 14 },
  { id: 'f2', name: 'Profile update reminder', trigger: 'Profile not confirmed for 12 months', action: 'Asks the faculty member to review and confirm their profile', on: true, last: '2026-10-02', runs: 37 },
  { id: 'f3', name: 'Match introduction', trigger: 'Administrator confirms a match', action: 'Sends both people an introduction with profiles and suggested first meeting', on: true, last: '2026-08-14', runs: 9 },
  { id: 'f4', name: 'Match check-in', trigger: '3 weeks after introduction', action: 'Asks the new faculty member how it is going; offers a re-match', on: true, last: '2026-10-14', runs: 7 },
  { id: 'f5', name: 'Unanswered question alert', trigger: 'Post has no reply after 48 hours', action: 'Notifies the forum moderator and faculty who list that help topic', on: true, last: '2026-10-14', runs: 22 },
  { id: 'f6', name: 'Event notifications', trigger: 'New event in a followed category', action: 'Notifies interested faculty; sends reminder 24h before', on: true, last: '2026-10-15', runs: 61 },
  { id: 'f7', name: 'Resource review reminder', trigger: 'Guide or recommendation reaches review date', action: 'Asks the owner to confirm or update; flags to admins after 14 days', on: true, last: '2026-10-12', runs: 18 },
  { id: 'f8', name: 'Leaver deactivation', trigger: 'HR marks an employee as leaving in Entra ID', action: 'Disables access on the last working day; hides the profile', on: true, last: '2026-09-30', runs: 3 },
  { id: 'f9', name: 'Pre-arrival invitation', trigger: 'HR records a signed contract', action: 'Emails a personal invitation link to the new hire’s personal address with guest access until their account starts', on: true, last: '2026-10-09', runs: 6, rev: true },
  { id: 'f10', name: 'Weekly digest to chat groups', trigger: 'Every Monday 08:00', action: 'Posts the week’s new answers, events and unanswered questions to the faculty WhatsApp and Zalo groups', on: true, last: '2026-10-12', runs: 11, rev: true },
  { id: 'f11', name: 'Consent expiry check', trigger: 'Consent for optional data older than 24 months', action: 'Asks the person to renew or withdraw consent; hides the field until they answer', on: true, last: '2026-10-01', runs: 2, rev: true },
];

const AUDIT = [
  { date: '2026-10-14 16:02', who: 'linh', what: 'Approved event “Health insurance Q&A with HR”' },
  { date: '2026-10-13 10:41', who: 'james', what: 'Pinned thread “Realtor experiences: please share the good and the bad”' },
  { date: '2026-10-12 09:15', who: 'system', what: 'Resource review reminder sent for 3 items' },
  { date: '2026-10-08 14:30', who: 'linh', what: 'Created forum category “Book Club”, moderator Emily Carter' },
  { date: '2026-09-30 18:00', who: 'system', what: 'Deactivated 1 account (leaver sync from Entra ID)' },
];

const USERS_EXTRA = [
  { name: 'Thomas Grant', college: 'CAS', status: 'leaving', leaveDate: '2026-10-31', role: 'Faculty User' },
  { name: 'Sara Holm', college: 'CBM', status: 'leaving', leaveDate: '2026-12-20', role: 'Faculty User' },
];

const INVITES = [
  { id: 'i1', name: 'Sofia Lindqvist', email: 's.lindqvist@example.se', college: 'CECS', start: '2026-11-09', sent: '2026-09-22', status: 'Active guest', partner: 'Erik Lindqvist' },
  { id: 'i2', name: 'Ahmed Karimi', email: 'a.karimi@example.org', college: 'CHS', start: '2027-01-05', sent: '2026-10-09', status: 'Invited, not opened', partner: null },
  { id: 'i3', name: 'Julia Santos', email: 'j.santos@example.br', college: 'CAS', start: '2026-12-01', sent: '2026-10-01', status: 'Active guest', partner: null },
];

const CONSENTS = [
  { who: 'sofia', field: 'Partner / family information', purpose: 'Buddy matching only', given: '2026-09-23', status: 'Given' },
  { who: 'sofia', field: 'Children’s age ranges', purpose: 'Buddy matching only', given: '2026-09-23', status: 'Given' },
  { who: 'james', field: 'Partner / family information', purpose: 'Buddy matching only', given: '2024-11-02', status: 'Given' },
  { who: 'hannah', field: 'Phone number', purpose: 'Visible to faculty', given: '2025-02-11', status: 'Given' },
  { who: 'anna', field: 'Children’s age ranges', purpose: 'Buddy matching only', given: '2024-09-01', status: 'Given' },
  { who: 'aisha', field: 'Children’s age ranges', purpose: 'Visible to faculty', given: '2024-02-01', status: 'Withdrawn 2026-06-30' },
  { who: 'erik', field: 'Guest profile (name, email)', purpose: 'Partner guest account', given: '2026-10-14', status: 'Given' },
];

const ARRIVAL_PLAN = [
  { id: 'a1', when: '8 weeks before', title: 'Choose a neighbourhood', link: 'guide/g2', done: true },
  { id: 'a2', when: '7 weeks before', title: 'Shortlist schools and book online assessments', link: 'guide/g3', done: true },
  { id: 'a3', when: '6 weeks before', title: 'Meet your buddy on a video call', link: 'match', done: false, auto: 'match' },
  { id: 'a4', when: '5 weeks before', title: 'Ask HR how to add your partner and children to insurance', link: 'guide/g5', done: false },
  { id: 'a5', when: '3 weeks before', title: 'Book temporary housing for the first two weeks', link: 'guide/g2', done: true },
  { id: 'a6', when: '2 weeks before', title: 'Join the faculty WhatsApp / Zalo group', link: 'home', done: false },
  { id: 'a7', when: '1 week before', title: 'Install Grab and a translation app; arrange an eSIM', link: 'guide/g7', done: false },
  { id: 'a8', when: 'Arrival week', title: 'Open a bank account (bring the HR letter)', link: 'guide/g4', done: false },
  { id: 'a9', when: 'Arrival week', title: 'Coffee with your buddy and a walk around Ocean Park', link: 'match', done: false },
];

const WAU = [38, 41, 44, 40, 52, 58, 61, 57, 63, 66, 71, 74]; // weekly active users, last 12 weeks
