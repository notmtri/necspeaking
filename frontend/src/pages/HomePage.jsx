import React, { memo, useState } from 'react';
import { ArrowRight, ArrowUpRight, Check, Mic, Square } from 'lucide-react';
import { FOUNDER_IMAGE, HOME_FEEDBACK, HOME_STATS, SITE_OWNER_NAME } from '../appShared';

const achievements = [
  { label: 'IELTS', value: '8.5 overall, 9.0 Reading and Listening' },
  { label: 'SAT', value: '1550: 760 EBRW, 790 Math' },
  { label: 'Olympic 30/4 XXIX', value: 'Silver medal' },
  { label: 'NEC', value: 'Khanh Hoa NEC Team 24-25' },
];

// An example result in the shape the Analyze page returns; the criteria and
// maxima are the real NEC rubric (0.9 / 0.6 / 0.5).
const EXAMPLE_RESULT = {
  question: 'Cooperative learning is the most effective approach for students to achieve academic success.',
  criteria: [
    { label: 'Content', score: 0.75, max: 0.9 },
    { label: 'Accuracy', score: 0.5, max: 0.6 },
    { label: 'Delivery', score: 0.42, max: 0.5 },
  ],
  feedback: 'Clear position with two developed reasons. Next: vary how you open each body point.',
};

const EXAMPLE_QUESTIONS = [
  { paper: 'NEC 24-25', text: 'A positive attitude should be considered an invaluable asset in personal and professional relationships.' },
  { paper: 'NEC 24-25', text: 'People should adopt vegetarianism out of environmental and ethical concerns.' },
  { paper: 'NEC 23-24', text: 'Parents are supposed to respect their children’s privacy in both virtual and real worlds.' },
];

const TOOLS = [
  {
    page: 'samples',
    title: 'Samples',
    body: 'Listen to responses from ex-NEC competitors that scored 1.6 and above, with transcripts to read along.',
    action: 'Listen to samples',
  },
  {
    page: 'simulation',
    title: 'Simulation',
    body: 'The real test rhythm: 60 seconds to read, 5 minutes to prepare, 5 minutes to speak, on a random past question.',
    action: 'Take a mock test',
  },
  {
    page: 'community',
    title: 'Community',
    body: 'Post updates, find other candidates by username and see who is practising the most this season.',
    action: 'Open Community',
  },
  {
    page: 'profile',
    title: 'Your profile',
    body: 'Every saved attempt keeps its feedback and report, so you can compare tries at the same question.',
    action: 'See your profile',
  },
];

const testimonials = HOME_FEEDBACK.filter((item) => item.image);
const total = EXAMPLE_RESULT.criteria.reduce((sum, criterion) => sum + criterion.score, 0);

function ResultPreview() {
  return (
    <div className="relative mx-auto w-full max-w-[460px] lg:mr-0">
      <div className="absolute -inset-x-4 -bottom-6 top-10 rounded-[2rem] bg-sky-100/70 sm:-inset-x-8" aria-hidden="true" />

      <figure
        className="relative rounded-panel border border-line bg-surface-raised p-5 shadow-[0_24px_60px_-28px_oklch(0.45_0.08_240/0.35)] sm:p-6"
        aria-label="Example of the feedback necs. gives"
      >
        <div className="flex items-center justify-between gap-3 text-xs font-medium text-ink-subtle">
          <span>Example result</span>
          <span className="rounded-full bg-overlay px-2.5 py-1 text-ink-muted">NEC 24-25, Question 3</span>
        </div>
        <p className="mt-3 text-sm leading-6 text-ink">{EXAMPLE_RESULT.question}</p>

        <div className="mt-5 flex items-end gap-2 border-t border-line pt-5">
          <span className="font-display text-5xl font-semibold leading-none tracking-[-0.04em] text-ink tabular">{total.toFixed(2)}</span>
          <span className="pb-1 text-sm text-ink-subtle">/ 2.0 total</span>
        </div>

        <dl className="mt-5 grid grid-cols-3 gap-2">
          {EXAMPLE_RESULT.criteria.map((criterion) => (
            <div key={criterion.label} className="rounded-control bg-surface-sunken px-3 py-2.5">
              <dt className="text-xs text-ink-subtle">{criterion.label}</dt>
              <dd className="mt-0.5 text-sm font-semibold text-ink">
                {criterion.score.toFixed(2)}
                <span className="font-normal text-ink-subtle"> / {criterion.max}</span>
              </dd>
            </div>
          ))}
        </dl>

        <figcaption className="mt-4 rounded-control bg-sky-50 px-3.5 py-3 text-sm leading-6 text-sky-900">
          {EXAMPLE_RESULT.feedback}
        </figcaption>
      </figure>

      <div className="absolute -left-3 -top-5 flex items-center gap-2 rounded-full border border-line bg-surface-raised py-1.5 pl-1.5 pr-3.5 text-xs font-medium text-ink shadow-[0_10px_30px_-14px_oklch(0.45_0.08_240/0.45)] sm:-left-8">
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
          <Check size={13} />
        </span>
        Saved to your profile
      </div>
    </div>
  );
}

