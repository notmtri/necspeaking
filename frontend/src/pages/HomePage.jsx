import React, { memo, useEffect, useState } from 'react';
import { ArrowRight, ArrowUpRight, AudioLines, Check, Headphones, LineChart, Mic, Square, Timer, Users } from 'lucide-react';
import { CRITERIA, FOUNDER_IMAGE, HOME_FEEDBACK, HOME_STATS, SITE_OWNER_NAME, TONES, createAvatarDataUri } from '../appShared';

const achievements = [
  { label: 'IELTS', value: '8.5 overall, 9.0 Reading and Listening' },
  { label: 'SAT', value: '1550: 760 EBRW, 790 Math' },
  { label: 'Olympic 30/4 XXIX', value: 'Silver medal' },
  { label: 'NEC', value: 'Khanh Hoa NEC Team 24-25' },
];

// An example result in the shape the Analyze page returns, on the real NEC
// rubric (0.9 / 0.6 / 0.5). Labelled "Example result" wherever it shows.
const EXAMPLE_SCORES = { content: 0.75, accuracy: 0.5, delivery: 0.42 };
const EXAMPLE_TOTAL = Object.values(EXAMPLE_SCORES).reduce((sum, score) => sum + score, 0);
const EXAMPLE_QUESTION = 'Cooperative learning is the most effective approach for students to achieve academic success.';
const EXAMPLE_FEEDBACK = 'Clear position with two developed reasons. Next: vary how you open each body point.';

const EXAMPLE_QUESTIONS = [
  { paper: 'NEC 24-25', text: 'A positive attitude should be considered an invaluable asset in personal and professional relationships.' },
  { paper: 'NEC 24-25', text: 'People should adopt vegetarianism out of environmental and ethical concerns.' },
  { paper: 'NEC 23-24', text: 'Parents are supposed to respect their children’s privacy in both virtual and real worlds.' },
];

const TOOLS = [
  {
    page: 'samples',
    icon: Headphones,
    tone: 'sky',
    title: 'Samples',
    body: 'Listen to responses from ex-NEC competitors that scored 1.6 and above, with transcripts to read along.',
    action: 'Listen to samples',
  },
  {
    page: 'simulation',
    icon: Timer,
    tone: 'amber',
    title: 'Simulation',
    body: 'The real test rhythm: 60 seconds to read, 5 minutes to prepare, 5 minutes to speak, on a random past question.',
    action: 'Take a mock test',
  },
  {
    page: 'community',
    icon: Users,
    tone: 'emerald',
    title: 'Community',
    body: 'Post updates, find other candidates by username and see who is practising the most this season.',
    action: 'Open Community',
  },
  {
    page: 'profile',
    icon: LineChart,
    tone: 'violet',
    title: 'Your profile',
    body: 'Every saved attempt keeps its feedback and report, so you can compare tries at the same question.',
    action: 'See your profile',
  },
];

const ROTATE_MS = 4000;

const PRIMARY_BUTTON = 'inline-flex min-h-[52px] items-center justify-center gap-2 rounded-full bg-ink px-7 text-base font-medium text-on-ink transition-colors duration-200 hover:bg-ink/85';
const SECONDARY_BUTTON = 'inline-flex min-h-[52px] items-center justify-center gap-1.5 rounded-full border border-line bg-surface-raised px-7 text-base font-medium text-ink transition-colors duration-200 hover:bg-overlay';
const SHADOW = 'shadow-[0_24px_60px_-28px_oklch(0.45_0.08_240/0.35)] dark:shadow-[0_24px_60px_-28px_oklch(0_0_0/0.7)]';

function CriterionTile({ criterion, score }) {
  const tone = TONES[criterion.tone];
  return (
    <div className={`rounded-control px-3 py-2.5 ${tone.soft}`}>
      <dt className={`text-xs font-medium ${tone.text}`}>{criterion.label}</dt>
      <dd className="mt-0.5 text-sm font-semibold text-ink tabular">
        {score.toFixed(2)}
        <span className="text-xs font-normal text-ink-subtle"> / {criterion.max}</span>
      </dd>
    </div>
  );
}

function FloatingChip({ className = '', children }) {
  return (
    <div className={`absolute flex items-center gap-2 rounded-full border border-line bg-surface-raised py-1.5 pl-1.5 pr-3.5 text-xs font-medium text-ink shadow-[0_10px_30px_-14px_oklch(0.45_0.08_240/0.45)] dark:shadow-none ${className}`}>
      {children}
    </div>
  );
}

