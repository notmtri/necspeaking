import React, { memo } from 'react';
import { Award, BookOpen, CheckCircle, Mail, MessageSquare, Mic, Trophy, Users } from 'lucide-react';
import { FOUNDER_IMAGE, HOME_BENEFITS, HOME_FEEDBACK, HOME_STATS, SITE_OWNER_NAME } from '../appShared';

const achievements = [
  { label: 'IELTS', value: '8.5 overall, with 9.0 Reading and 9.0 Listening.' },
  { label: 'SAT', value: '1550 total: 760 EBRW and 790 Math.' },
  { label: 'Olympic 30/4 XXIX', value: 'Silver medal.' },
  { label: 'NEC', value: 'Member of Khanh Hoa NEC Team 24-25.' },
];

const founderNotes = [
  'Competed in NEC and studied academic English from the same student position this app serves.',
  'Built necs. to turn self-study into a repeatable process students can run without relying on a mentor.',
  'Keeps the tool narrow: speaking analysis, high-scoring samples, mock simulation, and community context.',
];

const HomePage = memo(function HomePage({ navTo }) {
  const featuredFeedback = HOME_FEEDBACK.slice(0, 3);

  return (
    <div className="min-w-0 space-y-5 sm:space-y-6">
      <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#091421]">
        <div className="px-5 py-6 sm:px-7 sm:py-8 lg:px-8">
          <div className="min-w-0">
            <h1 className="max-w-3xl text-balance text-3xl font-black leading-tight text-white sm:text-4xl lg:text-5xl">
              Your free NEC speaking practice assistant, made with love. 
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300 sm:text-base">
              necs. combines speech analysis, sample responses, mock simulations, profiles, and community context in one minimal study workspace for NEC candidates and candidates-wanna-be's.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <button
                type="button"
                onClick={() => navTo('analyze')}
                className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-sky-500 px-5 py-3 font-semibold text-white transition hover:bg-sky-400 active:translate-y-px sm:w-auto"
              >
                <Mic size={18} />
                Start practice
              </button>
              <button
                type="button"
                onClick={() => navTo('samples')}
                className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-5 py-3 font-semibold text-slate-100 transition hover:bg-white/[0.08] active:translate-y-px sm:w-auto"
              >
                <BookOpen size={18} />
                View samples
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-slate-950/45 p-5 sm:p-6">
        <div className="grid gap-5 lg:grid-cols-[0.72fr_1.28fr] lg:items-start">
          <div>
            <div className="flex min-w-0 items-center gap-3">
              <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-400/12 text-emerald-200">
                <CheckCircle size={20} />
              </div>
              <h2 className="min-w-0 text-xl font-black text-white sm:text-2xl">What students get</h2>
            </div>
          </div>
          <div className="grid gap-x-5 gap-y-3 md:grid-cols-2">
            {HOME_BENEFITS.map((benefit, index) => (
              <div
                key={benefit}
                className={`flex min-w-0 items-start gap-3 border-t border-white/10 pt-3 ${
                  index === 0 ? 'border-t-0 pt-0' : ''
                } ${index === 1 ? 'md:border-t-0 md:pt-0' : ''}`}
              >
                <CheckCircle size={17} className="mt-0.5 shrink-0 text-emerald-300" />
                <p className="text-sm leading-6 text-slate-300">{benefit}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]" aria-label="Proof and feedback">
        <article className="rounded-2xl border border-white/10 bg-slate-950/45 p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-400/12 text-sky-200">
              <Users size={20} />
            </div>
            <div className="min-w-0">
              <h2 className="text-xl font-black text-white sm:text-2xl">Current signal</h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-slate-400">
                Statistics and outcomes that necs. is so proud of.
              </p>
            </div>
          </div>
          <dl className="mt-5 divide-y divide-white/10">
            {HOME_STATS.map((stat) => {
              const Icon = stat.icon;
              return (
                <div key={stat.label} className="grid gap-3 py-4 first:pt-0 last:pb-0 sm:grid-cols-[44px_112px_1fr] sm:items-start">
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.06] text-slate-200">
                    <Icon size={20} />
                  </div>
                  <dt className="text-2xl font-black leading-tight text-white">{stat.value}</dt>
                  <dd>
                    <div className="text-sm font-semibold text-slate-100">{stat.label}</div>
                    <p className="mt-1 text-sm leading-6 text-slate-400">{stat.note}</p>
                  </dd>
                </div>
              );
            })}
          </dl>
        </article>

        <article className="rounded-2xl border border-white/10 bg-slate-950/45 p-5 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex min-w-0 items-center gap-3">
                <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-400/12 text-sky-200">
                  <MessageSquare size={20} />
                </div>
                <h2 className="min-w-0 text-xl font-black text-white sm:text-2xl">Student feedback</h2>
              </div>
            </div>
            <button
              type="button"
              onClick={() => navTo('community')}
              className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-slate-100 transition hover:bg-white/[0.08]"
            >
              <Users size={16} />
              Browse community
            </button>
          </div>

          <div className="mt-5 divide-y divide-white/10">
            {featuredFeedback.map((item) => (
              <article key={`${item.name}-${item.role}`} className="py-4 first:pt-0 last:pb-0">
                <div className="flex items-center gap-3">
                  <img
                    src={item.image || '/logo.png'}
                    alt={`${item.name}`}
                    loading="lazy"
                    className="h-12 w-12 shrink-0 rounded-xl object-cover ring-1 ring-white/10"
                  />
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-bold text-white">{item.name}</h3>
                    <p className="mt-1 text-xs leading-5 text-slate-400">{item.role}</p>
                  </div>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-300">{item.quote}</p>
              </article>
            ))}
          </div>
        </article>
      </section>

      <section className="overflow-hidden rounded-2xl border border-white/10 bg-slate-950/45">
        <div className="grid gap-0 lg:grid-cols-[390px_1fr]">
          <div className="min-h-[360px] bg-[#081120]">
            <img
              src={FOUNDER_IMAGE}
              alt={SITE_OWNER_NAME}
              loading="lazy"
              className="h-full min-h-[360px] w-full object-cover object-[50%_34%]"
            />
          </div>

          <article className="p-5 sm:p-6 lg:p-7">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex min-w-0 items-center gap-3">
                  <div className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-300/12 text-amber-100">
                    <Award size={21} />
                  </div>
                  <h2 className="min-w-0 text-2xl font-black text-white sm:text-3xl">{SITE_OWNER_NAME}</h2>
                </div>
                <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-300 sm:text-base">
                  I built necs. after competing in NEC and studying academic English at Le Quy Don High School for the Gifted. The project uses software and AI to make specialized speaking self-study easier for students who do not always have a mentor beside them.
                </p>
              </div>
              <div className="shrink-0 rounded-full border border-amber-300/25 bg-amber-300/10 px-3 py-1 text-sm font-semibold text-amber-100">
                About the founder
              </div>
            </div>

            <div className="mt-6 grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
              <div>
                <h3 className="text-sm font-bold text-white">Notes</h3>
                <ul className="mt-3 space-y-3">
                  {founderNotes.map((note) => (
                    <li key={note} className="flex min-w-0 items-start gap-3 text-sm leading-6 text-slate-300">
                      <CheckCircle size={17} className="mt-0.5 shrink-0 text-emerald-300" />
                      <span>{note}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="text-sm font-bold text-white">Record</h3>
                <dl className="mt-3 divide-y divide-white/10">
                  {achievements.map((achievement) => (
                    <div key={achievement.label} className="grid gap-1 py-3 first:pt-0 last:pb-0 sm:grid-cols-[132px_1fr] sm:gap-4">
                      <dt className="inline-flex items-center gap-2 text-sm font-semibold text-amber-100">
                        <Trophy size={15} />
                        {achievement.label}
                      </dt>
                      <dd className="text-sm leading-6 text-slate-300">{achievement.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>
          </article>
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-[#091421] p-5 sm:p-6">
        <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <h2 className="text-xl font-black text-white sm:text-2xl">Contribute or contact</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
              Students and teachers can send feedback, contribute sample speeches, or contact the founder directly.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <a
              href="https://www.facebook.com/notmtri/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-slate-100 transition hover:bg-white/[0.08]"
            >
              <MessageSquare size={16} />
              Chat with me!
            </a>
            <a
              href="mailto:nguyenhoangminhtri.forwork@gmail.com"
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-400"
            >
              <Mail size={16} />
              Email me!
            </a>
          </div>
        </div>
      </section>
    </div>
  );
});

export default HomePage;