function Hero({ navTo }) {
  return (
    <section className="grid items-center gap-14 pb-8 pt-8 sm:pt-14 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10 lg:pt-20">
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
          <button
            type="button"
            onClick={() => navTo('analyze')}
            className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-full bg-ink px-7 text-base font-medium text-white transition-colors duration-200 hover:bg-ink/85"
          >
            Start practising
            <ArrowRight size={18} />
          </button>
          <button
            type="button"
            onClick={() => navTo('samples')}
            className="inline-flex min-h-[52px] items-center justify-center rounded-full border border-line bg-surface-raised px-7 text-base font-medium text-ink transition-colors duration-200 hover:bg-overlay"
          >
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

function StepNumber({ children }) {
  return <span className="font-display text-sm font-medium text-ink-subtle tabular">{children}</span>;
}

function HowItWorks() {
  return (
    <section className="pt-24 sm:pt-32" aria-labelledby="how-it-works">
      <h2 id="how-it-works" className="max-w-2xl text-[2rem] font-semibold leading-[1.1] text-ink sm:text-[2.75rem]">
        From question to feedback in three steps
      </h2>

      <div className="mt-12 grid gap-4 lg:grid-cols-12">
        <article className="overflow-hidden rounded-panel border border-line bg-surface-raised lg:col-span-5">
          <div className="space-y-2 bg-sky-50 p-5 sm:p-6">
            {EXAMPLE_QUESTIONS.map((question) => (
              <div key={question.text} className="rounded-control border border-sky-100 bg-surface-raised px-4 py-3">
                <div className="text-xs font-medium text-sky-700">{question.paper}</div>
                <p className="mt-1 line-clamp-2 text-sm leading-6 text-ink">{question.text}</p>
              </div>
            ))}
          </div>
          <div className="p-5 sm:p-6">
            <StepNumber>01</StepNumber>
            <h3 className="mt-2 text-lg font-semibold text-ink">Pick a question</h3>
            <p className="mt-1.5 text-sm leading-6 text-ink-muted">Choose from 70 past NEC questions, or type the one your teacher gave you.</p>
          </div>
        </article>

        <article className="overflow-hidden rounded-panel border border-line bg-surface-raised lg:col-span-7">
          <div className="flex min-h-[214px] flex-col items-center justify-center gap-5 bg-surface-sunken p-6">
            <div className="flex items-center gap-4">
              <span className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-rose-500 text-white ring-8 ring-rose-100">
                <Square size={20} fill="currentColor" />
              </span>
              <div>
                <div className="font-display text-3xl font-semibold tracking-[-0.03em] text-ink tabular">2:41</div>
                <div className="text-sm text-ink-subtle">of 5:00 speaking time</div>
              </div>
            </div>
            <div className="h-1.5 w-full max-w-sm overflow-hidden rounded-full bg-overlay-hover" aria-hidden="true">
              <div className="h-full w-[54%] rounded-full bg-sky-500" />
            </div>
          </div>
          <div className="p-5 sm:p-6">
            <StepNumber>02</StepNumber>
            <h3 className="mt-2 text-lg font-semibold text-ink">Record your answer</h3>
            <p className="mt-1.5 text-sm leading-6 text-ink-muted">Speak straight into your phone or laptop, or upload a recording you already made.</p>
          </div>
        </article>

        <article className="grid overflow-hidden rounded-panel border border-line bg-surface-raised md:grid-cols-[1fr_1.1fr] lg:col-span-12">
          <div className="order-2 p-5 sm:p-8 md:order-1 md:self-center">
            <StepNumber>03</StepNumber>
            <h3 className="mt-2 text-lg font-semibold text-ink">Read your feedback</h3>
            <p className="mt-1.5 max-w-md text-sm leading-6 text-ink-muted">
              A score for each part of the official rubric, comments on what to fix next, a 2.0-level sample answer to the same question and a report you can download.
            </p>
          </div>
          <div className="order-1 grid grid-cols-3 gap-3 bg-sky-50 p-5 sm:p-8 md:order-2">
            {EXAMPLE_RESULT.criteria.map((criterion) => (
              <div key={criterion.label} className="rounded-card border border-sky-100 bg-surface-raised p-4">
                <div className="text-xs text-ink-subtle">{criterion.label}</div>
                <div className="mt-2 font-display text-2xl font-semibold tracking-[-0.03em] text-ink tabular">{criterion.score.toFixed(2)}</div>
                <div className="text-xs text-ink-subtle">out of {criterion.max}</div>
              </div>
            ))}
          </div>
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
        {TOOLS.map((tool) => (
          <li key={tool.page}>
            <button
              type="button"
              onClick={() => navTo(tool.page)}
              className="group grid w-full gap-2 py-7 text-left sm:grid-cols-[1fr_auto] sm:items-center sm:gap-8"
            >
              <span>
                <span className="block text-xl font-semibold text-ink">{tool.title}</span>
                <span className="mt-1.5 block max-w-[52ch] text-[0.95rem] leading-7 text-ink-muted">{tool.body}</span>
              </span>
              <span className="inline-flex items-center gap-1.5 text-sm font-medium text-sky-700 transition-transform duration-200 group-hover:translate-x-0.5">
                {tool.action}
                <ArrowRight size={15} />
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Testimonials() {
  const [active, setActive] = useState(0);
  const current = testimonials[active];
  const [usersStat, winnersStat] = HOME_STATS;

  return (
    <section className="mt-24 overflow-hidden rounded-[2rem] bg-sky-50 px-5 py-14 sm:mt-32 sm:px-12 sm:py-20" aria-labelledby="testimonials">
      <h2 id="testimonials" className="sr-only">What students say</h2>
      <figure className="mx-auto max-w-3xl text-center">
        <blockquote className="font-display text-[1.6rem] font-medium leading-[1.35] tracking-[-0.02em] text-ink sm:text-[2.1rem]">
          {current.quote.replace(/^"|"$/g, '')}
        </blockquote>
        <figcaption className="mt-8 flex items-center justify-center gap-3">
          <img src={current.image} alt="" className="h-11 w-11 rounded-full object-cover" />
          <span className="text-left">
            <span className="block text-sm font-semibold text-ink">{current.name}</span>
            <span className="block text-sm text-ink-muted">{current.role}</span>
          </span>
        </figcaption>
      </figure>

      <div className="mt-8 flex justify-center gap-2" role="group" aria-label="Choose a testimonial">
        {testimonials.map((item, index) => (
          <button
            key={item.name}
            type="button"
            onClick={() => setActive(index)}
            aria-pressed={index === active}
            aria-label={`Show ${item.name}'s review`}
            className={`h-2 rounded-full transition-all duration-300 ${index === active ? 'w-8 bg-sky-500' : 'w-2 bg-sky-200 hover:bg-sky-300'}`}
          />
        ))}
      </div>

      <p className="mx-auto mt-12 max-w-2xl text-center text-sm leading-6 text-sky-900/80">
        {usersStat.value} {usersStat.label} ({usersStat.note.replace(/^Data received from /, '')}). Over half of users won the National English Competition ({winnersStat.note.replace(/^Data gathered from /, '')}).
      </p>
    </section>
  );
}

function Founder() {
  return (
    <section className="grid items-center gap-10 pt-24 sm:pt-32 md:grid-cols-[0.85fr_1.15fr] lg:gap-16" aria-labelledby="founder">
      <img
        src={FOUNDER_IMAGE}
        alt={`${SITE_OWNER_NAME}, founder of necs.`}
        loading="lazy"
        className="aspect-[4/5] w-full max-w-md rounded-panel object-cover object-[50%_30%]"
      />
      <div>
        <h2 id="founder" className="text-[2rem] font-semibold leading-[1.1] text-ink sm:text-[2.5rem]">
          Made by a former NEC competitor
        </h2>
        <p className="mt-5 max-w-[58ch] text-base leading-7 text-ink-muted">
          I&apos;m {SITE_OWNER_NAME}. I built necs. after competing in NEC and studying academic English at Le Quy Don High School for the Gifted, so students without a mentor beside them can still practise speaking seriously.
        </p>
        <dl className="mt-8 grid gap-x-8 gap-y-5 sm:grid-cols-2">
          {achievements.map((achievement) => (
            <div key={achievement.label}>
              <dt className="text-sm text-ink-subtle">{achievement.label}</dt>
              <dd className="mt-1 font-medium text-ink">{achievement.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

function FinalCall({ navTo }) {
  return (
    <section className="pt-24 text-center sm:pt-32" aria-labelledby="start">
      <h2 id="start" className="mx-auto max-w-2xl text-[2.2rem] font-semibold leading-[1.1] text-ink sm:text-[3rem]">
        Ready for your first practice?
      </h2>
      <p className="mx-auto mt-4 max-w-[48ch] text-base leading-7 text-ink-muted">
        It&apos;s free, and you can start as a guest. Scored 1.6 or above? Send your recording in and it could become a sample.
      </p>
      <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <button
          type="button"
          onClick={() => navTo('analyze')}
          className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-full bg-ink px-7 text-base font-medium text-white transition-colors duration-200 hover:bg-ink/85"
        >
          <Mic size={18} />
          Start practising
        </button>
        <a
          href="https://www.facebook.com/notmtri/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-[52px] items-center justify-center gap-1.5 rounded-full border border-line bg-surface-raised px-7 text-base font-medium text-ink transition-colors duration-200 hover:bg-overlay"
        >
          Message me on Facebook
          <ArrowUpRight size={16} />
        </a>
      </div>
      <p className="mt-5 text-sm text-ink-subtle">
        Or email{' '}
        <a href="mailto:nguyenhoangminhtri.forwork@gmail.com" className="font-medium text-sky-700 underline-offset-4 hover:underline">
          nguyenhoangminhtri.forwork@gmail.com
        </a>
      </p>
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