function ResultPreview() {
  return (
    <div className="relative mx-auto w-full max-w-[460px] lg:mr-0">
      {/* Backdrop shapes, in the accent and the delivery amber. */}
      <div className="absolute -inset-x-4 -bottom-6 top-10 rounded-[2rem] bg-sky-100 dark:bg-sky-400/10 sm:-inset-x-8" aria-hidden="true" />
      <div className="absolute -right-4 -top-8 h-28 w-28 rounded-full bg-amber-300 dark:bg-amber-400/30 sm:-right-12" aria-hidden="true" />

      <figure className={`relative rounded-panel border border-line bg-surface-raised p-5 sm:p-6 ${SHADOW}`} aria-label="Example of the feedback necs. gives">
        <div className="flex items-center justify-between gap-3 text-xs font-medium text-ink-subtle">
          <span>Example result</span>
          <span className="rounded-full bg-overlay px-2.5 py-1 text-ink-muted">NEC 24-25, Question 3</span>
        </div>
        <p className="mt-3 text-sm leading-6 text-ink">{EXAMPLE_QUESTION}</p>

        <div className="mt-5 flex items-end gap-2 border-t border-line pt-5">
          <span className="font-display text-5xl font-semibold leading-none tracking-[-0.04em] text-ink tabular">{EXAMPLE_TOTAL.toFixed(2)}</span>
          <span className="pb-1 text-sm text-ink-subtle">/ 2.0 total</span>
        </div>

        <dl className="mt-5 grid grid-cols-3 gap-2">
          {CRITERIA.map((criterion) => (
            <CriterionTile key={criterion.key} criterion={criterion} score={EXAMPLE_SCORES[criterion.key]} />
          ))}
        </dl>

        <figcaption className="mt-4 rounded-control border border-line px-3.5 py-3 text-sm leading-6 text-ink-muted">
          {EXAMPLE_FEEDBACK}
        </figcaption>
      </figure>

      <FloatingChip className="-left-3 -top-5 sm:-left-8">
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-300">
          <Check size={13} />
        </span>
        Saved to your profile
      </FloatingChip>
      <FloatingChip className="-bottom-4 right-4 sm:-right-6">
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-violet-100 text-violet-700 dark:bg-violet-400/15 dark:text-violet-300">
          <AudioLines size={13} />
        </span>
        132 words per minute
      </FloatingChip>
    </div>
  );
}

function Hero({ navTo }) {
  return (
    <section className="relative grid items-center gap-14 pb-8 pt-8 sm:pt-14 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10 lg:pt-20">
      {/* Soft colour wash behind the hero, full-bleed. */}
      <div
        className="pointer-events-none absolute left-1/2 top-[-6rem] -z-10 h-[46rem] w-screen -translate-x-1/2 opacity-90 dark:opacity-40"
        style={{
          background:
            'radial-gradient(38rem 24rem at 78% 30%, oklch(0.88 0.08 237 / 0.7), transparent 70%),'
            + 'radial-gradient(26rem 18rem at 12% 12%, oklch(0.92 0.1 85 / 0.6), transparent 70%),'
            + 'radial-gradient(30rem 20rem at 40% 95%, oklch(0.9 0.07 300 / 0.5), transparent 70%)',
        }}
        aria-hidden="true"
      />
      <div className="max-w-[640px]">
        <h1 className="rise-in text-[2.5rem] font-semibold leading-[1.08] text-ink sm:text-[3.25rem] lg:text-[3.4rem]">
          Your{' '}
          <span className="underline decoration-sky-400 decoration-[4px] underline-offset-[10px]">free</span>{' '}
          NEC speaking practice assistant
        </h1>
        <p className="rise-in mt-6 max-w-[46ch] text-lg leading-8 text-ink-muted" style={{ '--rise-index': 1 }}>
          Answer a past NEC question out loud and get scored on content, accuracy and delivery, with written feedback.
        </p>
        <div className="rise-in mt-8 flex flex-col gap-3 sm:flex-row" style={{ '--rise-index': 2 }}>
          <button type="button" onClick={() => navTo('analyze')} className={PRIMARY_BUTTON}>
            Start practising
            <ArrowRight size={18} />
          </button>
          <button type="button" onClick={() => navTo('samples')} className={SECONDARY_BUTTON}>
            Listen to samples
          </button>
        </div>
      </div>
      <div className="rise-in" style={{ '--rise-index': 3 }}>
        <ResultPreview />
      </div>
    </section>
  );
}

