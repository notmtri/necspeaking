import React, { memo, useMemo, useState } from 'react';
import { ArrowRight, CheckCircle, ChevronLeft, ChevronRight, HelpCircle, Image, LogIn, Sparkles, Star, Users } from 'lucide-react';
import { FEEDBACK_AVATAR, FOUNDER_IMAGE, HOME_BENEFITS, HOME_FAQ, HOME_FEATURES, HOME_FEEDBACK, HOME_HERO_IMAGE, HOME_STATS } from '../appShared';

const HomePage = memo(function HomePage({ navTo, openAuth, continueAsGuest, currentUser }) {
  const feedbacksPerPage = 3;
  const totalFeedbackPages = Math.ceil(HOME_FEEDBACK.length / feedbacksPerPage);
  const [feedbackPage, setFeedbackPage] = useState(0);
  const visibleFeedback = useMemo(() => {
    const start = feedbackPage * feedbacksPerPage;
    return HOME_FEEDBACK.slice(start, start + feedbacksPerPage);
  }, [feedbackPage]);

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-[36px] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.25),_transparent_30%),linear-gradient(135deg,_rgba(8,17,32,0.98),_rgba(5,10,18,0.95))] shadow-[0_24px_120px_rgba(2,6,23,0.45)]">
        <div className="grid gap-8 px-6 py-8 lg:grid-cols-[1.1fr_0.9fr] lg:px-10 lg:py-10">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-sky-400/30 bg-sky-400/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-sky-200">
              <Sparkles size={15} />
              BRAND NEW HOMEPAGE
            </div>
            <div className="space-y-4">
              <h1 className="text-5xl font-black tracking-tight text-white sm:text-6xl">
                Master NEC Speaking
              </h1>
              <p className="max-w-2xl text-base leading-8 text-slate-300">
                NECSpeaking (necs.) is an online learning platform that helps students to train English speaking ability, especially that of those aiming for the NEC. NECSpeaking offers a precise training experience, a simulation of the real test environment and an archive for creative, high-scoring sample speeches from ex-competitors.
              </p>
            </div>
            {currentUser ? (
              <div className="rounded-[28px] border border-emerald-400/25 bg-emerald-400/10 p-4 text-sm text-emerald-100">
                Logged in as <span className="font-semibold">{currentUser.username}</span>. Your profile and saved account details are ready.
              </div>
            ) : (
              <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-4 text-sm text-slate-300">
                Create an account to keep your profile consistent across sessions. Guest mode is still available.
              </div>
            )}
            <div className="flex flex-col gap-3 sm:flex-row">
              <button onClick={() => openAuth('login')} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-sky-500 px-8 py-3 font-semibold text-white transition hover:bg-sky-400">
                <LogIn size={17} />
                Log In
              </button>
              <button onClick={continueAsGuest} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.05] px-8 py-3 font-semibold text-slate-200 transition hover:bg-white/[0.1]">
                <ArrowRight size={17} />
                Continue as Guest
              </button>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {HOME_STATS.map((stat) => {
                const Icon = stat.icon;
                return (
                  <div key={stat.label} className="rounded-2xl border border-white/10 bg-slate-950/55 p-4">
                    <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-400/15 text-sky-300">
                      <Icon size={20} />
                    </div>
                    <div className="text-2xl font-black text-white">{stat.value}</div>
                    <div className="mt-1 text-sm font-semibold text-slate-200">{stat.label}</div>
                    <div className="mt-2 text-xs leading-6 text-slate-400">{stat.note}</div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid gap-4">
            <div className="overflow-hidden rounded-[32px] border border-white/10 bg-white/[0.04]">
              <img
                src={HOME_HERO_IMAGE}
                alt="Placeholder for home hero visual"
                loading="eager"
                className="h-full min-h-[280px] w-full object-cover"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-400/15 text-emerald-300">
                  <CheckCircle size={18} />
                </div>
                <div className="mt-4 text-lg font-bold text-white">Built for focused practice</div>
                <div className="mt-2 text-sm leading-7 text-slate-300">With no advertisement, a streamlined, direct workflow, and a clean user interface, concentration is easier than ever.</div>
              </div>
              <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-400/15 text-amber-300">
                  <Star size={18} />
                </div>
                <div className="mt-4 text-lg font-bold text-white">Easy to use</div>
                <div className="mt-2 text-sm leading-7 text-slate-300">The interface stays direct and predictable, so you can focus on speaking instead of setup.</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-[32px] border border-white/10 bg-slate-950/65 p-6 shadow-[0_20px_80px_rgba(2,6,23,0.4)] sm:p-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-slate-300">
            <Image size={14} />
            About the Founder & developer
          </div>
          <div className="mt-5">
            <h2 className="text-3xl font-black text-white">Nguyen Hoang Minh Tri</h2>
            <div className="mt-5 grid gap-5 md:grid-cols-[240px_1fr] md:items-start">
              <img
                src={FOUNDER_IMAGE}
                alt="Placeholder founder portrait"
                loading="lazy"
                className="h-70 w-full rounded-[28px] object-cover ring-1 ring-white/10"
              />
              <div>
                <p className="text-sm leading-7 text-slate-300">
                  I am a Grade 12 English-major student at Le Quy Don HSGS - Nam Nha Trang with national-level
                  achievements in academic English and debate, currently transitioning into computer
                  science and AI. I am deeply interested in integrating technology into education.
                </p>
              </div>
            </div>
            <div className="mt-5 rounded-[24px] border border-white/10 bg-white/[0.04] p-5">
              <p className="text-sm leading-7 text-slate-400">Things I'm so proud of in my high school years:</p>
              <p className="mt-3 text-sm leading-7 text-slate-400">- 8.5 IELTS (9.0R - 9.0L - 7.5W - 7.5S)</p>
              <p className="mt-3 text-sm leading-7 text-slate-400">- 1550 SAT (760 EBR&W - 790 MATH)</p>
              <p className="mt-3 text-sm leading-7 text-slate-400">- SILVER medal - Olympic 30/4 XXIX (24-25)</p>
              <p className="mt-3 text-sm leading-7 text-slate-400">- Proud member of Khanh Hoa NEC Team 24-25</p>
            </div>
          </div>
        </div>

        <div className="rounded-[32px] border border-white/10 bg-slate-950/65 p-6 shadow-[0_20px_80px_rgba(2,6,23,0.4)] sm:p-8">
          <div className="flex items-center justify-between gap-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-slate-300">
              <Users size={14} />
              User feedback
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setFeedbackPage((page) => Math.max(page - 1, 0))}
                disabled={feedbackPage === 0}
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-slate-200 transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Show previous feedbacks"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                type="button"
                onClick={() => setFeedbackPage((page) => Math.min(page + 1, totalFeedbackPages - 1))}
                disabled={feedbackPage >= totalFeedbackPages - 1}
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-slate-200 transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Show next feedbacks"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
          <div className="mt-5 space-y-4">
            {visibleFeedback.map((item) => (
              <div key={`${item.name}-${item.role}`} className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
                <div className="flex items-start gap-4">
                  <img
                    src={item.image || FEEDBACK_AVATAR}
                    alt={`Photo of ${item.name}`}
                    loading="lazy"
                    className="h-28 w-28 rounded-2xl object-cover ring-1 ring-white/10"
                  />
                  <div className="min-w-0 flex-1">
                    <div>
                      <div className="font-semibold text-white">{item.name}</div>
                      <div className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-500">{item.role}</div>
                    </div>
                    <p className="mt-3 text-sm leading-7 text-slate-300">{item.quote}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-[32px] border border-white/10 bg-slate-950/65 p-6 shadow-[0_20px_80px_rgba(2,6,23,0.4)] sm:p-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-slate-300">
              <Sparkles size={14} />
              Core features
            </div>
            <h2 className="mt-4 text-3xl font-black text-white">Three ways to practice with necs.</h2>
          </div>
        </div>
        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          {HOME_FEATURES.map((feature) => {
            const Icon = feature.icon;
            return (
              <div key={feature.title} className="rounded-[28px] border border-white/10 bg-white/[0.04] p-6">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-400/15 text-sky-300">
                  <Icon size={22} />
                </div>
                <h3 className="mt-5 text-xl font-bold text-white">{feature.title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-300">{feature.description}</p>
                <button onClick={() => navTo(feature.title.toLowerCase())} className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-sky-300 transition hover:text-sky-200">
                  Open {feature.title}
                  <ChevronRight size={16} />
                </button>
              </div>
            );
          })}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-[32px] border border-white/10 bg-slate-950/65 p-6 shadow-[0_20px_80px_rgba(2,6,23,0.4)] sm:p-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-slate-300">
            <CheckCircle size={14} />
            Benefits of using necs.
          </div>
          <div className="mt-5 space-y-4">
            {HOME_BENEFITS.map((benefit) => (
              <div key={benefit} className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <CheckCircle size={18} className="mt-0.5 shrink-0 text-emerald-300" />
                <p className="text-sm leading-7 text-slate-300">{benefit}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[32px] border border-white/10 bg-slate-950/65 p-6 shadow-[0_20px_80px_rgba(2,6,23,0.4)] sm:p-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-slate-300">
            <HelpCircle size={14} />
            FAQ
          </div>
          <div className="mt-5 space-y-4">
            {HOME_FAQ.map((item) => (
              <div key={item.question} className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5">
                <div className="text-base font-semibold text-white">{item.question}</div>
                <p className="mt-2 text-sm leading-7 text-slate-300">{item.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
});

export default HomePage;
