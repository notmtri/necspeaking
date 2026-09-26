import React, { useEffect, useMemo, useState } from 'react';
import { Loader, Search } from 'lucide-react';
import { apiFetch } from '../apiClient';

const NUMBERING = /^\s*(?:question\s*)?(\d{1,3})\s*[.:)\-]\s*/i;
const BOILERPLATE = /you have (?:\d+|one|two|three|four|five) minutes? to prepare(?: for your (?:talk|speech|presentation))?\.?|good luck!?/gi;

/** A bank question as the picker shows it: year, number and the bare text. */
export function describeQuestion(question) {
  const raw = String(question?.question || '');
  const match = raw.match(NUMBERING);
  const text = raw.replace(NUMBERING, '').replace(BOILERPLATE, ' ').replace(/\s+/g, ' ').trim();
  const number = match ? Number(match[1]) : null;
  const paper = String(question?.topic || '').trim();
  return {
    id: question?.id,
    paper,
    number,
    text,
    // What goes into the prompt box: the paper's own numbering, which the
    // grader uses for its "My question is..." opening, without the boilerplate.
    promptText: number ? `Question ${number}. ${text}` : text,
    label: [paper, number ? `Question ${number}` : ''].filter(Boolean).join(' · '),
  };
}

function paperYear(paper) {
  const match = String(paper).match(/(\d{2})\s*-\s*\d{2}/);
  return match ? Number(match[1]) : -1;
}

let bankRequest = null;
function loadBank() {
  // The bank rarely changes; one request per page load is plenty. It is
  // shared, so it takes no abort signal: tying it to the first picker's
  // lifetime meant a quick unmount/remount (React's dev double-mount, or
  // closing and reopening the picker) aborted the one request every later
  // picker was waiting on, leaving it on "Loading" forever.
  if (!bankRequest) {
    bankRequest = apiFetch('/api/questions').then(
      (data) => (data.questions || []).map(describeQuestion),
      (error) => {
        bankRequest = null;
        throw error;
      },
    );
  }
  return bankRequest;
}

export function resetQuestionBankCache() {
  bankRequest = null;
}

/**
 * Searchable list of past official NEC questions, newest paper first.
 *
 * 44% of production attempts were on bank questions that students had found
 * elsewhere and pasted in by hand; this makes them one tap away. Typing a
 * question stays first-class: the other 56% are prompts from teachers and
 * other contests.
 */
export default function QuestionPicker({ onSelect, selectedId = null }) {
  const [questions, setQuestions] = useState([]);
  const [status, setStatus] = useState('loading');
  const [query, setQuery] = useState('');

  useEffect(() => {
    let active = true;
    loadBank()
      .then((bank) => {
        if (!active) return;
        setQuestions(bank);
        setStatus('ready');
      })
      .catch(() => {
        if (active) setStatus('error');
      });
    return () => { active = false; };
  }, []);

  const groups = useMemo(() => {
    const words = query.toLowerCase().split(/\s+/).filter(Boolean);
    const matches = questions.filter((question) => {
      const haystack = `${question.label} ${question.text}`.toLowerCase();
      return words.every((word) => haystack.includes(word));
    });
    const byPaper = new Map();
    [...matches]
      .sort((a, b) => paperYear(b.paper) - paperYear(a.paper) || (a.number ?? 99) - (b.number ?? 99))
      .forEach((question) => {
        if (!byPaper.has(question.paper)) byPaper.set(question.paper, []);
        byPaper.get(question.paper).push(question);
      });
    return [...byPaper.entries()];
  }, [query, questions]);

  if (status === 'loading') {
    return (
      <div className="flex items-center gap-2 rounded-control border border-line bg-surface-sunken p-4 text-sm text-ink-muted" role="status">
        <Loader size={16} className="animate-spin" /> Loading past NEC questions...
      </div>
    );
  }
  if (status === 'error') {
    return (
      <p className="rounded-control border border-line bg-surface-sunken p-4 text-sm text-ink-muted" role="alert">
        Couldn&apos;t load the question bank. You can still type your question below.
      </p>
    );
  }

  return (
    <div className="rounded-control border border-line bg-surface-sunken">
      <label className="flex items-center gap-2 border-b border-line px-3 py-2">
        <Search size={16} className="shrink-0 text-ink-subtle" aria-hidden="true" />
        <span className="sr-only">Search past NEC questions</span>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by topic or year, e.g. tourism or 24-25"
          className="min-w-0 flex-1 bg-transparent py-1.5 text-sm text-white outline-none placeholder:text-ink-subtle"
        />
      </label>
      <div className="max-h-80 overflow-y-auto p-2">
        {questions.length === 0 ? (
          <p className="px-2 py-4 text-sm text-ink-muted">No past questions have been added yet. Type your question below.</p>
        ) : groups.length === 0 ? (
          <p className="px-2 py-4 text-sm text-ink-muted">No past question matches &quot;{query}&quot;.</p>
        ) : groups.map(([paper, items]) => (
          <div key={paper || 'other'} className="mb-2">
            <div className="px-2 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-sky-200">{paper || 'Other'}</div>
            <ul className="space-y-1">
              {items.map((question) => (
                <li key={question.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(question)}
                    aria-pressed={selectedId === question.id}
                    className={`flex w-full min-w-0 items-start gap-3 rounded-control px-2 py-2 text-left transition ${
                      selectedId === question.id ? 'bg-sky-400/15' : 'hover:bg-overlay-hover'
                    }`}
                  >
                    <span className="mt-0.5 shrink-0 rounded-full border border-line px-2 py-0.5 text-xs font-semibold text-ink-muted">
                      {question.number ? `Q${question.number}` : '-'}
                    </span>
                    <span className="min-w-0 text-sm leading-6 text-slate-200">{question.text}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