function StepNumber({ children, tone }) {
  return (
    <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full font-display text-sm font-semibold tabular ${TONES[tone].soft} ${TONES[tone].text}`}>
      {children}
    </span>
  );
}

function HowItWorks() {
  return (
    <section className="pt-24 sm:pt-32" aria-labelledby="how-it-works">
      <h2 id="how-it-works" className="max-w-2xl text-[2rem] font-semibold leading-[1.1] text-ink sm:text-[2.75rem]">
        From question to feedback in three steps
      </h2>

      <div className="mt-12 grid gap-4 lg:grid-cols-12">
        <article className="overflow-hidden rounded-panel border border-line bg-surface-raised lg:col-span-5">
          <div className="space-y-2 bg-sky-50 p-5 dark:bg-sky-400/10 sm:p-6">
            {EXAMPLE_QUESTIONS.map((question, index) => (
              <div
                key={question.text}
                className={`rounded-control border bg-surface-raised px-4 py-3 ${index === 0 ? 'border-sky-300 ring-4 ring-sky-100 dark:border-sky-400/40 dark:ring-sky-400/10' : 'border-sky-100 dark:border-sky-400/15'}`}
              >
                <div className="text-xs font-medium text-sky-700 dark:text-sky-300">{question.paper}</div>
                <p className="mt-1 line-clamp-2 text-sm leading-6 text-ink">{question.text}</p>
              </div>
            ))}
          </div>
          <div className="p-5 sm:p-6">
            <StepNumber tone="sky">1</StepNumber>
            <h3 className="mt-3 text-lg font-semibold text-ink">Pick a question</h3>
            <p className="mt-1.5 text-sm leading-6 text-ink-muted">Choose from 70 past NEC questions, or type the one your teacher gave you.</p>
          </div>
        </article>

        <article className="overflow-hidden rounded-panel border border-line bg-surface-raised lg:col-span-7">
          <div className="flex min-h-[214px] flex-col items-center justify-center gap-5 bg-rose-50 p-6 dark:bg-rose-400/10">
            <div className="flex items-center gap-4">
              <span className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-rose-500 text-white ring-8 ring-rose-100 dark:ring-rose-400/15">
                <Square size={20} fill="currentColor" />
              </span>
              <div>
                <div className="font-display text-3xl font-semibold tracking-[-0.03em] text-ink tabular">2:41</div>
                <div className="text-sm text-ink-muted">of 5:00 speaking time</div>
              </div>
            </div>
            <div className="h-1.5 w-full max-w-sm overflow-hidden rounded-full bg-rose-100 dark:bg-rose-400/15" aria-hidden="true">
              <div className="h-full w-[54%] rounded-full bg-rose-500" />
            </div>
          </div>
          <div className="p-5 sm:p-6">
            <StepNumber tone="rose">2</StepNumber>
            <h3 className="mt-3 text-lg font-semibold text-ink">Record your answer</h3>
            <p className="mt-1.5 text-sm leading-6 text-ink-muted">Speak straight into your phone or laptop, or upload a recording you already made.</p>
          </div>
        </article>

        <article className="grid overflow-hidden rounded-panel border border-line bg-surface-raised md:grid-cols-[1fr_1.1fr] lg:col-span-12">
          <div className="order-2 p-5 sm:p-8 md:order-1 md:self-center">
            <StepNumber tone="violet">3</StepNumber>
            <h3 className="mt-3 text-lg font-semibold text-ink">Read your feedback</h3>
            <p className="mt-1.5 max-w-md text-sm leading-6 text-ink-muted">
              A score for each part of the official rubric, comments on what to fix next, a 2.0-level sample answer to the same question and a report you can download.
            </p>
          </div>
          <dl className="order-1 grid grid-cols-3 gap-3 bg-gradient-to-br from-sky-50 via-violet-50 to-amber-50 p-5 dark:from-sky-400/10 dark:via-violet-400/10 dark:to-amber-400/10 sm:p-8 md:order-2">
            {CRITERIA.map((criterion) => (
              <div key={criterion.key} className="rounded-card border border-line bg-surface-raised p-4">
                <span className={`block h-1.5 w-8 rounded-full ${TONES[criterion.tone].fill}`} aria-hidden="true" />
                <dt className="mt-3 text-xs text-ink-subtle">{criterion.label}</dt>
                <dd className="mt-1 font-display text-2xl font-semibold tracking-[-0.03em] text-ink tabular">{EXAMPLE_SCORES[criterion.key].toFixed(2)}</dd>
                <dd className="text-xs text-ink-subtle">out of {criterion.max}</dd>
              </div>
            ))}
          </dl>
        </article>
      </div>
    </section>
  );
}

function Tools({ navTo }) {
  return (
    <section className="grid gap-10 pt-24 sm:pt-32 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16" aria-labelledby="tools">
      <div className="lg:sticky lg:top-28 lg:self-start">
        <h2 id="tools" className="text-[2rem] font-semibold leading-[1.1] text-ink sm:text-[2.75rem]">
          Everything around the practice
        </h2>
        <p className="mt-4 max-w-[42ch] text-base leading-7 text-ink-muted">
          Built by a former NEC competitor for students who prepare without a mentor beside them.
        </p>
      </div>
      <ul className="divide-y divide-line border-y border-line">
        {TOOLS.map((tool) => {
          const Icon = tool.icon;
          const tone = TONES[tool.tone];
          return (
            <li key={tool.page}>
              <button
                type="button"
                onClick={() => navTo(tool.page)}
                className="group grid w-full grid-cols-[auto_1fr] gap-x-4 gap-y-3 py-7 text-left sm:grid-cols-[auto_1fr_auto] sm:items-center sm:gap-x-6"
              >
                <span className={`inline-flex h-12 w-12 items-center justify-center rounded-card ${tone.soft} ${tone.text}`}>
                  <Icon size={22} />
                </span>
                <span>
                  <span className="block text-xl font-semibold text-ink">{tool.title}</span>
                  <span className="mt-1.5 block max-w-[52ch] text-[0.95rem] leading-7 text-ink-muted">{tool.body}</span>
                </span>
                <span className="col-start-2 inline-flex items-center gap-1.5 text-sm font-medium text-sky-700 transition-transform duration-200 group-hover:translate-x-0.5 dark:text-sky-300 sm:col-start-3">
                  {tool.action}
                  <ArrowRight size={15} />
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function Testimonials() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const current = HOME_FEEDBACK[active];
  const [usersStat, winnersStat] = HOME_STATS;

  useEffect(() => {
    setReduceMotion(Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches));
  }, []);

  // Advance every 4 s; hovering or focusing the band holds the quote so it can be read.
  useEffect(() => {
    if (paused || reduceMotion) return undefined;
    const timer = window.setTimeout(() => setActive((index) => (index + 1) % HOME_FEEDBACK.length), ROTATE_MS);
    return () => window.clearTimeout(timer);
  }, [active, paused, reduceMotion]);

  return (
    <section
      className="relative mt-24 overflow-hidden rounded-[2rem] bg-gradient-to-br from-sky-100 via-sky-50 to-violet-100 px-5 py-14 dark:from-sky-400/15 dark:via-surface-raised dark:to-violet-400/15 sm:mt-32 sm:px-12 sm:py-20"
      aria-labelledby="testimonials"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      {/* Soft cloud shapes, after the reference's sky. */}
      <div className="pointer-events-none absolute left-0 bottom-[-5rem] h-56 w-80 sm:-left-16 rounded-full bg-white/70 blur-2xl dark:bg-white/5" aria-hidden="true" />
      <div className="pointer-events-none absolute right-0 -top-16 h-48 w-72 sm:-right-10 rounded-full bg-white/60 blur-2xl dark:bg-white/5" aria-hidden="true" />

      <h2 id="testimonials" className="sr-only">What students say</h2>
      <figure key={active} className="fade-in relative mx-auto min-h-[12rem] max-w-3xl text-center sm:min-h-[11rem]">
        <blockquote className="font-display text-[1.5rem] font-medium leading-[1.35] tracking-[-0.02em] text-ink sm:text-[2rem]">
          {current.quote.replace(/^"|"$/g, '')}
        </blockquote>
        <figcaption className="mt-8 flex items-center justify-center gap-3">
          <img src={current.image || createAvatarDataUri(current.name)} alt="" className="h-11 w-11 rounded-full object-cover" />
          <span className="text-left">
            <span className="block text-sm font-semibold text-ink">{current.name}</span>
            <span className="block text-sm text-ink-muted">{current.role}</span>
          </span>
        </figcaption>
      </figure>

      <div className="relative mt-8 flex justify-center gap-2" role="group" aria-label="Choose a review">
        {HOME_FEEDBACK.map((item, index) => (
          <button
            key={item.name}
            type="button"
            onClick={() => setActive(index)}
            aria-pressed={index === active}
            aria-label={`Show ${item.name}'s review`}
            className={`relative h-2 overflow-hidden rounded-full transition-all duration-300 ${index === active ? 'w-10 bg-sky-200 dark:bg-sky-400/25' : 'w-2 bg-sky-300/70 hover:bg-sky-400 dark:bg-sky-400/30'}`}
          >
            {index === active && (
              <span
                key={`${active}-${paused}`}
                className={`absolute inset-y-0 left-0 rounded-full bg-sky-500 ${paused || reduceMotion ? 'w-full' : 'progress-fill'}`}
                style={{ '--progress-duration': `${ROTATE_MS}ms` }}
              />
            )}
          </button>
        ))}
      </div>

      <p className="relative mx-auto mt-12 max-w-2xl text-center text-sm leading-6 text-sky-900/80 dark:text-sky-100/80">
        {usersStat.value} {usersStat.label} ({usersStat.note.replace(/^Data received from /, '')}). Over half of users won the National English Competition ({winnersStat.note.replace(/^Data gathered from /, '')}).
      </p>
    </section>
  );
}

