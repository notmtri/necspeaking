/* Presenter tour. Each step says what to open in each version:
   P = proposal as written, R = with suggested changes.
   who: persona to view as (null = sign-in screen), go: route, hl: element to highlight. */
const TOUR = [
  { t: 'Two versions of one platform', say: 'Left: the proposal exactly as written. Right: the same platform with eight suggested changes. Every person, school and provider in the demo is fictional.',
    P: { who: null }, R: { who: null } },
  { t: 'A new faculty member’s first screen', say: 'As written, Sofia can only sign in once her VinUni account exists, which is after she arrives. In the revised version, HR sends her an invitation link when she signs her contract, weeks before she lands, when housing and schools are being decided.',
    P: { who: 'sofia', go: 'home', hl: '.hero' }, R: { who: 'sofia', go: 'home', hl: '.hero' } },
  { t: 'Partners and families', say: 'Erik, Sofia’s partner, does the school visits and house hunting. As written, he can’t sign in at all. The revised version gives him a guest account linked to Sofia’s, with no access to the faculty directory.',
    P: { who: 'erik', go: 'home', hl: '.entra' }, R: { who: 'erik', go: 'home', hl: '.hero' } },
  { t: 'Getting started', say: 'As written, onboarding is a four-step checklist after arrival. The revised version adds an arrival plan timed to the arrival date, shared by Sofia and Erik, with each step linked to the right guide.',
    P: { who: 'sofia', go: 'home', hl: '.card' }, R: { who: 'erik', go: 'arrival', hl: '.steps' } },
  { t: 'Finding a buddy', say: 'Both versions suggest 3–5 buddies with a transparent score, and spread the load so the same people aren’t always picked. In the pilot, a coordinator confirms every match by hand.',
    P: { who: 'sofia', go: 'match', hl: '.flow' }, R: { who: 'sofia', go: 'match', hl: '.flow' } },
  { t: 'Where conversations happen', say: 'Ten separate forums spread a small community thin. The revised version has one Ask & Discuss stream with topic tags. A topic gets its own space once it is busy.',
    P: { who: 'james', go: 'forums' }, R: { who: 'james', go: 'qa' } },
  { t: 'Working with WhatsApp and Zalo', say: 'Faculty already chat in these groups. Instead of competing with them, the revised version posts a weekly digest there and lets moderators save good answers here, so they can be found later.',
    P: { who: 'james', go: 'home' }, R: { who: 'james', go: 'home', hl: '.chg-box' } },
  { t: 'Privacy and consent', say: 'Both versions keep family information private by default. The revised version records consent for each field, as Vietnam’s Personal Data Protection Law and Decree 13 require, and lets people download or delete their data.',
    P: { who: 'sofia', go: 'profile', hl: '#famfields' }, R: { who: 'sofia', go: 'profile', hl: '#famfields' } },
  { t: 'Measuring the pilot', say: 'The proposal’s dashboard counts activity. The revised version adds four outcome targets for a one-semester pilot, with a decision at the end: expand, adjust or stop.',
    P: { who: 'linh', go: 'admin/overview' }, R: { who: 'linh', go: 'admin/overview', hl: '.chg-box' } },
  { t: 'Technology', say: 'Both use the same Microsoft stack. The pilot starts on Dataverse for Teams or Microsoft Lists, which most licences already include, and moves to full Dataverse only if the pilot meets its targets.',
    P: { who: 'linh', go: 'admin/architecture' }, R: { who: 'linh', go: 'admin/architecture', hl: '.chg-box' } },
  { t: 'What a pilot would need', say: 'An owning office (Faculty Affairs?), a licence check with IT, a privacy review, and 5–10 volunteer buddies for one semester. Everything else in the demo can follow.',
    P: { who: 'linh', go: 'home' }, R: { who: 'linh', go: 'home' } },
];