function Founder() {
  return (
    <section className="grid items-center gap-10 pt-24 sm:pt-32 md:grid-cols-[0.85fr_1.15fr] lg:gap-16" aria-labelledby="founder">
      <div className="relative max-w-md">
        <div className="absolute -bottom-4 -left-4 h-40 w-40 rounded-[2rem] bg-amber-200 dark:bg-amber-400/20" aria-hidden="true" />
        <img
          src={FOUNDER_IMAGE}
          alt={`${SITE_OWNER_NAME}, founder of necs.`}
          loading="lazy"
          className="relative aspect-[4/5] w-full rounded-panel object-cover object-[50%_30%]"
        />
      </div>
      <div>
        <h2 id="founder" className="text-[2rem] font-semibold leading-[1.1] text-ink sm:text-[2.5rem]">
          Made by a former NEC competitor
        </h2>
        <p className="mt-5 max-w-[58ch] text-base leading-7 text-ink-muted">
          I&apos;m {SITE_OWNER_NAME}. I built necs. after competing in NEC and studying academic English at Le Quy Don High School for the Gifted, so students without a mentor beside them can still practise speaking seriously.
        </p>
        <dl className="mt-8 grid gap-3 sm:grid-cols-2">
          {achievements.map((achievement, index) => {
            const tone = TONES[['sky', 'violet', 'amber', 'emerald'][index]];
            return (
              <div key={achievement.label} className={`rounded-card px-4 py-3.5 ${tone.soft}`}>
                <dt className={`text-sm font-medium ${tone.text}`}>{achievement.label}</dt>
                <dd className="mt-1 font-medium text-ink">{achievement.value}</dd>
              </div>
            );
          })}
        </dl>
      </div>
    </section>
  );
}

function FinalCall({ navTo }) {
  return (
    <section className="relative mt-24 overflow-hidden rounded-[2rem] border border-line bg-surface-raised px-5 py-16 text-center sm:mt-32 sm:py-20" aria-labelledby="start">
      <div className="pointer-events-none absolute left-0 -top-10 h-40 w-40 sm:-left-10 rounded-full bg-sky-200 dark:bg-sky-400/15" aria-hidden="true" />
      <div className="pointer-events-none absolute -bottom-12 right-0 h-48 w-48 sm:-right-6 rounded-[2.5rem] bg-violet-200 dark:bg-violet-400/15" aria-hidden="true" />
      <div className="pointer-events-none absolute bottom-10 left-[12%] hidden h-10 w-10 rounded-full bg-amber-300 dark:bg-amber-400/30 sm:block" aria-hidden="true" />
      <div className="relative">
        <h2 id="start" className="mx-auto max-w-2xl text-[2.2rem] font-semibold leading-[1.1] text-ink sm:text-[3rem]">
          Ready for your first practice?
        </h2>
        <p className="mx-auto mt-4 max-w-[48ch] text-base leading-7 text-ink-muted">
          It&apos;s free, and you can start as a guest. Scored 1.6 or above? Send your recording in and it could become a sample.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <button type="button" onClick={() => navTo('analyze')} className={PRIMARY_BUTTON}>
            <Mic size={18} />
            Start practising
          </button>
          <a href="https://www.facebook.com/notmtri/" target="_blank" rel="noopener noreferrer" className={SECONDARY_BUTTON}>
            Message me on Facebook
            <ArrowUpRight size={16} />
          </a>
        </div>
        <p className="mt-5 text-sm text-ink-subtle">
          Or email{' '}
          <a href="mailto:nguyenhoangminhtri.forwork@gmail.com" className="font-medium text-sky-700 underline-offset-4 hover:underline dark:text-sky-300">
            nguyenhoangminhtri.forwork@gmail.com
          </a>
        </p>
      </div>
    </section>
  );
}

const HomePage = memo(function HomePage({ navTo }) {
  return (
    <div className="min-w-0 pb-4">
      <Hero navTo={navTo} />
      <HowItWorks />
      <Tools navTo={navTo} />
      <Testimonials />
      <Founder />
      <FinalCall navTo={navTo} />
    </div>
  );
});

export default HomePage;
